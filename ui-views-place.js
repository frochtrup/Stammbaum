// ─────────────────────────────────────
//  PLACE LIST
// ─────────────────────────────────────

// P3: Typ-Labels (DE) + Icons
const PLACE_TYPE_LBL = {
  Country:'Land', State:'Bundesland', Region:'Region', Province:'Provinz',
  County:'Kreis', District:'Bezirk', Municipality:'Gemeinde', City:'Stadt',
  Town:'Stadt', Village:'Dorf', Hamlet:'Weiler', Parish:'Pfarrei',
  Borough:'Stadtteil', Locality:'Ortslage', Neighborhood:'Nachbarschaft',
  Building:'Gebäude', Farm:'Hof', Cemetery:'Friedhof', Church:'Kirche', Unknown:'',
};
const PLACE_TYPE_ICON = {
  Church:'⛪', Parish:'⛪', Cemetery:'⚰', Farm:'🏡',
  Village:'🏘', Town:'🏘', City:'🏙', Country:'🌍',
};

let _placeTypeFilter = '';
let _placeDetailMap = null; // P5a-5: Leaflet-Instanz für Mini-Karte im Steckbrief

function setPlaceTypeFilter(val) {
  _placeTypeFilter = val || '';
  const q = document.getElementById('searchPlaces')?.value || '';
  filterPlaces(q);
}

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
  // PLACE-HIST (ADR-024, P0b-1): jeden String-Ort additiv mit seiner Place-Entität
  // verknüpfen (placeId + type) und fehlende Koordinaten aus dem placeObject ziehen.
  // String-Key bleibt unverändert → keine Auswirkung auf bestehende Consumer.
  const _reg = (typeof getPlaceRegistry === 'function') ? getPlaceRegistry() : null;
  if (_reg) {
    for (const pl of places.values()) {
      const id = _reg.findByName(pl.name);
      if (!id) continue;
      const po = _reg.byId[id];
      pl.placeId = id;
      pl.type    = po.type || null;
      if (pl.lati === null && po.lat != null) { pl.lati = po.lat; pl.long = po.long; }
    }
    // Importierte placeObjects ohne GEDCOM-Entsprechung ebenfalls anzeigen
    // (analog extraPlaces — damit manuell importierte Orte sichtbar sind).
    for (const po of Object.values(AppState.db.placeObjects || {})) {
      const key = po.title;
      if (!key) continue;
      if (!places.has(key)) {
        places.set(key, {
          name: key, personIds: new Set(), eventTypes: new Set(),
          lati: po.lat ?? null, long: po.long ?? null,
          placeId: po.id, type: po.type || null,
        });
      }
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
    const typeIcon = (place.type && PLACE_TYPE_ICON[place.type]) ? PLACE_TYPE_ICON[place.type]
                   : hasGeo ? '📍' : '·';
    const typeLbl  = place.type ? (PLACE_TYPE_LBL[place.type] || place.type) : '';
    const typeBadge = typeLbl ? `<span class="place-type-badge">${esc(typeLbl)}</span>` : '';
    html += `<div class="person-row" data-action="showPlaceDetail" data-name="${esc(place.name)}">
      <div class="p-avatar p-avatar--md">${typeIcon}</div>
      <div class="p-info">
        <div class="p-name">${esc(compactPlace(place.name))}${typeBadge}</div>
        <div class="p-meta">${count} Person${count !== 1 ? 'en' : ''}${hasGeo ? ' · Karte' : ''}</div>
      </div>
      <span class="p-arrow">›</span>
    </div>`;
  }
  el.innerHTML = html;
}

function filterPlaces(q) {
  const lower = q.toLowerCase().trim();
  let all = [...collectPlaces().values()].sort((a, b) => compactPlace(a.name).localeCompare(compactPlace(b.name), 'de'));
  if (_placeTypeFilter) all = all.filter(pl => pl.type === _placeTypeFilter);
  if (!lower) { renderPlaceList(all); return; }
  renderPlaceList(all.filter(pl => pl.name.toLowerCase().includes(lower)));
}

// ─── P4: GOV-Text-Parser ─────────────────────────────────────────────────────

const _GOV_TYPE_MAP = {
  'Landgemeinde':'Municipality', 'Gemeinde':'Municipality', 'Verbandsgemeinde':'Municipality',
  'Samtgemeinde':'Municipality', 'Verwaltungsgemeinschaft':'Municipality', 'Amt':'Municipality',
  'Stadt':'Town', 'Stadt (Gebietskörperschaft)':'Town', 'Stadtgemeinde':'Town',
  'Wigbold':'Town', 'Flecken':'Town', 'Marktgemeinde':'Town',
  'Dorf':'Village', 'Kirchdorf':'Village',
  'Weiler':'Hamlet', 'Einöde':'Hamlet',
  'Kirchspiel':'Parish', 'Kirchengemeinde':'Parish', 'Pfarrei':'Parish',
  'Bistum':'Parish', 'Erzbistum':'Parish',
  'Landkreis':'County', 'Kreis':'County', 'Stadtkreis':'County',
  'Regierungsbezirk':'District', 'Bezirk':'District',
  'Provinz':'State', 'Bundesland':'State', 'Land':'State', 'Freistaat':'State',
  'Staat':'Country', 'Königreich':'Country', 'Großherzogtum':'Country',
  'Herzogtum':'Country', 'Fürstentum':'Country', 'Kurfürstentum':'Country',
  'Freie Stadt':'City',
  'Kirche':'Church', 'Friedhof':'Cemetery', 'Hof':'Farm',
};

// Parst GOV-Textzusammenfassung → strukturiertes Objekt
function _parseGovText(raw) {
  const lines = raw.split(/\n/).map(l => l.replace(/^\s+/, '').replace(/[,;]\s*$/, '').trim()).filter(Boolean);
  if (!lines.length) return null;

  const result = { govId: lines[0], types: [], names: [], parents: [], extIds: {}, description: '' };

  // Datum aus "ab DATE bis DATE" / "DATE" extrahieren
  const _date = s => {
    if (!s) return null;
    const m = s.match(/(\d{4}(?:-\d{2}(?:-\d{2})?)?)/);
    return m ? m[1] : null;
  };

  for (const line of lines.slice(1)) {
    // TEXT:...:TEXT
    if (line.startsWith('TEXT:')) {
      result.description = line.replace(/^TEXT:/, '').replace(/:TEXT$/, '').trim();
      continue;
    }
    // gehört [ab DATE] [bis DATE] zu object_XXX
    const mGeh = line.match(/^gehört(?:\s+ab\s+(\S+))?(?:\s+bis\s+(\S+))?\s+(?:\S+\s+)?zu\s+(object_\S+|[A-Z0-9]+)\s+/);
    if (mGeh) {
      result.parents.push({ govObjId: mGeh[3], dateFrom: _date(mGeh[1]), dateTo: _date(mGeh[2]) });
      continue;
    }
    // gehört DATE zu object_XXX (Stichtag ohne ab/bis)
    const mGeh2 = line.match(/^gehört\s+(\S+)\s+zu\s+(object_\S+|[A-Z0-9]+)/);
    if (mGeh2) {
      result.parents.push({ govObjId: mGeh2[2], dateFrom: _date(mGeh2[1]), dateTo: _date(mGeh2[1]) });
      continue;
    }
    // ist [ab DATE] [bis DATE] (auf deu) TYPE
    const mIst = line.match(/^ist(?:\s+ab\s+(\S+))?(?:\s+bis\s+(\S+))?\s+\(auf \w+\)\s+(.+?)(?:\s+sagt|$)/);
    if (mIst) {
      const raw_type = mIst[3].trim();
      result.types.push({ rawType: raw_type, type: _GOV_TYPE_MAP[raw_type] || 'Unknown', dateFrom: _date(mIst[1]), dateTo: _date(mIst[2]) });
      continue;
    }
    // heißt [DATE] (auf LANG) NAME
    const mName = line.match(/^heißt\s+(?:\S+\s+)?\(auf (\w+)\)\s+(.+?)(?:\s+sagt|$)/);
    if (mName) {
      result.names.push({ lang: mName[1], value: mName[2].trim() });
      continue;
    }
    // hat externe Kennung geonames:XXX
    const mExt = line.match(/^hat externe Kennung\s+(\w+):(\S+)/);
    if (mExt) { result.extIds[mExt[1]] = mExt[2]; continue; }
  }
  return result;
}

