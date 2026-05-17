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
    <div class="tasks-mode-bar">
      <button class="tasks-mode-btn${_tasksViewMode === 'tasks' ? ' active' : ''}" data-action="switchTasksMode" data-mode="tasks">Aufgaben</button>
      <button class="tasks-mode-btn${_tasksViewMode === 'log'   ? ' active' : ''}" data-action="switchTasksMode" data-mode="log">Protokoll</button>
    </div>
    <div class="tasks-filter-bar">
      <button id="tasks-filter-all"  class="seg-btn${_tasksViewFilter === 'all'  ? ' active' : ''}" data-action="switchTasksFilter" data-filter="all">Alle</button>
      <button id="tasks-filter-open" class="seg-btn${_tasksViewFilter === 'open' ? ' active' : ''}" data-action="switchTasksFilter" data-filter="open">Offen</button>
      <button id="tasks-filter-done" class="seg-btn${_tasksViewFilter === 'done' ? ' active' : ''}" data-action="switchTasksFilter" data-filter="done">Erledigt</button>
    </div>
    <div class="tasks-validate-bar">
      <button class="tasks-validate-bar-btn" data-action="runValidation">✓ Daten prüfen</button>
      <button class="tasks-validate-cfg-btn" data-action="openValConfig" title="Prüfregeln konfigurieren">⚙</button>
      <button class="tasks-validate-cfg-btn" data-action="exportTasksMd" title="Als Markdown exportieren">↓ MD</button>
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

function switchRlogFilter(f) {
  _rlogViewFilter = f;
  ['all', 'found', 'partial', 'not-found', 'pending'].forEach(k => {
    document.getElementById('rlog-filter-' + k)?.classList.toggle('active', k === f);
  });
  _renderRlogView();
}

