# Architektur

## Überblick

```
┌──────────────────────────────────────────────────────┐
│                    index.html                        │
│                                                      │
│  <style>         <body>            <script>          │
│  CSS             HTML-Struktur     Vanilla JS        │
│  ~600 Zeilen     ~500 Zeilen       ~2000 Zeilen      │
│                                                      │
│  Keine externen Dependencies · Kein Build-Step       │
│  Keine Frameworks · Kein Server                      │
└──────────────────────────────────────────────────────┘
```

**Größe aktuell:** ~3120 Zeilen · ~90 Funktionen · ~165 KB

---

## Architektur-Entscheidungen (ADRs)

### ADR-001: Single-File HTML
**Entscheidung:** Alle CSS, HTML und JavaScript in einer einzigen `index.html`.

**Warum:**
- Deployment = eine Datei auf GitHub Pages laden, fertig
- Kein npm, kein Webpack, kein Build-Prozess
- Claude kann die Datei direkt mit `str_replace` bearbeiten
- Zielgruppe (Hobby-Genealoge) versteht ein einzelnes File

**Konsequenzen:**
- Datei wächst mit neuen Features (~3100 Z. jetzt)
- Ab ~5000 Zeilen sollte Aufteilung in CSS/JS-Dateien erwogen werden
- Kein Hot-Reload, kein TypeScript, kein Linting

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
  individuals: { '@I1@': { ...Person }, '@I2@': { ... } },
  families:    { '@F1@': { ...Familie } },
  sources:     { '@S1@': { ...Quelle } },
};
let changed = false;  // Änderungs-Flag
```

**Konsequenz:** Kein Undo/Redo. Bei Seitenreload sind ungespeicherte Änderungen weg (außer Auto-Load aus localStorage).

---

### ADR-004: localStorage für Auto-Load
**Entscheidung:** Nach dem Laden wird der rohe GEDCOM-Text in localStorage gecacht.

```javascript
localStorage.setItem('stammbaum_ged', gedcomText);
// Beim App-Start:
const saved = localStorage.getItem('stammbaum_ged');
if (saved) { db = parseGEDCOM(saved); showStartView(); }
```

**Wichtig:** Es wird der GEDCOM-Text gecacht, **nicht** das `db`-Objekt. Grund: `Set`-Objekte (`sourceRefs`) lassen sich nicht mit `JSON.stringify` serialisieren.

**Limit:** localStorage ≈ 5–10 MB. MeineDaten.ged ≈ 5 MB — grenzwertig. Bei Fehler wird still ignoriert.

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

### ADR-007: File System Access API + IndexedDB für Desktop-Speichern
**Entscheidung:** Desktop-Browser nutzen `showDirectoryPicker()` zum einmaligen Verzeichnis-Wählen, danach automatisches Speichern.

```javascript
// Handle wird in IndexedDB persistiert (nicht JSON-serialisierbar → kein localStorage)
const dir = await window.showDirectoryPicker({ mode: 'readwrite' });
await idbPut('dirHandle', dir);
// Jeder Speichervorgand schreibt:
// 1. [dir]/MeineDaten.ged         (überschrieben)
// 2. [dir]/backup/MeineDaten_YYYY-MM-DD_NNN.ged (versioniert)
```

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
│   ├── #bnav-persons   ♻ Personen
│   ├── #bnav-families  ⚭ Familien
│   ├── #bnav-sources   § Quellen
│   └── #bnav-places    📍 Orte
│
├── Modals (Bottom Sheets)
│   ├── #modalAdd       + Neu (Auswahl: Person / Familie / Quelle)
│   ├── #modalPerson    Person bearbeiten
│   ├── #modalFamily    Familie bearbeiten
│   ├── #modalSource    Quelle bearbeiten
│   ├── #modalEvent     Ereignis hinzufügen / bearbeiten (inkl. BIRT/CHR/DEAT/BURI)
│   ├── #modalPlace     Ort umbenennen
│   ├── #modalMenu      ☰ Menü (Speichern, Backup, Verzeichnis, neue Datei)
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

### Bottom-Nav Highlight
`setBnavActive(name)` mit `name ∈ { 'tree', 'persons', 'families', 'sources', 'places' }`
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

  // Hauptereignisse (Sonder-Objekte, nicht in events[])
  birth: { date:'8 JAN 1872', place:'München', lati:48.1, long:11.5, sources:['@S1@'], sourcePages:{'@S1@':'47'} },
  chr:   { date:'', place:'', lati:null, long:null, sources:[], sourcePages:{} },
  death: { date:'15 APR 1940', place:'München', lati:null, long:null, sources:[], sourcePages:{}, cause:'Herzversagen' },
  buri:  { date:'', place:'', lati:null, long:null, sources:[], sourcePages:{} },

  // Weitere Ereignisse
  events: [
    { type:'OCCU', value:'Kaufmann', date:'', place:'', lati:null, long:null,
      sources:[], sourcePages:{}, note:'', addr:'', eventType:'' }
    // sourcePages: {sid: page} — Seitenangaben zu Quellenreferenzen (3 PAGE)
    // addr: Adresse (2 ADDR), nur bei RESI relevant; note: akkumuliert bei mehreren 2 NOTE
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
  marr:   { date:'5 APR 1898', place:'München', lati:null, long:null, sources:[] },
  engag:  { date:'', place:'' },
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
  repo:        '',
  text:        '',
  lastChanged: '1 MAR 2026',  // CHAN/DATE — auto-gesetzt beim Speichern
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
| Quellen-Liste | 1990–2040 | `renderSourceList()`, `filterSources()` |
| Orte-System | 2040–2110 | `collectPlaces()`, `renderPlaceList()`, `filterPlaces()`, `showPlaceDetail()`, `showPlaceForm()`, `savePlace()` |
| Stammbaum (Sanduhr) | 2120–2320 | `getParentIds()`, `getChildIds()`, `showTree()`, `mkCard()`, `line()`, `lineHalf()` |
| Detail-Ansichten | 2320–2560 | `showDetail()`, `showFamilyDetail()`, `showSourceDetail()` |
| Render-Helfer | 2560–2660 | `factRow()`, `srcNum()`, `sourceTagsHtml()`, `relRow()` |
| Quellen-Widget | 2660–2720 | `initSrcWidget()`, `renderSrcTags()`, `renderSrcPicker()`, `toggleSrc()`, `removeSrc()`, `updateSrcPage()` |
| Formulare | 2720–2980 | `showPersonForm()`, `savePerson()`, `showFamilyForm()`, `saveFamily()`, `showEventForm()`, `saveEvent()`, `onEventTypeChange()`, `showSourceForm()`, `saveSource()` |
| Utils | 2980–3010 | `esc()`, `showToast()`, `openModal()`, `closeModal()` |
| IndexedDB | 1540–1560 | `_getIDB()`, `idbGet()`, `idbPut()`, `idbDel()` |

---

## Globale Variablen

```javascript
let db = { individuals:{}, families:{}, sources:{} };  // Hauptdaten
let changed = false;               // Ungespeicherte Änderungen?
let currentPersonId  = null;       // Aktive Detailansicht
let currentFamilyId  = null;
let currentSourceId  = null;
let currentTab = 'persons';        // Aktiver Tab: 'persons'|'families'|'sources'|'places'
let currentTreeId = null;          // Aktive Person in Sanduhr-Ansicht
const srcState = {};               // Zustand des Quellen-Widgets: {prefix: Set}
const srcPageState = {};           // Seitenangaben pro Quelle: {prefix: {sid: page}}
let _dirHandle = null;             // FileSystemDirectoryHandle (Desktop-Speichern)
let _idb = null;                   // IndexedDB-Instanz (für _dirHandle-Persistenz)
let _originalGedText = '';         // Original-GEDCOM beim Laden (für Backup)
const _navHistory = [];            // Navigations-Stack für goBack() — {type, id|name}
let _skipHistoryPush = false;      // gesetzt während goBack() navigiert
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
| `.fact-row` | Label–Wert-Zeile (z.B. „Geburt · 12 MAR 1890, München") |
| `.family-nav-row` | Klickbare Familie-Link-Zeile in Person-Detail (⚭ Familie ›) |
| `.row-arrow` | Pfeil-Icon in `.family-nav-row` |
| `.rel-row` | Personen-Verknüpfung mit Pfeil (Eltern, Kinder, Partner) |
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
| `.tree-card-center` | Zentrum-Karte (120×80 px, gold umrandet) |
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
- Zentrum-Karte: CW=120px, CH=80px
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

## Speichern/Backup-Architektur

```
exportGEDCOM()
    │
    ├── Desktop: 'showDirectoryPicker' in window
    │   └── saveToDirectory()
    │       ├── _dirHandle aus IndexedDB laden (restoreDirHandle beim Start)
    │       ├── ggf. showDirectoryPicker() → _dirHandle neu wählen
    │       ├── [dir]/MeineDaten.ged  ← überschreiben
    │       └── [dir]/backup/MeineDaten_YYYY-MM-DD_NNN.ged  ← neu
    │
    ├── iOS: navigator.share
    │   └── navigator.share({ files: [main, backup] })
    │       ├── MeineDaten.ged
    │       └── MeineDaten_YYYY-MM-DD_HHmmss.ged
    │
    └── Fallback: Blob-Download
        └── <a download="MeineDaten.ged">
```

---

## Bekannte Einschränkungen

| Problem | Ursache | Status |
|---|---|---|
| localStorage-Limit | ~5 MB Limit, Datei ≈ 5 MB | Still ignoriert wenn voll |
| _STAT geht verloren | Writer kennt den Tag nicht | Bewusst akzeptiert |
| QUAY an Quellen geht verloren | Vereinfacht | Bewusst akzeptiert |
| NOTE @ref@ → Inline-NOTE | Records werden aufgelöst | Bewusst akzeptiert |
| Fotos nicht ladbar | Windows-Pfade aus Legacy | Phase 5 geplant |
| Keine Sortierung nach Datum | Datum ist Freitext | Offen |
| Sanduhr zeigt nur ersten Ehepartner | Mehrfach-Ehen noch nicht unterstützt | Offen |
