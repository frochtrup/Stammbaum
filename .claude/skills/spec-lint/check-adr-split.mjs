#!/usr/bin/env node
// check-adr-split.mjs — erzwingt den 04↔04a-Split strukturell (BL-161).
//
// Der `decision-log`-Skill (Schritt 3a) verlangt: `04-Entscheidungslog.md` enthält NUR die
// bindende Entscheidung (Kontext/Entscheidung/Konsequenz/Verworfen/Refs). Jeder NACHTRAG —
// Bau-Status, Commit, Testzahlen, Verifikationsbefund, Lehre — gehört nach `04a-Chronik.md`.
// Diese Regel stand bisher nur in Prosa und griff nur beim Skill-Lauf; per Hand-Edit an `04`
// wurde sie umgangen (real bei ADR-124/125 am 2026-07-26; davor schon ADR-30/78/86/87/91).
// Zwang statt Erinnerung: dieser Prüfer schlägt bei jedem Lauf an, unabhängig davon, ob die
// jeweilige Sitzung den Skill gelesen hat.
//
// WAS GEPRÜFT WIRD (mechanisch, null Falsch-Positive):
//   In `04` darf keine Zeile einen NACHTRAG ANFÜHREN. Ein Nachtrag-Anführer ist eine
//   Überschrift, ein Listenpunkt oder ein Blockzitat, dessen fett gesetztes Leit-Label (nach
//   optional EINEM Qualifizierer wie „Weiterer"/„Zweiter") eines der reservierten Wörter ist:
//   Nachtrag · Nachträge · Bau-Stand · Bau-Status · Korrektur · Statuskorrektur · Zahl-Korrektur.
//   Genau diese Form haben die real durchgerutschten Stragglers getragen; sie ist unverkennbar
//   ein Zusatz zur Entscheidung, kein Teil von ihr. Die Liste ist bewusst EXPLIZIT, kein
//   `…korrektur`-Sammelmuster: ein solches meldete „**Selbstkorrektur vor der Arbeit:**" (ADR-67,
//   ein Analyse-Schritt IN der Entscheidung) falsch — der Grat zwischen Nachtrag und Substanz
//   liegt am Leitwort, nicht an einem Wortende.
//
// WAS BEWUSST NICHT MECHANISCH GEPRÜFT WIRD (Merkregel des Skills, aber Mensch-assistiert):
//   „Datum (2026-…)/Testzahl/Commit inline" wäre als Blanko-Regel wertlos — diese Signale
//   stehen pervasiv in LEGITIMER Entscheidungssubstanz: `Konsequenz:`-Punkte nennen Testzahlen
//   („1021/1021 Tests grün"), `Kontext:`/`Verworfen:` zitieren datierte Praxistests
//   („Praxistest (2026-07-05)"), und Planungs-ADRs führen ihre Analyse als `**Befund am echten
//   Code (2026-07-19):**` — allesamt Substanz, kein Nachtrag. Ein Datums-/Zahl-Gate würde
//   Dutzende solcher Zeilen fälschlich melden und wäre binnen einer Sitzung abgeschaltet (die
//   Lehre aus BL-47/48: ein flackerndes Gate schützt nichts). Diese Signale bleiben daher der
//   Mensch-assistierten Ebene überlassen (wie spec-lint Prüfung 8/9). Ebenso NICHT gemeldet:
//   ein „(Nachtrag 2026-…)"-Provenienz-Vermerk MITTEN in einem Entscheidungspunkt (z. B.
//   ADR-30s Item „**Person:** … **Nachtrag 2026-07-06:** … eigene Pills für OCCU/RESI") — dort
//   ist der Nachtrag nicht der Anführer, sondern gehört zur Entscheidung selbst.
//
// Aufruf:  node .claude/skills/spec-lint/check-adr-split.mjs
//          node .claude/skills/spec-lint/check-adr-split.mjs --selftest   (prüft den Prüfer)
// Exit 0 = `04` frei von Nachtrag-Anführern.
//
// Eigenheiten wie bei check-backlog.mjs bewusst erhalten: die Datei wird SELBST gelesen (nicht
// per `grep` — das lokale ugrep liest manche Dateien still leer), und Code-Fences (```)
// werden übersprungen, damit ein Beispiel-Snippet im Fließtext nicht anschlägt.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../../../..');
const LOG = path.join(ROOT, 'specs/v9/04-Entscheidungslog.md');

// Reservierte Nachtrag-Leitwörter — EXPLIZIT gelistet (kein `…korrektur`-Sammelmuster, s. Kopf).
// Längere vor kürzeren Varianten, damit die Alternation den ganzen Begriff greift.
const KW = '(?:Nachträge|Nachtrag|Bau-Stand|Bau-Status|Statuskorrektur|Zahl-Korrektur|Korrektur)';

