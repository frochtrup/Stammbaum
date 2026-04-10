# Datenmodell

Datenstrukturen des globalen `db`-Objekts und Funktionsübersicht.
Architektur-Entscheidungen: `ARCHITECTURE.md` · UI/Layout: `UI-DESIGN.md`

---

## Globales `db`-Objekt

```javascript
let db = {
  individuals:  {},   // '@Ixx@' → Person
  families:     {},   // '@Fxx@' → Familie
  sources:      {},   // '@Sxx@' → Quelle
  repositories: {},   // '@Rxx@' → Archiv (v1.2)
  notes:        {},   // '@Nxx@' → NOTE-Record
  extraPlaces:  {},   // Manuelle Orte (localStorage)
  placForm:     '',   // HEAD PLAC FORM
};
let changed = false;  // Ungespeicherte Änderungen?
```

---

## Person (`db.individuals['@Ixx@']`)

```javascript
{
  // Identität
  id:          '@I003@',
  name:        'Heinrich Müller',        // Vorname Nachname
  given:       'Heinrich',
  surname:     'Müller',
  prefix:      'Dr.',                    // NPFX
  suffix:      'Jr.',                    // NSFX
  nick:        'Heini',                  // NICK (v4-dev)
  sex:         'M',                      // M | F | U
  titl:        'Graf',
  reli:        'evangelisch',            // RELI als String (zusätzlich auch als events[] möglich)
  uid:         'ABC123',                 // _UID (Ancestris)
  resn:        '',                       // RESN (v2.0-dev)
  email:       '',                       // EMAIL (v2.0-dev)
  www:         '',                       // WWW (v2.0-dev)

  // Hauptereignisse (Sonder-Objekte via _SPECIAL_OBJ, nicht in events[])
  // date/place: null = Tag nicht vorhanden; '' = Tag vorhanden aber leer; 'Wert' = Wert
  birth: {
    date:'8 JAN 1872', place:'München', lati:48.1, long:11.5,
    sources:['@S1@'], sourcePages:{'@S1@':'47'}, sourceQUAY:{},
    sourceExtra:{},    // verbatim lv=3 unter 2 SOUR (außer PAGE/QUAY/NOTE/OBJE)
    sourceNote:{},     // NOTE unter 2 SOUR: {sId: 'text'}
    sourceMedia:{},    // OBJE unter 2 SOUR: {sId: [{file,scbk,prim,titl,note,_extra[]}]}
    _extra:[],         // unbekannte lv=2 Tags im BIRT-Block
    value:'', seen:true
  },
  chr:   { date:null, place:null, lati:null, long:null, sources:[], sourcePages:{}, sourceQUAY:{}, sourceExtra:{}, sourceNote:{}, sourceMedia:{}, _extra:[], value:'', seen:false },
  death: { date:'15 APR 1940', place:'München', lati:null, long:null, sources:[], sourcePages:{}, sourceQUAY:{}, sourceExtra:{}, sourceNote:{}, sourceMedia:{}, _extra:[], cause:'Herzversagen', value:'', seen:true },
  buri:  { date:null, place:null, lati:null, long:null, sources:[], sourcePages:{}, sourceQUAY:{}, sourceExtra:{}, sourceNote:{}, sourceMedia:{}, _extra:[], value:'', seen:false },

  // Weitere Ereignisse
  events: [
    {
      type:'OCCU', value:'Kaufmann', date:null, place:null, lati:null, long:null,
      sources:[], sourcePages:{}, sourceQUAY:{},
      sourceExtra:{},    // verbatim lv=3 unter 2 SOUR
      sourceMedia:{},    // OBJE unter 2 SOUR: {sId: [{file,...}]}
      note:'', addr:'', addrExtra:[], eventType:'',
      media:[],          // 2 OBJE direkt unter Event
      _extra:[]          // unbekannte lv=2 Tags im Event-Block
    }
  ],

  // Quellen
  sourceRefs:        Set(['@S1@', '@S2@']),  // alle Quell-Referenzen der Person
  topSources:        ['@S1@'],               // SOUR direkt unter INDI (Level 1)
  topSourcePages:    {},                     // PAGE unter lv=1 SOUR
  topSourceQUAY:     {},                     // QUAY unter lv=1 SOUR
  topSourceExtra:    {},                     // verbatim lv=2 unter lv=1 SOUR
  nameSources:       ['@S2@'],              // SOUR unter NAME
  nameSourcePages:   {},
  nameSourceQUAY:    {},
  nameSourceExtra:   {},                    // OBJE etc. unter NAME>SOUR
  nameSourceMedia:   {},                    // OBJE-Struktur unter NAME>SOUR
  extraNames:        [],                    // zweite+ NAME-Einträge (v4-dev strukturiert)
  // extraNames[i]: { given, surname, prefix, suffix, nick, type,
  //                  sources[], sourcePages{}, sourceQUAY{},
  //                  sourceExtra{}, sourceMedia{}, _extra[] }

  // Notizen
  noteText:  'Freitext-Notiz',
  noteRefs:  ['@N1@'],                  // Referenzen auf NOTE-Records

  // Medien (inline OBJE)
  media: [{ file:'C:\\Fotos\\test.jpg', title:'Portrait', _extra:[] }],

  // Familien
  famc: [{
    famId:       '@F1@',
    pedi:        'birth',        // GEDCOM 5.5.1 PEDI-Wert: birth|adopted|foster|sealing|''
    frel:        'birth',        // Verhältnis zum Vater (intern; aus PEDI oder _FREL)
    mrel:        'birth',        // Verhältnis zur Mutter (intern; aus PEDI oder _MREL)
    frelSeen:    true,           // _FREL war im Original vorhanden
    mrelSeen:    true,           // _MREL war im Original vorhanden
    // Quellen direkt unter FAMC (GEDCOM 5.5.1-konform):
    sourIds:     ['@S1@'],       // Quell-IDs (2 SOUR unter FAMC)
    sourPages:   {'@S1@':'S.3'}, // PAGE-Angaben je Quelle
    sourQUAY:    {'@S1@':'2'},   // QUAY-Werte je Quelle
    sourExtra:   {},             // verbatim Extras je Quelle
    // Legacy (Ancestris _FREL/_MREL-Format — nur beim Lesen alter Dateien):
    frelSour:'', frelPage:'', frelQUAY:'', frelSourExtra:[],
    mrelSour:'', mrelPage:'', mrelQUAY:'', mrelSourExtra:[]
  }],
  fams: ['@F2@'],                        // Elternteil in Familie

  // Metadaten
  lastChanged: '15 FEB 2024',
  _passthrough: [],   // verbatim unbekannte lv=1 Tags + Sub-Trees (ADR-012)
}
```

