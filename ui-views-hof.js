// ─────────────────────────────────────
//  HOF-LISTE (RESI-Adressen)
// ─────────────────────────────────────
// buildHofIndex() → gedcom.js (Domain-Logik)

let _hofDetailMap = null;

function _initHofDetailMap(lat, lon, title) {
  if (typeof L === 'undefined') return;
  const el = document.getElementById('hof-mini-map');
  if (!el) return;
  if (_hofDetailMap) { try { _hofDetailMap.remove(); } catch(_) {} _hofDetailMap = null; }
  _hofDetailMap = L.map(el, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, tap: false });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(_hofDetailMap);
  _hofDetailMap.setView([lat, lon], 14);
  L.circleMarker([lat, lon], { radius: 9, color: '#c8793a', fillColor: '#c8793a', fillOpacity: 0.85, weight: 2 })
    .bindPopup(title).addTo(_hofDetailMap);
  setTimeout(() => _hofDetailMap?.invalidateSize(), 150);
}

// Ersten nicht-leeren Teil einer Ortsangabe extrahieren (ignoriert Hierarchie-Prefix)
// ", Ochtrup" → "Ochtrup"  |  "Ochtrup, Steinfurt" → "Ochtrup"  |  "Ochtrup" → "Ochtrup"
function _placeFirstPart(place) {
  if (!place) return '';
  return place.split(',').map(s => s.trim()).find(s => s.length > 0) || '';
}

// Adress-Sortierkey: Straße + numerische Hausnummer trennen
function _addrSortKey(addr) {
  const line = (addr || '').split('\n')[0].trim();
  const m = line.match(/^(.*?)\s+(\d+\S*)\s*$/);
  if (m) return { street: m[1].trim(), nr: parseInt(m[2]) || 0, nrSuffix: m[2].replace(/^\d+/, '') };
  return { street: line, nr: 0, nrSuffix: '' };
}

function _hofSortFn(a, b) {
  // 1. Ort — nur erster Teil der Hierarchie, damit ", Ochtrup" = "Ochtrup"
  const pc = _placeFirstPart(a.place).localeCompare(_placeFirstPart(b.place), 'de');
  if (pc !== 0) return pc;
  // 2. Straße
  const sa = _addrSortKey(a.addr), sb = _addrSortKey(b.addr);
  const sc = sa.street.localeCompare(sb.street, 'de');
  if (sc !== 0) return sc;
  // 3. Hausnummer numerisch
  if (sa.nr !== sb.nr) return sa.nr - sb.nr;
  return sa.nrSuffix.localeCompare(sb.nrSuffix, 'de');
}

function renderHofList(sorted) {
  const el = document.getElementById('hofList');
  if (!el) return;
  if (!sorted) {
    const hoefe = buildHofIndex();
    if (!hoefe.size) { el.innerHTML = '<div class="empty">Keine Wohnadressen (RESI) in den Daten gefunden</div>'; return; }
    sorted = [...hoefe.values()].sort(_hofSortFn);
  }
  if (!sorted.length) { el.innerHTML = '<div class="empty">Keine Höfe gefunden</div>'; return; }

  let html = '';
  let lastSep = '';
  for (const hof of sorted) {
    // ADR-027 P5: Höfe sind nach Dorf gruppiert (statt Alpha-Sortierung), weil das
    // Dorf die geografische Trennachse ist. Höfe ohne Ortsangabe landen unter „—".
    const sep = _placeFirstPart(hof.place) || '—';
    if (sep !== lastSep) { html += `<div class="alpha-sep">${esc(sep)}</div>`; lastSep = sep; }

    const count      = new Set(hof.entries.map(e => e.pid)).size;
    const propCount  = new Set((hof.propEntries || []).map(e => e.pid)).size;
    const allEntries = [...hof.entries, ...(hof.propEntries || [])];
    const dates      = allEntries.filter(e => e.date).map(e => e.dateKey).sort();
    const minYr  = dates.length ? dates[0].slice(0,4)  : '';
    const maxYr  = dates.length ? dates[dates.length-1].slice(0,4) : '';
    const range  = minYr && maxYr && minYr !== maxYr ? `${minYr}–${maxYr}` : (minYr || '');
    const meta      = hofMeta(hof);   // Farm-placeObject primär, hofObjects-Sidecar Fallback
    const hasCoords = meta.lat != null && meta.long != null;
    const hasNote   = !!meta.note;
    const addrLine  = (hasCoords ? '<span class="c-gold mr-4">📍</span>' : '')
                    + (hasNote   ? '<span class="c-dim  mr-4">📝</span>' : '')
                    + esc(hof.addr).replace(/\n/g, ' · ');
    const metaParts = [];
    if (hof.place) metaParts.push(esc(compactPlace(hof.place)));
    metaParts.push(`${count} Person${count !== 1 ? 'en' : ''}`);
    if (propCount) metaParts.push(`${propCount} Eigentümer`);
    if (range) metaParts.push(range);
    html += `<div class="person-row" data-action="showHofDetail" data-addr="${esc(hof.addr)}">
      <div class="p-info">
        <div class="p-name">${addrLine}</div>
        <div class="p-meta">${metaParts.join(' · ')}</div>
      </div>
      <span class="p-arrow">›</span>
    </div>`;
  }
  el.innerHTML = html;
}

