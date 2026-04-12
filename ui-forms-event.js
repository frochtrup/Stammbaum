// ─────────────────────────────────────
//  FORMS: EVENT
// ─────────────────────────────────────
const _SPECIAL_OBJ = { BIRT:'birth', CHR:'chr', DEAT:'death', BURI:'buri' };
const _SPECIAL_LBL = { BIRT:'Geburt', CHR:'Taufe', DEAT:'Tod', BURI:'Beerdigung' };

let _efMedia = [];

function _renderEfMedia() {
  const list = document.getElementById('ef-media-list');
  if (!list) return;
  list.innerHTML = '';
  _efMedia.forEach((m, idx) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;align-items:center;flex-wrap:wrap';
    const mkInput = (ph, val, field) => {
      const el = document.createElement('input');
      el.className = 'form-input';
      el.style.cssText = 'flex:3;min-width:80px';
      el.placeholder = ph;
      el.value = val;
      el.addEventListener('input', () => { _efMedia[idx][field] = el.value; });
      return el;
    };
    row.appendChild(mkInput('Dateiname', m.file || '', 'file'));
    row.appendChild(mkInput('Titel', m.title || '', 'title'));
    const del = document.createElement('button');
    del.type = 'button'; del.textContent = '×';
    del.style.cssText = 'padding:4px 10px;background:var(--danger,#c0392b);color:#fff;border:none;border-radius:6px;cursor:pointer;flex-shrink:0';
    del.addEventListener('click', () => { _efMedia.splice(idx, 1); _renderEfMedia(); });
    row.appendChild(del);
    list.appendChild(row);
  });
}

function addEfMedia() {
  _efMedia.push({ file:'', title:'', form:'', _extra:[] });
  _renderEfMedia();
}

function _showEtypeDropdown(inputId, ddId, tag) {
  const input = document.getElementById(inputId);
  const dd    = document.getElementById(ddId);
  if (!input || !dd) return;
  const map   = AppState.db.eventTypesByTag || {};
  const all   = map[tag] || [];
  const q     = input.value.toLowerCase();
  const matches = q
    ? all.filter(t => t.toLowerCase().includes(q))
    : all;
  if (!matches.length) { dd.innerHTML = ''; dd.style.display = 'none'; return; }
  dd.innerHTML = '';
  matches.forEach(name => {
    const item = document.createElement('div');
    item.className = 'place-dropdown-item';
    item.textContent = name;
    item.addEventListener('mousedown', () => { input.value = name; dd.innerHTML = ''; dd.style.display = 'none'; });
    dd.appendChild(item);
  });
  dd.style.display = 'block';
}

function _updateEventTypeDatalist(tag, inputId, ddId) {
  // Called on tag change: show full list, or hide if empty
  const dd = document.getElementById(ddId);
  if (dd) { dd.innerHTML = ''; dd.style.display = 'none'; }
}

function _initEtypeAutocomplete(inputId, ddId, getTag) {
  const input = document.getElementById(inputId);
  const dd    = document.getElementById(ddId);
  if (!input || !dd) return;
  input.addEventListener('input',  () => _showEtypeDropdown(inputId, ddId, getTag()));
  input.addEventListener('focus',  () => _showEtypeDropdown(inputId, ddId, getTag()));
  input.addEventListener('blur',   () => setTimeout(() => { dd.style.display = 'none'; }, 150));
}

function _registerEventType(tag, val) {
  if (!tag || !val) return;
  if (!AppState.db.eventTypesByTag) AppState.db.eventTypesByTag = {};
  const arr = AppState.db.eventTypesByTag[tag] || (AppState.db.eventTypesByTag[tag] = []);
  if (!arr.includes(val)) {
    arr.push(val);
    arr.sort((a, b) => a.localeCompare(b));
  }
}

