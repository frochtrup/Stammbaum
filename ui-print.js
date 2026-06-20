// ─────────────────────────────────────────────────────────────────
//  PRINT-OUT — Strukturierte Druckausgaben (sw v669)
//  1. Ahnenliste  — Kekule-Tabelle aller Vorfahren des Probanden
//  2. Familienbogen — Druckblatt der aktuell angezeigten Person
//
//  Benötigt: gedcom.js (esc, compactPlace, AppState)
//            ui-book.js (_buildKekuleMap, _collectCitations)
// ─────────────────────────────────────────────────────────────────

// ── Gemeinsames Print-CSS ─────────────────────────────────────────
function _printCss() {
  return `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 11pt; color: #1a1208; background: #fff;
      max-width: 800px; margin: 0 auto; padding: 24px 28px;
    }
    h1 { font-size: 1.8rem; font-weight: 700; margin-bottom: 4px; }
    h2 { font-size: 1.05rem; font-weight: 700; margin: 20px 0 7px;
         border-bottom: 1.5px solid #c0a878; padding-bottom: 3px; color: #5a3e0e; }
    .meta { font-size: 0.82rem; color: #8a7050; margin-bottom: 20px; }

    /* ── Ahnenliste ───────────────────────────────────────────── */
    .ahnen-title { font-size: 1.1rem; color: #6a4a20; margin: 2px 0 20px; font-weight: 400; }
    table.ahnen { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin-top: 4px; }
    table.ahnen th {
      background: #f5eedf; color: #5a3e0e; font-weight: 700;
      text-align: left; padding: 4px 6px; border: 1px solid #ddd0b8;
    }
    table.ahnen td { padding: 3px 6px; border: 1px solid #e8dfc8; vertical-align: top; }
    table.ahnen tr.gen-row td {
      background: #faf4e8; font-weight: 700; color: #5a3e0e;
      font-size: 0.82rem; padding: 5px 6px 3px;
      border-top: 2px solid #c0a878; border-bottom: 1px solid #c0a878;
    }
    table.ahnen tbody tr:not(.gen-row):hover td { background: #fdf8ef; }
    .ahnen-nr { font-weight: 700; color: #8a6420; }
    .parent-ref { color: #7a5010; font-size: 0.85rem; }
    .nd { color: #bbb; font-size: 0.82rem; }

    /* ── Familienbogen ────────────────────────────────────────── */
    .fb-header { margin-bottom: 14px; padding-bottom: 10px; border-bottom: 2px solid #c0a878; }
    .fb-header h1 { font-size: 1.55rem; }
    .fb-header .lifespan { font-size: 0.95rem; color: #6a4a20; margin-top: 3px; }
    .fb-section { margin-bottom: 16px; }
    dl.fb-facts {
      display: grid; grid-template-columns: 130px 1fr;
      gap: 2px 8px; font-size: 10pt; margin-top: 4px;
    }
    dl.fb-facts dt { font-weight: 700; color: #6a4a20; padding-top: 1px; white-space: nowrap; }
    dl.fb-facts dd { margin: 0; }
    .fb-note { font-size: 0.88rem; color: #3a2810; white-space: pre-wrap; margin-top: 8px;
               padding: 6px 10px; border-left: 3px solid #c0a878; background: #fdf8ef; }
    .fb-list { list-style: none; font-size: 10pt; margin-top: 4px; }
    .fb-list li { padding: 2px 0; }
    .fb-list .role { display: inline-block; min-width: 80px; font-weight: 700; color: #6a4a20; }
    .spouse-block {
      margin: 6px 0 10px; padding: 8px 12px;
      border: 1px solid #ddd0b8; border-radius: 4px; background: #fdfaf5;
    }
    .spouse-name { font-weight: 700; font-size: 1rem; }
    .spouse-meta { font-size: 0.88rem; color: #6a4a20; margin-top: 2px; }
    .children-list { margin-top: 5px; font-size: 0.88rem; color: #3a2810; }
    .fb-sources { margin-top: 18px; font-size: 0.78rem; color: #8a7050;
                  border-top: 1px solid #ddd0b8; padding-top: 6px; }
    .no-data { color: #aaa; font-style: italic; font-size: 0.88rem; }

    /* ── Quellenbibliografie ──────────────────────────────────── */
    .bib-summary { font-size: 0.9rem; color: #5a3e0e; background: #faf4e8;
                   border: 1px solid #e8dfc8; border-radius: 4px;
                   padding: 8px 12px; margin-bottom: 18px; }
    .bib-summary strong { color: #6a4a20; }
    ol.bib-list { list-style: none; counter-reset: bib; }
    ol.bib-list li { counter-increment: bib; position: relative;
                     padding: 8px 8px 8px 38px; border-bottom: 1px solid #eee4cf;
                     font-size: 10pt; line-height: 1.4; }
    ol.bib-list li::before { content: counter(bib) "."; position: absolute;
                     left: 4px; top: 8px; font-weight: 700; color: #8a6420;
                     font-size: 0.85rem; }
    .bib-title { font-weight: 700; color: #2a1d08; }
    .bib-detail { color: #5a4326; }
    .bib-refs { display: inline-block; margin-left: 6px; font-size: 0.8rem;
                color: #6a4a20; background: #f0e6cf; border-radius: 3px;
                padding: 0 6px; white-space: nowrap; }
    .bib-orphan { display: inline-block; margin-left: 6px; font-size: 0.8rem;
                  color: #9a3010; background: #f6e2d8; border-radius: 3px;
                  padding: 0 6px; white-space: nowrap; }
    .bib-repo { font-size: 0.85rem; color: #7a5010; }
    .bib-note { display: block; font-size: 0.85rem; color: #6a584a;
                margin-top: 2px; white-space: pre-wrap; }

    /* ── Forschungsprotokoll ──────────────────────────────────── */
    .fr-entity { margin: 14px 0 4px; page-break-inside: avoid; }
    .fr-entity h2 { margin-bottom: 4px; }
    .fr-life { font-weight: 400; font-size: 0.85rem; color: #8a7050; }
    .fr-sub { font-size: 0.8rem; font-weight: 700; color: #6a4a20;
              text-transform: uppercase; letter-spacing: 0.03em;
              margin: 8px 0 3px; }
    ul.fr-tasks, ul.fr-logs { list-style: none; }
    ul.fr-tasks li, ul.fr-logs li { padding: 3px 0 3px 4px; font-size: 10pt;
                     line-height: 1.4; border-bottom: 1px solid #f0e9d8; }
    .fr-badge { display: inline-block; font-size: 0.72rem; font-weight: 700;
                border-radius: 3px; padding: 0 6px; margin-right: 6px;
                vertical-align: 1px; white-space: nowrap; }
    .fr-todo  { background: #f0e6cf; color: #6a4a20; }
    .fr-doing { background: #e2ecf6; color: #1a4a7a; }
    .fr-done  { background: #dcefd8; color: #2a6a20; }
    .fr-cat   { color: #7a5010; font-size: 0.85rem; }
    .fr-date  { color: #a09070; font-size: 0.8rem; }
    .fr-found     { background: #dcefd8; color: #2a6a20; }
    .fr-partial   { background: #f6efd0; color: #7a6010; }
    .fr-notfound  { background: #f6e2d8; color: #9a3010; }
    .fr-pending   { background: #ece6da; color: #6a584a; }
    .fr-query { font-style: italic; color: #3a2810; }
    .fr-lognote { display: block; color: #5a4326; font-size: 0.88rem;
                  margin-top: 1px; white-space: pre-wrap; }

    /* ── Statistik-Report ─────────────────────────────────────── */
    .st-tiles { display: flex; flex-wrap: wrap; gap: 8px; margin: 4px 0 6px; }
    .st-tile { flex: 1 1 90px; text-align: center; background: #faf4e8;
               border: 1px solid #e8dfc8; border-radius: 5px; padding: 8px 6px; }
    .st-tile-num { font-size: 1.4rem; font-weight: 700; color: #6a4a20; }
    .st-tile-lbl { font-size: 0.78rem; color: #8a7050; }
    table.st { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin-top: 2px; }
    table.st th { background: #f5eedf; color: #5a3e0e; font-weight: 700;
                  text-align: left; padding: 3px 6px; border: 1px solid #ddd0b8; }
    table.st td { padding: 2px 6px; border: 1px solid #e8dfc8; vertical-align: middle; }
    table.st td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    table.st td.barcell { width: 45%; padding: 2px 6px; }
    .st-bar { height: 10px; background: #c0a878; border-radius: 2px; min-width: 1px; }
    .st-section-sub { page-break-inside: avoid; }

    /* ── Nachkommentafel (d'Aboville) ─────────────────────────── */
    .nk-gen-head { font-size: 0.82rem; font-weight: 700; color: #5a3e0e;
                   text-transform: uppercase; letter-spacing: 0.04em;
                   margin: 16px 0 4px; border-bottom: 1.5px solid #c0a878;
                   padding-bottom: 2px; }
    .nk-entry { margin: 5px 0; padding-left: 4px; page-break-inside: avoid;
                font-size: 10pt; line-height: 1.45; }
    .nk-num { font-weight: 700; color: #8a6420; margin-right: 5px;
              font-variant-numeric: tabular-nums; }
    .nk-name { font-weight: 700; color: #2a1d08; }
    .nk-life { color: #6a4a20; font-size: 0.9rem; }
    .nk-bio { color: #3a2810; }
    .nk-spouse { display: block; margin-left: 18px; color: #5a4326;
                 font-size: 0.92rem; }
    .nk-spouse-mark { color: #8a6420; }
    .nk-children { display: block; margin-left: 18px; font-size: 0.85rem;
                   color: #7a6248; margin-top: 1px; }
    .nk-dup { color: #8a7050; font-style: italic; }

    /* ── Verwandtschafts-Zertifikat ───────────────────────────── */
    .rc-frame { border: 2px solid #c0a878; border-radius: 6px; padding: 26px 30px;
                margin-top: 10px; }
    .rc-persons { display: flex; justify-content: center; align-items: center;
                  gap: 18px; margin: 6px 0 18px; text-align: center; flex-wrap: wrap; }
    .rc-person { font-size: 1.05rem; font-weight: 700; color: #2a1d08; }
    .rc-person .rc-life { display: block; font-size: 0.82rem; font-weight: 400; color: #6a4a20; }
    .rc-amp { font-size: 1.3rem; color: #8a6420; }
    .rc-verdict { text-align: center; font-size: 1.15rem; color: #5a3e0e;
                  background: #faf4e8; border: 1px solid #e8dfc8; border-radius: 5px;
                  padding: 10px 14px; margin: 12px 0; font-weight: 700; }
    .rc-common { text-align: center; font-size: 0.92rem; color: #6a4a20; margin-bottom: 16px; }
    ol.rc-path { list-style: none; counter-reset: rcp; max-width: 460px; margin: 0 auto; }
    ol.rc-path li { counter-increment: rcp; position: relative; padding: 4px 0 4px 30px;
                    font-size: 10pt; }
    ol.rc-path li::before { content: counter(rcp) "."; position: absolute; left: 2px;
                    color: #8a6420; font-weight: 700; font-size: 0.85rem; }
    ol.rc-path li.rc-common-node { font-weight: 700; color: #5a3e0e; }
    ol.rc-path li.rc-common-node::before { content: "⬡"; }
    .rc-pname { font-weight: 600; }
    .rc-pyr { color: #8a7050; font-size: 0.85rem; }
    .rc-foot { margin-top: 20px; font-size: 0.78rem; color: #8a7050; text-align: center;
               border-top: 1px solid #ddd0b8; padding-top: 8px; }

    @media print {
      @page { size: A4 portrait; margin: 2cm; }
      body { max-width: 100%; padding: 0; }
      table.ahnen { font-size: 8.5pt; }
      table.ahnen tr.gen-row { page-break-after: avoid; }
      .fb-section { page-break-inside: avoid; }
      .spouse-block { page-break-inside: avoid; }
      .fb-header { page-break-after: avoid; }
    }
  `;
}

// ── Ereignis kompakt: Datum + Ort ─────────────────────────────────
function _poEvLine(ev) {
  if (!ev) return '';
  return [ev.date, compactPlace(ev.place)].filter(Boolean).join(', ');
}

// ── Lebensklammer (Jahr) ──────────────────────────────────────────
function _poLifeYears(p) {
  if (!p) return '';
  const b = (p.birth?.date || p.chr?.date  || '').match(/\d{4}/)?.[0] || '';
  const d = (p.death?.date || p.buri?.date || '').match(/\d{4}/)?.[0] || '';
  if (!b && !d) return '';
  return `(${b ? '*' + b : ''}${b && d ? ' ' : ''}${d ? '†' + d : ''})`;
}


// ═════════════════════════════════════════════════════════════════
//  1. AHNENLISTE
// ═════════════════════════════════════════════════════════════════

