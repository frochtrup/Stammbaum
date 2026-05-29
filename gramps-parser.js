// ─────────────────────────────────────
//  GRAMPS XML PARSER  (Phase 2 — read-only import)
//  parseGRAMPS(file) → db  (same shape as parseGEDCOM)
//  Verarbeitet gzip-komprimierte .gramps-Dateien nativ im Browser.
// ─────────────────────────────────────

// GRAMPS event type string → GEDCOM tag + special key for structured events
const _GRAMPS_EV = {
  // Structured person events (→ p.birth / p.death / p.chr / p.buri)
  'Birth':             { tag:'BIRT', sp:'birth'  },
  'Death':             { tag:'DEAT', sp:'death'  },
  'Christening':       { tag:'CHR',  sp:'chr'    },
  'Baptism':           { tag:'CHR',  sp:'chr'    },
  'Burial':            { tag:'BURI', sp:'buri'   },
  'Cremation':         { tag:'BURI', sp:'buri'   },
  // Structured family events (→ f.marr / f.engag / f.div / f.divf)
  'Marriage':          { tag:'MARR', sp:'marr'   },
  'Engagement':        { tag:'ENGA', sp:'engag'  },
  'Divorce':           { tag:'DIV',  sp:'div'    },
  'Divorce Filing':    { tag:'DIVF', sp:'divf'   },
  'Annulment':         { tag:'ANUL', sp:null      },
  // Regular INDI events → p.events[]
  'Occupation':        { tag:'OCCU', sp:null      },
  'Residence':         { tag:'RESI', sp:null      },
  'Education':         { tag:'EDUC', sp:null      },
  'Religion':          { tag:'RELI', sp:null      },
  'Emigration':        { tag:'EMIG', sp:null      },
  'Immigration':       { tag:'IMMI', sp:null      },
  'Naturalization':    { tag:'NATU', sp:null      },
  'Graduation':        { tag:'GRAD', sp:null      },
  'Adoption':          { tag:'ADOP', sp:null      },
  'Military Service':  { tag:'MILI', sp:null      },
  'Property':          { tag:'PROP', sp:null      },
  'Will':              { tag:'WILL', sp:null      },
  'Probate':           { tag:'PROB', sp:null      },
  'Census':            { tag:'CENS', sp:null      },
  'Confirmation':      { tag:'CONF', sp:null      },
  'First Communion':   { tag:'FCOM', sp:null      },
  'Ordination':        { tag:'ORDN', sp:null      },
  'Retirement':        { tag:'RETI', sp:null      },
  // German custom types (häufig in deutschsprachigen GRAMPS-Datenbanken)
  'Beschäftigung':     { tag:'OCCU', sp:null      },
  'Militärdienst':     { tag:'MILI', sp:null      },
  'Adopted':           { tag:'ADOP', sp:null      },
  'Staatsbürgerschaft':{ tag:'NATU', sp:null      },
  'Aufgebot':          { tag:'ENGA', sp:'engag'   },
  // All other/unknown types fall through to EVEN via the default
};

// GRAMPS name type → GEDCOM NAME TYPE value
const _GRAMPS_NAME_TYPE = {
  'Birth Name':    'birth',
  'Also Known As': 'aka',
  'Married Name':  'married',
  'Nickname':      'nickname',
  'Immigrant':     'immigrant',
};

const _GED_MON = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

// ISO date string (YYYY-MM-DD, YYYY-MM, YYYY) → GEDCOM date part
function _isoToGed(iso) {
  if (!iso) return '';
  const p = iso.split('-');
  const y = p[0] || '';
  const m = p[1] ? parseInt(p[1], 10) : 0;
  const d = p[2] ? parseInt(p[2], 10) : 0;
  if (m >= 1 && m <= 12) {
    return d >= 1 ? `${d} ${_GED_MON[m-1]} ${y}` : `${_GED_MON[m-1]} ${y}`;
  }
  return y;
}

// Parse GRAMPS date element → GEDCOM date string
function _parseDateEl(el) {
  if (!el) return '';
  const tn = el.localName || el.tagName; // localName is namespace-safe
  if (tn === 'dateval') {
    const val  = el.getAttribute('val') || '';
    const type = el.getAttribute('type') || '';
    const g    = _isoToGed(val);
    const pre  = { before:'BEF', after:'AFT', about:'ABT', estimated:'EST', calculated:'CAL' };
    if (pre[type]) return g ? `${pre[type]} ${g}` : '';
    if (type === 'from') return g ? `FROM ${g}` : '';
    return g;
  }
  if (tn === 'datespan') {
    // span: FROM ... TO ... (both endpoints included)
    const s = _isoToGed(el.getAttribute('start') || '');
    const e = _isoToGed(el.getAttribute('stop')  || '');
    if (s && e) return `FROM ${s} TO ${e}`;
    return s || e;
  }
  if (tn === 'daterange') {
    // range: BET ... AND ... (unknown exact date within range)
    const s = _isoToGed(el.getAttribute('start') || '');
    const e = _isoToGed(el.getAttribute('stop')  || '');
    if (s && e) return `BET ${s} AND ${e}`;
    return s || e;
  }
  if (tn === 'datestr') return el.getAttribute('val') || '';
  return '';
}

// Find and parse the first date element among children
function _getDate(el) {
  if (!el) return '';
  for (const c of el.children) {
    const ln = c.localName || c.tagName;
    if (['dateval','datespan','daterange','datestr'].includes(ln)) return _parseDateEl(c);
  }
  return '';
}

// GRAMPS confidence (0–4) → GEDCOM QUAY (0–3)
function _confToQuay(conf) {
  return ([0, 0, 1, 2, 3])[Math.min(4, Math.max(0, +conf || 0))];
}

// Strip common OneDrive prefix from GRAMPS media src paths
// '../OneDrive/Privat/Ahnen/...' → 'Privat/Ahnen/...'
function _grampsMediaPath(src) {
  if (!src) return '';
  if (src.startsWith('../OneDrive/')) return src.slice('../OneDrive/'.length);
  if (src.startsWith('./OneDrive/'))  return src.slice('./OneDrive/'.length);
  return src;
}

