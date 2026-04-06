// ─────────────────────────────────────
//  INDEXEDDB HELPERS (für Dir-Handle)
// ─────────────────────────────────────
let _idb = null;
function _getIDB() {
  if (_idb) return Promise.resolve(_idb);
  return new Promise((res, rej) => {
    const r = indexedDB.open('stammbaum_app', 1);
    r.onupgradeneeded = e => e.target.result.createObjectStore('kv');
    r.onsuccess = e => { _idb = e.target.result; res(_idb); };
    r.onerror = rej;
  });
}
function idbGet(key) {
  return _getIDB().then(d => new Promise((res, rej) => {
    const r = d.transaction('kv','readonly').objectStore('kv').get(key);
    r.onsuccess = e => res(e.target.result); r.onerror = rej;
  }));
}
function idbPut(key, val) {
  return _getIDB().then(d => new Promise((res, rej) => {
    const r = d.transaction('kv','readwrite').objectStore('kv').put(val, key);
    r.onsuccess = () => res(); r.onerror = rej;
  }));
}
function idbDel(key) {
  return _getIDB().then(d => new Promise((res, rej) => {
    const r = d.transaction('kv','readwrite').objectStore('kv').delete(key);
    r.onsuccess = () => res(); r.onerror = rej;
  }));
}

