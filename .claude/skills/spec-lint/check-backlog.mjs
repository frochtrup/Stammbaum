#!/usr/bin/env node
// .claude/skills/spec-lint/check-backlog.mjs — mechanischer Teil von spec-lint:
// prüft specs/v9/05-Backlog.md gegen die Realität (Regeln L1–L4, dort dokumentiert).
//
// WARUM ALS SKRIPT: Bau-Status per Hand zu pflegen hat nachweislich versagt — Spec 20
// und die ADR-v9-78-Überschrift behaupteten beide „nicht gebaut" für Funktionen, die
// seit Commit 7a7bf6a existieren. Jede Backlog-Zeile trägt deshalb einen Beleg, der
// hier gegen den echten Code ausgewertet wird.
//
// KEIN grep: das lokale grep (ugrep) liefert auf manchen Dateien still ein leeres
// Ergebnis (belegt an core/places/curation.ts, 15,6 KB, 8 Exporte → 0 Treffer). Ein
// still leeres Ergebnis ist von „kommt nicht vor" nicht unterscheidbar und würde
// Zeilen fälschlich als `offen` bestätigen. Deshalb wird jede Datei selbst gelesen.
//
// Aufruf:  node .claude/skills/spec-lint/check-backlog.mjs [--selftest]
// Exit 0 = konsistent · 1 = Drift gefunden.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SPEC = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const CODE = path.join(process.env.HOME ?? '', 'dev/stammbaum-v9');
const BACKLOG = path.join(SPEC, 'specs/v9/05-Backlog.md');

/** L3-Ratsche: Ist-Stand der Status-Wörter in den Specs 10–32 am 2026-07-18.
 *  Seit BL-50 (2026-07-18) auf 0 — die 33 Altlast-Stellen sind entfernt. NIE WIEDER
 *  ANHEBEN: ein Status-Wort in den Specs 10–32 ist ab jetzt ein harter Fehler, kein
 *  geduldeter Rest. Wer Status ausdruecken will, legt eine Backlog-Zeile an. */
const L3_RATSCHE = 0;
const L3_WOERTER =
  /(nicht gebaut|✅ gebaut|noch offen|noch nicht gebaut|bleibt offen|weiterhin offen|offene Folgearbeit|nicht umgesetzt)/gi;

// --- Dateizugriff -----------------------------------------------------------

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir)) {
    if (e === 'node_modules' || e === 'dist') continue;
    const f = path.join(dir, e);
    if (fs.statSync(f).isDirectory()) walk(f, out);
    else if (['.ts', '.svelte', '.js'].includes(path.extname(f))) out.push(f);
  }
  return out;
}

/** Liest einen Pfad; sucht erst im Code-, dann im Spec-Repo. */
function readAny(p) {
  for (const root of [CODE, SPEC]) {
    const f = path.join(root, p);
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return fs.readFileSync(f, 'utf8');
  }
  return null;
}

/** Löst `*` im Dateinamen auf (nur eine Ebene, kein `**`). */
function expandGlob(pattern) {
  if (!pattern.includes('*')) return [pattern];
  const dir = path.dirname(pattern);
  const rx = new RegExp('^' + path.basename(pattern).replace(/[.]/g, '[.]').replace(/[*]/g, '.*') + '$');
  for (const root of [CODE, SPEC]) {
    const full = path.join(root, dir);
    if (fs.existsSync(full)) return fs.readdirSync(full).filter((f) => rx.test(f)).map((f) => path.join(dir, f));
  }
  return [];
}

// --- Beleg-Auswertung (Syntax: s. 05-Backlog.md) ----------------------------

let codeSources = null;
const getCodeSources = () =>
  (codeSources ??= ['core', 'services', 'ui', 'app']
    .flatMap((d) => walk(path.join(CODE, d)))
    .map((f) => stripComments(fs.readFileSync(f, 'utf8'))));

