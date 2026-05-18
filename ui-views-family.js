// ─────────────────────────────────────
//  FAMILY LIST
// ─────────────────────────────────────
function _famSortKey(a) {
  const na = a.husb ? (AppState.db.individuals[a.husb]?.surname || AppState.db.individuals[a.husb]?.name || '') : '';
  return na;
}

function _famRowHtml(f, isCurrent, pos, total) {
  const husb = (f.husb && AppState.db.individuals[f.husb]) || null;
  const wife = (f.wife && AppState.db.individuals[f.wife]) || null;
  const title = [husb?.name, wife?.name].filter(Boolean).join(' & ') || f.id;
  let meta = '';
  if (f.marr.date) meta += '⚭ ' + f.marr.date;
  if (f.marr.place) meta += (meta ? ', ' : '⚭ ') + compactPlace(f.marr.place);
  if (f.children.length) meta += (meta ? '  ' : '') + f.children.length + ' Kind' + (f.children.length > 1 ? 'er' : '');
  const fMediaCount = (f.media || []).filter(m => m.file || m.title).length
                    + (f.marr?.media || []).filter(m => m.file || m.titl).length
                    + (f._passthrough || []).filter(l => /^1 OBJE @/.test(l)).length;
  const fMediaBadge = fMediaCount ? `<span class="p-media-badge">📎</span>` : '';
  const ariaPos = pos != null ? ` aria-setsize="${total}" aria-posinset="${pos}"` : '';
  return `<div class="person-row${isCurrent ? ' current' : ''}" role="listitem"${ariaPos} data-action="showFamilyDetail" data-fid="${f.id}">
      <div class="p-avatar fam">⬡</div>
      <div class="p-info">
        <div class="p-name">${esc(title)}${fMediaBadge}</div>
        <div class="p-meta">${esc(meta) || '&nbsp;'}</div>
      </div>
      <span class="p-arrow">›</span>
    </div>`;
}

