'use strict';
// ─────────────────────────────────────
//  DIAGRAMM-EXPORT ALS PNG
// ─────────────────────────────────────
//  Öffentliche API:
//    exportFanChartPng()   — Fächer-Chart
//    exportDescTreePng()   — Nachkommen-Baum (DOM-Snapshot)
//    exportSandUhrPng()    — Sanduhr-Baum   (DOM-Snapshot, Stapel aufgelöst)
//
//  Interne Kern-Engine:
//    _svgToPng(svgEl, filename, scale)        — SVG → Canvas → PNG
//    _buildTreeSvg(wrap, lineSvg, w, h, opts) — gemeinsamer
//      DOM-Snapshot-Builder für Nachkommen-Baum und Sanduhr
//
//  opts für _buildTreeSvg:
//    zSort     {bool} — Karten nach z-index sortieren (Sanduhr-Stapel)
//    badgeFull {bool} — alle 4 Badge-Typen rendern (Sanduhr)
//    unstack   {bool} — Peek-Stapel auflösen: jede Karte vollständig
//                       sichtbar, SVG-Höhe wächst entsprechend
// ─────────────────────────────────────

// ── CSS-Variable auslesen ─────────────────────────────
function _chartCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Alle var(--*) in einem serialisierten SVG-String ersetzen
function _resolveVars(str) {
  return str.replace(/var\(--([^)]+)\)/g, (_, name) => {
    const v = _chartCssVar('--' + name.trim());
    return v || 'transparent';
  });
}