function filterHoefe(q) {
  const lower = q.toLowerCase().trim();
  const all = [...buildHofIndex().values()].sort(_hofSortFn);
  if (!lower) { renderHofList(all); return; }
  renderHofList(all.filter(h =>
    h.addr.toLowerCase().includes(lower) ||
    (h.place || '').toLowerCase().includes(lower)
  ));
}

function _hofMonthOptions() {
  return `<option value="">Mon.</option>
    <option value="JAN">Jan</option><option value="FEB">Feb</option>
    <option value="MAR">Mär</option><option value="APR">Apr</option>
    <option value="MAY">Mai</option><option value="JUN">Jun</option>
    <option value="JUL">Jul</option><option value="AUG">Aug</option>
    <option value="SEP">Sep</option><option value="OCT">Okt</option>
    <option value="NOV">Nov</option><option value="DEC">Dez</option>`;
}

function _hofSourceOptions() {
  const srcs = Object.values(AppState.db.sources || {})
    .sort((a, b) => (a.abbr || a.title || '').localeCompare(b.abbr || b.title || '', 'de'));
  return '<option value="">– keine –</option>' +
    srcs.map(s => `<option value="${esc(s.id)}">${esc(s.abbr || s.title || s.id)}</option>`).join('');
}

function _renderAddBewohnerForm(addr) {
  const addrAttr = esc(addr);
  return `
  <div id="hf-add-section" class="section fade-up d-none">
    <div class="section-title">Bewohner hinzufügen</div>

    <div class="form-group hof-form-group-rel">
      <label class="form-label">Person</label>
      <input class="form-input" id="hf-psearch" placeholder="Name suchen…" autocomplete="off">
      <div class="place-dropdown" id="hf-person-dd"></div>
      <input type="hidden" id="hf-pid">
    </div>

    <div class="form-group hof-form-group">
      <label class="form-label">Datum</label>
      <select class="form-select date-qual-sel" id="hf-date-qual"
          data-change="onDateQualChange" data-target="hf-date2">
        <option value="">exakt</option>
        <option value="ABT">ca. (ABT)</option>
        <option value="CAL">berechnet (CAL)</option>
        <option value="EST">geschätzt (EST)</option>
        <option value="BEF">vor (BEF)</option>
        <option value="AFT">nach (AFT)</option>
        <option value="BET">zwischen (BET…AND)</option>
        <option value="FROM">von/bis (FROM…TO)</option>
      </select>
      <div class="d-flex gap-4">
        <input class="form-input date-d" id="hf-date-d" type="text" placeholder="TT"
          inputmode="numeric" pattern="[0-9]*">
        <input class="form-input" id="hf-date-m" placeholder="Monat" autocomplete="off" data-blur="normMonth">
        <input class="form-input date-y" id="hf-date-y" type="text" placeholder="JJJJ"
          inputmode="numeric" pattern="[0-9]*">
      </div>
      <div id="hf-date2-group" class="d-none mt-6">
        <div class="ef-date2-bis c-dim mb-4">bis</div>
        <div class="d-flex gap-4">
          <input class="form-input date-d" id="hf-date2-d" type="text" placeholder="TT"
            inputmode="numeric" pattern="[0-9]*">
          <input class="form-input" id="hf-date2-m" placeholder="Monat" autocomplete="off" data-blur="normMonth">
          <input class="form-input date-y" id="hf-date2-y" type="text" placeholder="JJJJ"
            inputmode="numeric" pattern="[0-9]*">
        </div>
      </div>
    </div>

    <div class="form-group hof-form-group">
      <label class="form-label">Ort</label>
      <div class="place-input-wrap">
        <input class="form-input" id="hf-place" placeholder="München" autocomplete="off">
        <div class="place-dropdown" id="hf-place-dd"></div>
      </div>
    </div>

    <div class="form-group hof-form-group">
      <label class="form-label">Quelle</label>
      <select class="form-select hof-src-margin" id="hf-src">${_hofSourceOptions()}</select>
      <input class="form-input hof-src-margin" id="hf-srcpage" placeholder="Seite / Nachweis">
      <select class="form-select" id="hf-quay">
        <option value="">Qualität…</option>
        <option value="3">3 – Direkt / Original</option>
        <option value="2">2 – Sekundärquelle</option>
        <option value="1">1 – Fraglich</option>
        <option value="0">0 – Unzuverlässig</option>
      </select>
    </div>

    <div class="btn-row">
      <button type="button" class="btn btn-save"
        data-action="saveHofBewohner" data-addr="${addrAttr}">Speichern</button>
      <button type="button" class="btn btn-cancel"
        data-action="cancelHofBewohner">Abbrechen</button>
    </div>
  </div>`;
}

