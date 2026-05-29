# Architektur

Architektur-Entscheidungen (ADRs), Passthrough-System, Speicher-Architektur.
Datenmodell: `DATAMODEL.md` · UI/CSS/Layout: `UI-DESIGN.md` · Sprint-Geschichte: `CHANGELOG.md`

---

## Überblick

```
┌──────────────────────────────────────────────────────────┐
│      Stammbaum PWA v8.0 · vollständige Dateiliste:       │
│      README.md  ·  sw-Version: ROADMAP.md                │
│  Vanilla JS · Kein Framework · Kein Build-Step           │
│  ~52 JS-Dateien · ~30 000 Zeilen                         │
│                                                          │
│  ── App-Shell ───── index.html, styles.css,              │
│                      offline.html, manifest.json         │
│                                                          │
│  ── Kern ─────────── State/Labels/Typen (gedcom.js)      │
│                       GEDCOM Parser · Writer · Worker    │
│                       GRAMPS Parser · Writer             │
│                       Validator (gedcom-validator.js)    │
│                                                          │
│  ── Speicher ──────── IDB + File System API              │
│                        (storage-file.js, storage.js)    │
│                                                          │
│  ── Views ─────────── ~22 Dateien:                       │
│                        Listen + Detail (Pers/Fam/Quell)  │
│                        Baum: Sanduhr + Nachkommen        │
│                        Fan Chart · Zeitleiste · Karte    │
│                        Story · Statistik · Suche         │
│                        Aufgaben · RLOG · Validierung     │
│                        Nav · Undo · Event-Delegation     │
│                                                          │
│  ── Formulare ──────── Person · Familie · Ereignis       │
│                         Archiv · Medien (5 Dateien)      │
│                                                          │
│  ── Tools ─────────── Duplikat-Erkennung · Import-Merge  │
│                        Druck · Buchgenerator · Debug     │
│                                                          │
│  ── OneDrive ──────── OAuth PKCE · Import · File-I/O     │
│                                                          │
│  ── Service Worker ── sw.js (Network-first + 4s Timeout) │
│  ── Assets ────────── Leaflet · demo.ged                 │
└──────────────────────────────────────────────────────────┘
```

**Größe gesamt:** ~52 JS-Dateien · ~30 000 Zeilen

---

## Architektur-Entscheidungen (ADRs)

### ADR-001: Multi-File (HTML-Shell + JS-Module)

**Entscheidung (ab v3.0):** `index.html` ist reine App-Shell. JavaScript in thematisch getrennten Dateien; alle Funktionen global (kein `import/export`). `<script src="...">` Reihenfolge muss Abhängigkeiten respektieren — `ui-event-delegation.js` muss als letztes `<script>` stehen.

**Storage-Schichtung:** `storage-file.js` ist die I/O-Schicht (IDB, File System Access API, Export/Import). `storage.js` ist die Persistenz-Schicht (Auto-Load, Backup, Demo) und baut auf `storage-file.js` auf.

**Warum:**
- Einzelne Dateien bleiben ohne vollständigen Download/Upload editierbar
- Klare Trennung: Parser / Storage / Rendering / Formulare
- Kein npm, kein Webpack, kein Build-Prozess

**Konsequenz:** Kein echtes Modul-System — alle Funktionen global; kein Tree-Shaking.

---

### ADR-002: Vanilla JavaScript, kein Framework

**Entscheidung:** Kein React, Vue, Angular. Listen werden bei jeder Änderung neu gerendert:

```javascript
function renderPersonList(persons) {
  el.innerHTML = persons.map(p => `<div ...>${esc(p.name)}</div>`).join('');
}
// Nach jeder Änderung manuell aufrufen:
markChanged(); renderTab();
```

---

### ADR-003: AppState/UIState als State-Namespaces (ab v4.0)