---

## Familie (`db.families['@Fxx@']`)

```javascript
{
  husb:     '@I003@',
  wife:     '@I004@',
  children: ['@I005@', '@I006@'],

  marr: {
    date:'5 APR 1898', place:'München', lati:null, long:null,
    sources:[], sourcePages:{}, sourceQUAY:{},
    sourceExtra:{},    // OBJE etc. verbatim unter 2 SOUR
    sourceMedia:{},    // OBJE-Struktur unter 2 SOUR: {sId: [{file,...}]}
    value:'', seen:true, addr:'', _extra:[]
  },
  engag: {
    date:null, place:null, lati:null, long:null,
    sources:[], sourcePages:{}, sourceQUAY:{},
    sourceExtra:{}, sourceMedia:{},
    value:'', seen:false, _extra:[]
  },

  // FAM-Events (EVEN etc.)
  events: [
    {
      type:'EVEN', value:'', date:null, place:null, lati:null, long:null,
      sources:[], sourcePages:{}, sourceQUAY:{},
      sourceExtra:{}, sourceMedia:{},
      note:'', addr:'', addrExtra:[], eventType:'', _extra:[]
    }
  ],

  // Kinder-Beziehungstypen (FAM-Seite — nur beim Lesen; Writer schreibt nur noch auf INDI-Seite)
  // Beim Parse-Post-Processing wird FAM-Seite in INDI-Seite (famc) gemergt wenn INDI-Seite leer.
  childRelations: {
    '@I005@': {
      frel:'birth', mrel:'birth',
      frelSeen:false, mrelSeen:false,
      frelSour:'', frelPage:'', frelQUAY:'', frelSourExtra:[],
      mrelSour:'', mrelPage:'', mrelQUAY:'', mrelSourExtra:[],
      sourIds:[], sourPages:{}, sourQUAY:{},
      sourExtra:{},   // verbatim lv=3 unter 2 SOUR in CHIL-Kontext
      sourMedia:{}    // OBJE-Struktur unter 2 SOUR in CHIL-Kontext
    }
  },

  noteText: '',
  sourceRefs: Set(),
  _passthrough: [],
}
```

