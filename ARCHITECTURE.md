# Architektur

Architektur-Entscheidungen (ADRs), Passthrough-System, Speicher-Architektur.
Datenmodell: `DATAMODEL.md` · UI/CSS/Layout: `UI-DESIGN.md` · Sprint-Geschichte: `CHANGELOG.md`

---

## Überblick

```
┌──────────────────────────────────────────────────────┐
│          Stammbaum PWA v6.0 (Branch v6-dev)          │
│  Keine externen Dependencies · Kein Build-Step       │
│  Keine Frameworks · Kein Server                      │
│                                                      │
│  index.html           — App-Shell (HTML + CSS)       │
│  offline.html         — Offline-Fallback (SW v162)   │
│  gedcom.js            — AppState/UIState, Labels     │
│  gedcom-parser.js     — parseGEDCOM()                │
│  gedcom-writer.js     — writeGEDCOM(), pushCont()    │
│  storage.js           — IndexedDB, Dateiverwaltung   │
│  ui-views.js          — gemeinsame Hilfsfunktionen   │
│  ui-views-person.js   — Personen-Detailansicht       │
│  ui-views-family.js   — Familien-Detailansicht       │
│  ui-views-source.js   — Quellen-Detailansicht        │
│  ui-views-tree.js     — Sanduhr-Baum + Fan Chart     │
│  ui-forms.js          — Formulare (Person/Fam/Src)   │
│  ui-forms-event.js    — Event-Formular               │
│  ui-forms-repo.js     — Archiv-Formular + Picker     │
│  ui-media.js          — Medien Add/Edit/Delete       │
│  ui-fanchart.js       — Fan Chart (SVG)              │
│  onedrive-auth.js     — OAuth2 PKCE: Login/Token     │
│  onedrive-import.js   — Foto-Import, Ordner-Browser  │
│  onedrive.js          — Media-URL, Upload, File-I/O  │
│  sw.js                — Service Worker (Cache v162)  │
│  manifest.json        — PWA-Manifest                 │
│  demo.ged             — Demo-GEDCOM (12 Pers., 6 Fam.)│
└──────────────────────────────────────────────────────┘
```

**Größe gesamt:** ~19 JS-Dateien · ~200 Funktionen · ~10500 Zeilen

---

## Architektur-Entscheidungen (ADRs)

### ADR-001: Multi-File (HTML-Shell + JS-Module)
**Entscheidung (ab v3.0):** `index.html` ist reine App-Shell (HTML + CSS). JavaScript in Modulen: `gedcom.js`, `gedcom-parser.js`, `gedcom-writer.js`, `storage.js`, `ui-views.js`, `ui-views-person.js`, `ui-views-family.js`, `ui-views-source.js`, `ui-views-tree.js`, `ui-forms.js`, `ui-forms-event.js`, `ui-forms-repo.js`, `ui-media.js`, `ui-fanchart.js`, `onedrive-auth.js`, `onedrive-import.js`, `onedrive.js`.

**Vorgänger:** v1.x–v2.x waren Single-File-HTML (~4700 Z.). Bei ~5000 Zeilen wurde aufgeteilt. `ui-views.js` wurde in v5-dev (sw v94) in 5 Module aufgeteilt. `onedrive.js` (946 Z.) in 3 Module (sw v140), `ui-forms.js` (1036 Z.) in 3 Module (sw v141).

**Warum:**
- Einzelne Dateien bleiben editierbar ohne vollständigen Download/Upload
- Klare Trennung: Parser / Storage / Rendering / Formulare
- Kein npm, kein Webpack, kein Build-Prozess — globale Funktionen zwischen Dateien

**Konsequenzen:**
- Kein echtes Modul-System (kein `import/export`) — alle Funktionen global
- `<script src="...">` Reihenfolge muss Abhängigkeiten respektieren

---

### ADR-002: Vanilla JavaScript, kein Framework
**Entscheidung:** Kein React, Vue, Angular.

```javascript
// Listen werden bei jeder Änderung neu gerendert
function renderPersonList(persons) {
  el.innerHTML = persons.map(p => `<div ...>${esc(p.name)}</div>`).join('');
}
// Nach jeder Änderung manuell aufrufen:
markChanged(); updateStats(); renderTab();
```

---