// ─────────────────────────────────────
//  FOTO-HELPERS (Sprint P3-2)
//  Fotos werden ausschliesslich in IDB gespeichert (Key: photo_<personId>),
//  nicht im GEDCOM. Resize auf max 800px JPEG vor dem Speichern.
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
    // Versuch 1: createImageBitmap (unterstützt BMP/mehr Formate)
    if (typeof createImageBitmap === 'function') {
      createImageBitmap(file).then(bmp => {
        _drawAndResolve(bmp, resolve, reject);
      }).catch(() => {
        // Fallback: FileReader + <img>
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

// Baut eine Map @Oxx@ → {file, title} aus AppState.db.extraRecords (lv=0 OBJE-Records)
function _buildObjeRefMap() {
  const map = {};
  for (const rec of (AppState.db.extraRecords || [])) {
    if (!rec._lines || !rec._lines.length) continue;
    const hm = rec._lines[0].match(/^0 (@[^@]+@) OBJE$/);
    if (!hm) continue;
    const objId = hm[1];
    let file = '', title = '';
    for (let i = 1; i < rec._lines.length; i++) {
      const lm = rec._lines[i].match(/^1 (FILE|TITL) (.+)$/);
      if (lm) { if (lm[1] === 'FILE') file = lm[2]; else title = lm[2]; }
    }
    map[objId] = { file, title };
  }
  return map;
}

// Render editable media list into #<prefix>-media-list
function _renderMediaList(prefix, mediaArr) {
  const container = document.getElementById(prefix + '-media-list');
  if (!container) return;
  container.innerHTML = '';
  if (!mediaArr || !mediaArr.length) return;
  for (let i = 0; i < mediaArr.length; i++) {
    const m = mediaArr[i];
    if (!m.file && !m.title) continue;
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--border)';
    row.dataset.idx = i;
    const label = document.createElement('span');
    label.style.cssText = 'flex:1;font-size:0.82rem;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0';
    label.textContent = (m.title || m.file) + (m.title && m.file ? ' (' + m.file + ')' : '');
    label.title = (m.title ? m.title + '\n' : '') + (m.file || '');
    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = '×';
    del.className = 'btn btn-danger';
    del.style.cssText = 'padding:2px 8px;font-size:0.9rem;flex-shrink:0';
    del.onclick = () => { row.remove(); };
    row.appendChild(label);
    row.appendChild(del);
    container.appendChild(row);
  }
}

// Read media list from rendered DOM (keeping unmodified _extra/_form)
function _readMediaList(prefix, existingMedia) {
  const container = document.getElementById(prefix + '-media-list');
  if (!container) return existingMedia;
  const result = [];
  for (const row of container.children) {
    if (row.dataset.idx !== undefined) {
      const idx = parseInt(row.dataset.idx, 10);
      if (!isNaN(idx) && existingMedia[idx]) result.push(existingMedia[idx]);
    } else if (row.dataset.new) {
      result.push({ file: row.dataset.file || '', title: '', form: '', _extra: [] });
    }
  }
  return result;
}

function _addMediaEntry(prefix) {
  const fileInput = document.getElementById(prefix + '-media-add-file');
  const file = (fileInput?.value || '').trim();
  if (!file) { showToast('Bitte Dateinamen eingeben'); return; }
  const container = document.getElementById(prefix + '-media-list');
  if (!container) return;
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--border)';
  row.dataset.new = '1';
  row.dataset.file = file;
  const label = document.createElement('span');
  label.style.cssText = 'flex:1;font-size:0.82rem;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0';
  label.textContent = file;
  label.title = file;
  const del = document.createElement('button');
  del.type = 'button';
  del.textContent = '×';
  del.className = 'btn btn-danger';
  del.style.cssText = 'padding:2px 8px;font-size:0.9rem;flex-shrink:0';
  del.onclick = () => { row.remove(); };
  row.appendChild(label);
  row.appendChild(del);
  container.appendChild(row);
  if (fileInput) fileInput.value = '';
}

// ─────────────────────────────────────
//  FILE SYSTEM ACCESS (Chrome Desktop)
//  Strategie: showOpenFilePicker({ mode:'readwrite' }) beim Laden →
//             FileSystemFileHandle in IDB speichern →
//             createWritable() beim Speichern.
//  Funktioniert auf lokalen Laufwerken + iCloud Drive (Chrome).
//  Safari Mac/iOS unterstützt showOpenFilePicker nicht → <a download>.
// ─────────────────────────────────────

// Direktes Speichern möglich? Ändert Save-Button-Tooltip
function updateSaveIndicator() {
  document.querySelectorAll('[data-save-btn]').forEach(btn => {
    btn.title = AppState._canDirectSave
      ? 'Direkt speichern (Datei: ' + (localStorage.getItem('stammbaum_filename') || '') + ')'
      : 'Als Download speichern';
    if (AppState._canDirectSave) btn.classList.add('direct-save');
    else btn.classList.remove('direct-save');
  });
}
function updateTopbarTitle(filename) {
  const el = document.getElementById('topbarFileName');
  if (el) el.textContent = filename ? ' · ' + filename : '';
}

// Prüft ob createWritable() für diesen Handle tatsächlich funktioniert.
// Ruft createWritable() auf und bricht sofort ab (kein Schreiben).
async function testCanWrite(fh) {
  let w = null;
  try {
    w = await fh.createWritable();
    await w.abort();
    return true;
  } catch(e) {
    if (w) { try { await w.abort(); } catch(_) {} }
    return false;
  }
}

// Datei öffnen via showOpenFilePicker.
// Write-Permission wird danach per requestPermission angefragt.
async function openFilePicker() {
  try {
    const [fh] = await window.showOpenFilePicker({
      types: [{ description: 'GEDCOM-Datei', accept: { 'text/plain': ['.ged', '.GED'] } }],
      multiple: false
    });
    AppState._fileHandle = fh;
    // Schreiberlaubnis anfragen (klappt auf Chrome; Safari: fällt auf read zurück)
    try {
      const perm = await fh.requestPermission({ mode: 'readwrite' });
      AppState._canDirectSave = perm === 'granted' ? await testCanWrite(fh) : false;
    } catch(e) { AppState._canDirectSave = false; }
    await idbPut('fileHandle', fh).catch(() => {});
    updateSaveIndicator();
    const file = await fh.getFile();
    _processLoadedText(await file.text(), file.name);
    const saveInfo = AppState._canDirectSave ? ' · Direktes Speichern aktiv' : ' · Speichern via Download';
    showToast('✓ ' + file.name + ' geladen' + saveInfo);
  } catch(e) {
    if (e.name !== 'AbortError') showToast('⚠ Fehler beim Öffnen: ' + e.message);
  }
}

// Stellt AppState._fileHandle aus IDB wieder her (nach Seitenreload).
async function restoreFileHandle() {
  if (!('showOpenFilePicker' in window)) return;
  try {
    const fh = await idbGet('fileHandle');
    if (!fh) return;
    const perm = await fh.queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') {
      AppState._fileHandle = fh;
      AppState._canDirectSave = await testCanWrite(fh);
      updateSaveIndicator();
    }
  } catch(e) {}
}

