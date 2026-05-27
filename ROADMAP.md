# Roadmap

Sprint-Geschichte aller abgeschlossenen Versionen: `CHANGELOG.md`

---

## App-Ziel

**Visuell-einsteigerfreundlich für ambitionierte Hobby-Genealogen.**

Zielgruppe: Ambitionierte Hobby-Genealogen, die **mobil** (Archiv, Feldarbeit: schnelle Erfassung, Forschungsaufgaben, Medien) und **am Desktop** (heavy use: Quellen, Auswertung, Ausgaben) arbeiten.

Fünf Dimensionen leiten die Priorisierung:
- **Stabilität** — Sicherheit, Roundtrip-Integrität, technische Schulden
- **Datenschutz** — Lokal-First, DSGVO-Konformität beim Export, keine Cloud-Pflicht
- **Mobil** — Schnellerfassung, Offline-Robustheit, Kamera-Integration
- **Forschungsqualität** — Protokoll, Quellenvorlagen, Validierung, Duplikate
- **Ausgaben** — Karten, Timeline, Story, Diagramme, Druckausgaben

---

## Aktueller Stand

| Version | Branch | Status |
|---|---|---|
| 4.0–7.0 | `main` | Abgeschlossen — Details: CHANGELOG.md |
| 8.0 | `v8-dev` | **Aktiv** |

**sw-Version:** v733 · Cache: `stammbaum-v733`
**Roundtrip GEDCOM:** stabil, net_delta=0, out1===out2 ✓
**Roundtrip GRAMPS:** 60034 Checks ✓ (2894 Pers.)
**Testdaten:** MeineDaten_ancestris.ged (2811 Pers.) · Unsere Familie.gramps (2894 Pers.)

### Gesamtbewertung (Mai 2026)

| Bereich | Note | Kernbefund |
|---|---|---|
| Architektur | 7/10 | Klare Schichtung, aber globaler Namespace + keine ES-Module = wachsende Schuld |
| Sicherheit | 8/10 | Starke CSP, konsequentes `esc()`, aber keine strukturelle Escaping-Garantie |
| Design / UX | 9/10 | Hochwertige Ästhetik, Mobile-First — WCAG 2.1 AA Grundhärtung ✓ (v724) |
| Funktionsstand | 8/10 | Starke Kernfunktionen; DSGVO-Export ✓; Lücken: GEDCOM 7.0, editierbare ASSO |
| Code-Qualität | 7.5/10 | Lesbar, kein Overengineering; JSDoc-Typen + .editorconfig ✓; kein Test-Framework; einige Dateien >800 Z. |
| Performance | 7.5/10 | Gute Optimierungen; 44 HTTP-Requests ohne Bundling |
| GEDCOM-Konformität | 9/10 | Roundtrip-Integrität auf hohem Niveau — beste GEDCOM-Treue unter Web-Tools |
| Dokumentation | 9.5/10 | Außergewöhnlich vollständig für ein Einzelprojekt |
| PWA / Offline | 9/10 | Eines der besten Beispiele für ernsthaftes PWA-Design |
| Datenschutz | 8/10 | Lokal-First ✓ · Lebende-Anonymisierung ✓ (v715) |
| **∅ Gesamt** | **8.2/10** | |

---

## Design-Constraint

Alle neuen Features müssen den GEDCOM 5.5.1 Roundtrip (`out1===out2`, `net_delta=0`) stabil halten. Neue Datenstrukturen dürfen beim GEDCOM-Export keinen zusätzlichen Delta erzeugen — entweder als Passthrough oder als bekannte, dokumentierte Abweichung. Jede Abweichung muss explizit entschieden und in `ARCHITECTURE.md` (ADR) dokumentiert werden.

---

## Abgeschlossen in v8-dev *(seit v650 — vollständig: CHANGELOG.md)*

