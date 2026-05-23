// ─────────────────────────────────────
//  DATEI-VERGLEICH UI
//  Lazy-loaded über openImportCompare()
// ─────────────────────────────────────

// ── Lazy-Load-Helfer ──────────────────────────────────────────────────────────

function _cmpLoadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src     = src;
    s.onload  = resolve;
    s.onerror = () => reject(new Error('Laden fehlgeschlagen: ' + src));
    document.head.appendChild(s);
  });
}

async function openImportCompare() {
  if (!AppState.db) { showToast('Keine Datei geladen', 'warn'); return; }
  closeModal('modalMenu');
  try {
    await _cmpLoadScript('compare-engine.js');
  } catch (err) {
    showToast('⚠ Modul konnte nicht geladen werden', 'error');
    return;
  }
  showImportCompare();
}

// ── Einstieg ──────────────────────────────────────────────────────────────────

function showImportCompare() {
  // State zurücksetzen
  _cmpState.db           = null;
  _cmpState.filename     = '';
  _cmpState.matches      = [];
  _cmpState.matchConfirm = {};
  _cmpState.selections   = {};
  _cmpState.importSourceId = null;

  _cmpRenderLoadPanel();
  openModal('modalImportCompare');
}

// ── Lade-Panel ────────────────────────────────────────────────────────────────

function _cmpRenderLoadPanel() {
  const body = document.getElementById('cmp-body');
  if (!body) return;
  body.innerHTML = `
    <div class="cmp-load-panel">
      <p class="cmp-load-hint">Wähle eine zweite GEDCOM- oder GRAMPS-Datei zum Vergleich mit der geladenen Datei.</p>
      <label class="btn btn-primary cmp-file-btn">
        📂 &nbsp; Vergleichsdatei wählen …
        <input type="file" id="cmpFileInput" accept=".ged,.gedcom,.gramps" style="display:none">
      </label>
    </div>`;
  document.getElementById('cmpFileInput').onchange = e => {
    const file = e.target.files?.[0];
    if (file) _cmpStartLoad(file);
  };
  const footer = document.getElementById('cmp-footer');
  if (footer) footer.innerHTML = `
    <button class="btn btn-cancel flex-1" data-action="closeModal" data-modal="modalImportCompare">Abbrechen</button>`;
}

async function _cmpStartLoad(file) {
  const body = document.getElementById('cmp-body');
  if (body) body.innerHTML = `<div class="cmp-load-panel"><p class="c-muted">Lade ${esc(file.name)} …</p><div class="cmp-progress"><div class="cmp-progress-bar" id="cmpProgressBar" style="width:0%"></div></div></div>`;

  const origProgress = typeof updateLoadingProgress === 'function' ? updateLoadingProgress : null;
  window.updateLoadingProgress = pct => {
    const bar = document.getElementById('cmpProgressBar');
    if (bar) bar.style.width = pct + '%';
  };

  try {
    await cmpLoadFile(file);
    if (origProgress) window.updateLoadingProgress = origProgress;
    _cmpRunMatching();
  } catch (err) {
    if (origProgress) window.updateLoadingProgress = origProgress;
    if (body) body.innerHTML = `<div class="cmp-load-panel"><p class="c-danger">⚠ Fehler: ${esc(err.message)}</p><button class="btn btn-sec" data-action="cmpRetryLoad">Erneut versuchen</button></div>`;
  }
}

function _cmpRunMatching() {
  const body = document.getElementById('cmp-body');
  if (body) body.innerHTML = `<div class="cmp-load-panel"><p class="c-muted">Personen werden abgeglichen …</p></div>`;

  // Matching in nächstem Frame starten, damit UI Update sichtbar wird
  setTimeout(() => {
    cmpMatchPersons();
    _cmpRenderMain();
  }, 30);
}

// ── Haupt-Layout ──────────────────────────────────────────────────────────────

function _cmpRenderMain() {
  const body = document.getElementById('cmp-body');
  if (!body) return;

  const st = cmpStats();
  body.innerHTML = `
    <div class="cmp-layout">
      <div class="cmp-list-panel">
        <div class="cmp-filter-bar" id="cmpFilterBar"></div>
        <div class="cmp-stats-bar" id="cmpStatsBar"></div>
        <div class="cmp-list" id="cmpList"></div>
      </div>
      <div class="cmp-diff-panel" id="cmpDiffPanel">
        <div class="cmp-diff-empty">← Person aus der Liste wählen</div>
      </div>
    </div>`;

  _cmpRenderFilterBar();
  _cmpRenderStatsBar(st);
  _cmpRenderList('all');
  _cmpUpdateFooter();
}

