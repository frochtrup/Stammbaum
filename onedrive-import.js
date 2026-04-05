// ─────────────────────────────────────
//  ONEDRIVE FOTO-IMPORT + ORDNER-BROWSER
// ─────────────────────────────────────

// GEDCOM nach OBJE FILE-Referenzen parsen
// Returns { persons: Map<personId,basename>, families: Map<famId,basename> }
function _extractObjeFilemap() {
  const text = AppState._originalGedText;
  if (!text) return { persons: new Map(), families: new Map() };
  const lines     = text.split(/\r?\n/);
  const objeFiles = {};   // objeId → filepath (lv=0 OBJE-Records)
  const personObje = {};  // personId → [{file:string, prim:bool}]  (inline only, GEDCOM order)
  const famObje    = {};  // famId    → [{file,ref?,prim}]  (MARR OBJEs, GEDCOM order)
  let recId = null, recType = null;
  let inInlineObje = false;   // INDI: 1 OBJE inline
  let inMarr = false;          // FAM:  inside 1 MARR block
  let inMarrObje = false;      // FAM:  inside 2 OBJE under MARR
  let marrObjeFile = '';       // current 2 OBJE FILE
  let marrObjePrim = false;    // current 2 OBJE _PRIM Y

  const _commitMarrObje = () => {
    if (inMarrObje && marrObjeFile && recId) {
      if (!famObje[recId]) famObje[recId] = [];
      famObje[recId].push({ file: marrObjeFile, prim: marrObjePrim });
    }
    inMarrObje = false; marrObjeFile = ''; marrObjePrim = false;
  };

  for (const raw of lines) {
    const m = raw.match(/^(\d+)\s+(?:(@[^@]+@)\s+)?(\S+)(?:\s+(.*))?$/);
    if (!m) continue;
    const level = +m[1];
    const xref  = m[2] || null;
    const tag   = m[3];
    const val   = (m[4] || '').trim();

    if (level === 0) {
      _commitMarrObje();
      recId = xref; recType = tag;
      inInlineObje = false; inMarr = false; inMarrObje = false;
    }

    // INDI: 1 OBJE (inline only — refs go to passthrough, not to media[])
    if (recType === 'INDI' && level === 1 && tag === 'OBJE') {
      inInlineObje = !(val.startsWith('@') && val.endsWith('@'));
      if (inInlineObje) {
        if (!personObje[recId]) personObje[recId] = [];
        personObje[recId].push({ file: '', prim: false });
      }
    }
    if (recType === 'INDI' && level === 2 && inInlineObje) {
      const arr = personObje[recId];
      if (arr?.length) {
        if (tag === 'FILE') arr[arr.length - 1].file = val;
        if (tag === '_PRIM' && val.toUpperCase() === 'Y') arr[arr.length - 1].prim = true;
      }
    }
    if (recType === 'INDI' && level === 1 && tag !== 'OBJE') inInlineObje = false;

    // FAM: track 1 MARR context
    if (recType === 'FAM' && level === 1) {
      _commitMarrObje();
      inMarr = (tag === 'MARR');
    }
    // FAM: 1 OBJE at top level (ref or inline)
    if (recType === 'FAM' && level === 1 && tag === 'OBJE') {
      if (val.startsWith('@') && val.endsWith('@')) {
        if (!famObje[recId]) famObje[recId] = [];
        const fp = objeFiles[val]; // might be set later; store ref for post-processing
        famObje[recId].push({ file: fp || '', ref: val, prim: false });
      }
    }
    // FAM: 2 OBJE inside MARR
    if (recType === 'FAM' && inMarr && level === 2 && tag === 'OBJE') {
      _commitMarrObje();
      inMarrObje = true;
    }
    if (recType === 'FAM' && inMarrObje && level === 3) {
      if (tag === 'FILE')  marrObjeFile = val;
      if (tag === '_PRIM' && val.toUpperCase() === 'Y') marrObjePrim = true;
    }
    if (recType === 'FAM' && inMarrObje && level === 2 && tag !== 'OBJE') _commitMarrObje();

    // lv=0 OBJE record FILE
    if (recType === 'OBJE' && recId && level === 1 && tag === 'FILE') {
      objeFiles[recId] = val;
    }
  }
  _commitMarrObje();

  // Returns Map<id, {files: string[], primIdx: number}> for both persons and families
  const _toMap = (store, isFam) => {
    const map = new Map();
    for (const [id, entries] of Object.entries(store)) {
      if (!entries?.length) continue;
      const primIdx = entries.findIndex(e => e.prim);
      const files = entries.map(e => {
        const fp = e.file || (e.ref ? objeFiles[e.ref] : '');
        return fp ? fp.split(/[/\\]/).pop() : null;
      }).filter(Boolean);
      if (files.length) map.set(id, { files, primIdx: primIdx >= 0 ? primIdx : 0 });
    }
    return map;
  };
  return { persons: _toMap(personObje, false), families: _toMap(famObje, true) };
}

