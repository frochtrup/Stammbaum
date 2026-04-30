// ─────────────────────────────────────
//  HOF-LISTE (RESI-Adressen)
// ─────────────────────────────────────
// buildHofIndex() → gedcom.js (Domain-Logik)

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
    // Alpha-Separator: erster Buchstabe des normalisierten Orts (oder Adresse als Fallback)
    const sepSrc = _placeFirstPart(hof.place) || hof.addr;
    const sep = sepSrc[0].toUpperCase();
    if (sep !== lastSep) { html += `<div class="alpha-sep">${sep}</div>`; lastSep = sep; }

    const count      = new Set(hof.entries.map(e => e.pid)).size;
    const propCount  = new Set((hof.propEntries || []).map(e => e.pid)).size;
    const allEntries = [...hof.entries, ...(hof.propEntries || [])];
    const dates      = allEntries.filter(e => e.date).map(e => e.dateKey).sort();
    const minYr  = dates.length ? dates[0].slice(0,4)  : '';
    const maxYr  = dates.length ? dates[dates.length-1].slice(0,4) : '';
    const range  = minYr && maxYr && minYr !== maxYr ? `${minYr}–${maxYr}` : (minYr || '');
    const hofMeta   = AppState.db.hofObjects?.[hof.addr];
    const hasCoords = hofMeta?.lat && hofMeta?.long;
    const addrLine  = (hasCoords ? '<span style="color:var(--gold);margin-right:4px">📍</span>' : '') + esc(hof.addr).replace(/\n/g, ' · ');
    const metaParts = [];
    if (hof.place) metaParts.push(esc(compactPlace(hof.place)));
    metaParts.push(`${count} Person${count !== 1 ? 'en' : ''}`);
    if (propCount) metaParts.push(`${propCount} Eigentümer`);
    if (range) metaParts.push(range);
    html += `<div class="person-row" data-action="showHofDetail" data-addr="${esc(hof.addr)}">
      <div class="p-avatar" style="font-size:1.1rem">🏠</div>
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
  const addrAttr = addr.replace(/"/g, '&quot;');
  return `
  <div id="hf-add-section" class="section fade-up" style="display:none">
    <div class="section-title">Bewohner hinzufügen</div>

    <div class="form-group" style="position:relative;margin-bottom:10px">
      <label class="form-label">Person</label>
      <input class="form-input" id="hf-psearch" placeholder="Name suchen…" autocomplete="off">
      <div class="place-dropdown" id="hf-person-dd"></div>
      <input type="hidden" id="hf-pid">
    </div>

    <div class="form-group" style="margin-bottom:10px">
      <label class="form-label">Datum</label>
      <select class="form-select" id="hf-date-qual"
          data-change="onDateQualChange" data-target="hf-date2"
          style="font-size:0.82rem;padding:5px 8px;margin-bottom:4px">
        <option value="">exakt</option>
        <option value="ABT">ca. (ABT)</option>
        <option value="CAL">berechnet (CAL)</option>
        <option value="EST">geschätzt (EST)</option>
        <option value="BEF">vor (BEF)</option>
        <option value="AFT">nach (AFT)</option>
        <option value="BET">zwischen (BET…AND)</option>
        <option value="FROM">von/bis (FROM…TO)</option>
      </select>
      <div style="display:flex;gap:4px">
        <input class="form-input" id="hf-date-d" type="text" placeholder="TT"
          style="width:54px;flex-shrink:0;text-align:center" inputmode="numeric" pattern="[0-9]*">
        <input class="form-input" id="hf-date-m" placeholder="Monat" autocomplete="off" data-blur="normMonth">
        <input class="form-input" id="hf-date-y" type="text" placeholder="JJJJ"
          style="width:72px;flex-shrink:0;text-align:center" inputmode="numeric" pattern="[0-9]*">
      </div>
      <div id="hf-date2-group" style="display:none;margin-top:6px">
        <div style="font-size:0.73rem;color:var(--text-dim);margin-bottom:3px">bis</div>
        <div style="display:flex;gap:4px">
          <input class="form-input" id="hf-date2-d" type="text" placeholder="TT"
            style="width:54px;flex-shrink:0;text-align:center" inputmode="numeric" pattern="[0-9]*">
          <input class="form-input" id="hf-date2-m" placeholder="Monat" autocomplete="off" data-blur="normMonth">
          <input class="form-input" id="hf-date2-y" type="text" placeholder="JJJJ"
            style="width:72px;flex-shrink:0;text-align:center" inputmode="numeric" pattern="[0-9]*">
        </div>
      </div>
    </div>

    <div class="form-group" style="margin-bottom:10px">
      <label class="form-label">Ort</label>
      <div class="place-input-wrap">
        <input class="form-input" id="hf-place" placeholder="München" autocomplete="off">
        <div class="place-dropdown" id="hf-place-dd"></div>
      </div>
    </div>

    <div class="form-group" style="margin-bottom:10px">
      <label class="form-label">Quelle</label>
      <select class="form-select" id="hf-src" style="margin-bottom:4px">${_hofSourceOptions()}</select>
      <input class="form-input" id="hf-srcpage" placeholder="Seite / Nachweis" style="margin-bottom:4px">
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
  const addrAttr = addr.replace(/"/g, '&quot;');
  return `
  <div id="hfp-add-section" class="section fade-up" style="display:none">
    <div class="section-title">Eigentum hinzufügen</div>

    <div class="form-group" style="position:relative;margin-bottom:10px">
      <label class="form-label">Person</label>
      <input class="form-input" id="hfp-psearch" placeholder="Name suchen…" autocomplete="off">
      <div class="place-dropdown" id="hfp-person-dd"></div>
      <input type="hidden" id="hfp-pid">
    </div>

    <div class="form-group" style="margin-bottom:10px">
      <label class="form-label">Beschreibung <span style="color:var(--text-dim);font-weight:400">(optional, z.B. Mühle, Acker)</span></label>
      <input class="form-input" id="hfp-desc" placeholder="Liegenschaft, Objekt…" autocomplete="off">
    </div>

    <div class="form-group" style="position:relative;margin-bottom:10px">
      <label class="form-label">Adresse <span style="color:var(--text-dim);font-weight:400">(optional)</span></label>
      <input class="form-input" id="hfp-addr" placeholder="Adresse der Liegenschaft…" autocomplete="off" value="${addrAttr}">
      <div class="place-dropdown" id="hfp-addr-dd"></div>
    </div>

    <div class="form-group" style="margin-bottom:10px">
      <label class="form-label">Datum</label>
      <select class="form-select" id="hfp-date-qual"
          data-change="onDateQualChange" data-target="hfp-date2"
          style="font-size:0.82rem;padding:5px 8px;margin-bottom:4px">
        <option value="">exakt</option>
        <option value="ABT">ca. (ABT)</option>
        <option value="CAL">berechnet (CAL)</option>
        <option value="EST">geschätzt (EST)</option>
        <option value="BEF">vor (BEF)</option>
        <option value="AFT">nach (AFT)</option>
        <option value="BET">zwischen (BET…AND)</option>
        <option value="FROM">von/bis (FROM…TO)</option>
      </select>
      <div style="display:flex;gap:4px">
        <input class="form-input" id="hfp-date-d" type="text" placeholder="TT"
          style="width:54px;flex-shrink:0;text-align:center" inputmode="numeric" pattern="[0-9]*">
        <input class="form-input" id="hfp-date-m" placeholder="Monat" autocomplete="off" data-blur="normMonth">
        <input class="form-input" id="hfp-date-y" type="text" placeholder="JJJJ"
          style="width:72px;flex-shrink:0;text-align:center" inputmode="numeric" pattern="[0-9]*">
      </div>
      <div id="hfp-date2-group" style="display:none;margin-top:6px">
        <div style="font-size:0.73rem;color:var(--text-dim);margin-bottom:3px">bis</div>
        <div style="display:flex;gap:4px">
          <input class="form-input" id="hfp-date2-d" type="text" placeholder="TT"
            style="width:54px;flex-shrink:0;text-align:center" inputmode="numeric" pattern="[0-9]*">
          <input class="form-input" id="hfp-date2-m" placeholder="Monat" autocomplete="off" data-blur="normMonth">
          <input class="form-input" id="hfp-date2-y" type="text" placeholder="JJJJ"
            style="width:72px;flex-shrink:0;text-align:center" inputmode="numeric" pattern="[0-9]*">
        </div>
      </div>
    </div>

    <div class="form-group" style="margin-bottom:10px">
      <label class="form-label">Ort</label>
      <div class="place-input-wrap">
        <input class="form-input" id="hfp-place" placeholder="München" autocomplete="off">
        <div class="place-dropdown" id="hfp-place-dd"></div>
      </div>
    </div>

    <div class="form-group" style="margin-bottom:10px">
      <label class="form-label">Quelle</label>
      <select class="form-select" id="hfp-src" style="margin-bottom:4px">${_hofSourceOptions()}</select>
      <input class="form-input" id="hfp-srcpage" placeholder="Seite / Nachweis" style="margin-bottom:4px">
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
  const input = document.getElementById(prefix + '-psearch');
  const dd    = document.getElementById(prefix + '-person-dd');
  const pidEl = document.getElementById(prefix + '-pid');
  if (!input || !dd || !pidEl) return;

  const _search = debounce(() => {
    const q = input.value.toLowerCase().trim();
    dd.innerHTML = '';
    if (!q) { dd.style.display = 'none'; return; }
    const matches = Object.values(AppState.db.individuals)
      .filter(p => (p.name || '').toLowerCase().includes(q))
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de'))
      .slice(0, 12);
    if (!matches.length) { dd.style.display = 'none'; return; }
    matches.forEach(p => {
      const item = document.createElement('div');
      item.className = 'place-dropdown-item';
      const birth = p.birth?.date ? ' *' + (p.birth.date.match(/\d{4}/)?.[0] || '') : '';
      item.textContent = (p.name || p.id) + birth;
      item.addEventListener('mousedown', () => {
        input.value = p.name || p.id;
        pidEl.value = p.id;
        dd.innerHTML = ''; dd.style.display = 'none';
      });
      dd.appendChild(item);
    });
    dd.style.display = 'block';
  }, 150);

  input.addEventListener('input', () => {
    pidEl.value = '';
    if (!input.value.trim()) { dd.innerHTML = ''; dd.style.display = 'none'; return; }
    _search();
  });
  input.addEventListener('blur',  () => setTimeout(() => { dd.style.display = 'none'; }, 150));
  input.addEventListener('focus', () => { if (dd.children.length) dd.style.display = 'block'; });
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
  document.getElementById('treeBtn').style.display = 'none';

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
    <div class="detail-avatar" style="font-size:1.8rem;border-color:var(--gold-dim)">🏠</div>
    <div class="detail-name" style="white-space:pre-wrap">${addrDisplay}</div>
    <div class="detail-id">${totalCount} Person${totalCount !== 1 ? 'en' : ''}</div>
  </div>`;

  html += _renderHofCoordSection(addr);
  html += _renderHofNoteSection(addr);

  html += `<div class="section fade-up">
    <div class="section-head">
      <div class="section-title">Bewohner &amp; Eigentum</div>
      <div style="display:flex;gap:6px">
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
    html += `<div class="empty" style="padding:10px 0;font-size:0.85rem">Keine Einträge</div>`;
  }
  html += `</div>`;

  html += _renderAddBewohnerForm(addr);
  html += _renderAddPropForm(addr);

  document.getElementById('detailContent').innerHTML = html;
  _initHofFormEvents();
  showView('v-detail');
}

// ── Koordinaten-Sektion ──────────────────────────────────────────────────────

function _renderHofCoordSection(addr) {
  const m    = AppState.db.hofObjects?.[addr];
  const lat  = m?.lat ?? '';
  const long = m?.long ?? '';
  const addrAttr = addr.replace(/"/g, '&quot;');

  let body = '';
  if (lat && long) {
    const mapsUrl = `https://maps.apple.com/?ll=${encodeURIComponent(lat)},${encodeURIComponent(long)}&q=${encodeURIComponent(compactPlace(addr))}`;
    body = `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <span style="font-size:0.9rem;color:var(--text-main)">${esc(String(lat))}° N &nbsp; ${esc(String(long))}° E</span>
      <a href="${mapsUrl}" target="_blank" style="font-size:0.82rem;color:var(--gold)">Karte öffnen</a>
    </div>`;
  } else {
    body = `<div style="font-size:0.85rem;color:var(--text-dim)">Keine Koordinaten hinterlegt</div>`;
  }

  return `<div class="section fade-up" id="hof-coord-section">
    <div class="section-head">
      <div class="section-title">Koordinaten</div>
      <button type="button" class="section-add" data-action="showHofCoordForm" data-addr="${addrAttr}">Bearbeiten</button>
    </div>
    ${body}
    <div id="hof-coord-form" style="display:none;margin-top:10px">
      <div style="margin-bottom:8px">
        <label class="form-label" style="font-size:0.78rem">Breite (Lat) — oder Apple Maps-Koordinaten hier einfügen</label>
        <input class="form-input" id="hof-coord-lat" type="text" inputmode="decimal" placeholder='52,22779° N, 7,17310° O' value="${esc(String(lat))}">
      </div>
      <div style="margin-bottom:8px">
        <label class="form-label" style="font-size:0.78rem">Länge (Lon)</label>
        <input class="form-input" id="hof-coord-lon" type="text" inputmode="decimal" placeholder="7.1845" value="${esc(String(long))}">
      </div>
      <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:8px">Dezimalgrad (52.2073 / 7.1845) oder Apple Maps-Format (52,22779° N, 7,17310° O) ins erste Feld einfügen</div>
      <div class="btn-row">
        <button type="button" class="btn btn-save" data-action="saveHofCoord" data-addr="${addrAttr}">Speichern</button>
        <button type="button" class="btn btn-cancel" data-action="cancelHofCoord">Abbrechen</button>
        ${lat && long ? `<button type="button" class="btn" style="margin-left:auto;color:var(--red)" data-action="deleteHofCoord" data-addr="${addrAttr}">Löschen</button>` : ''}
      </div>
    </div>
  </div>`;
}