// ── Filter-Leiste ─────────────────────────────────────────────────────────────

const _CMP_FILTERS = [
  { key: 'all',       label: 'Alle' },
  { key: 'additions', label: 'Ergänzungen' },
  { key: 'conflicts', label: 'Konflikte' },
  { key: 'uncertain', label: 'Unsicher' },
  { key: 'new',       label: 'Neue' },
];

function _cmpRenderFilterBar() {
  const el = document.getElementById('cmpFilterBar');
  if (!el) return;
  el.innerHTML = _CMP_FILTERS.map(f =>
    `<button class="cmp-filter-btn${f.key === 'all' ? ' active' : ''}" data-action="cmpFilter" data-filter="${f.key}">${f.label}</button>`
  ).join('');
}

function _cmpRenderStatsBar(st) {
  const el = document.getElementById('cmpStatsBar');
  if (!el) return;
  el.innerHTML = `
    <span class="cmp-stat-chip cmp-chip-matched">✓ ${st.matched}</span>
    <span class="cmp-stat-chip cmp-chip-uncertain">? ${st.uncertain}</span>
    <span class="cmp-stat-chip cmp-chip-new">+ ${st.newP}</span>
    <span class="c-muted fs-08">in ${esc(_cmpState.filename)}</span>`;
}

// ── Personen-Liste ────────────────────────────────────────────────────────────

function _cmpRenderList(filter) {
  const el = document.getElementById('cmpList');
  if (!el) return;

  // Filter auf Matches anwenden
  let matches = _cmpState.matches;
  if (filter === 'additions' || filter === 'conflicts') {
    matches = matches.filter(m => {
      if (m.status === 'new') return false;
      const bid = _cmpResolvedBaseId(m);
      if (!bid) return false;
      const diff = cmpComputePersonDiff(bid, m.cmpId);
      if (!diff) return false;
      return filter === 'additions' ? diff.additions.length > 0 : diff.conflicts.length > 0;
    });
  } else if (filter === 'uncertain') {
    matches = matches.filter(m => m.status === 'uncertain');
  } else if (filter === 'new') {
    matches = matches.filter(m => m.status === 'new');
  }

  if (!matches.length) {
    el.innerHTML = '<div class="cmp-list-empty">Keine Einträge für diesen Filter</div>';
    return;
  }

  el.innerHTML = matches.map(m => {
    const cmpP = _cmpState.db.individuals[m.cmpId];
    if (!cmpP) return '';
    const name   = esc(cmpP.name || cmpP.id);
    const year   = _dedupYearFromGed(cmpP.birth?.date) || '';
    const status = m.status === 'matched'   ? '<span class="cmp-chip cmp-chip-matched">✓</span>'
                 : m.status === 'uncertain' ? '<span class="cmp-chip cmp-chip-uncertain">?</span>'
                 :                            '<span class="cmp-chip cmp-chip-new">+</span>';
    const sel   = _cmpState.selections[m.cmpId];
    const count = sel ? Object.values(sel).filter(v => v && v !== 'base' && !String(v).startsWith('__')).length : 0;
    const badge = count > 0 ? `<span class="cmp-sel-badge">${count}</span>` : '';
    return `<div class="cmp-list-item" data-action="cmpSelectPerson" data-cmpid="${m.cmpId}" data-active="false">
      ${status}
      <div class="cmp-list-name">${name}${year ? ` <span class="cmp-list-year">*${year}</span>` : ''}</div>
      ${badge}
    </div>`;
  }).join('');
}

// ── Diff-Detail ───────────────────────────────────────────────────────────────

function _cmpSelectPerson(cmpId) {
  _cmpState.activeCmpId = cmpId;
  // Aktiv-Markierung in Liste
  document.querySelectorAll('.cmp-list-item').forEach(el => {
    el.dataset.active = el.dataset.cmpid === cmpId ? 'true' : 'false';
  });
  _cmpRenderDiff(cmpId);
}