function _buildAhnenlisteHtml(probandId) {
  const db         = AppState.db;
  const kekuleMap  = _buildKekuleMap(probandId); // { kekule: personId }

  const sorted = Object.entries(kekuleMap)
    .sort((a, b) => Number(a[0]) - Number(b[0]));

  const maxKek   = sorted.length ? Number(sorted[sorted.length - 1][0]) : 1;
  const genCount = Math.floor(Math.log2(maxKek)) + 1;
  const now      = new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
  const proband  = db.individuals[probandId];
  const probName = proband
    ? (proband.given ? `${proband.given} ${proband.surname || ''}`.trim() : proband.name)
    : probandId;

  const GEN_LABELS  = ['I','II','III','IV','V','VI','VII','VIII','IX','X',
                       'XI','XII','XIII','XIV','XV','XVI'];
  const GEN_NAMES   = ['Proband/in', 'Eltern', 'Großeltern', 'Urgroßeltern',
                       '3× Urgroßeltern', '4× Urgroßeltern', '5× Urgroßeltern',
                       '6× Urgroßeltern', '7× Urgroßeltern'];

  let rows = '';
  let curGen = -1;

  for (const [kStr, id] of sorted) {
    const k   = Number(kStr);
    const gen = Math.floor(Math.log2(Math.max(k, 1)));

    if (gen !== curGen) {
      curGen = gen;
      const lbl     = GEN_LABELS[gen] || String(gen + 1);
      const desc    = GEN_NAMES[gen]  || `${gen}. Vorfahrengeneration`;
      const kStart  = 1 << gen;
      const kEnd    = (1 << (gen + 1)) - 1;
      const range   = kEnd > kStart ? ` (Nr. ${kStart}–${kEnd})` : ` (Nr. ${kStart})`;
      rows += `<tr class="gen-row"><td colspan="6">${lbl}. Generation – ${esc(desc)}${range}</td></tr>\n`;
    }

    const p = db.individuals[id];
    if (!p) continue;

    const name  = p.given ? `${p.given} ${p.surname || ''}`.trim() : (p.name || '—');
    const birth = _poEvLine(p.birth) || _poEvLine(p.chr)  || '';
    const death = _poEvLine(p.death) || _poEvLine(p.buri) || '';
    const vatK  = k * 2;
    const mutK  = k * 2 + 1;
    const vatCell = kekuleMap[vatK]
      ? `<span class="parent-ref">${vatK}</span>`
      : `<span class="nd">—</span>`;
    const mutCell = kekuleMap[mutK]
      ? `<span class="parent-ref">${mutK}</span>`
      : `<span class="nd">—</span>`;

    rows += `<tr>
      <td class="ahnen-nr">${k}</td>
      <td>${esc(name)}</td>
      <td>${esc(birth)}</td>
      <td>${esc(death)}</td>
      <td>${vatCell}</td>
      <td>${mutCell}</td>
    </tr>\n`;
  }

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ahnenliste – ${esc(probName)}</title>
<style>${_printCss()}</style>
</head>
<body>
<h1>Ahnenliste</h1>
<p class="ahnen-title">${esc(probName)}</p>
<p class="meta">${sorted.length} Vorfahren in ${genCount} Generation${genCount !== 1 ? 'en' : ''} · Erstellt ${now}</p>

<table class="ahnen">
<thead>
<tr>
  <th class="ahnen-col-nr">Nr.</th>
  <th>Name</th>
  <th>* Geburt / Taufe</th>
  <th>† Tod / Beerdigung</th>
  <th class="ahnen-col-par">Vater</th>
  <th class="ahnen-col-par">Mutter</th>
</tr>
</thead>
<tbody>
${rows}</tbody>
</table>
</body>
</html>`;
}

// ── Ahnenliste herunterladen ──────────────────────────────────────
function downloadAhnenliste() {
  const db = AppState.db;
  if (!db || !Object.keys(db.individuals || {}).length) {
    showToast('⚠ Keine Daten geladen', 'warn');
    return;
  }
  const probandId = AppState._probandId
    || Object.keys(db.individuals).sort((a, b) =>
         a.localeCompare(b, undefined, { numeric: true }))[0];
  try {
    const html     = _buildAhnenlisteHtml(probandId);
    const blob     = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement('a');
    const proband  = db.individuals[probandId];
    const safeName = (proband?.name || 'Ahnenliste')
      .replace(/[^\w\-äöüÄÖÜß ]/g, '').trim().replace(/ /g, '_');
    a.href = url;
    a.download = safeName + '_Ahnenliste.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    showToast(`✓ ${a.download} heruntergeladen`);
  } catch (err) {
    console.error('downloadAhnenliste:', err);
    showToast('⚠ Ahnenliste: ' + err.message, 'error');
  }
}


// ═════════════════════════════════════════════════════════════════
//  2. FAMILIENBOGEN
// ═════════════════════════════════════════════════════════════════

function _buildFamilienbogenHtml(personId) {
  const db = AppState.db;
  const p  = db.individuals[personId];
  if (!p) throw new Error('Person nicht gefunden: ' + personId);

  const now      = new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
  const given    = p.given   || '';
  const surname  = p.surname || p.name || '';
  const fullName = given ? `${given} ${surname}`.trim() : surname;
  const lifeYrs  = _poLifeYears(p);

  // ── Sektion 1: Persönliche Daten ──────────────────────────────
  let sec1 = `<div class="fb-section"><h2>Persönliche Daten</h2>\n<dl class="fb-facts">`;

  const addFact = (label, val) => {
    if (!val) return;
    sec1 += `<dt>${esc(label)}</dt><dd>${esc(val)}</dd>`;
  };

  addFact('Vorname',     given || '—');
  addFact('Nachname',    surname);
  addFact('Geschlecht',  p.sex === 'M' ? 'männlich' : p.sex === 'F' ? 'weiblich' : '');

  // Geburtsname / Mädchenname aus extraNames
  const birthName = (p.extraNames || []).find(n => {
    const t = (n.type || '').toLowerCase();
    return t === 'birth' || t === 'maiden' || t === 'maid' || t === 'birt' || t === 'mädchenname';
  });
  if (birthName) {
    const bName = birthName.nameRaw || (birthName.given
      ? `${birthName.given} ${birthName.surname || ''}`.trim()
      : '');
    if (bName) addFact('Geburtsname', bName);
  }

  addFact('Geburt',      _poEvLine(p.birth));
  if (p.chr?.date || p.chr?.place)
    addFact('Taufe',     _poEvLine(p.chr));
  addFact('Tod',         _poEvLine(p.death));
  if (p.buri?.date || p.buri?.place)
    addFact('Beerdigung', _poEvLine(p.buri));

  // Berufe aus p.events
  const occuEvs = (p.events || []).filter(ev => ev.type === 'OCCU');
  if (occuEvs.length) {
    addFact('Beruf', occuEvs.map(ev =>
      [ev.value, ev.date].filter(Boolean).join(', ')).join(' / '));
  }

  sec1 += `</dl>`;
  if (p.noteText) {
    sec1 += `\n<p class="fb-note">${esc(p.noteText)}</p>`;
  }
  sec1 += `\n</div>`;

  // ── Sektion 2: Eltern ──────────────────────────────────────────
  let sec2 = `\n<div class="fb-section"><h2>Eltern</h2>`;
  const famcId = p.famc?.[0]?.famId;
  const famc   = famcId ? db.families[famcId] : null;

  if (famc) {
    const vater  = famc.husb ? db.individuals[famc.husb] : null;
    const mutter = famc.wife ? db.individuals[famc.wife] : null;
    sec2 += `\n<ul class="fb-list">`;
    if (vater) {
      const vn = vater.given ? `${vater.given} ${vater.surname || ''}`.trim() : vater.name;
      sec2 += `\n<li><span class="role">Vater:</span> ${esc(vn)} ${esc(_poLifeYears(vater))}</li>`;
    } else {
      sec2 += `\n<li><span class="role">Vater:</span> <span class="no-data">unbekannt</span></li>`;
    }
    if (mutter) {
      const mn = mutter.given ? `${mutter.given} ${mutter.surname || ''}`.trim() : mutter.name;
      sec2 += `\n<li><span class="role">Mutter:</span> ${esc(mn)} ${esc(_poLifeYears(mutter))}</li>`;
    } else {
      sec2 += `\n<li><span class="role">Mutter:</span> <span class="no-data">unbekannt</span></li>`;
    }
    sec2 += `\n</ul>`;
  } else {
    sec2 += `\n<p class="no-data">Keine Elternfamilie eingetragen</p>`;
  }
  sec2 += `\n</div>`;

  // ── Sektion 3: Geschwister ─────────────────────────────────────
  let sec3 = `\n<div class="fb-section"><h2>Geschwister</h2>`;
  const siblings = famc
    ? (famc.children || [])
        .filter(cid => cid !== personId)
        .map(cid => db.individuals[cid])
        .filter(Boolean)
    : [];

  if (siblings.length) {
    siblings.sort((a, b) => {
      const ya = (a.birth?.date || a.chr?.date  || '').match(/\d{4}/)?.[0] || '9999';
      const yb = (b.birth?.date || b.chr?.date  || '').match(/\d{4}/)?.[0] || '9999';
      return ya.localeCompare(yb);
    });
    sec3 += `\n<ul class="fb-list">`;
    siblings.forEach(s => {
      const sn = s.given ? `${s.given} ${s.surname || ''}`.trim() : s.name;
      const sl = _poLifeYears(s);
      sec3 += `\n<li>${esc(sn)}${sl ? ' ' + esc(sl) : ''}</li>`;
    });
    sec3 += `\n</ul>`;
  } else {
    sec3 += `\n<p class="no-data">Keine Geschwister eingetragen</p>`;
  }
  sec3 += `\n</div>`;

  // ── Sektion 4: Ehe(n) ──────────────────────────────────────────
  let sec4 = `\n<div class="fb-section"><h2>Ehe(n)</h2>`;
  const fams = (p.fams || []).map(fid => db.families[fid]).filter(Boolean);

  if (fams.length) {
    fams.forEach(fam => {
      const spouseId   = p.sex === 'F' ? fam.husb : fam.wife;
      const spouse     = spouseId ? db.individuals[spouseId] : null;
      const spouseName = spouse
        ? (spouse.given ? `${spouse.given} ${spouse.surname || ''}`.trim() : spouse.name)
        : 'unbekannte Person';
      const marrLine = [fam.marr?.date, compactPlace(fam.marr?.place)].filter(Boolean).join(', ');

      sec4 += `\n<div class="spouse-block">`;
      sec4 += `\n<div class="spouse-name">&#x26AD; ${esc(spouseName)} ${esc(_poLifeYears(spouse))}</div>`;
      if (marrLine) sec4 += `\n<div class="spouse-meta">Heirat: ${esc(marrLine)}</div>`;

      const kids = (fam.children || []).map(cid => db.individuals[cid]).filter(Boolean);
      if (kids.length) {
        const kidStrs = kids.map(c => {
          const cn = c.given ? `${c.given} ${c.surname || ''}`.trim() : c.name;
          const yr = (c.birth?.date || c.chr?.date || '').match(/\d{4}/)?.[0];
          return esc(cn) + (yr ? ` *${yr}` : '');
        });
        sec4 += `\n<div class="children-list">Kinder: ${kidStrs.join(', ')}</div>`;
      } else {
        sec4 += `\n<div class="children-list no-data">Keine Kinder eingetragen</div>`;
      }
      sec4 += `\n</div>`;
    });
  } else {
    sec4 += `\n<p class="no-data">Keine Ehe(n) eingetragen</p>`;
  }
  sec4 += `\n</div>`;

  // ── Quellen ────────────────────────────────────────────────────
  const cits    = _collectCitations(p);
  const srcHtml = cits.length
    ? `\n<div class="fb-sources"><strong>Quellen:</strong> ${cits.join(' · ')}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Familienbogen – ${esc(fullName)}</title>
<style>${_printCss()}</style>
</head>
<body>
<div class="fb-header">
  <h1>${esc(given ? given + ' ' : '')}<strong>${esc(surname)}</strong></h1>
  ${lifeYrs ? `<div class="lifespan">${esc(lifeYrs)}</div>` : ''}
  <p class="meta">Familienbogen · ${now}</p>
</div>
${sec1}${sec2}${sec3}${sec4}${srcHtml}
</body>
</html>`;
}

// ── Familienbogen herunterladen ───────────────────────────────────
function downloadFamilienbogen() {
  const db = AppState.db;
  if (!db || !Object.keys(db.individuals || {}).length) {
    showToast('⚠ Keine Daten geladen', 'warn');
    return;
  }
  const personId = AppState.currentPersonId
    || AppState._probandId
    || Object.keys(db.individuals).sort((a, b) =>
         a.localeCompare(b, undefined, { numeric: true }))[0];
  try {
    const html     = _buildFamilienbogenHtml(personId);
    const blob     = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement('a');
    const p        = db.individuals[personId];
    const safeName = (p?.name || 'Familienbogen')
      .replace(/[^\w\-äöüÄÖÜß ]/g, '').trim().replace(/ /g, '_');
    a.href = url;
    a.download = safeName + '_Familienbogen.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    showToast(`✓ ${a.download} heruntergeladen`);
  } catch (err) {
    console.error('downloadFamilienbogen:', err);
    showToast('⚠ Familienbogen: ' + err.message, 'error');
  }
}


// ═════════════════════════════════════════════════════════════════
//  3. ORTSBUCH
// ═════════════════════════════════════════════════════════════════

