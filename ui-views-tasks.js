// ─────────────────────────────────────
//  FORSCHUNGSAUFGABEN
// ─────────────────────────────────────
// Tasks leben auf p._tasks[] / f._tasks[] und werden mit GEDCOM/GRAMPS gespeichert.
// Kein separater IDB-Schlüssel — markChanged() löst den normalen Speicher-Flow aus.

const TASK_CATEGORIES = [
  { key: 'kirchenbuch', label: 'Kirchenbuch' },
  { key: 'urkunde',     label: 'Urkunde/Standesamt' },
  { key: 'online',      label: 'Online-Recherche' },
];

// ─── Personen-Tasks ───────────────────────────────────────────────────────────

function _getPersonTasks(personId) {
  const p = AppState.db.individuals[personId];
  if (!p) return [];
  if (!p._tasks) p._tasks = [];
  return p._tasks;
}

function _addTaskToDb(personId, text, category) {
  const p = AppState.db.individuals[personId];
  if (!p) return;
  if (!p._tasks) p._tasks = [];
  p._tasks.push({
    id:       _newTaskId(),
    text:     text.trim(),
    category: category || TASK_CATEGORIES[0].key,
    done:     false,
    created:  new Date().toISOString().slice(0, 10),
  });
  markChanged();
  _updateTasksBadge();
}

function _toggleTaskInDb(personId, taskId) {
  const tasks = _getPersonTasks(personId);
  const t = tasks.find(t => t.id === taskId);
  if (!t) return;
  t.done = !t.done;
  markChanged();
  _updateTasksBadge();
}

function _deleteTaskFromDb(personId, taskId) {
  const p = AppState.db.individuals[personId];
  if (!p?._tasks) return;
  p._tasks = p._tasks.filter(t => t.id !== taskId);
  markChanged();
  _updateTasksBadge();
}

// ─── Familien-Tasks ───────────────────────────────────────────────────────────

function _getFamTasks(famId) {
  const f = AppState.db.families[famId];
  if (!f) return [];
  if (!f._tasks) f._tasks = [];
  return f._tasks;
}

function _addFamTaskToDb(famId, text, category) {
  const f = AppState.db.families[famId];
  if (!f) return;
  if (!f._tasks) f._tasks = [];
  f._tasks.push({
    id:       _newTaskId(),
    text:     text.trim(),
    category: category || TASK_CATEGORIES[0].key,
    done:     false,
    created:  new Date().toISOString().slice(0, 10),
  });
  markChanged();
  _updateTasksBadge();
}

function _toggleFamTaskInDb(famId, taskId) {
  const tasks = _getFamTasks(famId);
  const t = tasks.find(t => t.id === taskId);
  if (!t) return;
  t.done = !t.done;
  markChanged();
  _updateTasksBadge();
}

function _deleteFamTaskFromDb(famId, taskId) {
  const f = AppState.db.families[famId];
  if (!f?._tasks) return;
  f._tasks = f._tasks.filter(t => t.id !== taskId);
  markChanged();
  _updateTasksBadge();
}

// ─── Badge ────────────────────────────────────────────────────────────────────

function _allOpenTasksCount() {
  let n = 0;
  for (const p of Object.values(AppState.db.individuals || {}))
    for (const t of (p._tasks || [])) if (!t.done) n++;
  for (const f of Object.values(AppState.db.families || {}))
    for (const t of (f._tasks || [])) if (!t.done) n++;
  return n;
}

function _updateTasksBadge() {
  const badge = document.getElementById('tasks-badge');
  if (!badge) return;
  const n = _allOpenTasksCount();
  badge.textContent = n > 99 ? '99+' : String(n);
  badge.style.display = n > 0 ? 'inline-flex' : 'none';
}

function _newTaskId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ─── Person-Detail: Tasks-Abschnitt (HTML-String) ────────────────────────────

