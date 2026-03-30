// ─────────────────────────────────────
//  BAUM: TASTATURNAVIGATION
// ─────────────────────────────────────
let _treeNavTargets = {};
let _treeKeyInit = false;
let _treeZoomScale = 1;

function _initTreeKeys() {
  if (_treeKeyInit) return;
  _treeKeyInit = true;
  document.addEventListener('keydown', e => {
    if (!document.getElementById('v-tree')?.classList.contains('active')) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
    const t = _treeNavTargets;
    if (e.key === 'ArrowUp')    { e.preventDefault(); const id = e.shiftKey ? t.up2 : t.up; if (id) showTree(id); }
    if (e.key === 'ArrowDown')  { e.preventDefault(); if (t.down)  showTree(t.down); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); treeNavBack(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); if (t.right) showTree(t.right); }
  });
}

// ─────────────────────────────────────
//  BAUM: DRAG-TO-PAN + VOLLBILD
// ─────────────────────────────────────
let _treeDragInit = false;
let _treeDragging = false;

function _initTreeDrag() {
  if (_treeDragInit) return;
  _treeDragInit = true;
  const sc = document.getElementById('treeScroll');
  if (!sc) return;
  let drag = null;

  sc.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, sl: sc.scrollLeft, st: sc.scrollTop };
    _treeDragging = false;
    sc.style.userSelect = 'none';
  }, { passive: true });

  window.addEventListener('mousemove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!_treeDragging && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
    _treeDragging = true;
    sc.scrollLeft = drag.sl - dx;
    sc.scrollTop  = drag.st - dy;
    sc.style.cursor = 'grabbing';
  });

  window.addEventListener('mouseup', () => {
    if (!drag) return;
    drag = null;
    sc.style.cursor = '';
    sc.style.userSelect = '';
    if (_treeDragging) {
      // Suppress the following click event (fired after mouseup)
      setTimeout(() => { _treeDragging = false; }, 0);
    }
  });

  // Block click events that follow a drag
  sc.addEventListener('click', e => {
    if (_treeDragging) { e.stopPropagation(); e.preventDefault(); }
  }, true);

  // Baum bei Orientierungswechsel (Hochformat ↔ Querformat) neu zeichnen
  let _treeResizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(_treeResizeTimer);
    _treeResizeTimer = setTimeout(() => {
      const id = _treeHistory[_treeHistoryPos];
      if (!id) return;
      if (!document.getElementById('v-tree')?.classList.contains('active')) return;
      showTree(id, false);
    }, 250);
  });

  // Pinch-to-Zoom (Touch, 2 Finger)
  let _pinchStartDist = 0, _pinchStartScale = 1;
  sc.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      _pinchStartDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      _pinchStartScale = _treeZoomScale;
      e.preventDefault();
    }
  }, { passive: false });

  sc.addEventListener('touchmove', e => {
    if (e.touches.length !== 2 || !_pinchStartDist) return;
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    _treeZoomScale = Math.min(3, Math.max(0.3, _pinchStartScale * dist / _pinchStartDist));
    const wrap = document.getElementById('treeWrap');
    const scaleWrap = document.getElementById('treeScaleWrap');
    if (wrap) {
      wrap.style.transform = `scale(${_treeZoomScale})`;
      wrap.style.transformOrigin = '0 0';
    }
    if (scaleWrap && wrap) {
      scaleWrap.style.width  = Math.round(parseFloat(wrap.style.width)  * _treeZoomScale) + 'px';
      scaleWrap.style.height = Math.round(parseFloat(wrap.style.height) * _treeZoomScale) + 'px';
    }
    e.preventDefault();
  }, { passive: false });

  sc.addEventListener('touchend', e => { if (e.touches.length < 2) _pinchStartDist = 0; });
}

function toggleTreeFullscreen() {
  const isFs = document.body.classList.toggle('tree-fullscreen');
  const btn = document.getElementById('treeFsBtn');
  if (btn) {
    btn.textContent = isFs ? '⤡' : '⤢';
    btn.title = isFs ? 'Sidebar einblenden' : 'Vollbild';
  }
}

// ─────────────────────────────────────
//  LIGHTBOX
// ─────────────────────────────────────
let _lbHeroKey = null, _lbHeroElemId = null, _lbAvatarElemId = null;

function showLightbox(src, heroKey, heroElemId, avatarElemId, idbKey) {
  const lb = document.getElementById('modalLightbox');
  if (!lb) return;
  document.getElementById('lightboxImg').src = src;
  _lbHeroKey     = heroKey     || null;
  _lbHeroElemId  = heroElemId  || null;
  _lbAvatarElemId = avatarElemId || null;
  const btn = document.getElementById('lightboxSetHero');
  btn.style.display = (heroKey && idbKey && idbKey !== heroKey) ? '' : 'none';
  lb.style.display = 'flex';
}

async function openMediaPhoto(idbKey, heroKey, heroElemId, avatarElemId) {
  let src = await idbGet(idbKey).catch(() => null)
         || await _odGetPhotoUrl(idbKey).catch(() => null);
  let usedFallback = false;
  if (!src) {
    src = await idbGet(heroKey).catch(() => null)
       || await _odGetPhotoUrl(heroKey).catch(() => null);
    usedFallback = true;
  }
  if (!src) { showToast('Kein Foto vorhanden'); return; }
  showLightbox(src, heroKey, heroElemId, avatarElemId, usedFallback ? heroKey : idbKey);
}

async function _lightboxSetHero() {
  if (!_lbHeroKey) return;
  const src = document.getElementById('lightboxImg').src;
  await idbPut(_lbHeroKey, src).catch(() => {});
  const el = document.getElementById(_lbHeroElemId);
  if (el) {
    el.style.display = '';
    el.innerHTML = `<img src="${src}" alt="Foto" style="width:80px;height:96px;object-fit:cover;border-radius:8px;display:block;flex-shrink:0;cursor:pointer" onclick="showLightbox(this.src)">`;
  }
  if (_lbAvatarElemId) {
    const av = document.getElementById(_lbAvatarElemId);
    if (av) av.style.display = 'none';
  }
  document.getElementById('lightboxSetHero').style.display = 'none';
  showToast('Hauptfoto gesetzt');
}

// ─────────────────────────────────────
//  NAVIGATION
// ─────────────────────────────────────
function showView(id) {
  const desktop = window.innerWidth >= 900 && id !== 'v-landing';
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);

  if (desktop) {
    document.getElementById('v-main').classList.add('active');
    document.getElementById('bottomNav').style.display = 'flex';
    document.getElementById('fabBtn').style.display = '';
    _detailActive = (id === 'v-detail');
    document.body.classList.add('desktop-mode');
    document.body.classList.toggle('has-detail', id === 'v-detail');
    if (id === 'v-detail') document.getElementById('v-detail').scrollTop = 0;
  } else {
    document.body.classList.remove('desktop-mode', 'has-detail');
    _detailActive = (id === 'v-detail');
    const showNav = (id === 'v-main' || id === 'v-tree');
    document.getElementById('bottomNav').style.display = showNav ? 'flex' : 'none';
    document.getElementById('fabBtn').style.display = (id === 'v-main') ? '' : 'none';
  }
}

