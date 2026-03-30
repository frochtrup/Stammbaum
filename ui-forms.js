function showSourceDetail(id, pushHistory = true) {
  const s = db.sources[id];
  if (!s) return;
  if (pushHistory) _beforeDetailNavigate();
  currentSourceId = id;
  currentPersonId = null;
  currentFamilyId = null;
  currentRepoId   = null;

  document.getElementById('detailTopTitle').textContent = 'Quelle';
  document.getElementById('editBtn').style.display = '';
  document.getElementById('editBtn').onclick = () => showSourceForm(id);
  document.getElementById('treeBtn').style.display = 'none';

  // Collect all persons and families referencing this source
  const refPersons = Object.values(db.individuals).filter(p => p.sourceRefs && p.sourceRefs.has(id));
  const refFamilies = Object.values(db.families).filter(f => f.sourceRefs && f.sourceRefs.has(id));

  let html = `<div class="detail-hero fade-up">
    <div id="det-src-photo-${id}" style="display:none"></div>
    <div id="det-src-avatar-${id}" class="detail-avatar" style="font-size:1.8rem">📖</div>
    <div class="detail-hero-text">
      <div class="detail-name">${esc(s.abbr || s.title || id)}</div>
      <div class="detail-id">${refPersons.length + refFamilies.length} Referenzen${s.lastChanged ? ' · geändert ' + s.lastChanged : ''}</div>
    </div>
  </div>`;

  // Source details
  html += `<div class="section fade-up"><div class="section-title">Details</div>`;
  if (s.abbr)                          html += factRow('Kurzname', s.abbr);
  if (s.title && s.title !== s.abbr)   html += factRow('Titel', s.title);
  if (s.author) html += factRow('Autor', s.author);
  if (s.date)   html += factRow('Datum', s.date);
  if (s.publ)   html += factRow('Verlag', s.publ);
  if (s.repo) {
    if (s.repo.match(/^@[^@]+@$/) && db.repositories[s.repo]) {
      const r = db.repositories[s.repo];
      const callNum = s.repoCallNum ? ` · Signatur: ${esc(s.repoCallNum)}` : '';
      html += `<div class="fact-row"><span class="fact-lbl">Aufbewahrung</span>
        <span class="fact-val"><span class="btn-link"
          onclick="showRepoDetail('${s.repo}')">${esc(r.name || s.repo)}</span>${callNum}</span></div>`;
    } else {
      html += factRow('Aufbewahrung', s.repo);
    }
  }
  if (s.text)   html += `<div class="fact-row"><span class="fact-lbl">Notiz</span><span class="fact-val" style="white-space:pre-wrap;line-height:1.5">${esc(s.text)}</span></div>`;
  if (!s.abbr && !s.title && !s.author && !s.date && !s.publ && !s.repo && !s.text)
    html += `<div style="color:var(--text-muted);font-style:italic;font-size:0.85rem">Keine Details eingetragen</div>`;
  html += `</div>`;

  // Referencing persons
  if (refPersons.length) {
    const sorted = [...refPersons].sort((a, b) => (a.name||'').localeCompare(b.name||'', 'de'));
    html += `<div class="section fade-up">
      <div class="section-title">Personen (${refPersons.length})</div>`;
    for (const p of sorted) {
      let meta = '';
      if (p.birth.date) meta += '* ' + p.birth.date;
      if (p.death.date) meta += (meta ? '  † ' : '† ') + p.death.date;
      html += relRow(p, meta || '–');
    }
    html += `</div>`;
  }

  // Referencing families
  if (refFamilies.length) {
    html += `<div class="section fade-up">
      <div class="section-title">Familien (${refFamilies.length})</div>`;
    for (const f of refFamilies) {
      const husb = f.husb ? db.individuals[f.husb] : null;
      const wife = f.wife ? db.individuals[f.wife] : null;
      const title = [husb?.name, wife?.name].filter(Boolean).join(' & ') || f.id;
      const meta = f.marr.date ? '⚭ ' + f.marr.date : '';
      html += `<div class="rel-row" onclick="showFamilyDetail('${f.id}')">
        <div class="rel-avatar" style="font-size:0.9rem">👨‍👩‍👧</div>
        <div class="rel-info">
          <div class="rel-name">${esc(title)}</div>
          <div class="rel-role">${esc(meta) || '–'}</div>
        </div>
        <span class="p-arrow">›</span>
      </div>`;
    }
    html += `</div>`;
  }

  if (!refPersons.length && !refFamilies.length) {
    html += `<div class="section fade-up"><div class="empty" style="padding:16px 0">Keine Referenzen gefunden</div></div>`;
  }

  // Media section: inline entries from media[] + reference entries from passthrough
  const srcMedia = s.media || [];
  const srcPtObje = (s._passthrough || []).filter(l => /^1 OBJE @/.test(l));
  {
    const _objeMap = _buildObjeRefMap();
    html += `<div class="section fade-up">
      <div class="section-head">
        <div class="section-title">Medien</div>
        <button class="section-add" onclick="openAddMediaDialog('source','${id}')">+ Hinzufügen</button>
      </div>`;
    for (let i = 0; i < srcMedia.length; i++) {
      const m = srcMedia[i];
      if (!m.file && !m.title) continue;
      const _ext = (m.file || '').split('.').pop().toLowerCase();
      const _isImg = ['jpg','jpeg','png','gif','bmp','webp','tif','tiff'].includes(_ext);
      const _icon = _isImg ? '🖼' : _ext === 'pdf' ? '📄' : '📎';
      html += `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border-color);cursor:pointer"
        onclick="openSourceMediaView('${id}',${i})">
        <div id="src-media-thumb-${i}" style="flex-shrink:0;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem;background:var(--bg-card);border-radius:6px;border:1px solid var(--border-color)">${_icon}</div>
        <div style="flex:1;min-width:0">
          <div style="word-break:break-all;font-size:0.88rem;font-weight:500">${esc(m.title || m.file)}</div>
          ${m.title && m.file ? `<div style="color:var(--text-muted);font-size:0.78rem;word-break:break-all">${esc(m.file)}</div>` : ''}
          ${m.form ? `<div style="color:var(--text-muted);font-size:0.78rem">${esc(m.form)}</div>` : ''}
        </div>
        <button class="edit-media-btn" onclick="event.stopPropagation();openEditMediaDialog('source','${id}',${i})" title="Bearbeiten">✎</button>
      </div>`;
    }
    for (const l of srcPtObje) {
      const ref = l.replace(/^1 OBJE\s+/, '').trim();
      const obj = _objeMap[ref];
      const label = obj ? (obj.title || obj.file || ref) : ref;
      const sub   = obj && obj.title && obj.file ? obj.file : '';
      const _ext2 = (obj?.file || '').split('.').pop().toLowerCase();
      const _icon2 = ['jpg','jpeg','png','gif','bmp','webp'].includes(_ext2) ? '🖼' : _ext2 === 'pdf' ? '📄' : '📎';
      html += `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border-color)">
        <div style="flex-shrink:0;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem;background:var(--bg-card);border-radius:6px;border:1px solid var(--border-color)">${_icon2}</div>
        <div style="flex:1;min-width:0">
          <div style="word-break:break-all;font-size:0.88rem;font-weight:500">${esc(label)}</div>
          ${sub ? `<div style="color:var(--text-muted);font-size:0.78rem;word-break:break-all">${esc(sub)}</div>` : ''}
          <div style="color:var(--text-muted);font-size:0.78rem">Verweis</div>
        </div>
      </div>`;
    }
    if (!srcMedia.filter(m => m.file || m.title).length && !srcPtObje.length) html += `<div style="color:var(--text-muted);font-style:italic;font-size:0.85rem;padding:4px 0">Keine Medien eingetragen</div>`;
    html += `</div>`;
  }

  document.getElementById('detailContent').innerHTML = html;
  showView('v-detail');

  // Quellenmedien async laden — IDB zuerst (Kamera-Aufnahmen), dann OneDrive
  let _srcHeroSet = false;
  function _applySrcMediaUrl(idx, url) {
    const m = srcMedia[idx];
    const ext = (m.file || '').split('.').pop().toLowerCase();
    const isImg = ['jpg','jpeg','png','gif','bmp','webp','tif','tiff'].includes(ext);
    if (!isImg) return;
    const el = document.getElementById('src-media-thumb-' + idx);
    if (el) {
      el.innerHTML = '';
      const img = document.createElement('img');
      img.src = url; img.alt = m.title || m.file || '';
      img.style.cssText = 'width:44px;height:44px;object-fit:cover;border-radius:6px;display:block';
      el.appendChild(img);
    }
    if (!_srcHeroSet) {
      _srcHeroSet = true;
      const heroEl = document.getElementById('det-src-photo-' + id);
      const avatarEl = document.getElementById('det-src-avatar-' + id);
      if (heroEl) {
        heroEl.style.display = '';
        heroEl.innerHTML = '';
        const hImg = document.createElement('img');
        hImg.src = url; hImg.alt = m.title || m.file || '';
        hImg.style.cssText = 'width:80px;height:96px;object-fit:cover;border-radius:8px;display:block;flex-shrink:0;cursor:pointer';
        hImg.onclick = () => showLightbox(url);
        heroEl.appendChild(hImg);
        if (avatarEl) avatarEl.style.display = 'none';
      }
    }
  }
  for (let i = 0; i < srcMedia.length; i++) {
    const m = srcMedia[i];
    if (!m.file && !m.title) continue;
    const _ci = i;
    idbGet('photo_src_' + id + '_' + _ci).then(b64 => {
      if (b64) { _applySrcMediaUrl(_ci, b64); return; }
      _odGetSourceFileUrl(id, _ci).then(url => { if (url) _applySrcMediaUrl(_ci, url); }).catch(() => {});
    }).catch(() => {});
  }
}

