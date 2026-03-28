// ─────────────────────────────────────
//  STATE
// ─────────────────────────────────────
let db = { individuals: {}, families: {}, sources: {}, extraPlaces: {}, repositories: {}, notes: {}, placForm: '', extraRecords: [], headLines: [] };
let changed = false;
let _placesCache = null;  // Cache für collectPlaces(); wird in markChanged() geleert
let _originalGedText = null;   // Fallback wenn localStorage-Backup fehlschlägt; sonst null
let _fileHandle = null;        // FileSystemFileHandle von showOpenFilePicker (Chrome Desktop)
let _canDirectSave = false;    // true wenn createWritable() auf _fileHandle funktioniert
let currentPersonId = null;
let currentFamilyId = null;
let currentSourceId = null;
let currentTab = 'persons';
let idCounter = 1000;

// ─── Navigations-History ────────────────
// Ermöglicht "Zurück" durch verschachtelte Detail-Ansichten
const _navHistory = [];       // Stack von {type, id|name}

// ─── Beziehungs-Picker ──────────────────
let _relMode     = '';    // 'spouse' | 'child' | 'parent'
let _relAnchorId = '';    // personId (spouse/parent) oder famId (child)
let _pendingRelation = null; // { mode, anchorId } — gesetzt vor showPersonForm()
let currentRepoId    = null;
let _pendingRepoLink = null; // { sourceId } — gesetzt vor showRepoForm(null)
let _pendingPhotoBase64 = undefined; // undefined=keine Änderung, null=löschen, string=neues Foto (Sprint P3-2)
let _pendingFamPhotoB64 = undefined; // analog für Familie
let _pendingSrcPhotoB64 = undefined; // analog für Quelle
let _detailActive = false;           // true wenn v-detail echten Inhalt zeigt (P3-7)
const _newPhotoIds     = new Set(); // Personen mit manuell hinzugefügtem Foto (kein OBJE im Original-GEDCOM)
const _deletedPhotoIds = new Set(); // Personen deren Foto gelöscht wurde (OBJE aus Passthrough entfernen)
let _treeScale = 1;                  // Zoom-Faktor Sanduhr-Ansicht (Sprint P3-5)
let _treeHistory    = [];            // Navigations-History im Baumbaum
let _treeHistoryPos = -1;
const _activeSpouseMap = {};         // personId → aktiver Ehepartner-Index im Stapel

// Liefert den Original-GEDCOM-Text (erste geladene Version).
// Bevorzugt _originalGedText (RAM, immer aktuell für aktive Session);
// localStorage-Backup als Fallback nach Reload (wenn RAM verloren, aber Storage erhalten).
function _getOriginalText() {
  return _originalGedText || localStorage.getItem('stammbaum_ged_backup') || null;
}

