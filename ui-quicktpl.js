// ─────────────────────────────────────────────────────────────
//  QUICK-TPL — Quellengebundene Eingabe-Templates (Phase A)
//  Konzept: ROADMAP → QUICK-TPL.
//  Template = impliziter Kontext (Quelle/Ort/QUAY/URL-Muster)
//            + Basismuster (Code-definierter Feld-Fluss)
//            + produces-Mapping (welche Datensätze entstehen).
//  Persistenz: IDB-Cache ('quick_templates') + portable JSON-Datei.
// ─────────────────────────────────────────────────────────────

// ── Basismuster: Code-definierte, geordnete Feld-Flüsse ──────────────────────
// type: 'date' | 'surname' | 'given' | 'page'
// Reihenfolge der Felder = Erfassungs-Reihenfolge (Datum zuerst, Nachname vor Vorname).
const QT_BASE_PATTERNS = {
  marriage: {
    label: 'Heirat (Heiratsbuch)',
    icon: '⚭',
    produces: 'family',
    fields: [
      { key: 'mdate',  label: 'Heiratsdatum', type: 'date'    },
      { key: 'hSurn',  label: 'Nachname ♂',   type: 'surname' },
      { key: 'hGiven', label: 'Vorname ♂',    type: 'given'   },
      { key: 'wSurn',  label: 'Nachname ♀',   type: 'surname' },
      { key: 'wGiven', label: 'Vorname ♀',    type: 'given'   },
      { key: 'page',   label: 'Seite / Eintrag', type: 'page' },
    ],
    // Personen-Rollen für Dedup-Matching (Phase B): Treffer-Box nach dem Vornamen.
    persons: [
      { role: 'h', sex: 'M', label: 'Ehemann', surnKey: 'hSurn', givenKey: 'hGiven' },
      { role: 'w', sex: 'F', label: 'Ehefrau', surnKey: 'wSurn', givenKey: 'wGiven' },
    ],
  },
  // ── Phase C: Einzelperson-Muster ─────────────────────────────────────────────
  baptism: {
    label: 'Taufe (Taufbuch)',
    icon: '✝',
    produces: 'person',
    fields: [
      { key: 'bdate',  label: 'Taufdatum',       type: 'date'    },
      { key: 'surn',   label: 'Nachname',         type: 'surname' },
      { key: 'given',  label: 'Vorname',          type: 'given'   },
      { key: 'page',   label: 'Seite / Eintrag',  type: 'page'    },
    ],
    persons: [
      { role: 'p', sex: 'U', label: 'Täufling', surnKey: 'surn', givenKey: 'given' },
    ],
  },
  burial: {
    label: 'Sterbefall (Sterberegister)',
    icon: '✞',
    produces: 'person',
    fields: [
      { key: 'ddate',  label: 'Sterbedatum',      type: 'date'    },
      { key: 'bdate',  label: 'Beerdigungsdatum', type: 'date'    },
      { key: 'surn',   label: 'Nachname',          type: 'surname' },
      { key: 'given',  label: 'Vorname',           type: 'given'   },
      { key: 'page',   label: 'Seite / Eintrag',  type: 'page'    },
    ],
    persons: [
      { role: 'p', sex: 'U', label: 'Verstorbene/r', surnKey: 'surn', givenKey: 'given' },
    ],
  },
};

// ── State + Persistenz ───────────────────────────────────────────────────────
// AppState.quickTemplates wird in gedcom.js AppState NICHT vorab deklariert;
// hier lazy initialisiert (Array von Template-Objekten).
function _qtList() {
  if (!Array.isArray(AppState.quickTemplates)) AppState.quickTemplates = [];
  return AppState.quickTemplates;
}

async function loadQuickTemplates() {
  try {
    const raw = await idbGet('quick_templates');
    AppState.quickTemplates = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];
  } catch (e) { AppState.quickTemplates = []; }
  return _qtList();
}

function saveQuickTemplates() {
  idbPut('quick_templates', JSON.stringify(_qtList())).catch(() => {});
}

