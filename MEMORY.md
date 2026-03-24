# Stammbaum PWA — Projekt-Memory

## Projekt-Überblick
- **Was:** Genealogie-Editor als Single-File PWA (`index.html`)
- **Ziel:** iPhone/iPad + Desktop, GEDCOM 5.5.1, kein Server, kein Build-Step
- **Stack:** Vanilla JS, kein Framework, kein npm
- **Pfad:** `/Users/franzdecker/Library/Mobile Documents/com~apple~CloudDocs/Genealogie/AppDev/files/`

## Dateien
- `index.html` — gesamte App (v2.0/Phase3, Sprints 1–13 + P3-1..P3-3 + Roundtrip-Fix, ~5000 Zeilen)
- `index_v1.2.html` — Archiv: Version 1.2 (Phase 1)
- `README.md` — Schnellstart, Feature-Übersicht, Workflow iPhone↔Mac
- `ARCHITECTURE.md` — ADRs (inkl. ADR-012 Verbatim Passthrough), Datenmodell, JS-Sektionen
- `GEDCOM.md` — Parser/Writer-Referenz, alle unterstützten Tags
- `ROADMAP.md` — Phasen-Übersicht, offene Features, bekannte Probleme
- `GEDCOM_V2_PLAN.md` — historisches Planungsdokument (Archiv)
- `LINE_INDEX.md` — Zeilen-Index für index.html
- `MEMORY.md` — dieses Dokument (auch unter `.claude/projects/.../memory/MEMORY.md`)
- `.claude/launch.json` — Dev-Server: `python3 -m http.server 8080`

## Aktueller Stand — zuletzt aktualisiert: 2026-03-24
- `index.html` v2.0 → **Phase 3 läuft** (P3-1 ✅ P3-2 ✅ P3-3 ✅)
- Sprint P3-1 ✅ IndexedDB-Migration + Familien-Sortierung
- Sprint P3-2 ✅ Fotos: Upload, Resize (max 800px JPEG), IDB-Storage (`photo_<id>`), Detailansicht (80×96px rechteckig, links neben Name), Export/Import Sidecar-JSON (`stammbaum_photos.json`)
- Sprint P3-3 ✅ Suche/Filter: Volltext war bereits vorhanden; neu: Geburtsjahr-Bereichsfilter (von/bis) mit ✕-Clear-Button im Personen-Tab
- Roundtrip-Fix ✅ Alle INDI/FAM-Datenverluste behoben (nach Sprints P3-1..P3-3)
- Phase 3 Sprint-Plan: P3-1 ✅ · P3-2 ✅ · P3-3 ✅ · P3-4 SW · P3-5 Baum-UI · P3-6 Undo · P3-7 Desktop · P3-8 OneDrive

Testdaten: MeineDaten_ancestris.ged — 2796 Personen, 873 Familien, 114 Quellen, 11 Archive

---

## Roundtrip-Status (aktuell — nach Roundtrip-Fix 2026-03-24)

**STABIL · Null INDI/FAM-Datenverluste · nur HEAD-Rewrite-Normalisierung**

Testdatei (Ergänzungsdatei, 64 Personen / 22 Familien):
- `out=2036` vs `orig=2043` (Delta -7: ausschließlich HEAD-Normalisierung)
- Auto-Diff: CONC -14, CONT -11, SOUR/VERS/NAME/CORP/ADDR/DATE/TIME/SUBM/FILE/NOTE/TEXT je -1 → alle im HEAD-Block

Tag-Statistik alles ✓: `3 SOUR (FAM)` 75/75 · `2 SOUR (all)` 225/225 · `2 _FREL` 37/37 · `2 _MREL` 37/37 · `3 MAP` 60/60 etc.

### Fixes im Roundtrip-Fix-Sprint (2026-03-24):
1. **CONC-Stabilitäts-Fix**: `raw.trim()` → `raw.replace(/\r$/, '')` — `trim()` entfernte trailing Spaces aus CONC-Werten und verschob die Split-Grenze; `trimEnd()` allein war nicht ausreichend (das Problem war `raw.trim()` auf die ganze Zeile)
2. **`1 RELI` als Event**: RELI war als einfaches String-Feld gespeichert; Kinder (TYPE, DATE, SOUR) wurden stillschweigend verworfen. Fix: RELI in die events[]-Liste aufgenommen; Writer behält `if (p.reli)` für Rückwärtskompatibilität mit bestehenden IDB-Daten
3. **FAM CHIL `2 SOUR`**: `2 SOUR` direkt unter `1 CHIL` (FAM) wurde nicht geparst. Fix: `sourIds[]`, `sourPages{}`, `sourQUAY{}`, `sourExtra{}` in `childRelations[id]`; Parser lv=2 + lv=3; Writer vor `_FREL`/`_MREL`
4. **Mehrere `3 SOUR` unter `2 _FREL`/`2 _MREL`**: zweiter `3 SOUR` überschrieb ersten. Fix: `if (!cref.frelSour) cref.frelSour = val; else frelSourExtra.push(...)` — gilt für FAM childRelations (lv=3) und INDI FAMC (lv=3)