function _propRelRow(p, roleStr) {
  const sc = p.sex === 'M' ? 'm' : p.sex === 'F' ? 'f' : '';
  const ic = p.sex === 'M' ? '♂' : p.sex === 'F' ? '♀' : '◇';
  return `<div class="rel-row rel-row--prop" data-action="showDetail" data-pid="${esc(p.id)}">
    <div class="rel-avatar ${sc}">${ic}</div>
    <div class="rel-info">
      <div class="rel-name">${esc(p.name || p.id)}</div>
      <div class="rel-role">${esc(roleStr)}</div>
    </div>
    <span class="p-arrow">›</span>
  </div>`;
}

function _renderAddPropForm(addr) {
  const addrAttr = esc(addr);
  return `
  <div id="hfp-add-section" class="section fade-up d-none">
    <div class="section-title">Eigentum hinzufügen</div>

    <div class="form-group hof-form-group-rel">
      <label class="form-label">Person</label>
      <input class="form-input" id="hfp-psearch" placeholder="Name suchen…" autocomplete="off">
      <div class="place-dropdown" id="hfp-person-dd"></div>
      <input type="hidden" id="hfp-pid">
    </div>

    <div class="form-group hof-form-group">
      <label class="form-label">Beschreibung <span class="c-dim" class="fw-400">(optional, z.B. Mühle, Acker)</span></label>
      <input class="form-input" id="hfp-desc" placeholder="Liegenschaft, Objekt…" autocomplete="off">
    </div>

    <div class="form-group hof-form-group-rel">
      <label class="form-label">Adresse <span class="c-dim" class="fw-400">(optional)</span></label>
      <input class="form-input" id="hfp-addr" placeholder="Adresse der Liegenschaft…" autocomplete="off" value="${addrAttr}">
      <div class="place-dropdown" id="hfp-addr-dd"></div>
    </div>

    <div class="form-group hof-form-group">
      <label class="form-label">Datum</label>
      <select class="form-select date-qual-sel" id="hfp-date-qual"
          data-change="onDateQualChange" data-target="hfp-date2">
        <option value="">exakt</option>
        <option value="ABT">ca. (ABT)</option>
        <option value="CAL">berechnet (CAL)</option>
        <option value="EST">geschätzt (EST)</option>
        <option value="BEF">vor (BEF)</option>
        <option value="AFT">nach (AFT)</option>
        <option value="BET">zwischen (BET…AND)</option>
        <option value="FROM">von/bis (FROM…TO)</option>
      </select>
      <div class="d-flex gap-4">
        <input class="form-input date-d" id="hfp-date-d" type="text" placeholder="TT"
          inputmode="numeric" pattern="[0-9]*">
        <input class="form-input" id="hfp-date-m" placeholder="Monat" autocomplete="off" data-blur="normMonth">
        <input class="form-input date-y" id="hfp-date-y" type="text" placeholder="JJJJ"
          inputmode="numeric" pattern="[0-9]*">
      </div>
      <div id="hfp-date2-group" class="d-none mt-6">
        <div class="ef-date2-bis c-dim mb-4">bis</div>
        <div class="d-flex gap-4">
          <input class="form-input date-d" id="hfp-date2-d" type="text" placeholder="TT"
            inputmode="numeric" pattern="[0-9]*">
          <input class="form-input" id="hfp-date2-m" placeholder="Monat" autocomplete="off" data-blur="normMonth">
          <input class="form-input date-y" id="hfp-date2-y" type="text" placeholder="JJJJ"
            inputmode="numeric" pattern="[0-9]*">
        </div>
      </div>
    </div>

    <div class="form-group hof-form-group">
      <label class="form-label">Ort</label>
      <div class="place-input-wrap">
        <input class="form-input" id="hfp-place" placeholder="München" autocomplete="off">
        <div class="place-dropdown" id="hfp-place-dd"></div>
      </div>
    </div>

    <div class="form-group hof-form-group">
      <label class="form-label">Quelle</label>
      <select class="form-select hof-src-margin" id="hfp-src">${_hofSourceOptions()}</select>
      <input class="form-input hof-src-margin" id="hfp-srcpage" placeholder="Seite / Nachweis">
      <select class="form-select" id="hfp-quay">
        <option value="">Qualität…</option>
        <option value="3">3 – Direkt / Original</option>
        <option value="2">2 – Sekundärquelle</option>
        <option value="1">1 – Fraglich</option>
        <option value="0">0 – Unzuverlässig</option>
      </select>
    </div>

    <div class="btn-row">
      <button type="button" class="btn btn-save"
        data-action="saveHofEigentum" data-addr="${addrAttr}">Speichern</button>
      <button type="button" class="btn btn-cancel"
        data-action="cancelHofEigentum">Abbrechen</button>
    </div>
  </div>`;
}

function _initHofFormEvents() {
  // Orts-Autocomplete
  initPlaceAutocomplete('hf-place', 'hf-place-dd');
  initPlaceAutocomplete('hfp-place', 'hfp-place-dd');
  // Adress-Autocomplete für PROP-Formular
  _initAddrAutocompleteFor('hfp-addr', 'hfp-addr-dd', 'hfp-place');
  // Person-Suche (Bewohner + Eigentum)
  _initHofPersonSearchFor('hf');
  _initHofPersonSearchFor('hfp');
}

