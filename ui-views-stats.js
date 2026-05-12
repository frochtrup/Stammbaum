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
  persons.forEach(p => { const g = (p.given || '').trim().split(/\s+/)[0]; if (g) givenMap[g] = (givenMap[g] || 0) + 1; });
  const topGiven = _statsTop(givenMap, 10);

  // ── Top Geburtsorte ──
  const bplMap = {};
  persons.forEach(p => { const pl = compactPlace(p.birth?.place); if (pl) bplMap[pl] = (bplMap[pl] || 0) + 1; });
  const topBpl = _statsTop(bplMap, 8);

  // ── Zeitliche Verteilung (50-Jahres-Bins) ──
  const binMap = {};
  persons.forEach(p => {
    const d = p.birth?.date || p.chr?.date || '';
    const y = parseInt((d || '').replace(/\D+/g, ' ').trim().split(/\s+/).find(t => t.length === 4) || '');
    if (y > 1000 && y < 2100) {
      const bin = Math.floor(y / 50) * 50;
      binMap[bin] = (binMap[bin] || 0) + 1;
    }
  });
  const binEntries = Object.entries(binMap).sort((a, b) => +a[0] - +b[0]);

  // ── Render ──
  const pct = (k) => n ? Math.round(k / n * 100) : 0;

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

  // Top Nachnamen
  if (topSurn.length) html += _statsSection('Häufigste Nachnamen', _barChart(topSurn));

  // Top Vornamen
  if (topGiven.length) html += _statsSection('Häufigste Vornamen', _barChart(topGiven, 'var(--blue)'));

  // Top Geburtsorte
  if (topBpl.length) html += _statsSection('Häufigste Geburtsorte', _barChart(topBpl, 'var(--text-dim)'));

  // Zeitliche Verteilung
  if (binEntries.length > 1) {
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
