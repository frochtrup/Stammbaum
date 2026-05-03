// ─────────────────────────────────────
//  STATE — AppState / UIState
// ─────────────────────────────────────
// Alle cross-file let-Variablen sind in zwei Namespace-Objekten organisiert.
// Backward-compat-Shims (unten) leiten bare Variablennamen zu den Namespaces um,
// sodass bestehende Aufrufer ohne Änderung weiter funktionieren.

const AppState = {
  db:               { individuals: {}, families: {}, sources: {}, extraPlaces: {}, hofObjects: {}, repositories: {}, notes: {}, placForm: '', extraRecords: [], headLines: [] },
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
  _eventClipboard: null,         // kopiertes Ereignis für Übernehmen-Funktion
  _citClipboard:   null,         // kopierte Quellenbezüge { sources[], pages{}, quay{} }
  _formState: {                  // transienter Formular-State (ADR-003)
    srcWidget:    {},            // srcWidgetState[prefix] = { ids, pages, quay }
    pfExtraNames:   [],          // Zusatz-Namen im Personen-Formular
    efMedia:        [],          // Medien im Event-Formular
    efGodparents:   [],          // Taufpaten im CHR-Event-Formular (Xrefs)
  },
};

// Backward-compat-Shim: bare `db` → AppState.db (wird in gedcom-writer.js + ui-*.js verwendet)
Object.defineProperty(window, 'db', {
  get()  { return AppState.db; },
  set(v) { AppState.db = v; },
  configurable: true,
});

