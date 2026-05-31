// ─────────────────────────────────────
//  FORSCHUNGSPROTOKOLL (RLOG)
//  Ausgelagert aus ui-views-tasks.js (REFACT-3, sw v696)
//  Abhängigkeiten: renderTasksView, _toggleTaskInDb, _addTaskToDb,
//  _deleteTaskFromDb (ui-views-tasks.js)
// ─────────────────────────────────────

// ─── Forschungsprotokoll (RLOG) ───────────────────────────────────────────────

const _RLOG_RESULT_LABEL = {
  'found':     'Gefunden',
  'partial':   'Teilweise',
  'not-found': 'Nicht gefunden',
  'pending':   'Ausstehend',
};

let _rlogPersonId = null;
let _rlogFamId    = null;
let _rlogEditIdx  = null; // null = neuer Eintrag

function _newRlogId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function _rlogBadgeHtml(result) {
  const cls = 'rlog-badge rlog-badge-' + (result || 'pending').replace(/[^a-z-]/g, '');
  return `<span class="${cls}">${esc(_RLOG_RESULT_LABEL[result] || result)}</span>`;
}

function _rlogRowHtml(rl, idx, contextAttr) {
  const db   = AppState.db;
  const repo = rl.repoRef && db.repositories?.[rl.repoRef];
  const sour = rl.sourRef && db.sources?.[rl.sourRef];
  const meta = [rl.date, repo?.name, sour?.title].filter(Boolean).join(' · ');
  return `<div class="rlog-row">
    ${_rlogBadgeHtml(rl.result)}
    <div class="rlog-body">
      ${meta ? `<div class="rlog-meta">${esc(meta)}</div>` : ''}
      ${rl.query ? `<div class="rlog-query">${esc(rl.query)}</div>` : ''}
      ${rl.note  ? `<div class="rlog-note">${esc(rl.note)}</div>`  : ''}
    </div>
    <div class="rlog-actions">
      <button class="rlog-edit" data-action="editRlog" ${contextAttr} data-ridx="${idx}" aria-label="Bearbeiten">✎</button>
      <button class="rlog-del"  data-action="deleteRlog" ${contextAttr} data-ridx="${idx}" aria-label="Löschen">×</button>
    </div>
  </div>`;
}

function _taskToLog(el) {
  const query = decodeURIComponent(el.dataset.query || '');
  if (el.dataset.pid) showAddRlogForm(el.dataset.pid, query);
  else if (el.dataset.fid) showAddFamRlogForm(el.dataset.fid, query);
}

function _rlogSectionHtml(personId) {
  const p    = AppState.db.individuals?.[personId];
  const rlog = p?._rlog || [];
  let html = `<div class="section fade-up" id="rlog-section-${personId}">
    <div class="section-head">
      <div class="section-title">Forschungsprotokoll${rlog.length ? ` <span class="tasks-open-cnt">(${rlog.length})</span>` : ''}</div>
      <button class="section-add" data-action="showAddRlogForm" data-pid="${personId}">+ Eintrag</button>
    </div>`;
  if (rlog.length) {
    rlog.slice().reverse().forEach((rl, i) => {
      html += _rlogRowHtml(rl, rlog.length - 1 - i, `data-pid="${personId}"`);
    });
  } else {
    html += `<div class="tasks-empty">Kein Protokoll-Eintrag</div>`;
  }
  html += `</div>`;
  return html;
}

function _famRlogSectionHtml(famId) {
  const f    = AppState.db.families?.[famId];
  const rlog = f?._rlog || [];
  let html = `<div class="section fade-up" id="fam-rlog-section-${famId}">
    <div class="section-head">
      <div class="section-title">Forschungsprotokoll${rlog.length ? ` <span class="tasks-open-cnt">(${rlog.length})</span>` : ''}</div>
      <button class="section-add" data-action="showAddFamRlogForm" data-fid="${famId}">+ Eintrag</button>
    </div>`;
  if (rlog.length) {
    rlog.slice().reverse().forEach((rl, i) => {
      html += _rlogRowHtml(rl, rlog.length - 1 - i, `data-fid="${famId}"`);
    });
  } else {
    html += `<div class="tasks-empty">Kein Protokoll-Eintrag</div>`;
  }
  html += `</div>`;
  return html;
}

function _refreshRlogSection(personId) {
  const sec = document.getElementById('rlog-section-' + personId);
  if (!sec) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = _rlogSectionHtml(personId);
  sec.replaceWith(tmp.firstElementChild);
}

function _refreshFamRlogSection(famId) {
  const sec = document.getElementById('fam-rlog-section-' + famId);
  if (!sec) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = _famRlogSectionHtml(famId);
  sec.replaceWith(tmp.firstElementChild);
}

