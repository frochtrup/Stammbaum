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

// Führt fn aus nachdem der Browser das Layout neu berechnet hat (2× rAF).
// Ersetzt alle magic-number setTimeout-Delays nach CSS-Klassen-Änderungen.
window._afterLayout = function (fn) {
  requestAnimationFrame(() => requestAnimationFrame(fn));
};

// A4/A5 (P5): 5 separate Detail-Container — per-Entität-Scroll-State + data-view-init
const _DC_IDS = ['detailPerson','detailFamily','detailPlace','detailSource','detailMedia'];

window._activateDetailContainer = function _activateDetailContainer(cid, entityId) {
  const vdet = document.getElementById('v-detail');
  const isDesktop = document.body.classList.contains('desktop-mode');
  // Scroll der aktuell aktiven Fläche sichern
  if (isDesktop && vdet) {
    const cur = _DC_IDS.find(id => document.getElementById(id)?.classList.contains('dc-active'));
    if (cur && cur !== cid) {
      const curEl = document.getElementById(cur);
      if (curEl) curEl.dataset.savedScroll = String(vdet.scrollTop);
    }
  }
  // Aktiven Container umschalten
  _DC_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('dc-active', id === cid);
  });
  const el = document.getElementById(cid);
  if (!el || entityId === undefined) return;
  const key = String(entityId);
  const changed = el.dataset.currentId !== key;
  el.dataset.currentId = key;
  el.dataset.viewInit = 'true';
  if (isDesktop && vdet) {
    vdet.scrollTop = changed ? 0 : (parseInt(el.dataset.savedScroll, 10) || 0);
  }
};

