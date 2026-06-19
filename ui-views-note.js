// ─────────────────────────────────────
//  NOTIZ-MODAL
// ─────────────────────────────────────

function _noteRefUsers(ref) {
  const names = [];
  for (const p of Object.values(AppState.db.individuals))
    if ((p.noteRefs||[]).includes(ref)) names.push(p.name || p.id);
  for (const f of Object.values(AppState.db.families)) {
    if (!(f.noteRefs||[]).includes(ref)) continue;
    const h = f.husb && AppState.db.individuals[f.husb];
    const w = f.wife && AppState.db.individuals[f.wife];
    names.push([h?.name, w?.name].filter(Boolean).join(' & ') || f.id);
  }
  return names;
}

function openNoteModal(type, id) {
  let inlineText = '';
  let noteRefs   = [];
  if (type === 'person') {
    const p = AppState.db.individuals[id];
    inlineText = p?.noteTexts?.join('\n') ?? '';
    noteRefs   = p?.noteRefs || [];
  } else if (type === 'family') {
    const f = AppState.db.families[id];
    inlineText = f?.noteTexts?.join('\n') ?? '';
    noteRefs   = f?.noteRefs || [];
  } else if (type === 'source') {
    inlineText = AppState.db.sources[id]?.text ?? '';
  } else if (type === 'hof') {
    inlineText = AppState.db.hofObjects?.[id]?.note ?? '';
  }
  document.getElementById('note-type').value = type;
  document.getElementById('note-id').value   = id;

  let html = `<div class="form-group">
    <div class="form-label">Eigene Notiz</div>
    <textarea data-notetype="inline" class="form-input" rows="5"
      placeholder="Notiz eingeben…">${esc(inlineText)}</textarea>
  </div>`;

  for (const ref of noteRefs) {
    const noteObj = AppState.db.notes?.[ref];
    const users   = _noteRefUsers(ref);
    const usersHtml = users.length
      ? `<div class="note-ref-users">${users.map(n => esc(n)).join(' · ')}</div>` : '';
    html += `<div class="form-group note-ref-section" data-ref-section="${esc(ref)}">
      <div class="note-ref-header">
        <div class="form-label note-ref-label">${esc(ref)}</div>
        <button type="button" class="btn-remove-ref" data-action="removeNoteRef">× Entfernen</button>
      </div>
      ${usersHtml}
      <textarea data-notetype="ref" data-noteref="${esc(ref)}" class="form-input" rows="5"
        placeholder="Notiz eingeben…">${esc(noteObj?.text ?? '')}</textarea>
    </div>`;
  }

  document.getElementById('note-sections').innerHTML = html;
  openModal('modalNote');
  setTimeout(() => document.querySelector('#note-sections textarea')?.focus(), 80);
}

function _pruneOrphanNotes(removedRefs) {
  if (!removedRefs.length || !AppState.db.notes) return;
  const remainingSet = new Set();
  for (const p of Object.values(AppState.db.individuals))
    for (const r of (p.noteRefs || [])) remainingSet.add(r);
  for (const f of Object.values(AppState.db.families))
    for (const r of (f.noteRefs || [])) remainingSet.add(r);
  for (const ref of removedRefs)
    if (!remainingSet.has(ref)) delete AppState.db.notes[ref];
}

function saveNoteModal() {
  const type = document.getElementById('note-type').value;
  const id   = document.getElementById('note-id').value;

  // Inline-Notiz lesen
  const inlineTa = document.querySelector('#note-sections [data-notetype="inline"]');
  const inlineVal = inlineTa ? inlineTa.value.trim() : '';

  // verbleibende noteRefs + Texte lesen
  const remainingRefs = [];
  document.querySelectorAll('#note-sections [data-notetype="ref"]').forEach(ta => {
    const ref = ta.dataset.noteref;
    remainingRefs.push(ref);
    if (AppState.db.notes?.[ref]) AppState.db.notes[ref].text = ta.value.trim();
  });

  if (type === 'person') {
    const p = AppState.db.individuals[id];
    if (!p) return;
    const removed = (p.noteRefs || []).filter(r => !remainingRefs.includes(r));
    p.noteRefs  = remainingRefs;
    p.noteTexts = inlineVal ? [inlineVal] : [];
    p.noteText  = inlineVal;
    for (const ref of remainingRefs)
      if (AppState.db.notes?.[ref]) p.noteText += (p.noteText ? '\n' : '') + AppState.db.notes[ref].text;
    _pruneOrphanNotes(removed);
    markChanged(); closeModal('modalNote'); showDetail(id);
  } else if (type === 'family') {
    const f = AppState.db.families[id];
    if (!f) return;
    const removed = (f.noteRefs || []).filter(r => !remainingRefs.includes(r));
    f.noteRefs  = remainingRefs;
    f.noteTexts = inlineVal ? [inlineVal] : [];
    f.noteText  = inlineVal;
    for (const ref of remainingRefs)
      if (AppState.db.notes?.[ref]) f.noteText += (f.noteText ? '\n' : '') + AppState.db.notes[ref].text;
    _pruneOrphanNotes(removed);
    markChanged(); closeModal('modalNote'); showFamilyDetail(id);
  } else if (type === 'source') {
    const s = AppState.db.sources[id];
    if (!s) return;
    s.text = inlineVal;
    markChanged(); closeModal('modalNote'); showSourceDetail(id);
  } else if (type === 'hof') {
    // Farm-placeObject-Notiz (geräteübergreifend, primäre Anzeige-Quelle).
    if (typeof upsertHofPO === 'function') upsertHofPO(id, { note: inlineVal });
    // Notiz-Dual-write Sidecar: der GEDCOM-Notiz-Export läuft noch über den
    // [Hof]-Record (liest db.hofObjects) — bleibt bis 2c (Notiz-Export auf Farm-PO).
    if (!AppState.db.hofObjects[id]) AppState.db.hofObjects[id] = { addr: id };
    AppState.db.hofObjects[id].note = inlineVal;
    if (!inlineVal && AppState.db.hofObjects[id].lat == null) delete AppState.db.hofObjects[id];
    saveHofObjects();
    markChanged(); closeModal('modalNote'); showHofDetail(id, false);
  }
}
