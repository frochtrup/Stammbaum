# Stammbaum PWA — Projekt-Memory

## Projekt-Überblick
- **Was:** Genealogie-Editor als PWA (Multi-File: index.html + JS-Module)
- **Ziel:** iPhone/iPad + Desktop, GEDCOM 5.5.1, kein Server, kein Build-Step
- **Stack:** Vanilla JS, kein Framework, kein npm
- **Pfad:** `/Users/franzdecker/Library/Mobile Documents/com~apple~CloudDocs/Genealogie/AppDev/files/`

## Dateien
- `index.html` — App-Shell: HTML-Struktur + CSS + Script-Tags (v3.0)
- `gedcom.js` — GEDCOM-Parser + Writer (ausgelagert 2026-03-25/26)
- `storage.js` — IndexedDB, Dateiverwaltung, Auto-Load
- `ui-views.js` — Baum, Detailansichten, Listenrendering
- `ui-forms.js` — Formulare, OneDrive-Integration, Medien-Bearbeitung
- `sw.js` — Service Worker (Network-first, offline, Cache v33)
- `manifest.json` — PWA-Manifest (Icons, standalone)
- `index_v1.2.html` — Archiv: Version 1.2 (Phase 1)
- `README.md` — Schnellstart, Feature-Übersicht, Workflow iPhone↔Mac
- `ARCHITECTURE.md` — ADRs (inkl. ADR-012 Verbatim Passthrough), Datenmodell, JS-Sektionen
- `GEDCOM.md` — Parser/Writer-Referenz, alle unterstützten Tags
- `ROADMAP.md` — Phasen-Übersicht, offene Features, bekannte Probleme
- `GEDCOM_V2_PLAN.md` — historisches Planungsdokument (Archiv)
- `MEMORY.md` — dieses Dokument (auch unter `.claude/projects/.../memory/MEMORY.md`)
- `.claude/launch.json` — Dev-Server: `python3 -m http.server 8080`

## Aktueller Stand — zuletzt aktualisiert: 2026-03-28
- Phase 3 abgeschlossen: P3-1 ✅ · P3-2 ✅ · P3-3 ✅ · P3-4 ✅ · P3-5 ✅ · P3-6 ✅ · P3-7 ✅ · P3-8 ✅
- **Version 4 in Entwicklung: Branch `v4-dev`** — `main` bleibt v3 (live)
- Roundtrip-Status: `roundtrip_stable=true`, `net_delta≈0` (alle inhaltlichen Verluste behoben)
- Git: letzter Commit 5075eac (leere DATE/PLAC null-Fix, sw v33) auf v4-dev

**Session 2026-03-25 — UI/UX + Code-Qualität:**
- Baum: Geschlecht via `border-left` (blau=M, rosa=F) statt Symbol; `_treeShortName()` kürzt Namen zu Initialen
- `tree-yr` 0.62rem → 0.68rem; Icons ♻→👤, §→📖
- Globaler Such-Tab (`🔍`) als 6. Bottom-Nav Button; sucht über alle Entitätstypen
- Fix: `#desktopPlaceholder` fehlte `display:none` Basisregel → verdeckte Detail auf Mobile
- Fix: XSS in Photo-Import (`innerHTML` → DOM-API + Re-Validierung)
- Fix: Race Condition iOS-Share (`writeGEDCOM() === content` vor `changed=false`)
- Fix: Place-Autocomplete debounced (150ms); Desktop-Resize bidirektional
- Fix: IDB-Fehler zeigen Toast statt stumm zu scheitern
- Fix: Multi-Tab-Warnung via `window.storage`-Event
- Dead Code entfernt: `.tree-sex`, `.icloud-hint`, `.export-bar/.export-btn`, `normDateToISO()`

**Session 2026-03-26 — Roundtrip-Fixes + Bug-Fix:**
- Fix: `ev.addrExtra[]` + REPO `r.addrExtra[]` für ADDR-Sub-Tags (CITY, POST, _STYLE, _MAP, _LATI, _LONG)
- Fix: `frelSourExtra[]`/`mrelSourExtra[]` + `_ptDepth=3` für mehrfache SOURs unter _FREL/_MREL
- Fix: `_ptNameEnd`-Index — NICK/NAME-Kontext-Passthrough direkt nach NAME-Block (nicht nach CHAN)
- Fix: `_FREL`/`_MREL` ohne trailing space wenn `val=''`
- Fix: `_getOriginalText()` — `_originalGedText || localStorage` (RAM vor localStorage — wichtig für >5MB Dateien)

