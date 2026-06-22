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
│  ~52 JS-Dateien · ~38 000 Zeilen                         │
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

**Größe gesamt:** ~52 JS-Dateien · ~38 000 Zeilen

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

### ADR-024: Orts- und Hof-Modell — Datenmodell, Identitäts-Auflösung, Persistenz 🟢

**Konsolidiert** (sw v1033, 2026-06-21) aus ursprünglich vier ADRs:
- **ADR-024 v1** (PLACE-HIST, sw v796–v851) — Orts-Entität + historische Dimension
- **ADR-026** (HOF-GEO, sw v989–v998) — Höfe zuerst als Farm-`placeObject` (Zwischenstand)
- **ADR-027** (HOF-ENT, sw v1019–v1024) — Hof als eigenständige Entität
- **ADR-028** (HOF-DETERM, sw v1026–v1033) — Deterministische Identitäts-Auflösung + Daten-Anreicherungs-UI

Verlauf in CHANGELOG (Sessions 2026-06-19 bis 2026-06-21); ADR-026/027/028 stehen unten als Kurz-Stubs mit Verweis auf diesen Master-Abschnitt. Standalone-Spec-Dokumente (`ADR-027-HOF-ENTITY-ENTWURF.md`, `ADR-028-DETERMINISTIC-LINK-ENTWURF.md`) bleiben als Diskussions-Archiv.

#### Anforderungen

Fünf Forderungen unter einem Modell:
1. **Eindeutige Identität** für Orte UND Höfe — über Datei- und Geräte-Grenzen.
2. **Historische Dimension** — Namens- und Verwaltungs-Varianten + Hof-Adress-Bezeichnungen, datiert.
3. **Periodengerechte Projektion** für Anzeige und GEDCOM-Export (jährlich auflösen).
4. **Cross-Device-Persistenz** mit Konflikt-Erkennung.
5. **Verschiedene Quell-Konventionen** automatisch deterministisch auflösen (Ancestris, MyHeritage, GRAMPS, alte Quellen).

#### Datenmodell

```
placeObjects[id]    – Verwaltungseinheit (Country/State/County/Town/Parish/…)
  ├── title         – aktuelle Bezeichnung
  ├── type          – Verwaltungs-Taxonomie (NIE Farm/Building — Höfe sind separate Entität)
  ├── pnames[]      – datierte Namens-Varianten (sprachlich/orthographisch/historisch)
  ├── enclosedBy[]  – datierte Hierarchie-Refs (Zeitachse der Verwaltungs-Zugehörigkeit)
  ├── lat/long/note – geografische + Sachdaten
  └── existsFrom/To, _govId, _govTypes

hofObjects[id]      – Hof als eigenständige Entität (id-keyed via _hof_<addr>_<village>)
  ├── villageId     – FK auf placeObject (Dorf, Pflicht)
  ├── addrs[]       – datierte Adress-Bezeichnungen (Umbenennung, Hausnr.-Reform)
  ├── lat/long/note – eigene Geodaten (Binnenmigration zwischen Höfen im Dorf sichtbar)
  ├── existsFrom/To, predecessor, successor — Lebenszyklus
  └── _govId, _govTypes, schemaVersion

event.placeId       – FK auf Dorf-PO (Wahrheit für Ort)
event.hofId         – FK auf Hof (orthogonal, optional)
event.place/.addr   – PROJEKTIONS-CACHE, NICHT eigene Wahrheit (Invariante unten)
event.lati/long     – Render-Fallback (single source: po/hof, ADR-024 Item 9)
```

#### Persistenz-Schichten

| Daten | Ort | Geltungsbereich | Konflikt |
|---|---|---|---|
| `placeObjects` + `hofObjects` | `orte.json` v2 (Wrapper mit `_rev/_device/_ts/_schemaVersion:2`); IDB-Spiegel `stammbaum_place_objects` + `stammbaum_hofobjects_v2` | **Cross-Stammbaum-Referenz** (gilt für jede Datei mit diesen Orten/Höfen) | last-write-detection per `_rev` + `_device`, Union-Merge bei Konflikt |
| Event-Inhalte (`PLAC`, `ADDR`, `DATE`, alle anderen Felder) | GED-/GRAMPS-Datei | **Stammbaum-spezifische Genealogie** | Datei-Versionierung beim User |
| `event.placeId`/`event.hofId` | **runtime-only** (re-derived bei jedem Load) | — | Determinismus durch deterministische Funktion → keine Persistenz nötig |
| `APP_KNOWN_SCHEMA_VERSION = 2` | Konstante in gedcom.js | — | bei `orte.json._schemaVersion > 2` → Read-Only-Modus, harter Schreibstopp |

