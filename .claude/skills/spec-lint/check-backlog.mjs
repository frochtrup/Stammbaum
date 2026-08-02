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

/** Code-Wurzeln des Standalone-Orte-Editors. Alles darunter gehoert in dessen eigene
 *  Statusdatei, alles daneben ins Hauptbacklog — die Grenze wird nicht beurteilt,
 *  sondern gerechnet (L8). */
const ORTE_WURZELN = ['app-orte/', 'tests/orte/'];

/** Die Statusdateien des Projekts — je Programm eine. `gehoert(pfad)` entscheidet
 *  anhand des Beleg-Pfads, ob eine Zeile in diese Datei gehoert; genau diese Funktion
 *  macht die Aufteilung ueberpruefbar statt vereinbart. Eine zweite Statusdatei OHNE
 *  Lint-Abdeckung waere ein Backlog ohne Beleg-Pruefung — also das, was dieses Skript
 *  ueberhaupt verhindern soll. */
const BACKLOGS = [
  {
    datei: 'specs/v9/05-Backlog.md',
    praefix: 'BL',
    bereich: 'Hauptprogramm',
    gehoert: (p) => !ORTE_WURZELN.some((w) => p.startsWith(w)),
  },
  {
    datei: 'specs/v9/05a-Backlog-Orte-Editor.md',
    praefix: 'OE',
    bereich: `Orte-Editor (${ORTE_WURZELN.join(', ')})`,
    gehoert: (p) => ORTE_WURZELN.some((w) => p.startsWith(w)),
  },
];

/** L3-Ratsche: Ist-Stand der Status-Wörter in den Specs 10–32 am 2026-07-18.
 *  Seit BL-50 (2026-07-18) auf 0 — die 33 Altlast-Stellen sind entfernt. NIE WIEDER
 *  ANHEBEN: ein Status-Wort in den Specs 10–32 ist ab jetzt ein harter Fehler, kein
 *  geduldeter Rest. Wer Status ausdruecken will, legt eine Backlog-Zeile an. */
const L3_RATSCHE = 0;

/** L7-Ratsche: [S]/[E]-Bullets in Spec 20, Stand der abgeschlossenen Inventur (BL-51,
 *  2026-07-21). Wer ein Bullet ergänzt, legt zuerst die Backlog-Zeile an und zieht dann
 *  diese Zahl nach — nicht umgekehrt.
 *  30 → 31 (2026-07-30): §1.9 hat das Orts-Explorationspanel als eigenen [S]-Bullet
 *  bekommen; die Backlog-Zeile BL-210 gab es vorher.
 *  31 → 33 (2026-07-30): §1.4 Ereignis-Eingabekomfort (BL-212, ADR-v9-156) und §1.13
 *  bezifferte Statistik-Balken (BL-219, ADR-v9-157) sind jetzt eigene [E]-Bullets —
 *  vorher nur Backlog-Text ohne Spec-Vorgabe bzw. Teil von BL-208.
 *  33 → 34 (2026-07-30): §1.9 hat die historische Kartenebene als eigenen [S]-Bullet
 *  bekommen (BL-230, ADR-v9-166); zuvor stand sie nur als Zukunfts-Kandidat in 01 §4.
 *  34 → 39 (2026-08-01): die Medien-Auflösung (ADR-v9-187/-188) hat §1.4 um zwei Bullets
 *  ergänzt (Klassifikation, Bilder außerhalb der Galerie) und den neuen §1.14
 *  Einstellungen bringt drei mit; die Backlog-Zeilen BL-256…BL-261 gab es vorher.
 *  39 → 40 (2026-08-01): der Erstnutzer-Rundgang steht jetzt als eigener [E]-Bullet in
 *  §1.1 (BL-213, ADR-v9-190) — vorher trug ihn nur die Backlog-Zeile. */
const SE_BULLETS = 40;
const L3_WOERTER =
  /(nicht gebaut|✅ gebaut|noch offen|noch nicht gebaut|bleibt offen|weiterhin offen|offene Folgearbeit|nicht umgesetzt)/gi;

/** L11-Ratsche: Zähl-Aussagen über den Realbestand OHNE Dateinamen, Ist-Stand 2026-08-01.
 *  Diese 14 Zeilen sind die Abarbeitungsliste (der Prüflauf nennt sie namentlich) — sie
 *  bekommen ihren Dateinamen, sobald die jeweilige Zahl ohnehin einmal nachgemessen wird.
 *  Rückwirkend einen Namen danebenzuschreiben, ohne die Zahl zu prüfen, wäre erfundene
 *  Evidenz und genau der Fehler aus [ADR-v9-178](specs/v9/04-Entscheidungslog.md) — dort
 *  STAND ein Dateiname, nur der falsche. NIE ANHEBEN. */
const L11_RATSCHE = 14;

/** Wortfeld „Aussage über den echten Datenbestand". Bewusst diese sechs Formen und nicht
 *  das nackte Wort „Bestand": das trägt in 04/05 überwiegend andere Bedeutungen
 *  („bleibt im Bestand", „im Bestand des Nutzers"). */
const L11_MARKER = /Realbestand|Referenzbestand|Bestandsdatei|im Bestand|am echten Bestand|des Bestands/;

/** Was als begleitender Dateiname zählt: die Formate, in denen ein Bestand vorliegt. */
const L11_DATEI = /[\w.\-]+\.(?:ged|gramps|json)\b/;