// Direkt in die geöffnete Datei schreiben.
// Bei NotAllowedError (iCloud-Lock): Toast mit Retry-Hinweis, kein Auto-Fallback.
async function saveToFileHandle(content) {
  let w = null;
  try {
    let perm = await AppState._fileHandle.queryPermission({ mode: 'readwrite' });
    if (perm === 'prompt') perm = await AppState._fileHandle.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
      AppState._fileHandle = null; AppState._canDirectSave = false;
      idbDel('fileHandle').catch(() => {});
      updateSaveIndicator();
      return false;
    }
    w = await AppState._fileHandle.createWritable();
    await w.write(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    await w.close(); w = null;
    AppState.changed = false; updateChangedIndicator();
    try { localStorage.setItem('stammbaum_ged', content); } catch(e) {}
    idbPut('stammbaum_ged', content).catch(() => showToast('⚠ Offline-Speicher nicht verfügbar'));
    showToast('✓ Direkt gespeichert');
    return true;
  } catch(e) {
    if (w) { try { await w.abort(); } catch(_) {} }
    if (e.name === 'NotAllowedError') {
      // Datei möglicherweise durch Cloud-Sync gesperrt → Retry anbieten
      showToast('⚠ Datei gesperrt (Cloud-Sync?) – nochmals versuchen');
    } else {
      console.error('saveToFileHandle:', e.name, e.message);
      showToast('⚠ Fehler beim Speichern: ' + (e.message || e.name));
    }
    return false;
  }
}

function _downloadBlob(content, filename) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
}

// ─────────────────────────────────────
//  EXPORT / SPEICHERN
// ─────────────────────────────────────
async function exportGEDCOM() {
  const content  = writeGEDCOM(true);
  const filename = localStorage.getItem('stammbaum_filename') || 'stammbaum.ged';
  const isIOS    = /iPad|iPhone|iPod/.test(navigator.userAgent);

  // iOS Safari: Share Sheet (Hauptdatei + Zeitstempel-Backup)
  if (isIOS && navigator.canShare) {
    const basename   = filename.replace(/\.ged$/i, '');
    const now        = new Date();
    const today      = now.toISOString().slice(0, 10);
    const time       = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const backupName = `${basename}_${today}_${time}.ged`;
    const mainFile   = new File([content], filename,   { type: 'text/plain' });
    const backupFile = new File([content], backupName, { type: 'text/plain' });
    if (navigator.canShare({ files: [mainFile] })) {
      navigator.share({ files: [mainFile, backupFile], title: filename })
        .then(() => {
          // Nur als gespeichert markieren wenn keine neuen Änderungen während
          // des Share-Dialogs gemacht wurden (Race-Condition-Schutz)
          if (writeGEDCOM(true) === content) { AppState.changed = false; updateChangedIndicator(); }
          showToast('✓ Gespeichert');
        })
        .catch(err => { if (err.name !== 'AbortError') showToast('⚠ Fehler beim Teilen'); });
      return;
    }
  }

  // Chrome Desktop: Direkt speichern via gespeichertem File Handle
  if (!AppState._fileHandle) {
    try {
      const stored = await idbGet('fileHandle');
      if (stored) {
        const perm = await stored.queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          AppState._fileHandle = stored;
          AppState._canDirectSave = await testCanWrite(stored);
          updateSaveIndicator();
        }
      }
    } catch(e) {}
  }

  if (AppState._fileHandle && AppState._canDirectSave) {
    const ok = await saveToFileHandle(content);
    if (ok) return;
    // NotAllowedError (Cloud-Sync-Lock): Nutzer soll es nochmals versuchen,
    // KEIN automatischer Fallback auf Download (würde verwirren).
    if (AppState._canDirectSave) return; // Toast wurde bereits gezeigt
  }

  // Fallback 1: showOpenFilePicker war nicht verfügbar oder handle fehlt →
  // Datei öffnen lassen, dann direkt speichern
  if (!AppState._fileHandle && 'showOpenFilePicker' in window) {
    showToast('Bitte Datei öffnen um direktes Speichern zu aktivieren');
  }

  // Fallback 2: Download (Safari Mac, Firefox, kein File Handle)
  const basename = filename.replace(/\.ged$/i, '');
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const ts  = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  // Backup (Original) nur wenn Inhalt geändert
  const _origForExport = _getOriginalText();
  if (_origForExport && _origForExport !== content) {
    _downloadBlob(_origForExport, `${basename}_${ts}.ged`);
  }
  _downloadBlob(content, filename);
  AppState.changed = false; updateChangedIndicator();
  try { localStorage.setItem('stammbaum_ged', content); } catch(e) {}
  idbPut('stammbaum_ged', content).catch(() => showToast('⚠ Offline-Speicher nicht verfügbar'));
  showToast('✓ ' + filename + ' heruntergeladen');
}