function _buildOrtsbuchHtml() {
  const db = AppState.db;
  const places = typeof collectPlaces === 'function' ? collectPlaces() : new Map();
  const reg = typeof getPlaceRegistry === 'function' ? getPlaceRegistry() : null;

  // Alle Orte sammeln (aus collectPlaces + standalone placeObjects)
  const allPlaces = new Map(places);
  if (reg) {
    for (const [id, po] of Object.entries(reg.byId || {})) {
      if (!allPlaces.has(po.title)) {
        allPlaces.set(po.title, { name: po.title, personIds: new Set(), eventTypes: new Set(),
          lati: po.lat, long: po.long, placeId: id, type: po.type });
      }
    }
  }

  const TYPE_LBL = {
    Country:'Land', State:'Bundesland', Region:'Region', Province:'Provinz',
    County:'Kreis', District:'Bezirk', Municipality:'Gemeinde', City:'Stadt',
    Town:'Stadt', Village:'Dorf', Hamlet:'Weiler', Parish:'Pfarrei',
    Borough:'Stadtteil', Locality:'Ortslage', Neighborhood:'Nachbarschaft',
    Building:'Gebäude', Farm:'Hof', Cemetery:'Friedhof', Church:'Kirche', Unknown:'',
  };

  const _esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const _safeId = s => s.replace(/[^a-zA-Z0-9]/g,'_');

  // Hilfsfunktion: Ereignisse für einen Ort sammeln
  const _eventsForPlace = (placeName, placeId) => {
    const evs = [];
    const seen = new Set();
    const match = ev => ev && (ev.place?.trim() === placeName || (placeId && ev.placeId === placeId));
    const add = (type, person, date) => {
      const k = `${person.id}|${type}|${date||''}`;
      if (seen.has(k)) return;
      seen.add(k);
      evs.push({ type, person, date: date || '' });
    };
    const EVENT_LBL = typeof EVENT_LABELS !== 'undefined' ? EVENT_LABELS : {};
    for (const p of Object.values(db.individuals || {})) {
      if (match(p.birth))  add('Geburt',     p, p.birth.date);
      if (match(p.death))  add('Tod',        p, p.death.date);
      if (match(p.chr))    add('Taufe',      p, p.chr.date);
      if (match(p.buri))   add('Beerdigung', p, p.buri.date);
      for (const ev of p.events || []) if (match(ev)) add(ev.eventType || EVENT_LBL[ev.type] || ev.type, p, ev.date);
    }
    for (const f of Object.values(db.families || {})) {
      if (match(f.marr)) {
        for (const pid of [f.husb, f.wife]) {
          const p = pid && db.individuals[pid];
          if (p) add('Heirat', p, f.marr.date);
        }
      }
    }
    evs.sort((a,b) => (a.date||'').localeCompare(b.date||''));
    return evs;
  };

  // Sortierte Ortsliste (mit Ereignissen, absteigend nach Häufigkeit)
  const sorted = [...allPlaces.values()].sort((a,b) =>
    (b.personIds?.size||0) - (a.personIds?.size||0) || a.name.localeCompare(b.name, 'de'));

  // TOC
  let toc = '<ul class="ob-toc">';
  for (const pl of sorted) {
    toc += `<li><a href="#ort-${_safeId(pl.name)}">${_esc(pl.name)}</a>`;
    if (pl.personIds?.size) toc += ` <em>${pl.personIds.size}</em>`;
    toc += '</li>';
  }
  toc += '</ul>';

  // Pro-Ort-Sektionen
  let body = '';
  for (const pl of sorted) {
    const po = pl.placeId && reg ? reg.byId[pl.placeId] : null;
    const typeLbl = po ? (TYPE_LBL[po.type] ?? po.type) : '';
    const evs = _eventsForPlace(pl.name, pl.placeId);
    const sid = _safeId(pl.name);

    // Koordinaten / Karte
    let mapHtml = '';
    if (pl.lati !== null && pl.long !== null && pl.lati !== undefined) {
      const tc = typeof _osmTileCoords === 'function' ? _osmTileCoords(pl.lati, pl.long, 10) : null;
      const tileUrl = tc ? `https://tile.openstreetmap.org/${tc.z}/${tc.x}/${tc.y}.png` : '';
      const osmHref = `https://www.openstreetmap.org/?mlat=${pl.lati}&mlon=${pl.long}#map=12/${pl.lati}/${pl.long}`;
      mapHtml = `<div class="ob-map">
        ${tileUrl ? `<a href="${osmHref}" target="_blank"><img src="${tileUrl}" alt="Karte" loading="lazy" class="ob-tile"></a>` : ''}
        <div class="ob-coords">${pl.lati.toFixed(4)}, ${pl.long.toFixed(4)} — <a href="${osmHref}" target="_blank">OpenStreetMap</a></div>
      </div>`;
    }

    // Hierarchie
    let hierHtml = '';
    if (po && reg && reg.enclosureChainAsOf) {
      const chain = reg.enclosureChainAsOf(pl.placeId, null).slice(1);
      if (chain.length) hierHtml = `<div class="ob-hier">${_esc(chain.join(' › '))}</div>`;
    }

    // Historische Namen
    let namesHtml = '';
    if (po?.pnames?.length) {
      const dated = po.pnames.filter(pn => pn.dateFrom || pn.dateTo || pn.lang);
      if (dated.length) {
        namesHtml = '<table class="ob-table"><tr><th>Zeitraum</th><th>Name</th><th>Sprache</th></tr>';
        for (const pn of dated) {
          const span = pn.dateFrom && pn.dateTo ? `${pn.dateFrom}–${pn.dateTo}` : pn.dateFrom ? `ab ${pn.dateFrom}` : pn.dateTo ? `bis ${pn.dateTo}` : '–';
          namesHtml += `<tr><td>${_esc(span)}</td><td>${_esc(pn.value)}</td><td>${_esc(pn.lang||'')}</td></tr>`;
        }
        namesHtml += '</table>';
      }
    }

    // Häufigste Familiennamen
    let surnHtml = '';
    if (evs.length) {
      const seenP = new Set(), surnMap = {};
      for (const e of evs) {
        if (seenP.has(e.person.id)) continue;
        seenP.add(e.person.id);
        if (e.person.surname) surnMap[e.person.surname] = (surnMap[e.person.surname]||0)+1;
      }
      const topSurn = Object.entries(surnMap).sort((a,b)=>b[1]-a[1]).slice(0,8);
      if (topSurn.length) {
        surnHtml = '<div class="ob-surns">' + topSurn.map(([n,c]) =>
          `<span class="ob-surn-chip">${_esc(n)} <em>${c}</em></span>`).join('') + '</div>';
      }
    }

    // Ereignisse nach adaptiven Zeiträumen
    let evHtml = '';
    if (evs.length) {
      const years = evs.map(e => { const m = e.date?.match(/\d{4}/); return m ? +m[0] : null; }).filter(y=>y!==null);
      if (years.length) {
        const yMin = Math.min(...years), yMax = Math.max(...years);
        const bSize = typeof _adaptiveBucketSize === 'function' ? _adaptiveBucketSize(yMin, yMax, years.length) : 25;
        const bStart = Math.floor(yMin/bSize)*bSize, bEnd = Math.floor(yMax/bSize)*bSize;
        const buckets = new Map();
        for (let y = bStart; y <= bEnd; y += bSize) buckets.set(y, []);
        const undated = [];
        for (const e of evs) {
          const m = e.date?.match(/\d{4}/);
          if (m) { const bk = Math.floor(+m[0]/bSize)*bSize; buckets.get(bk)?.push(e); }
          else undated.push(e);
        }
        evHtml = '<table class="ob-table"><tr><th>Zeitraum</th><th>Ereignisse</th><th>Personen</th></tr>';
        for (const [y, bevs] of buckets) {
          if (!bevs.length) continue;
          const pCnt = new Set(bevs.map(e=>e.person.id)).size;
          const sample = bevs.slice(0,3).map(e => `${_esc(e.type)}: ${_esc(e.person.name||'?')}${e.date ? ` (${_esc(e.date)})` : ''}`).join('; ');
          evHtml += `<tr><td>${y}–${y+bSize-1}</td><td title="${_esc(sample)}">${bevs.length}</td><td>${pCnt}</td></tr>`;
        }
        if (undated.length) evHtml += `<tr><td>Ohne Datum</td><td>${undated.length}</td><td>${new Set(undated.map(e=>e.person.id)).size}</td></tr>`;
        evHtml += '</table>';
      } else {
        evHtml = `<p>${evs.length} Ereignisse (keine Jahreszahlen erfasst)</p>`;
      }
    }

    body += `<section class="ob-place" id="ort-${sid}">
      <h2>${_esc(pl.name)}</h2>
      <div class="ob-meta">${typeLbl ? `<span class="ob-badge">${_esc(typeLbl)}</span>` : ''}${po?._govId ? ` <span class="ob-badge ob-badge--gov">GOV: ${_esc(po._govId)}</span>` : ''} <span class="ob-badge ob-badge--cnt">${pl.personIds?.size||0} Personen · ${evs.length} Ereignisse</span></div>
      ${mapHtml}
      ${hierHtml}
      ${namesHtml ? `<h3>Historische Namen</h3>${namesHtml}` : ''}
      ${surnHtml ? `<h3>Häufigste Familiennamen</h3>${surnHtml}` : ''}
      ${evHtml ? `<h3>Ereignisse nach Zeitraum</h3>${evHtml}` : ''}
    </section>`;
  }

  const fileLabel = db._sourceFile ? `— ${_esc(db._sourceFile)}` : '';
  const dateStr = new Date().toLocaleDateString('de-DE', {year:'numeric',month:'long',day:'numeric'});

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ortsbuch ${fileLabel}</title>
<style>
body { font-family: -apple-system, system-ui, sans-serif; font-size: 14px; color: #2a2018; background: #faf8f5; margin: 0; padding: 0; }
.ob-header { background: #2a2018; color: #f5e6c8; padding: 20px 32px; }
.ob-header h1 { margin: 0 0 4px; font-size: 1.5rem; }
.ob-header p  { margin: 0; font-size: 0.85rem; opacity: .7; }
.ob-toc-wrap { background: #f0ebe3; border-bottom: 1px solid #ddd4c5; padding: 16px 32px; }
.ob-toc-wrap h2 { margin: 0 0 10px; font-size: 1rem; color: #8a7060; }
.ob-toc { columns: 3; column-gap: 24px; list-style: none; margin: 0; padding: 0; font-size: 0.82rem; }
.ob-toc li { padding: 2px 0; break-inside: avoid; }
.ob-toc a  { color: #c8793a; text-decoration: none; }
.ob-toc em { color: #8a7060; font-style: normal; font-size: 0.75rem; }
.ob-content { max-width: 900px; margin: 0 auto; padding: 0 32px 48px; }
.ob-place { border-top: 2px solid #ddd4c5; padding: 28px 0 12px; }
.ob-place h2 { margin: 0 0 6px; font-size: 1.2rem; color: #2a2018; }
.ob-place h3 { margin: 16px 0 6px; font-size: 0.88rem; color: #8a7060; text-transform: uppercase; letter-spacing: .04em; }
.ob-meta { margin-bottom: 12px; display: flex; flex-wrap: wrap; gap: 6px; }
.ob-badge { background: #f0ebe3; border: 1px solid #ddd4c5; border-radius: 10px; padding: 2px 8px; font-size: 0.75rem; color: #5a4a3a; }
.ob-badge--gov { background: #e8f0f8; border-color: #b0c8e0; }
.ob-badge--cnt { background: #f5ede0; border-color: #e0c8a0; color: #6a4a20; }
.ob-map { margin: 8px 0 12px; }
.ob-tile { width: 256px; height: 256px; border-radius: 8px; border: 1px solid #ddd4c5; display: block; }
.ob-coords { font-size: 0.78rem; color: #8a7060; margin-top: 4px; }
.ob-coords a { color: #c8793a; }
.ob-hier { font-size: 0.85rem; color: #5a4a3a; margin: 6px 0; }
.ob-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; margin: 4px 0; }
.ob-table th { text-align: left; padding: 4px 8px; background: #f0ebe3; color: #8a7060; font-weight: 600; border-bottom: 1px solid #ddd4c5; }
.ob-table td { padding: 4px 8px; border-bottom: 1px solid #f0ebe3; }
.ob-surns { display: flex; flex-wrap: wrap; gap: 5px; margin: 4px 0; }
.ob-surn-chip { background: #f0ebe3; border: 1px solid #ddd4c5; border-radius: 10px; padding: 2px 9px; font-size: 0.8rem; }
.ob-surn-chip em { font-style: normal; color: #8a7060; margin-left: 3px; }
@media print {
  @page { size: A4 portrait; margin: 2cm; }
  .ob-place { page-break-inside: avoid; }
  .ob-toc-wrap { break-after: page; }
}
@media (max-width: 600px) { .ob-toc { columns: 2; } .ob-tile { width: 180px; height: 180px; } }
</style>
</head>
<body>
<div class="ob-header">
  <h1>Ortsbuch ${fileLabel}</h1>
  <p>${sorted.length} Orte · erstellt am ${dateStr}</p>
</div>
<div class="ob-toc-wrap">
  <h2>Inhaltsverzeichnis</h2>
  ${toc}
</div>
<div class="ob-content">
${body}
</div>
</body>
</html>`;
}

function exportOrtsbuch() {
  const db = AppState.db;
  if (!db || !Object.keys(db.individuals || {}).length) {
    showToast('⚠ Keine Daten geladen', 'warn');
    return;
  }
  try {
    const html    = _buildOrtsbuchHtml();
    const blob    = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    const srcName = (db._sourceFile || 'Stammbaum')
      .replace(/\.[^.]+$/, '').replace(/[^\w\-äöüÄÖÜß ]/g,'').trim().replace(/ /g,'_');
    a.href     = url;
    a.download = srcName + '_Ortsbuch.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    showToast(`✓ ${a.download} heruntergeladen`);
  } catch (err) {
    console.error('exportOrtsbuch:', err);
    showToast('⚠ Ortsbuch: ' + err.message, 'error');
  }
}


// ═════════════════════════════════════════════════════════════════
//  4. QUELLENBIBLIOGRAFIE  (A2 — OUTPUT-RICHNESS)
//     Alle Quellen alphabetisch, mit Belegzählung (INDI + FAM)
// ═════════════════════════════════════════════════════════════════

// Sortier-Schlüssel: Autor-Nachname → Titel → Kurzname
function _bibSortKey(s) {
  const author = (s.author || '').trim();
  const surn   = author.includes(',') ? author.split(',')[0] : author.split(/\s+/).pop() || '';
  return (surn || s.title || s.abbr || s.id || '').toLowerCase();
}

// Zählt wie viele Personen + Familien die Quelle referenzieren
function _bibRefCounts(sid) {
  const db = AppState.db;
  const persons  = Object.values(db.individuals).filter(p => p.sourceRefs && p.sourceRefs.has(sid)).length;
  const families = Object.values(db.families   ).filter(f => f.sourceRefs && f.sourceRefs.has(sid)).length;
  return { persons, families, total: persons + families };
}

function _buildBibliographieHtml() {
  const db   = AppState.db;
  const srcs = Object.values(db.sources || {});
  if (!srcs.length) throw new Error('Keine Quellen vorhanden');

  const dateStr   = new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
  const fileLabel = (db._sourceFile || '').replace(/\.[^.]+$/, '');

  const sorted = [...srcs].sort((a, b) =>
    _bibSortKey(a).localeCompare(_bibSortKey(b), 'de'));

  let orphanCount = 0;
  let refTotal    = 0;

  const items = sorted.map(s => {
    const rc = _bibRefCounts(s.id);
    refTotal += rc.total;
    if (rc.total === 0) orphanCount++;

    // Bibliografischer Titel: Autor. Titel. Verlag. Datum.
    const titleTxt = s.title || s.abbr || s.id;
    const head = `<span class="bib-title">${esc(titleTxt)}</span>`;
    const detailParts = [];
    if (s.author) detailParts.unshift(esc(s.author));
    if (s.publ)   detailParts.push(esc(s.publ));
    if (s.date)   detailParts.push(esc(s.date));
    const detail = detailParts.length
      ? `<span class="bib-detail"> — ${detailParts.join('. ')}</span>` : '';

    // Aufbewahrungsort
    let repoHtml = '';
    const repo = s.repo && /^@[^@]+@$/.test(s.repo) ? db.repositories?.[s.repo] : null;
    if (repo) {
      const rc0 = s.repoCalns?.[0] || (s.repoCallNum ? { num: s.repoCallNum } : null);
      const callNum = rc0?.num ? `, Sign. ${esc(rc0.num)}` : '';
      repoHtml = `<span class="bib-note bib-repo">🏛 ${esc(repo.name || s.repo)}${callNum}</span>`;
    } else if (s.repo && !/^@[^@]+@$/.test(s.repo)) {
      repoHtml = `<span class="bib-note bib-repo">🏛 ${esc(s.repo)}</span>`;
    }

    // Belege-Badge
    const refBadge = rc.total
      ? `<span class="bib-refs">${rc.persons ? rc.persons + ' Pers.' : ''}${rc.persons && rc.families ? ' · ' : ''}${rc.families ? rc.families + ' Fam.' : ''}</span>`
      : `<span class="bib-orphan">⚠ kein Beleg</span>`;

    return `<li>${head}${detail}${refBadge}${repoHtml}</li>`;
  }).join('\n');

  const summary = `<div class="bib-summary">
    <strong>${sorted.length}</strong> Quelle${sorted.length === 1 ? '' : 'n'} ·
    <strong>${refTotal}</strong> Belegverweis${refTotal === 1 ? '' : 'e'} (Personen + Familien)${
    orphanCount ? ` · <strong>${orphanCount}</strong> ohne Beleg ⚠` : ''}
  </div>`;

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Quellenverzeichnis${fileLabel ? ' — ' + esc(fileLabel) : ''}</title>
<style>${_printCss()}</style>
</head>
<body>
<h1>Quellenverzeichnis</h1>
<p class="meta">${fileLabel ? esc(fileLabel) + ' · ' : ''}erstellt am ${dateStr}</p>
${summary}
<ol class="bib-list">
${items}
</ol>
</body>
</html>`;
}

function downloadBibliographie() {
  const db = AppState.db;
  if (!db || !Object.keys(db.sources || {}).length) {
    showToast('⚠ Keine Quellen vorhanden', 'warn');
    return;
  }
  try {
    const html    = _buildBibliographieHtml();
    const blob    = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    const srcName = (db._sourceFile || 'Stammbaum')
      .replace(/\.[^.]+$/, '').replace(/[^\w\-äöüÄÖÜß ]/g,'').trim().replace(/ /g,'_');
    a.href     = url;
    a.download = srcName + '_Quellenverzeichnis.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    showToast(`✓ ${a.download} heruntergeladen`);
  } catch (err) {
    console.error('downloadBibliographie:', err);
    showToast('⚠ Quellenverzeichnis: ' + err.message, 'error');
  }
}


// ═════════════════════════════════════════════════════════════════
//  5. FORSCHUNGSPROTOKOLL  (A3 — OUTPUT-RICHNESS)
//     Alle Aufgaben (_tasks) + Protokoll-Einträge (_rlog), gruppiert
//     nach Person/Familie. Arbeitsbericht für Archivbesuche.
// ═════════════════════════════════════════════════════════════════

// Anzeige-Name einer Person (Vorname Nachname)
function _frPersonName(p) {
  if (!p) return '?';
  const n = (p.given ? `${p.given} ${p.surname || ''}`.trim() : (p.surname || p.name || '')).trim();
  return n || '(unbenannt)';
}

// Paar-Label einer Familie
function _frFamName(f) {
  const db = AppState.db;
  const h = f.husb ? _frPersonName(db.individuals[f.husb]) : '?';
  const w = f.wife ? _frPersonName(db.individuals[f.wife]) : '?';
  return `${h} ⚭ ${w}`;
}

// Tasks-Liste einer Entität
function _frTasksHtml(tasks) {
  if (!tasks || !tasks.length) return '';
  const statusCls = { todo: 'fr-todo', doing: 'fr-doing', done: 'fr-done' };
  const statusLbl = { todo: 'Offen', doing: 'In Arbeit', done: 'Erledigt' };
  const cat = key => (typeof TASK_CATEGORIES !== 'undefined'
    ? (TASK_CATEGORIES.find(c => c.key === key)?.label || key) : key);
  const items = tasks.map(t => {
    const st = (t.status === 'todo' || t.status === 'doing' || t.status === 'done')
      ? t.status : (t.done ? 'done' : 'todo');
    const catTxt = t.category ? `<span class="fr-cat">[${esc(cat(t.category))}]</span> ` : '';
    const created = t.created ? `<span class="fr-date"> · ${esc(t.created)}</span>` : '';
    return `<li><span class="fr-badge ${statusCls[st]}">${statusLbl[st]}</span>${catTxt}${esc(t.text || '')}${created}</li>`;
  }).join('\n');
  return `<div class="fr-sub">Aufgaben</div><ul class="fr-tasks">\n${items}\n</ul>`;
}

// Protokoll-Liste einer Entität
function _frLogsHtml(logs) {
  if (!logs || !logs.length) return '';
  const db = AppState.db;
  const resCls = { 'found':'fr-found', 'partial':'fr-partial', 'not-found':'fr-notfound', 'pending':'fr-pending' };
  const resLbl = { 'found':'Gefunden', 'partial':'Teilweise', 'not-found':'Nicht gefunden', 'pending':'Ausstehend' };
  const items = logs.map(rl => {
    const repo = rl.repoRef && db.repositories?.[rl.repoRef];
    const sour = rl.sourRef && db.sources?.[rl.sourRef];
    const meta = [rl.date, repo?.name, sour?.title || sour?.abbr].filter(Boolean).map(esc).join(' · ');
    const res = rl.result || 'pending';
    return `<li><span class="fr-badge ${resCls[res] || 'fr-pending'}">${resLbl[res] || esc(res)}</span>${
      meta ? `<span class="fr-date">${meta}</span>` : ''}${
      rl.query ? ` <span class="fr-query">${esc(rl.query)}</span>` : ''}${
      rl.note ? `<span class="fr-lognote">${esc(rl.note)}</span>` : ''}</li>`;
  }).join('\n');
  return `<div class="fr-sub">Protokoll</div><ul class="fr-logs">\n${items}\n</ul>`;
}

function _buildForschungHtml() {
  const db = AppState.db;
  const dateStr   = new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
  const fileLabel = (db._sourceFile || '').replace(/\.[^.]+$/, '');

  // Entitäten mit Aufgaben oder Protokoll sammeln
  const entities = [];
  Object.entries(db.individuals || {}).forEach(([id, p]) => {
    const tasks = p._tasks || [], logs = p._rlog || [];
    if (tasks.length || logs.length)
      entities.push({ id, name: _frPersonName(p), life: _poLifeYears(p), tasks, logs, kind: 'p' });
  });
  Object.entries(db.families || {}).forEach(([id, f]) => {
    const tasks = f._tasks || [], logs = f._rlog || [];
    if (tasks.length || logs.length)
      entities.push({ id, name: _frFamName(f), life: '', tasks, logs, kind: 'f' });
  });
  if (!entities.length) throw new Error('Keine Aufgaben oder Protokoll-Einträge vorhanden');

  entities.sort((a, b) => a.name.localeCompare(b.name, 'de'));

  // Summen
  let open = 0, doing = 0, done = 0, logCount = 0;
  entities.forEach(e => {
    e.tasks.forEach(t => {
      const st = (t.status === 'todo' || t.status === 'doing' || t.status === 'done')
        ? t.status : (t.done ? 'done' : 'todo');
      if (st === 'done') done++; else if (st === 'doing') doing++; else open++;
    });
    logCount += e.logs.length;
  });

  const summary = `<div class="bib-summary">
    <strong>${open}</strong> offen · <strong>${doing}</strong> in Arbeit · <strong>${done}</strong> erledigt ·
    <strong>${logCount}</strong> Protokoll-Eintr${logCount === 1 ? 'ag' : 'äge'} ·
    <strong>${entities.length}</strong> betroffene Personen/Familien
  </div>`;

  const body = entities.map(e => `<div class="fr-entity">
    <h2>${esc(e.name)}${e.life ? ` <span class="fr-life">${esc(e.life)}</span>` : ''}</h2>
    ${_frTasksHtml(e.tasks)}
    ${_frLogsHtml(e.logs)}
  </div>`).join('\n');

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Forschungsprotokoll${fileLabel ? ' — ' + esc(fileLabel) : ''}</title>
<style>${_printCss()}</style>
</head>
<body>
<h1>Forschungsprotokoll</h1>
<p class="meta">${fileLabel ? esc(fileLabel) + ' · ' : ''}erstellt am ${dateStr}</p>
${summary}
${body}
</body>
</html>`;
}

function downloadForschungsProtokoll() {
  const db = AppState.db;
  if (!db || !Object.keys(db.individuals || {}).length) {
    showToast('⚠ Keine Daten geladen', 'warn');
    return;
  }
  try {
    const html    = _buildForschungHtml();
    const blob    = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    const srcName = (db._sourceFile || 'Stammbaum')
      .replace(/\.[^.]+$/, '').replace(/[^\w\-äöüÄÖÜß ]/g,'').trim().replace(/ /g,'_');
    a.href     = url;
    a.download = srcName + '_Forschungsprotokoll.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    showToast(`✓ ${a.download} heruntergeladen`);
  } catch (err) {
    console.error('downloadForschungsProtokoll:', err);
    showToast('⚠ Forschungsprotokoll: ' + err.message, 'error');
  }
}


// ═════════════════════════════════════════════════════════════════
//  6. STATISTIK-REPORT  (A4 — OUTPUT-RICHNESS)
//     Demografische Kennzahlen als druckbares Standalone-HTML.
//     Nutzt globale Helfer _yearFrom, _statsTop, compactPlace.
// ═════════════════════════════════════════════════════════════════

// Top-N-Häufigkeitsmap als Tabelle mit Balken
function _stTopTable(entries, total, headLabel) {
  if (!entries.length) return '';
  const max = entries[0][1] || 1;
  const rows = entries.map(([lbl, cnt], i) => {
    const pct = total ? Math.round(cnt / total * 100) : 0;
    const w   = Math.round(cnt / max * 100);
    return `<tr>
      <td class="num">${i + 1}.</td>
      <td>${esc(lbl)}</td>
      <td class="barcell"><div class="st-bar" style="width:${w}%"></div></td>
      <td class="num">${cnt}${total ? ` <span class="nd">(${pct}%)</span>` : ''}</td>
    </tr>`;
  }).join('\n');
  return `<table class="st"><thead><tr>
    <th style="width:34px">#</th><th>${esc(headLabel)}</th><th>Verteilung</th><th style="width:90px">Anzahl</th>
  </tr></thead><tbody>${rows}</tbody></table>`;
}

function _buildStatistikHtml() {
  const db       = AppState.db;
  const persons  = Object.values(db.individuals || {});
  const families = Object.values(db.families   || {});
  const sources  = Object.values(db.sources    || {});
  const repos    = Object.values(db.repositories || {});
  const n = persons.length;
  if (!n) throw new Error('Keine Personen vorhanden');

  const dateStr   = new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
  const fileLabel = (db._sourceFile || '').replace(/\.[^.]+$/, '');

  // Basiswerte
  const nM = persons.filter(p => p.sex === 'M').length;
  const nF = persons.filter(p => p.sex === 'F').length;
  const nU = n - nM - nF;
  const mediaSet = new Set();
  persons.forEach(p => (p.media || []).forEach(m => m.file && mediaSet.add(m.file)));
  families.forEach(f => (f.marr?.media || []).forEach(m => m.file && mediaSet.add(m.file)));
  sources.forEach(s => (s.media || []).forEach(m => m.file && mediaSet.add(m.file)));
  let nPlaces = 0;
  try {
    const placesMap = (typeof collectPlaces === 'function') ? collectPlaces() : new Map();
    nPlaces = placesMap instanceof Map ? placesMap.size : (placesMap.length || 0);
  } catch (e) { nPlaces = 0; }

  // Vollständigkeit
  const hasBirth = persons.filter(p => p.birth?.date || p.birth?.place).length;
  const hasDeath = persons.filter(p => p.death?.date || p.death?.place).length;
  const hasSrc = persons.filter(p =>
    (p.topSources?.length || 0) + (p.nameSources?.length || 0) +
    (p.birth?.citations?.length || 0) + (p.death?.citations?.length || 0) +
    (p.events?.some(ev => ev.citations?.length > 0) ? 1 : 0) > 0).length;
  const hasPhoto = persons.filter(p => (p.media || []).some(m => /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(m.file || ''))).length;

  // Häufigkeitsmaps
  // Orte über canonicalPlaceLabel aggregieren → historische Namensvarianten
  // desselben Ortes werden als ein Ort gezählt.
  const _cpl = (typeof canonicalPlaceLabel === 'function')
    ? canonicalPlaceLabel : (pl => compactPlace(pl));
  const surnMap = {}, givenMap = {}, bplMap = {}, dplMap = {};
  persons.forEach(p => {
    if (p.surname) surnMap[p.surname] = (surnMap[p.surname] || 0) + 1;
    const g = (p.given || '').trim().split(/\s+/)[0].replace(/[,;.]+$/, ''); if (g) givenMap[g] = (givenMap[g] || 0) + 1;
    const bp = _cpl(p.birth?.place, p.birth?.placeId); if (bp) bplMap[bp] = (bplMap[bp] || 0) + 1;
    const dp = _cpl(p.death?.place, p.death?.placeId); if (dp) dplMap[dp] = (dplMap[dp] || 0) + 1;
  });

  // Lebensspannen
  const lifespans = [];
  persons.forEach(p => {
    const by = _yearFrom(p.birth?.date || p.chr?.date);
    const dy = _yearFrom(p.death?.date || p.buri?.date);
    if (by && dy && dy > by && (dy - by) < 120) lifespans.push(dy - by);
  });
  lifespans.sort((a, b) => a - b);

  // Heiratsalter
  const marrM = [], marrF = [];
  families.forEach(f => {
    const my = _yearFrom(f.marr?.date); if (!my) return;
    const husb = f.husb ? db.individuals[f.husb] : null;
    const wife = f.wife ? db.individuals[f.wife] : null;
    const hby = husb ? _yearFrom(husb.birth?.date || husb.chr?.date) : null;
    const wby = wife ? _yearFrom(wife.birth?.date || wife.chr?.date) : null;
    if (hby && my - hby >= 10 && my - hby <= 80) marrM.push(my - hby);
    if (wby && my - wby >= 10 && my - wby <= 80) marrF.push(my - wby);
  });

  // Kinderzahl
  const childCountMap = {};
  families.forEach(f => {
    const c = (f.children || []).length;
    childCountMap[c >= 10 ? '10+' : String(c)] = (childCountMap[c >= 10 ? '10+' : String(c)] || 0) + 1;
  });
  const childEntries = Object.entries(childCountMap).sort((a, b) =>
    (a[0] === '10+' ? 10 : +a[0]) - (b[0] === '10+' ? 10 : +b[0]));

  // Ereignisse pro Jahrzehnt
  const decBirth = {}, decDeath = {}, decMarr = {};
  persons.forEach(p => { const y = _yearFrom(p.birth?.date || p.chr?.date); if (y) { const d = Math.floor(y / 10) * 10; decBirth[d] = (decBirth[d] || 0) + 1; } });
  persons.forEach(p => { const y = _yearFrom(p.death?.date); if (y) { const d = Math.floor(y / 10) * 10; decDeath[d] = (decDeath[d] || 0) + 1; } });
  families.forEach(f => { const y = _yearFrom(f.marr?.date); if (y) { const d = Math.floor(y / 10) * 10; decMarr[d] = (decMarr[d] || 0) + 1; } });
  const decKeys = [...new Set([...Object.keys(decBirth), ...Object.keys(decDeath), ...Object.keys(decMarr)])].map(Number).sort((a, b) => a - b);

  const avg = arr => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : null;

  // ── Render-Sektionen ──
  let html = '';

  // Übersicht-Kacheln
  html += `<h2>Übersicht</h2><div class="st-tiles">
    ${[[n,'Personen'],[families.length,'Familien'],[sources.length,'Quellen'],[nPlaces,'Orte'],[repos.length,'Archive'],[mediaSet.size,'Medien']]
      .map(([num,lbl]) => `<div class="st-tile"><div class="st-tile-num">${num.toLocaleString('de-DE')}</div><div class="st-tile-lbl">${lbl}</div></div>`).join('')}
  </div>`;

  // Geschlecht + Vollständigkeit
  const pct = (k) => n ? Math.round(k / n * 100) : 0;
  html += `<h2>Geschlecht &amp; Datenvollständigkeit</h2><div class="st-section-sub"><table class="st"><tbody>
    <tr><td>♂ Männlich</td><td class="barcell"><div class="st-bar" style="width:${pct(nM)}%"></div></td><td class="num">${nM} (${pct(nM)}%)</td></tr>
    <tr><td>♀ Weiblich</td><td class="barcell"><div class="st-bar" style="width:${pct(nF)}%"></div></td><td class="num">${nF} (${pct(nF)}%)</td></tr>
    <tr><td>◇ Unbekannt</td><td class="barcell"><div class="st-bar" style="width:${pct(nU)}%"></div></td><td class="num">${nU} (${pct(nU)}%)</td></tr>
    <tr><td>Geburtsdatum/-ort</td><td class="barcell"><div class="st-bar" style="width:${pct(hasBirth)}%"></div></td><td class="num">${hasBirth} (${pct(hasBirth)}%)</td></tr>
    <tr><td>Sterbedatum/-ort</td><td class="barcell"><div class="st-bar" style="width:${pct(hasDeath)}%"></div></td><td class="num">${hasDeath} (${pct(hasDeath)}%)</td></tr>
    <tr><td>Mind. 1 Quelle</td><td class="barcell"><div class="st-bar" style="width:${pct(hasSrc)}%"></div></td><td class="num">${hasSrc} (${pct(hasSrc)}%)</td></tr>
    <tr><td>Foto vorhanden</td><td class="barcell"><div class="st-bar" style="width:${pct(hasPhoto)}%"></div></td><td class="num">${hasPhoto} (${pct(hasPhoto)}%)</td></tr>
  </tbody></table></div>`;

  // Lebensspannen / Heiratsalter Kennzahlen
  const lsAvg = avg(lifespans);
  if (lsAvg != null || marrM.length || marrF.length) {
    const lsMed = lifespans.length ? lifespans[Math.floor(lifespans.length / 2)] : null;
    html += `<h2>Lebens- &amp; Heiratsalter</h2><div class="st-section-sub"><table class="st"><tbody>
      ${lsAvg != null ? `<tr><td>Ø Lebensspanne (${lifespans.length} Pers.)</td><td class="num">${lsAvg} Jahre</td></tr>
        <tr><td>Median Lebensspanne</td><td class="num">${lsMed} Jahre</td></tr>
        <tr><td>Min / Max Lebensspanne</td><td class="num">${lifespans[0]} / ${lifespans[lifespans.length-1]} Jahre</td></tr>` : ''}
      ${marrM.length ? `<tr><td>Ø Heiratsalter Mann (${marrM.length})</td><td class="num">${avg(marrM)} Jahre</td></tr>` : ''}
      ${marrF.length ? `<tr><td>Ø Heiratsalter Frau (${marrF.length})</td><td class="num">${avg(marrF)} Jahre</td></tr>` : ''}
    </tbody></table></div>`;
  }

  // Kinderzahl
  if (childEntries.length >= 2) {
    html += `<h2>Kinderzahl pro Familie</h2><div class="st-section-sub">${
      _stTopTable(childEntries, families.length, 'Kinder')}</div>`;
  }

  // Ereignisse pro Jahrzehnt
  if (decKeys.length >= 3) {
    const decMax = Math.max(...decKeys.map(d => Math.max(decBirth[d]||0, decDeath[d]||0, decMarr[d]||0)));
    const rows = decKeys.map(d => {
      const b = decBirth[d]||0, dt = decDeath[d]||0, m = decMarr[d]||0;
      return `<tr><td class="num">${d}er</td>
        <td class="num">${b}</td><td class="num">${dt}</td><td class="num">${m}</td>
        <td class="barcell"><div class="st-bar" style="width:${Math.round((b+dt+m)/(decMax*3||1)*100)}%"></div></td></tr>`;
    }).join('\n');
    html += `<h2>Ereignisse pro Jahrzehnt</h2><div class="st-section-sub"><table class="st"><thead><tr>
      <th>Jahrzehnt</th><th style="width:70px">Geburten</th><th style="width:70px">Sterbef.</th><th style="width:70px">Heiraten</th><th>Summe</th>
    </tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  // Top-Listen
  html += `<h2>Häufigste Nachnamen</h2><div class="st-section-sub">${_stTopTable(_statsTop(surnMap, 15), n, 'Nachname')}</div>`;
  html += `<h2>Häufigste Vornamen</h2><div class="st-section-sub">${_stTopTable(_statsTop(givenMap, 15), n, 'Vorname')}</div>`;
  if (Object.keys(bplMap).length) html += `<h2>Häufigste Geburtsorte</h2><div class="st-section-sub">${_stTopTable(_statsTop(bplMap, 12), null, 'Ort')}</div>`;
  if (Object.keys(dplMap).length) html += `<h2>Häufigste Sterbeorte</h2><div class="st-section-sub">${_stTopTable(_statsTop(dplMap, 12), null, 'Ort')}</div>`;

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Statistik${fileLabel ? ' — ' + esc(fileLabel) : ''}</title>
<style>${_printCss()}</style>
</head>
<body>
<h1>Statistik-Report</h1>
<p class="meta">${fileLabel ? esc(fileLabel) + ' · ' : ''}${n.toLocaleString('de-DE')} Personen · erstellt am ${dateStr}</p>
${html}
</body>
</html>`;
}

function downloadStatistik() {
  const db = AppState.db;
  if (!db || !Object.keys(db.individuals || {}).length) {
    showToast('⚠ Keine Daten geladen', 'warn');
    return;
  }
  try {
    const html    = _buildStatistikHtml();
    const blob    = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    const srcName = (db._sourceFile || 'Stammbaum')
      .replace(/\.[^.]+$/, '').replace(/[^\w\-äöüÄÖÜß ]/g,'').trim().replace(/ /g,'_');
    a.href     = url;
    a.download = srcName + '_Statistik.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    showToast(`✓ ${a.download} heruntergeladen`);
  } catch (err) {
    console.error('downloadStatistik:', err);
    showToast('⚠ Statistik: ' + err.message, 'error');
  }
}


// ═════════════════════════════════════════════════════════════════
//  7. NACHKOMMENTAFEL-REPORT  (B1 — OUTPUT-RICHNESS)
//     Nummerierter Descendant-Bericht (d'Aboville: 1, 1.1, 1.1.2 …).
//     Gegenpart zur Ahnenliste (zeigt nur Vorfahren).
// ═════════════════════════════════════════════════════════════════

// Kompakte Biografie-Zeile: geboren … gestorben …
function _nkBio(p) {
  const parts = [];
  const birth = _poEvLine(p.birth) || _poEvLine(p.chr);
  const death = _poEvLine(p.death) || _poEvLine(p.buri);
  if (birth) parts.push('* ' + esc(birth));
  if (death) parts.push('† ' + esc(death));
  return parts.join(', ');
}

function _buildNachkommenHtml(rootId) {
  const db   = AppState.db;
  const root = db.individuals[rootId];
  if (!root) throw new Error('Person nicht gefunden: ' + rootId);

  const dateStr = new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
  const rootName = root.given ? `${root.given} ${root.surname || ''}`.trim() : (root.surname || root.name || '');

  const entries = [];
  const visited = new Set();
  let genMax = 1, total = 0;

  (function walk(pid, num, gen) {
    const p = db.individuals[pid];
    if (!p) return;
    if (visited.has(pid)) { entries.push({ num, p, gen, dup: true }); return; }
    visited.add(pid);
    total++;
    if (gen > genMax) genMax = gen;

    const fams = (p.fams || []).map(fid => db.families[fid]).filter(Boolean);
    entries.push({ num, p, gen, fams });

    let ci = 0;
    fams.forEach(fam => {
      (fam.children || []).forEach(cid => {
        ci++;
        walk(cid, num + '.' + ci, gen + 1);
      });
    });
  })(rootId, '1', 1);

  // Generationsweise Gruppierung (Register-Stil): stabil nach gen sortieren,
  // d'Aboville-Reihenfolge innerhalb einer Generation bleibt durch stabile Sortierung erhalten.
  entries.sort((a, b) => a.gen - b.gen);

  // Römische Generationszahl
  const roman = (g) => ['', 'I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'][g] || g;

  let lastGen = 0;
  const body = entries.map(e => {
    let head = '';
    if (e.gen !== lastGen) {
      head = `<div class="nk-gen-head">${roman(e.gen)}. Generation</div>`;
      lastGen = e.gen;
    }
    const p = e.p;
    const name = p.given ? `${p.given} ${p.surname || ''}`.trim() : (p.surname || p.name || '(unbenannt)');
    const indent = ` style="margin-left:${Math.min((e.gen - 1) * 1.2, 12)}em"`;

    if (e.dup) {
      return `${head}<div class="nk-entry"${indent}><span class="nk-num">${e.num}</span><span class="nk-name">${esc(name)}</span> <span class="nk-dup">(bereits aufgeführt)</span></div>`;
    }

    const life = _poLifeYears(p);
    const bio  = _nkBio(p);

    // Ehen + Kinder-Verweise. Partner = der andere von husb/wife (per Objekt-Identität).
    let spouseHtml = '';
    let childRefs = [];
    (e.fams || []).forEach(fam => {
      const otherId = (fam.husb && db.individuals[fam.husb] === p) ? fam.wife : fam.husb;
      const spouse  = otherId ? db.individuals[otherId] : null;
      const spouseName = spouse
        ? (spouse.given ? `${spouse.given} ${spouse.surname || ''}`.trim() : (spouse.surname || spouse.name || 'unbekannt'))
        : 'unbekannte Person';
      const marrLine = [fam.marr?.date, compactPlace(fam.marr?.place)].filter(Boolean).join(', ');
      spouseHtml += `<span class="nk-spouse"><span class="nk-spouse-mark">&#x26AD;</span> ${esc(spouseName)} ${esc(_poLifeYears(spouse))}${marrLine ? ` — Heirat ${esc(marrLine)}` : ''}</span>`;
    });
    // Kinder-Nummern (kontinuierlich über alle Ehen)
    const kidCount = (e.fams || []).reduce((s, fam) => s + (fam.children || []).length, 0);
    if (kidCount) {
      const nums = [];
      for (let i = 1; i <= kidCount; i++) nums.push(e.num + '.' + i);
      childRefs.push(`<span class="nk-children">${kidCount} Kind${kidCount === 1 ? '' : 'er'}: Nr. ${nums.join(', ')}</span>`);
    }

    return `${head}<div class="nk-entry"${indent}>
      <span class="nk-num">${e.num}</span><span class="nk-name">${esc(name)}</span>${life ? ` <span class="nk-life">${esc(life)}</span>` : ''}${bio ? ` — <span class="nk-bio">${bio}</span>` : ''}
      ${spouseHtml}${childRefs.join('')}
    </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nachkommen von ${esc(rootName)}</title>
<style>${_printCss()}</style>
</head>
<body>
<h1>Nachkommentafel</h1>
<p class="ahnen-title">Nachkommen von ${esc(rootName)} ${esc(_poLifeYears(root))}</p>
<p class="meta">${Math.max(total - 1, 0).toLocaleString('de-DE')} Nachkommen · ${genMax} Generationen · erstellt am ${dateStr}</p>
<p class="meta">Nummerierung nach d'Aboville: Die Ziffern geben den Abstammungspfad an (1 = Proband, 1.1 = erstes Kind, 1.1.2 = zweites Enkelkind dieser Linie).</p>
${body}
</body>
</html>`;
}

function downloadNachkommentafel() {
  const db = AppState.db;
  if (!db || !Object.keys(db.individuals || {}).length) {
    showToast('⚠ Keine Daten geladen', 'warn');
    return;
  }
  const rootId = AppState.currentPersonId
    || AppState._probandId
    || Object.keys(db.individuals).sort((a, b) =>
         a.localeCompare(b, undefined, { numeric: true }))[0];
  try {
    const html    = _buildNachkommenHtml(rootId);
    const blob    = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    const root    = db.individuals[rootId];
    const safeName = (root?.name || (root?.given ? `${root.given} ${root.surname || ''}` : '') || 'Nachkommen')
      .replace(/[^\w\-äöüÄÖÜß ]/g, '').trim().replace(/ /g, '_');
    a.href     = url;
    a.download = safeName + '_Nachkommen.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    showToast(`✓ ${a.download} heruntergeladen`);
  } catch (err) {
    console.error('downloadNachkommentafel:', err);
    showToast('⚠ Nachkommentafel: ' + err.message, 'error');
  }
}


// ═════════════════════════════════════════════════════════════════
//  8. VERWANDTSCHAFTS-ZERTIFIKAT  (B4 — OUTPUT-RICHNESS)
//     Druckbarer Nachweis wie Person A und B verwandt sind.
//     Nutzt calcRelationship (ui-views-person.js).
// ═════════════════════════════════════════════════════════════════

function _rcName(p, id) {
  if (!p) return id || '?';
  return p.given ? `${p.given} ${p.surname || ''}`.trim() : (p.surname || p.name || id || '?');
}

function _buildRelCertHtml(idA, idB) {
  const db = AppState.db;
  const pA = db.individuals[idA];
  const pB = db.individuals[idB];
  if (!pA || !pB) throw new Error('Person nicht gefunden');
  if (typeof calcRelationship !== 'function') throw new Error('Verwandtschaftsrechner nicht geladen');

  const rel = calcRelationship(idA, idB);
  const dateStr = new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });

  const nameA = _rcName(pA, idA), nameB = _rcName(pB, idB);
  const verdict = rel?.label || 'Nicht verwandt';

  let common = '';
  if (rel?.commonId && db.individuals[rel.commonId]) {
    const c = db.individuals[rel.commonId];
    const cy = (c.birth?.date || '').match(/\d{4}/)?.[0];
    common = `Gemeinsamer Vorfahre: ${esc(_rcName(c, rel.commonId))}${cy ? ' *' + cy : ''}`;
  }

  let pathHtml = '';
  if (rel?.path?.length) {
    pathHtml = `<ol class="rc-path">` + rel.path.map(pid => {
      const p = db.individuals[pid];
      const isCommon = pid === rel.commonId;
      return `<li class="${isCommon ? 'rc-common-node' : ''}"><span class="rc-pname">${esc(_rcName(p, pid))}</span> <span class="rc-pyr">${esc(_poLifeYears(p))}</span></li>`;
    }).join('\n') + `</ol>`;
  }

  const multiNote = rel?.multiPath
    ? `<div class="rc-common">Mehrere Verwandtschaftspfade möglich – der kürzeste ist dargestellt.</div>` : '';

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Verwandtschaftsnachweis — ${esc(nameA)} & ${esc(nameB)}</title>
<style>${_printCss()}</style>
</head>
<body>
<h1>Verwandtschaftsnachweis</h1>
<p class="meta">erstellt am ${dateStr}</p>
<div class="rc-frame">
  <div class="rc-persons">
    <span class="rc-person">${esc(nameA)}<span class="rc-life">${esc(_poLifeYears(pA))}</span></span>
    <span class="rc-amp">&#x26AD;&#xFE0E;</span>
    <span class="rc-person">${esc(nameB)}<span class="rc-life">${esc(_poLifeYears(pB))}</span></span>
  </div>
  <div class="rc-verdict">${esc(verdict)}</div>
  ${common ? `<div class="rc-common">${common}</div>` : ''}
  ${multiNote}
  ${pathHtml ? `<div class="st-section-sub">${pathHtml}</div>` : ''}
  <div class="rc-foot">Verwandtschaftspfad mit ⬡ am gemeinsamen Vorfahren · automatisch berechnet</div>
</div>
</body>
</html>`;
}

function downloadRelCertificate(idA, idB) {
  const db = AppState.db;
  if (!db?.individuals?.[idA] || !db?.individuals?.[idB]) {
    showToast('⚠ Personen nicht gefunden', 'warn');
    return;
  }
  try {
    const html    = _buildRelCertHtml(idA, idB);
    const blob    = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    const slug    = (s) => (s || '').replace(/[^\w\-äöüÄÖÜß ]/g, '').trim().replace(/ /g, '_').slice(0, 30);
    a.href     = url;
    a.download = `Verwandtschaft_${slug(_rcName(db.individuals[idA], idA))}_${slug(_rcName(db.individuals[idB], idB))}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    showToast(`✓ ${a.download} heruntergeladen`);
  } catch (err) {
    console.error('downloadRelCertificate:', err);
    showToast('⚠ Zertifikat: ' + err.message, 'error');
  }
}


// ═════════════════════════════════════════════════════════════════
//  9. STAMMTAFEL WALL CHART  (C1 — OUTPUT-RICHNESS)
//     Vorfahren + Nachkommen kombiniert (Sanduhr) als eigenständiges
//     SVG, direkt aus der DB berechnet (unabhängig vom Live-Baum).
//     Druckbar (A4 quer) + per ⬡ als A1-Vektor verfügbar.
// ═════════════════════════════════════════════════════════════════

function _wcName(p) {
  if (!p) return '?';
  return (p.given ? `${p.given} ${p.surname || ''}`.trim() : (p.surname || p.name || '')) || '?';
}
function _wcYears(p) {
  const b = (p?.birth?.date || p?.chr?.date || '').match(/\d{4}/)?.[0] || '';
  const d = (p?.death?.date || p?.buri?.date || '').match(/\d{4}/)?.[0] || '';
  if (!b && !d) return '';
  return `${b ? '*' + b : ''}${b && d ? ' ' : ''}${d ? '†' + d : ''}`;
}

function _buildWallChartHtml(rootId, upGen, downGen) {
  const db = AppState.db;
  const root = db.individuals[rootId];
  if (!root) throw new Error('Person nicht gefunden: ' + rootId);
  upGen   = upGen   || 4;
  downGen = downGen || 4;

  const BOX_W = 128, BOX_H = 38, COL = BOX_W + 16, ROW = BOX_H + 40;
  const nodes = []; // {id,p,x,y,sex}
  const links = []; // {x1,y1,x2,y2}

  // ── Vorfahren (Pedigree, Kekulé) ──
  // gen 1..upGen oberhalb des Probanden; Position rekursiv: Kind = Mittelwert der Eltern.
  const ancPos = {}; // kekule -> {x,y,id}
  // Kekulé-Map aufbauen
  const kek = {}; // kekule -> id
  (function walkUp(id, k, g) {
    if (!id || !db.individuals[id] || g > upGen) return;
    kek[k] = id;
    const famcId = db.individuals[id].famc?.[0]?.famId;
    const fam = famcId ? db.families[famcId] : null;
    if (fam) {
      if (fam.husb) walkUp(fam.husb, 2 * k, g + 1);
      if (fam.wife) walkUp(fam.wife, 2 * k + 1, g + 1);
    }
  })(rootId, 1, 0);

  // Top-Generation horizontal verteilen, dann nach unten mitteln
  const rootX = 0; // vorläufig; wird später normalisiert
  const topCount = Math.pow(2, upGen);
  // x je Kekulé bestimmen: oberste Gen gleichmäßig, sonst Mittel der (vorhandenen) Eltern
  for (let g = upGen; g >= 1; g--) {
    const base = Math.pow(2, g);
    for (let i = 0; i < base; i++) {
      const k = base + i;
      if (!kek[k]) continue;
      let x;
      if (g === upGen) {
        x = (i - (base - 1) / 2) * COL;
      } else {
        const cx = [];
        if (ancPos[2 * k]) cx.push(ancPos[2 * k].x);
        if (ancPos[2 * k + 1]) cx.push(ancPos[2 * k + 1].x);
        x = cx.length ? cx.reduce((s, v) => s + v, 0) / cx.length
                      : (i - (base - 1) / 2) * COL * (topCount / base);
      }
      ancPos[k] = { x, y: -(g) * ROW, id: kek[k] };
    }
  }

  // ── Nachkommen (rekursiv, Blatt-basiert) ──
  let leafX = 0;
  const visited = new Set([rootId]);
  function layoutDown(id, depth) {
    const p = db.individuals[id];
    let kids = [];
    if (depth < downGen) {
      (p.fams || []).forEach(fid => {
        const fam = db.families[fid];
        (fam?.children || []).forEach(cid => {
          if (db.individuals[cid] && !visited.has(cid)) { visited.add(cid); kids.push(cid); }
        });
      });
    }
    let x;
    if (!kids.length) { x = leafX * COL; leafX++; }
    else {
      const cxs = kids.map(cid => layoutDown(cid, depth + 1));
      x = (cxs[0] + cxs[cxs.length - 1]) / 2;
    }
    if (depth > 0) {
      nodes.push({ id, p, x, y: depth * ROW, sex: p.sex });
    }
    return x;
  }
  const descRootX = layoutDown(rootId, 0);

  // ── Vorfahren-Block auf descRootX zentrieren ──
  const probX = descRootX;
  const ancShift = probX - (ancPos[1] ? ancPos[1].x : 0); // ancPos[1] existiert nicht (wir starten bei k>=2); stattdessen Mittel der Eltern
  // Proband-x in Vorfahren-Koordinaten = Mittel von Vater/Mutter (k=2,3) falls vorhanden
  let ancRootX = 0;
  { const cx = []; if (ancPos[2]) cx.push(ancPos[2].x); if (ancPos[3]) cx.push(ancPos[3].x); ancRootX = cx.length ? cx.reduce((s,v)=>s+v,0)/cx.length : 0; }
  const shift = probX - ancRootX;
  Object.values(ancPos).forEach(a => { nodes.push({ id: a.id, p: db.individuals[a.id], x: a.x + shift, y: a.y, sex: db.individuals[a.id].sex }); });

  // Proband-Knoten
  nodes.push({ id: rootId, p: root, x: probX, y: 0, sex: root.sex, isRoot: true });

  // ── Verbindungslinien ──
  // Vorfahren: Kind → Eltern
  for (let k = 1; k <= Math.pow(2, upGen) * 2; k++) {
    if (!kek[k] && k !== 1) continue;
    const childPos = (k === 1) ? { x: probX, y: 0 } : (ancPos[k] ? { x: ancPos[k].x + shift, y: ancPos[k].y } : null);
    if (!childPos) continue;
    [2 * k, 2 * k + 1].forEach(pk => {
      if (ancPos[pk]) links.push({ x1: childPos.x, y1: childPos.y, x2: ancPos[pk].x + shift, y2: ancPos[pk].y });
    });
  }
  // Nachkommen: Eltern → Kind
  (function linkDown(id, depth, px) {
    const p = db.individuals[id];
    if (depth >= downGen) return;
    (p.fams || []).forEach(fid => {
      const fam = db.families[fid];
      (fam?.children || []).forEach(cid => {
        const child = nodes.find(n => n.id === cid && n.y === (depth + 1) * ROW);
        if (child) { links.push({ x1: px, y1: depth * ROW, x2: child.x, y2: child.y }); linkDown(cid, depth + 1, child.x); }
      });
    });
  })(rootId, 0, probX);

  // ── Normalisieren auf positive Koordinaten ──
  const PAD = 30;
  const xs = nodes.map(n => n.x);
  const ys = nodes.map(n => n.y);
  const minX = Math.min(...xs) - BOX_W / 2, maxX = Math.max(...xs) + BOX_W / 2;
  const minY = Math.min(...ys) - BOX_H / 2, maxY = Math.max(...ys) + BOX_H / 2;
  const W = (maxX - minX) + 2 * PAD, H = (maxY - minY) + 2 * PAD;
  const nx = x => x - minX + PAD, ny = y => y - minY + PAD;

  const COLS = { M: '#bcd2ea', F: '#ecc6d4', U: '#e6ddc8' };
  const STK  = { M: '#5a7aa5', F: '#a8617e', U: '#b0a070' };

  let svgParts = [];
  links.forEach(l => {
    const x1 = nx(l.x1), y1 = ny(l.y1), x2 = nx(l.x2), y2 = ny(l.y2);
    const my = (y1 + y2) / 2;
    svgParts.push(`<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} V${my.toFixed(1)} H${x2.toFixed(1)} V${y2.toFixed(1)}" fill="none" stroke="#b8a578" stroke-width="1"/>`);
  });
  nodes.forEach(n => {
    const x = nx(n.x) - BOX_W / 2, y = ny(n.y) - BOX_H / 2;
    const fill = COLS[n.sex] || COLS.U, stroke = STK[n.sex] || STK.U;
    svgParts.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${BOX_W}" height="${BOX_H}" rx="5" fill="${fill}" stroke="${stroke}" stroke-width="${n.isRoot ? 2.5 : 1}"/>`);
    const cx = nx(n.x);
    const nm = _wcName(n.p), yr = _wcYears(n.p);
    svgParts.push(`<text x="${cx}" y="${(y + (yr ? 15 : 22)).toFixed(1)}" text-anchor="middle" font-family="Georgia,serif" font-size="10" font-weight="${n.isRoot ? '700' : '600'}" fill="#2a1d08">${esc(nm.length > 22 ? nm.slice(0, 21) + '…' : nm)}</text>`);
    if (yr) svgParts.push(`<text x="${cx}" y="${(y + 28).toFixed(1)}" text-anchor="middle" font-family="Georgia,serif" font-size="8.5" fill="#6a4a20">${esc(yr)}</text>`);
  });

  const dateStr = new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
  const rootName = _wcName(root);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" width="100%" style="max-width:100%;height:auto">
<rect width="${W.toFixed(0)}" height="${H.toFixed(0)}" fill="#fffdf8"/>
${svgParts.join('\n')}
</svg>`;

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Stammtafel — ${esc(rootName)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Georgia,'Times New Roman',serif;color:#1a1208;background:#fff;padding:18px}
  h1{font-size:1.6rem;margin-bottom:2px}
  .meta{font-size:0.82rem;color:#8a7050;margin-bottom:12px}
  .wc-legend{font-size:0.8rem;color:#6a4a20;margin-bottom:10px}
  .wc-legend span{display:inline-block;margin-right:14px}
  .wc-dot{display:inline-block;width:11px;height:11px;border-radius:3px;vertical-align:-1px;margin-right:4px;border:1px solid #999}
  .wc-chart{width:100%;overflow:auto}
  @media print{ @page{ size:A4 landscape; margin:1cm; } body{padding:0} }
</style>
</head>
<body>
<h1>Stammtafel</h1>
<p class="meta">${esc(rootName)} ${esc(_wcYears(root))} · ${upGen} Generationen Vorfahren + ${downGen} Generationen Nachkommen · erstellt am ${dateStr}</p>
<div class="wc-legend">
  <span><span class="wc-dot" style="background:#bcd2ea"></span>männlich</span>
  <span><span class="wc-dot" style="background:#ecc6d4"></span>weiblich</span>
  <span><span class="wc-dot" style="background:#e6ddc8"></span>unbekannt</span>
  <span>— Proband mit dicker Umrandung</span>
</div>
<div class="wc-chart">${svg}</div>
</body>
</html>`;
}

function downloadWallChart() {
  const db = AppState.db;
  if (!db || !Object.keys(db.individuals || {}).length) { showToast('⚠ Keine Daten geladen', 'warn'); return; }
  const rootId = AppState.currentPersonId || AppState._probandId
    || Object.keys(db.individuals).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))[0];
  try {
    const html = _buildWallChartHtml(rootId, 4, 4);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safe = _wcName(db.individuals[rootId]).replace(/[^\w\-äöüÄÖÜß ]/g, '').trim().replace(/ /g, '_');
    a.href = url; a.download = (safe || 'Stammtafel') + '_Stammtafel.html';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    showToast(`✓ ${a.download} heruntergeladen`);
  } catch (err) {
    console.error('downloadWallChart:', err);
    showToast('⚠ Stammtafel: ' + err.message, 'error');
  }
}


// ═════════════════════════════════════════════════════════════════
//  10. ORTSSIPPENBUCH + NARRATIVE  (C2 — OUTPUT-RICHNESS)
//     Familien nach Ort gruppiert, je Familie ein erzählender Kurztext.
// ═════════════════════════════════════════════════════════════════

function _osbFamNarrative(fam) {
  const db = AppState.db;
  const husb = fam.husb ? db.individuals[fam.husb] : null;
  const wife = fam.wife ? db.individuals[fam.wife] : null;
  const hn = husb ? `${_wcName(husb)}${_wcYears(husb) ? ' (' + _wcYears(husb) + ')' : ''}` : 'unbekannt';
  const wn = wife ? `${_wcName(wife)}${_wcYears(wife) ? ' (' + _wcYears(wife) + ')' : ''}` : 'unbekannt';
  let txt = `<strong>${esc(hn)}</strong> und <strong>${esc(wn)}</strong>`;
  const marrParts = [fam.marr?.date, compactPlace(fam.marr?.place)].filter(Boolean).join(' in ');
  txt += marrParts ? ` heirateten ${esc(marrParts)}.` : ` bildeten eine Familie.`;
  const kids = (fam.children || []).map(c => db.individuals[c]).filter(Boolean);
  if (kids.length) {
    const names = kids.map(c => {
      const yr = (c.birth?.date || c.chr?.date || '').match(/\d{4}/)?.[0];
      return esc(_wcName(c)) + (yr ? ` *${yr}` : '');
    });
    txt += ` Aus der Verbindung ${kids.length === 1 ? 'ging 1 Kind' : 'gingen ' + kids.length + ' Kinder'} hervor: ${names.join(', ')}.`;
  }
  return txt;
}

function _buildOrtssippenbuchHtml() {
  const db = AppState.db;
  const dateStr = new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
  const fileLabel = (db._sourceFile || '').replace(/\.[^.]+$/, '');

  // Familien einem Ort zuordnen: Heiratsort, sonst Geburtsort des Mannes, sonst der Frau.
  const _famPlace = (fam) => {
    const cand = [fam.marr?.place,
      fam.husb && db.individuals[fam.husb]?.birth?.place,
      fam.wife && db.individuals[fam.wife]?.birth?.place];
    for (const c of cand) { const cp = compactPlace(c); if (cp) return cp; }
    return null;
  };

  const byPlace = new Map(); // placeName -> fam[]
  for (const fam of Object.values(db.families || {})) {
    const pl = _famPlace(fam);
    if (!pl) continue;
    if (!byPlace.has(pl)) byPlace.set(pl, []);
    byPlace.get(pl).push(fam);
  }
  if (!byPlace.size) throw new Error('Keine Familien mit Ortsbezug gefunden');

  const places = [...byPlace.keys()].sort((a, b) => a.localeCompare(b, 'de'));
  const _safeId = s => s.replace(/[^a-zA-Z0-9]/g, '_');

  let toc = '<ul class="osb-toc">';
  for (const pl of places) {
    toc += `<li><a href="#osb-${_safeId(pl)}">${esc(pl)}</a> <em>${byPlace.get(pl).length}</em></li>`;
  }
  toc += '</ul>';

  let body = '';
  for (const pl of places) {
    const fams = byPlace.get(pl).slice().sort((a, b) =>
      (a.marr?.date || '').localeCompare(b.marr?.date || ''));
    body += `<section class="osb-place" id="osb-${_safeId(pl)}">
      <h2>${esc(pl)} <span class="osb-cnt">${fams.length} Familie${fams.length === 1 ? '' : 'n'}</span></h2>`;
    fams.forEach(fam => {
      body += `<p class="osb-fam">${_osbFamNarrative(fam)}</p>`;
    });
    body += `</section>`;
  }

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ortssippenbuch${fileLabel ? ' — ' + esc(fileLabel) : ''}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Georgia,'Times New Roman',serif;font-size:11pt;color:#1a1208;background:#fff;max-width:800px;margin:0 auto;padding:24px 28px}
  h1{font-size:1.8rem;margin-bottom:4px}
  .meta{font-size:0.82rem;color:#8a7050;margin-bottom:18px}
  .osb-toc{list-style:none;columns:2;gap:14px;margin-bottom:26px;font-size:0.9rem}
  .osb-toc li{padding:2px 0}
  .osb-toc a{color:#5a3e0e;text-decoration:none}
  .osb-toc em{color:#8a6420;font-style:normal;font-size:0.82rem}
  .osb-place{margin-bottom:22px;page-break-inside:avoid}
  .osb-place h2{font-size:1.15rem;color:#5a3e0e;border-bottom:1.5px solid #c0a878;padding-bottom:3px;margin-bottom:8px}
  .osb-cnt{font-size:0.78rem;font-weight:400;color:#8a7050}
  .osb-fam{font-size:10pt;line-height:1.5;margin:6px 0;padding-left:10px;border-left:2px solid #e8dfc8}
  @media print{ @page{size:A4 portrait;margin:2cm} body{max-width:100%;padding:0} }
</style>
</head>
<body>
<h1>Ortssippenbuch</h1>
<p class="meta">${fileLabel ? esc(fileLabel) + ' · ' : ''}${places.length} Orte · erstellt am ${dateStr}</p>
<div class="osb-toc-wrap"><h2 style="font-size:1.05rem;color:#5a3e0e;margin-bottom:6px">Orte</h2>${toc}</div>
${body}
</body>
</html>`;
}

function downloadOrtssippenbuch() {
  const db = AppState.db;
  if (!db || !Object.keys(db.families || {}).length) { showToast('⚠ Keine Familien geladen', 'warn'); return; }
  try {
    const html = _buildOrtssippenbuchHtml();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const srcName = (db._sourceFile || 'Stammbaum').replace(/\.[^.]+$/, '').replace(/[^\w\-äöüÄÖÜß ]/g, '').trim().replace(/ /g, '_');
    a.href = url; a.download = srcName + '_Ortssippenbuch.html';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    showToast(`✓ ${a.download} heruntergeladen`);
  } catch (err) {
    console.error('downloadOrtssippenbuch:', err);
    showToast('⚠ Ortssippenbuch: ' + err.message, 'error');
  }
}


// ═════════════════════════════════════════════════════════════════
//  11. PERIODISIERTER ZEITSTRAHL-AUSDRUCK  (C3 — OUTPUT-RICHNESS)
//     Ereignisse von Person + Familie auf horizontaler Zeitachse,
//     überlagert mit historischen Epochen (_STORY_EPOCHS).
// ═════════════════════════════════════════════════════════════════

function _buildZeitstrahlHtml(personId) {
  const db = AppState.db;
  const p = db.individuals[personId];
  if (!p) throw new Error('Person nicht gefunden: ' + personId);

  const yOf = s => { const m = (s || '').match(/\d{4}/); const y = m ? +m[0] : null; return (y > 1000 && y < 2200) ? y : null; };
  const ev = [];
  const add = (year, label, who) => { if (year != null) ev.push({ year, label, who }); };

  // Proband-Ereignisse
  add(yOf(p.birth?.date), 'Geburt', _wcName(p));
  add(yOf(p.chr?.date), 'Taufe', _wcName(p));
  add(yOf(p.death?.date), 'Tod', _wcName(p));
  add(yOf(p.buri?.date), 'Beerdigung', _wcName(p));
  (p.events || []).forEach(e => add(yOf(e.date), (typeof EVENT_LABELS !== 'undefined' ? EVENT_LABELS[e.type] : null) || e.eventType || e.type, _wcName(p)));
  // Familien: Heirat + Partner + Kinder
  (p.fams || []).forEach(fid => {
    const fam = db.families[fid]; if (!fam) return;
    const otherId = (fam.husb && db.individuals[fam.husb] === p) ? fam.wife : fam.husb;
    const sp = otherId ? db.individuals[otherId] : null;
    add(yOf(fam.marr?.date), 'Heirat', sp ? `${_wcName(p)} ⚭ ${_wcName(sp)}` : _wcName(p));
    (fam.children || []).forEach(cid => { const c = db.individuals[cid]; if (c) add(yOf(c.birth?.date || c.chr?.date), 'Geburt Kind', _wcName(c)); });
  });

  if (!ev.length) throw new Error('Keine datierten Ereignisse vorhanden');
  ev.sort((a, b) => a.year - b.year);

  const yMin = ev[0].year - 5, yMax = ev[ev.length - 1].year + 5;
  const span = Math.max(yMax - yMin, 10);
  const PLOT_W = Math.max(900, span * 6); // 6px/Jahr, min 900
  const LEFT = 20, RIGHT = 20, AXIS_Y = 90, ROW_H = 22;
  const xOf = y => LEFT + (y - yMin) / span * PLOT_W;

  // Epochen
  const epochs = (typeof _STORY_EPOCHS !== 'undefined' ? _STORY_EPOCHS : [])
    .filter(e => e.to >= yMin && e.from <= yMax);
  const EP_COLORS = ['#efe6d2', '#e4ecf2', '#f1e6e9', '#e7efe4', '#efeae0'];

  let bands = '', bandLabels = '';
  epochs.forEach((e, i) => {
    const x1 = xOf(Math.max(e.from, yMin)), x2 = xOf(Math.min(e.to, yMax));
    bands += `<rect x="${x1.toFixed(1)}" y="${AXIS_Y - 60}" width="${Math.max(x2 - x1, 1).toFixed(1)}" height="${AXIS_Y - 30 + ev.length * ROW_H}" fill="${EP_COLORS[i % EP_COLORS.length]}" opacity="0.7"/>`;
    bandLabels += `<text x="${((x1 + x2) / 2).toFixed(1)}" y="${(AXIS_Y - 66).toFixed(1)}" text-anchor="middle" font-family="Georgia,serif" font-size="9" fill="#7a5a28">${esc(e.label)}</text>`;
  });

  // Achse + Dekaden-Ticks
  const totalH = AXIS_Y + ev.length * ROW_H + 30;
  let axis = `<line x1="${LEFT}" y1="${AXIS_Y}" x2="${(LEFT + PLOT_W).toFixed(1)}" y2="${AXIS_Y}" stroke="#8a6420" stroke-width="1.5"/>`;
  const firstDec = Math.ceil(yMin / 10) * 10;
  for (let yr = firstDec; yr <= yMax; yr += 10) {
    const x = xOf(yr);
    axis += `<line x1="${x.toFixed(1)}" y1="${AXIS_Y - 4}" x2="${x.toFixed(1)}" y2="${AXIS_Y + 4}" stroke="#8a6420" stroke-width="1"/>`;
    axis += `<text x="${x.toFixed(1)}" y="${(AXIS_Y + 16).toFixed(1)}" text-anchor="middle" font-family="Georgia,serif" font-size="9" fill="#6a4a20">${yr}</text>`;
  }

  // Ereignis-Marker (gestaffelt nach unten)
  let markers = '';
  ev.forEach((e, i) => {
    const x = xOf(e.year), y = AXIS_Y + 34 + i * ROW_H;
    markers += `<line x1="${x.toFixed(1)}" y1="${AXIS_Y}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#c8b48a" stroke-width="0.8" stroke-dasharray="2 2"/>`;
    markers += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="#8a6420"/>`;
    markers += `<text x="${(x + 7).toFixed(1)}" y="${(y + 3.5).toFixed(1)}" font-family="Georgia,serif" font-size="9.5" fill="#2a1d08"><tspan font-weight="600">${e.year} ${esc(e.label)}</tspan> — ${esc(e.who)}</text>`;
  });

  const W = LEFT + PLOT_W + RIGHT, H = totalH;
  const dateStr = new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" width="100%" style="min-width:${W.toFixed(0)}px;height:auto">
<rect width="${W.toFixed(0)}" height="${H.toFixed(0)}" fill="#fffdf8"/>
${bands}${bandLabels}${axis}${markers}
</svg>`;

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Zeitstrahl — ${esc(_wcName(p))}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Georgia,'Times New Roman',serif;color:#1a1208;background:#fff;padding:18px}
  h1{font-size:1.6rem;margin-bottom:2px}
  .meta{font-size:0.82rem;color:#8a7050;margin-bottom:12px}
  .zs-wrap{width:100%;overflow-x:auto}
  @media print{ @page{size:A4 landscape;margin:1cm} body{padding:0} }
</style>
</head>
<body>
<h1>Zeitstrahl</h1>
<p class="meta">${esc(_wcName(p))} ${esc(_wcYears(p))} · ${ev.length} Ereignisse · historische Epochen hinterlegt · erstellt am ${dateStr}</p>
<div class="zs-wrap">${svg}</div>
</body>
</html>`;
}

function downloadZeitstrahl() {
  const db = AppState.db;
  if (!db || !Object.keys(db.individuals || {}).length) { showToast('⚠ Keine Daten geladen', 'warn'); return; }
  const personId = AppState.currentPersonId || AppState._probandId
    || Object.keys(db.individuals).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))[0];
  try {
    const html = _buildZeitstrahlHtml(personId);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safe = _wcName(db.individuals[personId]).replace(/[^\w\-äöüÄÖÜß ]/g, '').trim().replace(/ /g, '_');
    a.href = url; a.download = (safe || 'Zeitstrahl') + '_Zeitstrahl.html';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    showToast(`✓ ${a.download} heruntergeladen`);
  } catch (err) {
    console.error('downloadZeitstrahl:', err);
    showToast('⚠ Zeitstrahl: ' + err.message, 'error');
  }
}


// ═════════════════════════════════════════════════════════════════
//  12. HOFCHRONIK  (Hofgeschichten — Ort › Hof › Eigentümer/Bewohner)
//     Nutzt buildHofIndex (gedcom.js): propEntries=Eigentümer (PROP),
//     entries=Bewohner (RESI). Zu-/Wegzug aus der Stations-Kette.
// ═════════════════════════════════════════════════════════════════

// Chronologische Adress-/Hof-Stationen einer Person (RESI + PROP)
function _hofPersonStations(pid) {
  const p = AppState.db.individuals[pid];
  if (!p) return [];
  const st = [];
  (p.events || []).forEach(ev => {
    if ((ev.type === 'RESI' || ev.type === 'PROP') && ev.addr && ev.addr.trim()) {
      st.push({
        addr: ev.addr.trim(), place: ev.place || '', type: ev.type,
        year: (ev.date || '').match(/\d{4}/)?.[0] || '',
        key: (typeof evDateKey === 'function' ? evDateKey(ev.date || '') : (ev.date || '')),
      });
    }
  });
  st.sort((a, b) => (a.key || '').localeCompare(b.key || ''));
  return st;
}

// Zu-/Wegzug-Zeile für eine Person an einem bestimmten Hof (addr)
function _hofMoveLine(pid, addr) {
  const st = _hofPersonStations(pid);
  const at = [];
  st.forEach((s, i) => { if (s.addr === addr) at.push(i); });
  if (!at.length) return '';
  const first = at[0], last = at[at.length - 1];
  let prev = null, next = null;
  for (let i = first - 1; i >= 0; i--) { if (st[i].addr !== addr) { prev = st[i]; break; } }
  for (let i = last + 1; i < st.length; i++) { if (st[i].addr !== addr) { next = st[i]; break; } }
  // Umzüge sind oft innerhalb desselben Ortes — daher die konkrete Adresse
  // (Hof/Straße) zeigen, Ort nur ergänzend in Klammern, wenn er nicht schon
  // in der Adresszeile steckt.
  const stationLabel = s => {
    const a = (s.addr.split('\n')[0] || '').trim();
    const pl = compactPlace(s.place);
    return (pl && a && !a.toLowerCase().includes(pl.toLowerCase())) ? `${a} (${pl})` : (a || pl || '?');
  };
  const parts = [];
  if (prev) parts.push(`zugezogen von ${esc(stationLabel(prev))}${prev.year ? ` (${prev.year})` : ''}`);
  if (next) parts.push(`weiter nach ${esc(stationLabel(next))}${next.year ? ` (${next.year})` : ''}`);
  return parts.join(' · ');
}

// Kompakte Familienzeile (Partner + Kinder)
function _hofFamilyBrief(p) {
  const db = AppState.db;
  const out = [];
  (p.fams || []).map(f => db.families[f]).filter(Boolean).forEach(fam => {
    const otherId = (fam.husb && db.individuals[fam.husb] === p) ? fam.wife : fam.husb;
    const sp = otherId ? db.individuals[otherId] : null;
    const marr = [fam.marr?.date, compactPlace(fam.marr?.place)].filter(Boolean).join(', ');
    let s = sp ? `&#x26AD; ${esc(_wcName(sp))}${_wcYears(sp) ? ' ' + esc(_wcYears(sp)) : ''}` : '&#x26AD; unbekannt';
    if (marr) s += ` (${esc(marr)})`;
    const kids = (fam.children || []).map(c => db.individuals[c]).filter(Boolean);
    if (kids.length) {
      s += ` — Kinder: ` + kids.map(c => {
        const y = (c.birth?.date || c.chr?.date || '').match(/\d{4}/)?.[0];
        return esc(_wcName(c)) + (y ? ` *${y}` : '');
      }).join(', ');
    }
    out.push(s);
  });
  return out.length ? `<div class="hc-fam">${out.join('<br>')}</div>` : '';
}

// Einträge nach pid deduplizieren (Datums-Spanne zusammenfassen, Reihenfolge erhalten)
function _hofDedupByPid(entries) {
  const byPid = new Map();
  (entries || []).forEach(e => {
    if (!byPid.has(e.pid)) byPid.set(e.pid, { pid: e.pid, dates: [], desc: e.desc || '' });
    const r = byPid.get(e.pid);
    if (e.date) r.dates.push(e.date);
    if (!r.desc && e.desc) r.desc = e.desc;
  });
  return [...byPid.values()];
}

function _hofPersonBlock(row, addr, roleLabel) {
  const p = AppState.db.individuals[row.pid];
  if (!p) return '';
  const span = row.dates.length ? row.dates.join(', ') : '';
  const desc = row.desc ? ` — ${esc(row.desc)}` : '';
  const move = _hofMoveLine(row.pid, addr);
  return `<div class="hc-person">
    <div class="hc-pname"><span class="hc-role">${roleLabel}</span> <strong>${esc(_wcName(p))}</strong>${_wcYears(p) ? ` <span class="hc-yrs">${esc(_wcYears(p))}</span>` : ''}${span ? ` <span class="hc-span">${esc(span)}</span>` : ''}${desc}</div>
    ${_hofFamilyBrief(p)}
    ${move ? `<div class="hc-move">&#8618; ${move}</div>` : ''}
  </div>`;
}

function _buildHofchronikHtml() {
  const db = AppState.db;
  const idx = (typeof buildHofIndex === 'function') ? buildHofIndex() : new Map();
  if (!idx.size) throw new Error('Keine Höfe (RESI-/PROP-Adressen) gefunden');

  const dateStr = new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
  const fileLabel = (db._sourceFile || '').replace(/\.[^.]+$/, '');
  const _safeId = s => s.replace(/[^a-zA-Z0-9]/g, '_');
  const firstPart = (typeof _placeFirstPart === 'function') ? _placeFirstPart : (s => s || '');
  const sortFn = (typeof _hofSortFn === 'function') ? _hofSortFn : (() => 0);

  // Nach Ort gruppieren
  const byPlace = new Map();
  for (const hof of idx.values()) {
    const key = firstPart(hof.place) || 'Ohne Ortsangabe';
    if (!byPlace.has(key)) byPlace.set(key, []);
    byPlace.get(key).push(hof);
  }
  const places = [...byPlace.keys()].sort((a, b) =>
    a === 'Ohne Ortsangabe' ? 1 : b === 'Ohne Ortsangabe' ? -1 : a.localeCompare(b, 'de'));

  let nHoefe = 0;
  byPlace.forEach(v => nHoefe += v.length);

  // TOC
  let toc = '<ul class="hc-toc">';
  for (const pl of places) {
    toc += `<li><a href="#hc-ort-${_safeId(pl)}">${esc(pl)}</a> <em>${byPlace.get(pl).length}</em></li>`;
  }
  toc += '</ul>';

  // Body
  let body = '';
  for (const pl of places) {
    body += `<section class="hc-place" id="hc-ort-${_safeId(pl)}"><h2>${esc(pl)}</h2>`;
    const hoefe = byPlace.get(pl).slice().sort(sortFn);
    for (const hof of hoefe) {
      // ADR-027 P4: hofMeta liest V2-hofObjects via hof.hofId mit Vorrang, fällt auf
      // Legacy-Sidecar oder Farm-PO zurück. Damit zeigt die Chronik nach Phase-3-
      // Migration die V2-Koords/Note ohne weiteren Codeumbau.
      const meta = (typeof hofMeta === 'function') ? hofMeta(hof) : null;
      const addrLines = hof.addr.split('\n').map(s => s.trim()).filter(Boolean);
      const title = addrLines[0] || '(ohne Adresse)';
      let sub = addrLines.slice(1).join(' · ');
      // ADR-027 P4: Adress-Historie aus V2-hofObject anzeigen (z.B. Umnummerierungen).
      // Datierte addrs-Einträge werden als Sub-Zeilen "bis 1900: alter Name" angezeigt;
      // der aktuelle Haupteintrag steht im H3-Titel.
      if (hof.hofId && db.hofObjects?.[hof.hofId]?.addrs?.length > 1) {
        const hist = db.hofObjects[hof.hofId].addrs
          .filter(a => a.value && a.value !== title)
          .map(a => a.dateTo ? `bis ${a.dateTo}: ${a.value}`
                : a.dateFrom ? `ab ${a.dateFrom}: ${a.value}` : a.value)
          .join(' · ');
        if (hist) sub = sub ? sub + ' · ' + hist : hist;
      }
      body += `<div class="hc-hof">`;
      body += `<h3>${esc(title)}</h3>`;
      if (sub) body += `<div class="hc-hof-sub">${esc(sub)}</div>`;
      if (meta?.lat && meta?.long) body += `<div class="hc-hof-geo">📍 ${(+meta.lat).toFixed(4)}, ${(+meta.long).toFixed(4)}</div>`;
      if (meta?.note) body += `<div class="hc-hof-note">${esc(meta.note).replace(/\n/g, '<br>')}</div>`;

      const owners = _hofDedupByPid(hof.propEntries);
      const resids = _hofDedupByPid(hof.entries);
      if (owners.length) {
        body += `<div class="hc-sub">Eigentümer</div>`;
        owners.forEach(r => { body += _hofPersonBlock(r, hof.addr, 'Eigentümer'); });
      }
      if (resids.length) {
        body += `<div class="hc-sub">Bewohner</div>`;
        resids.forEach(r => { body += _hofPersonBlock(r, hof.addr, 'Bewohner'); });
      }
      if (!owners.length && !resids.length) body += `<div class="hc-empty">Keine Personen verknüpft</div>`;
      body += `</div>`;
    }
    body += `</section>`;
  }

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hofchronik${fileLabel ? ' — ' + esc(fileLabel) : ''}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Georgia,'Times New Roman',serif;font-size:11pt;color:#1a1208;background:#fff;max-width:800px;margin:0 auto;padding:24px 28px}
  h1{font-size:1.8rem;margin-bottom:4px}
  .meta{font-size:0.82rem;color:#8a7050;margin-bottom:18px}
  .hc-toc{list-style:none;columns:2;gap:14px;margin-bottom:26px;font-size:0.9rem}
  .hc-toc li{padding:2px 0}.hc-toc a{color:#5a3e0e;text-decoration:none}
  .hc-toc em{color:#8a6420;font-style:normal;font-size:0.82rem}
  .hc-place{margin-bottom:24px}
  .hc-place>h2{font-size:1.3rem;color:#5a3e0e;border-bottom:2px solid #c0a878;padding-bottom:3px;margin-bottom:10px}
  .hc-hof{margin:0 0 16px;padding:10px 14px;border:1px solid #e0d4b8;border-radius:5px;background:#fdfaf3;page-break-inside:avoid}
  .hc-hof h3{font-size:1.05rem;color:#6a4a20;margin-bottom:1px}
  .hc-hof-sub{font-size:0.85rem;color:#8a7050;margin-bottom:4px}
  .hc-hof-geo{font-size:0.8rem;color:#7a6248;margin-bottom:4px}
  .hc-hof-note{font-size:0.88rem;color:#3a2810;white-space:pre-wrap;border-left:3px solid #c0a878;padding:4px 8px;margin:4px 0 8px;background:#fff}
  .hc-sub{font-size:0.78rem;font-weight:700;color:#5a3e0e;text-transform:uppercase;letter-spacing:0.04em;margin:10px 0 4px;border-bottom:1px solid #e8dfc8;padding-bottom:2px}
  .hc-person{margin:5px 0 8px;padding-left:6px}
  .hc-pname{font-size:10pt}
  .hc-role{display:inline-block;font-size:0.7rem;font-weight:700;color:#7a5010;background:#f0e6cf;border-radius:3px;padding:0 5px;vertical-align:1px;margin-right:4px}
  .hc-yrs{color:#6a4a20;font-size:0.9rem}
  .hc-span{color:#8a7050;font-size:0.82rem}
  .hc-fam{font-size:0.9rem;color:#3a2810;margin:1px 0 0 16px}
  .hc-move{font-size:0.85rem;color:#7a5a28;margin:1px 0 0 16px;font-style:italic}
  .hc-empty{font-size:0.85rem;color:#aaa;font-style:italic}
  @media print{ @page{size:A4 portrait;margin:2cm} body{max-width:100%;padding:0} .hc-hof{page-break-inside:avoid} }
</style>
</head>
<body>
<h1>Hofchronik</h1>
<p class="meta">${fileLabel ? esc(fileLabel) + ' · ' : ''}${places.length} Orte · ${nHoefe} Höfe · erstellt am ${dateStr}</p>
<div class="hc-toc-wrap"><h2 style="font-size:1.05rem;color:#5a3e0e;margin-bottom:6px">Orte</h2>${toc}</div>
${body}
</body>
</html>`;
}

function downloadHofchronik() {
  const db = AppState.db;
  if (!db || !Object.keys(db.individuals || {}).length) { showToast('⚠ Keine Daten geladen', 'warn'); return; }
  try {
    const html = _buildHofchronikHtml();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const srcName = (db._sourceFile || 'Stammbaum').replace(/\.[^.]+$/, '').replace(/[^\w\-äöüÄÖÜß ]/g, '').trim().replace(/ /g, '_');
    a.href = url; a.download = srcName + '_Hofchronik.html';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    showToast(`✓ ${a.download} heruntergeladen`);
  } catch (err) {
    console.error('downloadHofchronik:', err);
    showToast('⚠ Hofchronik: ' + err.message, 'error');
  }
}
