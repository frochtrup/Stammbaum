// ─────────────────────────────────────
//  PERSON LIST
// ─────────────────────────────────────
let _personSort = 'name'; // 'name' | 'date'

// Virtual scroll state (persons)
const _vsP = { active: false, items: [], offsets: [], total: 0,
               r: null, top: null, mid: null, bot: null, fn: null, sc: null };

function togglePersonSort() {
  _personSort = _personSort === 'name' ? 'date' : 'name';
  const btn = document.getElementById('personSortBtn');
  if (btn) btn.textContent = _personSort === 'date' ? '⇅ Geb.' : '⇅ Name';
  applyPersonFilter();
}

function _personRowHtml(p, isCurrent) {
  const sc = p.sex === 'M' ? 'm' : p.sex === 'F' ? 'f' : '';
  const ic = p.sex === 'M' ? '♂' : p.sex === 'F' ? '♀' : '◇';
  let meta = '';
  if (p.birth.date) meta += '* ' + p.birth.date;
  if (p.birth.place) meta += (meta ? ', ' : '') + p.birth.place;
  if (p.death.date) meta += (meta ? '  † ' : '† ') + p.death.date;
  const pMediaCount = (p.media || []).filter(m => m.file || m.title).length
                    + (p._passthrough || []).filter(l => /^1 OBJE @/.test(l)).length;
  const pMediaBadge = pMediaCount ? `<span style="font-size:0.78rem;margin-left:4px;vertical-align:middle;opacity:0.7">📎</span>` : '';
  return `<div class="person-row${isCurrent ? ' current' : ''}" data-action="showDetail" data-pid="${p.id}">
      <div class="p-avatar ${sc}">${ic}</div>
      <div class="p-info">
        <div class="p-name">${esc(p.name || p.id)}${pMediaBadge}</div>
        <div class="p-meta">${esc(meta) || '&nbsp;'}</div>
      </div>
      <span class="p-arrow">›</span>
    </div>`;
}

function renderPersonList(persons) {
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
    listEl.innerHTML = '<div class="empty">Noch keine Personen</div>';
    return;
  }

  if (sorted.length <= _VS_MIN) {
    // ── Normales Rendering (kleine Liste) ──
    _vsTeardown(_vsP);
    let html = '', lastSep = '';
    for (const p of sorted) {
      let sep;
      if (_personSort === 'date') {
        const key = gedDateSortKey(p.birth.date);
        sep = key ? Math.floor(Math.floor(key / 10000) / 10) + '0er' : '?';
      } else {
        sep = (p.surname || p.given || p.name || '?')[0].toUpperCase();
      }
      if (sep !== lastSep) { html += `<div class="alpha-sep">${sep}</div>`; lastSep = sep; }
      html += _personRowHtml(p, false);
    }
    listEl.innerHTML = html;
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
  let offset = 0, lastSep = '';
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
    _vsP.items.push({ px: _VS_ROW, s: _personRowHtml(p, p.id === curId), id: p.id });
    _vsP.offsets.push(offset);
    offset += _VS_ROW;
  }
  _vsP.total = offset;

  _vsSetup(listEl, _vsP);

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
  const q = (document.getElementById('searchInput')?.value) || '';
  const from = parseInt(document.getElementById('yearFrom')?.value) || null;
  const to   = parseInt(document.getElementById('yearTo')?.value)   || null;
  const clearBtn = document.getElementById('yearFilterClear');
  if (clearBtn) clearBtn.style.display = (from || to) ? '' : 'none';
  _applyPersonFilterDebounced(q, from, to);
}

function clearYearFilter() {
  const f = document.getElementById('yearFrom');
  const t = document.getElementById('yearTo');
  if (f) f.value = '';
  if (t) t.value = '';
  applyPersonFilter();
}

