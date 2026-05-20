// ─────────────────────────────────────
//  GEDCOM PARSER  (v5 – sub-parsers)
// ─────────────────────────────────────

// ── Sub-Parser: INDIVIDUAL ──
function _parseINDILine(cur, x, lv, tag, val) {
  if (lv === 1) {
    x.evIdx = -1;
    if (tag === 'NAME') {
      if (cur._nameParsed) {
        const sn2 = (val||'').match(/\/([^\/]*)\//) || [];
        const surn2 = sn2[1] ? sn2[1].trim() : '';
        const giv2  = (val||'').replace(/\/[^\/]*\//, '').trim();
        cur.extraNames.push({ nameRaw:val||'', given:giv2, surname:surn2, prefix:'', suffix:'', type:'', citations:[], _extra:[], _hasGivn:false, _hasSurn:false });
        x._curExtraNameIdx = cur.extraNames.length - 1;
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
    else if (tag === 'FAMC') cur.famc.push({ famId:val, pedi:'', frel:'', mrel:'', frelSeen:false, mrelSeen:false, frelSour:'', frelPage:'', frelQUAY:'', frelSourExtra:[], mrelSour:'', mrelPage:'', mrelQUAY:'', mrelSourExtra:[], citations:[] });
    else if (tag === 'FAMS') cur.fams.push(val);
    else if (tag === 'NOTE') {
      if (!val.startsWith('@')) { cur.noteTexts.push(val); x._curNoteIsInline = true; }
      else { cur.noteRefs.push(val); x._curNoteIsInline = false; }
    }
    else if (tag === '_UID') cur.uid = val;
    else if (tag === '_GRAMPS_ID') cur.grampId = val;
    else if (tag === 'SOUR' && val.startsWith('@')) { const _ns1 = val.replace(/^@@/,'@').replace(/@@$/,'@'); cur.topSources.push(_ns1); cur.sourceRefs.add(_ns1); x.lastSourVal = _ns1; }
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
      x.evIdx = cur.events.length - 1;
    }
    else if (tag === 'OBJE') {
      if (val && val.startsWith('@')) {
        cur._passthrough.push('1 OBJE ' + val); x._ptDepth = 1;
      } else {
        cur.media.push({ file:'', title:'', form:null, medi:'', titleIsLv2:false, note:'', date:'', scbk:'', prim:'', _extra:[] });
      }
    }
    else if (tag === 'CHAN') { /* context-only, handled via lv2 */ }
    else if (tag === '_STAT') { cur._stat = val; }
    else if (tag === '_TASK') {
      x._curTask = { id: '', text: val || '', category: 'kirchenbuch', done: false, created: '' };
      cur._tasks.push(x._curTask);
    }
    else if (tag === '_RLOG') {
      const _rl = { date:'', repoRef:'', sourRef:'', query:'', result:'pending', note:'' };
      cur._rlog.push(_rl);
    }
    else if (tag === 'ASSO') {
      x._curAsso = { xref: val, rela: '', note: '', citations: [] };
      cur.associations.push(x._curAsso);
    }
    else if (tag === 'ALIA') {
      if (val && val.startsWith('@')) cur.aliases.push(val);
    }
    else if (tag === 'REFN') { cur.refns.push({val:val||'', type:''}); }
    else {
      cur._passthrough.push('1 ' + tag + (val ? ' ' + val : ''));
      x._ptDepth = 1;
    }
  }

  else if (lv === 2) {
    if (x.lv1tag === '_TASK' && x._curTask) {
      if      (tag === '_CAT')  x._curTask.category = val;
      else if (tag === '_DONE') x._curTask.done = val === '1';
      else if (tag === '_DATE') x._curTask.created = val;
      else if (tag === '_ID')   x._curTask.id = val;
    }
    else if (x.lv1tag === '_RLOG' && cur._rlog.length) {
      const _rl = cur._rlog[cur._rlog.length - 1];
      if      (tag === 'DATE') _rl.date    = val;
      else if (tag === 'REPO') _rl.repoRef = val;
      else if (tag === 'SOUR') _rl.sourRef = val;
      else if (tag === '_QUERY')  _rl.query  = val;
      else if (tag === '_RESULT') _rl.result = val;
      else if (tag === 'NOTE')    _rl.note   = val;
    }
    else if (x.lv1tag === 'ASSO' && x._curAsso) {
      if      (tag === 'RELA') x._curAsso.rela = val;
      else if (tag === 'NOTE') x._curAsso.note = (val || '');
      else if (tag === 'SOUR' && val.startsWith('@')) {
        const _ns = val.replace(/^@@/,'@').replace(/@@$/,'@');
        x._curCit = citationObj(_ns); x._curAsso.citations.push(x._curCit); cur.sourceRefs.add(_ns);
      }
    }
    else if (x.lv1tag === 'NAME') {
      if (x._curExtraNameIdx >= 0) {
        const en = cur.extraNames[x._curExtraNameIdx];
        if      (tag === 'TYPE') en.type   = val;
        else if (tag === 'GIVN') { en.given = val; en._hasGivn = true; }
        else if (tag === 'SURN') { en.surname = val; en._hasSurn = true; }
        else if (tag === 'NPFX') en.prefix  = val;
        else if (tag === 'NSFX') en.suffix  = val;
        else if (tag === 'SOUR') { x._curCit = citationObj(val); en.citations.push(x._curCit); if (val.startsWith('@')) cur.sourceRefs.add(val); }
        else if (tag === 'CONC') en.nameRaw += val;
        else if (tag === 'CONT') en.nameRaw += '\n' + val;
        else { en._extra.push('2 ' + tag + (val ? ' ' + val : '')); x._ptDepth = 2; x._ptTarget = en._extra; }
      } else {
        if      (tag === 'GIVN') {
          const starMatch = val.match(/\*(\S+)|\b(\S+)\*/);
          if (starMatch && !cur._rufname) cur._rufname = (starMatch[1] || starMatch[2]);
          cur.given = val.replace(/\*/g, '').replace(/\s{2,}/g, ' ').trim();
          cur.name = (cur.given + (cur.surname ? ' '+cur.surname : '')).trim();
          cur._hasGivn = true;
        }
        else if (tag === 'SURN') { cur.surname = val; cur.name = (cur.given + (cur.surname ? ' '+cur.surname : '')).trim(); cur._hasSurn = true; }
        else if (tag === 'NICK') cur.nick = val;
        else if (tag === '_RUFNAME') cur._rufname = val;
        else if (tag === 'NPFX') cur.prefix = val;
        else if (tag === 'NSFX') cur.suffix = val;
        else if (tag === 'SOUR') { x._curCit = citationObj(val); cur.nameCitations.push(x._curCit); if (val.startsWith('@')) cur.sourceRefs.add(val); }
        else if (tag === 'CONC') cur.nameRaw += val;
        else if (tag === 'CONT') cur.nameRaw += '\n' + val;
        else { cur._passthrough.push('2 ' + tag + (val ? ' ' + val : '')); x._ptDepth = 2; }
      }
    }
    else if (x.lv1tag === 'BIRT') {
      if      (tag==='DATE') cur.birth.date=val;
      else if (tag==='PLAC') cur.birth.place=val;
      else if (tag==='NOTE') { if (val.startsWith('@')) cur.birth.noteRefs.push(val); else cur.birth.note=val; }
      else if (tag==='SOUR') { x._curCit=citationObj(val); cur.birth.citations.push(x._curCit); if (val.startsWith('@')) cur.sourceRefs.add(val); }
      else { cur.birth._extra.push('2 ' + tag + (val ? ' ' + val : '')); x._ptDepth=2; x._ptTarget=cur.birth._extra; }
    }
    else if (x.lv1tag === 'DEAT') {
      if      (tag==='DATE') cur.death.date=val;
      else if (tag==='PLAC') cur.death.place=val;
      else if (tag==='CAUS') cur.death.cause=val;
      else if (tag==='NOTE') { if (val.startsWith('@')) cur.death.noteRefs.push(val); else cur.death.note=val; }
      else if (tag==='SOUR') { x._curCit=citationObj(val); cur.death.citations.push(x._curCit); if (val.startsWith('@')) cur.sourceRefs.add(val); }
      else { cur.death._extra.push('2 ' + tag + (val ? ' ' + val : '')); x._ptDepth=2; x._ptTarget=cur.death._extra; }
    }
    else if (x.lv1tag === 'CHR') {
      if      (tag==='DATE') cur.chr.date=val;
      else if (tag==='PLAC') cur.chr.place=val;
      else if (tag==='NOTE') { if (val.startsWith('@')) cur.chr.noteRefs.push(val); else cur.chr.note=val; }
      else if (tag==='SOUR') { x._curCit=citationObj(val); cur.chr.citations.push(x._curCit); if (val.startsWith('@')) cur.sourceRefs.add(val); }
      else { cur.chr._extra.push('2 ' + tag + (val ? ' ' + val : '')); x._ptDepth=2; x._ptTarget=cur.chr._extra; }
    }
    else if (x.lv1tag === 'BURI') {
      if      (tag==='DATE') cur.buri.date=val;
      else if (tag==='PLAC') cur.buri.place=val;
      else if (tag==='NOTE') { if (val.startsWith('@')) cur.buri.noteRefs.push(val); else cur.buri.note=val; }
      else if (tag==='SOUR') { x._curCit=citationObj(val); cur.buri.citations.push(x._curCit); if (val.startsWith('@')) cur.sourceRefs.add(val); }
      else { cur.buri._extra.push('2 ' + tag + (val ? ' ' + val : '')); x._ptDepth=2; x._ptTarget=cur.buri._extra; }
    }
    else if (x.evIdx >= 0 && cur.events[x.evIdx]) {
      const ev = cur.events[x.evIdx];
      if      (tag==='DATE')  ev.date = val;
      else if (tag==='PLAC')  ev.place = val;
      else if (tag==='TYPE')  ev.eventType = val;
      else if (tag==='NOTE') { if (val.startsWith('@')) ev.noteRefs.push(val); else ev.note += (ev.note ? '\n' : '') + val; }
      else if (tag==='PHON')  ev.phon.push(val);
      else if (tag==='EMAIL') ev.email.push(val);
      else if (tag==='ADDR') { ev.addr = (ev.addr ? ev.addr + '\n' : '') + val; if (!ev.addrExtra) ev.addrExtra=[]; x._ptDepth=2; x._ptTarget=ev.addrExtra; }
      else if (tag==='CONC'||tag==='CONT') ev.value += (tag==='CONT'?'\n':'') + val;
      else if (tag==='SOUR') { x._curCit=citationObj(val); ev.citations.push(x._curCit); if (val.startsWith('@')) cur.sourceRefs.add(val); }
      else if (tag==='OBJE') {
        if (val && val.startsWith('@')) { ev._extra.push('2 OBJE ' + val); x._ptDepth = 2; x._ptTarget = ev._extra; }
        else ev.media.push({ file:'', title:'', form:null, _extra:[] });
      }
      else { ev._extra.push('2 ' + tag + (val ? ' ' + val : '')); x._ptDepth = 2; x._ptTarget = ev._extra; }
    }
    if (x.lv1tag === 'FAMC' && cur.famc.length) {
      const fref = cur.famc[cur.famc.length-1];
      if (tag==='PEDI') { fref.pedi = val; if (!fref.frelSeen) { fref.frel = val; fref.frelSeen = true; } if (!fref.mrelSeen) { fref.mrel = val; fref.mrelSeen = true; } }
      if (tag==='_FREL') { fref.frel = val; fref.frelSeen = true; }
      if (tag==='_MREL') { fref.mrel = val; fref.mrelSeen = true; }
      if (tag==='SOUR' && val.startsWith('@')) { const _ns = val.replace(/^@@/,'@').replace(/@@$/,'@'); x._curCit = citationObj(_ns); fref.citations.push(x._curCit); cur.sourceRefs.add(_ns); }
    }
    if (x.lv1tag === 'OBJE' && cur.media.length) {
      const _cm = cur.media[cur.media.length-1];
      if      (tag==='FILE')  _cm.file  = val;
      else if (tag==='TITL')  { _cm.title = val; _cm.titleIsLv2 = true; }
      else if (tag==='NOTE')  _cm.note  = val;
      else if (tag==='_DATE' || tag==='DATE') _cm.date  = val;
      else if (tag==='_SCBK') _cm.scbk  = val;
      else if (tag==='_PRIM') _cm.prim  = val;
      else { _cm._extra.push('2 ' + tag + (val ? ' ' + val : '')); x._ptDepth=2; x._ptTarget=_cm._extra; }
    }
    if (x.lv1tag === 'CHAN' && tag==='DATE') cur.lastChanged = val;
    if (x.lv1tag === 'CHAN' && tag==='NOTE') cur.chanNote = val || '';
    if (x.lv1tag === 'SOUR' && x.lastSourVal) {
      if      (tag === 'PAGE') cur.topSourcePages[x.lastSourVal] = val;
      else if (tag === 'QUAY') cur.topSourceQUAY[x.lastSourVal] = val;
      else if (tag !== 'SOUR') {
        if (!cur.topSourceExtra[x.lastSourVal]) cur.topSourceExtra[x.lastSourVal] = [];
        cur.topSourceExtra[x.lastSourVal].push('2 ' + tag + (val ? ' ' + val : ''));
        x._ptDepth = 2; x._ptTarget = cur.topSourceExtra[x.lastSourVal];
      }
    }
    if (x.lv1tag === 'REFN' && tag === 'TYPE' && cur.refns.length) cur.refns[cur.refns.length-1].type = val;
    if (tag === 'SOUR' && val.startsWith('@')) cur.sourceRefs.add(val);
  }

  else if (lv === 3) {
    if (x.lv1tag === 'OBJE' && x.lv2tag === 'FILE' && tag === 'TITL' && cur.media.length)
      cur.media[cur.media.length-1].title = val;
    if (x.lv1tag === 'OBJE' && tag === 'TITL' && cur.media.length)
      cur.media[cur.media.length-1].title = val;
    if (x.lv1tag === 'OBJE' && x.lv2tag === 'FILE' && tag === 'FORM' && cur.media.length)
      cur.media[cur.media.length-1].form = val;
    if (x.lv1tag === 'OBJE' && x.lv2tag === 'NOTE' && (tag === 'CONC' || tag === 'CONT') && cur.media.length)
      cur.media[cur.media.length-1].note += (tag === 'CONT' ? '\n' : '') + val;
    if (x.lv2tag === 'OBJE' && x.evIdx >= 0 && cur.events[x.evIdx]?.media?.length > 0) {
      const em = cur.events[x.evIdx].media[cur.events[x.evIdx].media.length - 1];
      if      (tag === 'FILE') em.file  = val;
      else if (tag === 'TITL') em.title = val;
      else if (tag === 'FORM') em.form  = val;
      else { em._extra.push('3 ' + tag + (val ? ' ' + val : '')); x._ptDepth = 3; x._ptTarget = em._extra; }
    }
    if (x.evIdx >= 0 && x.lv2tag === 'NOTE' && (tag==='CONC'||tag==='CONT'))
      cur.events[x.evIdx].note += (tag==='CONT'?'\n':'') + val;
    if (x.evIdx < 0 && x.lv2tag === 'NOTE' && (tag==='CONC'||tag==='CONT')) {
      const _sfx = (tag==='CONT'?'\n':'') + val;
      if      (x.lv1tag==='BIRT') cur.birth.note += _sfx;
      else if (x.lv1tag==='DEAT') cur.death.note += _sfx;
      else if (x.lv1tag==='CHR')  cur.chr.note   += _sfx;
      else if (x.lv1tag==='BURI') cur.buri.note  += _sfx;
    }
    if (x.lv2tag === 'SOUR' && x._curCit && tag !== 'TIME' && tag !== 'SOUR') {
      if      (tag === 'PAGE') x._curCit.page = val;
      else if (tag === 'QUAY') x._curCit.quay = val;
      else if (tag === 'NOTE') { x._curCit.note = val || ''; x._ptDepth = 3; x._ptTarget = x._curCit.extra; }
      else if (tag === 'OBJE' && !val?.startsWith('@')) {
        const _sm = { file:'', scbk:'', prim:'', titl:'', note:'', _extra:[] };
        x._curCit.media.push(_sm); x._smEntry = _sm;
      } else {
        x._curCit.extra.push('3 ' + tag + (val ? ' ' + val : ''));
        x._ptDepth = 3; x._ptTarget = x._curCit.extra;
      }
    }
    if (x.lv1tag === 'FAMC' && cur.famc.length && tag === 'SOUR') {
      const fref = cur.famc[cur.famc.length-1];
      if (x.lv2tag === '_FREL') {
        if (!fref.frelSour) fref.frelSour = val;
        else { if (!fref.frelSourExtra) fref.frelSourExtra = []; fref.frelSourExtra.push('3 SOUR ' + val); x._ptDepth=3; x._ptTarget=fref.frelSourExtra; }
      } else if (x.lv2tag === '_MREL') {
        if (!fref.mrelSour) fref.mrelSour = val;
        else { if (!fref.mrelSourExtra) fref.mrelSourExtra = []; fref.mrelSourExtra.push('3 SOUR ' + val); x._ptDepth=3; x._ptTarget=fref.mrelSourExtra; }
      }
    }
    if (tag === 'SOUR' && val.startsWith('@')) cur.sourceRefs.add(val);
    if (x.lv1tag === 'CHAN' && tag === 'TIME') cur.lastChangedTime = val;
    if (x.lv1tag === 'CHAN' && x.lv2tag === 'NOTE' && (tag==='CONC'||tag==='CONT'))
      cur.chanNote += (tag==='CONT' ? '\n' : '') + val;
  }

  else if (lv === 4) {
    if (x._smEntry !== null && x.lv3tag === 'OBJE' && x.lv2tag === 'SOUR') {
      if      (tag==='FILE')  { x._smEntry.file=val; x._ptDepth=4; x._ptTarget=x._smEntry._extra; }
      else if (tag==='_SCBK') x._smEntry.scbk=val;
      else if (tag==='_PRIM') x._smEntry.prim=val;
      else if (tag==='TITL')  x._smEntry.titl=val;
      else if (tag==='NOTE')  x._smEntry.note=val;
      else { x._smEntry._extra.push('4 '+tag+(val?' '+val:'')); x._ptDepth=4; x._ptTarget=x._smEntry._extra; }
    }
    if (x.inMap) {
      const coord = parseGeoCoord(val);
      if      (x.mapParent === 'BIRT') { if (tag==='LATI') { cur.birth.lati=coord; cur.birth._latiStr=val; } if (tag==='LONG') { cur.birth.long=coord; cur.birth._longStr=val; } }
      else if (x.mapParent === 'DEAT') { if (tag==='LATI') { cur.death.lati=coord; cur.death._latiStr=val; } if (tag==='LONG') { cur.death.long=coord; cur.death._longStr=val; } }
      else if (x.mapParent === 'CHR')  { if (tag==='LATI') { cur.chr.lati=coord;   cur.chr._latiStr=val;   } if (tag==='LONG') { cur.chr.long=coord;   cur.chr._longStr=val;   } }
      else if (x.mapParent === 'BURI') { if (tag==='LATI') { cur.buri.lati=coord;  cur.buri._latiStr=val;  } if (tag==='LONG') { cur.buri.long=coord;  cur.buri._longStr=val;  } }
      else if (x.evIdx >= 0 && cur.events[x.evIdx]) {
        if (tag==='LATI') { cur.events[x.evIdx].lati = coord; cur.events[x.evIdx]._latiStr = val; }
        if (tag==='LONG') { cur.events[x.evIdx].long = coord; cur.events[x.evIdx]._longStr = val; }
      }
    }
    if (tag === 'SOUR' && val.startsWith('@')) cur.sourceRefs.add(val);
    if (x.lv1tag === 'OBJE' && cur.media.length) {
      const _cm4 = cur.media[cur.media.length-1];
      if (x.lv2tag === 'FILE' && x.lv3tag === 'FORM' && (tag === 'MEDI' || tag === 'TYPE'))
        _cm4.medi = val.toLowerCase();
      else
        _cm4._extra.push('4 ' + tag + (val ? ' ' + val : ''));
    }
    if (x.lv2tag === 'OBJE' && x.evIdx >= 0 && cur.events[x.evIdx]?.media?.length > 0) {
      const _em4 = cur.events[x.evIdx].media[cur.events[x.evIdx].media.length - 1];
      if (x.lv3tag === 'FILE' && tag === 'FORM') _em4.form = val;
      else _em4._extra.push('4 ' + tag + (val ? ' ' + val : ''));
    }
    if (x.lv1tag === 'FAMC' && x.lv3tag === 'SOUR' && cur.famc.length) {
      const fref = cur.famc[cur.famc.length-1];
      if (x.lv2tag === '_FREL') {
        if      (tag === 'PAGE') fref.frelPage = val;
        else if (tag === 'QUAY') fref.frelQUAY = val;
        else { fref.frelSourExtra.push('4 ' + tag + (val ? ' ' + val : '')); x._ptDepth = 4; x._ptTarget = fref.frelSourExtra; }
      } else if (x.lv2tag === '_MREL') {
        if      (tag === 'PAGE') fref.mrelPage = val;
        else if (tag === 'QUAY') fref.mrelQUAY = val;
        else { fref.mrelSourExtra.push('4 ' + tag + (val ? ' ' + val : '')); x._ptDepth = 4; x._ptTarget = fref.mrelSourExtra; }
      }
    }
  }

  if (x.lv1tag === 'NOTE' && lv > 1 && (tag==='CONC'||tag==='CONT')) {
    const _nadd = (tag==='CONT'?'\n':'') + val;
    if (x._curNoteIsInline && cur.noteTexts.length) cur.noteTexts[cur.noteTexts.length-1] += _nadd;
  }
}

// ── Sub-Parser: FAMILY ──
function _parseFAMLine(cur, x, lv, tag, val) {
  if (lv === 1) {
    if (tag==='HUSB') cur.husb = val;
    else if (tag==='WIFE') cur.wife = val;
    else if (tag==='CHIL') { cur.children.push(val); cur._lastChil = val; }
    else if (tag==='NOTE') {
      if (!val.startsWith('@')) { cur.noteTexts.push(val); x._curNoteIsInline = true; }
      else { cur.noteRefs.push(val); x._curNoteIsInline = false; }
    }
    else if (tag==='SOUR' && val.startsWith('@')) cur.sourceRefs.add(val);
    else if (tag==='MARR') { cur.marr.seen  = true; cur.marr.value  = val; }
    else if (tag==='ENGA') { cur.engag.seen = true; cur.engag.value = val; }
    else if (tag==='ENG')  { cur.engag.seen = true; cur.engag.value = val; }
    else if (tag==='DIV')  { cur.div.seen   = true; cur.div.value   = val; }
    else if (tag==='DIVF') { cur.divf.seen  = true; cur.divf.value  = val; }
    else if (tag==='CHAN') { /* context-only */ }
    else if (tag==='EVEN') { cur.events.push({ type:'EVEN', value:val, date:null, place:null, lati:null, long:null, eventType:'', note:'', noteRefs:[], citations:[], _extra:[] }); x.evIdx = cur.events.length-1; }
    else if (tag==='_STAT') { cur._stat = val; }
    else if (tag==='_GRAMPS_ID') { cur.grampId = val; }
    else if (tag==='OBJE') {
      if (val && val.startsWith('@')) {
        cur._passthrough.push('1 OBJE ' + val); x._ptDepth = 1;
      } else {
        cur.media.push({ file:'', title:'', form:null, medi:'', titleIsLv2:false, note:'', date:'', scbk:'', prim:'', _extra:[] });
      }
    }
    else if (tag === '_TASK') {
      x._curTask = { id: '', text: val || '', category: 'kirchenbuch', done: false, created: '' };
      cur._tasks.push(x._curTask);
    }
    else if (tag === '_RLOG') {
      const _rl = { date:'', repoRef:'', sourRef:'', query:'', result:'pending', note:'' };
      cur._rlog.push(_rl);
    }
    else if (tag === 'REFN') { cur.refns.push({val:val||'', type:''}); }
    else {
      cur._passthrough.push('1 ' + tag + (val ? ' ' + val : ''));
      x._ptDepth = 1;
    }
  }
  else if (lv === 2) {
    if (x.lv1tag === '_TASK' && x._curTask) {
      if      (tag === '_CAT')  x._curTask.category = val;
      else if (tag === '_DONE') x._curTask.done = val === '1';
      else if (tag === '_DATE') x._curTask.created = val;
      else if (tag === '_ID')   x._curTask.id = val;
    }
    else if (x.lv1tag === '_RLOG' && cur._rlog.length) {
      const _rl = cur._rlog[cur._rlog.length - 1];
      if      (tag === 'DATE') _rl.date    = val;
      else if (tag === 'REPO') _rl.repoRef = val;
      else if (tag === 'SOUR') _rl.sourRef = val;
      else if (tag === '_QUERY')  _rl.query  = val;
      else if (tag === '_RESULT') _rl.result = val;
      else if (tag === 'NOTE')    _rl.note   = val;
    }
    else if (x.lv1tag==='MARR') {
      if (tag==='DATE') cur.marr.date=val;
      else if (tag==='PLAC') cur.marr.place=val;
      else if (tag==='ADDR') cur.marr.addr=val;
      else if (tag==='SOUR') { x._curCit=citationObj(val); cur.marr.citations.push(x._curCit); if (val.startsWith('@')) cur.sourceRefs.add(val); }
      else if (tag==='NOTE') { if (val.startsWith('@')) cur.marr.noteRefs.push(val); else cur.marr.note = val; }
      else if (tag==='OBJE') { cur.marr.media.push({file:'',form:null,titl:'',note:'',date:'',scbk:'',prim:'',_extra:[]}); }
      else { cur.marr._extra.push('2 ' + tag + (val ? ' ' + val : '')); x._ptDepth = 2; x._ptTarget = cur.marr._extra; }
    }
    if (x.lv1tag==='ENGA' || x.lv1tag==='ENG') {
      if      (tag==='DATE') cur.engag.date = val;
      else if (tag==='PLAC') cur.engag.place = val;
      else if (tag==='SOUR') { x._curCit=citationObj(val); cur.engag.citations.push(x._curCit); if (val.startsWith('@')) cur.sourceRefs.add(val); }
      else if (tag==='NOTE') { if (val.startsWith('@')) cur.engag.noteRefs.push(val); else cur.engag.note = val; }
      else if (tag==='OBJE') { cur.engag.media.push({file:'',form:null,titl:'',note:'',date:'',scbk:'',prim:'',_extra:[]}); }
      else { cur.engag._extra.push('2 ' + tag + (val ? ' ' + val : '')); x._ptDepth = 2; x._ptTarget = cur.engag._extra; }
    }
    if (x.lv1tag==='DIV') {
      if      (tag==='DATE') cur.div.date = val;
      else if (tag==='PLAC') cur.div.place = val;
      else if (tag==='SOUR') { x._curCit=citationObj(val); cur.div.citations.push(x._curCit); if (val.startsWith('@')) cur.sourceRefs.add(val); }
      else if (tag==='NOTE') { if (val.startsWith('@')) cur.div.noteRefs.push(val); else cur.div.note = val; }
      else if (tag==='OBJE') { cur.div.media.push({file:'',form:null,titl:'',note:'',date:'',scbk:'',prim:'',_extra:[]}); }
      else { cur.div._extra.push('2 ' + tag + (val ? ' ' + val : '')); x._ptDepth = 2; x._ptTarget = cur.div._extra; }
    }
    if (x.lv1tag==='DIVF') {
      if      (tag==='DATE') cur.divf.date = val;
      else if (tag==='PLAC') cur.divf.place = val;
      else if (tag==='SOUR') { x._curCit=citationObj(val); cur.divf.citations.push(x._curCit); if (val.startsWith('@')) cur.sourceRefs.add(val); }
      else if (tag==='NOTE') { if (val.startsWith('@')) cur.divf.noteRefs.push(val); else cur.divf.note = val; }
      else if (tag==='OBJE') { cur.divf.media.push({file:'',form:null,titl:'',note:'',date:'',scbk:'',prim:'',_extra:[]}); }
      else { cur.divf._extra.push('2 ' + tag + (val ? ' ' + val : '')); x._ptDepth = 2; x._ptTarget = cur.divf._extra; }
    }
    if (x.lv1tag==='EVEN' && x.evIdx >= 0 && cur.events[x.evIdx]) {
      const ev = cur.events[x.evIdx];
      if      (tag==='DATE') ev.date = val;
      else if (tag==='PLAC') ev.place = val;
      else if (tag==='TYPE') ev.eventType = val;
      else if (tag==='NOTE') { if (val?.startsWith('@')) ev.noteRefs.push(val); else ev.note += (ev.note ? '\n' : '') + (val||''); }
      else if (tag==='SOUR') { x._curCit=citationObj(val); ev.citations.push(x._curCit); if (val.startsWith('@')) cur.sourceRefs.add(val); }
      else { ev._extra.push('2 ' + tag + (val ? ' ' + val : '')); x._ptDepth = 2; x._ptTarget = ev._extra; }
    }
    if (x.lv1tag==='OBJE' && cur.media.length) {
      const _cm = cur.media[cur.media.length-1];
      if      (tag==='FILE')  _cm.file  = val;
      else if (tag==='TITL')  { _cm.title = val; _cm.titleIsLv2 = true; }
      else if (tag==='NOTE')  _cm.note  = val;
      else if (tag==='_DATE') _cm.date  = val;
      else if (tag==='_SCBK') _cm.scbk  = val;
      else if (tag==='_PRIM') _cm.prim  = val;
      else { _cm._extra.push('2 ' + tag + (val ? ' ' + val : '')); x._ptDepth=2; x._ptTarget=_cm._extra; }
    }
    if (x.lv1tag === 'REFN' && tag === 'TYPE' && cur.refns.length) cur.refns[cur.refns.length-1].type = val;
    if (x.lv1tag==='NOTE' && (tag==='CONC'||tag==='CONT') && cur.noteTexts.length) cur.noteTexts[cur.noteTexts.length-1] += (tag==='CONT'?'\n':'') + val;
    if (tag==='SOUR' && val.startsWith('@')) cur.sourceRefs.add(val);
    if (x.lv1tag==='CHAN' && tag==='DATE') cur.lastChanged = val;
    if (x.lv1tag==='CHAN' && tag==='TIME') cur.lastChangedTime = val;
    if (x.lv1tag==='CHAN' && tag==='NOTE') cur.chanNote = val || '';
    if (x.lv1tag==='CHIL' && cur._lastChil) {
      if (!cur.childRelations[cur._lastChil]) cur.childRelations[cur._lastChil] = {frel:'',mrel:'',frelSeen:false,mrelSeen:false,frelSour:'',frelPage:'',frelQUAY:'',frelSourExtra:[],mrelSour:'',mrelPage:'',mrelQUAY:'',mrelSourExtra:[],citations:[]};
      const cref = cur.childRelations[cur._lastChil];
      if (tag==='_FREL') { cref.frel = val; cref.frelSeen = true; }
      if (tag==='_MREL') { cref.mrel = val; cref.mrelSeen = true; }
      if (tag==='SOUR' && val.startsWith('@')) { x._curCit=citationObj(val); cref.citations.push(x._curCit); cur.sourceRefs.add(val); }
    }
  }
  else if (lv === 3) {
    if (tag==='SOUR' && val.startsWith('@')) cur.sourceRefs.add(val);
    if (x.lv2tag === 'NOTE' && (tag==='CONC'||tag==='CONT')) {
      const _sfx = (tag==='CONT'?'\n':'') + val;
      if      (x.lv1tag==='MARR')                          cur.marr.note  += _sfx;
      else if (x.lv1tag==='ENGA'||x.lv1tag==='ENG')       cur.engag.note += _sfx;
      else if (x.lv1tag==='DIV')                           cur.div.note   += _sfx;
      else if (x.lv1tag==='DIVF')                          cur.divf.note  += _sfx;
      else if (x.lv1tag==='EVEN' && x.evIdx >= 0 && cur.events[x.evIdx]) cur.events[x.evIdx].note += _sfx;
    }
    if (x.lv1tag==='OBJE' && x.lv2tag==='FILE' && cur.media.length) {
      if (tag==='FORM')      { cur.media[cur.media.length-1].form  = val; x._ptDepth=3; x._ptTarget=cur.media[cur.media.length-1]._extra; }
      else if (tag==='TITL') { cur.media[cur.media.length-1].title = val; x._ptDepth=3; x._ptTarget=cur.media[cur.media.length-1]._extra; }
      else { cur.media[cur.media.length-1]._extra.push('3 ' + tag + (val ? ' ' + val : '')); x._ptDepth=3; x._ptTarget=cur.media[cur.media.length-1]._extra; }
    }
    if (x.lv1tag==='OBJE' && x.lv2tag==='NOTE' && (tag==='CONC'||tag==='CONT') && cur.media.length)
      cur.media[cur.media.length-1].note += (tag==='CONT' ? '\n' : '') + val;
    if (x.lv2tag==='DATE' && x.lv1tag==='CHAN' && tag==='TIME') cur.lastChangedTime = val;
    if (x.lv1tag==='CHAN' && x.lv2tag==='NOTE' && (tag==='CONC'||tag==='CONT'))
      cur.chanNote += (tag==='CONT' ? '\n' : '') + val;
    if (x.lv2tag === 'SOUR' && x._curCit && tag !== 'TIME' && tag !== 'SOUR') {
      if      (tag === 'PAGE') x._curCit.page = val;
      else if (tag === 'QUAY') x._curCit.quay = val;
      else if (tag === 'NOTE') { x._curCit.note = val || ''; x._ptDepth = 3; x._ptTarget = x._curCit.extra; }
      else if (tag === 'OBJE' && !val?.startsWith('@')) {
        const _sm = { file:'', scbk:'', prim:'', titl:'', note:'', _extra:[] };
        x._curCit.media.push(_sm); x._smEntry = _sm;
      } else {
        x._curCit.extra.push('3 ' + tag + (val ? ' ' + val : ''));
        x._ptDepth = 3; x._ptTarget = x._curCit.extra;
      }
    }
    if (x.lv1tag==='MARR' && x.lv2tag==='OBJE' && cur.marr.media.length) {
      const _om = cur.marr.media[cur.marr.media.length-1];
      if      (tag==='FILE')  _om.file = val;
      else if (tag==='TITL')  _om.titl = val;
      else if (tag==='NOTE')  _om.note = val;
      else if (tag==='_DATE') _om.date = val;
      else if (tag==='_SCBK') _om.scbk = val;
      else if (tag==='_PRIM') _om.prim = val;
      else { _om._extra.push('3 '+tag+(val?' '+val:'')); x._ptDepth=3; x._ptTarget=_om._extra; }
    }
    if ((x.lv1tag==='ENGA'||x.lv1tag==='ENG') && x.lv2tag==='OBJE' && cur.engag.media.length) {
      const _om = cur.engag.media[cur.engag.media.length-1];
      if      (tag==='FILE')  _om.file = val;
      else if (tag==='TITL')  _om.titl = val;
      else if (tag==='NOTE')  _om.note = val;
      else if (tag==='_DATE') _om.date = val;
      else if (tag==='_SCBK') _om.scbk = val;
      else if (tag==='_PRIM') _om.prim = val;
      else { _om._extra.push('3 '+tag+(val?' '+val:'')); x._ptDepth=3; x._ptTarget=_om._extra; }
    }
    if (x.lv1tag==='DIV' && x.lv2tag==='OBJE' && cur.div.media.length) {
      const _om = cur.div.media[cur.div.media.length-1];
      if      (tag==='FILE')  _om.file = val;
      else if (tag==='TITL')  _om.titl = val;
      else if (tag==='NOTE')  _om.note = val;
      else if (tag==='_DATE') _om.date = val;
      else if (tag==='_SCBK') _om.scbk = val;
      else if (tag==='_PRIM') _om.prim = val;
      else { _om._extra.push('3 '+tag+(val?' '+val:'')); x._ptDepth=3; x._ptTarget=_om._extra; }
    }
    if (x.lv1tag==='DIVF' && x.lv2tag==='OBJE' && cur.divf.media.length) {
      const _om = cur.divf.media[cur.divf.media.length-1];
      if      (tag==='FILE')  _om.file = val;
      else if (tag==='TITL')  _om.titl = val;
      else if (tag==='NOTE')  _om.note = val;
      else if (tag==='_DATE') _om.date = val;
      else if (tag==='_SCBK') _om.scbk = val;
      else if (tag==='_PRIM') _om.prim = val;
      else { _om._extra.push('3 '+tag+(val?' '+val:'')); x._ptDepth=3; x._ptTarget=_om._extra; }
    }
    if (x.lv1tag==='CHIL' && cur._lastChil && (x.lv2tag==='_FREL'||x.lv2tag==='_MREL')) {
      if (!cur.childRelations[cur._lastChil]) cur.childRelations[cur._lastChil] = {frel:'',mrel:'',frelSeen:false,mrelSeen:false,frelSour:'',frelPage:'',frelQUAY:'',frelSourExtra:[],mrelSour:'',mrelPage:'',mrelQUAY:'',mrelSourExtra:[],citations:[]};
      const cref = cur.childRelations[cur._lastChil];
      if (tag==='SOUR') {
        if (x.lv2tag==='_FREL') {
          if (!cref.frelSour) cref.frelSour = val;
          else { if (!cref.frelSourExtra) cref.frelSourExtra=[]; cref.frelSourExtra.push('3 SOUR '+val); x._ptDepth=3; x._ptTarget=cref.frelSourExtra; }
        }
        if (x.lv2tag==='_MREL') {
          if (!cref.mrelSour) cref.mrelSour = val;
          else { if (!cref.mrelSourExtra) cref.mrelSourExtra=[]; cref.mrelSourExtra.push('3 SOUR '+val); x._ptDepth=3; x._ptTarget=cref.mrelSourExtra; }
        }
      }
    }
  }
  else if (lv === 4) {
    if (x._smEntry !== null && x.lv3tag === 'OBJE' && x.lv2tag === 'SOUR') {
      if      (tag==='FILE')  { x._smEntry.file=val; x._ptDepth=4; x._ptTarget=x._smEntry._extra; }
      else if (tag==='_SCBK') x._smEntry.scbk=val;
      else if (tag==='_PRIM') x._smEntry.prim=val;
      else if (tag==='TITL')  x._smEntry.titl=val;
      else if (tag==='NOTE')  x._smEntry.note=val;
      else { x._smEntry._extra.push('4 '+tag+(val?' '+val:'')); x._ptDepth=4; x._ptTarget=x._smEntry._extra; }
    }
    if ((x.lv1tag==='MARR'||x.lv1tag==='ENGA') && x.lv2tag==='OBJE' && x.lv3tag==='FILE') {
      const _oa = x.lv1tag==='MARR' ? cur.marr.media : cur.engag.media;
      if (_oa.length) {
        if (tag==='FORM') { _oa[_oa.length-1].form = val; x._ptDepth=4; x._ptTarget=_oa[_oa.length-1]._extra; }
        else { _oa[_oa.length-1]._extra.push('4 '+tag+(val?' '+val:'')); x._ptDepth=4; x._ptTarget=_oa[_oa.length-1]._extra; }
      }
    }
    if (x.lv1tag==='CHIL' && cur._lastChil && x.lv3tag==='SOUR' && (x.lv2tag==='_FREL'||x.lv2tag==='_MREL')) {
      const cref = cur.childRelations[cur._lastChil];
      if (cref) {
        if (x.lv2tag==='_FREL') {
          if      (tag==='PAGE') cref.frelPage = val;
          else if (tag==='QUAY') cref.frelQUAY = val;
          else { if (!cref.frelSourExtra) cref.frelSourExtra = []; cref.frelSourExtra.push('4 ' + tag + (val ? ' ' + val : '')); x._ptDepth = 4; x._ptTarget = cref.frelSourExtra; }
        } else {
          if      (tag==='PAGE') cref.mrelPage = val;
          else if (tag==='QUAY') cref.mrelQUAY = val;
          else { if (!cref.mrelSourExtra) cref.mrelSourExtra = []; cref.mrelSourExtra.push('4 ' + tag + (val ? ' ' + val : '')); x._ptDepth = 4; x._ptTarget = cref.mrelSourExtra; }
        }
      }
    }
    if (x.inMap && (x.mapParent === 'MARR' || x.mapParent === 'ENGA' || x.mapParent === 'ENG' || x.mapParent === 'DIV' || x.mapParent === 'DIVF' || x.mapParent === 'EVEN')) {
      const coord = parseGeoCoord(val);
      if (x.mapParent === 'EVEN' && x.evIdx >= 0 && cur.events[x.evIdx]) {
        if (tag==='LATI') { cur.events[x.evIdx].lati = coord; cur.events[x.evIdx]._latiStr = val; }
        if (tag==='LONG') { cur.events[x.evIdx].long = coord; cur.events[x.evIdx]._longStr = val; }
      } else {
        const evObj = (x.mapParent==='ENGA'||x.mapParent==='ENG') ? cur.engag : x.mapParent==='DIV' ? cur.div : x.mapParent==='DIVF' ? cur.divf : cur.marr;
        if (tag==='LATI') { evObj.lati = coord; evObj._latiStr = val; }
        if (tag==='LONG') { evObj.long = coord; evObj._longStr = val; }
      }
    }
  }
}

// ── Sub-Parser: SOURCE ──
function _parseSOURLine(cur, x, lv, tag, val) {
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
        cur._passthrough.push('1 OBJE ' + val); x._ptDepth = 1;
      } else {
        cur.media.push({ file:'', title:'', form:null, medi:'', titleIsLv2:false, note:'', date:'', scbk:'', prim:'', _extra:[] });
      }
    }
    else if (tag === 'REFN') { cur.refns.push({val:val||'', type:''}); }
    else {
      cur._passthrough.push('1 ' + tag + (val ? ' ' + val : ''));
      x._ptDepth = 1;
    }
  }
  else if (lv === 2) {
    if (x.lv1tag==='OBJE' && cur.media.length) {
      const _cm = cur.media[cur.media.length-1];
      if      (tag==='FILE')  _cm.file  = val;
      else if (tag==='TITL')  { _cm.title = val; _cm.titleIsLv2 = true; }
      else if (tag==='NOTE')  _cm.note  = val;
      else if (tag==='_DATE') _cm.date  = val;
      else if (tag==='_SCBK') _cm.scbk  = val;
      else if (tag==='_PRIM') _cm.prim  = val;
      else { _cm._extra.push('2 ' + tag + (val ? ' ' + val : '')); x._ptDepth=2; x._ptTarget=_cm._extra; }
    }
    if ((tag==='CONC'||tag==='CONT') && x.lv1tag==='TITL') cur.title  += (tag==='CONT'?'\n':'') + val;
    if ((tag==='CONC'||tag==='CONT') && x.lv1tag==='TEXT') cur.text   += (tag==='CONT'?'\n':'') + val;
    if ((tag==='CONC'||tag==='CONT') && x.lv1tag==='NOTE') cur.note   += (tag==='CONT'?'\n':'') + val;
    if ((tag==='CONC'||tag==='CONT') && x.lv1tag==='AUTH') cur.author += (tag==='CONT'?'\n':'') + val;
    if ((tag==='CONC'||tag==='CONT') && x.lv1tag==='PUBL') cur.publ   += (tag==='CONT'?'\n':'') + val;
    if ((tag==='CONC'||tag==='CONT') && x.lv1tag==='ABBR') cur.abbr   += (tag==='CONT'?'\n':'') + val;
    if (x.lv1tag==='CHAN' && tag==='DATE') cur.lastChanged = val;
    if (x.lv1tag==='CHAN' && tag==='NOTE') cur.chanNote = val || '';
    if (x.lv1tag==='REPO' && tag==='CALN') { cur.repoCallNum = val; }
    if (x.lv1tag==='REFN' && tag==='TYPE' && cur.refns.length) cur.refns[cur.refns.length-1].type = val;
    if (x.lv1tag==='DATA' && tag==='AGNC') cur.agnc = val;
    else if (x.lv1tag==='DATA' && tag==='EVEN') { cur.dataEvens.push({evens:val||'',date:'',plac:''}); }
    else if (x.lv1tag==='DATA' && tag !== 'AGNC' && tag !== 'EVEN') { cur.dataExtra.push('2 '+tag+(val?' '+val:'')); x._ptDepth=2; x._ptTarget=cur.dataExtra; }
  }
  else if (lv === 3) {
    if (x.lv1tag==='OBJE' && x.lv2tag==='FILE' && cur.media.length) {
      if (tag==='FORM')      { cur.media[cur.media.length-1].form  = val; x._ptDepth=3; x._ptTarget=cur.media[cur.media.length-1]._extra; }
      else if (tag==='TITL') { cur.media[cur.media.length-1].title = val; x._ptDepth=3; x._ptTarget=cur.media[cur.media.length-1]._extra; }
      else { cur.media[cur.media.length-1]._extra.push('3 ' + tag + (val ? ' ' + val : '')); x._ptDepth=3; x._ptTarget=cur.media[cur.media.length-1]._extra; }
    }
    if (x.lv1tag==='OBJE' && x.lv2tag==='NOTE' && (tag==='CONC'||tag==='CONT') && cur.media.length)
      cur.media[cur.media.length-1].note += (tag==='CONT' ? '\n' : '') + val;
    if (x.lv1tag==='REPO' && x.lv2tag==='CALN' && tag==='MEDI') cur.repoCallMedi = val;
    else if (x.lv1tag==='REPO' && x.lv2tag==='CALN') { cur.repoCallNumExtra.push('3 ' + tag + (val ? ' ' + val : '')); x._ptDepth=3; x._ptTarget=cur.repoCallNumExtra; }
    if (x.lv1tag==='DATA' && x.lv2tag==='EVEN' && cur.dataEvens.length) {
      const _de = cur.dataEvens[cur.dataEvens.length-1];
      if      (tag==='DATE') _de.date = val;
      else if (tag==='PLAC') _de.plac = val;
      else { cur.dataExtra.push('3 ' + tag + (val ? ' ' + val : '')); x._ptDepth=3; x._ptTarget=cur.dataExtra; }
    }
    if (x.lv1tag==='CHAN' && tag==='TIME') cur.lastChangedTime = val;
    if (x.lv1tag==='CHAN' && x.lv2tag==='NOTE' && (tag==='CONC'||tag==='CONT'))
      cur.chanNote += (tag==='CONT' ? '\n' : '') + val;
  }
}