function onEventTypeChange() {
  const t = document.getElementById('ef-type').value;
  document.getElementById('ef-val-group').style.display   = (t in _SPECIAL_OBJ || t === 'RESI') ? 'none' : '';
  const showEtype = !(t in _SPECIAL_OBJ);
  document.getElementById('ef-etype-group').style.display = showEtype ? '' : 'none';
  if (showEtype) {
    const lbl = document.querySelector('#ef-etype-group .form-label');
    const inp = document.getElementById('ef-etype');
    if (t === 'EVEN') { lbl.textContent = 'Bezeichnung'; inp.placeholder = 'z.B. Militärdienst, Einlieferung …'; }
    else { lbl.textContent = 'TYPE'; inp.placeholder = 'z.B. Detailierung (optional)'; }
  }
  document.getElementById('ef-cause-group').style.display = (t === 'DEAT') ? '' : 'none';
  document.getElementById('ef-addr-group').style.display  = (t === 'RESI') ? '' : 'none';
  // Reset dropdown on type change; content rebuilt on focus/input
  const dd = document.getElementById('ef-etype-dd');
  if (dd) { dd.innerHTML = ''; dd.style.display = 'none'; }
}

function showEventForm(personId, evIdx) {
  // data-Attribute liefern immer Strings — numerische Indizes zurückkonvertieren
  if (typeof evIdx === 'string' && evIdx !== '' && !(evIdx in _SPECIAL_OBJ) && !isNaN(evIdx)) evIdx = +evIdx;
  const p = AppState.db.individuals[personId];
  const isSpecial  = typeof evIdx === 'string' && evIdx in _SPECIAL_OBJ;
  const isExisting = typeof evIdx === 'number';
  const typeEl = document.getElementById('ef-type');

  document.getElementById('ef-pid').value    = personId;
  document.getElementById('ef-evidx').value  = isExisting ? evIdx : '';

  initPlaceMode('ef-place');
  _efMedia = [];
  _renderEfMedia();
  if (isSpecial) {
    const obj = p[_SPECIAL_OBJ[evIdx]] || {};
    typeEl.value = evIdx; typeEl.disabled = true;
    document.getElementById('ef-val').value   = '';
    document.getElementById('ef-etype').value = '';
    fillDateFields('ef-date-qual', 'ef-date', 'ef-date2', obj.date || '');
    document.getElementById('ef-place').value = obj.place || '';
    document.getElementById('ef-cause').value = evIdx === 'DEAT' ? (obj.cause || '') : '';
    initSrcWidget('ef', obj.sources || [], obj.sourcePages || {}, obj.sourceQUAY || {});
    document.querySelector('#modalEvent .sheet-title').textContent = _SPECIAL_LBL[evIdx] + ' bearbeiten';
    document.getElementById('saveEventBtn').textContent = 'Speichern';
  } else {
    const ev = isExisting ? p.events[evIdx] : null;
    typeEl.disabled = false;
    typeEl.value = ev?.type || 'OCCU';
    document.getElementById('ef-val').value   = ev?.value || '';
    document.getElementById('ef-etype').value = ev?.eventType || '';
    fillDateFields('ef-date-qual', 'ef-date', 'ef-date2', ev?.date || '');
    document.getElementById('ef-place').value = ev?.place || '';
    document.getElementById('ef-cause').value = '';
    document.getElementById('ef-addr').value  = ev?.addr  || '';
    initSrcWidget('ef', ev?.sources || [], ev?.sourcePages || {}, ev?.sourceQUAY || {});
    _efMedia = (ev?.media || []).map(m => ({...m}));
    _renderEfMedia();
    document.querySelector('#modalEvent .sheet-title').textContent = ev ? 'Ereignis bearbeiten' : 'Ereignis hinzufügen';
    document.getElementById('saveEventBtn').textContent = ev ? 'Speichern' : 'Hinzufügen';
  }
  onEventTypeChange();  // already calls _updateEventTypeDatalist for current tag
  document.getElementById('deleteEventBtn').style.display = isExisting ? '' : 'none';
  openModal('modalEvent');
}