// Empty event object matching GEDCOM parser shape (INDI events)
function _emptyEvI() {
  return {
    date:null, place:null, lati:null, long:null,
    citations:[], _extra:[], value:'', seen:false, note:''
  };
}
// Empty event for INDI death (has cause field)
function _emptyDeath() {
  return { ..._emptyEvI(), cause:'' };
}
// Empty event object for FAM structured events
function _emptyFamEv() {
  return {
    date:null, place:null, lati:null, long:null,
    citations:[], value:'', seen:false, note:'', noteRefs:[], _extra:[], media:[], addr:''
  };
}

// Apply a citation reference to a citations[]-carrying object
function _applyCit(target, citHandle, citMap, srcHandleToId) {
  const cit = citMap[citHandle];
  if (!cit || !cit.sourceHandle) return;
  const srcId = srcHandleToId[cit.sourceHandle];
  if (!srcId) return;
  const alreadyExists = cit._grampsHandle
    ? target.citations.some(c => c._grampsCitHandle === cit._grampsHandle)
    : target.citations.some(c => c.sid === srcId);
  if (!alreadyExists) {
    const obj = citationObj(srcId, cit.page || '', String(_confToQuay(cit.confidence)));
    obj._grampsCitHandle = cit._grampsHandle || null;
    obj._citExtra        = cit._extra        || [];
    target.citations.push(obj);
  }
}

// Get text of first child element with localName (direct children only, namespace-safe)
function _child(el, tag) {
  if (!el) return '';
  for (const c of el.children) {
    if ((c.localName || c.tagName) === tag) return c.textContent.trim();
  }
  return '';
}

// ─────────────────────────────────────
//  MAIN PARSER
// ─────────────────────────────────────
/**
 * Parst eine .gramps-Datei (gzip + XML) und gibt die Datenbankstruktur zurück.
 * @param {File} file
 * @returns {Promise<AppDb>}
 */
async function parseGRAMPS(file) {
  // 1. Read and decompress .gramps file (gzip)
  const buf = await file.arrayBuffer();
  let xmlText;
  try {
    const ds     = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    writer.write(new Uint8Array(buf));
    writer.close();
    const reader = ds.readable.getReader();
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
    xmlText = new TextDecoder().decode(merged);
  } catch(e) {
    // Possibly uncompressed (development files)
    xmlText = new TextDecoder().decode(new Uint8Array(buf));
  }

  return _grampsParseXMLText(xmlText);
}