### ADR-003: AppState/UIState als State-Namespaces (ab v4.0)
**Entscheidung:** 22 cross-file Globals in 2 Namespace-Objekte in `gedcom.js` migriert. `AppState` hält persistente Werte (`db`, `currentPersonId`, `changed`, `_fileHandle` …), `UIState` hält UI-Zustand (`_treeScale`, `_treeHistory`, `_fanGenCount` …). Backward-compat-Shims via `Object.defineProperty` auf `window`.

**Vorgänger:** Ein globales `let db` + ~22 lose Globals.

**Konsequenz:** Kein Undo/Redo. Bei Seitenreload sind ungespeicherte Änderungen weg (außer Auto-Load aus IDB). Details: `DATAMODEL.md`.

---

### ADR-004: IndexedDB für Auto-Load (ab Sprint P3-1)
**Entscheidung:** Der GEDCOM-Text wird primär in IndexedDB gecacht. localStorage ist stiller Fallback.

```
IDB-Keys: 'stammbaum_ged', 'stammbaum_ged_backup', 'stammbaum_filename'
          'img:<filePath>'             ← Medien-Cache (base64 Data-URL), pfad-basiert (sw v105)
          'od_base_path'              ← absoluter OneDrive-Pfad des GED-Ordners (sw v110/v111)
          'od_photo_folder'           ← { id, name, relPath } — Foto-Ordner relativ zu od_base_path (sw v110)
          'od_docs_folder'            ← { id, name, relPath } — Dok-Ordner relativ zu od_base_path (sw v110)
          'od_default_folder'         ← LEGACY: { folderId, folderName, folderPath } — Foto-Ordner (sw v99)
          'od_doc_folder'             ← LEGACY: { folderId, folderName, folderPath } — Dok-Ordner
          'od_filemap'                ← LEGACY: Index→fileId-Mapping (sw v99 deprecated)
          'od_doc_filemap'            ← LEGACY: Basename→fileId für Dokumente-Ordner (deprecated)
```

**Warum IDB:** localStorage-Limit ~5–10 MB; MeineDaten.ged ≈ 5 MB war grenzwertig.

**Wichtig:** Es wird der GEDCOM-Text gecacht, **nicht** das `db`-Objekt. Grund: `Set`-Objekte (`sourceRefs`) lassen sich nicht mit `JSON.stringify` serialisieren.

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

### ADR-006: Geo-Koordinaten nur lesen
**Entscheidung:** Koordinaten werden gelesen und als Apple Maps Links angezeigt, aber nicht editierbar.

**Legacy-spezifisches Format:**
```gedcom
2 PLAC Ochtrup, , Nordrhein-Westfalen, Deutschland
3 MAP          ← Level 3 (Standard: Level 2)
4 LATI N52.216667
4 LONG E7.183333
```
Der Parser behandelt MAP auf Level 3 **und** Level 2.

---

### ADR-007: Desktop-Speichern via `showOpenFilePicker` + `createWritable` (v1.2 final)
**Entscheidung:** Beim Öffnen auf Chrome Desktop wird `showOpenFilePicker()` verwendet und sofort Schreiberlaubnis per `requestPermission({ mode: 'readwrite' })` angefragt.

**Speichern-Flow:**
```
Chrome Mac:
  showOpenFilePicker() → requestPermission(readwrite) → _canDirectSave=true
  exportGEDCOM() → fileHandle.createWritable() → write → close

Safari Mac / Firefox:
  <input type="file"> → kein fileHandle
  exportGEDCOM() → _downloadBlob() → <a download> → ~/Downloads
  + Timestamped-Backup wenn Inhalt geändert
```

**Wichtig:** `showDirectoryPicker()` schlug auf macOS + iCloud Drive fehl (`NotAllowedError`). `showOpenFilePicker()` mit explizit angefragter Schreiberlaubnis funktioniert (Chrome).

---

### ADR-008: BIRT/CHR/DEAT/BURI als Sonder-Events
**Entscheidung:** Die vier Hauptereignisse sind eigene Objekte auf der Person, nicht in `events[]`.

```javascript
p.birth = { date, place, lati, long, sources, sourcePages, sourceQUAY, sourceExtra, sourceNote, sourceMedia, _extra, value, seen }
p.chr   = { ... }
p.death = { ..., cause }
p.buri  = { ... }
p.events = [ { type, date, place, ... } ]  // alle anderen
```

Zuordnung via `_SPECIAL_OBJ`:
```javascript
const _SPECIAL_OBJ = { BIRT:'birth', CHR:'chr', DEAT:'death', BURI:'buri' };
```

`seen`-Flag (v4-dev): `seen:false` → `1 BIRT`-Block (ohne Sub-Tags) wird trotzdem roundgetripped.