// Bottom-Nav: aktiven Button hervorheben
function setBnavActive(name) {
  document.querySelectorAll('.bnav-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('bnav-' + name);
  if (btn) btn.classList.add('active');
}

// Bottom-Nav: Baum-Tab
function bnavTree() {
  setBnavActive('tree');
  const id = currentTreeId || smallestPersonId();
  if (id) showTree(id);
  else { showView('v-main'); setBnavActive('persons'); }
}

// Bottom-Nav: Listen-Tabs
function bnavTab(name) {
  currentTab = name;
  setBnavActive(name);
  showView('v-main');
  switchTab(name);
}

// Bottom-Nav: Globale Suche
function bnavSearch() {
  setBnavActive('search');
  showView('v-main');
  switchTab('search');
  setTimeout(() => document.getElementById('searchGlobal')?.focus(), 80);
}

// Bottom-Nav: Proband (kleinste ID)
function bnavHome() {
  const id = smallestPersonId();
  if (id) { setBnavActive('home'); showTree(id); }
}

// Globale Suche über Personen, Familien, Quellen, Orte
function runGlobalSearch(q) {
  const out = document.getElementById('globalSearchResults');
  if (!out) return;
  const lower = (q || '').toLowerCase().trim();
  if (!lower) {
    out.innerHTML = '<div style="padding:24px 16px;text-align:center;color:var(--text-muted);font-size:0.88rem">Suchbegriff eingeben…</div>';
    return;
  }

  let html = '';

  // ── Personen ──
  const persons = Object.values(db.individuals).filter(p =>
    (p.name||'').toLowerCase().includes(lower) ||
    (p.given||'').toLowerCase().includes(lower) ||
    (p.surname||'').toLowerCase().includes(lower) ||
    (p.birth?.place||'').toLowerCase().includes(lower) ||
    (p.death?.place||'').toLowerCase().includes(lower) ||
    (p.birth?.date||'').toLowerCase().includes(lower) ||
    (p.death?.date||'').toLowerCase().includes(lower)
  ).slice(0, 20);
  if (persons.length) {
    html += `<div class="alpha-sep">Personen (${persons.length})</div>`;
    for (const p of persons) {
      const sc = p.sex === 'M' ? 'm' : p.sex === 'F' ? 'f' : '';
      const ic = p.sex === 'M' ? '♂' : p.sex === 'F' ? '♀' : '◇';
      let meta = '';
      if (p.birth?.date) meta += '* ' + p.birth.date;
      if (p.birth?.place) meta += (meta ? ', ' : '') + p.birth.place;
      if (p.death?.date) meta += (meta ? '  † ' : '† ') + p.death.date;
      html += `<div class="person-row" onclick="showDetail('${p.id}')">
        <div class="p-avatar ${sc}">${ic}</div>
        <div class="p-info"><div class="p-name">${esc(p.name||p.id)}</div><div class="p-meta">${esc(meta)||'&nbsp;'}</div></div>
        <span class="p-arrow">›</span></div>`;
    }
  }

  // ── Familien ──
  const families = Object.values(db.families).filter(f => {
    const h = db.individuals[f.husb];
    const w = db.individuals[f.wife];
    return (h?.name||'').toLowerCase().includes(lower) ||
           (w?.name||'').toLowerCase().includes(lower) ||
           (f.marr?.place||'').toLowerCase().includes(lower) ||
           (f.marr?.date||'').toLowerCase().includes(lower);
  }).slice(0, 12);
  if (families.length) {
    html += `<div class="alpha-sep">Familien (${families.length})</div>`;
    for (const f of families) {
      const h = db.individuals[f.husb];
      const w = db.individuals[f.wife];
      const label = [h?.name, w?.name].filter(Boolean).join(' ⚭ ') || f.id;
      let meta = '';
      if (f.marr?.date) meta += f.marr.date;
      if (f.marr?.place) meta += (meta ? ', ' : '') + f.marr.place;
      html += `<div class="person-row" onclick="showFamilyDetail('${f.id}')">
        <div class="p-avatar" style="font-size:0.95rem">⚭</div>
        <div class="p-info"><div class="p-name">${esc(label)}</div><div class="p-meta">${esc(meta)||'&nbsp;'}</div></div>
        <span class="p-arrow">›</span></div>`;
    }
  }

  // ── Quellen ──
  const sources = Object.values(db.sources).filter(s =>
    (s.title||'').toLowerCase().includes(lower) ||
    (s.auth||'').toLowerCase().includes(lower) ||
    (s.publ||'').toLowerCase().includes(lower)
  ).slice(0, 10);
  if (sources.length) {
    html += `<div class="alpha-sep">Quellen (${sources.length})</div>`;
    for (const s of sources) {
      html += `<div class="person-row" onclick="showSourceDetail('${s.id}')">
        <div class="p-avatar" style="font-size:0.95rem">📖</div>
        <div class="p-info"><div class="p-name">${esc(s.title||s.id)}</div><div class="p-meta">${esc(s.auth||'')}</div></div>
        <span class="p-arrow">›</span></div>`;
    }
  }

  // ── Orte ──
  const places = Object.keys(db.extraPlaces || {}).filter(name =>
    name.toLowerCase().includes(lower)
  ).slice(0, 8);
  if (places.length) {
    html += `<div class="alpha-sep">Orte (${places.length})</div>`;
    for (const name of places) {
      html += `<div class="person-row" onclick="showPlaceDetail('${esc(name)}')">
        <div class="p-avatar" style="font-size:0.95rem">📍</div>
        <div class="p-info"><div class="p-name">${esc(name)}</div><div class="p-meta">&nbsp;</div></div>
        <span class="p-arrow">›</span></div>`;
    }
  }

  if (!html) {
    html = `<div style="padding:24px 16px;text-align:center;color:var(--text-muted);font-size:0.88rem">Keine Treffer für „${esc(q)}"</div>`;
  }
  out.innerHTML = html;
}

function showMain() {
  _navHistory.length = 0; // Liste = frischer Start, History löschen
  setBnavActive(currentTab || 'persons');
  showView('v-main');
  updateStats();
  renderTab();
}

// ─── History-Navigation ───────────────────────────────────────────
// Muss am Anfang jeder showDetail/showFamilyDetail/showSourceDetail/
// showPlaceDetail stehen.
function _beforeDetailNavigate() {
  if (_detailActive) {
    // Detail → Detail: aktuellen Zustand in History sichern
    if      (currentPersonId) _navHistory.push({ type: 'person', id: currentPersonId });
    else if (currentFamilyId) _navHistory.push({ type: 'family', id: currentFamilyId });
    else if (currentSourceId) _navHistory.push({ type: 'source', id: currentSourceId });
    else if (currentRepoId)   _navHistory.push({ type: 'repo',   id: currentRepoId });
    // Place: Name liegt nicht in einer ID-Variable – über detailTopTitle rekonstruieren
    else {
      const title = document.getElementById('detailTopTitle')?.textContent;
      if (title && title !== '📍 Ort') _navHistory.push({ type: 'place', name: title });
    }
  } else {
    _navHistory.length = 0;
    // Baum → Detail: Tree-Eintrag pushen damit Zurück zum Baum führt
    if (document.getElementById('v-tree').classList.contains('active') && currentTreeId) {
      _navHistory.push({ type: 'tree', id: currentTreeId });
    }
  }
}

// "← Zurück" – geht zur vorherigen Detail-Ansicht, zum Baum oder zur Liste
function goBack() {
  const prev = _navHistory.pop();
  if (!prev) { showMain(); return; }
  if      (prev.type === 'person') showDetail(prev.id, false);
  else if (prev.type === 'family') showFamilyDetail(prev.id, false);
  else if (prev.type === 'source') showSourceDetail(prev.id, false);
  else if (prev.type === 'repo')   showRepoDetail(prev.id, false);
  else if (prev.type === 'place')  showPlaceDetail(prev.name, false);
  else if (prev.type === 'tree')   showTree(prev.id);
  else showMain();
}

// Kleinste numerische Personen-ID
function smallestPersonId() {
  const ids = Object.keys(db.individuals || {});
  if (!ids.length) return null;
  return ids.sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, '')) || 0;
    const nb = parseInt(b.replace(/\D/g, '')) || 0;
    return na - nb;
  })[0];
}

// Startansicht nach Datei-Load: Tree der Person mit kleinster ID
function showStartView() {
  currentTab = 'persons';
  showMain();
  const startId = smallestPersonId();
  if (startId) showTree(startId);
}

function switchTab(tab) {
  currentTab = tab;
  document.getElementById('tab-persons').style.display = tab === 'persons' ? 'block' : 'none';
  document.getElementById('tab-families').style.display = tab === 'families' ? 'block' : 'none';
  document.getElementById('tab-sources').style.display = tab === 'sources' ? 'block' : 'none';
  document.getElementById('tab-places').style.display = tab === 'places' ? 'block' : 'none';
  document.getElementById('tab-search').style.display = tab === 'search' ? 'block' : 'none';
  document.getElementById('fabBtn').style.display = tab === 'search' ? 'none' : '';
  renderTab();
}

function renderTab() {
  if (!document.getElementById('v-main').classList.contains('active')) return;
  if (currentTab === 'persons') applyPersonFilter(); // respektiert aktive Such- und Jahresfilter
  else if (currentTab === 'families') renderFamilyList();
  else if (currentTab === 'sources') { renderSourceList(); renderRepoList(); }
  else if (currentTab === 'places') renderPlaceList();
  else if (currentTab === 'search') runGlobalSearch(document.getElementById('searchGlobal')?.value || '');
}

function updateStats() {
  // Stats-Leiste entfernt – Funktion bleibt als No-op erhalten
}

function updateChangedIndicator() {
  document.getElementById('changedIndicator').style.display = changed ? 'inline-block' : 'none';
}

function markChanged() { changed = true; _placesCache = null; updateChangedIndicator(); }

// ─────────────────────────────────────
//  PERSON LIST
// ─────────────────────────────────────
let _personSort = 'name'; // 'name' | 'date'

function togglePersonSort() {
  _personSort = _personSort === 'name' ? 'date' : 'name';
  const btn = document.getElementById('personSortBtn');
  if (btn) btn.textContent = _personSort === 'date' ? '⇅ Geb.' : '⇅ Name';
  applyPersonFilter();
}

function renderPersonList(persons) {
  const sorted = [...persons].sort((a, b) => {
    if (_personSort === 'date') {
      const ka = gedDateSortKey(a.birth.date), kb = gedDateSortKey(b.birth.date);
      if (ka !== kb) return (ka || 99999999) - (kb || 99999999);
    }
    return (a.surname || a.given || a.name || '').localeCompare(b.surname || b.given || b.name || '', 'de');
  });
  const list = document.getElementById('personList');
  if (!sorted.length) { list.innerHTML = '<div class="empty">Noch keine Personen</div>'; return; }

  let html = '', lastSep = '';
  for (const p of sorted) {
    let sep;
    if (_personSort === 'date') {
      const key = gedDateSortKey(p.birth.date);
      sep = key ? Math.floor(Math.floor(key / 10000) / 10) + '0er' : '?';
    } else {
      sep = (p.surname || p.given || p.name || '?')[0].toUpperCase();
    }
    if (sep !== lastSep) { html += `<div class="alpha-sep">${sep}</div>`; lastSep = sep; }
    const sc = p.sex === 'M' ? 'm' : p.sex === 'F' ? 'f' : '';
    const ic = p.sex === 'M' ? '♂' : p.sex === 'F' ? '♀' : '◇';
    let meta = '';
    if (p.birth.date) meta += '* ' + p.birth.date;
    if (p.birth.place) meta += (meta ? ', ' : '') + p.birth.place;
    if (p.death.date) meta += (meta ? '  † ' : '† ') + p.death.date;
    html += `<div class="person-row" onclick="showDetail('${p.id}')">
      <div class="p-avatar ${sc}">${ic}</div>
      <div class="p-info">
        <div class="p-name">${esc(p.name || p.id)}</div>
        <div class="p-meta">${esc(meta) || '&nbsp;'}</div>
      </div>
      <span class="p-arrow">›</span>
    </div>`;
  }
  list.innerHTML = html;
}

function applyPersonFilter() {
  const q = (document.getElementById('searchInput')?.value) || '';
  const from = parseInt(document.getElementById('yearFrom')?.value) || null;
  const to   = parseInt(document.getElementById('yearTo')?.value)   || null;
  const clearBtn = document.getElementById('yearFilterClear');
  if (clearBtn) clearBtn.style.display = (from || to) ? '' : 'none';
  _applyPersonFilterDebounced(q, from, to);
}

function clearYearFilter() {
  const f = document.getElementById('yearFrom');
  const t = document.getElementById('yearTo');
  if (f) f.value = '';
  if (t) t.value = '';
  applyPersonFilter();
}

