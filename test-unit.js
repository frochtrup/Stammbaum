#!/usr/bin/env osascript -l JavaScript
// test-unit.js — Unit-Tests für Kern-Logik ohne Browser (T0-UNIT)
//
//   osascript -l JavaScript test-unit.js
//   node test-unit.js            (falls installiert)
//
// Deckt ab:
//   (a) GEDCOM-Parser Edge-Cases (CONC/CONT, lv>4, leere Tags, Passthrough)
//   (b) gedcom-validator.js — je 1 Positiv-/Negativfall pro Regel
//   (c) BFS-Anonymisierung (_buildLivingSet) — DSGVO-kritisch
//   (d) Datums-Helfer (normMonth, buildGedDate, *FromFields)
//
// Exit 0 = alle Tests grün, Exit 1 = Fehler.

// ── Umgebungserkennung ──────────────────────────────────────────────────────
var IS_NODE = typeof require === 'function';
var IS_JXA  = typeof ObjC   !== 'undefined';
if (!IS_NODE && !IS_JXA) throw new Error('Unbekannte Umgebung — osascript oder node verwenden.');

// ── I/O-Abstraktion ─────────────────────────────────────────────────────────
var _dir, _read, _exit;
if (IS_NODE) {
  var _fs = require('fs'), _path = require('path'), _vm = require('vm');
  _dir  = _path.dirname(_path.resolve(__filename));
  _read = function(p) { return _fs.readFileSync(p, 'utf8'); };
  _exit = function(c) { process.exit(c); };
} else {
  ObjC.import('Foundation');
  var _fm = $.NSFileManager.defaultManager;
  _dir  = ObjC.unwrap(_fm.currentDirectoryPath);
  _read = function(p) {
    var s = $.NSString.stringWithContentsOfFileEncodingError(p, $.NSUTF8StringEncoding, null);
    if (!s || !s.js) throw new Error('Lesefehler: ' + p);
    return ObjC.unwrap(s);
  };
  _exit = function(c) { if (c !== 0) throw new Error('FAIL'); };
}

// ── Konfigurierbarer document-Stub (für Datumsfeld-Tests) ────────────────────
var _fields = {};
function setField(id, val) { _fields[id] = { value: String(val) }; }
function clearFields()     { for (var k in _fields) delete _fields[k]; }
var _docStub = {
  getElementById: function(id) { return _fields[id] || null; },
  createElement:  function()   { return { style: {}, options: [], appendChild: function() {} }; },
};

// ── ESM-Syntax für flachen eval/vm entfernen ────────────────────────────────
// gedcom-validator.js ist auf ES-Module umgestellt (T0-MODULE Phase 2). Dieses
// Harness lädt flach (kein Modul-Loader) → `export`/`import` entfernen.
function _stripMod(s) {
  return s
    .replace(/^export\s+(?=(async\s+)?function\b|const\b|let\b|var\b|class\b)/gm, '')
    .replace(/^export\s*\{[^}]*\}\s*;?\s*$/gm, '')
    .replace(/^import\b[^\n]*$/gm, '');
}
var _MODFILES = { 'gedcom-validator.js': 1 };
function _readSrc(f) { var s = _read(_dir + '/' + f); return _MODFILES[f] ? _stripMod(s) : s; }

// ── Module laden ──────────────────────────────────────────────────────────────
var API = {};
if (IS_NODE) {
  var _ctx = _vm.createContext({
    window: {}, console: console,
    localStorage: { getItem: function() { return null; }, setItem: function() {}, removeItem: function() {} },
    performance:  { now: function() { return Date.now(); } },
    document:     _docStub,
    setTimeout: setTimeout, clearTimeout: clearTimeout,
  });
  _ctx.window = _ctx;
  ['gedcom.js', 'gedcom-parser.js', 'gedcom-writer.js', 'gedcom-validator.js']
    .forEach(function(f) { _vm.runInContext(_readSrc(f), _ctx, { filename: f }); });
  API = _ctx;
} else {
  window       = this;
  localStorage = { getItem: function() { return null; }, setItem: function() {}, removeItem: function() {} };
  performance  = { now: function() { return Date.now(); } };
  document     = _docStub;
  var _combined =
    _readSrc('gedcom.js')          + '\n' +
    _readSrc('gedcom-parser.js')   + '\n' +
    _readSrc('gedcom-writer.js')   + '\n' +
    _readSrc('gedcom-validator.js')+ '\n' +
    'window._api = { parseGEDCOM: parseGEDCOM, runValidation: runValidation, ' +
    '_buildLivingSet: _buildLivingSet, normMonth: normMonth, buildGedDate: buildGedDate, ' +
    'buildGedDateFromFields: buildGedDateFromFields, readDatePartFromFields: readDatePartFromFields, ' +
    '_splitPageUrl: _splitPageUrl, migratePageUrls: migratePageUrls, ' +
    '_evalToQuay: _evalToQuay, evalIsEmpty: evalIsEmpty };';
  eval(_combined);
  API = window._api;
}