---

## Quelle (`db.sources['@Sxx@']`)

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
  media:       [{ file:'scan001.pdf', title:'Titelblatt', _extra:[] }],
  lastChanged: '1 MAR 2026',  // CHAN/DATE — auto-gesetzt beim Speichern
  _passthrough: [],
}
```

---

## Archiv (`db.repositories['@Rxx@']`)

```javascript
{
  id:          '@R1@',
  name:        'Stadtarchiv München',
  addr:        'Winzererstr. 68\n80797 München',
  addrExtra:   [],            // CITY, POST, _STYLE etc.
  phon:        '+49 89 233-30010',
  www:         'https://www.stadtarchiv.muenchen.de',
  email:       'stadtarchiv@muenchen.de',
  lastChanged: '1 MAR 2026',
}
```

---

## sourceMedia{}-Struktur (v4-dev, sw v45)

Strukturiert OBJE-Blöcke unter SOUR-Zitierungen. Verfügbar auf allen Event-Objekten (birth/chr/death/buri, events[], marr, engag, FAM events[], childRelations).

```javascript
// Beispiel GEDCOM:
// 2 SOUR @S4@
// 3 OBJE
// 4 FILE C:\Dokumente\scan001.jpg
// 5 FORM JPG
// 4 _SCBK Y
// 4 _PRIM Y
// 4 TITL Taufregister S. 12

// Ergibt:
birth.sourceMedia['@S4@'] = [
  {
    file:  'C:\\Dokumente\\scan001.jpg',
    scbk:  'Y',           // _SCBK
    prim:  'Y',           // _PRIM
    titl:  'Taufregister S. 12',
    note:  '',
    _extra: ['5 FORM JPG']  // unbekannte lv=5+ unter FILE (absolut)
  }
]

