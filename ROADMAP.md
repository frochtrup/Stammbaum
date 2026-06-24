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

**sw-Version:** v1043 · Cache: `stammbaum-v1043` · `test-unit.js` = **881 Tests** grün · `test-csp.js` grün · `test-snapshot-place.js` grün · GEDCOM Roundtrip `net_delta=0` stabil · GRAMPS stabil · **Pre-Commit-Gate aktiv** (test-csp + test-unit + test-snapshot-place)

**SCALE-TEST:** 20k-GEDCOM Roundtrip net_delta=0 ✅ · Parse 688 ms · Sort-Cache (v899) · Details: SCALE-TEST-BEFUNDE.md

### Letzte Highlights *(vollständige Geschichte: CHANGELOG.md)*

| Version(en) | Feature |
|---|---|
| v1000 | **TREE-CONFLICT:** OneDrive-Baum-Save mit `If-Match`-eTag → 412-Konflikterkennung statt lautlosem last-write-wins. eTag bei Load/Save erfasst (`od_etag`), bei Remote-Änderung Überschreib-/Abbruch-Dialog. GEDCOM + GRAMPS. Schließt die Konflikt-Lücke, die placeObjects schon seit v858 hatten. |
| v999 | **CAM-Schnellzugriff:** direkter 📷-Button im Personen-Detail-Header → öffnet Kamera in 1 Tap (vorher 3). CAM-Basis (📷/🖼, Resize, IDB lokal ohne OneDrive) war bereits seit v59 vorhanden — Review-Korrektur |
| v998 | Zwei Geo-Validierungsregeln für Höfe: `HOF_NO_COORD` + `HOF_FAR` (Haversine, 25 km) |
| v997 | ADR-026 Hof-Notiz single-source: Writer aus Farm-PO-Notiz, `hofObjects`-Sidecar write-frozen |
| v995–v996 | Hof-Koords single-source (Sidecar-Write-Stopp); placeObjects-Reload-Persistenz (T0-STORAGE-Fix) |
| v989–v994 | ADR-026 Phasen 1–2C: Hof→Farm-Migration verdrahtet, scoped Hof-Picker, Enclosure-Kette, Karten-Marker aus Farm-PO |
| v987–v988 | Hof-Notiz vs. RESI-Notiz getrennt via `[Hof]`-Präfix |
| v983–v986 | Projektions-Invariante (ADR-024): `ev.place` = Projektion `_buildFormString(placeId,year)` |
| v975–v982 | Quellen-Integrität: verwaiste Bezüge erkennen/entfernen; Quellen-Selects sortiert; Aufgabe+Quelle-SID |
| v967–v974 | QT-SPLIT (`_qtSaveCustom` 196→75 Z., +22 Tests); Ortsliste-Filter persistent; GEDCOM Byte-Grenze |
| v948–v966 | CSP-Regress-Fix, Pre-Commit-Gate, SHOWPLACE-SPLIT (631→423 Z.), Refaktor-Härtung (`enclosureWinnerAsOf`) |
| v945–v947 | Template-Generator: implizite Defaults, Familien-Dedup, Ortspicker mit placeId |
| v929–v944 | Validator P17/P18; periodengerechte Ortsanzeige; Verwaltungs-Zeitlinie WYSIWYG |
| v911–v917 | OUTPUT-RICHNESS Tier A+B+C: **12 Druckausgaben** (Familienbuch, Nachkommentafel, Stammtafel, Ortssippenbuch, Hofchronik, Zeitstrahl …) |
| v904–v910 | T0-FUNC-SPLIT, CSP-Durchsetzung (`test-csp.js`), A11Y-Audit WCAG 2.1 AA (0 Violations), SCALE-TEST + SORT-CACHE |
| v891–v903 | UI-Logik-Tests T0-UI (+124 Tests), View-Robustheit P0–P6, ADR-025 (`ViewState`, `ui-lifecycle.js`) |
| v796–v858 | PLACE-HIST: placeObjects als Ort-Master, extraPlaces eingefroren, OneDrive-Konflikterkennung (ADR-024) |

**Roundtrip:** GEDCOM net_delta=0, out1===out2 ✓ · GRAMPS xml1===xml2 ✓ · headless automatisiert (`test-roundtrip.js`)

---

## Gesamtbewertung *(Re-Review 2026-06-13, nachgezogen v950/v967/v998)*

> Nüchterne Standortbestimmung. Noten basieren auf direkter Code-Prüfung + Browser-Verifikation. Architektur-Vermessung: 69 JS-Dateien · ~40k LOC · 53 Script-Tags · 84 top-level-Funktionen in `gedcom.js` · 26 ADRs · 558 Unit-Tests.