function _openRlogModal(title, rl) {
  const db = AppState.db;
  // REPO dropdown
  const repoSel = document.getElementById('rlogRepo');
  if (repoSel) {
    const repos = Object.entries(db.repositories || {});
    repoSel.innerHTML = '<option value="">(kein Archiv)</option>'
      + repos.map(([id, r]) => `<option value="${esc(id)}">${esc(r.name || id)}</option>`).join('');
    repoSel.value = rl?.repoRef || '';
  }
  // SOUR dropdown
  const sourSel = document.getElementById('rlogSour');
  if (sourSel) {
    const sources = Object.entries(db.sources || {});
    sourSel.innerHTML = '<option value="">(keine Quelle)</option>'
      + sources.map(([id, s]) => `<option value="${esc(id)}">${esc(s.title || id)}</option>`).join('');
    sourSel.value = rl?.sourRef || '';
  }
  const titleEl = document.querySelector('#modalAddRlog .sheet-title');
  if (titleEl) titleEl.textContent = title;
  document.getElementById('rlogDate').value   = rl?.date   || new Date().toISOString().slice(0, 10);
  document.getElementById('rlogQuery').value  = rl?.query  || '';
  document.getElementById('rlogResult').value = rl?.result || 'pending';
  document.getElementById('rlogNote').value   = rl?.note   || '';
  openModal('modalAddRlog');
}

function showAddRlogForm(personId, prefillQuery) {
  _rlogPersonId = personId; _rlogFamId = null; _rlogEditIdx = null;
  _openRlogModal('Log-Eintrag hinzufügen', prefillQuery ? { query: prefillQuery } : null);
}

function showAddFamRlogForm(famId, prefillQuery) {
  _rlogPersonId = null; _rlogFamId = famId; _rlogEditIdx = null;
  _openRlogModal('Log-Eintrag hinzufügen', prefillQuery ? { query: prefillQuery } : null);
}

function showEditRlogForm(personId, idx) {
  const p = AppState.db.individuals?.[personId];
  if (!p) return;
  if (!p._rlog) p._rlog = [];
  _rlogPersonId = personId; _rlogFamId = null; _rlogEditIdx = idx;
  _openRlogModal('Log-Eintrag bearbeiten', p._rlog[idx]);
}

function showEditFamRlogForm(famId, idx) {
  const f = AppState.db.families?.[famId];
  if (!f) return;
  if (!f._rlog) f._rlog = [];
  _rlogPersonId = null; _rlogFamId = famId; _rlogEditIdx = idx;
  _openRlogModal('Log-Eintrag bearbeiten', f._rlog[idx]);
}

function _saveRlog() {
  const date   = document.getElementById('rlogDate')?.value   || '';
  const repo   = document.getElementById('rlogRepo')?.value   || '';
  const sour   = document.getElementById('rlogSour')?.value   || '';
  const query  = document.getElementById('rlogQuery')?.value  || '';
  const result = document.getElementById('rlogResult')?.value || 'pending';
  const note   = document.getElementById('rlogNote')?.value   || '';
  if (!query.trim() && !note.trim()) { showToast('Bitte Suchbegriff oder Notiz eingeben', 'warn'); return; }
  closeModal('modalAddRlog');

  const entry = { date, repoRef: repo, sourRef: sour, query: query.trim(), result, note: note.trim() };

  if (_rlogFamId) {
    const f = AppState.db.families?.[_rlogFamId];
    if (!f) return;
    if (!f._rlog) f._rlog = [];
    if (_rlogEditIdx !== null) f._rlog[_rlogEditIdx] = entry;
    else f._rlog.push(entry);
    markChanged();
    _refreshFamRlogSection(_rlogFamId);
    if (AppState.currentTab === 'tasks') renderTasksView();
  } else {
    const p = AppState.db.individuals?.[_rlogPersonId];
    if (!p) return;
    if (!p._rlog) p._rlog = [];
    if (_rlogEditIdx !== null) p._rlog[_rlogEditIdx] = entry;
    else p._rlog.push(entry);
    markChanged();
    _refreshRlogSection(_rlogPersonId);
    if (AppState.currentTab === 'tasks') renderTasksView();
  }
  showToast('Eintrag gespeichert', 'success');
}

function _deleteRlogEntry(personId, idx) {
  const p = AppState.db.individuals?.[personId];
  if (!p?._rlog) return;
  p._rlog.splice(idx, 1);
  markChanged();
  _refreshRlogSection(personId);
  if (AppState.currentTab === 'tasks') renderTasksView();
}

