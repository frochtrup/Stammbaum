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
      const saved = AppState.db;
      const db1 = parseGEDCOM(_origText);

      // Write pass 1
      AppState.db = db1;
      const out1 = writeGEDCOM();
      // Pass 2: parse out1, write out2
      const db2 = parseGEDCOM(out1);
      AppState.db = db2;
      const out2 = writeGEDCOM();
      // Restore
      AppState.db = saved;

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
        { lbl:'1 DIV',        re:/^\s*1 DIV\b/mg },
        { lbl:'1 DIVF',       re:/^\s*1 DIVF\b/mg },
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
      // Sammelt echte Passthrough-Zeilen als Beispiele (max. limit Stück)
      function _ptCollect(lineArrays, limit) {
        const out = [];
        for (const arr of lineArrays) {
          for (const l of (arr || [])) {
            if (out.length >= limit) return out;
            out.push('  ► ' + l.trim());
          }
        }
        return out;
      }

      const _ptSecs = [];

      // 1. INDI._passthrough
      { let recs=0, lines=0; const agg={}; const allPt=[];
        for (const p of Object.values(db1.individuals)) {
          if (p._passthrough?.length) { recs++; lines+=p._passthrough.length; _ptAgg(p._passthrough,agg); allPt.push(p._passthrough); }
        }
        if (lines) {
          const s = _ptCollect(allPt, 6);
          _ptSecs.push(`INDI._passthrough    ${recs} Pers. · ${lines} Z.\n${_ptFmt(agg,lines)}${s.length?'\n'+s.join('\n'):''}`);
        }
      }
      // 2. INDI vital._extra (birth/death/chr/buri)
      { let recs=0, lines=0; const agg={}; const allPt=[];
        for (const p of Object.values(db1.individuals)) {
          for (const k of ['birth','death','chr','buri']) {
            const ex = p[k]?._extra;
            if (ex?.length) { recs++; lines+=ex.length; _ptAgg(ex,agg); allPt.push(ex); }
          }
        }
        if (lines) {
          const s = _ptCollect(allPt, 4);
          _ptSecs.push(`INDI.vital._extra    ${recs} Objs · ${lines} Z.\n${_ptFmt(agg,lines)}${s.length?'\n'+s.join('\n'):''}`);
        }
      }
      // 3. INDI.events._extra
      { let recs=0, lines=0; const agg={}; const allPt=[];
        for (const p of Object.values(db1.individuals)) {
          for (const ev of (p.events||[])) {
            if (ev._extra?.length) { recs++; lines+=ev._extra.length; _ptAgg(ev._extra,agg); allPt.push(ev._extra); }
          }
        }
        if (lines) {
          const s = _ptCollect(allPt, 4);
          _ptSecs.push(`INDI.events._extra   ${recs} Events · ${lines} Z.\n${_ptFmt(agg,lines)}${s.length?'\n'+s.join('\n'):''}`);
        }
      }
      // 4. INDI sourceExtra (topSourceExtra + vital + events)
      { let entries=0, lines=0; const agg={}; const allPt=[];
        for (const p of Object.values(db1.individuals)) {
          for (const arr of Object.values(p.topSourceExtra||{})) { if (arr.length) { entries++; lines+=arr.length; _ptAgg(arr,agg); allPt.push(arr); } }
          for (const k of ['birth','death','chr','buri']) {
            for (const arr of Object.values(p[k]?.sourceExtra||{})) { if (arr.length) { entries++; lines+=arr.length; _ptAgg(arr,agg); allPt.push(arr); } }
          }
          for (const ev of (p.events||[])) {
            for (const arr of Object.values(ev.sourceExtra||{})) { if (arr.length) { entries++; lines+=arr.length; _ptAgg(arr,agg); allPt.push(arr); } }
          }
        }
        if (lines) {
          const s = _ptCollect(allPt, 4);
          _ptSecs.push(`INDI.sourceExtra     ${entries} Eintr. · ${lines} Z.\n${_ptFmt(agg,lines)}${s.length?'\n'+s.join('\n'):''}`);
        }
      }
      // 5. FAM._passthrough
      { let recs=0, lines=0; const agg={}; const allPt=[];
        for (const f of Object.values(db1.families)) {
          if (f._passthrough?.length) { recs++; lines+=f._passthrough.length; _ptAgg(f._passthrough,agg); allPt.push(f._passthrough); }
        }
        if (lines) {
          const s = _ptCollect(allPt, 6);
          _ptSecs.push(`FAM._passthrough     ${recs} FAMs · ${lines} Z.\n${_ptFmt(agg,lines)}${s.length?'\n'+s.join('\n'):''}`);
        }
      }
      // 6. FAM marr/engag/div/divf._extra + sourceExtra
      { let recs=0, lines=0; const agg={}; const allPt=[];
        for (const f of Object.values(db1.families)) {
          for (const evKey of ['marr','engag','div','divf']) {
            const ev = f[evKey];
            if (ev?._extra?.length) { recs++; lines+=ev._extra.length; _ptAgg(ev._extra,agg); allPt.push(ev._extra); }
            for (const arr of Object.values(ev?.sourceExtra||{})) { if (arr.length) { lines+=arr.length; _ptAgg(arr,agg); allPt.push(arr); } }
          }
        }
        if (lines) {
          const s = _ptCollect(allPt, 4);
          _ptSecs.push(`FAM.ev._extra+srcEx  ${recs} FAMs · ${lines} Z.\n${_ptFmt(agg,lines)}${s.length?'\n'+s.join('\n'):''}`);
        }
      }
      // 7. FAM childRelations frelSourExtra/mrelSourExtra/sourExtra
      { let entries=0, lines=0; const agg={}; const allPt=[];
        for (const f of Object.values(db1.families)) {
          for (const cr of Object.values(f.childRelations||{})) {
            if (cr.frelSourExtra?.length) { entries++; lines+=cr.frelSourExtra.length; _ptAgg(cr.frelSourExtra,agg); allPt.push(cr.frelSourExtra); }
            if (cr.mrelSourExtra?.length) { entries++; lines+=cr.mrelSourExtra.length; _ptAgg(cr.mrelSourExtra,agg); allPt.push(cr.mrelSourExtra); }
            for (const arr of Object.values(cr.sourExtra||{})) { if (arr.length) { entries++; lines+=arr.length; _ptAgg(arr,agg); allPt.push(arr); } }
          }
        }
        if (lines) {
          const s = _ptCollect(allPt, 6);
          _ptSecs.push(`FAM.childRel.extra   ${entries} Eintr. · ${lines} Z.\n${_ptFmt(agg,lines)}${s.length?'\n'+s.join('\n'):''}`);
        }
      }
      // 8. SOUR._passthrough
      { let recs=0, lines=0; const agg={}; const allPt=[];
        for (const s of Object.values(db1.sources)) {
          if (s._passthrough?.length) { recs++; lines+=s._passthrough.length; _ptAgg(s._passthrough,agg); allPt.push(s._passthrough); }
        }
        if (lines) {
          const samp = _ptCollect(allPt, 6);
          _ptSecs.push(`SOUR._passthrough    ${recs} SOURs · ${lines} Z.\n${_ptFmt(agg,lines)}${samp.length?'\n'+samp.join('\n'):''}`);
        }
      }
      // 9. NOTE._passthrough
      { let recs=0, lines=0; const agg={}; const allPt=[];
        for (const n of Object.values(db1.notes||{})) {
          if (n._passthrough?.length) { recs++; lines+=n._passthrough.length; _ptAgg(n._passthrough,agg); allPt.push(n._passthrough); }
        }
        if (lines) {
          const samp = _ptCollect(allPt, 4);
          _ptSecs.push(`NOTE._passthrough    ${recs} NOTEs · ${lines} Z.\n${_ptFmt(agg,lines)}${samp.length?'\n'+samp.join('\n'):''}`);
        }
      }
      // 10. extraRecords
      { const er = db1.extraRecords||[];
        if (er.length) {
          const hdrs = er.slice(0,10).map(r => '  ► ' + (r._lines?.[0]||'?')).join('\n');
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
      try { AppState.db = saved; } catch(_) {}
      out.textContent = 'Fehler: ' + e.message + '\n' + e.stack;
    }
  }, 30);
}

