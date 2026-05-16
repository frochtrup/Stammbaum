// ─────────────────────────────────────
//  BEZIEHUNGSRECHNER
// ─────────────────────────────────────

function _relLabel(distA, distB, sexA) {
  const f = sexA === 'F';
  if (distA === 0) {
    if (distB === 1) return f ? 'Mutter' : 'Vater';
    if (distB === 2) return f ? 'Großmutter' : 'Großvater';
    if (distB === 3) return f ? 'Urgroßmutter' : 'Urgroßvater';
    return 'Ur'.repeat(distB - 2) + (f ? 'großmutter' : 'großvater');
  }
  if (distB === 0) {
    if (distA === 1) return f ? 'Tochter' : 'Sohn';
    if (distA === 2) return f ? 'Enkelin' : 'Enkel';
    if (distA === 3) return f ? 'Urenkelin' : 'Urenkel';
    return 'Ur'.repeat(distA - 2) + (f ? 'enkelin' : 'enkel');
  }
  const m = Math.min(distA, distB), M = Math.max(distA, distB);
  const isOlder = distA < distB;
  if (m === 1) {
    if (M === 1) return 'Geschwister';
    const gen = M - 1;
    if (isOlder) {
      if (gen === 1) return f ? 'Tante' : 'Onkel';
      if (gen === 2) return f ? 'Großtante' : 'Großonkel';
      return 'Ur'.repeat(gen - 2) + (f ? 'großtante' : 'großonkel');
    } else {
      if (gen === 1) return f ? 'Nichte' : 'Neffe';
      if (gen === 2) return f ? 'Großnichte' : 'Großneffe';
      return 'Ur'.repeat(gen - 2) + (f ? 'großnichte' : 'großneffe');
    }
  }
  const degree = m - 1, removed = M - m;
  const base = f ? 'Cousine' : 'Cousin';
  return removed ? `${base} ${degree}. Grads, ${removed}× entfernt` : `${base} ${degree}. Grads`;
}

function calcRelationship(idA, idB) {
  if (!idA || !idB || idA === idB) return null;
  const DEPTH = 12;
  function bfsUp(startId) {
    const vis = new Map();
    const q = [[startId, 0, [startId]]];
    while (q.length) {
      const [id, dist, path] = q.shift();
      if (vis.has(id)) continue;
      vis.set(id, { dist, path });
      if (dist >= DEPTH) continue;
      const { father, mother } = getParentIds(id);
      if (father && !vis.has(father)) q.push([father, dist + 1, [...path, father]]);
      if (mother && !vis.has(mother)) q.push([mother, dist + 1, [...path, mother]]);
    }
    return vis;
  }
  const ancA = bfsUp(idA), ancB = bfsUp(idB);
  let best = null, multiCount = 0;
  for (const [id, infoA] of ancA) {
    const infoB = ancB.get(id);
    if (!infoB) continue;
    const total = infoA.dist + infoB.dist;
    if (!best || total < best.total) { best = { id, distA: infoA.dist, distB: infoB.dist, total, pathA: infoA.path, pathB: infoB.path }; multiCount = 1; }
    else if (total === best.total) multiCount++;
  }
  if (!best) return { label: 'Nicht verwandt', path: [] };
  const path = [...best.pathA, ...best.pathB.slice(0, -1).reverse()];
  const sexA = AppState.db.individuals[idA]?.sex || 'U';
  return { label: _relLabel(best.distA, best.distB, sexA), distA: best.distA, distB: best.distB, path, commonId: best.id, multiPath: multiCount > 1 };
}

// ─────────────────────────────────────
//  PERSON LIST
// ─────────────────────────────────────
let _personSort = 'name'; // 'name' | 'date'
let _kekuleMap = {};

function _buildKekuleMap() {
  _kekuleMap = {};
  const walk = (id, k, depth) => {
    if (!id || depth > 8 || !AppState.db.individuals[id] || _kekuleMap[id]) return;
    _kekuleMap[id] = k;
    const { father, mother } = getParentIds(id);
    walk(father, k * 2,     depth + 1);
    walk(mother, k * 2 + 1, depth + 1);
  };
  walk(getProbandId(), 1, 0);
}

// Virtual scroll state (persons)
const _vsP = { active: false, items: [], offsets: [], total: 0,
               r: null, top: null, mid: null, bot: null, fn: null, sc: null };

function togglePersonSort() {
  _personSort = _personSort === 'name' ? 'date' : 'name';
  const btn = document.getElementById('personSortBtn');
  if (btn) btn.textContent = _personSort === 'date' ? '⇅ Geb.' : '⇅ Name';
  applyPersonFilter();
}

function _personRowHtml(p, isCurrent, pos, total) {
  const sc = p.sex === 'M' ? 'm' : p.sex === 'F' ? 'f' : '';
  const ic = p.sex === 'M' ? '♂' : p.sex === 'F' ? '♀' : '◇';
  let meta = '';
  if (p.birth.date) meta += '* ' + p.birth.date;
  if (p.birth.place) meta += (meta ? ', ' : '') + compactPlace(p.birth.place);
  if (p.death.date) meta += (meta ? '  † ' : '† ') + p.death.date;
  const pMediaCount = (p.media || []).filter(m => m.file || m.title).length
                    + (p._passthrough || []).filter(l => /^1 OBJE @/.test(l)).length;
  const pMediaBadge = pMediaCount ? `<span class="p-media-badge">📎</span>` : '';
  const kNum = _kekuleMap[p.id];
  const kBadge = kNum ? `<span class="p-kekule">#${kNum}</span>` : '';
  const ariaPos = pos != null ? ` aria-setsize="${total}" aria-posinset="${pos}"` : '';
  return `<div class="person-row${isCurrent ? ' current' : ''}" role="listitem"${ariaPos} data-action="showDetail" data-pid="${p.id}">
      <div class="p-avatar ${sc}">${ic}</div>
      <div class="p-info">
        <div class="p-name">${esc(p.name || p.id)}${pMediaBadge}<span class="p-id">${esc(p.id)}</span></div>
        <div class="p-meta">${esc(meta) || '&nbsp;'}</div>
      </div>
      ${kBadge}<span class="p-arrow">›</span>
    </div>`;
}

