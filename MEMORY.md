# Stammbaum PWA — Projekt-Memory

## Projekt-Überblick
- **Was:** Genealogie-Editor als PWA (Multi-File: index.html + JS-Module)
- **Ziel:** iPhone/iPad + Desktop, GEDCOM 5.5.1, kein Server, kein Build-Step
- **Stack:** Vanilla JS, kein Framework, kein npm
- **Pfad:** `/Users/franzdecker/Library/Mobile Documents/com~apple~CloudDocs/Genealogie/AppDev/files/`

## Dateien
- `index.html` — App-Shell: HTML-Struktur + Script-Tags (kein Inline-CSS mehr)
- `offline.html` — Offline-Fallback (self-contained, kein ext. CSS/JS), präcacht in SW PRECACHE
- `styles.css` — alle App-Styles (~2024 Z., ausgelagert aus index.html)
- `gedcom.js` — AppState/UIState Namespaces, Labels, Datum- und PLAC-Helfer, 8 Getter/Setter-Helfer
- `gedcom-parser.js` — `parseGEDCOM()`, `parseGeoCoord()`
- `gedcom-writer.js` — `writeGEDCOM()`, `pushCont()`
- `demo.ged` — Demo-GEDCOM (12 Pers., 6 Fam., 3 Quellen, 4 Medien)
- `storage-file.js` — IDB-Helfer (`idbGet/idbPut/idbDel`), File System Access API (`openFilePicker`, `restoreFileHandle`, `saveToFileHandle`), Export (`exportGEDCOM`, `exportGRAMPS`), Laden (`readFile`, `_processLoadedText`, `_loadGRAMPS`, `openFileOrDir`), Save-Indicator
- `storage.js` — Auto-Load (IDB → localStorage-Fallback), Demo, Backup, `loadExtraPlaces()`; baut auf storage-file.js auf
- `ui-views.js` — gemeinsame Hilfsfunktionen (Labels, Topbar, Scroll-Helpers, Event-Delegation, `evGeoLink()`)
- `ui-views-person.js` — Personen-Detailansicht + Liste
- `ui-views-family.js` — Familien-Detailansicht + Liste
- `ui-views-source.js` — Quellen-Detailansicht + Liste (nur noch Source/Repo-Funktionen)
- `ui-views-place.js` — Orte-Ansicht: `collectPlaces()`, `renderPlaceList()`, `filterPlaces()`, `showPlaceDetail()` etc.
- `ui-views-hof.js` — Höfe-Ansicht: `buildHofIndex()`, `renderHofList()`, `showHofDetail()`, Bewohner-Formular
- `ui-views-tasks.js` — Forschungsaufgaben: `TASK_CATEGORIES`, IDB-Persistenz, Person-Detail-Abschnitt, globale Aufgabenliste, Badge, Modal-Handler; Validierungspanel (`_renderValidationPanel`, `_handleRunValidation`, `_handlePromoteToTask`); eigener Bottom-Nav-Tab (`bnavTasks()`)
- `ui-views-tree.js` — Sanduhr-Baum + Tastaturnavigation; `_navTreeFn()` für modusabhängige Navigation (Sanduhr vs. Nachkommen)
- `gedcom-validator.js` — Validierungsengine: `runValidation(db)` → `[{personId, rule, severity, text, category}]`; 11 Regeln (P1–P7 Person, F1–F4 Familie); reines RAM-Ergebnis, kein GEDCOM-Storage
- `ui-desc-tree.js` — Nachkommen-Baum (top-down SVG): `showDescTree()`, `toggleDescTree()`, `setDescTreeGens()`; T-Linien-Layout; `▼`-Badge; Toggle `⇩`; alle Ehepartner in Reihe mit ⚭-Button (variabler Überlapp); Geschwister horizontal gestapelt links; `½`-Badge für Kinder aus Nebenehe; Klick-Navigation analog Sanduhr
- `ui-fanchart.js` — Fan Chart (SVG)
- `ui-timeline.js` — Zeitleiste: `showTimeline()`, `_renderTlV()` (vertikal Dekaden), `_renderTlH()` (horizontal Swim-Lane 5 Lanes), `_buildPersonEvents()`, `_swimLane()`, `_afterLayout()`; Vollbild, Baumnavigation, Tooltip, Filter-Toggles
- `timeline-hist-events.js` — Historische Ereignisse `_HIST_EVENTS` (71 Einträge 1315–2024); eigenständig editierbar
- `ui-forms.js` — Source-Widget, Media-Helfer, Quelle-Formular, Modals, Gesten, Keyboard, Utils (619 Z.)
- `ui-forms-person.js` — Person-Formular + Extra-Name-Formular (273 Z.)
- `ui-forms-family.js` — Familie-Formular (124 Z.)
- `ui-forms-event.js` — Event-Formular (`_SPECIAL_OBJ` (Alias auf `SPECIAL_EVENT_KEYS`), `_efMedia`, `showEventForm`, `saveEvent`)
- `ui-forms-repo.js` — Archiv-Formular, Picker, Detail-Ansicht
- `ui-media.js` — Medien Add/Edit/Delete/Browser
- `onedrive-auth.js` — OAuth2 PKCE: Login, Logout, Token-Refresh, Callback
- `onedrive-import.js` — Foto-Import-Wizard, Ordner-Browser, Pick-Modus
- `onedrive.js` — Media-URL, Upload, File-I/O, Pfad-Helfer, Settings
- `gramps-parser.js` — `parseGRAMPS(file)` async → db (Phase 2, read-only GRAMPS XML import)
- `gramps-writer.js` — `writeGRAMPS(db)` → gzip Blob (Phase 3); Debug-Funktionen → `debug-gramps.js`
- `debug-gramps.js` — Debug-Tools: `_grampsXMLDebug`, `_grampsMinimalTest`, `_grampsDeepTest`, `_grampsRoundtripTest`; nur bei `?debug=1` geladen
- `leaflet.js` / `leaflet.css` — Leaflet 1.9.4 lokal (kein CDN), für Kartenansicht
- `ui-views-map.js` — Kartenansicht: `initOrRefreshPlaceMap()`, `_buildPlacePersonIndex()`, `switchMapMode()`, `showPersonOnMap()`, `_renderOrteModus()`, `_renderPersonModus()`
- `ui-story.js` — Story-Kern: State, Public API (`showStory`, `printStory`, `downloadStory`), `_loadMediaSrc`, Text-/Kompositions-Helfer, Event-Templates, SVG-Karte, `_getParents`, `window._storyShared`-Bridge
- `ui-story-person.js` — Personen-Story: `_embedPhotosAsync`, alle `_section*`-Funktionen (Header, EarlyLife, Events, Families, Death, Epoch, Reli, Diagram), `_renderStory`, `_storyAsHTML`; registriert sich in `_storyShared`
- `ui-story-fam.js` — Familien-Story: `showFamilyStory`, `_embedFamPhotosAsync`, `_famSection*`, `_renderFamilyStory`, `_famStoryAsHTML`; registriert sich in `_storyShared`
- `sw.js` — Service Worker (Network-first + 4s Timeout, offline, Cache v714)
- `manifest.json` — PWA-Manifest (Icons, standalone)
- `index_v1.2.html` — Archiv: Version 1.2 (Phase 1)
- `README.md` — Schnellstart, Feature-Übersicht, Workflow iPhone↔Mac
- `ARCHITECTURE.md` — ADRs (ADR-001–015), Passthrough-Analyse, Roundtrip-Delta, Speichern-Architektur
- `DATAMODEL.md` — Datenstrukturen (Person/Familie/Quelle/Archiv), JS-Sektionen, globale Variablen
- `UI-DESIGN.md` — HTML-Seitenstruktur, Navigationsmodell, CSS Design-System, Sanduhr-Layout
- `GEDCOM.md` — Parser/Writer-Referenz, alle unterstützten Tags
- `ROADMAP.md` — Phasen-Übersicht, offene Features, bekannte Probleme
- `CHANGELOG.md` — vollständige Sprint-Geschichte v1.0–v8.0-aktiv
- `MEMORY.md` — dieses Dokument
- `.claude/launch.json` — Dev-Server: `python3 -m http.server 8080`