**Architekturprinzip**: stammbaum-spezifische Genealogie bleibt in der GED/GRAMPS-Datei (User-Wire-Inhalte werden NIE in orte.json mitgespeichert). Cross-Stammbaum-Wissen lebt in orte.json. Auflösungs-Ergebnisse `ev.placeId/hofId` werden NICHT persistiert — sie sind reine Funktion über Eingaben.

#### Hof-Identitäts-Konvention α (`_extractHofAddr`, sw v1034)

**Regel:** Die Hof-Identität in `hof.addrs[]` endet beim **ersten Komma ODER Zeilenumbruch** der eingehenden Adresse. Wire-Daten in `ev.addr` bleiben unangetastet (GEDCOM-ADDR-Roundtrip).

| `ev.addr` (Adressbuch-Übernahme) | Extract → `hof.addrs[0].value` |
|---|---|
| `Wall 33` | `Wall 33` |
| `Wall 33, 48607 Ochtrup, Deutschland` | `Wall 33` |
| `Wall 33\n48607 Ochtrup` (CONT-Mehrzeile) | `Wall 33` |
| `Wall 33, Hinterhaus` | `Wall 33` |
| `Schulze-Hof` | `Schulze-Hof` |
| `Hof Schulze 33` | `Hof Schulze 33` |

**Folgerung:** Komma hat klare semantische Trennung — in `PLAC` zwischen Hof und Verwaltungs-Hierarchie, in `ADDR` ausschließlich vor einem Stadt/Land-Suffix. Mehrere Wohneinheiten an derselben Hausnummer ergeben denselben Hof (semantisch typisch). Wer zwei distinkte Höfe an derselben Adresse modellieren will, nutzt anderen Separator (Klammer, Schrägstrich) oder mehrere `addrs[]`-Varianten.

`_extractHofAddr` wird intern in `findAllByAddr` (read-side) und `findOrCreateHofObject` (write-side) angewendet; UI-explizite Varianten (`addHofAddrVariantAndLink`) durchlaufen den Extract NICHT — User-Intent „diese Schreibweise speichern" bleibt erhalten.

**ADDR=Village-Redundanz** (`_isAddrJustVillage`, sw v1035): Manche Programme (MyHeritage u.a.) schreiben bei RESI ohne explizite Adresse den Ortsnamen selbst in `ADDR`. `_isAddrJustVillage(ev)` erkennt das konservativ (Match nur gegen Village-Titel + `pnames`, nicht Vorfahren-Kette) und unterdrückt: (a) Pfad-B'-Auto-Bootstrap (kein Pseudo-Hof „Ochtrup" im Dorf „Ochtrup"); (b) den Hof-Review-Eintrag (semantisch kein Hof-Verdacht). Atypische Fälle wie „ADDR=Westfalen" bei Ort „Ochtrup" bleiben sichtbar — User-Entscheidung wert.