// ─────────────────────────────────────
//  FILE LOADING
// ─────────────────────────────────────
document.getElementById('uploadBox').addEventListener('click', () => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (!isIOS && 'showOpenFilePicker' in window) { openFilePicker(); }
  else { document.getElementById('fileInput').click(); }
});
document.getElementById('fileInput').addEventListener('change', e => {
  if (e.target.files[0]) readFile(e.target.files[0]);
});
document.getElementById('uploadBox').addEventListener('dragover', e => {
  e.preventDefault(); e.currentTarget.classList.add('drag');
});
document.getElementById('uploadBox').addEventListener('dragleave', e => e.currentTarget.classList.remove('drag'));
document.getElementById('uploadBox').addEventListener('drop', e => {
  e.preventDefault(); e.currentTarget.classList.remove('drag');
  if (e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]);
});

document.getElementById('fileInput2').addEventListener('change', e => {
  if (e.target.files[0]) readFile(e.target.files[0]);
});

function revertToSaved() {
  const orig = _getOriginalText();
  if (!orig) { showToast('Kein gespeicherter Stand verfügbar'); return; }
  if (!confirm('Alle Änderungen verwerfen und zum zuletzt geladenen Stand zurücksetzen?')) return;
  AppState.db = parseGEDCOM(orig);
  AppState.changed = false;
  UIState._placesCache = null;
  updateChangedIndicator();
  updateStats();
  renderTab();
  showToast('✓ Zurückgesetzt');
}

function confirmNewFile() {
  if (AppState.changed) {
    if (!confirm('Sie haben ungespeicherte Änderungen. Trotzdem fortfahren?')) return;
  }
  AppState.db = { individuals: {}, families: {}, sources: {}, extraPlaces: loadExtraPlaces(), repositories: {}, notes: {}, placForm: '' };
  AppState.changed = false;
  updateChangedIndicator();
  AppState._originalGedText = null;
  AppState._fileHandle = null; AppState._canDirectSave = false;
  idbDel('fileHandle').catch(() => {});
  idbDel('stammbaum_ged').catch(() => {});
  idbDel('stammbaum_ged_backup').catch(() => {});
  idbDel('stammbaum_filename').catch(() => {});
  try {
    localStorage.removeItem('stammbaum_ged'); localStorage.removeItem('stammbaum_filename');
    localStorage.removeItem('stammbaum_ged_backup'); localStorage.removeItem('stammbaum_backup_filename'); localStorage.removeItem('stammbaum_backup_date');
  } catch(e) {}
  updateBackupBtn();
  updateSaveIndicator();
  // Suchfelder, Jahresfilter und Baum-History zurücksetzen
  const si = document.getElementById('searchInput');     if (si) si.value = '';
  const yf = document.getElementById('yearFrom');        if (yf) yf.value = '';
  const yt = document.getElementById('yearTo');          if (yt) yt.value = '';
  const cb = document.getElementById('yearFilterClear'); if (cb) cb.style.display = 'none';
  UIState._treeHistory = []; UIState._treeHistoryPos = -1; _updateTreeBackBtn();
  showView('v-landing');
}

