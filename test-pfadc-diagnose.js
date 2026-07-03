#!/usr/bin/env osascript -l JavaScript
// ADR-027 v1025 Pfad C: Diagnose-Lauf gegen echte GEDCOM-Datei.
// Zählt vor/nach Link-Pass: Events mit Komma-PLAC, davon resolved, davon mit hofId,
// gesamtzahl V2-hofObjects. Beispiele für rich-PLAC + Pfad-C-Bootstraps.
//
// WICHTIG: Headless-Lauf hat 0 placeObjects (Parser materialisiert sie nicht
// aus PLAC-Strings; sie kommen aus IDB / GOV-Import / GRAMPS-Load). Pfad C
// braucht modellierte Dörfer als Anker → ohne IDB sieht Diagnose-Lauf null
// Treffer. Realer Wirksamkeitstest läuft im Browser-Preview, wo der App-Lauf
// loadPlaceObjectsFromIDB() VOR dem Link-Pass aufruft.

ObjC.import('Foundation');
function readFile(p) {
  var s = $.NSString.stringWithContentsOfFileEncodingError(p, $.NSUTF8StringEncoding, null);
  if (!s || !s.js) throw new Error('Lesefehler: ' + p);
  return ObjC.unwrap(s);
}
function out(s) {
  $.NSFileHandle.fileHandleWithStandardOutput
    .writeData($.NSString.stringWithString(String(s) + '\n').dataUsingEncoding($.NSUTF8StringEncoding));
}

var args = $.NSProcessInfo.processInfo.arguments.js.slice(4).map(function(a){return a.js;});
var file = args[0] || 'MeineDaten_ancestris.ged';
var dir = '/Users/franzdecker/Library/Mobile Documents/com~apple~CloudDocs/Genealogie/AppDev/files/';

// JXA hat kein window — eines bauen, dann Browser-Stubs draufpacken
var window = (function(){ var w = {}; w.window = w; return w; })();
this.window = window;
window.setTimeout = function(){}; window.clearTimeout = function(){};
window.addEventListener = function(){}; window.removeEventListener = function(){};
window.localStorage = { getItem:function(){return null;}, setItem:function(){}, removeItem:function(){} };
window.location = { href:'' };
window.document = { getElementById:function(){return null;}, createElement:function(){return{style:{},addEventListener:function(){},appendChild:function(){}};}, body:{appendChild:function(){}}, addEventListener:function(){} };
window.navigator = { userAgent:'jxa' };
window.console = { log:out, warn:out, error:out, info:function(){} };
window.showToast = function(){};
window._propagateCoordsToEvents = function(){};
window.collectPlaces = function(){return new Map();};

var combined =
  readFile(dir + 'gedcom.js')        + '\n' +
  readFile(dir + 'gedcom-parser.js') + '\n' +
  'window._api = { parseGEDCOM: parseGEDCOM, setDb: setDb, AppState: AppState, ' +
  '_linkGedcomEventsToPlaceObjects: _linkGedcomEventsToPlaceObjects, ' +
  '_isHofObjectV2: _isHofObjectV2 };';
eval(combined);
var API = window._api;

out('═══════════════════════════════════════════════════════════════════════');
out('  ADR-027 Pfad C — Diagnose-Lauf: ' + file);
out('═══════════════════════════════════════════════════════════════════════');

var text = readFile(dir + file);
out('Datei: ' + text.length + ' Zeichen');

var t0 = Date.now();
API.setDb(API.parseGEDCOM(text));
var db = API.AppState.db;
out('Parse: ' + (Date.now() - t0) + 'ms · '
    + Object.keys(db.individuals).length + ' Personen · '
    + Object.keys(db.families).length + ' Familien · '
    + Object.keys(db.placeObjects || {}).length + ' placeObjects · '
    + Object.keys(db.hofObjects || {}).length + ' hofObjects (initial)');

