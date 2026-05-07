# Roadmap

Sprint-Geschichte aller abgeschlossenen Versionen: `CHANGELOG.md`

---

## Aktueller Stand

| Version | Branch | Status |
|---|---|---|
| 4.0–6.0 | `main` / `v6-dev` | Abgeschlossen — Details: CHANGELOG.md |
| 7.0 | `v7-dev` | In Entwicklung |

**sw-Version:** v350 · Cache: `stammbaum-v350`
**Roundtrip GEDCOM:** stabil, net_delta=0 · **GRAMPS:** 60034 Checks ✓ (2894 Pers.)
**Testdaten:** MeineDaten_ancestris.ged (2811 Pers.) · Unsere Familie.gramps (2894 Pers.)

---

## Version 7.0 — Abgeschlossene Phasen

| Phase | Inhalt | SW |
|---|---|---|
| 1 | GRAMPS-GEDCOM-Kompatibilität — `detectGRAMPS()`, `grampId`-Felder | v190 |
| 2 | GRAMPS XML Import — `gramps-parser.js`, `db.placeObjects{}`, `db._grampsHandles{}` | v191–v196 |
| 3 | GRAMPS XML Round-trip — `gramps-writer.js`, 60034 Deep-Test-Checks ✓ | v193–v204 |
| 3b | UI: Höfe-Ansicht, RESI-Autocomplete, Bewohner-Formular | v224–v228 |
| Cleanup | Virtual Scroll, onclick-Delegation, State-Konsolidierung, Suche indexiert | v230–v233 |
| 4a | UX: `compactPlace()`, Notizen-Modal, noteRefs editierbar + löschbar | v236–v242 |
| 4b | Duplikat-Erkennung + Merge: Levenshtein-Scoring, Merge-Modal | v243 |
| 4c | Kartenansicht: Leaflet lokal, Orte + Personenbiografie, Desktop-Panel | v244–v250 |
| 4d | Hof-Koordinaten + Notizen: `db.hofObjects{}`, PLAC+MAP am RESI, Hof-Marker | v280–v283 |
| 4e | Hof-Eigentum: PROP-Ereignisse, `propEntries[]`, chronologische Sortierung | v261–v265 |
| 4f | UX/UI-Review: Touch-Targets, Swipe-down, Unified Nav, `showToast(type)` | v289–v297 |
| 4g | Rufname: `_RUFNAME`-Tag Roundtrip, Detailansicht, Baum | v298 |
| 4h | Security/A11y: `user-scalable=no` entfernt, `esc()`, Debug `?debug=1`-only | v300–v306 |
| 4j | Forschungsaufgaben: `p._tasks[]`, GEDCOM+GRAMPS-Roundtrip, globale Liste, Badge | v307 |
| 5.1 | ASSO/RELA/Taufpaten: `p.associations[]`, GEDCOM↔GRAMPS, Taufpaten-CHR-Formular | v323–v329 |
| F1 | Sosa/Kekule: 9-Gen-Baum + Fächer, `_buildKekuleMap()`, `#N`-Badges | v330–v332 |
| F2 | Beziehungsrechner: BFS, `_relLabel()`, Pfad-Modal, Pedigree-Collapse-Hinweis | v333–v348 |
| F4 | Soundex-Suche: `germanSoundex()`, Umlaut-Normalisierung, ≈-Toggle in globaler Suche | v350 |

GEDCOM-Roundtrip-Fixes: v208–v220 (Orts-Hierarchie, FAM CHIL-Quellenrefs, @@-Normalisierung)

---

## Offene Aufgaben

### Architektur

| ID | Aufgabe | Aufwand |
|---|---|---|
| A5 | **`db`-Shim eliminieren**: `setDb()` mit `Object.assign`; `const db = AppState.db` modul-level; ~12 Zuweisungen in `storage.js`, `storage-file.js`, `ui-debug.js` | L |

### UX

| ID | Aufgabe | Aufwand |
|---|---|---|
| U8 | **Cmd+Z granulares Undo**: History-Stack auf AppState | XL |
| U12 | **Dark Mode**: `prefers-color-scheme` in `styles.css`; `theme_color` in `manifest.json` | M |
| U16 | **Farbkodierung Baum A11y**: Geschlecht nur durch Farbe — keine Text-Alternative für Farb-Sehschwäche | XS |

### GRAMPS — Editierbarkeit (Phase 5.2/5.3)

| Aufgabe | Aufwand |
|---|---|
| ~~OBJE ohne FORM stabilisieren — `m.form = null`; Writer nur ausgeben wenn nicht null~~ | ✓ |
| Personen-Formular — `_grampsAttrs[]` anzeigen/editieren; `grampId` + `_grampsCall` sichtbar | M |
| Ereignis-Formular — `_grampsAttrs[]` pro Event; Witness-Rollen (read-only) | M |
| Orts-Picker — `db.placeObjects{}` als strukturierter Picker (Hierarchie: Stadt → Kreis → Land) | M |
| GRAMPS-Badge in Topbar — bei `db._grampsMaster`: Icon + `.gramps` als primäres Export-Format | S |
| Tags anzeigen — `db.tags{}` in Personen-/Familien-Detail als Badges | S |

### Features & Analyse

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| F3 | **Pedigree-Collapse** | Inzucht-Koeffizient; baut auf F2-BFS auf | M |
| ~~F4~~ | ~~**Soundex-Suche**~~ | ~~Schreibvarianten (Decker/Deker/Döker); Toggle in Suche~~ | ✓ |
| F4b | **Mehrfach-Zitierungen** | `citations:[{sid,page,quay}]` statt `sources[]+sourcePages{}`; ~8 Dateien; Roundtrip neu verifizieren | XL |
| F5 | **Lebende-Anonymisierung** | Export: Geb. >~1920 + kein Sterbedatum → "Lebende Person"; DSGVO | M |
| F6 | **Strict-GEDCOM-Export** | Alle `_`-Tags entfernen; max. Interoperabilität mit Ancestry/FTM | M |
| F7 | **Narrative-Export** | Fließtext-Biografie → TXT/HTML; LLM-Erweiterung optional | L |
| F8 | **Cluster-Ansicht** | Personen in denselben Orten/Quellen wie Person X | L |
| F9 | **Zeitleiste** | Events neben historischen Ereignissen; `ui-timeline.js` | XL |
| F10 | **Buchgenerator** | HTML/PDF Familienbuch; Ahnentafel + Biografie + Fotos | XL |
| F11 | **OCR** | Urkunden-Scan → Text; WASM-Tesseract oder LLM-Backend | XL |
| — | **Nachkommen-Baum** | Top-down SVG | L |

---

*Aufwand: XS (<1h) · S (1–2h) · M (halber Tag) · L (1–2 Tage) · XL (>2 Tage)*
*Abgelehnte Aufgaben und Archiv: CHANGELOG.md*
