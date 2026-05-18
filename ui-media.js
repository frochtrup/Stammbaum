// ─────────────────────────────────────
//  FOTO RESIZE HELPERS
// ─────────────────────────────────────
function resizeImageToBase64(file, maxPx = 800, quality = 0.82) {
  const _drawAndResolve = (source, resolve, reject) => {
    let w = source.width || source.naturalWidth;
    let h = source.height || source.naturalHeight;
    if (!w || !h) { reject(new Error('Bildgrösse unbekannt')); return; }
    if (w > maxPx || h > maxPx) {
      if (w >= h) { h = Math.round(h * maxPx / w); w = maxPx; }
      else        { w = Math.round(w * maxPx / h); h = maxPx; }
    }
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    cv.getContext('2d').drawImage(source, 0, 0, w, h);
    if (source.close) source.close(); // ImageBitmap cleanup
    const b64 = cv.toDataURL('image/jpeg', quality);
    if (b64.length > 400000) showToast('Foto ist gross (' + Math.round(b64.length / 1024) + ' KB) – ggf. Qualität reduzieren');
    resolve(b64);
  };

  return new Promise((resolve, reject) => {
    if (typeof createImageBitmap === 'function') {
      createImageBitmap(file).then(bmp => {
        _drawAndResolve(bmp, resolve, reject);
      }).catch(() => {
        _tryViaImg(file, maxPx, quality, resolve, reject, _drawAndResolve);
      });
    } else {
      _tryViaImg(file, maxPx, quality, resolve, reject, _drawAndResolve);
    }
  });
}

function _tryViaImg(file, maxPx, quality, resolve, reject, _drawAndResolve) {
  const reader = new FileReader();
  reader.onerror = reject;
  reader.onload = e => {
    const img = new Image();
    img.onerror = reject;
    img.onload = () => _drawAndResolve(img, resolve, reject);
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ─── Medien hinzufügen / löschen ─────────────────────────────────────────
let _addMediaType            = null; // 'person' | 'family' | 'source'
let _addMediaId              = null;
let _addMediaOdFileId        = null;
let _addMediaCamB64          = null; // base64 aus Kamera-Aufnahme
let _addMediaDefaultFolderPath = '';  // relativer OneDrive-Ordner-Pfad (für Kamera-Dateinamen)

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

  document.getElementById('em-title').value = m.title || m.titl || '';
  document.getElementById('em-file').value  = m.file  || '';
  document.getElementById('em-note').value  = m.note  || '';
  document.getElementById('em-date').value  = m.date  || '';
  document.getElementById('em-prim-check').checked = !!(m.prim && m.prim !== '');
  document.getElementById('em-od-row').style.display = _odIsConnected() ? '' : 'none';

  const ext = (m.file || '').split('.').pop().toLowerCase();
  const isImg = ['jpg','jpeg','png','gif','bmp','webp','tif','tiff'].includes(ext);
  const icon = isImg ? '🖼' : ext === 'pdf' ? '📄' : '📎';
  const thumbBar = document.getElementById('em-thumb-bar');
  const preview  = document.getElementById('em-preview');
  thumbBar.textContent = icon;
  preview.innerHTML = `<div class="fs-huge">${icon}</div>`;

  // Kontext-Zeile: referenzierendes Objekt + Navigations-Button
  const refInfo = document.getElementById('em-ref-info');
  if (refInfo) {
    let label = '', icon = '';
    if (type === 'person') {
      const p = getPerson(entityId);
      label = p?.name || entityId; icon = '👤';
    } else if (type === 'family' || type === 'family_media') {
      const f = getFamily(entityId);
      const husb = f?.husb ? getPerson(f.husb) : null;
      const wife = f?.wife ? getPerson(f.wife) : null;
      label = [husb?.name, wife?.name].filter(Boolean).join(' & ') || entityId;
      icon = '⚭';
    } else if (type === 'source') {
      const s = getSource(entityId);
      label = s?.abbr || s?.title || entityId; icon = '📖';
    }
    refInfo.innerHTML = label
      ? `<span class="em-ref-label">${icon} ${esc(label)}</span>
         <button class="btn btn-outline-sm" data-action="mediaEditGoTo"
           data-type="${esc(type)}" data-id="${esc(entityId)}" title="Zum Eintrag navigieren">→</button>`
      : '';
  }

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
        else { if (preview) preview.innerHTML = `<a href="${/^https?:\/\//i.test(url) ? url : '#'}" target="_blank" class="fs-huge no-underline">${icon}</a>`; }
      }).catch(() => {});
    }
  } else {
    if (isImg) {
      _odGetMediaUrlByPath(m.file).then(url => {
        if (url) { _setEditMediaPreview(url); return; }
        if (m.file) idbGet('img:' + m.file).then(src => { if (src) _setEditMediaPreview(src); }).catch(() => {});
      }).catch(() => {});
    }
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
  img.addEventListener('click', () => showLightbox(src));
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
  return (f?.marr?.media || []).map(m => ({ file: m.file || '', title: m.titl || '', form: m.form || '', note: m.note || '', date: m.date || '', prim: m.prim || '' }));
}