// ── Mini-Test-Framework ───────────────────────────────────────────────────────
var RED = '\x1b[31m', GREEN = '\x1b[32m', DIM = '\x1b[2m', BOLD = '\x1b[1m', RESET = '\x1b[0m';
var _pass = 0, _fail = 0, _curGroup = '';
function group(name) { _curGroup = name; console.log('\n' + BOLD + name + RESET); }
function _ok(label)       { _pass++; console.log('  ' + GREEN + '✓' + RESET + ' ' + label); }
function _no(label, detail) {
  _fail++;
  console.log('  ' + RED + '✗ ' + label + RESET + (detail ? DIM + '  → ' + detail + RESET : ''));
}
function eq(actual, expected, label) {
  var a = JSON.stringify(actual), e = JSON.stringify(expected);
  (a === e) ? _ok(label) : _no(label, 'erwartet ' + e + ', war ' + a);
}
function ok(cond, label)  { cond ? _ok(label) : _no(label); }
function rulesOf(results) { return results.map(function(r) { return r.rule; }); }
function hasRule(results, rule, label)    { ok(rulesOf(results).indexOf(rule) >= 0, label); }
function lacksRule(results, rule, label)  { ok(rulesOf(results).indexOf(rule) <  0, label); }

// ── Helfer: minimale Person/DB ────────────────────────────────────────────────
function P(over) {
  return Object.assign({
    given: 'Hans', surname: 'Müller', sex: 'M',
    birth: {}, chr: {}, death: {}, buri: {}, events: [],
    fams: [], famc: [],
  }, over || {});
}
function withSource(p) {                       // hängt 1 Quelle an Geburt
  p.birth = p.birth || {};
  p.birth.citations = [{ sid: '@S1@', page: 'p1' }];
  return p;
}
function DB(individuals, families) {
  return { individuals: individuals || {}, families: families || {} };
}
function val(individuals, families) { return API.runValidation(DB(individuals, families)); }

// ═══════════════════════════════════════════════════════════════════════════
//  (d) DATUMS-HELFER
// ═══════════════════════════════════════════════════════════════════════════
group('(d) Datums-Helfer');

eq(API.normMonth('3'),       'MAR', 'normMonth Zahl "3" → MAR');
eq(API.normMonth('03'),      'MAR', 'normMonth "03" → MAR');
eq(API.normMonth('März'),    'MAR', 'normMonth "März" → MAR');
eq(API.normMonth('march'),   'MAR', 'normMonth "march" → MAR');
eq(API.normMonth('Dezember'),'DEC', 'normMonth "Dezember" → DEC');
eq(API.normMonth('FEB'),     'FEB', 'normMonth "FEB" → FEB');
eq(API.normMonth('Quatsch'), '',    'normMonth ungültig → ""');
eq(API.normMonth(''),        '',    'normMonth leer → ""');

eq(API.buildGedDate('', '12 MAR 1845', ''),            '12 MAR 1845',           'buildGedDate ohne Qualifier');
eq(API.buildGedDate('ABT', '1845', ''),                'ABT 1845',              'buildGedDate ABT');
eq(API.buildGedDate('BET', '1880', '1890'),            'BET 1880 AND 1890',     'buildGedDate BET … AND');
eq(API.buildGedDate('BET', '1880', ''),                '1880',                  'buildGedDate BET ohne d2 → d1');
eq(API.buildGedDate('FROM', '1900', '1910'),           'FROM 1900 TO 1910',     'buildGedDate FROM … TO');
eq(API.buildGedDate('FROM', '1900', ''),               'FROM 1900',             'buildGedDate FROM ohne d2');
eq(API.buildGedDate('', '', ''),                       '',                      'buildGedDate leer → ""');

clearFields();
setField('ef-date-d', '12'); setField('ef-date-m', 'März'); setField('ef-date-y', '1845');
eq(API.readDatePartFromFields('ef-date'), '12 MAR 1845', 'readDatePartFromFields Tag/Monat/Jahr');
clearFields();
setField('ef-date-m', '5'); setField('ef-date-y', '1900');
eq(API.readDatePartFromFields('ef-date'), 'MAY 1900', 'readDatePartFromFields nur Monat/Jahr');
clearFields();
setField('ef-date-y', '1700');
eq(API.readDatePartFromFields('ef-date'), '1700', 'readDatePartFromFields nur Jahr');
clearFields();
setField('ef-date-d', '12'); setField('ef-date-m', '3');   // kein Jahr
eq(API.readDatePartFromFields('ef-date'), '', 'readDatePartFromFields ohne Jahr → ""');

clearFields();
setField('q', 'BET');
setField('a-d', ''); setField('a-m', ''); setField('a-y', '1880');
setField('b-d', ''); setField('b-m', ''); setField('b-y', '1890');
eq(API.buildGedDateFromFields('q', 'a', 'b'), 'BET 1880 AND 1890', 'buildGedDateFromFields BET aus Feldern');