### Verbatim Passthrough (ADR-012):
`_ptDepth`/`_passthrough[]` auf INDI/FAM/SOUR + `_extraRecords[]` für unbekannte lv=0 Records + `_ptTarget` für Capture-Redirect.

### Akzeptierte Verluste (HEAD-Rewrite by design):
HEAD wird vollständig neu geschrieben: GEDC, VERS, FORM, SOUR ANCESTRIS, VERS, NAME, CORP, ADDR, DEST, DATE, TIME, SUBM, FILE, CHAR, PLAC/FORM, NOTE → alle HEAD-internen Tags gehen verloren/werden normalisiert.
CONC/CONT: Normalisierung (Daten erhalten, nur Split-Grenzen geändert).

### Roundtrip-Verlauf (MeineDaten_ancestris.ged, 2796 Personen):
-708 → -290 → -226 → -179 → ~-100 → -126 (S12) → -84 (S13) → **~0** (nur HEAD)

---

## Architektur-Schlüsselentscheidungen
- Single-File HTML (ADR-001) · Vanilla JS (ADR-002) · Globales `db` (ADR-003)
- **IndexedDB** (IDB) cacht GEDCOM-Text primär (`stammbaum_ged/backup/filename`); localStorage als stiller Fallback (ADR-004 ersetzt durch IDB-Strategie, Sprint P3-1) · iOS `accept="*/*"` (ADR-005)
- Desktop Chrome: `showOpenFilePicker()` + `requestPermission({mode:'readwrite'})` → direktes Speichern (ADR-007)
- BIRT/CHR/DEAT/BURI als Sonder-Objekte via `_SPECIAL_OBJ` (ADR-008)
- Globale Bottom-Nav außerhalb Views, z-index 400 (ADR-009)
- PLAC-Toggle: `_placeModes[placeId]` = 'free'|'parts' (ADR-010)
- 3-Felder-Datum: `normMonth()`, `writeDatePartToFields()`, `readDatePartFromFields()` (ADR-011)
- Verbatim Passthrough: `_ptDepth`/`_passthrough[]` auf INDI/FAM/SOUR (ADR-012)

## Sanduhr-Karten-Dimensionen
- Regulär: W=96, H=64 · Zentrum: CW=160, CH=80
- HGAP=10, VGAP=44, MGAP=20, SLOT=106, PAD=20, ROW=108

## index.html — Sprint-Status (v2.0)
| Sprint | Inhalt | Status |
|---|---|---|
| 1 | A1 HEAD, A2 CHAN.TIME, A3 CONT-Split, A4 OBJE-FORM, A5 DATE-Norm | ✅ |
| 2 | B3 FACT+MILI Parser, B4 RESN/EMAIL/WWW, B5 CHAN.TIME parsen | ✅ |
| 3 | B1 NOTE-Records Roundtrip | ✅ |
| 4 | B2 QUAY Parser+Writer; Roundtrip-Test als In-App-Funktion | ✅ |
| 5 | D1–D6 UI: FACT+TYPE, QUAY-Widget, ENGA, RESN/EMAIL/WWW | ✅ |
| 6a | C1+D3 Strukturiertes Datum: Qualifier + 3-Felder-Eingabe | ✅ |
| 6b | C2+D4 PLAC.FORM aus HEAD + Orts-Toggle Freitext ↔ 6-Felder | ✅ |
| 7 | E1: Roundtrip-Test erweitert; E2: Ancestris-Import-Test stabil | ✅ |
| 8 | UI/UX-Fixes B1–B14 (Ghost-Karten, Topbar, Kinder-Feld, etc.) | ✅ |
| 9 | URL-Parameter `?datei=`: Dateiname in Topbar | ✅ |
| 10 | MARR/NAME/topSrc PAGE+QUAY; CONC-Fix; _FREL/_MREL lv3-4 | ✅ |
| 11 | Verbatim Passthrough (ADR-012); DEAT.value; CONC val-fix; Auto-Diff | ✅ |
| 12 | `frelSeen`/`mrelSeen`; `extraRecords[]` SUBM; INDI famc `frelSour`-Fix; MARR.addr | ✅ |
| 13 | Alle OBJE-Kontexte: `nameSourceExtra`, `sourceExtra`, `frelSourExtra`, FAMC `sourIds`/`sourExtra`, `marr.sourceExtra`; OBJE-Diagnose | ✅ |
| P3-1 | IndexedDB-Migration + Familien-Sortierung | ✅ |
| P3-2 | Fotos: Base64, max 800px JPEG, IDB, Sidecar-JSON | ✅ |
| P3-3 | Suche/Filter: Volltext + Geburtsjahr-Bereichsfilter | ✅ |
| RT-Fix | CONC raw.replace, RELI→Event, CHIL sourIds, frelSourExtra | ✅ |

