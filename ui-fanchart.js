'use strict';
// ==========================================
//  Fan Chart — SVG Vorfahren-Fächer (v5)
//  Datei: ui-fanchart.js
// ==========================================

(function () {

const FC = {
  genCount: 5,    // aktive Generationszahl
  _pid:     null, // aktuell zentrierte Person
  _obs:     null, // ResizeObserver
};

// RADII[g] = Außenradius der Generation g
// RADII[0] = Radius des Proband-Kreises
const RADII = [38, 90, 148, 218, 296, 380, 464];

// ──────────────────────────────────────────
//  Öffentliche API
// ──────────────────────────────────────────

window.showFanChart = function (pid) {
  pid = pid || AppState.currentPersonId;
  if (!pid || !getPerson(pid)) return;

  FC._pid = pid;
  AppState.currentPersonId = pid;
  document.body.classList.add('fc-mode', 'tree-active');
  setBnavActive('tree');

  document.getElementById('treeTopTitle').textContent = _fcName(getPerson(pid), 28);
  document.getElementById('treeBtnBack').style.display = 'none';

  const tb = document.getElementById('treeFcToggle');
  if (tb) { tb.textContent = '⧖'; tb.title = 'Zur Sanduhr-Ansicht'; }

  _render(pid);
  _initResizeObserver();
};

// Wechsel zwischen Sanduhr und Fächer
window.toggleFanChart = function () {
  if (document.body.classList.contains('fc-mode')) {
    document.body.classList.remove('fc-mode');
    const tb = document.getElementById('treeFcToggle');
    if (tb) { tb.textContent = '◑'; tb.title = 'Fächer-Diagramm'; }
    showTree(FC._pid || AppState.currentPersonId);
  } else {
    showFanChart(AppState.currentPersonId);
  }
};

// Generationenzahl ändern (3–6)
window.setFcGens = function (n) {
  FC.genCount = Math.max(3, Math.min(6, n));
  document.querySelectorAll('.fc-gen-btn').forEach(b => {
    b.classList.toggle('active', +b.dataset.gen === FC.genCount);
  });
  if (FC._pid) _render(FC._pid);
};

// ──────────────────────────────────────────
//  Rendering
// ──────────────────────────────────────────

function _render(pid) {
  const svg = document.getElementById('fcSvg');
  if (!svg || !pid) return;
  svg.innerHTML = '';

  const maxR = RADII[FC.genCount];
  const pad  = 22;
  const W    = maxR * 2 + pad * 2;
  const H    = maxR + pad + 52; // Puffer unterhalb Proband-Mitte
  const cx   = W / 2;
  const cy   = H - 32;          // Proband-Mittelpunkt nahe Unterkante

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  // Vorfahren per BFS: gens[g][i] = Person-ID oder null
  const gens = [[pid]];
  for (let g = 1; g <= FC.genCount; g++) {
    const cur = [];
    for (const id of gens[g - 1]) {
      if (id) {
        const { father, mother } = getParentIds(id);
        cur.push(father, mother);
      } else {
        cur.push(null, null);
      }
    }
    gens.push(cur);
  }

  // Proband-Kreis (Generation 0)
  _drawProband(svg, cx, cy, pid);

  // Ringe Generation 1..genCount
  for (let g = 1; g <= FC.genCount; g++) {
    const r1 = g === 1 ? RADII[0] : RADII[g - 1];
    const r2 = RADII[g];
    const n  = gens[g].length; // = 2^g
    for (let i = 0; i < n; i++) {
      // Winkel: π (links, Vater) → 0 (rechts, Mutter)
      const a1 = Math.PI * (1 - i / n);
      const a2 = Math.PI * (1 - (i + 1) / n);
      _drawSegment(svg, cx, cy, r1, r2, a1, a2, gens[g][i], g);
    }
  }

  _scaleSvg(W, H);
}

// Proband-Kreis in der Mitte
function _drawProband(svg, cx, cy, pid) {
  const p    = getPerson(pid);
  const sex  = p?.sex || 'U';
  const fill = sex === 'M' ? 'var(--blue)' : sex === 'F' ? 'var(--pink)' : 'var(--surface3)';
  const r    = RADII[0];

  const c = _el('circle');
  c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', r);
  c.setAttribute('fill', fill);
  c.setAttribute('stroke', 'var(--bg)'); c.setAttribute('stroke-width', '2');
  c.style.cursor = 'pointer';
  c.addEventListener('click', () => showDetail(pid));
  svg.appendChild(c);

  if (p) {
    const given = p.given || (p.name || '').split(/\s+/)[0] || '';
    _text(svg, cx, cy - 6, given,         10, 'var(--text)',     600);
    _text(svg, cx, cy + 7, p.surname || '', 9, 'var(--text-dim)', 400);
  }
}

// Ein Ringsegment zeichnen
function _drawSegment(svg, cx, cy, r1, r2, a1, a2, pid, gen) {
  const p      = pid ? getPerson(pid) : null;
  const sex    = p?.sex || 'U';
  const fill   = _fill(sex, gen, !!p);
  const fillHi = _fill(sex, 1, true);

  const path = _el('path');
  path.setAttribute('d', _arc(cx, cy, r1, r2, a1, a2));
  path.setAttribute('fill', fill);
  path.setAttribute('stroke', 'var(--bg)');
  path.setAttribute('stroke-width', '1.5');

  if (p) {
    path.style.cursor = 'pointer';
    path.addEventListener('mouseenter', () => path.setAttribute('fill', fillHi));
    path.addEventListener('mouseleave', () => path.setAttribute('fill', fill));
    path.addEventListener('click',      () => showFanChart(pid));
  }
  svg.appendChild(path);

  if (!p) return;

  // Textposition: Mittelpunkt des Segments
  const midA   = (a1 + a2) / 2;
  const midR   = (r1 + r2) / 2;
  const tx     = cx + midR * Math.cos(midA);
  const ty     = cy - midR * Math.sin(midA);
  const arcLen = Math.abs(a1 - a2) * midR;
  const ringH  = r2 - r1;

  // Rotation: Text zeigt vom Zentrum weg, bleibt lesbar (kein Kopfstand)
  let rot = -(midA * 180 / Math.PI);
  if (midA > Math.PI / 2) rot += 180;

  if (gen <= 2) {
    const fs1 = gen === 1 ? 11 : 9;
    const fs2 = gen === 1 ? 10 : 8;
    const off = gen === 1 ? 7  : 5;
    _text(svg, tx, ty - off, p.given   || '', fs1, 'var(--text)',     500, rot, tx, ty);
    _text(svg, tx, ty + off, p.surname || '', fs2, 'var(--text-dim)', 400, rot, tx, ty);
  } else if (gen === 3) {
    _text(svg, tx, ty, _fcName(p, 14), 8, 'var(--text)', 400, rot, tx, ty);
  } else if (gen === 4 && arcLen > 26) {
    _text(svg, tx, ty, _fcName(p, 12), 7.5, 'var(--text)', 400, rot, tx, ty);
  } else if (gen >= 5 && arcLen > 22 && ringH > 18) {
    _text(svg, tx, ty, p.surname || _fcName(p, 8), 6.5, 'var(--text)', 400, rot, tx, ty);
  }
}

// ──────────────────────────────────────────
//  SVG-Geometrie
// ──────────────────────────────────────────

// Ringsegment-Pfad
// Winkel a1 > a2 (nimmt von links nach rechts ab)
// Außenbogen links→rechts = Uhrzeigersinn = sweep 1
// Innenbogen rechts→links = gegen Uhrzeigersinn = sweep 0
function _arc(cx, cy, r1, r2, a1, a2) {
  const X  = (r, a) => f(cx + r * Math.cos(a));
  const Y  = (r, a) => f(cy - r * Math.sin(a)); // y-Achse in SVG invertiert
  const lg = (a1 - a2) > Math.PI ? 1 : 0;
  return [
    `M ${X(r2,a1)} ${Y(r2,a1)}`,
    `A ${r2} ${r2} 0 ${lg} 1 ${X(r2,a2)} ${Y(r2,a2)}`,
    `L ${X(r1,a2)} ${Y(r1,a2)}`,
    `A ${r1} ${r1} 0 ${lg} 0 ${X(r1,a1)} ${Y(r1,a1)}`,
    'Z',
  ].join(' ');
}

// ──────────────────────────────────────────
//  Farben, Skalierung, Hilfsfunktionen
// ──────────────────────────────────────────

// Füllfarbe: Geschlecht × Generation (außen dunkler)
function _fill(sex, gen, hasData) {
  if (!hasData) return 'var(--surface)';
  const pal = {
    M: ['#4a7ab5', '#2a4a72', '#1e3550', '#162540', '#101830', '#0c121a'],
    F: ['#a84a6e', '#6e2a42', '#501830', '#3a1020', '#280810', '#180406'],
    U: ['#342c1e', '#2a2318', '#211c14', '#1a1610', '#151210', '#111008'],
  };
  const row = pal[sex] || pal.U;
  return row[Math.min(gen - 1, row.length - 1)];
}

// SVG an Container-Größe anpassen
function _scaleSvg(W, H) {
  const wrap   = document.getElementById('fcContainer');
  const availW = (wrap?.clientWidth  || window.innerWidth)  - 24;
  const availH = (wrap?.clientHeight || window.innerHeight - 52 - 56) - 24;
  if (availW <= 0 || availH <= 0) return;
  const scale  = Math.min(availW / W, availH / H);
  const svg    = document.getElementById('fcSvg');
  if (svg) {
    svg.style.width  = Math.round(W * scale) + 'px';
    svg.style.height = Math.round(H * scale) + 'px';
  }
}

// Neu skalieren bei Container-Größenänderung (Rotation, Resize)
function _initResizeObserver() {
  if (FC._obs) return;
  const wrap = document.getElementById('fcContainer');
  if (!wrap || typeof ResizeObserver === 'undefined') return;
  FC._obs = new ResizeObserver(() => {
    if (!FC._pid || !document.body.classList.contains('fc-mode')) return;
    const vb = document.getElementById('fcSvg')?.getAttribute('viewBox');
    if (!vb) return;
    const parts = vb.split(' ').map(Number);
    _scaleSvg(parts[2], parts[3]);
  });
  FC._obs.observe(wrap);
}

// SVG-Text-Element erzeugen und anhängen
function _text(svg, x, y, txt, size, fill, weight, rotateDeg, pivotX, pivotY) {
  if (!txt) return;
  const t = _el('text');
  t.setAttribute('x', f(x)); t.setAttribute('y', f(y));
  t.setAttribute('text-anchor',      'middle');
  t.setAttribute('dominant-baseline','middle');
  t.setAttribute('font-size',        size);
  t.setAttribute('font-family',      'system-ui,-apple-system,sans-serif');
  t.setAttribute('fill',             fill);
  t.setAttribute('font-weight',      weight);
  t.setAttribute('pointer-events',   'none');
  if (rotateDeg) {
    t.setAttribute('transform',
      `rotate(${f(rotateDeg)},${f(pivotX ?? x)},${f(pivotY ?? y)})`);
  }
  t.textContent = txt;
  svg.appendChild(t);
}

function _el(tag) {
  return document.createElementNS('http://www.w3.org/2000/svg', tag);
}

// Auf 1 Dezimalstelle runden (kompaktere SVG-Ausgabe)
function f(n) { return Math.round(n * 10) / 10; }

// Name kürzen: "Johann Georg Schmidt" → "J. G. Schmidt"
function _fcName(p, limit) {
  if (!p) return '';
  const nm = p.name || p.id || '';
  if (!limit || nm.length <= limit) return nm;
  const inits = (p.given || '').trim().split(/\s+/).map(w => w[0] + '.').join(' ');
  const short = inits ? inits + ' ' + (p.surname || '') : '';
  if (short && short.length <= limit) return short;
  return nm.substring(0, limit - 1) + '…';
}

})();
