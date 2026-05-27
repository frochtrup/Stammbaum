// GED7-Modus-Flag — wird zu Beginn von writeGEDCOM() gesetzt
let _ged7 = false;

// GED7: SCHMA-Block für alle _-Extension-Tags
function _g7WriteSchma(lines) {
  const _base = 'https://github.com/frochtrup/Stammbaum/ext';
  lines.push('1 SCHMA');
  for (const t of ['_UID','_GRAMPS_ID','_STAT','_TASK','_CAT','_DONE','_DATE','_ID',
                   '_RLOG','_QUERY','_RESULT','_RUFNAME','_FREL','_MREL','_SCBK','_PRIM'])
    lines.push(`2 TAG ${t} ${_base}/${t}`);
}

// PLAC/TRAN-Einträge aus extraPlaces-Registry
// GED7: standard TRAN; GED5: _TRAN vendor extension (überlebt Passthrough, lesbar bei Re-Import)
function _writePlacTrans(lines, placeName, indent) {
  const ep = AppState.db?.extraPlaces?.[placeName];
  if (!ep?.trans?.length) return;
  const tag = _ged7 ? 'TRAN' : '_TRAN';
  for (const t of ep.trans) {
    if (!t.value) continue;
    lines.push(`${indent} ${tag} ${t.value}`);
    if (t.lang) lines.push(`${indent+1} LANG ${t.lang}`);
  }
}

// Schreibt Text als GEDCOM-Zeile: CONT für Zeilenumbrüche, CONC für Zeichenlimit-Splits
// GED7: kein CONC (kein Zeilenlimit), nur CONT für echte Umbrüche
function pushCont(lines, lv, tag, text) {
  const rawLines = (text || '').split('\n');
  if (_ged7) {
    for (let li = 0; li < rawLines.length; li++) {
      if (li === 0) lines.push(`${lv} ${tag} ${rawLines[li]}`);
      else          lines.push(`${lv+1} CONT ${rawLines[li]}`);
    }
    if (!rawLines.length) lines.push(`${lv} ${tag} `);
    return;
  }
  const MAX = 248;
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

function _mediaFormStr(m) {
  if (m.form) return m.form;
  if (m.medi && m.file) { const ext = m.file.split('.').pop().toLowerCase(); return ext || null; }
  return null;
}

// Schreibt SOUR-Zitierungen aus citations[] (PAGE, QUAY, NOTE, extra, OBJE-Media)
function _writeSourCits(lines, lv, obj) {
  if (!obj?.citations?.length) return;
  for (const c of obj.citations) {
    lines.push(`${lv} SOUR ${c.sid}`);
    if (c.page)  lines.push(`${lv+1} PAGE ${c.page}`);
    if (c.quay)  lines.push(`${lv+1} QUAY ${c.quay}`);
    if (c.note !== null && c.note !== undefined)
      pushCont(lines, lv+1, 'NOTE', c.note || '');
    for (const l of (c.extra || [])) lines.push(l);
    if (db._grampsMaster && c._citExtra?.length) {
      for (const xml of c._citExtra) {
        const mt = xml.match(/noteref[^>]+hlink="([^"]+)"/);
        if (mt && _noteXref[mt[1]]) lines.push(`${lv+1} NOTE ${_noteXref[mt[1]]}`);
      }
    }
    for (const m of (c.media || [])) {
      lines.push(`${lv+1} OBJE`);
      if (m.file) { lines.push(`${lv+2} FILE ${m.file}`); for (const l of (m._extra||[])) lines.push(l); }
      if (m.scbk) lines.push(`${lv+2} _SCBK ${m.scbk}`);
      if (m.prim) lines.push(`${lv+2} _PRIM ${m.prim}`);
      if (m.titl) lines.push(`${lv+2} TITL ${m.titl}`);
      if (m.note) pushCont(lines, lv+2, 'NOTE', m.note);
    }
  }
}

// Schreibt CHAN-Block (lv = Level des CHAN-Tags, Standard: 1)
function writeCHAN(lines, obj, lv = 1) {
  if (!obj.lastChanged) return;
  lines.push(`${lv} CHAN`);
  lines.push(`${lv+1} DATE ${obj.lastChanged}`);
  if (obj.lastChangedTime) lines.push(`${lv+2} TIME ${obj.lastChangedTime}`);
  if (obj.chanNote) pushCont(lines, lv+1, 'NOTE', obj.chanNote);
}

