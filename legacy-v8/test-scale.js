#!/usr/bin/env osascript -l JavaScript
// test-scale.js — Performance-Messung kritischer Hot-Pfade bei 20k Personen
//
// Misst (in JXA/Node ohne Browser):
//   [1] Parse           — parseGEDCOM()
//   [2] Write           — writeGEDCOM()
//   [3] Sort (Name)     — [...persons].sort(localeCompare surname+given)
//   [4] Sort (Datum)    — [...persons].sort(gedDateSortKey + localeCompare)
//   [5] SearchIndex     — _buildSearchIndex: p._searchStr aufbauen
//   [6] FilterAll       — filterPersons("") — ungefiltert, inkl. sort
//   [7] FilterStr       — filterPersons("Müller") — mit _searchStr lookup
//   [8] collectPlaces   — alle Orte aus db.individuals sammeln
//   [9] getPlaceRegistry — placeObjects indexieren
//
// Aufruf:
//   osascript -l JavaScript test-scale.js [datei.ged]

const IS_NODE = typeof require === 'function';
const IS_JXA  = typeof ObjC   !== 'undefined';

// JXA: window + Browser-Stubs im Top-Level-Scope setzen (wie test-roundtrip.js Z.286).
// Muss vor jedem eval passieren, das gedcom.js/gedcom-parser.js lädt.
if (IS_JXA) {
  window       = this;
  localStorage = { getItem: function() { return null; }, setItem: function() {}, removeItem: function() {} };
  performance  = { now: function() { return Date.now(); } };
  document     = { getElementById: function() { return null; }, createElement: function() { return {}; },
                   body: { classList: { contains: function() { return false; } } } };
  DOMParser    = function() { this.parseFromString = function() { return null; }; };
}

var _dir, _read, _args;
if (IS_NODE) {
  var _fs   = require('fs');
  var _path = require('path');
  var _vm   = require('vm');
  _dir  = _path.dirname(_path.resolve(__filename));
  _read = function(p) { return _fs.readFileSync(p, 'utf8'); };
  _args = process.argv.slice(2);
} else {
  ObjC.import('Foundation');
  var _fm = $.NSFileManager.defaultManager;
  _dir    = ObjC.unwrap(_fm.currentDirectoryPath);
  _read   = function(p) {
    var s = $.NSString.stringWithContentsOfFileEncodingError(p, $.NSUTF8StringEncoding, null);
    if (!s || !s.js) throw new Error('Lesefehler: ' + p);
    return ObjC.unwrap(s);
  };
  _args = (function() {
    var raw = ObjC.unwrap($.NSProcessInfo.processInfo.arguments);
    var result = [];
    for (var i = 0; i < raw.length; i++) result.push(ObjC.unwrap(raw[i]));
    var scriptIdx = -1;
    for (var i = 0; i < result.length; i++) {
      if (result[i].indexOf('test-scale') >= 0) { scriptIdx = i; break; }
    }
    return scriptIdx >= 0 ? result.slice(scriptIdx + 1) : [];
  })();
}

var gedFile = _args.filter(function(a) { return a[0] !== '-'; })[0]
              || (_dir + '/scale-test-20000.ged');

// ── Laufzeitumgebung + Abhängigkeiten laden ────────────────────────────────

function _t(label, fn) {
  var t0 = Date.now();
  var result = fn();
  var ms = Date.now() - t0;
  return { label: label, ms: ms, result: result };
}

function _log(label, ms, extra) {
  var bar = '';
  var stars = Math.max(1, Math.round(ms / 50));
  for (var i = 0; i < Math.min(stars, 40); i++) bar += '█';
  var suffix = ms > 500 ? ' ⚠ LANGSAM' : ms > 100 ? ' △' : ' ✓';
  console.log('  ' + (label + '                         ').slice(0, 25)
    + (ms + ' ms         ').slice(0, 10) + bar + suffix
    + (extra ? '  (' + extra + ')' : ''));
}

// ── Parser+Writer laden (wie test-roundtrip.js) ────────────────────────────

var _parseGEDCOM, _writeGEDCOM, _setDb;

