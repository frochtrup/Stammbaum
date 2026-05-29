// ─────────────────────────────────────
//  EVENT DELEGATION
//  Ausgelagert aus ui-views.js (REFACT-3, sw v697)
//  Muss LETZTES <script> in index.html sein — referenziert alle anderen Module.
//  data-action  → click
//  data-change  → change
//  data-input   → input
//  data-action="stop" → stopPropagation ohne Aktion
// ─────────────────────────────────────
// ─────────────────────────────────────
//  EVENT DELEGATION
//  Ersetzt alle inline onclick/oninput/onchange in HTML-Strings.
//  data-action  → click
//  data-change  → change
//  data-input   → input
//  data-action="stop" → stopPropagation ohne Aktion (z.B. <select> in klickbarer Zeile)
// ─────────────────────────────────────
function _sortedChildren(children) {
  return [...(children || [])].sort((a, b) => {
    const pa = AppState.db.individuals[a];
    const pb = AppState.db.individuals[b];
    return evDateKey(pa?.birth?.date || '').localeCompare(evDateKey(pb?.birth?.date || ''));
  });
}

const _CLICK_MAP = {
  // Dynamisch generierte Einträge (bereits vorhanden)
  showEventFormTyped:      el => showEventForm(el.dataset.pid, undefined, el.dataset.evtype),
  newSourceForm:           ()  => showSourceForm(null),
  newFamilyForm:           ()  => showFamilyForm(null),
  removeNoteRef:           el  => el.closest('[data-ref-section]')?.remove(),
  jumpToSection:           el => document.getElementById(el.dataset.jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
  showDetail:              el => showDetail(el.dataset.pid  || el.dataset.id),
  showFamilyDetail:        el => showFamilyDetail(el.dataset.fid  || el.dataset.id),
  showSourceDetail:        el => showSourceDetail(el.dataset.sid  || el.dataset.id),
  showRepoDetail:          el => showRepoDetail(el.dataset.id),
  showPlaceDetail:         el => showPlaceDetail(el.dataset.name),
  showHofDetail:           el => showHofDetail(el.dataset.addr),
  showHofAddForm:          el => showHofAddForm(el.dataset.addr),
  showHofPropForm:         el => showHofPropForm(el.dataset.addr),
  saveHofBewohner:         el => saveHofBewohner(el.dataset.addr),
  cancelHofBewohner:       ()  => cancelHofBewohner(),
  saveHofEigentum:         el => saveHofEigentum(el.dataset.addr),
  cancelHofEigentum:       ()  => cancelHofEigentum(),
  showHofCoordForm:        el => showHofCoordForm(el.dataset.addr),
  cancelHofCoord:          ()  => cancelHofCoord(),
  saveHofCoord:            el => saveHofCoord(el.dataset.addr),
  deleteHofCoord:          el => deleteHofCoord(el.dataset.addr),
  openHofNote:             el => openNoteModal('hof', el.dataset.addr),
  showHofRenameForm:       ()  => showHofRenameForm(),
  cancelHofRename:         ()  => cancelHofRename(),
  saveHofRename:           el  => saveHofRename(el.dataset.addr),
  switchPlacesSubTab:      el => switchPlacesSubTab(el.dataset.subtab),
  switchMapMode:           el => switchMapMode(el.dataset.mode),
  toggleMigrAnim:          ()  => toggleMigrAnim(),
  stopMigrAnim:            ()  => stopMigrAnim(),
  closeMapPanel:           ()  => { document.getElementById('map-explore-panel').style.display = 'none'; },
  showPersonOnMap:         el => showPersonOnMap(el.dataset.pid || el.dataset.id),
  showCurrentPersonOnMap:  ()  => {
    const pid = UIState._timelinePid || AppState.currentPersonId || getProbandId();
    if (pid) showPersonOnMap(pid);
    else showToast('Keine Daten geladen');
  },
  mapClose:                ()  => { document.getElementById('map-close-btn').style.display = 'none'; goBack(); },
  openMapPersonPicker:     ()  => openMapPersonPicker(),
  selectMapPerson:         el => selectMapPerson(el.dataset.pid),
  deleteExtraPlace:        el => deleteExtraPlace(el.dataset.pname || el.dataset.name),
  addPlaceTrans:           ()  => addPlaceTrans(),
  deletePlaceTrans:        el  => deletePlaceTrans(+el.dataset.idx),
  treeShowProband:         ()  => {
    const id = getProbandId();
    if (!id) return;
    if (document.body.classList.contains('fc-mode'))        showFanChart(id);
    else if (document.body.classList.contains('desc-tree-mode')) showDescTree(id, false);
    else showTree(id, false);
  },
  moveFamUp:               el => moveFamOrder(el.dataset.pid, el.dataset.fid, -1),
  moveFamDown:             el => moveFamOrder(el.dataset.pid, el.dataset.fid, +1),
  unlinkMember:            el => unlinkMember(el.dataset.fid, el.dataset.pid),
  showPersonForm:          el => showPersonForm(el.dataset.pid),
  showExtraNameForm:       el => showExtraNameForm(el.dataset.pid, parseInt(el.dataset.enidx ?? '-1', 10)),
  saveExtraName:           ()  => saveExtraName(),
  deleteExtraName:         ()  => deleteExtraName(),
  showEventForm:           el => showEventForm(el.dataset.pid, el.dataset.ev),
  showFamEventForm:        el => showFamEventForm(el.dataset.fid, el.dataset.evkey, el.dataset.evidx),
  showAddAliasFlow:        el => showAddAliasFlow(el.dataset.pid),
  showAddAssoFlow:         el => showAddAssoFlow(el.dataset.pid),
  editAsso:                el => showAssoRoleStep(el.dataset.pid, AppState.db.individuals[el.dataset.pid]?.associations?.[+el.dataset.aidx]?.xref, +el.dataset.aidx),
  deleteAsso:              el => deleteAsso(el.dataset.pid, +el.dataset.aidx),
  saveAsso:                ()  => saveAsso(),
  assoRoleChange:          ()  => assoRoleChange(),
  removeAlias:             el => removeAlias(el.dataset.pid, el.dataset.aliasid),
  showAddSpouseFlow:       el => showAddSpouseFlow(el.dataset.pid),
  showAddChildFlow:        el => showAddChildFlow(el.dataset.fid),
  showAddParentFlow:       el => showAddParentFlow(el.dataset.pid),
  openAddMediaDialog:      el => openAddMediaDialog(el.dataset.ctx, el.dataset.id),
  openMediaPhoto:          el => openMediaPhoto(el.dataset.mediaFile, el.dataset.hero, el.dataset.avatar),
  openEditMediaDialog:     el => openEditMediaDialog(el.dataset.ctx, el.dataset.id, +el.dataset.idx),
  openSourceMediaView:     el => openSourceMediaView(el.dataset.sid, +el.dataset.idx),
  showChildRelDialog:      el => showChildRelDialog(el.dataset.fid, el.dataset.cid),
  removeSrc:               el => removeSrc(el.dataset.prefix, +el.dataset.citidx),
  addSrc:                  el => addSrc(el.dataset.prefix, el.dataset.sid),
  'copy-cit':              el => copyCitations(el.dataset.prefix),
  'paste-cit':             el => pasteCitations(el.dataset.prefix),
  openCitLink:             (el, e) => { e.stopPropagation(); window.open(el.dataset.href, '_blank', 'noopener'); },
  odLoadFile:              el => odLoadFile(el.dataset.odid, el.dataset.odname),
  odFolderBack:            ()  => _odFolderBack(),
  odPickCancel:            ()  => _odPickCancel(),
  odShowAllFolders:        ()  => _odShowAllFolders(),
  odScanDocFolder:         el => odScanDocFolder(el.dataset.odid, el.dataset.odname),
  odBrowseBasePath:        ()  => odBrowseBasePath(),
  odScanBasePathFolder:    el => odScanBasePathFolder(el.dataset.odid, el.dataset.odname),
  odImportPhotos:          el => odImportPhotosFromFolder(el.dataset.odid, el.dataset.odname),
  odEnterFolder:           el => _odEnterFolder(el),
  odPickSelectFile:        el => _odPickSelectFile(el.dataset.odid, el.dataset.odname, el.dataset.path),
  browserShowSource:       el => { closeModal('modalMediaBrowser'); showSourceDetail(el.dataset.sid); },
  browserShowPerson:       el => { closeModal('modalMediaBrowser'); showDetail(el.dataset.pid); },
  browserShowFamily:       el => { closeModal('modalMediaBrowser'); showFamilyDetail(el.dataset.fid); },
  filterMedia:             el => filterMedia(el.dataset.ctx),
  toggleMediaView:         ()  => toggleMediaView(),
  cycleMediaSort:          ()  => cycleMediaSort(),
  mediaNavCtx:             el => showMediaDetail(el.dataset.mediaType, el.dataset.ctxId, parseInt(el.dataset.idx, 10)),
  mediaEditGoTo:           el => {
    closeModal('modalEditMedia');
    const { type, id } = el.dataset;
    if (type === 'person')                          showDetail(id);
    else if (type === 'family' || type === 'family_media') showFamilyDetail(id);
    else if (type === 'source')                     showSourceDetail(id);
  },
  saveMediaDetail:         ()  => saveMediaDetail(),
  saveMediaGlobal:         ()  => saveMediaGlobal(),
  mediaDetailGoRef:        el => showMediaDetail(el.dataset.mediaType, el.dataset.ctxId, parseInt(el.dataset.idx, 10)),
  mediaDetailNavEntity:    el  => {
    const { type, id } = el.dataset;
    if (type === 'person')                               showDetail(id);
    else if (type === 'family' || type === 'family_media') showFamilyDetail(id);
    else if (type === 'source')                          showSourceDetail(id);
  },
  mediaDetailLinkPerson:   ()  => _mdShowLinkPanel('person'),
  mediaDetailLinkFamily:   ()  => _mdShowLinkPanel('family'),
  mediaDetailLinkSource:   ()  => _mdShowLinkPanel('source'),
  mediaDetailLinkCancel:   ()  => { const p = document.getElementById('md-link-panel'); if (p) p.innerHTML = ''; },
  mediaDetailAddRef:       el  => _mdAddRef(el.dataset.type, el.dataset.id),
  mediaDetailDeleteRef:    el  => _mdDeleteRef(el.dataset.mediaType, el.dataset.ctxId, parseInt(el.dataset.idx, 10)),
  showLightbox:            el => showLightbox(el.src || el.dataset.src),
  // Statische index.html-Handler (P1-Migration)
  loadDemo:                ()  => loadDemo(),
  obNext:                  ()  => typeof obAdvance  === 'function' && obAdvance(),
  obSkip:                  ()  => typeof obDismiss  === 'function' && obDismiss(),
  openModal:               el => openModal(el.dataset.modal),
  closeModal:              el => closeModal(el.dataset.modal),
  bnavSearch:              ()  => bnavSearch(),
  toggleSoundex:           ()  => toggleSoundex(),
  openMenuModal:           ()  => { openModal('modalMenu'); _odUpdateUI(); },
  clearYearFilter:         ()  => clearYearFilter(),
  togglePersonSort:        ()  => togglePersonSort(),
  toggleAdvFilter:         ()  => toggleAdvFilter(),
  showPersonMediaBrowser:  ()  => showPersonMediaBrowser(),
  showFamilyMediaBrowser:  ()  => showFamilyMediaBrowser(),
  switchSourcesSubTab:     el  => switchSourcesSubTab(el.dataset.subtab),
  showMediaBrowser:        ()  => showMediaBrowser(),
  menuMediaBrowser:        ()  => { closeModal('modalMenu'); showMediaBrowser(); },
  showAddSheet:            ()  => showAddSheet(),
  showQuickAdd:            ()  => showQuickAdd(),
  saveQuickAdd:            ()  => saveQuickAdd(),
  quickAddDone:            ()  => quickAddDone(),
  qaCopySrc:               ()  => qaCopySrc(),
  qaPasteSrc:              ()  => qaPasteSrc(),
  clearQaFilter:           ()  => clearQaFilter(),
  qaToggleEv:              el  => qaToggleEv(el.dataset.ev, el),
  citCamCapture:           el  => citCamCapture(el.dataset.prefix, +el.dataset.citidx),
  goBack:                  ()  => goBack(),
  goForward:               ()  => goForward(),
  openDetailHistory:       ()  => openDetailHistory(),
  openTreeHistory:         ()  => openTreeHistory(),
  showEditSheet:           ()  => showEditSheet(),
  treeNavBack:             ()  => treeNavBack(),
  setTreeGens:             el => setTreeGens(+el.dataset.tgen),
  setFcGens:               el => setFcGens(+el.dataset.gen),
  setDescTreeGens:         el => setDescTreeGens(+el.dataset.dgen),
  toggleFanChart:          ()  => toggleFanChart(),
  toggleDescTree:          ()  => toggleDescTree(),
  toggleTreeFullscreen:    ()  => toggleTreeFullscreen(),
  tlShowProband:           ()  => { const id = getProbandId(); if (id && typeof showTimeline === 'function') showTimeline(id); },
  tlShowTree:              ()  => { const pid = UIState._timelinePid || AppState.currentPersonId; if (pid) showTree(pid); },
  tlShowFanChart:          ()  => { const pid = UIState._timelinePid || AppState.currentPersonId; if (pid && typeof showFanChart  === 'function') showFanChart(pid); },
  tlShowDescTree:          ()  => { const pid = UIState._timelinePid || AppState.currentPersonId; if (pid && typeof showDescTree  === 'function') showDescTree(pid, false); },
  toggleTimelineFullscreen:()  => { if (typeof toggleTimelineFullscreen === 'function') toggleTimelineFullscreen(); },
  showRelPath:             el  => showRelPath(el.dataset.pid),
  showRelCalcPicker:       el  => showRelCalcPicker(el.dataset.pid),
  relPathShowDetail:       el  => { closeModal('modalRelPath'); showDetail(el.dataset.id); },
  showTree:                el  => showTree(el.dataset.id),
  showTimeline:            el  => { if (typeof showTimeline === 'function') showTimeline(el.dataset.id); },
  showStory:               el  => { if (typeof showStory        === 'function') showStory(el.dataset.id); },
  showFamilyStory:         el  => { if (typeof showFamilyStory === 'function') showFamilyStory(el.dataset.fid); },
  printStory:              ()  => { if (typeof printStory       === 'function') printStory(); },
  downloadStory:           ()  => { if (typeof downloadStory    === 'function') downloadStory(); },
  tlFilter:                el  => { if (typeof _tlFilterToggle === 'function') _tlFilterToggle(el.dataset.cat); },
  tlPersonAdd:             ()  => {
    UIState._relMode = 'tlmulti';
    UIState._relAnchorId = null;
    document.getElementById('relPickerTitle').textContent = 'Person zur Zeitleiste hinzufügen';
    document.getElementById('relPickerSearch').value = '';
    if (typeof renderRelPicker === 'function') renderRelPicker('');
    openModal('modalRelPicker');
  },
  tlPersonRemove:          el  => { if (typeof window._tlRemovePerson === 'function') window._tlRemovePerson(el.dataset.pid); },
  tlPersonNav:             el  => { if (el.dataset.pid) showDetail(el.dataset.pid); },
  detailShowProband:       ()  => { const id = getProbandId(); if (id) showDetail(id); },
  toggleProband:           el  => _toggleProband(el.dataset.id),
  bnavTree:                ()  => bnavTree(),
  bnavTab:                 el => bnavTab(el.dataset.tab),
  bnavHome:                ()  => bnavHome(),
  bnavTasks:               ()  => bnavTasks(),
  menuProband:             ()  => { closeModal('modalMenu'); bnavHome(); },
  menuValidate:            ()  => { closeModal('modalMenu'); bnavTasks(); setTimeout(() => { if (typeof _handleRunValidation === 'function') _handleRunValidation(); }, 80); },
  addPerson:               ()  => { closeModal('modalAdd'); showPersonForm(null); },
  addFamily:               ()  => { closeModal('modalAdd'); showFamilyForm(null); },
  addSource:               ()  => { closeModal('modalAdd'); showSourceForm(null); },
  addPlace:                ()  => { closeModal('modalAdd'); showNewPlaceForm(); },
  addPfExtraName:          ()  => addPfExtraName(),
  addPfGrampsAttr:         ()  => addPfGrampsAttr(),
  addFfGrampsAttr:         ()  => addFfGrampsAttr(),
  toggleSrcPicker:         el => toggleSrcPicker(el.dataset.prefix),
  savePerson:              ()  => savePerson(),
  savePersonAndNew:        ()  => savePerson(true),
  deletePerson:            ()  => deletePerson(),
  togglePlaceMode:         el => togglePlaceMode(el.dataset.placeid),
  addMediaEntry:           el => _addMediaEntry(el.dataset.prefix),
  saveFamily:              ()  => saveFamily(),
  deleteFamily:            ()  => deleteFamily(),
  saveFamEvent:            ()  => saveFamEvent(),
  deleteFamEvent:          ()  => deleteFamEvent(),
  applySourceTemplate:     el => _applySourceTemplate(el.dataset.tpl),
  addDataEven:             ()  => addDataEven(),
  sfRepoClear:             ()  => sfRepoClear(),
  openRepoPicker:          ()  => openRepoPicker(),
  sfToggleMore:            ()  => sfToggleMore(),
  saveSource:              ()  => saveSource(),
  deleteSource:            ()  => deleteSource(),
  addEfMedia:              ()  => addEfMedia(),
  efCamCapture:            ()  => document.getElementById('ef-cam-input').click(),
  saveEvent:               ()  => saveEvent(),
  saveAndCopyEvent:        ()  => saveAndCopyEvent(),
  applyClipboardEvent:     el  => applyClipboardEventToPerson(el.dataset.pid),
  deleteEvent:             ()  => deleteEvent(),
  savePlace:               ()  => savePlace(),
  saveNewPlace:            ()  => saveNewPlace(),
  relPickerCreateNew:      ()  => relPickerCreateNew(),
  saveRepo:                ()  => saveRepo(),
  deleteRepo:              ()  => deleteRepo(),
  repoPickerCreateNew:     ()  => repoPickerCreateNew(),
  menuOdToggle:            ()  => { closeModal('modalMenu'); odToggle(); },
  menuOdOpen:              ()  => { closeModal('modalMenu'); odOpenFilePicker(); },
  odSaveFile:              ()  => odSaveFile(),
  menuSettings:            ()  => { closeModal('modalMenu'); openSettings(); },
  menuOpenFile:            ()  => { closeModal('modalMenu'); openFileOrDir(); },
  menuExport:              ()  => { closeModal('modalMenu'); exportGEDCOM(); },
  menuExportGed7:          ()  => { closeModal('modalMenu'); exportGEDCOM(true, true); },
  menuExportGramps:        ()  => { closeModal('modalMenu'); exportGRAMPS(); },
  menuFormatConvert:       ()  => { closeModal('modalMenu'); AppState.db?._grampsMaster ? exportGEDCOM(true) : exportGRAMPS(); },
menuRevert:              ()  => { closeModal('modalMenu'); revertToSaved(); },
  menuLoadDemo:            ()  => { closeModal('modalMenu'); loadDemo(); },
  menuNewFile:             ()  => { closeModal('modalMenu'); confirmNewFile(); },
  menuHelp:                ()  => { closeModal('modalMenu'); openModal('modalHelp'); },
  menuRoundtrip:           ()  => { closeModal('modalMenu'); if (typeof runRoundtripTest === 'function') runRoundtripTest(); },
  menuGrampsRoundtrip:     ()  => { closeModal('modalMenu'); if (typeof runGrampsRoundtripTest === 'function') runGrampsRoundtripTest(); },
  menuBook:                ()  => { closeModal('modalMenu'); _lazyScripts(['ui-book.js', 'ui-print.js']).then(() => openBookModal()).catch(() => showToast('⚠ Modul nicht ladbar', 'error')); },
  menuPrintAhnenliste:    ()  => { closeModal('modalMenu'); _lazyScript('ui-print.js').then(() => downloadAhnenliste()).catch(() => showToast('⚠ Modul nicht ladbar', 'error')); },
  menuPrintFamilienbogen: ()  => { closeModal('modalMenu'); _lazyScript('ui-print.js').then(() => downloadFamilienbogen()).catch(() => showToast('⚠ Modul nicht ladbar', 'error')); },
  generateBook:            ()  => {
    const mode      = document.querySelector('#book-mode-seg button.active')?.dataset.bookMode || 'ancestors';
    const title     = document.getElementById('book-title')?.value.trim() || 'Familienbuch';
    const withPhotos = document.getElementById('book-photos')?.checked ?? true;
    _lazyScripts(['ui-book.js', 'ui-print.js']).then(() => downloadBook({ title, mode, withPhotos })).catch(() => showToast('⚠ Modul nicht ladbar', 'error'));
  },
  themeAuto:               ()  => setThemePref('auto'),
  themeLight:              ()  => setThemePref('light'),
  themeDark:               ()  => setThemePref('dark'),
  settingsChangePhoto:     ()  => { closeModal('modalSettings'); odImportPhotos(); },
  odClearPhotoFolder:      ()  => odClearPhotoFolder(),
  settingsChangeDoc:       ()  => { closeModal('modalSettings'); odSetupDocFolder(); },
  odClearDocFolder:        ()  => odClearDocFolder(),
  odCancelOrClose:         ()  => _odCancelOrClose(),
  camCapture:              ()  => document.getElementById('am-cam-input').click(),
  camGallery:              ()  => {
    const inp = document.getElementById('am-cam-input');
    inp.removeAttribute('capture');
    inp.click();
    setTimeout(() => inp.setAttribute('capture', 'environment'), 500);
  },
  odPickFileForMedia:      ()  => odPickFileForMedia(),
  confirmAddMedia:         ()  => confirmAddMedia(),
  odPickFileForEditMedia:  ()  => odPickFileForEditMedia(),
  confirmDeleteMedia:      ()  => confirmDeleteMedia(),
  confirmEditMedia:        ()  => confirmEditMedia(),
  helpRoundtrip:           ()  => { closeModal('modalHelp'); if (typeof runRoundtripTest === 'function') runRoundtripTest(); },
  menuImportCompare:       ()  => { _lazyScript('ui-import-compare.js').then(() => openImportCompare()).catch(() => showToast('⚠ Modul nicht ladbar', 'error')); },
  menuDedup:               ()  => { closeModal('modalMenu'); _lazyScript('ui-dedup.js').then(() => openDedupModal()).catch(() => showToast('⚠ Modul nicht ladbar', 'error')); },
  menuRepairDb:            ()  => { closeModal('modalMenu'); repairDatabase(); },
  menuStats:               ()  => { closeModal('modalMenu'); bnavTab('stats'); },
  dedupRunScan:            ()  => dedupRunScan(),
  dedupOpenMerge:          el  => dedupOpenMerge(el),
  dedupSwapWinner:         ()  => dedupSwapWinner(),
  dedupIgnorePair:         ()  => dedupIgnorePair(),
  dedupConfirmMerge:       ()  => dedupConfirmMerge(),
  dedupCreateRlog:         ()  => dedupCreateRlog(),
  exportChartPng:          ()  => {
    if (document.body.classList.contains('fc-mode'))        exportFanChartPng();
    else if (document.body.classList.contains('desc-tree-mode')) exportDescTreePng();
    else                                                         exportSandUhrPng();
  },
  openNoteModal:           el  => openNoteModal(el.dataset.ntype, el.dataset.nid),
  saveNoteModal:           ()  => saveNoteModal(),
  saveChildRelDialog:      ()  => saveChildRelDialog(),
  syncBannerSave:          ()  => _syncBannerSave(),
  startupChoiceOneDrive:   ()  => _startupChoiceOneDrive(),
  startupChoiceLocal:      ()  => _startupChoiceLocal(),
  closeLightbox:           ()  => { document.getElementById('modalLightbox').style.display = 'none'; },
  lightboxSetHero:         (el, e) => { e.stopPropagation(); _lightboxSetHero(); },
  confirmModalOk:          ()  => { _confirmResolve?.(true); _confirmResolve = null; closeModal('modalConfirm'); },
  confirmModalCancel:      ()  => closeModal('modalConfirm'),
  switchTasksFilter:       el  => switchTasksFilter(el.dataset.filter),
  switchTasksMode:         el  => switchTasksMode(el.dataset.mode),
  showAddTaskForm:         el  => showAddTaskForm(el.dataset.pid),
  showAddFamTaskForm:      el  => showAddFamTaskForm(el.dataset.fid),
  saveAddTask:             ()  => _saveAddTask(),
  toggleTask:              el  => _handleToggleTask(el),
  editTask:                el  => _handleEditTask(el),
  deleteTask:              el  => _handleDeleteTask(el),
  toggleFamTask:           el  => _handleToggleFamTask(el),
  editFamTask:             el  => _handleEditFamTask(el),
  deleteFamTask:           el  => _handleDeleteFamTask(el),
  runValidation:           ()  => _handleRunValidation(),
  dismissValidation:       ()  => { clearValidationResults(); renderTasksView(); },
  promoteToTask:           el  => _handlePromoteToTask(el),
  openValConfig:           ()  => openValConfig(),
  exportTasksMd:           ()  => exportTasksMd(),
  saveValConfig:           ()  => saveValConfig(),
  resetValConfig:          ()  => resetValConfig(),
  valcfgAll:               ()  => valcfgAll(),
  valcfgNone:              ()  => valcfgNone(),
  showAddRlogForm:         el  => showAddRlogForm(el.dataset.pid),
  showAddFamRlogForm:      el  => showAddFamRlogForm(el.dataset.fid),
  taskToLog:               el  => _taskToLog(el),
  saveRlog:                ()  => _saveRlog(),
  editRlog:    el => el.dataset.pid ? showEditRlogForm(el.dataset.pid, +el.dataset.ridx)    : showEditFamRlogForm(el.dataset.fid, +el.dataset.ridx),
  deleteRlog:  el => el.dataset.pid ? _deleteRlogEntry(el.dataset.pid, +el.dataset.ridx)    : _deleteFamRlogEntry(el.dataset.fid, +el.dataset.ridx),
  switchRlogFilter:        el  => switchRlogFilter(el.dataset.filter),
  exportRlogMd:            ()  => exportRlogMd(),
  exportPersonsCsv:        ()  => exportPersonsCsv(),
  exportFamiliesCsv:       ()  => exportFamiliesCsv(),
};

// Firefox Wheel-Normalisierung für Hauptliste frühzeitig registrieren
document.addEventListener('DOMContentLoaded', () => {
  _normalizeWheel(document.getElementById('v-main'));
  // Safari-Swipe-Back abfangen: pushState-Anker verhindert, dass der Browser
  // die App verlässt; popstate delegiert an internes Nav-System
  history.pushState({ app: true }, '');
  window.addEventListener('popstate', () => {
    history.pushState({ app: true }, '');
    goBack();
  });
});

document.addEventListener('click', e => {
  // Prevent <details> toggle when clicking bulk-action buttons inside <summary>
  if (e.target.closest('.cmp-bulk-actions')) e.preventDefault();
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  if (action === 'stop') { e.stopPropagation(); return; }
  const fn = _CLICK_MAP[action];
  if (fn) { fn(el, e); return; }
  // Import-Vergleich Click-Handler (lazy-loaded Modul)
  if (typeof _cmpHandleClick === 'function' && action.startsWith('cmp')) _cmpHandleClick(action, el);
});

document.addEventListener('change', e => {
  const el = e.target.closest('[data-change]');
  if (!el) return;
  const action = el.dataset.change;
  if      (action === 'applyPersonFilter') applyPersonFilter();
  else if (action === 'savePedi')          savePedi(el.dataset.fid, el.dataset.cid, el.value);
  else if (action === 'updateSrcQuay')     updateSrcQuay(el.dataset.prefix, +el.dataset.citidx, el.value);
  else if (action === 'onEventTypeChange')    onEventTypeChange();
  else if (action === 'onFamEventTypeChange') onFamEventTypeChange();
  else if (action === 'onDateQualChange')  onDateQualChange(el, el.dataset.target);
  else if (action === 'applySourceTemplate') _applySourceTemplate(el.value);
  else if (action === 'amCamChange') {
    (async () => {
      const f = el.files[0];
      if (!f) return;
      if (!['image/jpeg','image/png','image/webp','image/gif'].includes(f.type)) {
        showToast('Nur Bilder erlaubt (JPG, PNG, WEBP, GIF)', 'error');
        el.value = '';
        return;
      }
      try { const b64 = await resizeImageToBase64(f); _onCamCapture(b64, f.name); }
      catch(err) { showToast('Bild konnte nicht geladen werden', 'error'); }
      el.value = '';
    })();
  }
  else if (action === 'privacyAnonChange') {
    AppState.privacyAnon = el.checked;
    idbPut('privacy_anon', el.checked).catch(() => {});
    showToast(el.checked ? 'Anonymisierung beim Export aktiviert' : 'Anonymisierung deaktiviert', 'info');
  }
  else if (action === 'strictGedChange') {
    AppState.strictGed = el.checked;
    idbPut('strict_ged', el.checked).catch(() => {});
    showToast(el.checked ? 'Strict GEDCOM 5.5.1 aktiviert — Export als _strict.ged' : 'Strict-Modus deaktiviert', 'info');
  }
  else if (action === 'efCamChange') {
    _efCamChange(el.files[0]);
    el.value = '';
  }
  else if (action === 'citCamChange') {
    citCamChange(el.files[0]);
    el.value = '';
  }
  else if (action === 'photoImportChange') {
    _handlePhotoImport(el.files[0]).finally(() => { el.value = ''; });
  }
});

document.addEventListener('input', e => {
  const el = e.target.closest('[data-input]');
  if (!el) return;
  const action = el.dataset.input;
  if      (action === 'updateSrcPage')   updateSrcPage(el.dataset.prefix, +el.dataset.citidx, el.value);
  else if (action === 'applyPersonFilter') applyPersonFilter();
  else if (action === 'filterFamilies')  filterFamiliesDebounced(el.value);
  else if (action === 'filterSources')   filterSourcesDebounced(el.value);
  else if (action === 'filterPlaces')    filterPlacesDebounced(el.value);
  else if (action === 'filterHoefe')     filterHoefeDebounced(el.value);
  else if (action === 'runGlobalSearch') runGlobalSearchDebounced(el.value);
  else if (action === 'filterMapPersonList') filterMapPersonList();
  else if (action === 'renderRelPicker') renderRelPicker(el.value);
  else if (action === 'renderRepoPicker') renderRepoPicker(el.value);
  else if (action === 'mdFilterLinkPanel') _mdFilterLinkPanel(el.value);
  else if (action === 'odSetBasePath')   odSetBasePath(el.value.trim());
  else if (action === 'dedupSearch')     dedupSearchChange(el.value);
  else if (action === 'dedupThreshold')  dedupThresholdChange(el.value);
});

document.addEventListener('blur', e => {
  const el = e.target.closest('[data-blur]');
  if (!el) return;
  if (el.dataset.blur === 'normMonth') {
    const v = normMonth(el.value);
    if (v && el.value) el.value = v;
  }
}, true);

// openNoteModal / saveNoteModal / _pruneOrphanNotes / _noteRefUsers → ui-views-note.js

// ─────────────────────────────────────
//  OBJE-REFERENZ-HELPER
//  Baut Map @Oxx@ → {file, title} aus AppState.db.extraRecords
// ─────────────────────────────────────
// ── TREE-HEAT: Vollständigkeits-Score für Baum-Karten ──
// Prüft 3 Felder: Geburtsdatum, mind. 1 Quellenreferenz, mind. 1 Zitat mit QUAY ≥ 2
// Gibt {level: null|'1'|'2'|'3', labels: string[]} zurück.
// level = null → vollständig; labels = Liste der fehlenden Felder (für Tooltip).
function _personCompleteness(p) {
  if (!p) return { level: null, labels: [] };
  const labels = [];

  if (!p.birth?.date) labels.push('Geburtsdatum');

  const hasSrc = (p.topSources?.length || 0) > 0 ||
    (p.nameCitations?.length || 0) > 0 ||
    (p.birth?.citations?.length || 0) > 0 ||
    (p.death?.citations?.length || 0) > 0 ||
    (p.events || []).some(ev => ev.citations?.length > 0);
  if (!hasSrc) labels.push('Quellenangabe');

  const allCits = [
    ...Object.entries(p.topSourceQUAY || {}).map(([, q]) => ({ quay: q })),
    ...(p.nameCitations || []),
    ...(p.birth?.citations || []),
    ...(p.death?.citations || []),
    ...(p.chr?.citations || []),
    ...(p.buri?.citations || []),
    ...(p.events || []).flatMap(ev => ev.citations || []),
  ];
  const hasHighQuay = allCits.some(c => parseInt(c.quay) >= 2);
  if (!hasHighQuay) labels.push('Quelle mit QUAY ≥ 2');

  return { level: labels.length > 0 ? String(labels.length) : null, labels };
}

function _buildObjeRefMap() {
  const map = {};
  for (const rec of (AppState.db.extraRecords || [])) {
    if (!rec._lines || !rec._lines.length) continue;
    const hm = rec._lines[0].match(/^0 (@[^@]+@) OBJE$/);
    if (!hm) continue;
    const objId = hm[1];
    let file = '', title = '';
    for (let i = 1; i < rec._lines.length; i++) {
      const lm = rec._lines[i].match(/^1 (FILE|TITL) (.+)$/);
      if (lm) { if (lm[1] === 'FILE') file = lm[2]; else title = lm[2]; }
    }
    map[objId] = { file, title };
  }
  return map;
}
