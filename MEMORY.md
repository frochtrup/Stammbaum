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
- `gedcom-writer.js` — `writeGEDCOM()`, `pushCont()`, `write*Record()`, `writeSourCitations()`, `writeCHAN()`, `eventBlock()`, `geoLines()`
- `demo.ged` — Demo-GEDCOM (12 Pers., 6 Fam., 3 Quellen, 4 Medien)
- `storage-file.js` — IDB-Primitives (`idbGet/Put/Del`), File System Access API, `exportGEDCOM`, File Loading (DOM-Events, `_processLoadedText`, `readFile`)
- `storage.js` — Demo/Backup/Foto-Export-Import, Auto-Load, Startup (`load`-Event), `revertToSaved`, `confirmNewFile`
- `ui-views.js` — gemeinsame Hilfsfunktionen (Labels, Topbar, Scroll-Helpers)
- `ui-views-person.js` — Personen-Detailansicht
- `ui-views-family.js` — Familien-Detailansicht
- `ui-views-source.js` — Quellen-Detailansicht
- `ui-views-tree.js` — Sanduhr-Baum + Fan Chart + Tastaturnavigation
- `ui-forms.js` — Formulare Person/Familie/Quelle + Source Widget + Modal/Keyboard/Utils
- `ui-forms-repo.js` — Archiv-Formular, Picker, Detail-Ansicht
- `ui-forms-event.js` — Event-Formular (`_SPECIAL_OBJ`, `_efMedia`, `showEventForm`, `saveEvent`)
- `ui-media.js` — Medien Add/Edit/Delete/Browser
- `ui-fanchart.js` — Fan Chart (SVG)
- `onedrive-auth.js` — OAuth2 PKCE: Login, Logout, Token-Refresh, Callback
- `onedrive-import.js` — Foto-Import-Wizard, Ordner-Browser, Pick-Modus, `_extractObjeFilemap()`
- `onedrive.js` — Media-URL (`_odGetMediaUrlByPath`), Upload, File-I/O (Open/Save), Pfad-Helfer, Settings
- `sw.js` — Service Worker (Network-first + 4s Timeout, offline, Cache v167)
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

## Aktueller Stand — zuletzt aktualisiert: 2026-04-06

**Version 4.0 abgeschlossen — auf `main` gemergt (2026-03-30)**
**Version 5.0 abgeschlossen — auf `main` gemergt (2026-04-05)**
**Version 6.0 in Entwicklung — Branch `v6-dev`**

- Roundtrip-Status: `roundtrip_stable=true`, `net_delta=0` — alle Tag-Counts bestanden; TIME-stabil (out1===out2)
- **Aktuelle sw-Version: v167** / Cache: `stammbaum-v167`
- Git: Branch `v6-dev`

Testdaten: MeineDaten_ancestris.ged — 2811 Personen, 880 Familien, 130 Quellen, 4 Archive (83152 Zeilen)

---

## Roundtrip-Status (stabil seit v4)

`roundtrip_stable=true`, `net_delta=0` — alle Tag-Counts bestanden; TIME-stabil (out1 === out2).

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
- BIRT/CHR/DEAT/BURI als Sonder-Objekte via `_SPECIAL_OBJ` (ADR-008)
- Globale Bottom-Nav außerhalb Views, z-index 400 (ADR-009) · 6 Tabs
- PLAC-Toggle: `_placeModes[placeId]` = 'free'|'parts' (ADR-010)
- 3-Felder-Datum: `normMonth()`, `writeDatePartToFields()`, `readDatePartFromFields()` (ADR-011)
- Verbatim Passthrough: `_ptDepth`/`_passthrough[]` auf INDI/FAM/SOUR (ADR-012)
- **Geschlecht im Baum**: `data-sex="M/F/U"` Attribut + CSS `border-left` Farbe
- **sourceMedia{}**: OBJE unter SOUR-Zitierungen strukturiert (v4-dev sw v45)
- **od_base_path-Architektur** (ADR-013, sw v110/v111): `od_base_path` = absoluter OneDrive-Pfad des GED-Ordners (auto via `parentReference.path`); `m.file` = relativer Pfad; `fullPath = od_base_path + '/' + m.file` für API
- **@microsoft.graph.downloadUrl** (sw v107): 2-Schritt-Fetch — kein CORS-Problem mit CDN-Redirect
- **IDB-Keys pfad-basiert**: `'img:' + filePath` (sw v105) — index-basierte Keys (`photo_id_0` etc.) deprecated
- **`od_filemap` DEPRECATED** (sw v99): war Index→fileId-Mapping; nur noch Legacy-Fallback; `od_doc_filemap` ebenfalls deprecated
- **Bevorzugtes Medium**: `m.prim` / `_PRIM Y` → Hero in Detailansicht; Fallback auf erstes Medium (sw v96)
- **OneDrive Picker**: startet aus `od_photo_folder.relPath`; `↑ Übergeordneter Ordner` via `parentReference`-API (sw v110)
- **Familien-OBJE**: `f.marr.media[]` mit Feld `titl` (nicht `title`) — NICHT in `f.marr._extra`
- **Baum Tastatur**: `_treeNavTargets{}` pro `showTree()`-Aufruf; `_initTreeKeys()` einmalig
- **Baum History**: `_treeHistory[]` + `_treeHistoryPos`; `←` ruft `treeNavBack()` auf
- **State-Management**: `AppState` (db, currentPersonId, changed…) + `UIState` (_treeScale, _treeHistory…) in gedcom.js

## IDB-Schlüssel (OneDrive-Ordner)
- `od_base_path`: String — absoluter OneDrive-Pfad des GED-Ordners (sw v110/v111, auto-abgeleitet)
- `od_photo_folder`: `{ id, name, relPath }` — Foto-Ordner relativ zu od_base_path (sw v110)
- `od_docs_folder`: `{ id, name, relPath }` — Dokumente-Ordner relativ zu od_base_path (sw v110)
- `od_default_folder`: `{ folderId, folderName, folderPath }` — **LEGACY** (vor sw v110)
- `od_doc_folder`: `{ folderId, folderName, folderPath }` — **LEGACY** (vor sw v110)
- `od_filemap`: `{ persons:{}, families:{}, sources:{} }` — **DEPRECATED** (sw v99): fileId-Index-Mapping; nur Legacy-Fallback
- `od_doc_filemap`: `{ filename: fileId }` — **DEPRECATED** (sw v99)

## Sanduhr-Karten-Dimensionen
- Regulär: W=96, H=64 · Zentrum: CW=160, CH=80
- HGAP=10, VGAP=44, MGAP=20, SLOT=106, PAD=20, ROW=108
- Namen: `_treeShortName(p, isCenter)` — Limit 18 (regulär) / 26 (Zentrum) Zeichen, dann Initialen
- Vorfahren: 4 Ebenen (anc1–anc4), ancSpan dynamisch (4/8/16 Slots)

## Version 6 — Schwerpunkte (Branch `v6-dev`)

Offene Punkte aus v5 + neue Schwerpunkte — Planung in nächster Session.

**Offen aus v5:**
- Zeitleiste (`ui-timeline.js`), Nachkommen-Baum, Karten-Ansicht
- Statistik-Dashboard, Duplikat-Erkennung, Volltextsuche
- `writeGEDCOM()` aufteilen, touchmove-Throttling, Suche indexieren

## Offene Architektur-Schulden
- Cmd+Z = "Revert to Saved" (nicht granulares Undo)
- Familien-Avatar: CSS-Symbol statt OS-Emoji

## Nutzer-Präferenzen
- Sprache: Deutsch · Kommunikation: kurz und direkt · Keine Emojis