// Ordner-Browser State
let _odFolderStack = [];

async function odImportFromDefaultFolder() {
  const folder = await idbGet('od_photo_folder').catch(() => null)
              || await idbGet('od_default_folder').catch(() => null);
  if (!folder) { showToast('Kein Standard-Ordner gesetzt — bitte Ordner auswählen'); odImportPhotos(); return; }
  await odImportPhotosFromFolder(folder.id || folder.folderId, folder.name || folder.folderName);
}

async function odImportPhotos() {
  if (!_odIsConnected()) { showToast('Zuerst OneDrive verbinden'); return; }
  _odFolderStack = [];
  await _odGetBasePath(); // Basis-Pfad vorladen
  const folder = await idbGet('od_photo_folder').catch(() => null)
              || await idbGet('od_default_folder').catch(() => null);
  const folderId = folder?.id || folder?.folderId;
  if (folderId) await _odShowFolder(folderId, folder.name || folder.folderName);
  else await _odShowFolder('root', 'OneDrive');
}

async function _odShowFolder(folderId, folderName) {
  const token = await _odGetToken(); if (!token) return;
  const url = folderId === 'root'
    ? `${OD_GRAPH}/me/drive/root/children?select=id,name,folder&top=200`
    : `${OD_GRAPH}/me/drive/items/${folderId}/children?select=id,name,folder&top=200`;
  showToast('Lade Ordner…');
  try {
    const res  = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const items   = data.value || [];
    const folders = items.filter(f => f.folder);
    const _isPickMode = _odPickMode || _odEditPickMode;
    const files   = _isPickMode ? items.filter(f => !f.folder) : [];
    const title   = document.querySelector('#modalOneDrive .sheet-title');
    if (title) title.textContent = _isPickMode ? 'Datei auswählen' : _odDocScanMode ? 'Dokumente-Ordner wählen' : 'Fotos importieren';
    const list = document.getElementById('odFileList');
    if (!list) return;
    const breadcrumb = [..._odFolderStack.map(f => f.name), folderName].join(' / ');
    let html = `<div style="font-size:0.75rem;color:var(--text-dim);padding-bottom:8px">${esc(breadcrumb)}</div>`;
    if (_odFolderStack.length > 0) {
      html += `<div class="list-item" data-action="odFolderBack" style="cursor:pointer;color:var(--gold)">← Zurück</div>`;
    } else if (_isPickMode) {
      html += `<div class="list-item" data-action="odPickCancel" style="cursor:pointer;color:var(--gold)">← Abbrechen</div>`;
      if (_odPickStartedFromSubfolder) {
        html += `<div class="list-item" data-action="odShowAllFolders" style="cursor:pointer;color:var(--text-dim);font-size:0.85rem">↑ Übergeordneter Ordner</div>`;
      }
    }
    if (!_odPickMode && folderId !== 'root') {
      if (_odDocScanMode) {
        html += `<div class="list-item" data-action="odScanDocFolder" data-odid="${esc(folderId)}" data-odname="${esc(folderName)}"
          style="cursor:pointer;font-weight:600;color:var(--gold);border:1px solid var(--gold-dim)">
          📂 Diesen Ordner als Dokumente-Ordner nutzen</div>`;
      } else {
        html += `<div class="list-item" data-action="odImportPhotos" data-odid="${esc(folderId)}" data-odname="${esc(folderName)}"
          style="cursor:pointer;font-weight:600;color:var(--gold);border:1px solid var(--gold-dim)">
          📥 Fotos aus diesem Ordner laden</div>`;
      }
    }
    if (folders.length === 0 && files.length === 0) {
      html += `<div style="color:var(--text-dim);font-size:0.85rem;padding:8px">Keine Einträge</div>`;
    } else {
      html += folders.map(f => `<div class="list-item" data-action="odEnterFolder" style="cursor:pointer"
          data-odid="${esc(f.id)}" data-odname="${esc(f.name)}"
          data-parentid="${esc(folderId)}" data-parentname="${esc(folderName)}">📁 &nbsp;${esc(f.name)}</div>`).join('');
      const _fullFolderPath = [..._odFolderStack.map(f => f.name), folderName]
        .filter(n => n !== 'OneDrive').join('/');
      const _relFolderPath = _odToRelPath(_fullFolderPath, _odCurrentBasePath || '');
      html += files.map(f => `<div class="list-item" data-action="odPickSelectFile" style="cursor:pointer"
          data-odid="${esc(f.id)}" data-odname="${esc(f.name)}"
          data-path="${esc(_relFolderPath ? _relFolderPath + '/' + f.name : f.name)}">📄 &nbsp;${esc(f.name)}</div>`).join('');
    }
    list.innerHTML = html;
    openModal('modalOneDrive');
  } catch(e) { showToast('OneDrive: ' + e.message); }
}

