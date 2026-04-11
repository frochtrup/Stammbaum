// ─────────────────────────────────────
//  GRAMPS XML WRITER  (Phase 3 — round-trip export)
//  writeGRAMPS(db) → Promise<Blob>  (.gramps = gzip-compressed XML)
//  Erzeugt eine valide GRAMPS XML 1.7.2 Datei aus dem AppState db-Objekt.
// ─────────────────────────────────────

// AppState GEDCOM tag → GRAMPS event type string
const _GED_TO_GRAMPS = {
  BIRT:'Birth',    DEAT:'Death',    CHR:'Christening', BURI:'Burial',
  MARR:'Marriage', ENGA:'Engagement', DIV:'Divorce',   DIVF:'Divorce Filing',
  OCCU:'Occupation', RESI:'Residence', EDUC:'Education', RELI:'Religion',
  EMIG:'Emigration', IMMI:'Immigration', NATU:'Naturalization',
  GRAD:'Graduation', ADOP:'Adoption',   MILI:'Military Service',
  PROP:'Property',   WILL:'Will',       PROB:'Probate',
  CENS:'Census',     CONF:'Confirmation', FCOM:'First Communion',
  ORDN:'Ordination', RETI:'Retirement',  ANUL:'Annulment',
  EVEN: null, // EVEN → value contains "TypeName: desc"
};

// GEDCOM QUAY (0–3) → GRAMPS confidence (0–4)
const _QUAY_TO_CONF = [0, 2, 3, 4];

// XML attribute/text escape
function _esc(s) {
  return (s == null ? '' : String(s))
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// GEDCOM date part (e.g. "16 FEB 1967") → ISO string "1967-02-16"
function _gedPartToISO(s) {
  if (!s) return '';
  const MON = { JAN:'01',FEB:'02',MAR:'03',APR:'04',MAY:'05',JUN:'06',
                JUL:'07',AUG:'08',SEP:'09',OCT:'10',NOV:'11',DEC:'12' };
  const u = s.trim().toUpperCase();
  const dMY = u.match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})$/);
  if (dMY && MON[dMY[2]]) return `${dMY[3]}-${MON[dMY[2]]}-${String(+dMY[1]).padStart(2,'0')}`;
  const mY = u.match(/^([A-Z]{3})\s+(\d{4})$/);
  if (mY && MON[mY[1]]) return `${mY[2]}-${MON[mY[1]]}`;
  if (/^\d{1,4}$/.test(u)) return u;
  return s; // unknown format → verbatim in datestr
}

// GEDCOM date string → GRAMPS date XML element string
function _gedToGrampsDateXML(ged) {
  if (!ged) return '';
  const s = ged.trim();

  // FROM X TO Y → datespan
  const fromTo = s.match(/^FROM\s+(.+?)\s+TO\s+(.+)$/i);
  if (fromTo) {
    const a = _esc(_gedPartToISO(fromTo[1].trim()));
    const b = _esc(_gedPartToISO(fromTo[2].trim()));
    return `<datespan start="${a}" stop="${b}"/>`;
  }
  // BET X AND Y → daterange
  const bet = s.match(/^BET\s+(.+?)\s+AND\s+(.+)$/i);
  if (bet) {
    const a = _esc(_gedPartToISO(bet[1].trim()));
    const b = _esc(_gedPartToISO(bet[2].trim()));
    return `<daterange start="${a}" stop="${b}"/>`;
  }
  // TO X → kein GRAMPS-Pendant (≠ after); verbatim als datestr
  if (/^TO /i.test(s)) return `<datestr val="${_esc(s)}"/>`;

  // Qualifiers → dateval with type
  const QUALS = { BEF:'before', AFT:'after', ABT:'about', EST:'estimated', CAL:'calculated', FROM:'from' };
  for (const [q, type] of Object.entries(QUALS)) {
    if (s.toUpperCase().startsWith(q + ' ')) {
      const rest = s.slice(q.length + 1).trim();
      const iso  = _gedPartToISO(rest);
      if (!iso) return '';
      // check if ISO looks reliable; if not, use datestr
      if (/^\d{4}(-\d{2}(-\d{2})?)?$/.test(iso)) {
        return `<dateval val="${_esc(iso)}" type="${type}"/>`;
      }
      return `<datestr val="${_esc(rest)}"/>`;
    }
  }
  // Plain date
  const iso = _gedPartToISO(s);
  if (/^\d{4}(-\d{2}(-\d{2})?)?$/.test(iso)) return `<dateval val="${_esc(iso)}"/>`;
  if (/^\d{4}$/.test(s)) return `<dateval val="${_esc(s)}"/>`;
  return `<datestr val="${_esc(s)}"/>`;
}

// Decimal lat/long → GRAMPS "N52.15" / "E7.33" format
function _decToGrampsCoord(lat, long) {
  const la = parseFloat(lat), lo = parseFloat(long);
  if (isNaN(la) || isNaN(lo)) return null;
  return {
    lat:  (la >= 0 ? 'N' : 'S') + Math.abs(la),
    long: (lo >= 0 ? 'E' : 'W') + Math.abs(lo),
  };
}

// Media path: reverse of _grampsMediaPath in parser
function _toGrampsSrc(file) {
  if (!file) return '';
  // Add ../OneDrive/ prefix if the path looks like a relative OneDrive path
  if (!file.startsWith('/') && !file.startsWith('.') && !file.startsWith('http')) {
    return '../OneDrive/' + file;
  }
  return file;
}

