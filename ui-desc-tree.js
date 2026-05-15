'use strict';
// ─────────────────────────────────────
//  NACHKOMMEN-BAUM (top-down SVG)
// ─────────────────────────────────────

let _descGens = 4;
let _descZoomScale = 1;

// ── Gen-Zähler ──

window.setDescTreeGens = function (n) {
  _descGens = Math.max(2, Math.min(7, n));
  document.querySelectorAll('[data-dgen]').forEach(b =>
    b.classList.toggle('active', +b.dataset.dgen === _descGens));
  _descZoomScale = 1;
  if (document.body.classList.contains('desc-tree-mode') && currentTreeId)
    showDescTree(currentTreeId, false);
};

// ── Toggle Sanduhr ↔ Nachkommen ──

window.toggleDescTree = function () {
  if (document.body.classList.contains('desc-tree-mode')) {
    document.body.classList.remove('desc-tree-mode');
    const dtTb = document.getElementById('treeDescToggle');
    if (dtTb) { dtTb.textContent = '⇩'; dtTb.title = 'Nachkommen-Baum'; }
    const pid = currentTreeId || AppState.currentPersonId;
    if (pid) showTree(pid, false);
  } else {
    const pid = currentTreeId || AppState.currentPersonId;
    if (pid) showDescTree(pid, false);
  }
};

// ── Layout-Berechnung (bottom-up) ──
// Gibt {slots, id, children[], hasMore} zurück.
// slots = Breite in SLOT-Einheiten = max(1, Summe Kinder-Slots)

function _descLayout(pid, depth) {
  const p = AppState.db.individuals[pid];
  if (!p) return { slots: 1, id: pid, children: [] };

  const seen = new Set();
  const childIds = (p.fams || [])
    .flatMap(famId => _sortedChildren(AppState.db.families[famId]?.children || []))
    .filter(id => seen.has(id) ? false : (seen.add(id), true));

  if (depth <= 0 || !childIds.length) {
    return { slots: 1, id: pid, children: [], hasMore: depth <= 0 && childIds.length > 0 };
  }

  const children = childIds.map(cid => _descLayout(cid, depth - 1));
  const totalSlots = children.reduce((s, c) => s + c.slots, 0);
  return { slots: Math.max(1, totalSlots), id: pid, children, hasMore: false };
}

// ── Hauptfunktion ──

