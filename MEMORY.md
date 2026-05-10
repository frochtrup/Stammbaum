# Stammbaum PWA — Projekt-Memory

## Projekt-Überblick
- **Was:** Genealogie-Editor als PWA (Multi-File: index.html + JS-Module)
- **Ziel:** iPhone/iPad + Desktop, GEDCOM 5.5.1, kein Server, kein Build-Step
- **Stack:** Vanilla JS, kein Framework, kein npm
- **Pfad:** `/Users/franzdecker/Library/Mobile Documents/com~apple~CloudDocs/Genealogie/AppDev/files/`

## Dateien
- `index.html` — App-Shell: HTML-Struktur + Script-Tags (kein Inline-CSS mehr)
- `offline.html` — Offline-Fallback (self-contained, kein ext. CSS/JS), präcacht in SW PRECACHE
- `styles.css` — alle App-Styles (~795 Z., ausgelagert aus index.html)
- `gedcom.js` — AppState/UIState Namespaces, Labels, Datum- und PLAC-Helfer, 8 Getter/Setter-Helfer
- `gedcom-parser.js` — `parseGEDCOM()`, `parseGeoCoord()`
- `gedcom-writer.js` — `writeGEDCOM()`, `pushCont()`
- `demo.ged` — Demo-GEDCOM (12 Pers., 6 Fam., 3 Quellen, 4 Medien)
- `storage.js` — IndexedDB, Dateiverwaltung, Auto-Load
- `ui-views.js` — gemeinsame Hilfsfunktionen (Labels, Topbar, Scroll-Helpers, Event-Delegation)
- `ui-views-person.js` — Personen-Detailansicht + Liste
- `ui-views-family.js` — Familien-Detailansicht + Liste
- `ui-views-source.js` — Quellen-Detailansicht + Liste (nur noch Source/Repo-Funktionen)
- `ui-views-place.js` — Orte-Ansicht: `collectPlaces()`, `renderPlaceList()`, `filterPlaces()`, `showPlaceDetail()` etc.
- `ui-views-hof.js` — Höfe-Ansicht: `buildHofIndex()`, `renderHofList()`, `showHofDetail()`, Bewohner-Formular
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
- `sw.js` — Service Worker (Network-first + 4s Timeout, offline, Cache v244)
- `manifest.json` — PWA-Manifest (Icons, standalone)
- `index_v1.2.html` — Archiv: Version 1.2 (Phase 1)
- `README.md` — Schnellstart, Feature-Übersicht, Workflow iPhone↔Mac
- `ARCHITECTURE.md` — ADRs (ADR-001–013), Passthrough-Analyse, Roundtrip-Delta, Speichern-Architektur
- `DATAMODEL.md` — Datenstrukturen (Person/Familie/Quelle/Archiv), JS-Sektionen, globale Variablen
- `UI-DESIGN.md` — HTML-Seitenstruktur, Navigationsmodell, CSS Design-System, Sanduhr-Layout
- `GEDCOM.md` — Parser/Writer-Referenz, alle unterstützten Tags
- `ROADMAP.md` — Phasen-Übersicht, offene Features, bekannte Probleme
- `CHANGELOG.md` — vollständige Sprint-Geschichte v1.0–v6.0-dev
- `MEMORY.md` — dieses Dokument (auch unter `.claude/projects/.../memory/MEMORY.md`)
- `.claude/launch.json` — Dev-Server: `python3 -m http.server 8080`

## Aktueller Stand — zuletzt aktualisiert: 2026-04-15

**Version 4.0 abgeschlossen — auf `main` gemergt (2026-03-30)**
**Version 5.0 abgeschlossen — auf `main` gemergt (2026-04-05)**
**Version 6.0 abgeschlossen — Branch `v6-dev` (2026-04-10)**
**Version 7.0 in Entwicklung — Branch `v7-dev`**

