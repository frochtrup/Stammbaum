#!/usr/bin/env osascript -l JavaScript
// test-snapshot-place.js — Goldfile-Schutz für showPlaceDetail
//
// Verriegelt das HTML-Output von showPlaceDetail gegen versehentliche Änderungen
// während des SHOWPLACE-SPLIT-Refactors. Lädt demo.ged, rendert
// showPlaceDetail für N Test-Orte (mit unterschiedlichen Charakteristika) und
// vergleicht die innerHTML-Strings byte-genau gegen Goldfiles.
//
// Aufruf:
//   osascript -l JavaScript test-snapshot-place.js            # vergleichen
//   osascript -l JavaScript test-snapshot-place.js --update   # Goldfiles schreiben
//
// Exit 0 = OK, Exit 1 = Mismatch.
//
// Test-Orte werden automatisch nach Vielfalt der po-Eigenschaften ausgewählt
// (siehe _pickTestPlaces): mit/ohne placeObject, mit/ohne enclosedBy, mit/ohne pnames.

const IS_NODE = typeof require === 'function';
const IS_JXA  = typeof ObjC   !== 'undefined';

// ── I/O-Schicht (analog test-roundtrip.js) ─────────────────────────────────
var _dir, _read, _exists, _write, _args, _exit;

if (IS_NODE) {
  var _fs = require('fs'), _path = require('path'), _vm = require('vm');
  _dir    = _path.dirname(_path.resolve(__filename));
  _read   = function(p) { return _fs.readFileSync(p, 'utf8'); };
  _exists = function(p) { return _fs.existsSync(p); };
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
  _write  = function(p, t) {
    $(t).dataUsingEncoding($.NSUTF8StringEncoding).writeToFileAtomically(p, true);
  };
  _args = (function() {
    var raw = ObjC.unwrap($.NSProcessInfo.processInfo.arguments);
    var result = [];
    for (var i = 0; i < raw.length; i++) result.push(ObjC.unwrap(raw[i]));
    var idx = -1;
    for (var i = 0; i < result.length; i++) if (result[i].indexOf('test-snapshot-place') >= 0) { idx = i; break; }
    return idx >= 0 ? result.slice(idx + 1) : [];
  })();
  _exit = function(code) { if (code !== 0) throw new Error('FAIL'); };
}

var UPDATE = _args.indexOf('--update') >= 0;
var SNAP_DIR = _dir + '/test-snapshot-place.snap';

// ── Mini-DOM für detailPlace-Container ─────────────────────────────────────
// Nur das nötige Minimum: getElementById('detailPlace') gibt ein Objekt mit
// innerHTML-Property zurück, das wir nach showPlaceDetail auslesen können.
function _makeStubDoc() {
  var _detailPlace = { innerHTML: '', id: 'detailPlace', classList: { add: function(){}, remove: function(){}, contains: function(){return false;} }, dataset: {} };
  var _byId = { detailPlace: _detailPlace };
  return {
    getElementById: function(id) { return _byId[id] || null; },
    body: {
      classList: {
        contains: function(c) { return false; },  // desktop-mode = false → Listen-Sync übersprungen
        add: function() {}, remove: function() {}, toggle: function() {},
      },
    },
    createElement: function(tag) {
      return {
        tagName: tag.toUpperCase(), innerHTML: '', textContent: '',
        classList: { add: function() {}, remove: function() {}, contains: function() { return false; } },
        dataset: {}, style: {},
        appendChild: function() {}, setAttribute: function() {},
      };
    },
    _detailPlace: _detailPlace,
  };
}

// ── Source-Schicht laden ───────────────────────────────────────────────────
// gedcom.js + parser (für db) + ui-views-place.js (für showPlaceDetail).
// ui-views.js + ui-views-person.js werden NICHT gebraucht — wir stubben relRow,
// _activateDetailContainer, showView, _configureDetailToolbar, ViewState etc.

function _readSrc(name) { return _read(_dir + '/' + name); }

