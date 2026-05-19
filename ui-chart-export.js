'use strict';
// ─────────────────────────────────────
//  DIAGRAMM-EXPORT ALS PNG
// ─────────────────────────────────────
//  Öffentliche API:
//    exportFanChartPng()   — Fächer-Chart
//    exportDescTreePng()   — Nachkommen-Baum (DOM-Snapshot)
//
//  Erweiterungspunkt: _svgToPng(svgEl, filename, scale) ist intern
//  exportierbar für künftige Diagramme (Zeitleiste-SVG etc.).
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
//  FÄCHER-CHART: #fcSvg direkt exportieren
// ─────────────────────────────────────────────────────
// Der Fächer-Chart ist reines SVG — Segment-Füllfarben sind
// bereits als Hex-Werte gesetzt (_fill() in ui-fanchart.js);
// nur Proband-Kreis, Strokes und Text-Farben enthalten var(--*),
// die _resolveVars() beim Serialisieren auflöst.

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
// Der Nachkommen-Baum besteht aus SVG-Linien (#treeSvg) und
// HTML-Karten (.tree-card-Divs in #treeWrap). Für den Export
// liest diese Funktion die gerenderten DOM-Positionen aus und
// baut daraus ein eigenständiges, druckbares SVG-Dokument.
// Kein Eingriff in den Renderer nötig — vollständig entkoppelt.

window.exportDescTreePng = function () {
  const wrap    = document.getElementById('treeWrap');
  const lineSvg = document.getElementById('treeSvg');
  if (!wrap || !lineSvg) { showToast('Kein Nachkommen-Baum vorhanden', 'warn'); return; }

  const totalW = parseFloat(wrap.style.width)  || 800;
  const totalH = parseFloat(wrap.style.height) || 600;
  const NS     = 'http://www.w3.org/2000/svg';

  // Einmal alle Theme-Farben auslesen
  const COL = {
    bg:     _chartCssVar('--bg')       || '#1a1a2e',
    border: _chartCssVar('--border')   || '#404060',
    text:   _chartCssVar('--text')     || '#f0f0f0',
    muted:  _chartCssVar('--text-dim') || '#a0a0a0',
    M:      _chartCssVar('--blue')     || '#4a7ab5',
    F:      _chartCssVar('--pink')     || '#a84a6e',
    U:      _chartCssVar('--surface2') || '#2a2830',
  };

  // ── SVG-Elemente erzeugen ──
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

  // ── Root-SVG ──
  const outSvg = svgEl('svg');
  outSvg.setAttribute('xmlns', NS);
  outSvg.setAttribute('viewBox', `0 0 ${totalW} ${totalH}`);
  outSvg.setAttribute('width',  totalW);
  outSvg.setAttribute('height', totalH);

  // Hintergrund
  const bg = svgEl('rect');
  bg.setAttribute('width', totalW); bg.setAttribute('height', totalH);
  bg.setAttribute('fill', COL.bg);
  outSvg.appendChild(bg);

  // ── Verbindungslinien aus #treeSvg übernehmen ──
  // Clonen und var(--border) durch aufgelöste Farbe ersetzen
  Array.from(lineSvg.childNodes).forEach(child => {
    const clone = child.cloneNode(true);
    if (clone.getAttribute) {
      const s = clone.getAttribute('stroke');
      if (s && s.includes('var(')) clone.setAttribute('stroke', COL.border);
    }
    outSvg.appendChild(clone);
  });

  // ── Heirats-Buttons als ⚭-Text ──
  wrap.querySelectorAll('.tree-marr-btn').forEach(btn => {
    const bx = parseFloat(btn.style.left)   || 0;
    const by = parseFloat(btn.style.top)    || 0;
    const bw = parseFloat(btn.style.width)  || 20;
    const bh = parseFloat(btn.style.height) || 24;
    outSvg.appendChild(mkText(bx + bw / 2, by + bh / 2, '⚭', 10, COL.muted));
  });

  // ── Personen-Karten als rect + text ──
  const RADIUS = 4;
  wrap.querySelectorAll('.tree-card').forEach(card => {
    const x       = parseFloat(card.style.left)   || 0;
    const y       = parseFloat(card.style.top)    || 0;
    const w       = parseFloat(card.style.width)  || 96;
    const h       = parseFloat(card.style.height) || 64;
    const sex     = card.dataset.sex || 'U';
    const isRoot  = card.classList.contains('tree-card-center');
    const isEmpty = card.classList.contains('tree-card-empty');
    const isHalf  = card.classList.contains('tree-card-half');
    const cardFill = COL[sex] || COL.U;

    // Karte
    const rect = svgEl('rect');
    rect.setAttribute('x', x);  rect.setAttribute('y', y);
    rect.setAttribute('width', w); rect.setAttribute('height', h);
    rect.setAttribute('rx', RADIUS); rect.setAttribute('ry', RADIUS);
    rect.setAttribute('fill', cardFill);
    rect.setAttribute('fill-opacity', isRoot ? '0.45' : '0.30');
    rect.setAttribute('stroke', isRoot ? cardFill : COL.border);
    rect.setAttribute('stroke-width', isRoot ? '2' : '1');
    outSvg.appendChild(rect);

    if (isEmpty) {
      outSvg.appendChild(mkText(x + w / 2, y + h / 2, '?', 14, COL.muted));
      return;
    }

    // Name — textContent gibt Klartext auch wenn HTML-Tags vorhanden
    const nameTxt = card.querySelector('.tree-name')?.textContent?.trim() || '';
    const yrTxt   = card.querySelector('.tree-yr')?.textContent?.trim()   || '';
    const hasYr   = !!yrTxt;

    if (nameTxt) {
      const nameY = hasYr ? y + h / 2 - 7 : y + h / 2;
      outSvg.appendChild(mkText(
        x + w / 2, nameY, nameTxt,
        isRoot ? 10 : 8, COL.text, 'middle', isRoot ? '600' : '500'
      ));
    }
    if (hasYr) {
      outSvg.appendChild(mkText(x + w / 2, y + h / 2 + 8, yrTxt,
        isRoot ? 8 : 7, COL.muted));
    }
    // ½-Badge für Kinder aus Nebenehe
    if (isHalf) {
      outSvg.appendChild(mkText(x + w - 3, y + 5, '½', 7, COL.muted, 'end'));
    }
  });

  _svgToPng(outSvg, _chartFilename('nachkommen'));
};
