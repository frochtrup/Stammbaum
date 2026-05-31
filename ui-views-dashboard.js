// ─────────────────────────────────────
//  QUALITÄTS-DASHBOARD  (Forschung Phase 1)
//  Dritter Modus im Aufgaben-Tab (Aufgaben | Protokoll | Dashboard).
//  Reine Präsentation über runValidation() + direkter Vollständigkeits-
//  Auswertung des db — speichert NICHTS, kein Roundtrip-Risiko.
//  Abhängigkeiten: runValidation/VAL_CONFIG_DEFAULTS (gedcom-validator.js),
//  _loadValConfig (ui-views-val.js), _addTaskToDb (ui-views-tasks.js),
//  _tasksModeBar/_famDisplayName, esc/showToast/renderTasksView.
// ─────────────────────────────────────

let _dashResults = null;          // { pid: {error:[], warn:[], info:[]} } — für „alle übernehmen"
let _dashFilter  = 'attention';   // 'attention' (Rot+Gelb) | 'red' | 'all' (inkl. Hinweise)

// ─── Vollständigkeits-Helfer (unabhängig vom Validator-Config) ────────────────

function _dashHasSources(p) {
  if (p.sourceRefs?.size > 0) return true;
  if (p.topSources?.length)   return true;
  for (const key of ['birth', 'chr', 'death', 'buri'])
    if (p[key]?.citations?.length) return true;
  for (const ev of (p.events || [])) if (ev.citations?.length) return true;
  if (p.nameCitations?.length) return true;
  return false;
}

function _dashHasQuay(p) {
  const ok = cits => cits?.some(c => c.quay !== undefined && c.quay !== '' && c.quay !== null);
  for (const key of ['birth', 'chr', 'death', 'buri'])
    if (ok(p[key]?.citations)) return true;
  for (const ev of (p.events || [])) if (ok(ev.citations)) return true;
  if (ok(p.nameCitations)) return true;
  return false;
}

function _dashHasEval(p) {                          // RES-EVAL 2c / ADR-022
  const ok = cits => cits?.some(c => c.eval && !evalIsEmpty(c.eval));
  for (const key of ['birth', 'chr', 'death', 'buri'])
    if (ok(p[key]?.citations)) return true;
  for (const ev of (p.events || [])) if (ok(ev.citations)) return true;
  if (ok(p.nameCitations)) return true;
  return false;
}

function _dashYear(dateStr) {
  if (!dateStr) return null;
  const m = String(dateStr).match(/\b(\d{3,4})\b/);
  return m ? m[1] : null;
}

function _dashLife(p) {
  const b = _dashYear(p.birth?.date) || _dashYear(p.chr?.date);
  const d = _dashYear(p.death?.date) || _dashYear(p.buri?.date);
  if (!b && !d) return '';
  return `${b ? '✶' + b : ''}${b && d ? ' ' : ''}${d ? '†' + d : ''}`;
}

// ─── Einstieg (async wegen Val-Config) ────────────────────────────────────────

function _renderDashboardView() {
  const container = document.getElementById('tasksList');
  if (!container) return;
  container.innerHTML = `<div class="tasks-sticky-header">${_tasksModeBar()}</div>
    <div class="tasks-list-empty">Berechne Qualität …</div>`;
  Promise.resolve(_loadValConfig())
    .then(cfg => _paintDashboard(cfg))
    .catch(() => _paintDashboard(VAL_CONFIG_DEFAULTS));
}

function _setDashFilter(f) {
  _dashFilter = f;
  ['attention', 'red', 'all'].forEach(k =>
    document.getElementById('dash-flt-' + k)?.classList.toggle('active', k === f));
  Promise.resolve(_loadValConfig()).then(cfg => _paintDashboard(cfg)).catch(() => _paintDashboard(VAL_CONFIG_DEFAULTS));
}