function _initHofPersonSearchFor(prefix) {
  const pidEl = document.getElementById(prefix + '-pid');
  initAutocomplete(prefix + '-psearch', prefix + '-person-dd', {
    getItems: q => Object.values(AppState.db.individuals)
      .filter(p => (p.name || '').toLowerCase().includes(q))
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de')),
    formatLabel: p => {
      const birth = p.birth?.date ? ' *' + (p.birth.date.match(/\d{4}/)?.[0] || '') : '';
      return (p.name || p.id) + birth;
    },
    onSelect: (p, input) => {
      input.value = p.name || p.id;
      if (pidEl) pidEl.value = p.id;
    },
    onInput: () => { if (pidEl) pidEl.value = ''; },
  });
}

function showHofDetail(addr, pushHistory = true) {
  const hoefe = buildHofIndex();
  const hof   = hoefe.get(addr);
  if (!hof) return;
  if (pushHistory) _beforeDetailNavigate();
  AppState.currentPersonId = null; AppState.currentFamilyId = null;
  AppState.currentSourceId = null; AppState.currentRepoId = null;

  document.getElementById('detailTopTitle').textContent = 'Hof';
  document.getElementById('editBtn').style.display = 'none';
  document.getElementById('treeBtn').hidden        = true;
  document.getElementById('timelineBtn').hidden    = true;
  document.getElementById('storyBtn').hidden       = true;
  document.getElementById('probandBtn').hidden     = true;
  document.getElementById('probandSetBtn').hidden  = true;
  document.getElementById('detailMapBtn')?.setAttribute('hidden', '');
  document.getElementById('quickCamBtn')?.setAttribute('hidden', '');

  const addrDisplay = esc(addr).replace(/\n/g, '<br>');
  const allEntries = [
    ...(hof.entries     || []).map(e => ({ ...e, isProp: false })),
    ...(hof.propEntries || []).map(e => ({ ...e, isProp: true  })),
  ].sort((a, b) => {
    const d = a.dateKey.localeCompare(b.dateKey);
    if (d !== 0) return d;
    return (a.isProp ? 0 : 1) - (b.isProp ? 0 : 1);
  });
  const totalCount = new Set(allEntries.map(e => e.pid)).size;

  let html = `<div class="detail-hero fade-up">
    <div class="detail-avatar hof">🏠</div>
    <div class="detail-name">${addrDisplay}</div>
    <div class="detail-id">${totalCount} Person${totalCount !== 1 ? 'en' : ''}</div>
  </div>`;

  // ADR-027 P5: Adress-Historie aus V2-hofObject (z.B. „bis 1900: Schulze-Hof").
  // Nur sichtbar, wenn der Hof migriert ist (hof.hofId) UND mehrere addrs-Einträge
  // existieren. Reine 1-Adresse-Höfe zeigen die Section nicht (unnötiges Rauschen).
  const _v2 = hof.hofId ? AppState.db.hofObjects?.[hof.hofId] : null;
  if (_v2 && Array.isArray(_v2.addrs) && _v2.addrs.length > 1) {
    const histLines = _v2.addrs.map(a => {
      if (!a.value) return null;
      if (a.dateFrom && a.dateTo) return `<li><b>${esc(a.dateFrom)}–${esc(a.dateTo)}:</b> ${esc(a.value)}</li>`;
      if (a.dateTo)   return `<li><b>bis ${esc(a.dateTo)}:</b> ${esc(a.value)}</li>`;
      if (a.dateFrom) return `<li><b>ab ${esc(a.dateFrom)}:</b> ${esc(a.value)}</li>`;
      return `<li>${esc(a.value)}</li>`;
    }).filter(Boolean).join('');
    if (histLines) {
      html += `<div class="section fade-up">
        <div class="section-title">Adress-Historie</div>
        <ul class="addrs-history" style="margin:0;padding:8px 0 8px 22px;line-height:1.5">${histLines}</ul>
      </div>`;
    }
  }

  html += _renderHofRenameSection(addr);
  html += _renderHofCoordSection(addr);
  html += _renderHofNoteSection(addr);

  html += `<div class="section fade-up">
    <div class="section-head">
      <div class="section-title">Bewohner &amp; Eigentum</div>
      <div class="section-btn-row">
        <button type="button" class="section-add" data-action="showHofAddForm" data-addr="${esc(addr)}">+ Bewohner</button>
        <button type="button" class="section-add" data-action="showHofPropForm" data-addr="${esc(addr)}">+ Eigentum</button>
      </div>
    </div>`;
  for (const e of allEntries) {
    const p = AppState.db.individuals[e.pid];
    if (!p) continue;
    if (e.isProp) {
      const parts = ['Eigentum'];
      if (e.desc) parts.push(e.desc);
      if (e.date) parts.push(e.date);
      html += _propRelRow(p, parts.join(' · '));
    } else {
      html += relRow(p, e.date || '');
    }
  }
  if (!allEntries.length) {
    html += `<div class="empty empty-pad">Keine Einträge</div>`;
  }
  html += `</div>`;

  html += _renderAddBewohnerForm(addr);
  html += _renderAddPropForm(addr);

  document.getElementById('detailPlace').innerHTML = html;
  _activateDetailContainer('detailPlace', addr);
  _initHofFormEvents();
  showView('v-detail');
  const meta = hofMeta(hof);
  if (meta.lat != null && meta.long != null) _initHofDetailMap(meta.lat, meta.long, addr.split('\n')[0]);
}