function _updateFamMarrObjeAt(f, targetIdx, { title, file, form, note, date }) {
  const media = f.marr?.media;
  if (!media || targetIdx >= media.length) return;
  media[targetIdx] = { ...media[targetIdx], titl: title, file, form, note, date };
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

// Hilfsfunktion: Medium-Array normalisieren — prim nur auf idx, dieses nach vorne schieben
// Gibt true zurück wenn verschoben wurde (IDB-Cache muss invalidiert werden)
function _applyPrimAndReorder(arr, idx, setPrim) {
  if (!arr || idx < 0 || idx >= arr.length) return false;
  // prim auf allen Einträgen aktualisieren
  arr.forEach((m, i) => { m.prim = (setPrim && i === idx) ? 'Y' : ''; });
  if (!setPrim || idx === 0) return false; // kein Verschieben nötig
  // Medium an erste Stelle verschieben
  const [item] = arr.splice(idx, 1);
  arr.unshift(item);
  return true; // verschoben → IDB-Cache ist veraltet
}

// Session-Cache für geänderte Entity leeren (pfad-basierte Keys bleiben korrekt)
function _invalidateThumbCache(entityPrefix) {
  if (typeof _odPhotoCache !== 'undefined') {
    Object.keys(_odPhotoCache).filter(k => k.startsWith('path:')).forEach(k => delete _odPhotoCache[k]);
  }
}

function confirmEditMedia() {
  const title   = document.getElementById('em-title').value.trim();
  const file    = document.getElementById('em-file').value.trim();
  const note    = document.getElementById('em-note').value.trim();
  const date    = document.getElementById('em-date').value.trim();
  const setPrim = document.getElementById('em-prim-check').checked;
  if (!title && !file) { showToast('Bitte Titel oder Dateiname eingeben'); return; }
  const form = file ? (file.match(/\.(jpe?g)$/i) ? 'JPEG' : file.match(/\.png$/i) ? 'PNG' : 'FILE') : 'FILE';

  if (_editMediaType === 'person') {
    const p = getPerson(_editMediaId);
    if (!p?.media) return;
    p.media[_editMediaIdx] = { ...p.media[_editMediaIdx], form, file, title, note, date };
    const moved = _applyPrimAndReorder(p.media, _editMediaIdx, setPrim);
    if (moved) _invalidateThumbCache('photo_' + _editMediaId);
    if (_editMediaOdFileId) _addMediaToFilemap('persons', _editMediaId, { fileId: _editMediaOdFileId, filename: file, prim: _editMediaIdx === 0 }, _editMediaIdx);
    AppState.changed = true;
    closeModal('modalEditMedia');
    showDetail(_editMediaId, false);
  } else if (_editMediaType === 'family') {
    const f = getFamily(_editMediaId);
    if (!f) return;
    _updateFamMarrObjeAt(f, _editMediaIdx, { form, file, title, note, date });
    const moved = _applyPrimAndReorder(f.marr?.media, _editMediaIdx, setPrim);
    if (moved) _invalidateThumbCache('photo_fam_' + _editMediaId);
    if (_editMediaOdFileId) _addMediaToFilemap('families', _editMediaId, { fileId: _editMediaOdFileId, filename: file, prim: _editMediaIdx === 0 }, _editMediaIdx);
    AppState.changed = true;
    closeModal('modalEditMedia');
    showFamilyDetail(_editMediaId, false);
  } else if (_editMediaType === 'family_media') {
    const f = getFamily(_editMediaId);
    if (!f?.media) return;
    f.media[_editMediaIdx] = { ...f.media[_editMediaIdx], form, file, title, note, date };
    const moved = _applyPrimAndReorder(f.media, _editMediaIdx, setPrim);
    if (moved) _invalidateThumbCache('photo_fam_media_' + _editMediaId);
    AppState.changed = true;
    closeModal('modalEditMedia');
    showFamilyDetail(_editMediaId, false);
  } else if (_editMediaType === 'source') {
    const s = getSource(_editMediaId);
    if (!s?.media) return;
    s.media[_editMediaIdx] = { ...s.media[_editMediaIdx], form, file, title, note, date };
    const moved = _applyPrimAndReorder(s.media, _editMediaIdx, setPrim);
    if (moved) _invalidateThumbCache('photo_src_' + _editMediaId);
    if (_editMediaOdFileId) _addMediaToFilemap('sources', _editMediaId, { fileId: _editMediaOdFileId, filename: file, prim: _editMediaIdx === 0 }, _editMediaIdx);
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

async function _asyncLoadMediaThumb(thumbId, filePath) {
  if (!filePath) return;
  const el = document.getElementById(thumbId);
  if (!el) return;
  const originalContent = el.innerHTML;
  const src = await _odGetMediaUrlByPath(filePath).catch(() => null)
           || await idbGet('img:' + filePath).catch(() => null);
  if (!src) return;
  const img = document.createElement('img');
  img.src = src;
  img.style.cssText = 'width:44px;height:44px;object-fit:cover;border-radius:6px;display:block';
  img.onerror = () => { el.innerHTML = originalContent; };
  el.innerHTML = '';
  el.appendChild(img);
}


function _onCamCapture(b64) {
  const ts   = new Date();
  const name = 'foto_' + ts.getFullYear()
    + String(ts.getMonth() + 1).padStart(2, '0')
    + String(ts.getDate()).padStart(2, '0') + '_'
    + String(ts.getHours()).padStart(2, '0')
    + String(ts.getMinutes()).padStart(2, '0')
    + String(ts.getSeconds()).padStart(2, '0') + '.jpg';
  // Ordner-Pfad: _addMediaDefaultFolderPath (aus IDB) oder Verzeichnis-Anteil aus am-file
  const cur = document.getElementById('am-file').value;
  let base = _addMediaDefaultFolderPath;
  if (!base) {
    const sep = cur.lastIndexOf('/');
    base = sep >= 0 ? cur.substring(0, sep + 1) : '';
  } else if (!base.endsWith('/')) {
    base += '/';
  }
  document.getElementById('am-file').value = base + name;
  _addMediaCamB64 = b64;
  document.getElementById('am-cam-img').src = b64;
  document.getElementById('am-cam-preview').hidden = false;
}

async function openAddMediaDialog(type, entityId) {
  _addMediaType     = type;
  _addMediaId       = entityId;
  _addMediaOdFileId = null;
  _addMediaCamB64   = null;
  _addMediaDefaultFolderPath = '';
  document.getElementById('am-title').value = '';
  document.getElementById('am-cam-preview').hidden = true;
  document.getElementById('am-cam-input').setAttribute('capture', 'environment');
  document.getElementById('am-od-row').style.display = _odIsConnected() ? '' : 'none';
  document.getElementById('am-file').value = '';
  openModal('modalAddMedia'); // Modal sofort öffnen
  // Relativen Ordner-Pfad laden (relativ zu od_base_path)
  const isSourceType = (type === 'source');
  const folder = await idbGet(isSourceType ? 'od_docs_folder' : 'od_photo_folder').catch(() => null)
              || await idbGet(isSourceType ? 'od_doc_folder' : 'od_default_folder').catch(() => null); // legacy
  if (folder?.relPath !== undefined) {
    _addMediaDefaultFolderPath = folder.relPath;
  } else if (folder?.folderPath) {
    // Legacy: relativen Pfad aus altem Format berechnen
    const basePath = await idbGet('od_base_path').catch(() => null) || '';
    _addMediaDefaultFolderPath = basePath && folder.folderPath.startsWith(basePath + '/')
      ? folder.folderPath.slice(basePath.length + 1)
      : folder.folderPath;
  }
}

async function confirmAddMedia() {
  const title = document.getElementById('am-title').value.trim();
  let   file  = document.getElementById('am-file').value.trim();
  if (!title && !file) { showToast('Bitte Titel oder Dateiname eingeben'); return; }

  // Kamera-Foto nach OneDrive hochladen — Pfad aus Eingabefeld als Ziel
  if (_addMediaCamB64 && file && _odIsConnected()) {
    showToast('Lade Foto hoch…');
    const result = await _odUploadMediaFile(_addMediaCamB64, file).catch(() => null);
    if (result?.path) {
      file = result.path; // tatsächlicher Pfad laut API-Antwort
      document.getElementById('am-file').value = file;
    }
    // Lokaler IDB-Cache (wird später via idbKey gesetzt)
  }

  const form = file ? (file.match(/\.(jpe?g)$/i) ? 'JPEG' : file.match(/\.png$/i) ? 'PNG' : 'FILE') : 'FILE';
  const entry = { form, file, title };

  if (_addMediaType === 'person') {
    const p = getPerson(_addMediaId);
    if (!p) return;
    if (!p.media) p.media = [];
    const idx = p.media.length;
    p.media.push(entry);
    if (_addMediaOdFileId) _addMediaToFilemap('persons', _addMediaId, { fileId: _addMediaOdFileId, filename: file, prim: idx === 0 }, idx);
    if (_addMediaCamB64) { if (file) await idbPut('img:' + file, _addMediaCamB64).catch(() => {}); _addMediaCamB64 = null; }
    AppState.changed = true;
    closeModal('modalAddMedia');
    showDetail(_addMediaId, false);
  } else if (_addMediaType === 'family') {
    const f = getFamily(_addMediaId);
    if (!f) return;
    if (!f.marr.media) f.marr.media = [];
    const idx = f.marr.media.length;
    f.marr.media.push({ file, titl: title, form, note:'', date:'', scbk:'', prim:'', _extra:[] });
    if (_addMediaOdFileId) _addMediaToFilemap('families', _addMediaId, { fileId: _addMediaOdFileId, filename: file, prim: idx === 0 }, idx);
    if (_addMediaCamB64) { if (file) await idbPut('img:' + file, _addMediaCamB64).catch(() => {}); _addMediaCamB64 = null; }
    AppState.changed = true;
    closeModal('modalAddMedia');
    showFamilyDetail(_addMediaId, false);
  } else if (_addMediaType === 'source') {
    const s = getSource(_addMediaId);
    if (!s) return;
    if (!s.media) s.media = [];
    const _smIdx = s.media.length;
    s.media.push(entry);
    if (_addMediaOdFileId) _addMediaToFilemap('sources', _addMediaId, { fileId: _addMediaOdFileId, filename: file, prim: _smIdx === 0 }, _smIdx);
    if (_addMediaCamB64) { if (file) await idbPut('img:' + file, _addMediaCamB64).catch(() => {}); _addMediaCamB64 = null; }
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
  p.media.splice(idx, 1);
  await _removeMediaFromFilemap('persons', personId, idx);
  AppState.changed = true;
  showDetail(personId, false);
}

async function deleteFamilyMarrMedia(famId, idx) {
  const f = getFamily(famId);
  if (!f?.marr?.media) return;
  f.marr.media.splice(idx, 1);
  await _removeMediaFromFilemap('families', famId, idx);
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
  s.media.splice(idx, 1);
  await _removeMediaFromFilemap('sources', srcId, idx);
  AppState.changed = true;
  showSourceDetail(srcId, false);
}

function showMediaBrowser() {
  UIState._mediaCtxFilter = 'all';
  bnavTab('sources');
  switchSourcesSubTab('media');
}

function _showMediaBrowserLegacy() {
  const titleEl = document.getElementById('media-browser-title');
  if (titleEl) titleEl.textContent = 'Medien-Browser · Quellen';
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
    html = '<div class="empty-hint">Keine Medien gefunden</div>';
  } else {
    html += `<div class="media-count">${items.length} Medium${items.length !== 1 ? 'en' : ''}</div>`;
    // Gruppiert nach Quelle
    const bySource = {};
    for (const item of items) {
      if (!bySource[item.srcId]) bySource[item.srcId] = [];
      bySource[item.srcId].push(item);
    }
    for (const srcId of Object.keys(bySource)) {
      const group = bySource[srcId];
      html += `<div class="media-browser-header">${esc(group[0].srcTitle)}</div>`;
      for (const { srcId: sid, idx, m } of group) {
        const _ext = (m.file || '').split('.').pop().toLowerCase();
        const _isImg = ['jpg','jpeg','png','gif','bmp','webp','tif','tiff'].includes(_ext);
        const _icon = _isImg ? '🖼' : _ext === 'pdf' ? '📄' : '📎';
        const thumbId = 'mb-thumb-' + sid + '-' + idx;
        html += `<div class="media-row--browser"
          data-action="browserShowSource" data-sid="${sid}">
          <div id="${thumbId}" class="media-thumb--sm">${_icon}</div>
          <div class="media-info">
            <div class="media-title">${esc(m.title || m.file)}</div>
            ${m.title && m.file ? `<div class="media-sub">${esc(m.file)}</div>` : ''}
          </div>
          <span class="p-arrow">›</span>
        </div>`;
      }
    }
  }

  document.getElementById('media-browser-content').innerHTML = html;
  openModal('modalMediaBrowser');

  // Async Thumbnails — pfad-basiert
  for (const { srcId, idx, m } of items) {
    const _ext = (m.file || '').split('.').pop().toLowerCase();
    if (!['jpg','jpeg','png','gif','bmp','webp','tif','tiff'].includes(_ext)) continue;
    _asyncLoadMediaThumb('mb-thumb-' + srcId + '-' + idx, m.file);
  }
}

function showPersonMediaBrowser() {
  UIState._mediaCtxFilter = 'person';
  bnavTab('sources');
  switchSourcesSubTab('media');
}

function _showPersonMediaBrowserLegacy() {
  const titleEl = document.getElementById('media-browser-title');
  if (titleEl) titleEl.textContent = 'Medien-Browser · Personen';

  const sorted = Object.values(AppState.db.individuals || {})
    .sort((a, b) => {
      const c = (a.surname || '').localeCompare(b.surname || '', 'de');
      if (c !== 0) return c;
      return (a.given || '').localeCompare(b.given || '', 'de');
    });

  const items = []; // { pid, pName, idx, m }
  for (const p of sorted) {
    for (let i = 0; i < (p.media || []).length; i++) {
      const m = p.media[i];
      if (!m.file && !m.title) continue;
      items.push({ pid: p.id, pName: p.name || p.id, idx: i, m });
    }
  }

  let html = '';
  if (!items.length) {
    html = '<div class="empty-hint">Keine Medien gefunden</div>';
  } else {
    html += `<div class="media-count">${items.length} Medium${items.length !== 1 ? 'en' : ''}</div>`;
    const byPerson = {};
    const pidOrder = [];
    for (const item of items) {
      if (!byPerson[item.pid]) { byPerson[item.pid] = []; pidOrder.push(item.pid); }
      byPerson[item.pid].push(item);
    }
    for (const pid of pidOrder) {
      const group = byPerson[pid];
      html += `<div class="media-browser-header">${esc(group[0].pName)}</div>`;
      for (const { pid: p_id, idx, m } of group) {
        const _ext = (m.file || '').split('.').pop().toLowerCase();
        const _isImg = ['jpg','jpeg','png','gif','bmp','webp','tif','tiff'].includes(_ext);
        const _icon = _isImg ? '🖼' : _ext === 'pdf' ? '📄' : '📎';
        const thumbId = 'mb-p-' + p_id.replace(/@/g, '') + '-' + idx;
        html += `<div class="media-row--browser"
          data-action="browserShowPerson" data-pid="${p_id}">
          <div id="${thumbId}" class="media-thumb--sm">${_icon}</div>
          <div class="media-info">
            <div class="media-title">${esc(m.title || m.file)}</div>
            ${m.title && m.file ? `<div class="media-sub">${esc(m.file)}</div>` : ''}
          </div>
          <span class="p-arrow">›</span>
        </div>`;
      }
    }
  }

  document.getElementById('media-browser-content').innerHTML = html;
  openModal('modalMediaBrowser');

  for (const { pid, idx, m } of items) {
    const _ext = (m.file || '').split('.').pop().toLowerCase();
    if (!['jpg','jpeg','png','gif','bmp','webp','tif','tiff'].includes(_ext)) continue;
    _asyncLoadMediaThumb('mb-p-' + pid.replace(/@/g, '') + '-' + idx, m.file);
  }
}

function showFamilyMediaBrowser() {
  UIState._mediaCtxFilter = 'family';
  bnavTab('sources');
  switchSourcesSubTab('media');
}

function _showFamilyMediaBrowserLegacy() {
  const titleEl = document.getElementById('media-browser-title');
  if (titleEl) titleEl.textContent = 'Medien-Browser · Familien';

  const sorted = Object.values(AppState.db.families || {})
    .sort((a, b) => {
      const na = a.husb ? (AppState.db.individuals[a.husb]?.surname || AppState.db.individuals[a.husb]?.name || '') : '';
      const nb = b.husb ? (AppState.db.individuals[b.husb]?.surname || AppState.db.individuals[b.husb]?.name || '') : '';
      return na.localeCompare(nb, 'de');
    });

  const items = []; // { fid, fTitle, idx, m }
  for (const f of sorted) {
    const husb = f.husb ? AppState.db.individuals[f.husb] : null;
    const wife = f.wife ? AppState.db.individuals[f.wife] : null;
    const fTitle = [husb?.name, wife?.name].filter(Boolean).join(' & ') || f.id;
    for (let i = 0; i < (f.media || []).length; i++) {
      const m = f.media[i];
      if (!m.file && !m.title) continue;
      items.push({ fid: f.id, fTitle, idx: i, m });
    }
    for (let i = 0; i < (f.marr?.media || []).length; i++) {
      const m = f.marr.media[i];
      if (!m.file && !m.titl) continue;
      items.push({ fid: f.id, fTitle, idx: i, m: { ...m, title: m.titl || m.title } });
    }
  }

  let html = '';
  if (!items.length) {
    html = '<div class="empty-hint">Keine Medien gefunden</div>';
  } else {
    html += `<div class="media-count">${items.length} Medium${items.length !== 1 ? 'en' : ''}</div>`;
    const byFamily = {};
    const fidOrder = [];
    for (const item of items) {
      if (!byFamily[item.fid]) { byFamily[item.fid] = []; fidOrder.push(item.fid); }
      byFamily[item.fid].push(item);
    }
    for (const fid of fidOrder) {
      const group = byFamily[fid];
      html += `<div class="media-browser-header">${esc(group[0].fTitle)}</div>`;
      for (const { fid: f_id, idx, m } of group) {
        const _ext = (m.file || '').split('.').pop().toLowerCase();
        const _isImg = ['jpg','jpeg','png','gif','bmp','webp','tif','tiff'].includes(_ext);
        const _icon = _isImg ? '🖼' : _ext === 'pdf' ? '📄' : '📎';
        const thumbId = 'mb-f-' + f_id.replace(/@/g, '') + '-' + idx;
        html += `<div class="media-row--browser"
          data-action="browserShowFamily" data-fid="${f_id}">
          <div id="${thumbId}" class="media-thumb--sm">${_icon}</div>
          <div class="media-info">
            <div class="media-title">${esc(m.title || m.file)}</div>
            ${m.title && m.file ? `<div class="media-sub">${esc(m.file)}</div>` : ''}
          </div>
          <span class="p-arrow">›</span>
        </div>`;
      }
    }
  }

  document.getElementById('media-browser-content').innerHTML = html;
  openModal('modalMediaBrowser');

  for (const { fid, idx, m } of items) {
    const _ext = (m.file || '').split('.').pop().toLowerCase();
    if (!['jpg','jpeg','png','gif','bmp','webp','tif','tiff'].includes(_ext)) continue;
    _asyncLoadMediaThumb('mb-f-' + fid.replace(/@/g, '') + '-' + idx, m.file);
  }
}

function _removeFamMarrObjeAt(f, targetIdx) {
  // Legacy: war für _extra-basierte Speicherung; jetzt über f.marr.media.splice()
  if (f?.marr?.media) f.marr.media.splice(targetIdx, 1);
}

// ─────────────────────────────────────
//  MEDIA-MGR — Kachel- / Listenansicht (Sub-Tab "Medien" im Quellen-Tab)
// ─────────────────────────────────────

const _IMG_EXTS  = new Set(['jpg','jpeg','png','gif','bmp','webp','tif','tiff']);
const _CTX_ICON  = { person: '👤', family: '⚭', source: '📖' };
let   _mediaAllItems = [];

function _collectAllMedia() {
  const items = [];
  const db = AppState.db;

  const sortedPersons = Object.values(db.individuals || {})
    .sort((a, b) => (a.surname || '').localeCompare(b.surname || '', 'de')
                 || (a.given  || '').localeCompare(b.given  || '', 'de'));
  for (const p of sortedPersons) {
    for (let i = 0; i < (p.media || []).length; i++) {
      const m = p.media[i];
      if (!m.file && !m.title) continue;
      const key = p.id.replace(/[^a-zA-Z0-9]/g, '');
      items.push({ file: m.file, title: m.title || m.file,
        ctx: 'person', ctxId: p.id, ctxLabel: p.name || p.id,
        mediaType: 'person', idx: i,
        thumbId: 'mt-p-' + key + '-' + i });
    }
  }

  const sortedFams = Object.values(db.families || {}).sort((a, b) => {
    const na = a.husb ? (db.individuals[a.husb]?.surname || '') : '';
    const nb = b.husb ? (db.individuals[b.husb]?.surname || '') : '';
    return na.localeCompare(nb, 'de');
  });
  for (const f of sortedFams) {
    const husb  = f.husb ? db.individuals[f.husb] : null;
    const wife  = f.wife ? db.individuals[f.wife] : null;
    const label = [husb?.name, wife?.name].filter(Boolean).join(' & ') || f.id;
    const key   = f.id.replace(/[^a-zA-Z0-9]/g, '');
    for (let i = 0; i < (f.marr?.media || []).length; i++) {
      const m = f.marr.media[i];
      if (!m.file && !m.titl && !m.title) continue;
      items.push({ file: m.file, title: m.titl || m.title || m.file,
        ctx: 'family', ctxId: f.id, ctxLabel: label,
        mediaType: 'family', idx: i,
        thumbId: 'mt-fm-' + key + '-' + i });
    }
    for (let i = 0; i < (f.media || []).length; i++) {
      const m = f.media[i];
      if (!m.file && !m.title) continue;
      items.push({ file: m.file, title: m.title || m.file,
        ctx: 'family', ctxId: f.id, ctxLabel: label,
        mediaType: 'family_media', idx: i,
        thumbId: 'mt-f-' + key + '-' + i });
    }
  }

  for (const s of Object.values(db.sources || {})) {
    for (let i = 0; i < (s.media || []).length; i++) {
      const m = s.media[i];
      if (!m.file && !m.title) continue;
      const key = s.id.replace(/[^a-zA-Z0-9]/g, '');
      items.push({ file: m.file, title: m.title || m.file,
        ctx: 'source', ctxId: s.id, ctxLabel: s.abbr || s.title || s.id,
        mediaType: 'source', idx: i,
        thumbId: 'mt-s-' + key + '-' + i });
    }
  }

  return items;
}

async function _loadMediaTileThumb(tileId, filePath) {
  const el = document.getElementById(tileId);
  if (!el) return;
  const src = filePath
    ? (await _odGetMediaUrlByPath(filePath).catch(() => null)
    || await idbGet('img:' + filePath).catch(() => null))
    : null;
  if (!src) { el.classList.add('broken'); el.textContent = '⚠'; return; }
  const img = document.createElement('img');
  img.onerror = () => { el.classList.add('broken'); el.textContent = '⚠';
    if (el.contains(img)) el.removeChild(img); };
  img.src = src;
  el.textContent = '';
  el.appendChild(img);
}

function _renderMedia() {
  const ctx      = UIState._mediaCtxFilter;
  const isList   = UIState._mediaViewMode === 'list';
  const filtered = ctx === 'all' ? _mediaAllItems : _mediaAllItems.filter(m => m.ctx === ctx);

  // Filter-Chips sync
  document.querySelectorAll('.media-ctx-chip').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.ctx === ctx));

  // View-Toggle-Icon: zeigt Ziel-Modus (was ein Klick bewirken würde)
  const tog = document.getElementById('mediaViewToggle');
  if (tog) tog.textContent = isList ? '⊞' : '☰';

  const container = document.getElementById('mediaGrid');
  if (!container) return;

  if (!filtered.length) {
    container.className = 'media-grid';
    container.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text-muted)">Keine Medien vorhanden</div>';
    return;
  }

  if (isList) {
    container.className = 'media-list';
    container.innerHTML = filtered.map(({ file, title, ctx: c, ctxId, ctxLabel, thumbId, mediaType, idx }) => {
      const ext  = (file || '').split('.').pop().toLowerCase();
      const icon = _IMG_EXTS.has(ext) ? '🖼' : ext === 'pdf' ? '📄' : '📎';
      const tid  = thumbId + 'l';
      return `<div class="media-tile-row" data-action="mediaNavCtx"
          data-media-type="${esc(mediaType)}" data-ctx-id="${esc(ctxId)}" data-idx="${idx}">
        <div class="media-tile-thumb-sm" id="${esc(tid)}">${icon}</div>
        <div class="media-tile-info">
          <div class="media-tile-ctx">${_CTX_ICON[c] || ''} ${esc(ctxLabel)}</div>
          <div class="media-tile-label" title="${esc(title)}">${esc(title)}</div>
        </div>
        <span class="p-arrow">›</span>
      </div>`;
    }).join('');
    for (const item of filtered) {
      if (_IMG_EXTS.has((item.file || '').split('.').pop().toLowerCase()))
        _loadMediaTileThumb(item.thumbId + 'l', item.file);
    }
  } else {
    container.className = 'media-grid';
    container.innerHTML = filtered.map(({ file, title, ctx: c, ctxId, ctxLabel, thumbId, mediaType, idx }) => {
      const ext  = (file || '').split('.').pop().toLowerCase();
      const icon = _IMG_EXTS.has(ext) ? '🖼' : ext === 'pdf' ? '📄' : '📎';
      return `<div class="media-tile" data-action="mediaNavCtx"
          data-media-type="${esc(mediaType)}" data-ctx-id="${esc(ctxId)}" data-idx="${idx}">
        <div class="media-tile-thumb" id="${esc(thumbId)}">${icon}</div>
        <div class="media-tile-label" title="${esc(title)}">${esc(title)}</div>
        <div class="media-tile-ctx">${_CTX_ICON[c] || ''} ${esc(ctxLabel)}</div>
      </div>`;
    }).join('');
    for (const item of filtered) {
      if (_IMG_EXTS.has((item.file || '').split('.').pop().toLowerCase()))
        _loadMediaTileThumb(item.thumbId, item.file);
    }
  }
}

