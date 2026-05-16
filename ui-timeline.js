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
  _renderTimeline(pid);
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

const _TL_PX_EMPTY   = 36;   // Höhe einer leeren Dekade (px)
const _TL_PX_PER_EV  = 58;   // Höhe pro Event innerhalb einer Dekade
const _TL_PX_DEC_MIN = 90;   // Mindesthöhe einer belegten Dekade

function _renderTimeline(pid) {
  const personEvs = _buildPersonEvents(pid);
  const body = document.getElementById('tlBody');
  if (!personEvs.length) {
    body.innerHTML = '<p class="tl-empty">Keine datierten Ereignisse vorhanden.</p>';
    return;
  }

  const minYear = Math.min(...personEvs.map(e => e.year));
  const maxYear = Math.max(...personEvs.map(e => e.year));
  const filters = UIState._tlFilters || new Set(['war','disease','political','religion','natural']);
  const histEvs = _HIST_EVENTS.filter(e => e.year >= minYear - 2 && e.year <= maxYear + 2 && filters.has(e.cat));

  // Dekaden-Struktur
  const decStart = Math.floor(minYear / 10) * 10;
  const decEnd   = Math.floor(maxYear / 10) * 10;
  const decades  = [];
  for (let d = decStart; d <= decEnd; d += 10) {
    const pEvs = personEvs.filter(e => e.year >= d && e.year < d + 10);
    const hEvs = histEvs.filter(e => e.year >= d && e.year < d + 10);
    const count = pEvs.length + hEvs.length;
    const height = count ? Math.max(count * _TL_PX_PER_EV + 20, _TL_PX_DEC_MIN) : _TL_PX_EMPTY;
    decades.push({ d, pEvs, hEvs, count, height });
  }

  // Alter einer Person zu einem Jahr berechnen
  const birthYear = personEvs.find(e => e.type === 'birth')?.year ?? null;
  const age = y => birthYear !== null ? ` (${y - birthYear})` : '';

  // Lebensspanne-Balken: Offset der Geburts- und Todesdekade berechnen
  const birthEv = personEvs.find(e => e.type === 'birth');
  const deathEv = personEvs.find(e => e.type === 'death');
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
  const spanStyle  = `top:${spanTop}px;height:${Math.max(spanBottom - spanTop, 4)}px`;

  // HTML aufbauen
  let html = '<div class="tl-wrap">';
  html += `<div class="tl-lifespan" style="${spanStyle}"></div>`;

  for (const dec of decades) {
    html += `<div class="tl-decade" style="height:${dec.height}px">`;
    html += `<div class="tl-dec-label">${dec.d}er</div>`;
    html += '<div class="tl-axis-seg"></div>';

    if (dec.count) {
      // Alle Events gemischt, nach Jahr sortiert
      const all = [
        ...dec.pEvs.map(e => ({ ...e, side: 'p' })),
        ...dec.hEvs.map(e => ({ ...e, side: 'h' })),
      ].sort((a, b) => a.year - b.year);

      const innerH = dec.height - 20;
      all.forEach((ev, i) => {
        const top = 14 + (all.length > 1 ? i * (innerH / (all.length)) : innerH / 2 - 10);
        if (ev.side === 'p') {
          html += `<div class="tl-ev tl-ev--${ev.type}" style="top:${top}px">`;
          html += `<span class="tl-y">${ev.year}${age(ev.year)}</span>`;
          html += `<span class="tl-lbl">${_esc(ev.label)}</span>`;
          if (ev.place) html += `<span class="tl-place">${_esc(ev.place)}</span>`;
          html += '</div>';
        } else {
          html += `<div class="tl-hist tl-hist--${ev.cat}" style="top:${top}px">`;
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
}

function _esc(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Historische Ereignisse ─────────────────────
// Deutschsprachiger Raum · Kategorien: war / disease / political / religion / natural

const _HIST_EVENTS = [
  { year:1315, label:'Große Hungersnot in Europa',              cat:'natural'  },
  { year:1347, label:'Schwarzer Tod — Pest erreicht Europa',    cat:'disease'  },
  { year:1356, label:'Goldene Bulle (Reichsverfassung)',        cat:'political'},
  { year:1386, label:'Gründung Universität Heidelberg',         cat:'political'},
  { year:1431, label:'Verbrennung Jeanne d\'Arc',               cat:'political'},
  { year:1450, label:'Gutenberg-Bibel — Buchdruck',            cat:'political'},
  { year:1492, label:'Columbus erreicht Amerika',               cat:'political'},
  { year:1517, label:'Luthers Thesenanschlag — Reformation',   cat:'religion' },
  { year:1524, label:'Bauernkrieg in Deutschland',              cat:'war'      },
  { year:1555, label:'Augsburger Religionsfriede',              cat:'religion' },
  { year:1572, label:'Bartholomäusnacht (Frankreich)',          cat:'war'      },
  { year:1618, label:'Dreißigjähriger Krieg beginnt',          cat:'war'      },
  { year:1633, label:'Pest in München (ca. 7000 Tote)',        cat:'disease'  },
  { year:1648, label:'Westfälischer Friede — Ende 30j. Krieg', cat:'war'      },
  { year:1683, label:'Türkenbelagerung Wiens',                  cat:'war'      },
  { year:1700, label:'Großer Nordischer Krieg beginnt',         cat:'war'      },
  { year:1709, label:'Große Hungersnot in Zentraleuropa',      cat:'natural'  },
  { year:1740, label:'Österreichischer Erbfolgekrieg',          cat:'war'      },
  { year:1756, label:'Siebenjähriger Krieg',                    cat:'war'      },
  { year:1763, label:'Hubertusburger Friede',                   cat:'war'      },
  { year:1789, label:'Französische Revolution',                 cat:'political'},
  { year:1796, label:'Napoleon in Italien — Feldzüge beginnen', cat:'war'     },
  { year:1803, label:'Reichsdeputationshauptschluss',           cat:'political'},
  { year:1806, label:'Ende des Heiligen Röm. Reiches',          cat:'political'},
  { year:1813, label:'Völkerschlacht bei Leipzig',              cat:'war'      },
  { year:1815, label:'Wiener Kongress — Neuordnung Europas',   cat:'political'},
  { year:1830, label:'Julirevolution in Frankreich',            cat:'political'},
  { year:1832, label:'Hambacher Fest — Demokratiebewegung',    cat:'political'},
  { year:1845, label:'Irische Hungersnot — Massenemigration',  cat:'natural'  },
  { year:1848, label:'Märzrevolution in Deutschland',           cat:'political'},
  { year:1849, label:'Niederschlagung der Revolution',          cat:'political'},
  { year:1854, label:'Krimkrieg',                               cat:'war'      },
  { year:1866, label:'Deutschen Krieg (Preußen–Österreich)',   cat:'war'      },
  { year:1870, label:'Deutsch-Französischer Krieg',            cat:'war'      },
  { year:1871, label:'Gründung Deutsches Reich',               cat:'political'},
  { year:1873, label:'Gründerkrach — Wirtschaftskrise',        cat:'political'},
  { year:1878, label:'Sozialistengesetz (Bismarck)',            cat:'political'},
  { year:1888, label:'Dreikaiserjahr — Wilhelm II. Kaiser',    cat:'political'},
  { year:1890, label:'Bismarck entlassen',                      cat:'political'},
  { year:1900, label:'Boxer-Aufstand · Weltausstellung Paris',  cat:'political'},
  { year:1905, label:'Erstes Marokko-Krieg / Algeciraskonferenz', cat:'war'   },
  { year:1914, label:'Erster Weltkrieg beginnt',                cat:'war'      },
  { year:1916, label:'Verdun · Somme — Massensterben',         cat:'war'      },
  { year:1917, label:'Russische Revolution',                    cat:'political'},
  { year:1918, label:'Ende WWI · Spanische Grippe',            cat:'disease'  },
  { year:1919, label:'Weimarer Republik · Versailler Vertrag', cat:'political'},
  { year:1923, label:'Hyperinflation in Deutschland',           cat:'political'},
  { year:1929, label:'Weltwirtschaftskrise',                    cat:'political'},
  { year:1933, label:'NS-Machtübernahme',                       cat:'political'},
  { year:1935, label:'Nürnberger Gesetze',                      cat:'political'},
  { year:1938, label:'Anschluss Österreichs · Kristallnacht',  cat:'political'},
  { year:1939, label:'Zweiter Weltkrieg beginnt',               cat:'war'      },
  { year:1942, label:'Wannseekonferenz · Holocaust',            cat:'war'      },
  { year:1943, label:'Stalingrad — Wendepunkt',                 cat:'war'      },
  { year:1945, label:'Ende Zweiter Weltkrieg',                  cat:'war'      },
  { year:1948, label:'Berliner Blockade · Währungsreform',      cat:'political'},
  { year:1949, label:'Gründung BRD und DDR',                    cat:'political'},
  { year:1953, label:'Volksaufstand DDR',                       cat:'political'},
  { year:1957, label:'Römische Verträge — EWG gegründet',      cat:'political'},
  { year:1961, label:'Mauerbau Berlin',                         cat:'political'},
  { year:1968, label:'Prager Frühling · Studentenbewegung',    cat:'political'},
  { year:1972, label:'Olympia München — Terroranschlag',        cat:'political'},
  { year:1986, label:'Tschernobyl-Reaktorunfall',               cat:'natural'  },
  { year:1989, label:'Mauerfall Berlin',                        cat:'political'},
  { year:1990, label:'Deutsche Wiedervereinigung',              cat:'political'},
  { year:1993, label:'Maastricht-Vertrag — EU gegründet',      cat:'political'},
  { year:2002, label:'Euro-Bargeld eingeführt',                 cat:'political'},
];

// ── Event-Extraktion ───────────────────────────

function _buildPersonEvents(pid) {
  const p = getPerson(pid);
  if (!p) return [];
  const evs = [];

  // Sonder-Ereignisse
  const special = [
    ['birth', 'Geburt'],
    ['chr',   'Taufe'],
    ['death', 'Tod'],
    ['buri',  'Beerdigung'],
  ];
  for (const [key, label] of special) {
    const ev = p[key];
    if (ev?.seen && ev.date) {
      evs.push({ year: _dedupYearFromGed(ev.date), date: ev.date, label, type: key, place: ev.place || '' });
    }
  }

  // Reguläre Ereignisse
  for (const ev of (p.events || [])) {
    if (!ev.date) continue;
    const label = (EVENT_LABELS[ev.type] || ev.type) + (ev.value ? ': ' + ev.value : '');
    evs.push({ year: _dedupYearFromGed(ev.date), date: ev.date, label, type: 'event', place: ev.place || '' });
  }

  // Familien: Heirat + Kinder
  for (const famId of (p.fams || [])) {
    const f = getFamily(famId);
    if (!f) continue;
    if (f.marr?.seen && f.marr.date) {
      // Ehepartner-Name für das Label
      const partnerId = (p.id === f.husb) ? f.wife : f.husb;
      const partner = partnerId ? getPerson(partnerId) : null;
      const partnerName = partner ? (partner.surname || partner.given || '') : '';
      const label = 'Heirat' + (partnerName ? ': ' + partnerName : '');
      evs.push({ year: _dedupYearFromGed(f.marr.date), date: f.marr.date, label, type: 'marr', place: f.marr.place || '' });
    }
    for (const cid of (f.children || [])) {
      const c = getPerson(cid);
      if (!c?.birth?.seen || !c.birth.date) continue;
      const childName = c.given || c.name || cid;
      evs.push({ year: _dedupYearFromGed(c.birth.date), date: c.birth.date, label: 'Kind: ' + childName, type: 'child', place: c.birth.place || '' });
    }
  }

  return evs.filter(e => e.year !== null).sort((a, b) => a.year - b.year);
}

})();
