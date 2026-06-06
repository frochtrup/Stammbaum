// ─────────────────────────────────────
//  SOURCE WIDGET
//  srcWidgetState[prefix] = { mode:'new', citations:[{sid,page,quay,...}] }
// ─────────────────────────────────────
const srcWidgetState = {};
// RES-EVAL 2b: Aufklapp-Zustand der Bewertungszeile je Widget (prefix → Set<citIdx>).
// Bewusst NICHT am Zitat-Objekt (würde via {...c} beim Speichern in db leaken).
const _srcEvalOpen = {};

function updateSrcPage(prefix, citIdx, value) {
  const s = srcWidgetState[prefix];
  const i = +citIdx;
  if (s?.citations[i]) s.citations[i].page = value;
}

function updateSrcQuay(prefix, citIdx, value) {
  const s = srcWidgetState[prefix];
  const i = +citIdx;
  if (s?.citations[i]) s.citations[i].quay = value;
}

// ─── RES-EVAL 2b: Evidenzbewertung pro Zitat (ADR-022) ────────────────────────
function toggleSrcEval(prefix, citIdx) {
  const i = +citIdx;
  if (!_srcEvalOpen[prefix]) _srcEvalOpen[prefix] = new Set();
  const set = _srcEvalOpen[prefix];
  set.has(i) ? set.delete(i) : set.add(i);
  renderSrcTags(prefix);
}

function updateSrcEval(prefix, citIdx, axis, value) {
  const c = srcWidgetState[prefix]?.citations[+citIdx];
  if (!c) return;
  if (!c.eval) c.eval = _newEval();
  if (axis in c.eval) c.eval[axis] = value;
  if (evalIsEmpty(c.eval)) c.eval = null;
  renderSrcTags(prefix);   // aktualisiert QUAY-Vorschlag + ⚖-Markierung
}

function updateSrcInformant(prefix, citIdx, value) {
  const c = srcWidgetState[prefix]?.citations[+citIdx];
  if (!c) return;
  if (!c.eval) c.eval = _newEval();
  c.eval.informant = value;
  if (evalIsEmpty(c.eval)) c.eval = null;
  // kein Re-Render: würde den Tippfokus im Informant-Feld verlieren
}

function applyEvalQuay(prefix, citIdx) {
  const c = srcWidgetState[prefix]?.citations[+citIdx];
  if (!c) return;
  const q = _evalToQuay(c.eval);
  if (q === '') { showToast('Keine Bewertung gesetzt', 'warn'); return; }
  c.quay = q;
  renderSrcTags(prefix);
  showToast(`QUAY ${q} aus Bewertung übernommen`, 'success');
}

// Bewertungszeile (3 Achsen-Selects + Informant + QUAY-Übernahme)
function _srcEvalRowHtml(prefix, idx, c) {
  const e = c.eval || {};
  let selects = '';
  for (const axis of Object.keys(EVAL_AXES)) {
    const def = EVAL_AXES[axis];
    const cur = e[axis] || '';
    let opts = `<option value="">${esc(def.label)} –</option>`;
    for (const [v, lbl] of def.values)
      opts += `<option value="${v}" ${cur === v ? 'selected' : ''}>${esc(lbl)}</option>`;
    selects += `<select class="src-eval-select" data-change="updateSrcEval" data-prefix="${prefix}" data-citidx="${idx}" data-axis="${axis}" title="${esc(def.label)} — ${esc(def.hint)}">${opts}</select>`;
  }
  const sug    = _evalToQuay(c.eval);
  const sugBtn = sug !== ''
    ? `<button type="button" class="src-eval-applyq" data-action="applyEvalQuay" data-prefix="${prefix}" data-citidx="${idx}" title="QUAY-Vorschlag ${sug} übernehmen">→Q${sug}</button>`
    : '';
  return `<div class="src-eval-row">
    ${selects}
    <input type="text" class="src-eval-informant" value="${esc(e.informant || '')}" placeholder="Informant…"
      data-input="updateSrcInformant" data-prefix="${prefix}" data-citidx="${idx}">
    ${sugBtn}
  </div>`;
}