// Wendet geparste GOV-Daten auf das aktuelle placeObject im Edit-Modal an
function applyGovText() {
  const raw = document.getElementById('pl-gov-text')?.value?.trim();
  if (!raw) { showToast('⚠ Kein GOV-Text eingefügt', 'warn'); return; }

  const parsed = _parseGovText(raw);
  if (!parsed?.govId) { showToast('⚠ GOV-ID nicht erkannt', 'warn'); return; }

  let po = _currentPoFromModal();
  if (!po) {
    // Kein placeObject vorhanden → direkt anlegen (wie savePlace(), aber ohne Formular zu schließen)
    const nameVal = document.getElementById('pl-name')?.value.trim() || document.getElementById('pl-old')?.value.trim();
    if (!nameVal) { showToast('⚠ Erst Ortsname eingeben und speichern', 'warn'); return; }
    const pos = AppState.db.placeObjects || (AppState.db.placeObjects = {});
    const newId = (typeof _epId === 'function') ? _epId(nameVal) : ('_epg_' + Date.now().toString(36));
    pos[newId] = { id: newId, title: nameVal, type: 'Unknown', lat: null, long: null, pnames: [], enclosedBy: [], parentId: null };
    if (document.getElementById('pl-placeId')) document.getElementById('pl-placeId').value = newId;
    UIState._placeRegistry = null;
    po = pos[newId];
  }

  let changes = 0;

  // GOV-ID speichern
  if (!po._govId) { po._govId = parsed.govId; changes++; }

  // Typ: neueste Eintrag ohne dateTo (oder letzter insgesamt)
  const currentType = parsed.types.find(t => !t.dateTo) || parsed.types[parsed.types.length - 1];
  if (currentType && currentType.type !== 'Unknown' && (!po.type || po.type === 'Unknown')) {
    po.type = currentType.type;
    // Typ-Dropdown synchronisieren
    const sel = document.getElementById('pl-type');
    if (sel) sel.value = po.type;
    changes++;
  }

  // Namen: nur neue hinzufügen
  if (!Array.isArray(po.pnames)) po.pnames = [];
  for (const n of parsed.names) {
    const exists = po.pnames.some(p => p.value === n.value && p.lang === n.lang);
    if (!exists) { po.pnames.push({ value: n.value, lang: n.lang, dateFrom: null, dateTo: null, dateType: null, _dateRaw: null }); changes++; }
  }

  // Eltern-Referenzen: Platzhalter-placeObjects anlegen
  const pos = AppState.db.placeObjects || (AppState.db.placeObjects = {});
  if (!Array.isArray(po.enclosedBy)) po.enclosedBy = [];

  for (const parent of parsed.parents) {
    // Schon vorhanden?
    const existsInEnc = po.enclosedBy.some(e => {
      const parentPo = pos[e.placeId];
      return parentPo?._govId === parent.govObjId || parentPo?.title === parent.govObjId;
    });
    if (existsInEnc) continue;

    // Platzhalter suchen oder anlegen
    let parentId = Object.values(pos).find(p => p._govId === parent.govObjId || p.title === parent.govObjId)?.id;
    if (!parentId) {
      parentId = _epId ? _epId(parent.govObjId) : ('_govp_' + parent.govObjId.replace(/\W/g,'_'));
      pos[parentId] = { id: parentId, title: parent.govObjId, type: 'Unknown',
        lat: null, long: null, pnames: [], enclosedBy: [], parentId: null,
        _govId: parent.govObjId, _govUnresolved: true };
    }
    po.enclosedBy.push({ placeId: parentId, dateFrom: parent.dateFrom, dateTo: parent.dateTo, dateType: null, _dateRaw: null });
    changes++;
  }

  if (!po.parentId && po.enclosedBy.length) po.parentId = po.enclosedBy[0].placeId;

  UIState._placeRegistry = null;
  markChanged();
  if (typeof savePlaceObjects === 'function') savePlaceObjects();

  // Textarea leeren + Listen neu rendern
  document.getElementById('pl-gov-text').value = '';
  _renderPlaceNamesList(po);
  _renderEnclosedByList(po);
  showToast(`✓ GOV-Daten übernommen (${changes} Änderungen) — unaufgelöste Eltern-IDs via gov-enrich.py auflösen`);
}

// ─── P4: Geocoding UI ────────────────────────────────────────────────────────

async function geocodeCurrentPlace() {
  const name = AppState.currentPlaceName;
  if (!name) return;
  showToast('⏳ Geocodiere…', 'info');
  try {
    const res = await geocodeSinglePlace(name);
    if (!res) { showToast('⚠ Kein Ergebnis von Nominatim', 'warn'); return; }
    const typeLbl = PLACE_TYPE_LBL[res.type] || res.type;
    showToast(`✓ ${typeLbl} · ${res.lat.toFixed(4)}, ${res.lon.toFixed(4)}`, 'success');
    showPlaceDetail(name, false);
  } catch (e) {
    showToast('⚠ Geocoding-Fehler: ' + e.message, 'error');
  }
}

let _batchAbort = false;

async function startBatchGeocode() {
  const modal = document.getElementById('modalBatchGeocode');
  if (!modal) return;
  _batchAbort = false;
  document.getElementById('batchGeocodeProgress').textContent = 'Starte…';
  document.getElementById('batchGeocodeBar').style.width = '0%';
  document.getElementById('batchGeocodeDone').hidden = true;
  document.getElementById('batchGeocodeAbortBtn').hidden = false;
  openModal('modalBatchGeocode');

  const ok = await batchGeocodePlaces((done, total, name) => {
    if (_batchAbort) return;
    if (name === 'done') {
      document.getElementById('batchGeocodeProgress').textContent = `Fertig — ${done} Orte verarbeitet.`;
      document.getElementById('batchGeocodeBar').style.width = '100%';
      document.getElementById('batchGeocodeDone').hidden = false;
      document.getElementById('batchGeocodeAbortBtn').hidden = true;
      UIState._placesCache = null;
      renderPlaceList();
      return;
    }
    const pct = total ? Math.round(done / total * 100) : 0;
    document.getElementById('batchGeocodeProgress').textContent = `${done}/${total} · ${name.slice(0,40)}`;
    document.getElementById('batchGeocodeBar').style.width = pct + '%';
  });
}

function abortBatchGeocode() {
  _batchAbort = true;
  closeModal('modalBatchGeocode');
  showToast('Batch-Geocoding abgebrochen');
}

// ─── P3: Ort-Suchpicker ───────────────────────────────────────────────────────
// Öffnet den modalPlacePicker für das Ziel-Eingabefeld (z.B. 'ef-place').
function openPlacePicker(targetFieldId) {
  UIState._placePickerTarget = targetFieldId || 'ef-place';
  const el = document.getElementById('placePickerSearch');
  if (el) el.value = '';
  renderPlacePickerList('');
  openModal('modalPlacePicker');
}

