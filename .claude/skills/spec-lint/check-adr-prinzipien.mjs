#!/usr/bin/env node
// check-adr-prinzipien.mjs — erzwingt das Pflichtfeld „Berührte Prinzipien" strukturell (BL-308).
//
// Der `decision-log`-Skill (Schritt 4a) verlangt: ändert ein ADR eine `INV-…` oder schafft er
// einen Mechanismus ab, beantwortet er ZWEI Fragen wörtlich, BEVOR die Entscheidung steht —
// welches USP-Versprechen daran hängt, und welcher LP der Entscheidung ENTGEGENSTEHT. Nicht die
// Bestätigung ist gesucht (die ist schnell gefunden), sondern die Gegenkraft. Der Grundsatz kam
// am 2026-08-02 aus [ADR-v9-198] in den Skill; die 15 ADRs danach (199–213) trugen das Feld
// zunächst alle nicht — vier davon (210–213) per Hand direkt an die Datei geschrieben, ohne den
// Skill je aufzurufen. Genau dieser Umgehungsweg ist bei Schritt 3a schon einmal aufgefallen und
// dort mit `check-adr-split.mjs` geschlossen worden; dies ist das Gegenstück für 4a.
//
// WARUM EIN EIGENER PRÜFER UND NICHT EIN ZWEITER TEIL VON check-adr-split.mjs: dort steht EINE
// Regel („kein Nachtrag-Anführer in 04"), von ihrem Kopfkommentar bis zum Selbsttest an einem
// Faden. Diese hier hat eine andere Frage, ein anderes Wortfeld und eine eigene Ratsche; sie
// hineinzuflechten hätte den Namen der Datei falsch gemacht und ihren Kopf widersprüchlich.
//
// ─── DER AUSLÖSER, UND WARUM ER SO ENG IST ────────────────────────────────────────────────────
// Der Skill-Wortlaut („ändert eine INV-… oder schafft einen Mechanismus ab") ist zur Hälfte ein
// URTEIL: ob eine Entscheidung einen Mechanismus abschafft, kann kein Skript entscheiden. Was ein
// Skript entscheiden kann, ist, ob der ADR es SELBST ERKLÄRT. Beide Hälften sind deshalb als
// Selbst-Erklärung gefasst und an den 212 Alt-ADRs ausgezählt (2026-08-03):
//
//   (A) TITEL NENNT EINE `INV-…`  →  11 Treffer.
//       Der ADR erklärt sich zur Invarianten-Sache. Nachgesehen: alle elf setzen oder verschieben
//       tatsächlich eine Invariante (ADR-10 baut das INV-ARCH-1-Gate, 26/51/53/58/64/66/87/108
//       führen je eine INV-UI-Regel ein, 47 präzisiert die INV-PLACE-Garantie, 40 dehnt INV-UI-4
//       auf den Picker aus). Kein Zufallstreffer darunter.
//
//   (B) ABSCHAFFUNGS-WORT IM `**Entscheidung`- ODER `**Konsequenz`-BULLET  →  1 Treffer (ADR-213).
//       Die POSITION trägt die Regel, nicht das Wort: im Entscheidungs-/Konsequenz-Bullet ist die
//       Abschaffung die eigene Handlung des ADR, überall sonst ist sie Erzählung über eine fremde.
//
// WAS GEMESSEN UND VERWORFEN WURDE — die Zahlen sind der Grund für die Enge, nicht die Vorsicht:
//   · „nennt der ADR ein Prinzip?" — die BESTÄTIGUNGS-Form, die der Grundsatz gerade verwirft. Sie
//     hätte ADR-v9-197 durchgewinkt: er zitiert `LP-1` in seiner Refs-Zeile; falsch war das
//     GENANNTE Prinzip, nicht das Fehlen eines. Ein Gate darauf wäre exakt der Fehler, gegen den
//     das Feld erfunden wurde.
//   · „nennt `INV-` überhaupt" — 138 von 212 ADRs. Rauschen.
//   · „`INV-` im Entscheidungs-/Konsequenz-Bullet" — immer noch 72 von 212. Rauschen.
//   · Abschaffungs-Wort IRGENDWO im ADR — 6 Treffer, davon 3 (ADR-164/190/195) reine Erzählung:
//     164 nennt im `Verworfen`-Bullet „die Drift, die abzuschaffen der ganze Punkt ist", 190 die
//     Topbar, die Spec 21 abgeschafft HAT, 195 den Walk, den ADR-v9-72 abgeschafft HATTE. Eine
//     Ratsche aus solchen Zeilen benennt keine Rückstände, sondern Falschmeldungen — und ein Gate,
//     dessen Liste niemand abarbeiten KANN, wird abgeschaltet (Lehre BL-47/48).
//
// WAS DER PRÜFER AUSDRÜCKLICH NICHT LEISTET: Vollständigkeit. Von den sechs ADRs, die das Feld
// heute tragen, löst er genau EINEN aus (213 über (B)); 207/208/210/211/212 erkennt er nicht.
// Das ist gewollt und die einzige ehrliche Bauform: er ist ein BODEN unter der menschlichen
// Prüfung, kein Ersatz für sie. „Schafft einen Mechanismus ab" bleibt ein Urteil; wer
// es fällt, ohne es hinzuschreiben, wird hier nicht erwischt — und ein Gate, das so täte, als
// könne es das, wäre das grüne Scheingate, das BL-308 ausdrücklich ablehnt.
//
// Aufruf:  node .claude/skills/spec-lint/check-adr-prinzipien.mjs
//          node .claude/skills/spec-lint/check-adr-prinzipien.mjs --selftest   (prüft den Prüfer)
// Exit 0 = kein NEUER Fall über der Ratsche.
//
// Eigenheiten wie bei check-adr-split.mjs bewusst erhalten: die Datei wird SELBST gelesen (nicht
// per `grep` — das lokale ugrep liest manche Dateien still leer), und Code-Fences (```) werden
// übersprungen, damit ein Beispiel-Snippet im Fließtext nicht anschlägt.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../../../..');
const LOG = path.join(ROOT, 'specs/v9/04-Entscheidungslog.md');