function _setupEnv() {
  if (IS_NODE) {
    var ctx = _vm.createContext({
      window: {}, console: console,
      localStorage: { getItem: function() { return null; }, setItem: function() {}, removeItem: function() {} },
      performance:  { now: function() { return Date.now(); } },
      document:     _makeStubDoc(),
      setTimeout: setTimeout, clearTimeout: clearTimeout, Promise: Promise, Set: Set, Map: Map,
    });
    ctx.window = ctx;
    _installStubs(ctx);
    ['gedcom.js', 'gedcom-parser.js', 'ui-views-place.js'].forEach(function(f) {
      _vm.runInContext(_readSrc(f), ctx, { filename: f });
    });
    return ctx;
  } else {
    window       = this;
    localStorage = { getItem: function() { return null; }, setItem: function() {}, removeItem: function() {} };
    performance  = { now: function() { return Date.now(); } };
    document     = _makeStubDoc();
    _installStubs(window);
    // Brücke INSIDE eval: const-Bindings sind block-scoped zu jeweils einer
    // eval-Sitzung. Wir exponieren am Ende derselben Sitzung alles auf window.
    var _bridge = ';window._snapApi = {'
      + 'AppState: AppState, UIState: UIState,'
      + 'parseGEDCOM: parseGEDCOM, setDb: setDb, collectPlaces: collectPlaces,'
      + 'showPlaceDetail: showPlaceDetail,'
      + '_detailPlace: document._detailPlace'
      + '};';
    eval(
      _readSrc('gedcom.js') + '\n' +
      _readSrc('gedcom-parser.js') + '\n' +
      _readSrc('ui-views-place.js') + '\n' +
      _bridge
    );
    return window;
  }
}

// Aggressive Stubs für alle DOM-/UI-Querbezüge, die ui-views-place.js erwartet.
// Strategie: no-op für Side-Effects, realistische Returns für Reads.
function _installStubs(ctx) {
  // Date.now-Stub: showPlaceDetail nutzt Date.now() für _evSectionId
  // ('place-ev-${Date.now()}'). Ohne Stub wäre der Snapshot non-deterministisch.
  Date.now = function() { return 1234567890000; };
  // UI-Helfer (no-op)
  ctx._configureDetailToolbar    = function() {};
  ctx._beforeDetailNavigate      = function() {};
  ctx._updatePlaceListCurrent    = function() {};
  ctx._activateDetailContainer   = function() {};
  ctx.showView                   = function() {};
  ctx.showMain                   = function() { throw new Error('showMain called — Ort nicht gefunden'); };
  ctx._initPlaceDetailMap        = function() {};
  ctx._refreshPlaceValidatorBadge = function() {};
  ctx._refreshPlaceGovUnresolvedBadge = function() {};
  // ViewState (no-op write, hat get/set)
  ctx.ViewState = {
    setCurrent: function(tab, id) {},
    getCurrent: function(tab) { return null; },
  };
  // relRow — produziert den realen HTML-Output, damit Goldfile sinnvoll vergleicht
  ctx.relRow = function(person, role, unlinkFamId) {
    var sc = person.sex === 'M' ? 'm' : person.sex === 'F' ? 'f' : '';
    var ic = person.sex === 'M' ? '♂' : person.sex === 'F' ? '♀' : '◇';
    var unlink = unlinkFamId
      ? '<button class="unlink-btn" data-action="unlinkMember" data-fid="' + unlinkFamId + '" data-pid="' + person.id + '" title="Verbindung trennen">×</button>'
      : '';
    var esc = ctx.esc || function(s){ return String(s||''); };
    return '<div class="rel-row" data-action="showDetail" data-pid="' + person.id + '">'
      + '<div class="rel-avatar ' + sc + '">' + ic + '</div>'
      + '<div class="rel-info"><div class="rel-name">' + esc(person.name || person.id) + '</div>'
      + '<div class="rel-role">' + esc(role) + '</div></div>'
      + unlink + '<span class="p-arrow">›</span></div>';
  };
  // getProbandId — wird in collectPlaces evtl. genutzt
  ctx.getProbandId = function() { return null; };
  // Sonstiges, falls referenziert
  ctx.markChanged   = function() {};
  ctx.showToast     = function() {};
  ctx.idbGet        = function() { return Promise.resolve(null); };
  ctx.idbPut        = function() { return Promise.resolve(); };
  ctx.idbDel        = function() { return Promise.resolve(); };
}