function _tasksSectionHtml(personId) {
  const tasks    = _getPersonTasks(personId);
  const openCnt  = tasks.filter(t => !t.done).length;
  const catOrder = TASK_CATEGORIES.map(c => c.key);

  const byCat = {};
  for (const t of tasks) {
    if (!byCat[t.category]) byCat[t.category] = [];
    byCat[t.category].push(t);
  }
  const usedCats = Object.keys(byCat).sort((a, b) => {
    const ai = catOrder.indexOf(a), bi = catOrder.indexOf(b);
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
  });

  let html = `<div class="section fade-up" id="tasks-section-${personId}">
    <div class="section-head">
      <div class="section-title">Aufgaben${tasks.length
        ? ` <span class="tasks-open-cnt">(${openCnt} offen)</span>`
        : ''}</div>
      <button class="section-add" data-action="showAddTaskForm" data-pid="${personId}">+ Aufgabe</button>
    </div>`;

  for (const catKey of usedCats) {
    const catLabel = TASK_CATEGORIES.find(c => c.key === catKey)?.label || catKey;
    html += `<div class="tasks-cat-header">${esc(catLabel)}</div>`;
    for (const t of byCat[catKey]) {
      html += `<div class="task-row${t.done ? ' task-done' : ''}">
        <button class="task-check" data-action="toggleTask"
          data-pid="${personId}" data-tid="${t.id}"
          aria-label="${t.done ? 'Erledigt' : 'Offen'}">${t.done ? '☑' : '☐'}</button>
        <span class="task-text">${esc(t.text)}</span>
        <div class="task-actions">
          <button class="task-log" data-action="taskToLog"
            data-pid="${personId}" data-query="${encodeURIComponent(t.text)}" title="Als Protokoll erfassen">→</button>
          <button class="task-edit" data-action="editTask"
            data-pid="${personId}" data-tid="${t.id}" aria-label="Aufgabe bearbeiten">✎</button>
          <button class="task-del" data-action="deleteTask"
            data-pid="${personId}" data-tid="${t.id}" aria-label="Aufgabe löschen">×</button>
        </div>
      </div>`;
    }
  }

  if (!tasks.length) html += `<div class="tasks-empty">Keine Aufgaben</div>`;
  html += `</div>`;
  return html;
}

function _renderTasksSectionAsync(personId) {
  const ph = document.getElementById('tasks-section-placeholder-' + personId);
  if (!ph) return;
  ph.outerHTML = _tasksSectionHtml(personId);
}

function _refreshTasksSection(personId) {
  const sec = document.getElementById('tasks-section-' + personId);
  if (!sec) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = _tasksSectionHtml(personId);
  sec.replaceWith(tmp.firstElementChild);
}

// ─── Familie-Detail: Tasks-Abschnitt (HTML-String) ───────────────────────────

