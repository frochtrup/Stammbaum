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

function showPersonPhotoPreview(b64) {
  const prev = document.getElementById('pf-photo-preview');
  const delBtn = document.getElementById('pf-photo-del');
  if (!prev) return;
  if (b64) {
    prev.innerHTML = `<img src="${b64}" alt="Foto" style="max-width:100%;max-height:200px;border-radius:8px;display:block;margin-bottom:6px">`;
    if (delBtn) delBtn.style.display = '';
  } else {
    prev.innerHTML = '';
    if (delBtn) delBtn.style.display = 'none';
  }
}

function clearPersonPhoto() {
  _pendingPhotoBase64 = null;
  showPersonPhotoPreview(null);
}

// Baut eine Map @Oxx@ → {file, title} aus db.extraRecords (lv=0 OBJE-Records)
function _buildObjeRefMap() {
  const map = {};
  for (const rec of (db.extraRecords || [])) {
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

// ─── Shared media helpers (FAM + SOUR) ───
function _showMediaPhotoPreview(prefix, b64) {
  const prev = document.getElementById(prefix + '-photo-preview');
  const del  = document.getElementById(prefix + '-photo-del');
  if (!prev) return;
  if (b64) {
    prev.innerHTML = '';
    const img = document.createElement('img');
    img.src = b64; img.alt = 'Foto';
    img.style.cssText = 'max-width:100%;max-height:200px;border-radius:8px;display:block;margin-bottom:6px';
    prev.appendChild(img);
    if (del) del.style.display = '';
  } else {
    prev.innerHTML = '';
    if (del) del.style.display = 'none';
  }
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
    btn.title = _canDirectSave
      ? 'Direkt speichern (Datei: ' + (localStorage.getItem('stammbaum_filename') || '') + ')'
      : 'Als Download speichern';
    if (_canDirectSave) btn.classList.add('direct-save');
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
    _fileHandle = fh;
    // Schreiberlaubnis anfragen (klappt auf Chrome; Safari: fällt auf read zurück)
    try {
      const perm = await fh.requestPermission({ mode: 'readwrite' });
      _canDirectSave = perm === 'granted' ? await testCanWrite(fh) : false;
    } catch(e) { _canDirectSave = false; }
    await idbPut('fileHandle', fh).catch(() => {});
    updateSaveIndicator();
    const file = await fh.getFile();
    _processLoadedText(await file.text(), file.name);
    const saveInfo = _canDirectSave ? ' · Direktes Speichern aktiv' : ' · Speichern via Download';
    showToast('✓ ' + file.name + ' geladen' + saveInfo);
  } catch(e) {
    if (e.name !== 'AbortError') showToast('⚠ Fehler beim Öffnen: ' + e.message);
  }
}

// Stellt _fileHandle aus IDB wieder her (nach Seitenreload).
async function restoreFileHandle() {
  if (!('showOpenFilePicker' in window)) return;
  try {
    const fh = await idbGet('fileHandle');
    if (!fh) return;
    const perm = await fh.queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') {
      _fileHandle = fh;
      _canDirectSave = await testCanWrite(fh);
      updateSaveIndicator();
    }
  } catch(e) {}
}