**Entscheidung:** Globale Variablen in 2 Namespace-Objekte in `gedcom.js` migriert. `AppState` hält persistente Werte (`db`, `currentPersonId`, `changed`, `_fileHandle` …), `UIState` hält UI-Zustand (`_treeScale`, `_navHistory`, `_fanGenCount` …).

**Undo/Redo:** `pushUndo(label, snapshot)` in `ui-views-undo.js` speichert Zustand-Snapshots (bis 30 Einträge). `applyUndo()`/`applyRedo()` stellt Datensätze wieder her. Snapshot enthält `personIds`/`familyIds` der betroffenen Datensätze — keine komplette DB-Kopie.

**Einschränkung:** Bei Seitenreload sind ungespeicherte Änderungen weg (außer Auto-Load aus IDB). Cmd+Z löst `applyUndo()` aus wenn der Stack befüllt ist; bei leerem Stack (z.B. direkt nach Load) Fallback auf `revertToSaved()`. Details: `DATAMODEL.md`.

---

### ADR-004: IndexedDB für Auto-Load

**Entscheidung:** GEDCOM-Text primär in IndexedDB gecacht. localStorage ist stiller Fallback.

**Vollständige IDB-Key-Tabelle:** → `DATAMODEL.md` → IDB-Keys

**Warum IDB:** localStorage-Limit ~5–10 MB; MeineDaten.ged ≈ 5 MB war grenzwertig. Es wird der GEDCOM-Text gecacht, **nicht** das `db`-Objekt — `Set`-Objekte (`sourceRefs`) lassen sich nicht mit `JSON.stringify` serialisieren.

---

### ADR-005: iOS-spezifische Datei-Behandlung

**Problem:** iOS Safari erkennt `.ged` nicht als gültigen MIME-Type.
**Lösung:** `accept="*/*"` — alle Dateitypen erlauben.

**Download auf iOS:** Zwei Dateien über Share Sheet:
```javascript
navigator.share({ files: [mainFile, backupFile], title: filename });
// User wählt „In Dateien sichern" → iCloud Drive
```

---

### ADR-006: Geo-Koordinaten — lesen + über Orte-Tab editieren

**Entscheidung (v7.0):** Koordinaten gehören zum Ort, nicht zum Ereignis. Koordinaten werden über den Orte-Tab bearbeitet und wirken automatisch auf alle Ereignisse an diesem Ort. Beim Schreiben schlägt `geoLines()` zuerst in `AppState.db.extraPlaces[placeName]` nach, Fallback auf `obj.lati/obj.long`.

Der Parser behandelt MAP auf Level 2 **und** Level 3 (Legacy-Format einiger Exportprogramme).

---

### ADR-007: Desktop-Speichern via `showOpenFilePicker` + `createWritable`

**Entscheidung:** Beim Öffnen auf Chrome Desktop wird `showOpenFilePicker()` verwendet und sofort Schreiberlaubnis per `requestPermission({ mode: 'readwrite' })` angefragt.

```
Chrome Mac:  showOpenFilePicker() → requestPermission(readwrite) → _canDirectSave=true
             exportGEDCOM() → fileHandle.createWritable() → write → close

Safari/Firefox:  <input type="file"> → kein fileHandle
                 exportGEDCOM() → _downloadBlob() → <a download> → ~/Downloads
                 + Timestamped-Backup wenn Inhalt geändert
```

**Wichtig:** `showDirectoryPicker()` schlug auf macOS + iCloud Drive fehl (`NotAllowedError`). `showOpenFilePicker()` mit explizit angefragter Schreiberlaubnis funktioniert (Chrome).

---

### ADR-008: BIRT/CHR/DEAT/BURI als Sonder-Events

**Entscheidung:** Die vier Hauptereignisse sind eigene Objekte auf der Person, nicht in `events[]`.

```javascript
p.birth = { date, place, lati, long, sources, sourcePages, sourceQUAY,
            sourceExtra, sourceNote, sourceMedia, _extra, value, seen }
p.chr   = { ... }
p.death = { ..., cause }
p.buri  = { ... }
p.events = [ { type, date, place, ... } ]  // alle anderen
```