// Zweite Wortliste, 2026-08-09 ergänzt: der VERIFIKATIONSBEFUND. Schritt 3a nennt ihn seit
// jeher gleichrangig neben Bau-Status und Testzahlen („Jeder Nachtrag — Bau-Status, Commit,
// Testzahlen, Verifikationsbefund, Lehre — gehört nach 04a"), erzwungen war davon aber nur
// die Nachtrag-Form. Folge, am Bestand gemessen: **20 solcher Bullets** standen in `04`,
// darunter fünf allein in ADR-207/208 („Rot-Proben", „Eingecheckte Fixture", „Verifikation").
// Sie sind der Grund, warum 04 sich in zwei Wochen von 537 auf 1.078 KB verdoppelt hat, ohne
// dass ein einziger Prüfer anschlug — dieselbe Lücke wie beim Backlog vor L14: die Regel stand
// da, der Zwang fehlte.
//
// BEWUSST NUR DAS LEIT-LABEL, und bewusst eng: gesucht ist das Bullet, das einen BERICHT
// anführt („- **Verifikation:** frischer Server, …"), nicht die Entscheidungsklausel, die
// ihre Messung nennt — die verlangt ADR-v9-237 ausdrücklich, und sie steht mitten im Satz.
// Deshalb kein `Verifiziert…`-Sammelmuster: „**Verifizierter Spec-Gap gegenüber dem
// v8-Oracle**" (ADR-36) ist Kontext-Substanz und wäre falsch gemeldet worden — geprüft, nicht
// vermutet. Aus demselben Grund fehlen „Befund"/„Messung"/„Bilanz": sie führen in 04 überwiegend
// Analyse an, die die Entscheidung TRÄGT.
const KW_VERIF =
  '(?:Verifikation|Verifikations-Befund|Rot-Probe|Rot-Proben|Negativ geprüft|Negativ verifiziert|' +
  'Browser-Beleg|Browser-Verifikation|Eingecheckte Fixture|Am laufenden System belegt|' +
  'Beim Bau dazugelernt|Beim Bau aufgefallen)';
// Anführer = Überschrift ODER Listenpunkt/Blockzitat mit fettem Leit-Label.
// Ein optionaler Qualifizierer (ein Wort) darf vor dem Leitwort stehen: „Weiterer Nachtrag".
const HEAD = new RegExp('^#{1,6}\\s+(?:[\\wäöüÄÖÜ]+\\s+)?' + KW + '\\b', 'i');
const BULLET = new RegExp('^\\s*(?:[-*]|\\d+\\.|>)\\s*\\*\\*\\s*(?:[\\wäöüÄÖÜ]+\\s+)?' + KW + '\\b', 'i');
// Verifikations-Bullets: OHNE den freien Qualifizierer davor — „Zweite Verifikation" wäre noch
// ein Bericht, „Die Verifikation, die die Entscheidung trägt" schon eine Klausel. Das Leitwort
// steht am Anfang des Labels oder gar nicht.
const BULLET_VERIF = new RegExp('^\\s*(?:[-*]|\\d+\\.|>)\\s*\\*\\*\\s*' + KW_VERIF + '\\b', 'i');

/** Findet alle Nachtrag-Anführer im gegebenen Text. Liefert [{line, text}]. */
export function findAddendumLeads(text) {
  const hits = [];
  let inFence = false;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^\s*```/.test(l)) { inFence = !inFence; continue; }
    if (inFence) continue;
    if (HEAD.test(l) || BULLET.test(l) || BULLET_VERIF.test(l)) hits.push({ line: i + 1, text: l.trim() });
  }
  return hits;
}

function pruefe() {
  const hits = findAddendumLeads(fs.readFileSync(LOG, 'utf8'));
  if (hits.length) {
    console.log(`FEHLER   ${hits.length} Nachtrag-Anführer inline in 04-Entscheidungslog.md — gehören nach 04a-Chronik.md:`);
    for (const h of hits) console.log(`  Z${h.line}: ${h.text.slice(0, 100)}`);
    console.log('  Verschiebe den Zusatz nach 04a (unter die `## ADR-v9-NN`-Überschrift dort) und');
    console.log('  ergänze in 04 eine `- **Chronik & Lehren:** → [04a-Chronik.md#adr-v9-NN]`-Zeile.');
    return 1;
  }
  console.log('04-Entscheidungslog.md — kein Nachtrag-Anführer inline (Split gewahrt).');
  return 0;
}