## Aktueller Stand — zuletzt aktualisiert: 2026-05-25

**Version 8.0 aktiv — Branch `v8-dev`**
- **Aktuelle sw-Version: v714** / Cache: `stammbaum-v714`
- Vollständige Phasen-Geschichte: ROADMAP.md + CHANGELOG.md

**Abgeschlossene Sprints (v8-dev, Auswahl — vollständig: CHANGELOG.md):**
- **PERF-1/2 (sw v448–v449):** Debouncing Filter-Inputs + Soundex-Cache
- **CrossMode-CitNotes (sw v450):** `_citExtra[]` `<noteref>`-Einträge → `3 NOTE @grampId@`
- **Dark Mode (sw v452):** `prefers-color-scheme` + `[data-theme]`-Toggle, 3-Stufen-Segment
- **Buchgenerator (sw v453):** `ui-book.js`; Ahnenindex, Biografie, Medien, Namenindex
- **Nachkommen-Baum (sw v462–v470):** `ui-desc-tree.js`; Toggle `⇩`; Gen-Buttons 2–7; T-Linien; `▼`-Badge; alle Ehepartner in Reihe mit ⚭-Button; Geschwister horizontal gestapelt; `½`-Badge für Kinder aus Nebenehe
- **Validierungsengine (sw v463):** `gedcom-validator.js`; 11 Regeln; RAM-only; Befunde manuell als `_task` übernehmbar
- **Aufgaben Bottom-Tab (sw v464–v465):** `bnavTasks()`; Proband über Menü; „✓ Daten prüfen"-Button direkt im Aufgaben-Tab
- **GRAMPS-Orte (sw v471–v475):** placeId-Erhalt im Edit-Pfad; Place-Picker aus `placeObjects` mit Typ-Badge; Hierarchie-Anzeige in Event-Detail
- **OBJE-FIELDS (sw v476):** `p/f/s.media[]` erhalten `note`/`date`/`scbk`/`prim` als dedizierte Felder; Edit-Form: Notiz + Aufnahmedatum
- **VAL-FAM + VAL-CONFIG (sw v496–v497):** `f._tasks[]`; `VAL_RULES`/`VAL_CONFIG_DEFAULTS`; konfigurierbarer `runValidation(db, config)`; `modalValConfig`
- **MAP-MIGR (sw v498):** dritter Karten-Modus „Migrationen"; Epochen-Farben `.map-migr-e0`–`.map-migr-e5`; Farb-Legende
- **ALIA (sw v499):** `p.alia[]` Parser/Writer; symmetrisches Edit; Warn-Row ≈-Label
- **F9 Zeitleiste (sw v501–v540, v591):** `ui-timeline.js` + `timeline-hist-events.js`; View `#v-timeline`; Swim-Lane horizontal (5 Lanes) + vertikal (Dekaden); `_HIST_EVENTS` 71 Einträge; Vollbild-Modus; Filter-Toggles; Lebensspanne-Balken; ab v591 vollwertiges Diagramm mit einheitlicher Topbar-Struktur (s. u.)
- **STORY (sw v549–v560):** `ui-story.js`; View `#v-story`; Fließtext-Erzählung (18 Event-Templates); Hero-Foto + Galerie; Leaflet-Karte mit Bewegungspfad; HTML-Download + Print-CSS
- **STORY-SPLIT (sw v714):** T0-REFACT-3 Phase C: `ui-story.js` (1.530 Z.) → `ui-story.js` (Shared Core ~370 Z.) + `ui-story-person.js` (Personen-Abschnitte ~530 Z.) + `ui-story-fam.js` (Familien-Abschnitte ~330 Z.); `window._storyShared`-Bridge; IIFE-Kapselung bleibt erhalten; `showStory`/`downloadStory` delegieren via Bridge
- **MEDI-CALN (sw v545):** `s.repoCallMedi`; `3 MEDI` unter `2 CALN`; Select im Quellen-Formular
- **SOUR-DATA (sw v546):** `s.dataEvens[]` mit `{evens,date,plac}`; Deckungsbereich im Quellen-Detail + Formular
- **REFN (sw v548):** `refns[]` mit `{val,type}` auf INDI/FAM/SOUR; read-only Detail
- **SAFARI-SWIPE (sw v573):** `history.pushState({app:true},'')` + `popstate`-Listener; verhindert State-Verlust durch Safari-Wischgeste
- **TASK-EXPORT-MD (sw v574):** `exportTasksMd()` in `ui-views-tasks.js`; Button „↓ MD"; pro Person: Name, Geschlecht, Geburt/Tod, Ehen; nach Kategorie; aktiver Filter übernommen
- **Menü-Reihenfolge (sw v575):** „Datei schließen" am Ende; „Einstellungen" hinter Trennstrich
- **SEC-1/SEC-2 (sw v576):** XSS URL-Sanitizer + MIME-Validierung Foto-Upload
- **QUICK-ADD (sw v577):** `modalAdd` → „⚡ Neue Person (Schnell)"; Masseneingabe-Modus (Modal bleibt offen, Quelle+Seite vorbelegt); `_qaLastId` + „Fertig"-Button → `showDetail()`
- **CAM-LINK (sw v578):** 📷-Button im Ereignis-Formular; `<input capture=environment>`; Foto → IDB → `ev.media[]`
- **FORSCH-LOG (sw v582–v585):** `1 _RLOG` unter INDI/FAM; Felder DATE · REPO · SOUR · `_QUERY` · `_RESULT` (found/partial/not-found/pending) · NOTE; globaler Log-Tab im Aufgaben-View; Filter + `exportRlogMd()`; `#modalAddRlog` mit REPO/SOUR-Picker; Ergebnis-Badges
- **SOUR-TMPL (sw v586):** `_SOUR_TEMPLATES` (10 Einträge); Select-Dropdown im Quellen-Formular bei Neuanlage; befüllt ABBR, TITL, AUTH, PUBL, MEDI; Cursor vor `…`
- **VAL-EXTEND (sw v590):** +10 neue Validierungsregeln (EVENT_AFTER_DEATH, CHILD_BEFORE_PARENT, MARR_AFTER_DEATH u. a.); Config-UI automatisch
- **Diagramm-Topbars + Proband-Navigation (sw v591–v595):** einheitliches Topbar-Muster für alle vier Diagramme `[⌂][⤢] | [Diagramm-Wechsel][☰]`; Zeitleiste vollwertiges Diagramm; `tlShowProband()` Action; Familie-Topbar blendet Timeline/Story/Proband-Buttons aus; Person-Detail-Topbar: zwei ⌂-Buttons — `probandBtn` (navigiert zum Probanden) + `probandSetBtn` (`.proband-set-btn`, CSS-Rahmen, setzt/hebt Proband, direkt vor `✎`)