| ID | Feature | sw |
|---|---|---|
| STORY-OPT | Story: Textqualität (OCCU-Merge, Epochen, Berufsverbindungen) | v638–v644 |
| STORY-DIAGRAM | Story: Inline-SVG Ahnentafel | v645 |
| STORY-PRINT | Story: Print-CSS A4, `@media print` | v646–v647 |
| WW-PARSER | Web Worker für GEDCOM-Parse + Fortschrittsbalken | v649 |
| TL-MULTI | Zeitleiste Mehrpersonen-Modus (2–5 Personen, Farb-Chips) | v665 |
| PRINT-OUT | Ahnenliste (Kekule) + Familienbogen als HTML-Download | v669 |
| DEDUP-ENH | Duplikat-Erkennung ausgebaut (Feldauswahl, Scoring, Suchfeld) | v670–v683 |
| IMPORT-CMP | Datei-Vergleichs- & Merge-Assistent | v673–v682 |
| CSP-FINAL | CSP vollständig: alle Inline-Handler durch Event-Delegation | v686–v690 |
| SEARCH-QA | Komma-Normierung Namen + Quellen-Zwischenablage | v691 |
| T0-REFACT-3 | Große Dateien aufgeteilt (Phase A/B/C) | v696–v697, v714 |
| T0-TYPES | JSDoc-Typen für 12 Kern-Datenstrukturen | v698 |
| ASSO-DISP | ASSO-Beziehungen anzeigen (Paten, Zeugen) | v698+ |
| CSV-EXPORT | CSV-Export Personen- und Familienliste (gefiltert, BOM) | v699 |
| OFFLINE-DIAG | Offline-Indikator im Header + Cache-Check | v699 |
| LIGHT-MODE | Light-Mode Parity: Kontrast, Leaflet, Schatten | v700 |
| VAL-RULES-2 | Validierung: +3 Regeln (PLACE_INCONSISTENCY, MISSING_QUAY, MANY_CHILDREN) | v701 |
| VAL-CONFIG-TOGGLE | Val-Config: Alle/Keine-Toggle + fehlende Checkboxen | v702 |
| BUG-704 | 6 Bugfixes (Hof-Cache, Baum-Reste, Elternkachel, Fächersymbol …) | v704 |
| STORY-FAM | Story-Mode für Familien | v713 |
| HOTFIX-CMP | `compare-engine.js` in index.html eingebunden (ReferenceError-Fix) | v714 |
| F5 | DSGVO: Lebende-Anonymisierung beim GEDCOM-Export (BFS-Propagation, `_anon`-Suffix) | v715 |

---

## T0 — Technische Schulden *(Fundament)*

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| **T0-STORAGE** | **localStorage / IDB-Strategie Phase 3** | `stammbaum_extraplaces_*` + `stammbaum_hofobjects` (4 Calls in `ui-forms.js`) → async IDB; `loadExtraPlaces()`/`loadHofObjects()` + `await` im Ladepfad nötig. | S |

---

## P1 — Mobile Feldarbeit

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| QUICK-TPL | **Konfigurierbares QuickAdd (Quellen-Templates)** | QuickAdd-Formular passt sich dem Quellentyp an: Taufbuch → Geburt + Taufe als Chips mit separaten Datumsfeldern. Konfiguration als `quickAddTemplates[]` JSON, analog SOUR-TMPL. | M |

---

## P2 — Forschungsqualität

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| F3 | **Pedigree-Collapse** | Mehrfach-Vorfahren im Sanduhr-Baum erkennen + visuell zusammenführen; Inzucht-Koeffizient optional. Voraussetzung: BFS-Algorithmus aus REL-CALC nutzen. | M |

---

## P3 — Desktop-Auswertung

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| FAN-COLOR | **Fächer-Chart: Farbe nach Generation** | 6 CSS-Variablen für Generationsstufen statt einheitlich gold; keine Layout-Änderung nötig. | XS |
| ~~ACCESSIBILITY~~ | ~~**Accessibility-Audit + Grundhärtung**~~ | ✅ **Abgeschlossen sw v724** — Skip-Link, ARIA-Live, Baum tabindex/role=button, :focus-visible, aria-invalid, prefers-reduced-motion | ~~M~~ |

---

## P4 — Visuelle Ausgaben

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| MAP-HIST-A | **Vintage-Kartenstil** | CSS-Filter (`sepia/brightness/contrast`) auf OSM-Kacheln; Toggle Modern/Historisch; UIState-Persistenz; kein API-Key. | S |
| MAP-HIST-B | **Historischer Kartenhintergrund (Swisstopo)** | Swisstopo Siegfriedkarte (1883–1949, WMTS) als Layer + Jahres-Dropdown. Coverage: Schweiz + Grenzregionen. Nur sinnvoll nach MAP-HIST-A. | M |
| ONBOARDING | **Onboarding für Erstnutzer** | Dismissibler Overlay nach Demo-Load: 3–4 Schritte (Person klicken, Baum öffnen, Ereignis bearbeiten). Einmalig, localStorage-Flag. | S |