---

### ADR-009: Globale Bottom-Navigation
**Entscheidung:** Persistente Bottom-Nav außerhalb aller `.view`-Divs. 6 Tabs: Baum ⧖ · Personen 👤 · Familien ⚭ · Quellen 📖 · Orte 📍 · Suche 🔍

```
Vorher: v-landing → v-main (Tabs) ↔ v-tree (Sackgasse) ↔ v-detail
Nachher: v-landing → [v-main | v-tree] ↔ v-detail
                     ↑__________________________↑
                     Bottom-Nav (persistent, außerhalb aller Views)
```

**Sichtbarkeit:** `flex` in `v-main` + `v-tree`, `none` in `v-landing` + `v-detail`.

---

### ADR-010: PLAC-Toggle (v2.0-dev)
**Entscheidung:** Orts-Eingabe wechselt zwischen Freitext und strukturierten PLAC.FORM-Feldern.

```javascript
const _placeModes = {};  // { placeId: 'free'|'parts' }
initPlaceMode('ef-place');
togglePlaceMode('ef-place');
getPlaceFromForm('ef-place');  // liest je nach Modus Freitext oder joinPlaceParts()
```

---

### ADR-011: 3-Felder-Datum (v2.0-dev)
**Entscheidung:** Datumseingabe als 3 separate Felder (Tag / Monat / Jahr) + Qualifier-Dropdown.

```javascript
// Lesen: readDatePartFromFields('ef-date') → '12 MAR 1845'
// Schreiben: writeDatePartToFields('ef-date', '12 MAR 1845')
// Normierung: normMonth('März') → 'MAR'; normMonth('3') → 'MAR'
// Aufbau: buildGedDateFromFields('ef-date-qual', 'ef-date', 'ef-date2') → 'BET 1880 AND 1890'
// FROM/TO (v4-dev): parseGedDate() erkennt FROM x TO y; gedDateSortKey() für Sortierung
```

---

### ADR-012: Verbatim Passthrough für unbekannte GEDCOM-Tags (Sprint 11)
**Entscheidung:** Unbekannte GEDCOM-Tags werden verbatim in `_passthrough[]` (oder spezialisierten Arrays) gespeichert und beim Schreiben exakt wieder ausgegeben — kein Datenverlust bei unbekannten Tags.

**Kern-Mechanismus:**
```javascript
let _ptDepth = 0;   // > 0: tiefere Ebenen gehen in passthrough (oder _ptTarget)
let _ptTarget = null;  // Redirect: statt _passthrough→ spezialisiertes Array

// In INDI/FAM/SOUR lv=1 else-Zweig:
cur._passthrough.push('1 ' + tag + (val ? ' ' + val : ''));
_ptDepth = 1;

// lv > _ptDepth → capture; lv <= _ptDepth → Passthrough beenden
// _ptTarget ermöglicht Redirect in ev._extra[], marr._extra[], sourceExtra{} etc.
```

**Wichtig — lv > 4 (sw v138/v142):** Zeilen mit Level > 4 werden als Fehler in `_errors[]` protokolliert, aber der Passthrough-Block läuft trotzdem. `continue` darf hier NICHT stehen — sonst werden z.B. `5 TYPE photo` (unter `4 FORM` unter `3 OBJE` in event→SOUR→OBJE→FILE) komplett verworfen. Dies war eine Regression in sw v138 die in sw v142 behoben wurde.

**Was landet in `_passthrough` (INDI):**
- `1 OBJE @ref@`-Referenzen (externe Medien-Records)
- *(Nicht mehr in passthrough: `DSCR`, `IDNO`, `SSN` — seit sw v148 als `events[]` strukturiert)*
- *(Nicht mehr in passthrough: `CENS`, `CONF`, `FCOM`, `ORDN`, `RETI`, `PROP`, `WILL`, `PROB` — seit v4-dev als `events[]` strukturiert)*
- *(Nicht mehr in passthrough: Extra-NAME-Blöcke — seit v4-dev strukturiert in `extraNames[]`, vollständig editierbar via ui-forms.js)*

**Was landet in `_passthrough` (FAM):** Unbekannte lv=1-Tags *(DIV/DIVF/ENG/ENGA sind seit sw v134 strukturiert — nicht mehr in passthrough)*

**Was landet in `_passthrough` (SOUR):** `1 DATA`, `1 NOTE`, `1 REFN`