function showMediaSection() {
  _mediaAllItems = _collectAllMedia();
  _renderMedia();
}

function filterMedia(ctx) {
  UIState._mediaCtxFilter = ctx || 'all';
  _renderMedia();
}

function toggleMediaView() {
  UIState._mediaViewMode = UIState._mediaViewMode === 'grid' ? 'list' : 'grid';
  _renderMedia();
}

// ─── Medien-Detailansicht (rechter Panel, analog Hof-Detail) ──────────────────

let _mdType  = null; // 'person' | 'family' | 'family_media' | 'source'
let _mdId    = null; // ctxId
let _mdIdx   = null; // index im media-Array

function _getMdEntry(type, id, idx) {
  if      (type === 'person')       return getPerson(id)?.media?.[idx]    || null;
  else if (type === 'family')       return _getFamMarrObjeEntries(getFamily(id))[idx] || null;
  else if (type === 'family_media') return getFamily(id)?.media?.[idx]   || null;
  else if (type === 'source')       return getSource(id)?.media?.[idx]   || null;
  return null;
}

function _mdEntityLabel(type, id) {
  if (type === 'person') {
    const p = getPerson(id); return { icon: '👤', label: p?.name || id };
  }
  if (type === 'family' || type === 'family_media') {
    const f = getFamily(id);
    const husb = f?.husb ? getPerson(f.husb) : null;
    const wife = f?.wife ? getPerson(f.wife) : null;
    const label = [husb?.name, wife?.name].filter(Boolean).join(' & ') || id;
    return { icon: '⚭', label };
  }
  if (type === 'source') {
    const s = getSource(id); return { icon: '📖', label: s?.abbr || s?.title || id };
  }
  return { icon: '📎', label: id };
}

