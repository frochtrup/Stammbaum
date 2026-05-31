// ─────────────────────────────────────
//  FORMS: FAMILY
// ─────────────────────────────────────
let _pendingAddChild = null;
let _ffGrampsAttrs   = [];

function _renderFfGrampsAttrs() {
  const list = document.getElementById('ff-gramps-attrs-list');
  if (!list) return;
  list.innerHTML = '';
  if (!_ffGrampsAttrs.length) {
    const empty = document.createElement('div');
    empty.className = 'tasks-empty';
    empty.style.cssText = 'font-size:0.85em;padding:4px 0';
    empty.textContent = 'Keine Attribute';
    list.appendChild(empty);
    return;
  }
  _ffGrampsAttrs.forEach((a, idx) => {
    const row = document.createElement('div');
    row.className = 'gramps-attr-row';
    const typeEl = document.createElement('input');
    typeEl.className = 'form-input';
    typeEl.placeholder = 'Typ';
    typeEl.value = a.type || '';
    typeEl.addEventListener('input', () => { _ffGrampsAttrs[idx].type = typeEl.value; });
    const valEl = document.createElement('input');
    valEl.className = 'form-input';
    valEl.placeholder = 'Wert';
    valEl.value = a.value || '';
    valEl.addEventListener('input', () => { _ffGrampsAttrs[idx].value = valEl.value; });
    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = '×';
    del.className = 'btn btn-danger';
    del.style.cssText = 'padding:4px 10px;flex-shrink:0';
    del.addEventListener('click', () => { _ffGrampsAttrs.splice(idx, 1); _renderFfGrampsAttrs(); });
    row.appendChild(typeEl);
    row.appendChild(valEl);
    row.appendChild(del);
    list.appendChild(row);
  });
}

function addFfGrampsAttr() {
  _ffGrampsAttrs.push({ type: '', value: '', citations: [] });
  _renderFfGrampsAttrs();
}

function showFamilyForm(id, ctx) {
  closeModal('modalAdd');
  _pendingAddChild = null;
  const f = id ? getFamily(id) : null;
  document.getElementById('familyFormTitle').textContent = f ? 'Familie bearbeiten' : 'Neue Familie';
  document.getElementById('ff-id').value = id || '';

  // Eltern-Slots: versteckte IDs + klickbare Suchpicker-Labels (kein <select> mehr — Auswahl via ffPickParent)
  _ffSetParent('husb', f?.husb || '');
  _ffSetParent('wife', f?.wife || '');
  fillDateFields('ff-mdate-qual', 'ff-mdate', null, f?.marr?.date  || '');
  initPlaceMode('ff-mplace');
  document.getElementById('ff-mplace').value    = f?.marr?.place   || '';
  document.getElementById('ff-mplace-id').value = f?.marr?.placeId || '';
  document.getElementById('ff-note').value = f?.noteTexts?.join('\n') ?? '';
  document.getElementById('deleteFamilyBtn').style.display = f ? 'block' : 'none';
  initSrcWidget('ff', f?.marr?.citations || []);

  _renderMediaList('ff', f?.media || []);
  document.getElementById('ff-media-add-file').value = '';

  // Vorausfüllung aus Beziehungs-Picker-Kontext bzw. zurückgekehrtem Familien-Formularstand
  if (ctx) {
    if (ctx.husb !== undefined) _ffSetParent('husb', ctx.husb || '');
    if (ctx.wife !== undefined) _ffSetParent('wife', ctx.wife || '');
    if (ctx.mdate !== undefined) fillDateFields('ff-mdate-qual', 'ff-mdate', null, ctx.mdate || '');
    if (ctx.mplace)    { document.getElementById('ff-mplace').value = ctx.mplace; document.getElementById('ff-mplace-id').value = ctx.mplaceId || ''; }
    if (ctx.note)      document.getElementById('ff-note').value = ctx.note;
    if (ctx.addChild)  _pendingAddChild = ctx.addChild;
  }

  // GRAMPS-Sektion: nur wenn grampId oder _grampsAttrs vorhanden
  _ffGrampsAttrs = (f?._grampsAttrs || []).map(a => ({ ...a }));
  const ffGrampsSection = document.getElementById('ff-gramps-section');
  const ffHasGramps = !!(f?.grampId || _ffGrampsAttrs.length > 0);
  if (ffGrampsSection) {
    ffGrampsSection.hidden = !ffHasGramps;
    if (ffHasGramps) {
      const gidEl = document.getElementById('ff-gramps-id');
      if (gidEl) gidEl.value = f?.grampId || '';
      const tagsRow = document.getElementById('ff-gramps-tags-row');
      const tagsEl  = document.getElementById('ff-gramps-tags');
      const tags = f?._grampsTags || [];
      if (tagsRow && tagsEl) {
        tagsRow.hidden = tags.length === 0;
        tagsEl.innerHTML = tags.map(t =>
          `<span class="gramps-tag" style="background:${esc(t.color||'#888')}">${esc(t.name)}</span>`
        ).join('');
      }
      _renderFfGrampsAttrs();
    }
  }

  openModal('modalFamily');
}

