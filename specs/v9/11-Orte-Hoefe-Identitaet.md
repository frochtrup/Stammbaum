# 11 — Orte, Höfe & Identitätsauflösung

> Schicht: Kern · Abhängig von: [10 Domänenmodell](10-Domaenenmodell.md) · Wird gelesen von: [20 Funktionen](20-Funktionen.md), [30 Persistenz](30-NFR-und-Persistenz.md)

Das differenzierendste und anspruchsvollste Subsystem (v8-ADR-024, konsolidiert aus vier ADRs). Muss präzise nachgebaut werden. Der gesamte Inhalt ist DOM-frei und headless testbar.

---

## 1. Zwei orthogonale Entitäten

**PlaceObject — Verwaltungseinheit:**
```
PlaceObject {
  id: PlaceId
  title: string                    // aktuelle Bezeichnung
  type: string                     // Country/State/County/Town/Parish/Church/Cemetery …
                                   //   NIE Farm/Building — Höfe sind separate Entität
  pnames: DatedName[]              // datierte Namensvarianten (sprachlich/orthographisch/historisch)
  enclosedBy: DatedRef[]           // datierte Hierarchie (Zeitachse der Verwaltungszugehörigkeit)
  lat, long: number
  note: string
  existsFrom, existsTo: year
  govId: string                    // GOV-Referenz
  govTypes: […]
}
```

**HofObject — Hof als eigenständige Entität:**
```
HofObject {
  id: HofId                        // deterministisch: _hof_<addr>_<village>
  villageId: PlaceId               // FK auf Dorf-PlaceObject (Pflicht)
  addrs: DatedAddress[]            // datierte Adress-Bezeichnungen (Umbenennung, Hausnr.-Reform)
  lat, long: number                // eigene Geodaten → Binnenmigration im Dorf sichtbar
  note: string
  existsFrom, existsTo: year
  predecessor, successor: HofId    // Lebenszyklus
  govId, govTypes
  schemaVersion: int
}
```

`DatedName`/`DatedRef`/`DatedAddress` = `{ value, from, to }` (Wert mit optionalem Gültigkeitszeitraum).

**Warum getrennt (dauerhafte Entscheidung):** Ein Hof ist keine Verwaltungseinheit. Die frühere v8-Modellierung als `placeObject type='Farm'` scheiterte an vier Punkten: Adress-Doppelung, semantische Vermischung Geografie/Adresse, `pnames` mit Adress-Historie überladen, Hof-Lebenszyklus nicht erstklassig. v9 startet direkt mit der getrennten Entität.

---

## 2. Persistenzschichten

| Daten | Speicher | Geltungsbereich | Konflikt |
|---|---|---|---|
| `placeObjects` + `hofObjects` | `orte.json` (Wrapper `_rev`/`_device`/`_ts`/`_schemaVersion`); Browser-Spiegel | **Cross-Stammbaum** (jede Datei mit diesen Orten) | Revision+Device, Union-Merge (LP-9) |
| Event-Inhalte (`PLAC`, `ADDR`, `DATE`, …) | GED-/GRAMPS-Datei | **stammbaum-spezifisch** | Datei-Versionierung beim Nutzer |
| `event.placeId` / `event.hofId` | **runtime-only** | — | deterministische Re-Derivation (§3) |
| bekannte Schema-Version | Konstante im Code | — | höhere Version in `orte.json` → Read-Only-Schreibstopp |

**Herkunft der `placeObjects` (ADR-v9-28, ersetzt ADR-v9-27):** Beim Import werden Village-PlaceObjects **automatisch** aus den distinkten PLAC-Hierarchien der geladenen Ereignisse erzeugt (Seed-Vorpass, §4.2 Schritt 0) — Orte sind genealogische Standardinformation und nach *jedem* Import sofort sichtbar, ohne Nutzeraktion. Die Schicht ist damit **auto-seeded *und* kuratiert**: anfängliche PLAC-Inkonsistenz (Schreibvarianten desselben Orts über mehrere Zweige) ist bewusst akzeptiert und wird *nachgelagert* über die Kurationswerkzeuge bereinigt (Dubletten-Merge, String→PlaceObject-Verknüpfung, [20 §1.7](20-Funktionen.md)). Der frühere Opt-in-Vorschlag (ADR-v9-27) ist ersetzt (♻️). **Höfe bleiben unberührt** — sie entstehen ausschließlich über die Hof-Bootstrap-Pfade (§4.2/§4.3), nie über den Seed.

Details `orte.json`-Format + Sync: [30 §3/§4](30-NFR-und-Persistenz.md).

---

## 3. Projektions-Invariante (zentral)

