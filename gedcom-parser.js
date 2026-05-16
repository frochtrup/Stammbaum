// ─────────────────────────────────────
//  GEDCOM PARSER  (v4 – error collector)
// ─────────────────────────────────────
function parseGEDCOM(text, parseErrors) {
  text = text.replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/);

  // Pre-scan: extract PLAC.FORM from HEAD (unique: "1 PLAC\n2 FORM ...")
  let placForm = 'Dorf, Stadt, PLZ, Landkreis, Bundesland, Staat';
  { const mPF = text.match(/^1 PLAC\s*[\r\n]+\s*2 FORM (.+)$/m); if (mPF) placForm = mPF[1].trim(); }

  const individuals = {}, families = {}, sources = {}, notes = {}, repositories = {};
  const _extraRecords = [];  // verbatim passthrough for unknown lv=0 records (SUBM etc.)
  const _headLines = [];     // HEAD verbatim (restored in writer for roundtrip fidelity)
  const _errors = parseErrors || []; // error collector (malformed lines, invalid levels)
  let lineNo = 0;  // 1-based line counter
  let prevLv = -1; // last valid level (for jump detection)
  let cur = null, curType = null;
  // Simple flat context tracking
  let lv1tag = '';   // current level-1 tag
  let lv2tag = '';   // current level-2 tag
  let lv3tag = '';   // current level-3 tag
  let evIdx  = -1;   // current event index in cur.events
  let inMap  = false; // are we inside a MAP block?
  let mapParent = ''; // which lv1 tag owns current MAP (BIRT/DEAT/etc.)
  let _curCit = null;   // aktuelles Citation-Objekt (gesetzt bei SOUR @id@, für PAGE/QUAY/NOTE/OBJE)
  let lastSourVal = ''; // nur noch für topSourcePages{} / topSourceQUAY{} (lv=1 SOUR unter INDI)
  let _curNoteIsInline = false; // true when 1 NOTE was inline (not a @ref@)
  let _curExtraNameIdx = -1;   // index into cur.extraNames when parsing 2nd+ NAME
  let _ptDepth = 0;  // verbatim-passthrough depth (0 = off)
  let _ptTarget = null; // redirect capture target (null = cur._passthrough)
  let _smEntry = null;  // structured sourceMedia entry being parsed (OBJE under SOUR citation)
  let _curTask = null;  // task object being parsed (1 _TASK context)
  let _curAsso = null;  // association being parsed (1 ASSO context)

  for (let raw of lines) {
    lineNo++;
    // raw.trim() würde trailing Spaces aus CONT/CONC-Werten entfernen → CONC-Split-Verschiebung
    // Nur \r am Ende entfernen (Windows CRLF), führende Spaces gibt es in GEDCOM nicht
    const line = raw.replace(/\r$/, '');
    if (!line.trim()) continue;
    const m = line.match(/^(\d+)\s+(\S+)(.*)?$/);
    if (!m) {
      _errors.push({ line: lineNo, raw: line, msg: 'Ungültiges GEDCOM-Format (kein Level/Tag erkannt)' });
      continue;
    }
    const lv  = parseInt(m[1]);
    const tag = m[2].trim();
    const val = (m[3] || '').replace(/^ /, ''); // remove 1 leading space (GEDCOM delimiter)

    // ── Level-Validierung ──
    if (lv > 4 && _ptDepth === 0) {
      // Nur als Fehler loggen wenn NICHT bereits in einem Passthrough-Block —
      // lv5/6 unter z.B. 4 FILE (sourceMedia OBJE) sind gültige Sub-Tags die
      // der _ptDepth-Block weiter unten korrekt abfängt.
      _errors.push({ line: lineNo, lv, tag, val, raw: line, msg: `Level ${lv} überschreitet das Maximum (4)` });
    }
    if (prevLv >= 0 && lv > prevLv + 1) {
      _errors.push({ line: lineNo, lv, tag, val, raw: line, msg: `Level-Sprung von ${prevLv} auf ${lv} (erwartet max. ${prevLv + 1})` });
    }
    prevLv = lv;

    // ── Level 0 ──
    if (lv === 0) {
      lv1tag = lv2tag = lv3tag = '';
      evIdx = -1; inMap = false; mapParent = ''; _ptDepth = 0; _smEntry = null; _curCit = null;
      if (tag.startsWith('@') && val.trim() === 'INDI') {
        cur = {
          id: tag, _passthrough: [], _nameParsed: false,
          name:'', nameRaw:'', surname:'', given:'', nick:'', _rufname:'', prefix:'', suffix:'',
          sex:'U', uid:'', topSources:[],
          birth:{ date:null, place:null, lati:null, long:null, citations:[], _extra:[], value:'', seen:false, note:'', noteRefs:[] },
          death:{ date:null, place:null, lati:null, long:null, citations:[], _extra:[], cause:'', value:'', seen:false, note:'', noteRefs:[] },
          chr:{ date:null, place:null, lati:null, long:null, citations:[], _extra:[], value:'', seen:false, note:'', noteRefs:[] },
          buri:{ date:null, place:null, lati:null, long:null, citations:[], _extra:[], value:'', seen:false, note:'', noteRefs:[] },
          events:[], famc:[], fams:[],
          noteRefs:[], noteTexts:[], noteText:'',
          extraNames:[], _tasks:[], associations:[], aliases:[], refns:[],
          media:[], titl:'', reli:'', resn:'', email:'', www:'', _stat:null, grampId:'', lastChanged:'', lastChangedTime:'',
          nameCitations:[],
          topSourcePages:{}, topSourceQUAY:{}, topSourceExtra:{}, sourceRefs: new Set()
        };
        individuals[tag] = cur; curType = 'INDI';
      } else if (tag.startsWith('@') && val.trim() === 'FAM') {
        const _famEv = () => ({date:null,place:null,lati:null,long:null,citations:[],value:'',seen:false,note:'',noteRefs:[],_extra:[],media:[]});
        cur = { id:tag, _passthrough: [], husb:null, wife:null, children:[], childRelations:{}, _lastChil:null, marr:{..._famEv(),addr:''}, engag:_famEv(), div:_famEv(), divf:_famEv(), events:[], _stat:null, grampId:'', noteRefs:[], noteTexts:[], noteText:'', sourceRefs: new Set(), media:[], _tasks:[], refns:[], lastChanged:'', lastChangedTime:'' };
        families[tag] = cur; curType = 'FAM';
      } else if (tag.startsWith('@') && val.trim() === 'SOUR') {
        cur = { id:tag, _passthrough: [], title:'', abbr:'', author:'', date:'', publ:'', repo:'', repoCallNum:'', repoCallMedi:'', repoCallNumExtra:[], text:'', _textSeen:false, note:'', noteRefs:[], agnc:'', grampId:'', dataEvens:[], dataExtra:[], refns:[], media:[], _date:'', lastChanged:'', lastChangedTime:'' };
        sources[tag] = cur; curType = 'SOUR';
      } else if (tag.startsWith('@') && /^NOTE\b/.test(val.trim())) {
        const _noteinit = val.slice(val.startsWith('NOTE ') ? 5 : 4); // preserve trailing whitespace (CONC-Roundtrip)
        cur = { id:tag, text: _noteinit, _passthrough: [], lastChanged:'', lastChangedTime:'' };
        notes[tag] = cur; curType = 'NOTE';
      } else if (tag.startsWith('@') && val.trim() === 'REPO') {
        cur = { id:tag, _passthrough:[], name:'', addr:'', phon:'', www:'', email:'', lastChanged:'', lastChangedTime:'' };
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
    if (lv === 1) { lv1tag = tag; lv2tag = ''; lv3tag = ''; inMap = false; mapParent = ''; _curCit = null; lastSourVal = ''; _curNoteIsInline = false; _curExtraNameIdx = -1; _smEntry = null; }
    if (lv === 2) { lv2tag = tag; lv3tag = ''; if (tag !== 'MAP') inMap = false; if (tag !== 'SOUR') _curCit = null; _smEntry = null; }
    if (lv === 3) { lv3tag = tag; if (tag === 'MAP') { inMap = true; mapParent = lv1tag; } else { inMap = false; } _smEntry = null; }

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
            cur.extraNames.push({ nameRaw:val||'', given:giv2, surname:surn2, prefix:'', suffix:'', type:'', citations:[], _extra:[] });
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
        else if (tag === 'FAMC') cur.famc.push({ famId:val, pedi:'', frel:'', mrel:'', frelSeen:false, mrelSeen:false, frelSour:'', frelPage:'', frelQUAY:'', frelSourExtra:[], mrelSour:'', mrelPage:'', mrelQUAY:'', mrelSourExtra:[], citations:[] });
        else if (tag === 'FAMS') cur.fams.push(val);
        else if (tag === 'NOTE') {
          if (!val.startsWith('@')) { cur.noteTexts.push(val); _curNoteIsInline = true; }
          else { cur.noteRefs.push(val); _curNoteIsInline = false; }
        }
        else if (tag === '_UID') cur.uid = val;
        else if (tag === '_GRAMPS_ID') cur.grampId = val;
        else if (tag === 'SOUR' && val.startsWith('@')) { const _ns1 = val.replace(/^@@/,'@').replace(/@@$/,'@'); cur.topSources.push(_ns1); cur.sourceRefs.add(_ns1); lastSourVal = _ns1; }
        // OBJE → fällt in else-Passthrough unten (vollständiger Block wird verbatim bewahrt)
        else if (tag === 'RESN')  cur.resn  = val;
        else if (tag === 'EMAIL') cur.email = val;
        else if (tag === 'WWW')   cur.www   = val;
        else if (tag === 'BIRT') { cur.birth.value = val; cur.birth.seen = true; }
        else if (tag === 'CHR')  { cur.chr.value   = val; cur.chr.seen   = true; }
        else if (tag === 'DEAT') { cur.death.value = val; cur.death.seen = true; }
        else if (tag === 'BURI') { cur.buri.value  = val; cur.buri.seen  = true; }
        else if (['OCCU','RESI','EDUC','EMIG','IMMI','NATU','EVEN','GRAD','ADOP','FACT','MILI','RELI',
                  'CENS','CONF','FCOM','ORDN','RETI','PROP','WILL','PROB',
                  'DSCR','IDNO','SSN'].includes(tag)) {
          cur.events.push({ type:tag, value:val, date:null, place:null, lati:null, long:null, eventType:'', note:'', noteRefs:[], addr:'', phon:[], email:[], citations:[], media:[], _extra:[] });
          evIdx = cur.events.length - 1;
        }
        else if (tag === 'OBJE') {
          if (val && val.startsWith('@')) {
            cur._passthrough.push('1 OBJE ' + val); _ptDepth = 1;
          } else {
            cur.media.push({ file:'', title:'', form:null, titleIsLv2:false, note:'', date:'', scbk:'', prim:'', _extra:[] });
          }
        }
        else if (tag === 'CHAN') { /* context-only, handled via lv2 */ }
        else if (tag === '_STAT') { cur._stat = val; }
        else if (tag === '_TASK') {
          _curTask = { id: '', text: val || '', category: 'kirchenbuch', done: false, created: '' };
          cur._tasks.push(_curTask);
        }
        else if (tag === 'ASSO') {
          _curAsso = { xref: val, rela: '', note: '', citations: [] };
          cur.associations.push(_curAsso);
        }
        else if (tag === 'ALIA') {
          if (val && val.startsWith('@')) cur.aliases.push(val);
        }
        else if (tag === 'REFN') { cur.refns.push({val:val||'', type:''}); }
        else {
          // Unknown lv1 tag → verbatim passthrough
          cur._passthrough.push('1 ' + tag + (val ? ' ' + val : ''));
          _ptDepth = 1;
        }
      }

      else if (lv === 2) {
        // Task subtags
        if (lv1tag === '_TASK' && _curTask) {
          if      (tag === '_CAT')  _curTask.category = val;
          else if (tag === '_DONE') _curTask.done = val === '1';
          else if (tag === '_DATE') _curTask.created = val;
          else if (tag === '_ID')   _curTask.id = val;
          // silently ignore unknown _TASK subtags
        }
        // Association subtags
        else if (lv1tag === 'ASSO' && _curAsso) {
          if      (tag === 'RELA') _curAsso.rela = val;
          else if (tag === 'NOTE') _curAsso.note = (val || '');
          else if (tag === 'SOUR' && val.startsWith('@')) {
            const _ns = val.replace(/^@@/,'@').replace(/@@$/,'@');
            _curCit = citationObj(_ns); _curAsso.citations.push(_curCit); cur.sourceRefs.add(_ns);
          }
        }
        // Name parts
        else if (lv1tag === 'NAME') {
          if (_curExtraNameIdx >= 0) {
            // Sub-tags für 2nd+ NAME-Eintrag
            const en = cur.extraNames[_curExtraNameIdx];
            if      (tag === 'TYPE') en.type   = val;
            else if (tag === 'GIVN') { en.given   = val; }
            else if (tag === 'SURN') { en.surname = val; }
            else if (tag === 'NPFX') en.prefix  = val;
            else if (tag === 'NSFX') en.suffix  = val;
            else if (tag === 'SOUR') { _curCit = citationObj(val); en.citations.push(_curCit); if (val.startsWith('@')) cur.sourceRefs.add(val); }
            else if (tag === 'CONC') en.nameRaw += val;
            else if (tag === 'CONT') en.nameRaw += '\n' + val;
            else { en._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth = 2; _ptTarget = en._extra; }
          } else {
            if      (tag === 'GIVN') {
              // Asterisk-Konvention: *Rufname oder Rufname* markiert den Rufnamen
              const starMatch = val.match(/\*(\S+)|\b(\S+)\*/);
              if (starMatch && !cur._rufname) cur._rufname = (starMatch[1] || starMatch[2]);
              cur.given = val.replace(/\*/g, '').replace(/\s{2,}/g, ' ').trim();
              cur.name = (cur.given + (cur.surname ? ' '+cur.surname : '')).trim();
            }
            else if (tag === 'SURN') { cur.surname = val; cur.name = (cur.given + (cur.surname ? ' '+cur.surname : '')).trim(); }
            else if (tag === 'NICK') cur.nick = val;
            else if (tag === '_RUFNAME') cur._rufname = val;
            else if (tag === 'NPFX') cur.prefix = val;
            else if (tag === 'NSFX') cur.suffix = val;
            else if (tag === 'SOUR') { _curCit = citationObj(val); cur.nameCitations.push(_curCit); if (val.startsWith('@')) cur.sourceRefs.add(val); }
            else if (tag === 'CONC') cur.nameRaw += val;
            else if (tag === 'CONT') cur.nameRaw += '\n' + val;
            else { cur._passthrough.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth = 2; }
          }
        }
        // Vital events
        else if (lv1tag === 'BIRT') {
          if      (tag==='DATE') cur.birth.date=val;
          else if (tag==='PLAC') cur.birth.place=val;
          else if (tag==='NOTE') { if (val.startsWith('@')) cur.birth.noteRefs.push(val); else cur.birth.note=val; }
          else if (tag==='SOUR') { _curCit=citationObj(val); cur.birth.citations.push(_curCit); if (val.startsWith('@')) cur.sourceRefs.add(val); }
          else { cur.birth._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth=2; _ptTarget=cur.birth._extra; }
        }
        else if (lv1tag === 'DEAT') {
          if      (tag==='DATE') cur.death.date=val;
          else if (tag==='PLAC') cur.death.place=val;
          else if (tag==='CAUS') cur.death.cause=val;
          else if (tag==='NOTE') { if (val.startsWith('@')) cur.death.noteRefs.push(val); else cur.death.note=val; }
          else if (tag==='SOUR') { _curCit=citationObj(val); cur.death.citations.push(_curCit); if (val.startsWith('@')) cur.sourceRefs.add(val); }
          else { cur.death._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth=2; _ptTarget=cur.death._extra; }
        }
        else if (lv1tag === 'CHR') {
          if      (tag==='DATE') cur.chr.date=val;
          else if (tag==='PLAC') cur.chr.place=val;
          else if (tag==='NOTE') { if (val.startsWith('@')) cur.chr.noteRefs.push(val); else cur.chr.note=val; }
          else if (tag==='SOUR') { _curCit=citationObj(val); cur.chr.citations.push(_curCit); if (val.startsWith('@')) cur.sourceRefs.add(val); }
          else { cur.chr._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth=2; _ptTarget=cur.chr._extra; }
        }
        else if (lv1tag === 'BURI') {
          if      (tag==='DATE') cur.buri.date=val;
          else if (tag==='PLAC') cur.buri.place=val;
          else if (tag==='NOTE') { if (val.startsWith('@')) cur.buri.noteRefs.push(val); else cur.buri.note=val; }
          else if (tag==='SOUR') { _curCit=citationObj(val); cur.buri.citations.push(_curCit); if (val.startsWith('@')) cur.sourceRefs.add(val); }
          else { cur.buri._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth=2; _ptTarget=cur.buri._extra; }
        }
        // Other events
        else if (evIdx >= 0 && cur.events[evIdx]) {
          const ev = cur.events[evIdx];
          if      (tag==='DATE')  ev.date = val;
          else if (tag==='PLAC')  ev.place = val;
          else if (tag==='TYPE')  ev.eventType = val;
          else if (tag==='NOTE') { if (val.startsWith('@')) ev.noteRefs.push(val); else ev.note += (ev.note ? '\n' : '') + val; }
          else if (tag==='PHON')  ev.phon.push(val);
          else if (tag==='EMAIL') ev.email.push(val);
          else if (tag==='ADDR') { ev.addr = (ev.addr ? ev.addr + '\n' : '') + val; if (!ev.addrExtra) ev.addrExtra=[]; _ptDepth=2; _ptTarget=ev.addrExtra; }
          else if (tag==='CONC'||tag==='CONT') ev.value += (tag==='CONT'?'\n':'') + val;
          else if (tag==='SOUR') { _curCit=citationObj(val); ev.citations.push(_curCit); if (val.startsWith('@')) cur.sourceRefs.add(val); }
          else if (tag==='OBJE') {
            if (val && val.startsWith('@')) { ev._extra.push('2 OBJE ' + val); _ptDepth = 2; _ptTarget = ev._extra; }
            else ev.media.push({ file:'', title:'', form:null, _extra:[] });
          }
          else { ev._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth = 2; _ptTarget = ev._extra; }
        }
        // Family relationship
        if (lv1tag === 'FAMC' && cur.famc.length) {
          const fref = cur.famc[cur.famc.length-1];
          if (tag==='PEDI') { fref.pedi = val; if (!fref.frelSeen) { fref.frel = val; fref.frelSeen = true; } if (!fref.mrelSeen) { fref.mrel = val; fref.mrelSeen = true; } }
          if (tag==='_FREL') { fref.frel = val; fref.frelSeen = true; }
          if (tag==='_MREL') { fref.mrel = val; fref.mrelSeen = true; }
          if (tag==='SOUR' && val.startsWith('@')) { const _ns = val.replace(/^@@/,'@').replace(/@@$/,'@'); _curCit = citationObj(_ns); fref.citations.push(_curCit); cur.sourceRefs.add(_ns); }
        }
        // Media
        if (lv1tag === 'OBJE' && cur.media.length) {
          const _cm = cur.media[cur.media.length-1];
          if      (tag==='FILE')  _cm.file  = val;
          else if (tag==='TITL')  { _cm.title = val; _cm.titleIsLv2 = true; }
          else if (tag==='NOTE')  _cm.note  = val;
          else if (tag==='_DATE') _cm.date  = val;
          else if (tag==='_SCBK') _cm.scbk  = val;
          else if (tag==='_PRIM') _cm.prim  = val;
          else { _cm._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth=2; _ptTarget=_cm._extra; }
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
        if (lv1tag === 'REFN' && tag === 'TYPE' && cur.refns.length) cur.refns[cur.refns.length-1].type = val;
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
        if (lv1tag === 'OBJE' && lv2tag === 'NOTE' && (tag === 'CONC' || tag === 'CONT') && cur.media.length)
          cur.media[cur.media.length-1].note += (tag === 'CONT' ? '\n' : '') + val;
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
        // Special event note continuation (BIRT/CHR/DEAT/BURI have evIdx=-1)
        if (evIdx < 0 && lv2tag === 'NOTE' && (tag==='CONC'||tag==='CONT')) {
          const _sfx = (tag==='CONT'?'\n':'') + val;
          if      (lv1tag==='BIRT') cur.birth.note += _sfx;
          else if (lv1tag==='DEAT') cur.death.note += _sfx;
          else if (lv1tag==='CHR')  cur.chr.note   += _sfx;
          else if (lv1tag==='BURI') cur.buri.note  += _sfx;
        }
        // lv=3 Sub-Tags unter 2 SOUR → direkt auf _curCit schreiben (PAGE/QUAY/NOTE/OBJE/extra)
        if (lv2tag === 'SOUR' && _curCit && tag !== 'TIME' && tag !== 'SOUR') {
          if      (tag === 'PAGE') _curCit.page = val;
          else if (tag === 'QUAY') _curCit.quay = val;
          else if (tag === 'NOTE') { _curCit.note = val || ''; _ptDepth = 3; _ptTarget = _curCit.extra; }
          else if (tag === 'OBJE' && !val?.startsWith('@')) {
            const _sm = { file:'', scbk:'', prim:'', titl:'', note:'', _extra:[] };
            _curCit.media.push(_sm); _smEntry = _sm;
          } else {
            _curCit.extra.push('3 ' + tag + (val ? ' ' + val : ''));
            _ptDepth = 3; _ptTarget = _curCit.extra;
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
        // OBJE sub-tags under 3 SOUR OBJE citation → sourceMedia entry
        if (_smEntry !== null && lv3tag === 'OBJE' && lv2tag === 'SOUR') {
          if      (tag==='FILE')  { _smEntry.file=val; _ptDepth=4; _ptTarget=_smEntry._extra; }
          else if (tag==='_SCBK') _smEntry.scbk=val;
          else if (tag==='_PRIM') _smEntry.prim=val;
          else if (tag==='TITL')  _smEntry.titl=val;
          else if (tag==='NOTE')  _smEntry.note=val;
          else { _smEntry._extra.push('4 '+tag+(val?' '+val:'')); _ptDepth=4; _ptTarget=_smEntry._extra; }
        }
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
        else if (tag==='MARR') { cur.marr.seen  = true; cur.marr.value  = val; }
        else if (tag==='ENGA') { cur.engag.seen = true; cur.engag.value = val; }
        else if (tag==='ENG')  { cur.engag.seen = true; cur.engag.value = val; } // ENG = ENGA-Alias
        else if (tag==='DIV')  { cur.div.seen   = true; cur.div.value   = val; }
        else if (tag==='DIVF') { cur.divf.seen  = true; cur.divf.value  = val; }
        else if (tag==='CHAN') { /* context-only */ }
        else if (tag==='EVEN') { cur.events.push({ type:'EVEN', value:val, date:null, place:null, lati:null, long:null, eventType:'', note:'', noteRefs:[], citations:[], _extra:[] }); evIdx = cur.events.length-1; }
        else if (tag==='_STAT') { cur._stat = val; }
        else if (tag==='_GRAMPS_ID') { cur.grampId = val; }
        else if (tag==='OBJE') {
          if (val && val.startsWith('@')) {
            // Referenz auf externen OBJE-Record → verbatim passthrough
            cur._passthrough.push('1 OBJE ' + val); _ptDepth = 1;
          } else {
            cur.media.push({ file:'', title:'', form:null, titleIsLv2:false, note:'', date:'', scbk:'', prim:'', _extra:[] });
          }
        }
        else if (tag === '_TASK') {
          _curTask = { id: '', text: val || '', category: 'kirchenbuch', done: false, created: '' };
          cur._tasks.push(_curTask);
        }
        else if (tag === 'REFN') { cur.refns.push({val:val||'', type:''}); }
        else {
          // Unknown FAM lv1 tag → verbatim passthrough
          cur._passthrough.push('1 ' + tag + (val ? ' ' + val : ''));
          _ptDepth = 1;
        }
      }
      else if (lv === 2) {
        if (lv1tag === '_TASK' && _curTask) {
          if      (tag === '_CAT')  _curTask.category = val;
          else if (tag === '_DONE') _curTask.done = val === '1';
          else if (tag === '_DATE') _curTask.created = val;
          else if (tag === '_ID')   _curTask.id = val;
        }
        else if (lv1tag==='MARR') {
          if (tag==='DATE') cur.marr.date=val;
          else if (tag==='PLAC') cur.marr.place=val;
          else if (tag==='ADDR') cur.marr.addr=val;
          else if (tag==='SOUR') { _curCit=citationObj(val); cur.marr.citations.push(_curCit); if (val.startsWith('@')) cur.sourceRefs.add(val); }
          else if (tag==='NOTE') { if (val.startsWith('@')) cur.marr.noteRefs.push(val); else cur.marr.note = val; }
          else if (tag==='OBJE') { cur.marr.media.push({file:'',form:null,titl:'',note:'',date:'',scbk:'',prim:'',_extra:[]}); }
          else { cur.marr._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth = 2; _ptTarget = cur.marr._extra; }
        }
        if (lv1tag==='ENGA' || lv1tag==='ENG') {
          if      (tag==='DATE') cur.engag.date = val;
          else if (tag==='PLAC') cur.engag.place = val;
          else if (tag==='SOUR') { _curCit=citationObj(val); cur.engag.citations.push(_curCit); if (val.startsWith('@')) cur.sourceRefs.add(val); }
          else if (tag==='NOTE') { if (val.startsWith('@')) cur.engag.noteRefs.push(val); else cur.engag.note = val; }
          else if (tag==='OBJE') { cur.engag.media.push({file:'',form:null,titl:'',note:'',date:'',scbk:'',prim:'',_extra:[]}); }
          else { cur.engag._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth = 2; _ptTarget = cur.engag._extra; }
        }
        if (lv1tag==='DIV') {
          if      (tag==='DATE') cur.div.date = val;
          else if (tag==='PLAC') cur.div.place = val;
          else if (tag==='SOUR') { _curCit=citationObj(val); cur.div.citations.push(_curCit); if (val.startsWith('@')) cur.sourceRefs.add(val); }
          else if (tag==='NOTE') { if (val.startsWith('@')) cur.div.noteRefs.push(val); else cur.div.note = val; }
          else if (tag==='OBJE') { cur.div.media.push({file:'',form:null,titl:'',note:'',date:'',scbk:'',prim:'',_extra:[]}); }
          else { cur.div._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth = 2; _ptTarget = cur.div._extra; }
        }
        if (lv1tag==='DIVF') {
          if      (tag==='DATE') cur.divf.date = val;
          else if (tag==='PLAC') cur.divf.place = val;
          else if (tag==='SOUR') { _curCit=citationObj(val); cur.divf.citations.push(_curCit); if (val.startsWith('@')) cur.sourceRefs.add(val); }
          else if (tag==='NOTE') { if (val.startsWith('@')) cur.divf.noteRefs.push(val); else cur.divf.note = val; }
          else if (tag==='OBJE') { cur.divf.media.push({file:'',form:null,titl:'',note:'',date:'',scbk:'',prim:'',_extra:[]}); }
          else { cur.divf._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth = 2; _ptTarget = cur.divf._extra; }
        }
        if (lv1tag==='EVEN' && evIdx >= 0 && cur.events[evIdx]) {
          const ev = cur.events[evIdx];
          if      (tag==='DATE') ev.date = val;
          else if (tag==='PLAC') ev.place = val;
          else if (tag==='TYPE') ev.eventType = val;
          else if (tag==='NOTE') { if (val?.startsWith('@')) ev.noteRefs.push(val); else ev.note += (ev.note ? '\n' : '') + (val||''); }
          else if (tag==='SOUR') { _curCit=citationObj(val); ev.citations.push(_curCit); if (val.startsWith('@')) cur.sourceRefs.add(val); }
          else { ev._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth = 2; _ptTarget = ev._extra; }
        }
        if (lv1tag==='OBJE' && cur.media.length) {
          const _cm = cur.media[cur.media.length-1];
          if      (tag==='FILE')  _cm.file  = val;
          else if (tag==='TITL')  { _cm.title = val; _cm.titleIsLv2 = true; }
          else if (tag==='NOTE')  _cm.note  = val;
          else if (tag==='_DATE') _cm.date  = val;
          else if (tag==='_SCBK') _cm.scbk  = val;
          else if (tag==='_PRIM') _cm.prim  = val;
          else { _cm._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth=2; _ptTarget=_cm._extra; }
        }
        if (lv1tag === 'REFN' && tag === 'TYPE' && cur.refns.length) cur.refns[cur.refns.length-1].type = val;
        if (lv1tag==='NOTE' && (tag==='CONC'||tag==='CONT') && cur.noteTexts.length) cur.noteTexts[cur.noteTexts.length-1] += (tag==='CONT'?'\n':'') + val;
        if (tag==='SOUR' && val.startsWith('@')) cur.sourceRefs.add(val);
        if (lv1tag==='CHAN' && tag==='DATE') cur.lastChanged = val;
        if (lv1tag==='CHAN' && tag==='TIME') cur.lastChangedTime = val;
        if (lv1tag==='CHIL' && cur._lastChil) {
          if (!cur.childRelations[cur._lastChil]) cur.childRelations[cur._lastChil] = {frel:'',mrel:'',frelSeen:false,mrelSeen:false,frelSour:'',frelPage:'',frelQUAY:'',frelSourExtra:[],mrelSour:'',mrelPage:'',mrelQUAY:'',mrelSourExtra:[],citations:[]};
          const cref = cur.childRelations[cur._lastChil];
          if (tag==='_FREL') { cref.frel = val; cref.frelSeen = true; }
          if (tag==='_MREL') { cref.mrel = val; cref.mrelSeen = true; }
          if (tag==='SOUR' && val.startsWith('@')) { _curCit=citationObj(val); cref.citations.push(_curCit); cur.sourceRefs.add(val); }
        }
      }
      else if (lv === 3) {
        if (tag==='SOUR' && val.startsWith('@')) cur.sourceRefs.add(val);
        // Family event note continuation (MARR/ENGA/DIV/DIVF/EVEN)
        if (lv2tag === 'NOTE' && (tag==='CONC'||tag==='CONT')) {
          const _sfx = (tag==='CONT'?'\n':'') + val;
          if      (lv1tag==='MARR')                          cur.marr.note  += _sfx;
          else if (lv1tag==='ENGA'||lv1tag==='ENG')         cur.engag.note += _sfx;
          else if (lv1tag==='DIV')                           cur.div.note   += _sfx;
          else if (lv1tag==='DIVF')                          cur.divf.note  += _sfx;
          else if (lv1tag==='EVEN' && evIdx >= 0 && cur.events[evIdx]) cur.events[evIdx].note += _sfx;
        }
        if (lv1tag==='OBJE' && lv2tag==='FILE' && cur.media.length) {
          if (tag==='FORM')      { cur.media[cur.media.length-1].form  = val; _ptDepth=3; _ptTarget=cur.media[cur.media.length-1]._extra; }
          else if (tag==='TITL') { cur.media[cur.media.length-1].title = val; _ptDepth=3; _ptTarget=cur.media[cur.media.length-1]._extra; }
          else { cur.media[cur.media.length-1]._extra.push('3 ' + tag + (val ? ' ' + val : '')); _ptDepth=3; _ptTarget=cur.media[cur.media.length-1]._extra; }
        }
        if (lv1tag==='OBJE' && lv2tag==='NOTE' && (tag==='CONC'||tag==='CONT') && cur.media.length)
          cur.media[cur.media.length-1].note += (tag==='CONT' ? '\n' : '') + val;
        if (lv2tag==='DATE' && lv1tag==='CHAN' && tag==='TIME') cur.lastChangedTime = val;
        // lv=3 Sub-Tags unter 2 SOUR → direkt auf _curCit schreiben (PAGE/QUAY/NOTE/OBJE/extra)
        if (lv2tag === 'SOUR' && _curCit && tag !== 'TIME' && tag !== 'SOUR') {
          if      (tag === 'PAGE') _curCit.page = val;
          else if (tag === 'QUAY') _curCit.quay = val;
          else if (tag === 'NOTE') { _curCit.note = val || ''; _ptDepth = 3; _ptTarget = _curCit.extra; }
          else if (tag === 'OBJE' && !val?.startsWith('@')) {
            const _sm = { file:'', scbk:'', prim:'', titl:'', note:'', _extra:[] };
            _curCit.media.push(_sm); _smEntry = _sm;
          } else {
            _curCit.extra.push('3 ' + tag + (val ? ' ' + val : ''));
            _ptDepth = 3; _ptTarget = _curCit.extra;
          }
        }
        if (lv1tag==='MARR' && lv2tag==='OBJE' && cur.marr.media.length) {
          const _om = cur.marr.media[cur.marr.media.length-1];
          if      (tag==='FILE')  _om.file = val;
          else if (tag==='TITL')  _om.titl = val;
          else if (tag==='NOTE')  _om.note = val;
          else if (tag==='_DATE') _om.date = val;
          else if (tag==='_SCBK') _om.scbk = val;
          else if (tag==='_PRIM') _om.prim = val;
          else { _om._extra.push('3 '+tag+(val?' '+val:'')); _ptDepth=3; _ptTarget=_om._extra; }
        }
        if ((lv1tag==='ENGA'||lv1tag==='ENG') && lv2tag==='OBJE' && cur.engag.media.length) {
          const _om = cur.engag.media[cur.engag.media.length-1];
          if      (tag==='FILE')  _om.file = val;
          else if (tag==='TITL')  _om.titl = val;
          else if (tag==='NOTE')  _om.note = val;
          else if (tag==='_DATE') _om.date = val;
          else if (tag==='_SCBK') _om.scbk = val;
          else if (tag==='_PRIM') _om.prim = val;
          else { _om._extra.push('3 '+tag+(val?' '+val:'')); _ptDepth=3; _ptTarget=_om._extra; }
        }
        if (lv1tag==='DIV' && lv2tag==='OBJE' && cur.div.media.length) {
          const _om = cur.div.media[cur.div.media.length-1];
          if      (tag==='FILE')  _om.file = val;
          else if (tag==='TITL')  _om.titl = val;
          else if (tag==='NOTE')  _om.note = val;
          else if (tag==='_DATE') _om.date = val;
          else if (tag==='_SCBK') _om.scbk = val;
          else if (tag==='_PRIM') _om.prim = val;
          else { _om._extra.push('3 '+tag+(val?' '+val:'')); _ptDepth=3; _ptTarget=_om._extra; }
        }
        if (lv1tag==='DIVF' && lv2tag==='OBJE' && cur.divf.media.length) {
          const _om = cur.divf.media[cur.divf.media.length-1];
          if      (tag==='FILE')  _om.file = val;
          else if (tag==='TITL')  _om.titl = val;
          else if (tag==='NOTE')  _om.note = val;
          else if (tag==='_DATE') _om.date = val;
          else if (tag==='_SCBK') _om.scbk = val;
          else if (tag==='_PRIM') _om.prim = val;
          else { _om._extra.push('3 '+tag+(val?' '+val:'')); _ptDepth=3; _ptTarget=_om._extra; }
        }
        if (lv1tag==='CHIL' && cur._lastChil && (lv2tag==='_FREL'||lv2tag==='_MREL')) {
          if (!cur.childRelations[cur._lastChil]) cur.childRelations[cur._lastChil] = {frel:'',mrel:'',frelSeen:false,mrelSeen:false,frelSour:'',frelPage:'',frelQUAY:'',frelSourExtra:[],mrelSour:'',mrelPage:'',mrelQUAY:'',mrelSourExtra:[],citations:[]};
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
      }
      else if (lv === 4) {
        // OBJE sub-tags under 3 SOUR OBJE citation → sourceMedia entry
        if (_smEntry !== null && lv3tag === 'OBJE' && lv2tag === 'SOUR') {
          if      (tag==='FILE')  { _smEntry.file=val; _ptDepth=4; _ptTarget=_smEntry._extra; }
          else if (tag==='_SCBK') _smEntry.scbk=val;
          else if (tag==='_PRIM') _smEntry.prim=val;
          else if (tag==='TITL')  _smEntry.titl=val;
          else if (tag==='NOTE')  _smEntry.note=val;
          else { _smEntry._extra.push('4 '+tag+(val?' '+val:'')); _ptDepth=4; _ptTarget=_smEntry._extra; }
        }
        if ((lv1tag==='MARR'||lv1tag==='ENGA') && lv2tag==='OBJE' && lv3tag==='FILE') {
          const _oa = lv1tag==='MARR' ? cur.marr.media : cur.engag.media;
          if (_oa.length) {
            if (tag==='FORM') { _oa[_oa.length-1].form = val; _ptDepth=4; _ptTarget=_oa[_oa.length-1]._extra; }
            else { _oa[_oa.length-1]._extra.push('4 '+tag+(val?' '+val:'')); _ptDepth=4; _ptTarget=_oa[_oa.length-1]._extra; }
          }
        }
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
      if (lv === 4 && inMap && (mapParent === 'MARR' || mapParent === 'ENGA' || mapParent === 'ENG' || mapParent === 'DIV' || mapParent === 'DIVF' || mapParent === 'EVEN')) {
        const coord = parseGeoCoord(val);
        if (mapParent === 'EVEN' && evIdx >= 0 && cur.events[evIdx]) {
          if (tag==='LATI') cur.events[evIdx].lati = coord;
          if (tag==='LONG') cur.events[evIdx].long = coord;
        } else {
          const evObj = (mapParent==='ENGA'||mapParent==='ENG') ? cur.engag : mapParent==='DIV' ? cur.div : mapParent==='DIVF' ? cur.divf : cur.marr;
          if (tag==='LATI') evObj.lati = coord;
          if (tag==='LONG') evObj.long = coord;
        }
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
        else if (tag==='TEXT') { cur.text = val; cur._textSeen = true; }
        else if (tag==='NOTE') { if (val.startsWith('@')) cur.noteRefs.push(val); else { cur.note = val; } }
        else if (tag==='CHAN') { /* context-only */ }
        else if (tag==='DATA') { /* context-only — sub-tags handled at lv=2 */ }
        else if (tag==='_DATE') { cur._date = val; }
        else if (tag==='_GRAMPS_ID') { cur.grampId = val; }
        else if (tag==='OBJE') {
          if (val && val.startsWith('@')) {
            // Referenz auf externen OBJE-Record → verbatim passthrough
            cur._passthrough.push('1 OBJE ' + val); _ptDepth = 1;
          } else {
            cur.media.push({ file:'', title:'', form:null, titleIsLv2:false, note:'', date:'', scbk:'', prim:'', _extra:[] });
          }
        }
        else if (tag === 'REFN') { cur.refns.push({val:val||'', type:''}); }
        else {
          // Unknown lv1 tag (incl. DATA, etc.) → verbatim passthrough
          cur._passthrough.push('1 ' + tag + (val ? ' ' + val : ''));
          _ptDepth = 1;
        }
      }
      else if (lv === 2) {
        if (lv1tag==='OBJE' && cur.media.length) {
          const _cm = cur.media[cur.media.length-1];
          if      (tag==='FILE')  _cm.file  = val;
          else if (tag==='TITL')  { _cm.title = val; _cm.titleIsLv2 = true; }
          else if (tag==='NOTE')  _cm.note  = val;
          else if (tag==='_DATE') _cm.date  = val;
          else if (tag==='_SCBK') _cm.scbk  = val;
          else if (tag==='_PRIM') _cm.prim  = val;
          else { _cm._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth=2; _ptTarget=_cm._extra; }
        }
        if ((tag==='CONC'||tag==='CONT') && lv1tag==='TITL') cur.title  += (tag==='CONT'?'\n':'') + val;
        if ((tag==='CONC'||tag==='CONT') && lv1tag==='TEXT') cur.text   += (tag==='CONT'?'\n':'') + val;
        if ((tag==='CONC'||tag==='CONT') && lv1tag==='NOTE') cur.note   += (tag==='CONT'?'\n':'') + val;
        if ((tag==='CONC'||tag==='CONT') && lv1tag==='AUTH') cur.author += (tag==='CONT'?'\n':'') + val;
        if ((tag==='CONC'||tag==='CONT') && lv1tag==='PUBL') cur.publ   += (tag==='CONT'?'\n':'') + val;
        if ((tag==='CONC'||tag==='CONT') && lv1tag==='ABBR') cur.abbr   += (tag==='CONT'?'\n':'') + val;
        if (lv1tag==='CHAN' && tag==='DATE') cur.lastChanged = val;
        if (lv1tag==='REPO' && tag==='CALN') { cur.repoCallNum = val; }
        if (lv1tag==='REFN' && tag==='TYPE' && cur.refns.length) cur.refns[cur.refns.length-1].type = val;
        if (lv1tag==='DATA' && tag==='AGNC') cur.agnc = val;
        else if (lv1tag==='DATA' && tag==='EVEN') { cur.dataEvens.push({evens:val||'',date:'',plac:''}); }
        else if (lv1tag==='DATA' && tag !== 'AGNC' && tag !== 'EVEN') { cur.dataExtra.push('2 '+tag+(val?' '+val:'')); _ptDepth=2; _ptTarget=cur.dataExtra; }
      }
      else if (lv === 3) {
        if (lv1tag==='OBJE' && lv2tag==='FILE' && cur.media.length) {
          if (tag==='FORM')      { cur.media[cur.media.length-1].form  = val; _ptDepth=3; _ptTarget=cur.media[cur.media.length-1]._extra; }
          else if (tag==='TITL') { cur.media[cur.media.length-1].title = val; _ptDepth=3; _ptTarget=cur.media[cur.media.length-1]._extra; }
          else { cur.media[cur.media.length-1]._extra.push('3 ' + tag + (val ? ' ' + val : '')); _ptDepth=3; _ptTarget=cur.media[cur.media.length-1]._extra; }
        }
        if (lv1tag==='OBJE' && lv2tag==='NOTE' && (tag==='CONC'||tag==='CONT') && cur.media.length)
          cur.media[cur.media.length-1].note += (tag==='CONT' ? '\n' : '') + val;
        if (lv1tag==='REPO' && lv2tag==='CALN' && tag==='MEDI') cur.repoCallMedi = val;
        else if (lv1tag==='REPO' && lv2tag==='CALN') { cur.repoCallNumExtra.push('3 ' + tag + (val ? ' ' + val : '')); _ptDepth=3; _ptTarget=cur.repoCallNumExtra; }
        if (lv1tag==='DATA' && lv2tag==='EVEN' && cur.dataEvens.length) {
          const _de = cur.dataEvens[cur.dataEvens.length-1];
          if      (tag==='DATE') _de.date = val;
          else if (tag==='PLAC') _de.plac = val;
          else { cur.dataExtra.push('3 ' + tag + (val ? ' ' + val : '')); _ptDepth=3; _ptTarget=cur.dataExtra; }
        }
        if (lv1tag==='CHAN' && tag==='TIME') cur.lastChangedTime = val;
      }
    }

    // ── NOTE record ──
    if (curType === 'NOTE') {
      if (tag==='CONC') cur.text += val;
      else if (tag==='CONT') cur.text += '\n' + val;
      else if (lv===1 && tag==='CHAN') { /* context-only */ }
      else if (lv===2 && lv1tag==='CHAN' && tag==='DATE') cur.lastChanged = val;
      else if (lv===3 && lv1tag==='CHAN' && tag==='TIME') cur.lastChangedTime = val;
      else {
        cur._passthrough.push(lv + ' ' + tag + (val ? ' ' + val : ''));
        if (lv === 1) _ptDepth = 1;
      }
    }

    // ── REPO record ──
    if (curType === 'REPO') {
      if (lv === 1) {
        if (tag==='NAME')       cur.name  = val;
        else if (tag==='ADDR') { cur.addr = val; if (!cur.addrExtra) cur.addrExtra=[]; _ptDepth=1; _ptTarget=cur.addrExtra; }
        else if (tag==='PHON')  cur.phon  = val;
        else if (tag==='WWW')   cur.www   = val;
        else if (tag==='EMAIL') cur.email = val;
        else if (tag==='CHAN') { /* context-only */ }
        else { cur._passthrough.push('1 '+tag+(val?' '+val:'')); _ptDepth=1; _ptTarget=cur._passthrough; }
      } else if (lv === 2) {
        if (lv1tag==='ADDR' && tag==='CONT') cur.addr += '\n' + val;
        if (lv1tag==='CHAN' && tag==='DATE') cur.lastChanged = val;
      } else if (lv === 3) {
        if (lv1tag==='CHAN' && tag==='TIME') cur.lastChangedTime = val;
      }
    }
  }

  // Merge FAM-side childRelations into INDI-side famc
  // Ancestris writes _FREL/_MREL/SOUR on both sides; if only FAM-side has data, copy to INDI-side.
  for (const [famId, fam] of Object.entries(families)) {
    for (const [childId, cref] of Object.entries(fam.childRelations)) {
      const person = individuals[childId];
      if (!person) continue;
      const famcEntry = person.famc.find(f => f.famId === famId);
      if (!famcEntry) continue;
      // frel/mrel: nur kopieren wenn INDI-Seite noch leer
      if (!famcEntry.frelSeen && !famcEntry.mrelSeen) {
        if (cref.frelSeen) { famcEntry.frel = cref.frel; famcEntry.frelSeen = true; }
        if (cref.mrelSeen) { famcEntry.mrel = cref.mrel; famcEntry.mrelSeen = true; }
      }
      // Quellen: immer kopieren wenn INDI-Seite noch keine hat (unabhängig von frelSeen)
      if (!famcEntry.citations.length) {
        const _normSid = s => s ? s.replace(/^@@/, '@').replace(/@@$/, '@').trim() : s;
        for (const c of (cref.citations || [])) {
          const ns = _normSid(c.sid);
          if (!famcEntry.citations.some(x => x.sid === ns && x.page === c.page))
            famcEntry.citations.push({ ...c, sid: ns });
        }
        const _addCit = (raw, page, quay) => {
          if (!raw) return;
          const ns = _normSid(raw);
          if (!famcEntry.citations.some(x => x.sid === ns))
            famcEntry.citations.push(citationObj(ns, page || '', quay || ''));
        };
        _addCit(cref.frelSour, cref.frelPage, cref.frelQUAY);
        if (cref.mrelSour !== cref.frelSour) _addCit(cref.mrelSour, cref.mrelPage, cref.mrelQUAY);
      }
    }
  }

  // Resolve NOTE references + build noteText from noteTexts[] + referenced notes
  // _noteOrig preserves the original inline-only text so the writer doesn't double-write refs
  const _resolveNoteRefs = (obj) => {
    obj._noteOrig = obj.note;
    for (const ref of (obj.noteRefs || [])) {
      if (ref && notes[ref]) obj.note = (obj.note ? obj.note + '\n' : '') + notes[ref].text;
    }
  };
  for (const p of Object.values(individuals)) {
    p.noteText = p.noteTexts.join('\n');
    for (const ref of p.noteRefs) {
      if (ref && notes[ref]) p.noteText += (p.noteText ? '\n' : '') + notes[ref].text;
    }
    _resolveNoteRefs(p.birth); _resolveNoteRefs(p.chr);
    _resolveNoteRefs(p.death); _resolveNoteRefs(p.buri);
    for (const ev of (p.events || [])) _resolveNoteRefs(ev);
  }
  for (const f of Object.values(families)) {
    f.noteText = f.noteTexts.join('\n');
    for (const ref of f.noteRefs) {
      if (ref && notes[ref]) f.noteText += (f.noteText ? '\n' : '') + notes[ref].text;
    }
    _resolveNoteRefs(f.marr); _resolveNoteRefs(f.engag);
    _resolveNoteRefs(f.div);  _resolveNoteRefs(f.divf);
    for (const ev of (f.events || [])) _resolveNoteRefs(ev);
  }
  for (const s of Object.values(sources)) {
    s.noteText = s.note;
    for (const ref of (s.noteRefs || [])) {
      if (ref && notes[ref]) s.noteText += (s.noteText ? '\n' : '') + notes[ref].text;
    }
  }

  // Collect distinct eventType values per event tag from all INDI and FAM events
  const _etMap = {};
  const _etAdd = (tag, val) => { if (!val) return; if (!_etMap[tag]) _etMap[tag] = new Set(); _etMap[tag].add(val); };
  for (const p of Object.values(individuals))
    for (const ev of (p.events || [])) _etAdd(ev.type, ev.eventType);
  for (const f of Object.values(families))
    for (const ev of (f.events || [])) _etAdd(ev.type, ev.eventType);
  const eventTypesByTag = Object.fromEntries(Object.entries(_etMap).map(([k, s]) => [k, [...s].sort((a, b) => a.localeCompare(b))]));

  // _PRIM Y → Foto an Position 0 schieben (nur wenn vorhanden, keine neuen erzeugen)
  const _primSort = arr => { if (!arr) return; const i = arr.findIndex(m => m.prim === 'Y'); if (i > 0) arr.unshift(arr.splice(i, 1)[0]); };
  for (const p of Object.values(individuals)) _primSort(p.media);
  for (const f of Object.values(families)) {
    _primSort(f.media);
    _primSort(f.marr?.media); _primSort(f.engag?.media); _primSort(f.div?.media); _primSort(f.divf?.media);
  }
  for (const s of Object.values(sources)) _primSort(s.media);

  return { individuals, families, sources, notes, repositories, placForm, extraRecords: _extraRecords, headLines: _headLines, parseErrors: _errors, eventTypesByTag };
}



// Parse GEDCOM geo coordinate: N52.15 → 52.15, W3.48 → -3.48
function parseGeoCoord(val) {
  if (!val) return null;
  const m = val.match(/^([NSEW])([\d.]+)$/i);
  if (!m) return parseFloat(val) || null;
  const sign = (m[1].toUpperCase() === 'S' || m[1].toUpperCase() === 'W') ? -1 : 1;
  return sign * parseFloat(m[2]);
}

// Leitet hofObjects aus RESI/PROP-Event-Koordinaten ab (Roundtrip-Fallback).
// Wird nach parseGEDCOM() aufgerufen und mit loadHofObjects() gemergt —
// localStorage-Einträge überschreiben GEDCOM-abgeleitete Werte.
function _derivedHofObjectsFromDb(db) {
  const hof = {};
  for (const p of Object.values(db.individuals || {})) {
    for (const ev of p.events || []) {
      if ((ev.type !== 'RESI' && ev.type !== 'PROP') || !ev.addr) continue;
      const _hasCoords = ev.lati != null && ev.long != null;
      const _refNote = (ev.noteRefs || []).map(r => db.notes?.[r]?.text).find(t => t);
      const _evNote = _refNote || ev._noteOrig || '';
      if (!_hasCoords && !_evNote) continue;
      const addr = ev.addr.trim();
      if (!hof[addr]) hof[addr] = { addr };
      if (_hasCoords && hof[addr].lat == null) { hof[addr].lat = ev.lati; hof[addr].long = ev.long; }
      if (!hof[addr].note && _evNote) hof[addr].note = _evNote;
    }
  }
  return hof;
}

// ─────────────────────────────────────
//  GRAMPS-ERKENNUNG
// ─────────────────────────────────────
// Erkennt ob ein GEDCOM-Text ein GRAMPS-Export ist.
// Heuristiken (OR-verknüpft):
//   1. HEAD → 1 SOUR GRAMPS
//   2. Vorkommen von _GRAMPS_ID-Tags (GRAMPS schreibt diese in INDI/FAM/SOUR)
// Gibt { isGramps: bool, sourceName: string } zurück.
function detectGRAMPS(text) {
  if (!text) return { isGramps: false, sourceName: '' };
  const sourceMatch = text.match(/^1 SOUR\s+(\S+)/m);
  const sourceName = sourceMatch ? sourceMatch[1] : '';
  const isGramps = /^1 SOUR\s+GRAMPS\b/im.test(text) ||
                   /^\d+ _GRAMPS_ID\b/m.test(text);
  return { isGramps, sourceName };
}