/**
 * Altfälle, die den Auslöser erfüllen und das Feld nicht tragen — Ist-Stand 2026-08-03.
 * Aufbau wie die L3/L11/L12-Ratschen in `check-backlog.mjs`: ein bekannter Rückstand wird
 * benannt und eingeplant, ein NEUER ist ein Fehler. Ohne diese Zahl wäre der Lauf ab dem ersten
 * Tag rot und damit wertlos.
 *
 * Es sind genau die elf ADRs aus Auslöser (A); alle stammen aus der Zeit VOR dem 2026-08-02, an
 * dem das Feld überhaupt erst eingeführt wurde. Sie werden hier NICHT rückwirkend nachgetragen:
 * eine Gegenkraft, die niemand beim Entscheiden gesucht hat, im Nachhinein danebenzuschreiben,
 * wäre erfundene Evidenz — derselbe Grund, aus dem ADR-v9-200 als Grenzfall offen blieb.
 * Der Eintrag verschwindet, wenn das Feld beim nächsten inhaltlichen Anfassen des jeweiligen ADR
 * echt beantwortet wird. NUR SCHRUMPFEN, NIE ANHEBEN.
 */
const RATSCHE = 11;

/** Wortfeld „dieser ADR schafft ab". Wirkt nur an der Position aus (B) — s. Kopf. */
const ABSCHAFFUNG = /\babgeschafft\b|\bab(?:zu)?schaffen\b|\bAbschaffung\b|\bschafft\b[^\n]{0,60}?\bab\b/i;

/** Bullet, dessen fettes Leit-Label die Entscheidung selbst trägt (`- **Entscheidung 2: …`). */
const ENTSCHEIDUNGS_BULLET = /^\s*[-*]\s+\*\*(?:Entscheidung|Konsequenz)/;

/** Ein benanntes Invarianten-Kürzel: `INV-PT`, `INV-UI-11`, `INV-ARCH-1`, `INV-PLACE`. */
const INV_TOKEN = /\bINV-[A-Z][A-Z0-9-]*\b/;

/** Das Pflichtfeld selbst. */
const FELD = /^\s*[-*]\s*\*\*Berührte Prinzipien:/;

/**
 * Findet alle ADRs, bei denen der Auslöser greift und das Pflichtfeld fehlt.
 * @param {string} text Inhalt von `04-Entscheidungslog.md`
 * @returns {{nr: string, zeile: number, titel: string, ausloeser: string}[]}
 */