> **INV-PLACE (Reprojektions-Invariante):** Wenn `event.placeId` oder `event.hofId` gesetzt ist, ist `event.place` **ausschließlich** die zwischengespeicherte periodengerechte Projektion `buildPlacForGedcom(event, year)`. `event.place`/`event.addr` sind **Projektions-Cache, keine eigene Wahrheit**. Anzeige *und* Writer leiten beide LIVE aus dem Modell ab. Modelländerungen wirken sofort in Anzeige und Export. Stale-Cache ist strukturell ausgeschlossen, weil die Reprojektion am Ende **jedes** Auflösungspfads läuft.

Analog: `event.lati/long` sind nur Render-Fallback; Wahrheit sind die Koordinaten am PlaceObject/HofObject.

**Zeitpunkt der Reprojektion (ADR-v9-19, ✅ entschieden):** Die Reprojektion läuft an **zwei** Stellen, die INV-PLACE gemeinsam lückenlos garantieren: (a) beim **Laden** (voller Auflösungs-Pass, §4) und (b) in **jedem Modell-Mutations-Kommando**, das `placeId`/`hofId` setzt (z. B. `linkEventToPlace`, [20 §1.7](20-Funktionen.md)) — das Kommando reprojiziert `event.place` unmittelbar selbst per `buildPlacForGedcom` (reine Kern-Funktion, INV-ARCH-1-konform). Es gibt **keinen** Zwischenzustand, in dem `placeId` gesetzt, `event.place` aber veraltet ist. Persistiert wird weiterhin nur `placeId`/`hofId` (§2), nie `event.place` selbst.

---

## 4. Identitätsauflösung: Events → Orte/Höfe (Kern-Algorithmus)

### 4.1 Charakter der Funktion

`(event.placeId, event.hofId, event.place', event.addr')` ist eine **reine, totale, deterministische Funktion** über:
- Eingabe: `(event.type, event.place, event.addr, event.date)`
- Kontext: `(placeObjects, hofObjects)`

Der volle Auflösungs-Pass wird bei **jedem Laden** ausgeführt; die Reprojektion (§3) läuft zusätzlich in **jedem `placeId`/`hofId`-setzenden Modell-Kommando** (ADR-v9-19). Re-Derivation *ist* die Persistenz (LP-5): persistiert werden nur `placeId`/`hofId`, keine Sidecar-Datei, keine Custom-Tags, nie `event.place` selbst.

### 4.2 Auflösungsreihenfolge (pro Event)

```
0. SEED-VORPASS (einmal je Import, VOR der Auflösung — ADR-v9-28):
   distinkte PLAC-Hierarchien → fehlende Village-PlaceObjects (+ enclosedBy-Kette).
   Village-Segment-Wahl mit dem Konventions-Signal (§4.3): Konvention-1-Hof-Fall
   (Hof-Typ + ADDR-Extract trifft Leitsegment) → Village = segs[1..];
   sonst → Leitsegment. Erzeugt NIE einen Hof.
1. Durchreich-REPROJECT — bereits gelinkt (aus GRAMPS-Parser oder vorigem Load)
                          → event.place auf periodengerechte Projektion aktualisieren
2. Pfad A   — PLAC-Leitsegment matcht hof.addrs[] im Dorf-Anker (existierender Hof)
3. Verwaltungs-Match:
   3a. atomare PLAC matcht placeObject per Identität
   3b. Hierarchie-PLAC matcht voll-projektions-exakt
   3c. Hierarchie-PLAC: Leitname eindeutig UND Elternkette verträglich (Konsistenz-Guard)
   3c′. Leitname mehrdeutig → Eltern-Disambiguierung (enclosureChainAsOf): genau EIN
        verträglicher Kandidat gewinnt, sonst → Review-Klasse P
4. Pfad A'  — atomare PLAC ohne PO-Match → globaler hofObject-Lookup
5. Pfad C   — rich-PLAC ohne Hof → Bootstrap eines Hofs aus Komma-Hierarchie
6. Pfad B   — event.addr matcht hof.addrs[] im Dorf-Scope (existierender Hof)
7. Pfad B'  — event.addr ohne Hof + type ∈ {RESI, PROP, CENS, OCCU}
              → Bootstrap eines Hofs aus Event-Typ-Semantik

REPROJECT am Pfad-Ende:
   event.place ← buildPlacForGedcom(event, year)
   event.addr  ← resolveAddrAsOf(hofId, year)   (nur wenn leer)
```

