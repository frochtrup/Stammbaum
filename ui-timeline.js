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
  const events = _buildPersonEvents(pid);
  const years = events.map(e => e.year);
  const info = years.length
    ? `${years[0]}–${years[years.length - 1]} · ${events.length} Ereignisse`
    : 'Keine datierten Ereignisse';
  document.getElementById('tlBody').innerHTML =
    `<p style="padding:2rem 1rem;color:var(--text-2,#888)">${info}</p>`;
}

// ── Event-Extraktion ───────────────────────────

function _buildPersonEvents(pid) {
  const p = getPerson(pid);
  if (!p) return [];
  const evs = [];

  // Sonder-Ereignisse
  const special = [
    ['birth', 'Geburt'],
    ['chr',   'Taufe'],
    ['death', 'Tod'],
    ['buri',  'Beerdigung'],
  ];
  for (const [key, label] of special) {
    const ev = p[key];
    if (ev?.seen && ev.date) {
      evs.push({ year: _dedupYearFromGed(ev.date), date: ev.date, label, type: key, place: ev.place || '' });
    }
  }

  // Reguläre Ereignisse
  for (const ev of (p.events || [])) {
    if (!ev.date) continue;
    const label = (EVENT_LABELS[ev.type] || ev.type) + (ev.value ? ': ' + ev.value : '');
    evs.push({ year: _dedupYearFromGed(ev.date), date: ev.date, label, type: 'event', place: ev.place || '' });
  }

  // Familien: Heirat + Kinder
  for (const famId of (p.fams || [])) {
    const f = getFamily(famId);
    if (!f) continue;
    if (f.marr?.seen && f.marr.date) {
      // Ehepartner-Name für das Label
      const partnerId = (p.id === f.husb) ? f.wife : f.husb;
      const partner = partnerId ? getPerson(partnerId) : null;
      const partnerName = partner ? (partner.surname || partner.given || '') : '';
      const label = 'Heirat' + (partnerName ? ': ' + partnerName : '');
      evs.push({ year: _dedupYearFromGed(f.marr.date), date: f.marr.date, label, type: 'marr', place: f.marr.place || '' });
    }
    for (const cid of (f.children || [])) {
      const c = getPerson(cid);
      if (!c?.birth?.seen || !c.birth.date) continue;
      const childName = c.given || c.name || cid;
      evs.push({ year: _dedupYearFromGed(c.birth.date), date: c.birth.date, label: 'Kind: ' + childName, type: 'child', place: c.birth.place || '' });
    }
  }

  return evs.filter(e => e.year !== null).sort((a, b) => a.year - b.year);
}

})();
