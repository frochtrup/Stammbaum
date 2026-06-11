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

// ── Phase E: Frei konfigurierbare Templates (base === 'custom') ───────────────
// Rollen-Katalog mit eingebauter Beziehungssemantik (Nutzer definiert keine
// Relationen — main/Vater/Mutter/Ehepartner haben feste FAMC/FAMS-Bedeutung).
const QT_ROLE_CATALOG = {
  main:   { sex: 'U', label: 'Person',     icon: '👤' },
  father: { sex: 'M', label: 'Vater',      icon: '👨' },
  mother: { sex: 'F', label: 'Mutter',     icon: '👩' },
  spouse: { sex: 'U', label: 'Ehepartner', icon: '💑' },
};
const QT_FIELD_TYPES = [
  ['surname', 'Nachname'], ['given', 'Vorname'], ['sex', 'Geschlecht'],
  ['date', 'Datum'], ['place', 'Ort'], ['occu', 'Beruf'], ['resi', 'Wohnort'],
  ['age', 'Alter (J/M/T)'], ['page', 'Seite/Eintrag'],
];
const QT_TARGETS = [
  ['birth', 'Geburt'], ['chr', 'Taufe'], ['death', 'Tod'], ['buri', 'Beerdigung'],
  ['marr', 'Heirat'],
];
const _QT_TYPE_LBL = Object.fromEntries(QT_FIELD_TYPES);
const _QT_TGT_LBL  = Object.fromEntries(QT_TARGETS);

// Liefert ein normalisiertes Schema {fields:[{key,type,label,role,target}], persons:[…]}
// — für Code-Muster direkt, für custom aus tpl.schema.fields aufgebaut.
function _qtSchema(tpl) {
  if (tpl.base === 'custom') return _qtBuildCustomSchema(tpl.schema || { fields: [] });
  return QT_BASE_PATTERNS[tpl.base];
}

function _qtDefaultLabel(f) {
  if (f.type === 'age') {
    const evLbl = f.target ? (_QT_TGT_LBL[f.target] || f.target) : 'Tod';
    const base = `Alter beim ${evLbl}`;
    return f.role === 'main' ? base : `${base} (${QT_ROLE_CATALOG[f.role]?.label || f.role})`;
  }
  const t = _QT_TYPE_LBL[f.type] || f.type;
  const g = f.target ? (_QT_TGT_LBL[f.target] || '') : '';
  const base = t + (g ? ' ' + g : '');
  return f.role === 'main' ? base : base + ' ' + (QT_ROLE_CATALOG[f.role]?.label || f.role);
}

function _qtBuildCustomSchema(schema) {
  const fields = (schema.fields || []).map((f, i) => ({
    key: 'c' + i, type: f.type, role: f.role || 'main',
    target: (f.type === 'date' || f.type === 'place') ? (f.target || 'birth')
           : f.type === 'age' ? (f.target || 'death')
           : null,
    label: f.label || _qtDefaultLabel(f),
    value: f.value || '',
    placeId: f.placeId || '',
  }));
  const persons = [];
  for (const role of Object.keys(QT_ROLE_CATALOG)) {
    const rf = fields.filter(f => f.role === role);
    const surnF = rf.find(f => f.type === 'surname');
    const givenF = rf.find(f => f.type === 'given');
    if (!surnF && !givenF) continue;   // ohne Namensfeld kein Personen-Slot/Matching
    persons.push({
      role, sex: QT_ROLE_CATALOG[role].sex, label: QT_ROLE_CATALOG[role].label,
      surnKey: surnF ? surnF.key : null, givenKey: givenF ? givenF.key : null,
    });
  }
  return { fields, persons, custom: true };
}

function _qtPatternMeta(base) {
  if (base === 'custom') return { icon: '🛠', label: 'Frei konfigurierbar' };
  const p = QT_BASE_PATTERNS[base];
  return { icon: p?.icon || '⚡', label: p?.label || base };
}

function _qtNormDate(s) {
  return (typeof _normQuickDate === 'function') ? _normQuickDate(s) : s;
}

// Geburtsdatum aus Sterbedatum + Alter berechnen → GEDCOM ABT-Datum.
// deathDateGed: GEDCOM-Datumsstring (auch nach _qtNormDate), ageY/M/D: Zahlen (0 erlaubt).
function _qtCalcBirthFromAge(deathDateGed, ageY, ageM, ageD) {
  if (!deathDateGed) return null;
  const MON_IDX = { JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11 };
  const MON_OUT = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  // GEDCOM-Qualifier (ABT/BEF/AFT/CAL/EST/INT/FROM/TO/BET + Leerzeichen) entfernen.
  // WICHTIG: Monats-Kürzel (JAN/FEB/…) NICHT entfernen → explizite Whitelist.
  const s = String(deathDateGed).trim().replace(/^(?:ABT|CAL|EST|BEF|AFT|INT|FROM|TO|BET|AND)\s+/i, '');
  let dDay = null, dMon = null, dYear = null;
  for (const part of s.split(/\s+/)) {
    const n = parseInt(part, 10);
    if (!isNaN(n) && String(n) === part) { if (n > 31) dYear = n; else dDay = n; }
    else if (MON_IDX[part.toUpperCase()] !== undefined) dMon = MON_IDX[part.toUpperCase()];
  }
  if (!dYear) return null;
  const y = +ageY || 0, m = +ageM || 0, d = +ageD || 0;
  if (dDay !== null && dMon !== null) {
    const dt = new Date(dYear, dMon, dDay);
    dt.setFullYear(dt.getFullYear() - y);
    dt.setMonth(dt.getMonth() - m);
    dt.setDate(dt.getDate() - d);
    return `CAL ${dt.getDate()} ${MON_OUT[dt.getMonth()]} ${dt.getFullYear()}`;
  } else if (dMon !== null) {
    let bM = dMon - m, bY = dYear - y;
    while (bM < 0) { bM += 12; bY--; }
    return `CAL ${MON_OUT[bM]} ${bY}`;
  } else {
    return `CAL ${dYear - y}`;
  }
}