// ── Synthetisches historisches PlaceObject ──────────────────────────────────
// Phase A des SHOWPLACE-SPLIT zerlegt die hist-Sektion (enclosedBy-Timeline,
// pname-Liste, _govTypes, hierarchische Zugehörigkeit nach Jahr). demo.ged
// hat keine placeObjects → wir injizieren ein eigenständiges Testobjekt
// (kein Bezug zu echten Ortsnamen, kollidiert nicht mit demo.ged).
function _injectHistoricalPlace(api) {
  var parentPo = {
    id: 'P_TEST_PARENT', title: 'Test-Hochstift',
    type: 'State', lat: 51.96, long: 7.62,
    pnames: [], enclosedBy: [],
  };
  var po = {
    id: 'P_TEST_HIST', title: 'Test-Sassenberg',
    type: 'Village', lat: 52.0, long: 7.5,
    pnames: [
      { value: 'Test-Sassenbergk',  lang: '',   dateFrom: '1600', dateTo: '1799' },
      { value: 'Test-Sassenberg',   lang: '',   dateFrom: '1800', dateTo: '' },
      { value: 'test-sassenberg',   lang: 'la', dateFrom: '',     dateTo: '' },
    ],
    enclosedBy: [
      { placeId: 'P_TEST_PARENT', dateFrom: '1500', dateTo: '1802' },
      { placeId: 'P_TEST_PARENT', dateFrom: '1815', dateTo: '' },
    ],
    _govTypes: [
      { rawType: 'OrtTeil',  dateFrom: '1600', dateTo: '1799' },
      { rawType: 'Gemeinde', dateFrom: '1800', dateTo: '' },
    ],
    note: 'Testnotiz für Snapshot-Schutz.',
    existsFrom: '1100', existsTo: '',
  };
  api.AppState.db.placeObjects[po.id]       = po;
  api.AppState.db.placeObjects[parentPo.id] = parentPo;
  if (api.UIState) {
    api.UIState._placeRegistry = null;
    api.UIState._placesCache   = null;
  }
}

// ── Test-Orte (deterministisch + explizit, kein Heuristik-Gerätsel) ─────────
// 1) "München, Bayern, Deutschland" — Standard-Render aus demo.ged
//    (Hero · Standort · Ereignisse · Reports · kein placeId)
// 2) "Test-Sassenberg"               — synthetisch, alle Phase-A-Sub-Sektionen
//    (Notiz · Standort · Ort historisch mit Verwaltungsgeschichte + pnames +
//    _govTypes + Zugehörigkeit-nach-Jahr · Übersetzungen)
function _pickTestPlaces(api) {
  var places = api.collectPlaces();
  var picks = [
    { category: 'standard',    name: 'München, Bayern, Deutschland' },
    { category: 'withHistory', name: 'Test-Sassenberg' },
  ];
  for (var i = 0; i < picks.length; i++) {
    if (!places.has(picks[i].name)) {
      throw new Error('Test-Ort fehlt in collectPlaces: "' + picks[i].name + '" (demo.ged geändert? Injektion fehlerhaft?)');
    }
  }
  return picks;
}

// ── Goldfile-Vergleich ─────────────────────────────────────────────────────
function _slug(s) {
  return String(s).replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50);
}

