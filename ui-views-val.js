// ─────────────────────────────────────
//  VALIDIERUNGSPANEL + VAL-CONFIG
//  Ausgelagert aus ui-views-tasks.js (REFACT-3, sw v696)
//  Abhängigkeiten: renderTasksView, _addTaskToDb (ui-views-tasks.js),
//  runValidation (gedcom-validator.js), VAL_RULES (gedcom-validator.js)
// ─────────────────────────────────────

// ─── Validierungs-Config (IDB) ────────────────────────────────────────────────

let _valConfig = null; // null = noch nicht geladen

async function _loadValConfig() {
  if (_valConfig) return _valConfig;
  const stored = await idbGet('val_config').catch(() => null);
  if (stored) {
    const disabled = new Set(stored.disabled || []);
    // Migration: Regeln, die die gespeicherte Config noch nicht kannte (z.B. später
    // ergänztes MISSING_EVAL), erben ihren Default — sonst wären neue Opt-in-Regeln
    // bei Bestandsnutzern ungewollt aktiv. `known` = Regelstand zum Speicherzeitpunkt.
    const known = new Set(stored.known || []);
    for (const rule of VAL_CONFIG_DEFAULTS.disabled)
      if (!known.has(rule)) disabled.add(rule);
    _valConfig = {
      disabled,
      thresholds: { ...VAL_CONFIG_DEFAULTS.thresholds, ...(stored.thresholds || {}) },
    };
  } else {
    _valConfig = {
      disabled:   new Set(VAL_CONFIG_DEFAULTS.disabled),   // Default-Deaktivierte übernehmen (z.B. MISSING_EVAL)
      thresholds: { ...VAL_CONFIG_DEFAULTS.thresholds },
    };
  }
  return _valConfig;
}

async function _saveValConfig(cfg) {
  _valConfig = cfg;
  await idbPut('val_config', {
    disabled:   [...cfg.disabled],
    thresholds: { ...cfg.thresholds },
    known:      VAL_RULES.map(r => r.key),   // Regelstand merken → korrekte Migration neuer Regeln
  }).catch(() => null);
}

// ─── Validierungspanel ────────────────────────────────────────────────────────

const _VAL_SEVERITY_ICON  = { error: '✗', warn: '⚠', info: 'ℹ' };
const _VAL_SEVERITY_LABEL = { error: 'Fehler', warn: 'Warnungen', info: 'Hinweise' };

async function _handleRunValidation() {
  const db = AppState.db;
  if (!db?.individuals) { showToast('Keine Daten geladen', 'warn'); return; }
  const cfg = await _loadValConfig();
  cfg.probandId = AppState._probandId || null;
  const raw = runValidation(db, cfg);
  // Befunde herausfiltern, für die bereits eine Task mit gleichem Text existiert
  _validationResults = raw.filter(r => {
    const tasks = r.personId ? (db.individuals[r.personId]?._tasks || []) : [];
    return !tasks.some(t => t.text === r.text);
  });
  renderTasksView();
  const n = _validationResults.length;
  showToast(n === 0 ? 'Keine Befunde' : `${n} Befund${n === 1 ? '' : 'e'}`, n === 0 ? 'success' : 'info');
}

function _handlePromoteToTask(el) {
  const { pid, text, cat } = el.dataset;
  if (!pid || !text) return;
  _addTaskToDb(pid, decodeURIComponent(text), cat || 'online');
  if (_validationResults) {
    _validationResults = _validationResults.filter(
      r => !(r.personId === pid && r.text === decodeURIComponent(text))
    );
  }
  renderTasksView();
  _refreshTasksSection(pid);
}

