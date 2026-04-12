// ─────────────────────────────────────
//  GRAMPS DEBUG TOOLS
//  Nur geladen bei ?debug=1 in der URL.
//  Aufruf in der Browser-Konsole:
//    await _grampsXMLDebug()
//    await _grampsMinimalTest()
//    await _grampsDeepTest()
//    await _grampsRoundtripTest()
// ─────────────────────────────────────

// ─────────────────────────────────────
//  XML DEBUG — erste Person + Familie als Plain-XML in Console
// ─────────────────────────────────────
async function _grampsXMLDebug() {
  const db = AppState.db;
  if (!db?._sourceFormat) { console.warn('Kein db geladen'); return; }
  // Write uncompressed XML (reuse writer, extract text before compression)
  const blob = await writeGRAMPS(db);
  const buf  = await blob.arrayBuffer();
  const ds   = new DecompressionStream('gzip');
  const w    = ds.writable.getWriter();
  w.write(new Uint8Array(buf)); w.close();
  const reader = ds.readable.getReader();
  const chunks = []; let total = 0;
  for (;;) { const {done,value} = await reader.read(); if (done) break; chunks.push(value); total+=value.length; }
  const merged = new Uint8Array(total); let off=0;
  for (const c of chunks) { merged.set(c,off); off+=c.length; }
  const xml = new TextDecoder().decode(merged);
  // Log XML header (first 300 chars)
  console.log('=== XML Header ===\n' + xml.slice(0, 300));
  // Log first person element
  const m = xml.match(/<person[\s\S]*?<\/person>/);
  if (m) console.log('\n=== Erste Person ===\n' + m[0]);
  else   console.log('Keine <person> gefunden');
  const allGenders = [...xml.matchAll(/<gender>([^<]*)<\/gender>/g)];
  const gCount = {male:0, female:0, unknown:0};
  allGenders.forEach(g => { const v = g[1].trim(); gCount[v] = (gCount[v]||0)+1; });
  console.log(`\n=== Gender-Statistik: male=${gCount.male} female=${gCount.female} unknown=${gCount.unknown} gesamt=${allGenders.length} ===`);
  const unknownPersons = [];
  const pMatches = [...xml.matchAll(/<person handle="([^"]*)" id="([^"]*)">([\s\S]*?)<\/person>/g)];
  for (const pm of pMatches.slice(0, 200)) {
    if (pm[3].includes('<gender>unknown</gender>')) unknownPersons.push(pm[2]);
  }
  if (unknownPersons.length) console.log('Erste unknown-Personen:', unknownPersons.slice(0,10).join(', '));
}

// ─────────────────────────────────────
//  MINIMAL TEST — 2-Personen .gramps zum Download (GRAMPS-Import-Diagnose)
// ─────────────────────────────────────
async function _grampsMinimalTest() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE database PUBLIC "-//Gramps//DTD Gramps XML 1.7.2//EN"
"http://gramps-project.org/xml/1.7.2/grampsxml.dtd">
<database xmlns="http://gramps-project.org/xml/1.7.2/">
  <header>
    <created date="${new Date().toISOString().slice(0,10)}" version="6.0.6"/>
  </header>
  <events/>
  <people>
    <person handle="_testpe00000001" id="I0001">
      <name type="Birth Name"><first>Hans</first><surname>Müller</surname></name>
      <gender>M</gender>
    </person>
    <person handle="_testpe00000002" id="I0002">
      <gender>F</gender>
      <name type="Birth Name"><first>Maria</first><surname>Müller</surname></name>
    </person>
  </people>
  <families/>
  <sources/>