// OBJE mit @ref@ (3 OBJE @M00001@) bleibt in sourceExtra{} verbatim
```

---

## JavaScript-Sektionen

Alle Dateien laden global, kein import/export. Ladereihenfolge: `gedcom.js` → `storage-file.js` → `storage.js` → `ui-views.js` → `ui-views-person.js` → … → `ui-forms.js` → …

| Sektion | Datei | Hauptfunktionen |
|---|---|---|
| State & IDs | gedcom.js | `nextId(prefix)`, AppState/UIState |
| GEDCOM Parser | gedcom-parser.js | `parseGEDCOM(text)`, `parseGeoCoord(val)`, `parseGedDate()` |
| GEDCOM Writer | gedcom-writer.js | `writeGEDCOM()`, `writeINDIRecord()`, `writeFAMRecord()`, `eventBlock()`, `geoLines()` |
| IndexedDB + File I/O | storage-file.js | `_getIDB()`, `idbGet()`, `idbPut()`, `idbDel()`, `exportGEDCOM()`, `saveToFileHandle()`, `readFile()` |
| Demo / Backup / Init | storage.js | `loadDemo()`, `tryAutoLoad()`, `fotoExport()` |
| Navigation + Event-Delegation | ui-views.js | `showView()`, `showMain()`, `showTree()`, `goBack()`, `setBnavActive()`, `_CLICK_MAP` |
| Personen-Liste + Detail | ui-views-person.js | `renderPersonList()`, `filterPersons()`, `showDetail()` |
| Familien-Liste + Detail | ui-views-family.js | `renderFamilyList()`, `filterFamilies()`, `showFamilyDetail()` |
| Quellen-Liste + Detail + Archiv | ui-views-source.js | `renderSourceList()`, `filterSources()`, `showSourceDetail()`, `showRepoDetail()` |
| Stammbaum | ui-views-tree.js | `showTree()`, `mkCard()`, `line()`, `_treeShortName()`, `treeNavBack()` |
| Fan Chart | ui-fanchart.js | `showFanChart()` |
| Orte-System | ui-views.js | `collectPlaces()`, `renderPlaceList()`, `showPlaceDetail()`, `savePlace()` |
| Render-Helfer | ui-views.js | `factRow()`, `srcNum()`, `sourceTagsHtml()`, `relRow()` |
| Formulare Person/Familie/Quelle | ui-forms.js | `showPersonForm()`, `savePerson()`, `showFamilyForm()`, `saveFamily()`, `showSourceForm()`, `saveSource()` |
| Quellen-Widget | ui-forms.js | `initSrcWidget()`, `renderSrcTags()`, `toggleSrc()`, `updateSrcPage()` |
| Event-Formular | ui-forms-event.js | `showEventForm()`, `saveEvent()`, `deleteEvent()` |
| Archiv-Formular + Picker | ui-forms-repo.js | `showRepoForm()`, `saveRepo()`, `showRepoPicker()` |
| Medien | ui-media.js | `openAddMediaDialog()`, `confirmAddMedia()`, `deletePersonMedia()` |
| OneDrive Auth | onedrive-auth.js | `_odConnect()`, `_odLogout()`, `_odRefreshTokenSilent()` |
| OneDrive Import | onedrive-import.js | `_odShowFolder()`, `_odPickSelectFile()` |
| OneDrive File I/O | onedrive.js | `_odGetMediaUrlByPath()`, `_odSaveFile()`, `openSettings()` |
| Utils | ui-forms.js | `esc()`, `showToast()`, `openModal()`, `closeModal()` |

---

## State-Management

Alle persistenten Werte in `AppState` (gedcom.js), UI-Zustand in `UIState` (gedcom.js). Keine losen Globals mehr. Backward-compat-Shims via `Object.defineProperty` auf `window`.

```javascript
AppState = {
  db: { individuals:{}, families:{}, sources:{}, extraPlaces:{}, repositories:{}, notes:{}, placForm:'', extraRecords:[], headLines:[] },
  changed: false,
  idCounter: 1000,
  currentPersonId: null,
  currentFamilyId: null,
  currentSourceId: null,
  currentRepoId:   null,
  currentTab:      'persons',
  _fileHandle:     null,       // FileSystemFileHandle (Chrome Desktop)
  _canDirectSave:  false,
}

UIState = {
  _treeScale:      1.0,        // Zoom-Faktor Sanduhr
  _treeHistory:    [],         // [{id}] — History-Stack für ← im Baum
  _treeHistoryPos: -1,
  _treeNavTargets: {},         // {up, upShift, down, right}
  _activeSpouseMap:{},         // {personId: famId}
  _probandId:      null,       // konfigurierbarer Proband
  _fanGenCount:    5,          // Generationen im Fan Chart
  _relMode:        '',         // 'spouse'|'child'|'parent'
  _relAnchorId:    '',
  _navHistory:     [],         // {type, id|name} — Stack für goBack()
  _placeModes:     {},         // {placeId: 'free'|'parts'}
  _personSort:     'name',     // 'name'|'birth'
}
```

## IDB-Keys

```
// GEDCOM
'stammbaum_ged'          — GEDCOM-Text (primär)
'stammbaum_ged_backup'   — Original-Text für Revert
'stammbaum_filename'     — Dateiname
'fileHandle'             — FileSystemFileHandle (Chrome)
'proband_id'             — konfigurierter Proband

// Medien (pfad-basiert seit sw v105)
'img:<relPath>'          — Foto-Cache (base64 Data-URL), relativer Pfad ab od_base_path

// OneDrive (aktuell)
'od_base_path'           — absoluter OneDrive-Pfad des GED-Ordners (auto-gesetzt beim Laden)
'od_photo_folder'        — { id, name, relPath } — Foto-Ordner relativ zu od_base_path
'od_docs_folder'         — { id, name, relPath } — Dok-Ordner relativ zu od_base_path

// LEGACY / DEPRECATED (nur Migration via _odMigrateIfNeeded())
'od_default_folder'      — alte Struktur { folderId, folderName, folderPath }
'od_doc_folder'          — alte Struktur
'od_filemap'             — fileId-Index-Mapping (deprecated seit sw v99)
'od_doc_filemap'         — Basename→fileId für Dokumente-Ordner (deprecated)
```
