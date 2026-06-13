// boot-loader.js — App-Boot-Indikator (sw v951)
// Sichtbar von der ersten HTML-Parse-Phase bis zur ersten interaktiven Ansicht.
// Stages werden aus storage.js / storage-file.js gesetzt via window.bootStage().
// CSP-konform: kein Inline-Style/Script — Markup in index.html, CSS in styles.css.

(function () {
  var STAGES = {
    code:      { label: 'App-Code wird geladen …',      pct: 15 },
    init:      { label: 'App wird gestartet …',         pct: 30 },
    read:      { label: 'Daten werden gelesen …',       pct: 45 },
    parse:     { label: 'Stammbaum wird verarbeitet …', pct: 70 },
    render:    { label: 'Ansicht wird vorbereitet …',   pct: 90 },
  };

  function _el(id) { return document.getElementById(id); }

  function _setLabel(text) {
    var l = _el('bootLoaderLabel');
    if (l) l.textContent = text;
  }
  function _setPct(pct) {
    var f = _el('bootLoaderFill');
    if (f) f.style.width = Math.max(0, Math.min(100, pct)) + '%';
  }

  // Public: bootStage('key') ODER bootStage('Custom-Label', 50)
  window.bootStage = function (keyOrLabel, pctOrUndefined) {
    var s = STAGES[keyOrLabel];
    if (s) { _setLabel(s.label); _setPct(s.pct); return; }
    if (typeof keyOrLabel === 'string') _setLabel(keyOrLabel);
    if (typeof pctOrUndefined === 'number') _setPct(pctOrUndefined);
  };

  // Public: bootHide() — Loader ausblenden + nach Transition entfernen
  var _hidden = false;
  window.bootHide = function () {
    if (_hidden) return;
    _hidden = true;
    var box = _el('bootLoader');
    if (!box) return;
    _setPct(100);
    box.classList.add('boot-hidden');
    setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 320);
  };

  // Frühphase: Code lädt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { window.bootStage('code'); });
  } else {
    window.bootStage('code');
  }

  // Failsafe: wenn nach 30s kein bootHide gerufen wurde → trotzdem ausblenden
  setTimeout(function () { window.bootHide(); }, 30000);

  // BFCache-Rückkehr: Loader darf nicht hängenbleiben
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) window.bootHide();
  });
})();