// Schreibt MAP/LATI/LONG-Block.
// useExtraPlaces=true  → für strukturierte Events (BIRT/DEAT/CHR/BURI/MARR):
//   Priorität hofObjects > extraPlaces > obj.lati/obj.long
// useExtraPlaces=false → für Array-Events (RESI/PROP/EVEN…):
//   Nur hofObjects oder explizite ev.lati — NIEMALS extraPlaces,
//   damit _derivedHofObjectsFromDb() keine Ortskoordinaten als Hofkoordinaten
//   zurückliest.
function geoLines(lines, obj, indent, useExtraPlaces = true) {
  let lati = null, long = null;
  // 1. Hof-Koordinaten (spezifischer als Ortsregister)
  if (obj?.addr) {
    const hm = AppState.db?.hofObjects?.[obj.addr.trim()];
    if (hm?.lat != null) { lati = hm.lat; long = hm.long; }
  }
  // 2. Ortsregister (nur für strukturierte Events)
  if (lati === null && useExtraPlaces && obj?.place && AppState.db?.extraPlaces?.[obj.place]) {
    const ep = AppState.db.extraPlaces[obj.place];
    if (ep.lati != null) { lati = ep.lati; long = ep.long; }
  }
  // 3. Explizite Event-Koordinaten (aus Parser) — immer als letzter Fallback.
  //    extraPlaces wird nur für strukturierte Events genutzt (Schritt 2), aber direkte
  //    obj.lati-Werte werden für alle Event-Typen geschrieben, damit keine GEDCOM-
  //    Koordinaten verloren gehen.
  if (lati === null && obj?.lati != null) { lati = obj.lati; long = obj.long; }
  if (lati !== null && long !== null) {
    lines.push(`${indent} MAP`);
    const latStr = obj?._latiStr || ((lati >= 0 ? 'N' : 'S') + Math.abs(lati));
    const lonStr = obj?._longStr || ((long >= 0 ? 'E' : 'W') + Math.abs(long));
    lines.push(`${indent+1} LATI ${latStr}`);
    lines.push(`${indent+1} LONG ${lonStr}`);
  }
}

// Schreibt einen strukturierten Ereignis-Block (BIRT, DEAT, MARR etc.)
function eventBlock(lines, tag, obj, lv) {
  if (!obj || (!obj.seen && !obj.value && !obj.date && !obj.place && !obj.cause && !(obj.citations && obj.citations.length) && !(obj._extra && obj._extra.length))) return;
  lines.push(`${lv} ${tag}${obj.value ? ' ' + obj.value : ''}`);
  if (obj._grampsEvPriv) lines.push(`${lv+1} RESN confidential`);
  if (obj.date !== null && obj.date !== undefined) {
    lines.push(`${lv+1} DATE${obj.date ? ' ' + normGedDate(obj.date) : ''}`);
    if (_ged7 && obj.datePhrase) lines.push(`${lv+2} PHRASE ${obj.datePhrase}`);
  }
  if (obj.cause) lines.push(`${lv+1} CAUS ${obj.cause}`);
  if (obj.place !== null && obj.place !== undefined) {
    lines.push(`${lv+1} PLAC${obj.place ? ' ' + obj.place : ''}`);
    _writePlacTrans(lines, obj.place, lv+2);
    geoLines(lines, obj, lv+2);
  }
  const _origNote = obj._noteOrig !== undefined ? obj._noteOrig : obj.note;
  if (_origNote) pushCont(lines, lv+1, 'NOTE', _origNote);
  for (const r of (obj.noteRefs||[])) lines.push(`${lv+1} NOTE ${_noteXref[r]||r}`);
  _writeSourCits(lines, lv+1, obj);
  if (obj.media && obj.media.length) for (const m of obj.media) {
    lines.push(`${lv+1} OBJE`);
    if (m.titl) lines.push(`${lv+2} TITL ${m.titl}`);
    if (m.file) {
      lines.push(`${lv+2} FILE ${m.file}`);
      if (m.form) lines.push(`${lv+3} FORM ${m.form}`);
      for (const l of (m._extra || [])) lines.push(l);
    }
    if (m.note) pushCont(lines, lv+2, 'NOTE', m.note);
    if (m.date) lines.push(`${lv+2} _DATE ${m.date}`);
    if (m.scbk) lines.push(`${lv+2} _SCBK ${m.scbk}`);
    if (m.prim) lines.push(`${lv+2} _PRIM ${m.prim}`);
  }
  if (obj._extra && obj._extra.length) for (const l of obj._extra) lines.push(l);
}

// Phase F: eventHandle → primary person ID (populated by writeGEDCOM for witness→ASSO bridge)
let _witnessEvMap = {};
// Phase F12: hofAddress → NOTE record ID (populated by writeGEDCOM)
let _hofNoteIds = {};
// Cross-mode: GRAMPS handle → GEDCOM XREF (populated by writeGEDCOM before write functions)
let _noteXref = {};