// Gemeinsame Lade-Logik für openDirectoryAndLoad() und readFile()
function _processLoadedText(text, filename) {
  AppState.db = parseGEDCOM(text);
  if (AppState.db.parseErrors && AppState.db.parseErrors.length > 0) {
    console.warn('[GEDCOM] ' + AppState.db.parseErrors.length + ' ungültige Zeile(n) übersprungen:', AppState.db.parseErrors);
    showToast('⚠ ' + AppState.db.parseErrors.length + ' ungültige GEDCOM-Zeile(n) übersprungen — Details in der Konsole');
  }
  AppState.db.extraPlaces = loadExtraPlaces();
  // Kalibriere idCounter: verhindert Kollisionen mit bereits vorhandenen IDs
  { let maxUsed = 0;
    const allIds = [...Object.keys(AppState.db.individuals), ...Object.keys(AppState.db.families),
                    ...Object.keys(AppState.db.sources), ...Object.keys(AppState.db.repositories), ...Object.keys(AppState.db.notes)];
    for (const id of allIds) { const m = id.match(/\d+/); if (m) maxUsed = Math.max(maxUsed, +m[0]); }
    if (maxUsed >= AppState.idCounter) AppState.idCounter = maxUsed;
  }
  AppState._originalGedText = text;  // immer in RAM; IDB für Persistenz
  _newPhotoIds.clear(); _deletedPhotoIds.clear();
  // IDB: primäre Persistenz (kein Größenlimit)
  Promise.all([
    idbPut('stammbaum_ged', text),
    idbPut('stammbaum_ged_backup', text),
    idbPut('stammbaum_filename', filename)
  ]).catch(() => showToast('⚠ Offline-Speicher (IndexedDB) nicht verfügbar — Daten nur im RAM'));
  // localStorage: Fallback (kein Toast bei Fehler)
  try { localStorage.setItem('stammbaum_ged', text); } catch(e) {}
  try { localStorage.setItem('stammbaum_filename', filename); } catch(e) {}
  try { localStorage.setItem('stammbaum_ged_backup', text); } catch(e) {}
  try { localStorage.setItem('stammbaum_backup_filename', filename); } catch(e) {}
  try { localStorage.setItem('stammbaum_backup_date', new Date().toLocaleDateString('de-DE')); } catch(e) {}
  updateBackupBtn();
  updateTopbarTitle(filename);
  showStartView();
}

// Öffnen per <input> (iOS / Drag & Drop / Fallback)
function readFile(file) {
  if (file.size > 50 * 1024 * 1024) { showToast('⚠ Datei zu groß (max. 50 MB)'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    try {
      _processLoadedText(e.target.result, file.name);
      showToast('✓ ' + file.name + ' geladen');
    } catch(err) { console.error('readFile:', err); showToast('⚠ Fehler beim Laden'); }
  };
  reader.readAsText(file, 'UTF-8');
}

function openFileOrDir() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (!isIOS && 'showOpenFilePicker' in window) { openFilePicker(); }
  else { document.getElementById('fileInput2').click(); }
}

async function loadDemo() {
  try {
    const res = await fetch('./demo.ged');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    AppState.db = parseGEDCOM(text);
    AppState.db.extraPlaces = loadExtraPlaces();
    AppState._originalGedText = text;
    showStartView();
    showToast('✓ Demo geladen');
    _loadDemoPhotos();
  } catch(e) {
    showToast('Demo konnte nicht geladen werden: ' + e.message);
  }
}


function _loadDemoPhotos() {
  function _mkPhoto(text, bg, fg = '#fff') {
    try {
      const c = document.createElement('canvas');
      c.width = 320; c.height = 400;
      const ctx = c.getContext('2d');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 320, 400);
      // leichtes Verlauf-Overlay
      const g = ctx.createLinearGradient(0, 0, 0, 400);
      g.addColorStop(0, 'rgba(255,255,255,0.15)');
      g.addColorStop(1, 'rgba(0,0,0,0.25)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 320, 400);
      // Initiale/Symbol
      ctx.fillStyle = fg;
      ctx.font = 'bold 140px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 160, 185);
      // kleiner Untertitel-Balken
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 330, 320, 70);
      return c.toDataURL('image/jpeg', 0.82);
    } catch(e) { return null; }
  }
  const photos = [
    ['photo_@I001@',     'J',  '#5b3a20'],  // Johann — braun
    ['photo_@I004@',     'H',  '#1e3a5f'],  // Heinrich — dunkelblau
    ['photo_@I007@',     'S',  '#5b2a4a'],  // Sophie — violett
    ['photo_@I009@',     'L',  '#2e4a2e'],  // Ludwig — dunkelgrün (Uniform)
    ['photo_fam_@F001@', '♥',  '#7a3020'],  // Familie F001 — Hochzeitsrot
    ['photo_fam_@F005@', '♥',  '#3a5070'],  // Familie F005 — Stahlblau
  ];
  for (const [key, letter, color] of photos) {
    const b64 = _mkPhoto(letter, color);
    if (b64) idbPut(key, b64).catch(() => {});
  }
}

