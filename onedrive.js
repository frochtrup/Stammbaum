// ─────────────────────────────────────
//  ONEDRIVE CORE — Media-URL, File-I/O, Pfad-Helfer, Settings
//  (Auth: onedrive-auth.js · Import-Wizard: onedrive-import.js)
// ─────────────────────────────────────

// Session-Cache für dynamisch geladene Fotos (blob: URLs, nicht persistent)
// LRU mit Max 30 Einträgen — verhindert unkontrollierten RAM-Anstieg bei vielen Fotos
const _odPhotoCache = (() => {
  const MAX = 30;
  const map = new Map();
  return {
    get(k)    { if (!map.has(k)) return undefined; const v = map.get(k); map.delete(k); map.set(k, v); return v; },
    set(k, v) { if (map.has(k)) map.delete(k); else if (map.size >= MAX) map.delete(map.keys().next().value); map.set(k, v); },
    has(k)    { return map.has(k); },
    clear()   { map.clear(); },
    clearByPrefix(pfx) { for (const k of [...map.keys()]) { if (k.startsWith(pfx)) map.delete(k); } },
  };
})();

// Basis-Pfad-Cache (voller OneDrive-Pfad zum GED-Ordner)
let _odCurrentBasePath = null; // null = nicht geladen; '' = kein Basis-Pfad

async function _odGetBasePath() {
  if (_odCurrentBasePath !== null) return _odCurrentBasePath;
  _odCurrentBasePath = await idbGet('od_base_path').catch(() => null) ?? '';
  return _odCurrentBasePath;
}

// Relativen Pfad aus vollem OneDrive-Pfad berechnen (Basis-Präfix abschneiden)
function _odToRelPath(fullPath, basePath) {
  if (!basePath) return fullPath;
  if (fullPath === basePath) return '';
  if (fullPath.startsWith(basePath + '/')) return fullPath.slice(basePath.length + 1);
  return fullPath; // außerhalb der Basis: vollen Pfad behalten
}

// Migration: od_default_folder → od_photo_folder + od_base_path (einmalig, lazy)
async function _odMigrateIfNeeded() {
  if (await idbGet('od_photo_folder').catch(() => null)) {
    _odCurrentBasePath = await idbGet('od_base_path').catch(() => null) ?? '';
    return; // bereits migriert
  }
  const oldPhoto = await idbGet('od_default_folder').catch(() => null);
  if (!oldPhoto?.folderPath) return;
  const parts = oldPhoto.folderPath.split('/');
  const basePath = parts.length >= 2 ? parts.slice(0, -1).join('/') : '';
  const relPath  = parts.length >= 2 ? parts[parts.length - 1] : oldPhoto.folderPath;
  await idbPut('od_base_path', basePath).catch(() => {});
  _odCurrentBasePath = basePath;
  await idbPut('od_photo_folder', { id: oldPhoto.folderId, name: oldPhoto.folderName, relPath }).catch(() => {});
  const oldDoc = await idbGet('od_doc_folder').catch(() => null);
  if (oldDoc?.folderPath) {
    const docRel = _odToRelPath(oldDoc.folderPath, basePath);
    await idbPut('od_docs_folder', { id: oldDoc.folderId, name: oldDoc.folderName, relPath: docRel }).catch(() => {});
  }
  if (basePath && AppState.db) _odStripBaseFromPaths(basePath);
}

// m.file-Werte um Basis-Präfix bereinigen
function _odStripBaseFromPaths(basePath) {
  if (!basePath || !AppState.db) return;
  const pfx = basePath + '/';
  let changed = false;
  const strip = arr => arr?.forEach(m => { if (m.file?.startsWith(pfx)) { m.file = m.file.slice(pfx.length); changed = true; } });
  Object.values(AppState.db.individuals || {}).forEach(p => strip(p.media));
  Object.values(AppState.db.families || {}).forEach(f => { strip(f.marr?.media); strip(f.media); });
  Object.values(AppState.db.sources || {}).forEach(s => strip(s.media));
  if (changed) AppState.changed = true;
}