function factRow(label, value, rawSuffix, srcIds) {
  const badges = srcIds ? sourceTagsHtml(srcIds) : '';
  return `<div class="fact-row"><span class="fact-lbl">${esc(label)}</span><span class="fact-val">${esc(value)}${rawSuffix||''}${badges}</span></div>`;
}

// Extrahiert die Quellennummer aus einer GEDCOM-ID (@S042@ → 42)
function srcNum(sid) {
  const m = sid.match(/\d+/);
  return m ? parseInt(m[0], 10) : sid;
}

// Kompakte Quellen-Badges: §42 — inline in fact-val einbettbar
function sourceTagsHtml(sourceIds) {
  if (!sourceIds) return '';
  const ids = sourceIds instanceof Set ? [...sourceIds] : (Array.isArray(sourceIds) ? sourceIds : []);
  if (!ids.length) return '';
  return ids.map(sid => {
    const s = db.sources[sid];
    if (!s) return '';
    const tooltip = esc((s.abbr || s.title || sid).substring(0, 60));
    return `<span class="src-badge" data-sid="${sid}" onclick="event.stopPropagation();showSourceDetail(this.dataset.sid)" title="${tooltip}">§${srcNum(sid)}</span>`;
  }).filter(Boolean).join('');
}

function runRoundtripTest() {
  const _origText = _getOriginalText();
  if (!_origText) { showToast('⚠ Keine GEDCOM-Datei geladen'); return; }
  const out = document.getElementById('roundtrip-output');
  out.textContent = 'Läuft…';
  openModal('modalRoundtrip');

  setTimeout(() => {
    try {
      const t0 = performance.now();

      // Pass 1: parse original
      const saved = db;
      const db1 = parseGEDCOM(_origText);

      // Write pass 1
      db = db1;
      const out1 = writeGEDCOM();
      // Pass 2: parse out1, write out2
      const db2 = parseGEDCOM(out1);
      db = db2;
      const out2 = writeGEDCOM();
      // Restore
      db = saved;

      const t1 = performance.now();
      const stable = out1 === out2;

      // Line counts
      const origLines = _origText.split('\n').length;
      const outLines  = out1.split('\n').length;

      // Record counts from db1
      const nIndi = Object.keys(db1.individuals).length;
      const nFam  = Object.keys(db1.families).length;
      const nSour = Object.keys(db1.sources).length;
      const nNote = Object.keys(db1.notes || {}).length;
      const nRepo = Object.keys(db1.repositories || {}).length;

      // Tag delta helper
      const count = (text, re) => (text.match(re) || []).length;

      const tags = [
        // Quellenqualität + Seiten
        { lbl:'3 QUAY',       re:/^\s*3 QUAY\b/mg },
        { lbl:'3 PAGE',       re:/^\s*3 PAGE\b/mg },
        // NOTE + REPO Records
        { lbl:'0 NOTE rec.',  re:/^0 @[^@]+@ NOTE\b/mg },
        { lbl:'1 REPO (src)', re:/^\s*1 REPO\b/mg },
        { lbl:'0 REPO rec.',  re:/^0 @[^@]+@ REPO\b/mg },
        // Events Sprint 5
        { lbl:'1 FACT',       re:/^\s*1 FACT\b/mg },
        { lbl:'1 MILI',       re:/^\s*1 MILI\b/mg },
        { lbl:'2 TYPE',       re:/^\s*2 TYPE\b/mg },
        { lbl:'1 ENGA',       re:/^\s*1 ENGA\b/mg },
        { lbl:'2 CAUS',       re:/^\s*2 CAUS\b/mg },
        // Person-Felder Sprint 5
        { lbl:'1 RESN',       re:/^\s*1 RESN\b/mg },
        { lbl:'1 EMAIL',      re:/^\s*1 EMAIL\b/mg },
        { lbl:'1 WWW',        re:/^\s*1 WWW\b/mg },
        // Datum-Qualifier Sprint 6a
        { lbl:'DATE ABT',     re:/\bDATE ABT\b/mg },
        { lbl:'DATE BEF',     re:/\bDATE BEF\b/mg },
        { lbl:'DATE AFT',     re:/\bDATE AFT\b/mg },
        { lbl:'DATE BET',     re:/\bDATE BET\b/mg },
        { lbl:'DATE CAL',     re:/\bDATE CAL\b/mg },
        { lbl:'DATE EST',     re:/\bDATE EST\b/mg },
        // PLAC.FORM Sprint 6b — additive: Writer fügt es immer ein
        { lbl:'PLAC.FORM',    re:/^2 FORM\s+\S.*,/mg, additive:true },
        // CHAN.TIME
        { lbl:'3 TIME',       re:/^\s*3 TIME\b/mg },
        // Bekannte Verluste
        { lbl:'_STAT',        re:/_STAT\b/mg },
        // CHIL _FREL/_MREL Diagnose
        { lbl:'2 _FREL',      re:/^\s*2 _FREL\b/mg },
        { lbl:'2 _MREL',      re:/^\s*2 _MREL\b/mg },
        { lbl:'3 SOUR (FAM)', re:/^\s*3 SOUR\b/mg },
        { lbl:'4 PAGE',       re:/^\s*4 PAGE\b/mg },
        { lbl:'4 QUAY',       re:/^\s*4 QUAY\b/mg },
        // MAP/Geo
        { lbl:'3 MAP',        re:/^\s*3 MAP\b/mg },
        { lbl:'4 LATI',       re:/^\s*4 LATI\b/mg },
        { lbl:'4 LONG',       re:/^\s*4 LONG\b/mg },
        // Sonstige
        { lbl:'1 NAME',       re:/^\s*1 NAME\b/mg },
        { lbl:'2 TYPE (all)', re:/^\s*2 TYPE\b/mg },
        { lbl:'1 RESI',       re:/^\s*1 RESI\b/mg },
        { lbl:'1 OCCU',       re:/^\s*1 OCCU\b/mg },
        { lbl:'2 GIVN',       re:/^\s*2 GIVN\b/mg },
        { lbl:'2 SURN',       re:/^\s*2 SURN\b/mg },
        { lbl:'2 PLAC',       re:/^\s*2 PLAC\b/mg },
        { lbl:'2 DATE',       re:/^\s*2 DATE\b/mg },
        { lbl:'1 BIRT',       re:/^\s*1 BIRT\b/mg },
        { lbl:'1 CHR',        re:/^\s*1 CHR\b/mg },
        { lbl:'1 DEAT',       re:/^\s*1 DEAT\b/mg },
        { lbl:'1 BURI',       re:/^\s*1 BURI\b/mg },
        { lbl:'1 FAMS',       re:/^\s*1 FAMS\b/mg },
        { lbl:'1 FAMC',       re:/^\s*1 FAMC\b/mg },
        { lbl:'1 SEX',        re:/^\s*1 SEX\b/mg },
        { lbl:'1 NOTE (INDI)',re:/^\s*1 NOTE\b/mg },
        { lbl:'2 NOTE',       re:/^\s*2 NOTE\b/mg },
        { lbl:'2 SOUR (all)', re:/^\s*2 SOUR\b/mg },
        { lbl:'3 PAGE (all)', re:/^\s*3 PAGE\b/mg },
        { lbl:'3 QUAY (all)', re:/^\s*3 QUAY\b/mg },
        { lbl:'1 SOUR (INDI)',re:/^\s*1 SOUR\b/mg },
      ];

      const rows = tags.map(t => {
        const orig = count(_origText, t.re);
        const got  = count(out1, t.re);
        const diff = got - orig;
        const mark = diff === 0 ? '✓'
          : (diff > 0 && t.additive) ? `+${diff}*`
          : diff > 0 ? `+${diff}` : `${diff}`;
        return `  ${t.lbl.padEnd(15)} orig=${String(orig).padStart(4)}  out=${String(got).padStart(4)}  ${mark}`;
      });

      // Auto-Diff: group all missing original lines by tag type
      const _origArr = _origText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const _outArr  = out1.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const _outCounts = new Map();
      for (const l of _outArr) _outCounts.set(l, (_outCounts.get(l) || 0) + 1);
      const _missingTags = {};
      // Context tracking for DATE/PLAC diagnosis
      let _dpRecType = '', _dpLv1 = '';
      const _dpCtx = {};   // "RecType/lv1tag/tag" → count
      const _dpSamples = []; // up to 8 sample lines
      for (const l of _origArr) {
        const lv = parseInt(l);
        if (lv === 0) { _dpRecType = l.replace(/^0 @\S+@ /, '').replace(/^0 /, '').split(' ')[0]; _dpLv1 = ''; }
        else if (lv === 1) { _dpLv1 = l.match(/^1 (\S+)/)?.[1] || ''; }
        const rem = _outCounts.get(l) || 0;
        if (rem > 0) { _outCounts.set(l, rem - 1); }
        else {
          const t = l.match(/^\d+ (\S+)/)?.[1] || '?';
          _missingTags[t] = (_missingTags[t] || 0) + 1;
          if ((t === 'DATE' || t === 'PLAC') && lv === 2) {
            const key = `${_dpRecType}/${_dpLv1}/${t}`;
            _dpCtx[key] = (_dpCtx[key] || 0) + 1;
            if (_dpSamples.length < 8) _dpSamples.push(`  ${_dpRecType}/1 ${_dpLv1} → ${l}`);
          }
        }
      }
      const _topMissing = Object.entries(_missingTags).sort((a,b) => b[1]-a[1]).slice(0, 20);
      const _diffReport = _topMissing.length === 0
        ? '  (keine)'
        : _topMissing.map(([t,n]) => `  ${t.padEnd(14)} -${n}`).join('\n');

      // Diagnose: Sammle bis zu 5 vollständige fehlende Zeilen für OBJE (mit 2 Zeilen Kontext)
      const _objeDiag = [];
      { const _outC2 = new Map(); for (const l of _outArr) _outC2.set(l, (_outC2.get(l)||0)+1);
        const _allLines = _origText.split(/\r?\n/);
        for (let i = 0; i < _allLines.length && _objeDiag.length < 5; i++) {
          const lt = _allLines[i].trim();
          if (!/OBJE/.test(lt)) continue;
          const rem = _outC2.get(lt) || 0;
          if (rem > 0) { _outC2.set(lt, rem-1); continue; }
          const prev = _allLines[i-1]?.trim() || '';
          const next = _allLines[i+1]?.trim() || '';
          _objeDiag.push(`  [${i+1}] prev: ${prev}\n       MISS: ${lt}\n       next: ${next}`);
        }
      }
      const _objeDiagReport = _objeDiag.length ? '\n\nOBJE-Diagnose (fehlende Zeilen):\n' + _objeDiag.join('\n') : '';

      // Diagnose: fehlende SOUR/NOTE-Zeilen — zeige ganzen Record-Kontext (alle lv>0 Zeilen)
      const _sourNoteDiag = [];
      { const _outC3 = new Map(); for (const l of _outArr) _outC3.set(l, (_outC3.get(l)||0)+1);
        const _allLines3 = _origText.split(/\r?\n/);
        // Record-Grenzen vorab bestimmen
        const _recStarts = []; let _recStart0 = 0;
        for (let i = 0; i < _allLines3.length; i++) {
          if (/^\s*0 /.test(_allLines3[i])) { _recStarts.push(i); _recStart0 = i; }
        }
        let _curRecStart = 0;
        for (let i = 0; i < _allLines3.length && _sourNoteDiag.length < 6; i++) {
          const lt = _allLines3[i].trim();
          if (/^0 /.test(lt)) _curRecStart = i;
          if (!/(^\d+ SOUR\b|^\d+ NOTE\b)/.test(lt)) continue;
          const rem = _outC3.get(lt) || 0;
          if (rem > 0) { _outC3.set(lt, rem-1); continue; }
          // fehlende Zeile — zeige Record-Header + alle Zeilen bis zur fehlenden
          const ctx = [];
          const recEnd = Math.min(_allLines3.length-1, i+3);
          for (let j = _curRecStart; j <= recEnd; j++)
            ctx.push(`    ${j===i?'►':' '} ${_allLines3[j].trim()}`);
          if (recEnd < i+1) ctx.push('    ...');
          _sourNoteDiag.push(ctx.join('\n'));
        }
      }
      const _sourNoteDiagReport = _sourNoteDiag.length ? '\n\nSOUR/NOTE-Verlust-Diagnose:\n' + _sourNoteDiag.join('\n\n') : '';

      // Diagnose: fehlende 2 DATE / 2 PLAC — Kontext (aus Auto-Diff-Loop)
      let _datePlacReport = '';
      if (Object.keys(_dpCtx).length) {
        const _dpLines = ['  Kontext-Zusammenfassung:'];
        for (const [k,n] of Object.entries(_dpCtx).sort()) _dpLines.push(`    ${k}: ${n}×`);
        if (_dpSamples.length) { _dpLines.push('  Beispiele:'); _dpLines.push(..._dpSamples); }
        _datePlacReport = '\n\nFehlende 2 DATE/PLAC — Kontext:\n' + _dpLines.join('\n');
      }

      // ── Passthrough-Inhalt ──────────────────────────────────────────
      // Aggregiert Tag-Frequenzen aus allen Passthrough-Feldern in db1
      function _ptAgg(lines, agg) {
        for (const l of (lines||[])) {
          const m = l.match(/^\d+\s+(\S+)/);
          if (m) agg[m[1]] = (agg[m[1]] || 0) + 1;
        }
      }
      function _ptFmt(agg, total) {
        if (!total) return '  (leer)';
        return '  ' + Object.entries(agg).sort((a,b)=>b[1]-a[1]).slice(0,15)
          .map(([t,n]) => `${t} ${n}×`).join('  ·  ');
      }
      const _ptSecs = [];
      // 1. INDI._passthrough
      { let recs=0, lines=0; const agg={};
        for (const p of Object.values(db1.individuals)) {
          if (p._passthrough?.length) { recs++; lines+=p._passthrough.length; _ptAgg(p._passthrough,agg); }
        }
        if (lines) _ptSecs.push(`INDI._passthrough    ${recs} Pers. · ${lines} Z.\n${_ptFmt(agg,lines)}`);
      }
      // 2. INDI vital._extra (birth/death/chr/buri)
      { let recs=0, lines=0; const agg={};
        for (const p of Object.values(db1.individuals)) {
          for (const k of ['birth','death','chr','buri']) {
            const ex = p[k]?._extra;
            if (ex?.length) { recs++; lines+=ex.length; _ptAgg(ex,agg); }
          }
        }
        if (lines) _ptSecs.push(`INDI.vital._extra    ${recs} Objs · ${lines} Z.\n${_ptFmt(agg,lines)}`);
      }
      // 3. INDI.events._extra
      { let recs=0, lines=0; const agg={};
        for (const p of Object.values(db1.individuals)) {
          for (const ev of (p.events||[])) {
            if (ev._extra?.length) { recs++; lines+=ev._extra.length; _ptAgg(ev._extra,agg); }
          }
        }
        if (lines) _ptSecs.push(`INDI.events._extra   ${recs} Events · ${lines} Z.\n${_ptFmt(agg,lines)}`);
      }
      // 4. INDI sourceExtra (topSourceExtra + vital + events)
      { let entries=0, lines=0; const agg={};
        for (const p of Object.values(db1.individuals)) {
          for (const arr of Object.values(p.topSourceExtra||{})) { if (arr.length) { entries++; lines+=arr.length; _ptAgg(arr,agg); } }
          for (const k of ['birth','death','chr','buri']) {
            for (const arr of Object.values(p[k]?.sourceExtra||{})) { if (arr.length) { entries++; lines+=arr.length; _ptAgg(arr,agg); } }
          }
          for (const ev of (p.events||[])) {
            for (const arr of Object.values(ev.sourceExtra||{})) { if (arr.length) { entries++; lines+=arr.length; _ptAgg(arr,agg); } }
          }
        }
        if (lines) _ptSecs.push(`INDI.sourceExtra     ${entries} Eintr. · ${lines} Z.\n${_ptFmt(agg,lines)}`);
      }
      // 5. FAM._passthrough
      { let recs=0, lines=0; const agg={};
        for (const f of Object.values(db1.families)) {
          if (f._passthrough?.length) { recs++; lines+=f._passthrough.length; _ptAgg(f._passthrough,agg); }
        }
        if (lines) _ptSecs.push(`FAM._passthrough     ${recs} FAMs · ${lines} Z.\n${_ptFmt(agg,lines)}`);
      }
      // 6. FAM marr/engag._extra + sourceExtra
      { let recs=0, lines=0; const agg={};
        for (const f of Object.values(db1.families)) {
          if (f.marr?._extra?.length)  { recs++; lines+=f.marr._extra.length;  _ptAgg(f.marr._extra,agg); }
          if (f.engag?._extra?.length) { lines+=f.engag._extra.length; _ptAgg(f.engag._extra,agg); }
          for (const arr of Object.values(f.marr?.sourceExtra||{}))  { lines+=arr.length; _ptAgg(arr,agg); }
          for (const arr of Object.values(f.engag?.sourceExtra||{})) { lines+=arr.length; _ptAgg(arr,agg); }
        }
        if (lines) _ptSecs.push(`FAM.marr/engag._extra ${recs} FAMs · ${lines} Z.\n${_ptFmt(agg,lines)}`);
      }
      // 7. FAM childRelations frelSourExtra/mrelSourExtra/sourExtra
      { let entries=0, lines=0; const agg={};
        for (const f of Object.values(db1.families)) {
          for (const cr of Object.values(f.childRelations||{})) {
            if (cr.frelSourExtra?.length) { entries++; lines+=cr.frelSourExtra.length; _ptAgg(cr.frelSourExtra,agg); }
            if (cr.mrelSourExtra?.length) { entries++; lines+=cr.mrelSourExtra.length; _ptAgg(cr.mrelSourExtra,agg); }
            for (const arr of Object.values(cr.sourExtra||{})) { if (arr.length) { entries++; lines+=arr.length; _ptAgg(arr,agg); } }
          }
        }
        if (lines) _ptSecs.push(`FAM.childRel.extra   ${entries} Eintr. · ${lines} Z.\n${_ptFmt(agg,lines)}`);
      }
      // 8. SOUR._passthrough
      { let recs=0, lines=0; const agg={};
        for (const s of Object.values(db1.sources)) {
          if (s._passthrough?.length) { recs++; lines+=s._passthrough.length; _ptAgg(s._passthrough,agg); }
        }
        if (lines) _ptSecs.push(`SOUR._passthrough    ${recs} SOURs · ${lines} Z.\n${_ptFmt(agg,lines)}`);
      }
      // 9. NOTE._passthrough
      { let recs=0, lines=0; const agg={};
        for (const n of Object.values(db1.notes||{})) {
          if (n._passthrough?.length) { recs++; lines+=n._passthrough.length; _ptAgg(n._passthrough,agg); }
        }
        if (lines) _ptSecs.push(`NOTE._passthrough    ${recs} NOTEs · ${lines} Z.\n${_ptFmt(agg,lines)}`);
      }
      // 10. extraRecords
      { const er = db1.extraRecords||[];
        if (er.length) {
          const hdrs = er.slice(0,10).map(r => '  ' + (r._lines?.[0]||'?')).join('\n');
          _ptSecs.push(`extraRecords         ${er.length} Records\n${hdrs}`);
        }
      }
      const _ptReport = _ptSecs.length
        ? '\n\n' + '─'.repeat(42) + '\nPassthrough-Inhalt (db1):\n' + _ptSecs.join('\n\n')
        : '\n\nPassthrough-Inhalt: (leer)';

      const hasAdditive = tags.some((t,i) => t.additive && count(_origText, t.re) === 0);

      // Stability diff (first 5 differing lines)
      let diffSnippet = '';
      if (!stable) {
        const l1 = out1.split('\n'), l2 = out2.split('\n');
        const diffs = [];
        const len = Math.max(l1.length, l2.length);
        for (let i = 0; i < len && diffs.length < 5; i++) {
          if (l1[i] !== l2[i]) diffs.push(`  Zeile ${i+1}:\n    out1: ${l1[i] || '<fehlt>'}\n    out2: ${l2[i] || '<fehlt>'}`);
        }
        diffSnippet = '\n\nErste Unterschiede (out1 vs out2):\n' + diffs.join('\n');
      }

      out.textContent =
        `Roundtrip-Test  (${Math.round(t1-t0)} ms)\n` +
        `${'─'.repeat(42)}\n` +
        `Zeilen:  orig=${origLines}  out=${outLines}\n` +
        `Personen: ${nIndi}  Familien: ${nFam}  Quellen: ${nSour}\n` +
        `Notizen: ${nNote}  Archive: ${nRepo}\n\n` +
        `Stabilität (out1 === out2): ${stable ? '✓ STABIL' : '✗ INSTABIL'}\n\n` +
        `Tag-Statistik:\n` + rows.join('\n') +
        (hasAdditive ? '\n\n* additiv: Writer fügt diesen Tag immer ein' : '') +
        '\n\nAuto-Diff (fehlende Tags):\n' + _diffReport +
        _datePlacReport +
        _objeDiagReport +
        _sourNoteDiagReport +
        _ptReport +
        diffSnippet;

    } catch (e) {
      try { db = saved; } catch(_) {}
      out.textContent = 'Fehler: ' + e.message + '\n' + e.stack;
    }
  }, 30);
}

