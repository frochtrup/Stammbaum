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

var _dir, _read, _exists, _mkdir, _write, _args, _exit, _gunzip;

if (IS_NODE) {

  var _fs   = require('fs');
  var _path = require('path');
  var _vm   = require('vm');
  var _zlib = require('zlib');

  _dir    = _path.dirname(_path.resolve(__filename));
  _read   = function(p) { return _fs.readFileSync(p, 'utf8'); };
  _exists = function(p) { return _fs.existsSync(p); };
  _mkdir  = function(p) { if (!_fs.existsSync(p)) _fs.mkdirSync(p); };
  _write  = function(p, t) { _fs.writeFileSync(p, t, 'utf8'); };
  _args   = process.argv.slice(2);
  _exit   = function(code) { process.exit(code); };
  // gunzip → UTF-8-String; bei nicht-gzip Datei (dev) Rohtext zurückgeben
  _gunzip = function(p) {
    var raw = _fs.readFileSync(p);
    if (raw.length >= 2 && raw[0] === 0x1f && raw[1] === 0x8b)
      return _zlib.gunzipSync(raw).toString('utf8');
    return raw.toString('utf8');
  };

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
  // gunzip via Shell in Temp-Datei (umgeht stdout-Limit bei großen .gramps);
  // bei nicht-gzip Datei (dev) Rohtext zurückgeben
  _gunzip = function(p) {
    var app = Application.currentApplication();
    app.includeStandardAdditions = true;
    var q   = function(s) { return "'" + String(s).replace(/'/g, "'\\''") + "'"; };
    var tmp = _dir + '/.test-gramps-tmp.xml';
    try {
      app.doShellScript('gzip -dc ' + q(p) + ' > ' + q(tmp));
      var xml = _read(tmp);
      app.doShellScript('rm -f ' + q(tmp));
      return xml;
    } catch (e) {
      // kein gzip → als Rohtext lesen
      return _read(p);
    }
  };

}

// ── Argumente parsen ───────────────────────────────────────────────────────

var UPDATE    = _args.indexOf('--update')  >= 0;
var NO_SNAP   = _args.indexOf('--no-snap') >= 0;
var testFiles = _args.filter(function(a) { return a[0] !== '-'; });
if (!testFiles.length) testFiles = ['demo.ged'];

var SNAP_DIR = _dir + '/test-roundtrip.snap';

// ── Mini-DOMParser (abhängigkeitsfrei) ──────────────────────────────────────
// Implementiert die DOM-Teilmenge, die gramps-parser.js nutzt: getAttribute,
// localName, tagName, children, childNodes, textContent, attributes, nodeType,
// getElementsByTagName(NS), querySelector, documentElement. GRAMPS-XML ist
// maschinengeneriert + wohlgeformt → ein schlanker Tokenizer genügt.
function _makeMiniDOMParser() {
  function decodeEnt(s) {
    return s.replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos);/g, function(m, e) {
      if (e === 'amp')  return '&';
      if (e === 'lt')   return '<';
      if (e === 'gt')   return '>';
      if (e === 'quot') return '"';
      if (e === 'apos') return "'";
      if (e.charAt(0) === '#') {
        var code = e.charAt(1) === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return String.fromCodePoint(code);
      }
      return m;
    });
  }
  function textOf(node) {
    var out = '';
    var ch = node.childNodes;
    for (var i = 0; i < ch.length; i++) {
      if (ch[i].nodeType === 3) out += ch[i].textContent;
      else if (ch[i].nodeType === 1) out += textOf(ch[i]);
    }
    return out;
  }
  function makeEl(tag) {
    var colon = tag.indexOf(':');
    var el = {
      nodeType:     1,
      tagName:      tag,
      localName:    colon >= 0 ? tag.slice(colon + 1) : tag,
      namespaceURI: null,
      _attrs:       {},
      attributes:   [],
      childNodes:   [],
    };
    el.getAttribute = function(n) { return (n in this._attrs) ? this._attrs[n] : null; };
    Object.defineProperty(el, 'children', { get: function() {
      return this.childNodes.filter(function(c) { return c.nodeType === 1; });
    } });
    Object.defineProperty(el, 'textContent', { get: function() { return textOf(this); } });
    el.getElementsByTagName = function(t) {
      var res = [];
      (function walk(n) {
        for (var i = 0; i < n.childNodes.length; i++) {
          var c = n.childNodes[i];
          if (c.nodeType === 1) { if (t === '*' || c.tagName === t) res.push(c); walk(c); }
        }
      })(this);
      return res;
    };
    el.getElementsByTagNameNS = function(ns, t) {
      var res = [];
      (function walk(n) {
        for (var i = 0; i < n.childNodes.length; i++) {
          var c = n.childNodes[i];
          if (c.nodeType === 1) {
            if ((t === '*' || c.localName === t) && (ns === '*' || c.namespaceURI === ns)) res.push(c);
            walk(c);
          }
        }
      })(this);
      return res;
    };
    el.querySelector = function(sel) { return this.getElementsByTagName(sel)[0] || null; };
    return el;
  }
  function parse(xml) {
    xml = String(xml).replace(/^﻿/, '');
    var n = xml.length, i = 0;
    var doc = makeEl('#document'); doc.documentElement = null;
    var stack = [doc];
    function curNS() {
      for (var s = stack.length - 1; s >= 0; s--) if (stack[s].namespaceURI) return stack[s].namespaceURI;
      return null;
    }
    while (i < n) {
      if (xml.charAt(i) === '<') {
        if (xml.substr(i, 4) === '<!--')       { var e = xml.indexOf('-->', i); i = e < 0 ? n : e + 3; continue; }
        if (xml.substr(i, 9) === '<![CDATA[')  { var e = xml.indexOf(']]>', i); var d = xml.slice(i + 9, e < 0 ? n : e); stack[stack.length - 1].childNodes.push({ nodeType: 3, textContent: d }); i = e < 0 ? n : e + 3; continue; }
        if (xml.charAt(i + 1) === '?')          { var e = xml.indexOf('?>', i); i = e < 0 ? n : e + 2; continue; }
        if (xml.charAt(i + 1) === '!')          { var e = xml.indexOf('>', i);  i = e < 0 ? n : e + 1; continue; }  // DOCTYPE
        if (xml.charAt(i + 1) === '/')          { var e = xml.indexOf('>', i); stack.pop(); i = e + 1; continue; }
        var e   = xml.indexOf('>', i);
        var raw = xml.slice(i + 1, e);
        var self = raw.charAt(raw.length - 1) === '/';
        if (self) raw = raw.slice(0, -1);
        var nameM = raw.match(/^([^\s/>]+)/);
        var el    = makeEl(nameM[1]);
        var attrRe = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g, am, rest = raw.slice(nameM[1].length);
        while ((am = attrRe.exec(rest))) {
          var av = decodeEnt(am[3] !== undefined ? am[3] : am[4]);
          el._attrs[am[1]] = av;
          el.attributes.push({ name: am[1], value: av });
        }
        el.namespaceURI = (el._attrs.xmlns !== undefined) ? el._attrs.xmlns : curNS();
        var parent = stack[stack.length - 1];
        parent.childNodes.push(el);
        if (parent === doc && !doc.documentElement) doc.documentElement = el;
        if (!self) stack.push(el);
        i = e + 1;
      } else {
        var lt = xml.indexOf('<', i);
        var txt = xml.slice(i, lt < 0 ? n : lt);
        if (txt) stack[stack.length - 1].childNodes.push({ nodeType: 3, textContent: decodeEnt(txt) });
        i = lt < 0 ? n : lt;
      }
    }
    return doc;
  }
  return function MiniDOMParser() {
    this.parseFromString = function(xml, _type) { return parse(xml); };
  };
}
var _MiniDOMParser = _makeMiniDOMParser();

