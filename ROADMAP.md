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

**sw-Version:** v746 · Cache: `stammbaum-v746`
**Roundtrip GEDCOM:** stabil, net_delta=0, out1===out2 ✓
**Roundtrip GRAMPS:** 60034 Checks ✓ (2894 Pers.)
**Testdaten:** MeineDaten_ancestris.ged (2811 Pers.) · Unsere Familie.gramps (2894 Pers.)

### Gesamtbewertung (Mai 2026) — verifiziert nach Code-Audit

| Bereich | Note | Kernbefund |
|---|---|---|
| Architektur | 7.0/10 | Klare Schichtung, aber globaler Namespace + keine ES-Module = wachsende Schuld |
| Sicherheit | 7.5/10 | Starke CSP, konsequentes `esc()`, aber keine strukturelle Escaping-Garantie (166 innerHTML-Assignments ohne Linter) |
| Design / UX | 8.7/10 | Hochwertige Ästhetik, Mobile-First, WCAG 2.1 AA ✓ (v724); Migrationspfad-Animation ✓; kein Onboarding |
| Funktionsstand | 9.2/10 | Undo/Redo ✓ · Karten-Animation ✓ · Mehrfachzitierungen ✓ · GED7 ✓ · GRAMPS ✓ · ASSO-Edit ✓ |
| Code-Qualität | 7.5/10 | Lesbar, kein Overengineering; JSDoc-Typen + .editorconfig ✓; kein automatisiertes Test-Framework |
| Performance | 7.0/10 | Virtuelles Scrollen + Web Worker ✓; SW-Cache macht Warm-Start instant; 51 Cold-Start-Requests + 133 KB CSS; `debug-gramps.js` bereits lazy-geladen (Vorbild für LAZY-LOAD) |
| GEDCOM-Konformität | 9.5/10 | net_delta=0 auf 83k-Zeilen-Datei — beste GEDCOM-Roundtrip-Treue unter Web-Tools |
| Dokumentation | 9.5/10 | Außergewöhnlich vollständig für ein Einzelprojekt; Handbuch noch mit Mockups statt Screenshots |
| PWA / Offline | 9.0/10 | Eines der besten Beispiele für ernsthaftes PWA-Design; SW-Install ohne Fehlertoleranz bei 404 |
| Datenschutz | 8.5/10 | Lokal-First ✓ · DSGVO-Anonymisierung BFS ✓ (v715) · kein Datamining |
| **∅ Gesamt** | **8.4/10** | *(Vorversion 8.5/10 — nach Audit korrigiert: Performance −0.5, Sicherheit −0.5, Funktionsstand +0.2, GEDCOM +0.5, Datenschutz +0.5)* |

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
| GRAMPS-RT | GRAMPS-Roundtrip vollständig: `_RLOG`/`_TASK` Parser+Writer (Pers.+Fam.); Roundtrip-Tests ausgebaut | v737–v738 |
| GRAMPS-EDIT | GRAMPS-Sektion in Formularen: `grampId` (read-only), `_grampsAttrs[]` editierbar, `_grampsTags[]` Chips | v739 |

---

## T0 — Technische Schulden *(Fundament — in dieser Reihenfolge)*

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| ~~T0-SW~~ | ~~**SW Install-Robustness**~~ | ✅ **Abgeschlossen sw v743** — `PRECACHE_CRITICAL` (atomar) + `PRECACHE_OPTIONAL` (Fonts, leaflet, debug-gramps, Anna.png) via `Promise.allSettled()` | ~~XS~~ |
| ~~T0-XSS~~ | ~~**innerHTML-Audit**~~ | ✅ **Abgeschlossen sw v744** — Vollständiger Scan aller 166 `innerHTML`-Assignments: kein echter XSS-Vektor gefunden. Einzige Inkonsistenz (`ui-forms.js`: `.replace(/"/g,'&quot;')` → `esc()`) behoben. Befund: `esc()` wird konsequent eingesetzt; `data-*`-Attribute mit GEDCOM-IDs sind safe; `title=`-Attribute mit User-Daten alle via `_esc()`/`esc()` abgesichert. | ~~S~~ |
| **T0-STORAGE** | **localStorage / IDB-Strategie Phase 3** | `stammbaum_extraplaces_*` + `stammbaum_hofobjects` (4 Calls in `ui-forms.js`) → async IDB; `loadExtraPlaces()`/`loadHofObjects()` + `await` im Ladepfad nötig. | **S** |
| ~~T0-TEST~~ | ~~**Roundtrip-Test-Automation**~~ | ✅ **Abgeschlossen sw v746** — `test-roundtrip.js`: Node-Script ohne Browser, ohne externe Deps (`vm.runInContext`). GEDCOM-Roundtrip: parse→write→parse→write, assertiert `net_delta=0` + `out1===out2`. Snapshot-Modus (`--update`). CI-Exit-Code. GRAMPS-Roundtrip → Phase 2 (braucht DOMParser-Polyfill). | ~~M~~ |