function relRow(person, role, unlinkFamId) {
  const sc = person.sex === 'M' ? 'm' : person.sex === 'F' ? 'f' : '';
  const ic = person.sex === 'M' ? '♂' : person.sex === 'F' ? '♀' : '◇';
  const unlinkBtn = unlinkFamId
    ? `<button class="unlink-btn" data-fid="${unlinkFamId}" data-pid="${person.id}"
         onclick="event.stopPropagation(); unlinkMember(this.dataset.fid, this.dataset.pid)"
         title="Verbindung trennen">×</button>`
    : '';
  return `<div class="rel-row" data-pid="${person.id}" onclick="showDetail(this.dataset.pid)">
    <div class="rel-avatar ${sc}">${ic}</div>
    <div class="rel-info">
      <div class="rel-name">${esc(person.name || person.id)}</div>
      <div class="rel-role">${esc(role)}</div>
    </div>
    ${unlinkBtn}
    <span class="p-arrow">›</span>
  </div>`;
}

// ─────────────────────────────────────
//  SOURCE WIDGET
//  srcWidgetState[prefix] = { ids: Set, pages: {sid:page}, quay: {sid:quay} }
// ─────────────────────────────────────
const srcWidgetState = {};  // {prefix: {ids: Set, pages: {sid: page}, quay: {sid: quay}}}

