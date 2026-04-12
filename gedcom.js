// ─────────────────────────────────────
//  STATE — AppState / UIState
// ─────────────────────────────────────
// Alle cross-file let-Variablen sind in zwei Namespace-Objekten organisiert.
// Backward-compat-Shims (unten) leiten bare Variablennamen zu den Namespaces um,
// sodass bestehende Aufrufer ohne Änderung weiter funktionieren.

const AppState = {
  db:               { individuals: {}, families: {}, sources: {}, extraPlaces: {}, repositories: {}, notes: {}, placForm: '', extraRecords: [], headLines: [] },
  changed:          false,
  idCounter:        1000,
  currentPersonId:  null,
  currentFamilyId:  null,
  currentSourceId:  null,
  currentRepoId:    null,
  currentPlaceName: null,
  currentTab:       'persons',
  _detailActive:    false,       // true wenn v-detail echten Inhalt zeigt
  _fileHandle:      null,        // FileSystemFileHandle von showOpenFilePicker (Chrome Desktop)
  _canDirectSave:   false,       // true wenn createWritable() auf _fileHandle funktioniert
  _originalGedText: null,        // Fallback wenn localStorage-Backup fehlschlägt; sonst null
};

const UIState = {
  _treeScale:       1,           // Zoom-Faktor Sanduhr-Ansicht
  _treeHistory:     [],          // Navigations-History im Baum
  _treeHistoryPos:  -1,
  _relMode:         '',          // 'spouse' | 'child' | 'parent'
  _relAnchorId:     '',          // personId (spouse/parent) oder famId (child)
  _pendingRelation: null,        // { mode, anchorId } — gesetzt vor showPersonForm()
  _pendingRepoLink: null,        // { sourceId } — gesetzt vor showRepoForm(null)
  _placesCache:       null,      // Cache für collectPlaces(); wird in markChanged() geleert
  _hofCache:          null,      // Cache für buildHofIndex(); wird in markChanged() geleert
  _searchIndexDirty:  true,      // true = p._searchStr muss neu aufgebaut werden
  _placesSubTab:    'orte',      // 'orte' | 'hoefe'
  _navHistory:      [],          // Navigations-History für Detail-Ansichten
  _probandId:       null,        // null = Fallback auf kleinste ID
  _formState: {                  // transienter Formular-State (ADR-003)
    srcWidget:    {},            // srcWidgetState[prefix] = { ids, pages, quay }
    pfExtraNames: [],            // Zusatz-Namen im Personen-Formular
    efMedia:      [],            // Medien im Event-Formular
  },
};

// Backward-compat-Shims: bare Variablennamen leiten zu AppState / UIState um.
// Entfernen sobald alle Aufrufer auf AppState.x / UIState.x umgestellt sind.
(function _installStateShims() {
  const _map = [
    [AppState, ['db','changed','idCounter','currentPersonId','currentFamilyId',
                'currentSourceId','currentRepoId','currentPlaceName','currentTab','_detailActive',
                '_fileHandle','_canDirectSave','_originalGedText']],
    [UIState,  ['_treeScale','_treeHistory','_treeHistoryPos',
                '_relMode','_relAnchorId','_pendingRelation','_pendingRepoLink','_placesCache',
                '_hofCache','_placesSubTab','_navHistory','_probandId','_searchIndexDirty']],
  ];
  for (const [ns, keys] of _map) {
    for (const k of keys) {
      Object.defineProperty(window, k, {
        get()  { return ns[k]; },
        set(v) { ns[k] = v; },
        configurable: true,
      });
    }
  }

  // _formState-Shims: zeigen auf UIState._formState.* (kein direkter UIState-Key)
  for (const [prop, subKey] of [
    ['srcWidgetState', 'srcWidget'],
    ['_pfExtraNames',  'pfExtraNames'],
    ['_efMedia',       'efMedia'],
  ]) {
    Object.defineProperty(window, prop, {
      get()  { return UIState._formState[subKey]; },
      set(v) { UIState._formState[subKey] = v; },
      configurable: true,
    });
  }
})();

