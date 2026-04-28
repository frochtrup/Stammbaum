// ─────────────────────────────────────
//  SOURCE WIDGET
//  srcWidgetState[prefix] = { ids: Set, pages: {sid:page}, quay: {sid:quay} }
//  Gespeichert in UIState._formState.srcWidget (shimmiert als srcWidgetState)
// ─────────────────────────────────────

function updateSrcPage(prefix, sid, value) {
  if (!srcWidgetState[prefix]) srcWidgetState[prefix] = { ids: new Set(), pages: {}, quay: {} };
  srcWidgetState[prefix].pages[sid] = value;
}

function updateSrcQuay(prefix, sid, value) {
  if (!srcWidgetState[prefix]) srcWidgetState[prefix] = { ids: new Set(), pages: {}, quay: {} };
  srcWidgetState[prefix].quay[sid] = value;
}

function initSrcWidget(prefix, selectedIds, pageMap, quayMap) {
  const ids = selectedIds instanceof Set ? [...selectedIds] : (Array.isArray(selectedIds) ? selectedIds : []);
  srcWidgetState[prefix] = {
    ids:   new Set(ids),
    pages: pageMap ? { ...pageMap } : {},
    quay:  quayMap ? { ...quayMap } : {}
  };
  renderSrcTags(prefix);
  renderSrcPicker(prefix);
  document.getElementById(prefix + '-src-picker').classList.remove('open');
}

function renderSrcTags(prefix) {
  const container = document.getElementById(prefix + '-src-tags');
  const selected = srcWidgetState[prefix]?.ids || new Set();
  if (!selected.size) {
    container.innerHTML = '<span style="font-size:0.8rem;color:var(--text-muted);font-style:italic">Keine Quellen zugewiesen</span>';
    return;
  }
  const pages = srcWidgetState[prefix]?.pages || {};
  const quays = srcWidgetState[prefix]?.quay  || {};
  container.innerHTML = [...selected].map(sid => {
    const s = AppState.db.sources[sid];
    const label = s ? (s.abbr || s.title || sid) : sid;
    const pageVal = pages[sid] || '';
    const quayVal = String(quays[sid] ?? '');
    const sidEsc = sid.replace(/'/g,"\\'").replace(/"/g,'&quot;');
    const _hasMeta = prefix === 'ef' || prefix === 'cr' || prefix === 'pf' || prefix === 'fev' || prefix === 'ff';
    const pageField = _hasMeta
      ? `<input type="text" class="src-page-input" value="${esc(pageVal)}" placeholder="Seite…"
           data-input="updateSrcPage" data-prefix="${prefix}" data-sid="${sidEsc}">`
      : '';
    const quayField = _hasMeta
      ? `<select class="src-quay-select" data-change="updateSrcQuay" data-prefix="${prefix}" data-sid="${sidEsc}"
           style="font-size:0.78rem;padding:2px 4px;border-radius:4px;border:1px solid var(--border);background:var(--surface2);color:var(--text-dim);margin-left:4px">
           <option value="" ${quayVal==='' ? 'selected' : ''}>Q–</option>
           <option value="0" ${quayVal==='0' ? 'selected' : ''}>0 unbelegt</option>
           <option value="1" ${quayVal==='1' ? 'selected' : ''}>1 fragwürdig</option>
           <option value="2" ${quayVal==='2' ? 'selected' : ''}>2 plausibel</option>
           <option value="3" ${quayVal==='3' ? 'selected' : ''}>3 direkt</option>
         </select>`
      : '';
    return `<span class="src-tag">
      ${esc(label.length > 25 ? label.slice(0,23)+'…' : label)}
      ${pageField}${quayField}
      <button type="button" class="src-tag-x" data-action="removeSrc" data-prefix="${prefix}" data-sid="${sid}" aria-label="Quelle entfernen">✕</button>
    </span>`;
  }).join('');
}

function renderSrcPicker(prefix) {
  const list = document.getElementById(prefix + '-src-list');
  const selected = srcWidgetState[prefix]?.ids || new Set();
  const srcs = Object.values(AppState.db.sources).sort((a,b) => (a.abbr||a.title||'').localeCompare(b.abbr||b.title||'','de'));
  if (!srcs.length) {
    list.innerHTML = '<div class="src-picker-empty">Noch keine Quellen vorhanden</div>';
    return;
  }
  list.innerHTML = srcs.map(s => {
    const label = s.abbr || s.title || s.id;
    const isSel = selected.has(s.id);
    return `<div class="src-picker-item ${isSel ? 'selected' : ''}" data-action="toggleSrc" data-prefix="${prefix}" data-sid="${s.id}">
      ${isSel ? '✓ ' : ''}${esc(label)}
    </div>`;
  }).join('');
}

