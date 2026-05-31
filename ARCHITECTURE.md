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

**Entscheidung Phase 3–4 (Mai 2026): zurückgestellt.** Kern-Migration hat drei harte Blocker: (1) `gedcom-worker.js` nutzt `importScripts()` — inkompatibel mit ES-Modulen ohne Worker-Umbau; (2) `idbGet` aus `storage-file.js` wird von 13 Dateien genutzt — Kaskade; (3) `gedcom.js` hat 59 top-level Symbole — fragile Brücke. Ein Build-Step (esbuild) würde den Nutzen erst vollständig erschließen, bricht aber die bewusst gewählte „edit-anywhere ohne Toolchain"-Eigenschaft (ADR-001/002). Für ein Solo-Projekt mit stabilem Testfundament (105 Unit-Tests + automatisierte Roundtrips) ist der Trade-off nicht rechtfertigbar. Trigger für Wiederaufnahme: starkes Codebase-Wachstum oder konkrete Namespace-Kollisionen. Die zwei vorhandenen Brücken (GRAMPS, Validator) bleiben stabil und harmlos.

---

### ADR-021: OAuth-Token-Speicherung — Restrisiko-Dokumentation (T0-TOKEN)

**Kontext:** Die PWA nutzt OAuth 2.0 PKCE (ohne Backend) für OneDrive-Zugriff. Access-Token, Refresh-Token und Ablaufzeit werden in `sessionStorage` gehalten (`onedrive-auth.js`).

**Risiko:** `sessionStorage` ist aus JavaScript lesbar. Ein XSS-Angriff könnte Tokens exfiltrieren.

**Warum `sessionStorage` statt sichererer Alternativen:**
- **Kein Backend** → kein sicherer HttpOnly-Cookie möglich; Token muss clientseitig liegen.
- **`sessionStorage` ist bewusste Wahl** gegenüber `localStorage`: Tokens leben nur für die Tab-Session, überleben keinen Browser-Neustart, sind nicht origin-übergreifend zugänglich.
- **`sessionStorage` ist nicht gegen XSS immun** — aber XSS ist bereits durch ADR-015 (CSP ohne `unsafe-inline`) + T0-XSS-Audit (166 `innerHTML`-Stellen, kein Vektor, `esc()` konsequent) auf ein sehr niedriges Restrisiko reduziert.
- **Alternativen ohne Backend nicht praktikabel:** Memory-only (Token verloren bei Reload, schlechte UX) · Service-Worker-Proxy (SW hat keinen sicheren Speicher, der für den Hauptthread unsichtbar ist) · IDB/localStorage (schlechter als `sessionStorage`, da persistent).

**Scope-Analyse — `Files.ReadWrite` vs. `Files.ReadWrite.AppFolder`:**
- `Files.ReadWrite.AppFolder` würde den Schadenradius bei Token-Kompromittierung auf `/Apps/{AppName}/` begrenzen.
- **Nicht umsetzbar ohne Azure-Portal-Änderung:** erfordert separate App-Registrierung mit expliziter `Files.ReadWrite.AppFolder`-Permission. Die aktuelle App-Registrierung ist auf `Files.ReadWrite` ausgestellt. Ein Wechsel würde alle bestehenden Nutzer-Autorisierungen invalidieren und erfordert Zugriff auf das Azure-Portal.
- **Keine Verbesserung für Stammbaum-Zugriff:** die App liest/schreibt `.ged`- und `.gramps`-Dateien aus dem vom Nutzer gewählten Ordner — dieser liegt i.d.R. nicht im App-Folder. AppFolder-Scope würde die Kernfunktionalität brechen.

**Entscheidung:** Verbleib bei `Files.ReadWrite` + `sessionStorage`. Das Restrisiko ist akzeptiert und bewusst geführt. Mitigationen:
1. CSP `script-src 'self'` verhindert inline Scripts und externe Script-Injection (ADR-015).
2. `esc()` konsequent auf allen vom Nutzer stammenden Strings (T0-XSS-Audit).
3. Token-Scope ist auf OneDrive (`Files.ReadWrite` + `User.Read`) begrenzt — kein Zugriff auf andere Microsoft-Dienste.
4. Refresh-Token erneuert sich bei jedem Token-Refresh (Rotation via Microsoft Identity Platform).

