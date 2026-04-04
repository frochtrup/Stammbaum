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

// Medien-Datei direkt per relativem OneDrive-Pfad laden — ein Pfad, eine Datei
async function _odGetMediaUrlByPath(filePath) {
  if (!filePath || !_odIsConnected()) return null;
  const cacheKey = 'path:' + filePath;
  if (_odPhotoCache[cacheKey]) return _odPhotoCache[cacheKey];
  const token = await _odGetToken().catch(() => null);
  if (!token) return null;
  try {
    const encoded = filePath.replace(/\\/g, '/').split('/').map(s => encodeURIComponent(s)).join('/');
    const res = await fetch(`${OD_GRAPH}/me/drive/root:/${encoded}:/content`,
      { headers: { Authorization: 'Bearer ' + token } });
    if (!res.ok) return null;
    const url = URL.createObjectURL(await res.blob());
    _odPhotoCache[cacheKey] = url;
    return url;
  } catch { return null; }
}

// Ordner-Pfad per folderId aus OneDrive-API nachladen (für alte IDB-Einträge ohne folderPath)
async function _odResolveFolderPath(folderId, folderName) {
  const token = await _odGetToken().catch(() => null);
  if (!token) return folderName; // Fallback: nur Name
  try {
    const res = await fetch(`${OD_GRAPH}/me/drive/items/${folderId}?$select=id,name,parentReference`,
      { headers: { Authorization: 'Bearer ' + token } });
    if (!res.ok) return folderName;
    const item = await res.json();
    const pRef  = item.parentReference?.path || '';
    const match = pRef.match(/\/drive\/root:\/(.*)/);
    const parentPath = match ? decodeURIComponent(match[1]) : '';
    return parentPath ? parentPath + '/' + item.name : item.name;
  } catch { return folderName; }
}

// Medien-Datei per relativem Pfad auf OneDrive hochladen (PUT)
// Gibt { path, fileId } zurück — path = tatsächlicher relativer Pfad laut API-Antwort
async function _odUploadMediaFile(b64DataUrl, targetPath) {
  if (!b64DataUrl || !targetPath || !_odIsConnected()) return null;
  const token = await _odGetToken().catch(() => null);
  if (!token) return null;
  try {
    const [header, data] = b64DataUrl.split(',');
    const mime = (header.match(/:(.*?);/) || [])[1] || 'image/jpeg';
    const raw  = atob(data);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    const encoded = targetPath.replace(/\\/g, '/').split('/').map(s => encodeURIComponent(s)).join('/');
    const res = await fetch(`${OD_GRAPH}/me/drive/root:/${encoded}:/content`,
      { method: 'PUT', headers: { Authorization: 'Bearer ' + token, 'Content-Type': mime }, body: blob });
    if (!res.ok) return null;
    const item = await res.json();
    const pRef  = item.parentReference?.path || '';
    const match = pRef.match(/\/drive\/root:\/(.*)/);
    const folderRelPath = match ? decodeURIComponent(match[1]) : '';
    const actualPath = folderRelPath ? folderRelPath + '/' + item.name : item.name;
    return { path: actualPath, fileId: item.id };
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
    const res = await fetch(`${OD_GRAPH}/me/drive/items/${entry.fileId}/content`,
      { headers: { Authorization: 'Bearer ' + token } });
    if (!res.ok) return null;
    const url = URL.createObjectURL(await res.blob());
    _odPhotoCache[idbKey] = url;
    return url;
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
    const res = await fetch(`${OD_GRAPH}/me/drive/items/${resolvedId}/content`,
      { headers: { Authorization: 'Bearer ' + token } });
    if (!res.ok) return null;
    const url = URL.createObjectURL(await res.blob());
    _odPhotoCache[cacheKey] = url;
    return url;
  } catch { return null; }
}