function _deleteFamRlogEntry(famId, idx) {
  const f = AppState.db.families?.[famId];
  if (!f?._rlog) return;
  f._rlog.splice(idx, 1);
  markChanged();
  _refreshFamRlogSection(famId);
  if (AppState.currentTab === 'tasks') renderTasksView();
}

// ─── Globale Log-Liste ───────────────────────────────────────────────────────

let _rlogViewFilter = 'all';
let _rlogViewMode   = 'list';   // RES-PROJ 3c: 'list' | 'timeline'

function switchRlogFilter(f) {
  _rlogViewFilter = f;
  ['all', 'found', 'partial', 'not-found', 'pending'].forEach(k => {
    document.getElementById('rlog-filter-' + k)?.classList.toggle('active', k === f);
  });
  _renderRlogView();
}

function toggleRlogTimeline() {
  _rlogViewMode = _rlogViewMode === 'timeline' ? 'list' : 'timeline';
  _renderRlogView();
}

function _renderRlogView() {
  const container = document.getElementById('tasksList');
  if (!container) return;
  const db = AppState.db;

  const entries = [];
  for (const [pid, p] of Object.entries(db.individuals || {})) {
    if (!_projectMatches(pid)) continue;                       // RES-PROJ 3b
    for (let i = 0; i < (p._rlog || []).length; i++) {
      const rl = p._rlog[i];
      if (_rlogViewFilter !== 'all' && rl.result !== _rlogViewFilter) continue;
      entries.push({ kind: 'person', entity: p, id: pid, rl, idx: i });
    }
  }
  for (const [fid, f] of Object.entries(db.families || {})) {
    if (!_projectMatchesEntity('family', fid)) continue;
    for (let i = 0; i < (f._rlog || []).length; i++) {
      const rl = f._rlog[i];
      if (_rlogViewFilter !== 'all' && rl.result !== _rlogViewFilter) continue;
      entries.push({ kind: 'family', entity: f, id: fid, rl, idx: i });
    }
  }
  // Neueste zuerst (nach Datum, dann Einfügereihenfolge)
  entries.sort((a, b) => (b.rl.date || '').localeCompare(a.rl.date || '') || 0);

  const filterBtns = [
    { k: 'all',       s: '≡', l: 'Alle' },
    { k: 'found',     s: '✓', l: 'Gefunden' },
    { k: 'partial',   s: '≈', l: 'Teilweise' },
    { k: 'not-found', s: '✗', l: 'Nicht gefunden' },
    { k: 'pending',   s: '○', l: 'Ausstehend' },
  ].map(b => `<button id="rlog-filter-${b.k}" class="flt-btn${_rlogViewFilter === b.k ? ' active' : ''}"
    data-action="switchRlogFilter" data-filter="${b.k}" title="${b.l}">${b.s}</button>`).join('');

  let html = `<div class="tasks-sticky-header">
    ${_tasksModeBar()}
    ${_projectChipBar()}
    <div class="filter-action-bar">
      <div class="filter-chips">${filterBtns}</div>
      <div class="action-btns">
        <button class="act-btn-icon${_rlogViewMode === 'timeline' ? ' active' : ''}" data-action="toggleRlogTimeline" title="${_rlogViewMode === 'timeline' ? 'Listenansicht' : 'Zeitstrahl'}">${_rlogViewMode === 'timeline' ? '☰' : '🕒'}</button>
        <button class="act-btn-icon" data-action="exportRlogMd" title="Als Markdown exportieren">↓</button>
      </div>
    </div>
  </div>`;

  if (!entries.length) {
    html += `<div class="tasks-list-empty">Keine Einträge</div>`;
    container.innerHTML = html;
    return;
  }

  // RES-PROJ 3c: Research-Timeline
  if (_rlogViewMode === 'timeline') { _renderRlogTimeline(container, html, entries); return; }

  for (const { kind, entity, id, rl, idx } of entries) {
    const entityName = kind === 'person'
      ? (entity.name || id)
      : 'Familie: ' + _famDisplayName(id);
    const navAction = kind === 'person' ? `data-action="showDetail" data-pid="${id}"` : `data-action="showFamilyDetail" data-fid="${id}"`;
    const ctxAttr   = kind === 'person' ? `data-pid="${id}"` : `data-fid="${id}"`;
    html += `<div class="tasks-person-header" ${navAction}>${esc(entityName)} ›</div>`;
    html += _rlogRowHtml(rl, idx, ctxAttr);
  }

  container.innerHTML = html;
}

