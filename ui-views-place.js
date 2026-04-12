// ─────────────────────────────────────
//  PLACE LIST
// ─────────────────────────────────────
function collectPlaces() {
  if (UIState._placesCache) return UIState._placesCache;
  const places = new Map();

  function addPlace(placeName, personId, eventType, lati, long) {
    if (!placeName || !placeName.trim()) return;
    const key = placeName.trim();
    if (!places.has(key)) places.set(key, { name: key, personIds: new Set(), eventTypes: new Set(), lati: null, long: null });
    const pl = places.get(key);
    if (personId) pl.personIds.add(personId);
    if (eventType) pl.eventTypes.add(eventType);
    // Store first found geo coords
    if (pl.lati === null && lati !== null && lati !== undefined) { pl.lati = lati; pl.long = long; }
  }

  for (const p of Object.values(AppState.db.individuals)) {
    addPlace(p.birth.place, p.id, 'Geburt', p.birth.lati, p.birth.long);
    addPlace(p.death.place, p.id, 'Tod', p.death.lati, p.death.long);
    addPlace(p.chr.place,   p.id, 'Taufe', p.chr.lati, p.chr.long);
    addPlace(p.buri.place,  p.id, 'Beerdigung', p.buri.lati, p.buri.long);
    for (const ev of p.events) addPlace(ev.place, p.id, ev.eventType || ev.type, ev.lati, ev.long);
  }
  for (const f of Object.values(AppState.db.families)) {
    addPlace(f.marr.place, f.husb, 'Heirat', f.marr.lati, f.marr.long);
    addPlace(f.marr.place, f.wife, 'Heirat', f.marr.lati, f.marr.long);
  }
  // Manuell gesetzte Koordinaten (extraPlaces) einmischen — haben Vorrang vor GEDCOM-Werten
  for (const ep of Object.values(AppState.db.extraPlaces)) {
    if (!places.has(ep.name)) {
      places.set(ep.name, { name: ep.name, personIds: new Set(), eventTypes: new Set(), lati: ep.lati ?? null, long: ep.long ?? null });
    } else if (ep.lati !== null && ep.lati !== undefined) {
      const pl = places.get(ep.name);
      pl.lati = ep.lati;
      pl.long = ep.long;
    }
  }
  UIState._placesCache = places;
  return places;
}

function renderPlaceList(sorted) {
  const el = document.getElementById('placeList');
  if (!sorted) {
    const places = collectPlaces();
    if (!places.size) { el.innerHTML = '<div class="empty">Keine Orte in den Daten gefunden</div>'; return; }
    sorted = [...places.values()].sort((a, b) => compactPlace(a.name).localeCompare(compactPlace(b.name), 'de'));
  }
  if (!sorted.length) { el.innerHTML = '<div class="empty">Keine Orte gefunden</div>'; return; }

  let html = '';
  let lastLetter = '';
  for (const place of sorted) {
    const fl = (compactPlace(place.name) || place.name)[0].toUpperCase();
    if (fl !== lastLetter) { html += `<div class="alpha-sep">${fl}</div>`; lastLetter = fl; }
    const count = place.personIds.size;
    const hasGeo = place.lati !== null;
    const geoIcon = hasGeo ? '📍' : '·';
    html += `<div class="person-row" data-action="showPlaceDetail" data-name="${esc(place.name)}">
      <div class="p-avatar" style="font-size:1.1rem">${geoIcon}</div>
      <div class="p-info">
        <div class="p-name">${esc(compactPlace(place.name))}</div>
        <div class="p-meta">${count} Person${count !== 1 ? 'en' : ''}${hasGeo ? ' · Karte verfügbar' : ''}</div>
      </div>
      <span class="p-arrow">›</span>
    </div>`;
  }
  el.innerHTML = html;
}

function filterPlaces(q) {
  const lower = q.toLowerCase().trim();
  const all = [...collectPlaces().values()].sort((a, b) => compactPlace(a.name).localeCompare(compactPlace(b.name), 'de'));
  if (!lower) { renderPlaceList(all); return; }
  renderPlaceList(all.filter(pl => pl.name.toLowerCase().includes(lower)));
}

