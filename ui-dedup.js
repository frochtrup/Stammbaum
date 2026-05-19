// ─────────────────────────────────────
//  DUPLIKAT-ERKENNUNG UND MERGE
// ─────────────────────────────────────
// Domain-Logik (buildHofIndex, _dedupNormName, _dedupLevenshtein,
// _dedupYearFromGed, _dedupScorePair, findDuplicatePairs) → gedcom.js

// ── Merge-Logik ──────────────────────

function _dedupMergePersons(winnerId, loserId) {
  const A = AppState.db.individuals[winnerId];
  const B = AppState.db.individuals[loserId];
  if (!A || !B) return false;

  // prefer-nonempty: einfache Felder
  const _pref = (aVal, bVal) => (aVal || '') || (bVal || '');
  A.surname    = _pref(A.surname, B.surname);
  A.given      = _pref(A.given, B.given);
  A.name       = _pref(A.name, B.name);
  A.nameRaw    = _pref(A.nameRaw, B.nameRaw);
  A.sex        = (A.sex && A.sex !== 'U') ? A.sex : (B.sex || 'U');
  A.titl       = _pref(A.titl, B.titl);
  A.reli       = _pref(A.reli, B.reli);
  A.email      = _pref(A.email, B.email);
  A.www        = _pref(A.www, B.www);
  A.uid        = _pref(A.uid, B.uid);
  A.grampId    = _pref(A.grampId, B.grampId);

  // prefer-nonempty für Sonder-Events (birth/death/chr/buri)
  for (const evKey of ['birth', 'death', 'chr', 'buri']) {
    const aEv = A[evKey] || {};
    const bEv = B[evKey] || {};
    A[evKey] = aEv;
    if (!aEv.date  && bEv.date)  aEv.date  = bEv.date;
    if (!aEv.place && bEv.place) aEv.place = bEv.place;
    const _aCits = aEv.citations || [];
    const _bCits = bEv.citations || [];
    aEv.citations = [..._aCits, ..._bCits.filter(bc => !_aCits.some(ac => ac.sid === bc.sid && ac.page === bc.page))];
  }

  // Quellen auf Personen-Ebene zusammenführen
  A.topSources     = [...new Set([...(A.topSources||[]),     ...(B.topSources||[])])];
  A.topSourcePages = { ...(B.topSourcePages||{}), ...(A.topSourcePages||{}) };
  A.topSourceQUAY  = { ...(B.topSourceQUAY||{}),  ...(A.topSourceQUAY||{}) };

  // Arrays zusammenführen
  A.events     = [...(A.events||[]),     ...(B.events||[])];
  A.media      = [...(A.media||[]),      ...(B.media||[])];
  A.extraNames = [...(A.extraNames||[]), ...(B.extraNames||[])];

  // Notizen zusammenführen
  const combinedNoteTexts = [
    ...(A.noteTexts||[]).filter(Boolean),
    ...(B.noteTexts||[]).filter(Boolean),
  ];
  A.noteTexts = combinedNoteTexts;
  A.noteText  = combinedNoteTexts.join('\n');
  A.noteRefs  = [...new Set([...(A.noteRefs||[]), ...(B.noteRefs||[])])];

  // sourceRefs Set
  A.sourceRefs = new Set([...(A.sourceRefs||new Set()), ...(B.sourceRefs||new Set())]);

  // Passthrough-Zeilen anhängen
  A._passthrough = [...(A._passthrough||[]), ...(B._passthrough||[])];

  // Familien-Referenzen: loserId → winnerId
  for (const f of Object.values(AppState.db.families)) {
    let changed = false;
    if (f.husb === loserId) { f.husb = winnerId; changed = true; }
    if (f.wife === loserId) { f.wife = winnerId; changed = true; }
    const ci = (f.children||[]).indexOf(loserId);
    if (ci >= 0) {
      f.children[ci] = winnerId;
      if ((f.childRelations||{})[loserId]) {
        f.childRelations[winnerId] = f.childRelations[loserId];
        delete f.childRelations[loserId];
      }
      changed = true;
    }
    if (changed) _rebuildFamilySourceRefs(f);
  }

  // fams/famc von B in A übernehmen (falls noch nicht vorhanden)
  for (const famId of (B.fams||[])) {
    if (!(A.fams||[]).includes(famId)) { A.fams = A.fams || []; A.fams.push(famId); }
  }
  for (const fc of (B.famc||[])) {
    if (!(A.famc||[]).some(x => x.famId === fc.famId)) { A.famc = A.famc || []; A.famc.push(fc); }
  }

  // Globalen State umbiegen
  if (UIState._probandId === loserId) UIState._probandId = winnerId;
  if (AppState.currentPersonId === loserId) AppState.currentPersonId = winnerId;

  // Loser löschen
  delete AppState.db.individuals[loserId];

  // Rebuild + dirty flags
  _rebuildPersonSourceRefs(A);
  UIState._searchIndexDirty = true;
  UIState._placesCache = null;
  UIState._hofCache    = null;
  markChanged();
  return true;
}