function filterPersons(q, yearFrom, yearTo) {
  const lower = q.toLowerCase().trim();
  const all = Object.values(db.individuals);

  const filtered = all.filter(p => {
    // Jahresfilter (Geburtsjahr) — nutzt gedDateSortKey für korrekte FROM/TO/BET-Auflösung
    if (yearFrom || yearTo) {
      const key = gedDateSortKey(p.birth.date);
      const yr = key ? Math.floor(key / 10000) : null;
      if (!yr) return false;
      if (yearFrom && yr < yearFrom) return false;
      if (yearTo   && yr > yearTo)   return false;
    }
    if (!lower) return true;
    // Name
    if ((p.name||'').toLowerCase().includes(lower)) return true;
    if ((p.surname||'').toLowerCase().includes(lower)) return true;
    if ((p.given||'').toLowerCase().includes(lower)) return true;
    if ((p.prefix||'').toLowerCase().includes(lower)) return true;
    if ((p.titl||'').toLowerCase().includes(lower)) return true;
    // Birth / death / burial / chr
    if ((p.birth.date||'').toLowerCase().includes(lower)) return true;
    if ((p.birth.place||'').toLowerCase().includes(lower)) return true;
    if ((p.death.date||'').toLowerCase().includes(lower)) return true;
    if ((p.death.place||'').toLowerCase().includes(lower)) return true;
    if ((p.chr.place||'').toLowerCase().includes(lower)) return true;
    if ((p.buri.place||'').toLowerCase().includes(lower)) return true;
    // Events: value, place, date, eventType
    for (const ev of p.events) {
      if ((ev.value||'').toLowerCase().includes(lower)) return true;
      if ((ev.place||'').toLowerCase().includes(lower)) return true;
      if ((ev.date||'').toLowerCase().includes(lower)) return true;
      if ((ev.eventType||'').toLowerCase().includes(lower)) return true;
    }
    // Notes
    if ((p.noteText||'').toLowerCase().includes(lower)) return true;
    // Religion
    if ((p.reli||'').toLowerCase().includes(lower)) return true;
    return false;
  });

  renderPersonList(filtered);
}

// ─────────────────────────────────────
//  FAMILY LIST
// ─────────────────────────────────────
function renderFamilyList(fams) {
  const el = document.getElementById('familyList');
  if (!fams) fams = Object.values(db.families);
  if (!fams.length) { el.innerHTML = '<div class="empty">Keine Familien gefunden</div>'; return; }
  fams = [...fams].sort((a, b) => {
    const na = a.husb ? (db.individuals[a.husb]?.surname || db.individuals[a.husb]?.name || '') : '';
    const nb = b.husb ? (db.individuals[b.husb]?.surname || db.individuals[b.husb]?.name || '') : '';
    const c = na.localeCompare(nb, 'de');
    if (c !== 0) return c;
    const ya = gedDateSortKey(a.marr.date) || 99999999;
    const yb = gedDateSortKey(b.marr.date) || 99999999;
    return ya - yb;
  });

  let html = '';
  for (const f of fams) {
    const husb = (f.husb && db.individuals[f.husb]) || null;
    const wife = (f.wife && db.individuals[f.wife]) || null;
    const title = [husb?.name, wife?.name].filter(Boolean).join(' & ') || f.id;
    let meta = '';
    if (f.marr.date) meta += '⚭ ' + f.marr.date;
    if (f.marr.place) meta += (meta ? ', ' : '⚭ ') + f.marr.place;
    if (f.children.length) meta += (meta ? '  ' : '') + f.children.length + ' Kind' + (f.children.length > 1 ? 'er' : '');
    html += `<div class="person-row" data-fid="${f.id}" onclick="showFamilyDetail(this.dataset.fid)">
      <div class="p-avatar">👨‍👩‍👧</div>
      <div class="p-info">
        <div class="p-name">${esc(title)}</div>
        <div class="p-meta">${esc(meta) || '&nbsp;'}</div>
      </div>
      <span class="p-arrow">›</span>
    </div>`;
  }
  el.innerHTML = html;
}

function filterFamilies(q) {
  const lower = q.toLowerCase().trim();
  const all = Object.values(db.families);
  if (!lower) { renderFamilyList(all); return; }
  renderFamilyList(all.filter(f => {
    const husb = (f.husb && db.individuals[f.husb]) || null;
    const wife = (f.wife && db.individuals[f.wife]) || null;
    if (husb && (husb.name||'').toLowerCase().includes(lower)) return true;
    if (wife && (wife.name||'').toLowerCase().includes(lower)) return true;
    if ((f.marr.date||'').toLowerCase().includes(lower)) return true;
    if ((f.marr.place||'').toLowerCase().includes(lower)) return true;
    return false;
  }));
}

// ─────────────────────────────────────
//  SOURCE LIST
// ─────────────────────────────────────
function renderSourceList(srcs) {
  const el = document.getElementById('sourceList');
  if (!srcs) srcs = Object.values(db.sources);
  if (!srcs.length) { el.innerHTML = '<div class="empty">Keine Quellen gefunden</div>'; return; }

  let html = '';
  for (const s of srcs) {
    const refCount = Object.values(db.individuals).filter(p => p.sourceRefs && p.sourceRefs.has(s.id)).length
                   + Object.values(db.families).filter(f => f.sourceRefs && f.sourceRefs.has(s.id)).length;
    const hasRepo = s.repo && s.repo.match(/^@[^@]+@$/) && db.repositories[s.repo];
    const repoBadge = hasRepo ? `<span class="repo-badge" style="cursor:pointer" onclick="event.stopPropagation();showRepoDetail('${s.repo}')">🏛</span>` : '';
    const mediaCount = (s.media || []).filter(m => m.file || m.title).length
                     + (s._passthrough || []).filter(l => /^1 OBJE @/.test(l)).length;
    const mediaBadge = mediaCount ? `<span style="font-size:0.8rem;margin-left:5px;vertical-align:middle;opacity:0.7">📎</span>` : '';
    html += `<div class="source-card" data-sid="${s.id}" onclick="showSourceDetail(this.dataset.sid)">
      <div class="source-title">${esc(s.abbr || s.title || s.id)}${repoBadge}${mediaBadge}</div>
      <div class="source-meta">${esc([s.author, s.date].filter(Boolean).join(' · ')) || '&nbsp;'}${refCount ? ` · ${refCount} Ref.` : ''}</div>
    </div>`;
  }
  el.innerHTML = html;
}

function filterSources(q) {
  const lower = q.toLowerCase().trim();
  const all = Object.values(db.sources);
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
  const repos   = Object.values(db.repositories || {});
  const jumpBtn = document.getElementById('repoJumpBtn');
  if (!repos.length) { section.style.display = 'none'; if (jumpBtn) jumpBtn.style.display = 'none'; return; }
  section.style.display = '';
  if (jumpBtn) jumpBtn.style.display = '';
  const sorted = repos.sort((a,b) => (a.name||'').localeCompare(b.name||'','de'));
  el.innerHTML = sorted.map(r => {
    const srcCount = Object.values(db.sources).filter(s => s.repo === r.id).length;
    return `<div class="source-card" onclick="showRepoDetail('${r.id}')">
      <div class="source-title">${esc(r.name || r.id)}</div>
      <div class="source-meta">${r.addr ? esc(r.addr.split('\n')[0]) : '&nbsp;'}${srcCount ? ' · ' + srcCount + ' Quel.' : ''}</div>
    </div>`;
  }).join('');
}