Testdaten: MeineDaten_ancestris.ged — 2811 Personen, 880 Familien, 130 Quellen, 4 Archive (83152 Zeilen)
Testdaten: Unsere Familie.gramps — 2894 Personen, 910 Familien, 138 Quellen, 139 Orte

---

## Roundtrip-Status (stabil seit v4)

`roundtrip_stable=true`, `net_delta=0` — CONC/CONT by design, HEAD-Datum nur bei echtem Speichern.
Passthrough-System (10 Mechanismen) + Reste-Details: `ARCHITECTURE.md` ADR-012.

---

## Architektur-Schlüsselentscheidungen
- Multi-File HTML (ADR-001) · Vanilla JS (ADR-002) · Globales `db` via AppState (ADR-003)
- **IndexedDB** cacht GEDCOM-Text primär; localStorage stiller Fallback (ADR-004) · iOS `accept="*/*"` (ADR-005)
- Desktop Chrome: `showOpenFilePicker()` + `requestPermission({mode:'readwrite'})` (ADR-007)
- BIRT/CHR/DEAT/BURI als Sonder-Objekte via `SPECIAL_EVENT_KEYS` (gedcom.js); `_SPECIAL_OBJ` in ui-forms-event.js ist Alias darauf (ADR-008)
- Globale Bottom-Nav außerhalb Views, z-index 400 (ADR-009) · 6 Tabs
- PLAC-Toggle: `_placeModes[placeId]` = 'free'|'parts' (ADR-010)
- 3-Felder-Datum: `normMonth()`, `writeDatePartToFields()`, `readDatePartFromFields()` (ADR-011)
- Verbatim Passthrough: `_ptDepth`/`_passthrough[]` auf INDI/FAM/SOUR (ADR-012)
- **od_base_path-Architektur** (ADR-013): absoluter OneDrive-Pfad des GED-Ordners (auto via `parentReference.path`); `m.file` relativ dazu
- **CSP ohne `unsafe-inline`** (ADR-015): alle inline styles entfernt; dynamische Werte via `_applyDynStyles()`
- **Geschlecht im Baum**: `data-sex="M/F/U"` Attribut + CSS `border-left` Farbe + `::after`-Symbol ♂/♀; `aria-label` + `title` auf jeder Karte
- **sourceMedia{}**: OBJE unter SOUR-Zitierungen strukturiert
- **IDB-Keys pfad-basiert**: `'img:' + filePath` — index-basierte Keys deprecated
- **`od_filemap` DEPRECATED**: nur noch Legacy-Fallback
- **Bevorzugtes Medium**: `m.prim` / `_PRIM Y` → Hero in Detailansicht
- **Event-Delegation**: `_CLICK_MAP`, `data-action`/`data-change`/`data-input`
- **Offline-Sync-Indikator**: `#sync-indicator` Floating Pill, `updateChangedIndicator()`
- **OneDrive-Startsequenz**: Session-Token → direkt laden; kein Token → Auswahl-Dialog
- **Familien-OBJE**: `f.marr.media[]` mit Feld `titl` (nicht `title`) — NICHT in `f.marr._extra`
- **Baum Tastatur**: `_treeNavTargets{}` pro `showTree()`-Aufruf; `_initTreeKeys()` einmalig
- **Navigation History (unified)**: `_navHistory[]` in UIState — Baum und Detail teilen einen Stack
- **State-Management**: `AppState` (db, currentPersonId, changed…) + `UIState` (_treeScale, _navHistory…) in gedcom.js
- **showToast(msg, type)**: type = 'success'|'error'|'warn'|'info'; typabhängige Dauer
- **Virtuelles Scrollen**: `_VS_ROW=69`, `_VS_BUF=600`, `_VS_MIN=500`, Binary-Search O(log n)
- **Baum Tooltip**: `given`/`surname` → Fallback `name` → `(unbekannt)`; `evGeoLink(lati, long)` in `ui-views.js` zentralisiert
- **Einheitliche Diagramm-Topbar**: alle vier Diagramme (Sanduhr, Fächer, Nachkommen, Zeitleiste) folgen `[⌂ Proband][⤢ Vollbild] | [Diagramm-Wechsel][☰]` (v591)
- **Zwei Proband-Buttons in Person-Detail**: `probandBtn` (plain ⌂, navigiert zum Probanden) + `probandSetBtn` (⌂ mit CSS-Rahmen `.proband-set-btn`, setzt/hebt Proband, steht direkt vor `✎`); Familie-Topbar blendet beide aus (v595)