export function findePflichtluecken(text) {
  const luecken = [];
  const lines = text.split('\n');
  let inFence = false;
  /** @type {null | {nr: string, zeile: number, titel: string, feld: boolean, ausloeser: string[]}} */
  let cur = null;

  const abschliessen = () => {
    if (cur && cur.ausloeser.length && !cur.feld) {
      luecken.push({
        nr: cur.nr,
        zeile: cur.zeile,
        titel: cur.titel,
        ausloeser: cur.ausloeser.join(' + '),
      });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^\s*```/.test(l)) { inFence = !inFence; continue; }
    if (inFence) continue;

    const kopf = /^##\s+ADR-v9-(\d+)\s*(.*)$/.exec(l);
    if (kopf) {
      abschliessen();
      const titel = kopf[2].replace(/^[—–-]\s*/, '').trim();
      cur = {
        nr: kopf[1],
        zeile: i + 1,
        titel,
        feld: false,
        ausloeser: INV_TOKEN.test(titel) ? ['Titel nennt eine INV-…'] : [],
      };
      continue;
    }
    if (!cur) continue;

    if (FELD.test(l)) { cur.feld = true; continue; }
    if (ENTSCHEIDUNGS_BULLET.test(l) && ABSCHAFFUNG.test(l)) {
      const a = 'Abschaffung im Entscheidungs-/Konsequenz-Bullet';
      if (!cur.ausloeser.includes(a)) cur.ausloeser.push(a);
    }
  }
  abschliessen();
  return luecken;
}

function pruefe() {
  const luecken = findePflichtluecken(fs.readFileSync(LOG, 'utf8'));
  const zeilen = luecken.map(
    (h) => `ADR-v9-${h.nr} (Z${h.zeile}) [${h.ausloeser}] — ${h.titel.slice(0, 80)}`,
  );
  if (luecken.length > RATSCHE) {
    console.log(
      `FEHLER   ${luecken.length} ADRs lösen Schritt 4a aus und tragen „Berührte Prinzipien" nicht ` +
        `(Ratsche ${RATSCHE}):`,
    );
    for (const z of zeilen) console.log(`  ${z}`);
    console.log('  Zwei Fragen wörtlich beantworten, BEVOR die Entscheidung steht (decision-log 4a):');
    console.log('  1. Welches USP-Versprechen hängt an diesem Mechanismus?');
    console.log('  2. Welcher LP steht der Entscheidung ENTGEGEN? Nicht der stützende — die Gegenkraft.');
    return 1;
  }
  if (luecken.length) {
    console.log(
      `04-Entscheidungslog.md — ${luecken.length} Altfälle ohne „Berührte Prinzipien" ` +
        `(Ratsche ${RATSCHE}, BL-308 Abarbeitungsliste, alle von vor der Einführung des Felds):`,
    );
    for (const z of zeilen) console.log(`  ${z}`);
    return 0;
  }
  console.log('04-Entscheidungslog.md — jeder auslösende ADR trägt „Berührte Prinzipien".');
  return 0;
}

