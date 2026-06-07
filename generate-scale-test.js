#!/usr/bin/env osascript -l JavaScript
// generate-scale-test.js — Synthetisches GEDCOM für SCALE-TEST
//
// Erzeugt ein realistisches GEDCOM 5.5.1 mit konfigurierbarer Personenzahl.
// Jede Person hat: NAME, SEX, BIRT (Datum+Ort), DEAT (Datum+Ort), 1-2 Quellen.
// Familien: Eltern + 2-4 Kinder, über ~10 Generationen verkettet.
//
// Aufruf:
//   osascript -l JavaScript generate-scale-test.js            # 20000 Personen
//   osascript -l JavaScript generate-scale-test.js 5000       # 5000 Personen
//   osascript -l JavaScript generate-scale-test.js 20000 scale-test-20k.ged

// ── Umgebung ──────────────────────────────────────────────────────────────

const IS_NODE = typeof require === 'function';
const IS_JXA  = typeof ObjC   !== 'undefined';

var _write, _args, _dir;

if (IS_NODE) {
  var _fs   = require('fs');
  var _path = require('path');
  _dir   = _path.dirname(_path.resolve(__filename));
  _write = function(p, t) { _fs.writeFileSync(p, t, 'utf8'); };
  _args  = process.argv.slice(2);
} else {
  ObjC.import('Foundation');
  var _fm = $.NSFileManager.defaultManager;
  _dir    = ObjC.unwrap(_fm.currentDirectoryPath);
  _write  = function(p, t) {
    $(t).dataUsingEncoding($.NSUTF8StringEncoding)
        .writeToFileAtomically(p, true);
  };
  _args = (function() {
    var raw = ObjC.unwrap($.NSProcessInfo.processInfo.arguments);
    var result = [];
    for (var i = 0; i < raw.length; i++) result.push(ObjC.unwrap(raw[i]));
    var scriptIdx = -1;
    for (var i = 0; i < result.length; i++) {
      if (result[i].indexOf('generate-scale-test') >= 0) { scriptIdx = i; break; }
    }
    return scriptIdx >= 0 ? result.slice(scriptIdx + 1) : [];
  })();
}

// ── Konfiguration ─────────────────────────────────────────────────────────

var TARGET_PERSONS = parseInt(_args[0], 10) || 20000;
var OUT_FILE = _args[1] || (_dir + '/scale-test-' + TARGET_PERSONS + '.ged');

// ── Namens-Pool ───────────────────────────────────────────────────────────

var GIVEN_M = ['Johann','Hans','Karl','Friedrich','Wilhelm','Georg','Heinrich',
               'Peter','Paul','Martin','Andreas','Josef','Ludwig','Otto','Ernst',
               'Klaus','Dieter','Werner','Helmut','Walter','Thomas','Stefan',
               'Michael','Christian','Andreas','Franz','Anton','Alois','Bernhard',
               'Herbert','Konrad','Rudolf','Siegfried','Alfred','Erich','Kurt',
               'Günther','Manfred','Horst','Rainer','Gerhard','Ulrich','Norbert',
               'Ingo','Lothar','Jürgen','Hartmut','Arno','Clemens','Dietrich'];
var GIVEN_F = ['Maria','Anna','Elisabeth','Katharina','Barbara','Margarethe',
               'Christine','Ursula','Monika','Hildegard','Gertrud','Helga',
               'Ingrid','Renate','Brigitte','Erika','Hannelore','Elke','Sigrid',
               'Irmgard','Lore','Gisela','Christa','Waltraud','Ilse','Edith',
               'Hilde','Anni','Frieda','Emma','Bertha','Adelheid','Hedwig',
               'Sofie','Lotte','Clara','Ida','Erna','Martha','Grete','Herta',
               'Rosa','Elfriede','Thea','Lieselotte','Marlene','Anneliese','Ruth'];
var SURNAMES = ['Müller','Schmidt','Schneider','Fischer','Weber','Meyer','Wagner',
                'Becker','Schulz','Hoffmann','Schäfer','Koch','Bauer','Richter',
                'Klein','Wolf','Schröder','Neumann','Schwarz','Zimmermann',
                'Braun','Krüger','Hofmann','Hartmann','Lange','Schmitt','Werner',
                'Schmitz','Krause','Meier','Lehmann','Schmid','Schulze','Maier',
                'Köhler','Herrmann','König','Walter','Mayer','Huber','Kaiser',
                'Fuchs','Peters','Lang','Scholz','Möller','Weiß','Jung','Hahn',
                'Schubert','Voigt','Bergmann','Friedrich','Keller','Günther'];
var PLACES   = ['Berlin','Hamburg','München','Köln','Frankfurt','Stuttgart',
                'Düsseldorf','Leipzig','Dresden','Hannover','Bremen','Nürnberg',
                'Duisburg','Bochum','Wuppertal','Bielefeld','Bonn','Mannheim',
                'Karlsruhe','Wiesbaden','Münster','Augsburg','Aachen','Dortmund',
                'Essen','Gelsenkirchen','Kiel','Lübeck','Erfurt','Rostock',
                'Kassel','Saarbrücken','Freiburg','Mainz','Potsdam','Würzburg',
                'Halle','Magdeburg','Braunschweig','Krefeld','Oberhausen'];