function showView(id) {
  const desktop = window.innerWidth >= 900 && id !== 'v-landing';
  // R1+P6-B1: alle anderen aktiven Views deaktivieren — Desktop hält v-main + v-detail/v-tree
  // gleichzeitig active (ADR-009). querySelector lieferte nur das erste, was beim Wechsel
  // v-tree→v-main den Baum sichtbar stehen ließ (links: 360px, fixed → überdeckt Detail).
  // Desktop-Layout: linkes Panel (v-main) ist permanent sichtbar — niemals deaktivieren.
  // .view{display:none} würde sonst scrollTop auf 0 zurücksetzen (Browser-Invariant).
  const _DESKTOP_LEFT = 'v-main';
  document.querySelectorAll('.view.active').forEach(v => {
    if (v.id !== id && !(desktop && v.id === _DESKTOP_LEFT)) v.classList.remove('active');
  });
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
  // Vollbild-Zustand zwischen Views übertragen oder beenden
  const _fsTree = document.body.classList.contains('tree-fullscreen');
  const _fsTl   = document.body.classList.contains('timeline-fullscreen');
  const _anyFs  = _fsTree || _fsTl;
  document.body.classList.remove('tree-fullscreen', 'timeline-fullscreen');
  if (_anyFs) {
    if (id === 'v-tree') {
      // Vollbild an Baum weitergeben
      document.body.classList.add('tree-fullscreen');
      const b = document.getElementById('treeFsBtn');
      if (b) { b.textContent = '⤡'; b.title = 'Sidebar einblenden'; }
    } else if (id === 'v-timeline') {
      // Vollbild an Timeline weitergeben
      document.body.classList.add('timeline-fullscreen');
      const b = document.getElementById('tlFsBtn');
      if (b) { b.textContent = '⤡'; b.title = 'Sidebar einblenden'; }
    } else {
      // Vollbild beendet — linke Seite neu kalibrieren
      _afterLayout(() => window.dispatchEvent(new Event('resize')));
    }
  }
  // Buttons der verlassenen View zurücksetzen
  if (!document.body.classList.contains('tree-fullscreen')) {
    const b = document.getElementById('treeFsBtn');
    if (b) { b.textContent = '⤢'; b.title = 'Vollbild'; }
  }
  if (!document.body.classList.contains('timeline-fullscreen')) {
    const b = document.getElementById('tlFsBtn');
    if (b) { b.textContent = '⤢'; b.title = 'Vollbild'; }
  }
  if (id === 'v-main') _updateTopbarH();
  // Karte ausblenden wenn nicht im Orte-Tab
  if (id !== 'v-main' || AppState.currentTab !== 'places') {
    document.body.classList.remove('places-karte');
    document.getElementById('mapContainer')?.style.setProperty('display', 'none');
  }

  if (desktop) {
    document.getElementById('bottomNav').style.display = 'flex';
    document.getElementById('fabBtn').style.display = '';
    AppState._detailActive = (id === 'v-detail');
    document.body.classList.add('desktop-mode');
    document.body.classList.toggle('has-detail', id === 'v-detail');
    document.body.classList.toggle('timeline-active', id === 'v-timeline');
    document.body.classList.toggle('story-active', id === 'v-story');
    if (id === 'v-detail') { const _det = document.getElementById('v-detail'); _normalizeWheel(_det); _initDetailSwipe(); requestAnimationFrame(_updateDetailHistBtn); }
  } else {
    document.body.classList.remove('desktop-mode', 'has-detail');
    AppState._detailActive = (id === 'v-detail');
    if (id === 'v-detail') {
      // P0-K1: scrollTop-Reset auch mobile — verhindert „Void"-Artefakt
      // bei kürzerem neuem Detail-Inhalt (vorher nur im Desktop-Zweig gesetzt).
      _initDetailSwipe();
    }
    const showNav = (id === 'v-main' || id === 'v-tree' || id === 'v-detail');
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
    if (page && page !== '\x00') parts.push(page);
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
  // Linken Panel auf Personen zurücksetzen — Personenliste ist der natürliche Partner zur Baumansicht
  if (AppState.currentTab !== 'persons') switchTab('persons');
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
    document.getElementById('detailPlace').innerHTML = '';
    document.getElementById('detailPlace').dataset.viewInit = 'false';
    document.body.classList.remove('has-detail');
    renderHofList();
  } else if (sub === 'orte') {
    document.getElementById('detailPlace').innerHTML = '';
    document.getElementById('detailPlace').dataset.viewInit = 'false';
    document.body.classList.remove('has-detail');
    renderPlaceList();
  } else if (sub === 'karte') {
    document.getElementById('detailPlace').innerHTML = '';
    document.getElementById('detailPlace').dataset.viewInit = 'false';
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
  _desktopAutoSelect(name);
  if (!document.body.classList.contains('desktop-mode')) _mobileSelectionRestore(name);
}

// Bottom-Nav: Globale Suche
function bnavSearch() {
  setBnavActive('search');
  showView('v-main');
  switchTab('search');
  _afterLayout(() => document.getElementById('searchGlobal')?.focus());
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

// Scroll-Listener nach Tab-Rückkehr neu registrieren ohne DOM-Reset.
// curId: aktuell ausgewählte Entität (Person- oder Familie-ID) — die Scroll-Position
// wird daraus berechnet, identisch zur Logik im initialen Render von renderPersonList /
// renderFamilyList. getBoundingClientRect() erzwingt den Reflow nach display:block.
// lstAbs (= Abstand Listenkopf vom Scroll-Container-Anfang) ist unabhängig von
// scrollTop — korrekte Berechnung auch wenn sc.scrollTop noch vom anderen Tab stammt.
function _vsReattach(listEl, st, curId) {
  if (st.active || !st.top) return;
  st.sc = _vsScrollEl();
  st.active = true;
  st.r = null;
  _normalizeWheel(st.sc);
  // Scroll zur aktuellen Auswahl berechnen und setzen, VOR _vsRender
  if (curId) {
    const idx = st.items.findIndex(it => it.id === curId);
    if (idx >= 0) {
      const sc = st.sc;
      const scTop  = sc ? sc.scrollTop : window.scrollY;
      const viewH  = sc ? sc.clientHeight : window.innerHeight;
      const lr     = listEl.getBoundingClientRect(); // erzwingt Reflow
      const sr     = sc ? sc.getBoundingClientRect().top : 0;
      const lstAbs = scTop + lr.top - sr; // Listenkopf in Scroll-Koordinaten (≈ topbar-Höhe)
      const target = Math.max(0, lstAbs + st.offsets[idx] - viewH / 2 + _VS_ROW / 2);
      if (sc) sc.scrollTop = target; else window.scrollTo(0, target);
    }
  }
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
  const _activeTab = AppState.currentTab || 'persons';
  setBnavActive(_activeTab);
  // Tab-Divs: nur aktiven sichtbar — Schutz gegen Erstload ohne vorigen switchTab-Aufruf
  ['persons','families','sources','places','stats','search','tasks'].forEach(t => {
    const el = document.getElementById('tab-' + t);
    if (el) el.style.display = (t === _activeTab) ? 'block' : 'none';
  });
  showView('v-main');
  renderTab();
  if (typeof _updateTasksBadge === 'function') _updateTasksBadge();
  if (saved && saved.tab === AppState.currentTab) {
    // _afterLayout läuft nach rAF-Callbacks (z.B. _scrollListToCurrent)
    _afterLayout(() => _setListScroll(saved.pos));
  }
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

// Kleinste numerische ID aus beliebiger Map (families, sources)
function _smallestId(map) {
  const ids = Object.keys(map || {});
  if (!ids.length) return null;
  return ids.sort((a, b) => (parseInt(a.replace(/\D/g,''))||0) - (parseInt(b.replace(/\D/g,''))||0))[0];
}

// Alphabetisch erster Ortsname
function _firstPlaceName() {
  if (typeof collectPlaces !== 'function') return null;
  const places = collectPlaces();
  if (!places.size) return null;
  return [...places.keys()].sort((a, b) => a.localeCompare(b, 'de'))[0] || null;
}

// Mobile: nach Tab-Tipp zur letzten Auswahl scrollen + highlighten (kein showDetail)
function _mobileSelectionRestore(tab) {
  if (tab === 'persons') {
    const id = ViewState.getCurrent('persons');
    if (id) _updatePersonListCurrent(id);
  } else if (tab === 'families') {
    const id = ViewState.getCurrent('families');
    if (id) _updateFamilyListCurrent(id);
  } else if (tab === 'sources') {
    const id = ViewState.getCurrent('sources');
    if (id) _updateSourceListCurrent(id);
  } else if (tab === 'places') {
    const name = ViewState.getCurrent('places');
    if (name) _updatePlaceListCurrent(name);
  }
}

function _persistLastTabSel() {
  idbPut('last_tab_sel', UIState._lastTabSel).catch(() => {});
}

// ─────────────────────────────────────
//  ViewState — zentraler View-Selektion-Helper (A1, ADR-025)
// ─────────────────────────────────────
// Garantien: ① IDB-persistent, ② validiert gegen AppState.db, ③ viewstate-change-Event.
// Ersetzt die parallele Buchführung AppState.currentX + UIState._lastTabSel.
// AppState.currentX bleibt als Read-Convenience (wird von setCurrent synchron gesetzt).
const ViewState = (() => {
  // Mapping tab → AppState-Feld
  const _FIELD = {
    persons:  'currentPersonId',
    families: 'currentFamilyId',
    sources:  'currentSourceId',
    places:   'currentPlaceName',
  };
  // Alle exklusiven Fokus-Felder (werden beim Setzen eines Tabs auf null zurückgesetzt)
  const _ALL_FIELDS = ['currentPersonId', 'currentFamilyId', 'currentSourceId', 'currentRepoId', 'currentPlaceName'];

  /**
   * Setzt aktuelle Auswahl für einen Tab.
   * - Schreibt in UIState._lastTabSel (IDB-persistent via _persistLastTabSel)
   * - Setzt AppState.currentX (exklusiver Fokus: alle anderen → null)
   * - Dispatcht 'viewstate-change' CustomEvent
   */
  function setCurrent(tab, id) {
    // Per-Tab-Persistenz
    (UIState._lastTabSel || (UIState._lastTabSel = {}))[tab] = id;
    _persistLastTabSel();
    // Exklusiver Fokus: alle currentX-Felder löschen, dann dieses setzen
    _ALL_FIELDS.forEach(f => { AppState[f] = null; });
    const field = _FIELD[tab];
    if (field) AppState[field] = id;
    // Event für spätere Listener (P3, ADR-025)
    document.dispatchEvent(new CustomEvent('viewstate-change', { detail: { tab, id } }));
  }

  /**
   * Gibt aktuelle Auswahl für einen Tab zurück; validiert Existenz gegen AppState.db.
   * Gibt null zurück wenn ID nicht mehr existiert.
   */
  function getCurrent(tab) {
    const sel = UIState._lastTabSel;
    if (!sel) return null;
    const id = sel[tab];
    if (!id) return null;
    if (tab === 'persons')  return AppState.db?.individuals?.[id] ? id : null;
    if (tab === 'families') return AppState.db?.families?.[id] ? id : null;
    if (tab === 'sources')  return (typeof getSource === 'function' && getSource(id)) ? id : null;
    if (tab === 'places')   return id; // Existenz bei Verwendung prüfen (collectPlaces)
    return id;
  }

  return { setCurrent, getCurrent };
})();

// Desktop: rechtes Panel beim Tab-Wechsel automatisch befüllen
// A5 (P5): Container-Map für Skip-Re-Render-Check
const _DC_TAB_MAP = { persons: 'detailPerson', families: 'detailFamily', sources: 'detailSource', places: 'detailPlace' };

// P6-B6: Place- und Source-Listen-Highlight zentral (analog zu
// _updatePersonListCurrent/_updateFamilyListCurrent in ui-views-person.js).
// Aufgerufen aus show*Detail (Full-Render-Pfad), _dcAlreadyShows (Skip-Pfad) und
// _mobileSelectionRestore — sonst bleibt der alte Listen-Eintrag markiert, wenn der
// User in der Liste auf einen anderen Eintrag klickt (Detail wechselt, .current nicht).
function _updatePlaceListCurrent(name) {
  const list = document.getElementById('placeList');
  if (!list) return;
  list.querySelectorAll('.current').forEach(e => e.classList.remove('current'));
  if (!name) return;
  const cur = list.querySelector(`[data-name="${CSS.escape(String(name))}"]`);
  if (cur) { cur.classList.add('current'); _scrollListToCurrent(document.getElementById('v-main'), cur); }
}
function _updateSourceListCurrent(id) {
  const list = document.getElementById('sourceList');
  if (!list) return;
  list.querySelectorAll('.current').forEach(e => e.classList.remove('current'));
  if (!id) return;
  const cur = list.querySelector(`[data-sid="${CSS.escape(String(id))}"]`);
  if (cur) { cur.classList.add('current'); _scrollListToCurrent(document.getElementById('v-main'), cur); }
}

// P6-B5: gemeinsame Detail-Toolbar (TopTitle + 8 Buttons) auf den passenden Entity-Typ
// konfigurieren. Aufgerufen aus den show*Detail-Funktionen UND dem Skip-Pfad in
// _dcAlreadyShows — sonst zeigte die Toolbar nach Tab-Wechsel-Skip noch die Werte
// der vorigen Entität (TopTitle „Familie" über Personen-Detail, storyBtn dataset.action
// auf showFamilyStory mit falscher fid usw. — funktionale Fehlverdrahtung, kein Kosmetikum).
function _configureDetailToolbar(tab, entityId) {
  const top      = document.getElementById('detailTopTitle');
  const editBtn  = document.getElementById('editBtn');
  const treeBtn  = document.getElementById('treeBtn');
  const tlBtn    = document.getElementById('timelineBtn');
  const stBtn    = document.getElementById('storyBtn');
  const pbBtn    = document.getElementById('probandBtn');
  const pbsBtn   = document.getElementById('probandSetBtn');
  const mapBtn   = document.getElementById('detailMapBtn');

  if (tab === 'persons') {
    const p = AppState.db.individuals[entityId];
    if (!p) return;
    if (top) top.textContent = p.name || entityId;
    if (editBtn) editBtn.style.display = '';
    if (treeBtn) { treeBtn.hidden = false; treeBtn.style.display = ''; treeBtn.dataset.id = entityId; }
    if (tlBtn)   { tlBtn.hidden = false; tlBtn.dataset.id = entityId; }
    if (stBtn)   { stBtn.hidden = false; stBtn.dataset.action = 'showStory'; stBtn.dataset.id = entityId; delete stBtn.dataset.fid; }
    if (mapBtn)  mapBtn.hidden = false;
    if (pbBtn)   pbBtn.hidden = false;
    if (pbsBtn) {
      pbsBtn.hidden = false;
      pbsBtn.dataset.id = entityId;
      const isProband = typeof getProbandId === 'function' && getProbandId() === entityId;
      pbsBtn.classList.toggle('proband-active', isProband);
      pbsBtn.title = isProband ? 'Ist Proband (klicken zum Zurücksetzen)' : 'Als Proband setzen';
    }
  } else if (tab === 'families') {
    const f = AppState.db.families[entityId];
    if (!f) return;
    if (top) top.textContent = 'Familie';
    if (editBtn) editBtn.style.display = '';
    const _famTreeTarget = f.husb || f.wife || null;
    if (treeBtn) {
      treeBtn.hidden = !_famTreeTarget;
      treeBtn.style.display = '';
      if (_famTreeTarget) treeBtn.dataset.id = _famTreeTarget;
    }
    if (tlBtn)   tlBtn.hidden = true;
    if (stBtn)   { stBtn.hidden = false; stBtn.dataset.action = 'showFamilyStory'; stBtn.dataset.fid = entityId; delete stBtn.dataset.id; }
    if (pbBtn)   pbBtn.hidden = true;
    if (pbsBtn)  pbsBtn.hidden = true;
    if (mapBtn)  mapBtn.hidden = true;
  } else if (tab === 'sources') {
    if (top) top.textContent = 'Quelle';
    if (editBtn) editBtn.style.display = '';
    if (treeBtn) treeBtn.hidden = true;
    if (tlBtn)   tlBtn.hidden = true;
    if (stBtn)   stBtn.hidden = true;
    if (pbBtn)   pbBtn.hidden = true;
    if (pbsBtn)  pbsBtn.hidden = true;
    if (mapBtn)  mapBtn.setAttribute('hidden', '');
  } else if (tab === 'places') {
    if (top) top.textContent = '📍 Ort';
    if (editBtn) editBtn.style.display = '';
    if (treeBtn) treeBtn.hidden = true;
    if (tlBtn)   tlBtn.hidden = true;
    if (stBtn)   stBtn.hidden = true;
    if (pbBtn)   pbBtn.hidden = true;
    if (pbsBtn)  pbsBtn.hidden = true;
    // detailMapBtn: kein expliziter Reset (showPlaceDetail-Verhalten unverändert)
  }
}

function _dcAlreadyShows(tab, entityId) {
  const cid = _DC_TAB_MAP[tab];
  if (!cid) return false;
  const el = document.getElementById(cid);
  if (!el || el.dataset.viewInit !== 'true') return false;
  if (el.dataset.currentId !== String(entityId)) return false;
  if ((UIState._dirty || {})[tab]) return false; // Daten geändert → immer neu rendern
  _activateDetailContainer(cid, entityId);
  // P6-B4: showDetail/showFamilyDetail/etc. rufen am Ende showView('v-detail') auf, was
  // body.has-detail setzt — der CSS-Schalter für den desktopPlaceholder. Im Skip-Pfad
  // entfällt dieser Aufruf, sodass der Placeholder oben im scrollbaren v-detail sichtbar
  // bleibt und das eigentliche Detail erst beim Runterscrollen erscheint.
  document.body.classList.add('has-detail');
  AppState._detailActive = true;
  // P6-B5: Detail-Toolbar auf den passenden Entity-Typ konfigurieren — sonst zeigt
  // TopTitle/Buttons noch den State der vorigen Entität (z.B. „Familie" über Personen-
  // Detail, storyBtn mit showFamilyStory + fid). Funktionale Fehlverdrahtung der
  // Toolbar-Klicks, nicht nur Kosmetikum.
  _configureDetailToolbar(tab, entityId);
  // Hist-Picker-Button-Zustand aktualisieren (analog showView('v-detail') desktop-Branch)
  if (typeof _updateDetailHistBtn === 'function') requestAnimationFrame(_updateDetailHistBtn);
  // P6-B3: Skip-Pfad muss die LINKE Liste trotzdem synchronisieren — andernfalls behält
  // die zuvor aktive Tab-Liste die .current-Klasse, und Scroll-Position zeigt nicht auf
  // den ausgewählten Eintrag. _activateDetailContainer kümmert sich nur um den Detail-
  // Container, nicht um die Listen-Highlight/Scroll-Synchronisation.
  if (tab === 'persons') {
    _updatePersonListCurrent(entityId);
    _updateFamilyListCurrent(null);
  } else if (tab === 'families') {
    _updateFamilyListCurrent(entityId);
    _updatePersonListCurrent(null);
  } else if (tab === 'sources') {
    _updateSourceListCurrent(entityId);
  } else if (tab === 'places') {
    _updatePlaceListCurrent(entityId);
  }
  return true;
}

function _desktopAutoSelect(tab) {
  if (!document.body.classList.contains('desktop-mode')) return;
  if (tab === 'persons') {
    const id = ViewState.getCurrent('persons') || smallestPersonId();
    if (id && !_dcAlreadyShows('persons', id)) showDetail(id, false);
  } else if (tab === 'families') {
    const id = ViewState.getCurrent('families') || _smallestId(AppState.db.families);
    if (id && !_dcAlreadyShows('families', id) && typeof showFamilyDetail === 'function') showFamilyDetail(id, false);
  } else if (tab === 'sources') {
    const id = ViewState.getCurrent('sources') || _smallestId(AppState.db.sources);
    if (id && !_dcAlreadyShows('sources', id) && typeof showSourceDetail === 'function') showSourceDetail(id, false);
  } else if (tab === 'places') {
    const places = typeof collectPlaces === 'function' ? collectPlaces() : null;
    const saved  = ViewState.getCurrent('places');
    const name   = (saved && places?.has(saved)) ? saved : _firstPlaceName();
    if (name && !_dcAlreadyShows('places', name) && typeof showPlaceDetail === 'function') showPlaceDetail(name, false);
  }
  // tasks / search / stats: kein Detail-View
}

// Startansicht nach Datei-Load: letzten gewählte Person (Fallback: Proband/kleinste ID)
async function showStartView() {
  AppState.currentTab = 'persons';
  // P6-B7: IDB-State VOR dem ersten Listen-Render laden (Details s. git-log).
  const [savedProband, savedSel] = await Promise.all([
    idbGet('proband_id').catch(() => null),
    idbGet('last_tab_sel').catch(() => null),
  ]);
  if (savedSel && typeof savedSel === 'object') UIState._lastTabSel = savedSel;
  UIState._probandId = (savedProband && AppState.db.individuals[savedProband]) ? savedProband : null;
  // Zuletzt gewählte Person hat Vorrang vor Probanden — App setzt dort fort wo der User
  // aufgehört hat. Proband / smallestPersonId dienen als Fallback ohne Vorauswahl.
  const startId = ViewState.getCurrent('persons') || getProbandId();
  if (startId) AppState.currentPersonId = startId;
  showMain();
  if (startId) showTree(startId);
}

// ─────────────────────────────────────
//  VIEW DISPATCH
// ─────────────────────────────────────
const _TAB_LABELS = { persons:'Personen', families:'Familien', sources:'Quellen', places:'Orte', stats:'Statistik', search:'Suche', tasks:'Aufgaben' };
function switchTab(tab) {
  AppState.currentTab = tab;
  _announceList(_TAB_LABELS[tab] || tab);
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
  // R2: VS-Teardown für inaktive Listen — Scroll-Listener-Leak verhindern
  if (tab !== 'persons'  && typeof _vsP !== 'undefined') _vsTeardown(_vsP);
  if (tab !== 'families' && typeof _vsF !== 'undefined') _vsTeardown(_vsF);
  // P3-A2: nur rendern wenn dirty oder noch nie für diesen Tab gerendert (undefined ≠ false).
  // Sonderfall: VS war aufgebaut (st.top vorhanden) aber Listener fehlt → _vsReattach
  // statt vollem Re-Render, damit Scroll-Position + Auswahl erhalten bleiben.
  if (tab === 'persons' && typeof _vsP !== 'undefined' && !_vsP.active && _vsP.top
      && (UIState._dirty || {}).persons === false) {
    // P6-B3: ViewState.getCurrent statt AppState.currentX — Letzteres wird durch
    // ViewState.setCurrent exklusiv genullt wenn ein anderer Tab aktiv war.
    _vsReattach(document.getElementById('personList'), _vsP, ViewState.getCurrent('persons'));
  } else if (tab === 'families' && typeof _vsF !== 'undefined' && !_vsF.active && _vsF.top
      && (UIState._dirty || {}).families === false) {
    _vsReattach(document.getElementById('familyList'), _vsF, ViewState.getCurrent('families'));
  } else if ((UIState._dirty || {})[tab] !== false) {
    renderTab();
    UIState._dirty = { ...(UIState._dirty || {}), [tab]: false };
  }
}

function renderTab() {
  if (!document.getElementById('v-main').classList.contains('active')) return;
  if (AppState.currentTab === 'persons') applyPersonFilter(); // respektiert aktive Such- und Jahresfilter
  else if (AppState.currentTab === 'families') renderFamilyList();
  else if (AppState.currentTab === 'sources') {
    if (document.getElementById('toggle-media')?.classList.contains('active')) showMediaSection();
    else if (document.getElementById('toggle-repos')?.classList.contains('active')) renderRepoList();
    else renderSourceList();
  }
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
    const canOD = typeof _odIsConnected === 'function' && _odIsConnected() && _odCurFileId;
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
  const canOD = typeof _odIsConnected === 'function' && _odIsConnected() && _odCurFileId;
  if (canOD) odSaveFile(); else exportGEDCOM();
}

function markChanged() {
  AppState.changed = true;
  UIState._placesCache = null;
  UIState._hofCache = null;
  UIState._searchIndexDirty = true;
  // P0-R5: Personenliste-Cache nach Edit invalidieren (sonst CSV-Export mit Vor-Edit-Stand)
  if (typeof _invalidatePersonListCache === 'function') _invalidatePersonListCache();
  // P3-A2: alle Daten-Tabs als dirty markieren → switchTab rendert bei nächstem Besuch
  UIState._dirty = { persons: true, families: true, sources: true, places: true };
  updateChangedIndicator();
}

function _setOfflineIndicator(offline) {
  const el = document.getElementById('offlineIndicator');
  if (el) el.hidden = !offline;
}

async function _checkCacheStatus() {
  if (!('caches' in window)) return;
  const keys = await caches.keys();
  if (!keys.some(k => k.startsWith('stammbaum-'))) {
    showToast('Cache fehlt — bitte einmal online öffnen für Offline-Funktion', 'warn');
  }
}

// Lifecycle-Handler → ausgelagert in ui-lifecycle.js (P3-A3)

function _initOfflineDiag() {
  if (!navigator.onLine) { _setOfflineIndicator(true); _checkCacheStatus(); }
  window.addEventListener('offline', () => {
    _setOfflineIndicator(true);
    showToast('Offline — App läuft aus dem Cache', 'warn');
  });
  window.addEventListener('online', () => {
    _setOfflineIndicator(false);
    showToast('Wieder online', 'success');
  });
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
  const showAllOnFocus = opts.showAllOnFocus ?? false;
  const useFixed = opts.useFixed ?? false;

  // Portal-Modus: Dropdown an body hängen + fixed positionieren (umgeht overflow-Clipping)
  if (useFixed && dd.parentElement !== document.body) {
    document.body.appendChild(dd);
    Object.assign(dd.style, { position: 'fixed', width: 'auto', margin: '0' });
  }

  const _reposition = () => {
    if (!useFixed) return;
    const r = input.getBoundingClientRect();
    const ddH = Math.min(180, dd.scrollHeight || 180);
    const spaceBelow = window.innerHeight - r.bottom;
    if (spaceBelow >= ddH || spaceBelow >= r.top) {
      dd.style.top  = (r.bottom + 2) + 'px';
      dd.style.bottom = 'auto';
    } else {
      dd.style.top  = 'auto';
      dd.style.bottom = (window.innerHeight - r.top + 2) + 'px';
    }
    dd.style.left  = r.left + 'px';
    dd.style.width = r.width + 'px';
  };

  const _hide = () => { dd.innerHTML = ''; dd.style.display = 'none'; };

  const _populate = q => {
    dd.innerHTML = '';
    const items = opts.getItems(q).slice(0, limit || 50);
    if (!items.length) { dd.style.display = 'none'; return; }
    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'place-dropdown-item';
      el.textContent = opts.formatLabel(item);
      if (opts.configEl) opts.configEl(el, item);
      el.addEventListener('mousedown', () => {
        opts.onSelect(item, input);
        _hide();
      });
      dd.appendChild(el);
    });
    dd.style.display = 'block';
    _reposition();
  };

  const _run = debounce(() => {
    const q = input.value.toLowerCase().trim();
    if (!q && !showAllOnFocus) { dd.style.display = 'none'; return; }
    _populate(q);
  }, 150);

  input.addEventListener('input', () => {
    opts.onInput?.(input);
    if (!input.value.trim() && !showAllOnFocus) { _hide(); return; }
    _run();
  });
  input.addEventListener('blur',  () => setTimeout(() => { dd.style.display = 'none'; }, 150));
  input.addEventListener('focus', () => {
    if (showAllOnFocus) { _populate(input.value.toLowerCase().trim()); }
    else if (dd.children.length) { dd.style.display = 'block'; _reposition(); }
  });
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

// Item 9: bevorzugt Event-Objekt (placeObjects als single source of truth via _eventCoords).
// Backwards-kompat: erste Signatur (lati, long) bleibt als Fallback.
function evGeoLink(arg1, arg2) {
  let lati, long;
  if (arg1 && typeof arg1 === 'object') {
    const c = (typeof _eventCoords === 'function') ? _eventCoords(arg1) : { lati: arg1.lati, long: arg1.long };
    lati = c.lati; long = c.long;
  } else {
    lati = arg1; long = arg2;
  }
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
      page || '',
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
    if (!s) return `<span class="src-badge src-badge--orphan" title="Quelle nicht vorhanden (${esc(c.sid || '?')}) — bitte in der Bearbeitungsansicht entfernen">⚠ ${esc(c.sid || '?')}</span>`;
    const page  = c.page || '';
    const quay  = c.quay != null ? String(c.quay) : '';
    const qClass = quay !== '' ? ` src-badge--q${quay}` : '';
    const pageSuffix = page && page.length <= 5 ? `·${page}` : '';
    const tipParts = [
      (s.title || s.abbr || c.sid).substring(0, 50),
      page || '',
      quay !== '' ? `Q${quay} – ${_QUAY_LABELS[quay] || quay}` : ''
    ].filter(Boolean);
    // Klickbarer ↗-Link: URL in PAGE (Altdaten) ODER in einem Zitat-Medium (OBJE/FILE)
    const isUrl    = /^https?:\/\//i.test(page);
    const mediaUrl = (c.media || []).map(m => m && m.file).find(f => /^https?:\/\//i.test(f || '')) || '';
    const linkHref = isUrl ? page : mediaUrl;
    const linkBtn = linkHref
      ? `<span class="src-badge-link" data-action="openCitLink" data-href="${esc(linkHref)}" title="${esc(linkHref)}">↗</span>`
      : '';
    return `<span class="src-badge${qClass}" data-action="showSourceDetail" data-sid="${c.sid}" title="${esc(tipParts.join(' · '))}">§${srcNum(c.sid)}${pageSuffix}</span>${linkBtn}`;
  }).filter(Boolean).join('');
}

// INDI-Level-Quellen (topSources + nameCitations) als Zitat-Badges, dedupliziert nach SID.
// URL ggf. aus topSourceExtra (OBJE/FILE-Passthrough) → wird über citTagsHtml als ↗ klickbar.
function topSourceCitsHtml(p) {
  const seen = new Set();
  const cits = [];
  for (const sid of (p?.topSources || [])) {
    if (seen.has(sid)) continue;
    seen.add(sid);
    const urls = (p.topSourceExtra?.[sid] || [])
      .map(l => (String(l).match(/\bhttps?:\/\/\S+/) || [])[0]).filter(Boolean);
    cits.push({ sid, page: p.topSourcePages?.[sid] || '', quay: p.topSourceQUAY?.[sid], media: urls.map(u => ({ file: u })) });
  }
  for (const c of (p?.nameCitations || [])) {
    if (!c?.sid || seen.has(c.sid)) continue;
    seen.add(c.sid);
    cits.push(c);
  }
  return citTagsHtml(cits);
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

// Periodenkorrekter, vollständiger Hierarchiestring für die Detail-Ansicht.
// Bei gesetzter placeId + modellierter enclosedBy-Kette: _buildFormString liefert
// "Ort, Amt, Land" periodengerecht. Nur nutzen wenn das Ergebnis tatsächlich eine
// Hierarchie enthält (Komma) — sonst ist die enclosedBy-Kette nicht modelliert und
// compactPlace(ev.place) liefert mehr Information.
function _evFullPlace(ev) {
  if (ev.placeId && typeof _buildFormString === 'function') {
    const year = typeof _placeYear === 'function' ? _placeYear(ev.date) : null;
    const full = _buildFormString(ev.placeId, year);
    if (full && full.includes(',')) return full;
    // Fallback bei Datengap: nächstgelegene Zugehörigkeit suchen
    if (year != null && typeof getPlaceRegistry === 'function') {
      const reg = getPlaceRegistry();
      const po  = reg?.byId[ev.placeId];
      const encs = po?.enclosedBy || [];
      if (encs.length) {
        const parseY = s => { const m = s && s.match(/\d{4}/); return m ? +m[0] : null; };
        // Kandidaten: Einträge mit mindestens einem Datum, nach Abstand zum Ereignisjahr sortiert
        const datable = encs.filter(e => e.dateFrom || e.dateTo);
        if (datable.length) {
          datable.sort((a, b) => {
            const dist = e => {
              const ef = parseY(e.dateFrom), et = parseY(e.dateTo);
              if (ef != null && et != null) return Math.min(Math.abs(year - ef), Math.abs(year - et));
              if (ef != null) return Math.abs(year - ef);
              if (et != null) return Math.abs(year - et);
              return Infinity;
            };
            return dist(a) - dist(b);
          });
          // Jahr des nächstgelegenen Eintrags als Referenzjahr
          const nearest = datable[0];
          const refY = parseY(nearest.dateFrom) ?? parseY(nearest.dateTo);
          const fallback = refY != null ? _buildFormString(ev.placeId, refY) : null;
          if (fallback && fallback.includes(',')) return fallback;
        }
      }
    }
  }
  return compactPlace(ev.place);
}

// Navigations-Button zur Orts-Detailansicht (🏘), nur wenn placeId gesetzt.
function _evPlaceNavBtn(ev) {
  if (!ev.placeId || typeof getPlaceRegistry !== 'function') return '';
  const reg = getPlaceRegistry();
  const po = reg && reg.byId[ev.placeId];
  if (!po) return '';
  return `<button class="place-nav-btn" data-action="showPlaceByTitle" data-title="${esc(po.title)}" title="Zur Ort-Ansicht">🏘</button>`;
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