**`_ptNameEnd`-Index (Name-Kontext):**
```javascript
// NAME-Kontext lv≥2 Items stehen am Array-Anfang
let _ptNameEnd = 0;
while (_ptNameEnd < _pt.length && /^[2-9] /.test(_pt[_ptNameEnd])) _ptNameEnd++;
// → direkt nach NAME-Block ausgeben (nicht am Record-Ende nach CHAN!)
```

**Val-Fix (CONC-Stabilität):**
```javascript
const line = raw.replace(/\r$/, '');  // nur CR entfernen (Windows CRLF)
const val = (m[3] || '').replace(/^ /, '').trimEnd();  // genau 1 GEDCOM-Delimiter
```

---

## Passthrough-Mechanismen — Vollständige Analyse

10 distinkte Mechanismen sichern GEDCOM-Daten die der Parser nicht strukturiert verarbeitet:

| # | Feld | Kontext | Was landet drin |
|---|------|---------|-----------------|
| 1 | `db.extraRecords[]._lines[]` | lv=0 Records | SUBM und andere `@ID@`-Records komplett verbatim |
| 2 | `cur._passthrough[]` | INDI / FAM / SOUR | Unbekannte lv=1 Tags + Sub-Trees; NAME-Kontext lv≥2 (NICK etc.) |
| 3 | `ev._extra[]` / `marr._extra[]` / `birth._extra[]` etc. | Event-Kontexte | Unbekannte lv=2 Tags in Events |
| 4 | `ev.addrExtra[]` / `r.addrExtra[]` | ADDR-Kontext | Sub-Tags von ADDR: CITY, POST, CONT, _STYLE, _MAP, _LATI, _LONG |
| 5 | `frelSourExtra[]` / `mrelSourExtra[]` | FAMC + FAM CHIL | 2.+ SOUR unter _FREL/_MREL + deren 4-Level-Kinder (**Legacy** — Ancestris-Format; beim Schreiben in sourIds aufgelöst, ADR-014) |
| 6 | `sourceExtra{}` | SOUR-Refs in Events | Verbatim lv=3 Tags unter `2 SOUR @ID@` in Event-Kontext (außer PAGE/QUAY/NOTE/OBJE) |
| 7 | `topSourceExtra{}` | INDI lv=1 SOUR | Unbekannte lv=2 Tags unter `1 SOUR @ID@` direkt auf INDI |
| 8 | `media._extra[]` | OBJE (inline) | Unbekannte Tags unter OBJE/FILE-Block |
| 9 | `childRelations.sourExtra{}` | FAM CHIL SOUR | Unbekannte lv=3 unter `2 SOUR` in CHIL-Kontext |
| 10 | `sourceMedia{}` / `sourMedia{}` | SOUR-Zitierungen | Inline OBJE-Blöcke unter `2 SOUR @ID@` in allen Event-Kontexten (v4-dev, sw v45) |

**`sourceMedia{}` (Mechanismus 10) — strukturiert, nicht verbatim:**
```javascript
// OBJE ohne @ref@ unter 2 SOUR → sourceMedia{} (strukturiert)
// OBJE mit @ref@ (z.B. 3 OBJE @M00001@) → bleibt in sourceExtra{} verbatim
sourceMedia[sId] = [{ file, scbk, prim, titl, note, _extra:[] }]
// _extra[] über _ptDepth=4: FORM/TYPE unter FILE verbatim
```

**Optimierungspotenzial (kein Datenverlust, aber im UI nicht editierbar):**
- Mehrfache inline INDI-Notes → Roundtrip stabil (`noteTexts[]`-Array); beim Editieren im Formular zu einer Note zusammengeführt
- *(Erledigt: `DIV`, `DIVF`, `ENG`/`ENGA` → seit sw v134 als strukturierte FAM-Events)*
- *(Erledigt: `DSCR`, `IDNO`, `SSN` → seit sw v148 als events[] strukturiert)*
- *(Erledigt: `CENS`, `CONF`, `FCOM`, `ORDN`, `RETI`, `PROP`, `WILL`, `PROB` → seit v4-dev als events[] strukturiert)*
- *(Erledigt: Extra-NAME-Blöcke → seit v4-dev `extraNames[]`, vollständig editierbar)*

---

## Roundtrip-Delta-Verlauf (MeineDaten_ancestris.ged, 2796 Personen)

