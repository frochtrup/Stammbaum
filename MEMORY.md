# Stammbaum PWA — Projekt-Memory

## Projekt-Überblick
- **Was:** Genealogie-Editor als PWA (Multi-File: index.html + JS-Module)
- **Ziel:** iPhone/iPad + Desktop, GEDCOM 5.5.1, kein Server, kein Build-Step
- **Stack:** Vanilla JS, kein Framework, kein npm
- **Pfad:** `/Users/franzdecker/Library/Mobile Documents/com~apple~CloudDocs/Genealogie/AppDev/files/`

## Dateien
- `index.html` — App-Shell: HTML-Struktur + CSS + Script-Tags (v4-dev)
- `gedcom.js` — GEDCOM-Parser + Writer
- `storage.js` — IndexedDB, Dateiverwaltung, Auto-Load
- `ui-views.js` — Baum, Detailansichten, Listenrendering
- `ui-forms.js` — Formulare, OneDrive-Integration, Medien-Bearbeitung
- `sw.js` — Service Worker (Network-first, offline, Cache v58)
- `manifest.json` — PWA-Manifest (Icons, standalone)
- `index_v1.2.html` — Archiv: Version 1.2 (Phase 1)
- `README.md` — Schnellstart, Feature-Übersicht, Workflow iPhone↔Mac
- `ARCHITECTURE.md` — ADRs (ADR-001–012), Passthrough-Analyse, Roundtrip-Delta, Speichern-Architektur
- `DATAMODEL.md` — Datenstrukturen (Person/Familie/Quelle/Archiv), JS-Sektionen, globale Variablen
- `UI-DESIGN.md` — HTML-Seitenstruktur, Navigationsmodell, CSS Design-System, Sanduhr-Layout
- `GEDCOM.md` — Parser/Writer-Referenz, alle unterstützten Tags
- `ROADMAP.md` — Phasen-Übersicht, offene Features, bekannte Probleme
- `CHANGELOG.md` — vollständige Sprint-Geschichte v1.0–v4.0-dev
- `MEMORY.md` — dieses Dokument (auch unter `.claude/projects/.../memory/MEMORY.md`)
- `.claude/launch.json` — Dev-Server: `python3 -m http.server 8080`

## Aktueller Stand — zuletzt aktualisiert: 2026-03-29 (Session 6)
- **Schwerpunkt 1 (Passthrough-Reduktion) abgeschlossen** ✅
- **Schwerpunkt 2 (Desktop UI/UX) abgeschlossen** ✅
- **Version 4 in Entwicklung: Branch `v4-dev`** — `main` bleibt v3 (live)
- Roundtrip-Status: `roundtrip_stable=true`, `net_delta=-4` (nur Normalisierung, alle tag-counts ✓)
- **Aktuelle sw-Version: v58** / Cache: `stammbaum-v58`
- Git: Branch `v4-dev`; letzter Commit: eac986b

**Session 2026-03-29 (Session 6) — Desktop UI/UX Baum (sw v56–v58):**
- Feat: Drag-to-Pan — Maus-Drag scrollt `#treeScroll` (5px-Threshold, Click-Unterdrückung)
- Feat: Vollbild-Modus — Button `⤢` in Topbar, `body.tree-fullscreen` blendet Sidebar aus
- Feat: 4 Vorfahren-Ebenen — anc1–anc4 (Eltern/Großeltern/Urgroßeltern/Ururgroßeltern)
- ancSpan dynamisch (4/8/16 Slots); baseY angepasst; Ebenen -3/-4 überspringen leere Slots
- Vertikale Zentrierung: `marginTop` zentriert Baum wenn kleiner als Viewport
- Feat: Tastaturnavigation — ↑ Vater / Shift+↑ Mutter / ↓ Kind / → Partner / ← History-Back
- Feat: Pfeil-Legende unten rechts im Baum (nur desktop-mode)
- Fix: `←` via `treeNavBack()` (History-basiert); `_prevTreeId` vor Überschreibung gesichert

**Session 2026-03-29 (Session 5) — Medien-UI + Einstellungen (sw v50–v55):**
- Fix: Familien-Media-Abschnitt leer: Parser speichert OBJE unter MARR in `f.marr.media[]` (Feld `titl`), nicht in `_extra` — alle marr-Media-Funktionen korrigiert
- Feat: Einheitliches Medien-Karten-Layout (Icon/Thumbnail + Titel) in Person-, Familien-, Quellenansicht
- Feat: Edit-Modal für Medien: Titelleiste mit Thumbnail, Vorschau, Titel/Dateiname-Felder, OD-Picker, Löschen+Speichern
- Feat: Async Thumbnail-Loading für Person- und Familien-Medien-Items
- Feat: Quellenansicht: erstes Bild-Medium befüllt Header (det-src-photo), Avatar wird ausgeblendet
- Feat: OneDrive-Einstellungen-Modal: zeigt konfig. Ordner mit Namen + Anzahl, Ändern + Zurücksetzen
- Feat: Medien-Badge (📎) in Quellenliste ohne Zähler (sw v54–v55)
- `_asyncLoadMediaThumb(thumbId, idbKey)` shared helper; `openSourceMediaView(srcId, idx)`
- `_odEditPickMode` für OD-Picker aus Edit-Modal

