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
function updateTopbarTitle(filename, isGramps = false) {
  const el = document.getElementById('topbarFileName');
  if (el) el.textContent = filename ? ' · ' + filename : '';
  const badge = document.getElementById('grampsBadge');
  if (badge) badge.hidden = !isGramps;
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
    AppState._fileLastModified = file.lastModified;
    if (file.name.toLowerCase().endsWith('.gramps')) {
      // _loadGRAMPS setzt _canDirectSave=false — vorher sichern und danach wiederherstellen
      const savedHandle  = AppState._fileHandle;
      const savedCanSave = AppState._canDirectSave;
      await _loadGRAMPS(file);
      AppState._fileHandle     = savedHandle;
      AppState._canDirectSave  = savedCanSave;
      updateSaveIndicator();
      const saveInfo = savedCanSave ? ' · Direktes Speichern aktiv' : '';
      showToast('✓ ' + file.name + ' geladen' + saveInfo);
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
      try { AppState._fileLastModified = (await fh.getFile()).lastModified; } catch(_) {}
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
    const curFile = await AppState._fileHandle.getFile();
    if (AppState._fileLastModified && curFile.lastModified !== AppState._fileLastModified) {
      if (!confirm('Datei wurde extern verändert — trotzdem überschreiben?')) return false;
    }
    w = await AppState._fileHandle.createWritable();
    await w.write(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    await w.close(); w = null;
    try { AppState._fileLastModified = (await AppState._fileHandle.getFile()).lastModified; } catch(_) {}
    AppState.changed = false; updateChangedIndicator();
    idbPut('stammbaum_ged', content).catch(() => showToast('⚠ Offline-Speicher nicht verfügbar'));
    showToast('✓ Direkt gespeichert');
    return true;
  } catch(e) {
    if (w) { try { await w.abort(); } catch(_) {} }
    if (e.name === 'NotAllowedError') {
      showToast('⚠ Datei gesperrt (Cloud-Sync?) – nochmals versuchen');
    } else {
      console.error('saveToFileHandle:', e.name, e.message);
      showToast('⚠ Fehler beim Speichern: ' + (e.message || e.name));
    }
    return false;
  }
}

async function saveToFileHandleBinary(blob) {
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
    await w.write(blob);
    await w.close(); w = null;
    AppState.changed = false; updateChangedIndicator();
    showToast('✓ Direkt gespeichert');
    return true;
  } catch(e) {
    if (w) { try { await w.abort(); } catch(_) {} }
    if (e.name === 'NotAllowedError') {
      showToast('⚠ Datei gesperrt (Cloud-Sync?) – nochmals versuchen');
    } else {
      console.error('saveToFileHandleBinary:', e.name, e.message);
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
async function exportGEDCOM(forceGEDCOM = false, forceGed7 = false) {
  const isAnon  = AppState.privacyAnon;
  if (!forceGEDCOM && !isAnon && !forceGed7 && AppState.db?._grampsMaster) return exportGRAMPS(true);
  let content;
  try { content = writeGEDCOM(true, forceGed7); }
  catch(e) { showToast('⚠ Fehler beim Schreiben: ' + e.message, 'error'); return; }
  const filename = localStorage.getItem('stammbaum_filename') || 'stammbaum.ged';
  const basename = filename.replace(/\.ged$/i, '');
  // GED7 und Anon: nie Originaldatei überschreiben — immer Download mit Suffix
  const exportFilename = isAnon    ? `${basename}_anon.ged`
                       : forceGed7 ? `${basename}_ged7.ged`
                       : filename;
  const _forceDownload = isAnon || forceGed7;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  // iOS Safari: Share Sheet (Hauptdatei + Zeitstempel-Backup)
  if (isIOS && navigator.canShare) {
    const now        = new Date();
    const today      = now.toISOString().slice(0, 10);
    const time       = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const backupName = `${exportFilename.replace(/\.ged$/i, '')}_${today}_${time}.ged`;
    const mainFile   = new File([content], exportFilename, { type: 'text/plain' });
    const backupFile = new File([content], backupName,     { type: 'text/plain' });
    if (navigator.canShare({ files: [mainFile] })) {
      navigator.share({ files: [mainFile, backupFile], title: exportFilename })
        .then(() => {
          // Nur als gespeichert markieren wenn keine neuen Änderungen während
          // des Share-Dialogs gemacht wurden — und nur wenn nicht anonymisiert
          if (!_forceDownload && writeGEDCOM(true) === content) { AppState.changed = false; updateChangedIndicator(); }
          showToast(_forceDownload ? `✓ ${exportFilename} geteilt` : '✓ Gespeichert');
        })
        .catch(err => { if (err.name !== 'AbortError') showToast('⚠ Fehler beim Teilen'); });
      return;
    }
  }

  // Chrome Desktop: Direkt speichern via gespeichertem File Handle
  // Bei Anonymisierung/GED7 immer Download (nie Originaldatei überschreiben)
  if (!_forceDownload) {
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
      if (AppState._canDirectSave) return;
    }
    if (!AppState._fileHandle && 'showOpenFilePicker' in window) {
      showToast('Bitte Datei öffnen um direktes Speichern zu aktivieren');
    }
  }

  // Download (Safari Mac, Firefox, kein File Handle, Anon- oder GED7-Modus)
  _downloadBlob(content, exportFilename);
  if (!_forceDownload) {
    AppState.changed = false; updateChangedIndicator();
    idbPut('stammbaum_ged', content).catch(() => showToast('⚠ Offline-Speicher nicht verfügbar'));
  }
  const _dlLabel = isAnon    ? `✓ ${exportFilename} heruntergeladen (anonymisiert)`
                 : forceGed7 ? `✓ ${exportFilename} heruntergeladen (GEDCOM 7.0)`
                 : '✓ ' + exportFilename + ' heruntergeladen';
  showToast(_dlLabel);
}

// GRAMPS XML Export/Speichern (.gramps = gzip) — immer Download/Share (kein File Handle)
// asSave=true: Originalname ohne Zeitstempel (Speichern); false: Zeitstempel (Formatkonvertierung)
async function exportGRAMPS(asSave = false) {
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
  const outputName = asSave ? filename : filename.replace(/\.gramps$/, `_${ts}.gramps`);

  // Chrome Desktop: Direkt speichern via File Handle
  if (asSave && AppState._fileHandle && AppState._canDirectSave) {
    const ok = await saveToFileHandleBinary(blob);
    if (ok) return;
    if (AppState._canDirectSave) return;
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS && navigator.canShare) {
    const file = new File([blob], outputName, { type: 'application/octet-stream' });
    if (navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: outputName })
        .catch(err => { if (err.name !== 'AbortError') showToast('⚠ Fehler beim Teilen'); });
      return;
    }
  }

  // Download
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = outputName; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
  showToast('✓ ' + outputName + ' heruntergeladen');
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

// Post-parse: db-Objekt einbauen + UI auffrischen (Worker- und Sync-Pfad)
function _finishLoad(db, text, filename) {
  try {
    setDb(db);
    if (AppState.db.parseErrors && AppState.db.parseErrors.length > 0) {
      console.warn('[GEDCOM] ' + AppState.db.parseErrors.length + ' ungültige Zeile(n) übersprungen:', AppState.db.parseErrors);
      showToast('⚠ ' + AppState.db.parseErrors.length + ' ungültige GEDCOM-Zeile(n) übersprungen — Datei wurde trotzdem vollständig geladen');
    }
    const _gd = detectGRAMPS(text);
    AppState.db._grampsMaster = _gd.isGramps;
    if (_gd.isGramps) {
      setTimeout(() => showToast('GRAMPS-Export erkannt — Ortshierarchie und Tags nicht verfügbar; GRAMPS XML empfohlen'), 1200);
    }
    AppState._currentFilename = filename;
    AppState.db.extraPlaces = loadExtraPlaces();
    { const _ppt = AppState.db.parsedPlaceTrans || {};
      for (const [_pp, _tt] of Object.entries(_ppt)) {
        if (!AppState.db.extraPlaces[_pp]) AppState.db.extraPlaces[_pp] = { name: _pp, lati: null, long: null };
        if (_tt.length) AppState.db.extraPlaces[_pp].trans = _tt;
      }
    }
    applyAllExtraPlaceCoords();
    AppState.db.hofObjects = _mergeHofObjects(_derivedHofObjectsFromDb(AppState.db), loadHofObjects());
    { let maxUsed = 0;
      const allIds = [...Object.keys(AppState.db.individuals), ...Object.keys(AppState.db.families),
                      ...Object.keys(AppState.db.sources), ...Object.keys(AppState.db.repositories), ...Object.keys(AppState.db.notes)];
      for (const id of allIds) { const m = id.match(/\d+/); if (m) maxUsed = Math.max(maxUsed, +m[0]); }
      if (maxUsed >= AppState.idCounter) AppState.idCounter = maxUsed;
    }
    AppState._originalGedText = text;
    AppState._undoStack = [];
    AppState._redoStack = [];
    if (typeof _clearNavState === 'function') _clearNavState();
    if (typeof clearValidationResults === 'function') clearValidationResults();
    if (typeof invalidatePlacePersonIndex === 'function') invalidatePlacePersonIndex();
    UIState._hofCache = null;
    UIState._placesCache = null;
    Promise.all([
      idbPut('stammbaum_ged', text),
      idbPut('stammbaum_ged_backup', text),
      idbPut('stammbaum_filename', filename)
    ]).catch(() => showToast('⚠ Offline-Speicher (IndexedDB) nicht verfügbar — Daten nur im RAM'));
    updateTopbarTitle(filename);
    showStartView();
    showToast('✓ ' + filename + ' geladen');
  } catch(err) {
    console.error('_finishLoad:', err);
    showToast('⚠ Fehler beim Laden: ' + err.message);
  } finally {
    hideLoadingOverlay();
  }
}

// Gemeinsame Lade-Logik für openFilePicker() und readFile()
function _processLoadedText(text, filename) {
  showLoadingOverlay('GEDCOM wird eingelesen …');
  if (typeof Worker !== 'undefined') {
    const worker = new Worker('gedcom-worker.js');
    worker.onmessage = function(e) {
      if (e.data.type === 'progress') {
        if (typeof updateLoadingProgress === 'function') updateLoadingProgress(e.data.pct);
        document.getElementById('loadingMsg').textContent = 'GEDCOM wird eingelesen … ' + e.data.pct + ' %';
        return;
      }
      worker.terminate();
      if (e.data.type === 'error') {
        // Worker-Fehler → Sync-Fallback (z.B. bei veralteten Caches)
        console.warn('[WW-PARSER] Worker-Fehler, Sync-Fallback:', e.data.message);
        try { _finishLoad(parseGEDCOM(text), text, filename); }
        catch(e2) { hideLoadingOverlay(); showToast('⚠ Fehler beim Laden: ' + e2.message); }
        return;
      }
      // type === 'done'
      _finishLoad(e.data.db, text, filename);
    };
    worker.onerror = function(err) {
      console.warn('[WW-PARSER] Worker-Fehler, Sync-Fallback:', err.message);
      worker.terminate();
      try { _finishLoad(parseGEDCOM(text), text, filename); }
      catch(e2) { hideLoadingOverlay(); showToast('⚠ Fehler beim Laden: ' + e2.message); }
    };
    worker.postMessage({ type: 'parse', text: text });
  } else {
    // Sync-Fallback (kein Worker-Support)
    requestAnimationFrame(() => setTimeout(() => {
      try { _finishLoad(parseGEDCOM(text), text, filename); }
      catch(err) { hideLoadingOverlay(); showToast('⚠ Fehler beim Laden: ' + err.message); }
    }, 0));
  }
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
    } catch(err) { hideLoadingOverlay(); console.error('readFile:', err); showToast('⚠ Fehler beim Laden'); }
  };
  reader.readAsText(file, 'UTF-8');
}