// ── Modale UI ────────────────────────

let _dedupPairs       = [];
let _dedupThreshold   = 65;
let _dedupWinnerId    = null;
let _dedupLoserId     = null;
let _dedupIgnored     = null; // Set<"idA|idB">

function _dedupLoadIgnored() {
  if (_dedupIgnored) return;
  try { _dedupIgnored = new Set(JSON.parse(localStorage.getItem('dedup_ignored') || '[]')); }
  catch { _dedupIgnored = new Set(); }
}

function _dedupSaveIgnored() {
  try { localStorage.setItem('dedup_ignored', JSON.stringify([..._dedupIgnored])); }
  catch {}
}

function _dedupIgnoreKey(pA, pB) {
  const ids = [pA.id, pB.id].sort();
  return ids[0] + '|' + ids[1];
}

function openDedupModal() {
  _dedupLoadIgnored();
  _dedupPairs = [];
  _dedupWinnerId = null;
  _dedupLoserId  = null;
  const statusEl = document.getElementById('dedup-status');
  const listEl   = document.getElementById('dedup-list');
  if (statusEl) statusEl.textContent = 'Noch kein Scan durchgeführt.';
  if (listEl)   listEl.innerHTML = '';
  // Schwellenwert-Slider zurücksetzen
  const slider = document.getElementById('dedup-threshold');
  if (slider) { slider.value = _dedupThreshold; document.getElementById('dedup-threshold-val').textContent = _dedupThreshold; }
  openModal('modalDedup');
}

function dedupRunScan() {
  const statusEl = document.getElementById('dedup-status');
  const listEl   = document.getElementById('dedup-list');
  if (statusEl) statusEl.textContent = 'Suche läuft…';
  if (listEl)   listEl.innerHTML = '<div class="dedup-loading">…</div>';
  // Micro-Task damit der Browser den Status-Text rendert
  setTimeout(() => {
    _dedupLoadIgnored();
    _dedupPairs = findDuplicatePairs(_dedupThreshold)
      .filter(({ pA, pB }) => !_dedupIgnored.has(_dedupIgnoreKey(pA, pB)));
    _renderDedupList();
  }, 20);
}

function dedupThresholdChange(val) {
  _dedupThreshold = parseInt(val, 10);
  const el = document.getElementById('dedup-threshold-val');
  if (el) el.textContent = _dedupThreshold;
}

function _renderDedupList() {
  const listEl   = document.getElementById('dedup-list');
  const statusEl = document.getElementById('dedup-status');
  if (!listEl) return;

  const n = _dedupPairs.length;
  if (!n) {
    if (statusEl) statusEl.textContent = 'Keine Duplikate gefunden.';
    listEl.innerHTML = '<div class="dedup-empty">Keine verdächtigen Paare</div>';
    return;
  }

  if (statusEl) statusEl.textContent = n + ' verdächtige Paare (Score \u2265 ' + _dedupThreshold + ')';

  let html = '';
  for (let i = 0; i < n; i++) {
    const { pA, pB, score, reasons } = _dedupPairs[i];
    const scColor = score >= 85 ? 'var(--red)' : score >= 75 ? '#b8860b' : 'var(--text-muted)';
    const plA = compactPlace(pA.birth?.place || '');
    const plB = compactPlace(pB.birth?.place || '');
    const metaA = [pA.birth?.date, plA].filter(Boolean).join(' ');
    const metaB = [pB.birth?.date, plB].filter(Boolean).join(' ');
    html += `<div class="fact-row dedup-pair-row"
      data-action="dedupOpenMerge" data-pair="${i}">
      <div class="dedup-pair-header">
        <span class="dedup-pair-names">${esc(pA.name || pA.id)} \u2194 ${esc(pB.name || pB.id)}</span>
        <span class="dedup-pair-score" data-il-style="color:${scColor}">${score}</span>
      </div>
      <div class="dedup-pair-meta">* ${esc(metaA || '?')} &nbsp;\u2194&nbsp; * ${esc(metaB || '?')}</div>
      <div class="dedup-pair-reason">${esc(reasons.join(' \u00b7 '))}</div>
      <div class="dedup-score-bar">
        <div class="dedup-score-fill" data-il-style="width:${Math.min(100, score)}%;background:${scColor}"></div>
      </div>
    </div>`;
  }
  listEl.innerHTML = html;
  _applyDynStyles(listEl);
}

