// ─────────────────────────────────────
//  FORMS: FAMILY
// ─────────────────────────────────────
let _pendingAddChild = null;

function showFamilyForm(id, ctx) {
  closeModal('modalAdd');
  _pendingAddChild = null;
  const f = id ? getFamily(id) : null;
  document.getElementById('familyFormTitle').textContent = f ? 'Familie bearbeiten' : 'Neue Familie';
  document.getElementById('ff-id').value = id || '';

  // Populate person selects
  const persons = Object.values(AppState.db.individuals).sort((a,b) => (a.name||'').localeCompare(b.name||'','de'));
  const optionsAll = '<option value="">– keine –</option>' + persons.map(p =>
    `<option value="${p.id}">${esc(p.name || p.id)}</option>`
  ).join('');
  document.getElementById('ff-husb').innerHTML = optionsAll;
  document.getElementById('ff-wife').innerHTML = optionsAll;

  document.getElementById('ff-husb').value = f?.husb || '';
  document.getElementById('ff-wife').value = f?.wife || '';
  fillDateFields('ff-mdate-qual', 'ff-mdate', null, f?.marr?.date  || '');
  initPlaceMode('ff-mplace');
  document.getElementById('ff-mplace').value = f?.marr?.place  || '';
  document.getElementById('ff-note').value = f?.noteTexts?.join('\n') ?? '';
  document.getElementById('deleteFamilyBtn').style.display = f ? 'block' : 'none';
  initSrcWidget('ff', f?.marr?.citations || []);

  _renderMediaList('ff', f?.media || []);
  document.getElementById('ff-media-add-file').value = '';

  // Vorausfüllung aus Beziehungs-Picker-Kontext
  if (ctx) {
    if (ctx.husb !== undefined) document.getElementById('ff-husb').value = ctx.husb || '';
    if (ctx.wife !== undefined) document.getElementById('ff-wife').value = ctx.wife || '';
    if (ctx.addChild) {
      _pendingAddChild = ctx.addChild;
    }
  }

  openModal('modalFamily');
}

function saveFamily() {
  const id = document.getElementById('ff-id').value || nextId('F');
  const husb = document.getElementById('ff-husb').value || null;
  const wife = document.getElementById('ff-wife').value || null;
  if (!husb && !wife) { showToast('⚠ Mindestens ein Elternteil erforderlich'); return; }
  const mdate  = buildGedDateFromFields('ff-mdate-qual', 'ff-mdate', null);
  const mplace = getPlaceFromForm('ff-mplace');
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
    marr:  { ...(existingFam.marr||{}),  date: mdate,  place: mplace,
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
