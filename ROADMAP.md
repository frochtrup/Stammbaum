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

**sw-Version:** v704 · Cache: `stammbaum-v704`
**Roundtrip GEDCOM:** stabil, net_delta=0, out1===out2 ✓
**Roundtrip GRAMPS:** 60034 Checks ✓ (2894 Pers.)
**Testdaten:** MeineDaten_ancestris.ged (2811 Pers.) · Unsere Familie.gramps (2894 Pers.)

### Gesamtbewertung (Mai 2026)

| Bereich | Note | Kernbefund |
|---|---|---|
| Architektur | 7/10 | Klare Schichtung, aber globaler Namespace + keine ES-Module = wachsende Schuld |
| Sicherheit | 8/10 | Starke CSP, konsequentes `esc()`, aber keine strukturelle Escaping-Garantie |
| Design / UX | 8.5/10 | Hochwertige Ästhetik, Mobile-First — Accessibility-Lücken |
| Funktionsstand | 7.5/10 | Starke Kernfunktionen; Lücken bei CSV, GEDCOM 7.0, DSGVO-Export |
| Code-Qualität | 7/10 | Lesbar, kein Overengineering; kein Linter/Tests, einige zu große Dateien |
| Performance | 7.5/10 | Gute Optimierungen; 44 HTTP-Requests ohne Bundling |
| GEDCOM-Konformität | 9/10 | Roundtrip-Integrität auf hohem Niveau — beste GEDCOM-Treue unter Web-Tools |
| Dokumentation | 9.5/10 | Außergewöhnlich vollständig für ein Einzelprojekt |
| PWA / Offline | 9/10 | Eines der besten Beispiele für ernsthaftes PWA-Design |
| Datenschutz | 6.5/10 | Lokal-First ✓ — Lebende-Anonymisierung beim Export fehlt noch |
| **∅ Gesamt** | **7.9/10** | |

---

## Design-Constraint

Alle neuen Features müssen den GEDCOM 5.5.1 Roundtrip (`out1===out2`, `net_delta=0`) stabil halten. Neue Datenstrukturen dürfen beim GEDCOM-Export keinen zusätzlichen Delta erzeugen — entweder als Passthrough oder als bekannte, dokumentierte Abweichung. Jede Abweichung muss explizit entschieden und in `ARCHITECTURE.md` (ADR) dokumentiert werden.

---

## Abgeschlossen in v8-dev *(Auswahl — vollständig: CHANGELOG.md)*