// ─── Konstante Globals (const — kein Shim nötig) ────────────────────────────
const _newPhotoIds     = new Set(); // Personen mit manuell hinzugefügtem Foto
const _deletedPhotoIds = new Set(); // Personen deren Foto gelöscht wurde
const _activeSpouseMap = {};    // personId → aktiver Ehepartner-Index

// Liefert den Original-GEDCOM-Text (erste geladene Version).
// Bevorzugt _originalGedText (RAM, immer aktuell für aktive Session);
// localStorage-Backup als Fallback nach Reload (wenn RAM verloren, aber Storage erhalten).
function _getOriginalText() {
  return AppState._originalGedText || localStorage.getItem('stammbaum_ged_backup') || null;
}

function nextId(prefix) {
  AppState.idCounter++;
  return `@${prefix}${AppState.idCounter}@`;
}

// Globale Label-Map für GEDCOM-Ereignis-Typen (DRY: wird in showDetail + showPlaceDetail genutzt)
const EVENT_LABELS = {
  // Spezial-Schlüssel (intern)
  Geburt:'Geburt', Tod:'Tod', Taufe:'Taufe', Beerdigung:'Beerdigung', Heirat:'Heirat',
  // GEDCOM INDI-Ereignisse
  OCCU:'Beruf',          RESI:'Wohnort',        EDUC:'Bildung',
  RELI:'Religion',       EMIG:'Auswanderung',   IMMI:'Einwanderung',
  NATU:'Einbürgerung',   GRAD:'Abschluss',      ADOP:'Adoption',
  MILI:'Militärdienst',  FACT:'Tatsache',       EVEN:'Ereignis',
  TITL:'Titel',          CENS:'Volkszählung',   CONF:'Konfirmation',
  FCOM:'Erstkommunion',  ORDN:'Ordination',     RETI:'Pensionierung',
  PROP:'Eigentum',       WILL:'Testament',      PROB:'Testamentseröffnung',
  DSCR:'Beschreibung',   IDNO:'ID-Nummer',      SSN:'Sozialversicherungs-Nr.',
  // GEDCOM FAM-Ereignisse (können in events-Array landen)
  ENGA:'Verlobung',      DIV:'Scheidung',       DIVF:'Scheidungsantrag',
  MARR:'Heirat',         BIRT:'Geburt',         DEAT:'Tod',
  CHR:'Taufe',           BURI:'Beerdigung',
};

// GEDCOM-Typ → Person-Property-Name für die 4 Sonder-Ereignisse (BIRT/CHR/DEAT/BURI)
const SPECIAL_EVENT_KEYS = { BIRT:'birth', CHR:'chr', DEAT:'death', BURI:'buri' };

// Label-Map für GEDCOM NAME TYPE-Werte
const NAME_TYPE_LABELS = {
  birth:     'Geburtsname',
  maiden:    'Mädchenname',
  married:   'Ehename',
  aka:       'Auch bekannt als',
  immigrant: 'Einwanderer-Name',
  nickname:  'Spitzname',
};

// ── Getters / Mutations-Helpers ────────────────────────────────────────────
// Zentraler Einstiegspunkt — ein Ort für künftige Validierung, Undo oder Struktur-Änderungen.
// Getters geben null zurück statt undefined, sodass Aufrufer einheitlich auf null prüfen können.
function getPerson(id)  { return AppState.db.individuals[id]  ?? null; }
function getFamily(id)  { return AppState.db.families[id]     ?? null; }
function getSource(id)  { return AppState.db.sources[id]      ?? null; }
function getRepo(id)    { return AppState.db.repositories[id] ?? null; }

// Setters — Object.assign-Patch auf bestehende Top-Level-Felder.
// Für verschachtelte Array-Mutations (media[idx], fams.push etc.) weiter direkt verwenden.
function setPerson(id, patch) { const p = AppState.db.individuals[id]; if (p) Object.assign(p, patch); }
function setFamily(id, patch) { const f = AppState.db.families[id];   if (f) Object.assign(f, patch); }
function setSource(id, patch) { const s = AppState.db.sources[id];    if (s) Object.assign(s, patch); }
function setRepo(id, patch)   { const r = AppState.db.repositories[id]; if (r) Object.assign(r, patch); }