Zuordnung via `SPECIAL_EVENT_KEYS` in `gedcom.js`; `_SPECIAL_OBJ` in `ui-forms-event.js` ist ein Alias darauf. `seen`-Flag: `seen:false` → `1 BIRT`-Block ohne Sub-Tags wird trotzdem roundgetripped.

---

### ADR-009: Globale Bottom-Navigation

**Entscheidung:** Persistente Bottom-Nav außerhalb aller `.view`-Divs. 6 Tabs: **Baum ⧖ · Personen 👤 · Familien ⚭ · Quellen 📖 · Orte 📍 · Aufgaben ☑**

```
v-landing → [v-main | v-tree] ↔ v-detail
             ↑_______________________↑
             Bottom-Nav (persistent, z-index 400)
```

**Sichtbarkeit:** `flex` in `v-main` + `v-tree`, `none` in `v-landing` + `v-detail`.

---

### ADR-010: PLAC-Toggle

**Entscheidung:** Orts-Eingabe wechselt zwischen Freitext und strukturierten PLAC.FORM-Feldern.

```javascript
const _placeModes = {};  // { placeId: 'free'|'parts' }
initPlaceMode('ef-place');
togglePlaceMode('ef-place');
getPlaceFromForm('ef-place');  // liest je nach Modus Freitext oder joinPlaceParts()
```

---

### ADR-011: 3-Felder-Datum

**Entscheidung:** Datumseingabe als 3 separate Felder (Tag / Monat / Jahr) + Qualifier-Dropdown.

```javascript
readDatePartFromFields('ef-date')               // → '12 MAR 1845'
writeDatePartToFields('ef-date', '12 MAR 1845') // → füllt Felder
normMonth('März') → 'MAR'; normMonth('3') → 'MAR'
buildGedDateFromFields('ef-date-qual', 'ef-date', 'ef-date2') // → 'BET 1880 AND 1890'
```

---

### ADR-012: Verbatim Passthrough für unbekannte GEDCOM-Tags

**Entscheidung:** Unbekannte GEDCOM-Tags werden verbatim in `_passthrough[]` (oder spezialisierten Arrays) gespeichert und beim Schreiben exakt wieder ausgegeben — kein Datenverlust bei unbekannten Tags.

**Kern-Mechanismus:**
```javascript
let _ptDepth = 0;     // > 0: tiefere Ebenen → passthrough (oder _ptTarget)
let _ptTarget = null; // Redirect: statt _passthrough[] → spezialisiertes Array

// In INDI/FAM/SOUR lv=1 else-Zweig:
cur._passthrough.push('1 ' + tag + (val ? ' ' + val : ''));
_ptDepth = 1;
// lv > _ptDepth → capture; lv <= _ptDepth → Passthrough beenden
```

**Wichtig — lv > 4:** Zeilen mit Level > 4 werden in `_errors[]` protokolliert, aber der Passthrough läuft trotzdem — kein `continue` hier, sonst fallen z. B. `5 TYPE PHOTO` unter `4 FORM` unter OBJE in Event-SOUR weg (Regression sw v138, behoben sw v142).

**`_ptNameEnd`-Index:** NAME-Kontext lv≥2-Items am Array-Anfang → direkt nach dem NAME-Block ausgeben (nicht am Record-Ende nach CHAN).

---

### ADR-013: Pfad-basiertes Medien-Laden + od_base_path-Architektur

**Entscheidung:** `m.file` ist die einzige Wahrheitsquelle für Medien — immer **relativer Pfad** bezogen auf `od_base_path`.

```
od_base_path         = absoluter OneDrive-Pfad des GED-Datei-Ordners
                       (auto-abgeleitet via parentReference.path)
                       z.B. "Privat/Genealogie"

m.file (GEDCOM FILE) = relativer Pfad ab od_base_path
                       z.B. "Pictures/Hans_1890.jpg"

fullPath (API)       = od_base_path + '/' + m.file
```