| ID | Feature | sw |
|---|---|---|
| SAFARI-SWIPE | Safari-„Zurück"-Swipe abfangen | v573 |
| TASK-EXPORT-MD | Aufgabenliste als Markdown exportieren | v574 |
| F9 | Zeitleiste (Swim-Lane, 71 hist. Ereignisse); ab v591 vollwertiges Diagramm mit einheitlicher Topbar-Struktur | v501–v591 |
| STORY | Story Mode (Fließtext, Karte, Galerie, Print) | v549–v560 |
| SOUR-DATA | SOUR.DATA.EVEN/DATE strukturiert | v546 |
| MEDI-CALN | MEDI-Typ unter REPO.CALN | v545 |
| ALIA | ALIA-Aliasverweise symmetrisch | v499 |
| REFN | REFN/RIN strukturiert | v548 |
| SEC-1 | XSS-Härtung: URL-Sanitizer href (onedrive-Vorschau) | v576 |
| SEC-2 | MIME-Validierung Foto-Upload + Fehler-Toast | v576 |
| SEC-3 | XSS: `buildPlacePartsHtml()` → DOM-API `_buildPlaceParts()` | v607 |
| STAB-2 | Konflikt-Erkennung beim Speichern (`lastModified`-Check) | v607 |
| QUICK-ADD | Schnellerfassung neue Person (Masseneingabe-Modus) | v577 |
| CAM-LINK | Foto direkt an Ereignis (Kamera-Button im Event-Formular) | v578 |
| STATS-2 | Statistik-Dashboard ausgebaut (Lebensspannen, Heiratsalter, Ereignisse/Dekade, Sterbeorte, Kinderzahl) | v597 |
| SEARCH-ADV | Erweiterte Suche: Fehlende-Felder-Checkboxen | v596 |
| MAP-ANIM | Karte: animierter Migrationspfad (Play/Pause/Stopp) | v603 |
| MAP-TOPBAR | Karte als Diagramm: 🗺-Button in allen Diagramm-Topbars | v604 |
| MEDIA-MGR | Medien-Galerie (Kacheln, Lazy-Loading, Filter) | v608 |
| MEDIA-MGR-DETAIL | Medien-Detailansicht mit Referenz-Management | v609–v622 |
| PERF-MEDIA | Medien-Galerie: IntersectionObserver + Thumb-Cache | v623 |
| MEDIA-SORT | Medienliste: Sortierung nach Dateiname (⇅) | v624 |
| REL-CALC | Beziehungsrechner (BFS, gemeinsamer Vorfahre, Pfad-Modal) | v626 |
| REFACT-1 | `parseGEDCOM()` in 5 Sub-Parser aufgeteilt; Kontext-Objekt `x` | v627 |
| DUP-DETECT | Duplikat-Erkennung (Levenshtein+Soundex, Merge-Modal) | v628 |
| CHART-EXPORT | Diagramm-Export als PNG | v629 |
| TREE-SIB-HORIZ | Sanduhr: Geschwister + Ehepartner horizontal | v632 |
| STORY-OPT | Story: Textqualität (OCCU-Merge, Epochen, Berufsverbindungen) | v638–v644 |
| STORY-DIAGRAM | Story: Inline-SVG Ahnentafel | v645 |
| STORY-PRINT | Story: Print-CSS A4, `@media print` | v646–v647 |
| WW-PARSER | Web Worker für GEDCOM-Parse + Fortschrittsbalken | v649 |
| TL-MULTI | Zeitleiste Mehrpersonen-Modus (2–5 Personen, Farb-Chips) | v665 |
| PRINT-OUT | Ahnenliste (Kekule) + Familienbogen als HTML-Download | v669 |
| DEDUP-ENH | Duplikat-Erkennung ausgebaut (Feldauswahl, Scoring, Suchfeld) | v670–v683 |
| IMPORT-CMP | Datei-Vergleichs- & Merge-Assistent | v673–v682 |
| CSP-FINAL | CSP vollständig: alle Inline-Handler durch Event-Delegation ersetzt | v686–v690 |
| SEARCH-QA | Komma-Normierung Namen + Quellen-Zwischenablage | v691 |
| ASSO-DISP | ASSO-Beziehungen anzeigen (Paten, Zeugen, Patenkinder) | v698+ |
| CSV-EXPORT | CSV-Export Personen- und Familienliste (gefiltert, `;`-getrennt, BOM) | v699 |
| OFFLINE-DIAG | Offline-Indikator im Header + online/offline-Toast + Cache-Check | v699 |
| LIGHT-MODE | Light-Mode Parity: `--border`/`--gold` Kontrast, Leaflet-Attribution, Schatten | v700 |
| TEST-AUTO | `test.html`: Standalone GEDCOM Roundtrip-Tester | — |
| BUG-704 | 6 Bugfixes: stale Hof-Cache, Baum-"…"-Überbleibsel, Geschwisterzähler entfernt, leere Elternkachel öffnet neues Individuum, Fächersymbol ◗, Personenliste min-height | v704 |

---

## P0 — Kritische Fehler & Sicherheit *(sofort, blockiert Features)*

> P0-Items gelten als Pflicht vor jedem Release. Sicherheits-Items vor jedem Share-Link.

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| **HOTFIX-CMP** | **⚠ `compare-engine.js` fehlt in index.html** | `ui-import-compare.js` ruft `cmpLoadFile()`, `cmpMatchPersons()`, `cmpComputePersonDiff()`, `cmpApplyPatch()` auf — alle undefined, da `compare-engine.js` kein `<script src>` in `index.html` hat (nur in sw.js PRECACHE). Import-Compare-Feature wirft ReferenceError. Fix: `<script src="compare-engine.js">` vor `<script src="ui-import-compare.js">` einfügen. | XS |
| **F5** | **DSGVO: Lebende-Anonymisierung beim Export** | Export-Option: Personen mit Geb. >~1920 und kein Sterbedatum werden anonymisiert → Name „Lebende Person", alle Ereignisse entfernt. Ohne diese Funktion ist die Weitergabe von GEDCOM-Dateien mit lebenden Personen potenziell DSGVO-widrig. Opt-in im Einstellungs-Modal; GEDCOM-Export + GRAMPS-Export. Roundtrip-Auswirkung: dokumentierte, bewusste Abweichung (ADR). | M |
| ~~SEC-1~~ | ~~XSS URL-Sanitizer onedrive-Vorschau~~ | v576 | - |
| ~~SEC-2~~ | ~~MIME-Validierung Foto-Upload~~ | v576 | - |
| ~~SEC-3~~ | ~~XSS: DOM-API statt innerHTML für Orte~~ | v607 | - |
| ~~STAB-2~~ | ~~Konflikt-Erkennung beim Speichern~~ | v607 | - |
| ~~CSP-FINAL~~ | ~~CSP vollständig ohne Inline-Handler~~ | v690 | - |