function inv(label) {
  var evTotal = 0, evWithComma = 0, evResolved = 0, evWithHof = 0, evRichNoLink = 0;
  function visit(ev) {
    if (!ev || !ev.place) return;
    evTotal++;
    if (ev.place.indexOf(',') >= 0) {
      evWithComma++;
      if (ev.placeId) evResolved++;
      else evRichNoLink++;
    } else {
      if (ev.placeId) evResolved++;
    }
    if (ev.hofId) evWithHof++;
  }
  for (var pid in db.individuals) {
    var p = db.individuals[pid];
    [p.birth, p.chr, p.death, p.buri].forEach(visit);
    (p.events || []).forEach(visit);
  }
  for (var fid in db.families) {
    var f = db.families[fid];
    [f.marr, f.engag, f.div, f.divf].forEach(visit);
    (f.events || []).forEach(visit);
  }
  var hofCount = 0;
  for (var hid in (db.hofObjects || {})) if (API._isHofObjectV2(db.hofObjects[hid])) hofCount++;
  out('[' + label + '] events=' + evTotal
      + ' · comma-PLAC=' + evWithComma
      + ' · placeId-resolved=' + evResolved
      + ' · rich-noLink=' + evRichNoLink
      + ' · withHofId=' + evWithHof
      + ' · V2-hofObjects=' + hofCount);
  return { evTotal: evTotal, evWithComma: evWithComma, evResolved: evResolved,
           evWithHof: evWithHof, evRichNoLink: evRichNoLink, hofCount: hofCount };
}

var before = inv('VOR Link-Pass');

out('');
out('Beispiele rich-PLAC vor Link-Pass:');
var shown = 0;
for (var pid in db.individuals) {
  if (shown >= 5) break;
  var p = db.individuals[pid];
  var evs = [p.birth, p.chr, p.death, p.buri].concat(p.events || []);
  for (var i = 0; i < evs.length && shown < 5; i++) {
    var ev = evs[i];
    if (!ev || !ev.place || ev.place.indexOf(',') < 0 || ev.placeId) continue;
    out('  · ' + (p.name || pid) + ' ' + (ev.type || ev.eventType || '?')
        + ' ' + (ev.date || '') + ' → ' + ev.place);
    shown++;
  }
}

var t1 = Date.now();
API._linkGedcomEventsToPlaceObjects(db);
out('');
out('Link-Pass: ' + (Date.now() - t1) + 'ms');

var stats = API.AppState._lastLinkPassStats || {};
out('  · ' + (stats.linked || 0) + ' Orte verknüpft (Fall 1/2a/2b)');
out('  · ' + (stats.recollapsed || 0) + ' Place-Strings neu kollabiert');
out('  · ' + (stats.linkedHofPlac || 0) + ' Höfe via Pfad A (existierender Hof)');
out('  · ' + (stats.linkedHofBootstrap || 0) + ' Höfe via Pfad C (Bootstrap NEU)');
out('  · ' + (stats.linkedHofAddr || 0) + ' Höfe via Pfad B (ADDR)');

var after = inv('NACH Link-Pass');

out('');
out('Δ rich-noLink: ' + before.evRichNoLink + ' → ' + after.evRichNoLink
    + ' (= ' + (before.evRichNoLink - after.evRichNoLink) + ' aufgelöst)');
out('Δ V2-hofObjects: ' + before.hofCount + ' → ' + after.hofCount
    + ' (= +' + (after.hofCount - before.hofCount) + ' neu)');

if (stats.linkedHofBootstrap > 0) {
  out('');
  out('Beispiele Pfad-C-Bootstrap (5 erste):');
  var shown2 = 0;
  for (var pid2 in db.individuals) {
    if (shown2 >= 5) break;
    var p2 = db.individuals[pid2];
    var evs2 = [p2.birth, p2.chr, p2.death, p2.buri].concat(p2.events || []);
    for (var j = 0; j < evs2.length && shown2 < 5; j++) {
      var ev2 = evs2[j];
      if (!ev2 || !ev2.hofId || !db.hofObjects[ev2.hofId]) continue;
      var h = db.hofObjects[ev2.hofId];
      var v = db.placeObjects[h.villageId];
      out('  · ' + (p2.name || pid2) + ' ' + (ev2.type || '?') + ' '
          + (ev2.date || '') + ' → "' + (h.addrs[0] && h.addrs[0].value || '?') + '"'
          + ' @ ' + (v && v.title || '?'));
      shown2++;
    }
  }
}

out('');
out('═══════════════════════════════════════════════════════════════════════');
out('Fertig.');