// ── Koordinaten-Sektion ──────────────────────────────────────────────────────

function _renderHofCoordSection(addr) {
  const m    = hofMeta(buildHofIndex().get(addr) || { addr });  // Farm-PO primär, Sidecar Fallback
  const lat  = m.lat  ?? '';
  const long = m.long ?? '';
  const addrAttr = esc(addr);

  let body = '';
  if (lat && long) {
    const mapsUrl = `https://maps.apple.com/?ll=${encodeURIComponent(lat)},${encodeURIComponent(long)}&q=${encodeURIComponent(compactPlace(addr))}`;
    const osmUrl  = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${long}#map=14/${lat}/${long}`;
    body = `<div class="place-map-wrap"><div id="hof-mini-map"></div></div>
    <div class="place-map-links">
      <a href="${mapsUrl}" target="_blank" class="place-maps-link">🗺 Apple Maps</a>
      <a href="${osmUrl}"  target="_blank" class="place-maps-link">🌐 OpenStreetMap</a>
    </div>
    <div class="place-map-coords">${esc(String(lat))}, ${esc(String(long))}</div>`;
  } else {
    body = `<div class="hof-coord-no-data">Keine Koordinaten hinterlegt</div>`;
  }

  return `<div class="section fade-up" id="hof-coord-section">
    <div class="section-head">
      <div class="section-title">Koordinaten</div>
      <button type="button" class="section-add" data-action="showHofCoordForm" data-addr="${addrAttr}">Bearbeiten</button>
    </div>
    ${body}
    <div id="hof-coord-form" class="hof-coord-form-wrap">
      <div class="hof-coord-field-wrap">
        <label class="form-label hof-coord-label">Breite (Lat) — oder Apple Maps-Koordinaten hier einfügen</label>
        <input class="form-input" id="hof-coord-lat" type="text" inputmode="decimal" placeholder='52,22779° N, 7,17310° O' value="${esc(String(lat))}">
      </div>
      <div class="hof-coord-field-wrap">
        <label class="form-label hof-coord-label">Länge (Lon)</label>
        <input class="form-input" id="hof-coord-lon" type="text" inputmode="decimal" placeholder="7.1845" value="${esc(String(long))}">
      </div>
      <div class="hof-coord-hint">Dezimalgrad (52.2073 / 7.1845) oder Apple Maps-Format (52,22779° N, 7,17310° O) ins erste Feld einfügen</div>
      <div class="btn-row">
        <button type="button" class="btn btn-save" data-action="saveHofCoord" data-addr="${addrAttr}">Speichern</button>
        <button type="button" class="btn btn-cancel" data-action="cancelHofCoord">Abbrechen</button>
        ${lat && long ? `<button type="button" class="btn hof-del-btn" data-action="deleteHofCoord" data-addr="${addrAttr}">Löschen</button>` : ''}
      </div>
    </div>
  </div>`;
}

function showHofCoordForm(addr) {
  const form = document.getElementById('hof-coord-form');
  if (form) { form.style.display = 'block'; form.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  document.getElementById('hof-coord-lat')?.focus();
}

function cancelHofCoord() {
  const form = document.getElementById('hof-coord-form');
  if (form) form.style.display = 'none';
}

function saveHofCoord(addr) {
  const latRaw = document.getElementById('hof-coord-lat')?.value || '';
  const lonRaw = document.getElementById('hof-coord-lon')?.value || '';
  const { lat, lon } = parseCoordInput(latRaw, lonRaw);
  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    showToast('⚠ Ungültige Koordinaten (Breite -90–90, Länge -180–180)');
    return;
  }
  // Single source of truth: Farm-placeObject (geräteübergreifend via savePlaceObjects,
  // überlebt Reload aus IDB seit v995). Sidecar wird NICHT mehr geschrieben (read-only
  // Legacy: die Migration liest ihn weiter für unmigrierte Altbestände).
  upsertHofPO(addr, { lat, long: lon });   // ruft savePlaceObjects + markChanged
  invalidatePlacePersonIndex?.();
  showToast('✓ Koordinaten gespeichert');
  showHofDetail(addr, false);
}

function deleteHofCoord(addr) {
  // Farm-placeObject-Koords löschen (primär)
  const hof = (typeof buildHofIndex === 'function') ? buildHofIndex().get(addr) : null;
  const fpo = hof && hof.placeId ? AppState.db.placeObjects?.[hof.placeId] : null;
  if (fpo) { fpo.lat = null; fpo.long = null; if (typeof savePlaceObjects === 'function') savePlaceObjects(); }
  // Sidecar (dual-write): Eintrag bewusst behalten, nur Koords entfernen.
  const m = AppState.db.hofObjects[addr];
  if (m) { delete m.lat; delete m.long; saveHofObjects(); }
  UIState._hofCache = null;
  invalidatePlacePersonIndex?.();
  markChanged();
  showHofDetail(addr, false);
}

// ── Notiz-Sektion ─────────────────────────────────────────────────────────────