function _renderValidationPanel() {
  if (!_validationResults) return '';
  const results    = _validationResults;
  const dismissBtn = '<button class="val-dismiss" data-action="dismissValidation" title="Hinweise ausblenden">✕ Ausblenden</button>';
  if (!results.length) return `<div class="val-empty">Keine Befunde — Daten sehen gut aus. ${dismissBtn}</div>`;

  const bySeverity = { error: [], warn: [], info: [] };
  for (const r of results) (bySeverity[r.severity] || bySeverity.info).push(r);

  let html = `<div class="val-panel"><div class="val-panel-header">${dismissBtn}</div>`;
  for (const sev of ['error', 'warn', 'info']) {
    const list = bySeverity[sev];
    if (!list.length) continue;
    html += `<div class="val-group-header val-sev-${sev}">${_VAL_SEVERITY_ICON[sev]} ${_VAL_SEVERITY_LABEL[sev]} (${list.length})</div>`;
    for (const r of list) {
      const p     = AppState.db.individuals[r.personId];
      const pname = esc(p?.name || r.personId);
      const textEnc = encodeURIComponent(r.text);
      let famLink = '';
      if (r.familyId) {
        const fname = esc(_famDisplayName(r.familyId));
        famLink = ` <span class="val-fam-link" data-action="showFamilyDetail" data-fid="${r.familyId}">${fname} ›</span>`;
      }
      html += `<div class="val-row val-sev-${sev}">
        <span class="val-icon">${_VAL_SEVERITY_ICON[r.severity]}</span>
        <span class="val-person" data-action="showDetail" data-pid="${r.personId}">${pname}</span>
        ${famLink}
        <span class="val-text">${esc(r.text)}</span>
        <button class="val-promote" data-action="promoteToTask"
          data-pid="${r.personId}" data-text="${textEnc}" data-cat="${r.category}"
          title="Als Aufgabe anlegen">+</button>
      </div>`;
    }
  }
  html += '</div>';
  return html;
}

// ─── VAL-CONFIG Modal ─────────────────────────────────────────────────────────

async function openValConfig() {
  const cfg = await _loadValConfig();
  // Regeln dynamisch rendern (aus VAL_RULES — kein manuelles Pflegen in index.html nötig)
  const grid = document.getElementById('valcfg-rules-grid');
  if (grid) {
    grid.innerHTML = VAL_RULES.map(rule =>
      `<label class="valcfg-rule-row"><input type="checkbox" id="valcfg-rule-${rule.key}"${!cfg.disabled.has(rule.key) ? ' checked' : ''}> ${rule.label}</label>`
    ).join('');
  }
  // Schwellenwerte
  for (const [key, val] of Object.entries(cfg.thresholds)) {
    const inp = document.getElementById('valcfg-thr-' + key);
    if (inp) inp.value = val;
  }
  openModal('modalValConfig');
}

async function saveValConfig() {
  const disabled   = new Set();
  const thresholds = { ...VAL_CONFIG_DEFAULTS.thresholds };

  for (const rule of VAL_RULES) {
    const cb = document.getElementById('valcfg-rule-' + rule.key);
    if (cb && !cb.checked) disabled.add(rule.key);
  }
  for (const key of Object.keys(thresholds)) {
    const inp = document.getElementById('valcfg-thr-' + key);
    if (inp) {
      const v = parseInt(inp.value);
      if (!isNaN(v) && v > 0) thresholds[key] = v;
    }
  }

  await _saveValConfig({ disabled, thresholds });
  _validationResults = null; // nächste Prüfung läuft mit neuer Config
  closeModal('modalValConfig');
  showToast('Prüfregeln gespeichert', 'success');
}

function valcfgAll() {
  document.querySelectorAll('.valcfg-rules-grid input[type=checkbox]').forEach(cb => { cb.checked = true; });
}

function valcfgNone() {
  document.querySelectorAll('.valcfg-rules-grid input[type=checkbox]').forEach(cb => { cb.checked = false; });
}

async function resetValConfig() {
  await _saveValConfig({
    disabled:   new Set(VAL_CONFIG_DEFAULTS.disabled),
    thresholds: { ...VAL_CONFIG_DEFAULTS.thresholds },
  });
  _valConfig = null; // force reload
  _validationResults = null;
  closeModal('modalValConfig');
  showToast('Prüfregeln zurückgesetzt', 'success');
}

// ─── Startup-Badge ────────────────────────────────────────────────────────────

window.addEventListener('load', () => {
  setTimeout(_updateTasksBadge, 800);
});
