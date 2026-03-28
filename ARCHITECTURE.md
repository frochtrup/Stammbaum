# Architektur

## Überblick

```
┌──────────────────────────────────────────────────────┐
│          Stammbaum PWA v4.0-dev (Branch v4-dev)      │
│  Keine externen Dependencies · Kein Build-Step       │
│  Keine Frameworks · Kein Server                      │
│                                                      │
│  index.html    — App-Shell (HTML + CSS)              │
│  gedcom.js     — GEDCOM-Parser + Writer              │
│  storage.js    — IndexedDB, Dateiverwaltung          │
│  ui-views.js   — Baum, Detail, Listenrendering       │
│  ui-forms.js   — Formulare, OneDrive, Medien         │
│  sw.js         — Service Worker (Cache v33)          │
│  manifest.json — PWA-Manifest                        │
└──────────────────────────────────────────────────────┘
```

**Größe gesamt:** ~7 Dateien · ~200 Funktionen · ~600 KB

---

## Architektur-Entscheidungen (ADRs)

### ADR-001: Multi-File (HTML-Shell + JS-Module)
**Entscheidung (ab v3.0):** `index.html` ist reine App-Shell (HTML + CSS). JavaScript in 4 Modulen: `gedcom.js`, `storage.js`, `ui-views.js`, `ui-forms.js`.

**Vorgänger:** v1.x–v2.x waren Single-File-HTML (~4700 Z.). Bei ~5000 Zeilen wurde aufgeteilt.

**Warum:**
- Einzelne Dateien bleiben editierbar ohne vollständigen Download/Upload
- Klare Trennung: Parser (gedcom.js) / Storage (storage.js) / Rendering (ui-views.js) / Formulare (ui-forms.js)
- Kein npm, kein Webpack, kein Build-Prozess — globale Funktionen zwischen Dateien

**Konsequenzen:**
- Kein echtes Modul-System (kein `import/export`) — alle Funktionen global
- Kein Hot-Reload, kein TypeScript, kein Linting
- `<script src="...">` Reihenfolge muss Abhängigkeiten respektieren

---

### ADR-002: Vanilla JavaScript, kein Framework
**Entscheidung:** Kein React, Vue, Angular.

**Muster im Code:**
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
**Entscheidung:** Ein globales `let db` als einzige Wahrheitsquelle.

```javascript
let db = {
  individuals:  { '@I1@': { ...Person }, '@I2@': { ... } },
  families:     { '@F1@': { ...Familie } },
  sources:      { '@S1@': { ...Quelle } },
  repositories: { '@R1@': { ...Archiv } },   // v1.2
  notes:        { '@N1@': { id, text } },     // v2.0-dev: NOTE-Records
  placForm:     'Dorf, Stadt, PLZ, ...',      // v2.0-dev: HEAD PLAC FORM
};
let changed = false;  // Änderungs-Flag
```

**Konsequenz:** Kein Undo/Redo. Bei Seitenreload sind ungespeicherte Änderungen weg (außer Auto-Load aus IDB).

---

### ADR-004: IndexedDB für Auto-Load (ab Sprint P3-1)
**Entscheidung:** Der GEDCOM-Text wird primär in IndexedDB gecacht (`stammbaum_ged`, `stammbaum_ged_backup`, `stammbaum_filename`). localStorage ist stiller Fallback.

```javascript
// IDB-Keys: 'stammbaum_ged', 'stammbaum_ged_backup', 'stammbaum_filename'
// Fotos: 'photo_<personId>'
// FileHandle: 'fileHandle'

// tryAutoLoad(): IDB first → localStorage-Fallback + automatische Migration
// _processLoadedText(): schreibt in IDB + localStorage (stiller Fallback)
```

**Warum IDB:** localStorage-Limit ~5–10 MB; MeineDaten.ged ≈ 5 MB war grenzwertig. IDB unterstützt beliebige Dateigrößen und auch Binary (FileHandle, Fotos).

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
**Entscheidung:** Beim Öffnen einer Datei auf Chrome Desktop wird `showOpenFilePicker()` verwendet und sofort Schreiberlaubnis per `requestPermission({ mode: 'readwrite' })` angefragt. Der `FileSystemFileHandle` wird in IndexedDB gespeichert.

**Speichern-Flow:**
```
Chrome Mac:
  openFilePicker() → showOpenFilePicker() → requestPermission(readwrite)
  exportGEDCOM()  → fileHandle.createWritable() → write → close
  Fallback (Cloud-Lock): Toast "Nochmals versuchen"

Safari Mac / Firefox:
  <input type="file"> → readFile() → kein fileHandle
  exportGEDCOM() → _downloadBlob() → <a download> → ~/Downloads
  + Timestamped-Backup wenn Inhalt geändert
```

**Wichtig:** `showDirectoryPicker()` + `createWritable()` wurde in v1.2 getestet und schlug auf macOS + iCloud Drive fehl (`NotAllowedError`). `showOpenFilePicker()` mit explizit angefragter Schreiberlaubnis funktioniert jedoch (Chrome). `mode: 'readwrite'` als Option von `showOpenFilePicker()` ist nicht standardisiert und wurde entfernt.

