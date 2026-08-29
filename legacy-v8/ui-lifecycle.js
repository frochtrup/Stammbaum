// ─────────────────────────────────────
//  PWA Lifecycle-Handler (P3-A3, ADR-025)
// ─────────────────────────────────────
// Saubere Trennung vom View-Routing: visibilitychange, pageshow, pagehide.
// Dieses File wird nach ui-views.js geladen (braucht renderTab, AppState, UIState).

// Zeitstempel des letzten „Hidden"-Ereignisses für ">60 s weg"-Heuristik
let _lifecycleHiddenAt = 0;

// ─── visibilitychange ────────────────────────────────────────────────────────
// K2 (P0): bei PWA-Resume (iOS Hintergrund → Vordergrund) defensive aufräumen:
// • stehengebliebener v-detail.scrollTop → Reset (Void-Artefakt)
// • stale Liste → renderTab (mit dirty-bit-Beschleunigung aus A2)
// A3 (P3): >60 s weg → alle Tabs als dirty markieren → safety re-render
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    _lifecycleHiddenAt = Date.now();
    return;
  }
  // >60 s im Hintergrund → alle Daten-Tabs als dirty markieren
  if (_lifecycleHiddenAt && (Date.now() - _lifecycleHiddenAt) > 60_000) {
    UIState._dirty = { persons: true, families: true, sources: true, places: true };
  }
  _lifecycleHiddenAt = 0;

  // scrollTop-Reset falls Detail-View aktiv
  if (AppState && AppState._detailActive) {
    const det = document.getElementById('v-detail');
    if (det) det.scrollTop = 0;
  }

  // Liste rendern (switchTab-dirty-Logik greift nicht hier → direkt)
  if (typeof renderTab === 'function') {
    const tab = AppState?.currentTab;
    if (tab) {
      renderTab();
      UIState._dirty = { ...(UIState._dirty || {}), [tab]: false };
    }
  }
});

// ─── pageshow ────────────────────────────────────────────────────────────────
// BFCache-Restore (iOS Safari/Chrome): Seite aus Cache wiederherstellt → State
// könnte veraltet sein (offene Datei, ungültiger AppState). Sicherster Weg: reload.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    // Seite aus BFCache → frisch laden damit AppState konsistent
    location.reload();
  }
});

// ─── pagehide ────────────────────────────────────────────────────────────────
// Letzte Chance vor Entladen: unflushed State in IDB sichern.
// Kein async/await erlaubt (pagehide ist synchron).
window.addEventListener('pagehide', () => {
  // _lastTabSel persistieren falls noch ausstehend (idbPut ist fire-and-forget)
  if (typeof _persistLastTabSel === 'function') _persistLastTabSel();
});