**Session 2026-03-29 (Session 4) — sourceMedia{} + Quellenmanagement UI (sw v45–v49):**
- Feat: `sourceMedia{}` / `sourMedia{}` — OBJE-Blöcke unter SOUR-Zitierungen strukturiert
- Feat: Quellen-Detailansicht mit Icons (🖼/📄/📎) + async OneDrive-Thumbnails
- Feat: `_odGetSourceFileUrl(srcId, idx)` + `odSetupDocFolder()` + `odScanDocFolder()` → `od_doc_filemap`

Testdaten: MeineDaten_ancestris.ged — 2811 Personen, 880 Familien, 130 Quellen, 4 Archive (83152 Zeilen)

---

## Roundtrip-Status (2026-03-29, Session 5)

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

**Nicht editierbar (niedrige Prio):**
- DIV, DIVF → FAM-Events in passthrough
- CENS, CONF, FCOM, ORDN, RETI, PROP, WILL, PROB → nicht als events[] strukturiert
- Mehrere inline INDI-Notes → konkateniert

---

## Architektur-Schlüsselentscheidungen
- Multi-File HTML (ADR-001) · Vanilla JS (ADR-002) · Globales `db` (ADR-003)
- **IndexedDB** cacht GEDCOM-Text primär; localStorage stiller Fallback (ADR-004) · iOS `accept="*/*"` (ADR-005)
- Desktop Chrome: `showOpenFilePicker()` + `requestPermission({mode:'readwrite'})` (ADR-007)
- BIRT/CHR/DEAT/BURI als Sonder-Objekte via `_SPECIAL_OBJ` (ADR-008)
- Globale Bottom-Nav außerhalb Views, z-index 400 (ADR-009) · 6 Tabs
- PLAC-Toggle: `_placeModes[placeId]` = 'free'|'parts' (ADR-010)
- 3-Felder-Datum: `normMonth()`, `writeDatePartToFields()`, `readDatePartFromFields()` (ADR-011)
- Verbatim Passthrough: `_ptDepth`/`_passthrough[]` auf INDI/FAM/SOUR (ADR-012)
- **Geschlecht im Baum**: `data-sex="M/F/U"` Attribut + CSS `border-left` Farbe
- **sourceMedia{}**: OBJE unter SOUR-Zitierungen strukturiert (v4-dev sw v45)
- **OneDrive Dokumente-Ordner**: `od_doc_filemap` — Dateiname-Mapping für auto-Vorschau (sw v49)
- **Familien-OBJE**: `f.marr.media[]` mit Feld `titl` (nicht `title`) — NICHT in `f.marr._extra`
- **Baum Tastatur**: `_treeNavTargets{}` pro `showTree()`-Aufruf; `_initTreeKeys()` einmalig
- **Baum History**: `_treeHistory[]` + `_treeHistoryPos`; `←` ruft `treeNavBack()` auf

## IDB-Schlüssel (OneDrive-Ordner)
- `od_default_folder`: `{ folderId, folderName }` — Foto-Ordner
- `od_doc_folder`: `{ folderId, folderName }` — Dokumente-Ordner
- `od_filemap`: `{ persons:{}, families:{}, sources:{} }` — fileId-Mappings
- `od_doc_filemap`: `{ filename.toLowerCase(): fileId }` — Dokumente-Index

## Sanduhr-Karten-Dimensionen
- Regulär: W=96, H=64 · Zentrum: CW=160, CH=80
- HGAP=10, VGAP=44, MGAP=20, SLOT=106, PAD=20, ROW=108
- Namen: `_treeShortName(p, isCenter)` — Limit 18 (regulär) / 26 (Zentrum) Zeichen, dann Initialen
- Vorfahren: 4 Ebenen (anc1–anc4), ancSpan dynamisch (4/8/16 Slots)

## Version 4 — Schwerpunkte (Branch `v4-dev`)
1. **Passthrough-Reduktion**: ✅ Abgeschlossen — alle tag-counts ✓
2. **Desktop UI/UX**: ✅ Abgeschlossen — 4 Vorfahren-Ebenen, Vollbild, Drag-to-Pan, Tastaturnavigation, Pfeil-Legende
3. **Quellenmanagement**: ✅ Medien-UI + Thumbnails + Einstellungen; offen: Rückverweise, Kamera-Button, Vorlagen
4. **Mobile iPhone**: Schnell-Formular neue Quellen, Swipe-Gesten

## Offene Architektur-Schulden
- State-Management: ~27 globale Variablen, keine Schichtentrennung
- Virtuelles Scrollen für Listen >1000 Einträge
- Cmd+Z = "Revert to Saved" (nicht granulares Undo)

## Nutzer-Präferenzen
- Sprache: Deutsch · Kommunikation: kurz und direkt · Keine Emojis
