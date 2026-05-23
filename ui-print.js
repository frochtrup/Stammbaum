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
  <th style="width:3em">Nr.</th>
  <th>Name</th>
  <th>* Geburt / Taufe</th>
  <th>† Tod / Beerdigung</th>
  <th style="width:3.2em">Vater</th>
  <th style="width:3.2em">Mutter</th>
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
