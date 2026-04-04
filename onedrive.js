// ─────────────────────────────────────
//  ONEDRIVE INTEGRATION (P3-8)
// ─────────────────────────────────────
const OD_CLIENT_ID = '688c9052-89c3-4d66-8ee0-c601e089336e';
const OD_SCOPES    = 'Files.ReadWrite offline_access User.Read';
const OD_AUTH_EP   = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const OD_TOKEN_EP  = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const OD_GRAPH     = 'https://graph.microsoft.com/v1.0';

// Session-Cache für dynamisch geladene Fotos (blob: URLs, nicht persistent)
const _odPhotoCache = {};

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
  if (_odPhotoCache[cacheKey]) return _odPhotoCache[cacheKey];
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
    _odPhotoCache[cacheKey] = dataUrl;
    return dataUrl;
  } catch { return null; }
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
    if (!res.ok) return null;
    const item = await res.json();
    return { path: relPath, fileId: item.id };
  } catch { return null; }
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
  if (_odPhotoCache[idbKey]) return _odPhotoCache[idbKey];
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
    _odPhotoCache[idbKey] = dataUrl;
    return dataUrl;
  } catch { return null; }
}

// OneDrive-URL für Quellenmedien laden
// Priorität: 1) GEDCOM-Pfad direkt (m.file via _odGetMediaUrlByPath)
//             2) Manueller filemap-Eintrag (od_filemap.sources) — Legacy
//             3) Basename-Abgleich gegen od_doc_filemap — Legacy
async function _odGetSourceFileUrl(srcId, idx) {
  if (!_odIsConnected()) return null;
  const cacheKey = 'src_' + srcId + '_' + idx;
  if (_odPhotoCache[cacheKey]) return _odPhotoCache[cacheKey];

  // 1. Direkt per Pfad (bevorzugt — kein separates Mapping nötig)
  const mfile = AppState.db.sources?.[srcId]?.media?.[idx]?.file;
  if (mfile) {
    const url = await _odGetMediaUrlByPath(mfile).catch(() => null);
    if (url) { _odPhotoCache[cacheKey] = url; return url; }
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
    _odPhotoCache[cacheKey] = dataUrl;
    return dataUrl;
  } catch { return null; }
}

// Quick-Import aus gespeichertem Standard-Ordner (kein Navigations-Dialog)
async function odImportFromDefaultFolder() {
  const folder = await idbGet('od_photo_folder').catch(() => null)
              || await idbGet('od_default_folder').catch(() => null);
  if (!folder) { showToast('Kein Standard-Ordner gesetzt — bitte Ordner auswählen'); odImportPhotos(); return; }
  await odImportPhotosFromFolder(folder.id || folder.folderId, folder.name || folder.folderName);
}

function _odRedirectUri() {
  // /Stammbaum/index.html → /Stammbaum/  (muss mit registrierter URI übereinstimmen)
  return location.origin + location.pathname.replace(/[^/]*$/, '');
}
function _odIsConnected()  { return !!localStorage.getItem('od_access_token'); }

function _odUpdateUI() {
  const conn = _odIsConnected();
  const cb  = document.getElementById('odConnectBtn');
  const ob  = document.getElementById('odOpenBtn');
  const sb  = document.getElementById('odSaveBtn');
  const stb = document.getElementById('odSettingsBtn');
  if (cb)  cb.innerHTML = (conn ? '☁ &nbsp; OneDrive trennen' : '☁ &nbsp; OneDrive verbinden');
  if (ob)  ob.style.display  = conn ? '' : 'none';
  if (sb)  sb.style.display  = conn ? '' : 'none';
  // Settings-Button immer sichtbar (enthält auch lokale Pfade)
}

