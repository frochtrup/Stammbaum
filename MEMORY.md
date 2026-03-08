# Stammbaum PWA — Projekt-Memory

## Projekt-Überblick
- **Was:** Genealogie-Editor als Single-File PWA (`index.html`)
- **Ziel:** iPhone/iPad + Desktop, GEDCOM 5.5.1, kein Server, kein Build-Step
- **Stack:** Vanilla JS, kein Framework, kein npm
- **Pfad:** `/Users/franzdecker/Library/Mobile Documents/com~apple~CloudDocs/Genealogie/AppDev/files/`

## Dateien
- `index.html` — gesamte App (v2.0, Phase 2 abgeschlossen, ~4700 Zeilen)
- `index_v1.2.html` — Archiv: Version 1.2 (Phase 1)
- `README.md` — Schnellstart, Feature-Übersicht, Workflow iPhone↔Mac
- `ARCHITECTURE.md` — ADRs, Datenmodell, JS-Sektionen, CSS-Design-System, Sanduhr-Algorithmus
- `GEDCOM.md` — Parser/Writer-Referenz, alle unterstützten Tags
- `ROADMAP.md` — Phasen-Übersicht, offene Features, bekannte Probleme
- `MEMORY.md` — dieses Dokument (auch unter `.claude/projects/.../memory/MEMORY.md`)
- `.claude/launch.json` — Dev-Server: `python3 -m http.server 8080`

## Aktueller Stand — zuletzt aktualisiert: 2026-03-08
- `index.html` v2.0 ✅ stabil (Phase 2 abgeschlossen, Sprints 1–8)
- `index_v1.2.html` — Archiv v1.2 (Phase 1)
- E2 Ancestris-Import-Test: manuell offen

Testdaten: MeineDaten_ancestris.ged — 2796 Personen, 873 Familien, 114 Quellen, 11 Archive

---

## Version 1.2 — Neue Features (März 2026)

### REPO-Feature: Archive/Repositories
- `db.repositories` — neues Dictionary `{ '@R1@': { id, name, addr, phon, www, email, lastChanged } }`
- Parser: `0 @Rxx@ REPO` records + `1 REPO` / `2 CALN` in SOUR
- Writer: `0 @Rxx@ REPO` vor `0 TRLR`, `2 CALN` nach `1 REPO` in SOUR
- `currentRepoId = null` — State analog zu `currentPersonId`
- `_pendingRepoLink = { sourceId }` — gesetzt vor `showRepoForm(null)` aus Quellen-Formular
- `showRepoDetail(id)`, `showRepoForm(id)`, `saveRepo()`, `deleteRepo()`
- `#modalRepo` — Archiv-Formular (Name, Adresse, Telefon, Website, E-Mail)
- `#modalRepoPicker` — Archiv-Picker im Quellen-Formular mit Suche + "Neues Archiv"
- Quellen-Formular: `sf-repo-display` (klickbar, zeigt Name), `sf-caln` (Signatur, nur bei @Rxx@)
- Quellen-Detail: `s.repo` als klickbarer Link wenn `@Rxx@` → `showRepoDetail()`
- Quellen-Liste: `.repo-badge` (🏛) klickbar → `showRepoDetail()` + `🏛 Archive`-Sprungbutton
- Quellen-Tab: "Archive"-Sektion mit `renderRepoList()` nach Source-Liste
- Navigation: `_beforeDetailNavigate` + `goBack()` unterstützen `type:'repo'`

### Speichern/Export neu (Desktop)
- `showOpenFilePicker()` → `requestPermission({mode:'readwrite'})` → `testCanWrite()` → `_fileHandle` + `_canDirectSave`
- Chrome Mac: direktes Speichern via `_fileHandle.createWritable()` (kein Download-Dialog)
- Safari/Firefox Mac: `<a download>` → Browser-Download-Ordner
- iOS: Share Sheet unverändert (Hauptdatei + Zeitstempel-Backup)
- Bei `<a download>`: Zeitstempel-Backup des Originals + aktuelle Version (zwei Downloads)
- `updateSaveIndicator()`: Save-Buttons zeigen Tooltip mit aktivem Modus + Dateiname; setzt `direct-save`-Klasse (goldfarben) wenn `_canDirectSave`
- `restoreFileHandle()`: stellt `_fileHandle` aus IndexedDB nach Page-Reload wieder her
- `testCanWrite(fh)`: prüft Schreibfähigkeit via `createWritable()` + sofortiges `abort()` (keine Dateiänderung)

---

## Version 1.1 — Neue Features (März 2026)