function _odEnterFolder(el) {
  _odFolderStack.push({ id: el.dataset.parentid, name: el.dataset.parentname });
  _odShowFolder(el.dataset.odid, el.dataset.odname);
}
async function _odFolderBack() {
  const p = _odFolderStack.pop();
  if (p) await _odShowFolder(p.id, p.name);
}
async function _odShowAllFolders() {
  if (!_odPickStartFolderId) { await _odShowFolder('root', 'OneDrive'); return; }
  const token = await _odGetToken().catch(() => null);
  if (!token) { await _odShowFolder('root', 'OneDrive'); return; }
  try {
    const res  = await fetch(`${OD_GRAPH}/me/drive/items/${_odPickStartFolderId}?$select=id,name,parentReference`,
      { headers: { Authorization: 'Bearer ' + token } });
    const data = await res.json();
    const parentId   = data.parentReference?.id;
    const parentPath = data.parentReference?.path || '';
    const parentMatch = parentPath.match(/\/drive\/root:\/(.*)/);
    const parentName  = (parentMatch ? parentMatch[1].split('/').filter(Boolean).pop() : null) || 'OneDrive';
    _odPickStartedFromSubfolder = false;
    _odFolderStack = [];
    if (parentId) await _odShowFolder(parentId, parentName);
    else await _odShowFolder('root', 'OneDrive');
  } catch(e) { console.warn('[OD] Parent-Ordner laden:', e); await _odShowFolder('root', 'OneDrive'); }
}