function saveEvent() {
  const pid = document.getElementById('ef-pid').value;
  const p = AppState.db.individuals[pid];
  if (!p) return;
  const type = document.getElementById('ef-type').value;

  // Koordinaten aus Ortsregister — lati/long sind Attribut des Ortes, nicht des Ereignisses
  const _geoFromPlace = placeName => {
    if (!placeName) return { lati: null, long: null };
    const pl = collectPlaces().get(placeName.trim());
    return { lati: pl?.lati ?? null, long: pl?.long ?? null };
  };

  if (type in _SPECIAL_OBJ) {
    const key = _SPECIAL_OBJ[type];
    const place = getPlaceFromForm('ef-place');
    p[key] = { ...(p[key] || {}),
      date:        buildGedDateFromFields('ef-date-qual', 'ef-date', 'ef-date2'),
      place,
      ..._geoFromPlace(place),
      sources:     [...(srcWidgetState['ef']?.ids   || [])],
      sourcePages: { ...(srcWidgetState['ef']?.pages || {}) },
      sourceQUAY:  { ...(srcWidgetState['ef']?.quay  || {}) }
    };
    if (type === 'DEAT') p[key].cause = document.getElementById('ef-cause').value.trim();
  } else {
    const evIdxRaw = document.getElementById('ef-evidx').value;
    const evIdx    = evIdxRaw !== '' ? parseInt(evIdxRaw) : null;
    const place    = getPlaceFromForm('ef-place');
    const ev = {
      type,
      value:      document.getElementById('ef-val').value.trim(),
      date:       buildGedDateFromFields('ef-date-qual', 'ef-date', 'ef-date2'),
      place,
      addr:       document.getElementById('ef-addr').value.trim(),
      eventType:  (t => { _registerEventType(type, t); return t; })(document.getElementById('ef-etype').value.trim()),
      note:       evIdx !== null ? (p.events[evIdx]?.note || '') : '',
      ..._geoFromPlace(place),
      sources:    [...(srcWidgetState['ef']?.ids   || [])],
      sourcePages: { ...(srcWidgetState['ef']?.pages || {}) },
      sourceQUAY:  { ...(srcWidgetState['ef']?.quay  || {}) },
      media:      _efMedia.filter(m => m.file || m.title).map(m => ({...m}))
    };
    if (evIdx !== null && p.events[evIdx]) {
      p.events[evIdx] = ev;
    } else {
      p.events.push(ev);
    }
  }

  _rebuildPersonSourceRefs(p);
  closeModal('modalEvent');
  markChanged(); updateStats();
  showToast('✓ Ereignis gespeichert');
  if (AppState.currentPersonId === pid) showDetail(pid);
}

function deleteEvent() {
  const pid = document.getElementById('ef-pid').value;
  const evIdxRaw = document.getElementById('ef-evidx').value;
  if (!evIdxRaw) return;
  const evIdx = parseInt(evIdxRaw);
  const p = AppState.db.individuals[pid];
  if (!p?.events) return;
  p.events.splice(evIdx, 1);
  _rebuildPersonSourceRefs(p);
  closeModal('modalEvent');
  markChanged(); updateStats();
  showToast('Ereignis gelöscht');
  if (AppState.currentPersonId === pid) showDetail(pid);
}

// ─────────────────────────────────────
//  FORMS: FAMILY EVENTS (MARR / ENGA / DIV / DIVF / EVEN)
// ─────────────────────────────────────
const _FAM_EV_LABELS = { marr:'Heirat', engag:'Verlobung', div:'Scheidung', divf:'Scheidungsantrag' };
// Mapping: interner Schlüssel → GEDCOM-Tag und umgekehrt
const _FAM_TYPE_MAP  = { marr:'MARR', engag:'ENGA', div:'DIV', divf:'DIVF' };
const _FAM_KEY_MAP   = { MARR:'marr', ENGA:'engag', DIV:'div', DIVF:'divf' };

function onFamEventTypeChange() {
  const t = document.getElementById('fev-type').value;
  document.getElementById('fev-etype-group').style.display = (t === 'EVEN') ? '' : 'none';
  const dd = document.getElementById('fev-etype-dd');
  if (dd) { dd.innerHTML = ''; dd.style.display = 'none'; }
}