// ─── Research-Timeline (RES-PROJ 3c) ─────────────────────────────────────────
// Forschungsaktivitäten chronologisch (Protokoll-Einträge nach Datum gruppiert).
// entries sind bereits projekt-skopiert + neueste-zuerst sortiert (_renderRlogView).
function _renderRlogTimeline(container, headerHtml, entries) {
  const db = AppState.db;
  let html = headerHtml + '<div class="rtl">';
  let lastDate = null;
  for (const { kind, entity, id, rl } of entries) {
    const dateLabel = rl.date || 'Ohne Datum';
    if (dateLabel !== lastDate) {
      html += `<div class="rtl-date">${esc(dateLabel)}</div>`;
      lastDate = dateLabel;
    }
    const entityName = kind === 'person' ? (entity.name || id) : 'Familie: ' + _famDisplayName(id);
    const nav  = kind === 'person' ? `data-action="showDetail" data-pid="${id}"` : `data-action="showFamilyDetail" data-fid="${id}"`;
    const repo = rl.repoRef && db.repositories?.[rl.repoRef];
    const sour = rl.sourRef && db.sources?.[rl.sourRef];
    const meta = [repo?.name, sour?.title].filter(Boolean).join(' · ');
    const resultCls = 'rtl-node rtl-node-' + (rl.result || 'pending').replace(/[^a-z-]/g, '');
    html += `<div class="rtl-item">
      <span class="${resultCls}"></span>
      <div class="rtl-card">
        <div class="rtl-card-head">
          <span class="rtl-entity" ${nav}>${esc(entityName)} ›</span>
          ${_rlogBadgeHtml(rl.result)}
        </div>
        ${meta ? `<div class="rtl-meta">${esc(meta)}</div>` : ''}
        ${rl.query ? `<div class="rtl-query">${esc(rl.query)}</div>` : ''}
        ${rl.note  ? `<div class="rtl-note">${esc(rl.note)}</div>`  : ''}
      </div>
    </div>`;
  }
  html += '</div>';
  container.innerHTML = html;
}

// ─── MD-Export Protokoll ─────────────────────────────────────────────────────

function exportRlogMd() {
  const db      = AppState.db;
  const persons = db.individuals || {};
  const families= db.families    || {};
  const repos   = db.repositories || {};
  const sources = db.sources      || {};
  const dateStr = new Date().toLocaleDateString('de-DE');
  const srcFile = localStorage.getItem('stammbaum_filename') || 'Stammbaum';
  const filter  = _rlogViewFilter;

  const _resultLabel = r => _RLOG_RESULT_LABEL[r] || r;

  const entries = [];
  for (const [pid, p] of Object.entries(persons)) {
    for (const rl of (p._rlog || [])) {
      if (filter !== 'all' && rl.result !== filter) continue;
      entries.push({ kind: 'person', name: p.name || pid, id: pid, rl });
    }
  }
  for (const [fid, f] of Object.entries(families)) {
    for (const rl of (f._rlog || [])) {
      if (filter !== 'all' && rl.result !== filter) continue;
      entries.push({ kind: 'family', name: 'Familie ' + _famDisplayName(fid), id: fid, rl });
    }
  }
  entries.sort((a, b) => (b.rl.date || '').localeCompare(a.rl.date || '') || 0);

  let md = `# Forschungsprotokoll — ${srcFile}\n\nExportiert: ${dateStr} · ${entries.length} Einträge\n\n---\n\n`;
  for (const { name, rl } of entries) {
    md += `## ${name}\n`;
    if (rl.date)    md += `**Datum:** ${rl.date}\n`;
    const repo = rl.repoRef && repos[rl.repoRef];
    const sour = rl.sourRef && sources[rl.sourRef];
    if (repo) md += `**Archiv:** ${repo.name || rl.repoRef}\n`;
    if (sour) md += `**Quelle:** ${sour.title || rl.sourRef}\n`;
    if (rl.query)  md += `**Suchbegriff:** ${rl.query}\n`;
    md += `**Ergebnis:** ${_resultLabel(rl.result)}\n`;
    if (rl.note)   md += `\n${rl.note}\n`;
    md += `\n`;
  }

  const blob = new Blob([md], { type: 'text/markdown; charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const safe = srcFile.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_\-äöüÄÖÜß]/g, '_');
  a.href     = url;
  a.download = `protokoll_${safe}_${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Markdown exportiert', 'success');
}

function _famDisplayName(famId) {
  const f = AppState.db.families?.[famId];
  if (!f) return famId;
  const h = f.husb ? AppState.db.individuals?.[f.husb]?.name : null;
  const w = f.wife ? AppState.db.individuals?.[f.wife]?.name : null;
  return [h, w].filter(Boolean).join(' & ') || famId;
}