- **Phase 1 abgeschlossen (sw v190):** detectGRAMPS(), grampId-Felder, _grampsMaster-Flag
- **Phase 2 abgeschlossen (sw v191–v196):** gramps-parser.js — nativer GRAMPS XML Import
- **Phase 3 abgeschlossen (sw v193–v204):** gramps-writer.js — verlustfreier Roundtrip + GRAMPS Desktop-kompatibel
  - 60034 Deep-Test-Checks ✓ — Personen, Familien, Quellen, Orte, Attribute, childref frel/mrel, Handles, Source-Medien
  - gender `M`/`F`/`U` (GRAMPS 6.x erwartet einbuchstabig, nicht `male`/`female`/`unknown`)
  - GRAMPS Desktop Import bestätigt: gender korrekt, Medienlinks korrekt
- **GEDCOM-Roundtrip-Fixes (sw v208–v220):**
  - v208: GED→GRAMPS Orts-Hierarchie + Typ aus placForm
  - v209: FAM CHIL-Quellenrefs schreiben
  - v210: @@-Normalisierung false positives eliminiert
  - v211: GRAMPS Ort-Leerteile bei direkter Positionszuordnung
  - v212: GEDCOM Parser lv>4 Fehler-Log bei Passthrough-Block unterdrückt
  - v219: SOUR TEXT `_textSeen`-Flag; FAMC frelPage/frelQUAY Copy-Loop fix
  - v220: `lastSourVal` @@-Normalisierung (sourPages/sourQUAY-Keys = sourIds-Keys)
- **RESI-Adress-Autocomplete (sw v224):** `collectAddresses()` in ui-forms-event.js; `initAddrAutocomplete()` + `_addrToPlace()` — bei Auswahl wird PLAC-Feld auto-befüllt
- **Höfe-Ansicht (sw v224–v228):** Toggle Orte|Höfe im Orte-Tab; `ui-views-hof.js` + `ui-views-place.js` als neue Dateien; `buildHofIndex()` gruppiert RESI nach `ev.addr`; `showHofDetail()` zeigt alle Bewohner
- **Bewohner-Formular (sw v227–v228):** Inline-Formular in Hof-Detail: Person-Picker, vollständiges Datum (Qualifier + TT/Mon/JJJJ + BET-Bereich), Ort (mit Autocomplete + Vorbelegung via `_addrToPlace`), Quelle/Seite/QUAY → erzeugt RESI-Event bei Person
- **Architektur-Cleanup (sw v224):** Place-Funktionen aus `ui-views-source.js` ausgelagert nach `ui-views-place.js`; Hof-Funktionen in eigenem `ui-views-hof.js`
- **P4 Code-Qualität (sw v233):** DEV-Diagnose entfernt; Debug-Funktionen → `debug-gramps.js` (?debug=1); `noteTextInline` entfernt (Single source of truth: `noteText`); `_SPECIAL_LBL` entfernt → `EVENT_LABELS`; `_SPECIAL_OBJ` → Alias auf `SPECIAL_EVENT_KEYS` (gedcom.js)
- **compactPlace() (sw v236):** `gedcom.js`; leere Komma-Segmente in Ortsstrings für Darstellung ausblenden (`", Ochtrup, , , NRW, "` → `"Ochtrup, NRW"`); Ortsliste sortiert nach kompaktem Namen; Formulare unverändert
- **Notizen-Modal (sw v238–v242):** `modalNote` Bottom-Sheet; `openNoteModal(type, id)` / `saveNoteModal()` in `ui-views.js`; ersetzt Inline-Textarea-Ansatz; zeigt eigene Notiz + alle noteRefs editierbar; `_noteRefUsers(ref)` zeigt referenzierende Personen/Familien; "× Entfernen" löscht noteRef-Verknüpfung; `_pruneOrphanNotes()` löscht verwaiste db.notes-Einträge wenn letzte Referenz entfernt wird
- **Quellen-Notizen (sw v237):** `showSourceDetail` zeigt Notizen-Sektion mit `openNoteModal('source', id)`; `s.text` als Notizfeld
- **Kartenansicht (sw v244):** Leaflet 1.9.4 lokal; Toggle "Orte|Höfe|Karte" im Orte-Tab; `ui-views-map.js`; Modus 1 "Alle Orte" — CircleMarker nach Personenzahl + Exploration-Panel (Bottom-Sheet); Modus 2 "Personenbiografie" — nummerierte Stationen + Verbindungslinie; Person-Picker; "📍 Karte" Button in Personen-Detail; CSP um OSM-Tiles erweitert
- **Aktuelle sw-Version: v370** / Cache: `stammbaum-v370`
- Git: Branch `v7-dev`