// ─── Lebende-Personen-Set (F5 DSGVO) ─────────────────────────────────────────
// Gibt ein Set<personId> zurück, das alle Personen enthält, die anonymisiert
// werden sollen. Kriterien:
//   1. Kein Sterbedatum + Geburtsjahr > (aktuelles Jahr - 100) → living
//   2. BFS: undatierte Verwandte (Eltern, Ehepartner, Kinder) von living-Personen → living
//   3. Restliche undatierte Personen → konservativ living (anonymisieren)
function _buildLivingSet(db) {
  const threshold = new Date().getFullYear() - 100;
  const living = new Set();
  const dead   = new Set();

  for (const [id, p] of Object.entries(db.individuals || {})) {
    if (p.death?.date) { dead.add(id); continue; }
    if (p.birth?.date) {
      const m = p.birth.date.match(/(\d{4})/);
      if (m) { parseInt(m[1]) > threshold ? living.add(id) : dead.add(id); }
      // kein parsebares Jahr → Phase 2
    }
  }

  const queue = [...living];
  while (queue.length) {
    const id = queue.shift();
    const p  = db.individuals[id];
    if (!p) continue;
    for (const famId of (p.fams || [])) {
      const fam = db.families[famId];
      if (!fam) continue;
      for (const relId of [fam.husb, fam.wife, ...(fam.children || [])].filter(Boolean)) {
        if (!living.has(relId) && !dead.has(relId)) { living.add(relId); queue.push(relId); }
      }
    }
    for (const famcRef of (p.famc || [])) {
      const famId = typeof famcRef === 'string' ? famcRef : famcRef.famId;
      const fam = db.families[famId];
      if (!fam) continue;
      for (const parentId of [fam.husb, fam.wife].filter(Boolean)) {
        if (!living.has(parentId) && !dead.has(parentId)) { living.add(parentId); queue.push(parentId); }
      }
    }
  }

  for (const id of Object.keys(db.individuals || {})) {
    if (!living.has(id) && !dead.has(id)) living.add(id);
  }
  return living;
}

