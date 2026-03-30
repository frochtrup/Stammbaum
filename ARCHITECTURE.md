# Architektur

Architektur-Entscheidungen (ADRs), Passthrough-System, Speicher-Architektur.
Datenmodell: `DATAMODEL.md` · UI/CSS/Layout: `UI-DESIGN.md` · Sprint-Geschichte: `CHANGELOG.md`

---

## Überblick

```
┌──────────────────────────────────────────────────────┐
│          Stammbaum PWA v4.0-dev (Branch v4-dev)      │
│  Keine externen Dependencies · Kein Build-Step       │
│  Keine Frameworks · Kein Server                      │
│                                                      │
│  index.html        — App-Shell (HTML + CSS)          │
│  gedcom.js         — Globals, Labels, Datum/PLAC     │
│  gedcom-parser.js  — parseGEDCOM()                   │
│  gedcom-writer.js  — writeGEDCOM(), pushCont()       │
│  storage.js        — IndexedDB, Dateiverwaltung      │
│  ui-views.js       — Baum, Detail, Listenrendering   │
│  ui-forms.js       — Formulare (Person/Fam/Src/Repo) │
│  ui-media.js       — Medien Add/Edit/Delete/Browser  │
│  onedrive.js       — OAuth, Foto-Import, Filemap     │
│  sw.js             — Service Worker (Cache v73)      │
│  manifest.json     — PWA-Manifest                    │
│  demo.ged          — Demo-GEDCOM (12 Pers., 6 Fam.)  │
└──────────────────────────────────────────────────────┘
```

**Größe gesamt:** ~10 JS-Dateien · ~180 Funktionen · ~8500 Zeilen

---

## Architektur-Entscheidungen (ADRs)

### ADR-001: Multi-File (HTML-Shell + JS-Module)
**Entscheidung (ab v3.0):** `index.html` ist reine App-Shell (HTML + CSS). JavaScript in Modulen: `gedcom.js`, `gedcom-parser.js`, `gedcom-writer.js`, `storage.js`, `ui-views.js`, `ui-forms.js`, `ui-media.js`, `onedrive.js`.

**Vorgänger:** v1.x–v2.x waren Single-File-HTML (~4700 Z.). Bei ~5000 Zeilen wurde aufgeteilt.

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

### ADR-003: Globales `db`-Objekt als State
**Entscheidung:** Ein globales `let db` als einzige Wahrheitsquelle. Details: `DATAMODEL.md`.

**Konsequenz:** Kein Undo/Redo. Bei Seitenreload sind ungespeicherte Änderungen weg (außer Auto-Load aus IDB).

---

### ADR-004: IndexedDB für Auto-Load (ab Sprint P3-1)
**Entscheidung:** Der GEDCOM-Text wird primär in IndexedDB gecacht. localStorage ist stiller Fallback.

```
IDB-Keys: 'stammbaum_ged', 'stammbaum_ged_backup', 'stammbaum_filename'
          'photo_<id>_N', 'od_filemap', 'od_doc_filemap', 'od_doc_folder'
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

**Was landet in `_passthrough` (INDI):**
- Unbekannte lv=1-Tags: `DSCR`, `IDNO`, `SSN`
- `1 OBJE @ref@`-Referenzen (externe Medien-Records)
- *(Nicht mehr in passthrough: `CENS`, `CONF`, `FCOM`, `ORDN`, `RETI`, `PROP`, `WILL`, `PROB` — seit v4-dev als `events[]` strukturiert)*
- *(Nicht mehr in passthrough: Extra-NAME-Blöcke — seit v4-dev strukturiert in `extraNames[]`, vollständig editierbar via ui-forms.js)*

**Was landet in `_passthrough` (FAM):** `DIV`, `DIVF`, andere unbekannte lv=1-Tags

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
| 5 | `frelSourExtra[]` / `mrelSourExtra[]` | FAMC + FAM CHIL | 2.+ SOUR unter _FREL/_MREL + deren 4-Level-Kinder |
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
- `DIV`, `DIVF` → FAM-Events fehlen im Parser (in `_passthrough`)
- Mehrfache inline INDI-Notes → Roundtrip stabil (`noteTexts[]`-Array); beim Editieren im Formular zu einer Note zusammengeführt
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

`roundtrip_stable: true` · Verbleibende Verluste: CONC/CONT-Neuformatierung + HEAD-Rewrite (by design).

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

## Bekannte Einschränkungen

| Problem | Ursache | Status |
|---|---|---|
| DIV/DIVF nicht editierbar | FAM-Events fehlen im Parser (in _passthrough) | Backlog |
| Mehrere inline INDI-Notes beim Editieren zusammengeführt | ui-forms.js joind noteTexts[] beim Laden; speichert als einzelne Note — Roundtrip ohne Edit stabil | Backlog |
| localStorage-Limit | ~5 MB Limit, Datei ≈ 5 MB | Toast-Warnung wenn voll |
| ~~State-Management~~ | 22 cross-file Globals → `AppState`/`UIState` Namespaces | Abgeschlossen |
| Cmd+Z = "Revert to Saved" | Kein granulares Undo | Dokumentiert, UX-Problem |
| Virtuelles Scrollen | Listen >1000 Einträge langsam | v5 geplant |
| `ui-views.js` gross (1839 Z.) | Baum + Detail + Listen + Listenrendering gemischt | Backlog |
