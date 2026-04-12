// ─────────────────────────────────────
//  HOF-LISTE (RESI-Adressen)
// ─────────────────────────────────────
function _hofDateKey(d) {
  if (!d) return '99999999';
  const mo = {JAN:'01',FEB:'02',MAR:'03',APR:'04',MAY:'05',JUN:'06',JUL:'07',AUG:'08',SEP:'09',OCT:'10',NOV:'11',DEC:'12'};
  const yr   = (d.match(/\b(\d{4})\b/) || [])[1] || '9999';
  const mStr = (d.match(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/) || [])[1];
  const dyStr = (d.match(/\b(\d{1,2})\b(?=\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC))/) || [])[1];
  return yr + (mStr ? mo[mStr] : '00') + (dyStr ? dyStr.padStart(2,'0') : '00');
}

function buildHofIndex() {
  if (UIState._hofCache) return UIState._hofCache;
  const hoefe = new Map(); // addr → { addr, entries: [{pid, name, date, dateKey}] }
  for (const p of Object.values(AppState.db.individuals)) {
    for (const ev of (p.events || [])) {
      if (ev.type === 'RESI' && ev.addr && ev.addr.trim()) {
        const addr = ev.addr.trim();
        if (!hoefe.has(addr)) hoefe.set(addr, { addr, entries: [] });
        hoefe.get(addr).entries.push({
          pid:     p.id,
          name:    p.name || p.id,
          date:    ev.date || '',
          dateKey: _hofDateKey(ev.date || ''),
        });
      }
    }
  }
  // Einträge pro Hof chronologisch sortieren
  for (const hof of hoefe.values()) {
    hof.entries.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }
  UIState._hofCache = hoefe;
  return hoefe;
}

function renderHofList(sorted) {
  const el = document.getElementById('hofList');
  if (!el) return;
  if (!sorted) {
    const hoefe = buildHofIndex();
    if (!hoefe.size) { el.innerHTML = '<div class="empty">Keine Wohnadressen (RESI) in den Daten gefunden</div>'; return; }
    sorted = [...hoefe.values()].sort((a, b) => a.addr.localeCompare(b.addr, 'de'));
  }
  if (!sorted.length) { el.innerHTML = '<div class="empty">Keine Höfe gefunden</div>'; return; }

  let html = '';
  let lastLetter = '';
  for (const hof of sorted) {
    const fl = hof.addr[0].toUpperCase();
    if (fl !== lastLetter) { html += `<div class="alpha-sep">${fl}</div>`; lastLetter = fl; }
    const count  = new Set(hof.entries.map(e => e.pid)).size;
    const dates  = hof.entries.filter(e => e.date).map(e => e.dateKey);
    const minYr  = dates.length ? dates[0].slice(0,4)  : '';
    const maxYr  = dates.length ? dates[dates.length-1].slice(0,4) : '';
    const range  = minYr && maxYr && minYr !== maxYr ? `${minYr}–${maxYr}` : (minYr || '');
    const addrLine = esc(hof.addr).replace(/\n/g, ' · ');
    html += `<div class="person-row" data-action="showHofDetail" data-addr="${esc(hof.addr)}">
      <div class="p-avatar" style="font-size:1.1rem">🏠</div>
      <div class="p-info">
        <div class="p-name">${addrLine}</div>
        <div class="p-meta">${count} Person${count !== 1 ? 'en' : ''}${range ? ' · ' + range : ''}</div>
      </div>
      <span class="p-arrow">›</span>
    </div>`;
  }
  el.innerHTML = html;
}

function filterHoefe(q) {
  const lower = q.toLowerCase().trim();
  const all = [...buildHofIndex().values()].sort((a, b) => a.addr.localeCompare(b.addr, 'de'));
  if (!lower) { renderHofList(all); return; }
  renderHofList(all.filter(h => h.addr.toLowerCase().includes(lower)));
}

function showHofDetail(addr, pushHistory = true) {
  const hoefe = buildHofIndex();
  const hof   = hoefe.get(addr);
  if (!hof) return;
  if (pushHistory) _beforeDetailNavigate();
  AppState.currentPersonId = null; AppState.currentFamilyId = null;
  AppState.currentSourceId = null; AppState.currentRepoId = null;

  document.getElementById('detailTopTitle').textContent = 'Hof';
  document.getElementById('editBtn').style.display = 'none';
  document.getElementById('treeBtn').style.display = 'none';

  const addrDisplay = esc(addr).replace(/\n/g, '<br>');
  const count = new Set(hof.entries.map(e => e.pid)).size;

  let html = `<div class="detail-hero fade-up">
    <div class="detail-avatar" style="font-size:1.8rem;border-color:var(--gold-dim)">🏠</div>
    <div class="detail-name" style="white-space:pre-wrap">${addrDisplay}</div>
    <div class="detail-id">${count} Person${count !== 1 ? 'en' : ''}</div>
  </div>`;

  html += `<div class="section fade-up">
    <div class="section-title">Bewohner</div>`;
  for (const e of hof.entries) {
    const p = AppState.db.individuals[e.pid];
    if (p) html += relRow(p, e.date || '');
  }
  html += `</div>`;

  document.getElementById('detailContent').innerHTML = html;
  showView('v-detail');
}