// Vollständiges PersonEvent-Init (spiegelt gedcom-parser.js:46) — für OCCU/RESI.
function _qtGenEvent(type, over) {
  return Object.assign({
    type, value: '', date: '', place: '', lati: null, long: null, eventType: '',
    note: '', noteRefs: [], addr: '', phon: [], email: [], citations: [], media: [],
    _extra: [], datePhrase: '',
  }, over || {});
}

// Leeres Familien-Ereignis (spiegelt gedcom-parser.js:857 _famEv) — für Eltern-FAMC ohne MARR.
function _qtFamEv() {
  return { date: null, place: null, lati: null, long: null, citations: [], value: '',
    seen: false, note: '', noteRefs: [], _extra: [], media: [] };
}

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
    const idbData = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];
    // OneDrive Konfig-Ordner hat Vorrang (aktuellste Version über Geräte)
    let odData = null;
    if (typeof _odReadAppData === 'function') {
      odData = await _odReadAppData('stammbaum-templates.json').catch(() => null);
    }
    const data = Array.isArray(odData) ? odData : idbData;
    AppState.quickTemplates = Array.isArray(data) ? data : [];
    if (odData) idbPut('quick_templates', JSON.stringify(AppState.quickTemplates)).catch(() => {});
  } catch (e) { AppState.quickTemplates = []; }
  return _qtList();
}