function filterPersons(q, yearFrom, yearTo) {
  const lower = q.toLowerCase().trim();
  const all = Object.values(AppState.db.individuals);

  const filtered = all.filter(p => {
    // Jahresfilter (Geburtsjahr) — nutzt gedDateSortKey für korrekte FROM/TO/BET-Auflösung
    if (yearFrom || yearTo) {
      const key = gedDateSortKey(p.birth.date);
      const yr = key ? Math.floor(key / 10000) : null;
      if (!yr) return false;
      if (yearFrom && yr < yearFrom) return false;
      if (yearTo   && yr > yearTo)   return false;
    }
    if (!lower) return true;
    // Name
    if ((p.name||'').toLowerCase().includes(lower)) return true;
    if ((p.surname||'').toLowerCase().includes(lower)) return true;
    if ((p.given||'').toLowerCase().includes(lower)) return true;
    if ((p.prefix||'').toLowerCase().includes(lower)) return true;
    if ((p.titl||'').toLowerCase().includes(lower)) return true;
    // Birth / death / burial / chr
    if ((p.birth.date||'').toLowerCase().includes(lower)) return true;
    if ((p.birth.place||'').toLowerCase().includes(lower)) return true;
    if ((p.death.date||'').toLowerCase().includes(lower)) return true;
    if ((p.death.place||'').toLowerCase().includes(lower)) return true;
    if ((p.chr.place||'').toLowerCase().includes(lower)) return true;
    if ((p.buri.place||'').toLowerCase().includes(lower)) return true;
    // Events: value, place, date, eventType
    for (const ev of p.events) {
      if ((ev.value||'').toLowerCase().includes(lower)) return true;
      if ((ev.place||'').toLowerCase().includes(lower)) return true;
      if ((ev.date||'').toLowerCase().includes(lower)) return true;
      if ((ev.eventType||'').toLowerCase().includes(lower)) return true;
    }
    // Notes
    if ((p.noteText||'').toLowerCase().includes(lower)) return true;
    // Religion
    if ((p.reli||'').toLowerCase().includes(lower)) return true;
    return false;
  });

  renderPersonList(filtered);
}

