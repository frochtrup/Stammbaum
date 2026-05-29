#!/usr/bin/env osascript -l JavaScript
// test-roundtrip.js — GEDCOM Roundtrip-Test ohne Browser (T0-TEST)
//
// Läuft auf jedem Mac ohne Installation:
//   osascript -l JavaScript test-roundtrip.js [datei.ged ...]
//   osascript -l JavaScript test-roundtrip.js --update [...]   # Snapshots schreiben
//   osascript -l JavaScript test-roundtrip.js --no-snap [...]  # kein Snapshot-Vergleich
//
// Auch mit Node.js lauffähig (falls installiert):
//   node test-roundtrip.js [datei.ged ...]
//
// Exit 0 = alles OK, Exit 1 = Fehler (osascript: Exception = Fehler)

// ── Umgebungserkennung ─────────────────────────────────────────────────────

const IS_NODE = typeof require === 'function';
const IS_JXA  = typeof ObjC   !== 'undefined';

if (!IS_NODE && !IS_JXA)
  throw new Error('Unbekannte Umgebung — bitte osascript oder node verwenden.');

// ── I/O-Abstraktionsschicht ────────────────────────────────────────────────

var _dir, _read, _exists, _mkdir, _write, _args, _exit;

if (IS_NODE) {

  var _fs   = require('fs');
  var _path = require('path');
  var _vm   = require('vm');

  _dir    = _path.dirname(_path.resolve(__filename));
  _read   = function(p) { return _fs.readFileSync(p, 'utf8'); };
  _exists = function(p) { return _fs.existsSync(p); };
  _mkdir  = function(p) { if (!_fs.existsSync(p)) _fs.mkdirSync(p); };
  _write  = function(p, t) { _fs.writeFileSync(p, t, 'utf8'); };
  _args   = process.argv.slice(2);
  _exit   = function(code) { process.exit(code); };

} else {

  ObjC.import('Foundation');
  var _fm = $.NSFileManager.defaultManager;

  _dir    = ObjC.unwrap(_fm.currentDirectoryPath);
  _read   = function(p) {
    var s = $.NSString.stringWithContentsOfFileEncodingError(p, $.NSUTF8StringEncoding, null);
    if (!s || !s.js) throw new Error('Lesefehler: ' + p);
    return ObjC.unwrap(s);
  };
  _exists = function(p) { return _fm.fileExistsAtPath(p) === true || _fm.fileExistsAtPath(p) == 1; };
  _mkdir  = function(p) {
    if (!_exists(p))
      _fm.createDirectoryAtPathWithIntermediateDirectoriesAttributesError(p, true, $(), null);
  };
  _write  = function(p, t) {
    $(t).dataUsingEncoding($.NSUTF8StringEncoding)
        .writeToFileAtomically(p, true);
  };
  _args   = (function() {
    // JXA: Argumente kommen als ObjC-Array via $.NSProcessInfo.processInfo.arguments
    var raw = ObjC.unwrap($.NSProcessInfo.processInfo.arguments);
    // Format: [osascript, -l, JavaScript, scriptpath, arg1, arg2, ...]
    var result = [];
    for (var i = 0; i < raw.length; i++) result.push(ObjC.unwrap(raw[i]));
    // Alles nach dem Scriptpfad (test-roundtrip.js) sind echte Argumente
    var scriptIdx = -1;
    for (var i = 0; i < result.length; i++) {
      if (result[i].indexOf('test-roundtrip') >= 0) { scriptIdx = i; break; }
    }
    return scriptIdx >= 0 ? result.slice(scriptIdx + 1) : [];
  })();
  _exit   = function(code) {
    if (code !== 0) throw new Error('FAIL');
  };

}

// ── Argumente parsen ───────────────────────────────────────────────────────

var UPDATE    = _args.indexOf('--update')  >= 0;
var NO_SNAP   = _args.indexOf('--no-snap') >= 0;
var testFiles = _args.filter(function(a) { return a[0] !== '-'; });
if (!testFiles.length) testFiles = ['demo.ged'];

var SNAP_DIR = _dir + '/test-roundtrip.snap';

// ── Skripte laden ──────────────────────────────────────────────────────────
// Node: vm.runInContext (isolierter Kontext mit Polyfills)
// JXA:  indirektes eval → Funktionen landen im globalen Scope

var _parseGEDCOM, _writeGEDCOM, _setDb;