function saveFamily() {
  const id = document.getElementById('ff-id').value || nextId('F');
  const husb = document.getElementById('ff-husb').value || null;
  const wife = document.getElementById('ff-wife').value || null;
  if (!husb && !wife) { showToast('⚠ Mindestens ein Elternteil erforderlich'); return; }
  const mdate   = buildGedDateFromFields('ff-mdate-qual', 'ff-mdate', null);
  const mplace  = getPlaceFromForm('ff-mplace');
  const _fmpid  = document.getElementById('ff-mplace-id')?.value || null;
  const mplaceId = (_fmpid && AppState.db.placeObjects?.[_fmpid]?.title === mplace) ? _fmpid : null;
  const note = document.getElementById('ff-note').value.trim();
  const existingFam = getFamily(id) || {};
  const children = [...(existingFam.children || [])];
  if (_pendingAddChild && !children.includes(_pendingAddChild)) children.push(_pendingAddChild);
  _pendingAddChild = null;
  const _sfPrevPersonIds = [...new Set([existingFam.husb, existingFam.wife, ...(existingFam.children||[]), husb, wife].filter(Boolean))];
  pushUndo('Familie gespeichert', { familyIds: [id], personIds: _sfPrevPersonIds });
  AppState.db.families[id] = {
    ...existingFam,
    id, husb, wife, children,
    marr:  { ...(existingFam.marr||{}),  date: mdate,  place: mplace, placeId: mplaceId,
      citations: [...(srcWidgetState['ff']?.citations || [])]
    },
    engag: existingFam.engag || {},
    div:   existingFam.div   || {},
    divf:  existingFam.divf  || {},
    noteTexts: note ? [note] : [],
    noteText: (() => {
      let t = note;
      for (const ref of (existingFam.noteRefs || [])) {
        if (AppState.db.notes && AppState.db.notes[ref]) t += (t ? '\n' : '') + AppState.db.notes[ref].text;
      }
      return t;
    })(),
    media: _readMediaList('ff', existingFam.media || []),
    _grampsAttrs: _ffGrampsAttrs.filter(a => a.type || a.value),
    sourceRefs: new Set(),
    lastChanged: gedcomDate(new Date()),
    lastChangedTime: gedcomTime(new Date())
  };
  _rebuildFamilySourceRefs(AppState.db.families[id]);

  // Update FAMS/FAMC references
  // famc entries are objects {famId, frel, mrel}, fams entries are strings
  const famcId = f => (typeof f === 'string' ? f : f.famId);
  // Bestehende famc-Einträge dieser Familie sichern, bevor sie entfernt werden
  const savedFamc = {};
  for (const p of Object.values(AppState.db.individuals)) {
    const existing = p.famc.find(f => famcId(f) === id);
    if (existing) savedFamc[p.id] = existing;
    p.fams = p.fams.filter(f => f !== id);
    p.famc = p.famc.filter(f => famcId(f) !== id);
  }
  const hPerson = getPerson(husb); if (hPerson && !hPerson.fams.includes(id)) hPerson.fams.push(id);
  const wPerson = getPerson(wife); if (wPerson && !wPerson.fams.includes(id)) wPerson.fams.push(id);
  for (const cid of children) {
    const cPerson = getPerson(cid);
    if (cPerson && !cPerson.famc.some(f => famcId(f) === id))
      cPerson.famc.push(savedFamc[cid] || { famId: id, pedi: '', frel: '', mrel: '', frelSeen: false, mrelSeen: false, frelSour:'', frelPage:'', frelQUAY:'', frelSourExtra:[], mrelSour:'', mrelPage:'', mrelQUAY:'', mrelSourExtra:[], citations:[] });
  }

  closeModal('modalFamily');
  markChanged();
  renderTab();
  showToast('✓ Familie gespeichert');
  if (AppState.currentFamilyId === id) showFamilyDetail(id);
}

