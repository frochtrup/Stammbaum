# Stammbaum PWA — Projekt-Memory

## Projekt-Überblick
- **Was:** Genealogie-Editor als PWA (Multi-File: index.html + JS-Module)
- **Ziel:** iPhone/iPad + Desktop, GEDCOM 5.5.1, kein Server, kein Build-Step
- **Stack:** Vanilla JS, kein Framework, kein npm
- **Pfad:** `/Users/franzdecker/Library/Mobile Documents/com~apple~CloudDocs/Genealogie/AppDev/files/`
- **Dateien:** vollständige Liste → `README.md`

## Aktueller Stand — zuletzt aktualisiert: 2026-05-28

**Version 8.0 aktiv — Branch `v8-dev`**
- **Aktuelle sw-Version: v742** / Cache: `stammbaum-v742`
- Sprint-Geschichte vollständig: `CHANGELOG.md` | Offene Features + Planung: `ROADMAP.md`

Testdaten: MeineDaten_ancestris.ged — 2811 Personen, 880 Familien, 130 Quellen, 4 Archive (83152 Zeilen)
Testdaten: Unsere Familie.gramps — 2894 Personen, 910 Familien, 138 Quellen, 139 Orte

---

## Roundtrip-Status (stabil seit v4)

`roundtrip_stable=true`, `net_delta=0` — CONC/CONT by design, HEAD-Datum nur bei echtem Speichern.
Passthrough-System (10 Mechanismen) + vollständige Details: `ARCHITECTURE.md` ADR-012.

---

## Architektur-Schlüsselentscheidungen
- Multi-File HTML (ADR-001) · Vanilla JS (ADR-002) · Globales `db` via AppState (ADR-003)
- **IndexedDB** cacht GEDCOM-Text primär; localStorage stiller Fallback (ADR-004); vollständige IDB-Keys → `DATAMODEL.md`
- iOS `accept="*/*"` (ADR-005) · Desktop Chrome: `showOpenFilePicker()` + `requestPermission({mode:'readwrite'})` (ADR-007)
- BIRT/CHR/DEAT/BURI als Sonder-Objekte via `SPECIAL_EVENT_KEYS` (gedcom.js); `_SPECIAL_OBJ` in ui-forms-event.js ist Alias darauf (ADR-008)
- Globale Bottom-Nav außerhalb Views, z-index 400 (ADR-009) · 6 Tabs
- PLAC-Toggle: `_placeModes[placeId]` = 'free'|'parts' (ADR-010)
- 3-Felder-Datum: `normMonth()`, `writeDatePartToFields()`, `readDatePartFromFields()` (ADR-011)
- Verbatim Passthrough: `_ptDepth`/`_passthrough[]` auf INDI/FAM/SOUR (ADR-012)
- **od_base_path-Architektur** (ADR-013): absoluter OneDrive-Pfad des GED-Ordners (auto via `parentReference.path`); `m.file` relativ dazu
- **CSP ohne `unsafe-inline`** (ADR-015): alle inline styles entfernt; dynamische Werte via `_applyDynStyles()`
- **associations[].role**: unified für GED5 `RELA`, GRAMPS `rel`, GED7 `ROLE` (ADR-018)
- **GEDCOM 7.0**: opt-in Export (sw v724–v733, ADR-018); Standard bleibt 5.5.1; Parser liest beide
- **sourceMedia{}**: OBJE unter SOUR-Zitierungen strukturiert (nicht verbatim)
- **Event-Delegation**: `_CLICK_MAP`, `data-action`/`data-change`/`data-input`; `ui-event-delegation.js` muss letztes `<script>` in index.html sein
- **Navigation History (unified)**: `_navHistory[]` in UIState — Baum und Detail teilen einen Stack
- **State-Management**: `AppState` (db, currentPersonId, changed…) + `UIState` (_treeScale, _navHistory…) in gedcom.js
- **showToast(msg, type)**: type = 'success'|'error'|'warn'|'info'; typabhängige Dauer
- **Virtuelles Scrollen**: `_VS_ROW=69`, `_VS_BUF=600`, `_VS_MIN=500`, Binary-Search O(log n)
- **Einheitliche Diagramm-Topbar**: `[⌂ Proband][⤢ Vollbild] | [Diagramm-Wechsel][☰]` (v591)
- **Zwei Proband-Buttons in Person-Detail**: `probandBtn` (plain ⌂) + `probandSetBtn` (`.proband-set-btn`, direkt vor `✎`); Familie-Topbar blendet beide aus (v595)
- **Familien-OBJE**: `f.marr.media[]` mit Feld `titl` (nicht `title`) — NICHT in `f.marr._extra`

## Version 7 — Schwerpunkt (abgeschlossen)
GRAMPS als Desktop-Master, PWA als iOS-Companion. `gramps-parser.js` + `gramps-writer.js` vollständig inkl. Roundtrip-Tests (sw v737–v738).

## Offene Architektur-Schulden
- Cmd+Z = „Revert to Saved" (nicht granulares Undo) — Backlog
- `stammbaum_extraplaces_*` + `stammbaum_hofobjects` noch in localStorage (T0-STORAGE Phase 3, ~S)
- `sources[]+sourcePages{}` Zitierungen: Mehrfachzitierungen nicht darstellbar — Backlog F4b (XL)