function toggleSrcPicker(prefix) {
  const picker = document.getElementById(prefix + '-src-picker');
  picker.classList.toggle('open');
  if (picker.classList.contains('open')) renderSrcPicker(prefix);
}

function toggleSrc(prefix, sid) {
  if (!srcWidgetState[prefix]) srcWidgetState[prefix] = { ids: new Set(), pages: {}, quay: {} };
  const set = srcWidgetState[prefix].ids;
  if (set.has(sid)) set.delete(sid); else set.add(sid);
  renderSrcTags(prefix);
  renderSrcPicker(prefix);
}

function removeSrc(prefix, sid) {
  srcWidgetState[prefix]?.ids.delete(sid);
  renderSrcTags(prefix);
  renderSrcPicker(prefix);
}

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

function showPersonForm(id) {
  closeModal('modalAdd');
  const p = id ? getPerson(id) : null;
  document.getElementById('personFormTitle').textContent = p ? 'Person bearbeiten' : 'Neue Person';
  document.getElementById('pf-id').value = id || '';
  document.getElementById('pf-given').value = p?.given || '';
  document.getElementById('pf-surname').value = p?.surname || '';
  document.getElementById('pf-sex').value = p?.sex || 'U';
  document.getElementById('pf-prefix').value = p?.prefix || '';
  document.getElementById('pf-suffix').value = p?.suffix || '';
  document.getElementById('pf-nick').value = p?.nick || '';
  document.getElementById('pf-titl').value   = p?.titl  || '';
  document.getElementById('pf-note').value   = p?.noteTexts?.join('\n') ?? '';
  document.getElementById('pf-resn').value   = p?.resn  || '';
  document.getElementById('pf-email').value  = p?.email || '';
  document.getElementById('pf-www').value    = p?.www   || '';
  _pfExtraNames = (p?.extraNames || []).map(en => ({...en}));
  _renderPfExtraNames();
  document.getElementById('deletePersonBtn').style.display = p ? 'block' : 'none';
  initSrcWidget('pf', p?.topSources || [], p?.topSourcePages || {}, p?.topSourceQUAY || {});
  const errEl = document.getElementById('pf-name-err');
  if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
  document.getElementById('pf-given').style.borderColor = '';
  document.getElementById('pf-surname').style.borderColor = '';
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

function savePerson() {
  const id = document.getElementById('pf-id').value || nextId('I');
  const given = document.getElementById('pf-given').value.trim();
  const surname = document.getElementById('pf-surname').value.trim();
  const sex = document.getElementById('pf-sex').value;
  const prefix = document.getElementById('pf-prefix').value.trim();
  const nick   = document.getElementById('pf-nick').value.trim();
  const suffix = document.getElementById('pf-suffix').value.trim();
  const titl   = document.getElementById('pf-titl').value.trim();
  const note   = document.getElementById('pf-note').value.trim();
  const resn   = document.getElementById('pf-resn').value.trim();
  const email  = document.getElementById('pf-email').value.trim();
  const www    = document.getElementById('pf-www').value.trim();

  if (!given && !surname) {
    const errEl = document.getElementById('pf-name-err');
    if (errEl) { errEl.textContent = 'Bitte mindestens Vor- oder Nachname eingeben'; errEl.style.display = ''; }
    document.getElementById('pf-given').style.borderColor = 'var(--danger, #c0392b)';
    document.getElementById('pf-surname').style.borderColor = 'var(--danger, #c0392b)';
    return;
  }

  const existing = getPerson(id) || {};
  const events = existing.events ? [...existing.events] : [];
  const extraNames = _pfExtraNames
    .filter(en => en.given || en.surname)
    .map(en => ({
      ...en,
      nameRaw: [en.given, en.surname ? '/' + en.surname + '/' : ''].filter(Boolean).join(' ')
    }));

  AppState.db.individuals[id] = {
    ...existing,
    id, given, surname, prefix, nick,
    name: (given + (surname ? ' ' + surname : '')).trim(),
    nameRaw: '',  // reset when edited via UI; parser sets original value
    sex,
    birth: existing.birth || { date:'', place:'', lati:null, long:null, sources:[], sourcePages:{} },
    death: existing.death || { date:'', place:'', lati:null, long:null, sources:[], sourcePages:{}, cause:'' },
    chr:   existing.chr   || { date:'', place:'', lati:null, long:null, sources:[], sourcePages:{} },
    buri:  existing.buri  || { date:'', place:'', lati:null, long:null, sources:[], sourcePages:{} },
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
    topSources:     [...(srcWidgetState['pf']?.ids   || [])],
    topSourcePages: { ...(srcWidgetState['pf']?.pages || {}) },
    topSourceQUAY:  { ...(srcWidgetState['pf']?.quay  || {}) },
    sourceRefs: srcWidgetState['pf']?.ids || new Set()
  };

  closeModal('modalPerson');

  markChanged();
  renderTab();

  if (UIState._pendingRelation) {
    const rel = UIState._pendingRelation;
    UIState._pendingRelation = null;
    showToast('✓ Person erstellt');
    setTimeout(() => openRelFamilyForm(rel.anchorId, id, rel.mode), 80);
    return;
  }
  showToast('✓ Person gespeichert');
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
//  MEDIA LIST HELPERS (Formular-Medienlisten)
// ─────────────────────────────────────
function _renderMediaList(prefix, mediaArr) {
  const container = document.getElementById(prefix + '-media-list');
  if (!container) return;
  container.innerHTML = '';
  if (!mediaArr || !mediaArr.length) return;
  for (let i = 0; i < mediaArr.length; i++) {
    const m = mediaArr[i];
    if (!m.file && !m.title) continue;
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--border)';
    row.dataset.idx = i;
    const label = document.createElement('span');
    label.style.cssText = 'flex:1;font-size:0.82rem;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0';
    label.textContent = (m.title || m.file) + (m.title && m.file ? ' (' + m.file + ')' : '');
    label.title = (m.title ? m.title + '\n' : '') + (m.file || '');
    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = '×';
    del.className = 'btn btn-danger';
    del.style.cssText = 'padding:2px 8px;font-size:0.9rem;flex-shrink:0';
    del.addEventListener('click', () => { row.remove(); });
    row.appendChild(label);
    row.appendChild(del);
    container.appendChild(row);
  }
}

function _readMediaList(prefix, existingMedia) {
  const container = document.getElementById(prefix + '-media-list');
  if (!container) return existingMedia;
  const result = [];
  for (const row of container.children) {
    if (row.dataset.idx !== undefined) {
      const idx = parseInt(row.dataset.idx, 10);
      if (!isNaN(idx) && existingMedia[idx]) result.push(existingMedia[idx]);
    } else if (row.dataset.new) {
      result.push({ file: row.dataset.file || '', title: '', form: '', _extra: [] });
    }
  }
  return result;
}

function _addMediaEntry(prefix) {
  const fileInput = document.getElementById(prefix + '-media-add-file');
  const file = (fileInput?.value || '').trim();
  if (!file) { showToast('Bitte Dateinamen eingeben'); return; }
  const container = document.getElementById(prefix + '-media-list');
  if (!container) return;
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--border)';
  row.dataset.new = '1';
  row.dataset.file = file;
  const label = document.createElement('span');
  label.style.cssText = 'flex:1;font-size:0.82rem;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0';
  label.textContent = file;
  label.title = file;
  const del = document.createElement('button');
  del.type = 'button';
  del.textContent = '×';
  del.className = 'btn btn-danger';
  del.style.cssText = 'padding:2px 8px;font-size:0.9rem;flex-shrink:0';
  del.addEventListener('click', () => { row.remove(); });
  row.appendChild(label);
  row.appendChild(del);
  container.appendChild(row);
  if (fileInput) fileInput.value = '';
}

