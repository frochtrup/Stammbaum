// ─────────────────────────────────────
//  PROBAND
// ─────────────────────────────────────
// UIState._probandId — Proband-ID (kein Shim mehr)

function getProbandId() {
  return (UIState._probandId && AppState.db.individuals[UIState._probandId]) ? UIState._probandId : smallestPersonId();
}

function _toggleProband(id) {
  const p = AppState.db.individuals[id];
  if (!p) return;
  if (getProbandId() === id) {
    UIState._probandId = null;
    idbPut('proband_id', null).catch(() => {});
    showToast('Proband zurückgesetzt (kleinste ID)');
  } else {
    UIState._probandId = id;
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
  // Karte ausblenden wenn nicht im Orte-Tab
  if (id !== 'v-main' || AppState.currentTab !== 'places') {
    document.body.classList.remove('places-karte');
    document.getElementById('mapContainer')?.style.setProperty('display', 'none');
  }

  if (desktop) {
    document.getElementById('v-main').classList.add('active');
    document.getElementById('bottomNav').style.display = 'flex';
    document.getElementById('fabBtn').style.display = '';
    AppState._detailActive = (id === 'v-detail');
    document.body.classList.add('desktop-mode');
    document.body.classList.toggle('has-detail', id === 'v-detail');
    if (id === 'v-detail') { const _det = document.getElementById('v-detail'); _det.scrollTop = 0; _normalizeWheel(_det); _initDetailSwipe(); requestAnimationFrame(_updateDetailHistBtn); }
  } else {
    document.body.classList.remove('desktop-mode', 'has-detail');
    AppState._detailActive = (id === 'v-detail');
    if (id === 'v-detail') _initDetailSwipe();
    const showNav = (id === 'v-main' || id === 'v-tree');
    document.getElementById('bottomNav').style.display = showNav ? 'flex' : 'none';
    document.getElementById('fabBtn').style.display = (id === 'v-main') ? '' : 'none';
    if (id === 'v-timeline') { const _tb = document.getElementById('tlBody'); if (_tb) _tb.scrollTop = 0; }
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
    if (!obj) return;
    for (const c of (obj.citations || [])) {
      if (c.sid !== sid) continue;
      const key = c.page || '\x00';
      if (!pairs.has(key)) pairs.set(key, c.quay);
    }
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
      ? `<a href="${esc(part)}" target="_blank" rel="noopener" class="linkify-url">${esc(part)}</a>`
      : esc(part)
  ).join('');
}

// Setzt data-il-style-Attribute via CSSOM (CSP-sicher) und entfernt das Attribut danach.
function _applyDynStyles(root) {
  root.querySelectorAll('[data-il-style]').forEach(el => {
    const s = el.getAttribute('data-il-style');
    el.removeAttribute('data-il-style');
    s.split(';').forEach(d => {
      const i = d.indexOf(':');
      if (i < 0) return;
      el.style.setProperty(d.slice(0, i).trim(), d.slice(i + 1).trim());
    });
  });
}

// Bottom-Nav: Baum-Tab
function bnavTree() {
  setBnavActive('tree');
  const id = currentTreeId || smallestPersonId();
  if (!id) { showView('v-main'); setBnavActive('persons'); return; }
  if (document.body.classList.contains('desc-tree-mode') && typeof showDescTree === 'function')
    showDescTree(id, false);
  else
    showTree(id);
}

function switchPlacesSubTab(sub) {
  UIState._placesSubTab = sub;
  const isDesktop = document.body.classList.contains('desktop-mode');
  // Desktop: Orte-Liste bleibt im linken Panel als Navigation auch wenn Karte aktiv
  const showOrteList   = sub === 'orte' || (sub === 'karte' && isDesktop);
  document.getElementById('placeList')?.style.setProperty('display',          showOrteList ? '' : 'none');
  document.getElementById('place-search-orte')?.style.setProperty('display',  showOrteList ? '' : 'none');
  const _hofList = document.getElementById('hofList'); if (_hofList) _hofList.hidden = sub !== 'hoefe';
  const _hofSearch = document.getElementById('place-search-hoefe'); if (_hofSearch) _hofSearch.hidden = sub !== 'hoefe';
  document.getElementById('mapContainer')?.style.setProperty('display',       sub === 'karte' ? 'block' : 'none');
  document.body.classList.toggle('places-karte', sub === 'karte');
  ['toggle-orte', 'toggle-hoefe', 'toggle-karte'].forEach(id => {
    document.getElementById(id)?.classList.toggle('active', id === 'toggle-' + sub);
  });
  if (sub === 'hoefe') {
    document.getElementById('detailContent').innerHTML = '';
    document.body.classList.remove('has-detail');
    renderHofList();
  } else if (sub === 'orte') {
    document.getElementById('detailContent').innerHTML = '';
    document.body.classList.remove('has-detail');
    renderPlaceList();
  } else if (sub === 'karte') {
    document.getElementById('detailContent').innerHTML = '';
    document.body.classList.remove('has-detail');
    if (isDesktop) renderPlaceList(); // linkes Panel: Orte-Navigation
    if (typeof initOrRefreshPlaceMap === 'function') initOrRefreshPlaceMap();
  }
}

// Bottom-Nav: Listen-Tabs
function bnavTab(name) {
  // Manueller Tab-Wechsel zur Karte löscht den Zurück-Button-Kontext
  if (!UIState._mapFromContext) {
    const cb = document.getElementById('map-close-btn');
    if (cb) cb.style.display = 'none';
  }
  UIState._mapFromContext = null;
  // Mobile: Orte-Tab erneut tippen während Karte aktiv → zurück zur Orte-Liste
  if (name === 'places' && AppState.currentTab === 'places' && UIState._placesSubTab === 'karte'
      && !document.body.classList.contains('desktop-mode')) {
    switchPlacesSubTab('orte');
    return;
  }
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

// Bottom-Nav: Proband (nur noch aus Menü erreichbar)
function bnavHome() {
  const id = getProbandId();
  if (id) { setBnavActive('tree'); showTree(id); }
}

// Bottom-Nav: Aufgaben-Tab
function bnavTasks() {
  AppState.currentTab = 'tasks';
  setBnavActive('tasks');
  showView('v-main');
  switchTab('tasks');
}

// runGlobalSearch → ui-views-search.js

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

// ─── ARIA-Announcement für Listenergebnisse ────────────────────────
function _announceList(text) {
  const el = document.getElementById('list-announce');
  if (!el) return;
  el.textContent = '';
  requestAnimationFrame(() => { el.textContent = text; });
}

// ─── Virtual Scroll ────────────────────────────────────────────────
const _VS_BUF  = 600;  // px pre-render buffer above/below viewport
const _VS_ROW  = 69;   // person/family row height (measured)
const _VS_SEP  = 23;   // alpha-sep height (measured)
const _VS_MIN  = 500;  // item threshold to activate

function _vsScrollEl() {
  return window.innerWidth >= 900 ? document.getElementById('v-main') : null;
}

// Firefox normalisiert Wheel-Events im DOM_DELTA_LINE-Modus (1) nicht auf Pixel.
// Das führt zu zu schnellem Scrollen. Einmalig pro Element registrieren.
const _wheelNormalized = new WeakSet();
function _normalizeWheel(el) {
  if (!el || _wheelNormalized.has(el)) return;
  _wheelNormalized.add(el);
  el.addEventListener('wheel', e => {
    if (e.deltaMode === 1) {
      // DOM_DELTA_LINE (Firefox Maus): 40px/Zeile, max. 5 Zeilen
      e.preventDefault();
      el.scrollTop += Math.max(-5, Math.min(5, e.deltaY)) * 40;
    } else if (e.deltaMode === 0 && Math.abs(e.deltaY) > 200) {
      // DOM_DELTA_PIXEL: Beschleunigungsspike deckeln (Trackpad-Gliding bleibt ok)
      e.preventDefault();
      el.scrollTop += Math.sign(e.deltaY) * 200;
    }
  }, { passive: false });
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
  _normalizeWheel(st.sc);
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
  _clearNavState();
  _closeHistoryPicker();
  _updateNavBtns();
  document.body.classList.remove('tree-active', 'fc-mode');
  setBnavActive(AppState.currentTab || 'persons');
  showView('v-main');
  renderTab();
  if (typeof _updateTasksBadge === 'function') _updateTasksBadge();
  if (saved && saved.tab === AppState.currentTab) {
    // setTimeout läuft nach rAF-Callbacks (z.B. _scrollListToCurrent)
    setTimeout(() => _setListScroll(saved.pos), 0);
  }
}

// ─── History-Picker (Back-Button Dropdown) ────────────────────────
// Label für einen History-Eintrag
function _historyItemLabel(item) {
  if (item.type === 'person') {
    const p = AppState.db.individuals[item.id];
    if (!p) return item.id;
    return p.surname ? p.surname + (p.given ? ', ' + p.given.split(' ')[0] : '') : (p.name || item.id);
  }
  if (item.type === 'family') {
    const f = AppState.db.families[item.id];
    if (!f) return item.id;
    const h = f.husb && AppState.db.individuals[f.husb];
    const w = f.wife && AppState.db.individuals[f.wife];
    const parts = [h?.surname, w?.surname].filter(Boolean);
    return parts.length ? parts.join(' & ') : (h?.name || w?.name || item.id);
  }
  if (item.type === 'source')   { const s = AppState.db.sources[item.id];       return s ? (s.abbr || s.title || item.id) : item.id; }
  if (item.type === 'repo')     { const r = AppState.db.repositories[item.id];  return r ? (r.name  || item.id) : item.id; }
  if (item.type === 'place')    return item.name || 'Ort';
  if (item.type === 'tree')     return 'Baum';
  if (item.type === 'fanchart') return 'Fächer';
  if (item.type === 'desctree') return 'Nachkommen';
  if (item.type === 'timeline') return 'Zeitleiste';
  return '◂';
}

// Generischer Picker: items = [{label, data}], onSelect(idx, data) — idx=-1 → rootLabel geklickt
function _showHistoryPicker(triggerEl, items, onSelect, rootLabel) {
  _closeHistoryPicker();

  const overlay = document.createElement('div');
  overlay.className = 'history-picker-overlay';
  overlay.addEventListener('click', _closeHistoryPicker);

  const picker = document.createElement('div');
  picker.className = 'history-picker';
  picker.addEventListener('click', e => e.stopPropagation());

  items.forEach((item, i) => {
    const btn = document.createElement('button');
    btn.className = 'history-picker-item';
    btn.type = 'button';
    btn.textContent = item.label;
    btn.addEventListener('click', () => { _closeHistoryPicker(); onSelect(i, item.data); });
    picker.appendChild(btn);
  });

  if (rootLabel) {
    picker.appendChild(Object.assign(document.createElement('div'), { className: 'history-picker-sep' }));
    const rootBtn = document.createElement('button');
    rootBtn.className = 'history-picker-item history-picker-root';
    rootBtn.type = 'button';
    rootBtn.textContent = rootLabel;
    rootBtn.addEventListener('click', () => { _closeHistoryPicker(); onSelect(-1, null); });
    picker.appendChild(rootBtn);
  }

  overlay.appendChild(picker);
  document.body.appendChild(overlay);

  // Positionierung unterhalb des Trigger-Buttons
  if (triggerEl) {
    const r = triggerEl.getBoundingClientRect();
    picker.style.top  = (r.bottom + 6) + 'px';
    picker.style.left = r.left + 'px';
    requestAnimationFrame(() => {
      const pw = picker.offsetWidth;
      const left = parseFloat(picker.style.left);
      if (left + pw > window.innerWidth - 8)
        picker.style.left = Math.max(8, window.innerWidth - pw - 8) + 'px';
    });
  }

  // ESC schließt
  const onKey = e => { if (e.key === 'Escape') { _closeHistoryPicker(); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);
}

function _closeHistoryPicker() {
  document.querySelector('.history-picker-overlay')?.remove();
}

// Navigation zu einem History-Eintrag (ohne History-Push)
function _navToHistoryItem(item) {
  if      (item.type === 'person')   showDetail(item.id, false);
  else if (item.type === 'family')   showFamilyDetail(item.id, false);
  else if (item.type === 'source')   showSourceDetail(item.id, false);
  else if (item.type === 'repo')     showRepoDetail(item.id, false);
  else if (item.type === 'place')    showPlaceDetail(item.name, false);
  else if (item.type === 'tree')     showTree(item.id, false);
  else if (item.type === 'fanchart') { if (typeof showFanChart  === 'function') showFanChart(item.id); }
  else if (item.type === 'desctree') { if (typeof showDescTree  === 'function') showDescTree(item.id, false); }
  else if (item.type === 'timeline') { if (typeof showTimeline  === 'function') showTimeline(item.id, false); }
  else showMain();
}

// ─── History-Navigation ───────────────────────────────────────────

// Aktuell angezeigte Entity als History-Eintrag (null = Listenansicht)
function _captureCurrentNavState() {
  if (document.getElementById('v-timeline')?.classList.contains('active') && UIState._timelinePid)
    return { type: 'timeline', id: UIState._timelinePid };
  if (AppState.currentPersonId) return { type: 'person', id: AppState.currentPersonId };
  if (AppState.currentFamilyId) return { type: 'family', id: AppState.currentFamilyId };
  if (AppState.currentSourceId) return { type: 'source', id: AppState.currentSourceId };
  if (AppState.currentRepoId)   return { type: 'repo',   id: AppState.currentRepoId };
  if (AppState._detailActive) {
    const title = document.getElementById('detailTopTitle')?.textContent;
    if (title) return { type: 'place', name: title };
  }
  if (document.getElementById('v-tree')?.classList.contains('active') && currentTreeId) {
    const _ttype = document.body.classList.contains('fc-mode')       ? 'fanchart'  :
                   document.body.classList.contains('desc-tree-mode') ? 'desctree' : 'tree';
    return { type: _ttype, id: currentTreeId };
  }
  return null;
}

// Muss am Anfang jeder showDetail/showFamilyDetail/showSourceDetail/showPlaceDetail stehen.
function _beforeDetailNavigate() {
  if (AppState._detailActive) {
    // Detail → Detail: aktuellen Zustand in Back-Stack sichern, Fwd-Stack leeren
    const cur = _captureCurrentNavState();
    if (cur) UIState._navHistory.push(cur);
    UIState._navFwdStack = [];
  } else if (document.getElementById('v-tree').classList.contains('active') && currentTreeId) {
    // Baum → Detail
    const _type = document.body.classList.contains('fc-mode')       ? 'fanchart'  :
                  document.body.classList.contains('desc-tree-mode') ? 'desctree' : 'tree';
    UIState._navHistory.push({ type: _type, id: currentTreeId });
    UIState._navFwdStack = [];
  } else if (document.getElementById('v-timeline')?.classList.contains('active') && UIState._timelinePid) {
    // Zeitleiste → Detail
    UIState._navHistory.push({ type: 'timeline', id: UIState._timelinePid });
    UIState._navFwdStack = [];
  } else {
    // Liste → Detail: History neu starten + Scroll-Position sichern
    UIState._navHistory.length = 0;
    UIState._navFwdStack = [];
    UIState._savedListScroll = { tab: AppState.currentTab, pos: _getListScroll() };
  }
  setTimeout(_persistNavState, 0); // nach show*() ausführen, wenn neue currentXxxId gesetzt ist
}

// "← Zurück" — 1 Schritt zurück, aktuellen Zustand auf Fwd-Stack
function goBack() {
  const hist = UIState._navHistory;
  if (!hist.length) { showMain(); return; }
  const cur = _captureCurrentNavState();
  if (cur) UIState._navFwdStack.push(cur);
  _navToHistoryItem(hist.pop());
  _updateNavBtns();
  _persistNavState();
}

// "→ Vorwärts" — 1 Schritt vor, aktuellen Zustand auf Back-Stack
function goForward() {
  const fwd = UIState._navFwdStack;
  if (!fwd.length) return;
  const cur = _captureCurrentNavState();
  if (cur) UIState._navHistory.push(cur);
  _navToHistoryItem(fwd.pop());
  _updateNavBtns();
  _persistNavState();
}

// "▾" — Picker mit vollständigem Verlauf
function openDetailHistory() {
  const hist = UIState._navHistory;
  if (!hist.length) return;
  const btn = document.getElementById('detailHistBtn');
  const items = [...hist].reverse().map((item, i) => ({
    label: _historyItemLabel(item),
    data:  { item, actualIdx: hist.length - 1 - i }
  }));
  _showHistoryPicker(btn, items, (idx, data) => {
    if (idx < 0) { showMain(); return; }
    hist.splice(data.actualIdx);
    UIState._navFwdStack = [];
    _navToHistoryItem(data.item);
    _updateNavBtns();
    _persistNavState();
  }, 'Liste');
}

// Alle Nav-Buttons synchron aktualisieren (Back ▾, Fwd, Tree-Back, Tree-Fwd)
function _updateNavBtns() {
  _updateDetailHistBtn();
  if (typeof _updateTreeBackBtn === 'function') _updateTreeBackBtn();
}

function _updateDetailHistBtn() {
  const btn = document.getElementById('detailHistBtn');
  if (btn) btn.hidden = UIState._navHistory.length < 2;
  const fwd = document.getElementById('detailFwdBtn');
  if (fwd) fwd.hidden = UIState._navFwdStack.length === 0;
}

// ─── Nav-State Persistenz (sessionStorage) ───────────────────────

function _persistNavState() {
  try {
    sessionStorage.setItem('stammbaum_nav', JSON.stringify({
      back:    UIState._navHistory,
      fwd:     UIState._navFwdStack,
      current: _captureCurrentNavState()
    }));
  } catch(e) {}
}

function _restoreNavState() {
  try {
    const raw = sessionStorage.getItem('stammbaum_nav');
    if (!raw) return false;
    const saved = JSON.parse(raw);
    UIState._navHistory  = Array.isArray(saved.back) ? saved.back : [];
    UIState._navFwdStack = Array.isArray(saved.fwd)  ? saved.fwd  : [];
    if (saved.current) { _navToHistoryItem(saved.current); return true; }
    _updateNavBtns();
  } catch(e) { sessionStorage.removeItem('stammbaum_nav'); }
  return false;
}

function _clearNavState() {
  UIState._navHistory.length = 0;
  UIState._navFwdStack = [];
  try { sessionStorage.removeItem('stammbaum_nav'); } catch(e) {}
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
  UIState._probandId = (saved && AppState.db.individuals[saved]) ? saved : null;
  const startId = getProbandId();
  if (startId) showTree(startId);
}

// ─────────────────────────────────────
//  VIEW DISPATCH
// ─────────────────────────────────────
function switchTab(tab) {
  AppState.currentTab = tab;
  if (tab !== 'places') {
    document.body.classList.remove('places-karte');
    document.getElementById('mapContainer')?.style.setProperty('display', 'none');
  }
  document.getElementById('tab-persons').style.display  = tab === 'persons'  ? 'block' : 'none';
  document.getElementById('tab-families').style.display = tab === 'families' ? 'block' : 'none';
  document.getElementById('tab-sources').style.display  = tab === 'sources'  ? 'block' : 'none';
  document.getElementById('tab-places').style.display   = tab === 'places'   ? 'block' : 'none';
  document.getElementById('tab-stats').style.display    = tab === 'stats'    ? 'block' : 'none';
  document.getElementById('tab-search').style.display   = tab === 'search'   ? 'block' : 'none';
  document.getElementById('tab-tasks').style.display    = tab === 'tasks'    ? 'block' : 'none';
  document.getElementById('fabBtn').style.display = (tab === 'search' || tab === 'stats' || tab === 'tasks') ? 'none' : '';
  renderTab();
}

function renderTab() {
  if (!document.getElementById('v-main').classList.contains('active')) return;
  if (AppState.currentTab === 'persons') applyPersonFilter(); // respektiert aktive Such- und Jahresfilter
  else if (AppState.currentTab === 'families') renderFamilyList();
  else if (AppState.currentTab === 'sources') { renderSourceList(); renderRepoList(); }
  else if (AppState.currentTab === 'places') {
    if (UIState._placesSubTab === 'hoefe') renderHofList();
    else if (UIState._placesSubTab === 'karte') {
      document.body.classList.add('places-karte');
      const isDesktop = document.body.classList.contains('desktop-mode');
      if (isDesktop) renderPlaceList();
      initOrRefreshPlaceMap();
    }
    else renderPlaceList();
  }
  else if (AppState.currentTab === 'stats') renderStatsTab();
  else if (AppState.currentTab === 'search') runGlobalSearch(document.getElementById('searchGlobal')?.value || '');
  else if (AppState.currentTab === 'tasks') { if (typeof renderTasksView === 'function') renderTasksView(); }
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
//  UNDO / REDO (U8)
// ─────────────────────────────────────

// Snapshot der angegebenen Entities vor einer Mutation aufnehmen.
// Muss VOR der Mutation aufgerufen werden.
function pushUndo(label, { personIds = [], familyIds = [], sourceIds = [], repoIds = [] } = {}) {
  const clone = v => (v === undefined || v === null) ? null
    : (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));
  const snap = {
    label,
    persons:  Object.fromEntries(personIds.map(id  => [id, clone(db.individuals[id])])),
    families: Object.fromEntries(familyIds.map(id  => [id, clone(db.families[id])])),
    sources:  Object.fromEntries(sourceIds.map(id  => [id, clone(db.sources[id])])),
    repos:    Object.fromEntries(repoIds.map(id    => [id, clone(db.repositories[id])])),
  };
  AppState._undoStack.push(snap);
  if (AppState._undoStack.length > 30) AppState._undoStack.shift();
  AppState._redoStack = [];
}

function applyUndo() { _applyUndoStack(AppState._undoStack, AppState._redoStack); }
function applyRedo() { _applyUndoStack(AppState._redoStack, AppState._undoStack); }

function _applyUndoStack(from, to) {
  if (!from.length) return;
  const snap = from.pop();
  const clone = v => (v === null) ? null
    : (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));

  // Gegenzug aufnehmen (aktuellen Zustand der betroffenen Entities sichern)
  const counter = { label: snap.label, persons: {}, families: {}, sources: {}, repos: {} };
  for (const [id, val] of Object.entries(snap.persons)) {
    counter.persons[id] = clone(db.individuals[id] ?? null);
    if (val === null) delete db.individuals[id]; else db.individuals[id] = val;
  }
  for (const [id, val] of Object.entries(snap.families)) {
    counter.families[id] = clone(db.families[id] ?? null);
    if (val === null) delete db.families[id]; else db.families[id] = val;
  }
  for (const [id, val] of Object.entries(snap.sources)) {
    counter.sources[id] = clone(db.sources[id] ?? null);
    if (val === null) delete db.sources[id]; else db.sources[id] = val;
  }
  for (const [id, val] of Object.entries(snap.repos)) {
    counter.repos[id] = clone(db.repositories[id] ?? null);
    if (val === null) delete db.repositories[id]; else db.repositories[id] = val;
  }
  to.push(counter);

  UIState._placesCache = null;
  UIState._hofCache = null;
  UIState._searchIndexDirty = true;
  AppState.changed = AppState._undoStack.length > 0;
  updateChangedIndicator();
  if (typeof invalidatePlacePersonIndex === 'function') invalidatePlacePersonIndex();
  renderTab();
  showToast('↩ ' + snap.label, 'info');
}

// ─────────────────────────────────────
//  SHARED VIEW HELPERS
// ─────────────────────────────────────

// Generische Autocomplete-Funktion für Orte, Adressen, Personen.
// opts.getItems(q)       → Array — gefilterte+sortierte Treffer für Suchstring q
// opts.formatLabel(item) → string — Anzeigetext pro Eintrag
// opts.onSelect(item, inputEl) → void — Aktion beim Klick
// opts.configEl?(el, item) — optionale Anpassung des Dropdown-Elements (z.B. Stil)
// opts.onInput?(inputEl)   — optionale Aktion bei jedem Tastendruck (vor Suche)
// opts.limit (default 12) — max. Trefferzahl
function initAutocomplete(inputId, ddId, opts) {
  const input = document.getElementById(inputId);
  const dd    = document.getElementById(ddId);
  if (!input || !dd) return;
  const limit = opts.limit ?? 12;

  const _run = debounce(() => {
    const q = input.value.toLowerCase().trim();
    dd.innerHTML = '';
    if (!q) { dd.style.display = 'none'; return; }
    const items = opts.getItems(q).slice(0, limit);
    if (!items.length) { dd.style.display = 'none'; return; }
    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'place-dropdown-item';
      el.textContent = opts.formatLabel(item);
      if (opts.configEl) opts.configEl(el, item);
      el.addEventListener('mousedown', () => {
        opts.onSelect(item, input);
        dd.innerHTML = ''; dd.style.display = 'none';
      });
      dd.appendChild(el);
    });
    dd.style.display = 'block';
  }, 150);

  input.addEventListener('input', () => {
    opts.onInput?.(input);
    if (!input.value.trim()) { dd.innerHTML = ''; dd.style.display = 'none'; return; }
    _run();
  });
  input.addEventListener('blur',  () => setTimeout(() => { dd.style.display = 'none'; }, 150));
  input.addEventListener('focus', () => { if (dd.children.length) dd.style.display = 'block'; });
}

