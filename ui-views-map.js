// ─────────────────────────────────────
//  KARTEN-ANSICHT  (ui-views-map.js)
//  Leaflet 1.9.4 (lokal)
// ─────────────────────────────────────

let _leafletMap       = null;   // Leaflet-Instanz
let _mapMarkerLayer   = null;   // L.LayerGroup für Marker
let _mapLineLayer     = null;   // L.LayerGroup für Biografie-Linie
let _mapMode          = 'orte'; // 'orte' | 'person'
let _mapPersonId      = null;   // aktive Person im Biografie-Modus
let _placePersonIndex = null;   // cache: placeName → [{personId, role, date}]

// ─────────────────────────────────────
//  PLACE-PERSON-INDEX
// ─────────────────────────────────────
function _buildPlacePersonIndex() {
  if (_placePersonIndex) return _placePersonIndex;
  const idx = {};

  function add(placeName, personId, role, date) {
    if (!placeName || !personId) return;
    const key = placeName.trim();
    if (!idx[key]) idx[key] = [];
    idx[key].push({ personId, role, date: date || '' });
  }

  for (const p of Object.values(AppState.db.individuals)) {
    add(p.birth.place, p.id, 'Geburt',     p.birth.date);
    add(p.death.place, p.id, 'Tod',        p.death.date);
    add(p.chr.place,   p.id, 'Taufe',      p.chr.date);
    add(p.buri.place,  p.id, 'Beerdigung', p.buri.date);
    for (const ev of p.events)
      add(ev.place, p.id, ev.eventType || EVENT_LABELS[ev.type] || ev.type || 'Ereignis', ev.date);
  }
  for (const f of Object.values(AppState.db.families)) {
    if (!f.marr.place) continue;
    if (f.husb) add(f.marr.place, f.husb, 'Heirat', f.marr.date);
    if (f.wife) add(f.marr.place, f.wife, 'Heirat', f.marr.date);
  }

  _placePersonIndex = idx;
  return idx;
}

// Cache nach Datenänderung zurücksetzen
function invalidatePlacePersonIndex() {
  _placePersonIndex = null;
}

// ─────────────────────────────────────
//  LEAFLET INITIALISIEREN
// ─────────────────────────────────────
function _ensureMap() {
  if (_leafletMap) return;
  _leafletMap = L.map('map-leaflet', {
    center: [51.5, 10.0],
    zoom: 6,
    zoomControl: true,
    attributionControl: true,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(_leafletMap);

  _mapMarkerLayer = L.layerGroup().addTo(_leafletMap);
  _mapLineLayer   = L.layerGroup().addTo(_leafletMap);

  _updateMapOfflineBanner();
  window.addEventListener('online',  _updateMapOfflineBanner);
  window.addEventListener('offline', _updateMapOfflineBanner);
}

function _updateMapOfflineBanner() {
  const el = document.getElementById('map-offline-banner');
  if (el) el.style.display = navigator.onLine ? 'none' : 'flex';
}

// ─────────────────────────────────────
//  HAUPTEINSTIEG
// ─────────────────────────────────────
function initOrRefreshPlaceMap() {
  _ensureMap();
  setTimeout(() => {
    if (!_leafletMap) return;
    _leafletMap.invalidateSize();
    _initMapPersonPicker();
    _renderMap();
    // Safari: nochmaliges invalidateSize nach vollständigem Layout
    setTimeout(() => _leafletMap?.invalidateSize(), 300);
  }, 100);
}

function _renderMap() {
  if (_mapMode === 'orte') _renderOrteModus();
  else                     _renderPersonModus(_mapPersonId);
}

// ─────────────────────────────────────
//  MODUS-WECHSEL
// ─────────────────────────────────────
function switchMapMode(mode) {
  _mapMode = mode;
  document.getElementById('map-mode-orte')  ?.classList.toggle('active', mode === 'orte');
  document.getElementById('map-mode-person')?.classList.toggle('active', mode === 'person');
  document.getElementById('map-person-picker').style.display = mode === 'person' ? '' : 'none';
  document.getElementById('map-explore-panel').style.display = 'none';
  _renderMap();
}

// ─────────────────────────────────────
//  MODUS 1: ALLE ORTE
// ─────────────────────────────────────
function _renderOrteModus() {
  _mapMarkerLayer.clearLayers();
  _mapLineLayer.clearLayers();

  const places = collectPlaces();
  const idx    = _buildPlacePersonIndex();
  const bounds = [];

  for (const place of places.values()) {
    const lat = parseFloat(place.lati);
    const lng = parseFloat(place.long);
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) continue;

    const count  = place.personIds.size;
    const radius = count >= 20 ? 11 : count >= 5 ? 7 : 4;
    const fill   = count >= 20 ? '#c8a84a' : count >= 5 ? '#9a7030' : '#6a5020';

    const marker = L.circleMarker([lat, lng], {
      radius,
      fillColor:   fill,
      color:       '#1a140a',
      weight:      1.5,
      opacity:     1,
      fillOpacity: 0.85,
    });

    marker.on('click', () => {
      _showExplorationPanel(place.name, idx[place.name] || []);
    });

    const name  = compactPlace(place.name);
    const label = `${count} Person${count !== 1 ? 'en' : ''}`;
    marker.bindTooltip(`${_mesc(name)} · ${label}`, { direction: 'top', offset: [0, -radius] });

    marker.addTo(_mapMarkerLayer);
    bounds.push([lat, lng]);
  }

  if (!bounds.length) {
    showToast('Keine Orte mit Koordinaten vorhanden');
    return;
  }
  _leafletMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 10 });
}