// ── Merge-Modal ───────────────────────

function dedupOpenMerge(el) {
  const idx = parseInt(el.dataset.pair, 10);
  const pair = _dedupPairs[idx];
  if (!pair) return;
  const { pA, pB } = pair;

  // Datenpunkte zählen um Gewinner vorzuschlagen
  const _richness = p =>
    (p.name ? 1 : 0) + (p.birth?.date ? 2 : 0) + (p.birth?.place ? 1 : 0) +
    (p.death?.date ? 2 : 0) + (p.death?.place ? 1 : 0) +
    (p.events?.length || 0) + (p.topSources?.length || 0) + (p.media?.length || 0);

  _dedupWinnerId = _richness(pA) >= _richness(pB) ? pA.id : pB.id;
  _dedupLoserId  = _dedupWinnerId === pA.id ? pB.id : pA.id;

  _dedupRenderMergeBody(pair);
  openModal('modalMerge');
}

// Elternnamen einer Person aus famc[] auflesen
function _dedupParents(p) {
  const lines = [];
  for (const fc of (p.famc || [])) {
    const f = AppState.db.families[fc.famId];
    if (!f) continue;
    const parts = [];
    const husb = f.husb && AppState.db.individuals[f.husb];
    const wife = f.wife && AppState.db.individuals[f.wife];
    if (husb) parts.push(husb.name || husb.id);
    if (wife) parts.push(wife.name || wife.id);
    if (parts.length) lines.push(parts.join(' & '));
  }
  return lines.join('; ') || '';
}

// Partnernamen einer Person aus fams[] auflesen
function _dedupPartners(p) {
  const names = [];
  for (const famId of (p.fams || [])) {
    const f = AppState.db.families[famId];
    if (!f) continue;
    const otherId = f.husb === p.id ? f.wife : f.husb;
    const other = otherId && AppState.db.individuals[otherId];
    if (other) names.push(other.name || other.id);
    else if (!otherId) names.push('(unbekannt)');
  }
  return names.join(', ') || '';
}

function _dedupRenderMergeBody(pair) {
  const el = document.getElementById('merge-body');
  if (!el) return;
  const { pA, pB, score, reasons } = pair;
  const winner = AppState.db.individuals[_dedupWinnerId];
  const loser  = AppState.db.individuals[_dedupLoserId];
  if (!winner || !loser) return;

  const wIsA = winner.id === pA.id;
  const _cell = (val, isWinner) =>
    `<td class="dedup-merge-td${isWinner ? ' winner' : ''}">${esc(val || '–')}</td>`;
  const _row = (label, aVal, bVal) =>
    `<tr><td class="dedup-merge-td-label">${esc(label)}</td>${_cell(aVal, wIsA)}${_cell(bVal, !wIsA)}</tr>`;

  el.innerHTML = `
    <div class="dedup-merge-info">Score: <strong>${score}</strong> \u2014 ${esc(reasons.join(', '))}</div>
    <table class="dedup-merge-table">
      <thead><tr>
        <th class="dedup-merge-th">Feld</th>
        <th class="dedup-merge-th${wIsA ? ' winner' : ''}">A: ${esc(pA.name || pA.id)}</th>
        <th class="dedup-merge-th${!wIsA ? ' winner' : ''}">B: ${esc(pB.name || pB.id)}</th>
      </tr></thead>
      <tbody>
        ${_row('Nachname',   pA.surname,                              pB.surname)}
        ${_row('Vorname',    pA.given,                                pB.given)}
        ${_row('Geschlecht', pA.sex,                                  pB.sex)}
        ${_row('Geb. Datum', pA.birth?.date,                          pB.birth?.date)}
        ${_row('Geb. Ort',   compactPlace(pA.birth?.place || ''),     compactPlace(pB.birth?.place || ''))}
        ${_row('Tod Datum',  pA.death?.date,                          pB.death?.date)}
        ${_row('Eltern',     _dedupParents(pA),                       _dedupParents(pB))}
        ${_row('Partner',    _dedupPartners(pA),                      _dedupPartners(pB))}
        ${_row('ID',         pA.id,                                   pB.id)}
      </tbody>
    </table>
    <div class="dedup-winner-box">
      <strong>Bleibt:</strong> ${esc(winner.name || winner.id)} (ID: ${esc(winner.id)})<br>
      <strong>Wird gel\u00f6scht:</strong> ${esc(loser.name || loser.id)} (ID: ${esc(loser.id)})
    </div>
    <button type="button" class="btn dedup-swap-btn"
      data-action="dedupSwapWinner">\u21c4 Seiten tauschen</button>
    <div class="dedup-hint">
      Alle Ereignisse, Quellen, Medien und Familienbindungen beider Personen werden zusammengef\u00fchrt.
      Diese Aktion kann nicht r\u00fcckg\u00e4ngig gemacht werden.
    </div>`;
  _applyDynStyles(el);
}