function saveQuickTemplates() {
  const data = _qtList();
  idbPut('quick_templates', JSON.stringify(data)).catch(() => {});
  if (typeof _odWriteAppData === 'function') _odWriteAppData('stammbaum-templates.json', data).catch(() => {});
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
    list.innerHTML = '<p class="form-hint form-hint--pt">Noch keine Templates. „+ Neues Template" anlegen.</p>';
    return;
  }
  list.innerHTML = tpls.map(t => {
    const meta = _qtPatternMeta(t.base);
    const src = AppState.db.sources?.[t.context?.sid];
    const srcLabel = src ? (src.abbr || src.title || t.context.sid) : (t.context?.sid || '—');
    return `<div class="qt-item">
      <button type="button" class="qt-item-run" data-action="qtStartEntry" data-tid="${esc(t.id)}" title="Erfassung starten">
        <span class="qt-item-icon">${esc(meta.icon)}</span>
        <span class="qt-item-text">
          <span class="qt-item-name">${esc(t.name || '(ohne Name)')}</span>
          <span class="qt-item-sub">${esc(meta.label + ' · ' + srcLabel)}</span>
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
  const fpid = document.getElementById('qt-f-place-id'); if (fpid) fpid.value = ctx.placeId || '';
  document.getElementById('qt-f-quay').value        = ctx.quay != null ? String(ctx.quay) : '3';
  document.getElementById('qt-f-pagepat').value     = ctx.pagePattern || '';
  document.getElementById('qt-f-urlpat').value      = ctx.urlPattern || '';
  document.getElementById('qt-f-from').value        = ctx.dateRange?.[0] || '';
  document.getElementById('qt-f-to').value          = ctx.dateRange?.[1] || '';
  const imSel = document.getElementById('qt-f-implicit-mode');
  if (imSel) imSel.value = (ctx.implicitMode === 'prefill') ? 'prefill' : 'hidden';

  // Custom-Builder: Felder-Entwurf laden (Klon) bzw. sinnvolle Default-Liste
  if (t?.base === 'custom' && Array.isArray(t.schema?.fields)) {
    _qtDraftFields = t.schema.fields.map(f => ({ ...f }));
  } else {
    _qtDraftFields = _qtDefaultDraftFields();
  }
  _qtSyncBaseUI();

  // Quellen-Autocomplete + Orts-Autocomplete einrichten
  _qtInitSourceAutocomplete();
  if (typeof initPlaceAutocomplete === 'function') initPlaceAutocomplete('qt-f-place', 'qt-f-place-dd');
  document.getElementById('qt-f-name').focus();
}

// ── Phase E: Builder-UI für custom-Templates ─────────────────────────────────
let _qtDraftFields = [];   // Arbeits-Array beim Bearbeiten eines custom-Templates

function _qtDefaultDraftFields() {
  return [
    { role: 'main', type: 'surname', label: '' },
    { role: 'main', type: 'given',   label: '' },
    { role: 'main', type: 'sex',     label: '' },
    { role: 'main', type: 'date',  target: 'birth', label: '' },
    { role: 'main', type: 'place', target: 'birth', label: '' },
    { role: 'main', type: 'page',    label: '' },
  ];
}

// Felder-Sektion nur bei base==='custom' zeigen + Builder rendern.
function _qtSyncBaseUI() {
  const isCustom = document.getElementById('qt-f-base')?.value === 'custom';
  const sec = document.getElementById('qt-fields-section');
  if (sec) sec.hidden = !isCustom;
  if (isCustom) _qtRenderFieldBuilder();
}

function _qtRoleOptions(sel) {
  return Object.entries(QT_ROLE_CATALOG)
    .map(([k, r]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${esc(r.label)}</option>`).join('');
}
function _qtTypeOptions(sel) {
  return QT_FIELD_TYPES
    .map(([k, l]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${esc(l)}</option>`).join('');
}
function _qtTargetOptions(sel) {
  return QT_TARGETS
    .map(([k, l]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${esc(l)}</option>`).join('');
}

function _qtTargetOptionsFor(type, sel) {
  const opts = type === 'age'
    ? [['death', 'Tod'], ['buri', 'Beerdigung']]
    : QT_TARGETS;
  return opts.map(([k, l]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${esc(l)}</option>`).join('');
}

function _qtRenderFieldBuilder() {
  const list = document.getElementById('qt-fields-list');
  if (!list) return;
  list.innerHTML = _qtDraftFields.map((f, i) => {
    const needsTarget = (f.type === 'date' || f.type === 'place' || f.type === 'age');
    const tgtDef = f.type === 'age' ? 'death' : 'birth';
    const isPlace = (f.type === 'place');                  // echtes Ortsfeld → Picker
    const isAddr  = (f.type === 'resi');                   // Wohnort = Adresse; Ort kommt aus ctx
    const isSex   = (f.type === 'sex');
    const valPh = isAddr ? 'Adresse (leer = abfragen)' : 'Wert (leer = abfragen)';
    const valInput = isSex
      ? `<select class="form-input qt-fb-val-inp" data-change="qtFieldEdit" data-idx="${i}" data-prop="value">
           <option value=""${!f.value ? ' selected' : ''}>(abfragen)</option>
           <option value="U"${f.value==='U'?' selected':''}>unbekannt</option>
           <option value="M"${f.value==='M'?' selected':''}>männlich</option>
           <option value="F"${f.value==='F'?' selected':''}>weiblich</option>
         </select>`
      : `<input class="form-input qt-fb-val-inp" id="qt-fb-val-${i}" data-input="qtFieldEdit" data-idx="${i}" data-prop="value" value="${esc(f.value || '')}" placeholder="${esc(valPh)}" autocomplete="off">
         ${isPlace ? `<input type="hidden" id="qt-fb-val-${i}-id" value="${esc(f.placeId || '')}">` : ''}`;
    const placeBtn = isPlace
      ? `<button type="button" class="qt-fb-btn" data-action="openPlacePicker" data-target="qt-fb-val-${i}" title="Ort wählen">📍</button>`
      : '';
    return `<div class="qt-fb-row">
      <select class="form-input qt-fb-sel-role" data-change="qtFieldEdit" data-idx="${i}" data-prop="role">${_qtRoleOptions(f.role || 'main')}</select>
      <select class="form-input qt-fb-sel-type" data-change="qtFieldEdit" data-idx="${i}" data-prop="type">${_qtTypeOptions(f.type || 'given')}</select>
      ${needsTarget ? `<select class="form-input qt-fb-sel-tgt" data-change="qtFieldEdit" data-idx="${i}" data-prop="target">${_qtTargetOptionsFor(f.type, f.target || tgtDef)}</select>` : ''}
      <input class="form-input qt-fb-lbl-inp" data-input="qtFieldEdit" data-idx="${i}" data-prop="label" value="${esc(f.label || '')}" placeholder="${esc(_qtDefaultLabel(f))}" autocomplete="off">
      ${valInput}
      ${placeBtn}
      <button type="button" class="qt-fb-btn" data-action="qtFieldUp"   data-idx="${i}" title="Hoch">↑</button>
      <button type="button" class="qt-fb-btn" data-action="qtFieldDown" data-idx="${i}" title="Runter">↓</button>
      <button type="button" class="qt-fb-btn" data-action="qtFieldDel"  data-idx="${i}" title="Löschen">✕</button>
    </div>`;
  }).join('') || '<p class="form-hint">Noch keine Felder. „＋ Feld" hinzufügen.</p>';
}

function _qtFieldEdit(el) {
  const i = +el.dataset.idx, prop = el.dataset.prop;
  const f = _qtDraftFields[i];
  if (!f) return;
  f[prop] = el.value;
  if (prop === 'type') {
    if (f.type === 'date' || f.type === 'place') { if (!f.target) f.target = 'birth'; }
    else if (f.type === 'age') { if (!f.target || !['death','buri'].includes(f.target)) f.target = 'death'; }
    else delete f.target;
    // Typ-Wechsel → Picker-Bezug (placeId) verfällt, sex-Wert (M/F/U) passt ggf. nicht mehr zu Text.
    delete f.placeId;
    if (f.type === 'sex' && !['', 'U', 'M', 'F'].includes(f.value || '')) f.value = '';
  }
  // value-Eingabe bei place: picker-getragenen placeId mit übernehmen
  // (resi = Adresse, ohne Picker — der Ort kommt implizit aus ctx.place)
  if (prop === 'value' && f.type === 'place') {
    const idEl = document.getElementById('qt-fb-val-' + i + '-id');
    if (idEl) f.placeId = idEl.value || '';
  }
  // Strukturänderung (Rolle/Typ) → neu rendern (Ziel-Select ein/aus); Label nicht (Fokus halten).
  if (prop === 'role' || prop === 'type') _qtRenderFieldBuilder();
}

function qtFieldAdd()      { _qtDraftFields.push({ role: 'main', type: 'given', label: '' }); _qtRenderFieldBuilder(); }
function qtFieldDel(idx)   { _qtDraftFields.splice(+idx, 1); _qtRenderFieldBuilder(); }
function qtFieldUp(idx)    { idx = +idx; if (idx > 0) { [_qtDraftFields[idx-1], _qtDraftFields[idx]] = [_qtDraftFields[idx], _qtDraftFields[idx-1]]; _qtRenderFieldBuilder(); } }
function qtFieldDown(idx)  { idx = +idx; if (idx < _qtDraftFields.length - 1) { [_qtDraftFields[idx+1], _qtDraftFields[idx]] = [_qtDraftFields[idx], _qtDraftFields[idx+1]]; _qtRenderFieldBuilder(); } }

function _qtInitSourceAutocomplete() {
  if (typeof initAutocomplete !== 'function') return;
  // Init-Guard: verhindert mehrfache Event-Listener bei wiederholtem _qtEditTemplate.
  const el = document.getElementById('qt-f-src');
  if (!el || el.dataset.qtAcInit) return;
  el.dataset.qtAcInit = '1';
  initAutocomplete('qt-f-src', 'qt-f-src-dd', {
    showAllOnFocus: true, useFixed: true, limit: 50,
    // Suche in BEIDEN Feldern (abbr UND title), nicht nur im ersten vorhandenen.
    getItems: q => Object.values(AppState.db.sources || {})
      .filter(s => !q ||
        (s.abbr  || '').toLowerCase().includes(q) ||
        (s.title || '').toLowerCase().includes(q))
      .sort((a, b) => (a.abbr || a.title || '').localeCompare(b.abbr || b.title || '', 'de')),
    // Zeige Kürzel + vollständigen Titel für sichere Identifikation.
    formatLabel: s => (s.abbr && s.title && s.abbr !== s.title)
      ? `${s.abbr} — ${s.title}`
      : (s.abbr || s.title || s.id),
    onSelect: (s, input) => {
      document.getElementById('qt-f-src-sid').value = s.id;
      input.value = s.abbr || s.title || s.id;
    },
    // SID löschen wenn Textfeld manuell geleert wird (SID/Text bleibt sonst asynchron).
    onInput: inp => {
      if (!inp.value.trim()) document.getElementById('qt-f-src-sid').value = '';
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
  const base = document.getElementById('qt-f-base').value || 'marriage';
  const tpl = {
    id:   _qtEditId || ('qt-' + Date.now().toString(36)),
    name,
    base,
    context: {
      sid,
      quay:        document.getElementById('qt-f-quay').value || '',
      place:       document.getElementById('qt-f-place').value.trim(),
      placeId:     document.getElementById('qt-f-place-id')?.value || '',
      pagePattern: document.getElementById('qt-f-pagepat').value.trim(),
      urlPattern:  document.getElementById('qt-f-urlpat').value.trim(),
      dateRange:   (from || to) ? [from, to] : null,
      implicitMode: document.getElementById('qt-f-implicit-mode')?.value || 'hidden',
    },
  };
  if (base === 'custom') {
    const fields = _qtDraftFields
      .filter(f => f.type)
      .map(f => {
        const o = { role: f.role || 'main', type: f.type };
        if (f.type === 'date' || f.type === 'place') o.target = f.target || 'birth';
        if (f.type === 'age') o.target = f.target || 'death';
        if ((f.label || '').trim()) o.label = f.label.trim();
        const val = (f.value || '').trim();
        if (val) o.value = val;
        if (f.type === 'place' && f.placeId) o.placeId = f.placeId;
        return o;
      });
    const hasMainName = fields.some(f => f.role === 'main' && (f.type === 'surname' || f.type === 'given'));
    if (!hasMainName) { showToast('Mind. ein Namensfeld (Vor- oder Nachname) für „Person" nötig', 'warn'); return; }
    tpl.schema = { fields };
  }
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
  const schema = _qtSchema(tpl);
  const ctx  = tpl.context || {};
  const src  = AppState.db.sources?.[ctx.sid];
  const srcLabel  = src ? (src.abbr || src.title || ctx.sid) : ctx.sid;
  const quayLabel = { '0':'unbelegt', '1':'fragwürdig', '2':'plausibel', '3':'direkt' }[ctx.quay] || '';
  const implicitHidden = (ctx.implicitMode !== 'prefill');   // Default: versteckt

  // Implizit-Chips (versteckte Werte) im Kontext-Kopf zeigen, damit klar ist, was implizit gesetzt wird.
  const implicitChips = (schema.custom && implicitHidden)
    ? schema.fields.filter(f => f.value).map(f => `<span class="qt-ctx-chip qt-ctx-chip--implicit" title="implizit gesetzt">🪪 ${esc(f.label)}: ${esc(f.value)}</span>`).join('')
    : '';

  let html = `<div class="qt-ctx-head">
    <span class="qt-ctx-chip">📖 ${esc(srcLabel)}</span>
    ${ctx.place ? `<span class="qt-ctx-chip">📍 ${esc(ctx.place)}</span>` : ''}
    ${quayLabel ? `<span class="qt-ctx-chip">Q${esc(ctx.quay)} ${esc(quayLabel)}</span>` : ''}
    ${ctx.dateRange ? `<span class="qt-ctx-chip">${esc((ctx.dateRange[0]||'?')+'–'+(ctx.dateRange[1]||'?'))}</span>` : ''}
    ${implicitChips}
  </div>`;

  const persons = schema.persons || [];
  const keyToRole = {};        // Namensfeld-key → role (für AC + Matching)
  persons.forEach(pr => { if (pr.surnKey) keyToRole[pr.surnKey] = pr.role; if (pr.givenKey) keyToRole[pr.givenKey] = pr.role; });
  // Treffer-Box nach dem LETZTEN Namensfeld der jeweiligen Rolle platzieren.
  const boxAfterKey = {};
  schema.fields.forEach(f => { if (keyToRole[f.key]) boxAfterKey[keyToRole[f.key]] = f.key; });
  const roleByBoxKey = {};
  Object.entries(boxAfterKey).forEach(([role, key]) => { roleByBoxKey[key] = role; });

  html += schema.fields.map(f => {
    // Implizit gesetzte Felder ggf. ausblenden — bei Modus „hidden" trotzdem Treffer-Box-Anker behalten.
    const isImplicit = !!f.value;
    if (isImplicit && implicitHidden) {
      return roleByBoxKey[f.key] ? `<div class="qt-match qt-match-box" id="qt-match-${roleByBoxKey[f.key]}"></div>` : '';
    }
    const id = 'qt-e-' + f.key;
    const lockMark = isImplicit ? ' <span class="qt-prefill-lock" title="vorbelegter Wert">🔒</span>' : '';
    let fh;
    if (f.type === 'sex') {
      fh = `<label class="form-label">${esc(f.label)}${lockMark}
        <select class="form-input" id="${id}">
          <option value="U">unbekannt</option>
          <option value="M">männlich</option>
          <option value="F">weiblich</option>
        </select></label>`;
    } else if (f.type === 'age') {
      fh = `<div class="qt-age-block"><div class="form-label qt-age-lbl">${esc(f.label)}${lockMark}</div>
        <div class="qt-age-row">
          <input class="form-input qt-age-inp-y" id="${id}-y" type="number" min="0" max="130" placeholder="Jahre" autocomplete="off">
          <span class="qt-age-unit">J.</span>
          <input class="form-input qt-age-inp-sm" id="${id}-m" type="number" min="0" max="11" placeholder="Mon." autocomplete="off">
          <span class="qt-age-unit">M.</span>
          <input class="form-input qt-age-inp-sm" id="${id}-d" type="number" min="0" max="31" placeholder="Tage" autocomplete="off">
          <span class="qt-age-unit">T.</span>
        </div></div>`;
    } else {
      const isName  = f.type === 'surname' || f.type === 'given';
      const isPlace = f.type === 'place';
      const isAddr  = f.type === 'resi';
      const ph = f.type === 'date' ? 'TT.MM.JJJJ'
        : f.type === 'page' ? (ctx.pagePattern ? ctx.pagePattern.replace('{v}', '…') : 'Seite/Eintrag')
        : isAddr ? 'Adresse'
        : '';
      const placeBtn = isPlace
        ? ` <button type="button" class="place-toggle-btn" data-action="openPlacePicker" data-target="${id}" title="Ort wählen">📍</button>`
        : '';
      fh = `<label class="form-label qt-label-rel">${esc(f.label)}${lockMark}${placeBtn}
        <input class="form-input" id="${id}" type="text" placeholder="${esc(ph)}" autocomplete="off">
        ${isPlace ? `<input type="hidden" id="${id}-id">` : ''}
        ${(isName || isPlace || isAddr) ? `<div class="place-dropdown" id="${id}-dd"></div>` : ''}</label>`;
    }
    // Personen-Matching: Treffer-Box nach dem letzten Namensfeld der Rolle (Phase B)
    if (roleByBoxKey[f.key]) fh += `<div class="qt-match qt-match-box" id="qt-match-${roleByBoxKey[f.key]}"></div>`;
    return fh;
  }).join('');

  document.getElementById('qt-entry-body').innerHTML = html;

  // Geschlecht-Default je Rolle setzen (impliziter Wert hat Vorrang vor Rollen-Default)
  for (const f of schema.fields) {
    if (f.type !== 'sex') continue;
    const sel = document.getElementById('qt-e-' + f.key);
    if (!sel) continue;
    if (f.value) { sel.value = f.value; continue; }
    const pr = persons.find(p => p.role === f.role);
    if (pr) sel.value = pr.sex || 'U';
  }
  // Implizite Werte (prefill-Modus) in Inputs setzen
  for (const f of schema.fields) {
    if (!f.value) continue;
    if (f.type === 'sex' || f.type === 'age') continue;     // sex bereits oben, age hat keinen Default
    const el = document.getElementById('qt-e-' + f.key);
    if (el) el.value = f.value;
    if ((f.type === 'place' || f.type === 'resi') && f.placeId) {
      const idEl = document.getElementById('qt-e-' + f.key + '-id');
      if (idEl) idEl.value = f.placeId;
    }
  }
  // Autocompletes verdrahten
  for (const f of schema.fields) {
    const id = 'qt-e-' + f.key;
    if (!document.getElementById(id)) continue;             // versteckte Felder überspringen
    if      (f.type === 'surname') _qtInitNameAC(id, 'surname', keyToRole[f.key]);
    else if (f.type === 'given')   _qtInitNameAC(id, 'given',   keyToRole[f.key]);
    else if (f.type === 'place' && typeof initPlaceAutocomplete === 'function')
      initPlaceAutocomplete(id, id + '-dd', id + '-id');
    else if (f.type === 'resi'  && typeof _initAddrAutocompleteFor === 'function')
      _initAddrAutocompleteFor(id, id + '-dd', null);       // Ort kommt implizit aus ctx
  }
  // Live-Matching: bei Eingabe in Namensfeldern Treffer neu berechnen
  for (const pr of persons) {
    for (const k of [pr.surnKey, pr.givenKey]) {
      if (k) document.getElementById('qt-e-' + k)?.addEventListener('input', () => _qtUpdateMatches(pr.role));
    }
    _qtUpdateMatches(pr.role);
  }
  // Verknüpfte Vorbelegung: Vater-Nachname erbt main-Nachname (editierbar).
  _qtLinkSurnameDefault(schema, 'main', 'father');
}

// Vater-Nachnamenfeld erbt main-Nachnamen, solange nicht manuell geändert (qtAuto-Flag).
function _qtLinkSurnameDefault(schema, fromRole, toRole) {
  const from = (schema.persons || []).find(p => p.role === fromRole)?.surnKey;
  const to   = (schema.persons || []).find(p => p.role === toRole)?.surnKey;
  if (!from || !to) return;
  const fromEl = document.getElementById('qt-e-' + from);
  const toEl   = document.getElementById('qt-e-' + to);
  if (!fromEl || !toEl) return;
  toEl.dataset.qtAuto = '1';
  fromEl.addEventListener('input', () => {
    if (toEl.dataset.qtAuto === '1') { toEl.value = fromEl.value; _qtUpdateMatches(toRole); }
  });
  toEl.addEventListener('input', () => { toEl.dataset.qtAuto = '0'; });
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
  const schema = _qtSchema(_qtActiveTpl);
  const pr = (schema.persons || []).find(x => x.role === role);
  if (!pr) return;

  // Bereits verknüpft → kompakte Anzeige, Suche pausiert bis „lösen".
  const selId = _qtMatchSel[role];
  if (selId) {
    const p = AppState.db.individuals[selId];
    if (p) {
      const by = _qtBirthYear(p);
      box.innerHTML = `<div class="qt-linked">
        <span>🔗 verknüpft: <strong>${esc(_qtPersonLabel(p))}</strong>${by ? ` (*${by})` : ''}</span>
        <button type="button" class="qt-unlink">✕ lösen</button>
      </div>`;
      box.querySelector('.qt-unlink')?.addEventListener('click', () => { delete _qtMatchSel[role]; _qtUpdateMatches(role); });
      return;
    }
    delete _qtMatchSel[role];
  }

  // DOM lesen; bei verstecktem implicit-Feld auf Schema-Default-Wert zurückfallen.
  const surnFld  = schema.fields.find(f => f.key === pr.surnKey);
  const givenFld = schema.fields.find(f => f.key === pr.givenKey);
  const surn  = document.getElementById('qt-e-' + pr.surnKey)?.value  ?? (surnFld?.value  || '');
  const given = document.getElementById('qt-e-' + pr.givenKey)?.value ?? (givenFld?.value || '');
  const matches = _qtFindMatches(surn, given, pr.sex);
  if (!matches.length) { box.innerHTML = ''; return; }

  box.innerHTML = `<div class="qt-match-head">
      ${matches.length} möglicher Treffer — verknüpfen statt neu anlegen?</div>
    <div class="qt-match-cands">` +
    matches.map(m => `<button type="button" class="qt-match-cand" data-pid="${esc(m.id)}">
        ${esc(_qtPersonLabel(m.p))}${m.by ? ` <span class="qt-match-year">*${m.by}</span>` : ''}</button>`).join('') +
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
  const schema = _qtSchema(tpl);
  for (const f of schema.fields) {
    if (f.type === 'age') {
      for (const s of ['y','m','d']) {
        const sub = document.getElementById('qt-e-' + f.key + '-' + s);
        if (sub) sub.value = '';
      }
      continue;
    }
    const el = document.getElementById('qt-e-' + f.key);
    if (el) {
      // Implizit gesetzter Wert hat Vorrang; sonst Sex-Default U, andere leer.
      if (f.value) el.value = f.value;
      else el.value = (f.type === 'sex') ? 'U' : '';
    }
    if (f.type === 'place') {
      const idEl = document.getElementById('qt-e-' + f.key + '-id');
      if (idEl) idEl.value = f.placeId || '';
    }
    // Verknüpfte Vorbelegung wieder „scharf" stellen (Listener bleiben bestehen).
    if (el && el.dataset && 'qtAuto' in el.dataset) el.dataset.qtAuto = '1';
  }
  _qtMatchSel = {};
  for (const pr of (schema.persons || [])) _qtUpdateMatches(pr.role);
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
  const ic = { error: '⚠', warn: '⚡', info: 'ℹ' };
  box.innerHTML = '<div class="qt-hint-head">Hinweise:</div>' +
    issues.map(r => {
      const sev = r.severity || 'warn';
      return `<div class="qt-hint-item qt-hint-item--${sev}">${ic[sev]||'⚡'} ${esc(r.text)}</div>`;
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
  const schema = _qtSchema(tpl);
  const v = {};
  for (const f of schema.fields) {
    if (f.type === 'age') {
      v[f.key] = {
        y: parseInt(document.getElementById('qt-e-' + f.key + '-y')?.value) || 0,
        m: parseInt(document.getElementById('qt-e-' + f.key + '-m')?.value) || 0,
        d: parseInt(document.getElementById('qt-e-' + f.key + '-d')?.value) || 0,
      };
    } else {
      // DOM-Wert lesen; falls Feld implizit/versteckt ist (kein DOM-Knoten), auf Schema-Default zurückfallen.
      const el = document.getElementById('qt-e-' + f.key);
      const raw = el ? el.value : (f.value || '');
      v[f.key] = (raw || '').trim();
      if (f.type === 'place') {
        const idEl = document.getElementById('qt-e-' + f.key + '-id');
        v[f.key + '__pid'] = idEl ? idEl.value : (f.placeId || '');
      }
      // resi (Wohnort = Adresse) hat keine placeId — Ort/PID kommen aus ctx.
    }
  }
  if      (tpl.base === 'marriage') _qtSaveMarriage(tpl, v);
  else if (tpl.base === 'baptism')  _qtSaveBaptism(tpl, v);
  else if (tpl.base === 'burial')   _qtSaveBurial(tpl, v);
  else if (tpl.base === 'custom')   _qtSaveCustom(tpl, v);
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
    marr: { date: mdate, place: ctx.place || '', placeId: ctx.placeId || null, lati:null, long:null,
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
  if (!p.chr.place && ctx.place) { p.chr.place = ctx.place; if (ctx.placeId && !p.chr.placeId) p.chr.placeId = ctx.placeId; }
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
  if (!p.death.place && ctx.place) { p.death.place = ctx.place; if (ctx.placeId && !p.death.placeId) p.death.placeId = ctx.placeId; }
  _qtAddCitToEvent(p.death, cit);
  if (bdate) {
    if (!p.buri.date)  p.buri.date  = bdate;
    if (!p.buri.place && ctx.place) { p.buri.place = ctx.place; if (ctx.placeId && !p.buri.placeId) p.buri.placeId = ctx.placeId; }
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

// ── Phase E: Speichern frei konfigurierter Templates ─────────────────────────
function _qtSaveCustom(tpl, v) {
  const ctx = tpl.context || {};
  const schema = _qtSchema(tpl);

  // Quelle/Seite/URL aus optionalem page-Feld
  const pageFld = schema.fields.find(f => f.type === 'page');
  const pageVal = pageFld ? (v[pageFld.key] || '') : '';
  const pageStr = (ctx.pagePattern && pageVal) ? ctx.pagePattern.replace('{v}', pageVal) : pageVal;
  const url     = (ctx.urlPattern && pageVal)  ? ctx.urlPattern.replace('{v}', pageVal)  : '';
  const mkCit = () => citationObj(ctx.sid, pageStr, ctx.quay || '', null, [],
    url ? [{ file: url, titl: '', _extra: [] }] : []);

  // Personen je aktiver Rolle auflösen (Treffer verknüpfen oder neu)
  const persons = {};            // role -> {id, person, isNew}
  const involvedPersonIds = [];
  for (const pr of (schema.persons || [])) {
    const surn  = pr.surnKey  ? (v[pr.surnKey]  || '') : '';
    const given = pr.givenKey ? (v[pr.givenKey] || '') : '';
    const sexFld = schema.fields.find(f => f.role === pr.role && f.type === 'sex');
    const sex = sexFld ? (v[sexFld.key] || pr.sex) : pr.sex;
    const P = _qtResolvePerson(pr.role, given, surn, sex);
    if (P) { persons[pr.role] = P; involvedPersonIds.push(P.id); }
  }
  if (!persons.main) { showToast('Hauptperson (Name oder Treffer) erforderlich', 'warn'); return; }

  // Felder anwenden (Pass 1: alle außer age — age benötigt bereits gesetztes Sterbedatum)
  let marrDate = '';
  for (const f of schema.fields) {
    if (f.type === 'age') continue;            // age: zweiter Pass unten
    const val = (v[f.key] || '').trim();
    if (f.type === 'date' && f.target === 'marr') { if (val) marrDate = _qtNormDate(val); continue; }
    const P = persons[f.role];
    if (!P) continue;                       // Rolle ohne Namen → inaktiv, Daten verwerfen
    const p = P.person;
    if (f.type === 'sex') { if (val) p.sex = val; continue; }
    if (f.type === 'date' || f.type === 'place') {
      const tgt = f.target || 'birth';
      if (!['birth', 'chr', 'death', 'buri'].includes(tgt)) continue;
      if (!p[tgt] || typeof p[tgt] !== 'object') p[tgt] = _qtEv();
      if (f.type === 'date'  && val && !p[tgt].date)  p[tgt].date  = _qtNormDate(val);
      if (f.type === 'place' && val && !p[tgt].place) {
        p[tgt].place = val;
        const pid = (v[f.key + '__pid'] || '').trim();
        if (pid && !p[tgt].placeId) p[tgt].placeId = pid;
      }
      if (val) _qtAddCitToEvent(p[tgt], mkCit());
    } else if (f.type === 'occu') {
      if (val) p.events.push(_qtGenEvent('OCCU', { value: val, citations: [mkCit()] }));
    } else if (f.type === 'resi') {
      // Wohnort = Adresse; Ort + placeId stammen implizit aus ctx (z.B. „Ochtrup")
      if (val) {
        p.events.push(_qtGenEvent('RESI', {
          place:   ctx.place   || '',
          placeId: ctx.placeId || null,
          addr:    val,
          citations: [mkCit()],
        }));
      }
    }
  }
  // Zweiter Pass: age-Felder — benötigt bereits gesetztes Sterbedatum der Rolle.
  for (const f of schema.fields) {
    if (f.type !== 'age') continue;
    const P = persons[f.role];
    if (!P) continue;
    const age = v[f.key];
    if (!age || (!age.y && !age.m && !age.d)) continue;   // nichts eingegeben
    const p = P.person;
    // Sterbedatum aus dem Formular (als normierter GEDCOM-String) oder bereits gesetztem Wert
    const tgt = f.target || 'death';
    const deathFld = schema.fields.find(df => df.role === f.role && df.type === 'date' && df.target === tgt);
    const deathDate = (deathFld ? _qtNormDate(v[deathFld.key] || '') : '')
                   || p[tgt]?.date || '';
    const calcDate = _qtCalcBirthFromAge(deathDate, age.y, age.m, age.d);
    if (calcDate) {
      if (!p.birth || typeof p.birth !== 'object') p.birth = _qtEv();
      if (!p.birth.date) {
        p.birth.date = calcDate;
        _qtAddCitToEvent(p.birth, mkCit());
      }
    } else if (age.y || age.m || age.d) {
      showToast(`Altersberechnung: Sterbedatum fehlt oder ungültig`, 'info');
    }
  }

  const main = persons.main, father = persons.father, mother = persons.mother, spouse = persons.spouse;
  const famIds = [];
  let parentFam = null, spouseFam = null;
  if (father || mother) {
    parentFam = {
      id: nextId('F'), husb: father ? father.id : '', wife: mother ? mother.id : '',
      children: [main.id], marr: _qtFamEv(), engag: {}, div: {}, divf: {},
      noteTexts: [], noteText: '', media: [], sourceRefs: new Set(),
      lastChanged: gedcomDate(new Date()), lastChangedTime: gedcomTime(new Date()),
    };
    famIds.push(parentFam.id);
  }
  if (spouse) {
    let husb = main.id, wife = spouse.id;
    if (main.person.sex === 'F' || spouse.person.sex === 'M') { husb = spouse.id; wife = main.id; }
    spouseFam = {
      id: nextId('F'), husb, wife, children: [],
      marr: { date: marrDate, place: ctx.place || '', placeId: ctx.placeId || null, lati: null, long: null,
        citations: [mkCit()], _extra: [], value: '', seen: true, note: '', noteRefs: [], media: [] },
      engag: {}, div: {}, divf: {}, noteTexts: [], noteText: '', media: [], sourceRefs: new Set(),
      lastChanged: gedcomDate(new Date()), lastChangedTime: gedcomTime(new Date()),
    };
    famIds.push(spouseFam.id);
  }

  pushUndo('Erfasst (Template)', { personIds: involvedPersonIds, familyIds: famIds });

  for (const role in persons) {
    const P = persons[role];
    if (P.isNew) AppState.db.individuals[P.id] = P.person;
    if (!Array.isArray(P.person.fams)) P.person.fams = [];
    if (!Array.isArray(P.person.famc)) P.person.famc = [];
  }
  if (parentFam) {
    AppState.db.families[parentFam.id] = parentFam;
    if (!main.person.famc.includes(parentFam.id)) main.person.famc.push(parentFam.id);
    for (const par of [father, mother]) {
      if (par && !par.person.fams.includes(parentFam.id)) par.person.fams.push(parentFam.id);
    }
  }
  if (spouseFam) {
    AppState.db.families[spouseFam.id] = spouseFam;
    for (const P of [main, spouse]) {
      if (!P.person.fams.includes(spouseFam.id)) P.person.fams.push(spouseFam.id);
    }
  }

  for (const role in persons) _rebuildPersonSourceRefs(persons[role].person);
  if (parentFam) _rebuildFamilySourceRefs(parentFam);
  if (spouseFam) _rebuildFamilySourceRefs(spouseFam);
  _qtSession.push(main.id);
  markChanged();
  renderTab();

  const extra = [father, mother, spouse].filter(Boolean).length;
  const lbl = (main.isNew ? _qtPersonLabel(main.person) : _qtPersonLabel(main.person) + ' 🔗')
    + (extra ? ` (+${extra})` : '');
  _qtAfterSave(tpl, `✓ ${lbl}`, schema.fields[0]?.key);
  _qtShowInlinePlausi(involvedPersonIds, famIds);
}

function qtEntryDone() {
  closeModal('modalQtEntry');
  const n = _qtSession.length;
  _qtSession = [];
  if (n) showToast(`${n} Eintrag${n !== 1 ? 'e' : ''} erfasst`, 'success');
}

// ── Self-Init: Templates aus IDB-Cache laden (gerätelokal, dateiunabhängig) ──
if (typeof idbGet === 'function') loadQuickTemplates();