async function odImportPhotosFromFolder(folderId, folderName) {
  closeModal('modalOneDrive');
  const token = await _odGetToken(); if (!token) return;

  const { persons: personMap, families: famMap } = _extractObjeFilemap();
  if (personMap.size === 0 && famMap.size === 0) { showToast('Keine OBJE-Referenzen im GEDCOM gefunden'); return; }
  showToast(`Verknüpfe Fotos aus "${folderName}"…`);

  try {
    const res  = await fetch(`${OD_GRAPH}/me/drive/items/${folderId}/children?select=id,name&top=500`,
      { headers: { Authorization: 'Bearer ' + token } });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const odFiles = {};
    for (const f of (data.value || [])) odFiles[f.name.toLowerCase()] = f.id;

    let linked = 0, missing = 0;
    const filemap = { persons: {}, families: {} };

    for (const [personId, { files, primIdx }] of personMap) {
      const entries = [];
      for (let i = 0; i < files.length; i++) {
        const fileId = odFiles[files[i].toLowerCase()];
        if (fileId) { entries.push({ fileId, filename: files[i], prim: i === primIdx }); linked++; }
        else missing++;
      }
      if (entries.length) filemap.persons[personId] = entries;
    }

    for (const [famId, { files, primIdx }] of famMap) {
      const entries = [];
      for (let i = 0; i < files.length; i++) {
        const fileId = odFiles[files[i].toLowerCase()];
        if (fileId) { entries.push({ fileId, filename: files[i], prim: i === primIdx }); linked++; }
        else missing++;
      }
      if (entries.length) filemap.families[famId] = entries;
    }

    // Ordner-Pfade berechnen
    const fullFolderPath = [..._odFolderStack.map(f => f.name), folderName]
      .filter(n => n !== 'OneDrive').join('/');

    // Basis-Pfad: auto-erkennen wenn nicht konfiguriert (Parent des gewählten Ordners)
    let basePath = await _odGetBasePath();
    if (!basePath && fullFolderPath.includes('/')) {
      basePath = fullFolderPath.split('/').slice(0, -1).join('/');
      await idbPut('od_base_path', basePath).catch(() => {});
      _odCurrentBasePath = basePath;
    }
    const photoRelPath = _odToRelPath(fullFolderPath, basePath);

    // Neue Schlüssel speichern
    await idbPut('od_photo_folder', { id: folderId, name: folderName, relPath: photoRelPath }).catch(() => {});
    await idbPut('od_default_folder', { folderId, folderName, folderPath: fullFolderPath }).catch(() => {}); // legacy
    await idbPut('od_filemap', filemap).catch(() => {}); // legacy (für Quellenmedien-Fallback)

    // m.file auf relativen Pfad aktualisieren (relativ zu od_base_path)
    for (const p of Object.values(AppState.db?.individuals || {})) {
      for (const m of (p.media || [])) {
        if (!m.file) continue;
        const bn = m.file.split(/[/\\]/).pop().toLowerCase();
        if (odFiles[bn]) m.file = photoRelPath ? photoRelPath + '/' + m.file.split(/[/\\]/).pop()
                                               : m.file.split(/[/\\]/).pop();
      }
    }
    for (const f of Object.values(AppState.db?.families || {})) {
      for (const m of (f.marr?.media || [])) {
        if (!m.file) continue;
        const bn = m.file.split(/[/\\]/).pop().toLowerCase();
        if (odFiles[bn]) m.file = photoRelPath ? photoRelPath + '/' + m.file.split(/[/\\]/).pop()
                                               : m.file.split(/[/\\]/).pop();
      }
      for (const m of (f.media || [])) {
        if (!m.file) continue;
        const bn = m.file.split(/[/\\]/).pop().toLowerCase();
        if (odFiles[bn]) m.file = photoRelPath ? photoRelPath + '/' + m.file.split(/[/\\]/).pop()
                                               : m.file.split(/[/\\]/).pop();
      }
    }
    AppState.changed = true;

    // Session-Cache leeren (neu verknüpfte Fotos sollen frisch geladen werden)
    Object.keys(_odPhotoCache).forEach(k => delete _odPhotoCache[k]);

    // Aktuelle Ansicht sofort aktualisieren
    if (AppState.currentPersonId) {
      const p = getPerson(AppState.currentPersonId);
      const primMedia = p?.media?.find(m => m.prim) || p?.media?.[0];
      if (primMedia?.file) {
        _odGetMediaUrlByPath(primMedia.file).then(url => {
          if (!url) return;
          const el = document.getElementById('det-photo-' + AppState.currentPersonId);
          const av = document.getElementById('det-avatar-' + AppState.currentPersonId);
          if (el) { el.style.display = ''; el.innerHTML = `<img src="${url}" alt="Foto" data-action="showLightbox" style="width:80px;height:96px;object-fit:cover;border-radius:8px;display:block;flex-shrink:0;cursor:pointer">`; }
          if (av) av.style.display = 'none';
        }).catch(() => {});
      }
    }
    if (AppState.currentFamilyId) {
      const f = getFamily(AppState.currentFamilyId);
      const primMedia = f?.media?.find(m => m.prim) || f?.media?.[0];
      if (primMedia?.file) {
        _odGetMediaUrlByPath(primMedia.file).then(url => {
          if (!url) return;
          const el = document.getElementById('det-fam-photo-' + AppState.currentFamilyId);
          const av = document.getElementById('det-fam-avatar-' + AppState.currentFamilyId);
          if (el) { el.style.display = ''; el.innerHTML = `<img src="${url}" alt="Foto" data-action="showLightbox" style="width:80px;height:96px;object-fit:cover;border-radius:8px;display:block;flex-shrink:0;cursor:pointer">`; }
          if (av) av.style.display = 'none';
        }).catch(() => {});
      }
    }

    let msg = `✓ ${linked} Fotos verknüpft`;
    if (missing) msg += ` · ${missing} nicht gefunden`;
    showToast(msg);
    _odUpdateUI();
  } catch(e) { showToast('OneDrive: ' + e.message); }
}

