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

**sw-Version:** v750 · Cache: `stammbaum-v750`
**Roundtrip GEDCOM:** stabil, net_delta=0, out1===out2 ✓ — *automatisiert* (`test-roundtrip.js`, CI-tauglich)
**Roundtrip GRAMPS:** stabil, xml1===xml2 ✓, Kern-Records (person/family/source/repository) erhalten ✓ — **automatisiert** (T0-TEST-2, sw v750). Note/Citation deduplizieren bewusst (−116 / −782, analog PEDI). In-Browser-Deep-Test (60034 Checks) bleibt ergänzend.
**Testdaten:** MeineDaten_ancestris.ged (2811 Pers.) · Unsere Familie.gramps (2894 Pers.)

### Gesamtbewertung (Mai 2026) — überarbeitet nach unabhängigem Audit (Code/CSP/OAuth/Roundtrip real verifiziert)

> **Methodik-Hinweis:** Diese Tabelle ist eine *nüchterne Standortbestimmung*, kein Verkaufsprospekt. Noten basieren auf direkter Code-Prüfung, nicht auf Doku-Behauptungen. Wo eine Behauptung nicht *automatisiert belegbar* ist (z. B. WCAG-AA, GRAMPS-Roundtrip), ist die Note entsprechend gedeckelt. Die frühere Selbstbewertung (∅ 8.5) war ~0.6 zu optimistisch — sie überschätzte die organisatorische Reife der Architektur und führte die Test-Lücke gar nicht.

| Bereich | Note | Kernbefund |
|---|---|---|
| Architektur | 6.5/10 | Saubere Schichtung + 19 ADRs + Passthrough-Fundament. **Aber:** 762 globale Funktionen / 187 globale Variablen in flachem Namespace; fragile `<script>`-Ladereihenfolge. Fehlendes Modulsystem ist *strukturelle Schuld*, kein Backlog-Item — die „erst wenn stabil"-Bedingung ist längst erfüllt. |
| Code-Qualität | 7.0/10 | Lesbar, kein Overengineering, gute „Warum"-Kommentare mit sw-Regressionsbezug, JSDoc-Typen, 151 `.catch()`. **Abzug:** Monsterfunktionen (`_parseINDILine` 365, `showDetail` 290, `writeINDIRecord` 270 Zeilen); `_esc`/`esc` 4× dupliziert (Folge des fehlenden Modulsystems). |
| Sicherheit | 8.0/10 | **Überdurchschnittlich** für serverlose PWA: CSP ohne `unsafe-inline/eval`, `object-src 'none'`, enge Allowlist; OAuth PKCE S256 + CSRF-`state` + URL-Code-Cleanup lehrbuchhaft; kein `eval` im App-Code. **Restrisiko:** Refresh-Token in `sessionStorage` (XSS-lesbar) — bewusste, ohne Backend alternativlose Wahl, aber als Restrisiko zu führen. |
| Design / UX | 8.5/10 | Hochwertige Ästhetik (Playfair/Source Serif, Dark/Light-Parität), Mobile-First, Onboarding, Skip-Link/ARIA/`prefers-reduced-motion`. **Abzug:** „WCAG 2.1 AA" ist *Selbstzertifizierung ohne axe-Audit*; Handbuch noch mit Mockups statt Screenshots. |
| Funktionsstand | 8.8/10 | Undo/Redo · Karten-Animation · Mehrfachzitate · GED7 · GRAMPS · ASSO-Edit ✓. Lücken bewusst out-of-scope: DNA, Online-Matching, Multi-User. |
| Performance | 8.0/10 | Web Worker + virtuelles Scrollen (O(log n)) + LAZY-LOAD (−119 KB Cold-Start) + SW-Cache. Ohne Bundling ~45 Cold-Start-Requests (durch HTTP/2 + SW gemildert). |
| GEDCOM-Konformität | 9.3/10 | **Real verifiziert:** net_delta=0 + out1===out2 auf 83k-Zeilen-Produktionsdatei, automatisiert. Strict-5.5.1 + GED7-opt-in + GRAMPS-Brücke. GRAMPS-Roundtrip seit v750 ebenfalls automatisiert (T0-TEST-2). *(+0.3)* |
| **Tests** | **7.5/10** | GEDCOM- **und** GRAMPS-Roundtrip automatisiert headless (T0-TEST-2). **T0-UNIT**: `test-unit.js` — 87 dep-freie Unit-Tests: alle 25 Validator-Regeln (je Positiv-/Negativfall), Parser-Edge-Cases (CONC/CONT, lv>4, leere Tags, Passthrough), BFS-Anonymisierung (DSGVO), Datums-Helfer. **Verbleibend:** keine UI-Logik-Tests; eigenes Harness statt Framework. *(+1.0 nach T0-UNIT)* |
| Dokumentation | 9.0/10 | Außergewöhnlich für ein Solo-Projekt (19 ADRs, Datamodel, 151-KB-Changelog). **Abzug:** Selbstbenotung war Marketing; Handbuch-Screenshots offen. |
| PWA / Offline | 9.0/10 | Eines der ernsthaftesten PWA-Designs: PRECACHE_CRITICAL (atomar) + PRECACHE_OPTIONAL (`allSettled`); Network-first + 4s-Timeout. |
| Datenschutz | 8.5/10 | Lokal-First ✓ · DSGVO-Anonymisierung BFS ✓ (v715) · kein Datamining, kein Cloud-Zwang. |
| **∅ Gesamt** | **≈ 8.1/10** | *(Nach Audit 8.5 → 7.9 korrigiert; nach T0-TEST-2 [sw v750] → 8.0; nach T0-UNIT [87 Tests] → 8.1: Tests gesamt +2.0, GEDCOM +0.3. Zwei Disziplinen — GEDCOM/GRAMPS-Treue [verifiziert] und Sicherheitshärtung — auf professionellem Niveau; Modul-Architektur [T0-MODULE] bleibt der nächste Hebel.)* |

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

