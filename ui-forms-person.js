// ─────────────────────────────────────
//  FORMS: PERSON
// ─────────────────────────────────────
function showAddSheet() { openModal('modalAdd'); }
function showEditSheet() {
  if (AppState.currentPersonId) showPersonForm(AppState.currentPersonId);
  else if (AppState.currentFamilyId) showFamilyForm(AppState.currentFamilyId);
  else if (AppState.currentSourceId) showSourceForm(AppState.currentSourceId);
  else if (AppState.currentRepoId) showRepoForm(AppState.currentRepoId);
  else if (AppState.currentPlaceName) showPlaceForm(AppState.currentPlaceName);
}

// _pfExtraNames lebt in UIState._formState.pfExtraNames (shimmiert als _pfExtraNames)

// ─── Datum-Normalisierung für Quick-Entry ───────────────────────────────────
function _normQuickDate(s) {
  if (!s) return '';
  const raw = s.trim();
  if (!raw) return '';
  const qualMap = [
    ['ca. ','ABT'],['ca ','ABT'],['etwa ','ABT'],['um ','ABT'],['abt ','ABT'],
    ['vor ','BEF'],['bef ','BEF'],['nach ','AFT'],['aft ','AFT'],
    ['cal ','CAL'],['est ','EST'],['geschätzt ','EST'],
  ];
  let qual = '';
  let rest = raw;
  const lower = raw.toLowerCase();
  for (const [prefix, code] of qualMap) {
    if (lower.startsWith(prefix)) { qual = code; rest = raw.slice(prefix.length).trim(); break; }
  }
  const part = _pfParseDatePart(rest);
  if (!part) return raw;
  return qual ? `${qual} ${part}` : part;
}

function _pfParseDatePart(s) {
  if (!s) return '';
  const u = s.trim();
  // d.m.y oder d/m/y  (3.5.1900, 3/5/1900)
  const dotSlash = u.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/);
  if (dotSlash) {
    const d = parseInt(dotSlash[1], 10), m = normMonth(dotSlash[2]), y = _pfNormYear(dotSlash[3]);
    if (m && y) return `${d} ${m} ${y}`;
    if (y) return y;
  }
  // "3 Mai 1900" oder "Mai 1900"
  const textM = u.match(/^(?:(\d{1,2})\s+)?([A-Za-zäöüÄÖÜ]+)\s+(\d{2,4})$/);
  if (textM) {
    const d = textM[1] ? parseInt(textM[1], 10) : null;
    const m = normMonth(textM[2]), y = _pfNormYear(textM[3]);
    if (m && y) return d ? `${d} ${m} ${y}` : `${m} ${y}`;
  }
  // schon GEDCOM: "3 JAN 1900", "JAN 1900"
  const g3 = u.match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})$/i);
  if (g3) return `${parseInt(g3[1],10)} ${g3[2].toUpperCase()} ${g3[3]}`;
  const g2 = u.match(/^([A-Z]{3})\s+(\d{4})$/i);
  if (g2) return `${g2[1].toUpperCase()} ${g2[2]}`;
  // nur Jahr
  if (/^\d{1,4}$/.test(u)) return _pfNormYear(u);
  return '';
}

function _pfNormYear(s) {
  const n = parseInt(s, 10);
  if (isNaN(n)) return '';
  if (s.length === 2) return String(n < 30 ? 2000 + n : 1900 + n);
  return String(n);
}

const _PF_PILLS = [
  { field: 'taufe',         label: 'Taufe' },
  { field: 'beerdigung',   label: 'Beerdigung' },
  { field: 'beruf',         label: 'Beruf' },
  { field: 'wohnort',       label: 'Wohnort' },
  { field: 'note',          label: 'Notiz' },
  { field: 'prefix-suffix', label: 'Präfix / Zusatz' },
  { field: 'rufname-nick',  label: 'Rufname / Spitzname' },
  { field: 'titl',          label: 'Titel' },
  { field: 'extranames',    label: 'Weiterer Name' },
  { field: 'resn',          label: 'Beschränkung' },
  { field: 'email',         label: 'E-Mail' },
  { field: 'www',           label: 'Website' },
];
let _pfActivePills = new Set();

