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

Details `orte.json`-Format + Sync: [30 §3/§4](30-NFR-und-Persistenz.md).

---

## 3. Projektions-Invariante (zentral)

> **INV-PLACE (Reprojektions-Invariante):** Wenn `event.placeId` oder `event.hofId` gesetzt ist, ist `event.place` **ausschließlich** die zwischengespeicherte periodengerechte Projektion `buildPlacForGedcom(event, year)`. `event.place`/`event.addr` sind **Projektions-Cache, keine eigene Wahrheit**. Anzeige *und* Writer leiten beide LIVE aus dem Modell ab. Modelländerungen wirken sofort in Anzeige und Export. Stale-Cache ist strukturell ausgeschlossen, weil die Reprojektion am Ende **jedes** Auflösungspfads läuft.

Analog: `event.lati/long` sind nur Render-Fallback; Wahrheit sind die Koordinaten am PlaceObject/HofObject.

---

## 4. Identitätsauflösung: Events → Orte/Höfe (Kern-Algorithmus)

### 4.1 Charakter der Funktion

`(event.placeId, event.hofId, event.place', event.addr')` ist eine **reine, totale, deterministische Funktion** über:
- Eingabe: `(event.type, event.place, event.addr, event.date)`
- Kontext: `(placeObjects, hofObjects)`

Ausgeführt bei **jedem Laden**. Re-Derivation *ist* die Persistenz (LP-5). Keine Persistenz der Ergebnisse, keine Sidecar-Datei, keine Custom-Tags.

### 4.2 Auflösungsreihenfolge (pro Event)

```
1. Durchreich-REPROJECT — bereits gelinkt (aus GRAMPS-Parser oder vorigem Load)
                          → event.place auf periodengerechte Projektion aktualisieren
2. Pfad A   — PLAC-Leitsegment matcht hof.addrs[] im Dorf-Anker (existierender Hof)
3. Verwaltungs-Match:
   3a. atomare PLAC matcht placeObject per Identität
   3b. Hierarchie-PLAC matcht voll-projektions-exakt
   3c. Hierarchie-PLAC matcht Leitname eindeutig + Existenzspanne + Anker
4. Pfad A'  — atomare PLAC ohne PO-Match → globaler hofObject-Lookup
5. Pfad C   — rich-PLAC ohne Hof → Bootstrap eines Hofs aus Komma-Hierarchie
6. Pfad B   — event.addr matcht hof.addrs[] im Dorf-Scope (existierender Hof)
7. Pfad B'  — event.addr ohne Hof + type ∈ {RESI, PROP, CENS, OCCU}
              → Bootstrap eines Hofs aus Event-Typ-Semantik

REPROJECT am Pfad-Ende:
   event.place ← buildPlacForGedcom(event, year)
   event.addr  ← resolveAddrAsOf(hofId, year)   (nur wenn leer)
```

**Einschränkung:** Hof-Bootstrap-Pfade (A/A'/C) feuern nur für hof-relevante Event-Typen `{RESI, PROP, CENS, OCCU}`. BIRT/DEAT/MARR/BURI/EDUC/GRAD/EVEN mit reichem PLAC (z. B. „Krankenhaus St. Joseph, Münster") werden NIE als Hof interpretiert. Pfad B (explizite `event.addr`) bleibt für alle Typen offen — explizite Adresseingabe ist Nutzer-Intent.

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

Ungewissheit wird sichtbar gemacht (LP-6). Ein „Hof-Zuweisungen prüfen"-Modal zeigt Events mit `event.addr` ohne aufgelösten Hof, klassifiziert:

| Klasse | Beschreibung | Aktionen |
|---|---|---|
| **A** | Non-Hof-Event-Typ mit ADDR ohne Hof-Match | „+ Hof anlegen" \| „Quelle schärfen" |
| **C** | ≥2 Höfe gleicher Adresse im Dorf (mehrdeutig) | „Hof wählen" \| „Quelle schärfen" |
| **D** | Norm-Drift: Adresse matcht keinen Hof, aber Höfe existieren im Dorf | „Variante zum Hof" \| „Hof wählen" \| „+ Hof anlegen" \| „Quelle schärfen" |

Drei Aktionstypen, jeweils am *korrekten* Ort persistent:
- **Quelle schärfen** → Event-Edit (Nutzer passt PLAC/ADDR an) → Anreicherung wandert in GED/GRAMPS (stammbaum-spezifisch).
- **Hof anlegen** → `findOrCreateHof(addr, placeId)` → Anreicherung wandert in `orte.json` (cross-stammbaum).
- **Variante zum Hof** → hängt `addr` als neue `addrs[]`-Bezeichnung an → künftige Events greifen deterministisch via Pfad B.

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
2. **PLAC-Lücken außerhalb Hof-Kontext** — EDUC/GRAD/EVEN mit fremden Verwaltungs-Hierarchien ohne PO. Keine Hof-Themen; gehören in einen Orts-Review-Workflow im Orte-Tab (offen für später).

Zusätzlich eine **aktuell in Überarbeitung befindliche Spezifikationsfrage** (kein Dauerzustand, sondern ein offener Auftrag):

3. **Orte-Bootstrap: automatisch statt nur Opt-in.** ADR-v9-27 hatte entschieden, `placeObjects` NIE automatisch aus PLAC zu erzeugen (nur Opt-in-Vorschlag, §1.7 [K] „Orte-Bootstrap-Vorschlag"), um die kuratierte Natur der Cross-Stammbaum-Schicht (§2) zu bewahren. Nutzer-Rückmeldung nach Praxistest (2026-07-05): das ist aus User-Sicht inakzeptabel — Orte sind genealogische Standardinformation (anders als die Hof-Zusatzfunktion) und müssen nach JEDEM GEDCOM-Import sofort sichtbar sein, auch mit anfänglicher PLAC-Inkonsistenz, die dann über Tool-Unterstützung (Dubletten-Merge, String→PlaceObject-Verknüpfung) nachbearbeitbar sein muss. §2/§4.2 (Verwaltungs-Match-Pfade 3a/3b/3c setzen ein bereits existierendes PlaceObject voraus) und ADR-v9-27 sind entsprechend zu überarbeiten — ohne dabei die Hof-Erkennung (Konvention 1/2, §4.3) zu verwässern. **Noch nicht entschieden/umgesetzt** — Auftrag als Session-Task hinterlegt (Kurzfassung im Projekt-Memory, s. Claude-Session-Notizen), hier als Spec-Restklasse verankert, damit er nicht nur session-lokal existiert.
