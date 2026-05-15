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
// Jeder Knoten enthält zusätzlich spouseId (Hauptehepartner, falls vorhanden).
// slots = Anzahl SLOT-Einheiten für diesen Teilbaum.

function _descLayout(pid, depth) {
  const p = AppState.db.individuals[pid];
  if (!p) return { slots: 1, id: pid, children: [] };

  // Hauptfamilie = erste Familie mit beiden Partnern (für Halbkind-Markierung)
  const mainFam = (p.fams || [])
    .map(fid => AppState.db.families[fid]).filter(Boolean)
    .find(f => f.husb && f.wife);
  const spouseId = mainFam
    ? (mainFam.husb === pid ? mainFam.wife : mainFam.husb)
    : null;
  const mainKidSet = mainFam ? new Set(mainFam.children || []) : new Set();

  const seen = new Set();
  const childEntries = (p.fams || [])
    .flatMap(famId => {
      const kids = _sortedChildren(AppState.db.families[famId]?.children || []);
      return kids.map(id => ({ id, isHalf: !mainKidSet.has(id) }));
    })
    .filter(e => seen.has(e.id) ? false : (seen.add(e.id), true));

  if (depth <= 0 || !childEntries.length) {
    return { slots: 1, id: pid, spouseId, children: [], hasMore: depth <= 0 && childEntries.length > 0 };
  }

  const children = childEntries.map(e => ({ ...(_descLayout(e.id, depth - 1)), isHalf: e.isHalf }));
  const totalSlots = children.reduce((s, c) => s + c.slots, 0);
  return { slots: Math.max(1, totalSlots), id: pid, spouseId, children, hasMore: false };
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
  const W       = isPortrait ? 80  : 96;
  const H       = isPortrait ? 54  : 64;
  const CW      = isPortrait ? 124 : 160;
  const CH      = isPortrait ? 72  : 80;
  const HGAP    = isPortrait ? 8   : 10;
  const VGAP    = isPortrait ? 38  : 48;
  const PAD     = isPortrait ? 14  : 20;
  const MGAP    = isPortrait ? 8   : 10;  // Abstand Person–Ehepartner (nur Wurzel)
  const SIB_GAP = isPortrait ? 8   : 10;  // Abstand Geschwister zum Probanden
  const SLOT    = W + HGAP;               // Breite einer Kind-Einheit

  // Alle Ehepartner des Probanden (in Familien-Reihenfolge)
  const rootSpouseIds = (p.fams || []).flatMap(fid => {
    const f = AppState.db.families[fid];
    if (!f) return [];
    if (f.husb === personId && f.wife) return [f.wife];
    if (f.wife === personId && f.husb) return [f.husb];
    return [];
  });

  // ── Geschwister des Probanden ──
  const sibFamRef = p.famc && p.famc.length > 0 ? p.famc[0] : null;
  const sibFamId  = sibFamRef ? (typeof sibFamRef === 'string' ? sibFamRef : sibFamRef.famId) : null;
  const siblings  = sibFamId
    ? (AppState.db.families[sibFamId]?.children || []).filter(id => id !== personId)
    : [];
  const nSibs = siblings.length;
  const sibsW = nSibs > 0 ? W + SIB_GAP : 0;

  // ── Layout ──
  const layout = _descLayout(personId, _descGens - 1);

  function _depth(node) {
    if (!node.children?.length) return 1;
    return 1 + Math.max(...node.children.map(_depth));
  }
  const actualDepth = _depth(layout);
  const treeSpan    = layout.slots * SLOT;

  // rootCX: weit genug rechts für Geschwisterstapel links + halbe Baumbreite
  const rootCX = Math.max(PAD + sibsW + CW / 2, PAD + sibsW + treeSpan / 2);

  // Ehepartner-Gruppe: variable Überlappung analog Geschwister, max Schritt = W+HGAP
  const nSpouses = rootSpouseIds.length;
  const spouseAvailW = nSpouses <= 1 ? W
    : Math.min(nSpouses * (MGAP + W), Math.max(MGAP + W, treeSpan));
  const spouseStep = nSpouses <= 1 ? 0
    : Math.max(Math.round(W * 0.3), Math.min(W + HGAP, Math.floor((spouseAvailW - W) / (nSpouses - 1))));
  const rootSpouseW = nSpouses > 0 ? MGAP + spouseStep * (nSpouses - 1) + W : 0;
  const totalW = Math.max(
    CW + 2 * PAD,
    rootCX + CW / 2 + rootSpouseW + PAD,
    rootCX + treeSpan / 2 + PAD
  );
  const totalH = PAD + CH + (actualDepth > 1 ? (actualDepth - 1) * (H + VGAP) : 0) + PAD;

  // ── DOM ──
  const wrap = document.getElementById('treeWrap');
  const scaleWrap = document.getElementById('treeScaleWrap');
  if (_descZoomScale <= 0) _descZoomScale = 1;
  wrap.style.width          = totalW + 'px';
  wrap.style.height         = totalH + 'px';
  wrap.style.transform      = _descZoomScale !== 1 ? `scale(${_descZoomScale})` : '';
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

  // ── Personen-Karte ──
  function mkDescCard(id, x, y, cardW, cardH, isRoot, hasMore, isSpouse, isHalf) {
    const div = document.createElement('div');
    div.className = 'tree-card' +
      (isRoot && !isSpouse ? ' tree-card-center' : '') +
      (isHalf ? ' tree-card-half' : '');
    div.style.left   = Math.round(x) + 'px';
    div.style.top    = Math.round(y) + 'px';
    div.style.width  = cardW + 'px';
    div.style.height = cardH + 'px';

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
    div.setAttribute('aria-label', _treeShortName(q, isRoot && !isSpouse) + sl + (yr ? ', ' + yr : ''));

    div.innerHTML =
      `<div class="tree-name">${_treeNameHtml(q, isRoot && !isSpouse)}</div>` +
      (yr ? `<div class="tree-yr${isPortrait ? ' tree-yr--portrait' : ''}">${yr}</div>` : '') +
      (isHalf ? `<div class="tree-half-badge">½</div>` : '') +
      (hasMore ? `<div class="tree-half-badge tree-desc-more" title="Mehr Nachkommen — klicken zum Anzeigen">▼</div>` : '');

    div.addEventListener('click', isRoot ? () => showDetail(id) : () => showDescTree(id));
    wrap.appendChild(div);
  }

  // ── Heirats-Button zwischen zwei Karten ──
  function mkMarrBtn(leftX, rightX, midY, famId) {
    const fam = famId ? AppState.db.families[famId] : null;
    const md  = fam?.marr?.date ? fam.marr.date.replace(/.*(\d{4}).*/, '$1') : '';
    const btn = document.createElement('div');
    btn.className = 'tree-marr-btn';
    btn.style.cssText = `position:absolute;left:${Math.round(leftX)}px;top:${Math.round(midY - 12)}px;` +
      `width:${Math.round(rightX - leftX)}px;height:24px;cursor:pointer;z-index:6;` +
      `display:flex;align-items:center;justify-content:center`;
    btn.title = md ? '⚭ ' + md : '⚭';
    btn.innerHTML = `<span class="tree-marr-badge">⚭</span>`;
    if (famId) btn.addEventListener('click', () => showFamilyDetail(famId));
    wrap.appendChild(btn);
  }

  // ── Familien-ID für ein Paar ──
  function getSpouseFamId(pid, spouseId) {
    for (const fid of (AppState.db.individuals[pid]?.fams || [])) {
      const f = AppState.db.families[fid];
      if (f && ((f.husb === pid && f.wife === spouseId) || (f.wife === pid && f.husb === spouseId)))
        return fid;
    }
    return null;
  }

  // ── Rekursives Rendern ──
  function renderNode(node, cx, y, isRoot, isHalf) {
    const cardW = isRoot ? CW : W;
    const cardH = isRoot ? CH : H;
    const cardX = cx - cardW / 2;

    mkDescCard(node.id, cardX, y, cardW, cardH, isRoot, node.hasMore, false, isHalf);

    if (!node.children?.length) return;

    const nextY        = y + cardH + VGAP;
    const childrenSpan = node.children.reduce((s, c) => s + c.slots, 0) * SLOT;
    const connY        = y + cardH;
    const juncY        = connY + Math.round(VGAP * 0.4);

    const childCXs = [];
    let xCur = cx - childrenSpan / 2;
    node.children.forEach(child => {
      childCXs.push(xCur + child.slots * SLOT / 2);
      xCur += child.slots * SLOT;
    });

    dLine(cx, connY, cx, juncY);
    if (childCXs.length > 1)
      dLine(childCXs[0], juncY, childCXs[childCXs.length - 1], juncY);
    childCXs.forEach(childCX => dLine(childCX, juncY, childCX, nextY));

    xCur = cx - childrenSpan / 2;
    node.children.forEach(child => {
      renderNode(child, xCur + child.slots * SLOT / 2, nextY, false, child.isHalf);
      xCur += child.slots * SLOT;
    });
  }

  renderNode(layout, rootCX, PAD, true, false);

  // ── Ehepartner-Gruppe rechts: ⚭-Button nur zum ersten, dann variabler Schritt ──
  if (nSpouses > 0) {
    const spStart = rootCX + CW / 2 + MGAP;
    mkMarrBtn(rootCX + CW / 2, spStart, PAD + CH / 2, getSpouseFamId(personId, rootSpouseIds[0]));
    rootSpouseIds.forEach((spId, i) => {
      mkDescCard(spId, spStart + i * spouseStep, PAD + (CH - H) / 2, W, H, false, false, true, false);
    });
  }

  // ── Geschwister-Stapel (links vom Probanden, horizontal mit variabler Überlappung) ──
  if (nSibs > 0) {
    const sibY      = PAD + (CH - H) / 2;
    const midY      = PAD + CH / 2;
    const stackRightX = rootCX - CW / 2 - SIB_GAP;
    // Schritt: so groß wie verfügbar, aber max normaler Kästchenabstand (W+HGAP)
    const availW  = stackRightX - PAD;
    const sibStep = nSibs === 1 ? 0 : Math.max(16, Math.min(W + HGAP, Math.floor((availW - W) / (nSibs - 1))));
    const stackW  = nSibs === 1 ? W : sibStep * (nSibs - 1) + W;
    const stackLeftX = stackRightX - stackW;

    // T-Linie: rechte Stapelkante → linke Proband-Kante
    dLine(stackRightX, midY, rootCX - CW / 2, midY);

    siblings.forEach((sid, i) => {
      const sq = AppState.db.individuals[sid];
      if (!sq) return;
      const div = document.createElement('div');
      div.className = 'tree-card';
      div.style.left   = Math.round(stackLeftX + i * sibStep) + 'px';
      div.style.top    = Math.round(sibY) + 'px';
      div.style.width  = W + 'px';
      div.style.height = H + 'px';
      div.style.zIndex = i + 1;  // rechteste Karte oben
      div.dataset.sex  = sq.sex || 'U';
      const by = (sq.birth?.date || '').replace(/.*(\d{4}).*/, '$1');
      const dy = (sq.death?.date || '').replace(/.*(\d{4}).*/, '$1');
      const yr = [by ? '*' + by : '', dy ? '†' + dy : ''].filter(Boolean).join(' ');
      div.title = sq.name || sid;
      div.innerHTML =
        `<div class="tree-name">${_treeNameHtml(sq, false)}</div>` +
        (yr ? `<div class="tree-yr${isPortrait ? ' tree-yr--portrait' : ''}">${yr}</div>` : '');
      div.addEventListener('click', () => showDescTree(sid));
      wrap.appendChild(div);
    });
  }

  // ── Tastatur-Navigationsziele ──
  const par0 = getParentIds(personId);
  _treeNavTargets = {
    up:    par0.father || par0.mother || null,
    up2:   par0.father ? par0.mother : null,
    down:  layout.children?.[0]?.id   || null,
    right: rootSpouseIds[0]            || layout.children?.[1]?.id || null,
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
