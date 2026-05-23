// ─────────────────────────────────────
//  DATEI-VERGLEICHS-ENGINE
//  Parsen, Matching (via _dedupScorePair aus gedcom.js),
//  Diff-Berechnung und Patch-Anwendung
// ─────────────────────────────────────

const _cmpState = {
  db:           null,   // geparstes zweites db
  filename:     '',     // Dateiname für Auto-Quelle
  matches:      [],     // [{baseId, cmpId, score, reasons, status}]
  // status: 'matched' (≥75) | 'uncertain' (40–74) | 'new' (<40)
  matchConfirm: {},     // {cmpId: baseId | null}  — Nutzer-Bestätigung unsicherer Matches
  selections:   {},     // {cmpId: {fieldKey: true|false|'base'|'import'|'both'|'rlog'}}
  importSourceId: null,
  rlogCreated:  {},     // {baseId: count} — Forschungseinträge in dieser Session angelegt
};

// ── Parsen ────────────────────────────────────────────────────────────────────

function cmpLoadFile(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 50 * 1024 * 1024) {
      reject(new Error('Datei zu groß (max. 50 MB)'));
      return;
    }

    if (file.name.toLowerCase().endsWith('.gramps')) {
      parseGRAMPS(file)
        .then(db => { _cmpState.db = db; _cmpState.filename = file.name; resolve(db); })
        .catch(reject);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lesefehler'));
    reader.onload  = e => {
      const text = e.target.result;
      const _done = db => { _cmpState.db = db; _cmpState.filename = file.name; resolve(db); };
      const _sync = () => {
        try { _done(parseGEDCOM(text)); }
        catch (err) { reject(err); }
      };

      if (typeof Worker !== 'undefined') {
        const worker = new Worker('gedcom-worker.js');
        worker.onmessage = ev => {
          if (ev.data.type === 'progress') {
            if (typeof updateLoadingProgress === 'function') updateLoadingProgress(ev.data.pct);
            return;
          }
          worker.terminate();
          if (ev.data.type === 'error') { _sync(); return; }
          _done(ev.data.db);
        };
        worker.onerror = () => { worker.terminate(); _sync(); };
        worker.postMessage({ type: 'parse', text });
      } else {
        _sync();
      }
    };
    reader.readAsText(file, 'UTF-8');
  });
}

// ── Matching ──────────────────────────────────────────────────────────────────
// Bucketing analog zu findDuplicatePairs() in gedcom.js (O(n·k²) statt O(n²))

function cmpMatchPersons() {
  const baseDb = AppState.db;
  const cmpDb  = _cmpState.db;
  if (!baseDb || !cmpDb) return [];

  // Bucketing der Basis-Personen nach Nachname-Präfix
  const buckets = {};
  for (const p of Object.values(baseDb.individuals)) {
    const key = _dedupNormName(p.surname || p.name || '').slice(0, 3) || '___';
    (buckets[key] = buckets[key] || []).push(p);
  }

  const results      = [];
  const matchedBases = new Set();

  for (const cmpP of Object.values(cmpDb.individuals)) {
    const key = _dedupNormName(cmpP.surname || cmpP.name || '').slice(0, 3) || '___';
    const candidates = [...(buckets[key] || []), ...(key !== '___' ? (buckets['___'] || []) : [])];

    let best = null;
    for (const baseP of candidates) {
      if (matchedBases.has(baseP.id)) continue;
      const { score, reasons } = _dedupScorePair(baseP, cmpP);
      if (!best || score > best.score) best = { baseP, score, reasons };
    }

    if (best && best.score >= 75) {
      matchedBases.add(best.baseP.id);
      results.push({ baseId: best.baseP.id, cmpId: cmpP.id, score: best.score, reasons: best.reasons, status: 'matched' });
    } else if (best && best.score >= 40) {
      results.push({ baseId: best.baseP.id, cmpId: cmpP.id, score: best.score, reasons: best.reasons, status: 'uncertain' });
    } else {
      results.push({ baseId: null, cmpId: cmpP.id, score: 0, reasons: [], status: 'new' });
    }
  }

  _cmpState.matches = results;
  return results;
}

