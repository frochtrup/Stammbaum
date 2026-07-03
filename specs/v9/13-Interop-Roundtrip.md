# 13 — Interoperabilität & Roundtrip

> Schicht: Kern · Abhängig von: [10 Domänenmodell](10-Domaenenmodell.md), [11 Orte/Höfe](11-Orte-Hoefe-Identitaet.md), [12 Forschung](12-Forschungsdaten.md)

Vier Ausgabemodi über **ein** gemeinsames internes Modell. Referenz-Detailtiefe (vollständige Tag-Tabellen INDI/FAM/SOUR/REPO, Parser/Writer-Ausgabestruktur, `_`-Tag-Analyse) bleibt in `GEDCOM.md`.

---

## 1. Roundtrip-Anforderung (die zentrale Qualität)

- **RT-1:** `out1 === out2` (Idempotenz) auf allen Testdateien, in allen vier Ausgabemodi.
- **RT-2:** `net_delta = 0` gegenüber der Ur-Quelle bei nicht-mutierenden Speichervorgängen. Bewusste Ausnahmen: HEAD-Rewrite, dokumentierte CONC/CONT-Neuformatierung, Anonymisierung, Konvention-2→1-Übergang ([11 §4.3](11-Orte-Hoefe-Identitaet.md)).
- **RT-3:** Automatisierte, **headless** ausführbare Roundtrip-Tests für GEDCOM und GRAMPS (ohne UI, ohne Nutzer) — laufen build-frei ([02 INV-ARCH-2](02-Zielarchitektur-v9.md)).

Test-Gates (Vorlage-Belege): `MeineDaten_ancestris.ged` (2811 Pers., 83k Z., Ancestris) → `net_delta=0` + `out1===out2`; `Unsere Familie.gramps` (2894 Pers.) → `xml1===xml2`.

---

## 2. Passthrough-Prinzip

Jedes Datei-Konstrukt, das der Parser nicht strukturiert modelliert, wird **verbatim** erfasst und bei der Ausgabe exakt reproduziert. Kein unbekannter Tag geht verloren (LP-1).

### 2.1 Anforderung an die v9-Umsetzung

> **Neuaufsatz-Hinweis:** v8 kennt **10 Ad-hoc-Passthrough-Kontexte** (verbatim lv=0-Records, INDI/FAM/SOUR-Subtrees, Event-Sub-Tags, ADDR-Sub-Tags, SOUR-Ref-Sub-Tags, OBJE-Blöcke, CHIL-SOUR …) — Altlast ([03 §4](03-Altlasten.md)). v9 entwirft **einen einheitlichen, generischen Passthrough-Baum**:

- **INV-PT:** Jeder geparste Knoten hält seine nicht-erkannten Kind-Zeilen an **genau einer** Stelle, in **Reihenfolge** und **Tiefe**. Ein einziger, testbarer Mechanismus statt zehn.

Konkret: der Parser baut zu jedem Record einen Baum aus `{tag, value, children[]}`; erkannte Knoten werden ins Domänenmodell projiziert, nicht erkannte bleiben als Roh-Teilbäume am nächsthöheren erkannten Knoten hängen. Der Writer serialisiert erkannte Felder an ihrer kanonischen Position und fügt die Roh-Teilbäume an definierter Stelle wieder ein.

### 2.2 GEDCOM-Datumsgenauigkeit-Fallen (aus v8 gelernt)

- Zeilen mit Level > 4 dürfen den Passthrough nicht abbrechen (sonst fallen tiefe OBJE/TYPE-Ketten weg).
- NAME-Kontext-Subtags (z. B. `NICK`) müssen direkt nach dem NAME-Block ausgegeben werden, nicht am Record-Ende.
- `\r\n`-Zeilenenden, UTF-8; HEAD wird neu geschrieben (`1 SOUR Stammbaum-App`), Rest verbatim.

### 2.3 Modellierte vs. verbatim `_`-Tags

Wird ein bisher verbatim durchgereichter `_`-Tag *modelliert* (editierbar gemacht), MUSS der Parser ihn aus dem Passthrough **herauslösen**, sonst Doppelschreibung pro Roundtrip (`_REPO_MODELLED`-Lehre). Beim Modellieren gilt: genau *eine* Writer-Stelle je logischem Kontext. Betrifft u. a. `_EVAL` (Evidenz), `_HYPO` (Hypothese), `_RTYPE`/`_FAURL` (Repository) — siehe [12](12-Forschungsdaten.md)/[10](10-Domaenenmodell.md).