function _renderPills() {
  const container = document.getElementById('pf-field-pills');
  if (!container) return;
  container.innerHTML = '';
  _PF_PILLS.forEach(({ field, label }) => {
    if (_pfActivePills.has(field)) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'field-pill';
    btn.textContent = '+ ' + label;
    btn.addEventListener('click', () => _activatePill(field));
    container.appendChild(btn);
  });
}

function _activatePill(field) {
  _pfActivePills.add(field);
  const el = document.querySelector(`#modalPerson .pf-opt-field[data-field="${field}"]`);
  if (el) {
    el.hidden = false;
    const input = el.querySelector('input,textarea,select');
    if (input) input.focus();
  }
  _renderPills();
}

function showPersonForm(id) {
  closeModal('modalAdd');
  const p = id ? getPerson(id) : null;
  const isNew = !id;
  document.getElementById('personFormTitle').textContent = p ? 'Person bearbeiten' : 'Neue Person';
  document.getElementById('pf-id').value = id || '';
  document.getElementById('pf-given').value = p?.given || '';
  document.getElementById('pf-surname').value = p?.surname || '';
  document.getElementById('pf-sex').value = p?.sex || 'U';
  document.getElementById('pf-prefix').value = p?.prefix || '';
  document.getElementById('pf-suffix').value = p?.suffix || '';
  document.getElementById('pf-rufname').value = p?._rufname || '';
  document.getElementById('pf-nick').value = p?.nick || '';
  document.getElementById('pf-titl').value   = p?.titl  || '';
  document.getElementById('pf-note').value   = p?.noteTexts?.join('\n') ?? '';
  document.getElementById('pf-resn').value   = p?.resn  || '';
  document.getElementById('pf-email').value  = p?.email || '';
  document.getElementById('pf-www').value    = p?.www   || '';
  document.getElementById('pf-birth-date').value  = p?.birth?.date  || '';
  document.getElementById('pf-birth-place').value = p?.birth?.place || '';
  document.getElementById('pf-death-date').value  = p?.death?.date  || '';
  document.getElementById('pf-death-place').value = p?.death?.place || '';
  document.getElementById('pf-chr-date').value    = p?.chr?.date    || '';
  document.getElementById('pf-chr-place').value   = p?.chr?.place   || '';
  document.getElementById('pf-buri-date').value   = p?.buri?.date   || '';
  document.getElementById('pf-buri-place').value  = p?.buri?.place  || '';
  const _firstOccu = p?.events?.find(e => e.type === 'OCCU');
  const _firstResi = p?.events?.find(e => e.type === 'RESI');
  document.getElementById('pf-beruf').value         = _firstOccu?.value || '';
  document.getElementById('pf-wohnort-date').value  = _firstResi?.date  || '';
  document.getElementById('pf-wohnort-place').value = _firstResi?.place || '';
  _pfExtraNames = (p?.extraNames || []).map(en => ({...en}));
  _renderPfExtraNames();
  document.getElementById('deletePersonBtn').style.display = p ? 'block' : 'none';
  initSrcWidget('pf', p?.nameCitations || []);
  const errEl = document.getElementById('pf-name-err');
  if (errEl) { errEl.textContent = ''; errEl.setAttribute('hidden', ''); }
  const givenEl = document.getElementById('pf-given');
  const surnameEl = document.getElementById('pf-surname');
  givenEl.classList.remove('field-invalid');
  surnameEl.classList.remove('field-invalid');
  const _checkNameBlur = () => {
    const empty = !givenEl.value.trim() && !surnameEl.value.trim();
    givenEl.classList.toggle('field-invalid', empty);
    surnameEl.classList.toggle('field-invalid', empty);
    if (errEl) { if (empty) errEl.removeAttribute('hidden'); else errEl.setAttribute('hidden', ''); }
  };
  givenEl.onblur = _checkNameBlur;
  surnameEl.onblur = _checkNameBlur;

  // Datum-Normalisierung bei Feldverlassen
  ['pf-birth-date', 'pf-death-date', 'pf-chr-date', 'pf-buri-date', 'pf-wohnort-date'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.onblur = () => { el.value = _normQuickDate(el.value); };
  });

  // Pills-Modus: neue Person → optionale Felder ausblenden + Pills zeigen
  // Bestehende Person → alle Felder sichtbar, keine Pills
  _pfActivePills = new Set();
  const pillsContainer = document.getElementById('pf-field-pills');
  const optFields = document.querySelectorAll('#modalPerson .pf-opt-field');
  if (isNew) {
    optFields.forEach(el => { el.hidden = true; });
    if (pillsContainer) { pillsContainer.hidden = false; _renderPills(); }
  } else {
    optFields.forEach(el => { el.hidden = false; });
    if (pillsContainer) pillsContainer.hidden = true;
  }
  const saveNewBtn = document.getElementById('pfSaveNewBtn');
  if (saveNewBtn) saveNewBtn.hidden = !isNew;

  openModal('modalPerson');
}