| Stand | Delta |
|---|---|
| Sprint 10 Ausgangslage | -708 |
| + Verbatim Passthrough INDI/FAM | -226 |
| Sprint 12: frelSeen/mrelSeen, extraRecords | -126 |
| Sprint 13: alle OBJE-Kontexte | -84 |
| Roundtrip-Fix 2026-03-24 | ~-12 |
| Roundtrip-Fix 2026-03-26: addrExtra, NICK-Position, _FREL-Space | **-7** |
| v4-dev 2026-03-28: HEAD `_headLines[]`, ENGA vollständig, leere Events `seen`-Flag, NOTE-Record Sub-Tags, MAP ohne PLAC | **-7** |
| v4-dev 2026-03-28: ENGA MAP, leere DATE/PLAC `null`-Init | **≈0** |
| v5-dev 2026-04-05: DIV/DIVF/ENG strukturiert (sw v134); ENGA passthrough-Filter fix (sw v135) | **≈0** |
| v5-dev 2026-04-05: Parser lv>4 passthrough fix + writer `updateHeadDate=false` (sw v142) | **0** |
| v5-dev 2026-04-05: `DSCR`/`IDNO`/`SSN` aus passthrough → `events[]` (sw v148) | **0** |

`roundtrip_stable: true` · `net_delta=0` — alle Tag-Counts bestanden; TIME-stabil (out1 === out2).

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
        └── _downloadBlob(content, MeineDaten.ged)                    ← Aktuelle Version
```

**Lade-Flow (Chrome Mac):**
```
openFilePicker()
    └── showOpenFilePicker()
        ├── requestPermission({ mode: 'readwrite' })
        ├── testCanWrite(fh) → createWritable() → abort() → true/false
        ├── _canDirectSave = true/false
        └── idbPut('fileHandle', fh)  ← für nächste Session

restoreFileHandle() (bei Seitenreload)
    └── idbGet('fileHandle')
        └── queryPermission() === 'granted' → _fileHandle restauriert
```

---

---

### ADR-013: Pfad-basiertes Medien-Laden + od_base_path-Architektur (sw v99 → v110/v111)
**Entscheidung:** `m.file` ist die einzige Wahrheitsquelle für Medien. Werte in `m.file` sind **relative Pfade** bezogen auf `od_base_path` (dem OneDrive-Ordner der GED-Datei).

**Pfad-Konzept:**
```
od_base_path          = absoluter OneDrive-Pfad des GED-Datei-Ordners
                        (auto-abgeleitet via parentReference.path beim Laden — sw v111)
                        z.B. "Privat/Genealogie"

m.file (GEDCOM FILE)  = relativer Pfad ab od_base_path
                        z.B. "Pictures/Hans_1890.jpg"

fullPath (API-Aufruf) = od_base_path + '/' + m.file
                        z.B. "Privat/Genealogie/Pictures/Hans_1890.jpg"
```

**Laden (2-Schritt via @microsoft.graph.downloadUrl — sw v107):**
```
1. _odGetMediaUrlByPath(relPath)
   a. Metadaten: GET /me/drive/root:/{fullPath}?$select=@microsoft.graph.downloadUrl
   b. Fetch downloadUrl (kein Auth-Header — CDN-URL, kein CORS-Problem)
   c. FileReader → base64 Data-URL → IDB-Cache ('img:' + relPath) + Session-Cache