function _famTasksSectionHtml(famId) {
  const tasks    = _getFamTasks(famId);
  const openCnt  = tasks.filter(t => !t.done).length;
  const catOrder = TASK_CATEGORIES.map(c => c.key);

  const byCat = {};
  for (const t of tasks) {
    if (!byCat[t.category]) byCat[t.category] = [];
    byCat[t.category].push(t);
  }
  const usedCats = Object.keys(byCat).sort((a, b) => {
    const ai = catOrder.indexOf(a), bi = catOrder.indexOf(b);
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
  });

  let html = `<div class="section fade-up" id="fam-tasks-section-${famId}">
    <div class="section-head">
      <div class="section-title">Aufgaben${tasks.length
        ? ` <span class="tasks-open-cnt">(${openCnt} offen)</span>`
        : ''}</div>
      <button class="section-add" data-action="showAddFamTaskForm" data-fid="${famId}">+ Aufgabe</button>
    </div>`;

  for (const catKey of usedCats) {
    const catLabel = TASK_CATEGORIES.find(c => c.key === catKey)?.label || catKey;
    html += `<div class="tasks-cat-header">${esc(catLabel)}</div>`;
    for (const t of byCat[catKey]) {
      html += `<div class="task-row${t.done ? ' task-done' : ''}">
        <button class="task-check" data-action="toggleFamTask"
          data-fid="${famId}" data-tid="${t.id}"
          aria-label="${t.done ? 'Erledigt' : 'Offen'}">${t.done ? '☑' : '☐'}</button>
        <span class="task-text">${esc(t.text)}</span>
        <div class="task-actions">
          <button class="task-log" data-action="taskToLog"
            data-fid="${famId}" data-query="${encodeURIComponent(t.text)}" title="Als Protokoll erfassen">→</button>
          <button class="task-edit" data-action="editFamTask"
            data-fid="${famId}" data-tid="${t.id}" aria-label="Aufgabe bearbeiten">✎</button>
          <button class="task-del" data-action="deleteFamTask"
            data-fid="${famId}" data-tid="${t.id}" aria-label="Aufgabe löschen">×</button>
        </div>
      </div>`;
    }
  }

  if (!tasks.length) html += `<div class="tasks-empty">Keine Aufgaben</div>`;
  html += `</div>`;
  return html;
}

function _refreshFamTasksSection(famId) {
  const sec = document.getElementById('fam-tasks-section-' + famId);
  if (!sec) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = _famTasksSectionHtml(famId);
  sec.replaceWith(tmp.firstElementChild);
}

// ─── Aufgabe hinzufügen/bearbeiten — Modal ───────────────────────────────────

let _addTaskPersonId = null;
let _addTaskFamId    = null; // gesetzt wenn Familien-Kontext
let _editTaskId      = null; // null = Hinzufügen-Modus

function showAddTaskForm(personId) {
  _addTaskPersonId = personId;
  _addTaskFamId    = null;
  _editTaskId      = null;
  _openAddTaskModal('Aufgabe hinzufügen', '', TASK_CATEGORIES[0].key);
}

function showAddFamTaskForm(famId) {
  _addTaskPersonId = null;
  _addTaskFamId    = famId;
  _editTaskId      = null;
  _openAddTaskModal('Aufgabe hinzufügen', '', TASK_CATEGORIES[0].key);
}

function showEditTaskForm(personId, taskId) {
  const t = _getPersonTasks(personId).find(t => t.id === taskId);
  if (!t) return;
  _addTaskPersonId = personId;
  _addTaskFamId    = null;
  _editTaskId      = taskId;
  _openAddTaskModal('Aufgabe bearbeiten', t.text, t.category);
}

function showEditFamTaskForm(famId, taskId) {
  const t = _getFamTasks(famId).find(t => t.id === taskId);
  if (!t) return;
  _addTaskPersonId = null;
  _addTaskFamId    = famId;
  _editTaskId      = taskId;
  _openAddTaskModal('Aufgabe bearbeiten', t.text, t.category);
}

function _openAddTaskModal(title, text, category) {
  const sel = document.getElementById('addTaskCategory');
  if (sel) {
    sel.innerHTML = TASK_CATEGORIES.map(c => `<option value="${c.key}">${esc(c.label)}</option>`).join('');
    sel.value = category;
  }
  const inp = document.getElementById('addTaskText');
  if (inp) inp.value = text;
  const titleEl = document.querySelector('#modalAddTask .sheet-title');
  if (titleEl) titleEl.textContent = title;
  openModal('modalAddTask');
  setTimeout(() => inp?.focus(), 80);
}

