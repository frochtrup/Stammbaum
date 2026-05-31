/*
 * test-csp.js — CSP-Durchsetzungs-Selbsttest (CSP-DURCHSETZUNG, sw v795)
 *
 * Belegt statt behauptet: die strikte CSP (script-src/style-src 'self',
 * kein 'unsafe-inline') verwirft inline-`on*=`-Handler UND inline-`style=`
 * still. Solche Attribute in index.html sind toter, irreführender Code.
 *
 * Dieser Test scannt index.html und schlägt fehl, sobald ein inline-Event-
 * Handler (on*=) oder ein inline-style= auftaucht. So bleibt „CSP vollständig"
 * dauerhaft verifizierbar.
 *
 * Lauf (headless, kein Browser/User nötig):
 *   osascript -l JavaScript test-csp.js      (macOS JXA)
 *   node test-csp.js                          (falls node vorhanden)
 *
 * Exit 0 = sauber, Exit 1 = inline-Attribute gefunden.
 */
(function () {
  'use strict';

  // Exit-Code setzen: Node via process.exit; JXA (osascript) kennt kein
  // $.exit → ein uncaught throw liefert dort einen Nicht-Null-Exit-Code.
  function done(code, msg) {
    if (typeof process !== 'undefined' && process.exit) process.exit(code);
    if (code !== 0) throw new Error(msg || 'CSP-Selbsttest fehlgeschlagen');
  }

  // --- plattformneutrales Datei-Lesen (JXA bevorzugt, Node als Fallback) ---
  function readFile(path) {
    if (typeof ObjC !== 'undefined') {
      ObjC.import('Foundation');
      var s = $.NSString.stringWithContentsOfFileEncodingError(
        path, $.NSUTF8StringEncoding, null);
      return s ? s.js : null;
    }
    if (typeof require === 'function') {
      return require('fs').readFileSync(path, 'utf8');
    }
    throw new Error('Keine Datei-Lese-API verfügbar');
  }

  function dirOfScript() {
    // JXA: $.NSProcessInfo liefert argv; Node: __dirname
    if (typeof $ !== 'undefined' && $.NSProcessInfo) {
      var args = $.NSProcessInfo.processInfo.arguments;
      // letztes Argument ist der Skriptpfad bei `osascript file.js`
      var p = args.objectAtIndex(args.count - 1).js;
      var slash = p.lastIndexOf('/');
      return slash >= 0 ? p.substring(0, slash) : '.';
    }
    if (typeof __dirname !== 'undefined') return __dirname;
    return '.';
  }

  var base = dirOfScript();
  var idxPath = base + '/index.html';
  var html = readFile(idxPath);
  if (html == null) {
    console.log('FAIL: index.html nicht lesbar unter ' + idxPath);
    done(1, 'index.html nicht lesbar');
    return;
  }

  // inline-Event-Handler:  on<event>="..."  (z.B. onclick, oninput, onload)
  var onRe = /\son[a-z]+\s*=\s*"[^"]*"/g;
  // inline-Styles:  style="..."
  var styleRe = /\sstyle\s*=\s*"[^"]*"/g;

  var onHits = html.match(onRe) || [];
  var styleHits = html.match(styleRe) || [];

  // Zeilennummern für Diagnose ermitteln
  function locate(re) {
    var lines = html.split('\n');
    var hits = [];
    for (var i = 0; i < lines.length; i++) {
      var m = lines[i].match(re);
      if (m) hits.push((i + 1) + ': ' + m.join(' , ').slice(0, 120));
    }
    return hits;
  }

  var ok = true;
  if (onHits.length) {
    ok = false;
    console.log('FAIL: ' + onHits.length + ' inline-on*=-Handler (CSP-tot) in index.html:');
    locate(/\son[a-z]+\s*=\s*"[^"]*"/).forEach(function (h) { console.log('  ' + h); });
  }
  if (styleHits.length) {
    ok = false;
    console.log('FAIL: ' + styleHits.length + ' inline-style=-Attribute (CSP-tot) in index.html:');
    locate(/\sstyle\s*=\s*"[^"]*"/).forEach(function (h) { console.log('  ' + h); });
  }

  if (ok) {
    console.log('OK: index.html frei von inline-on*= und inline-style= — CSP lückenlos durchsetzbar.');
    done(0);
  } else {
    console.log('CSP-Selbsttest fehlgeschlagen: inline-Attribute → Event-Delegation (data-action) bzw. CSS-Klassen verwenden.');
    done(1, (onHits.length + styleHits.length) + ' inline-Attribute in index.html');
  }
})();