function renderFamilyList(fams) {
  const listEl = document.getElementById('familyList');
  if (!fams) fams = Object.values(AppState.db.families);
  if (!fams.length) {
    _vsTeardown(_vsF);
    const totalFams = Object.keys(AppState.db.families || {}).length;
    if (totalFams === 0) {
      listEl.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">⊕</div>
        <div class="empty-state-title">Noch keine Familien</div>
        <div class="empty-state-msg">Familien entstehen durch Verknüpfung von Personen als Ehepaar oder Eltern-Kind-Beziehung.</div>
        <button class="empty-state-btn" data-action="newFamilyForm">Familie anlegen</button>
      </div>`;
    } else {
      listEl.innerHTML = '<div class="empty">Keine Treffer zur Suche</div>';
    }
    _announceList('Keine Familien');
    return;
  }
  fams = [...fams].sort((a, b) => {
    const c = _famSortKey(a).localeCompare(_famSortKey(b), 'de');
    if (c !== 0) return c;
    return (gedDateSortKey(a.marr.date) || 99999999) - (gedDateSortKey(b.marr.date) || 99999999);
  });

  if (fams.length <= _VS_MIN) {
    // ── Normales Rendering ──
    _vsTeardown(_vsF);
    let html = '';
    for (let i = 0; i < fams.length; i++) html += _famRowHtml(fams[i], false, i + 1, fams.length);
    listEl.innerHTML = html;
    _announceList(fams.length + (fams.length === 1 ? ' Familie' : ' Familien'));
    if (AppState.currentFamilyId) {
      const cur = listEl.querySelector(`[data-fid="${AppState.currentFamilyId}"]`);
      if (cur) {
        cur.classList.add('current');
        const container = document.getElementById('v-main') || listEl.closest('.view');
        requestAnimationFrame(() => _scrollListToCurrent(container, cur));
      }
    }
    return;
  }

  // ── Virtuelles Rendering ──
  _vsF.items   = [];
  _vsF.offsets = [];
  let offset = 0;
  const curId = AppState.currentFamilyId;

  for (let i = 0; i < fams.length; i++) {
    const f = fams[i];
    _vsF.items.push({ px: _VS_ROW, s: _famRowHtml(f, f.id === curId, i + 1, fams.length), id: f.id });
    _vsF.offsets.push(offset);
    offset += _VS_ROW;
  }
  _vsF.total = offset;

  _vsSetup(listEl, _vsF);
  _announceList(fams.length + (fams.length === 1 ? ' Familie' : ' Familien'));

  if (curId) {
    const idx = _vsF.items.findIndex(it => it.id === curId);
    if (idx >= 0) {
      requestAnimationFrame(() => {
        const sc    = _vsF.sc;
        const iOff  = _vsF.offsets[idx];
        const viewH = sc ? sc.clientHeight : window.innerHeight;
        const scTop = sc ? sc.scrollTop : window.scrollY;
        const lr    = listEl.getBoundingClientRect();
        const sr    = sc ? sc.getBoundingClientRect().top : 0;
        const lstAbs = scTop + lr.top - sr;
        const target = Math.max(0, lstAbs + iOff - viewH / 2 + _VS_ROW / 2);
        if (sc) sc.scrollTop = target; else window.scrollTo(0, target);
      });
    }
  }
}

function filterFamilies(q) {
  const lower = q.toLowerCase().trim();
  const all = Object.values(AppState.db.families);
  if (!lower) { renderFamilyList(all); return; }
  renderFamilyList(all.filter(f => {
    const husb = (f.husb && AppState.db.individuals[f.husb]) || null;
    const wife = (f.wife && AppState.db.individuals[f.wife]) || null;
    if (husb && (husb.name||'').toLowerCase().includes(lower)) return true;
    if (wife && (wife.name||'').toLowerCase().includes(lower)) return true;
    if ((f.marr?.date||'').toLowerCase().includes(lower)) return true;
    if ((f.marr?.place||'').toLowerCase().includes(lower)) return true;
    if ((f.div?.date||'').toLowerCase().includes(lower)) return true;
    if ((f.div?.place||'').toLowerCase().includes(lower)) return true;
    if ((f.engag?.date||'').toLowerCase().includes(lower)) return true;
    if ((f.engag?.place||'').toLowerCase().includes(lower)) return true;
    if ((f.noteText||'').toLowerCase().includes(lower)) return true;
    for (const ev of (f.events || [])) {
      if ((ev.value||'').toLowerCase().includes(lower)) return true;
      if ((ev.place||'').toLowerCase().includes(lower)) return true;
      if ((ev.date||'').toLowerCase().includes(lower)) return true;
      if ((ev.eventType||'').toLowerCase().includes(lower)) return true;
    }
    return false;
  }));
}

// ─────────────────────────────────────────────────────────────────
//  BEZIEHUNGS-PICKER
// ─────────────────────────────────────────────────────────────────

function showAddSpouseFlow(personId) {
  UIState._relMode = 'spouse'; UIState._relAnchorId = personId;
  document.getElementById('relPickerTitle').textContent = 'Ehepartner verknüpfen';
  document.getElementById('relPickerSearch').value = '';
  renderRelPicker('');
  openModal('modalRelPicker');
}

function showAddChildFlow(famId) {
  UIState._relMode = 'child'; UIState._relAnchorId = famId;
  document.getElementById('relPickerTitle').textContent = 'Kind hinzufügen';
  document.getElementById('relPickerSearch').value = '';
  renderRelPicker('');
  openModal('modalRelPicker');
}

function showAddParentFlow(personId) {
  UIState._relMode = 'parent'; UIState._relAnchorId = personId;
  document.getElementById('relPickerTitle').textContent = 'Elternteil verknüpfen';
  document.getElementById('relPickerSearch').value = '';
  renderRelPicker('');
  openModal('modalRelPicker');
}

function renderRelPicker(q) {
  const list = document.getElementById('relPickerList');
  const famcIdOf = c => typeof c === 'string' ? c : c.famId;
  let persons = Object.values(AppState.db.individuals);

  if (UIState._relMode === 'spouse') {
    const p = AppState.db.individuals[UIState._relAnchorId];
    const excl = new Set([UIState._relAnchorId,
      ...(p?.fams || []).flatMap(fid => {
        const f = AppState.db.families[fid]; return f ? [f.husb, f.wife] : [];
      }).filter(Boolean)
    ]);
    persons = persons.filter(x => !excl.has(x.id));
  } else if (UIState._relMode === 'child') {
    const f = AppState.db.families[UIState._relAnchorId];
    if (f) {
      const excl = new Set([...(f.children || []), f.husb, f.wife].filter(Boolean));
      persons = persons.filter(x => !excl.has(x.id));
    }
  } else if (UIState._relMode === 'parent') {
    persons = persons.filter(x => x.id !== UIState._relAnchorId);
  } else if (UIState._relMode === 'alias') {
    const p = AppState.db.individuals[UIState._relAnchorId];
    const excl = new Set([UIState._relAnchorId, ...(p?.aliases || [])]);
    persons = persons.filter(x => !excl.has(x.id));
  } else if (UIState._relMode === 'relcalc') {
    persons = persons.filter(x => x.id !== UIState._relAnchorId);
  }

  if (q) {
    const lq = q.toLowerCase();
    persons = persons.filter(x => (x.name || x.id).toLowerCase().includes(lq));
  }

  persons = persons.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de')).slice(0, 60);

  list.innerHTML = '';
  if (!persons.length) {
    list.innerHTML = '<div class="rel-picker-no-result">Keine Treffer</div>';
    return;
  }
  for (const p of persons) {
    const meta = [p.birth?.date ? '* ' + p.birth.date : '', p.death?.date ? '† ' + p.death.date : ''].filter(Boolean).join('  ');
    const row = document.createElement('div');
    row.className = 'person-row';
    row.dataset.pid = p.id;
    row.innerHTML = `<div class="person-row-info">
      <div class="person-row-name">${esc(p.name || p.id)}</div>
      ${meta ? `<div class="person-row-meta">${esc(meta)}</div>` : ''}
    </div><div class="row-arrow">›</div>`;
    row.addEventListener('click', () => relPickerSelect(p.id));
    list.appendChild(row);
  }
}

function relPickerSelect(selectedId) {
  closeModal('modalRelPicker');
  if (UIState._relMode === 'alias') {
    addAlias(UIState._relAnchorId, selectedId);
  } else if (UIState._relMode === 'relcalc') {
    showRelPath(UIState._relAnchorId, selectedId);
  } else {
    openRelFamilyForm(UIState._relAnchorId, selectedId, UIState._relMode);
  }
}

function addAlias(pid1, pid2) {
  const p1 = AppState.db.individuals[pid1];
  const p2 = AppState.db.individuals[pid2];
  if (!p1 || !p2) return;
  if (!p1.aliases.includes(pid2)) p1.aliases.push(pid2);
  if (!p2.aliases.includes(pid1)) p2.aliases.push(pid1);
  markChanged();
  showDetail(pid1);
}

function removeAlias(pid, aliasId) {
  const p1 = AppState.db.individuals[pid];
  const p2 = AppState.db.individuals[aliasId];
  if (p1) p1.aliases = (p1.aliases || []).filter(x => x !== aliasId);
  if (p2) p2.aliases = (p2.aliases || []).filter(x => x !== pid);
  markChanged();
  showDetail(pid);
}

function relPickerCreateNew() {
  closeModal('modalRelPicker');
  UIState._pendingRelation = { mode: UIState._relMode, anchorId: UIState._relAnchorId };
  showPersonForm(null);
}

function openRelFamilyForm(anchorId, partnerId, mode) {
  const famcIdOf = c => typeof c === 'string' ? c : c.famId;
  if (mode === 'spouse') {
    const p = AppState.db.individuals[anchorId];
    const q = AppState.db.individuals[partnerId];
    let husb = anchorId, wife = partnerId;
    if (p?.sex === 'F' || q?.sex === 'M') { husb = partnerId; wife = anchorId; }
    showFamilyForm(null, { husb, wife });

  } else if (mode === 'child') {
    showFamilyForm(anchorId, { addChild: partnerId });

  } else if (mode === 'parent') {
    const p   = AppState.db.individuals[anchorId];
    const par = AppState.db.individuals[partnerId];
    // Freien Slot in vorhandener Elternfamilie suchen
    let targetFamId = null;
    for (const fc of (p?.famc || [])) {
      const fid = famcIdOf(fc);
      const f = AppState.db.families[fid];
      if (!f) continue;
      if (!f.husb && par?.sex !== 'F') { targetFamId = fid; break; }
      if (!f.wife && par?.sex === 'F') { targetFamId = fid; break; }
    }
    if (targetFamId) {
      const slot = par?.sex === 'F' ? 'wife' : 'husb';
      showFamilyForm(targetFamId, { [slot]: partnerId });
    } else {
      const husb = par?.sex === 'F' ? undefined : partnerId;
      const wife = par?.sex === 'F' ? partnerId : undefined;
      showFamilyForm(null, { husb, wife, addChild: anchorId });
    }
  }
}

async function unlinkMember(famId, personId) {
  if (!await confirmModal('Verbindung wirklich trennen?', 'Trennen')) return;
  const f = AppState.db.families[famId];
  const p = AppState.db.individuals[personId];
  if (!f || !p) return;
  const famcIdOf = c => typeof c === 'string' ? c : c.famId;

  if (f.husb === personId) {
    f.husb = null;
    p.fams = p.fams.filter(id => id !== famId);
  } else if (f.wife === personId) {
    f.wife = null;
    p.fams = p.fams.filter(id => id !== famId);
  } else if (f.children.includes(personId)) {
    f.children = f.children.filter(id => id !== personId);
    p.famc = p.famc.filter(c => famcIdOf(c) !== famId);
  } else return; // nichts gefunden

  markChanged(); renderTab();
  showToast('✓ Verbindung getrennt');
  if (AppState.currentFamilyId === famId) showFamilyDetail(famId);
  else if (AppState.currentPersonId) showDetail(AppState.currentPersonId);
}

// ─────────────────────────────────────
//  DETAIL: FAMILIE
// ─────────────────────────────────────
function showFamilyDetail(id, pushHistory = true) {
  const f = AppState.db.families[id];
  if (!f) return;
  if (pushHistory) _beforeDetailNavigate();
  AppState.currentFamilyId  = id;
  AppState.currentPersonId  = null;
  AppState.currentSourceId  = null;
  AppState.currentRepoId    = null;
  AppState.currentPlaceName = null;
  (UIState._lastTabSel || (UIState._lastTabSel = {})).families = id;
  if (document.body.classList.contains('desktop-mode')) {
    if (AppState.currentTab === 'families') _updateFamilyListCurrent(id); else _updateFamilyListCurrent(null);
    _updatePersonListCurrent(null);
  }

  const husb = f.husb ? AppState.db.individuals[f.husb] : null;
  const wife = f.wife ? AppState.db.individuals[f.wife] : null;
  const title = [husb?.name, wife?.name].filter(Boolean).join(' & ') || id;

  document.getElementById('detailTopTitle').textContent = 'Familie';
  document.getElementById('editBtn').style.display = '';
  const _famTreeTarget = f.husb || f.wife || null;
  const tb = document.getElementById('treeBtn');
  tb.style.display = _famTreeTarget ? '' : 'none';
  if (_famTreeTarget) tb.dataset.id = _famTreeTarget;
  const _tlBtn  = document.getElementById('timelineBtn');   if (_tlBtn)  _tlBtn.hidden  = true;
  const _stBtn  = document.getElementById('storyBtn');      if (_stBtn)  _stBtn.hidden  = true;
  const _pbBtn  = document.getElementById('probandBtn');    if (_pbBtn)  _pbBtn.hidden  = true;
  const _pbsBtn = document.getElementById('probandSetBtn'); if (_pbsBtn) _pbsBtn.hidden = true;
  const _mapBtn = document.getElementById('detailMapBtn');  if (_mapBtn) _mapBtn.hidden = true;

  let html = `<div class="detail-hero fade-up">
    <div id="det-fam-photo-${id}" class="det-photo-wrap"></div>
    <div id="det-fam-avatar-${id}" class="detail-avatar fam">⬡</div>
    <div class="detail-hero-text">
      <div class="detail-name">${esc(title)}</div>
    </div>
  </div>`;

  {
    // Einheitliche Ereignisse-Section (analog Lebensdaten bei Personen)
    const _famEvDefs = [
      { key:'marr',  label:'Heirat' },
      { key:'engag', label:'Verlobung' },
      { key:'div',   label:'Scheidung' },
      { key:'divf',  label:'Scheidungsantrag' }
    ];
    html += `<div class="section fade-up">
      <div class="section-head">
        <div class="section-title">Ereignisse</div>
        <button class="section-add" data-action="showFamEventForm" data-fid="${id}">+ Ereignis</button>
      </div>`;
    let _hasAnyEv = false;
    for (const { key, label } of _famEvDefs) {
      const ev = f[key];
      if (!ev?.date && !ev?.place && !ev?.seen) continue;
      _hasAnyEv = true;
      const geoBtn = evGeoLink(ev.lati, ev.long);
      const parts = [ev.date, compactPlace(ev.place)].filter(Boolean).join(', ');
      html += `<div class="fact-row fact-row--clickable" data-action="showFamEventForm" data-fid="${id}" data-evkey="${key}">
        <span class="fact-lbl">${label}</span>
        <span class="fact-val">${esc(parts || '–')}${_placeHierHtml(ev.placeId)}${geoBtn}${citTagsHtml(ev.citations || [])}${ev.note ? `<span class="ev-note">${esc(ev.note)}</span>` : ''}</span>
      </div>`;
    }
    for (let _ei = 0; _ei < (f.events || []).length; _ei++) {
      const ev = f.events[_ei];
      _hasAnyEv = true;
      const label = (ev.eventType && ev.type === 'EVEN') ? ev.eventType : (EVENT_LABELS[ev.type] || ev.type);
      const parts = [ev.value, ev.date, compactPlace(ev.place)].filter(Boolean).join(', ');
      html += `<div class="fact-row fact-row--clickable" data-action="showFamEventForm" data-fid="${id}" data-evkey="ev" data-evidx="${_ei}">
        <span class="fact-lbl">${esc(label)}</span>
        <span class="fact-val">${esc(parts || '–')}${_placeHierHtml(ev.placeId)}${citTagsHtml(ev.citations || [])}${ev.note ? `<span class="ev-note">${esc(ev.note)}</span>` : ''}</span>
      </div>`;
    }
    if (!_hasAnyEv) {
      html += `<div class="no-data">Keine Ereignisse eingetragen</div>`;
    }
    html += `</div>`;
  }

  html += `<div class="section fade-up">
    <div class="section-head">
      <div class="section-title">Mitglieder</div>
      <button class="section-add" data-action="showAddChildFlow" data-fid="${id}">+ Kind</button>
    </div>`;
  if (husb) html += relRow(husb, 'Ehemann / Vater', id);
  if (wife) html += relRow(wife, 'Ehefrau / Mutter', id);
  for (const cid of _sortedChildren(f.children)) {
    const child = AppState.db.individuals[cid];
    if (!child) continue;
    const _fe = (child.famc || []).find(x => (typeof x === 'string' ? x : x.famId) === id);
    const _curPedi = (typeof _fe === 'object') ? (_toPedi(_fe.pedi || _fe.frel || '')) : '';
    const _pediLabels = { birth: 'leiblich', adopted: 'adoptiert', foster: 'Pflegekind', sealing: 'Sealing' };
    const _pediLabel = _curPedi ? (_pediLabels[_curPedi] || _curPedi) : '– Verhältnis';
    const _pediSpan = `<span class="child-pedi-span" data-action="showChildRelDialog" data-fid="${id}" data-cid="${cid}">${_pediLabel}</span>`;
    const _cits = (typeof _fe === 'object') ? (_fe.citations || []) : [];
    const _addQBtn = `<button class="child-q-btn" data-action="showChildRelDialog" data-fid="${id}" data-cid="${cid}"
        title="Quelle hinzufügen">+ Q</button>`;
    const _sourWidget = _cits.length
      ? citTagsHtml(_cits) + _addQBtn
      : _addQBtn;
    const sc = child.sex === 'M' ? 'm' : child.sex === 'F' ? 'f' : '';
    const ic = child.sex === 'M' ? '♂' : child.sex === 'F' ? '♀' : '◇';
    html += `<div class="rel-row" data-action="showDetail" data-pid="${child.id}">
      <div class="rel-avatar ${sc}">${ic}</div>
      <div class="rel-info">
        <div class="rel-name">${esc(child.name || child.id)}</div>
        <div class="rel-role rel-role-row">Kind · ${_pediSpan}${_sourWidget}</div>
      </div>
      <button class="unlink-btn" data-action="unlinkMember" data-fid="${id}" data-pid="${child.id}"
        title="Verbindung trennen">×</button>
      <span class="p-arrow">›</span>
    </div>`;
  }
  html += `</div>`;

  // Notizen
  const _fNoteText = f.noteText || '';
  const _fHasRefs  = (f.noteRefs || []).some(r => AppState.db.notes?.[r]);
  html += `<div class="section fade-up">
    <div class="section-head">
      <div class="section-title">Notizen${_fHasRefs ? ` <span class="fs-xxs c-muted fw-400">(+ verknüpfte)</span>` : ''}</div>
      <button class="section-add" data-action="openNoteModal" data-ntype="family" data-nid="${id}">✎ Bearbeiten</button>
    </div>
    <div class="note-clickable" data-action="openNoteModal" data-ntype="family" data-nid="${id}">
      ${_fNoteText
        ? `<div class="note-text">${esc(_fNoteText)}</div>`
        : `<div class="note-hint">Notiz hinzufügen…</div>`}
    </div>
  </div>`;

  // Media section: marr.media[] (2 OBJE unter MARR), f.media[] (1 OBJE auf FAM-Ebene), ref OBJE in _passthrough
  const famMedia = f.media || [];
  const _objeMap = _buildObjeRefMap();
  // f.marr.media[] enthält inline OBJE-Blöcke unter MARR; titl-Feld (nicht title)
  const marrObjeEntries = (f.marr?.media || []).map(m => ({ file: m.file || '', title: m.titl || '', form: m.form || '' }));
  const famPtObje = (f._passthrough || []).filter(l => /^1 OBJE @/.test(l));
  {
    html += `<div class="section fade-up">
      <div class="section-head">
        <div class="section-title">Medien</div>
        <button class="section-add" data-action="openAddMediaDialog" data-ctx="family" data-id="${id}">+ Hinzufügen</button>
      </div>`;
    for (let i = 0; i < marrObjeEntries.length; i++) {
      const m = marrObjeEntries[i];
      const display = m.title || m.file || '–';
      const sub = m.title && m.file ? m.file : '';
      const _ext = (m.file || '').split('.').pop().toLowerCase();
      const _isImg = ['jpg','jpeg','png','gif','bmp','webp','tif','tiff'].includes(_ext);
      const _icon = _isImg ? '🖼' : _ext === 'pdf' ? '📄' : '📎';
      html += `<div class="media-row"
        data-action="openMediaPhoto" data-media-file="${esc(m.file || '')}" data-hero="det-fam-photo-${id}" data-avatar="det-fam-avatar-${id}">
        <div id="media-thumb-fam-${id}-${i}" class="media-thumb">${_icon}</div>
        <div class="media-info">
          <div class="media-title">${esc(display)}</div>
          ${sub ? `<div class="media-sub">${esc(sub)}</div>` : ''}
        </div>
        <button class="edit-media-btn" data-action="openEditMediaDialog" data-ctx="family" data-id="${id}" data-idx="${i}" title="Bearbeiten">✎</button>
      </div>`;
    }
    for (let i = 0; i < famMedia.length; i++) {
      const m = famMedia[i];
      const display = m.title || m.file || '–';
      const sub = m.title && m.file ? m.file : '';
      const _ext = (m.file || '').split('.').pop().toLowerCase();
      const _isImg = ['jpg','jpeg','png','gif','bmp','webp','tif','tiff'].includes(_ext);
      const _icon = _isImg ? '🖼' : _ext === 'pdf' ? '📄' : '📎';
      html += `<div class="media-row"
        data-action="openMediaPhoto" data-media-file="${esc(m.file || '')}" data-hero="det-fam-photo-${id}" data-avatar="det-fam-avatar-${id}">
        <div id="media-thumb-fam-media-${id}-${i}" class="media-thumb">${_icon}</div>
        <div class="media-info">
          <div class="media-title">${esc(display)}</div>
          ${sub ? `<div class="media-sub">${esc(sub)}</div>` : ''}
        </div>
        <button class="edit-media-btn" data-action="openEditMediaDialog" data-ctx="family_media" data-id="${id}" data-idx="${i}" title="Bearbeiten">✎</button>
      </div>`;
    }
    for (const l of famPtObje) {
      const ref = l.replace(/^1 OBJE\s+/, '').trim();
      const obj = _objeMap[ref];
      const label = obj ? (obj.title || obj.file || ref) : ref;
      const sub   = obj && obj.title && obj.file ? obj.file : '';
      const _ext2 = (obj?.file || '').split('.').pop().toLowerCase();
      const _icon2 = ['jpg','jpeg','png','gif','bmp','webp'].includes(_ext2) ? '🖼' : _ext2 === 'pdf' ? '📄' : '📎';
      html += `<div class="media-row--ref">
        <div class="media-thumb">${_icon2}</div>
        <div class="media-info">
          <div class="media-title">${esc(label)}</div>
          ${sub ? `<div class="media-sub">${esc(sub)}</div>` : ''}
          <div class="media-ref-label">Verweis</div>
        </div>
      </div>`;
    }
    if (!marrObjeEntries.length && !famMedia.length && !famPtObje.length) html += `<div class="no-data-pad">Keine Medien eingetragen</div>`;
    html += `</div>`;
  }

  if (f._grampsTags?.length) html += `<div class="section fade-up"><div class="fact-row"><span class="fact-lbl">Tags</span><span class="fact-val">${f._grampsTags.map(t => `<span class="gramps-tag" style="background:${esc(t.color||'#888')}">${esc(t.name)}</span>`).join('')}</span></div></div>`;
  if (f._grampsAttrs?.length) html += `<div class="section fade-up">${f._grampsAttrs.map(a => `<div class="fact-row"><span class="fact-lbl">${esc(a.type)}</span><span class="fact-val">${esc(a.value)}${a.note ? `<div class="note-text">${esc(a.note)}</div>` : ''}</span></div>`).join('')}</div>`;

  html += _famTasksSectionHtml(id);
  if (typeof _famRlogSectionHtml === 'function') html += _famRlogSectionHtml(id);

  document.getElementById('detailContent').innerHTML = html;
  showView('v-detail');

  // Foto async — Pfad (m.file) direkt; IDB path-basiert als Offline-Fallback
  (async () => {
    const _marrMedia = f.marr?.media || [];
    const _famMedia  = f.media || [];
    const _primMarrIdx = Math.max(0, _marrMedia.findIndex(m => m.prim && m.prim !== ''));
    const _filePath  = _marrMedia[_primMarrIdx]?.file;
    let src = (_filePath ? await _odGetMediaUrlByPath(_filePath).catch(() => null) : null)
           || (_filePath ? await idbGet('img:' + _filePath).catch(() => null) : null);
    if (!src && _famMedia.length > 0) {
      const _primFamIdx  = Math.max(0, _famMedia.findIndex(m => m.prim && m.prim !== ''));
      const _famFilePath = _famMedia[_primFamIdx]?.file;
      src = (_famFilePath ? await _odGetMediaUrlByPath(_famFilePath).catch(() => null) : null)
         || (_famFilePath ? await idbGet('img:' + _famFilePath).catch(() => null) : null);
    }
    if (!src) return;
    const el = document.getElementById('det-fam-photo-' + id);
    const av = document.getElementById('det-fam-avatar-' + id);
    if (el) {
      el.style.display = 'block'; el.innerHTML = '';
      const img = document.createElement('img');
      img.src = src; img.alt = 'Foto';
      img.style.cssText = 'width:80px;height:96px;object-fit:cover;border-radius:8px;display:block;flex-shrink:0;cursor:pointer';
      img.addEventListener('click', () => showLightbox(img.src, null, 'det-fam-photo-' + id, 'det-fam-avatar-' + id, null));
      img.onerror = () => { el.style.display = 'none'; if (av) av.style.display = ''; };
      el.appendChild(img);
      if (av) av.style.display = 'none';
    }
  })();
  // Media-Thumbnails async laden — pfad-basiert
  for (let _mi = 0; _mi < marrObjeEntries.length; _mi++) {
    _asyncLoadMediaThumb('media-thumb-fam-' + id + '-' + _mi, marrObjeEntries[_mi]?.file);
  }
  for (let _mi = 0; _mi < famMedia.length; _mi++) {
    _asyncLoadMediaThumb('media-thumb-fam-media-' + id + '-' + _mi, famMedia[_mi]?.file);
  }
}

// Setzt PEDI-Wert auf der INDI-Seite (famc-Eintrag) und speichert
function savePedi(famId, childId, value) {
  const p = getPerson(childId);
  if (!p) return;
  const fe = p.famc.find(x => (typeof x === 'string' ? x : x.famId) === famId);
  if (!fe || typeof fe === 'string') return;
  fe.pedi     = value;
  fe.frel     = value;
  fe.mrel     = value;
  fe.frelSeen = !!value;
  fe.mrelSeen = !!value;
  markChanged();
}

// Öffnet den Kind-Verhältnis-Dialog (PEDI + Quellen)
function showChildRelDialog(famId, childId) {
  const p = getPerson(childId);
  if (!p) return;
  const fe = p.famc.find(x => (typeof x === 'string' ? x : x.famId) === famId);
  document.getElementById('cr-famId').value   = famId;
  document.getElementById('cr-childId').value = childId;
  document.getElementById('cr-child-name').textContent = p.name || childId;
  const curPedi = (fe && typeof fe === 'object') ? (fe.pedi || _toPedi(fe.frel || '')) : '';
  document.getElementById('cr-pedi').value = curPedi;
  initSrcWidget('cr', (fe && typeof fe === 'object') ? (fe.citations || []) : []);
  openModal('modalChildRel');
}

// Speichert PEDI + Quellen aus dem Dialog
function saveChildRelDialog() {
  const famId   = document.getElementById('cr-famId').value;
  const childId = document.getElementById('cr-childId').value;
  const pediVal = document.getElementById('cr-pedi').value;
  const p = getPerson(childId);
  if (!p) { closeModal('modalChildRel'); return; }
  const fe = p.famc.find(x => (typeof x === 'string' ? x : x.famId) === famId);
  if (!fe || typeof fe === 'string') { closeModal('modalChildRel'); return; }
  fe.pedi      = pediVal;
  fe.frel      = pediVal;
  fe.mrel      = pediVal;
  fe.frelSeen  = !!pediVal;
  fe.mrelSeen  = !!pediVal;
  fe.citations = [...(srcWidgetState['cr']?.citations || [])];
  markChanged();
  closeModal('modalChildRel');
  showFamilyDetail(famId);
}