// ─────────────────────────────────────
//  FORMS: FAMILY
// ─────────────────────────────────────
let _pendingAddChild = null;

function showFamilyForm(id, ctx) {
  closeModal('modalAdd');
  _pendingAddChild = null;
  const f = id ? getFamily(id) : null;
  document.getElementById('familyFormTitle').textContent = f ? 'Familie bearbeiten' : 'Neue Familie';
  document.getElementById('ff-id').value = id || '';

  // Populate person selects
  const persons = Object.values(AppState.db.individuals).sort((a,b) => (a.name||'').localeCompare(b.name||'','de'));
  const optionsAll = '<option value="">– keine –</option>' + persons.map(p =>
    `<option value="${p.id}">${esc(p.name || p.id)}</option>`
  ).join('');
  document.getElementById('ff-husb').innerHTML = optionsAll;
  document.getElementById('ff-wife').innerHTML = optionsAll;

  document.getElementById('ff-husb').value = f?.husb || '';
  document.getElementById('ff-wife').value = f?.wife || '';
  fillDateFields('ff-mdate-qual', 'ff-mdate', null, f?.marr?.date  || '');
  initPlaceMode('ff-mplace');
  document.getElementById('ff-mplace').value = f?.marr?.place  || '';
  document.getElementById('ff-note').value = f?.noteTexts?.join('\n') ?? '';
  document.getElementById('deleteFamilyBtn').style.display = f ? 'block' : 'none';
  initSrcWidget('ff', f?.marr?.sources || [], f?.marr?.sourcePages || {}, f?.marr?.sourceQUAY || {});

  _renderMediaList('ff', f?.media || []);
  document.getElementById('ff-media-add-file').value = '';

  // Vorausfüllung aus Beziehungs-Picker-Kontext
  if (ctx) {
    if (ctx.husb !== undefined) document.getElementById('ff-husb').value = ctx.husb || '';
    if (ctx.wife !== undefined) document.getElementById('ff-wife').value = ctx.wife || '';
    if (ctx.addChild) {
      _pendingAddChild = ctx.addChild;
    }
  }

  openModal('modalFamily');
}

