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
// gramps-parser.js + gramps-writer.js sind ESM (T0-MODULE) → ebenfalls strippen.
var _MODFILES = { 'gedcom-validator.js': 1, 'gramps-parser.js': 1, 'gramps-writer.js': 1 };
function _readSrc(f) { var s = _read(_dir + '/' + f); return _MODFILES[f] ? _stripMod(s) : s; }

// ── Mini-DOMParser (abhängigkeitsfrei) — für GRAMPS-Parser-Tests ─────────────
// Schlanke DOM-Teilmenge die gramps-parser.js nutzt. GRAMPS-XML ist
// maschinengeneriert + wohlgeformt → ein Tokenizer genügt. (Spiegel des
// Parsers in test-roundtrip.js; bewusst dupliziert, damit beide Harnesse
// abhängigkeitsfrei einzeln lauffähig bleiben.)
function _makeMiniDOMParser() {
  function decodeEnt(s) {
    return s.replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos);/g, function(m, e) {
      if (e === 'amp')  return '&'; if (e === 'lt') return '<'; if (e === 'gt') return '>';
      if (e === 'quot') return '"'; if (e === 'apos') return "'";
      if (e.charAt(0) === '#') { var code = e.charAt(1) === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return String.fromCodePoint(code); }
      return m;
    });
  }
  function textOf(node) {
    var out = '', ch = node.childNodes;
    for (var i = 0; i < ch.length; i++) { if (ch[i].nodeType === 3) out += ch[i].textContent; else if (ch[i].nodeType === 1) out += textOf(ch[i]); }
    return out;
  }
  function makeEl(tag) {
    var colon = tag.indexOf(':');
    var el = { nodeType: 1, tagName: tag, localName: colon >= 0 ? tag.slice(colon + 1) : tag, namespaceURI: null, _attrs: {}, attributes: [], childNodes: [] };
    el.getAttribute = function(n) { return (n in this._attrs) ? this._attrs[n] : null; };
    Object.defineProperty(el, 'children', { get: function() { return this.childNodes.filter(function(c) { return c.nodeType === 1; }); } });
    Object.defineProperty(el, 'textContent', { get: function() { return textOf(this); } });
    el.getElementsByTagName = function(t) { var res = []; (function walk(n) { for (var i = 0; i < n.childNodes.length; i++) { var c = n.childNodes[i]; if (c.nodeType === 1) { if (t === '*' || c.tagName === t) res.push(c); walk(c); } } })(this); return res; };
    el.getElementsByTagNameNS = function(ns, t) { var res = []; (function walk(n) { for (var i = 0; i < n.childNodes.length; i++) { var c = n.childNodes[i]; if (c.nodeType === 1) { if ((t === '*' || c.localName === t) && (ns === '*' || c.namespaceURI === ns)) res.push(c); walk(c); } } })(this); return res; };
    el.querySelector = function(sel) { return this.getElementsByTagName(sel)[0] || null; };
    return el;
  }
  function parse(xml) {
    xml = String(xml).replace(/^﻿/, '');
    var n = xml.length, i = 0, doc = makeEl('#document'); doc.documentElement = null;
    var stack = [doc];
    function curNS() { for (var s = stack.length - 1; s >= 0; s--) if (stack[s].namespaceURI) return stack[s].namespaceURI; return null; }
    while (i < n) {
      if (xml.charAt(i) === '<') {
        if (xml.substr(i, 4) === '<!--')      { var e = xml.indexOf('-->', i); i = e < 0 ? n : e + 3; continue; }
        if (xml.substr(i, 9) === '<![CDATA[') { var e = xml.indexOf(']]>', i); var d = xml.slice(i + 9, e < 0 ? n : e); stack[stack.length - 1].childNodes.push({ nodeType: 3, textContent: d }); i = e < 0 ? n : e + 3; continue; }
        if (xml.charAt(i + 1) === '?')         { var e = xml.indexOf('?>', i); i = e < 0 ? n : e + 2; continue; }
        if (xml.charAt(i + 1) === '!')         { var e = xml.indexOf('>', i);  i = e < 0 ? n : e + 1; continue; }
        if (xml.charAt(i + 1) === '/')         { var e = xml.indexOf('>', i); stack.pop(); i = e + 1; continue; }
        var e = xml.indexOf('>', i), raw = xml.slice(i + 1, e), self = raw.charAt(raw.length - 1) === '/';
        if (self) raw = raw.slice(0, -1);
        var nameM = raw.match(/^([^\s/>]+)/), el = makeEl(nameM[1]);
        var attrRe = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g, am, rest = raw.slice(nameM[1].length);
        while ((am = attrRe.exec(rest))) { var av = decodeEnt(am[3] !== undefined ? am[3] : am[4]); el._attrs[am[1]] = av; el.attributes.push({ name: am[1], value: av }); }
        el.namespaceURI = (el._attrs.xmlns !== undefined) ? el._attrs.xmlns : curNS();
        var parent = stack[stack.length - 1]; parent.childNodes.push(el);
        if (parent === doc && !doc.documentElement) doc.documentElement = el;
        if (!self) stack.push(el);
        i = e + 1;
      } else {
        var lt = xml.indexOf('<', i), txt = xml.slice(i, lt < 0 ? n : lt);
        if (txt) stack[stack.length - 1].childNodes.push({ nodeType: 3, textContent: decodeEnt(txt) });
        i = lt < 0 ? n : lt;
      }
    }
    return doc;
  }
  return function MiniDOMParser() { this.parseFromString = function(xml, _t) { return parse(xml); }; };
}
var _MiniDOMParser = _makeMiniDOMParser();

