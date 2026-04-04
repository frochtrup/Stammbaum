# Stammbaum PWA — Projekt-Memory

## Projekt-Überblick
- **Was:** Genealogie-Editor als PWA (Multi-File: index.html + JS-Module)
- **Ziel:** iPhone/iPad + Desktop, GEDCOM 5.5.1, kein Server, kein Build-Step
- **Stack:** Vanilla JS, kein Framework, kein npm
- **Pfad:** `/Users/franzdecker/Library/Mobile Documents/com~apple~CloudDocs/Genealogie/AppDev/files/`

## Dateien
- `index.html` — App-Shell: HTML-Struktur + CSS + Script-Tags
- `gedcom.js` — AppState/UIState Namespaces, Labels, Datum- und PLAC-Helfer, 8 Getter/Setter-Helfer
- `gedcom-parser.js` — `parseGEDCOM()`, `parseGeoCoord()`
- `gedcom-writer.js` — `writeGEDCOM()`, `pushCont()`
- `demo.ged` — Demo-GEDCOM (12 Pers., 6 Fam., 3 Quellen, 4 Medien)
- `storage.js` — IndexedDB, Dateiverwaltung, Auto-Load
- `ui-views.js` — gemeinsame Hilfsfunktionen (Labels, Topbar, Scroll-Helpers)
- `ui-views-person.js` — Personen-Detailansicht
- `ui-views-family.js` — Familien-Detailansicht
- `ui-views-source.js` — Quellen-Detailansicht
- `ui-views-tree.js` — Sanduhr-Baum + Fan Chart + Tastaturnavigation
- `ui-forms.js` — Formulare Person/Familie/Quelle/Archiv/Event
- `ui-media.js` — Medien Add/Edit/Delete/Browser
- `ui-fanchart.js` — Fan Chart (SVG)
- `onedrive.js` — OAuth, Foto-Import, Ordner-Browser, path-basiertes Medien-Laden
- `sw.js` — Service Worker (Network-first, offline, Cache v99)
- `manifest.json` — PWA-Manifest (Icons, standalone)
- `index_v1.2.html` — Archiv: Version 1.2 (Phase 1)
- `README.md` — Schnellstart, Feature-Übersicht, Workflow iPhone↔Mac
- `ARCHITECTURE.md` — ADRs (ADR-001–012), Passthrough-Analyse, Roundtrip-Delta, Speichern-Architektur
- `DATAMODEL.md` — Datenstrukturen (Person/Familie/Quelle/Archiv), JS-Sektionen, globale Variablen
- `UI-DESIGN.md` — HTML-Seitenstruktur, Navigationsmodell, CSS Design-System, Sanduhr-Layout
- `GEDCOM.md` — Parser/Writer-Referenz, alle unterstützten Tags
- `ROADMAP.md` — Phasen-Übersicht, offene Features, bekannte Probleme
- `CHANGELOG.md` — vollständige Sprint-Geschichte v1.0–v5.0-dev
- `MEMORY.md` — dieses Dokument (auch unter `.claude/projects/.../memory/MEMORY.md`)
- `.claude/launch.json` — Dev-Server: `python3 -m http.server 8080`

## Aktueller Stand — zuletzt aktualisiert: 2026-04-04

**Version 4.0 abgeschlossen — auf `main` gemergt (2026-03-30)**
**Version 5.0 in Entwicklung — Branch `v5-dev`**

- Roundtrip-Status: `roundtrip_stable=true`, `net_delta=-4` (nur Normalisierung, alle tag-counts ✓)
- **Aktuelle sw-Version: v101** / Cache: `stammbaum-v101`
- Git: Branch `v5-dev`; letzter Commit: eabf3b3

**Session 2026-04-04 — Thumbnails + Hauptbild (sw v101):**
- `_asyncLoadMediaThumb`: `onerror` stellt Icon wieder her → kein broken-image-Symbol
- Edit-Dialog: "Als Hauptbild"-Checkbox; `_applyPrimAndReorder()` verschiebt an Index 0, löscht prim bei anderen
- Session-Cache wird bei Reorder invalidiert

**Session 2026-04-04 — Kamera-Upload nach OneDrive (sw v100):**
- `_odUploadMediaFile(b64, targetPath)` — PUT per path-based API, gibt tatsächlichen Pfad zurück
- `odScanDocFolder` speichert jetzt `folderPath` in `od_doc_folder` (analog Foto-Ordner)
- `openAddMediaDialog` lädt `folderPath` aus IDB → `_addMediaDefaultFolderPath`
- `_onCamCapture` verwendet `_addMediaDefaultFolderPath` als Ordner; Dateiname mit Uhrzeit
- `confirmAddMedia` lädt Kamera-Foto hoch, übernimmt tatsächlichen API-Pfad ins `m.file`