function showHofCoordForm(addr) {
  const form = document.getElementById('hof-coord-form');
  if (form) { form.style.display = ''; form.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
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
  if (!AppState.db.hofObjects[addr]) AppState.db.hofObjects[addr] = { addr };
  AppState.db.hofObjects[addr].lat  = lat;
  AppState.db.hofObjects[addr].long = lon;
  saveHofObjects();
  invalidatePlacePersonIndex?.();
  markChanged();
  showToast('✓ Koordinaten gespeichert');
  showHofDetail(addr, false);
}

function deleteHofCoord(addr) {
  const m = AppState.db.hofObjects[addr];
  if (!m) return;
  delete m.lat;
  delete m.long;
  // Eintrag bewusst behalten (auch ohne Note): beim Reload überschreibt er
  // _derivedHofObjectsFromDb(), sonst kommen die Koordinaten aus den Events zurück.
  saveHofObjects();
  invalidatePlacePersonIndex?.();
  markChanged();
  showHofDetail(addr, false);
}

// ── Notiz-Sektion ─────────────────────────────────────────────────────────────

function _renderHofNoteSection(addr) {
  const m    = AppState.db.hofObjects?.[addr];
  const note = m?.note || '';
  const addrAttr = addr.replace(/"/g, '&quot;');
  const body = note
    ? `<div style="font-size:0.88rem;color:var(--text-main);white-space:pre-wrap">${esc(note)}</div>`
    : `<div style="font-size:0.85rem;color:var(--text-dim)">Keine Notiz hinterlegt</div>`;
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
  sec.style.display = '';
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
  sec.style.display = '';
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