function saveFamily() {
  const id = document.getElementById('ff-id').value || nextId('F');
  const husb = document.getElementById('ff-husb').value || null;
  const wife = document.getElementById('ff-wife').value || null;
  if (!husb && !wife) { showToast('⚠ Mindestens ein Elternteil erforderlich'); return; }
  const mdate  = buildGedDateFromFields('ff-mdate-qual', 'ff-mdate', null);
  const mplace = getPlaceFromForm('ff-mplace');
  const note = document.getElementById('ff-note').value.trim();
  const existingFam = getFamily(id) || {};
  const children = [...(existingFam.children || [])];
  if (_pendingAddChild && !children.includes(_pendingAddChild)) children.push(_pendingAddChild);
  _pendingAddChild = null;
  AppState.db.families[id] = {
    ...existingFam,
    id, husb, wife, children,
    marr:  { ...(existingFam.marr||{}),  date: mdate,  place: mplace,
      sources:     [...(srcWidgetState['ff']?.ids   || [])],
      sourcePages: { ...(srcWidgetState['ff']?.pages || {}) },
      sourceQUAY:  { ...(srcWidgetState['ff']?.quay  || {}) }
    },
    engag: existingFam.engag || {},
    div:   existingFam.div   || {},
    divf:  existingFam.divf  || {},
    noteTexts: note ? [note] : [],
    noteText: (() => {
      let t = note;
      for (const ref of (existingFam.noteRefs || [])) {
        if (AppState.db.notes && AppState.db.notes[ref]) t += (t ? '\n' : '') + AppState.db.notes[ref].text;
      }
      return t;
    })(),
    media: _readMediaList('ff', existingFam.media || []),
    sourceRefs: new Set(),
    lastChanged: gedcomDate(new Date()),
    lastChangedTime: gedcomTime(new Date())
  };
  _rebuildFamilySourceRefs(AppState.db.families[id]);

  // Update FAMS/FAMC references
  // famc entries are objects {famId, frel, mrel}, fams entries are strings
  const famcId = f => (typeof f === 'string' ? f : f.famId);
  // Bestehende famc-Einträge dieser Familie sichern, bevor sie entfernt werden
  const savedFamc = {};
  for (const p of Object.values(AppState.db.individuals)) {
    const existing = p.famc.find(f => famcId(f) === id);
    if (existing) savedFamc[p.id] = existing;
    p.fams = p.fams.filter(f => f !== id);
    p.famc = p.famc.filter(f => famcId(f) !== id);
  }
  const hPerson = getPerson(husb); if (hPerson && !hPerson.fams.includes(id)) hPerson.fams.push(id);
  const wPerson = getPerson(wife); if (wPerson && !wPerson.fams.includes(id)) wPerson.fams.push(id);
  for (const cid of children) {
    const cPerson = getPerson(cid);
    if (cPerson && !cPerson.famc.some(f => famcId(f) === id))
      cPerson.famc.push(savedFamc[cid] || { famId: id, pedi: '', frel: '', mrel: '', frelSeen: false, mrelSeen: false, frelSour:'', frelPage:'', frelQUAY:'', frelSourExtra:[], mrelSour:'', mrelPage:'', mrelQUAY:'', mrelSourExtra:[], sourIds:[], sourPages:{}, sourQUAY:{}, sourExtra:{} });
  }

  closeModal('modalFamily');
  markChanged();
  renderTab();
  showToast('✓ Familie gespeichert');
  if (AppState.currentFamilyId === id) showFamilyDetail(id);
}

async function deleteFamily() {
  const id = document.getElementById('ff-id').value;
  if (!id) return;
  if (!await confirmModal('Familie wirklich löschen?', 'Löschen')) return;
  const famcId2 = f => (typeof f === 'string' ? f : f.famId);
  for (const p of Object.values(AppState.db.individuals)) {
    setPerson(p.id, {
      fams: p.fams.filter(f => f !== id),
      famc: p.famc.filter(f => famcId2(f) !== id)
    });
  }
  delete AppState.db.families[id];
  closeModal('modalFamily');
  markChanged();
  showMain(); showToast('✓ Familie gelöscht');
}