| Bereich | Note | Kernbefund |
|---|---|---|
| Architektur | **6.9/10** | Saubere Schichtung, 26 ADRs, Passthrough-Fundament. `ViewState` (ADR-025) + `ui-lifecycle.js` schließen PWA-Lifecycle-Lücke. Orts-Speicher auf `placeObjects` konsolidiert. `enclosureWinnerAsOf` — View + Writer rufen dieselbe Funktion. **84 top-level-Funktionen in `gedcom.js`** + 53 `<script>`-Tags bleiben Hauptschuld; Modul-Migration bewusst zurückgestellt (ADR-020). |
| Code-Qualität | **8.0/10** | 1 `console.log` + 1 TODO in 40k LOC. T0-FUNC-SPLIT (v904), SHOWPLACE-SPLIT (v949/v950, 631→423 Z.), QT-SPLIT (v967, 196→75 Z.) haben Monsterfunktionen beseitigt. Verbleibend: `showDetail` 275 Z., `_pdetLifeData` 195 Z. |
| Sicherheit | **8.5/10** | CSP ohne `unsafe-inline/eval`, OAuth PKCE S256, `esc()` pervasiv, `test-csp.js` als Pre-Commit-Gate. Abzug: Refresh-Token in `sessionStorage` (alternativlos ohne Backend, ADR-021). |
| Design / UX | **8.5/10** | Design-Token-System, Mobile-First, 0 WCAG 2.1 AA Violations (v905). Abzug: Handbuch teils Mockups (→ DOC-SCREENS); **UX-Audit 2026-06-20** (Browser-verifiziert) fand 8 konkrete Defekte → eigener UX-AUDIT-Block (Hoch: Aktiv-Tab unsichtbar, `Unknown`-Badge). |
| Funktionsstand | **9.1/10** | Undo/Redo, Karten, Evidenzmodell, GPS-Hypothesen, GED7, GRAMPS, Geocoding, GOV (historisch), **12 Druckausgaben**, **31 Validator-Regeln**, **periodengerechte Ortsanzeige** (v921–v941, einzigartig), **ADR-026 Höfe** (v989–v998). Abzug: 3D-Tree + DNA out-of-scope. |
| Funktions-Qualität | **8.5/10** | GEDCOM/GRAMPS-Treue empirisch top; Browser-verifizierte UI-Flows. Skalierung bis 20k belegt. Abzug: >20k Echtdaten offen (→ SCALE-REAL). |
| Performance | **8.2/10** | Web Worker + virtuelles Scrollen + LAZY-LOAD (−119 KB) + Sort-Cache + dirty-bit. *(2026-06-19: „~50 Cold-Start-Requests"-Abzug entfällt — Produktion auf HTTP/2 gemessen, kein Round-Trip-Problem; Boot-Zeit dominiert vom GEDCOM-Parse.)* Rest-Abzug: erster Sort 20k ~1 s; >20k unbelegt (SCALE-REAL). |
| GEDCOM-Konformität | **9.3/10** | `net_delta=0` + `out1===out2` auf 83k-Zeilen-Produktionsdatei, Strict-5.5.1, GED7 opt-in, GRAMPS headless. |
| Tests | **8.7/10** | 558 Unit-Tests + `test-roundtrip.js` + `test-csp.js` + `test-snapshot-place.js` (Goldfile `showPlaceDetail`). Pre-Commit-Gate koppelt alle drei. Abzug: kein CI-Server; Roundtrip bewusst außerhalb des Hooks. |
| Dokumentation | **8.7/10** | 26 ADRs, ~2.5k-Z.-Changelog. Handbuch auf v998 (beide Versionsfelder). Abzug: Screenshots teils Mockups (→ DOC-SCREENS). |
| PWA / Offline | **9.0/10** | SW: PRECACHE_CRITICAL atomar, Cache-first/Network-first, `offline.html`, `ui-lifecycle.js` BFCache-Guard. |
| Datenschutz | **9.0/10** | Lokal-First, DSGVO-Anonymisierung BFS (v715), kein Tracking, kein Cloud-Zwang. |
| **∅ Gesamt** | **≈ 8.6/10** (Selbst) · **≈ 8.4/10** (unabh. Review 2026-06-19) | *Außergewöhnlich diszipliniertes Solo-Projekt. Kernversprechen empirisch bestätigt. Verlauf: 8.7 (stale) → 8.5 (Re-Review v948) → 8.6 (v950+v967). Unabhängiges Review (`REVIEW-2026-06-19.md`) bestätigt Code/Sicherheit/Konformität, sieht Architektur (6.8) + Design/UX (8.0) tiefer. CAM-Schnellzugriff (v999) erledigt; BUILD-SPIKE nach HTTP/2-Messung verworfen (Architektur 6.5→6.8 + Performance 8.0→8.2 dadurch leicht hoch). Größte Hebel: SCALE-REAL (M) · DOC-SCREENS (M) · GEDCOM-SPLIT (M).* |

### Offene Maßnahmen *(priorisiert — nach unabhängigem Review 2026-06-19, Detail: `REVIEW-2026-06-19.md`)*

> Unabhängiges Review (Code gelesen, Tests selbst ausgeführt): ∅ **≈ 8.4/10** (vs. Selbst 8.6). **Zwei Review-Korrekturen (v999):** (1) CAM war NICHT offen — Kamera-Direkterfassung existiert seit v59, verbleibende Schnellzugriff-Lücke mit v999 geschlossen. (2) **BUILD-SPIKE verworfen** — die Cold-Load-Begründung war ein HTTP/1.1-Mentalmodell, angewandt auf eine **HTTP/2-Produktion** (GitHub Pages, `curl`-verifiziert: HTTP/2 + gzip + ETag). Bei HTTP/2-Multiplexing existiert das „57-Round-Trips"-Problem nicht; gemessener Bundle-Gewinn = wenige ms, für User nicht wahrnehmbar (Boot-Zeit dominiert vom GEDCOM-Parse, nicht vom Script-Laden). Bundling hat zudem **nie** das God-Module gelöst (zweite Verwechslung). Architektur-Schuld bleibt — aber per fortgesetztem manuellem `<script>`-Splitten lösbar, ohne Build-Step.

| Prio | Maßnahme | Befund | Aufwand |
|---|---|---|---|
| 1 | **SCALE-REAL** — Skalierung >20k + Echtdaten-Großbestand | 20k synthetisch belegt; reale Großdatei (50k+) = letzter unbewiesener Stabilitäts-Claim | M |
| 2 | **DOC-SCREENS** — echte Screenshots statt Mockups | Handbuch inhaltlich auf v1000; belegt „einsteigerfreundlich" (Kernziel) und hebt Design/UX-Note. Ersetzen: Sanduhr-Baum, Fächer, Karte (3 Modi), Orts-Steckbrief, Personen-Detail | M |
| 3 | **TREE-AUTOSAVE** — Baum auto-speichern (Convenience) | debounced Auto-Save bei `visibilitychange→hidden` + Idle, Offline-fest, Status-Indikator. **Baut auf TREE-CONFLICT (v1000) auf.** Convenience-Hälfte des früheren ONEDRIVE-AUTO; „manuelles Speichern" ist teils ein Feature (bewusste Commits) → bewusst nachrangig. | M |
| 4 | **GEDCOM-SPLIT** — `gedcom.js` (2.339 Z./96 Fn) manuell entflechten | God-Module per `<script>`-Splitting reduzieren (z. B. Orts-Logik → `places-core.js`). **Kein** Build-Step, kein Bundler nötig — ADR-001/002 bleiben gültig. Ersetzt das verworfene BUILD-SPIKE als Architektur-Hebel. | M |
| 5 | **T0-EXTRAPLACES-CLEANUP** — `stammbaum_extraplaces_*` localStorage entfernen | extraPlaces seit v854 read-only. Schritte: `saveExtraPlaces()`-Call entfernen → `localStorage.removeItem` nach Migration → Helfer löschen. Voraussetzung: alle Geräte einmal mit v854+ gestartet. | S–M |

> **ONEDRIVE-AUTO aufgeteilt (v1000):** Code-Prüfung ergab — Auto-**Load** läuft längst, nur das **Speichern des Baums** war manuell, und zwar **ohne Konfliktschutz** (reines PUT, last-write-wins; placeObjects hatten ihn seit v858, der Baum nicht). Naives Auto-Save hätte den Datenverlust *verschärft*. Daher: Korrektheit zuerst → **TREE-CONFLICT (v1000, ✅ `If-Match`/412)**; Komfort danach → **TREE-AUTOSAVE (#3, offen)**.

---

## UX-Audit 2026-06-20 *(Browser-verifiziert, Mobile 375 px, sw v1000, Demo-Daten)*

> Usability-Durchlauf der Kern-Flows (Baum → Person-Detail → Personen-Liste/Suche → Person anlegen → Orte → Menü). Jeder Befund am laufenden Stand verifiziert (computed styles / Screenshot / DOM). Vier Erstverdächte beim Nachprüfen **verworfen**: „aktiver Tab falsch verdrahtet" (`.active`-Tracking korrekt) · „GRAMPS-Export doppelt im Menü" (zweiter Button ausgeblendet) · **„Dev-Tools im Menü sichtbar"** (Roundtrip-Tests sind `hidden data-debug-only`, nur bei `?debug=1`/`#debug` via `debug-activate.js` — mein DOM-Listing zählte ausgeblendete Buttons mit; **bereits umgesetzt**) · **„interne GEDCOM-IDs sichtbar"** (`@I…@`/Änderungsdatum **gewollt** für Genealogen — wontfix). Trifft die Dimension **Design/UX** (Kernziel „einsteigerfreundlich").

| Prio | ID | Befund | Verifikation | Aufwand |
|---|---|---|---|---|
| **Hoch** | **UX-NAV-ACTIVE** | Aktiver Bottom-Nav-Tab visuell kaum erkennbar: aktiv `rgb(110,78,24)` vs. inaktiv `rgb(107,82,50)` — beides Braun, **kein** Fettdruck/Hintergrund/Balken/Icon-Farbwechsel. Verstößt gegen „nicht nur Farbe" (WCAG 1.4.1). Fix: Akzentfarbe + Top-Balken oder Fettdruck. | computed styles + `::before/::after` geprüft | XS |
| **Hoch** | **UX-I18N-UNKNOWN** | Englisches Typ-Badge `Unknown` im deutschen UI (6 Vorkommen) in der Orte-Liste. → „Unbekannt" oder ausblenden. | DOM-Zählung = 6 | XS |
| ~~**Mittel**~~ ✅ | **UX-WOHNORT-FMT** | ✅ **v1010:** `_localizeGedDate()` (Display-Helper, nutzt `parseGedDate`) → `FROM 1985 TO 2005` → `1985–2005`, `BEF`/`AFT`/`ABT`/`BET`/`CAL`/`EST` ebenfalls lokalisiert. Farm-placeObject-Typ-Check → `ev.addr` wird unterdrückt wenn `placeId`→Farm/Building (architekt. sauber, kein String-Vergleich). | — | — |
| ~~**Mittel**~~ ✅ | **UX-ORTE-DEDUP** | ✅ **v1010:** `_directRef`-Flag in `collectPlaces()` (event-getriebene Einträge), Admin-Filter in `filterPlaces()` (State/Country/District/County + Unknown ohne directRef standardmäßig ausgeblendet), Toggle-Button 🗂 mit Badge-Zähler. Badge „Nicht verknüpft" für 0-Personen-POs ohne directRef. `collectPlaces()` unverändert → alle POs bleiben editierbar via Toggle. | — | — |
| **Mittel** | **UX-DETAIL-SCROLL** | Horizontal scrollende Button-Reihen in Person-Detail (LEBENSDATEN: `Karte/+Alias/+E…`; `+Wohnort/+B…`) am rechten Rand abgeschnitten ohne Scroll-Hinweis → versteckte Aktionen. → Umbruch oder Scroll-Schatten/Chevron. | Screenshot | S |
| Niedrig | **UX-ICON-LABELS** | Reine Icon-Leisten ohne sichtbare Labels: Baum-Topbar (`↓ ⬡ ◠ ⇩ ⟷ 🌐`) + Orte-Toolbar (8 Glyphen). aria-labels vorhanden, visuell kryptisch. → Tooltip/Long-Press-Hint oder Mini-Labels. | Screenshot | M |
| Niedrig | **UX-FAB-OVERLAP** | FAB „+" überlappt das Chevron der letzten Listenzeile (Personen/Orte). → unteres Listen-Padding. | Screenshot | XS |
| Niedrig | **UX-SEARCH-CLEAR** | Suchfeld ohne sichtbaren Lösch-Button (×); Trefferzahl nur in aria-live, visuell unauffällig. | Screenshot + Snapshot | XS |

**Empfohlene Reihenfolge:** Quick-Wins-Bündel **UX-NAV-ACTIVE + UX-I18N-UNKNOWN + UX-FAB-OVERLAP** (zusammen < 1 Tag, je CSS/String) → **UX-WOHNORT-FMT** + **UX-ORTE-DEDUP** (gleicher Orts-/Projektions-Code). Alle GEDCOM-Roundtrip-neutral (reine Anzeige/UI). Positiv bestätigt: fokussierte Bottom-Sheet-Formulare mit Progressive Disclosure, Sofort-Suche + Filter + CSV, alphabetische Gruppierung, Quellen-Badges, Kamera-/Karten-Schnellzugriffe.

---

## Design-Constraint

Alle neuen Features müssen den GEDCOM 5.5.1 Roundtrip (`out1===out2`, `net_delta=0`) stabil halten. Neue Datenstrukturen dürfen beim GEDCOM-Export keinen zusätzlichen Delta erzeugen — entweder als Passthrough oder als bekannte, dokumentierte Abweichung. Jede Abweichung muss explizit in `ARCHITECTURE.md` (ADR) dokumentiert werden.

---

## Architektur & Startup — Lösungsbewertung *(konsolidiert 2026-06-13 · Startup-Teil revidiert 2026-06-19)*

**Befund-Revision (2026-06-19):** Das angenommene zweite Problem — „~50 sequenzielle Script-Requests beim Cold-Load" — ist auf der **Produktion (GitHub Pages = HTTP/2 + gzip + ETag, `curl`-verifiziert)** **kein** relevantes Problem. HTTP/2 multiplext alle 57 JS-Dateien über eine Verbindung; gemessener Bundle-Gewinn = wenige ms, für User nicht wahrnehmbar (Boot-Zeit dominiert vom GEDCOM-Parse). Damit bleibt **nur ein** echtes Architektur-Problem: ~860 Globals + God-Module `gedcom.js`, ESM-Brücken nach 2 Clustern stagniert. Der „Startup"-Bewertungsweg entfällt.

| # | Pfad | Architektur | Startup | Verdikt |
|---|---|---|---|---|
| 1 | Namespace-Hygiene (IIFE) | + | 0 | Backlog |
| 2 | Module Worker | + | 0 | **Mittelfristig** — räumt ADR-020-Blocker (rein Architektur, nicht Startup) |
| 3 | Import Maps | ++ | **–** | **Verworfen** |
| 4 | Hybrid Source + Bundle | ++ | 0 | **Verworfen** — Wartungsfalle, kein Startup-Nutzen auf HTTP/2 |
| 5 | Voll-Bundler (esbuild) | +++ | **0** | **Verworfen (2026-06-19)** — Startup-Nutzen auf HTTP/2 widerlegt; Bundling löst das God-Module ohnehin nicht |
| 6 | Boot-Splitting ohne Bundler | + | + | ✅ **v951 erledigt** (Boot-Loader) |
| 7 | **Manuelles `<script>`-Splitting** (GEDCOM-SPLIT) | ++ | 0 | **Empfohlen** — God-Module entflechten ohne Build-Step, ADR-001/002 intakt |

**Sequenzierung (revidiert):** ✅ Boot-Loader (v951) · 🟡 Pfad 7 GEDCOM-SPLIT (`gedcom.js` manuell entflechten, kein Bundler) · 🟡 Pfad 2 Module Worker (parallelisierbar, räumt ADR-020-Worker-Blocker). **Pfad 5 Bundler verworfen** (HTTP/2-Messung). ADR-001/002 + ADR-020 bleiben gültig. Detail: ARCHITECTURE.md ADR-020.

---

## Abgeschlossene Großprojekte *(alle Details: CHANGELOG.md + ARCHITECTURE.md)*

| Projekt | Abgeschlossen | ADR |
|---|---|---|
| **ADR-026 Höfe** — Höfe als geokodierte Farm-placeObjects, single-source Koord+Notiz, Geo-Validierung | v989–v998 | ADR-026 |
| **OUTPUT-RICHNESS** — 12 Druckausgaben (Familienbuch, Nachkommentafel, Stammtafel, Ortssippenbuch, Hofchronik, Zeitstrahl, Großposter …) | v911–v917 | — |
| **PLACE-HIST / ADR-024** — placeObjects als Ort-Master, periodengerechte UI, Verwaltungs-Zeitlinie, String→PlaceLink, Konflikterkennung | v796–v986 | ADR-024 |
| **View-Robustheit / ADR-025** — iOS-PWA-Lifecycle, `ViewState`, `ui-lifecycle.js`, per-Entität-Scroll-State | v861–v891 | ADR-025 |
| **Forschungstiefe P1–P4** — Dashboard, Evidenzmodell, Kanban, Hypothesen/GPS | v772–v784 | ADR-022/023 |
| **P0 Sicherheitsnetz** — GEDCOM+GRAMPS-Roundtrip headless, 558 Unit-Tests, Pre-Commit-Gate, ESM-Pilot Phase 1+2 | v724–v950 | ADR-020 |
| **T0 Technische Schulden** — CSP-Durchsetzung, T0-FUNC-SPLIT, A11Y-Audit WCAG 2.1 AA, Sort-Cache, Boot-Loader | v744–v951 | ADR-015/021 |

---

## T0 — Restliche technische Schulden

**⛔ Wontfix:** T0-STORAGE `hofObjects`-localStorage (Sidecar-Read-Fallback nach ADR-026 noch nötig, erst nach vollständiger Migration cleanup-fähig) · T0-DRY `_esc`-Konsolidierung (erst nach ADR-020 Phase 3).

**Offen:**

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| **T0-TOPSRC-MERGE** | **`topSources` + `nameCitations` zusammenführen** | `topSources` (INDI-level `1 SOUR`) und `nameCitations` (NAME-level `2 SOUR`) sind strukturell getrennt, obwohl semantisch bedeutungsgleich. Symptom: Formular-Quellen waren im Detail-View verloren (v970-Workaround). Cleanup: ① `nameCitations` im Form-Save nach `topSources` überführen; ② Writer: beide als `1 SOUR`; ③ `nameCitations`-Feld entfernen. Roundtrip-Test nach Schritt ② neu validieren. | M |
| **T0-EXTRAPLACES-CLEANUP** | **`stammbaum_extraplaces_*` localStorage aufräumen** | Seit v854 read-only; Migration via `_migrateExtraPlacesToPlaceObjects` läuft. Schritte: ① `saveExtraPlaces()`-Call aus `savePlace` entfernen; ② nach erfolgreicher Migration `localStorage.removeItem` aufrufen; ③ `loadExtraPlaces/saveExtraPlaces/_extraPlacesKey` + `db.extraPlaces` löschen. Voraussetzung: alle Geräte einmal mit v854+ gestartet. | S |

---

## Offene Feature-Backlog

### P1 — Mobile Feldarbeit

*CAM (Kamera-Integration) ✅ erledigt — Basis seit v59 (📷/🖼, Resize, IDB lokal ohne OneDrive), Schnellzugriff im Detail-Header seit v999.*

### P2 — Forschungsqualität

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| **F3** | **Pedigree-Collapse** | Mehrfach-Vorfahren im Sanduhr-Baum erkennen + zusammenführen; Inzucht-Koeffizient optional. Voraussetzung: BFS-Algorithmus aus REL-CALC nutzen. | M |

### P3 — Performance

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| **SCALE-REAL** | **Skalierung >20k + Echtdaten** | >20k synthetisch belegt; offen: 50k/100k (Speicher, IDB-Quota), realer Großbestand (andere Tag-Verteilung). | M |
| **FAN-COLOR** | **Fächer-Chart: Farbe nach Generation** | 6 CSS-Variablen für Generationsstufen statt einheitlich gold; keine Layout-Änderung. | XS |

### P4 — Visuelle Ausgaben (Backlog)

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| **MAP-HIST-A** | **Vintage-Kartenstil** | CSS-Filter (`sepia/brightness/contrast`) auf OSM-Kacheln; Toggle Modern/Historisch; kein API-Key. | S |
| **MAP-HIST-B** | **Historischer Kartenhintergrund (Swisstopo)** | Swisstopo Siegfriedkarte (WMTS, 1883–1949) als Layer + Jahres-Dropdown. Coverage: Schweiz + Grenzregionen. Nach MAP-HIST-A. | M |

### P5 — Standards & Interoperabilität

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| **OBJE-TYPE** | **Medien-Typ strukturiert** ⚠ | `m._type` als Vendor-Extension (`2 _TYPE`); ADR erforderlich vor Umsetzung. | S |
| **P5b** | **Karten-Zeitschieber im Orte-Tab** | `resolveAsOf(year)` → Marker/Popup nach Jahr; enclosedBy-Layer. | M–L |
| **P5c** | **Pfarrei-Rekonstruktion** | Picker + Ereignis-Tabelle untergeordneter Orte + CSV-Export. | M |
| **P5f** | **Orts-Hypothesen** | `hypo`-Feld via GRAMPS `<url type="_hypo">` + Steckbrief-Badge. | M |

---

## Backlog / Forschung *(v9+ oder bei Trigger)*

| ID | Aufgabe | Aufwand |
|---|---|---|
| **LLM-STORY** | LLM-gestützte Story-Verbesserung (Opt-in, anonymisiert) | M |
| **F8** | Cluster-Ansicht (Netzwerk-Graph: gleiche Orte/Quellen wie Person X) | L |
| **ES-MODULE** | ES-Modul-Migration Phase 3–4 (bewusst zurückgestellt, ADR-020) | XL |
| **BUILD-STEP** | esbuild/Rollup (Trigger: Namespace-Kollisionen oder Boot-Splitting trägt nicht mehr) | XL |
| **F11** | OCR (WASM-Tesseract oder LLM-Backend, Opt-in) | XL |
| **COLLAB** | Kollaboratives Editieren (CRDTs oder Server — bewusst out-of-scope) | XL |

---

## Dokumentation

**Handbuch-Stand: sw v1024 *(stark veraltet — v1025–v1043 nicht dokumentiert)****

User-sichtbare Änderungen seit v1024, die nachzuziehen wären:
- **„Hof-Zuweisungen prüfen"-Modal** (v1030/v1033): Klassen-Badges A/C/D (statt undifferenziert) + klassenspezifische Aktions-Matrix („Quelle schärfen" / „Hof anlegen" / „Variante zum Hof") statt „Ignorieren"-Pfad. Strikt nur Hof-Verdacht (Events mit ADDR), nicht alle PLAC-Lücken.
- **Höfe-Tab** (v1024/v1032): Liste nach Dorf gruppiert (kanonisch via villageId, „Ochtrup" und „Ochtrup, Westfalen" in derselben Sektion). Sortierung numerisch („Wall 33" vor „Wall 100", „Hof 5a" vor „Hof 5b").
- **Personendetail-Ortsfeld** (v1041): bei Hof-Events nur das Dorf in der Ort-Hierarchie — kein Hof-Duplikat zur separaten ADDR-Anzeige mehr.
- **Lade-Toast** (v1031): Orts-Anpassungen + Hof-Zuweisungen + Migrations-Hinweise in einem Mehrzeilen-Toast statt drei sich überschreibende Karten.
- **Hof-Identitäts-Konvention α** (v1034) + ADDR=Village-Redundanz (v1035): Adressbuch-Übernahmen mit Stadt/PLZ/Land werden auf saubere Hof-Bezeichnung extrahiert; redundante ADDR=Ortsname legt keine Pseudo-Höfe an. **Hinweis für User:** Hof-Identität endet beim ersten Komma/Zeilenumbruch der Adresse — wer mehrere distinkte Höfe an derselben Hausnummer modellieren will, nutzt anderen Separator (Klammer, Schrägstrich) oder mehrere addrs-Varianten.
- **PLAC-Hof-Pfade auf hof-relevante Events beschränkt** (v1042): BIRT/DEAT/MARR/BURI/EDUC/GRAD mit rich-PLAC „Schule, Münster" erzeugen keine Pseudo-Höfe mehr. Auto-Hof-Anlage nur bei RESI/PROP/CENS/OCCU oder expliziter ADDR.

**Bewusst ohne Handbuch-Eintrag (intern, kein User-Sichtbarkeits-Effekt):** ADR-024-Konsolidierung in ARCHITECTURE.md, ADR-028 Phasen 1–4 (REPROJECT, Pfade A'/B', Lese-Seite-Chokepoints, Read-Tolerance), `_eventHofId`-Helper, id-keyed `collectPlaces`/`buildHofIndex`, `setDb`-Cache-Invalidation-Fix, `_evFullPlace`-Refactor.

**Beide Versionsfelder im HANDBUCH.html auf v1024.** Update zu sw v1042 würde im Wesentlichen die fünf oben gelisteten User-Bereiche neu beschreiben (Höfe-Tab, Hof-Review, Personendetail, Lade-Toast, Hof-Identitäts-Regeln). — beide Versionsfelder auf v1024. **Dokumentiert (v1020–v1024, ADR-027 P1–5):** Höfe-Liste gruppiert nach Dorf, Adress-Historie im Hof-Detail, „🔗 Hof-Zuweisungen prüfen"-Modal mit Tabelle + Aktionen Hof wählen/+ neu anlegen/Ignorieren, ⚠-Indikator neben Adress-Events im Personen-Detail (Kap. 15). **Noch offen (v999–v1018):** 📷-Schnellzugriff-Button (1-Tap-Kamera) in Kap. 15 (Medien); OneDrive-Konflikt-Hinweis beim Speichern in Kap. 14 (OneDrive); Auto-Reload bei SW-Update (v1019, Kap. 14). Zuletzt dokumentiert: Geo-Validierung HOF_NO_COORD/HOF_FAR (Kap. 7); Hof-Picker + Ort/Hof-Trennung, geräteübergreifende Hof-Koordinaten (Kap. 15). Bewusst ohne Handbuch-Eintrag (intern/transparent): Farm-PO→V2-hofObject-Migration, GEDCOM-Konventions-Erhalt (Pfad A/B), Schema-Refusal-Mechanik, Reverse-Migrator. Offen: echte Screenshots statt Mockups → **DOC-SCREENS** (M).

**DOC-SYNC** *(Pflicht bei jedem sw-Bump)*: Bewertungstabelle + Testanzahl + Priorisierung mitziehen, analog zur CLAUDE.md-Pflicht-Regel.

---

## Vergleich mit etablierten Tools *(faire Einordnung — aktualisiert 2026-06-13)*

| Dimension | Stammbaum PWA | MacFamilyTree | GRAMPS | Ancestry |
|---|---|---|---|---|
| Plattform-Reichweite | **✅ PWA = überall (auch Android/Windows)** | ⚠ Apple-only | Desktop (3 OS) | Web/Abo |
| Offline | ✅ vollständig | ✅ | ✅ | ❌ Cloud-Zwang |
| GEDCOM-Treue (Roundtrip) | **✅ verifiziert `net_delta=0`** | ⚠ verlustbehaftet | ✅ gut | ⚠ verlustbehaftet |
| GEDCOM 7.0 | ⚠ opt-in Export | ⚠ teilw. | ⚠ | ❌ |
| GRAMPS XML | ✅ read+write | ❌ | ✅ nativ | ❌ |
| Quellenverwaltung | ✅ gut (Mehrfachzitate, Evidenzmodell, Templates) | ✅ gut | **✅ exzellent** | ⚠ mittel |
| Forschungsworkflow | **✅ stark (RLOG · Kanban · Projekte · Hypothesen/GPS · Dashboard)** | ⚠ mittel | **✅ exzellent** | ✅ Online-Hints |
| Reports / Bücher / Poster | **✅ sehr gut (12 Formate — v911–v917)** | **✅ exzellent (PDF-Bücher, Großposter)** | ✅ sehr gut | ⚠ mittel |
| Visualisierung | ✅ sehr gut + Story-Modus einzigartig | **✅ exzellent (3D „Virtual Tree")** | ⚠ mittel | ✅ gut |
| Orts-Geocoding / Gazetteer | ✅ Nominatim + GOV (historisch datiert) | **✅ Geocoding + Heatmaps** | ✅ | ✅ |
| Geräte-Sync | ⚠ OneDrive-Datei + Konflikterkennung (Orte v858, **Baum v1000 `If-Match`/412**); Auto-Save offen (TREE-AUTOSAVE) | **✅ nahtlos (CloudKit FamilySync)** | ❌ | ✅ Cloud |
| Karte + Zeitleiste | ✅ (hist. Ereignisse, Mehrpersonen-TL) | ✅ | ⚠ | ⚠ |
| Validierungsregeln | ✅ **31 Regeln**, konfigurierbar | ⚠ | ✅ | ⚠ |
| Historisch datierte Ortsdarstellung | **✅ einzigartig** — periodengerechter Picker, Verwaltungs-Zeitlinie WYSIWYG, ADR-026 Höfe | ⚠ Aktualname | ⚠ Place-Hierarchy ja, Zeitachse nein | ⚠ Aktualname |
| Duplikat-Erkennung + Merge | ✅ (Scoring, Gegenüberstellung) | ✅ | ✅ | ⚠ |
| Verwandtschaftsrechner | ✅ BFS, Cousin-Grade | ✅ | ✅ | ✅ |
| DNA-Integration | ❌ | ❌ | ⚠ Plugin | **✅ Kernfeature** |
| Online-Matching / Records | ❌ | ⚠ FamilySearch | ❌ | **✅ Killer-Feature** |
| Multi-User / Kollaboration | ❌ | ❌ | ❌ | ✅ |
| Skalierung (getestet) | ✅ 20k synthetisch (v899) — >20k/Echtdaten offen | ✅ groß erprobt | ✅ 100k+ | Millionen |
| Datenschutz (lokal-first) | **✅ kein Tracking, kein Cloud-Zwang** | ✅ (CloudKit-Default) | ✅ | ❌ |
| Lebende anonymisieren | ✅ (v715, BFS) | ⚠ | ✅ | ⚠ |
| Reife / Politur | ⚠ Solo-Projekt | **✅ 20-J.-Produkt** | ✅ etabliert | ✅ |
| Kosten | **gratis** | €€ einmalig | gratis | €€€ Abo |

**Einzigartige Stärken:** kostenlose plattformübergreifende Offline-PWA + Story-Modus + GRAMPS-Brücke + DSGVO-Anonymisierung + **verifizierte GEDCOM-Treue** (`net_delta=0`) + GPS-Forschungsprozess + **historisch datierte Ortsdarstellung** (periodengerechter Picker + Verwaltungs-Zeitlinie, einzigartig im Markt) + Höfe als geokodierte Farm-placeObjects + kein Datamining.

**Ehrliche Lücken:** vs. MFT: ① 3D-Tree (out-of-scope) · ② Auto-Save des Baums (→ TREE-AUTOSAVE; Konfliktschutz + Auto-Load existieren, nur der Push ist noch manuell) · ③ Reife (20 Jahre vs. 18 Monate). vs. GRAMPS: professionelle Quellentiefe + 100k+-Skalierung. vs. Ancestry/MyHeritage: DNA + Online-Records — kategoriefremd, bewusst out-of-scope.

---

*Aufwand: XS (<1h) · S (1–2h) · M (halber Tag) · L (1–2 Tage) · XL (>2 Tage)*
*Vollständige Sprint-Geschichte: CHANGELOG.md · Architektur-Entscheidungen: ARCHITECTURE.md*