// ── Kern: SVG-Element → PNG-Download ─────────────────
function _svgToPng(svgEl, filename, scale) {
  scale = scale || 2;
  const vb = (svgEl.getAttribute('viewBox') || '').split(' ').map(Number);
  const W  = vb.length === 4 ? vb[2] : (parseFloat(svgEl.getAttribute('width'))  || 800);
  const H  = vb.length === 4 ? vb[3] : (parseFloat(svgEl.getAttribute('height')) || 600);

  let svgStr = new XMLSerializer().serializeToString(svgEl);
  svgStr = _resolveVars(svgStr);
  if (!svgStr.includes('xmlns=')) {
    svgStr = svgStr.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  showToast('Export wird erstellt…', 'info');

  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const img  = new Image();

  img.onload = () => {
    try {
      const canvas  = document.createElement('canvas');
      canvas.width  = Math.round(W * scale);
      canvas.height = Math.round(H * scale);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = _chartCssVar('--bg') || '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const a = document.createElement('a');
      a.download = filename;
      a.href = canvas.toDataURL('image/png');
      a.click();
      showToast('✓ ' + filename + ' exportiert', 'success');
    } catch (e) {
      showToast('PNG-Export fehlgeschlagen', 'error');
    } finally {
      URL.revokeObjectURL(url);
    }
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    showToast('PNG-Export fehlgeschlagen', 'error');
  };
  img.src = url;
}

// ── Dateiname aus aktueller Person ───────────────────
function _chartFilename(prefix) {
  const pid  = AppState.currentPersonId;
  const p    = AppState.db.individuals[pid];
  const slug = ((p && (p.surname || p.name)) || pid || 'export')
    .replace(/[^\wÀ-ɏ]/g, '_').slice(0, 40);
  return prefix + '_' + slug + '.png';
}

// ─────────────────────────────────────────────────────
//  UNSTACK-VORBEREITUNG
// ─────────────────────────────────────────────────────
// Erkennt Peek-Stapel im DOM (gleiche left-Position, mind. eine
// .tree-card-peek), berechnet aufgelöste Y-Positionen und gibt
// eine Map<DOMElement → {x,y}> zurück sowie die zusätzliche SVG-Höhe.

function _computeUnstack(cards) {
  const GAP   = 8;   // Abstand zwischen aufgelösten Karten
  const posMap = new Map();
  let extraH   = 0;

  // Alle Nicht-Zentrumskarten nach Spalte (gerundetes left) gruppieren
  const byCol = {};
  cards.forEach(card => {
    if (card.classList.contains('tree-card-center')) return;
    const col = Math.round(parseFloat(card.style.left) || 0);
    (byCol[col] = byCol[col] || []).push(card);
  });

  Object.values(byCol).forEach(group => {
    // Nur Gruppen mit tatsächlichen Peek-Karten auflösen
    if (group.length < 2 || !group.some(c => c.classList.contains('tree-card-peek'))) return;

    // Nach originalem top sortieren (Karte 0 = oberste/vorderste)
    const sorted = group.slice().sort(
      (a, b) => (parseFloat(a.style.top) || 0) - (parseFloat(b.style.top) || 0)
    );

    const anchorY  = parseFloat(sorted[0].style.top)    || 0;
    const cardH    = parseFloat(sorted[0].style.height) || 64;
    // Tatsächlichen PEEK-Abstand aus DOM auslesen (robust gegen Portrait/Landscape)
    const peekDist = sorted.length > 1
      ? Math.round(Math.abs((parseFloat(sorted[1].style.top) || 0) - anchorY))
      : 0;

    const oldBottom = anchorY + cardH + (sorted.length - 1) * peekDist;
    const newBottom = anchorY + sorted.length * (cardH + GAP) - GAP;
    extraH = Math.max(extraH, newBottom - oldBottom);

    sorted.forEach((card, i) => {
      posMap.set(card, {
        x: parseFloat(card.style.left) || 0,
        y: anchorY + i * (cardH + GAP),
      });
    });
  });

  return { posMap, extraH };
}

// ─────────────────────────────────────────────────────
//  GEMEINSAMER DOM-SNAPSHOT-BUILDER FÜR BAUM-MODI
// ─────────────────────────────────────────────────────

function _buildTreeSvg(wrap, lineSvg, totalW, totalH, opts) {
  opts = opts || {};
  const NS = 'http://www.w3.org/2000/svg';

  const COL = {
    bg:      _chartCssVar('--bg')       || '#1a1a2e',
    border:  _chartCssVar('--border')   || '#404060',
    text:    _chartCssVar('--text')     || '#f0f0f0',
    muted:   _chartCssVar('--text-dim') || '#a0a0a0',
    M:       _chartCssVar('--blue')     || '#4a7ab5',
    F:       _chartCssVar('--pink')     || '#a84a6e',
    U:       _chartCssVar('--surface2') || '#2a2830',
    gold:    _chartCssVar('--gold')     || '#c8a84a',
    goldDim: _chartCssVar('--gold-dim') || '#7a6328',
    bgSolid: _chartCssVar('--bg')       || '#1a1a2e',
  };

  const svgEl = tag => document.createElementNS(NS, tag);

  function mkText(x, y, content, size, fill, anchor, weight) {
    const t = svgEl('text');
    t.setAttribute('x', x); t.setAttribute('y', y);
    t.setAttribute('font-size', size);
    t.setAttribute('font-family', 'system-ui,-apple-system,sans-serif');
    t.setAttribute('fill', fill);
    t.setAttribute('text-anchor', anchor || 'middle');
    t.setAttribute('dominant-baseline', 'middle');
    t.setAttribute('font-weight', weight || '400');
    t.setAttribute('pointer-events', 'none');
    t.textContent = content;
    return t;
  }

  // ── Root-SVG + Hintergrund ──
  const outSvg = svgEl('svg');
  outSvg.setAttribute('xmlns', NS);
  outSvg.setAttribute('viewBox', `0 0 ${totalW} ${totalH}`);
  outSvg.setAttribute('width',  totalW);
  outSvg.setAttribute('height', totalH);

  const bg = svgEl('rect');
  bg.setAttribute('width', totalW); bg.setAttribute('height', totalH);
  bg.setAttribute('fill', COL.bg);
  outSvg.appendChild(bg);

  // ── Verbindungslinien klonen ──
  // data-role-Attribute (sib-h, sib-v, spouse-active) bleiben bei cloneNode erhalten.
  // stroke var(--*) werden einzeln aufgelöst: --border, --gold, --gold-dim.
  Array.from(lineSvg.childNodes).forEach(child => {
    const clone = child.cloneNode(true);
    if (clone.getAttribute) {
      const s = clone.getAttribute('stroke');
      if (s && s.startsWith('var(--')) {
        const varName = s.match(/var\(--([\w-]+)\)/)?.[1];
        clone.setAttribute('stroke', varName ? (_chartCssVar('--' + varName) || COL.border) : COL.border);
      }
    }
    outSvg.appendChild(clone);
  });

  // ── Heirats-Buttons ──
  wrap.querySelectorAll('.tree-marr-btn').forEach(btn => {
    const bx = parseFloat(btn.style.left)   || 0;
    const by = parseFloat(btn.style.top)    || 0;
    const bw = parseFloat(btn.style.width)  || 20;
    const bh = parseFloat(btn.style.height) || 24;
    outSvg.appendChild(mkText(bx + bw / 2, by + bh / 2, '⚭', 10, COL.gold));
  });

  // ── „…"-Mehr-Geschwister-Indikator (horizontales Layout) ──
  wrap.querySelectorAll('.tree-sib-more').forEach(el => {
    const bx = parseFloat(el.style.left)   || 0;
    const by = parseFloat(el.style.top)    || 0;
    const bw = parseFloat(el.style.width)  || 24;
    const bh = parseFloat(el.style.height) || 64;
    const morRect = svgEl('rect');
    morRect.setAttribute('x', bx); morRect.setAttribute('y', by);
    morRect.setAttribute('width', bw); morRect.setAttribute('height', bh);
    morRect.setAttribute('rx', 6); morRect.setAttribute('ry', 6);
    morRect.setAttribute('fill', 'none');
    morRect.setAttribute('stroke', COL.border);
    morRect.setAttribute('stroke-width', '1.5');
    morRect.setAttribute('stroke-dasharray', '3 2');
    outSvg.appendChild(morRect);
    outSvg.appendChild(mkText(bx + bw / 2, by + bh / 2, '…', 8, COL.muted));
  });

  // ── Karten vorbereiten: Z-Sortierung + ggf. Unstack ──
  let cards = Array.from(wrap.querySelectorAll('.tree-card'));
  if (opts.zSort) {
    cards = cards.slice().sort(
      (a, b) => (parseInt(a.style.zIndex) || 0) - (parseInt(b.style.zIndex) || 0)
    );
  }

  // Unstack: aufgelöste Positionen berechnen und SVG-Höhe anpassen
  // (Fallback für schmale Bäume mit ancLevels < 3, wo Peek-Stapel noch aktiv sind)
  let posMap = new Map();
  if (opts.unstack) {
    const { posMap: pm, extraH } = _computeUnstack(cards);
    posMap = pm;

    if (extraH > 0) {
      const newH = totalH + extraH;
      outSvg.setAttribute('viewBox', `0 0 ${totalW} ${newH}`);
      outSvg.setAttribute('height', newH);
      bg.setAttribute('height', newH);
    }
  }

  // ── Karten zeichnen ──
  const RADIUS = 4;
  cards.forEach(card => {
    const pos     = posMap.get(card);
    const x       = pos ? pos.x : (parseFloat(card.style.left)   || 0);
    const y       = pos ? pos.y : (parseFloat(card.style.top)    || 0);
    const w       = parseFloat(card.style.width)  || 96;
    const h       = parseFloat(card.style.height) || 64;
    const sex     = card.dataset.sex || 'U';
    const isRoot  = card.classList.contains('tree-card-center');
    const isEmpty = card.classList.contains('tree-card-empty');
    const isHalf  = card.classList.contains('tree-card-half');
    // Peek-Optik nur wenn Karte NICHT aufgelöst wurde
    const isPeek  = card.classList.contains('tree-card-peek') && !pos;
    const cardFill = COL[sex] || COL.U;

    const rect = svgEl('rect');
    rect.setAttribute('x', x);  rect.setAttribute('y', y);
    rect.setAttribute('width', w); rect.setAttribute('height', h);
    rect.setAttribute('rx', RADIUS); rect.setAttribute('ry', RADIUS);
    rect.setAttribute('fill', cardFill);
    rect.setAttribute('fill-opacity', isRoot ? '0.45' : isPeek ? '0.15' : '0.30');
    rect.setAttribute('stroke', isRoot ? cardFill : isHalf ? COL.goldDim : COL.border);
    rect.setAttribute('stroke-width', isRoot ? '2' : '1');
    if (isHalf || isPeek) rect.setAttribute('stroke-dasharray', '3 2');
    outSvg.appendChild(rect);

    if (isEmpty) {
      outSvg.appendChild(mkText(x + w / 2, y + h / 2, '?', 14, COL.muted));
      return;
    }

    const nameTxt = card.querySelector('.tree-name')?.textContent?.trim() || '';
    const yrTxt   = card.querySelector('.tree-yr')?.textContent?.trim()   || '';
    const hasYr   = !!yrTxt;
    const textFill = isPeek ? COL.muted : COL.text;

    if (nameTxt) {
      const nameY = hasYr ? y + h / 2 - 7 : y + h / 2;
      outSvg.appendChild(mkText(
        x + w / 2, nameY, nameTxt,
        isRoot ? 10 : 8, isRoot ? COL.gold : textFill,
        'middle', isRoot ? '600' : '500'
      ));
    }
    if (hasYr) {
      outSvg.appendChild(mkText(x + w / 2, y + h / 2 + 8, yrTxt, isRoot ? 8 : 7, COL.muted));
    }

    // ½-Badge — beide Modi
    if (isHalf) {
      outSvg.appendChild(mkText(x + w - 3, y + h - 5, '½', 7, COL.goldDim, 'end'));
    }

    if (!opts.badgeFull) return;

    // Kekule-Nummer (Sanduhr) — oben links
    const kBadge = card.querySelector('.tree-kekule-badge');
    if (kBadge) {
      const kTxt = kBadge.textContent?.trim();
      if (kTxt) outSvg.appendChild(mkText(x + 4, y + 7, kTxt, 6.5, COL.gold, 'start', '700'));
    }

    // ⚭N-Badge (Mehrehen) — oben rechts als Pill
    const rrBadge = card.querySelector('.tree-half-badge--right');
    if (rrBadge) {
      const rTxt = rrBadge.textContent?.trim();
      if (rTxt) {
        const pill = svgEl('rect');
        pill.setAttribute('x', x + w - 18); pill.setAttribute('y', y + 2);
        pill.setAttribute('width', 16); pill.setAttribute('height', 10);
        pill.setAttribute('rx', 3); pill.setAttribute('ry', 3);
        pill.setAttribute('fill', COL.goldDim);
        outSvg.appendChild(pill);
        outSvg.appendChild(mkText(x + w - 10, y + 7, rTxt, 6.5, COL.bgSolid, 'middle', '600'));
      }
    }

    // Geschwisterzahl-Badge — oben rechts, gold (nur wenn kein ⚭N, schmaler Baum-Fallback)
    const sibBadge = card.querySelector('.tree-half-badge--sib');
    if (sibBadge && !rrBadge) {
      const sTxt = sibBadge.textContent?.trim();
      if (sTxt) outSvg.appendChild(mkText(x + w - 4, y + 7, sTxt, 7, COL.gold, 'end', '600'));
    }

    // ∞N-Badge (Geschwisterzahl, horizontales Layout) — unten links als Pill
    const scBadge = card.querySelector('.tree-half-badge--sib-count');
    if (scBadge) {
      const scTxt = scBadge.textContent?.trim();
      if (scTxt) {
        const pillW = 20;
        const pill  = svgEl('rect');
        pill.setAttribute('x', x + 2); pill.setAttribute('y', y + h - 12);
        pill.setAttribute('width', pillW); pill.setAttribute('height', 10);
        pill.setAttribute('rx', 3); pill.setAttribute('ry', 3);
        pill.setAttribute('fill', COL.goldDim);
        outSvg.appendChild(pill);
        outSvg.appendChild(mkText(x + 2 + pillW / 2, y + h - 7, scTxt, 6.5, COL.bgSolid, 'middle', '600'));
      }
    }
  });

  return outSvg;
}

// ─────────────────────────────────────────────────────
//  FÄCHER-CHART
// ─────────────────────────────────────────────────────

window.exportFanChartPng = function () {
  const svg = document.getElementById('fcSvg');
  if (!svg || !svg.getAttribute('viewBox')) {
    showToast('Kein Fächer-Diagramm vorhanden', 'warn'); return;
  }
  _svgToPng(svg, _chartFilename('faecher'));
};

// ─────────────────────────────────────────────────────
//  NACHKOMMEN-BAUM
// ─────────────────────────────────────────────────────

window.exportDescTreePng = function () {
  const wrap    = document.getElementById('treeWrap');
  const lineSvg = document.getElementById('treeSvg');
  if (!wrap || !lineSvg) { showToast('Kein Nachkommen-Baum vorhanden', 'warn'); return; }
  const outSvg = _buildTreeSvg(wrap, lineSvg,
    parseFloat(wrap.style.width) || 800, parseFloat(wrap.style.height) || 600,
    { zSort: false, badgeFull: false, unstack: false }
  );
  _svgToPng(outSvg, _chartFilename('nachkommen'));
};

// ─────────────────────────────────────────────────────
//  SANDUHR-BAUM (Stapel aufgelöst)
// ─────────────────────────────────────────────────────
// unstack: Geschwister- und Ehepartner-Peek-Stapel werden vollständig
// nebeneinander ausgeklappt; die sib-v- und spouse-active-Linien
// (data-role-Attribute im Renderer gesetzt) werden auf die neuen
// Endpunkte angepasst; SVG-Höhe wächst entsprechend.

window.exportSandUhrPng = function () {
  const wrap    = document.getElementById('treeWrap');
  const lineSvg = document.getElementById('treeSvg');
  if (!wrap || !lineSvg) { showToast('Kein Sanduhr-Baum vorhanden', 'warn'); return; }
  const outSvg = _buildTreeSvg(wrap, lineSvg,
    parseFloat(wrap.style.width) || 800, parseFloat(wrap.style.height) || 600,
    { zSort: true, badgeFull: true, unstack: true }
  );
  _svgToPng(outSvg, _chartFilename('sanduhr'));
};