function updateSrcPage(prefix, sid, value) {
  if (!srcWidgetState[prefix]) srcWidgetState[prefix] = { ids: new Set(), pages: {}, quay: {} };
  srcWidgetState[prefix].pages[sid] = value;
}

function updateSrcQuay(prefix, sid, value) {
  if (!srcWidgetState[prefix]) srcWidgetState[prefix] = { ids: new Set(), pages: {}, quay: {} };
  srcWidgetState[prefix].quay[sid] = value;
}

function initSrcWidget(prefix, selectedIds, pageMap, quayMap) {
  const ids = selectedIds instanceof Set ? [...selectedIds] : (Array.isArray(selectedIds) ? selectedIds : []);
  srcWidgetState[prefix] = {
    ids:   new Set(ids),
    pages: pageMap ? { ...pageMap } : {},
    quay:  quayMap ? { ...quayMap } : {}
  };
  renderSrcTags(prefix);
  renderSrcPicker(prefix);
  document.getElementById(prefix + '-src-picker').classList.remove('open');
}

function renderSrcTags(prefix) {
  const container = document.getElementById(prefix + '-src-tags');
  const selected = srcWidgetState[prefix]?.ids || new Set();
  if (!selected.size) {
    container.innerHTML = '<span style="font-size:0.8rem;color:var(--text-muted);font-style:italic">Keine Quellen zugewiesen</span>';
    return;
  }
  const pages = srcWidgetState[prefix]?.pages || {};
  const quays = srcWidgetState[prefix]?.quay  || {};
  container.innerHTML = [...selected].map(sid => {
    const s = db.sources[sid];
    const label = s ? (s.abbr || s.title || sid) : sid;
    const pageVal = pages[sid] || '';
    const quayVal = String(quays[sid] ?? '');
    const sidEsc = sid.replace(/'/g,"\\'").replace(/"/g,'&quot;');
    const pageField = prefix === 'ef'
      ? `<input type="text" class="src-page-input" value="${esc(pageVal)}" placeholder="Seite…"
           oninput="updateSrcPage('${prefix}','${sidEsc}',this.value)">`
      : '';
    const quayField = prefix === 'ef'
      ? `<select class="src-quay-select" onchange="updateSrcQuay('${prefix}','${sidEsc}',this.value)"
           style="font-size:0.78rem;padding:2px 4px;border-radius:4px;border:1px solid var(--border);background:var(--surface2);color:var(--text-dim);margin-left:4px">
           <option value="" ${quayVal==='' ? 'selected' : ''}>Q–</option>
           <option value="0" ${quayVal==='0' ? 'selected' : ''}>0 unbelegt</option>
           <option value="1" ${quayVal==='1' ? 'selected' : ''}>1 fragwürdig</option>
           <option value="2" ${quayVal==='2' ? 'selected' : ''}>2 plausibel</option>
           <option value="3" ${quayVal==='3' ? 'selected' : ''}>3 direkt</option>
         </select>`
      : '';
    return `<span class="src-tag">
      ${esc(label.length > 25 ? label.slice(0,23)+'…' : label)}
      ${pageField}${quayField}
      <button type="button" onclick="removeSrc('${prefix}','${sid}')" style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:0 0 0 4px;font-size:0.85rem">✕</button>
    </span>`;
  }).join('');
}

function renderSrcPicker(prefix) {
  const list = document.getElementById(prefix + '-src-list');
  const selected = srcWidgetState[prefix]?.ids || new Set();
  const srcs = Object.values(db.sources).sort((a,b) => (a.abbr||a.title||'').localeCompare(b.abbr||b.title||'','de'));
  if (!srcs.length) {
    list.innerHTML = '<div class="src-picker-empty">Noch keine Quellen vorhanden</div>';
    return;
  }
  list.innerHTML = srcs.map(s => {
    const label = s.abbr || s.title || s.id;
    const isSel = selected.has(s.id);
    return `<div class="src-picker-item ${isSel ? 'selected' : ''}" onclick="toggleSrc('${prefix}','${s.id}')">
      ${isSel ? '✓ ' : ''}${esc(label)}
    </div>`;
  }).join('');
}

function toggleSrcPicker(prefix) {
  const picker = document.getElementById(prefix + '-src-picker');
  picker.classList.toggle('open');
  if (picker.classList.contains('open')) renderSrcPicker(prefix);
}

function toggleSrc(prefix, sid) {
  if (!srcWidgetState[prefix]) srcWidgetState[prefix] = { ids: new Set(), pages: {}, quay: {} };
  const set = srcWidgetState[prefix].ids;
  if (set.has(sid)) set.delete(sid); else set.add(sid);
  renderSrcTags(prefix);
  renderSrcPicker(prefix);
}

function removeSrc(prefix, sid) {
  srcWidgetState[prefix]?.ids.delete(sid);
  renderSrcTags(prefix);
  renderSrcPicker(prefix);
}

// ─────────────────────────────────────
//  FORMS: PERSON
// ─────────────────────────────────────
function showAddSheet() { openModal('modalAdd'); }
function showEditSheet() {
  if (currentPersonId) showPersonForm(currentPersonId);
  else if (currentFamilyId) showFamilyForm(currentFamilyId);
  else if (currentSourceId) showSourceForm(currentSourceId);
}

let _pfExtraNames = [];