---

## P1 — Mobile Feldarbeit

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| **CAM** | **Kamera-Integration** | `<input accept="image/*" capture="environment">` → Foto direkt als Medienreferenz zur Person oder Quelle anhängen; kein OneDrive erforderlich; funktioniert iOS + Android PWA nativ. Konkrete Lücke vs. MacFamilyTree iOS. | **S** |
| QUICK-TPL | **Konfigurierbares QuickAdd (Quellen-Templates)** | QuickAdd-Formular passt sich dem Quellentyp an: Taufbuch → Geburt + Taufe als Chips mit separaten Datumsfeldern. Konfiguration als `quickAddTemplates[]` JSON, analog SOUR-TMPL. | M |

---

## P2 — Onboarding & Forschungsqualität

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| **ONBOARDING** | **Onboarding für Erstnutzer** | *(hochgestuft von P4)* Dismissibler Overlay nach Demo-Load: 3–4 Schritte (Person klicken, Baum öffnen, Ereignis bearbeiten). Ohne das bleibt die App für jeden neuen Nutzer undurchdringlich. Einmalig, localStorage-Flag. | **S** |
| F3 | **Pedigree-Collapse** | Mehrfach-Vorfahren im Sanduhr-Baum erkennen + visuell zusammenführen; Inzucht-Koeffizient optional. Voraussetzung: BFS-Algorithmus aus REL-CALC nutzen. | M |

---

## P3 — Desktop-Auswertung & Performance

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| **FAN-COLOR** | **Fächer-Chart: Farbe nach Generation** | 6 CSS-Variablen für Generationsstufen statt einheitlich gold; keine Layout-Änderung nötig. | **XS** |
| ~~CSS-PURGE~~ | ~~**CSS aufräumen**~~ | ✅ **Abgeschlossen sw v745** — 796 CSS-Klassen gegen index.html + *.js geprüft; 21 tote Klassen entfernt (17 ungenuzte Utility-Klassen + `src-tag-x`, `tpl-btn`, `btn-gold-text`, `c-red`); Leaflet-Overrides + dynamisch gebaute Klassen (`tl-pc${idx}` etc.) korrekt behalten. 3416 → 3385 Zeilen (−31). | ~~S~~ |
| **LAZY-LOAD** | **Lazy-Loading optionaler Module** | Cold-Start-Optimierung ohne Build-Step. Vorbild: `debug-activate.js` lädt `debug-gramps.js` bereits jetzt nur bei `?debug=1`. Dasselbe Muster auf 3 Modul-Gruppen anwenden: (1) `ui-book.js` + `ui-print.js` (Buchgenerator/Druck), (2) `ui-dedup.js` + `ui-import-compare.js` + `compare-engine.js` (Merge-Tools), (3) `onedrive-auth.js` + `onedrive-import.js` + `onedrive.js` (nur bei OneDrive-Nutzung). Entfernt ~250 KB JS aus dem initialen Load. SW-Cache + HTTP/2 machen Warm-Start bereits jetzt instant — dieser Fix wirkt nur beim allerersten Besuch (Cold Start). | **M** |
| ~~ACCESSIBILITY~~ | ~~**Accessibility-Audit + Grundhärtung**~~ | ✅ **Abgeschlossen sw v724** — Skip-Link, ARIA-Live, Baum tabindex/role=button, :focus-visible, aria-invalid, prefers-reduced-motion | ~~M~~ |

