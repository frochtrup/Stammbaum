// ─────────────────────────────────────
//  STATE — AppState / UIState
// ─────────────────────────────────────
// Alle cross-file let-Variablen sind in zwei Namespace-Objekten organisiert.
// Backward-compat-Shims (unten) leiten bare Variablennamen zu den Namespaces um,
// sodass bestehende Aufrufer ohne Änderung weiter funktionieren.

const AppState = {
  db:               { individuals: {}, families: {}, sources: {}, extraPlaces: {}, hofObjects: {}, repositories: {}, notes: {}, placForm: '', extraRecords: [], headLines: [], gedVersion: 'unknown' },
  changed:          false,
  idCounter:        1000,
  currentPersonId:  null,
  currentFamilyId:  null,
  currentSourceId:  null,
  currentRepoId:    null,
  currentPlaceName: null,
  currentTab:       'persons',
  _detailActive:    false,       // true wenn v-detail echten Inhalt zeigt
  _currentFilename: '',          // Dateiname der aktuell geladenen Datei (für per-Datei extraPlaces)
  _fileHandle:        null,        // FileSystemFileHandle von showOpenFilePicker (Chrome Desktop)
  _canDirectSave:     false,       // true wenn createWritable() auf _fileHandle funktioniert
  _fileLastModified:  null,        // lastModified-Timestamp beim letzten Laden/Speichern (STAB-2)
  _originalGedText: null,        // Fallback wenn localStorage-Backup fehlschlägt; sonst null
  _undoStack:       [],          // [{ label, persons:{}, families:{}, sources:{}, repos:{} }, …] max 30
  _redoStack:       [],          // gleiche Struktur wie _undoStack
  privacyAnon:      false,       // F5: lebende Personen beim GEDCOM-Export anonymisieren
};

const UIState = {
  _treeScale:       1,           // Zoom-Faktor Sanduhr-Ansicht
  _relMode:         '',          // 'spouse' | 'child' | 'parent'
  _relAnchorId:     '',          // personId (spouse/parent) oder famId (child)
  _pendingRelation: null,        // { mode, anchorId } — gesetzt vor showPersonForm()
  _pendingRepoLink: null,        // { sourceId } — gesetzt vor showRepoForm(null)
  _pendingFfState:  null,        // { slot, id, husb, wife, … } — gesetzt vor showPersonForm() aus Familienformular
  _placesCache:       null,      // Cache für collectPlaces(); wird in markChanged() geleert
  _placeRegistry:     null,      // PLACE-HIST (ADR-024): Cache für getPlaceRegistry(); in setDb geleert
  _hofCache:          null,      // Cache für buildHofIndex(); wird in markChanged() geleert
  _personSortCache:   null,      // { mode, count, sorted } — ungefilterte Personenliste sortiert; in markChanged() + _finishLoad geleert
  _searchIndexDirty:  true,      // true = p._searchStr muss neu aufgebaut werden
  _soundexMode:       false,     // Soundex-Suche: phonetische Namens-Varianten
  _placesSubTab:    'orte',      // 'orte' | 'hoefe'
  _navHistory:      [],          // Navigations-History für Detail-Ansichten (Back-Stack)
  _navFwdStack:     [],          // Vorwärts-Stack (gefüllt durch goBack(), geleert bei neuer Navigation)
  _probandId:       null,        // null = Fallback auf kleinste ID
  _eventClipboard: null,         // kopiertes Ereignis für Übernehmen-Funktion
  _citClipboard:   null,         // kopierte Quellenbezüge { sources[], pages{}, quay{} }
  _placeModes:     {},           // { placeId: 'free'|'parts' } — UI-Toggle-Zustand Orts-Eingabe
  _mediaCtxFilter: 'all',        // 'all'|'person'|'family'|'source' — Medien-Sub-Tab Filter
  _mediaViewMode:  'grid',       // 'grid'|'list' — Medien-Sub-Tab Ansicht
  _formState: {                  // transienter Formular-State (ADR-003)
    srcWidget:    {},            // srcWidgetState[prefix] = { ids, pages, quay }
    pfExtraNames:   [],          // Zusatz-Namen im Personen-Formular
    efMedia:        [],          // Medien im Event-Formular
    efGodparents:   [],          // Taufpaten im CHR-Event-Formular (Xrefs)
  },
};

// Backward-compat-Shim: bare `db` → AppState.db (wird in gedcom-writer.js + ui-*.js verwendet)
Object.defineProperty(window, 'db', {
  get()  { return AppState.db; },
  configurable: true,
});

// Mutiert AppState.db in-place statt die Referenz zu ersetzen.
// So bleiben const db = AppState.db Bindings in allen Modulen dauerhaft gültig.
function setDb(newDb) {
  for (const k of Object.keys(AppState.db)) delete AppState.db[k];
  Object.assign(AppState.db, newDb);
  _migratePlaceObjects(AppState.db);              // PLACE-HIST (ADR-024): Altdaten parentId→enclosedBy
  _migrateExtraPlacesToPlaceObjects(AppState.db); // P0b-3: extraPlaces→placeObjects (idempotent)
  UIState._placeRegistry = null;                  // Registry beim DB-Wechsel invalidieren
}

// Lesbarkeits-Shims für tief verschachtelte UIState._formState-Pfade.
// srcWidgetState[p] ist lesbarer als UIState._formState.srcWidget[p] (34 Verwendungen in ui-forms.js).
(function _installFormStateShims() {
  for (const [prop, subKey] of [
    ['srcWidgetState', 'srcWidget'],
    ['_pfExtraNames',   'pfExtraNames'],
    ['_efMedia',        'efMedia'],
    ['_efGodparents',   'efGodparents'],
  ]) {
    Object.defineProperty(window, prop, {
      get()  { return UIState._formState[subKey]; },
      set(v) { UIState._formState[subKey] = v; },
      configurable: true,
    });
  }
})();

// ─── Konstante Globals (const — kein Shim nötig) ────────────────────────────
const _activeSpouseMap = {};    // personId → aktiver Ehepartner-Index

// Liefert den Original-GEDCOM-Text (erste geladene Version, aus RAM oder IDB via tryAutoLoad).
function _getOriginalText() {
  return AppState._originalGedText ?? null;
}

function nextId(prefix) {
  AppState.idCounter++;
  return `@${prefix}${AppState.idCounter}@`;
}

// Globale Label-Map für GEDCOM-Ereignis-Typen (DRY: wird in showDetail + showPlaceDetail genutzt)
const EVENT_LABELS = {
  // Spezial-Schlüssel (intern)
  Geburt:'Geburt', Tod:'Tod', Taufe:'Taufe', Beerdigung:'Beerdigung', Heirat:'Heirat',
  // GEDCOM INDI-Ereignisse
  OCCU:'Beruf',          RESI:'Wohnort',        EDUC:'Bildung',
  RELI:'Religion',       EMIG:'Auswanderung',   IMMI:'Einwanderung',
  NATU:'Einbürgerung',   GRAD:'Abschluss',      ADOP:'Adoption',
  MILI:'Militärdienst',  FACT:'Tatsache',       EVEN:'Ereignis',
  TITL:'Titel',          CENS:'Volkszählung',   CONF:'Konfirmation',
  FCOM:'Erstkommunion',  ORDN:'Ordination',     RETI:'Pensionierung',
  PROP:'Eigentum',       WILL:'Testament',      PROB:'Testamentseröffnung',
  DSCR:'Beschreibung',   IDNO:'ID-Nummer',      SSN:'Sozialversicherungs-Nr.',
  // GEDCOM FAM-Ereignisse (können in events-Array landen)
  ENGA:'Verlobung',      DIV:'Scheidung',       DIVF:'Scheidungsantrag',
  MARR:'Heirat',         BIRT:'Geburt',         DEAT:'Tod',
  CHR:'Taufe',           BURI:'Beerdigung',
};

// GEDCOM-Typ → Person-Property-Name für die 4 Sonder-Ereignisse (BIRT/CHR/DEAT/BURI)
const SPECIAL_EVENT_KEYS = { BIRT:'birth', CHR:'chr', DEAT:'death', BURI:'buri' };

// Label-Map für ASSO .role-Werte (GED5 RELA-Freitext, GRAMPS rel, GED7 ROLE-Enum)
const RELA_LABELS = {
  // GED5 / GRAMPS Freitext
  'Godparent':  'Taufpate/-mutter',
  'Godchild':   'Patenkind',
  'Witness':    'Zeuge/Zeugin',
  'Friend':     'Freund/in',
  'Neighbor':   'Nachbar/in',
  'Associate':  'Bekannte(r)',
  'Employer':   'Arbeitgeber',
  'Employee':   'Arbeitnehmer',
  'Landlord':   'Vermieter',
  // GED7 ROLE-Enum-Werte
  'GODP':  'Taufpate/-mutter',
  'WITN':  'Zeuge/Zeugin',
  'CHIL':  'Kind',
  'HUSB':  'Ehemann',
  'WIFE':  'Ehefrau',
  'MOTH':  'Mutter',
  'FATH':  'Vater',
  'SPOU':  'Ehepartner',
  'OTHER': 'Sonstige',
};

// Label-Map für GEDCOM NAME TYPE-Werte
const NAME_TYPE_LABELS = {
  birth:     'Geburtsname',
  maiden:    'Mädchenname',
  married:   'Ehename',
  aka:       'Auch bekannt als',
  immigrant: 'Einwanderer-Name',
  nickname:  'Spitzname',
};

// ─────────────────────────────────────
//  JSDoc-Typen (T0-TYPES, sw v698)
//  VS Code / IntelliJ nutzen @typedef nativ — kein Build-Step nötig.
//  Änderungen hier synchron halten mit gedcom-parser.js (Struct-Init).
// ─────────────────────────────────────

/** @typedef {{ sourceId:string, page?:string, quay?:string, text?:string, media?:Object }} Citation */

/** @typedef {{ file:string, titl?:string, note?:string, date?:string, prim?:boolean, scbk?:boolean, crop?:{top:number,left:number,width:number,height:number}|null }} MediaRef */

/**
 * @typedef {Object} SpecialEvent  Sonder-Ereignis (BIRT/CHR/DEAT/BURI) direkt auf der Person.
 * @property {string|null}  date
 * @property {string|null}  place
 * @property {number|null}  lati
 * @property {number|null}  long
 * @property {string}       value
 * @property {string}       note
 * @property {string}       datePhrase   GED7: lesbare Datumsalternative (DATE/PHRASE)
 * @property {string[]}     noteRefs
 * @property {Citation[]}   citations
 * @property {Object[]}     _extra
 * @property {boolean}      seen
 * @property {string}       [cause]   Todesursache (nur DEAT)
 */

/**
 * @typedef {Object} PersonEvent  Freies Ereignis einer Person.
 * @property {string}     type
 * @property {string}     [value]
 * @property {string}     [date]
 * @property {string}     [datePhrase]  GED7: lesbare Datumsalternative (DATE/PHRASE)
 * @property {string}     [place]
 * @property {number|null} [lati]
 * @property {number|null} [long]
 * @property {string}     [addr]
 * @property {string}     [note]
 * @property {string[]}   [noteRefs]
 * @property {Citation[]} citations
 * @property {MediaRef[]} media
 * @property {Object[]}   [_extra]
 */

/** @typedef {{ id:string, text:string, cat:string, done:boolean, added?:string }} Task */

/** @typedef {{ id:string, date?:string, repo?:string, sour?:string, query?:string, result:string, note?:string }} RlogEntry */