function safeLinkHref(url) {
  if (!url) return '#';
  const s = url.trim().toLowerCase();
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('mailto:')) return url;
  return '#';
}

function _validCoord(lat, lon) {
  const la = parseFloat(lat), lo = parseFloat(lon);
  return isFinite(la) && isFinite(lo) && la >= -90 && la <= 90 && lo >= -180 && lo <= 180;
}

function evGeoLink(lati, long) {
  return _validCoord(lati, long)
    ? `<a href="https://maps.apple.com/?ll=${lati},${long}" target="_blank" data-action="stop" class="geo-link">📍</a>` : '';
}

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
    const isUrl = /^https?:\/\//i.test(page);
    const linkBtn = isUrl
      ? `<span class="src-badge-link" data-action="openCitLink" data-href="${esc(page)}" title="${esc(page)}">↗</span>`
      : '';
    return `<span class="src-badge${qClass}" data-action="showSourceDetail" data-sid="${sid}" title="${esc(tipParts.join(' · '))}">§${srcNum(sid)}${pageSuffix}</span>${linkBtn}`;
  }).filter(Boolean).join('');
}

function citTagsHtml(citations) {
  if (!citations?.length) return '';
  return citations.map(c => {
    const s = AppState.db.sources[c.sid];
    if (!s) return '';
    const page  = c.page || '';
    const quay  = c.quay != null ? String(c.quay) : '';
    const qClass = quay !== '' ? ` src-badge--q${quay}` : '';
    const pageSuffix = page && page.length <= 5 ? `·${page}` : '';
    const tipParts = [
      (s.title || s.abbr || c.sid).substring(0, 50),
      page ? `S. ${page}` : '',
      quay !== '' ? `Q${quay} – ${_QUAY_LABELS[quay] || quay}` : ''
    ].filter(Boolean);
    const isUrl = /^https?:\/\//i.test(page);
    const linkBtn = isUrl
      ? `<span class="src-badge-link" data-action="openCitLink" data-href="${esc(page)}" title="${esc(page)}">↗</span>`
      : '';
    return `<span class="src-badge${qClass}" data-action="showSourceDetail" data-sid="${c.sid}" title="${esc(tipParts.join(' · '))}">§${srcNum(c.sid)}${pageSuffix}</span>${linkBtn}`;
  }).filter(Boolean).join('');
}

