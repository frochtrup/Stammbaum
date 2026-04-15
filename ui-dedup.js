// ─────────────────────────────────────
//  DUPLIKAT-ERKENNUNG UND MERGE
// ─────────────────────────────────────

// ── Hilfsfunktionen ──────────────────

function _dedupNormName(str) {
  if (!str) return '';
  return str.toLowerCase().trim()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ');
}

function _dedupLevenshtein(a, b) {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  if (a === b) return 1;
  const la = a.length, lb = b.length;
  if (Math.max(la, lb) === 0) return 1;
  const dp = Array.from({ length: la + 1 }, (_, i) => [i]);
  for (let j = 0; j <= lb; j++) dp[0][j] = j;
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return 1 - dp[la][lb] / Math.max(la, lb);
}

function _dedupYearFromGed(dateStr) {
  if (!dateStr) return null;
  const { date1 } = parseGedDate(dateStr);
  const iso = gedDatePartToISO(date1 || dateStr);
  const y = parseInt((iso || '').split('-')[0]);
  return isNaN(y) ? null : y;
}

function _dedupScorePair(pA, pB) {
  const reasons = [];
  let score = 0;

  // Nachname (max 30)
  const snA = _dedupNormName(pA.surname || '');
  const snB = _dedupNormName(pB.surname || '');
  if (snA && snB) {
    const r = _dedupLevenshtein(snA, snB);
    score += r * 30;
    if (r >= 0.9) reasons.push('Nachname identisch');
    else if (r >= 0.7) reasons.push('Nachname ähnlich');
  }

  // Vorname (max 25)
  const gnA = _dedupNormName(pA.given || '');
  const gnB = _dedupNormName(pB.given || '');
  if (gnA && gnB) {
    const r = _dedupLevenshtein(gnA, gnB);
    score += r * 25;
    if (r >= 0.9) reasons.push('Vorname identisch');
    else if (r >= 0.7) reasons.push('Vorname ähnlich');
  }

  // Geschlecht (max 15, Malus -20)
  if (pA.sex !== 'U' && pB.sex !== 'U') {
    if (pA.sex === pB.sex) { score += 15; }
    else { score -= 20; reasons.push('Geschlecht verschieden'); }
  }

  // Geburtsjahr (max 20)
  const yA = _dedupYearFromGed(pA.birth?.date);
  const yB = _dedupYearFromGed(pB.birth?.date);
  if (yA && yB) {
    const diff = Math.abs(yA - yB);
    if      (diff === 0) { score += 20; reasons.push('Geburtsjahr identisch'); }
    else if (diff <= 1)  { score += 15; reasons.push('Geburtsjahr ±1'); }
    else if (diff <= 2)  { score +=  8; }
    else if (diff <= 5)  { score +=  3; }
  } else {
    score += 5; // neutral wenn kein Datum bekannt
  }

  // Geburtsort (max 10)
  const plA = compactPlace(pA.birth?.place || '').toLowerCase().slice(0, 40);
  const plB = compactPlace(pB.birth?.place || '').toLowerCase().slice(0, 40);
  if (plA && plB) {
    const r = _dedupLevenshtein(plA, plB);
    score += r * 10;
    if (r >= 0.9) reasons.push('Geburtsort identisch');
    else if (r >= 0.7) reasons.push('Geburtsort ähnlich');
  }

  return { score: Math.round(score), reasons };
}