---

## P4 — Visuelle Ausgaben

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| MAP-HIST-A | **Vintage-Kartenstil** | CSS-Filter (`sepia/brightness/contrast`) auf OSM-Kacheln; Toggle Modern/Historisch; UIState-Persistenz; kein API-Key. | S |
| MAP-HIST-B | **Historischer Kartenhintergrund (Swisstopo)** | Swisstopo Siegfriedkarte (1883–1949, WMTS) als Layer + Jahres-Dropdown. Coverage: Schweiz + Grenzregionen. Nur sinnvoll nach MAP-HIST-A. | M |

---

## P5 — Standards & Interoperabilität

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| ~~ASSO-EDIT~~ | ~~**ASSO-Beziehungen editierbar**~~ | ✅ Abgeschlossen sw v734 — Person-Picker via `modalRelPicker` ('asso'-Modus); `modalAsso` Bottom-Sheet mit Rollen-Select (Godparent/Witness/Informant/Friend/Associate/Eigene) + Notiz-Feld; Assoziationen-Section: alle gespeicherten mit ✎ × Buttons; abgeleitete Patenkinder read-only; `saveAsso`/`deleteAsso`/`showAssoRoleStep`/`assoRoleChange`. | ~~M~~ |
| F6 | **Strict GEDCOM Export** | Alle `_`-Tags entfernen oder auf Standard-Tags mappen; Export-Modus im Einstellungs-Modal. ADR + Test erforderlich. | M |
| ~~GRAMPS-EDIT~~ | ~~**GRAMPS-Attribute editierbar**~~ | ✅ Abgeschlossen sw v739 — GRAMPS-Sektion in Person- + Familien-Formular; `grampId` read-only; `_grampsAttrs[]` editierbar (Typ + Wert, +/×); `_grampsTags[]` read-only Chips; Sektion nur sichtbar wenn GRAMPS-Daten vorhanden. | ~~M~~ |
| ~~GRAMPS-RT~~ | ~~**GRAMPS-Writer vollständig + Roundtrip-Test**~~ | ✅ Abgeschlossen sw v737–v738 — `_RLOG`-Serialisierung (Parser + Writer) für Personen + Familien; `f._tasks` Fix; `_TASK`/`_RLOG`-Checks in allen drei Roundtrip-Testfunktionen (`_grampsDeepTest`, `_grampsDeepRoundtrip`, `runGrampsRoundtripTest`). | ~~M~~ |
| OBJE-TYPE | **Medien-Typ strukturiert** ⚠ | `m._type` als Vendor-Extension (`2 _TYPE`); ADR erforderlich vor Umsetzung. | S |
| ~~GEDCOM-7-EVAL~~ | ~~**GEDCOM 7.0 Evaluierung**~~ | ✅ Abgeschlossen sw v724 — ADR-018 in ARCHITECTURE.md. Ergebnis: Conditional Go; opt-in Exportmodus; Vollplan in 4 Phasen. | ~~M~~ |
| ~~GEDCOM-7-1~~ | ~~**GED7: Datenmodell + Parser**~~ | ✅ Abgeschlossen sw v725 — Parser-Handler NO/EXID/CREA/SNOTE/PHRASE/TRAN; `_parsedPlaceTrans`→`extraPlaces`; `.rela`→`.role`; Typedefs + RELA_LABELS. | ~~M~~ |
| ~~GEDCOM-7-2~~ | ~~**GED7: Writer (opt-in Export)**~~ | ✅ Abgeschlossen sw v726 — `gedExportVersion` ('5.5.1'/'7.0', IDB); `pushCont()` ohne CONC; HEAD `VERS 7.0` + SCHMA; SNOTE/ROLE/PHRASE/NO/EXID/CREA/PLAC·TRAN/NAME·TRAN; Toggle in modalSettings. | ~~M~~ |
| ~~GEDCOM-7-3~~ | ~~**GED7: Cross-Transfer-Adapter**~~ | ✅ Abgeschlossen sw v732 — `_writePlacTrans()` GED5/GED7 unified (`_TRAN`/`TRAN`); `nameTrans[]` als `2 _TRAN` in GED5; Re-Import-Parser erkennt `_TRAN` unter PLAC+NAME; GED5-Downgrade: `exids[]`→REFN, `noEvents`→NOTE, SNOTE→NOTE; GRAMPS-Adapter: `noEvents`→`<attribute>`, `exids[]`→`<url>`, `datePhrase`→`datestr`-Fallback. | ~~M~~ |
| ~~GEDCOM-7-4~~ | ~~**GED7: UI**~~ | ✅ Abgeschlossen sw v733 — `datePhrase` kursiv in allen Event-Zeilen (BIRT/CHR/DEAT/BURI + Array); `noEvents` als ✗-Badges; `exids[]` Panel neben REFN; `aliaNames[]` Textaliase; `nameTrans[]` read-only Chips; Übersetzungs-Editor für `extraPlaces[].trans[]` inline in Ort-Detail (add/remove). | ~~S~~ |