// Gibt Eltern-Hierarchiekette als HTML zurück (z.B. "Rhein-Sieg-Kreis → NRW").
// Leer wenn kein placeObjects-Modus oder keine Eltern vorhanden.
function _placeHierHtml(placeId) {
  const po = AppState.db?.placeObjects;
  if (!po || !placeId || !po[placeId]) return '';
  const chain = [];
  let cur = po[placeId], guard = 8;
  while (cur && guard-- > 0) { chain.push(cur.title); cur = cur.parentId ? po[cur.parentId] : null; }
  if (chain.length <= 1) return '';
  return `<span class="place-hier">${chain.slice(1).map(esc).join(' → ')}</span>`;
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
function _sortedChildren(children) {
  return [...(children || [])].sort((a, b) => {
    const pa = AppState.db.individuals[a];
    const pb = AppState.db.individuals[b];
    return evDateKey(pa?.birth?.date || '').localeCompare(evDateKey(pb?.birth?.date || ''));
  });
}

const _CLICK_MAP = {
  // Dynamisch generierte Einträge (bereits vorhanden)
  showEventFormTyped:      el => showEventForm(el.dataset.pid, undefined, el.dataset.evtype),
  newSourceForm:           ()  => showSourceForm(null),
  newFamilyForm:           ()  => showFamilyForm(null),
  removeNoteRef:           el  => el.closest('[data-ref-section]')?.remove(),
  jumpToSection:           el => document.getElementById(el.dataset.jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
  showDetail:              el => showDetail(el.dataset.pid  || el.dataset.id),
  showFamilyDetail:        el => showFamilyDetail(el.dataset.fid  || el.dataset.id),
  showSourceDetail:        el => showSourceDetail(el.dataset.sid  || el.dataset.id),
  showRepoDetail:          el => showRepoDetail(el.dataset.id),
  showPlaceDetail:         el => showPlaceDetail(el.dataset.name),
  showHofDetail:           el => showHofDetail(el.dataset.addr),
  showHofAddForm:          el => showHofAddForm(el.dataset.addr),
  showHofPropForm:         el => showHofPropForm(el.dataset.addr),
  saveHofBewohner:         el => saveHofBewohner(el.dataset.addr),
  cancelHofBewohner:       ()  => cancelHofBewohner(),
  saveHofEigentum:         el => saveHofEigentum(el.dataset.addr),
  cancelHofEigentum:       ()  => cancelHofEigentum(),
  showHofCoordForm:        el => showHofCoordForm(el.dataset.addr),
  cancelHofCoord:          ()  => cancelHofCoord(),
  saveHofCoord:            el => saveHofCoord(el.dataset.addr),
  deleteHofCoord:          el => deleteHofCoord(el.dataset.addr),
  openHofNote:             el => openNoteModal('hof', el.dataset.addr),
  showHofRenameForm:       ()  => showHofRenameForm(),
  cancelHofRename:         ()  => cancelHofRename(),
  saveHofRename:           el  => saveHofRename(el.dataset.addr),
  switchPlacesSubTab:      el => switchPlacesSubTab(el.dataset.subtab),
  switchMapMode:           el => switchMapMode(el.dataset.mode),
  closeMapPanel:           ()  => { document.getElementById('map-explore-panel').style.display = 'none'; },
  showPersonOnMap:         el => showPersonOnMap(el.dataset.pid || el.dataset.id),
  mapClose:                ()  => { document.getElementById('map-close-btn').style.display = 'none'; goBack(); },
  openMapPersonPicker:     ()  => openMapPersonPicker(),
  selectMapPerson:         el => selectMapPerson(el.dataset.pid),
  deleteExtraPlace:        el => deleteExtraPlace(el.dataset.pname || el.dataset.name),
  treeShowProband:         ()  => {
    const id = getProbandId();
    if (!id) return;
    if (document.body.classList.contains('fc-mode'))        showFanChart(id);
    else if (document.body.classList.contains('desc-tree-mode')) showDescTree(id, false);
    else showTree(id, false);
  },
  moveFamUp:               el => moveFamOrder(el.dataset.pid, el.dataset.fid, -1),
  moveFamDown:             el => moveFamOrder(el.dataset.pid, el.dataset.fid, +1),
  unlinkMember:            el => unlinkMember(el.dataset.fid, el.dataset.pid),
  showPersonForm:          el => showPersonForm(el.dataset.pid),
  showExtraNameForm:       el => showExtraNameForm(el.dataset.pid, parseInt(el.dataset.enidx ?? '-1', 10)),
  saveExtraName:           ()  => saveExtraName(),
  deleteExtraName:         ()  => deleteExtraName(),
  showEventForm:           el => showEventForm(el.dataset.pid, el.dataset.ev),
  showFamEventForm:        el => showFamEventForm(el.dataset.fid, el.dataset.evkey, el.dataset.evidx),
  showAddAliasFlow:        el => showAddAliasFlow(el.dataset.pid),
  removeAlias:             el => removeAlias(el.dataset.pid, el.dataset.aliasid),
  showAddSpouseFlow:       el => showAddSpouseFlow(el.dataset.pid),
  showAddChildFlow:        el => showAddChildFlow(el.dataset.fid),
  showAddParentFlow:       el => showAddParentFlow(el.dataset.pid),
  openAddMediaDialog:      el => openAddMediaDialog(el.dataset.ctx, el.dataset.id),
  openMediaPhoto:          el => openMediaPhoto(el.dataset.mediaFile, el.dataset.hero, el.dataset.avatar),
  openEditMediaDialog:     el => openEditMediaDialog(el.dataset.ctx, el.dataset.id, +el.dataset.idx),
  openSourceMediaView:     el => openSourceMediaView(el.dataset.sid, +el.dataset.idx),
  showChildRelDialog:      el => showChildRelDialog(el.dataset.fid, el.dataset.cid),
  removeSrc:               el => removeSrc(el.dataset.prefix, +el.dataset.citidx),
  addSrc:                  el => addSrc(el.dataset.prefix, el.dataset.sid),
  'copy-cit':              el => copyCitations(el.dataset.prefix),
  'paste-cit':             el => pasteCitations(el.dataset.prefix),
  openCitLink:             (el, e) => { e.stopPropagation(); window.open(el.dataset.href, '_blank', 'noopener'); },
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
  toggleSoundex:           ()  => toggleSoundex(),
  openMenuModal:           ()  => { openModal('modalMenu'); _odUpdateUI(); },
  clearYearFilter:         ()  => clearYearFilter(),
  togglePersonSort:        ()  => togglePersonSort(),
  toggleAdvFilter:         ()  => toggleAdvFilter(),
  showPersonMediaBrowser:  ()  => showPersonMediaBrowser(),
  showFamilyMediaBrowser:  ()  => showFamilyMediaBrowser(),
  scrollToRepo:            ()  => document.getElementById('repoSection').scrollIntoView({behavior:'smooth'}),
  showMediaBrowser:        ()  => showMediaBrowser(),
  showAddSheet:            ()  => showAddSheet(),
  goBack:                  ()  => goBack(),
  goForward:               ()  => goForward(),
  openDetailHistory:       ()  => openDetailHistory(),
  openTreeHistory:         ()  => openTreeHistory(),
  showEditSheet:           ()  => showEditSheet(),
  treeNavBack:             ()  => treeNavBack(),
  setTreeGens:             el => setTreeGens(+el.dataset.tgen),
  setFcGens:               el => setFcGens(+el.dataset.gen),
  setDescTreeGens:         el => setDescTreeGens(+el.dataset.dgen),
  toggleFanChart:          ()  => toggleFanChart(),
  toggleDescTree:          ()  => toggleDescTree(),
  toggleTreeFullscreen:    ()  => toggleTreeFullscreen(),
  showRelPath:             el  => showRelPath(el.dataset.pid),
  relPathShowDetail:       el  => { closeModal('modalRelPath'); showDetail(el.dataset.id); },
  showTree:                el  => showTree(el.dataset.id),
  showTimeline:            el  => { if (typeof showTimeline === 'function') showTimeline(el.dataset.id); },
  tlFilter:                el  => { if (typeof _tlFilterToggle === 'function') _tlFilterToggle(el.dataset.cat); },
  toggleProband:           el  => _toggleProband(el.dataset.id),
  bnavTree:                ()  => bnavTree(),
  bnavTab:                 el => bnavTab(el.dataset.tab),
  bnavHome:                ()  => bnavHome(),
  bnavTasks:               ()  => bnavTasks(),
  menuProband:             ()  => { closeModal('modalMenu'); bnavHome(); },
  menuValidate:            ()  => { closeModal('modalMenu'); bnavTasks(); setTimeout(() => { if (typeof _handleRunValidation === 'function') _handleRunValidation(); }, 80); },
  addPerson:               ()  => { closeModal('modalAdd'); showPersonForm(null); },
  addFamily:               ()  => { closeModal('modalAdd'); showFamilyForm(null); },
  addSource:               ()  => { closeModal('modalAdd'); showSourceForm(null); },
  addPlace:                ()  => { closeModal('modalAdd'); showNewPlaceForm(); },
  addPfExtraName:          ()  => addPfExtraName(),
  toggleSrcPicker:         el => toggleSrcPicker(el.dataset.prefix),
  savePerson:              ()  => savePerson(),
  savePersonAndNew:        ()  => savePerson(true),
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
  saveAndCopyEvent:        ()  => saveAndCopyEvent(),
  applyClipboardEvent:     el  => applyClipboardEventToPerson(el.dataset.pid),
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
  menuFormatConvert:       ()  => { closeModal('modalMenu'); AppState.db?._grampsMaster ? exportGEDCOM(true) : exportGRAMPS(); },
menuRevert:              ()  => { closeModal('modalMenu'); revertToSaved(); },
  menuLoadDemo:            ()  => { closeModal('modalMenu'); loadDemo(); },
  menuNewFile:             ()  => { closeModal('modalMenu'); confirmNewFile(); },
  menuHelp:                ()  => { closeModal('modalMenu'); openModal('modalHelp'); },
  menuRoundtrip:           ()  => { closeModal('modalMenu'); if (typeof runRoundtripTest === 'function') runRoundtripTest(); },
  menuGrampsRoundtrip:     ()  => { closeModal('modalMenu'); if (typeof runGrampsRoundtripTest === 'function') runGrampsRoundtripTest(); },
  menuBook:                ()  => { closeModal('modalMenu'); openBookModal(); },
  generateBook:            ()  => {
    const mode      = document.querySelector('#book-mode-seg button.active')?.dataset.bookMode || 'ancestors';
    const title     = document.getElementById('book-title')?.value.trim() || 'Familienbuch';
    const withPhotos = document.getElementById('book-photos')?.checked ?? true;
    downloadBook({ title, mode, withPhotos });
  },
  themeAuto:               ()  => setThemePref('auto'),
  themeLight:              ()  => setThemePref('light'),
  themeDark:               ()  => setThemePref('dark'),
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
  helpRoundtrip:           ()  => { closeModal('modalHelp'); if (typeof runRoundtripTest === 'function') runRoundtripTest(); },
  menuDedup:               ()  => { closeModal('modalMenu'); openDedupModal(); },
  menuStats:               ()  => { closeModal('modalMenu'); bnavTab('stats'); },
  dedupRunScan:            ()  => dedupRunScan(),
  dedupOpenMerge:          el  => dedupOpenMerge(el),
  dedupSwapWinner:         ()  => dedupSwapWinner(),
  dedupIgnorePair:         ()  => dedupIgnorePair(),
  dedupConfirmMerge:       ()  => dedupConfirmMerge(),
  openNoteModal:           el  => openNoteModal(el.dataset.ntype, el.dataset.nid),
  saveNoteModal:           ()  => saveNoteModal(),
  saveChildRelDialog:      ()  => saveChildRelDialog(),
  syncBannerSave:          ()  => _syncBannerSave(),
  startupChoiceOneDrive:   ()  => _startupChoiceOneDrive(),
  startupChoiceLocal:      ()  => _startupChoiceLocal(),
  closeLightbox:           ()  => { document.getElementById('modalLightbox').style.display = 'none'; },
  lightboxSetHero:         (el, e) => { e.stopPropagation(); _lightboxSetHero(); },
  confirmModalOk:          ()  => { _confirmResolve?.(true); _confirmResolve = null; closeModal('modalConfirm'); },
  confirmModalCancel:      ()  => closeModal('modalConfirm'),
  switchTasksFilter:       el  => switchTasksFilter(el.dataset.filter),
  showAddTaskForm:         el  => showAddTaskForm(el.dataset.pid),
  showAddFamTaskForm:      el  => showAddFamTaskForm(el.dataset.fid),
  saveAddTask:             ()  => _saveAddTask(),
  toggleTask:              el  => _handleToggleTask(el),
  editTask:                el  => _handleEditTask(el),
  deleteTask:              el  => _handleDeleteTask(el),
  toggleFamTask:           el  => _handleToggleFamTask(el),
  editFamTask:             el  => _handleEditFamTask(el),
  deleteFamTask:           el  => _handleDeleteFamTask(el),
  runValidation:           ()  => _handleRunValidation(),
  dismissValidation:       ()  => { clearValidationResults(); renderTasksView(); },
  promoteToTask:           el  => _handlePromoteToTask(el),
  openValConfig:           ()  => openValConfig(),
  saveValConfig:           ()  => saveValConfig(),
  resetValConfig:          ()  => resetValConfig(),
};

// Firefox Wheel-Normalisierung für Hauptliste frühzeitig registrieren
document.addEventListener('DOMContentLoaded', () => {
  _normalizeWheel(document.getElementById('v-main'));
});

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
  if      (action === 'applyPersonFilter') applyPersonFilter();
  else if (action === 'savePedi')          savePedi(el.dataset.fid, el.dataset.cid, el.value);
  else if (action === 'updateSrcQuay')     updateSrcQuay(el.dataset.prefix, +el.dataset.citidx, el.value);
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
  if      (action === 'updateSrcPage')   updateSrcPage(el.dataset.prefix, +el.dataset.citidx, el.value);
  else if (action === 'applyPersonFilter') applyPersonFilter();
  else if (action === 'filterFamilies')  filterFamiliesDebounced(el.value);
  else if (action === 'filterSources')   filterSourcesDebounced(el.value);
  else if (action === 'filterPlaces')    filterPlacesDebounced(el.value);
  else if (action === 'filterHoefe')     filterHoefeDebounced(el.value);
  else if (action === 'runGlobalSearch') runGlobalSearchDebounced(el.value);
  else if (action === 'filterMapPersonList') filterMapPersonList();
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

// openNoteModal / saveNoteModal / _pruneOrphanNotes / _noteRefUsers → ui-views-note.js

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