// Auto-load last file from IDB (primary) or localStorage (fallback/migration)
async function tryAutoLoad() {
  // IDB zuerst (kein Größenlimit)
  try {
    const saved = await idbGet('stammbaum_ged');
    if (saved && saved.length > 10) {
      const fname = (await idbGet('stammbaum_filename')) || localStorage.getItem('stammbaum_filename') || 'gespeicherte Datei';
      AppState.db = parseGEDCOM(saved);
      AppState.db.extraPlaces = loadExtraPlaces();
      AppState._originalGedText = (await idbGet('stammbaum_ged_backup')) || saved;
      showStartView();
      updateBackupBtn();
      updateTopbarTitle(fname);
      showToast('✓ ' + fname + ' automatisch geladen');
      return true;
    }
  } catch(e) { /* IDB nicht verfügbar */ }
  // Fallback: localStorage (Migration für bestehende Nutzer)
  try {
    const saved = localStorage.getItem('stammbaum_ged');
    const fname = localStorage.getItem('stammbaum_filename') || 'gespeicherte Datei';
    if (saved && saved.length > 10) {
      AppState.db = parseGEDCOM(saved);
      AppState.db.extraPlaces = loadExtraPlaces();
      AppState._originalGedText = localStorage.getItem('stammbaum_ged_backup') || saved;
      showStartView();
      updateBackupBtn();
      updateTopbarTitle(fname);
      showToast('✓ ' + fname + ' automatisch geladen');
      // Nach IDB migrieren
      idbPut('stammbaum_ged', saved).catch(() => {});
      idbPut('stammbaum_ged_backup', AppState._originalGedText).catch(() => {});
      idbPut('stammbaum_filename', fname).catch(() => {});
      return true;
    }
  } catch(e) { /* kein Storage */ }
  return false;
}
// Startup-Dialog: Auswahl lokale Version vs. OneDrive
function _showStartupChoice() {
  const fname = localStorage.getItem('od_file_name') || 'stammbaum.ged';
  document.getElementById('_startupChoiceName').textContent = fname;
  openModal('modalStartupChoice');
}
function _startupChoiceLocal() {
  closeModal('modalStartupChoice');
  tryAutoLoad();
}
async function _startupChoiceOneDrive() {
  closeModal('modalStartupChoice');
  // Kein Token in Session → OAuth-Redirect; nach Rückkehr auto-load
  sessionStorage.setItem('od_autoload_pending', '1');
  odLogin();
}

window.addEventListener('load', async () => {
  const urlFile = new URLSearchParams(location.search).get('datei');
  if (urlFile) updateTopbarTitle(urlFile);

  // Warten falls OAuth-Callback noch läuft (Rückkehr von Login-Redirect)
  if (window._odCallbackPromise) await window._odCallbackPromise;

  const hasOdFile  = localStorage.getItem('od_file_id');
  const hasSession = sessionStorage.getItem('od_refresh_token');
  const pendingLoad = sessionStorage.getItem('od_autoload_pending');

  if (pendingLoad && hasSession) {
    // Rückkehr von OAuth mit Auto-Load-Wunsch
    sessionStorage.removeItem('od_autoload_pending');
    const loaded = await odAutoLoadFromOneDrive();
    if (!loaded) { showToast('⚠ OneDrive nicht erreichbar — lokale Version geladen'); await tryAutoLoad(); }
  } else if (hasOdFile && hasSession) {
    // Gleiche Session → direkt von OneDrive laden (kein veralteten Stand zeigen)
    const loaded = await odAutoLoadFromOneDrive();
    if (!loaded) { showToast('⚠ OneDrive nicht erreichbar — lokale Version geladen'); await tryAutoLoad(); }
  } else if (hasOdFile) {
    // Neustart: bekannte OD-Datei, aber kein Token → Auswahl-Dialog
    _showStartupChoice();
  } else {
    await tryAutoLoad();
  }

  restoreFileHandle(); updateSaveIndicator();

  // Service Worker registrieren
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  // DEV: CSP-Verstösse im Menü anzeigen
  document.addEventListener('securitypolicyviolation', e => {
    const el = document.getElementById('menuSwState');
    if (el) el.textContent = 'CSP-Block: ' + (e.blockedURI || '?');
    console.warn('[CSP]', e.blockedURI, e.violatedDirective);
  });

  // DEV: aktiven SW-Cache anzeigen (nach geladen-Toast)
  const _showSwToast = () => {
    if (!('caches' in window)) return;
    caches.keys().then(keys => {
      const sw = keys.find(k => k.startsWith('stammbaum-'));
      showToast('DEV ' + (sw ? sw.replace('stammbaum-', 'sw ') : 'kein SW-Cache'));
    });
  };
  setTimeout(_showSwToast, 3400);
  // Auch bei SW-Wechsel (nach Reload mit neuem Cache)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => setTimeout(_showSwToast, 500));
  }
});