// ─────────────────────────────────────
//  PLACE LIST
// ─────────────────────────────────────
function collectPlaces() {
  if (_placesCache) return _placesCache;
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

  for (const p of Object.values(db.individuals)) {
    addPlace(p.birth.place, p.id, 'Geburt', p.birth.lati, p.birth.long);
    addPlace(p.death.place, p.id, 'Tod', p.death.lati, p.death.long);
    addPlace(p.chr.place,   p.id, 'Taufe', null, null);
    addPlace(p.buri.place,  p.id, 'Beerdigung', p.buri.lati, p.buri.long);
    for (const ev of p.events) addPlace(ev.place, p.id, ev.eventType || ev.type, ev.lati, ev.long);
  }
  for (const f of Object.values(db.families)) {
    addPlace(f.marr.place, f.husb, 'Heirat', f.marr.lati, f.marr.long);
    addPlace(f.marr.place, f.wife, 'Heirat', f.marr.lati, f.marr.long);
  }
  // Manuell hinzugefügte Orte (extraPlaces) einmischen — nur wenn noch nicht vorhanden
  for (const ep of Object.values(db.extraPlaces)) {
    if (!places.has(ep.name))
      places.set(ep.name, { name: ep.name, personIds: new Set(), eventTypes: new Set(), lati: ep.lati ?? null, long: ep.long ?? null });
  }
  _placesCache = places;
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
    html += `<div class="person-row" onclick="showPlaceDetail('${esc(place.name)}')">
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
  openModal('modalPlace');
}

function savePlace() {
  const oldName = document.getElementById('pl-old').value;
  const newName = document.getElementById('pl-name').value.trim();
  if (!newName) { showToast('⚠ Ortsname darf nicht leer sein'); return; }
  closeModal('modalPlace');
  if (newName === oldName) return;
  for (const p of Object.values(db.individuals)) {
    if (p.birth.place  === oldName) p.birth.place  = newName;
    if (p.chr.place    === oldName) p.chr.place    = newName;
    if (p.death.place  === oldName) p.death.place  = newName;
    if (p.buri.place   === oldName) p.buri.place   = newName;
    for (const ev of p.events) if (ev.place === oldName) ev.place = newName;
  }
  for (const f of Object.values(db.families)) {
    if (f.marr.place        === oldName) f.marr.place        = newName;
    if (f.engag?.place      === oldName) f.engag.place       = newName;
  }
  // extraPlaces mitumbenennen
  if (db.extraPlaces[oldName]) {
    db.extraPlaces[newName] = { ...db.extraPlaces[oldName], name: newName };
    delete db.extraPlaces[oldName];
    saveExtraPlaces();
  }
  markChanged();
  showToast('✓ Ort umbenannt');
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
  db.extraPlaces[name] = { name, lati, long };
  saveExtraPlaces();
  _placesCache = null; // markChanged() wird hier nicht aufgerufen, daher manuell
  closeModal('modalNewPlace');
  showToast('✓ Ort hinzugefügt');
  renderTab();
}

function deleteExtraPlace(name) {
  if (!confirm('Ort wirklich entfernen?')) return;
  delete db.extraPlaces[name];
  saveExtraPlaces();
  _placesCache = null; // markChanged() wird hier nicht aufgerufen, daher manuell
  goBack();
  showToast('✓ Ort entfernt');
  renderTab();
}

// ─────────────────────────────────────────────────────────────────
//  BEZIEHUNGS-PICKER
// ─────────────────────────────────────────────────────────────────

function showAddSpouseFlow(personId) {
  _relMode = 'spouse'; _relAnchorId = personId;
  document.getElementById('relPickerTitle').textContent = 'Ehepartner verknüpfen';
  document.getElementById('relPickerSearch').value = '';
  renderRelPicker('');
  openModal('modalRelPicker');
}

function showAddChildFlow(famId) {
  _relMode = 'child'; _relAnchorId = famId;
  document.getElementById('relPickerTitle').textContent = 'Kind hinzufügen';
  document.getElementById('relPickerSearch').value = '';
  renderRelPicker('');
  openModal('modalRelPicker');
}

function showAddParentFlow(personId) {
  _relMode = 'parent'; _relAnchorId = personId;
  document.getElementById('relPickerTitle').textContent = 'Elternteil verknüpfen';
  document.getElementById('relPickerSearch').value = '';
  renderRelPicker('');
  openModal('modalRelPicker');
}

function renderRelPicker(q) {
  const list = document.getElementById('relPickerList');
  const famcIdOf = c => typeof c === 'string' ? c : c.famId;
  let persons = Object.values(db.individuals);

  if (_relMode === 'spouse') {
    const p = db.individuals[_relAnchorId];
    const excl = new Set([_relAnchorId,
      ...(p?.fams || []).flatMap(fid => {
        const f = db.families[fid]; return f ? [f.husb, f.wife] : [];
      }).filter(Boolean)
    ]);
    persons = persons.filter(x => !excl.has(x.id));
  } else if (_relMode === 'child') {
    const f = db.families[_relAnchorId];
    if (f) {
      const excl = new Set([...(f.children || []), f.husb, f.wife].filter(Boolean));
      persons = persons.filter(x => !excl.has(x.id));
    }
  } else if (_relMode === 'parent') {
    persons = persons.filter(x => x.id !== _relAnchorId);
  }

  if (q) {
    const lq = q.toLowerCase();
    persons = persons.filter(x => (x.name || x.id).toLowerCase().includes(lq));
  }

  persons = persons.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de')).slice(0, 60);

  list.innerHTML = '';
  if (!persons.length) {
    list.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;padding:8px 0">Keine Treffer</div>';
    return;
  }
  for (const p of persons) {
    const meta = [p.birth?.date ? '* ' + p.birth.date : '', p.death?.date ? '† ' + p.death.date : ''].filter(Boolean).join('  ');
    const row = document.createElement('div');
    row.className = 'person-row';
    row.dataset.pid = p.id;
    row.innerHTML = `<div class="person-row-info">
      <div class="person-row-name">${esc(p.name || p.id)}</div>
      ${meta ? `<div class="person-row-meta">${esc(meta)}</div>` : ''}
    </div><div class="row-arrow">›</div>`;
    row.addEventListener('click', () => relPickerSelect(p.id));
    list.appendChild(row);
  }
}

function relPickerSelect(selectedId) {
  closeModal('modalRelPicker');
  openRelFamilyForm(_relAnchorId, selectedId, _relMode);
}

function relPickerCreateNew() {
  closeModal('modalRelPicker');
  _pendingRelation = { mode: _relMode, anchorId: _relAnchorId };
  showPersonForm(null);
}

function openRelFamilyForm(anchorId, partnerId, mode) {
  const famcIdOf = c => typeof c === 'string' ? c : c.famId;
  if (mode === 'spouse') {
    const p = db.individuals[anchorId];
    const q = db.individuals[partnerId];
    let husb = anchorId, wife = partnerId;
    if (p?.sex === 'F' || q?.sex === 'M') { husb = partnerId; wife = anchorId; }
    showFamilyForm(null, { husb, wife });

  } else if (mode === 'child') {
    showFamilyForm(anchorId, { addChild: partnerId });

  } else if (mode === 'parent') {
    const p   = db.individuals[anchorId];
    const par = db.individuals[partnerId];
    // Freien Slot in vorhandener Elternfamilie suchen
    let targetFamId = null;
    for (const fc of (p?.famc || [])) {
      const fid = famcIdOf(fc);
      const f = db.families[fid];
      if (!f) continue;
      if (!f.husb && par?.sex !== 'F') { targetFamId = fid; break; }
      if (!f.wife && par?.sex === 'F') { targetFamId = fid; break; }
    }
    if (targetFamId) {
      const slot = par?.sex === 'F' ? 'wife' : 'husb';
      showFamilyForm(targetFamId, { [slot]: partnerId });
    } else {
      const husb = par?.sex === 'F' ? undefined : partnerId;
      const wife = par?.sex === 'F' ? partnerId : undefined;
      showFamilyForm(null, { husb, wife, addChild: anchorId });
    }
  }
}

function unlinkMember(famId, personId) {
  if (!confirm('Verbindung wirklich trennen?')) return;
  const f = db.families[famId];
  const p = db.individuals[personId];
  if (!f || !p) return;
  const famcIdOf = c => typeof c === 'string' ? c : c.famId;

  if (f.husb === personId) {
    f.husb = null;
    p.fams = p.fams.filter(id => id !== famId);
  } else if (f.wife === personId) {
    f.wife = null;
    p.fams = p.fams.filter(id => id !== famId);
  } else if (f.children.includes(personId)) {
    f.children = f.children.filter(id => id !== personId);
    p.famc = p.famc.filter(c => famcIdOf(c) !== famId);
  } else return; // nichts gefunden

  markChanged(); updateStats(); renderTab();
  showToast('✓ Verbindung getrennt');
  if (currentFamilyId === famId) showFamilyDetail(famId);
  else if (currentPersonId) showDetail(currentPersonId);
}

function showPlaceDetail(placeName, pushHistory = true) {
  const places = collectPlaces();
  const place = places.get(placeName);
  if (!place) return;
  if (pushHistory) _beforeDetailNavigate();
  currentPersonId = null; currentFamilyId = null; currentSourceId = null; currentRepoId = null;
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
  if (place.personIds.size === 0 && db.extraPlaces[placeName]) {
    html += `<div style="padding:4px 0 12px">
      <button class="btn btn-danger" style="width:100%"
        data-pname="${placeName.replace(/"/g,'&quot;')}"
        onclick="deleteExtraPlace(this.dataset.pname)">Ort entfernen</button>
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
  for (const p of Object.values(db.individuals)) {
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
  for (const f of Object.values(db.families)) {
    if (f.marr.place && f.marr.place.trim() === placeName) {
      for (const pid of [f.husb, f.wife]) {
        if (!pid) continue;
        const p = db.individuals[pid];
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

// ─────────────────────────────────────
//  STAMMBAUM-ANSICHT (SANDUHR)
// ─────────────────────────────────────
function getParentIds(pid) {
  const p = db.individuals[pid];
  if (!p?.famc?.length) return { father: null, mother: null };
  const ref   = p.famc[0];
  const famId = typeof ref === 'string' ? ref : ref.famId;
  const fam   = db.families[famId];
  return { father: fam?.husb || null, mother: fam?.wife || null };
}

function getChildIds(pid) {
  const p = db.individuals[pid];
  if (!p) return [];
  return (p.fams || []).flatMap(famId => db.families[famId]?.children || []);
}

let currentTreeId = null;

function _updateTreeBackBtn() {
  const btn = document.getElementById('treeBtnBack');
  if (btn) btn.style.display = _treeHistoryPos > 0 ? '' : 'none';
}

function treeNavBack() {
  if (_treeHistoryPos <= 0) return;
  _treeHistoryPos--;
  showTree(_treeHistory[_treeHistoryPos], false);
}

// Kürzt lange Namen im Baum: Vornamen → Initiale(n), Nachname bleibt
function _treeShortName(p, isCenter) {
  const nm = p.name || p.id || '';
  const limit = isCenter ? 26 : 18;
  if (nm.length <= limit) return nm;
  const given = p.given || '';
  const surn  = p.surname || '';
  if (given && surn) {
    const inits = given.trim().split(/\s+/).map(w => w.charAt(0) + '.').join(' ');
    const short = inits + ' ' + surn;
    if (short.length < nm.length) return short;
  }
  return nm;
}

function showTree(personId, addToHistory = true) {
  const p = db.individuals[personId];
  if (!p) return;
  currentPersonId = personId;
  currentTreeId   = personId;

  // ── Navigations-History ──
  if (addToHistory) {
    _treeHistory = _treeHistory.slice(0, _treeHistoryPos + 1);
    if (_treeHistory[_treeHistory.length - 1] !== personId) _treeHistory.push(personId);
    _treeHistoryPos = _treeHistory.length - 1;
  }
  _updateTreeBackBtn();
  setBnavActive('tree');

  // ── Orientierung + Dimensionen ──
  const isPortrait = window.innerWidth < window.innerHeight;
  if (isPortrait) _treeZoomScale = 1; // Portrait: kein Zoom, kompaktes Layout

  const W   = isPortrait ? 80  : 96;
  const H   = isPortrait ? 54  : 64;
  const CW  = isPortrait ? 124 : 160;
  const CH  = isPortrait ? 72  : 80;
  const HGAP    = isPortrait ? 8  : 10;
  const VGAP    = isPortrait ? 34 : 44;
  const MGAP    = isPortrait ? 16 : 20;
  const SIB_GAP = isPortrait ? 12 : 14;
  const PEEK    = isPortrait ? 10 : 12;
  const SLOT = W + HGAP;   // Portrait: 88 → 4 slots = 352px + 2×14 PAD = 380px
  const PAD  = isPortrait ? 14 : 20;
  const ROW  = H + VGAP;

  // ── Vorfahren (4 Ebenen; Hochformat: max. 2 Ebenen) ──
  function _gp(id) { return id ? getParentIds(id) : { father: null, mother: null }; }
  const par0 = getParentIds(personId);
  const anc1 = [par0.father, par0.mother];                                         // 2
  const anc2 = anc1.flatMap(id => { const q = _gp(id); return [q.father, q.mother]; });  // 4
  const anc3 = anc2.flatMap(id => { const q = _gp(id); return [q.father, q.mother]; });  // 8
  const anc4 = anc3.flatMap(id => { const q = _gp(id); return [q.father, q.mother]; });  // 16

  // ── Geschwister (aus erster Elternfamilie) ──
  const sibFamRef = p.famc && p.famc.length > 0 ? p.famc[0] : null;
  const sibFamId  = sibFamRef ? (typeof sibFamRef === 'string' ? sibFamRef : sibFamRef.famId) : null;
  const siblings  = sibFamId
    ? (db.families[sibFamId]?.children || []).filter(id => id !== personId)
    : [];
  const nSibs = siblings.length;

  // ── Alle Ehen / Familien ──
  const allFamilies = (p.fams || []).map(famId => {
    const fam = db.families[famId];
    if (!fam) return null;
    const spId = personId === fam.husb ? (fam.wife || null)
               : personId === fam.wife ? (fam.husb || null)
               : null;
    return { famId, spId, kids: fam.children || [] };
  }).filter(Boolean);

  // ── Kinder (alle Familien, ohne Duplikate) ──
  // mainKids = Kinder der aktiven Ehe (solid); alle anderen = gestrichelt
  const spouseFamsEarly = allFamilies.filter(f => f.spId);
  const activeSpIdxEarly = (_activeSpouseMap[personId] || 0) % Math.max(1, spouseFamsEarly.length);
  const activeFam = spouseFamsEarly.length > 0 ? spouseFamsEarly[activeSpIdxEarly]
                  : allFamilies[0] || null;
  const mainKids = activeFam ? new Set(activeFam.kids) : new Set();
  const seen = new Set();
  const allKids = allFamilies.flatMap(f => f.kids)
    .filter(id => seen.has(id) ? false : (seen.add(id), true));
  const halfKidSet = new Set(allKids.filter(id => !mainKids.has(id)));
  const MAX_CHILD_COLS = 4;
  const childRows = [];
  for (let i = 0; i < allKids.length; i += MAX_CHILD_COLS) childRows.push(allKids.slice(i, i + MAX_CHILD_COLS));

  // ── Layout-Breite ──
  // Geschwister: eine Spalte links (W + SIB_GAP), egal wie viele
  // Ehepartner:  eine Spalte rechts (MGAP + W), egal wie viele
  const sibsW   = nSibs > 0 ? W + SIB_GAP : 0;
  const spousesW = allFamilies.some(f => f.spId) ? MGAP + W : 0;
  // ancSpan: nur so breit wie die tiefste belegte Vorfahren-Ebene; Hochformat max. 2 Ebenen
  const hasAnc4 = !isPortrait && anc4.some(Boolean);
  const hasAnc3 = !isPortrait && anc3.some(Boolean);
  const ancSlots = hasAnc4 ? 16 : hasAnc3 ? 8 : 4;
  const ancSpan = ancSlots * SLOT;
  const personCX = Math.max(PAD + sibsW + CW / 2, PAD + ancSpan / 2);
  const rightEdge = personCX + CW / 2 + spousesW + PAD;
  const childMaxCols = childRows.length > 0 ? Math.max(...childRows.map(r => r.length)) : 0;
  const totalW = Math.max(personCX + ancSpan / 2 + PAD, rightEdge, personCX + childMaxCols * SLOT / 2 + PAD);

  // ── Y-Positionen: Zeile 0 (Zentrum) ──
  const ancLevels = hasAnc4 ? 4 : hasAnc3 ? 3 : 2;
  const baseY = PAD + ancLevels * ROW;
  function ry(lv) { return lv <= 0 ? baseY + lv * ROW : baseY + CH + VGAP + (lv - 1) * ROW; }

  // Höhe der Kartenstapel (Peek-Überlappung: je +PEEK px pro weitere Karte)
  const nSp       = allFamilies.filter(f => f.spId).length;
  const sibStackH = nSibs > 0 ? H + (nSibs - 1) * PEEK : 0;
  const spStackH  = nSp  > 0 ? H + (nSp  - 1) * PEEK : 0;
  // Unterkante der Zeile 0 (Maximum aus Center, Geschwister, Ehepartner)
  const row0Bottom = Math.max(ry(0) + CH, ry(0) + sibStackH, ry(0) + (CH - H) / 2 + spStackH);
  const childStartY = row0Bottom + VGAP;
  const totalH = childRows.length > 0
    ? childStartY + childRows.length * ROW - VGAP + PAD
    : row0Bottom + PAD;

  // ── X: Vorfahren (zentriert auf personCX) ──
  // l4 = Basis (ancSlots Slots), l3/l2/l1 = Mittelwert-Hierarchie aufwärts
  const ancLeft = personCX - ancSpan / 2;
  function l4CX(i) { return ancLeft + (i + 0.5) * SLOT; }
  function l4X(i)  { return l4CX(i) - W / 2; }
  function l3CX(i) { return (l4CX(i * 2) + l4CX(i * 2 + 1)) / 2; }
  function l3X(i)  { return l3CX(i) - W / 2; }
  function l2CX(i) { return (l3CX(i * 2) + l3CX(i * 2 + 1)) / 2; }
  function l2X(i)  { return l2CX(i) - W / 2; }
  function l1CX(i) { return (l2CX(i * 2) + l2CX(i * 2 + 1)) / 2; }
  function l1X(i)  { return l1CX(i) - W / 2; }

  // Tiefe-adaptierte Positions-Auswahl: bei weniger Ebenen höhere l-Funktionen nutzen
  // Tiefe 1=Eltern, 2=Großeltern, 3=UrGroßeltern, 4=UrUrGroßeltern
  const _off = 4 - ancLevels;
  const _aXFns  = [l1X,  l2X,  l3X,  l4X ];
  const _aCXFns = [l1CX, l2CX, l3CX, l4CX];
  function aXFn (d) { return _aXFns [d - 1 + _off]; }
  function aCXFn(d) { return _aCXFns[d - 1 + _off]; }

  // ── X/Y: Zentrumsperson ──
  const personX = personCX - CW / 2;

  // ── X/Y: Geschwister-Stapel (links, eine Spalte) ──
  const sibColX  = personX - SIB_GAP - W;
  const sibColCX = sibColX + W / 2;
  // Stapel: Karte i bei ry(0) + i*PEEK; Mitte von Karte i = ry(0) + i*PEEK + H/2
  function sibMidY(i) { return ry(0) + i * PEEK + H / 2; }

  // ── X/Y: Ehepartner-Stapel (rechts, eine Spalte) ──
  const spColX  = personX + CW + MGAP;
  const spColCX = spColX + W / 2;

  // ── X: Kinder (zentriert auf personCX) ──
  function childRowCX(row, i) { return personCX - (row.length * SLOT) / 2 + (i + 0.5) * SLOT; }
  function childRowX(row, i)  { return childRowCX(row, i) - W / 2; }

  // ── DOM aufbauen ──
  document.getElementById('treeTopTitle').textContent = p.name || personId;
  const wrap = document.getElementById('treeWrap');
  const scaleWrap = document.getElementById('treeScaleWrap');
  wrap.style.width  = totalW + 'px';
  wrap.style.height = totalH + 'px';
  wrap.style.transform = _treeZoomScale !== 1 ? `scale(${_treeZoomScale})` : '';
  wrap.style.transformOrigin = '0 0';
  if (scaleWrap) {
    scaleWrap.style.width  = Math.round(totalW * _treeZoomScale) + 'px';
    scaleWrap.style.height = Math.round(totalH * _treeZoomScale) + 'px';
  }
  wrap.querySelectorAll('.tree-card, .tree-marr-btn').forEach(el => el.remove());
  const svg = document.getElementById('treeSvg');
  svg.setAttribute('width',   totalW);
  svg.setAttribute('height',  totalH);
  svg.setAttribute('viewBox', `0 0 ${totalW} ${totalH}`);
  svg.innerHTML = '';

  function svgLine(x1, y1, x2, y2, stroke = 'var(--border)', dash = null) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    el.setAttribute('x1', x1); el.setAttribute('y1', y1);
    el.setAttribute('x2', x2); el.setAttribute('y2', y2);
    el.setAttribute('stroke', stroke);
    el.setAttribute('stroke-width', '1.5');
    if (dash) el.setAttribute('stroke-dasharray', dash);
    svg.appendChild(el);
  }

  function line(x1, y1, x2, y2, color = 'var(--border)', dash = null) {
    const mid = (y1 + y2) / 2;
    const el  = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    el.setAttribute('d', `M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2}`);
    el.setAttribute('stroke', color);
    el.setAttribute('stroke-width', '1.5');
    el.setAttribute('fill', 'none');
    if (dash) el.setAttribute('stroke-dasharray', dash);
    svg.appendChild(el);
  }

  function mkCard(id, x, y, isCenter, isHalf = false, zidx = null, isPeek = false, onClick = null, extraBadge = '') {
    const div = document.createElement('div');
    div.className = 'tree-card' +
      (isCenter ? ' tree-card-center' : '') +
      (isHalf   ? ' tree-card-half'   : '') +
      (isPeek   ? ' tree-card-peek'   : '');
    div.style.left = Math.round(x) + 'px';
    div.style.top  = Math.round(y) + 'px';
    if (zidx !== null) div.style.zIndex = zidx;
    div.style.width  = (isCenter ? CW : W) + 'px';
    div.style.height = (isCenter ? CH : H) + 'px';
    if (!id) {
      div.classList.add('tree-card-empty');
      div.innerHTML = '<span style="color:var(--text-muted);font-size:0.8rem">?</span>';
      wrap.appendChild(div);
      return;
    }
    const q = db.individuals[id];
    if (!q) return;
    div.dataset.sex = q.sex || 'U';
    const nm = _treeShortName(q, isCenter);
    const by   = (q.birth?.date || '').replace(/.*(\d{4}).*/, '$1');
    const dy   = (q.death?.date || '').replace(/.*(\d{4}).*/, '$1');
    const yr   = [by ? '*' + by : '', dy ? '†' + dy : ''].filter(Boolean).join(' ');
    const multiMarr = isCenter && spouseFamsEarly.length > 1;
    div.innerHTML =
      `<div class="tree-name">${esc(nm)}</div>` +
      (yr ? `<div class="tree-yr" style="${isPortrait ? 'font-size:0.58rem;white-space:nowrap' : ''}">${yr}</div>` : '') +
      (isHalf ? `<div class="tree-half-badge">½</div>` : '') +
      (multiMarr ? `<div class="tree-half-badge" style="left:auto;right:4px;background:var(--gold-dim);color:var(--bg)">⚭${spouseFamsEarly.length}</div>` : '') +
      extraBadge;
    div.onclick = onClick !== null ? onClick : (isCenter ? () => showDetail(id) : () => showTree(id));
    wrap.appendChild(div);
  }

  // ── UrUrGroßeltern (Ebene -4, nur Querformat/Desktop) ──
  if (hasAnc4) anc4.forEach((id, i) => {
    if (!id) return;
    mkCard(id, l4X(i), ry(-4), false);
    if (anc3[Math.floor(i / 2)]) line(l4CX(i), ry(-4) + H, l3CX(Math.floor(i / 2)), ry(-3));
  });

  // ── UrGroßeltern (Ebene -3, nur Querformat/Desktop) ──
  if (hasAnc3) anc3.forEach((id, i) => {
    if (!id) return;
    mkCard(id, aXFn(3)(i), ry(-3), false);
    if (anc2[Math.floor(i / 2)]) line(aCXFn(3)(i), ry(-3) + H, aCXFn(2)(Math.floor(i / 2)), ry(-2));
  });

  // ── Großeltern + Linien zu Eltern ──
  anc2.forEach((id, i) => {
    mkCard(id, aXFn(2)(i), ry(-2), false);
    if (id) line(aCXFn(2)(i), ry(-2) + H, aCXFn(1)(Math.floor(i / 2)), ry(-1));
  });

  // ── Eltern ──
  anc1.forEach((id, i) => mkCard(id, aXFn(1)(i), ry(-1), false));

  // ── Eltern → Kinder: symmetrischer Verzweigungspunkt bei personCX ──
  if (anc1[0] || anc1[1] || nSibs > 0) {
    const juncX = personCX;
    const juncY = ry(-1) + H + Math.round(VGAP * 0.4);
    if (anc1[0]) line(aCXFn(1)(0), ry(-1) + H, juncX, juncY);
    if (anc1[1]) line(aCXFn(1)(1), ry(-1) + H, juncX, juncY);
    line(juncX, juncY, personCX, ry(0));
    if (nSibs > 0) {
      // T-Strich: horizontal zum Geschwisterstapel, dann vertikal durch den Stapel
      svgLine(juncX, juncY, sibColCX, juncY);
      svgLine(sibColCX, juncY, sibColCX, sibMidY(nSibs - 1));
    }
  }

  // ── Geschwister: Kartenstapel links ──
  // Alle stapeln sich mit PEEK-Streifen; jede Karte navigiert zum jeweiligen Geschwister.
  // Erste (oberste) Karte zeigt Anzahl-Badge.
  siblings.forEach((sid, i) => {
    const y = ry(0) + i * PEEK;
    const z = nSibs - i + 5;
    const badge = (i === 0 && nSibs > 1)
      ? `<div class="tree-half-badge" style="bottom:auto;top:3px;right:4px;color:var(--gold)">${nSibs}</div>`
      : '';
    mkCard(sid, sibColX, y, false, false, z, i > 0, null, badge);
  });

  // ── Zentrumsperson ──
  mkCard(personId, personX, ry(0), true);

  // ── Ehepartner: Kartenstapel rechts ──
  // Aktiver Ehepartner (Index aus _activeSpouseMap) liegt oben und ist voll lesbar.
  // Andere Karten zeigen nur einen PEEK-Streifen; Klick macht diese zur aktiven.
  const spouseFams  = spouseFamsEarly;
  const activeSpIdx = activeSpIdxEarly;
  const orderedSp   = spouseFams.length > 0
    ? [spouseFams[activeSpIdx], ...spouseFams.filter((_, i) => i !== activeSpIdx)]
    : [];
  const spouseBaseY = ry(0) + (CH - H) / 2;
  orderedSp.forEach((fam, displayIdx) => {
    const origIdx = spouseFams.indexOf(fam);
    const isActive = displayIdx === 0;
    const y = spouseBaseY + displayIdx * PEEK;
    const z = spouseFams.length - displayIdx + 5;
    const onClick = isActive
      ? () => showTree(fam.spId)
      : () => { _activeSpouseMap[personId] = origIdx; showTree(personId, false); };
    mkCard(fam.spId, spColX, y, false, false, z, !isActive, onClick);
    if (isActive) {
      svgLine(personX + CW, ry(0) + CH / 2, spColX, y + H / 2, 'var(--gold)', '5 3');
      // Klickbares div-Element auf der Ehe-Linie (SVG hat pointer-events:none)
      const lineY = ry(0) + CH / 2;
      const midX  = (personX + CW + spColX) / 2;
      const btn   = document.createElement('div');
      btn.className = 'tree-marr-btn';
      btn.style.cssText = `position:absolute;left:${Math.round(personX + CW)}px;top:${Math.round(lineY - 12)}px;width:${Math.round(spColX - personX - CW)}px;height:24px;cursor:pointer;z-index:6;display:flex;align-items:center;justify-content:center`;
      btn.title = 'Familie öffnen';
      btn.innerHTML = `<span style="background:var(--surface2);border:1px solid var(--gold-dim);border-radius:8px;padding:1px 5px;font-size:0.7rem;color:var(--gold-dim);pointer-events:none">⚭</span>`;
      btn.addEventListener('click', () => showFamilyDetail(fam.famId));
      wrap.appendChild(btn);
    }
  });

  // ── Kinder + Linien (childStartY statt ry(1)) ──
  childRows.forEach((row, rowIdx) => {
    const rowY = childStartY + rowIdx * ROW;
    row.forEach((id, i) => {
      const cxi    = childRowCX(row, i);
      const isHalf = halfKidSet.has(id);
      mkCard(id, childRowX(row, i), rowY, false, isHalf);
      line(personCX, row0Bottom, cxi, rowY, isHalf ? 'var(--gold-dim)' : 'var(--border)', isHalf ? '4 3' : null);
    });
  });

  // ── Tastatur-Navigationsziele speichern ──
  _treeNavTargets = {
    up:    par0.father || null,
    up2:   par0.mother || null,
    down:  allKids[0]  || null,
    right: spouseFams[activeSpIdx]?.spId || null,
  };

  showView('v-tree');
  _initTreeDrag();
  _initTreeKeys();
  // Auto-Zentrierung: Zentrumsperson horizontal + vertikal ~1/3 von oben
  setTimeout(() => {
    const sc = document.getElementById('treeScroll');
    const scaledW = totalW * _treeZoomScale;
    const scaledH = totalH * _treeZoomScale;
    const leftPad = Math.max(0, Math.floor((sc.clientWidth  - scaledW) / 2));
    const topPad  = Math.max(0, Math.floor((sc.clientHeight - scaledH) / 2));
    const posEl = scaleWrap || wrap;
    posEl.style.marginLeft = leftPad + 'px';
    posEl.style.marginTop  = topPad  + 'px';
    if (scaleWrap) { wrap.style.marginLeft = ''; wrap.style.marginTop = ''; }
    sc.scrollLeft = Math.max(0, leftPad + personCX * _treeZoomScale - sc.clientWidth  / 2);
    sc.scrollTop  = Math.max(0, topPad  + ry(0) * _treeZoomScale   - Math.round(sc.clientHeight * 0.4));
  }, 60);
}

// ─────────────────────────────────────
//  DETAIL: PERSON
// ─────────────────────────────────────
function showDetail(id, pushHistory = true) {
  const p = db.individuals[id];
  if (!p) return;
  if (pushHistory) _beforeDetailNavigate();
  currentPersonId = id;
  currentFamilyId = null;
  currentSourceId = null;
  currentRepoId   = null;

  document.getElementById('detailTopTitle').textContent = p.name || id;
  document.getElementById('editBtn').style.display = '';
  document.getElementById('editBtn').onclick = () => showPersonForm(id);
  document.getElementById('treeBtn').style.display = '';
  document.getElementById('treeBtn').onclick = () => showTree(id);

  const sc = p.sex === 'M' ? 'm' : p.sex === 'F' ? 'f' : '';
  const ic = p.sex === 'M' ? '♂' : p.sex === 'F' ? '♀' : '◇';

  const fullName = [p.prefix, p.name, p.suffix].filter(Boolean).join(' ');

  let html = `<div class="detail-hero fade-up">
    <div id="det-photo-${id}" style="display:none"></div>
    <div class="detail-hero-text">
      <div class="detail-name">${esc(fullName || id)} <span style="font-size:1rem;color:var(${sc === 'm' ? '--blue' : sc === 'f' ? '--pink' : '--gold-dim'})">${ic}</span></div>
      <div class="detail-id">${p.lastChanged ? 'Geändert ' + p.lastChanged : ''}</div>
    </div>
  </div>`;

  // Life data
  html += `<div class="section fade-up">
    <div class="section-head">
      <div class="section-title">Lebensdaten</div>
      <button class="section-add" data-pid="${id}" onclick="showEventForm(this.dataset.pid)">+ Ereignis</button>
    </div>`;

  for (const en of (p.extraNames || [])) {
    const enLabel = en.type ? (NAME_TYPE_LABELS[en.type] || en.type) : 'Weiterer Name';
    const enVal = [en.prefix, en.nameRaw || [en.given, en.surname ? '/'+en.surname+'/' : ''].filter(Boolean).join(' '), en.suffix].filter(Boolean).join(' ');
    if (enVal) html += factRow(enLabel, enVal);
  }

  if (p.birth.date || p.birth.place) {
    const geoBtn = (p.birth.lati !== null && p.birth.lati !== undefined)
      ? `<a href="https://maps.apple.com/?ll=${p.birth.lati},${p.birth.long}" target="_blank" style="color:var(--gold-dim);font-size:0.75rem;text-decoration:none;margin-left:5px">📍</a>` : '';
    html += `<div class="fact-row" data-pid="${id}" data-ev="BIRT" onclick="showEventForm(this.dataset.pid,this.dataset.ev)" style="cursor:pointer"><span class="fact-lbl">Geburt</span><span class="fact-val">${esc([p.birth.date, p.birth.place].filter(Boolean).join(', '))}${geoBtn}${sourceTagsHtml(p.birth.sources)}</span></div>`;
  }
  if (p.chr.date || p.chr.place) {
    html += `<div class="fact-row" data-pid="${id}" data-ev="CHR" onclick="showEventForm(this.dataset.pid,this.dataset.ev)" style="cursor:pointer"><span class="fact-lbl">Taufe</span><span class="fact-val">${esc([p.chr.date, p.chr.place].filter(Boolean).join(', '))}${sourceTagsHtml(p.chr.sources)}</span></div>`;
  }
  if (p.death.date || p.death.place) {
    const geoBtn = (p.death.lati !== null && p.death.lati !== undefined)
      ? `<a href="https://maps.apple.com/?ll=${p.death.lati},${p.death.long}" target="_blank" style="color:var(--gold-dim);font-size:0.75rem;text-decoration:none;margin-left:5px">📍</a>` : '';
    html += `<div class="fact-row" data-pid="${id}" data-ev="DEAT" onclick="showEventForm(this.dataset.pid,this.dataset.ev)" style="cursor:pointer"><span class="fact-lbl">Tod</span><span class="fact-val">${esc([p.death.date, p.death.place, p.death.cause].filter(Boolean).join(', '))}${geoBtn}${sourceTagsHtml(p.death.sources)}</span></div>`;
  }
  if (p.buri.date || p.buri.place) {
    const geoBtn = (p.buri.lati !== null && p.buri.lati !== undefined)
      ? `<a href="https://maps.apple.com/?ll=${p.buri.lati},${p.buri.long}" target="_blank" style="color:var(--gold-dim);font-size:0.75rem;text-decoration:none;margin-left:5px">📍</a>` : '';
    html += `<div class="fact-row" data-pid="${id}" data-ev="BURI" onclick="showEventForm(this.dataset.pid,this.dataset.ev)" style="cursor:pointer"><span class="fact-lbl">Beerdigung</span><span class="fact-val">${esc([p.buri.date, p.buri.place].filter(Boolean).join(', '))}${geoBtn}${sourceTagsHtml(p.buri.sources)}</span></div>`;
  }

  p.events.forEach((ev, idx) => {
    const label = ev.eventType || EVENT_LABELS[ev.type] || ev.type;
    const geoBtn = (ev.lati !== null && ev.lati !== undefined)
      ? `<a href="https://maps.apple.com/?ll=${ev.lati},${ev.long}" target="_blank" style="color:var(--gold-dim);font-size:0.75rem;text-decoration:none;margin-left:5px">📍</a>` : '';
    const parts = [ev.value, ev.date, ev.place].filter(Boolean).join(', ');
    const mediaBadge = (ev.media?.length > 0) ? `<span style="font-size:0.72rem;color:var(--text-dim);margin-left:5px">📎${ev.media.length}</span>` : '';
    html += `<div class="fact-row" data-pid="${id}" data-ev="${idx}" onclick="showEventForm(this.dataset.pid,this.dataset.ev)" style="cursor:pointer">
      <span class="fact-lbl">${esc(label)}</span>
      <span class="fact-val">${esc(parts)}${geoBtn}${sourceTagsHtml(ev.sources || [])}${mediaBadge}</span>
    </div>`;
  });

  if (p.titl) html += factRow('Titel', p.titl);
  if (p.reli) html += factRow('Religion', p.reli);
  if (p.resn)  html += factRow('Beschränkung', p.resn);
  if (p.email) html += `<div class="fact-row"><span class="fact-lbl">E-Mail</span><span class="fact-val"><a href="mailto:${esc(p.email)}" style="color:var(--gold)">${esc(p.email)}</a></span></div>`;
  if (p.www)   html += `<div class="fact-row"><span class="fact-lbl">Website</span><span class="fact-val"><a href="${esc(p.www)}" target="_blank" rel="noopener" style="color:var(--gold)">${esc(p.www)}</a></span></div>`;

  if (!p.birth.date && !p.death.date && !p.events.length && !p.chr.date && !p.buri.date)
    html += `<div style="color:var(--text-muted);font-style:italic;font-size:0.85rem">Keine Lebensdaten eingetragen</div>`;

  html += `</div>`;

  // Notes
  if (p.noteText) {
    html += `<div class="section fade-up"><div class="section-title">Notizen</div>
      <div style="font-size:0.88rem;color:var(--text-dim);line-height:1.6;white-space:pre-wrap">${esc(p.noteText)}</div>
    </div>`;
  }

  // Media section: inline entries from media[] + reference entries from passthrough
  const indiMedia = p.media || [];
  const indiPtObje = (p._passthrough || []).filter(l => /^1 OBJE @/.test(l));
  {
    const _objeMap = _buildObjeRefMap();
    html += `<div class="section fade-up">
      <div class="section-head">
        <div class="section-title">Medien</div>
        <button class="section-add" onclick="openAddMediaDialog('person','${id}')">+ Hinzufügen</button>
      </div>`;
    for (let i = 0; i < indiMedia.length; i++) {
      const m = indiMedia[i];
      const display = m.title || m.file || '–';
      const sub = m.title && m.file ? m.file : '';
      const idbKey  = 'photo_' + id + '_' + i;
      const heroKey = 'photo_' + id;
      const _ext = (m.file || '').split('.').pop().toLowerCase();
      const _isImg = ['jpg','jpeg','png','gif','bmp','webp','tif','tiff'].includes(_ext);
      const _icon = _isImg ? '🖼' : _ext === 'pdf' ? '📄' : '📎';
      html += `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border-color);cursor:pointer"
        onclick="openMediaPhoto('${idbKey}','${heroKey}','det-photo-${id}',null)">
        <div id="media-thumb-indi-${id}-${i}" style="flex-shrink:0;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem;background:var(--bg-card);border-radius:6px;border:1px solid var(--border-color)">${_icon}</div>
        <div style="flex:1;min-width:0">
          <div style="word-break:break-all;font-size:0.88rem;font-weight:500">${esc(display)}</div>
          ${sub ? `<div style="color:var(--text-muted);font-size:0.78rem;word-break:break-all">${esc(sub)}</div>` : ''}
        </div>
        <button class="edit-media-btn" onclick="event.stopPropagation();openEditMediaDialog('person','${id}',${i})" title="Bearbeiten">✎</button>
      </div>`;
    }
    for (const l of indiPtObje) {
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
    if (!indiMedia.length && !indiPtObje.length) html += `<div style="color:var(--text-muted);font-style:italic;font-size:0.85rem;padding:4px 0">Keine Medien eingetragen</div>`;
    html += `</div>`;
  }

  // As spouse — immer anzeigen (Button auch wenn noch keine Familie)
  html += `<div class="section fade-up">
    <div class="section-head">
      <div class="section-title">Ehepartner &amp; Kinder</div>
      <button class="section-add" data-pid="${id}" onclick="showAddSpouseFlow(this.dataset.pid)">+ Ehepartner</button>
    </div>`;
  for (const famId of p.fams) {
    const fam = db.families[famId];
    if (!fam) continue;
    const marriageLabel = fam.marr.date ? fam.marr.date : famId;
    html += `<div class="family-nav-row" onclick="showFamilyDetail('${famId}')">
      <span class="fnr-label"><span class="fnr-icon">⚭</span> Familie · ${esc(marriageLabel)}</span>
      <span class="row-arrow">›</span>
    </div>`;
    const partnerId = p.sex === 'M' ? fam.wife : fam.husb;
    const partner = partnerId ? db.individuals[partnerId] : null;
    if (partner) html += relRow(partner, 'Ehepartner' + (fam.marr.date ? ' · ' + fam.marr.date : ''), famId);
    for (const cid of fam.children) {
      const child = db.individuals[cid];
      if (child) html += relRow(child, 'Kind' + (child.birth.date ? ' · * ' + child.birth.date : ''), famId);
    }
    html += `<div style="display:flex;justify-content:flex-end;padding:2px 0 8px">
      <button class="section-add" data-fid="${famId}" onclick="showAddChildFlow(this.dataset.fid)">+ Kind</button>
    </div>`;
  }
  html += `</div>`;

  // Parents — immer anzeigen (Button auch wenn noch keine Eltern)
  html += `<div class="section fade-up">
    <div class="section-head">
      <div class="section-title">Eltern</div>
      <button class="section-add" data-pid="${id}" onclick="showAddParentFlow(this.dataset.pid)">+ Elternteil</button>
    </div>`;
  for (const fref of p.famc) {
    const famId = typeof fref === 'string' ? fref : fref.famId;
    const fam = db.families[famId];
    if (!fam) continue;
    html += `<div class="family-nav-row" style="display:flex;align-items:center;gap:6px">
      <span class="fnr-label" style="flex:1;cursor:pointer" onclick="showFamilyDetail('${famId}')"><span class="fnr-icon">⚭</span> Herkunftsfamilie · ${famId}</span>
      <button class="unlink-btn" data-fid="${famId}" data-pid="${id}"
        onclick="unlinkMember(this.dataset.fid, this.dataset.pid)"
        title="Aus Herkunftsfamilie austragen">×</button>
      <span class="row-arrow" style="cursor:pointer" onclick="showFamilyDetail('${famId}')">›</span>
    </div>`;
    for (const pid of [fam.husb, fam.wife]) {
      if (!pid) continue;
      const parent = db.individuals[pid];
      if (parent) html += relRow(parent, parent.sex === 'M' ? 'Vater' : parent.sex === 'F' ? 'Mutter' : 'Elternteil');
    }
  }
  html += `</div>`;

  document.getElementById('detailContent').innerHTML = html;
  showView('v-detail');

  // Foto async aus IDB nachladen (Sprint P3-2)
  (async () => {
    const src = await idbGet('photo_' + id).catch(() => null)
             || await _odGetPhotoUrl('photo_' + id).catch(() => null);
    if (!src) return;
    const el = document.getElementById('det-photo-' + id);
    if (el) { el.style.display = ''; el.innerHTML = `<img src="${src}" alt="Foto" style="width:80px;height:96px;object-fit:cover;border-radius:8px;display:block;flex-shrink:0;cursor:pointer" onclick="showLightbox(this.src)">`; }
    // Lazy migration (nur für IDB-base64, nicht blob: URLs)
    if (!src.startsWith('blob:')) idbGet('photo_' + id + '_0').then(v => { if (!v) idbPut('photo_' + id + '_0', src).catch(() => {}); }).catch(() => {});
  })();
  // Media-Thumbnails async laden
  for (let _mi = 0; _mi < indiMedia.length; _mi++) {
    _asyncLoadMediaThumb('media-thumb-indi-' + id + '-' + _mi, 'photo_' + id + '_' + _mi);
  }
}

function showFamilyDetail(id, pushHistory = true) {
  const f = db.families[id];
  if (!f) return;
  if (pushHistory) _beforeDetailNavigate();
  currentFamilyId = id;
  currentPersonId = null;
  currentSourceId = null;
  currentRepoId   = null;

  const husb = f.husb ? db.individuals[f.husb] : null;
  const wife = f.wife ? db.individuals[f.wife] : null;
  const title = [husb?.name, wife?.name].filter(Boolean).join(' & ') || id;

  document.getElementById('detailTopTitle').textContent = 'Familie';
  document.getElementById('editBtn').style.display = '';
  document.getElementById('editBtn').onclick = () => showFamilyForm(id);
  const _famTreeTarget = f.husb || f.wife || null;
  document.getElementById('treeBtn').style.display = _famTreeTarget ? '' : 'none';
  if (_famTreeTarget) document.getElementById('treeBtn').onclick = () => showTree(_famTreeTarget);

  let html = `<div class="detail-hero fade-up">
    <div id="det-fam-photo-${id}" style="display:none"></div>
    <div id="det-fam-avatar-${id}" class="detail-avatar" style="font-size:1.8rem">👨‍👩‍👧</div>
    <div class="detail-hero-text">
      <div class="detail-name">${esc(title)}</div>
    </div>
  </div>`;

  if (f.marr.date || f.marr.place || f.marr.addr) {
    html += `<div class="section fade-up"><div class="section-title">Heirat</div>`;
    const marrSrc = (f.marr.sources?.length) ? f.marr.sources : (f.sourceRefs?.length ? [...f.sourceRefs] : null);
    if (f.marr.date) html += factRow('Datum', f.marr.date, '', f.marr.place ? null : marrSrc);
    if (f.marr.place) {
      const geoBtn = (f.marr.lati !== null && f.marr.lati !== undefined)
        ? `<a href="https://maps.apple.com/?ll=${f.marr.lati},${f.marr.long}" target="_blank" style="color:var(--gold-dim);font-size:0.75rem;text-decoration:none;margin-left:5px">📍</a>` : '';
      html += factRow('Ort', f.marr.place, geoBtn, marrSrc);
    }
    if (f.marr.addr) html += factRow('Adresse', f.marr.addr);
    html += `</div>`;
  }
  if (f.engag?.date || f.engag?.place) {
    html += `<div class="section fade-up"><div class="section-title">Verlobung</div>`;
    if (f.engag.date)  html += factRow('Datum', f.engag.date);
    if (f.engag.place) html += factRow('Ort',   f.engag.place);
    html += `</div>`;
  }

  html += `<div class="section fade-up">
    <div class="section-head">
      <div class="section-title">Mitglieder</div>
      <button class="section-add" data-fid="${id}" onclick="showAddChildFlow(this.dataset.fid)">+ Kind</button>
    </div>`;
  if (husb) html += relRow(husb, 'Ehemann / Vater', id);
  if (wife) html += relRow(wife, 'Ehefrau / Mutter', id);
  for (const cid of f.children) {
    const child = db.individuals[cid];
    if (child) html += relRow(child, 'Kind', id);
  }
  html += `</div>`;

  if (f.noteText) {
    html += `<div class="section fade-up"><div class="section-title">Notizen</div>
      <div style="font-size:0.88rem;color:var(--text-dim);line-height:1.6;white-space:pre-wrap">${esc(f.noteText)}</div>
    </div>`;
  }

  // Media section: marr.media[] (2 OBJE unter MARR), f.media[] (1 OBJE auf FAM-Ebene), ref OBJE in _passthrough
  const famMedia = f.media || [];
  const _objeMap = _buildObjeRefMap();
  // f.marr.media[] enthält inline OBJE-Blöcke unter MARR; titl-Feld (nicht title)
  const marrObjeEntries = (f.marr?.media || []).map(m => ({ file: m.file || '', title: m.titl || '', form: m.form || '' }));
  const famPtObje = (f._passthrough || []).filter(l => /^1 OBJE @/.test(l));
  {
    html += `<div class="section fade-up">
      <div class="section-head">
        <div class="section-title">Medien</div>
        <button class="section-add" onclick="openAddMediaDialog('family','${id}')">+ Hinzufügen</button>
      </div>`;
    for (let i = 0; i < marrObjeEntries.length; i++) {
      const m = marrObjeEntries[i];
      const display = m.title || m.file || '–';
      const sub = m.title && m.file ? m.file : '';
      const idbKey  = 'photo_fam_' + id + '_' + i;
      const heroKey = 'photo_fam_' + id;
      const _ext = (m.file || '').split('.').pop().toLowerCase();
      const _isImg = ['jpg','jpeg','png','gif','bmp','webp','tif','tiff'].includes(_ext);
      const _icon = _isImg ? '🖼' : _ext === 'pdf' ? '📄' : '📎';
      html += `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border-color);cursor:pointer"
        onclick="openMediaPhoto('${idbKey}','${heroKey}','det-fam-photo-${id}','det-fam-avatar-${id}')">
        <div id="media-thumb-fam-${id}-${i}" style="flex-shrink:0;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem;background:var(--bg-card);border-radius:6px;border:1px solid var(--border-color)">${_icon}</div>
        <div style="flex:1;min-width:0">
          <div style="word-break:break-all;font-size:0.88rem;font-weight:500">${esc(display)}</div>
          ${sub ? `<div style="color:var(--text-muted);font-size:0.78rem;word-break:break-all">${esc(sub)}</div>` : ''}
        </div>
        <button class="edit-media-btn" onclick="event.stopPropagation();openEditMediaDialog('family','${id}',${i})" title="Bearbeiten">✎</button>
      </div>`;
    }
    for (let i = 0; i < famMedia.length; i++) {
      const m = famMedia[i];
      const display = m.title || m.file || '–';
      const sub = m.title && m.file ? m.file : '';
      const idbKey  = 'photo_fam_media_' + id + '_' + i;
      const heroKey = 'photo_fam_' + id;
      const _ext = (m.file || '').split('.').pop().toLowerCase();
      const _isImg = ['jpg','jpeg','png','gif','bmp','webp','tif','tiff'].includes(_ext);
      const _icon = _isImg ? '🖼' : _ext === 'pdf' ? '📄' : '📎';
      html += `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border-color);cursor:pointer"
        onclick="openMediaPhoto('${idbKey}','${heroKey}','det-fam-photo-${id}','det-fam-avatar-${id}')">
        <div id="media-thumb-fam-media-${id}-${i}" style="flex-shrink:0;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem;background:var(--bg-card);border-radius:6px;border:1px solid var(--border-color)">${_icon}</div>
        <div style="flex:1;min-width:0">
          <div style="word-break:break-all;font-size:0.88rem;font-weight:500">${esc(display)}</div>
          ${sub ? `<div style="color:var(--text-muted);font-size:0.78rem;word-break:break-all">${esc(sub)}</div>` : ''}
        </div>
        <button class="edit-media-btn" onclick="event.stopPropagation();openEditMediaDialog('family_media','${id}',${i})" title="Bearbeiten">✎</button>
      </div>`;
    }
    for (const l of famPtObje) {
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
    if (!marrObjeEntries.length && !famMedia.length && !famPtObje.length) html += `<div style="color:var(--text-muted);font-style:italic;font-size:0.85rem;padding:4px 0">Keine Medien eingetragen</div>`;
    html += `</div>`;
  }

  document.getElementById('detailContent').innerHTML = html;
  showView('v-detail');

  // Foto async aus IDB nachladen
  (async () => {
    const src = await idbGet('photo_fam_' + id).catch(() => null)
             || await _odGetPhotoUrl('photo_fam_' + id).catch(() => null);
    if (!src) return;
    const el = document.getElementById('det-fam-photo-' + id);
    if (el) {
      el.style.display = ''; el.innerHTML = '';
      const img = document.createElement('img');
      img.src = src; img.alt = 'Foto';
      img.style.cssText = 'width:80px;height:96px;object-fit:cover;border-radius:8px;display:block;flex-shrink:0;cursor:pointer';
      img.onclick = () => showLightbox(img.src);
      el.appendChild(img);
      const av = document.getElementById('det-fam-avatar-' + id);
      if (av) av.style.display = 'none';
    }
    if (!src.startsWith('blob:')) idbGet('photo_fam_' + id + '_0').then(v => { if (!v) idbPut('photo_fam_' + id + '_0', src).catch(() => {}); }).catch(() => {});
  })();
  // Media-Thumbnails async laden
  for (let _mi = 0; _mi < marrObjeEntries.length; _mi++) {
    _asyncLoadMediaThumb('media-thumb-fam-' + id + '-' + _mi, 'photo_fam_' + id + '_' + _mi);
  }
  for (let _mi = 0; _mi < famMedia.length; _mi++) {
    _asyncLoadMediaThumb('media-thumb-fam-media-' + id + '-' + _mi, 'photo_fam_media_' + id + '_' + _mi);
  }
}