function _cmpRenderDiff(cmpId) {
  const panel = document.getElementById('cmpDiffPanel');
  if (!panel) return;

  const match = _cmpState.matches.find(m => m.cmpId === cmpId);
  if (!match) return;

  const cmpP = _cmpState.db.individuals[cmpId];

  // Neue Person (kein Base-Match)
  if (match.status === 'new' || (match.status === 'uncertain' && _cmpState.matchConfirm[cmpId] === null)) {
    panel.innerHTML = _cmpRenderNewPersonPanel(cmpId, match);
    _cmpUpdateFooter();
    return;
  }

  // Unsicherer Match — Bestätigungs-Panel, falls noch nicht entschieden
  if (match.status === 'uncertain' && _cmpState.matchConfirm[cmpId] === undefined) {
    panel.innerHTML = _cmpRenderConfirmPanel(cmpId, match);
    _cmpUpdateFooter();
    return;
  }

  const baseId = _cmpResolvedBaseId(match);
  if (!baseId) { panel.innerHTML = '<div class="cmp-diff-empty">Kein Match</div>'; return; }

  const diff = cmpComputePersonDiff(baseId, cmpId);
  if (!diff) return;
  cmpInitSelections(cmpId, diff);

  const baseP = AppState.db.individuals[baseId];
  const total = diff.additions.length + diff.conflicts.length;

  panel.innerHTML = `
    <div class="cmp-diff-header">
      <strong>${esc(cmpP.name || cmpId)}</strong>
      <span class="cmp-score-badge" title="${esc(match.reasons.join(', '))}">Score ${match.score}</span>
    </div>
    ${_cmpRenderIdenticalSection(diff, match, baseP)}
    ${_cmpRenderContextSection(diff)}
    <div class="cmp-diff-divider">── Basis für Match ↑ · Neue Daten ↓ ──</div>
    ${_cmpRenderAdditionsSection(diff, cmpId)}
    ${_cmpRenderConflictsSection(diff, cmpId)}
    ${total === 0 ? '<div class="cmp-no-delta">Keine Unterschiede — Datensatz ist identisch.</div>' : ''}`;

  _cmpUpdateFooter();
}

// ── Übereinstimmungen (eingeklappt bei sicherem Match) ────────────────────────

function _cmpRenderIdenticalSection(diff, match, baseP) {
  if (!diff.identical.length && match.status !== 'uncertain') return '';
  const expanded = match.status === 'uncertain'; // bei unsicherem Match aufklappen
  const rows = diff.identical.map(f =>
    `<tr><td class="cmp-td-label">${esc(f.label)}</td><td class="cmp-td-val cmp-match-val">✓ ${esc(f.value)}</td></tr>`
  ).join('');
  return `
    <details class="cmp-section-details" ${expanded ? 'open' : ''}>
      <summary class="cmp-section-title cmp-section-match">
        Übereinstimmungen <span class="cmp-count">(${diff.identical.length})</span>
      </summary>
      <table class="cmp-table">${rows}</table>
    </details>`;
}

// ── Eltern & Partner (Kontext) ────────────────────────────────────────────────

function _cmpRenderContextSection(diff) {
  const allRows = [...diff.parents, ...diff.partners];
  if (!allRows.length) return '';

  const _matchChip = status =>
    status === 'base'      ? '<span class="cmp-chip cmp-chip-matched cmp-chip-sm">✓</span>'
    : status === 'matched' ? '<span class="cmp-chip cmp-chip-matched cmp-chip-sm">✓</span>'
    : status === 'uncertain' ? '<span class="cmp-chip cmp-chip-uncertain cmp-chip-sm">?</span>'
    : status === 'new'     ? '<span class="cmp-chip cmp-chip-new cmp-chip-sm">+</span>'
    : '';

  const rows = allRows.map(r =>
    `<tr>
      <td class="cmp-td-label">${esc(r.label)}</td>
      <td class="cmp-td-val">${esc(r.baseVal)} ${_matchChip(r.baseStatus)}</td>
      <td class="cmp-td-val">${esc(r.cmpVal)}  ${_matchChip(r.cmpStatus)}</td>
    </tr>`
  ).join('');

  return `
    <details class="cmp-section-details" open>
      <summary class="cmp-section-title">Kontext</summary>
      <table class="cmp-table cmp-table-2col">
        <thead><tr><th></th><th class="cmp-th">Basis</th><th class="cmp-th">Import</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </details>`;
}

// ── Ergänzungen ───────────────────────────────────────────────────────────────