if (IS_NODE) {

  var _ctx = _vm.createContext({
    window:       {},
    localStorage: { getItem: function() { return null; }, setItem: function() {}, removeItem: function() {} },
    performance:  { now: function() { return Date.now(); } },
    document:     { getElementById: function() { return null; }, createElement: function() { return {}; } },
    console:      console,
    setTimeout:   setTimeout,
    clearTimeout: clearTimeout,
  });
  _ctx.window = _ctx;

  function _loadNode(rel) {
    _vm.runInContext(_read(_dir + '/' + rel), _ctx, { filename: rel });
  }
  _loadNode('gedcom.js');
  _loadNode('gedcom-parser.js');
  _loadNode('gedcom-writer.js');

  _parseGEDCOM = function(t, e) { return _ctx.parseGEDCOM(t, e); };
  _writeGEDCOM = function()     { return _ctx.writeGEDCOM(false); };
  _setDb       = function(db)   { return _ctx.setDb(db); };

} else {

  // Browser-Stubs als Globals setzen (vor dem eval, damit gedcom.js sie sieht)
  window       = this;
  localStorage = { getItem: function() { return null; }, setItem: function() {}, removeItem: function() {} };
  performance  = { now: function() { return Date.now(); } };
  document     = { getElementById: function() { return null; }, createElement: function() { return {}; } };

  // Alle drei Skripte in EINEM eval-Aufruf → teilen denselben Scope.
  // Nötig weil `const AppState` (gedcom.js) sonst für gedcom-writer.js unsichtbar bleibt.
  // Am Ende exportieren wir die benötigten Funktionen über window._rt.
  var _combined =
    _read(_dir + '/gedcom.js')         + '\n' +
    _read(_dir + '/gedcom-parser.js')  + '\n' +
    _read(_dir + '/gedcom-writer.js')  + '\n' +
    'window._rt = { parse: parseGEDCOM, write: function() { return writeGEDCOM(false); }, setDb: setDb };';
  eval(_combined);

  _parseGEDCOM = function(t, e) { return window._rt.parse(t, e); };
  _writeGEDCOM = function()     { return window._rt.write(); };
  _setDb       = function(db)   { return window._rt.setDb(db); };

}

// ── Hilfsfunktionen ────────────────────────────────────────────────────────

function assembleLines(text) {
  var result = [], buf = null;
  var lines  = text.split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].replace(/@@/g, '@').trim();
    if (!line) continue;
    var m = line.match(/^(\d+) (CONC|CONT)(?: (.*))?$/);
    if (m && buf !== null) {
      buf += m[2] === 'CONT' ? '\n' + (m[3] || '') : (m[3] || '');
    } else {
      if (buf !== null) result.push(buf);
      buf = line;
    }
  }
  if (buf !== null) result.push(buf);
  return result;
}

function firstDiffs(a, b, maxHunks) {
  maxHunks = maxHunks || 5;
  var la = a.split('\n'), lb = b.split('\n');
  var LOOK = 12, hunks = [], ai = 0, bi = 0, found = 0;
  while (ai < la.length && bi < lb.length && found < maxHunks) {
    if (la[ai] === lb[bi]) { ai++; bi++; continue; }
    var skipA = -1, skipB = -1;
    for (var k = 1; k <= LOOK; k++) {
      if (skipB < 0 && bi + k < lb.length && la[ai] === lb[bi + k]) skipB = k;
      if (skipA < 0 && ai + k < la.length && la[ai + k] === lb[bi]) skipA = k;
      if (skipA >= 0 && skipB >= 0) break;
    }
    var del = [], ins = [];
    if (skipA >= 0 && (skipB < 0 || skipA <= skipB)) {
      del = la.slice(ai, ai + skipA); ai += skipA;
    } else if (skipB >= 0) {
      ins = lb.slice(bi, bi + skipB); bi += skipB;
    } else {
      del = [la[ai++]]; ins = [lb[bi++]];
    }
    hunks.push({ lineA: ai - del.length + 1, lineB: bi - ins.length + 1, del: del, ins: ins });
    found++;
  }
  return hunks;
}

function calcNetDelta(orig, out1) {
  var delta     = assembleLines(out1).length - assembleLines(orig).length;
  var origPedi  = (orig.match(/^\s*2 PEDI\b/mg)  || []).length;
  var out1Pedi  = (out1.match(/^\s*2 PEDI\b/mg)  || []).length;
  var pediDelta = Math.max(0, out1Pedi - origPedi);
  return { delta: delta, pediDelta: pediDelta, normDelta: delta - pediDelta };
}

function snapPath(filename) {
  var base = filename.split('/').pop();
  return SNAP_DIR + '/' + base + '.snap.ged';
}

// ── Roundtrip ──────────────────────────────────────────────────────────────

