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
      types: [
        { description: 'GEDCOM-Datei', accept: { 'text/plain': ['.ged', '.GED'] } },
        { description: 'GRAMPS-Datei', accept: { 'application/octet-stream': ['.gramps'] } },
      ],
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
    if (file.name.toLowerCase().endsWith('.gramps')) {
      // GRAMPS: async path, no direct-save
      AppState._fileHandle = null; AppState._canDirectSave = false;
      updateSaveIndicator();
      await _loadGRAMPS(file);
    } else {
      _processLoadedText(await file.text(), file.name);
      const saveInfo = AppState._canDirectSave ? ' · Direktes Speichern aktiv' : ' · Speichern via Download';
      showToast('✓ ' + file.name + ' geladen' + saveInfo);
    }
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

// GRAMPS XML Export (.gramps = gzip) — immer Download/Share (kein File Handle)
async function exportGRAMPS() {
  if (!AppState.db) {
    showToast('⚠ Keine Datei geladen');
    return;
  }
  showToast('GRAMPS-Datei wird erstellt …');
  let blob;
  try {
    blob = await writeGRAMPS(AppState.db);
  } catch(e) {
    console.error('exportGRAMPS:', e);
    showToast('⚠ Fehler beim Erstellen: ' + e.message);
    return;
  }

  const rawName = localStorage.getItem('stammbaum_filename') || 'stammbaum.gramps';
  const filename = rawName.replace(/\.gramps$/i, '').replace(/\.ged$/i, '') + '.gramps';
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const ts  = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  const exportName = filename.replace(/\.gramps$/, `_${ts}.gramps`);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS && navigator.canShare) {
    const file = new File([blob], exportName, { type: 'application/octet-stream' });
    if (navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: exportName })
        .catch(err => { if (err.name !== 'AbortError') showToast('⚠ Fehler beim Teilen'); });
      return;
    }
  }

  // Download
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = exportName; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
  showToast('✓ ' + exportName + ' heruntergeladen');
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

// Gemeinsame Lade-Logik für openFilePicker() und readFile()
function _processLoadedText(text, filename) {
  AppState.db = parseGEDCOM(text);
  if (AppState.db.parseErrors && AppState.db.parseErrors.length > 0) {
    console.warn('[GEDCOM] ' + AppState.db.parseErrors.length + ' ungültige Zeile(n) übersprungen:', AppState.db.parseErrors);
    showToast('⚠ ' + AppState.db.parseErrors.length + ' ungültige GEDCOM-Zeile(n) übersprungen — Datei wurde trotzdem vollständig geladen');
  }
  // GRAMPS-Export erkennen und Hinweis anzeigen
  const _gd = detectGRAMPS(text);
  AppState.db._grampsMaster = _gd.isGramps;
  if (_gd.isGramps) {
    setTimeout(() => showToast('GRAMPS-Export erkannt — Ortshierarchie und Tags nicht verfügbar; GRAMPS XML empfohlen'), 1200);
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
  if (typeof invalidatePlacePersonIndex === 'function') invalidatePlacePersonIndex();
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
  // GRAMPS XML (.gramps) — async path
  if (file.name.toLowerCase().endsWith('.gramps')) {
    _loadGRAMPS(file);
    return;
  }
  // GEDCOM — synchronous FileReader path
  const reader = new FileReader();
  reader.onload = e => {
    try {
      _processLoadedText(e.target.result, file.name);
      showToast('✓ ' + file.name + ' geladen');
    } catch(err) { console.error('readFile:', err); showToast('⚠ Fehler beim Laden'); }
  };
  reader.readAsText(file, 'UTF-8');
}

// GRAMPS XML Import: parseGRAMPS() → AppState.db
async function _loadGRAMPS(file) {
  showToast('GRAMPS-Datei wird geladen …');
  try {
    const db = await parseGRAMPS(file);
    AppState.db = db;
    AppState.db.extraPlaces = loadExtraPlaces();
    // Calibrate idCounter to avoid collisions
    if (db._idCounterMax >= AppState.idCounter) AppState.idCounter = db._idCounterMax + 1;
    AppState._originalGedText = null; // kein GEDCOM-Text verfügbar
    AppState._fileHandle      = null;
    if (typeof invalidatePlacePersonIndex === 'function') invalidatePlacePersonIndex();
    AppState._canDirectSave   = false;
    _newPhotoIds.clear();
    _deletedPhotoIds.clear();
    // Persist filename in localStorage for display
    const filename = file.name;
    try { localStorage.setItem('stammbaum_filename', filename); } catch(e) {}
    updateSaveIndicator();
    updateBackupBtn();
    updateTopbarTitle(filename);
    showStartView();
    const n = Object.keys(db.individuals).length;
    const f = Object.keys(db.families).length;
    showToast(`✓ ${filename} geladen — ${n} Personen, ${f} Familien (GRAMPS, read-only)`);
  } catch(err) {
    console.error('_loadGRAMPS:', err);
    showToast('⚠ GRAMPS-Datei konnte nicht geladen werden: ' + err.message);
  }
}

function openFileOrDir() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (!isIOS && 'showOpenFilePicker' in window) { openFilePicker(); }
  else { document.getElementById('fileInput2').click(); }
}