function showPersonForm(id) {
  closeModal('modalAdd');
  const p = id ? db.individuals[id] : null;
  document.getElementById('personFormTitle').textContent = p ? 'Person bearbeiten' : 'Neue Person';
  document.getElementById('pf-id').value = id || '';
  document.getElementById('pf-given').value = p?.given || '';
  document.getElementById('pf-surname').value = p?.surname || '';
  document.getElementById('pf-sex').value = p?.sex || 'U';
  document.getElementById('pf-nick').value = p?.nick || '';
  document.getElementById('pf-suffix').value = p?.suffix || '';
  document.getElementById('pf-titl').value   = p?.titl  || '';
  document.getElementById('pf-note').value   = p?.noteTexts?.length ? p.noteTexts.join('\n') : (p?.noteTextInline ?? p?.noteText ?? '');
  document.getElementById('pf-resn').value   = p?.resn  || '';
  document.getElementById('pf-email').value  = p?.email || '';
  document.getElementById('pf-www').value    = p?.www   || '';
  _pfExtraNames = (p?.extraNames || []).map(en => ({...en}));
  _renderPfExtraNames();
  document.getElementById('deletePersonBtn').style.display = p ? 'block' : 'none';
  initSrcWidget('pf', p?.sourceRefs || []);
  openModal('modalPerson');
}

function _renderPfExtraNames() {
  const list = document.getElementById('pf-extranames-list');
  if (!list) return;
  list.innerHTML = '';
  _pfExtraNames.forEach((en, idx) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;align-items:center;flex-wrap:wrap';
    const mkInput = (ph, val, field) => {
      const el = document.createElement('input');
      el.className = 'form-input';
      el.style.cssText = 'flex:2;min-width:70px';
      el.placeholder = ph;
      el.value = val;
      el.addEventListener('input', () => { _pfExtraNames[idx][field] = el.value; });
      return el;
    };
    row.appendChild(mkInput('Vorname', en.given || '', 'given'));
    row.appendChild(mkInput('Nachname', en.surname || '', 'surname'));
    const sel = document.createElement('select');
    sel.className = 'form-select';
    sel.style.cssText = 'flex:2;min-width:100px';
    [['', '— Typ wählen —'], ['birth','Geburtsname'], ['maiden','Mädchenname'],
     ['married','Ehename'], ['aka','Auch bekannt als'], ['immigrant','Einwanderer-Name'], ['nickname','Spitzname']]
      .forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; if (en.type === v) o.selected = true; sel.appendChild(o); });
    sel.addEventListener('change', () => { _pfExtraNames[idx].type = sel.value; });
    row.appendChild(sel);
    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = '×';
    del.style.cssText = 'padding:4px 10px;background:var(--danger,#c0392b);color:#fff;border:none;border-radius:6px;cursor:pointer;flex-shrink:0';
    del.addEventListener('click', () => removePfExtraName(idx));
    row.appendChild(del);
    list.appendChild(row);
  });
}

function addPfExtraName() {
  _pfExtraNames.push({ nameRaw:'', given:'', surname:'', prefix:'', suffix:'', type:'', sources:[], sourcePages:{}, sourceQUAY:{}, _extra:[] });
  _renderPfExtraNames();
}

function removePfExtraName(idx) {
  _pfExtraNames.splice(idx, 1);
  _renderPfExtraNames();
}

function savePerson() {
  const id = document.getElementById('pf-id').value || nextId('I');
  const given = document.getElementById('pf-given').value.trim();
  const surname = document.getElementById('pf-surname').value.trim();
  const sex = document.getElementById('pf-sex').value;
  const nick   = document.getElementById('pf-nick').value.trim();
  const suffix = document.getElementById('pf-suffix').value.trim();
  const titl   = document.getElementById('pf-titl').value.trim();
  const note   = document.getElementById('pf-note').value.trim();
  const resn   = document.getElementById('pf-resn').value.trim();
  const email  = document.getElementById('pf-email').value.trim();
  const www    = document.getElementById('pf-www').value.trim();

  if (!given && !surname) { showToast('⚠ Bitte Namen eingeben'); return; }

  const existing = db.individuals[id] || {};
  const events = existing.events ? [...existing.events] : [];
  const extraNames = _pfExtraNames
    .filter(en => en.given || en.surname)
    .map(en => ({
      ...en,
      nameRaw: [en.given, en.surname ? '/' + en.surname + '/' : ''].filter(Boolean).join(' ')
    }));

  db.individuals[id] = {
    ...existing,
    id, given, surname, nick,
    name: (given + (surname ? ' ' + surname : '')).trim(),
    nameRaw: '',  // reset when edited via UI; parser sets original value
    sex,
    birth: existing.birth || { date:'', place:'', lati:null, long:null, sources:[], sourcePages:{} },
    death: existing.death || { date:'', place:'', lati:null, long:null, sources:[], sourcePages:{}, cause:'' },
    chr:   existing.chr   || { date:'', place:'', lati:null, long:null, sources:[], sourcePages:{} },
    buri:  existing.buri  || { date:'', place:'', lati:null, long:null, sources:[], sourcePages:{} },
    events,
    noteTexts: note ? [note] : [],
    noteTextInline: note,
    noteRefs: existing.noteRefs || [],
    noteText: (() => {
      let t = note;
      for (const ref of (existing.noteRefs || [])) {
        if (db.notes && db.notes[ref]) t += (t ? '\n' : '') + db.notes[ref].text;
      }
      return t;
    })(),
    famc: existing.famc || [],
    fams: existing.fams || [],
    media: existing.media || [],
    extraNames,
    suffix,
    titl,
    resn,
    email,
    www,
    lastChanged: gedcomDate(new Date()),
    lastChangedTime: gedcomTime(new Date()),
    sourceRefs: srcWidgetState['pf']?.ids || new Set()
  };

  closeModal('modalPerson');

  markChanged();
  updateStats();
  renderTab();

  if (_pendingRelation) {
    const rel = _pendingRelation;
    _pendingRelation = null;
    showToast('✓ Person erstellt');
    setTimeout(() => openRelFamilyForm(rel.anchorId, id, rel.mode), 80);
    return;
  }
  showToast('✓ Person gespeichert');
  if (currentPersonId === id) showDetail(id);
}

function deletePerson() {
  const id = document.getElementById('pf-id').value;
  if (!id || !db.individuals[id]) return;
  if (!confirm(`${db.individuals[id].name || id} wirklich löschen?`)) return;

  // Remove from families
  for (const f of Object.values(db.families)) {
    if (f.husb === id) f.husb = null;
    if (f.wife === id) f.wife = null;
    f.children = f.children.filter(c => c !== id);
  }
  delete db.individuals[id];
  closeModal('modalPerson');
  markChanged(); updateStats();
  showMain(); showToast('✓ Person gelöscht');
}

// ─────────────────────────────────────
//  FORMS: FAMILY
// ─────────────────────────────────────
let _pendingAddChild = null;

function showFamilyForm(id, ctx) {
  closeModal('modalAdd');
  _pendingAddChild = null;
  const f = id ? db.families[id] : null;
  document.getElementById('familyFormTitle').textContent = f ? 'Familie bearbeiten' : 'Neue Familie';
  document.getElementById('ff-id').value = id || '';

  // Populate person selects
  const persons = Object.values(db.individuals).sort((a,b) => (a.name||'').localeCompare(b.name||'','de'));
  const optionsAll = '<option value="">– keine –</option>' + persons.map(p =>
    `<option value="${p.id}">${esc(p.name || p.id)}</option>`
  ).join('');
  document.getElementById('ff-husb').innerHTML = optionsAll;
  document.getElementById('ff-wife').innerHTML = optionsAll;

  document.getElementById('ff-husb').value = f?.husb || '';
  document.getElementById('ff-wife').value = f?.wife || '';
  fillDateFields('ff-mdate-qual', 'ff-mdate', null, f?.marr?.date  || '');
  initPlaceMode('ff-mplace');
  document.getElementById('ff-mplace').value = f?.marr?.place  || '';
  fillDateFields('ff-edate-qual', 'ff-edate', null, f?.engag?.date || '');
  initPlaceMode('ff-eplace');
  document.getElementById('ff-eplace').value = f?.engag?.place || '';
  document.getElementById('ff-note').value = f?.noteTexts?.length ? f.noteTexts.join('\n') : (f?.noteTextInline ?? f?.noteText ?? '');
  document.getElementById('deleteFamilyBtn').style.display = f ? 'block' : 'none';
  initSrcWidget('ff', f?.marr?.sources || f?.sourceRefs || []);

  _renderMediaList('ff', f?.media || []);
  document.getElementById('ff-media-add-file').value = '';

  // Vorausfüllung aus Beziehungs-Picker-Kontext
  if (ctx) {
    if (ctx.husb !== undefined) document.getElementById('ff-husb').value = ctx.husb || '';
    if (ctx.wife !== undefined) document.getElementById('ff-wife').value = ctx.wife || '';
    if (ctx.addChild) {
      _pendingAddChild = ctx.addChild;
    }
  }

  openModal('modalFamily');
}