function runRoundtrip(filename) {
  var fullPath = (filename[0] === '/') ? filename : _dir + '/' + filename;
  if (!_exists(fullPath)) return { ok: false, msg: 'Datei nicht gefunden: ' + filename };

  var origText = _read(fullPath);
  var t0       = Date.now();

  var errs1 = [];
  _setDb(_parseGEDCOM(origText, errs1));
  var out1 = _writeGEDCOM();

  var errs2 = [];
  _setDb(_parseGEDCOM(out1, errs2));
  var out2 = _writeGEDCOM();

  var ms  = Date.now() - t0;
  var d   = calcNetDelta(origText, out1);
  var ok  = (out1 === out2) && d.normDelta === 0;

  var snapChanged = false, snapDiff = null;
  if (!NO_SNAP) {
    if (UPDATE) {
      _mkdir(SNAP_DIR);
      _write(snapPath(filename), out1);
    } else if (_exists(snapPath(filename))) {
      var snap = _read(snapPath(filename));
      if (snap !== out1) {
        snapChanged = true;
        snapDiff    = firstDiffs(snap, out1, 3);
        ok          = false;
      }
    }
  }

  return {
    ok:          ok,
    stable:      out1 === out2,
    normDelta:   d.normDelta,
    pediDelta:   d.pediDelta,
    persons:     Object.keys((_parseGEDCOM.db || {}).individuals || {}).length,
    ms:          ms,
    errs1:       errs1.length,
    diff:        out1 === out2 ? null : firstDiffs(out1, out2),
    snapChanged: snapChanged,
    snapDiff:    snapDiff,
    out1:        out1,
    filename:    filename,
  };
}

// ── Ausgabe ────────────────────────────────────────────────────────────────

var RED    = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m';
var DIM    = '\x1b[2m',  RESET = '\x1b[0m';

function log(s) { IS_NODE ? console.log(s) : console.log(s); }

function printResult(r, filename) {
  if (!r.ok && r.msg) { log(RED + '✗ ' + filename + RESET + '  ' + r.msg); return; }

  var icon  = r.ok ? GREEN + '✓' + RESET : RED + '✗' + RESET;
  var dStr  = r.normDelta === 0
    ? GREEN + 'net_delta=0' + RESET
    : RED + 'net_delta=' + (r.normDelta > 0 ? '+' : '') + r.normDelta + RESET;
  var sStr  = r.stable ? GREEN + 'stable' + RESET : RED + 'INSTABIL' + RESET;
  var pNote = r.pediDelta ? '  ' + DIM + '(+' + r.pediDelta + ' PEDI)' + RESET : '';
  var snote = r.snapChanged ? '  ' + YELLOW + '⚠ Snapshot geändert' + RESET : '';

  log(icon + ' ' + filename + '  ' + dStr + '  ' + sStr + '  ' + DIM + r.ms + 'ms' + RESET + pNote + snote);

  if (!r.stable && r.diff) {
    log('  ' + RED + 'Pass1→Pass2 Instabilität:' + RESET);
    r.diff.forEach(function(h) {
      h.del.forEach(function(l) { log('    ' + RED + '- [' + h.lineA + '] ' + l + RESET); });
      h.ins.forEach(function(l) { log('    ' + GREEN + '+ [' + h.lineB + '] ' + l + RESET); });
    });
  }
  if (r.normDelta !== 0)
    log('  ' + RED + Math.abs(r.normDelta) + ' logische Zeile(n) ' + (r.normDelta > 0 ? 'hinzugekommen' : 'verloren') + RESET
      + '\n  ' + DIM + '→ Details: python3 -m http.server 8080  →  http://localhost:8080/test.html?files=' + filename.split('/').pop() + RESET);
  if (r.snapChanged && r.snapDiff) {
    log('  ' + YELLOW + 'Snapshot-Diff:' + RESET);
    r.snapDiff.forEach(function(h) {
      h.del.forEach(function(l) { log('    ' + DIM + '- ' + l + RESET); });
      h.ins.forEach(function(l) { log('    ' + YELLOW + '+ ' + l + RESET); });
    });
    log('  ' + DIM + '→ Aktualisieren: osascript -l JavaScript test-roundtrip.js --update ' + filename.split('/').pop() + RESET);
  }
  if (r.errs1 > 0)
    log('  ' + YELLOW + '⚠ ' + r.errs1 + ' Parse-Warnung(en)' + RESET);
}

// ── Main ───────────────────────────────────────────────────────────────────

log(DIM + 'Lade Parser/Writer…' + RESET);
// (Skripte bereits oben geladen)
log(DIM + 'bereit.' + RESET + '\n');

var allOk = true;

for (var i = 0; i < testFiles.length; i++) {
  var r = runRoundtrip(testFiles[i]);
  printResult(r, testFiles[i]);
  if (!r.ok) allOk = false;
}

log('');
if (allOk) {
  log(GREEN + 'Alle Tests bestanden.' + RESET);
  _exit(0);
} else {
  log(RED + 'Tests fehlgeschlagen.' + RESET);
  _exit(1);
}

// TODO Phase 2: GRAMPS-Roundtrip (braucht DOMParser-Polyfill)