function _saveAddTask() {
  const text = document.getElementById('addTaskText')?.value || '';
  const cat  = document.getElementById('addTaskCategory')?.value || TASK_CATEGORIES[0].key;
  if (!text.trim()) { showToast('Bitte Aufgabe eingeben', 'warn'); return; }
  closeModal('modalAddTask');

  if (_addTaskFamId) {
    // Familien-Kontext
    if (_editTaskId) {
      const t = _getFamTasks(_addTaskFamId).find(t => t.id === _editTaskId);
      if (t) { t.text = text.trim(); t.category = cat; markChanged(); }
      showToast('Aufgabe aktualisiert', 'success');
    } else {
      _addFamTaskToDb(_addTaskFamId, text, cat);
      showToast('Aufgabe gespeichert', 'success');
    }
    _refreshFamTasksSection(_addTaskFamId);
  } else {
    // Personen-Kontext
    if (_editTaskId) {
      const t = _getPersonTasks(_addTaskPersonId).find(t => t.id === _editTaskId);
      if (t) { t.text = text.trim(); t.category = cat; markChanged(); }
      showToast('Aufgabe aktualisiert', 'success');
    } else {
      _addTaskToDb(_addTaskPersonId, text, cat);
      showToast('Aufgabe gespeichert', 'success');
    }
    _refreshTasksSection(_addTaskPersonId);
  }
  _editTaskId = null;
  if (AppState.currentTab === 'tasks') renderTasksView();
}

// ─── Globale Aufgabenliste (eigener Tab) ─────────────────────────────────────

let _tasksViewFilter   = 'open';
let _tasksViewMode     = 'tasks'; // 'tasks' | 'log'
let _validationResults = null;

window.clearValidationResults = function () { _validationResults = null; };

function switchTasksMode(mode) {
  _tasksViewMode = mode;
  renderTasksView();
}

function switchTasksFilter(f) {
  _tasksViewFilter = f;
  ['all', 'open', 'done'].forEach(k => {
    document.getElementById('tasks-filter-' + k)?.classList.toggle('active', k === f);
  });
  renderTasksView();
}