/** Referenz-Nummern und ISO-Daten, die im Fenster sonst als „Zahl" durchgingen —
 *  `(TST-9). Am Realbestand …` ist keine Zählung, `ADR-v9-159 … am Realbestand
 *  verifiziert` auch nicht. Ohne diesen Filter meldete die Regel 20 statt 14 Zeilen,
 *  sechs davon rein qualitativ. Ordnungszahlen gehören dazu („bei der 2. Neuberechnung"
 *  zählt nichts) — der Punkt muss dafür von einem Leerzeichen gefolgt sein, damit
 *  deutsche Tausenderpunkte („1.968 Werte") eine Zählung bleiben. */
const L11_RAUSCHEN = /\b(?:ADR-v9|BL|OE|LP|INV|TST|RT|SC)[-\s]?\d+|\d{4}-\d{2}-\d{2}|§\s?\d+|\b\d+\.(?=\s)/g;

/** Eine ZÄHLUNG: „7×", „0 von 226", „888 `2 ADDR`", „85 Personen-Medien". */
/** L12-Ratsche: ADR-Absätze, die einen unerledigten Rest ANKÜNDIGEN, ohne ihn zu
 *  terminieren — Ist-Stand 2026-08-02 (ADR-v9-196).
 *
 *  WARUM ES DIESE REGEL GIBT. ADR-v9-74 beschrieb den hängenden `event.placeId` nach
 *  einem Orts-Merge exakt — als „Offener Folgepunkt (beim Bau entdeckt, nicht Teil
 *  dieses Fixes)". Es wurde keine Backlog-Zeile daraus. Sieben Wochen später meldete der
 *  Nutzer genau diesen Defekt (ADR-v9-195). Eine Ankündigung ohne Zeile ist schlechter
 *  als gar keine Notiz: sie erzeugt den Eindruck, der Punkt sei erfasst, und taucht in
 *  keiner Priorisierung auf. Das Backlog prüft seit jeher, dass OFFENE ZEILEN eingeplant
 *  sind (L10) — nicht, dass ANKÜNDIGUNGEN Zeilen haben. Genau diese Lücke schließt L12.
 *
 *  Die verbleibenden Fälle sind die Abarbeitungsliste (der Prüflauf nennt sie
 *  namentlich). Sie bekommen ihre Zeile, sobald inhaltlich entschieden ist, OB der Punkt
 *  gebaut wird — rückwirkend eine BL-Nummer danebenzuschreiben, ohne dass die Zeile
 *  existiert, wäre dieselbe Scheinerledigung, gegen die die Regel sich richtet.
 *  NIE ANHEBEN. */
const L12_RATSCHE = 5;

/** Formulierungen, die einen Rest ankündigen. Bewusst eng: „später"/„vorerst"/„noch
 *  nicht" tragen in 04/04a überwiegend erklärende Prosa („später zeigte sich") — sie
 *  hätten die Regel in Rauschen ertränkt, und eine Warnung, die niemand liest, ist keine
 *  (dieselbe Kalibrierung wie L11). */
const L12_MARKER =
  /Offener Folgepunkt|Offen geblieben|nicht Teil dieses (?:Fixes|ADR)|nicht\*{0,2} entschieden|bleibt offen(?:e Folgearbeit)?|offene (?:Spec-)?Frage|nicht weiter verfolgt|noch zu klären|wäre zu prüfen/;

/** Ein ZITAT ist keine Ankündigung: ein späteres ADR, das den Satz eines früheren
 *  wiedergibt („ADR-v9-74 hatte sie als „Offener Folgepunkt" notiert"), kündigt nichts
 *  an — es berichtet. Ohne diesen Ausschluss meldete die Regel die AUFARBEITUNG des
 *  Problems als neues Problem, und zwar dauerhaft: der Bericht über einen geschlossenen
 *  Fall bleibt ja stehen. Erkannt am öffnenden Anführungszeichen unmittelbar vor dem
 *  Marker (Auszeichnungs-Sternchen dazwischen erlaubt). */