// ── Diff-Engine ───────────────────────────────────────────────────────────────

function cmpComputePersonDiff(baseId, cmpId) {
  const base = AppState.db.individuals[baseId];
  const cmpP = _cmpState.db.individuals[cmpId];
  if (!base || !cmpP) return null;

  const identical = [];
  const additions = [];
  const conflicts = [];

  const _field = (label, fieldKey, bVal, cVal) => {
    const b = (bVal || '').trim();
    const c = (cVal || '').trim();
    if (!c) return;                        // cmp hat nichts → nichts zu tun
    if (!b) { additions.push({ field: fieldKey, label, value: c }); return; }
    if (b === c) { identical.push({ field: fieldKey, label, value: b }); return; }
    conflicts.push({ field: fieldKey, label, baseVal: b, cmpVal: c });
  };

  _field('Nachname',   'surname', base.surname,                          cmpP.surname);
  _field('Vorname',    'given',   base.given,                            cmpP.given);
  _field('Geschlecht', 'sex',     base.sex,                              cmpP.sex);

  const _EV_LABELS = { birth: 'Geburt', death: 'Tod', chr: 'Taufe', buri: 'Beerdigung' };
  for (const [evKey, evLabel] of Object.entries(_EV_LABELS)) {
    _field(evLabel + ' Datum', evKey + '.date',  base[evKey]?.date,                       cmpP[evKey]?.date);
    _field(evLabel + ' Ort',   evKey + '.place', compactPlace(base[evKey]?.place || ''),  compactPlace(cmpP[evKey]?.place  || ''));
  }

  // Freie Ereignisse: Vergleich über type+date Schlüssel
  const baseEvKeys = new Set((base.events || []).map(ev => (ev.type || '') + '|' + (ev.date || '')));
  for (const ev of (cmpP.events || [])) {
    const k = (ev.type || '') + '|' + (ev.date || '');
    const evLabel = (EVENT_LABELS[ev.type] || ev.type || 'Ereignis') + (ev.date ? ' ' + ev.date : '');
    if (!baseEvKeys.has(k)) {
      const summary = [ev.date, compactPlace(ev.place || ''), ev.note].filter(Boolean).join(' · ');
      additions.push({ field: 'event|' + k, label: evLabel, value: summary });
    }
  }

  // Notizen: Texte, die in der Basis noch nicht vorhanden sind
  const baseNoteSet = new Set((base.noteTexts || []).map(n => n.trim()));
  for (const note of (cmpP.noteTexts || [])) {
    const t = note.trim();
    if (t && !baseNoteSet.has(t)) {
      additions.push({ field: 'note|' + t.slice(0, 60), label: 'Notiz', value: t.length > 100 ? t.slice(0, 100) + '…' : t });
    }
  }

  const parents  = _cmpContextRows(base, cmpP, 'parents');
  const partners = _cmpContextRows(base, cmpP, 'partners');

  return { identical, additions, conflicts, parents, partners };
}

function _cmpContextRows(baseP, cmpP, type) {
  const bItems = type === 'parents' ? _cmpGetParentInfos(baseP, AppState.db) : _cmpGetPartnerInfos(baseP, AppState.db);
  const cItems = type === 'parents' ? _cmpGetParentInfos(cmpP, _cmpState.db) : _cmpGetPartnerInfos(cmpP, _cmpState.db);
  if (!bItems.length && !cItems.length) return [];

  const rows = [];
  const maxLen = Math.max(bItems.length, cItems.length);
  for (let i = 0; i < maxLen; i++) {
    const b = bItems[i] || { name: '–', matchStatus: null };
    const c = cItems[i] || { name: '–', matchStatus: null };
    rows.push({ label: i === 0 ? (type === 'parents' ? 'Eltern' : 'Partner') : '', baseVal: b.name, cmpVal: c.name, baseStatus: b.matchStatus, cmpStatus: c.matchStatus });
  }
  return rows;
}

