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
- `sw.js` — Service Worker (Network-first, offline, Cache v49)
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

## Aktueller Stand — zuletzt aktualisiert: 2026-03-29 (Session 4)
- Phase 3 abgeschlossen: P3-1 ✅ · P3-2 ✅ · P3-3 ✅ · P3-4 ✅ · P3-5 ✅ · P3-6 ✅ · P3-7 ✅ · P3-8 ✅
- **Version 4 in Entwicklung: Branch `v4-dev`** — `main` bleibt v3 (live)
- Roundtrip-Status: `roundtrip_stable=true`, `net_delta≈0`
- **Aktuelle sw-Version: v49** / Cache: `stammbaum-v49`
- Git: Branch `v4-dev`; letzter Commit: bcb4175 (Passthrough-Reduktion FAM EVEN/_STAT/SOUR _DATE/NOTE CHAN, sw v42)

**Session 2026-03-29 (Session 4) — sourceMedia{} + Quellenmanagement UI (sw v45–v49):**
- Feat: `sourceMedia{}` / `sourMedia{}` — OBJE-Blöcke unter SOUR-Zitierungen strukturiert geparst + geschrieben (sw v45) → 10. Passthrough-Mechanismus
- Fix: OBJE mit `@ref@` bleibt in `sourceExtra{}` verbatim (`!val.startsWith('@')`-Guard) (sw v46)
- Fix: `sourMedia:{}` fehlte in 3 `childRelations`-Init-Stellen (sw v46)
- Feat: Quellen-Detailansicht zeigt Medien mit statischen Icons (🖼/📄/📎) sofort; async Upgrade zu Thumbnail/Link via OneDrive (sw v47–v48)
- Feat: `_odGetSourceFileUrl(srcId, idx)` — sucht fileId in od_filemap, Fallback: Basename-Matching gegen od_doc_filemap (sw v47–v48)
- Feat: Dokumente-Ordner einrichten: `odSetupDocFolder()` + `odScanDocFolder()` → `od_doc_filemap` in IDB (sw v49)
- Laufendes Problem: Topbar-Layout (App nach oben verschoben) — noch nicht behoben

**Session 2026-03-28 (Session 3) — UX-Fixes + Diagnose (sw v34–v38) + Roundtrip-Fixes (sw v29–v33):**
- FROM/TO-Datum Parser + Builder; `gedDateSortKey()`; Personenliste sortierbar nach Geburtsdatum
- viewport-fit=cover — Topbar auf iOS PWA korrekt
- Roundtrip: `_ptAgg()` / `_ptFmt()` für Passthrough-Diagnose
- HEAD verbatim `_headLines[]`; ENGA vollständig; `seen`-Flag für leere Events; NOTE-Record Sub-Tags
- Leere DATE/PLAC: `null`-Init statt `''`; Writer prüft `!== null`

**Session 2026-03-27 — Medien hinzufügen/löschen (sw v22):**
- `openAddMediaDialog()`, `confirmAddMedia()`, `deletePersonMedia()`, `deleteSourceMedia()`
- `_odPickMode` + `_odCancelOrClose()`

**Session 2026-03-26 (2) — Medien + UI-Fixes:**
- Lightbox, mehrere Fotos, dynamisches OneDrive-Foto-Laden, `od_filemap`

**Session 2026-03-26 (1) — Roundtrip-Fixes:**
- `addrExtra[]`, `frelSourExtra[]`/`mrelSourExtra[]`, `_ptNameEnd`-Index → `roundtrip_stable=true`

Testdaten: MeineDaten_ancestris.ged — 2796 Personen, 873 Familien, 114 Quellen, 11 Archive (82505 Zeilen)

---

## Roundtrip-Status (2026-03-29)

Verbatim Passthrough (ADR-012): `_ptDepth`/`_passthrough[]` auf INDI/FAM/SOUR + `_extraRecords[]` + `_ptTarget` + `_ptNameEnd`.
Delta-Verlauf: -708 → -126 (Sprint 12) → -84 (Sprint 13) → -7 (2026-03-26) → **≈0** (2026-03-28).

**Passthrough-Mechanismen (10 Stück — Details in ARCHITECTURE.md ADR-012):**
`_passthrough[]` · `ev._extra[]` · `addrExtra[]` · `frelSourExtra[]`/`mrelSourExtra[]` · `sourceExtra{}` · `topSourceExtra{}` · `media._extra[]` · `childRelations.sourExtra{}` · `extraRecords[]` · **`sourceMedia{}`/`sourMedia{}`** (v4-dev)

**Passthrough-Optimierungspotenzial (kein Datenverlust, aber nicht editierbar):**
- DIV, DIVF → FAM-Events fehlen im Parser
- CENS, CONF, FCOM, ORDN, RETI, PROP, WILL, PROB → nicht als events[] strukturiert
- Mehrere inline INDI-Notes → konkateniert statt als Array

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

## Sanduhr-Karten-Dimensionen
- Regulär: W=96, H=64 · Zentrum: CW=160, CH=80
- HGAP=10, VGAP=44, MGAP=20, SLOT=106, PAD=20, ROW=108
- Namen: `_treeShortName(p, isCenter)` — Limit 18 (regulär) / 26 (Zentrum) Zeichen, dann Initialen

## Version 4 — Ziele (Branch `v4-dev`)
1. **Passthrough-Reduktion**: DIV/DIVF, CENS/CONF/FCOM/ORDN/RETI/PROP/WILL/PROB, mehrere INDI-Notes, zweite NAME-Einträge
2. **Desktop UI/UX**: grössere Bäume (3–4 Generationen), Vollbild-Baum, Panning via Drag, Tastaturnavigation
3. **Quellenmanagement**: ✅ Medien aus `../documents` über OneDrive anzeigen; offen: Rückverweise, Kamera-Button, Vorlagen, Medien-Browser
4. **Mobile iPhone**: Schnell-Formular neue Quellen, Swipe-Gesten

## Offene Architektur-Schulden
- State-Management: ~27 globale Variablen, keine Schichtentrennung
- Virtuelles Scrollen für Listen >1000 Einträge
- Cmd+Z = "Revert to Saved" (nicht granulares Undo)
- Topbar-Layout-Bug: App nach oben verschoben (offen seit sw v49)

## Nutzer-Präferenzen
- Sprache: Deutsch · Kommunikation: kurz und direkt · Keine Emojis