function renderTasksView() {
  if (_tasksViewMode === 'log') { _renderRlogView(); return; }
  const container = document.getElementById('tasksList');
  if (!container) return;

  const persons  = AppState.db.individuals || {};
  const families = AppState.db.families    || {};
  const catOrder = TASK_CATEGORIES.map(c => c.key);

  // Personen-Tasks nach Kategorie
  const byCat = {};
  for (const [pid, p] of Object.entries(persons)) {
    for (const t of (p._tasks || [])) {
      if (_tasksViewFilter === 'open' && t.done)  continue;
      if (_tasksViewFilter === 'done' && !t.done) continue;
      if (!byCat[t.category]) byCat[t.category] = [];
      byCat[t.category].push({ kind: 'person', entity: p, id: pid, t });
    }
  }
  // Familien-Tasks nach Kategorie
  for (const [fid, f] of Object.entries(families)) {
    for (const t of (f._tasks || [])) {
      if (_tasksViewFilter === 'open' && t.done)  continue;
      if (_tasksViewFilter === 'done' && !t.done) continue;
      if (!byCat[t.category]) byCat[t.category] = [];
      byCat[t.category].push({ kind: 'family', entity: f, id: fid, t });
    }
  }

  const usedCats = Object.keys(byCat).sort((a, b) => {
    const ai = catOrder.indexOf(a), bi = catOrder.indexOf(b);
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
  });
  const totalVisible = Object.values(byCat).reduce((s, arr) => s + arr.length, 0);

  let html = `<div class="tasks-sticky-header">
    <div class="tab-bar">
      <button class="tab-btn${_tasksViewMode === 'tasks' ? ' active' : ''}" data-action="switchTasksMode" data-mode="tasks">Aufgaben</button>
      <button class="tab-btn${_tasksViewMode === 'log'   ? ' active' : ''}" data-action="switchTasksMode" data-mode="log">Protokoll</button>
    </div>
    <div class="filter-action-bar">
      <div class="filter-chips">
        <button id="tasks-filter-all"  class="flt-btn${_tasksViewFilter === 'all'  ? ' active' : ''}" data-action="switchTasksFilter" data-filter="all"  title="Alle Aufgaben">≡</button>
        <button id="tasks-filter-open" class="flt-btn${_tasksViewFilter === 'open' ? ' active' : ''}" data-action="switchTasksFilter" data-filter="open" title="Offen">○</button>
        <button id="tasks-filter-done" class="flt-btn${_tasksViewFilter === 'done' ? ' active' : ''}" data-action="switchTasksFilter" data-filter="done" title="Erledigt">✓</button>
      </div>
      <div class="action-btns">
        <button class="act-btn-text" data-action="runValidation" title="Daten prüfen">Prüfen</button>
        <button class="act-btn-icon" data-action="openValConfig" title="Prüfregeln konfigurieren">⚙</button>
        <button class="act-btn-icon" data-action="exportTasksMd" title="Als Markdown exportieren">↓</button>
      </div>
    </div>
  </div>`;

  html += _renderValidationPanel();

  if (!totalVisible) {
    const msg = _tasksViewFilter === 'open' ? 'Keine offenen Aufgaben'
              : _tasksViewFilter === 'done' ? 'Keine erledigten Aufgaben'
              : 'Keine Aufgaben vorhanden';
    html += `<div class="tasks-list-empty">${msg}</div>`;
    container.innerHTML = html;
    return;
  }

  for (const catKey of usedCats) {
    const catLabel = TASK_CATEGORIES.find(c => c.key === catKey)?.label || catKey;
    html += `<div class="tasks-cat-header">${esc(catLabel)}</div>`;

    const entries = byCat[catKey].sort((a, b) => {
      const na = a.kind === 'person'
        ? (a.entity?.surname || a.entity?.name || '')
        : (_famDisplayName(a.id));
      const nb = b.kind === 'person'
        ? (b.entity?.surname || b.entity?.name || '')
        : (_famDisplayName(b.id));
      return na.localeCompare(nb, 'de');
    });

    let lastKey = null;
    for (const { kind, entity, id, t } of entries) {
      const rowKey = kind + ':' + id;
      if (rowKey !== lastKey) {
        if (kind === 'person') {
          html += `<div class="tasks-person-header" data-action="showDetail" data-pid="${id}">${esc(entity?.name || id)} ›</div>`;
        } else {
          html += `<div class="tasks-person-header" data-action="showFamilyDetail" data-fid="${id}">Familie: ${esc(_famDisplayName(id))} ›</div>`;
        }
        lastKey = rowKey;
      }
      if (kind === 'person') {
        html += `<div class="task-row${t.done ? ' task-done' : ''} task-row-global">
          <button class="task-check" data-action="toggleTask"
            data-pid="${id}" data-tid="${t.id}"
            aria-label="${t.done ? 'Erledigt' : 'Offen'}">${t.done ? '☑' : '☐'}</button>
          <span class="task-text">${esc(t.text)}</span>
          <div class="task-actions">
            <button class="task-log" data-action="taskToLog"
              data-pid="${id}" data-query="${encodeURIComponent(t.text)}" title="Als Protokoll erfassen">→</button>
            <button class="task-edit" data-action="editTask"
              data-pid="${id}" data-tid="${t.id}" aria-label="Aufgabe bearbeiten">✎</button>
            <button class="task-del" data-action="deleteTask"
              data-pid="${id}" data-tid="${t.id}" aria-label="Aufgabe löschen">×</button>
          </div>
        </div>`;
      } else {
        html += `<div class="task-row${t.done ? ' task-done' : ''} task-row-global">
          <button class="task-check" data-action="toggleFamTask"
            data-fid="${id}" data-tid="${t.id}"
            aria-label="${t.done ? 'Erledigt' : 'Offen'}">${t.done ? '☑' : '☐'}</button>
          <span class="task-text">${esc(t.text)}</span>
          <div class="task-actions">
            <button class="task-log" data-action="taskToLog"
              data-fid="${id}" data-query="${encodeURIComponent(t.text)}" title="Als Protokoll erfassen">→</button>
            <button class="task-edit" data-action="editFamTask"
              data-fid="${id}" data-tid="${t.id}" aria-label="Aufgabe bearbeiten">✎</button>
            <button class="task-del" data-action="deleteFamTask"
              data-fid="${id}" data-tid="${t.id}" aria-label="Aufgabe löschen">×</button>
          </div>
        </div>`;
      }
    }
  }

  container.innerHTML = html;
}