// Quick-Import aus gespeichertem Standard-Ordner (kein Navigations-Dialog)
async function odImportFromDefaultFolder() {
  const folder = await idbGet('od_default_folder').catch(() => null);
  if (!folder) { showToast('Kein Standard-Ordner gesetzt — bitte Ordner auswählen'); odImportPhotos(); return; }
  await odImportPhotosFromFolder(folder.folderId, folder.folderName);
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
  openModal('modalSettings');
  const odSection = document.getElementById('set-od-section');
  if (odSection) odSection.style.display = _odIsConnected() ? '' : 'none';
  // Foto-Ordner
  const photoFolder = await idbGet('od_default_folder').catch(() => null);
  const nameEl  = document.getElementById('set-photo-name');
  const clearEl = document.getElementById('set-photo-clear');
  const cntEl   = document.getElementById('set-photo-count');
  if (nameEl) nameEl.textContent = photoFolder?.folderName || 'nicht konfiguriert';
  if (clearEl) clearEl.style.display = photoFolder ? '' : 'none';
  if (cntEl) {
    const filemap = await idbGet('od_filemap').catch(() => null);
    const pCount = Object.keys(filemap?.persons || {}).length;
    const fCount = Object.keys(filemap?.families || {}).length;
    cntEl.textContent = (pCount || fCount) ? `${pCount} Personen · ${fCount} Familien verknüpft` : '';
  }
  // Dokumente-Ordner
  const docFolder  = await idbGet('od_doc_folder').catch(() => null);
  const dNameEl  = document.getElementById('set-doc-name');
  const dClearEl = document.getElementById('set-doc-clear');
  const dCntEl   = document.getElementById('set-doc-count');
  if (dNameEl) dNameEl.textContent = docFolder?.folderName || 'nicht konfiguriert';
  if (dClearEl) dClearEl.style.display = docFolder ? '' : 'none';
  if (dCntEl) {
    const docMap = await idbGet('od_doc_filemap').catch(() => null);
    const n = docMap ? Object.keys(docMap).length : 0;
    dCntEl.textContent = n ? `${n} Dateien indiziert` : '';
  }
  // Lokale Pfade — wenn leer: aus GEDCOM-Medien auto-erkennen
  let photoBase = await idbGet('cfg_photo_base').catch(() => null);
  let docBase   = await idbGet('cfg_doc_base').catch(() => null);
  if (!photoBase && AppState.db) {
    photoBase = _detectMediaBase('photo') || '';
    if (photoBase) await idbPut('cfg_photo_base', photoBase).catch(() => {});
  }
  if (!docBase && AppState.db) {
    docBase = _detectMediaBase('doc') || '';
    if (docBase) await idbPut('cfg_doc_base', docBase).catch(() => {});
  }
  const pbEl = document.getElementById('set-photo-base');
  const dbEl = document.getElementById('set-doc-base');
  if (pbEl) pbEl.value = photoBase || '';
  if (dbEl) dbEl.value = docBase   || '';
}