// Multi-Tab-Erkennung: warnt wenn ein anderer Tab die Datei lädt oder speichert
window.addEventListener('storage', e => {
  if (e.key === 'stammbaum_ged' && e.newValue && Object.keys(AppState.db.individuals || {}).length) {
    showToast('⚠ Datei wurde in einem anderen Tab geändert');
  }
});

// Desktop-Layout: bei Fensterverkleinerung unter 900px zurückschalten (P3-7)
window.addEventListener('resize', debounce(() => {
  const activeView = document.querySelector('.view.active');
  if (!activeView || activeView.id === 'v-landing') return;
  // Layout bei Fenster-Resize neu berechnen (Breakpoint 900px)
  showView(activeView.id);
}, 150));

function updateBackupBtn() {
  const btn = document.getElementById('backupMenuBtn');
  if (!btn) return;
  const fname = localStorage.getItem('stammbaum_backup_filename') || '';
  const date  = localStorage.getItem('stammbaum_backup_date') || '';
  const hasBackup = !!_getOriginalText();
  btn.style.opacity = hasBackup ? '1' : '0.4';
  btn.querySelector('span').textContent = hasBackup
    ? `Original-Backup herunterladen${date ? ' (' + date + ')' : ''}`
    : 'Original-Backup (keines vorhanden)';
}

function downloadBackup() {
  const backup = _getOriginalText();
  if (!backup) { showToast('⚠ Kein Backup vorhanden'); return; }
  const fname = localStorage.getItem('stammbaum_backup_filename') || 'stammbaum.ged';
  const backupName = fname.replace(/\.ged$/i, '') + '_original.ged';
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS && navigator.canShare) {
    const file = new File([backup], backupName, { type: 'text/plain' });
    if (navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: backupName }).catch(() => {});
      return;
    }
  }
  const blob = new Blob([backup], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = backupName; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
  showToast('✓ Original-Backup heruntergeladen');
}

// ─────────────────────────────────────
//  FOTO EXPORT / IMPORT (Sprint P3-2)
//  Sidecar-JSON: { "@I001@": "data:image/jpeg;base64,...", ... }
// ─────────────────────────────────────
async function exportPhotos() {
  const photoMap = {};
  for (const id of Object.keys(AppState.db.individuals)) {
    const b64 = await idbGet('photo_' + id).catch(() => null);
    if (b64) photoMap[id] = b64;
  }
  if (!Object.keys(photoMap).length) { showToast('Keine Fotos gespeichert'); return; }
  const json = JSON.stringify(photoMap);
  const baseName = (localStorage.getItem('stammbaum_filename') || 'stammbaum').replace(/\.ged$/i, '');
  const fname = baseName + '_photos.json';
  const blob = new Blob([json], { type: 'application/json' });
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS && navigator.canShare) {
    const file = new File([blob], fname, { type: 'application/json' });
    if (navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: fname }).catch(() => {});
      return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fname; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
  showToast('✓ ' + Object.keys(photoMap).length + ' Fotos exportiert');
}

function importPhotos() {
  document.getElementById('photoImportInput').click();
}

async function _handlePhotoImport(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const photoMap = JSON.parse(text);
    let count = 0;
    for (const [id, b64] of Object.entries(photoMap)) {
      if (typeof b64 === 'string' && b64.startsWith('data:image/')) {
        const ok = await idbPut('photo_' + id, b64).then(() => true).catch(() => false);
        if (ok) count++;
      }
    }
    showToast('✓ ' + count + ' Fotos importiert');
    // Detailansicht aktualisieren falls offen
    if (AppState.currentPersonId && photoMap[AppState.currentPersonId]) {
      const b64 = photoMap[AppState.currentPersonId];
      // Re-Validierung: nur echte data-URIs erlauben (verhindert XSS via innerHTML)
      if (typeof b64 === 'string' && b64.startsWith('data:image/')) {
        const el = document.getElementById('det-photo-' + AppState.currentPersonId);
        if (el) {
          el.style.display = '';
          el.innerHTML = '';
          const img = document.createElement('img');
          img.src = b64;
          img.alt = 'Foto';
          img.style.cssText = 'width:80px;height:96px;object-fit:cover;border-radius:8px;display:block;flex-shrink:0';
          el.appendChild(img);
        }
      }
    }
  } catch (e) {
    showToast('Fehler beim Importieren: ' + e.message);
  }
}