## Priorisierung nach Audit (Mai 2026)

Der unabhängige Audit hat die Reihenfolge verschoben: **Nicht Features, sondern das Sicherheitsnetz und das Fundament sind jetzt der Engpass.** Begründung — die Codebase ist stabil und funktionsreich (∅ Funktion 8.8), aber ihre *Qualitätssicherung* (Tests 5.5) und ihre *strukturelle Skalierbarkeit* (Architektur 6.5) hinken hinterher. Jedes weitere Feature erhöht das Risiko, das diese beiden Achsen nicht mehr abfedern.

**Reihenfolge:**
1. ✅ **P0 — Test-Sicherheitsnetz** (T0-TEST-2, T0-UNIT): **erledigt** — GEDCOM+GRAMPS-Roundtrip automatisiert + 87 Unit-Tests. Weitere Änderungen jetzt regressionsabgesichert.
2. **P0 — Architektur-Fundament** (T0-MODULE als *Plan + Pilot*, nicht Big-Bang): **nächster Schritt**. Die „erst wenn stabil"-Bedingung ist erfüllt; Aufschub erhöht nur die Migrationskosten.
3. **P1+** — Restliche Schulden + Features wie bisher.

---

## P0 — Sicherheitsnetz & Fundament *(neu priorisiert nach Audit)*

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| ~~T0-TEST-2~~ | ~~**GRAMPS-Roundtrip automatisieren**~~ | ✅ **Abgeschlossen sw v750** — `test-roundtrip.js` um GRAMPS erweitert; **abhängigkeitsfreier** Mini-DOMParser (kein npm, kein `linkedom`) + `_gunzip` (Node `zlib` / JXA `gzip -dc`). Test-Seams `_grampsBuildXMLText()` / `_grampsParseXMLText()` (umgehen gzip/Blob/CompressionStream). Assertion: `xml1===xml2` + Kern-Record-Counts (person/family/source/repository) gegen Original. **Fand sofort einen echten Bug:** Repo-`<type>` wurde in `_extra` durchgereicht *und* hartcodiert erneut geschrieben → wuchs +1 pro Roundtrip; behoben (`_REPO_MODELLED` + `r.rtype`-Erhalt). | ~~M~~ |
| ~~T0-UNIT~~ | ~~**Unit-Tests für Kern-Logik**~~ | ✅ **Abgeschlossen** — `test-unit.js`, 87 dep-freie Tests (JXA/Node), CI-Exit-Code: (a) Parser-Edge-Cases (CONC/CONT, lv>4, leere Tags, Passthrough), (b) alle 25 Validator-Regeln je Positiv-/Negativfall, (c) BFS-Anonymisierung `_buildLivingSet` (6 DSGVO-Fälle inkl. „toter Vorfahr bleibt tot"), (d) Datums-Helfer (`normMonth`, `buildGedDate`, `readDatePartFromFields`, `buildGedDateFromFields` via konfigurierbarem `document`-Stub). | ~~M~~ |
| **T0-MODULE** | **ES-Modul-Migration — Plan + Pilot** | *Nicht* sofort vollständig migrieren. Stattdessen: ADR-020 mit Migrationsstrategie schreiben + **einen** klar abgegrenzten Cluster (z. B. GRAMPS-Parser/Writer) als `import/export`-Pilot umstellen, um Aufwand/Risiko real zu messen. Beseitigt schrittweise die 762-globale-Funktionen-Schuld. Voraussetzung-Entkopplung von BUNDLING. | **L (Plan: M)** |

---

## T0 — Restliche technische Schulden

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| ~~T0-SW~~ | ~~**SW Install-Robustness**~~ | ✅ **Abgeschlossen sw v743** — `PRECACHE_CRITICAL` (atomar) + `PRECACHE_OPTIONAL` via `Promise.allSettled()` | ~~XS~~ |
| ~~T0-XSS~~ | ~~**innerHTML-Audit**~~ | ✅ **Abgeschlossen sw v744** — alle 166 `innerHTML`-Assignments auditiert; kein echter XSS-Vektor; `esc()` konsequent. | ~~S~~ |
| **T0-TOKEN** | **Refresh-Token-Restrisiko dokumentieren** | OAuth-Refresh-Token liegt in `sessionStorage` (XSS-lesbar). Ohne Backend alternativlos, aber bewusst zu führen: als ADR festhalten; prüfen ob Token-Scope (`Files.ReadWrite`) auf `Files.ReadWrite.AppFolder` einschränkbar ist (Schadensbegrenzung bei Kompromittierung). | **S** |
| **T0-STORAGE** | **localStorage / IDB-Strategie Phase 3** | `stammbaum_extraplaces_*` + `stammbaum_hofobjects` (4 Calls in `ui-forms.js`) → async IDB; `loadExtraPlaces()`/`loadHofObjects()` + `await` im Ladepfad nötig. | **S** |
| **T0-DRY** | **`_esc`/`esc`-Duplikat + Monsterfunktionen** | `esc`/`_esc` 4× definiert (gedcom.js, gramps-writer.js, ui-timeline.js, ui-story.js) → nach T0-MODULE konsolidieren. `showDetail` (290 Z.) in Teilrenderer zerlegen. Niedrige Priorität, aber bei Modul-Migration mitnehmen. | **S** |
| ~~T0-TEST~~ | ~~**Roundtrip-Test-Automation (GEDCOM)**~~ | ✅ **Abgeschlossen sw v746** — `test-roundtrip.js`: Node ohne Deps (`vm.runInContext`); `net_delta=0` + `out1===out2`; CI-Exit-Code. *(GRAMPS-Teil → T0-TEST-2)* | ~~M~~ |

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
| ~~ONBOARDING~~ | ~~**Onboarding für Erstnutzer**~~ | ✅ **Abgeschlossen sw v748** — Spotlight-Overlay, 4 Schritte (Personenliste, Baum-Button, FAB, eigene Datei laden). Einmalig nach Demo-Load, localStorage-Flag `stammbaum_onboarding_done`. `ui-onboarding.js` neu. | ~~S~~ |
| F3 | **Pedigree-Collapse** | Mehrfach-Vorfahren im Sanduhr-Baum erkennen + visuell zusammenführen; Inzucht-Koeffizient optional. Voraussetzung: BFS-Algorithmus aus REL-CALC nutzen. | M |

---

## P3 — Desktop-Auswertung & Performance

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| **FAN-COLOR** | **Fächer-Chart: Farbe nach Generation** | 6 CSS-Variablen für Generationsstufen statt einheitlich gold; keine Layout-Änderung nötig. | **XS** |
| ~~CSS-PURGE~~ | ~~**CSS aufräumen**~~ | ✅ **Abgeschlossen sw v745** — 796 CSS-Klassen gegen index.html + *.js geprüft; 21 tote Klassen entfernt (17 ungenuzte Utility-Klassen + `src-tag-x`, `tpl-btn`, `btn-gold-text`, `c-red`); Leaflet-Overrides + dynamisch gebaute Klassen (`tl-pc${idx}` etc.) korrekt behalten. 3416 → 3385 Zeilen (−31). | ~~S~~ |
| ~~LAZY-LOAD~~ | ~~**Lazy-Loading optionaler Module**~~ | ✅ **Abgeschlossen sw v747** — `lazy-loader.js` (`_lazyScript`/`_lazyScripts`). 5 Dateien (~119 KB) aus Cold-Start entfernt: `ui-book.js` + `ui-print.js` (Buch/Druck), `ui-dedup.js` (Dedup), `ui-import-compare.js` + `compare-engine.js` (Datei-Vergleich). Entry-Points in `ui-event-delegation.js` gewrappt. PRECACHE_OPTIONAL im SW. OneDrive-Gruppe skip (tief integriert). | ~~M~~ |
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
| ~~F6~~ | ~~**Strict GEDCOM Export**~~ | ✅ Abgeschlossen sw v749 — `_strictGed`-Flag + `_ptLines()` in `gedcom-writer.js`; alle `_`-Tags entfernt oder gemappt (`_UID`→`REFN TYPE UID`, `_RUFNAME`→`NICK`, `_TRAN`→`NOTE`, `_FREL/_MREL`→`PEDI`); Toggle in modalSettings; Suffix `_strict.ged`; ADR-019; Strict-Roundtrip-Test stabil. | ~~M~~ |
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

**Handbuch-Stand: sw v749** *(aktuell — v750 nur Test-Automation + interner GRAMPS-Roundtrip-Fix, nicht handbuchrelevant)*

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
| ES-MODULE | **Vollständige ES-Modul-Migration** | Kompletter Umstieg aller ~50 globalen Script-Tags auf `import`/`export`. Voraussetzung für BUNDLING. **→ jetzt als P0-Pilot `T0-MODULE` gestartet** (Plan + 1 Cluster zuerst, statt Big-Bang); vollständige Migration bleibt im Backlog bis Pilot-Erkenntnisse vorliegen. | XL |

---

## Vergleich mit etablierten Tools *(faire Einordnung — Stärken der Konkurrenz benannt)*

> Frühere Version dieser Tabelle war parteiisch (sich selbst durchgehend ✅, Konkurrenz ⚠). Hier ehrlicher: wo etabliert Tools führen, steht es da.

| Dimension | Stammbaum PWA | MacFamilyTree | GRAMPS | Ancestry |
|---|---|---|---|---|
| Plattform-Reichweite | **✅ PWA = überall** | Apple-only | Desktop | Web/Abo |
| Offline | ✅ vollständig | ✅ | ✅ | ❌ Cloud-Zwang |
| GEDCOM-Treue | **✅ exzellent (verifiziert net_delta=0)** | ✅ gut | ✅ gut | ⚠ verlustbehaftet |
| GEDCOM 7.0 | ⚠ opt-in Export | ⚠ | ⚠ | ❌ |
| GRAMPS XML | ✅ read+write | ❌ | ✅ nativ | ❌ |
| Quellenverwaltung | ✅ gut (Mehrfachzitate, Templates) | ✅ sehr gut | **✅ exzellent (quellenzentriert)** | ⚠ mittel |
| Reports / Bücher | ⚠ HTML/Print | **✅ exzellent (PDF-Bücher)** | ✅ sehr gut | ⚠ mittel |
| Visualisierung | ✅ sehr gut + Story einzigartig | **✅ exzellent (3D/VR)** | ⚠ mittel | ✅ gut |
| Forschungsworkflow | ✅ gut (RLOG, Tasks, Dedup) | ⚠ mittel | **✅ exzellent** | ✅ Online-Hints stark |
| Karte + Zeitleiste | ✅ (hist. Ereignisse) | ✅ | ⚠ | ⚠ |
| Validierungsregeln | ✅ 25 Regeln | ⚠ | ✅ | ⚠ |
| Duplikat-Erkennung + Merge | ✅ | ✅ | ✅ | ⚠ |
| DNA-Integration | ❌ | ❌ | ⚠ Plugin | **✅ Kernfeature** |
| Online-Matching / Records | ❌ | ⚠ | ❌ | **✅ Killer-Feature** |
| Multi-User / Kollaboration | ❌ | ❌ | ❌ | ✅ |
| Datenschutz (lokal-first) | **✅ kein Tracking** | ✅ | ✅ | ❌ |
| Lebende anonymisieren | ✅ (v715, BFS) | ✅ | ✅ | ⚠ |
| Kosten | **gratis** | €€ einmalig | gratis | €€€ Abo |

**Einzigartige Stärken (real konkurrenzlos):** kostenlose plattformübergreifende Offline-PWA + Story-Modus + GRAMPS-Brücke + DSGVO-Anonymisierung + verifizierte GEDCOM-Treue + kein Datamining. Für die Zielgruppe (mobil + Desktop, datenschutzbewusst) besetzt das eine Nische, die kein kommerzielles Tool exakt abdeckt.

**Ehrliche Lücken vs. Konkurrenz:**
- vs. **MacFamilyTree:** reichhaltige PDF-Buch-Reports, 3D/VR-Visualisierung.
- vs. **GRAMPS:** Tiefe im professionellen Quellen-/Forschungsworkflow.
- vs. **Ancestry:** DNA + Online-Matching + Milliarden Records — *kategoriefremd und bewusst out-of-scope* (eine lokale App kann das prinzipbedingt nicht liefern und will es laut Zielbild nicht).

*Keine größeren offenen **Standards**-Lücken mehr (GEDCOM/GRAMPS abgedeckt). Die Lücken liegen bei Ausgabe-Reichtum (Bücher) und bei netzwerk-/datenbankgebundenen Features — Letztere sind Designziel, kein Defizit.*

---

*Aufwand: XS (<1h) · S (1–2h) · M (halber Tag) · L (1–2 Tage) · XL (>2 Tage)*
*Vollständige Sprint-Geschichte inkl. aller abgeschlossenen Items: CHANGELOG.md*