function _paintDashboard(cfg) {
  const container = document.getElementById('tasksList');
  if (!container) return;
  const db      = AppState.db;
  const persons = db.individuals || {};
  const ids     = Object.keys(persons);
  const total   = ids.length;

  const fltChips = `<div class="filter-chips">
      <button id="dash-flt-attention" class="flt-btn${_dashFilter === 'attention' ? ' active' : ''}" data-action="setDashFilter" data-filter="attention" title="Handlungsbedarf (Fehler + Warnungen)">⚠</button>
      <button id="dash-flt-red" class="flt-btn${_dashFilter === 'red' ? ' active' : ''}" data-action="setDashFilter" data-filter="red" title="Nur Fehler">✗</button>
      <button id="dash-flt-all" class="flt-btn${_dashFilter === 'all' ? ' active' : ''}" data-action="setDashFilter" data-filter="all" title="Alle (inkl. Hinweise)">≡</button>
    </div>`;
  const header = `<div class="tasks-sticky-header">${_tasksModeBar()}
    <div class="filter-action-bar">
      ${fltChips}
      <div class="action-btns">
        <button class="act-btn-icon" data-action="openValConfig" title="Prüfregeln konfigurieren">⚙</button>
      </div>
    </div>
  </div>`;

  if (!total) {
    container.innerHTML = header + `<div class="tasks-list-empty">Keine Personen geladen</div>`;
    return;
  }

  // ── Validierung gruppieren (bereits in Aufgaben überführte Befunde ausblenden) ──
  const raw     = runValidation(db, cfg);
  const byPerson = {};
  for (const r of raw) {
    if (!r.personId) continue;
    const p = persons[r.personId];
    if ((p?._tasks || []).some(t => t.text === r.text)) continue;   // schon als Aufgabe vorhanden
    const g = byPerson[r.personId] || (byPerson[r.personId] = { error: [], warn: [], info: [] });
    (g[r.severity] || g.info).push(r);
  }
  _dashResults = byPerson;

  // ── Ampel-Verteilung ──
  let red = 0, amber = 0, infoOnly = 0;
  let nErr = 0, nWarn = 0, nInfo = 0;
  for (const pid of ids) {
    const g = byPerson[pid];
    if (!g) continue;
    nErr += g.error.length; nWarn += g.warn.length; nInfo += g.info.length;
    if (g.error.length)      red++;
    else if (g.warn.length)  amber++;
    else if (g.info.length)  infoOnly++;
  }
  const green   = total - red - amber - infoOnly;
  const cleanPct = Math.round((green / total) * 100);

  // ── Lückenradar (direkt aus db) ──
  let cBirth = 0, cBPlace = 0, cDeath = 0, cSex = 0, cSrc = 0, cQuay = 0, cEval = 0;
  for (const pid of ids) {
    const p = persons[pid];
    if (p.birth?.date || p.chr?.date)   cBirth++;
    if (p.birth?.place || p.chr?.place) cBPlace++;
    if (p.death?.date || p.buri?.date)  cDeath++;
    if (p.sex === 'M' || p.sex === 'F') cSex++;
    if (_dashHasSources(p)) { cSrc++; if (_dashHasQuay(p)) cQuay++; if (_dashHasEval(p)) cEval++; }
  }
  const radar = [
    { label: 'Geburts-/Taufdatum', n: cBirth },
    { label: 'Geburtsort',          n: cBPlace },
    { label: 'Sterbedatum',         n: cDeath },
    { label: 'Geschlecht bestimmt', n: cSex },
    { label: 'mind. 1 Quelle',      n: cSrc },
    { label: 'Quellen mit Bewertung (QUAY)', n: cQuay, base: cSrc },
    { label: 'Quellen mit Evidenzbewertung', n: cEval, base: cSrc },
  ];

  // ── HTML zusammensetzen ──
  let html = header;

  // Score-Kachel
  const scoreCls = cleanPct >= 80 ? 'good' : cleanPct >= 50 ? 'mid' : 'low';
  html += `<div class="dash-score dash-score-${scoreCls}">
    <div class="dash-score-num">${cleanPct}%</div>
    <div class="dash-score-lbl">befundfrei · ${total} Personen</div>
  </div>`;

  // Ampel-Verteilung
  html += `<div class="dash-ampel">
    ${_dashAmpelChip('red',   red,      'Fehler')}
    ${_dashAmpelChip('amber', amber,    'Warnungen')}
    ${_dashAmpelChip('info',  infoOnly, 'nur Hinweise')}
    ${_dashAmpelChip('green', green,    'sauber')}
  </div>
  <div class="dash-finding-summary">${nErr} Fehler · ${nWarn} Warnungen · ${nInfo} Hinweise</div>`;

  // Lückenradar
  html += `<div class="dash-section-title">Lückenradar</div><div class="dash-radar">`;
  for (const m of radar) {
    const base = m.base !== undefined ? m.base : total;
    const pct  = base ? Math.round((m.n / base) * 100) : 0;
    const cls  = pct >= 80 ? 'good' : pct >= 50 ? 'mid' : 'low';
    const sub  = m.base !== undefined ? ` <span class="dash-bar-base">(von ${base})</span>` : '';
    html += `<div class="dash-bar-row">
      <div class="dash-bar-label">${esc(m.label)}${sub}</div>
      <div class="dash-bar"><div class="dash-bar-fill dash-bar-${cls}" style="width:${pct}%"></div></div>
      <div class="dash-bar-pct">${pct}%</div>
    </div>`;
  }
  html += `</div>`;

  // Brennpunkte
  const wantSev = _dashFilter === 'red' ? ['error']
                : _dashFilter === 'all' ? ['error', 'warn', 'info']
                : ['error', 'warn'];
  const focus = ids
    .map(pid => ({ pid, g: byPerson[pid] }))
    .filter(x => x.g && wantSev.some(s => x.g[s].length))
    .map(x => ({
      pid: x.pid, g: x.g,
      w: x.g.error.length * 1000 + x.g.warn.length * 10 + x.g.info.length,
    }))
    .sort((a, b) => b.w - a.w);

  const CAP = 40;
  html += `<div class="dash-section-title">Brennpunkte${focus.length ? ` <span class="tasks-open-cnt">(${focus.length})</span>` : ''}</div>`;

  if (!focus.length) {
    html += `<div class="tasks-list-empty">Keine Personen mit ${_dashFilter === 'red' ? 'Fehlern' : 'Befunden'} in dieser Auswahl 🎉</div>`;
    container.innerHTML = html;
    return;
  }

  for (const { pid, g } of focus.slice(0, CAP)) {
    const p     = persons[pid];
    const dot   = g.error.length ? 'red' : g.warn.length ? 'amber' : 'info';
    const life  = _dashLife(p);
    const cnt   = g.error.length + g.warn.length + g.info.length;   // „+ alle" übernimmt alle Schweregrade
    html += `<div class="dash-person">
      <span class="dash-dot dash-dot-${dot}"></span>
      <span class="dash-person-name" data-action="showDetail" data-pid="${pid}">${esc(p?.name || pid)}</span>
      ${life ? `<span class="dash-person-life">${esc(life)}</span>` : ''}
      <button class="dash-promote-all" data-action="dashPromoteAll" data-pid="${pid}" title="Alle ${cnt} Befunde als Aufgaben anlegen">+ alle</button>
    </div>`;
    for (const sev of wantSev) {
      for (const r of g[sev]) {
        let famLink = '';
        if (r.familyId) {
          const fname = esc(_famDisplayName(r.familyId));
          famLink = ` <span class="val-fam-link" data-action="showFamilyDetail" data-fid="${r.familyId}">${fname} ›</span>`;
        }
        html += `<div class="dash-finding dash-sev-${sev}">
          <span class="dash-finding-icon">${sev === 'error' ? '✗' : sev === 'warn' ? '⚠' : 'ℹ'}</span>
          <span class="dash-finding-text">${esc(r.text)}${famLink}</span>
          <button class="val-promote" data-action="promoteToTask"
            data-pid="${pid}" data-text="${encodeURIComponent(r.text)}" data-cat="${r.category}"
            title="Als Aufgabe anlegen">+</button>
        </div>`;
      }
    }
  }
  if (focus.length > CAP)
    html += `<div class="dash-more">… und ${focus.length - CAP} weitere Personen</div>`;

  container.innerHTML = html;
}

function _dashAmpelChip(kind, n, label) {
  return `<div class="dash-ampel-chip dash-ampel-${kind}">
    <span class="dash-dot dash-dot-${kind}"></span>
    <span class="dash-ampel-num">${n}</span>
    <span class="dash-ampel-lbl">${label}</span>
  </div>`;
}

// ─── Handler: alle Befunde einer Person als Aufgaben ──────────────────────────

function _handleDashPromoteAll(el) {
  const pid = el.dataset.pid;
  const g   = _dashResults?.[pid];
  if (!g) return;
  let n = 0;
  for (const sev of ['error', 'warn', 'info'])
    for (const r of g[sev]) { _addTaskToDb(pid, r.text, r.category); n++; }
  showToast(n ? `${n} Aufgabe${n === 1 ? '' : 'n'} angelegt` : 'Nichts zu übernehmen', n ? 'success' : 'info');
  renderTasksView();   // Modus bleibt 'dashboard' → Neuberechnung
}
