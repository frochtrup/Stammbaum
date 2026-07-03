// ─────────────────────────────────────
//  FORSCHUNGSPROJEKTE (RES-PROJ 3b)
// ─────────────────────────────────────
// Projekte = persönliche Organisationsschicht (Scope: Linie/Ort/Zeitraum).
// App-privat: IDB-Store 'projects' + portable JSON — reist NICHT mit GEDCOM/GRAMPS
// (Faustregel; Muster wie quick_templates). Membership wird BERECHNET
// (_projectMatches) statt pro Person gespeichert → kein Dangling, kein File-Tag.

// Feste Palette → CSS-Klassen pc0..pc5 (CSP ohne unsafe-inline blockt style=""-Attribute, ADR-015)
const PROJ_COLORS = ['#b8860b', '#4caf50', '#c0392b', '#2980b9', '#8e44ad', '#d68910'];
function _pcClass(color) { const i = PROJ_COLORS.indexOf(color); return i >= 0 ? 'pc' + i : ''; }

let _activeProjectId = null;   // null = "Alle"
let _projEditId      = null;   // null = neues Projekt im Editor

// ── State + Persistenz (quick_templates-Muster) ──────────────────────────────
function _projList() {
  if (!Array.isArray(AppState.projects)) AppState.projects = [];
  return AppState.projects;
}
function _projById(id) { return _projList().find(p => p.id === id) || null; }
function _activeProject() { return _activeProjectId ? _projById(_activeProjectId) : null; }

async function loadProjects() {
  try {
    const raw = await idbGet('projects');
    AppState.projects = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];
  } catch (e) { AppState.projects = []; }
  return _projList();
}
function saveProjects() {
  idbPut('projects', JSON.stringify(_projList())).catch(() => {});
}