// ─────────────────────────────────────
//  FORMS: SOURCE
// ─────────────────────────────────────
function _applySourceTemplate(type) {
  const abbr  = document.getElementById('sf-abbr');
  const title = document.getElementById('sf-title');
  const auth  = document.getElementById('sf-auth');
  const date  = document.getElementById('sf-date');
  const text  = document.getElementById('sf-text');
  const templates = {
    kirchenbuch:  { abbr: 'KB ', title: 'Kirchenbuch ', auth: 'Pfarramt', text: 'Tauf-/Heirats-/Sterbebuch' },
    standesamt:   { abbr: 'SA ', title: 'Standesamt ', auth: 'Standesamt', text: 'Geburts-/Heirats-/Sterbeurkunde' },
    volkszaehlung:{ abbr: 'VZ ', title: 'Volkszählung ', auth: 'Statistisches Amt', text: '' },
    familienbuch: { abbr: 'FSB ', title: 'Familienstammbuch ', auth: '', text: '' },
    zeitung:      { abbr: 'Ztg ', title: 'Zeitungsartikel: ', auth: '', text: '' },
  };
  const t = templates[type];
  if (!t) return;
  if (!abbr.value)  abbr.value  = t.abbr;
  if (!title.value) title.value = t.title;
  if (!auth.value && t.auth)  auth.value  = t.auth;
  if (!text.value && t.text)  text.value  = t.text;
  abbr.focus();
  abbr.setSelectionRange(abbr.value.length, abbr.value.length);
}

function showSourceForm(id) {
  closeModal('modalAdd');
  const s = id ? getSource(id) : null;
  const isNew = !s;
  document.getElementById('sourceFormTitle').textContent = s ? 'Quelle bearbeiten' : 'Neue Quelle';
  document.getElementById('sf-template-row').style.display = isNew ? '' : 'none';
  document.getElementById('sf-id').value    = id || '';
  document.getElementById('sf-abbr').value  = s?.abbr   || '';
  document.getElementById('sf-title').value = s?.title  || '';
  document.getElementById('sf-auth').value  = s?.author || '';
  document.getElementById('sf-date').value  = s?.date   || '';
  document.getElementById('sf-publ').value  = s?.publ   || '';
  document.getElementById('sf-repo').value  = s?.repo         || '';
  document.getElementById('sf-caln').value  = s?.repoCallNum  || '';
  document.getElementById('sf-text').value  = s?.text         || '';
  sfRepoUpdateDisplay();
  document.getElementById('deleteSourceBtn').style.display = s ? 'block' : 'none';

  _renderMediaList('sf', s?.media || []);
  document.getElementById('sf-media-add-file').value = '';

  // Schnell-Formular: bei neuer Quelle Optional-Felder verstecken
  const opt = document.getElementById('sf-optional-fields');
  const moreBtn = document.getElementById('sf-more-btn');
  if (isNew) {
    opt.style.display = 'none';
    moreBtn.style.display = '';
    moreBtn.textContent = 'Weitere Felder ▼';
  } else {
    opt.style.display = '';
    moreBtn.style.display = 'none';
  }

  openModal('modalSource');
}

function sfToggleMore() {
  const opt = document.getElementById('sf-optional-fields');
  const btn = document.getElementById('sf-more-btn');
  const open = opt.style.display !== 'none';
  opt.style.display = open ? 'none' : '';
  btn.textContent = open ? 'Weitere Felder ▼' : 'Weniger Felder ▲';
}

function saveSource() {
  const id = document.getElementById('sf-id').value || nextId('S');
  const existing = getSource(id) || {};
  const abbr  = document.getElementById('sf-abbr').value.trim();
  const title = document.getElementById('sf-title').value.trim();
  if (!abbr && !title) { showToast('⚠ Kurzname oder Titel erforderlich'); return; }
  const _now = new Date();
  AppState.db.sources[id] = {
    ...existing,
    id,
    abbr,
    title,
    author:      document.getElementById('sf-auth').value.trim(),
    date:        document.getElementById('sf-date').value.trim(),
    publ:        document.getElementById('sf-publ').value.trim(),
    repo:        document.getElementById('sf-repo').value.trim(),
    repoCallNum: document.getElementById('sf-caln').value.trim(),
    text:        document.getElementById('sf-text').value.trim(),
    media:       _readMediaList('sf', existing.media || []),
    lastChanged:     gedcomDate(_now),
    lastChangedTime: gedcomTime(_now)
  };

  closeModal('modalSource');
  markChanged();
  renderTab();
  showToast('✓ Quelle gespeichert');
  if (AppState.currentSourceId === id) showSourceDetail(id);
}

