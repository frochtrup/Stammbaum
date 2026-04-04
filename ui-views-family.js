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
    html += `<div class="person-row" data-fid="${f.id}" onclick="showFamilyDetail(this.dataset.fid)">
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
    if (f.engag.date)  html += factRow('Datum', f.engag.date);
    if (f.engag.place) html += factRow('Ort',   f.engag.place);
    html += `</div>`;
  }

  html += `<div class="section fade-up">
    <div class="section-head">
      <div class="section-title">Mitglieder</div>
      <button class="section-add" data-fid="${id}" onclick="showAddChildFlow(this.dataset.fid)">+ Kind</button>
    </div>`;
  if (husb) html += relRow(husb, 'Ehemann / Vater', id);
  if (wife) html += relRow(wife, 'Ehefrau / Mutter', id);
  for (const cid of f.children) {
    const child = AppState.db.individuals[cid];
    if (child) html += relRow(child, 'Kind', id);
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
        <button class="section-add" onclick="openAddMediaDialog('family','${id}')">+ Hinzufügen</button>
      </div>`;
    for (let i = 0; i < marrObjeEntries.length; i++) {
      const m = marrObjeEntries[i];
      const display = m.title || m.file || '–';
      const sub = m.title && m.file ? m.file : '';
      const idbKey  = 'photo_fam_' + id + '_' + i;
      const heroKey = 'photo_fam_' + id;
      const _ext = (m.file || '').split('.').pop().toLowerCase();
      const _isImg = ['jpg','jpeg','png','gif','bmp','webp','tif','tiff'].includes(_ext);
      const _icon = _isImg ? '🖼' : _ext === 'pdf' ? '📄' : '📎';
      html += `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border-color);cursor:pointer"
        onclick="openMediaPhoto('${idbKey}','${heroKey}','det-fam-photo-${id}','det-fam-avatar-${id}')">
        <div id="media-thumb-fam-${id}-${i}" style="flex-shrink:0;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem;background:var(--bg-card);border-radius:6px;border:1px solid var(--border-color)">${_icon}</div>
        <div style="flex:1;min-width:0">
          <div style="word-break:break-all;font-size:0.88rem;font-weight:500">${esc(display)}</div>
          ${sub ? `<div style="color:var(--text-muted);font-size:0.78rem;word-break:break-all">${esc(sub)}</div>` : ''}
        </div>
        <button class="edit-media-btn" onclick="event.stopPropagation();openEditMediaDialog('family','${id}',${i})" title="Bearbeiten">✎</button>
      </div>`;
    }
    for (let i = 0; i < famMedia.length; i++) {
      const m = famMedia[i];
      const display = m.title || m.file || '–';
      const sub = m.title && m.file ? m.file : '';
      const idbKey  = 'photo_fam_media_' + id + '_' + i;
      const heroKey = 'photo_fam_' + id;
      const _ext = (m.file || '').split('.').pop().toLowerCase();
      const _isImg = ['jpg','jpeg','png','gif','bmp','webp','tif','tiff'].includes(_ext);
      const _icon = _isImg ? '🖼' : _ext === 'pdf' ? '📄' : '📎';
      html += `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border-color);cursor:pointer"
        onclick="openMediaPhoto('${idbKey}','${heroKey}','det-fam-photo-${id}','det-fam-avatar-${id}')">
        <div id="media-thumb-fam-media-${id}-${i}" style="flex-shrink:0;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem;background:var(--bg-card);border-radius:6px;border:1px solid var(--border-color)">${_icon}</div>
        <div style="flex:1;min-width:0">
          <div style="word-break:break-all;font-size:0.88rem;font-weight:500">${esc(display)}</div>
          ${sub ? `<div style="color:var(--text-muted);font-size:0.78rem;word-break:break-all">${esc(sub)}</div>` : ''}
        </div>
        <button class="edit-media-btn" onclick="event.stopPropagation();openEditMediaDialog('family_media','${id}',${i})" title="Bearbeiten">✎</button>
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

  // Foto async — bevorzugtes Medium (prim) oder erstes; Pfad ist Wahrheitsquelle
  (async () => {
    const _marrMedia = f.marr?.media || [];
    const _famMedia  = f.media || [];
    const _primMarrIdx = Math.max(0, _marrMedia.findIndex(m => m.prim && m.prim !== ''));
    const _idbKey    = 'photo_fam_' + id + '_' + _primMarrIdx;
    const _filePath  = _marrMedia[_primMarrIdx]?.file;
    let src = await idbGet(_idbKey).catch(() => null)
           || (_primMarrIdx === 0 ? await idbGet('photo_fam_' + id).catch(() => null) : null)
           || await _odGetMediaUrlByPath(_filePath).catch(() => null)
           || await _odGetPhotoUrl(_idbKey).catch(() => null); // Legacy
    if (!src && _famMedia.length > 0) {
      const _primFamIdx  = Math.max(0, _famMedia.findIndex(m => m.prim && m.prim !== ''));
      const _famFilePath = _famMedia[_primFamIdx]?.file;
      src = await idbGet('photo_fam_media_' + id + '_' + _primFamIdx).catch(() => null)
         || await _odGetMediaUrlByPath(_famFilePath).catch(() => null)
         || await _odGetPhotoUrl('photo_fam_media_' + id + '_' + _primFamIdx).catch(() => null); // Legacy
    }
    if (!src) return;
    const el = document.getElementById('det-fam-photo-' + id);
    if (el) {
      el.style.display = ''; el.innerHTML = '';
      const img = document.createElement('img');
      img.src = src; img.alt = 'Foto';
      img.style.cssText = 'width:80px;height:96px;object-fit:cover;border-radius:8px;display:block;flex-shrink:0;cursor:pointer';
      img.onclick = () => showLightbox(img.src);
      el.appendChild(img);
      const av = document.getElementById('det-fam-avatar-' + id);
      if (av) av.style.display = 'none';
    }
    if (!src.startsWith('blob:') && _primMarrIdx === 0) idbGet('photo_fam_' + id + '_0').then(v => { if (!v) idbPut('photo_fam_' + id + '_0', src).catch(() => {}); }).catch(() => {});
  })();
  // Media-Thumbnails async laden — Pfad als primäre Quelle
  for (let _mi = 0; _mi < marrObjeEntries.length; _mi++) {
    _asyncLoadMediaThumb('media-thumb-fam-' + id + '-' + _mi, 'photo_fam_' + id + '_' + _mi, marrObjeEntries[_mi]?.file);
  }
  for (let _mi = 0; _mi < famMedia.length; _mi++) {
    _asyncLoadMediaThumb('media-thumb-fam-media-' + id + '-' + _mi, 'photo_fam_media_' + id + '_' + _mi, famMedia[_mi]?.file);
  }
}
