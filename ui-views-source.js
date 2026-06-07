// ─────────────────────────────────────
//  SOURCE DETAIL
// ─────────────────────────────────────
function showSourceDetail(id, pushHistory = true) {
  const s = getSource(id);
  if (!s) { showMain(); return; }
  if (pushHistory) _beforeDetailNavigate();
  ViewState.setCurrent('sources', id);

  document.getElementById('detailTopTitle').textContent = 'Quelle';
  document.getElementById('editBtn').style.display = '';
  document.getElementById('treeBtn').hidden        = true;
  document.getElementById('timelineBtn').hidden    = true;
  document.getElementById('storyBtn').hidden       = true;
  document.getElementById('probandBtn').hidden     = true;
  document.getElementById('probandSetBtn').hidden  = true;
  document.getElementById('detailMapBtn')?.setAttribute('hidden', '');

  // Collect all persons and families referencing this source
  const refPersons = Object.values(AppState.db.individuals).filter(p => p.sourceRefs && p.sourceRefs.has(id));
  const refFamilies = Object.values(AppState.db.families).filter(f => f.sourceRefs && f.sourceRefs.has(id));

  let html = `<div class="detail-hero fade-up">
    <div id="det-src-photo-${id}" class="det-photo-wrap"></div>
    <div id="det-src-avatar-${id}" class="detail-avatar fs-lg">📖</div>
    <div class="detail-hero-text">
      <div class="detail-name">${esc(s.abbr || s.title || id)}</div>
      <div class="detail-id">${refPersons.length + refFamilies.length} Referenzen${s.lastChanged ? ' · geändert ' + s.lastChanged : ''}</div>
    </div>
  </div>`;

  // Quick-Template-Shortcut: Template direkt aus dieser Quelle anlegen (Phase D)
  html += `<div style="padding:0 0 6px"><button type="button" class="btn-link" data-action="qtNewTemplateFromSource" data-sid="${esc(id)}">⚡ Quick-Template erstellen</button></div>`;

  // Source details
  html += `<div class="section fade-up"><div class="section-title">Details</div>`;
  if (s.abbr)                          html += factRow('Kurzname', s.abbr);
  if (s.title && s.title !== s.abbr)   html += factRow('Titel', s.title);
  if (s.author) html += factRow('Autor', s.author);
  if (s.date)   html += factRow('Datum', s.date);
  if (s.publ)   html += factRow('Verlag', s.publ);
  if (s.repo) {
    if (s.repo.match(/^@[^@]+@$/) && AppState.db.repositories[s.repo]) {
      const r = AppState.db.repositories[s.repo];
      const _rc0 = s.repoCalns?.[0] || (s.repoCallNum ? {num:s.repoCallNum, medi:s.repoCallMedi||''} : null);
      const callNum = _rc0?.num ? ` · Signatur: ${esc(_rc0.num)}${_rc0.medi ? ' (' + esc(_rc0.medi) + ')' : ''}` : '';
      html += `<div class="fact-row"><span class="fact-lbl">Aufbewahrung</span>
        <span class="fact-val"><span class="btn-link" data-action="showRepoDetail" data-id="${s.repo}">${esc(r.name || s.repo)}</span>${callNum}</span></div>`;
    } else {
      html += factRow('Aufbewahrung', s.repo);
    }
  }
  if (s.refns && s.refns.length) {
    for (const r of s.refns) {
      const label = r.type ? `Referenz (${esc(r.type)})` : 'Referenz';
      html += factRow(label, r.val);
    }
  }
  if (s.agnc) html += factRow('Behörde', s.agnc);
  if (s.dataEvens && s.dataEvens.length) {
    for (const de of s.dataEvens) {
      let cov = de.evens || '(alle Ereignisse)';
      if (de.date) cov += ` · ${esc(de.date)}`;
      if (de.plac) cov += ` · ${esc(de.plac)}`;
      html += factRow('Deckungsbereich', cov);
    }
  }
  html += `</div>`;

  // Notizen
  html += `<div class="section fade-up">
    <div class="section-head">
      <div class="section-title">Notizen</div>
      <button class="section-add" data-action="openNoteModal" data-ntype="source" data-nid="${id}">✎ Bearbeiten</button>
    </div>
    <div class="note-clickable" data-action="openNoteModal" data-ntype="source" data-nid="${id}">
      ${s.text
        ? `<div class="note-text">${linkifyUrls(s.text)}</div>`
        : `<div class="note-hint">Notiz hinzufügen…</div>`}
    </div>
    ${s.noteText ? `<div class="note-text note-ref-text">${linkifyUrls(s.noteText)}</div>` : ''}
  </div>`;

  // Media section: inline entries from media[] + reference entries from passthrough
  const srcMedia = s.media || [];
  const srcPtObje = (s._passthrough || []).filter(l => /^1 OBJE @/.test(l));
  {
    const _objeMap = _buildObjeRefMap();
    html += `<div class="section fade-up">
      <div class="section-head">
        <div class="section-title">Medien</div>
        <button class="section-add" data-action="openAddMediaDialog" data-ctx="source" data-id="${id}">+ Hinzufügen</button>
      </div>`;
    for (let i = 0; i < srcMedia.length; i++) {
      const m = srcMedia[i];
      if (!m.file && !m.title) continue;
      const _ext = (m.file || '').split('.').pop().toLowerCase();
      const _isImg = ['jpg','jpeg','png','gif','bmp','webp','tif','tiff'].includes(_ext);
      const _icon = _isImg ? '🖼' : _ext === 'pdf' ? '📄' : '📎';
      html += `<div class="media-row"
        data-action="openSourceMediaView" data-sid="${id}" data-idx="${i}">
        <div id="src-media-thumb-${i}" class="media-thumb">${_icon}</div>
        <div class="media-info">
          <div class="media-title">${esc(m.title || m.file)}</div>
          ${m.title && m.file ? `<div class="media-sub">${esc(m.file)}</div>` : ''}
          ${m.form ? `<div class="media-ref-label">${esc(m.form)}</div>` : ''}
        </div>
        <button class="edit-media-btn" data-action="openEditMediaDialog" data-ctx="source" data-id="${id}" data-idx="${i}" title="Bearbeiten">✎</button>
      </div>`;
    }
    for (const l of srcPtObje) {
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
    if (!srcMedia.filter(m => m.file || m.title).length && !srcPtObje.length) html += `<div class="no-data-pad">Keine Medien eingetragen</div>`;
    html += `</div>`;
  }

  // Referencing persons
  if (refPersons.length) {
    const sorted = [...refPersons].sort((a, b) => (a.name||'').localeCompare(b.name||'', 'de'));
    html += `<div class="section fade-up">
      <div class="section-title">Personen (${refPersons.length})</div>`;
    for (const p of sorted) {
      let bio = '';
      if (p.birth.date) bio += '* ' + p.birth.date;
      if (p.death.date) bio += (bio ? '  † ' : '† ') + p.death.date;
      const srcMeta = _collectSourceMeta(p, id);
      const sc = p.sex === 'M' ? 'm' : p.sex === 'F' ? 'f' : '';
      const ic = p.sex === 'M' ? '♂' : p.sex === 'F' ? '♀' : '◇';
      html += `<div class="rel-row" data-action="showDetail" data-pid="${p.id}">
        <div class="rel-avatar ${sc}">${ic}</div>
        <div class="rel-info">
          <div class="rel-name">${esc(p.name || p.id)}</div>
          <div class="rel-role">${esc(bio) || '–'}${srcMeta ? `<span class="src-ref-meta"> · ${esc(srcMeta)}</span>` : ''}</div>
        </div>
        <span class="p-arrow">›</span>
      </div>`;
    }
    html += `</div>`;
  }

  // Referencing families
  if (refFamilies.length) {
    html += `<div class="section fade-up">
      <div class="section-title">Familien (${refFamilies.length})</div>`;
    for (const f of refFamilies) {
      const husb = f.husb ? AppState.db.individuals[f.husb] : null;
      const wife = f.wife ? AppState.db.individuals[f.wife] : null;
      const title = [husb?.name, wife?.name].filter(Boolean).join(' & ') || f.id;
      const bio = f.marr.date ? '⚭ ' + f.marr.date : '';
      const srcMeta = _collectSourceMeta(f, id);
      html += `<div class="rel-row" data-action="showFamilyDetail" data-id="${f.id}">
        <div class="rel-avatar src-avatar-fam">👨‍👩‍👧</div>
        <div class="rel-info">
          <div class="rel-name">${esc(title)}</div>
          <div class="rel-role">${esc(bio) || '–'}${srcMeta ? `<span class="src-ref-meta"> · ${esc(srcMeta)}</span>` : ''}</div>
        </div>
        <span class="p-arrow">›</span>
      </div>`;
    }
    html += `</div>`;
  }

  if (!refPersons.length && !refFamilies.length) {
    html += `<div class="section fade-up"><div class="empty no-ref-pad">Keine Referenzen gefunden</div></div>`;
  }

  document.getElementById('detailContent').innerHTML = html;
  showView('v-detail');

  // Quellenmedien async laden — IDB zuerst (Kamera-Aufnahmen), dann OneDrive
  // Bevorzugtes Medium (prim) oder erstes für Hero
  let _srcHeroSet = false;
  const _srcPrimIdx = (() => {
    const withFile = srcMedia.map((m, i) => ({m, i})).filter(({m}) => m.file || m.title);
    if (!withFile.length) return -1;
    const prim = withFile.find(({m}) => m.prim && m.prim !== '');
    return prim ? prim.i : withFile[0].i;
  })();
  function _applySrcMediaUrl(idx, url) {
    const m = srcMedia[idx];
    const ext = (m.file || '').split('.').pop().toLowerCase();
    const isImg = ['jpg','jpeg','png','gif','bmp','webp','tif','tiff'].includes(ext);
    if (!isImg) return;
    const el = document.getElementById('src-media-thumb-' + idx);
    if (el) {
      const originalContent = el.innerHTML;
      el.innerHTML = '';
      const img = document.createElement('img');
      img.src = url; img.alt = m.title || m.file || '';
      img.style.cssText = 'width:44px;height:44px;object-fit:cover;border-radius:6px;display:block';
      img.onerror = () => { el.innerHTML = originalContent; };
      el.appendChild(img);
    }
    if (!_srcHeroSet && (idx === _srcPrimIdx)) {
      _srcHeroSet = true;
      const heroEl = document.getElementById('det-src-photo-' + id);
      const avatarEl = document.getElementById('det-src-avatar-' + id);
      if (heroEl) {
        heroEl.style.display = 'block';
        heroEl.innerHTML = '';
        const hImg = document.createElement('img');
        hImg.src = url; hImg.alt = m.title || m.file || '';
        hImg.style.cssText = 'width:80px;height:96px;object-fit:cover;border-radius:8px;display:block;flex-shrink:0;cursor:pointer';
        hImg.addEventListener('click', () => showLightbox(url));
        heroEl.appendChild(hImg);
        if (avatarEl) avatarEl.style.display = 'none';
      }
    }
  }
  // Ladereihenfolge: prim zuerst, dann Rest
  // Pfad (m.file via _odGetSourceFileUrl) zuerst; IDB nur als Fallback (Offline/Kamera)
  const _srcLoadOrder = srcMedia.map((_, i) => i)
    .filter(i => srcMedia[i].file || srcMedia[i].title)
    .sort((a, b) => (a === _srcPrimIdx ? -1 : b === _srcPrimIdx ? 1 : a - b));
  for (const i of _srcLoadOrder) {
    const _ci = i;
    _odGetSourceFileUrl(id, _ci).then(url => {
      if (url) { _applySrcMediaUrl(_ci, url); return; }
      const _srcFile = srcMedia[_ci]?.file;
      if (_srcFile) idbGet('img:' + _srcFile).then(b64 => {
        if (b64) _applySrcMediaUrl(_ci, b64);
      }).catch(() => {});
    }).catch(() => {
      const _srcFile = srcMedia[_ci]?.file;
      if (_srcFile) idbGet('img:' + _srcFile).then(b64 => {
        if (b64) _applySrcMediaUrl(_ci, b64);
      }).catch(() => {});
    });
  }
}

// ─────────────────────────────────────
//  SOURCE LIST
// ─────────────────────────────────────
function renderSourceList(srcs) {
  const el = document.getElementById('sourceList');
  if (!srcs) srcs = Object.values(AppState.db.sources);
  srcs = [...srcs].sort((a, b) => (a.abbr || a.title || a.id).localeCompare(b.abbr || b.title || b.id, 'de'));
  if (!srcs.length) {
    const totalSrcs = Object.keys(AppState.db.sources || {}).length;
    if (totalSrcs === 0) {
      el.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">§</div>
        <div class="empty-state-title">Noch keine Quellen</div>
        <div class="empty-state-msg">Quellen dokumentieren Ihre Belege — Kirchenbücher, Standesamtsregister, Urkunden.</div>
        <button class="empty-state-btn" data-action="newSourceForm">Erste Quelle anlegen</button>
      </div>`;
    } else {
      el.innerHTML = '<div class="empty">Keine Treffer zur Suche</div>';
    }
    _announceList('Keine Quellen');
    return;
  }

  let html = '';
  for (let i = 0; i < srcs.length; i++) {
    const s = srcs[i];
    const refCount = Object.values(AppState.db.individuals).filter(p => p.sourceRefs && p.sourceRefs.has(s.id)).length
                   + Object.values(AppState.db.families).filter(f => f.sourceRefs && f.sourceRefs.has(s.id)).length;
    const hasRepo = s.repo && s.repo.match(/^@[^@]+@$/) && AppState.db.repositories[s.repo];
    const repoBadge = hasRepo ? `<span class="repo-badge" data-action="showRepoDetail" data-id="${s.repo}">🏛</span>` : '';
    const mediaCount = (s.media || []).filter(m => m.file || m.title).length
                     + (s._passthrough || []).filter(l => /^1 OBJE @/.test(l)).length;
    const mediaBadge = mediaCount ? `<span class="src-media-badge">📎</span>` : '';
    html += `<div class="source-card" role="listitem" aria-setsize="${srcs.length}" aria-posinset="${i + 1}" data-action="showSourceDetail" data-sid="${s.id}">
      <div class="source-title">${esc(s.abbr || s.title || s.id)}${repoBadge}${mediaBadge}</div>
      <div class="source-meta">${esc([s.author, s.date].filter(Boolean).join(' · ')) || '&nbsp;'}${refCount ? ` · ${refCount} Ref.` : ''}</div>
    </div>`;
  }
  el.innerHTML = html;
  _announceList(srcs.length + (srcs.length === 1 ? ' Quelle' : ' Quellen'));
}

function filterSources(q) {
  const lower = q.toLowerCase().trim();
  const all = Object.values(AppState.db.sources);
  if (!lower) { renderSourceList(all); return; }
  renderSourceList(all.filter(s =>
    (s.title||'').toLowerCase().includes(lower) ||
    (s.abbr||'').toLowerCase().includes(lower)  ||
    (s.author||'').toLowerCase().includes(lower)
  ));
}

function renderRepoList() {
  const el    = document.getElementById('repoList');
  const repos = Object.values(AppState.db.repositories || {});
  if (!repos.length) { el.innerHTML = '<div class="empty">Keine Archive vorhanden</div>'; return; }
  const sorted = repos.sort((a,b) => (a.name||'').localeCompare(b.name||'','de'));
  el.innerHTML = sorted.map(r => {
    const srcCount = Object.values(AppState.db.sources).filter(s => s.repo === r.id).length;
    return `<div class="source-card" data-action="showRepoDetail" data-id="${r.id}">
      <div class="source-title">${esc(r.name || r.id)}</div>
      <div class="source-meta">${r.addr ? esc(r.addr.split('\n')[0]) : '&nbsp;'}${srcCount ? ' · ' + srcCount + ' Quel.' : ''}</div>
    </div>`;
  }).join('');
}

function switchSourcesSubTab(sub) {
  document.getElementById('toggle-sources')?.classList.toggle('active', sub === 'sources');
  document.getElementById('toggle-repos')?.classList.toggle('active', sub === 'repos');
  document.getElementById('toggle-media')?.classList.toggle('active', sub === 'media');
  const isSources = sub === 'sources';
  const isMedia   = sub === 'media';
  document.getElementById('sourceList').hidden              = !isSources;
  document.getElementById('source-search-wrap').hidden      = !isSources;
  document.getElementById('media-filter-bar-wrap').hidden   = !isMedia;
  document.getElementById('repoSection').hidden             = isSources || isMedia;
  document.getElementById('mediaSection').hidden            = !isMedia;
  if (sub === 'repos') renderRepoList();
  if (isMedia) showMediaSection();
}