**Laden (2-Schritt):**
```
1. _odGetMediaUrlByPath(relPath)
   → GET /me/drive/root:/{fullPath}?$select=@microsoft.graph.downloadUrl
   → Fetch downloadUrl (kein Auth-Header — CDN-URL)
   → FileReader → base64 Data-URL → IDB-Cache ('img:' + relPath)
2. IDB-Cache ('img:' + relPath)    ← persistent
3. Legacy: od_filemap              ← nur für Altdaten
```

**Deprecated:** `od_default_folder` / `od_doc_folder` (absoluter Pfad), `od_filemap` / `od_doc_filemap` (fileId-Index).

---

### ADR-014: PEDI statt _FREL/_MREL für Eltern-Kind-Verhältnis

**Entscheidung:** Eltern-Kind-Verhältnistyp als GEDCOM 5.5.1-Standard `PEDI` unter `FAMC` statt Ancestris-Extension `_FREL`/`_MREL`.

**GEDCOM 5.5.1-Ziel:**
```
1 FAMC @Fxx@
2 PEDI birth   ← birth | adopted | foster | sealing
2 SOUR @Sxx@
```

**Writer:** `frel == mrel` → `2 PEDI`; `frel ≠ mrel` → `_FREL`/`_MREL` (kein Datenverlust).
**Parser:** liest `PEDI` und `_FREL`/`_MREL` (Backward-Compat); `_FREL`/`_MREL` hat Vorrang.

---

### ADR-015: CSP ohne `unsafe-inline`

**Entscheidung:** Alle statischen `style=`-Attribute aus HTML und JS-Templates entfernt. Dynamische Werte via CSSOM (`el.style.display = 'flex'`) — CSP-sicher. `[hidden]` statt `style="display:none"` (ohne `!important` — damit bleibt `el.style.display = 'flex'` im JS lauffähig).

**Ausgangslage:** 501 CSP-kritische `style=`-Attribute (240 in `index.html`, 261 in JS).

**Strategie:** Utility-Klassen + Component-Klassen in `styles.css`; ID-spezifische Regeln; `hidden`-Attribut für show/hide. Abgeschlossen sw v690. Inline-Handler (`oninput`/`onclick`) durch Event-Delegation (`data-action`/`data-input`) ersetzt sw v686–v690.

---

### ADR-016: Einheitliches Tab-Header-Pattern

**Entscheidung:** Jeder Tab-Kopf hat genau zwei Zeilen:
1. `.tab-bar` — Primär-Modus-Umschalter (Underline, Gold-Strich)
2. `.filter-action-bar` — Filter-Icons links (`.filter-chips > .flt-btn`), Aktions-Buttons rechts (`.action-btns > .act-btn-icon`)

Gilt für alle neuen Tab-Köpfe in `ui-views-tasks.js`, `index.html` (tab-places) etc.

---

### ADR-017: Lebende-Anonymisierung beim GEDCOM-Export

**Entscheidung:** `_buildLivingSet(db)` in `gedcom-writer.js` klassifiziert Personen in 3 Phasen:
1. **Datumbasiert:** kein Sterbedatum + Geburtsjahr > (Jahr − 100) → lebend
2. **BFS-Propagation:** Verwandte einer lebenden Person → ebenfalls lebend
3. **Konservativ:** Personen ohne Datumsinformation → lebend

Anonymisierte INDI-Records enthalten nur: `NAME Lebende Person` · `SEX` · `FAMC`/`FAMS`-Links.

**Roundtrip-Abweichung:** Bewusst akzeptiert. Direct-Save deaktiviert bei Anon-Export. Dateiname erhält `_anon`-Suffix. Aktivierung: `AppState.privacyAnon` (IDB: `privacy_anon`).