function _renderPfExtraNames() {
  const list = document.getElementById('pf-extranames-list');
  if (!list) return;
  list.innerHTML = '';
  _pfExtraNames.forEach((en, idx) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;align-items:center;flex-wrap:wrap';
    const mkInput = (ph, val, field) => {
      const el = document.createElement('input');
      el.className = 'form-input';
      el.style.cssText = 'flex:2;min-width:70px';
      el.placeholder = ph;
      el.value = val;
      el.addEventListener('input', () => { _pfExtraNames[idx][field] = el.value; });
      return el;
    };
    row.appendChild(mkInput('Vorname', en.given || '', 'given'));
    row.appendChild(mkInput('Nachname', en.surname || '', 'surname'));
    const sel = document.createElement('select');
    sel.className = 'form-select';
    sel.style.cssText = 'flex:2;min-width:100px';
    [['', '— Typ wählen —'], ['birth','Geburtsname'], ['maiden','Mädchenname'],
     ['married','Ehename'], ['aka','Auch bekannt als'], ['immigrant','Einwanderer-Name'], ['nickname','Spitzname']]
      .forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; if (en.type === v) o.selected = true; sel.appendChild(o); });
    sel.addEventListener('change', () => { _pfExtraNames[idx].type = sel.value; });
    row.appendChild(sel);
    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = '×';
    del.className = 'btn btn-danger';
    del.style.cssText = 'padding:4px 10px;flex-shrink:0';
    del.addEventListener('click', () => removePfExtraName(idx));
    row.appendChild(del);
    list.appendChild(row);
  });
}

function addPfExtraName() {
  _pfExtraNames.push({ nameRaw:'', given:'', surname:'', prefix:'', suffix:'', type:'', sources:[], sourcePages:{}, sourceQUAY:{}, _extra:[] });
  _renderPfExtraNames();
}

function removePfExtraName(idx) {
  _pfExtraNames.splice(idx, 1);
  _renderPfExtraNames();
}

