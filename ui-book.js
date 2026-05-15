// ─────────────────────────────────────────────────────────────────
//  F10 — BUCHGENERATOR
//  Erstellt ein druckbares HTML-Familienbuch aus AppState.db
//  Modi: Ahnen des Probanden (Kekule) | Alle Personen (alphabetisch)
// ─────────────────────────────────────────────────────────────────

// ── Kekule-Ahnen-Index aufbauen ───────────────────────────────────
// Gibt { kekule: personId } zurück; stoppt bei unbekannten Eltern.
function _buildKekuleMap(probandId) {
  const db = AppState.db;
  const map = {};
  const queue = [[probandId, 1]];
  const seen  = new Set();
  while (queue.length) {
    const [id, k] = queue.shift();
    if (!id || seen.has(id) || !db.individuals[id]) continue;
    seen.add(id);
    map[k] = id;
    const p = db.individuals[id];
    const famcId = p.famc?.[0]?.famId;
    if (famcId && db.families[famcId]) {
      const fam = db.families[famcId];
      if (fam.husb) queue.push([fam.husb, 2 * k]);
      if (fam.wife) queue.push([fam.wife, 2 * k + 1]);
    }
  }
  return map;
}

// ── Primärfoto laden (IDB → OneDrive) ────────────────────────────
async function _primPhotoSrc(p) {
  const media = p.media || [];
  if (!media.length) return null;
  const primIdx = Math.max(0, media.findIndex(m => m.prim && m.prim !== ''));
  const filePath = media[primIdx]?.file;
  if (!filePath) return null;
  return (await _odGetMediaUrlByPath(filePath).catch(() => null))
      || (await idbGet('img:' + filePath).catch(() => null))
      || null;
}

// ── Quellenverweise sammeln (de-dupliziert) ────────────────────────
function _collectCitations(p) {
  const db = AppState.db;
  const cits = [];
  const addCit = c => {
    if (!c?.sid) return;
    const src = db.sources?.[c.sid];
    if (!src) return;
    const label = [src.title, src.author].filter(Boolean).join(', ')
               || src.abbr || c.sid;
    const page = c.page ? ` S. ${c.page}` : '';
    cits.push(esc(label + page));
  };
  [p.birth, p.chr, p.death, p.buri, ...( p.events || [])].forEach(ev => {
    (ev?.citations || []).forEach(addCit);
  });
  (p.nameSources || []).forEach(addCit);
  (p.citations    || []).forEach(addCit);
  // de-duplizieren, Reihenfolge erhalten
  return [...new Set(cits)];
}

// ── Lebensdaten-Tabelle HTML ───────────────────────────────────────
function _eventsTableHtml(p) {
  const rows = [];
  const shownNotes = new Set();

  const evLabel = ev => {
    const base = EVENT_LABELS[ev.type] || ev.type;
    if (!ev.eventType) return base;
    return (ev.type === 'EVEN' || ev.type === 'FACT') ? ev.eventType : `${base}: ${ev.eventType}`;
  };

  const addRow = (lbl, ev) => {
    if (!ev) return;
    const val = [ev.value, ev.addr, ev.date, compactPlace(ev.place)].filter(Boolean).join(', ');
    if (!val && !ev.note) return;
    const noteKey = ev.note || null;
    const showNote = noteKey && !shownNotes.has(noteKey);
    if (showNote) shownNotes.add(noteKey);
    rows.push(`<tr><th>${esc(lbl)}</th><td>${esc(val)}${showNote ? `<br><small class="ev-note">${esc(ev.note)}</small>` : ''}</td></tr>`);
  };

  // Sonder-Events in fixer Reihenfolge
  addRow('Geburt',     p.birth);
  addRow('Taufe',      p.chr);
  addRow('Tod',        p.death);
  addRow('Beerdigung', p.buri);

  // p.events: gruppiert nach Typ (Erscheinungsreihenfolge) → eventType → Datum aufsteigend
  const typeOrder = [];
  const typeSet   = new Set();
  const groups    = new Map(); // type → Map(eventType → ev[])
  (p.events || []).forEach(ev => {
    if (!typeSet.has(ev.type)) { typeOrder.push(ev.type); typeSet.add(ev.type); }
    if (!groups.has(ev.type)) groups.set(ev.type, new Map());
    const sub = ev.eventType || '';
    const subMap = groups.get(ev.type);
    if (!subMap.has(sub)) subMap.set(sub, []);
    subMap.get(sub).push(ev);
  });
  for (const subMap of groups.values())
    for (const items of subMap.values())
      items.sort((a, b) => evDateKey(a.date).localeCompare(evDateKey(b.date)));
  for (const type of typeOrder)
    for (const items of groups.get(type).values())
      items.forEach(ev => addRow(evLabel(ev), ev));

  if (!rows.length) return '';
  return `<table class="facts-table">${rows.join('')}</table>`;
}