async function deleteSource() {
  const id = document.getElementById('sf-id').value;
  if (!id) return;
  if (!await confirmModal('Quelle wirklich löschen?', 'Löschen')) return;
  delete AppState.db.sources[id];
  closeModal('modalSource');
  markChanged();
  showMain(); showToast('✓ Quelle gelöscht');
}

// (Archiv-Formular + Picker + Detail: ui-forms-repo.js)
// (Event-Formular: ui-forms-event.js)

// ─────────────────────────────────────
//  MODAL HELPERS
// ─────────────────────────────────────
const _FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
function _getFocusable(modal) {
  return [...modal.querySelectorAll(_FOCUSABLE)].filter(el => el.offsetParent !== null);
}
let _trapHandler   = null;
let _trapPrevFocus = null;

function openModal(id) {
  const m = document.getElementById(id);
  _trapPrevFocus = document.activeElement;
  m.classList.add('open');
  if (!m.getAttribute('role')) m.setAttribute('role', 'dialog');
  m.setAttribute('aria-modal', 'true');
  requestAnimationFrame(() => {
    const items = _getFocusable(m);
    if (items.length) items[0].focus();
    if (_trapHandler) document.removeEventListener('keydown', _trapHandler);
    _trapHandler = e => {
      if (e.key !== 'Tab') return;
      const its = _getFocusable(m);
      if (!its.length) { e.preventDefault(); return; }
      if (e.shiftKey) {
        if (document.activeElement === its[0]) { e.preventDefault(); its[its.length - 1].focus(); }
      } else {
        if (document.activeElement === its[its.length - 1]) { e.preventDefault(); its[0].focus(); }
      }
    };
    document.addEventListener('keydown', _trapHandler);
  });
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  if (_trapHandler) { document.removeEventListener('keydown', _trapHandler); _trapHandler = null; }
  if (_trapPrevFocus?.focus) { _trapPrevFocus.focus(); _trapPrevFocus = null; }
  // Pending-Flows zurücksetzen wenn ihr Modal geschlossen wird (Cancel, Backdrop, Escape)
  if (id === 'modalPerson')  UIState._pendingRelation = null;
  if (id === 'modalRepo')    UIState._pendingRepoLink  = null;
  // confirmModal-Promise mit false auflösen (Escape / Backdrop / Cancel)
  if (id === 'modalConfirm') { _confirmResolve?.(false); _confirmResolve = null; }
}

// ─────────────────────────────────────
//  CONFIRM MODAL
// ─────────────────────────────────────
let _confirmResolve = null;

// Ersatz für window.confirm() — gibt Promise<boolean> zurück.
// Verwendung: if (!await confirmModal('Wirklich löschen?', 'Löschen')) return;
function confirmModal(msg, okLabel) {
  document.getElementById('modalConfirmMsg').textContent = msg;
  const okBtn = document.getElementById('modalConfirmOkBtn');
  if (okBtn) okBtn.textContent = okLabel || 'Bestätigen';
  return new Promise(resolve => {
    _confirmResolve = resolve;
    openModal('modalConfirm');
  });
}
// Close on backdrop click — closeModal() aufrufen damit Pending-State zurückgesetzt wird
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) closeModal(m.id); });
});