// Portable Config-Datei (Quelle der Wahrheit; IDB ist Cache)
function exportQuickTemplates() {
  const blob = new Blob([JSON.stringify({ version: 1, templates: _qtList() }, null, 2)],
    { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'stammbaum-templates.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  showToast('Templates exportiert', 'success');
}

function importQuickTemplatesFile(input) {
  const file = input.files?.[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      const arr = Array.isArray(data) ? data : (data.templates || []);
      if (!Array.isArray(arr)) throw new Error('Format');
      AppState.quickTemplates = arr;
      saveQuickTemplates();
      qtRenderManagerList();
      showToast(`${arr.length} Template(s) importiert`, 'success');
    } catch (e) { showToast('Import fehlgeschlagen: ungültige Datei', 'error'); }
    input.value = '';
  };
  r.readAsText(file);
}

// ── Template-Verwaltung (Modal modalQtManager) ───────────────────────────────
let _qtEditId = null;   // null = neues Template

function showQtManager() {
  closeModal('modalAdd');
  _qtShowList();
  openModal('modalQtManager');
}

function _qtShowList() {
  document.getElementById('qt-list-view').hidden = false;
  document.getElementById('qt-edit-view').hidden = true;
  document.getElementById('lbl-modalQtManager').textContent = 'Eingabe-Templates';
  document.getElementById('qt-mgr-close').hidden  = false;
  document.getElementById('qt-edit-cancel').hidden = true;
  document.getElementById('qt-edit-save').hidden   = true;
  qtRenderManagerList();
}

function qtRenderManagerList() {
  const list = document.getElementById('qt-list');
  if (!list) return;
  const tpls = _qtList();
  if (!tpls.length) {
    list.innerHTML = '<p class="form-hint" style="padding:8px 0">Noch keine Templates. „+ Neues Template" anlegen.</p>';
    return;
  }
  list.innerHTML = tpls.map(t => {
    const base = QT_BASE_PATTERNS[t.base];
    const src = AppState.db.sources?.[t.context?.sid];
    const srcLabel = src ? (src.abbr || src.title || t.context.sid) : (t.context?.sid || '—');
    return `<div class="qt-item">
      <button type="button" class="qt-item-run" data-action="qtStartEntry" data-tid="${esc(t.id)}" title="Erfassung starten">
        <span class="qt-item-icon">${esc(base?.icon || '⚡')}</span>
        <span class="qt-item-text">
          <span class="qt-item-name">${esc(t.name || '(ohne Name)')}</span>
          <span class="qt-item-sub">${esc((base?.label || t.base) + ' · ' + srcLabel)}</span>
        </span>
      </button>
      <button type="button" class="qt-item-edit" data-action="qtEditTemplate" data-tid="${esc(t.id)}" title="Bearbeiten">✎</button>
      <button type="button" class="qt-item-del" data-action="qtDeleteTemplate" data-tid="${esc(t.id)}" title="Löschen">✕</button>
    </div>`;
  }).join('');
}

function qtNewTemplate() { _qtEditTemplate(null); }
function qtEditTemplate(id)  { _qtEditTemplate(id); }

function _qtEditTemplate(id) {
  _qtEditId = id;
  const t = id ? _qtList().find(x => x.id === id) : null;
  const ctx = t?.context || {};
  document.getElementById('qt-list-view').hidden = true;
  document.getElementById('qt-edit-view').hidden = false;
  document.getElementById('lbl-modalQtManager').textContent = t ? 'Template bearbeiten' : 'Neues Template';
  document.getElementById('qt-mgr-close').hidden  = true;
  document.getElementById('qt-edit-cancel').hidden = false;
  document.getElementById('qt-edit-save').hidden   = false;

  document.getElementById('qt-f-name').value     = t?.name || '';
  document.getElementById('qt-f-base').value      = t?.base || 'marriage';
  document.getElementById('qt-f-src-sid').value   = ctx.sid || '';
  const src = ctx.sid ? AppState.db.sources?.[ctx.sid] : null;
  document.getElementById('qt-f-src').value       = src ? (src.abbr || src.title || ctx.sid) : '';
  document.getElementById('qt-f-place').value      = ctx.place || '';
  document.getElementById('qt-f-quay').value        = ctx.quay != null ? String(ctx.quay) : '3';
  document.getElementById('qt-f-pagepat').value     = ctx.pagePattern || '';
  document.getElementById('qt-f-urlpat').value      = ctx.urlPattern || '';
  document.getElementById('qt-f-from').value        = ctx.dateRange?.[0] || '';
  document.getElementById('qt-f-to').value          = ctx.dateRange?.[1] || '';

  // Quellen-Autocomplete + Orts-Autocomplete einrichten
  _qtInitSourceAutocomplete();
  if (typeof initPlaceAutocomplete === 'function') initPlaceAutocomplete('qt-f-place', 'qt-f-place-dd');
  document.getElementById('qt-f-name').focus();
}

function _qtInitSourceAutocomplete() {
  if (typeof initAutocomplete !== 'function') return;
  initAutocomplete('qt-f-src', 'qt-f-src-dd', {
    showAllOnFocus: true, useFixed: true, limit: 30,
    getItems: q => Object.values(AppState.db.sources || {})
      .filter(s => !q || (s.abbr || s.title || '').toLowerCase().includes(q))
      .sort((a, b) => (a.abbr || a.title || '').localeCompare(b.abbr || b.title || '', 'de')),
    formatLabel: s => s.abbr || s.title || s.id,
    onSelect: (s, input) => {
      document.getElementById('qt-f-src-sid').value = s.id;
      input.value = s.abbr || s.title || s.id;
    },
  });
}

function qtSaveTemplate() {
  const name = document.getElementById('qt-f-name').value.trim();
  const sid  = document.getElementById('qt-f-src-sid').value.trim();
  if (!name)  { showToast('Name erforderlich', 'warn'); return; }
  if (!sid)   { showToast('Quelle wählen', 'warn'); return; }
  const from = parseInt(document.getElementById('qt-f-from').value) || null;
  const to   = parseInt(document.getElementById('qt-f-to').value) || null;
  const tpl = {
    id:   _qtEditId || ('qt-' + Date.now().toString(36)),
    name,
    base: document.getElementById('qt-f-base').value || 'marriage',
    context: {
      sid,
      quay:        document.getElementById('qt-f-quay').value || '',
      place:       document.getElementById('qt-f-place').value.trim(),
      pagePattern: document.getElementById('qt-f-pagepat').value.trim(),
      urlPattern:  document.getElementById('qt-f-urlpat').value.trim(),
      dateRange:   (from || to) ? [from, to] : null,
    },
  };
  const list = _qtList();
  const idx = list.findIndex(x => x.id === tpl.id);
  if (idx >= 0) list[idx] = tpl; else list.push(tpl);
  saveQuickTemplates();
  _qtShowList();
  showToast('Template gespeichert', 'success');
}

function qtDeleteTemplate(id) {
  const list = _qtList();
  const i = list.findIndex(x => x.id === id);
  if (i < 0) return;
  if (!confirm(`Template „${list[i].name}" löschen?`)) return;
  list.splice(i, 1);
  saveQuickTemplates();
  qtRenderManagerList();
}

function qtCancelEdit() { _qtShowList(); }

// ─────────────────────────────────────────────────────────────
//  Erfassungs-Engine (Phase A: marriage)
// ─────────────────────────────────────────────────────────────
let _qtActiveTpl = null;
let _qtSession   = [];   // erfasste IDs dieser Session
let _qtMatchSel  = {};   // role -> bestehende Person-ID (verknüpfen statt neu anlegen)

function qtStartEntry(tplId) {
  const tpl = _qtList().find(t => t.id === tplId);
  if (!tpl) return;
  if (!AppState.db?.sources?.[tpl.context?.sid]) { showToast('Quelle des Templates fehlt in dieser Datei', 'warn'); return; }
  _qtActiveTpl = tpl;
  _qtSession = [];
  _qtMatchSel = {};
  closeModal('modalQtManager');
  document.getElementById('lbl-modalQtEntry').textContent = tpl.name || 'Erfassung';
  _qtRenderEntryForm();
  document.getElementById('qt-entry-hint').hidden = true;
  openModal('modalQtEntry');
  document.querySelector('#qt-entry-body input')?.focus();
}

function _qtRenderEntryForm() {
  const tpl  = _qtActiveTpl;
  const base = QT_BASE_PATTERNS[tpl.base];
  const ctx  = tpl.context || {};
  const src  = AppState.db.sources?.[ctx.sid];
  const srcLabel  = src ? (src.abbr || src.title || ctx.sid) : ctx.sid;
  const quayLabel = { '0':'unbelegt', '1':'fragwürdig', '2':'plausibel', '3':'direkt' }[ctx.quay] || '';

  let html = `<div class="qt-ctx-head">
    <span class="qt-ctx-chip">📖 ${esc(srcLabel)}</span>
    ${ctx.place ? `<span class="qt-ctx-chip">📍 ${esc(ctx.place)}</span>` : ''}
    ${quayLabel ? `<span class="qt-ctx-chip">Q${esc(ctx.quay)} ${esc(quayLabel)}</span>` : ''}
    ${ctx.dateRange ? `<span class="qt-ctx-chip">${esc((ctx.dateRange[0]||'?')+'–'+(ctx.dateRange[1]||'?'))}</span>` : ''}
  </div>`;

  const persons = base.persons || [];
  const givenToRole = {}, keyToRole = {};
  persons.forEach(pr => { givenToRole[pr.givenKey] = pr.role; keyToRole[pr.surnKey] = pr.role; keyToRole[pr.givenKey] = pr.role; });

  html += base.fields.map(f => {
    const isName = f.type === 'surname' || f.type === 'given';
    const ph = f.type === 'date' ? 'TT.MM.JJJJ'
      : f.type === 'page' ? (ctx.pagePattern ? ctx.pagePattern.replace('{v}', '…') : 'Seite/Eintrag')
      : '';
    let fh = `<label class="form-label" style="position:relative">${esc(f.label)}
      <input class="form-input" id="qt-e-${f.key}" type="text" placeholder="${esc(ph)}" autocomplete="off">
      ${isName ? `<div class="place-dropdown" id="qt-e-${f.key}-dd" style="display:none;z-index:600"></div>` : ''}</label>`;
    // Personen-Matching: Treffer-Box direkt nach dem Vornamen der Person (Phase B)
    if (givenToRole[f.key]) fh += `<div class="qt-match" id="qt-match-${givenToRole[f.key]}" style="margin:-2px 0 8px"></div>`;
    return fh;
  }).join('');

  document.getElementById('qt-entry-body').innerHTML = html;

  for (const f of base.fields) {
    const role = keyToRole[f.key];
    if      (f.type === 'surname') _qtInitNameAC('qt-e-' + f.key, 'surname', role);
    else if (f.type === 'given')   _qtInitNameAC('qt-e-' + f.key, 'given', role);
  }
  // Live-Matching: bei Eingabe in Namensfeldern Treffer neu berechnen
  for (const pr of persons) {
    for (const k of [pr.surnKey, pr.givenKey]) {
      document.getElementById('qt-e-' + k)?.addEventListener('input', () => _qtUpdateMatches(pr.role));
    }
    _qtUpdateMatches(pr.role);
  }
}

function _qtInitNameAC(inputId, kind, role) {
  if (typeof initAutocomplete !== 'function') return;
  initAutocomplete(inputId, inputId + '-dd', {
    showAllOnFocus: false, useFixed: true, limit: 15,
    getItems: q => {
      if (!q) return [];
      const set = new Set();
      for (const p of Object.values(AppState.db.individuals || {})) {
        const v = kind === 'surname' ? p.surname : p.given;
        if (v && v.toLowerCase().includes(q)) set.add(v);
      }
      return [...set].sort((a, b) => a.localeCompare(b, 'de')).slice(0, 15);
    },
    formatLabel: s => s,
    // Programmatisches Setzen feuert kein 'input' → Matching hier anstoßen.
    onSelect: (s, input) => { input.value = s; if (role) _qtUpdateMatches(role); },
  });
}

// ── Personen-Matching (Phase B): Dedup-aware Verknüpfung statt Neuanlage ──────
function _qtBirthYear(p) {
  const d = (p.birth && p.birth.date) || (p.chr && p.chr.date) || '';
  const m = String(d).match(/\b(\d{4})\b/);
  return m ? +m[1] : null;
}

// Kandidaten-Suche: Nachname + Vorname (normalisiert), Geschlecht als schwacher Tiebreaker.
function _qtFindMatches(surname, given, sex) {
  const sn = (surname || '').trim().toLowerCase();
  const gn = (given   || '').trim().toLowerCase();
  if (!sn && !gn) return [];
  const gTok = gn.split(/\s+/).filter(Boolean);
  const res = [];
  for (const p of Object.values(AppState.db.individuals || {})) {
    const ps = (p.surname || '').toLowerCase();
    const pg = (p.given   || '').toLowerCase();
    if (!ps && !pg) continue;
    let snScore = 0, snOk = !sn;
    if (sn) {
      if (ps === sn) { snScore = 3; snOk = true; }
      else if (ps && (ps.includes(sn) || sn.includes(ps))) { snScore = 1.5; snOk = true; }
    }
    let gnScore = 0, gnOk = !gn;
    if (gn) {
      const pgTok = pg.split(/\s+/).filter(Boolean);
      if (pg === gn) { gnScore = 3; gnOk = true; }
      else if (gTok[0] && pgTok.includes(gTok[0])) { gnScore = 2; gnOk = true; }
      else if (gTok.some(t => pgTok.includes(t))) { gnScore = 1; gnOk = true; }
    }
    if (!snOk || !gnOk) continue;          // beide angegebenen Felder müssen passen
    if (!snScore && !gnScore) continue;    // mind. eine echte Übereinstimmung
    let score = snScore + gnScore;
    if (sex && p.sex && p.sex !== 'U' && p.sex !== sex) score -= 1;
    res.push({ id: p.id, p, score, by: _qtBirthYear(p) });
  }
  res.sort((a, b) => b.score - a.score || (a.p.name || '').localeCompare(b.p.name || '', 'de'));
  return res.slice(0, 6);
}

function _qtPersonLabel(p) {
  return p.name || [p.given, p.surname].filter(Boolean).join(' ') || p.id;
}

function _qtUpdateMatches(role) {
  const box = document.getElementById('qt-match-' + role);
  if (!box || !_qtActiveTpl) return;
  const base = QT_BASE_PATTERNS[_qtActiveTpl.base];
  const pr = (base.persons || []).find(x => x.role === role);
  if (!pr) return;

  // Bereits verknüpft → kompakte Anzeige, Suche pausiert bis „lösen".
  const selId = _qtMatchSel[role];
  if (selId) {
    const p = AppState.db.individuals[selId];
    if (p) {
      const by = _qtBirthYear(p);
      box.innerHTML = `<div class="qt-linked" style="display:flex;align-items:center;gap:8px;padding:4px 8px;border-radius:6px;background:var(--accent-soft,#e8f0ff);font-size:.85rem">
        <span>🔗 verknüpft: <strong>${esc(_qtPersonLabel(p))}</strong>${by ? ` (*${by})` : ''}</span>
        <button type="button" class="qt-unlink" style="margin-left:auto;cursor:pointer;background:none;border:none;color:inherit;font-size:.85rem">✕ lösen</button>
      </div>`;
      box.querySelector('.qt-unlink')?.addEventListener('click', () => { delete _qtMatchSel[role]; _qtUpdateMatches(role); });
      return;
    }
    delete _qtMatchSel[role];
  }

  const surn  = document.getElementById('qt-e-' + pr.surnKey)?.value || '';
  const given = document.getElementById('qt-e-' + pr.givenKey)?.value || '';
  const matches = _qtFindMatches(surn, given, pr.sex);
  if (!matches.length) { box.innerHTML = ''; return; }

  box.innerHTML = `<div class="qt-match-head" style="font-size:.78rem;color:var(--text-muted,#888);margin:2px 0 4px">
      ${matches.length} möglicher Treffer — verknüpfen statt neu anlegen?</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px">` +
    matches.map(m => `<button type="button" class="qt-match-cand" data-pid="${esc(m.id)}"
        style="cursor:pointer;border:1px solid var(--border,#ccd);border-radius:14px;padding:3px 10px;background:var(--bg-soft,#f4f6fa);color:inherit;font-size:.82rem">
        ${esc(_qtPersonLabel(m.p))}${m.by ? ` <span style="opacity:.6">*${m.by}</span>` : ''}</button>`).join('') +
    `</div>`;
  box.querySelectorAll('.qt-match-cand').forEach(btn => {
    btn.addEventListener('click', () => { _qtMatchSel[role] = btn.getAttribute('data-pid'); _qtUpdateMatches(role); });
  });
}

function _qtEv() {
  return { lati:null, long:null, citations:[], _extra:[], value:'', seen:false, note:'', noteRefs:[], date:'', place:'', placeId:null };
}

function _qtNewPerson(id, given, surname, sex) {
  return {
    id, given: given || '', surname: surname || '',
    name: [given, surname].filter(Boolean).join(' '),
    nameRaw:'', sex: sex || 'U', prefix:'', nick:'', _rufname:'', suffix:'', titl:'', resn:'', email:'', www:'',
    birth:_qtEv(), death:_qtEv(), chr:_qtEv(), buri:_qtEv(),
    events:[], noteTexts:[], noteRefs:[], noteText:'',
    famc:[], fams:[], media:[], extraNames:[],
    lastChanged: gedcomDate(new Date()), lastChangedTime: gedcomTime(new Date()),
    nameCitations:[], sourceRefs:new Set(),
  };
}

// ── Wiederverwendbare Erfassungs-Helfer (Phase C) ────────────────────────────
// Aus _qtSaveMarriage ausgelagert; nutzen baptism + burial direkt.
function _qtResolvePerson(role, given, surname, sex) {
  const mid = _qtMatchSel[role];
  if (mid && AppState.db.individuals[mid]) {
    return { id: mid, person: AppState.db.individuals[mid], isNew: false };
  }
  if (!given && !surname) return null;
  const id = nextId('I');
  return { id, person: _qtNewPerson(id, given, surname, sex), isNew: true };
}

function _qtAfterSave(tpl, hintText, focusKey) {
  for (const f of QT_BASE_PATTERNS[tpl.base].fields) {
    const el = document.getElementById('qt-e-' + f.key); if (el) el.value = '';
  }
  _qtMatchSel = {};
  for (const pr of (QT_BASE_PATTERNS[tpl.base].persons || [])) _qtUpdateMatches(pr.role);
  const h = document.getElementById('qt-entry-hint');
  h.textContent = `${hintText} (${_qtSession.length} in dieser Session)`;
  h.hidden = false;
  const pb = document.getElementById('qt-plausi-box');
  if (pb) { pb.innerHTML = ''; pb.hidden = true; }
  document.getElementById('qt-e-' + focusKey)?.focus();
}

// Zitat an Ereignis anhängen — Duplikat-Schutz via sid.
function _qtAddCitToEvent(ev, cit) {
  if (!Array.isArray(ev.citations)) ev.citations = [];
  if (!ev.citations.some(c => c.sid === cit.sid)) ev.citations.push(cit);
  ev.seen = true;
}

// ── Phase D: Inline-Plausi + „aus aktueller Quelle erstellen" ────────────────
// Validator-Ergebnisse für die gerade gespeicherten Entitäten anzeigen (max 5).
function _qtShowInlinePlausi(personIds, familyIds) {
  const box = document.getElementById('qt-plausi-box');
  if (!box) return;
  if (typeof runValidation !== 'function') { box.hidden = true; return; }
  const all = runValidation(AppState.db);
  const pSet = new Set(personIds || []), fSet = new Set(familyIds || []);
  const issues = all.filter(r =>
    (r.personId && pSet.has(r.personId)) || (r.familyId && fSet.has(r.familyId))
  ).slice(0, 5);
  if (!issues.length) { box.hidden = true; return; }
  const ic  = { error: '⚠', warn: '⚡', info: 'ℹ' };
  const col = { error: 'var(--val-error,#c0392b)', warn: 'var(--val-warn,#e67e22)', info: 'var(--text-muted,#888)' };
  box.innerHTML = '<div style="font-size:.78rem;color:var(--text-muted,#888);margin-bottom:3px">Hinweise:</div>' +
    issues.map(r => {
      const sev = r.severity || 'warn';
      return `<div style="font-size:.8rem;color:${col[sev]||col.warn};padding:1px 0">${ic[sev]||'⚡'} ${esc(r.text)}</div>`;
    }).join('');
  box.hidden = false;
}

// Aus Quellen-Detail heraus ein neues Template anlegen (Quelle vorbelegt).
function qtNewTemplateFromSource(sid) {
  _qtShowList();
  openModal('modalQtManager');
  _qtEditTemplate(null);
  const src = AppState.db.sources?.[sid];
  if (!src) return;
  document.getElementById('qt-f-src-sid').value = sid;
  document.getElementById('qt-f-src').value = src.abbr || src.title || sid;
  document.getElementById('qt-f-name').value = src.abbr || src.title || '';
  document.getElementById('qt-f-name').focus();
}

function qtSaveEntry() {
  const tpl = _qtActiveTpl;
  if (!tpl) return;
  const base = QT_BASE_PATTERNS[tpl.base];
  const v = {};
  for (const f of base.fields) v[f.key] = (document.getElementById('qt-e-' + f.key)?.value || '').trim();
  if      (tpl.base === 'marriage') _qtSaveMarriage(tpl, v);
  else if (tpl.base === 'baptism')  _qtSaveBaptism(tpl, v);
  else if (tpl.base === 'burial')   _qtSaveBurial(tpl, v);
}

function _qtSaveMarriage(tpl, v) {
  const ctx = tpl.context || {};
  const H = _qtResolvePerson('h', v.hGiven, v.hSurn, 'M');
  const W = _qtResolvePerson('w', v.wGiven, v.wSurn, 'F');
  if (!H && !W) { showToast('Mindestens eine Person (Name oder Treffer) erforderlich', 'warn'); return; }
  const involvedPersonIds = [H?.id, W?.id].filter(Boolean);

  const pageStr = (ctx.pagePattern && v.page) ? ctx.pagePattern.replace('{v}', v.page) : v.page;
  const url     = (ctx.urlPattern && v.page)  ? ctx.urlPattern.replace('{v}', v.page)  : '';
  const mkCit = () => citationObj(ctx.sid, pageStr, ctx.quay || '', null, [],
    url ? [{ file: url, titl: '', _extra: [] }] : []);
  const mdate = (typeof _normQuickDate === 'function') ? _normQuickDate(v.mdate) : v.mdate;

  const fId = nextId('F');
  const fam = {
    id: fId, husb: H ? H.id : '', wife: W ? W.id : '', children: [],
    marr: { date: mdate, place: ctx.place || '', placeId: null, lati:null, long:null,
      citations: [mkCit()], _extra: [], value: '', seen: true, note: '', noteRefs: [], media: [] },
    engag: {}, div: {}, divf: {}, noteTexts: [], noteText: '', media: [], sourceRefs: new Set(),
    lastChanged: gedcomDate(new Date()), lastChangedTime: gedcomTime(new Date()),
  };
  pushUndo('Heirat erfasst (Template)', { familyIds: [fId], personIds: involvedPersonIds });

  for (const P of [H, W]) {
    if (!P) continue;
    if (P.isNew) AppState.db.individuals[P.id] = P.person;
    if (!Array.isArray(P.person.fams)) P.person.fams = [];
    if (!P.person.fams.includes(fId)) P.person.fams.push(fId);
  }
  AppState.db.families[fId] = fam;
  if (H) _rebuildPersonSourceRefs(H.person);
  if (W) _rebuildPersonSourceRefs(W.person);
  _rebuildFamilySourceRefs(fam);
  _qtSession.push(fId);
  markChanged();
  renderTab();

  const lblH = H ? (H.isNew ? ([v.hGiven, v.hSurn].filter(Boolean).join(' ') || '?') : _qtPersonLabel(H.person) + ' 🔗') : '—';
  const lblW = W ? (W.isNew ? ([v.wGiven, v.wSurn].filter(Boolean).join(' ') || '?') : _qtPersonLabel(W.person) + ' 🔗') : '—';
  _qtAfterSave(tpl, `✓ ${lblH} ⚭ ${lblW}`, 'mdate');
  _qtShowInlinePlausi(involvedPersonIds, [fId]);
}

function _qtSaveBaptism(tpl, v) {
  const ctx = tpl.context || {};
  const P = _qtResolvePerson('p', v.given, v.surn, 'U');
  if (!P) { showToast('Name oder Treffer erforderlich', 'warn'); return; }

  const pageStr = (ctx.pagePattern && v.page) ? ctx.pagePattern.replace('{v}', v.page) : v.page;
  const url     = (ctx.urlPattern && v.page)  ? ctx.urlPattern.replace('{v}', v.page)  : '';
  const cit     = citationObj(ctx.sid, pageStr, ctx.quay || '', null, [],
    url ? [{ file: url, titl: '', _extra: [] }] : []);
  const bdate   = (typeof _normQuickDate === 'function') ? _normQuickDate(v.bdate) : v.bdate;

  pushUndo('Taufe erfasst (Template)', { personIds: [P.id] });

  const p = P.person;
  if (P.isNew) AppState.db.individuals[P.id] = p;
  if (!p.chr || typeof p.chr !== 'object') p.chr = _qtEv();
  if (!p.chr.date  && bdate)     p.chr.date  = bdate;
  if (!p.chr.place && ctx.place) p.chr.place = ctx.place;
  _qtAddCitToEvent(p.chr, cit);
  _rebuildPersonSourceRefs(p);
  _qtSession.push(P.id);
  markChanged();
  renderTab();

  const lbl = P.isNew ? ([v.given, v.surn].filter(Boolean).join(' ') || '?')
                      : _qtPersonLabel(p) + ' 🔗';
  _qtAfterSave(tpl, `✓ ✝ ${lbl}`, 'bdate');
  _qtShowInlinePlausi([P.id], []);
}

function _qtSaveBurial(tpl, v) {
  const ctx = tpl.context || {};
  const P = _qtResolvePerson('p', v.given, v.surn, 'U');
  if (!P) { showToast('Name oder Treffer erforderlich', 'warn'); return; }

  const pageStr = (ctx.pagePattern && v.page) ? ctx.pagePattern.replace('{v}', v.page) : v.page;
  const url     = (ctx.urlPattern && v.page)  ? ctx.urlPattern.replace('{v}', v.page)  : '';
  const cit     = citationObj(ctx.sid, pageStr, ctx.quay || '', null, [],
    url ? [{ file: url, titl: '', _extra: [] }] : []);
  const ddate   = (typeof _normQuickDate === 'function') ? _normQuickDate(v.ddate) : v.ddate;
  const bdate   = (typeof _normQuickDate === 'function') ? _normQuickDate(v.bdate) : v.bdate;

  pushUndo('Sterbefall erfasst (Template)', { personIds: [P.id] });

  const p = P.person;
  if (P.isNew) AppState.db.individuals[P.id] = p;
  if (!p.death || typeof p.death !== 'object') p.death = _qtEv();
  if (!p.buri  || typeof p.buri  !== 'object') p.buri  = _qtEv();
  if (!p.death.date  && ddate)     p.death.date  = ddate;
  if (!p.death.place && ctx.place) p.death.place = ctx.place;
  _qtAddCitToEvent(p.death, cit);
  if (bdate) {
    if (!p.buri.date)  p.buri.date  = bdate;
    if (!p.buri.place && ctx.place) p.buri.place = ctx.place;
    _qtAddCitToEvent(p.buri, cit);
  }
  _rebuildPersonSourceRefs(p);
  _qtSession.push(P.id);
  markChanged();
  renderTab();

  const lbl = P.isNew ? ([v.given, v.surn].filter(Boolean).join(' ') || '?')
                      : _qtPersonLabel(p) + ' 🔗';
  _qtAfterSave(tpl, `✓ ✞ ${lbl}`, 'ddate');
  _qtShowInlinePlausi([P.id], []);
}

function qtEntryDone() {
  closeModal('modalQtEntry');
  const n = _qtSession.length;
  _qtSession = [];
  if (n) showToast(`${n} Eintrag${n !== 1 ? 'e' : ''} erfasst`, 'success');
}

// ── Self-Init: Templates aus IDB-Cache laden (gerätelokal, dateiunabhängig) ──
if (typeof idbGet === 'function') loadQuickTemplates();