// ─────────────────────────────────────
//  MAIN WRITER
// ─────────────────────────────────────
async function writeGRAMPS(db) {
  if (!db || !db.individuals) throw new Error('Kein db vorhanden');

  // ── Counter + handle generation ──────────────────────────────────────────
  let _hctr = 0;
  const _h = prefix => `_pwa${prefix}${String(++_hctr).padStart(8, '0')}`;

  // ── Inverse handle map: @ID@ → original grampsHandle ─────────────────────
  const idToHandle = {};
  for (const [handle, id] of Object.entries(db._grampsHandles || {})) {
    idToHandle[id] = handle;
  }
  // Pre-generate stable handles for entities without a GRAMPS handle (e.g. GEDCOM-loaded data).
  // Must happen before any write/citation code so the same handle is used everywhere.
  for (const id of Object.keys(db.individuals   || {})) { if (!idToHandle[id]) idToHandle[id] = _h('pe'); }
  for (const id of Object.keys(db.families      || {})) { if (!idToHandle[id]) idToHandle[id] = _h('fa'); }
  for (const id of Object.keys(db.sources       || {})) { if (!idToHandle[id]) idToHandle[id] = _h('so'); }
  for (const id of Object.keys(db.repositories  || {})) { if (!idToHandle[id]) idToHandle[id] = _h('re'); }
  for (const id of Object.keys(db.notes         || {})) { if (!idToHandle[id]) idToHandle[id] = _h('no'); }
  for (const id of Object.keys(db.placeObjects  || {})) { if (!idToHandle[id]) idToHandle[id] = _h('pl'); }
  const _entityHandle = (id, prefix) => idToHandle[id] || _h(prefix);

  // ── Deduplicating collectors ──────────────────────────────────────────────
  let evCtr=0, plCtr=0, citCtr=0, noteCtr=0, objCtr=0;
  const evRecs   = [];        // in order
  const plRecs   = {};        // placeStr → rec
  const citRecs  = {};        // key → rec
  const noteRecs = {};        // text → rec (for inline event notes)
  const objRecs  = {};        // file → rec

  const _plHandle = (plStr, lat, long) => {
    if (!plStr) return null;
    if (!plRecs[plStr]) {
      plRecs[plStr] = { handle: _h('pl'), id: `P${String(plCtr++).padStart(4,'0')}`, title: plStr, lat, long };
    }
    return plRecs[plStr].handle;
  };

  const _citHandle = (srcId, page, quay) => {
    const srcH = idToHandle[srcId];
    if (!srcH) return null;
    const key = `${srcH}|${page||''}|${quay||0}`;
    if (!citRecs[key]) {
      citRecs[key] = {
        handle: _h('ci'),
        id: `C${String(citCtr++).padStart(4,'0')}`,
        sourceHandle: srcH,
        confidence: _QUAY_TO_CONF[Math.min(3, Math.max(0, +quay || 0))],
        page: page || ''
      };
    }
    return citRecs[key].handle;
  };

  // _noteHandle: für inline/synthetische Notes (kein GRAMPS-Handle bekannt).
  // Key = 't:' + text (Namespace trennt von Handle-Keys).
  const _noteHandle = (text, type) => {
    if (!text) return null;
    const key = 't:' + text;
    if (!noteRecs[key]) {
      noteRecs[key] = { handle: _h('no'), id: `N${String(noteCtr++).padStart(4,'0')}`, text, type: type||'General' };
    }
    return noteRecs[key].handle;
  };

  // _noteHandleFromObj: für Notes aus db.notes mit originalem _grampsHandle.
  // Key = Handle (falls vorhanden) → verhindert Verschmelzung gleicher Texte verschiedener Notes.
  const _noteHandleFromObj = (noteObj) => {
    const text = noteObj?.text || '';
    if (!text) return null;
    const key = noteObj._grampsHandle ? noteObj._grampsHandle : ('t:' + text);
    if (!noteRecs[key]) {
      noteRecs[key] = { handle: noteObj._grampsHandle || _h('no'), id: `N${String(noteCtr++).padStart(4,'0')}`, text, type: 'General' };
    }
    return noteRecs[key].handle;
  };

  const _objHandle = (file, titl, mime) => {
    if (!file) return null;
    if (!objRecs[file]) {
      objRecs[file] = { handle: _h('ob'), id: `O${String(objCtr++).padStart(4,'0')}`, src: _toGrampsSrc(file), mime: mime||'image/jpeg', desc: titl||'' };
    }
    return objRecs[file].handle;
  };

  // ── Emit <attribute> element (self-closing or block with citations/notes) ──
  const _attrXML = (indent, a) => {
    const hasSub = a.sources?.length || a.note;
    if (!hasSub) {
      L.push(`${indent}<attribute type="${_esc(a.type)}" value="${_esc(a.value)}"/>`);
      return;
    }
    L.push(`${indent}<attribute type="${_esc(a.type)}" value="${_esc(a.value)}">`);
    for (const sId of a.sources || []) {
      const ch = _citHandle(sId, a.sourcePages?.[sId], a.sourceQUAY?.[sId] ?? 0);
      if (ch) L.push(`${indent}  <citationref hlink="${_esc(ch)}"/>`);
    }
    if (a.note) {
      const nh = _noteHandle(a.note, 'Attribute Note');
      if (nh) L.push(`${indent}  <noteref hlink="${_esc(nh)}"/>`);
    }
    L.push(`${indent}</attribute>`);
  };

  // ── Collect event from event-like object, return {handle, role} or null ───
  const _collectEv = (grampsType, evObj, role) => {
    if (!evObj?.seen && !evObj?.date && !evObj?.place && !evObj?.placeId && !(evObj?.sources?.length)) return null;
    const handle   = _h('ev');
    const id       = `E${String(evCtr++).padStart(4,'0')}`;
    // Use original place ID if available (GRAMPS source with placeObjects), else string-based
    // Guard: placeId nur verwenden wenn das placeObject auch existiert (defekte Dateien)
    const plHandle = (db.placeObjects && evObj.placeId && db.placeObjects[evObj.placeId])
      ? _entityHandle(evObj.placeId, 'pl')
      : _plHandle(evObj.place || null, evObj.lati, evObj.long);
    const citHandles = (evObj.sources || [])
      .map(srcId => _citHandle(srcId, evObj.sourcePages?.[srcId], evObj.sourceQUAY?.[srcId] ?? 0))
      .filter(Boolean);
    const noteHandle = _noteHandle(evObj.note || null, 'Event Note');
    evRecs.push({ handle, id, type: grampsType, date: evObj.date||'', plHandle, desc: evObj.value||'', cause: evObj.cause||'', attrs: evObj._grampsAttrs||[], citHandles, noteHandle });
    return { handle, role: role||'Primary' };
  };

  // ── Resolve EVEN-type events (value = "TypeName: description") ────────────
  // Unterstützt auch GEDCOM-Cross-Pfad: ev.eventType als Fallback wenn ev.value leer
  const _resolveEvenType = (ev) => {
    const val = ev.value || '';
    const colon = val.indexOf(':');
    if (colon > 0) return { type: val.slice(0, colon).trim(), desc: val.slice(colon+1).trim() };
    if (ev.eventType) return { type: ev.eventType, desc: val };
    return { type: val || 'Event', desc: '' };
  };

  // ── Process persons ───────────────────────────────────────────────────────
  const personEvRefs  = {};  // @ID@ → [{handle, role}]
  const personObjRefs = {};  // @ID@ → [objHandle]
  const personCitRefs = {};  // @ID@ → [citHandle]  (top-level)
  const personNoteRefs= {};  // @ID@ → [noteHandle]
  const witnessEvMap  = {};  // origHlink → evHandle (shared witness events deduplication)

  for (const [pId, p] of Object.entries(db.individuals)) {
    const refs = [];

    // Structured events
    if (p.birth?.seen || p.birth?.date)
      { const r = _collectEv('Birth', p.birth, 'Primary'); if (r) refs.push(r); }
    if (p.chr?.seen || p.chr?.date)
      { const r = _collectEv('Christening', p.chr, 'Primary'); if (r) refs.push(r); }
    if (p.death?.seen || p.death?.date)
      { const r = _collectEv('Death', p.death, 'Primary'); if (r) refs.push(r); }
    if (p.buri?.seen || p.buri?.date)
      { const r = _collectEv('Burial', p.buri, 'Primary'); if (r) refs.push(r); }

    // Other events
    for (const ev of p.events || []) {
      if (!ev?.type) continue;
      const mapped = _GED_TO_GRAMPS[ev.type];
      let grampsType, desc;
      if (mapped === null) {
        const resolved = _resolveEvenType(ev);
        grampsType = resolved.type;
        desc = resolved.desc;
      } else {
        grampsType = mapped || ev.type;
        desc = ev.value || '';
      }
      const r = _collectEv(grampsType, { ...ev, seen: true, value: desc }, 'Primary');
      if (r) refs.push(r);
    }

    // Witness / non-primary event refs (stored by parser in _grampsWitnessRefs)
    for (const wr of p._grampsWitnessRefs || []) {
      if (!witnessEvMap[wr._origHlink]) {
        const r = _collectEv(wr.type, {
          seen: true, date: wr.date, place: wr.place, placeId: wr.placeId,
          lati: wr.lati ?? null, long: wr.long ?? null,
          cause: wr.cause || '', note: wr.note, value: wr.desc,
          sources: wr.sources, sourcePages: wr.sourcePages, sourceQUAY: wr.sourceQUAY,
        }, wr.role);
        if (r) witnessEvMap[wr._origHlink] = r.handle;
      }
      const wh = witnessEvMap[wr._origHlink];
      if (wh) refs.push({ handle: wh, role: wr.role });
    }

    personEvRefs[pId]   = refs;
    personObjRefs[pId]  = (p.media||[]).map(m => _objHandle(m.file, m.titl, m.mime)).filter(Boolean);
    personCitRefs[pId]  = (p.topSources||[]).map(s => _citHandle(s, p.topSourcePages?.[s], p.topSourceQUAY?.[s]??0)).filter(Boolean);

    // Person notes (Handle-first key → keine Verschmelzung gleicher Texte)
    const pNotes = [];
    for (const nId of p.noteRefs || []) {
      const nh = _noteHandleFromObj(db.notes?.[nId]);
      if (nh) pNotes.push(nh);
    }
    if (!p.noteRefs?.length && p.noteText) pNotes.push(_noteHandle(p.noteText, 'General'));
    personNoteRefs[pId] = [...new Set(pNotes)].filter(Boolean);
  }

  // ── Process families ──────────────────────────────────────────────────────
  const famEvRefs   = {};  // @ID@ → [{handle, role}]
  const famNoteRefs = {};  // @ID@ → [noteHandle]

  for (const [fId, f] of Object.entries(db.families)) {
    const refs = [];

    if (f.marr?.seen || f.marr?.date)
      { const r = _collectEv('Marriage', f.marr, 'Family'); if (r) refs.push(r); }
    if (f.engag?.seen || f.engag?.date)
      { const r = _collectEv('Engagement', f.engag, 'Family'); if (r) refs.push(r); }
    if (f.div?.seen || f.div?.date)
      { const r = _collectEv('Divorce', f.div, 'Family'); if (r) refs.push(r); }
    if (f.divf?.seen || f.divf?.date)
      { const r = _collectEv('Divorce Filing', f.divf, 'Family'); if (r) refs.push(r); }
    for (const ev of f.events || []) {
      if (!ev?.type) continue;
      const mapped = _GED_TO_GRAMPS[ev.type];
      let grampsType = mapped === null ? _resolveEvenType(ev).type : (mapped || ev.type);
      const r = _collectEv(grampsType, { ...ev, seen: true }, 'Family');
      if (r) refs.push(r);
    }

    famEvRefs[fId] = refs;

    const fNotes = [];
    for (const nId of f.noteRefs || []) {
      const nh = _noteHandleFromObj(db.notes?.[nId]);
      if (nh) fNotes.push(nh);
    }
    if (!f.noteRefs?.length && f.noteText) fNotes.push(_noteHandle(f.noteText, 'General'));
    famNoteRefs[fId] = [...new Set(fNotes)].filter(Boolean);
  }

  // ── Collect source media objects ──────────────────────────────────────────
  for (const s of Object.values(db.sources)) {
    for (const m of s.media || []) _objHandle(m.file, m.titl, m.mime);
  }

  // ── Build XML ──────────────────────────────────────────────────────────────
  const L = []; // output lines
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  // Use namespace/version from original file (prevents GRAMPS "newer version" import errors)
  const _ns      = db._grampsNS        || 'http://gramps-project.org/xml/1.7.2/';
  const _nsVer   = db._grampsNSVersion || '1.7.2';
  const _appVer  = db._grampsVersion   || '6.0.6';

  L.push('<?xml version="1.0" encoding="UTF-8"?>');
  L.push(`<!DOCTYPE database PUBLIC "-//Gramps//DTD Gramps XML ${_nsVer}//EN"`);
  L.push(`"http://gramps-project.org/xml/${_nsVer}/grampsxml.dtd">`);
  L.push(`<database xmlns="${_ns}">`);
  L.push('  <header>');
  L.push(`    <created date="${today}" version="${_appVer}"/>`);
  L.push('  </header>');

  // ── Events ──────────────────────────────────────────────────────────────
  if (evRecs.length) {
    L.push('  <events>');
    for (const ev of evRecs) {
      L.push(`    <event handle="${_esc(ev.handle)}" id="${_esc(ev.id)}">`);
      L.push(`      <type>${_esc(ev.type)}</type>`);
      const dateXML = _gedToGrampsDateXML(ev.date);
      if (dateXML) L.push(`      ${dateXML}`);
      if (ev.plHandle) L.push(`      <place hlink="${_esc(ev.plHandle)}"/>`);
      if (ev.desc)    L.push(`      <description>${_esc(ev.desc)}</description>`);
      if (ev.cause)   L.push(`      <attribute type="Cause" value="${_esc(ev.cause)}"/>`);
      for (const a of ev.attrs||[]) _attrXML('      ', a);
      if (ev.noteHandle) L.push(`      <noteref hlink="${_esc(ev.noteHandle)}"/>`);
      for (const ch of ev.citHandles) L.push(`      <citationref hlink="${_esc(ch)}"/>`);
      L.push('    </event>');
    }
    L.push('  </events>');
  }

  // ── People ────────────────────────────────────────────────────────────────
  L.push('  <people>');
  for (const [pId, p] of Object.entries(db.individuals)) {
    const handle = _entityHandle(pId, 'pe');
    const gid    = pId.replace(/^@|@$/g, '');
    L.push(`    <person handle="${_esc(handle)}" id="${_esc(gid)}">`);

    // Original-Reihenfolge: gender, name*, eventref*, objref*, attribute*, childof*, parentin*, noteref*, citationref*

    // Gender — GRAMPS erwartet M/F/U (nicht male/female/unknown!)
    const genderMap = { M:'M', F:'F', U:'U' };
    L.push(`      <gender>${genderMap[p.sex] || 'U'}</gender>`);

    // Primary name
    const given   = p.given   || '';
    const surname = p.surname || '';
    const nick    = p.nick    || '';
    const prefix  = p.prefix  || '';
    const suffix  = p.suffix  || '';
    L.push('      <name type="Birth Name">');
    if (given)   L.push(`        <first>${_esc(given)}</first>`);
    if (surname) L.push(`        <surname>${_esc(surname)}</surname>`);
    // <nick> nur ausgeben wenn ≠ _grampsCall (verhindert Doppel-Ausgabe wenn nick aus <call> abgeleitet)
    if (nick && nick !== (p._grampsCall || '')) L.push(`        <nick>${_esc(nick)}</nick>`);
    if (p._grampsCall) L.push(`        <call>${_esc(p._grampsCall)}</call>`);
    if (prefix)  L.push(`        <title>${_esc(prefix)}</title>`);
    if (suffix)  L.push(`        <suffix>${_esc(suffix)}</suffix>`);
    // Name sources
    for (const srcId of p.nameSources||[]) {
      const ch = _citHandle(srcId, p.nameSourcePages?.[srcId], p.nameSourceQUAY?.[srcId]??0);
      if (ch) L.push(`        <citationref hlink="${_esc(ch)}"/>`);
    }
    L.push('      </name>');

    // Extra names
    for (const en of p.extraNames||[]) {
      const nameTypeMap = { birth:'Birth Name', aka:'Also Known As', married:'Married Name', nickname:'Nickname', immigrant:'Immigrant' };
      const type = nameTypeMap[en.type] || (en.type || 'Also Known As');
      L.push(`      <name alt="1" type="${_esc(type)}">`);
      if (en.given)   L.push(`        <first>${_esc(en.given)}</first>`);
      if (en.surname) L.push(`        <surname>${_esc(en.surname)}</surname>`);
      if (en.nick)    L.push(`        <nick>${_esc(en.nick)}</nick>`);
      L.push('      </name>');
    }

    // Event refs
    for (const ref of personEvRefs[pId]||[]) {
      L.push(`      <eventref hlink="${_esc(ref.handle)}" role="${_esc(ref.role)}"/>`);
    }

    // Object refs (media)
    for (const oh of personObjRefs[pId]||[]) {
      L.push(`      <objref hlink="${_esc(oh)}"/>`);
    }

    // Attributes
    if (p.uid)   L.push(`      <attribute type="_UID" value="${_esc(p.uid)}"/>`);
    if (p._stat) L.push(`      <attribute type="_STAT" value="${_esc(p._stat)}"/>`);
    if (p.resn)  L.push(`      <attribute type="RESN" value="${_esc(p.resn)}"/>`);
    if (p.email) L.push(`      <attribute type="E-MAIL" value="${_esc(p.email)}"/>`);
    for (const a of p._grampsAttrs||[]) _attrXML('      ', a);

    // Family links
    for (const fc of p.famc||[]) {
      const famId  = typeof fc === 'string' ? fc : fc.famId;
      const famH   = _entityHandle(famId, 'fa');
      L.push(`      <childof hlink="${_esc(famH)}"/>`);
    }
    for (const famId of p.fams||[]) {
      const famH = _entityHandle(famId, 'fa');
      L.push(`      <parentin hlink="${_esc(famH)}"/>`);
    }

    // Note refs
    for (const nh of personNoteRefs[pId]||[]) {
      L.push(`      <noteref hlink="${_esc(nh)}"/>`);
    }

    // Top citation refs
    for (const ch of personCitRefs[pId]||[]) {
      L.push(`      <citationref hlink="${_esc(ch)}"/>`);
    }

    L.push('    </person>');
  }
  L.push('  </people>');

  // ── Families ──────────────────────────────────────────────────────────────
  L.push('  <families>');
  for (const [fId, f] of Object.entries(db.families)) {
    const handle = _entityHandle(fId, 'fa');
    const gid    = fId.replace(/^@|@$/g, '');
    L.push(`    <family handle="${_esc(handle)}" id="${_esc(gid)}">`);

    // Relationship type
    const rel = f.marr?.seen ? 'Married' : 'Unknown';
    L.push(`      <rel type="${rel}"/>`);

    if (f.husb) L.push(`      <father hlink="${_esc(_entityHandle(f.husb,'pe'))}"/>`);
    if (f.wife) L.push(`      <mother hlink="${_esc(_entityHandle(f.wife,'pe'))}"/>`);

    for (const ref of famEvRefs[fId]||[]) {
      L.push(`      <eventref hlink="${_esc(ref.handle)}" role="${_esc(ref.role)}"/>`);
    }

    for (const chId of f.children||[]) {
      const rel = f.childRelations?.[chId];
      let relAttrs = '';
      if (rel?.frel || rel?.mrel) {
        relAttrs = ` frel="${_esc(rel.frel||'Birth')}" mrel="${_esc(rel.mrel||'Birth')}"`;
      }
      L.push(`      <childref hlink="${_esc(_entityHandle(chId,'pe'))}"${relAttrs}/>`);
    }

    for (const a of f._grampsAttrs||[]) _attrXML('      ', a);

    for (const nh of famNoteRefs[fId]||[]) {
      L.push(`      <noteref hlink="${_esc(nh)}"/>`);
    }

    L.push('    </family>');
  }
  L.push('  </families>');

  // ── Citations (Original: vor sources, wie GRAMPS es ausgibt) ────────────────
  const citArr = Object.values(citRecs);
  if (citArr.length) {
    L.push('  <citations>');
    for (const cit of citArr) {
      L.push(`    <citation handle="${_esc(cit.handle)}" id="${_esc(cit.id)}">`);
      if (cit.page) L.push(`      <page>${_esc(cit.page)}</page>`);
      L.push(`      <confidence>${cit.confidence}</confidence>`);
      L.push(`      <sourceref hlink="${_esc(cit.sourceHandle)}"/>`);
      L.push('    </citation>');
    }
    L.push('  </citations>');
  }

  // ── Sources ───────────────────────────────────────────────────────────────
  L.push('  <sources>');
  for (const [sId, s] of Object.entries(db.sources)) {
    const handle = _entityHandle(sId, 'so');
    const gid    = sId.replace(/^@|@$/g, '');
    L.push(`    <source handle="${_esc(handle)}" id="${_esc(gid)}">`);
    if (s.title)  L.push(`      <stitle>${_esc(s.title)}</stitle>`);
    if (s.author) L.push(`      <sauthor>${_esc(s.author)}</sauthor>`);
    if (s.publ)   L.push(`      <spubinfo>${_esc(s.publ)}</spubinfo>`);
    if (s.abbr)   L.push(`      <sabbrev>${_esc(s.abbr)}</sabbrev>`);
    if (s.text) {
      const nh = _noteHandle(s.text, 'Source Note');
      L.push(`      <noteref hlink="${_esc(nh)}"/>`);
    }
    if (s.repo) {
      const repoH = _entityHandle(s.repo, 're');
      L.push(`      <reporef hlink="${_esc(repoH)}" medium="Book"/>`);
    }
    // Source media
    for (const m of s.media||[]) {
      const oh = _objHandle(m.file, m.titl, m.mime);
      if (oh) L.push(`      <objref hlink="${_esc(oh)}"/>`);
    }
    L.push('    </source>');
  }
  L.push('  </sources>');

  // ── Places ────────────────────────────────────────────────────────────────
  if (db.placeObjects && Object.keys(db.placeObjects).length) {
    // GRAMPS source: write full place objects with hierarchy + alternate names
    L.push('  <places>');
    for (const [pId, pl] of Object.entries(db.placeObjects)) {
      const handle = _entityHandle(pId, 'pl');
      const gid    = pId.replace(/^@|@$/g, '');
      L.push(`    <placeobj handle="${_esc(handle)}" id="${_esc(gid)}" type="${_esc(pl.type||'Unknown')}">`);
      if (pl.title) L.push(`      <ptitle>${_esc(pl.title)}</ptitle>`);
      for (const pn of pl.pnames || []) {
        let attrs = ` value="${_esc(pn.value)}"`;
        if (pn.lang) attrs += ` lang="${_esc(pn.lang)}"`;
        L.push(`      <pname${attrs}/>`);
      }
      if (pl.lat != null && pl.long != null) {
        const coord = _decToGrampsCoord(pl.lat, pl.long);
        if (coord) L.push(`      <coord lat="${_esc(coord.lat)}" long="${_esc(coord.long)}"/>`);
      }
      if (pl.parentId) {
        const parentH = _entityHandle(pl.parentId, 'pl');
        L.push(`      <placeref hlink="${_esc(parentH)}"/>`);
      }
      L.push('    </placeobj>');
    }
    L.push('  </places>');
  } else {
    // GEDCOM source or no placeObjects: flat places from collected event strings
    const plArr = Object.values(plRecs);
    if (plArr.length) {
      L.push('  <places>');
      for (const pl of plArr) {
        L.push(`    <placeobj handle="${_esc(pl.handle)}" id="${_esc(pl.id)}" type="Unknown">`);
        L.push(`      <ptitle>${_esc(pl.title)}</ptitle>`);
        const primaryName = pl.title.split(',')[0].trim();
        L.push(`      <pname value="${_esc(primaryName)}"/>`);
        if (pl.lat != null && pl.long != null) {
          const coord = _decToGrampsCoord(pl.lat, pl.long);
          if (coord) L.push(`      <coord lat="${_esc(coord.lat)}" long="${_esc(coord.long)}"/>`);
        }
        L.push('    </placeobj>');
      }
      L.push('  </places>');
    }
  }

  // ── Objects (media) ───────────────────────────────────────────────────────
  const objArr = Object.values(objRecs);
  if (objArr.length) {
    L.push('  <objects>');
    for (const obj of objArr) {
      L.push(`    <object handle="${_esc(obj.handle)}" id="${_esc(obj.id)}">`);
      L.push(`      <file src="${_esc(obj.src)}" mime="${_esc(obj.mime)}" description="${_esc(obj.desc)}"/>`);
      L.push('    </object>');
    }
    L.push('  </objects>');
  }

  // ── Repositories ──────────────────────────────────────────────────────────
  const repoEntries = Object.entries(db.repositories || {});
  if (repoEntries.length) {
    L.push('  <repositories>');
    for (const [rId, r] of repoEntries) {
      const handle = _entityHandle(rId, 're');
      const gid    = rId.replace(/^@|@$/g, '');
      L.push(`    <repository handle="${_esc(handle)}" id="${_esc(gid)}">`);
      L.push(`      <rname>${_esc(r.name)}</rname>`);
      L.push('      <type>Library</type>');
      if (r.addr) {
        L.push('      <address>');
        L.push(`        <street>${_esc(r.addr)}</street>`);
        L.push('      </address>');
      }
      if (r.www) L.push(`      <url href="${_esc(r.www)}" type="Web Home"/>`);
      L.push('    </repository>');
    }
    L.push('  </repositories>');
  }

  // ── Notes ─────────────────────────────────────────────────────────────────
  const noteArr = Object.values(noteRecs);
  if (noteArr.length) {
    L.push('  <notes>');
    for (const note of noteArr) {
      L.push(`    <note handle="${_esc(note.handle)}" id="${_esc(note.id)}" type="${_esc(note.type)}">`);
      L.push(`      <text>${_esc(note.text)}</text>`);
      L.push('    </note>');
    }
    L.push('  </notes>');
  }

  L.push('</database>');

  // ── Compress to gzip ──────────────────────────────────────────────────────
  const xmlText = L.join('\n');
  const encoded = new TextEncoder().encode(xmlText);

  const cs     = new CompressionStream('gzip');
  const writer = cs.writable.getWriter();
  writer.write(encoded);
  writer.close();

  const reader = cs.readable.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value); total += value.length;
  }
  const merged = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { merged.set(c, off); off += c.length; }

  return new Blob([merged], { type: 'application/octet-stream' });
}

