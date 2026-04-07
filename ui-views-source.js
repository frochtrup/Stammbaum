// ─────────────────────────────────────
//  SOURCE DETAIL
// ─────────────────────────────────────
function showSourceDetail(id, pushHistory = true) {
  const s = getSource(id);
  if (!s) return;
  if (pushHistory) _beforeDetailNavigate();
  AppState.currentSourceId = id;
  AppState.currentPersonId = null;
  AppState.currentFamilyId = null;
  AppState.currentRepoId   = null;

  document.getElementById('detailTopTitle').textContent = 'Quelle';
  document.getElementById('editBtn').style.display = '';
  document.getElementById('editBtn').onclick = () => showSourceForm(id);
  document.getElementById('treeBtn').style.display = 'none';

  // Collect all persons and families referencing this source
  const refPersons = Object.values(AppState.db.individuals).filter(p => p.sourceRefs && p.sourceRefs.has(id));
  const refFamilies = Object.values(AppState.db.families).filter(f => f.sourceRefs && f.sourceRefs.has(id));

  let html = `<div class="detail-hero fade-up">
    <div id="det-src-photo-${id}" style="display:none"></div>
    <div id="det-src-avatar-${id}" class="detail-avatar" style="font-size:1.8rem">📖</div>
    <div class="detail-hero-text">
      <div class="detail-name">${esc(s.abbr || s.title || id)}</div>
      <div class="detail-id">${refPersons.length + refFamilies.length} Referenzen${s.lastChanged ? ' · geändert ' + s.lastChanged : ''}</div>
    </div>
  </div>`;

  // Source details
  html += `<div class="section fade-up"><div class="section-title">Details</div>`;
  if (s.abbr)                          html += factRow('Kurzname', s.abbr);
  if (s.title && s.title !== s.abbr)   html += factRow('Titel', s.title);
  if (s.author) html += factRow('Autor', s.author);
  if (s.date)   html += factRow('Datum', s.date);
  if (s.publ)   html += factRow('Verlag', s.publ);
  if (s.repo) {
    if (s.repo.match(/^@[^@]+@$/) && AppState.db.repositories[s.repo]) {
      const r = AppState.db.repositories[s.repo];
      const callNum = s.repoCallNum ? ` · Signatur: ${esc(s.repoCallNum)}` : '';
      html += `<div class="fact-row"><span class="fact-lbl">Aufbewahrung</span>
        <span class="fact-val"><span class="btn-link" data-action="showRepoDetail" data-id="${s.repo}" style="cursor:pointer">${esc(r.name || s.repo)}</span>${callNum}</span></div>`;
    } else {
      html += factRow('Aufbewahrung', s.repo);
    }
  }
  if (s.text)   html += `<div class="fact-row"><span class="fact-lbl">Notiz</span><span class="fact-val" style="white-space:pre-wrap;line-height:1.5">${linkifyUrls(s.text)}</span></div>`;
  if (!s.abbr && !s.title && !s.author && !s.date && !s.publ && !s.repo && !s.text)
    html += `<div style="color:var(--text-muted);font-style:italic;font-size:0.85rem">Keine Details eingetragen</div>`;
  html += `</div>`;

  // Referencing persons
  if (refPersons.length) {
    const sorted = [...refPersons].sort((a, b) => (a.name||'').localeCompare(b.name||'', 'de'));
    html += `<div class="section fade-up">
      <div class="section-title">Personen (${refPersons.length})</div>`;
    for (const p of sorted) {
      let bio = '';
      if (p.birth.date) bio += '* ' + p.birth.date;
      if (p.death.date) bio += (bio ? '  † ' : '† ') + p.death.date;
      const srcMeta = _collectSourceMeta(p, id);
      const sc = p.sex === 'M' ? 'm' : p.sex === 'F' ? 'f' : '';
      const ic = p.sex === 'M' ? '♂' : p.sex === 'F' ? '♀' : '◇';
      html += `<div class="rel-row" data-action="showDetail" data-pid="${p.id}">
        <div class="rel-avatar ${sc}">${ic}</div>
        <div class="rel-info">
          <div class="rel-name">${esc(p.name || p.id)}</div>
          <div class="rel-role">${esc(bio) || '–'}${srcMeta ? `<span class="src-ref-meta"> · ${esc(srcMeta)}</span>` : ''}</div>
        </div>
        <span class="p-arrow">›</span>
      </div>`;
    }
    html += `</div>`;
  }

  // Referencing families
  if (refFamilies.length) {
    html += `<div class="section fade-up">
      <div class="section-title">Familien (${refFamilies.length})</div>`;
    for (const f of refFamilies) {
      const husb = f.husb ? AppState.db.individuals[f.husb] : null;
      const wife = f.wife ? AppState.db.individuals[f.wife] : null;
      const title = [husb?.name, wife?.name].filter(Boolean).join(' & ') || f.id;
      const bio = f.marr.date ? '⚭ ' + f.marr.date : '';
      const srcMeta = _collectSourceMeta(f, id);
      html += `<div class="rel-row" data-action="showFamilyDetail" data-id="${f.id}">
        <div class="rel-avatar" style="font-size:0.9rem">👨‍👩‍👧</div>
        <div class="rel-info">
          <div class="rel-name">${esc(title)}</div>
          <div class="rel-role">${esc(bio) || '–'}${srcMeta ? `<span class="src-ref-meta"> · ${esc(srcMeta)}</span>` : ''}</div>
        </div>
        <span class="p-arrow">›</span>
      </div>`;
    }
    html += `</div>`;
  }

  if (!refPersons.length && !refFamilies.length) {
    html += `<div class="section fade-up"><div class="empty" style="padding:16px 0">Keine Referenzen gefunden</div></div>`;
  }

  // Media section: inline entries from media[] + reference entries from passthrough
  const srcMedia = s.media || [];
  const srcPtObje = (s._passthrough || []).filter(l => /^1 OBJE @/.test(l));
  {
    const _objeMap = _buildObjeRefMap();
    html += `<div class="section fade-up">
      <div class="section-head">
        <div class="section-title">Medien</div>
        <button class="section-add" data-action="openAddMediaDialog" data-ctx="source" data-id="${id}">+ Hinzufügen</button>
      </div>`;
    for (let i = 0; i < srcMedia.length; i++) {
      const m = srcMedia[i];
      if (!m.file && !m.title) continue;
      const _ext = (m.file || '').split('.').pop().toLowerCase();
      const _isImg = ['jpg','jpeg','png','gif','bmp','webp','tif','tiff'].includes(_ext);
      const _icon = _isImg ? '🖼' : _ext === 'pdf' ? '📄' : '📎';
      html += `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border-color);cursor:pointer"
        data-action="openSourceMediaView" data-sid="${id}" data-idx="${i}">
        <div id="src-media-thumb-${i}" style="flex-shrink:0;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem;background:var(--bg-card);border-radius:6px;border:1px solid var(--border-color)">${_icon}</div>
        <div style="flex:1;min-width:0">
          <div style="word-break:break-all;font-size:0.88rem;font-weight:500">${esc(m.title || m.file)}</div>
          ${m.title && m.file ? `<div style="color:var(--text-muted);font-size:0.78rem;word-break:break-all">${esc(m.file)}</div>` : ''}
          ${m.form ? `<div style="color:var(--text-muted);font-size:0.78rem">${esc(m.form)}</div>` : ''}
        </div>
        <button class="edit-media-btn" data-action="openEditMediaDialog" data-ctx="source" data-id="${id}" data-idx="${i}" title="Bearbeiten">✎</button>
      </div>`;
    }
    for (const l of srcPtObje) {
      const ref = l.replace(/^1 OBJE\s+/, '').trim();
      const obj = _objeMap[ref];
      const label = obj ? (obj.title || obj.file || ref) : ref;
      const sub   = obj && obj.title && obj.file ? obj.file : '';
      const _ext2 = (obj?.file || '').split('.').pop().toLowerCase();
      const _icon2 = ['jpg','jpeg','png','gif','bmp','webp'].includes(_ext2) ? '🖼' : _ext2 === 'pdf' ? '📄' : '📎';
      html += `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border-color)">
        <div style="flex-shrink:0;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem;background:var(--bg-card);border-radius:6px;border:1px solid var(--border-color)">${_icon2}</div>
        <div style="flex:1;min-width:0">
          <div style="word-break:break-all;font-size:0.88rem;font-weight:500">${esc(label)}</div>
          ${sub ? `<div style="color:var(--text-muted);font-size:0.78rem;word-break:break-all">${esc(sub)}</div>` : ''}
          <div style="color:var(--text-muted);font-size:0.78rem">Verweis</div>
        </div>
      </div>`;
    }
    if (!srcMedia.filter(m => m.file || m.title).length && !srcPtObje.length) html += `<div style="color:var(--text-muted);font-style:italic;font-size:0.85rem;padding:4px 0">Keine Medien eingetragen</div>`;
    html += `</div>`;
  }

  document.getElementById('detailContent').innerHTML = html;
  showView('v-detail');

  // Quellenmedien async laden — IDB zuerst (Kamera-Aufnahmen), dann OneDrive
  // Bevorzugtes Medium (prim) oder erstes für Hero
  let _srcHeroSet = false;
  const _srcPrimIdx = (() => {
    const withFile = srcMedia.map((m, i) => ({m, i})).filter(({m}) => m.file || m.title);
    if (!withFile.length) return -1;
    const prim = withFile.find(({m}) => m.prim && m.prim !== '');
    return prim ? prim.i : withFile[0].i;
  })();
  function _applySrcMediaUrl(idx, url) {
    const m = srcMedia[idx];
    const ext = (m.file || '').split('.').pop().toLowerCase();
    const isImg = ['jpg','jpeg','png','gif','bmp','webp','tif','tiff'].includes(ext);
    if (!isImg) return;
    const el = document.getElementById('src-media-thumb-' + idx);
    if (el) {
      const originalContent = el.innerHTML;
      el.innerHTML = '';
      const img = document.createElement('img');
      img.src = url; img.alt = m.title || m.file || '';
      img.style.cssText = 'width:44px;height:44px;object-fit:cover;border-radius:6px;display:block';
      img.onerror = () => { el.innerHTML = originalContent; };
      el.appendChild(img);
    }
    if (!_srcHeroSet && (idx === _srcPrimIdx)) {
      _srcHeroSet = true;
      const heroEl = document.getElementById('det-src-photo-' + id);
      const avatarEl = document.getElementById('det-src-avatar-' + id);
      if (heroEl) {
        heroEl.style.display = '';
        heroEl.innerHTML = '';
        const hImg = document.createElement('img');
        hImg.src = url; hImg.alt = m.title || m.file || '';
        hImg.style.cssText = 'width:80px;height:96px;object-fit:cover;border-radius:8px;display:block;flex-shrink:0;cursor:pointer';
        hImg.onclick = () => showLightbox(url);
        heroEl.appendChild(hImg);
        if (avatarEl) avatarEl.style.display = 'none';
      }
    }
  }
  // Ladereihenfolge: prim zuerst, dann Rest
  // Pfad (m.file via _odGetSourceFileUrl) zuerst; IDB nur als Fallback (Offline/Kamera)
  const _srcLoadOrder = srcMedia.map((_, i) => i)
    .filter(i => srcMedia[i].file || srcMedia[i].title)
    .sort((a, b) => (a === _srcPrimIdx ? -1 : b === _srcPrimIdx ? 1 : a - b));
  for (const i of _srcLoadOrder) {
    const _ci = i;
    _odGetSourceFileUrl(id, _ci).then(url => {
      if (url) { _applySrcMediaUrl(_ci, url); return; }
      const _srcFile = srcMedia[_ci]?.file;
      if (_srcFile) idbGet('img:' + _srcFile).then(b64 => {
        if (b64) _applySrcMediaUrl(_ci, b64);
      }).catch(() => {});
    }).catch(() => {
      const _srcFile = srcMedia[_ci]?.file;
      if (_srcFile) idbGet('img:' + _srcFile).then(b64 => {
        if (b64) _applySrcMediaUrl(_ci, b64);
      }).catch(() => {});
    });
  }
}

