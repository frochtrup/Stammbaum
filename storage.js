// ─────────────────────────────────────
//  EXTRA-PLACE COORDS PROPAGATION
// ─────────────────────────────────────
function applyAllExtraPlaceCoords() {
  UIState._placesCache = null; // Cache neu aufbauen mit aktuellem db + extraPlaces
  const places = collectPlaces();
  for (const p of Object.values(AppState.db.individuals)) {
    for (const ev of [p.birth, p.chr, p.death, p.buri, ...(p.events || [])]) {
      if (!ev || !ev.place || ev.lati != null) continue;
      const pl = places.get(ev.place.trim());
      if (pl?.lati != null) { ev.lati = pl.lati; ev.long = pl.long; }
    }
  }
  for (const f of Object.values(AppState.db.families)) {
    if (f.marr?.place && f.marr.lati == null) {
      const pl = places.get(f.marr.place.trim());
      if (pl?.lati != null) { f.marr.lati = pl.lati; f.marr.long = pl.long; }
    }
    if (f.engag?.place && f.engag.lati == null) {
      const pl = places.get(f.engag.place.trim());
      if (pl?.lati != null) { f.engag.lati = pl.lati; f.engag.long = pl.long; }
    }
  }
  UIState._placesCache = null; // Cache invalidieren damit Orte-Tab neu rendert
}

// ─────────────────────────────────────
//  REVERT / NEW FILE
// ─────────────────────────────────────

// Leitet hofObjects aus den geladenen Events ab (+ gespeicherte Koords/Notizen)
// und migriert Höfe → Farm-placeObjects (ADR-026). Für ALLE GEDCOM-Lade-Pfade
// (Datei, Demo, IDB-/localStorage-Restore) — sonst fehlten Hof-Koords/Notizen
// nach Reload und die Migration liefe nur bei explizitem Datei-Öffnen.
async function _deriveHofAndMigrate() {
  // placeObjects aus IDB (+OneDrive) laden, BEVOR die Hof-Migration läuft — sonst
  // gingen lokal eingegebene Hof-Koords/-Notizen (im Farm-PO) beim Reload verloren,
  // weil sie nicht in den GEDCOM-Events stehen. Merge ist additiv-per-id (überschreibt
  // nichts); die Migration findet geladene Farm-POs via _findFarmPO wieder (keine Dubletten).
  if (typeof loadPlaceObjectsFromIDB === 'function') { try { await loadPlaceObjectsFromIDB(); } catch(_) {} }
  AppState.db.hofObjects = _mergeHofObjects(_derivedHofObjectsFromDb(AppState.db), loadHofObjects());
  if (typeof _migrateHofObjectsToPlaceObjects === 'function') _migrateHofObjectsToPlaceObjects(AppState.db); // ADR-026 Phase 2
  // ADR-027 P3: Farm/Building-POs → V2-hofObjects + Events repointen + Farm-POs löschen.
  // Idempotent — bei wiederholtem Lauf erkennt der Norm-Key-Match bestehende V2-Höfe
  // und erzeugt keine Dubletten. Backup VOR der ersten Mutation (s. _backupPrePhase3).
  if (typeof _migrateFarmPOsToHofObjects === 'function') {
    try { await _backupPrePhase3(AppState.db); } catch(_) {}
    const stats = _migrateFarmPOsToHofObjects(AppState.db);
    if (stats.hofsCreated || stats.eventsRepointed || stats.posDeleted) {
      if (typeof showToast === 'function') {
        showToast('✓ ADR-027-Migration: ' + stats.hofsCreated + ' Höfe + '
          + stats.eventsRepointed + ' Events umgehängt', 'success');
      }
      if (typeof savePlaceObjects === 'function') savePlaceObjects();
    }
  }
}