// ─── INDI-Record ──────────────────────────────────────────────────────────────
function writeINDIRecord(lines, p, livingSet = null) {
  if (livingSet?.has(p.id)) {
    lines.push(`0 ${p.id} INDI`);
    lines.push('1 NAME Lebende Person');
    if (p.sex) lines.push(`1 SEX ${p.sex}`);
    for (const famcRef of (p.famc || [])) {
      const famId = typeof famcRef === 'string' ? famcRef : famcRef.famId;
      lines.push(`1 FAMC ${famId}`);
    }
    for (const f of (p.fams || [])) lines.push(`1 FAMS ${f}`);
    return;
  }
  lines.push(`0 ${p.id} INDI`);

  // Name mit Sub-Tags
  const nameStr = (p.given || '') + (p.surname ? ' /' + p.surname + '/' : '');
  lines.push(`1 NAME ${p.nameRaw !== undefined && p.nameRaw !== '' ? p.nameRaw : nameStr.trim()}`);
  if (p._hasGivn) lines.push(`2 GIVN ${p.given || ''}`);
  if (p._hasSurn) lines.push(`2 SURN ${p.surname || ''}`);
  if (p.nick)     lines.push(`2 NICK ${p.nick}`);
  if (p._rufname) lines.push(`2 _RUFNAME ${p._rufname}`);
  if (p.prefix)  lines.push(`2 NPFX ${p.prefix}`);
  if (p.suffix)  lines.push(`2 NSFX ${p.suffix}`);
  _writeSourCits(lines, 2, { citations: p.nameCitations });

  // NAME-context passthrough (2-level items at start of _passthrough, e.g. 2 NICK)
  const _pt = p._passthrough || [];
  let _ptNameEnd = 0;
  while (_ptNameEnd < _pt.length && /^[2-9] /.test(_pt[_ptNameEnd])) _ptNameEnd++;
  for (let i = 0; i < _ptNameEnd; i++) lines.push(_pt[i]);

  // NAME/TRAN (GED7) / NAME/_TRAN vendor extension (GED5)
  for (const nt of (p.nameTrans || [])) {
    const _ntTag = _ged7 ? 'TRAN' : '_TRAN';
    lines.push(`2 ${_ntTag}${nt.nameRaw ? ' ' + nt.nameRaw : ''}`);
    if (nt.lang)    lines.push(`3 LANG ${nt.lang}`);
    if (nt.given)   lines.push(`3 GIVN ${nt.given}`);
    if (nt.surname) lines.push(`3 SURN ${nt.surname}`);
  }

  // Extra NAME-Einträge (Geburtsname etc.)
  for (const en of (p.extraNames || [])) {
    lines.push(`1 NAME${en.nameRaw ? ' ' + en.nameRaw : ''}`);
    if (en.type)    lines.push(`2 TYPE ${en.type}`);
    if (en._hasGivn) lines.push(`2 GIVN ${en.given || ''}`);
    if (en._hasSurn) lines.push(`2 SURN ${en.surname || ''}`);
    if (en.prefix)  lines.push(`2 NPFX ${en.prefix}`);
    if (en.suffix)  lines.push(`2 NSFX ${en.suffix}`);
    _writeSourCits(lines, 2, en);
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

  eventBlock(lines, 'BIRT', p.birth, 1);
  eventBlock(lines, 'CHR',  p.chr,   1);
  eventBlock(lines, 'DEAT', p.death, 1);
  eventBlock(lines, 'BURI', p.buri,  1);

  const _writtenHofNotes = new Set();
  for (const ev of p.events) {
    lines.push(`1 ${ev.type}${ev.value ? ' ' + ev.value : ''}`);
    if (ev._grampsEvPriv) lines.push(`2 RESN confidential`);
    if (ev.eventType) lines.push(`2 TYPE ${ev.eventType}`);
    if (ev.date !== null && ev.date !== undefined) {
      lines.push(`2 DATE${ev.date ? ' ' + normGedDate(ev.date) : ''}`);
      if (_ged7 && ev.datePhrase) lines.push(`3 PHRASE ${ev.datePhrase}`);
    }
    const _hofMeta = ev.addr ? AppState.db?.hofObjects?.[ev.addr.trim()] : null;
    if (ev.place !== null && ev.place !== undefined) {
      lines.push(`2 PLAC${ev.place ? ' ' + ev.place : ''}`);
      _writePlacTrans(lines, ev.place, 3);
      geoLines(lines, ev, 3, false); // kein extraPlaces-Fallback für Array-Events
    } else if (ev.addr) {
      // Kein PLAC vorhanden: hofObjects-Koordinaten als PLAC+MAP schreiben (für Ancestris/andere)
      if (_hofMeta?.lat != null) {
        lines.push(`2 PLAC ${ev.addr.replace(/\n/g, ', ')}`);
        geoLines(lines, { lati: _hofMeta.lat, long: _hofMeta.long }, 3);
      }
    }
    // Hof-Notiz schreiben — nur beim ersten Event mit dieser Adresse,
    // und nur wenn das Event selbst ursprünglich eine Note hatte.
    const _addrKey = ev.addr?.trim();
    const _evNoteIsHofNote = _hofMeta?.note && ev.note === _hofMeta.note;
    const _evHadNote = !!(ev._noteOrig || ev.noteRefs?.length);
    for (const r of (ev.noteRefs || [])) {
      // HOF-Notiz-Refs überspringen — werden über _hofNoteIds separat als @N_HOF_n@ geschrieben
      if (_hofMeta?.note && AppState.db.notes?.[r]?.text === _hofMeta.note) continue;
      lines.push(`2 NOTE ${_noteXref[r]||r}`);
    }
    if (_hofMeta?.note && _hofNoteIds[_addrKey]) {
      if (_evHadNote && !_writtenHofNotes.has(_addrKey)) {
        lines.push(`2 NOTE ${_hofNoteIds[_addrKey]}`);
        _writtenHofNotes.add(_addrKey);
      }
    } else if (_hofMeta?.note && _evHadNote && (!ev.note || _evNoteIsHofNote) && !_writtenHofNotes.has(_addrKey)) {
      pushCont(lines, 2, 'NOTE', _hofMeta.note);
      _writtenHofNotes.add(_addrKey);
    } else if (!_evNoteIsHofNote) {
      const _inlineNote = ev._noteOrig !== undefined ? ev._noteOrig : ev.note;
      if (_inlineNote) pushCont(lines, 2, 'NOTE', _inlineNote);
    }
    if (ev.addr || (ev.addrExtra && ev.addrExtra.length)) { pushCont(lines, 2, 'ADDR', ev.addr || ''); if (ev.addrExtra && ev.addrExtra.length) for (const l of ev.addrExtra) lines.push(l); }
    for (const ph of (ev.phon  || [])) lines.push(`2 PHON ${ph}`);
    for (const em of (ev.email || [])) lines.push(`2 EMAIL ${em}`);
    _writeSourCits(lines, 2, ev);
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

  for (const ref of (p.noteRefs || [])) {
    lines.push(`1 NOTE ${_noteXref[ref]||ref}`);
    for (const l of (p.noteRefExtras?.[ref] || [])) lines.push(l);
  }
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
      // citations[] + frelSour/mrelSour zusammenführen
      const _famcCits = [...(fref.citations || [])];
      for (const [xSour, xPage, xQuay] of [
        [fref.frelSour, fref.frelPage, fref.frelQUAY],
        [fref.mrelSour, fref.mrelPage, fref.mrelQUAY]
      ]) {
        if (xSour && !_famcCits.some(c => c.sid === xSour))
          _famcCits.push(citationObj(xSour, xPage || '', xQuay || ''));
      }
      _writeSourCits(lines, 2, { citations: _famcCits });
    }
  }

  for (const f of p.fams) lines.push(`1 FAMS ${f}`);

  for (const m of p.media) {
    lines.push(`1 OBJE`);
    if (m.titleIsLv2 && m.title) lines.push(`2 TITL ${m.title}`);
    if (m.file) {
      lines.push(`2 FILE ${m.file}`);
      const form = _mediaFormStr(m);
      if (form) { lines.push(`3 FORM ${form}`); if (m.medi) lines.push(`4 MEDI ${m.medi}`); }
    }
    if (!m.titleIsLv2 && m.title) lines.push(`3 TITL ${m.title}`);
    for (const l of (m._extra || [])) lines.push(l);
    if (m.note)  pushCont(lines, 2, 'NOTE', m.note);
    if (m.date)  lines.push(`2 _DATE ${m.date}`);
    if (m.scbk)  lines.push(`2 _SCBK ${m.scbk}`);
    if (m.prim)  lines.push(`2 _PRIM ${m.prim}`);
  }

  if (p.uid)      lines.push(`1 _UID ${p.uid}`);
  if (p.grampId)  lines.push(`1 _GRAMPS_ID ${p.grampId}`);
  if (p._stat !== null && p._stat !== undefined) lines.push(`1 _STAT${p._stat ? ' ' + p._stat : ''}`);

  for (const t of (p._tasks || [])) {
    lines.push(`1 _TASK ${t.text || ''}`);
    if (t.category) lines.push(`2 _CAT ${t.category}`);
    lines.push(`2 _DONE ${t.done ? '1' : '0'}`);
    if (t.created)  lines.push(`2 _DATE ${t.created}`);
    if (t.id)       lines.push(`2 _ID ${t.id}`);
  }
  for (const rl of (p._rlog || [])) {
    lines.push(`1 _RLOG`);
    if (rl.date)    lines.push(`2 DATE ${rl.date}`);
    if (rl.repoRef) lines.push(`2 REPO ${rl.repoRef}`);
    if (rl.sourRef) lines.push(`2 SOUR ${rl.sourRef}`);
    if (rl.query)   lines.push(`2 _QUERY ${rl.query}`);
    if (rl.result)  lines.push(`2 _RESULT ${rl.result}`);
    if (rl.note)    pushCont(lines, 2, 'NOTE', rl.note);
  }

  // ASSO: native associations (GEDCOM↔GRAMPS <personref> roundtrip)
  for (const a of (p.associations || [])) {
    if (!a.xref) continue;
    lines.push(`1 ASSO ${a.xref}`);
    if (a.role) lines.push(_ged7 ? `2 ROLE ${a.role}` : `2 RELA ${a.role}`);
    if (a.note) pushCont(lines, 2, 'NOTE', a.note);
    _writeSourCits(lines, 2, a);
  }

  for (const alias of (p.aliases || [])) lines.push(`1 ALIA ${alias}`);
  for (const r of (p.refns || [])) { lines.push(`1 REFN ${r.val}`); if (r.type) lines.push(`2 TYPE ${r.type}`); }

  // GED7: NO / EXID / CREA — GED5-Downgrade: EXID→REFN, NO→NOTE
  if (_ged7) {
    for (const ev of (p.noEvents || [])) lines.push(`1 NO ${ev}`);
    for (const ex of (p.exids || [])) {
      lines.push(`1 EXID ${ex.value || ''}`);
      if (ex.type) lines.push(`2 TYPE ${ex.type}`);
    }
    if (p.createdDate) { lines.push('1 CREA'); lines.push(`2 DATE ${p.createdDate}`); }
  } else {
    // GED5-Downgrade: exids als REFN erhalten; noEvents als NOTE-Hinweis
    for (const ex of (p.exids || [])) {
      lines.push(`1 REFN ${ex.value || ''}`);
      if (ex.type) lines.push(`2 TYPE ${ex.type}`);
    }
    for (const ev of (p.noEvents || []))
      lines.push(`1 NOTE Kein bekanntes Ereignis: ${ev}`);
  }

  // Phase F: GRAMPS witness event refs → ASSO (event context in NOTE; primary person via _witnessEvMap)
  for (const wr of (p._grampsWitnessRefs || [])) {
    const primaryId = _witnessEvMap[wr._origHlink];
    if (!primaryId) continue;
    lines.push(`1 ASSO ${primaryId}`);
    lines.push(_ged7 ? `2 ROLE ${wr.role || 'WITN'}` : `2 RELA ${wr.role || 'Witness'}`);
    const evInfo = [wr.type, wr.date, wr.place].filter(Boolean).join(', ');
    if (evInfo) lines.push(`2 NOTE GRAMPS event: ${evInfo}`);
    _writeSourCits(lines, 2, wr);
  }

  writeCHAN(lines, p, 1);

  for (let i = _ptNameEnd; i < _pt.length; i++) lines.push(_pt[i]);
}