/** Trifft der Beleg? „Trifft" heißt: die Fertig-Bedingung ist erfüllt. */
export function evalBeleg(beleg) {
  const negiert = beleg.startsWith('!');
  const b = negiert ? beleg.slice(1) : beleg;
  const i = b.indexOf(':');
  if (i < 0) throw new Error(`Beleg ohne Art-Präfix: ${beleg}`);
  const art = b.slice(0, i);
  const wert = b.slice(i + 1);
  let treffer;

  switch (art) {
    case 'sym':
      // Kommentare entfernt: hier ist Prosa in Kommentaren die Gefahr.
      treffer = getCodeSources().some((s) =>
        new RegExp(`export\\s+(async\\s+)?(function|const|class|interface|type)\\s+${wert}\\b`).test(s),
      );
      break;
    case 'datei':
      treffer = fs.existsSync(path.join(CODE, wert));
      break;
    case 'spec':
      treffer = fs.existsSync(path.join(SPEC, wert));
      break;
    case 'test': {
      const t = readAny(wert);
      treffer = !!t && !/\b(it|describe)\.skip\b/.test(t);
      break;
    }
    case 'txt': {
      // ROHTEXT, absichtlich: bei txt: ist der Kommentar oft das Ziel (eslint-disable),
      // und in Markdown wäre Kommentar-Strippen sinnlos.
      const at = wert.lastIndexOf('@');
      if (at < 0) throw new Error(`txt:-Beleg ohne @Pfad: ${beleg}`);
      const muster = wert.slice(0, at).split(',');
      const dateien = wert.slice(at + 1).split(',').flatMap(expandGlob);
      treffer = dateien.some((f) => {
        const t = readAny(f);
        return !!t && muster.some((m) => new RegExp(m, 'm').test(t));
      });
      break;
    }
    default:
      throw new Error(`Unbekannte Beleg-Art "${art}" in: ${beleg}`);
  }
  return negiert ? !treffer : treffer;
}