## IDB-Schlüssel (OneDrive-Ordner)
- `od_base_path`: String — absoluter OneDrive-Pfad des GED-Ordners (auto-abgeleitet)
- `od_photo_folder`: `{ id, name, relPath }` — Foto-Ordner relativ zu od_base_path
- `od_docs_folder`: `{ id, name, relPath }` — Dokumente-Ordner relativ zu od_base_path
- `od_default_folder`, `od_doc_folder`, `od_filemap`, `od_doc_filemap` — **LEGACY/DEPRECATED**

## Version 7 — Schwerpunkte (Branch `v7-dev`, abgeschlossen)

**Strategische Ausrichtung: GRAMPS als Desktop-Master, PWA als iOS-Companion.**
GEDCOM bleibt vollständig erhalten. Austauschformat mit GRAMPS: **GRAMPS XML** (.gramps, gzip + XML).

**Implementiert:** `gramps-parser.js` (Phase 2), `gramps-writer.js` (Phase 3), `db.placeObjects{}`, `db.tags{}`, `db._grampsHandles{}`, `db._sourceFormat`, Statistik-Dashboard, Duplikat-Erkennung, Soundex-Suche (F4), Beziehungsrechner (F2), Sosa/Kekule (F1); alle v7-Backlog-Items in v8-dev weitergeführt

## Offene Architektur-Schulden
- Cmd+Z = "Revert to Saved" (nicht granulares Undo) — Backlog U8
- `showDetail()` + `showFamilyDetail()` noch groß (U20 verworfen; `_pdetLifeData()` extrahiert)
- `sources[]+sourcePages{}` Zitierungen: Mehrfachzitierungen nicht darstellbar → F4b (XL, Backlog)