**Read-Tolerance** (sw v1036): Daten vor Konvention α (sw v1034) können historisch entstandene Hof-Bezeichnungen mit Komma im Namen enthalten (z.B. „Oster 82a, Wester 141" — via Pfad C bootstrappt vor v1034). `findAllByAddr` und der Idempotenz-Check in `findOrCreateHofObject` versuchen daher **erst die voll-Norm**, **dann den Extract-Fallback** — der historische Komma-Hof wird über voll-Norm gefunden, Adressbuch-Übernahmen mit Stadt-Suffix über Extract. Konvention α bleibt strikt für **Neu-Anlage**: wenn weder voll noch extract matched, wird mit der extrahierten Form angelegt. Robustness Principle: „schreibe streng, lies tolerant".

#### Identitäts-Auflösung (Link-Pass)

Zentral: `_linkGedcomEventsToPlaceObjects(db)` in gedcom.js ist eine **reine, totale, deterministische Funktion** über `(ev.type, ev.place, ev.addr, ev.date)` + `(placeObjects, hofObjects)` → `(placeId, hofId, place', addr')`. Re-Derivation beim Load **ist** die Persistenz.

**Auflösungs-Reihenfolge im `_link` pro Event:**

```
1. Durchreich-REPROJECT  — bereits gelinkt (ev.placeId/hofId aus GRAMPS-Parser oder vorigem Load)
                          → ev.place auf periodengerechte Projektion aktualisieren
2. Pfad A   — PLAC-Leitsegment matcht hof.addrs[] im Dorf-Anker (Konvention 1, existierender Hof)
3. _placeLink:
   3a. Fall 1   — atomare PLAC matcht placeObject per Identität (Verwaltungs-Match)
   3b. Fall 2a  — Hierarchie-PLAC matcht voll-projektions-exakt
   3c. Fall 2b  — Hierarchie-PLAC matcht Leitname eindeutig + Existenz-Spanne + Anker
4. Pfad A'  — atomare PLAC ohne PO-Match → globaler hofObject-Lookup (Konvention 3a)
5. Pfad C   — rich-PLAC ohne Hof → Bootstrap aus Komma-Hierarchie (Konvention 1 ohne Vorlauf)
6. Pfad B   — ev.addr matcht hof.addrs[] im Dorf-Scope (Konvention 2, existierender Hof)
7. Pfad B'  — ev.addr ohne Hof + ev.type ∈ {RESI,PROP,CENS,OCCU} → Bootstrap aus Event-Typ-Semantik (Konvention 2a)

REPROJECT am Pfad-Ende: ev.place ← buildPlacForGedcom(ev, year); ev.addr ← resolveAddrAsOf(hofId, year) wenn leer.
```

**Wire-Konventions-Matrix**

| Konvention | Eingabe | hofObject existiert | hofObject existiert noch nicht |
|---|---|---|---|
| **1** Ancestris | `PLAC Hof, Dorf, … + ADDR Hof` | Pfad A | Pfad C (Bootstrap bei exakter Rest-Projektion) |
| **2** MyHeritage/GRAMPS, Hof-Event-Typ | `PLAC Dorf, … + ADDR Hof`, `type ∈ {RESI,PROP,CENS,OCCU}` | Pfad B | Pfad B' (Bootstrap aus Event-Typ-Semantik) |
| **2** dito, Non-Hof-Event-Typ | `PLAC Dorf, … + ADDR …`, `type ∈ {BIRT,DEAT,…}` | Pfad B | Review (Hof-Verdacht fehlt — Event-Typ trägt keine Hof-Semantik) |
| **3a** atomar, Hof global eindeutig | `PLAC Wall 33` (kein ADDR) | Pfad A' | — |
| **3b** atomar, ohne globalen Match | `PLAC Wall 33` | — | Review / Quelle schärfen |

**REPROJEKTIONS-INVARIANTE (ADR-024 v985):** Wenn `ev.placeId` oder `ev.hofId` gesetzt sind, ist `ev.place` **nur** die zwischengespeicherte periodengerechte Projektion — `buildPlacForGedcom(ev, year)`. Anzeige UND Writer leiten beide LIVE aus dem Modell ab. Modelländerungen wirken in Anzeige + Export sofort. Stale-Cache (Bug-Klasse #1) ist strukturell ausgeschlossen, weil REPROJECT am Ende JEDES Pfads aufgerufen wird (ADR-028 Phase 1).

**Wire-Treue**:
- Konvention 1: bit-identisch (`net_delta=0` vs. Ur-Quelle, `out1===out2`).
- Konvention 2: sichtbarer Konvention-2→1-Übergang beim ersten Save (Pfad B/B' setzt hofId + REPROJECT fügt Hof-Präfix in PLAC ein), danach idempotent (`out2===out3`). Toast + `markChanged` machen das ehrlich.
- Konvention 3a: bit-identisch wenn Pfad A' eindeutig matcht.

#### Lese-Seite: Chokepoints

Vier zentrale Helfer in gedcom.js, **die einzigen** korrekten Reads außerhalb des Link-Pass-Codes:

| Helfer | Frage | Implementierung |
|---|---|---|
| `_eventPlaceId(ev)` | „Welches Dorf gehört zu diesem Event?" | A: `ev.placeId` (Wahrheit) · B: `findByName(ev.place)` (Projektion) |
| `_eventHofId(ev)` | „Welcher Hof gehört zu diesem Event?" | A: `ev.hofId` (Wahrheit) · B: `findByAddr(ev.addr, year)` im Dorf-Scope (Projektion) |
| `_eventCoords(ev)` | „Welche Koords hat dieses Event?" | po/hof primär, `ev.lati/long` Fallback (ADR-024 Item 9) |
| `buildPlacForGedcom(ev, year)` | „Welcher PLAC-String würde geschrieben?" | Hof + Dorf-Hierarchie via `resolveAddrAsOf` + `_buildFormString` |

**Aggregatoren** (ADR-028 Phase 3): `collectPlaces` und `buildHofIndex` sind id-keyed (Map<placeId|normString>) statt string-keyed — zwei POs gleichen Titels bleiben distinct, mehrere Cache-Varianten desselben Orts kollabieren auf einen Eintrag. Wrapper-API mit byName/byAddr-Index für Lookup-Kompatibilität.

#### Daten-Lücken-UI (Hof-Review)

Genuine Mehrdeutigkeit / fehlendes Wissen wird **sichtbar gemacht**, nicht versteckt. „Hof-Zuweisungen prüfen"-Modal im Höfe-Tab zeigt Events mit `ev.addr` ohne aufgelösten Hof, klassifiziert in drei Klassen:

| Klasse | Beschreibung | Aktionen |
|---|---|---|
| **A** | non-Hof-Event-Typ (BIRT/DEAT/EDUC/GRAD/MARR/BURI) mit ADDR ohne Hof-Match | „+ Hof anlegen" \| „Quelle schärfen" |
| **C** | Mehrdeutigkeit: ≥2 Höfe gleicher Adresse im Dorf | „Hof wählen" \| „Quelle schärfen" |
| **D** | Norm-Drift: Adresse matcht keinen Hof, aber Höfe existieren im Dorf | „Variante zum Hof" \| „Hof wählen" \| „+ Hof anlegen" \| „Quelle schärfen" |

Drei Aktions-Typen, alle persistent am korrekten Ort:
- **„Quelle schärfen"** — Event-Edit-Form öffnen (User passt PLAC/ADDR an). Anreicherung wandert ins GED/GRAMPS (stammbaum-spezifisch).
- **„Hof anlegen"** / **„+ Hof anlegen"** — `findOrCreateHofObject(ev.addr, ev.placeId)`. Anreicherung wandert in `orte.json` (cross-stammbaum).
- **„Variante zum Hof"** — `addHofAddrVariantAndLink` hängt ev.addr als neue `addrs[]`-Bezeichnung an einen Hof + linkt. Künftige Events derselben Schreibweise greifen via Pfad B deterministisch.

Es gibt **keinen** per-Event-Override-Pfad mehr. ADR-027-P5-„Ignorieren"-Mechanik wurde in ADR-028 P5 strukturell entfernt — Migrations-Helfer `_migrateLegacyIgnoredHofKeys` räumt alte localStorage-Markierungen + Toast.

#### Wire-Mapping

**GEDCOM 5.5.1 / 7** (`gedcom-writer.js` `_resolvedPlaceName` + `geoLines`):
- `PLAC` aus `buildPlacForGedcom(ev, year)` — periodengerechter Hof+Dorf-String (oder nur Dorf).
- `MAP/LATI/LONG` aus `_eventCoords(ev)` (hof primär, dann po).
- `ADDR` aus `ev.addr` (User-Wire bleibt byte-identisch — Hof-`addrs[]` ist Metadaten).
- `NOTE @N_HOF@` für Hof-Notiz mit Text-Präfix `[Hof] ` (deterministisch routbar, GEDCOM-konform).
- Historische Zeitachse (pnames, enclosedBy-Datierung, addrs-Datierung) **wird beim Export kollabiert** (by design — GEDCOM kann die Zeitachse nicht abbilden). GRAMPS bleibt vollständig.

**GRAMPS XML** (`gramps-parser.js` + `gramps-writer.js`):
- `placeObjects` ↔ `<placeobj type="…">` mit `<pname>`+`<daterange>`, `<placeref>`+`<daterange>`, `<coord>`, `<noteref>`.
- `hofObjects` ↔ `<placeobj type="Building">` mit `<placeref>` aufs Dorf, `<pname>` für `addrs[]`, `<coord>`, `<noteref>`. Parser teilt deterministisch (Type `Building` → `hofObjects`, alles andere → `placeObjects`).
- Roundtrip: `xml1===xml2` stable auf `Unsere Familie.gramps`.

#### Begründungen + verworfene Alternativen (kondensiert)

- **D1 — Sidecar `event_links.json`** (cross-device, analog `orte.json`) für `(placeId, hofId)`. **Verworfen** — bricht „orte.json = Cross-Stammbaum-Referenz vs. GED = stammbaum-spezifische Genealogie". Event-Links sind genealogische Information.
- **D2 — Custom-Tags `_HOFID`/`_PID` / `_HOF`-Record im GEDCOM** für persistente Identitäts-Tags. **Verworfen** — spezifische Tags nur als letzte Ausnahme. Deterministische Re-Derivation aus implizite Information IST die Persistenz; kein Bedarf.
- **`ev.addr` als Hof-Identität behalten** (Pre-ADR-026). Verworfen wegen fehlender Cross-Device-Sync und fehlender Identität bei Adress-Wandel.
- **Höfe in `placeObjects.type='Farm'`** (ADR-026, zwischenzeitlich umgesetzt). Verworfen — vier strukturelle Schwächen: Adress-Doppelung (`po.title` + `ev.addr`), semantische Vermischung Geografie/Adresse, `pnames` überladen mit Adress-Historie, Hof-Lebenszyklus nicht erstklassig. Migration in eigenständige `hofObjects` v2 via `_migrateFarmPOsToHofObjects` (ADR-027 P3).
- **Auto-Bootstrap für BIRT/DEAT/MARR/BURI mit ADDR**. Verworfen — Event-Typen tragen keine Hof-Semantik (Krankenhaus, Kirche, Friedhof, Standesamt sind plausible Nicht-Hof-Adressen). False-positive-Rate zu hoch; landen im Review-Pfad als Klasse A.
- **Review-Modal als per-Event-Override-Speicher** (ADR-027 P5 „Ignorieren"-Mechanik). Verworfen — wäre die einzige event-lokale Annotation und würde dem Determinismus-Prinzip widersprechen. Datenanreicherungs-Variante (placeObject Typ Hospital + PLAC schärfen) erreicht dasselbe ohne Annotation.

#### Restklassen (ehrlich offen)

Zwei Klassen, die durch keine Algorithmus-/UI-Aktion eindeutig werden:
1. **Genealogische Ungewissheit** — der Forschende selbst weiß die Antwort nicht („vermutlich Hof Schmiede, aber welcher der zwei?"). Bleibt dauerhaft im Review sichtbar — das ist die korrekte Antwort des Systems auf Quell-Ungewissheit.
2. **PLAC-Lücken außerhalb Hof-Kontext** — EDUC/GRAD/EVEN mit fremden Verwaltungs-Hierarchien (z.B. „Shenyang, China" ohne PO). Sind keine Hof-Themen; gehören in einen Orts-Review-Workflow im Orte-Tab (offen für später).

#### Test-Gates

- `MeineDaten_ancestris.ged` (83k Zeilen, Ancestris): `net_delta=0` + `out1===out2` stable.
- `Unsere Familie.gramps`: `xml1===xml2` stable.
- 829 Unit-Tests (Gruppen ae/af/aj/ak/al/am/an/ao/ap/aq/ar/as/at = alle Hof-/Orts-Themen).
- Snapshot-Test `test-snapshot-place.js` für `showPlaceDetail`-Output.
- Pre-Commit-Gate: test-csp + test-unit + test-snapshot-place.

### ADR-025: Zentraler ViewState-Helper + PWA-Lifecycle-Kontrakt (View-Robustheit, sw v865–v869)

**Kontext:** Die View-Selektion wurde an drei Orten parallel geführt: `AppState.currentX`-IDs (exklusiv, eine je gesetzt), `UIState._lastTabSel` (per Tab, nicht validiert, nicht IDB-persistent), `UIState._navHistory` (orthogonal). Dazu: 0 PWA-Lifecycle-Handler, kein Dirty-Tracking, kein definiertes Resume-Verhalten.

**Entscheidung (4 Phasen):**

**P1 — Selektions-Persistenz:** `_lastTabSel` wird via `idbPut('last_tab_sel', …)` nach jeder Detailauswahl in IDB geschrieben; `showStartView` lädt sie beim Start. `_desktopAutoSelect` validiert gespeicherte IDs gegen `AppState.db`. `_mobileSelectionRestore` scrollt + highlightet die letzte Auswahl auf Mobile. Alle 4 `show*Detail`-Fallbacks bei fehlendem Entity → `showMain()` statt lautlosem `return`.

**P2 — `ViewState` IIFE** (`ui-views.js`):
- `ViewState.setCurrent(tab, id)`: ① schreibt `UIState._lastTabSel[tab]` + IDB-persist, ② setzt `AppState.currentX` (exklusiver Fokus, alle anderen → null), ③ dispatcht `viewstate-change` CustomEvent.
- `ViewState.getCurrent(tab)`: liest `_lastTabSel[tab]` mit Existenzvalidierung gegen `AppState.db`.
- Alle 4 `show*Detail`-Funktionen und alle Konsumenten (`_desktopAutoSelect`, `_mobileSelectionRestore`) gehen über `ViewState`. Keine direkten `_lastTabSel.X = …`-Schreibstellen mehr.
- `AppState.currentX` bleibt als Read-Convenience (wird synchron von `setCurrent` gesetzt) — kein Breaking Change für bestehende Konsumenten.

**P3 — dirty-bit + `ui-lifecycle.js`:**
- `markChanged()` setzt `UIState._dirty = {persons,families,sources,places: true}` für alle Daten-Tabs.
- `switchTab()` rendert nur wenn `_dirty[tab] !== false` (dirty oder erster Besuch) → keine unnötigen Re-Renders.
- `ui-lifecycle.js` (~60 Z.) zentralisiert alle PWA-Lifecycle-Handler: `visibilitychange` (>60-s-Heuristik → alle Tabs dirty), `pageshow` (BFCache-Reload-Guard), `pagehide` (`_persistLastTabSel`-Flush). Ersetzt den P0-K2-Handler in `ui-views.js`.

**P4 — Hygiene:** `showView` direkter View-Swap (2 DOM-Ops statt N); `switchTab` teardown inaktiver VS-Listen; `_navHistory` cap 50; alle `setTimeout`-Magic → `_afterLayout`.

**P5 — Separate Detail-Container (sw v869):**
- A4: `#detailContent` (ein globaler Container) → 5 separate `div.detail-container` (`detailPerson/Family/Place/Source/Media`). `.dc-active`-CSS schaltet sichtbaren Container um. `_activateDetailContainer(cid, entityId)` sichert Scroll-Position des scheidenden Containers in `data-saved-scroll` und stellt sie beim Zurückwechseln wieder her (Desktop).
- A5: `data-view-init`-Flag + `_dcAlreadyShows(tab, entityId)`: `_desktopAutoSelect` überprüft vor dem Aufruf von `show*Detail`, ob der Container bereits die richtige Entität anzeigt und der Tab nicht dirty ist — überspringt dann den Re-Render (nur `_activateDetailContainer` + `return`).
- Hof-Detail teilt `detailPlace`; Repo-Detail teilt `detailSource`.

**Konsequenzen:**
- `viewstate-change` CustomEvent ist Erweiterungspunkt für künftige Listener (URL-Hash-Sync, Analytics, Deep-Link-Restore).
- `UIState._dirty` ermöglicht künftig präziseres Dirty-Tracking per Edit-Typ (statt globaler Invalidierung).
- `ui-lifecycle.js` ist der einzige Ort für PWA-Resume-Logik — keine Listener mehr in View-Modulen.
- Per-Entität-Scroll-State auf Desktop: Tab-Wechsel Person→Familie→Person stellt Scroll-Position wieder her.

**Alternativen erwogen:** (a) Vollständiger `AppState.currentX`-Getter-Shim via `Object.defineProperty` — zu invasiv, alle 50+ Lesestellen unveränderter Code; (b) URL-Hash als primäre Persistenz — bricht iOS-PWA-Standalone-Modus; (c) SessionStorage statt IDB — würde Process-Kill-Szenario nicht überleben.

**Status:** ✅ P0–P5 abgeschlossen (sw v861–v869).

### ADR-026: Höfe als geokodierte Farm-`placeObject`s (HOF-GEO, ✅ konsolidiert in ADR-024)

**Zwischenstand** (sw v989–v998): Höfe wurden zuerst als `placeObject` Typ `Farm`/`Building` modelliert (mit `enclosedBy` aufs Dorf, eigene Koords/Notiz), um die gesamte ADR-024-Infrastruktur (Sync, Registry, Norm-Dedup) wiederzuverwenden. Das Zwei-Felder-Eingabemodell (Ort + Hof + Adresse) wurde hier konzipiert.

**Vier Schwächen wurden in der Praxis sichtbar** (Adresse ohne Wahrheits-Anker, semantische Vermischung Geografie/Adresse im selben `type`-Slot, `pnames` als Adress-Historie überladen, Hof-Lebenszyklus nicht erstklassig) → Ablöse durch ADR-027 (Hof als eigenständige Entität).

**Aktueller Stand**: konsolidiert in **ADR-024** (Master-Abschnitt oben). `_migrateFarmPOsToHofObjects` (ADR-027 P3) überführt Farm-POs idempotent in `hofObjects` V2. Historisches Detail in CHANGELOG Session 2026-06-19. Standalone-Notiz historisch — kein eigenes Spec-Dokument.

### ADR-027: Hof als eigenständige Entität `hofObjects` (HOF-ENT, ✅ konsolidiert in ADR-024)

**Kern-Entscheidung** (sw v1019–v1024): Hof wird zur eigenständigen Entität `hofObject` mit FK `villageId` aufs Dorf-PO. `placeObjects` enthält fortan ausschließlich Verwaltungseinheiten. Events tragen orthogonal `ev.placeId` (Dorf) + optional `ev.hofId` (Hof). Adresse single-source in `hofObject.addrs[]` mit Zeitfenstern (analog `placeObject.pnames`, semantisch sauber getrennt). Lebenszyklus (existsFrom/To, predecessor/successor) erstklassig modellierbar.

Migration in fünf Phasen ausgerollt (Schema → Mapping → Daten → Cleanup → UI), Phase-3-Reverse-Migrator als Sicherheitsnetz für 2 Versionen verfügbar.

**Aktueller Stand**: konsolidiert in **ADR-024** (Master-Abschnitt oben). Verlauf-Detail in CHANGELOG Session 2026-06-20 + Standalone-Spec `ADR-027-HOF-ENTITY-ENTWURF.md` (Diskussions-Archiv).

### ADR-028: Deterministische Identitäts-Auflösung (HOF-DETERM, ✅ konsolidiert in ADR-024)

**Architekturprinzip** (sw v1026–v1033): `(ev.placeId, ev.hofId)` ist eine **reine, totale, deterministische Funktion** über die implizite Eingabe `(ev.type, ev.place, ev.addr, ev.date)` + `(placeObjects, hofObjects)`. Re-Derivation beim Load IST die Persistenz — weder Sidecar noch Custom-Tags. Stammbaum-Genealogie bleibt im GED/GRAMPS, Cross-Stammbaum-Wissen in `orte.json`.

Algorithmus-Vollständigung über fünf Pfade (A/A'/B/B'/C — Match + Bootstrap), REPROJECT-Invariante am Pfad-Ende, Daten-Anreicherung als ehrlicher Fallthrough (Review-Modal mit drei Aktionen: Quelle schärfen / Hof anlegen / Variante zum Hof). Sechs-Phasen-Migration P1–P5 abgeschlossen, P6 (Cleanup) ausstehend.

**Aktueller Stand**: konsolidiert in **ADR-024** (Master-Abschnitt oben — Identitäts-Auflösung, Lese-Seite-Chokepoints, Daten-Lücken-UI, Wire-Treue). Verlauf-Detail in CHANGELOG Sessions 2026-06-21 + Standalone-Spec `ADR-028-DETERMINISTIC-LINK-ENTWURF.md` (Diskussions-Archiv).

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