var SOURCES  = ['Kirchenbuch St. Maria','Standesamtsregister','Familienbuch',
                'Sterbebuch Gemeinde','Geburtsregister Stadt','Taufbuch Pfarrei',
                'Militärstammrolle','Volkszählung 1871','Adressbuch 1900'];

// ── Pseudo-Zufallsgenerator (deterministisch, reproduzierbar) ─────────────

var _seed = 42;
function rng() {
  _seed = (_seed * 1664525 + 1013904223) & 0xffffffff;
  return (_seed >>> 0) / 0x100000000;
}
function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }
function rand(lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)); }

// ── Personen- und Familien-Datenstruktur aufbauen ─────────────────────────

var persons = [];   // { id, givenName, surname, sex, birthYear, birthPlace, deathYear, deathPlace, sid1, sid2, famcId, famsId }
var families = [];  // { id, husbId, wifeId, children[] }

var personCount = 0;
var familyCount = 0;

function makePerson(sex, surname, birthYear) {
  personCount++;
  var id = '@I' + personCount + '@';
  var givenName = sex === 'M' ? pick(GIVEN_M) : pick(GIVEN_F);
  var bp = pick(PLACES);
  var dp = pick(PLACES);
  var deathYear = birthYear + rand(55, 95);
  return {
    id: id,
    givenName: givenName,
    surname: surname,
    sex: sex,
    birthYear: birthYear,
    birthPlace: bp,
    deathYear: deathYear > 2025 ? null : deathYear,
    deathPlace: dp,
    sid1: '@S' + rand(1, 9) + '@',
    sid2: rng() > 0.5 ? '@S' + rand(1, 9) + '@' : null,
    famcId: null,  // Eltern-Familie
    famsId: null   // eigene Familie
  };
}

function makeFamily(husbId, wifeId, year) {
  familyCount++;
  var id = '@F' + familyCount + '@';
  return { id: id, husbId: husbId, wifeId: wifeId, marriageYear: year, children: [] };
}

// ── Generationen-Aufbau ───────────────────────────────────────────────────
// Starte mit einer Gründer-Generation, verdopple je Generation.
// Jede Familie hat 2–4 Kinder (mix M/F). Kinder heiraten je einen Partner
// und bekommen selbst Kinder — bis TARGET_PERSONS erreicht.

// Quellenpool anlegen (9 Quellen)
var sourceLines = [];
for (var si = 1; si <= 9; si++) {
  sourceLines.push('0 @S' + si + '@ SOUR');
  sourceLines.push('1 TITL ' + SOURCES[si - 1]);
  sourceLines.push('1 AUTH Stadtarchiv');
  sourceLines.push('1 PUBL Archiv, ' + rand(1850, 1950));
}

// Erste Generation: 1 Stammfamilie
var startYear = 1700;
var surname0  = pick(SURNAMES);

var gen0Husb = makePerson('M', surname0, startYear);
var gen0Wife = makePerson('F', pick(SURNAMES), startYear + rand(-3, 3));
persons.push(gen0Husb, gen0Wife);

var gen0Fam = makeFamily(gen0Husb.id, gen0Wife.id, startYear + rand(20, 28));
gen0Husb.famsId = gen0Fam.id;
gen0Wife.famsId = gen0Fam.id;
families.push(gen0Fam);

// Queue: Familien, aus denen die nächste Generation stammt
var queue = [{ fam: gen0Fam, year: gen0Fam.marriageYear }];

while (personCount < TARGET_PERSONS && queue.length > 0) {
  var nextQueue = [];

  for (var qi = 0; qi < queue.length && personCount < TARGET_PERSONS; qi++) {
    var entry   = queue[qi];
    var parentFam = entry.fam;
    var childBirthBase = entry.year - rand(25, 35) + rand(0, 5); // Eltern ca 25-35 beim ersten Kind

    var nChildren = rand(2, 4);
    for (var ci = 0; ci < nChildren && personCount < TARGET_PERSONS; ci++) {
      var csex = rng() > 0.5 ? 'M' : 'F';
      var csurname = csex === 'M' ? parentFam.husbId ? persons.find(function(p){ return p.id === parentFam.husbId; }).surname : pick(SURNAMES) : pick(SURNAMES);
      var childBY = childBirthBase + ci * rand(2, 4);

      var child = makePerson(csex, csurname, childBY);
      child.famcId = parentFam.id;
      parentFam.children.push(child.id);
      persons.push(child);

      // Kind heiratet und bekommt eigene Familie (wenn genug Platz)
      if (personCount < TARGET_PERSONS - 2) {
        var spouseSex  = csex === 'M' ? 'F' : 'M';
        var spouseSurn = spouseSex === 'M' ? child.surname : pick(SURNAMES);
        var spouse     = makePerson(spouseSex, spouseSurn, childBY + rand(-4, 4));
        persons.push(spouse);

        var marriageY  = childBY + rand(22, 30);
        var newFam     = makeFamily(
          csex === 'M' ? child.id  : spouse.id,
          csex === 'M' ? spouse.id : child.id,
          marriageY
        );
        child.famsId  = newFam.id;
        spouse.famsId = newFam.id;
        families.push(newFam);
        nextQueue.push({ fam: newFam, year: marriageY });
      }
    }
  }

  queue = nextQueue;
  if (queue.length === 0) break;  // Baum erschöpft, Ende
}

