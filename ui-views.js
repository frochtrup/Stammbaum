// ─────────────────────────────────────
//  PROBAND
// ─────────────────────────────────────
let _probandId = null;  // null = Fallback auf kleinste ID

function getProbandId() {
  return (_probandId && AppState.db.individuals[_probandId]) ? _probandId : smallestPersonId();
}

// ─────────────────────────────────────
//  NAVIGATION
// ─────────────────────────────────────
function _updateTopbarH() {
  const tb = document.querySelector('#v-main .topbar');
  if (tb) document.documentElement.style.setProperty('--topbar-h', tb.offsetHeight + 'px');
}

function showView(id) {
  const desktop = window.innerWidth >= 900 && id !== 'v-landing';
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
  if (id === 'v-main') _updateTopbarH();

  if (desktop) {
    document.getElementById('v-main').classList.add('active');
    document.getElementById('bottomNav').style.display = 'flex';
    document.getElementById('fabBtn').style.display = '';
    AppState._detailActive = (id === 'v-detail');
    document.body.classList.add('desktop-mode');
    document.body.classList.toggle('has-detail', id === 'v-detail');
    if (id === 'v-detail') { document.getElementById('v-detail').scrollTop = 0; _initDetailSwipe(); }
  } else {
    document.body.classList.remove('desktop-mode', 'has-detail');
    AppState._detailActive = (id === 'v-detail');
    if (id === 'v-detail') _initDetailSwipe();
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
  AppState.currentTab = name;
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

// Bottom-Nav: Proband
function bnavHome() {
  const id = getProbandId();
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
  const persons = Object.values(AppState.db.individuals).filter(p =>
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
      html += `<div class="person-row" data-action="showDetail" data-id="${p.id}">
        <div class="p-avatar ${sc}">${ic}</div>
        <div class="p-info"><div class="p-name">${esc(p.name||p.id)}</div><div class="p-meta">${esc(meta)||'&nbsp;'}</div></div>
        <span class="p-arrow">›</span></div>`;
    }
  }

  // ── Familien ──
  const families = Object.values(AppState.db.families).filter(f => {
    const h = AppState.db.individuals[f.husb];
    const w = AppState.db.individuals[f.wife];
    return (h?.name||'').toLowerCase().includes(lower) ||
           (w?.name||'').toLowerCase().includes(lower) ||
           (f.marr?.place||'').toLowerCase().includes(lower) ||
           (f.marr?.date||'').toLowerCase().includes(lower);
  }).slice(0, 12);
  if (families.length) {
    html += `<div class="alpha-sep">Familien (${families.length})</div>`;
    for (const f of families) {
      const h = AppState.db.individuals[f.husb];
      const w = AppState.db.individuals[f.wife];
      const label = [h?.name, w?.name].filter(Boolean).join(' ⚭ ') || f.id;
      let meta = '';
      if (f.marr?.date) meta += f.marr.date;
      if (f.marr?.place) meta += (meta ? ', ' : '') + f.marr.place;
      html += `<div class="person-row" data-action="showFamilyDetail" data-id="${f.id}">
        <div class="p-avatar" style="font-size:0.95rem">⚭</div>
        <div class="p-info"><div class="p-name">${esc(label)}</div><div class="p-meta">${esc(meta)||'&nbsp;'}</div></div>
        <span class="p-arrow">›</span></div>`;
    }
  }

  // ── Quellen ──
  const sources = Object.values(AppState.db.sources).filter(s =>
    (s.title||'').toLowerCase().includes(lower) ||
    (s.auth||'').toLowerCase().includes(lower) ||
    (s.publ||'').toLowerCase().includes(lower)
  ).slice(0, 10);
  if (sources.length) {
    html += `<div class="alpha-sep">Quellen (${sources.length})</div>`;
    for (const s of sources) {
      html += `<div class="person-row" data-action="showSourceDetail" data-sid="${s.id}">
        <div class="p-avatar" style="font-size:0.95rem">📖</div>
        <div class="p-info"><div class="p-name">${esc(s.title||s.id)}</div><div class="p-meta">${esc(s.auth||'')}</div></div>
        <span class="p-arrow">›</span></div>`;
    }
  }

  // ── Orte ──
  const places = Object.keys(AppState.db.extraPlaces || {}).filter(name =>
    name.toLowerCase().includes(lower)
  ).slice(0, 8);
  if (places.length) {
    html += `<div class="alpha-sep">Orte (${places.length})</div>`;
    for (const name of places) {
      html += `<div class="person-row" data-action="showPlaceDetail" data-name="${esc(name)}">
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

function _getListScroll() {
  return window.innerWidth >= 900
    ? (document.getElementById('v-main')?.scrollTop || 0)
    : window.scrollY;
}
function _setListScroll(pos) {
  if (window.innerWidth >= 900) {
    const el = document.getElementById('v-main');
    if (el) el.scrollTop = pos;
  } else {
    window.scrollTo(0, pos);
  }
}

// ─── Virtual Scroll ────────────────────────────────────────────────
const _VS_BUF  = 600;  // px pre-render buffer above/below viewport
const _VS_ROW  = 69;   // person/family row height (measured)
const _VS_SEP  = 23;   // alpha-sep height (measured)
const _VS_MIN  = 500;  // item threshold to activate

function _vsScrollEl() {
  return window.innerWidth >= 900 ? document.getElementById('v-main') : null;
}

function _vsRender(listEl, st) {
  if (!st.active || !listEl.offsetParent) return;
  const sc     = st.sc;
  const scTop  = sc ? sc.scrollTop : window.scrollY;
  const viewH  = sc ? sc.clientHeight : window.innerHeight;
  const lr     = listEl.getBoundingClientRect();
  const sr     = sc ? sc.getBoundingClientRect().top : 0;
  const lstAbs = scTop + lr.top - sr;   // absolute list-top in scroll coords
  const rel    = scTop - lstAbs;        // px of list scrolled above viewport top
  const vs     = rel - _VS_BUF;
  const ve     = rel + viewH + _VS_BUF;

  const { offsets, items } = st;
  let lo = 0, hi = items.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (offsets[mid] <= vs) lo = mid; else hi = mid - 1;
  }
  const first = lo;
  let last = first;
  while (last < items.length - 1 && offsets[last + 1] < ve) last++;

  if (st.r && st.r[0] === first && st.r[1] === last) return;

  let s = '';
  for (let i = first; i <= last; i++) s += items[i].s;
  st.top.style.height = offsets[first] + 'px';
  st.bot.style.height = Math.max(0, st.total - offsets[last] - items[last].px) + 'px';
  st.mid.innerHTML = s;
  st.r = [first, last];
}

function _vsSetup(listEl, st) {
  _vsTeardown(st);
  st.sc = _vsScrollEl();
  st.r  = null;
  st.active = true;
  listEl.innerHTML = '';
  st.top = document.createElement('div');
  st.mid = document.createElement('div');
  st.bot = document.createElement('div');
  listEl.append(st.top, st.mid, st.bot);
  _vsRender(listEl, st);
  st.fn = () => _vsRender(listEl, st);
  (st.sc || window).addEventListener('scroll', st.fn, { passive: true });
}

function _vsTeardown(st) {
  if (!st.active) return;
  if (st.fn) { (st.sc || window).removeEventListener('scroll', st.fn); st.fn = null; }
  st.active = false;
}

function showMain() {
  const saved = UIState._savedListScroll;
  UIState._savedListScroll = null;
  _navHistory.length = 0; // Liste = frischer Start, History löschen
  document.body.classList.remove('tree-active', 'fc-mode');
  setBnavActive(AppState.currentTab || 'persons');
  showView('v-main');
  updateStats();
  renderTab();
  if (saved && saved.tab === AppState.currentTab) {
    // setTimeout läuft nach rAF-Callbacks (z.B. _scrollListToCurrent)
    setTimeout(() => _setListScroll(saved.pos), 0);
  }
}

// ─── History-Navigation ───────────────────────────────────────────
// Muss am Anfang jeder showDetail/showFamilyDetail/showSourceDetail/
// showPlaceDetail stehen.
function _beforeDetailNavigate() {
  if (AppState._detailActive) {
    // Detail → Detail: aktuellen Zustand in History sichern
    if      (AppState.currentPersonId) _navHistory.push({ type: 'person', id: AppState.currentPersonId });
    else if (AppState.currentFamilyId) _navHistory.push({ type: 'family', id: AppState.currentFamilyId });
    else if (AppState.currentSourceId) _navHistory.push({ type: 'source', id: AppState.currentSourceId });
    else if (AppState.currentRepoId)   _navHistory.push({ type: 'repo',   id: AppState.currentRepoId });
    // Place: Name liegt nicht in einer ID-Variable – über detailTopTitle rekonstruieren
    else {
      const title = document.getElementById('detailTopTitle')?.textContent;
      if (title && title !== '📍 Ort') _navHistory.push({ type: 'place', name: title });
    }
  } else {
    _navHistory.length = 0;
    // Baum → Detail: bei fc-mode Fan Chart merken, sonst Sanduhr
    if (document.getElementById('v-tree').classList.contains('active') && currentTreeId) {
      const _type = document.body.classList.contains('fc-mode') ? 'fanchart' : 'tree';
      _navHistory.push({ type: _type, id: currentTreeId });
    } else {
      // Liste → Detail: Scroll-Position für Rückkehr sichern
      UIState._savedListScroll = { tab: AppState.currentTab, pos: _getListScroll() };
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
  else if (prev.type === 'tree')     showTree(prev.id, false);
  else if (prev.type === 'fanchart') { if (typeof showFanChart === 'function') showFanChart(prev.id); }
  else showMain();
}

// Kleinste numerische Personen-ID
function smallestPersonId() {
  const ids = Object.keys(AppState.db.individuals || {});
  if (!ids.length) return null;
  return ids.sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, '')) || 0;
    const nb = parseInt(b.replace(/\D/g, '')) || 0;
    return na - nb;
  })[0];
}

// Startansicht nach Datei-Load: Tree des Probanden (oder kleinste ID)
async function showStartView() {
  AppState.currentTab = 'persons';
  showMain();
  const saved = await idbGet('proband_id').catch(() => null);
  _probandId = (saved && AppState.db.individuals[saved]) ? saved : null;
  const startId = getProbandId();
  if (startId) showTree(startId);
}

// ─────────────────────────────────────
//  VIEW DISPATCH
// ─────────────────────────────────────
function switchTab(tab) {
  AppState.currentTab = tab;
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
  if (AppState.currentTab === 'persons') applyPersonFilter(); // respektiert aktive Such- und Jahresfilter
  else if (AppState.currentTab === 'families') renderFamilyList();
  else if (AppState.currentTab === 'sources') { renderSourceList(); renderRepoList(); }
  else if (AppState.currentTab === 'places') renderPlaceList();
  else if (AppState.currentTab === 'search') runGlobalSearch(document.getElementById('searchGlobal')?.value || '');
}

function updateStats() {
  // Stats-Leiste entfernt – Funktion bleibt als No-op erhalten
}

function updateChangedIndicator() {
  const show = AppState.changed;
  document.getElementById('changedIndicator').style.display = show ? 'inline-block' : 'none';
  const banner = document.getElementById('syncBanner');
  if (!banner) return;
  if (show) {
    const btn = document.getElementById('syncBannerBtn');
    const canOD = typeof _odIsConnected === 'function' && _odIsConnected() && localStorage.getItem('od_file_id');
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (canOD)       { btn.textContent = '☁ Speichern'; }
    else if (isIOS)  { btn.textContent = '↑ Teilen'; }
    else             { btn.textContent = '↓ Speichern'; }
    banner.style.display = 'flex';
  } else {
    banner.style.display = 'none';
  }
}

function _syncBannerSave() {
  const canOD = typeof _odIsConnected === 'function' && _odIsConnected() && localStorage.getItem('od_file_id');
  if (canOD) odSaveFile(); else exportGEDCOM();
}

function markChanged() { AppState.changed = true; UIState._placesCache = null; updateChangedIndicator(); }

// ─────────────────────────────────────
//  SHARED VIEW HELPERS
// ─────────────────────────────────────
function factRow(label, value, rawSuffix, srcIds) {
  const badges = srcIds ? sourceTagsHtml(srcIds) : '';
  return `<div class="fact-row"><span class="fact-lbl">${esc(label)}</span><span class="fact-val">${esc(value)}${rawSuffix||''}${badges}</span></div>`;
}

// Extrahiert die Quellennummer aus einer GEDCOM-ID (@S042@ → 42)
function srcNum(sid) {
  const m = sid.match(/\d+/);
  return m ? parseInt(m[0], 10) : sid;
}

// Kompakte Quellen-Badges: §42 — inline in fact-val einbettbar
function sourceTagsHtml(sourceIds) {
  if (!sourceIds) return '';
  const ids = sourceIds instanceof Set ? [...sourceIds] : (Array.isArray(sourceIds) ? sourceIds : []);
  if (!ids.length) return '';
  return ids.map(sid => {
    const s = AppState.db.sources[sid];
    if (!s) return '';
    const tooltip = esc((s.title || s.abbr || sid).substring(0, 60));
    return `<span class="src-badge" data-action="showSourceDetail" data-sid="${sid}" title="${tooltip}">§${srcNum(sid)}</span>`;
  }).filter(Boolean).join('');
}

function relRow(person, role, unlinkFamId) {
  const sc = person.sex === 'M' ? 'm' : person.sex === 'F' ? 'f' : '';
  const ic = person.sex === 'M' ? '♂' : person.sex === 'F' ? '♀' : '◇';
  const unlinkBtn = unlinkFamId
    ? `<button class="unlink-btn" data-action="unlinkMember" data-fid="${unlinkFamId}" data-pid="${person.id}"
         title="Verbindung trennen">×</button>`
    : '';
  return `<div class="rel-row" data-action="showDetail" data-pid="${person.id}">
    <div class="rel-avatar ${sc}">${ic}</div>
    <div class="rel-info">
      <div class="rel-name">${esc(person.name || person.id)}</div>
      <div class="rel-role">${esc(role)}</div>
    </div>
    ${unlinkBtn}
    <span class="p-arrow">›</span>
  </div>`;
}

// ─────────────────────────────────────
//  EVENT DELEGATION
//  Ersetzt alle inline onclick/oninput/onchange in HTML-Strings.
//  data-action  → click
//  data-change  → change
//  data-input   → input
//  data-action="stop" → stopPropagation ohne Aktion (z.B. <select> in klickbarer Zeile)
// ─────────────────────────────────────
const _CLICK_MAP = {
  showDetail:           el => showDetail(el.dataset.pid  || el.dataset.id),
  showFamilyDetail:     el => showFamilyDetail(el.dataset.fid  || el.dataset.id),
  showSourceDetail:     el => showSourceDetail(el.dataset.sid  || el.dataset.id),
  showRepoDetail:       el => showRepoDetail(el.dataset.id),
  showPlaceDetail:      el => showPlaceDetail(el.dataset.name),
  deleteExtraPlace:     el => deleteExtraPlace(el.dataset.pname || el.dataset.name),
  unlinkMember:         el => unlinkMember(el.dataset.fid, el.dataset.pid),
  showEventForm:        el => showEventForm(el.dataset.pid, el.dataset.ev),
  showFamEventForm:     el => showFamEventForm(el.dataset.fid, el.dataset.evkey),
  showAddSpouseFlow:    el => showAddSpouseFlow(el.dataset.pid),
  showAddChildFlow:     el => showAddChildFlow(el.dataset.fid),
  showAddParentFlow:    el => showAddParentFlow(el.dataset.pid),
  openAddMediaDialog:   el => openAddMediaDialog(el.dataset.ctx, el.dataset.id),
  openMediaPhoto:       el => openMediaPhoto(el.dataset.mediaFile, el.dataset.hero, el.dataset.avatar),
  openEditMediaDialog:  el => openEditMediaDialog(el.dataset.ctx, el.dataset.id, +el.dataset.idx),
  openSourceMediaView:  el => openSourceMediaView(el.dataset.sid, +el.dataset.idx),
  showChildRelDialog:   el => showChildRelDialog(el.dataset.fid, el.dataset.cid),
  removeSrc:            el => removeSrc(el.dataset.prefix, el.dataset.sid),
  toggleSrc:            el => toggleSrc(el.dataset.prefix, el.dataset.sid),
  odLoadFile:           el => odLoadFile(el.dataset.odid, el.dataset.odname),
  odFolderBack:         ()  => _odFolderBack(),
  odPickCancel:         ()  => _odPickCancel(),
  odShowAllFolders:     ()  => _odShowAllFolders(),
  odScanDocFolder:      el => odScanDocFolder(el.dataset.odid, el.dataset.odname),
  odImportPhotos:       el => odImportPhotosFromFolder(el.dataset.odid, el.dataset.odname),
  odEnterFolder:        el => _odEnterFolder(el),
  odPickSelectFile:     el => _odPickSelectFile(el.dataset.odid, el.dataset.odname, el.dataset.path),
  browserShowSource:    el => { closeModal('modalMediaBrowser'); showSourceDetail(el.dataset.sid); },
  browserShowPerson:    el => { closeModal('modalMediaBrowser'); showDetail(el.dataset.pid); },
  browserShowFamily:    el => { closeModal('modalMediaBrowser'); showFamilyDetail(el.dataset.fid); },
  showLightbox:         el => showLightbox(el.src || el.dataset.src),
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  if (action === 'stop') { e.stopPropagation(); return; }
  const fn = _CLICK_MAP[action];
  if (fn) fn(el, e);
});

document.addEventListener('change', e => {
  const el = e.target.closest('[data-change]');
  if (!el) return;
  const action = el.dataset.change;
  if (action === 'savePedi')      savePedi(el.dataset.fid, el.dataset.cid, el.value);
  else if (action === 'updateSrcQuay') updateSrcQuay(el.dataset.prefix, el.dataset.sid, el.value);
});

document.addEventListener('input', e => {
  const el = e.target.closest('[data-input]');
  if (!el) return;
  if (el.dataset.input === 'updateSrcPage') updateSrcPage(el.dataset.prefix, el.dataset.sid, el.value);
});

// ─────────────────────────────────────
//  OBJE-REFERENZ-HELPER
//  Baut Map @Oxx@ → {file, title} aus AppState.db.extraRecords
// ─────────────────────────────────────
function _buildObjeRefMap() {
  const map = {};
  for (const rec of (AppState.db.extraRecords || [])) {
    if (!rec._lines || !rec._lines.length) continue;
    const hm = rec._lines[0].match(/^0 (@[^@]+@) OBJE$/);
    if (!hm) continue;
    const objId = hm[1];
    let file = '', title = '';
    for (let i = 1; i < rec._lines.length; i++) {
      const lm = rec._lines[i].match(/^1 (FILE|TITL) (.+)$/);
      if (lm) { if (lm[1] === 'FILE') file = lm[2]; else title = lm[2]; }
    }
    map[objId] = { file, title };
  }
  return map;
}