// ─────────────────────────────────────
//  SOURCE LIST
// ─────────────────────────────────────
function renderSourceList(srcs) {
  const el = document.getElementById('sourceList');
  if (!srcs) srcs = Object.values(AppState.db.sources);
  srcs = [...srcs].sort((a, b) => (a.abbr || a.title || a.id).localeCompare(b.abbr || b.title || b.id, 'de'));
  if (!srcs.length) { el.innerHTML = '<div class="empty">Keine Quellen gefunden</div>'; return; }

  let html = '';
  for (const s of srcs) {
    const refCount = Object.values(AppState.db.individuals).filter(p => p.sourceRefs && p.sourceRefs.has(s.id)).length
                   + Object.values(AppState.db.families).filter(f => f.sourceRefs && f.sourceRefs.has(s.id)).length;
    const hasRepo = s.repo && s.repo.match(/^@[^@]+@$/) && AppState.db.repositories[s.repo];
    const repoBadge = hasRepo ? `<span class="repo-badge" data-action="showRepoDetail" data-id="${s.repo}" style="cursor:pointer">🏛</span>` : '';
    const mediaCount = (s.media || []).filter(m => m.file || m.title).length
                     + (s._passthrough || []).filter(l => /^1 OBJE @/.test(l)).length;
    const mediaBadge = mediaCount ? `<span style="font-size:0.8rem;margin-left:5px;vertical-align:middle;opacity:0.7">📎</span>` : '';
    html += `<div class="source-card" data-action="showSourceDetail" data-sid="${s.id}">
      <div class="source-title">${esc(s.abbr || s.title || s.id)}${repoBadge}${mediaBadge}</div>
      <div class="source-meta">${esc([s.author, s.date].filter(Boolean).join(' · ')) || '&nbsp;'}${refCount ? ` · ${refCount} Ref.` : ''}</div>
    </div>`;
  }
  el.innerHTML = html;
}