// Dokumente-Ordner scannen (Dateiname → fileId, für Quellenmedien aus GEDCOM-Pfad)
async function odSetupDocFolder() {
  if (!_odIsConnected()) { showToast('Zuerst OneDrive verbinden'); return; }
  _odDocScanMode = true;
  _odPickMode    = false;
  _odFolderStack = [];
  await _odGetBasePath(); // Basis-Pfad vorladen
  const folder = await idbGet('od_docs_folder').catch(() => null)
              || await idbGet('od_doc_folder').catch(() => null);
  const folderId = folder?.id || folder?.folderId;
  if (folderId) await _odShowFolder(folderId, folder.name || folder.folderName);
  else await _odShowFolder('root', 'OneDrive');
}

async function odScanDocFolder(folderId, folderName) {
  closeModal('modalOneDrive');
  _odDocScanMode = false;
  const token = await _odGetToken(); if (!token) return;
  showToast(`Scanne "${folderName}"…`);
  try {
    const res  = await fetch(`${OD_GRAPH}/me/drive/items/${folderId}/children?select=id,name,folder&top=500`,
      { headers: { Authorization: 'Bearer ' + token } });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const docMap = {};
    for (const f of (data.value || [])) {
      if (!f.folder) docMap[f.name.toLowerCase()] = f.id;
    }
    const docFullPath = [..._odFolderStack.map(f => f.name), folderName]
      .filter(n => n !== 'OneDrive').join('/');
    const docRelPath = _odToRelPath(docFullPath, _odCurrentBasePath || await _odGetBasePath());
    await idbPut('od_docs_folder', { id: folderId, name: folderName, relPath: docRelPath }).catch(() => {});
    await idbPut('od_doc_folder', { folderId, folderName, folderPath: docFullPath }).catch(() => {}); // legacy
    await idbPut('od_doc_filemap', docMap).catch(() => {}); // legacy
    // Session-Cache für Quellenmedien leeren
    Object.keys(_odPhotoCache).filter(k => k.startsWith('src_')).forEach(k => delete _odPhotoCache[k]);
    if (AppState.currentSourceId) showSourceDetail(AppState.currentSourceId, false);
    showToast(`✓ ${Object.keys(docMap).length} Dateien indiziert — "${folderName}"`);
  } catch(e) { showToast('OneDrive: ' + e.message); }
}

let _odPickMode               = false;
let _odEditPickMode           = false; // true wenn OD-Picker aus Edit-Modal geöffnet
let _odDocScanMode            = false; // true wenn Dokumente-Ordner gewählt wird
let _odPickStartedFromSubfolder = false; // true wenn Picker aus konfiguriertem Unterordner gestartet
let _odPickStartFolderId      = '';    // ID des konfigurierten Start-Ordners (für Parent-Navigation)