</database>`;
  const encoded = new TextEncoder().encode(xml);
  const cs = new CompressionStream('gzip');
  const w = cs.writable.getWriter(); w.write(encoded); w.close();
  const reader = cs.readable.getReader();
  const chunks = []; let total = 0;
  for (;;) { const {done,value} = await reader.read(); if (done) break; chunks.push(value); total+=value.length; }
  const merged = new Uint8Array(total); let off=0;
  for (const c of chunks) { merged.set(c,off); off+=c.length; }
  const blob = new Blob([merged], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='test_minimal.gramps';
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
  console.log('test_minimal.gramps: Hans Müller (male), Maria Müller (female)');
}

// ─────────────────────────────────────
//  DEEP ROUNDTRIP TEST
//  Prüft: alle Personen/Familien/Quellen im Detail, Orte, Extra-Namen,
//         Attribute (_UID, _STAT), Medien, Handles, Zitierungen
// ─────────────────────────────────────
async function _grampsDeepTest() {
  const db1 = AppState.db;
  if (db1?._sourceFormat !== 'gramps') {
    console.warn('Kein GRAMPS db geladen'); return null;
  }

  console.log('=== GRAMPS Deep Test — schreibe …');
  const blob = await writeGRAMPS(db1);
  console.log(`Geschrieben: ${(blob.size/1024).toFixed(1)} KB`);
  const db2 = await parseGRAMPS(new File([blob], 'deep.gramps'));

  let pass = 0, fail = 0;
  const failures = [];

  const chk = (label, a, b) => {
    if ((a == null ? '' : String(a)) === (b == null ? '' : String(b))) { pass++; return true; }
    fail++; failures.push(`${label}: "${a ?? ''}" ≠ "${b ?? ''}"`); return false;
  };
  const chkN = (label, a, b) => {
    if (a === b) { pass++; return true; }
    fail++; failures.push(`${label}: ${a} ≠ ${b}`); return false;
  };

  // ── 1. Alle Personen ────────────────────────────────────────────────────────
  let pFail = 0;
  for (const [id, p1] of Object.entries(db1.individuals)) {
    const p2 = db2.individuals[id];
    if (!p2) { fail++; failures.push(`Person ${id} fehlt`); pFail++; continue; }
    const ok = [
      chk(`${id}.given`,        p1.given,           p2.given),
      chk(`${id}.surname`,      p1.surname,         p2.surname),
      chk(`${id}.nick`,         p1.nick,            p2.nick),
      chk(`${id}.prefix`,       p1.prefix,          p2.prefix),
      chk(`${id}.suffix`,       p1.suffix,          p2.suffix),
      chk(`${id}.sex`,          p1.sex,             p2.sex),
      chk(`${id}.birth.date`,   p1.birth?.date,     p2.birth?.date),
      chk(`${id}.birth.place`,  p1.birth?.place,    p2.birth?.place),
      chk(`${id}.chr.date`,     p1.chr?.date,       p2.chr?.date),
      chk(`${id}.death.date`,   p1.death?.date,     p2.death?.date),
      chk(`${id}.death.place`,  p1.death?.place,    p2.death?.place),
      chk(`${id}.buri.date`,    p1.buri?.date,      p2.buri?.date),
      chk(`${id}.buri.place`,   p1.buri?.place,     p2.buri?.place),
      chkN(`${id}.events.len`,   p1.events?.length||0,       p2.events?.length||0),
      chkN(`${id}.extraNames`,   p1.extraNames?.length||0,   p2.extraNames?.length||0),
      chkN(`${id}.media.len`,    p1.media?.length||0,        p2.media?.length||0),
      chkN(`${id}._grampsAttrs`, p1._grampsAttrs?.length||0, p2._grampsAttrs?.length||0),
    ];
    if (p1.uid)   chk(`${id}._UID`,  p1.uid,   p2.uid);
    if (p1._stat) chk(`${id}._STAT`, p1._stat, p2._stat);
    if (!ok.every(Boolean)) pFail++;
  }
  console.log(`  Personen: ${Object.keys(db1.individuals).length} geprüft, ${pFail} mit Delta`);

  // ── 2. Extra-Namen (alle Felder) ────────────────────────────────────────────
  for (const [id, p1] of Object.entries(db1.individuals)) {
    const p2 = db2.individuals[id];
    if (!p2) continue;
    (p1.extraNames || []).forEach((en, i) => {
      const en2 = p2.extraNames?.[i];
      chk(`${id}.extraNames[${i}].given`,   en.given,   en2?.given);
      chk(`${id}.extraNames[${i}].surname`, en.surname, en2?.surname);
      chk(`${id}.extraNames[${i}].type`,    en.type,    en2?.type);
    });
  }

  // ── 3. Familien ─────────────────────────────────────────────────────────────
  let fFail = 0;
  for (const [id, f1] of Object.entries(db1.families)) {
    const f2 = db2.families[id];
    if (!f2) { fail++; failures.push(`Familie ${id} fehlt`); fFail++; continue; }
    const ok = [
      chk(`${id}.husb`,         f1.husb,              f2.husb),
      chk(`${id}.wife`,         f1.wife,              f2.wife),
      chkN(`${id}.children`,    f1.children?.length||0, f2.children?.length||0),
      chk(`${id}.marr.date`,    f1.marr?.date,        f2.marr?.date),
      chk(`${id}.marr.place`,   f1.marr?.place,       f2.marr?.place),
      chk(`${id}.div.date`,     f1.div?.date,         f2.div?.date),
      chkN(`${id}._grampsAttrs`,f1._grampsAttrs?.length||0, f2._grampsAttrs?.length||0),
    ];
    // childref frel/mrel
    for (const chId of f1.children||[]) {
      const r1 = f1.childRelations?.[chId], r2 = f2.childRelations?.[chId];
      if (r1?.frel) chk(`${id}.childRel.${chId}.frel`, r1.frel, r2?.frel);
      if (r1?.mrel) chk(`${id}.childRel.${chId}.mrel`, r1.mrel, r2?.mrel);
    }
    if (!ok.every(Boolean)) fFail++;
  }
  console.log(`  Familien: ${Object.keys(db1.families).length} geprüft, ${fFail} mit Delta`);

  // ── 4. Quellen ──────────────────────────────────────────────────────────────
  let sFail = 0;
  for (const [id, s1] of Object.entries(db1.sources)) {
    const s2 = db2.sources[id];
    if (!s2) { fail++; failures.push(`Quelle ${id} fehlt`); sFail++; continue; }
    const ok = [
      chk(`${id}.title`,  s1.title,  s2.title),
      chk(`${id}.author`, s1.author, s2.author),
      chk(`${id}.publ`,   s1.publ,   s2.publ),
      chk(`${id}.abbr`,   s1.abbr,   s2.abbr),
      chkN(`${id}.media`, s1.media?.length||0, s2.media?.length||0),
    ];
    if (!ok.every(Boolean)) sFail++;
  }
  console.log(`  Quellen: ${Object.keys(db1.sources).length} geprüft, ${sFail} mit Delta`);

  // ── 5. placeObjects: Hierarchie, Typen, Alternate Names ────────────────────
  const po1 = db1.placeObjects || {}, po2 = db2.placeObjects || {};
  let poFail = 0;
  chkN('placeObjects.count', Object.keys(po1).length, Object.keys(po2).length);
  for (const [pId, pl1] of Object.entries(po1)) {
    const pl2 = po2[pId];
    if (!pl2) { fail++; failures.push(`Place ${pId} fehlt`); poFail++; continue; }
    const ok = [
      chk(`${pId}.title`,    pl1.title,    pl2.title),
      chk(`${pId}.type`,     pl1.type,     pl2.type),
      chk(`${pId}.parentId`, pl1.parentId, pl2.parentId),
      chkN(`${pId}.pnames`,  pl1.pnames?.length||0, pl2.pnames?.length||0),
    ];
    if (!ok.every(Boolean)) poFail++;
  }
  console.log(`  Orts-Objekte: ${Object.keys(po1).length} geprüft, ${poFail} mit Delta`);

  // ── 6. Orte: alle unique place-Strings ─────────────────────────────────────
  const collectPlaces = db => {
    const s = new Set();
    for (const p of Object.values(db.individuals)) {
      if (p.birth?.place)  s.add(p.birth.place);
      if (p.chr?.place)    s.add(p.chr.place);
      if (p.death?.place)  s.add(p.death.place);
      if (p.buri?.place)   s.add(p.buri.place);
      for (const ev of p.events||[]) if (ev.place) s.add(ev.place);
    }
    for (const f of Object.values(db.families)) {
      if (f.marr?.place) s.add(f.marr.place);
      for (const ev of f.events||[]) if (ev.place) s.add(ev.place);
    }
    s.delete(''); s.delete(undefined); s.delete(null);
    return s;
  };
  const pl1 = collectPlaces(db1), pl2 = collectPlaces(db2);
  let plFail = 0;
  for (const pl of pl1) {
    if (!pl2.has(pl)) { fail++; failures.push(`Ort fehlt: "${pl}"`); plFail++; } else pass++;
  }
  console.log(`  Orte: ${pl1.size} unique, ${plFail} fehlend`);

  // ── 7. Medien-Pfade ─────────────────────────────────────────────────────────
  let mFail = 0;
  for (const [id, p1] of Object.entries(db1.individuals)) {
    const p2 = db2.individuals[id];
    if (!p1.media?.length || !p2) continue;
    const f1 = p1.media.map(m => m.file).sort().join('|');
    const f2 = (p2.media||[]).map(m => m.file).sort().join('|');
    if (!chk(`${id}.media.files`, f1, f2)) mFail++;
  }
  console.log(`  Medien-Pfade: ${mFail} Personen mit Delta`);

  // ── 8. GRAMPS Handles (Stichprobe 20) ──────────────────────────────────────
  const h1 = db1._grampsHandles || {}, h2 = db2._grampsHandles || {};
  const h2inv = {};
  for (const [h, id] of Object.entries(h2)) h2inv[id] = h;
  let hFail = 0, hChecked = 0;
  for (const [handle, id] of Object.entries(h1)) {
    if (hChecked++ >= 20) break;
    if (!chk(`handle.${id}`, handle, h2inv[id])) hFail++;
  }
  console.log(`  Handles: ${hChecked} geprüft, ${hFail} mit Delta`);

  // ── Zusammenfassung ─────────────────────────────────────────────────────────
  console.log(`\nChecks gesamt: ${pass+fail}  ✓ ${pass}  ✗ ${fail}`);
  if (failures.length) {
    console.log(`\nFehler (max 30):`);
    failures.slice(0, 30).forEach(f => console.log(' ✗', f));
    if (failures.length > 30) console.log(`  … und ${failures.length-30} weitere`);
  }
  console.log(`\nErgebnis: ${fail===0 ? '✓ DEEP TEST OK' : `✗ ${fail} Fehler`}`);
  return { pass, fail, failures, db1, db2 };
}

// ─────────────────────────────────────
//  ROUNDTRIP TEST
// ─────────────────────────────────────
async function _grampsRoundtripTest() {
  const db1 = AppState.db;
  if (db1?._sourceFormat !== 'gramps') {
    console.warn('Kein GRAMPS db geladen — lade zuerst eine .gramps Datei');
    return null;
  }

  console.log('=== GRAMPS Roundtrip Test ===');
  console.log(`DB1: ${Object.keys(db1.individuals).length} Personen, ` +
              `${Object.keys(db1.families).length} Familien, ` +
              `${Object.keys(db1.sources).length} Quellen`);

  // Write
  let blob;
  try {
    blob = await writeGRAMPS(db1);
    console.log(`Geschrieben: ${(blob.size/1024).toFixed(1)} KB gzip`);
  } catch(e) {
    console.error('writeGRAMPS fehlgeschlagen:', e);
    return null;
  }

  // Re-parse
  let db2;
  try {
    const file = new File([blob], 'roundtrip.gramps', { type: 'application/octet-stream' });
    db2 = await parseGRAMPS(file);
  } catch(e) {
    console.error('parseGRAMPS (re-read) fehlgeschlagen:', e);
    return null;
  }

  console.log(`DB2: ${Object.keys(db2.individuals).length} Personen, ` +
              `${Object.keys(db2.families).length} Familien, ` +
              `${Object.keys(db2.sources).length} Quellen`);

  // Compare
  const n1 = Object.keys(db1.individuals).length;
  const n2 = Object.keys(db2.individuals).length;
  const f1 = Object.keys(db1.families).length;
  const f2 = Object.keys(db2.families).length;
  const s1 = Object.keys(db1.sources).length;
  const s2 = Object.keys(db2.sources).length;

  const ok = (label, a, b) => {
    const pass = a === b;
    console.log(`  ${pass ? '✓' : '✗'} ${label}: ${a} → ${b}${pass ? '' : ' DELTA=' + (b-a)}`);
    return pass;
  };

  const results = [
    ok('Personen', n1, n2),
    ok('Familien', f1, f2),
    ok('Quellen',  s1, s2),
  ];

  // Spot-check: first person
  const pid1 = Object.keys(db1.individuals)[0];
  const p1   = db1.individuals[pid1];
  const p2   = db2.individuals[pid1];
  if (p2) {
    console.log('  Stichprobe Person 1:');
    const chk = (k, a, b) => {
      const pass = (a||'') === (b||'');
      console.log(`    ${pass ? '✓' : '✗'} ${k}: "${a||''}" → "${b||''}"`);
      return pass;
    };
    chk('given',   p1.given,      p2.given);
    chk('surname', p1.surname,    p2.surname);
    chk('sex',     p1.sex,        p2.sex);
    chk('birth.date', p1.birth?.date, p2.birth?.date);
    chk('famc[0]', p1.famc?.[0]?.famId, p2.famc?.[0]?.famId);
  } else {
    console.warn('  Person 1 nicht in DB2 gefunden');
  }

  const allOk = results.every(Boolean);
  console.log(`\nErgebnis: ${allOk ? '✓ ROUNDTRIP OK' : '✗ DELTA vorhanden'}`);
  return { db1, db2, blob };
}
