// ─────────────────────────────────────
//  STATISTIK-DASHBOARD
// ─────────────────────────────────────

function renderStatsTab() {
  const el = document.getElementById('tab-stats');
  if (!el) return;

  const persons  = Object.values(AppState.db.individuals);
  const families = Object.values(AppState.db.families);
  const sources  = Object.values(AppState.db.sources);
  const repos    = Object.values(AppState.db.repositories || {});
  const n        = persons.length;
  if (!n) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><div>Keine Daten geladen</div></div>'; return; }

  // ── Basiswerte ──
  const nM = persons.filter(p => p.sex === 'M').length;
  const nF = persons.filter(p => p.sex === 'F').length;
  const nU = n - nM - nF;

  const mediaSet = new Set();
  for (const p of persons) (p.media || []).forEach(m => m.file && mediaSet.add(m.file));
  for (const f of families) (f.marr?.media || []).forEach(m => m.file && mediaSet.add(m.file));
  for (const s of sources)  (s.media  || []).forEach(m => m.file && mediaSet.add(m.file));

  const placesMap = collectPlaces ? collectPlaces() : new Map();
  const nPlaces = placesMap instanceof Map ? placesMap.size : (placesMap.length || 0);

  // ── Vollständigkeit ──
  const hasBirth  = persons.filter(p => p.birth?.date || p.birth?.place).length;
  const hasDeath  = persons.filter(p => p.death?.date || p.death?.place).length;
  const hasSex    = nM + nF;
  const hasSrc    = persons.filter(p =>
    (p.topSources?.length || 0) + (p.nameSources?.length || 0) +
    (p.birth?.citations?.length || 0) + (p.death?.citations?.length || 0) +
    (p.events?.some(ev => ev.citations?.length > 0) ? 1 : 0) > 0
  ).length;
  const hasPhoto  = persons.filter(p => (p.media || []).some(m => /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(m.file || ''))).length;

  // ── Top Nachnamen ──
  const surnMap = {};
  persons.forEach(p => { if (p.surname) surnMap[p.surname] = (surnMap[p.surname] || 0) + 1; });
  const topSurn = _statsTop(surnMap, 10);

  // ── Top Vornamen (erster Token) ──
  const givenMap = {};
  persons.forEach(p => { const g = (p.given || '').trim().split(/\s+/)[0].replace(/[,;.]+$/, ''); if (g) givenMap[g] = (givenMap[g] || 0) + 1; });
  const topGiven = _statsTop(givenMap, 10);

  // ── Top Geburtsorte ──
  const bplMap = {};
  persons.forEach(p => { const pl = compactPlace(p.birth?.place); if (pl) bplMap[pl] = (bplMap[pl] || 0) + 1; });
  const topBpl = _statsTop(bplMap, 8);

  // ── Top Sterbeorte (STATS-2) ──
  const dplMap = {};
  persons.forEach(p => { const pl = compactPlace(p.death?.place); if (pl) dplMap[pl] = (dplMap[pl] || 0) + 1; });
  const topDpl = _statsTop(dplMap, 8);

  // ── Zeitliche Verteilung (50-Jahres-Bins, Geburten) ──
  const binMap = {};
  persons.forEach(p => {
    const y = _yearFrom(p.birth?.date || p.chr?.date);
    if (y) { const bin = Math.floor(y / 50) * 50; binMap[bin] = (binMap[bin] || 0) + 1; }
  });
  const binEntries = Object.entries(binMap).sort((a, b) => +a[0] - +b[0]);

  // ── STATS-2: Lebensspannen ──
  const lifespans = [];
  persons.forEach(p => {
    const by = _yearFrom(p.birth?.date || p.chr?.date);
    const dy = _yearFrom(p.death?.date || p.buri?.date);
    if (by && dy && dy > by && (dy - by) < 120) lifespans.push(dy - by);
  });
  lifespans.sort((a, b) => a - b);

  // ── STATS-2: Jahrzehnt-Diagramm (Geburten / Sterbefälle / Heiraten) ──
  const decBirth = {}, decDeath = {}, decMarr = {};
  persons.forEach(p => {
    const y = _yearFrom(p.birth?.date || p.chr?.date);
    if (y) { const d = Math.floor(y / 10) * 10; decBirth[d] = (decBirth[d] || 0) + 1; }
  });
  persons.forEach(p => {
    const y = _yearFrom(p.death?.date);
    if (y) { const d = Math.floor(y / 10) * 10; decDeath[d] = (decDeath[d] || 0) + 1; }
  });
  families.forEach(f => {
    const y = _yearFrom(f.marr?.date);
    if (y) { const d = Math.floor(y / 10) * 10; decMarr[d] = (decMarr[d] || 0) + 1; }
  });
  const decKeys = [...new Set([...Object.keys(decBirth), ...Object.keys(decDeath), ...Object.keys(decMarr)])]
    .map(Number).sort((a, b) => a - b);

  // ── STATS-2: Heiratsalter ──
  const marrAges = [];
  families.forEach(f => {
    const my = _yearFrom(f.marr?.date);
    if (!my) return;
    const husb = f.husb ? AppState.db.individuals[f.husb] : null;
    const wife = f.wife ? AppState.db.individuals[f.wife] : null;
    const hby = husb ? _yearFrom(husb.birth?.date || husb.chr?.date) : null;
    const wby = wife ? _yearFrom(wife.birth?.date || wife.chr?.date) : null;
    if (hby && my - hby >= 10 && my - hby <= 80) marrAges.push({ sex: 'M', age: my - hby });
    if (wby && my - wby >= 10 && my - wby <= 80) marrAges.push({ sex: 'F', age: my - wby });
  });
  // 5-Jahres-Bins 10–70
  const marrBins = {};
  marrAges.forEach(({ sex, age }) => {
    const bin = Math.floor(age / 5) * 5;
    if (!marrBins[bin]) marrBins[bin] = { M: 0, F: 0 };
    marrBins[bin][sex]++;
  });
  const marrBinEntries = Object.entries(marrBins).sort((a, b) => +a[0] - +b[0]);
  const marrM = marrAges.filter(a => a.sex === 'M').map(a => a.age);
  const marrF = marrAges.filter(a => a.sex === 'F').map(a => a.age);

  // ── STATS-2: Kinderzahl-Verteilung ──
  const childCountMap = {};
  families.forEach(f => {
    const c = (f.children || []).length;
    const key = c >= 10 ? '10+' : String(c);
    childCountMap[key] = (childCountMap[key] || 0) + 1;
  });
  const childEntries = Object.entries(childCountMap).sort((a, b) => {
    const av = a[0] === '10+' ? 10 : +a[0];
    const bv = b[0] === '10+' ? 10 : +b[0];
    return av - bv;
  });

  // ── Render ──
  let html = '';

  // Übersicht-Kacheln
  html += _statsSection('Übersicht', `
    <div class="stats-grid">
      ${_kachel(n,              'Personen')}
      ${_kachel(families.length,'Familien')}
      ${_kachel(sources.length, 'Quellen')}
      ${_kachel(nPlaces,        'Orte')}
      ${_kachel(repos.length,   'Archive')}
      ${_kachel(mediaSet.size,  'Medien')}
    </div>`);

  // Geschlechterverteilung
  const mW = n ? Math.round(nM / n * 100) : 0;
  const fW = n ? Math.round(nF / n * 100) : 0;
  const uW = 100 - mW - fW;
  html += _statsSection('Geschlecht', `
    <div class="stats-gender-bar">
      <div class="stats-gender-seg" data-il-style="flex:${mW};background:var(--blue)" title="Männlich ${mW}%"></div>
      <div class="stats-gender-seg" data-il-style="flex:${fW};background:var(--pink)" title="Weiblich ${fW}%"></div>
      <div class="stats-gender-seg" data-il-style="flex:${Math.max(uW,1)};background:var(--surface3,var(--surface2))" title="Unbekannt ${uW}%"></div>
    </div>
    <div class="stats-gender-legend">
      <span class="c-blue">♂ ${nM} (${mW}%)</span>
      <span class="c-pink">♀ ${nF} (${fW}%)</span>
      <span class="c-muted">◇ ${nU} (${uW}%)</span>
    </div>`);

  // Datenvollständigkeit
  html += _statsSection('Datenvollständigkeit', [
    ['Geburtsdatum/-ort',  hasBirth, n, 'var(--gold-dim)'],
    ['Sterbedatum/-ort',   hasDeath, n, 'var(--text-dim)'],
    ['Geschlecht bekannt', hasSex,   n, 'var(--blue)'],
    ['Mind. 1 Quelle',     hasSrc,   n, 'var(--green,#4caf50)'],
    ['Foto vorhanden',     hasPhoto, n, 'var(--pink)'],
  ].map(([lbl, k, total, color]) => _progressRow(lbl, k, total, color)).join(''));

  // ── STATS-2: Lebensspannen ──
  if (lifespans.length >= 5) {
    const lsAvg  = Math.round(lifespans.reduce((s, v) => s + v, 0) / lifespans.length);
    const lsMin  = lifespans[0];
    const lsMax  = lifespans[lifespans.length - 1];
    const lsMed  = lifespans[Math.floor(lifespans.length / 2)];
    // Histogramm 10-Jahres-Bins 0–109
    const lsHist = {};
    lifespans.forEach(v => { const b = Math.floor(v / 10) * 10; lsHist[b] = (lsHist[b] || 0) + 1; });
    const lsHistEntries = Object.entries(lsHist).sort((a, b) => +a[0] - +b[0]);
    const lsMax2 = Math.max(...lsHistEntries.map(e => e[1]));
    html += _statsSection(`Lebensspannen (${lifespans.length} Personen)`, `
      <div class="stats-ls-summary">
        <div class="stats-ls-kachel"><div class="stats-ls-val">${lsAvg}</div><div class="stats-ls-lbl">Ø Jahre</div></div>
        <div class="stats-ls-kachel"><div class="stats-ls-val">${lsMed}</div><div class="stats-ls-lbl">Median</div></div>
        <div class="stats-ls-kachel"><div class="stats-ls-val">${lsMin}</div><div class="stats-ls-lbl">Min</div></div>
        <div class="stats-ls-kachel"><div class="stats-ls-val">${lsMax}</div><div class="stats-ls-lbl">Max</div></div>
      </div>
      <div class="stats-timeline">
        ${lsHistEntries.map(([bin, cnt]) => `
          <div class="stats-tl-item">
            <div class="stats-tl-bar-wrap">
              <div class="stats-tl-bar stats-tl-bar--ls" data-il-style="height:${Math.round(cnt / lsMax2 * 80)}px" title="${cnt}"></div>
            </div>
            <div class="stats-tl-lbl">${bin}–${+bin+9}</div>
          </div>`).join('')}
      </div>`);
  }

  // ── STATS-2: Heiratsalter ──
  if (marrBinEntries.length >= 3) {
    const avgM = marrM.length ? Math.round(marrM.reduce((s, v) => s + v, 0) / marrM.length) : '–';
    const avgF = marrF.length ? Math.round(marrF.reduce((s, v) => s + v, 0) / marrF.length) : '–';
    const marrMax = Math.max(...marrBinEntries.map(([, v]) => (v.M || 0) + (v.F || 0)));
    html += _statsSection('Heiratsalter', `
      <div class="stats-ls-summary">
        <div class="stats-ls-kachel"><div class="stats-ls-val">${avgM}</div><div class="stats-ls-lbl c-blue">Ø Mann</div></div>
        <div class="stats-ls-kachel"><div class="stats-ls-val">${avgF}</div><div class="stats-ls-lbl c-pink">Ø Frau</div></div>
        <div class="stats-ls-kachel"><div class="stats-ls-val">${marrM.length + marrF.length}</div><div class="stats-ls-lbl">Datenpunkte</div></div>
      </div>
      <div class="stats-timeline">
        ${marrBinEntries.map(([bin, v]) => {
          const total = (v.M || 0) + (v.F || 0);
          const hM = Math.round((v.M || 0) / marrMax * 72);
          const hF = Math.round((v.F || 0) / marrMax * 72);
          return `<div class="stats-tl-item">
            <div class="stats-tl-bar-wrap stats-tl-bar-wrap--dual">
              <div class="stats-tl-bar stats-tl-bar--marr-m" data-il-style="height:${hM}px" title="♂ ${v.M || 0}"></div>
              <div class="stats-tl-bar stats-tl-bar--marr-f" data-il-style="height:${hF}px" title="♀ ${v.F || 0}"></div>
            </div>
            <div class="stats-tl-lbl">${bin}–${+bin+4}</div>
          </div>`;
        }).join('')}
      </div>
      <div class="stats-dec-legend">
        <span class="stats-dec-dot" data-il-style="background:var(--blue)"></span><span>♂ Männer</span>
        <span class="stats-dec-dot" data-il-style="background:var(--pink)"></span><span>♀ Frauen</span>
      </div>`);
  }

  // ── STATS-2: Jahrzehnt-Diagramm ──
  if (decKeys.length >= 3) {
    const decMax = Math.max(...decKeys.map(d => Math.max(decBirth[d] || 0, decDeath[d] || 0, decMarr[d] || 0)));
    html += _statsSection('Ereignisse pro Jahrzehnt', `
      <div class="stats-timeline stats-timeline--dec">
        ${decKeys.map(d => {
          const b = decBirth[d] || 0, dt = decDeath[d] || 0, m = decMarr[d] || 0;
          const hB = Math.round(b  / decMax * 72);
          const hD = Math.round(dt / decMax * 72);
          const hM = Math.round(m  / decMax * 72);
          return `<div class="stats-tl-item">
            <div class="stats-tl-bar-wrap stats-tl-bar-wrap--tri">
              <div class="stats-tl-bar stats-tl-bar--birth" data-il-style="height:${hB}px" title="Geburten ${b}"></div>
              <div class="stats-tl-bar stats-tl-bar--death" data-il-style="height:${hD}px" title="Sterbefälle ${dt}"></div>
              <div class="stats-tl-bar stats-tl-bar--marr"  data-il-style="height:${hM}px" title="Heiraten ${m}"></div>
            </div>
            <div class="stats-tl-lbl">${d}er</div>
          </div>`;
        }).join('')}
      </div>
      <div class="stats-dec-legend">
        <span class="stats-dec-dot" data-il-style="background:var(--gold-dim)"></span><span>Geburten</span>
        <span class="stats-dec-dot" data-il-style="background:var(--text-dim)"></span><span>Sterbefälle</span>
        <span class="stats-dec-dot" data-il-style="background:var(--green,#4caf50)"></span><span>Heiraten</span>
      </div>`);
  }

  // ── STATS-2: Kinderzahl ──
  if (childEntries.length >= 2) {
    const childMax = Math.max(...childEntries.map(e => e[1]));
    const totalFam = families.length;
    html += _statsSection('Kinderzahl pro Familie', `
      <div class="stats-timeline stats-timeline--child">
        ${childEntries.map(([lbl, cnt]) => `
          <div class="stats-tl-item">
            <div class="stats-tl-bar-wrap">
              <div class="stats-tl-bar stats-tl-bar--child" data-il-style="height:${Math.round(cnt / childMax * 80)}px" title="${cnt} Fam. (${Math.round(cnt/totalFam*100)}%)"></div>
            </div>
            <div class="stats-tl-lbl">${lbl}</div>
          </div>`).join('')}
      </div>
      <div class="c-muted stats-total-lbl">${totalFam} Familien gesamt</div>`);
  }

  // Top Nachnamen
  if (topSurn.length) html += _statsSection('Häufigste Nachnamen', _barChart(topSurn));

  // Top Vornamen
  if (topGiven.length) html += _statsSection('Häufigste Vornamen', _barChart(topGiven, 'var(--blue)'));

  // Top Geburtsorte
  if (topBpl.length) html += _statsSection('Häufigste Geburtsorte', _barChart(topBpl, 'var(--text-dim)'));

  // ── STATS-2: Top Sterbeorte ──
  if (topDpl.length) html += _statsSection('Häufigste Sterbeorte', _barChart(topDpl, 'var(--text-dim)'));

  // Zeitliche Verteilung (50-Jahres-Bins, alt — nur wenn genug Daten und kein Jahrzehnt-Diagramm)
  if (binEntries.length > 1 && decKeys.length < 3) {
    const maxBin = Math.max(...binEntries.map(e => e[1]));
    html += _statsSection('Zeitliche Verteilung (Geburten)', `
      <div class="stats-timeline">
        ${binEntries.map(([bin, cnt]) => `
          <div class="stats-tl-item">
            <div class="stats-tl-bar-wrap">
              <div class="stats-tl-bar" data-il-style="height:${Math.round(cnt / maxBin * 80)}px" title="${cnt}"></div>
            </div>
            <div class="stats-tl-lbl">${bin}er</div>
          </div>`).join('')}
      </div>`);
  }

  el.innerHTML = html;
  _applyDynStyles(el);
}