function filterSources(q) {
  const lower = q.toLowerCase().trim();
  const all = Object.values(AppState.db.sources);
  if (!lower) { renderSourceList(all); return; }
  renderSourceList(all.filter(s =>
    (s.title||'').toLowerCase().includes(lower) ||
    (s.abbr||'').toLowerCase().includes(lower)  ||
    (s.author||'').toLowerCase().includes(lower)
  ));
}

function renderRepoList() {
  const section = document.getElementById('repoSection');
  const el      = document.getElementById('repoList');
  const repos   = Object.values(AppState.db.repositories || {});
  const jumpBtn = document.getElementById('repoJumpBtn');
  if (!repos.length) { section.style.display = 'none'; if (jumpBtn) jumpBtn.style.display = 'none'; return; }
  section.style.display = '';
  if (jumpBtn) jumpBtn.style.display = '';
  const sorted = repos.sort((a,b) => (a.name||'').localeCompare(b.name||'','de'));
  el.innerHTML = sorted.map(r => {
    const srcCount = Object.values(AppState.db.sources).filter(s => s.repo === r.id).length;
    return `<div class="source-card" data-action="showRepoDetail" data-id="${r.id}">
      <div class="source-title">${esc(r.name || r.id)}</div>
      <div class="source-meta">${r.addr ? esc(r.addr.split('\n')[0]) : '&nbsp;'}${srcCount ? ' · ' + srcCount + ' Quel.' : ''}</div>
    </div>`;
  }).join('');
}

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
    addPlace(p.chr.place,   p.id, 'Taufe', null, null);
    addPlace(p.buri.place,  p.id, 'Beerdigung', p.buri.lati, p.buri.long);
    for (const ev of p.events) addPlace(ev.place, p.id, ev.eventType || ev.type, ev.lati, ev.long);
  }
  for (const f of Object.values(AppState.db.families)) {
    addPlace(f.marr.place, f.husb, 'Heirat', f.marr.lati, f.marr.long);
    addPlace(f.marr.place, f.wife, 'Heirat', f.marr.lati, f.marr.long);
  }
  // Manuell hinzugefügte Orte (extraPlaces) einmischen — nur wenn noch nicht vorhanden
  for (const ep of Object.values(AppState.db.extraPlaces)) {
    if (!places.has(ep.name))
      places.set(ep.name, { name: ep.name, personIds: new Set(), eventTypes: new Set(), lati: ep.lati ?? null, long: ep.long ?? null });
  }
  UIState._placesCache = places;
  return places;
}