---

## T0 — Technische Schulden *(kein Nutzer-Feature, aber Fundament)*

> Technische Schulden bremsen jede neue Entwicklung. Diese Items werden parallel zu Features abgearbeitet, nicht nach.

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| ~~T0-DEBUG~~ | ~~`debug-gramps.js` bedingt laden~~ | v694 | - |
| **T0-STORAGE** | **localStorage / IDB-Strategie (Phase 3 offen)** | Abgeschlossen v695: `od_file_id`/`od_file_name` → IDB-Cache (`_odCurFileId`/`_odCurFileName`), `dedup_ignored` → IDB, `stammbaum_filename` GRAMPS-Schreibpfad → IDB. **Offen:** `stammbaum_extraplaces_*` + `stammbaum_hofobjects` (4 Calls in `ui-forms.js`) — brauchen async `loadExtraPlaces()`/`loadHofObjects()` + `await` in Ladepfad; Quota-Risiko gering; residuale `stammbaum_filename`-Lesezugriffe (5) via `AppState._currentFilename`; Q3/2026-Cleanup (GEDCOM-Migrations-Fallback). | S |
| **T0-REFACT-3** | **Große Dateien aufteilen** | ~~Phase A (v696): `ui-views-tasks.js` → tasks + rlog + val~~ ~~Phase B (v697): `ui-views.js` (1.471 Z.) → `ui-views.js` (691 Z.) + `ui-views-nav.js` (249 Z.) + `ui-views-undo.js` (59 Z.) + `ui-event-delegation.js` (471 Z., letztes Script)~~ **Offen Phase C:** `ui-story.js` (1.104 Z.) — IIFE-Closure, komplex, defer. | L |
| ~~T0-LINTER~~ | ~~ESLint einrichten~~ | Gestrichen: Code hat kein `var`, kein eval, konsequentes `esc()`. Multi-File-Globalnamespace macht `no-undef` wartungsintensiv. Ersetzt durch `.editorconfig` (v698): 2-Space, LF, UTF-8, trim-trailing-whitespace. | - |
| ~~T0-TYPES~~ | ~~JSDoc-Typen für Kern-Datenstrukturen~~ | v698: `@typedef` für 9 Typen (`Citation`, `MediaRef`, `SpecialEvent`, `PersonEvent`, `Task`, `RlogEntry`, `Person`, `Family`, `Source`, `Repo`, `FamilyEvent`, `AppDb`) in `gedcom.js`; `@param`/`@returns` auf 8 Gettern/Settern + `parseGEDCOM`, `writeGEDCOM`, `parseGRAMPS`. | - |
| ~~T0-DEBUG~~ | ~~`debug-gramps.js` bedingt laden~~ | v694 | - |
| ~~REFACT-1~~ | ~~`parseGEDCOM()` in Sub-Parser aufgeteilt~~ | v627 | - |
| ~~REFACT-2~~ | ~~Datum-Parsing zentralisiert~~ | bereits in `gedcom.js` | - |

---

## P1 — Mobile Feldarbeit *(Kernnutzen unterwegs)*

Feldarbeit = Archiv, Kirchenbuch vor Ort, Friedhof, Bibliothek. Ziel: neue Erkenntnisse in <60 Sekunden erfassen, ohne Desktop-Ablenkung.

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| ~~QUICK-ADD~~ | ~~Schnellerfassung neue Person (Masseneingabe-Modus)~~ | v577 | - |
| ~~CAM-LINK~~ | ~~Foto direkt an Ereignis (Kamera-Button)~~ | v578 | - |
| QUICK-TPL | **Konfigurierbares QuickAdd (Quellen-Templates)** | QuickAdd-Formular passt sich der gewählten Quelle an: Quellentyp bestimmt welche Felder erscheinen. Beispiel Taufbuch: Geburt + Taufe als Chips, separates Datum je Ereignis. Konfiguration als `quickAddTemplates[]` JSON, analog SOUR-TMPL. | M |
| ~~OFFLINE-DIAG~~ | ~~Offline-Indikator im Header + Cache-Check~~ | v699 | - |