---

### ADR-022: Quellenbewertung — 3-Achsen-Evidenzmodell pro Zitat (RES-EVAL, sw v773)

**Kontext:** GEDCOM kennt für die Quellenqualität nur `QUAY` (0–3) — einen *einzelnen* Wert. Die professionelle Genealogie (Genealogical Proof Standard / Elizabeth Shown Mills, *Evidence Explained*) trennt drei *unabhängige* Dimensionen, die `QUAY` vermischt. Diese Trennung ist der Kern von „Forschungstiefe" (Phase 2 des Forschungstiefe-Ausbauplans) und die ehrliche Lücke vs. GRAMPS.

**Modell — drei Achsen + Informant, je Zitat (`citation.eval`):**

| Achse | Werte | GEDCOM-Tag |
|---|---|---|
| **Quellentyp** (Originalität) | `original` · `derivative` (Abschrift) · `authored` (Autorenwerk) | `_STYP` |
| **Information** (Nähe zum Ereignis) | `primary` · `secondary` · `undetermined` | `_INFO` |
| **Evidenz** (zur konkreten Aussage) | `direct` · `indirect` · `negative` | `_EVID` |
| **Informant** *(optional)* | Freitext oder Person-Xref | `_INFM` |

`QUAY` **bleibt erhalten** (Interop/Roundtrip) und ist unabhängig editierbar; `_evalToQuay()` leitet einen *Vorschlag* (0–3) aus dem Modell ab (an die QUAY-Semantik angelehnt: `original`+`primary` → 3; `negative` → 0; `authored`/`undetermined`/`indirect` → 1; sonst 2). „Informant" verbindet sich semantisch mit der bestehenden ASSO-Rolle `Informant` (ADR-018).

**Speicherung — `_`-Tag-Subtree unter SOUR (modelliert, nicht verbatim):**
```
2 SOUR @S1@
3 PAGE 47
3 QUAY 3
3 _EVAL
4 _STYP original
4 _INFO primary
4 _EVID direct
4 _INFM Pfarrer Schmidt
```
Die Daten *reisen mit der Datei* (sie gehören zum Zitat) → `_`-Tag mit Writer-Support (Faustregel des Ausbauplans, analog `_RLOG`/`_TASK`), **nicht** ein App-privater IDB-Store.

**Roundtrip-Mechanik (die kritische Entscheidung):** Unbekannte lv-3-Tags unter `SOUR` landen heute bereits als verbatim-`citation.extra[]` (Passthrough-Mechanismus 6) — `_EVAL` würde also *ohne jede Änderung* roundtripen. Beim *Modellieren* gilt jedoch die `_REPO_MODELLED`-Lehre aus T0-TEST-2: **der Parser muss `_EVAL` aus `extra[]` herauslösen**, sonst Doppel-Schreibung (+1 Subtree pro Roundtrip).
- **Parser** (`gedcom-parser.js`): `3 _EVAL` (in beiden Zitat-Handlern, INDI + FAM) erzeugt `citation.eval = _newEval()` ohne extra-Push; die lv-4-Achsen werden im Treiber **vor** dem Passthrough-Block abgefangen (Muster identisch zu GED7-`PHRASE` unter `DATE`), via `x._ptDepth===3 && lv===4 && x.lv3tag==='_EVAL'`. Unbekannte `_EVAL`-Kinder fallen verbatim in `extra`.
- **Writer** (`gedcom-writer.js`, `_writeSourCits`): **ein** Hook nach `QUAY` deckt *alle* Zitat-Kontexte ab (birth/chr/death/buri/events/marr/engag/div/asso/name/famc/childRelations — alle nutzen `_writeSourCits`). Da der Parser `_EVAL` aus `extra` zieht → keine Doppel-Schreibung.

**Strict / GED7:** In Strict-5.5.1 (ADR-019) wird `_EVAL` weggelassen (`!_strictGed`-Gate). In GED7 (ADR-018) werden `_EVAL/_STYP/_INFO/_EVID/_INFM` im `SCHMA`-Block deklariert. GED7 hat kein Standard-Äquivalent — der Extension-Tag bleibt erhalten.