function nextId(prefix) {
  idCounter++;
  return `@${prefix}${idCounter}@`;
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
//  GEDCOM PARSER  (v3 – geo fixed)
// ─────────────────────────────────────
function parseGEDCOM(text) {
  text = text.replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/);

  // Pre-scan: extract PLAC.FORM from HEAD (unique: "1 PLAC\n2 FORM ...")
  let placForm = 'Dorf, Stadt, PLZ, Landkreis, Bundesland, Staat';
  { const mPF = text.match(/^1 PLAC\s*[\r\n]+\s*2 FORM (.+)$/m); if (mPF) placForm = mPF[1].trim(); }

  const individuals = {}, families = {}, sources = {}, notes = {}, repositories = {};
  const _extraRecords = [];  // verbatim passthrough for unknown lv=0 records (SUBM etc.)
  const _headLines = [];     // HEAD verbatim (restored in writer for roundtrip fidelity)
  let cur = null, curType = null;
  // Simple flat context tracking
  let lv1tag = '';   // current level-1 tag
  let lv2tag = '';   // current level-2 tag
  let lv3tag = '';   // current level-3 tag
  let evIdx  = -1;   // current event index in cur.events
  let inMap  = false; // are we inside a MAP block?
  let mapParent = ''; // which lv1 tag owns current MAP (BIRT/DEAT/etc.)
  let lastSourVal = ''; // last seen 2 SOUR @id@ value (for 3 PAGE lookup)
  let _curNoteIsInline = false; // true when 1 NOTE was inline (not a @ref@)
  let _curExtraNameIdx = -1;   // index into cur.extraNames when parsing 2nd+ NAME
  let _ptDepth = 0;  // verbatim-passthrough depth (0 = off)
  let _ptTarget = null; // redirect capture target (null = cur._passthrough)

  for (let raw of lines) {
    // raw.trim() würde trailing Spaces aus CONT/CONC-Werten entfernen → CONC-Split-Verschiebung
    // Nur \r am Ende entfernen (Windows CRLF), führende Spaces gibt es in GEDCOM nicht
    const line = raw.replace(/\r$/, '');
    if (!line.trim()) continue;
    const m = line.match(/^(\d+)\s+(\S+)(.*)?$/);
    if (!m) continue;
    const lv  = parseInt(m[1]);
    const tag = m[2].trim();
    const val = (m[3] || '').replace(/^ /, ''); // remove 1 leading space (GEDCOM delimiter)

    // ── Level 0 ──
    if (lv === 0) {
      lv1tag = lv2tag = lv3tag = '';
      evIdx = -1; inMap = false; mapParent = ''; _ptDepth = 0;
      if (tag.startsWith('@') && val.trim() === 'INDI') {
        cur = {
          id: tag, _passthrough: [], _nameParsed: false,
          name:'', nameRaw:'', surname:'', given:'', prefix:'', suffix:'',
          sex:'U', uid:'', topSources:[],
          birth:{ date:null, place:null, lati:null, long:null, sources:[], sourcePages:{}, sourceQUAY:{}, sourceExtra:{}, _extra:[], value:'', seen:false },
          death:{ date:null, place:null, lati:null, long:null, sources:[], sourcePages:{}, sourceQUAY:{}, sourceExtra:{}, _extra:[], cause:'', value:'', seen:false },
          chr:{ date:null, place:null, lati:null, long:null, sources:[], sourcePages:{}, sourceQUAY:{}, sourceExtra:{}, _extra:[], value:'', seen:false },
          buri:{ date:null, place:null, lati:null, long:null, sources:[], sourcePages:{}, sourceQUAY:{}, sourceExtra:{}, _extra:[], value:'', seen:false },
          events:[], famc:[], fams:[],
          noteRefs:[], noteTexts:[], noteText:'', noteTextInline:'',
          extraNames:[],
          media:[], titl:'', reli:'', resn:'', email:'', www:'', lastChanged:'', lastChangedTime:'',
          nameSources:[], nameSourcePages:{}, nameSourceQUAY:{}, nameSourceExtra:{},
          topSourcePages:{}, topSourceQUAY:{}, topSourceExtra:{}, sourceRefs: new Set()
        };
        individuals[tag] = cur; curType = 'INDI';
      } else if (tag.startsWith('@') && val.trim() === 'FAM') {
        cur = { id:tag, _passthrough: [], husb:null, wife:null, children:[], childRelations:{}, _lastChil:null, marr:{date:null,place:null,lati:null,long:null,sources:[],sourcePages:{},sourceQUAY:{},sourceExtra:{},value:'',seen:false,addr:'',_extra:[]}, engag:{date:null,place:null,lati:null,long:null,sources:[],sourcePages:{},sourceQUAY:{},sourceExtra:{},value:'',seen:false,_extra:[]}, noteRefs:[], noteTexts:[], noteText:'', noteTextInline:'', sourceRefs: new Set(), media:[], lastChanged:'', lastChangedTime:'' };
        families[tag] = cur; curType = 'FAM';
      } else if (tag.startsWith('@') && val.trim() === 'SOUR') {
        cur = { id:tag, _passthrough: [], title:'', abbr:'', author:'', date:'', publ:'', repo:'', repoCallNum:'', text:'', media:[], lastChanged:'', lastChangedTime:'' };
        sources[tag] = cur; curType = 'SOUR';
      } else if (tag.startsWith('@') && /^NOTE\b/.test(val.trim())) {
        const _noteinit = val.trim().slice(4).trim(); // text after 'NOTE' on same line
        cur = { id:tag, text: _noteinit, _passthrough: [] };
        notes[tag] = cur; curType = 'NOTE';
      } else if (tag.startsWith('@') && val.trim() === 'REPO') {
        cur = { id:tag, name:'', addr:'', phon:'', www:'', email:'', lastChanged:'', lastChangedTime:'' };
        repositories[tag] = cur; curType = 'REPO';
      } else if (tag.startsWith('@')) {
        // Unknown @ID@ lv=0 record (e.g. SUBM) — store verbatim for roundtrip
        const recLine = '0 ' + tag + (val ? ' ' + val : '');
        cur = { _lines: [recLine] };
        _extraRecords.push(cur);
        curType = '_extra';
      } else if (tag === 'HEAD') {
        // HEAD verbatim — stored in _headLines for roundtrip fidelity
        _headLines.length = 0;
        _headLines.push('0 HEAD');
        cur = { _lines: _headLines };
        curType = 'HEAD';
      } else {
        // TRLR etc. — sentinel, skip
        curType = null; cur = null;
      }
      continue;
    }
    if (!cur) continue;

    // Unknown lv=0 record sub-lines — collect verbatim
    if (curType === '_extra') { cur._lines.push(lv + ' ' + tag + (val ? ' ' + val : '')); continue; }
    // HEAD sub-lines — collect verbatim
    if (curType === 'HEAD') { _headLines.push(lv + ' ' + tag + (val ? ' ' + val : '')); continue; }

    // Track context tags
    if (lv === 1) { lv1tag = tag; lv2tag = ''; lv3tag = ''; inMap = false; mapParent = ''; lastSourVal = ''; _curNoteIsInline = false; _curExtraNameIdx = -1; }
    if (lv === 2) { lv2tag = tag; lv3tag = ''; if (tag !== 'MAP') inMap = false; if (tag === 'SOUR') lastSourVal = val; }
    if (lv === 3) { lv3tag = tag; if (tag === 'MAP') { inMap = true; mapParent = lv1tag; } else { inMap = false; } if (tag === 'SOUR') lastSourVal = val; }

    // ── Verbatim Passthrough ──
    if (_ptDepth > 0) {
      if (lv > _ptDepth) {
        const _ptArr = _ptTarget || (cur && cur._passthrough);
        if (_ptArr) _ptArr.push(lv + ' ' + tag + (val ? ' ' + val : ''));
        continue;
      } else {
        _ptDepth = 0; _ptTarget = null; // lv <= _ptDepth: exit passthrough, process line normally
      }
    }

    // ── INDIVIDUAL ──
    if (curType === 'INDI') {

      if (lv === 1) {
        evIdx = -1;
        if (tag === 'NAME') {
          if (cur._nameParsed) {
            // Extra NAME entry (z.B. Geburtsname) → strukturiert in extraNames[]
            const sn2 = (val||'').match(/\/([^\/]*)\//) || [];
            const surn2 = sn2[1] ? sn2[1].trim() : '';
            const giv2  = (val||'').replace(/\/[^\/]*\//, '').trim();
            cur.extraNames.push({ nameRaw:val||'', given:giv2, surname:surn2, prefix:'', suffix:'', type:'', sources:[], sourcePages:{}, sourceQUAY:{}, sourceExtra:{}, _extra:[] });
            _curExtraNameIdx = cur.extraNames.length - 1;
          } else {
            cur._nameParsed = true;
            cur.nameRaw = val;
            const sn = val.match(/\/([^\/]*)\//) || [];
            cur.surname = sn[1] ? sn[1].trim() : '';
            cur.given   = val.replace(/\/[^\/]*\//, '').trim();
            cur.name    = (cur.given + (cur.surname ? ' ' + cur.surname : '')).trim() || val.replace(/\//g,'').trim();
          }
        }
        else if (tag === 'SEX')  cur.sex  = val;
        else if (tag === 'TITL') cur.titl = val;
        // RELI nicht mehr als einfaches Feld, sondern als Event (kann DATE/SOUR/TYPE-Kinder haben)
        else if (tag === 'FAMC') cur.famc.push({ famId:val, frel:'', mrel:'', frelSeen:false, mrelSeen:false, frelSour:'', frelPage:'', frelQUAY:'', frelSourExtra:[], mrelSour:'', mrelPage:'', mrelQUAY:'', mrelSourExtra:[], sourIds:[], sourPages:{}, sourQUAY:{}, sourExtra:{} });
        else if (tag === 'FAMS') cur.fams.push(val);
        else if (tag === 'NOTE') {
          if (!val.startsWith('@')) { cur.noteTexts.push(val); _curNoteIsInline = true; }
          else { cur.noteRefs.push(val); _curNoteIsInline = false; }
        }
        else if (tag === '_UID') cur.uid = val;
        else if (tag === 'SOUR' && val.startsWith('@')) { cur.topSources.push(val); cur.sourceRefs.add(val); lastSourVal = val; }
        // OBJE → fällt in else-Passthrough unten (vollständiger Block wird verbatim bewahrt)
        else if (tag === 'RESN')  cur.resn  = val;
        else if (tag === 'EMAIL') cur.email = val;
        else if (tag === 'WWW')   cur.www   = val;
        else if (tag === 'BIRT') { cur.birth.value = val; cur.birth.seen = true; }
        else if (tag === 'CHR')  { cur.chr.value   = val; cur.chr.seen   = true; }
        else if (tag === 'DEAT') { cur.death.value = val; cur.death.seen = true; }
        else if (tag === 'BURI') { cur.buri.value  = val; cur.buri.seen  = true; }
        else if (['OCCU','RESI','EDUC','EMIG','IMMI','NATU','EVEN','GRAD','ADOP','FACT','MILI','RELI',
                  'CENS','CONF','FCOM','ORDN','RETI','PROP','WILL','PROB'].includes(tag)) {
          cur.events.push({ type:tag, value:val, date:null, place:null, lati:null, long:null, eventType:'', note:'', addr:'', sources:[], sourcePages:{}, sourceQUAY:{}, sourceExtra:{}, media:[], _extra:[] });
          evIdx = cur.events.length - 1;
        }
        else if (tag === 'OBJE') {
          if (val && val.startsWith('@')) {
            cur._passthrough.push('1 OBJE ' + val); _ptDepth = 1;
          } else {
            cur.media.push({ file:'', title:'', form:'', titleIsLv2:false, _extra:[] });
          }
        }
        else if (tag === 'CHAN') { /* context-only, handled via lv2 */ }
        else {
          // Unknown lv1 tag → verbatim passthrough
          cur._passthrough.push('1 ' + tag + (val ? ' ' + val : ''));
          _ptDepth = 1;
        }
      }

      else if (lv === 2) {
        // Name parts
        if (lv1tag === 'NAME') {
          if (_curExtraNameIdx >= 0) {
            // Sub-tags für 2nd+ NAME-Eintrag
            const en = cur.extraNames[_curExtraNameIdx];
            if      (tag === 'TYPE') en.type   = val;
            else if (tag === 'GIVN') { en.given   = val; }
            else if (tag === 'SURN') { en.surname = val; }
            else if (tag === 'NPFX') en.prefix  = val;
            else if (tag === 'NSFX') en.suffix  = val;
            else if (tag === 'SOUR' && val.startsWith('@')) { en.sources.push(val); cur.sourceRefs.add(val); }
            else if (tag === 'CONC') en.nameRaw += val;
            else if (tag === 'CONT') en.nameRaw += '\n' + val;
            else { en._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth = 2; _ptTarget = en._extra; }
          } else {
            if      (tag === 'GIVN') { cur.given = val; cur.name = (cur.given + (cur.surname ? ' '+cur.surname : '')).trim(); }
            else if (tag === 'SURN') { cur.surname = val; cur.name = (cur.given + (cur.surname ? ' '+cur.surname : '')).trim(); }
            else if (tag === 'NPFX') cur.prefix = val;
            else if (tag === 'NSFX') cur.suffix = val;
            else if (tag === 'SOUR' && val.startsWith('@')) { cur.nameSources.push(val); cur.sourceRefs.add(val); }
            else if (tag === 'CONC') cur.nameRaw += val;
            else if (tag === 'CONT') cur.nameRaw += '\n' + val;
            else { cur._passthrough.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth = 2; }
          }
        }
        // Vital events
        else if (lv1tag === 'BIRT') {
          if      (tag==='DATE') cur.birth.date=val;
          else if (tag==='PLAC') cur.birth.place=val;
          else if (tag==='SOUR' && val.startsWith('@')) { cur.birth.sources.push(val); cur.sourceRefs.add(val); }
          else { cur.birth._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth=2; _ptTarget=cur.birth._extra; }
        }
        else if (lv1tag === 'DEAT') {
          if      (tag==='DATE') cur.death.date=val;
          else if (tag==='PLAC') cur.death.place=val;
          else if (tag==='CAUS') cur.death.cause=val;
          else if (tag==='SOUR' && val.startsWith('@')) { cur.death.sources.push(val); cur.sourceRefs.add(val); }
          else { cur.death._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth=2; _ptTarget=cur.death._extra; }
        }
        else if (lv1tag === 'CHR') {
          if      (tag==='DATE') cur.chr.date=val;
          else if (tag==='PLAC') cur.chr.place=val;
          else if (tag==='SOUR' && val.startsWith('@')) { cur.chr.sources.push(val); cur.sourceRefs.add(val); }
          else { cur.chr._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth=2; _ptTarget=cur.chr._extra; }
        }
        else if (lv1tag === 'BURI') {
          if      (tag==='DATE') cur.buri.date=val;
          else if (tag==='PLAC') cur.buri.place=val;
          else if (tag==='SOUR' && val.startsWith('@')) { cur.buri.sources.push(val); cur.sourceRefs.add(val); }
          else { cur.buri._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth=2; _ptTarget=cur.buri._extra; }
        }
        // Other events
        else if (evIdx >= 0 && cur.events[evIdx]) {
          const ev = cur.events[evIdx];
          if      (tag==='DATE')  ev.date = val;
          else if (tag==='PLAC')  ev.place = val;
          else if (tag==='TYPE')  ev.eventType = val;
          else if (tag==='NOTE')  ev.note += (ev.note ? '\n' : '') + val;
          else if (tag==='ADDR') { ev.addr = (ev.addr ? ev.addr + '\n' : '') + val; if (!ev.addrExtra) ev.addrExtra=[]; _ptDepth=2; _ptTarget=ev.addrExtra; }
          else if (tag==='CONC'||tag==='CONT') ev.value += (tag==='CONT'?'\n':'') + val;
          else if (tag==='SOUR' && val.startsWith('@')) { ev.sources.push(val); cur.sourceRefs.add(val); }
          else if (tag==='OBJE') {
            if (val && val.startsWith('@')) { ev._extra.push('2 OBJE ' + val); _ptDepth = 2; _ptTarget = ev._extra; }
            else ev.media.push({ file:'', title:'', form:'', _extra:[] });
          }
          else { ev._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth = 2; _ptTarget = ev._extra; }
        }
        // Family relationship
        if (lv1tag === 'FAMC' && cur.famc.length) {
          const fref = cur.famc[cur.famc.length-1];
          if (tag==='_FREL') { fref.frel = val; fref.frelSeen = true; }
          if (tag==='_MREL') { fref.mrel = val; fref.mrelSeen = true; }
          if (tag==='SOUR' && val.startsWith('@')) { fref.sourIds.push(val); cur.sourceRefs.add(val); }
        }
        // Media
        if (lv1tag === 'OBJE' && cur.media.length) {
          if (tag==='FILE')      cur.media[cur.media.length-1].file  = val;
          else if (tag==='TITL') { cur.media[cur.media.length-1].title = val; cur.media[cur.media.length-1].titleIsLv2 = true; }
          else { cur.media[cur.media.length-1]._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth=2; _ptTarget=cur.media[cur.media.length-1]._extra; }
        }
        // Last changed
        if (lv1tag === 'CHAN' && tag==='DATE') cur.lastChanged = val;
        // topSources PAGE/QUAY/extra (1 SOUR @Sxx@ → 2 PAGE / 2 QUAY / 2 OBJE …)
        if (lv1tag === 'SOUR' && lastSourVal) {
          if      (tag === 'PAGE') cur.topSourcePages[lastSourVal] = val;
          else if (tag === 'QUAY') cur.topSourceQUAY[lastSourVal] = val;
          else if (tag !== 'SOUR') {
            if (!cur.topSourceExtra[lastSourVal]) cur.topSourceExtra[lastSourVal] = [];
            cur.topSourceExtra[lastSourVal].push('2 ' + tag + (val ? ' ' + val : ''));
            _ptDepth = 2; _ptTarget = cur.topSourceExtra[lastSourVal];
          }
        }
        // Collect source references at level 2
        if (tag === 'SOUR' && val.startsWith('@')) cur.sourceRefs.add(val);
      }

      else if (lv === 3) {
        // Media title/form
        if (lv1tag === 'OBJE' && lv2tag === 'FILE' && tag === 'TITL' && cur.media.length)
          cur.media[cur.media.length-1].title = val;
        if (lv1tag === 'OBJE' && tag === 'TITL' && cur.media.length)
          cur.media[cur.media.length-1].title = val;
        if (lv1tag === 'OBJE' && lv2tag === 'FILE' && tag === 'FORM' && cur.media.length)
          cur.media[cur.media.length-1].form = val;
        // Event media (2 OBJE → 3 FILE/TITL/FORM)
        if (lv2tag === 'OBJE' && evIdx >= 0 && cur.events[evIdx]?.media?.length > 0) {
          const em = cur.events[evIdx].media[cur.events[evIdx].media.length - 1];
          if      (tag === 'FILE') em.file  = val;
          else if (tag === 'TITL') em.title = val;
          else if (tag === 'FORM') em.form  = val;
          else { em._extra.push('3 ' + tag + (val ? ' ' + val : '')); _ptDepth = 3; _ptTarget = em._extra; }
        }
        // Event note continuation
        if (evIdx >= 0 && lv2tag === 'NOTE' && (tag==='CONC'||tag==='CONT'))
          cur.events[evIdx].note += (tag==='CONT'?'\n':'') + val;
        // 3 PAGE under 2 SOUR — Seitenangabe für Quellenreferenz
        if (lv2tag === 'SOUR' && tag === 'PAGE' && lastSourVal.startsWith('@')) {
          if      (lv1tag === 'BIRT') { if (!cur.birth.sourcePages) cur.birth.sourcePages={}; cur.birth.sourcePages[lastSourVal] = val; }
          else if (lv1tag === 'DEAT') { if (!cur.death.sourcePages) cur.death.sourcePages={}; cur.death.sourcePages[lastSourVal] = val; }
          else if (lv1tag === 'CHR')  { if (!cur.chr.sourcePages)   cur.chr.sourcePages={};   cur.chr.sourcePages[lastSourVal]   = val; }
          else if (lv1tag === 'BURI') { if (!cur.buri.sourcePages)  cur.buri.sourcePages={};  cur.buri.sourcePages[lastSourVal]  = val; }
          else if (lv1tag === 'NAME') {
            if (_curExtraNameIdx >= 0 && cur.extraNames[_curExtraNameIdx])
              cur.extraNames[_curExtraNameIdx].sourcePages[lastSourVal] = val;
            else cur.nameSourcePages[lastSourVal] = val;
          }
          else if (lv1tag === 'FAMC' && cur.famc.length) cur.famc[cur.famc.length-1].sourPages[lastSourVal] = val;
          else if (evIdx >= 0 && cur.events[evIdx]) {
            if (!cur.events[evIdx].sourcePages) cur.events[evIdx].sourcePages = {};
            cur.events[evIdx].sourcePages[lastSourVal] = val;
          }
        }
        // 3 QUAY under 2 SOUR — Qualitätsbewertung der Quellenreferenz (0–3)
        if (lv2tag === 'SOUR' && tag === 'QUAY' && lastSourVal.startsWith('@')) {
          if      (lv1tag === 'BIRT') { if (!cur.birth.sourceQUAY) cur.birth.sourceQUAY={}; cur.birth.sourceQUAY[lastSourVal] = val; }
          else if (lv1tag === 'DEAT') { if (!cur.death.sourceQUAY) cur.death.sourceQUAY={}; cur.death.sourceQUAY[lastSourVal] = val; }
          else if (lv1tag === 'CHR')  { if (!cur.chr.sourceQUAY)   cur.chr.sourceQUAY={};   cur.chr.sourceQUAY[lastSourVal]   = val; }
          else if (lv1tag === 'BURI') { if (!cur.buri.sourceQUAY)  cur.buri.sourceQUAY={};  cur.buri.sourceQUAY[lastSourVal]  = val; }
          else if (lv1tag === 'NAME') {
            if (_curExtraNameIdx >= 0 && cur.extraNames[_curExtraNameIdx])
              cur.extraNames[_curExtraNameIdx].sourceQUAY[lastSourVal] = val;
            else cur.nameSourceQUAY[lastSourVal] = val;
          }
          else if (lv1tag === 'FAMC' && cur.famc.length) cur.famc[cur.famc.length-1].sourQUAY[lastSourVal] = val;
          else if (evIdx >= 0 && cur.events[evIdx]) {
            if (!cur.events[evIdx].sourceQUAY) cur.events[evIdx].sourceQUAY = {};
            cur.events[evIdx].sourceQUAY[lastSourVal] = val;
          }
        }
        // Unbekannte lv=3 Tags unter 2 SOUR in einem Event-Kontext → sourceExtra
        if (lv2tag === 'SOUR' && lastSourVal.startsWith('@') &&
            tag !== 'PAGE' && tag !== 'QUAY' && tag !== 'SOUR' && tag !== 'TIME') {
          let _seDict = null;
          if      (lv1tag === 'NAME') {
            if (_curExtraNameIdx >= 0 && cur.extraNames[_curExtraNameIdx])
              _seDict = cur.extraNames[_curExtraNameIdx].sourceExtra || (cur.extraNames[_curExtraNameIdx].sourceExtra = {});
            else _seDict = cur.nameSourceExtra;
          }
          else if (lv1tag === 'BIRT') _seDict = cur.birth.sourceExtra;
          else if (lv1tag === 'DEAT') _seDict = cur.death.sourceExtra;
          else if (lv1tag === 'CHR')  _seDict = cur.chr.sourceExtra;
          else if (lv1tag === 'BURI') _seDict = cur.buri.sourceExtra;
          else if (lv1tag === 'FAMC' && cur.famc.length) _seDict = cur.famc[cur.famc.length-1].sourExtra;
          else if (evIdx >= 0 && cur.events[evIdx]) _seDict = cur.events[evIdx].sourceExtra;
          if (_seDict !== null) {
            if (!_seDict[lastSourVal]) _seDict[lastSourVal] = [];
            _seDict[lastSourVal].push('3 ' + tag + (val ? ' ' + val : ''));
            _ptDepth = 3; _ptTarget = _seDict[lastSourVal];
          }
        }
        // 3 SOUR unter 2 _FREL/_MREL (in 1 FAMC Kontext)
        if (lv1tag === 'FAMC' && cur.famc.length && tag === 'SOUR') {
          const fref = cur.famc[cur.famc.length-1];
          if (lv2tag === '_FREL') {
            if (!fref.frelSour) fref.frelSour = val;
            else { if (!fref.frelSourExtra) fref.frelSourExtra = []; fref.frelSourExtra.push('3 SOUR ' + val); _ptDepth=3; _ptTarget=fref.frelSourExtra; }
          } else if (lv2tag === '_MREL') {
            if (!fref.mrelSour) fref.mrelSour = val;
            else { if (!fref.mrelSourExtra) fref.mrelSourExtra = []; fref.mrelSourExtra.push('3 SOUR ' + val); _ptDepth=3; _ptTarget=fref.mrelSourExtra; }
          }
        }
        // Collect source references at level 3
        if (tag === 'SOUR' && val.startsWith('@')) cur.sourceRefs.add(val);
        // CHAN.DATE.TIME (level 3)
        if (lv1tag === 'CHAN' && tag === 'TIME') cur.lastChangedTime = val;
      }

      else if (lv === 4) {
        // GEO: MAP is at lv3, so LATI/LONG are at lv4
        if (inMap) {
          const coord = parseGeoCoord(val);
          if (mapParent === 'BIRT') { if (tag==='LATI') cur.birth.lati=coord; if (tag==='LONG') cur.birth.long=coord; }
          else if (mapParent === 'DEAT') { if (tag==='LATI') cur.death.lati=coord; if (tag==='LONG') cur.death.long=coord; }
          else if (mapParent === 'CHR')  { if (tag==='LATI') cur.chr.lati=coord;   if (tag==='LONG') cur.chr.long=coord; }
          else if (mapParent === 'BURI') { if (tag==='LATI') cur.buri.lati=coord;  if (tag==='LONG') cur.buri.long=coord; }
          else if (evIdx >= 0 && cur.events[evIdx]) {
            if (tag==='LATI') cur.events[evIdx].lati = coord;
            if (tag==='LONG') cur.events[evIdx].long = coord;
          }
        }
        // Collect source references at level 4
        if (tag === 'SOUR' && val.startsWith('@')) cur.sourceRefs.add(val);
        // Person OBJE: lv=4 Sub-Tags (z.B. 4 TYPE PHOTO unter 3 FORM)
        if (lv1tag === 'OBJE' && cur.media.length) {
          cur.media[cur.media.length-1]._extra.push('4 ' + tag + (val ? ' ' + val : ''));
        }
        // Event OBJE: 4 FORM unter 3 FILE (lv=4 da OBJE bei lv=2)
        if (lv2tag === 'OBJE' && evIdx >= 0 && cur.events[evIdx]?.media?.length > 0) {
          const _em4 = cur.events[evIdx].media[cur.events[evIdx].media.length - 1];
          if (lv3tag === 'FILE' && tag === 'FORM') _em4.form = val;
          else _em4._extra.push('4 ' + tag + (val ? ' ' + val : ''));
        }
        // 4 PAGE/QUAY/extra unter 3 SOUR unter _FREL/_MREL
        if (lv1tag === 'FAMC' && lv3tag === 'SOUR' && cur.famc.length) {
          const fref = cur.famc[cur.famc.length-1];
          if (lv2tag === '_FREL') {
            if      (tag === 'PAGE') fref.frelPage = val;
            else if (tag === 'QUAY') fref.frelQUAY = val;
            else { fref.frelSourExtra.push('4 ' + tag + (val ? ' ' + val : '')); _ptDepth = 4; _ptTarget = fref.frelSourExtra; }
          } else if (lv2tag === '_MREL') {
            if      (tag === 'PAGE') fref.mrelPage = val;
            else if (tag === 'QUAY') fref.mrelQUAY = val;
            else { fref.mrelSourExtra.push('4 ' + tag + (val ? ' ' + val : '')); _ptDepth = 4; _ptTarget = fref.mrelSourExtra; }
          }
        }
      }

      // CONC/CONT for inline notes at any level
      if (lv1tag === 'NOTE' && lv > 1 && (tag==='CONC'||tag==='CONT')) {
        const _nadd = (tag==='CONT'?'\n':'') + val;
        if (_curNoteIsInline && cur.noteTexts.length) cur.noteTexts[cur.noteTexts.length-1] += _nadd;
      }
    }

    // ── FAMILY ──
    if (curType === 'FAM') {
      if (lv === 1) {
        if (tag==='HUSB') cur.husb = val;
        else if (tag==='WIFE') cur.wife = val;
        else if (tag==='CHIL') { cur.children.push(val); cur._lastChil = val; }
        else if (tag==='NOTE') {
          if (!val.startsWith('@')) { cur.noteTexts.push(val); _curNoteIsInline = true; }
          else { cur.noteRefs.push(val); _curNoteIsInline = false; }
        }
        else if (tag==='SOUR' && val.startsWith('@')) cur.sourceRefs.add(val);
        else if (tag==='MARR') { cur.marr.seen = true; cur.marr.value = val; }
        else if (tag==='ENGA') { cur.engag.seen = true; cur.engag.value = val; }
        else if (tag==='CHAN') { /* context-only */ }
        else if (tag==='OBJE') {
          if (val && val.startsWith('@')) {
            // Referenz auf externen OBJE-Record → verbatim passthrough
            cur._passthrough.push('1 OBJE ' + val); _ptDepth = 1;
          } else {
            cur.media.push({ file:'', title:'', form:'', titleIsLv2:false, _extra:[] });
          }
        }
        else {
          // Unknown FAM lv1 tag → verbatim passthrough
          cur._passthrough.push('1 ' + tag + (val ? ' ' + val : ''));
          _ptDepth = 1;
        }
      }
      else if (lv === 2) {
        if (lv1tag==='MARR') {
          if (tag==='DATE') cur.marr.date=val;
          else if (tag==='PLAC') cur.marr.place=val;
          else if (tag==='ADDR') cur.marr.addr=val;
          else if (tag==='SOUR' && val.startsWith('@')) { cur.marr.sources = cur.marr.sources||[]; cur.marr.sources.push(val); cur.sourceRefs.add(val); }
          else { cur.marr._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth = 2; _ptTarget = cur.marr._extra; }
        }
        if (lv1tag==='ENGA') {
          if      (tag==='DATE') cur.engag.date = val;
          else if (tag==='PLAC') cur.engag.place = val;
          else if (tag==='SOUR' && val.startsWith('@')) { cur.engag.sources.push(val); cur.sourceRefs.add(val); }
          else { cur.engag._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth = 2; _ptTarget = cur.engag._extra; }
        }
        if (lv1tag==='OBJE' && cur.media.length) {
          if (tag==='FILE')      cur.media[cur.media.length-1].file  = val;
          else if (tag==='TITL') { cur.media[cur.media.length-1].title = val; cur.media[cur.media.length-1].titleIsLv2 = true; }
          else { cur.media[cur.media.length-1]._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth=2; _ptTarget=cur.media[cur.media.length-1]._extra; }
        }
        if (lv1tag==='NOTE' && (tag==='CONC'||tag==='CONT') && cur.noteTexts.length) cur.noteTexts[cur.noteTexts.length-1] += (tag==='CONT'?'\n':'') + val;
        if (tag==='SOUR' && val.startsWith('@')) cur.sourceRefs.add(val);
        if (lv1tag==='CHAN' && tag==='DATE') cur.lastChanged = val;
        if (lv1tag==='CHAN' && tag==='TIME') cur.lastChangedTime = val;
        if (lv1tag==='CHIL' && cur._lastChil) {
          if (!cur.childRelations[cur._lastChil]) cur.childRelations[cur._lastChil] = {frel:'',mrel:'',frelSeen:false,mrelSeen:false,frelSour:'',frelPage:'',frelQUAY:'',frelSourExtra:[],mrelSour:'',mrelPage:'',mrelQUAY:'',mrelSourExtra:[],sourIds:[],sourPages:{},sourQUAY:{},sourExtra:{}};
          const cref = cur.childRelations[cur._lastChil];
          if (tag==='_FREL') { cref.frel = val; cref.frelSeen = true; }
          if (tag==='_MREL') { cref.mrel = val; cref.mrelSeen = true; }
          if (tag==='SOUR' && val.startsWith('@')) { cref.sourIds.push(val); cur.sourceRefs.add(val); }
        }
      }
      else if (lv === 3) {
        if (tag==='SOUR' && val.startsWith('@')) cur.sourceRefs.add(val);
        if (lv1tag==='OBJE' && lv2tag==='FILE' && cur.media.length) {
          if (tag==='FORM')      { cur.media[cur.media.length-1].form  = val; _ptDepth=3; _ptTarget=cur.media[cur.media.length-1]._extra; }
          else if (tag==='TITL') { cur.media[cur.media.length-1].title = val; _ptDepth=3; _ptTarget=cur.media[cur.media.length-1]._extra; }
          else { cur.media[cur.media.length-1]._extra.push('3 ' + tag + (val ? ' ' + val : '')); _ptDepth=3; _ptTarget=cur.media[cur.media.length-1]._extra; }
        }
        if (lv2tag==='DATE' && lv1tag==='CHAN' && tag==='TIME') cur.lastChangedTime = val;
        if (lv1tag==='MARR' && lv2tag==='SOUR' && lastSourVal) {
          if      (tag==='PAGE') cur.marr.sourcePages[lastSourVal] = val;
          else if (tag==='QUAY') cur.marr.sourceQUAY[lastSourVal] = val;
          else { if (!cur.marr.sourceExtra[lastSourVal]) cur.marr.sourceExtra[lastSourVal] = []; cur.marr.sourceExtra[lastSourVal].push('3 ' + tag + (val ? ' ' + val : '')); _ptDepth = 3; _ptTarget = cur.marr.sourceExtra[lastSourVal]; }
        }
        if (lv1tag==='ENGA' && lv2tag==='SOUR' && lastSourVal) {
          if      (tag==='PAGE') cur.engag.sourcePages[lastSourVal] = val;
          else if (tag==='QUAY') cur.engag.sourceQUAY[lastSourVal] = val;
          else { if (!cur.engag.sourceExtra[lastSourVal]) cur.engag.sourceExtra[lastSourVal] = []; cur.engag.sourceExtra[lastSourVal].push('3 ' + tag + (val ? ' ' + val : '')); _ptDepth = 3; _ptTarget = cur.engag.sourceExtra[lastSourVal]; }
        }
        if (lv1tag==='CHIL' && cur._lastChil && (lv2tag==='_FREL'||lv2tag==='_MREL')) {
          if (!cur.childRelations[cur._lastChil]) cur.childRelations[cur._lastChil] = {frel:'',mrel:'',frelSeen:false,mrelSeen:false,frelSour:'',frelPage:'',frelQUAY:'',frelSourExtra:[],mrelSour:'',mrelPage:'',mrelQUAY:'',mrelSourExtra:[],sourIds:[],sourPages:{},sourQUAY:{},sourExtra:{}};
          const cref = cur.childRelations[cur._lastChil];
          if (tag==='SOUR') {
            if (lv2tag==='_FREL') {
              if (!cref.frelSour) cref.frelSour = val;
              else { if (!cref.frelSourExtra) cref.frelSourExtra=[]; cref.frelSourExtra.push('3 SOUR '+val); _ptDepth=3; _ptTarget=cref.frelSourExtra; }
            }
            if (lv2tag==='_MREL') {
              if (!cref.mrelSour) cref.mrelSour = val;
              else { if (!cref.mrelSourExtra) cref.mrelSourExtra=[]; cref.mrelSourExtra.push('3 SOUR '+val); _ptDepth=3; _ptTarget=cref.mrelSourExtra; }
            }
          }
        }
        if (lv1tag==='CHIL' && cur._lastChil && lv2tag==='SOUR' && lastSourVal.startsWith('@')) {
          if (!cur.childRelations[cur._lastChil]) cur.childRelations[cur._lastChil] = {frel:'',mrel:'',frelSeen:false,mrelSeen:false,frelSour:'',frelPage:'',frelQUAY:'',frelSourExtra:[],mrelSour:'',mrelPage:'',mrelQUAY:'',mrelSourExtra:[],sourIds:[],sourPages:{},sourQUAY:{},sourExtra:{}};
          const cref = cur.childRelations[cur._lastChil];
          if      (tag==='PAGE') cref.sourPages[lastSourVal] = val;
          else if (tag==='QUAY') cref.sourQUAY[lastSourVal] = val;
          else { if (!cref.sourExtra[lastSourVal]) cref.sourExtra[lastSourVal] = []; cref.sourExtra[lastSourVal].push('3 ' + tag + (val ? ' ' + val : '')); _ptDepth = 3; _ptTarget = cref.sourExtra[lastSourVal]; }
        }
      }
      else if (lv === 4) {
        if (lv1tag==='CHIL' && cur._lastChil && lv3tag==='SOUR' && (lv2tag==='_FREL'||lv2tag==='_MREL')) {
          const cref = cur.childRelations[cur._lastChil];
          if (cref) {
            if (lv2tag==='_FREL') {
              if      (tag==='PAGE') cref.frelPage = val;
              else if (tag==='QUAY') cref.frelQUAY = val;
              else { if (!cref.frelSourExtra) cref.frelSourExtra = []; cref.frelSourExtra.push('4 ' + tag + (val ? ' ' + val : '')); _ptDepth = 4; _ptTarget = cref.frelSourExtra; }
            } else {
              if      (tag==='PAGE') cref.mrelPage = val;
              else if (tag==='QUAY') cref.mrelQUAY = val;
              else { if (!cref.mrelSourExtra) cref.mrelSourExtra = []; cref.mrelSourExtra.push('4 ' + tag + (val ? ' ' + val : '')); _ptDepth = 4; _ptTarget = cref.mrelSourExtra; }
            }
          }
        }
      }
      if (lv === 4 && inMap && (mapParent === 'MARR' || mapParent === 'ENGA')) {
        const coord = parseGeoCoord(val);
        const evObj = mapParent === 'ENGA' ? cur.engag : cur.marr;
        if (tag==='LATI') evObj.lati = coord;
        if (tag==='LONG') evObj.long = coord;
      }
    }

    // ── SOURCE ──
    if (curType === 'SOUR') {
      if (lv === 1) {
        if (tag==='TITL')      cur.title  = val;
        else if (tag==='ABBR') cur.abbr   = val;
        else if (tag==='AUTH') cur.author = val;
        else if (tag==='DATE') cur.date   = val;
        else if (tag==='PUBL') cur.publ   = val;
        else if (tag==='REPO') { cur.repo = val; cur.repoCallNum = ''; }
        else if (tag==='TEXT') cur.text   = val;
        else if (tag==='CHAN') { /* context-only */ }
        else if (tag==='OBJE') {
          if (val && val.startsWith('@')) {
            // Referenz auf externen OBJE-Record → verbatim passthrough
            cur._passthrough.push('1 OBJE ' + val); _ptDepth = 1;
          } else {
            cur.media.push({ file:'', title:'', form:'', titleIsLv2:false, _extra:[] });
          }
        }
        else {
          // Unknown lv1 tag (incl. DATA, etc.) → verbatim passthrough
          cur._passthrough.push('1 ' + tag + (val ? ' ' + val : ''));
          _ptDepth = 1;
        }
      }
      else if (lv === 2) {
        if (lv1tag==='OBJE' && cur.media.length) {
          if (tag==='FILE')      cur.media[cur.media.length-1].file  = val;
          else if (tag==='TITL') { cur.media[cur.media.length-1].title = val; cur.media[cur.media.length-1].titleIsLv2 = true; }
          else { cur.media[cur.media.length-1]._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth=2; _ptTarget=cur.media[cur.media.length-1]._extra; }
        }
        if ((tag==='CONC'||tag==='CONT') && lv1tag==='TITL') cur.title  += (tag==='CONT'?'\n':'') + val;
        if ((tag==='CONC'||tag==='CONT') && lv1tag==='TEXT') cur.text   += (tag==='CONT'?'\n':'') + val;
        if ((tag==='CONC'||tag==='CONT') && lv1tag==='AUTH') cur.author += (tag==='CONT'?'\n':'') + val;
        if ((tag==='CONC'||tag==='CONT') && lv1tag==='PUBL') cur.publ   += (tag==='CONT'?'\n':'') + val;
        if ((tag==='CONC'||tag==='CONT') && lv1tag==='ABBR') cur.abbr   += (tag==='CONT'?'\n':'') + val;
        if (lv1tag==='CHAN' && tag==='DATE') cur.lastChanged = val;
        if (lv1tag==='REPO' && tag==='CALN') cur.repoCallNum = val;
      }
      else if (lv === 3) {
        if (lv1tag==='OBJE' && lv2tag==='FILE' && cur.media.length) {
          if (tag==='FORM')      { cur.media[cur.media.length-1].form  = val; _ptDepth=3; _ptTarget=cur.media[cur.media.length-1]._extra; }
          else if (tag==='TITL') { cur.media[cur.media.length-1].title = val; _ptDepth=3; _ptTarget=cur.media[cur.media.length-1]._extra; }
          else { cur.media[cur.media.length-1]._extra.push('3 ' + tag + (val ? ' ' + val : '')); _ptDepth=3; _ptTarget=cur.media[cur.media.length-1]._extra; }
        }
        if (lv1tag==='CHAN' && tag==='TIME') cur.lastChangedTime = val;
      }
    }

    // ── NOTE record ──
    if (curType === 'NOTE') {
      if (tag==='CONC') cur.text += val;
      else if (tag==='CONT') cur.text += '\n' + val;
      else cur._passthrough.push(lv + ' ' + tag + (val ? ' ' + val : ''));
    }

    // ── REPO record ──
    if (curType === 'REPO') {
      if (lv === 1) {
        if (tag==='NAME')       cur.name  = val;
        else if (tag==='ADDR') { cur.addr = val; if (!cur.addrExtra) cur.addrExtra=[]; _ptDepth=1; _ptTarget=cur.addrExtra; }
        else if (tag==='PHON')  cur.phon  = val;
        else if (tag==='WWW')   cur.www   = val;
        else if (tag==='EMAIL') cur.email = val;
      } else if (lv === 2) {
        if (lv1tag==='ADDR' && tag==='CONT') cur.addr += '\n' + val;
        if (lv1tag==='CHAN' && tag==='DATE') cur.lastChanged = val;
      } else if (lv === 3) {
        if (lv1tag==='CHAN' && tag==='TIME') cur.lastChangedTime = val;
      }
    }
  }

  // Resolve NOTE references + build noteText/noteTextInline from noteTexts[]
  for (const p of Object.values(individuals)) {
    p.noteTextInline = p.noteTexts.join('\n');
    p.noteText = p.noteTextInline;
    for (const ref of p.noteRefs) {
      if (ref && notes[ref]) p.noteText += (p.noteText ? '\n' : '') + notes[ref].text;
    }
  }
  for (const f of Object.values(families)) {
    f.noteTextInline = f.noteTexts.join('\n');
    f.noteText = f.noteTextInline;
    for (const ref of f.noteRefs) {
      if (ref && notes[ref]) f.noteText += (f.noteText ? '\n' : '') + notes[ref].text;
    }
  }

  return { individuals, families, sources, notes, repositories, placForm, extraRecords: _extraRecords, headLines: _headLines };
}



// Parse GEDCOM geo coordinate: N52.15 → 52.15, W3.48 → -3.48
function parseGeoCoord(val) {
  if (!val) return null;
  const m = val.match(/^([NSEW])([\d.]+)$/i);
  if (!m) return parseFloat(val) || null;
  const sign = (m[1].toUpperCase() === 'S' || m[1].toUpperCase() === 'W') ? -1 : 1;
  return sign * parseFloat(m[2]);
}

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
    if (grp) grp.style.display = (qual === 'BET' || qual === 'FROM') ? '' : 'none';
  }
}

// Qualifier-Dropdown: zweites Datumfeld ein-/ausblenden
function onDateQualChange(selectEl, date2Id) {
  if (!date2Id) return;
  const grp = document.getElementById(date2Id + '-group');
  if (grp) grp.style.display = (selectEl.value === 'BET' || selectEl.value === 'FROM') ? '' : 'none';
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

// Wrapper: liest Qualifier + zwei Datumsbasen → buildGedDate
function buildGedDateFromFields(qualId, dateBaseId, date2BaseId) {
  return buildGedDate(
    document.getElementById(qualId)?.value || '',
    readDatePartFromFields(dateBaseId),
    date2BaseId ? readDatePartFromFields(date2BaseId) : ''
  );
}

// ── PLAC-Modus-Hilfsfunktionen (Sprint 6b) ──────────────────────────────────
const _placeModes = {};  // { placeId: 'free'|'parts' }

function getPlacLabels() {
  const raw = db.placForm || 'Dorf, Stadt, PLZ, Landkreis, Bundesland, Staat';
  return raw.split(',').map(s => s.trim()).filter(Boolean).slice(0, 6);
}

function buildPlacePartsHtml(placeId) {
  return getPlacLabels().map((lbl, i) =>
    `<input class="form-input" id="${placeId}-p${i}" placeholder="${lbl}" style="margin-bottom:3px">`
  ).join('');
}

function fillPlaceParts(placeId, raw) {
  const parts = (raw || '').split(/\s*,\s*/);
  getPlacLabels().forEach((_, i) => {
    const el = document.getElementById(`${placeId}-p${i}`);
    if (el) el.value = parts[i] || '';
  });
}

function joinPlaceParts(placeId) {
  const parts = getPlacLabels().map((_, i) => {
    const el = document.getElementById(`${placeId}-p${i}`);
    return el ? el.value.trim() : '';
  });
  while (parts.length && !parts[parts.length - 1]) parts.pop();
  return parts.join(', ');
}

function getPlaceFromForm(placeId) {
  if ((_placeModes[placeId] || 'free') === 'parts') return joinPlaceParts(placeId);
  return (document.getElementById(placeId)?.value || '').trim();
}

function initPlaceMode(placeId) {
  const freeEl    = document.getElementById(`${placeId}-free`);
  const partsEl   = document.getElementById(`${placeId}-parts`);
  const toggleBtn = document.getElementById(`${placeId}-toggle`);
  if (freeEl)    freeEl.style.display  = '';
  if (partsEl)   partsEl.style.display = 'none';
  if (toggleBtn) toggleBtn.textContent = '⊞ Felder';
  _placeModes[placeId] = 'free';
}

function togglePlaceMode(placeId) {
  const freeEl    = document.getElementById(`${placeId}-free`);
  const partsEl   = document.getElementById(`${placeId}-parts`);
  const toggleBtn = document.getElementById(`${placeId}-toggle`);
  if ((_placeModes[placeId] || 'free') === 'free') {
    const rawVal = (document.getElementById(placeId)?.value || '').trim();
    partsEl.innerHTML = buildPlacePartsHtml(placeId);
    fillPlaceParts(placeId, rawVal);
    freeEl.style.display  = 'none';
    partsEl.style.display = '';
    if (toggleBtn) toggleBtn.textContent = '⊠ Freitext';
    _placeModes[placeId] = 'parts';
  } else {
    const rawVal = joinPlaceParts(placeId);
    freeEl.style.display  = '';
    partsEl.style.display = 'none';
    if (toggleBtn) toggleBtn.textContent = '⊞ Felder';
    const inp = document.getElementById(placeId);
    if (inp) inp.value = rawVal;
    _placeModes[placeId] = 'free';
  }
}

// Schreibt Text als GEDCOM-Zeile: CONT für Zeilenumbrüche, CONC für Zeichenlimit-Splits
function pushCont(lines, lv, tag, text) {
  const MAX = 248;
  const rawLines = (text || '').split('\n');
  for (let li = 0; li < rawLines.length; li++) {
    let s = rawLines[li];
    let firstChunk = true;
    do {
      const chunk = s.slice(0, MAX);
      s = s.slice(MAX);
      if (li === 0 && firstChunk) lines.push(`${lv} ${tag} ${chunk}`);
      else if (firstChunk)        lines.push(`${lv+1} CONT ${chunk}`);
      else                        lines.push(`${lv+1} CONC ${chunk}`);
      firstChunk = false;
    } while (s.length > 0);
  }
  if (!rawLines.length) lines.push(`${lv} ${tag} `);
}

// ─────────────────────────────────────
//  GEDCOM WRITER  (v2 – vollständig)
// ─────────────────────────────────────
function writeGEDCOM() {
  const lines = [];
  const d = new Date();
  const fname = localStorage.getItem('stammbaum_filename') || 'stammbaum.ged';

  // ── HEAD ──
  if (db.headLines && db.headLines.length > 0) {
    // Verbatim HEAD aus Original (roundtrip-stabil), DATE/TIME auf aktuell aktualisiert
    for (const l of db.headLines) {
      if (/^1 DATE /.test(l))      { lines.push(`1 DATE ${gedcomDate(d)}`); continue; }
      if (/^2 TIME /.test(l))      { lines.push(`2 TIME ${gedcomTime(d)}`); continue; }
      lines.push(l);
    }
  } else {
    // Fallback: minimaler HEAD (kein Original geladen)
    lines.push('0 HEAD');
    lines.push('1 SOUR Stammbaum-App');
    lines.push('2 VERS 2.0');
    lines.push('2 NAME Stammbaum PWA');
    lines.push('1 DEST ANY');
    lines.push(`1 DATE ${gedcomDate(d)}`);
    lines.push(`2 TIME ${gedcomTime(d)}`);
    lines.push('1 GEDC');
    lines.push('2 VERS 5.5.1');
    lines.push('2 FORM LINEAGE-LINKED');
    lines.push('1 CHAR UTF-8');
    lines.push(`1 FILE ${fname}`);
    lines.push('1 PLAC');
    lines.push(`2 FORM ${db.placForm || 'Dorf, Stadt, PLZ, Landkreis, Bundesland, Staat'}`);
  }

  function geoLines(obj, indent) {
    if (obj && obj.lati !== null && obj.long !== null) {
      lines.push(`${indent} MAP`);
      const latStr = (obj.lati >= 0 ? 'N' : 'S') + Math.abs(obj.lati);
      const lonStr = (obj.long >= 0 ? 'E' : 'W') + Math.abs(obj.long);
      lines.push(`${indent+1} LATI ${latStr}`);
      lines.push(`${indent+1} LONG ${lonStr}`);
    }
  }

  function eventBlock(tag, obj, lv) {
    if (!obj || (!obj.seen && !obj.value && !obj.date && !obj.place && !obj.cause && !(obj.sources && obj.sources.length) && !(obj._extra && obj._extra.length))) return;
    lines.push(`${lv} ${tag}${obj.value ? ' ' + obj.value : ''}`);
    if (obj.date !== null && obj.date !== undefined)  lines.push(`${lv+1} DATE${obj.date ? ' ' + normGedDate(obj.date) : ''}`);
    if (obj.cause) lines.push(`${lv+1} CAUS ${obj.cause}`);
    if (obj.place !== null && obj.place !== undefined || obj.lati !== null) {
      if (obj.place !== null && obj.place !== undefined) lines.push(`${lv+1} PLAC${obj.place ? ' ' + obj.place : ''}`);
      geoLines(obj, lv+2);
    }
    if (obj.sources) for (const s of obj.sources) {
      lines.push(`${lv+1} SOUR ${s}`);
      if (obj.sourcePages && obj.sourcePages[s]) lines.push(`${lv+2} PAGE ${obj.sourcePages[s]}`);
      if (obj.sourceQUAY && obj.sourceQUAY[s])   lines.push(`${lv+2} QUAY ${obj.sourceQUAY[s]}`);
      if (obj.sourceExtra && obj.sourceExtra[s]) for (const l of obj.sourceExtra[s]) lines.push(l);
    }
    if (obj._extra && obj._extra.length) for (const l of obj._extra) lines.push(l);
  }

  for (const p of Object.values(db.individuals)) {
    lines.push(`0 ${p.id} INDI`);
    // Name with sub-tags
    const nameStr = (p.given || '') + (p.surname ? ' /' + p.surname + '/' : '');
    lines.push(`1 NAME ${p.nameRaw !== undefined && p.nameRaw !== '' ? p.nameRaw : nameStr.trim()}`);
    if (p.given)   lines.push(`2 GIVN ${p.given}`);
    if (p.surname) lines.push(`2 SURN ${p.surname}`);
    if (p.prefix)  lines.push(`2 NPFX ${p.prefix}`);
    if (p.suffix)  lines.push(`2 NSFX ${p.suffix}`);
    for (const s of (p.nameSources || [])) {
      lines.push(`2 SOUR ${s}`);
      if (p.nameSourcePages?.[s]) lines.push(`3 PAGE ${p.nameSourcePages[s]}`);
      if (p.nameSourceQUAY?.[s])  lines.push(`3 QUAY ${p.nameSourceQUAY[s]}`);
      if (p.nameSourceExtra?.[s]) for (const l of p.nameSourceExtra[s]) lines.push(l);
    }
    // NAME-context passthrough (2-level items at start of _passthrough, e.g. 2 NICK)
    const _pt = p._passthrough || [];
    let _ptNameEnd = 0;
    while (_ptNameEnd < _pt.length && /^[2-9] /.test(_pt[_ptNameEnd])) _ptNameEnd++;
    for (let i = 0; i < _ptNameEnd; i++) lines.push(_pt[i]);
    // Extra NAME-Einträge (Geburtsname etc.)
    for (const en of (p.extraNames || [])) {
      lines.push(`1 NAME${en.nameRaw ? ' ' + en.nameRaw : ''}`);
      if (en.type)    lines.push(`2 TYPE ${en.type}`);
      if (en.given)   lines.push(`2 GIVN ${en.given}`);
      if (en.surname) lines.push(`2 SURN ${en.surname}`);
      if (en.prefix)  lines.push(`2 NPFX ${en.prefix}`);
      if (en.suffix)  lines.push(`2 NSFX ${en.suffix}`);
      for (const s of (en.sources || [])) {
        lines.push(`2 SOUR ${s}`);
        if (en.sourcePages?.[s]) lines.push(`3 PAGE ${en.sourcePages[s]}`);
        if (en.sourceQUAY?.[s])  lines.push(`3 QUAY ${en.sourceQUAY[s]}`);
        if (en.sourceExtra?.[s]) for (const l of en.sourceExtra[s]) lines.push(l);
      }
      for (const l of (en._extra || [])) lines.push(l);
    }
    if (p.titl)    lines.push(`1 TITL ${p.titl}`);
    if (p.resn)    lines.push(`1 RESN ${p.resn}`);
    if (p.email)   lines.push(`1 EMAIL ${p.email}`);
    if (p.www)     lines.push(`1 WWW ${p.www}`);
    if (p.sex) lines.push(`1 SEX ${p.sex}`);
    for (const s of (p.topSources || [])) {
      lines.push(`1 SOUR ${s}`);
      if (p.topSourcePages?.[s]) lines.push(`2 PAGE ${p.topSourcePages[s]}`);
      if (p.topSourceQUAY?.[s])  lines.push(`2 QUAY ${p.topSourceQUAY[s]}`);
      if (p.topSourceExtra?.[s]) for (const l of p.topSourceExtra[s]) lines.push(l);
    }

    eventBlock('BIRT', p.birth, 1);
    eventBlock('CHR',  p.chr,   1);
    eventBlock('DEAT', p.death, 1);
    eventBlock('BURI', p.buri,  1);

    for (const ev of p.events) {
      lines.push(`1 ${ev.type}${ev.value ? ' ' + ev.value : ''}`);
      if (ev.eventType) lines.push(`2 TYPE ${ev.eventType}`);
      if (ev.date !== null && ev.date !== undefined)  lines.push(`2 DATE${ev.date ? ' ' + normGedDate(ev.date) : ''}`);
      if (ev.place !== null && ev.place !== undefined || ev.lati !== null) {
        if (ev.place !== null && ev.place !== undefined) lines.push(`2 PLAC${ev.place ? ' ' + ev.place : ''}`);
        geoLines(ev, 3);
      }
      if (ev.note) pushCont(lines, 2, 'NOTE', ev.note);
      if (ev.addr || (ev.addrExtra && ev.addrExtra.length)) { pushCont(lines, 2, 'ADDR', ev.addr || ''); if (ev.addrExtra && ev.addrExtra.length) for (const l of ev.addrExtra) lines.push(l); }
      if (ev.sources) for (const s of ev.sources) {
        lines.push(`2 SOUR ${s}`);
        if (ev.sourcePages && ev.sourcePages[s]) lines.push(`3 PAGE ${ev.sourcePages[s]}`);
        if (ev.sourceQUAY && ev.sourceQUAY[s])   lines.push(`3 QUAY ${ev.sourceQUAY[s]}`);
        if (ev.sourceExtra && ev.sourceExtra[s]) for (const l of ev.sourceExtra[s]) lines.push(l);
      }
      for (const m of (ev.media || [])) {
        lines.push('2 OBJE');
        if (m.title) lines.push(`3 TITL ${m.title}`);
        if (m.file) {
          lines.push(`3 FILE ${m.file}`);
          if (m.form) lines.push(`4 FORM ${m.form}`);
        }
        for (const l of (m._extra || [])) lines.push(l);
      }
      if (ev._extra && ev._extra.length) for (const l of ev._extra) lines.push(l);
    }

    for (const ref of (p.noteRefs || [])) lines.push(`1 NOTE ${ref}`);
    for (const nt of (p.noteTexts || [])) if (nt) pushCont(lines, 1, 'NOTE', nt);

    for (const fref of p.famc) {
      const famId = typeof fref === 'string' ? fref : fref.famId;
      lines.push(`1 FAMC ${famId}`);
      if (typeof fref === 'object') {
        if (fref.frelSeen) {
          lines.push(`2 _FREL${fref.frel ? ' ' + fref.frel : ''}`);
          if (fref.frelSour) {
            lines.push(`3 SOUR ${fref.frelSour}`);
            if (fref.frelPage) lines.push(`4 PAGE ${fref.frelPage}`);
            if (fref.frelQUAY) lines.push(`4 QUAY ${fref.frelQUAY}`);
            if (fref.frelSourExtra && fref.frelSourExtra.length) for (const l of fref.frelSourExtra) lines.push(l);
          }
        }
        if (fref.mrelSeen) {
          lines.push(`2 _MREL${fref.mrel ? ' ' + fref.mrel : ''}`);
          if (fref.mrelSour) {
            lines.push(`3 SOUR ${fref.mrelSour}`);
            if (fref.mrelPage) lines.push(`4 PAGE ${fref.mrelPage}`);
            if (fref.mrelQUAY) lines.push(`4 QUAY ${fref.mrelQUAY}`);
            if (fref.mrelSourExtra && fref.mrelSourExtra.length) for (const l of fref.mrelSourExtra) lines.push(l);
          }
        }
        for (const s of (fref.sourIds || [])) {
          lines.push(`2 SOUR ${s}`);
          if (fref.sourPages && fref.sourPages[s]) lines.push(`3 PAGE ${fref.sourPages[s]}`);
          if (fref.sourQUAY  && fref.sourQUAY[s])  lines.push(`3 QUAY ${fref.sourQUAY[s]}`);
          if (fref.sourExtra && fref.sourExtra[s]) for (const l of fref.sourExtra[s]) lines.push(l);
        }
      }
    }
    for (const f of p.fams) lines.push(`1 FAMS ${f}`);
    for (const m of p.media) {
      lines.push(`1 OBJE`);
      if (m.titleIsLv2 && m.title) lines.push(`2 TITL ${m.title}`);
      if (m.file) {
        lines.push(`2 FILE ${m.file}`);
        const form = m.form || (() => {
          const ext = (m.file.split('.').pop() || '').toUpperCase();
          return { JPG:'JPEG', JPEG:'JPEG', PNG:'PNG', GIF:'GIF', TIF:'TIFF', TIFF:'TIFF', BMP:'BMP', PDF:'PDF' }[ext] || ext;
        })();
        if (form) lines.push(`3 FORM ${form}`);
      }
      if (!m.titleIsLv2 && m.title) lines.push(`3 TITL ${m.title}`);
      for (const l of (m._extra || [])) lines.push(l);
    }
    // Manuell hinzugefügtes Foto ohne ursprünglichen OBJE-Eintrag → FILE-Referenz erzeugen
    if (_newPhotoIds.has(p.id)) {
      lines.push(`1 OBJE`);
      lines.push(`2 FILE photos/${p.id}.jpg`);
      lines.push(`3 FORM JPEG`);
    }
    if (p.uid) lines.push(`1 _UID ${p.uid}`);
    if (p.lastChanged) {
      lines.push(`1 CHAN`);
      lines.push(`2 DATE ${p.lastChanged}`);
      if (p.lastChangedTime) lines.push(`3 TIME ${p.lastChangedTime}`);
    }
    // Passthrough: gelöschte Fotos → OBJE-Block entfernen
    // (_pt and _ptNameEnd already declared above; write remaining items starting at _ptNameEnd)
    if (_deletedPhotoIds.has(p.id)) {
      let skip = false;
      for (let i = _ptNameEnd; i < _pt.length; i++) {
        const l = _pt[i];
        if (/^1 OBJE/.test(l)) { skip = true; continue; }
        if (skip && /^[2-9] /.test(l)) continue;
        skip = false;
        lines.push(l);
      }
    } else {
      for (let i = _ptNameEnd; i < _pt.length; i++) lines.push(_pt[i]);
    }
  }

  for (const f of Object.values(db.families)) {
    lines.push(`0 ${f.id} FAM`);
    if (f.husb) lines.push(`1 HUSB ${f.husb}`);
    if (f.wife) lines.push(`1 WIFE ${f.wife}`);
    for (const c of f.children) {
      lines.push(`1 CHIL ${c}`);
      const cref = f.childRelations?.[c];
      if (cref) {
        if (cref.sourIds && cref.sourIds.length) {
          for (const sid of cref.sourIds) {
            lines.push(`2 SOUR ${sid}`);
            if (cref.sourPages && cref.sourPages[sid]) lines.push(`3 PAGE ${cref.sourPages[sid]}`);
            if (cref.sourQUAY && cref.sourQUAY[sid])  lines.push(`3 QUAY ${cref.sourQUAY[sid]}`);
            if (cref.sourExtra && cref.sourExtra[sid]) for (const l of cref.sourExtra[sid]) lines.push(l);
          }
        }
        if (cref.frelSeen) {
          lines.push(`2 _FREL${cref.frel ? ' ' + cref.frel : ''}`);
          if (cref.frelSour) {
            lines.push(`3 SOUR ${cref.frelSour}`);
            if (cref.frelPage) lines.push(`4 PAGE ${cref.frelPage}`);
            if (cref.frelQUAY) lines.push(`4 QUAY ${cref.frelQUAY}`);
            if (cref.frelSourExtra && cref.frelSourExtra.length) for (const l of cref.frelSourExtra) lines.push(l);
          }
        }
        if (cref.mrelSeen) {
          lines.push(`2 _MREL${cref.mrel ? ' ' + cref.mrel : ''}`);
          if (cref.mrelSour) {
            lines.push(`3 SOUR ${cref.mrelSour}`);
            if (cref.mrelPage) lines.push(`4 PAGE ${cref.mrelPage}`);
            if (cref.mrelQUAY) lines.push(`4 QUAY ${cref.mrelQUAY}`);
            if (cref.mrelSourExtra && cref.mrelSourExtra.length) for (const l of cref.mrelSourExtra) lines.push(l);
          }
        }
      }
    }
    eventBlock('MARR', f.marr, 1);
    if (f.marr.addr) pushCont(lines, 2, 'ADDR', f.marr.addr);
    eventBlock('ENGA', f.engag, 1);
    for (const ref of (f.noteRefs || [])) lines.push(`1 NOTE ${ref}`);
    for (const nt of (f.noteTexts || [])) if (nt) pushCont(lines, 1, 'NOTE', nt);
    for (const m of (f.media || [])) {
      if (!m.file && !m.title) continue;
      lines.push(`1 OBJE`);
      if (m.titleIsLv2 && m.title) lines.push(`2 TITL ${m.title}`);
      if (m.file) {
        lines.push(`2 FILE ${m.file}`);
        const ext = (m.file.split('.').pop() || '').toUpperCase();
        const form = m.form || ({ JPG:'JPEG', JPEG:'JPEG', PNG:'PNG', GIF:'GIF', TIF:'TIFF', TIFF:'TIFF', BMP:'BMP', PDF:'PDF' }[ext] || ext);
        if (form) lines.push(`3 FORM ${form}`);
        if (m.title && !m.titleIsLv2) lines.push(`3 TITL ${m.title}`);
      } else if (m.title && !m.titleIsLv2) {
        lines.push(`2 TITL ${m.title}`);
      }
      for (const l of (m._extra || [])) lines.push(l);
    }
    if (f.lastChanged) {
      lines.push(`1 CHAN`);
      lines.push(`2 DATE ${f.lastChanged}`);
      if (f.lastChangedTime) lines.push(`3 TIME ${f.lastChangedTime}`);
    }
    for (const l of (f._passthrough || [])) lines.push(l);
  }

  for (const s of Object.values(db.sources)) {
    lines.push(`0 ${s.id} SOUR`);
    if (s.abbr)   lines.push(`1 ABBR ${s.abbr}`);
    if (s.title)  pushCont(lines, 1, 'TITL', s.title);
    if (s.author) pushCont(lines, 1, 'AUTH', s.author);
    if (s.date)   lines.push(`1 DATE ${s.date}`);
    if (s.publ)   pushCont(lines, 1, 'PUBL', s.publ);
    if (s.repo) {
    lines.push(`1 REPO ${s.repo}`);
    if (s.repoCallNum) lines.push(`2 CALN ${s.repoCallNum}`);
  }
    if (s.text)   { pushCont(lines, 1, 'TEXT', s.text); }
    for (const m of (s.media || [])) {
      if (!m.file && !m.title) continue;
      lines.push(`1 OBJE`);
      if (m.titleIsLv2 && m.title) lines.push(`2 TITL ${m.title}`);
      if (m.file) {
        lines.push(`2 FILE ${m.file}`);
        const ext = (m.file.split('.').pop() || '').toUpperCase();
        const form = m.form || ({ JPG:'JPEG', JPEG:'JPEG', PNG:'PNG', GIF:'GIF', TIF:'TIFF', TIFF:'TIFF', BMP:'BMP', PDF:'PDF' }[ext] || ext);
        if (form) lines.push(`3 FORM ${form}`);
        if (m.title && !m.titleIsLv2) lines.push(`3 TITL ${m.title}`);
      } else if (m.title && !m.titleIsLv2) {
        lines.push(`2 TITL ${m.title}`);
      }
      for (const l of (m._extra || [])) lines.push(l);
    }
    if (s.lastChanged) {
      lines.push(`1 CHAN`);
      lines.push(`2 DATE ${s.lastChanged}`);
      if (s.lastChangedTime) lines.push(`3 TIME ${s.lastChangedTime}`);
    }
    for (const l of (s._passthrough || [])) lines.push(l);
  }

  for (const r of Object.values(db.repositories)) {
    lines.push(`0 ${r.id} REPO`);
    if (r.name) lines.push(`1 NAME ${r.name}`);
    if (r.addr || (r.addrExtra && r.addrExtra.length)) {
      const al = r.addr ? r.addr.split('\n') : [];
      lines.push(`1 ADDR${al[0] ? ' ' + al[0] : ''}`);
      for (let i = 1; i < al.length; i++) lines.push(`2 CONT ${al[i]}`);
      if (r.addrExtra && r.addrExtra.length) for (const l of r.addrExtra) lines.push(l);
    }
    if (r.phon)  lines.push(`1 PHON ${r.phon}`);
    if (r.www)   lines.push(`1 WWW ${r.www}`);
    if (r.email) lines.push(`1 EMAIL ${r.email}`);
    if (r.lastChanged) {
      lines.push(`1 CHAN`);
      lines.push(`2 DATE ${r.lastChanged}`);
      if (r.lastChangedTime) lines.push(`3 TIME ${r.lastChangedTime}`);
    }
  }

  for (const n of Object.values(db.notes || {})) {
    const MAX = 248;
    const rawLines = (n.text || '').split('\n');
    for (let li = 0; li < rawLines.length; li++) {
      let s = rawLines[li];
      let firstChunk = true;
      do {
        const chunk = s.slice(0, MAX);
        s = s.slice(MAX);
        if (li === 0 && firstChunk) lines.push(`0 ${n.id} NOTE ${chunk}`);
        else if (firstChunk)        lines.push(`1 CONT ${chunk}`);
        else                        lines.push(`1 CONC ${chunk}`);
        firstChunk = false;
      } while (s.length > 0);
    }
    if (!rawLines.length) lines.push(`0 ${n.id} NOTE `);
    for (const l of (n._passthrough || [])) lines.push(l);
  }

  // Unknown lv=0 records (SUBM etc.) — verbatim passthrough
  for (const rec of (db.extraRecords || [])) {
    for (const l of rec._lines) lines.push(l);
  }

  lines.push('0 TRLR');
  return lines.join('\r\n');
}