---

### ADR-018: GEDCOM 7.0 — opt-in Export (sw v724–v733)

**Entscheidung (sw v724):** GEDCOM 7.0 als opt-in Exportmodus. GEDCOM 5.5.1 bleibt Standard. Der Parser liest beide Versionen.

**Schlüsseldesign-Entscheidungen:**
- `db.gedVersion: 'unknown' | '5.5.1' | '7.0'` — steuert den Writer, nicht den Parser
- `db.notes[].type: 'NOTE' | 'SNOTE'` — unified Note-Store; Writer gibt `0 NOTE` bzw. `0 SNOTE` aus
- `associations[].role` — einheitlich für GED5 `RELA`, GRAMPS `rel`, GED7 `ROLE`
- `extraPlaces[name].trans[]` — mehrsprachige Ortsalternativen (zentral, nicht pro Event)
- `_TRAN` als Vendor-Extension in GED5/GRAMPS für Orts- und Namensübersetzungen

**Cross-Transfer-Adapter (sw v732):**
- GED7 → GED5: `exids[]`→`REFN`, `noEvents`→Notiz, `SNOTE`→`NOTE`, `_TRAN` für Übersetzungen
- GED7 → GRAMPS: `noEvents`→`<attribute>`, `exids[]`→`<url>`, `datePhrase`→`datestr`

**Status: vollständig implementiert** (sw v725–v733). Toggle in modalSettings → GEDCOM-Version.

---

### ADR-019: Strict GEDCOM 5.5.1 Export (sw v749)

**Entscheidung:** Opt-in Exportmodus ohne alle `_`-prefixed Vendor-Tags. Ziel: maximale Kompatibilität mit Fremdsoftware (Ancestry, MacFamilyTree, Ahnenblatt).

**Implementierung:**
- `_strictGed`-Flag in `gedcom-writer.js`, analog zu `_ged7`
- `writeGEDCOM(updateHeadDate, forceGed7, forceStrict)` — neuer dritter Parameter
- IDB-Key `strict_ged`; `AppState.strictGed`; Toggle in modalSettings
- Dateiname erhält Suffix `_strict.ged`; nie direkt speichern

**Tag-Behandlung:**

| Tag(s) | Behandlung |
|--------|-----------|
| `_UID` | → `1 REFN <uuid>` + `2 TYPE UID` |
| `_RUFNAME` | → `2 NICK <rufname>` |
| `_TRAN` (PLAC/NAME) | → `NOTE [lang] value` je Übersetzung (informativ, nicht re-importierbar) |
| `_FREL`/`_MREL` in INDI/FAMC gleich | → `PEDI` (kein Verlust) |
| `_FREL`/`_MREL` in INDI/FAMC verschieden | → `PEDI adopted` gewinnt + `NOTE Stammbaum: _FREL=… _MREL=…` |
| `_FREL`/`_MREL` in FAM/CHIL | → weglassen (PEDI steht korrekt im INDI-FAMC) |
| `_GRAMPS_ID`, `_STAT` | → weglassen |
| `_TASK`/`_RLOG` | → weglassen (App-interne Daten) |
| `_SCBK`, `_PRIM`, `_DATE` an Medien | → weglassen |
| Passthrough/Extra-Arrays | → `_ptLines()` filtert `_`-Tags heraus |

**Roundtrip:** Strict-Modus ist stabil (out1 === out2), aber nicht verlustfrei — einige App-Daten werden nicht re-importiert.

---

### ADR-020: Inkrementelle ES-Modul-Migration via Brücken-Pattern (sw v751)

**Kontext:** ADR-001 (alle Funktionen global, kein Build-Step) hat bei ~34.000 Zeilen / 762 globalen Funktionen die Skalierungsgrenze erreicht (Namenskollisionsrisiko, fragile `<script>`-Ladereihenfolge, kein Tree-Shaking). Ein „Big-Bang"-Umstieg aller ~50 Dateien ist zu riskant.