// ── Sub-Parser: NOTE record ──
function _parseNOTELine(cur, x, lv, tag, val) {
  if (tag==='CONC') cur.text += val;
  else if (tag==='CONT') cur.text += '\n' + val;
  else if (lv===1 && tag==='CHAN') { /* context-only */ }
  else if (lv===2 && x.lv1tag==='CHAN' && tag==='DATE') cur.lastChanged = val;
  else if (lv===2 && x.lv1tag==='CHAN' && tag==='NOTE') cur.chanNote = val || '';
  else if (lv===3 && x.lv1tag==='CHAN' && tag==='TIME') cur.lastChangedTime = val;
  else if (lv===3 && x.lv1tag==='CHAN' && x.lv2tag==='NOTE' && (tag==='CONC'||tag==='CONT'))
    cur.chanNote += (tag==='CONT' ? '\n' : '') + val;
  else {
    cur._passthrough.push(lv + ' ' + tag + (val ? ' ' + val : ''));
    if (lv === 1) x._ptDepth = 1;
  }
}

// ── Sub-Parser: REPO record ──
function _parseREPOLine(cur, x, lv, tag, val) {
  if (lv === 1) {
    if (tag==='NAME')       cur.name  = val;
    else if (tag==='ADDR') { cur.addr = val; if (!cur.addrExtra) cur.addrExtra=[]; x._ptDepth=1; x._ptTarget=cur.addrExtra; }
    else if (tag==='PHON')  cur.phon  = val;
    else if (tag==='WWW')   cur.www   = val;
    else if (tag==='EMAIL') cur.email = val;
    else if (tag==='CHAN') { /* context-only */ }
    else { cur._passthrough.push('1 '+tag+(val?' '+val:'')); x._ptDepth=1; x._ptTarget=cur._passthrough; }
  } else if (lv === 2) {
    if (x.lv1tag==='ADDR' && tag==='CONT') cur.addr += '\n' + val;
    if (x.lv1tag==='CHAN' && tag==='DATE') cur.lastChanged = val;
    if (x.lv1tag==='CHAN' && tag==='NOTE') cur.chanNote = val || '';
  } else if (lv === 3) {
    if (x.lv1tag==='CHAN' && tag==='TIME') cur.lastChangedTime = val;
    if (x.lv1tag==='CHAN' && x.lv2tag==='NOTE' && (tag==='CONC'||tag==='CONT'))
      cur.chanNote += (tag==='CONT' ? '\n' : '') + val;
  }
}