function _cmpGetParentInfos(p, db) {
  const result = [];
  for (const fc of (p.famc || [])) {
    const f = db.families?.[fc.famId];
    if (!f) continue;
    for (const roleId of [f.husb, f.wife].filter(Boolean)) {
      const person = db.individuals?.[roleId];
      if (!person) continue;
      const matchStatus = (db === AppState.db) ? 'base' : _cmpMatchStatus(roleId);
      result.push({ name: person.name || person.id, matchStatus });
    }
  }
  return result;
}

function _cmpGetPartnerInfos(p, db) {
  const result = [];
  for (const famId of (p.fams || [])) {
    const f = db.families?.[famId];
    if (!f) continue;
    const otherId = f.husb === p.id ? f.wife : f.husb;
    const other   = otherId && db.individuals?.[otherId];
    if (!other) continue;
    const matchStatus = (db === AppState.db) ? 'base' : _cmpMatchStatus(otherId);
    result.push({ name: other.name || other.id, matchStatus });
  }
  return result;
}

// Gibt 'matched'|'uncertain'|'new'|null für eine cmpId zurück
function _cmpMatchStatus(cmpId) {
  const m = _cmpState.matches.find(x => x.cmpId === cmpId);
  return m ? m.status : null;
}

// ── Default-Selektion ─────────────────────────────────────────────────────────
// Additions: alle akzeptiert. Konflikte: Basis bevorzugt.

function cmpInitSelections(cmpId, diff) {
  if (_cmpState.selections[cmpId]) return; // bereits initialisiert
  const sel = {};
  for (const a of (diff.additions || [])) sel[a.field] = true;
  for (const c of (diff.conflicts || [])) sel[c.field] = 'base';
  _cmpState.selections[cmpId] = sel;
}

// ── Default-Selektion für ALLE gematchten Personen ────────────────────────────
// Wird direkt nach cmpMatchPersons() aufgerufen, sodass der Footer-Counter
// von Anfang an die Gesamtzahl zeigt und kein Eintrag still übersprungen wird.

function cmpInitAllSelections() {
  for (const match of _cmpState.matches) {
    if (_cmpState.selections[match.cmpId]) continue;
    if (match.status === 'new') {
      // Neue Personen: default nicht importieren, Nutzer muss explizit ✓ setzen
      _cmpState.selections[match.cmpId] = { '__import_new': false };
      continue;
    }
    const baseId = _cmpResolvedBaseId(match);
    if (!baseId) continue;
    const diff = cmpComputePersonDiff(baseId, match.cmpId);
    if (diff) cmpInitSelections(match.cmpId, diff);
  }
}

// ── Statistik ─────────────────────────────────────────────────────────────────

function cmpStats() {
  const matched   = _cmpState.matches.filter(m => m.status === 'matched').length;
  const uncertain = _cmpState.matches.filter(m => m.status === 'uncertain').length;
  const newP      = _cmpState.matches.filter(m => m.status === 'new').length;
  return { total: _cmpState.matches.length, matched, uncertain, newP };
}

// ── Patch anwenden ────────────────────────────────────────────────────────────