function _mdFindAllRefs(filePath) {
  // Returns all entities referencing the same file path
  const db  = AppState.db;
  const refs = [];
  if (!filePath) return refs;
  const fp  = filePath.trim().toLowerCase();
  for (const p of Object.values(db.individuals || {})) {
    for (let i = 0; i < (p.media || []).length; i++) {
      if ((p.media[i].file || '').trim().toLowerCase() === fp)
        refs.push({ type: 'person', id: p.id, idx: i, label: p.name || p.id, icon: '👤' });
    }
  }
  for (const f of Object.values(db.families || {})) {
    const marrMediaList = _getFamMarrObjeEntries(f);
    for (let i = 0; i < marrMediaList.length; i++) {
      if ((marrMediaList[i].file || '').trim().toLowerCase() === fp)
        refs.push({ type: 'family', id: f.id, idx: i, label: _mdEntityLabel('family', f.id).label, icon: '⚭' });
    }
    for (let i = 0; i < (f.media || []).length; i++) {
      if ((f.media[i].file || '').trim().toLowerCase() === fp)
        refs.push({ type: 'family_media', id: f.id, idx: i, label: _mdEntityLabel('family', f.id).label, icon: '⚭' });
    }
  }
  for (const s of Object.values(db.sources || {})) {
    for (let i = 0; i < (s.media || []).length; i++) {
      if ((s.media[i].file || '').trim().toLowerCase() === fp)
        refs.push({ type: 'source', id: s.id, idx: i, label: s.abbr || s.title || s.id, icon: '📖' });
    }
  }
  return refs;
}