// ADR-027 P3: Snapshot von placeObjects + Event-place/addr-Mapping VOR der ersten
// Migration. Im IDB unter Key stammbaum_orte_backup_pre_adr027_YYYYMMDD. Nur einmal
// pro Datum geschrieben (Datums-Schlüssel + Existenz-Check). Plus Marker
// AppState._adr027BackupKey für UI-Rollback-Button (Phase 5).
async function _backupPrePhase3(db) {
  if (!db) return;
  if (db._migration_pre_adr027) return;          // bereits gelaufen, kein Backup nötig
  // Hat die Datei überhaupt Farm/Building-POs zum Migrieren?
  const hasFarm = Object.values(db.placeObjects || {})
    .some(pl => pl.type === 'Farm' || pl.type === 'Building');
  if (!hasFarm) return;
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const key = 'stammbaum_orte_backup_pre_adr027_' + today;
  if (typeof idbGet === 'function') {
    try { if (await idbGet(key)) return; } catch(_) {}     // schon gesichert heute
  }
  const placeObjectsSnap = JSON.parse(JSON.stringify(db.placeObjects || {}));
  const eventsSnap = [];
  const _snapEv = (pid, kind, evIdx, ev) => {
    if (!ev || !ev.placeId) return;
    const pl = placeObjectsSnap[ev.placeId];
    if (!pl || (pl.type !== 'Farm' && pl.type !== 'Building')) return;
    eventsSnap.push({ pid, kind, evIdx, placeId: ev.placeId, addr: ev.addr || null,
      type: ev.type || null, date: ev.date || null, place: ev.place || null });
  };
  for (const p of Object.values(db.individuals || {})) {
    ['birth','chr','death','buri'].forEach(k => _snapEv(p.id, k, -1, p[k]));
    (p.events || []).forEach((ev, i) => _snapEv(p.id, 'events', i, ev));
  }
  for (const f of Object.values(db.families || {})) {
    ['marr','engag','div','divf'].forEach(k => _snapEv(f.id, k, -1, f[k]));
    (f.events || []).forEach((ev, i) => _snapEv(f.id, 'events', i, ev));
  }
  const payload = { schemaVersion: 1, _ts: new Date().toISOString(),
    placeObjects: placeObjectsSnap, events: eventsSnap };
  if (typeof idbPut === 'function') {
    try { await idbPut(key, JSON.stringify(payload)); AppState._adr027BackupKey = key; } catch(_) {}
  }
}

async function revertToSaved() {
  const orig = _getOriginalText();
  if (!orig) { showToast('Kein gespeicherter Stand verfügbar'); return; }
  if (!await confirmModal('Alle Änderungen verwerfen und zum zuletzt geladenen Stand zurücksetzen?', 'Verwerfen')) return;
  showLoadingOverlay('Stand wird wiederhergestellt …');
  try {
    setDb(parseGEDCOM(orig));
    AppState.db.extraPlaces = loadExtraPlaces();
    applyAllExtraPlaceCoords();
    await _deriveHofAndMigrate();
    if (AppState.db.parseErrors?.length) {
      console.warn('[GEDCOM] ' + AppState.db.parseErrors.length + ' ungültige Zeile(n) übersprungen:', AppState.db.parseErrors);
      showToast('⚠ ' + AppState.db.parseErrors.length + ' ungültige GEDCOM-Zeile(n) übersprungen — Datei wurde trotzdem vollständig geladen');
    }
    AppState.changed = false;
    AppState._undoStack = [];
    AppState._redoStack = [];
    UIState._placesCache = null;
    UIState._hofCache = null;
    UIState._personSortCache = null;
    UIState._searchIndexDirty = true;   // neu geparste Daten → Such-Index neu aufbauen
    if (typeof invalidatePlacePersonIndex === 'function') invalidatePlacePersonIndex();
    if (typeof _clearNavState === 'function') _clearNavState();
    updateChangedIndicator();
    renderTab();
    showToast('✓ Zurückgesetzt');
  } catch(e) {
    console.error('revertToSaved:', e);
    showToast('⚠ Fehler beim Zurücksetzen: ' + e.message, 'error');
  } finally {
    hideLoadingOverlay();
  }
}

async function confirmNewFile() {
  const msg = AppState.changed
    ? 'Aktuelle Datei schließen? Ungespeicherte Änderungen gehen verloren.'
    : 'Aktuelle Datei schließen?';
  if (!await confirmModal(msg, 'Schließen')) return;
  AppState._currentFilename = '';
  setDb({ individuals: {}, families: {}, sources: {}, extraPlaces: {}, hofObjects: {}, repositories: {}, notes: {}, placForm: '' });
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
  updateSaveIndicator();
  // Suchfelder, Jahresfilter und Baum-History zurücksetzen
  const si = document.getElementById('searchInput');     if (si) si.value = '';
  const yf = document.getElementById('yearFrom');        if (yf) yf.value = '';
  const yt = document.getElementById('yearTo');          if (yt) yt.value = '';
  const cb = document.getElementById('yearFilterClear'); if (cb) cb.hidden = true;
  if (typeof _clearNavState === 'function') _clearNavState(); else UIState._navHistory = [];
  if (typeof _updateNavBtns === 'function') _updateNavBtns(); else if (typeof _updateTreeBackBtn === 'function') _updateTreeBackBtn();
  showView('v-landing');
}