### Neue Beziehungen modellieren
- `#modalRelPicker` — Beziehungs-Picker Bottom-Sheet für Ehepartner / Kind / Elternteil
- Einstieg über `+ Ehepartner` / `+ Kind` / `+ Elternteil` direkt in Detailansichten
- Flow: bestehende Person wählen **oder** neue Person erstellen → Familien-Formular vorausgefüllt
- `_pendingRelation = { mode, anchorId }` — gesetzt vor `showPersonForm()`, ausgewertet in `savePerson()`
- `openRelFamilyForm(anchorId, partnerId, mode)`: erkennt freien Slot in bestehender Elternfamilie
- `showFamilyForm(id, ctx?)`: `ctx = { husb, wife, addChild }` für Vorausfüllung

### Verbindungen trennen
- `.unlink-btn` — 24px kreisförmiger ×-Button in `.rel-row`
- `unlinkMember(famId, personId)` — erkennt husb/wife/child, aktualisiert beide Seiten
- Person-Detail: `×` bei Ehepartner + Kindern; `×` am Herkunftsfamilien-Header
- Familien-Detail: `×` bei allen Mitgliedern

### UI-Verbesserungen
- Zentrum-Karte: CW=120 → CW=160 px
- `.section-add`-Buttons: `min-width: 100px; text-align: center; flex-shrink: 0`
- `.section-head` — Flexbox-Kopfzeile mit Titel + Add-Button
- Sektionen „Ehepartner & Kinder" + „Eltern" immer sichtbar (auch ohne Einträge)
- `+ Kind` auch in Personen-Detailansicht (pro Familien-Block)

---

## Roundtrip-Status

**index.html v2.0:** Roundtrip-Test stabil mit Sprints 1–8. Verbleibende Verluste: `_STAT`, `2 SOUR` unter `RELI`. Details in ARCHITECTURE.md.

---

## Globale Variablen (index.html v2.0 — komplett)
```javascript
let db = { individuals:{}, families:{}, sources:{}, extraPlaces:{}, repositories:{}, notes:{}, placForm:'' };
//         ^v2: notes={} für NOTE-Records; placForm='' für HEAD PLAC FORM
let changed = false;
let _placesCache = null;
let currentPersonId = null; let currentFamilyId = null; let currentSourceId = null;
let currentRepoId = null;
let currentTab = 'persons'; let currentTreeId = null;
const srcWidgetState = {};  // {prefix: {ids: Set, pages: {sid:page}, quay: {sid:quay}}}
//  ^Architektur-Fix: ersetzt srcState + srcPageState + srcQuayState
let _originalGedText = null;  // RAM-Fallback falls localStorage-Backup fehlschlägt
let _idb = null;
let _fileHandle = null; let _canDirectSave = false;
const _navHistory = []; // _skipHistoryPush entfernt → pushHistory-Parameter auf show-Funktionen
// v1.1 Beziehungs-Picker:
let _relMode = ''; let _relAnchorId = ''; let _pendingRelation = null;
// v1.2 REPO:
let _pendingRepoLink = null;
// v2.0 PLAC-Toggle:
const _placeModes = {};  // { placeId: 'free'|'parts' }
```

---

## Architektur-Schlüsselentscheidungen
- Single-File HTML (ADR-001) · Vanilla JS (ADR-002) · Globales `db` (ADR-003)
- localStorage cacht GEDCOM-Text (ADR-004) · iOS `accept="*/*"` (ADR-005)
- Desktop Chrome: `showOpenFilePicker()` + `requestPermission({mode:'readwrite'})` → direktes Speichern (ADR-007)
- Desktop Safari/Firefox: `<a download>` Fallback (ADR-007)
- BIRT/CHR/DEAT/BURI als Sonder-Objekte via `_SPECIAL_OBJ` (ADR-008)
- Globale Bottom-Nav außerhalb Views, z-index 400 (ADR-009)
- PLAC-Toggle: `_placeModes[placeId]` = 'free'|'parts'; `initPlaceMode/togglePlaceMode/getPlaceFromForm` (ADR-010)
- 3-Felder-Datum: `normMonth()`, `writeDatePartToFields()`, `readDatePartFromFields()`, `buildGedDateFromFields()` (ADR-011)

## Sanduhr-Karten-Dimensionen
- Regulär: W=96, H=64 · Zentrum: CW=160, CH=80
- HGAP=10, VGAP=44, MGAP=20, SLOT=106, PAD=20, ROW=108