// ── Hilfsfunktionen ──

function _yearFrom(dateStr) {
  if (!dateStr) return null;
  const t = (dateStr + '').replace(/\D+/g, ' ').trim().split(/\s+/).find(s => s.length === 4);
  const y = t ? parseInt(t) : NaN;
  return (y > 1000 && y < 2200) ? y : null;
}

function _statsTop(map, n) {
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n);
}

function _statsSection(title, inner) {
  return `<div class="section fade-up">
    <div class="section-head"><div class="section-title">${esc(title)}</div></div>
    ${inner}
  </div>`;
}

function _kachel(num, lbl) {
  return `<div class="stats-kachel">
    <div class="stats-kachel-num">${num.toLocaleString('de-DE')}</div>
    <div class="stats-kachel-lbl">${esc(lbl)}</div>
  </div>`;
}

function _progressRow(lbl, k, total, color = 'var(--gold-dim)') {
  const pct = total ? Math.round(k / total * 100) : 0;
  return `<div class="stats-progress-row">
    <div class="stats-progress-lbl">${esc(lbl)}</div>
    <div class="stats-progress-track">
      <div class="stats-progress-fill" data-il-style="width:${pct}%;background:${color}"></div>
    </div>
    <div class="stats-progress-val">${k.toLocaleString('de-DE')} <span class="c-muted">(${pct}%)</span></div>
  </div>`;
}

function _barChart(entries, color = 'var(--gold-dim)') {
  const max = entries[0]?.[1] || 1;
  return entries.map(([lbl, cnt]) => `
    <div class="stats-bar-row">
      <div class="stats-bar-lbl" title="${esc(lbl)}">${esc(lbl)}</div>
      <div class="stats-bar-track">
        <div class="stats-bar-fill" data-il-style="width:${Math.round(cnt / max * 100)}%;background:${color}"></div>
      </div>
      <div class="stats-bar-cnt">${cnt}</div>
    </div>`).join('');
}