**Safari:** `showOpenFilePicker` nicht unterstützt → `<input type="file">` → `_downloadBlob()`.

**iOS:** Unverändert — Share Sheet mit Hauptdatei + Zeitstempel-Backup.

---

### ADR-008: BIRT/CHR/DEAT/BURI als Sonder-Events
**Entscheidung:** Die vier Hauptereignisse werden nicht in `p.events[]` gespeichert, sondern als eigene Objekte auf der Person.

```javascript
p.birth = { date, place, lati, long, sources, sourcePages }
p.chr   = { date, place, lati, long, sources, sourcePages }
p.death = { date, place, lati, long, sources, sourcePages, cause }
p.buri  = { date, place, lati, long, sources, sourcePages }
p.events = [ { type, date, place, ... } ]  // alle anderen
```

Die UI behandelt alle sechs (inkl. BIRT/CHR/DEAT/BURI) über dasselbe Formular (`#modalEvent`). Die Zuordnung erfolgt über `_SPECIAL_OBJ`:
```javascript
const _SPECIAL_OBJ = { BIRT:'birth', CHR:'chr', DEAT:'death', BURI:'buri' };
```

---

### ADR-009: Globale Bottom-Navigation
**Entscheidung:** Navigation über eine persistente Bottom-Nav außerhalb aller `.view`-Divs (März 2026).

**Warum:**
- Baum ist Standardansicht nach Datei-Load — Bottom-Nav muss von dort erreichbar sein
- Horizontale Tabs waren nur aus Listenansicht zugänglich
- 5 gleichwertige Bereiche: Baum | Personen | Familien | Quellen | Orte

```
Vorher: v-landing → v-main (Tabs) ↔ v-tree (Sackgasse) ↔ v-detail
Nachher: v-landing → [v-main | v-tree] ↔ v-detail
                     ↑__________________________↑
                     Bottom-Nav (persistent, außerhalb aller Views)
```

**Sichtbarkeit:** `flex` in `v-main` + `v-tree`, `none` in `v-landing` + `v-detail`.

---

### ADR-010: PLAC-Toggle (v2.0-dev)
**Entscheidung:** Orts-Eingabe wechselt zwischen Freitext und strukturierten PLAC.FORM-Feldern. Kein automatisches Parsen bestehender Orte — nur neu eingegebene Orte nutzen die Struktur.

**Pattern:**
```javascript
const _placeModes = {};  // { placeId: 'free'|'parts' }
// Initialisierung in showEventForm/showFamilyForm:
initPlaceMode('ef-place');
// Toggle-Button ruft auf:
togglePlaceMode('ef-place');
// Beim Speichern:
getPlaceFromForm('ef-place');  // liest je nach Modus Freitext oder joinPlaceParts()
```