const L12_ZITAT = /[„“‚'"]\**$/;

const L11_ZAHL = /\d+\s?×|\d+ von \d+|\d[\d.,]*\s+[A-Za-zÄÖÜäöü`]/;

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
/**
 * Liest eine Beleg-Datei. Ohne Präfix wird erst im Code-, dann im Spec-Repo gesucht —
 * bequem, solange ein Pfad nur in EINEM der beiden existiert.
 *
 * `code:`/`spec:` erzwingen das Repo. Nötig geworden bei BL-296: der Beleg
 * `txt:Testdateien/@.gitignore` meinte die `.gitignore` des SPEC-Repos, las aber die des
 * Code-Repos — die gibt es auch, sie kam zuerst, und der Beleg meldete stumm „trifft
 * nicht". Ein gleichnamiger Pfad in beiden Repos ist derselbe Fehlschluss wie die
 * verwechselten Realdaten-Dateien (TST-21): das Werkzeug antwortet zuverlässig auf eine
 * andere Frage als die gestellte.
 */
function readAny(p) {
  const roots = p.startsWith('spec:') ? [SPEC] : p.startsWith('code:') ? [CODE] : [CODE, SPEC];
  const rein = p.replace(/^(spec|code):/, '');
  for (const root of roots) {
    const f = path.join(root, rein);
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

/** Alle Code-Dateien MIT ihrem Pfad — der Pfad wird fuer L8 gebraucht (welcher
 *  Statusdatei gehoert der Beleg?), nicht nur der Inhalt. `app-orte` ist mit drin:
 *  ein Symbol, das nur der Editor exportiert, muss auffindbar sein, sonst meldete
 *  L2 dessen Zeilen fuer immer als „umbenannt/geloescht". */
let codeDateien = null;
const getCodeDateien = () =>
  (codeDateien ??= ['core', 'services', 'ui', 'app', 'app-orte']
    .flatMap((d) => walk(path.join(CODE, d)))
    .map((f) => ({ rel: path.relative(CODE, f), src: stripComments(fs.readFileSync(f, 'utf8')) })));

/** Regex, die einen Export dieses Namens findet — eine Quelle fuer evalBeleg und belegPfade. */
const exportRe = (name) =>
  new RegExp(`export\\s+(async\\s+)?(function|const|class|interface|type)\\s+${name}\\b`);

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
      treffer = getCodeDateien().some((d) => exportRe(wert).test(d.src));
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

/**
 * Die Code-Pfade (relativ zum Code-Repo), auf die ein Beleg zeigt — Grundlage von L8.
 * Leer, wenn der Beleg nicht code-gebunden ist (`spec:`/`txt:` treffen Spec-Dateien) oder
 * ins Leere zeigt: ein `!sym:`-Beleg ist genau dann erfuellt, wenn das Symbol NICHT
 * existiert, hat also naturgemaess keinen Pfad. L8 ueberspringt solche Zeilen, statt sie
 * zu verurteilen — sonst waere jede negierte Zeile automatisch falsch einsortiert.
 */
export function belegPfade(beleg) {
  const b = beleg.startsWith('!') ? beleg.slice(1) : beleg;
  const i = b.indexOf(':');
  if (i < 0) return [];
  const art = b.slice(0, i);
  const wert = b.slice(i + 1);
  if (art === 'datei' || art === 'test') return [wert];
  if (art === 'sym') return getCodeDateien().filter((d) => exportRe(wert).test(d.src)).map((d) => d.rel);
  return [];
}

/** Zerlegt die Backlog-Tabellen in Zeilen — inklusive des Abschnitts (`## …`), unter dem
 *  die Zeile steht. Der Abschnitt ist das, was ein Mensch beim Überfliegen tatsächlich
 *  liest; die Status-Spalte ist die achte und liegt beim Lesen oft außerhalb des
 *  Sichtfelds (s. L5). `praefix` waehlt den ID-Raum der Statusdatei (BL/OE). */
export function parseBacklog(text, praefix = 'BL') {
  const zeilen = [];
  const zeilenRe = new RegExp(`^\\| ${praefix}-\\d+ \\|`);
  let abschnitt = '';
  for (const l of text.split('\n')) {
    const h = /^## (.+)$/.exec(l);
    if (h) {
      abschnitt = h[1].trim();
      continue;
    }
    if (!zeilenRe.test(l)) continue;
    const c = l.split('|').map((s) => s.trim()).filter(Boolean);
    zeilen.push({ id: c[0], prio: c[1], typ: c[2], klasse: c[3], punkt: c[4], spec: c[5], beleg: c[6].replace(/`/g, ''), status: c[7], abschnitt });
  }
  return zeilen;
}

/** L9: Zeilennummern (1-basiert) von Tabellen, deren Kopfzeile KEINE Trennzeile folgt.
 *
 *  WARUM DIESE REGEL EXISTIERT (Nutzer-Fund 2026-07-31): am 2026-07-28 wurden zwei frisch
 *  erledigte Zeilen zwischen die Kopfzeile und die Trennzeile von „Erledigte Punkte"
 *  eingefügt statt darunter. Ohne Trennzeile an zweiter Stelle ist es in GFM gar keine
 *  Tabelle mehr — der ganze Abschnitt rendert auf GitHub als Absatz voller Striche. Der
 *  Prüfer meldete trotzdem zwölf Commits lang „konsistent", weil er Zeilen per Regex
 *  liest und die Struktur nie ansah; jeder weitere Erledigt-Commit schob die Trennzeile
 *  eine Zeile tiefer, am Ende 23 Zeilen. Aufgefallen ist es beim Lesen, nicht beim Prüfen
 *  — dieselbe Lücke wie bei L5, eine Ebene tiefer: dort stand die Zeile im falschen
 *  Abschnitt, hier ist der Abschnitt selbst nicht mehr lesbar. */
export function tabellenBrueche(text) {
  const L = text.split('\n');
  const brueche = [];
  let fence = false;
  for (let i = 0; i < L.length; i++) {
    if (/^```/.test(L[i])) fence = !fence;
    if (fence || !/^\|/.test(L[i]) || (i > 0 && /^\|/.test(L[i - 1]))) continue;
    if (!/^\|[-| :]+\|$/.test(L[i + 1] || '')) brueche.push(i + 1);
  }
  return brueche;
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

/**
 * L11: Zeilen mit einer ZÄHL-Aussage über den echten Datenbestand, die keine Datei nennt.
 *
 * Der mechanisierbare Teil der Lehre aus ADR-v9-178: die Zahl selbst kann kein Lint
 * nachrechnen (sie steht in Prosa, die Datei ist gitignored) — prüfbar ist nur, ob neben
 * der Behauptung überhaupt ein Dateiname steht. Genau das fehlte zweimal: ADR-v9-151
 * maß gegen die falsche Datei (immerhin genannt), BL-217 trug „Am Realbestand:
 * DATA.EVEN 0×" ganz ohne.
 *
 * Ausgelöst wird nur bei **Marker + Zählung im selben Fenster**, nicht bei „N×" allein:
 * das nackte Muster traf 79 Zeilen, überwiegend Code-Aussagen („siebenmal dupliziert",
 * „3–4,5× langsamer") — eine Warnung, die niemand liest, ist keine.
 *
 * @returns {{zeile:number, text:string}[]}
 */
export function bestandsBehauptungen(text) {
  const treffer = [];
  text.split('\n').forEach((l, idx) => {
    const m = L11_MARKER.exec(l);
    if (!m || L11_DATEI.test(l)) return;
    const fenster = l.slice(Math.max(0, m.index - 70), m.index + m[0].length + 70).replace(L11_RAUSCHEN, ' ');
    if (L11_ZAHL.test(fenster)) treffer.push({ zeile: idx + 1, text: l.slice(Math.max(0, m.index - 55), m.index + 70) });
  });
  return treffer;
}

/**
 * L12: ADR-Absätze, die einen unerledigten Rest ankündigen, ohne eine BL-Zeile zu nennen.
 *
 * Geprüft wird der ABSATZ, nicht das ganze ADR: fast jedes ADR nennt irgendwo eine
 * BL-Nummer („Umsetzung als BL-xxx"), auf ADR-Ebene fände die Regel deshalb nichts. Der
 * Absatz ist zugleich die richtige Einheit für den Leser — wer die Ankündigung liest,
 * soll dort erfahren, wo sie weiterlebt, und nicht drei Absätze tiefer suchen.
 *
 * @returns {{zeile:number, adr:string, marker:string, text:string}[]}
 */
export function unterminierteAnkuendigungen(text) {
  const treffer = [];
  let pos = 0;
  for (const para of text.split(/\n(?=- \*\*)/)) {
    const start = text.indexOf(para, pos);
    pos = start + para.length;
    const m = L12_MARKER.exec(para);
    if (!m) continue;
    // Zitat? → berichtet, kündigt nicht an.
    if (L12_ZITAT.test(para.slice(0, m.index))) continue;
    if (/BL-\d+/.test(para)) continue;
    const davor = text.slice(0, start);
    const adr = [...davor.matchAll(/<a id="(adr-v9-\d+)"><\/a>/g)].pop();
    treffer.push({
      zeile: davor.split('\n').length,
      adr: adr ? adr[1] : '?',
      marker: m[0],
      text: para.replace(/\s+/g, ' ').trim().slice(0, 90),
    });
  }
  return treffer;
}

/** Die im Backlog dokumentierten Regeln — die Zeilen der Tabelle „Lint-Regeln". */
export function dokumentierteRegeln(backlogText) {
  return new Set([...backlogText.matchAll(/^\| (L\d+) \|/gm)].map((m) => m[1]));
}

// --- Prüfungen --------------------------------------------------------------

function pruefe() {
  const fehler = [];
  const warnungen = [];
  const zeilen = [];

  if (!fs.existsSync(CODE)) {
    console.log(`ÜBERSPRUNGEN: Code-Repo ${CODE} nicht erreichbar — L1/L2 nicht prüfbar.`);
    return { fehler, warnungen, zeilen: [] };
  }

  const ids = new Set();
  for (const bl of BACKLOGS) {
    const pfad = path.join(SPEC, bl.datei);
    if (!fs.existsSync(pfad)) {
      fehler.push(`Statusdatei fehlt: ${bl.datei} (${bl.bereich})`);
      continue;
    }
    const text = fs.readFileSync(pfad, 'utf8');
    const dateiZeilen = parseBacklog(text, bl.praefix);
    // Eine Statusdatei mit Tabelle, aus der KEINE Zeile erkannt wird, ist der
    // gefaehrlichste Zustand: der Prueflauf meldet „konsistent", ohne etwas geprueft zu
    // haben. Deshalb hart, nicht als Warnung.
    if (dateiZeilen.length === 0 && /^\| ID \| P \|/m.test(text))
      fehler.push(`${bl.datei}: Tabelle vorhanden, aber keine ${bl.praefix}-Zeilen erkannt — falscher ID-Präfix?`);

    for (const z of tabellenBrueche(text))
      fehler.push(
        `L9 ${bl.datei}:${z}: Tabellenkopf ohne Trennzeile |---|…| direkt darunter — ` +
          `rendert nicht als Tabelle (neue Zeile UNTER die Trennzeile, nicht darüber)`,
      );

    for (const z of dateiZeilen) {
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

      // L8: Liegt der Beleg im Zustaendigkeitsbereich DIESER Statusdatei?
      //
      // Die Aufteilung „je Programm eine Statusdatei" ist nur so viel wert, wie sie
      // eingehalten wird — und eine falsch einsortierte Zeile ist genau die Sorte Drift,
      // gegen die dieses Skript ueberhaupt existiert. Die Grenze ist mechanisch: der
      // Beleg-Pfad entscheidet, nicht die Themenzugehoerigkeit. Ein Vorhaben, das beide
      // Bereiche beruehrt, wird in zwei Zeilen zerlegt (Regel 2: kein „teilweise").
      const pfade = belegPfade(z.beleg);
      if (pfade.length > 0 && !pfade.some(bl.gehoert))
        fehler.push(
          `L8 ${z.id}: Beleg zeigt auf ${pfade.slice(0, 2).join(', ')}${pfade.length > 2 ? ' …' : ''} — ` +
            `das gehört nicht in ${bl.datei} (${bl.bereich})`,
        );
    }
    zeilen.push(...dateiZeilen);
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

  // L7-Ratsche: Zahl der [S]/[E]-Bullets in Spec 20.
  //
  // BL-51 hat die S/E-Inventur abgeschlossen — jeder der 30 Bullets trägt eine Zeile
  // (zwei begründete Ausnahmen, s. Kopf von 05-Backlog.md). Diese Aussage verrottet
  // still, sobald jemand ein neues [S]-Bullet ins Spec schreibt, ohne eine Zeile
  // anzulegen: nichts im Projekt bemerkt das.
  //
  // Warum eine ZAHL und keine inhaltliche Zuordnung: welcher Bullet zu welcher
  // Backlog-Zeile gehört, steht nirgends maschinenlesbar (die Zeilen verweisen auf
  // §-Abschnitte, nicht auf Bullets) — eine echte Deckungsprüfung wäre erfunden. Der
  // Zähler dagegen fängt exakt den realistischen Verfallsweg ab und zwingt die Frage
  // („gibt es dazu eine Zeile?") in dem Moment, in dem sie beantwortbar ist.
  //
  // Ändert sich die Zahl bewusst, wird SE_BULLETS mit derselben Handbewegung nachgezogen,
  // mit der die Backlog-Zeile entsteht. Das ist der Zwang, den BL-51 als reine
  // Dokumentations-Aussage nicht hatte.
  const spec20 = fs.readFileSync(path.join(SPEC, 'specs/v9/20-Funktionen.md'), 'utf8');
  const seIst = (spec20.match(/^- \*\*\[[SE]\]\*\*/gm) || []).length;
  if (seIst !== SE_BULLETS)
    fehler.push(
      `L7 Spec 20 hat ${seIst} [S]/[E]-Bullets, erwartet ${SE_BULLETS} — neue Bullets brauchen eine Backlog-Zeile (BL-51), danach SE_BULLETS nachziehen`,
    );

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
  // Die Regel-Tabelle steht EINMAL, im Hauptbacklog — sie beschreibt den Prüfer, nicht
  // ein Programm; eine zweite Fassung in der Editor-Statusdatei wäre genau die Dopplung,
  // gegen die L6 existiert.
  const implementiert = implementierteRegeln(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8'));
  const dokumentiert = dokumentierteRegeln(fs.readFileSync(path.join(SPEC, BACKLOGS[0].datei), 'utf8'));
  for (const r of [...implementiert].sort())
    if (!dokumentiert.has(r))
      fehler.push(`L6 Regel ${r} ist implementiert, fehlt aber in der Tabelle „Lint-Regeln" in 05-Backlog.md`);
  for (const r of [...dokumentiert].sort())
    if (!implementiert.has(r))
      fehler.push(`L6 Regel ${r} steht in der Tabelle „Lint-Regeln", ist aber nicht implementiert`);

  // L10: Deckt sich der Planungsteil der Priorisierung mit den offenen Zeilen?
  //
  // WARUM DIESE REGEL EXISTIERT (Nutzer-Fund 2026-07-31): Der Abschnitt „Priorisierung &
  // Clusterung" führt dieselben IDs ein zweites Mal — als Cluster-Tabelle und als Wellen.
  // Genau die Sorte zweiter Fassung, gegen die Regel 1 dieses Dokuments geschrieben ist.
  // BL-220…226 waren gebaut, ihre Zeilen korrekt unter „Erledigte Punkte" verschoben, und
  // L1/L2/L5 meldeten „konsistent" — die Wellen planten sie trotzdem weiter ein. Aufgefallen
  // ist es dem Nutzer beim Lesen, nicht dem Prüfer.
  //
  // Geprüft wird NUR der Planungsteil (Cluster-Tabellenzeilen + die nummerierte Wellen-Liste),
  // nicht der ganze Abschnitt: dessen Prosa nennt legitim auch erledigte IDs — die Herkunft
  // der Kleinlücken-Inventur erklärt sich über BL-206/BL-212, und ein Verbot dort würde nur
  // dazu führen, dass die Begründung verschwindet statt der Drift.
  const priBacklog = fs.readFileSync(path.join(SPEC, BACKLOGS[0].datei), 'utf8');
  const planung = planungsteil(priBacklog);
  if (planung === null) {
    warnungen.push('L10 Abschnitt „Priorisierung & Clusterung" nicht gefunden — Überschrift umbenannt?');
  } else {
    const status = new Map(zeilen.map((z) => [z.id, z.status]));
    const genannt = [...new Set(planung.match(/BL-\d+/g) || [])];
    for (const id of genannt) {
      if (status.get(id) === 'gebaut')
        fehler.push(`L10 ${id} ist gebaut, wird in der Priorisierung aber weiter als Arbeit eingeplant`);
      if (!status.has(id)) fehler.push(`L10 ${id} steht in der Priorisierung, hat aber keine Backlog-Zeile`);
    }
    for (const z of zeilen)
      if (z.id.startsWith('BL-') && z.status === 'offen' && !genannt.includes(z.id))
        fehler.push(`L10 ${z.id} ist offen, kommt in der Priorisierung aber nicht vor — ungeplant`);
  }

  // L11-Ratsche: Zähl-Aussagen über den Realbestand ohne Dateinamen.
  //
  // Aufbau wie L3 (Fehler oberhalb der Ratsche, sonst namentliche Warnung): die 14
  // Altfälle sollen sichtbar bleiben und abgearbeitet werden, aber keine NEUE Behauptung
  // darf dazukommen. Ein reiner Warnungs-Modus hätte 14 Zeilen erzeugt, die man nach dem
  // dritten Lauf überliest — die Ratsche ist die im Projekt eingeführte Antwort darauf
  // (L3/L7).
  const l11 = [];
  for (const datei of [...BACKLOGS.map((b) => b.datei), 'specs/v9/04-Entscheidungslog.md']) {
    const pfad = path.join(SPEC, datei);
    if (!fs.existsSync(pfad)) continue;
    for (const t of bestandsBehauptungen(fs.readFileSync(pfad, 'utf8')))
      l11.push(`${datei}:${t.zeile}: …${t.text.trim()}…`);
  }
  if (l11.length > L11_RATSCHE)
    fehler.push(
      `L11 ${l11.length} Zähl-Aussagen über den Realbestand ohne Dateinamen > Ratsche ${L11_RATSCHE} — ` +
        `wer eine Zahl aus dem Bestand nennt, nennt die Datei mit (ADR-v9-178):\n    ${l11.join('\n    ')}`,
    );
  else if (l11.length > 0)
    warnungen.push(
      `L11 ${l11.length} Zähl-Aussagen über den Realbestand ohne Dateinamen (Ratsche ${L11_RATSCHE}, BL-247 Abarbeitungsliste):\n    ` +
        l11.join('\n    '),
    );

  // L12-Ratsche: Ankündigungen ohne Backlog-Zeile (ADR-v9-196).
  //
  // Gleicher Aufbau wie L3/L7/L11 (Fehler oberhalb der Ratsche, sonst namentliche
  // Warnung). Die Regel ist die mechanische Hälfte der Lehre aus ADR-v9-74 → ADR-v9-195:
  // dass ein Punkt WICHTIG ist, kann kein Lint beurteilen — dass er eine Adresse hat,
  // schon.
  const l12 = [];
  for (const datei of ['specs/v9/04-Entscheidungslog.md', 'specs/v9/04a-Chronik.md']) {
    const pfad = path.join(SPEC, datei);
    if (!fs.existsSync(pfad)) continue;
    for (const t of unterminierteAnkuendigungen(fs.readFileSync(pfad, 'utf8')))
      l12.push(`${datei}:${t.zeile} [${t.adr}] „${t.marker}“ — ${t.text}…`);
  }
  if (l12.length > L12_RATSCHE)
    fehler.push(
      `L12 ${l12.length} Ankündigungen ohne Backlog-Zeile > Ratsche ${L12_RATSCHE} — wer einen Rest ` +
        `benennt, gibt ihm eine Zeile (ADR-v9-196; ADR-v9-74 war sieben Wochen lang notiert und trotzdem ` +
        `unerledigt):\n    ${l12.join('\n    ')}`,
    );
  else if (l12.length > 0)
    warnungen.push(
      `L12 ${l12.length} Ankündigungen ohne Backlog-Zeile (Ratsche ${L12_RATSCHE}, Abarbeitungsliste):\n    ` +
        l12.join('\n    '),
    );

  // L13: jede benannte Invariante hat eine Zeile in der Mutations-Tabelle (BL-287).
  //
  // WARUM. TST-2 verlangt zu jeder `INV-…`/`LP-…` einen Test. Die erste Messung nach
  // ADR-v9-196 zeigte, dass das zu wenig ist: LP-1 — die teuerste Zusicherung des ganzen
  // Projekts — wurde von GENAU EINEM der 3756 Testfälle verteidigt. „Es gibt einen Test"
  // und „ein Bruch fällt auf" sind zwei verschiedene Aussagen.
  //
  // Diese Regel prüft nicht die ZAHL (das tut `npm run test:mutation` im Code-Repo),
  // sondern die VOLLSTÄNDIGKEIT der Liste: eine neue Invariante im Spec muss dort eine
  // Zeile bekommen — als Mutation, als Verweis auf ein anderes Gate oder ausdrücklich als
  // offen. Ohne diesen Zwang wächst das Spec-Set weiter und die Messung bleibt stehen, wo
  // sie einmal angelegt wurde (dieselbe Denkfigur wie ADR-v9-83: Zwang schlägt Erinnerung).
  const mutTabelle = path.join(CODE, 'tools/mutation/mutationen.mjs');
  if (fs.existsSync(mutTabelle)) {
    const tabelle = fs.readFileSync(mutTabelle, 'utf8');
    // Nur die Kürzel, die in den Specs auch DEFINIERT sind — ein Verweis allein macht noch
    // keine Invariante. Definiert = kommt in einer der Spec-Dateien 10–32 oder 01/02 vor.
    const roh = new Set();
    for (const datei of fs.readdirSync(path.join(SPEC, 'specs/v9'))) {
      if (!datei.endsWith('.md')) continue;
      const txt = fs.readFileSync(path.join(SPEC, 'specs/v9', datei), 'utf8');
      for (const m of txt.matchAll(/\b(INV-[A-Z]+(?:-?\d+)*|LP-\d+)\b/g)) roh.add(m[1]);
    }
    // Familien-Namen ohne Nummer sind Prosa („die INV-UI-Familie"), keine Invarianten:
    // ein Kürzel, zu dem ein nummerierter Geschwister existiert, ist selbst keins.
    const benannt = [...roh].filter(
      (t) => ![...roh].some((u) => u !== t && (u.startsWith(`${t}-`) || new RegExp(`^${t}\\d`).test(u))),
    );
    const fehlend = benannt
      .filter((inv) => !new RegExp(`inv: '${inv}'`).test(tabelle))
      .sort();
    if (fehlend.length)
      fehler.push(
        `L13 ${fehlend.length} benannte Invariante(n) ohne Zeile in tools/mutation/mutationen.mjs — ` +
          `jede braucht eine: Mutation, anderes Gate oder ausdrücklich „offen" (BL-287):\n    ` +
          fehlend.join(' · '),
      );
  } else {
    warnungen.push(
      `L13 übersprungen: ${mutTabelle} nicht gefunden — ohne das Code-Repo ist die ` +
        `Vollständigkeit der Mutations-Tabelle nicht prüfbar.`,
    );
  }

  return { fehler, warnungen, zeilen };
}

/**
 * Der PLANUNGSTEIL der Priorisierung: die Zeilen der Cluster-Tabelle plus die nummerierte
 * Wellen-Liste samt ihrer eingerückten Fortsetzungszeilen. `null`, wenn der Abschnitt fehlt.
 *
 * Bewusst nicht der ganze Abschnitt (s. L10-Kommentar) und bewusst zeilenweise statt über
 * eine Markdown-Bibliothek — beide Formen sind hier flach und stabil.
 */
export function planungsteil(text) {
  const start = text.indexOf('## Priorisierung');
  if (start < 0) return null;
  const endeMarke = text.indexOf('## Offene Punkte', start);
  const ende = endeMarke < 0 ? text.length : endeMarke;
  const raus = [];
  let inWelle = false;
  for (const l of text.slice(start, ende).split('\n')) {
    const istWellenKopf = /^\d+\. /.test(l);
    const istFortsetzung = inWelle && /^\s{3,}\S/.test(l);
    if (istWellenKopf) inWelle = true;
    else if (!istFortsetzung) inWelle = false;
    // Cluster-Tabellenzeile: beginnt mit `|`, aber keine Kopf-/Trennzeile.
    const istClusterZeile = l.startsWith('|') && !/^\|\s*(Cluster|-+\|)/.test(l) && !/^\|---/.test(l);
    if (istClusterZeile || istWellenKopf || istFortsetzung) raus.push(l);
  }
  return raus.join('\n');
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
    // Vierte Ablösung von einer Produktivdatei (2026-07-21): hing an
    // `txt:no-useless-assignment@ui/views/timeline/TimelineLensView.svelte` — BL-53
    // entfernte genau diesen Kommentar-Rest, und der Fall wurde falsch. Anders als die
    // drei vorherigen Male fiel es sofort auf, weil der Selbsttest seit BL-04 bei jedem
    // Lauf mitläuft: die Erledigung EINER Backlog-Zeile machte den Prüfer rot, statt ihn
    // still zu beschädigen. Der Fall bewacht, dass `txt:` im ROHTEXT sucht (Kommentare
    // eingeschlossen) — im Unterschied zu `sym:`, das vorher strippt.
    ['txt: findet Kommentar (nicht gestrippt)', 'txt:diesesTokenStehtNurImKommentar@.claude/skills/spec-lint/fixtures/kommentar-beispiel.ts', true],
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

  // L9 negativ prüfen: genau die Form, die den Fund ausgelöst hat — eine Datenzeile
  // zwischen Kopf- und Trennzeile. Die Gegenprobe mit gesunder Tabelle gehört dazu, sonst
  // wäre eine Regel, die immer anschlägt, ebenfalls „grün getestet".
  const l9Kaputt = [
    '## Erledigte Punkte',
    '| ID | P | Typ | Klasse | Punkt | Spec | Beleg | Status |',
    '| BL-92 | K | feature | basis | zwischen Kopf und Trenner | [20](20-Funktionen.md) | `sym:x` | gebaut |',
    '|---|---|---|---|---|---|---|---|',
  ].join('\n');
  const l9Heil = [
    '| ID | P | Typ | Klasse | Punkt | Spec | Beleg | Status |',
    '|---|---|---|---|---|---|---|---|',
    '| BL-93 | K | feature | basis | korrekt | [20](20-Funktionen.md) | `sym:y` | gebaut |',
  ].join('\n');
  const l9ok = tabellenBrueche(l9Kaputt).join() === '2' && tabellenBrueche(l9Heil).length === 0;
  console.log(
    `${l9ok ? '  ok  ' : ' FAIL '} L9 erkennt Kopfzeile ohne Trennzeile`.padEnd(50) +
      `  → ${tabellenBrueche(l9Kaputt).join(',') || 'nichts erkannt'} (heile Tabelle: ${tabellenBrueche(l9Heil).length})`,
  );
  if (!l9ok) bad++;

  // L6 negativ prüfen: die Ableitung aus dem Quelltext muss eine Regel finden, die NUR
  // implementiert ist, und eine, die NUR dokumentiert ist. Ohne diese Gegenprobe wäre
  // nicht belegt, dass L6 in beide Richtungen schaut — und die eine Richtung, die fehlt,
  // ist erfahrungsgemäß die, in der die Drift dann auftritt.
  // Die Vorlage wird ZUSAMMENGESETZT, nicht literal hingeschrieben: stünde
  // `push(\`L9 …\`)` wörtlich hier, läse die Ableitung es beim Scan des ECHTEN Quelltexts
  // als implementierte Regel L9 mit — der Prüfer vergiftete sich an seinem eigenen
  // Selbsttest. Genau so passiert, beim ersten Lauf, sofort sichtbar am Normallauf.
  const q = '`';
  // Die erfundene Regel heißt L99, nicht L9: seit L9 wirklich existiert, wäre „L9" hier
  // beim Lesen nicht mehr als Vorlage erkennbar.
  const impl = implementierteRegeln(`fehler.push(${q}L1 x${q}); warnungen.push(${q}L99 y${q});`);
  const doku = dokumentierteRegeln('| L1 | … |\n| L8 | … |\n');
  const nurImpl = [...impl].filter((r) => !doku.has(r));
  const nurDoku = [...doku].filter((r) => !impl.has(r));
  const l6ok = nurImpl.join() === 'L99' && nurDoku.join() === 'L8';
  console.log(
    `${l6ok ? '  ok  ' : ' FAIL '} L6 erkennt Drift in beide Richtungen`.padEnd(50) +
      `  → nur implementiert: ${nurImpl.join() || '–'} · nur dokumentiert: ${nurDoku.join() || '–'}`,
  );
  if (!l6ok) bad++;

  // L8 negativ prüfen: die Bereichs-Zuordnung muss BEIDE Fehlrichtungen sehen — eine
  // Editor-Zeile, die auf geteilten Code belegt, und eine Hauptprogramm-Zeile, die auf
  // app-orte/ belegt. Reine Funktionen, kein Dateisystem: der Fall kann nicht durch ein
  // späteres Feature wahr/falsch werden (die Lehre aus den drei still verrotteten Fällen
  // oben).
  const [blHaupt, blOrte] = BACKLOGS;
  const l8Faelle = [
    ['Editor-Zeile auf geteiltem Code', blOrte, 'ui/views/place/PlaceList.svelte', false],
    ['Editor-Zeile auf app-orte/', blOrte, 'app-orte/orte-doc.ts', true],
    ['Editor-Zeile auf tests/orte/', blOrte, 'tests/orte/dokument.test.ts', true],
    ['Hauptzeile auf app-orte/', blHaupt, 'app-orte/orte-doc.ts', false],
    ['Hauptzeile auf geteiltem Code', blHaupt, 'ui/shell/places-host.ts', true],
  ];
  let l8bad = 0;
  for (const [name, bl, pfad, erwartet] of l8Faelle) {
    const ist = bl.gehoert(pfad);
    if (ist !== erwartet) l8bad++;
    console.log(`${ist === erwartet ? '  ok  ' : ' FAIL '} L8 ${name.padEnd(38)} ${pfad} → ${ist}`);
  }
  bad += l8bad;

  // Und der ID-Raum: parseBacklog darf die Zeilen der einen Statusdatei nicht in der
  // anderen mitzählen — sonst prüfte der Lauf dieselbe Zeile zweimal bzw. gar nicht.
  const praefixFall = '| OE-1 | K | feature | basis | x | [22](22-Orte-Editor-Standalone.md) | `sym:x` | offen |';
  const alsOe = parseBacklog(praefixFall, 'OE').length;
  const alsBl = parseBacklog(praefixFall, 'BL').length;
  const praefixOk = alsOe === 1 && alsBl === 0;
  if (!praefixOk) bad++;
  console.log(`${praefixOk ? '  ok  ' : ' FAIL '} parseBacklog trennt die ID-Räume`.padEnd(50) + `  → OE:${alsOe} BL:${alsBl}`);

  // L10 negativ prüfen: beide Richtungen, an einer Vorlage statt an der echten Datei —
  // sonst hinge der Fall am jeweils aktuellen Backlog-Inhalt und würde mit der nächsten
  // erledigten Zeile falsch (genau die Verrottung, die drei andere Selbsttest-Fälle schon
  // einmal erwischt hat).
  const l10Vorlage = [
    '## Priorisierung & Clusterung der offenen Items',
    '',
    'Fließtext, der BL-999 aus historischen Gründen nennt — das ist erlaubt.',
    '',
    '| Cluster | Offene Items | Fläche |',
    '|---|---|---|',
    '| Ⓐ Beispiel | BL-900 · BL-901 | irgendwo |',
    '',
    '1. **Welle 1 — basis:** BL-900',
    '   · BL-902 (Fortsetzungszeile)',
    '',
    '## Offene Punkte',
  ].join('\n');
  const geplant = new Set((planungsteil(l10Vorlage).match(/BL-\d+/g) || []));
  const l10ok =
    geplant.has('BL-900') && geplant.has('BL-901') && geplant.has('BL-902') && !geplant.has('BL-999');
  if (!l10ok) bad++;
  console.log(
    `${l10ok ? '  ok  ' : ' FAIL '} L10 liest Cluster + Wellen, nicht die Prosa`.padEnd(50) +
      `  → ${[...geplant].sort().join(',')}`,
  );

  // L11 negativ prüfen: an einer Vorlage, nicht an 04/05 — die echten Dateien ändern sich
  // mit jeder Sitzung, ein daran hängender Fall wäre in zwei Wochen still falsch (dieselbe
  // Verrottung wie bei den vier `fixtures/`-Fällen oben). Geprüft werden beide Richtungen:
  // die Regel muss die Behauptung SEHEN und die drei Nachbarformen in Ruhe lassen — sonst
  // ist sie entweder blind oder Rauschen.
  const l11Vorlage = [
    'A Am Realbestand kommen `AGNC` 7× vor — Zählung ohne Datei, muss anschlagen.',
    'B Am Realbestand (`Unsere Familie 2026.ged`) kommen `AGNC` 7× vor — Datei genannt, still.',
    'C Am echten Bestand verifiziert, mit dem Beispiel `Bifang` — keine Zählung, still.',
    'D Der Sekundär-Stil war 7× dupliziert — Aussage über den Code, nicht den Bestand, still.',
    'E Abgewählte Mitglieder bleiben im Bestand und werden bei der 2. Neuberechnung erfasst.',
  ].join('\n');
  const l11Ist = bestandsBehauptungen(l11Vorlage).map((t) => t.zeile);
  const l11ok = l11Ist.join() === '1';
  if (!l11ok) bad++;
  console.log(
    `${l11ok ? '  ok  ' : ' FAIL '} L11 trifft die Zählung, nicht die Nachbarn`.padEnd(50) +
      `  → Zeilen ${l11Ist.join(',') || 'keine'} (erwartet 1)`,
  );

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