function _detectMediaBase(type) {
  if (!AppState.db) return '';
  const paths = [];
  if (type === 'photo') {
    for (const p of Object.values(AppState.db.individuals || {}))
      for (const m of (p.media || [])) if (m.file) paths.push(m.file);
    for (const f of Object.values(AppState.db.families || {}))
      for (const m of (f.media || [])) if (m.file) paths.push(m.file);
  } else {
    for (const s of Object.values(AppState.db.sources || {}))
      for (const m of (s.media || [])) if (m.file) paths.push(m.file);
  }
  // Nur Pfade mit Verzeichnis-Trenner
  const dirs = paths
    .filter(f => f.includes('/'))
    .map(f => f.substring(0, f.lastIndexOf('/') + 1));
  if (!dirs.length) return '';
  // Häufigstes Verzeichnis als Basispfad
  const counts = {};
  for (const d of dirs) counts[d] = (counts[d] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

async function odClearPhotoFolder() {
  await idbDel('od_default_folder').catch(() => {});
  await idbDel('od_filemap').catch(() => {});
  Object.keys(_odPhotoCache).forEach(k => delete _odPhotoCache[k]);
  AppState.changed = true;
  showToast('Foto-Ordner zurückgesetzt');
  openSettings();
}

async function odClearDocFolder() {
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
  await _odShowFolder('root', 'OneDrive');
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
      const folderPath = [..._odFolderStack.map(f => f.name), folderName].join('/');
      html += files.map(f => `<div class="list-item" style="cursor:pointer"
          onclick="_odPickSelectFile('${esc(f.id)}','${esc(f.name)}','${esc(folderPath + '/' + f.name)}')">📄 &nbsp;${esc(f.name)}</div>`).join('');
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
    const parentName = parentPath.split('/').filter(Boolean).pop() || 'OneDrive';
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

    // Vollständigen relativen Ordner-Pfad (ab OneDrive-Root) speichern
    const folderPath = [..._odFolderStack.map(f => f.name), folderName]
      .filter(n => n !== 'OneDrive').join('/');
    await idbPut('od_filemap', filemap).catch(() => {});
    await idbPut('od_default_folder', { folderId, folderName, folderPath }).catch(() => {});
    // Session-Cache leeren (neu verknüpfte Fotos sollen frisch geladen werden)
    Object.keys(_odPhotoCache).forEach(k => delete _odPhotoCache[k]);

    // Aktuelle Ansicht sofort aktualisieren
    if (AppState.currentPersonId) {
      const url = await _odGetPhotoUrl('photo_' + AppState.currentPersonId).catch(() => null);
      if (url) {
        const el = document.getElementById('det-photo-' + AppState.currentPersonId);
        if (el) { el.style.display = ''; el.innerHTML = `<img src="${url}" alt="Foto" style="width:80px;height:96px;object-fit:cover;border-radius:8px;display:block;flex-shrink:0;cursor:pointer" onclick="showLightbox(this.src)">`; }
      }
    }
    if (AppState.currentFamilyId) {
      const url = await _odGetPhotoUrl('photo_fam_' + AppState.currentFamilyId).catch(() => null);
      if (url) {
        const el = document.getElementById('det-fam-photo-' + AppState.currentFamilyId);
        const av = document.getElementById('det-fam-avatar-' + AppState.currentFamilyId);
        if (el) { el.style.display = ''; el.innerHTML = `<img src="${url}" alt="Foto" style="width:80px;height:96px;object-fit:cover;border-radius:8px;display:block;flex-shrink:0;cursor:pointer" onclick="showLightbox(this.src)">`; }
        if (av) av.style.display = 'none';
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
  await _odShowFolder('root', 'OneDrive');
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
    const docFolderPath = [..._odFolderStack.map(f => f.name), folderName]
      .filter(n => n !== 'OneDrive').join('/');
    await idbPut('od_doc_filemap', docMap).catch(() => {});
    await idbPut('od_doc_folder', { folderId, folderName, folderPath: docFolderPath }).catch(() => {});
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
  const folderKey = (_editMediaType === 'source') ? 'od_doc_folder' : 'od_default_folder';
  const folder = await idbGet(folderKey).catch(() => null);
  _odPickStartedFromSubfolder = !!folder?.folderId;
  _odPickStartFolderId        = folder?.folderId || '';
  if (folder?.folderId) await _odShowFolder(folder.folderId, folder.folderName);
  else await _odShowFolder('root', 'OneDrive');
}

async function _addMediaToFilemap(storeKey, id, entry, atIdx) {
  try {
    const fm = await idbGet('od_filemap').catch(() => null) || { persons: {}, families: {}, sources: {} };
    if (!fm[storeKey]) fm[storeKey] = {};
    if (!fm[storeKey][id]) fm[storeKey][id] = [];
    if (atIdx !== undefined) {
      // An korrektem Index speichern, ggf. mit null auffüllen
      while (fm[storeKey][id].length <= atIdx) fm[storeKey][id].push(null);
      fm[storeKey][id][atIdx] = entry;
    } else {
      fm[storeKey][id].push(entry);
    }
    await idbPut('od_filemap', fm).catch(() => {});
    const pfx = storeKey === 'families' ? 'photo_fam_' + id : 'photo_' + id;
    Object.keys(_odPhotoCache).filter(k => k.startsWith(pfx)).forEach(k => delete _odPhotoCache[k]);
  } catch {}
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
  const folderKey = (_addMediaType === 'source') ? 'od_doc_folder' : 'od_default_folder';
  const folder = await idbGet(folderKey).catch(() => null);
  _odPickStartedFromSubfolder = !!folder?.folderId;
  _odPickStartFolderId        = folder?.folderId || '';
  if (folder?.folderId) await _odShowFolder(folder.folderId, folder.folderName);
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