/**
 * @typedef {Object} Person  Personen-Datensatz (GEDCOM INDI).
 * @property {string}          id
 * @property {string}          name
 * @property {string}          nameRaw
 * @property {string}          surname
 * @property {string}          given
 * @property {string}          nick
 * @property {string}          prefix
 * @property {string}          suffix
 * @property {'M'|'F'|'U'|'X'} sex
 * @property {string}          uid
 * @property {string}          grampId
 * @property {string}          resn
 * @property {string}          reli
 * @property {string}          titl
 * @property {string}          email
 * @property {string}          www
 * @property {SpecialEvent}    birth
 * @property {SpecialEvent}    death
 * @property {SpecialEvent}    chr
 * @property {SpecialEvent}    buri
 * @property {PersonEvent[]}   events
 * @property {string[]}        famc
 * @property {string[]}        fams
 * @property {string[]}        topSources
 * @property {Citation[]}      nameCitations
 * @property {Set<string>}     sourceRefs
 * @property {Object}          topSourcePages
 * @property {Object}          topSourceQUAY
 * @property {Object}          topSourceExtra
 * @property {string[]}        noteRefs
 * @property {Object}          noteRefExtras
 * @property {string[]}        noteTexts
 * @property {string}          noteText
 * @property {Object[]}        extraNames
 * @property {Object[]}        aliases
 * @property {string[]}        aliaNames    GED7: ALIA als Namens-String (neben aliases[] für @xref@)
 * @property {Object[]}        refns
 * @property {{value:string,type:string}[]} exids  GED7: EXID External Identifiers
 * @property {Object[]}        associations         Feld .role (ehem. .rela)
 * @property {{lang:string,nameRaw:string,given:string,surname:string}[]} nameTrans  GED7: Primärname-Übersetzungen
 * @property {Set<string>}     noEvents     GED7: bestätigtes Fehlen (NO BIRT, NO DEAT …)
 * @property {string}          createdDate  GED7: CREA/DATE Anlagedatum
 * @property {MediaRef[]}      media
 * @property {Task[]}          _tasks
 * @property {RlogEntry[]}     _rlog
 * @property {Object[]}        _passthrough
 * @property {boolean}         _hasGivn
 * @property {boolean}         _hasSurn
 * @property {boolean}         _nameParsed
 * @property {string|null}     _stat
 * @property {string}          lastChanged
 * @property {string}          lastChangedTime
 * @property {string}          chanNote
 */

/**
 * @typedef {Object} FamilyEvent  Familien-Ereignis (MARR/ENGA/DIV/DIVF + freie FAM-Events).
 * @property {string|null}  date
 * @property {string|null}  place
 * @property {number|null}  lati
 * @property {number|null}  long
 * @property {string}       value
 * @property {string}       note
 * @property {string[]}     noteRefs
 * @property {Citation[]}   citations
 * @property {MediaRef[]}   media
 * @property {Object[]}     _extra
 * @property {boolean}      seen
 * @property {string}       [addr]
 * @property {string}       [type]
 */

/**
 * @typedef {Object} Family  Familien-Datensatz (GEDCOM FAM).
 * @property {string}         id
 * @property {string|null}    husb
 * @property {string|null}    wife
 * @property {string[]}       children
 * @property {Object}         childRelations
 * @property {FamilyEvent}    marr
 * @property {FamilyEvent}    engag
 * @property {FamilyEvent}    div
 * @property {FamilyEvent}    divf
 * @property {FamilyEvent[]}  events
 * @property {string[]}       noteRefs
 * @property {Object}         noteRefExtras
 * @property {string[]}       noteTexts
 * @property {string}         noteText
 * @property {Set<string>}    sourceRefs
 * @property {MediaRef[]}     media
 * @property {Task[]}         _tasks
 * @property {RlogEntry[]}    _rlog
 * @property {Object[]}       refns
 * @property {Object[]}       _passthrough
 * @property {string|null}    _stat
 * @property {string}         grampId
 * @property {string}         lastChanged
 * @property {string}         lastChangedTime
 * @property {string}         chanNote
 */

/**
 * @typedef {Object} Source  Quellen-Datensatz (GEDCOM SOUR).
 * @property {string}    id
 * @property {string}    title
 * @property {string}    abbr
 * @property {string}    author
 * @property {string}    date
 * @property {string}    publ
 * @property {string}    repo
 * @property {Object[]}  repoCalns
 * @property {string}    text
 * @property {string}    note
 * @property {string[]}  noteRefs
 * @property {string}    agnc
 * @property {string}    grampId
 * @property {Object[]}  dataEvens
 * @property {Object[]}  dataExtra
 * @property {Object[]}  refns
 * @property {MediaRef[]} media
 * @property {Object[]}  _passthrough
 * @property {string}    lastChanged
 * @property {string}    lastChangedTime
 * @property {string}    chanNote
 */

/**
 * @typedef {Object} Repo  Archiv-Datensatz (GEDCOM REPO).
 * @property {string}    id
 * @property {string}    name
 * @property {string}    addr
 * @property {string}    phon
 * @property {string}    www
 * @property {string}    email
 * @property {Object[]}  _passthrough
 * @property {string}    lastChanged
 * @property {string}    lastChangedTime
 * @property {string}    chanNote
 */

/**
 * @typedef {Object} AppDb  Haupt-Datenbankstruktur (AppState.db / globales `db`).
 * @property {Object.<string, Person>}  individuals
 * @property {Object.<string, Family>}  families
 * @property {Object.<string, Source>}  sources
 * @property {Object.<string, Repo>}    repositories
 * @property {Object.<string, Object>}  notes
 * @property {Object}   extraPlaces
 * @property {Object}   hofObjects
 * @property {Object}   [placeObjects]
 * @property {Object}   [tags]
 * @property {Object}   [_grampsHandles]
 * @property {string}   placForm
 * @property {string}   [_sourceFormat]
 * @property {Object[]} extraRecords
 * @property {string[]} headLines
 */

// ── Getters / Mutations-Helpers ────────────────────────────────────────────
// Zentraler Einstiegspunkt — ein Ort für künftige Validierung, Undo oder Struktur-Änderungen.
// Getters geben null zurück statt undefined, sodass Aufrufer einheitlich auf null prüfen können.
/** @param {string} id @returns {Person|null} */
function getPerson(id)  { return AppState.db.individuals[id]  ?? null; }
/** @param {string} id @returns {Family|null} */
function getFamily(id)  { return AppState.db.families[id]     ?? null; }
/** @param {string} id @returns {Source|null} */
function getSource(id)  { return AppState.db.sources[id]      ?? null; }
/** @param {string} id @returns {Repo|null} */
function getRepo(id)    { return AppState.db.repositories[id] ?? null; }

// Setters — Object.assign-Patch auf bestehende Top-Level-Felder.
// Für verschachtelte Array-Mutations (media[idx], fams.push etc.) weiter direkt verwenden.
/** @param {string} id @param {Partial<Person>} patch */
function setPerson(id, patch) { const p = AppState.db.individuals[id]; if (p) Object.assign(p, patch); }
/** @param {string} id @param {Partial<Family>} patch */
function setFamily(id, patch) { const f = AppState.db.families[id];   if (f) Object.assign(f, patch); }
/** @param {string} id @param {Partial<Source>} patch */
function setSource(id, patch) { const s = AppState.db.sources[id];    if (s) Object.assign(s, patch); }
/** @param {string} id @param {Partial<Repo>} patch */
function setRepo(id, patch)   { const r = AppState.db.repositories[id]; if (r) Object.assign(r, patch); }

