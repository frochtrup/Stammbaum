// lazy-loader.js — Shared helper für on-demand Script-Loading
// Vorbild: _cmpLoadScript() in ui-import-compare.js

function _lazyScript(src) {
  return new Promise(function(res, rej) {
    if (document.querySelector('script[src="' + src + '"]')) { res(); return; }
    const s = document.createElement('script');
    s.src     = src;
    s.onload  = res;
    s.onerror = function() { rej(new Error('Laden fehlgeschlagen: ' + src)); };
    document.head.appendChild(s);
  });
}

function _lazyScripts(srcs) {
  return srcs.reduce(function(p, s) {
    return p.then(function() { return _lazyScript(s); });
  }, Promise.resolve());
}
