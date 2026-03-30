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
  reli:        'evangelisch',            // als events[] strukturiert (seit v4-dev)
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
  famc: [{ famId:'@F1@', frel:'birth', mrel:'birth',
           frelSour:'@S1@', frelSourExtra:[], mrelSour:'', mrelSourExtra:[] }],
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

  // Kinder-Beziehungstypen
  childRelations: {
    '@I005@': {
      frel:'birth', mrel:'birth',
      frelSour:'', frelSeen:false, frelSourExtra:[],
      mrelSour:'', mrelSeen:false, mrelSourExtra:[],
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

Alle Dateien laden global, kein import/export. Reihenfolge: `gedcom.js` → `storage.js` → `ui-views.js` → `ui-forms.js`

| Sektion | Datei | Hauptfunktionen |
|---|---|---|
| State & IDs | gedcom.js | `nextId(prefix)` |
| GEDCOM Parser | gedcom.js | `parseGEDCOM(text)`, `parseGeoCoord(val)`, `parseGedDate()` |
| GEDCOM Writer | gedcom.js | `writeGEDCOM()`, `eventBlock()`, `geoLines()` |
| IndexedDB | storage.js | `_getIDB()`, `idbGet()`, `idbPut()`, `idbDel()` |
| Export / Speichern | storage.js | `exportGEDCOM()`, `saveToFileHandle()`, `readFile()`, `loadDemo()`, `tryAutoLoad()` |
| Navigation | ui-views.js | `showView()`, `showMain()`, `showTree()`, `goBack()`, `setBnavActive()` |
| Personen-Liste | ui-views.js | `renderPersonList()`, `filterPersons()` |
| Familien-Liste | ui-views.js | `renderFamilyList()`, `filterFamilies()` |
| Quellen-Liste | ui-views.js | `renderSourceList()`, `filterSources()`, `renderRepoList()` |
| Orte-System | ui-views.js | `collectPlaces()`, `renderPlaceList()`, `showPlaceDetail()`, `savePlace()` |
| Stammbaum | ui-views.js | `showTree()`, `mkCard()`, `line()`, `lineHalf()`, `_treeShortName()` |
| Detail-Ansichten | ui-views.js | `showDetail()`, `showFamilyDetail()`, `showSourceDetail()` |
| Beziehungs-Picker | ui-views.js | `showAddSpouseFlow()`, `unlinkMember()`, `openRelFamilyForm()` |
| Archiv-CRUD | ui-views.js | `showRepoDetail()`, `showRepoForm()`, `saveRepo()` |
| Render-Helfer | ui-views.js | `factRow()`, `srcNum()`, `sourceTagsHtml()`, `relRow()` |
| Quellen-Widget | ui-forms.js | `initSrcWidget()`, `renderSrcTags()`, `toggleSrc()`, `updateSrcPage()` |
| Formulare | ui-forms.js | `showPersonForm()`, `savePerson()`, `showFamilyForm()`, `saveFamily()`, `showEventForm()`, `saveEvent()`, `showSourceForm()`, `saveSource()` |
| OneDrive | ui-forms.js | `_odConnect()`, `_odShowFolder()`, `_odGetPhotoUrl()`, `_odGetSourceFileUrl()`, `odScanDocFolder()`, `odSetupDocFolder()` |
| Medien | ui-forms.js | `openAddMediaDialog()`, `confirmAddMedia()`, `deletePersonMedia()`, `deleteSourceMedia()` |
| Utils | ui-forms.js | `esc()`, `showToast()`, `openModal()`, `closeModal()` |

---

## Globale Variablen

```javascript
// Hauptdaten
let db = { individuals:{}, families:{}, sources:{}, extraPlaces:{}, repositories:{}, notes:{}, placForm:'' };
let changed = false;               // Ungespeicherte Änderungen?
let _placesCache = null;           // Cache für collectPlaces(); geleert in markChanged()

// Navigation
let currentPersonId  = null;
let currentFamilyId  = null;
let currentSourceId  = null;
let currentRepoId    = null;
let currentTab = 'persons';        // 'persons'|'families'|'sources'|'places'|'search'
let currentTreeId = null;
const _navHistory = [];            // {type, id|name} — Stack für goBack()

// Persistenz
let _fileHandle = null;            // FileSystemFileHandle (Chrome Desktop)
let _canDirectSave = false;        // true wenn createWritable() funktioniert
let _idb = null;                   // IndexedDB-Instanz
let _originalGedText = null;       // RAM-Cache des ursprünglichen GEDCOM-Texts
// _getOriginalText(): lazy loader → _originalGedText || localStorage('stammbaum_ged_backup')

// UI-State
const srcWidgetState = {};         // {prefix: {ids:Set, pages:{}, quay:{}}}
let _personSort = 'name';          // 'name' | 'birth'
let _placeModes = {};              // {placeId: 'free'|'parts'}

// Beziehungs-Picker (v1.1)
let _relMode     = '';             // 'spouse'|'child'|'parent'
let _relAnchorId = '';
let _pendingRelation = null;       // {mode, anchorId}

// REPO (v1.2)
let _pendingRepoLink = null;       // {sourceId}

// Baum-Navigation (v4-dev)
let _treeHistory    = [];          // [{id}] — History-Stack für ← im Baum
let _treeHistoryPos = -1;          // aktueller Index im History-Stack
let _treeNavTargets = {};          // {up, upShift, down, right} — pro showTree() aktualisiert
let _prevTreeId     = null;        // letzte Tree-ID vor Überschreiben (für ← History)
let _activeSpouseMap = {};         // {personId: famId} — aktuell angezeigte Ehe-Familie pro Person
let _probandId      = null;        // konfigurierbarer Proband (null = kleinste ID)

// OneDrive
let _odFolderStack = [];           // Breadcrumb-Stack im Ordner-Browser
let _odPickMode = false;           // true: Datei wählen (nicht Ordner)
let _odDocScanMode = false;        // true: Dokumente-Ordner wählen
let _odPhotoCache = {};            // Session-Cache: idbKey → Blob-URL
let _addMediaOdFileId = null;      // fileId bei OneDrive-Picker-Auswahl
let _odEditPickMode = false;       // true: OD-Picker aus Edit-Media-Modal

// IDB-Keys
// 'stammbaum_ged'          — GEDCOM-Text (primär)
// 'stammbaum_ged_backup'   — Original-Text für Revert
// 'stammbaum_filename'     — Dateiname
// 'fileHandle'             — FileSystemFileHandle (Chrome)
// 'photo_<id>_N'           — Person-Fotos (Base64 JPEG)
// 'photo_fam_<id>_N'       — Familien-Fotos (Base64 JPEG)
// 'photo_src_<id>_N'       — Quellen-Fotos via Kamera/Galerie (Base64 JPEG) (v4-dev sw v59)
// 'od_filemap'             — {persons:{}, families:{}, sources:{}} — manuell verknüpfte OneDrive-Files
// 'od_doc_filemap'         — {filename.lower: fileId} — Dokumente-Ordner-Scan
// 'od_doc_folder'          — {folderId, folderName} — gescannter Dokumente-Ordner
// 'od_default_folder'      — {folderId, folderName} — letzter Foto-Ordner
// 'proband_id'             — konfigurierter Proband (null = kleinste ID) (v4-dev sw v68)
```