function dedupSwapWinner() {
  if (!_dedupWinnerId || !_dedupLoserId) return;
  [_dedupWinnerId, _dedupLoserId] = [_dedupLoserId, _dedupWinnerId];
  // Aktuelles Paar anhand der IDs finden
  const pair = _dedupPairs.find(p =>
    (p.pA.id === _dedupWinnerId || p.pB.id === _dedupWinnerId) &&
    (p.pA.id === _dedupLoserId  || p.pB.id === _dedupLoserId)
  );
  if (pair) _dedupRenderMergeBody(pair);
}

function dedupIgnorePair() {
  if (!_dedupWinnerId || !_dedupLoserId) return;
  const pA = AppState.db.individuals[_dedupWinnerId];
  const pB = AppState.db.individuals[_dedupLoserId];
  if (!pA || !pB) return;
  _dedupLoadIgnored();
  _dedupIgnored.add(_dedupIgnoreKey(pA, pB));
  _dedupSaveIgnored();
  closeModal('modalMerge');
  // Paar aus Liste entfernen und neu rendern
  _dedupPairs = _dedupPairs.filter(p =>
    !( (p.pA.id === _dedupWinnerId || p.pA.id === _dedupLoserId) &&
       (p.pB.id === _dedupWinnerId || p.pB.id === _dedupLoserId) )
  );
  const statusEl = document.getElementById('dedup-status');
  if (statusEl) statusEl.textContent = _dedupPairs.length + ' verdächtige Paare (Score \u2265 ' + _dedupThreshold + ')';
  _renderDedupList();
}

function dedupConfirmMerge() {
  if (!_dedupWinnerId || !_dedupLoserId) return;
  const winnerName = (AppState.db.individuals[_dedupWinnerId] || {}).name || _dedupWinnerId;
  const loserName  = (AppState.db.individuals[_dedupLoserId]  || {}).name || _dedupLoserId;

  const affectedFams = Object.keys(AppState.db.families).filter(fid => {
    const f = AppState.db.families[fid];
    return f.husb === _dedupLoserId || f.wife === _dedupLoserId ||
           (f.children || []).includes(_dedupLoserId);
  });
  pushUndo('Merge: ' + loserName + ' → ' + winnerName, {
    personIds: [_dedupWinnerId, _dedupLoserId],
    familyIds: affectedFams,
  });

  const ok = _dedupMergePersons(_dedupWinnerId, _dedupLoserId);
  if (!ok) { showToast('Fehler beim Zusammenf\u00fchren'); return; }

  closeModal('modalMerge');

  // Zusammengeführtes Paar und alle Paare, die loserId betreffen, entfernen
  const gone = _dedupLoserId;
  _dedupPairs = _dedupPairs.filter(p => p.pA.id !== gone && p.pB.id !== gone);
  _dedupWinnerId = null;
  _dedupLoserId  = null;

  _renderDedupList();
  showToast('\u2713 Zusammengef\u00fchrt: ' + loserName + ' \u2192 ' + winnerName);

  // Personen-Liste aktualisieren wenn sichtbar
  if (AppState.currentTab === 'persons') renderPersonList();
}