---

## P2 — Forschungsqualität *(von Datensammlung zu systematischer Forschung)*

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| ~~SOUR-TMPL~~ | ~~Quellen-Vorlagen (10 Templates)~~ | v586 | - |
| ~~FORSCH-LOG~~ | ~~Forschungsprotokoll (`_RLOG`)~~ | v582–v585 | - |
| ~~VAL-EXTEND~~ | ~~Validierung ausgebaut (21 Regeln)~~ | v590 | - |
| ~~TREE-HEAT~~ | ~~Vollständigkeits-Heatmap im Baum~~ | v598 | - |
| F3 | **Pedigree-Collapse** | Mehrfach-Vorfahren im Sanduhr-Baum erkennen + visuell zusammenführen; Inzucht-Koeffizient optional. Relevant sobald Stammbäume >5 Generationen in enge Regionen zurückgehen. Voraussetzung: BFS-Algorithmus aus REL-CALC nutzen. | M |
| ~~VAL-RULES-2~~ | ~~Validierung: inhaltliche Regeln ausbauen~~ | v701 — 3 neue Regeln: PLACE_INCONSISTENCY (Ortsname-Varianten), MISSING_QUAY (Quellen ohne Qualitätsbewertung), MANY_CHILDREN (>15 Kinder, konfigurierbar) | - |
| ~~ASSO-DISP~~ | ~~ASSO-Beziehungen anzeigen (Read-only)~~ | v698+ | - |

---

## P3 — Desktop-Auswertung *(Heavy Use am Desktop)*

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| ~~STATS-2~~ | ~~Statistik-Dashboard ausgebaut~~ | v597 | - |
| ~~SEARCH-ADV~~ | ~~Erweiterte Suche: Fehlende-Felder-Checkboxen~~ | v596 | - |
| ~~REL-CALC~~ | ~~Beziehungsrechner (BFS, Pfad-Modal)~~ | v626 | - |
| ~~MEDIA-MGR~~ | ~~Medienverwaltung + Detailansicht~~ | v608–v622 | - |
| ~~DUP-DETECT~~ | ~~Duplikat-Erkennung + Merge~~ | v628–v683 | - |
| ~~IMPORT-CMP~~ | ~~Datei-Vergleichs- & Merge-Assistent~~ | v673–v682 | - |
| ~~PRINT-OUT~~ | ~~Ahnenliste + Familienbogen~~ | v669 | - |
| ~~CSV-EXPORT~~ | ~~CSV-Export Personen- und Familienliste~~ | v699 | - |
| FAN-COLOR | **Fächer-Chart: Farbe nach Generation** | 6 CSS-Variablen für Generationsstufen statt einheitlich gold; sofort lesbarer; keine Layout-Änderung nötig. | XS |
| ACCESSIBILITY | **Accessibility-Audit + Grundhärtung** | Die App hat 88 `aria-*`-Attribute in index.html — unzureichend für dynamisch gerenderte Listen, Modal-Dialoge, Baum-Navigation. Ziel: WCAG 2.1 AA für die vier häufigsten Flows (Laden, Person suchen, Detailansicht, Baum navigieren). Keine vollständige Screen-Reader-Parität, aber funktionale Tastaturnavigation und korrekte `role`/`aria-label` auf allen interaktiven Elementen. | M |
| ~~LIGHT-MODE~~ | ~~Light-Mode Parity~~ | v700 | - |

---

## P4 — Visuelle Ausgaben *(Wow-Faktor)*

