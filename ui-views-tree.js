// ─────────────────────────────────────
//  BAUM: TASTATURNAVIGATION
// ─────────────────────────────────────
let _treeNavTargets = {};
let _treeKeyInit = false;
let _treeZoomScale = 1;
let _treeGenCount = 5;  // Generationen gesamt inkl. Proband: 2=Eltern, 3=+Gr., 4=+UrGr., 5=+Ur²Gr.(Standard), 6=+Ur³Gr.

function setTreeGens(n) {
  _treeGenCount = Math.max(2, Math.min(6, n));
  document.querySelectorAll('[data-tgen]').forEach(b =>
    b.classList.toggle('active', +b.dataset.tgen === _treeGenCount));
  _treeZoomScale = 1; // Reset damit Auto-Fit neu kalkuliert
  if (AppState.currentPersonId) showTree(AppState.currentPersonId, false);
}

function _initTreeKeys() {
  if (_treeKeyInit) return;
  _treeKeyInit = true;
  document.addEventListener('keydown', e => {
    if (e.repeat) return;  // key auto-repeat ignorieren
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
    _updateTopbarH();
    clearTimeout(_treeResizeTimer);
    _treeResizeTimer = setTimeout(() => {
      const id = UIState._treeHistory[UIState._treeHistoryPos];
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
  const btn = document.getElementById('treeBtnBack');
  if (btn) btn.style.display = UIState._treeHistoryPos > 0 ? '' : 'none';
}

function treeNavBack() {
  if (UIState._treeHistoryPos <= 0) return;
  UIState._treeHistoryPos--;
  showTree(UIState._treeHistory[UIState._treeHistoryPos], false);
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
  const p = AppState.db.individuals[personId];
  if (!p) return;
  AppState.currentPersonId = personId;
  currentTreeId   = personId;

  // ── Navigations-History ──
  if (addToHistory) {
    UIState._treeHistory = UIState._treeHistory.slice(0, UIState._treeHistoryPos + 1);
    if (UIState._treeHistory[UIState._treeHistory.length - 1] !== personId) UIState._treeHistory.push(personId);
    UIState._treeHistoryPos = UIState._treeHistory.length - 1;
  }
  _updateTreeBackBtn();
  setBnavActive('tree');
  // Zoom-Scale sanieren (kann durch frühen Aufruf auf 0 gesetzt worden sein)
  if (_treeZoomScale <= 0) _treeZoomScale = 1;
  // Fan Chart deaktivieren + Toggle-Button + Gen-Buttons einblenden
  document.body.classList.remove('fc-mode');
  document.body.classList.add('tree-active');
  const _fcTb = document.getElementById('treeFcToggle');
  if (_fcTb) { _fcTb.style.display = 'inline-flex'; _fcTb.textContent = '◑'; _fcTb.title = 'Fächer-Diagramm'; }
  if (document.body.classList.contains('desktop-mode')) _updatePersonListCurrent(personId);

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
    return k ? `<div class="tree-kekule-badge">${k}</div>` : '';
  };

  // ── Vorfahren (4 Ebenen; Hochformat: max. 2 Ebenen) ──
  function _gp(id) { return id ? getParentIds(id) : { father: null, mother: null }; }
  const par0 = getParentIds(personId);
  const anc1 = [par0.father, par0.mother];                                         // 2
  const anc2 = anc1.flatMap(id => { const q = _gp(id); return [q.father, q.mother]; });  // 4
  const anc3 = anc2.flatMap(id => { const q = _gp(id); return [q.father, q.mother]; });  // 8
  const anc4 = anc3.flatMap(id => { const q = _gp(id); return [q.father, q.mother]; });  // 16
  const anc5 = anc4.flatMap(id => { const q = _gp(id); return [q.father, q.mother]; });  // 32

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
  // _treeGenCount = Generationen gesamt inkl. Proband:
  //   2 = nur Eltern (1 Ahnen-Ebene), 3 = +Großeltern (2 Ebenen),
  //   4 = +Urgroßeltern (3 Ebenen), 5 = +Ururgroßeltern (4 Ebenen)
  const _maxAnc = isPortrait ? 2 : _treeGenCount - 1;  // max. Ahnen-Ebenen (1..5)
  const hasAnc5 = _maxAnc >= 5 && anc5.some(Boolean);
  const hasAnc4 = _maxAnc >= 4 && anc4.some(Boolean);
  const hasAnc3 = _maxAnc >= 3 && anc3.some(Boolean);
  const ancLevels = hasAnc5 ? 5 : hasAnc4 ? 4 : hasAnc3 ? 3 : _maxAnc >= 2 ? 2 : 1;
  const ancSlots  = hasAnc5 ? 32 : hasAnc4 ? 16 : hasAnc3 ? 8 : ancLevels >= 2 ? 4 : 2;
  const ancSpan = ancSlots * SLOT;
  const personCX = Math.max(PAD + sibsW + CW / 2, PAD + ancSpan / 2);
  const rightEdge = personCX + CW / 2 + spousesW + PAD;
  const childMaxCols = childRows.length > 0 ? Math.max(...childRows.map(r => r.length)) : 0;
  const totalW = Math.max(personCX + ancSpan / 2 + PAD, rightEdge, personCX + childMaxCols * SLOT / 2 + PAD);

  // ── Y-Positionen: Zeile 0 (Zentrum) ──
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
    const q = AppState.db.individuals[id];
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

  // ── Ahnen-Ebenen ancLevels..2 (generisch für 2–5 Ebenen) ──
  const _ancArrays = [null, anc1, anc2, anc3, anc4, anc5];
  for (let _d = ancLevels; _d >= 2; _d--) {
    _ancArrays[_d].forEach((id, i) => {
      if (!id && _d >= 3) return;  // tiefe Ebenen: leere Slots überspringen
      mkCard(id, aXFn(_d)(i), ry(-_d), false, false, null, false, null, kbadge(id));
      if (id) line(aCXFn(_d)(i), ry(-_d) + H, aCXFn(_d - 1)(Math.floor(i / 2)), ry(-(_d - 1)));
    });
  }

  // ── Eltern ──
  anc1.forEach((id, i) => mkCard(id, aXFn(1)(i), ry(-1), false, false, null, false, null, kbadge(id)));

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
    mkCard(sid, sibColX, y, false, false, z, i > 0, null, badge + kbadge(sid));
  });

  // ── Zentrumsperson ──
  mkCard(personId, personX, ry(0), true, false, null, false, null, kbadge(personId));

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
    mkCard(fam.spId, spColX, y, false, false, z, !isActive, onClick, kbadge(fam.spId));
    if (isActive) {
      svgLine(personX + CW, ry(0) + CH / 2, spColX, y + H / 2, 'var(--gold)', '5 3');
      // Klickbares div-Element auf der Ehe-Linie (SVG hat pointer-events:none)
      const lineY = ry(0) + CH / 2;
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
  // Auto-Zentrierung: Zentrumsperson horizontal + vertikal ~1/3 von oben
  setTimeout(() => {
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