// ── GEDCOM-Text erzeugen ─────────────────────────────────────────────────

var lines = [];

// HEAD
lines.push('0 HEAD');
lines.push('1 GEDC');
lines.push('2 VERS 5.5.1');
lines.push('2 FORM LINEAGE-LINKED');
lines.push('1 SOUR SCALE-TEST-GENERATOR');
lines.push('2 VERS 1.0');
lines.push('2 NAME generate-scale-test.js');
lines.push('1 DATE 7 JUN 2026');
lines.push('1 CHAR UTF-8');
lines.push('1 NOTE Synthetisches GEDCOM fuer SCALE-TEST (' + personCount + ' Personen, ' + familyCount + ' Familien)');

// Personen
var personMap = {};
for (var pi = 0; pi < persons.length; pi++) {
  var p = persons[pi];
  personMap[p.id] = p;
}

for (var pi = 0; pi < persons.length; pi++) {
  var p = persons[pi];
  lines.push('0 ' + p.id + ' INDI');
  lines.push('1 NAME ' + p.givenName + ' /' + p.surname + '/');
  lines.push('2 GIVN ' + p.givenName);
  lines.push('2 SURN ' + p.surname);
  lines.push('1 SEX ' + p.sex);

  // BIRT
  var bm = rand(1, 12);
  var bd = rand(1, 28);
  lines.push('1 BIRT');
  lines.push('2 DATE ' + bd + ' ' + ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][bm-1] + ' ' + p.birthYear);
  lines.push('2 PLAC ' + p.birthPlace);
  lines.push('2 SOUR ' + p.sid1);
  lines.push('3 QUAY ' + rand(0, 3));

  // DEAT
  if (p.deathYear) {
    var dm = rand(1, 12);
    var dd = rand(1, 28);
    lines.push('1 DEAT');
    lines.push('2 DATE ' + dd + ' ' + ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][dm-1] + ' ' + p.deathYear);
    lines.push('2 PLAC ' + p.deathPlace);
    if (p.sid2) {
      lines.push('2 SOUR ' + p.sid2);
      lines.push('3 QUAY ' + rand(0, 2));
    }
  }

  // OCCU (bei ~30% der Personen)
  if (rng() < 0.3) {
    var occus = ['Bauer','Schmied','Weber','Schneider','Kaufmann','Lehrer',
                 'Arzt','Soldat','Handwerker','Bergmann','Fischer','Zimmermann'];
    lines.push('1 OCCU ' + pick(occus));
  }

  // FAMC / FAMS
  if (p.famcId) lines.push('1 FAMC ' + p.famcId);
  if (p.famsId) lines.push('1 FAMS ' + p.famsId);

  lines.push('1 CHAN');
  lines.push('2 DATE 7 JUN 2026');
}

// Familien
for (var fi = 0; fi < families.length; fi++) {
  var f = families[fi];
  lines.push('0 ' + f.id + ' FAM');
  if (f.husbId) lines.push('1 HUSB ' + f.husbId);
  if (f.wifeId) lines.push('1 WIFE ' + f.wifeId);
  lines.push('1 MARR');
  lines.push('2 DATE ' + rand(1, 28) + ' ' + ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][rand(0,11)] + ' ' + f.marriageYear);
  lines.push('2 PLAC ' + pick(PLACES));
  for (var chi = 0; chi < f.children.length; chi++) {
    lines.push('1 CHIL ' + f.children[chi]);
  }
  lines.push('1 CHAN');
  lines.push('2 DATE 7 JUN 2026');
}

// Quellen
for (var sli = 0; sli < sourceLines.length; sli++) {
  lines.push(sourceLines[sli]);
}

// TRLR
lines.push('0 TRLR');

var gedText = lines.join('\r\n') + '\r\n';

// ── Ausgabe ───────────────────────────────────────────────────────────────

_write(OUT_FILE, gedText);

var sizeMB = (gedText.length / 1024 / 1024).toFixed(2);
var lineCount = lines.length;

console.log('✓ Generiert: ' + OUT_FILE);
console.log('  Personen : ' + personCount);
console.log('  Familien : ' + familyCount);
console.log('  Zeilen   : ' + lineCount);
console.log('  Größe    : ' + sizeMB + ' MB');