// ─────────────────────────────────────
//  EXPLORATION-PANEL
// ─────────────────────────────────────
function _showExplorationPanel(placeName, entries) {
  const panel = document.getElementById('map-explore-panel');
  if (!panel) return;

  const seen = new Set();
  const rows = [];
  for (const e of entries) {
    const p   = AppState.db.individuals[e.personId];
    const key = e.personId + '|' + e.role;
    if (!p || seen.has(key)) continue;
    seen.add(key);
    rows.push({ p, role: e.role, date: e.date });
  }
  rows.sort((a, b) => (a.p.name || '').localeCompare(b.p.name || '', 'de'));

  let html = `<div class="map-panel-header">
    <span class="map-panel-title">${_mesc(compactPlace(placeName))}</span>
    <button class="map-panel-close" data-action="closeMapPanel">✕</button>
  </div><div class="map-panel-list">`;

  for (const r of rows) {
    const sex   = r.p.sex || 'U';
    const years = _mapPersonYears(r.p);
    html += `<div class="person-row map-panel-row" data-action="showDetail" data-pid="${r.p.id}">
      <div class="p-avatar sex-${sex.toLowerCase()}">${sex === 'F' ? '♀' : sex === 'M' ? '♂' : '⚬'}</div>
      <div class="p-info">
        <div class="p-name">${_mesc(r.p.name || '–')}</div>
        <div class="p-meta">${_mesc(r.role)}${r.date ? ' · ' + _mesc(r.date) : ''}${years ? '  ' + years : ''}</div>
      </div>
      <span class="p-arrow">›</span>
    </div>`;
  }
  if (!rows.length) html += '<div class="empty">Keine Personen verknüpft</div>';
  html += '</div>';

  panel.innerHTML = html;
  panel.style.display = '';
}