---

## P5 — Standards & Interoperabilität

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| ASSO-EDIT | **ASSO-Beziehungen editierbar** | Person als Zeuge/Pate/Informant zu einem Ereignis zuordnen; `1 ASSO`-Block schreiben + Roundtrip-stabil. ADR erforderlich. ⚠ **Voraussetzung für GEDCOM-7-4** (ROLE-Enum-Auswahl im Edit-Formular). | M |
| F6 | **Strict GEDCOM Export** | Alle `_`-Tags entfernen oder auf Standard-Tags mappen; Export-Modus im Einstellungs-Modal. ADR + Test erforderlich. | M |
| GRAMPS-EDIT | **GRAMPS-Attribute editierbar** | `_grampsAttrs[]` in Personen-/Familien-Formular anzeigen + editieren; `grampId` sichtbar. | M |
| GRAMPS-RT | **GRAMPS-Writer vollständig + Roundtrip-Test** | Automatisierter Test: GRAMPS laden → exportieren → reimportieren → Delta=0. Besonderes Augenmerk: `_TASK`/`_RLOG`. | M |
| OBJE-TYPE | **Medien-Typ strukturiert** ⚠ | `m._type` als Vendor-Extension (`2 _TYPE`); ADR erforderlich vor Umsetzung. | S |
| ~~GEDCOM-7-EVAL~~ | ~~**GEDCOM 7.0 Evaluierung**~~ | ✅ Abgeschlossen sw v724 — ADR-018 in ARCHITECTURE.md. Ergebnis: Conditional Go; opt-in Exportmodus; Vollplan in 4 Phasen. | ~~M~~ |
| ~~GEDCOM-7-1~~ | ~~**GED7: Datenmodell + Parser**~~ | ✅ Abgeschlossen sw v725 — Parser-Handler NO/EXID/CREA/SNOTE/PHRASE/TRAN; `_parsedPlaceTrans`→`extraPlaces`; `.rela`→`.role`; Typedefs + RELA_LABELS. | ~~M~~ |
| ~~GEDCOM-7-2~~ | ~~**GED7: Writer (opt-in Export)**~~ | ✅ Abgeschlossen sw v726 — `gedExportVersion` ('5.5.1'/'7.0', IDB); `pushCont()` ohne CONC; HEAD `VERS 7.0` + SCHMA; SNOTE/ROLE/PHRASE/NO/EXID/CREA/PLAC·TRAN/NAME·TRAN; Toggle in modalSettings. | ~~M~~ |
| ~~GEDCOM-7-3~~ | ~~**GED7: Cross-Transfer-Adapter**~~ | ✅ Abgeschlossen sw v732 — `_writePlacTrans()` GED5/GED7 unified (`_TRAN`/`TRAN`); `nameTrans[]` als `2 _TRAN` in GED5; Re-Import-Parser erkennt `_TRAN` unter PLAC+NAME; GED5-Downgrade: `exids[]`→REFN, `noEvents`→NOTE, SNOTE→NOTE; GRAMPS-Adapter: `noEvents`→`<attribute>`, `exids[]`→`<url>`, `datePhrase`→`datestr`-Fallback. | ~~M~~ |
| ~~GEDCOM-7-4~~ | ~~**GED7: UI**~~ | ✅ Abgeschlossen sw v733 — `datePhrase` kursiv in allen Event-Zeilen (BIRT/CHR/DEAT/BURI + Array); `noEvents` als ✗-Badges; `exids[]` Panel neben REFN; `aliaNames[]` Textaliase; `nameTrans[]` read-only Chips; Übersetzungs-Editor für `extraPlaces[].trans[]` inline in Ort-Detail (add/remove). | ~~S~~ |

---

## Dokumentation