// ═══════════════════════════════════════════════════════════════════════════
//  (a) PARSER EDGE-CASES
// ═══════════════════════════════════════════════════════════════════════════
group('(a) Parser Edge-Cases');

(function() {
  var ged = [
    '0 HEAD', '1 SOUR Test', '0 @I1@ INDI',
    '1 NAME Hans /Müller/', '1 SEX M',
    '1 NOTE Dies ist ein langer', '2 CONC  Text der zusammen', '2 CONT gehört auf zwei Zeilen',
    '0 TRLR',
  ].join('\n');
  var errs = [], db = API.parseGEDCOM(ged, errs);
  ok(db.individuals['@I1@'], 'INDI @I1@ geparst');
  eq(db.individuals['@I1@'].surname, 'Müller', 'SURN aus NAME /…/ extrahiert');
})();

(function() {  // CONC/CONT bleibt im Note-Roundtrip erhalten (kein Verlust)
  var ged = ['0 HEAD','1 SOUR T','0 @I1@ INDI','1 NAME A /B/',
             '1 NOTE Zeile1','2 CONT Zeile2','0 TRLR'].join('\n');
  var errs = [], db = API.parseGEDCOM(ged, errs);
  ok(db.individuals['@I1@'], 'INDI mit CONT-Note geparst (kein Crash)');
})();

(function() {  // leeres Tag ohne Wert darf nicht crashen
  var ged = ['0 HEAD','1 SOUR T','0 @I1@ INDI','1 NAME /Nurnachname/','1 BIRT','2 DATE 1850','0 TRLR'].join('\n');
  var errs = [], db = API.parseGEDCOM(ged, errs);
  ok(db.individuals['@I1@'], 'INDI mit leerem BIRT-Tag geparst');
  eq(db.individuals['@I1@'].birth.date, '1850', 'BIRT.DATE trotz leerem BIRT-Wert gelesen');
  eq(db.individuals['@I1@'].given, '', 'Nur-Nachname → given leer');
})();

(function() {  // unbekanntes Tag landet im Passthrough (kein Verlust)
  var ged = ['0 HEAD','1 SOUR T','0 @I1@ INDI','1 NAME A /B/','1 _CUSTOM Wert','0 TRLR'].join('\n');
  var errs = [], db = API.parseGEDCOM(ged, errs);
  var pt = (db.individuals['@I1@']._passthrough || []).join('\n');
  ok(/_CUSTOM Wert/.test(pt), 'Unbekanntes _CUSTOM in _passthrough[]');
})();

(function() {  // INDI-Level dieselbe Quelle mehrfach → Dedup (verhindert N²-Verdopplung, MyHeritage)
  var ged = ['0 HEAD','1 SOUR T','0 @I1@ INDI','1 NAME A /B/',
             '1 SOUR @S1@','2 PAGE p1','2 EVEN Smart Matching',
             '1 SOUR @S1@','2 PAGE p2','2 EVEN Smart Matching','0 TRLR'].join('\n');
  var errs = [], db = API.parseGEDCOM(ged, errs);
  var p = db.individuals['@I1@'];
  eq(p.topSources.length, 1,            'Parser: INDI-Quelle 2× → topSources dedup auf 1');
  eq(p.topSourcePages['@S1@'], 'p1',    'Parser: keep-first PAGE bei INDI-Quellen-Dedup');
})();

