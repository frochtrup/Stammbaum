// ─────────────────────────────────────
//  UNDO / REDO (U8)
//  Ausgelagert aus ui-views.js (REFACT-3, sw v697)
//  Abhängigkeiten: AppState, UIState, db, renderTab, updateChangedIndicator,
//  invalidatePlacePersonIndex (ui-views-place.js), showToast
// ─────────────────────────────────────
// ─────────────────────────────────────
//  UNDO / REDO (U8)
// ─────────────────────────────────────

// Snapshot der angegebenen Entities vor einer Mutation aufnehmen.
// Muss VOR der Mutation aufgerufen werden.
function pushUndo(label, { personIds = [], familyIds = [], sourceIds = [], repoIds = [] } = {}) {
  const clone = v => (v === undefined || v === null) ? null
    : (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));
  const snap = {
    label,
    persons:  Object.fromEntries(personIds.map(id  => [id, clone(db.individuals[id])])),
    families: Object.fromEntries(familyIds.map(id  => [id, clone(db.families[id])])),
    sources:  Object.fromEntries(sourceIds.map(id  => [id, clone(db.sources[id])])),
    repos:    Object.fromEntries(repoIds.map(id    => [id, clone(db.repositories[id])])),
  };
  AppState._undoStack.push(snap);
  if (AppState._undoStack.length > 30) AppState._undoStack.shift();
  AppState._redoStack = [];
}

function applyUndo() { _applyUndoStack(AppState._undoStack, AppState._redoStack); }
function applyRedo() { _applyUndoStack(AppState._redoStack, AppState._undoStack); }

function _applyUndoStack(from, to) {
  if (!from.length) return;
  const snap = from.pop();
  const clone = v => (v === null) ? null
    : (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));

  // Gegenzug aufnehmen (aktuellen Zustand der betroffenen Entities sichern)
  const counter = { label: snap.label, persons: {}, families: {}, sources: {}, repos: {} };
  for (const [id, val] of Object.entries(snap.persons)) {
    counter.persons[id] = clone(db.individuals[id] ?? null);
    if (val === null) delete db.individuals[id]; else db.individuals[id] = val;
  }
  for (const [id, val] of Object.entries(snap.families)) {
    counter.families[id] = clone(db.families[id] ?? null);
    if (val === null) delete db.families[id]; else db.families[id] = val;
  }
  for (const [id, val] of Object.entries(snap.sources)) {
    counter.sources[id] = clone(db.sources[id] ?? null);
    if (val === null) delete db.sources[id]; else db.sources[id] = val;
  }
  for (const [id, val] of Object.entries(snap.repos)) {
    counter.repos[id] = clone(db.repositories[id] ?? null);
    if (val === null) delete db.repositories[id]; else db.repositories[id] = val;
  }
  to.push(counter);

  UIState._placesCache = null;
  UIState._hofCache = null;
  UIState._searchIndexDirty = true;
  AppState.changed = AppState._undoStack.length > 0;
  updateChangedIndicator();
  if (typeof invalidatePlacePersonIndex === 'function') invalidatePlacePersonIndex();
  renderTab();
  showToast('↩ ' + snap.label, 'info');
}