**Warum:** PLAC.FORM-Felder aus HEAD (`db.placForm`) definieren bis zu 6 Labels (z.B. „Dorf, Stadt, PLZ, Landkreis, Bundesland, Staat"). Neue Orte können so strukturiert eingegeben werden, bestehende Freitext-Orte bleiben kompatibel.

---

### ADR-012: Verbatim Passthrough für unbekannte GEDCOM-Tags (Sprint 11)
**Entscheidung:** Anstatt unbekannte GEDCOM-Tags bei Parse→Write zu verlieren, werden sie verbatim in einem `_passthrough[]`-Array auf dem Record gespeichert und am Ende des Records wieder ausgegeben.

**Mechanismus:**
```javascript
// Parser-State
let _ptDepth = 0;   // > 0: alle tieferen Ebenen gehen in passthrough

// Prüfung vor jeder Zeile (nach Context-Tracking, vor Tag-Handling)
if (_ptDepth > 0) {
  if (lv > _ptDepth) {
    cur._passthrough.push(lv + ' ' + tag + (val ? ' ' + val : ''));
    continue;  // nicht weiter verarbeiten
  } else {
    _ptDepth = 0;  // verlassen (lv <= _ptDepth)
  }
}

// In INDI/FAM/SOUR lv=1 else-Zweig:
else {
  cur._passthrough.push('1 ' + tag + (val ? ' ' + val : ''));
  _ptDepth = 1;
}

// Writer (am Ende des Records):
for (const l of (record._passthrough || [])) lines.push(l);
```

**Sonderfälle:**
- `_nameParsed`: erster `1 NAME`-Block → strukturiert; weitere NAME-Blöcke (z.B. Geburtsname) → passthrough
- INDI OBJE: vollständig in passthrough (FILE, FORM, _SCBK, _PRIM, TYPE — keine strukturierte media[]-Verarbeitung)
- SOUR OBJE/DATA/etc.: alle nicht explizit behandelten lv1-Tags → passthrough
- FAM: MARR.value gespeichert (für `1 MARR Y`); unbekannte lv1-Tags → passthrough

**Val-Fix (CONC-Stabilität):**
```javascript
// Vorher (verursachte Instabilität — raw.trim() entfernt trailing Spaces aus CONT/CONC-Werten):
const line = raw.trim();
// Nachher:
const line = raw.replace(/\r$/, '');  // nur CR entfernen (Windows CRLF), leading spaces nie in GEDCOM
if (!line.trim()) continue;           // Leerzeilen überspringen
const val = (m[3] || '').replace(/^ /, '').trimEnd();  // genau 1 Leerzeichen (GEDCOM-Delimiter)
```

**RELI als Event (Roundtrip-Fix 2026-03-24):**
`1 RELI` wurde als einfaches String-Feld (`cur.reli = val`) gespeichert. Ancestris schreibt unter `1 RELI` auch `2 DATE`, `2 TYPE`, `2 SOUR` — diese wurden bei `evIdx=-1` stillschweigend verworfen. Fix: RELI ist jetzt in `events[]` wie OCCU/RESI/etc.

**FAM CHIL `2 SOUR` (Roundtrip-Fix 2026-03-24):**
```javascript
// childRelations[childId] enthält jetzt auch:
{ ..., sourIds:[], sourPages:{}, sourQUAY:{}, sourExtra:{} }
// Parser: lv=2 (direkte SOUR unter CHIL) + lv=3 (PAGE/QUAY/Extra unter dieser SOUR)
// Writer: sourIds[] werden vor _FREL/_MREL ausgegeben
```

**Mehrere SOUR unter _FREL/_MREL (Roundtrip-Fix 2026-03-24):**
```javascript
// Ancestris schreibt manchmal zwei 3 SOUR unter einem 2 _FREL:
// 2 _FREL Leiblich
// 3 SOUR @@S9@@   ← erster → frelSour
// 3 SOUR @@S4@@   ← zweiter → frelSourExtra[]
if (!cref.frelSour) cref.frelSour = val;
else { cref.frelSourExtra = cref.frelSourExtra || []; cref.frelSourExtra.push('3 SOUR ' + val); }
// Gilt für FAM childRelations (lv=3) und INDI FAMC (lv=3)
```

**Auto-Diff im Roundtrip-Test:**
Multiset-Vergleich (Original vs. out1): zählt fehlende Zeilen, gruppiert nach Tag-Typ, zeigt top-20.
Unterscheidet echte Verluste von Normalisierungs-Artefakten (DATE-Format, CONC-Resplitting).

**Ergebnis (MeineDaten_ancestris.ged, 2796 Personen):**
| Stand | Zeilen-Delta |
|---|---|
| Sprint 10 Ausgangslage | -708 |
| + DEAT.value fix (`1 DEAT Y`) | -290 |
| + Verbatim Passthrough INDI/FAM | -226 |
| + SOUR Passthrough + CONC Val-Fix | -179 |
| + INDI OBJE → Passthrough | ~-100 |
| Sprint 12: frelSeen/mrelSeen, extraRecords | -126 |
| Sprint 13: alle OBJE-Kontexte | -84 |
| Roundtrip-Fix 2026-03-24: RELI/CHIL-SOUR/frelSourExtra | ~-12 |
| Roundtrip-Fix 2026-03-26: addrExtra, NICK-Position, _FREL-Space | **-7** |
| v4-dev 2026-03-28: HEAD verbatim `_headLines[]`, ENGA vollständig, leere Events `seen`-Flag, NOTE-Record Sub-Tags, MAP ohne PLAC, BIRT/CHR/DEAT/BURI lv3 SOUR routing | **-7** |
| v4-dev 2026-03-28: ENGA MAP-Koordinaten, leere DATE/PLAC (`null`-Init), DATE/PLAC-Diagnose | **≈0** |

`roundtrip_stable: true` · Verbleibende Verluste: CONC/CONT/PAGE (Neuformatierung, kein Datenverlust) + HEAD-Rewrite (by design).

---

### Passthrough-Mechanismen — Vollständige Analyse (2026-03-26)

9 distinkte Mechanismen sichern GEDCOM-Daten die der Parser nicht strukturiert verarbeitet:

| # | Feld | Kontext | Was landet drin |
|---|------|---------|-----------------|
| 1 | `db.extraRecords[]._lines[]` | lv=0 Records | SUBM und andere `@ID@`-Records komplett verbatim |
| 2 | `cur._passthrough[]` | INDI / FAM / SOUR | Unbekannte lv=1 Tags + Sub-Trees; NAME-Kontext lv≥2 (NICK etc.) |
| 3 | `ev._extra[]` / `marr._extra[]` / `birth._extra[]` etc. | Event-Kontexte | Unbekannte lv=2 Tags in Events (alle Ereignisse) |
| 4 | `ev.addrExtra[]` / `r.addrExtra[]` | ADDR-Kontext | Sub-Tags von ADDR: CITY, POST, CONT, _STYLE, _MAP, _LATI, _LONG |
| 5 | `frelSourExtra[]` / `mrelSourExtra[]` | FAMC + FAM CHIL | 2.+ SOUR unter _FREL/_MREL + deren 4-Level-Kinder (PAGE/QUAY/extra) |
| 6 | `sourceExtra{}` | SOUR-Refs in Events | Unbekannte lv=3 Tags unter `2 SOUR @ID@` in Event-Kontext |
| 7 | `topSourceExtra{}` | INDI lv=1 SOUR | Unbekannte lv=2 Tags unter `1 SOUR @ID@` direkt auf INDI |
| 8 | `media._extra[]` | OBJE (inline) | Unbekannte Tags unter OBJE/FILE-Block |
| 9 | `childRelations.sourExtra{}` | FAM CHIL SOUR | Unbekannte lv=3 unter `2 SOUR` in CHIL-Kontext |

**Was landet in `_passthrough` (Mechanismus 2):**
- INDI unbekannte lv=1: `CENS`, `CONF`, `FCOM`, `ORDN`, `RETI`, `PROP`, `WILL`, `PROB`, `DSCR`, `IDNO`, `SSN` — in `EVENT_LABELS` definiert aber **nicht** in der Events-Erkennungs-Liste → Passthrough statt Event-Objekt
- INDI: Extra-NAME-Blöcke (2. Name, Alias, Geburtsname)
- INDI: `1 OBJE @ref@`-Referenzen (externe Medien-Records)
- FAM: `DIV`, `DIVF` — in EVENT_LABELS aber nicht als FAM-Events geparst
- SOUR: `1 DATA` (GEDCOM 5.5 Standard), `1 NOTE`, `1 REFN`

**`_ptTarget`-Mechanismus:**
Spezialisierte Arrays (4–9) nutzen `_ptTarget` als Redirect damit Daten kontextspezifisch landen statt im globalen `_passthrough`. `_ptDepth` steuert die Tiefe: `lv > _ptDepth` → capture; `lv <= _ptDepth` → Passthrough beenden.

**`_ptNameEnd`-Index (Name-Kontext):**
```javascript
// NAME-Kontext lv≥2 Passthrough-Items (z.B. 2 NICK) stehen am Array-Anfang
let _ptNameEnd = 0;
while (_ptNameEnd < _pt.length && /^[2-9] /.test(_pt[_ptNameEnd])) _ptNameEnd++;
// → direkt nach NAME-Block ausgeben (nicht am Record-Ende nach CHAN!)
for (let i = 0; i < _ptNameEnd; i++) lines.push(_pt[i]);
// Record-End-Passthrough: _ptNameEnd..end
for (let i = _ptNameEnd; i < _pt.length; i++) lines.push(_pt[i]);
```

**Optimierungspotenzial (nicht kritisch, kein Datenverlust):**
- `CENS`, `CONF`, `FCOM`, `ORDN`, `RETI`, `PROP`, `WILL`, `PROB` → könnten als Events strukturiert werden (bereits in EVENT_LABELS) → Bearbeitbarkeit im UI
- `DIV`, `DIVF` → könnten als FAM-Events strukturiert werden
- Mehrfache inline INDI-Notes (mehrere `1 NOTE` ohne @ref@) → werden konkateniert statt als Array gespeichert → beim Re-Write ein `1 NOTE` statt zwei

---

### ADR-011: 3-Felder-Datum (v2.0-dev)
**Entscheidung:** Datumseingabe als 3 separate Felder (Tag / Monat / Jahr) + Qualifier-Dropdown statt einem Freitext-Feld.

**Pattern:**
```javascript
// Lesen: readDatePartFromFields('ef-date') → '12 MAR 1845'
// Schreiben: writeDatePartToFields('ef-date', '12 MAR 1845')
// Normierung: normMonth('März') → 'MAR'; normMonth('3') → 'MAR'
// Aufbau: buildGedDateFromFields('ef-date-qual', 'ef-date', 'ef-date2') → 'BET 1880 AND 1890'
```

**Warum:** Freitext führt zu inkonsistenten Formaten. 3 Felder ermöglichen strukturierte Eingabe bei gleichzeitiger Rückwärtskompatibilität (Raw-String im Modell bleibt unverändert).

---

## HTML-Seitenstruktur

```
body
├── #v-landing          Startseite: GEDCOM laden / Demo
│   ├── Upload-Box      Drag & Drop + Datei-Picker
│   ├── .landing-tagline  „Vollständig im Browser · Keine Installation · Keine Cloud"
│   ├── Demo-Button     loadDemo()
│   └── Hilfe-Link      öffnet #modalHelp
│
├── #v-main             Hauptansicht (Listen-Tabs)
│   ├── .topbar         App-Titel „⚘ Stammbaum" · ☁️ Speichern · ☰ Menü
│   ├── #tab-persons    Personen-Liste mit Suche
│   ├── #tab-families   Familien-Liste mit Suche
│   ├── #tab-sources    Quellen-Liste mit Suche
│   └── #tab-places     Orte-Liste mit Suche
│
├── #v-detail           Detailansicht (Person / Familie / Quelle / Ort)
│   ├── .topbar         ← Zurück · Titel · ⧖ Sanduhr · Bearbeiten
│   └── #detailContent  dynamisch gerendert
│       ├── .fact-row + inline §N Quellen-Badges
│       └── .family-nav-row  (⚭ Familie › in Person-Detail)
│
├── #v-tree             Sanduhr-Stammbaum (Standardansicht nach Load)
│   ├── .topbar         Personenname · ☁️ Speichern · ☰ Menü
│   └── #treeScroll
│       └── #treeWrap   Absolut positionierte Karten + SVG-Linien
│           └── #treeSvg  Bezier-Kurven
│
├── #bottomNav          Globale Bottom-Navigation (außerhalb Views)
│   ├── #bnav-tree      ⧖ Baum
│   ├── #bnav-persons   👤 Personen
│   ├── #bnav-families  ⚭ Familien
│   ├── #bnav-sources   📖 Quellen
│   ├── #bnav-places    📍 Orte
│   └── #bnav-search    🔍 Suche
│
├── Modals (Bottom Sheets)
│   ├── #modalAdd       + Neu (Auswahl: Person / Familie / Quelle)
│   ├── #modalPerson    Person bearbeiten
│   ├── #modalFamily    Familie bearbeiten
│   ├── #modalSource    Quelle bearbeiten
│   ├── #modalEvent     Ereignis hinzufügen / bearbeiten (inkl. BIRT/CHR/DEAT/BURI)
│   ├── #modalPlace     Ort umbenennen
│   ├── #modalNewPlace  Neuen Ort anlegen
│   ├── #modalRelPicker Beziehungs-Picker: Person suchen/wählen oder neu erstellen (v1.1)
│   ├── #modalRepo      Archiv bearbeiten/erstellen (v1.2)
│   ├── #modalRepoPicker Archiv-Picker im Quellen-Formular (v1.2)
│   ├── #modalMenu      ☰ Menü (Speichern, Backup, neue Datei)
│   └── #modalHelp      Hilfe & Anleitung (iPhone-Workflow, Desktop-Backup etc.)
│
├── .fab                Floating Action Button (＋), ausgeblendet auf Orte-Tab + Baum
├── .export-bar         Speichern-Leiste (sichtbar wenn Änderungen)
└── #toast              Status-Meldungen (auto-hide nach 2.8s)
```

---

## Navigations-Modell

### View-Hierarchie
```
v-landing          (kein Back, kein BottomNav)
    ↓ Datei laden
[v-tree | v-main]  (BottomNav sichtbar)
    ↓ Karte/Zeile anklicken
v-detail           (BottomNav versteckt)
    ↓ ← Zurück
[v-tree | v-main]  ← je nach Herkunft (History-Stack)
```

### History-Stack (_navHistory)
- `_beforeDetailNavigate()` wird am Anfang jeder Detail-Funktion aufgerufen
- Kommt man von `v-tree` → `{ type:'tree', id:currentTreeId }` in History
- Kommt man von `v-detail` (Detail→Detail) → aktuellen State in History
- Kommt man von `v-main` → History löschen (frischer Einstieg)
- `goBack()` popt den Stack; leer → `showMain()`
- Alle show-Funktionen haben `pushHistory = true` als Default-Parameter (ersetzt `_skipHistoryPush`-Flag)
  - `showDetail(id, pushHistory = true)`, `showFamilyDetail(id, pushHistory = true)`, etc.
  - `goBack()` ruft mit `pushHistory = false` auf → kein History-Eintrag beim Zurücknavigieren

### Bottom-Nav Highlight
`setBnavActive(name)` mit `name ∈ { 'tree', 'persons', 'families', 'sources', 'places', 'search' }`
Wird aufgerufen in: `showTree()`, `showMain()`, `bnavTree()`, `bnavTab()`

---

## Datenmodell

### Person (`db.individuals['@Ixx@']`)

```javascript
{
  // Identität
  id:          '@I003@',
  name:        'Heinrich Müller',        // Vorname Nachname
  given:       'Heinrich',
  surname:     'Müller',
  prefix:      'Dr.',                    // NPFX
  suffix:      'Jr.',                    // NSFX
  sex:         'M',                      // M | F | U
  titl:        'Graf',
  reli:        'evangelisch',
  uid:         'ABC123',                 // _UID (Ancestris)
  resn:        '',                       // RESN (v2.0-dev)
  email:       '',                       // EMAIL (v2.0-dev)
  www:         '',                       // WWW (v2.0-dev)

  // Hauptereignisse (Sonder-Objekte, nicht in events[])
  // date/place: null = Tag nicht vorhanden; '' = Tag vorhanden aber leer; 'Wert' = Wert
  birth: { date:'8 JAN 1872', place:'München', lati:48.1, long:11.5, sources:['@S1@'], sourcePages:{'@S1@':'47'}, sourceQUAY:{}, sourceExtra:{}, _extra:[], value:'', seen:true },
  chr:   { date:null, place:null, lati:null, long:null, sources:[], sourcePages:{}, sourceQUAY:{}, sourceExtra:{}, _extra:[], value:'', seen:false },
  death: { date:'15 APR 1940', place:'München', lati:null, long:null, sources:[], sourcePages:{}, sourceQUAY:{}, sourceExtra:{}, _extra:[], cause:'Herzversagen', value:'', seen:true },
  buri:  { date:null, place:null, lati:null, long:null, sources:[], sourcePages:{}, sourceQUAY:{}, sourceExtra:{}, _extra:[], value:'', seen:false },

  // Weitere Ereignisse
  events: [
    { type:'OCCU', value:'Kaufmann', date:null, place:null, lati:null, long:null,
      sources:[], sourcePages:{}, sourceQUAY:{}, note:'', addr:'', eventType:'' }
    // sourcePages: {sid: page} — Seitenangaben zu Quellenreferenzen (3 PAGE)
    // sourceQUAY:  {sid: '0'–'3'} — Quellenqualität (3 QUAY) — v2.0-dev
    // addr: Adresse (2 ADDR), nur bei RESI relevant; note: akkumuliert bei mehreren 2 NOTE
    // eventType: TYPE-Klassifikation (bei EVEN, FACT, MILI)
  ],

  // Quellen
  sourceRefs:  Set(['@S1@', '@S2@']),   // alle Quell-Referenzen der Person
  topSources:  ['@S1@'],                // SOUR direkt unter INDI (Level 1)
  nameSources: ['@S2@'],               // SOUR unter NAME

  // Notizen
  noteText:  'Freitext-Notiz',
  noteRefs:  ['@N1@'],                  // Referenzen auf NOTE-Records

  // Medien
  media: [{ file:'C:\\Fotos\\test.jpg', title:'Portrait' }],

  // Familien
  famc: [{ famId:'@F1@', frel:'birth', mrel:'birth' }],  // Kind in Familie
  fams: ['@F2@'],                        // Elternteil in Familie

  // Metadaten
  lastChanged: '15 FEB 2024',
}
```

### Familie (`db.families['@Fxx@']`)

```javascript
{
  husb:     '@I003@',
  wife:     '@I004@',
  children: ['@I005@', '@I006@'],
  marr:   { date:'5 APR 1898', place:'München', lati:null, long:null, sources:[], sourcePages:{}, sourceQUAY:{}, sourceExtra:{}, value:'', seen:true, addr:'', _extra:[] },
  engag:  { date:null, place:null, lati:null, long:null, sources:[], sourcePages:{}, sourceQUAY:{}, sourceExtra:{}, value:'', seen:false, _extra:[] },
  noteText: '',
  sourceRefs: Set(),
}
```

### Quelle (`db.sources['@Sxx@']`)

```javascript
{
  abbr:        'KB München St. Peter',
  title:       'Kirchenbuch München St. Peter',
  author:      'Stadtarchiv München',
  date:        '1845-1912',
  publ:        '',
  repo:        '@R1@',        // @Rxx@-Referenz ODER Legacy-Freitext ODER ''
  repoCallNum: 'IV/342',      // 2 CALN unter 1 REPO (v1.2)
  text:        '',
  lastChanged: '1 MAR 2026',  // CHAN/DATE — auto-gesetzt beim Speichern
}
```

### Archiv (`db.repositories['@Rxx@']`) — v1.2

```javascript
{
  id:          '@R1@',
  name:        'Stadtarchiv München',
  addr:        'Winzererstr. 68\n80797 München',  // \n für Mehrzeiligkeit
  phon:        '+49 89 233-30010',
  www:         'https://www.stadtarchiv.muenchen.de',
  email:       'stadtarchiv@muenchen.de',
  lastChanged: '1 MAR 2026',
}
```

---

## JavaScript-Sektionen

| Sektion | ca. Zeilen | Funktionen |
|---|---|---|
| State & IDs | 870–900 | `nextId(prefix)` |
| GEDCOM Parser | 962–1370 | `parseGEDCOM(text)`, `parseGeoCoord(val)` |
| GEDCOM Writer | 1374–1490 | `writeGEDCOM()` |
| Export / Speichern | 1494–1640 | `exportGEDCOM()`, `saveToDirectory()`, `pickSaveDir()`, `restoreDirHandle()`, `readFile()`, `loadDemo()`, `tryAutoLoad()` |
| Navigation | 1640–1830 | `showView()`, `showMain()`, `showStartView()`, `smallestPersonId()`, `switchTab()`, `renderTab()`, `updateStats()`, `markChanged()`, `setBnavActive()`, `bnavTree()`, `bnavTab()`, `_beforeDetailNavigate()`, `goBack()` |
| Personen-Liste | 1860–1930 | `renderPersonList()`, `filterPersons()` |
| Familien-Liste | 1930–1990 | `renderFamilyList()`, `filterFamilies()` |
| Quellen-Liste | 1990–2060 | `renderSourceList()`, `filterSources()`, `renderRepoList()` |
| Orte-System | 2060–2140 | `collectPlaces()`, `renderPlaceList()`, `filterPlaces()`, `showPlaceDetail()`, `showPlaceForm()`, `savePlace()` |
| Stammbaum (Sanduhr) | 2120–2320 | `getParentIds()`, `getChildIds()`, `showTree()`, `mkCard()`, `line()`, `lineHalf()` |
| Detail-Ansichten | 2320–2560 | `showDetail()`, `showFamilyDetail()`, `showSourceDetail()` |
| Beziehungs-Picker | 2560–2620 | `showAddSpouseFlow()`, `showAddChildFlow()`, `showAddParentFlow()`, `renderRelPicker()`, `relPickerSelect()`, `relPickerCreateNew()`, `openRelFamilyForm()`, `unlinkMember()` |
| Archiv-CRUD | 2620–2720 | `showRepoDetail()`, `showRepoForm()`, `saveRepo()`, `deleteRepo()`, `renderRepoPicker()`, `repoPickerSelect()`, `repoPickerCreateNew()`, `sfRepoUpdateDisplay()`, `sfRepoClear()`, `openRepoPicker()` |
| Render-Helfer | 2620–2720 | `factRow()`, `srcNum()`, `sourceTagsHtml()`, `relRow()` |
| Quellen-Widget | 2660–2720 | `initSrcWidget()`, `renderSrcTags()`, `renderSrcPicker()`, `toggleSrc()`, `removeSrc()`, `updateSrcPage()` |
| Formulare | 2720–2980 | `showPersonForm()`, `savePerson()`, `showFamilyForm()`, `saveFamily()`, `showEventForm()`, `saveEvent()`, `onEventTypeChange()`, `showSourceForm()`, `saveSource()` |
| Utils | 2980–3010 | `esc()`, `showToast()`, `openModal()`, `closeModal()` |
| IndexedDB | 1540–1560 | `_getIDB()`, `idbGet()`, `idbPut()`, `idbDel()` |

---

## Globale Variablen

```javascript
let db = { individuals:{}, families:{}, sources:{}, extraPlaces:{}, repositories:{}, notes:{}, placForm:'' };  // Hauptdaten
let changed = false;               // Ungespeicherte Änderungen?
let _placesCache = null;           // Cache für collectPlaces(); geleert in markChanged()
let currentPersonId  = null;       // Aktive Detailansicht
let currentFamilyId  = null;
let currentSourceId  = null;
let currentRepoId    = null;       // v1.2: aktive Archiv-Detailansicht
let currentTab = 'persons';        // Aktiver Tab: 'persons'|'families'|'sources'|'places'
let currentTreeId = null;          // Aktive Person in Sanduhr-Ansicht
const srcWidgetState = {};         // Quellen-Widget-Zustand: {prefix: {ids:Set, pages:{}, quay:{}}}
                                   // Architektur-Fix: ersetzt srcState + srcPageState + srcQuayState
let _fileHandle = null;            // FileSystemFileHandle von showOpenFilePicker (Chrome Desktop)
let _canDirectSave = false;        // true wenn createWritable() auf _fileHandle funktioniert
let _idb = null;                   // IndexedDB-Instanz
let _originalGedText = null;       // RAM-Fallback für erstes GEDCOM; bevorzugt: localStorage('stammbaum_ged_backup')
function _getOriginalText()        // lazy loader: localStorage-Backup || _originalGedText
const _navHistory = [];            // Navigations-Stack für goBack() — {type, id|name}
                                   // _skipHistoryPush entfernt → pushHistory-Parameter auf show-Funktionen
// Beziehungs-Picker (v1.1)
let _relMode     = '';             // 'spouse'|'child'|'parent'
let _relAnchorId = '';             // personId (spouse/parent) oder famId (child)
let _pendingRelation = null;       // {mode, anchorId} — gesetzt vor showPersonForm(); closeModal() räumt auf
// REPO-Feature (v1.2)
let _pendingRepoLink = null;       // {sourceId} — gesetzt vor showRepoForm(null); closeModal() räumt auf
```

---

## CSS Design-System

### Farb-Tokens
```css
/* Hintergründe — warmes Dunkelbraun (Pergament-Ästhetik) */
--bg:        #18140f    /* Seiten-Hintergrund */
--surface:   #211c14    /* Karten */
--surface2:  #2a2318    /* Erhöhte Elemente, Tags */
--surface3:  #342c1e    /* Hover / Zentrum-Karte */
--border:    #3e3424    /* Trennlinien, Karten-Rahmen */

/* Gold — Primärfarbe */
--gold:      #c8a84a    /* Akzente, Links, Aktiv-Zustände */
--gold-lt:   #e5c96e    /* Überschriften, Namen */
--gold-dim:  #7a6328    /* Badges, gedämpfte Elemente */
--gold-glow: rgba(200,168,74,0.15)

/* Text */
--text:      #f2e8d4    /* Haupttext */
--text-dim:  #a0906e    /* Sekundärtext */
--text-muted:#5a4e38    /* Labels, Platzhalter */

/* Aktionsfarben */
--red:       #c04040    /* Löschen */

/* Geometrie */
--radius:    14px       /* Karten, Modals */
--radius-sm: 9px        /* Buttons, Inputs, Tree-Karten */
```

### Typografie
| Schrift | Verwendung |
|---|---|
| **Playfair Display** | App-Titel, Modal-Titel, Personen-Namen in Detailansicht, Tree-Zentrum-Name |
| **Source Serif 4** | Body-Text, Formulare, Listen, alle UI-Elemente, Tree-Karten, Bottom-Nav-Labels |

### Komponenten-Klassen
| Klasse | Beschreibung |
|---|---|
| `.bottom-nav` | Globale Bottom-Navigation (fixed, außerhalb Views, z-index 400) |
| `.bnav-btn` | Bottom-Nav Button (flex-column, icon + label) |
| `.bnav-btn.active` | Aktiver Tab (gold) |
| `.bnav-icon` | Icon in Bottom-Nav (1.2rem) |
| `.bnav-lbl` | Label in Bottom-Nav (0.62rem, Source Serif 4) |
| `.person-row` | Listen-Eintrag: Avatar-Kreis · Name + Meta · Pfeil |
| `.detail-hero` | Großes Avatar + Name ganz oben in Detailansicht |
| `.section` | Inhalts-Abschnitt mit `.section-title` |
| `.section-head` | Flexbox-Zeile: `.section-title` links, `.section-add`-Button rechts |
| `.section-add` | Kleiner Add-Button im Sektions-Kopf (min-width: 100px, border 1px, rounded) |
| `.fact-row` | Label–Wert-Zeile (z.B. „Geburt · 12 MAR 1890, München") |
| `.family-nav-row` | Klickbare Familie-Link-Zeile in Person-Detail (⚭ Familie ›) |
| `.row-arrow` | Pfeil-Icon in `.family-nav-row` |
| `.rel-row` | Personen-Verknüpfung mit Pfeil (Eltern, Kinder, Partner) |
| `.unlink-btn` | Kreisförmiger ×-Button (24px) zum Trennen von Beziehungen in rel-row |
| `.source-card` | Quellen-Karte in der Quellen-Liste |
| `.src-badge` | Kompakter Quellen-Badge: §N (inline in fact-row, gold-dim, 0.62rem) |
| `.src-picker-item` | Eintrag in der Quellen-Auswahlliste |
| `.sheet` | Bottom-Sheet Modal (slide-up von unten) |
| `.modal-overlay` | Halbtransparenter Hintergrund hinter Modals |
| `.fab` | Floating Action Button (＋, unten rechts, über Bottom-Nav) |
| `.toast` | Status-Meldung (fixiert über Bottom-Nav, verschwindet nach 2.8s) |
| `.fade-up` | Einblend-Animation (opacity + translateY) |
| `.tree-scroll` | Scrollbarer Container der Sanduhr-Ansicht |
| `.tree-wrap` | Absolut-positionierter Canvas (Breite/Höhe per JS gesetzt) |
| `.tree-svg` | SVG-Overlay für Bezier-Verbindungslinien |
| `.tree-card` | Personen-Karte im Baum (96×64 px) |
| `.tree-card-center` | Zentrum-Karte (160×80 px, gold umrandet) |
| `.tree-card-half` | Halbgeschwister-Karte (gestrichelter Rahmen, gold-dim) |
| `.tree-half-badge` | „½"-Badge auf Halbgeschwister-Karten (bottom-right) |
| `.tree-card-empty` | Ghost-Karte für unbekannte Vorfahren (opacity 0.18, gestrichelt) |
| `.tree-sex` | Geschlechts-Icon in Tree-Karte |
| `.tree-name` | Name in Tree-Karte (2-zeilig via -webkit-line-clamp) |
| `.tree-yr` | Geburts-/Sterbejahr in Tree-Karte |
| `.landing-tagline` | Tagline auf Landing-Screen |
| `.btn-link` | Textlink-Button (Hilfe-Link auf Landing-Screen) |

---

## Sanduhr-Ansicht: Layout-Algorithmus

```
Ebene -2:  [GP0] [GP1]         [GP2] [GP3]   ← 4 Großeltern-Slots (immer sichtbar)
Ebene -1:    [Vater]             [Mutter]     ← 2 Eltern, je über 2 Großeltern
Ebene  0:      [Person★]  ⟿  [Ehepartner]   ← Zentrum gold, Ehepartner rechts
Ebene +1:         [K0] [K1] [K2] [K3]        ← max. 4 Kinder/Zeile, mehrzeilig
           [K4] [K5] ...                      ← Folgezeilen bei >4 Kindern
```

**Konstanten:**
- Reguläre Karte: W=96px, H=64px
- Zentrum-Karte: CW=160px, CH=80px
- HGAP=10, VGAP=44, MGAP=20 (Person↔Ehepartner), SLOT=106, PAD=20

**Layout-Breite** = max(4×SLOT, max-Kinder-Zeile×SLOT, Person+MGAP+W) + 2×PAD

**Interaktion:**
- Klick auf reguläre Karte → `showTree(id)` (neu zentrieren)
- Klick auf Zentrum-Karte → `showDetail(id)` → Zurück führt wieder zum Baum
- ⧖-Button in Detailansicht und Familienansicht → öffnet Tree

**Halbgeschwister:**
- Kinder der Ehe mit dem dargestellten Ehepartner = Hauptfamilien-Kinder (normale Karte)
- Kinder aus anderen `fams`-Einträgen = Halbgeschwister → `.tree-card-half` + `½`-Badge
- Verbindungslinien zu Halbgeschwistern: gestrichelt (`lineHalf()`, stroke-dasharray 4 3)

---

## Speichern/Backup-Architektur (v1.2 final)

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
    └── Safari Mac / Firefox / kein fileHandle:
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
| localStorage-Limit | ~5 MB Limit, Datei ≈ 5 MB | Toast-Warnung wenn voll |
| _STAT geht verloren | Writer kennt den Tag nicht | Bewusst akzeptiert |
| Fotos nicht ladbar | Windows-Pfade aus Legacy | Phase 5 geplant |
| Keine Sortierung nach Datum | Datum ist Raw-String | Offen |
| Sanduhr zeigt nur ersten Ehepartner | Mehrfach-Ehen noch nicht unterstützt | Offen |
| String-Rendering (XSS) | `innerHTML` + `esc()` ohne echten Sanitizer | Phase 3: Komponentenbasiertes Rendering |
| ~11 globale Variablen | Schlechte Testbarkeit, versteckte Abhängigkeiten | Phase 3: Store-Muster |