// ─────────────────────────────────────
//  SWIPE-DOWN TO CLOSE (Bottom-Sheets)
// ─────────────────────────────────────
// Geste: Handle nach unten ziehen oder bei scrollTop=0 nach unten wischen →
// Sheet schließt sich per Animation. Hoch-Wischen oder Scrollen bleibt unberührt.
(function initSwipeToClose() {
  let _sw = null; // { el, modalId, startY, startScrollTop, fromHandle, delta }

  document.addEventListener('touchstart', e => {
    const overlay = e.target.closest('.modal-overlay.open');
    if (!overlay) return;
    const sheet = overlay.querySelector('.sheet');
    if (!sheet) return;
    const fromHandle = !!e.target.closest('.sheet-handle');
    _sw = {
      el: sheet,
      modalId: overlay.id,
      startY: e.touches[0].clientY,
      startScrollTop: sheet.scrollTop,
      fromHandle,
      delta: 0
    };
    sheet.style.transition = 'none';
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (!_sw) return;
    const dy = e.touches[0].clientY - _sw.startY;
    // Hoch-Wischen oder Content nicht am Anfang → Geste abbrechen
    if (dy < 0 || (!_sw.fromHandle && _sw.startScrollTop > 2)) {
      _sw.el.style.transition = '';
      _sw = null;
      return;
    }
    _sw.delta = dy;
    e.preventDefault(); // Scroll unterdrücken während Drag
    // Widerstand: ab 60px langsamer werden
    const damped = dy < 60 ? dy : 60 + (dy - 60) * 0.4;
    _sw.el.style.transform = `translateY(${damped}px)`;
  }, { passive: false });

  document.addEventListener('touchend', () => {
    if (!_sw) return;
    const { el, modalId, delta } = _sw;
    _sw = null;
    const THRESHOLD = 90; // px — ab hier wird geschlossen
    if (delta >= THRESHOLD) {
      el.style.transition = 'transform 0.25s cubic-bezier(0.32,0.72,0,1)';
      el.style.transform = 'translateY(100%)';
      setTimeout(() => {
        closeModal(modalId);
        el.style.transform = '';
        el.style.transition = '';
      }, 240);
    } else {
      // Zurückschnappen
      el.style.transition = 'transform 0.22s cubic-bezier(0.32,0.72,0,1)';
      el.style.transform = '';
      setTimeout(() => { el.style.transition = ''; }, 220);
    }
  }, { passive: true });
})();
// ─────────────────────────────────────
//  PINCH-ZOOM (Baum-Ansicht, Sprint P3-5)
// ─────────────────────────────────────
(function initPinchZoom() {
  const sc = document.getElementById('treeScroll');
  const wrap = document.getElementById('treeWrap');
  let startDist = 0, startScale = 1;
  let swipeStartX = 0, swipeStartY = 0;

  function pinchDist(e) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  sc.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      startDist  = pinchDist(e);
      startScale = UIState._treeScale;
    } else if (e.touches.length === 1) {
      swipeStartX = e.touches[0].clientX;
      swipeStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  sc.addEventListener('touchmove', e => {
    if (e.touches.length !== 2) return;
    e.preventDefault();
    const scale = Math.min(2, Math.max(0.4, startScale * pinchDist(e) / startDist));
    UIState._treeScale = scale;
    wrap.style.transform = `scale(${scale})`;
  }, { passive: false });

  // Doppeltipp: Zoom zurücksetzen; Wisch rechts: zurück
  let lastTap = 0;
  sc.addEventListener('touchend', e => {
    if (e.touches.length !== 0) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - swipeStartX;
    const dy = endY - swipeStartY;
    // Wisch rechts = zurück (mindestens 70px, überwiegend horizontal)
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) treeNavBack();
      return;
    }
    // Doppeltipp = Zoom reset
    const now = Date.now();
    if (now - lastTap < 300 && Math.abs(dx) < 20 && Math.abs(dy) < 20) {
      UIState._treeScale = 1;
      wrap.style.transform = 'scale(1)';
    }
    lastTap = now;
  }, { passive: true });

  // Desktop: Mausrad + Ctrl/Cmd
  sc.addEventListener('wheel', e => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    UIState._treeScale = Math.min(2, Math.max(0.4, UIState._treeScale * delta));
    wrap.style.transform = `scale(${UIState._treeScale})`;
  }, { passive: false });
})();

// Keyboard-Shortcuts
document.addEventListener('keydown', e => {
  const mod = e.metaKey || e.ctrlKey;

  // Escape: oberstes (zuletzt geöffnetes) Modal schließen
  if (e.key === 'Escape') {
    const all = document.querySelectorAll('.modal-overlay.open');
    if (all.length) closeModal(all[all.length - 1].id);
    return;
  }

  // Cmd/Ctrl+S: Speichern
  if (mod && e.key === 's') {
    e.preventDefault();
    exportGEDCOM();
    return;
  }

  // Cmd/Ctrl+Z: Änderungen verwerfen (nur wenn keine Modals offen)
  if (mod && e.key === 'z') {
    if (document.querySelector('.modal-overlay.open')) return;
    e.preventDefault();
    revertToSaved();
    return;
  }

});

// ─────────────────────────────────────
//  UTILS
// ─────────────────────────────────────

// ── Extra-Places Persistenz ──────────
function loadExtraPlaces() {
  try {
    const r = localStorage.getItem('stammbaum_extraplaces');
    return r ? JSON.parse(r).reduce((o, p) => { o[p.name] = p; return o; }, {}) : {};
  } catch(e) { return {}; }
}
function saveExtraPlaces() {
  try { localStorage.setItem('stammbaum_extraplaces', JSON.stringify(Object.values(AppState.db.extraPlaces))); } catch(e) {}
}