*(Detaillierte Session-Geschichte ab v245 in CHANGELOG.md — diese Datei ist veraltet; aktuelle Kopie: `.claude/projects/.../memory/MEMORY.md`)*

Testdaten: MeineDaten_ancestris.ged — 2811 Personen, 880 Familien, 130 Quellen, 4 Archive (83152 Zeilen)
Testdaten: Unsere Familie.gramps — 2894 Personen, 910 Familien, 138 Quellen, 139 Orte

---

## Roundtrip-Status (stabil seit v4)

`roundtrip_stable=true`, `net_delta=0` — alle tag-counts ✓, TIME-stabil (out1===out2).
Verbliebene Deltas (by design, kein Datenverlust):
- CONC/CONT-Neuformatierung: CONC -35, CONT -26, TEXT -1 — SOUR TEXT-Werte werden bei Parse zusammengeführt (CONC-Werte konkateniert), beim Schreiben mit pushCont neu gesplittet. Wenn Gesamtlänge < 248 Zeichen, kein CONC nötig → orig-Zeilen fehlen im out1, aber Inhalt identisch.
- HEAD-Datum nur bei echtem Speichern (`updateHeadDate=true`).

**Passthrough-Mechanismen (10 Stück):**
`_passthrough[]` · `ev._extra[]` · `addrExtra[]` · `frelSourExtra[]`/`mrelSourExtra[]` · `sourceExtra{}` · `topSourceExtra{}` · `media._extra[]` · `childRelations.sourExtra{}` · `extraRecords[]` · `sourceMedia{}`/`sourMedia{}`

**Passthrough-Reste (akzeptiert, kein Datenverlust):**
- `INDI.sourceExtra`: 2 Eintr. (EVEN, OBJE)
- `FAM.marr._extra`: 1 Z. (EVEN)
- `FAM.childRel.extra`: 44 Eintr. (SOUR/QUAY/PAGE/OBJE…)
- `SOUR._passthrough`: 2 SOURs (REFN, NOTE, CONT)
- `NOTE._passthrough`: 1 NOTE (REFN, _VALID)
- `extraRecords`: 2 (SUBM, OBJE)

**Nicht editierbar (v6-Kandidaten):**
- CENS, CONF, FCOM, ORDN, RETI, PROP, WILL, PROB → nicht als events[] strukturiert
- Mehrere inline INDI-Notes → konkateniert

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
- **od_base_path-Architektur** (ADR-013, sw v110/v111): absoluter OneDrive-Pfad des GED-Ordners (auto via `parentReference.path`); `m.file` relativ dazu
- **Geschlecht im Baum**: `data-sex="M/F/U"` Attribut + CSS `border-left` Farbe
- **sourceMedia{}**: OBJE unter SOUR-Zitierungen strukturiert (v4-dev sw v45)
- **IDB-Keys pfad-basiert**: `'img:' + filePath` (sw v105) — index-basierte Keys deprecated
- **`od_filemap` DEPRECATED** (sw v99): nur noch Legacy-Fallback
- **Bevorzugtes Medium**: `m.prim` / `_PRIM Y` → Hero in Detailansicht (sw v96)
- **Event-Delegation**: `_CLICK_MAP` (31 Aktionen), `data-action`/`data-change`/`data-input` (sw v137; +`switchMapMode`/`closeMapPanel`/`showPersonOnMap` sw v244)
- **Kartenansicht**: `_placePersonIndex{}` (Ort→Personen-Cache), `invalidatePlacePersonIndex()` nach Datenänderung; Leaflet lokal; `#map-leaflet` als Leaflet-Ziel (nicht `#mapContainer`!)
- **Offline-Sync-Indikator**: `#sync-indicator` Floating Pill, `updateChangedIndicator()` (sw v152)
- **OneDrive-Startsequenz**: Session-Token → direkt laden; kein Token → Auswahl-Dialog (sw v151)
- **Familien-OBJE**: `f.marr.media[]` mit Feld `titl` (nicht `title`) — NICHT in `f.marr._extra`
- **Baum Tastatur**: `_treeNavTargets{}` pro `showTree()`-Aufruf; `_initTreeKeys()` einmalig
- **Baum History**: `_treeHistory[]` + `_treeHistoryPos`; `←` ruft `treeNavBack()` auf
- **State-Management**: `AppState` (db, currentPersonId, changed…) + `UIState` (_treeScale, _treeHistory…) in gedcom.js
- **Virtuelles Scrollen**: `_VS_ROW=69`, `_VS_BUF=600`, `_VS_MIN=500`, Binary-Search O(log n) (sw v145/v146)