window.showDescTree = function (personId, addToHistory = true) {
  const p = AppState.db.individuals[personId];
  if (!p) return;

  if (addToHistory && currentTreeId && currentTreeId !== personId) {
    UIState._navHistory.push({ type: 'desctree', id: currentTreeId });
    UIState._navFwdStack = [];
  }

  AppState.currentPersonId = personId;
  currentTreeId = personId;
  _updateTreeBackBtn();
  setBnavActive('tree');

  document.body.classList.add('desc-tree-mode', 'tree-active');
  document.body.classList.remove('fc-mode');

  const fcTb = document.getElementById('treeFcToggle');
  if (fcTb) { fcTb.style.display = 'inline-flex'; fcTb.textContent = '◑'; fcTb.title = 'Fächer-Diagramm'; }
  const dtTb = document.getElementById('treeDescToggle');
  if (dtTb) { dtTb.textContent = '⧖'; dtTb.title = 'Zur Sanduhr-Ansicht'; }

  document.querySelectorAll('[data-dgen]').forEach(b =>
    b.classList.toggle('active', +b.dataset.dgen === _descGens));
  document.getElementById('treeTopTitle').textContent = p.name || personId;
  if (document.body.classList.contains('desktop-mode')) _updatePersonListCurrent(personId);

  // ── Dimensionen ──
  const isPortrait = window.innerWidth < window.innerHeight;
  const W    = isPortrait ? 80  : 96;
  const H    = isPortrait ? 54  : 64;
  const CW   = isPortrait ? 124 : 160;
  const CH   = isPortrait ? 72  : 80;
  const HGAP = isPortrait ? 8   : 10;
  const VGAP = isPortrait ? 38  : 48;
  const PAD  = isPortrait ? 14  : 20;
  const SLOT = W + HGAP;

  // ── Layout ──
  const layout = _descLayout(personId, _descGens - 1);

  function _depth(node) {
    if (!node.children?.length) return 1;
    return 1 + Math.max(...node.children.map(_depth));
  }
  const actualDepth = _depth(layout);

  const totalW = Math.max(CW + 2 * PAD, layout.slots * SLOT + 2 * PAD);
  const totalH = PAD + CH + (actualDepth > 1 ? (actualDepth - 1) * (H + VGAP) : 0) + PAD;
  const rootCX = totalW / 2;

  // ── DOM ──
  const wrap = document.getElementById('treeWrap');
  const scaleWrap = document.getElementById('treeScaleWrap');
  if (_descZoomScale <= 0) _descZoomScale = 1;
  wrap.style.width         = totalW + 'px';
  wrap.style.height        = totalH + 'px';
  wrap.style.transform     = _descZoomScale !== 1 ? `scale(${_descZoomScale})` : '';
  wrap.style.transformOrigin = '0 0';
  if (scaleWrap) {
    scaleWrap.style.width  = Math.round(totalW * _descZoomScale) + 'px';
    scaleWrap.style.height = Math.round(totalH * _descZoomScale) + 'px';
  }
  wrap.querySelectorAll('.tree-card, .tree-marr-btn').forEach(el => el.remove());

  const svg = document.getElementById('treeSvg');
  svg.setAttribute('width',   totalW);
  svg.setAttribute('height',  totalH);
  svg.setAttribute('viewBox', `0 0 ${totalW} ${totalH}`);
  svg.innerHTML = '';

  // ── SVG-Linien ──
  function dLine(x1, y1, x2, y2) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    el.setAttribute('x1', x1); el.setAttribute('y1', y1);
    el.setAttribute('x2', x2); el.setAttribute('y2', y2);
    el.setAttribute('stroke', 'var(--border)');
    el.setAttribute('stroke-width', '1.5');
    svg.appendChild(el);
  }

  // ── Karte erstellen ──
  function mkDescCard(id, x, y, isRoot, hasMore) {
    const div = document.createElement('div');
    div.className = 'tree-card' + (isRoot ? ' tree-card-center' : '');
    div.style.left   = Math.round(x) + 'px';
    div.style.top    = Math.round(y) + 'px';
    div.style.width  = (isRoot ? CW : W) + 'px';
    div.style.height = (isRoot ? CH : H) + 'px';

    if (!id) {
      div.classList.add('tree-card-empty');
      div.innerHTML = '<span class="tree-card-unknown">?</span>';
      wrap.appendChild(div);
      return;
    }
    const q = AppState.db.individuals[id];
    if (!q) return;

    div.dataset.sex = q.sex || 'U';
    const by  = (q.birth?.date || '').replace(/.*(\d{4}).*/, '$1');
    const dy  = (q.death?.date || '').replace(/.*(\d{4}).*/, '$1');
    const yr  = [by ? '*' + by : '', dy ? '†' + dy : ''].filter(Boolean).join(' ');
    const fn  = [q.given, q.surname].filter(Boolean).join(' ') || q.name || '(unbekannt)';
    const sl  = q.sex === 'M' ? ', Mann' : q.sex === 'F' ? ', Frau' : '';
    div.title = fn + sl + (yr ? ' ' + yr : '');
    div.setAttribute('aria-label', _treeShortName(q, isRoot) + sl + (yr ? ', ' + yr : ''));

    div.innerHTML =
      `<div class="tree-name">${_treeNameHtml(q, isRoot)}</div>` +
      (yr ? `<div class="tree-yr${isPortrait ? ' tree-yr--portrait' : ''}">${yr}</div>` : '') +
      (hasMore ? `<div class="tree-half-badge tree-desc-more" title="Mehr Nachkommen — klicken zum Anzeigen">▼</div>` : '');

    div.addEventListener('click', isRoot ? () => showDetail(id) : () => showDescTree(id));
    wrap.appendChild(div);
  }

  // ── Rekursives Rendern ──
  function renderNode(node, cx, y, isRoot) {
    const cardW = isRoot ? CW : W;
    const cardH = isRoot ? CH : H;
    mkDescCard(node.id, cx - cardW / 2, y, isRoot, node.hasMore);

    if (!node.children?.length) return;

    const nextY        = y + cardH + VGAP;
    const childrenSpan = node.children.reduce((s, c) => s + c.slots, 0) * SLOT;
    const connY        = y + cardH;
    const juncY        = connY + Math.round(VGAP * 0.4);

    // Kindmittelpunkte berechnen
    const childCXs = [];
    let xCur = cx - childrenSpan / 2;
    node.children.forEach(child => {
      childCXs.push(xCur + child.slots * SLOT / 2);
      xCur += child.slots * SLOT;
    });

    // Vertikaler Stiel vom Elternteil
    dLine(cx, connY, cx, juncY);
    // Horizontaler Balken über alle Kinder
    if (childCXs.length > 1)
      dLine(childCXs[0], juncY, childCXs[childCXs.length - 1], juncY);
    // Vertikale Tropfen zu jedem Kind
    childCXs.forEach(childCX => dLine(childCX, juncY, childCX, nextY));

    // Kinder rekursiv rendern
    xCur = cx - childrenSpan / 2;
    node.children.forEach(child => {
      renderNode(child, xCur + child.slots * SLOT / 2, nextY, false);
      xCur += child.slots * SLOT;
    });
  }

  renderNode(layout, rootCX, PAD, true);

  // ── Tastatur-Navigationsziele ──
  const par0 = getParentIds(personId);
  _treeNavTargets = {
    up:    par0.father || par0.mother || null,
    up2:   par0.father ? par0.mother : null,
    down:  layout.children?.[0]?.id   || null,
    right: layout.children?.[1]?.id   || null,
  };

  showView('v-tree');
  _initTreeDrag();
  _initTreeKeys();

  // ── Auto-Fit + Scroll ──
  setTimeout(() => {
    const sc = document.getElementById('treeScroll');
    if (_descZoomScale <= 0) _descZoomScale = 1;
    if (!isPortrait && sc.clientWidth > 0 && sc.clientHeight > 0) {
      const fit = Math.min(1, sc.clientWidth / totalW, sc.clientHeight / totalH);
      if (fit > 0 && fit < _descZoomScale) {
        _descZoomScale = Math.round(fit * 100) / 100;
        wrap.style.transform = `scale(${_descZoomScale})`;
        wrap.style.transformOrigin = '0 0';
        if (scaleWrap) {
          scaleWrap.style.width  = Math.round(totalW * _descZoomScale) + 'px';
          scaleWrap.style.height = Math.round(totalH * _descZoomScale) + 'px';
        }
      }
    }
    const scaledW = totalW * _descZoomScale;
    const scaledH = totalH * _descZoomScale;
    const lPad = Math.max(0, Math.floor((sc.clientWidth  - scaledW) / 2));
    const tPad = Math.max(0, Math.floor((sc.clientHeight - scaledH) / 2));
    const posEl = scaleWrap || wrap;
    posEl.style.marginLeft = lPad + 'px';
    posEl.style.marginTop  = tPad  + 'px';
    if (scaleWrap) { wrap.style.marginLeft = ''; wrap.style.marginTop = ''; }
    sc.scrollLeft = Math.max(0, lPad + rootCX * _descZoomScale - sc.clientWidth  / 2);
    sc.scrollTop  = 0;
  }, 60);
};