## index.html — Sprint-Status (v2.0)
| Sprint | Inhalt | Status |
|---|---|---|
| 1 | A1 HEAD, A2 CHAN.TIME, A3 CONT-Split, A4 OBJE-FORM, A5 DATE-Norm | ✅ |
| 2 | B3 FACT+MILI Parser, B4 RESN/EMAIL/WWW, B5 CHAN.TIME parsen | ✅ |
| 3 | B1 NOTE-Records Roundtrip | ✅ |
| 4 | B2 QUAY Parser+Writer (`sourceQUAY: {}`) | ✅ |
| 4b | Roundtrip-Test als In-App-Funktion (`runRoundtripTest`) | ✅ |
| 5 | D1–D6 UI: FACT+TYPE, QUAY-Widget, ENGA, RESN/EMAIL/WWW | ✅ |
| 6a | C1+D3 Strukturiertes Datum: Qualifier + 3-Felder-Eingabe | ✅ |
| 6b | C2+D4 PLAC.FORM aus HEAD + Orts-Toggle Freitext ↔ 6-Felder | ✅ |
| 7 E1 | Roundtrip-Test erweitert (Sprint 5/6-Tags), stabil | ✅ |
| 7 E2 | Ancestris-Import-Test | manuell offen |
| 8 | UI/UX-Fixes (B1–B14, Sprint A/B/C) | ✅ |
| 9 | URL-Parameter `?datei=`: Dateiname in Topbar (`updateTopbarTitle`, `#topbarFileName`) | ✅ |

## Neue Hilfsfunktionen (index.html v2.0)
```javascript
// Gemeinsamer Datum-Parser (Code-Review-Fix 5):
function _parseDatePart(s)                                  // '12 MAR 1845' → {d,m,y} — eliminiert doppelte Regex

// Original-Text-Zugriff (Architektur-Fix 5):
function _getOriginalText()                                 // lazy: localStorage('stammbaum_ged_backup') || _originalGedText

// 3-Felder-Datum (Sprint 6a):
function normMonth(s)                                       // 'März'/'3'/'MAR' → 'MAR' (validiert gegen _GED_MONTHS)
function writeDatePartToFields(baseId, dateStr)             // '12 MAR 1845' → d/m/y-Felder (nutzt _parseDatePart)
function readDatePartFromFields(baseId)                     // d/m/y-Felder → '12 MAR 1845'
function buildGedDateFromFields(qualId, baseId, date2Id)   // → 'BET 1880 AND 1890'
function fillDateFields(qualId, baseId, date2BaseId, raw)   // nutzt writeDatePartToFields
function onDateQualChange(selectEl, date2Id)                // zeigt/versteckt *-group div

// PLAC-Toggle (Sprint 6b):
const _placeModes = {}                                      // {placeId: 'free'|'parts'}
function getPlacLabels()                                    // db.placForm → ['Dorf','Stadt',...]
function buildPlacePartsHtml(placeId)                       // HTML für 6 Felder
function fillPlaceParts(placeId, raw)                       // 'A, B, C' → Felder füllen
function joinPlaceParts(placeId)                            // Felder → 'A, B, C'
function getPlaceFromForm(placeId)                          // je nach Modus free oder parts
function initPlaceMode(placeId)                             // Freitext-Modus setzen; Button-Text '⊞ Felder'
function togglePlaceMode(placeId)                           // wechseln free↔parts; Button-Text '⊞ Felder'/'⊠ Freitext'

// Familien-Formular Kinder-Display (UI/UX-Sprint):
function _refreshChildDisplay()                             // ff-children-display mit Klarnamen befüllen

// URL-Parameter + Topbar (Sprint 9):
function updateTopbarTitle(filename)                        // #topbarFileName span: ' · Dateiname' setzen
// window.load: URLSearchParams('datei') → updateTopbarTitle; _processLoadedText + tryAutoLoad überschreiben
```

## Code-Review + Architektur-Fixes (2026-03-08)

### Code-Review-Fixes (7 Issues)
| # | Priorität | Fix |
|---|---|---|
| 1 | Kritisch | `confirmNewFile`: `db` init fehlten `repositories`, `notes`, `placForm` |
| 2 | Hoch | `idCounter`-Kalibrierung nach Parse (verhindert ID-Kollisionen) |
| 3 | Hoch | `saveEvent`: `sourceQUAY` für BIRT/DEAT/CHR/BURI-Sonderobjekte ergänzt |
| 4 | Mittel | `tryLS()`: localStorage-Fehler zeigt Toast statt silent fail |
| 5 | Niedrig | `_parseDatePart()`: gemeinsamer Parser, eliminiert doppelte Regex |
| 6 | Niedrig | `normMonth()`: Fallback validiert gegen `_GED_MONTHS` |
| 7 | Info | Redundantes `normGedDate` im BET-Zweig von `parseGedDate` entfernt |