## Globale Variablen (index.html v2.0 — komplett)
```javascript
let db = { individuals:{}, families:{}, sources:{}, extraPlaces:{}, repositories:{}, notes:{}, placForm:'', extraRecords:[] };
let changed = false;
let _placesCache = null;
let currentPersonId = null; let currentFamilyId = null; let currentSourceId = null;
let currentRepoId = null;
let currentTab = 'persons'; let currentTreeId = null;
const srcWidgetState = {};  // {prefix: {ids: Set, pages: {sid:page}, quay: {sid:quay}}}
let _originalGedText = null; let _idb = null;
let _fileHandle = null; let _canDirectSave = false;
const _navHistory = [];
// v1.1 Beziehungs-Picker:
let _relMode = ''; let _relAnchorId = ''; let _pendingRelation = null;
// v1.2 REPO:
let _pendingRepoLink = null;
// v2.0 PLAC-Toggle:
const _placeModes = {};  // { placeId: 'free'|'parts' }
// Sprint 11–13 Parser-State:
let _ptDepth = 0;   // verbatim-passthrough depth (0 = off)
let _ptTarget = null; // redirect capture target (null = cur._passthrough)
// P3-2 Fotos:
let _pendingPhotoBase64 = undefined; // undefined=keine Änderung, null=löschen, string=neues Foto
```

## Datenmodell — kritische Felder (Roundtrip-relevant)

### INDI
```javascript
{
  famc: [{ famId, frel, mrel, frelSeen, mrelSeen,
           frelSour, frelPage, frelQUAY, frelSourExtra:[],
           mrelSour, mrelPage, mrelQUAY, mrelSourExtra:[],
           sourIds:[], sourPages:{}, sourQUAY:{}, sourExtra:{} }],
  events: [{ type, value, date, place, ..., sources:[], sourcePages:{}, sourceQUAY:{}, sourceExtra:{}, _extra:[] }],
  // RELI ist in events[] (nicht mehr als p.reli-String!)
  birth/death/chr/buri: { ..., sourceExtra:{}, _extra:[] },
  nameSourceExtra:{}, topSourceExtra:{},
  _passthrough:[]
}
```

### FAM
```javascript
{
  childRelations: { '@Ixx@': {
    frel, mrel, frelSeen, mrelSeen,
    frelSour, frelPage, frelQUAY, frelSourExtra:[],
    mrelSour, mrelPage, mrelQUAY, mrelSourExtra:[],
    sourIds:[], sourPages:{}, sourQUAY:{}, sourExtra:{}  // 2 SOUR direkt unter 1 CHIL
  }},
  marr: { ..., sourceExtra:{}, _extra:[] },
  _passthrough:[]
}
```

## Neue Hilfsfunktionen (index.html v2.0)
```javascript
// 3-Felder-Datum (Sprint 6a):
function normMonth(s)                                       // 'März'/'3'/'MAR' → 'MAR'
function writeDatePartToFields(baseId, dateStr)             // '12 MAR 1845' → d/m/y-Felder
function readDatePartFromFields(baseId)                     // d/m/y-Felder → '12 MAR 1845'
function buildGedDateFromFields(qualId, baseId, date2Id)   // → 'BET 1880 AND 1890'

// PLAC-Toggle (Sprint 6b):
const _placeModes = {}
function getPlacLabels()                                    // db.placForm → ['Dorf','Stadt',...]
function initPlaceMode(placeId)                             // Freitext-Modus; Button '⊞ Felder'
function togglePlaceMode(placeId)                           // free↔parts
function getPlaceFromForm(placeId)                          // liest je nach Modus

// Familie-Formular Kinder (Sprint 8):
function _refreshChildDisplay()                             // IDs → Klarnamen in #ff-children-display

// URL-Parameter + Topbar (Sprint 9):
function updateTopbarTitle(filename)                        // #topbarFileName: ' · Dateiname'

// Roundtrip Auto-Diff (Sprint 11):
// In runRoundtripTest(): Multiset-Vergleich orig↔out1, top-20 fehlende Tags
```

## Phase 3 Sprint-Plan (v3.0, in Arbeit)
- P3-1 ✅ IndexedDB + Familien-Sortierung
- P3-2 ✅ Fotos (Base64, max 800px JPEG, IDB-Storage, Sidecar-JSON Export/Import)
- P3-3 ✅ Suche/Filter (Volltext alle Tabs + Geburtsjahr-Bereichsfilter)
- P3-4 Service Worker / Offline + PWA-Manifest
- P3-5 Stammbaum-Erweiterungen (Mehrfach-Ehen, Halbgeschwister-Nav, Pinch-Zoom)
- P3-6 Undo/Redo (vereinfacht: Revert-to-Saved) + Keyboard-Shortcuts
- P3-7 Responsives Desktop-Layout (Zweispalten)
- P3-8 OneDrive-Integration (PKCE OAuth, Graph API)

## Nutzer-Präferenzen
- Sprache: Deutsch · Kommunikation: kurz und direkt · Keine Emojis
