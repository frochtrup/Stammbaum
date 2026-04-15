// ─────────────────────────────────────
//  REVERT / NEW FILE
// ─────────────────────────────────────
function revertToSaved() {
  const orig = _getOriginalText();
  if (!orig) { showToast('Kein gespeicherter Stand verfügbar'); return; }
  if (!confirm('Alle Änderungen verwerfen und zum zuletzt geladenen Stand zurücksetzen?')) return;
  AppState.db = parseGEDCOM(orig);
  if (AppState.db.parseErrors?.length) {
    console.warn('[GEDCOM] ' + AppState.db.parseErrors.length + ' ungültige Zeile(n) übersprungen:', AppState.db.parseErrors);
    showToast('⚠ ' + AppState.db.parseErrors.length + ' ungültige GEDCOM-Zeile(n) übersprungen — Datei wurde trotzdem vollständig geladen');
  }
  AppState.changed = false;
  UIState._placesCache = null;
  UIState._hofCache = null;
  if (typeof invalidatePlacePersonIndex === 'function') invalidatePlacePersonIndex();
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

// ─────────────────────────────────────
//  DEMO
// ─────────────────────────────────────
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

// ─────────────────────────────────────
//  AUTO-LOAD + STARTUP
// ─────────────────────────────────────

// Auto-load last file from IDB (primary) or localStorage (fallback/migration)
async function tryAutoLoad() {
  // IDB zuerst (kein Größenlimit)
  try {
    const saved = await idbGet('stammbaum_ged');
    if (saved && saved.length > 10) {
      const fname = (await idbGet('stammbaum_filename')) || localStorage.getItem('stammbaum_filename') || 'gespeicherte Datei';
      AppState.db = parseGEDCOM(saved);
      if (AppState.db.parseErrors?.length) {
        console.warn('[GEDCOM] ' + AppState.db.parseErrors.length + ' ungültige Zeile(n) übersprungen:', AppState.db.parseErrors);
        showToast('⚠ ' + AppState.db.parseErrors.length + ' ungültige GEDCOM-Zeile(n) übersprungen — Datei wurde trotzdem vollständig geladen');
      }
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
      if (AppState.db.parseErrors?.length) {
        console.warn('[GEDCOM] ' + AppState.db.parseErrors.length + ' ungültige Zeile(n) übersprungen:', AppState.db.parseErrors);
        showToast('⚠ ' + AppState.db.parseErrors.length + ' ungültige GEDCOM-Zeile(n) übersprungen — Datei wurde trotzdem vollständig geladen');
      }
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
  } else if (hasSession) {
    // Session-Token vorhanden, aber od_file_id fehlt (z.B. nach Cache-Leeren)
    // → Datei-Picker anbieten statt still auf IDB zurückfallen
    await tryAutoLoad();
    showToast('☁ OneDrive verbunden — bitte Datei öffnen (Menü → Aus OneDrive öffnen)');
  } else {
    await tryAutoLoad();
  }

  restoreFileHandle(); updateSaveIndicator();

  // Service Worker registrieren
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
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

// ─────────────────────────────────────
//  BACKUP
// ─────────────────────────────────────
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