// GRAMPS XML Import: parseGRAMPS() → AppState.db
async function _loadGRAMPS(file) {
  showLoadingOverlay('GRAMPS-Datei wird eingelesen …');
  try {
    const parsed = await parseGRAMPS(file);
    setDb(parsed);
    AppState._currentFilename = file.name;
    AppState.db.extraPlaces = loadExtraPlaces();
    applyAllExtraPlaceCoords();
    // hofObjects: GRAMPS-Parser liefert bereits aus placeObjects abgeleitete Einträge;
    // Nur gespeicherte Koordinaten für Adressen dieser Datei übernehmen (kein Leck aus anderen Dateien).
    AppState.db.hofObjects = _mergeHofObjects(parsed.hofObjects || {}, loadHofObjects());
    // Calibrate idCounter to avoid collisions
    if (parsed._idCounterMax >= AppState.idCounter) AppState.idCounter = parsed._idCounterMax + 1;
    AppState._originalGedText = null; // kein GEDCOM-Text verfügbar
    if (typeof clearValidationResults === 'function') clearValidationResults();
    if (typeof invalidatePlacePersonIndex === 'function') invalidatePlacePersonIndex();
    UIState._hofCache = null;
    UIState._placesCache = null;
    AppState._canDirectSave   = false;
    // Persist filename in localStorage for display
    const filename = file.name;
    AppState._currentFilename = filename;
    idbPut('stammbaum_filename', filename).catch(() => {});
    updateSaveIndicator();
    updateTopbarTitle(filename, true);
    showStartView();
    const n = Object.keys(db.individuals).length;
    const f = Object.keys(db.families).length;
    showToast(`✓ ${filename} geladen — ${n} Personen, ${f} Familien (GRAMPS, read-only)`);
  } catch(err) {
    console.error('_loadGRAMPS:', err);
    showToast('⚠ GRAMPS-Datei konnte nicht geladen werden: ' + err.message);
  } finally {
    hideLoadingOverlay();
  }
}

function openFileOrDir() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (!isIOS && 'showOpenFilePicker' in window) { openFilePicker(); }
  else { document.getElementById('fileInput2').click(); }
}

// ─────────────────────────────────────
//  THEME-VERWALTUNG
// ─────────────────────────────────────
function applyTheme(pref) {
  const html = document.documentElement;
  if (pref === 'light') html.dataset.theme = 'light';
  else if (pref === 'dark') html.dataset.theme = 'dark';
  else delete html.dataset.theme;
  document.querySelectorAll('.theme-seg button[data-theme]').forEach(b => {
    b.classList.toggle('active', b.dataset.theme === (pref || 'auto'));
  });
}

async function setThemePref(pref) {
  await idbPut('theme_pref', pref).catch(() => {});
  applyTheme(pref);
}
