'use strict';
// ==========================================
//  Zeitleiste — ui-timeline.js
// ==========================================

(function () {

// ── Öffentliche API ────────────────────────

// Aktive Filter — alle standardmäßig an
UIState._tlFilters = UIState._tlFilters || new Set(['war','disease','political','religion','natural']);

const _TL_FILTER_LABELS = {
  war:      '⚔ Krieg',
  disease:  '☠ Seuche',
  political:'⚑ Politik',
  religion: '⛪ Religion',
  natural:  '⚡ Natur',
};

window.showTimeline = function (pid, pushHistory) {
  pid = pid || AppState.currentPersonId;
  if (!pid || !getPerson(pid)) return;

  if (pushHistory !== false) {
    const cur = _captureCurrentNavState();
    if (cur) UIState._navHistory.push(cur);
    UIState._navFwdStack = [];
  }

  UIState._timelinePid = pid;
  const p = getPerson(pid);
  document.getElementById('tlTopTitle').textContent = p.name || pid;
  _renderFilterBar();
  document.getElementById('tlBody').innerHTML = '';

  showView('v-timeline');
  _updateNavBtns();

  // Vollbild-Button nur auf Desktop sichtbar
  const fsBtn = document.getElementById('tlFsBtn');
  if (fsBtn) fsBtn.hidden = !document.body.classList.contains('desktop-mode');

  _renderTimeline(pid);
};

window.toggleTimelineFullscreen = function () {
  const isFs = document.body.classList.toggle('timeline-fullscreen');
  const btn = document.getElementById('tlFsBtn');
  if (btn) {
    btn.textContent = isFs ? '⤡' : '⤢';
    btn.title = isFs ? 'Sidebar einblenden' : 'Vollbild';
  }
  // Swim-Lane neu rendern nach Browser-Layout
  if (UIState._timelinePid && _isTlHoriz()) {
    _afterLayout(() => _renderTimeline(UIState._timelinePid));
  }
};

function _renderFilterBar() {
  const bar = document.getElementById('tlFilterBar');
  if (!bar) return;
  bar.innerHTML = Object.entries(_TL_FILTER_LABELS).map(([cat, lbl]) =>
    `<button class="tl-filter-btn${UIState._tlFilters.has(cat) ? ' active' : ''}" data-action="tlFilter" data-cat="${cat}">${lbl}</button>`
  ).join('');
}

window._tlFilterToggle = function (cat) {
  if (UIState._tlFilters.has(cat)) UIState._tlFilters.delete(cat);
  else UIState._tlFilters.add(cat);
  _renderFilterBar();
  if (UIState._timelinePid) _renderTimeline(UIState._timelinePid);
};

// ── Rendering ──────────────────────────────────
// Inline-style-Attribute werden durch CSP (style-src 'self') verworfen.
// Lösung: HTML ohne style-Attribute bauen, Werte in data-* speichern,
// danach per element.style.xxx = ... anwenden (JS-CSSOM ist CSP-konform).

const _TL_PX_EMPTY   = 36;   // Höhe einer leeren Dekade (px)
const _TL_PX_PER_EV  = 58;   // Höhe pro Event innerhalb einer Dekade
const _TL_PX_DEC_MIN = 90;   // Mindesthöhe einer belegten Dekade

// Swim-Lane-Konstanten (horizontale Variante)
const _SL_LABEL_W  = 76;   // px — sticky Lane-Label-Breite
const _SL_MIN_PX_Y = 14;   // px/Jahr — Mindest-Skalierung
const _SL_CHIP_W   = 140;  // px — nominale Chip-Breite für Kollisionserkennung
const _SL_PAD_YR   = 1.5;  // Jahre — Rand links/rechts der Zeitachse

const _SL_LANES = [
  { id: 'life',   label: 'Leben',      h: 50, always: true  },
  { id: 'resi',   label: 'Wohnorte',   h: 58, always: false },
  { id: 'work',   label: 'Beruf',      h: 58, always: false },
  { id: 'family', label: 'Familie',    h: 62, always: false },
  { id: 'church', label: 'Kirche',     h: 58, always: false },
  { id: 'other',  label: 'Sonstiges',  h: 58, always: false },
  { id: 'hist',   label: 'Geschichte', h: 44, always: false },
];

function _isTlHoriz() {
  return window.innerWidth > window.innerHeight && window.innerWidth >= 500;
}

// Neu rendern bei Orientierungswechsel
let _tlResizeTimer = null;
window.addEventListener('resize', () => {
  if (!UIState._timelinePid) return;
  if (document.getElementById('v-timeline')?.classList.contains('active')) {
    clearTimeout(_tlResizeTimer);
    _tlResizeTimer = setTimeout(() => _renderTimeline(UIState._timelinePid), 150);
  }
});

// ── Dispatcher ─────────────────────────────────────
function _renderTimeline(pid) {
  const isH       = _isTlHoriz();
  const personEvs = _buildPersonEvents(pid, isH);
  const body      = document.getElementById('tlBody');
  const datedEvs  = personEvs.filter(e => e.year !== null);
  if (!datedEvs.length) {
    body.innerHTML = '<p class="tl-empty">Keine datierten Ereignisse vorhanden.</p>';
    body.classList.remove('horiz');
    return;
  }
  const minYear   = Math.min(...datedEvs.map(e => e.year));
  const maxYear   = Math.max(...datedEvs.map(e => e.year));
  const filters   = UIState._tlFilters || new Set(['war','disease','political','religion','natural']);
  const histEvs   = _HIST_EVENTS.filter(e => e.year >= minYear - 2 && e.year <= maxYear + 2 && filters.has(e.cat));
  const decStart  = Math.floor(minYear / 10) * 10;
  const decEnd    = Math.floor(maxYear / 10) * 10;
  const birthEv   = datedEvs.find(e => e.type === 'birth');
  const deathEv   = datedEvs.find(e => e.type === 'death');
  const birthYear = birthEv?.year ?? null;
  const age = y => birthYear !== null ? ` (${y - birthYear})` : '';

  if (isH) {
    _renderTlH(personEvs, histEvs, birthEv, deathEv, age, body);
  } else {
    _renderTlV(datedEvs, histEvs, decStart, decEnd, birthEv, deathEv, age, body);
  }
}

// ── Vertikal ───────────────────────────────────────
function _renderTlV(personEvs, histEvs, decStart, decEnd, birthEv, deathEv, age, body) {
  const decades = [];
  for (let d = decStart; d <= decEnd; d += 10) {
    const pEvs = personEvs.filter(e => e.year >= d && e.year < d + 10);
    const hEvs = histEvs.filter(e => e.year >= d && e.year < d + 10);
    const count = pEvs.length + hEvs.length;
    const height = count ? Math.max(count * _TL_PX_PER_EV + 20, _TL_PX_DEC_MIN) : _TL_PX_EMPTY;
    decades.push({ d, pEvs, hEvs, count, height });
  }
  const _decOffset = y => {
    let off = 0;
    for (const dec of decades) {
      if (y !== null && dec.d <= y && y < dec.d + 10) return off + (y - dec.d) / 10 * dec.height;
      off += dec.height;
    }
    return off;
  };
  const spanTop    = birthEv ? _decOffset(birthEv.year) : 0;
  const totalH     = decades.reduce((s, d) => s + d.height, 0);
  const spanBottom = deathEv ? _decOffset(deathEv.year) : totalH;

  body.classList.remove('horiz');
  let html = '<div class="tl-wrap">';
  html += `<div class="tl-lifespan" data-top="${spanTop}" data-h="${Math.max(spanBottom - spanTop, 4)}"></div>`;
  for (const dec of decades) {
    html += `<div class="tl-decade" data-h="${dec.height}">`;
    html += `<div class="tl-dec-label">${dec.d}er</div>`;
    html += '<div class="tl-axis-seg"></div>';
    if (dec.count) {
      const all = [
        ...dec.pEvs.map(e => ({ ...e, side: 'p' })),
        ...dec.hEvs.map(e => ({ ...e, side: 'h' })),
      ].sort((a, b) => a.year - b.year);
      const innerH = dec.height - 20;
      all.forEach((ev, i) => {
        const top = 14 + (all.length > 1 ? i * (innerH / all.length) : innerH / 2 - 10);
        if (ev.side === 'p') {
          html += `<div class="tl-ev tl-ev--${ev.type}" data-top="${top}">`;
          html += `<span class="tl-y">${ev.year}${age(ev.year)}</span>`;
          html += `<span class="tl-lbl">${_esc(ev.label)}</span>`;
          if (ev.place) html += `<span class="tl-place">${_esc(ev.place)}</span>`;
          html += '</div>';
        } else {
          html += `<div class="tl-hist tl-hist--${ev.cat}" data-top="${top}">`;
          html += `<span class="tl-y">${ev.year}</span>`;
          html += `<span class="tl-lbl">${_esc(ev.label)}</span>`;
          html += '</div>';
        }
      });
    }
    html += '</div>';
  }
  html += '</div>';
  body.innerHTML = html;
  body.querySelectorAll('[data-h]').forEach(el => { el.style.height = el.dataset.h + 'px'; });
  body.querySelectorAll('[data-top]').forEach(el => { el.style.top   = el.dataset.top + 'px'; });
}

// ── Swim-Lane-Helfer ───────────────────────────────

function _swimLane(type, gedType, eventType) {
  if (['birth','chr','death','buri'].includes(type)) return 'life';
  if (['marr','enga','div','child'].includes(type)) return 'family';
  const t  = (gedType   || '').toUpperCase();
  const et = (eventType || '').toUpperCase();
  if (['RESI','EMIG','IMMI','NATU'].includes(t)) return 'resi';
  if (['OCCU','TITL','EDUC','GRAD','RETI'].includes(t)) return 'work';
  if (t === 'EVEN' && /BESCH[AÄ]FTIGUNG|BERUF|AUSBILDUNG|OCCUPATION|EMPLOYMENT/i.test(et)) return 'work';
  if (['RELI','CONF','FCOM','ORDN','CENS','MILI','ADOP'].includes(t)) return 'church';
  return 'other';
}

function _resolveSwimOverlaps(chips, chipW) {
  let lastRight = -Infinity, dir = 1;
  for (const c of chips) {
    if (c.pxLeft < lastRight + 6) {
      c.nudge = 10 * dir;
      dir = -dir;
    } else {
      c.nudge = 0;
      dir = 1;
    }
    lastRight = Math.max(lastRight, c.pxLeft + chipW);
  }
}

function _swimChipHTML(ev, age) {
  const yr  = ev.year !== null ? `<span class="tl-y">${ev.year}${age(ev.year)}</span>` : '';
  const pl  = ev.place ? `<span class="tl-place">${_esc(ev.place)}</span>` : '';
  const nd  = ev.nudge ? ` data-nudge="${ev.nudge}"` : '';
  const und = ev.pxLeft === null ? ' tl-chip--undated' : '';
  const dl  = ev.pxLeft !== null ? ` data-left="${ev.pxLeft}"` : '';
  const title = _esc(ev.title || ev.label || '');
  const desc  = ev.desc ? `<span class="tl-desc">${_esc(ev.desc)}</span>` : '';
  return `<div class="tl-chip tl-chip--${ev.type || 'event'}${und}"${dl}${nd}>` +
         `${yr}<span class="tl-type">${title}</span>${desc}${pl}</div>`;
}

// ── Horizontal — Swim-Lane-Layout ─────────────────
function _renderTlH(personEvs, histEvs, birthEv, deathEv, age, body) {
  const datedEvs   = personEvs.filter(e => e.year !== null);
  const undatedEvs = personEvs.filter(e => e.year === null);

  // Jahres-Skala
  const allYrs    = datedEvs.map(e => e.year).concat(histEvs.map(e => e.year));
  const minYear   = Math.min(...allYrs);
  const maxYear   = Math.max(...allYrs);
  const span      = Math.max(maxYear - minYear, 10);
  const availW    = Math.max((body.clientWidth || window.innerWidth) - _SL_LABEL_W - 16, 200);

  // Mindest-px/Jahr aus Event-Dichte: dichteste Lane bestimmt Breite
  const _laneYrs = {};
  for (const ln of _SL_LANES) _laneYrs[ln.id] = [];
  for (const ev of datedEvs) _laneYrs[_swimLane(ev.type, ev.gedType, ev.eventType)].push(ev.year);
  let _minDist = Infinity;
  for (const id of Object.keys(_laneYrs)) {
    const ys = _laneYrs[id].sort((a, b) => a - b);
    for (let i = 1; i < ys.length; i++) {
      if (ys[i] > ys[i - 1]) _minDist = Math.min(_minDist, ys[i] - ys[i - 1]);
    }
  }
  if (_minDist === Infinity) _minDist = span || 10;

  const pxForFit   = availW / (span + _SL_PAD_YR * 2);
  const pxForChips = Math.min((_SL_CHIP_W + 4) / _minDist, 40); // max 40px/Jahr
  const pxPerYear  = Math.max(pxForFit, pxForChips, _SL_MIN_PX_Y);
  // totalW: Inhalt + rechter Chip-Puffer, mindestens Container-Breite
  const totalW     = Math.max(
    Math.ceil((span + _SL_PAD_YR * 2 + 1) * pxPerYear) + _SL_CHIP_W,
    availW
  );
  const yearToX   = y => Math.round((y - minYear + _SL_PAD_YR) * pxPerYear);

  // Events in Lanes klassifizieren
  const laneEvs = {}, laneUnd = {};
  for (const ln of _SL_LANES) { laneEvs[ln.id] = []; laneUnd[ln.id] = []; }
  for (const ev of datedEvs) {
    const lid = _swimLane(ev.type, ev.gedType, ev.eventType);
    laneEvs[lid].push({ ...ev, pxLeft: yearToX(ev.year), nudge: 0 });
  }
  for (const ev of undatedEvs) {
    laneUnd[_swimLane(ev.type, ev.gedType, ev.eventType)].push({ ...ev, pxLeft: null, nudge: 0 });
  }
  laneEvs['hist'] = histEvs.map(e => ({ ...e, pxLeft: yearToX(e.year), nudge: 0 }));

  // Überlappungen je Lane auflösen
  for (const ln of _SL_LANES) {
    laneEvs[ln.id].sort((a,b) => a.pxLeft - b.pxLeft);
    _resolveSwimOverlaps(laneEvs[ln.id], ln.id === 'hist' ? 88 : _SL_CHIP_W);
  }

  // Aktive Lanes: Leben immer, andere nur wenn darstellbare Events vorhanden.
  // work/family zeigen auch undatierte Events (gestapelt) → zählen mit.
  // resi/church/other: nur datierte Events zählen (undatierte werden nicht gerendert).
  const activeLanes = _SL_LANES.filter(ln => {
    if (ln.id === 'life')   return true;
    if (ln.id === 'hist')   return laneEvs['hist'].length > 0;
    if (ln.id === 'work')   return laneEvs['work'].length > 0   || laneUnd['work'].length > 0;
    if (ln.id === 'family') return laneEvs['family'].length > 0 || laneUnd['family'].filter(e => e.type === 'child').length > 0;
    return laneEvs[ln.id].length > 0; // resi / church / other: nur datierte
  });

  body.classList.add('horiz');
  let html = '<div class="tl-swim">';

  // Jahres-Ticks
  html += `<div class="tl-swim-axis">`;
  html += `<div class="tl-swim-axis-pad" data-w="${_SL_LABEL_W}"></div>`;
  html += `<div class="tl-swim-axis-track" data-w="${totalW}">`;
  const tick0 = Math.ceil(minYear / 10) * 10;
  for (let y = tick0; y <= maxYear + 1; y += 10) {
    html += `<div class="tl-tick" data-left="${yearToX(y)}">${y}</div>`;
  }
  html += '</div></div>';

  // Lanes
  for (const lane of activeLanes) {
    const evs = laneEvs[lane.id] || [];
    html += `<div class="tl-lane tl-lane--${lane.id}" data-h="${lane.h}">`;
    html += `<div class="tl-lane-lbl">${lane.label}</div>`;
    html += `<div class="tl-lane-body" data-w="${totalW}">`;

    if (lane.id === 'life') {
      if (birthEv && deathEv) {
        const barL = yearToX(birthEv.year);
        const barW = Math.max(yearToX(deathEv.year) - barL, 4);
        html += `<div class="tl-swim-span" data-left="${barL}" data-bw="${barW}"></div>`;
      }
      for (const ev of evs) html += _swimChipHTML(ev, age);

    } else if (lane.id === 'hist') {
      for (const ev of evs) {
        html += `<div class="tl-hist-evt tl-hist-evt--${ev.cat}" data-left="${ev.pxLeft}">`;
        html += `<span class="tl-y">${ev.year}</span><span class="tl-lbl">${_esc(ev.label)}</span></div>`;
      }

    } else {
      for (const ev of evs) html += _swimChipHTML(ev, age);
      // Undatierte Beruf-Events → linker Rand, gestapelt
      if (lane.id === 'work') {
        laneUnd['work'].forEach((ev, i) => {
          html += `<div class="tl-chip tl-chip--event tl-chip--undated" data-stacki="${i}">` +
                  `<span class="tl-lbl">${_esc(ev.label)}</span></div>`;
        });
      }
      // Undatierte Kinder → rechter Rand, gestapelt
      if (lane.id === 'family') {
        laneUnd['family'].filter(e => e.type === 'child').forEach((ev, i) => {
          html += `<div class="tl-chip tl-chip--child tl-chip--undated tl-chip--right" data-stacki="${i}">` +
                  `<span class="tl-lbl">${_esc(ev.label)}</span></div>`;
        });
      }
    }

    html += '</div></div>';
  }
  html += '</div>';
  body.innerHTML = html;

  // Lanehöhen proportional auf verfügbare Höhe skalieren
  {
    const _axisH  = 26;
    const _availH = Math.max((body.clientHeight || window.innerHeight - 150) - _axisH, 200);
    const _laneEls = [...body.querySelectorAll('.tl-lane[data-h]')];
    const _baseH  = _laneEls.reduce((s, el) => s + parseInt(el.dataset.h), 0);
    if (_availH > _baseH && _laneEls.length > 0) {
      const _scale = _availH / _baseH;
      _laneEls.forEach(el => { el.dataset.h = String(Math.round(parseInt(el.dataset.h) * _scale)); });
    }
  }

  // Positionen via CSSOM setzen (CSP: kein inline style-Attribut)
  // Achse + Lanes auf volle Scroll-Breite ausdehnen (border-bottom folgt)
  const _fullW = _SL_LABEL_W + totalW;
  body.querySelectorAll('.tl-swim-axis, .tl-lane').forEach(el => {
    el.style.minWidth = _fullW + 'px';
  });
  body.querySelectorAll('.tl-swim-axis-pad[data-w]').forEach(el => {
    el.style.width = el.dataset.w + 'px';
    el.style.flexShrink = '0';
  });
  body.querySelectorAll('.tl-swim-axis-track[data-w]').forEach(el => {
    el.style.width = el.dataset.w + 'px';
    el.style.flexShrink = '0';
  });
  body.querySelectorAll('.tl-lane-body[data-w]').forEach(el => {
    el.style.minWidth = el.dataset.w + 'px';
  });
  body.querySelectorAll('.tl-lane[data-h]').forEach(el => { el.style.height = el.dataset.h + 'px'; });
  // Historische Ereignisse: nur links positionieren, kein Chip-Top
  body.querySelectorAll('.tl-hist-evt[data-left]').forEach(el => {
    el.style.left = el.dataset.left + 'px';
  });
  body.querySelectorAll('.tl-tick[data-left]').forEach(el => { el.style.left = el.dataset.left + 'px'; });
  body.querySelectorAll('.tl-swim-span').forEach(el => {
    el.style.left  = el.dataset.left + 'px';
    el.style.width = el.dataset.bw + 'px';
  });
  // Datierte Chips: position + vertikale Zentrierung via offsetHeight + Nudge
  body.querySelectorAll('.tl-chip[data-left]').forEach(el => {
    const lH    = parseInt(el.closest('.tl-lane')?.dataset.h || 58);
    const nudge = parseInt(el.dataset.nudge || 0);
    const chipH = el.offsetHeight || 40;
    el.style.left = el.dataset.left + 'px';
    el.style.top  = Math.round(Math.max((lH - chipH) / 2 + nudge, 4)) + 'px';
  });
  // Undatierte Links-gestapelt (Beruf)
  body.querySelectorAll('.tl-chip--undated[data-stacki]:not(.tl-chip--right)').forEach(el => {
    el.style.left = '2px';
    el.style.top  = (4 + parseInt(el.dataset.stacki) * 22) + 'px';
  });
  // Undatierte Rechts-gestapelt (Kinder ohne Datum)
  body.querySelectorAll('.tl-chip--right[data-stacki]').forEach(el => {
    el.style.right = '2px';
    el.style.top   = (4 + parseInt(el.dataset.stacki) * 22) + 'px';
  });
}

function _esc(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function _shortPlace(place) {
  if (!place) return '';
  return place.split(',').map(s => s.trim()).find(s => s) || '';
}

// ── Event-Extraktion ───────────────────────────

function _buildPersonEvents(pid, includeUndated) {
  const p = getPerson(pid);
  if (!p) return [];
  const evs = [];

  // Sonder-Ereignisse (BIRT/CHR/DEAT/BURI — immer datiert)
  const special = [
    ['birth', 'Geburt'],
    ['chr',   'Taufe'],
    ['death', 'Tod'],
    ['buri',  'Beerdigung'],
  ];
  for (const [key, label] of special) {
    const ev = p[key];
    if (ev?.seen && ev.date) {
      evs.push({ year: _dedupYearFromGed(ev.date), date: ev.date, label, title: label, desc: '', type: key, place: _shortPlace(ev.place) });
    }
  }

  // Reguläre Ereignisse
  for (const ev of (p.events || [])) {
    if (!ev.date && !includeUndated) continue;
    const baseLabel = ev.eventType || EVENT_LABELS[ev.type] || ev.type;
    const desc  = ev.value || '';
    const label = baseLabel + (desc ? ': ' + desc : '');
    const addrLine = ev.addr ? ev.addr.split('\n')[0].trim() : '';
    const placePart = _shortPlace(ev.place);
    const place = [addrLine, placePart].filter(Boolean).join(', ');
    const year = ev.date ? _dedupYearFromGed(ev.date) : null;
    evs.push({ year, date: ev.date || null, label, title: baseLabel, desc, type: 'event', gedType: ev.type, eventType: ev.eventType || '', place });
  }

  // Familien: Heirat + Kinder
  for (const famId of (p.fams || [])) {
    const f = getFamily(famId);
    if (!f) continue;
    if (f.marr?.seen && f.marr.date) {
      const partnerId = (p.id === f.husb) ? f.wife : f.husb;
      const partner = partnerId ? getPerson(partnerId) : null;
      const partnerName = partner ? (partner.surname || partner.given || '') : '';
      const label = 'Heirat' + (partnerName ? ': ' + partnerName : '');
      evs.push({ year: _dedupYearFromGed(f.marr.date), date: f.marr.date, label, title: 'Heirat', desc: partnerName, type: 'marr', place: _shortPlace(f.marr.place) });
    }
    for (const cid of (f.children || [])) {
      const c = getPerson(cid);
      if (!c?.birth?.seen) continue;
      if (!c.birth.date && !includeUndated) continue;
      const childName = c.given || c.name || cid;
      const year = c.birth.date ? _dedupYearFromGed(c.birth.date) : null;
      evs.push({ year, date: c.birth.date || null, label: 'Kind: ' + childName, title: 'Kind', desc: childName, type: 'child', place: _shortPlace(c.birth.place) });
    }
  }

  const dated   = evs.filter(e => e.year !== null).sort((a, b) => a.year - b.year);
  const undated = evs.filter(e => e.year === null);
  return includeUndated ? [...dated, ...undated] : dated;
}

})();
