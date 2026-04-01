// ─── Medien hinzufügen / löschen ─────────────────────────────────────────
let _addMediaType     = null; // 'person' | 'family' | 'source'
let _addMediaId       = null;
let _addMediaOdFileId = null;
let _addMediaCamB64   = null; // base64 aus Kamera-Aufnahme

// ─── Medium bearbeiten ────────────────────────────────────────────────────────
let _editMediaType     = null; // 'person' | 'family' | 'family_media' | 'source'
let _editMediaId       = null;
let _editMediaIdx      = null;
let _editMediaOdFileId = null;

function openEditMediaDialog(type, entityId, idx) {
  _editMediaType     = type;
  _editMediaId       = entityId;
  _editMediaIdx      = idx;
  _editMediaOdFileId = null;

  let m;
  if      (type === 'person')       m = getPerson(entityId)?.media?.[idx];
  else if (type === 'family')       m = _getFamMarrObjeEntries(getFamily(entityId))[idx];
  else if (type === 'family_media') m = getFamily(entityId)?.media?.[idx];
  else if (type === 'source')       m = getSource(entityId)?.media?.[idx];
  if (!m) return;

  document.getElementById('em-title').value = m.title || '';
  document.getElementById('em-file').value  = m.file  || '';
  document.getElementById('em-od-row').style.display = _odIsConnected() ? '' : 'none';

  const ext = (m.file || '').split('.').pop().toLowerCase();
  const isImg = ['jpg','jpeg','png','gif','bmp','webp','tif','tiff'].includes(ext);
  const icon = isImg ? '🖼' : ext === 'pdf' ? '📄' : '📎';
  const thumbBar = document.getElementById('em-thumb-bar');
  const preview  = document.getElementById('em-preview');
  thumbBar.textContent = icon;
  preview.innerHTML = `<div style="font-size:3rem">${icon}</div>`;

  openModal('modalEditMedia');

  // Vorschau laden — für source: bereits geladenes Thumbnail aus DOM wiederverwenden
  if (type === 'source') {
    const existingThumb = document.getElementById('src-media-thumb-' + idx);
    const existingImg = existingThumb?.querySelector('img');
    if (existingImg?.src) {
      _setEditMediaPreview(existingImg.src);
    } else {
      _odGetSourceFileUrl(entityId, idx).then(url => {
        if (!url) return;
        if (isImg) { _setEditMediaPreview(url); }
        else { if (preview) preview.innerHTML = `<a href="${url}" target="_blank" style="font-size:3rem;text-decoration:none">${icon}</a>`; }
      }).catch(() => {});
    }
  } else {
    const idbKey = type === 'family'
      ? 'photo_fam_' + entityId + '_' + idx
      : type === 'family_media'
      ? 'photo_fam_media_' + entityId + '_' + idx
      : 'photo_' + entityId + '_' + idx;
    idbGet(idbKey).then(src => {
      if (src && isImg) { _setEditMediaPreview(src); return; }
      _odGetPhotoUrl(idbKey).then(url => { if (url && isImg) _setEditMediaPreview(url); }).catch(() => {});
    }).catch(() => {});
  }
}

function _setEditMediaPreview(src) {
  const preview  = document.getElementById('em-preview');
  const thumbBar = document.getElementById('em-thumb-bar');
  if (!preview) return;
  preview.innerHTML = '';
  const img = document.createElement('img');
  img.src = src;
  img.style.cssText = 'max-width:100%;max-height:200px;object-fit:contain;border-radius:8px;cursor:pointer';
  img.onclick = () => showLightbox(src);
  preview.appendChild(img);
  if (thumbBar) {
    thumbBar.innerHTML = '';
    const tImg = document.createElement('img');
    tImg.src = src;
    tImg.style.cssText = 'width:36px;height:36px;object-fit:cover;border-radius:5px;display:block';
    thumbBar.appendChild(tImg);
  }
}

function _getFamMarrObjeEntries(f) {
  // f.marr.media[] enthält inline OBJE-Blöcke unter MARR; Feld ist titl (nicht title)
  return (f?.marr?.media || []).map(m => ({ file: m.file || '', title: m.titl || '', form: m.form || '' }));
}