**Schritt 0 — Village-Seed-Vorpass (ADR-v9-28, rein & deterministisch).** Vor der eigentlichen Auflösung erzeugt ein Vorpass (`seedPlacesFromEvents`) aus den distinkten PLAC-Hierarchien der Ereignisse die fehlenden **Village-PlaceObjects** (plus datierte `enclosedBy`-Kette aus den Folgesegmenten). Dadurch finden die Verwaltungs-Match-Pfade 3a/3b/3c anschließend ein existierendes PlaceObject vor — der frühere „leeres Orte-Tab bei reinem GEDCOM-Import" entfällt, **ohne** dass der Match-Algorithmus selbst geändert wird. **Kein Hof entsteht im Seed:** welches Segment das Village ist, entscheidet der Vorpass mit exakt dem Signal, das §4.3 ohnehin für Konvention 1 vs. 2 nutzt — liegt ein hof-relevanter Event-Typ **mit** `event.addr` vor, dessen Extract (Konvention α, §4.4) das PLAC-Leitsegment trifft (Konvention 1, „Hof, Dorf, …"), ist das Village `segs[1..]` (das Leitsegment bleibt dem Hof-Bootstrap überlassen); sonst ist das Leitsegment selbst das Village (Konvention 2 / einfache Orte). Der Seed läuft ausschließlich auf der Verwaltungs-Achse und weicht die Hof-Erkennung nicht auf. Anfängliche Schreibvarianten desselben Orts erzeugen zunächst getrennte PlaceObjects (akzeptiert) und werden über den **Dubletten-Merge** ([20 §1.7](20-Funktionen.md)) zusammengeführt.