**Entscheidung:** Schrittweise Migration auf echte ES-Module, ein Cluster nach dem anderen, mit einer **Brücke** je migriertem Cluster. **GRAMPS-Cluster** (`gramps-parser.js` + `gramps-writer.js`) als Pilot.

**Gemessene technische Erkenntnisse (Pilot):**
- **Module lesen klassische Globals.** Funktionsdeklarationen klassischer Skripte landen auf `window`, top-level `const`/`let` im *global lexical environment* — **beide aus ES-Modulen lesbar** (zur Laufzeit verifiziert: `citationObj` via `window`, `AppState` via global-lexical). → **Der Kern (`gedcom.js`) muss NICHT zuerst migriert werden**; Blattcluster können sofort umgestellt werden und lesen Kern-Globals weiter.
- **Ladereihenfolge bleibt erhalten.** `<script type="module">` ist implizit *deferred* → läuft nach allen klassischen Skripten, aber vor `DOMContentLoaded`. Die Brücke setzt `window.parseGRAMPS`/`writeGRAMPS` also vor jedem nutzerausgelösten Aufruf.
- **Brücken-Pattern:** Genau eine `type="module"`-Einstiegsdatei je Cluster (`gramps.bridge.js`) importiert die Public-API und legt sie via `Object.assign(window, …)` für die noch klassischen Konsumenten ab (storage-file, onedrive, compare-engine, ui-debug, debug-gramps — rufen unverändert global auf). Entfällt, sobald die Konsumenten selbst Module sind.
- **CSP unverändert:** `script-src 'self'` erlaubt Modul-Skripte ohne Anpassung.
- **Kein Cross-Dep** zwischen Parser und Writer → Pilot ohne gegenseitige Imports.
- **Test-Harness:** `test-roundtrip.js` lädt flach via `eval`/`vm` (kein Modul-Loader) → `_stripMod()` entfernt `export`/`import` vor dem Eval. `test-unit.js` unberührt (lädt keine GRAMPS-Dateien).

**Phasenplan (nach Messung re-skaliert):**
1. ✅ **Pilot (sw v751):** GRAMPS-Cluster → `export`; `gramps.bridge.js` als Modul-Brücke. Verifiziert: 2 Headless-Suiten grün + Browser (Boot fehlerfrei, Globals gesetzt, End-to-End Parse→Build, `AppState`/`citationObj` zur Laufzeit lesbar).
2. ✅ **Saubere Leaf-Cluster (sw v752):** Validator (`gedcom-validator.js` → `export`, `validator.bridge.js`). **Gemessener Befund, der die ursprüngliche Phase-2-Idee verwirft:** die GRAMPS-*Konsumenten* (storage-file, onedrive, ui-debug) sind **nicht** billig migrierbar — sie sind tief eingebettete Kern-Skripte mit vielen *eigenen* globalen Abhängern (z. B. `idbGet` aus storage-file.js wird von 13 Dateien genutzt), und die Lazy-Geladenen (compare-engine, debug-gramps) werden als klassische Skripte injiziert. Sie zu Modulen zu machen kaskadiert. → **Brücke kann erst schrumpfen, wenn der Kern koordiniert migriert ist.** Strategie daher: zuerst alle *sauber isolierten* Cluster migrieren (GRAMPS, Validator — beide leaf, ohne externe Nutzer ihrer Interna).
3. **Kern migrieren (der große Schritt):** `gedcom.js` + GEDCOM-Parser/Writer + die geteilte I/O-Schicht (`storage-file.js` mit `idbGet` etc.) → echte Module. Erst hiernach lösen sich die GRAMPS-Konsumenten + die meisten der 762 Globals.
4. **UI-Cluster + Bundling:** restliche Views/Forms; danach wird BUNDLING (esbuild/Rollup) sinnvoll.