// ─── FAM-Record ───────────────────────────────────────────────────────────────
function writeFAMRecord(lines, f) {
  lines.push(`0 ${f.id} FAM`);
  if (f.husb) lines.push(`1 HUSB ${f.husb}`);
  if (f.wife) lines.push(`1 WIFE ${f.wife}`);
  for (const c of f.children) {
    lines.push(`1 CHIL ${c}`);
    const _cr = f.childRelations?.[c];
    if (_cr) {
      _writeSourCits(lines, 2, _cr);
      // _FREL/_MREL mit verschachteltem SOUR (z.B. Ancestris-Format: 2 _FREL → 3 SOUR @@Sxx@@ → 4 PAGE/QUAY)
      if (_cr.frelSeen) {
        lines.push(`2 _FREL ${_cr.frel}`);
        if (_cr.frelSour) {
          lines.push(`3 SOUR ${_cr.frelSour}`);
          if (_cr.frelPage) lines.push(`4 PAGE ${_cr.frelPage}`);
          if (_cr.frelQUAY) lines.push(`4 QUAY ${_cr.frelQUAY}`);
          for (const l of (_cr.frelSourExtra || [])) lines.push(l);
        }
      }
      if (_cr.mrelSeen) {
        lines.push(`2 _MREL ${_cr.mrel}`);
        if (_cr.mrelSour) {
          lines.push(`3 SOUR ${_cr.mrelSour}`);
          if (_cr.mrelPage) lines.push(`4 PAGE ${_cr.mrelPage}`);
          if (_cr.mrelQUAY) lines.push(`4 QUAY ${_cr.mrelQUAY}`);
          for (const l of (_cr.mrelSourExtra || [])) lines.push(l);
        }
      }
    }
  }

  eventBlock(lines, 'MARR', f.marr, 1);
  if (f.marr.addr) pushCont(lines, 2, 'ADDR', f.marr.addr);
  eventBlock(lines, 'ENGA', f.engag, 1);
  eventBlock(lines, 'DIV',  f.div,   1);
  eventBlock(lines, 'DIVF', f.divf,  1);

  for (const ev of (f.events || [])) {
    lines.push(`1 ${ev.type}${ev.value ? ' ' + ev.value : ''}`);
    if (ev._grampsEvPriv) lines.push(`2 RESN confidential`);
    if (ev.eventType) lines.push(`2 TYPE ${ev.eventType}`);
    if (ev.date !== null && ev.date !== undefined) {
      lines.push(`2 DATE${ev.date ? ' ' + normGedDate(ev.date) : ''}`);
      if (_ged7 && ev.datePhrase) lines.push(`3 PHRASE ${ev.datePhrase}`);
    }
    if (ev.place !== null && ev.place !== undefined) {
      lines.push(`2 PLAC${ev.place ? ' ' + ev.place : ''}`);
      _writePlacTrans(lines, ev.place, 3);
      geoLines(lines, ev, 3);
    }
    const _famEvNote = ev._noteOrig !== undefined ? ev._noteOrig : ev.note;
    if (_famEvNote) pushCont(lines, 2, 'NOTE', _famEvNote);
    for (const r of (ev.noteRefs || [])) lines.push(`2 NOTE ${_noteXref[r]||r}`);
    _writeSourCits(lines, 2, ev);
    if (ev._extra && ev._extra.length) for (const l of ev._extra) lines.push(l);
  }

  for (const r of (f.refns || [])) { lines.push(`1 REFN ${r.val}`); if (r.type) lines.push(`2 TYPE ${r.type}`); }
  if (f.grampId)  lines.push(`1 _GRAMPS_ID ${f.grampId}`);
  if (f._stat !== null && f._stat !== undefined) lines.push(`1 _STAT${f._stat ? ' ' + f._stat : ''}`);
  for (const t of (f._tasks || [])) {
    lines.push(`1 _TASK ${t.text || ''}`);
    if (t.category) lines.push(`2 _CAT ${t.category}`);
    lines.push(`2 _DONE ${t.done ? '1' : '0'}`);
    if (t.created)  lines.push(`2 _DATE ${t.created}`);
    if (t.id)       lines.push(`2 _ID ${t.id}`);
  }
  for (const rl of (f._rlog || [])) {
    lines.push(`1 _RLOG`);
    if (rl.date)    lines.push(`2 DATE ${rl.date}`);
    if (rl.repoRef) lines.push(`2 REPO ${rl.repoRef}`);
    if (rl.sourRef) lines.push(`2 SOUR ${rl.sourRef}`);
    if (rl.query)   lines.push(`2 _QUERY ${rl.query}`);
    if (rl.result)  lines.push(`2 _RESULT ${rl.result}`);
    if (rl.note)    pushCont(lines, 2, 'NOTE', rl.note);
  }
  for (const ref of (f.noteRefs || [])) {
    lines.push(`1 NOTE ${_noteXref[ref]||ref}`);
    for (const l of (f.noteRefExtras?.[ref] || [])) lines.push(l);
  }
  for (const nt of (f.noteTexts || [])) if (nt) pushCont(lines, 1, 'NOTE', nt);

  for (const m of (f.media || [])) {
    if (!m.file && !m.title) continue;
    lines.push(`1 OBJE`);
    if (m.titleIsLv2 && m.title) lines.push(`2 TITL ${m.title}`);
    if (m.file) {
      lines.push(`2 FILE ${m.file}`);
      const form = _mediaFormStr(m);
      if (form) { lines.push(`3 FORM ${form}`); if (m.medi) lines.push(`4 MEDI ${m.medi}`); }
      if (m.title && !m.titleIsLv2) lines.push(`3 TITL ${m.title}`);
    } else if (m.title && !m.titleIsLv2) {
      lines.push(`2 TITL ${m.title}`);
    }
    for (const l of (m._extra || [])) lines.push(l);
    if (m.note)  pushCont(lines, 2, 'NOTE', m.note);
    if (m.date)  lines.push(`2 _DATE ${m.date}`);
    if (m.scbk)  lines.push(`2 _SCBK ${m.scbk}`);
    if (m.prim)  lines.push(`2 _PRIM ${m.prim}`);
  }

  writeCHAN(lines, f, 1);

  for (const l of (f._passthrough || [])) {
    if (/^1 (DIV|DIVF|ENG|ENGA)\b/.test(l)) continue; // jetzt strukturiert
    lines.push(l);
  }
}

