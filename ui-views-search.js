// ─────────────────────────────────────
//  GLOBALE SUCHE
// ─────────────────────────────────────

// Globale Suche über Personen, Familien, Quellen, Orte
function runGlobalSearch(q) {
  const out = document.getElementById('globalSearchResults');
  if (!out) return;
  const lower = (q || '').toLowerCase().trim();
  if (!lower) {
    out.innerHTML = '<div style="padding:24px 16px;text-align:center;color:var(--text-muted);font-size:0.88rem">Suchbegriff eingeben…</div>';
    return;
  }

  let html = '';

  // ── Personen ──
  const _rankP = p => {
    const n = (p.name || '').toLowerCase();
    if (n.startsWith(lower)) return 0;
    if (n.includes(lower)) return 1;
    if ((p.given||'').toLowerCase().startsWith(lower) || (p.surname||'').toLowerCase().startsWith(lower)) return 2;
    return 3;
  };
  const _allPersons = Object.values(AppState.db.individuals).filter(p => {
    if ((p.name||'').toLowerCase().includes(lower)) return true;
    if ((p.given||'').toLowerCase().includes(lower)) return true;
    if ((p.surname||'').toLowerCase().includes(lower)) return true;
    if ((p.birth?.place||'').toLowerCase().includes(lower)) return true;
    if ((p.death?.place||'').toLowerCase().includes(lower)) return true;
    if ((p.birth?.date||'').toLowerCase().includes(lower)) return true;
    if ((p.death?.date||'').toLowerCase().includes(lower)) return true;
    if ((p.chr?.place||'').toLowerCase().includes(lower)) return true;
    if ((p.buri?.place||'').toLowerCase().includes(lower)) return true;
    if ((p.noteText||'').toLowerCase().includes(lower)) return true;
    for (const ev of (p.events || [])) {
      if ((ev.value||'').toLowerCase().includes(lower)) return true;
      if ((ev.place||'').toLowerCase().includes(lower)) return true;
      if ((ev.date||'').toLowerCase().includes(lower)) return true;
      if ((ev.eventType||'').toLowerCase().includes(lower)) return true;
    }
    return false;
  }).sort((a, b) => _rankP(a) - _rankP(b));
  const persons = _allPersons.slice(0, 20);
  if (persons.length) {
    const _ph = _allPersons.length > 20 ? ` — ${_allPersons.length} gesamt` : '';
    html += `<div class="alpha-sep">Personen (${persons.length}${_ph})</div>`;
    for (const p of persons) {
      const sc = p.sex === 'M' ? 'm' : p.sex === 'F' ? 'f' : '';
      const ic = p.sex === 'M' ? '♂' : p.sex === 'F' ? '♀' : '◇';
      let meta = '';
      if (p.birth?.date) meta += '* ' + p.birth.date;
      if (p.birth?.place) meta += (meta ? ', ' : '') + compactPlace(p.birth.place);
      if (p.death?.date) meta += (meta ? '  † ' : '† ') + p.death.date;
      html += `<div class="person-row" data-action="showDetail" data-id="${p.id}">
        <div class="p-avatar ${sc}">${ic}</div>
        <div class="p-info"><div class="p-name">${esc(p.name||p.id)}</div><div class="p-meta">${esc(meta)||'&nbsp;'}</div></div>
        <span class="p-arrow">›</span></div>`;
    }
  }

  // ── Familien ──
  const _allFamilies = Object.values(AppState.db.families).filter(f => {
    const h = AppState.db.individuals[f.husb];
    const w = AppState.db.individuals[f.wife];
    if ((h?.name||'').toLowerCase().includes(lower)) return true;
    if ((w?.name||'').toLowerCase().includes(lower)) return true;
    if ((f.marr?.place||'').toLowerCase().includes(lower)) return true;
    if ((f.marr?.date||'').toLowerCase().includes(lower)) return true;
    if ((f.div?.place||'').toLowerCase().includes(lower)) return true;
    if ((f.div?.date||'').toLowerCase().includes(lower)) return true;
    if ((f.engag?.place||'').toLowerCase().includes(lower)) return true;
    if ((f.engag?.date||'').toLowerCase().includes(lower)) return true;
    if ((f.noteText||'').toLowerCase().includes(lower)) return true;
    for (const ev of (f.events || [])) {
      if ((ev.value||'').toLowerCase().includes(lower)) return true;
      if ((ev.place||'').toLowerCase().includes(lower)) return true;
      if ((ev.date||'').toLowerCase().includes(lower)) return true;
      if ((ev.eventType||'').toLowerCase().includes(lower)) return true;
    }
    return false;
  });
  const families = _allFamilies.slice(0, 12);
  if (families.length) {
    const _fh = _allFamilies.length > 12 ? ` — ${_allFamilies.length} gesamt` : '';
    html += `<div class="alpha-sep">Familien (${families.length}${_fh})</div>`;
    for (const f of families) {
      const h = AppState.db.individuals[f.husb];
      const w = AppState.db.individuals[f.wife];
      const label = [h?.name, w?.name].filter(Boolean).join(' ⚭ ') || f.id;
      let meta = '';
      if (f.marr?.date) meta += f.marr.date;
      if (f.marr?.place) meta += (meta ? ', ' : '') + compactPlace(f.marr.place);
      html += `<div class="person-row" data-action="showFamilyDetail" data-id="${f.id}">
        <div class="p-avatar" style="font-size:0.95rem">⚭</div>
        <div class="p-info"><div class="p-name">${esc(label)}</div><div class="p-meta">${esc(meta)||'&nbsp;'}</div></div>
        <span class="p-arrow">›</span></div>`;
    }
  }

  // ── Quellen ──
  const _allSources = Object.values(AppState.db.sources).filter(s =>
    (s.title||'').toLowerCase().includes(lower) ||
    (s.auth||'').toLowerCase().includes(lower) ||
    (s.publ||'').toLowerCase().includes(lower)
  );
  const sources = _allSources.slice(0, 10);
  if (sources.length) {
    const _sh = _allSources.length > 10 ? ` — ${_allSources.length} gesamt` : '';
    html += `<div class="alpha-sep">Quellen (${sources.length}${_sh})</div>`;
    for (const s of sources) {
      html += `<div class="person-row" data-action="showSourceDetail" data-sid="${s.id}">
        <div class="p-avatar" style="font-size:0.95rem">📖</div>
        <div class="p-info"><div class="p-name">${esc(s.title||s.id)}</div><div class="p-meta">${esc(s.auth||'')}</div></div>
        <span class="p-arrow">›</span></div>`;
    }
  }

  // ── Orte ──
  const _allPlaces = Object.keys(AppState.db.extraPlaces || {}).filter(name =>
    name.toLowerCase().includes(lower)
  );
  const places = _allPlaces.slice(0, 8);
  if (places.length) {
    const _plh = _allPlaces.length > 8 ? ` — ${_allPlaces.length} gesamt` : '';
    html += `<div class="alpha-sep">Orte (${places.length}${_plh})</div>`;
    for (const name of places) {
      html += `<div class="person-row" data-action="showPlaceDetail" data-name="${esc(name)}">
        <div class="p-avatar" style="font-size:0.95rem">📍</div>
        <div class="p-info"><div class="p-name">${esc(name)}</div><div class="p-meta">&nbsp;</div></div>
        <span class="p-arrow">›</span></div>`;
    }
  }

  if (!html) {
    html = `<div style="padding:24px 16px;text-align:center;color:var(--text-muted);font-size:0.88rem">Keine Treffer für „${esc(q)}"</div>`;
  }
  out.innerHTML = html;
}