async function odPickFileForEditMedia() {
  if (!_odIsConnected()) { showToast('Zuerst OneDrive verbinden'); return; }
  _odEditPickMode = true;
  _odFolderStack = [];
  closeModal('modalEditMedia');
  await _odGetBasePath(); // Basis-Pfad vorladen
  const isSource = (_editMediaType === 'source');
  const folder = await idbGet(isSource ? 'od_docs_folder' : 'od_photo_folder').catch(() => null)
              || await idbGet(isSource ? 'od_doc_folder' : 'od_default_folder').catch(() => null);
  const folderId = folder?.id || folder?.folderId;
  _odPickStartedFromSubfolder = !!folderId;
  _odPickStartFolderId = folderId || '';
  if (folderId) await _odShowFolder(folderId, folder.name || folder.folderName);
  else await _odShowFolder('root', 'OneDrive');
}

async function _addMediaToFilemap(storeKey, id, entry, atIdx) {
  // od_filemap wird nicht mehr für neue Medien gepflegt (Laden erfolgt per Pfad)
  // Session-Cache leeren damit nächstes Laden den neuen Pfad nutzt
  const pfx = storeKey === 'families' ? 'photo_fam_' + id : 'photo_' + id;
  Object.keys(_odPhotoCache).filter(k => k.startsWith(pfx) || k.startsWith('path:')).forEach(k => delete _odPhotoCache[k]);
}

async function _removeMediaFromFilemap(storeKey, id, idx) {
  try {
    const fm = await idbGet('od_filemap').catch(() => null);
    if (!fm) return;
    const entries = fm[storeKey]?.[id];
    if (entries && entries.length > idx) {
      entries.splice(idx, 1);
      if (!entries.length) delete fm[storeKey][id];
      await idbPut('od_filemap', fm).catch(() => {});
    }
  } catch(e) { console.warn('[OD] Filemap-Update:', e); }
  const pfx = storeKey === 'families' ? 'photo_fam_' + id : storeKey === 'sources' ? 'src_' + id + '_' : 'photo_' + id;
  Object.keys(_odPhotoCache).filter(k => k.startsWith(pfx)).forEach(k => delete _odPhotoCache[k]);
}

async function _clearIdbPhotoKeys(prefix, upTo) {
  for (let i = 0; i <= upTo; i++) idbDel(prefix + '_' + i).catch(() => {});
}

async function odPickFileForMedia() {
  if (!_odIsConnected()) { showToast('Zuerst OneDrive verbinden'); return; }
  _odPickMode = true;
  _odFolderStack = [];
  closeModal('modalAddMedia');
  await _odGetBasePath(); // Basis-Pfad vorladen
  const isSource = (_addMediaType === 'source');
  const folder = await idbGet(isSource ? 'od_docs_folder' : 'od_photo_folder').catch(() => null)
              || await idbGet(isSource ? 'od_doc_folder' : 'od_default_folder').catch(() => null);
  const folderId = folder?.id || folder?.folderId;
  _odPickStartedFromSubfolder = !!folderId;
  _odPickStartFolderId = folderId || '';
  if (folderId) await _odShowFolder(folderId, folder.name || folder.folderName);
  else await _odShowFolder('root', 'OneDrive');
}

function _odPickSelectFile(fileId, filename, fullPath) {
  // Relativer OneDrive-Pfad (kein lokaler Basispfad-Prefix)
  const path = fullPath || filename;
  if (_odEditPickMode) {
    _editMediaOdFileId = fileId;
    document.getElementById('em-file').value = path;
    _odEditPickMode = false;
    closeModal('modalOneDrive');
    openModal('modalEditMedia');
  } else {
    _addMediaOdFileId = fileId;
    document.getElementById('am-file').value = path;
    _odPickMode = false;
    closeModal('modalOneDrive');
    openModal('modalAddMedia');
  }
}

function _odPickCancel() {
  if (_odEditPickMode) { _odEditPickMode = false; closeModal('modalOneDrive'); openModal('modalEditMedia'); }
  else { _odPickMode = false; closeModal('modalOneDrive'); openModal('modalAddMedia'); }
}

function _odCancelOrClose() {
  if (_odPickMode)     { _odPickMode = false;     closeModal('modalOneDrive'); openModal('modalAddMedia'); }
  else if (_odEditPickMode) { _odEditPickMode = false; closeModal('modalOneDrive'); openModal('modalEditMedia'); }
  else { _odDocScanMode = false; closeModal('modalOneDrive'); }
}