// ─── SOUR-Record ──────────────────────────────────────────────────────────────
function writeSOURRecord(lines, s) {
  lines.push(`0 ${s.id} SOUR`);
  if (s.abbr)   lines.push(`1 ABBR ${s.abbr}`);
  if (s.title)  pushCont(lines, 1, 'TITL', s.title);
  if (s.author) pushCont(lines, 1, 'AUTH', s.author);
  if (s.date)   lines.push(`1 DATE ${s.date}`);
  if (s.publ)   pushCont(lines, 1, 'PUBL', s.publ);
  if (s.repo) {
    lines.push(`1 REPO ${s.repo}`);
    if (s.repoCalns?.length) {
      for (const rc of s.repoCalns) {
        if (!rc.num) continue;
        lines.push(`2 CALN ${rc.num}`);
        if (rc.medi) lines.push(`3 MEDI ${rc.medi}`);
        for (const l of (rc.extra || [])) lines.push(l);
      }
    } else if (s.repoCallNum) {
      lines.push(`2 CALN ${s.repoCallNum}`);
      if (s.repoCallMedi) lines.push(`3 MEDI ${s.repoCallMedi}`);
      for (const l of (s.repoCallNumExtra || [])) lines.push(l);
    }
  }
  if (s._textSeen) pushCont(lines, 1, 'TEXT', s.text || '');
  if (s.agnc || (s.dataEvens && s.dataEvens.length) || (s.dataExtra && s.dataExtra.length)) {
    lines.push(`1 DATA`);
    if (s.agnc) lines.push(`2 AGNC ${s.agnc}`);
    for (const de of (s.dataEvens || [])) {
      lines.push(`2 EVEN${de.evens ? ' ' + de.evens : ''}`);
      if (de.date) lines.push(`3 DATE ${de.date}`);
      if (de.plac) lines.push(`3 PLAC ${de.plac}`);
    }
    for (const l of (s.dataExtra || [])) lines.push(l);
  }
  for (const m of (s.media || [])) {
    if (!m.file && !m.title) continue;
    lines.push(`1 OBJE`);
    if (m.titleIsLv2 && m.title) lines.push(`2 TITL ${m.title}`);
    if (m.file) {
      lines.push(`2 FILE ${m.file}`);
      const form = _mediaFormStr(m);
      if (form) { lines.push(`3 FORM ${form}`); if (m.medi) lines.push(`4 MEDI ${m.medi}`); }
      if (m.title && !m.titleIsLv2) lines.push(`3 TITL ${m.title}`);
    } else if (m.title && !m.titleIsLv2) {
      lines.push(`2 TITL ${m.title}`);
    }
    for (const l of (m._extra || [])) lines.push(l);
    if (m.note)  pushCont(lines, 2, 'NOTE', m.note);
    if (m.date)  lines.push(`2 _DATE ${m.date}`);
    if (m.scbk)  lines.push(`2 _SCBK ${m.scbk}`);
    if (m.prim)  lines.push(`2 _PRIM ${m.prim}`);
  }
  for (const ref of (s.noteRefs || [])) lines.push(`1 NOTE ${_noteXref[ref]||ref}`);
  if (s.note) pushCont(lines, 1, 'NOTE', s.note);
  if (s._date)   lines.push(`1 _DATE ${s._date}`);
  for (const r of (s.refns || [])) { lines.push(`1 REFN ${r.val}`); if (r.type) lines.push(`2 TYPE ${r.type}`); }
  if (s.grampId) lines.push(`1 _GRAMPS_ID ${s.grampId}`);
  writeCHAN(lines, s, 1);
  for (const l of (s._passthrough || [])) lines.push(l);
}