function renderPlaceList(sorted) {
  const el = document.getElementById('placeList');
  if (!sorted) {
    const places = collectPlaces();
    if (!places.size) { el.innerHTML = '<div class="empty">Keine Orte in den Daten gefunden</div>'; return; }
    sorted = [...places.values()].sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }
  if (!sorted.length) { el.innerHTML = '<div class="empty">Keine Orte gefunden</div>'; return; }

  let html = '';
  let lastLetter = '';
  for (const place of sorted) {
    const fl = place.name[0].toUpperCase();
    if (fl !== lastLetter) { html += `<div class="alpha-sep">${fl}</div>`; lastLetter = fl; }
    const count = place.personIds.size;
    const hasGeo = place.lati !== null;
    const geoIcon = hasGeo ? '📍' : '·';
    html += `<div class="person-row" data-action="showPlaceDetail" data-name="${esc(place.name)}">
      <div class="p-avatar" style="font-size:1.1rem">${geoIcon}</div>
      <div class="p-info">
        <div class="p-name">${esc(place.name)}</div>
        <div class="p-meta">${count} Person${count !== 1 ? 'en' : ''}${hasGeo ? ' · Karte verfügbar' : ''}</div>
      </div>
      <span class="p-arrow">›</span>
    </div>`;
  }
  el.innerHTML = html;
}

function filterPlaces(q) {
  const lower = q.toLowerCase().trim();
  const all = [...collectPlaces().values()].sort((a, b) => a.name.localeCompare(b.name, 'de'));
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
  const lati = latiRaw ? (parseGeoCoord(latiRaw) ?? parseFloat(latiRaw) || null) : null;
  const long = longRaw ? (parseGeoCoord(longRaw) ?? parseFloat(longRaw) || null) : null;
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
  AppState.currentPersonId = null; AppState.currentFamilyId = null; AppState.currentSourceId = null; AppState.currentRepoId = null;
  document.getElementById('detailTopTitle').textContent = '📍 Ort';
  document.getElementById('editBtn').style.display = '';
  document.getElementById('editBtn').onclick = () => showPlaceForm(placeName);
  document.getElementById('treeBtn').style.display = 'none';

  let html = `<div class="detail-hero fade-up">
    <div class="detail-avatar" style="font-size:1.8rem; border-color:var(--gold-dim)">📍</div>
    <div class="detail-name">${esc(placeName)}</div>
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