**Session 2026-03-26 (2) — Medien + UI-Fixes:**
- OCCU + RELI aus Personenformular entfernt (nur noch als Events)
- Kinder-Abschnitt aus Familienformular entfernt (wird in Familienansicht verwaltet)
- Medienanzeige (media[]) in Personen- und Familiendetail ergänzt
- Fix: Baum ⚭-Badge nur bei echtem Ehepartner (`personId === fam.husb/wife`)
- Fix: ⚭-Linie bleibt nach Navigation → class `tree-marr-btn` + erweiterter Cleanup-Selektor
- Fix: INDI OBJE ging komplett in `_passthrough` statt `p.media[]`
- Fix: Familien-Medien: `2 OBJE` unter `1 MARR` in `marr._extra`
- Fix: `_extractObjeFilemap()` erkennt `2 OBJE` unter `1 MARR`
- Fix: Familien-Hero-Foto ersetzt 👨‍👩‍👧-Avatar
- BMP-Support: `createImageBitmap` als Primary, `<img>`-Tag als Fallback
- **Lightbox**: Fotos klickbar → `#modalLightbox` Vollbild-Overlay; `showLightbox()` + `_lightboxSetHero()`
- Mehrere Fotos: `openMediaPhoto()`, IDB-Keys `photo_<id>_N`; Lazy-Migration `photo_<id>` → `photo_<id>_0`
- Dynamisches OneDrive-Foto-Laden: `od_filemap` (IDB) mit fileIds; `_odGetPhotoUrl()`; `_odPhotoCache`; Standard-Ordner in `od_default_folder` (IDB); ⚡-Button entfernt

**Session 2026-03-27 — Medien hinzufügen/löschen:**
- Medien-Abschnitt in Person/Familie/Quelle immer sichtbar (+ Hinzufügen-Button + × pro Eintrag)
- `#modalAddMedia`: Titel + Dateiname; OneDrive-Picker-Button (nur wenn verbunden)
- `openAddMediaDialog()`, `confirmAddMedia()` — Person: `p.media[]`; Familie: `f.marr._extra`; Quelle: `s.media[]`
- `deletePersonMedia()`, `deleteFamilyMarrMedia()`, `deleteFamilyMedia()`, `deleteSourceMedia()`
- `_removeFamMarrObjeAt()` — entfernt i-ten OBJE-Block aus `f.marr._extra`
- `_removeMediaFromFilemap()`, `_clearIdbPhotoKeys()`, `_addMediaToFilemap()`
- OneDrive-Picker-Modus: `_odPickMode=true` → Ordner-Browser zeigt auch Dateien; `_odPickSelectFile()`, `_odPickCancel()`, `_odCancelOrClose()`
- sw.js → v22

**Session 2026-03-28 — Roundtrip-Fixes (v4-dev, Teil 1):**
- Fix: HEAD verbatim in `_headLines[]` bewahrt; DATE/TIME werden aktuell geschrieben
- Fix: extraNames (2. NAME-Eintrag) `3 PAGE`/`3 QUAY` — `_curExtraNameIdx` routing
- Fix: BIRT/CHR/DEAT/BURI leere Events — `seen:false/true` Flag
- Fix: NOTE-Record Sub-Tags (CHAN, REFN, _VALID) → `_passthrough[]`
- Fix: MAP ohne PLAC — `eventBlock` + `events[]`-Writer prüfen `obj.lati !== null`
- Fix: ENGA vollständig — `engag`-Objekt mit allen Feldern; Parser lv=1/2/3/4; Writer via `eventBlock`
- sw.js v29 → v30

**Session 2026-03-28 — Roundtrip-Fixes (v4-dev, Teil 2):**
- Fix: ENGA MAP-Koordinaten (`mapParent === 'ENGA'` in lv=4-Handler + `geoLines()` im Writer)
- Fix: Leere DATE/PLAC-Werte — `date`/`place` initialisiert mit `null` statt `''` in allen Event-Objekten; Writer prüft `!== null`, schreibt `2 DATE` ohne trailing space bei Leerstring → behebt 7× INDI/BIRT/DATE + 7× INDI/BIRT/PLAC
- Fix: DATE/PLAC-Diagnose im Roundtrip-Test auf Auto-Diff-Mechanismus umgestellt
- sw.js v30 → v31 → v32 → v33
- Roundtrip-Delta: **≈0** (alle inhaltlichen Verluste behoben)

Testdaten: MeineDaten_ancestris.ged — 2796 Personen, 873 Familien, 114 Quellen, 11 Archive

---

## Roundtrip-Status (final — 2026-03-26)