function _runSnapshot(api, places) {
  var passed = 0, failed = 0, updated = 0;
  if (!_exists(SNAP_DIR)) {
    if (IS_NODE) require('fs').mkdirSync(SNAP_DIR);
    else $.NSFileManager.defaultManager.createDirectoryAtPathWithIntermediateDirectoriesAttributesError(SNAP_DIR, true, $(), null);
  }

  for (var i = 0; i < places.length; i++) {
    var p = places[i];
    var snapFile = SNAP_DIR + '/' + _slug(p.category + '_' + p.name) + '.html';

    // showPlaceDetail rendert ins document._detailPlace.innerHTML
    api._detailPlace.innerHTML = '';
    try {
      api.showPlaceDetail(p.name, false);
    } catch (e) {
      console.log('  [31m✗[0m ' + p.category + ' / ' + p.name + ': Render-Fehler: ' + e.message);
      failed++;
      continue;
    }
    var actual = api._detailPlace.innerHTML;

    if (!actual) {
      console.log('  [31m✗[0m ' + p.category + ' / ' + p.name + ': leerer innerHTML');
      failed++;
      continue;
    }

    if (UPDATE || !_exists(snapFile)) {
      _write(snapFile, actual);
      console.log('  [36m↻[0m ' + p.category + ' / ' + p.name + '  (' + actual.length + ' chars) → ' + snapFile.replace(_dir + '/', ''));
      updated++;
      continue;
    }

    var expected = _read(snapFile);
    if (expected === actual) {
      console.log('  [32m✓[0m ' + p.category + ' / ' + p.name + '  (' + actual.length + ' chars)');
      passed++;
    } else {
      // Diff zeigen: erste Abweichung mit ~40 Zeichen Kontext
      var minLen = Math.min(expected.length, actual.length);
      var diffPos = 0;
      while (diffPos < minLen && expected.charAt(diffPos) === actual.charAt(diffPos)) diffPos++;
      var ctx = 60;
      var from = Math.max(0, diffPos - ctx);
      console.log('  [31m✗[0m ' + p.category + ' / ' + p.name);
      console.log('    Position ' + diffPos + ' (exp=' + expected.length + ', act=' + actual.length + ')');
      console.log('    erwartet: …' + expected.slice(from, diffPos + ctx).replace(/\n/g, '⏎'));
      console.log('    aktuell:  …' + actual.slice(from, diffPos + ctx).replace(/\n/g, '⏎'));
      failed++;
    }
  }

  return { passed: passed, failed: failed, updated: updated };
}

// ── Main ───────────────────────────────────────────────────────────────────
(function main() {
  console.log('[2mLade gedcom.js + parser + ui-views-place.js …[0m');
  var api;
  try {
    api = _setupEnv();
    if (IS_JXA) api = api._snapApi;
  } catch (e) {
    console.log('[31mSetup-Fehler:[0m ' + e.message);
    _exit(1);
    return;
  }

  console.log('[2mParse demo.ged …[0m');
  var ged = _read(_dir + '/demo.ged');
  var errs = [];
  var db = api.parseGEDCOM(ged, errs);
  api.setDb(db);
  // Lokale-Storage-Strukturen, die normalerweise async aus localStorage nachgeladen
  // werden, im Test leer initialisieren — sonst greift showPlaceDetail in undef-Felder.
  if (!api.AppState.db.extraPlaces) api.AppState.db.extraPlaces = {};
  if (!api.AppState.db.placeObjects) api.AppState.db.placeObjects = {};
  if (!api.AppState.db.repositories) api.AppState.db.repositories = {};
  if (!api.AppState.db.sources) api.AppState.db.sources = {};

  // Synthetisches PlaceObject einsetzen, damit Phase-A-Sektionen
  // (Verwaltungsgeschichte + Zugehörigkeit nach Jahr + pname-Liste + _govTypes)
  // im Goldfile abgedeckt sind. Wir hängen es an einen existierenden Ortsnamen.
  _injectHistoricalPlace(api);

  console.log('[2mWähle Test-Orte (Diversitäts-Heuristik) …[0m');
  var places = _pickTestPlaces(api);
  console.log('  → ' + places.length + ' Orte:');
  for (var i = 0; i < places.length; i++) {
    console.log('    [' + places[i].category + '] ' + places[i].name);
  }

  console.log('');
  console.log(UPDATE ? '[33mUPDATE-Modus — schreibe Goldfiles[0m' : '[2mVergleiche gegen Goldfiles[0m');
  var res = _runSnapshot(api, places);

  console.log('');
  if (res.failed) {
    console.log('[31m[1m✗ ' + res.failed + ' Snapshot-Mismatches[0m');
    _exit(1);
  } else if (res.updated) {
    console.log('[36m[1m↻ ' + res.updated + ' Goldfiles geschrieben (UPDATE oder neu)[0m');
    _exit(0);
  } else {
    console.log('[32m[1m✓ ' + res.passed + ' Snapshots OK[0m');
    _exit(0);
  }
})();