function _cmpRenderAdditionsSection(diff, cmpId) {
  if (!diff.additions.length) return '';
  const sel = _cmpState.selections[cmpId] || {};
  const rows = diff.additions.map(a => {
    const checked = sel[a.field] !== false ? 'checked' : '';
    return `<tr>
      <td class="cmp-td-check">
        <input type="checkbox" class="cmp-check" ${checked}
          data-action="cmpToggleAddition" data-cmpid="${cmpId}" data-field="${esc(a.field)}">
      </td>
      <td class="cmp-td-label">${esc(a.label)}</td>
      <td class="cmp-td-val cmp-add-val">${esc(a.value)}</td>
    </tr>`;
  }).join('');

  const allChecked = diff.additions.every(a => sel[a.field] !== false);
  return `
    <details class="cmp-section-details" open>
      <summary class="cmp-section-title cmp-section-add">
        Ergänzungen <span class="cmp-count">(${diff.additions.length})</span>
        <label class="cmp-all-check" onclick="event.stopPropagation()">
          <input type="checkbox" ${allChecked ? 'checked' : ''}
            data-action="cmpToggleAllAdditions" data-cmpid="${cmpId}"> alle
        </label>
      </summary>
      <table class="cmp-table">${rows}</table>
    </details>`;
}

// ── Konflikte ─────────────────────────────────────────────────────────────────

function _cmpRenderConflictsSection(diff, cmpId) {
  if (!diff.conflicts.length) return '';
  const sel = _cmpState.selections[cmpId] || {};
  const rows = diff.conflicts.map(c => {
    const cur = sel[c.field] || 'base';
    const _r = (val, key) => `
      <label class="cmp-radio-lbl ${cur === key ? 'cmp-radio-active' : ''}">
        <input type="radio" name="cmp-conflict-${esc(c.field)}-${cmpId}" value="${key}" ${cur === key ? 'checked' : ''}
          data-action="cmpConflictChoice" data-cmpid="${cmpId}" data-field="${esc(c.field)}" data-val="${key}">
        ${esc(val)}
      </label>`;
    return `<tr>
      <td class="cmp-td-label cmp-conflict-label">⚡ ${esc(c.label)}</td>
      <td class="cmp-td-conflict">
        ${_r(c.baseVal, 'base')}
        ${_r(c.cmpVal, 'import')}
        ${_r('Beide als Notiz', 'both')}
      </td>
    </tr>`;
  }).join('');

  return `
    <details class="cmp-section-details" open>
      <summary class="cmp-section-title cmp-section-conflict">
        Konflikte <span class="cmp-count">(${diff.conflicts.length})</span>
      </summary>
      <table class="cmp-table">${rows}</table>
    </details>`;
}

// ── Neue Person ───────────────────────────────────────────────────────────────

function _cmpRenderNewPersonPanel(cmpId, match) {
  const cmpP = _cmpState.db.individuals[cmpId];
  if (!cmpP) return '';
  const sel = _cmpState.selections[cmpId] || {};
  const checked = sel['__import_new'] === true;

  const fields = [
    ['Nachname', cmpP.surname], ['Vorname', cmpP.given], ['Geschlecht', cmpP.sex],
    ['Geburt', [cmpP.birth?.date, compactPlace(cmpP.birth?.place||'')].filter(Boolean).join(' · ')],
    ['Tod',    [cmpP.death?.date, compactPlace(cmpP.death?.place||'')].filter(Boolean).join(' · ')],
  ].filter(([, v]) => v);

  const parents  = _cmpGetParentInfos(cmpP, _cmpState.db);
  const partners = _cmpGetPartnerInfos(cmpP, _cmpState.db);

  return `
    <div class="cmp-diff-header">
      <span class="cmp-chip cmp-chip-new">+</span>
      <strong>${esc(cmpP.name || cmpId)}</strong>
      <span class="c-muted fs-08">Neue Person</span>
    </div>
    <table class="cmp-table">
      ${fields.map(([l, v]) => `<tr><td class="cmp-td-label">${esc(l)}</td><td class="cmp-td-val">${esc(v)}</td></tr>`).join('')}
      ${parents.length  ? `<tr><td class="cmp-td-label">Eltern</td><td class="cmp-td-val">${parents.map(p=>`${esc(p.name)} <span class="cmp-chip cmp-chip-${p.matchStatus||'new'} cmp-chip-sm">${p.matchStatus==='matched'?'✓':p.matchStatus==='uncertain'?'?':'+'}</span>`).join(', ')}</td></tr>` : ''}
      ${partners.length ? `<tr><td class="cmp-td-label">Partner</td><td class="cmp-td-val">${partners.map(p=>`${esc(p.name)} <span class="cmp-chip cmp-chip-${p.matchStatus||'new'} cmp-chip-sm">${p.matchStatus==='matched'?'✓':p.matchStatus==='uncertain'?'?':'+'}</span>`).join(', ')}</td></tr>` : ''}
    </table>
    <label class="cmp-import-new-lbl">
      <input type="checkbox" ${checked ? 'checked' : ''}
        data-action="cmpToggleImportNew" data-cmpid="${cmpId}">
      Person in Basisdatei importieren
    </label>`;
}