function savePerson(openNew = false) {
  const id = document.getElementById('pf-id').value || nextId('I');
  const given = document.getElementById('pf-given').value.trim();
  const surname = document.getElementById('pf-surname').value.trim();
  const sex = document.getElementById('pf-sex').value;
  const prefix = document.getElementById('pf-prefix').value.trim();
  const rufname = document.getElementById('pf-rufname').value.trim();
  const nick   = document.getElementById('pf-nick').value.trim();
  const suffix = document.getElementById('pf-suffix').value.trim();
  const titl   = document.getElementById('pf-titl').value.trim();
  const note   = document.getElementById('pf-note').value.trim();
  const resn   = document.getElementById('pf-resn').value.trim();
  const email  = document.getElementById('pf-email').value.trim();
  const www    = document.getElementById('pf-www').value.trim();

  if (!given && !surname) {
    const errEl = document.getElementById('pf-name-err');
    if (errEl) { errEl.textContent = 'Bitte mindestens Vor- oder Nachname eingeben'; errEl.removeAttribute('hidden'); }
    document.getElementById('pf-given').classList.add('field-invalid');
    document.getElementById('pf-surname').classList.add('field-invalid');
    return;
  }

  const existing = getPerson(id) || {};
  const events = existing.events ? [...existing.events] : [];
  const berufVal     = document.getElementById('pf-beruf')?.value.trim()        || '';
  const wohnortDate  = document.getElementById('pf-wohnort-date')?.value.trim() || '';
  const wohnortPlace = document.getElementById('pf-wohnort-place')?.value.trim()|| '';
  const extraNames = _pfExtraNames
    .filter(en => en.given || en.surname)
    .map(en => ({
      ...en,
      nameRaw: [en.given, en.surname ? '/' + en.surname + '/' : ''].filter(Boolean).join(' ')
    }));

  const birthDate  = document.getElementById('pf-birth-date')?.value.trim()  || '';
  const birthPlace = document.getElementById('pf-birth-place')?.value.trim() || '';
  const deathDate  = document.getElementById('pf-death-date')?.value.trim()  || '';
  const deathPlace = document.getElementById('pf-death-place')?.value.trim() || '';
  const chrDate    = document.getElementById('pf-chr-date')?.value.trim()    || '';
  const chrPlace   = document.getElementById('pf-chr-place')?.value.trim()   || '';
  const buriDate   = document.getElementById('pf-buri-date')?.value.trim()   || '';
  const buriPlace  = document.getElementById('pf-buri-place')?.value.trim()  || '';

  const nameCitations = [...(srcWidgetState['pf']?.citations || [])];
  // Auto-assign: Quelle wird allen befüllten Sonderevents zugeordnet (ohne Duplikate)
  const _mergeCits = (existing, toAdd) => {
    if (!toAdd.length) return existing;
    const seen = new Set(existing.map(c => c.sid));
    return [...existing, ...toAdd.filter(c => !seen.has(c.sid))];
  };
  const _eventCits = (evExisting, hasData) =>
    hasData ? _mergeCits(evExisting?.citations || [], nameCitations) : (evExisting?.citations || []);
  // OCCU: erstes vorhandenes Event aktualisieren oder neues anhängen
  if (berufVal) {
    const occuIdx = events.findIndex(e => e.type === 'OCCU');
    const base = occuIdx >= 0 ? events[occuIdx] : { type:'OCCU', date:null, place:null, lati:null, long:null, eventType:'', note:'', noteRefs:[], addr:'', phon:[], email:[], citations:[], media:[], _extra:[] };
    const ev = { ...base, value: berufVal, citations: _eventCits(base, true) };
    if (occuIdx >= 0) events[occuIdx] = ev; else events.push(ev);
  }
  // RESI: erstes vorhandenes Event aktualisieren oder neues anhängen
  if (wohnortPlace || wohnortDate) {
    const resiIdx = events.findIndex(e => e.type === 'RESI');
    const base = resiIdx >= 0 ? events[resiIdx] : { type:'RESI', value:'', lati:null, long:null, eventType:'', note:'', noteRefs:[], addr:'', phon:[], email:[], citations:[], media:[], _extra:[] };
    const ev = { ...base, date: wohnortDate || null, place: wohnortPlace, citations: _eventCits(base, true) };
    if (resiIdx >= 0) events[resiIdx] = ev; else events.push(ev);
  }

  AppState.db.individuals[id] = {
    ...existing,
    id, given, surname, prefix, nick, _rufname: rufname,
    name: (given + (surname ? ' ' + surname : '')).trim(),
    nameRaw: '',  // reset when edited via UI; parser sets original value
    sex,
    birth: { ...(existing.birth || { lati:null, long:null, citations:[], _extra:[], value:'', seen:false, note:'' }), date: birthDate, place: birthPlace, citations: _eventCits(existing.birth, birthDate || birthPlace) },
    death: { ...(existing.death || { lati:null, long:null, citations:[], _extra:[], cause:'', value:'', seen:false, note:'' }), date: deathDate, place: deathPlace, citations: _eventCits(existing.death, deathDate || deathPlace) },
    chr:   { ...(existing.chr   || { lati:null, long:null, citations:[], _extra:[], value:'', seen:false, note:'' }), date: chrDate,  place: chrPlace,  citations: _eventCits(existing.chr,   chrDate  || chrPlace)  },
    buri:  { ...(existing.buri  || { lati:null, long:null, citations:[], _extra:[], value:'', seen:false, note:'' }), date: buriDate, place: buriPlace, citations: _eventCits(existing.buri,  buriDate || buriPlace) },
    events,
    noteTexts: note ? [note] : [],
    noteRefs: existing.noteRefs || [],
    noteText: (() => {
      let t = note;
      for (const ref of (existing.noteRefs || [])) {
        if (AppState.db.notes && AppState.db.notes[ref]) t += (t ? '\n' : '') + AppState.db.notes[ref].text;
      }
      return t;
    })(),
    famc: existing.famc || [],
    fams: existing.fams || [],
    media: existing.media || [],
    extraNames,
    suffix,
    titl,
    resn,
    email,
    www,
    lastChanged: gedcomDate(new Date()),
    lastChangedTime: gedcomTime(new Date()),
    nameCitations,
    sourceRefs: new Set()
  };
  _rebuildPersonSourceRefs(AppState.db.individuals[id]);

  // _pendingRelation vor closeModal sichern — closeModal löscht es sonst
  const _pendingRel = UIState._pendingRelation;
  UIState._pendingRelation = null;
  closeModal('modalPerson');

  markChanged();
  renderTab();

  if (_pendingRel) {
    showToast('✓ Person erstellt');
    setTimeout(() => openRelFamilyForm(_pendingRel.anchorId, id, _pendingRel.mode), 80);
    return;
  }
  showToast('✓ Person gespeichert');
  if (openNew) { showPersonForm(null); return; }
  if (AppState.currentPersonId === id) showDetail(id);
}