function showFamEventForm(famId, evKey, evIdxRaw) {
  const f = AppState.db.families[famId];
  if (!f) return;
  document.getElementById('fev-fid').value   = famId;
  document.getElementById('fev-key').value   = evKey   || '';
  document.getElementById('fev-evidx').value = evIdxRaw != null ? evIdxRaw : '';
  const typeEl = document.getElementById('fev-type');

  initPlaceMode('fev-place');
  if (!evKey) {
    // Neues Ereignis — Typ wählbar
    typeEl.value    = 'MARR';
    typeEl.disabled = false;
    document.getElementById('fev-etype').value = '';
    fillDateFields('fev-date-qual', 'fev-date', null, '');
    document.getElementById('fev-place').value = '';
    initSrcWidget('fev', [], {}, {});
    document.getElementById('famEventFormTitle').textContent = 'Ereignis hinzufügen';
    document.getElementById('saveFamEventBtn').textContent   = 'Hinzufügen';
    document.getElementById('deleteFamEventBtn').style.display = 'none';
  } else if (evKey === 'ev') {
    // Generisches Ereignis aus f.events[]
    const evIdx = parseInt(evIdxRaw);
    const ev = (f.events || [])[evIdx] || {};
    typeEl.value    = ev.type || 'EVEN';
    typeEl.disabled = false;
    document.getElementById('fev-etype').value = ev.eventType || '';
    fillDateFields('fev-date-qual', 'fev-date', null, ev.date || '');
    document.getElementById('fev-place').value = ev.place || '';
    initSrcWidget('fev', ev.sources || [], ev.sourcePages || {}, ev.sourceQUAY || {});
    document.getElementById('famEventFormTitle').textContent = 'Ereignis bearbeiten';
    document.getElementById('saveFamEventBtn').textContent   = 'Speichern';
    document.getElementById('deleteFamEventBtn').style.display = '';
  } else {
    // Bestehendes Sonderereignis (marr / engag / div / divf) — Typ gesperrt
    const ev = f[evKey] || {};
    typeEl.value    = _FAM_TYPE_MAP[evKey] || evKey.toUpperCase();
    typeEl.disabled = true;
    document.getElementById('fev-etype').value = '';
    fillDateFields('fev-date-qual', 'fev-date', null, ev.date || '');
    document.getElementById('fev-place').value = ev.place || '';
    initSrcWidget('fev', ev.sources || [], ev.sourcePages || {}, ev.sourceQUAY || {});
    document.getElementById('famEventFormTitle').textContent = (_FAM_EV_LABELS[evKey] || evKey) + ' bearbeiten';
    document.getElementById('saveFamEventBtn').textContent   = 'Speichern';
    document.getElementById('deleteFamEventBtn').style.display = (ev.date || ev.place || ev.seen) ? '' : 'none';
  }
  onFamEventTypeChange();  // already calls _updateEventTypeDatalist for current tag
  openModal('modalFamEvent');
}

function saveFamEvent() {
  const famId    = document.getElementById('fev-fid').value;
  const evKey    = document.getElementById('fev-key').value;
  const evIdxRaw = document.getElementById('fev-evidx').value;
  const f = AppState.db.families[famId];
  if (!f) return;
  const type  = document.getElementById('fev-type').value;
  const date  = buildGedDateFromFields('fev-date-qual', 'fev-date', null);
  const place = getPlaceFromForm('fev-place');
  const etype = document.getElementById('fev-etype').value.trim();
  _registerEventType(type, etype);
  const sources     = [...(srcWidgetState['fev']?.ids   || [])];
  const sourcePages = { ...(srcWidgetState['fev']?.pages || {}) };
  const sourceQUAY  = { ...(srcWidgetState['fev']?.quay  || {}) };

  if (evKey === 'ev') {
    // Generisches Ereignis bearbeiten
    const evIdx = evIdxRaw !== '' ? parseInt(evIdxRaw) : null;
    const ev = {
      ...((evIdx !== null ? (f.events || [])[evIdx] : null) || {}),
      type, eventType: etype, value: '',
      date, place, sources, sourcePages, sourceQUAY
    };
    if (evIdx !== null && (f.events || [])[evIdx]) {
      f.events[evIdx] = ev;
    } else {
      f.events = f.events || [];
      f.events.push(ev);
    }
  } else if (!evKey) {
    // Neues Ereignis anlegen
    const targetKey = _FAM_KEY_MAP[type];
    if (targetKey) {
      f[targetKey] = {
        ...(f[targetKey] || {}),
        date, place, seen: !!(date || place), sources, sourcePages, sourceQUAY
      };
    } else {
      // Generisches Ereignis (EVEN) → f.events[]
      f.events = f.events || [];
      f.events.push({
        type, eventType: etype, value: '', date, place,
        sources, sourcePages, sourceQUAY,
        note: '', lati: null, long: null, _extra: []
      });
    }
  } else {
    // Bestehendes Sonderereignis
    f[evKey] = {
      ...(f[evKey] || {}),
      date, place, seen: !!(date || place), sources, sourcePages, sourceQUAY
    };
  }
  _rebuildFamilySourceRefs(f);
  closeModal('modalFamEvent');
  markChanged(); updateStats();
  showToast('✓ Ereignis gespeichert');
  if (AppState.currentFamilyId === famId) showFamilyDetail(famId);
}

