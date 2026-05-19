'use strict';
// ─────────────────────────────────────
//  DIAGRAMM-EXPORT ALS PNG
// ─────────────────────────────────────
//  Öffentliche API:
//    exportFanChartPng()   — Fächer-Chart
//    exportDescTreePng()   — Nachkommen-Baum (DOM-Snapshot)
//    exportSandUhrPng()    — Sanduhr-Baum   (DOM-Snapshot)
//
//  Interne Kern-Engine:
//    _svgToPng(svgEl, filename, scale)   — SVG → Canvas → PNG
//    _buildTreeSvg(wrap, lineSvg, w, h, opts) — gemeinsamer
//      DOM-Snapshot-Builder für Nachkommen-Baum und Sanduhr
// ─────────────────────────────────────

// ── CSS-Variable auslesen ─────────────────────────────
function _chartCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Alle var(--*) in einem serialisierten SVG-String durch aufgelöste
// Werte ersetzen — benötigt von _svgToPng() für Fächer-Chart
function _resolveVars(str) {
  return str.replace(/var\(--([^)]+)\)/g, (_, name) => {
    const v = _chartCssVar('--' + name.trim());
    return v || 'transparent';
  });
}

// ── Kern: SVG-Element → PNG-Download ─────────────────
// svgEl    — SVG DOM-Element mit gesetztem viewBox
// filename — Dateiname für den Download
// scale    — Pixeldichte (2 = Retina-Auflösung)
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
//  GEMEINSAMER DOM-SNAPSHOT-BUILDER FÜR BAUM-MODI
// ─────────────────────────────────────────────────────
// Liest den gerenderten DOM aus (#treeSvg-Linien + .tree-card-Divs)
// und erzeugt ein eigenständiges SVG-Dokument ohne Eingriff in
// den jeweiligen Renderer.
//
// opts.zSort    {boolean} — Karten vor dem Zeichnen nach z-index
//               sortieren (Sanduhr: Peek-Stapel korrekt überlagern)
// opts.badgeFull {boolean} — alle 4 Badge-Typen rendern
//               (Sanduhr: Kekule, ½, ⚭N, Geschwisterzahl);
//               false = nur ½-Badge (Nachkommen-Baum)

