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
        // ── Records ────────────────────────────────────────────────
        { lbl:'0 INDI rec.',  re:/^0 @[^@]+@ INDI\b/mg },
        { lbl:'0 FAM rec.',   re:/^0 @[^@]+@ FAM\b/mg },
        { lbl:'0 SOUR rec.',  re:/^0 @[^@]+@ SOUR\b/mg },
        { lbl:'0 NOTE rec.',  re:/^0 @[^@]+@ NOTE\b/mg },
        { lbl:'0 REPO rec.',  re:/^0 @[^@]+@ REPO\b/mg },
        { lbl:'0 OBJE rec.',  re:/^0 @[^@]+@ OBJE\b/mg },
        // ── Personen-Vitalereignisse ────────────────────────────────
        { lbl:'1 BIRT',       re:/^\s*1 BIRT\b/mg },
        { lbl:'1 CHR',        re:/^\s*1 CHR\b/mg },
        { lbl:'1 DEAT',       re:/^\s*1 DEAT\b/mg },
        { lbl:'1 BURI',       re:/^\s*1 BURI\b/mg },
        // ── Personen-Ereignisse ─────────────────────────────────────
        { lbl:'1 OCCU',       re:/^\s*1 OCCU\b/mg },
        { lbl:'1 RESI',       re:/^\s*1 RESI\b/mg },
        { lbl:'1 FACT',       re:/^\s*1 FACT\b/mg },
        { lbl:'1 MILI',       re:/^\s*1 MILI\b/mg },
        { lbl:'1 CENS',       re:/^\s*1 CENS\b/mg },
        { lbl:'1 EVEN',       re:/^\s*1 EVEN\b/mg },
        { lbl:'1 EMIG',       re:/^\s*1 EMIG\b/mg },
        { lbl:'1 IMMI',       re:/^\s*1 IMMI\b/mg },
        { lbl:'1 NATU',       re:/^\s*1 NATU\b/mg },
        { lbl:'1 GRAD',       re:/^\s*1 GRAD\b/mg },
        { lbl:'1 ADOP',       re:/^\s*1 ADOP\b/mg },
        { lbl:'1 CONF',       re:/^\s*1 CONF\b/mg },
        { lbl:'1 FCOM',       re:/^\s*1 FCOM\b/mg },
        { lbl:'1 ORDN',       re:/^\s*1 ORDN\b/mg },
        { lbl:'1 RETI',       re:/^\s*1 RETI\b/mg },
        { lbl:'1 PROP',       re:/^\s*1 PROP\b/mg },
        { lbl:'1 WILL',       re:/^\s*1 WILL\b/mg },
        { lbl:'1 PROB',       re:/^\s*1 PROB\b/mg },
        { lbl:'1 EDUC',       re:/^\s*1 EDUC\b/mg },
        { lbl:'1 RELI',       re:/^\s*1 RELI\b/mg },
        { lbl:'1 TITL',       re:/^\s*1 TITL\b/mg },
        { lbl:'1 DSCR',       re:/^\s*1 DSCR\b/mg },
        { lbl:'1 IDNO',       re:/^\s*1 IDNO\b/mg },
        { lbl:'1 SSN',        re:/^\s*1 SSN\b/mg },
        // ── Familien-Ereignisse ────────────────────────────────────
        { lbl:'1 MARR',       re:/^\s*1 MARR\b/mg },
        { lbl:'1 DIV',        re:/^\s*1 DIV\b/mg },
        { lbl:'1 DIVF',       re:/^\s*1 DIVF\b/mg },
        { lbl:'1 ENGA',       re:/^\s*1 ENGA\b/mg },
        // ── Personen-Felder ─────────────────────────────────────────
        { lbl:'1 NAME',       re:/^\s*1 NAME\b/mg },
        { lbl:'1 SEX',        re:/^\s*1 SEX\b/mg },
        { lbl:'1 RESN',       re:/^\s*1 RESN\b/mg },
        { lbl:'1 EMAIL',      re:/^\s*1 EMAIL\b/mg },
        { lbl:'1 WWW',        re:/^\s*1 WWW\b/mg },
        { lbl:'1 _UID',       re:/^\s*1 _UID\b/mg },
        { lbl:'1 _STAT',      re:/^\s*1 _STAT\b/mg },
        // ── Namen-Unterfelder ──────────────────────────────────────
        { lbl:'2 GIVN',       re:/^\s*2 GIVN\b/mg },
        { lbl:'2 SURN',       re:/^\s*2 SURN\b/mg },
        { lbl:'2 NICK',       re:/^\s*2 NICK\b/mg },
        { lbl:'2 NPFX',       re:/^\s*2 NPFX\b/mg },
        { lbl:'2 NSFX',       re:/^\s*2 NSFX\b/mg },
        { lbl:'2 TYPE',       re:/^\s*2 TYPE\b/mg },
        // ── Familien-Struktur ──────────────────────────────────────
        { lbl:'1 HUSB',       re:/^\s*1 HUSB\b/mg },
        { lbl:'1 WIFE',       re:/^\s*1 WIFE\b/mg },
        { lbl:'1 CHIL',       re:/^\s*1 CHIL\b/mg },
        { lbl:'1 FAMS',       re:/^\s*1 FAMS\b/mg },
        { lbl:'1 FAMC',       re:/^\s*1 FAMC\b/mg },
        { lbl:'2 PEDI',       re:/^\s*2 PEDI\b/mg },
        { lbl:'2 _FREL',      re:/^\s*2 _FREL\b/mg },
        { lbl:'2 _MREL',      re:/^\s*2 _MREL\b/mg },
        // ── Ereignis-Unterfelder ───────────────────────────────────
        { lbl:'2 DATE',       re:/^\s*2 DATE\b/mg },
        { lbl:'2 PLAC',       re:/^\s*2 PLAC\b/mg },
        { lbl:'2 CAUS',       re:/^\s*2 CAUS\b/mg },
        { lbl:'2 ADDR',       re:/^\s*2 ADDR\b/mg },
        { lbl:'2 PHON',       re:/^\s*2 PHON\b/mg },
        { lbl:'2 EMAIL',      re:/^\s*2 EMAIL\b/mg },
        // ── Datum-Qualifier ────────────────────────────────────────
        { lbl:'DATE ABT',     re:/\bDATE ABT\b/mg },
        { lbl:'DATE BEF',     re:/\bDATE BEF\b/mg },
        { lbl:'DATE AFT',     re:/\bDATE AFT\b/mg },
        { lbl:'DATE BET',     re:/\bDATE BET\b/mg },
        { lbl:'DATE CAL',     re:/\bDATE CAL\b/mg },
        { lbl:'DATE EST',     re:/\bDATE EST\b/mg },
        // ── Geo ────────────────────────────────────────────────────
        { lbl:'3 MAP',        re:/^\s*3 MAP\b/mg },
        { lbl:'4 LATI',       re:/^\s*4 LATI\b/mg },
        { lbl:'4 LONG',       re:/^\s*4 LONG\b/mg },
        // ── PLAC.FORM ─────────────────────────────────────────────
        { lbl:'PLAC.FORM',    re:/^2 FORM\s+\S.*,/mg, additive:true },
        // ── Notizen ────────────────────────────────────────────────
        { lbl:'1 NOTE',       re:/^\s*1 NOTE\b/mg },
        { lbl:'2 NOTE',       re:/^\s*2 NOTE\b/mg },
        { lbl:'3 NOTE',       re:/^\s*3 NOTE\b/mg },
        // ── Medien ────────────────────────────────────────────────
        { lbl:'1 OBJE',       re:/^\s*1 OBJE\b/mg },
        { lbl:'2 OBJE',       re:/^\s*2 OBJE\b/mg },
        { lbl:'2 FILE',       re:/^\s*2 FILE\b/mg },
        { lbl:'2 TITL',       re:/^\s*2 TITL\b/mg },
        { lbl:'2 _PRIM',      re:/^\s*2 _PRIM\b/mg },
        { lbl:'2 _SCBK',      re:/^\s*2 _SCBK\b/mg },
        // ── Quellen ───────────────────────────────────────────────
        { lbl:'1 SOUR',       re:/^\s*1 SOUR\b/mg },
        { lbl:'2 SOUR',       re:/^\s*2 SOUR\b/mg },
        { lbl:'3 SOUR',       re:/^\s*3 SOUR\b/mg },
        { lbl:'3 PAGE',       re:/^\s*3 PAGE\b/mg },
        { lbl:'3 QUAY',       re:/^\s*3 QUAY\b/mg },
        { lbl:'4 PAGE',       re:/^\s*4 PAGE\b/mg },
        { lbl:'4 QUAY',       re:/^\s*4 QUAY\b/mg },
        { lbl:'1 ABBR',       re:/^\s*1 ABBR\b/mg },
        { lbl:'1 AUTH',       re:/^\s*1 AUTH\b/mg },
        { lbl:'1 PUBL',       re:/^\s*1 PUBL\b/mg },
        { lbl:'1 TEXT',       re:/^\s*1 TEXT\b/mg },
        { lbl:'2 DATA',       re:/^\s*2 DATA\b/mg },
        { lbl:'2 AGNC',       re:/^\s*2 AGNC\b/mg },
        // ── Archive ───────────────────────────────────────────────
        { lbl:'1 REPO',       re:/^\s*1 REPO\b/mg },
        { lbl:'2 CALN',       re:/^\s*2 CALN\b/mg },
        // ── CHAN ──────────────────────────────────────────────────
        { lbl:'1 CHAN',       re:/^\s*1 CHAN\b/mg },
        { lbl:'3 TIME',       re:/^\s*3 TIME\b/mg },
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

      // ── Alle genutzten GEDCOM-Tags (Beschreibung) ──────────────
      const _TAG_DESC = {
        HEAD:'Datei-Kopf', TRLR:'Dateiende', SUBM:'Einsender', SUBN:'Einreichung',
        INDI:'Person', FAM:'Familie', SOUR:'Quellreferenz/-Record', REPO:'Archiv', NOTE:'Notiz', OBJE:'Medienobjekt',
        NAME:'Name', GIVN:'Vorname', SURN:'Nachname', NICK:'Spitzname', NPFX:'Namenspräfix', NSFX:'Namenssuffix',
        SEX:'Geschlecht', BIRT:'Geburt', CHR:'Taufe', DEAT:'Tod', BURI:'Beerdigung',
        MARR:'Heirat', DIV:'Scheidung', DIVF:'Scheidungsantrag', ENGA:'Verlobung', EVEN:'Ereignis (generisch)',
        OCCU:'Beruf', RESI:'Wohnort', EDUC:'Bildung', RELI:'Religion', CENS:'Volkszählung',
        EMIG:'Auswanderung', IMMI:'Einwanderung', NATU:'Einbürgerung', GRAD:'Abschluss',
        ADOP:'Adoption', CONF:'Konfirmation', FCOM:'Erstkommunion', ORDN:'Ordination',
        RETI:'Pensionierung', PROP:'Eigentum', WILL:'Testament', PROB:'Testamentseröffnung',
        TITL:'Titel', DSCR:'Beschreibung', IDNO:'ID-Nummer', SSN:'Sozialversicherungsnr.',
        FACT:'Tatsache', MILI:'Militärdienst',
        FAMS:'Familie als Ehegatte', FAMC:'Familie als Kind', HUSB:'Ehemann', WIFE:'Ehefrau', CHIL:'Kind',
        PEDI:'Abstammungsart', _FREL:'Vater-Abstammung (custom)', _MREL:'Mutter-Abstammung (custom)',
        DATE:'Datum', PLAC:'Ort', CAUS:'Todesursache', ADDR:'Adresse', PHON:'Telefon',
        EMAIL:'E-Mail', WWW:'Webseite', MAP:'Kartenkoordinaten', LATI:'Breite', LONG:'Länge',
        FILE:'Datei', FORM:'Format', TYPE:'Typ', _PRIM:'Primärmedium (custom)', _SCBK:'Fotoalbum (custom)',
        AUTH:'Autor', PUBL:'Publikation', TEXT:'Quelltext', ABBR:'Quellenabkürzung',
        DATA:'Datenblock', AGNC:'Agentur/Organisation', CALN:'Archivsignatur',
        PAGE:'Quellenseite', QUAY:'Quellenqualität (0–3)',
        REPO:'Archiv/Repository', CHAN:'Änderungsdatum', TIME:'Uhrzeit', RESN:'Zugriffsbeschränkung',
        CONT:'Zeilenfortsetzung', CONC:'Zeilenkettung',
        GEDC:'GEDCOM-Versionsdaten', VERS:'Versionsnummer', CHAR:'Zeichensatz',
        LANG:'Sprache', COPR:'Copyright', DEST:'Zielsystem',
        _UID:'Eindeutige ID (custom)', _STAT:'Status (custom)', _DATE:'Datum (custom)',
        REFN:'Referenznummer', RIN:'Record-ID', AFN:'Ahnenforschungs-Nr.',
        ALIA:'Alias', ASSO:'Assoziation', RELA:'Beziehung',
        BAPL:'Taufe (LDS)', CONL:'Konfirmation (LDS)', ENDL:'Begabung (LDS)', SLGC:'Siegelung Kind (LDS)', SLGS:'Siegelung Ehegatte (LDS)',
        STAT:'Status', TEMP:'Tempel', ORDI:'Ordination',
        _VALID:'Gültigkeitsstatus (custom)', _PLACE:'Ort (custom)', _AKA:'Alias (custom)',
        BLOB:'Binärdaten (veraltet)',
      };
      // Alle Tag-Vorkommen im Original nach "LEVEL TAG" gruppieren
      const _allTagCounts = new Map();
      for (const l of _origArr) {
        const m = l.match(/^(\d+)\s+([A-Z_][A-Z0-9_]*)/);
        if (!m) continue;
        const key = `${m[1]} ${m[2]}`;
        _allTagCounts.set(key, (_allTagCounts.get(key) || 0) + 1);
      }
      // Welche Level+Tag-Kombis werden durch tags[] abgedeckt?
      const _coveredKeys = new Set();
      for (const [key] of _allTagCounts) {
        const synth = key + ' dummy'; // simulate a line to test against regexes
        for (const t of tags) {
          if (t.lbl.startsWith('DATE ') || t.lbl === 'PLAC.FORM') continue; // Sonderform
          const lvTag = t.lbl.replace(/\s*\(.*\)/, '').trim(); // "1 BIRT" etc.
          if (key === lvTag) { _coveredKeys.add(key); break; }
        }
      }
      const _tagRows = [..._allTagCounts.entries()]
        .sort((a, b) => {
          const la = parseInt(a[0]), lb = parseInt(b[0]);
          return la !== lb ? la - lb : a[0].localeCompare(b[0]);
        });
      const _sonst = _tagRows.filter(([k]) => !_coveredKeys.has(k));
      const _allTagReport = '\n\n' + '─'.repeat(42) + '\nAlle GEDCOM-Tags im Original (' + _allTagCounts.size + ' Kombinationen):\n' +
        _tagRows.map(([k, n]) => {
          const tagName = k.split(' ')[1];
          const desc = _TAG_DESC[tagName] || '—';
          const mark = _coveredKeys.has(k) ? ' ' : '*';
          return `${mark} ${k.padEnd(12)} ${String(n).padStart(6)}×  ${desc}`;
        }).join('\n') +
        (_sonst.length ? `\n\n* = nicht in Tag-Statistik (${_sonst.length} sonstige):  ` +
          _sonst.map(([k]) => k).join('  ') : '');

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
        _allTagReport +
        diffSnippet;

    } catch (e) {
      try { AppState.db = saved; } catch(_) {}
      out.textContent = 'Fehler: ' + e.message + '\n' + e.stack;
    }
  }, 30);
}

