// ─────────────────────────────────────
//  HISTORY-NAVIGATION
//  Ausgelagert aus ui-views.js (REFACT-3, sw v697)
//  Abhängigkeiten: AppState, UIState, showDetail, showFamilyDetail,
//  showSourceDetail, showRepoDetail, showPlaceDetail, showTree,
//  showFanChart (ui-fanchart.js), showDescTree (ui-desc-tree.js),
//  showTimeline (ui-timeline.js), showStory (ui-story.js), showMain
// ─────────────────────────────────────
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
  else if (item.type === 'place')    showPlaceDetail(item.ref || item.name, false);
  else if (item.type === 'tree')     showTree(item.id, false);
  else if (item.type === 'fanchart') { if (typeof showFanChart  === 'function') showFanChart(item.id); }
  else if (item.type === 'desctree') { if (typeof showDescTree  === 'function') showDescTree(item.id, false); }
  else if (item.type === 'timeline') { if (typeof showTimeline  === 'function') showTimeline(item.id, false); }
  else if (item.type === 'story')    { if (typeof showStory     === 'function') showStory(item.id, false); }
  else showMain();
}

// ─── History-Navigation ───────────────────────────────────────────

// Aktuell angezeigte Entity als History-Eintrag (null = Listenansicht)
function _captureCurrentNavState() {
  if (document.getElementById('v-story')?.classList.contains('active') && UIState._storyPid)
    return { type: 'story', id: UIState._storyPid };
  if (document.getElementById('v-timeline')?.classList.contains('active') && UIState._timelinePid)
    return { type: 'timeline', id: UIState._timelinePid };
  if (AppState.currentPersonId) return { type: 'person', id: AppState.currentPersonId };
  if (AppState.currentFamilyId) return { type: 'family', id: AppState.currentFamilyId };
  if (AppState.currentSourceId) return { type: 'source', id: AppState.currentSourceId };
  if (AppState.currentRepoId)   return { type: 'repo',   id: AppState.currentRepoId };
  if (AppState._detailActive) {
    const title = document.getElementById('detailTopTitle')?.textContent;
    // Stufe 2b: Identitäts-Ref mitführen → Back/Forward öffnet bei gleichnamigen
    // Orten (Stadt vs. Kreis) wieder das richtige Detail.
    if (title) return { type: 'place', name: title, ref: AppState.currentPlaceRef || title };
  }
  if (document.getElementById('v-tree')?.classList.contains('active') && currentTreeId) {
    const _ttype = document.body.classList.contains('fc-mode')       ? 'fanchart'  :
                   document.body.classList.contains('desc-tree-mode') ? 'desctree' : 'tree';
    return { type: _ttype, id: currentTreeId };
  }
  return null;
}

// R3: navHistory auf max. 50 Einträge begrenzen (älteste entfernen)
const _NAV_HISTORY_CAP = 50;
function _navHistoryCap() {
  if (UIState._navHistory.length > _NAV_HISTORY_CAP)
    UIState._navHistory.splice(0, UIState._navHistory.length - _NAV_HISTORY_CAP);
}

// Muss am Anfang jeder showDetail/showFamilyDetail/showSourceDetail/showPlaceDetail stehen.
function _beforeDetailNavigate() {
  if (AppState._detailActive) {
    // Detail → Detail: aktuellen Zustand in Back-Stack sichern, Fwd-Stack leeren
    const cur = _captureCurrentNavState();
    if (cur) UIState._navHistory.push(cur);
    UIState._navFwdStack = [];
    _navHistoryCap();
  } else if (document.getElementById('v-tree').classList.contains('active') && currentTreeId) {
    // Baum → Detail
    const _type = document.body.classList.contains('fc-mode')       ? 'fanchart'  :
                  document.body.classList.contains('desc-tree-mode') ? 'desctree' : 'tree';
    UIState._navHistory.push({ type: _type, id: currentTreeId });
    UIState._navFwdStack = [];
    _navHistoryCap();
  } else if (document.getElementById('v-story')?.classList.contains('active') && UIState._storyPid) {
    // Story → Detail
    UIState._navHistory.push({ type: 'story', id: UIState._storyPid });
    UIState._navFwdStack = [];
    _navHistoryCap();
  } else if (document.getElementById('v-timeline')?.classList.contains('active') && UIState._timelinePid) {
    // Zeitleiste → Detail
    UIState._navHistory.push({ type: 'timeline', id: UIState._timelinePid });
    UIState._navFwdStack = [];
    _navHistoryCap();
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
  const n = UIState._navHistory.length;
  const tlBack = document.getElementById('tlBtnBack');
  const tlHist = document.getElementById('tlHistBtn');
  const tlFwd  = document.getElementById('tlBtnFwd');
  if (tlBack) tlBack.hidden = n <= 0;
  if (tlHist) tlHist.hidden = n < 2;
  if (tlFwd)  tlFwd.hidden  = UIState._navFwdStack.length === 0;
  const stBack = document.getElementById('storyBtnBack');
  const stHist = document.getElementById('storyHistBtn');
  const stFwd  = document.getElementById('storyBtnFwd');
  if (stBack) stBack.hidden = n <= 0;
  if (stHist) stHist.hidden = n < 2;
  if (stFwd)  stFwd.hidden  = UIState._navFwdStack.length === 0;
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

