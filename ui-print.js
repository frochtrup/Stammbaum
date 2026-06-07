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