(function() {  // lv>4 darf den Passthrough nicht abbrechen (ADR-012)
  var ged = ['0 HEAD','1 SOUR T','0 @I1@ INDI','1 NAME A /B/',
             '1 OBJE','2 FILE bild.jpg','3 FORM jpg','4 TYPE photo','5 _X tief','0 TRLR'].join('\n');
  var errs = [], db = API.parseGEDCOM(ged, errs);
  ok(db.individuals['@I1@'], 'INDI mit lv5-Zeile geparst (kein Abbruch)');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (b) VALIDATOR — je Positiv-/Negativfall
// ═══════════════════════════════════════════════════════════════════════════
group('(b) Validator');

// MISSING_SURNAME
hasRule (val({ '@1@': P({ surname: '' }) }),                'MISSING_SURNAME', 'MISSING_SURNAME feuert bei leerem Nachnamen');
lacksRule(val({ '@1@': withSource(P({ surname: 'Müller' })) }), 'MISSING_SURNAME', 'MISSING_SURNAME schweigt mit Nachname');

// MISSING_SEX
hasRule (val({ '@1@': P({ sex: 'U' }) }),  'MISSING_SEX', 'MISSING_SEX feuert bei U');
lacksRule(val({ '@1@': P({ sex: 'F' }) }), 'MISSING_SEX', 'MISSING_SEX schweigt bei F');

// MISSING_BIRTH
hasRule (val({ '@1@': P({ birth: {}, chr: {} }) }),                  'MISSING_BIRTH', 'MISSING_BIRTH feuert ohne Geburt/Taufe');
lacksRule(val({ '@1@': P({ birth: { date: '1850' } }) }),           'MISSING_BIRTH', 'MISSING_BIRTH schweigt mit Geburtsdatum');

// DEATH_BEFORE_BIRTH
hasRule (val({ '@1@': P({ birth: { date: '1900' }, death: { date: '1850' } }) }), 'DEATH_BEFORE_BIRTH', 'DEATH_BEFORE_BIRTH feuert (1850<1900)');
lacksRule(val({ '@1@': P({ birth: { date: '1850' }, death: { date: '1900' } }) }), 'DEATH_BEFORE_BIRTH', 'DEATH_BEFORE_BIRTH schweigt (normal)');

// AGE_OVER_MAX (Default maxAge 120)
hasRule (val({ '@1@': P({ birth: { date: '1700' }, death: { date: '1900' } }) }), 'AGE_OVER_MAX', 'AGE_OVER_MAX feuert bei 200 Jahren');
lacksRule(val({ '@1@': P({ birth: { date: '1850' }, death: { date: '1920' } }) }), 'AGE_OVER_MAX', 'AGE_OVER_MAX schweigt bei 70 Jahren');

// MISSING_BIRTHPLACE
hasRule (val({ '@1@': P({ birth: { date: '1850' } }) }),                       'MISSING_BIRTHPLACE', 'MISSING_BIRTHPLACE feuert (Datum ohne Ort)');
lacksRule(val({ '@1@': P({ birth: { date: '1850', place: 'Köln' } }) }),      'MISSING_BIRTHPLACE', 'MISSING_BIRTHPLACE schweigt (Ort vorhanden)');

// BIRTH_AFTER_STAERA (staStAera 1876, ohne Quelle)
hasRule (val({ '@1@': P({ birth: { date: '1900' } }) }),                                'BIRTH_AFTER_STAERA', 'BIRTH_AFTER_STAERA feuert (Geburt 1900, keine Quelle)');
lacksRule(val({ '@1@': withSource(P({ birth: { date: '1900', place: 'Köln' } })) }),   'BIRTH_AFTER_STAERA', 'BIRTH_AFTER_STAERA schweigt (Quelle vorhanden)');
lacksRule(val({ '@1@': P({ birth: { date: '1850' } }) }),                               'BIRTH_AFTER_STAERA', 'BIRTH_AFTER_STAERA schweigt (vor 1876)');

// EVENT_AFTER_DEATH
hasRule (val({ '@1@': P({ death: { date: '1880' }, chr: { date: '1890' } }) }), 'EVENT_AFTER_DEATH', 'EVENT_AFTER_DEATH feuert (Taufe nach Tod)');
lacksRule(val({ '@1@': P({ death: { date: '1890' }, chr: { date: '1850' } }) }), 'EVENT_AFTER_DEATH', 'EVENT_AFTER_DEATH schweigt (normal)');

// MISSING_GIVEN
hasRule (val({ '@1@': P({ given: '', surname: 'Müller' }) }),  'MISSING_GIVEN', 'MISSING_GIVEN feuert (Nachname ohne Vorname)');
lacksRule(val({ '@1@': P({ given: 'Hans', surname: 'Müller' }) }), 'MISSING_GIVEN', 'MISSING_GIVEN schweigt (Vorname vorhanden)');

// MISSING_DEATHPLACE
hasRule (val({ '@1@': P({ death: { date: '1880' } }) }),                  'MISSING_DEATHPLACE', 'MISSING_DEATHPLACE feuert (Datum ohne Ort)');
lacksRule(val({ '@1@': P({ death: { date: '1880', place: 'Köln' } }) }), 'MISSING_DEATHPLACE', 'MISSING_DEATHPLACE schweigt (Ort vorhanden)');

// NO_SOURCES_AT_ALL
hasRule (val({ '@1@': P() }),                'NO_SOURCES_AT_ALL', 'NO_SOURCES_AT_ALL feuert ohne Quelle');
lacksRule(val({ '@1@': withSource(P()) }),   'NO_SOURCES_AT_ALL', 'NO_SOURCES_AT_ALL schweigt mit Quelle');

// MISSING_QUAY (Quelle vorhanden, aber kein QUAY)
(function() {
  var p = P(); p.birth = { date: '1850', citations: [{ sid: '@S1@', page: 'p' }] };       // ohne quay
  hasRule(val({ '@1@': p }), 'MISSING_QUAY', 'MISSING_QUAY feuert (Quelle ohne QUAY)');
  var q = P(); q.birth = { date: '1850', citations: [{ sid: '@S1@', page: 'p', quay: '3' }] };
  lacksRule(val({ '@1@': q }), 'MISSING_QUAY', 'MISSING_QUAY schweigt (QUAY gesetzt)');
})();

// PLACE_INCONSISTENCY (zwei Schreibweisen desselben Ortes)
(function() {
  var a = P({ birth: { date: '1850', place: 'München' } });
  var b = P({ birth: { date: '1851', place: 'Muenchen' } });
  hasRule(val({ '@1@': a, '@2@': b }), 'PLACE_INCONSISTENCY', 'PLACE_INCONSISTENCY feuert (München/Muenchen)');
  var c = P({ birth: { date: '1850', place: 'München' } });
  lacksRule(val({ '@1@': c }), 'PLACE_INCONSISTENCY', 'PLACE_INCONSISTENCY schweigt (eindeutig)');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (c) BFS-ANONYMISIERUNG (_buildLivingSet) — DSGVO-kritisch
// ═══════════════════════════════════════════════════════════════════════════
group('(c) BFS-Anonymisierung (_buildLivingSet)');

(function() {
  var living = API._buildLivingSet(DB({ '@1@': P({ birth: { date: '2010' } }) }));
  ok(living.has('@1@'), 'kürzlich geboren (2010) → lebend');
})();
(function() {
  var living = API._buildLivingSet(DB({ '@1@': P({ birth: { date: '1850' } }) }));
  ok(!living.has('@1@'), 'lange vor 100 Jahren geboren (1850) → tot');
})();
(function() {
  var living = API._buildLivingSet(DB({ '@1@': P({ death: { date: '1900' } }) }));
  ok(!living.has('@1@'), 'mit Sterbedatum → tot');
})();
(function() {  // BFS: Ehepartner einer lebenden Person ohne Daten → lebend
  var inds = {
    '@1@': P({ birth: { date: '2000' }, fams: ['@F1@'] }),
    '@2@': P({ fams: ['@F1@'] }),                          // keine Daten
  };
  var fams = { '@F1@': { husb: '@1@', wife: '@2@', children: ['@3@'] } };
  inds['@3@'] = P({ famc: ['@F1@'] });                     // Kind, keine Daten
  var living = API._buildLivingSet(DB(inds, fams));
  ok(living.has('@2@'), 'Ehepartner einer Lebenden (ohne Daten) → lebend (BFS)');
  ok(living.has('@3@'), 'Kind einer Lebenden (ohne Daten) → lebend (BFS)');
})();
(function() {  // lange toter Vorfahr bleibt tot, auch wenn Nachkomme lebt
  var inds = {
    '@1@': P({ birth: { date: '2000' }, famc: ['@F1@'] }),  // lebendes Kind
    '@2@': P({ birth: { date: '1850' }, fams: ['@F1@'] }),  // toter Elternteil
  };
  var fams = { '@F1@': { husb: '@2@', wife: null, children: ['@1@'] } };
  var living = API._buildLivingSet(DB(inds, fams));
  ok(living.has('@1@'),  'lebendes Kind → lebend');
  ok(!living.has('@2@'), 'toter Vorfahr (1850) bleibt tot trotz lebendem Kind');
})();
(function() {  // konservativ: Person ganz ohne Daten → lebend
  var living = API._buildLivingSet(DB({ '@1@': P() }));
  ok(living.has('@1@'), 'Person ohne jegliche Daten → konservativ lebend');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (b2) VALIDATOR — FAMILIEN-REGELN
// ═══════════════════════════════════════════════════════════════════════════
group('(b2) Validator — Familien-Regeln');

// Familie mit Quelle (unterdrückt NO_FAM_SOURCES in Positivtests anderer Regeln)
function fam(over) { return Object.assign({ husb: null, wife: null, children: [], marr: {}, sourceRefs: new Set(['@S1@']) }, over || {}); }
function valF(inds, fams) { return API.runValidation(DB(inds, fams)); }

// MARR_BEFORE_BIRTH
hasRule (valF({ '@H@': P({ birth: { date: '1900' } }) }, { '@F@': fam({ husb: '@H@', marr: { date: '1880' } }) }), 'MARR_BEFORE_BIRTH', 'MARR_BEFORE_BIRTH feuert (Heirat 1880 < Geburt 1900)');
lacksRule(valF({ '@H@': P({ birth: { date: '1900' } }) }, { '@F@': fam({ husb: '@H@', marr: { date: '1925' } }) }), 'MARR_BEFORE_BIRTH', 'MARR_BEFORE_BIRTH schweigt (normal)');

// MARR_AFTER_DEATH
hasRule (valF({ '@H@': P({ death: { date: '1880' } }) }, { '@F@': fam({ husb: '@H@', marr: { date: '1890' } }) }), 'MARR_AFTER_DEATH', 'MARR_AFTER_DEATH feuert (Heirat nach Tod)');
lacksRule(valF({ '@H@': P({ death: { date: '1890' } }) }, { '@F@': fam({ husb: '@H@', marr: { date: '1870' } }) }), 'MARR_AFTER_DEATH', 'MARR_AFTER_DEATH schweigt (normal)');

// MARR_TOO_YOUNG (minMarrAge 14)
hasRule (valF({ '@H@': P({ birth: { date: '1900' } }) }, { '@F@': fam({ husb: '@H@', marr: { date: '1910' } }) }), 'MARR_TOO_YOUNG', 'MARR_TOO_YOUNG feuert (Heiratsalter 10)');
lacksRule(valF({ '@H@': P({ birth: { date: '1900' } }) }, { '@F@': fam({ husb: '@H@', marr: { date: '1925' } }) }), 'MARR_TOO_YOUNG', 'MARR_TOO_YOUNG schweigt (Alter 25)');

// MISSING_MARRDATE (beide Gatten bekannt, kein Datum)
hasRule (valF({ '@H@': P(), '@W@': P({ sex: 'F' }) }, { '@F@': fam({ husb: '@H@', wife: '@W@', marr: {} }) }), 'MISSING_MARRDATE', 'MISSING_MARRDATE feuert (kein Heiratsdatum)');
lacksRule(valF({ '@H@': P(), '@W@': P({ sex: 'F' }) }, { '@F@': fam({ husb: '@H@', wife: '@W@', marr: { date: '1900' } }) }), 'MISSING_MARRDATE', 'MISSING_MARRDATE schweigt (Datum vorhanden)');

// NO_FAM_SOURCES
hasRule (valF({ '@H@': P() }, { '@F@': fam({ husb: '@H@', sourceRefs: new Set() }) }), 'NO_FAM_SOURCES', 'NO_FAM_SOURCES feuert (keine Quelle)');
lacksRule(valF({ '@H@': P() }, { '@F@': fam({ husb: '@H@' }) }),                          'NO_FAM_SOURCES', 'NO_FAM_SOURCES schweigt (Quelle vorhanden)');

// MANY_CHILDREN (maxChildren 15)
(function() {
  var kids = {}, ids = [];
  for (var i = 0; i < 16; i++) { var id = '@K' + i + '@'; kids[id] = P(); ids.push(id); }
  kids['@H@'] = P();
  hasRule(valF(kids, { '@F@': fam({ husb: '@H@', children: ids }) }), 'MANY_CHILDREN', 'MANY_CHILDREN feuert (16 Kinder)');
  lacksRule(valF({ '@H@': P(), '@K@': P() }, { '@F@': fam({ husb: '@H@', children: ['@K@'] }) }), 'MANY_CHILDREN', 'MANY_CHILDREN schweigt (1 Kind)');
})();

// CHILD_BEFORE_PARENT (Kind nicht jünger als Mutter)
hasRule (valF({ '@W@': P({ sex: 'F', birth: { date: '1900' } }), '@K@': P({ birth: { date: '1890' } }) }, { '@F@': fam({ wife: '@W@', children: ['@K@'] }) }), 'CHILD_BEFORE_PARENT', 'CHILD_BEFORE_PARENT feuert (Kind 1890 vor Mutter 1900)');
lacksRule(valF({ '@W@': P({ sex: 'F', birth: { date: '1880' } }), '@K@': P({ birth: { date: '1905' } }) }, { '@F@': fam({ wife: '@W@', children: ['@K@'] }) }), 'CHILD_BEFORE_PARENT', 'CHILD_BEFORE_PARENT schweigt (normal)');

// MOTHER_TOO_YOUNG (minMotherAge 12)
hasRule (valF({ '@W@': P({ sex: 'F', birth: { date: '1900' } }), '@K@': P({ birth: { date: '1908' } }) }, { '@F@': fam({ wife: '@W@', children: ['@K@'] }) }), 'MOTHER_TOO_YOUNG', 'MOTHER_TOO_YOUNG feuert (Mutter 8 J.)');
lacksRule(valF({ '@W@': P({ sex: 'F', birth: { date: '1880' } }), '@K@': P({ birth: { date: '1905' } }) }, { '@F@': fam({ wife: '@W@', children: ['@K@'] }) }), 'MOTHER_TOO_YOUNG', 'MOTHER_TOO_YOUNG schweigt (25 J.)');

// MOTHER_TOO_OLD (maxMotherAge 60)
hasRule (valF({ '@W@': P({ sex: 'F', birth: { date: '1850' } }), '@K@': P({ birth: { date: '1920' } }) }, { '@F@': fam({ wife: '@W@', children: ['@K@'] }) }), 'MOTHER_TOO_OLD', 'MOTHER_TOO_OLD feuert (Mutter 70 J.)');
lacksRule(valF({ '@W@': P({ sex: 'F', birth: { date: '1880' } }), '@K@': P({ birth: { date: '1910' } }) }, { '@F@': fam({ wife: '@W@', children: ['@K@'] }) }), 'MOTHER_TOO_OLD', 'MOTHER_TOO_OLD schweigt (30 J.)');

// FATHER_TOO_YOUNG (minFatherAge 15)
hasRule (valF({ '@H@': P({ birth: { date: '1900' } }), '@K@': P({ birth: { date: '1912' } }) }, { '@F@': fam({ husb: '@H@', children: ['@K@'] }) }), 'FATHER_TOO_YOUNG', 'FATHER_TOO_YOUNG feuert (Vater 12 J.)');
lacksRule(valF({ '@H@': P({ birth: { date: '1880' } }), '@K@': P({ birth: { date: '1910' } }) }, { '@F@': fam({ husb: '@H@', children: ['@K@'] }) }), 'FATHER_TOO_YOUNG', 'FATHER_TOO_YOUNG schweigt (30 J.)');

// FATHER_TOO_OLD (maxFatherAge 90)
hasRule (valF({ '@H@': P({ birth: { date: '1850' } }), '@K@': P({ birth: { date: '1945' } }) }, { '@F@': fam({ husb: '@H@', children: ['@K@'] }) }), 'FATHER_TOO_OLD', 'FATHER_TOO_OLD feuert (Vater 95 J.)');
lacksRule(valF({ '@H@': P({ birth: { date: '1880' } }), '@K@': P({ birth: { date: '1910' } }) }, { '@F@': fam({ husb: '@H@', children: ['@K@'] }) }), 'FATHER_TOO_OLD', 'FATHER_TOO_OLD schweigt (30 J.)');

// CHILD_AFTER_FATHER_DEATH (>1 Jahr nach Tod)
hasRule (valF({ '@H@': P({ birth: { date: '1850' }, death: { date: '1880' } }), '@K@': P({ birth: { date: '1885' } }) }, { '@F@': fam({ husb: '@H@', children: ['@K@'] }) }), 'CHILD_AFTER_FATHER_DEATH', 'CHILD_AFTER_FATHER_DEATH feuert (Kind 1885, Tod 1880)');
lacksRule(valF({ '@H@': P({ birth: { date: '1850' }, death: { date: '1890' } }), '@K@': P({ birth: { date: '1885' } }) }, { '@F@': fam({ husb: '@H@', children: ['@K@'] }) }), 'CHILD_AFTER_FATHER_DEATH', 'CHILD_AFTER_FATHER_DEATH schweigt (Kind vor Tod)');

// ═══════════════════════════════════════════════════════════════════════════
//  (e) PAGE→MEDIA/NOTE-MIGRATION (Deeplink aus PAGE lösen)
// ═══════════════════════════════════════════════════════════════════════════
group('(e) PAGE→Media/Note-Migration');

// _splitPageUrl (rein)
eq(API._splitPageUrl('fol. 12r'),                                  { page:'fol. 12r', urls:[] },                                  '_splitPageUrl ohne URL');
eq(API._splitPageUrl('https://data.matricula-online.eu/a?pg=12'),  { page:'', urls:['https://data.matricula-online.eu/a?pg=12'] }, '_splitPageUrl nur URL → page leer');
eq(API._splitPageUrl('fol. 12 https://x/y'),                       { page:'fol. 12', urls:['https://x/y'] },                      '_splitPageUrl Lokator + URL getrennt');
eq(API._splitPageUrl('S. 5; https://x/y)'),                        { page:'S. 5', urls:['https://x/y'] },                         '_splitPageUrl Satzzeichen bereinigt');
eq(API._splitPageUrl(''),                                          { page:'', urls:[] },                                          '_splitPageUrl leer');

// migratePageUrls → media (Default), Lokator bleibt
(function() {
  var cit = { sid:'@S1@', page:'fol. 12 https://m.eu/scan?pg=12', quay:'3', note:null, extra:[], media:[] };
  var p = P(); p.birth = { date:'1800', citations:[cit] };
  var rep = API.migratePageUrls(DB({ '@1@': p }));
  eq(cit.page, 'fol. 12',                       'migrate: page bereinigt (Lokator bleibt)');
  eq(cit.media.length, 1,                       'migrate: 1 media-Item erzeugt');
  eq(cit.media[0].file, 'https://m.eu/scan?pg=12', 'migrate: URL in media[].file');
  eq(rep.migrated, 1,                           'migrate: report.migrated=1');
})();

// idempotent
(function() {
  var cit = { sid:'@S1@', page:'https://m.eu/x', quay:'', note:null, extra:[], media:[] };
  var db = DB({ '@1@': Object.assign(P(), { birth:{ date:'1800', citations:[cit] } }) });
  API.migratePageUrls(db);
  var rep2 = API.migratePageUrls(db);
  eq(rep2.migrated, 0,    'migrate: zweiter Lauf no-op (idempotent)');
  eq(cit.media.length, 1, 'migrate: keine Dublette');
})();

// note-Ziel + Event-Host (verschachtelt)
(function() {
  var cit = { sid:'@S1@', page:'Nr. 4 https://m.eu/y', quay:'', note:null, extra:[], media:[] };
  var p = P(); p.events = [{ type:'OCCU', date:'', place:'', citations:[cit] }];
  API.migratePageUrls(DB({ '@1@': p }), { target:'note' });
  eq(cit.page, 'Nr. 4',           'migrate(note): page bereinigt im Event-Host');
  eq(cit.note, 'https://m.eu/y',  'migrate(note): URL in note');
  eq(cit.media.length, 0,         'migrate(note): media unverändert');
})();

// ohne URL → unangetastet
(function() {
  var cit = { sid:'@S1@', page:'fol. 7', quay:'', note:null, extra:[], media:[] };
  var rep = API.migratePageUrls(DB({ '@1@': Object.assign(P(), { birth:{ date:'1800', citations:[cit] } }) }));
  eq(rep.migrated, 0,        'migrate: ohne URL nichts migriert');
  eq(cit.page, 'fol. 7',     'migrate: page unverändert');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (e) RES-EVAL — Evidenzmodell (ADR-022)
// ═══════════════════════════════════════════════════════════════════════════
group('(e) RES-EVAL Evidenzmodell');

// _evalToQuay — abgeleiteter QUAY-Vorschlag
eq(API._evalToQuay({ srcType:'original',  infoQual:'primary',      evidence:'direct'   }), '3', 'eval Original+primär+direkt → QUAY 3');
eq(API._evalToQuay({ srcType:'original',  infoQual:'primary',      evidence:''         }), '3', 'eval Original+primär (ohne Evidenzachse) → QUAY 3');
eq(API._evalToQuay({ srcType:'original',  infoQual:'primary',      evidence:'indirect' }), '1', 'eval Original+primär+indirekt → QUAY 1');
eq(API._evalToQuay({ srcType:'derivative',infoQual:'secondary',    evidence:''         }), '2', 'eval Abschrift+sekundär → QUAY 2');
eq(API._evalToQuay({ srcType:'authored',  infoQual:'undetermined', evidence:'indirect' }), '1', 'eval Autorenwerk+unbestimmt+indirekt → QUAY 1');
eq(API._evalToQuay({ srcType:'',          infoQual:'',             evidence:'negative' }), '0', 'eval Negativ-Evidenz → QUAY 0');
eq(API._evalToQuay({}), '', 'eval leer → ""');

// evalIsEmpty
ok(API.evalIsEmpty({ srcType:'', infoQual:'', evidence:'', informant:'' }), 'evalIsEmpty true bei leer');
ok(API.evalIsEmpty(null),                                                   'evalIsEmpty true bei null');
ok(!API.evalIsEmpty({ srcType:'original', infoQual:'', evidence:'', informant:'' }), 'evalIsEmpty false bei gesetzt');

// Parser: _EVAL wird modelliert in citation.eval extrahiert — NICHT in extra (kein Doppel-Schreiben)
(function() {
  var ged = ['0 HEAD','1 SOUR T','0 @S1@ SOUR','1 TITL Q','0 @I1@ INDI','1 NAME A /B/',
    '1 BIRT','2 DATE 1850','2 SOUR @S1@','3 PAGE 5','3 QUAY 3',
    '3 _EVAL','4 _STYP original','4 _INFO primary','4 _EVID direct','4 _INFM @I9@','0 TRLR'].join('\n');
  var errs = [], db = API.parseGEDCOM(ged, errs);
  var c = db.individuals['@I1@'].birth.citations[0];
  ok(c.eval, 'Zitat hat eval-Objekt');
  eq(c.eval && c.eval.srcType,   'original', '_STYP → eval.srcType');
  eq(c.eval && c.eval.infoQual,  'primary',  '_INFO → eval.infoQual');
  eq(c.eval && c.eval.evidence,  'direct',   '_EVID → eval.evidence');
  eq(c.eval && c.eval.informant, '@I9@',     '_INFM → eval.informant');
  var ex = (c.extra || []).join('|');
  ok(ex.indexOf('_EVAL') < 0, '_EVAL nicht in extra (kein Doppel-Schreiben)');
  ok(ex.indexOf('_STYP') < 0, '_STYP-Achse nicht in extra');
})();

// Parser: Zitat ohne _EVAL behält eval=null (keine Strukturänderung)
(function() {
  var ged = ['0 HEAD','1 SOUR T','0 @S1@ SOUR','1 TITL Q','0 @I1@ INDI','1 NAME A /B/',
    '1 BIRT','2 DATE 1850','2 SOUR @S1@','3 PAGE 5','0 TRLR'].join('\n');
  var errs = [], db = API.parseGEDCOM(ged, errs);
  var c = db.individuals['@I1@'].birth.citations[0];
  ok(!c.eval, 'Zitat ohne _EVAL → eval bleibt leer/null');
})();

// ── Zusammenfassung ───────────────────────────────────────────────────────────
console.log('');
if (_fail === 0) {
  console.log(GREEN + BOLD + 'Alle ' + _pass + ' Unit-Tests bestanden.' + RESET);
  _exit(0);
} else {
  console.log(RED + BOLD + _fail + ' von ' + (_pass + _fail) + ' Tests fehlgeschlagen.' + RESET);
  _exit(1);
}