// ─────────────────────────────────────
//  DEMO
// ─────────────────────────────────────
async function loadDemo() {
  if (AppState.changed) {
    if (!await confirmModal('Demo laden verwirft alle ungespeicherten Änderungen.', 'Demo laden')) return;
  }
  showLoadingOverlay('Demo wird geladen …');
  try {
    const res = await fetch('./demo.ged');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    setDb(parseGEDCOM(text));
    AppState._currentFilename = 'demo.ged';
    AppState.db.extraPlaces = loadExtraPlaces();
    applyAllExtraPlaceCoords();
    await _deriveHofAndMigrate();
    AppState._originalGedText = text;
    if (typeof clearValidationResults === 'function') clearValidationResults();
    await _loadDemoPhotos();  // Foto in IDB bevor Detail gerendert wird
    showStartView();
    showToast('✓ Demo geladen');
    if (typeof maybeStartOnboarding === 'function') maybeStartOnboarding();
  } catch(e) {
    showToast('Demo konnte nicht geladen werden: ' + e.message);
  } finally {
    hideLoadingOverlay();
  }
}

function _loadDemoPhotos() {
  // Demo-Foto Anna.png laden und unter dem GEDCOM-Pfad im IDB ablegen
  return fetch('./Anna.png')
    .then(r => r.ok ? r.blob() : Promise.reject())
    .then(blob => new Promise((res, rej) => {
      const rd = new FileReader();
      rd.onload  = e => res(e.target.result);
      rd.onerror = rej;
      rd.readAsDataURL(blob);
    }))
    .then(dataUrl => idbPut('img:Anna.png', dataUrl).catch(() => {}))
    .catch(() => {});
}

// ─────────────────────────────────────
//  AUTO-LOAD + STARTUP
// ─────────────────────────────────────

// Auto-load last file from IDB (primary) or localStorage (fallback/migration)
async function tryAutoLoad() {
  // IDB zuerst (kein Größenlimit)
  try {
    if (typeof bootStage === 'function') bootStage('read');
    const saved = await idbGet('stammbaum_ged');
    if (saved && saved.length > 10) {
      const fname = (await idbGet('stammbaum_filename')) || localStorage.getItem('stammbaum_filename') || 'gespeicherte Datei';
      if (typeof bootStage === 'function') {
        bootStage('parse');
        // Yield, damit der Browser das Stage-Update zeichnet, bevor parseGEDCOM blockiert
        await new Promise(r => setTimeout(r, 0));
      }
      setDb(parseGEDCOM(saved));
      if (AppState.db.parseErrors?.length) {
        console.warn('[GEDCOM] ' + AppState.db.parseErrors.length + ' ungültige Zeile(n) übersprungen:', AppState.db.parseErrors);
        showToast('⚠ ' + AppState.db.parseErrors.length + ' ungültige GEDCOM-Zeile(n) übersprungen — Datei wurde trotzdem vollständig geladen');
      }
      AppState._currentFilename = fname;
      AppState.db.extraPlaces = loadExtraPlaces();
      applyAllExtraPlaceCoords();
      await _deriveHofAndMigrate();
      AppState._originalGedText = (await idbGet('stammbaum_ged_backup')) || saved;
      if (typeof bootStage === 'function') bootStage('render');
      showStartView();
      if (typeof _restoreNavState === 'function') _restoreNavState();
      updateTopbarTitle(fname);
      showToast('✓ ' + fname + ' automatisch geladen');
      if (typeof bootHide === 'function') bootHide();
      return true;
    }
  } catch(e) { /* IDB nicht verfügbar */ }
  // Fallback: localStorage (Migration für Nutzer vor S5/2026-04-27, kein IDB-Stand vorhanden)
  // TODO: Migration entfernen Q3/2026, wenn kein Nutzer mehr pre-S5-Daten in localStorage hat.
  try {
    const saved = localStorage.getItem('stammbaum_ged');
    const fname = localStorage.getItem('stammbaum_filename') || 'gespeicherte Datei';
    if (saved && saved.length > 10) {
      setDb(parseGEDCOM(saved));
      if (AppState.db.parseErrors?.length) {
        console.warn('[GEDCOM] ' + AppState.db.parseErrors.length + ' ungültige Zeile(n) übersprungen:', AppState.db.parseErrors);
        showToast('⚠ ' + AppState.db.parseErrors.length + ' ungültige GEDCOM-Zeile(n) übersprungen — Datei wurde trotzdem vollständig geladen');
      }
      AppState._currentFilename = fname;
      AppState.db.extraPlaces = loadExtraPlaces();
      applyAllExtraPlaceCoords();
      await _deriveHofAndMigrate();
      AppState._originalGedText = localStorage.getItem('stammbaum_ged_backup') || saved;
      if (typeof bootStage === 'function') bootStage('render');
      showStartView();
      if (typeof _restoreNavState === 'function') _restoreNavState();
      updateTopbarTitle(fname);
      showToast('✓ ' + fname + ' automatisch geladen');
      // Nach IDB migrieren
      idbPut('stammbaum_ged', saved).catch(() => {});
      idbPut('stammbaum_ged_backup', AppState._originalGedText).catch(() => {});
      idbPut('stammbaum_filename', fname).catch(() => {});
      if (typeof bootHide === 'function') bootHide();
      return true;
    }
  } catch(e) { /* kein Storage */ }
  return false;
}

