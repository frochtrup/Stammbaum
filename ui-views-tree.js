// ─────────────────────────────────────
//  BAUM: TASTATURNAVIGATION
// ─────────────────────────────────────
let _treeNavTargets = {};
let _treeKeyInit = false;
let _treeZoomScale = 1;
let _treeGenCount    = 5;  // aktiver Wert (wird je nach Orientierung gesetzt)
let _treeGenPortrait = 3;  // letzter Portrait-Wert  (Standard: 3 = +Großeltern)
let _treeGenLandscape= 5;  // letzter Landscape-Wert (Standard: 5 = +Ur²Gr.)

function setTreeGens(n) {
  _treeGenCount = Math.max(2, Math.min(9, n));
  const ip = window.innerWidth < window.innerHeight;
  if (ip) _treeGenPortrait  = _treeGenCount;
  else    _treeGenLandscape = _treeGenCount;
  document.querySelectorAll('[data-tgen]').forEach(b =>
    b.classList.toggle('active', +b.dataset.tgen === _treeGenCount));
  _treeZoomScale = 1; // Reset damit Auto-Fit neu kalkuliert
  if (AppState.currentPersonId) showTree(AppState.currentPersonId, false);
}

function _navTreeFn(id) {
  if (document.body.classList.contains('desc-tree-mode') && typeof showDescTree === 'function')
    showDescTree(id);
  else
    showTree(id);
}

function _initTreeKeys() {
  if (_treeKeyInit) return;
  _treeKeyInit = true;
  document.addEventListener('keydown', e => {
    if (e.repeat) return;  // key auto-repeat ignorieren
    if (!document.getElementById('v-tree')?.classList.contains('active')) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
    const t = _treeNavTargets;
    if (e.key === 'ArrowUp')    { e.preventDefault(); const id = e.shiftKey ? t.up2 : t.up; if (id) _navTreeFn(id); }
    if (e.key === 'ArrowDown')  { e.preventDefault(); if (t.down)  _navTreeFn(t.down); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); treeNavBack(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); if (t.right) _navTreeFn(t.right); }
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
    _updateTopbarH();
    clearTimeout(_treeResizeTimer);
    _treeResizeTimer = setTimeout(() => {
      const id = currentTreeId || AppState.currentPersonId;
      if (!id) return;
      if (!document.getElementById('v-tree')?.classList.contains('active')) return;
      if (document.body.classList.contains('fc-mode') && typeof showFanChart === 'function')
        showFanChart(id);
      else if (document.body.classList.contains('desc-tree-mode') && typeof showDescTree === 'function')
        showDescTree(id, false);
      else
        showTree(id, false);
    }, 250);
  });

  // Pinch-to-Zoom (Touch, 2 Finger)
  let _pinchStartDist = 0, _pinchStartScale = 1, _pinchRafPending = false;
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
    if (!_pinchRafPending) {
      _pinchRafPending = true;
      requestAnimationFrame(() => {
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
        _pinchRafPending = false;
      });
    }
    e.preventDefault();
  }, { passive: false });

  sc.addEventListener('touchend', e => { if (e.touches.length < 2) _pinchStartDist = 0; });
}

// ─────────────────────────────────────
//  DETAIL-ANSICHT: SWIPE-GESTEN
// ─────────────────────────────────────
let _swipeInit = false;

function _initDetailSwipe() {
  if (_swipeInit) return;
  _swipeInit = true;
  const view = document.getElementById('v-detail');
  if (!view) return;

  let startX = 0, startY = 0, startTime = 0;
  let tracking = false;

  view.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) { tracking = false; return; }
    // Kein Swipe wenn Modal offen ist
    if (document.querySelector('.modal-overlay.open')) { tracking = false; return; }
    startX    = e.touches[0].clientX;
    startY    = e.touches[0].clientY;
    startTime = Date.now();
    tracking  = true;
    view.style.transition = 'none';
  }, { passive: true });

  view.addEventListener('touchmove', e => {
    if (!tracking || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    // Nur horizontale Swipes verfolgen (kein Konflikt mit vertikalem Scrollen)
    if (Math.abs(dy) > Math.abs(dx) * 0.8 && Math.abs(dx) < 20) { tracking = false; return; }
    // Nur Swipe-Right (zurück) mit visuellem Feedback
    if (dx > 0) {
      view.style.transform = `translateX(${Math.min(dx * 0.5, 80)}px)`;
    }
  }, { passive: true });

  view.addEventListener('touchend', e => {
    if (!tracking) return;
    tracking = false;
    const dx       = e.changedTouches[0].clientX - startX;
    const dy       = e.changedTouches[0].clientY - startY;
    const elapsed  = Date.now() - startTime;
    const isSwipeRight = dx > 60 && Math.abs(dx) > Math.abs(dy) * 1.2 && elapsed < 400;

    view.style.transition = 'transform 0.2s ease';
    view.style.transform  = '';
    // Transition nach Animation aufräumen
    view.addEventListener('transitionend', () => { view.style.transition = ''; }, { once: true });

    if (isSwipeRight) goBack();
  }, { passive: true });
}

