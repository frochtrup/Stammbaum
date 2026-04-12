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
    if (!evObj?.seen && !evObj?.date && !evObj?.place && !evObj?.placeId && !evObj?.addr && !(evObj?.sources?.length)) return null;
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
    // addr → <attribute type="Address" value="..."/>  (prepend, before _grampsAttrs)
    const addrAttr = evObj.addr ? [{ type: 'Address', value: evObj.addr }] : [];
    evRecs.push({ handle, id, type: grampsType, date: evObj.date||'', plHandle, desc: evObj.value||'', cause: evObj.cause||'', attrs: [...addrAttr, ...(evObj._grampsAttrs||[])], citHandles, noteHandle });
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
    // GEDCOM source or no placeObjects: hierarchical places from placForm + event strings
    const plArr = Object.values(plRecs);
    if (plArr.length) {
      // Map GEDCOM PLAC FORM level names → GRAMPS place types
      const _formNameToType = (name) => {
        const n = (name || '').toLowerCase().trim();
        if (/^(staat|country)/.test(n))                     return 'Country';
        if (/^(bundesland|state|province|provinz)/.test(n)) return 'State';
        if (/^(region|bezirk)/.test(n))                     return 'Region';
        if (/^(landkreis|kreis|county)/.test(n))            return 'County';
        if (/^(stadt|city|ort|town)/.test(n))               return 'City';
        if (/^(gemeinde|municipality|markt)/.test(n))       return 'Municipality';
        if (/^(dorf|village|weiler|hamlet)/.test(n))        return 'Village';
        if (/^(pfarrei|parish)/.test(n))                    return 'Parish';
        return 'Unknown';
      };
      const formLevels = (db.placForm || '').split(',').map(s => s.trim()).filter(Boolean);

      // Shared parent place objects: key="type:name" → {handle,id,type,title,_parentHandle}
      const sharedPlaces = {};
      let sharedCtr = 0;
      const _getSharedPlace = (name, type) => {
        const key = `${type}:${name}`;
        if (!sharedPlaces[key]) {
          sharedPlaces[key] = { handle: _h('pl'), id: `SP${String(sharedCtr++).padStart(4,'0')}`, type, title: name };
        }
        return sharedPlaces[key];
      };

      // Build hierarchy for each leaf place
      for (const plRec of plArr) {
        // Keep empty parts when count matches formLevels (direct positional alignment).
        // Example: "Bardel, Bad Bentheim, , , Niedersachsen, Deutschland" with 6 formLevels
        // → parts[0]=Bardel/Dorf, parts[1]=Bad Bentheim/Stadt, parts[4]=Niedersachsen/Bundesland …
        // Without filter: parts.length===formLevels.length → offset=0 → correct types.
        // With filter: 4 non-empty parts, offset=2 → Bardel misclassified as PLZ.
        const rawParts = plRec.title.split(',').map(s => s.trim());
        const useDirect = formLevels.length > 0 && rawParts.length === formLevels.length;
        const parts  = useDirect ? rawParts : rawParts.filter(Boolean);
        const offset = useDirect ? 0 : Math.max(0, formLevels.length - parts.length);
        // Leaf: first non-empty part
        const leafIdx = parts.findIndex(p => p);
        plRec.type  = _formNameToType(formLevels[offset + (leafIdx >= 0 ? leafIdx : 0)] || '');
        plRec.pname = (leafIdx >= 0 ? parts[leafIdx] : null) || plRec.title;
        // Build parent chain: skip empty parts
        let child = plRec;
        for (let i = (leafIdx >= 0 ? leafIdx : 0) + 1; i < parts.length; i++) {
          if (!parts[i]) continue;
          const parentType = _formNameToType(formLevels[offset + i] || '');
          const parentObj  = _getSharedPlace(parts[i], parentType);
          child._parentHandle = parentObj.handle;
          child = parentObj;
        }
      }

      L.push('  <places>');
      // Shared parent places first (so leaf placeref hrefs resolve)
      for (const sp of Object.values(sharedPlaces)) {
        L.push(`    <placeobj handle="${_esc(sp.handle)}" id="${_esc(sp.id)}" type="${_esc(sp.type)}">`);
        L.push(`      <ptitle>${_esc(sp.title)}</ptitle>`);
        L.push(`      <pname value="${_esc(sp.title)}"/>`);
        if (sp._parentHandle) L.push(`      <placeref hlink="${_esc(sp._parentHandle)}"/>`);
        L.push('    </placeobj>');
      }
      // Leaf places
      for (const pl of plArr) {
        L.push(`    <placeobj handle="${_esc(pl.handle)}" id="${_esc(pl.id)}" type="${_esc(pl.type || 'Unknown')}">`);
        L.push(`      <ptitle>${_esc(pl.title)}</ptitle>`);
        L.push(`      <pname value="${_esc(pl.pname || pl.title.split(',')[0].trim())}"/>`);
        if (pl.lat != null && pl.long != null) {
          const coord = _decToGrampsCoord(pl.lat, pl.long);
          if (coord) L.push(`      <coord lat="${_esc(coord.lat)}" long="${_esc(coord.long)}"/>`);
        }
        if (pl._parentHandle) L.push(`      <placeref hlink="${_esc(pl._parentHandle)}"/>`);
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

// Debug-Funktionen (_grampsXMLDebug, _grampsMinimalTest, _grampsDeepTest, _grampsRoundtripTest)
// → debug-gramps.js (nur bei ?debug=1 geladen)