function deleteFamEvent() {
  const famId    = document.getElementById('fev-fid').value;
  const evKey    = document.getElementById('fev-key').value;
  const evIdxRaw = document.getElementById('fev-evidx').value;
  const f = AppState.db.families[famId];
  if (!f) return;
  if (evKey === 'ev') {
    const evIdx = parseInt(evIdxRaw);
    if (!isNaN(evIdx)) f.events.splice(evIdx, 1);
  } else {
    f[evKey] = { ...(f[evKey] || {}), date: '', place: '', seen: false, sources: [], sourcePages: {}, sourceQUAY: {} };
  }
  _rebuildFamilySourceRefs(f);
  closeModal('modalFamEvent');
  markChanged(); updateStats();
  showToast('Ereignis gelöscht');
  if (AppState.currentFamilyId === famId) showFamilyDetail(famId);
}

// Autocomplete für Event-TYPE-Felder — hier initialisieren, da _initEtypeAutocomplete hier definiert ist
_initEtypeAutocomplete('ef-etype',  'ef-etype-dd',  () => document.getElementById('ef-type')?.value  || '');
_initEtypeAutocomplete('fev-etype', 'fev-etype-dd', () => document.getElementById('fev-type')?.value || '');

// ─────────────────────────────────────
//  ADRESS-AUTOCOMPLETE (RESI)
// ─────────────────────────────────────
function collectAddresses() {
  const set = new Set();
  Object.values(AppState.db.individuals || {}).forEach(p => {
    (p.events || []).forEach(ev => {
      if (ev.type === 'RESI' && ev.addr && ev.addr.trim()) set.add(ev.addr.trim());
    });
  });
  return [...set].sort((a, b) => a.localeCompare(b, 'de'));
}

// Ermittelt den häufigsten Ort (PLAC) zu einer gegebenen Adresse
function _addrToPlace(addr) {
  const counts = {};
  Object.values(AppState.db.individuals || {}).forEach(p => {
    (p.events || []).forEach(ev => {
      if (ev.type === 'RESI' && ev.addr && ev.addr.trim() === addr && ev.place && ev.place.trim())
        counts[ev.place.trim()] = (counts[ev.place.trim()] || 0) + 1;
    });
  });
  const entries = Object.entries(counts);
  if (!entries.length) return '';
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function initAddrAutocomplete() {
  const input = document.getElementById('ef-addr');
  const dd    = document.getElementById('ef-addr-dd');
  if (!input || !dd) return;

  const _search = debounce(() => {
    const q = input.value.toLowerCase().trim();
    dd.innerHTML = '';
    if (!q) { dd.style.display = 'none'; return; }
    const addrs = collectAddresses()
      .filter(a => a.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStart = a.toLowerCase().startsWith(q);
        const bStart = b.toLowerCase().startsWith(q);
        if (aStart !== bStart) return aStart ? -1 : 1;
        return a.localeCompare(b, 'de');
      })
      .slice(0, 12);
    if (!addrs.length) { dd.style.display = 'none'; return; }
    addrs.forEach(addr => {
      const item = document.createElement('div');
      item.className = 'place-dropdown-item';
      item.style.whiteSpace = 'pre-wrap';
      item.textContent = addr;
      item.addEventListener('mousedown', () => {
        input.value = addr;
        dd.innerHTML = ''; dd.style.display = 'none';
        // PLAC auto-fill: häufigster Ort zu dieser Adresse
        const place = _addrToPlace(addr);
        if (place) {
          const placeInput = document.getElementById('ef-place');
          if (placeInput && !placeInput.value) placeInput.value = place;
        }
      });
      dd.appendChild(item);
    });
    dd.style.display = 'block';
  }, 150);

  input.addEventListener('input', () => {
    if (!input.value.trim()) { dd.innerHTML = ''; dd.style.display = 'none'; return; }
    _search();
  });
  input.addEventListener('blur',  () => setTimeout(() => { dd.style.display = 'none'; }, 150));
  input.addEventListener('focus', () => { if (dd.children.length) dd.style.display = 'block'; });
}

initAddrAutocomplete();