// Mediendatei per relativem Pfad laden — relPath relativ zu od_base_path
// Gibt Data-URL (base64) zurück
async function _odGetMediaUrlByPath(relPath) {
  if (!relPath || !_odIsConnected()) return null;
  const cacheKey = 'path:' + relPath;
  if (_odPhotoCache.has(cacheKey)) return _odPhotoCache.get(cacheKey);
  const token = await _odGetToken().catch(() => null);
  if (!token) return null;
  const basePath = await _odGetBasePath();
  const fullPath = basePath ? basePath + '/' + relPath : relPath;
  const _fetchDataUrl = async (path) => {
    const enc = path.replace(/\\/g, '/').split('/').map(s => encodeURIComponent(s)).join('/');
    const metaRes = await fetch(
      `${OD_GRAPH}/me/drive/root:/${enc}?$select=@microsoft.graph.downloadUrl`,
      { headers: { Authorization: 'Bearer ' + token } });
    if (!metaRes.ok) return null;
    const meta = await metaRes.json();
    const dlUrl = meta['@microsoft.graph.downloadUrl'];
    if (!dlUrl) return null;
    const r = await fetch(dlUrl);
    if (!r.ok) return null;
    const blob = await r.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };
  try {
    let dataUrl = await _fetchDataUrl(fullPath);
    if (!dataUrl && relPath.includes('\\')) {
      // Fallback: Windows-Pfade aus GEDCOM-Dateien anderer Software (Trennzeichen \)
      const photoFolder = await idbGet('od_photo_folder').catch(() => null);
      const basename = relPath.split('\\').pop();
      const photoRel = photoFolder?.relPath || '';
      const fallbackRel = photoRel ? photoRel + '/' + basename : basename;
      const fallbackFull = basePath ? basePath + '/' + fallbackRel : fallbackRel;
      dataUrl = await _fetchDataUrl(fallbackFull);
    }
    if (!dataUrl) return null;
    _odPhotoCache.set(cacheKey, dataUrl);
    return dataUrl;
  } catch(e) { console.warn('[OD] Mediendatei laden:', relPath, e); return null; }
}

// Mediendatei per relativem Pfad auf OneDrive hochladen (PUT)
// relPath: relativ zu od_base_path — wird als Ergebnis zurückgegeben
async function _odUploadMediaFile(b64DataUrl, relPath) {
  if (!b64DataUrl || !relPath || !_odIsConnected()) return null;
  const token = await _odGetToken().catch(() => null);
  if (!token) return null;
  const basePath = await _odGetBasePath();
  const fullPath = basePath ? basePath + '/' + relPath : relPath;
  try {
    const [header, data] = b64DataUrl.split(',');
    const mime = (header.match(/:(.*?);/) || [])[1] || 'image/jpeg';
    const raw  = atob(data);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    const encoded = fullPath.replace(/\\/g, '/').split('/').map(s => encodeURIComponent(s)).join('/');
    const res = await fetch(`${OD_GRAPH}/me/drive/root:/${encoded}:/content`,
      { method: 'PUT', headers: { Authorization: 'Bearer ' + token, 'Content-Type': mime }, body: blob });
    if (!res.ok) { console.warn('[OD] Upload fehlgeschlagen:', relPath, 'HTTP', res.status); return null; }
    const item = await res.json();
    return { path: relPath, fileId: item.id };
  } catch(e) { console.warn('[OD] Upload:', relPath, e); return null; }
}

// IDB-Key parsen → { isFam, id, idx, isHero }
function _parsePhotoKey(idbKey) {
  const isFam = idbKey.startsWith('photo_fam_');
  const s = idbKey.slice(isFam ? 'photo_fam_'.length : 'photo_'.length);
  const m = s.match(/^(.+)_(\d+)$/);
  return { isFam, id: m ? m[1] : s, idx: m ? +m[2] : 0, isHero: !m };
}

