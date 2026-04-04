// ─────────────────────────────────────
//  FAMILY LIST
// ─────────────────────────────────────
function renderFamilyList(fams) {
  const el = document.getElementById('familyList');
  if (!fams) fams = Object.values(AppState.db.families);
  if (!fams.length) { el.innerHTML = '<div class="empty">Keine Familien gefunden</div>'; return; }
  fams = [...fams].sort((a, b) => {
    const na = a.husb ? (AppState.db.individuals[a.husb]?.surname || AppState.db.individuals[a.husb]?.name || '') : '';
    const nb = b.husb ? (AppState.db.individuals[b.husb]?.surname || AppState.db.individuals[b.husb]?.name || '') : '';
    const c = na.localeCompare(nb, 'de');
    if (c !== 0) return c;
    const ya = gedDateSortKey(a.marr.date) || 99999999;
    const yb = gedDateSortKey(b.marr.date) || 99999999;
    return ya - yb;
  });

  let html = '';
  for (const f of fams) {
    const husb = (f.husb && AppState.db.individuals[f.husb]) || null;
    const wife = (f.wife && AppState.db.individuals[f.wife]) || null;
    const title = [husb?.name, wife?.name].filter(Boolean).join(' & ') || f.id;
    let meta = '';
    if (f.marr.date) meta += '⚭ ' + f.marr.date;
    if (f.marr.place) meta += (meta ? ', ' : '⚭ ') + f.marr.place;
    if (f.children.length) meta += (meta ? '  ' : '') + f.children.length + ' Kind' + (f.children.length > 1 ? 'er' : '');
    const fMediaCount = (f.media || []).filter(m => m.file || m.title).length
                      + (f.marr?.media || []).filter(m => m.file || m.titl).length
                      + (f._passthrough || []).filter(l => /^1 OBJE @/.test(l)).length;
    const fMediaBadge = fMediaCount ? `<span style="font-size:0.78rem;margin-left:4px;vertical-align:middle;opacity:0.7">📎</span>` : '';
    html += `<div class="person-row" data-action="showFamilyDetail" data-fid="${f.id}">
      <div class="p-avatar">👨‍👩‍👧</div>
      <div class="p-info">
        <div class="p-name">${esc(title)}${fMediaBadge}</div>
        <div class="p-meta">${esc(meta) || '&nbsp;'}</div>
      </div>
      <span class="p-arrow">›</span>
    </div>`;
  }
  el.innerHTML = html;
  if (AppState.currentFamilyId) {
    const cur = el.querySelector(`[data-fid="${AppState.currentFamilyId}"]`);
    if (cur) {
      cur.classList.add('current');
      const container = document.getElementById('v-main') || el.closest('.view');
      requestAnimationFrame(() => _scrollListToCurrent(container, cur));
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
    if ((f.marr.date||'').toLowerCase().includes(lower)) return true;
    if ((f.marr.place||'').toLowerCase().includes(lower)) return true;
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
  }

  if (q) {
    const lq = q.toLowerCase();
    persons = persons.filter(x => (x.name || x.id).toLowerCase().includes(lq));
  }

  persons = persons.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de')).slice(0, 60);

  list.innerHTML = '';
  if (!persons.length) {
    list.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;padding:8px 0">Keine Treffer</div>';
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
  openRelFamilyForm(UIState._relAnchorId, selectedId, UIState._relMode);
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

function unlinkMember(famId, personId) {
  if (!confirm('Verbindung wirklich trennen?')) return;
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

  markChanged(); updateStats(); renderTab();
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
  AppState.currentFamilyId = id;
  AppState.currentPersonId = null;
  AppState.currentSourceId = null;
  AppState.currentRepoId   = null;
  if (document.body.classList.contains('desktop-mode')) { _updateFamilyListCurrent(id); _updatePersonListCurrent(null); }

  const husb = f.husb ? AppState.db.individuals[f.husb] : null;
  const wife = f.wife ? AppState.db.individuals[f.wife] : null;
  const title = [husb?.name, wife?.name].filter(Boolean).join(' & ') || id;

  document.getElementById('detailTopTitle').textContent = 'Familie';
  document.getElementById('editBtn').style.display = '';
  document.getElementById('editBtn').onclick = () => showFamilyForm(id);
  const _famTreeTarget = f.husb || f.wife || null;
  document.getElementById('treeBtn').style.display = _famTreeTarget ? '' : 'none';
  if (_famTreeTarget) document.getElementById('treeBtn').onclick = () => showTree(_famTreeTarget);

  let html = `<div class="detail-hero fade-up">
    <div id="det-fam-photo-${id}" style="display:none"></div>
    <div id="det-fam-avatar-${id}" class="detail-avatar" style="font-size:1.8rem">👨‍👩‍👧</div>
    <div class="detail-hero-text">
      <div class="detail-name">${esc(title)}</div>
    </div>
  </div>`;

  if (f.marr.date || f.marr.place || f.marr.addr) {
    html += `<div class="section fade-up"><div class="section-title">Heirat</div>`;
    const marrSrc = (f.marr.sources?.length) ? f.marr.sources : (f.sourceRefs?.length ? [...f.sourceRefs] : null);
    if (f.marr.date) html += factRow('Datum', f.marr.date, '', f.marr.place ? null : marrSrc);
    if (f.marr.place) {
      const geoBtn = (f.marr.lati !== null && f.marr.lati !== undefined)
        ? `<a href="https://maps.apple.com/?ll=${f.marr.lati},${f.marr.long}" target="_blank" style="color:var(--gold-dim);font-size:0.75rem;text-decoration:none;margin-left:5px">📍</a>` : '';
      html += factRow('Ort', f.marr.place, geoBtn, marrSrc);
    }
    if (f.marr.addr) html += factRow('Adresse', f.marr.addr);
    html += `</div>`;
  }
  if (f.engag?.date || f.engag?.place) {
    html += `<div class="section fade-up"><div class="section-title">Verlobung</div>`;
    const engSrc = f.engag.sources?.length ? f.engag.sources : null;
    if (f.engag.date)  html += factRow('Datum', f.engag.date,  '', engSrc);
    if (f.engag.place) html += factRow('Ort',   f.engag.place, '', engSrc);
    html += `</div>`;
  }
  if (f.div?.date || f.div?.place || f.div?.seen) {
    html += `<div class="section fade-up"><div class="section-title">Scheidung</div>`;
    const divSrc = f.div.sources?.length ? f.div.sources : null;
    if (f.div.date)  html += factRow('Datum', f.div.date,  '', divSrc);
    if (f.div.place) html += factRow('Ort',   f.div.place, '', divSrc);
    html += `</div>`;
  }
  if (f.divf?.date || f.divf?.place || f.divf?.seen) {
    html += `<div class="section fade-up"><div class="section-title">Scheidungsantrag</div>`;
    const divfSrc = f.divf.sources?.length ? f.divf.sources : null;
    if (f.divf.date)  html += factRow('Datum', f.divf.date,  '', divfSrc);
    if (f.divf.place) html += factRow('Ort',   f.divf.place, '', divfSrc);
    html += `</div>`;
  }

  html += `<div class="section fade-up">
    <div class="section-head">
      <div class="section-title">Mitglieder</div>
      <button class="section-add" data-action="showAddChildFlow" data-fid="${id}">+ Kind</button>
    </div>`;
  if (husb) html += relRow(husb, 'Ehemann / Vater', id);
  if (wife) html += relRow(wife, 'Ehefrau / Mutter', id);
  for (const cid of f.children) {
    const child = AppState.db.individuals[cid];
    if (!child) continue;
    const _fe = (child.famc || []).find(x => (typeof x === 'string' ? x : x.famId) === id);
    const _curPedi = (typeof _fe === 'object') ? (_toPedi(_fe.pedi || _fe.frel || '')) : '';
    const _pSel = v => v === _curPedi ? ' selected' : '';
    const _pediSelect = `<select
        data-action="stop" data-change="savePedi" data-fid="${id}" data-cid="${cid}"
        style="font-size:0.8rem;border:none;background:transparent;color:var(--text-dim);cursor:pointer;max-width:90px">
      <option value=""${_pSel('')}>– Verhältnis</option>
      <option value="birth"${_pSel('birth')}>leiblich</option>
      <option value="adopted"${_pSel('adopted')}>adoptiert</option>
      <option value="foster"${_pSel('foster')}>Pflegekind</option>
      <option value="sealing"${_pSel('sealing')}>Sealing</option>
    </select>`;
    const _sourIds = (typeof _fe === 'object') ? (_fe.sourIds || []) : [];
    const _addQBtn = `<button data-action="showChildRelDialog" data-fid="${id}" data-cid="${cid}"
        title="Quelle hinzufügen" style="background:none;border:1px dashed var(--border);
        border-radius:12px;padding:1px 7px;font-size:0.7rem;color:var(--text-muted);cursor:pointer">+ Q</button>`;
    const _sourWidget = _sourIds.length
      ? _sourIds.map(sid => {
          const s = AppState.db.sources[sid];
          const tooltip = s ? esc((s.title || s.abbr || sid).substring(0, 60)) : esc(sid);
          const num = (sid.match(/\d+/) || [sid])[0];
          return `<span class="src-badge" data-action="showChildRelDialog" data-fid="${id}" data-cid="${cid}" data-sid="${sid}" title="${tooltip}">§${num}</span>`;
        }).join('') + _addQBtn
      : _addQBtn;
    const sc = child.sex === 'M' ? 'm' : child.sex === 'F' ? 'f' : '';
    const ic = child.sex === 'M' ? '♂' : child.sex === 'F' ? '♀' : '◇';
    html += `<div class="rel-row" data-action="showDetail" data-pid="${child.id}">
      <div class="rel-avatar ${sc}">${ic}</div>
      <div class="rel-info">
        <div class="rel-name">${esc(child.name || child.id)}</div>
        <div class="rel-role" style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">Kind${_pediSelect}${_sourWidget}</div>
      </div>
      <button class="unlink-btn" data-action="unlinkMember" data-fid="${id}" data-pid="${child.id}"
        title="Verbindung trennen">×</button>
      <span class="p-arrow">›</span>
    </div>`;
  }
  html += `</div>`;

  if (f.noteText) {
    html += `<div class="section fade-up"><div class="section-title">Notizen</div>
      <div style="font-size:0.88rem;color:var(--text-dim);line-height:1.6;white-space:pre-wrap">${esc(f.noteText)}</div>
    </div>`;
  }

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
      html += `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border-color);cursor:pointer"
        data-action="openMediaPhoto" data-media-file="${esc(m.file || '')}" data-hero="det-fam-photo-${id}" data-avatar="det-fam-avatar-${id}">
        <div id="media-thumb-fam-${id}-${i}" style="flex-shrink:0;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem;background:var(--bg-card);border-radius:6px;border:1px solid var(--border-color)">${_icon}</div>
        <div style="flex:1;min-width:0">
          <div style="word-break:break-all;font-size:0.88rem;font-weight:500">${esc(display)}</div>
          ${sub ? `<div style="color:var(--text-muted);font-size:0.78rem;word-break:break-all">${esc(sub)}</div>` : ''}
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
      html += `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border-color);cursor:pointer"
        data-action="openMediaPhoto" data-media-file="${esc(m.file || '')}" data-hero="det-fam-photo-${id}" data-avatar="det-fam-avatar-${id}">
        <div id="media-thumb-fam-media-${id}-${i}" style="flex-shrink:0;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem;background:var(--bg-card);border-radius:6px;border:1px solid var(--border-color)">${_icon}</div>
        <div style="flex:1;min-width:0">
          <div style="word-break:break-all;font-size:0.88rem;font-weight:500">${esc(display)}</div>
          ${sub ? `<div style="color:var(--text-muted);font-size:0.78rem;word-break:break-all">${esc(sub)}</div>` : ''}
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
      html += `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border-color)">
        <div style="flex-shrink:0;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem;background:var(--bg-card);border-radius:6px;border:1px solid var(--border-color)">${_icon2}</div>
        <div style="flex:1;min-width:0">
          <div style="word-break:break-all;font-size:0.88rem;font-weight:500">${esc(label)}</div>
          ${sub ? `<div style="color:var(--text-muted);font-size:0.78rem;word-break:break-all">${esc(sub)}</div>` : ''}
          <div style="color:var(--text-muted);font-size:0.78rem">Verweis</div>
        </div>
      </div>`;
    }
    if (!marrObjeEntries.length && !famMedia.length && !famPtObje.length) html += `<div style="color:var(--text-muted);font-style:italic;font-size:0.85rem;padding:4px 0">Keine Medien eingetragen</div>`;
    html += `</div>`;
  }

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
      el.style.display = ''; el.innerHTML = '';
      const img = document.createElement('img');
      img.src = src; img.alt = 'Foto';
      img.style.cssText = 'width:80px;height:96px;object-fit:cover;border-radius:8px;display:block;flex-shrink:0;cursor:pointer';
      img.onclick = () => showLightbox(img.src, null, 'det-fam-photo-' + id, 'det-fam-avatar-' + id, null);
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
  const sourIds  = (fe && typeof fe === 'object') ? (fe.sourIds  || []) : [];
  const sourPages = (fe && typeof fe === 'object') ? (fe.sourPages || {}) : {};
  const sourQUAY  = (fe && typeof fe === 'object') ? (fe.sourQUAY  || {}) : {};
  initSrcWidget('cr', sourIds, sourPages, sourQUAY);
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
  fe.sourIds   = [...(srcWidgetState['cr']?.ids || [])];
  fe.sourPages = { ...(srcWidgetState['cr']?.pages || {}) };
  fe.sourQUAY  = { ...(srcWidgetState['cr']?.quay  || {}) };
  markChanged();
  closeModal('modalChildRel');
  showFamilyDetail(famId);
}