// ── Skripte laden ──────────────────────────────────────────────────────────
// Node: vm.runInContext (isolierter Kontext mit Polyfills)
// JXA:  indirektes eval → Funktionen landen im globalen Scope

var _parseGEDCOM, _writeGEDCOM, _writeGEDCOMStrict, _setDb;
var _grampsParseXML, _grampsBuildXML;

if (IS_NODE) {

  var _ctx = _vm.createContext({
    window:       {},
    localStorage: { getItem: function() { return null; }, setItem: function() {}, removeItem: function() {} },
    performance:  { now: function() { return Date.now(); } },
    document:     { getElementById: function() { return null; }, createElement: function() { return {}; } },
    console:      console,
    setTimeout:   setTimeout,
    clearTimeout: clearTimeout,
    DOMParser:    _MiniDOMParser,
  });
  _ctx.window = _ctx;

  function _loadNode(rel) {
    _vm.runInContext(_read(_dir + '/' + rel), _ctx, { filename: rel });
  }
  _loadNode('gedcom.js');
  _loadNode('gedcom-parser.js');
  _loadNode('gedcom-writer.js');
  _loadNode('gramps-parser.js');
  _loadNode('gramps-writer.js');

  _parseGEDCOM      = function(t, e) { return _ctx.parseGEDCOM(t, e); };
  _writeGEDCOM      = function()     { return _ctx.writeGEDCOM(false); };
  _writeGEDCOMStrict = function()    { return _ctx.writeGEDCOM(false, false, true); };
  _setDb            = function(db)   { return _ctx.setDb(db); };
  _grampsParseXML   = function(xml)  { return _ctx._grampsParseXMLText(xml); };
  _grampsBuildXML   = function(db)   { return _ctx._grampsBuildXMLText(db); };

} else {

  // Browser-Stubs als Globals setzen (vor dem eval, damit gedcom.js sie sieht)
  window       = this;
  localStorage = { getItem: function() { return null; }, setItem: function() {}, removeItem: function() {} };
  performance  = { now: function() { return Date.now(); } };
  document     = { getElementById: function() { return null; }, createElement: function() { return {}; } };
  DOMParser    = _MiniDOMParser;

  // Alle Skripte in EINEM eval-Aufruf → teilen denselben Scope.
  // Nötig weil `const AppState` (gedcom.js) sonst für gedcom-writer.js unsichtbar bleibt.
  // Am Ende exportieren wir die benötigten Funktionen über window._rt.
  var _combined =
    _read(_dir + '/gedcom.js')         + '\n' +
    _read(_dir + '/gedcom-parser.js')  + '\n' +
    _read(_dir + '/gedcom-writer.js')  + '\n' +
    _read(_dir + '/gramps-parser.js')  + '\n' +
    _read(_dir + '/gramps-writer.js')  + '\n' +
    'window._rt = { parse: parseGEDCOM, write: function() { return writeGEDCOM(false); }, writeStrict: function() { return writeGEDCOM(false, false, true); }, setDb: setDb, grampsParse: _grampsParseXMLText, grampsBuild: _grampsBuildXMLText };';
  eval(_combined);

  _grampsParseXML    = function(xml) { return window._rt.grampsParse(xml); };
  _grampsBuildXML    = function(db)  { return window._rt.grampsBuild(db); };
  _parseGEDCOM       = function(t, e) { return window._rt.parse(t, e); };
  _writeGEDCOM       = function()     { return window._rt.write(); };
  _writeGEDCOMStrict = function()     { return window._rt.writeStrict(); };
  _setDb             = function(db)   { return window._rt.setDb(db); };

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

// ── Strict-Test ────────────────────────────────────────────────────────────

function runStrictTest(filename) {
  var fullPath = (filename[0] === '/') ? filename : _dir + '/' + filename;
  if (!_exists(fullPath)) return { ok: false, msg: 'Datei nicht gefunden: ' + filename };

  var origText = _read(fullPath);
  var t0 = Date.now();

  var errs1 = [];
  _setDb(_parseGEDCOM(origText, errs1));
  var out1 = _writeGEDCOMStrict();

  // Prüfen: kein _-prefixed Tag im Output
  var underscoreMatch = out1.match(/\n([0-9]+ _[A-Z_]+)[^\n]*/);
  if (underscoreMatch) {
    return { ok: false, msg: 'Vendor-Tag gefunden: ' + underscoreMatch[1].trim(), ms: Date.now() - t0 };
  }

  // Stabilität: Parse→Write nochmals
  var errs2 = [];
  _setDb(_parseGEDCOM(out1, errs2));
  var out2 = _writeGEDCOMStrict();
  var stable = out1 === out2;
  var ms = Date.now() - t0;

  return { ok: stable, stable: stable, ms: ms, errs1: errs1.length, diff: stable ? null : firstDiffs(out1, out2) };
}

function printStrictResult(r, filename) {
  if (!r.ok && r.msg) { log(RED + '✗ strict:' + filename + RESET + '  ' + r.msg); return; }
  var icon = r.ok ? GREEN + '✓' + RESET : RED + '✗' + RESET;
  var sStr = r.stable ? GREEN + 'stable' + RESET : RED + 'INSTABIL' + RESET;
  log(icon + ' strict:' + filename + '  no _-tags  ' + sStr + '  ' + DIM + r.ms + 'ms' + RESET);
  if (!r.stable && r.diff) {
    log('  ' + RED + 'Pass1→Pass2 Instabilität:' + RESET);
    r.diff.forEach(function(h) {
      h.del.forEach(function(l) { log('    ' + RED + '- [' + h.lineA + '] ' + l + RESET); });
      h.ins.forEach(function(l) { log('    ' + GREEN + '+ [' + h.lineB + '] ' + l + RESET); });
    });
  }
}

// ── GRAMPS-Roundtrip ─────────────────────────────────────────────────────────
// Analog zum GEDCOM-Test, aber XML statt GEDCOM-Zeilen:
//   .gramps → gunzip → XML0 → parse → db1 → build → XML1 → parse → db2 → build → XML2
// Assertions: stabil (XML1===XML2) + Record-Counts(XML0)===Counts(XML1).
// Die Count-Prüfung läuft per Regex direkt auf den XML-Strings → unabhängig vom
// Mini-DOMParser (fängt also auch Parser-Fehler des Test-Harnesses ab).

var GRAMPS_RECORDS = ['person', 'family', 'source', 'placeobj', 'event', 'note', 'repository', 'object', 'citation'];

function grampsCounts(xml) {
  var c = {};
  for (var i = 0; i < GRAMPS_RECORDS.length; i++) {
    var tag = GRAMPS_RECORDS[i];
    var re  = new RegExp('<' + tag + '[\\s>]', 'g');
    c[tag]  = (xml.match(re) || []).length;
  }
  return c;
}

function runGrampsRoundtrip(filename) {
  var fullPath = (filename[0] === '/') ? filename : _dir + '/' + filename;
  if (!_exists(fullPath)) return { ok: false, msg: 'Datei nicht gefunden: ' + filename };

  var t0 = Date.now();
  var xml0, db1, xml1, db2, xml2;
  try {
    xml0 = _gunzip(fullPath);
    db1  = _grampsParseXML(xml0);
    xml1 = _grampsBuildXML(db1);
    db2  = _grampsParseXML(xml1);
    xml2 = _grampsBuildXML(db2);
  } catch (e) {
    return { ok: false, msg: 'Exception: ' + (e && e.message ? e.message : e), ms: Date.now() - t0 };
  }

  var stable = xml1 === xml2;
  var c0 = grampsCounts(xml0), c1 = grampsCounts(xml1);
  var countDiffs = [];
  for (var i = 0; i < GRAMPS_RECORDS.length; i++) {
    var tag = GRAMPS_RECORDS[i];
    if (c0[tag] !== c1[tag]) countDiffs.push({ tag: tag, orig: c0[tag], out: c1[tag] });
  }
  // Kern-Records sind per id 1:1 → müssen exakt erhalten bleiben.
  // note/citation/object/placeobj werden bewusst dedupliziert (Text-/Datei-/
  // Orts-Key), event-Records werden aus Personen-/Familiendaten regeneriert →
  // legitime Abweichung gegenüber Original (analog PEDI-Delta bei GEDCOM) → nur Warnung.
  var coreBroken = countDiffs.some(function(d) { return CORE_TAG(d.tag); });

  return {
    ok:         stable && !coreBroken,
    stable:     stable,
    persons:    c1.person,
    countDiffs: countDiffs,
    coreBroken: coreBroken,
    ms:         Date.now() - t0,
    diff:       stable ? null : firstDiffs(xml1, xml2),
  };
}

function printGrampsResult(r, filename) {
  if (!r.ok && r.msg) { log(RED + '✗ gramps:' + filename + RESET + '  ' + r.msg); return; }

  var icon  = r.ok ? GREEN + '✓' + RESET : RED + '✗' + RESET;
  var sStr  = r.stable ? GREEN + 'stable' + RESET : RED + 'INSTABIL' + RESET;
  var cStr  = r.countDiffs.length === 0
    ? GREEN + 'counts=ok' + RESET
    : (r.coreBroken ? RED : YELLOW) + 'counts≠' + RESET;
  log(icon + ' gramps:' + filename + '  ' + cStr + '  ' + sStr + '  ' + DIM + r.persons + ' Pers · ' + r.ms + 'ms' + RESET);

  if (r.countDiffs.length) {
    r.countDiffs.forEach(function(d) {
      var col = CORE_TAG(d.tag) ? RED : YELLOW;
      log('    ' + col + (CORE_TAG(d.tag) ? '✗' : '⚠') + ' ' + d.tag + ': orig=' + d.orig + ' → out=' + d.out + ' (Δ' + (d.out - d.orig > 0 ? '+' : '') + (d.out - d.orig) + ')' + RESET);
    });
  }
  if (!r.stable && r.diff) {
    log('  ' + RED + 'Pass1→Pass2 Instabilität:' + RESET);
    r.diff.forEach(function(h) {
      h.del.forEach(function(l) { log('    ' + RED + '- [' + h.lineA + '] ' + l + RESET); });
      h.ins.forEach(function(l) { log('    ' + GREEN + '+ [' + h.lineB + '] ' + l + RESET); });
    });
  }
}
function CORE_TAG(t) { return ['person','family','source','repository'].indexOf(t) >= 0; }

// ── Main ───────────────────────────────────────────────────────────────────

log(DIM + 'Lade Parser/Writer…' + RESET);
// (Skripte bereits oben geladen)
log(DIM + 'bereit.' + RESET + '\n');

var allOk = true;

var isGramps = function(f) { return /\.gramps$/i.test(f); };
var gedFiles    = testFiles.filter(function(f) { return !isGramps(f); });
var grampsFiles = testFiles.filter(isGramps);

// GEDCOM-Roundtrip + Strict
for (var i = 0; i < gedFiles.length; i++) {
  var r = runRoundtrip(gedFiles[i]);
  printResult(r, gedFiles[i]);
  if (!r.ok) allOk = false;
}
if (gedFiles.length) {
  log('');
  for (var j = 0; j < gedFiles.length; j++) {
    var rs = runStrictTest(gedFiles[j]);
    printStrictResult(rs, gedFiles[j]);
    if (!rs.ok) allOk = false;
  }
}

// GRAMPS-Roundtrip (T0-TEST-2)
if (grampsFiles.length) {
  log('');
  for (var g = 0; g < grampsFiles.length; g++) {
    var rg = runGrampsRoundtrip(grampsFiles[g]);
    printGrampsResult(rg, grampsFiles[g]);
    if (!rg.ok) allOk = false;
  }
}

log('');
if (allOk) {
  log(GREEN + 'Alle Tests bestanden.' + RESET);
  _exit(0);
} else {
  log(RED + 'Tests fehlgeschlagen.' + RESET);
  _exit(1);
}