function selftest() {
  const faelle = [
    // [Beschreibung, Textzeile, soll-anschlagen]
    ['Listen-Nachtrag', '- **Nachtrag 2026-07-18 — die Regel …**', true],
    ['Weiterer Nachtrag', '       - **Weiterer Nachtrag 2026-07-06 (Nutzer-Fund):** …', true],
    ['Heading Nachtrag', '### Weiterer Nachtrag 2026-07-06 (Session-Fortsetzung)', true],
    ['Blockzitat Statuskorrektur', '> **Statuskorrektur 2026-07-18:** Diese Überschrift …', true],
    ['nummerierter Bau-Stand', '1. **Bau-Stand 2026-07-26:** …', true],
    ['Konsequenz mit Testzahl', '- **Konsequenz:** 1021/1021 Tests grün (16 neu) …', false],
    ['Kontext mit Datum', '- **Kontext:** Praxistest (2026-07-05): aus Nutzersicht …', false],
    ['Befund als Analyse', '- **Befund am echten Code (2026-07-19):** Der Navigationszustand …', false],
    ['Provenienz mitten im Satz', '  6. **(Nachtrag 2026-07-06) Personen-Detail zeigt …**', false],
    ['Person-Item mit inline-Nachtrag', '      - **Person:** … **Nachtrag 2026-07-06:** eigene Pills …', false],
    ['Selbstkorrektur ist Substanz', '- **Selbstkorrektur vor der Arbeit:** die ursprüngliche Gap-Analyse …', false],
    ['echte Korrektur schlägt an', '- **Korrektur:** die Zahl war falsch …', true],
    ['Refs', '- **Refs:** [20 §1.4](20-Funktionen.md), ADR-v9-30.', false],
    ['Chronik-Verweiszeile', '- **Chronik & Lehren:** → [04a-Chronik.md#adr-v9-30](04a-Chronik.md#adr-v9-30) (3 Nachtrag/Nachträge)', false],
    // Zweite Wortliste (Verifikationsbefund, 2026-08-09)
    ['Verifikations-Bullet', '- **Verifikation:** frischer Server, Realbestand, 44 Positionen …', true],
    ['Rot-Proben', '- **Rot-Proben, jede negativ geprüft:** Zusicherung entfernt → rot …', true],
    ['Eingecheckte Fixture', '- **Eingecheckte Fixture statt Realbestand-Zusicherung:** …', true],
    ['Am laufenden System belegt', '- **Am laufenden System belegt:** Filter setzen → zurück → sichtbar …', true],
    ['Browser-Beleg', '- **Browser-Beleg** (frischer Server): 44 Scroll-Positionen …', true],
    ['Beim Bau dazugelernt', '- **Beim Bau dazugelernt — `ADDR` wird ein Container:** …', true],
    ['Verifizierter Spec-Gap ist Substanz', '- **Verifizierter Spec-Gap gegenüber dem v8-Oracle:** `sourceRef` fehlte …', false],
    ['Messung IN einer Klausel', '- **Entscheidung 2b:** die Klassenhöhe ist die Schätzung — Verifikation am Realbestand ergab 34,1px …', false],
    ['Befund bleibt Substanz', '- **Befund, am laufenden System gemessen:** der Picker war die dritte Stelle …', false],
  ];
  let bad = 0;
  for (const [name, zeile, soll] of faelle) {
    const ist = findAddendumLeads(zeile).length > 0;
    if (ist !== soll) { console.log(`  SELBSTTEST-FEHLER: „${name}" erwartet ${soll}, ist ${ist} — ${zeile}`); bad++; }
  }
  // Code-Fence-Ausnahme: ein Nachtrag-Anführer INNERHALB ``` darf nicht anschlagen.
  const gefenced = '```\n- **Nachtrag 2026-01-01:** Beispiel im Codeblock\n```';
  if (findAddendumLeads(gefenced).length !== 0) { console.log('  SELBSTTEST-FEHLER: Code-Fence nicht übersprungen'); bad++; }
  if (bad) { console.log(`SELBSTTEST FEHLER (${bad}).`); return 1; }
  console.log(`Selbsttest OK (${faelle.length} Fälle + Code-Fence).`);
  return 0;
}

if (process.argv.includes('--selftest')) {
  process.exit(selftest());
} else {
  // Der Selbsttest läuft bei JEDEM Lauf mit (Lehre BL-04): ein stiller Prüfer-Zerfall ist
  // schlimmer als keiner. Nur im Fehlerfall sichtbar.
  const st = selftest();
  if (st !== 0) process.exit(st);
  process.exit(pruefe());
}