// Paarweise Duplikatsuche mit Nachname-Bucketing für Performance
function findDuplicatePairs(threshold) {
  threshold = threshold || 65;
  const persons = Object.values(AppState.db.individuals);
  const results = [];

  // Bucket nach ersten 3 Buchstaben des normierten Nachnamens
  const buckets = {};
  for (const p of persons) {
    const key = _dedupNormName(p.surname || p.name || '').slice(0, 3) || '___';
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(p);
  }

  for (const bucket of Object.values(buckets)) {
    for (let i = 0; i < bucket.length - 1; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        const pA = bucket[i], pB = bucket[j];
        const { score, reasons } = _dedupScorePair(pA, pB);
        if (score >= threshold) {
          results.push({ pA, pB, score, reasons });
        }
      }
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

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
    aEv.sources     = [...new Set([...(aEv.sources||[]),    ...(bEv.sources||[])])];
    aEv.sourcePages = { ...(bEv.sourcePages||{}), ...(aEv.sourcePages||{}) };
    aEv.sourceQUAY  = { ...(bEv.sourceQUAY||{}),  ...(aEv.sourceQUAY||{}) };
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
  if (listEl)   listEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted)">…</div>';
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
    listEl.innerHTML = '<div style="text-align:center;padding:32px 0;color:var(--text-muted);font-style:italic">Keine verdächtigen Paare</div>';
    return;
  }

  if (statusEl) statusEl.textContent = n + ' verdächtige Paare (Score \u2265 ' + _dedupThreshold + ')';

  let html = '';
  for (let i = 0; i < n; i++) {
    const { pA, pB, score, reasons } = _dedupPairs[i];
    const scColor = score >= 85 ? 'var(--danger,#c0392b)' : score >= 75 ? '#b8860b' : 'var(--text-muted)';
    const plA = compactPlace(pA.birth?.place || '');
    const plB = compactPlace(pB.birth?.place || '');
    const metaA = [pA.birth?.date, plA].filter(Boolean).join(' ');
    const metaB = [pB.birth?.date, plB].filter(Boolean).join(' ');
    html += `<div class="fact-row" style="flex-direction:column;align-items:stretch;gap:4px;padding:10px 0;cursor:pointer"
      data-action="dedupOpenMerge" data-pair="${i}">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
        <span style="font-weight:600;font-size:0.88rem;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(pA.name || pA.id)} \u2194 ${esc(pB.name || pB.id)}</span>
        <span style="font-size:0.82rem;font-weight:700;color:${scColor};flex-shrink:0">${score}</span>
      </div>
      <div style="font-size:0.76rem;color:var(--text-muted)">* ${esc(metaA || '?')} &nbsp;\u2194&nbsp; * ${esc(metaB || '?')}</div>
      <div style="font-size:0.74rem;color:var(--text-dim)">${esc(reasons.join(' \u00b7 '))}</div>
      <div style="height:3px;background:var(--border);border-radius:2px;overflow:hidden;margin-top:2px">
        <div style="height:100%;width:${Math.min(100, score)}%;background:${scColor}"></div>
      </div>
    </div>`;
  }
  listEl.innerHTML = html;
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

function _dedupRenderMergeBody(pair) {
  const el = document.getElementById('merge-body');
  if (!el) return;
  const { pA, pB, score, reasons } = pair;
  const winner = AppState.db.individuals[_dedupWinnerId];
  const loser  = AppState.db.individuals[_dedupLoserId];
  if (!winner || !loser) return;

  const wIsA = winner.id === pA.id;
  const _cell = (val, isWinner) =>
    `<td style="padding:5px 8px;font-size:0.82rem${isWinner ? ';font-weight:600;color:var(--accent,#4a90d9)' : ''}">${esc(val || '–')}</td>`;
  const _row = (label, aVal, bVal) =>
    `<tr><td style="padding:5px 8px;font-size:0.76rem;color:var(--text-muted)">${esc(label)}</td>${_cell(aVal, wIsA)}${_cell(bVal, !wIsA)}</tr>`;

  el.innerHTML = `
    <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:10px">Score: <strong>${score}</strong> \u2014 ${esc(reasons.join(', '))}</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:14px">
      <thead><tr>
        <th style="text-align:left;font-size:0.72rem;padding:4px 8px;color:var(--text-muted);font-weight:400">Feld</th>
        <th style="text-align:left;font-size:0.72rem;padding:4px 8px;color:var(--text-muted);font-weight:400${wIsA?';color:var(--accent,#4a90d9);font-weight:600':''}">A: ${esc(pA.name || pA.id)}</th>
        <th style="text-align:left;font-size:0.72rem;padding:4px 8px;color:var(--text-muted);font-weight:400${!wIsA?';color:var(--accent,#4a90d9);font-weight:600':''}">B: ${esc(pB.name || pB.id)}</th>
      </tr></thead>
      <tbody>
        ${_row('Nachname',   pA.surname,                              pB.surname)}
        ${_row('Vorname',    pA.given,                                pB.given)}
        ${_row('Geschlecht', pA.sex,                                  pB.sex)}
        ${_row('Geb. Datum', pA.birth?.date,                          pB.birth?.date)}
        ${_row('Geb. Ort',   compactPlace(pA.birth?.place || ''),     compactPlace(pB.birth?.place || ''))}
        ${_row('Tod Datum',  pA.death?.date,                          pB.death?.date)}
        ${_row('ID',         pA.id,                                   pB.id)}
      </tbody>
    </table>
    <div style="font-size:0.82rem;margin-bottom:8px;padding:8px;background:var(--surface2);border-radius:6px;border:1px solid var(--border)">
      <strong>Bleibt:</strong> ${esc(winner.name || winner.id)} (ID: ${esc(winner.id)})<br>
      <strong>Wird gel\u00f6scht:</strong> ${esc(loser.name || loser.id)} (ID: ${esc(loser.id)})
    </div>
    <button type="button" class="btn" style="width:100%;margin-bottom:10px;background:var(--surface2);color:var(--text);border:1px solid var(--border)"
      data-action="dedupSwapWinner">\u21c4 Seiten tauschen</button>
    <div style="font-size:0.74rem;color:var(--text-muted);line-height:1.5">
      Alle Ereignisse, Quellen, Medien und Familienbindungen beider Personen werden zusammengef\u00fchrt.
      Diese Aktion kann nicht r\u00fcckg\u00e4ngig gemacht werden.
    </div>`;
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