function updateSrcUrl(prefix, citIdx, value) {
  const s = srcWidgetState[prefix];
  const i = +citIdx;
  if (!s?.citations[i]) return;
  const c = s.citations[i];
  if (!Array.isArray(c.media)) c.media = [];
  const url = value.trim();
  // Erstes media-Entry ist der Deeplink (OBJE/FILE); ggf. anlegen oder entfernen
  if (url) {
    if (c.media[0]) c.media[0].file = url;
    else c.media.push({ file: url, titl: '', _extra: [] });
  } else {
    if (c.media[0] && /^https?:\/\//.test(c.media[0].file || '')) c.media.splice(0, 1);
  }
}

function initSrcWidget(prefix, citationsOrIds) {
  const arr = Array.isArray(citationsOrIds) ? citationsOrIds : [];
  delete _srcEvalOpen[prefix];   // RES-EVAL 2b: Aufklapp-Zustand für frisches Formular zurücksetzen
  srcWidgetState[prefix] = { mode:'new', citations: arr.map(c =>
    (c && typeof c === 'object' && 'sid' in c)
      ? { ...c, extra: [...(c.extra||[])], media: [...(c.media||[])], eval: c.eval ? { ...c.eval } : null }
      : citationObj(String(c))
  )};
  renderSrcTags(prefix);
  renderSrcPicker(prefix);
  document.getElementById(prefix + '-src-picker').classList.remove('open');
}

function renderSrcTags(prefix) {
  const container = document.getElementById(prefix + '-src-tags');
  const s = srcWidgetState[prefix];
  if (!s) return;

  const cits = s.citations;
  if (!cits.length) {
    const pasteBtn = UIState._citClipboard
      ? `<button type="button" class="src-cit-btn" data-action="paste-cit" data-prefix="${prefix}" title="Quellenbezüge einfügen">📋</button>`
      : '';
    container.innerHTML = `<span class="fs-08 c-muted italic">Keine Quellen zugewiesen</span>${pasteBtn}`;
    return;
  }
  const tags = cits.map((c, idx) => {
    const src = AppState.db.sources[c.sid];
    const label = src ? (src.abbr || src.title || c.sid) : c.sid;
    const pageVal = c.page || '';
    const quayVal = String(c.quay ?? '');
    // URL aus erstem media-Entry (OBJE/FILE) lesen
    const urlVal  = (Array.isArray(c.media) && c.media[0] && /^https?:\/\//.test(c.media[0].file || ''))
      ? (c.media[0].file || '') : '';
    const hasEval  = !evalIsEmpty(c.eval);   // RES-EVAL 2b
    const evalOpen = _srcEvalOpen[prefix]?.has(idx);
    return `<span class="src-tag">
      <span class="src-tag-row">
        <span class="src-tag-label">${esc(label.length > 25 ? label.slice(0,23)+'…' : label)}</span>
        <input type="text" class="src-page-input" value="${esc(pageVal)}" placeholder="Seite/Folio…"
          data-input="updateSrcPage" data-prefix="${prefix}" data-citidx="${idx}">
        <select class="src-quay-select" data-change="updateSrcQuay" data-prefix="${prefix}" data-citidx="${idx}">
          <option value="" ${quayVal==='' ? 'selected' : ''}>Q–</option>
          <option value="0" ${quayVal==='0' ? 'selected' : ''}>0 unbelegt</option>
          <option value="1" ${quayVal==='1' ? 'selected' : ''}>1 fragwürdig</option>
          <option value="2" ${quayVal==='2' ? 'selected' : ''}>2 plausibel</option>
          <option value="3" ${quayVal==='3' ? 'selected' : ''}>3 direkt</option>
        </select>
        <button type="button" data-action="toggleSrcEval" data-prefix="${prefix}" data-citidx="${idx}"
          title="Quellenbewertung (Evidenz)" aria-expanded="${evalOpen ? 'true' : 'false'}"
          class="src-tag-icon-btn src-eval-toggle${hasEval ? ' src-eval-active' : ''}">⚖</button>
        <button type="button" data-action="citCamCapture" data-prefix="${prefix}" data-citidx="${idx}"
          title="Foto zur Quelle" class="src-tag-icon-btn">📷</button>
        <button type="button" data-action="removeSrc" data-prefix="${prefix}" data-citidx="${idx}"
          class="src-tag-icon-btn src-tag-remove" title="Quelle entfernen">✕</button>
      </span>
      <input type="url" class="src-url-input" value="${esc(urlVal)}" placeholder="↗ URL (Scan/Fundstelle)…"
        data-input="updateSrcUrl" data-prefix="${prefix}" data-citidx="${idx}">
      ${evalOpen ? _srcEvalRowHtml(prefix, idx, c) : ''}
    </span>`;
  }).join('');
  const copyBtn = `<button type="button" class="src-cit-btn" data-action="copy-cit" data-prefix="${prefix}" title="Quellenbezüge kopieren">⧉</button>`;
  const pasteBtn = UIState._citClipboard
    ? `<button type="button" class="src-cit-btn" data-action="paste-cit" data-prefix="${prefix}" title="Quellenbezüge einfügen">📋</button>`
    : '';
  container.innerHTML = tags + copyBtn + pasteBtn;
}

function renderSrcPicker(prefix) {
  const list = document.getElementById(prefix + '-src-list');
  const s = srcWidgetState[prefix];
  const srcs = Object.values(AppState.db.sources).sort((a,b) => (a.abbr||a.title||'').localeCompare(b.abbr||b.title||'','de'));
  if (!srcs.length) { list.innerHTML = '<div class="src-picker-empty">Noch keine Quellen vorhanden</div>'; return; }
  const counts = {};
  for (const c of (s?.citations || [])) counts[c.sid] = (counts[c.sid] || 0) + 1;
  list.innerHTML = srcs.map(src => {
    const label = src.abbr || src.title || src.id;
    const cnt = counts[src.id] || 0;
    return `<div class="src-picker-item" data-action="addSrc" data-prefix="${prefix}" data-sid="${src.id}">
      + ${esc(label)}${cnt ? `<span style="font-size:0.75rem;opacity:0.6;margin-left:4px">(${cnt}×)</span>` : ''}
    </div>`;
  }).join('');
}

function toggleSrcPicker(prefix) {
  const picker = document.getElementById(prefix + '-src-picker');
  picker.classList.toggle('open');
  if (picker.classList.contains('open')) renderSrcPicker(prefix);
}

function addSrc(prefix, sid) {
  if (!srcWidgetState[prefix]) srcWidgetState[prefix] = { mode:'new', citations: [] };
  srcWidgetState[prefix].citations.push(citationObj(sid));
  renderSrcTags(prefix);
  renderSrcPicker(prefix);
}

function removeSrc(prefix, citIdx) {
  const s = srcWidgetState[prefix];
  if (!s) return;
  const i = parseInt(citIdx);
  if (!isNaN(i)) s.citations.splice(i, 1);
  delete _srcEvalOpen[prefix];   // RES-EVAL 2b: Indizes verschieben sich → Aufklapp-Zustand verwerfen
  renderSrcTags(prefix);
  renderSrcPicker(prefix);
}

function copyCitations(prefix) {
  const w = srcWidgetState[prefix];
  if (!w?.citations?.length) return;
  UIState._citClipboard = w.citations.map(c => ({ ...c, extra: [...(c.extra||[])], media: [...(c.media||[])] }));
  const n = UIState._citClipboard.length;
  showToast(`${n} Quellenbezug${n !== 1 ? 'e' : ''} kopiert`, 'success');
  for (const p of Object.keys(srcWidgetState)) renderSrcTags(p);
}

function pasteCitations(prefix) {
  const clip = UIState._citClipboard;
  if (!clip?.length) return;
  if (!srcWidgetState[prefix]) srcWidgetState[prefix] = { mode:'new', citations: [] };
  const w = srcWidgetState[prefix];
  for (const c of clip) {
    w.citations.push({ ...c, extra: [...(c.extra||[])], media: [...(c.media||[])] });
  }
  renderSrcTags(prefix);
  renderSrcPicker(prefix);
  showToast(`${clip.length} Quellenbezug${clip.length !== 1 ? 'e' : ''} eingefügt`, 'info');
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

function _renderDataEvens(evens) {
  const container = document.getElementById('sf-data-evens-list');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < (evens || []).length; i++) {
    const de = evens[i];
    _appendDataEvenRow(container, de.evens, de.date, de.plac);
  }
}

function _appendDataEvenRow(container, evens, date, plac) {
  const row = document.createElement('div');
  row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:4px;padding:4px 0;border-bottom:1px solid var(--border)';
  row.innerHTML = `
    <input class="form-input" placeholder="BIRT, MARR, DEAT" value="${esc(evens||'')}" data-de="evens">
    <input class="form-input" placeholder="FROM 1750 TO 1850" value="${esc(date||'')}" data-de="date">
    <input class="form-input" placeholder="Ort" value="${esc(plac||'')}" data-de="plac">
    <button type="button" class="btn btn-danger" style="padding:2px 8px">×</button>`;
  row.querySelector('.btn-danger').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

function _readDataEvens() {
  const container = document.getElementById('sf-data-evens-list');
  if (!container) return [];
  const result = [];
  for (const row of container.children) {
    const evens = row.querySelector('[data-de="evens"]')?.value.trim() || '';
    const date  = row.querySelector('[data-de="date"]')?.value.trim()  || '';
    const plac  = row.querySelector('[data-de="plac"]')?.value.trim()  || '';
    if (evens || date || plac) result.push({evens, date, plac});
  }
  return result;
}

function addDataEven() {
  const container = document.getElementById('sf-data-evens-list');
  if (container) _appendDataEvenRow(container, '', '', '');
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
//  FORMS: SOURCE
// ─────────────────────────────────────
const _SOUR_TEMPLATES = {
  'kb-tauf':    { abbr: 'KB Taufen …',      title: 'Kirchenbuch …, Taufen',       auth: 'Pfarramt …',              publ: '', medi: 'manuscript' },
  'kb-heir':    { abbr: 'KB Heiraten …',    title: 'Kirchenbuch …, Heiraten',     auth: 'Pfarramt …',              publ: '', medi: 'manuscript' },
  'kb-beer':    { abbr: 'KB Beerdigungen …',title: 'Kirchenbuch …, Beerdigungen', auth: 'Pfarramt …',              publ: '', medi: 'manuscript' },
  'sta-geb':    { abbr: 'StA Geburten …',   title: 'Geburtsregister …, …',        auth: 'Standesamt …',            publ: '', medi: 'manuscript' },
  'sta-heir':   { abbr: 'StA Heiraten …',   title: 'Heiratsregister …, …',        auth: 'Standesamt …',            publ: '', medi: 'manuscript' },
  'sta-sterb':  { abbr: 'StA Sterbefälle …',title: 'Sterberegister …, …',         auth: 'Standesamt …',            publ: '', medi: 'manuscript' },
  'volkszaehl': { abbr: 'Volkszählung …',   title: 'Volkszählung …',              auth: 'Statistisches Amt',       publ: '', medi: 'manuscript' },
  'grabstein':  { abbr: 'Grabstein …',      title: 'Grabstein …',                 auth: '',                        publ: '', medi: 'tombstone'  },
  'totenzettel':{ abbr: 'Totenzettel …',    title: 'Totenzettel …',               auth: '',                        publ: '', medi: 'card'       },
  'militaer':   { abbr: 'Militärakte …',    title: 'Militärakte …',               auth: 'Bundesarchiv-Militärarchiv', publ: '', medi: 'manuscript' },
};

function _applySourceTemplate(type) {
  if (!type) return;
  const t = _SOUR_TEMPLATES[type];
  if (!t) return;
  document.getElementById('sf-abbr').value  = t.abbr;
  document.getElementById('sf-title').value = t.title;
  document.getElementById('sf-auth').value  = t.auth;
  document.getElementById('sf-publ').value  = t.publ;
  document.getElementById('sf-medi').value  = t.medi;
  // Optional-Felder aufklappen damit Nutzer alles sieht
  const opt = document.getElementById('sf-optional-fields');
  const btn = document.getElementById('sf-more-btn');
  if (opt.style.display === 'none') {
    opt.style.display = '';
    if (btn) btn.textContent = 'Weniger Felder ▲';
  }
  // Signatur-Gruppe einblenden (Archiv/CALN)
  document.getElementById('sf-caln-group').hidden = false;
  // Cursor ans Ende von sf-abbr, vor „…" damit Nutzer direkt Ort eintippt
  const abbr = document.getElementById('sf-abbr');
  abbr.focus();
  const pos = abbr.value.indexOf('…');
  abbr.setSelectionRange(pos >= 0 ? pos : abbr.value.length, abbr.value.length);
}

function showSourceForm(id) {
  closeModal('modalAdd');
  const s = id ? getSource(id) : null;
  const isNew = !s;
  document.getElementById('sourceFormTitle').textContent = s ? 'Quelle bearbeiten' : 'Neue Quelle';
  document.getElementById('sf-template-row').hidden = !isNew;
  document.getElementById('sf-id').value    = id || '';
  document.getElementById('sf-abbr').value  = s?.abbr   || '';
  document.getElementById('sf-title').value = s?.title  || '';
  document.getElementById('sf-auth').value  = s?.author || '';
  document.getElementById('sf-date').value  = s?.date   || '';
  document.getElementById('sf-publ').value  = s?.publ   || '';
  document.getElementById('sf-repo').value  = s?.repo         || '';
  document.getElementById('sf-caln').value  = s?.repoCalns?.[0]?.num  || s?.repoCallNum  || '';
  document.getElementById('sf-medi').value  = s?.repoCalns?.[0]?.medi || s?.repoCallMedi || '';
  document.getElementById('sf-text').value  = s?.text         || '';
  _renderDataEvens(s?.dataEvens || []);
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
  pushUndo('Quelle gespeichert', { sourceIds: [id] });
  AppState.db.sources[id] = {
    ...existing,
    id,
    abbr,
    title,
    author:      document.getElementById('sf-auth').value.trim(),
    date:        document.getElementById('sf-date').value.trim(),
    publ:        document.getElementById('sf-publ').value.trim(),
    repo:        document.getElementById('sf-repo').value.trim(),
    repoCalns: (() => {
      const _n = document.getElementById('sf-caln').value.trim();
      const _m = document.getElementById('sf-medi').value;
      const _prev = existing.repoCalns || (existing.repoCallNum ? [{num:existing.repoCallNum, medi:existing.repoCallMedi||'', extra:[]}] : []);
      const _first = {num:_n, medi:_m, extra:_prev[0]?.extra || []};
      return _n ? [_first, ..._prev.slice(1)] : _prev.slice(1);
    })(),
    dataEvens:    _readDataEvens(),
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
  pushUndo('Quelle gelöscht', { sourceIds: [id] });
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
  if (id === 'modalPerson')  { UIState._pendingRelation = null; UIState._pendingFfState = null; }
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

  // Cmd/Ctrl+Z: Undo (stack) oder Revert-to-Saved als Fallback
  if (mod && e.key === 'z' && !e.shiftKey) {
    if (document.querySelector('.modal-overlay.open')) return;
    e.preventDefault();
    if (AppState._undoStack.length) applyUndo(); else revertToSaved();
    return;
  }

  // Cmd/Ctrl+Shift+Z oder Cmd+Y: Redo
  if ((mod && e.shiftKey && e.key === 'Z') || (mod && e.key === 'y')) {
    if (document.querySelector('.modal-overlay.open')) return;
    e.preventDefault();
    applyRedo();
    return;
  }

  // Alt+← / Alt+→: Navigation Zurück / Vorwärts
  if (e.altKey && !mod) {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); goBack();    return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); goForward(); return; }
  }

});

// ─────────────────────────────────────
//  UTILS
// ─────────────────────────────────────

// ── Extra-Places Persistenz ──────────
function _extraPlacesKey() {
  const fn = AppState._currentFilename || '';
  return fn ? 'stammbaum_extraplaces_' + fn : 'stammbaum_extraplaces';
}
function loadExtraPlaces() {
  try {
    const r = localStorage.getItem(_extraPlacesKey());
    return r ? JSON.parse(r).reduce((o, p) => { o[p.name] = p; return o; }, {}) : {};
  } catch(e) { return {}; }
}
function saveExtraPlaces() {
  try { localStorage.setItem(_extraPlacesKey(), JSON.stringify(Object.values(AppState.db.extraPlaces))); } catch(e) {}
}

// ── PlaceObjects-Persistenz (IDB-Cache + JSON-Export, Muster quickTemplates) ──
// IDB-Key global (wie quickTemplates): Ortshierarchie ist appweit, nicht dateigebunden.
// Beim Laden werden nur _ep_-Einträge (user-erzeugte) gemergt — GRAMPS-native IDs
// werden nie überschrieben.
async function loadPlaceObjectsFromIDB() {
  try {
    // 1) IDB (lokal, schnell)
    const raw = await idbGet('stammbaum_placeobjects');
    const stored = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {};
    // 2) OneDrive Konfig-Ordner (falls verbunden — überschreibt ältere IDB-Daten)
    let odData = null;
    if (typeof _odReadAppData === 'function') {
      odData = await _odReadAppData('stammbaum-orte.json').catch(() => null);
    }
    const source = odData || stored; // OneDrive hat Vorrang (aktuellste Version)
    if (!source || typeof source !== 'object') return;
    const pos = AppState.db.placeObjects || (AppState.db.placeObjects = {});
    let added = 0;
    for (const [id, po] of Object.entries(source)) {
      if (pos[id]) continue; // vorhandene (GRAMPS-native) nicht überschreiben
      pos[id] = po;
      added++;
    }
    // OneDrive-Daten auch in IDB sichern (Offline-Fallback aktuell halten)
    if (odData) idbPut('stammbaum_placeobjects', JSON.stringify(odData)).catch(() => {});
    if (added) UIState._placeRegistry = null;
  } catch(e) { console.warn('loadPlaceObjectsFromIDB:', e); }
}

function savePlaceObjects() {
  try {
    // Alle placeObjects persistieren (GRAMPS-native + _ep_-user-erzeugte).
    // Beim späteren GRAMPS-Load schützt loadPlaceObjectsFromIDB via "if (pos[id]) continue"
    // davor, dass JSON-Einträge frisch geparste GRAMPS-Daten überschreiben.
    // Beim GEDCOM-Load stehen so auch GRAMPS-native Einträge (enclosedBy[], pnames[]) zur Verfügung.
    const toSave = AppState.db.placeObjects || {};
    idbPut('stammbaum_placeobjects', JSON.stringify(toSave)).catch(() => {});
    // OneDrive-Sync in Konfig-Ordner (fire-and-forget)
    if (typeof _odWriteAppData === 'function') _odWriteAppData('stammbaum-orte.json', toSave).catch(() => {});
  } catch(e) {}
}

function exportPlaceData() {
  const pos = AppState.db.placeObjects || {};
  const ep  = AppState.db.extraPlaces  || {};
  const blob = new Blob([JSON.stringify({ version: 1, placeObjects: pos, extraPlaces: ep }, null, 2)],
    { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'stammbaum-orte.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  showToast('Ortsdaten exportiert', 'success');
}

function importPlaceDataFile(input) {
  const file = input?.files?.[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      const pos  = data.placeObjects || {};
      const ep   = data.extraPlaces  || {};
      const dbPos = AppState.db.placeObjects || (AppState.db.placeObjects = {});
      const dbEp  = AppState.db.extraPlaces  || (AppState.db.extraPlaces  = {});
      let addedP = 0, addedE = 0;
      for (const [id, po] of Object.entries(pos)) {
        if (!dbPos[id]) { dbPos[id] = po; addedP++; }
      }
      for (const [name, epEntry] of Object.entries(ep)) {
        if (!dbEp[name]) { dbEp[name] = epEntry; addedE++; }
      }
      savePlaceObjects();
      saveExtraPlaces();
      UIState._placeRegistry = null;
      UIState._placesCache   = null;
      markChanged();
      if (typeof renderTab === 'function') renderTab();
      showToast(`${addedP} Ort-Entitäten + ${addedE} Koordinaten importiert`, 'success');
    } catch(e) { showToast('⚠ Fehler beim Import: ' + e.message, 'error'); }
  };
  r.readAsText(file);
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
// Nur gespeicherte Hof-Koordinaten für Adressen übernehmen, die in der
// aktuell geladenen Datei auch vorkommen — verhindert dateiübergreifende Leckage.
function _mergeHofObjects(derived, saved) {
  const result = { ...derived };
  for (const [addr, data] of Object.entries(saved)) {
    if (derived[addr]) result[addr] = { ...derived[addr], ...data };
  }
  // note-Fallback aus derived wiederherstellen
  for (const [a, h] of Object.entries(result)) {
    if (!h.note && derived[a]?.note) h.note = derived[a].note;
  }
  return result;
}

const _applyPersonFilterDebounced = debounce((q, from, to, sex, birthPlace, flags) => filterPersons(q, from, to, sex, birthPlace, flags), 200);
const filterFamiliesDebounced     = debounce(filterFamilies,  200);
const filterSourcesDebounced      = debounce(filterSources,   200);
const filterPlacesDebounced       = debounce(filterPlaces,    200);
const filterHoefeDebounced        = debounce(filterHoefe,     200);
const runGlobalSearchDebounced    = debounce(runGlobalSearch, 200);

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
  updateLoadingProgress(null);
}
function updateLoadingProgress(pct) {
  const bar  = document.getElementById('loadingBar');
  const fill = document.getElementById('loadingBarFill');
  if (!bar || !fill) return;
  if (pct == null) { bar.classList.remove('active'); fill.style.width = '0%'; return; }
  bar.classList.add('active');
  fill.style.width = Math.min(100, pct) + '%';
}

// ─────────────────────────────────────
//  PLACE AUTOCOMPLETE
// ─────────────────────────────────────
function initPlaceAutocomplete(inputId, ddId) {
  initAutocomplete(inputId, ddId, {
    getItems: q => [...collectPlaces().values()]
      .map(p => p.name)
      .filter(n => n.toLowerCase().includes(q))
      .sort((a, b) => {
        const aS = a.toLowerCase().startsWith(q), bS = b.toLowerCase().startsWith(q);
        if (aS !== bS) return aS ? -1 : 1;
        return a.localeCompare(b, 'de');
      }),
    formatLabel: name => name,
    onSelect:    (name, input) => { input.value = name; },
  });
}

// Autocomplete für alle Ortsfelder einmalig initialisieren
initPlaceAutocomplete('ef-place',        'ef-place-dd');
initPlaceAutocomplete('ff-mplace',       'ff-mplace-dd');
initPlaceAutocomplete('fev-place',       'fev-place-dd');
initPlaceAutocomplete('pf-birth-place',  'pf-birth-place-dd');
initPlaceAutocomplete('pf-death-place',  'pf-death-place-dd');
initPlaceAutocomplete('pf-chr-place',     'pf-chr-place-dd');
initPlaceAutocomplete('pf-buri-place',   'pf-buri-place-dd');
initPlaceAutocomplete('pf-wohnort-place','pf-wohnort-place-dd');
initPlaceAutocomplete('np-name',   'np-name-dd');
initAutocomplete('qa-place', 'qa-place-dd', {
  showAllOnFocus: true,
  useFixed: true,
  getItems: q => [...collectPlaces().values()]
    .map(p => p.name)
    .filter(n => !q || n.toLowerCase().includes(q))
    .sort((a, b) => {
      if (q) {
        const aS = a.toLowerCase().startsWith(q), bS = b.toLowerCase().startsWith(q);
        if (aS !== bS) return aS ? -1 : 1;
      }
      return a.localeCompare(b, 'de');
    }),
  formatLabel: name => name,
  onSelect: (name, input) => { input.value = name; },
});

initAutocomplete('qa-src-input', 'qa-src-dd', {
  showAllOnFocus: true,
  useFixed: true,
  limit: 50,
  getItems: q => Object.values(AppState.db.sources || {})
    .filter(s => !q || (s.abbr || s.title || s.id || '').toLowerCase().includes(q))
    .sort((a, b) => (a.abbr || a.title || '').localeCompare(b.abbr || b.title || '', 'de')),
  formatLabel: s => s.abbr ? `${s.abbr} — ${s.title || ''}`.trim() : (s.title || s.id),
  onSelect: (s, input) => {
    input.value = s.abbr || s.title || s.id;
    _qaSrcId = s.id;
    if (typeof _qaUpdateClipBtns === 'function') _qaUpdateClipBtns();
  },
});

// ─── CAM-LINK: Foto direkt zur Zitation (cit.media[]) ──────────────────────
let _citCamPrefix = null, _citCamIdx = -1;

function citCamCapture(prefix, citIdx) {
  _citCamPrefix = prefix;
  _citCamIdx    = citIdx;
  document.getElementById('cit-cam-input').click();
}

function citCamChange(file) {
  const prefix = _citCamPrefix;
  const idx    = _citCamIdx;
  _citCamPrefix = null; _citCamIdx = -1;
  if (!file || !prefix || idx < 0) return;
  if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) {
    showToast('Nur Bilder erlaubt (JPG, PNG, WEBP, GIF)', 'error');
    return;
  }
  resizeImageToBase64(file).then(b64 => {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const fileName = `foto_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_`
                   + `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.jpg`;
    idbPut('img:' + fileName, b64).then(() => {
      const cit = srcWidgetState[prefix]?.citations[idx];
      if (!cit) return;
      if (!Array.isArray(cit.media)) cit.media = [];
      cit.media.push({ file: fileName, title: '', form: 'jpeg', _extra: [] });
      renderSrcTags(prefix);
      showToast('Foto zur Quelle gespeichert', 'success');
    });
  }).catch(() => showToast('Bild konnte nicht geladen werden', 'error'));
}