**GRAMPS (2d, sw v776):** Citation mappt bereits `QUAY → confidence`. Das 3-Achsen-Modell wird zusätzlich als Citation-`<attribute>` geschrieben (`_STYP/_INFO/_EVID/_INFM`, deterministisch zwischen `<sourceref>` und `_extra`) und vom Parser modelliert herausgelöst (`_GR_EVAL_ATTR`-Mapping in der Citation-Schleife, statt verbatim in `_citExtra` → kein Doppel-Schreiben, gleiche `_REPO_MODELLED`-Lehre). `eval` fließt durch `_citHandle(…, evalObj)` und `_applyCit`. Browser-verifiziert: Write→Parse erhält eval, Re-Write stabil (1 `_STYP` bleibt 1, kein Doppeln); automatisierte GRAMPS-Roundtrip-Regression (2894 Personen) grün.

**Entscheidung:** 3-Achsen-Modell als modellierter `_EVAL`-Subtree, QUAY bleibt unabhängig + ableitbar. Verifiziert: `net_delta=0` + `out1===out2` auf `_EVAL`-Fixture; Strict strippt sauber; +18 Unit-Tests (`_evalToQuay`, Parser-Extraktion ohne Doppel-Schreibung).

**UI (2b, sw v774):** `⚖`-Aufklapper pro Zitat-Tag im Quellen-Widget (`renderSrcTags`): 3 Achsen-Selects schema-getrieben aus `EVAL_AXES` + Informant-Feld + „→Q"-Button (`_evalToQuay`-Vorschlag in QUAY übernehmen). Aufklapp-Zustand bewusst getrennt vom Zitat (`_srcEvalOpen[prefix]`-Set), `eval` in `initSrcWidget` deep-kopiert (kein Referenz-Leak vor Save).

**Validator + Dashboard (2c, sw v775):** Regel `MISSING_EVAL` (info) feuert, wenn eine Person Quellen, aber keine Evidenzbewertung hat — analog `MISSING_QUAY`. **Bewusst `default-disabled`** (`VAL_CONFIG_DEFAULTS.disabled`): Evidenzbewertung ist eine Opt-in-Disziplin; sonst flutet ein Dauer-Hinweis jede noch nicht bewertete Quelle und drückt den „befundfrei"-Score auf 0 % für jede Bestandsdatei. Der Dashboard-Lückenradar-Balken „Quellen mit Evidenzbewertung" zeigt die Abdeckung **unabhängig vom Validator** (direkt aus `db` via `_dashHasEval`) — informiert also ohne zu strafen. **Config-Migration:** `_saveValConfig` merkt sich `known` (Regelstand zum Speicherzeitpunkt); `_loadValConfig` lässt default-deaktivierte Regeln, die eine gespeicherte Config noch nicht kannte, ihren Default erben — so erhalten Bestandsnutzer neue Opt-in-Regeln korrekt deaktiviert, ohne dass explizite Aktivierungen überschrieben werden. Verifiziert: frisch/alt → off, explizit aktiviert → übersteht Reload.

**Repository-Rest (2e, sw v777):** Archivtyp (`r.rtype`, Select `REPO_TYPES` — GRAMPS-`<type>` existierte schon, GEDCOM neu als `_RTYPE`) + Findbuch-/Online-Katalog-URL (`r.findingAid`, GEDCOM `_FAURL`, GRAMPS `<url type="Web Search">` neben `www`=`<url type="Web Home">`; GRAMPS-Parser unterscheidet jetzt mehrere `<url>` nach Typ). Beide GEDCOM-`_`-Tags modelliert geparst (kein Passthrough-Doppel), Strict strippt. **Nebenfix:** `saveRepo` baute das Repo-Objekt neu auf und verlor dabei Bestandsfelder (`_grampsHandle`/`_extra`/`addrExtra`/`priv`) bei jedem Edit — jetzt `{...existing}`-Merge. Verifiziert: GEDCOM-Roundtrip `net_delta=0` + Strict-Strip auf `_RTYPE`/`_FAURL`-Fixture, GRAMPS-Roundtrip (rtype/findingAid/www getrennt), Felderhalt browser-bestätigt.