function _updateFamMarrObjeAt(f, targetIdx, { title, file, form }) {
  const media = f.marr?.media;
  if (!media || targetIdx >= media.length) return;
  media[targetIdx] = { ...media[targetIdx], titl: title, file, form };
}

async function openSourceMediaView(srcId, idx) {
  const s = getSource(srcId);
  if (!s) return;
  const m = s.media?.[idx];
  if (!m) return;
  const ext = (m.file || '').split('.').pop().toLowerCase();
  const isImg = ['jpg','jpeg','png','gif','bmp','webp','tif','tiff'].includes(ext);
  const url = await _odGetSourceFileUrl(srcId, idx).catch(() => null);
  if (!url) { showToast('Kein Vorschau verfügbar'); return; }
  if (isImg) showLightbox(url);
  else window.open(url, '_blank');
}

function confirmEditMedia() {
  const title = document.getElementById('em-title').value.trim();
  const file  = document.getElementById('em-file').value.trim();
  if (!title && !file) { showToast('Bitte Titel oder Dateiname eingeben'); return; }
  const form = file ? (file.match(/\.(jpe?g)$/i) ? 'JPEG' : file.match(/\.png$/i) ? 'PNG' : 'FILE') : 'FILE';

  if (_editMediaType === 'person') {
    const p = getPerson(_editMediaId);
    if (!p?.media) return;
    p.media[_editMediaIdx] = { ...p.media[_editMediaIdx], form, file, title };
    if (_editMediaOdFileId) _addMediaToFilemap('persons', _editMediaId, { fileId: _editMediaOdFileId, filename: file, prim: _editMediaIdx === 0 });
    AppState.changed = true;
    closeModal('modalEditMedia');
    showDetail(_editMediaId, false);
  } else if (_editMediaType === 'family') {
    const f = getFamily(_editMediaId);
    if (!f) return;
    _updateFamMarrObjeAt(f, _editMediaIdx, { form, file, title });
    if (_editMediaOdFileId) _addMediaToFilemap('families', _editMediaId, { fileId: _editMediaOdFileId, filename: file, prim: _editMediaIdx === 0 });
    AppState.changed = true;
    closeModal('modalEditMedia');
    showFamilyDetail(_editMediaId, false);
  } else if (_editMediaType === 'family_media') {
    const f = getFamily(_editMediaId);
    if (!f?.media) return;
    f.media[_editMediaIdx] = { ...f.media[_editMediaIdx], form, file, title };
    AppState.changed = true;
    closeModal('modalEditMedia');
    showFamilyDetail(_editMediaId, false);
  } else if (_editMediaType === 'source') {
    const s = getSource(_editMediaId);
    if (!s?.media) return;
    s.media[_editMediaIdx] = { ...s.media[_editMediaIdx], form, file, title };
    if (_editMediaOdFileId) _addMediaToFilemap('sources', _editMediaId, { fileId: _editMediaOdFileId, filename: file, prim: _editMediaIdx === 0 });
    AppState.changed = true;
    closeModal('modalEditMedia');
    showSourceDetail(_editMediaId, false);
  }
}

function confirmDeleteMedia() {
  closeModal('modalEditMedia');
  if      (_editMediaType === 'person')       deletePersonMedia(_editMediaId, _editMediaIdx);
  else if (_editMediaType === 'family')       deleteFamilyMarrMedia(_editMediaId, _editMediaIdx);
  else if (_editMediaType === 'family_media') deleteFamilyMedia(_editMediaId, _editMediaIdx);
  else if (_editMediaType === 'source')       deleteSourceMedia(_editMediaId, _editMediaIdx);
}

async function _asyncLoadMediaThumb(thumbId, idbKey) {
  const src = await idbGet(idbKey).catch(() => null)
           || await _odGetPhotoUrl(idbKey).catch(() => null);
  if (!src) return;
  const el = document.getElementById(thumbId);
  if (!el) return;
  el.innerHTML = '';
  const img = document.createElement('img');
  img.src = src;
  img.style.cssText = 'width:44px;height:44px;object-fit:cover;border-radius:6px;display:block';
  el.appendChild(img);
}