// Direkt in die geöffnete Datei schreiben.
// Bei NotAllowedError (iCloud-Lock): Toast mit Retry-Hinweis, kein Auto-Fallback.
async function saveToFileHandle(content) {
  let w = null;
  try {
    let perm = await _fileHandle.queryPermission({ mode: 'readwrite' });
    if (perm === 'prompt') perm = await _fileHandle.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
      _fileHandle = null; _canDirectSave = false;
      idbDel('fileHandle').catch(() => {});
      updateSaveIndicator();
      return false;
    }
    w = await _fileHandle.createWritable();
    await w.write(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    await w.close(); w = null;
    changed = false; updateChangedIndicator();
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
  const content  = writeGEDCOM();
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
          if (writeGEDCOM() === content) { changed = false; updateChangedIndicator(); }
          showToast('✓ Gespeichert');
        })
        .catch(err => { if (err.name !== 'AbortError') showToast('⚠ Fehler beim Teilen'); });
      return;
    }
  }

  // Chrome Desktop: Direkt speichern via gespeichertem File Handle
  if (!_fileHandle) {
    try {
      const stored = await idbGet('fileHandle');
      if (stored) {
        const perm = await stored.queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          _fileHandle = stored;
          _canDirectSave = await testCanWrite(stored);
          updateSaveIndicator();
        }
      }
    } catch(e) {}
  }

  if (_fileHandle && _canDirectSave) {
    const ok = await saveToFileHandle(content);
    if (ok) return;
    // NotAllowedError (Cloud-Sync-Lock): Nutzer soll es nochmals versuchen,
    // KEIN automatischer Fallback auf Download (würde verwirren).
    if (_canDirectSave) return; // Toast wurde bereits gezeigt
  }

  // Fallback 1: showOpenFilePicker war nicht verfügbar oder handle fehlt →
  // Datei öffnen lassen, dann direkt speichern
  if (!_fileHandle && 'showOpenFilePicker' in window) {
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
  changed = false; updateChangedIndicator();
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
  db = parseGEDCOM(orig);
  changed = false;
  _placesCache = null;
  updateChangedIndicator();
  updateStats();
  renderTab();
  showToast('✓ Zurückgesetzt');
}

function confirmNewFile() {
  if (changed) {
    if (!confirm('Sie haben ungespeicherte Änderungen. Trotzdem fortfahren?')) return;
  }
  db = { individuals: {}, families: {}, sources: {}, extraPlaces: loadExtraPlaces(), repositories: {}, notes: {}, placForm: '' };
  changed = false;
  updateChangedIndicator();
  _originalGedText = null;
  _fileHandle = null; _canDirectSave = false;
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
  _treeHistory = []; _treeHistoryPos = -1; _updateTreeBackBtn();
  showView('v-landing');
}