### Architektur-Fixes (6 Issues)
| # | Priorität | Fix |
|---|---|---|
| 1 | Hoch | `_skipHistoryPush` entfernt → `pushHistory = true` Parameter auf show-Funktionen |
| 2 | Hoch | `srcState/srcPageState/srcQuayState` → `srcWidgetState` (ein Objekt) |
| 3 | Hoch | `closeModal()` räumt `_pendingRelation` + `_pendingRepoLink` auf |
| 4 | Mittel | `renderTab()`: Guard — kein Rebuild wenn `#v-main` nicht aktiv |
| 5 | Mittel | `_getOriginalText()`: lazy loader (bevorzugt `stammbaum_ged_backup` in localStorage) |
| 6 | Mittel | Einheitliche Fehlerbehandlung: `console.error` + Toast in `readFile` + `saveToFileHandle` |

## UI/UX-Fixes Sprint (2026-03-08)

### Sprint A — Sofort-Fixes
| Befund | Fix |
|---|---|
| B2 Ghost-Karten kaum sichtbar | `.tree-card-empty` opacity 0.18 → 0.40 |
| B6 Menü "Schließen" unklar | Text → "Datei schließen" |
| B11 "2.0-dev" sichtbar | Hilfe-Modal: "Version 2.0" |
| B9 FAB überdeckt letzten Listeneintrag | `padding-bottom` ergänzt für `#familyList`, `#sourceList`, `#placeList`, `#repoList` |
| B13 Section-Header zu klein | `.section-title` 0.68rem → 0.75rem |

### Sprint B — Konsistenz-Fixes
| Befund | Fix |
|---|---|
| B4 BIRT-Typ sieht editierbar aus | CSS `#ef-type:disabled`: `appearance:none`, kein Pfeil, Farbe normal |
| B5 ORT-Toggle ohne Label | `initPlaceMode/togglePlaceMode`: Button-Text "⊞ Felder" / "⊠ Freitext" |
| B7 AUFBEWAHRUNGSORT kein Rahmen | `#sf-repo-display` inline-style: border + background wie Formularfeld |
| B3 GEDCOM-IDs sichtbar | `showDetail/showFamilyDetail/showSourceDetail/showRepoDetail`: ID entfernt, nur lastChanged |
| B12 Topbar name truncation | `.topbar-title`: `overflow:hidden; text-overflow:ellipsis; white-space:nowrap` |
| B14 ☁-Icon Farbe | `☁️`→`☁` (erbt CSS); `updateSaveIndicator()` setzt `direct-save`-Klasse (goldfarben) |

### Sprint C — Kinder-Feld
| Befund | Fix |
|---|---|
| B1 Familien-Formular zeigt rohe @Ixx@-IDs | `#ff-children-display` (Klarnamen) + `<input type="hidden" id="ff-children">`; `_refreshChildDisplay()` |

### Ausgeschlossen
- B8 Desktop-Layout → Phase 3
- B15 Familien-Avatar → Phase 3

---

### Offene Architektur-Issues (nicht behoben — Phase 3)
| # | Issue | Risiko | Geplant |
|---|---|---|---|
| A | **String-Rendering** — `innerHTML` + `esc()` in allen Render-Funktionen; kein echter HTML-Sanitizer | XSS bei manipulierten GEDCOM-Dateien; vollständiger List-Rebuild bei jeder Änderung (Performance) | Phase 3: Komponentenbasiertes Rendering |
| B | **Globale Variablen** — noch ~11 `let`-Variablen nach Fix; verschleierte Abhängigkeiten, schwer testbar | Refactoring-Aufwand steigt mit jeder neuen Funktion | Phase 3: Store-Muster |

---

## Nächste Schritte (nach UI/UX-Sprint)
- E2 Ancestris-Import-Test: manuell mit MeineDaten_ancestris.ged
- Danach Phase 3 (Version 2.0 final):
  - Architektur-Redesign: Komponentenbasiertes Rendering
  - OneDrive-Integration: Microsoft Graph API (PKCE OAuth)
  - UI: Responsives Layout Desktop, Dunkelmodus
  - Features: Fotos, erweiterte Suche/Filter, Undo/Redo, Service Worker

## Nutzer-Präferenzen
- Sprache: Deutsch · Kommunikation: kurz und direkt · Keine Emojis