/** Zerlegt die Backlog-Tabellen in Zeilen. */
export function parseBacklog(text) {
  return text
    .split('\n')
    .filter((l) => /^\| BL-\d+ \|/.test(l))
    .map((l) => {
      const c = l.split('|').map((s) => s.trim()).filter(Boolean);
      return { id: c[0], prio: c[1], typ: c[2], klasse: c[3], punkt: c[4], spec: c[5], beleg: c[6].replace(/`/g, ''), status: c[7] };
    });
}

// --- Prüfungen --------------------------------------------------------------

function pruefe() {
  const fehler = [];
  const warnungen = [];
  const text = fs.readFileSync(BACKLOG, 'utf8');
  const zeilen = parseBacklog(text);

  if (!fs.existsSync(CODE)) {
    console.log(`ÜBERSPRUNGEN: Code-Repo ${CODE} nicht erreichbar — L1/L2 nicht prüfbar.`);
    return { fehler, warnungen, zeilen: [] };
  }

  const ids = new Set();
  for (const z of zeilen) {
    if (ids.has(z.id)) fehler.push(`${z.id}: doppelte ID (IDs werden nie wiederverwendet)`);
    ids.add(z.id);
    if (!['offen', 'gebaut'].includes(z.status)) {
      fehler.push(`${z.id}: Status "${z.status}" — erlaubt sind nur "offen" und "gebaut" (kein „teilweise")`);
      continue;
    }
    let treffer;
    try {
      treffer = evalBeleg(z.beleg);
    } catch (e) {
      fehler.push(`${z.id}: ${e.message}`);
      continue;
    }
    if (z.status === 'offen' && treffer)
      fehler.push(`L1 ${z.id} [${z.typ}] steht auf "offen", aber der Beleg trifft → vermutlich längst gebaut: ${z.punkt}`);
    if (z.status === 'gebaut' && !treffer)
      fehler.push(`L2 ${z.id} [${z.typ}] steht auf "gebaut", aber der Beleg trifft nicht → umbenannt/gelöscht? ${z.punkt}`);
  }

  // L3-Ratsche: Status-Wörter in den Specs 10–32.
  let l3 = 0;
  const l3Dateien = [];
  for (const f of fs.readdirSync(path.join(SPEC, 'specs/v9')).filter((f) => /^[123]\d-/.test(f))) {
    const n = (fs.readFileSync(path.join(SPEC, 'specs/v9', f), 'utf8').match(L3_WOERTER) || []).length;
    if (n) { l3 += n; l3Dateien.push(`${f}:${n}`); }
  }
  if (l3 > L3_RATSCHE)
    fehler.push(`L3 Status-Wörter in Specs 10–32: ${l3} > Ratsche ${L3_RATSCHE} (${l3Dateien.join(' · ')}) — Soll und Ist vermischen sich wieder`);
  else if (l3 > 0)
    warnungen.push(`L3 ${l3} Status-Wörter in Specs 10–32 (Ratsche ${L3_RATSCHE}, BL-50 offen): ${l3Dateien.join(' · ')}`);

  // L4: Spec-Links der Backlog-Zeilen auflösbar?
  for (const z of zeilen)
    for (const m of z.spec.matchAll(/\]\(([^)#]+\.md)/g))
      if (!fs.existsSync(path.join(SPEC, 'specs/v9', m[1])))
        warnungen.push(`L4 ${z.id}: Spec-Link "${m[1]}" nicht auflösbar`);

  return { fehler, warnungen, zeilen };
}

// --- Selbsttest -------------------------------------------------------------
// Ein Lint, der still nichts findet, ist schlimmer als keiner. Diese Fälle sind
// alle beim Aufsetzen des Backlogs real aufgetreten.

function selftest() {
  const faelle = [
    ['sym: findet echten Export', 'sym:parseGedcom', true],
    ['sym: findet Nicht-Existentes nicht', 'sym:diesesSymbolGibtEsNicht', false],
    ['datei: existierende Datei', 'datei:ui/shell/BottomNav.svelte', true],
    ['datei: fehlende Datei', 'datei:app/public/sw.js', false],
    ['spec: Datei im Spec-Repo', 'spec:specs/v9/05-Backlog.md', true],
    ['test: unskipped Test trifft', 'test:tests/ui/design-system-flex.test.ts', true],
    ['test: geskippter Test trifft NICHT', 'test:tests/perf/scale.perf.test.ts', false],
    ['txt: Muster im Rohtext', 'txt:max-lines@eslint.config.js', false],
    ['! negiert korrekt', '!sym:diesesSymbolGibtEsNicht', true],
    ['txt: findet Kommentar (nicht gestrippt)', 'txt:no-useless-assignment@ui/views/timeline/TimelineLensView.svelte', true],
  ];
  let bad = 0;
  for (const [name, beleg, erwartet] of faelle) {
    let ist;
    try { ist = evalBeleg(beleg); } catch (e) { ist = `FEHLER: ${e.message}`; }
    const ok = ist === erwartet;
    if (!ok) bad++;
    console.log(`${ok ? '  ok  ' : ' FAIL '} ${name.padEnd(42)} ${beleg}  → ${ist} (erwartet ${erwartet})`);
  }
  // Der wichtigste Fall: eine unbekannte Beleg-Art muss LAUT scheitern, nicht still false liefern.
  try {
    evalBeleg('quatsch:irgendwas');
    console.log(' FAIL  unbekannte Beleg-Art scheitert nicht');
    bad++;
  } catch {
    console.log('  ok   unbekannte Beleg-Art wirft (statt still false)');
  }
  console.log(bad === 0 ? '\nSelbsttest grün.' : `\nSelbsttest: ${bad} Fehler.`);
  return bad;
}

// --- Hauptlauf --------------------------------------------------------------
// Nur wenn direkt aufgerufen: sonst wuerde ein `import` dieses Moduls (z. B. um
// evalBeleg einzeln zu testen) den vollen Lauf ausloesen UND process.exit() rufen.

const direktAufgerufen = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (direktAufgerufen && process.argv.includes('--selftest')) {
  process.exit(selftest() === 0 ? 0 : 1);
}

if (!direktAufgerufen) {
  // Als Bibliothek importiert — nichts ausfuehren.
} else {
const { fehler, warnungen, zeilen } = pruefe();
for (const w of warnungen) console.log(`WARNUNG  ${w}`);
for (const f of fehler) console.log(`FEHLER   ${f}`);
const nachTyp = zeilen.reduce((a, z) => ((a[z.typ] = (a[z.typ] || 0) + 1), a), {});
console.log(
  `\n${zeilen.length} Backlog-Zeilen (${Object.entries(nachTyp).map(([k, v]) => `${k}:${v}`).join(' · ')}) — ` +
    `${fehler.length ? `${fehler.length} Fehler` : 'konsistent'}${warnungen.length ? `, ${warnungen.length} Warnung(en)` : ''}.`,
);
process.exit(fehler.length ? 1 : 0);
}