async function deleteFamily() {
  const id = document.getElementById('ff-id').value;
  if (!id) return;
  if (!await confirmModal('Familie wirklich löschen?', 'Löschen')) return;
  const _dfFam = getFamily(id);
  const _dfPersonIds = [...new Set([_dfFam?.husb, _dfFam?.wife, ...(_dfFam?.children||[])].filter(Boolean))];
  pushUndo('Familie gelöscht', { familyIds: [id], personIds: _dfPersonIds });
  const famcId2 = f => (typeof f === 'string' ? f : f.famId);
  for (const p of Object.values(AppState.db.individuals)) {
    setPerson(p.id, {
      fams: p.fams.filter(f => f !== id),
      famc: p.famc.filter(f => famcId2(f) !== id)
    });
  }
  delete AppState.db.families[id];
  closeModal('modalFamily');
  markChanged();
  showMain(); showToast('✓ Familie gelöscht');
}

initPlaceAutocomplete('ff-mplace', 'ff-mplace-dd', 'ff-mplace-id');

// Eltern-Slot setzen: versteckte ID + sichtbares Picker-Label
function _ffSetParent(slot, id) {
  const hid = document.getElementById('ff-' + slot);
  if (hid) hid.value = id || '';
  const btn = document.getElementById('ff-' + slot + '-pick');
  if (!btn) return;
  const p = id ? AppState.db.individuals[id] : null;
  btn.textContent = p ? (p.name || p.id) : (slot === 'wife' ? '– keine –' : '– keiner –');
  btn.classList.toggle('is-empty', !p);
}

// Eltern-Slot wählen: Suchpicker (gleiche Logik wie "+ Elternteil") über dem Familienformular öffnen
function ffPickParent(slot) {
  UIState._relMode = (slot === 'wife') ? 'ffWife' : 'ffHusb';
  document.getElementById('relPickerTitle').textContent =
    (slot === 'wife') ? 'Ehefrau / Mutter wählen' : 'Ehemann / Vater wählen';
  document.getElementById('relPickerSearch').value = '';
  renderRelPicker('');
  openModal('modalRelPicker');
}

// Neue Person für einen Eltern-Slot: Formularstand sichern, Person-Formular öffnen;
// nach Speichern führt der _pendingFfState-Rücksprung (ui-forms-person.js) zurück ins Familien-Formular.
function ffNewPerson(slot) {
  UIState._pendingFfState = {
    slot,
    id:       document.getElementById('ff-id').value || null,
    husb:     document.getElementById('ff-husb').value || null,
    wife:     document.getElementById('ff-wife').value || null,
    mdate:    buildGedDateFromFields('ff-mdate-qual', 'ff-mdate', null),
    mplace:   document.getElementById('ff-mplace').value,
    mplaceId: document.getElementById('ff-mplace-id').value,
    note:     document.getElementById('ff-note').value,
    addChild: _pendingAddChild,
  };
  closeModal('modalFamily');
  showPersonForm(null);
}