async function deletePerson() {
  const id = document.getElementById('pf-id').value;
  const _pd = getPerson(id);
  if (!id || !_pd) return;
  if (!await confirmModal(`${_pd.name || id} wirklich löschen?`, 'Löschen')) return;

  // Remove from families
  for (const f of Object.values(AppState.db.families)) {
    setFamily(f.id, {
      husb:     f.husb === id ? null : f.husb,
      wife:     f.wife === id ? null : f.wife,
      children: f.children.filter(c => c !== id)
    });
  }
  delete AppState.db.individuals[id];
  closeModal('modalPerson');
  markChanged();
  showMain(); showToast('✓ Person gelöscht');
}

// ─────────────────────────────────────
//  EXTRA NAME FORM
// ─────────────────────────────────────

function showExtraNameForm(pid, enIdx) {
  const p = getPerson(pid);
  const en = (enIdx !== null && enIdx >= 0) ? (p?.extraNames?.[enIdx] || null) : null;
  const isNew = (en === null);

  document.getElementById('enf-pid').value    = pid;
  document.getElementById('enf-enidx').value  = isNew ? '' : String(enIdx);
  document.getElementById('enf-given').value   = en?.given   || '';
  document.getElementById('enf-surname').value = en?.surname || '';
  document.getElementById('enf-prefix').value  = en?.prefix  || '';
  document.getElementById('enf-suffix').value  = en?.suffix  || '';
  document.getElementById('enf-type').value    = en?.type    || '';

  const typeLabel = en?.type ? (NAME_TYPE_LABELS[en.type] || en.type) : 'Weiterer Name';
  document.getElementById('extraNameFormTitle').textContent = isNew ? 'Weiterer Name hinzufügen' : typeLabel + ' bearbeiten';
  document.getElementById('deleteExtraNameBtn').style.display = isNew ? 'none' : 'block';

  initSrcWidget('enf', en?.citations || []);
  openModal('modalExtraName');
}

function saveExtraName() {
  const pid    = document.getElementById('enf-pid').value;
  const enIdxS = document.getElementById('enf-enidx').value;
  const enIdx  = enIdxS === '' ? -1 : parseInt(enIdxS, 10);
  const given   = document.getElementById('enf-given').value.trim();
  const surname = document.getElementById('enf-surname').value.trim();
  if (!given && !surname) { showToast('Bitte Namen eingeben'); return; }

  const p = getPerson(pid);
  if (!p) return;
  const prefix = document.getElementById('enf-prefix').value.trim();
  const suffix = document.getElementById('enf-suffix').value.trim();
  const entry = {
    ...(enIdx >= 0 ? p.extraNames[enIdx] : { _extra:[] }),
    given, surname, prefix, suffix,
    type:    document.getElementById('enf-type').value,
    citations: [...(srcWidgetState['enf']?.citations || [])],
    nameRaw: [prefix, given, surname ? '/' + surname + '/' : '', suffix].filter(Boolean).join(' '),
  };

  if (!p.extraNames) p.extraNames = [];
  if (enIdx >= 0) p.extraNames[enIdx] = entry;
  else p.extraNames.push(entry);

  markChanged();
  closeModal('modalExtraName');
  showDetail(pid);
}

function deleteExtraName() {
  const pid   = document.getElementById('enf-pid').value;
  const enIdx = parseInt(document.getElementById('enf-enidx').value, 10);
  const p = getPerson(pid);
  if (!p || isNaN(enIdx)) return;
  p.extraNames.splice(enIdx, 1);
  markChanged();
  closeModal('modalExtraName');
  showDetail(pid);
}