// ── Module laden ──────────────────────────────────────────────────────────────
var API = {};
if (IS_NODE) {
  var _ctx = _vm.createContext({
    window: {}, console: console,
    localStorage: { getItem: function() { return null; }, setItem: function() {}, removeItem: function() {} },
    performance:  { now: function() { return Date.now(); } },
    document:     _docStub,
    DOMParser:    _MiniDOMParser,
    setTimeout: setTimeout, clearTimeout: clearTimeout,
  });
  _ctx.window = _ctx;
  ['gedcom.js', 'gedcom-parser.js', 'gedcom-writer.js', 'gedcom-validator.js', 'gramps-parser.js', 'gramps-writer.js']
    .forEach(function(f) { _vm.runInContext(_readSrc(f), _ctx, { filename: f }); });
  API = _ctx;
  API.grampsParse = _ctx._grampsParseXMLText;
  API.grampsBuild = _ctx._grampsBuildXMLText;
} else {
  window       = this;
  localStorage = { getItem: function() { return null; }, setItem: function() {}, removeItem: function() {} };
  performance  = { now: function() { return Date.now(); } };
  document     = _docStub;
  DOMParser    = _MiniDOMParser;
  var _combined =
    _readSrc('gedcom.js')          + '\n' +
    _readSrc('gedcom-parser.js')   + '\n' +
    _readSrc('gedcom-writer.js')   + '\n' +
    _readSrc('gedcom-validator.js')+ '\n' +
    _readSrc('gramps-parser.js')   + '\n' +
    _readSrc('gramps-writer.js')   + '\n' +
    'window._api = { parseGEDCOM: parseGEDCOM, runValidation: runValidation, ' +
    '_buildLivingSet: _buildLivingSet, normMonth: normMonth, buildGedDate: buildGedDate, ' +
    'buildGedDateFromFields: buildGedDateFromFields, readDatePartFromFields: readDatePartFromFields, ' +
    '_splitPageUrl: _splitPageUrl, migratePageUrls: migratePageUrls, ' +
    '_evalToQuay: _evalToQuay, evalIsEmpty: evalIsEmpty, ' +
    'hypoIsEmpty: hypoIsEmpty, _hypoStatus: _hypoStatus, ' +
    'grampsParse: _grampsParseXMLText, grampsBuild: _grampsBuildXMLText, ' +
    'setDb: setDb, getPlaceRegistry: getPlaceRegistry, _normPlaceName: _normPlaceName, ' +
    '_migratePlaceObjects: _migratePlaceObjects, _placeFold: _placeFold, ' +
    'findPlaceDuplicates: findPlaceDuplicates, mergePlaceObjects: mergePlaceObjects };';
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

// MISSING_EVAL (Quelle vorhanden, aber keine Evidenzbewertung) — RES-EVAL 2c
// Regel ist default-AUS (opt-in) → Tests mit explizit aktivierender Config (leeres disabled-Set)
(function() {
  var ON = { disabled: new Set() };
  var evalRules = function(inds) { return rulesOf(API.runValidation(DB(inds), ON)); };
  var p = P(); p.birth = { date: '1850', citations: [{ sid: '@S1@', page: 'p', quay: '3' }] }; // ohne eval
  ok(evalRules({ '@1@': p }).indexOf('MISSING_EVAL') >= 0, 'MISSING_EVAL feuert (Quelle ohne Evidenzbewertung)');
  var q = P(); q.birth = { date: '1850', citations: [{ sid: '@S1@', page: 'p', eval: { srcType: 'original' } }] };
  ok(evalRules({ '@1@': q }).indexOf('MISSING_EVAL') < 0, 'MISSING_EVAL schweigt (eval gesetzt)');
  var n = P();  // ohne Quelle → MISSING_EVAL schweigt (NO_SOURCES greift)
  ok(evalRules({ '@1@': n }).indexOf('MISSING_EVAL') < 0, 'MISSING_EVAL schweigt ohne Quelle');
  // default-AUS: ohne explizite Config kein MISSING_EVAL
  lacksRule(val({ '@1@': p }), 'MISSING_EVAL', 'MISSING_EVAL default-deaktiviert (kein Befund ohne Opt-in)');
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

// ═══════════════════════════════════════════════════════════════════════════
//  (f) RES-PROJ — Task-Status (Kanban)
// ═══════════════════════════════════════════════════════════════════════════
group('(f) RES-PROJ Task-Status');

// _TSTAT wird geparst (Person + Familie)
(function() {
  var ged = ['0 HEAD','1 SOUR T','0 @I1@ INDI','1 NAME A /B/',
    '1 _TASK Sterbeurkunde suchen','2 _CAT urkunde','2 _DONE 0','2 _TSTAT doing','2 _ID t1',
    '0 @F1@ FAM','1 _TASK Heiratseintrag','2 _DONE 1','2 _TSTAT done','2 _ID t2','0 TRLR'].join('\n');
  var errs = [], db = API.parseGEDCOM(ged, errs);
  var pt = db.individuals['@I1@']._tasks[0];
  eq(pt.status, 'doing', '_TSTAT → task.status (doing)');
  eq(pt.done,   false,   '_DONE 0 bleibt erhalten neben _TSTAT');
  var ft = db.families['@F1@']._tasks[0];
  eq(ft.status, 'done', '_TSTAT → Familien-task.status (done)');
})();

// Task ohne _TSTAT → status leer (UI migriert lazy aus done)
(function() {
  var ged = ['0 HEAD','1 SOUR T','0 @I1@ INDI','1 NAME A /B/',
    '1 _TASK Alt','2 _DONE 1','0 TRLR'].join('\n');
  var errs = [], db = API.parseGEDCOM(ged, errs);
  var t = db.individuals['@I1@']._tasks[0];
  ok(!t.status, 'Bestandstask ohne _TSTAT → status leer (kein Roundtrip-Delta)');
  eq(t.done, true, 'done bleibt true');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (g) RES-HYPO — Hypothesen-System (ADR-023)
// ═══════════════════════════════════════════════════════════════════════════
group('(g) RES-HYPO Hypothesen');

// Helfer
ok(API.hypoIsEmpty({ text:'', rationale:'', conclusion:'', evidence:[] }), 'hypoIsEmpty true bei leer');
ok(API.hypoIsEmpty(null),                                                  'hypoIsEmpty true bei null');
ok(!API.hypoIsEmpty({ text:'X', evidence:[] }),                            'hypoIsEmpty false bei Text');
ok(!API.hypoIsEmpty({ text:'', evidence:[{sid:'@S1@'}] }),                 'hypoIsEmpty false bei Evidenz');
eq(API._hypoStatus({ status:'confirmed' }), 'confirmed', '_hypoStatus liest status');
eq(API._hypoStatus({}),                     'open',      '_hypoStatus migriert leer → open');
eq(API._hypoStatus({ status:'bogus' }),     'open',      '_hypoStatus fängt Ungültiges → open');

// Parser: _HYPO wird modelliert extrahiert (Person), inkl. Evidenz + mehrzeilig
(function() {
  var ged = ['0 HEAD','1 SOUR T','0 @S1@ SOUR','1 TITL Q','0 @S2@ SOUR','1 TITL R',
    '0 @I1@ INDI','1 NAME A /B/','1 SEX M',
    '1 _HYPO Johann ist Sohn des Peter','2 _ID h1','2 _HSTAT open','2 _HWGT medium','2 _DATE 2026-05-31',
    '2 SOUR @S1@','3 PAGE fol. 12','2 SOUR @S2@',
    '2 _RATIO Erste Zeile.','3 CONT Zweite Zeile.','2 _CONCL Noch offen.','0 TRLR'].join('\n');
  var errs = [], db = API.parseGEDCOM(ged, errs);
  var h = db.individuals['@I1@']._hypotheses[0];
  ok(h, 'Person hat Hypothese');
  eq(h.text,   'Johann ist Sohn des Peter', '_HYPO-Wert → text');
  eq(h.id,     'h1',     '_ID → id');
  eq(h.status, 'open',   '_HSTAT → status');
  eq(h.weight, 'medium', '_HWGT → weight');
  eq(h.evidence.length, 2,        'zwei Evidenz-Refs');
  eq(h.evidence[0].sid,  '@S1@',  'Evidenz 1 sid');
  eq(h.evidence[0].page, 'fol. 12','Evidenz 1 page (lv3 PAGE)');
  eq(h.evidence[1].sid,  '@S2@',  'Evidenz 2 sid (ohne page)');
  eq(h.rationale, 'Erste Zeile.\nZweite Zeile.', '_RATIO + CONT mehrzeilig');
  eq(h.conclusion,'Noch offen.', '_CONCL → conclusion');
  // _HYPO nicht im Passthrough (kein Doppel-Schreiben)
  var pt = (db.individuals['@I1@']._passthrough || []).join('|');
  ok(pt.indexOf('_HYPO') < 0, '_HYPO nicht im Passthrough (modelliert)');
})();

// Parser: _HYPO an Familie
(function() {
  var ged = ['0 HEAD','1 SOUR T','0 @S1@ SOUR','1 TITL Q','0 @F1@ FAM','1 HUSB @I1@',
    '1 _HYPO Ehe vermutlich 1675','2 _HSTAT confirmed','2 _HWGT high','2 SOUR @S1@','0 TRLR'].join('\n');
  var errs = [], db = API.parseGEDCOM(ged, errs);
  var h = db.families['@F1@']._hypotheses[0];
  ok(h, 'Familie hat Hypothese');
  eq(h.status, 'confirmed', 'Familien-_HSTAT → status');
  eq(h.evidence[0].sid, '@S1@', 'Familien-Evidenz sid');
})();

// Person ohne _HYPO → leeres Array (keine Strukturänderung)
(function() {
  var ged = ['0 HEAD','1 SOUR T','0 @I1@ INDI','1 NAME A /B/','1 SEX M','0 TRLR'].join('\n');
  var errs = [], db = API.parseGEDCOM(ged, errs);
  eq(db.individuals['@I1@']._hypotheses.length, 0, 'keine Hypothese → leeres Array');
})();

// Validator OPEN_HYPO — default-AUS (opt-in), feuert nur bei offenen Hypothesen
(function() {
  var ON = { disabled: new Set() };
  var hRules = function(inds) { return rulesOf(API.runValidation(DB(inds), ON)); };
  var open = P({ _hypotheses: [{ id:'h1', text:'X', status:'open' }] });
  ok(hRules({ '@1@': open }).indexOf('OPEN_HYPO') >= 0, 'OPEN_HYPO feuert bei offener Hypothese');
  var noStatus = P({ _hypotheses: [{ id:'h2', text:'Y' }] });   // leer → gilt als offen
  ok(hRules({ '@1@': noStatus }).indexOf('OPEN_HYPO') >= 0, 'OPEN_HYPO feuert bei Hypothese ohne Status (= offen)');
  var done = P({ _hypotheses: [{ id:'h3', text:'Z', status:'confirmed' }] });
  ok(hRules({ '@1@': done }).indexOf('OPEN_HYPO') < 0, 'OPEN_HYPO schweigt bei bestätigt');
  var rej = P({ _hypotheses: [{ id:'h4', text:'W', status:'rejected' }] });
  ok(hRules({ '@1@': rej }).indexOf('OPEN_HYPO') < 0, 'OPEN_HYPO schweigt bei verworfen');
  var none = P();
  ok(hRules({ '@1@': none }).indexOf('OPEN_HYPO') < 0, 'OPEN_HYPO schweigt ohne Hypothesen');
  // default-AUS: ohne Opt-in kein Befund
  lacksRule(val({ '@1@': open }), 'OPEN_HYPO', 'OPEN_HYPO default-deaktiviert (kein Befund ohne Opt-in)');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (h) PLACE-HIST — datierte pname/placeref (ADR-024)
// ═══════════════════════════════════════════════════════════════════════════
group('(h) PLACE-HIST Ortshistorie');

var _PLHIST_XML = '<?xml version="1.0"?>\n<database xmlns="http://gramps-project.org/xml/1.7.1/">\n<places>\n'
  + '<placeobj handle="_pP" id="P0001" type="Region"><ptitle>Fürstbistum Münster</ptitle><pname value="Fürstbistum Münster"/></placeobj>\n'
  + '<placeobj handle="_pL" id="P0002" type="Village"><ptitle>Sassenberg</ptitle>'
  + '<pname value="Sassenberg"/>'
  + '<pname value="Sassenbergk" lang=""><daterange start="1650" stop="1802"/></pname>'
  + '<coord lat="N51.99" long="E8.04"/>'
  + '<placeref hlink="_pP"><dateval val="1500-01-01" type="from"/></placeref>'
  + '</placeobj>\n</places>\n</database>';

(function() {
  var db  = API.grampsParse(_PLHIST_XML);
  var pl  = db.placeObjects['@P0002@'];
  var pn  = (pl.pnames || []).filter(function(p) { return p.value === 'Sassenbergk'; })[0] || {};
  eq(pn.dateFrom + '/' + pn.dateTo, '1650/1802', 'datierter pname (daterange) → dateFrom/dateTo geparst');
  eq(pn.dateType, 'range', 'pname dateType = range');
  var enc = (pl.enclosedBy || [])[0] || {};
  eq(enc.placeId + '|' + enc.dateFrom, '@P0001@|1500-01-01', 'datierter placeref → enclosedBy mit placeId + Datum');

  var out = API.grampsBuild(db);
  ok(/<pname value="Sassenbergk"[^>]*>\s*<daterange start="1650" stop="1802"\/>\s*<\/pname>/.test(out), 'datierter pname roundtrip (write erzeugt daterange-Kind)');
  ok(/<dateval val="1500-01-01" type="from"\/>/.test(out), 'placeref verbatim-Attribut type="from" überlebt (via _dateRaw)');

  var out2 = API.grampsBuild(API.grampsParse(out));
  eq(out === out2 ? 'stable' : 'drift', 'stable', 'place-date idempotent ((build∘parse)² stabil)');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (i) PLACE-HIST — PlaceRegistry (ADR-024 P0a-2)
// ═══════════════════════════════════════════════════════════════════════════
group('(i) PLACE-HIST PlaceRegistry');

// _normPlaceName — nur Matching, verlustfrei (kein Speicher-/Anzeigewert)
eq(API._normPlaceName('  Münster '), 'münster', '_normPlaceName trimmt + casefold');
eq(API._normPlaceName('Bad   Bentheim'), 'bad bentheim', '_normPlaceName kollabiert Spaces');
eq(API._normPlaceName(''), '', '_normPlaceName leer → ""');

(function() {
  // DB mit datiertem Ort: Sassenberg (1650–1802 "Sassenbergk"), eingebettet in P0001
  var db = {
    individuals: {}, families: {},
    placeObjects: {
      '@P0001@': { id:'@P0001@', title:'Fürstbistum Münster', type:'Region', pnames:[{value:'Fürstbistum Münster'}], enclosedBy:[] },
      '@P0002@': { id:'@P0002@', title:'Sassenberg', type:'Village',
        pnames:[ {value:'Sassenberg'}, {value:'Sassenbergk', dateFrom:'1650', dateTo:'1802', dateType:'range'} ],
        enclosedBy:[ {placeId:'@P0001@', dateFrom:'1500', dateTo:'1803', dateType:'span'} ] },
    },
  };
  API.setDb(db);
  var reg = API.getPlaceRegistry();
  eq(reg.findByName('sassenberg'), '@P0002@', 'findByName (Haupttitel, normalisiert)');
  eq(reg.findByName('Sassenbergk'), '@P0002@', 'findByName (historische Schreibweise als Alias)');
  eq(reg.findByName('unbekannt'), null, 'findByName unbekannt → null');
  eq(reg.resolveAsOf('@P0002@', 1700), 'Sassenbergk', 'resolveAsOf 1700 → periodenkorrekter Name');
  eq(reg.resolveAsOf('@P0002@', 1900), 'Sassenberg', 'resolveAsOf 1900 → Haupttitel (kein passender pname)');
  eq(reg.resolveAsOf('@P0002@', null), 'Sassenberg', 'resolveAsOf ohne Jahr → Haupttitel');
  eq(reg.enclosureChainAsOf('@P0002@', 1700), ['Sassenbergk', 'Fürstbistum Münster'], 'enclosureChainAsOf 1700 (Kette periodenkorrekt)');
})();

(function() {
  // Migration: Alt-Ort nur mit parentId (undatiert) → enclosedBy[] abgeleitet
  var db = {
    individuals: {}, families: {},
    placeObjects: {
      '@P1@': { id:'@P1@', title:'Land', type:'Country', pnames:[{value:'Land'}] },
      '@P2@': { id:'@P2@', title:'Dorf', type:'Village', pnames:[{value:'Dorf'}], parentId:'@P1@' },
    },
  };
  API.setDb(db);            // setDb ruft _migratePlaceObjects auf
  var pl = API.getPlaceRegistry().byId['@P2@'];
  eq(pl.enclosedBy.length, 1, 'Migration: parentId → enclosedBy[] (1 Eintrag)');
  eq(pl.enclosedBy[0].placeId, '@P1@', 'Migration: enclosedBy[0].placeId aus parentId');
  eq(API.getPlaceRegistry().enclosureChainAsOf('@P2@', 1800), ['Dorf', 'Land'], 'Migration: Kette via abgeleitetes enclosedBy');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (j) PLACE-HIST — collectPlaces↔Entität-Verknüpfung (ADR-024 P0b-1)
// ═══════════════════════════════════════════════════════════════════════════
group('(j) PLACE-HIST collectPlaces-Entität');

// collectPlaces lebt in ui-views-place.js (UI-Schicht, nicht im Unit-Harness geladen).
// Wir testen daher die zugrundeliegende Verknüpfungslogik direkt über die Registry:
// findByName liefert die placeId, byId trägt type + Koordinaten, die collectPlaces
// additiv einmischt. Das ist die exakt selbe Operation wie in collectPlaces P0b-1.
(function() {
  var db = {
    individuals: {}, families: {},
    placeObjects: {
      '@P1@': { id:'@P1@', title:'Münster', type:'City',
        pnames:[{value:'Münster'}, {value:'Monasterium', dateFrom:'1500', dateTo:'1800', dateType:'range'}],
        lat:51.96, long:7.62, enclosedBy:[] },
    },
  };
  API.setDb(db);
  var reg = API.getPlaceRegistry();
  var id  = reg.findByName('Münster');
  eq(id, '@P1@', 'P0b-1: String-Ort → placeId (findByName)');
  var po  = reg.byId[id];
  eq(po.type, 'City', 'P0b-1: Entität liefert type für Anzeige');
  ok(po.lat === 51.96 && po.long === 7.62, 'P0b-1: Koordinaten aus placeObject übernehmbar');
  var dated = (po.pnames || []).filter(function(p){ return p.dateFrom || p.dateTo; });
  eq(dated.length, 1, 'P0b-1: datierte Namensvariante für „Frühere Namen"');
  eq(dated[0].value, 'Monasterium', 'P0b-1: frühere Schreibweise gelesen');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (k) PLACE-HIST — Dubletten-Erkennung + Merge (ADR-024 P0b-2a)
// ═══════════════════════════════════════════════════════════════════════════
group('(k) PLACE-HIST Dubletten + Merge');

// _placeFold: aggressive Normalisierung (Umlaut-Faltung) für Kandidatensuche
eq(API._placeFold('München'),  'munchen',  '_placeFold faltet ü→u');
eq(API._placeFold('Muenchen'), 'munchen',  '_placeFold faltet ue→u (= München)');
eq(API._placeFold('  Köln '),  'koln',     '_placeFold ö→o + trim');

(function() {
  // Dublette per Schreibweise: "München" vs "Muenchen" (gleicher Fold-Key)
  var db = {
    individuals: {}, families: {},
    placeObjects: {
      '@P1@': { id:'@P1@', title:'München', type:'City', pnames:[{value:'München'}], enclosedBy:[], lat:48.14, long:11.58 },
      '@P2@': { id:'@P2@', title:'Muenchen', type:'City', pnames:[{value:'Muenchen'}], enclosedBy:[] },
      '@P3@': { id:'@P3@', title:'Hamburg',  type:'City', pnames:[{value:'Hamburg'}],  enclosedBy:[] },
    },
  };
  API.setDb(db);
  var dups = API.findPlaceDuplicates();
  eq(dups.length, 1, 'findPlaceDuplicates: genau 1 Dublettengruppe (München/Muenchen)');
  eq(dups[0].ids.length, 2, 'Gruppe hat 2 Mitglieder');
  ok(dups[0].ids.indexOf('@P1@') >= 0 && dups[0].ids.indexOf('@P2@') >= 0, 'Gruppe enthält @P1@ + @P2@');
  ok(dups[0].ids.indexOf('@P3@') < 0, 'Hamburg ist NICHT in der Gruppe');
})();

(function() {
  // Merge: Verlierer-Schreibweise wird zu pname des Gewinners; ev.placeId umgehängt
  var db = {
    individuals: {
      '@I1@': { id:'@I1@', birth:{ place:'Muenchen', placeId:'@P2@' }, chr:{}, death:{}, buri:{}, events:[] },
      '@I2@': { id:'@I2@', birth:{}, chr:{}, death:{ place:'München', placeId:'@P1@' }, buri:{}, events:[] },
    },
    families: {},
    placeObjects: {
      '@P1@': { id:'@P1@', title:'München', type:'City', pnames:[{value:'München'}], enclosedBy:[], lat:48.14, long:11.58 },
      '@P2@': { id:'@P2@', title:'Muenchen', type:'City', pnames:[{value:'Muenchen'}], enclosedBy:[] },
    },
  };
  API.setDb(db);
  var res = API.mergePlaceObjects('@P1@', ['@P2@']);
  eq(res.merged, 1, 'merge: 1 Verlierer zusammengeführt');
  eq(res.repointed, 1, 'merge: 1 ev.placeId umgehängt (@P2@→@P1@)');
  ok(!API.getPlaceRegistry().byId['@P2@'], 'merge: Verlierer-placeObject gelöscht');
  var w = API.getPlaceRegistry().byId['@P1@'];
  ok((w.pnames || []).some(function(p){ return p.value === 'Muenchen'; }), 'merge: Verlierer-Schreibweise als pname erhalten (verlustfrei)');
  eq(db.individuals['@I1@'].birth.placeId, '@P1@', 'merge: INDI birth.placeId zeigt auf Gewinner');
  eq(API.getPlaceRegistry().findByName('Muenchen'), '@P1@', 'merge: alte Schreibweise findet jetzt den Gewinner');
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