async function openSettings() {
  await _odMigrateIfNeeded();
  openModal('modalSettings');
  const odSection = document.getElementById('set-od-section');
  if (odSection) odSection.style.display = _odIsConnected() ? '' : 'none';
  const basePath = await _odGetBasePath();
  const baseEl = document.getElementById('set-base-path');
  if (baseEl) baseEl.textContent = basePath || '—';
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

async function odClearPhotoFolder() {
  await idbDel('od_photo_folder').catch(() => {});
  await idbDel('od_base_path').catch(() => {});
  await idbDel('od_default_folder').catch(() => {});
  await idbDel('od_filemap').catch(() => {});
  _odCurrentBasePath = null;
  Object.keys(_odPhotoCache).forEach(k => delete _odPhotoCache[k]);
  AppState.changed = true;
  showToast('Foto-Ordner zurückgesetzt');
  openSettings();
}

async function odClearDocFolder() {
  await idbDel('od_docs_folder').catch(() => {});
  await idbDel('od_doc_folder').catch(() => {});
  await idbDel('od_doc_filemap').catch(() => {});
  Object.keys(_odPhotoCache).filter(k => k.startsWith('src_')).forEach(k => delete _odPhotoCache[k]);
  showToast('Dokumente-Ordner zurückgesetzt');
  openSettings();
}

function odToggle() { _odIsConnected() ? odLogout() : odLogin(); }

function odLogout() {
  ['od_access_token','od_refresh_token','od_token_expiry','od_file_id','od_file_name']
    .forEach(k => localStorage.removeItem(k));
  _odUpdateUI();
  showToast('OneDrive getrennt');
}

async function odLogin() {
  const verifier  = _odCodeVerifier();
  const challenge = await _odCodeChallenge(verifier);
  sessionStorage.setItem('od_verifier', verifier);
  const p = new URLSearchParams({
    client_id: OD_CLIENT_ID, response_type: 'code',
    redirect_uri: _odRedirectUri(), scope: OD_SCOPES,
    code_challenge: challenge, code_challenge_method: 'S256', response_mode: 'query'
  });
  location.href = OD_AUTH_EP + '?' + p;
}

function _odCodeVerifier() {
  const a = new Uint8Array(64); crypto.getRandomValues(a);
  return btoa(String.fromCharCode(...a)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}
async function _odCodeChallenge(v) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
  return btoa(String.fromCharCode(...new Uint8Array(d))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}

async function odHandleCallback() {
  const p     = new URLSearchParams(location.search);
  const code  = p.get('code');
  const error = p.get('error');
  history.replaceState({}, '', location.pathname);
  if (error || !code) { if (error) showToast('OneDrive: ' + (p.get('error_description') || error)); return; }
  const verifier = sessionStorage.getItem('od_verifier');
  sessionStorage.removeItem('od_verifier');
  if (!verifier) { showToast('OneDrive: Sitzung abgelaufen'); return; }
  try {
    const body = new URLSearchParams({
      client_id: OD_CLIENT_ID, grant_type: 'authorization_code',
      code, redirect_uri: _odRedirectUri(), code_verifier: verifier
    });
    const res  = await fetch(OD_TOKEN_EP, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body });
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('od_access_token', data.access_token);
      localStorage.setItem('od_refresh_token', data.refresh_token || '');
      localStorage.setItem('od_token_expiry',  Date.now() + (data.expires_in - 60) * 1000);
      _odUpdateUI();
      showToast('✓ OneDrive verbunden');
    } else {
      showToast('OneDrive: ' + (data.error_description || 'Anmeldung fehlgeschlagen'));
    }
  } catch(e) { showToast('OneDrive: Netzwerkfehler'); }
}

async function _odGetToken() {
  const expiry = parseInt(localStorage.getItem('od_token_expiry') || '0');
  if (Date.now() < expiry) return localStorage.getItem('od_access_token');
  const rt = localStorage.getItem('od_refresh_token');
  if (!rt) { odLogin(); return null; }
  try {
    const body = new URLSearchParams({
      client_id: OD_CLIENT_ID, grant_type: 'refresh_token',
      refresh_token: rt, scope: OD_SCOPES, redirect_uri: _odRedirectUri()
    });
    const res  = await fetch(OD_TOKEN_EP, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body });
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('od_access_token', data.access_token);
      if (data.refresh_token) localStorage.setItem('od_refresh_token', data.refresh_token);
      localStorage.setItem('od_token_expiry', Date.now() + (data.expires_in - 60) * 1000);
      return data.access_token;
    }
  } catch(e) {}
  odLogin(); return null;
}

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
          data-odid="${esc(f.id)}" data-odname="${esc(f.name)}"
          onclick="odLoadFile(this.dataset.odid, this.dataset.odname)">
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
      const metaRes = await fetch(`${OD_GRAPH}/me/drive/items/${itemId}?$select=id,name,parentReference`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (metaRes.ok) {
        const meta = await metaRes.json();
        const rawPath = meta.parentReference?.path || '';
        const match   = rawPath.match(/\/drive\/root:\/(.*)/);
        const basePath = match ? decodeURIComponent(match[1]) : '';
        console.log('[od_base_path] itemId:', itemId);
        console.log('[od_base_path] parentReference:', JSON.stringify(meta.parentReference));
        console.log('[od_base_path] rawPath:', rawPath);
        console.log('[od_base_path] match:', match);
        console.log('[od_base_path] basePath →', basePath);
        showToast('Basispfad: ' + (basePath || '(leer)'));
        await idbPut('od_base_path', basePath).catch(() => {});
        _odCurrentBasePath = basePath;
      } else {
        console.warn('[od_base_path] meta fetch fehlgeschlagen:', metaRes.status, await metaRes.text());
      }
    } catch(e) { console.error('[od_base_path] Fehler:', e); }
    showToast('✓ ' + fileName + ' geladen');
  } catch(e) { showToast('OneDrive: Laden fehlgeschlagen — ' + e.message); }
}

