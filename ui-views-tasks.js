// ─────────────────────────────────────
//  FORSCHUNGSAUFGABEN
// ─────────────────────────────────────
// Tasks leben auf p._tasks[] (Person-Objekt) und werden mit GEDCOM/GRAMPS gespeichert.
// Kein separater IDB-Schlüssel — markChanged() löst den normalen Speicher-Flow aus.

const TASK_CATEGORIES = [
  { key: 'kirchenbuch', label: 'Kirchenbuch' },
  { key: 'urkunde',     label: 'Urkunde/Standesamt' },
  { key: 'online',      label: 'Online-Recherche' },
];

function _getPersonTasks(personId) {
  const p = AppState.db.individuals[personId];
  if (!p) return [];
  if (!p._tasks) p._tasks = [];
  return p._tasks;
}

function _allOpenTasksCount() {
  let n = 0;
  for (const p of Object.values(AppState.db.individuals || {}))
    for (const t of (p._tasks || [])) if (!t.done) n++;
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

// ─── Person-Detail: Tasks-Abschnitt (HTML-String) ────────────────────────────

function _tasksSectionHtml(personId) {
  const tasks   = _getPersonTasks(personId);
  const openCnt = tasks.filter(t => !t.done).length;
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
        ? ` <span style="font-size:0.72rem;color:var(--text-muted);font-weight:normal">(${openCnt} offen)</span>`
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
        <button class="task-del" data-action="deleteTask"
          data-pid="${personId}" data-tid="${t.id}" aria-label="Aufgabe löschen">×</button>
      </div>`;
    }
  }

  if (!tasks.length) {
    html += `<div style="color:var(--text-muted);font-style:italic;font-size:0.85rem;padding:4px 0">Keine Aufgaben</div>`;
  }
  html += `</div>`;
  return html;
}

// Placeholder im DOM nach showDetail() ersetzen (synchron — Daten sind bereits im AppState)
function _renderTasksSectionAsync(personId) {
  const ph = document.getElementById('tasks-section-placeholder-' + personId);
  if (!ph) return;
  ph.outerHTML = _tasksSectionHtml(personId);
}

// Bereits sichtbaren Abschnitt neu rendern
function _refreshTasksSection(personId) {
  const sec = document.getElementById('tasks-section-' + personId);
  if (!sec) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = _tasksSectionHtml(personId);
  sec.replaceWith(tmp.firstElementChild);
}

// ─── Aufgabe hinzufügen — Modal ───────────────────────────────────────────────

let _addTaskPersonId = null;

function showAddTaskForm(personId) {
  _addTaskPersonId = personId;
  const sel = document.getElementById('addTaskCategory');
  if (sel) {
    sel.innerHTML = TASK_CATEGORIES
      .map(c => `<option value="${c.key}">${esc(c.label)}</option>`)
      .join('');
  }
  const inp = document.getElementById('addTaskText');
  if (inp) inp.value = '';
  openModal('modalAddTask');
  setTimeout(() => inp?.focus(), 80);
}

function _saveAddTask() {
  const text = document.getElementById('addTaskText')?.value || '';
  const cat  = document.getElementById('addTaskCategory')?.value || TASK_CATEGORIES[0].key;
  if (!text.trim()) { showToast('Bitte Aufgabe eingeben', 'warn'); return; }
  closeModal('modalAddTask');
  _addTaskToDb(_addTaskPersonId, text, cat);
  _refreshTasksSection(_addTaskPersonId);
  if (_personsMode === 'tasks') renderTasksView();
  showToast('Aufgabe gespeichert', 'success');
}

// ─── Globale Aufgabenliste (in Personen-Tab) ──────────────────────────────────

let _personsMode     = 'persons'; // 'persons' | 'tasks'
let _tasksViewFilter = 'open';    // 'all' | 'open' | 'done'

function switchPersonsMode(mode) {
  _personsMode = mode;
  const isPersons = mode === 'persons';

  document.getElementById('persons-list-section').style.display = isPersons ? '' : 'none';
  document.getElementById('tasksList').style.display            = isPersons ? 'none' : '';

  document.getElementById('toggle-persons-mode').classList.toggle('active',  isPersons);
  document.getElementById('toggle-tasks-mode').classList.toggle('active', !isPersons);

  document.getElementById('fabBtn').style.display = isPersons ? '' : 'none';

  if (!isPersons) renderTasksView();
}

function switchTasksFilter(f) {
  _tasksViewFilter = f;
  ['all', 'open', 'done'].forEach(k => {
    document.getElementById('tasks-filter-' + k)?.classList.toggle('active', k === f);
  });
  renderTasksView();
}

function renderTasksView() {
  const container = document.getElementById('tasksList');
  if (!container) return;

  const persons  = AppState.db.individuals || {};
  const catOrder = TASK_CATEGORIES.map(c => c.key);

  // Alle Tasks nach Kategorie gruppieren
  const byCat = {}; // catKey → [{ p, pid, t }]
  for (const [pid, p] of Object.entries(persons)) {
    for (const t of (p._tasks || [])) {
      if (_tasksViewFilter === 'open' && t.done)  continue;
      if (_tasksViewFilter === 'done' && !t.done) continue;
      if (!byCat[t.category]) byCat[t.category] = [];
      byCat[t.category].push({ p, pid, t });
    }
  }

  const usedCats = Object.keys(byCat).sort((a, b) => {
    const ai = catOrder.indexOf(a), bi = catOrder.indexOf(b);
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
  });

  const totalVisible = Object.values(byCat).reduce((s, arr) => s + arr.length, 0);

  let html = `<div class="tasks-filter-bar">
    <button id="tasks-filter-all"  class="tasks-filter-btn${_tasksViewFilter === 'all'  ? ' active' : ''}" data-action="switchTasksFilter" data-filter="all">Alle</button>
    <button id="tasks-filter-open" class="tasks-filter-btn${_tasksViewFilter === 'open' ? ' active' : ''}" data-action="switchTasksFilter" data-filter="open">Offen</button>
    <button id="tasks-filter-done" class="tasks-filter-btn${_tasksViewFilter === 'done' ? ' active' : ''}" data-action="switchTasksFilter" data-filter="done">Erledigt</button>
  </div>`;

  if (!totalVisible) {
    const msg = _tasksViewFilter === 'open' ? 'Keine offenen Aufgaben'
              : _tasksViewFilter === 'done' ? 'Keine erledigten Aufgaben'
              : 'Keine Aufgaben vorhanden';
    html += `<div style="padding:32px 16px;text-align:center;color:var(--text-muted);font-style:italic;font-size:0.88rem">${msg}</div>`;
    container.innerHTML = html;
    return;
  }

  for (const catKey of usedCats) {
    const catLabel = TASK_CATEGORIES.find(c => c.key === catKey)?.label || catKey;
    html += `<div class="tasks-cat-header">${esc(catLabel)}</div>`;

    const entries = byCat[catKey].sort((a, b) =>
      (a.p?.surname || a.p?.name || '').localeCompare(b.p?.surname || b.p?.name || '', 'de'));

    let lastPid = null;
    for (const { p, pid, t } of entries) {
      if (pid !== lastPid) {
        html += `<div class="tasks-person-header" data-action="showDetail" data-pid="${pid}">${esc(p?.name || pid)} ›</div>`;
        lastPid = pid;
      }
      html += `<div class="task-row${t.done ? ' task-done' : ''} task-row-global">
        <button class="task-check" data-action="toggleTask"
          data-pid="${pid}" data-tid="${t.id}"
          aria-label="${t.done ? 'Erledigt' : 'Offen'}">${t.done ? '☑' : '☐'}</button>
        <span class="task-text">${esc(t.text)}</span>
        <button class="task-del" data-action="deleteTask"
          data-pid="${pid}" data-tid="${t.id}" aria-label="Aufgabe löschen">×</button>
      </div>`;
    }
  }

  container.innerHTML = html;
}

// ─── Click-Handler ────────────────────────────────────────────────────────────

function _handleToggleTask(el) {
  const { pid, tid } = el.dataset;
  _toggleTaskInDb(pid, tid);
  _refreshTasksSection(pid);
  if (_personsMode === 'tasks') renderTasksView();
}

function _handleDeleteTask(el) {
  const { pid, tid } = el.dataset;
  _deleteTaskFromDb(pid, tid);
  _refreshTasksSection(pid);
  if (_personsMode === 'tasks') renderTasksView();
}

// ─── Startup-Badge ────────────────────────────────────────────────────────────

// Badge nach dem ersten renderTab()-Aufruf aktualisieren (db muss geladen sein)
window.addEventListener('load', () => {
  // Kurz warten bis tryAutoLoad() den AppState befüllt hat
  setTimeout(_updateTasksBadge, 800);
});