function _showPersonEventsAtPlace(p, placeName, allEvs) {
  const panel = document.getElementById('map-explore-panel');
  if (!panel) return;
  const eventsHere = allEvs.filter(e => e.place === placeName);
  const sex = p.sex || 'U';
  let html = `<div class="map-panel-header">
    <span class="map-panel-title">${_mesc(compactPlace(placeName))}</span>
    <button class="map-panel-close" data-action="closeMapPanel">✕</button>
  </div><div class="map-panel-list">
    <div class="person-row map-panel-row" data-action="showDetail" data-pid="${p.id}">
      <div class="p-avatar sex-${sex.toLowerCase()}">${sex === 'F' ? '♀' : sex === 'M' ? '♂' : '⚬'}</div>
      <div class="p-info"><div class="p-name">${_mesc(p.name || '–')}</div></div>
      <span class="p-arrow">›</span>
    </div>`;
  for (const e of eventsHere) {
    const meta = [e.date, e.addr ? _mesc(e.addr) : ''].filter(Boolean).join(' · ');
    html += `<div class="person-row" style="padding-left:52px;cursor:default">
      <div class="p-info">
        <div class="p-name" style="font-size:0.9rem">${_mesc(e.role)}</div>
        ${meta ? `<div class="p-meta">${meta}</div>` : ''}
        ${e.note ? `<div class="p-meta" style="font-style:italic">${_mesc(e.note)}</div>` : ''}
      </div>
    </div>`;
  }
  html += '</div>';
  panel.innerHTML = html;
  panel.style.display = '';
}

function _mapPersonYears(p) {
  const by = p.birth?.date ? p.birth.date.match(/\b(\d{4})\b/)?.[1] : null;
  const dy = p.death?.date ? p.death.date.match(/\b(\d{4})\b/)?.[1] : null;
  if (by || dy) return `(${by || '?'}–${dy || ''})`;
  return '';
}

// ─────────────────────────────────────
//  MODUS 2: PERSONENBIOGRAFIE
// ─────────────────────────────────────
function _renderPersonModus(personId) {
  _mapMarkerLayer.clearLayers();
  _mapLineLayer.clearLayers();
  document.getElementById('map-explore-panel').style.display = 'none';
  if (!personId) return;

  const p = AppState.db.individuals[personId];
  if (!p) return;

  const evs = _personGeoEvents(p);
  if (!evs.length) {
    showToast('Keine Koordinaten für diese Person vorhanden');
    return;
  }

  const bounds  = [];
  const latLngs = [];

  evs.forEach((ev, i) => {
    latLngs.push([ev.lat, ev.lng]);
    bounds.push([ev.lat, ev.lng]);

    const icon = L.divIcon({
      className: '',
      html: `<div class="map-bio-marker">${i + 1}</div>`,
      iconSize:   [22, 22],
      iconAnchor: [11, 11],
    });

    const marker = L.marker([ev.lat, ev.lng], { icon });
    marker.bindTooltip(
      `<b>${i + 1}. ${_mesc(ev.role)}</b><br>${_mesc(compactPlace(ev.place))}${ev.date ? '<br>' + _mesc(ev.date) : ''}`,
      { direction: 'top', offset: [0, -12] }
    );
    // Klick: alle Ereignisse der ausgewählten Person an diesem Ort
    marker.on('click', () => _showPersonEventsAtPlace(p, ev.place, evs));
    marker.addTo(_mapMarkerLayer);
  });

  if (latLngs.length > 1) {
    L.polyline(latLngs, {
      color:     '#c8a84a',
      weight:    2,
      opacity:   0.55,
      dashArray: '6, 5',
    }).addTo(_mapLineLayer);
  }

  _leafletMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
}

function _personGeoEvents(p) {
  const evs = [];

  function addEv(place, lati, long, date, role, note, addr) {
    const lat = parseFloat(lati);
    const lng = parseFloat(long);
    if (!place || !lat || !lng || isNaN(lat) || isNaN(lng)) return;
    evs.push({ place, lat, lng, date: date || '', role, note: note || '', addr: addr || '' });
  }

  addEv(p.birth.place, p.birth.lati, p.birth.long, p.birth.date, 'Geburt',     p.birth.note);
  addEv(p.chr.place,   p.chr.lati,   p.chr.long,   p.chr.date,   'Taufe',      p.chr.note);
  for (const ev of p.events)
    addEv(ev.place, ev.lati, ev.long, ev.date,
          ev.eventType || EVENT_LABELS[ev.type] || ev.type || 'Ereignis',
          ev.note, ev.addr);
  addEv(p.death.place, p.death.lati, p.death.long, p.death.date, 'Tod',        p.death.note);
  addEv(p.buri.place,  p.buri.lati,  p.buri.long,  p.buri.date,  'Beerdigung', p.buri.note);

  evs.sort((a, b) => {
    const ya = a.date.match(/\b(\d{4})\b/)?.[1] || '9999';
    const yb = b.date.match(/\b(\d{4})\b/)?.[1] || '9999';
    return ya.localeCompare(yb);
  });
  return evs;
}