// Lesbarkeits-Shims für tief verschachtelte UIState._formState-Pfade.
// srcWidgetState[p] ist lesbarer als UIState._formState.srcWidget[p] (34 Verwendungen in ui-forms.js).
(function _installFormStateShims() {
  for (const [prop, subKey] of [
    ['srcWidgetState', 'srcWidget'],
    ['_pfExtraNames',   'pfExtraNames'],
    ['_efMedia',        'efMedia'],
    ['_efGodparents',   'efGodparents'],
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

// Liefert den Original-GEDCOM-Text (erste geladene Version, aus RAM oder IDB via tryAutoLoad).
function _getOriginalText() {
  return AppState._originalGedText ?? null;
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

// Label-Map für ASSO RELA-Werte (GEDCOM) / rel-Attribut (GRAMPS <personref>)
const RELA_LABELS = {
  'Godparent':  'Taufpate/-mutter',
  'Godchild':   'Patenkind',
  'Witness':    'Zeuge/Zeugin',
  'Friend':     'Freund/in',
  'Neighbor':   'Nachbar/in',
  'Associate':  'Bekannte(r)',
  'Employer':   'Arbeitgeber',
  'Employee':   'Arbeitnehmer',
  'Landlord':   'Vermieter',
};

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

// Validiert drei Datumsfelder (baseId+'-d'/'-m'/'-y') — gibt Fehlerstring oder null zurück
function validateDatePartFields(baseId) {
  const d = (document.getElementById(baseId + '-d')?.value || '').trim();
  const mRaw = (document.getElementById(baseId + '-m')?.value || '').trim();
  const y = (document.getElementById(baseId + '-y')?.value || '').trim();
  if (y && !/^\d{4}$/.test(y)) return 'Jahr muss 4-stellig sein (z.B. 1875)';
  if (y && (+y < 1000 || +y > 2099)) return 'Jahr außerhalb 1000–2099';
  if (d && (!/^\d{1,2}$/.test(d) || +d < 1 || +d > 31)) return 'Tag muss 1–31 sein';
  if (mRaw && !normMonth(mRaw)) return 'Ungültiger Monat';
  return null;
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
    `<input class="form-input" id="${placeId}-p${i}" placeholder="${esc(lbl)}" style="margin-bottom:3px">`
  ).join('');
}

function fillPlaceParts(placeId, raw) {
  const parts = (raw || '').split(/\s*,\s*/);
  getPlacLabels().forEach((_, i) => {
    const el = document.getElementById(`${placeId}-p${i}`);
    if (el) el.value = parts[i] || '';
  });
}

function joinPlaceParts(placeId, keepAll = false) {
  const parts = getPlacLabels().map((_, i) => {
    const el = document.getElementById(`${placeId}-p${i}`);
    return el ? el.value.trim() : '';
  });
  if (!keepAll) while (parts.length && !parts[parts.length - 1]) parts.pop();
  return parts.join(', ');
}

// Compact-Darstellung: leere Hierarchieteile weglassen ("Ochtrup, , , NRW" → "Ochtrup, NRW")
function compactPlace(place) {
  if (!place) return '';
  return place.split(',').map(s => s.trim()).filter(Boolean).join(', ');
}

// Parst Koordinaten-Eingabe — unterstützt:
//   Apple Maps (deutsch): "52,22779° N, 7,17310° O" → ganzer String ins erste Feld
//   Dezimalgrad:          "52.2073" / "52,2073"
//   GEDCOM:               "N52.2073"
// Gibt { lat, lon } zurück (beide können NaN sein bei ungültiger Eingabe).
function parseCoordInput(firstField, secondField) {
  const s = (firstField || '').trim();
  // Vollständiges Paar: <zahl>°<dir> <zahl>°<dir>
  // O = Ost (DE), E = East, W = West, N/S wie üblich
  const m = /^([\d.,]+)\s*°?\s*([NSns])\s*[,;\s]+\s*([\d.,]+)\s*°?\s*([OoEeWw])/.exec(s);
  if (m) {
    let lat = parseFloat(m[1].replace(/,/g, '.'));
    let lon = parseFloat(m[3].replace(/,/g, '.'));
    if (m[2].toUpperCase() === 'S') lat = -lat;
    if (m[4].toUpperCase() === 'W') lon = -lon;
    return { lat: Math.abs(lat) <= 90 ? lat : NaN, lon: Math.abs(lon) <= 180 ? lon : NaN };
  }
  // Einzelfelder — GEDCOM-Format (N52.2073) oder Dezimalgrad
  const _one = v => {
    const t = (v || '').trim();
    const g = /^([NSns])\s*([\d.,]+)$/.exec(t);
    if (g) return (g[1].toUpperCase() === 'S' ? -1 : 1) * parseFloat(g[2].replace(',', '.'));
    return parseFloat(t.replace(',', '.'));
  };
  const lat = _one(firstField), lon = _one(secondField);
  return { lat: Math.abs(lat) <= 90 ? lat : NaN, lon: Math.abs(lon) <= 180 ? lon : NaN };
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
    const rawVal = joinPlaceParts(placeId, true); // alle Slots erhalten (Langdarstellung)
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

// Sortierkey für GEDCOM-Datumsstrings → 'YYYYMMDD' (undatiert → '99999999')
function evDateKey(d) {
  if (!d) return '99999999';
  const mo = {JAN:'01',FEB:'02',MAR:'03',APR:'04',MAY:'05',JUN:'06',JUL:'07',AUG:'08',SEP:'09',OCT:'10',NOV:'11',DEC:'12'};
  const yr    = (d.match(/\b(\d{4})\b/) || [])[1] || '9999';
  const mStr  = (d.match(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/) || [])[1];
  const dyStr = (d.match(/\b(\d{1,2})\b(?=\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC))/) || [])[1];
  return yr + (mStr ? mo[mStr] : '00') + (dyStr ? dyStr.padStart(2,'0') : '00');
}

// ─────────────────────────────────────
//  DOMAIN-LOGIK: HOF-INDEX
// ─────────────────────────────────────

// Aggregiert RESI- und PROP-Ereignisse nach Adresse → Map<addr, {addr, entries[], propEntries[]}>
// Cache in UIState._hofCache; wird von markChanged() geleert.
function buildHofIndex() {
  if (UIState._hofCache) return UIState._hofCache;
  const hoefe = new Map(); // addr → { addr, place, entries: [{pid, name, date, dateKey}], propEntries: [{pid, name, date, dateKey, desc}] }
  for (const p of Object.values(AppState.db.individuals)) {
    for (const ev of (p.events || [])) {
      if (ev.type === 'RESI' && ev.addr && ev.addr.trim()) {
        const addr = ev.addr.trim();
        if (!hoefe.has(addr)) hoefe.set(addr, { addr, place: '', entries: [], propEntries: [] });
        const hof = hoefe.get(addr);
        if (!hof.propEntries) hof.propEntries = [];
        // Ersten nicht-leeren Ort aus RESI-Events übernehmen
        if (!hof.place && ev.place) hof.place = ev.place.trim();
        hof.entries.push({
          pid:     p.id,
          name:    p.name || p.id,
          date:    ev.date || '',
          dateKey: evDateKey(ev.date || ''),
        });
      }
      if (ev.type === 'PROP' && ev.addr && ev.addr.trim()) {
        const addr = ev.addr.trim();
        if (!hoefe.has(addr)) hoefe.set(addr, { addr, place: '', entries: [], propEntries: [] });
        const hof = hoefe.get(addr);
        if (!hof.propEntries) hof.propEntries = [];
        if (!hof.place && ev.place) hof.place = ev.place.trim();
        hof.propEntries.push({
          pid:     p.id,
          name:    p.name || p.id,
          date:    ev.date || '',
          dateKey: evDateKey(ev.date || ''),
          desc:    ev.value || '',
        });
      }
    }
  }
  for (const hof of hoefe.values()) {
    hof.entries.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    (hof.propEntries || []).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }
  UIState._hofCache = hoefe;
  return hoefe;
}

// ─────────────────────────────────────
//  DOMAIN-LOGIK: DUPLIKAT-SCORING
// ─────────────────────────────────────

// Normiert Namen für Ähnlichkeitsvergleich (Kleinbuchstaben, Umlaute, Whitespace)
function _dedupNormName(str) {
  if (!str) return '';
  return str.toLowerCase().trim()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ');
}

// Levenshtein-Ähnlichkeit 0..1 (1 = identisch)
function _dedupLevenshtein(a, b) {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  if (a === b) return 1;
  const la = a.length, lb = b.length;
  if (Math.max(la, lb) === 0) return 1;
  const dp = Array.from({ length: la + 1 }, (_, i) => [i]);
  for (let j = 0; j <= lb; j++) dp[0][j] = j;
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return 1 - dp[la][lb] / Math.max(la, lb);
}

// Extrahiert Geburtsjahr aus GEDCOM-Datumsstring
function _dedupYearFromGed(dateStr) {
  if (!dateStr) return null;
  const { date1 } = parseGedDate(dateStr);
  const iso = gedDatePartToISO(date1 || dateStr);
  const y = parseInt((iso || '').split('-')[0]);
  return isNaN(y) ? null : y;
}

// Berechnet Ähnlichkeits-Score zwischen zwei Personen (0..100)
// Gibt { score, reasons[] } zurück
function _dedupScorePair(pA, pB) {
  const reasons = [];
  let score = 0;

  // Nachname (max 30)
  const snA = _dedupNormName(pA.surname || '');
  const snB = _dedupNormName(pB.surname || '');
  if (snA && snB) {
    const r = _dedupLevenshtein(snA, snB);
    score += r * 30;
    if (r >= 0.9) reasons.push('Nachname identisch');
    else if (r >= 0.7) reasons.push('Nachname ähnlich');
  }

  // Vorname (max 25)
  const gnA = _dedupNormName(pA.given || '');
  const gnB = _dedupNormName(pB.given || '');
  if (gnA && gnB) {
    const r = _dedupLevenshtein(gnA, gnB);
    score += r * 25;
    if (r >= 0.9) reasons.push('Vorname identisch');
    else if (r >= 0.7) reasons.push('Vorname ähnlich');
  }

  // Geschlecht (max 15, Malus -20)
  if (pA.sex !== 'U' && pB.sex !== 'U') {
    if (pA.sex === pB.sex) { score += 15; }
    else { score -= 20; reasons.push('Geschlecht verschieden'); }
  }

  // Geburtsjahr (max 20)
  const yA = _dedupYearFromGed(pA.birth?.date);
  const yB = _dedupYearFromGed(pB.birth?.date);
  if (yA && yB) {
    const diff = Math.abs(yA - yB);
    if      (diff === 0) { score += 20; reasons.push('Geburtsjahr identisch'); }
    else if (diff <= 1)  { score += 15; reasons.push('Geburtsjahr ±1'); }
    else if (diff <= 2)  { score +=  8; }
    else if (diff <= 5)  { score +=  3; }
  } else {
    score += 5; // neutral wenn kein Datum bekannt
  }

  // Geburtsort (max 10)
  const plA = compactPlace(pA.birth?.place || '').toLowerCase().slice(0, 40);
  const plB = compactPlace(pB.birth?.place || '').toLowerCase().slice(0, 40);
  if (plA && plB) {
    const r = _dedupLevenshtein(plA, plB);
    score += r * 10;
    if (r >= 0.9) reasons.push('Geburtsort identisch');
    else if (r >= 0.7) reasons.push('Geburtsort ähnlich');
  }

  return { score: Math.round(score), reasons };
}

// Paarweise Duplikatsuche mit Nachname-Bucketing (O(n·k²) statt O(n²))
// Gibt sortierte Liste [{pA, pB, score, reasons}] zurück
function findDuplicatePairs(threshold) {
  threshold = threshold || 65;
  const persons = Object.values(AppState.db.individuals);
  const results = [];

  const buckets = {};
  for (const p of persons) {
    const key = _dedupNormName(p.surname || p.name || '').slice(0, 3) || '___';
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(p);
  }

  for (const bucket of Object.values(buckets)) {
    for (let i = 0; i < bucket.length - 1; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        const pA = bucket[i], pB = bucket[j];
        const { score, reasons } = _dedupScorePair(pA, pB);
        if (score >= threshold) results.push({ pA, pB, score, reasons });
      }
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

// ─────────────────────────────────────
//  HTML-UTILS
// ─────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