function renderPlacePickerList(q) {
  const list = document.getElementById('placePickerList');
  if (!list) return;
  const lower = q.toLowerCase().trim();

  // Dieselbe Quelle wie die Ortsliste: alle Event-Orte, angereichert mit placeId/type
  let rows = [...collectPlaces().values()]
    .map(pl => ({ name: pl.name, placeId: pl.placeId || '', type: pl.type || '' }));

  if (lower) rows = rows.filter(r => {
    if (r.name.toLowerCase().includes(lower)) return true;
    // Sprachvarianten (pname.lang gesetzt) als zusätzliche Suchbegriffe
    const po = AppState.db.placeObjects?.[r.placeId];
    return (po?.pnames || []).some(pn => pn.lang && pn.value.toLowerCase().includes(lower));
  });
  rows.sort((a, b) => a.name.localeCompare(b.name, 'de'));

  if (!rows.length) { list.innerHTML = '<div class="empty">Keine Orte gefunden</div>'; return; }
  list.innerHTML = rows.slice(0, 120).map(r => {
    const icon  = PLACE_TYPE_ICON[r.type] || '📍';
    const lbl   = r.type ? (PLACE_TYPE_LBL[r.type] || r.type) : '';
    const badge = lbl ? `<span class="place-type-badge">${esc(lbl)}</span>` : '';
    return `<div class="person-row" data-action="placePickerSelect" data-id="${esc(r.placeId)}" data-name="${esc(r.name)}">
      <div class="p-avatar p-avatar--sm">${icon}</div>
      <div class="p-info"><div class="p-name">${esc(r.name)}${badge}</div></div>
    </div>`;
  }).join('');
}

function placePickerSelect(placeId, placeName) {
  const target = UIState._placePickerTarget || 'ef-place';
  const inp = document.getElementById(target);
  const idInp = document.getElementById(target + '-id');
  if (inp) inp.value = placeName || '';
  if (idInp) idInp.value = placeId || '';
  closeModal('modalPlacePicker');
}

// Gibt das placeObject für einen Ortsnamen zurück (via Registry), oder null.
function _placeObjForName(name) {
  if (typeof getPlaceRegistry !== 'function') return null;
  const reg = getPlaceRegistry();
  const id = reg.findByName(name);
  return id ? reg.byId[id] : null;
}

function showPlaceForm(placeName) {
  const po = _placeObjForName(placeName);
  document.getElementById('pl-old').value     = placeName;
  document.getElementById('pl-placeId').value = po ? po.id : '';
  document.getElementById('pl-name').value    = po ? po.title : placeName;
  document.getElementById('pl-type').value    = po?.type || 'Unknown';

  // Koordinaten: placeObject hat Vorrang vor extraPlaces-Cache
  const ep   = AppState.db.extraPlaces[placeName];
  const pl   = collectPlaces().get(placeName);
  const lati = po?.lat ?? ep?.lati ?? pl?.lati ?? null;
  const long = po?.long ?? ep?.long ?? pl?.long ?? null;
  document.getElementById('pl-lati').value = lati != null ? String(lati) : '';
  document.getElementById('pl-long').value = long != null ? String(long) : '';

  _renderPlaceNamesList(po);
  _renderEnclosedByList(po);
  openModal('modalPlace');
}

function _renderPlaceNamesList(po) {
  const sec  = document.getElementById('pl-pnames-section');
  const list = document.getElementById('pl-pnames-list');
  if (!sec || !list) return;
  if (!po) { sec.hidden = true; return; }
  sec.hidden = false;
  const pnames = po.pnames || [];
  const dated  = pnames.filter(pn => !pn.dateFrom && !pn.dateTo && pn.lang
    ? true : true); // alle zeigen
  list.innerHTML = pnames.length ? pnames.map((pn, i) => {
    const span = [pn.dateFrom, pn.dateTo].filter(Boolean).join('–');
    return `<div class="pname-row">
      <span class="pname-val">${esc(pn.value)}${pn.lang ? ` <em class="tran-lang">${esc(pn.lang)}</em>` : ''}</span>
      ${span ? `<span class="pname-span">${esc(span)}</span>` : ''}
      <button class="unlink-btn" data-action="removePlaceName" data-idx="${i}">×</button>
    </div>`;
  }).join('') : '<div class="no-data-pad">Keine alternativen Namen</div>';
}

function _renderEnclosedByList(po) {
  const sec  = document.getElementById('pl-enclosed-section');
  const list = document.getElementById('pl-enclosed-list');
  const sel  = document.getElementById('pl-enclosed-sel');
  if (!sec || !list || !sel) return;
  if (!po) { sec.hidden = true; return; }
  sec.hidden = false;

  const reg = getPlaceRegistry();
  // Eltern-Liste
  const enc = po.enclosedBy || [];
  list.innerHTML = enc.length ? enc.map((e, i) => {
    const parent = reg.byId[e.placeId];
    const title  = parent?.title || e.placeId;
    const span   = [e.dateFrom, e.dateTo].filter(Boolean).join('–');
    return `<div class="pname-row">
      <span class="pname-val">${esc(title)}</span>
      ${span ? `<span class="pname-span">${esc(span)}</span>` : ''}
      <button class="unlink-btn" data-action="removeEnclosedBy" data-idx="${i}">×</button>
    </div>`;
  }).join('') : '<div class="no-data-pad">Nicht zugeordnet</div>';

  // Select mit allen placeObjects befüllen (außer sich selbst)
  const opts = Object.values(AppState.db.placeObjects || {})
    .filter(p => p.id !== po.id)
    .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'de'));
  sel.innerHTML = `<option value="">— Ort wählen —</option>`
    + opts.map(p => `<option value="${esc(p.id)}">${esc(p.title)}</option>`).join('');
}

function _propagateCoordsToEvents(placeName, lati, long) {
  const key = placeName.trim();
  for (const p of Object.values(AppState.db.individuals)) {
    for (const ev of [p.birth, p.chr, p.death, p.buri, ...(p.events || [])]) {
      if (ev && ev.place?.trim() === key) { ev.lati = lati; ev.long = long; }
    }
  }
  for (const f of Object.values(AppState.db.families)) {
    if (f.marr?.place?.trim()  === key) { f.marr.lati  = lati; f.marr.long  = long; }
    if (f.engag?.place?.trim() === key) { f.engag.lati = lati; f.engag.long = long; }
  }
}

function savePlace() {
  const oldName = document.getElementById('pl-old').value;
  const newName = document.getElementById('pl-name').value.trim();
  if (!newName) { showToast('⚠ Ortsname darf nicht leer sein'); return; }
  const latiRaw = document.getElementById('pl-lati').value.trim();
  const longRaw = document.getElementById('pl-long').value.trim();
  const _pc = latiRaw ? parseCoordInput(latiRaw, longRaw) : { lat: NaN, lon: NaN };
  const lati = isNaN(_pc.lat) ? null : _pc.lat;
  const long = isNaN(_pc.lon) ? null : _pc.lon;
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

  // P2-UI: placeObject anlegen (falls neu) oder aktualisieren
  const _pos = AppState.db.placeObjects || (AppState.db.placeObjects = {});
  const _type = document.getElementById('pl-type')?.value || 'Unknown';
  let _poId = document.getElementById('pl-placeId')?.value || '';
  if (!_poId) {
    // Neues placeObject (erstmaliges Speichern eines String-Ortes)
    _poId = (typeof _epId === 'function') ? _epId(newName) : ('_ep_' + Date.now());
    _pos[_poId] = { id: _poId, title: newName, type: _type,
      lat: lati, long: long, pnames: [], enclosedBy: [], parentId: null };
    if (document.getElementById('pl-placeId')) document.getElementById('pl-placeId').value = _poId;
  } else {
    const _po = _pos[_poId];
    if (_po) {
      if (newName !== oldName) _po.title = newName;
      _po.type = _type;
      if (lati != null) { _po.lat = lati; _po.long = long; }
    }
  }
  UIState._placeRegistry = null;

  // Koordinaten sofort in alle passenden Event-Objekte übernehmen
  _propagateCoordsToEvents(newName, lati, long);

  UIState._placesCache = null;
  markChanged();
  if (typeof savePlaceObjects === 'function') savePlaceObjects();
  showToast('✓ Ort gespeichert');
  showPlaceDetail(newName);
}