// ─────────────────────────────────────
//  GEDCOM DATUM / CONT HELFER
// ─────────────────────────────────────
const _GED_MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function gedcomDate(d) {
  return `${d.getDate()} ${_GED_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function gedcomTime(d) {
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
}
// Normiert Monatsabkürzungen auf Großschreibung: "Aug 1977" → "AUG 1977"
function normGedDate(s) {
  if (!s) return s;
  return s.replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/gi, m => m.toUpperCase());
}

// ─────────────────────────────────────
//  DATUM-HILFSFUNKTIONEN (Sprint 6a)
// ─────────────────────────────────────
const _MONTH_NUM = { JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12 };

// Gemeinsamer Parser: GEDCOM-Datumsteil → {d, m, y} (alle Strings)
function _parseDatePart(s) {
  const u = (s || '').trim().toUpperCase();
  const dMY = u.match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})$/);
  if (dMY) return { d: dMY[1], m: dMY[2], y: dMY[3] };
  const mY = u.match(/^([A-Z]{3})\s+(\d{4})$/);
  if (mY)  return { d: '', m: mY[1], y: mY[2] };
  const yO = u.match(/^(\d{1,4})$/);
  if (yO)  return { d: '', m: '', y: yO[1] };
  return { d: '', m: '', y: u };
}

// Einzelnes GEDCOM-Segment → ISO-String: '10 JUN 1870' → '1870-06-10'
function gedDatePartToISO(s) {
  if (!s) return '';
  const { d, m, y } = _parseDatePart(s);
  if (!y) return '';
  if (m) {
    const mn = _MONTH_NUM[m];
    if (!mn) return y;
    return d ? `${y}-${String(mn).padStart(2,'0')}-${String(+d).padStart(2,'0')}` : `${y}-${String(mn).padStart(2,'0')}`;
  }
  return y;
}

// GEDCOM-Datumsstring → { qual, date1, date2 }
function parseGedDate(raw) {
  if (!raw) return { qual:'', date1:'', date2:'' };
  const s = raw.trim().toUpperCase();
  const bet = s.match(/^BET\s+(.+?)\s+AND\s+(.+)$/i);
  if (bet) return { qual:'BET', date1:bet[1].trim(), date2:bet[2].trim() };
  const fromTo = s.match(/^FROM\s+(.+?)\s+TO\s+(.+)$/i);
  if (fromTo) return { qual:'FROM', date1:fromTo[1].trim(), date2:fromTo[2].trim() };
  for (const q of ['ABT','CAL','EST','BEF','AFT','FROM','TO']) {
    if (s.startsWith(q + ' ')) return { qual:q, date1:normGedDate(raw.slice(q.length+1).trim()), date2:'' };
  }
  return { qual:'', date1:normGedDate(raw.trim()), date2:'' };
}

// Teile → GEDCOM-Datumsstring
function buildGedDate(qual, date1, date2) {
  const d1 = normGedDate((date1||'').trim());
  if (!d1) return '';
  if (qual === 'BET')  { const d2 = normGedDate((date2||'').trim()); return d2 ? `BET ${d1} AND ${d2}` : d1; }
  if (qual === 'FROM') { const d2 = normGedDate((date2||'').trim()); return d2 ? `FROM ${d1} TO ${d2}` : `FROM ${d1}`; }
  return qual ? `${qual} ${d1}` : d1;
}

// GEDCOM-Datumsstring → numerischer Sortierschlüssel YYYYMMDD (0 = unbekannt)
function gedDateSortKey(dateStr) {
  if (!dateStr) return 0;
  const { date1 } = parseGedDate(dateStr);
  const iso = gedDatePartToISO(date1 || dateStr);
  if (!iso) return 0;
  const p = iso.split('-');
  return (parseInt(p[0])||0) * 10000 + (parseInt(p[1])||0) * 100 + (parseInt(p[2])||0);
}


// Formular-Felder befüllen
function fillDateFields(qualId, dateBaseId, date2BaseId, raw) {
  const { qual, date1, date2 } = parseGedDate(raw);
  // Qualifier nur setzen wenn Option vorhanden (FROM/TO nicht in allen Dropdowns)
  const sel = document.getElementById(qualId);
  if (sel && [...sel.options].some(o => o.value === qual)) sel.value = qual;
  else if (sel) sel.value = '';
  writeDatePartToFields(dateBaseId, date1);
  if (date2BaseId) {
    writeDatePartToFields(date2BaseId, date2);
    const grp = document.getElementById(date2BaseId + '-group');
    if (grp) grp.hidden = !(qual === 'BET' || qual === 'FROM');
  }
}

// Qualifier-Dropdown: zweites Datumfeld ein-/ausblenden
function onDateQualChange(selectEl, date2Id) {
  if (!date2Id) return;
  const grp = document.getElementById(date2Id + '-group');
  if (grp) grp.hidden = !(selectEl.value === 'BET' || selectEl.value === 'FROM');
}

// ── 3-Felder-Datum-Hilfsfunktionen ──────────────────────────────────────────
// Normalisiert Monatseingabe (Zahl, Deutsch, Englisch) → GEDCOM-Abkürzung
function normMonth(s) {
  if (!s) return '';
  const k = s.trim().toLowerCase();
  const map = {
    '1':'JAN','01':'JAN','2':'FEB','02':'FEB','3':'MAR','03':'MAR',
    '4':'APR','04':'APR','5':'MAY','05':'MAY','6':'JUN','06':'JUN',
    '7':'JUL','07':'JUL','8':'AUG','08':'AUG','9':'SEP','09':'SEP',
    '10':'OCT','11':'NOV','12':'DEC',
    'jan':'JAN','januar':'JAN','january':'JAN',
    'feb':'FEB','februar':'FEB','february':'FEB',
    'mar':'MAR','mär':'MAR','märz':'MAR','march':'MAR',
    'apr':'APR','april':'APR',
    'mai':'MAY','may':'MAY',
    'jun':'JUN','juni':'JUN','june':'JUN',
    'jul':'JUL','juli':'JUL','july':'JUL',
    'aug':'AUG','august':'AUG',
    'sep':'SEP','september':'SEP',
    'okt':'OCT','oktober':'OCT','oct':'OCT','october':'OCT',
    'nov':'NOV','november':'NOV',
    'dez':'DEC','dezember':'DEC','dec':'DEC','december':'DEC',
  };
  const abb = s.trim().toUpperCase().slice(0, 3);
  return map[k] || (_GED_MONTHS.includes(abb) ? abb : '');
}

// Schreibt geparsten Datumsteil in drei Felder (baseId + '-d'/'-m'/'-y')
function writeDatePartToFields(baseId, dateStr) {
  const { d, m, y } = _parseDatePart(dateStr);
  const dEl = document.getElementById(baseId + '-d');
  const mEl = document.getElementById(baseId + '-m');
  const yEl = document.getElementById(baseId + '-y');
  if (dEl) dEl.value = d;
  if (mEl) mEl.value = m;
  if (yEl) yEl.value = y;
}

// Liest drei Felder und baut GEDCOM-Datumsteil (ohne Qualifier)
function readDatePartFromFields(baseId) {
  const d = (document.getElementById(baseId + '-d')?.value || '').trim();
  const mRaw = (document.getElementById(baseId + '-m')?.value || '').trim();
  const m = mRaw ? normMonth(mRaw) : '';
  const y = (document.getElementById(baseId + '-y')?.value || '').trim();
  if (!y) return '';
  if (m && d) return `${+d} ${m} ${y}`;
  if (m) return `${m} ${y}`;
  return y;
}

// Validiert drei Datumsfelder (baseId+'-d'/'-m'/'-y') — gibt Fehlerstring oder null zurück
function validateDatePartFields(baseId) {
  const d = (document.getElementById(baseId + '-d')?.value || '').trim();
  const mRaw = (document.getElementById(baseId + '-m')?.value || '').trim();
  const y = (document.getElementById(baseId + '-y')?.value || '').trim();
  if (y && !/^\d{4}$/.test(y)) return 'Jahr muss 4-stellig sein (z.B. 1875)';
  if (y && (+y < 1000 || +y > 2099)) return 'Jahr außerhalb 1000–2099';
  if (d && (!/^\d{1,2}$/.test(d) || +d < 1 || +d > 31)) return 'Tag muss 1–31 sein';
  if (mRaw && !normMonth(mRaw)) return 'Ungültiger Monat';
  return null;
}

// Wrapper: liest Qualifier + zwei Datumsbasen → buildGedDate
function buildGedDateFromFields(qualId, dateBaseId, date2BaseId) {
  return buildGedDate(
    document.getElementById(qualId)?.value || '',
    readDatePartFromFields(dateBaseId),
    date2BaseId ? readDatePartFromFields(date2BaseId) : ''
  );
}

// ── PLAC-Modus-Hilfsfunktionen (Sprint 6b) ──────────────────────────────────
function getPlacLabels() {
  const raw = AppState.db.placForm || 'Dorf, Stadt, PLZ, Landkreis, Bundesland, Staat';
  return raw.split(',').map(s => s.trim()).filter(Boolean).slice(0, 6);
}

function _buildPlaceParts(placeId, container) {
  container.textContent = '';
  getPlacLabels().forEach((lbl, i) => {
    const inp = document.createElement('input');
    inp.className = 'form-input mb-3';
    inp.id = placeId + '-p' + i;
    inp.placeholder = lbl;
    container.appendChild(inp);
  });
}

function fillPlaceParts(placeId, raw) {
  const parts = (raw || '').split(/\s*,\s*/);
  getPlacLabels().forEach((_, i) => {
    const el = document.getElementById(`${placeId}-p${i}`);
    if (el) el.value = parts[i] || '';
  });
}

function joinPlaceParts(placeId, keepAll = false) {
  const parts = getPlacLabels().map((_, i) => {
    const el = document.getElementById(`${placeId}-p${i}`);
    return el ? el.value.trim() : '';
  });
  if (!keepAll) while (parts.length && !parts[parts.length - 1]) parts.pop();
  return parts.join(', ');
}

// Compact-Darstellung: leere Hierarchieteile weglassen ("Ochtrup, , , NRW" → "Ochtrup, NRW")
function compactPlace(place) {
  if (!place) return '';
  return place.split(',').map(s => s.trim()).filter(Boolean).join(', ');
}

// ─── PLACE-HIST (ADR-024): Orts-Entität — Registry + Auflösung über Zeit ─────
// KANONISCHES Identity-Matching für Ortsnamen. NFC + casefold + Whitespace.
// Anwenden überall, wo zwei Ortsnamen auf „gleiche Identität" geprüft werden
// (Registry-Lookup, Propagation, Lösch-Suche, Geocoder-Cache, JSON-Import-Dedup).
// NIE für Anzeige/Speicherung verwenden → bleibt verlustfrei.
function _normPlaceName(s) {
  if (!s) return '';
  return String(s).normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
}

// Erste 3–4-stellige Jahreszahl aus einem GEDCOM/ISO/Freitext-Datum.
function _placeYear(d) {
  if (d == null) return null;
  const m = String(d).match(/\d{3,4}/);
  return m ? parseInt(m[0], 10) : null;
}

// Migriert Alt-placeObjects (vor ADR-024 P0a-1): undatiertes parentId → enclosedBy[];
// stellt pnames/enclosedBy als Arrays sicher. Idempotent.
function _migratePlaceObjects(db) {
  const pos = db && db.placeObjects;
  if (!pos) return;
  for (const pl of Object.values(pos)) {
    if (!Array.isArray(pl.pnames)) pl.pnames = [];
    if (!Array.isArray(pl.enclosedBy)) {
      pl.enclosedBy = pl.parentId
        ? [{ placeId: pl.parentId, dateFrom: null, dateTo: null, dateType: null, _dateRaw: null }]
        : [];
    }
    // Koord-Paar-Invariante: halbe Paare (lat ohne long o.ä.) entstanden in alten
    // savePlace-Pfaden, wenn User Koords als DMS ohne Direction eintippte (NaN auf
    // einer Achse). Würden showPlaceDetail crashen — beide auf null setzen.
    if ((pl.lat == null) !== (pl.long == null)) { pl.lat = null; pl.long = null; }
  }
}

// ─── P0b-3: extraPlaces → placeObjects Migration ─────────────────────────────
// Erzeugt aus jedem extraPlaces-Eintrag mit Koordinaten oder Übersetzungen ein
// placeObject (idempotent via stabiler _epId-Hash). Bestehende placeObjects werden
// additiv ergänzt (Koordinaten nur wenn fehlend; pnames dedupliziert).
// Aufruf NACH loadExtraPlaces() + parsedPlaceTrans-Merge in storage-file.js.
function _epId(name) {
  // Stabiler djb2-Hash: gleicher Name → gleiche ID über Sessions
  let h = 5381;
  const s = String(name);
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return '_ep_' + h.toString(16).padStart(8, '0');
}

function _migrateExtraPlacesToPlaceObjects(db) {
  const ep = db && db.extraPlaces;
  if (!ep || !Object.keys(ep).length) return;
  if (!db.placeObjects) db.placeObjects = {};
  const pos = db.placeObjects;
  let changed = false;

  for (const epEntry of Object.values(ep)) {
    const name = epEntry.name || '';
    if (!name) continue;
    // Paar-Invariante: nur als vollständiges Paar — halbe Werte führen sonst zu
    // place.long.toFixed-Crash in showPlaceDetail
    const hasCoords = epEntry.lati != null && epEntry.long != null;
    const hasTrans  = Array.isArray(epEntry.trans) && epEntry.trans.length > 0;
    if (!hasCoords && !hasTrans) continue;

    // Vorhandenes placeObject suchen (direkt, ohne Registry-Cache)
    let existingId = null;
    const norm = _normPlaceName(name);
    for (const [id, po] of Object.entries(pos)) {
      if (_normPlaceName(po.title) === norm
        || (po.pnames || []).some(pn => _normPlaceName(pn.value) === norm)) {
        existingId = id; break;
      }
    }

    if (existingId) {
      const po = pos[existingId];
      if (po.lat == null && hasCoords) { po.lat = epEntry.lati; po.long = epEntry.long; changed = true; }
      if (hasTrans) {
        if (!Array.isArray(po.pnames)) po.pnames = [];
        const have = new Set(po.pnames.map(pn => _normPlaceName(pn.value)));
        have.add(_normPlaceName(po.title));
        for (const t of epEntry.trans) {
          if (!t.value || have.has(_normPlaceName(t.value))) continue;
          have.add(_normPlaceName(t.value));
          po.pnames.push({ value: t.value, lang: t.lang || '', dateFrom: null, dateTo: null, dateType: null, _dateRaw: null });
          changed = true;
        }
      }
    } else {
      // Neues placeObject anlegen
      let id = _epId(name);
      if (pos[id]) {
        // 32-bit djb2-Kollision: anderer Name landet auf demselben Hash.
        // Statt stillem `continue` (Eintrag verschwindet) → Suffix-Fallback.
        let suf = 2;
        while (pos[id + '_' + suf] && suf < 16) suf++;
        const candidate = id + '_' + suf;
        const _warn = (typeof console !== 'undefined' && console.warn) ? console.warn
                    : (typeof console !== 'undefined' && console.log) ? console.log : null;
        if (pos[candidate]) {
          _warn && _warn('[PLACE] _epId-Kollision unauflösbar — Ort übersprungen:', name);
          continue;
        }
        _warn && _warn('[PLACE] _epId-Kollision für', JSON.stringify(name),
          '→ Suffix-Fallback', candidate);
        id = candidate;
      }
      const pnames = [];
      if (hasTrans) {
        const have = new Set([_normPlaceName(name)]);
        for (const t of epEntry.trans) {
          if (!t.value || have.has(_normPlaceName(t.value))) continue;
          have.add(_normPlaceName(t.value));
          pnames.push({ value: t.value, lang: t.lang || '', dateFrom: null, dateTo: null, dateType: null, _dateRaw: null });
        }
      }
      pos[id] = {
        id, title: name, type: null,
        lat:  hasCoords ? epEntry.lati : null,
        long: hasCoords ? epEntry.long : null,
        pnames, enclosedBy: [], parentId: null,
      };
      changed = true;
    }
  }
  if (changed) UIState._placeRegistry = null;
}

// ─── P2 Item 9: Event-Koordinaten — placeObjects als single source of truth ──
// Liest Koordinaten eines Events: erst placeObjects via ev.placeId, dann via
// findByName(ev.place), Fallback ev.lati/long. Damit zeigt nach savePlace die
// neue Koordinate überall sofort, ohne dass _propagateCoordsToEvents sie eager
// in alle Events kopieren muss.
function _eventCoords(ev) {
  if (!ev) return { lati: null, long: null };
  if (typeof getPlaceRegistry === 'function') {
    const reg = getPlaceRegistry();
    let pid = ev.placeId;
    if (!pid && ev.place) pid = reg.findByName(ev.place);
    if (pid) {
      const po = reg.byId[pid];
      if (po && po.lat != null) return { lati: po.lat, long: po.long };
    }
  }
  // Fallback: Event-eigene Koords (aus GEDCOM-Parser oder Altbeständen)
  return { lati: ev.lati ?? null, long: ev.long ?? null };
}

// Baut periodenkorrekten, FORM-kompatiblen PLAC-String via enclosureChainAsOf (ADR-024).
// Gibt "Ort, Amt, Fürstbistum" zurück (spezifisch→allgemein, keine Leer-Slots).
// Wichtig: pro Knoten nur das erste Komma-Segment von resolveAsOf verwenden —
// GRAMPS ptitle ist bereits hierarchisch ("Ochtrup, Kreis Steinfurt, NRW"), würde
// sonst mit der enclosedBy-Kette doppelt erscheinen.
// Fallback: resolveAsOf (atomarer Name) wenn keine enclosedBy-Kette vorhanden.
function _buildFormString(placeId, year) {
  if (!placeId || typeof getPlaceRegistry !== 'function') return null;
  const reg = getPlaceRegistry();
  const _atomic = s => s ? s.split(',')[0].trim() : '';
  // Ohne Datum: kein Periode bestimmbar → nur atomarer Name, keine Hierarchie
  if (year == null) return _atomic(reg.resolveAsOf(placeId, null)) || null;
  const chain = reg.enclosureChainAsOf(placeId, year)
    .map(_atomic).filter(Boolean);
  if (chain.length) return chain.join(', ');
  return _atomic(reg.resolveAsOf(placeId, year)) || null;
}

// Berechnet Ergebnis-Gruppen für den String→PlaceObject Link-Dialog.
// Gruppiert alle betroffenen Events nach ihrem resultierenden _buildFormString-Wert.
// Gibt [{str, count, yearMin, yearMax, noDate}] sortiert nach Jahresminimum zurück.
function _buildLinkGroups(sourceNames, targetPlaceId) {
  if (!targetPlaceId || typeof getPlaceRegistry !== 'function') return [];
  const reg = getPlaceRegistry();
  const srcSet = new Set(sourceNames.map(n => n.trim()));
  const groups = new Map();
  const _visit = ev => {
    if (!ev || ev.place == null) return;
    const t = ev.place.trim();
    if (!srcSet.has(t)) return;
    const year = _placeYear(ev.date);
    const str  = _buildFormString(targetPlaceId, year) || reg.resolveAsOf(targetPlaceId, year) || '';
    if (!groups.has(str)) groups.set(str, { str, count: 0, yearMin: Infinity, yearMax: -Infinity, noDate: 0 });
    const g = groups.get(str);
    g.count++;
    if (year != null) { g.yearMin = Math.min(g.yearMin, year); g.yearMax = Math.max(g.yearMax, year); }
    else g.noDate++;
  };
  const db = AppState.db;
  for (const p of Object.values(db.individuals || {})) {
    [p.birth, p.chr, p.death, p.buri].forEach(_visit); (p.events || []).forEach(_visit);
  }
  for (const f of Object.values(db.families || {})) {
    [f.marr, f.engag, f.div, f.divf].forEach(_visit); (f.events || []).forEach(_visit);
  }
  return [...groups.values()].sort((a, b) =>
    (a.yearMin === Infinity ? 1 : 0) - (b.yearMin === Infinity ? 1 : 0) || a.yearMin - b.yearMin);
}

// Wendet den String→PlaceObject Link an (nur Gruppen in confirmedStrs).
// Setzt ev.place = periodenkorrekter String + ev.placeId = targetPlaceId.
// net_delta=0: ev.place wird auf exakt den String gesetzt, den der Writer beim Export reproduziert.
function applyStringPlaceLink(sourceNames, targetPlaceId, confirmedStrs) {
  if (!targetPlaceId || typeof getPlaceRegistry !== 'function') return 0;
  const reg = getPlaceRegistry();
  const srcSet = new Set(sourceNames.map(n => n.trim()));
  const confirmed = new Set(confirmedStrs);
  let linked = 0;
  const _fix = ev => {
    if (!ev || ev.place == null) return;
    const t = ev.place.trim();
    if (!srcSet.has(t)) return;
    const year = _placeYear(ev.date);
    const str  = _buildFormString(targetPlaceId, year) || reg.resolveAsOf(targetPlaceId, year) || '';
    if (!confirmed.has(str)) return;
    ev.place = str; ev.placeId = targetPlaceId; linked++;
  };
  const db = AppState.db;
  for (const p of Object.values(db.individuals || {})) {
    [p.birth, p.chr, p.death, p.buri].forEach(_fix); (p.events || []).forEach(_fix);
  }
  for (const f of Object.values(db.families || {})) {
    [f.marr, f.engag, f.div, f.divf].forEach(_fix); (f.events || []).forEach(_fix);
  }
  if (linked) { UIState._placesCache = null; UIState._placeRegistry = null; }
  return linked;
}

// Verknüpft GEDCOM-Events mit placeObjects (ADR-024 Link-Pass).
// Aufruf nach loadPlaceObjectsFromIDB() — nur im GEDCOM-Pfad (GRAMPS setzt placeId via Parser).
// Sicherheitsbedingung: _buildFormString oder resolveAsOf muss exakt ev.place ergeben
// → GEDCOM net_delta=0 garantiert. Zweistufige Suche:
//   1. exakter findByName(ev.place) — einfache Strings + historische pnames
//   2. Fallback: findByName(erstes Komma-Segment) + buildFormString-Vergleich
//      → erkennt periodengerecht exportierte Komma-Hierarchie-Strings beim Reimport
function _linkGedcomEventsToPlaceObjects(db) {
  if (!db) return;
  const reg = getPlaceRegistry();
  if (!reg || !Object.keys(reg.byId).length) return;
  let linked = 0;
  const _link = ev => {
    if (!ev || ev.placeId || !ev.place) return;
    const year = _placeYear(ev.date);
    // Schritt 1: exakter Match (title, pnames[], historische Strings)
    let pid = reg.findByName(ev.place);
    // Schritt 2: erstes Komma-Segment → buildFormString-Vergleich (Reimport-Pfad)
    if (!pid && ev.place.includes(',')) {
      const first = ev.place.split(',')[0].trim();
      const cand  = reg.findByName(first);
      if (cand) {
        const built = (typeof _buildFormString === 'function' && _buildFormString(cand, year))
          || reg.resolveAsOf(cand, year);
        if (built === ev.place) pid = cand;
      }
    }
    if (!pid) return;
    const check = (typeof _buildFormString === 'function' && _buildFormString(pid, year))
      || reg.resolveAsOf(pid, year);
    if (check === ev.place) { ev.placeId = pid; linked++; }
  };
  for (const p of Object.values(db.individuals || {})) {
    [p.birth, p.chr, p.death, p.buri].forEach(_link);
    (p.events || []).forEach(_link);
  }
  for (const f of Object.values(db.families || {})) {
    [f.marr, f.engag, f.div, f.divf].forEach(_link);
    (f.events || []).forEach(_link);
  }
  if (linked) console.info(`[PLACE] ${linked} GEDCOM-Events mit placeObject verknüpft`);
}

// Baut (lazy, gecacht) die PlaceRegistry über AppState.db.placeObjects:
//   byId   : placeId → placeObject
//   byNorm : normalisierter Name (title + alle pnames) → placeId (erste gewinnt)
//   findByName(str)              → placeId | null
//   resolveAsOf(placeId, year)   → periodenkorrekter Name (pname gültig im Jahr, sonst title)
//   enclosureChainAsOf(id, year) → [Ort, übergeordnet, …] als Namen zum Jahr
function getPlaceRegistry() {
  if (UIState._placeRegistry) return UIState._placeRegistry;
  const pos = (AppState.db && AppState.db.placeObjects) || {};
  const byId = {}, byNorm = {};
  for (const [id, pl] of Object.entries(pos)) {
    byId[id] = pl;
    const names = [pl.title].concat((pl.pnames || []).map(p => p.value));
    for (const nm of names) {
      const k = _normPlaceName(nm);
      if (k && !(k in byNorm)) byNorm[k] = id;
    }
  }
  const _yearOf = y => (typeof y === 'number' ? y : _placeYear(y));
  const _dateMatches = (from, to, y) =>
    (from == null && to == null) ? false
    : (from == null || y >= from) && (to == null || y <= to);
  const reg = {
    byId, byNorm,
    findByName(str) {
      const k = _normPlaceName(str);
      return (k && k in byNorm) ? byNorm[k] : null;
    },
    resolveAsOf(placeId, year) {
      const pl = byId[placeId];
      if (!pl) return null;
      const y = _yearOf(year);
      if (y != null) {
        // Bei Überlappungen: neuester Eintrag (höchstes dateFrom) bevorzugen — analog enclosureChainAsOf
        let bestFrom = -Infinity, bestVal = null;
        for (const pn of pl.pnames || []) {
          if (!_dateMatches(_placeYear(pn.dateFrom), _placeYear(pn.dateTo), y)) continue;
          const f = _placeYear(pn.dateFrom) ?? -Infinity;
          if (f > bestFrom) { bestFrom = f; bestVal = pn.value; }
        }
        if (bestVal) return bestVal;
      }
      return pl.title || (pl.pnames && pl.pnames[0] && pl.pnames[0].value) || '';
    },
    // opts.meta (optional): wird mit { truncated: true } befüllt wenn die Kette
    // bei einem Knoten abbricht, der bekannte Eltern hat (encs.length > 0) aber
    // keiner davon zum angefragten Jahr passt. Erlaubt dem Aufrufer, eine
    // unvollständige Kette von einer legitim-obersten Kette zu unterscheiden.
    enclosureChainAsOf(placeId, year, opts) {
      const out = [], seen = new Set();
      const y = _yearOf(year);
      let curId = placeId;
      while (curId && byId[curId] && !seen.has(curId)) {
        seen.add(curId);
        // Existenzgrenzen prüfen: Knoten nicht in Kette aufnehmen wenn außerhalb
        const _pl = byId[curId];
        if (y != null && (_pl.existsFrom || _pl.existsTo)) {
          const ef = _placeYear(_pl.existsFrom), et = _placeYear(_pl.existsTo);
          if ((ef != null && y < ef) || (et != null && y > et)) break;
        }
        out.push(reg.resolveAsOf(curId, year));
        const encs = byId[curId].enclosedBy || [];
        let next = null;
        if (y != null) {
          // Bei Überlappung am Grenzdatum (z.B. bis=1946 und ab=1946) gewinnt der
          // Eintrag mit dem höchsten dateFrom — er "tritt in Kraft" und hat Vorrang.
          let bestFrom = -Infinity, bestEnc = null;
          for (const e of encs) {
            if (_dateMatches(_placeYear(e.dateFrom), _placeYear(e.dateTo), y)) {
              const ef = _placeYear(e.dateFrom) ?? -Infinity;
              if (ef > bestFrom) { bestFrom = ef; bestEnc = e; }
            }
          }
          next = bestEnc?.placeId ?? null;
          // Hat Eltern-Einträge, aber keiner passt zum Jahr → Kette truncated
          if (!next && encs.length > 0 && opts?.meta) opts.meta.truncated = true;
        }
        // Bei spezifischem Jahr kein Fallback auf encs[0]/parentId — beides wäre ein Guess.
        // parentId == enclosedBy[0].placeId (wird so gesetzt), also würde der Fallback
        // zeitlich nicht passende Eltern liefern. Kette nur fortsetzen wenn y==null.
        if (!next) next = y == null ? (encs[0]?.placeId || byId[curId].parentId || null) : null;
        curId = next;
      }
      return out;
    },
  };
  UIState._placeRegistry = reg;
  return reg;
}

// Kanonischer Ortsname für Aggregation (Statistik): bildet historische
// Namensvarianten (placeObject-pnames) auf den Haupttitel des Orts ab, damit
// derselbe Ort nicht mehrfach gezählt wird. Auflösung über ev.placeId, sonst
// findByName(place) (matcht Titel + alle pnames). Fallback: compactPlace(place).
function canonicalPlaceLabel(place, placeId) {
  const reg = (typeof getPlaceRegistry === 'function') ? getPlaceRegistry() : null;
  let pid = placeId || (reg && place ? reg.findByName(place) : null);
  if (pid && reg && reg.byId[pid] && reg.byId[pid].title) {
    return compactPlace(reg.byId[pid].title);
  }
  return compactPlace(place);
}

// ─── PLACE-HIST (ADR-024, P2): zentraler Mutations-Helper ───────────────────
// Wendet fn auf das placeObject mit der gegebenen id an, invalidiert beide
// UIState-Caches und persistiert. Ersetzt das 4-Schritt-Ritual
//   <po mutieren>; UIState._placeRegistry=null; UIState._placesCache=null;
//   markChanged(); savePlaceObjects();
// das vorher an ~20 Stellen wiederholt war (mit Vergesser-Risiko, vgl. v847).
// Gibt true zurück wenn fn ausgeführt wurde, false wenn placeObject fehlt.
function mutatePlaceObject(id, fn) {
  const pos = AppState.db.placeObjects || (AppState.db.placeObjects = {});
  if (!pos[id]) return false;
  fn(pos[id]);
  UIState._placeRegistry = null;
  UIState._placesCache   = null;
  if (typeof markChanged       === 'function') markChanged();
  if (typeof savePlaceObjects  === 'function') savePlaceObjects();
  return true;
}

// Pendant für Anlegen (oder Update) — wenn id schon existiert, wie mutatePlaceObject;
// sonst legt es ein neues placeObject an und übergibt es an fn. Gibt die placeId zurück.
// Sinnvoll für Pfade wie applyGovText/saveNewPlace, die je nach Zustand anlegen ODER mutieren.
function upsertPlaceObject(id, makeNew, fn) {
  const pos = AppState.db.placeObjects || (AppState.db.placeObjects = {});
  let po = pos[id];
  if (!po) {
    po = makeNew ? makeNew() : { id, title:'', type:'Unknown', lat:null, long:null, pnames:[], enclosedBy:[], parentId:null };
    pos[po.id || id] = po;
    if (!po.id) po.id = id;
  }
  if (typeof fn === 'function') fn(po);
  UIState._placeRegistry = null;
  UIState._placesCache   = null;
  if (typeof markChanged      === 'function') markChanged();
  if (typeof savePlaceObjects === 'function') savePlaceObjects();
  return po.id;
}

// ─── PLACE-HIST (ADR-024, P0b-2): Dubletten-Erkennung + Merge ────────────────
// Aggressive Normalisierung NUR für die Dubletten-KANDIDATEN-Suche (faltet
// Umlaute/ae-oe-ue zusammen, wie der Validator _placeNorm). Strenger als
// _normPlaceName (das nur fürs exakte Alias-Matching dient) → bewusst getrennt.
function _placeFold(s) {
  if (!s) return '';
  return String(s).toLowerCase().trim()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 's')
    .replace(/ae(?=[a-z])/g, 'a').replace(/oe(?=[a-z])/g, 'o').replace(/ue(?=[a-z])/g, 'u')
    .replace(/\s+/g, ' ');
}

// Haversine-Distanz in km (für Koordinaten-Nähe-Heuristik).
function _placeDistKm(aLat, aLon, bLat, bLon) {
  if (aLat == null || aLon == null || bLat == null || bLon == null) return Infinity;
  const R = 6371, rad = d => d * Math.PI / 180;
  const dLat = rad(bLat - aLat), dLon = rad(bLon - aLon);
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

// Findet Gruppen wahrscheinlich identischer placeObjects.
// Kriterien (ODER): gleicher Fold-Key von title ODER irgendeinem pname;
// oder Koordinaten < toleranceKm voneinander (nur bei vorhandenen Koords).
// Liefert [{ key, ids:[…], titles:[…] }] mit ≥2 Mitgliedern. Rein lesend.
function findPlaceDuplicates(toleranceKm = 1) {
  const pos = (AppState.db && AppState.db.placeObjects) || {};
  const entries = Object.values(pos);
  // 1) Gruppierung über Fold-Key (title + alle pnames)
  const byKey = new Map();   // foldKey → Set(id)
  for (const pl of entries) {
    const keys = new Set();
    keys.add(_placeFold(pl.title));
    for (const pn of pl.pnames || []) keys.add(_placeFold(pn.value));
    for (const k of keys) {
      if (!k) continue;
      if (!byKey.has(k)) byKey.set(k, new Set());
      byKey.get(k).add(pl.id);
    }
  }
  // union-find über Fold-Key-Kollisionen + Koordinaten-Nähe
  const parent = {};
  const find = x => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const union = (a, b) => { parent[find(a)] = find(b); };
  for (const pl of entries) parent[pl.id] = pl.id;
  for (const set of byKey.values()) {
    const ids = [...set];
    for (let i = 1; i < ids.length; i++) union(ids[0], ids[i]);
  }
  // Koordinaten-Nähe (O(n²) — placeObjects sind typ. wenige hundert)
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i], b = entries[j];
      if (find(a.id) === find(b.id)) continue;
      if (a.lat != null && b.lat != null
        && _placeDistKm(a.lat, a.long, b.lat, b.long) <= toleranceKm
        && _placeFold(a.title).split(',')[0] === _placeFold(b.title).split(',')[0]) {
        union(a.id, b.id);
      }
    }
  }
  // Cluster sammeln
  const clusters = new Map();
  for (const pl of entries) {
    const root = find(pl.id);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root).push(pl);
  }
  const out = [];
  for (const members of clusters.values()) {
    if (members.length < 2) continue;
    out.push({
      key: _placeFold(members[0].title),
      ids: members.map(m => m.id),
      titles: members.map(m => m.title),
    });
  }
  return out;
}

// Führt loserIds in winnerId zusammen — VERLUSTFREI:
//   • Titel + pnames der Verlierer werden zu winner.pnames (dedupliziert per
//     _normPlaceName; behält Datierung/lang/_dateRaw der ersten Fundstelle).
//   • enclosedBy der Verlierer werden ergänzt (dedupliziert per placeId).
//   • Koordinaten: nur übernehmen wenn der Gewinner noch keine hat.
//   • Jede ev.placeId-Referenz (INDI birth/chr/death/buri/events, FAM marr/
//     engag/div/divf) wird vom Verlierer auf den Gewinner umgehängt.
//   • Verlierer-placeObjects werden gelöscht.
// Gibt { merged, repointed } zurück. Invalidiert die Registry.
function mergePlaceObjects(winnerId, loserIds) {
  const pos = (AppState.db && AppState.db.placeObjects) || {};
  const winner = pos[winnerId];
  if (!winner) return { merged: 0, repointed: 0 };
  if (!Array.isArray(winner.pnames)) winner.pnames = [];
  if (!Array.isArray(winner.enclosedBy)) winner.enclosedBy = [];
  const haveName = new Set(winner.pnames.map(p => _normPlaceName(p.value)));
  haveName.add(_normPlaceName(winner.title));
  const haveEnc = new Set(winner.enclosedBy.map(e => e.placeId));

  let merged = 0, repointed = 0;
  const losers = loserIds.filter(id => id !== winnerId && pos[id]);

  for (const lid of losers) {
    const loser = pos[lid];
    // Namen sammeln: Titel + pnames des Verlierers
    const cand = [{ value: loser.title }].concat(loser.pnames || []);
    for (const pn of cand) {
      const k = _normPlaceName(pn.value);
      if (!k || haveName.has(k)) continue;
      haveName.add(k);
      winner.pnames.push({
        value: pn.value, lang: pn.lang || '',
        dateFrom: pn.dateFrom || null, dateTo: pn.dateTo || null,
        dateType: pn.dateType || null, _dateRaw: pn._dateRaw || null,
      });
    }
    // Zugehörigkeit ergänzen
    for (const e of loser.enclosedBy || []) {
      if (e.placeId && e.placeId !== winnerId && !haveEnc.has(e.placeId)) {
        haveEnc.add(e.placeId);
        winner.enclosedBy.push({ ...e });
      }
    }
    // Koordinaten nur wenn Gewinner keine hat
    if (winner.lat == null && loser.lat != null) { winner.lat = loser.lat; winner.long = loser.long; }
    delete pos[lid];
    merged++;
  }

  if (merged) {
    const loserSet = new Set(losers);
    const _fix = obj => { if (obj && obj.placeId && loserSet.has(obj.placeId)) { obj.placeId = winnerId; repointed++; } };
    for (const p of Object.values(AppState.db.individuals || {})) {
      _fix(p.birth); _fix(p.chr); _fix(p.death); _fix(p.buri);
      for (const ev of p.events || []) _fix(ev);
    }
    for (const f of Object.values(AppState.db.families || {})) {
      _fix(f.marr); _fix(f.engag); _fix(f.div); _fix(f.divf);
      for (const ev of f.events || []) _fix(ev);
    }
    // andere placeObjects, die auf einen Verlierer als parent/enclosedBy zeigen, umhängen
    for (const pl of Object.values(pos)) {
      if (pl.parentId && loserSet.has(pl.parentId)) pl.parentId = winnerId;
      for (const e of pl.enclosedBy || []) if (e.placeId && loserSet.has(e.placeId)) e.placeId = winnerId;
    }
    UIState._placeRegistry = null;
    UIState._placesCache = null;
  }
  return { merged, repointed };
}

// ─── PLACE-HIST (ADR-024, Item 15/B6): JSON-Import-Dedup ────────────────────
// Importiert Place-Entitäten aus einem Fremdbestand (z.B. orte.json-Export eines
// anderen Geräts) verlustfrei in db.placeObjects. Identity-Matching via
// _normPlaceName(title) — gleicher logischer Ort mit anderem Handle (z.B.
// GRAMPS @P0017@ vs lokales _ep_<hash>) wird zusammengeführt statt dupliziert.
//
// Strategie:
//   1. Remap-Tabelle bauen: jedes import_id auf final_id mappen
//        — Title-Match → vorhandenes target_id (Merge-Ziel)
//        — Sonst → eigenes import_id (oder Suffix bei id-Kollision mit anderem Titel)
//   2. Apply: Nicht-Matches einfügen (enclosedBy/parentId remappen), Matches
//      verlustfrei mergen (pnames-Dedup, enclosedBy union, fehlende Felder ergänzen).
//
// Gibt { added, merged } zurück. Mutiert targetDb.placeObjects. Lässt _placeRegistry
// dem Aufrufer (der die übliche Invalidation+Save fährt).
function _mergePlaceObjectsFromImport(targetDb, importedPos) {
  if (!targetDb || !importedPos) return { added: 0, merged: 0 };
  const pos = targetDb.placeObjects || (targetDb.placeObjects = {});

  // Index: norm(title) → target_id (existierend)
  const byTitleNorm = {};
  for (const [tid, po] of Object.entries(pos)) {
    const k = _normPlaceName(po.title);
    if (k && !(k in byTitleNorm)) byTitleNorm[k] = tid;
  }

  // Pass 1: Remap-Tabelle
  const remap = {}; // import_id → final_id
  for (const [iid, ipo] of Object.entries(importedPos)) {
    const k = _normPlaceName(ipo.title);
    let target = k && byTitleNorm[k];
    if (!target) {
      // Title nicht vorhanden — eigenes iid behalten, außer Kollision mit anderem Titel
      target = iid;
      if (pos[target]) {
        // ID-Kollision: existierendes pos[iid] hat anderen Titel → Suffix
        let suf = 2;
        while (pos[target + '_imp' + suf] && suf < 32) suf++;
        target = target + '_imp' + suf;
      }
      // In den byTitleNorm-Index aufnehmen, damit nachfolgende Importe mit gleichem Titel
      // (importierte Datei kann interne Dubletten haben) auf denselben target zeigen
      if (k) byTitleNorm[k] = target;
    }
    remap[iid] = target;
  }

  // Helfer: enclosedBy[] mit Remap rewriten
  const _remapEnc = (encArr) => (encArr || []).map(e => ({
    ...e,
    placeId: remap[e.placeId] || e.placeId,
  }));

  let added = 0, merged = 0;
  for (const [iid, ipo] of Object.entries(importedPos)) {
    const tid = remap[iid];
    const existing = pos[tid];
    if (!existing) {
      // Neu einfügen — mit remapptem enclosedBy/parentId und tid als finaler id
      pos[tid] = {
        ...ipo,
        id: tid,
        enclosedBy: _remapEnc(ipo.enclosedBy),
        parentId: ipo.parentId ? (remap[ipo.parentId] || ipo.parentId) : null,
        pnames: Array.isArray(ipo.pnames) ? ipo.pnames.slice() : [],
      };
      added++;
      continue;
    }
    // Merge in bestehenden PO — verlustfrei
    if (!Array.isArray(existing.pnames))    existing.pnames    = [];
    if (!Array.isArray(existing.enclosedBy)) existing.enclosedBy = [];
    const haveName = new Set(existing.pnames.map(p => _normPlaceName(p.value)));
    haveName.add(_normPlaceName(existing.title));
    // Auch der Importtitel ist eine potenzielle Schreibweise (falls anders als existing.title)
    const titleKey = _normPlaceName(ipo.title);
    if (titleKey && !haveName.has(titleKey)) {
      haveName.add(titleKey);
      existing.pnames.push({ value: ipo.title, lang: '',
        dateFrom: null, dateTo: null, dateType: null, _dateRaw: null });
    }
    for (const pn of (ipo.pnames || [])) {
      const k = _normPlaceName(pn.value);
      if (!k || haveName.has(k)) continue;
      haveName.add(k);
      existing.pnames.push({
        value: pn.value, lang: pn.lang || '',
        dateFrom: pn.dateFrom || null, dateTo: pn.dateTo || null,
        dateType: pn.dateType || null, _dateRaw: pn._dateRaw || null,
      });
    }
    const haveEnc = new Set(existing.enclosedBy.map(e => e.placeId));
    for (const e of _remapEnc(ipo.enclosedBy)) {
      if (!e.placeId || e.placeId === tid || haveEnc.has(e.placeId)) continue;
      haveEnc.add(e.placeId);
      existing.enclosedBy.push(e);
    }
    if (existing.lat == null && ipo.lat != null) { existing.lat = ipo.lat; existing.long = ipo.long; }
    if ((!existing.type || existing.type === 'Unknown') && ipo.type && ipo.type !== 'Unknown') existing.type = ipo.type;
    if (!existing._govId   && ipo._govId)   existing._govId   = ipo._govId;
    if (!existing.parentId && ipo.parentId) existing.parentId = remap[ipo.parentId] || ipo.parentId;
    // Übernahme _govUnresolved nur wenn existing keinen GovId und Import-PO noch ungelöst ist
    if (ipo._govUnresolved && existing._govUnresolved !== false && !existing._govId) {
      existing._govUnresolved = true;
    }
    merged++;
  }
  return { added, merged };
}

// ─── String-Orts-Dubletten (GEDCOM ohne placeObjects) ────────────────────────
// Normiert den ersten Namensteil für Dubletten-Vergleich:
//   • alles nach erstem Komma entfernen
//   • Klammer-Zusätze:  "Gronau (Westf.)" → "Gronau"
//   • Slash-Suffixe:    "Emsdetten/Westf" → "Emsdetten"
//   • Abkürzungen:      "Rheine i.W."     → "Rheine"
//   • "?", Ziffernblöcke, dann _placeFold
function _placeStringCoreFold(name) {
  // Ersten nicht-leeren Teil nehmen (GEDCOM-Orte können führende Leerfelder haben: ", Ochtrup, , ,")
  const parts = String(name).split(',');
  let s = (parts.find(p => p.trim()) || parts[0]);
  s = s.replace(/\(.*?\)/g, '');          // (Westf.) entfernen
  s = s.replace(/\/.*/, '');              // /Westf entfernen
  s = s.replace(/\s+\S*\.\S*\.?\s*$/, ''); // i.W. o.ä. am Ende entfernen
  s = s.replace(/[?]/g, '').replace(/\b\d+\b/g, '').trim();
  return _placeFold(s);
}

// Gruppiert String-Orte aus collectPlaces() nach _placeStringCoreFold.
// Gibt [{ key, names:[…], counts:{name→personCount} }] mit ≥2 Mitgliedern zurück.
// Rein lesend — kein Zustand.
function findStringPlaceDuplicates() {
  if (typeof collectPlaces !== 'function') return [];
  const places = collectPlaces();
  const byKey = new Map();   // coreFold → [name, …]
  for (const [name, pl] of places) {
    const k = _placeStringCoreFold(name);
    if (!k) continue;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push({ name, count: pl.personIds.size });
  }
  const out = [];
  for (const [key, arr] of byKey) {
    if (arr.length < 2) continue;
    const counts = {};
    arr.forEach(e => { counts[e.name] = e.count; });
    out.push({ key, names: arr.map(e => e.name), counts });
  }
  return out;
}

// Ersetzt alle Vorkommen der loserNames durch winnerName in INDI/FAM-Events.
// Gibt { repointed } zurück. Invalidiert _placesCache.
function mergeStringPlaces(winnerName, loserNames) {
  if (!loserNames.length) return { repointed: 0 };
  // loserSet enthält getrimte Namen (aus collectPlaces-Keys); obj.place ist Roh-String
  const loserSet = new Set(loserNames);
  // Winner selbst auch in den Replace-Set damit abweichende Whitespace-Varianten
  // des Winners (z.B. " Ochtrup " statt "Ochtrup") ebenfalls auf winnerName normiert werden
  const allReplace = new Set([...loserNames, winnerName]);
  const ep  = AppState.db.extraPlaces || {};
  const pos = AppState.db.placeObjects;
  const loserNorms = loserNames.map(_normPlaceName);
  const loserNormSet = new Set(loserNorms);

  // Welche placeObject-IDs werden gleich gelöscht? Diese müssen wir ev.placeId-seitig
  // umhängen (oder, falls kein Winner-PO existiert, nullen) — sonst Leiche.
  // Subtilität: Winner-Name und Loser-Name können zur GLEICHEN _normPlaceName-Form
  // kollabieren (z.B. "Berlin" vs "Berlin "). Der Winner-PO muss daher zuerst
  // identifiziert und vom Lösch-Set ausgeschlossen werden.
  const losingIds = new Set();
  let winnerPoId = null;
  if (pos) {
    const winnerNorm = _normPlaceName(winnerName);
    // Pass 1: Winner-PO (exakter Titel bevorzugt vor normalisiertem Match)
    for (const [id, po] of Object.entries(pos)) {
      if (po.title === winnerName) { winnerPoId = id; break; }
    }
    if (!winnerPoId) {
      for (const [id, po] of Object.entries(pos)) {
        if (_normPlaceName(po.title) === winnerNorm) { winnerPoId = id; break; }
      }
    }
    // Pass 2: Verlierer (außer winnerPoId)
    for (const [id, po] of Object.entries(pos)) {
      if (id === winnerPoId) continue;
      if (id.startsWith('_ep_') && loserNormSet.has(_normPlaceName(po.title))) losingIds.add(id);
    }
  }

  let repointed = 0;
  const _fix = obj => {
    if (!obj) return;
    if (obj.place != null) {
      const trimmed = String(obj.place).trim();
      if (loserSet.has(trimmed)) { obj.place = winnerName; repointed++; }
      else if (trimmed !== obj.place && allReplace.has(trimmed)) { obj.place = trimmed; } // Whitespace normieren
    }
    // ev.placeId mit-repointen (Bug B2): zeigt der Event auf ein gleich gelöschtes
    // Verlierer-placeObject, dann auf Winner umhängen — oder, falls Winner keinen
    // placeObject-Eintrag hat, auf null setzen (sonst Leiche → Render-Fehler).
    if (obj.placeId && losingIds.has(obj.placeId)) {
      obj.placeId = winnerPoId || null;
    }
  };
  for (const p of Object.values(AppState.db.individuals || {})) {
    _fix(p.birth); _fix(p.chr); _fix(p.death); _fix(p.buri);
    for (const ev of p.events || []) _fix(ev);
  }
  for (const f of Object.values(AppState.db.families || {})) {
    _fix(f.marr); _fix(f.engag); _fix(f.div); _fix(f.divf);
    for (const ev of f.events || []) _fix(ev);
  }

  // Koordinaten aus Verlierer-extraPlaces auf Winner übertragen BEVOR gelöscht wird (Bug #9)
  if (pos && winnerPoId && pos[winnerPoId] && pos[winnerPoId].lat == null) {
    for (const loser of loserNames) {
      const lep = ep[loser];
      if (lep?.lati != null) { pos[winnerPoId].lat = lep.lati; pos[winnerPoId].long = lep.long; break; }
    }
  }

  // extraPlaces-Einträge der Verlierer entfernen
  for (const loser of loserNames) delete ep[loser];

  // _ep_-generierte placeObjects der Verlierer entfernen (Bug #9)
  if (pos) {
    for (const id of losingIds) delete pos[id];
  }

  UIState._placesCache  = null;
  UIState._placeRegistry = null; // Bug #2: Registry nach placeObjects-Änderung invalidieren
  return { repointed };
}

// Parst Koordinaten-Eingabe — unterstützt:
//   Apple Maps (deutsch): "52,22779° N, 7,17310° O" → ganzer String ins erste Feld
//   Dezimalgrad:          "52.2073" / "52,2073"
//   GEDCOM:               "N52.2073"
// Gibt { lat, lon } zurück (beide können NaN sein bei ungültiger Eingabe).
function parseCoordInput(firstField, secondField) {
  const s = (firstField || '').trim();
  // Vollständiges Paar: <zahl>°<dir> <zahl>°<dir>
  // O = Ost (DE), E = East, W = West, N/S wie üblich
  const m = /^([\d.,]+)\s*°?\s*([NSns])\s*[,;\s]+\s*([\d.,]+)\s*°?\s*([OoEeWw])/.exec(s);
  if (m) {
    let lat = parseFloat(m[1].replace(/,/g, '.'));
    let lon = parseFloat(m[3].replace(/,/g, '.'));
    if (m[2].toUpperCase() === 'S') lat = -lat;
    if (m[4].toUpperCase() === 'W') lon = -lon;
    return { lat: Math.abs(lat) <= 90 ? lat : NaN, lon: Math.abs(lon) <= 180 ? lon : NaN };
  }
  // Einzelfelder — GEDCOM-Format (N52.2073) oder Dezimalgrad
  const _one = v => {
    const t = (v || '').trim();
    const g = /^([NSns])\s*([\d.,]+)$/.exec(t);
    if (g) return (g[1].toUpperCase() === 'S' ? -1 : 1) * parseFloat(g[2].replace(',', '.'));
    return parseFloat(t.replace(',', '.'));
  };
  const lat = _one(firstField), lon = _one(secondField);
  return { lat: Math.abs(lat) <= 90 ? lat : NaN, lon: Math.abs(lon) <= 180 ? lon : NaN };
}

function getPlaceFromForm(placeId) {
  if ((UIState._placeModes[placeId] || 'free') === 'parts') return joinPlaceParts(placeId);
  return (document.getElementById(placeId)?.value || '').trim();
}

function initPlaceMode(placeId) {
  const freeEl    = document.getElementById(`${placeId}-free`);
  const partsEl   = document.getElementById(`${placeId}-parts`);
  const toggleBtn = document.getElementById(`${placeId}-toggle`);
  if (freeEl)    freeEl.hidden  = false;
  if (partsEl)   partsEl.hidden = true;
  if (toggleBtn) toggleBtn.textContent = '⊞ Felder';
  UIState._placeModes[placeId] = 'free';
}

function togglePlaceMode(placeId) {
  const freeEl    = document.getElementById(`${placeId}-free`);
  const partsEl   = document.getElementById(`${placeId}-parts`);
  const toggleBtn = document.getElementById(`${placeId}-toggle`);
  if ((UIState._placeModes[placeId] || 'free') === 'free') {
    const rawVal = (document.getElementById(placeId)?.value || '').trim();
    _buildPlaceParts(placeId, partsEl);
    fillPlaceParts(placeId, rawVal);
    freeEl.hidden  = true;
    partsEl.hidden = false;
    if (toggleBtn) toggleBtn.textContent = '⊠ Freitext';
    UIState._placeModes[placeId] = 'parts';
  } else {
    const rawVal = joinPlaceParts(placeId, true); // alle Slots erhalten (Langdarstellung)
    freeEl.hidden  = false;
    partsEl.hidden = true;
    if (toggleBtn) toggleBtn.textContent = '⊞ Felder';
    const inp = document.getElementById(placeId);
    if (inp) inp.value = rawVal;
    UIState._placeModes[placeId] = 'free';
  }
}


function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// Place-Autocomplete für alle Ort-Eingabefelder.
// Im GRAMPS-Modus (db.placeObjects vorhanden) werden strukturierte Orte angeboten
// und placeIdFieldId mit der passenden ID befüllt; im GEDCOM-Modus nur Freitext-Vorschläge.
// placeIdFieldId kann null sein (kein placeId-Tracking).
function initPlaceAutocomplete(placeInputId, ddId, placeIdFieldId) {
  const input = document.getElementById(placeInputId);
  const dd    = document.getElementById(ddId);
  if (!input || !dd) return;

  const _run = debounce(() => {
    const q  = input.value.toLowerCase().trim();
    dd.innerHTML = '';
    if (!q) { dd.style.display = 'none'; return; }

    const po       = AppState.db?.placeObjects;
    const isGramps = po && Object.keys(po).length > 0;
    let items;

    if (isGramps) {
      items = Object.values(po)
        .filter(p => p.title.toLowerCase().includes(q))
        .sort((a, b) => a.title.localeCompare(b.title, 'de'))
        .slice(0, 15);
    } else {
      items = [...collectPlaces().values()]
        .filter(p => p.name.toLowerCase().includes(q))
        .sort((a, b) => a.name.localeCompare(b.name, 'de'))
        .slice(0, 15);
    }
    if (!items.length) { dd.style.display = 'none'; return; }

    const idField = placeIdFieldId ? document.getElementById(placeIdFieldId) : null;
    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'place-dropdown-item';
      if (isGramps) {
        el.textContent = item.title;
        if (item.type && item.type !== 'Unknown') {
          const badge = document.createElement('span');
          badge.className = 'ac-meta';
          badge.textContent = ' · ' + item.type;
          el.appendChild(badge);
        }
        el.addEventListener('mousedown', () => {
          input.value = item.title;
          if (idField) idField.value = item.id;
          dd.innerHTML = ''; dd.style.display = 'none';
        });
      } else {
        el.textContent = item.name;
        el.addEventListener('mousedown', () => {
          input.value = item.name;
          if (idField) idField.value = '';
          dd.innerHTML = ''; dd.style.display = 'none';
        });
      }
      dd.appendChild(el);
    });
    dd.style.display = 'block';
  }, 150);

  input.addEventListener('input', () => {
    if (!input.value.trim()) { dd.innerHTML = ''; dd.style.display = 'none'; return; }
    _run();
  });
  input.addEventListener('blur',  () => setTimeout(() => { dd.style.display = 'none'; }, 150));
  input.addEventListener('focus', () => { if (dd.children.length) dd.style.display = 'block'; });
}

// ─────────────────────────────────────
//  F4b — Citation-Datenmodell
// ─────────────────────────────────────

// Factory für ein einzelnes Citation-Objekt (neues Datenmodell)
function citationObj(sid = '', page = '', quay = '', note = null, extra = [], media = []) {
  return { sid, page, quay, note, extra: [...extra], media: [...media], eval: null };
}

// ─── RES-EVAL (ADR-022): 3-Achsen-Evidenzmodell pro Zitat ──────────────────────
// Speicherung als _-Tag-Subtree unter SOUR (_EVAL/_STYP/_INFO/_EVID/_INFM),
// vom Parser modelliert herausgelöst (kein Doppel-Schreiben, vgl. _REPO_MODELLED, T0-TEST-2).
const EVAL_AXES = {
  srcType:  { tag: '_STYP', label: 'Quellentyp',  hint: 'Originalität',
    values: [['original', 'Original'], ['derivative', 'Abschrift/Transkript'], ['authored', 'Autorenwerk']] },
  infoQual: { tag: '_INFO', label: 'Information',  hint: 'Nähe zum Ereignis',
    values: [['primary', 'primär'], ['secondary', 'sekundär'], ['undetermined', 'unbestimmt']] },
  evidence: { tag: '_EVID', label: 'Evidenz',      hint: 'zur Aussage',
    values: [['direct', 'direkt'], ['indirect', 'indirekt'], ['negative', 'negativ']] },
};

function _newEval() { return { srcType: '', infoQual: '', evidence: '', informant: '' }; }

function evalIsEmpty(e) {
  return !e || (!e.srcType && !e.infoQual && !e.evidence && !e.informant);
}

// Abgeleiteter QUAY-Vorschlag (0–3) aus dem Evidenzmodell, an die GEDCOM-QUAY-
// Semantik angelehnt. Nur Vorschlag — QUAY bleibt unabhängig editierbar.
// '' = keine Aussage möglich.
function _evalToQuay(e) {
  if (evalIsEmpty(e)) return '';
  // 3 = direkte Primärevidenz: Original + primär (sofern nicht indirekt/negativ)
  if (e.srcType === 'original' && e.infoQual === 'primary'
      && e.evidence !== 'indirect' && e.evidence !== 'negative') return '3';
  // 0 = Negativ-Evidenz (Abwesenheit)
  if (e.evidence === 'negative') return '0';
  // 1 = schwach: Autorenwerk / unbestimmte Information / indirekte Evidenz
  if (e.srcType === 'authored' || e.infoQual === 'undetermined' || e.evidence === 'indirect') return '1';
  // 2 = dazwischen (Abschrift, sekundär, primär ohne Original …)
  return '2';
}

// ─── RES-HYPO (ADR-023): Hypothesen-System (leichte Variante) ──────────────────
// Statusbehaftete Annotation (offen/verworfen/bestätigt) an Person/Familie, mit
// Forscher-Konfidenz (weight) + Evidenz-Verknüpfung (SID-Ref, kein eigener
// Zitatkörper). Bewusst KEIN Alternativ-Baum / Zwei-Schichten-Modell.
// Speicherung als _HYPO-Subtree (modelliert herausgelöst, vgl. _REPO_MODELLED).
const HYPO_STATUSES = [
  ['open',      'offen'],
  ['confirmed', 'bestätigt'],
  ['rejected',  'verworfen'],
];
// weight = Forscher-Konfidenz in die Hypothese (NICHT Quellqualität/QUAY/eval, ADR-022)
const HYPO_WEIGHTS = [
  ['low',    'gering'],
  ['medium', 'mittel'],
  ['high',   'hoch'],
];

function _newHypo() {
  return { id: '', text: '', status: 'open', weight: '', rationale: '',
           conclusion: '', evidence: [], created: '' };
}

// Status lesen — migriert Bestands-Hypothesen ohne status auf 'open'
function _hypoStatus(h) {
  if (h && (h.status === 'open' || h.status === 'confirmed' || h.status === 'rejected')) return h.status;
  return 'open';
}

function hypoIsEmpty(h) {
  return !h || (!h.text && !h.rationale && !h.conclusion
    && (!Array.isArray(h.evidence) || h.evidence.length === 0));
}

function _hypoStatusLabel(s) {
  const f = HYPO_STATUSES.find(x => x[0] === s); return f ? f[1] : s;
}
function _hypoWeightLabel(w) {
  const f = HYPO_WEIGHTS.find(x => x[0] === w); return f ? f[1] : w;
}

// Konvertiert Altformat (sources[]+sourcePages{}+...) in-place zu citations[]
// Idempotent: kein sources[] vorhanden → nichts tun
function _migrateLegacyCitations(obj) {
  if (!Array.isArray(obj.sources)) return;
  obj.citations = obj.sources.map(sid => citationObj(
    sid,
    obj.sourcePages?.[sid]  ?? '',
    obj.sourceQUAY?.[sid]   ?? '',
    obj.sourceNote?.[sid]   ?? null,   // null = kein NOTE-Tag vorhanden
    obj.sourceExtra?.[sid]  ?? [],
    obj.sourceMedia?.[sid]  ?? []
  ));
  delete obj.sources;
  delete obj.sourcePages;
  delete obj.sourceQUAY;
  delete obj.sourceNote;
  delete obj.sourceExtra;
  delete obj.sourceMedia;
}

// ─────────────────────────────────────
//  PAGE→Media/Note-Migration (Deeplink aus PAGE lösen)
// ─────────────────────────────────────
// Hintergrund: Früher landeten Fundstellen-URLs (z.B. Matrikula-Scan) im
// citation.page-Feld. Korrekter GEDCOM-Träger ist OBJE/FILE (Digitalisat) bzw.
// NOTE. Diese Migration verschiebt URLs aus page → media[] (Default) oder note,
// und lässt den menschenlesbaren Lokator ("fol. 12r") in page stehen.

// Rein + testbar: trennt URL(s) vom Lokator-Text.
// → { page: <Rest ohne URL>, urls: [<bereinigte URLs>] }
function _splitPageUrl(page) {
  const s = String(page == null ? '' : page);
  const re = /\bhttps?:\/\/[^\s]+/g;
  const found = s.match(re);
  if (!found) return { page: s, urls: [] };
  const urls = found.map(u => u.replace(/[).,;]+$/, ''));   // angehängte Satzzeichen weg
  const rest = s.replace(re, ' ')
                .replace(/\s{2,}/g, ' ')
                .replace(/^[\s,;–-]+/, '')
                .replace(/[\s,;–-]+$/, '')
                .trim();
  return { page: rest, urls };
}

// Besucht jedes Citation-Objekt im db-Graphen (host-unabhängig: birth/death/…,
// events[], marr/engag, nameCitations, extraNames, childRelations, associations).
// Citation = Objekt mit string `page` + `sid` + array `media`.
function _forEachCitation(root, fn) {
  const seen = new Set();
  (function walk(node) {
    if (!node || typeof node !== 'object' || seen.has(node) || node instanceof Set) return;
    seen.add(node);
    if (Array.isArray(node)) { for (const v of node) walk(v); return; }
    if (typeof node.page === 'string' && 'sid' in node && Array.isArray(node.media)) fn(node);
    for (const k in node) {
      if (!Object.prototype.hasOwnProperty.call(node, k)) continue;
      const v = node[k];
      if (v && typeof v === 'object') walk(v);
    }
  })(root);
}

// Verschiebt URLs aus allen citation.page → media[] (Default) oder note.
// opts: { target:'media'|'note', titl }. Idempotent. Gibt Report (für Vorschau).
function migratePageUrls(db, opts = {}) {
  const target = opts.target === 'note' ? 'note' : 'media';
  const report = { scanned: 0, migrated: 0, urls: 0, samples: [] };
  if (!db) return report;
  _forEachCitation(db, c => {
    report.scanned++;
    const { page, urls } = _splitPageUrl(c.page);
    if (!urls.length) return;
    const before = c.page;
    c.page = page;
    if (target === 'note') {
      const add = urls.join('\n');
      c.note = c.note ? (c.note + '\n' + add) : add;
    } else {
      if (!Array.isArray(c.media)) c.media = [];
      for (const u of urls) {
        if (c.media.some(m => m && m.file === u)) continue;   // idempotent
        c.media.push({ file: u, titl: opts.titl || '', _extra: [] });
      }
    }
    report.migrated++;
    report.urls += urls.length;
    if (report.samples.length < 5) report.samples.push({ before, after: c.page, urls });
  });
  return report;
}

// ─────────────────────────────────────
//  sourceRefs-Rebuild (nach Event-Saves)
// ─────────────────────────────────────

function _addCitRefs(refs, obj) {
  if (!obj) return;
  if (obj.citations) {
    obj.citations.forEach(c => { if (c.sid?.startsWith('@')) refs.add(c.sid); });
  } else if (obj.sources) {
    obj.sources.forEach(s => { if (typeof s === 'string' && s.startsWith('@')) refs.add(s); });
  }
}

function _rebuildPersonSourceRefs(p) {
  if (!p) return;
  const refs = new Set();
  const addArr = arr => (arr || []).forEach(s => { if (typeof s === 'string' && s.startsWith('@')) refs.add(s); });
  addArr(p.topSources);
  addArr(p.nameSources);
  _addCitRefs(refs, p.birth);
  _addCitRefs(refs, p.death);
  _addCitRefs(refs, p.chr);
  _addCitRefs(refs, p.buri);
  (p.events || []).forEach(ev => _addCitRefs(refs, ev));
  (p.famc   || []).forEach(fc => _addCitRefs(refs, fc));
  p.sourceRefs = refs;
}

function _rebuildFamilySourceRefs(f) {
  if (!f) return;
  const refs = new Set();
  _addCitRefs(refs, f.marr);
  _addCitRefs(refs, f.engag);
  _addCitRefs(refs, f.div);
  _addCitRefs(refs, f.divf);
  (f.events || []).forEach(ev => _addCitRefs(refs, ev));
  f.sourceRefs = refs;
}

// Sortierkey für GEDCOM-Datumsstrings → 'YYYYMMDD' (undatiert → '99999999')
function evDateKey(d) {
  if (!d) return '99999999';
  const mo = {JAN:'01',FEB:'02',MAR:'03',APR:'04',MAY:'05',JUN:'06',JUL:'07',AUG:'08',SEP:'09',OCT:'10',NOV:'11',DEC:'12'};
  const yr    = (d.match(/\b(\d{4})\b/) || [])[1] || '9999';
  const mStr  = (d.match(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/) || [])[1];
  const dyStr = (d.match(/\b(\d{1,2})\b(?=\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC))/) || [])[1];
  return yr + (mStr ? mo[mStr] : '00') + (dyStr ? dyStr.padStart(2,'0') : '00');
}

// ─────────────────────────────────────
//  DOMAIN-LOGIK: HOF-INDEX
// ─────────────────────────────────────

// Aggregiert RESI- und PROP-Ereignisse nach Adresse → Map<addr, {addr, entries[], propEntries[]}>
// Cache in UIState._hofCache; wird von markChanged() geleert.
function buildHofIndex() {
  if (UIState._hofCache) return UIState._hofCache;
  const hoefe = new Map(); // addr → { addr, place, entries: [{pid, name, date, dateKey}], propEntries: [{pid, name, date, dateKey, desc}] }
  for (const p of Object.values(AppState.db.individuals)) {
    for (const ev of (p.events || [])) {
      if (ev.type === 'RESI' && ev.addr && ev.addr.trim()) {
        const addr = ev.addr.trim();
        if (!hoefe.has(addr)) hoefe.set(addr, { addr, place: '', entries: [], propEntries: [] });
        const hof = hoefe.get(addr);
        if (!hof.propEntries) hof.propEntries = [];
        // Ersten nicht-leeren Ort aus RESI-Events übernehmen
        if (!hof.place && ev.place) hof.place = ev.place.trim();
        hof.entries.push({
          pid:     p.id,
          name:    p.name || p.id,
          date:    ev.date || '',
          dateKey: evDateKey(ev.date || ''),
        });
      }
      if (ev.type === 'PROP' && ev.addr && ev.addr.trim()) {
        const addr = ev.addr.trim();
        if (!hoefe.has(addr)) hoefe.set(addr, { addr, place: '', entries: [], propEntries: [] });
        const hof = hoefe.get(addr);
        if (!hof.propEntries) hof.propEntries = [];
        if (!hof.place && ev.place) hof.place = ev.place.trim();
        hof.propEntries.push({
          pid:     p.id,
          name:    p.name || p.id,
          date:    ev.date || '',
          dateKey: evDateKey(ev.date || ''),
          desc:    ev.value || '',
        });
      }
    }
  }
  for (const hof of hoefe.values()) {
    hof.entries.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    (hof.propEntries || []).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }
  UIState._hofCache = hoefe;
  return hoefe;
}

// ─────────────────────────────────────
//  DOMAIN-LOGIK: DUPLIKAT-SCORING
// ─────────────────────────────────────

// Normiert Namen für Ähnlichkeitsvergleich (Kleinbuchstaben, Umlaute, Whitespace)
function _dedupNormName(str) {
  if (!str) return '';
  return str.toLowerCase().trim()
    .replace(/,/g, ' ')
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ');
}

// Levenshtein-Ähnlichkeit 0..1 (1 = identisch)
function _dedupLevenshtein(a, b) {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  if (a === b) return 1;
  const la = a.length, lb = b.length;
  if (Math.max(la, lb) === 0) return 1;
  const dp = Array.from({ length: la + 1 }, (_, i) => [i]);
  for (let j = 0; j <= lb; j++) dp[0][j] = j;
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return 1 - dp[la][lb] / Math.max(la, lb);
}

// Extrahiert Geburtsjahr aus GEDCOM-Datumsstring
function _dedupYearFromGed(dateStr) {
  if (!dateStr) return null;
  const { date1 } = parseGedDate(dateStr);
  const iso = gedDatePartToISO(date1 || dateStr);
  const y = parseInt((iso || '').split('-')[0]);
  return isNaN(y) ? null : y;
}

// Berechnet Ähnlichkeits-Score zwischen zwei Personen (0..100)
// Gibt { score, reasons[] } zurück
// Gewichte: Nachname ×24 + Vorname ×20 + Sex ±11/−15 + Geburtsjahr max 16 +
//           Geburtsort ×7 + Vater max 7 + Mutter max 7 + Partner max 8 = 100
function _dedupScorePair(pA, pB) {
  const reasons = [];
  let score = 0;

  // Nachname (max 24) — Doppelnamen (Bindestrich/Leerzeichen) komponentenweise vergleichen
  const snA = _dedupNormName(pA.surname || '');
  const snB = _dedupNormName(pB.surname || '');
  if (snA && snB) {
    const partsA = snA.split(/[-\s]+/).filter(Boolean);
    const partsB = snB.split(/[-\s]+/).filter(Boolean);
    let bestR = _dedupLevenshtein(snA, snB);
    for (const a of partsA) for (const b of partsB) {
      const r = _dedupLevenshtein(a, b);
      if (r > bestR) bestR = r;
    }
    score += bestR * 24;
    if (bestR >= 0.9) reasons.push('Nachname identisch');
    else if (bestR >= 0.7) reasons.push('Nachname ähnlich');
  }

  // Vorname (max 20)
  const gnA = _dedupNormName(pA.given || '');
  const gnB = _dedupNormName(pB.given || '');
  if (gnA && gnB) {
    const r = _dedupLevenshtein(gnA, gnB);
    score += r * 20;
    if (r >= 0.9) reasons.push('Vorname identisch');
    else if (r >= 0.7) reasons.push('Vorname ähnlich');
  }

  // Geschlecht (max +11, Malus −15)
  if (pA.sex !== 'U' && pB.sex !== 'U') {
    if (pA.sex === pB.sex) { score += 11; }
    else { score -= 15; reasons.push('Geschlecht verschieden'); }
  }

  // Geburtsjahr (max 16)
  const yA = _dedupYearFromGed(pA.birth?.date);
  const yB = _dedupYearFromGed(pB.birth?.date);
  if (yA && yB) {
    const diff = Math.abs(yA - yB);
    if      (diff === 0) { score += 16; reasons.push('Geburtsjahr identisch'); }
    else if (diff <= 1)  { score += 12; reasons.push('Geburtsjahr ±1'); }
    else if (diff <= 2)  { score +=  6; }
    else if (diff <= 5)  { score +=  2; }
  } else {
    score += 4; // neutral wenn kein Datum bekannt
  }

  // Geburtsort (max 7)
  const plA = compactPlace(pA.birth?.place || '').toLowerCase().slice(0, 40);
  const plB = compactPlace(pB.birth?.place || '').toLowerCase().slice(0, 40);
  if (plA && plB) {
    const r = _dedupLevenshtein(plA, plB);
    score += r * 7;
    if (r >= 0.9) reasons.push('Geburtsort identisch');
    else if (r >= 0.7) reasons.push('Geburtsort ähnlich');
  }

  // Eltern (max +14: Vater max 7 + Mutter max 7)
  const db = AppState.db;
  if (db) {
    const famcIdA = pA.famc?.[0]?.famId;
    const famcIdB = pB.famc?.[0]?.famId;
    if (famcIdA && famcIdB) {
      const fA = db.families[famcIdA];
      const fB = db.families[famcIdB];
      if (fA && fB) {
        // Vater (max 7)
        const vatA = fA.husb && db.individuals[fA.husb];
        const vatB = fB.husb && db.individuals[fB.husb];
        if (vatA && vatB) {
          const rSn = _dedupLevenshtein(_dedupNormName(vatA.surname || ''), _dedupNormName(vatB.surname || ''));
          const rGn = _dedupLevenshtein(_dedupNormName(vatA.given   || ''), _dedupNormName(vatB.given   || ''));
          score += rSn * 5 + rGn * 2;
          if (rSn >= 0.9 && rGn >= 0.85) reasons.push('Vater identisch');
          else if (rSn >= 0.75)           reasons.push('Vater ähnlich');
        }
        // Mutter (max 7)
        const mutA = fA.wife && db.individuals[fA.wife];
        const mutB = fB.wife && db.individuals[fB.wife];
        if (mutA && mutB) {
          const rSn = _dedupLevenshtein(_dedupNormName(mutA.surname || ''), _dedupNormName(mutB.surname || ''));
          const rGn = _dedupLevenshtein(_dedupNormName(mutA.given   || ''), _dedupNormName(mutB.given   || ''));
          score += rSn * 5 + rGn * 2;
          if (rSn >= 0.9 && rGn >= 0.85) reasons.push('Mutter identisch');
          else if (rSn >= 0.75)           reasons.push('Mutter ähnlich');
        }
      }
    }

    // Partner / Ehegatten (max +8, bestes Paar)
    const _spouseList = p => (p.fams || []).map(fid => {
      const f = db.families[fid];
      if (!f) return null;
      const sid = f.husb === p.id ? f.wife : f.husb;
      return sid ? db.individuals[sid] : null;
    }).filter(Boolean);

    const spousesA = _spouseList(pA);
    const spousesB = _spouseList(pB);
    if (spousesA.length && spousesB.length) {
      let bestPts = 0; let bestLabel = '';
      for (const sA of spousesA) {
        for (const sB of spousesB) {
          const rSn = _dedupLevenshtein(_dedupNormName(sA.surname || ''), _dedupNormName(sB.surname || ''));
          const rGn = _dedupLevenshtein(_dedupNormName(sA.given   || ''), _dedupNormName(sB.given   || ''));
          const pts = rSn * 5 + rGn * 3;
          if (pts > bestPts) {
            bestPts   = pts;
            bestLabel = (rSn >= 0.9 && rGn >= 0.85) ? 'Partner identisch'
                      : (rSn >= 0.75)                ? 'Partner ähnlich'
                      : '';
          }
        }
      }
      score += bestPts;
      if (bestLabel) reasons.push(bestLabel);
    }
  }

  return { score: Math.round(score), reasons };
}

// Paarweise Duplikatsuche mit Nachname-Bucketing (O(n·k²) statt O(n²))
// Gibt sortierte Liste [{pA, pB, score, reasons}] zurück
function findDuplicatePairs(threshold) {
  threshold = threshold || 65;
  const persons = Object.values(AppState.db.individuals);
  const results = [];

  const buckets = {};
  for (const p of persons) {
    const key = _dedupNormName(p.surname || p.name || '').slice(0, 3) || '___';
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(p);
  }

  for (const bucket of Object.values(buckets)) {
    for (let i = 0; i < bucket.length - 1; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        const pA = bucket[i], pB = bucket[j];
        const { score, reasons } = _dedupScorePair(pA, pB);
        if (score >= threshold) results.push({ pA, pB, score, reasons });
      }
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

// ─────────────────────────────────────
//  HTML-UTILS
// ─────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