function cmpApplyPatch(importSourceConfig) {
  const db    = AppState.db;
  const cmpDb = _cmpState.db;
  const sels  = _cmpState.selections;

  // Betroffene IDs vor Änderungen sammeln (für Undo-Snapshot)
  const affectedPersonIds = [];
  for (const match of _cmpState.matches) {
    const sel = sels[match.cmpId];
    if (!sel) continue;
    const hasWork = Object.entries(sel).some(([k, v]) => !k.startsWith('__') && v && v !== 'base');
    const isNewImport = sel['__import_new'] === true;
    if (!hasWork && !isNewImport) continue;
    if (match.status !== 'new') {
      const bid = _cmpResolvedBaseId(match);
      if (bid) affectedPersonIds.push(bid);
    }
  }
  if (affectedPersonIds.length) {
    pushUndo('Import-Vergleich', { personIds: affectedPersonIds });
  }

  // Import-Quelle anlegen
  let importSrcId = null;
  if (importSourceConfig && importSourceConfig.create !== false) {
    importSrcId = nextId('S');
    const months  = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const d       = new Date();
    const dateStr = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    db.sources[importSrcId] = {
      id: importSrcId,
      titl: importSourceConfig.title || `Import: ${_cmpState.filename}`,
      auth: '', abbr: 'Import',
      date: importSourceConfig.date || dateStr,
      publ: '', note: importSourceConfig.note || '',
      topSources: [], topSourcePages: {}, topSourceQUAY: {},
      media: [], noteTexts: [], _passthrough: [],
    };
    _cmpState.importSourceId = importSrcId;
  }

  let patchCount = 0;

  for (const match of _cmpState.matches) {
    const sel = sels[match.cmpId];
    if (!sel) continue;

    // Neue Person importieren
    if (match.status === 'new' && sel['__import_new'] === true) {
      _cmpDoImportNew(match.cmpId, importSrcId, cmpDb, db);
      patchCount++;
      continue;
    }
    if (match.status === 'uncertain' && _cmpState.matchConfirm[match.cmpId] === null && sel['__import_new'] === true) {
      _cmpDoImportNew(match.cmpId, importSrcId, cmpDb, db);
      patchCount++;
      continue;
    }

    const baseId = _cmpResolvedBaseId(match);
    if (!baseId) continue;
    const base = db.individuals[baseId];
    const cmpP = cmpDb.individuals[match.cmpId];
    if (!base || !cmpP) continue;

    const hasRlog = Object.entries(sel).some(([k, v]) => !k.startsWith('__') && v === 'rlog');
    const rlogDiff = hasRlog ? cmpComputePersonDiff(baseId, match.cmpId) : null;

    let dataApplied = false;
    let rlogAdded   = 0;
    for (const [fieldKey, decision] of Object.entries(sel)) {
      if (fieldKey.startsWith('__')) continue;
      if (!decision || decision === 'base') continue;
      if (decision === 'rlog') {
        _cmpCreateRlogEntry(base, fieldKey, rlogDiff, _cmpState.filename);
        rlogAdded++;
      } else {
        _cmpApplyField(base, cmpP, fieldKey, decision, importSrcId);
        dataApplied = true;
      }
    }

    if (dataApplied || rlogAdded > 0) {
      _rebuildPersonSourceRefs(base);

      if (dataApplied) {
        // Zusammenfassender RLOG-Eintrag nur wenn Daten tatsächlich übernommen wurden
        const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
        const d = new Date();
        if (!base._rlog) base._rlog = [];
        base._rlog.push({
          date: `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`,
          repoRef: '', sourRef: importSrcId || '',
          query: '', result: 'found',
          note: `Ergänzt aus: ${_cmpState.filename}`,
        });
      }
      if (rlogAdded > 0) {
        _cmpState.rlogCreated[baseId] = (_cmpState.rlogCreated[baseId] || 0) + rlogAdded;
      }
      patchCount++;
    }
  }

  UIState._searchIndexDirty = true;
  UIState._placesCache      = null;
  UIState._hofCache         = null;
  markChanged();
  return patchCount;
}

function _cmpResolvedBaseId(match) {
  if (match.status === 'matched') return match.baseId;
  if (match.status === 'uncertain') {
    const confirmed = _cmpState.matchConfirm[match.cmpId];
    return confirmed !== undefined ? confirmed : match.baseId;
  }
  return null;
}

