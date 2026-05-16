'use strict';
// ==========================================
//  Zeitleiste — ui-timeline.js
// ==========================================

(function () {

// ── Öffentliche API ────────────────────────

window.showTimeline = function (pid, pushHistory) {
  pid = pid || AppState.currentPersonId;
  if (!pid || !getPerson(pid)) return;

  if (pushHistory !== false) {
    const cur = _captureCurrentNavState();
    if (cur) UIState._navHistory.push(cur);
    UIState._navFwdStack = [];
  }

  UIState._timelinePid = pid;
  const p = getPerson(pid);
  document.getElementById('tlTopTitle').textContent = p.name || pid;
  document.getElementById('tlFilterBar').innerHTML = '';
  document.getElementById('tlBody').innerHTML =
    '<p style="padding:2rem 1rem;color:var(--text-2,#888)">Zeitleiste wird geladen…</p>';

  showView('v-timeline');
  _updateNavBtns();
  _renderTimeline(pid);
};

// ── Internes Rendering (Platzhalter bis TL-4) ─

function _renderTimeline(pid) {
  const p = getPerson(pid);
  const events = _buildPersonEvents(pid);
  const years = events.map(e => e.year).filter(Boolean);
  const info = years.length
    ? `${years[0]}–${years[years.length - 1]} · ${events.length} Ereignisse`
    : 'Keine datierten Ereignisse';
  document.getElementById('tlBody').innerHTML =
    `<p style="padding:2rem 1rem;color:var(--text-2,#888)">${info}</p>`;
}

// ── Event-Extraktion (TL-2 Platzhalter) ───────

function _buildPersonEvents(pid) {
  return [];
}

})();
