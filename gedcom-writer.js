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

// Mappt _FREL/_MREL-Werte (auch deutsch) auf GEDCOM-5.5.1-PEDI-Enum
function _toPedi(v) {
  const m = { birth:'birth', leiblich:'birth', biologisch:'birth', natürlich:'birth',
               adopted:'adopted', adoptiert:'adopted', adoption:'adopted',
               foster:'foster', pflegekind:'foster', pflege:'foster',
               sealing:'sealing' };
  return m[(v||'').toLowerCase()] || 'birth';
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
    if (obj.note) pushCont(lines, lv+1, 'NOTE', obj.note);
    for (const r of (obj.noteRefs||[])) lines.push(`${lv+1} NOTE ${r}`);
    if (obj.sources) for (const s of obj.sources) {
      lines.push(`${lv+1} SOUR ${s}`);
      if (obj.sourcePages && obj.sourcePages[s]) lines.push(`${lv+2} PAGE ${obj.sourcePages[s]}`);
      if (obj.sourceQUAY && obj.sourceQUAY[s])   lines.push(`${lv+2} QUAY ${obj.sourceQUAY[s]}`);
      if (obj.sourceNote && obj.sourceNote[s] !== undefined) lines.push(`${lv+2} NOTE${obj.sourceNote[s] ? ' ' + obj.sourceNote[s] : ''}`);
      if (obj.sourceExtra && obj.sourceExtra[s]) for (const l of obj.sourceExtra[s]) lines.push(l);
      if (obj.sourceMedia && obj.sourceMedia[s]) for (const m of obj.sourceMedia[s]) {
        lines.push(`${lv+2} OBJE`);
        if (m.file) { lines.push(`${lv+3} FILE ${m.file}`); for (const l of (m._extra||[])) lines.push(l); }
        if (m.scbk) lines.push(`${lv+3} _SCBK ${m.scbk}`);
        if (m.prim) lines.push(`${lv+3} _PRIM ${m.prim}`);
        if (m.titl) lines.push(`${lv+3} TITL ${m.titl}`);
        if (m.note) lines.push(`${lv+3} NOTE ${m.note}`);
      }
    }
    if (obj.media && obj.media.length) for (const m of obj.media) {
      lines.push(`${lv+1} OBJE`);
      if (m.titl) lines.push(`${lv+2} TITL ${m.titl}`);
      if (m.file) {
        lines.push(`${lv+2} FILE ${m.file}`);
        if (m.form) lines.push(`${lv+3} FORM ${m.form}`);
        for (const l of (m._extra || [])) lines.push(l);
      }
      if (m.note) lines.push(`${lv+2} NOTE ${m.note}`);
      if (m.date) lines.push(`${lv+2} _DATE ${m.date}`);
      if (m.scbk) lines.push(`${lv+2} _SCBK ${m.scbk}`);
      if (m.prim) lines.push(`${lv+2} _PRIM ${m.prim}`);
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
    if (p.nick)    lines.push(`2 NICK ${p.nick}`);
    if (p.prefix)  lines.push(`2 NPFX ${p.prefix}`);
    if (p.suffix)  lines.push(`2 NSFX ${p.suffix}`);
    for (const s of (p.nameSources || [])) {
      lines.push(`2 SOUR ${s}`);
      if (p.nameSourcePages?.[s]) lines.push(`3 PAGE ${p.nameSourcePages[s]}`);
      if (p.nameSourceQUAY?.[s])  lines.push(`3 QUAY ${p.nameSourceQUAY[s]}`);
      if (p.nameSourceNote?.[s] !== undefined) lines.push(`3 NOTE${p.nameSourceNote[s] ? ' ' + p.nameSourceNote[s] : ''}`);
      if (p.nameSourceExtra?.[s]) for (const l of p.nameSourceExtra[s]) lines.push(l);
      if (p.nameSourceMedia?.[s]) for (const m of p.nameSourceMedia[s]) {
        lines.push(`3 OBJE`);
        if (m.file) { lines.push(`4 FILE ${m.file}`); for (const l of (m._extra||[])) lines.push(l); }
        if (m.scbk) lines.push(`4 _SCBK ${m.scbk}`);
        if (m.prim) lines.push(`4 _PRIM ${m.prim}`);
        if (m.titl) lines.push(`4 TITL ${m.titl}`);
        if (m.note) lines.push(`4 NOTE ${m.note}`);
      }
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
        if (en.sourceNote?.[s] !== undefined) lines.push(`3 NOTE${en.sourceNote[s] ? ' ' + en.sourceNote[s] : ''}`);
        if (en.sourceExtra?.[s]) for (const l of en.sourceExtra[s]) lines.push(l);
        if (en.sourceMedia?.[s]) for (const m of en.sourceMedia[s]) {
          lines.push(`3 OBJE`);
          if (m.file) { lines.push(`4 FILE ${m.file}`); for (const l of (m._extra||[])) lines.push(l); }
          if (m.scbk) lines.push(`4 _SCBK ${m.scbk}`);
          if (m.prim) lines.push(`4 _PRIM ${m.prim}`);
          if (m.titl) lines.push(`4 TITL ${m.titl}`);
          if (m.note) lines.push(`4 NOTE ${m.note}`);
        }
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
      for (const ph of (ev.phon  || [])) lines.push(`2 PHON ${ph}`);
      for (const em of (ev.email || [])) lines.push(`2 EMAIL ${em}`);
      if (ev.sources) for (const s of ev.sources) {
        lines.push(`2 SOUR ${s}`);
        if (ev.sourcePages && ev.sourcePages[s]) lines.push(`3 PAGE ${ev.sourcePages[s]}`);
        if (ev.sourceQUAY && ev.sourceQUAY[s])   lines.push(`3 QUAY ${ev.sourceQUAY[s]}`);
        if (ev.sourceNote && ev.sourceNote[s] !== undefined) lines.push(`3 NOTE${ev.sourceNote[s] ? ' ' + ev.sourceNote[s] : ''}`);
        if (ev.sourceExtra && ev.sourceExtra[s]) for (const l of ev.sourceExtra[s]) lines.push(l);
        if (ev.sourceMedia && ev.sourceMedia[s]) for (const m of ev.sourceMedia[s]) {
          lines.push(`3 OBJE`);
          if (m.file) { lines.push(`4 FILE ${m.file}`); for (const l of (m._extra||[])) lines.push(l); }
          if (m.scbk) lines.push(`4 _SCBK ${m.scbk}`);
          if (m.prim) lines.push(`4 _PRIM ${m.prim}`);
          if (m.titl) lines.push(`4 TITL ${m.titl}`);
          if (m.note) lines.push(`4 NOTE ${m.note}`);
        }
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
        if (fref.frelSeen || fref.mrelSeen || fref.pedi) {
          const fv = fref.frel || fref.pedi || '';
          const mv = fref.mrel || fref.pedi || '';
          const fp = _toPedi(fv);
          const mp = _toPedi(mv);
          if (fp === mp) {
            lines.push(`2 PEDI ${fp}`);
          } else {
            // Vater/Mutter-Verhältnis verschieden — _FREL/_MREL als Erweiterung beibehalten
            lines.push(`2 _FREL ${fv}`);
            lines.push(`2 _MREL ${mv}`);
          }
        }
        // Alle Quellen dedupl. sammeln: sourIds + frelSour + mrelSour
        const _allSours = [...(fref.sourIds || [])];
        const _sourPages = Object.assign({}, fref.sourPages);
        const _sourQUAY  = Object.assign({}, fref.sourQUAY);
        for (const [xSour, xPage, xQuay] of [
          [fref.frelSour, fref.frelPage, fref.frelQUAY],
          [fref.mrelSour, fref.mrelPage, fref.mrelQUAY]
        ]) {
          if (xSour && !_allSours.includes(xSour)) {
            _allSours.push(xSour);
            if (xPage) _sourPages[xSour] = xPage;
            if (xQuay) _sourQUAY[xSour]  = xQuay;
          }
        }
        // Zusätzliche SOUR-IDs aus frelSourExtra / mrelSourExtra extrahieren
        for (const extra of [...(fref.frelSourExtra||[]), ...(fref.mrelSourExtra||[])]) {
          const m = extra.match(/^\d+ SOUR (@\S+@)/);
          if (m && !_allSours.includes(m[1])) _allSours.push(m[1]);
        }
        for (const s of _allSours) {
          lines.push(`2 SOUR ${s}`);
          if (_sourPages[s]) lines.push(`3 PAGE ${_sourPages[s]}`);
          if (_sourQUAY[s])  lines.push(`3 QUAY ${_sourQUAY[s]}`);
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
    if (p._stat !== null && p._stat !== undefined) lines.push(`1 _STAT${p._stat ? ' ' + p._stat : ''}`);
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
      // Verhältnistyp und Quellen werden gem. GEDCOM 5.5.1 auf INDI-Seite (FAMC/PEDI) geführt.
    }
    eventBlock('MARR', f.marr, 1);
    if (f.marr.addr) pushCont(lines, 2, 'ADDR', f.marr.addr);
    eventBlock('ENGA', f.engag, 1);
    eventBlock('DIV',  f.div,   1);
    eventBlock('DIVF', f.divf,  1);
    for (const ev of (f.events || [])) {
      lines.push(`1 ${ev.type}${ev.value ? ' ' + ev.value : ''}`);
      if (ev.eventType) lines.push(`2 TYPE ${ev.eventType}`);
      if (ev.date !== null && ev.date !== undefined) lines.push(`2 DATE${ev.date ? ' ' + normGedDate(ev.date) : ''}`);
      if (ev.place !== null && ev.place !== undefined || ev.lati !== null) {
        if (ev.place !== null && ev.place !== undefined) lines.push(`2 PLAC${ev.place ? ' ' + ev.place : ''}`);
        geoLines(ev, 3);
      }
      if (ev.note) pushCont(lines, 2, 'NOTE', ev.note);
      if (ev.sources) for (const s of ev.sources) {
        lines.push(`2 SOUR ${s}`);
        if (ev.sourcePages && ev.sourcePages[s]) lines.push(`3 PAGE ${ev.sourcePages[s]}`);
        if (ev.sourceQUAY && ev.sourceQUAY[s])   lines.push(`3 QUAY ${ev.sourceQUAY[s]}`);
        if (ev.sourceNote && ev.sourceNote[s] !== undefined) lines.push(`3 NOTE${ev.sourceNote[s] ? ' ' + ev.sourceNote[s] : ''}`);
        if (ev.sourceExtra && ev.sourceExtra[s]) for (const l of ev.sourceExtra[s]) lines.push(l);
        if (ev.sourceMedia && ev.sourceMedia[s]) for (const m of ev.sourceMedia[s]) {
          lines.push(`3 OBJE`);
          if (m.file) { lines.push(`4 FILE ${m.file}`); for (const l of (m._extra||[])) lines.push(l); }
          if (m.scbk) lines.push(`4 _SCBK ${m.scbk}`);
          if (m.prim) lines.push(`4 _PRIM ${m.prim}`);
          if (m.titl) lines.push(`4 TITL ${m.titl}`);
          if (m.note) lines.push(`4 NOTE ${m.note}`);
        }
      }
      if (ev._extra && ev._extra.length) for (const l of ev._extra) lines.push(l);
    }
    if (f._stat !== null && f._stat !== undefined) lines.push(`1 _STAT${f._stat ? ' ' + f._stat : ''}`);
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
    for (const l of (f._passthrough || [])) {
      if (/^1 (DIV|DIVF|ENG|ENGA)\b/.test(l)) continue; // jetzt strukturiert
      lines.push(l);
    }
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
    if (s.agnc || (s.dataExtra && s.dataExtra.length)) {
      lines.push(`1 DATA`);
      if (s.agnc) lines.push(`2 AGNC ${s.agnc}`);
      for (const l of (s.dataExtra || [])) lines.push(l);
    }
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
    if (s._date) lines.push(`1 _DATE ${s._date}`);
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
    if (n.lastChanged) {
      lines.push(`1 CHAN`);
      lines.push(`2 DATE ${n.lastChanged}`);
      if (n.lastChangedTime) lines.push(`3 TIME ${n.lastChangedTime}`);
    }
    for (const l of (n._passthrough || [])) lines.push(l);
  }

  // Unknown lv=0 records (SUBM etc.) — verbatim passthrough
  for (const rec of (db.extraRecords || [])) {
    for (const l of rec._lines) lines.push(l);
  }

  lines.push('0 TRLR');
  return lines.join('\r\n');
}