// ── Unsicherer Match — Bestätigungsanzeige ────────────────────────────────────

function _cmpRenderConfirmPanel(cmpId, match) {
  const baseP = AppState.db.individuals[match.baseId];
  const cmpP  = _cmpState.db.individuals[cmpId];
  if (!baseP || !cmpP) return '';

  const _row = (label, bVal, cVal) =>
    `<tr><td class="cmp-td-label">${esc(label)}</td>
      <td class="cmp-td-val">${esc(bVal||'–')}</td>
      <td class="cmp-td-val">${esc(cVal||'–')}</td>
    </tr>`;

  return `
    <div class="cmp-diff-header">
      <span class="cmp-chip cmp-chip-uncertain">?</span>
      <strong>Möglicher Match — Score ${match.score}</strong>
    </div>
    <p class="cmp-confirm-hint">Sind das dieselbe Person?</p>
    <table class="cmp-table cmp-table-2col">
      <thead><tr><th></th><th class="cmp-th">Basis</th><th class="cmp-th">Import</th></tr></thead>
      <tbody>
        ${_row('Nachname', baseP.surname, cmpP.surname)}
        ${_row('Vorname',  baseP.given,  cmpP.given)}
        ${_row('Geburt',   [baseP.birth?.date, compactPlace(baseP.birth?.place||'')].filter(Boolean).join(' · '),
                           [cmpP.birth?.date,  compactPlace(cmpP.birth?.place||'')].filter(Boolean).join(' · '))}
        ${_row('Tod',      [baseP.death?.date, compactPlace(baseP.death?.place||'')].filter(Boolean).join(' · '),
                           [cmpP.death?.date,  compactPlace(cmpP.death?.place||'')].filter(Boolean).join(' · '))}
        ${_row('Eltern',   _dedupParents ? _dedupParents(baseP) : '', _cmpGetParentInfos(cmpP, _cmpState.db).map(p=>p.name).join(', '))}
      </tbody>
    </table>
    <div class="cmp-confirm-btns">
      <button class="btn btn-primary" data-action="cmpConfirmMatch" data-cmpid="${cmpId}" data-baseid="${match.baseId}">
        ✓ Ja, gleiche Person
      </button>
      <button class="btn btn-dim" data-action="cmpRejectMatch" data-cmpid="${cmpId}">
        ✗ Verschiedene Personen
      </button>
    </div>`;
}

// ── Footer ────────────────────────────────────────────────────────────────────

function _cmpUpdateFooter() {
  const footer = document.getElementById('cmp-footer');
  if (!footer || !_cmpState.matches.length) return;

  // Zählen wie viele Selektionen aktiv sind
  let total = 0;
  for (const sel of Object.values(_cmpState.selections)) {
    for (const [k, v] of Object.entries(sel)) {
      if (!k.startsWith('__') && v && v !== 'base') total++;
    }
    if (sel['__import_new'] === true) total++;
  }

  footer.innerHTML = `
    <button class="btn btn-cancel" data-action="closeModal" data-modal="modalImportCompare">Abbrechen</button>
    <button class="btn btn-primary flex-1" data-action="cmpOpenSourceConfig" ${total === 0 ? 'disabled' : ''}>
      ${total > 0 ? `${total} Änderung${total === 1 ? '' : 'en'} übernehmen` : 'Übernehmen'}
    </button>`;
}

// ── Quelle konfigurieren & anwenden ───────────────────────────────────────────

function _cmpOpenSourceConfig() {
  const months  = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const d       = new Date();
  const dateStr = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;

  const el = document.getElementById('cmpSrcTitle');
  const de = document.getElementById('cmpSrcDate');
  const ne = document.getElementById('cmpSrcNote');
  if (el) el.value = `Import: ${_cmpState.filename}`;
  if (de) de.value = dateStr;
  if (ne) ne.value = '';
  openModal('modalImportSource');
}

function _cmpDoApply() {
  closeModal('modalImportSource');
  const title  = document.getElementById('cmpSrcTitle')?.value?.trim() || '';
  const date   = document.getElementById('cmpSrcDate')?.value?.trim() || '';
  const note   = document.getElementById('cmpSrcNote')?.value?.trim() || '';
  const create = document.getElementById('cmpSrcCreate')?.checked !== false;

  const count = cmpApplyPatch({ title, date, note, create });
  closeModal('modalImportCompare');
  showToast(`✓ ${count} Einträge übernommen`, 'success');
}