// Parst GRAMPS-XML aus einem fertigen String (synchron, ohne gzip/File).
// Test-Seam: erlaubt headless Roundtrip-Tests ohne DecompressionStream (test-roundtrip.js).
function _grampsParseXMLText(xmlText) {
  // 2. Parse XML
  const domParser = new DOMParser();
  const doc       = domParser.parseFromString(xmlText, 'application/xml');
  const errEl     = doc.querySelector('parsererror');
  if (errEl) throw new Error('GRAMPS-XML: ' + errEl.textContent.slice(0, 200));

  // GRAMPS XML uses default namespace — detect from file (may be 1.7.1 or 1.7.2)
  const _NS = doc.documentElement.getAttribute('xmlns') || 'http://gramps-project.org/xml/1.7.2/';
  // Derive DTD version string from namespace URL (e.g. "1.7.2" or "1.7.1")
  const _grampsNS = _NS;
  const _grampsNSVersion = (_NS.match(/\/xml\/([^/]+)\/$/) || [])[1] || '1.7.2';
  // Get all elements with a given local name (works regardless of namespace binding)
  const _byTag = (root, tag) => {
    const byNS = root.getElementsByTagNameNS(_NS, tag);
    if (byNS.length > 0) return [...byNS];
    return [...root.getElementsByTagName(tag)];
  };

  // ─── Minimal XML serializer for _extra passthrough ───────────────────────
  const _xmlEl = el => {
    const tag   = el.localName;
    const attrs = [...el.attributes].map(a => ` ${a.name}="${a.value.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"`).join('');
    const kids  = [...el.childNodes];
    if (!kids.length) return `<${tag}${attrs}/>`;
    const inner = kids.map(c => c.nodeType === 3 ? c.textContent.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : _xmlEl(c)).join('');
    return `<${tag}${attrs}>${inner}</${tag}>`;
  };

  // ─── Build handle lookup maps ────────────────────────────────────────────
  // Note: _byTag returns ALL descendants with that localName, which is correct
  // for GRAMPS XML where same-tag nesting never occurs within a section.
  const _grampsHandles = {}; // grampsHandle → @ID@  (declared early — used in places + all sections)

  // Events: handle → {type, date, placeHandle, desc, cause, noteRefs[], citRefs[]}
  const evMap = {};
  for (const ev of _byTag(doc, 'event')) {
    const h    = ev.getAttribute('handle');
    if (!h) continue; // skip eventref elements (they have hlink, not handle)
    const type = _child(ev, 'type');
    const desc = _child(ev, 'description');
    const date = _getDate(ev);
    const plEl = _byTag(ev, 'place')[0] || null;
    const placeHandle = plEl ? plEl.getAttribute('hlink') : null;
    const causeAttr   = _byTag(ev, 'attribute').find(a => a.getAttribute('type') === 'Cause');
    const cause       = causeAttr ? (causeAttr.getAttribute('value') || '') : '';
    const addrAttrEl  = _byTag(ev, 'attribute').find(a => a.getAttribute('type') === 'Address');
    const evAddr      = addrAttrEl ? (addrAttrEl.getAttribute('value') || '') : '';
    const attrs       = _byTag(ev, 'attribute')
      .filter(a => a.getAttribute('type') !== 'Cause' && a.getAttribute('type') !== 'Address')
      .map(a => ({ type: a.getAttribute('type') || '', value: a.getAttribute('value') || '' }));
    const noteRefs    = _byTag(ev, 'noteref').map(n => n.getAttribute('hlink'));
    const citRefs     = _byTag(ev, 'citationref').map(c => c.getAttribute('hlink'));
    const priv        = ev.getAttribute('priv') || null;
    const evExtra     = [];
    for (const obj of _byTag(ev, 'objref')) evExtra.push(_xmlEl(obj));
    const changeEl = _byTag(ev, 'change')[0];
    if (changeEl) evExtra.push(_xmlEl(changeEl));
    evMap[h] = { type, date, placeHandle, desc, cause, addr: evAddr, attrs, noteRefs, citRefs, _priv: priv, _extra: evExtra, _grampsHandle: h };
  }

  // Citations: handle → {sourceHandle, confidence, page, _grampsHandle, _extra[]}
  const citMap = {};
  for (const cit of _byTag(doc, 'citation')) {
    const h    = cit.getAttribute('handle');
    if (!h) continue;
    const page = _child(cit, 'page');
    const conf = _child(cit, 'confidence');
    const sr   = _byTag(cit, 'sourceref')[0] || null;
    const citExtra = [];
    for (const nr  of _byTag(cit, 'noteref'))   citExtra.push(_xmlEl(nr));
    for (const obj of _byTag(cit, 'objref'))     citExtra.push(_xmlEl(obj));
    for (const a   of _byTag(cit, 'attribute'))  citExtra.push(_xmlEl(a));
    const citChange = _byTag(cit, 'change')[0];
    if (citChange) citExtra.push(_xmlEl(citChange));
    citMap[h] = { sourceHandle: sr ? sr.getAttribute('hlink') : null, confidence: +conf || 0, page, _grampsHandle: h, _extra: citExtra };
  }

  // Objects: handle → {src, mime, desc, priv, _extra[]}
  const objMap = {};
  for (const obj of _byTag(doc, 'object')) {
    const h   = obj.getAttribute('handle');
    if (!h) continue;
    const id   = obj.getAttribute('id') || '';
    const priv = obj.getAttribute('priv') || null;
    const fEl  = _byTag(obj, 'file')[0] || null;
    const objExtra = [];
    for (const ch of obj.children) {
      if ((ch.localName || ch.tagName) !== 'file') objExtra.push(_xmlEl(ch));
    }
    if (fEl) objMap[h] = {
      src:  fEl.getAttribute('src')         || '',
      mime: fEl.getAttribute('mime')        || '',
      desc: fEl.getAttribute('description') || '',
      id, priv, _extra: objExtra
    };
  }

  // Tags: handle → {name, color, priority}
  const tagMap = {};
  for (const tag of _byTag(doc, 'tag')) {
    const h = tag.getAttribute('handle');
    if (!h) continue;
    tagMap[h] = { name: tag.getAttribute('name') || '', color: tag.getAttribute('color') || '', priority: +(tag.getAttribute('priority') || 0) };
  }

  // Notes: handle → {text, type, grampId, _extra[]}
  const noteMap = {};
  for (const note of _byTag(doc, 'note')) {
    const h      = note.getAttribute('handle');
    if (!h) continue;
    const textEl = _byTag(note, 'text')[0] || null;
    const nExtra = [];
    for (const ch of note.children) {
      const ln = ch.localName || ch.tagName || '';
      if (ln !== 'text') nExtra.push(_xmlEl(ch));
    }
    noteMap[h] = {
      text: textEl ? textEl.textContent.trim() : '',
      type: note.getAttribute('type') || 'General',
      grampId: note.getAttribute('id') || '',
      _extra: nExtra,
    };
  }

  // Places: handle → {title, lat, long}  (for event resolution)
  const placeMap        = {};
  const placeHandleToId = {};
  const _placeObjsTemp  = {};  // id → place data (parentHandle resolved below)

  const _parseDeg = s => {
    if (!s) return null;
    const dir = s[0].toUpperCase();
    const val = parseFloat(s.slice(1));
    if (isNaN(val)) return null;
    return (dir === 'S' || dir === 'W') ? -val : val;
  };

  const _PLACE_MODELLED = new Set(['ptitle', 'pname', 'coord', 'placeref']);

  for (const pl of _byTag(doc, 'placeobj')) {
    const h   = pl.getAttribute('handle');
    if (!h) continue;
    const gid = pl.getAttribute('id') || '';
    const pId = '@' + gid + '@';
    placeHandleToId[h] = pId;
    _grampsHandles[h]  = pId;

    const ptitle = _child(pl, 'ptitle');
    const type   = pl.getAttribute('type') || 'Unknown';

    // All pname elements (primary + alternates, with optional lang)
    const pnames = [];
    for (const pn of _byTag(pl, 'pname')) {
      const val = pn.getAttribute('value') || '';
      if (val) pnames.push({ value: val, lang: pn.getAttribute('lang') || '' });
    }

    // Coordinates
    const coord = _byTag(pl, 'coord')[0] || null;
    let lat = null, long = null;
    if (coord) {
      lat  = _parseDeg(coord.getAttribute('lat')  || '');
      long = _parseDeg(coord.getAttribute('long') || '');
    }

    // Parent place ref (hierarchy)
    const placerefEl    = _byTag(pl, 'placeref')[0] || null;
    const _parentHandle = placerefEl ? placerefEl.getAttribute('hlink') : null;

    // Sub-elements not explicitly modelled → passthrough
    const plExtra = [];
    for (const ch of pl.children) {
      if (!_PLACE_MODELLED.has(ch.localName || ch.tagName || '')) plExtra.push(_xmlEl(ch));
    }

    const primaryTitle = ptitle || (pnames[0]?.value || '');
    placeMap[h] = { title: primaryTitle, lat, long };  // backward compat for event resolution

    _placeObjsTemp[pId] = {
      id: pId, _grampsHandle: h,
      title: primaryTitle, type, pnames, lat, long,
      _parentHandle, _extra: plExtra,
    };
  }

  // Resolve parent handles → IDs (second pass after all places are known)
  const placeObjects = {};
  for (const [pId, pl] of Object.entries(_placeObjsTemp)) {
    placeObjects[pId] = {
      id: pl.id, grampId: pl.id.replace(/^@|@$/g, ''), _grampsHandle: pl._grampsHandle,
      title: pl.title, type: pl.type, pnames: pl.pnames,
      lat: pl.lat, long: pl.long,
      parentId: pl._parentHandle ? (placeHandleToId[pl._parentHandle] || null) : null,
      _extra: pl._extra || [],
    };
  }

  // hofObjects aus placeObjects ableiten (type=Building/Farm → Hof-Ansicht)
  const _HOF_PLACE_TYPES = new Set(['Building', 'Farm', 'Neighborhood']);
  const hofObjects = {};
  for (const pl of Object.values(placeObjects)) {
    if (_HOF_PLACE_TYPES.has(pl.type) && pl.lat != null && pl.long != null) {
      hofObjects[pl.title] = { addr: pl.title, lat: pl.lat, long: pl.long };
    }
  }

  // ─── Build db ────────────────────────────────────────────────────────────
  const individuals = {}, families = {}, sources = {}, notes = {}, repositories = {};

  // ─── Repositories ────────────────────────────────────────────────────────
  const repoHandleToId = {};
  const _REPO_MODELLED = new Set(['rname', 'type', 'address', 'url']);
  for (const repo of _byTag(doc, 'repository')) {
    const h   = repo.getAttribute('handle');
    if (!h) continue;
    const priv = repo.getAttribute('priv') || null;
    const gid = repo.getAttribute('id') || '';
    const rId = '@' + gid + '@';
    repoHandleToId[h] = rId;
    _grampsHandles[h] = rId;
    const addrEl = _byTag(repo, 'address')[0] || null;
    let addr = '';
    if (addrEl) {
      addr = ['street','city','state','country']
        .map(t => _child(addrEl, t)).filter(Boolean).join(', ');
    }
    const urlEl = _byTag(repo, 'url')[0] || null;
    const repoExtra = [];
    for (const ch of repo.children) {
      if (!_REPO_MODELLED.has(ch.localName)) repoExtra.push(_xmlEl(ch));
    }
    repositories[rId] = {
      id: rId,
      name: _child(repo, 'rname'),
      rtype: _child(repo, 'type') || 'Library',
      addr, phon: '', www: urlEl ? (urlEl.getAttribute('href') || '') : '', email: '',
      lastChanged: '', lastChangedTime: '',
      grampId: gid, _grampsHandle: h, priv, _extra: repoExtra
    };
  }

  // ─── Sources ─────────────────────────────────────────────────────────────
  const srcHandleToId = {};
  const _SRC_MODELLED = new Set(['stitle', 'sauthor', 'sabbrev', 'spubinfo', 'noteref', 'objref', 'reporef']);
  for (const src of _byTag(doc, 'source')) {
    const h   = src.getAttribute('handle');
    if (!h) continue;
    const priv = src.getAttribute('priv') || null;
    const gid = src.getAttribute('id') || '';
    const sId = '@' + gid + '@';
    srcHandleToId[h] = sId;
    _grampsHandles[h] = sId;
    const repoRefEl = _byTag(src, 'reporef')[0] || null;
    const repoId    = repoRefEl ? (repoHandleToId[repoRefEl.getAttribute('hlink')] || null) : null;
    const noteTexts = _byTag(src, 'noteref')
      .map(n => noteMap[n.getAttribute('hlink')]?.text || '').filter(Boolean);
    const srcMedia = [];
    for (const objRef of _byTag(src, 'objref')) {
      const obj = objMap[objRef.getAttribute('hlink')];
      if (obj) srcMedia.push({
        file: _grampsMediaPath(obj.src),
        titl: obj.desc || '',
        mime: obj.mime || '',
        prim: srcMedia.length === 0,
        _grampsHandle: objRef.getAttribute('hlink')
      });
    }
    const srcExtra = [];
    for (const ch of src.children) {
      if (!_SRC_MODELLED.has(ch.localName)) srcExtra.push(_xmlEl(ch));
    }
    sources[sId] = {
      id: sId, _passthrough: [], dataExtra: [], media: srcMedia,
      title:  _child(src, 'stitle'),
      author: _child(src, 'sauthor'),
      abbr:   _child(src, 'sabbrev'),
      publ:   _child(src, 'spubinfo'),
      repo:   repoId, repoCallNum: '',
      text:   noteTexts.join('\n'),
      agnc: '', date: '', _date: '',
      grampId: gid, _grampsHandle: h,
      lastChanged: '', lastChangedTime: '',
      priv, _extra: srcExtra,
    };
  }

  // ─── Person handle → ID (first pass for cross-references) ─────────────────
  const personHandleToId = {};
  for (const person of _byTag(doc, 'person')) {
    const h   = person.getAttribute('handle');
    if (!h) continue;
    const gid = person.getAttribute('id') || '';
    const pId = '@' + gid + '@';
    personHandleToId[h] = pId;
    _grampsHandles[h]   = pId;
  }

  // ─── Family handle → ID (first pass) ──────────────────────────────────────
  const famHandleToId = {};
  for (const fam of _byTag(doc, 'family')) {
    const h   = fam.getAttribute('handle');
    if (!h) continue;
    const gid = fam.getAttribute('id') || '';
    const fId = '@' + gid + '@';
    famHandleToId[h]  = fId;
    _grampsHandles[h] = fId;
  }

  // ─── Helper: build a note record from a handle if it has text ─────────────
  function _noteId(nh) {
    const nId = nh;  // GRAMPS handle direkt als Key — verhindert Kollisionen bei nh.slice(-10)
    if (!notes[nId] && noteMap[nh] !== undefined) {
      notes[nId] = {
        id: nId, text: noteMap[nh]?.text || '', type: noteMap[nh]?.type || 'General',
        grampId: noteMap[nh]?.grampId || '',
        _extra: noteMap[nh]?._extra || [],
        _passthrough: [], lastChanged: '', lastChangedTime: '',
        _grampsHandle: nh,
      };
    }
    return nId;
  }

  // ─── Helper: find direct-child attribute by type ───────────────────────────
  function _attr(el, type) {
    return _byTag(el, 'attribute').find(a => a.getAttribute('type') === type) || null;
  }

  // ─── Persons (second pass: build full objects) ─────────────────────────────
  const _PERSON_MODELLED = new Set(['gender','name','eventref','objref','attribute','childof','parentin','noteref','citationref','personref','address','url']);
  for (const person of _byTag(doc, 'person')) {
    const h   = person.getAttribute('handle');
    if (!h) continue;
    const priv = person.getAttribute('priv') || null;
    const gid = person.getAttribute('id') || '';
    const pId = personHandleToId[h];

    // Gender
    const genderStr = (_child(person, 'gender') || '').toLowerCase();
    const sex = (genderStr === 'm' || genderStr === 'male')   ? 'M' :
                (genderStr === 'f' || genderStr === 'female') ? 'F' : 'U';

    // Primary name (first <name> without alt attribute)
    let given = '', surname = '', nick = '', prefix = '', suffix = '', _pCall = '';
    const nameCitations = [];
    const nameTarget = { citations: nameCitations };
    const nameEl = _byTag(person, 'name').find(n => !n.getAttribute('alt')) || null;
    if (nameEl) {
      given   = _child(nameEl, 'first');
      surname = _child(nameEl, 'surname');
      _pCall  = _child(nameEl, 'call') || '';         // Rufname — eigenes Feld
      nick    = _child(nameEl, 'nick') || _pCall;     // Spitzname, Fallback auf Rufname
      suffix  = _child(nameEl, 'suffix');
      const titleEl = _byTag(nameEl, 'title')[0] || null;
      if (titleEl) prefix = titleEl.textContent.trim();
      for (const cr of _byTag(nameEl, 'citationref'))
        _applyCit(nameTarget, cr.getAttribute('hlink'), citMap, srcHandleToId);
    }
    const nameRaw = given + (surname ? ' /' + surname + '/' : '');

    // Alternative names
    const extraNames = [];
    for (const altEl of _byTag(person, 'name').filter(n => n.getAttribute('alt'))) {
      const aGiven   = _child(altEl, 'first');
      const aSurname = _child(altEl, 'surname');
      const aType    = _GRAMPS_NAME_TYPE[altEl.getAttribute('type') || ''] || '';
      const enTarget = { citations: [] };
      for (const cr of _byTag(altEl, 'citationref'))
        _applyCit(enTarget, cr.getAttribute('hlink'), citMap, srcHandleToId);
      extraNames.push({
        name: aGiven + (aSurname ? ' /' + aSurname + '/' : ''),
        given: aGiven, surname: aSurname, nick: '', prefix: '',
        type: aType, citations: enTarget.citations, _passthrough: []
      });
    }

    // Build person object
    const pExtra = [];
    const pTags  = [];
    for (const ch of person.children) {
      const ln = ch.localName || ch.tagName;
      if (!_PERSON_MODELLED.has(ln)) pExtra.push(_xmlEl(ch));
      if (ln === 'tagref') { const t = tagMap[ch.getAttribute('hlink')]; if (t) pTags.push({ name: t.name, color: t.color }); }
    }
    const p = {
      id: pId, _passthrough: [], _nameParsed: true,
      name: nameRaw, nameRaw, surname, given, nick, prefix, suffix, _grampsCall: _pCall,
      sex,
      uid: '',
      topSources: [], topSourcePages: {}, topSourceQUAY: {}, topSourceExtra: {},
      nameCitations,
      birth: _emptyEvI(),
      death: _emptyDeath(),
      chr:   _emptyEvI(),
      buri:  _emptyEvI(),
      events: [],
      famc: [], fams: [],
      noteRefs: [], noteTexts: [], noteText: '',
      extraNames,
      associations: [],
      media: [], titl: '', reli: '', resn: '', email: '', www: '',
      _stat: null, grampId: gid, _grampsHandle: h,
      lastChanged: '', lastChangedTime: '',
      sourceRefs: new Set(),
      priv, _extra: pExtra, _grampsTags: pTags,
      // GED7-Felder: werden ggf. bei Attribut-/URL-Parsing befüllt
      noEvents: new Set(), exids: [], aliaNames: [], nameTrans: [], createdDate: '',
      refns: [], aliases: [],
    };

    // Attributes
    const _HANDLED_P_ATTRS = new Set(['_UID','_STAT','RESN','E-MAIL','_TASK','_RLOG']);
    const uidA   = _attr(person, '_UID');   if (uidA)  p.uid   = uidA.getAttribute('value')  || '';
    const statA  = _attr(person, '_STAT');  if (statA) p._stat = statA.getAttribute('value') || null;
    const resnA  = _attr(person, 'RESN');   if (resnA) p.resn  = resnA.getAttribute('value') || '';
    const emailA = _attr(person, 'E-MAIL'); if (emailA)p.email = emailA.getAttribute('value')|| '';
    p._tasks = _byTag(person, 'attribute')
      .filter(a => a.getAttribute('type') === '_TASK')
      .map(a => { try { return JSON.parse(a.getAttribute('value') || '{}'); } catch(e) { return null; } })
      .filter(t => t && t.text);
    p._rlog = _byTag(person, 'attribute')
      .filter(a => a.getAttribute('type') === '_RLOG')
      .map(a => { try { return JSON.parse(a.getAttribute('value') || '{}'); } catch(e) { return null; } })
      .filter(r => r && (r.query || r.note));
    p._grampsAttrs = _byTag(person, 'attribute')
      .filter(a => {
        const t = a.getAttribute('type') || '';
        // GED7 noEvents: attribute type="No BIRT" value="Y" → p.noEvents
        if (t.startsWith('No ') && (a.getAttribute('value') || '').toUpperCase() === 'Y') {
          const evTag = t.slice(3).trim();
          if (evTag) p.noEvents.add(evTag);
          return false; // aus _grampsAttrs herausnehmen
        }
        return !_HANDLED_P_ATTRS.has(t);
      })
      .map(a => {
        const atgt = { citations: [] };
        for (const cr of _byTag(a, 'citationref'))
          _applyCit(atgt, cr.getAttribute('hlink'), citMap, srcHandleToId);
        const aNote = _byTag(a, 'noteref')
          .map(nr => noteMap[nr.getAttribute('hlink')]?.text || '').filter(Boolean).join('\n');
        const obj = { type: a.getAttribute('type') || '', value: a.getAttribute('value') || '', citations: atgt.citations };
        if (aNote) obj.note = aNote;
        return obj;
      });

    // GED7 EXID: <url> Elemente (vom GRAMPS-Writer für exids[] geschrieben) → p.exids[]
    for (const urlEl of _byTag(person, 'url')) {
      const href = urlEl.getAttribute('href') || '';
      const type = urlEl.getAttribute('type') || '';
      if (href) p.exids.push({ value: href, type });
    }

    // Event refs
    for (const evRef of _byTag(person, 'eventref')) {
      const evH  = evRef.getAttribute('hlink');
      const role = evRef.getAttribute('role') || 'Primary';
      if (role !== 'Primary') {
        // Witness / non-primary: store for roundtrip (not mapped to GEDCOM events)
        const ev = evMap[evH];
        if (ev) {
          const pl      = ev.placeHandle ? placeMap[ev.placeHandle] : null;
          const plTitle = pl?.title || null;
          const plId    = ev.placeHandle ? (placeHandleToId[ev.placeHandle] || null) : null;
          const evNote  = ev.noteRefs.map(nh => noteMap[nh]?.text || '').filter(Boolean).join('\n');
          const wtgt = { citations: [] };
          for (const ch of ev.citRefs) _applyCit(wtgt, ch, citMap, srcHandleToId);
          if (!p._grampsWitnessRefs) p._grampsWitnessRefs = [];
          p._grampsWitnessRefs.push({
            _origHlink: evH, role,
            type: ev.type, date: ev.date || null,
            place: plTitle, placeId: plId,
            lati: pl?.lat ?? null, long: pl?.long ?? null,
            cause: ev.cause || '',
            note: evNote, desc: ev.desc || '',
            citations: wtgt.citations,
            _grampsEvExtra: ev._extra || [],
            _grampsEvPriv:  ev._priv  || null,
          });
        }
        continue;
      }
      const ev = evMap[evH];
      if (!ev) continue;

      const mapped  = _GRAMPS_EV[ev.type] || { tag:'EVEN', sp:null };
      const evNote  = ev.noteRefs.map(nh => noteMap[nh]?.text || '').filter(Boolean).join('\n');
      const pl      = ev.placeHandle ? placeMap[ev.placeHandle] : null;
      const plTitle = pl ? (pl.title || null) : null;
      const plId    = ev.placeHandle ? (placeHandleToId[ev.placeHandle] || null) : null;
      const lat     = pl && pl.lat  != null ? String(pl.lat)  : null;
      const lng     = pl && pl.long != null ? String(pl.long) : null;

      const sp = mapped.sp;
      if (sp === 'birth' || sp === 'chr' || sp === 'buri' || sp === 'death') {
        const tgt = p[sp === 'birth' ? 'birth' : sp === 'death' ? 'death' : sp === 'chr' ? 'chr' : 'buri'];
        if (!tgt.seen) {
          tgt.seen         = true;
          tgt.date         = ev.date  || null;
          tgt.place        = plTitle;
          tgt.placeId      = plId;
          tgt.lati         = lat;
          tgt.long         = lng;
          tgt.note          = evNote;
          tgt._grampsAttrs  = ev.attrs || [];
          tgt._grampsEvHlink = evH;
          tgt._grampsEvExtra = ev._extra || [];
          tgt._grampsEvPriv  = ev._priv  || null;
          if (sp === 'death' && ev.cause) tgt.cause = ev.cause;
          for (const ch of ev.citRefs) _applyCit(tgt, ch, citMap, srcHandleToId);
        }
      } else {
        // Regular or unknown → events array
        const evValue = mapped.tag === 'EVEN'
          ? (ev.type + (ev.desc ? ': ' + ev.desc : ''))
          : (ev.desc || '');
        const evObj = {
          type:  mapped.tag,
          date:  ev.date  || null,
          place: plTitle, placeId: plId,
          lati:  lat, long: lng,
          value: evValue,
          note:  evNote,
          addr:  ev.addr  || '',
          phon: [], email: [],
          noteRefs: [],
          citations: [], _extra: [],
          _grampsAttrs:   ev.attrs  || [],
          _grampsEvHlink: evH,
          _grampsEvExtra: ev._extra || [],
          _grampsEvPriv:  ev._priv  || null,
        };
        for (const ch of ev.citRefs) _applyCit(evObj, ch, citMap, srcHandleToId);
        p.events.push(evObj);
      }
    }

    // Person <address> elements → RESI events
    for (const addrEl of _byTag(person, 'address')) {
      const street   = _child(addrEl, 'street');
      const locality = _child(addrEl, 'locality');
      const city     = _child(addrEl, 'city');
      const county   = _child(addrEl, 'county');
      const state    = _child(addrEl, 'state');
      const country  = _child(addrEl, 'country');
      const postal   = _child(addrEl, 'postal');
      const phone    = _child(addrEl, 'phone');
      const parts    = [street, locality, city, county, state, postal, country].filter(Boolean);
      if (!parts.length && !phone) continue;
      const addr = parts.join(', ');
      // Date on <address> element (dateval, daterange, datespan, datestr)
      let addrDate = null;
      for (const ch of Array.from(addrEl.children || [])) {
        const ln = ch.localName || ch.tagName || '';
        if (ln.startsWith('date')) { addrDate = _parseDateEl(ch); break; }
      }
      p.events.push({
        type: 'RESI', date: addrDate, place: null, placeId: null,
        lati: null, long: null,
        value: '', addr,
        phon: phone ? [phone] : [], email: [],
        note: '', noteRefs: [],
        citations: [], _extra: [],
        _grampsAttrs: []
      });
    }

    // Media (objref)
    for (const objRef of _byTag(person, 'objref')) {
      const obj = objMap[objRef.getAttribute('hlink')];
      if (!obj) continue;
      p.media.push({
        file: _grampsMediaPath(obj.src),
        titl: obj.desc || '',
        prim: p.media.length === 0,
        mime: obj.mime || '',
        _grampsHandle: objRef.getAttribute('hlink')
      });
    }

    // Top-level citation refs (direct children of person, not nested in name/attribute)
    const topTarget = { citations: [] };
    for (const ch of person.children) {
      if ((ch.localName || ch.tagName) === 'citationref')
        _applyCit(topTarget, ch.getAttribute('hlink'), citMap, srcHandleToId);
    }
    for (const c of topTarget.citations) {
      if (!p.topSources.includes(c.sid)) {
        p.topSources.push(c.sid);
        if (c.page) p.topSourcePages[c.sid] = c.page;
        if (c.quay != null) p.topSourceQUAY[c.sid] = +c.quay;
      }
    }

    // Notes
    for (const nr of _byTag(person, 'noteref')) {
      const nh  = nr.getAttribute('hlink');
      const txt = noteMap[nh]?.text || '';
      if (txt) p.noteTexts.push(txt);
      p.noteRefs.push(_noteId(nh));
    }
    p.noteText = p.noteTexts.join('\n\n');

    // Person associations (<personref> = GRAMPS native person-to-person link, maps to GEDCOM ASSO)
    for (const pref of _byTag(person, 'personref')) {
      const aHlink = pref.getAttribute('hlink') || '';
      const aRel   = pref.getAttribute('rel')   || '';
      const aXref  = personHandleToId[aHlink] || null;
      const atgt = { citations: [] };
      for (const cr of _byTag(pref, 'citationref'))
        _applyCit(atgt, cr.getAttribute('hlink'), citMap, srcHandleToId);
      const aNote = _byTag(pref, 'noteref')
        .map(nr => noteMap[nr.getAttribute('hlink')]?.text || '').filter(Boolean).join('\n');
      p.associations.push({ xref: aXref, _grampsHlink: aHlink, role: aRel, note: aNote, citations: atgt.citations });
    }

    // Family links (resolved in families pass)
    p._childofH  = _byTag(person, 'childof').map(e => e.getAttribute('hlink'));
    p._parentinH = _byTag(person, 'parentin').map(e => e.getAttribute('hlink'));

    individuals[pId] = p;
  }

  // ─── Families ─────────────────────────────────────────────────────────────
  const _FAMILY_MODELLED = new Set(['rel','father','mother','eventref','childref','attribute','noteref','citationref']);
  for (const fam of _byTag(doc, 'family')) {
    const h   = fam.getAttribute('handle');
    if (!h) continue;
    const priv = fam.getAttribute('priv') || null;
    const gid = fam.getAttribute('id') || '';
    const fId = famHandleToId[h];

    const fatherEl = _byTag(fam, 'father')[0] || null;
    const motherEl = _byTag(fam, 'mother')[0] || null;
    const husb = fatherEl ? (personHandleToId[fatherEl.getAttribute('hlink')] || null) : null;
    const wife = motherEl ? (personHandleToId[motherEl.getAttribute('hlink')] || null) : null;

    const children = [];
    const childRels = {};  // childId → {frel, mrel}
    for (const cr of _byTag(fam, 'childref')) {
      const ch = personHandleToId[cr.getAttribute('hlink')];
      if (!ch) continue;
      children.push(ch);
      const frel = cr.getAttribute('frel') || '';
      const mrel = cr.getAttribute('mrel') || '';
      if (frel || mrel) childRels[ch] = { frel, mrel };
    }

    const fExtra = [];
    const fTags  = [];
    for (const ch of fam.children) {
      const ln = ch.localName || ch.tagName;
      if (!_FAMILY_MODELLED.has(ln)) fExtra.push(_xmlEl(ch));
      if (ln === 'tagref') { const t = tagMap[ch.getAttribute('hlink')]; if (t) fTags.push({ name: t.name, color: t.color }); }
    }
    const f = {
      id: fId, _passthrough: [],
      husb, wife, children, childRelations: childRels, _lastChil: null,
      marr: _emptyFamEv(), engag: _emptyFamEv(), div: _emptyFamEv(), divf: _emptyFamEv(),
      events: [],
      _stat: null, grampId: gid, _grampsHandle: h,
      noteRefs: [], noteTexts: [], noteText: '',
      sourceRefs: new Set(),
      media: [],
      lastChanged: '', lastChangedTime: '',
      priv, _extra: fExtra, _grampsTags: fTags,
    };

    // Family event refs
    for (const evRef of _byTag(fam, 'eventref')) {
      const evH = evRef.getAttribute('hlink');
      const ev  = evMap[evH];
      if (!ev) continue;
      const mapped  = _GRAMPS_EV[ev.type] || { tag:'EVEN', sp:null };
      const evNote  = ev.noteRefs.map(nh => noteMap[nh]?.text || '').filter(Boolean).join('\n');
      const pl      = ev.placeHandle ? placeMap[ev.placeHandle] : null;
      const plTitle = pl ? (pl.title || null) : null;
      const plId    = ev.placeHandle ? (placeHandleToId[ev.placeHandle] || null) : null;
      const lat     = pl && pl.lat  != null ? String(pl.lat)  : null;
      const lng     = pl && pl.long != null ? String(pl.long) : null;

      const sp  = mapped.sp;
      const tgt = sp === 'marr'  ? f.marr  : sp === 'engag' ? f.engag
                : sp === 'div'   ? f.div   : sp === 'divf'  ? f.divf : null;
      if (tgt && !tgt.seen) {
        tgt.seen         = true;
        tgt.date         = ev.date  || null;
        tgt.place        = plTitle;
        tgt.placeId      = plId;
        tgt.lati         = lat;
        tgt.long         = lng;
        tgt.note           = evNote;
        tgt._grampsAttrs   = ev.attrs  || [];
        tgt._grampsEvHlink = evH;
        tgt._grampsEvExtra = ev._extra || [];
        tgt._grampsEvPriv  = ev._priv  || null;
        for (const ch of ev.citRefs) _applyCit(tgt, ch, citMap, srcHandleToId);
      } else if (!tgt) {
        const evObj = {
          type: mapped.tag, date: ev.date || null, place: plTitle, placeId: plId,
          lati: lat, long: lng,
          value: mapped.tag === 'EVEN' ? ev.type : (ev.desc || ''),
          note: evNote, addr: ev.addr || '', noteRefs: [],
          citations: [], _extra: [],
          _grampsAttrs:   ev.attrs  || [],
          _grampsEvHlink: evH,
          _grampsEvExtra: ev._extra || [],
          _grampsEvPriv:  ev._priv  || null,
        };
        for (const ch of ev.citRefs) _applyCit(evObj, ch, citMap, srcHandleToId);
        f.events.push(evObj);
      }
    }

    // rel type without explicit event → mark marr.seen if Married
    const relEl = _byTag(fam, 'rel')[0] || null;
    if (relEl && !f.marr.seen) {
      if ((relEl.getAttribute('type') || '') === 'Married') f.marr.seen = true;
    }

    // Notes
    for (const nr of _byTag(fam, 'noteref')) {
      const nh  = nr.getAttribute('hlink');
      const txt = noteMap[nh]?.text || '';
      if (txt) f.noteTexts.push(txt);
      f.noteRefs.push(_noteId(nh));
    }
    f.noteText = f.noteTexts.join('\n\n');

    // Extra attributes (all <attribute> on family, with optional citations/notes)
    const _HANDLED_F_ATTRS = new Set(['_TASK', '_RLOG']);
    f._tasks = _byTag(fam, 'attribute')
      .filter(a => a.getAttribute('type') === '_TASK')
      .map(a => { try { return JSON.parse(a.getAttribute('value') || '{}'); } catch(e) { return null; } })
      .filter(t => t && t.text);
    f._rlog = _byTag(fam, 'attribute')
      .filter(a => a.getAttribute('type') === '_RLOG')
      .map(a => { try { return JSON.parse(a.getAttribute('value') || '{}'); } catch(e) { return null; } })
      .filter(r => r && (r.query || r.note));
    f._grampsAttrs = _byTag(fam, 'attribute')
      .filter(a => !_HANDLED_F_ATTRS.has(a.getAttribute('type') || ''))
      .map(a => {
        const atgt = { citations: [] };
        for (const cr of _byTag(a, 'citationref'))
          _applyCit(atgt, cr.getAttribute('hlink'), citMap, srcHandleToId);
        const aNote = _byTag(a, 'noteref')
          .map(nr => noteMap[nr.getAttribute('hlink')]?.text || '').filter(Boolean).join('\n');
        const obj = { type: a.getAttribute('type') || '', value: a.getAttribute('value') || '', citations: atgt.citations };
        if (aNote) obj.note = aNote;
        return obj;
      });

    families[fId] = f;
  }

  // ─── Resolve person ↔ family links ────────────────────────────────────────
  for (const p of Object.values(individuals)) {
    for (const fh of p._childofH || []) {
      const fId = famHandleToId[fh];
      if (fId) p.famc.push({ famId: fId, pedi: '', frel: '', mrel: '', frelSeen: false, mrelSeen: false, frelSour: '', frelPage: '', frelQUAY: '', frelSourExtra: [], mrelSour: '', mrelPage: '', mrelQUAY: '', mrelSourExtra: [], citations: [] });
    }
    for (const fh of p._parentinH || []) {
      const fId = famHandleToId[fh];
      if (fId && !p.fams.includes(fId)) p.fams.push(fId);
    }
    delete p._childofH;
    delete p._parentinH;
  }

  // ─── Rebuild source ref sets ───────────────────────────────────────────────
  for (const p of Object.values(individuals)) _rebuildPersonSourceRefs(p);
  for (const f of Object.values(families))    _rebuildFamilySourceRefs(f);

  // ─── idCounter ────────────────────────────────────────────────────────────
  let maxId = 1000;
  for (const id of [
    ...Object.keys(individuals), ...Object.keys(families),
    ...Object.keys(sources), ...Object.keys(repositories), ...Object.keys(notes)
  ]) {
    const m = id.match(/\d+/);
    if (m) maxId = Math.max(maxId, +m[0]);
  }

  // GRAMPS app version from <created version="...">
  const _createdEl = _byTag(doc, 'created')[0];
  const _grampsVersion = _createdEl ? (_createdEl.getAttribute('version') || '5.2.0') : '5.2.0';

  return {
    individuals, families, sources, notes, repositories,
    placeObjects, hofObjects,
    extraPlaces: {}, placForm: '',
    extraRecords: [], headLines: [],
    _sourceFormat: 'gramps',
    _grampsMaster: true,
    tags: Object.fromEntries(Object.entries(tagMap).map(([h, t]) => [h, { name: t.name, color: t.color, priority: t.priority }])),
    _grampsHandles,
    _grampsObjMeta: Object.fromEntries(
      Object.entries(objMap).map(([h, o]) => [h, { src: o.src, mime: o.mime, desc: o.desc, id: o.id, priv: o.priv || null, _extra: o._extra || [] }])
    ),
    _grampsNS, _grampsNSVersion, _grampsVersion,
    _idCounterMax: maxId
  };
}