function toggleTreeFullscreen() {
  const isFs = document.body.classList.toggle('tree-fullscreen');
  const btn = document.getElementById('treeFsBtn');
  if (btn) {
    btn.textContent = isFs ? '⤡' : '⤢';
    btn.title = isFs ? 'Sidebar einblenden' : 'Vollbild';
  }
  const pid = AppState.currentPersonId;
  if (!pid) return;
  _afterLayout(() => {
    if (document.body.classList.contains('fc-mode') && typeof showFanChart === 'function')
      showFanChart(pid);
    else if (document.body.classList.contains('desc-tree-mode') && typeof showDescTree === 'function')
      showDescTree(pid, false);
    else
      showTree(pid, false);
  });
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

async function openMediaPhoto(filePath, heroElemId, avatarElemId) {
  if (!filePath) { showToast('Kein Foto vorhanden'); return; }
  const src = await _odGetMediaUrlByPath(filePath).catch(() => null)
           || await idbGet('img:' + filePath).catch(() => null);
  if (!src) { showToast('Foto nicht ladbar'); return; }
  showLightbox(src, null, heroElemId, avatarElemId, null);
}

async function _lightboxSetHero() {
  if (!_lbHeroKey) return;
  const src = document.getElementById('lightboxImg').src;
  await idbPut(_lbHeroKey, src).catch(() => {});
  const el = document.getElementById(_lbHeroElemId);
  if (el) {
    el.style.display = 'block';
    el.innerHTML = `<img src="${src}" alt="Foto" data-action="showLightbox" class="tree-photo-img">`;
  }
  if (_lbAvatarElemId) {
    const av = document.getElementById(_lbAvatarElemId);
    if (av) av.style.display = 'none';
  }
  document.getElementById('lightboxSetHero').style.display = 'none';
  showToast('Hauptfoto gesetzt');
}

// ─────────────────────────────────────
//  STAMMBAUM-ANSICHT (SANDUHR)
// ─────────────────────────────────────
function getParentIds(pid) {
  const p = AppState.db.individuals[pid];
  if (!p?.famc?.length) return { father: null, mother: null };
  const ref   = p.famc[0];
  const famId = typeof ref === 'string' ? ref : ref.famId;
  const fam   = AppState.db.families[famId];
  return { father: fam?.husb || null, mother: fam?.wife || null };
}

function getChildIds(pid) {
  const p = AppState.db.individuals[pid];
  if (!p) return [];
  return (p.fams || []).flatMap(famId => AppState.db.families[famId]?.children || []);
}

let currentTreeId = null;

function _updateTreeBackBtn() {
  const btn  = document.getElementById('treeBtnBack');
  const hist = document.getElementById('treeHistBtn');
  const fwd  = document.getElementById('treeBtnFwd');
  const n = UIState._navHistory.length;
  if (btn)  btn.hidden  = n <= 0;
  if (hist) hist.hidden = n < 2;
  if (fwd)  fwd.hidden  = UIState._navFwdStack.length === 0;
}

// "←" — immer 1 Schritt direkt zurück (unified history)
function treeNavBack() {
  goBack();
}

// "▾" — Picker mit vollständigem Verlauf (unified history)
function openTreeHistory() {
  const hist = UIState._navHistory;
  if (!hist.length) return;
  const btn = document.getElementById('treeHistBtn');
  const items = [...hist].reverse().map((item, i) => ({
    label: _historyItemLabel(item),
    data:  { actualIdx: hist.length - 1 - i, item }
  }));
  _showHistoryPicker(btn, items, (idx, data) => {
    if (!data) return;
    hist.splice(data.actualIdx);
    _navToHistoryItem(data.item);
    _updateTreeBackBtn();
  }, null);
}

// Kürzt lange Namen im Baum: Vornamen → Initiale(n), Nachname bleibt
function _treeShortName(p, isCenter) {
  const nm = p.name || p.id || '';
  const limit = isCenter ? 26 : 22;
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

// Gibt HTML für den Kartennamen zurück — Rufname wird unterstrichen
function _treeNameHtml(p, isCenter) {
  const nm = _treeShortName(p, isCenter);
  const rufname = p._rufname || p._grampsCall || '';
  if (!rufname) return esc(nm);
  // Rufname-Wort im Anzeigenamen suchen (Wortgrenze, case-insensitive)
  const escaped = esc(rufname);
  const re = new RegExp('(^|\\s)(' + rufname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(\\s|$)', 'i');
  const match = nm.match(re);
  if (!match) return esc(nm);
  const idx = match.index + match[1].length;
  const len = match[2].length;
  return esc(nm.slice(0, idx)) + '<u>' + esc(nm.slice(idx, idx + len)) + '</u>' + esc(nm.slice(idx + len));
}

function showTree(personId, addToHistory = true) {
  const p = AppState.db.individuals[personId];
  if (!p) return;
  AppState.currentPersonId = personId;
  currentTreeId   = personId;

  // ── Navigations-History ──
  if (addToHistory && currentTreeId && currentTreeId !== personId) {
    const _type = document.body.classList.contains('fc-mode') ? 'fanchart' : 'tree';
    UIState._navHistory.push({ type: _type, id: currentTreeId });
  }
  _updateTreeBackBtn();
  setBnavActive('tree');
  // Zoom-Scale sanieren (kann durch frühen Aufruf auf 0 gesetzt worden sein)
  if (_treeZoomScale <= 0) _treeZoomScale = 1;
  // Fan Chart + Nachkommen-Baum deaktivieren, Toggle-Buttons zurücksetzen
  document.body.classList.remove('fc-mode', 'desc-tree-mode');
  document.body.classList.add('tree-active');
  const _fcTb = document.getElementById('treeFcToggle');
  if (_fcTb) { _fcTb.style.display = 'inline-flex'; _fcTb.textContent = '◠'; _fcTb.title = 'Fächer-Diagramm'; }
  const _dtTb = document.getElementById('treeDescToggle');
  if (_dtTb) { _dtTb.textContent = '⇩'; _dtTb.title = 'Nachkommen-Baum'; }
  if (document.body.classList.contains('desktop-mode')) _updatePersonListCurrent(personId);

  // ── Orientierung + Dimensionen ──
  const isPortrait = window.innerWidth < window.innerHeight;
  if (isPortrait) _treeZoomScale = 1; // Portrait: kein Zoom, kompaktes Layout
  // Orientierungsabhängigen Default anwenden (Portrait=3, Landscape=5)
  const _orientGen = isPortrait ? _treeGenPortrait : _treeGenLandscape;
  if (_orientGen !== _treeGenCount) _treeGenCount = _orientGen;
  document.querySelectorAll('[data-tgen]').forEach(b =>
    b.classList.toggle('active', +b.dataset.tgen === _treeGenCount));

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

  // ── Kekule-Nummern (relativ zum Probanden; Proband=1, Vater=2, Mutter=3, …) ──
  const kekuleMap = {};
  {
    const _kWalk = (id, k, depth) => {
      if (!id || depth > 8 || !AppState.db.individuals[id] || kekuleMap[id]) return;
      kekuleMap[id] = k;
      const { father, mother } = getParentIds(id);
      _kWalk(father, k * 2,     depth + 1);
      _kWalk(mother, k * 2 + 1, depth + 1);
    };
    _kWalk(getProbandId(), 1, 0);
  }
  const kbadge = id => {
    const k = id && kekuleMap[id];
    return k ? `<div class="tree-kekule-badge" title="Kekule-Nr. ${k} (Proband = 1)">${k}</div>` : '';
  };

  // ── Vorfahren (4 Ebenen; Hochformat: max. 2 Ebenen) ──
  function _gp(id) { return id ? getParentIds(id) : { father: null, mother: null }; }
  const par0 = getParentIds(personId);
  const anc1 = [par0.father, par0.mother];                                         // 2
  const anc2 = anc1.flatMap(id => { const q = _gp(id); return [q.father, q.mother]; });  // 4
  const anc3 = anc2.flatMap(id => { const q = _gp(id); return [q.father, q.mother]; });  // 8
  const anc4 = anc3.flatMap(id => { const q = _gp(id); return [q.father, q.mother]; });  // 16
  const anc5 = anc4.flatMap(id => { const q = _gp(id); return [q.father, q.mother]; });  // 32
  const anc6 = anc5.flatMap(id => { const q = _gp(id); return [q.father, q.mother]; });  // 64
  const anc7 = anc6.flatMap(id => { const q = _gp(id); return [q.father, q.mother]; });  // 128
  const anc8 = anc7.flatMap(id => { const q = _gp(id); return [q.father, q.mother]; });  // 256

  // ── Geschwister (aus erster Elternfamilie) ──
  const sibFamRef = p.famc && p.famc.length > 0 ? p.famc[0] : null;
  const sibFamId  = sibFamRef ? (typeof sibFamRef === 'string' ? sibFamRef : sibFamRef.famId) : null;
  const siblings  = sibFamId
    ? (AppState.db.families[sibFamId]?.children || []).filter(id => id !== personId)
    : [];
  const nSibs = siblings.length;

  // ── Alle Ehen / Familien ──
  const allFamilies = (p.fams || []).map(famId => {
    const fam = AppState.db.families[famId];
    if (!fam) return null;
    const spId = personId === fam.husb ? (fam.wife || null)
               : personId === fam.wife ? (fam.husb || null)
               : null;
    return { famId, spId, kids: _sortedChildren(fam.children) };
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
  const nSp = allFamilies.filter(f => f.spId).length;
  // ancSpan: nur so breit wie die tiefste belegte Vorfahren-Ebene
  // _treeGenCount = Generationen gesamt inkl. Proband (2..9); scrollt horizontal
  const _maxAnc = _treeGenCount - 1;  // max. Ahnen-Ebenen (1..8)
  const hasAnc8 = _maxAnc >= 8 && anc8.some(Boolean);
  const hasAnc7 = _maxAnc >= 7 && anc7.some(Boolean);
  const hasAnc6 = _maxAnc >= 6 && anc6.some(Boolean);
  const hasAnc5 = _maxAnc >= 5 && anc5.some(Boolean);
  const hasAnc4 = _maxAnc >= 4 && anc4.some(Boolean);
  const hasAnc3 = _maxAnc >= 3 && anc3.some(Boolean);
  const ancLevels = hasAnc8 ? 8 : hasAnc7 ? 7 : hasAnc6 ? 6 : hasAnc5 ? 5 : hasAnc4 ? 4 : hasAnc3 ? 3 : _maxAnc >= 2 ? 2 : 1;
  const ancSlots  = hasAnc8 ? 256 : hasAnc7 ? 128 : hasAnc6 ? 64 : hasAnc5 ? 32 : hasAnc4 ? 16 : hasAnc3 ? 8 : ancLevels >= 2 ? 4 : 2;
  const ancSpan = ancSlots * SLOT;
  const personCX = Math.max(PAD + CW / 2, PAD + ancSpan / 2);
  const personX  = personCX - CW / 2;

  // ── Geschwister: horizontal links wenn ≥3 Ahnen-Ebenen, sonst Peek-Stapel ──
  const MIN_SIB_W    = isPortrait ? 52 : 60;
  const useHorizSibs = nSibs > 0 && ancLevels >= 3;
  const availSibW    = personX - PAD - SIB_GAP;
  const sibCardW     = useHorizSibs && availSibW > 0
    ? Math.max(MIN_SIB_W, Math.min(W, Math.floor((availSibW - Math.max(0, nSibs - 1) * SIB_GAP) / nSibs)))
    : W;
  const nFit    = useHorizSibs ? Math.min(nSibs, Math.max(0, Math.floor((availSibW + SIB_GAP) / (sibCardW + SIB_GAP)))) : nSibs;
  const nHidden = nSibs - nFit;

  // Ehepartner: immer horizontal rechts
  const spousesW  = nSp > 0 ? nSp * (W + MGAP) : 0;
  const rightEdge = personCX + CW / 2 + spousesW + PAD;
  const childMaxCols = childRows.length > 0 ? Math.max(...childRows.map(r => r.length)) : 0;
  const totalW = Math.max(personCX + ancSpan / 2 + PAD, rightEdge, personCX + childMaxCols * SLOT / 2 + PAD);

  // ── Y-Positionen: Zeile 0 (Zentrum) ──
  const baseY = PAD + ancLevels * ROW;
  function ry(lv) { return lv <= 0 ? baseY + lv * ROW : baseY + CH + VGAP + (lv - 1) * ROW; }

  // Geschwister + Ehepartner in gleicher Zeile → kein Stapel nach unten
  const sibStackH  = useHorizSibs ? 0 : (nSibs > 0 ? H + (nSibs - 1) * PEEK : 0);
  const row0Bottom = Math.max(ry(0) + CH, ry(0) + sibStackH);
  const childStartY = row0Bottom + VGAP;
  const totalH = childRows.length > 0
    ? childStartY + childRows.length * ROW - VGAP + PAD
    : row0Bottom + PAD;

  // ── X: Vorfahren — dynamische Positionsfunktionen für beliebig viele Ebenen ──
  // _lCX[0] = deepste Ebene (ancSlots Slots), _lCX[k] = k Ebenen höher (ancSlots/2^k Slots)
  const ancLeft = personCX - ancSpan / 2;
  const _lCX = [];
  _lCX[0] = i => ancLeft + (i + 0.5) * SLOT;
  for (let _k = 1; _k < ancLevels; _k++) {
    const _prev = _lCX[_k - 1];
    _lCX[_k] = i => (_prev(i * 2) + _prev(i * 2 + 1)) / 2;
  }
  // aXFn(d): linke Kante für Tiefe d (1=Eltern, ancLevels=tiefste Ebene)
  function aXFn (d) { return i => _lCX[ancLevels - d](i) - W / 2; }
  function aCXFn(d) { return _lCX[ancLevels - d]; }

  // ── X/Y: Geschwister ──
  const sibY        = ry(0) + Math.round((CH - H) / 2);  // vertikal zentriert auf Proband
  const sibRowW     = nFit > 0 ? nFit * sibCardW + Math.max(0, nFit - 1) * SIB_GAP : 0;
  const sibRowStartX = personX - SIB_GAP - sibRowW;
  function sibX(i)  { return sibRowStartX + i * (sibCardW + SIB_GAP); }
  function sibCX(i) { return sibX(i) + sibCardW / 2; }
  // Fallback-Variablen für useHorizSibs=false (Peek-Stapel)
  const sibColX  = personX - SIB_GAP - W;
  const sibColCX = sibColX + W / 2;
  function sibMidY(i) { return ry(0) + i * PEEK + H / 2; }

  // ── X/Y: Ehepartner (horizontal rechts) ──
  const spColX = personX + CW + MGAP;

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
  wrap.querySelectorAll('.tree-card, .tree-marr-btn, .tree-sib-more').forEach(el => el.remove());
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
    return el;
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

  function mkCard(id, x, y, isCenter, isHalf = false, zidx = null, isPeek = false, onClick = null, extraBadge = '', customW = null) {
    const div = document.createElement('div');
    div.className = 'tree-card' +
      (isCenter ? ' tree-card-center' : '') +
      (isHalf   ? ' tree-card-half'   : '') +
      (isPeek   ? ' tree-card-peek'   : '');
    div.style.left = Math.round(x) + 'px';
    div.style.top  = Math.round(y) + 'px';
    if (zidx !== null) div.style.zIndex = zidx;
    div.style.width  = (customW !== null ? customW : isCenter ? CW : W) + 'px';
    div.style.height = (isCenter ? CH : H) + 'px';
    if (!id) {
      div.classList.add('tree-card-empty');
      div.innerHTML = '<span class="tree-card-unknown">?</span>';
      if (onClick) div.addEventListener('click', onClick);
      wrap.appendChild(div);
      return;
    }
    const q = AppState.db.individuals[id];
    if (!q) return;
    div.dataset.sex = q.sex || 'U';
    const _compl = _personCompleteness(q);
    if (_compl.level) div.dataset.completeness = _compl.level;
    const by   = (q.birth?.date || '').replace(/.*(\d{4}).*/, '$1');
    const dy   = (q.death?.date || '').replace(/.*(\d{4}).*/, '$1');
    const yr   = [by ? '*' + by : '', dy ? '†' + dy : ''].filter(Boolean).join(' ');
    const fullName = [q.given, q.surname].filter(Boolean).join(' ') || q.name || '(unbekannt)';
    const sexLabel = q.sex === 'M' ? ', Mann' : q.sex === 'F' ? ', Frau' : '';
    const complHint = _compl.labels.length ? '\n⚠ Fehlend: ' + _compl.labels.join(', ') : '';
    div.title = fullName + sexLabel + (yr ? ' ' + yr : '') + complHint;
    div.setAttribute('aria-label', _treeShortName(q, isCenter) + sexLabel + (yr ? ', ' + yr : ''));
    const multiMarr = isCenter && spouseFamsEarly.length > 1;
    div.innerHTML =
      `<div class="tree-name">${_treeNameHtml(q, isCenter)}</div>` +
      (yr ? `<div class="tree-yr${isPortrait ? ' tree-yr--portrait' : ''}">${yr}</div>` : '') +
      (isHalf ? `<div class="tree-half-badge">½</div>` : '') +
      (multiMarr ? `<div class="tree-half-badge tree-half-badge--right">⚭ ${spouseFamsEarly.length}</div>` : '') +
      extraBadge;
    div.addEventListener('click', onClick !== null ? onClick : (isCenter ? () => showDetail(id) : () => showTree(id)));
    wrap.appendChild(div);
  }

  // ── Ahnen-Ebenen ancLevels..2 (generisch für 2–5 Ebenen) ──
  const _ancArrays = [null, anc1, anc2, anc3, anc4, anc5, anc6, anc7, anc8];
  for (let _d = ancLevels; _d >= 2; _d--) {
    _ancArrays[_d].forEach((id, i) => {
      if (!id && _d >= 3) return;  // tiefe Ebenen: leere Slots überspringen
      mkCard(id, aXFn(_d)(i), ry(-_d), false, false, null, false, null, kbadge(id));
      if (id) line(aCXFn(_d)(i), ry(-_d) + H, aCXFn(_d - 1)(Math.floor(i / 2)), ry(-(_d - 1)));
    });
  }

  // ── Eltern ──
  anc1.forEach((id, i) => {
    const sexHint = i === 0 ? 'M' : 'F';
    const emptyClick = !id ? () => {
      UIState._relAnchorId = personId;
      UIState._pendingRelation = { mode: 'parent', anchorId: personId };
      showPersonForm(null);
      const sexEl = document.getElementById('pf-sex');
      if (sexEl) sexEl.value = sexHint;
    } : null;
    mkCard(id, aXFn(1)(i), ry(-1), false, false, null, false, emptyClick, kbadge(id));
  });

  // ── Eltern → Kinder: symmetrischer Verzweigungspunkt bei personCX ──
  if (anc1[0] || anc1[1] || nSibs > 0) {
    const juncX = personCX;
    const juncY = ry(-1) + H + Math.round(VGAP * 0.4);
    if (anc1[0]) line(aCXFn(1)(0), ry(-1) + H, juncX, juncY);
    if (anc1[1]) line(aCXFn(1)(1), ry(-1) + H, juncX, juncY);
    line(juncX, juncY, personCX, ry(0));
    if (nSibs > 0) {
      if (useHorizSibs && nFit > 0) {
        // Horizontaler T-Balken von linkster Geschwister-Mitte bis personCX
        svgLine(sibCX(0), juncY, personCX, juncY).dataset.role = 'sib-h';
        // Kurze Vertikale von T-Balken zur Oberkante jeder Geschwister-Karte
        for (let _si = 0; _si < nFit; _si++)
          svgLine(sibCX(_si), juncY, sibCX(_si), sibY).dataset.role = 'sib-drop';
      } else {
        // Fallback: Peek-Stapel (wenige Generationen)
        svgLine(juncX, juncY, sibColCX, juncY).dataset.role = 'sib-h';
        svgLine(sibColCX, juncY, sibColCX, sibMidY(nSibs - 1)).dataset.role = 'sib-v';
      }
    }
  }

  // ── Geschwister ──
  if (useHorizSibs) {
    siblings.slice(0, nFit).forEach((sid, i) => {
      mkCard(sid, sibX(i), sibY, false, false, null, false, null, kbadge(sid), sibCardW);
    });
    // „…"-Indikator wenn Geschwister nicht alle dargestellt werden können
    if (nHidden > 0) {
      const morW = isPortrait ? 22 : 26;
      const morX = nFit > 0
        ? Math.max(PAD, sibRowStartX - 4 - morW)
        : personX - SIB_GAP - morW;
      const morEl = document.createElement('div');
      morEl.className = 'tree-sib-more';
      morEl.style.left   = Math.round(morX) + 'px';
      morEl.style.top    = Math.round(sibY)  + 'px';
      morEl.style.width  = morW + 'px';
      morEl.style.height = H   + 'px';
      morEl.title = `+${nHidden} Geschwister nicht dargestellt`;
      morEl.textContent = '…';
      wrap.appendChild(morEl);
    }
  } else {
    // Fallback: Peek-Stapel
    siblings.forEach((sid, i) => {
      const y = ry(0) + i * PEEK;
      const z = nSibs - i + 5;
      const badge = (i === 0 && nSibs > 1)
        ? `<div class="tree-half-badge tree-half-badge--sib">${nSibs}</div>`
        : '';
      mkCard(sid, sibColX, y, false, false, z, i > 0, null, badge + kbadge(sid));
    });
  }

  // ── Zentrumsperson ──
  mkCard(personId, personX, ry(0), true, false, null, false, null, kbadge(personId));

  // ── Ehepartner: horizontal rechts ──
  // Aktiver Ehepartner (Index aus _activeSpouseMap) steht links (nächste am Probanden).
  // Inaktive Ehepartner stehen daneben; Klick macht sie aktiv.
  const spouseFams  = spouseFamsEarly;
  const activeSpIdx = activeSpIdxEarly;
  const orderedSp   = spouseFams.length > 0
    ? [spouseFams[activeSpIdx], ...spouseFams.filter((_, i) => i !== activeSpIdx)]
    : [];
  const spouseBaseY = ry(0) + Math.round((CH - H) / 2);
  orderedSp.forEach((fam, displayIdx) => {
    const origIdx  = spouseFams.indexOf(fam);
    const isActive = displayIdx === 0;
    const spX      = spColX + displayIdx * (W + MGAP);
    const onClick  = isActive
      ? () => showTree(fam.spId)
      : () => { _activeSpouseMap[personId] = origIdx; showTree(personId, false); };
    mkCard(fam.spId, spX, spouseBaseY, false, false, null, !isActive, onClick, kbadge(fam.spId));
    if (isActive) {
      svgLine(personX + CW, ry(0) + CH / 2, spX, spouseBaseY + H / 2, 'var(--gold)', '5 3').dataset.role = 'spouse-active';
      // Klickbares div-Element auf der Ehe-Linie (SVG hat pointer-events:none)
      const lineY = ry(0) + CH / 2;
      const btn   = document.createElement('div');
      btn.className = 'tree-marr-btn';
      btn.style.cssText = `position:absolute;left:${Math.round(personX + CW)}px;top:${Math.round(lineY - 12)}px;width:${Math.round(spX - personX - CW)}px;height:24px;cursor:pointer;z-index:6;display:flex;align-items:center;justify-content:center`;
      btn.title = 'Familie öffnen';
      btn.innerHTML = `<span class="tree-marr-badge">⚭</span>`;
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
      mkCard(id, childRowX(row, i), rowY, false, isHalf, null, false, null, kbadge(id));
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
  // Auto-Zentrierung: nach Browser-Layout (2×rAF statt magic-number setTimeout)
  _afterLayout(() => {
    const sc = document.getElementById('treeScroll');
    // Desktop: Auto-Fit wenn Baum breiter oder höher als Viewport
    // Guard: Scroll-Container muss messbare Dimensionen haben
    if (_treeZoomScale <= 0) _treeZoomScale = 1;
    if (!isPortrait && sc.clientWidth > 0 && sc.clientHeight > 0) {
      const fitW = sc.clientWidth  / totalW;
      const fitH = sc.clientHeight / totalH;
      const fit  = Math.min(1, fitW, fitH);
      if (fit > 0 && (fit < _treeZoomScale || (_treeZoomScale === 1 && fit < 1))) {
        _treeZoomScale = Math.round(fit * 100) / 100;
        wrap.style.transform = `scale(${_treeZoomScale})`;
        wrap.style.transformOrigin = '0 0';
        if (scaleWrap) {
          scaleWrap.style.width  = Math.round(totalW * _treeZoomScale) + 'px';
          scaleWrap.style.height = Math.round(totalH * _treeZoomScale) + 'px';
        }
      }
    }
    if (sc.clientWidth > 0 && sc.clientHeight > 0) {
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
    }
  }, 60);
}