---

## Dokumentation

**Handbuch-Stand: sw v741** *(veraltet — v742–v745 noch nicht dokumentiert)*

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| DOC-SCREENS | **Handbuch: echte Screenshots** | Alle Mockups durch echte Screenshots ersetzen. Priorität: Sanduhr-Baum, Fächer, Nachkommen-Baum, Zeitleiste, Karte (alle 3 Modi), Personen-Detail. | M |

---

## Backlog / Forschung

*Kein festes Datum. Kandidaten für v9+ oder bei geänderter Priorität.*

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| LLM-STORY | **LLM-gestützte Story-Verbesserung** | Opt-in API-Call zum Umschreiben des Story-Textes in natürlicheres Deutsch. Privacy: nur anonymisierte Daten senden. | M |
| F8 | **Cluster-Ansicht** | Alle Personen in denselben Orten/Quellen wie Person X — Netzwerk-Graph oder Liste. | L |
| BUNDLING | **Bundling für Erstladezeit** | Nur sinnvoll nach LAZY-LOAD + ES-MODULE. Mit LAZY-LOAD sind die größten Cold-Start-Gewinne bereits ohne Build-Step realisiert; vollständiges Bundling (esbuild/Rollup) bringt danach nur noch marginale Verbesserung. | L |
| F11 | **OCR** | Urkunden-Scan → Text; WASM-Tesseract oder LLM-Backend als Opt-in. | XL |
| COLLAB | **Kollaboratives Editieren** | Konflikt-freies Merge zweier GEDCOM-Dateien. Grundlage: IMPORT-CMP + DUP-DETECT. Erfordert Server oder CRDTs. | XL |
| ES-MODULE | **Echtes ES-Modul-System** | Umstieg von 44 globalen Script-Tags auf `import`/`export`. Aufwand enorm — Voraussetzung für BUNDLING; Entscheidung erst wenn Codebase stabil. | XL |

---

## Vergleich mit kommerziellen Tools

| Feature | Stammbaum PWA | MacFamilyTree | Ancestry | GRAMPS | Ahnenblatt |
|---|---|---|---|---|---|
| Plattform | Web/PWA/iOS/Desktop | Mac/iOS | Web | Desktop | Windows |
| Offline | ✅ vollständig | ✅ | ❌ | ✅ | ✅ |
| GEDCOM Roundtrip | ✅ exzellent | ✅ gut | ⚠ verlustbehaftet | ✅ gut | ✅ gut |
| GEDCOM 7.0 | ⚠ opt-in Export | ⚠ | ❌ | ⚠ | ❌ |
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

**Verbleibende Lücken:** F6 Strict GEDCOM Export (alle `_`-Tags entfernen).

---

*Aufwand: XS (<1h) · S (1–2h) · M (halber Tag) · L (1–2 Tage) · XL (>2 Tage)*
*Vollständige Sprint-Geschichte inkl. aller abgeschlossenen Items: CHANGELOG.md*