function saveFamily() {
  const id = document.getElementById('ff-id').value || nextId('F');
  const husb = document.getElementById('ff-husb').value || null;
  const wife = document.getElementById('ff-wife').value || null;
  if (!husb && !wife) { showToast('⚠ Mindestens ein Elternteil erforderlich'); return; }
  const mdate  = buildGedDateFromFields('ff-mdate-qual', 'ff-mdate', null);
  const mplace = getPlaceFromForm('ff-mplace');
  const edate  = buildGedDateFromFields('ff-edate-qual', 'ff-edate', null);
  const eplace = getPlaceFromForm('ff-eplace');
  const note = document.getElementById('ff-note').value.trim();
  const existingFam = db.families[id] || {};
  const children = [...(existingFam.children || [])];
  if (_pendingAddChild && !children.includes(_pendingAddChild)) children.push(_pendingAddChild);
  _pendingAddChild = null;
  db.families[id] = {
    ...existingFam,
    id, husb, wife, children,
    marr:  { ...(existingFam.marr||{}),  date: mdate,  place: mplace,  sources: [...(srcWidgetState['ff']?.ids || [])] },
    engag: { ...(existingFam.engag||{}), date: edate,  place: eplace },
    noteTexts: note ? [note] : [],
    noteTextInline: note,
    noteText: (() => {
      let t = note;
      for (const ref of (existingFam.noteRefs || [])) {
        if (db.notes && db.notes[ref]) t += (t ? '\n' : '') + db.notes[ref].text;
      }
      return t;
    })(),
    media: _readMediaList('ff', existingFam.media || []),
    sourceRefs: srcWidgetState['ff']?.ids || new Set(),
    lastChanged: gedcomDate(new Date()),
    lastChangedTime: gedcomTime(new Date())
  };

  // Update FAMS/FAMC references
  // famc entries are objects {famId, frel, mrel}, fams entries are strings
  const famcId = f => (typeof f === 'string' ? f : f.famId);
  for (const p of Object.values(db.individuals)) {
    p.fams = p.fams.filter(f => f !== id);
    p.famc = p.famc.filter(f => famcId(f) !== id);
  }
  if (husb && db.individuals[husb]) { if (!db.individuals[husb].fams.includes(id)) db.individuals[husb].fams.push(id); }
  if (wife && db.individuals[wife]) { if (!db.individuals[wife].fams.includes(id)) db.individuals[wife].fams.push(id); }
  for (const cid of children) {
    if (db.individuals[cid]) {
      if (!db.individuals[cid].famc.some(f => famcId(f) === id))
        db.individuals[cid].famc.push({ famId: id, frel: '', mrel: '', frelSour:'', frelPage:'', frelQUAY:'', mrelSour:'', mrelPage:'', mrelQUAY:'' });
    }
  }

  closeModal('modalFamily');
  markChanged(); updateStats();
  renderTab();
  showToast('✓ Familie gespeichert');
  if (currentFamilyId === id) showFamilyDetail(id);
}

function deleteFamily() {
  const id = document.getElementById('ff-id').value;
  if (!id) return;
  if (!confirm('Familie wirklich löschen?')) return;
  const famcId2 = f => (typeof f === 'string' ? f : f.famId);
  for (const p of Object.values(db.individuals)) {
    p.fams = p.fams.filter(f => f !== id);
    p.famc = p.famc.filter(f => famcId2(f) !== id);
  }
  delete db.families[id];
  closeModal('modalFamily');
  markChanged(); updateStats();
  showMain(); showToast('✓ Familie gelöscht');
}

// ─────────────────────────────────────
//  FORMS: SOURCE
// ─────────────────────────────────────
function _applySourceTemplate(type) {
  const abbr  = document.getElementById('sf-abbr');
  const title = document.getElementById('sf-title');
  const auth  = document.getElementById('sf-auth');
  const date  = document.getElementById('sf-date');
  const text  = document.getElementById('sf-text');
  const templates = {
    kirchenbuch:  { abbr: 'KB ', title: 'Kirchenbuch ', auth: 'Pfarramt', text: 'Tauf-/Heirats-/Sterbebuch' },
    standesamt:   { abbr: 'SA ', title: 'Standesamt ', auth: 'Standesamt', text: 'Geburts-/Heirats-/Sterbeurkunde' },
    volkszaehlung:{ abbr: 'VZ ', title: 'Volkszählung ', auth: 'Statistisches Amt', text: '' },
    familienbuch: { abbr: 'FSB ', title: 'Familienstammbuch ', auth: '', text: '' },
    zeitung:      { abbr: 'Ztg ', title: 'Zeitungsartikel: ', auth: '', text: '' },
  };
  const t = templates[type];
  if (!t) return;
  if (!abbr.value)  abbr.value  = t.abbr;
  if (!title.value) title.value = t.title;
  if (!auth.value && t.auth)  auth.value  = t.auth;
  if (!text.value && t.text)  text.value  = t.text;
  abbr.focus();
  abbr.setSelectionRange(abbr.value.length, abbr.value.length);
}

function showSourceForm(id) {
  closeModal('modalAdd');
  const s = id ? db.sources[id] : null;
  document.getElementById('sourceFormTitle').textContent = s ? 'Quelle bearbeiten' : 'Neue Quelle';
  document.getElementById('sf-template-row').style.display = s ? 'none' : '';
  document.getElementById('sf-id').value    = id || '';
  document.getElementById('sf-abbr').value  = s?.abbr   || '';
  document.getElementById('sf-title').value = s?.title  || '';
  document.getElementById('sf-auth').value  = s?.author || '';
  document.getElementById('sf-date').value  = s?.date   || '';
  document.getElementById('sf-publ').value  = s?.publ   || '';
  document.getElementById('sf-repo').value  = s?.repo         || '';
  document.getElementById('sf-caln').value  = s?.repoCallNum  || '';
  document.getElementById('sf-text').value  = s?.text         || '';
  sfRepoUpdateDisplay();
  document.getElementById('deleteSourceBtn').style.display = s ? 'block' : 'none';

  _renderMediaList('sf', s?.media || []);
  document.getElementById('sf-media-add-file').value = '';

  openModal('modalSource');
}

function saveSource() {
  const id = document.getElementById('sf-id').value || nextId('S');
  const existing = db.sources[id] || {};
  const abbr  = document.getElementById('sf-abbr').value.trim();
  const title = document.getElementById('sf-title').value.trim();
  if (!abbr && !title) { showToast('⚠ Kurzname oder Titel erforderlich'); return; }
  const _now = new Date();
  db.sources[id] = {
    ...existing,
    id,
    abbr,
    title,
    author:      document.getElementById('sf-auth').value.trim(),
    date:        document.getElementById('sf-date').value.trim(),
    publ:        document.getElementById('sf-publ').value.trim(),
    repo:        document.getElementById('sf-repo').value.trim(),
    repoCallNum: document.getElementById('sf-caln').value.trim(),
    text:        document.getElementById('sf-text').value.trim(),
    media:       _readMediaList('sf', existing.media || []),
    lastChanged:     gedcomDate(_now),
    lastChangedTime: gedcomTime(_now)
  };

  closeModal('modalSource');
  markChanged(); updateStats();
  renderTab();
  showToast('✓ Quelle gespeichert');
  if (currentSourceId === id) showSourceDetail(id);
}

function deleteSource() {
  const id = document.getElementById('sf-id').value;
  if (!id) return;
  if (!confirm('Quelle wirklich löschen?')) return;
  delete db.sources[id];
  closeModal('modalSource');
  markChanged(); updateStats();
  showMain(); showToast('✓ Quelle gelöscht');
}

// ─────────────────────────────────────
//  FORMS: REPO (Archive)
// ─────────────────────────────────────

function sfRepoUpdateDisplay() {
  const repoId  = (document.getElementById('sf-repo').value || '').trim();
  const display = document.getElementById('sf-repo-display');
  const clearBtn = document.getElementById('sf-repo-clear');
  const calnGrp  = document.getElementById('sf-caln-group');
  if (repoId.match(/^@[^@]+@$/)) {
    const r = db.repositories[repoId];
    display.textContent    = r ? (r.name || repoId) : repoId;
    display.style.color    = 'var(--gold)';
    clearBtn.style.display = '';
    calnGrp.style.display  = '';
  } else if (repoId) {
    display.textContent    = repoId;
    display.style.color    = 'var(--text)';
    clearBtn.style.display = '';
    calnGrp.style.display  = 'none';
  } else {
    display.textContent    = '–';
    display.style.color    = 'var(--text-muted)';
    clearBtn.style.display = 'none';
    calnGrp.style.display  = 'none';
  }
}
function sfRepoClear() {
  document.getElementById('sf-repo').value = '';
  document.getElementById('sf-caln').value = '';
  sfRepoUpdateDisplay();
}
function openRepoPicker() {
  document.getElementById('repoPickerSearch').value = '';
  renderRepoPicker('');
  openModal('modalRepoPicker');
}

function renderRepoPicker(q) {
  const list = document.getElementById('repoPickerList');
  let repos = Object.values(db.repositories);
  if (q) { const lq = q.toLowerCase(); repos = repos.filter(r => (r.name||r.id).toLowerCase().includes(lq)); }
  repos = repos.sort((a,b) => (a.name||'').localeCompare(b.name||'','de'));
  list.innerHTML = '';
  if (!repos.length) {
    list.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;padding:8px 0">Keine Archive gefunden</div>';
    return;
  }
  for (const r of repos) {
    const row = document.createElement('div');
    row.className = 'person-row';
    row.innerHTML = `<div class="person-row-info">
      <div class="person-row-name">${esc(r.name || r.id)}</div>
      ${r.addr ? `<div class="person-row-meta">${esc(r.addr.split('\n')[0])}</div>` : ''}
    </div><div class="row-arrow">›</div>`;
    row.addEventListener('click', () => repoPickerSelect(r.id));
    list.appendChild(row);
  }
}
function repoPickerSelect(repoId) {
  closeModal('modalRepoPicker');
  document.getElementById('sf-repo').value = repoId;
  sfRepoUpdateDisplay();
}
function repoPickerCreateNew() {
  closeModal('modalRepoPicker');
  _pendingRepoLink = { sourceId: document.getElementById('sf-id').value };
  showRepoForm(null);
}