// Gemeinsame Lade-Logik für openDirectoryAndLoad() und readFile()
function _processLoadedText(text, filename) {
  db = parseGEDCOM(text);
  db.extraPlaces = loadExtraPlaces();
  // Kalibriere idCounter: verhindert Kollisionen mit bereits vorhandenen IDs
  { let maxUsed = 0;
    const allIds = [...Object.keys(db.individuals), ...Object.keys(db.families),
                    ...Object.keys(db.sources), ...Object.keys(db.repositories), ...Object.keys(db.notes)];
    for (const id of allIds) { const m = id.match(/\d+/); if (m) maxUsed = Math.max(maxUsed, +m[0]); }
    if (maxUsed >= idCounter) idCounter = maxUsed;
  }
  _originalGedText = text;  // immer in RAM; IDB für Persistenz
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

function loadDemo() {
  const demo = [
    '0 HEAD',
    '1 SOUR Demo Stammbaum',
    '1 GEDC',
    '2 VERS 5.5.1',
    '1 CHAR UTF-8',
    '1 PLAC',
    '2 FORM Ort, Kreis, Land',
    // ── Archiv ──
    '0 @R001@ REPO',
    '1 NAME Stadtarchiv München',
    '1 ADDR Winzererstraße 68\n2 CONT 80797 München',
    '1 WWW https://www.muenchen.de/stadtarchiv',
    // ── Quellen ──
    '0 @S001@ SOUR',
    '1 TITL Kirchenbuch München St. Peter 1845–1912',
    '1 ABBR KB München St. Peter',
    '1 AUTH Pfarramt St. Peter München',
    '1 REPO @R001@',
    '2 CALN KBM-1845-I',
    '1 OBJE @O003@',
    '0 @S002@ SOUR',
    '1 TITL Heiratsurkunde Standesamt München Nr. 142/1870',
    '1 ABBR StA München 1870',
    '1 AUTH Standesamt München',
    '1 REPO @R001@',
    '2 CALN SAM-1870-H-142',
    '0 @S003@ SOUR',
    '1 TITL Verlustliste Deutsches Heer, Verdun 1916',
    '1 ABBR Verlustliste 1916',
    '1 AUTH Kriegsarchiv München',
    // ── OBJE-Records (Mediendateien) ──
    '0 @O001@ OBJE',
    '1 FILE Fotos/Hochzeit_Johann_Maria_1870.jpg',
    '1 TITL Hochzeitsfoto Johann & Maria Müller, Juni 1870',
    '1 FORM JPEG',
    '0 @O002@ OBJE',
    '1 FILE Fotos/Portrait_Heinrich_Müller_1920.jpg',
    '1 TITL Portrait Heinrich Müller, ca. 1920',
    '1 FORM JPEG',
    '0 @O003@ OBJE',
    '1 FILE Scans/KB_Muenchen_1845_Taufe_Johann.jpg',
    '1 TITL Kirchenbuch-Eintrag Taufe Johann Müller 12. März 1845',
    '1 FORM JPEG',
    '0 @O004@ OBJE',
    '1 FILE Fotos/Hochzeit_Sophie_Ernst_1921.jpg',
    '1 TITL Hochzeitsfoto Sophie Müller & Ernst Fischer, 1921',
    '1 FORM JPEG',
    // ── Personen ──
    '0 @I001@ INDI',
    '1 NAME Johann /Müller/',
    '1 GIVN Johann',
    '1 SURN Müller',
    '1 SEX M',
    '1 BIRT',
    '2 DATE 12 MAR 1845',
    '2 PLAC München, München, Bayern',
    '2 SOUR @S001@',
    '3 PAGE Taufbuch 1845, S. 12',
    '3 QUAY 3',
    '1 DEAT',
    '2 DATE 3 NOV 1912',
    '2 PLAC München, München, Bayern',
    '1 BURI',
    '2 DATE 6 NOV 1912',
    '2 PLAC Ostfriedhof, München, Bayern',
    '1 OCCU Bäckermeister',
    '1 NOTE Johann Müller eröffnete 1873 eine eigene Bäckerei in der Sendlinger Straße. Nach dem Tod seiner ersten Frau heiratete er 1890 erneut.',
    '1 FAMS @F001@',
    '1 FAMS @F002@',
    '1 OBJE @O002@',
    '0 @I002@ INDI',
    '1 NAME Maria /Huber/',
    '1 GIVN Maria',
    '1 SURN Huber',
    '1 SEX F',
    '1 BIRT',
    '2 DATE 5 JUN 1850',
    '2 PLAC Augsburg, Augsburg, Bayern',
    '1 DEAT',
    '2 DATE 14 AUG 1888',
    '2 PLAC München, München, Bayern',
    '1 NOTE Maria starb mit 38 Jahren an Typhus und hinterließ einen Sohn.',
    '1 FAMS @F001@',
    '0 @I003@ INDI',
    '1 NAME Elisabeth /Bauer/',
    '1 GIVN Elisabeth',
    '1 SURN Bauer',
    '1 SEX F',
    '1 BIRT',
    '2 DATE 22 JAN 1855',
    '2 PLAC Landsberg, Landsberg, Bayern',
    '1 DEAT',
    '2 DATE 11 FEB 1935',
    '2 PLAC München, München, Bayern',
    '1 FAMS @F002@',
    '0 @I004@ INDI',
    '1 NAME Heinrich /Müller/',
    '1 GIVN Heinrich',
    '1 SURN Müller',
    '1 SEX M',
    '1 BIRT',
    '2 DATE 8 JAN 1872',
    '2 PLAC München, München, Bayern',
    '2 SOUR @S001@',
    '3 PAGE Taufbuch 1872, S. 47',
    '3 QUAY 3',
    '1 DEAT',
    '2 DATE 15 APR 1940',
    '2 PLAC München, München, Bayern',
    '1 OCCU Kaufmann',
    '1 RESI',
    '2 DATE ABT 1905',
    '2 PLAC Schwabing, München, Bayern',
    '1 FAMC @F001@',
    '1 FAMS @F003@',
    '1 OBJE @O002@',
    '0 @I005@ INDI',
    '1 NAME Anna /Schmidt/',
    '1 GIVN Anna',
    '1 SURN Schmidt',
    '1 SEX F',
    '1 BIRT',
    '2 DATE 22 SEP 1875',
    '2 PLAC Nürnberg, Nürnberg, Bayern',
    '1 DEAT',
    '2 DATE 8 MAR 1960',
    '2 PLAC München, München, Bayern',
    '1 FAMS @F003@',
    '0 @I006@ INDI',
    '1 NAME Karl /Müller/',
    '1 GIVN Karl',
    '1 SURN Müller',
    '1 SEX M',
    '1 BIRT',
    '2 DATE 14 JUL 1900',
    '2 PLAC München, München, Bayern',
    '1 DEAT',
    '2 DATE 2 SEP 1944',
    '2 PLAC Stalingrad, Wolgograd, Russland',
    '1 OCCU Schreiner',
    '1 FAMC @F003@',
    '1 FAMS @F006@',
    '0 @I007@ INDI',
    '1 NAME Sophie /Müller/',
    '1 GIVN Sophie',
    '1 SURN Müller',
    '1 SEX F',
    '1 BIRT',
    '2 DATE 3 MAR 1903',
    '2 PLAC München, München, Bayern',
    '1 DEAT',
    '2 DATE 27 DEC 1985',
    '2 PLAC München, München, Bayern',
    '1 NOTE Sophie heiratete zweimal: Ludwig Wagner fiel 1916 bei Verdun, woraufhin sie 1921 Ernst Fischer heiratete.',
    '1 FAMC @F003@',
    '1 FAMS @F004@',
    '1 FAMS @F005@',
    '0 @I008@ INDI',
    '1 NAME Max /Müller/',
    '1 GIVN Max',
    '1 SURN Müller',
    '1 SEX M',
    '1 BIRT',
    '2 DATE 30 APR 1891',
    '2 PLAC München, München, Bayern',
    '1 DEAT',
    '2 DATE 19 JUL 1950',
    '2 PLAC München, München, Bayern',
    '1 FAMC @F002@',
    '0 @I009@ INDI',
    '1 NAME Ludwig /Wagner/',
    '1 GIVN Ludwig',
    '1 SURN Wagner',
    '1 SEX M',
    '1 BIRT',
    '2 DATE 7 MAY 1892',
    '2 PLAC Würzburg, Würzburg, Bayern',
    '1 DEAT',
    '2 DATE 12 JUN 1916',
    '2 PLAC Verdun, Meuse, Frankreich',
    '2 SOUR @S003@',
    '3 QUAY 2',
    '1 NOTE Gefallen im Ersten Weltkrieg bei Verdun. Kriegsgräberstätte Verdun, Block 5, Grab 212.',
    '1 FAMS @F004@',
    '0 @I010@ INDI',
    '1 NAME Ernst /Fischer/',
    '1 GIVN Ernst',
    '1 SURN Fischer',
    '1 SEX M',
    '1 BIRT',
    '2 DATE 15 OCT 1890',
    '2 PLAC München, München, Bayern',
    '1 DEAT',
    '2 DATE 3 JAN 1960',
    '2 PLAC München, München, Bayern',
    '1 OCCU Lehrer',
    '1 FAMS @F005@',
    '0 @I011@ INDI',
    '1 NAME Rosa /Fischer/',
    '1 GIVN Rosa',
    '1 SURN Fischer',
    '1 SEX F',
    '1 BIRT',
    '2 DATE 9 JAN 1925',
    '2 PLAC München, München, Bayern',
    '1 FAMC @F005@',
    '0 @I012@ INDI',
    '1 NAME Margarete /Schuster/',
    '1 GIVN Margarete',
    '1 SURN Schuster',
    '1 SEX F',
    '1 BIRT',
    '2 DATE 18 JUN 1898',
    '2 PLAC Regensburg, Regensburg, Bayern',
    '1 FAMS @F006@',
    // ── Familien ──
    '0 @F001@ FAM',
    '1 HUSB @I001@',
    '1 WIFE @I002@',
    '1 CHIL @I004@',
    '1 MARR',
    '2 DATE 10 JUN 1870',
    '2 PLAC München, München, Bayern',
    '2 SOUR @S002@',
    '3 QUAY 3',
    '1 OBJE @O001@',
    '0 @F002@ FAM',
    '1 HUSB @I001@',
    '1 WIFE @I003@',
    '1 CHIL @I008@',
    '1 MARR',
    '2 DATE 15 MAR 1890',
    '2 PLAC München, München, Bayern',
    '1 NOTE Zweite Ehe von Johann Müller, zwei Jahre nach dem Tod seiner ersten Frau Maria.',
    '0 @F003@ FAM',
    '1 HUSB @I004@',
    '1 WIFE @I005@',
    '1 CHIL @I006@',
    '1 CHIL @I007@',
    '1 MARR',
    '2 DATE 5 APR 1898',
    '2 PLAC München, München, Bayern',
    '0 @F004@ FAM',
    '1 HUSB @I009@',
    '1 WIFE @I007@',
    '1 MARR',
    '2 DATE 22 AUG 1914',
    '2 PLAC München, München, Bayern',
    '1 NOTE Kriegsheirat kurz vor Ludwigs Einberufung. Er fiel 1916, die Ehe blieb kinderlos.',
    '0 @F005@ FAM',
    '1 HUSB @I010@',
    '1 WIFE @I007@',
    '1 CHIL @I011@',
    '1 ENGA',
    '2 DATE 25 DEC 1920',
    '1 MARR',
    '2 DATE 14 FEB 1921',
    '2 PLAC München, München, Bayern',
    '1 OBJE @O004@',
    '0 @F006@ FAM',
    '1 HUSB @I006@',
    '1 WIFE @I012@',
    '1 MARR',
    '2 DATE 12 SEP 1923',
    '2 PLAC München, München, Bayern',
    '0 TRLR'
  ].join('\n');

  db = parseGEDCOM(demo);
  db.extraPlaces = loadExtraPlaces();
  _originalGedText = demo;
  showStartView();
  showToast('✓ Demo geladen');

  // Platzhalter-Fotos per Canvas in IDB schreiben (sofort sichtbar)
  _loadDemoPhotos();
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
      db = parseGEDCOM(saved);
      db.extraPlaces = loadExtraPlaces();
      _originalGedText = (await idbGet('stammbaum_ged_backup')) || saved;
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
      db = parseGEDCOM(saved);
      db.extraPlaces = loadExtraPlaces();
      _originalGedText = localStorage.getItem('stammbaum_ged_backup') || saved;
      showStartView();
      updateBackupBtn();
      updateTopbarTitle(fname);
      showToast('✓ ' + fname + ' automatisch geladen');
      // Nach IDB migrieren
      idbPut('stammbaum_ged', saved).catch(() => {});
      idbPut('stammbaum_ged_backup', _originalGedText).catch(() => {});
      idbPut('stammbaum_filename', fname).catch(() => {});
      return true;
    }
  } catch(e) { /* kein Storage */ }
  return false;
}
window.addEventListener('load', async () => {
  const urlFile = new URLSearchParams(location.search).get('datei');
  if (urlFile) updateTopbarTitle(urlFile);
  await tryAutoLoad();
  restoreFileHandle(); updateSaveIndicator();

  // Service Worker registrieren (P3-4)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
});

// Multi-Tab-Erkennung: warnt wenn ein anderer Tab die Datei lädt oder speichert
window.addEventListener('storage', e => {
  if (e.key === 'stammbaum_ged' && e.newValue && Object.keys(db.individuals || {}).length) {
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
  for (const id of Object.keys(db.individuals)) {
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
    if (currentPersonId && photoMap[currentPersonId]) {
      const b64 = photoMap[currentPersonId];
      // Re-Validierung: nur echte data-URIs erlauben (verhindert XSS via innerHTML)
      if (typeof b64 === 'string' && b64.startsWith('data:image/')) {
        const el = document.getElementById('det-photo-' + currentPersonId);
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