// ─────────────────────────────────────
//  DETAIL: PERSON
// ─────────────────────────────────────
function showDetail(id, pushHistory = true) {
  const p = AppState.db.individuals[id];
  if (!p) return;
  if (pushHistory) _beforeDetailNavigate();
  AppState.currentPersonId = id;
  AppState.currentFamilyId = null;
  AppState.currentSourceId = null;
  AppState.currentRepoId   = null;
  if (document.body.classList.contains('desktop-mode')) { _updatePersonListCurrent(id); _updateFamilyListCurrent(null); }

  document.getElementById('detailTopTitle').textContent = p.name || id;
  document.getElementById('editBtn').style.display = '';
  document.getElementById('editBtn').onclick = () => showPersonForm(id);
  document.getElementById('treeBtn').style.display = '';
  document.getElementById('treeBtn').onclick = () => showTree(id);
  const pb = document.getElementById('probandBtn');
  if (pb) {
    pb.style.display = '';
    const isProband = getProbandId() === id;
    pb.classList.toggle('proband-active', isProband);
    pb.title = isProband ? 'Ist Proband (klicken zum Zurücksetzen)' : 'Als Proband setzen';
    pb.onclick = () => {
      if (getProbandId() === id) {
        _probandId = null;
        idbPut('proband_id', null).catch(() => {});
        showToast('Proband zurückgesetzt (kleinste ID)');
      } else {
        _probandId = id;
        idbPut('proband_id', id).catch(() => {});
        showToast('Proband: ' + (p.name || id));
      }
      showDetail(id, false);
    };
  }

  const sc = p.sex === 'M' ? 'm' : p.sex === 'F' ? 'f' : '';
  const ic = p.sex === 'M' ? '♂' : p.sex === 'F' ? '♀' : '◇';

  const fullName = [p.prefix, p.name, p.suffix].filter(Boolean).join(' ');

  let html = `<div class="detail-hero fade-up">
    <div id="det-photo-${id}" style="display:none"></div>
    <div id="det-avatar-${id}" class="detail-avatar ${sc}">${ic}</div>
    <div class="detail-hero-text">
      <div class="detail-name">${esc(fullName || id)} <span style="font-size:1rem;color:var(${sc === 'm' ? '--blue' : sc === 'f' ? '--pink' : '--gold-dim'})">${ic}</span></div>
      <div class="detail-id">${p.lastChanged ? 'Geändert ' + p.lastChanged : ''}</div>
    </div>
  </div>`;

  // Life data
  html += `<div class="section fade-up">
    <div class="section-head">
      <div class="section-title">Lebensdaten</div>
      <button class="section-add" data-action="showEventForm" data-pid="${id}">+ Ereignis</button>
    </div>`;

  for (const en of (p.extraNames || [])) {
    const enLabel = en.type ? (NAME_TYPE_LABELS[en.type] || en.type) : 'Weiterer Name';
    const enVal = [en.prefix, en.nameRaw || [en.given, en.surname ? '/'+en.surname+'/' : ''].filter(Boolean).join(' '), en.suffix].filter(Boolean).join(' ');
    if (enVal) html += factRow(enLabel, enVal);
  }

  if (p.birth.date || p.birth.place) {
    const geoBtn = (p.birth.lati !== null && p.birth.lati !== undefined)
      ? `<a href="https://maps.apple.com/?ll=${p.birth.lati},${p.birth.long}" target="_blank" data-action="stop" style="color:var(--gold-dim);font-size:0.75rem;text-decoration:none;margin-left:5px">📍</a>` : '';
    html += `<div class="fact-row" data-action="showEventForm" data-pid="${id}" data-ev="BIRT" style="cursor:pointer"><span class="fact-lbl">Geburt</span><span class="fact-val">${esc([p.birth.date, p.birth.place].filter(Boolean).join(', '))}${geoBtn}${sourceTagsHtml(p.birth.sources)}</span></div>`;
  }
  if (p.chr.date || p.chr.place) {
    html += `<div class="fact-row" data-action="showEventForm" data-pid="${id}" data-ev="CHR" style="cursor:pointer"><span class="fact-lbl">Taufe</span><span class="fact-val">${esc([p.chr.date, p.chr.place].filter(Boolean).join(', '))}${sourceTagsHtml(p.chr.sources)}</span></div>`;
  }
  if (p.death.date || p.death.place) {
    const geoBtn = (p.death.lati !== null && p.death.lati !== undefined)
      ? `<a href="https://maps.apple.com/?ll=${p.death.lati},${p.death.long}" target="_blank" data-action="stop" style="color:var(--gold-dim);font-size:0.75rem;text-decoration:none;margin-left:5px">📍</a>` : '';
    html += `<div class="fact-row" data-action="showEventForm" data-pid="${id}" data-ev="DEAT" style="cursor:pointer"><span class="fact-lbl">Tod</span><span class="fact-val">${esc([p.death.date, p.death.place, p.death.cause].filter(Boolean).join(', '))}${geoBtn}${sourceTagsHtml(p.death.sources)}</span></div>`;
  }
  if (p.buri.date || p.buri.place) {
    const geoBtn = (p.buri.lati !== null && p.buri.lati !== undefined)
      ? `<a href="https://maps.apple.com/?ll=${p.buri.lati},${p.buri.long}" target="_blank" data-action="stop" style="color:var(--gold-dim);font-size:0.75rem;text-decoration:none;margin-left:5px">📍</a>` : '';
    html += `<div class="fact-row" data-action="showEventForm" data-pid="${id}" data-ev="BURI" style="cursor:pointer"><span class="fact-lbl">Beerdigung</span><span class="fact-val">${esc([p.buri.date, p.buri.place].filter(Boolean).join(', '))}${geoBtn}${sourceTagsHtml(p.buri.sources)}</span></div>`;
  }

  // Group events: first by ev.type (first-seen order), then by ev.eventType within each type,
  // sort within each subgroup by date (undated last).
  const _evDateKey = d => {
    if (!d) return '99999999';
    const mo = {JAN:'01',FEB:'02',MAR:'03',APR:'04',MAY:'05',JUN:'06',JUL:'07',AUG:'08',SEP:'09',OCT:'10',NOV:'11',DEC:'12'};
    const yr = (d.match(/\b(\d{4})\b/) || [])[1] || '9999';
    const mStr = (d.match(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/) || [])[1];
    const dyStr = (d.match(/\b(\d{1,2})\b(?=\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC))/) || [])[1];
    return yr + (mStr ? mo[mStr] : '00') + (dyStr ? dyStr.padStart(2,'0') : '00');
  };
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
      items.sort((a, b) => _evDateKey(a.ev.date).localeCompare(_evDateKey(b.ev.date)));
  for (const type of _evTypeOrder)
    for (const items of _evGroups.get(type).values()) {
      for (const {ev, idx} of items) {
        const _evBase = EVENT_LABELS[ev.type] || ev.type;
        const label = (ev.eventType && (ev.type === 'EVEN' || ev.type === 'FACT'))
          ? ev.eventType
          : (ev.eventType ? `${_evBase}: ${ev.eventType}` : _evBase);
        const geoBtn = (ev.lati !== null && ev.lati !== undefined)
          ? `<a href="https://maps.apple.com/?ll=${ev.lati},${ev.long}" target="_blank" style="color:var(--gold-dim);font-size:0.75rem;text-decoration:none;margin-left:5px">📍</a>` : '';
        const parts = [ev.value, ev.date, ev.place].filter(Boolean).join(', ');
        const mediaBadge = (ev.media?.length > 0) ? `<span style="font-size:0.72rem;color:var(--text-dim);margin-left:5px">📎${ev.media.length}</span>` : '';
        html += `<div class="fact-row" data-action="showEventForm" data-pid="${id}" data-ev="${idx}" style="cursor:pointer">
          <span class="fact-lbl">${esc(label)}</span>
          <span class="fact-val">${esc(parts)}${geoBtn}${sourceTagsHtml(ev.sources || [])}${mediaBadge}</span>
        </div>`;
      }
    }

  if (p.titl) html += factRow('Titel', p.titl);
  if (p.reli) html += factRow('Religion', p.reli);
  if (p.resn)  html += factRow('Beschränkung', p.resn);
  if (p.email) html += `<div class="fact-row"><span class="fact-lbl">E-Mail</span><span class="fact-val"><a href="mailto:${esc(p.email)}" style="color:var(--gold)">${esc(p.email)}</a></span></div>`;
  if (p.www)   html += `<div class="fact-row"><span class="fact-lbl">Website</span><span class="fact-val"><a href="${esc(p.www)}" target="_blank" rel="noopener" style="color:var(--gold)">${esc(p.www)}</a></span></div>`;

  if (!p.birth.date && !p.death.date && !p.events.length && !p.chr.date && !p.buri.date)
    html += `<div style="color:var(--text-muted);font-style:italic;font-size:0.85rem">Keine Lebensdaten eingetragen</div>`;

  html += `</div>`;

  // Notes
  if (p.noteText) {
    html += `<div class="section fade-up"><div class="section-title">Notizen</div>
      <div style="font-size:0.88rem;color:var(--text-dim);line-height:1.6;white-space:pre-wrap">${esc(p.noteText)}</div>
    </div>`;
  }

  // Media section: inline entries from media[] + reference entries from passthrough
  const indiMedia = p.media || [];
  const indiPtObje = (p._passthrough || []).filter(l => /^1 OBJE @/.test(l));
  {
    const _objeMap = _buildObjeRefMap();
    html += `<div class="section fade-up">
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
      html += `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border-color);cursor:pointer"
        data-action="openMediaPhoto" data-media-file="${esc(m.file || '')}" data-hero="det-photo-${id}" data-avatar="det-avatar-${id}">
        <div id="media-thumb-indi-${id}-${i}" style="flex-shrink:0;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem;background:var(--bg-card);border-radius:6px;border:1px solid var(--border-color)">${_icon}</div>
        <div style="flex:1;min-width:0">
          <div style="word-break:break-all;font-size:0.88rem;font-weight:500">${esc(display)}</div>
          ${sub ? `<div style="color:var(--text-muted);font-size:0.78rem;word-break:break-all">${esc(sub)}</div>` : ''}
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
      html += `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border-color)">
        <div style="flex-shrink:0;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem;background:var(--bg-card);border-radius:6px;border:1px solid var(--border-color)">${_icon2}</div>
        <div style="flex:1;min-width:0">
          <div style="word-break:break-all;font-size:0.88rem;font-weight:500">${esc(label)}</div>
          ${sub ? `<div style="color:var(--text-muted);font-size:0.78rem;word-break:break-all">${esc(sub)}</div>` : ''}
          <div style="color:var(--text-muted);font-size:0.78rem">Verweis</div>
        </div>
      </div>`;
    }
    if (!indiMedia.length && !indiPtObje.length) html += `<div style="color:var(--text-muted);font-style:italic;font-size:0.85rem;padding:4px 0">Keine Medien eingetragen</div>`;
    html += `</div>`;
  }

  // As spouse — immer anzeigen (Button auch wenn noch keine Familie)
  html += `<div class="section fade-up">
    <div class="section-head">
      <div class="section-title">Ehepartner &amp; Kinder</div>
      <button class="section-add" data-action="showAddSpouseFlow" data-pid="${id}">+ Ehepartner</button>
    </div>`;
  for (const famId of p.fams) {
    const fam = AppState.db.families[famId];
    if (!fam) continue;
    const marriageLabel = fam.marr.date ? fam.marr.date : famId;
    html += `<div class="family-nav-row" data-action="showFamilyDetail" data-id="${famId}">
      <span class="fnr-label"><span class="fnr-icon">⚭</span> Familie · ${esc(marriageLabel)}</span>
      <span class="row-arrow">›</span>
    </div>`;
    const partnerId = p.sex === 'M' ? fam.wife : fam.husb;
    const partner = partnerId ? AppState.db.individuals[partnerId] : null;
    if (partner) html += relRow(partner, 'Ehepartner' + (fam.marr.date ? ' · ' + fam.marr.date : ''), famId);
    for (const cid of fam.children) {
      const child = AppState.db.individuals[cid];
      if (child) html += relRow(child, 'Kind' + (child.birth.date ? ' · * ' + child.birth.date : ''), famId);
    }
    html += `<div style="display:flex;justify-content:flex-end;padding:2px 0 8px">
      <button class="section-add" data-action="showAddChildFlow" data-fid="${famId}">+ Kind</button>
    </div>`;
  }
  html += `</div>`;

  // Parents — immer anzeigen (Button auch wenn noch keine Eltern)
  html += `<div class="section fade-up">
    <div class="section-head">
      <div class="section-title">Eltern</div>
      <button class="section-add" data-action="showAddParentFlow" data-pid="${id}">+ Elternteil</button>
    </div>`;
  for (const fref of p.famc) {
    const famId = typeof fref === 'string' ? fref : fref.famId;
    const fam = AppState.db.families[famId];
    if (!fam) continue;
    html += `<div class="family-nav-row" style="display:flex;align-items:center;gap:6px">
      <span class="fnr-label" data-action="showFamilyDetail" data-id="${famId}" style="flex:1;cursor:pointer"><span class="fnr-icon">⚭</span> Herkunftsfamilie · ${famId}</span>
      <button class="unlink-btn" data-action="unlinkMember" data-fid="${famId}" data-pid="${id}"
        title="Aus Herkunftsfamilie austragen">×</button>
      <span class="row-arrow" data-action="showFamilyDetail" data-id="${famId}" style="cursor:pointer">›</span>
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

  document.getElementById('detailContent').innerHTML = html;
  showView('v-detail');

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
      el.style.display = '';
      el.innerHTML = '';
      const heroImg = document.createElement('img');
      heroImg.src = src;
      heroImg.alt = 'Foto';
      heroImg.style.cssText = 'width:80px;height:96px;object-fit:cover;border-radius:8px;display:block;flex-shrink:0;cursor:pointer';
      heroImg.onclick = () => showLightbox(heroImg.src, null, 'det-photo-' + id, 'det-avatar-' + id, null);
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