function showRepoDetail(id, pushHistory = true) {
  const r = db.repositories[id]; if (!r) return;
  if (pushHistory) _beforeDetailNavigate();
  currentRepoId = id; currentPersonId = null; currentFamilyId = null; currentSourceId = null;
  document.getElementById('detailTopTitle').textContent = 'Archiv';
  document.getElementById('editBtn').style.display = '';
  document.getElementById('editBtn').onclick = () => showRepoForm(id);
  document.getElementById('treeBtn').style.display = 'none';

  const linkedSources = Object.values(db.sources).filter(s => s.repo === id);
  let html = `<div class="detail-hero fade-up">
    <div class="detail-avatar" style="font-size:1.8rem">🏛</div>
    <div class="detail-name">${esc(r.name || id)}</div>
    <div class="detail-id">${r.lastChanged ? 'Geändert ' + r.lastChanged : ''}</div>
  </div>
  <div class="section fade-up"><div class="section-title">Details</div>`;
  if (r.addr)  html += factRow('Adresse', r.addr.replace(/\n/g, ', '));
  if (r.phon)  html += factRow('Telefon', r.phon);
  if (r.www)   html += `<div class="fact-row"><span class="fact-lbl">Website</span><span class="fact-val"><a href="${esc(r.www)}" target="_blank" rel="noopener">${esc(r.www)}</a></span></div>`;
  if (r.email) html += `<div class="fact-row"><span class="fact-lbl">E-Mail</span><span class="fact-val"><a href="mailto:${esc(r.email)}">${esc(r.email)}</a></span></div>`;
  if (!r.addr && !r.phon && !r.www && !r.email)
    html += `<div style="color:var(--text-muted);font-style:italic;font-size:0.85rem">Keine Details eingetragen</div>`;
  html += `</div>`;
  if (linkedSources.length) {
    html += `<div class="section fade-up"><div class="section-title">Quellen (${linkedSources.length})</div>`;
    for (const s of linkedSources.sort((a,b)=>(a.abbr||a.title||'').localeCompare(b.abbr||b.title||'','de'))) {
      html += `<div class="source-card" onclick="showSourceDetail('${s.id}')">
        <div class="source-title">${esc(s.abbr || s.title || s.id)}</div>
        <div class="source-meta">${s.repoCallNum ? 'Signatur: ' + esc(s.repoCallNum) : '&nbsp;'}</div>
      </div>`;
    }
    html += `</div>`;
  } else {
    html += `<div class="section fade-up"><div class="empty" style="padding:16px 0">Keine verknüpften Quellen</div></div>`;
  }
  document.getElementById('detailContent').innerHTML = html;
  showView('v-detail');
}

function showRepoForm(id) {
  const r = id ? db.repositories[id] : null;
  document.getElementById('repoFormTitle').textContent = r ? 'Archiv bearbeiten' : 'Neues Archiv';
  document.getElementById('rf-id').value    = id    || '';
  document.getElementById('rf-name').value  = r?.name  || '';
  document.getElementById('rf-addr').value  = r?.addr  || '';
  document.getElementById('rf-phon').value  = r?.phon  || '';
  document.getElementById('rf-www').value   = r?.www   || '';
  document.getElementById('rf-email').value = r?.email || '';
  document.getElementById('deleteRepoBtn').style.display = r ? 'block' : 'none';
  openModal('modalRepo');
}

function saveRepo() {
  const id = document.getElementById('rf-id').value || nextId('R');
  const name = document.getElementById('rf-name').value.trim();
  if (!name) { showToast('⚠ Name erforderlich'); return; }
  const _now = new Date();
  db.repositories[id] = {
    id, name,
    addr:  document.getElementById('rf-addr').value.trim(),
    phon:  document.getElementById('rf-phon').value.trim(),
    www:   document.getElementById('rf-www').value.trim(),
    email: document.getElementById('rf-email').value.trim(),
    lastChanged:     gedcomDate(_now),
    lastChangedTime: gedcomTime(_now)
  };
  closeModal('modalRepo');
  markChanged();
  showToast('✓ Archiv gespeichert');
  if (_pendingRepoLink) {
    _pendingRepoLink = null;
    document.getElementById('sf-repo').value = id;
    sfRepoUpdateDisplay();
    openModal('modalSource');
  } else if (currentRepoId === id) {
    showRepoDetail(id);
  }
}

function deleteRepo() {
  const id = document.getElementById('rf-id').value; if (!id) return;
  const linked = Object.values(db.sources).filter(s => s.repo === id);
  const msg = linked.length
    ? `Archiv löschen? ${linked.length} Quelle(n) verlieren die Archiv-Verknüpfung.`
    : 'Archiv wirklich löschen?';
  if (!confirm(msg)) return;
  for (const s of linked) { s.repo = ''; s.repoCallNum = ''; }
  delete db.repositories[id];
  closeModal('modalRepo');
  markChanged();
  showMain();
  showToast('✓ Archiv gelöscht');
}

// ─────────────────────────────────────
//  FORMS: EVENT
// ─────────────────────────────────────
const _SPECIAL_OBJ = { BIRT:'birth', CHR:'chr', DEAT:'death', BURI:'buri' };
const _SPECIAL_LBL = { BIRT:'Geburt', CHR:'Taufe', DEAT:'Tod', BURI:'Beerdigung' };

let _efMedia = [];

function _renderEfMedia() {
  const list = document.getElementById('ef-media-list');
  if (!list) return;
  list.innerHTML = '';
  _efMedia.forEach((m, idx) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;align-items:center;flex-wrap:wrap';
    const mkInput = (ph, val, field) => {
      const el = document.createElement('input');
      el.className = 'form-input';
      el.style.cssText = 'flex:3;min-width:80px';
      el.placeholder = ph;
      el.value = val;
      el.addEventListener('input', () => { _efMedia[idx][field] = el.value; });
      return el;
    };
    row.appendChild(mkInput('Dateiname', m.file || '', 'file'));
    row.appendChild(mkInput('Titel', m.title || '', 'title'));
    const del = document.createElement('button');
    del.type = 'button'; del.textContent = '×';
    del.style.cssText = 'padding:4px 10px;background:var(--danger,#c0392b);color:#fff;border:none;border-radius:6px;cursor:pointer;flex-shrink:0';
    del.addEventListener('click', () => { _efMedia.splice(idx, 1); _renderEfMedia(); });
    row.appendChild(del);
    list.appendChild(row);
  });
}

function addEfMedia() {
  _efMedia.push({ file:'', title:'', form:'', _extra:[] });
  _renderEfMedia();
}

function onEventTypeChange() {
  const t = document.getElementById('ef-type').value;
  document.getElementById('ef-val-group').style.display   = (t in _SPECIAL_OBJ || t === 'RESI') ? 'none' : '';
  const showEtype = (t === 'FACT' || t === 'MILI' || t === 'EVEN');
  document.getElementById('ef-etype-group').style.display = showEtype ? '' : 'none';
  if (showEtype) {
    const lbl = document.querySelector('#ef-etype-group .form-label');
    const inp = document.getElementById('ef-etype');
    if (t === 'EVEN') { lbl.textContent = 'Bezeichnung'; inp.placeholder = 'z.B. Militärdienst, Einlieferung …'; }
    else { lbl.textContent = 'TYPE (Klassifikation)'; inp.placeholder = 'z.B. Staatsangehörigkeit'; }
  }
  document.getElementById('ef-cause-group').style.display = (t === 'DEAT') ? '' : 'none';
  document.getElementById('ef-addr-group').style.display  = (t === 'RESI') ? '' : 'none';
}

function showEventForm(personId, evIdx) {
  // data-Attribute liefern immer Strings — numerische Indizes zurückkonvertieren
  if (typeof evIdx === 'string' && evIdx !== '' && !(evIdx in _SPECIAL_OBJ) && !isNaN(evIdx)) evIdx = +evIdx;
  const p = db.individuals[personId];
  const isSpecial  = typeof evIdx === 'string' && evIdx in _SPECIAL_OBJ;
  const isExisting = typeof evIdx === 'number';
  const typeEl = document.getElementById('ef-type');

  document.getElementById('ef-pid').value    = personId;
  document.getElementById('ef-evidx').value  = isExisting ? evIdx : '';

  initPlaceMode('ef-place');
  _efMedia = [];
  _renderEfMedia();
  if (isSpecial) {
    const obj = p[_SPECIAL_OBJ[evIdx]] || {};
    typeEl.value = evIdx; typeEl.disabled = true;
    document.getElementById('ef-val').value   = '';
    document.getElementById('ef-etype').value = '';
    fillDateFields('ef-date-qual', 'ef-date', 'ef-date2', obj.date || '');
    document.getElementById('ef-place').value = obj.place || '';
    document.getElementById('ef-cause').value = evIdx === 'DEAT' ? (obj.cause || '') : '';
    initSrcWidget('ef', obj.sources || [], obj.sourcePages || {}, obj.sourceQUAY || {});
    document.querySelector('#modalEvent .sheet-title').textContent = _SPECIAL_LBL[evIdx] + ' bearbeiten';
    document.getElementById('saveEventBtn').textContent = 'Speichern';
  } else {
    const ev = isExisting ? p.events[evIdx] : null;
    typeEl.disabled = false;
    typeEl.value = ev?.type || 'OCCU';
    document.getElementById('ef-val').value   = ev?.value || '';
    document.getElementById('ef-etype').value = ev?.eventType || '';
    fillDateFields('ef-date-qual', 'ef-date', 'ef-date2', ev?.date || '');
    document.getElementById('ef-place').value = ev?.place || '';
    document.getElementById('ef-cause').value = '';
    document.getElementById('ef-addr').value  = ev?.addr  || '';
    initSrcWidget('ef', ev?.sources || [], ev?.sourcePages || {}, ev?.sourceQUAY || {});
    _efMedia = (ev?.media || []).map(m => ({...m}));
    _renderEfMedia();
    document.querySelector('#modalEvent .sheet-title').textContent = ev ? 'Ereignis bearbeiten' : 'Ereignis hinzufügen';
    document.getElementById('saveEventBtn').textContent = ev ? 'Speichern' : 'Hinzufügen';
  }
  onEventTypeChange();
  openModal('modalEvent');
}