// ─────────────────────────────────────
//  MAIN PARSER
// ─────────────────────────────────────
function parseGEDCOM(text, parseErrors, onProgress) {
  text = text.replace(/^﻿/, '');
  const lines = text.split(/\r?\n/);

  // Pre-scan: extract PLAC.FORM from HEAD (unique: "1 PLAC\n2 FORM ...")
  let placForm = 'Dorf, Stadt, PLZ, Landkreis, Bundesland, Staat';
  { const mPF = text.match(/^1 PLAC\s*[\r\n]+\s*2 FORM (.+)$/m); if (mPF) placForm = mPF[1].trim(); }

  const individuals = {}, families = {}, sources = {}, notes = {}, repositories = {};
  const _extraRecords = [];
  const _headLines = [];
  const _errors = parseErrors || [];
  let lineNo = 0;
  let prevLv = -1;
  let cur = null, curType = null;

  // Mutable parse context — shared between main loop and sub-parsers
  const x = {
    lv1tag: '', lv2tag: '', lv3tag: '',
    evIdx: -1, inMap: false, mapParent: '',
    _curCit: null, lastSourVal: '',
    _curNoteIsInline: false, _curExtraNameIdx: -1,
    _ptDepth: 0, _ptTarget: null,
    _smEntry: null, _curTask: null, _curAsso: null
  };

  const _total = lines.length;
  const _progStep = onProgress ? Math.max(1, Math.floor(_total / 20)) : 0;
  let _lineIdx = 0;

  for (let raw of lines) {
    lineNo++;
    if (_progStep && ++_lineIdx % _progStep === 0) onProgress(Math.round(_lineIdx / _total * 95));
    // Nur \r am Ende entfernen (Windows CRLF)
    const line = raw.replace(/\r$/, '');
    if (!line.trim()) continue;
    const m = line.match(/^(\d+)\s+(\S+)(.*)?$/);
    if (!m) {
      _errors.push({ line: lineNo, raw: line, msg: 'Ungültiges GEDCOM-Format (kein Level/Tag erkannt)' });
      continue;
    }
    const lv  = parseInt(m[1]);
    const tag = m[2].trim();
    const val = (m[3] || '').replace(/^ /, '');

    // ── Level-Validierung ──
    if (lv > 4 && x._ptDepth === 0) {
      _errors.push({ line: lineNo, lv, tag, val, raw: line, msg: `Level ${lv} überschreitet das Maximum (4)` });
    }
    if (prevLv >= 0 && lv > prevLv + 1) {
      _errors.push({ line: lineNo, lv, tag, val, raw: line, msg: `Level-Sprung von ${prevLv} auf ${lv} (erwartet max. ${prevLv + 1})` });
    }
    prevLv = lv;

    // ── Level 0 ──
    if (lv === 0) {
      x.lv1tag = x.lv2tag = x.lv3tag = '';
      x.evIdx = -1; x.inMap = false; x.mapParent = ''; x._ptDepth = 0; x._smEntry = null; x._curCit = null;
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
          extraNames:[], _tasks:[], _rlog:[], associations:[], aliases:[], refns:[],
          media:[], titl:'', reli:'', resn:'', email:'', www:'', _stat:null, grampId:'', lastChanged:'', lastChangedTime:'', chanNote:'',
          nameCitations:[], _hasGivn:false, _hasSurn:false,
          topSourcePages:{}, topSourceQUAY:{}, topSourceExtra:{}, sourceRefs: new Set()
        };
        individuals[tag] = cur; curType = 'INDI';
      } else if (tag.startsWith('@') && val.trim() === 'FAM') {
        const _famEv = () => ({date:null,place:null,lati:null,long:null,citations:[],value:'',seen:false,note:'',noteRefs:[],_extra:[],media:[]});
        cur = { id:tag, _passthrough: [], husb:null, wife:null, children:[], childRelations:{}, _lastChil:null, marr:{..._famEv(),addr:''}, engag:_famEv(), div:_famEv(), divf:_famEv(), events:[], _stat:null, grampId:'', noteRefs:[], noteTexts:[], noteText:'', sourceRefs: new Set(), media:[], _tasks:[], _rlog:[], refns:[], lastChanged:'', lastChangedTime:'', chanNote:'' };
        families[tag] = cur; curType = 'FAM';
      } else if (tag.startsWith('@') && val.trim() === 'SOUR') {
        cur = { id:tag, _passthrough: [], title:'', abbr:'', author:'', date:'', publ:'', repo:'', repoCallNum:'', repoCallMedi:'', repoCallNumExtra:[], text:'', _textSeen:false, note:'', noteRefs:[], agnc:'', grampId:'', dataEvens:[], dataExtra:[], refns:[], media:[], _date:'', lastChanged:'', lastChangedTime:'', chanNote:'' };
        sources[tag] = cur; curType = 'SOUR';
      } else if (tag.startsWith('@') && /^NOTE\b/.test(val.trim())) {
        const _noteinit = val.slice(val.startsWith('NOTE ') ? 5 : 4);
        cur = { id:tag, text: _noteinit, _passthrough: [], lastChanged:'', lastChangedTime:'', chanNote:'' };
        notes[tag] = cur; curType = 'NOTE';
      } else if (tag.startsWith('@') && val.trim() === 'REPO') {
        cur = { id:tag, _passthrough:[], name:'', addr:'', phon:'', www:'', email:'', lastChanged:'', lastChangedTime:'', chanNote:'' };
        repositories[tag] = cur; curType = 'REPO';
      } else if (tag.startsWith('@')) {
        const recLine = '0 ' + tag + (val ? ' ' + val : '');
        cur = { _lines: [recLine] };
        _extraRecords.push(cur); curType = '_extra';
      } else if (tag === 'HEAD') {
        _headLines.length = 0;
        _headLines.push('0 HEAD');
        cur = { _lines: _headLines }; curType = 'HEAD';
      } else {
        curType = null; cur = null;
      }
      continue;
    }
    if (!cur) continue;

    // Unknown lv=0 record sub-lines — collect verbatim
    if (curType === '_extra') { cur._lines.push(lv + ' ' + tag + (val ? ' ' + val : '')); continue; }
    // HEAD sub-lines — collect verbatim
    if (curType === 'HEAD')   { _headLines.push(lv + ' ' + tag + (val ? ' ' + val : '')); continue; }

    // Track context tags
    if (lv === 1) { x.lv1tag = tag; x.lv2tag = ''; x.lv3tag = ''; x.inMap = false; x.mapParent = ''; x._curCit = null; x.lastSourVal = ''; x._curNoteIsInline = false; x._curExtraNameIdx = -1; x._smEntry = null; }
    if (lv === 2) { x.lv2tag = tag; x.lv3tag = ''; if (tag !== 'MAP') x.inMap = false; if (tag !== 'SOUR') x._curCit = null; x._smEntry = null; }
    if (lv === 3) { x.lv3tag = tag; if (tag === 'MAP') { x.inMap = true; x.mapParent = x.lv1tag; } else { x.inMap = false; } x._smEntry = null; }

    // ── Verbatim Passthrough ──
    if (x._ptDepth > 0) {
      if (lv > x._ptDepth) {
        const _ptArr = x._ptTarget || (cur && cur._passthrough);
        if (_ptArr) _ptArr.push(lv + ' ' + tag + (val ? ' ' + val : ''));
        continue;
      } else {
        x._ptDepth = 0; x._ptTarget = null;
      }
    }

    // ── Dispatch to sub-parsers ──
    if      (curType === 'INDI') _parseINDILine(cur, x, lv, tag, val);
    else if (curType === 'FAM')  _parseFAMLine(cur, x, lv, tag, val);
    else if (curType === 'SOUR') _parseSOURLine(cur, x, lv, tag, val);
    else if (curType === 'NOTE') _parseNOTELine(cur, x, lv, tag, val);
    else if (curType === 'REPO') _parseREPOLine(cur, x, lv, tag, val);
  }

  // Merge FAM-side childRelations into INDI-side famc
  for (const [famId, fam] of Object.entries(families)) {
    for (const [childId, cref] of Object.entries(fam.childRelations)) {
      const person = individuals[childId];
      if (!person) continue;
      const famcEntry = person.famc.find(f => f.famId === famId);
      if (!famcEntry) continue;
      if (!famcEntry.frelSeen && !famcEntry.mrelSeen) {
        if (cref.frelSeen) { famcEntry.frel = cref.frel; famcEntry.frelSeen = true; }
        if (cref.mrelSeen) { famcEntry.mrel = cref.mrel; famcEntry.mrelSeen = true; }
      }
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

  // Resolve NOTE references + build noteText
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

  // Collect distinct eventType values per event tag
  const _etMap = {};
  const _etAdd = (tag, val) => { if (!val) return; if (!_etMap[tag]) _etMap[tag] = new Set(); _etMap[tag].add(val); };
  for (const p of Object.values(individuals))
    for (const ev of (p.events || [])) _etAdd(ev.type, ev.eventType);
  for (const f of Object.values(families))
    for (const ev of (f.events || [])) _etAdd(ev.type, ev.eventType);
  const eventTypesByTag = Object.fromEntries(Object.entries(_etMap).map(([k, s]) => [k, [...s].sort((a, b) => a.localeCompare(b))]));

  // _PRIM Y → Foto an Position 0 schieben
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
function detectGRAMPS(text) {
  if (!text) return { isGramps: false, sourceName: '' };
  const sourceMatch = text.match(/^1 SOUR\s+(\S+)/m);
  const sourceName = sourceMatch ? sourceMatch[1] : '';
  const isGramps = /^1 SOUR\s+GRAMPS\b/im.test(text) ||
                   /^\d+ _GRAMPS_ID\b/m.test(text);
  return { isGramps, sourceName };
}