function _renderRlogView() {
  const container = document.getElementById('tasksList');
  if (!container) return;
  const db = AppState.db;

  const entries = [];
  for (const [pid, p] of Object.entries(db.individuals || {})) {
    for (let i = 0; i < (p._rlog || []).length; i++) {
      const rl = p._rlog[i];
      if (_rlogViewFilter !== 'all' && rl.result !== _rlogViewFilter) continue;
      entries.push({ kind: 'person', entity: p, id: pid, rl, idx: i });
    }
  }
  for (const [fid, f] of Object.entries(db.families || {})) {
    for (let i = 0; i < (f._rlog || []).length; i++) {
      const rl = f._rlog[i];
      if (_rlogViewFilter !== 'all' && rl.result !== _rlogViewFilter) continue;
      entries.push({ kind: 'family', entity: f, id: fid, rl, idx: i });
    }
  }
  // Neueste zuerst (nach Datum, dann Einfügereihenfolge)
  entries.sort((a, b) => (b.rl.date || '').localeCompare(a.rl.date || '') || 0);

  const filterBtns = [
    { k: 'all',       l: 'Alle' },
    { k: 'found',     l: 'Gefunden' },
    { k: 'partial',   l: 'Teilweise' },
    { k: 'not-found', l: 'Nicht gefunden' },
    { k: 'pending',   l: 'Ausstehend' },
  ].map(b => `<button id="rlog-filter-${b.k}" class="seg-btn${_rlogViewFilter === b.k ? ' active' : ''}"
    data-action="switchRlogFilter" data-filter="${b.k}">${esc(b.l)}</button>`).join('');

  const modeBar = `<div class="tasks-mode-bar">
    <button class="tasks-mode-btn${_tasksViewMode === 'tasks' ? ' active' : ''}" data-action="switchTasksMode" data-mode="tasks">Aufgaben</button>
    <button class="tasks-mode-btn${_tasksViewMode === 'log'   ? ' active' : ''}" data-action="switchTasksMode" data-mode="log">Protokoll</button>
  </div>`;

  let html = `<div class="tasks-sticky-header">
    ${modeBar}
    <div class="rlog-filter-bar">
      ${filterBtns}
      <button class="rlog-export-btn" data-action="exportRlogMd">↓ MD</button>
    </div>
  </div>`;

  if (!entries.length) {
    html += `<div class="tasks-list-empty">Keine Einträge</div>`;
    container.innerHTML = html;
    return;
  }

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

// ─── Validierungs-Config (IDB) ────────────────────────────────────────────────

let _valConfig = null; // null = noch nicht geladen

async function _loadValConfig() {
  if (_valConfig) return _valConfig;
  const stored = await idbGet('val_config').catch(() => null);
  if (stored) {
    _valConfig = {
      disabled:   new Set(stored.disabled || []),
      thresholds: { ...VAL_CONFIG_DEFAULTS.thresholds, ...(stored.thresholds || {}) },
    };
  } else {
    _valConfig = {
      disabled:   new Set(),
      thresholds: { ...VAL_CONFIG_DEFAULTS.thresholds },
    };
  }
  return _valConfig;
}

async function _saveValConfig(cfg) {
  _valConfig = cfg;
  await idbPut('val_config', {
    disabled:   [...cfg.disabled],
    thresholds: { ...cfg.thresholds },
  }).catch(() => null);
}

// ─── Validierungspanel ────────────────────────────────────────────────────────

const _VAL_SEVERITY_ICON  = { error: '✗', warn: '⚠', info: 'ℹ' };
const _VAL_SEVERITY_LABEL = { error: 'Fehler', warn: 'Warnungen', info: 'Hinweise' };

async function _handleRunValidation() {
  const db = AppState.db;
  if (!db?.individuals) { showToast('Keine Daten geladen', 'warn'); return; }
  const cfg = await _loadValConfig();
  const raw = runValidation(db, cfg);
  // Befunde herausfiltern, für die bereits eine Task mit gleichem Text existiert
  _validationResults = raw.filter(r => {
    const tasks = r.personId ? (db.individuals[r.personId]?._tasks || []) : [];
    return !tasks.some(t => t.text === r.text);
  });
  renderTasksView();
  const n = _validationResults.length;
  showToast(n === 0 ? 'Keine Befunde' : `${n} Befund${n === 1 ? '' : 'e'}`, n === 0 ? 'success' : 'info');
}

function _handlePromoteToTask(el) {
  const { pid, text, cat } = el.dataset;
  if (!pid || !text) return;
  _addTaskToDb(pid, decodeURIComponent(text), cat || 'online');
  if (_validationResults) {
    _validationResults = _validationResults.filter(
      r => !(r.personId === pid && r.text === decodeURIComponent(text))
    );
  }
  renderTasksView();
  _refreshTasksSection(pid);
}

function _renderValidationPanel() {
  if (!_validationResults) return '';
  const results    = _validationResults;
  const dismissBtn = '<button class="val-dismiss" data-action="dismissValidation" title="Hinweise ausblenden">✕ Ausblenden</button>';
  if (!results.length) return `<div class="val-empty">Keine Befunde — Daten sehen gut aus. ${dismissBtn}</div>`;

  const bySeverity = { error: [], warn: [], info: [] };
  for (const r of results) (bySeverity[r.severity] || bySeverity.info).push(r);

  let html = `<div class="val-panel"><div class="val-panel-header">${dismissBtn}</div>`;
  for (const sev of ['error', 'warn', 'info']) {
    const list = bySeverity[sev];
    if (!list.length) continue;
    html += `<div class="val-group-header val-sev-${sev}">${_VAL_SEVERITY_ICON[sev]} ${_VAL_SEVERITY_LABEL[sev]} (${list.length})</div>`;
    for (const r of list) {
      const p     = AppState.db.individuals[r.personId];
      const pname = esc(p?.name || r.personId);
      const textEnc = encodeURIComponent(r.text);
      let famLink = '';
      if (r.familyId) {
        const fname = esc(_famDisplayName(r.familyId));
        famLink = ` <span class="val-fam-link" data-action="showFamilyDetail" data-fid="${r.familyId}">${fname} ›</span>`;
      }
      html += `<div class="val-row val-sev-${sev}">
        <span class="val-icon">${_VAL_SEVERITY_ICON[r.severity]}</span>
        <span class="val-person" data-action="showDetail" data-pid="${r.personId}">${pname}</span>
        ${famLink}
        <span class="val-text">${esc(r.text)}</span>
        <button class="val-promote" data-action="promoteToTask"
          data-pid="${r.personId}" data-text="${textEnc}" data-cat="${r.category}"
          title="Als Aufgabe anlegen">+</button>
      </div>`;
    }
  }
  html += '</div>';
  return html;
}

// ─── VAL-CONFIG Modal ─────────────────────────────────────────────────────────

async function openValConfig() {
  const cfg = await _loadValConfig();
  // Regeln
  for (const rule of VAL_RULES) {
    const cb = document.getElementById('valcfg-rule-' + rule.key);
    if (cb) cb.checked = !cfg.disabled.has(rule.key);
  }
  // Schwellenwerte
  for (const [key, val] of Object.entries(cfg.thresholds)) {
    const inp = document.getElementById('valcfg-thr-' + key);
    if (inp) inp.value = val;
  }
  openModal('modalValConfig');
}

async function saveValConfig() {
  const disabled   = new Set();
  const thresholds = { ...VAL_CONFIG_DEFAULTS.thresholds };

  for (const rule of VAL_RULES) {
    const cb = document.getElementById('valcfg-rule-' + rule.key);
    if (cb && !cb.checked) disabled.add(rule.key);
  }
  for (const key of Object.keys(thresholds)) {
    const inp = document.getElementById('valcfg-thr-' + key);
    if (inp) {
      const v = parseInt(inp.value);
      if (!isNaN(v) && v > 0) thresholds[key] = v;
    }
  }

  await _saveValConfig({ disabled, thresholds });
  _validationResults = null; // nächste Prüfung läuft mit neuer Config
  closeModal('modalValConfig');
  showToast('Prüfregeln gespeichert', 'success');
}

async function resetValConfig() {
  await _saveValConfig({
    disabled:   new Set(),
    thresholds: { ...VAL_CONFIG_DEFAULTS.thresholds },
  });
  _valConfig = null; // force reload
  _validationResults = null;
  closeModal('modalValConfig');
  showToast('Prüfregeln zurückgesetzt', 'success');
}

// ─── Startup-Badge ────────────────────────────────────────────────────────────

window.addEventListener('load', () => {
  setTimeout(_updateTasksBadge, 800);
});