// Startup-Dialog: Auswahl lokale Version vs. OneDrive
function _showStartupChoice() {
  const fname = (typeof _odCurFileName !== 'undefined' && _odCurFileName) || 'stammbaum.ged';
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
  if (typeof bootStage === 'function') bootStage('init');
  const urlFile = new URLSearchParams(location.search).get('datei');
  if (urlFile) updateTopbarTitle(urlFile);

  // Theme-Präferenz anwenden
  const themePref = await idbGet('theme_pref').catch(() => null);
  if (themePref) applyTheme(themePref);

  // Datenschutz: Anonymisierungs-Flag laden
  AppState.privacyAnon = !!(await idbGet('privacy_anon').catch(() => null));

  // Warten falls OAuth-Callback noch läuft (Rückkehr von Login-Redirect)
  if (window._odCallbackPromise) await window._odCallbackPromise;

  const hasOdFile  = await idbGet('od_file_id').catch(() => null);
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

  _initOfflineDiag();

  // Service Worker registrieren + Auto-Reload bei SW-Update (v1019).
  // controllerchange feuert, wenn eine neu installierte SW per skipWaiting+claim
  // die Kontrolle übernimmt. Wir laden die Seite dann automatisch neu, damit User
  // nicht unbestimmt lange auf altem Code arbeiten. Dirty-Schutz: wenn ungespeicherte
  // Änderungen vorliegen, wird der Reload zurückgestellt, bis der Stand sauber ist.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
    let _pendingReload = false;
    const _tryReload = () => {
      if (!_pendingReload) return;
      if (typeof AppState !== 'undefined' && AppState.changed) return; // ungespeicherte Änderungen → warten
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (_pendingReload) return; // Mehrfach-Trigger / Reload-Schleifen vermeiden
      _pendingReload = true;
      if (typeof AppState !== 'undefined' && AppState.changed) {
        if (typeof showToast === 'function') {
          showToast('Neue App-Version installiert — wird nach dem nächsten Speichern aktiv', 'info');
        }
        // Polling alle 3s, bis sauberer Zustand erreicht
        const _iv = setInterval(() => {
          if (typeof AppState === 'undefined' || !AppState.changed) {
            clearInterval(_iv);
            window.location.reload();
          }
        }, 3000);
      } else {
        // Sauberer Zustand → kurz puffern (SW-Settle), dann reload
        setTimeout(_tryReload, 500);
      }
    });
  }

  // Loader ausblenden, falls keiner der Auto-Load-Pfade ihn bereits geschlossen hat
  // (z. B. kein gespeicherter Stammbaum → Landing-Ansicht)
  if (typeof bootHide === 'function') bootHide();
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
          el.style.display = 'block';
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