async function openAddMediaDialog(type, entityId) {
  _addMediaType     = type;
  _addMediaId       = entityId;
  _addMediaOdFileId = null;
  _addMediaCamB64   = null;
  document.getElementById('am-title').value = '';
  document.getElementById('am-cam-preview').style.display = 'none';
  document.getElementById('am-cam-input').setAttribute('capture', 'environment');
  document.getElementById('am-od-row').style.display = _odIsConnected() ? '' : 'none';
  // Basispfad vorbelegen
  const baseKey = (type === 'source') ? 'cfg_doc_base' : 'cfg_photo_base';
  const basePath = await idbGet(baseKey).catch(() => null) || '';
  document.getElementById('am-file').value = basePath;
  openModal('modalAddMedia');
}

async function confirmAddMedia() {
  const title = document.getElementById('am-title').value.trim();
  const file  = document.getElementById('am-file').value.trim();
  if (!title && !file) { showToast('Bitte Titel oder Dateiname eingeben'); return; }
  const form = file ? (file.match(/\.(jpe?g)$/i) ? 'JPEG' : file.match(/\.png$/i) ? 'PNG' : 'FILE') : 'FILE';
  const entry = { form, file, title };

  if (_addMediaType === 'person') {
    const p = getPerson(_addMediaId);
    if (!p) return;
    if (!p.media) p.media = [];
    const idx = p.media.length;
    p.media.push(entry);
    if (_addMediaOdFileId) _addMediaToFilemap('persons', _addMediaId, { fileId: _addMediaOdFileId, filename: file, prim: idx === 0 });
    if (_addMediaCamB64) { await idbPut('photo_' + _addMediaId + '_' + idx, _addMediaCamB64).catch(() => {}); _addMediaCamB64 = null; }
    AppState.changed = true;
    closeModal('modalAddMedia');
    showDetail(_addMediaId, false);
  } else if (_addMediaType === 'family') {
    const f = getFamily(_addMediaId);
    if (!f) return;
    if (!f.marr.media) f.marr.media = [];
    const idx = f.marr.media.length;
    f.marr.media.push({ file, titl: title, form, note:'', date:'', scbk:'', prim:'', _extra:[] });
    if (_addMediaOdFileId) _addMediaToFilemap('families', _addMediaId, { fileId: _addMediaOdFileId, filename: file, prim: idx === 0 });
    if (_addMediaCamB64) { await idbPut('photo_fam_' + _addMediaId + '_' + idx, _addMediaCamB64).catch(() => {}); _addMediaCamB64 = null; }
    AppState.changed = true;
    closeModal('modalAddMedia');
    showFamilyDetail(_addMediaId, false);
  } else if (_addMediaType === 'source') {
    const s = getSource(_addMediaId);
    if (!s) return;
    if (!s.media) s.media = [];
    const _smIdx = s.media.length;
    s.media.push(entry);
    if (_addMediaOdFileId) _addMediaToFilemap('sources', _addMediaId, { fileId: _addMediaOdFileId, filename: file, prim: _smIdx === 0 });
    if (_addMediaCamB64) { await idbPut('photo_src_' + _addMediaId + '_' + _smIdx, _addMediaCamB64).catch(() => {}); _addMediaCamB64 = null; }
    AppState.changed = true;
    closeModal('modalAddMedia');
    showSourceDetail(_addMediaId, false);
  }
}

function _countFamMarrObje(f) {
  return (f.marr?.media || []).length;
}


async function deletePersonMedia(personId, idx) {
  const p = getPerson(personId);
  if (!p?.media) return;
  const oldLen = p.media.length;
  p.media.splice(idx, 1);
  await _removeMediaFromFilemap('persons', personId, idx);
  await _clearIdbPhotoKeys('photo_' + personId, oldLen);
  AppState.changed = true;
  showDetail(personId, false);
}

async function deleteFamilyMarrMedia(famId, idx) {
  const f = getFamily(famId);
  if (!f?.marr?.media) return;
  const oldCount = f.marr.media.length;
  f.marr.media.splice(idx, 1);
  await _removeMediaFromFilemap('families', famId, idx);
  await _clearIdbPhotoKeys('photo_fam_' + famId, oldCount);
  AppState.changed = true;
  showFamilyDetail(famId, false);
}