function _cmpApplyField(base, cmpP, fieldKey, decision, importSrcId) {
  // ── Freies Ereignis ──
  if (fieldKey.startsWith('event|')) {
    if (decision !== true) return;
    const evKey = fieldKey.slice(6);
    const ev    = (cmpP.events || []).find(e => (e.type || '') + '|' + (e.date || '') === evKey);
    if (!ev) return;
    const clone  = typeof structuredClone === 'function' ? structuredClone : v => JSON.parse(JSON.stringify(v));
    const newEv  = clone(ev);
    if (importSrcId && !(newEv.citations?.length)) {
      newEv.citations = [{ sid: importSrcId, page: '', quay: '' }];
    }
    if (!base.events) base.events = [];
    base.events.push(newEv);
    return;
  }

  // ── Notiz ──
  if (fieldKey.startsWith('note|')) {
    const prefix   = fieldKey.slice(5);
    const fullNote = (cmpP.noteTexts || []).find(n => n.trim().startsWith(prefix.slice(0, 60)));
    if (fullNote) {
      if (!base.noteTexts) base.noteTexts = [];
      base.noteTexts.push(fullNote);
      base.noteText = base.noteTexts.join('\n');
    }
    return;
  }

  const parts = fieldKey.split('.');

  // ── Event-Unterfeld (birth.date, death.place …) ──
  if (parts.length === 2) {
    const [evKey, subKey] = parts;
    if (!base[evKey]) base[evKey] = {};
    const importVal = cmpP[evKey]?.[subKey] || '';

    if (decision === 'import') {
      base[evKey][subKey] = importVal;
    } else if (decision === 'both') {
      // Importierten Wert als Notiz anhängen
      if (!base.noteTexts) base.noteTexts = [];
      const lbl = subKey === 'date' ? 'Datum' : 'Ort';
      base.noteTexts.push(`Alternativer ${evKey} ${lbl} (Import): ${importVal}`);
      base.noteText = base.noteTexts.join('\n');
    } else {
      // decision === true (Addition)
      base[evKey][subKey] = importVal;
    }
    // Quellenbeleg für veränderte Event-Felder
    if (importSrcId && importVal && decision !== 'both') {
      if (!base[evKey].citations) base[evKey].citations = [];
      if (!base[evKey].citations.some(c => c.sid === importSrcId)) {
        base[evKey].citations.push({ sid: importSrcId, page: '', quay: '' });
      }
    }
    return;
  }

  // ── Skalares Top-Level-Feld (surname, given, sex) ──
  if (decision === 'import') {
    base[fieldKey] = cmpP[fieldKey];
  } else if (decision === 'both' && (fieldKey === 'surname' || fieldKey === 'given')) {
    if (!base.extraNames) base.extraNames = [];
    base.extraNames.push({ name: cmpP[fieldKey], type: 'AKA', lang: '' });
  } else {
    // Addition: Feld war leer → direkt setzen
    base[fieldKey] = cmpP[fieldKey];
  }
}

function _cmpCreateRlogEntry(base, fieldKey, diff, filename) {
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const d      = new Date();
  const date   = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;

  const addition = diff?.additions?.find(a => a.field === fieldKey);
  const conflict  = diff?.conflicts?.find(c => c.field === fieldKey);

  let query = '';
  if (addition) {
    query = `${addition.label}: "${addition.value}" — aus ${filename}`;
  } else if (conflict) {
    query = `${conflict.label}: Basis="${conflict.baseVal}" / Import="${conflict.cmpVal}" — aus ${filename}`;
  } else {
    query = `${fieldKey} — aus ${filename}`;
  }

  if (!base._rlog) base._rlog = [];
  base._rlog.push({
    date,
    repoRef: '', sourRef: _cmpState.importSourceId || '',
    query,
    result: 'pending',
    note: '',
  });
}

function _cmpDoImportNew(cmpId, importSrcId, cmpDb, db) {
  const cmpP = cmpDb.individuals[cmpId];
  if (!cmpP) return;

  const newId = nextId('I');
  const clone = typeof structuredClone === 'function' ? structuredClone : v => JSON.parse(JSON.stringify(v));
  const newP  = clone(cmpP);
  newP.id = newId;

  if (importSrcId) {
    for (const evKey of ['birth', 'death', 'chr', 'buri']) {
      if (newP[evKey]?.date || newP[evKey]?.place) {
        if (!newP[evKey]) newP[evKey] = {};
        if (!newP[evKey].citations?.length) {
          newP[evKey].citations = [{ sid: importSrcId, page: '', quay: '' }];
        }
      }
    }
  }

  db.individuals[newId] = newP;
  _rebuildPersonSourceRefs(newP);

  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const d = new Date();
  if (!newP._rlog) newP._rlog = [];
  newP._rlog.push({
    date: `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`,
    repoRef: '', sourRef: importSrcId || '',
    query: '', result: 'found',
    note: `Neu importiert aus: ${_cmpState.filename}`,
  });
}