function showPlaceForm(placeName) {
  document.getElementById('pl-old').value  = placeName;
  document.getElementById('pl-name').value = placeName;
  // Bestehende Koordinaten laden — aus extraPlaces oder aus collectPlaces-Cache
  const ep = AppState.db.extraPlaces[placeName];
  const pl = collectPlaces().get(placeName);
  const lati = ep?.lati ?? pl?.lati ?? null;
  const long = ep?.long ?? pl?.long ?? null;
  document.getElementById('pl-lati').value = lati != null ? String(lati) : '';
  document.getElementById('pl-long').value = long != null ? String(long) : '';
  openModal('modalPlace');
}

function savePlace() {
  const oldName = document.getElementById('pl-old').value;
  const newName = document.getElementById('pl-name').value.trim();
  if (!newName) { showToast('⚠ Ortsname darf nicht leer sein'); return; }
  const latiRaw = document.getElementById('pl-lati').value.trim();
  const longRaw = document.getElementById('pl-long').value.trim();
  const lati = latiRaw ? (parseGeoCoord(latiRaw) ?? (parseFloat(latiRaw) || null)) : null;
  const long = longRaw ? (parseGeoCoord(longRaw) ?? (parseFloat(longRaw) || null)) : null;
  closeModal('modalPlace');

  // Ortsnamen in allen Einträgen umbenennen
  if (newName !== oldName) {
    for (const p of Object.values(AppState.db.individuals)) {
      if (p.birth.place  === oldName) p.birth.place  = newName;
      if (p.chr.place    === oldName) p.chr.place    = newName;
      if (p.death.place  === oldName) p.death.place  = newName;
      if (p.buri.place   === oldName) p.buri.place   = newName;
      for (const ev of p.events) if (ev.place === oldName) ev.place = newName;
    }
    for (const f of Object.values(AppState.db.families)) {
      if (f.marr.place   === oldName) f.marr.place   = newName;
      if (f.engag?.place === oldName) f.engag.place  = newName;
    }
  }

  // Koordinaten in extraPlaces speichern (Eintrag anlegen wenn noch nicht vorhanden)
  const existing = AppState.db.extraPlaces[oldName] || {};
  const updated = { ...existing, name: newName, lati, long };
  if (newName !== oldName) delete AppState.db.extraPlaces[oldName];
  AppState.db.extraPlaces[newName] = updated;
  saveExtraPlaces();

  UIState._placesCache = null;
  markChanged();
  showToast('✓ Ort gespeichert');
  showPlaceDetail(newName);
}

function showNewPlaceForm() {
  document.getElementById('np-name').value = '';
  document.getElementById('np-lati').value = '';
  document.getElementById('np-long').value = '';
  openModal('modalNewPlace');
}

function saveNewPlace() {
  const name = document.getElementById('np-name').value.trim();
  if (!name) { showToast('⚠ Ortsname erforderlich'); return; }
  if (collectPlaces().has(name)) { showToast('⚠ Ort bereits vorhanden'); return; }
  const lati = parseFloat(document.getElementById('np-lati').value) || null;
  const long = parseFloat(document.getElementById('np-long').value) || null;
  AppState.db.extraPlaces[name] = { name, lati, long };
  saveExtraPlaces();
  UIState._placesCache = null; // markChanged() wird hier nicht aufgerufen, daher manuell
  closeModal('modalNewPlace');
  showToast('✓ Ort hinzugefügt');
  renderTab();
}

function deleteExtraPlace(name) {
  if (!confirm('Ort wirklich entfernen?')) return;
  delete AppState.db.extraPlaces[name];
  saveExtraPlaces();
  UIState._placesCache = null; // markChanged() wird hier nicht aufgerufen, daher manuell
  goBack();
  showToast('✓ Ort entfernt');
  renderTab();
}