// ─── REPO-Record ──────────────────────────────────────────────────────────────
function writeREPORecord(lines, r) {
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
  for (const l of (r._passthrough || [])) lines.push(l);
  writeCHAN(lines, r, 1);
}

// ─── NOTE-Record ──────────────────────────────────────────────────────────────
function writeNOTERecord(lines, n) {
  const _tag = (_ged7 && n.type === 'SNOTE') ? 'SNOTE' : 'NOTE';
  const _xref = _noteXref[n.id] || n.id;
  if (_ged7) {
    // GED7: kein CONC, kein Längenlimit
    const rawLines = (n.text || '').split('\n');
    for (let li = 0; li < rawLines.length; li++) {
      if (li === 0) lines.push(`0 ${_xref} ${_tag} ${rawLines[li]}`);
      else          lines.push(`1 CONT ${rawLines[li]}`);
    }
    if (!rawLines.length) lines.push(`0 ${_xref} ${_tag} `);
  } else {
    const MAX = 248;
    const rawLines = (n.text || '').split('\n');
    for (let li = 0; li < rawLines.length; li++) {
      let s = rawLines[li];
      let firstChunk = true;
      do {
        const chunk = s.slice(0, MAX);
        s = s.slice(MAX);
        if (li === 0 && firstChunk) lines.push(`0 ${_xref} ${_tag} ${chunk}`);
        else if (firstChunk)        lines.push(`1 CONT ${chunk}`);
        else                        lines.push(`1 CONC ${chunk}`);
        firstChunk = false;
      } while (s.length > 0);
    }
    if (!rawLines.length) lines.push(`0 ${_xref} ${_tag} `);
  }
  writeCHAN(lines, n, 1);
  for (const l of (n._passthrough || [])) lines.push(l);
}