// ─────────────────────────────────────
//  XML DEBUG — erste Person + Familie als Plain-XML in Console
//  Aufruf: await _grampsXMLDebug()
// ─────────────────────────────────────
async function _grampsXMLDebug() {
  const db = AppState.db;
  if (!db?._sourceFormat) { console.warn('Kein db geladen'); return; }
  // Write uncompressed XML (reuse writer, extract text before compression)
  const blob = await writeGRAMPS(db);
  const buf  = await blob.arrayBuffer();
  const ds   = new DecompressionStream('gzip');
  const w    = ds.writable.getWriter();
  w.write(new Uint8Array(buf)); w.close();
  const reader = ds.readable.getReader();
  const chunks = []; let total = 0;
  for (;;) { const {done,value} = await reader.read(); if (done) break; chunks.push(value); total+=value.length; }
  const merged = new Uint8Array(total); let off=0;
  for (const c of chunks) { merged.set(c,off); off+=c.length; }
  const xml = new TextDecoder().decode(merged);
  // Log XML header (first 300 chars)
  console.log('=== XML Header ===\n' + xml.slice(0, 300));
  // Log first person element
  const m = xml.match(/<person[\s\S]*?<\/person>/);
  if (m) console.log('\n=== Erste Person ===\n' + m[0]);
  else   console.log('Keine <person> gefunden');
  const allGenders = [...xml.matchAll(/<gender>([^<]*)<\/gender>/g)];
  const gCount = {male:0, female:0, unknown:0};
  allGenders.forEach(g => { const v = g[1].trim(); gCount[v] = (gCount[v]||0)+1; });
  console.log(`\n=== Gender-Statistik: male=${gCount.male} female=${gCount.female} unknown=${gCount.unknown} gesamt=${allGenders.length} ===`);
  const unknownPersons = [];
  const pMatches = [...xml.matchAll(/<person handle="([^"]*)" id="([^"]*)">([\s\S]*?)<\/person>/g)];
  for (const pm of pMatches.slice(0, 200)) {
    if (pm[3].includes('<gender>unknown</gender>')) unknownPersons.push(pm[2]);
  }
  if (unknownPersons.length) console.log('Erste unknown-Personen:', unknownPersons.slice(0,10).join(', '));
}