// ── Familien-Block HTML ────────────────────────────────────────────
function _familyBlockHtml(p) {
  const db = AppState.db;
  let html = '';

  const personLink = (id, name) => `<a href="#p-${id}">${esc(name)}</a>`;

  // Eltern
  const famcId = p.famc?.[0]?.famId;
  if (famcId && db.families[famcId]) {
    const fam = db.families[famcId];
    const parts = [
      fam.husb && db.individuals[fam.husb] && personLink(fam.husb, db.individuals[fam.husb].name),
      fam.wife && db.individuals[fam.wife] && personLink(fam.wife, db.individuals[fam.wife].name),
    ].filter(Boolean);
    if (parts.length) {
      html += `<div class="family-block"><span class="fam-label">Eltern</span> ${parts.join(' &amp; ')}</div>`;
    }
  }

  // Ehen + Kinder
  (p.fams || []).forEach(famId => {
    const fam = db.families[famId];
    if (!fam) return;
    const spouseId = p.sex === 'F' ? fam.husb : fam.wife;
    const spouse   = spouseId && db.individuals[spouseId];
    const marrParts = [fam.marr?.date, compactPlace(fam.marr?.place)].filter(Boolean).join(', ');
    const spouseName = spouse ? personLink(spouseId, spouse.name) : '—';
    html += `<div class="family-block">`;
    html += `<span class="fam-label">&#x26AD;</span> ${spouseName}`;
    if (marrParts) html += ` <span class="fam-meta">${esc(marrParts)}</span>`;
    if (fam.children?.length) {
      const kids = fam.children.map(cid => {
        const c = db.individuals[cid];
        if (!c) return null;
        const yr = c.birth?.date?.match(/\d{4}/)?.[0] || c.chr?.date?.match(/\d{4}/)?.[0] || '';
        return `<a href="#p-${cid}">${esc(c.name)}${yr ? ` *${yr}` : ''}</a>`;
      }).filter(Boolean);
      if (kids.length) html += `<div class="children-list">Kinder: ${kids.join(', ')}</div>`;
    }
    html += `</div>`;
  });

  return html ? `<div class="section-block">${html}</div>` : '';
}

// ── Einzelne Personen-Sektion HTML ────────────────────────────────
function _personSectionHtml(p, id, kekule, photoSrc) {
  const yearMatch = s => s?.match(/\d{4}/)?.[0];
  const bYear = yearMatch(p.birth?.date) || yearMatch(p.chr?.date)  || '';
  const dYear = yearMatch(p.death?.date) || yearMatch(p.buri?.date) || '';
  const lifespan = bYear ? `*${bYear}${dYear ? ' †' + dYear : ''}` : (dYear ? `†${dYear}` : '');

  let html = `<section class="person-section" id="p-${id}">`;
  html += `<div class="person-header">`;

  // Kekule-Nummer prominent
  if (kekule != null) {
    html += `<div class="kekule-badge">${kekule}</div>`;
  }

  // Hauptfoto
  if (photoSrc) {
    html += `<img class="person-photo" src="${photoSrc}" alt="${esc(p.name || '')}">`;
  }

  html += `<div class="person-title">`;
  const given   = esc(p.given   || '');
  const surname = esc(p.surname || p.name || '');
  html += `<h2>${given} <strong>${surname}</strong></h2>`;
  if (lifespan) html += `<div class="person-lifespan">${lifespan}</div>`;
  html += `</div>`; // person-title
  html += `</div>`; // person-header

  // Lebensdaten
  html += _eventsTableHtml(p);

  // Familien
  html += _familyBlockHtml(p);

  // Notiz
  if (p.noteText) {
    html += `<div class="person-note">${esc(p.noteText).replace(/\n/g, '<br>')}</div>`;
  }

  // Quellen
  const cits = _collectCitations(p);
  if (cits.length) {
    html += `<div class="person-sources"><span class="src-label">Quellen:</span> ${cits.join(' · ')}</div>`;
  }

  html += `</section>`;
  return html;
}