function saveEvent() {
  const pid = document.getElementById('ef-pid').value;
  const p = db.individuals[pid];
  if (!p) return;
  const type = document.getElementById('ef-type').value;

  if (type in _SPECIAL_OBJ) {
    const key = _SPECIAL_OBJ[type];
    p[key] = { ...(p[key] || {}),
      date:        buildGedDateFromFields('ef-date-qual', 'ef-date', 'ef-date2'),
      place:       getPlaceFromForm('ef-place'),
      sources:     [...(srcWidgetState['ef']?.ids   || [])],
      sourcePages: { ...(srcWidgetState['ef']?.pages || {}) },
      sourceQUAY:  { ...(srcWidgetState['ef']?.quay  || {}) }
    };
    if (type === 'DEAT') p[key].cause = document.getElementById('ef-cause').value.trim();
  } else {
    const evIdxRaw = document.getElementById('ef-evidx').value;
    const evIdx    = evIdxRaw !== '' ? parseInt(evIdxRaw) : null;
    const ev = {
      type,
      value:      document.getElementById('ef-val').value.trim(),
      date:       buildGedDateFromFields('ef-date-qual', 'ef-date', 'ef-date2'),
      place:      getPlaceFromForm('ef-place'),
      addr:       document.getElementById('ef-addr').value.trim(),
      eventType:  '',
      note:       '',
      lati:       null,
      long:       null,
      sources:    [...(srcWidgetState['ef']?.ids   || [])],
      sourcePages: { ...(srcWidgetState['ef']?.pages || {}) },
      sourceQUAY:  { ...(srcWidgetState['ef']?.quay  || {}) },
      media:      _efMedia.filter(m => m.file || m.title).map(m => ({...m}))
    };
    if (evIdx !== null && p.events[evIdx]) {
      ev.lati      = p.events[evIdx].lati;
      ev.long      = p.events[evIdx].long;
      ev.eventType = p.events[evIdx].eventType || '';
      ev.note      = p.events[evIdx].note      || '';
      p.events[evIdx] = ev;
    } else {
      p.events.push(ev);
    }
    // TYPE-Feld aus Formular für FACT/MILI übernehmen
    if (type === 'FACT' || type === 'MILI') ev.eventType = document.getElementById('ef-etype').value.trim();
  }

  closeModal('modalEvent');
  markChanged(); updateStats();
  showToast('✓ Ereignis gespeichert');
  if (currentPersonId === pid) showDetail(pid);
}

// ─────────────────────────────────────
//  MODAL HELPERS
// ─────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  // Pending-Flows zurücksetzen wenn ihr Modal geschlossen wird (Cancel, Backdrop, Escape)
  if (id === 'modalPerson') _pendingRelation = null;
  if (id === 'modalRepo')   _pendingRepoLink  = null;
}
// Close on backdrop click — closeModal() aufrufen damit Pending-State zurückgesetzt wird
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) closeModal(m.id); });
});
// ─────────────────────────────────────
//  PINCH-ZOOM (Baum-Ansicht, Sprint P3-5)
// ─────────────────────────────────────
(function initPinchZoom() {
  const sc = document.getElementById('treeScroll');
  const wrap = document.getElementById('treeWrap');
  let startDist = 0, startScale = 1;
  let swipeStartX = 0, swipeStartY = 0;

  function pinchDist(e) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  sc.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      startDist  = pinchDist(e);
      startScale = _treeScale;
    } else if (e.touches.length === 1) {
      swipeStartX = e.touches[0].clientX;
      swipeStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  sc.addEventListener('touchmove', e => {
    if (e.touches.length !== 2) return;
    e.preventDefault();
    const scale = Math.min(2, Math.max(0.4, startScale * pinchDist(e) / startDist));
    _treeScale = scale;
    wrap.style.transform = `scale(${scale})`;
  }, { passive: false });

  // Doppeltipp: Zoom zurücksetzen; Wisch rechts: zurück
  let lastTap = 0;
  sc.addEventListener('touchend', e => {
    if (e.touches.length !== 0) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - swipeStartX;
    const dy = endY - swipeStartY;
    // Wisch rechts = zurück (mindestens 70px, überwiegend horizontal)
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) treeNavBack();
      return;
    }
    // Doppeltipp = Zoom reset
    const now = Date.now();
    if (now - lastTap < 300 && Math.abs(dx) < 20 && Math.abs(dy) < 20) {
      _treeScale = 1;
      wrap.style.transform = 'scale(1)';
    }
    lastTap = now;
  }, { passive: true });

  // Desktop: Mausrad + Ctrl/Cmd
  sc.addEventListener('wheel', e => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    _treeScale = Math.min(2, Math.max(0.4, _treeScale * delta));
    wrap.style.transform = `scale(${_treeScale})`;
  }, { passive: false });
})();

// Keyboard-Shortcuts
document.addEventListener('keydown', e => {
  const mod = e.metaKey || e.ctrlKey;

  // Escape: offenes Modal schließen
  if (e.key === 'Escape') {
    const open = document.querySelector('.modal-overlay.open');
    if (open) closeModal(open.id);
    return;
  }

  // Cmd/Ctrl+S: Speichern
  if (mod && e.key === 's') {
    e.preventDefault();
    exportGEDCOM();
    return;
  }

  // Cmd/Ctrl+Z: Änderungen verwerfen (nur wenn keine Modals offen)
  if (mod && e.key === 'z') {
    if (document.querySelector('.modal-overlay.open')) return;
    e.preventDefault();
    revertToSaved();
    return;
  }

  // Pfeil links: im Baum zurücknavigieren
  if (e.key === 'ArrowLeft' && !mod && document.getElementById('v-tree').classList.contains('active')) {
    treeNavBack();
  }
});

// ─────────────────────────────────────
//  UTILS
// ─────────────────────────────────────

// ── Extra-Places Persistenz ──────────
function loadExtraPlaces() {
  try {
    const r = localStorage.getItem('stammbaum_extraplaces');
    return r ? JSON.parse(r).reduce((o, p) => { o[p.name] = p; return o; }, {}) : {};
  } catch(e) { return {}; }
}
function saveExtraPlaces() {
  try { localStorage.setItem('stammbaum_extraplaces', JSON.stringify(Object.values(db.extraPlaces))); } catch(e) {}
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
const _applyPersonFilterDebounced = debounce((q, from, to) => filterPersons(q, from, to), 200);
const filterFamiliesDebounced = debounce(filterFamilies, 200);
const filterSourcesDebounced  = debounce(filterSources,  200);
const filterPlacesDebounced   = debounce(filterPlaces,   200);

function esc(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ─────────────────────────────────────
//  PLACE AUTOCOMPLETE
// ─────────────────────────────────────
function initPlaceAutocomplete(inputId, ddId) {
  const input = document.getElementById(inputId);
  const dd    = document.getElementById(ddId);
  if (!input || !dd) return;

  const _searchPlaces = debounce(() => {
    const q = input.value.toLowerCase().trim();
    dd.innerHTML = '';
    if (!q) { dd.style.display = 'none'; return; }
    const names = [...collectPlaces().values()]
      .map(p => p.name)
      .filter(n => n.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStart = a.toLowerCase().startsWith(q);
        const bStart = b.toLowerCase().startsWith(q);
        if (aStart !== bStart) return aStart ? -1 : 1;
        return a.localeCompare(b, 'de');
      })
      .slice(0, 12);
    if (!names.length) { dd.style.display = 'none'; return; }
    names.forEach(name => {
      const item = document.createElement('div');
      item.className = 'place-dropdown-item';
      item.textContent = name;
      item.addEventListener('mousedown', () => {
        input.value = name;
        dd.style.display = 'none';
      });
      dd.appendChild(item);
    });
    dd.style.display = 'block';
  }, 150);

  input.addEventListener('input', () => {
    // Dropdown sofort leeren bei leerem Feld, sonst debounced suchen
    if (!input.value.trim()) { dd.innerHTML = ''; dd.style.display = 'none'; return; }
    _searchPlaces();
  });

  input.addEventListener('blur',  () => setTimeout(() => { dd.style.display = 'none'; }, 150));
  input.addEventListener('focus', () => { if (dd.children.length) dd.style.display = 'block'; });
}

// Autocomplete für alle Ortsfelder einmalig initialisieren
initPlaceAutocomplete('ef-place',  'ef-place-dd');
initPlaceAutocomplete('ff-mplace', 'ff-mplace-dd');
initPlaceAutocomplete('np-name',   'np-name-dd');