// Foto dynamisch aus OneDrive laden (Session-Cache → fileId-Map → fetch)
async function _odGetPhotoUrl(idbKey) {
  if (!_odIsConnected()) return null;
  if (_odPhotoCache.has(idbKey)) return _odPhotoCache.get(idbKey);
  const p = _parsePhotoKey(idbKey);
  const filemap = await idbGet('od_filemap').catch(() => null);
  const store   = p.isFam ? filemap?.families : filemap?.persons;
  const entries = store?.[p.id];
  if (!entries?.length) return null;
  const entry = p.isHero ? (entries.find(e => e.prim) || entries[0]) : (entries[p.idx] || null);
  if (!entry?.fileId) return null;
  const token = await _odGetToken().catch(() => null);
  if (!token) return null;
  try {
    const metaRes = await fetch(`${OD_GRAPH}/me/drive/items/${entry.fileId}?$select=@microsoft.graph.downloadUrl`,
      { headers: { Authorization: 'Bearer ' + token } });
    if (!metaRes.ok) return null;
    const meta = await metaRes.json();
    const dlUrl = meta['@microsoft.graph.downloadUrl'];
    if (!dlUrl) return null;
    const res = await fetch(dlUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    _odPhotoCache.set(idbKey, dataUrl);
    return dataUrl;
  } catch(e) { console.warn('[OD] Foto laden:', idbKey, e); return null; }
}

// OneDrive-URL für Quellenmedien laden
// Priorität: 1) GEDCOM-Pfad direkt (m.file via _odGetMediaUrlByPath)
//             2) Manueller filemap-Eintrag (od_filemap.sources) — Legacy
//             3) Basename-Abgleich gegen od_doc_filemap — Legacy
async function _odGetSourceFileUrl(srcId, idx) {
  if (!_odIsConnected()) return null;
  const cacheKey = 'src_' + srcId + '_' + idx;
  if (_odPhotoCache.has(cacheKey)) return _odPhotoCache.get(cacheKey);

  // 1. Direkt per Pfad (bevorzugt — kein separates Mapping nötig)
  const mfile = AppState.db.sources?.[srcId]?.media?.[idx]?.file;
  if (mfile) {
    const url = await _odGetMediaUrlByPath(mfile).catch(() => null);
    if (url) { _odPhotoCache.set(cacheKey, url); return url; }
  }

  // 2. Legacy: manuell verknüpfte fileId
  const filemap = await idbGet('od_filemap').catch(() => null);
  const fileId  = filemap?.sources?.[srcId]?.[idx]?.fileId
               || (() => {
                    if (!mfile) return null;
                    const basename = mfile.replace(/\\/g, '/').split('/').pop().toLowerCase();
                    return idbGet('od_doc_filemap').then(m => m?.[basename] || null).catch(() => null);
                  })();
  const resolvedId = fileId instanceof Promise ? await fileId : fileId;
  if (!resolvedId) return null;

  const token = await _odGetToken().catch(() => null);
  if (!token) return null;
  try {
    const metaRes = await fetch(`${OD_GRAPH}/me/drive/items/${resolvedId}?$select=@microsoft.graph.downloadUrl`,
      { headers: { Authorization: 'Bearer ' + token } });
    if (!metaRes.ok) return null;
    const meta = await metaRes.json();
    const dlUrl = meta['@microsoft.graph.downloadUrl'];
    if (!dlUrl) return null;
    const res = await fetch(dlUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    _odPhotoCache.set(cacheKey, dataUrl);
    return dataUrl;
  } catch(e) { console.warn('[OD] Quellenmedium laden:', srcId, idx, e); return null; }
}

// ── Settings ──────────────────────────────────────────────────────────────────

async function openSettings() {
  await _odMigrateIfNeeded();
  openModal('modalSettings');
  const odSection = document.getElementById('set-od-section');
  if (odSection) odSection.style.display = _odIsConnected() ? '' : 'none';
  const basePath = await _odGetBasePath();
  const baseEl = document.getElementById('set-base-path');
  if (baseEl) baseEl.value = basePath || '';
  // Foto-Ordner
  const photoFolder = await idbGet('od_photo_folder').catch(() => null);
  const nameEl  = document.getElementById('set-photo-name');
  const clearEl = document.getElementById('set-photo-clear');
  const cntEl   = document.getElementById('set-photo-count');
  if (nameEl) nameEl.textContent = photoFolder
    ? (photoFolder.relPath || photoFolder.name || '.') : 'nicht konfiguriert';
  if (clearEl) clearEl.style.display = photoFolder ? '' : 'none';
  if (cntEl) {
    let pCount = 0, fCount = 0;
    Object.values(AppState.db?.individuals || {}).forEach(p => { if (p.media?.length) pCount++; });
    Object.values(AppState.db?.families || {}).forEach(f => { if (f.marr?.media?.length || f.media?.length) fCount++; });
    cntEl.textContent = (pCount || fCount) ? `${pCount} Personen · ${fCount} Familien mit Medien` : '';
  }
  // Dokumente-Ordner
  const docFolder = await idbGet('od_docs_folder').catch(() => null);
  const dNameEl  = document.getElementById('set-doc-name');
  const dClearEl = document.getElementById('set-doc-clear');
  const dCntEl   = document.getElementById('set-doc-count');
  if (dNameEl) dNameEl.textContent = docFolder
    ? (docFolder.relPath || docFolder.name || '.') : 'nicht konfiguriert';
  if (dClearEl) dClearEl.style.display = docFolder ? '' : 'none';
  if (dCntEl) dCntEl.textContent = '';
}

async function odSetBasePath(val) {
  const bp = val.replace(/\/+$/, ''); // trailing slash entfernen
  await idbPut('od_base_path', bp).catch(() => {});
  _odCurrentBasePath = bp;
  _odPhotoCache.clear();
}

async function odClearPhotoFolder() {
  await idbDel('od_photo_folder').catch(() => {});
  await idbDel('od_base_path').catch(() => {});
  await idbDel('od_default_folder').catch(() => {});
  await idbDel('od_filemap').catch(() => {});
  _odCurrentBasePath = null;
  _odPhotoCache.clear();
  AppState.changed = true;
  showToast('Foto-Ordner zurückgesetzt');
  openSettings();
}

async function odClearDocFolder() {
  await idbDel('od_docs_folder').catch(() => {});
  await idbDel('od_doc_folder').catch(() => {});
  await idbDel('od_doc_filemap').catch(() => {});
  _odPhotoCache.clearByPrefix('src_');
  showToast('Dokumente-Ordner zurückgesetzt');
  openSettings();
}

// ── File I/O ──────────────────────────────────────────────────────────────────

async function odOpenFilePicker() {
  const token = await _odGetToken(); if (!token) return;
  showToast('Suche .ged-Dateien…');
  try {
    const res  = await fetch(`${OD_GRAPH}/me/drive/root/search(q='.ged')?select=id,name,lastModifiedDateTime,size&top=30`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const files = (data.value || []).filter(f => f.name.toLowerCase().endsWith('.ged'));
    if (!files.length) { showToast('Keine .ged-Dateien in OneDrive gefunden'); return; }
    const list = document.getElementById('odFileList');
    if (list) {
      list.innerHTML = files.map(f => {
        const date = new Date(f.lastModifiedDateTime).toLocaleDateString('de-DE');
        const kb   = Math.round((f.size || 0) / 1024);
        return `<div class="list-item" style="cursor:pointer"
          data-action="odLoadFile" data-odid="${esc(f.id)}" data-odname="${esc(f.name)}">
          <div style="font-weight:600;font-size:0.9rem">${esc(f.name)}</div>
          <div style="font-size:0.78rem;color:var(--text-dim)">${date} · ${kb} KB</div>
        </div>`;
      }).join('');
    }
    openModal('modalOneDrive');
  } catch(e) { showToast('OneDrive: ' + e.message); }
}

async function odLoadFile(itemId, fileName) {
  closeModal('modalOneDrive');
  const token = await _odGetToken(); if (!token) return;
  showToast('Lade ' + fileName + '…');
  try {
    const res = await fetch(`${OD_GRAPH}/me/drive/items/${itemId}/content`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    localStorage.setItem('od_file_id',   itemId);
    localStorage.setItem('od_file_name', fileName);
    _processLoadedText(await res.text(), fileName);
    // Startpfad (od_base_path) aus dem Ordner der GED-Datei ableiten
    try {
      const metaRes = await fetch(`${OD_GRAPH}/me/drive/items/${itemId}`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (metaRes.ok) {
        const meta = await metaRes.json();
        const rawPath = meta.parentReference?.path || '';
        const match   = rawPath.match(/\/drive\/root:\/(.*)/);
        const basePath = match ? decodeURIComponent(match[1]) : '';
        await idbPut('od_base_path', basePath).catch(() => {});
        _odCurrentBasePath = basePath;
        if (basePath) _odStripBaseFromPaths(basePath);
      }
    } catch(e) { console.warn('[OD] Basis-Pfad ermitteln:', e); }
    showToast('✓ ' + fileName + ' geladen');
  } catch(e) { showToast('OneDrive: Laden fehlgeschlagen — ' + e.message); }
}

async function odSaveFile() {
  showToast('Verbinde mit OneDrive…');
  const token = await _odGetToken();
  if (!token) { showToast('OneDrive: Anmeldung erforderlich'); return; }
  const fileId   = localStorage.getItem('od_file_id');
  const fileName = localStorage.getItem('od_file_name') || 'stammbaum.ged';
  let text;
  try { text = writeGEDCOM(true); } catch(e) { showToast('Fehler beim Schreiben: ' + e.message); return; }
  showToast('Speichere in OneDrive… (' + Math.round(text.length/1024) + ' KB)');
  try {
    const url = fileId
      ? `${OD_GRAPH}/me/drive/items/${fileId}/content`
      : `${OD_GRAPH}/me/drive/root:/Stammbaum/${encodeURIComponent(fileName)}:/content`;
    const ctrl = new AbortController();
    const _to = setTimeout(() => ctrl.abort(), 30000);
    const res = await fetch(url, {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'text/plain;charset=utf-8' },
      body: text,
      signal: ctrl.signal
    });
    clearTimeout(_to);
    if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + (await res.text().catch(()=>'')));
    const saved = await res.json().catch(() => ({}));
    if (!fileId && saved.id) localStorage.setItem('od_file_id', saved.id);
    AppState.changed = false; updateChangedIndicator();
    const _loc = saved.parentReference?.path ? saved.parentReference.path.replace('/drive/root:','') + '/' + saved.name : (saved.name || fileName);
    showToast('✓ In OneDrive gespeichert: ' + _loc);
  } catch(e) { showToast('OneDrive: Speichern fehlgeschlagen — ' + (e.name === 'AbortError' ? 'Timeout (30s)' : e.message)); }
}

// Auto-Load beim App-Start: lädt letzte bekannte Datei von OneDrive (kein Redirect bei Fehler)
async function odAutoLoadFromOneDrive() {
  const fileId   = localStorage.getItem('od_file_id');
  const fileName = localStorage.getItem('od_file_name') || 'stammbaum.ged';
  if (!fileId) return false;
  const token = await _odRefreshTokenSilent();
  if (!token) return false;
  const ctrl = new AbortController();
  const _to  = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`${OD_GRAPH}/me/drive/items/${fileId}/content`, {
      headers: { Authorization: 'Bearer ' + token }, signal: ctrl.signal
    });
    clearTimeout(_to);
    if (!res.ok) return false;
    _processLoadedText(await res.text(), fileName);
    _odUpdateUI();
    showToast('☁ ' + fileName + ' von OneDrive geladen');
    return true;
  } catch(e) {
    clearTimeout(_to);
    return false;
  }
}
