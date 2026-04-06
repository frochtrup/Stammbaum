// ─────────────────────────────────────
//  SOURCE WIDGET
//  srcWidgetState[prefix] = { ids: Set, pages: {sid:page}, quay: {sid:quay} }
// ─────────────────────────────────────
const srcWidgetState = {};  // {prefix: {ids: Set, pages: {sid: page}, quay: {sid: quay}}}

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
    const _hasMeta = prefix === 'ef' || prefix === 'cr';
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
      <button type="button" data-action="removeSrc" data-prefix="${prefix}" data-sid="${sid}" style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:0 0 0 4px;font-size:0.85rem">✕</button>
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
}

let _pfExtraNames = [];

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
  document.getElementById('pf-note').value   = p?.noteTexts?.length ? p.noteTexts.join('\n') : (p?.noteTextInline ?? p?.noteText ?? '');
  document.getElementById('pf-resn').value   = p?.resn  || '';
  document.getElementById('pf-email').value  = p?.email || '';
  document.getElementById('pf-www').value    = p?.www   || '';
  _pfExtraNames = (p?.extraNames || []).map(en => ({...en}));
  _renderPfExtraNames();
  document.getElementById('deletePersonBtn').style.display = p ? 'block' : 'none';
  initSrcWidget('pf', p?.sourceRefs || []);
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
    del.style.cssText = 'padding:4px 10px;background:var(--danger,#c0392b);color:#fff;border:none;border-radius:6px;cursor:pointer;flex-shrink:0';
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

  if (!given && !surname) { showToast('⚠ Bitte Namen eingeben'); return; }

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
    noteTextInline: note,
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
    sourceRefs: srcWidgetState['pf']?.ids || new Set()
  };

  closeModal('modalPerson');

  markChanged();
  updateStats();
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

function deletePerson() {
  const id = document.getElementById('pf-id').value;
  const _pd = getPerson(id);
  if (!id || !_pd) return;
  if (!confirm(`${_pd.name || id} wirklich löschen?`)) return;

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
  markChanged(); updateStats();
  showMain(); showToast('✓ Person gelöscht');
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
  document.getElementById('ff-note').value = f?.noteTexts?.length ? f.noteTexts.join('\n') : (f?.noteTextInline ?? f?.noteText ?? '');
  document.getElementById('deleteFamilyBtn').style.display = f ? 'block' : 'none';
  initSrcWidget('ff', f?.marr?.sources || f?.sourceRefs || []);

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
    marr:  { ...(existingFam.marr||{}),  date: mdate,  place: mplace,  sources: [...(srcWidgetState['ff']?.ids || [])] },
    engag: existingFam.engag || {},
    div:   existingFam.div   || {},
    divf:  existingFam.divf  || {},
    noteTexts: note ? [note] : [],
    noteTextInline: note,
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
  for (const p of Object.values(AppState.db.individuals)) {
    p.fams = p.fams.filter(f => f !== id);
    p.famc = p.famc.filter(f => famcId(f) !== id);
  }
  const hPerson = getPerson(husb); if (hPerson && !hPerson.fams.includes(id)) hPerson.fams.push(id);
  const wPerson = getPerson(wife); if (wPerson && !wPerson.fams.includes(id)) wPerson.fams.push(id);
  for (const cid of children) {
    const cPerson = getPerson(cid);
    if (cPerson && !cPerson.famc.some(f => famcId(f) === id))
      cPerson.famc.push({ famId: id, pedi: '', frel: '', mrel: '', frelSeen: false, mrelSeen: false, frelSour:'', frelPage:'', frelQUAY:'', frelSourExtra:[], mrelSour:'', mrelPage:'', mrelQUAY:'', mrelSourExtra:[], sourIds:[], sourPages:{}, sourQUAY:{}, sourExtra:{} });
  }

  closeModal('modalFamily');
  markChanged(); updateStats();
  renderTab();
  showToast('✓ Familie gespeichert');
  if (AppState.currentFamilyId === id) showFamilyDetail(id);
}

function deleteFamily() {
  const id = document.getElementById('ff-id').value;
  if (!id) return;
  if (!confirm('Familie wirklich löschen?')) return;
  const famcId2 = f => (typeof f === 'string' ? f : f.famId);
  for (const p of Object.values(AppState.db.individuals)) {
    setPerson(p.id, {
      fams: p.fams.filter(f => f !== id),
      famc: p.famc.filter(f => famcId2(f) !== id)
    });
  }
  delete AppState.db.families[id];
  closeModal('modalFamily');
  markChanged(); updateStats();
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
  markChanged(); updateStats();
  renderTab();
  showToast('✓ Quelle gespeichert');
  if (AppState.currentSourceId === id) showSourceDetail(id);
}

function deleteSource() {
  const id = document.getElementById('sf-id').value;
  if (!id) return;
  if (!confirm('Quelle wirklich löschen?')) return;
  delete AppState.db.sources[id];
  closeModal('modalSource');
  markChanged(); updateStats();
  showMain(); showToast('✓ Quelle gelöscht');
}

// (Archiv-Formular + Picker + Detail: ui-forms-repo.js)
// (Event-Formular: ui-forms-event.js)

// ─────────────────────────────────────
//  MODAL HELPERS
// ─────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');
  if (id === 'modalMenu') _updateMenuVersionInfo();
}

async function _updateMenuVersionInfo() {
  const swEl    = document.getElementById('menuSwVersion');
  const stateEl = document.getElementById('menuSwState');
  if (!swEl) return;
  let swName = 'kein Cache';
  if ('caches' in window) {
    const keys = await caches.keys();
    const sw = keys.find(k => k.startsWith('stammbaum-'));
    if (sw) swName = sw.replace('stammbaum-', 'sw ');
  }
  let state = '–';
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.getRegistration().catch(() => null);
    if (reg) {
      const w = reg.active || reg.installing || reg.waiting;
      state = reg.active ? 'aktiv' : reg.waiting ? 'wartet (neu laden)' : reg.installing ? 'installiert...' : '–';
    } else { state = 'nicht registriert'; }
  }
  swEl.textContent    = 'SW: ' + swName;
  stateEl.textContent = 'Status: ' + state;
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  // Pending-Flows zurücksetzen wenn ihr Modal geschlossen wird (Cancel, Backdrop, Escape)
  if (id === 'modalPerson') UIState._pendingRelation = null;
  if (id === 'modalRepo')   UIState._pendingRepoLink  = null;
}
// Close on backdrop click — closeModal() aufrufen damit Pending-State zurückgesetzt wird
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) closeModal(m.id); });
});
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

  // Escape: offenes Modal schließen
  if (e.key === 'Escape') {
    const open = document.querySelector('.modal-overlay.open');
    if (open) closeModal(open.id);
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

const _applyPersonFilterDebounced = debounce((q, from, to) => filterPersons(q, from, to), 200);
const filterFamiliesDebounced = debounce(filterFamilies, 200);
const filterSourcesDebounced  = debounce(filterSources,  200);
const filterPlacesDebounced   = debounce(filterPlaces,   200);

function esc(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
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
initPlaceAutocomplete('np-name',   'np-name-dd');