// ─────────────────────────────────────
//  PERSON-PICKER MODAL
// ─────────────────────────────────────
function _initMapPersonPicker() {
  // Direkter Listener als Safari-Fallback (data-action-Delegation reicht nicht immer)
  const btn = document.getElementById('map-person-btn');
  if (btn && !btn._mapPickerBound) {
    btn.addEventListener('click', () => openMapPersonPicker());
    btn._mapPickerBound = true;
  }
}

function openMapPersonPicker() {
  _renderMapPersonList('');
  document.getElementById('mapPersonSearch').value = '';
  openModal('modalMapPerson');
  setTimeout(() => document.getElementById('mapPersonSearch')?.focus(), 120);
}

function filterMapPersonList() {
  _renderMapPersonList(document.getElementById('mapPersonSearch')?.value || '');
}

function _renderMapPersonList(filter) {
  const q = filter.toLowerCase().trim();
  const persons = Object.values(AppState.db.individuals)
    .filter(p => !q || (p.name || '').toLowerCase().includes(q));

  // Sortierung: Name alphabetisch, dann Geburtsjahr
  persons.sort((a, b) => {
    const nc = (a.name || '').localeCompare(b.name || '', 'de');
    if (nc !== 0) return nc;
    const ya = a.birth?.date?.match(/\b(\d{4})\b/)?.[1] || '9999';
    const yb = b.birth?.date?.match(/\b(\d{4})\b/)?.[1] || '9999';
    return ya.localeCompare(yb);
  });

  const list = document.getElementById('mapPersonList');
  if (!list) return;
  if (!persons.length) {
    list.innerHTML = '<div class="empty" style="padding:16px">Keine Person gefunden</div>';
    return;
  }
  list.innerHTML = persons.map(p => {
    const sex  = p.sex || 'U';
    const by   = p.birth?.date?.match(/\b(\d{4})\b/)?.[1] || '';
    const dy   = p.death?.date?.match(/\b(\d{4})\b/)?.[1] || '';
    const years = by || dy ? `(${by || '?'}–${dy || ''})` : '';
    return `<div class="person-row" style="cursor:pointer" data-action="selectMapPerson" data-pid="${p.id}">
      <div class="p-avatar sex-${sex.toLowerCase()}">${sex === 'F' ? '♀' : sex === 'M' ? '♂' : '⚬'}</div>
      <div class="p-info">
        <div class="p-name">${_mesc(p.name || p.id)}</div>
        ${years ? `<div class="p-meta">${years}</div>` : ''}
      </div>
      <span class="p-arrow">›</span>
    </div>`;
  }).join('');
}

function selectMapPerson(personId) {
  _mapPersonId = personId;
  const p = AppState.db.individuals[personId];
  const btn = document.getElementById('map-person-btn');
  if (btn) btn.textContent = p?.name || personId;
  closeModal('modalMapPerson');
  _renderPersonModus(_mapPersonId);
}

// ─────────────────────────────────────
//  EINSTIEG VON PERSONEN-DETAIL
// ─────────────────────────────────────
function showPersonOnMap(personId) {
  _mapMode     = 'person';
  _mapPersonId = personId;
  bnavTab('places');
  switchPlacesSubTab('karte');
  setTimeout(() => {
    const p   = AppState.db.individuals[personId];
    const btn = document.getElementById('map-person-btn');
    if (btn && p) btn.textContent = p.name || personId;
    switchMapMode('person');
  }, 120);
}

// ─────────────────────────────────────
//  HILFSFUNKTIONEN
// ─────────────────────────────────────
function _mesc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