**RES-EVAL vollständig (2a–2e).**

---

### ADR-023: Hypothesen-System — leichte statusbehaftete Annotation (RES-HYPO, sw v781)

**Kontext:** Forschungstiefe-Ausbauplan Phase 4. Genealogische Schlussfolgerungen sind oft *Hypothesen* („Johann *1650 ist vermutlich Sohn des Peter"), die einen Status durchlaufen (offen → bestätigt/verworfen), auf Evidenz gestützt sind und unterschiedlich sicher gelten. GRAMPS/professionelle Tools kennen dafür den Genealogical-Proof-Standard-Workflow; die PWA hatte bislang keine strukturierte Stelle dafür (nur Freitext-Notizen).

**Bewusste Abgrenzung (Kern-Entscheidung):** *Leichte* Variante — eine **statusbehaftete Annotation an Person/Familie**, KEIN Alternativ-Baum / Zwei-Schichten-Evidenzmodell. Letzteres (parallele, widersprüchliche Tatsachen-Versionen mit Auflösungs-Motor) wäre eine v9-Neuarchitektur und bräche die verifizierte GEDCOM/GRAMPS-Roundtrip-Treue — die Kernstärke der App. Die Hypothese ist Metadaten *über* die Person, sie ändert die Fakten nicht.

**Modell — `_hypotheses[]` auf INDI/FAM:**

| Feld | Werte | GEDCOM-Tag |
|---|---|---|
| **text** | die Behauptung (Freitext) | `_HYPO` (Tag-Wert) |
| **status** | `open` (offen) · `confirmed` (bestätigt) · `rejected` (verworfen) | `_HSTAT` |
| **weight** | `low` · `medium` · `high` — *Forscher-Konfidenz* | `_HWGT` |
| **evidence[]** | SID-Referenzen `@S1@` (+ optional Seite) | `2 SOUR @S1@` / `3 PAGE` |
| **rationale** | Beweisführung (GPS-Argument, mehrzeilig) | `_RATIO` (CONC/CONT) |
| **conclusion** | Auflösungsnotiz bei confirmed/rejected | `_CONCL` (CONC/CONT) |
| **id / created** | | `_ID` / `_DATE` |

**Evidenz-Verknüpfung (Entscheidung):** als **SID-Referenz** (`{sid,page}`), NICHT als eigener Zitatkörper. Begründung: leichteste roundtrip-sichere Kopplung (Muster `_RLOG.sourRef`/`topSources`), kein Dangling, keine Duplizierung der Quelldaten. Die Quellqualität bleibt am Zitat (`citation.eval`/QUAY, ADR-022); `weight` ist davon **getrennt** = wie sicher der Forscher die *Hypothese* hält (nicht wie gut die Quelle ist).

**Speicherung — `_HYPO`-Subtree (modelliert, nicht verbatim):**
```
1 _HYPO Johann ist Sohn des Peter Decker
2 _ID h1
2 _HSTAT open
2 _HWGT medium
2 _DATE 2026-05-31
2 SOUR @S1@
3 PAGE Taufbuch fol. 12
2 SOUR @S2@
2 _RATIO Der Taufeintrag nennt einen Paten gleichen Namens.
2 _CONCL Noch offen bis Heiratseintrag gefunden.
```
Reist mit der Datei (gehört zur Person) → `_`-Tag mit Writer-Support (Faustregel des Ausbauplans, analog `_TASK`/`_RLOG`/`_EVAL`), nicht IDB.

**Roundtrip-Mechanik:** `_REPO_MODELLED`-Lehre — Parser löst `_HYPO` **modelliert** aus `_passthrough` heraus (lv1-Handler INDI **und** FAM), sonst Doppel-Schreibung. lv2-Sub-Tags unter `x.lv1tag==='_HYPO'`; `2 SOUR @S1@` → Evidenz-Eintrag (`x._curHypoEvid`), `3 PAGE` setzt dessen Seite; `_RATIO`/`_CONCL` mehrzeilig via `3 CONC/CONT` (lv3 früh abgefangen mit `return`, vor dem generischen lv3-Block — Muster wie RES-EVAL). Writer: **ein** `_writeHypos(lines, obj)` für Person + Familie, `pushCont` für Begründung/Schluss.

**Strict / GED7:** Strict-5.5.1 lässt `_HYPO` & Sub-Tags weg (`!_strictGed`-Gate); GED7 deklariert `_HYPO/_HSTAT/_HWGT/_RATIO/_CONCL` im SCHMA-Block.

**GRAMPS:** Hypothese als Person-/Familien-`<attribute type="_HYPO" value="JSON">` (ganzes Objekt JSON-serialisiert — „neue Felder gratis", gleiche Strategie wie `_TASK`/`_RLOG`); Parser liest aus `_HANDLED_*_ATTRS` heraus.

**Entscheidung:** leichtes Hypothesen-Modell als modellierter `_HYPO`-Subtree, Evidenz als SID-Ref, `weight` getrennt von Quellqualität. Verifiziert: `net_delta=0` + `out1===out2` auf `_HYPO`-Fixture (Person + Familie, mehrzeilig, 2 Evidenz-Refs); Strict strippt sauber; GRAMPS-Roundtrip-Regression (2894 Pers.) grün; +23 Unit-Tests (155 total).

---

### ADR-024: Orts-Entität & historische Dimension — `placeObjects` als Ort-Master (PLACE-HIST, geplant)

**Kontext:** Orte sollen die **historische Dimension** tragen (Name & Verwaltungszugehörigkeit *über Zeit*), **verlustfrei normalisiert** werden (gleiche Orte in verschiedenen Schreibweisen = eine Identität, ohne Schreibweisen zu verlieren) und **typisierte Event-Orte** (z. B. Kirchen, Pfarreien, Friedhöfe) nutzbar machen — neben der bereits vorhandenen RESI/PROP-Hof-Historie. Anforderung: **keine userspezifischen Tags**, um GEDCOM- und GRAMPS-Roundtrips nicht zu gefährden. Detail-Design + Phasenplan: `PLACE-REDESIGN.md`.

**Ausgangslage (bereits vorhanden):** Erstklassige Place-Entität `db.placeObjects[id] = {title, type, pnames[], lat, long, parentId, _extra}` roundtript nativ über GRAMPS `<placeobj>` (`gramps-parser.js:404-420`, `gramps-writer.js:647-669`); Event→Ort-Link via `ev.placeId`; Koordinaten-Roundtrip GEDCOM `PLAC.MAP.LATI/LONG` + GRAMPS `<coord>`; Hof-Historie als typisierte Orte (`_HOF_PLACE_TYPES`). Die Anzeige (`collectPlaces`, `ui-views-place.js`) aggregiert aber noch über den **getrimmten String**, nicht über `placeId`.

**Entscheidung:** `placeObjects` zum durchgängigen **Ort-Master** ausbauen, **ohne neue Custom-Tags** — ausschließlich über Standard-GRAMPS-Konstrukte:
- **Zeitachse:** datierte `<pname>` (historische Schreibweisen) und **mehrere** datierte `<placeref>` (wechselnde Zugehörigkeit) — GRAMPS erlaubt an beiden ein `<daterange>/<datespan>/<dateval>`. Modell: `pnames[].{dateFrom,dateTo,_dateRaw}` und neu `enclosedBy[]={placeId,dateFrom,dateTo,_dateRaw}` (neben `parentId` als undatierter Fallback).
- **Normalisierung:** `PlaceRegistry` in `gedcom.js` (`byId`/`byNorm`/`resolveAsOf`/`enclosureChainAsOf`/`findByName`). `_normPlaceName()` **nur** fürs Matching, nie für Speicherung/Anzeige → verlustfrei. Dubletten-Merge führt alte Schreibweisen in `pnames[]` zusammen.
- **Typisierte Orte:** vorhandenes `type`-Feld auf eine Taxonomie (Dorf…Land, **Kirche/Pfarrei/Friedhof**, Hof) mappen → GRAMPS-Standardtypen; Event-Formular bekommt Ort-Suchpicker (Muster Eltern-Picker v794). Höfe werden Spezialfilter der generischen Ort-Sicht.

**GEDCOM-Degradierung (by design):** GEDCOM 5.5.1/7 kann die Zeitachse nicht abbilden → Export kollabiert zum **periodenkorrekten** PLAC-String (`resolveAsOf(placeId, eventYear)`) + Koordinaten. GRAMPS bleibt vollständig (Master). Dokumentierter, bewusster Informationsverlust nur im GEDCOM-Zweig.

**Roundtrip-Sicherung:** `pname`/`placeref` stehen in `_PLACE_MODELLED` (`gramps-parser.js:363`) → werden vom Writer aus dem Modell neu gebaut. Liest der Parser die Date-Kinder nicht, gingen sie verloren. Daher: **zuerst** empirisch prüfen, ob heute datierte pname/placeref via Passthrough erhalten bleiben (`test-roundtrip.js` mit Mini-Fixture); `_dateRaw`-Verbatim als Absicherung; net_delta=0 auf `Unsere Familie.gramps` ist Pflicht-Akzeptanzkriterium.

**Begründung:** Baut auf existierender Infrastruktur auf (keine neue Persistenzebene), nutzt ausschließlich Standard-Konstrukte (kein `_`-Tag → kein Roundtrip-Risiko wie bei ADR-023), und löst alle drei Nutzerziele (Historie, Normalisierung, typisierte Event-Orte) mit einem kohärenten Modell. Konsolidiert nebenbei die `extraPlaces`-localStorage-Schuld (T0-STORAGE) in `placeObjects`.

**Alternativen erwogen:** (a) Custom-Tag `_PLACEHIST` analog `_HYPO` — verworfen, Roundtrip-Risiko + GRAMPS kann es nativ; (b) Alt-Namen nur als undatierte `pname` (Status quo) — verworfen, verliert die Zeitdimension; (c) eigener Zeit-Ortsbaum — zu schwer, bricht „GRAMPS = Master".

**Status:** 🟡 in Arbeit. **P0a-1 ✅ (sw v796):** Zeitachse Parser/Writer implementiert — datierte `<pname>`/`<placeref>` → `pnames[].{dateFrom,dateTo,dateType,_dateRaw}` + `enclosedBy[]`; HYBRID (strukturiert + `_dateRaw` verbatim) erhält Zusatz-Attribute wie `type="from"`. Verifiziert auf realer `Unsere Familie.gramps`: 29/29 Orts-Datumselemente + 8/8 verbatim-Attrs erhalten, counts=ok/stable; GEDCOM net_delta=0; +6 Unit-Tests (167). **P0a-2 ✅ (sw v797):** `getPlaceRegistry()` (`byId`/`byNorm`/`findByName`/`resolveAsOf`/`enclosureChainAsOf`, `_normPlaceName` nur fürs Matching) + `_migratePlaceObjects` (`parentId→enclosedBy`, in `setDb`), +13 Unit-Tests (180). **P0b-1 ✅ (sw v798):** `collectPlaces()` verknüpft jeden String-Ort additiv mit seiner Entität (`placeId`+`type`+Koordinaten, String-Key unverändert → kein Consumer-Ripple); Ort-Detail zeigt Typ/Zugehörigkeitskette/frühere Namen. +5 Unit-Tests (185). **P0b-2a ✅ (sw v799):** `findPlaceDuplicates()` (Fold-Key `_placeFold` + Koordinaten-Nähe Haversine, union-find) + `mergePlaceObjects()` (verlustfrei: Schreibweisen→`pnames[]`, `ev.placeId`/parent/enclosedBy umgehängt, Verlierer gelöscht); +13 Unit-Tests (198). **P0b-2b ✅ (sw v800):** Merge-Dialog im Orte-Tab (⇉-Button → `modalPlaceMerge`, Radio-Gewinnerwahl mit Vorschlag nach Event-Verwendung, `data-action`-Dispatch CSP-safe); browser-verifiziert (Render + Merge + Repointing + keine Console-Errors). **Offen:** P0b-3 (extraPlaces→placeObjects) → P2 (historische UI) → P3 (Kirchen/typisierte Event-Orte) → P4 (GOV/GeoNames-Geocoding) → P5 (Ort-Steckbrief, Karten-Zeitschieber, Pfarrei-Rekonstruktion, Geo-Validator). Detail: `PLACE-REDESIGN.md` / `ROADMAP.md`.

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
