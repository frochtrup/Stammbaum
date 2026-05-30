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

// ── Self-Init: Templates aus IDB-Cache laden (gerätelokal, dateiunabhängig) ──
if (typeof idbGet === 'function') loadQuickTemplates();