// ─────────────────────────────────────
//  MINIMAL TEST — 2-Personen .gramps zum Download (GRAMPS-Import-Diagnose)
//  Aufruf: await _grampsMinimalTest()
// ─────────────────────────────────────
async function _grampsMinimalTest() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE database PUBLIC "-//Gramps//DTD Gramps XML 1.7.2//EN"
"http://gramps-project.org/xml/1.7.2/grampsxml.dtd">
<database xmlns="http://gramps-project.org/xml/1.7.2/">
  <header>
    <created date="${new Date().toISOString().slice(0,10)}" version="6.0.6"/>
  </header>
  <events/>
  <people>
    <person handle="_testpe00000001" id="I0001">
      <name type="Birth Name"><first>Hans</first><surname>Müller</surname></name>
      <gender>M</gender>
    </person>
    <person handle="_testpe00000002" id="I0002">
      <gender>F</gender>
      <name type="Birth Name"><first>Maria</first><surname>Müller</surname></name>
    </person>
  </people>
  <families/>
  <sources/>
</database>`;
  const encoded = new TextEncoder().encode(xml);
  const cs = new CompressionStream('gzip');
  const w = cs.writable.getWriter(); w.write(encoded); w.close();
  const reader = cs.readable.getReader();
  const chunks = []; let total = 0;
  for (;;) { const {done,value} = await reader.read(); if (done) break; chunks.push(value); total+=value.length; }
  const merged = new Uint8Array(total); let off=0;
  for (const c of chunks) { merged.set(c,off); off+=c.length; }
  const blob = new Blob([merged], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='test_minimal.gramps';
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
  console.log('test_minimal.gramps: Hans Müller (male), Maria Müller (female)');
}

// ─────────────────────────────────────
//  DEEP ROUNDTRIP TEST (browser console)
//  Aufruf: await _grampsDeepTest()
//  Prüft: alle Personen/Familien/Quellen im Detail, Orte, Extra-Namen,
//         Attribute (_UID, _STAT), Medien, Handles, Zitierungen
// ─────────────────────────────────────
async function _grampsDeepTest() {
  const db1 = AppState.db;
  if (db1?._sourceFormat !== 'gramps') {
    console.warn('Kein GRAMPS db geladen'); return null;
  }

  console.log('=== GRAMPS Deep Test — schreibe …');
  const blob = await writeGRAMPS(db1);
  console.log(`Geschrieben: ${(blob.size/1024).toFixed(1)} KB`);
  const db2 = await parseGRAMPS(new File([blob], 'deep.gramps'));

  let pass = 0, fail = 0;
  const failures = [];

  const chk = (label, a, b) => {
    if ((a == null ? '' : String(a)) === (b == null ? '' : String(b))) { pass++; return true; }
    fail++; failures.push(`${label}: "${a ?? ''}" ≠ "${b ?? ''}"`); return false;
  };
  const chkN = (label, a, b) => {
    if (a === b) { pass++; return true; }
    fail++; failures.push(`${label}: ${a} ≠ ${b}`); return false;
  };

  // ── 1. Alle Personen ────────────────────────────────────────────────────────
  let pFail = 0;
  for (const [id, p1] of Object.entries(db1.individuals)) {
    const p2 = db2.individuals[id];
    if (!p2) { fail++; failures.push(`Person ${id} fehlt`); pFail++; continue; }
    const ok = [
      chk(`${id}.given`,        p1.given,           p2.given),
      chk(`${id}.surname`,      p1.surname,         p2.surname),
      chk(`${id}.nick`,         p1.nick,            p2.nick),
      chk(`${id}.prefix`,       p1.prefix,          p2.prefix),
      chk(`${id}.suffix`,       p1.suffix,          p2.suffix),
      chk(`${id}.sex`,          p1.sex,             p2.sex),
      chk(`${id}.birth.date`,   p1.birth?.date,     p2.birth?.date),
      chk(`${id}.birth.place`,  p1.birth?.place,    p2.birth?.place),
      chk(`${id}.chr.date`,     p1.chr?.date,       p2.chr?.date),
      chk(`${id}.death.date`,   p1.death?.date,     p2.death?.date),
      chk(`${id}.death.place`,  p1.death?.place,    p2.death?.place),
      chk(`${id}.buri.date`,    p1.buri?.date,      p2.buri?.date),
      chk(`${id}.buri.place`,   p1.buri?.place,     p2.buri?.place),
      chkN(`${id}.events.len`,   p1.events?.length||0,       p2.events?.length||0),
      chkN(`${id}.extraNames`,   p1.extraNames?.length||0,   p2.extraNames?.length||0),
      chkN(`${id}.media.len`,    p1.media?.length||0,        p2.media?.length||0),
      chkN(`${id}._grampsAttrs`, p1._grampsAttrs?.length||0, p2._grampsAttrs?.length||0),
    ];
    if (p1.uid)   chk(`${id}._UID`,  p1.uid,   p2.uid);
    if (p1._stat) chk(`${id}._STAT`, p1._stat, p2._stat);
    if (!ok.every(Boolean)) pFail++;
  }
  console.log(`  Personen: ${Object.keys(db1.individuals).length} geprüft, ${pFail} mit Delta`);

  // ── 2. Extra-Namen (alle Felder) ────────────────────────────────────────────
  for (const [id, p1] of Object.entries(db1.individuals)) {
    const p2 = db2.individuals[id];
    if (!p2) continue;
    (p1.extraNames || []).forEach((en, i) => {
      const en2 = p2.extraNames?.[i];
      chk(`${id}.extraNames[${i}].given`,   en.given,   en2?.given);
      chk(`${id}.extraNames[${i}].surname`, en.surname, en2?.surname);
      chk(`${id}.extraNames[${i}].type`,    en.type,    en2?.type);
    });
  }

  // ── 3. Familien ─────────────────────────────────────────────────────────────
  let fFail = 0;
  for (const [id, f1] of Object.entries(db1.families)) {
    const f2 = db2.families[id];
    if (!f2) { fail++; failures.push(`Familie ${id} fehlt`); fFail++; continue; }
    const ok = [
      chk(`${id}.husb`,         f1.husb,              f2.husb),
      chk(`${id}.wife`,         f1.wife,              f2.wife),
      chkN(`${id}.children`,    f1.children?.length||0, f2.children?.length||0),
      chk(`${id}.marr.date`,    f1.marr?.date,        f2.marr?.date),
      chk(`${id}.marr.place`,   f1.marr?.place,       f2.marr?.place),
      chk(`${id}.div.date`,     f1.div?.date,         f2.div?.date),
      chkN(`${id}._grampsAttrs`,f1._grampsAttrs?.length||0, f2._grampsAttrs?.length||0),
    ];
    // childref frel/mrel
    for (const chId of f1.children||[]) {
      const r1 = f1.childRelations?.[chId], r2 = f2.childRelations?.[chId];
      if (r1?.frel) chk(`${id}.childRel.${chId}.frel`, r1.frel, r2?.frel);
      if (r1?.mrel) chk(`${id}.childRel.${chId}.mrel`, r1.mrel, r2?.mrel);
    }
    if (!ok.every(Boolean)) fFail++;
  }
  console.log(`  Familien: ${Object.keys(db1.families).length} geprüft, ${fFail} mit Delta`);

  // ── 4. Quellen ──────────────────────────────────────────────────────────────
  let sFail = 0;
  for (const [id, s1] of Object.entries(db1.sources)) {
    const s2 = db2.sources[id];
    if (!s2) { fail++; failures.push(`Quelle ${id} fehlt`); sFail++; continue; }
    const ok = [
      chk(`${id}.title`,  s1.title,  s2.title),
      chk(`${id}.author`, s1.author, s2.author),
      chk(`${id}.publ`,   s1.publ,   s2.publ),
      chk(`${id}.abbr`,   s1.abbr,   s2.abbr),
      chkN(`${id}.media`, s1.media?.length||0, s2.media?.length||0),
    ];
    if (!ok.every(Boolean)) sFail++;
  }
  console.log(`  Quellen: ${Object.keys(db1.sources).length} geprüft, ${sFail} mit Delta`);

  // ── 5. placeObjects: Hierarchie, Typen, Alternate Names ────────────────────
  const po1 = db1.placeObjects || {}, po2 = db2.placeObjects || {};
  let poFail = 0;
  chkN('placeObjects.count', Object.keys(po1).length, Object.keys(po2).length);
  for (const [pId, pl1] of Object.entries(po1)) {
    const pl2 = po2[pId];
    if (!pl2) { fail++; failures.push(`Place ${pId} fehlt`); poFail++; continue; }
    const ok = [
      chk(`${pId}.title`,    pl1.title,    pl2.title),
      chk(`${pId}.type`,     pl1.type,     pl2.type),
      chk(`${pId}.parentId`, pl1.parentId, pl2.parentId),
      chkN(`${pId}.pnames`,  pl1.pnames?.length||0, pl2.pnames?.length||0),
    ];
    if (!ok.every(Boolean)) poFail++;
  }
  console.log(`  Orts-Objekte: ${Object.keys(po1).length} geprüft, ${poFail} mit Delta`);

  // ── 6. Orte: alle unique place-Strings ─────────────────────────────────────
  const collectPlaces = db => {
    const s = new Set();
    for (const p of Object.values(db.individuals)) {
      if (p.birth?.place)  s.add(p.birth.place);
      if (p.chr?.place)    s.add(p.chr.place);
      if (p.death?.place)  s.add(p.death.place);
      if (p.buri?.place)   s.add(p.buri.place);
      for (const ev of p.events||[]) if (ev.place) s.add(ev.place);
    }
    for (const f of Object.values(db.families)) {
      if (f.marr?.place) s.add(f.marr.place);
      for (const ev of f.events||[]) if (ev.place) s.add(ev.place);
    }
    s.delete(''); s.delete(undefined); s.delete(null);
    return s;
  };
  const pl1 = collectPlaces(db1), pl2 = collectPlaces(db2);
  let plFail = 0;
  for (const pl of pl1) {
    if (!pl2.has(pl)) { fail++; failures.push(`Ort fehlt: "${pl}"`); plFail++; } else pass++;
  }
  console.log(`  Orte: ${pl1.size} unique, ${plFail} fehlend`);

  // ── 6. Medien-Pfade ─────────────────────────────────────────────────────────
  let mFail = 0;
  for (const [id, p1] of Object.entries(db1.individuals)) {
    const p2 = db2.individuals[id];
    if (!p1.media?.length || !p2) continue;
    const f1 = p1.media.map(m => m.file).sort().join('|');
    const f2 = (p2.media||[]).map(m => m.file).sort().join('|');
    if (!chk(`${id}.media.files`, f1, f2)) mFail++;
  }
  console.log(`  Medien-Pfade: ${mFail} Personen mit Delta`);

  // ── 7. GRAMPS Handles (Stichprobe 20) ──────────────────────────────────────
  const h1 = db1._grampsHandles || {}, h2 = db2._grampsHandles || {};
  const h2inv = {};
  for (const [h, id] of Object.entries(h2)) h2inv[id] = h;
  let hFail = 0, hChecked = 0;
  for (const [handle, id] of Object.entries(h1)) {
    if (hChecked++ >= 20) break;
    if (!chk(`handle.${id}`, handle, h2inv[id])) hFail++;
  }
  console.log(`  Handles: ${hChecked} geprüft, ${hFail} mit Delta`);

  // ── Zusammenfassung ─────────────────────────────────────────────────────────
  console.log(`\nChecks gesamt: ${pass+fail}  ✓ ${pass}  ✗ ${fail}`);
  if (failures.length) {
    console.log(`\nFehler (max 30):`);
    failures.slice(0, 30).forEach(f => console.log(' ✗', f));
    if (failures.length > 30) console.log(`  … und ${failures.length-30} weitere`);
  }
  console.log(`\nErgebnis: ${fail===0 ? '✓ DEEP TEST OK' : `✗ ${fail} Fehler`}`);
  return { pass, fail, failures, db1, db2 };
}

// ─────────────────────────────────────
//  ROUNDTRIP TEST (browser console)
//  Aufruf: await _grampsRoundtripTest()
// ─────────────────────────────────────
async function _grampsRoundtripTest() {
  const db1 = AppState.db;
  if (db1?._sourceFormat !== 'gramps') {
    console.warn('Kein GRAMPS db geladen — lade zuerst eine .gramps Datei');
    return null;
  }

  console.log('=== GRAMPS Roundtrip Test ===');
  console.log(`DB1: ${Object.keys(db1.individuals).length} Personen, ` +
              `${Object.keys(db1.families).length} Familien, ` +
              `${Object.keys(db1.sources).length} Quellen`);

  // Write
  let blob;
  try {
    blob = await writeGRAMPS(db1);
    console.log(`Geschrieben: ${(blob.size/1024).toFixed(1)} KB gzip`);
  } catch(e) {
    console.error('writeGRAMPS fehlgeschlagen:', e);
    return null;
  }

  // Re-parse
  let db2;
  try {
    const file = new File([blob], 'roundtrip.gramps', { type: 'application/octet-stream' });
    db2 = await parseGRAMPS(file);
  } catch(e) {
    console.error('parseGRAMPS (re-read) fehlgeschlagen:', e);
    return null;
  }

  console.log(`DB2: ${Object.keys(db2.individuals).length} Personen, ` +
              `${Object.keys(db2.families).length} Familien, ` +
              `${Object.keys(db2.sources).length} Quellen`);

  // Compare
  const n1 = Object.keys(db1.individuals).length;
  const n2 = Object.keys(db2.individuals).length;
  const f1 = Object.keys(db1.families).length;
  const f2 = Object.keys(db2.families).length;
  const s1 = Object.keys(db1.sources).length;
  const s2 = Object.keys(db2.sources).length;

  const ok = (label, a, b) => {
    const pass = a === b;
    console.log(`  ${pass ? '✓' : '✗'} ${label}: ${a} → ${b}${pass ? '' : ' DELTA=' + (b-a)}`);
    return pass;
  };

  const results = [
    ok('Personen', n1, n2),
    ok('Familien', f1, f2),
    ok('Quellen',  s1, s2),
  ];

  // Spot-check: first person
  const pid1 = Object.keys(db1.individuals)[0];
  const p1   = db1.individuals[pid1];
  const p2   = db2.individuals[pid1];
  if (p2) {
    console.log('  Stichprobe Person 1:');
    const chk = (k, a, b) => {
      const pass = (a||'') === (b||'');
      console.log(`    ${pass ? '✓' : '✗'} ${k}: "${a||''}" → "${b||''}"`);
      return pass;
    };
    chk('given',   p1.given,      p2.given);
    chk('surname', p1.surname,    p2.surname);
    chk('sex',     p1.sex,        p2.sex);
    chk('birth.date', p1.birth?.date, p2.birth?.date);
    chk('famc[0]', p1.famc?.[0]?.famId, p2.famc?.[0]?.famId);
  } else {
    console.warn('  Person 1 nicht in DB2 gefunden');
  }

  const allOk = results.every(Boolean);
  console.log(`\nErgebnis: ${allOk ? '✓ ROUNDTRIP OK' : '✗ DELTA vorhanden'}`);
  return { db1, db2, blob };
}