**Handbuch-Stand: sw v724** (frisch aktualisiert)

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| DOC-SCREENS | **Handbuch: echte Screenshots** | Alle Mockups durch echte Screenshots ersetzen. Priorität: Sanduhr-Baum, Fächer, Nachkommen-Baum, Zeitleiste, Karte (alle 3 Modi), Personen-Detail. | M |

---

## Backlog / Forschung

*Kein festes Datum. Kandidaten für v9+ oder bei geänderter Priorität.*

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| F8 | **Cluster-Ansicht** | Alle Personen in denselben Orten/Quellen wie Person X — Netzwerk-Graph oder Liste. | L |
| F11 | **OCR** | Urkunden-Scan → Text; WASM-Tesseract oder LLM-Backend als Opt-in. | XL |
| COLLAB | **Kollaboratives Editieren** | Konflikt-freies Merge zweier GEDCOM-Dateien. Grundlage: IMPORT-CMP + DUP-DETECT. Erfordert Server oder CRDTs. | XL |
| ES-MODULE | **Echtes ES-Modul-System** | Umstieg von 44 globalen Script-Tags auf `import`/`export`. Aufwand enorm — Entscheidung erst wenn Codebase stabil. | XL |
| BUNDLING | **Bundling für Erstladezeit** | 44 HTTP-Requests ohne SW-Cache. esbuild oder Rollup. Bedingt ES-MODULE oder IIFE-Bundles. | L |
| LLM-STORY | **LLM-gestützte Story-Verbesserung** | Opt-in API-Call zum Umschreiben des Story-Textes in natürlicheres Deutsch. Privacy: nur anonymisierte Daten senden. | M |

---

## Vergleich mit kommerziellen Tools

| Feature | Stammbaum PWA | MacFamilyTree | Ancestry | GRAMPS | Ahnenblatt |
|---|---|---|---|---|---|
| Plattform | Web/PWA/iOS/Desktop | Mac/iOS | Web | Desktop | Windows |
| Offline | ✅ vollständig | ✅ | ❌ | ✅ | ✅ |
| GEDCOM Roundtrip | ✅ exzellent | ✅ gut | ⚠ verlustbehaftet | ✅ gut | ✅ gut |
| GEDCOM 7.0 | ❌ (geplant) | ⚠ | ❌ | ⚠ | ❌ |
| GRAMPS XML | ✅ (read+write) | ❌ | ❌ | ✅ nativ | ❌ |
| Karte + Animation | ✅ | ✅ | ✅ | ⚠ | ⚠ |
| Zeitleiste (hist. Ereignisse) | ✅ | ✅ | ⚠ | ⚠ | ⚠ |
| Diagramm-Export | ✅ PNG | ✅ PDF/PNG | ⚠ | ✅ | ✅ |
| Story-Modus | ✅ einzigartig | ⚠ Reports | ❌ | ❌ | ❌ |
| Duplikat-Erkennung | ✅ | ✅ | ✅ | ✅ | ⚠ |
| Datei-Merge | ✅ | ✅ | ⚠ | ✅ | ⚠ |
| Validierungsregeln | ✅ 25 Regeln | ⚠ | ⚠ | ✅ | ⚠ |
| CSV-Export | ✅ | ✅ | ✅ | ✅ | ✅ |
| DNA-Integration | ❌ | ❌ | ✅ | ❌ | ❌ |
| Multi-User | ❌ | ❌ | ✅ | ❌ | ❌ |
| Datenschutz (lokal-first) | ✅ | ✅ | ❌ | ✅ | ✅ |
| Lebende anonymisieren | ✅ (v715) | ✅ | ⚠ | ✅ | ✅ |
| Kosten | gratis | kostenpflichtig | Abo | gratis | gratis |

**Einzigartige Stärken:** Offline-PWA + Story-Modus + animierter Migrationspfad + GRAMPS-Brücke + Forschungsprotokoll + Mehrpersonen-Zeitleiste + DSGVO-Anonymisierung + vollständig lokal ohne Datamining.

**Verbleibende Lücken:** GEDCOM 7.0, editierbare ASSO-Beziehungen.

---

*Aufwand: XS (<1h) · S (1–2h) · M (halber Tag) · L (1–2 Tage) · XL (>2 Tage)*
*Vollständige Sprint-Geschichte inkl. aller abgeschlossenen Items: CHANGELOG.md*