// ── Click-Handler (ins globale _CLICK_MAP eingehängt) ─────────────────────────

function _cmpHandleClick(action, el) {
  switch (action) {

    case 'cmpFilter': {
      const filter = el.dataset.filter || 'all';
      document.querySelectorAll('.cmp-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === filter));
      _cmpRenderList(filter);
      break;
    }

    case 'cmpRetryLoad':
      _cmpRenderLoadPanel();
      break;

    case 'cmpSelectPerson':
      _cmpSelectPerson(el.dataset.cmpid || el.closest('[data-cmpid]')?.dataset.cmpid);
      break;

    case 'cmpToggleAddition': {
      const { cmpid, field } = el.dataset;
      if (!_cmpState.selections[cmpid]) _cmpState.selections[cmpid] = {};
      _cmpState.selections[cmpid][field] = el.checked;
      _cmpUpdateFooter();
      _cmpRefreshListItem(cmpid);
      break;
    }

    case 'cmpToggleAllAdditions': {
      const cmpid = el.dataset.cmpid;
      const checked = el.checked;
      const match = _cmpState.matches.find(m => m.cmpId === cmpid);
      if (!match) break;
      const bid = _cmpResolvedBaseId(match);
      if (!bid) break;
      const diff = cmpComputePersonDiff(bid, cmpid);
      if (!diff) break;
      if (!_cmpState.selections[cmpid]) _cmpState.selections[cmpid] = {};
      for (const a of diff.additions) _cmpState.selections[cmpid][a.field] = checked;
      _cmpRenderDiff(cmpid);
      break;
    }

    case 'cmpConflictChoice': {
      const { cmpid, field, val } = el.dataset;
      if (!_cmpState.selections[cmpid]) _cmpState.selections[cmpid] = {};
      _cmpState.selections[cmpid][field] = val;
      // Radio-Styling aktualisieren
      el.closest('td')?.querySelectorAll('.cmp-radio-lbl').forEach(lbl => {
        lbl.classList.toggle('cmp-radio-active', lbl.querySelector('input')?.value === val);
      });
      _cmpUpdateFooter();
      _cmpRefreshListItem(cmpid);
      break;
    }

    case 'cmpToggleImportNew': {
      const cmpid = el.dataset.cmpid;
      if (!_cmpState.selections[cmpid]) _cmpState.selections[cmpid] = {};
      _cmpState.selections[cmpid]['__import_new'] = el.checked;
      _cmpUpdateFooter();
      _cmpRefreshListItem(cmpid);
      break;
    }

    case 'cmpConfirmMatch': {
      const { cmpid, baseid } = el.dataset;
      _cmpState.matchConfirm[cmpid] = baseid;
      const match = _cmpState.matches.find(m => m.cmpId === cmpid);
      if (match) match.status = 'matched';
      _cmpRenderDiff(cmpid);
      _cmpRefreshListItem(cmpid);
      break;
    }

    case 'cmpRejectMatch': {
      const cmpid = el.dataset.cmpid;
      _cmpState.matchConfirm[cmpid] = null;
      const match = _cmpState.matches.find(m => m.cmpId === cmpid);
      if (match) { match.status = 'new'; match.baseId = null; }
      _cmpRenderDiff(cmpid);
      _cmpRefreshListItem(cmpid);
      break;
    }

    case 'cmpOpenSourceConfig':
      _cmpOpenSourceConfig();
      break;

    case 'cmpDoApply':
      _cmpDoApply();
      break;
  }
}

// Aktualisiert nur einen Listen-Eintrag (Badge-Count) ohne komplettes Re-Render
function _cmpRefreshListItem(cmpid) {
  const item = document.querySelector(`.cmp-list-item[data-cmpid="${cmpid}"]`);
  if (!item) return;
  const sel   = _cmpState.selections[cmpid];
  const count = sel ? Object.entries(sel).filter(([k, v]) => !k.startsWith('__') && v && v !== 'base').length
                    + (sel['__import_new'] === true ? 1 : 0) : 0;
  let badge = item.querySelector('.cmp-sel-badge');
  if (count > 0) {
    if (!badge) { badge = document.createElement('span'); badge.className = 'cmp-sel-badge'; item.appendChild(badge); }
    badge.textContent = count;
  } else if (badge) {
    badge.remove();
  }
}