function exportProjects() {
  const blob = new Blob([JSON.stringify({ version: 1, projects: _projList() }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'stammbaum-projekte.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  showToast('Projekte exportiert', 'success');
}
function importProjectsFile(input) {
  const file = input.files?.[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      const arr = Array.isArray(data) ? data : (data.projects || []);
      if (!Array.isArray(arr)) throw new Error('Format');
      AppState.projects = arr;
      saveProjects();
      _renderProjectManager();
      showToast(`${arr.length} Projekt(e) importiert`, 'success');
    } catch (e) { showToast('Import fehlgeschlagen: ungültige Datei', 'error'); }
    input.value = '';
  };
  r.readAsText(file);
}

// ── Scope-Matching ───────────────────────────────────────────────────────────
function _projYear(d) { const m = String(d || '').match(/\b(\d{3,4})\b/); return m ? +m[1] : null; }
function _projNorm(s) { return (s || '').toLowerCase().trim(); }

function _projectMatches(personId) {
  const proj = _activeProject();
  if (!proj) return true;                       // "Alle"
  const p = AppState.db.individuals?.[personId];
  if (!p) return false;
  const sc = proj.scope || {};
  const hasIds  = sc.personIds?.length;
  const hasDims = sc.surnames?.length || sc.places?.length || sc.yearFrom || sc.yearTo;
  if (!hasIds && !hasDims) return true;          // leeres Projekt = alle
  if (hasIds && sc.personIds.includes(personId)) return true;
  if (!hasDims) return false;                    // nur personIds gesetzt, nicht gelistet
  // Dimensionen (UND zwischen gesetzten Achsen)
  if (sc.surnames?.length) {
    const sn = _projNorm(p.surname);
    if (!sc.surnames.some(s => { const q = _projNorm(s); return q && (sn === q || sn.includes(q)); })) return false;
  }
  if (sc.places?.length) {
    const places = [];
    for (const k of ['birth', 'chr', 'death', 'buri']) if (p[k]?.place) places.push(_projNorm(p[k].place));
    for (const ev of (p.events || [])) if (ev.place) places.push(_projNorm(ev.place));
    if (!sc.places.some(pl => { const q = _projNorm(pl); return q && places.some(x => x.includes(q)); })) return false;
  }
  if (sc.yearFrom || sc.yearTo) {
    const by = _projYear(p.birth?.date) || _projYear(p.chr?.date);
    if (by == null) return false;
    if (sc.yearFrom && by < sc.yearFrom) return false;
    if (sc.yearTo   && by > sc.yearTo)   return false;
  }
  return true;
}

function _projectMatchesEntity(kind, id) {
  if (!_activeProject()) return true;
  if (kind === 'person') return _projectMatches(id);
  const f = AppState.db.families?.[id];
  return !!(f && ((f.husb && _projectMatches(f.husb)) || (f.wife && _projectMatches(f.wife))));
}

// ── Chip-Leiste (in allen Aufgaben-Modi) ─────────────────────────────────────
function _projectChipBar() {
  const list = _projList();
  let chips = `<button class="proj-chip${!_activeProjectId ? ' active' : ''}" data-action="setActiveProject" data-proj="">Alle</button>`;
  for (const pr of list) {
    chips += `<button class="proj-chip ${_pcClass(pr.color)}${_activeProjectId === pr.id ? ' active' : ''}" data-action="setActiveProject" data-proj="${pr.id}">${esc(pr.name)}</button>`;
  }
  chips += `<button class="proj-chip proj-chip-add" data-action="showProjectManager" title="Projekte verwalten">⚙</button>`;
  return `<div class="proj-bar">${chips}</div>`;
}

function setActiveProject(projId) {
  _activeProjectId = projId || null;
  if (typeof renderTasksView === 'function') renderTasksView();
}

// ── Manager-Modal ─────────────────────────────────────────────────────────────
function showProjectManager() {
  _projEditId = null;
  _renderProjectManager();
  openModal('modalProjects');
}

function _renderProjectManager(editing) {
  const body = document.getElementById('projectsBody');
  if (!body) return;
  const list = _projList();

  let html = `<div class="proj-mgr-list">`;
  if (!list.length) html += `<div class="c-muted italic fs-sm py-8">Noch keine Projekte</div>`;
  for (const pr of list) {
    const dot = pr.color ? `<span class="proj-dot ${_pcClass(pr.color)}"></span>` : '';
    html += `<div class="proj-mgr-row">
      <div class="proj-mgr-name" data-action="editProject" data-proj="${pr.id}">${dot}${esc(pr.name)}</div>
      <button class="proj-mgr-del" data-action="deleteProject" data-proj="${pr.id}" aria-label="Löschen">×</button>
    </div>`;
  }
  html += `</div>
    <button class="btn btn-save w-full mt-8" data-action="newProject">+ Neues Projekt</button>`;

  // Editor
  if (editing !== undefined) {
    const pr = editing ? (_projById(editing) || {}) : {};
    const sc = pr.scope || {};
    const colorSwatches = PROJ_COLORS.map((c, i) =>
      `<button type="button" class="proj-swatch pc${i}${pr.color === c ? ' active' : ''}" data-action="pickProjColor" data-color="${c}" aria-label="Farbe"></button>`).join('');
    html += `<div class="proj-editor" id="proj-editor">
      <div class="proj-editor-title">${editing ? 'Projekt bearbeiten' : 'Neues Projekt'}</div>
      <input type="hidden" id="proj-ed-id" value="${editing || ''}">
      <input type="hidden" id="proj-ed-color" value="${esc(pr.color || '')}">
      <div class="form-group"><label class="form-label">Name</label>
        <input class="form-input" id="proj-ed-name" value="${esc(pr.name || '')}" placeholder="z.B. Linie Decker / Ochtrup"></div>
      <div class="form-group"><label class="form-label">Farbe</label>
        <div class="proj-swatches">${colorSwatches}</div></div>
      <div class="form-group"><label class="form-label">Nachnamen (Linie, kommagetrennt)</label>
        <input class="form-input" id="proj-ed-surnames" value="${esc((sc.surnames || []).join(', '))}" placeholder="Decker, Frochtrup"></div>
      <div class="form-group"><label class="form-label">Orte (kommagetrennt)</label>
        <input class="form-input" id="proj-ed-places" value="${esc((sc.places || []).join(', '))}" placeholder="Ochtrup, Metelen"></div>
      <div class="form-group proj-years"><label class="form-label">Zeitraum (Geburtsjahr)</label>
        <div class="proj-year-row">
          <input class="form-input" id="proj-ed-yearfrom" type="number" inputmode="numeric" value="${sc.yearFrom || ''}" placeholder="von">
          <span class="c-muted">–</span>
          <input class="form-input" id="proj-ed-yearto" type="number" inputmode="numeric" value="${sc.yearTo || ''}" placeholder="bis">
        </div></div>
      <div class="form-group"><label class="form-label">Notiz</label>
        <textarea class="form-input resize-v" id="proj-ed-note" rows="2">${esc(pr.note || '')}</textarea></div>
      <div class="btn-row">
        <button class="btn btn-cancel" data-action="cancelProjectEdit">Abbrechen</button>
        <button class="btn btn-save" data-action="saveProject">Speichern</button>
      </div>
    </div>`;
  }

  html += `<div class="proj-mgr-foot">
    <button class="src-cit-btn" data-action="exportProjects" title="Projekte als JSON exportieren">↓ Export</button>
    <label class="src-cit-btn" title="Projekte aus JSON importieren">↑ Import
      <input type="file" accept="application/json,.json" hidden data-change="importProjects"></label>
  </div>`;
  body.innerHTML = html;
}

function newProject()  { _projEditId = null; _renderProjectManager(''); }
function editProject(id) { _projEditId = id; _renderProjectManager(id); }
function cancelProjectEdit() { _renderProjectManager(); }
function pickProjColor(color) {
  const f = document.getElementById('proj-ed-color'); if (f) f.value = color;
  document.querySelectorAll('.proj-swatch').forEach(s => s.classList.toggle('active', s.dataset.color === color));
}

function _splitCsv(v) { return (v || '').split(',').map(s => s.trim()).filter(Boolean); }

function saveProject() {
  const name = (document.getElementById('proj-ed-name')?.value || '').trim();
  if (!name) { showToast('Bitte Projektnamen eingeben', 'warn'); return; }
  const id   = document.getElementById('proj-ed-id')?.value || ('prj_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
  const yf   = parseInt(document.getElementById('proj-ed-yearfrom')?.value);
  const yt   = parseInt(document.getElementById('proj-ed-yearto')?.value);
  const existing = _projById(id) || {};
  const proj = {
    ...existing,
    id, name,
    color: document.getElementById('proj-ed-color')?.value || '',
    note:  (document.getElementById('proj-ed-note')?.value || '').trim(),
    scope: {
      surnames: _splitCsv(document.getElementById('proj-ed-surnames')?.value),
      places:   _splitCsv(document.getElementById('proj-ed-places')?.value),
      yearFrom: isNaN(yf) ? null : yf,
      yearTo:   isNaN(yt) ? null : yt,
      personIds: existing.scope?.personIds || [],
    },
    created: existing.created || new Date().toISOString().slice(0, 10),
  };
  const list = _projList();
  const idx = list.findIndex(p => p.id === id);
  if (idx >= 0) list[idx] = proj; else list.push(proj);
  saveProjects();
  _projEditId = null;
  _renderProjectManager();
  showToast('Projekt gespeichert', 'success');
}

async function deleteProject(id) {
  const pr = _projById(id);
  if (!pr) return;
  if (!await confirmModal(`Projekt „${pr.name}" löschen?`, 'Löschen')) return;
  AppState.projects = _projList().filter(p => p.id !== id);
  if (_activeProjectId === id) _activeProjectId = null;
  saveProjects();
  _renderProjectManager();
  showToast('Projekt gelöscht', 'success');
}

// Boot-Load (analog loadQuickTemplates)
if (typeof idbGet === 'function') loadProjects();