if (IS_NODE) {
  var _ctx = {};
  function _loadNode(file, optional) {
    try {
      var src = _read(_dir + '/' + file);
      _vm.runInNewContext(src, _ctx);
    } catch(e) {
      if (!optional) throw e;
    }
  }
  _ctx.window   = _ctx;
  _ctx.console  = console;
  _ctx.AppState = { db: {}, changed: false, idCounter: 0 };
  _ctx.UIState  = { _placeRegistry: null, _placesCache: null };
  _loadNode('gedcom-parser.js');
  _loadNode('gedcom-writer.js', true);
  _parseGEDCOM = function(t, e) { return _ctx.parseGEDCOM(t, e); };
  _writeGEDCOM = function()     { return _ctx.writeGEDCOM(false); };
  _setDb       = function(db)   { _ctx.setDb ? _ctx.setDb(db) : Object.assign(_ctx.AppState.db, db); };
} else {
  function _stripMod(src) {
    return src.replace(/^\s*export\s+(default\s+)?/mg, '')
              .replace(/^\s*import\s[^;]+;/mg, '');
  }
  // gedcom.js + gedcom-parser.js + gedcom-writer.js in EINEM eval (teilen const-Scope).
  // Preamble: Object.defineProperty auf window-Fehler abfangen (JXA: 'db' bereits non-configurable).
  var _preamble =
    'var _$origDefProp = Object.defineProperty;\n' +
    'Object.defineProperty = function(obj, prop, desc) {\n' +
    '  if (obj === window) { try { return _$origDefProp(obj, prop, desc); } catch(e) { return obj; } }\n' +
    '  return _$origDefProp(obj, prop, desc);\n' +
    '};\n';
  var _evalSrc = _preamble +
    _read(_dir + '/gedcom.js') + '\n' +
    _read(_dir + '/gedcom-parser.js') + '\n' +
    _read(_dir + '/gedcom-writer.js') + '\n' +
    'window._api = { parse: parseGEDCOM, write: function() { return writeGEDCOM(false); }, setDb: setDb };';
  eval(_evalSrc);
  _parseGEDCOM = function(t, e) { return _api.parse(t, e); };
  _writeGEDCOM = function()     { return _api.write();       };
  _setDb       = function(db)   { _api.setDb(db);            };
}

// ── Datei laden ────────────────────────────────────────────────────────────

console.log('\n══ SCALE-TEST  ' + gedFile.split('/').pop() + ' ══\n');

var gedText;
try { gedText = _read(gedFile); }
catch(e) { throw new Error('Datei nicht gefunden: ' + gedFile + '\nBitte zuerst generate-scale-test.js ausführen.'); }

var fileMB  = (gedText.length / 1024 / 1024).toFixed(2);
var fileLines = (gedText.match(/\r?\n/g) || []).length;

// ── [1] Parse ──────────────────────────────────────────────────────────────

var r1 = _t('[1] Parse', function() {
  var errs = [];
  return _parseGEDCOM(gedText, errs);
});
_setDb(r1.result);
var db = r1.result;
var nPersons  = Object.keys(db.individuals || {}).length;
var nFamilies = Object.keys(db.families || {}).length;

// ── [2] Write ─────────────────────────────────────────────────────────────

var r2 = _t('[2] Write', function() {
  return _writeGEDCOM();
});

// ── Hilfsfunktionen (inline, entsprechen den echten Impls) ─────────────────

function gedDateSortKey(s) {
  if (!s) return null;
  var m = s.match(/(\d{4})/);
  if (!m) return null;
  var yr = parseInt(m[1], 10);
  var months = { JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12 };
  var mo = 0, dy = 0;
  var dm = s.match(/(\d{1,2})\s+([A-Z]{3})/);
  if (dm) { dy = parseInt(dm[1],10); mo = months[dm[2]] || 0; }
  return yr * 10000 + mo * 100 + dy;
}

function germanSoundex(s) {
  if (!s) return '';
  s = s.toUpperCase().replace(/Ä/g,'AE').replace(/Ö/g,'OE').replace(/Ü/g,'UE').replace(/ß/g,'SS');
  var codes = {B:1,F:1,P:1,V:1,C:2,G:2,J:2,K:2,Q:2,S:2,X:2,Z:2,D:3,T:3,L:4,M:5,N:5,R:6};
  var result = s[0] || '';
  var prev = codes[s[0]] || 0;
  for (var i = 1; i < s.length && result.length < 4; i++) {
    var c = codes[s[i]] || 0;
    if (c && c !== prev) { result += c; }
    prev = c;
  }
  return (result + '000').slice(0, 4);
}

var persons = Object.values(db.individuals || {});

// ── [3] Sort Name ─────────────────────────────────────────────────────────

var r3 = _t('[3] Sort (Name)', function() {
  return [...persons].sort(function(a, b) {
    var c = (a.surname || '').localeCompare(b.surname || '', 'de');
    if (c !== 0) return c;
    return (a.given || '').localeCompare(b.given || '', 'de');
  });
});

// ── [4] Sort Datum ────────────────────────────────────────────────────────

var r4 = _t('[4] Sort (Datum)', function() {
  return [...persons].sort(function(a, b) {
    var ka = gedDateSortKey(a.birth && a.birth.date), kb = gedDateSortKey(b.birth && b.birth.date);
    if (ka !== kb) return (ka || 99999999) - (kb || 99999999);
    var c = (a.surname || '').localeCompare(b.surname || '', 'de');
    if (c !== 0) return c;
    return (a.given || '').localeCompare(b.given || '', 'de');
  });
});

// ── [5] SearchIndex aufbauen ──────────────────────────────────────────────