function selftest() {
  const kopf = (n, t) => `## ADR-v9-${n} — ${t} ✅ · 2026-08-03`;
  const FELDZEILE = '- **Berührte Prinzipien:** **LP-1 (Gegenkraft)** — …';
  const faelle = [
    // [Beschreibung, ADR-Text, erwartete Zahl der Lücken]
    [
      'Titel nennt INV, Feld fehlt → Lücke',
      [kopf(900, 'INV-UI-9: Datums-Anzeigetiefe folgt dem Kontext'), '- **Entscheidung:** …'].join('\n'),
      1,
    ],
    [
      'Titel nennt INV, Feld da → keine Lücke',
      [kopf(901, 'INV-UI-9: Datums-Anzeigetiefe'), FELDZEILE, '- **Entscheidung:** …'].join('\n'),
      0,
    ],
    [
      'Abschaffung im Entscheidungs-Bullet, Feld fehlt → Lücke (die ADR-213-Abnahme)',
      [
        kopf(902, 'Zwei Tags für eine Aussage: `_DONE` wird gelesen, aber nicht mehr geschrieben'),
        '- **Entscheidung: `_TSTAT` trägt die Aussage allein.** **Abgeschafft heißt gelesen, aber nicht geschrieben** — …',
      ].join('\n'),
      1,
    ],
    [
      'dieselbe Fassung MIT Feld → grün (der Zustand nach dem Nachtrag)',
      [
        kopf(903, 'Zwei Tags für eine Aussage: `_DONE` wird gelesen, aber nicht mehr geschrieben'),
        FELDZEILE,
        '- **Entscheidung: `_TSTAT` trägt die Aussage allein.** **Abgeschafft heißt …** — …',
      ].join('\n'),
      0,
    ],
    [
      'Abschaffung im Konsequenz-Bullet zählt auch',
      [kopf(904, 'Ein Titel ohne Kürzel'), '- **Konsequenz:** der Mechanismus wird abgeschafft.'].join('\n'),
      1,
    ],
    [
      'Erzählung über eine FREMDE Abschaffung (Kontext) → keine Lücke (ADR-190/195)',
      [
        kopf(905, 'Ein Rundgang, der die Navigation abschreibt'),
        '- **Kontext:** die Topbar, die Spec 21 am 2026-07-07 bewusst abgeschafft hat.',
        '- **Entscheidung:** der Rundgang entfällt.',
      ].join('\n'),
      0,
    ],
    [
      'Erzählung im Verworfen-Bullet → keine Lücke (ADR-164)',
      [
        kopf(906, 'Zwei Statusdateien, ein Entscheidungslog'),
        '- **Verworfen:** (d) zwei Handbücher — die Drift, die abzuschaffen der ganze Punkt ist.',
      ].join('\n'),
      0,
    ],
    [
      'ADR ohne Auslöser → keine Lücke',
      [kopf(907, 'Der Picker braucht drei Auswege'), '- **Entscheidung:** drei Auswege.'].join('\n'),
      0,
    ],
    [
      'INV-Nennung im Fließtext ohne Titel/Abschaffung → keine Lücke (das verworfene Rausch-Gate)',
      [kopf(908, 'Ein Titel ohne Kürzel'), '- **Entscheidung:** wahrt INV-PT und INV-UI-4.'].join('\n'),
      0,
    ],
    [
      'zwei ADRs hintereinander werden getrennt bewertet',
      [
        kopf(909, 'INV-UI-6: Disambiguierung'),
        '- **Entscheidung:** …',
        kopf(910, 'INV-UI-7: Ereigniszeile'),
        FELDZEILE,
      ].join('\n'),
      1,
    ],
  ];
  let bad = 0;
  for (const [name, text, soll] of faelle) {
    const ist = findePflichtluecken(text).length;
    if (ist !== soll) { console.log(`  SELBSTTEST-FEHLER: „${name}" erwartet ${soll}, ist ${ist}`); bad++; }
  }
  // Code-Fence-Ausnahme: ein auslösender ADR-Kopf INNERHALB ``` darf nicht anschlagen.
  const gefenced = '```\n## ADR-v9-999 — INV-UI-1: Beispiel im Codeblock ✅\n```';
  if (findePflichtluecken(gefenced).length !== 0) { console.log('  SELBSTTEST-FEHLER: Code-Fence nicht übersprungen'); bad++; }
  if (bad) { console.log(`SELBSTTEST FEHLER (${bad}).`); return 1; }
  console.log(`Selbsttest OK (${faelle.length} Fälle + Code-Fence).`);
  return 0;
}

// Nur als Programm laufen, nicht beim Import: `findePflichtluecken` wird exportiert, damit man
// den Auslöser gegen eine hypothetische Fassung messen kann (die Abnahme von BL-308 tut genau
// das). Ohne diese Weiche beendet ein `import` den Aufrufer.
const alsProgramm = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (!alsProgramm) {
  // nichts tun — nur die Exporte bereitstellen.
} else if (process.argv.includes('--selftest')) {
  process.exit(selftest());
} else {
  // Der Selbsttest läuft bei JEDEM Lauf mit (Lehre BL-04): ein stiller Prüfer-Zerfall ist
  // schlimmer als keiner. Nur im Fehlerfall sichtbar.
  const st = selftest();
  if (st !== 0) process.exit(st);
  process.exit(pruefe());
}