**Betriebs-Hinweis (gemessen):** Beim Migrieren einer Datei auf `export` muss der Service-Worker-Cache invalidiert werden (`CACHE_NAME`-Bump). Sonst liefert ein alter SW eine gecachte `index.html`, die die Datei noch als klassisches `<script>` lädt → `SyntaxError` (`export` außerhalb Modul) → Symbol fehlt. Der Versionsbump pro Migrationsschritt löst das für Nutzer; in der Dev-Preview einmal SW abmelden + Cache leeren.

**Trade-off:** In der Brücken-Phase sind Kern-Abhängigkeiten *implizit* (global-lexical Reads statt expliziter Imports). Bewusst akzeptiert; der volle Nutzen (explizite Deps, Tree-Shaking) entsteht erst nach Phase 3–4.

---

## Passthrough-Mechanismen — Vollständige Analyse

10 distinkte Mechanismen sichern GEDCOM-Daten die der Parser nicht strukturiert verarbeitet:

| # | Feld | Kontext | Was landet drin |
|---|------|---------|-----------------|
| 1 | `db.extraRecords[]._lines[]` | lv=0 Records | SUBM und andere `@ID@`-Records komplett verbatim |
| 2 | `cur._passthrough[]` | INDI / FAM / SOUR | Unbekannte lv=1 Tags + Sub-Trees; NAME-Kontext lv≥2 (NICK etc.) |
| 3 | `ev._extra[]` / `marr._extra[]` / `birth._extra[]` etc. | Event-Kontexte | Unbekannte lv=2 Tags in Events |
| 4 | `ev.addrExtra[]` / `r.addrExtra[]` | ADDR-Kontext | Sub-Tags von ADDR: CITY, POST, CONT, _STYLE, _MAP, _LATI, _LONG |
| 5 | `frelSourExtra[]` / `mrelSourExtra[]` | FAMC + FAM CHIL | 2.+ SOUR unter _FREL/_MREL + deren 4-Level-Kinder (Legacy — Ancestris-Format) |
| 6 | `sourceExtra{}` | SOUR-Refs in Events | Verbatim lv=3 Tags unter `2 SOUR @ID@` in Event-Kontext (außer PAGE/QUAY/NOTE/OBJE) |
| 7 | `topSourceExtra{}` | INDI lv=1 SOUR | Unbekannte lv=2 Tags unter `1 SOUR @ID@` direkt auf INDI |
| 8 | `media._extra[]` | OBJE (inline) | Unbekannte Tags unter OBJE/FILE-Block |
| 9 | `childRelations.sourExtra{}` | FAM CHIL SOUR | Unbekannte lv=3 unter `2 SOUR` in CHIL-Kontext |
| 10 | `sourceMedia{}` / `sourMedia{}` | SOUR-Zitierungen | Inline OBJE-Blöcke unter `2 SOUR @ID@` in allen Event-Kontexten |

**`sourceMedia{}` (Mechanismus 10) — strukturiert, nicht verbatim:**
```javascript
// OBJE ohne @ref@ unter 2 SOUR → sourceMedia{} (strukturiert)
// OBJE mit @ref@ → bleibt in sourceExtra{} verbatim
sourceMedia[sId] = [{ file, scbk, prim, titl, note, _extra:[] }]
```

---

## Roundtrip-Delta-Verlauf (MeineDaten_ancestris.ged, 2811 Personen)

