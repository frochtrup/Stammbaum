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
- `ui-views-tasks.js` — Forschungsaufgaben: `TASK_CATEGORIES`, IDB-Persistenz, Person-Detail-Abschnitt, globale Aufgabenliste, Badge, Modal-Handler
- `ui-views-tree.js` — Sanduhr-Baum + Tastaturnavigation
- `ui-fanchart.js` — Fan Chart (SVG)
- `ui-forms.js` — Formulare Person/Familie/Quelle + Source-Widget + Modal/Keyboard/Utils
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
- `sw.js` — Service Worker (Network-first + 4s Timeout, offline, Cache v378)
- `manifest.json` — PWA-Manifest (Icons, standalone)
- `index_v1.2.html` — Archiv: Version 1.2 (Phase 1)
- `README.md` — Schnellstart, Feature-Übersicht, Workflow iPhone↔Mac
- `ARCHITECTURE.md` — ADRs (ADR-001–015), Passthrough-Analyse, Roundtrip-Delta, Speichern-Architektur
- `DATAMODEL.md` — Datenstrukturen (Person/Familie/Quelle/Archiv), JS-Sektionen, globale Variablen
- `UI-DESIGN.md` — HTML-Seitenstruktur, Navigationsmodell, CSS Design-System, Sanduhr-Layout
- `GEDCOM.md` — Parser/Writer-Referenz, alle unterstützten Tags
- `ROADMAP.md` — Phasen-Übersicht, offene Features, bekannte Probleme
- `CHANGELOG.md` — vollständige Sprint-Geschichte v1.0–v6.0-dev
- `MEMORY.md` — dieses Dokument
- `.claude/launch.json` — Dev-Server: `python3 -m http.server 8080`

## Aktueller Stand — zuletzt aktualisiert: 2026-05-10

**Version 7.0 in Entwicklung — Branch `v7-dev`** (v4–v6 abgeschlossen auf `main`)
- **Aktuelle sw-Version: v378** / Cache: `stammbaum-v378`
- Vollständige Phasen-Geschichte: ROADMAP.md + CHANGELOG.md

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

## IDB-Schlüssel (OneDrive-Ordner)
- `od_base_path`: String — absoluter OneDrive-Pfad des GED-Ordners (auto-abgeleitet)
- `od_photo_folder`: `{ id, name, relPath }` — Foto-Ordner relativ zu od_base_path
- `od_docs_folder`: `{ id, name, relPath }` — Dokumente-Ordner relativ zu od_base_path
- `od_default_folder`, `od_doc_folder`, `od_filemap`, `od_doc_filemap` — **LEGACY/DEPRECATED**

## Version 7 — Schwerpunkte (Branch `v7-dev`)

**Strategische Ausrichtung: GRAMPS als Desktop-Master, PWA als iOS-Companion.**
GEDCOM bleibt vollständig erhalten. Austauschformat mit GRAMPS: **GRAMPS XML** (.gramps, gzip + XML).

**Implementiert:** `gramps-parser.js` (Phase 2), `gramps-writer.js` (Phase 3), `db.placeObjects{}`, `db.tags{}`, `db._grampsHandles{}`, `db._sourceFormat`, Statistik-Dashboard, Duplikat-Erkennung, Soundex-Suche (F4), Beziehungsrechner (F2), Sosa/Kekule (F1)

**Noch offen (Priorität laut ROADMAP.md):**
- P1: F5 Lebende-Anonymisierung, F6 Strict GEDCOM, GRAMPS-Badge, Tags-Badges
- P2: Dark Mode, F3 Pedigree-Collapse, GRAMPS Orts-Picker + Editierbarkeit
- Backlog: Nachkommen-Baum, Zeitleiste, Cmd+Z granular, F4b Mehrfach-Zitierungen

## Offene Architektur-Schulden
- Cmd+Z = "Revert to Saved" (nicht granulares Undo) — Backlog U8
- `showDetail()` 344 Z. + `showFamilyDetail()` 235 Z. — God-Functions → U20
- `sources[]+sourcePages{}` Zitierungen: Mehrfachzitierungen nicht darstellbar → F4b (XL, Backlog)