function renderPersonList(persons) {
  _buildKekuleMap();
  const sorted = [...persons].sort((a, b) => {
    if (_personSort === 'date') {
      const ka = gedDateSortKey(a.birth.date), kb = gedDateSortKey(b.birth.date);
      if (ka !== kb) return (ka || 99999999) - (kb || 99999999);
    }
    const c = (a.surname || '').localeCompare(b.surname || '', 'de');
    if (c !== 0) return c;
    return (a.given || '').localeCompare(b.given || '', 'de');
  });
  const listEl = document.getElementById('personList');
  if (!sorted.length) {
    _vsTeardown(_vsP);
    const totalPersons = Object.keys(AppState.db.individuals || {}).length;
    if (totalPersons === 0) {
      listEl.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">◇</div>
        <div class="empty-state-title">Noch keine Personen</div>
        <div class="empty-state-msg">Importieren Sie eine GEDCOM- oder GRAMPS-Datei, oder legen Sie die erste Person manuell an.</div>
        <button class="empty-state-btn" onclick="showPersonForm(null)">Erste Person anlegen</button>
      </div>`;
    } else {
      listEl.innerHTML = '<div class="empty">Keine Treffer zur Suche</div>';
    }
    _announceList('Keine Personen');
    return;
  }

  if (sorted.length <= _VS_MIN) {
    // ── Normales Rendering (kleine Liste) ──
    _vsTeardown(_vsP);
    let html = '', lastSep = '';
    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      let sep;
      if (_personSort === 'date') {
        const key = gedDateSortKey(p.birth.date);
        sep = key ? Math.floor(Math.floor(key / 10000) / 10) + '0er' : '?';
      } else {
        sep = (p.surname || p.given || p.name || '?')[0].toUpperCase();
      }
      if (sep !== lastSep) { html += `<div class="alpha-sep">${sep}</div>`; lastSep = sep; }
      html += _personRowHtml(p, false, i + 1, sorted.length);
    }
    listEl.innerHTML = html;
    _announceList(sorted.length + (sorted.length === 1 ? ' Person' : ' Personen'));
    if (AppState.currentPersonId) {
      const cur = listEl.querySelector(`[data-pid="${AppState.currentPersonId}"]`);
      if (cur) {
        cur.classList.add('current');
        const container = document.getElementById('v-main') || listEl.closest('.view');
        requestAnimationFrame(() => _scrollListToCurrent(container, cur));
      }
    }
    return;
  }

  // ── Virtuelles Rendering (große Liste) ──
  _vsP.items   = [];
  _vsP.offsets = [];
  let offset = 0, lastSep = '', personPos = 0;
  const curId = AppState.currentPersonId;

  for (const p of sorted) {
    let sep;
    if (_personSort === 'date') {
      const key = gedDateSortKey(p.birth.date);
      sep = key ? Math.floor(Math.floor(key / 10000) / 10) + '0er' : '?';
    } else {
      sep = (p.surname || p.given || p.name || '?')[0].toUpperCase();
    }
    if (sep !== lastSep) {
      _vsP.items.push({ px: _VS_SEP, s: `<div class="alpha-sep">${sep}</div>` });
      _vsP.offsets.push(offset);
      offset += _VS_SEP;
      lastSep = sep;
    }
    personPos++;
    _vsP.items.push({ px: _VS_ROW, s: _personRowHtml(p, p.id === curId, personPos, sorted.length), id: p.id });
    _vsP.offsets.push(offset);
    offset += _VS_ROW;
  }
  _vsP.total = offset;

  _vsSetup(listEl, _vsP);
  _announceList(sorted.length + (sorted.length === 1 ? ' Person' : ' Personen'));

  // Zum aktuellen Eintrag scrollen
  if (curId) {
    const idx = _vsP.items.findIndex(it => it.id === curId);
    if (idx >= 0) {
      requestAnimationFrame(() => {
        const sc  = _vsP.sc;
        const iOff = _vsP.offsets[idx];
        const viewH = sc ? sc.clientHeight : window.innerHeight;
        const scTop = sc ? sc.scrollTop : window.scrollY;
        const lr  = listEl.getBoundingClientRect();
        const sr  = sc ? sc.getBoundingClientRect().top : 0;
        const lstAbs = scTop + lr.top - sr;
        const target = Math.max(0, lstAbs + iOff - viewH / 2 + _VS_ROW / 2);
        if (sc) sc.scrollTop = target; else window.scrollTo(0, target);
      });
    }
  }
}

function _scrollListToCurrent(container, cur) {
  if (!container || !cur) return;
  const cRect = container.getBoundingClientRect();
  const eRect = cur.getBoundingClientRect();
  const offset = eRect.top - cRect.top - (cRect.height / 2) + (eRect.height / 2);
  container.scrollTop += offset;
}

// VS: Item in sichtbaren Bereich scrollen + re-rendern + current-Klasse setzen
function _vsScrollAndHighlight(st, listEl, idx, dataAttr, id) {
  const sc    = st.sc;
  const iOff  = st.offsets[idx];
  const viewH = sc ? sc.clientHeight : window.innerHeight;
  const scCur = sc ? sc.scrollTop : window.scrollY;
  const lr    = listEl.getBoundingClientRect();
  const sr    = sc ? sc.getBoundingClientRect().top : 0;
  const lstAbs = scCur + lr.top - sr;
  const rel   = scCur - lstAbs;

  // Wenn Item nicht sichtbar → Liste scrollen, um es zu zentrieren
  if (iOff < rel || iOff + _VS_ROW > rel + viewH) {
    const target = Math.max(0, lstAbs + iOff - viewH / 2 + _VS_ROW / 2);
    if (sc) sc.scrollTop = target; else window.scrollTo(0, target);
  }
  // VS sofort neu rendern (Desktop: sc.scrollTop ist synchron, mobile: bestes Effort)
  st.r = null;
  _vsRender(listEl, st);
  const cur = st.mid?.querySelector(`[${dataAttr}="${id}"]`);
  if (cur) cur.classList.add('current');
}

function _updatePersonListCurrent(id) {
  if (_vsP.active) {
    _vsP.items.forEach(it => {
      if (!it.id) return;
      const isCur = it.id === id, wasCur = it.s.includes(' current"');
      if (isCur && !wasCur) it.s = it.s.replace('"person-row"', '"person-row current"');
      else if (!isCur && wasCur) it.s = it.s.replace('"person-row current"', '"person-row"');
    });
    if (_vsP.mid) _vsP.mid.querySelectorAll('.person-row.current').forEach(el => el.classList.remove('current'));
    if (!id) return;
    const idx = _vsP.items.findIndex(it => it.id === id);
    if (idx >= 0) _vsScrollAndHighlight(_vsP, document.getElementById('personList'), idx, 'data-pid', id);
    return;
  }
  const list = document.getElementById('personList');
  if (!list) return;
  list.querySelectorAll('.person-row.current').forEach(el => el.classList.remove('current'));
  if (!id) return;
  const cur = list.querySelector(`[data-pid="${id}"]`);
  if (!cur) return;
  cur.classList.add('current');
  _scrollListToCurrent(document.getElementById('v-main'), cur);
}

// Virtual scroll state (families) — deklariert hier, da _updateFamilyListCurrent hier steht
const _vsF = { active: false, items: [], offsets: [], total: 0,
               r: null, top: null, mid: null, bot: null, fn: null, sc: null };

function _updateFamilyListCurrent(id) {
  if (_vsF.active) {
    _vsF.items.forEach(it => {
      if (!it.id) return;
      const isCur = it.id === id, wasCur = it.s.includes(' current"');
      if (isCur && !wasCur) it.s = it.s.replace('"person-row"', '"person-row current"');
      else if (!isCur && wasCur) it.s = it.s.replace('"person-row current"', '"person-row"');
    });
    if (_vsF.mid) _vsF.mid.querySelectorAll('.person-row.current').forEach(el => el.classList.remove('current'));
    if (!id) return;
    const idx = _vsF.items.findIndex(it => it.id === id);
    if (idx >= 0) _vsScrollAndHighlight(_vsF, document.getElementById('familyList'), idx, 'data-fid', id);
    return;
  }
  const list = document.getElementById('familyList');
  if (!list) return;
  list.querySelectorAll('.person-row.current').forEach(el => el.classList.remove('current'));
  if (!id) return;
  const cur = list.querySelector(`[data-fid="${id}"]`);
  if (!cur) return;
  cur.classList.add('current');
  _scrollListToCurrent(document.getElementById('v-main'), cur);
}

function applyPersonFilter() {
  const q          = (document.getElementById('searchInput')?.value)      || '';
  const from       = parseInt(document.getElementById('yearFrom')?.value)  || null;
  const to         = parseInt(document.getElementById('yearTo')?.value)    || null;
  const sex        = document.getElementById('sexFilter')?.value           || '';
  const birthPlace = (document.getElementById('birthPlaceFilter')?.value)  || '';
  const clearBtn   = document.getElementById('yearFilterClear');
  if (clearBtn) clearBtn.hidden = !(from || to);
  _applyPersonFilterDebounced(q, from, to, sex, birthPlace);
}

function clearYearFilter() {
  const f = document.getElementById('yearFrom');
  const t = document.getElementById('yearTo');
  if (f) f.value = '';
  if (t) t.value = '';
  applyPersonFilter();
}

function toggleAdvFilter() {
  const panel  = document.getElementById('advFilterPanel');
  const toggle = document.getElementById('advFilterToggle');
  if (!panel) return;
  const isOpen = !panel.hidden && panel.style.display !== 'none';
  if (isOpen) {
    panel.hidden = true;
    panel.style.display = 'none';
    if (toggle) { toggle.style.color = 'var(--text-dim)'; toggle.setAttribute('aria-expanded', 'false'); }
    const sf = document.getElementById('sexFilter');
    const bp = document.getElementById('birthPlaceFilter');
    if (sf) sf.value = '';
    if (bp) bp.value = '';
    applyPersonFilter();
  } else {
    panel.hidden = false;
    panel.style.display = 'block';
    if (toggle) { toggle.style.color = 'var(--gold-dim)'; toggle.setAttribute('aria-expanded', 'true'); }
  }
}

function _buildSearchIndex() {
  for (const p of Object.values(AppState.db.individuals)) {
    p._searchStr = [
      p.id,
      p.name, p.surname, p.given, p.prefix, p.titl,
      p.nick, p.rufname,
      ...(p.extraNames || []).map(en => [en.nameRaw, en.given, en.surname, en.prefix, en.suffix].filter(Boolean).join(' ')),
      p.birth.date, p.birth.place,
      p.death.date, p.death.place,
      p.chr.place,  p.buri.place,
      p.reli,       p.noteText,
      ...p.events.map(ev => [ev.value, ev.place, ev.date, ev.eventType].join(' ')),
    ].filter(Boolean).join(' ').toLowerCase();
    p._sdxSurname = germanSoundex(p.surname || '');
    p._sdxGiven   = germanSoundex(p.given   || '');
  }
  UIState._searchIndexDirty = false;
}

function filterPersons(q, yearFrom, yearTo, sex = '', birthPlace = '') {
  const lower      = q.toLowerCase().trim();
  const lowerPlace = birthPlace.toLowerCase().trim();
  const all = Object.values(AppState.db.individuals);

  // Guard `lower &&` ist korrekt: bei leerem lower gibt filterPersons() für jeden
  // Eintrag `return true` (Zeile unten), bevor _searchStr ausgewertet wird.
  // Stale-Index-Werte können also nie ein falsches Ergebnis liefern. Beim nächsten
  // Suchaufruf mit non-empty lower greift der dirty-Pfad und baut korrekt neu.
  if (lower && UIState._searchIndexDirty) _buildSearchIndex();

  const filtered = all.filter(p => {
    // Geschlechtsfilter
    if (sex) {
      if (sex === 'U') { if (p.sex && p.sex !== 'U') return false; }
      else             { if ((p.sex || 'U') !== sex) return false; }
    }
    // Geburtsjahr-Bereich
    if (yearFrom || yearTo) {
      const key = gedDateSortKey(p.birth.date);
      const yr  = key ? Math.floor(key / 10000) : null;
      if (!yr) return false;
      if (yearFrom && yr < yearFrom) return false;
      if (yearTo   && yr > yearTo)   return false;
    }
    // Dedizierter Geburtsort (nur birth.place + chr.place)
    if (lowerPlace) {
      const bp = compactPlace(p.birth.place || p.chr.place || '').toLowerCase();
      if (!bp.includes(lowerPlace)) return false;
    }
    if (!lower) return true;
    if ((p._searchStr || '').includes(lower)) return true;
    if (UIState._soundexMode && /^[a-zäöüß]+$/i.test(lower)) {
      const qSdx = germanSoundex(lower);
      if ((p._sdxSurname || germanSoundex(p.surname)) === qSdx) return true;
      if ((p._sdxGiven   || germanSoundex(p.given))   === qSdx) return true;
    }
    return false;
  });

  renderPersonList(filtered);
}

// ─────────────────────────────────────
//  DETAIL: PERSON
// ─────────────────────────────────────

// Alter in Jahren zwischen zwei GEDCOM-Datumsstrings.
// Gibt '<span class="age-tag">…</span>' zurück oder '' wenn nicht berechenbar.
// ~ wenn mind. eines der Daten unscharf (ABT/BEF/AFT/CAL/EST/BET/FROM/TO).
function _ageAt(refDateStr, evDateStr) {
  if (!refDateStr || !evDateStr) return '';
  const refKey = gedDateSortKey(refDateStr);
  const evKey  = gedDateSortKey(evDateStr);
  if (!refKey || !evKey) return '';
  const refYear = Math.floor(refKey / 10000);
  const refMM   = Math.floor((refKey % 10000) / 100);
  const refDD   = refKey % 100;
  const evYear  = Math.floor(evKey / 10000);
  const evMM    = Math.floor((evKey % 10000) / 100);
  const evDD    = evKey % 100;
  let age = evYear - refYear;
  if (refMM && evMM && (evMM < refMM || (evMM === refMM && refDD && evDD && evDD < refDD))) age--;
  if (age < 0 || age > 130) return '';
  const { qual: rq } = parseGedDate(refDateStr);
  const { qual: eq } = parseGedDate(evDateStr);
  const approx = (rq || eq) ? '~' : '';
  return `<span class="age-tag">${approx}${age} J.</span>`;
}
function _pdetLifeData(p, id) {
  const _hasGeo = [p.birth, p.chr, p.death, p.buri, ...p.events]
    .some(ev => ev && _validCoord(ev.lati, ev.long));
  let html = `<div class="section fade-up" id="pdet-life">
    <div class="section-head">
      <div class="section-title">Lebensdaten</div>
      <div class="det-btn-row">
        ${_hasGeo ? `<button class="section-add c-gold-lt" data-action="showPersonOnMap" data-pid="${id}">📍 Karte</button>` : ''}
        ${UIState._eventClipboard ? `<button class="section-add c-gold-lt" data-action="applyClipboardEvent" data-pid="${id}" title="${esc((EVENT_LABELS[UIState._eventClipboard.type]||UIState._eventClipboard.type) + (UIState._eventClipboard.addr||UIState._eventClipboard.place ? ': '+(UIState._eventClipboard.addr||UIState._eventClipboard.place) : ''))}">+ Übernehmen</button>` : ''}
        <button class="section-add" data-action="showAddAliasFlow" data-pid="${id}">+ Alias</button>
        <button class="section-add" data-action="showEventForm" data-pid="${id}">+ Ereignis</button>
      </div>
    </div>`;

  (p.extraNames || []).forEach((en, enIdx) => {
    const enLabel = en.type ? (NAME_TYPE_LABELS[en.type] || en.type) : 'Weiterer Name';
    const enVal = en.nameRaw
      ? en.nameRaw.replace(/\/([^\/]*)\//g, '$1').trim()
      : [en.prefix, en.given, en.surname, en.suffix].filter(Boolean).join(' ');
    if (enVal) html += `<div class="fact-row fact-row--clickable" data-action="showExtraNameForm" data-pid="${id}" data-enidx="${enIdx}">
      <span class="fact-lbl">${esc(enLabel)}</span>
      <span class="fact-val">${esc(enVal)}${citTagsHtml(en.citations || [])}</span>
    </div>`;
  });

  (p.aliases || []).forEach(aliasXref => {
    const aliasP = AppState.db.individuals[aliasXref];
    if (!aliasP) return;
    html += `<div class="fact-row fact-row--alias" style="align-items:center">
      <span class="fact-lbl">Selbe Person?</span>
      <span class="fact-val" style="flex:1"><span class="alias-name-link" data-action="showDetail" data-id="${aliasXref}">${esc(aliasP.name)}</span></span>
      <button class="unlink-btn" data-action="removeAlias" data-pid="${id}" data-aliasid="${aliasXref}">×</button>
    </div>`;
  });

  // Referenzdatum für Altersberechnung: Geburt, Proxy Taufe
  const _refDate = p.birth.date || p.chr.date || '';

  if (p.birth.date || p.birth.place) {
    const geoBtn = evGeoLink(p.birth.lati, p.birth.long);
    html += `<div class="fact-row fact-row--clickable" data-action="showEventForm" data-pid="${id}" data-ev="BIRT"><span class="fact-lbl">Geburt</span><span class="fact-val">${esc([p.birth.date, compactPlace(p.birth.place)].filter(Boolean).join(', '))}${_placeHierHtml(p.birth.placeId)}${geoBtn}${citTagsHtml(p.birth.citations || [])}${p.birth.note ? `<span class="ev-note">${esc(p.birth.note)}</span>` : ''}</span></div>`;
  }
  const _chrGodparents = (p.associations || []).filter(a => a.rela === 'Godparent' && a.xref && AppState.db.individuals[a.xref]);
  if (p.chr.date || p.chr.place || _chrGodparents.length) {
    const _godparents = _chrGodparents;
    const _gpHtml = _godparents.length
      ? `<div class="event-godparents">${_godparents.map(a => `<span class="asso-chip" data-action="showDetail" data-id="${a.xref}">${esc(AppState.db.individuals[a.xref].name)}</span>`).join('')}</div>`
      : '';
    // Alter bei Taufe nur wenn Geburtsdatum bekannt (nicht wenn Taufe selbst der Proxy ist)
    const _chrAge = p.birth.date ? _ageAt(p.birth.date, p.chr.date) : '';
    html += `<div class="fact-row fact-row--clickable" data-action="showEventForm" data-pid="${id}" data-ev="CHR"><span class="fact-lbl">Taufe</span><span class="fact-val">${esc([p.chr.date, compactPlace(p.chr.place)].filter(Boolean).join(', '))}${_placeHierHtml(p.chr.placeId)}${_chrAge}${citTagsHtml(p.chr.citations || [])}${p.chr.note ? `<span class="ev-note">${esc(p.chr.note)}</span>` : ''}${_gpHtml}</span></div>`;
  }
  if (p.death.date || p.death.place) {
    const geoBtn = evGeoLink(p.death.lati, p.death.long);
    html += `<div class="fact-row fact-row--clickable" data-action="showEventForm" data-pid="${id}" data-ev="DEAT"><span class="fact-lbl">Tod</span><span class="fact-val">${esc([p.death.date, compactPlace(p.death.place), p.death.cause].filter(Boolean).join(', '))}${_placeHierHtml(p.death.placeId)}${_ageAt(_refDate, p.death.date)}${geoBtn}${citTagsHtml(p.death.citations || [])}${p.death.note ? `<span class="ev-note">${esc(p.death.note)}</span>` : ''}</span></div>`;
  }
  if (p.buri.date || p.buri.place) {
    const geoBtn = evGeoLink(p.buri.lati, p.buri.long);
    html += `<div class="fact-row fact-row--clickable" data-action="showEventForm" data-pid="${id}" data-ev="BURI"><span class="fact-lbl">Beerdigung</span><span class="fact-val">${esc([p.buri.date, compactPlace(p.buri.place)].filter(Boolean).join(', '))}${_placeHierHtml(p.buri.placeId)}${_ageAt(_refDate, p.buri.date)}${geoBtn}${citTagsHtml(p.buri.citations || [])}${p.buri.note ? `<span class="ev-note">${esc(p.buri.note)}</span>` : ''}</span></div>`;
  }

  // Alle Quick-Add-Chips in einer Zeile: fehlende Sonder-Events + generische Shortcuts
  const _quickChips = [
    !(p.birth.date || p.birth.place)                         && { ev: 'BIRT', lbl: '+ Geburt' },
    !(p.chr.date  || p.chr.place  || _chrGodparents.length)  && { ev: 'CHR',  lbl: '+ Taufe' },
    !(p.death.date || p.death.place)                         && { ev: 'DEAT', lbl: '+ Tod' },
    !(p.buri.date  || p.buri.place)                          && { ev: 'BURI', lbl: '+ Beerdigung' },
    { ev: 'RESI', lbl: '+ Wohnort', generic: true },
    { ev: 'OCCU', lbl: '+ Beruf',   generic: true },
    { ev: 'CENS', lbl: '+ Zählung', generic: true },
  ].filter(Boolean);
  html += `<div class="missing-events-row">${_quickChips.map(m =>
    `<button class="quick-chip${m.generic ? ' quick-chip--generic' : ''}" data-action="showEventFormTyped" data-pid="${id}" data-evtype="${m.ev}">${m.lbl}</button>`
  ).join('')}</div>`;

  // Alle bekannten Hof-Notiztexte vorberechnen — verhindert Anzeige von HOF-Notiztexten
  // auf Events, deren Adresse NICHT zu diesem Hof gehört (durch _resolveNoteRefs gestreut).
  const _allHofNoteTexts = new Set(
    Object.values(AppState.db.hofObjects || {}).map(h => h.note).filter(Boolean)
  );
  // Hof-Notiz-Dedup: pro Adresse nur einmal anzeigen
  const _shownAddrNotes = new Set();

  // Group events: first by ev.type (first-seen order), then by ev.eventType within each type,
  // sort within each subgroup by date (undated last).
  const _evTypeOrder = [];
  const _evTypeSet = new Set();
  // type → Map(eventType → [{ev,idx}])
  const _evGroups = new Map();
  p.events.forEach((ev, idx) => {
    if (!_evTypeSet.has(ev.type)) { _evTypeOrder.push(ev.type); _evTypeSet.add(ev.type); }
    if (!_evGroups.has(ev.type)) _evGroups.set(ev.type, new Map());
    const subKey = ev.eventType || '';
    const subMap = _evGroups.get(ev.type);
    if (!subMap.has(subKey)) subMap.set(subKey, []);
    subMap.get(subKey).push({ev, idx});
  });
  for (const subMap of _evGroups.values())
    for (const items of subMap.values())
      items.sort((a, b) => evDateKey(a.ev.date).localeCompare(evDateKey(b.ev.date)));
  for (const type of _evTypeOrder)
    for (const items of _evGroups.get(type).values()) {
      for (const {ev, idx} of items) {
        const _evBase = EVENT_LABELS[ev.type] || ev.type;
        const label = (ev.eventType && (ev.type === 'EVEN' || ev.type === 'FACT'))
          ? ev.eventType
          : (ev.eventType ? `${_evBase}: ${ev.eventType}` : _evBase);
        const geoBtn = evGeoLink(ev.lati, ev.long);
        const parts = [ev.value, ev.addr, ev.date, compactPlace(ev.place)].filter(Boolean).join(', ');
        const evAge = _ageAt(_refDate, ev.date);
        const mediaBadge = (ev.media?.length > 0) ? `<span class="p-media-ev-badge">📎${ev.media.length}</span>` : '';
        // Hof-Notiz: nur zeigen wenn dieses konkrete Event via noteRefs auf die Hof-Notiz verweist
        const _addrKey = ev.addr?.trim() || null;
        const _hofNote = _addrKey ? (AppState.db.hofObjects?.[_addrKey]?.note || null) : null;
        const _evRefersToHofNote = _hofNote && (ev.noteRefs || []).some(
          r => AppState.db.notes?.[r]?.text === _hofNote
        );
        const _showHofNote = _evRefersToHofNote && !_shownAddrNotes.has(_addrKey);
        if (_showHofNote) _shownAddrNotes.add(_addrKey);
        // Anzuzeigende Notiz aus den Einzelteilen rekonstruieren — ev.note ist
        // nach _resolveNoteRefs eine Konkatenation aller Refs inkl. aller Hof-Notizen,
        // daher ungeeignet für Vergleiche. Stattdessen: ev._noteOrig (Inline-Anteil)
        // + alle noteRefs deren Text KEINE bekannte Hof-Notiz ist.
        const _nonHofParts = [
          (ev._noteOrig && !_allHofNoteTexts.has(ev._noteOrig)) ? ev._noteOrig : null,
          ...(ev.noteRefs || []).map(r => {
            const t = AppState.db.notes?.[r]?.text;
            return (t && !_allHofNoteTexts.has(t)) ? t : null;
          }),
        ].filter(Boolean);
        const _combinedNote = _nonHofParts.join('\n') || null;
        const _evNoteKey = _combinedNote ? ((_addrKey ? `${_addrKey}\x00` : '\x00') + _combinedNote) : null;
        const _showEvNote = _combinedNote && (!_evNoteKey || !_shownAddrNotes.has(_evNoteKey));
        if (_evNoteKey && _showEvNote) _shownAddrNotes.add(_evNoteKey);
        html += `<div class="fact-row fact-row--clickable" data-action="showEventForm" data-pid="${id}" data-ev="${idx}">
          <span class="fact-lbl">${esc(label)}</span>
          <span class="fact-val">${esc(parts)}${_placeHierHtml(ev.placeId)}${evAge}${geoBtn}${citTagsHtml(ev.citations || [])}${mediaBadge}${_showHofNote ? `<span class="ev-note">${esc(_hofNote)}</span>` : ''}${_showEvNote ? `<span class="ev-note">${esc(_combinedNote)}</span>` : ''}</span>
        </div>`;
      }
    }

  if (p.titl) html += factRow('Titel', p.titl);
  if (p.reli) html += factRow('Religion', p.reli);
  if (p.resn)  html += factRow('Beschränkung', p.resn);
  if (p.email) html += `<div class="fact-row"><span class="fact-lbl">E-Mail</span><span class="fact-val"><a href="mailto:${esc(p.email)}" class="person-email-link">${esc(p.email)}</a></span></div>`;
  if (p.www)   html += `<div class="fact-row"><span class="fact-lbl">Website</span><span class="fact-val"><a href="${safeLinkHref(p.www)}" target="_blank" rel="noopener" class="person-www-link">${esc(p.www)}</a></span></div>`;
  if (p._grampsTags?.length) html += `<div class="fact-row"><span class="fact-lbl">Tags</span><span class="fact-val">${p._grampsTags.map(t => `<span class="gramps-tag" style="background:${esc(t.color||'#888')}">${esc(t.name)}</span>`).join('')}</span></div>`;
  if (p._grampsAttrs?.length) html += p._grampsAttrs.map(a => `<div class="fact-row"><span class="fact-lbl">${esc(a.type)}</span><span class="fact-val">${esc(a.value)}${a.note ? `<div class="note-text">${esc(a.note)}</div>` : ''}</span></div>`).join('');

  if (!p.birth.date && !p.death.date && !p.events.length && !p.chr.date && !p.buri.date)
    html += `<div class="no-data">Keine Lebensdaten eingetragen</div>`;

  html += `</div>`;
  return html;
}

function showDetail(id, pushHistory = true) {
  const p = AppState.db.individuals[id];
  if (!p) return;
  if (pushHistory) _beforeDetailNavigate();
  AppState.currentPersonId  = id;
  AppState.currentFamilyId  = null;
  AppState.currentSourceId  = null;
  AppState.currentRepoId    = null;
  AppState.currentPlaceName = null;
  if (document.body.classList.contains('desktop-mode')) {
    if (AppState.currentTab === 'persons') _updatePersonListCurrent(id); else _updatePersonListCurrent(null);
    _updateFamilyListCurrent(null);
  }

  document.getElementById('detailTopTitle').textContent = p.name || id;
  document.getElementById('editBtn').style.display = '';
  document.getElementById('treeBtn').hidden = false;
  document.getElementById('treeBtn').dataset.id = id;
  const pb = document.getElementById('probandBtn');
  if (pb) {
    pb.hidden = false;
    pb.dataset.id = id;
    const isProband = getProbandId() === id;
    pb.classList.toggle('proband-active', isProband);
    pb.title = isProband ? 'Ist Proband (klicken zum Zurücksetzen)' : 'Als Proband setzen';
  }

  const sc = p.sex === 'M' ? 'm' : p.sex === 'F' ? 'f' : '';
  const ic = p.sex === 'M' ? '♂' : p.sex === 'F' ? '♀' : '◇';

  const fullName = [p.prefix, p.name, p.suffix].filter(Boolean).join(' ');
  const rufname  = p._rufname || p._grampsCall || '';
  const spitzname = (p.nick && p.nick !== rufname) ? p.nick : '';

  let html = `<div class="detail-hero fade-up">
    <div id="det-photo-${id}" class="det-photo-wrap"></div>
    <div id="det-avatar-${id}" class="detail-avatar ${sc}">${ic}</div>
    <div class="detail-hero-text">
      <div class="detail-name">${esc(fullName || id)} <span class="fs-md ${sc === 'm' ? 'sex-icon-m' : sc === 'f' ? 'sex-icon-f' : 'sex-icon-u'}">${ic}</span></div>
      ${rufname  ? `<div class="detail-rufname">Rufname: <u>${esc(rufname)}</u></div>` : ''}
      ${spitzname ? `<div class="detail-rufname detail-spitzname">Spitzname: ${esc(spitzname)}</div>` : ''}
      <div class="detail-id"><span class="detail-id-xref">${esc(id)}</span>${p.lastChanged ? ' · Geändert ' + p.lastChanged : ''}</div>
    </div>
  </div>`;

  html += _pdetLifeData(p, id);

  // Assoziationen (alle außer Godparent — der steht bereits unter der Taufe-Zeile)
  // Patenkinder werden dynamisch berechnet: alle Personen, die diesen als 'Godparent' führen
  const _computedGodchildren = Object.entries(AppState.db.individuals)
    .filter(([cid, cp]) => cid !== id && (cp.associations || []).some(a => a.rela === 'Godparent' && a.xref === id))
    .map(([cid]) => ({ xref: cid, rela: 'Godchild', _derived: true }));
  const _storedNonGp = (p.associations || []).filter(a => a.rela !== 'Godparent' && a.xref && AppState.db.individuals[a.xref]);
  // Gespeicherte Godchild-Einträge deduplizieren (könnten schon via UI-Sync da sein)
  const _gcXrefs = new Set(_computedGodchildren.map(a => a.xref));
  const _storedGc = _storedNonGp.filter(a => a.rela === 'Godchild' && !_gcXrefs.has(a.xref) && AppState.db.individuals[a.xref]);
  const _displayAssos = [..._storedNonGp.filter(a => a.rela !== 'Godchild'), ..._storedGc, ..._computedGodchildren];
  if (_displayAssos.length) {
    const _assoByRela = {};
    for (const a of _displayAssos) {
      if (!_assoByRela[a.rela]) _assoByRela[a.rela] = [];
      _assoByRela[a.rela].push(a);
    }
    html += `<div class="section fade-up"><div class="section-head"><div class="section-title">Assoziationen</div></div><div class="section-body">`;
    for (const [rela, assos] of Object.entries(_assoByRela)) {
      const label = (typeof RELA_LABELS !== 'undefined' && RELA_LABELS[rela]) || rela;
      const chips = assos.map(a => `<span class="asso-chip${a._derived ? ' asso-chip--derived' : ''}" data-action="showDetail" data-id="${a.xref}" title="${a._derived ? 'Abgeleitet (nicht im Datenmodell gespeichert)' : ''}">${esc(AppState.db.individuals[a.xref].name)}</span>`).join('');
      html += `<div class="fact-row"><span class="fact-lbl">${esc(label)}</span><span class="fact-val"><div class="event-godparents">${chips}</div></span></div>`;
    }
    html += `</div></div>`;
  }

  // Verwandtschaft zum Probanden
  const _probandId = getProbandId();
  if (_probandId && id !== _probandId) {
    const _rel = calcRelationship(id, _probandId);
    if (_rel && _rel.label !== 'Nicht verwandt') {
      const _probandName = AppState.db.individuals[_probandId]?.name || 'Proband';
      html += `<div class="section fade-up">
        <div class="section-head"><div class="section-title">Verwandtschaft</div></div>
        <div class="fact-row fact-row--clickable" data-action="showRelPath" data-pid="${id}">
          <span class="fact-lbl">${esc(_probandName)}</span>
          <span class="fact-val rel-val-italic">${esc(_rel.label)}<span class="p-arrow ml-6">›</span></span>
        </div>
      </div>`;
    }
  }

  // Notizen
  const _pNoteText = p.noteText || '';
  const _pHasRefs  = (p.noteRefs || []).some(r => AppState.db.notes?.[r]);
  html += `<div class="section fade-up" id="pdet-notes">
    <div class="section-head">
      <div class="section-title">Notizen${_pHasRefs ? ` <span class="fs-xxs c-muted fw-400">(+ verknüpfte)</span>` : ''}</div>
      <button class="section-add" data-action="openNoteModal" data-ntype="person" data-nid="${id}">✎ Bearbeiten</button>
    </div>
    <div class="note-clickable" data-action="openNoteModal" data-ntype="person" data-nid="${id}">
      ${_pNoteText
        ? `<div class="note-text">${esc(_pNoteText)}</div>`
        : `<div class="note-hint">Notiz hinzufügen…</div>`}
    </div>
  </div>`;

  // Media section: inline entries from media[] + reference entries from passthrough
  const indiMedia = p.media || [];
  const indiPtObje = (p._passthrough || []).filter(l => /^1 OBJE @/.test(l));
  {
    const _objeMap = _buildObjeRefMap();
    html += `<div class="section fade-up" id="pdet-media">
      <div class="section-head">
        <div class="section-title">Medien</div>
        <button class="section-add" data-action="openAddMediaDialog" data-ctx="person" data-id="${id}">+ Hinzufügen</button>
      </div>`;
    for (let i = 0; i < indiMedia.length; i++) {
      const m = indiMedia[i];
      const display = m.title || m.file || '–';
      const sub = m.title && m.file ? m.file : '';
      const _ext = (m.file || '').split('.').pop().toLowerCase();
      const _isImg = ['jpg','jpeg','png','gif','bmp','webp','tif','tiff'].includes(_ext);
      const _icon = _isImg ? '🖼' : _ext === 'pdf' ? '📄' : '📎';
      html += `<div class="media-row"
        data-action="openMediaPhoto" data-media-file="${esc(m.file || '')}" data-hero="det-photo-${id}" data-avatar="det-avatar-${id}">
        <div id="media-thumb-indi-${id}-${i}" class="media-thumb">${_icon}</div>
        <div class="media-info">
          <div class="media-title">${esc(display)}</div>
          ${sub ? `<div class="media-sub">${esc(sub)}</div>` : ''}
        </div>
        <button class="edit-media-btn" data-action="openEditMediaDialog" data-ctx="person" data-id="${id}" data-idx="${i}" title="Bearbeiten">✎</button>
      </div>`;
    }
    for (const l of indiPtObje) {
      const ref = l.replace(/^1 OBJE\s+/, '').trim();
      const obj = _objeMap[ref];
      const label = obj ? (obj.title || obj.file || ref) : ref;
      const sub   = obj && obj.title && obj.file ? obj.file : '';
      const _ext2 = (obj?.file || '').split('.').pop().toLowerCase();
      const _icon2 = ['jpg','jpeg','png','gif','bmp','webp'].includes(_ext2) ? '🖼' : _ext2 === 'pdf' ? '📄' : '📎';
      html += `<div class="media-row--ref">
        <div class="media-thumb">${_icon2}</div>
        <div class="media-info">
          <div class="media-title">${esc(label)}</div>
          ${sub ? `<div class="media-sub">${esc(sub)}</div>` : ''}
          <div class="media-ref-label">Verweis</div>
        </div>
      </div>`;
    }
    if (!indiMedia.length && !indiPtObje.length) html += `<div class="no-data-pad">Keine Medien eingetragen</div>`;
    html += `</div>`;
  }

  // As spouse — immer anzeigen (Button auch wenn noch keine Familie)
  html += `<div class="section fade-up" id="pdet-family">
    <div class="section-head">
      <div class="section-title">Ehepartner &amp; Kinder</div>
      <button class="section-add" data-action="showAddSpouseFlow" data-pid="${id}">+ Ehepartner</button>
    </div>`;
  const nFams = p.fams.length;
  for (let _fi = 0; _fi < nFams; _fi++) {
    const famId = p.fams[_fi];
    const fam = AppState.db.families[famId];
    if (!fam) continue;
    const marriageLabel = fam.marr.date ? fam.marr.date : famId;
    const upBtn   = nFams > 1 && _fi > 0
      ? `<button class="fam-order-btn" data-action="moveFamUp"   data-pid="${id}" data-fid="${famId}" title="Früher">↑</button>` : '';
    const downBtn = nFams > 1 && _fi < nFams - 1
      ? `<button class="fam-order-btn" data-action="moveFamDown" data-pid="${id}" data-fid="${famId}" title="Später">↓</button>` : '';
    html += `<div class="family-nav-row" data-action="showFamilyDetail" data-id="${famId}">
      <span class="fnr-label"><span class="fnr-icon">⚭</span> Familie · ${esc(marriageLabel)}</span>
      <span class="fnr-reorder">${upBtn}${downBtn}<span class="row-arrow">›</span></span>
    </div>`;
    const partnerId = p.sex === 'M' ? fam.wife : fam.husb;
    const partner = partnerId ? AppState.db.individuals[partnerId] : null;
    if (partner) html += relRow(partner, 'Ehepartner' + (fam.marr.date ? ' · ' + fam.marr.date : ''), famId);
    for (const cid of _sortedChildren(fam.children)) {
      const child = AppState.db.individuals[cid];
      if (child) html += relRow(child, 'Kind' + (child.birth.date ? ' · * ' + child.birth.date : ''), famId);
    }
    html += `<div class="det-child-btn-row">
      <button class="section-add" data-action="showAddChildFlow" data-fid="${famId}">+ Kind</button>
    </div>`;
  }
  html += `</div>`;

  // Parents — immer anzeigen (Button auch wenn noch keine Eltern)
  html += `<div class="section fade-up" id="pdet-parents">
    <div class="section-head">
      <div class="section-title">Eltern</div>
      <button class="section-add" data-action="showAddParentFlow" data-pid="${id}">+ Elternteil</button>
    </div>`;
  for (const fref of p.famc) {
    const famId = typeof fref === 'string' ? fref : fref.famId;
    const fam = AppState.db.families[famId];
    if (!fam) continue;
    html += `<div class="family-nav-row fam-nav-row-inner">
      <span class="fnr-label fam-nav-label" data-action="showFamilyDetail" data-id="${famId}"><span class="fnr-icon">⚭</span> Herkunftsfamilie · ${famId}</span>
      <button class="unlink-btn" data-action="unlinkMember" data-fid="${famId}" data-pid="${id}"
        title="Aus Herkunftsfamilie austragen">×</button>
      <span class="row-arrow fact-row--clickable" data-action="showFamilyDetail" data-id="${famId}">›</span>
    </div>`;
    for (const pid of [fam.husb, fam.wife]) {
      if (!pid) continue;
      const parent = AppState.db.individuals[pid];
      if (!parent) continue;
      const _pediType = (typeof fref === 'object' && (fref.pedi || fref.frel)) ? _toPedi(fref.pedi || fref.frel) : '';
      const _pediLabels = { adopted:'adoptiert', foster:'Pflegekind', sealing:'Sealing' };
      const _pediSuffix = (_pediLabels[_pediType] ? ' · ' + _pediLabels[_pediType] : '');
      const _role = (parent.sex === 'M' ? 'Vater' : parent.sex === 'F' ? 'Mutter' : 'Elternteil') + _pediSuffix;
      html += relRow(parent, _role);
    }
  }
  html += `</div>`;

  // Aufgaben-Placeholder — wird async befüllt sobald IDB geladen
  html += `<div id="tasks-section-placeholder-${id}" class="section fade-up" data-jump-id="pdet-tasks"></div>`;

  document.getElementById('detailContent').innerHTML = html;
  _injectJumpBar();
  showView('v-detail');
  if (typeof _renderTasksSectionAsync === 'function') _renderTasksSectionAsync(id);

  // Foto async — Pfad (m.file) direkt; IDB path-basiert als Offline-Fallback
  (async () => {
    const _media = p.media || [];
    const _primIdx = Math.max(0, _media.findIndex(m => m.prim && m.prim !== ''));
    const _filePath = _media[_primIdx]?.file;
    const src = (_filePath ? await _odGetMediaUrlByPath(_filePath).catch(() => null) : null)
             || (_filePath ? await idbGet('img:' + _filePath).catch(() => null) : null);
    if (!src) return;
    const el = document.getElementById('det-photo-' + id);
    const av = document.getElementById('det-avatar-' + id);
    if (el) {
      el.style.display = 'block';
      el.innerHTML = '';
      const heroImg = document.createElement('img');
      heroImg.src = src;
      heroImg.alt = 'Foto';
      heroImg.style.cssText = 'width:80px;height:96px;object-fit:cover;border-radius:8px;display:block;flex-shrink:0;cursor:pointer';
      heroImg.addEventListener('click', () => showLightbox(heroImg.src, null, 'det-photo-' + id, 'det-avatar-' + id, null));
      heroImg.onerror = () => { el.style.display = 'none'; if (av) av.style.display = ''; };
      el.appendChild(heroImg);
      if (av) av.style.display = 'none';
    }
  })();
  // Media-Thumbnails async laden — pfad-basiert
  for (let _mi = 0; _mi < indiMedia.length; _mi++) {
    _asyncLoadMediaThumb('media-thumb-indi-' + id + '-' + _mi, indiMedia[_mi].file);
  }
}

function showRelPath(id) {
  const probandId = getProbandId();
  if (!probandId || !id) return;
  const rel = calcRelationship(id, probandId);
  if (!rel) return;

  const pA = AppState.db.individuals[id];
  const pB = AppState.db.individuals[probandId];
  document.getElementById('relPathTitle').textContent =
    `${pA?.name || id} → ${pB?.name || probandId}`;

  const body = document.getElementById('relPathBody');
  if (!rel.path.length) {
    body.innerHTML = `<div class="rel-path-not-found">Keine verwandtschaftliche Verbindung gefunden.</div>`;
  } else {
    const kNum = id => _kekuleMap[id] ? `<span class="p-kekule">#${_kekuleMap[id]}</span>` : '';
    const rows = rel.path.map((pid, i) => {
      const person = AppState.db.individuals[pid];
      const name = person?.name || pid;
      const isCommon = pid === rel.commonId;
      const arrow = i < rel.path.length - 1 ? `<div class="rel-path-arrow">↓</div>` : '';
      return `<div class="rel-path-item${isCommon ? ' rel-path-item--common' : ''}"
        data-action="relPathShowDetail" data-id="${pid}">
        ${isCommon ? `<span class="rel-path-icon">⬡</span>` : `<span class="rel-path-idx">${i + 1}.</span>`}
        <span class="rel-path-name${isCommon ? ' rel-path-name--common' : ''}">${esc(name)}</span>
        ${kNum(pid)}
      </div>${arrow}`;
    }).join('');
    body.innerHTML = `<div class="rel-path-body-title">${esc(rel.label)}</div>
      <div class="rel-path-legend">⬡ = gemeinsamer Vorfahre</div>
      ${rel.multiPath ? `<div class="rel-path-multi">Mehrere Verwandtschaftspfade möglich – kürzester angezeigt.</div>` : '<div class="mb-10"></div>'}
      ${rows}`;
  }

  openModal('modalRelPath');
}

function _injectJumpBar() {
  const SECTIONS = [
    { id: 'pdet-life',    lbl: 'Daten' },
    { id: 'pdet-notes',   lbl: 'Notizen' },
    { id: 'pdet-media',   lbl: 'Medien' },
    { id: 'pdet-family',  lbl: 'Familie' },
    { id: 'pdet-parents', lbl: 'Eltern' },
  ];
  const present = SECTIONS.filter(s => document.getElementById(s.id));
  if (present.length < 3) return;
  const bar = document.createElement('div');
  bar.className = 'jump-bar';
  bar.innerHTML = present.map(s =>
    `<button class="jump-chip" data-action="jumpToSection" data-jump="${s.id}">${s.lbl}</button>`
  ).join('');
  document.getElementById('detailContent').prepend(bar);
}

// ── Familien-Reihenfolge ändern ──
window.moveFamOrder = function (pid, famId, dir) {
  const p = AppState.db.individuals[pid];
  if (!p) return;
  const i = p.fams.indexOf(famId);
  if (i < 0) return;
  const j = i + dir;
  if (j < 0 || j >= p.fams.length) return;
  [p.fams[i], p.fams[j]] = [p.fams[j], p.fams[i]];
  markChanged();
  showDetail(pid);
};

function showAddAliasFlow(pid) {
  UIState._relMode = 'alias'; UIState._relAnchorId = pid;
  document.getElementById('relPickerTitle').textContent = 'Möglichen Doppeleintrag verknüpfen';
  document.getElementById('relPickerSearch').value = '';
  renderRelPicker('');
  openModal('modalRelPicker');
}