// ── Inline-CSS des Buches ─────────────────────────────────────────
function _bookCss() {
  return `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Georgia, 'Times New Roman', serif; font-size: 11pt;
           color: #1a1208; background: #fff; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 2rem; font-weight: 700; margin-bottom: 6px; }
    h2 { font-size: 1.25rem; font-weight: 400; margin-bottom: 4px; }
    h2 strong { font-weight: 700; }
    h3 { font-size: 1rem; font-weight: 600; margin: 16px 0 6px; border-bottom: 1px solid #c0a878; padding-bottom: 3px; }
    a { color: #5a3e0e; text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* Titelseite */
    .title-page { text-align: center; padding: 80px 20px 60px; border-bottom: 2px solid #c0a878; margin-bottom: 40px; }
    .title-page h1 { font-size: 2.4rem; margin-bottom: 12px; }
    .title-page .subtitle { font-size: 1rem; color: #6a4a20; margin-bottom: 6px; }
    .title-page .meta { font-size: 0.85rem; color: #8a7050; margin-top: 20px; }

    /* Inhaltsverzeichnis */
    .toc { margin-bottom: 40px; }
    .toc h3 { font-size: 1.15rem; }
    .toc ul { list-style: none; columns: 2; gap: 12px; margin-top: 10px; }
    .toc li { padding: 2px 0; font-size: 0.88rem; }
    .toc .toc-num { display: inline-block; width: 2.2em; color: #8a6420; font-weight: 600; }

    /* Personen-Sektion */
    .person-section { margin-bottom: 40px; padding-bottom: 30px; border-bottom: 1px solid #ddd0b8; }
    .person-header { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 14px; }
    .kekule-badge {
      min-width: 44px; height: 44px; border-radius: 50%;
      background: #8a6420; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 1rem; font-weight: 700; flex-shrink: 0;
    }
    .person-photo { width: 80px; height: 100px; object-fit: cover;
                    border-radius: 4px; border: 1px solid #c0a878; flex-shrink: 0; }
    .person-title { flex: 1; }
    .person-lifespan { font-size: 0.9rem; color: #6a4a20; margin-top: 3px; }

    /* Fakten-Tabelle */
    .facts-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 0.9rem; }
    .facts-table th { width: 110px; text-align: left; padding: 3px 8px 3px 0;
                      color: #6a4a20; font-weight: 600; vertical-align: top; }
    .facts-table td { padding: 3px 0; vertical-align: top; }
    .ev-note { color: #8a7050; }

    /* Familien */
    .section-block { margin-bottom: 10px; font-size: 0.9rem; }
    .family-block { margin: 4px 0; }
    .fam-label { color: #6a4a20; font-weight: 600; margin-right: 4px; }
    .fam-meta { color: #8a7050; font-size: 0.85rem; }
    .children-list { margin-left: 20px; color: #4a3418; font-size: 0.85rem; }

    /* Notizen + Quellen */
    .person-note { margin: 8px 0; font-size: 0.88rem; color: #3a2810; white-space: pre-wrap; }
    .person-sources { margin-top: 8px; font-size: 0.78rem; color: #8a7050; border-top: 1px solid #ddd0b8; padding-top: 4px; }
    .src-label { font-weight: 600; }

    /* Namenindex */
    .name-index { columns: 3; gap: 16px; font-size: 0.85rem; }
    .name-index a { display: block; padding: 1px 0; color: #1a1208; }

    @media print {
      body { max-width: 100%; padding: 0; }
      .person-section { page-break-inside: avoid; }
      .person-section + .person-section { page-break-before: auto; }
      .title-page { page-break-after: always; }
      .toc { page-break-after: always; }
    }
  `;
}