// ── Hof-Objects Persistenz ──────────
function loadHofObjects() {
  try {
    const r = localStorage.getItem('stammbaum_hofobjects');
    return r ? JSON.parse(r) : {};
  } catch(e) { return {}; }
}
function saveHofObjects() {
  try { localStorage.setItem('stammbaum_hofobjects', JSON.stringify(AppState.db.hofObjects)); } catch(e) {}
}

const _applyPersonFilterDebounced = debounce((q, from, to, sex, birthPlace) => filterPersons(q, from, to, sex, birthPlace), 200);
const filterFamiliesDebounced = debounce(filterFamilies, 200);
const filterSourcesDebounced  = debounce(filterSources,  200);
const filterPlacesDebounced   = debounce(filterPlaces,   200);
const filterHoefeDebounced    = debounce(filterHoefe,    200);

let toastTimer;
// type: 'success' | 'error' | 'warn' | 'info' (default)
// Rückwärtskompatibel: ✓-Präfix → success, ⚠-Präfix → warn
function showToast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast';
  const resolved = type
    || (msg.startsWith('✓') ? 'success' : msg.startsWith('⚠') ? 'warn' : 'info');
  if (resolved !== 'info') t.classList.add('toast-' + resolved);
  t.classList.add('show');
  const dur = { success: 2500, warn: 4000, error: 5000, info: 2800 }[resolved] ?? 2800;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), dur);
}
function showLoadingOverlay(msg) {
  document.getElementById('loadingMsg').textContent = msg || 'Wird geladen …';
  document.getElementById('loadingOverlay').classList.add('active');
}
function hideLoadingOverlay() {
  document.getElementById('loadingOverlay').classList.remove('active');
}

// ─────────────────────────────────────
//  PLACE AUTOCOMPLETE
// ─────────────────────────────────────
function initPlaceAutocomplete(inputId, ddId) {
  const input = document.getElementById(inputId);
  const dd    = document.getElementById(ddId);
  if (!input || !dd) return;

  const _searchPlaces = debounce(() => {
    const q = input.value.toLowerCase().trim();
    dd.innerHTML = '';
    if (!q) { dd.style.display = 'none'; return; }
    const names = [...collectPlaces().values()]
      .map(p => p.name)
      .filter(n => n.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStart = a.toLowerCase().startsWith(q);
        const bStart = b.toLowerCase().startsWith(q);
        if (aStart !== bStart) return aStart ? -1 : 1;
        return a.localeCompare(b, 'de');
      })
      .slice(0, 12);
    if (!names.length) { dd.style.display = 'none'; return; }
    names.forEach(name => {
      const item = document.createElement('div');
      item.className = 'place-dropdown-item';
      item.textContent = name;
      item.addEventListener('mousedown', () => {
        input.value = name;
        dd.style.display = 'none';
      });
      dd.appendChild(item);
    });
    dd.style.display = 'block';
  }, 150);

  input.addEventListener('input', () => {
    // Dropdown sofort leeren bei leerem Feld, sonst debounced suchen
    if (!input.value.trim()) { dd.innerHTML = ''; dd.style.display = 'none'; return; }
    _searchPlaces();
  });

  input.addEventListener('blur',  () => setTimeout(() => { dd.style.display = 'none'; }, 150));
  input.addEventListener('focus', () => { if (dd.children.length) dd.style.display = 'block'; });
}

// Autocomplete für alle Ortsfelder einmalig initialisieren
initPlaceAutocomplete('ef-place',  'ef-place-dd');
initPlaceAutocomplete('ff-mplace', 'ff-mplace-dd');
initPlaceAutocomplete('fev-place', 'fev-place-dd');
initPlaceAutocomplete('np-name',   'np-name-dd');


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

  initSrcWidget('enf', en?.sources || [], en?.sourcePages || {}, en?.sourceQUAY || {});
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
  const { ids, pages, quay } = srcWidgetState['enf'] || { ids: new Set(), pages: {}, quay: {} };

  const prefix = document.getElementById('enf-prefix').value.trim();
  const suffix = document.getElementById('enf-suffix').value.trim();
  const entry = {
    ...(enIdx >= 0 ? p.extraNames[enIdx] : { sourceExtra:{}, sourceNote:{}, sourceMedia:{}, _extra:[] }),
    given, surname, prefix, suffix,
    type:    document.getElementById('enf-type').value,
    sources:     [...ids],
    sourcePages: Object.fromEntries(Object.entries(pages).filter(([k]) => ids.has(k))),
    sourceQUAY:  Object.fromEntries(Object.entries(quay).filter(([k]) => ids.has(k))),
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