function showMediaDetail(mediaType, ctxId, idx, pushHistory = true) {
  const m = _getMdEntry(mediaType, ctxId, idx);
  if (!m) return;
  if (pushHistory) _beforeDetailNavigate();

  _mdType = mediaType;
  _mdId   = ctxId;
  _mdIdx  = idx;

  AppState.currentPersonId = null;
  AppState.currentFamilyId = null;
  AppState.currentSourceId = null;
  AppState.currentRepoId   = null;

  document.getElementById('detailTopTitle').textContent = 'Medium';
  document.getElementById('editBtn').style.display      = 'none';
  document.getElementById('treeBtn').hidden              = true;
  document.getElementById('detailMapBtn')?.setAttribute('hidden', '');

  const file  = m.file  || '';
  const ext   = file.split('.').pop().toLowerCase();
  const isImg = _IMG_EXTS.has(ext);
  const fileIcon = isImg ? '🖼' : ext === 'pdf' ? '📄' : '📎';

  // 1. Preview placeholder (image loads async into this)
  let html = `<div class="md-preview-hero fade-up" id="md-preview-wrap">
    <div class="md-preview-icon">${fileIcon}</div>
  </div>`;

  // 2. Global fields: FILE + FORM — changes update ALL references
  html += `<div class="section fade-up">
    <div class="section-head">
      <div class="section-title">Datei (alle Referenzen)</div>
    </div>
    <label class="form-label">Datei / Pfad</label>
    <input class="form-input mb-3" id="md-file" type="text" value="${esc(file)}">
    <label class="form-label">Format (FORM)</label>
    <input class="form-input mb-3" id="md-form" type="text" value="${esc(m.form || '')}">
    <div class="btn-row">
      <button type="button" class="btn btn-save" data-action="saveMediaGlobal">Speichern (alle Ref.)</button>
    </div>
  </div>`;

  // 3. References list
  const refs = _mdFindAllRefs(file);
  html += `<div class="section fade-up">
    <div class="section-head">
      <div class="section-title">Referenzen (${refs.length})</div>
    </div>`;
  if (!refs.length) {
    html += `<div class="empty empty-pad">Keine Referenzen gefunden</div>`;
  } else {
    for (const r of refs) {
      const isCurrentRef = r.type === mediaType && r.id === ctxId && r.idx === idx;
      const activeCls = isCurrentRef ? ' rel-row-active' : '';
      const typeLabel = r.type === 'family' ? 'Hochzeit-OBJE' : r.type === 'family_media' ? 'Familie-OBJE' : r.type;
      html += `<div class="rel-row${activeCls}" data-action="mediaDetailGoRef"
          data-media-type="${esc(r.type)}" data-ctx-id="${esc(r.id)}" data-idx="${r.idx}">
        <div class="rel-avatar">${r.icon}</div>
        <div class="rel-info">
          <div class="rel-name">${esc(r.label)}</div>
          <div class="rel-role">${typeLabel}</div>
        </div>
        <span class="p-arrow">›</span>
      </div>`;
    }
  }
  html += `<div class="section-btn-row mt-2">
    <button type="button" class="section-add" data-action="mediaDetailLinkPerson">+ Person</button>
    <button type="button" class="section-add" data-action="mediaDetailLinkFamily">+ Familie</button>
    <button type="button" class="section-add" data-action="mediaDetailLinkSource">+ Quelle</button>
  </div>
  </div>`;

  // 4. Per-reference fields — specific to selected entity
  const { icon: refIcon, label: refLabel } = _mdEntityLabel(mediaType, ctxId);
  html += `<div class="section fade-up">
    <div class="section-head">
      <div class="section-title">${refIcon} ${esc(refLabel)}</div>
    </div>
    <label class="form-label">Titel</label>
    <input class="form-input mb-3" id="md-title" type="text" value="${esc(m.title || m.titl || '')}">
    <label class="form-label">Aufnahmedatum</label>
    <input class="form-input mb-3" id="md-date" type="text" value="${esc(m.date || '')}">
    <label class="form-label">Notiz</label>
    <textarea class="form-input mb-3" id="md-note" rows="4">${esc(m.note || '')}</textarea>
    <label class="form-label form-check-row">
      <input type="checkbox" id="md-prim"${m.prim && m.prim !== '' ? ' checked' : ''}> Bevorzugtes Medium (_PRIM)
    </label>
    <div class="btn-row mt-3">
      <button type="button" class="btn btn-save" data-action="saveMediaDetail">Speichern</button>
    </div>
  </div>`;

  document.getElementById('detailContent').innerHTML = html;
  showView('v-detail');

  // Load preview async
  if (isImg) {
    _odGetMediaUrlByPath(file).then(url => {
      if (!url) return idbGet('img:' + file).then(s => s && _mdSetPreview(s)).catch(() => {});
      _mdSetPreview(url);
    }).catch(() => {
      idbGet('img:' + file).then(s => { if (s) _mdSetPreview(s); }).catch(() => {});
    });
  }
}

