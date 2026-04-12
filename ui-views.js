// ─────────────────────────────────────
//  PROBAND
// ─────────────────────────────────────
// _probandId lebt in UIState._probandId (shimmiert als _probandId)

function getProbandId() {
  return (_probandId && AppState.db.individuals[_probandId]) ? _probandId : smallestPersonId();
}

function _toggleProband(id) {
  const p = AppState.db.individuals[id];
  if (!p) return;
  if (getProbandId() === id) {
    _probandId = null;
    idbPut('proband_id', null).catch(() => {});
    showToast('Proband zurückgesetzt (kleinste ID)');
  } else {
    _probandId = id;
    idbPut('proband_id', id).catch(() => {});
    showToast('Proband: ' + (p.name || id));
  }
  showDetail(id, false);
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

// Sammelt PAGE/QUAY-Angaben einer Person oder Familie für eine bestimmte Quelle
function _collectSourceMeta(entity, sid) {
  const pairs = new Map(); // pageVal → quayVal (first found per page wins)
  function check(obj) {
    if (!obj || !(obj.sources || []).includes(sid)) return;
    const page = (obj.sourcePages || {})[sid] || '';
    const quay = (obj.sourceQUAY  || {})[sid];
    const key = page || '\x00'; // leerstring als eigenständiger Key
    if (!pairs.has(key)) pairs.set(key, quay);
  }
  if (entity.birth !== undefined) {
    // topSources (INDI-Level)
    if ((entity.topSources || []).includes(sid)) {
      const page = (entity.topSourcePages || {})[sid] || '';
      const quay = (entity.topSourceQUAY  || {})[sid];
      const key = page || '\x00';
      if (!pairs.has(key)) pairs.set(key, quay);
    }
    check(entity.birth); check(entity.death); check(entity.chr); check(entity.buri);
    for (const ev of (entity.events || [])) check(ev);
    for (const en of (entity.extraNames || [])) check(en);
  }
  if (entity.marr !== undefined) {
    check(entity.marr); check(entity.engag); check(entity.div); check(entity.divf);
  }
  if (!pairs.size) return '';
  return [...pairs.entries()].map(([page, quay]) => {
    const parts = [];
    if (page && page !== '\x00') parts.push('S.' + page);
    if (quay !== undefined && quay !== '') parts.push('Q' + quay);
    return parts.join('\u202f') || '–';
  }).join(', ');
}

// Wandelt http(s)-URLs in anklickbare Links um; escapet den Rest
function linkifyUrls(text) {
  if (!text) return '';
  return text.split(/(https?:\/\/[^\s<>"]+)/g).map((part, i) =>
    i % 2 === 1
      ? `<a href="${esc(part)}" target="_blank" rel="noopener" style="color:var(--gold);text-decoration:underline;word-break:break-all">${esc(part)}</a>`
      : esc(part)
  ).join('');
}

// Bottom-Nav: Baum-Tab
function bnavTree() {
  setBnavActive('tree');
  const id = currentTreeId || smallestPersonId();
  if (id) showTree(id);
  else { showView('v-main'); setBnavActive('persons'); }
}

function switchPlacesSubTab(sub) {
  UIState._placesSubTab = sub;
  document.getElementById('placeList').style.display           = sub === 'orte'  ? '' : 'none';
  document.getElementById('hofList').style.display             = sub === 'hoefe' ? '' : 'none';
  document.getElementById('place-search-orte').style.display  = sub === 'orte'  ? '' : 'none';
  document.getElementById('place-search-hoefe').style.display = sub === 'hoefe' ? '' : 'none';
  const orteBtn  = document.getElementById('toggle-orte');
  const hoefeBtn = document.getElementById('toggle-hoefe');
  if (sub === 'orte')  { orteBtn.classList.add('active');  hoefeBtn.classList.remove('active'); }
  else                 { hoefeBtn.classList.add('active'); orteBtn.classList.remove('active'); }
  if (sub === 'hoefe') renderHofList();
  else renderPlaceList();
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
  const persons = Object.values(AppState.db.individuals).filter(p => {
    if ((p.name||'').toLowerCase().includes(lower)) return true;
    if ((p.given||'').toLowerCase().includes(lower)) return true;
    if ((p.surname||'').toLowerCase().includes(lower)) return true;
    if ((p.birth?.place||'').toLowerCase().includes(lower)) return true;
    if ((p.death?.place||'').toLowerCase().includes(lower)) return true;
    if ((p.birth?.date||'').toLowerCase().includes(lower)) return true;
    if ((p.death?.date||'').toLowerCase().includes(lower)) return true;
    if ((p.chr?.place||'').toLowerCase().includes(lower)) return true;
    if ((p.buri?.place||'').toLowerCase().includes(lower)) return true;
    if ((p.noteText||'').toLowerCase().includes(lower)) return true;
    for (const ev of (p.events || [])) {
      if ((ev.value||'').toLowerCase().includes(lower)) return true;
      if ((ev.place||'').toLowerCase().includes(lower)) return true;
      if ((ev.date||'').toLowerCase().includes(lower)) return true;
      if ((ev.eventType||'').toLowerCase().includes(lower)) return true;
    }
    return false;
  }).slice(0, 20);
  if (persons.length) {
    html += `<div class="alpha-sep">Personen (${persons.length})</div>`;
    for (const p of persons) {
      const sc = p.sex === 'M' ? 'm' : p.sex === 'F' ? 'f' : '';
      const ic = p.sex === 'M' ? '♂' : p.sex === 'F' ? '♀' : '◇';
      let meta = '';
      if (p.birth?.date) meta += '* ' + p.birth.date;
      if (p.birth?.place) meta += (meta ? ', ' : '') + compactPlace(p.birth.place);
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
    if ((h?.name||'').toLowerCase().includes(lower)) return true;
    if ((w?.name||'').toLowerCase().includes(lower)) return true;
    if ((f.marr?.place||'').toLowerCase().includes(lower)) return true;
    if ((f.marr?.date||'').toLowerCase().includes(lower)) return true;
    if ((f.div?.place||'').toLowerCase().includes(lower)) return true;
    if ((f.div?.date||'').toLowerCase().includes(lower)) return true;
    if ((f.engag?.place||'').toLowerCase().includes(lower)) return true;
    if ((f.engag?.date||'').toLowerCase().includes(lower)) return true;
    if ((f.noteText||'').toLowerCase().includes(lower)) return true;
    for (const ev of (f.events || [])) {
      if ((ev.value||'').toLowerCase().includes(lower)) return true;
      if ((ev.place||'').toLowerCase().includes(lower)) return true;
      if ((ev.date||'').toLowerCase().includes(lower)) return true;
      if ((ev.eventType||'').toLowerCase().includes(lower)) return true;
    }
    return false;
  }).slice(0, 12);
  if (families.length) {
    html += `<div class="alpha-sep">Familien (${families.length})</div>`;
    for (const f of families) {
      const h = AppState.db.individuals[f.husb];
      const w = AppState.db.individuals[f.wife];
      const label = [h?.name, w?.name].filter(Boolean).join(' ⚭ ') || f.id;
      let meta = '';
      if (f.marr?.date) meta += f.marr.date;
      if (f.marr?.place) meta += (meta ? ', ' : '') + compactPlace(f.marr.place);
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
  else if (AppState.currentTab === 'places') {
    if (UIState._placesSubTab === 'hoefe') renderHofList();
    else renderPlaceList();
  }
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

function markChanged() { AppState.changed = true; UIState._placesCache = null; UIState._hofCache = null; UIState._searchIndexDirty = true; updateChangedIndicator(); }

// ─────────────────────────────────────
//  SHARED VIEW HELPERS
// ─────────────────────────────────────
function factRow(label, value, rawSuffix, srcIds, pageMap, quayMap) {
  const badges = srcIds ? sourceTagsHtml(srcIds, pageMap, quayMap) : '';
  return `<div class="fact-row"><span class="fact-lbl">${esc(label)}</span><span class="fact-val">${esc(value)}${rawSuffix||''}${badges}</span></div>`;
}

// Extrahiert die Quellennummer aus einer GEDCOM-ID (@S042@ → 42)
function srcNum(sid) {
  const m = sid.match(/\d+/);
  return m ? parseInt(m[0], 10) : sid;
}

// Kompakte Quellen-Badges: §42 (optional farbig nach QUAY + Seitenangabe)
// pageMap: {sid: page}, quayMap: {sid: quay}
const _QUAY_LABELS = { '0':'unbelegt', '1':'fragwürdig', '2':'plausibel', '3':'direkt' };
function sourceTagsHtml(sourceIds, pageMap, quayMap) {
  if (!sourceIds) return '';
  const ids = sourceIds instanceof Set ? [...sourceIds] : (Array.isArray(sourceIds) ? sourceIds : []);
  if (!ids.length) return '';
  const pages = pageMap || {};
  const quays = quayMap || {};
  return ids.map(sid => {
    const s = AppState.db.sources[sid];
    if (!s) return '';
    const page  = pages[sid] != null ? String(pages[sid]) : '';
    const quay  = quays[sid] != null ? String(quays[sid]) : '';
    const qClass = quay !== '' ? ` src-badge--q${quay}` : '';
    const pageSuffix = page && page.length <= 5 ? `·${page}` : '';
    const tipParts = [
      (s.title || s.abbr || sid).substring(0, 50),
      page ? `S.\u202f${page}` : '',
      quay !== '' ? `Q${quay}\u202f–\u202f${_QUAY_LABELS[quay] || quay}` : ''
    ].filter(Boolean);
    return `<span class="src-badge${qClass}" data-action="showSourceDetail" data-sid="${sid}" title="${esc(tipParts.join(' · '))}">§${srcNum(sid)}${pageSuffix}</span>`;
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
  // Dynamisch generierte Einträge (bereits vorhanden)
  showDetail:              el => showDetail(el.dataset.pid  || el.dataset.id),
  showFamilyDetail:        el => showFamilyDetail(el.dataset.fid  || el.dataset.id),
  showSourceDetail:        el => showSourceDetail(el.dataset.sid  || el.dataset.id),
  showRepoDetail:          el => showRepoDetail(el.dataset.id),
  showPlaceDetail:         el => showPlaceDetail(el.dataset.name),
  showHofDetail:           el => showHofDetail(el.dataset.addr),
  showHofAddForm:          el  => showHofAddForm(el.dataset.addr),
  saveHofBewohner:         el => saveHofBewohner(el.dataset.addr),
  cancelHofBewohner:       ()  => cancelHofBewohner(),
  switchPlacesSubTab:      el => switchPlacesSubTab(el.dataset.subtab),
  deleteExtraPlace:        el => deleteExtraPlace(el.dataset.pname || el.dataset.name),
  unlinkMember:            el => unlinkMember(el.dataset.fid, el.dataset.pid),
  showPersonForm:          el => showPersonForm(el.dataset.pid),
  showExtraNameForm:       el => showExtraNameForm(el.dataset.pid, parseInt(el.dataset.enidx ?? '-1', 10)),
  saveExtraName:           ()  => saveExtraName(),
  deleteExtraName:         ()  => deleteExtraName(),
  showEventForm:           el => showEventForm(el.dataset.pid, el.dataset.ev),
  showFamEventForm:        el => showFamEventForm(el.dataset.fid, el.dataset.evkey, el.dataset.evidx),
  showAddSpouseFlow:       el => showAddSpouseFlow(el.dataset.pid),
  showAddChildFlow:        el => showAddChildFlow(el.dataset.fid),
  showAddParentFlow:       el => showAddParentFlow(el.dataset.pid),
  openAddMediaDialog:      el => openAddMediaDialog(el.dataset.ctx, el.dataset.id),
  openMediaPhoto:          el => openMediaPhoto(el.dataset.mediaFile, el.dataset.hero, el.dataset.avatar),
  openEditMediaDialog:     el => openEditMediaDialog(el.dataset.ctx, el.dataset.id, +el.dataset.idx),
  openSourceMediaView:     el => openSourceMediaView(el.dataset.sid, +el.dataset.idx),
  showChildRelDialog:      el => showChildRelDialog(el.dataset.fid, el.dataset.cid),
  removeSrc:               el => removeSrc(el.dataset.prefix, el.dataset.sid),
  toggleSrc:               el => toggleSrc(el.dataset.prefix, el.dataset.sid),
  odLoadFile:              el => odLoadFile(el.dataset.odid, el.dataset.odname),
  odFolderBack:            ()  => _odFolderBack(),
  odPickCancel:            ()  => _odPickCancel(),
  odShowAllFolders:        ()  => _odShowAllFolders(),
  odScanDocFolder:         el => odScanDocFolder(el.dataset.odid, el.dataset.odname),
  odImportPhotos:          el => odImportPhotosFromFolder(el.dataset.odid, el.dataset.odname),
  odEnterFolder:           el => _odEnterFolder(el),
  odPickSelectFile:        el => _odPickSelectFile(el.dataset.odid, el.dataset.odname, el.dataset.path),
  browserShowSource:       el => { closeModal('modalMediaBrowser'); showSourceDetail(el.dataset.sid); },
  browserShowPerson:       el => { closeModal('modalMediaBrowser'); showDetail(el.dataset.pid); },
  browserShowFamily:       el => { closeModal('modalMediaBrowser'); showFamilyDetail(el.dataset.fid); },
  showLightbox:            el => showLightbox(el.src || el.dataset.src),
  // Statische index.html-Handler (P1-Migration)
  loadDemo:                ()  => loadDemo(),
  openModal:               el => openModal(el.dataset.modal),
  closeModal:              el => closeModal(el.dataset.modal),
  bnavSearch:              ()  => bnavSearch(),
  openMenuModal:           ()  => { openModal('modalMenu'); _odUpdateUI(); },
  clearYearFilter:         ()  => clearYearFilter(),
  togglePersonSort:        ()  => togglePersonSort(),
  showPersonMediaBrowser:  ()  => showPersonMediaBrowser(),
  showFamilyMediaBrowser:  ()  => showFamilyMediaBrowser(),
  scrollToRepo:            ()  => document.getElementById('repoSection').scrollIntoView({behavior:'smooth'}),
  showMediaBrowser:        ()  => showMediaBrowser(),
  showAddSheet:            ()  => showAddSheet(),
  goBack:                  ()  => goBack(),
  showEditSheet:           ()  => showEditSheet(),
  treeNavBack:             ()  => treeNavBack(),
  setTreeGens:             el => setTreeGens(+el.dataset.tgen),
  setFcGens:               el => setFcGens(+el.dataset.gen),
  toggleFanChart:          ()  => toggleFanChart(),
  toggleTreeFullscreen:    ()  => toggleTreeFullscreen(),
  showTree:                el  => showTree(el.dataset.id),
  toggleProband:           el  => _toggleProband(el.dataset.id),
  bnavTree:                ()  => bnavTree(),
  bnavTab:                 el => bnavTab(el.dataset.tab),
  bnavHome:                ()  => bnavHome(),
  addPerson:               ()  => { closeModal('modalAdd'); showPersonForm(null); },
  addFamily:               ()  => { closeModal('modalAdd'); showFamilyForm(null); },
  addSource:               ()  => { closeModal('modalAdd'); showSourceForm(null); },
  addPlace:                ()  => { closeModal('modalAdd'); showNewPlaceForm(); },
  addPfExtraName:          ()  => addPfExtraName(),
  toggleSrcPicker:         el => toggleSrcPicker(el.dataset.prefix),
  savePerson:              ()  => savePerson(),
  deletePerson:            ()  => deletePerson(),
  togglePlaceMode:         el => togglePlaceMode(el.dataset.placeid),
  addMediaEntry:           el => _addMediaEntry(el.dataset.prefix),
  saveFamily:              ()  => saveFamily(),
  deleteFamily:            ()  => deleteFamily(),
  saveFamEvent:            ()  => saveFamEvent(),
  deleteFamEvent:          ()  => deleteFamEvent(),
  applySourceTemplate:     el => _applySourceTemplate(el.dataset.tpl),
  sfRepoClear:             ()  => sfRepoClear(),
  openRepoPicker:          ()  => openRepoPicker(),
  sfToggleMore:            ()  => sfToggleMore(),
  saveSource:              ()  => saveSource(),
  deleteSource:            ()  => deleteSource(),
  addEfMedia:              ()  => addEfMedia(),
  saveEvent:               ()  => saveEvent(),
  deleteEvent:             ()  => deleteEvent(),
  savePlace:               ()  => savePlace(),
  saveNewPlace:            ()  => saveNewPlace(),
  relPickerCreateNew:      ()  => relPickerCreateNew(),
  saveRepo:                ()  => saveRepo(),
  deleteRepo:              ()  => deleteRepo(),
  repoPickerCreateNew:     ()  => repoPickerCreateNew(),
  menuOdToggle:            ()  => { closeModal('modalMenu'); odToggle(); },
  menuOdOpen:              ()  => { closeModal('modalMenu'); odOpenFilePicker(); },
  odSaveFile:              ()  => odSaveFile(),
  menuSettings:            ()  => { closeModal('modalMenu'); openSettings(); },
  menuOpenFile:            ()  => { closeModal('modalMenu'); openFileOrDir(); },
  menuExport:              ()  => { closeModal('modalMenu'); exportGEDCOM(); },
  menuGrampsExport:        ()  => { closeModal('modalMenu'); exportGRAMPS(); },
  menuBackup:              ()  => { closeModal('modalMenu'); downloadBackup(); },
  menuRevert:              ()  => { closeModal('modalMenu'); revertToSaved(); },
  menuLoadDemo:            ()  => { closeModal('modalMenu'); loadDemo(); },
  menuNewFile:             ()  => { closeModal('modalMenu'); confirmNewFile(); },
  menuHelp:                ()  => { closeModal('modalMenu'); openModal('modalHelp'); },
  menuRoundtrip:           ()  => { closeModal('modalMenu'); runRoundtripTest(); },
  settingsChangePhoto:     ()  => { closeModal('modalSettings'); odImportPhotos(); },
  odClearPhotoFolder:      ()  => odClearPhotoFolder(),
  settingsChangeDoc:       ()  => { closeModal('modalSettings'); odSetupDocFolder(); },
  odClearDocFolder:        ()  => odClearDocFolder(),
  odCancelOrClose:         ()  => _odCancelOrClose(),
  camCapture:              ()  => document.getElementById('am-cam-input').click(),
  camGallery:              ()  => {
    const inp = document.getElementById('am-cam-input');
    inp.removeAttribute('capture');
    inp.click();
    setTimeout(() => inp.setAttribute('capture', 'environment'), 500);
  },
  odPickFileForMedia:      ()  => odPickFileForMedia(),
  confirmAddMedia:         ()  => confirmAddMedia(),
  odPickFileForEditMedia:  ()  => odPickFileForEditMedia(),
  confirmDeleteMedia:      ()  => confirmDeleteMedia(),
  confirmEditMedia:        ()  => confirmEditMedia(),
  helpRoundtrip:           ()  => { closeModal('modalHelp'); runRoundtripTest(); },
  openNoteModal:           el  => openNoteModal(el.dataset.ntype, el.dataset.nid),
  saveNoteModal:           ()  => saveNoteModal(),
  saveChildRelDialog:      ()  => saveChildRelDialog(),
  syncBannerSave:          ()  => _syncBannerSave(),
  startupChoiceOneDrive:   ()  => _startupChoiceOneDrive(),
  startupChoiceLocal:      ()  => _startupChoiceLocal(),
  closeLightbox:           ()  => { document.getElementById('modalLightbox').style.display = 'none'; },
  lightboxSetHero:         (el, e) => { e.stopPropagation(); _lightboxSetHero(); },
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
  if      (action === 'savePedi')          savePedi(el.dataset.fid, el.dataset.cid, el.value);
  else if (action === 'updateSrcQuay')     updateSrcQuay(el.dataset.prefix, el.dataset.sid, el.value);
  else if (action === 'onEventTypeChange')    onEventTypeChange();
  else if (action === 'onFamEventTypeChange') onFamEventTypeChange();
  else if (action === 'onDateQualChange')  onDateQualChange(el, el.dataset.target);
  else if (action === 'amCamChange') {
    (async () => {
      const f = el.files[0];
      if (!f) return;
      try { const b64 = await resizeImageToBase64(f); _onCamCapture(b64); }
      catch(err) { showToast('Fehler: ' + err.message); }
      el.value = '';
    })();
  }
  else if (action === 'photoImportChange') {
    _handlePhotoImport(el.files[0]).finally(() => { el.value = ''; });
  }
});

document.addEventListener('input', e => {
  const el = e.target.closest('[data-input]');
  if (!el) return;
  const action = el.dataset.input;
  if      (action === 'updateSrcPage')   updateSrcPage(el.dataset.prefix, el.dataset.sid, el.value);
  else if (action === 'applyPersonFilter') applyPersonFilter();
  else if (action === 'filterFamilies')  filterFamiliesDebounced(el.value);
  else if (action === 'filterSources')   filterSourcesDebounced(el.value);
  else if (action === 'filterPlaces')    filterPlacesDebounced(el.value);
  else if (action === 'filterHoefe')     filterHoefeDebounced(el.value);
  else if (action === 'runGlobalSearch') runGlobalSearch(el.value);
  else if (action === 'renderRelPicker') renderRelPicker(el.value);
  else if (action === 'renderRepoPicker') renderRepoPicker(el.value);
  else if (action === 'odSetBasePath')   odSetBasePath(el.value.trim());
});

document.addEventListener('blur', e => {
  const el = e.target.closest('[data-blur]');
  if (!el) return;
  if (el.dataset.blur === 'normMonth') {
    const v = normMonth(el.value);
    if (v && el.value) el.value = v;
  }
}, true);

// ─────────────────────────────────────
//  NOTIZ-MODAL
// ─────────────────────────────────────
function _noteRefShareCount(ref) {
  let n = 0;
  for (const p of Object.values(AppState.db.individuals)) if ((p.noteRefs||[]).includes(ref)) n++;
  for (const f of Object.values(AppState.db.families))    if ((f.noteRefs||[]).includes(ref)) n++;
  return n;
}

function openNoteModal(type, id) {
  let inlineText = '';
  let noteRefs   = [];
  if (type === 'person') {
    const p = AppState.db.individuals[id];
    inlineText = p?.noteTexts?.join('\n') ?? '';
    noteRefs   = p?.noteRefs || [];
  } else if (type === 'family') {
    const f = AppState.db.families[id];
    inlineText = f?.noteTexts?.join('\n') ?? '';
    noteRefs   = f?.noteRefs || [];
  } else if (type === 'source') {
    inlineText = AppState.db.sources[id]?.text ?? '';
  }
  document.getElementById('note-type').value = type;
  document.getElementById('note-id').value   = id;

  let html = `<div class="form-group">
    <div class="form-label">Eigene Notiz</div>
    <textarea data-notetype="inline" class="form-input" rows="5"
      style="resize:vertical;box-sizing:border-box;width:100%;font-family:inherit"
      placeholder="Notiz eingeben…">${esc(inlineText)}</textarea>
  </div>`;

  for (const ref of noteRefs) {
    const noteObj = AppState.db.notes?.[ref];
    const shared  = _noteRefShareCount(ref);
    const sharedHint = shared > 1
      ? `<span style="color:var(--text-muted);font-size:0.75rem;margin-left:6px">· ${shared} Einträge teilen diese Notiz</span>` : '';
    html += `<div class="form-group" style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border-color)">
      <div class="form-label">${esc(ref)}${sharedHint}</div>
      <textarea data-notetype="ref" data-noteref="${esc(ref)}" class="form-input" rows="5"
        style="resize:vertical;box-sizing:border-box;width:100%;font-family:inherit"
        placeholder="Notiz eingeben…">${esc(noteObj?.text ?? '')}</textarea>
    </div>`;
  }

  document.getElementById('note-sections').innerHTML = html;
  openModal('modalNote');
  setTimeout(() => document.querySelector('#note-sections textarea')?.focus(), 80);
}

function saveNoteModal() {
  const type = document.getElementById('note-type').value;
  const id   = document.getElementById('note-id').value;

  // Inline-Notiz lesen
  const inlineTa = document.querySelector('#note-sections [data-notetype="inline"]');
  const inlineVal = inlineTa ? inlineTa.value.trim() : '';

  // noteRef-Notizen lesen + in db.notes schreiben
  document.querySelectorAll('#note-sections [data-notetype="ref"]').forEach(ta => {
    const ref = ta.dataset.noteref;
    if (AppState.db.notes?.[ref]) AppState.db.notes[ref].text = ta.value.trim();
  });

  if (type === 'person') {
    const p = AppState.db.individuals[id];
    if (!p) return;
    p.noteTexts = inlineVal ? [inlineVal] : [];
    p.noteText  = inlineVal;
    for (const ref of (p.noteRefs || []))
      if (AppState.db.notes?.[ref]) p.noteText += (p.noteText ? '\n' : '') + AppState.db.notes[ref].text;
    markChanged(); closeModal('modalNote'); showDetail(id);
  } else if (type === 'family') {
    const f = AppState.db.families[id];
    if (!f) return;
    f.noteTexts = inlineVal ? [inlineVal] : [];
    f.noteText  = inlineVal;
    for (const ref of (f.noteRefs || []))
      if (AppState.db.notes?.[ref]) f.noteText += (f.noteText ? '\n' : '') + AppState.db.notes[ref].text;
    markChanged(); closeModal('modalNote'); showFamilyDetail(id);
  } else if (type === 'source') {
    const s = AppState.db.sources[id];
    if (!s) return;
    s.text = inlineVal;
    markChanged(); closeModal('modalNote'); showSourceDetail(id);
  }
}

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