**Session 2026-04-04 — Medien-Handling Überarbeitung (sw v96–v99):**
- Relativer OneDrive-Pfad: `_odPickSelectFile` speichert `fullPath` direkt (kein `cfg_photo_base`-Prefix)
- `m.file` ist Single Source of Truth — `od_filemap` nur noch Legacy-Fallback (sw v99)
- `_odGetMediaUrlByPath(path)` — path-based OneDrive API (`/drive/root:/{path}:/content`)
- Bevorzugtes Medium (`_PRIM Y`) in Titelleiste Person/Familie/Quelle
- Edit-Dialog zieht Basispfad ab → zeigt + speichert relativen Pfad
- Bug fix: `_odEditPickMode` zeigte keine Dateien (sw v97)
- `↑ Übergeordneter Ordner`-Button im Picker via `parentReference`-API

**Session 2026-04-03 — Refactoring: ui-views.js → 5 Module + ui-forms.js (sw v92–v95):**
- Refactor: `ui-views.js` aufgeteilt in 5 Module (ui-views-person/family/source/tree.js) — sw v94
- `showSourceDetail()` aus `ui-forms.js` in `ui-views-source.js` ausgelagert — sw v95
- Fix Bug 7: doppelter `treeNavBack()` — sw v93; `goBack()` kein doppelter History-Eintrag — sw v92
- Fix Bug 5: Suchzeile schließt nahtlos an Topbar an — sw v92

**Session 2026-03-31 — OneDrive + Filemap-Fixes (sw v86–v91):**
- Fix: Filemap-Index-Sync; OneDrive-Picker gibt vollständigen Pfad zurück; Basispfad auto-erkannt

Testdaten: MeineDaten_ancestris.ged — 2811 Personen, 880 Familien, 130 Quellen, 4 Archive (83152 Zeilen)

---

## Roundtrip-Status (stabil seit v4)

`roundtrip_stable=true`, `net_delta=-4` — alle tag-counts ✓, STABIL.
Delta: nur CONC/CONT-Neuformatierung (-35/-26) + PAGE-Normalisierung (-22) + je -1 für _TIME/DATE/TIME/QUAY/TEXT.

**Passthrough-Mechanismen (10 Stück):**
`_passthrough[]` · `ev._extra[]` · `addrExtra[]` · `frelSourExtra[]`/`mrelSourExtra[]` · `sourceExtra{}` · `topSourceExtra{}` · `media._extra[]` · `childRelations.sourExtra{}` · `extraRecords[]` · `sourceMedia{}`/`sourMedia{}`

**Passthrough-Reste (akzeptiert, kein Datenverlust):**
- `INDI.sourceExtra`: 2 Eintr. (EVEN, OBJE)
- `FAM.marr._extra`: 1 Z. (EVEN)
- `FAM.childRel.extra`: 44 Eintr. (SOUR/QUAY/PAGE/OBJE…)
- `SOUR._passthrough`: 2 SOURs (REFN, NOTE, CONT)
- `NOTE._passthrough`: 1 NOTE (REFN, _VALID)
- `extraRecords`: 2 (SUBM, OBJE)

**Nicht editierbar (v5-Kandidaten):**
- DIV, DIVF → FAM-Events in passthrough
- CENS, CONF, FCOM, ORDN, RETI, PROP, WILL, PROB → nicht als events[] strukturiert
- Mehrere inline INDI-Notes → konkateniert

---