| Stand | Delta |
|---|---|
| Ausgangslage (Sprint 10) | -708 |
| + Verbatim Passthrough INDI/FAM | -226 |
| frelSeen/mrelSeen, extraRecords | -126 |
| alle OBJE-Kontexte | -84 |
| addrExtra, NICK-Position, _FREL-Space | **-7** |
| HEAD `_headLines[]`, ENGA vollständig, `seen`-Flag, MAP ohne PLAC | **≈0** |
| DIV/DIVF/ENG strukturiert (sw v134); ENGA passthrough-Filter (sw v135) | **≈0** |
| Parser lv>4 fix + `updateHeadDate=false` (sw v142) | **0** |
| `DSCR`/`IDNO`/`SSN` → `events[]` (sw v148) | **0** |
| writeGEDCOM() in Subfunktionen, FAM-events-Duplikation (sw v167) | **0** |
| CHAN NOTE CONC/CONT; FAM-OBJE @ref; `repoCalns[]` (sw v654–v656) | **-1** |
| m.note via pushCont(); DEAT CAUS _ptDepth=2; topSources lv=2-Fix; GIVN/SURN falsy (sw v658–v659) | **0** |
| `3 _TIME` via `_ptDepth=2; _ptTarget=obj._extra` (sw v660) | **0** |
| `2 SOUR @ref@` unter `1 NOTE @xref@` via `noteRefExtras{}` (sw v661) | **0** |
| `5 TYPE PHOTO` unter `2 OBJE` in INDI-Array-Events via `_ptDepth=4` (sw v662) | **0** |
| FAM `DIV`/`DIVF`-Events lv=4-Handler für OBJE→FILE (sw v663) | **0** |
| `3 SOUR @ref@` unter `2 CAUS` via `c.extra` (sw v664) | **0** |

`roundtrip_stable: true` · `net_delta=0` · `out1 === out2` — stabil auf allen Testdateien.

---

## Speichern/Backup-Architektur

```
exportGEDCOM()
    │
    ├── iOS: navigator.canShare → navigator.share({ files: [main, backup] })
    │         MeineDaten.ged + MeineDaten_YYYY-MM-DD_HHmmss.ged
    │
    ├── Chrome Mac: _fileHandle + _canDirectSave = true
    │   └── saveToFileHandle() → createWritable() → write → close
    │       Bei NotAllowedError (Cloud-Lock): Toast "Nochmals versuchen"
    │
    └── Safari Mac / Firefox:
        ├── _downloadBlob(originalText, MeineDaten_YYYY-MM_HHmm.ged)  ← Backup
        └── _downloadBlob(content, MeineDaten.ged)                    ← Aktuell

restoreFileHandle() (bei Seitenreload):
    └── idbGet('fileHandle') → queryPermission() === 'granted' → restauriert
```

---

## Bekannte Einschränkungen

| Problem | Ursache | Status |
|---|---|---|
| Cmd+Z mit leerem Stack = „Revert to Saved" | Wenn `_undoStack` leer ist (z.B. direkt nach Load), fällt Cmd+Z auf `revertToSaved()` zurück — korrekt so | Bekannt |
| Mehrere inline INDI-Notes beim Editieren zusammengeführt | `ui-forms.js` joind `noteTexts[]` beim Laden; speichert als einzelne Note — Roundtrip ohne Edit stabil | Backlog |
| localStorage-Limit | ~5 MB Limit; Toast-Warnung wenn voll | Bekannt |
| GRAMPS-Export: weniger `<note>`/`<citation>` als Original | Writer dedupliziert Notizen per Text-Key und Zitierungen per (Quelle, Seite, …)-Key; Referenzen zeigen auf gemeinsame Handles → kein Datenverlust, stabil über Roundtrip (analog PEDI-Delta bei GEDCOM). Vom Headless-Test (T0-TEST-2) als Warnung ausgewiesen, nicht als Fehler | Bekannt / by design |

**Test-Seams (T0-TEST-2, sw v750):** `_grampsBuildXMLText(db)` (synchron, ohne gzip/Blob) und `_grampsParseXMLText(xmlText)` (synchron, ohne `DecompressionStream`/`File`) erlauben den headless GRAMPS-Roundtrip-Test ohne Web-Plattform-APIs. `writeGRAMPS`/`parseGRAMPS` sind dünne async-Wrapper darum — Verhalten unverändert. Der Mini-DOMParser im Test ist abhängigkeitsfrei (kein npm).