// ── Komplettes Buch-HTML zusammenstellen ──────────────────────────
async function _buildBookHtml(opts) {
  const { title, mode, withPhotos } = opts;
  const db = AppState.db;

  // Personen bestimmen
  const probandId = AppState._probandId
    || Object.keys(db.individuals).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))[0];

  let kekuleById = {}; // id → kekule
  let sortedIds  = [];

  if (mode === 'ancestors') {
    const kekuleMap = _buildKekuleMap(probandId);
    // kekuleMap: { kekule: id } → umkehren zu { id: kekule }
    for (const [k, id] of Object.entries(kekuleMap)) kekuleById[id] = Number(k);
    // Sortierung: nach Kekule-Nummer
    sortedIds = Object.entries(kekuleById)
      .sort((a, b) => a[1] - b[1])
      .map(e => e[0]);
  } else {
    // Alle Personen, alphabetisch nach Name
    sortedIds = Object.keys(db.individuals).sort((a, b) => {
      const na = db.individuals[a].name || '';
      const nb = db.individuals[b].name || '';
      return na.localeCompare(nb, 'de');
    });
  }

  // Fotos laden
  const photos = {};
  if (withPhotos) {
    for (const id of sortedIds) {
      const p = db.individuals[id];
      const src = await _primPhotoSrc(p);
      if (src) photos[id] = src;
    }
  }

  const personCount = sortedIds.length;
  const now = new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
  const filename = AppState._currentFilename || 'Stammbaum';

  // Inhaltsverzeichnis
  let tocHtml = `<div class="toc"><h3>Inhaltsverzeichnis</h3><ul>`;
  for (const id of sortedIds) {
    const p  = db.individuals[id];
    const k  = kekuleById[id];
    const yr = p.birth?.date?.match(/\d{4}/)?.[0] || p.chr?.date?.match(/\d{4}/)?.[0] || '';
    tocHtml += `<li><a href="#p-${id}">`;
    if (k != null) tocHtml += `<span class="toc-num">${k}</span>`;
    tocHtml += `${esc(p.name || id)}${yr ? ` *${yr}` : ''}</a></li>`;
  }
  tocHtml += `</ul></div>`;

  // Personen-Sektionen
  let sectionsHtml = '';
  for (const id of sortedIds) {
    const p      = db.individuals[id];
    const kekule = kekuleById[id] ?? null;
    const photo  = photos[id] ?? null;
    sectionsHtml += _personSectionHtml(p, id, kekule, photo);
  }

  // Namenindex
  const indexEntries = [...sortedIds]
    .sort((a, b) => (db.individuals[a].name || '').localeCompare(db.individuals[b].name || '', 'de'))
    .map(id => {
      const p = db.individuals[id];
      const k = kekuleById[id];
      return `<a href="#p-${id}">${esc(p.name || id)}${k != null ? ` (${k})` : ''}</a>`;
    });

  const modeLabel = mode === 'ancestors'
    ? `Ahnen des Probanden · ${personCount} Personen`
    : `Alle Personen · ${personCount} Personen`;

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<style>${_bookCss()}</style>
</head>
<body>

<div class="title-page">
  <h1>${esc(title)}</h1>
  <div class="subtitle">${esc(filename)}</div>
  <div class="subtitle">${modeLabel}</div>
  <div class="meta">Erstellt am ${now}</div>
</div>

${tocHtml}

<div class="persons">
${sectionsHtml}
</div>

<h3 style="margin-top:40px;border-top:2px solid #c0a878;padding-top:12px;">Namenindex</h3>
<div class="name-index">${indexEntries.join('')}</div>

</body>
</html>`;
}

// ── Download auslösen ─────────────────────────────────────────────
async function downloadBook(opts) {
  const btn = document.getElementById('bookGenerateBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Wird erstellt…'; }
  try {
    const html = await _buildBookHtml(opts);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const safe = (opts.title || 'Familienbuch').replace(/[^\w\-äöüÄÖÜß]/g, '_');
    a.href     = url;
    a.download = safe + '.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    showToast(`✓ ${a.download} heruntergeladen`);
    closeModal('modalBook');
  } catch (err) {
    console.error('downloadBook:', err);
    showToast('⚠ Buchgenerator: ' + err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Erstellen & Herunterladen'; }
  }
}

// ── Segment-Toggle für Modus-Auswahl ─────────────────────────────
document.addEventListener('click', e => {
  const btn = e.target.closest('#book-mode-seg button[data-book-mode]');
  if (!btn) return;
  btn.closest('#book-mode-seg').querySelectorAll('button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
});

// ── Options-Modal öffnen ──────────────────────────────────────────
function openBookModal() {
  const db = AppState.db;
  if (!db || !Object.keys(db.individuals || {}).length) {
    showToast('⚠ Keine Daten geladen', 'warn'); return;
  }
  const titleEl = document.getElementById('book-title');
  if (titleEl && !titleEl.value) {
    titleEl.value = (AppState._currentFilename || 'Stammbaum').replace(/\.(ged|gramps)$/i, '') + ' — Familienbuch';
  }
  openModal('modalBook');
}