---

## 3. GEDCOM 5.5.1 (Standard)

Kanonisches Ein-/Ausgabeformat. Vollständige Tag-Abdeckung für INDI/FAM/SOUR/REPO/NOTE. `db.gedVersion` steuert **nur** den Writer; der Parser liest 5.5.1 und 7.0. HEAD-Rewrite akzeptiert.

**Geo-Parsing:** `N52.21`→`52.21`, `S…`/`W…`→negativ. MAP auf Level 2 **und** 3 tolerieren (Legacy).

**ID-Vergabe:** `nextId(prefix)` = höchste vorhandene numerische ID + 1, je Typ (`I`/`F`/`S`/`R`).
**Startperson nach Load:** Person mit kleinster numerischer ID → `showTree(...)`.

---

## 4. GEDCOM 7.0 (opt-in Export)

Writer gibt 7.0 nur bei `gedVersion === '7.0'` aus. Unterschiede:

| Feature | GED5 (Standard) | GED7 (opt-in) |
|---|---|---|
| Fehlendes Ereignis | `1 NOTE Kein bekanntes Ereignis: BIRT` | `1 NO BIRT` |
| Externe IDs | `1 REFN` + `2 TYPE` | `1 EXID` + `2 TYPE` |
| Geteilte Notizen | `0 NOTE @xref@` | `0 SNOTE @xref@` |
| Übersetzungen | `_TRAN` | `TRAN` |
| Datum-Freitext | — | `PHRASE` unter DATE |
| ASSO-Rolle | `RELA` (Freitext) | `ROLE` (Enum) |
| CONC | erlaubt | nur CONT |
| SCHMA | — | `1 SCHMA` deklariert alle `_`-Tags |

Cross-Transfer-Adapter GED7→GED5 und GED7→GRAMPS für Downgrade ohne Verlust wo möglich.

---

## 5. Strict GEDCOM 5.5.1 (opt-in Export)

Maximale Fremdkompatibilität — **ohne** proprietäre `_`-Tags. Mapping: `_UID`→`REFN`+`TYPE UID`, `_RUFNAME`→`NICK`, `_FREL/_MREL`→`PEDI`, `_TASK/_RLOG/_EVAL/_HYPO`→weglassen. Roundtrip-stabil (`out1===out2`), aber bewusst **nicht** verlustfrei. Dateiname-Suffix `_strict`, nie direkt speichern.

---

## 6. GRAMPS XML (read+write)

Vollwertiges Zweitformat (gzip XML). Vollständiger Passthrough aller nicht-modellierten Felder via GRAMPS-Handles.
- `placeObjects` ↔ `<placeobj>`, `hofObjects` ↔ `<placeobj type="Building">`.
- Forschungsartefakte ↔ `<attribute>` (JSON-serialisiert → „neue Felder gratis").
- Roundtrip `xml1===xml2`. Notizen/Zitate werden dedupliziert (gemeinsame Handles) — stabil, kein Datenverlust.
- **Test-Seam:** synchrone `buildXMLText(db)` / `parseXMLText(xml)` ohne gzip/Blob, damit der GRAMPS-Roundtrip headless ohne Web-Plattform-APIs testbar ist.

---

## 7. Anonymisierter Export (DSGVO)

Opt-in. Klassifikation lebender Personen in drei Phasen: (1) datumbasiert (kein Sterbedatum + Geburtsjahr > Jahr−100), (2) BFS-Propagation über Verwandte, (3) konservativ (Personen ohne Datum → lebend). Anonyme Records: nur `NAME Lebende Person` + `SEX` + Familienlinks. Dateiname-Suffix `_anon`, Original unberührt, direktes Speichern deaktiviert.

---

## 8. Design-Constraint für alle neuen Features

> Jedes neue Feature muss den GEDCOM-Roundtrip (`out1===out2`, `net_delta=0`) stabil halten. Neue Datenstrukturen erzeugen beim GEDCOM-Export keinen zusätzlichen Delta — entweder als Passthrough oder als bekannte, dokumentierte Abweichung. Jede Abweichung wird explizit dokumentiert (in v8: ADR; in v9: hier bzw. im betroffenen Subsystem-Spec).
