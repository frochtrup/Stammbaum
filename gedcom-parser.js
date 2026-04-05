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
  let lastSourVal = ''; // last seen 2 SOUR @id@ value (for 3 PAGE lookup)
  let _curNoteIsInline = false; // true when 1 NOTE was inline (not a @ref@)
  let _curExtraNameIdx = -1;   // index into cur.extraNames when parsing 2nd+ NAME
  let _ptDepth = 0;  // verbatim-passthrough depth (0 = off)
  let _ptTarget = null; // redirect capture target (null = cur._passthrough)
  let _smEntry = null;  // structured sourceMedia entry being parsed (OBJE under SOUR citation)

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
    if (lv > 4) {
      _errors.push({ line: lineNo, lv, tag, val, raw: line, msg: `Level ${lv} überschreitet das Maximum (4)` });
      // kein continue: Passthrough-Mechanismus (weiter unten) fängt Zeilen ab
      // die noch in einem _ptDepth-Block sind (z.B. 5 TYPE unter 4 FORM unter 3 OBJE)
    }
    if (prevLv >= 0 && lv > prevLv + 1) {
      _errors.push({ line: lineNo, lv, tag, val, raw: line, msg: `Level-Sprung von ${prevLv} auf ${lv} (erwartet max. ${prevLv + 1})` });
    }
    prevLv = lv;

    // ── Level 0 ──
    if (lv === 0) {
      lv1tag = lv2tag = lv3tag = '';
      evIdx = -1; inMap = false; mapParent = ''; _ptDepth = 0; _smEntry = null;
      if (tag.startsWith('@') && val.trim() === 'INDI') {
        cur = {
          id: tag, _passthrough: [], _nameParsed: false,
          name:'', nameRaw:'', surname:'', given:'', nick:'', prefix:'', suffix:'',
          sex:'U', uid:'', topSources:[],
          birth:{ date:null, place:null, lati:null, long:null, sources:[], sourcePages:{}, sourceQUAY:{}, sourceNote:{}, sourceExtra:{}, sourceMedia:{}, _extra:[], value:'', seen:false, note:'' },
          death:{ date:null, place:null, lati:null, long:null, sources:[], sourcePages:{}, sourceQUAY:{}, sourceNote:{}, sourceExtra:{}, sourceMedia:{}, _extra:[], cause:'', value:'', seen:false, note:'' },
          chr:{ date:null, place:null, lati:null, long:null, sources:[], sourcePages:{}, sourceQUAY:{}, sourceNote:{}, sourceExtra:{}, sourceMedia:{}, _extra:[], value:'', seen:false, note:'' },
          buri:{ date:null, place:null, lati:null, long:null, sources:[], sourcePages:{}, sourceQUAY:{}, sourceNote:{}, sourceExtra:{}, sourceMedia:{}, _extra:[], value:'', seen:false, note:'' },
          events:[], famc:[], fams:[],
          noteRefs:[], noteTexts:[], noteText:'', noteTextInline:'',
          extraNames:[],
          media:[], titl:'', reli:'', resn:'', email:'', www:'', _stat:null, lastChanged:'', lastChangedTime:'',
          nameSources:[], nameSourcePages:{}, nameSourceQUAY:{}, nameSourceNote:{}, nameSourceExtra:{}, nameSourceMedia:{},
          topSourcePages:{}, topSourceQUAY:{}, topSourceExtra:{}, sourceRefs: new Set()
        };
        individuals[tag] = cur; curType = 'INDI';
      } else if (tag.startsWith('@') && val.trim() === 'FAM') {
        const _famEv = () => ({date:null,place:null,lati:null,long:null,sources:[],sourcePages:{},sourceQUAY:{},sourceNote:{},sourceExtra:{},sourceMedia:{},value:'',seen:false,note:'',noteRefs:[],_extra:[],media:[]});
        cur = { id:tag, _passthrough: [], husb:null, wife:null, children:[], childRelations:{}, _lastChil:null, marr:{..._famEv(),addr:''}, engag:_famEv(), div:_famEv(), divf:_famEv(), events:[], _stat:null, noteRefs:[], noteTexts:[], noteText:'', noteTextInline:'', sourceRefs: new Set(), media:[], lastChanged:'', lastChangedTime:'' };
        families[tag] = cur; curType = 'FAM';
      } else if (tag.startsWith('@') && val.trim() === 'SOUR') {
        cur = { id:tag, _passthrough: [], title:'', abbr:'', author:'', date:'', publ:'', repo:'', repoCallNum:'', text:'', agnc:'', dataExtra:[], media:[], _date:'', lastChanged:'', lastChangedTime:'' };
        sources[tag] = cur; curType = 'SOUR';
      } else if (tag.startsWith('@') && /^NOTE\b/.test(val.trim())) {
        const _noteinit = val.trim().slice(4).trim(); // text after 'NOTE' on same line
        cur = { id:tag, text: _noteinit, _passthrough: [], lastChanged:'', lastChangedTime:'' };
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
    if (lv === 1) { lv1tag = tag; lv2tag = ''; lv3tag = ''; inMap = false; mapParent = ''; lastSourVal = ''; _curNoteIsInline = false; _curExtraNameIdx = -1; _smEntry = null; }
    if (lv === 2) { lv2tag = tag; lv3tag = ''; if (tag !== 'MAP') inMap = false; if (tag === 'SOUR') lastSourVal = val; _smEntry = null; }
    if (lv === 3) { lv3tag = tag; if (tag === 'MAP') { inMap = true; mapParent = lv1tag; } else { inMap = false; } if (tag === 'SOUR') lastSourVal = val; _smEntry = null; }

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
            cur.extraNames.push({ nameRaw:val||'', given:giv2, surname:surn2, prefix:'', suffix:'', type:'', sources:[], sourcePages:{}, sourceQUAY:{}, sourceNote:{}, sourceExtra:{}, sourceMedia:{}, _extra:[] });
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
        else if (tag === 'FAMC') cur.famc.push({ famId:val, pedi:'', frel:'', mrel:'', frelSeen:false, mrelSeen:false, frelSour:'', frelPage:'', frelQUAY:'', frelSourExtra:[], mrelSour:'', mrelPage:'', mrelQUAY:'', mrelSourExtra:[], sourIds:[], sourPages:{}, sourQUAY:{}, sourExtra:{} });
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
                  'CENS','CONF','FCOM','ORDN','RETI','PROP','WILL','PROB',
                  'DSCR','IDNO','SSN'].includes(tag)) {
          cur.events.push({ type:tag, value:val, date:null, place:null, lati:null, long:null, eventType:'', note:'', addr:'', phon:[], email:[], sources:[], sourcePages:{}, sourceQUAY:{}, sourceNote:{}, sourceExtra:{}, sourceMedia:{}, media:[], _extra:[] });
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
        else if (tag === '_STAT') { cur._stat = val; }
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
            else if (tag === 'NICK') cur.nick = val;
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
          else if (tag==='NOTE') cur.birth.note=val;
          else if (tag==='SOUR') { cur.birth.sources.push(val); if (val.startsWith('@')) cur.sourceRefs.add(val); }
          else { cur.birth._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth=2; _ptTarget=cur.birth._extra; }
        }
        else if (lv1tag === 'DEAT') {
          if      (tag==='DATE') cur.death.date=val;
          else if (tag==='PLAC') cur.death.place=val;
          else if (tag==='CAUS') cur.death.cause=val;
          else if (tag==='NOTE') cur.death.note=val;
          else if (tag==='SOUR') { cur.death.sources.push(val); if (val.startsWith('@')) cur.sourceRefs.add(val); }
          else { cur.death._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth=2; _ptTarget=cur.death._extra; }
        }
        else if (lv1tag === 'CHR') {
          if      (tag==='DATE') cur.chr.date=val;
          else if (tag==='PLAC') cur.chr.place=val;
          else if (tag==='NOTE') cur.chr.note=val;
          else if (tag==='SOUR') { cur.chr.sources.push(val); if (val.startsWith('@')) cur.sourceRefs.add(val); }
          else { cur.chr._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth=2; _ptTarget=cur.chr._extra; }
        }
        else if (lv1tag === 'BURI') {
          if      (tag==='DATE') cur.buri.date=val;
          else if (tag==='PLAC') cur.buri.place=val;
          else if (tag==='NOTE') cur.buri.note=val;
          else if (tag==='SOUR') { cur.buri.sources.push(val); if (val.startsWith('@')) cur.sourceRefs.add(val); }
          else { cur.buri._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth=2; _ptTarget=cur.buri._extra; }
        }
        // Other events
        else if (evIdx >= 0 && cur.events[evIdx]) {
          const ev = cur.events[evIdx];
          if      (tag==='DATE')  ev.date = val;
          else if (tag==='PLAC')  ev.place = val;
          else if (tag==='TYPE')  ev.eventType = val;
          else if (tag==='NOTE')  ev.note += (ev.note ? '\n' : '') + val;
          else if (tag==='PHON')  ev.phon.push(val);
          else if (tag==='EMAIL') ev.email.push(val);
          else if (tag==='ADDR') { ev.addr = (ev.addr ? ev.addr + '\n' : '') + val; if (!ev.addrExtra) ev.addrExtra=[]; _ptDepth=2; _ptTarget=ev.addrExtra; }
          else if (tag==='CONC'||tag==='CONT') ev.value += (tag==='CONT'?'\n':'') + val;
          else if (tag==='SOUR') { ev.sources.push(val); if (val.startsWith('@')) cur.sourceRefs.add(val); }
          else if (tag==='OBJE') {
            if (val && val.startsWith('@')) { ev._extra.push('2 OBJE ' + val); _ptDepth = 2; _ptTarget = ev._extra; }
            else ev.media.push({ file:'', title:'', form:'', _extra:[] });
          }
          else { ev._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth = 2; _ptTarget = ev._extra; }
        }
        // Family relationship
        if (lv1tag === 'FAMC' && cur.famc.length) {
          const fref = cur.famc[cur.famc.length-1];
          if (tag==='PEDI') { fref.pedi = val; if (!fref.frelSeen) { fref.frel = val; fref.frelSeen = true; } if (!fref.mrelSeen) { fref.mrel = val; fref.mrelSeen = true; } }
          if (tag==='_FREL') { fref.frel = val; fref.frelSeen = true; }
          if (tag==='_MREL') { fref.mrel = val; fref.mrelSeen = true; }
          if (tag==='SOUR' && val.startsWith('@')) { const _ns = val.replace(/^@@/,'@').replace(/@@$/,'@'); fref.sourIds.push(_ns); cur.sourceRefs.add(_ns); }
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
        // lv=3 Tags unter 2 SOUR: NOTE → sourceNote{}; Rest → sourceExtra{}
        if (lv2tag === 'SOUR' && lastSourVal &&
            tag !== 'PAGE' && tag !== 'QUAY' && tag !== 'SOUR' && tag !== 'TIME') {
          let _seDict = null; let _snDict = null; let _smDict2 = null;
          if      (lv1tag === 'NAME') {
            if (_curExtraNameIdx >= 0 && cur.extraNames[_curExtraNameIdx]) {
              _seDict  = cur.extraNames[_curExtraNameIdx].sourceExtra  || (cur.extraNames[_curExtraNameIdx].sourceExtra  = {});
              _snDict  = cur.extraNames[_curExtraNameIdx].sourceNote   || (cur.extraNames[_curExtraNameIdx].sourceNote   = {});
              _smDict2 = cur.extraNames[_curExtraNameIdx].sourceMedia  || (cur.extraNames[_curExtraNameIdx].sourceMedia  = {});
            } else { _seDict = cur.nameSourceExtra; _snDict = cur.nameSourceNote || (cur.nameSourceNote = {}); _smDict2 = cur.nameSourceMedia; }
          }
          else if (lv1tag === 'BIRT') { _seDict = cur.birth.sourceExtra; _snDict = cur.birth.sourceNote; _smDict2 = cur.birth.sourceMedia; }
          else if (lv1tag === 'DEAT') { _seDict = cur.death.sourceExtra; _snDict = cur.death.sourceNote; _smDict2 = cur.death.sourceMedia; }
          else if (lv1tag === 'CHR')  { _seDict = cur.chr.sourceExtra;   _snDict = cur.chr.sourceNote;   _smDict2 = cur.chr.sourceMedia; }
          else if (lv1tag === 'BURI') { _seDict = cur.buri.sourceExtra;  _snDict = cur.buri.sourceNote;  _smDict2 = cur.buri.sourceMedia; }
          else if (lv1tag === 'FAMC' && cur.famc.length) _seDict = cur.famc[cur.famc.length-1].sourExtra;
          else if (evIdx >= 0 && cur.events[evIdx]) { _seDict = cur.events[evIdx].sourceExtra; _snDict = cur.events[evIdx].sourceNote; _smDict2 = cur.events[evIdx].sourceMedia; }
          if (tag === 'NOTE' && _snDict !== null) {
            _snDict[lastSourVal] = val || '';
            // CONT/CONC gehen in sourceExtra (damit sie korrekt nach NOTE ausgegeben werden)
            if (!_seDict) { /* no-op */ } else { _ptDepth = 3; _ptTarget = _seDict[lastSourVal] || (_seDict[lastSourVal] = []); }
          } else if (tag === 'OBJE' && !val.startsWith('@') && _smDict2 !== null) {
            // Inline OBJE unter SOUR-Zitation → sourceMedia{}
            if (!_smDict2[lastSourVal]) _smDict2[lastSourVal] = [];
            const _sm = { file:'', scbk:'', prim:'', titl:'', note:'', _extra:[] };
            _smDict2[lastSourVal].push(_sm);
            _smEntry = _sm;
          } else if (_seDict !== null) {
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
        else if (tag==='EVEN') { cur.events.push({ type:'EVEN', value:val, date:null, place:null, lati:null, long:null, eventType:'', note:'', sources:[], sourcePages:{}, sourceQUAY:{}, sourceNote:{}, sourceExtra:{}, sourceMedia:{}, _extra:[] }); evIdx = cur.events.length-1; }
        else if (tag==='_STAT') { cur._stat = val; }
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
          else if (tag==='SOUR') { cur.marr.sources = cur.marr.sources||[]; cur.marr.sources.push(val); if (val.startsWith('@')) cur.sourceRefs.add(val); }
          else if (tag==='NOTE') { if (val.startsWith('@')) cur.marr.noteRefs.push(val); else { cur.marr.note = val; _ptDepth=2; _ptTarget=cur.marr._extra; } }
          else if (tag==='OBJE') { cur.marr.media.push({file:'',form:'',titl:'',note:'',date:'',scbk:'',prim:'',_extra:[]}); }
          else { cur.marr._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth = 2; _ptTarget = cur.marr._extra; }
        }
        if (lv1tag==='ENGA' || lv1tag==='ENG') {
          if      (tag==='DATE') cur.engag.date = val;
          else if (tag==='PLAC') cur.engag.place = val;
          else if (tag==='SOUR') { cur.engag.sources.push(val); if (val.startsWith('@')) cur.sourceRefs.add(val); }
          else if (tag==='NOTE') { if (val.startsWith('@')) cur.engag.noteRefs.push(val); else { cur.engag.note = val; _ptDepth=2; _ptTarget=cur.engag._extra; } }
          else if (tag==='OBJE') { cur.engag.media.push({file:'',form:'',titl:'',note:'',date:'',scbk:'',prim:'',_extra:[]}); }
          else { cur.engag._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth = 2; _ptTarget = cur.engag._extra; }
        }
        if (lv1tag==='DIV') {
          if      (tag==='DATE') cur.div.date = val;
          else if (tag==='PLAC') cur.div.place = val;
          else if (tag==='SOUR') { cur.div.sources.push(val); if (val.startsWith('@')) cur.sourceRefs.add(val); }
          else if (tag==='NOTE') { if (val.startsWith('@')) cur.div.noteRefs.push(val); else { cur.div.note = val; _ptDepth=2; _ptTarget=cur.div._extra; } }
          else if (tag==='OBJE') { cur.div.media.push({file:'',form:'',titl:'',note:'',date:'',scbk:'',prim:'',_extra:[]}); }
          else { cur.div._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth = 2; _ptTarget = cur.div._extra; }
        }
        if (lv1tag==='DIVF') {
          if      (tag==='DATE') cur.divf.date = val;
          else if (tag==='PLAC') cur.divf.place = val;
          else if (tag==='SOUR') { cur.divf.sources.push(val); if (val.startsWith('@')) cur.sourceRefs.add(val); }
          else if (tag==='NOTE') { if (val.startsWith('@')) cur.divf.noteRefs.push(val); else { cur.divf.note = val; _ptDepth=2; _ptTarget=cur.divf._extra; } }
          else if (tag==='OBJE') { cur.divf.media.push({file:'',form:'',titl:'',note:'',date:'',scbk:'',prim:'',_extra:[]}); }
          else { cur.divf._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth = 2; _ptTarget = cur.divf._extra; }
        }
        if (lv1tag==='EVEN' && evIdx >= 0 && cur.events[evIdx]) {
          const ev = cur.events[evIdx];
          if      (tag==='DATE') ev.date = val;
          else if (tag==='PLAC') ev.place = val;
          else if (tag==='TYPE') ev.eventType = val;
          else if (tag==='NOTE') { ev.note += (ev.note ? '\n' : '') + (val||''); }
          else if (tag==='SOUR') { ev.sources.push(val); if (val.startsWith('@')) cur.sourceRefs.add(val); }
          else { ev._extra.push('2 ' + tag + (val ? ' ' + val : '')); _ptDepth = 2; _ptTarget = ev._extra; }
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
          if (!cur.childRelations[cur._lastChil]) cur.childRelations[cur._lastChil] = {frel:'',mrel:'',frelSeen:false,mrelSeen:false,frelSour:'',frelPage:'',frelQUAY:'',frelSourExtra:[],mrelSour:'',mrelPage:'',mrelQUAY:'',mrelSourExtra:[],sourIds:[],sourPages:{},sourQUAY:{},sourExtra:{},sourMedia:{}};
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
          else if (tag==='NOTE') { cur.marr.sourceNote[lastSourVal] = val||''; _ptDepth=3; _ptTarget=(cur.marr.sourceExtra[lastSourVal]||(cur.marr.sourceExtra[lastSourVal]=[])); }
          else if (tag==='OBJE' && !val.startsWith('@')) { if (!cur.marr.sourceMedia[lastSourVal]) cur.marr.sourceMedia[lastSourVal]=[]; const _sm={file:'',scbk:'',prim:'',titl:'',note:'',_extra:[]}; cur.marr.sourceMedia[lastSourVal].push(_sm); _smEntry=_sm; }
          else if (tag !== 'SOUR') { if (!cur.marr.sourceExtra[lastSourVal]) cur.marr.sourceExtra[lastSourVal] = []; cur.marr.sourceExtra[lastSourVal].push('3 ' + tag + (val ? ' ' + val : '')); _ptDepth = 3; _ptTarget = cur.marr.sourceExtra[lastSourVal]; }
        }
        if ((lv1tag==='ENGA'||lv1tag==='ENG') && lv2tag==='SOUR' && lastSourVal) {
          if      (tag==='PAGE') cur.engag.sourcePages[lastSourVal] = val;
          else if (tag==='QUAY') cur.engag.sourceQUAY[lastSourVal] = val;
          else if (tag==='NOTE') { cur.engag.sourceNote[lastSourVal] = val||''; _ptDepth=3; _ptTarget=(cur.engag.sourceExtra[lastSourVal]||(cur.engag.sourceExtra[lastSourVal]=[])); }
          else if (tag==='OBJE' && !val.startsWith('@')) { if (!cur.engag.sourceMedia[lastSourVal]) cur.engag.sourceMedia[lastSourVal]=[]; const _sm={file:'',scbk:'',prim:'',titl:'',note:'',_extra:[]}; cur.engag.sourceMedia[lastSourVal].push(_sm); _smEntry=_sm; }
          else if (tag !== 'SOUR') { if (!cur.engag.sourceExtra[lastSourVal]) cur.engag.sourceExtra[lastSourVal] = []; cur.engag.sourceExtra[lastSourVal].push('3 ' + tag + (val ? ' ' + val : '')); _ptDepth = 3; _ptTarget = cur.engag.sourceExtra[lastSourVal]; }
        }
        if (lv1tag==='DIV' && lv2tag==='SOUR' && lastSourVal) {
          if      (tag==='PAGE') cur.div.sourcePages[lastSourVal] = val;
          else if (tag==='QUAY') cur.div.sourceQUAY[lastSourVal] = val;
          else if (tag==='NOTE') { cur.div.sourceNote[lastSourVal] = val||''; _ptDepth=3; _ptTarget=(cur.div.sourceExtra[lastSourVal]||(cur.div.sourceExtra[lastSourVal]=[])); }
          else if (tag==='OBJE' && !val.startsWith('@')) { if (!cur.div.sourceMedia[lastSourVal]) cur.div.sourceMedia[lastSourVal]=[]; const _sm={file:'',scbk:'',prim:'',titl:'',note:'',_extra:[]}; cur.div.sourceMedia[lastSourVal].push(_sm); _smEntry=_sm; }
          else if (tag !== 'SOUR') { if (!cur.div.sourceExtra[lastSourVal]) cur.div.sourceExtra[lastSourVal] = []; cur.div.sourceExtra[lastSourVal].push('3 ' + tag + (val ? ' ' + val : '')); _ptDepth = 3; _ptTarget = cur.div.sourceExtra[lastSourVal]; }
        }
        if (lv1tag==='DIVF' && lv2tag==='SOUR' && lastSourVal) {
          if      (tag==='PAGE') cur.divf.sourcePages[lastSourVal] = val;
          else if (tag==='QUAY') cur.divf.sourceQUAY[lastSourVal] = val;
          else if (tag==='NOTE') { cur.divf.sourceNote[lastSourVal] = val||''; _ptDepth=3; _ptTarget=(cur.divf.sourceExtra[lastSourVal]||(cur.divf.sourceExtra[lastSourVal]=[])); }
          else if (tag==='OBJE' && !val.startsWith('@')) { if (!cur.divf.sourceMedia[lastSourVal]) cur.divf.sourceMedia[lastSourVal]=[]; const _sm={file:'',scbk:'',prim:'',titl:'',note:'',_extra:[]}; cur.divf.sourceMedia[lastSourVal].push(_sm); _smEntry=_sm; }
          else if (tag !== 'SOUR') { if (!cur.divf.sourceExtra[lastSourVal]) cur.divf.sourceExtra[lastSourVal] = []; cur.divf.sourceExtra[lastSourVal].push('3 ' + tag + (val ? ' ' + val : '')); _ptDepth = 3; _ptTarget = cur.divf.sourceExtra[lastSourVal]; }
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
        if (lv1tag==='EVEN' && lv2tag==='SOUR' && lastSourVal && evIdx >= 0 && cur.events[evIdx]) {
          const ev = cur.events[evIdx];
          if      (tag==='PAGE') ev.sourcePages[lastSourVal] = val;
          else if (tag==='QUAY') ev.sourceQUAY[lastSourVal] = val;
          else if (tag==='NOTE') { ev.sourceNote[lastSourVal] = val||''; _ptDepth=3; _ptTarget=(ev.sourceExtra[lastSourVal]||(ev.sourceExtra[lastSourVal]=[])); }
          else if (tag==='OBJE' && !val.startsWith('@')) { if (!ev.sourceMedia[lastSourVal]) ev.sourceMedia[lastSourVal]=[]; const _sm={file:'',scbk:'',prim:'',titl:'',note:'',_extra:[]}; ev.sourceMedia[lastSourVal].push(_sm); _smEntry=_sm; }
          else if (tag !== 'SOUR') { if (!ev.sourceExtra[lastSourVal]) ev.sourceExtra[lastSourVal]=[]; ev.sourceExtra[lastSourVal].push('3 '+tag+(val?' '+val:'')); _ptDepth=3; _ptTarget=ev.sourceExtra[lastSourVal]; }
        }
        if (lv1tag==='CHIL' && cur._lastChil && (lv2tag==='_FREL'||lv2tag==='_MREL')) {
          if (!cur.childRelations[cur._lastChil]) cur.childRelations[cur._lastChil] = {frel:'',mrel:'',frelSeen:false,mrelSeen:false,frelSour:'',frelPage:'',frelQUAY:'',frelSourExtra:[],mrelSour:'',mrelPage:'',mrelQUAY:'',mrelSourExtra:[],sourIds:[],sourPages:{},sourQUAY:{},sourExtra:{},sourMedia:{}};
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
          if (!cur.childRelations[cur._lastChil]) cur.childRelations[cur._lastChil] = {frel:'',mrel:'',frelSeen:false,mrelSeen:false,frelSour:'',frelPage:'',frelQUAY:'',frelSourExtra:[],mrelSour:'',mrelPage:'',mrelQUAY:'',mrelSourExtra:[],sourIds:[],sourPages:{},sourQUAY:{},sourExtra:{},sourMedia:{}};
          const cref = cur.childRelations[cur._lastChil];
          if      (tag==='PAGE') cref.sourPages[lastSourVal] = val;
          else if (tag==='QUAY') cref.sourQUAY[lastSourVal] = val;
          else if (tag==='OBJE' && !val.startsWith('@')) { if (!cref.sourMedia[lastSourVal]) cref.sourMedia[lastSourVal]=[]; const _sm={file:'',scbk:'',prim:'',titl:'',note:'',_extra:[]}; cref.sourMedia[lastSourVal].push(_sm); _smEntry=_sm; }
          else { if (!cref.sourExtra[lastSourVal]) cref.sourExtra[lastSourVal] = []; cref.sourExtra[lastSourVal].push('3 ' + tag + (val ? ' ' + val : '')); _ptDepth = 3; _ptTarget = cref.sourExtra[lastSourVal]; }
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
        else if (tag==='TEXT') cur.text   = val;
        else if (tag==='CHAN') { /* context-only */ }
        else if (tag==='DATA') { /* context-only — sub-tags handled at lv=2 */ }
        else if (tag==='_DATE') { cur._date = val; }
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
        if (lv1tag==='DATA' && tag==='AGNC') cur.agnc = val;
        else if (lv1tag==='DATA' && tag !== 'AGNC') { cur.dataExtra.push('2 '+tag+(val?' '+val:'')); _ptDepth=2; _ptTarget=cur.dataExtra; }
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
      if (!famcEntry.sourIds.length) {
        const _normSid = s => s ? s.replace(/^@@/, '@').replace(/@@$/, '@').trim() : s;
        for (const s of (cref.sourIds || [])) {
          const ns = _normSid(s);
          if (!famcEntry.sourIds.includes(ns)) famcEntry.sourIds.push(ns);
          if (cref.sourPages[s]) famcEntry.sourPages[ns] = cref.sourPages[s];
          if (cref.sourQUAY[s])  famcEntry.sourQUAY[ns]  = cref.sourQUAY[s];
          if (cref.sourExtra[s]) famcEntry.sourExtra[ns]  = cref.sourExtra[s];
        }
        const _addSour = (raw, page, quay) => {
          if (!raw) return;
          const ns = _normSid(raw);
          if (!famcEntry.sourIds.includes(ns)) {
            famcEntry.sourIds.push(ns);
            if (page) famcEntry.sourPages[ns] = page;
            if (quay) famcEntry.sourQUAY[ns]  = quay;
          }
        };
        _addSour(cref.frelSour, cref.frelPage, cref.frelQUAY);
        if (cref.mrelSour !== cref.frelSour) _addSour(cref.mrelSour, cref.mrelPage, cref.mrelQUAY);
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

  return { individuals, families, sources, notes, repositories, placForm, extraRecords: _extraRecords, headLines: _headLines, parseErrors: _errors };
}



// Parse GEDCOM geo coordinate: N52.15 → 52.15, W3.48 → -3.48
function parseGeoCoord(val) {
  if (!val) return null;
  const m = val.match(/^([NSEW])([\d.]+)$/i);
  if (!m) return parseFloat(val) || null;
  const sign = (m[1].toUpperCase() === 'S' || m[1].toUpperCase() === 'W') ? -1 : 1;
  return sign * parseFloat(m[2]);
}