var r5 = _t('[5] SearchIndex Build', function() {
  var n = 0;
  for (var i = 0; i < persons.length; i++) {
    var p = persons[i];
    p._searchStr = [
      p.id, p.name, p.surname, p.given,
      p.birth && p.birth.date, p.birth && p.birth.place,
      p.death && p.death.date, p.death && p.death.place,
      (p.events || []).map(function(ev) { return [ev.value, ev.place, ev.date].join(' '); }).join(' '),
    ].filter(Boolean).join(' ').toLowerCase();
    p._sdxSurname = germanSoundex(p.surname || '');
    n++;
  }
  return n;
});

// ── [6] Filter all (ungefiltert, re-sort) ─────────────────────────────────

var r6 = _t('[6] Filter (leer, re-sort)', function() {
  var all = persons;
  var sorted = [...all].sort(function(a, b) {
    var c = (a.surname || '').localeCompare(b.surname || '', 'de');
    if (c !== 0) return c;
    return (a.given || '').localeCompare(b.given || '', 'de');
  });
  return sorted.length;
});

// ── [7] Filter mit String "Müller" ────────────────────────────────────────

var r7 = _t('[7] Filter ("Müller")', function() {
  var lower = 'müller';
  var filtered = persons.filter(function(p) {
    return (p._searchStr || '').indexOf(lower) >= 0;
  });
  return filtered.length;
});

// ── [8] collectPlaces (simuliert) ────────────────────────────────────────

var r8 = _t('[8] collectPlaces (Scan)', function() {
  var places = new Map();
  function addPlace(name, personId) {
    if (!name || !name.trim()) return;
    var key = name.trim();
    if (!places.has(key)) places.set(key, { name: key, personIds: new Set() });
    places.get(key).personIds.add(personId);
  }
  for (var i = 0; i < persons.length; i++) {
    var p = persons[i];
    addPlace(p.birth && p.birth.place, p.id);
    addPlace(p.death && p.death.place, p.id);
    addPlace(p.chr   && p.chr.place,   p.id);
    addPlace(p.buri  && p.buri.place,  p.id);
    for (var j = 0; j < (p.events || []).length; j++)
      addPlace(p.events[j].place, p.id);
  }
  return places.size;
});

// ── [9] Object.values() alloc (filterPersons Overhead) ───────────────────

var r9 = _t('[9] Object.values(individuals)', function() {
  var n = 0;
  for (var iter = 0; iter < 10; iter++) {
    var arr = Object.values(db.individuals || {});
    n = arr.length;
  }
  return n;
});
r9.ms = Math.round(r9.ms / 10);  // pro Aufruf

// ── Ausgabe ────────────────────────────────────────────────────────────────

console.log('  Datei        : ' + gedFile.split('/').pop() + '  (' + fileMB + ' MB, ' + fileLines.toLocaleString() + ' Zeilen)');
console.log('  Personen     : ' + nPersons.toLocaleString());
console.log('  Familien     : ' + nFamilies.toLocaleString());
console.log('');
console.log('  Messung                   Zeit       Bewertung');
console.log('  ─────────────────────────────────────────────────────────────');
_log(r1.label, r1.ms, nPersons + ' Pers. geparst');
_log(r2.label, r2.ms, (r2.result.length / 1024).toFixed(0) + ' KB Output');
_log(r3.label, r3.ms, 'localeCompare surname+given');
_log(r4.label, r4.ms, 'dateKey + localeCompare');
_log(r5.label, r5.ms, r5.result + ' _searchStr gebaut');
_log(r6.label, r6.ms, 'Sort-Aufruf beim Tab-Wechsel');
_log(r7.label, r7.ms, r7.result + ' Treffer');
_log(r8.label, r8.ms, r8.result + ' eindeutige Orte');
_log(r9.label, r9.ms, 'pro einzelnem Aufruf (∅ aus 10)');

var totalHot = r1.ms + r3.ms;
console.log('');
console.log('  Cold-Start (Parse + erster Sort)  : ~' + totalHot + ' ms  (JXA-Proxy)');
console.log('  Tab-Wechsel "Personen" (Sort only) : ~' + r6.ms + ' ms');
console.log('  Erste Suche (Index + Filter)       : ~' + (r5.ms + r7.ms) + ' ms');
console.log('');

var warns = [];
if (r1.ms > 500)  warns.push('[1] Parser >500ms — Worker-Auslagerung prüfen');
if (r3.ms > 200)  warns.push('[3] Sort Name >200ms — Sort-Cache einbauen');
if (r4.ms > 200)  warns.push('[4] Sort Datum >200ms — Sort-Cache einbauen');
if (r5.ms > 300)  warns.push('[5] SearchIndex >300ms — async/idle aufbauen');
if (r6.ms > 200)  warns.push('[6] Filter-Sort >200ms — sortiertes Array cachen');

if (warns.length) {
  console.log('  ⚠ Optimierungshinweise:');
  for (var wi = 0; wi < warns.length; wi++) console.log('    • ' + warns[wi]);
} else {
  console.log('  ✓ Alle Messungen im grünen Bereich.');
}
console.log('');