2. IDB-Cache ('img:' + relPath)          ← persistent (sw v105: pfad-basierte Keys)
3. Legacy: od_filemap Index→fileId       ← nur für Altdaten
```

**Picker-Navigation (sw v110):**
- Startet aus `od_photo_folder` / `od_docs_folder` (relPath relativ zu od_base_path)
- `↑ Übergeordneter Ordner`: via `parentReference`-API; kann über od_base_path hinaus navigieren
- Gewählter Pfad → `relPath = _odToRelPath(fullPath, od_base_path)` → in `m.file` geschrieben

**Kamera-Upload:**
- `_addMediaDefaultFolderPath` = `od_photo_folder.relPath` (relativ)
- Upload-Ziel: `od_base_path + '/' + relPath + '/' + filename`
- `m.file` = `relPath + '/' + filename` (relativ, konsistent mit Picker)

**IDB-Schlüssel (OneDrive, aktuell):**
- `od_base_path` — absoluter Pfad (String), auto-gesetzt beim GED-Laden
- `od_photo_folder` — `{ id, name, relPath }` — Foto-Ordner
- `od_docs_folder` — `{ id, name, relPath }` — Dokumente-Ordner

**Deprecated:**
- `od_default_folder` / `od_doc_folder` — alte Struktur mit `folderPath` (absolut)
- `od_filemap` / `od_doc_filemap` — fileId-Index-Mapping
- `cfg_photo_base` / `cfg_doc_base` — Basispfad-Konfigurationsfelder (entfernt in sw v110)

**Migration (sw v110):** `_odMigrateIfNeeded()` — einmalig beim ersten `openSettings()`-Aufruf; konvertiert alte IDB-Struktur; `_odStripBaseFromPaths()` bereinigt m.file-Werte.

---

### ADR-014: PEDI statt _FREL/_MREL für Eltern-Kind-Verhältnis (sw v121)
**Entscheidung:** Eltern-Kind-Verhältnistyp wird als GEDCOM 5.5.1-Standard `PEDI` unter `FAMC` geschrieben statt als Ancestris-Extension `_FREL`/`_MREL`.

**Motivation:** Ancestris-Kompatibilität nicht mehr erforderlich; Standard-Kompatibilität mit FamilySearch, GRAMPS, Ancestry etc. wichtiger.

**GEDCOM 5.5.1-Ziel-Format:**
```
1 FAMC @Fxx@
2 PEDI birth            ← Standard-Enum: birth | adopted | foster | sealing
2 SOUR @Sxx@            ← Quelle direkt unter FAMC (Standard-konform)
3 PAGE S.42
3 QUAY 2
```

**Wert-Mapping `_toPedi(v)` in `gedcom-writer.js`:**
| Eingang (beliebig) | PEDI-Output |
|---|---|
| birth, leiblich, biologisch, natürlich | birth |
| adopted, adoptiert, adoption | adopted |
| foster, pflegekind, pflege | foster |
| sealing | sealing |
| unbekannt / leer / anderes | birth (Default) |

**Parser-Verhalten (Backward-Compat):**
- Liest `PEDI` → setzt `fref.pedi`, `fref.frel`, `fref.mrel`
- Liest `_FREL`/`_MREL` weiterhin (für alte Dateien) — hat Vorrang vor PEDI
- Post-Processing-Merge: FAM-side `childRelations` → INDI-side `famc` wenn INDI-Seite leer

**Writer-Verhalten:**
- `frel == mrel` (Normalfall): schreibt `2 PEDI <wert>`
- `frel ≠ mrel` (seltener Sonderfall): schreibt `_FREL`/`_MREL` (kein Datenverlust)
- Quellen aus `sourIds`+`frelSour`+`mrelSour` dedupl. als `2 SOUR` direkt unter FAMC
- `CHIL`-Block im FAM-Record ohne Sub-Tags (Verhältnis nur auf INDI-Seite)

**Test-Strategie:** Idempotenz-Test (`test_idempotency.html`) — Strategie B:
```
Original → parse() → write() → text1 → parse() → write() → text2
                                                   ↓
                                             text1 === text2 ?
```
Ergebnis auf 2811 Personen: BESTANDEN, 622×PEDI birth, 0×_FREL/_MREL im Output.

---

## Bekannte Einschränkungen

| Problem | Ursache | Status |
|---|---|---|
| ~~DIV/DIVF nicht editierbar~~ | → sw v134/v147: als FAM-Events strukturiert + Formularfelder | Abgeschlossen (v5-dev) |
| Mehrere inline INDI-Notes beim Editieren zusammengeführt | ui-forms.js joind noteTexts[] beim Laden; speichert als einzelne Note — Roundtrip ohne Edit stabil | Backlog |
| localStorage-Limit | ~5 MB Limit, Datei ≈ 5 MB | Toast-Warnung wenn voll |
| ~~State-Management~~ | 22 cross-file Globals → `AppState`/`UIState` Namespaces | Abgeschlossen (v4.0) |
| Cmd+Z = "Revert to Saved" | Kein granulares Undo | Dokumentiert, UX-Problem |
| ~~Virtuelles Scrollen~~ | → sw v145: Spacer-div-Ansatz, O(log n) Binary-Search | Abgeschlossen (v5-dev) |
| ~~`ui-views.js` gross~~ | → 5 Module aufgeteilt (sw v94) | Abgeschlossen (v5-dev) |
| ~~`onedrive.js` 946 Z.~~ | → 3 Module aufgeteilt (sw v140) | Abgeschlossen (v5-dev) |
| ~~`ui-forms.js` 1036 Z.~~ | → 3 Module aufgeteilt (sw v141) | Abgeschlossen (v5-dev) |