// ─── P2-UI: pnames / enclosedBy inline-Editor ────────────────────────────────
function _currentPoFromModal() {
  const id = document.getElementById('pl-placeId')?.value;
  return id ? (AppState.db.placeObjects || {})[id] : null;
}

function addPlaceName() {
  const po = _currentPoFromModal();
  if (!po) { showToast('⚠ Erst Grunddaten speichern'); return; }
  const val  = document.getElementById('pl-pname-val')?.value.trim();
  if (!val) { showToast('⚠ Name darf nicht leer sein'); return; }
  const lang = document.getElementById('pl-pname-lang')?.value.trim() || '';
  const from = document.getElementById('pl-pname-from')?.value.trim() || null;
  const to   = document.getElementById('pl-pname-to')?.value.trim()   || null;
  if (!Array.isArray(po.pnames)) po.pnames = [];
  po.pnames.push({ value: val, lang, dateFrom: from, dateTo: to, dateType: null, _dateRaw: null });
  UIState._placeRegistry = null;
  markChanged();
  if (typeof savePlaceObjects === 'function') savePlaceObjects();
  ['pl-pname-val','pl-pname-lang','pl-pname-from','pl-pname-to'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  _renderPlaceNamesList(po);
}

function removePlaceName(idx) {
  const po = _currentPoFromModal();
  if (!po?.pnames) return;
  po.pnames.splice(parseInt(idx), 1);
  UIState._placeRegistry = null;
  markChanged();
  if (typeof savePlaceObjects === 'function') savePlaceObjects();
  _renderPlaceNamesList(po);
}

function addEnclosedBy() {
  const po = _currentPoFromModal();
  if (!po) { showToast('⚠ Erst Grunddaten speichern'); return; }
  const sel  = document.getElementById('pl-enclosed-sel');
  const pid  = sel?.value;
  if (!pid) { showToast('⚠ Bitte einen Ort wählen'); return; }
  const from = document.getElementById('pl-enclosed-from')?.value.trim() || null;
  const to   = document.getElementById('pl-enclosed-to')?.value.trim()   || null;
  if (!Array.isArray(po.enclosedBy)) po.enclosedBy = [];
  if (po.enclosedBy.some(e => e.placeId === pid)) { showToast('⚠ Bereits eingetragen'); return; }
  po.enclosedBy.push({ placeId: pid, dateFrom: from, dateTo: to, dateType: null, _dateRaw: null });
  po.parentId = po.enclosedBy[0].placeId; // erstes Element als parentId-Fallback
  UIState._placeRegistry = null;
  markChanged();
  if (typeof savePlaceObjects === 'function') savePlaceObjects();
  if (sel) sel.value = '';
  ['pl-enclosed-from','pl-enclosed-to'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  _renderEnclosedByList(po);
}

function removeEnclosedBy(idx) {
  const po = _currentPoFromModal();
  if (!po?.enclosedBy) return;
  po.enclosedBy.splice(parseInt(idx), 1);
  po.parentId = po.enclosedBy[0]?.placeId || null;
  UIState._placeRegistry = null;
  markChanged();
  if (typeof savePlaceObjects === 'function') savePlaceObjects();
  _renderEnclosedByList(po);
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
  const _pc2 = parseCoordInput(document.getElementById('np-lati').value, document.getElementById('np-long').value);
  const lati = isNaN(_pc2.lat) ? null : _pc2.lat;
  const long = isNaN(_pc2.lon) ? null : _pc2.lon;
  // extraPlaces nur wenn Koordinaten vorhanden — reine Hierarchie-Orte bleiben
  // aus extraPlaces heraus und erscheinen damit nicht in der Ortsliste (P2-UI)
  if (lati != null) {
    AppState.db.extraPlaces[name] = { name, lati, long };
    saveExtraPlaces();
  }
  // Sofort placeObject anlegen damit er in enclosedBy-Selects erscheint (P2-UI)
  const _pos = AppState.db.placeObjects || (AppState.db.placeObjects = {});
  if (!_placeObjForName(name)) {
    const id = (typeof _epId === 'function') ? _epId(name) : ('_ep_' + Date.now());
    _pos[id] = { id, title: name, type: 'Unknown', lat: lati, long, pnames: [], enclosedBy: [], parentId: null };
    UIState._placeRegistry = null;
    if (typeof savePlaceObjects === 'function') savePlaceObjects();
  }
  UIState._placesCache = null;
  closeModal('modalNewPlace');
  showToast('✓ Ort hinzugefügt — Typ und Hierarchie im ✎-Editor setzen');
  renderTab();
}

async function deleteExtraPlace(name) {
  if (!await confirmModal('Ort wirklich entfernen?', 'Entfernen')) return;
  delete AppState.db.extraPlaces[name];
  saveExtraPlaces();
  UIState._placesCache = null; // markChanged() wird hier nicht aufgerufen, daher manuell
  goBack();
  showToast('✓ Ort entfernt');
  renderTab();
}

// ─────────────────────────────────────
//  P5a HELPERS
// ─────────────────────────────────────

// P5a-4: Namens-Timeline als inline SVG (pnames[] mit Datumsbereich)
function _placeNamesSvg(pnames) {
  const dated = (pnames || []).filter(pn => pn.dateFrom || pn.dateTo);
  if (!dated.length) return '';
  const parseY = s => { const m = s && s.match(/\d{4}/); return m ? +m[0] : null; };
  const cur = new Date().getFullYear();
  let minY = Infinity, maxY = -Infinity;
  for (const pn of dated) {
    const f = parseY(pn.dateFrom), t = parseY(pn.dateTo);
    if (f) { minY = Math.min(minY, f); maxY = Math.max(maxY, f); }
    // Offene Einträge (dateTo=null) bis heute einbeziehen
    const tEff = t || (f ? cur : null);
    if (tEff) { minY = Math.min(minY, tEff); maxY = Math.max(maxY, tEff); }
  }
  if (minY === Infinity) return '';
  if (maxY <= minY) maxY = minY + 10;
  const W = 260, BAR = 18, PAD = 4, H = dated.length * (BAR + PAD) + 26;
  const toX = y => Math.max(0, Math.min(W, (y - minY) / (maxY - minY) * W));
  const COLS = ['#5b9bd5','#4aaa8a','#e8a33a','#e07050','#9b7aaa','#a0a8b0'];
  let bars = '', axis = '';
  dated.forEach((pn, i) => {
    const f = parseY(pn.dateFrom) || minY, t = parseY(pn.dateTo) || cur;
    const x1 = toX(f), x2 = toX(t), y = 22 + i * (BAR + PAD);
    const col = COLS[i % COLS.length], w = Math.max(3, x2 - x1);
    const lbl = esc((pn.value || '') + (pn.lang ? ` (${pn.lang})` : '')).substring(0, 24);
    bars += `<rect x="${x1.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${BAR}" rx="3" fill="${col}" opacity="0.85"/>`;
    bars += `<text x="${(x1 + 4).toFixed(1)}" y="${(y + 13).toFixed(1)}" font-size="10" fill="#fff">${lbl}</text>`;
  });
  const step = Math.max(1, Math.ceil((maxY - minY) / 4));
  for (let y = Math.ceil(minY / step) * step; y <= maxY; y += step) {
    const x = toX(y);
    axis += `<text x="${x.toFixed(1)}" y="14" font-size="9" fill="var(--c-muted)" text-anchor="middle">${y}</text>`;
  }
  return `<svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block;margin-top:8px;overflow:visible">${axis}${bars}</svg>`;
}

// P5a-5: Mini-Karte (Leaflet) im Standort-Abschnitt initialisieren
function _initPlaceDetailMap(lat, lon, title) {
  if (typeof L === 'undefined') return;
  const el = document.getElementById('place-mini-map');
  if (!el) return;
  if (_placeDetailMap) { try { _placeDetailMap.remove(); } catch(_) {} _placeDetailMap = null; }
  _placeDetailMap = L.map(el, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, tap: false });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(_placeDetailMap);
  _placeDetailMap.setView([lat, lon], 12);
  L.circleMarker([lat, lon], { radius: 9, color: '#c8793a', fillColor: '#c8793a', fillOpacity: 0.85, weight: 2 })
    .bindPopup(title).addTo(_placeDetailMap);
  setTimeout(() => _placeDetailMap?.invalidateSize(), 150);
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
  (UIState._lastTabSel || (UIState._lastTabSel = {})).places = placeName;
  document.getElementById('detailTopTitle').textContent = '📍 Ort';
  document.getElementById('editBtn').style.display = '';
  document.getElementById('treeBtn').hidden = true;

  let html = `<div class="detail-hero fade-up">
    <div class="detail-avatar place">📍</div>
    <div class="detail-name">${esc(compactPlace(placeName))}</div>
    <div class="detail-id">${place.personIds.size} Person${place.personIds.size !== 1 ? 'en' : ''}</div>
  </div>`;

  // Lösch-Button für manuell hinzugefügte Orte ohne verknüpfte Personen
  if (place.personIds.size === 0 && AppState.db.extraPlaces[placeName]) {
    html += `<div class="py-8">
      <button class="btn btn-danger w-full"
        data-action="deleteExtraPlace" data-pname="${placeName.replace(/"/g,'&quot;')}">Ort entfernen</button>
    </div>`;
  }

  // Standort-Sektion (Karte + Geocode-Button)
  const _geoAvail = typeof geocodeSinglePlace === 'function';
  if (place.lati !== null) {
    html += `<div class="section fade-up">
      <div class="section-title">Standort</div>
      <div class="place-map-wrap">
        <div id="place-mini-map"></div>
      </div>
      <div class="place-map-links">
        <a href="https://maps.apple.com/?ll=${place.lati},${place.long}&q=${encodeURIComponent(placeName)}"
           target="_blank" class="place-maps-link">🗺 Apple Maps</a>
        <a href="https://www.openstreetmap.org/?mlat=${place.lati}&mlon=${place.long}#map=12/${place.lati}/${place.long}"
           target="_blank" class="place-maps-link">🌐 OpenStreetMap</a>
      </div>
      <div class="place-map-coords">${place.lati.toFixed(5)}, ${place.long.toFixed(5)}</div>
      ${_geoAvail ? `<button class="btn btn-cancel mt-8 w-full" data-action="geocodeCurrentPlace" title="Koordinaten + Typ via Nominatim neu abrufen">↻ Neu geocodieren</button>` : ''}
    </div>`;
  } else if (_geoAvail) {
    html += `<div class="section fade-up">
      <div class="section-title">Standort</div>
      <button class="btn btn-save w-full" data-action="geocodeCurrentPlace">📍 Geocodieren (Nominatim)</button>
    </div>`;
  }

  // PLACE-HIST (ADR-024, P0b-1): historische Dimension der Place-Entität anzeigen
  // (Typ, datierte Namensvarianten, Zugehörigkeitskette). Nur wenn placeObject verknüpft.
  if (place.placeId) {
    const reg = getPlaceRegistry();
    const po  = reg.byId[place.placeId];
    if (po) {
      const TYPE_LBL = {
        Country:'Land', State:'Bundesland', Region:'Region', Province:'Provinz',
        County:'Kreis', District:'Bezirk', Municipality:'Gemeinde', City:'Stadt',
        Town:'Stadt', Village:'Dorf', Hamlet:'Weiler', Parish:'Pfarrei',
        Borough:'Stadtteil', Locality:'Ortslage', Neighborhood:'Nachbarschaft',
        Building:'Gebäude', Farm:'Hof', Cemetery:'Friedhof', Church:'Kirche', Unknown:'',
      };
      const typeLbl = TYPE_LBL[po.type] != null ? TYPE_LBL[po.type] : po.type;
      // Datierte Namensvarianten (nur solche mit Datum — der Haupttitel steht im Hero)
      const datedNames = (po.pnames || []).filter(pn => pn.dateFrom || pn.dateTo);
      const _span = pn => {
        const f = pn.dateFrom || '', t = pn.dateTo || '';
        if (f && t) return `${f}–${t}`;
        if (f) return `ab ${f}`;
        if (t) return `bis ${t}`;
        return '';
      };
      const namesHtml = datedNames.map(pn =>
        `<div class="fact-row"><span class="fact-key">${esc(_span(pn))}</span>`
        + `<span class="fact-val">${esc(pn.value)}${pn.lang ? ` <em class="tran-lang">${esc(pn.lang)}</em>` : ''}</span></div>`
      ).join('');
      // Verwaltungsgeschichte: alle enclosedBy[]-Einträge chronologisch mit Zeitspanne
      let histHtml = '';
      if (typeLbl) histHtml += `<div class="fact-row"><span class="fact-key">Typ</span><span class="fact-val">${esc(typeLbl)}</span></div>`;

      const enclosedBy = po.enclosedBy || [];
      if (enclosedBy.length) {
        // Sortieren: Einträge ohne Datum zuletzt (= aktuell), sonst nach dateFrom
        const sorted = [...enclosedBy].sort((a, b) => {
          if (!a.dateFrom && !a.dateTo) return 1;
          if (!b.dateFrom && !b.dateTo) return -1;
          return (a.dateFrom || '0').localeCompare(b.dateFrom || '0');
        });
        let encHtml = '';
        for (const enc of sorted) {
          const parent = reg.byId[enc.placeId];
          if (!parent) continue;
          // Zeitspanne des Eintrags
          const f = enc.dateFrom || '', t = enc.dateTo || '';
          let span = '';
          if (f && t) span = `${f}–${t}`;
          else if (f)  span = `ab ${f}`;
          else if (t)  span = `bis ${t}`;
          else         span = 'aktuell';
          // Elterntitel: resolveAsOf zum Startjahr → historisch korrekter Name
          const parseY = s => { const m = s && s.match(/\d{4}/); return m ? +m[0] : null; };
          const refYear = parseY(f) || parseY(t) || null;
          const parentName = refYear && reg.resolveAsOf
            ? (reg.resolveAsOf(enc.placeId, refYear) || parent.title)
            : parent.title;
          encHtml += `<div class="fact-row fact-row--clickable" data-action="showPlaceByTitle" data-title="${esc(parent.title)}">
            <span class="fact-key place-enc-span">${esc(span)}</span>
            <span class="fact-val">${esc(parentName)}</span>
            <span class="p-arrow">›</span>
          </div>`;
        }
        if (encHtml) {
          histHtml += `<div class="fact-sub-title">Verwaltungsgeschichte</div>${encHtml}`;
        }
      } else {
        // Fallback: aktuelle Kette wenn kein enclosedBy[]
        const chain = reg.enclosureChainAsOf(place.placeId, null).slice(1);
        if (chain.length) histHtml += `<div class="fact-row"><span class="fact-key">Teil von</span><span class="fact-val">${esc(chain.join(' · '))}</span></div>`;
      }
      const svgTimeline = _placeNamesSvg(po.pnames);
      if (histHtml || namesHtml) {
        html += `<div class="section fade-up">
          <div class="section-title">Ort (historisch)</div>
          ${histHtml}
          ${namesHtml ? `<div class="fact-sub-title">Frühere Namen</div>${namesHtml}` : ''}
          ${svgTimeline}
        </div>`;
      }
    }
  }

  // P3: Kirchenbuch-Sektion — für Church/Parish/Cemetery Orte verknüpfte Repos + Quellen anzeigen
  if (place.placeId) {
    const reg2 = getPlaceRegistry();
    const po2  = reg2?.byId[place.placeId];
    if (po2 && (po2.type === 'Church' || po2.type === 'Parish' || po2.type === 'Cemetery')) {
      const lowerTitle = (po2.title || '').toLowerCase();
      // Repos deren Name den Ortsnamen enthält (oder umgekehrt)
      const matchedRepos = Object.values(AppState.db.repositories || {})
        .filter(r => {
          const rn = (r.name || '').toLowerCase();
          return rn.includes(lowerTitle) || lowerTitle.includes(rn.slice(0, 5));
        });
      if (matchedRepos.length) {
        let kirchHtml = '';
        for (const repo of matchedRepos) {
          const repoSrcs = Object.values(AppState.db.sources || {}).filter(s => s.repo === repo.id);
          const srcLinks = repoSrcs.map(s =>
            `<div class="fact-row" style="cursor:pointer" data-action="showSourceDetail" data-id="${esc(s.id)}">
              <span class="fact-val">${esc(s.title || s.id)}</span><span class="p-arrow">›</span>
            </div>`).join('');
          kirchHtml += `<div class="fact-row"><span class="fact-key">Archiv</span>
            <span class="fact-val">${esc(repo.name)}${repo.www ? ` <a class="place-maps-link" href="${esc(repo.www)}" target="_blank">🔗</a>` : ''}</span></div>`;
          if (srcLinks) kirchHtml += `<div class="fact-sub-title">Kirchenbücher</div>${srcLinks}`;
        }
        html += `<div class="section fade-up">
          <div class="section-title">Verknüpfte Kirchenbücher</div>
          ${kirchHtml}
        </div>`;
      }
    }
  }

  // GED7: Übersetzungs-Editor (extraPlaces.trans[])
  const _ep = AppState.db.extraPlaces[placeName];
  const _transList = _ep?.trans || [];
  const _transHtml = _transList.length
    ? _transList.map((t, i) => `
      <div class="fact-row" style="align-items:center">
        <span class="fact-val" style="flex:1"><span class="tran-chip">${esc(t.value)}${t.lang ? `<em class="tran-lang">${esc(t.lang)}</em>` : ''}</span></span>
        <button class="unlink-btn" data-action="deletePlaceTrans" data-idx="${i}">×</button>
      </div>`).join('')
    : '';
  html += `<div class="section fade-up">
    <div class="section-head">
      <div class="section-title">Übersetzungen</div>
    </div>
    ${_transHtml || '<div class="no-data-pad">Keine Übersetzungen eingetragen</div>'}
    <div class="tran-add-row">
      <input class="form-input" id="pl-tran-val" placeholder="Übersetzung (z.B. Wrocław)">
      <input class="form-input" id="pl-tran-lang" placeholder="Sprache" style="max-width:100px">
      <button class="btn btn-save" style="padding:5px 14px" data-action="addPlaceTrans">+</button>
    </div>
  </div>`;

  // P5a-1: Ereignisse nach Typ gruppiert, placeId-aware
  const _byType = new Map();
  const _evSeen = new Set();
  const _addEv = (typeLabel, person, date) => {
    const dk = `${person.id}|${typeLabel}|${date||''}`;
    if (_evSeen.has(dk)) return;
    _evSeen.add(dk);
    if (!_byType.has(typeLabel)) _byType.set(typeLabel, []);
    _byType.get(typeLabel).push({ person, date: date || '' });
  };
  const _matchPlace = ev => {
    if (ev && ev.place && ev.place.trim() === placeName) return true;
    if (place.placeId && ev && ev.placeId && ev.placeId === place.placeId) return true;
    return false;
  };
  for (const p of Object.values(AppState.db.individuals)) {
    if (_matchPlace(p.birth))  _addEv('Geburt',     p, p.birth.date);
    if (_matchPlace(p.death))  _addEv('Tod',        p, p.death.date);
    if (_matchPlace(p.chr))    _addEv('Taufe',      p, p.chr.date);
    if (_matchPlace(p.buri))   _addEv('Beerdigung', p, p.buri.date);
    for (const ev of p.events) {
      if (_matchPlace(ev)) _addEv(ev.eventType || EVENT_LABELS[ev.type] || ev.type, p, ev.date);
    }
  }
  for (const f of Object.values(AppState.db.families)) {
    if (_matchPlace(f.marr)) {
      for (const pid of [f.husb, f.wife]) {
        if (!pid) continue;
        const p = AppState.db.individuals[pid];
        if (p) _addEv('Heirat', p, f.marr.date);
      }
    }
    for (const ev of (f.events || [])) {
      if (_matchPlace(ev)) {
        for (const pid of [f.husb, f.wife]) {
          if (!pid) continue;
          const p = AppState.db.individuals[pid];
          if (p) _addEv(ev.eventType || EVENT_LABELS[ev.type] || ev.type, p, ev.date);
        }
      }
    }
  }
  const _totalPersons = new Set([..._byType.values()].flatMap(arr => arr.map(e => e.person.id))).size;
  const _TYPE_ORDER = ['Geburt','Taufe','Konfirmation','Heirat','Beerdigung','Tod'];
  const _orderedTypes = [
    ..._TYPE_ORDER.filter(t => _byType.has(t)),
    ...[..._byType.keys()].filter(t => !_TYPE_ORDER.includes(t)).sort(),
  ];
  html += `<div class="section fade-up">
    <div class="section-title">Ereignisse (${_totalPersons} Person${_totalPersons !== 1 ? 'en' : ''})</div>`;
  if (_orderedTypes.length === 0) {
    html += '<div class="no-data-pad">Keine Ereignisse erfasst</div>';
  }
  for (const typeLabel of _orderedTypes) {
    const evs = _byType.get(typeLabel);
    evs.sort((a, b) => (a.date).localeCompare(b.date));
    html += `<div class="fact-sub-title">${esc(typeLabel)}</div>`;
    for (const e of evs) {
      html += relRow(e.person, e.date);
    }
  }
  html += `</div>`;

  // P5a-3: Quellen zu diesem Ort
  const _namesToCheck = [placeName.toLowerCase()];
  if (place.placeId) {
    const _po3 = getPlaceRegistry().byId[place.placeId];
    for (const pn of (_po3?.pnames || [])) {
      if (pn.value) _namesToCheck.push(pn.value.toLowerCase());
    }
  }
  const _matchedSrcs = Object.values(AppState.db.sources || {})
    .filter(s => _namesToCheck.some(n => n.length > 3 && (s.title || '').toLowerCase().includes(n)));
  if (_matchedSrcs.length) {
    let _srcHtml = '';
    for (const s of _matchedSrcs) {
      const _repoName = s.repo ? (AppState.db.repositories?.[s.repo]?.name || s.repo) : '';
      _srcHtml += `<div class="fact-row fact-row--clickable" data-action="showSourceDetail" data-id="${esc(s.id)}">
        <span class="fact-val">${esc(s.title || s.id)}${_repoName ? `<span class="place-src-repo"> · ${esc(_repoName)}</span>` : ''}</span>
        <span class="p-arrow">›</span>
      </div>`;
    }
    html += `<div class="section fade-up">
      <div class="section-title">Quellen zu diesem Ort</div>
      ${_srcHtml}
    </div>`;
  }

  document.getElementById('detailContent').innerHTML = html;
  showView('v-detail');
  if (place.lati !== null) _initPlaceDetailMap(place.lati, place.long, compactPlace(placeName));
}

// ─── Übersetzungs-Editor ──────────────────────────────────────────────────────
function addPlaceTrans() {
  const placeName = AppState.currentPlaceName;
  if (!placeName) return;
  const val = document.getElementById('pl-tran-val')?.value.trim();
  if (!val) { showToast('⚠ Übersetzung darf nicht leer sein'); return; }
  const lang = document.getElementById('pl-tran-lang')?.value.trim() || '';
  if (!AppState.db.extraPlaces[placeName])
    AppState.db.extraPlaces[placeName] = { name: placeName, lati: null, long: null };
  if (!AppState.db.extraPlaces[placeName].trans)
    AppState.db.extraPlaces[placeName].trans = [];
  AppState.db.extraPlaces[placeName].trans.push({ value: val, lang });
  saveExtraPlaces();
  markChanged();
  showToast('✓ Übersetzung gespeichert');
  showPlaceDetail(placeName, false);
}

function deletePlaceTrans(idx) {
  const placeName = AppState.currentPlaceName;
  if (!placeName) return;
  const ep = AppState.db.extraPlaces[placeName];
  if (!ep?.trans) return;
  ep.trans.splice(idx, 1);
  saveExtraPlaces();
  markChanged();
  showPlaceDetail(placeName, false);
}

// ─── PLACE-HIST (ADR-024, P0b-2b): Orts-Dubletten-Merge UI ──────────────────
// Setzt auf findPlaceDuplicates()/mergePlaceObjects() (gedcom.js, P0b-2a).
// Nur sinnvoll bei GRAMPS-Daten mit placeObjects (sonst keine Dubletten).
let _placeDupGroups = [];

// Zählt Event-Referenzen je placeId (für den Gewinner-Vorschlag).
function _placeUsageCounts() {
  const c = {};
  const bump = id => { if (id) c[id] = (c[id] || 0) + 1; };
  for (const p of Object.values(AppState.db.individuals || {})) {
    bump(p.birth?.placeId); bump(p.chr?.placeId); bump(p.death?.placeId); bump(p.buri?.placeId);
    for (const ev of p.events || []) bump(ev.placeId);
  }
  for (const f of Object.values(AppState.db.families || {})) {
    bump(f.marr?.placeId); bump(f.engag?.placeId); bump(f.div?.placeId); bump(f.divf?.placeId);
  }
  return c;
}

// _placeDupMode: 'objects' (GRAMPS placeObjects) | 'strings' (GEDCOM Strings)
let _placeDupMode = 'objects';

function openPlaceMergeModal() {
  const hasObjects = typeof findPlaceDuplicates === 'function'
    && Object.keys((AppState.db && AppState.db.placeObjects) || {}).length > 0;
  if (hasObjects) {
    _placeDupMode = 'objects';
    _placeDupGroups = findPlaceDuplicates();
  } else if (typeof findStringPlaceDuplicates === 'function') {
    _placeDupMode = 'strings';
    _placeDupGroups = findStringPlaceDuplicates();
  } else {
    showToast('⚠ Keine Ortsdaten vorhanden');
    return;
  }
  _renderPlaceMergeList();
  openModal('modalPlaceMerge');
}

function _renderPlaceMergeList() {
  const el = document.getElementById('placeMergeList');
  if (!el) return;
  if (!_placeDupGroups.length) {
    el.innerHTML = '<div class="dedup-empty">Keine Orts-Dubletten gefunden</div>';
    return;
  }
  let html = '';
  if (_placeDupMode === 'objects') {
    const reg = getPlaceRegistry();
    const usage = _placeUsageCounts();
    _placeDupGroups.forEach((g, gi) => {
      const ranked = [...g.ids].sort((a, b) =>
        (usage[b] || 0) - (usage[a] || 0)
        || ((reg.byId[b]?.pnames?.length || 0) - (reg.byId[a]?.pnames?.length || 0)));
      const suggested = ranked[0];
      let opts = '';
      for (const id of g.ids) {
        const po = reg.byId[id]; if (!po) continue;
        const n = usage[id] || 0;
        const geo = (po.lat != null) ? ' · 📍' : '';
        opts += `<label class="place-merge-opt">
          <input type="radio" name="pmw-${gi}" value="${esc(id)}"${id === suggested ? ' checked' : ''}>
          <span class="place-merge-name">${esc(po.title)}</span>
          <span class="place-merge-meta">${n} Verwendung${n !== 1 ? 'en' : ''}${geo}</span>
        </label>`;
      }
      html += `<div class="place-merge-group">
        <div class="place-merge-title">${g.ids.length} mögliche Schreibweisen desselben Ortes</div>
        ${opts}
        <button class="btn btn-save place-merge-btn" data-action="placeMergeGroup" data-gidx="${gi}">Zusammenführen</button>
      </div>`;
    });
  } else {
    // String-Modus (GEDCOM)
    // Radio = Hauptort (Winner); Checkbox = in diesen Merge einschließen (Standard: alle an)
    _placeDupGroups.forEach((g, gi) => {
      const suggested = [...g.names].sort((a, b) =>
        (g.counts[b] || 0) - (g.counts[a] || 0)
        || a.length - b.length)[0];
      let opts = '';
      for (const name of g.names) {
        const n = g.counts[name] || 0;
        opts += `<div class="place-merge-opt">
          <input type="checkbox" name="pmc-${gi}" value="${esc(name)}" checked>
          <input type="radio" name="pmw-${gi}" value="${esc(name)}"${name === suggested ? ' checked' : ''}>
          <span class="place-merge-name">${esc(name)}</span>
          <span class="place-merge-meta">${n} Person${n !== 1 ? 'en' : ''}</span>
        </div>`;
      }
      html += `<div class="place-merge-group">
        <div class="place-merge-title">${g.names.length} mögliche Schreibweisen desselben Ortes</div>
        <div class="place-merge-hint">☑ = einschließen · ◉ = Hauptort</div>
        ${opts}
        <button class="btn btn-save place-merge-btn" data-action="placeMergeGroup" data-gidx="${gi}">Zusammenführen</button>
      </div>`;
    });
  }
  el.innerHTML = html;
}

function placeMergeGroup(gidx) {
  const gi = parseInt(gidx, 10);
  const g = _placeDupGroups[gi];
  if (!g) return;
  const sel = document.querySelector(`input[name="pmw-${gi}"]:checked`);
  if (!sel) { showToast('⚠ Bitte einen Hauptort wählen'); return; }
  const winner = sel.value;

  if (_placeDupMode === 'objects') {
    const losers = g.ids.filter(id => id !== winner);
    const res = mergePlaceObjects(winner, losers);
    if (res.merged) {
      markChanged();
      UIState._placesCache = null;
      showToast(`✓ ${res.merged} zusammengeführt${res.repointed ? `, ${res.repointed} Verweise aktualisiert` : ''}`);
      _placeDupGroups = findPlaceDuplicates();
      _renderPlaceMergeList();
      if (typeof renderPlaceList === 'function') renderPlaceList();
    }
  } else {
    // Nur angehakte Einträge (Checkboxen) zusammenführen; Winner immer dabei
    const checked = new Set([...document.querySelectorAll(`input[name="pmc-${gi}"]:checked`)].map(cb => cb.value));
    checked.add(winner); // Winner ist immer Ziel, auch wenn Checkbox abgehakt
    const losers = [...checked].filter(n => n !== winner);
    if (!losers.length) { showToast('⚠ Mindestens einen weiteren Ort einschließen'); return; }
    const res = mergeStringPlaces(winner, losers);
    markChanged();
    showToast(`✓ ${losers.length} zusammengeführt${res.repointed ? `, ${res.repointed} Verweise aktualisiert` : ''}`);
    _placeDupGroups = findStringPlaceDuplicates();
    _renderPlaceMergeList();
    if (typeof renderPlaceList === 'function') renderPlaceList();
  }
}

// ─────────────────────────────────────
//  P5e — ORTS-KONTEXTSATZ
// ─────────────────────────────────────

// Gibt einen deutschen Kontextsatz zurück: „{Name} war im Jahr {year} ein {Typ} in {enclosureChain}."
// Gibt '' zurück wenn kein placeObject oder keine hilfreichen Daten vorhanden.
function buildPlaceContextSentence(placeId, year) {
  if (!placeId || typeof getPlaceRegistry !== 'function') return '';
  const reg = getPlaceRegistry();
  const po  = reg?.byId?.[placeId];
  if (!po) return '';

  const TYPE_DE = {
    Country:'ein Land', State:'ein Bundesland', Region:'eine Region', Province:'eine Provinz',
    County:'ein Kreis', District:'ein Bezirk', Municipality:'eine Gemeinde', City:'eine Stadt',
    Town:'eine Stadt', Village:'ein Dorf', Hamlet:'ein Weiler', Parish:'eine Pfarrei',
    Borough:'ein Stadtteil', Locality:'eine Ortslage', Neighborhood:'eine Nachbarschaft',
    Building:'ein Gebäude', Farm:'ein Hof', Cemetery:'ein Friedhof', Church:'eine Kirche',
  };
  const typePart = TYPE_DE[po.type] ? ` ${TYPE_DE[po.type]}` : '';

  // Name zum Zeitpunkt des Events (resolveAsOf), Fallback auf title
  const rawName = (typeof year === 'number' && reg.resolveAsOf)
    ? (reg.resolveAsOf(placeId, year) || po.title || '')
    : (po.title || '');
  // Nur ersten Teil des vollständigen Namens (vor dem ersten Komma)
  const name = rawName.split(',')[0].trim();
  if (!name) return '';

  // Zugehörigkeitskette (ohne den Ort selbst)
  const chain = reg.enclosureChainAsOf ? reg.enclosureChainAsOf(placeId, year ?? null).slice(1) : [];
  const chainPart = chain.length ? ` in ${chain.join(', ')}` : '';

  if (!typePart && !chainPart) return '';
  const yearStr = year ? ` ${year}` : '';
  return `${name} war${yearStr}${typePart}${chainPart}.`;
}

// ─────────────────────────────────────
//  P5d — GEO-PLAUSIBILITÄTS-VALIDATOR
// ─────────────────────────────────────

// Bounding-Box für „plausible" Koordinaten (Europa + angrenzende Regionen)
const _GEO_BBOX = { minLat: 27, maxLat: 72, minLon: -25, maxLon: 50 };

// Liefert Array von { placeId, title, code, msg } Warnungen
function validatePlaces() {
  const warnings = [];
  const pos = AppState.db?.placeObjects;
  if (!pos) return warnings;

  const parseY = s => { const m = s && s.match(/\d{4}/); return m ? +m[0] : null; };

  for (const po of Object.values(pos)) {
    const title = po.title || po.id;

    // P5d-1: Koordinaten außerhalb Bounding-Box
    if (po.lat != null && po.long != null) {
      if (po.lat < _GEO_BBOX.minLat || po.lat > _GEO_BBOX.maxLat ||
          po.long < _GEO_BBOX.minLon || po.long > _GEO_BBOX.maxLon) {
        warnings.push({ placeId: po.id, title, code: 'BBOX',
          msg: `Koordinaten außerhalb Europa: ${po.lat.toFixed(3)}, ${po.long.toFixed(3)}` });
      }
    }

    // P5d-2a: dateFrom > dateTo in pnames[]
    for (const pn of (po.pnames || [])) {
      const f = parseY(pn.dateFrom), t = parseY(pn.dateTo);
      if (f && t && f > t) {
        warnings.push({ placeId: po.id, title, code: 'PNAME_DATE',
          msg: `Name „${pn.value}": Startjahr ${f} > Endjahr ${t}` });
      }
    }

    // P5d-2b: Überlappende Perioden gleicher Sprache in pnames[]
    const byLang = {};
    for (const pn of (po.pnames || [])) {
      const lang = pn.lang || '';
      const f = parseY(pn.dateFrom), t = parseY(pn.dateTo);
      if (!f && !t) continue;
      if (!byLang[lang]) byLang[lang] = [];
      byLang[lang].push({ f: f || 0, t: t || 9999, val: pn.value });
    }
    for (const [lang, spans] of Object.entries(byLang)) {
      for (let i = 0; i < spans.length; i++) {
        for (let j = i + 1; j < spans.length; j++) {
          if (spans[i].f < spans[j].t && spans[j].f < spans[i].t) {
            warnings.push({ placeId: po.id, title, code: 'PNAME_OVERLAP',
              msg: `Namen „${spans[i].val}" und „${spans[j].val}"${lang ? ` (${lang})` : ''} überlappen zeitlich` });
          }
        }
      }
    }

    // P5d-2c: enclosedBy-Zirkel (A → … → A)
    const _visited = new Set([po.id]);
    const _checkCycle = (pid, depth) => {
      if (depth > 10) return false;
      const parent = pos[pid];
      if (!parent) return false;
      for (const enc of (parent.enclosedBy || [])) {
        if (!enc.placeId) continue;
        if (_visited.has(enc.placeId)) return true;
        _visited.add(enc.placeId);
        if (_checkCycle(enc.placeId, depth + 1)) return true;
      }
      return false;
    };
    for (const enc of (po.enclosedBy || [])) {
      if (!enc.placeId) continue;
      if (_visited.has(enc.placeId) || _checkCycle(enc.placeId, 0)) {
        warnings.push({ placeId: po.id, title, code: 'CYCLE',
          msg: `Zirkelreferenz in „Teil von"-Kette` });
        break;
      }
    }
  }

  return warnings;
}

let _placeValidatorOpen = false;

function togglePlaceValidator() {
  _placeValidatorOpen = !_placeValidatorOpen;
  _renderPlaceValidator();
  const btn = document.getElementById('placeValidatorBtn');
  if (btn) btn.classList.toggle('icon-btn--active', _placeValidatorOpen);
}

function _renderPlaceValidator() {
  const panel = document.getElementById('placeValidatorPanel');
  if (!panel) return;
  if (!_placeValidatorOpen) { panel.hidden = true; return; }

  const warnings = validatePlaces();
  if (warnings.length === 0) {
    panel.innerHTML = `<div class="place-validator-ok">✓ Keine Plausibilitätsprobleme gefunden</div>`;
  } else {
    const CODE_LBL = { BBOX: '🌍 Koordinaten', PNAME_DATE: '📅 Datumsfeld', PNAME_OVERLAP: '📅 Überlappung', CYCLE: '🔄 Zirkel' };
    let rows = warnings.map(w =>
      `<div class="place-validator-row fact-row--clickable" data-action="showPlaceByIdValidator" data-pid="${esc(w.placeId)}">
        <span class="place-validator-code">${CODE_LBL[w.code] || w.code}</span>
        <span class="place-validator-title">${esc(w.title)}</span>
        <span class="place-validator-msg">${esc(w.msg)}</span>
        <span class="p-arrow">›</span>
      </div>`
    ).join('');
    panel.innerHTML = `<div class="place-validator-header">⚠ ${warnings.length} Hinweis${warnings.length !== 1 ? 'e' : ''}</div>${rows}`;
  }
  panel.hidden = false;
}

function showPlaceByIdValidator(placeId) {
  const po = AppState.db?.placeObjects?.[placeId];
  if (!po) return;
  showPlaceDetail(po.title || placeId);
}