function _mdSetPreview(src) {
  const wrap = document.getElementById('md-preview-wrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  const img = document.createElement('img');
  img.src = src;
  img.className = 'md-preview-img';
  img.addEventListener('click', () => showLightbox(src));
  wrap.appendChild(img);
}

// Save per-reference fields (TITL, DATE, NOTE, _PRIM) for currently selected ref
function saveMediaDetail() {
  const title = document.getElementById('md-title')?.value.trim() || '';
  const date  = document.getElementById('md-date')?.value.trim()  || '';
  const note  = document.getElementById('md-note')?.value.trim()  || '';
  const prim  = document.getElementById('md-prim')?.checked ? 'Y' : '';

  if (_mdType === 'person') {
    const p = getPerson(_mdId);
    if (!p || !p.media?.[_mdIdx]) return;
    p.media[_mdIdx] = { ...p.media[_mdIdx], title, date, note, prim };
  } else if (_mdType === 'family') {
    const f = getFamily(_mdId);
    if (!f || !f.marr?.media?.[_mdIdx]) return;
    f.marr.media[_mdIdx] = { ...f.marr.media[_mdIdx], titl: title, date, note, prim };
  } else if (_mdType === 'family_media') {
    const f = getFamily(_mdId);
    if (!f || !f.media?.[_mdIdx]) return;
    f.media[_mdIdx] = { ...f.media[_mdIdx], title, date, note, prim };
  } else if (_mdType === 'source') {
    const s = getSource(_mdId);
    if (!s || !s.media?.[_mdIdx]) return;
    s.media[_mdIdx] = { ...s.media[_mdIdx], title, date, note, prim };
  } else return;

  AppState.changed = true;
  updateChangedIndicator();
  showToast('Referenz gespeichert', 'success');
  showMediaDetail(_mdType, _mdId, _mdIdx, false);
}

// Save global fields (FILE, FORM) — updates every entity that references this file
function saveMediaGlobal() {
  const newFile = document.getElementById('md-file')?.value.trim() || '';
  const newForm = document.getElementById('md-form')?.value.trim() || '';
  const oldFile = (_getMdEntry(_mdType, _mdId, _mdIdx)?.file || '').trim();
  const db = AppState.db;
  let count = 0;

  const _updateEntry = (entry, isFamily) => {
    if ((entry.file || '').trim() !== oldFile && oldFile !== '') return;
    if (isFamily) { entry.file = newFile; entry.form = newForm; }
    else          { entry.file = newFile; entry.form = newForm; }
    count++;
  };

  for (const p of Object.values(db.individuals || {}))
    for (const e of (p.media || [])) _updateEntry(e, false);
  for (const f of Object.values(db.families || {})) {
    for (const e of (f.marr?.media || [])) _updateEntry(e, true);
    for (const e of (f.media || []))       _updateEntry(e, false);
  }
  for (const s of Object.values(db.sources || {}))
    for (const e of (s.media || [])) _updateEntry(e, false);

  AppState.changed = true;
  updateChangedIndicator();
  showToast(`Datei in ${count} Referenz${count !== 1 ? 'en' : ''} aktualisiert`, 'success');
  showMediaDetail(_mdType, _mdId, _mdIdx, false);
}

