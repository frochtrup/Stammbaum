#!/usr/bin/env node
// .claude/skills/spec-lint/check-backlog.mjs — mechanischer Teil von spec-lint:
// prüft specs/v9/05-Backlog.md gegen die Realität (Regeln L1–L6, in der Tabelle
// „Lint-Regeln" ebendort dokumentiert — L6 hält Tabelle und Implementierung deckungsgleich,
// diese Zeile hier also auch: sie war nach dem Nachrüsten von L5 als Erstes veraltet).
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

/** Zerlegt die Backlog-Tabellen in Zeilen — inklusive des Abschnitts (`## …`), unter dem
 *  die Zeile steht. Der Abschnitt ist das, was ein Mensch beim Überfliegen tatsächlich
 *  liest; die Status-Spalte ist die achte und liegt beim Lesen oft außerhalb des
 *  Sichtfelds (s. L5). */
export function parseBacklog(text) {
  const zeilen = [];
  let abschnitt = '';
  for (const l of text.split('\n')) {
    const h = /^## (.+)$/.exec(l);
    if (h) {
      abschnitt = h[1].trim();
      continue;
    }
    if (!/^\| BL-\d+ \|/.test(l)) continue;
    const c = l.split('|').map((s) => s.trim()).filter(Boolean);
    zeilen.push({ id: c[0], prio: c[1], typ: c[2], klasse: c[3], punkt: c[4], spec: c[5], beleg: c[6].replace(/`/g, ''), status: c[7], abschnitt });
  }
  return zeilen;
}

/** L5: Welcher Abschnitt zu welchem Status gehört. */
const ABSCHNITT_FUER_STATUS = { offen: 'Offene Punkte', gebaut: 'Erledigte Punkte' };

/** Die tatsächlich implementierten Regeln — abgeleitet aus dem EIGENEN Quelltext, nicht
 *  aus einer gepflegten Liste. Eine Liste wäre wieder eine Fassung, die beim Hinzufügen
 *  einer Regel vergessen werden kann; genau das ist bei der Backlog-Tabelle passiert
 *  (s. L6). Erkannt wird jedes `fehler.push(\`L<n> …\`)` bzw. `warnungen.push(\`L<n> …\`)`. */
export function implementierteRegeln(quelltext) {
  return new Set(
    [...quelltext.matchAll(/(?:fehler|warnungen)\.push\(\s*`L(\d+)\b/g)].map((m) => `L${m[1]}`),
  );
}

/** Die im Backlog dokumentierten Regeln — die Zeilen der Tabelle „Lint-Regeln". */
export function dokumentierteRegeln(backlogText) {
  return new Set([...backlogText.matchAll(/^\| (L\d+) \|/gm)].map((m) => m[1]));
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

  // L5: Steht die Zeile im Abschnitt, der zu ihrem Status passt?
  //
  // WARUM DIESE REGEL EXISTIERT (Nutzer-Fund 2026-07-18): BL-01 war fertig, der Status
  // stand korrekt auf „gebaut" — die Zeile blieb aber unter „Offene Punkte" stehen, weil
  // beim Erledigen nur das Status-Wort geändert und die Zeile nicht verschoben wurde.
  // Vier Läufe lang meldete dieser Prüfer „konsistent": L1/L2 vergleichen Status gegen
  // Beleg, und beides passte. Aufgefallen ist es erst beim Lesen auf GitHub — dort ist
  // die Statusspalte die achte und liegt außerhalb des Sichtfelds, sichtbar ist die
  // ÜBERSCHRIFT. Eine Zeile, die man nur durch Scrollen als erledigt erkennt, ist
  // praktisch nicht erledigt.
  //
  // Die Regel ist bewusst strikt (Fehler, keine Warnung): beide Abschnitte sind
  // homogen (30x offen / 48x gebaut), es gibt keine legitime Ausnahme, und BL-Zeilen
  // kommen in keinem anderen Abschnitt vor (geprüft, nicht angenommen).
  for (const z of zeilen) {
    const soll = ABSCHNITT_FUER_STATUS[z.status];
    if (soll && z.abschnitt !== soll)
      fehler.push(
        `L5 ${z.id} steht auf "${z.status}", aber im Abschnitt „${z.abschnitt}" — ` +
          `gehört unter „${soll}" (Status-Wort ändern reicht nicht, die Zeile muss umziehen)`,
      );
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

  // L6: Deckt sich die Regel-Aufzählung im Backlog mit den implementierten Regeln?
  //
  // WARUM DIESE REGEL EXISTIERT (Nutzer-Frage 2026-07-18, direkt nach dem Nachrüsten
  // von L5): die Regeln standen an DREI Stellen — Implementierung, `SKILL.md` und der
  // Tabelle „Lint-Regeln" in 05-Backlog.md — ohne jeden Abgleich. Beim Nachrüsten von L5
  // wurden zwei davon sofort vergessen. Damit verletzte ausgerechnet die Regel-Doku die
  // Regel 1 dieses Dokuments („Zeiger, kein Inhalt — sonst driften zwei Fassungen
  // auseinander"), und zwar innerhalb weniger Stunden.
  //
  // Die Tabelle wird NICHT gelöscht: ihre Spalten „Härte"/„Fängt" und der Absatz zur
  // Asymmetrie begründen das Design des Backlogs selbst und stehen nirgends sonst. Statt
  // sie zur Drift-Quelle zu machen, wird sie hier zum geprüften Kontrakt.
  const implementiert = implementierteRegeln(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8'));
  const dokumentiert = dokumentierteRegeln(text);
  for (const r of [...implementiert].sort())
    if (!dokumentiert.has(r))
      fehler.push(`L6 Regel ${r} ist implementiert, fehlt aber in der Tabelle „Lint-Regeln" in 05-Backlog.md`);
  for (const r of [...dokumentiert].sort())
    if (!implementiert.has(r))
      fehler.push(`L6 Regel ${r} steht in der Tabelle „Lint-Regeln", ist aber nicht implementiert`);

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
    // Vorlage-Pfad statt einer echten „gibt es noch nicht"-Datei: dieser Fall hing an
    // app/public/sw.js, bis BL-02 den Service Worker baute — seither existierte die
    // Datei und der Fall schlug still fehl. Ein Pfad unter fixtures/, der bewusst nie
    // angelegt wird, kann nicht durch ein künftiges Feature wahr werden.
    ['datei: fehlende Datei', 'datei:.claude/skills/spec-lint/fixtures/nie-angelegt.ts', false],
    ['spec: Datei im Spec-Repo', 'spec:specs/v9/05-Backlog.md', true],
    ['test: unskipped Test trifft', 'test:tests/ui/design-system-flex.test.ts', true],
    // Eigene Vorlage statt einer Produktivdatei: dieser Fall hing an
    // tests/perf/scale.perf.test.ts, solange das `it.skip` trug. BL-47 entskippte es —
    // seither schlug der Selbsttest still fehl, weil ihn niemand aufruft (`--selftest`
    // läuft weder im Normallauf noch in CI). Gefunden 2026-07-18 beim Nachrüsten von L5.
    ['test: geskippter Test trifft NICHT', 'test:.claude/skills/spec-lint/fixtures/skipped-example.ts', false],
    // Ebenfalls von einer Produktivdatei gelöst: hing an txt:max-lines@eslint.config.js,
    // bis BL-54 genau diese Regel dort eintrug (gefunden 2026-07-18 bei BL-04).
    ['txt: Muster NICHT im Rohtext', 'txt:diesesMusterStehtDortNie@.claude/skills/spec-lint/fixtures/stabiler-text.txt', false],
    ['txt: Muster IM Rohtext', 'txt:Selbsttest@.claude/skills/spec-lint/fixtures/stabiler-text.txt', true],
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

  // L5 negativ prüfen: der Prüfer muss den Fall SEHEN, der ihn ausgelöst hat (BL-01 stand
  // mit Status „gebaut" unter „Offene Punkte"). Ohne diese Gegenprobe wäre L5 selbst
  // wieder ein Wächter, dessen Rot-Fall nie gesehen wurde.
  const l5Fall = [
    '## Offene Punkte',
    '| ID | P | Typ | Klasse | Punkt | Spec | Beleg | Status |',
    '| BL-90 | K | feature | basis | fertig, aber falscher Abschnitt | [20](20-Funktionen.md) | `sym:x` | gebaut |',
    '## Erledigte Punkte',
    '| BL-91 | K | feature | basis | korrekt einsortiert | [20](20-Funktionen.md) | `sym:y` | gebaut |',
  ].join('\n');
  const geparst = parseBacklog(l5Fall);
  const falsch = geparst.filter((z) => ABSCHNITT_FUER_STATUS[z.status] !== z.abschnitt);
  const l5ok = geparst.length === 2 && falsch.length === 1 && falsch[0].id === 'BL-90';
  console.log(
    `${l5ok ? '  ok  ' : ' FAIL '} L5 erkennt „gebaut" unter „Offene Punkte"`.padEnd(50) +
      `  → ${falsch.map((z) => z.id).join(',') || 'nichts erkannt'}`,
  );
  if (!l5ok) bad++;

  // L6 negativ prüfen: die Ableitung aus dem Quelltext muss eine Regel finden, die NUR
  // implementiert ist, und eine, die NUR dokumentiert ist. Ohne diese Gegenprobe wäre
  // nicht belegt, dass L6 in beide Richtungen schaut — und die eine Richtung, die fehlt,
  // ist erfahrungsgemäß die, in der die Drift dann auftritt.
  // Die Vorlage wird ZUSAMMENGESETZT, nicht literal hingeschrieben: stünde
  // `push(\`L9 …\`)` wörtlich hier, läse die Ableitung es beim Scan des ECHTEN Quelltexts
  // als implementierte Regel L9 mit — der Prüfer vergiftete sich an seinem eigenen
  // Selbsttest. Genau so passiert, beim ersten Lauf, sofort sichtbar am Normallauf.
  const q = '`';
  const impl = implementierteRegeln(`fehler.push(${q}L1 x${q}); warnungen.push(${q}L9 y${q});`);
  const doku = dokumentierteRegeln('| L1 | … |\n| L8 | … |\n');
  const nurImpl = [...impl].filter((r) => !doku.has(r));
  const nurDoku = [...doku].filter((r) => !impl.has(r));
  const l6ok = nurImpl.join() === 'L9' && nurDoku.join() === 'L8';
  console.log(
    `${l6ok ? '  ok  ' : ' FAIL '} L6 erkennt Drift in beide Richtungen`.padEnd(50) +
      `  → nur implementiert: ${nurImpl.join() || '–'} · nur dokumentiert: ${nurDoku.join() || '–'}`,
  );
  if (!l6ok) bad++;

  // Und der Fall, der L6 überhaupt ausgelöst hat: findet die Ableitung im ECHTEN
  // Quelltext alle Regeln? Eine Ableitung, die still zu wenig findet, meldete Deckung,
  // wo keine ist — dieselbe Klasse wie ein Lint, der still nichts findet.
  const echt = implementierteRegeln(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8'));
  const echtOk = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].every((r) => echt.has(r));
  console.log(
    `${echtOk ? '  ok  ' : ' FAIL '} L6 leitet alle Regeln aus dem Quelltext ab`.padEnd(50) +
      `  → ${[...echt].sort().join(',')}`,
  );
  if (!echtOk) bad++;
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
// Der Selbsttest laeuft IMMER mit, nicht nur auf --selftest.
//
// Warum (Lehre 2026-07-18, BL-04): dieselbe Verrottung ist dreimal passiert — der
// geskippte-Test-Fall (BL-47 entskippte die Vorlage), der Fall "fehlende Datei"
// (BL-02 baute app/public/sw.js) und der Fall "Muster nicht im Rohtext" (BL-54 trug
// max-lines in eslint.config.js ein). Jedes Mal haengte ein Fall an einer Produktivdatei,
// die ein spaeteres Feature veraenderte; jedes Mal schlug er danach STILL fehl, weil
// --selftest weder im Normallauf noch in CI lief. Die bisherige Absicherung war ein Satz
// in SKILL.md ("wer den Pruefer anfasst, ruft ihn auf") — also Erinnerung statt Zwang.
// Jetzt faellt es beim naechsten gewoehnlichen Lauf auf, ohne dass jemand daran denkt.
// Kosten: wenige Millisekunden. Ausgabe nur im Fehlerfall, damit der Normallauf knapp bleibt.
const selbsttestFehler = (() => {
  const log = console.log;
  const gepuffert = [];
  console.log = (...a) => gepuffert.push(a.join(' '));
  const bad = selftest();
  console.log = log;
  if (bad) {
    console.log('FEHLER   Selbsttest des Pruefers schlaegt fehl — die Belegauswertung ist unzuverlaessig:');
    for (const z of gepuffert) if (z.startsWith(' FAIL')) console.log(`  ${z.trim()}`);
  }
  return bad;
})();

const { fehler, warnungen, zeilen } = pruefe();
for (const w of warnungen) console.log(`WARNUNG  ${w}`);
for (const f of fehler) console.log(`FEHLER   ${f}`);
const nachTyp = zeilen.reduce((a, z) => ((a[z.typ] = (a[z.typ] || 0) + 1), a), {});
console.log(
  `\n${zeilen.length} Backlog-Zeilen (${Object.entries(nachTyp).map(([k, v]) => `${k}:${v}`).join(' · ')}) — ` +
    `${fehler.length ? `${fehler.length} Fehler` : 'konsistent'}${warnungen.length ? `, ${warnungen.length} Warnung(en)` : ''}.`,
);
process.exit(fehler.length || selbsttestFehler ? 1 : 0);
}
