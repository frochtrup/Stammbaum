/*
 * test-csp.js — CSP-Durchsetzungs-Selbsttest (CSP-DURCHSETZUNG, sw v795+)
 *
 * Zwei Scan-Stufen:
 *
 * A) HARD-FAIL — index.html:
 *    Kein inline-on*=-Handler und kein inline-style= erlaubt.
 *    Der Browser verwirft diese still; solche Attribute wären toter,
 *    irreführender Code.
 *
 * B) INFO-REPORT — ui-*.js-Template-Strings:
 *    style="..." in innerHTML-Strings werden vom Browser ebenfalls durch
 *    style-src 'self' blockiert. Dieser Block meldet verbleibende Fundstellen
 *    (Ziel: 0), schlägt aber noch nicht fehl — Bereinigung läuft schrittweise.
 *    Ausnahmen: Regex-Sanitizer-Zeilen (suchen style=, injizieren es nicht).
 *
 * Lauf (headless, kein Browser/User nötig):
 *   osascript -l JavaScript test-csp.js      (macOS JXA)
 *   node test-csp.js                          (falls node vorhanden)
 *
 * Exit 0 = index.html sauber (JS-Fundstellen sind INFO, kein Fail)
 * Exit 1 = inline-Attribute in index.html gefunden
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
  } else {
    console.log('CSP-Selbsttest fehlgeschlagen: inline-Attribute → Event-Delegation (data-action) bzw. CSS-Klassen verwenden.');
    done(1, (onHits.length + styleHits.length) + ' inline-Attribute in index.html');
  }

  // -------------------------------------------------------------------
  // B) INFO-REPORT: style="..." in JS-Template-Strings
  //    Browser blockiert diese genauso wie index.html-Attribute (style-src
  //    'self' ohne 'unsafe-inline'). Ziel: 0. Kein FAIL während Bereinigung.
  //    Ausnahmen (Regex-Sanitizer, kein echter Inject):
  //      ui-story-person.js  style="[^"]*"  (strip-Regex)
  //      ui-story-fam.js     style="[^"]*"  (strip-Regex)
  // -------------------------------------------------------------------
  function listJsFiles(dir) {
    var result = [];
    if (typeof ObjC !== 'undefined') {
      ObjC.import('Foundation');
      var fm = $.NSFileManager.defaultManager;
      var contents = fm.contentsOfDirectoryAtPathError(dir, null);
      if (!contents) return result;
      for (var i = 0; i < contents.count; i++) {
        var name = contents.objectAtIndex(i).js;
        if (/^ui-.*\.js$/.test(name)) result.push(dir + '/' + name);
      }
    } else if (typeof require === 'function') {
      var fs = require('fs');
      fs.readdirSync(dir).forEach(function (name) {
        if (/^ui-.*\.js$/.test(name)) result.push(dir + '/' + name);
      });
    }
    return result;
  }

  var jsFiles = listJsFiles(base);
  var jsTotal = 0;
  var jsReport = [];

  jsFiles.forEach(function (fpath) {
    var src = readFile(fpath);
    if (!src) return;
    var fname = fpath.replace(/.*\//, '');
    var lines = src.split('\n');
    var fileHits = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.indexOf('style="') === -1) continue;
      var trimmed = line.trim();
      // Kommentarzeilen überspringen
      if (trimmed.indexOf('//') === 0) continue;
      // data-il-style-Zeilen ohne echtes style= überspringen
      if (trimmed.indexOf('data-il-style') !== -1 && trimmed.indexOf(' style="') === -1) continue;
      // Regex-Sanitizer: style= als Suchmuster in .replace(/<...style=.../) — kein Inject
      if (trimmed.indexOf('.replace(') !== -1 && trimmed.indexOf('/') !== -1) continue;
      // Export-Only-Strings: werden als Download-HTML gebaut, nie per innerHTML in den DOM
      // injiziert (z.B. Story-Export mit inline-CSS für Standalone-HTML-Datei)
      if (trimmed.indexOf('_storyAsHTML') !== -1) continue;
      if (trimmed.indexOf('mapUrl') !== -1 && trimmed.indexOf('story-map') !== -1) continue;
      fileHits.push('  ' + (i + 1) + ': ' + trimmed.slice(0, 110));
      jsTotal++;
    }
    if (fileHits.length) {
      jsReport.push(fname + ' (' + fileHits.length + '):');
      fileHits.forEach(function (h) { jsReport.push(h); });
    }
  });

  if (jsTotal === 0) {
    console.log('INFO JS: Alle ui-*.js frei von inline-style= in Template-Strings — CSP vollständig.');
  } else {
    console.log('INFO JS: ' + jsTotal + ' inline-style= in JS-Template-Strings (style-src blockiert diese zur Laufzeit):');
    jsReport.forEach(function (l) { console.log(l); });
    console.log('INFO JS: Ziel = 0. Bereinigung läuft (CSS-Klassen / setProperty / CSS Custom Props).');
  }

  done(ok ? 0 : 1);
})();
