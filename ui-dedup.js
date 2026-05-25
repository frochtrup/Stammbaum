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

  // pA/pB aus dem aktuellen Paar ermitteln (für per-Feld-Selektion)
  const _curPair = _dedupPairs.find(p =>
    (p.pA.id === winnerId || p.pB.id === winnerId) &&
    (p.pA.id === loserId  || p.pB.id === loserId)
  );
  const pA = _curPair?.pA || A;
  const pB = _curPair?.pB || B;

  // _pick: wählt Wert nach _dedupSelections[field]; Fallback prefer-nonempty
  const _pick = (field, aVal, bVal) => {
    const s = _dedupSelections[field];
    if (!s) return (aVal || '') || (bVal || '');
    const chosen = s === 'A' ? aVal : bVal;
    const other  = s === 'A' ? bVal : aVal;
    return chosen || other || '';
  };
  // prefer-nonempty für Felder ohne Selektion
  const _pref = (aVal, bVal) => (aVal || '') || (bVal || '');

  A.surname = _pick('surname', pA.surname, pB.surname);
  A.given   = _pick('given',   pA.given,   pB.given);
  A.sex     = _pick('sex',     pA.sex,     pB.sex) || 'U';
  // name/nameRaw aus gewähltem surname+given ableiten
  A.name    = [A.given, A.surname].filter(Boolean).join(' ') || _pref(pA.name, pB.name);
  A.nameRaw = A.name;
  A.titl    = _pref(A.titl,    B.titl);
  A.reli    = _pref(A.reli,    B.reli);
  A.email   = _pref(A.email,   B.email);
  A.www     = _pref(A.www,     B.www);
  A.uid     = _pref(A.uid,     B.uid);
  A.grampId = _pref(A.grampId, B.grampId);

  // Sonder-Events: birth/death mit per-Feld-Selektion, chr/buri prefer-nonempty
  for (const evKey of ['birth', 'death', 'chr', 'buri']) {
    const aEv = pA[evKey] || {};
    const bEv = pB[evKey] || {};
    const tgt = A[evKey]  || {}; A[evKey] = tgt;
    const dateKey  = evKey + '.date';
    const placeKey = evKey + '.place';
    if (_DEDUP_SEL_FIELDS.includes(dateKey)) {
      tgt.date  = _pick(dateKey,  aEv.date,  bEv.date);
    } else {
      if (!tgt.date  && bEv.date)  tgt.date  = bEv.date;
    }
    if (_DEDUP_SEL_FIELDS.includes(placeKey)) {
      tgt.place = _pick(placeKey, aEv.place, bEv.place);
    } else {
      if (!tgt.place && bEv.place) tgt.place = bEv.place;
    }
    const _aCits = tgt.citations || [];
    const _bCits = bEv.citations || [];
    tgt.citations = [..._aCits, ..._bCits.filter(bc => !_aCits.some(ac => ac.sid === bc.sid && ac.page === bc.page))];
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
      if (f.children.includes(winnerId)) {
        // Winner already in this family → just remove the loser entry
        f.children.splice(ci, 1);
        if ((f.childRelations||{})[loserId]) delete f.childRelations[loserId];
      } else {
        f.children[ci] = winnerId;
        if ((f.childRelations||{})[loserId]) {
          f.childRelations[winnerId] = f.childRelations[loserId];
          delete f.childRelations[loserId];
        }
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
    const fcId = typeof fc === 'string' ? fc : fc.famId;
    if (!(A.famc||[]).some(x => (typeof x === 'string' ? x : x.famId) === fcId)) {
      A.famc = A.famc || []; A.famc.push(fc);
    }
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
let _dedupSearchQuery = '';
let _dedupWinnerId    = null;
let _dedupLoserId     = null;
let _dedupIgnored     = null; // Set<"idA|idB">
// Init from IDB; one-time migration from localStorage
(async () => {
  const stored = await idbGet('dedup_ignored').catch(() => null);
  if (stored !== null) {
    try { _dedupIgnored = new Set(JSON.parse(stored)); } catch { _dedupIgnored = new Set(); }
  } else {
    const ls = localStorage.getItem('dedup_ignored');
    _dedupIgnored = new Set(ls ? JSON.parse(ls) : []);
    if (ls) { idbPut('dedup_ignored', ls).catch(() => {}); localStorage.removeItem('dedup_ignored'); }
  }
})();
let _dedupSelections  = {};   // { fieldKey: 'A' | 'B' }

// Felder, die im Merge-Modal zeilenweise wählbar sind
const _DEDUP_SEL_FIELDS = [
  'surname', 'given', 'sex',
  'birth.date', 'birth.place',
  'death.date', 'death.place',
];

function _dedupLoadIgnored() {
  if (_dedupIgnored) return;
  _dedupIgnored = new Set(); // IDB init not yet complete — safe fallback
}

function _dedupSaveIgnored() {
  idbPut('dedup_ignored', JSON.stringify([..._dedupIgnored])).catch(() => {});
}

function _dedupIgnoreKey(pA, pB) {
  const ids = [pA.id, pB.id].sort();
  return ids[0] + '|' + ids[1];
}

function openDedupModal() {
  _dedupLoadIgnored();
  _dedupPairs = [];
  _dedupWinnerId    = null;
  _dedupLoserId     = null;
  _dedupSearchQuery = '';
  const statusEl  = document.getElementById('dedup-status');
  const listEl    = document.getElementById('dedup-list');
  const searchEl  = document.getElementById('dedup-search');
  if (statusEl)  statusEl.textContent = 'Noch kein Scan durchgeführt.';
  if (listEl)    listEl.innerHTML = '';
  if (searchEl)  searchEl.value = '';
  // Schwellenwert-Slider zurücksetzen
  const slider = document.getElementById('dedup-threshold');
  if (slider) { slider.value = _dedupThreshold; document.getElementById('dedup-threshold-val').textContent = _dedupThreshold; }
  openModal('modalDedup');
}

function dedupSearchChange(val) {
  _dedupSearchQuery = val.trim().toLowerCase();
  _renderDedupList();
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

  const total = _dedupPairs.length;
  if (!total) {
    if (statusEl) statusEl.textContent = 'Keine Duplikate gefunden.';
    listEl.innerHTML = '<div class="dedup-empty">Keine verdächtigen Paare</div>';
    return;
  }

  // Suchfilter — Originalindex für data-pair beibehalten
  const q = _dedupSearchQuery;
  const _matchPerson = p => {
    const haystack = [p.name, p.given, p.surname, p.id].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(q);
  };
  const toRender = _dedupPairs.reduce((acc, pair, i) => {
    if (!q || _matchPerson(pair.pA) || _matchPerson(pair.pB)) {
      acc.push({ pair, origIdx: i });
    }
    return acc;
  }, []);

  if (statusEl) {
    statusEl.textContent = q
      ? toRender.length + ' von ' + total + ' Paaren (Score \u2265 ' + _dedupThreshold + ')'
      : total + ' verdächtige Paare (Score \u2265 ' + _dedupThreshold + ')';
  }

  if (!toRender.length) {
    listEl.innerHTML = '<div class="dedup-empty">Keine Treffer für \u201e' + esc(q) + '\u201c</div>';
    return;
  }

  let html = '';
  for (const { pair, origIdx } of toRender) {
    const { pA, pB, score, reasons } = pair;
    const scColor = score >= 85 ? 'var(--red)' : score >= 75 ? '#b8860b' : 'var(--text-muted)';
    const plA = compactPlace(pA.birth?.place || '');
    const plB = compactPlace(pB.birth?.place || '');
    const metaA = [pA.birth?.date, plA].filter(Boolean).join(' ');
    const metaB = [pB.birth?.date, plB].filter(Boolean).join(' ');
    html += `<div class="fact-row dedup-pair-row"
      data-action="dedupOpenMerge" data-pair="${origIdx}">
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

  // Selektion initialisieren: Winner-Seite für alle Felder vorausgewählt
  const _winSide = _dedupWinnerId === pA.id ? 'A' : 'B';
  _dedupSelections = Object.fromEntries(_DEDUP_SEL_FIELDS.map(f => [f, _winSide]));

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

  // Klickbare, selektierbare Zeile (Feldwahl A/B)
  const _selRow = (label, field, aVal, bVal) => {
    const selA = _dedupSelections[field] === 'A';
    const selB = _dedupSelections[field] === 'B';
    return `<tr data-sel-field="${field}">
      <td class="dedup-merge-td-label">${esc(label)}</td>
      <td class="dedup-merge-td${selA ? ' selected' : ''}" data-sel-side="A">${esc(aVal || '\u2013')}</td>
      <td class="dedup-merge-td${selB ? ' selected' : ''}" data-sel-side="B">${esc(bVal || '\u2013')}</td>
    </tr>`;
  };
  // Nicht-selektierbare Zeile (Referenz-Felder)
  const _row = (label, aVal, bVal) =>
    `<tr><td class="dedup-merge-td-label">${esc(label)}</td>
      <td class="dedup-merge-td${wIsA ? ' winner' : ''}">${esc(aVal || '\u2013')}</td>
      <td class="dedup-merge-td${!wIsA ? ' winner' : ''}">${esc(bVal || '\u2013')}</td>
    </tr>`;

  el.innerHTML = `
    <div class="dedup-merge-info">Score: <strong>${score}</strong> \u2014 ${esc(reasons.join(', '))}</div>
    <p class="dedup-sel-hint">Klick auf eine Zelle w\u00e4hlt den \u00fcbernommenen Wert.</p>
    <table class="dedup-merge-table">
      <thead><tr>
        <th class="dedup-merge-th">Feld</th>
        <th class="dedup-merge-th${wIsA ? ' winner' : ''}">A: ${esc(pA.name || pA.id)}</th>
        <th class="dedup-merge-th${!wIsA ? ' winner' : ''}">B: ${esc(pB.name || pB.id)}</th>
      </tr></thead>
      <tbody>
        ${_selRow('Nachname',   'surname',     pA.surname,                          pB.surname)}
        ${_selRow('Vorname',    'given',       pA.given,                            pB.given)}
        ${_selRow('Geschlecht', 'sex',         pA.sex,                              pB.sex)}
        ${_selRow('Geb. Datum', 'birth.date',  pA.birth?.date,                      pB.birth?.date)}
        ${_selRow('Geb. Ort',   'birth.place', compactPlace(pA.birth?.place || ''), compactPlace(pB.birth?.place || ''))}
        ${_selRow('Tod Datum',  'death.date',  pA.death?.date,                      pB.death?.date)}
        ${_selRow('Tod Ort',    'death.place', compactPlace(pA.death?.place || ''), compactPlace(pB.death?.place || ''))}
        ${_row(   'Eltern',                    _dedupParents(pA),                   _dedupParents(pB))}
        ${_row(   'Partner',                   _dedupPartners(pA),                  _dedupPartners(pB))}
        ${_row(   'ID',                        pA.id,                               pB.id)}
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

// ── Forschungseintrag aus Merge-Modal ────────────────────────────
// Legt bei beiden Personen einen _rlog-Eintrag an und kehrt zur
// Paar-Liste zurück, ohne zu mergen.
function dedupCreateRlog() {
  if (!_dedupWinnerId || !_dedupLoserId) return;
  const db = AppState.db;
  const pair = _dedupPairs.find(p =>
    (p.pA.id === _dedupWinnerId || p.pB.id === _dedupWinnerId) &&
    (p.pA.id === _dedupLoserId  || p.pB.id === _dedupLoserId)
  );
  const pA = pair?.pA || db.individuals[_dedupWinnerId];
  const pB = pair?.pB || db.individuals[_dedupLoserId];
  if (!pA || !pB) return;

  const persA = db.individuals[pA.id];
  const persB = db.individuals[pB.id];
  if (!persA || !persB) return;

  const today   = new Date().toISOString().slice(0, 10);
  const score   = pair?.score ?? '?';
  const reasons = (pair?.reasons || []).join(', ');
  const noteBase = [
    'Gründe: ' + reasons,
    'A (' + pA.id + '): *' + (pA.birth?.date || '?') + ' ' + compactPlace(pA.birth?.place || ''),
    'B (' + pB.id + '): *' + (pB.birth?.date || '?') + ' ' + compactPlace(pB.birth?.place || ''),
  ].join('\n').trim();

  if (!persA._rlog) persA._rlog = [];
  persA._rlog.push({
    date: today, repoRef: '', sourRef: '', result: 'pending',
    query: 'Duplikat-Prüfung mit ' + (pB.name || pB.id) + ' (' + pB.id + ') — Score ' + score,
    note: noteBase,
  });

  if (!persB._rlog) persB._rlog = [];
  persB._rlog.push({
    date: today, repoRef: '', sourRef: '', result: 'pending',
    query: 'Duplikat-Prüfung mit ' + (pA.name || pA.id) + ' (' + pA.id + ') — Score ' + score,
    note: noteBase,
  });

  markChanged();
  if (typeof _refreshRlogSection === 'function') {
    _refreshRlogSection(pA.id);
    _refreshRlogSection(pB.id);
  }

  closeModal('modalMerge');
  openModal('modalDedup');
  showToast('✓ Forschungseintrag bei beiden Personen angelegt');
}

// ── Zeilenweise Feldauswahl im Merge-Modal ────────────────────────
// Klick auf eine [data-sel-side]-Zelle → Selektion für dieses Feld umschalten
document.addEventListener('click', e => {
  const td = e.target.closest('[data-sel-side]');
  if (!td) return;
  const row = td.closest('[data-sel-field]');
  if (!row) return;
  const field = row.dataset.selField;
  const side  = td.dataset.selSide;
  _dedupSelections[field] = side;
  row.querySelectorAll('[data-sel-side]').forEach(c => c.classList.remove('selected'));
  td.classList.add('selected');
});

// ── Datenbank-Reparatur ───────────────

function repairDatabase() {
  const db = AppState.db;
  if (!db) { showToast('Keine Datei geladen.', 'warn'); return; }

  const famcIdOf = c => typeof c === 'string' ? c : c.famId;
  let fixes = [];

  // 1) Doppelte Kinder in Familien
  for (const f of Object.values(db.families)) {
    const before = f.children.length;
    const seen = new Set();
    f.children = f.children.filter(cid => {
      if (seen.has(cid)) return false;
      seen.add(cid); return true;
    });
    if (f.children.length < before)
      fixes.push(`Familie ${f.id}: ${before - f.children.length} doppelte(s) Kind entfernt`);
  }

  // 2) Doppelte famc-Einträge bei Personen
  for (const p of Object.values(db.individuals)) {
    if (!p.famc?.length) continue;
    const before = p.famc.length;
    const seen = new Set();
    p.famc = p.famc.filter(fc => {
      const id = famcIdOf(fc);
      if (seen.has(id)) return false;
      seen.add(id); return true;
    });
    if (p.famc.length < before)
      fixes.push(`Person ${p.id} (${p.name || '?'}): ${before - p.famc.length} doppelte(r) famc-Eintrag entfernt`);
  }

  // 3) Doppelte fams-Einträge bei Personen
  for (const p of Object.values(db.individuals)) {
    if (!p.fams?.length) continue;
    const before = p.fams.length;
    p.fams = [...new Set(p.fams)];
    if (p.fams.length < before)
      fixes.push(`Person ${p.id} (${p.name || '?'}): ${before - p.fams.length} doppelte(r) fams-Eintrag entfernt`);
  }

  // 4) famc-Referenzen auf nicht-existente Familien
  for (const p of Object.values(db.individuals)) {
    if (!p.famc?.length) continue;
    const before = p.famc.length;
    p.famc = p.famc.filter(fc => !!db.families[famcIdOf(fc)]);
    if (p.famc.length < before)
      fixes.push(`Person ${p.id} (${p.name || '?'}): ${before - p.famc.length} verwaiste(r) famc-Eintrag entfernt`);
  }

  // 5) fams-Referenzen auf nicht-existente Familien
  for (const p of Object.values(db.individuals)) {
    if (!p.fams?.length) continue;
    const before = p.fams.length;
    p.fams = p.fams.filter(fid => !!db.families[fid]);
    if (p.fams.length < before)
      fixes.push(`Person ${p.id} (${p.name || '?'}): ${before - p.fams.length} verwaiste(r) fams-Eintrag entfernt`);
  }

  if (fixes.length === 0) {
    showToast('Datenbank ist konsistent — keine Fehler gefunden.', 'success');
    return;
  }

  markChanged();
  const msg = fixes.length + ' Problem' + (fixes.length === 1 ? '' : 'e') + ' behoben:\n' + fixes.join('\n');
  console.info('[repairDatabase]', msg);
  showToast(fixes.length + ' Datenfehler repariert. Details in der Konsole.', 'success');
  alert('Datenbank repariert:\n\n' + fixes.join('\n'));
}
