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

**Import-Zeit vs. UI-Zeit (ADR-v9-42, Präzisierung nach wiederholtem Fehlschluss):** Die Kurations-Sorge oben (Schreibvarianten, kein unkuratierter Wildwuchs) gilt für **automatische, massenhafte** Anlage beim Import — dort können hunderte PLAC-Varianten aus einer Fremd-Datei stammen, die niemand einzeln geprüft hat. Sie gilt NICHT für eine **einzelne, bewusste Nutzerhandlung** im Editier-Modus (z. B. „+ neuen Ort/Hof anlegen" aus einem Picker heraus, nachdem die Suche bereits gezeigt hat, dass der Kandidat fehlt) — das ist strukturell identisch zu „+ Neue Person/Familie/Quelle/Archiv anlegen" und braucht keine Ausnahme. Beide Vorgänger-ADRs dieses Dokuments (ADR-v9-40, ADR-v9-41) verwechselten das zunächst, bevor ADR-v9-42 es korrigierte — bei künftigen Ort/Hof-nahen Entscheidungen diese Zeile zuerst prüfen, statt die Verwechslung ein drittes Mal zu machen.

**Vollständigkeit statt Anreicherungs-Gate (ADR-v9-44).** `placeObjects`/`hofObjects` werden **ungefiltert** persistiert — auch Einträge, die exakt dem Seed-Rohzustand entsprechen (kein zusätzlicher Name, keine datierte/zweite `enclosedBy`/`addrs`-Zeile, keine Koordinaten/Notiz/GOV-Referenz). Ein Persistenz-Gate „nur angereicherte Objekte schreiben" wurde geprüft und verworfen: es hätte zwei strukturelle Probleme geerbt — hängende `HofObject.villageId`-FKs auf nie persistierte Dörfer, und eine `PlaceId`-Vergabe (`mintId()` in `seed.ts`), die bei Namenskollisionen von der Verarbeitungsreihenfolge des jeweiligen Ladevorgangs abhängt, also nicht dateiübergreifend stabil ist. „Angereichert vs. plain" bleibt trotzdem eine scharfe, nützliche Unterscheidung — nur wirkt sie ausschließlich als **Anzeige-Prädikat** (§9), nicht als Schreibbedingung.

Details `orte.json`-Format + Sync: [30 §3/§4](30-NFR-und-Persistenz.md).

---

## 3. Projektions-Invariante (zentral)

> **INV-PLACE (Reprojektions-Invariante):** Wenn `event.placeId` oder `event.hofId` gesetzt ist, ist `event.place` **ausschließlich** die zwischengespeicherte periodengerechte Projektion `buildPlacForGedcom(event, year)`. `event.place`/`event.addr` sind **Projektions-Cache, keine eigene Wahrheit**. Anzeige *und* Writer leiten beide LIVE aus dem Modell ab. Modelländerungen wirken sofort in Anzeige und Export. Stale-Cache ist strukturell ausgeschlossen — durch **zwei komplementäre Mechanismen** (ADR-v9-47, Präzisierung nach Code-Befund), nicht einen:

1. **Reprojektion am Cache** — läuft beim vollen Lade-Pass (§4.1) und in jedem `placeId`/`hofId`-*setzenden* Kommando (`linkEventToPlace`/`linkEventToHof`, ADR-v9-19): `event.place` wird dort unmittelbar überschrieben.
2. **Live-Lesen statt Cache-Vertrauen** — für jede reine Orts-/Hof-**Attribut**-Änderung bei GLEICHER `placeId`/`hofId` (`savePlaceObject`/`saveHofObject`, z. B. eine neue datierte `enclosedBy`-Periode): hier läuft **keine** Reprojektion (kein Event-Walk, `savePlaceObject` kennt keine Events). Stattdessen gilt eine generalisierte **Chokepoint-Pflicht**: außerhalb der Reprojektion selbst darf `event.place`/`event.addr` bei gesetzter `placeId`/`hofId` **nirgends roh gelesen** werden — auch nicht im Writer oder im Dirty-Check. Jeder Konsument berechnet in diesem Fall selbst live über `buildPlacForGedcom`/`eventPlaceLabel`. Betrifft konkret: Writer (`applyDatabaseToRoots`/`write-back-emit.ts`), Dirty-Check (`write-back.ts::eventEqual`), Edit-Formular-Anfangswert (`PersonForm`/`FamilyForm`, [20 §2](20-Funktionen.md)) — dieselbe Disziplin, die die Listen-Anzeige (`eventPlaceLabel`, §5) bereits einhält.

Mechanismus 1 lohnt sich für Massenänderungen (voller Lade-Pass, Identität kann sich ändern — z. B. neue `orte.json`). Mechanismus 2 ist der skalierbare Weg für die häufigere Einzel-Anreicherung (Identität bleibt gleich, nur die Projektion ändert sich): kein Event-Scan, keine Massen-Operation, O(1) Zusatzkosten pro ohnehin besuchtem Event.

**Mechanismus 1 im Detail (ADR-v9-19, ✅ entschieden):** greift an **zwei** Stellen: (a) beim **Laden** (voller Auflösungs-Pass, §4) und (b) in **jedem Modell-Mutations-Kommando**, das `placeId`/`hofId` setzt (z. B. `linkEventToPlace`, [20 §1.7](20-Funktionen.md)) — das Kommando reprojiziert `event.place` unmittelbar selbst per `buildPlacForGedcom` (reine Kern-Funktion, INV-ARCH-1-konform). Zwischen (a)/(b) gibt es **keinen** Zwischenzustand, in dem `placeId` gesetzt, `event.place` aber veraltet ist. Persistiert wird weiterhin nur `placeId`/`hofId` (§2), nie `event.place` selbst.

Analog: `event.lati/long` sind nur Render-Fallback; Wahrheit sind die Koordinaten am PlaceObject/HofObject — dieselbe Chokepoint-Pflicht gilt hier bereits (`eventCoords`, §5).

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

Vier zentrale Helfer für die **Event→Ort/Hof-Auflösung** — die einzigen korrekten Reads dieser Art außerhalb des Auflösungs-Codes selbst. Sie sind zugleich die Naht zur UI-Schale ([02 §3.1](02-Zielarchitektur-v9.md)). Zwei weitere, objektseitige Prädikate ergänzen sie unten.

| Helfer | Frage | Auflösung |
|---|---|---|
| `eventPlaceId(ev)` | Welches Dorf? | A: `ev.placeId` (Wahrheit) · B: `findByName(ev.place)` (Projektion) |
| `eventHofId(ev)` | Welcher Hof? | A: `ev.hofId` · B: `findByAddr(ev.addr, year)` im Dorf-Scope |
| `eventCoords(ev)` | Welche Koordinaten? | placeObject/hofObject primär, `ev.lati/long` Fallback |
| `buildPlacForGedcom(ev, year)` | Welcher PLAC-String würde geschrieben? | Hof + Dorf-Hierarchie, periodengerecht |

**Aggregatoren** (`collectPlaces`, `buildHofIndex`) sind **id-basiert** (nicht string-basiert): zwei gleichnamige Orte bleiben distinkt, mehrere Cache-Varianten desselben Orts kollabieren auf einen Eintrag.

**Zwei weitere reine Prädikate** (ADR-v9-44/46, objekt- statt event-seitig, aber derselben Chokepoint-Disziplin unterworfen — Details §9): `isEnrichedPlace(po)`/`isEnrichedHof(hof)` (weicht das Objekt vom Seed-Rohzustand ab?) und `hasReference(id, events)` (löst mindestens ein Event der geladenen Datei auf dieses Objekt auf?). Beide sind reine Funktionen über vorhandene Felder bzw. Events — kein zusätzlicher persistierter Zustand.

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

- **GEDCOM:** `PLAC` aus `buildPlacForGedcom` — **live berechnet beim Schreiben** (ADR-v9-47; vorher am Code drifted: `write-back-emit.ts` schrieb den Projektions-Cache `event.place`, was eine Orts-Attribut-Änderung ohne Datei-Reload verlor), nicht aus `event.place` gelesen; `MAP/LATI/LONG` aus `eventCoords`; `ADDR` = `event.addr` (byte-identisch geschrieben) — bleibt bewusst bei der bestehenden Fill-if-empty-Regel (§4.2 REPROJECT: `resolveAddrAsOf` nur wenn `event.addr` leer ist), NICHT auf live-Neuberechnung bei jedem Schreiben umgestellt wie `PLAC`: die Hof-Adresse ist stärker nutzer-/quellen-eigen (Konvention α, Freitext-Erhaltung), PLAC dagegen vollständig herleitbar; Hof-Notiz als `NOTE @N_HOF@` mit Präfix `[Hof] `. Historische Zeitachse (pnames, enclosedBy, addrs) wird beim GEDCOM-Export **kollabiert** (by design — GEDCOM kann sie nicht abbilden).
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

---

## 9. Kuration: Anreicherung, Massen-Dedup, Referenz-Sichtbarkeit (ADR-v9-44/45/46)

Drei zusammenhängende Regeln, die die volle (§2) statt gefilterte Persistenz von `orte.json` handhabbar halten — Anzeige-/Kurations-Werkzeuge, keine Schreibbeschränkung.

### 9.1 Anreicherungs-Prädikat (ADR-v9-44)

`isEnrichedPlace(po)` ist **falsch** genau dann, wenn `po` bit-identisch dem `seedPlacesFromEvents`-Rohzustand entspricht: `type=''`, `pnames=[]`, genau ein `enclosedBy`-Eintrag mit `from=null,to=null`, `lat=null`, `long=null`, `note=''`, `existsFrom=null`, `existsTo=null`, `govId=null`, `govTypes=null`. Jede Abweichung (weiterer Name, datierte oder zweite `enclosedBy`-Zeile, gesetzte Koordinaten/Notiz/Existenz-Spanne/GOV-Referenz/Typ) macht das Objekt „angereichert".

`isEnrichedHof(hof)` ist **falsch** genau dann, wenn `hof.addrs.length === 1` mit `addrs[0].from === null && addrs[0].to === null` (undatiert), sowie `lat=null`, `long=null`, `note=''`, `existsFrom=null`, `existsTo=null`, `predecessor=null`, `successor=null`, `govId=null`, `govTypes=null` — bit-identisch dem Bootstrap-Rohzustand aus `findOrCreateHof()` (`core/places/hof-id.ts`). Jede Abweichung (Adress-Historie, Lebenszyklus-Verweis, Koordinaten, Notiz) macht den Hof „angereichert".

Beide Prädikate sind reine, headless testbare Kern-Funktionen (`core/places`), **nicht** als persistiertes Feld geführt (würde bei Mutation veralten können — LP-5 eine Ebene tiefer angewandt: „ist angereichert" ist selbst wieder deterministisch aus den vorhandenen Feldern berechenbar).

**Verwendung — Pillen-Text bewusst ohne Herkunfts-Aussage:** Orte-/Höfe-Tab ([20 §1.7/§1.8](20-Funktionen.md)) markiert plain (`!isEnriched…`) Einträge mit einer Pille „**ohne Zusatzangaben**" (nicht „automatisch erkannt" — das Prädikat prüft nur den INHALT, nicht die Herkunft: ein von Hand über „+ neuen Ort anlegen" ([20 §2](20-Funktionen.md), ADR-v9-42) frisch angelegter, noch nicht weiter ausgefüllter Ort erfüllt dieselbe Bedingung wie ein Seed-Ergebnis, wurde aber nicht automatisch erkannt — ein Herkunfts-Claim wäre hier schlicht falsch). Keine Auswirkung auf Persistenz, Auflösung oder Export — reine Anzeige-Information.

### 9.2 Massen-Dedup (ADR-v9-45)

**Eine** Funktion, nicht zwei getrennte — `findPlaceDuplicates(items, kind, toleranceKm = 1)`, reine, deterministische Funktion (analog v8: `items` ist `placeObjects` für `kind ∈ {'places','all'}`, `hofObjects` für `kind='farms'`). Liefert Kandidatengruppen (`{ ids: (PlaceId|HofId)[] }[]`, ≥ 2 Mitglieder) nach drei Kriterien (Union-Find):

1. **Verträglichkeits-Key-Kollision** — bei `kind ∈ {'places','all'}`: gleicher normalisierter Leitname (`normPlaceName`) UND verträgliche Elternketten (§4.2, ADR-v9-29-Regel: eine Kette ist Präfix der anderen, oder leer), **nicht** roher Fold-Key-Vergleich (v8-Abweichung, s. u.). Bei `kind='farms'`: gleiche normalisierte Adresse (`normHofAddr`, §4.4 Konvention α) UND gleiches `villageId` — Hof-Identität läuft über Adresse+Dorf, nicht über Namens-Hierarchie.
2. **Koordinaten-Nähe** (≤ `toleranceKm`) bei gleichem Titel-Fold — gilt für alle `kind`.
3. **Bare↔reich Cross-Achse** — NUR bei `kind ∈ {'places','all'}`: ein plain PO (§9.1) ohne `enclosedBy`/`pnames` mit Komma-Titel wird gegen ein angereichertes PO verglichen, dessen Titel dem Leitsegment entspricht. Durch ADR-v9-44 (alle plain Einträge bleiben dauerhaft in `orte.json`) tritt dieser Fall in v9 häufiger auf als im v8-Vorbild. Bei `kind='farms'` übersprungen (wie im v8-Vorbild) — Hof-Identität kennt kein Komma-Titel-Äquivalent.

`kind` unterscheidet `'places'` (Farm/Building ausgeschlossen), `'farms'` (nur Hof-Äquivalent), `'all'` (Migrations-/Test-Zweck).

**Abweichung vom v8-Vorbild (bewusst):** v8s `findPlaceDuplicates` nutzte für Kriterium 1 (Places) einen reinen Fold-Key-Vergleich ohne Eltern-Verträglichkeits-Check — das hätte in v9 den ADR-v9-29-Schutz unterlaufen (Oldenburg/Niedersachsen und Oldenburg/USA dürfen NIE als Dublette vorgeschlagen werden). v9 nutzt stattdessen dieselbe Verträglichkeits-Logik wie der Seed-Dedup (§4.2).

**Merge:** `mergePlaceObjects(places, hofObjects, survivorId, mergedIds: PlaceId[])` — Erweiterung der bestehenden paarweisen Kern-Funktion (§-intern: dünner Wrapper, mehrfacher Aufruf der Einzel-Merge-Logik, keine Duplizierung) auf mehrere Verlierer. Analog `mergeHofObjects`. Verlustfrei wie die bestehende paarweise Fassung: Namens-/Zugehörigkeits-Union (dedupliziert), Lücken-Auffüllung (nur leere Gewinner-Felder), alle Fremdreferenzen (`event.placeId`/`hofId`, andere `enclosedBy`/`villageId`) umgehängt.

**Automatischer Hof-Nachlauf nach Dorf-Merge (ADR-v9-45, Nachtrag 2026-07-10 — korrigiert v8-Abweichung von oben zurück).** Ursprünglich als „bewusst nicht übernommen" entschieden (kein Analogon zu v8s `_reconcileFarmsUnderVillage`, stattdessen ein zweiter manueller Dedup-Lauf) — das war falsch, aus zwei Gründen: (1) **Entdeckbarkeit** — niemand stößt Massen-Dedup von selbst direkt nach einem thematisch anderen Vorgang (Dorf-Merge) noch mal an. (2) **Echte Resolver-Regression, kein reines Unordnungsproblem** — `hof-registry.ts::findByAddr` liefert bei ≥2 Kandidaten `null` („strikt eindeutig — sonst Review"), das Event fällt in Review-Klasse C (§6). Zwei gleichnamige Höfe waren vor dem Dorf-Merge unter verschiedenen Dörfern eindeutig auflösbar; nach dem Merge hängen beide am selben Dorf — bei GEDCOM-Quellen kippt das bei JEDEM folgenden vollen Reload (`hofId` nie persistiert, §2) von „eindeutig" auf „mehrdeutig". Der fehlende Nachlauf ist damit keine Frage der Aufräum-Ordnung, sondern eine stille Verschlechterung der Auflösungsqualität für zuvor korrekt funktionierende Events.

Anders als das allgemeine Massen-Dedup (Kriterium 1 bei Orten ist eine Heuristik, „wahrscheinlich derselbe Ort") braucht dieser Fall **keine** neue Nutzer-Entscheidung: `(villageId, normalisierte Adresse)` ist bereits die strukturelle Identität eines Hofs (§4.4, Kriterium 1 oben) — sobald der Nutzer „Dorf A = Dorf B" per Dorf-Merge bestätigt hat, folgt „zwei Höfe mit identischer Adresse im resultierenden Dorf sind derselbe Hof" zwingend daraus.

`mergePlaceObjects` bekommt daher zwei zusätzliche, feste Schritte (kein separates Nutzer-Kommando):

```
mergePlaceObjects(places, hofObjects, survivorId, mergedIds):
  … Schritte 1–5 (Namen/enclosedBy vereinigen, HofObject.villageId umhängen)
  6. Höfe unter survivorId nach normalisierter Adresse gruppieren
     → jede Gruppe ≥2 automatisch zusammenführen (Gewinner-Heuristik wie
       oben: Verwendungszahl → Koordinaten → Notiz → kleinste ID) —
       ruft dieselbe verlustfreie Merge-Logik von oben auf, kein neuer
       Mechanismus.
  7. Toast, falls konsolidiert wurde: „N Hof-Dubletten unter ⟨Dorf⟩
     automatisch zusammengeführt" (Transparenz, LP-6 — analog dem
     Konvention-2-Übergangs-Toast, §4.3).
```

Automatisierung ist hier sicher: die Merge-Operation selbst ist bereits verlustfrei, und es ist keine unabhängige menschliche Abwägung mehr nötig — der Nutzer hat sie mit dem Dorf-Merge bereits getroffen (derselbe Fehlschluss-Typ wie ADR-v9-40→42: eine Spannung fälschlich als „braucht neue Bestätigung" behandeln, obwohl eine bereits getroffene Entscheidung sie strukturell schon auflöst).

**UI** ([20 §1.7/§1.8](20-Funktionen.md)): Massen-Dedup-Ansicht zeigt vorgeschlagene Gruppen mit Gewinner-Vorschlag (Heuristik: Verwendungszahl → Koordinaten vorhanden → Notiz vorhanden → kleinste ID — Vorschlag, vom Nutzer änderbar), „Zusammenführen" pro Gruppe als explizites, bestätigtes Kommando. Kein automatisches Zusammenführen beim Laden.

### 9.3 Referenz-Sichtbarkeit (ADR-v9-46)

`hasReference(id, events)` — reine Funktion: mindestens ein Event der aktuell geladenen Datei löst via `eventPlaceId`/`eventHofId` (§5) auf `id` auf.

Die **Haupt**-Orte-/Höfe-Liste ([20 §1.7/§1.8](20-Funktionen.md)) zeigt nur referenzierte Objekte (`hasReference === true`). Referenzlose Objekte (existieren in `orte.json`, aber kein Event der geladenen Datei zeigt (mehr) darauf) erscheinen in einem separaten Filter/Abschnitt „Ohne Bezug" — dort vollständig editierbar und löschbar wie jedes andere Objekt. **Keine automatische Löschung** — referenzlose Objekte bleiben bestehen, bis der Nutzer aktiv löscht oder eine spätere Datei/ein Merge sie wieder referenziert.

**Bewusste Abweichung vom v8-Orakel:** v8 blendet referenzlose `placeObjects` nicht aus der Hauptliste aus, sondern zeigt sie dort mit einer „Nicht verknüpft"-Badge. v9 trennt stärker (separate Sichtbarkeit statt Badge in derselben Liste) — explizite v9-Entscheidung, keine Nachbau-Lücke (Oracle-vs-Spec-Disziplin, [32 TST-6](32-Testframework.md)).

**Schnittmenge mit §9.1:** ein Objekt kann gleichzeitig plain UND referenzlos sein (z. B. Rest eines gelöschten Events oder einer rückgängig gemachten Bearbeitung) — der Hauptkandidat für eine spätere manuelle Aufräumaktion über §9.2, aber ohne eigenen Automatismus.