## IDB-Schlüssel (OneDrive-Ordner)
- `od_base_path`: String — absoluter OneDrive-Pfad des GED-Ordners (sw v110/v111, auto-abgeleitet)
- `od_photo_folder`: `{ id, name, relPath }` — Foto-Ordner relativ zu od_base_path (sw v110)
- `od_docs_folder`: `{ id, name, relPath }` — Dokumente-Ordner relativ zu od_base_path (sw v110)
- `od_default_folder`, `od_doc_folder`, `od_filemap`, `od_doc_filemap` — **LEGACY/DEPRECATED**

## Sanduhr-Karten-Dimensionen
- Regulär: W=96, H=64 · Zentrum: CW=160, CH=80
- HGAP=10, VGAP=44, MGAP=20, SLOT=106, PAD=20, ROW=108
- Namen: `_treeShortName(p, isCenter)` — Limit 18 (regulär) / 26 (Zentrum) Zeichen, dann Initialen
- Vorfahren: 4 Ebenen (anc1–anc4), ancSpan dynamisch (4/8/16 Slots)

## Version 7 — Schwerpunkte (Branch `v7-dev`)

**Strategische Ausrichtung: GRAMPS als Desktop-Master, PWA als universeller Client.**
GEDCOM bleibt vollständig erhalten. GRAMPS-Unterstützung ist eine Erweiterung.
Austauschformat mit GRAMPS: **GRAMPS XML** (.gramps, gzip + XML) — GEDCOM-Export verliert zu viel.
iOS-Companion-Phase (Quick-Add, Foto-direkt-zu-Person) abgelehnt und entfernt.

**Neue Dateien geplant:**
- `gramps-parser.js` — gzip decompress + DOMParser → AppState (Phase 2, read-only)
- `gramps-writer.js` — AppState → GRAMPS XML (Phase 3, Round-trip)

**Neue AppState-Strukturen geplant:**
- `db.placeObjects{}` — Ortshierarchie (GRAMPS top-level Orte)
- `db.tags{}` — GRAMPS Kategorien/Farben
- `db._grampsHandles{}` — Handle-zu-ID-Mapping für Round-trip
- `db._sourceFormat` — `'gedcom'` | `'gramps'`

**Phase 1 (sofort):** detectGRAMPS() + Import-Toast + _GRAMPS_ID strukturieren + NAME-Duplikation prüfen
**Phase 2:** gramps-parser.js (read-only Native Import)
**Phase 3:** gramps-writer.js (Round-trip)

**Offen aus v6 (P3–P5):**
- Zeitleiste (`ui-timeline.js`), Nachkommen-Baum
- Statistik-Dashboard, Duplikat-Erkennung
- touchmove-Throttling, Suche indexieren, Source-Liste Virtual Scroll
- initAutocomplete() generisch zusammenführen (P4.5)
- Cmd+Z granular, showToast(type), confirm() → Modal

## Offene Architektur-Schulden
- Cmd+Z = "Revert to Saved" (nicht granulares Undo)
- Familien-Avatar: CSS-Symbol statt OS-Emoji
- NAME-Duplikation (GIVN/SURN/NICK strukturiert + passthrough): vor GRAMPS-Roundtrip verifizieren

### A10 — `unsafe-inline` aus CSP entfernen (Scope-Analyse 2026-05-09, Aufwand XL)

~405 `style=` Attribute (165 in JS + 240 in index.html), ~154 `el.style.display`-Toggles.
Strategie: statisch → CSS-Klassen; `display:none` → `hidden`-Attribut; dynamisch → `data-*` + `_applyDynStyles()`.
Geplant für v360–v364. Details: ROADMAP.md A10-Block + CHANGELOG.md Session 2026-05-09.

## Nutzer-Präferenzen
- Sprache: Deutsch · Kommunikation: kurz und direkt · Keine Emojis