**Einschränkung:** Hof-Bootstrap-Pfade (A/A'/C) feuern nur für hof-relevante Event-Typen `{RESI, PROP, CENS, OCCU}`. BIRT/DEAT/MARR/BURI/EDUC/GRAD/EVEN mit reichem PLAC (z. B. „Krankenhaus St. Joseph, Münster") werden NIE als Hof interpretiert. Pfad B (explizite `event.addr`) bleibt für alle Typen offen — explizite Adresseingabe ist Nutzer-Intent.

**Konsistenz-Guard & Orts-Disambiguierung (3c/3c′, ADR-v9-29).** Ein eindeutiger Leitname genügt für 3c **nicht** — die Folgesegmente des PLAC müssen mit der `enclosureChainAsOf` des Kandidaten **verträglich** sein (Kette stimmt überein *oder* PLAC nennt keine Eltern). Ein widersprechender Elter ist ein **Veto**, kein Match (z. B. `Oldenburg, USA` bindet NICHT an ein PO „Oldenburg" mit Kette Niedersachsen/Deutschland — sonst stille Falschattribution). Trifft ein Leitname **mehrere** gleichnamige POs, disambiguiert **3c′** über die Elternkette; genau ein verträglicher Kandidat gewinnt. Bleibt es mehrdeutig (atomarer PLAC ohne Elter, oder kein/mehrere passende Kandidaten) → **Review-Klasse P** (§6), kein stilles Raten. **Dieselbe Verträglichkeits-Regel steuert den Seed-Dedup** (Schritt 0): gleicher Leitname + verträgliche Eltern → **ein** PO (hunderte `Ochtrup`, auch atomar+reich gemischt, bleiben ein Ort), widersprüchliche Eltern → **distinkte** POs (Oldenburg/Niedersachsen ≠ Oldenburg/USA). Der Dedup-Schlüssel ist damit **weder** name-only (verschmölze die Oldenburgs) **noch** Voll-Hierarchie-String (spaltete Ochtrup nach Schreibtiefe).

### 4.3 Wire-Konventions-Matrix

Deterministische Auflösung verschiedener Quell-Konventionen (Ancestris, MyHeritage, GRAMPS, alte Quellen):

| Konvention | Eingabe | Hof existiert | Hof existiert nicht |
|---|---|---|---|
| **1** Ancestris | `PLAC Hof, Dorf, … + ADDR Hof` | Pfad A | Pfad C (Bootstrap) |
| **2** MyHeritage/GRAMPS, Hof-Typ | `PLAC Dorf, … + ADDR Hof`, type ∈ {RESI,PROP,CENS,OCCU} | Pfad B | Pfad B' (Bootstrap) |
| **2** dito, Non-Hof-Typ | `PLAC Dorf, … + ADDR …`, type ∈ {BIRT,DEAT,…} | Pfad B | **Review** (Klasse A) |
| **3a** atomar, global eindeutig | `PLAC Wall 33` (kein ADDR) | Pfad A' | — |
| **3b** atomar, ohne Match | `PLAC Wall 33` | — | **Review** / Quelle schärfen |

**Wire-Treue-Anforderung:**
- Konvention 1: bit-identisch (`net_delta=0`, `out1===out2`).
- Konvention 2: sichtbarer, ehrlicher Übergang beim ersten Speichern (Hof-Präfix wird in PLAC ergänzt → Toast + „geändert"), danach idempotent.
- Konvention 3a: bit-identisch bei eindeutigem Match.

### 4.4 Hof-Identitäts-Konvention α

Die Hof-Identität (`hof.addrs[].value`) endet beim **ersten Komma ODER Zeilenumbruch** der eingehenden Adresse. `event.addr` bleibt unangetastet (ADDR-Roundtrip).

| `event.addr` (eingehend) | extrahierte Hof-Identität |
|---|---|
| `Wall 33` | `Wall 33` |
| `Wall 33, 48607 Ochtrup, Deutschland` | `Wall 33` |
| `Wall 33\n48607 Ochtrup` | `Wall 33` |
| `Schulze-Hof` | `Schulze-Hof` |

- **Read-Tolerance:** beim Lesen zuerst Voll-Normalisierung, dann Extract-Fallback (Robustness Principle — „schreibe streng, lies tolerant", LP-6). Historische Komma-Höfe (vor Konvention α) bleiben über Voll-Norm auffindbar.
- Explizite UI-Varianten-Anlage durchläuft den Extract **nicht** (Nutzer-Intent „diese Schreibweise speichern" bleibt erhalten).
- **ADDR=Village-Redundanz:** manche Programme schreiben bei RESI den Ortsnamen selbst in `ADDR`; konservativ erkannt (Match gegen Village-Titel + `pnames`) → kein Pseudo-Hof.

---

## 5. Lese-Seite: die einzigen erlaubten Reads (Chokepoints)

Vier zentrale Helfer — die **einzigen** korrekten Orts-/Hof-Reads außerhalb des Auflösungs-Codes. Sie sind zugleich die Naht zur UI-Schale ([02 §3.1](02-Zielarchitektur-v9.md)):

| Helfer | Frage | Auflösung |
|---|---|---|
| `eventPlaceId(ev)` | Welches Dorf? | A: `ev.placeId` (Wahrheit) · B: `findByName(ev.place)` (Projektion) |
| `eventHofId(ev)` | Welcher Hof? | A: `ev.hofId` · B: `findByAddr(ev.addr, year)` im Dorf-Scope |
| `eventCoords(ev)` | Welche Koordinaten? | placeObject/hofObject primär, `ev.lati/long` Fallback |
| `buildPlacForGedcom(ev, year)` | Welcher PLAC-String würde geschrieben? | Hof + Dorf-Hierarchie, periodengerecht |

**Aggregatoren** (`collectPlaces`, `buildHofIndex`) sind **id-basiert** (nicht string-basiert): zwei gleichnamige Orte bleiben distinkt, mehrere Cache-Varianten desselben Orts kollabieren auf einen Eintrag.

---

## 6. Daten-Lücken-UI (Review-Workflow)

Ungewissheit wird sichtbar gemacht (LP-6). Ein „Zuordnungen prüfen"-Modal zeigt Events mit ungewisser Hof- **oder Orts**-Zuordnung, klassifiziert:

| Klasse | Beschreibung | Aktionen |
|---|---|---|
| **A** | Non-Hof-Event-Typ mit ADDR ohne Hof-Match | „+ Hof anlegen" \| „Quelle schärfen" |
| **C** | ≥2 Höfe gleicher Adresse im Dorf (mehrdeutig) | „Hof wählen" \| „Quelle schärfen" |
| **D** | Norm-Drift: Adresse matcht keinen Hof, aber Höfe existieren im Dorf | „Variante zum Hof" \| „Hof wählen" \| „+ Hof anlegen" \| „Quelle schärfen" |
| **P** | Verwaltungs-Ort mehrdeutig: atomarer PLAC oder rich-PLAC ohne disambiguierenden Elter trifft ≥2 gleichnamige PlaceObjects (oder einziger Kandidat per Konsistenz-Guard verworfen, §4.2) | „Ort wählen" \| „+ Ort anlegen" \| „Quelle schärfen" |

Aktionstypen, jeweils am *korrekten* Ort persistent:
- **Quelle schärfen** → Event-Edit (Nutzer passt PLAC/ADDR an) → Anreicherung wandert in GED/GRAMPS (stammbaum-spezifisch). Für Klasse P der **deterministische** Weg: disambiguierenden Elter in den PLAC schreiben (`Oldenburg` → `Oldenburg, USA`) → Re-Derivation greift beim nächsten Load.
- **Hof anlegen** → `findOrCreateHof(addr, placeId)` → Anreicherung wandert in `orte.json` (cross-stammbaum).
- **Variante zum Hof** → hängt `addr` als neue `addrs[]`-Bezeichnung an → künftige Events greifen deterministisch via Pfad B.
- **Ort anlegen / Ort wählen** (Klasse P) → upsert bzw. Auswahl eines PlaceObject → Anreicherung wandert in `orte.json` (cross-stammbaum).

**Kein per-Event-Override.** Keine event-lokale Annotation, die dem Determinismus widerspräche. Genealogische Ungewissheit (der Forscher selbst weiß es nicht) bleibt dauerhaft im Review sichtbar — die korrekte Systemantwort auf Quell-Ungewissheit.

---

## 7. Wire-Mapping (Kurzfassung)

- **GEDCOM:** `PLAC` aus `buildPlacForGedcom`; `MAP/LATI/LONG` aus `eventCoords`; `ADDR` = `event.addr` (byte-identisch); Hof-Notiz als `NOTE @N_HOF@` mit Präfix `[Hof] `. Historische Zeitachse (pnames, enclosedBy, addrs) wird beim GEDCOM-Export **kollabiert** (by design — GEDCOM kann sie nicht abbilden).
- **GRAMPS:** vollständig. `placeObjects` ↔ `<placeobj>`, `hofObjects` ↔ `<placeobj type="Building">` mit `<placeref>` aufs Dorf. Parser teilt deterministisch (Type `Building` → `hofObjects`).

Vollständiges Format-Mapping: [13](13-Interop-Roundtrip.md).

---

## 8. Restklassen & offene Spezifikationsfragen (ehrlich offen)

Zwei Klassen, die durch keine Algorithmus-/UI-Aktion eindeutig werden:
1. **Genealogische Ungewissheit** — der Forschende weiß es selbst nicht. Bleibt dauerhaft im Review (korrekt).
2. **PLAC-Lücken außerhalb Hof-Kontext** — EDUC/GRAD/EVEN mit fremden Verwaltungs-Hierarchien ohne PO. Keine Hof-Themen; inzwischen weitgehend durch Auto-Seed (ADR-v9-28) + Review-Klasse P (ADR-v9-29) adressiert; dauerhaft offen bleibt nur echte Quell-Ungewissheit (→ Klasse 1).

Zwei zuvor offene Spezifikationsfragen sind inzwischen **entschieden** (hier nur noch als Verweis dokumentiert, kein offener Auftrag mehr — die Umsetzung folgt phasenweise im Code):

3. **Orte-Bootstrap: automatisch statt nur Opt-in — ENTSCHIEDEN (ADR-v9-28, ersetzt ADR-v9-27 ♻️).** PlaceObjects werden beim Import **automatisch** aus PLAC geseedet (§2 „Herkunft der `placeObjects`", §4.2 Schritt 0), Kuration erfolgt nachgelagert (Dubletten-Merge, String→PlaceObject-Verknüpfung). Die Verwaltungs-Match-Pfade 3a/3b/3c bleiben unverändert — sie finden die geseedeten POs vor. Hof-Erkennung (Konvention 1/2, §4.3) bleibt unangetastet. *Umsetzung:* Kern `seedPlacesFromEvents` (Phase 1) + Lade-Pipeline/UI (Phase 2).
4. **Reprojektion bei UI-Verknüpfung — ENTSCHIEDEN: sofort im Kommando (ADR-v9-19 ✅).** Jeder `placeId`/`hofId`-setzende Mutationspfad (`linkEventToPlace` u. a.) reprojiziert `event.place` unmittelbar selbst (§3 „Zeitpunkt der Reprojektion", §4.1). Die frühere Lesart (b) des Code-Kommentars (nur Load-Pfad) ist damit verworfen. *Umsetzung + Regressionstest:* Phase 1.2.
5. **Gleichnamige Orts-Disambiguierung — ENTSCHIEDEN (ADR-v9-29 ✅).** Seed-Dedup nach Name+Hierarchie-Verträglichkeit, Resolver-Konsistenz-Guard (3c) + Eltern-Disambiguierung (3c′) und **Review-Klasse P** (§4.2/§6) — löst die stille Falschverknüpfung `Oldenburg, USA` → deutscher Oldenburg, das Kollabieren von Oldenburg/NS + Oldenburg/USA und die verdeckte atomare Mehrdeutigkeit; hunderte `Ochtrup` bleiben dabei **ein** Ort. *Umsetzung:* Phase 1 (1.1a Seed-Dedup, 1.1b Guard/3c′, 1.1c Klasse P).