Verbatim Passthrough (ADR-012): `_ptDepth`/`_passthrough[]` auf INDI/FAM/SOUR + `_extraRecords[]` für unbekannte lv=0 Records + `_ptTarget` für Capture-Redirect + `_ptNameEnd` für NAME-Kontext-Trennung.
Delta-Verlauf: -708 → -290 → -226 → -179 → ~-100 → -126 (Sprint 12) → **-84** (Sprint 13) → ~-12 (2026-03-24) → **-7** → **roundtrip_stable=true** (2026-03-26).
Letzte Fixes (gedcom.js, commit b692f23): ADDR-Sub-Tags via `addrExtra`+`_ptDepth`, mehrfache SOURs unter `_FREL/_MREL` via `frelSourExtra/mrelSourExtra`+`_ptDepth=3`, `2 NICK` NAME-Kontext-Passthrough via `_ptNameEnd`.
Akzeptierte Verluste (net_delta=7): HEAD-Rewrite (Ancestris-Meta → App), `3 MAP` doppelt unter `2 PLAC` (erster verloren), bare `1 CHAN`, `1 REFN`/`1 _VALID` Edge-Cases.

**Passthrough-Mechanismen (9 Stück — Details in ARCHITECTURE.md ADR-012):**
`_passthrough[]` · `ev._extra[]` · `addrExtra[]` · `frelSourExtra[]`/`mrelSourExtra[]` · `sourceExtra{}` · `topSourceExtra{}` · `media._extra[]` · `childRelations.sourExtra{}` · `extraRecords[]`

**Passthrough-Optimierungspotenzial (kein Datenverlust, aber im UI nicht editierbar):**
- CENS, CONF, FCOM, ORDN, RETI, PROP, WILL, PROB → in EVENT_LABELS aber nicht als events[] strukturiert
- DIV, DIVF → FAM-Events fehlen im Parser
- Mehrere inline INDI-Notes → werden konkateniert statt als Array

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
- **Geschlecht im Baum**: `data-sex="M/F/U"` Attribut + CSS `border-left` Farbe (kein Symbol mehr)
- **Bottom-Nav**: 6 Tabs (Baum ⧖ · Personen 👤 · Familien ⚭ · Quellen 📖 · Orte 📍 · Suche 🔍)

## Sanduhr-Karten-Dimensionen
- Regulär: W=96, H=64 · Zentrum: CW=160, CH=80
- HGAP=10, VGAP=44, MGAP=20, SLOT=106, PAD=20, ROW=108
- Namen: `_treeShortName(p, isCenter)` — Limit 18 (regulär) / 26 (Zentrum) Zeichen, dann Initialen

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

## Globale Variablen (index.html v3.0 — komplett)
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

## Neue Hilfsfunktionen (index.html v3.0)
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

// Baum-Namen (2026-03-25):
function _treeShortName(p, isCenter)                        // lange Namen → Initialen (J. W. Müller)

// Globale Suche (2026-03-25):
function bnavSearch()                                       // 6. Bottom-Nav Tab
function runGlobalSearch(q)                                 // Personen+Familien+Quellen+Orte
```

## Phase 3 Sprint-Plan (v3.0)
- P3-1 ✅ IndexedDB + Familien-Sortierung
- P3-2 ✅ Fotos (Base64, max 800px JPEG, IDB-Storage, Sidecar-JSON Export/Import)
- P3-3 ✅ Suche/Filter (Volltext alle Tabs + Geburtsjahr-Bereichsfilter)
- P3-4 ✅ Service Worker (`sw.js`) + `manifest.json` → offline-fähig
- P3-5 ✅ Baum: Vorfahren (2 Ebenen), Mehrfach-Ehen, Halbgeschwister, Pinch-Zoom
- P3-6 ✅ Revert-to-Saved + Keyboard-Shortcuts (Cmd+S/Z/Escape/←)
- P3-7 ✅ Responsives Desktop-Layout (Zweispalten ab 900px)
- P3-8 ✅ OneDrive-Integration (PKCE OAuth, Graph API, Foto-Import)

## Offene Architektur-Schulden (aus Review 2026-03-25)
- State-Management: ~27 globale Variablen, keine Schichtentrennung
- Single-File ab ~7000 Zeilen aufteilen (parser.js, writer.js, storage.js als ES-Module)
- Virtuelles Scrollen für Listen >1000 Einträge
- Cmd+Z = "Revert to Saved" (nicht granulares Undo) — dokumentiert, aber UX-Problem

## Nutzer-Präferenzen
- Sprache: Deutsch · Kommunikation: kurz und direkt · Keine Emojis