Fundament abgeschlossen: Timeline ✓, Story ✓, Karte ✓, Fächer ✓, Nachkommen-Baum ✓, Animierter Migrationspfad ✓, Diagramm-Export ✓.

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| ~~MAP-ANIM~~ | ~~Karte: animierter Migrationspfad~~ | v603 | - |
| ~~MAP-TOPBAR~~ | ~~Karte als Diagramm in Topbars~~ | v604 | - |
| ~~TL-MULTI~~ | ~~Zeitleiste Mehrpersonen-Modus~~ | v665 | - |
| ~~STORY-OPT~~ | ~~Story: Textqualität (Epochen, OCCU-Merge)~~ | v638–v644 | - |
| ~~STORY-DIAGRAM~~ | ~~Story: Inline-SVG Ahnentafel~~ | v645 | - |
| STORY-FAM | **Story-Mode für Familien** | Familien-Narrative: Eltern + alle Kinder, gemeinsame Ereignisse, Geschwister-Vergleich, Zeitspanne der Familie. HTML-Download + Print-CSS analog Person-Story. Einzigartiges Feature — kein anderes Genealogie-Tool bietet das. | M |
| MAP-HIST-A | **Vintage-Kartenstil** | CSS-Filter (`sepia/brightness/contrast`) auf OSM-Kacheln; Toggle Modern/Historisch im Kartenview; UIState-Persistenz; kein API-Key. | S |
| MAP-HIST-B | **Historischer Kartenhintergrund (Swisstopo)** | Swisstopo Siegfriedkarte (1883–1949, WMTS bestätigt) als Layer + Jahres-Dropdown. Coverage: Schweiz + Grenzregionen (Vorarlberg, Elsass, Baden). Nur sinnvoll nach MAP-HIST-A. | M |
| ONBOARDING | **Onboarding für Erstnutzer** | Landing-Seite erklärt das Konzept, aber kein interaktiver Einführungsflow. Ziel: nach Demo-Load zeigt ein dismissibler Overlay 3–4 Schritte: „Klick auf eine Person", „Öffne den Baum", „Bearbeite ein Ereignis". Einmalig, localStorage-Flag. | S |

---

## P5 — Standards & Interoperabilität

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| ~~TEST-AUTO~~ | ~~Standalone GEDCOM Roundtrip-Tester~~ | `test.html` | - |
| ASSO-EDIT | **ASSO-Beziehungen editierbar** | Nach ASSO-DISP (P2): Person als Zeuge/Pate/Informant zu einem Ereignis zuordnen; `1 ASSO`-Block schreiben + Roundtrip-stabil. ADR erforderlich (Extension auf Event-Level?). | M |
| F6 | **Strict GEDCOM Export** | Alle `_`-Tags entfernen oder auf Standard-Tags mappen; Export-Modus im Einstellungs-Modal. Nötig für Kompatibilität mit strikten Programmen (Ancestry-Import, FamilySearch). ADR + Test erforderlich. | M |
| GRAMPS-EDIT | **GRAMPS-Attribute editierbar** | `_grampsAttrs[]` in Personen-/Familien-Formular anzeigen + editieren; `grampId` sichtbar; keine GRAMPS-spezifischen Felder verlieren beim Roundtrip. | M |
| GRAMPS-RT | **GRAMPS-Writer vollständig + Roundtrip-Test** | `gramps-writer.js` auf Vollständigkeit prüfen; automatisierter Test: GRAMPS laden → exportieren → reimportieren → Delta auf 0. Besonderes Augenmerk: `_TASK`/`_RLOG` (kein GRAMPS-Pendant). | M |
| OBJE-TYPE | **Medien-Typ strukturiert** ⚠ | `m._type` als Vendor-Extension (`2 _TYPE`); ADR erforderlich vor Umsetzung. | S |
| GEDCOM-7-EVAL | **GEDCOM 7.0 Evaluierung** | FamilySearch treibt GEDCOM 7.0 aktiv voran (UTF-8 statt ANSEL, strukturierte Orte, neue Datums-Syntax). Evaluierung: welche Parser/Writer-Änderungen wären nötig, welche Roundtrip-Garantien brechen, welche neuen Features würden möglich. Ergebnis: ADR + Go/No-Go-Entscheidung. | M |

---

## Dokumentation

**Konvention:** Bei jedem Handbuch-Update wird der aktuelle sw-Stand im `HANDBUCH.html`-Deckblatt vermerkt und hier notiert.