function _renderHofNoteSection(addr) {
  const note = hofMeta(buildHofIndex().get(addr) || { addr }).note || '';  // Farm-PO primär
  const addrAttr = esc(addr);
  const body = note
    ? `<div class="hof-note-body">${esc(note)}</div>`
    : `<div class="hof-no-note">Keine Notiz hinterlegt</div>`;
  return `<div class="section fade-up">
    <div class="section-head">
      <div class="section-title">Notiz</div>
      <button type="button" class="section-add" data-action="openHofNote" data-addr="${addrAttr}">Bearbeiten</button>
    </div>
    ${body}
  </div>`;
}

function showHofAddForm(addr) {
  const sec = document.getElementById('hf-add-section');
  if (!sec) return;
  sec.style.display = 'block';
  // Ort vorbelegen
  const placeEl = document.getElementById('hf-place');
  if (placeEl && !placeEl.value && addr) {
    const place = _addrToPlace(addr);
    if (place) placeEl.value = place;
  }
  document.getElementById('hf-psearch')?.focus();
  sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function saveHofBewohner(addr) {
  const pid   = document.getElementById('hf-pid')?.value?.trim();
  const pname = document.getElementById('hf-psearch')?.value?.trim();
  if (!pid) { showToast('⚠ Bitte zuerst eine Person auswählen'); return; }
  const p = AppState.db.individuals[pid];
  if (!p) return;

  const date  = buildGedDateFromFields('hf-date-qual', 'hf-date', 'hf-date2');
  const place = document.getElementById('hf-place')?.value?.trim() || '';
  const srcId = document.getElementById('hf-src')?.value || '';
  const page  = document.getElementById('hf-srcpage')?.value?.trim() || '';
  const quay  = document.getElementById('hf-quay')?.value || '';

  const sources     = srcId ? [srcId] : [];
  const sourcePages = srcId && page ? { [srcId]: page } : {};
  const sourceQUAY  = srcId && quay ? { [srcId]: quay } : {};

  p.events.push({
    type: 'RESI', value: '', date: date || null, place, lati: null, long: null,
    eventType: '', note: '', addr,
    phon: [], email: [],
    sources, sourcePages, sourceQUAY, sourceNote: {}, sourceExtra: {}, sourceMedia: {},
    media: [], _extra: []
  });

  UIState._hofCache = null;
  markChanged();
  showToast('✓ RESI-Ereignis angelegt');
  showHofDetail(addr, false);
}

function cancelHofBewohner() {
  const sec = document.getElementById('hf-add-section');
  if (sec) sec.style.display = 'none';
}

function showHofPropForm(addr) {
  const sec = document.getElementById('hfp-add-section');
  if (!sec) return;
  // Bewohner-Formular schließen falls offen
  const bewSec = document.getElementById('hf-add-section');
  if (bewSec) bewSec.style.display = 'none';
  sec.style.display = 'block';
  // Adresse vorbelegen (Textarea)
  const addrEl = document.getElementById('hfp-addr');
  if (addrEl && !addrEl.value && addr) addrEl.value = addr;
  // Ort vorbelegen
  const placeEl = document.getElementById('hfp-place');
  if (placeEl && !placeEl.value && addr) {
    const place = _addrToPlace(addr);
    if (place) placeEl.value = place;
  }
  document.getElementById('hfp-psearch')?.focus();
  sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function saveHofEigentum(addr) {
  const pid = document.getElementById('hfp-pid')?.value?.trim();
  if (!pid) { showToast('⚠ Bitte zuerst eine Person auswählen'); return; }
  const p = AppState.db.individuals[pid];
  if (!p) return;

  const date    = buildGedDateFromFields('hfp-date-qual', 'hfp-date', 'hfp-date2');
  const place   = document.getElementById('hfp-place')?.value?.trim() || '';
  const desc    = document.getElementById('hfp-desc')?.value?.trim() || '';
  const addrVal = document.getElementById('hfp-addr')?.value?.trim() || addr;
  const srcId   = document.getElementById('hfp-src')?.value || '';
  const page    = document.getElementById('hfp-srcpage')?.value?.trim() || '';
  const quay    = document.getElementById('hfp-quay')?.value || '';

  const sources     = srcId ? [srcId] : [];
  const sourcePages = srcId && page ? { [srcId]: page } : {};
  const sourceQUAY  = srcId && quay ? { [srcId]: quay } : {};

  p.events.push({
    type: 'PROP', value: desc, date: date || null, place, lati: null, long: null,
    eventType: '', note: '', addr: addrVal,
    phon: [], email: [],
    sources, sourcePages, sourceQUAY, sourceNote: {}, sourceExtra: {}, sourceMedia: {},
    media: [], _extra: []
  });

  UIState._hofCache = null;
  markChanged();
  showToast('✓ PROP-Ereignis angelegt');
  // Hof-Detail neu laden; addr kann sich geändert haben (editierbare Textarea)
  showHofDetail(addrVal || addr, false);
}

function cancelHofEigentum() {
  const sec = document.getElementById('hfp-add-section');
  if (sec) sec.style.display = 'none';
}

// ── Umbenennen ───────────────────────────────────────────────────────────────

function _renderHofRenameSection(addr) {
  return `<div class="section fade-up" id="hof-rename-section">
    <div class="section-head">
      <div class="section-title">Adresse</div>
      <button type="button" class="section-add" data-action="showHofRenameForm" data-addr="${esc(addr)}">Umbenennen</button>
    </div>
    <div id="hof-rename-form" hidden>
      <textarea class="form-input resize-v" id="hof-rename-addr" rows="3">${esc(addr)}</textarea>
      <div class="btn-row mt-8">
        <button type="button" class="btn btn-cancel" data-action="cancelHofRename">Abbrechen</button>
        <button type="button" class="btn btn-save" data-action="saveHofRename" data-addr="${esc(addr)}">Speichern</button>
      </div>
    </div>
  </div>`;
}

function showHofRenameForm() {
  const form = document.getElementById('hof-rename-form');
  if (!form) return;
  form.hidden = false;
  document.getElementById('hof-rename-addr')?.focus();
  form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function cancelHofRename() {
  const form = document.getElementById('hof-rename-form');
  if (form) form.hidden = true;
}

function saveHofRename(oldAddr) {
  const newAddr = document.getElementById('hof-rename-addr')?.value?.trim();
  if (!newAddr) { showToast('Adresse darf nicht leer sein', 'warn'); return; }
  if (newAddr === oldAddr) { cancelHofRename(); return; }

  // Alte Hof-Meta (Farm-PO bevorzugt) sichern, BEVOR die Events umgehängt werden.
  const oldHof   = buildHofIndex().get(oldAddr);
  const oldMeta  = oldHof ? hofMeta(oldHof) : { lat: null, long: null, note: '' };
  const oldFarmId = oldHof && oldHof.placeId || null;

  // Alle RESI/PROP-Ereignisse aller Personen aktualisieren
  let count = 0;
  for (const p of Object.values(AppState.db.individuals)) {
    for (const ev of (p.events || [])) {
      if ((ev.type === 'RESI' || ev.type === 'PROP') && ev.addr === oldAddr) {
        ev.addr = newAddr;
        count++;
      }
    }
  }

  // hofObjects-Sidecar-Key migrieren (Legacy-read bleibt konsistent)
  if (AppState.db.hofObjects?.[oldAddr]) {
    AppState.db.hofObjects[newAddr] = { ...AppState.db.hofObjects[oldAddr], addr: newAddr };
    delete AppState.db.hofObjects[oldAddr];
    saveHofObjects();
  }

  UIState._hofCache = null;   // buildHofIndex/_ensureHofFarmPO sollen die neuen addr sehen
  // Farm-PO für neue Adresse anlegen + Koords/Notiz übertragen, Events umhängen
  upsertHofPO(newAddr, { lat: oldMeta.lat, long: oldMeta.long, note: oldMeta.note || '' });
  // Altes Farm-PO entfernen, wenn verwaist (kein Event zeigt mehr darauf)
  if (oldFarmId && AppState.db.placeObjects[oldFarmId]) {
    const stillUsed = Object.values(AppState.db.individuals)
      .some(p => (p.events || []).some(ev => ev.placeId === oldFarmId));
    if (!stillUsed) { delete AppState.db.placeObjects[oldFarmId]; if (typeof savePlaceObjects === 'function') savePlaceObjects(); }
  }

  UIState._hofCache = null;
  markChanged();
  showToast(`Adresse aktualisiert (${count} Ereignis${count !== 1 ? 'se' : ''})`, 'success');
  showHofDetail(newAddr, false);
}

// ─── ADR-027 P5: „Hof-Zuweisungen prüfen" — Review-UI ────────────────────────
// Liest die Liste über _findUnresolvedHofEvents (data-layer in gedcom.js), rendert
// als Tabelle. Pro Zeile drei Aktionen: bestehenden Hof aus Dropdown wählen,
// neuen Hof aus diesem Event anlegen (legt V2-hofObject mit addrs[0]=ev.addr an),
// oder Ignorieren (persistiert per Datei).

function _updateHofReviewBadge() {
  const el = document.getElementById('hofReviewBadge');
  const btn = document.getElementById('hofReviewBtn');
  if (!el || !btn) return;
  const n = (typeof _countUnresolvedHofEvents === 'function') ? _countUnresolvedHofEvents() : 0;
  if (n > 0) { el.textContent = String(n); el.hidden = false; btn.setAttribute('aria-label', `Hof-Zuweisungen prüfen (${n})`); }
  else       { el.hidden = true; btn.setAttribute('aria-label', 'Hof-Zuweisungen prüfen'); }
}

function openHofReviewModal(focusKey) {
  renderHofReview(focusKey);
  openModal('modalHofReview');
}

function renderHofReview(focusKey) {
  const body = document.getElementById('hofReviewBody');
  if (!body) return;
  const rows = (typeof _findUnresolvedHofEvents === 'function')
    ? _findUnresolvedHofEvents(AppState.db) : [];
  if (!rows.length) {
    body.innerHTML = '<div class="empty empty-pad">✓ Alle Hof-Zuweisungen aufgelöst</div>';
    return;
  }
  // Höfe nach Dorf indizieren — für das Pro-Zeile-Dropdown
  const hofsByVillage = {};
  for (const [hid, h] of Object.entries(AppState.db.hofObjects || {})) {
    if (typeof _isHofObjectV2 !== 'function' || !_isHofObjectV2(h)) continue;
    (hofsByVillage[h.villageId] || (hofsByVillage[h.villageId] = [])).push({ id: hid, title: (h.addrs && h.addrs[0] && h.addrs[0].value) || hid });
  }
  let html = '<div class="hof-review-list" style="display:flex;flex-direction:column;gap:8px">';
  for (const r of rows) {
    const isFocus = focusKey && focusKey === r.key;
    const cands = (r.placeId && hofsByVillage[r.placeId]) || [];
    const opts = '<option value="">Hof wählen…</option>'
      + cands.map(c => `<option value="${esc(c.id)}">${esc(c.title)}</option>`).join('');
    const placeLabel = r.place ? esc(compactPlace(r.place)) : '<em style="color:#aaa">— ohne Dorf —</em>';
    html += `<div class="hof-review-row" data-key="${esc(r.key)}" style="border:1px solid var(--border,#ddd);border-radius:6px;padding:8px 10px;${isFocus ? 'box-shadow:0 0 0 2px var(--accent,#b88c2e)' : ''}">
      <div style="font-weight:600">${esc(r.personName)}</div>
      <div style="font-size:0.85rem;color:var(--text-dim,#666);margin:2px 0 6px">${esc(r.evType || 'Event')}${r.evDate ? ' · ' + esc(r.evDate) : ''} · 📍 ${esc(r.addr)} · ${placeLabel}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
        ${cands.length ? `<select class="form-select" style="max-width:200px" data-change="hofReviewAssign" data-key="${esc(r.key)}">${opts}</select>` : '<span style="font-size:0.8rem;color:#aaa">Keine Höfe im Dorf</span>'}
        <button type="button" class="btn btn-cancel btn-sm" data-action="hofReviewCreateNew" data-key="${esc(r.key)}" style="padding:4px 10px;font-size:0.85rem">+ neu anlegen</button>
        <button type="button" class="btn btn-cancel btn-sm" data-action="hofReviewIgnore" data-key="${esc(r.key)}" style="padding:4px 10px;font-size:0.85rem">Ignorieren</button>
      </div>
    </div>`;
  }
  html += '</div>';
  body.innerHTML = html;
}

// Pro-Zeile-Aktion: bestehenden Hof via Dropdown wählen.
function hofReviewAssign(selectEl) {
  const key = selectEl.dataset.key;
  const hofId = selectEl.value;
  if (!key || !hofId) return;
  const row = _findUnresolvedHofEvents(AppState.db).find(r => r.key === key);
  if (!row) return;
  if (typeof applyHofToEvent === 'function' && applyHofToEvent(row.ev, hofId)) {
    showToast('✓ Event mit Hof verknüpft', 'success');
    renderHofReview();
    _updateHofReviewBadge();
  }
}

// Pro-Zeile-Aktion: neuen V2-Hof aus diesem Event anlegen. Nutzt ev.addr als
// initialen addrs-Eintrag (undatiert), ev.placeId als villageId. Wenn ev.placeId
// fehlt, kein Anlegen möglich (Dorf ist Pflicht im V2-Modell).
function hofReviewCreateNew(btn) {
  const key = btn.dataset.key;
  if (!key) return;
  const row = _findUnresolvedHofEvents(AppState.db).find(r => r.key === key);
  if (!row) return;
  if (!row.placeId) {
    showToast('⚠ Event hat kein Dorf — bitte zuerst Ort verknüpfen', 'warn');
    return;
  }
  const villageId = row.placeId;
  const slug  = (typeof _normHofAddr === 'function' ? _normHofAddr(row.addr) : row.addr.toLowerCase())
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const vSlug = villageId.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '');
  let hofId = '_hof_' + (slug || 'x') + '_' + (vSlug || 'v');
  let n = 1;
  while (AppState.db.hofObjects?.[hofId]) hofId = '_hof_' + slug + '_' + vSlug + '_' + (++n);
  if (typeof upsertHofObject === 'function') {
    upsertHofObject(hofId, () => ({
      id: hofId, villageId,
      addrs: [{ value: row.addr, lang: 'deu', dateFrom: null, dateTo: null, dateType: null, _dateRaw: null }],
      lat: null, long: null, note: '',
      existsFrom: null, existsTo: null,
      predecessor: null, successor: null,
      _govId: null, _govTypes: null,
      schemaVersion: 1,
    }), null);
    if (typeof applyHofToEvent === 'function') applyHofToEvent(row.ev, hofId);
    showToast('✓ Neuer Hof angelegt + Event verknüpft', 'success');
    renderHofReview();
    _updateHofReviewBadge();
  }
}

// Pro-Zeile-Aktion: Event als nicht-Hof-relevant markieren (persistiert).
function hofReviewIgnore(btn) {
  const key = btn.dataset.key;
  if (!key) return;
  if (typeof _ignoreHofReviewEvent === 'function') {
    _ignoreHofReviewEvent(key);
    renderHofReview();
    _updateHofReviewBadge();
  }
}