async function odSaveFile() {
  const token    = await _odGetToken(); if (!token) return;
  const text     = writeGEDCOM();
  const fileId   = localStorage.getItem('od_file_id');
  const fileName = localStorage.getItem('od_file_name') || 'stammbaum.ged';
  showToast('Speichere in OneDrive…');
  try {
    const url = fileId
      ? `${OD_GRAPH}/me/drive/items/${fileId}/content`
      : `${OD_GRAPH}/me/drive/root:/Stammbaum/${encodeURIComponent(fileName)}:/content`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'text/plain;charset=utf-8' },
      body:   text
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const saved = await res.json();
    if (!fileId && saved.id) localStorage.setItem('od_file_id', saved.id);
    AppState.changed = false; updateChangedIndicator();
    showToast('✓ In OneDrive gespeichert');
  } catch(e) { showToast('OneDrive: Speichern fehlgeschlagen — ' + e.message); }
}

// ── OneDrive Foto-Import ──────────────────────────────────────────────────

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
      html += `<div class="list-item" style="cursor:pointer;color:var(--gold)" onclick="_odFolderBack()">← Zurück</div>`;
    } else if (_isPickMode) {
      html += `<div class="list-item" style="cursor:pointer;color:var(--gold)" onclick="_odPickCancel()">← Abbrechen</div>`;
      if (_odPickStartedFromSubfolder) {
        html += `<div class="list-item" style="cursor:pointer;color:var(--text-dim);font-size:0.85rem" onclick="_odShowAllFolders()">↑ Übergeordneter Ordner</div>`;
      }
    }
    if (!_odPickMode && folderId !== 'root') {
      if (_odDocScanMode) {
        html += `<div class="list-item" style="cursor:pointer;font-weight:600;color:var(--gold);border:1px solid var(--gold-dim)"
          data-odid="${esc(folderId)}" data-odname="${esc(folderName)}"
          onclick="odScanDocFolder(this.dataset.odid,this.dataset.odname)">
          📂 Diesen Ordner als Dokumente-Ordner nutzen</div>`;
      } else {
        html += `<div class="list-item" style="cursor:pointer;font-weight:600;color:var(--gold);border:1px solid var(--gold-dim)"
          data-odid="${esc(folderId)}" data-odname="${esc(folderName)}"
          onclick="odImportPhotosFromFolder(this.dataset.odid,this.dataset.odname)">
          📥 Fotos aus diesem Ordner laden</div>`;
      }
    }
    if (folders.length === 0 && files.length === 0) {
      html += `<div style="color:var(--text-dim);font-size:0.85rem;padding:8px">Keine Einträge</div>`;
    } else {
      html += folders.map(f => `<div class="list-item" style="cursor:pointer"
          data-odid="${esc(f.id)}" data-odname="${esc(f.name)}"
          data-parentid="${esc(folderId)}" data-parentname="${esc(folderName)}"
          onclick="_odEnterFolder(this)">📁 &nbsp;${esc(f.name)}</div>`).join('');
      const _fullFolderPath = [..._odFolderStack.map(f => f.name), folderName]
        .filter(n => n !== 'OneDrive').join('/');
      const _relFolderPath = _odToRelPath(_fullFolderPath, _odCurrentBasePath || '');
      html += files.map(f => `<div class="list-item" style="cursor:pointer"
          onclick="_odPickSelectFile('${esc(f.id)}','${esc(f.name)}','${esc(_relFolderPath ? _relFolderPath + '/' + f.name : f.name)}')">📄 &nbsp;${esc(f.name)}</div>`).join('');
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
  } catch { await _odShowFolder('root', 'OneDrive'); }
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
          if (el) { el.style.display = ''; el.innerHTML = `<img src="${url}" alt="Foto" style="width:80px;height:96px;object-fit:cover;border-radius:8px;display:block;flex-shrink:0;cursor:pointer" onclick="showLightbox(this.src)">`; }
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
          if (el) { el.style.display = ''; el.innerHTML = `<img src="${url}" alt="Foto" style="width:80px;height:96px;object-fit:cover;border-radius:8px;display:block;flex-shrink:0;cursor:pointer" onclick="showLightbox(this.src)">`; }
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
  } catch {}
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

// OneDrive OAuth-Callback nach Redirect abfangen
if (location.search.includes('code=') || location.search.includes('error=')) {
  odHandleCallback();
}
_odUpdateUI();