**Handbuch-Stand: sw v692** (synchron mit Code-Stand v693 — frisch aktualisiert)

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| ~~DOC-SEARCH-ADV~~ | ~~Handbuch Kap. 11: Erweiterte Suche~~ | v596 | - |
| ~~DOC-STATS~~ | ~~Handbuch: Statistik-Kapitel~~ | v597 | - |
| ~~DOC-TREE-HEAT~~ | ~~Handbuch Kap. 8: Vollständigkeits-Heatmap~~ | v598 | - |
| ~~DOC-MAP-ANIM~~ | ~~Handbuch Kap. 9: Animierter Migrationspfad~~ | v603 | - |
| ~~DOC-MAP-TOPBAR~~ | ~~Handbuch Kap. 9: 🗺-Button~~ | v622 | - |
| ~~DOC-MEDIA-MGR~~ | ~~Handbuch Kap. 18: Medien-Manager~~ | v622 | - |
| ~~DOC-CATCHUP~~ | ~~Handbuch auf sw v692 gebracht~~ | Beziehungsrechner, Import-Compare, Duplikat-Erkennung, Mehrpersonen-Zeitleiste, Komma-Normierung, Symbole | - |
| DOC-REL-CALC | **Handbuch Kap. 4: Beziehungsrechner** | Prüfen ob Verwandtschaft-Zeile, „🔗 zu …"-Button und Pfad-Modal bereits dokumentiert sind; ggf. ergänzen. | S |
| DOC-SCREENS | **Handbuch: echte Screenshots** | Alle Mockups durch echte Screenshots ersetzen. Priorität: Sanduhr-Baum, Fächer, Nachkommen-Baum, Zeitleiste, Karte (alle 3 Modi), Personen-Detail. | M |

---

## Backlog / Forschung

Kein festes Datum. Kandidaten für v9+ oder bei geänderter Priorität.

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| F8 | **Cluster-Ansicht** | Alle Personen in denselben Orten/Quellen wie Person X — Netzwerk-Graph oder Liste. | L |
| F11 | **OCR** | Urkunden-Scan → Text; WASM-Tesseract oder LLM-Backend als Opt-in. | XL |
| COLLAB | **Kollaboratives Editieren** | Konflikt-freies Merge zweier GEDCOM-Dateien. Grundlage: IMPORT-CMP + DUP-DETECT. Erfordert Server oder CRDTs. | XL |
| ES-MODULE | **Echtes ES-Modul-System** | Umstieg von 44 globalen Script-Tags auf `import`/`export`. Würde: Tree-Shaking, explizite Abhängigkeiten, keine Namenskollisionen, Ladezeit-Optimierung. Aufwand enorm (alle Funktionsreferenzen prüfen), Nutzen hoch — Entscheidung erst wenn Codebase stabil ist. | XL |
| BUNDLING | **Bundling für Erstladezeit** | 44 HTTP-Requests ohne SW-Cache (Erststart). esbuild oder Rollup würden auf 3–5 Dateien reduzieren. Bedingt: ES-MODULE oder zumindest IIFE-Bundles. Kein npm-Build-Zwang — esbuild als CLI aufrufbar. | L |
| LLM-STORY | **LLM-gestützte Story-Verbesserung** | Opt-in API-Call (OpenAI/Anthropic) zum Umschreiben des generierten Story-Textes in natürlicheres Deutsch. Privacy: nur anonymisierte Daten senden. | M |

---

## Vergleich mit kommerziellen Tools *(Benchmarks)*

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
| Validierungsregeln | ✅ 21 Regeln | ⚠ | ⚠ | ✅ | ⚠ |
| CSV-Export | ✅ | ✅ | ✅ | ✅ | ✅ |
| DNA-Integration | ❌ | ❌ | ✅ | ❌ | ❌ |
| Multi-User | ❌ | ❌ | ✅ | ❌ | ❌ |
| Datenschutz (lokal-first) | ✅ | ✅ | ❌ | ✅ | ✅ |
| Lebende anonymisieren | ❌ (P0 offen) | ✅ | ⚠ | ✅ | ✅ |
| Kosten | gratis | kostenpflichtig | Abo | gratis | gratis |

**Einzigartige Stärken:** Offline-PWA + Story-Modus + animierter Migrationspfad + GRAMPS-Brücke + Forschungsprotokoll + Mehrpersonen-Zeitleiste + vollständig lokal ohne Datamining.

**Verbleibende Lücken:** GDPR-Anonymisierung, GEDCOM 7.0, editierbare ASSO-Beziehungen, Accessibility.

---

*Aufwand: XS (<1h) · S (1–2h) · M (halber Tag) · L (1–2 Tage) · XL (>2 Tage)*
*Vollständige Sprint-Geschichte inkl. aller abgeschlossenen Items: CHANGELOG.md*