async function deleteFamilyMedia(famId, idx) {
  const f = getFamily(famId);
  if (!f?.media) return;
  f.media.splice(idx, 1);
  AppState.changed = true;
  showFamilyDetail(famId, false);
}

async function deleteSourceMedia(srcId, idx) {
  const s = getSource(srcId);
  if (!s?.media) return;
  idbDel('photo_src_' + srcId + '_' + idx).catch(() => {});
  s.media.splice(idx, 1);
  await _removeMediaFromFilemap('sources', srcId, idx);
  AppState.changed = true;
  showSourceDetail(srcId, false);
}

function showMediaBrowser() {
  const allSrcs = Object.values(AppState.db.sources || {});
  const items = []; // { srcId, srcTitle, idx, m }
  for (const s of allSrcs) {
    for (let i = 0; i < (s.media || []).length; i++) {
      const m = s.media[i];
      if (!m.file && !m.title) continue;
      items.push({ srcId: s.id, srcTitle: s.abbr || s.title || s.id, idx: i, m });
    }
  }

  let html = '';
  if (!items.length) {
    html = '<div style="color:var(--text-muted);font-style:italic;padding:24px 0;text-align:center;font-size:0.88rem">Keine Medien gefunden</div>';
  } else {
    html += `<div style="font-size:0.78rem;color:var(--text-muted);padding:0 0 10px 0">${items.length} Medium${items.length !== 1 ? 'en' : ''}</div>`;
    // Gruppiert nach Quelle
    const bySource = {};
    for (const item of items) {
      if (!bySource[item.srcId]) bySource[item.srcId] = [];
      bySource[item.srcId].push(item);
    }
    for (const srcId of Object.keys(bySource)) {
      const group = bySource[srcId];
      html += `<div style="font-size:0.8rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;padding:10px 0 4px 0;border-top:1px solid var(--border)">${esc(group[0].srcTitle)}</div>`;
      for (const { srcId: sid, idx, m } of group) {
        const _ext = (m.file || '').split('.').pop().toLowerCase();
        const _isImg = ['jpg','jpeg','png','gif','bmp','webp','tif','tiff'].includes(_ext);
        const _icon = _isImg ? '🖼' : _ext === 'pdf' ? '📄' : '📎';
        const thumbId = 'mb-thumb-' + sid + '-' + idx;
        html += `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer"
          onclick="closeModal('modalMediaBrowser');showSourceDetail('${sid}')">
          <div id="${thumbId}" style="flex-shrink:0;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;background:var(--bg-card);border-radius:6px;border:1px solid var(--border)">${_icon}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:0.88rem;font-weight:500;word-break:break-all">${esc(m.title || m.file)}</div>
            ${m.title && m.file ? `<div style="font-size:0.78rem;color:var(--text-muted);word-break:break-all">${esc(m.file)}</div>` : ''}
          </div>
          <span class="p-arrow">›</span>
        </div>`;
      }
    }
  }

  document.getElementById('media-browser-content').innerHTML = html;
  openModal('modalMediaBrowser');

  // Async Thumbnails
  for (const { srcId, idx, m } of items) {
    const _ext = (m.file || '').split('.').pop().toLowerCase();
    if (!['jpg','jpeg','png','gif','bmp','webp','tif','tiff'].includes(_ext)) continue;
    const thumbId = 'mb-thumb-' + srcId + '-' + idx;
    const _ci = idx; const _sid = srcId;
    idbGet('photo_src_' + _sid + '_' + _ci).then(b64 => {
      if (b64) { _asyncLoadMediaThumb(thumbId, 'photo_src_' + _sid + '_' + _ci); return; }
      _odGetSourceFileUrl(_sid, _ci).then(url => {
        if (!url) return;
        const el = document.getElementById(thumbId);
        if (!el) return;
        el.innerHTML = '';
        const img = document.createElement('img');
        img.src = url;
        img.style.cssText = 'width:44px;height:44px;object-fit:cover;border-radius:6px;display:block';
        el.appendChild(img);
      }).catch(() => {});
    }).catch(() => {});
  }
}

function _removeFamMarrObjeAt(f, targetIdx) {
  // Legacy: war für _extra-basierte Speicherung; jetzt über f.marr.media.splice()
  if (f?.marr?.media) f.marr.media.splice(targetIdx, 1);
}