## Architektur-Schlüsselentscheidungen
- Multi-File HTML (ADR-001) · Vanilla JS (ADR-002) · Globales `db` via AppState (ADR-003)
- **IndexedDB** cacht GEDCOM-Text primär; localStorage stiller Fallback (ADR-004) · iOS `accept="*/*"` (ADR-005)
- Desktop Chrome: `showOpenFilePicker()` + `requestPermission({mode:'readwrite'})` (ADR-007)
- BIRT/CHR/DEAT/BURI als Sonder-Objekte via `_SPECIAL_OBJ` (ADR-008)
- Globale Bottom-Nav außerhalb Views, z-index 400 (ADR-009) · 6 Tabs
- PLAC-Toggle: `_placeModes[placeId]` = 'free'|'parts' (ADR-010)
- 3-Felder-Datum: `normMonth()`, `writeDatePartToFields()`, `readDatePartFromFields()` (ADR-011)
- Verbatim Passthrough: `_ptDepth`/`_passthrough[]` auf INDI/FAM/SOUR (ADR-012)
- **Geschlecht im Baum**: `data-sex="M/F/U"` Attribut + CSS `border-left` Farbe
- **sourceMedia{}**: OBJE unter SOUR-Zitierungen strukturiert (v4-dev sw v45)
- **Medien-Pfad als Wahrheitsquelle**: `m.file` = relativer OneDrive-Pfad; Laden via `_odGetMediaUrlByPath(path)` (ADR-013, sw v99)
- **`od_filemap` DEPRECATED** (sw v99): war Index→fileId-Mapping; nur noch Legacy-Fallback; `od_doc_filemap` ebenfalls deprecated
- **Bevorzugtes Medium**: `m.prim` / `_PRIM Y` → Hero in Detailansicht; Fallback auf erstes Medium (sw v96)
- **OneDrive Picker**: startet aus `od_default_folder`; `↑ Übergeordneter Ordner` via `parentReference`-API (sw v98)
- **Familien-OBJE**: `f.marr.media[]` mit Feld `titl` (nicht `title`) — NICHT in `f.marr._extra`
- **Baum Tastatur**: `_treeNavTargets{}` pro `showTree()`-Aufruf; `_initTreeKeys()` einmalig
- **Baum History**: `_treeHistory[]` + `_treeHistoryPos`; `←` ruft `treeNavBack()` auf
- **State-Management**: `AppState` (db, currentPersonId, changed…) + `UIState` (_treeScale, _treeHistory…) in gedcom.js

## IDB-Schlüssel (OneDrive-Ordner)
- `od_default_folder`: `{ folderId, folderName }` — Foto-Ordner (Picker-Startpunkt)
- `od_doc_folder`: `{ folderId, folderName }` — Dokumente-Ordner
- `od_filemap`: `{ persons:{}, families:{}, sources:{} }` — **DEPRECATED** (sw v99): fileId-Index-Mapping; nur Legacy-Fallback
- `od_doc_filemap`: `{ filename.toLowerCase(): fileId }` — **DEPRECATED** (sw v99): Basename→fileId; ersetzt durch path-based API
- `cfg_photo_base`, `cfg_doc_base` — Basispfad-Konfiguration (für auto-Erkennung + Edit-Dialog-Normalisierung)

## Sanduhr-Karten-Dimensionen
- Regulär: W=96, H=64 · Zentrum: CW=160, CH=80
- HGAP=10, VGAP=44, MGAP=20, SLOT=106, PAD=20, ROW=108
- Namen: `_treeShortName(p, isCenter)` — Limit 18 (regulär) / 26 (Zentrum) Zeichen, dann Initialen
- Vorfahren: 4 Ebenen (anc1–anc4), ancSpan dynamisch (4/8/16 Slots)

## Version 5 — Schwerpunkte (Branch `v5-dev`)

**Schwerpunkt 1: Weitere Darstellungen**
1. Fan Chart (SVG, polar coords) — `ui-fanchart.js` ✅ sw v83–v84
   - Toggle `◑` in Topbar, Gen-Buttons 3–6, klickbare Segmente
   - Farben: Blau/Rosa/Grau nach Geschlecht, außen dunkler
2. Generationen-Buttons im Sanduhr-Baum ✅ sw v84
   - Buttons 2–6 in Topbar, dynamische Positionsfunktionen (_lCX[]), ancLevels 1–5
   - Standard 5; Portrait bleibt max. 2
3. Zeitleiste — neue Datei `ui-timeline.js` (offen)
4. Nachkommen-Baum (top-down SVG) (offen)
5. Karten-Ansicht (Apple Maps Links / leaflet.js) (offen)

**Schwerpunkt 2: Performance + UX**
1. Virtuelles Scrollen (Listen >500 Eintr., scroll-event-basiert, kein Framework)
2. Statistik-Dashboard (Gesamtzahlen, Vollständigkeit, häufigste Namen/Orte)
3. Offline-Sync-Indikator (Badge wenn AppState.changed=true und ungespeichert)

**Schwerpunkt 3: Datenqualität**
1. Erweiterte Events (DIV, DIVF, CENS, CONF, ORDN etc. aus passthrough)
2. Duplikat-Erkennung (gleicher Name + Geburtsjahr ±2, nur Anzeige kein Auto-Merge)
3. Volltextsuche (Ereignis-Orte, Quellen-Titel, Notizen)

## Offene Architektur-Schulden
- Virtuelles Scrollen für Listen >1000 Einträge (v5 Schwerpunkt 2)
- Cmd+Z = "Revert to Saved" (nicht granulares Undo)
- Familien-Avatar: CSS-Symbol statt OS-Emoji

## Nutzer-Präferenzen
- Sprache: Deutsch · Kommunikation: kurz und direkt · Keine Emojis