function _buildTreeSvg(wrap, lineSvg, totalW, totalH, opts) {
  opts = opts || {};
  const NS = 'http://www.w3.org/2000/svg';

  // Alle Theme-Farben einmalig auslesen
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

  // ── Hilfsfunktionen ──
  const el = tag => document.createElementNS(NS, tag);

  function mkText(x, y, content, size, fill, anchor, weight) {
    const t = el('text');
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

  // ── Root-SVG ──
  const outSvg = el('svg');
  outSvg.setAttribute('xmlns', NS);
  outSvg.setAttribute('viewBox', `0 0 ${totalW} ${totalH}`);
  outSvg.setAttribute('width',  totalW);
  outSvg.setAttribute('height', totalH);

  // Hintergrund
  const bg = el('rect');
  bg.setAttribute('width', totalW); bg.setAttribute('height', totalH);
  bg.setAttribute('fill', COL.bg);
  outSvg.appendChild(bg);

  // ── Verbindungslinien aus #treeSvg klonen ──
  // stroke-Attribute mit var(--*) werden einzeln aufgelöst, damit
  // --border, --gold und --gold-dim korrekt unterschieden werden.
  Array.from(lineSvg.childNodes).forEach(child => {
    const clone = child.cloneNode(true);
    if (clone.getAttribute) {
      const s = clone.getAttribute('stroke');
      if (s && s.startsWith('var(--')) {
        const varName = s.match(/var\(--([\w-]+)\)/)?.[1];
        const resolved = varName ? (_chartCssVar('--' + varName) || COL.border) : COL.border;
        clone.setAttribute('stroke', resolved);
      }
    }
    outSvg.appendChild(clone);
  });

  // ── Heirats-Buttons ──
  // Sanduhr: marr-btns sind in DOM-Reihenfolge — vor den Karten zeichnen
  wrap.querySelectorAll('.tree-marr-btn').forEach(btn => {
    const bx = parseFloat(btn.style.left)   || 0;
    const by = parseFloat(btn.style.top)    || 0;
    const bw = parseFloat(btn.style.width)  || 20;
    const bh = parseFloat(btn.style.height) || 24;
    outSvg.appendChild(mkText(bx + bw / 2, by + bh / 2, '⚭', 10, COL.gold));
  });

  // ── Personen-Karten ──
  // Sanduhr: Karten nach z-index sortieren, damit Stapel korrekt
  // überlagern (z.B. aktiver Ehepartner oben, Geschwister vorne).
  const RADIUS = 4;
  let cards = Array.from(wrap.querySelectorAll('.tree-card'));
  if (opts.zSort) {
    cards = cards.slice().sort(
      (a, b) => (parseInt(a.style.zIndex) || 0) - (parseInt(b.style.zIndex) || 0)
    );
  }

  cards.forEach(card => {
    const x       = parseFloat(card.style.left)   || 0;
    const y       = parseFloat(card.style.top)    || 0;
    const w       = parseFloat(card.style.width)  || 96;
    const h       = parseFloat(card.style.height) || 64;
    const sex     = card.dataset.sex || 'U';
    const isRoot  = card.classList.contains('tree-card-center');
    const isEmpty = card.classList.contains('tree-card-empty');
    const isHalf  = card.classList.contains('tree-card-half');
    const isPeek  = card.classList.contains('tree-card-peek');
    const cardFill = COL[sex] || COL.U;

    // Karte — Peek-Karten mit reduzierter Opazität (wie CSS opacity:0.5)
    const rect = el('rect');
    rect.setAttribute('x', x);  rect.setAttribute('y', y);
    rect.setAttribute('width', w); rect.setAttribute('height', h);
    rect.setAttribute('rx', RADIUS); rect.setAttribute('ry', RADIUS);
    rect.setAttribute('fill', cardFill);
    rect.setAttribute('fill-opacity', isRoot ? '0.45' : isPeek ? '0.15' : '0.30');
    rect.setAttribute('stroke', isRoot ? cardFill : isHalf ? COL.goldDim : COL.border);
    rect.setAttribute('stroke-width', isRoot ? '2' : '1');
    rect.setAttribute('stroke-dasharray', isHalf ? '3 2' : 'none');
    if (isPeek) rect.setAttribute('stroke-dasharray', '3 2');
    outSvg.appendChild(rect);

    if (isEmpty) {
      outSvg.appendChild(mkText(x + w / 2, y + h / 2, '?', 14, COL.muted));
      return;
    }

    // Name + Jahr — textContent liefert Klartext auch bei HTML-Inhalt
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
      outSvg.appendChild(mkText(
        x + w / 2, y + h / 2 + 8, yrTxt,
        isRoot ? 8 : 7, COL.muted
      ));
    }

    // ── Badges ──

    // ½-Badge (Kinder aus Nebenehe) — beide Modi
    if (isHalf) {
      outSvg.appendChild(mkText(x + w - 3, y + h - 5, '½', 7, COL.goldDim, 'end'));
    }

    if (!opts.badgeFull) return;

    // Kekule-Nummer (Sanduhr) — oben links, gold
    const kBadge = card.querySelector('.tree-kekule-badge');
    if (kBadge) {
      const kTxt = kBadge.textContent?.trim();
      if (kTxt) outSvg.appendChild(mkText(x + 4, y + 7, kTxt, 6.5, COL.gold, 'start', '700'));
    }

    // ⚭N-Badge (Mehrehen) — oben rechts, goldDim-Hintergrund
    const rrBadge = card.querySelector('.tree-half-badge--right');
    if (rrBadge) {
      const rTxt = rrBadge.textContent?.trim();
      if (rTxt) {
        const pill = el('rect');
        pill.setAttribute('x', x + w - 18); pill.setAttribute('y', y + 2);
        pill.setAttribute('width', 16); pill.setAttribute('height', 10);
        pill.setAttribute('rx', 3); pill.setAttribute('ry', 3);
        pill.setAttribute('fill', COL.goldDim);
        outSvg.appendChild(pill);
        outSvg.appendChild(mkText(x + w - 10, y + 7, rTxt, 6.5, COL.bgSolid, 'middle', '600'));
      }
    }

    // Geschwisterzahl-Badge (.tree-half-badge--sib) — oben rechts, gold
    const sibBadge = card.querySelector('.tree-half-badge--sib');
    if (sibBadge && !rrBadge) {
      const sTxt = sibBadge.textContent?.trim();
      if (sTxt) outSvg.appendChild(mkText(x + w - 4, y + 7, sTxt, 7, COL.gold, 'end', '600'));
    }
  });

  return outSvg;
}