// ─────────────────────────────────────
//  GEDCOM WRITER  (v3 – aufgeteilt)
// ─────────────────────────────────────
/**
 * Serialisiert AppState.db als GEDCOM 5.5.1-Text.
 * @param {boolean} [updateHeadDate=false] - true = HEAD/DATE auf jetzt setzen
 * @returns {string}
 */
function writeGEDCOM(updateHeadDate = false, forceGed7 = false) {
  _ged7 = forceGed7;
  const lines = [];
  const d = new Date();
  const fname = localStorage.getItem('stammbaum_filename') || 'stammbaum.ged';

  // ── HEAD ──
  if (db.headLines && db.headLines.length > 0) {
    if (!_ged7) {
      // GED5: Verbatim HEAD aus Original; DATE/TIME nur bei updateHeadDate=true aktualisieren
      for (const l of db.headLines) {
        if (updateHeadDate && /^1 DATE /.test(l)) { lines.push(`1 DATE ${gedcomDate(d)}`); continue; }
        if (updateHeadDate && /^2 TIME /.test(l)) { lines.push(`2 TIME ${gedcomTime(d)}`); continue; }
        lines.push(l);
      }
    } else {
      // GED7: HEAD aus Original, aber CHAR/FORM entfernen, VERS 7.0, SCHMA einfügen
      let _afterGedcVers = false, _schmaInserted = false;
      for (const l of db.headLines) {
        if (/^1 CHAR\b/.test(l)) continue;
        if (/^2 FORM LINEAGE-LINKED/.test(l)) continue;
        if (/^2 VERS 5\.5/.test(l)) { lines.push('2 VERS 7.0'); _afterGedcVers = true; continue; }
        if (updateHeadDate && /^1 DATE /.test(l)) { lines.push(`1 DATE ${gedcomDate(d)}`); continue; }
        if (updateHeadDate && /^2 TIME /.test(l)) { lines.push(`2 TIME ${gedcomTime(d)}`); continue; }
        if (_afterGedcVers && !/^[23456789] /.test(l) && !_schmaInserted) {
          _g7WriteSchma(lines); _schmaInserted = true; _afterGedcVers = false;
        }
        lines.push(l);
      }
      if (!_schmaInserted) _g7WriteSchma(lines);
    }
  } else {
    if (!_ged7) {
      // GED5 Fallback: minimaler HEAD
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
    } else {
      // GED7 Fallback HEAD
      lines.push('0 HEAD');
      lines.push('1 GEDC');
      lines.push('2 VERS 7.0');
      _g7WriteSchma(lines);
      lines.push(`1 DATE ${gedcomDate(d)}`);
      lines.push(`2 TIME ${gedcomTime(d)}`);
      lines.push(`1 FILE ${fname}`);
      lines.push('1 PLAC');
      lines.push(`2 FORM ${db.placForm || 'Dorf, Stadt, PLZ, Landkreis, Bundesland, Staat'}`);
    }
  }

  // Phase F: build eventHandle → primaryPersonId for witness→ASSO bridge
  _witnessEvMap = {};
  for (const [pId, p] of Object.entries(db.individuals)) {
    for (const ev of [p.birth, p.chr, p.death, p.buri, ...(p.events || [])]) {
      if (ev?._grampsEvHlink) _witnessEvMap[ev._grampsEvHlink] = pId;
    }
  }

  // Phase F12: HOF NOTE-IDs aufbauen (stabil sortiert nach Adresse)
  _hofNoteIds = {};
  Object.entries(db.hofObjects || {})
    .filter(([, h]) => h.note)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([addr], i) => { _hofNoteIds[addr] = `@N_HOF_${i + 1}@`; });

  // Cross-mode: GRAMPS handle → GEDCOM XREF (grampId → @N0001@; GEDCOM ids sind schon @…@)
  _noteXref = {};
  for (const n of Object.values(db.notes || {})) {
    _noteXref[n.id] = n.grampId ? `@${n.grampId}@` : n.id;
  }

  const _livingSet = AppState.privacyAnon ? _buildLivingSet(db) : null;
  for (const p of Object.values(db.individuals))  writeINDIRecord(lines, p, _livingSet);
  for (const f of Object.values(db.families))     writeFAMRecord(lines, f);
  for (const s of Object.values(db.sources))      writeSOURRecord(lines, s);
  for (const r of Object.values(db.repositories)) writeREPORecord(lines, r);
  // HOF-Notiz-Texte die über _hofNoteIds geschrieben werden — nicht doppelt aus db.notes schreiben
  const _hofNoteTexts = new Set(Object.keys(_hofNoteIds).map(addr => db.hofObjects[addr].note));
  for (const n of Object.values(db.notes || {}))
    if (!_hofNoteTexts.has(n.text)) writeNOTERecord(lines, n);
  for (const [addr, id] of Object.entries(_hofNoteIds))
    writeNOTERecord(lines, { id, text: db.hofObjects[addr].note, _passthrough: [] });

  // Unknown lv=0 records (SUBM etc.) — verbatim passthrough
  for (const rec of (db.extraRecords || [])) {
    for (const l of rec._lines) lines.push(l);
  }

  lines.push('0 TRLR');
  return lines.join('\r\n');
}
