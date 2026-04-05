// ─────────────────────────────────────
//  FORMS: REPO (Archive) + DETAIL-ANSICHT
// ─────────────────────────────────────

function sfRepoUpdateDisplay() {
  const repoId  = (document.getElementById('sf-repo').value || '').trim();
  const display = document.getElementById('sf-repo-display');
  const clearBtn = document.getElementById('sf-repo-clear');
  const calnGrp  = document.getElementById('sf-caln-group');
  if (repoId.match(/^@[^@]+@$/)) {
    const r = AppState.db.repositories[repoId];
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
  let repos = Object.values(AppState.db.repositories);
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
  UIState._pendingRepoLink = { sourceId: document.getElementById('sf-id').value };
  showRepoForm(null);
}

function showRepoDetail(id, pushHistory = true) {
  const r = getRepo(id); if (!r) return;
  if (pushHistory) _beforeDetailNavigate();
  AppState.currentRepoId = id; AppState.currentPersonId = null; AppState.currentFamilyId = null; AppState.currentSourceId = null;
  document.getElementById('detailTopTitle').textContent = 'Archiv';
  document.getElementById('editBtn').style.display = '';
  document.getElementById('editBtn').onclick = () => showRepoForm(id);
  document.getElementById('treeBtn').style.display = 'none';

  const linkedSources = Object.values(AppState.db.sources).filter(s => s.repo === id);
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
      html += `<div class="source-card" data-action="showSourceDetail" data-sid="${s.id}">
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
  const r = id ? getRepo(id) : null;
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
  AppState.db.repositories[id] = {
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
  if (UIState._pendingRepoLink) {
    UIState._pendingRepoLink = null;
    document.getElementById('sf-repo').value = id;
    sfRepoUpdateDisplay();
    openModal('modalSource');
  } else if (AppState.currentRepoId === id) {
    showRepoDetail(id);
  }
}

function deleteRepo() {
  const id = document.getElementById('rf-id').value; if (!id) return;
  const linked = Object.values(AppState.db.sources).filter(s => s.repo === id);
  const msg = linked.length
    ? `Archiv löschen? ${linked.length} Quelle(n) verlieren die Archiv-Verknüpfung.`
    : 'Archiv wirklich löschen?';
  if (!confirm(msg)) return;
  for (const s of linked) { setSource(s.id, { repo: '', repoCallNum: '' }); }
  delete AppState.db.repositories[id];
  closeModal('modalRepo');
  markChanged();
  showMain();
  showToast('✓ Archiv gelöscht');
}