// ─── Markdown-Export ──────────────────────────────────────────────────────────

function exportTasksMd() {
  const db       = AppState.db;
  const persons  = db.individuals || {};
  const families = db.families    || {};
  const catOrder = TASK_CATEGORIES.map(c => c.key);
  const filter   = _tasksViewFilter;

  const byCat = {};
  for (const [pid, p] of Object.entries(persons)) {
    for (const t of (p._tasks || [])) {
      if (filter === 'open' && t.done)  continue;
      if (filter === 'done' && !t.done) continue;
      if (!byCat[t.category]) byCat[t.category] = [];
      byCat[t.category].push({ kind: 'person', entity: p, id: pid, t });
    }
  }
  for (const [fid, f] of Object.entries(families)) {
    for (const t of (f._tasks || [])) {
      if (filter === 'open' && t.done)  continue;
      if (filter === 'done' && !t.done) continue;
      if (!byCat[t.category]) byCat[t.category] = [];
      byCat[t.category].push({ kind: 'family', entity: f, id: fid, t });
    }
  }

  const usedCats = Object.keys(byCat).sort((a, b) => {
    const ai = catOrder.indexOf(a), bi = catOrder.indexOf(b);
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
  });
  const total       = Object.values(byCat).reduce((s, arr) => s + arr.length, 0);
  const filterLabel = filter === 'open' ? 'Offen' : filter === 'done' ? 'Erledigt' : 'Alle';
  const dateStr     = new Date().toLocaleDateString('de-DE');
  const srcFile     = localStorage.getItem('stammbaum_filename') || 'Stammbaum';

  function _lifeStr(p) {
    const parts = [];
    if (p.birth?.date || p.birth?.place)
      parts.push('* ' + [p.birth.date, compactPlace(p.birth.place)].filter(Boolean).join(', '));
    if (p.death?.date || p.death?.place)
      parts.push('† ' + [p.death.date, compactPlace(p.death.place)].filter(Boolean).join(', '));
    return parts.join('  ');
  }

  function _personBlock(pid, p) {
    const lines = [];
    const fullName = [p.prefix, p.name, p.suffix].filter(Boolean).join(' ') || pid;
    const sexLabel = p.sex === 'M' ? ' [m]' : p.sex === 'F' ? ' [w]' : '';
    lines.push(`### Person: ${fullName} (${pid})${sexLabel}`);
    const life = _lifeStr(p);
    if (life) lines.push(life);
    const fref0 = (p.famc || [])[0];
    if (fref0) {
      const fam = families[fref0.famId];
      if (fam) {
        const hName = fam.husb ? (persons[fam.husb]?.name || fam.husb) : null;
        const wName = fam.wife ? (persons[fam.wife]?.name || fam.wife) : null;
        const parents = [hName, wName].filter(Boolean).join(' & ');
        if (parents) lines.push(`Eltern: ${parents} (${fref0.famId})`);
      }
    }
    for (const famId of (p.fams || [])) {
      const fam = families[famId];
      if (!fam) continue;
      const partnerId = p.sex === 'M' ? fam.wife : fam.husb;
      const partnerName = partnerId ? (persons[partnerId]?.name || partnerId) : '–';
      const year = fam.marr?.date?.match(/\d{4}/)?.[0] || '';
      lines.push(`Ehe: ${partnerName}${year ? ' (' + year + ')' : ''} (${famId})`);
    }
    return lines;
  }

  function _familyBlock(fid, f) {
    const lines = [];
    const hPerson = f.husb ? persons[f.husb] : null;
    const wPerson = f.wife ? persons[f.wife] : null;
    const hName = hPerson?.name || f.husb || '–';
    const wName = wPerson?.name || f.wife || '–';
    lines.push(`### Familie: ${hName} & ${wName} (${fid})`);
    const marrParts = [f.marr?.date, f.marr?.place ? compactPlace(f.marr.place) : ''].filter(Boolean);
    if (marrParts.length) lines.push(`Heirat: ${marrParts.join(', ')}`);
    if (hPerson) { const l = _lifeStr(hPerson); if (l) lines.push(`Ehemann: ${hName}  ${l}`); }
    if (wPerson) { const l = _lifeStr(wPerson); if (l) lines.push(`Ehefrau: ${wName}  ${l}`); }
    const n = (f.children || []).length;
    if (n) lines.push(`${n} ${n === 1 ? 'Kind' : 'Kinder'}`);
    return lines;
  }

  let md = `# Forschungsaufgaben — ${srcFile}\n\n`;
  md += `Exportiert: ${dateStr} · Filter: ${filterLabel} · ${total} Aufgabe${total !== 1 ? 'n' : ''}\n\n---\n\n`;

  for (const catKey of usedCats) {
    const catLabel = TASK_CATEGORIES.find(c => c.key === catKey)?.label || catKey;
    md += `## ${catLabel}\n\n`;

    const entries = byCat[catKey].sort((a, b) => {
      const na = a.kind === 'person' ? (a.entity?.surname || a.entity?.name || '') : _famDisplayName(a.id);
      const nb = b.kind === 'person' ? (b.entity?.surname || b.entity?.name || '') : _famDisplayName(b.id);
      return na.localeCompare(nb, 'de');
    });

    let lastKey = null;
    let blockLines = null;
    const flush = () => { if (blockLines) { md += blockLines.join('\n') + '\n\n'; blockLines = null; } };

    for (const { kind, id, entity, t } of entries) {
      const key = kind + ':' + id;
      if (key !== lastKey) {
        flush();
        blockLines = kind === 'person' ? _personBlock(id, entity) : _familyBlock(id, entity);
        blockLines.push('');
        lastKey = key;
      }
      blockLines.push(`- [${t.done ? 'x' : ' '}] ${t.text}`);
    }
    flush();
  }

  const blob    = new Blob([md], { type: 'text/markdown; charset=utf-8' });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement('a');
  const safeSrc = srcFile.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_\-äöüÄÖÜß]/g, '_');
  a.href        = url;
  a.download    = `aufgaben_${safeSrc}_${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Markdown exportiert', 'success');
}

// ─── Click-Handler ────────────────────────────────────────────────────────────

function _handleToggleTask(el) {
  const { pid, tid } = el.dataset;
  _toggleTaskInDb(pid, tid);
  _refreshTasksSection(pid);
  if (AppState.currentTab === 'tasks') renderTasksView();
}

function _handleEditTask(el) {
  showEditTaskForm(el.dataset.pid, el.dataset.tid);
}

function _handleDeleteTask(el) {
  const { pid, tid } = el.dataset;
  _deleteTaskFromDb(pid, tid);
  _refreshTasksSection(pid);
  if (AppState.currentTab === 'tasks') renderTasksView();
}

function _handleToggleFamTask(el) {
  const { fid, tid } = el.dataset;
  _toggleFamTaskInDb(fid, tid);
  _refreshFamTasksSection(fid);
  if (AppState.currentTab === 'tasks') renderTasksView();
}

function _handleEditFamTask(el) {
  showEditFamTaskForm(el.dataset.fid, el.dataset.tid);
}

function _handleDeleteFamTask(el) {
  const { fid, tid } = el.dataset;
  _deleteFamTaskFromDb(fid, tid);
  _refreshFamTasksSection(fid);
  if (AppState.currentTab === 'tasks') renderTasksView();
}

