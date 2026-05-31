// ─────────────────────────────────────
//  RES-HYPO — Hypothesen-System (ADR-023)
// ─────────────────────────────────────
// Hypothesen leben auf p._hypotheses[] / f._hypotheses[] und reisen mit
// GEDCOM/GRAMPS. Kein separater IDB-Schlüssel — markChanged() löst den
// normalen Speicher-Flow aus (Muster wie _tasks/_rlog).
// Status/Weight/Helfer (HYPO_STATUSES, _newHypo, hypoIsEmpty, _hypoStatus)
// kommen aus gedcom.js.

// ─── DB-Zugriff ────────────────────────────────────────────────────────────────

function _getPersonHypos(personId) {
  const p = AppState.db.individuals[personId];
  if (!p) return [];
  if (!p._hypotheses) p._hypotheses = [];
  return p._hypotheses;
}
function _getFamHypos(famId) {
  const f = AppState.db.families[famId];
  if (!f) return [];
  if (!f._hypotheses) f._hypotheses = [];
  return f._hypotheses;
}

function _newHypoId() {
  return 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function _addHypoToObj(obj, data) {
  if (!obj._hypotheses) obj._hypotheses = [];
  const h = _newHypo();
  h.id      = _newHypoId();
  h.created = new Date().toISOString().slice(0, 10);
  Object.assign(h, data);
  obj._hypotheses.push(h);
  markChanged();
  return h;
}

// ─── Anzeige-Helfer ──────────────────────────────────────────────────────────

function _hypoStatusClass(s) {
  return 'hs-' + _hypoStatus({ status: s });   // hs-open | hs-confirmed | hs-rejected
}

function _hypoEvidenceHtml(h) {
  const ev = (h.evidence || []).filter(e => e && e.sid);
  if (!ev.length) return '';
  const items = ev.map(e => {
    const src = AppState.db.sources?.[e.sid];
    const label = src ? esc(src.abbr || src.title || e.sid) : esc(e.sid);
    return `<span class="hypo-ev-chip">📄 ${label}${e.page ? ` <span class="hypo-ev-page">${esc(e.page)}</span>` : ''}</span>`;
  }).join('');
  return `<div class="hypo-evidence">${items}</div>`;
}

// Eine Hypothesen-Karte (Person- oder Familien-Kontext über kind/'p'|'f')
function _hypoCardHtml(h, kind, ownerId) {
  const st  = _hypoStatus(h);
  const stL = _hypoStatusLabel(st);
  const wL  = h.weight ? _hypoWeightLabel(h.weight) : '';
  return `<div class="hypo-card">
    <div class="hypo-card-head">
      <span class="hypo-status ${_hypoStatusClass(st)}">${esc(stL)}</span>
      ${wL ? `<span class="hypo-weight hw-${esc(h.weight)}" title="Konfidenz">${esc(wL)}</span>` : ''}
      <div class="hypo-actions">
        <button class="task-edit" data-action="editHypo" data-kind="${kind}" data-oid="${esc(ownerId)}" data-hid="${esc(h.id)}" aria-label="Hypothese bearbeiten">✎</button>
        <button class="task-del" data-action="deleteHypo" data-kind="${kind}" data-oid="${esc(ownerId)}" data-hid="${esc(h.id)}" aria-label="Hypothese löschen">×</button>
      </div>
    </div>
    <div class="hypo-text">${esc(h.text || '(ohne Text)')}</div>
    ${h.rationale  ? `<div class="hypo-ratio"><span class="hypo-lbl">Begründung:</span> ${esc(h.rationale)}</div>` : ''}
    ${h.conclusion ? `<div class="hypo-concl"><span class="hypo-lbl">Schluss:</span> ${esc(h.conclusion)}</div>` : ''}
    ${_hypoEvidenceHtml(h)}
  </div>`;
}

// ─── Abschnitts-HTML (Person + Familie) ──────────────────────────────────────

function _hypoSectionHtml(personId) {
  return _hypoSectionFor(_getPersonHypos(personId), 'p', personId, 'hypo-section-' + personId, 'showAddHypoForm', 'pid');
}
function _famHypoSectionHtml(famId) {
  return _hypoSectionFor(_getFamHypos(famId), 'f', famId, 'fam-hypo-section-' + famId, 'showAddFamHypoForm', 'fid');
}

function _hypoSectionFor(hypos, kind, ownerId, domId, addAction, idAttr) {
  const openCnt = hypos.filter(h => _hypoStatus(h) === 'open').length;
  let html = `<div class="section fade-up" id="${domId}" data-jump-id="pdet-hypo">
    <div class="section-head">
      <div class="section-title">Hypothesen${hypos.length
        ? ` <span class="tasks-open-cnt">(${openCnt} offen)</span>`
        : ''}</div>
      <button class="section-add" data-action="${addAction}" data-${idAttr}="${esc(ownerId)}">+ Hypothese</button>
    </div>`;
  for (const h of hypos) html += _hypoCardHtml(h, kind, ownerId);
  if (!hypos.length) html += `<div class="tasks-empty">Keine Hypothesen</div>`;
  html += `</div>`;
  return html;
}

function _refreshHypoSection(kind, ownerId) {
  const domId = (kind === 'f' ? 'fam-hypo-section-' : 'hypo-section-') + ownerId;
  const sec = document.getElementById(domId);
  if (!sec) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = (kind === 'f' ? _famHypoSectionHtml(ownerId) : _hypoSectionHtml(ownerId));
  sec.replaceWith(tmp.firstElementChild);
}

// ─── Modal: Hinzufügen/Bearbeiten ────────────────────────────────────────────

let _hypoCtxKind  = 'p';   // 'p' | 'f'
let _hypoCtxId    = null;   // owner id
let _hypoEditId   = null;   // null = Hinzufügen

function showAddHypoForm(personId)  { _hypoCtxKind = 'p'; _hypoCtxId = personId; _hypoEditId = null; _openHypoModal('Hypothese hinzufügen', _newHypo()); }
function showAddFamHypoForm(famId)  { _hypoCtxKind = 'f'; _hypoCtxId = famId;    _hypoEditId = null; _openHypoModal('Hypothese hinzufügen', _newHypo()); }

function showEditHypoForm(kind, ownerId, hid) {
  const list = kind === 'f' ? _getFamHypos(ownerId) : _getPersonHypos(ownerId);
  const h = list.find(x => x.id === hid);
  if (!h) return;
  _hypoCtxKind = kind; _hypoCtxId = ownerId; _hypoEditId = hid;
  _openHypoModal('Hypothese bearbeiten', h);
}

function _hypoSourceOptions(selected) {
  const entries = Object.entries(AppState.db.sources || {});
  entries.sort((a, b) => (a[1].abbr || a[1].title || a[0]).localeCompare(b[1].abbr || b[1].title || b[0]));
  let opts = `<option value="">— Quelle wählen —</option>`;
  for (const [sid, s] of entries) {
    const label = s.abbr || s.title || sid;
    opts += `<option value="${esc(sid)}"${sid === selected ? ' selected' : ''}>${esc(label)}</option>`;
  }
  return opts;
}

function _hypoEvidenceRowHtml(e) {
  e = e || { sid: '', page: '' };
  return `<div class="hypo-ev-row">
    <select class="form-select hypo-ev-src">${_hypoSourceOptions(e.sid)}</select>
    <input type="text" class="form-input hypo-ev-pg" placeholder="Seite/Fundstelle" value="${esc(e.page || '')}">
    <button type="button" class="task-del" data-action="removeHypoEvidence" aria-label="Evidenz entfernen">×</button>
  </div>`;
}

function _collectHypoEvidenceFromDom() {
  const rows = document.querySelectorAll('#hypoEvidenceList .hypo-ev-row');
  const out = [];
  rows.forEach(r => {
    const sid  = r.querySelector('.hypo-ev-src')?.value || '';
    const page = r.querySelector('.hypo-ev-pg')?.value || '';
    if (sid) out.push({ sid, page: page.trim() });
  });
  return out;
}

function addHypoEvidenceRow() {
  const cur = _collectHypoEvidenceFromDom();
  cur.push({ sid: '', page: '' });
  _renderHypoEvidenceList(cur);
}
function removeHypoEvidence(el) {
  const row = el.closest('.hypo-ev-row');
  if (row) row.remove();
}
function _renderHypoEvidenceList(ev) {
  const list = document.getElementById('hypoEvidenceList');
  if (!list) return;
  list.innerHTML = (ev && ev.length ? ev : []).map(_hypoEvidenceRowHtml).join('');
}

function _openHypoModal(title, h) {
  const titleEl = document.querySelector('#modalAddHypo .sheet-title');
  if (titleEl) titleEl.textContent = title;

  const stSel = document.getElementById('hypoStatus');
  if (stSel) {
    stSel.innerHTML = HYPO_STATUSES.map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join('');
    stSel.value = _hypoStatus(h);
  }
  const wSel = document.getElementById('hypoWeight');
  if (wSel) {
    wSel.innerHTML = `<option value="">— Konfidenz —</option>` +
      HYPO_WEIGHTS.map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join('');
    wSel.value = h.weight || '';
  }
  const txt = document.getElementById('hypoText');     if (txt) txt.value = h.text || '';
  const rat = document.getElementById('hypoRationale'); if (rat) rat.value = h.rationale || '';
  const con = document.getElementById('hypoConclusion');if (con) con.value = h.conclusion || '';
  _renderHypoEvidenceList(h.evidence || []);

  openModal('modalAddHypo');
  setTimeout(() => txt?.focus(), 80);
}

function _saveAddHypo() {
  const text = (document.getElementById('hypoText')?.value || '').trim();
  if (!text) { showToast('Bitte Hypothese eingeben', 'warn'); return; }
  const data = {
    text,
    status:     document.getElementById('hypoStatus')?.value || 'open',
    weight:     document.getElementById('hypoWeight')?.value || '',
    rationale:  (document.getElementById('hypoRationale')?.value  || '').trim(),
    conclusion: (document.getElementById('hypoConclusion')?.value || '').trim(),
    evidence:   _collectHypoEvidenceFromDom(),
  };
  closeModal('modalAddHypo');

  const owner = _hypoCtxKind === 'f'
    ? AppState.db.families[_hypoCtxId]
    : AppState.db.individuals[_hypoCtxId];
  if (!owner) return;

  if (_hypoEditId) {
    const list = owner._hypotheses || [];
    const h = list.find(x => x.id === _hypoEditId);
    if (h) { Object.assign(h, data); markChanged(); }   // {...existing} via Assign: erhält id/created
    showToast('Hypothese aktualisiert', 'success');
  } else {
    _addHypoToObj(owner, data);
    showToast('Hypothese gespeichert', 'success');
  }
  _hypoEditId = null;
  _refreshHypoSection(_hypoCtxKind, _hypoCtxId);
}

function _deleteHypo(kind, ownerId, hid) {
  const owner = kind === 'f' ? AppState.db.families[ownerId] : AppState.db.individuals[ownerId];
  if (!owner?._hypotheses) return;
  owner._hypotheses = owner._hypotheses.filter(h => h.id !== hid);
  markChanged();
  _refreshHypoSection(kind, ownerId);
  showToast('Hypothese gelöscht', 'success');
}

// ─── Delegations-Handler ─────────────────────────────────────────────────────

function _handleEditHypo(el)   { showEditHypoForm(el.dataset.kind, el.dataset.oid, el.dataset.hid); }
function _handleDeleteHypo(el) { _deleteHypo(el.dataset.kind, el.dataset.oid, el.dataset.hid); }
