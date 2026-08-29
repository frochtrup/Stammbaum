#!/usr/bin/env node
// check-anchors.mjs — tote Sprungmarken in den Markdown-Dokumenten des Spec-Repos.
//
// Anlass (BL-84): 26 Links zeigten ins Leere, ohne dass irgendetwas anschlug. Der größte
// Teil davon waren `…04-Entscheidungslog.md#adr-v9-101`-Kurzverweise — GitHub bildet den
// Anker aus der VOLLSTÄNDIGEN Überschrift („## ADR-v9-101 — Titel ✅ · Datum"), der
// Kurzanker existiert dort also nicht und der Sprung landet am Dateianfang. Beim Lesen
// fällt das kaum auf: die Datei öffnet sich, nur eben an der falschen Stelle.
//
// Zwei Anker-Arten werden gesammelt:
//   1. Überschriften — Slug nach GitHubs echter Regel (github-slug-regex.mjs, vendoriert).
//      Mehrfach gleiche Überschriften bekommen `-1`, `-2` … wie bei GitHub.
//   2. Explizite `<a id="…">`/`name="…"` — der Ausweg für Überschriften, deren Slug lang
//      und brüchig wäre (jede Titeländerung bräche sonst jeden Verweis). Genau so sind die
//      ADR-Kurzanker jetzt echt gemacht.
//
// Aufruf:  node .claude/skills/spec-lint/check-anchors.mjs
// Exit 0 = alle Sprungmarken auflösbar.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { regex } from './github-slug-regex.mjs';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../../../..');

/** GitHubs Slug-Regel: kleinschreiben · Sonderzeichen weg · Leerzeichen zu Bindestrich. */
function slug(value) {
  return value.toLowerCase().replace(regex, '').replace(/ /g, '-');
}

/** Alle Markdown-Dateien: das Spec-Set plus die Anweisungsdatei im Wurzelverzeichnis. */
function markdownDateien(dir, out = []) {
  for (const e of fs.readdirSync(dir)) {
    if (e === 'node_modules' || e === '.git' || e === 'legacy-v8') continue;
    const f = path.join(dir, e);
    if (fs.statSync(f).isDirectory()) markdownDateien(f, out);
    else if (f.endsWith('.md')) out.push(f);
  }
  return out;
}

/** Die Anker, die eine Datei anbietet. */
export function ankerVon(text) {
  const anker = new Set();
  const zaehler = new Map();
  let inCodeblock = false;
  for (const zeile of text.split('\n')) {
    if (/^\s*```/.test(zeile)) inCodeblock = !inCodeblock;
    if (inCodeblock) continue;
    const h = zeile.match(/^#{1,6}\s+(.*?)\s*$/);
    if (h) {
      // Markdown im Überschriftentext zählt nicht mit: GitHub slugt den gerenderten Text.
      const roh = h[1]
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/[*_`]/g, '');
      const s = slug(roh);
      const n = zaehler.get(s) ?? 0;
      zaehler.set(s, n + 1);
      anker.add(n === 0 ? s : `${s}-${n}`);
    }
    for (const m of zeile.matchAll(/<a\s+(?:id|name)="([^"]+)"/g)) anker.add(m[1]);
  }
  return anker;
}

/** Die Sprungmarken, die eine Datei benutzt — als {ziel, anker}. */
export function verweiseVon(text) {
  const out = [];
  for (const m of text.matchAll(/\]\(([^)\s]*)#([^)\s]+)\)/g)) out.push({ ziel: m[1], anker: m[2] });
  return out;
}

function pruefe() {
  const dateien = markdownDateien(path.join(ROOT, 'specs')).concat(path.join(ROOT, 'CLAUDE.md'));
  const ankerCache = new Map();
  const anker = (f) => {
    if (!ankerCache.has(f)) ankerCache.set(f, fs.existsSync(f) ? ankerVon(fs.readFileSync(f, 'utf8')) : null);
    return ankerCache.get(f);
  };

  const tot = [];
  for (const datei of dateien) {
    const text = fs.readFileSync(datei, 'utf8');
    for (const { ziel, anker: a } of verweiseVon(text)) {
      const zielDatei = ziel === '' ? datei : path.resolve(path.dirname(datei), ziel);
      if (!zielDatei.endsWith('.md')) continue; // Bild-/Codeverweise haben keine Anker
      const vorhanden = anker(zielDatei);
      if (vorhanden === null) {
        tot.push(`${path.relative(ROOT, datei)} → ${ziel} (Datei fehlt)`);
      } else if (!vorhanden.has(decodeURIComponent(a))) {
        tot.push(`${path.relative(ROOT, datei)} → ${ziel || path.basename(datei)}#${a}`);
      }
    }
  }

  if (tot.length) {
    console.log(`FEHLER   ${tot.length} tote Sprungmarken:`);
    for (const t of tot) console.log('  ' + t);
    return 1;
  }
  console.log(`${dateien.length} Markdown-Dateien — alle Sprungmarken auflösbar.`);
  return 0;
}

process.exit(pruefe());