// ─────────────────────────────────────────────────────
//  FÄCHER-CHART: #fcSvg direkt exportieren
// ─────────────────────────────────────────────────────
// Reines SVG — Segment-Farben schon als Hex gesetzt (_fill() in
// ui-fanchart.js); verbleibende var(--*) löst _resolveVars() auf.

window.exportFanChartPng = function () {
  const svg = document.getElementById('fcSvg');
  if (!svg || !svg.getAttribute('viewBox')) {
    showToast('Kein Fächer-Diagramm vorhanden', 'warn'); return;
  }
  _svgToPng(svg, _chartFilename('faecher'));
};

// ─────────────────────────────────────────────────────
//  NACHKOMMEN-BAUM: DOM-Snapshot → reines SVG
// ─────────────────────────────────────────────────────

window.exportDescTreePng = function () {
  const wrap    = document.getElementById('treeWrap');
  const lineSvg = document.getElementById('treeSvg');
  if (!wrap || !lineSvg) { showToast('Kein Nachkommen-Baum vorhanden', 'warn'); return; }

  const totalW = parseFloat(wrap.style.width)  || 800;
  const totalH = parseFloat(wrap.style.height) || 600;

  const outSvg = _buildTreeSvg(wrap, lineSvg, totalW, totalH, {
    zSort:     false,  // desc-tree hat keine gestapelten Karten
    badgeFull: false,  // nur ½-Badge benötigt
  });
  _svgToPng(outSvg, _chartFilename('nachkommen'));
};

// ─────────────────────────────────────────────────────
//  SANDUHR-BAUM: DOM-Snapshot → reines SVG
// ─────────────────────────────────────────────────────
// Unterschiede zu Nachkommen-Baum:
//   · zSort=true  — Peek-Stapel (Geschwister, Ehepartner) korrekt überlagern
//   · badgeFull=true — Kekule, ½, ⚭N, Geschwisterzahl-Badges
//   · Linienfarben --gold / --gold-dim (Ehe- + Halbkind-Linien)
//     werden automatisch über stroke-Attribut-Auflösung korrekt dargestellt

window.exportSandUhrPng = function () {
  const wrap    = document.getElementById('treeWrap');
  const lineSvg = document.getElementById('treeSvg');
  if (!wrap || !lineSvg) { showToast('Kein Sanduhr-Baum vorhanden', 'warn'); return; }

  const totalW = parseFloat(wrap.style.width)  || 800;
  const totalH = parseFloat(wrap.style.height) || 600;

  const outSvg = _buildTreeSvg(wrap, lineSvg, totalW, totalH, {
    zSort:     true,   // Stapel nach z-index: aktiver Ehepartner / vorderstes Geschwister oben
    badgeFull: true,   // alle vier Badge-Typen
  });
  _svgToPng(outSvg, _chartFilename('sanduhr'));
};