// ─────────────────────────────────────
//  DETAIL: ORT
// ─────────────────────────────────────
function showPlaceDetail(placeName, pushHistory = true) {
  const places = collectPlaces();
  const place = places.get(placeName);
  if (!place) return;
  if (pushHistory) _beforeDetailNavigate();
  AppState.currentPersonId  = null;
  AppState.currentFamilyId  = null;
  AppState.currentSourceId  = null;
  AppState.currentRepoId    = null;
  AppState.currentPlaceName = placeName;
  document.getElementById('detailTopTitle').textContent = '📍 Ort';
  document.getElementById('editBtn').style.display = '';
  document.getElementById('treeBtn').style.display = 'none';

  let html = `<div class="detail-hero fade-up">
    <div class="detail-avatar" style="font-size:1.8rem; border-color:var(--gold-dim)">📍</div>
    <div class="detail-name">${esc(compactPlace(placeName))}</div>
    <div class="detail-id">${place.personIds.size} Person${place.personIds.size !== 1 ? 'en' : ''}</div>
  </div>`;

  // Lösch-Button für manuell hinzugefügte Orte ohne verknüpfte Personen
  if (place.personIds.size === 0 && AppState.db.extraPlaces[placeName]) {
    html += `<div style="padding:4px 0 12px">
      <button class="btn btn-danger" style="width:100%"
        data-action="deleteExtraPlace" data-pname="${placeName.replace(/"/g,'&quot;')}">Ort entfernen</button>
    </div>`;
  }

  // Map link if geo available
  if (place.lati !== null) {
    html += `<div class="section fade-up">
      <div class="section-title">Standort</div>
      <a href="https://maps.apple.com/?ll=${place.lati},${place.long}&q=${encodeURIComponent(placeName)}"
         target="_blank"
         style="display:flex;align-items:center;gap:10px;padding:10px 0;color:var(--gold);text-decoration:none;font-size:0.9rem">
        🗺 In Apple Maps öffnen
        <span style="font-size:0.75rem;color:var(--text-muted)">${place.lati.toFixed(4)}, ${place.long.toFixed(4)}</span>
      </a>
    </div>`;
  }

  // Build detailed list: person + which event connects them to this place
  const entries = [];
  for (const p of Object.values(AppState.db.individuals)) {
    if (p.birth.place && p.birth.place.trim() === placeName)
      entries.push({ person: p, role: 'Geburt' + (p.birth.date ? ' · ' + p.birth.date : '') });
    if (p.death.place && p.death.place.trim() === placeName)
      entries.push({ person: p, role: 'Tod' + (p.death.date ? ' · ' + p.death.date : '') });
    if (p.chr.place && p.chr.place.trim() === placeName)
      entries.push({ person: p, role: 'Taufe' + (p.chr.date ? ' · ' + p.chr.date : '') });
    if (p.buri.place && p.buri.place.trim() === placeName)
      entries.push({ person: p, role: 'Beerdigung' + (p.buri.date ? ' · ' + p.buri.date : '') });
    for (const ev of p.events) {
      if (ev.place && ev.place.trim() === placeName)
        entries.push({ person: p, role: (ev.eventType || EVENT_LABELS[ev.type] || ev.type) + (ev.date ? ' · ' + ev.date : '') });
    }
  }
  for (const f of Object.values(AppState.db.families)) {
    if (f.marr.place && f.marr.place.trim() === placeName) {
      for (const pid of [f.husb, f.wife]) {
        if (!pid) continue;
        const p = AppState.db.individuals[pid];
        if (p) entries.push({ person: p, role: 'Heirat' + (f.marr.date ? ' · ' + f.marr.date : '') });
      }
    }
  }

  entries.sort((a, b) => (a.person.name || '').localeCompare(b.person.name || '', 'de'));

  html += `<div class="section fade-up">
    <div class="section-title">Personen an diesem Ort</div>`;
  for (const e of entries) {
    html += relRow(e.person, e.role);
  }
  html += `</div>`;

  document.getElementById('detailContent').innerHTML = html;
  showView('v-detail');
}