// ─────────────────────────────────────
//  GEDCOM DATUM / CONT HELFER
// ─────────────────────────────────────
const _GED_MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function gedcomDate(d) {
  return `${d.getDate()} ${_GED_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function gedcomTime(d) {
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
}
// Normiert Monatsabkürzungen auf Großschreibung: "Aug 1977" → "AUG 1977"
function normGedDate(s) {
  if (!s) return s;
  return s.replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/gi, m => m.toUpperCase());
}

// ─────────────────────────────────────
//  DATUM-HILFSFUNKTIONEN (Sprint 6a)
// ─────────────────────────────────────
const _MONTH_NUM = { JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12 };

// Gemeinsamer Parser: GEDCOM-Datumsteil → {d, m, y} (alle Strings)
function _parseDatePart(s) {
  const u = (s || '').trim().toUpperCase();
  const dMY = u.match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})$/);
  if (dMY) return { d: dMY[1], m: dMY[2], y: dMY[3] };
  const mY = u.match(/^([A-Z]{3})\s+(\d{4})$/);
  if (mY)  return { d: '', m: mY[1], y: mY[2] };
  const yO = u.match(/^(\d{1,4})$/);
  if (yO)  return { d: '', m: '', y: yO[1] };
  return { d: '', m: '', y: u };
}

// Einzelnes GEDCOM-Segment → ISO-String: '10 JUN 1870' → '1870-06-10'
function gedDatePartToISO(s) {
  if (!s) return '';
  const { d, m, y } = _parseDatePart(s);
  if (!y) return '';
  if (m) {
    const mn = _MONTH_NUM[m];
    if (!mn) return y;
    return d ? `${y}-${String(mn).padStart(2,'0')}-${String(+d).padStart(2,'0')}` : `${y}-${String(mn).padStart(2,'0')}`;
  }
  return y;
}

// GEDCOM-Datumsstring → { qual, date1, date2 }
function parseGedDate(raw) {
  if (!raw) return { qual:'', date1:'', date2:'' };
  const s = raw.trim().toUpperCase();
  const bet = s.match(/^BET\s+(.+?)\s+AND\s+(.+)$/i);
  if (bet) return { qual:'BET', date1:bet[1].trim(), date2:bet[2].trim() };
  const fromTo = s.match(/^FROM\s+(.+?)\s+TO\s+(.+)$/i);
  if (fromTo) return { qual:'FROM', date1:fromTo[1].trim(), date2:fromTo[2].trim() };
  for (const q of ['ABT','CAL','EST','BEF','AFT','FROM','TO']) {
    if (s.startsWith(q + ' ')) return { qual:q, date1:normGedDate(raw.slice(q.length+1).trim()), date2:'' };
  }
  return { qual:'', date1:normGedDate(raw.trim()), date2:'' };
}

// Teile → GEDCOM-Datumsstring
function buildGedDate(qual, date1, date2) {
  const d1 = normGedDate((date1||'').trim());
  if (!d1) return '';
  if (qual === 'BET')  { const d2 = normGedDate((date2||'').trim()); return d2 ? `BET ${d1} AND ${d2}` : d1; }
  if (qual === 'FROM') { const d2 = normGedDate((date2||'').trim()); return d2 ? `FROM ${d1} TO ${d2}` : `FROM ${d1}`; }
  return qual ? `${qual} ${d1}` : d1;
}

// GEDCOM-Datumsstring → numerischer Sortierschlüssel YYYYMMDD (0 = unbekannt)
function gedDateSortKey(dateStr) {
  if (!dateStr) return 0;
  const { date1 } = parseGedDate(dateStr);
  const iso = gedDatePartToISO(date1 || dateStr);
  if (!iso) return 0;
  const p = iso.split('-');
  return (parseInt(p[0])||0) * 10000 + (parseInt(p[1])||0) * 100 + (parseInt(p[2])||0);
}


// Formular-Felder befüllen
function fillDateFields(qualId, dateBaseId, date2BaseId, raw) {
  const { qual, date1, date2 } = parseGedDate(raw);
  // Qualifier nur setzen wenn Option vorhanden (FROM/TO nicht in allen Dropdowns)
  const sel = document.getElementById(qualId);
  if (sel && [...sel.options].some(o => o.value === qual)) sel.value = qual;
  else if (sel) sel.value = '';
  writeDatePartToFields(dateBaseId, date1);
  if (date2BaseId) {
    writeDatePartToFields(date2BaseId, date2);
    const grp = document.getElementById(date2BaseId + '-group');
    if (grp) grp.style.display = (qual === 'BET' || qual === 'FROM') ? '' : 'none';
  }
}

// Qualifier-Dropdown: zweites Datumfeld ein-/ausblenden
function onDateQualChange(selectEl, date2Id) {
  if (!date2Id) return;
  const grp = document.getElementById(date2Id + '-group');
  if (grp) grp.style.display = (selectEl.value === 'BET' || selectEl.value === 'FROM') ? '' : 'none';
}

// ── 3-Felder-Datum-Hilfsfunktionen ──────────────────────────────────────────
// Normalisiert Monatseingabe (Zahl, Deutsch, Englisch) → GEDCOM-Abkürzung
function normMonth(s) {
  if (!s) return '';
  const k = s.trim().toLowerCase();
  const map = {
    '1':'JAN','01':'JAN','2':'FEB','02':'FEB','3':'MAR','03':'MAR',
    '4':'APR','04':'APR','5':'MAY','05':'MAY','6':'JUN','06':'JUN',
    '7':'JUL','07':'JUL','8':'AUG','08':'AUG','9':'SEP','09':'SEP',
    '10':'OCT','11':'NOV','12':'DEC',
    'jan':'JAN','januar':'JAN','january':'JAN',
    'feb':'FEB','februar':'FEB','february':'FEB',
    'mar':'MAR','mär':'MAR','märz':'MAR','march':'MAR',
    'apr':'APR','april':'APR',
    'mai':'MAY','may':'MAY',
    'jun':'JUN','juni':'JUN','june':'JUN',
    'jul':'JUL','juli':'JUL','july':'JUL',
    'aug':'AUG','august':'AUG',
    'sep':'SEP','september':'SEP',
    'okt':'OCT','oktober':'OCT','oct':'OCT','october':'OCT',
    'nov':'NOV','november':'NOV',
    'dez':'DEC','dezember':'DEC','dec':'DEC','december':'DEC',
  };
  const abb = s.trim().toUpperCase().slice(0, 3);
  return map[k] || (_GED_MONTHS.includes(abb) ? abb : '');
}

// Schreibt geparsten Datumsteil in drei Felder (baseId + '-d'/'-m'/'-y')
function writeDatePartToFields(baseId, dateStr) {
  const { d, m, y } = _parseDatePart(dateStr);
  const dEl = document.getElementById(baseId + '-d');
  const mEl = document.getElementById(baseId + '-m');
  const yEl = document.getElementById(baseId + '-y');
  if (dEl) dEl.value = d;
  if (mEl) mEl.value = m;
  if (yEl) yEl.value = y;
}

// Liest drei Felder und baut GEDCOM-Datumsteil (ohne Qualifier)
function readDatePartFromFields(baseId) {
  const d = (document.getElementById(baseId + '-d')?.value || '').trim();
  const mRaw = (document.getElementById(baseId + '-m')?.value || '').trim();
  const m = mRaw ? normMonth(mRaw) : '';
  const y = (document.getElementById(baseId + '-y')?.value || '').trim();
  if (!y) return '';
  if (m && d) return `${+d} ${m} ${y}`;
  if (m) return `${m} ${y}`;
  return y;
}

// Wrapper: liest Qualifier + zwei Datumsbasen → buildGedDate
function buildGedDateFromFields(qualId, dateBaseId, date2BaseId) {
  return buildGedDate(
    document.getElementById(qualId)?.value || '',
    readDatePartFromFields(dateBaseId),
    date2BaseId ? readDatePartFromFields(date2BaseId) : ''
  );
}

// ── PLAC-Modus-Hilfsfunktionen (Sprint 6b) ──────────────────────────────────
const _placeModes = {};  // { placeId: 'free'|'parts' }

function getPlacLabels() {
  const raw = AppState.db.placForm || 'Dorf, Stadt, PLZ, Landkreis, Bundesland, Staat';
  return raw.split(',').map(s => s.trim()).filter(Boolean).slice(0, 6);
}

function buildPlacePartsHtml(placeId) {
  return getPlacLabels().map((lbl, i) =>
    `<input class="form-input" id="${placeId}-p${i}" placeholder="${lbl}" style="margin-bottom:3px">`
  ).join('');
}

function fillPlaceParts(placeId, raw) {
  const parts = (raw || '').split(/\s*,\s*/);
  getPlacLabels().forEach((_, i) => {
    const el = document.getElementById(`${placeId}-p${i}`);
    if (el) el.value = parts[i] || '';
  });
}

function joinPlaceParts(placeId) {
  const parts = getPlacLabels().map((_, i) => {
    const el = document.getElementById(`${placeId}-p${i}`);
    return el ? el.value.trim() : '';
  });
  while (parts.length && !parts[parts.length - 1]) parts.pop();
  return parts.join(', ');
}

// Compact-Darstellung: leere Hierarchieteile weglassen ("Ochtrup, , , NRW" → "Ochtrup, NRW")
function compactPlace(place) {
  if (!place) return '';
  return place.split(',').map(s => s.trim()).filter(Boolean).join(', ');
}

function getPlaceFromForm(placeId) {
  if ((_placeModes[placeId] || 'free') === 'parts') return joinPlaceParts(placeId);
  return (document.getElementById(placeId)?.value || '').trim();
}

function initPlaceMode(placeId) {
  const freeEl    = document.getElementById(`${placeId}-free`);
  const partsEl   = document.getElementById(`${placeId}-parts`);
  const toggleBtn = document.getElementById(`${placeId}-toggle`);
  if (freeEl)    freeEl.style.display  = '';
  if (partsEl)   partsEl.style.display = 'none';
  if (toggleBtn) toggleBtn.textContent = '⊞ Felder';
  _placeModes[placeId] = 'free';
}

function togglePlaceMode(placeId) {
  const freeEl    = document.getElementById(`${placeId}-free`);
  const partsEl   = document.getElementById(`${placeId}-parts`);
  const toggleBtn = document.getElementById(`${placeId}-toggle`);
  if ((_placeModes[placeId] || 'free') === 'free') {
    const rawVal = (document.getElementById(placeId)?.value || '').trim();
    partsEl.innerHTML = buildPlacePartsHtml(placeId);
    fillPlaceParts(placeId, rawVal);
    freeEl.style.display  = 'none';
    partsEl.style.display = '';
    if (toggleBtn) toggleBtn.textContent = '⊠ Freitext';
    _placeModes[placeId] = 'parts';
  } else {
    const rawVal = joinPlaceParts(placeId);
    freeEl.style.display  = '';
    partsEl.style.display = 'none';
    if (toggleBtn) toggleBtn.textContent = '⊞ Felder';
    const inp = document.getElementById(placeId);
    if (inp) inp.value = rawVal;
    _placeModes[placeId] = 'free';
  }
}


function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ─────────────────────────────────────
//  sourceRefs-Rebuild (nach Event-Saves)
// ─────────────────────────────────────
function _rebuildPersonSourceRefs(p) {
  if (!p) return;
  const refs = new Set();
  const add = arr => (arr || []).forEach(s => { if (typeof s === 'string' && s.startsWith('@')) refs.add(s); });
  add(p.topSources);
  add(p.nameSources);
  add(p.birth?.sources);
  add(p.death?.sources);
  add(p.chr?.sources);
  add(p.buri?.sources);
  (p.events || []).forEach(ev => add(ev.sources));
  (p.famc  || []).forEach(fc => add(fc.sourIds));
  p.sourceRefs = refs;
}

function _rebuildFamilySourceRefs(f) {
  if (!f) return;
  const refs = new Set();
  const add = arr => (arr || []).forEach(s => { if (typeof s === 'string' && s.startsWith('@')) refs.add(s); });
  add(f.marr?.sources);
  add(f.engag?.sources);
  add(f.div?.sources);
  add(f.divf?.sources);
  (f.events || []).forEach(ev => add(ev.sources));
  f.sourceRefs = refs;
}
