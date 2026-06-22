// ─────────────────────────────────────
//  PLACE LIST
// ─────────────────────────────────────

// P3: Typ-Labels (DE) + Icons
const PLACE_TYPE_LBL = {
  Country:'Land', State:'Bundesland', Region:'Region', Province:'Provinz',
  County:'Kreis', District:'Bezirk', Municipality:'Gemeinde', City:'Stadt',
  Town:'Stadt', Village:'Dorf', Hamlet:'Weiler', Parish:'Pfarrei',
  Borough:'Stadtteil', Locality:'Ortslage', Neighborhood:'Nachbarschaft',
  Building:'Gebäude', Farm:'Hof', Cemetery:'Friedhof', Church:'Kirche', Unknown:'',
};
const PLACE_TYPE_ICON = {
  Church:'⛪', Parish:'⛪', Cemetery:'⚰', Farm:'🏡',
  Village:'🏘', Town:'🏘', City:'🏙', Country:'🌍',
};

let _placeTypeFilter   = '';
let _placeGroupMode    = false; // true = nach PlaceObject gruppiert (aktueller Titel)
let _placeGovFilter    = false; // true = nur unaufgelöste GOV-Platzhalter
let _placeShowAdmin    = false; // true = Verwaltungsgebiete (0 Personen, kein directRef) einblenden
let _placeDetailMap   = null;  // P5a-5: Leaflet-Instanz für Mini-Karte im Steckbrief

// Item 12: Badge mit Anzahl Validator-Warnungen auf dem ⚠-Button
function _refreshPlaceValidatorBadge() {
  const badge = document.getElementById('placeValidatorBadge');
  if (!badge || typeof validatePlaces !== 'function') return;
  const n = validatePlaces().length;
  if (n) { badge.textContent = String(n); badge.hidden = false; }
  else   { badge.hidden = true; }
}

// Badge mit Anzahl Orts-Dubletten-Gruppen auf dem ⇉-Button. Macht stale/divergente
// Ortsstrings (z.B. nach Ortsmodell-Anreicherung) proaktiv sichtbar — auflösbar per Merge.
// Modus-Wahl analog openPlaceMergeModal: placeObjects bevorzugt, sonst String-Dedup.
// kind='places' filtert Höfe (Farm/Building) aus, weil die im Höfe-Tab ihren eigenen
// ⇉-Button + eigenes Modal haben.
function _refreshPlaceMergeBadge() {
  const badge = document.getElementById('placeMergeBadge');
  if (!badge) return;
  let n = 0;
  const hasObjects = typeof findPlaceDuplicates === 'function'
    && Object.keys(AppState.db?.placeObjects || {}).length > 0;
  if (hasObjects) n = findPlaceDuplicates(1, 'places').length;
  else if (typeof findStringPlaceDuplicates === 'function') n = findStringPlaceDuplicates().length;
  if (n) { badge.textContent = String(n); badge.hidden = false; }
  else   { badge.hidden = true; }
}

// Badge fürs Höfe-Tab: zählt nur Farm/Building-Dubletten.
function _refreshHofMergeBadge() {
  const badge = document.getElementById('hofMergeBadge');
  if (!badge) return;
  let n = 0;
  if (typeof findPlaceDuplicates === 'function'
      && Object.keys(AppState.db?.placeObjects || {}).length > 0) {
    n = findPlaceDuplicates(1, 'farms').length;
  }
  if (n) { badge.textContent = String(n); badge.hidden = false; }
  else   { badge.hidden = true; }
}

// Item 13: Badge mit Anzahl unaufgelöster GOV-Platzhalter auf dem ⚙-Button
function _refreshPlaceGovUnresolvedBadge() {
  const btn = document.getElementById('placeGovFilterBtn');
  if (!btn) return;
  const pos = AppState.db?.placeObjects || {};
  const n = Object.values(pos).filter(p => p._govUnresolved).length;
  // Title als Hover-Info, Count als Suffix im aria-label
  if (n) {
    btn.title = `${n} unaufgelöste GOV-Platzhalter (über gov-enrich.py oder manuell ergänzen)`;
    btn.setAttribute('aria-label', `GOV-Platzhalter (${n} offen)`);
    btn.classList.add('icon-btn--has-unresolved');
  } else {
    btn.title = 'Nur unaufgelöste GOV-Platzhalter anzeigen';
    btn.setAttribute('aria-label', 'GOV-Platzhalter');
    btn.classList.remove('icon-btn--has-unresolved');
  }
}

function setPlaceTypeFilter(val) {
  _placeTypeFilter = val || '';
  const q = document.getElementById('searchPlaces')?.value || '';
  filterPlaces(q);
}

// Befüllt den Typ-Filter-Select dynamisch mit tatsächlich vorhandenen Typen.
function _refreshPlaceTypeFilter() {
  const sel = document.getElementById('placeTypeFilter');
  if (!sel) return;
  const usedTypes = new Set();
  for (const pl of collectPlaces().values()) {
    if (pl.type) usedTypes.add(pl.type);
  }
  if (!usedTypes.size) return;
  // Reihenfolge: PLACE_TYPE_LBL-Schlüsselreihenfolge (geografisch grob von groß→klein)
  const ordered = Object.keys(PLACE_TYPE_LBL).filter(t => usedTypes.has(t));
  // Unbekannte Typen (nicht in PLACE_TYPE_LBL) ans Ende
  for (const t of usedTypes) if (!PLACE_TYPE_LBL[t]) ordered.push(t);
  const prev = sel.value;
  sel.innerHTML = '<option value="">Alle Typen</option>'
    + ordered.map(t => `<option value="${esc(t)}">${esc(PLACE_TYPE_LBL[t] || t)}</option>`).join('');
  sel.value = usedTypes.has(prev) ? prev : '';
}

function togglePlaceGroupMode() {
  _placeGroupMode = !_placeGroupMode;
  const btn = document.getElementById('placeGroupBtn');
  if (btn) btn.classList.toggle('icon-btn--active', _placeGroupMode);
  const q = document.getElementById('searchPlaces')?.value || '';
  filterPlaces(q);
}

function togglePlaceGovFilter() {
  _placeGovFilter = !_placeGovFilter;
  const btn = document.getElementById('placeGovFilterBtn');
  if (btn) btn.classList.toggle('icon-btn--active', _placeGovFilter);
  const q = document.getElementById('searchPlaces')?.value || '';
  filterPlaces(q);
}

function togglePlaceAdminFilter() {
  _placeShowAdmin = !_placeShowAdmin;
  const btn = document.getElementById('placeAdminFilterBtn');
  if (btn) btn.classList.toggle('icon-btn--active', _placeShowAdmin);
  const q = document.getElementById('searchPlaces')?.value || '';
  filterPlaces(q);
}

// Fasst alle place-Einträge mit derselben placeId unter dem PlaceObject-Titel zusammen.
// Einträge ohne placeId bleiben einzeln erhalten.
function _groupPlacesByObject(entries) {
  const reg = typeof getPlaceRegistry === 'function' ? getPlaceRegistry() : null;
  if (!reg) return entries;
  const grouped = new Map(); // placeId → merged entry
  const ungrouped = [];
  for (const pl of entries) {
    if (!pl.placeId) { ungrouped.push(pl); continue; }
    const po = reg.byId[pl.placeId];
    if (!po) { ungrouped.push(pl); continue; }
    const key = pl.placeId;
    if (!grouped.has(key)) {
      // Koord-Paar-Invariante: nur als vollständiges Paar (lat+long) übernehmen,
      // sonst beide null. Halbe Werte aus historischen Daten würden sonst
      // showPlaceDetail crashen (place.long.toFixed auf null).
      const _gLat = po.lat ?? pl.lati, _gLong = po.long ?? pl.long;
      const _gPair = (_gLat != null && _gLong != null);
      grouped.set(key, {
        name: po.title, placeId: pl.placeId,
        personIds: new Set(), eventTypes: new Set(),
        lati: _gPair ? _gLat : null, long: _gPair ? _gLong : null,
        type: po.type || pl.type || null,
        _variantCount: 0,
      });
    }
    const g = grouped.get(key);
    for (const id of pl.personIds) g.personIds.add(id);
    for (const t of pl.eventTypes) g.eventTypes.add(t);
    if (g.lati === null && pl.lati !== null && pl.long !== null) { g.lati = pl.lati; g.long = pl.long; }
    g._variantCount++;
  }
  return [...grouped.values(), ...ungrouped]
    .sort((a, b) => compactPlace(a.name).localeCompare(compactPlace(b.name), 'de'));
}

function collectPlaces() {
  if (UIState._placesCache) return UIState._placesCache;
  // ADR-028 Phase 3: id-keyed primary statt string-keyed. Map<placeId | string, Entry>:
  //   - Wenn _eventPlaceId(ev) auflöst → Key = placeId (alle Cache-Varianten desselben
  //     Orts kollabieren auf einen Eintrag, zwei POs gleichen Titels bleiben getrennt).
  //   - Sonst → Key = Roh-String (Fallback-Bucket für unverknüpfte Events).
  // byName-Index parallel für Lookup-Kompatibilität (showPlaceForm/-Detail rufen
  // collectPlaces().get(placeName) mit dem lesbaren Titel).
  const places = new Map();
  const byName = new Map();

  function addPlace(personId, eventType, ev) {
    if (!ev) return;
    const pid = (typeof _eventPlaceId === 'function') ? _eventPlaceId(ev) : null;
    const rawName = (ev.place || '').trim();
    if (!pid && !rawName) return;
    const key = pid || rawName;
    if (!places.has(key)) {
      places.set(key, {
        name: rawName || key, placeId: pid || null,
        personIds: new Set(), eventTypes: new Set(),
        lati: null, long: null,
      });
    }
    const pl = places.get(key);
    pl._directRef = true;
    if (personId) pl.personIds.add(personId);
    if (eventType) pl.eventTypes.add(eventType);
    // Koord-Paar-Invariante: nur als vollständiges Paar übernehmen
    if (pl.lati === null && ev.lati != null && ev.long != null) {
      pl.lati = ev.lati; pl.long = ev.long;
    }
  }

  for (const p of Object.values(AppState.db.individuals)) {
    addPlace(p.id, 'Geburt',     p.birth);
    addPlace(p.id, 'Tod',        p.death);
    addPlace(p.id, 'Taufe',      p.chr);
    addPlace(p.id, 'Beerdigung', p.buri);
    for (const ev of p.events) addPlace(p.id, ev.eventType || ev.type, ev);
  }
  for (const f of Object.values(AppState.db.families)) {
    addPlace(f.husb, 'Heirat', f.marr);
    addPlace(f.wife, 'Heirat', f.marr);
  }
  // P2 Item 7: extraPlaces wird NICHT mehr eingemischt — `_migrateExtraPlacesToPlaceObjects`
  // bringt Altbestände bei jedem setDb in placeObjects, von wo der untenstehende
  // PlaceRegistry-Pass alles abdeckt (Koords, Titel, Aliase). Sollte je ein neuer
  // extraPlaces-Eintrag dazwischenrutschen (sollte nach P2 nicht passieren), zeigt er
  // beim nächsten Reload via Migration in placeObjects auf — kein Daten-Verlust.
  // PLACE-HIST (ADR-024, P0b-1): id-keyed Einträge holen Display-Name + Koords aus
  // dem PO; string-keyed Einträge (Fallback) suchen ein PO via findByName.
  const _reg = (typeof getPlaceRegistry === 'function') ? getPlaceRegistry() : null;
  if (_reg) {
    for (const [key, pl] of places.entries()) {
      // id-keyed: PO ist bekannt — name + type + Koords aus PO
      if (pl.placeId) {
        const po = _reg.byId[pl.placeId];
        if (!po) continue;
        pl.name = po.title;
        if (!pl.type) pl.type = po.type || null;
        // placeObjects = single source of truth (Item 9) — po gewinnt IMMER (auch null)
        if (po.lat != null && po.long != null) { pl.lati = po.lat; pl.long = po.long; }
        else                                    { pl.lati = null;  pl.long = null;  }
        if (po._govUnresolved) pl._govUnresolved = true;
        if (po.title) byName.set(po.title, pl);
        continue;
      }
      // string-keyed Fallback: findByName-Anreicherung
      const id = _reg.findByName(pl.name);
      if (!id) continue;
      const po = _reg.byId[id];
      if (!po) continue;
      pl.placeId = id;
      if (!pl.type) pl.type = po.type || null;
      if (po.lat != null && po.long != null) { pl.lati = po.lat; pl.long = po.long; }
      else                                    { pl.lati = null;  pl.long = null;  }
      if (po._govUnresolved) pl._govUnresolved = true;
      if (po.title) byName.set(po.title, pl);
    }
    // Importierte placeObjects ohne GEDCOM-Entsprechung: id-keyed dazu.
    // ADR-027 P4: keine Farm/Building mehr in placeObjects.
    // ADR-028 Phase 1: _orphan-markierte Farm-POs ausblenden.
    for (const po of Object.values(AppState.db.placeObjects || {})) {
      if (po._orphan) continue;
      if (places.has(po.id)) continue;
      const _pPair = (po.lat != null && po.long != null);
      const entry = {
        name: po.title || '', placeId: po.id,
        personIds: new Set(), eventTypes: new Set(),
        lati: _pPair ? po.lat : null, long: _pPair ? po.long : null,
        type: po.type || null,
        _govUnresolved: po._govUnresolved || false,
      };
      places.set(po.id, entry);
      if (po.title) byName.set(po.title, entry);
    }
  }
  // Wrapper simuliert die alte Map-API für Konsumenten, ergänzt um byName-Lookup
  // (collectPlaces().get(placeName) findet id-keyed Einträge via Title-Index).
  const wrapper = {
    get size() { return places.size; },
    has(key) { return places.has(key) || byName.has(key); },
    get(key) { return places.get(key) || byName.get(key); },
    values() { return places.values(); },
    keys() { return places.keys(); },
    entries() { return places.entries(); },
    forEach(fn, thisArg) { return places.forEach(fn, thisArg); },
    [Symbol.iterator]() { return places[Symbol.iterator](); },
  };
  UIState._placesCache = wrapper;
  return wrapper;
}

function renderPlaceList(sorted) {
  const el = document.getElementById('placeList');
  if (!sorted) {
    // Filter-State (Typ, GOV, Gruppierung, Suchtext) beibehalten — via filterPlaces statt direkt rendern
    _refreshPlaceTypeFilter();
    _refreshPlaceValidatorBadge();
    _refreshPlaceGovUnresolvedBadge();
    _refreshPlaceMergeBadge();
    const q = document.getElementById('searchPlaces')?.value || '';
    filterPlaces(q);
    return;
  }
  if (!sorted.length) { el.innerHTML = '<div class="empty">Keine Orte gefunden</div>'; return; }

  let html = '';
  let lastLetter = '';
  for (const place of sorted) {
    const fl = (compactPlace(place.name) || place.name)[0].toUpperCase();
    if (fl !== lastLetter) { html += `<div class="alpha-sep">${fl}</div>`; lastLetter = fl; }
    const count = place.personIds.size;
    const hasGeo = place.lati !== null && place.long !== null;
    const typeIcon = (place.type && PLACE_TYPE_ICON[place.type]) ? PLACE_TYPE_ICON[place.type]
                   : hasGeo ? '📍' : '·';
    const typeLbl  = place.type ? (PLACE_TYPE_LBL[place.type] || place.type) : '';
    const typeBadge = typeLbl ? `<span class="place-type-badge">${esc(typeLbl)}</span>` : '';
    const varBadge    = (place._variantCount > 1)
      ? `<span class="place-type-badge place-var-badge">${place._variantCount} Varianten</span>` : '';
    const govBadge    = place._govUnresolved
      ? `<span class="place-type-badge place-gov-badge">GOV?</span>` : '';
    // Nicht-verknüpfte placeObjects: existieren, aber kein Ereignis referenziert sie direkt
    const unlinkBadge = (!place._directRef && count === 0)
      ? `<span class="place-type-badge place-unlink-badge">Nicht verknüpft</span>` : '';
    html += `<div class="person-row" data-action="showPlaceDetail" data-name="${esc(place.placeId || place.name)}">
      <div class="p-avatar p-avatar--md">${typeIcon}</div>
      <div class="p-info">
        <div class="p-name">${esc(compactPlace(place.name))}${typeBadge}${varBadge}${govBadge}${unlinkBadge}</div>
        <div class="p-meta">${count} Person${count !== 1 ? 'en' : ''}${hasGeo ? ' · Karte' : ''}</div>
      </div>
      <span class="p-arrow">›</span>
    </div>`;
  }
  el.innerHTML = html;
}

function filterPlaces(q) {
  const lower = q.toLowerCase().trim();
  // Verwaltungsgebiete / unverknüpfte POs = kein direkter Ereignisbezug + 0 Personen
  const _isAdminOnly = pl => !pl._directRef && pl.personIds.size === 0;

  let all = [...collectPlaces().values()].sort((a, b) => compactPlace(a.name).localeCompare(compactPlace(b.name), 'de'));
  if (_placeTypeFilter) all = all.filter(pl => pl.type === _placeTypeFilter);
  if (_placeGovFilter)  all = all.filter(pl => pl._govUnresolved);

  // Admin-Filter: standardmäßig versteckt, via Toggle einblendbar
  const adminHidden = all.filter(_isAdminOnly);
  if (!_placeShowAdmin) all = all.filter(pl => !_isAdminOnly(pl));
  _refreshPlaceAdminBadge(adminHidden.length);

  if (_placeGroupMode) all = _groupPlacesByObject(all);
  if (!lower) { renderPlaceList(all); return; }
  renderPlaceList(all.filter(pl => pl.name.toLowerCase().includes(lower)));
}

function _refreshPlaceAdminBadge(count) {
  const btn = document.getElementById('placeAdminFilterBtn');
  if (!btn) return;
  btn.hidden = count === 0 && !_placeShowAdmin;
  const badge = btn.querySelector('.place-validator-btn-badge');
  if (badge) { badge.textContent = count; badge.hidden = count === 0; }
}

// ─── P4: GOV-Text-Parser ─────────────────────────────────────────────────────

const _GOV_TYPE_MAP = {
  'Landgemeinde':'Municipality', 'Gemeinde':'Municipality', 'Verbandsgemeinde':'Municipality',
  'Samtgemeinde':'Municipality', 'Verwaltungsgemeinschaft':'Municipality', 'Amt':'Municipality',
  'Stadt':'Town', 'Stadt (Gebietskörperschaft)':'Town', 'Stadtgemeinde':'Town',
  'Wigbold':'Town', 'Flecken':'Town', 'Marktgemeinde':'Town',
  'Dorf':'Village', 'Kirchdorf':'Village',
  'Weiler':'Hamlet', 'Einöde':'Hamlet',
  'Kirchspiel':'Parish', 'Kirchengemeinde':'Parish', 'Pfarrei':'Parish',
  'Bistum':'Parish', 'Erzbistum':'Parish',
  'Landkreis':'County', 'Kreis':'County', 'Stadtkreis':'County',
  'Regierungsbezirk':'District', 'Bezirk':'District',
  'Provinz':'State', 'Bundesland':'State', 'Land':'State', 'Freistaat':'State',
  'Staat':'Country', 'Königreich':'Country', 'Großherzogtum':'Country',
  'Herzogtum':'Country', 'Fürstentum':'Country', 'Kurfürstentum':'Country',
  'Freie Stadt':'City',
  'Kirche':'Church', 'Friedhof':'Cemetery', 'Hof':'Farm',
};

// Parst GOV-Textzusammenfassung → strukturiertes Objekt
function _parseGovText(raw) {
  const lines = raw.split(/\n/).map(l => l.replace(/^\s+/, '').replace(/[,;]\s*$/, '').trim()).filter(Boolean);
  if (!lines.length) return null;

  const result = { govId: lines[0], types: [], names: [], parents: [], extIds: {}, description: '' };

  // Datum aus "ab DATE bis DATE" / "DATE" extrahieren
  const _date = s => {
    if (!s) return null;
    const m = s.match(/(\d{4}(?:-\d{2}(?:-\d{2})?)?)/);
    return m ? m[1] : null;
  };

  for (const line of lines.slice(1)) {
    // TEXT:...:TEXT
    if (line.startsWith('TEXT:')) {
      result.description = line.replace(/^TEXT:/, '').replace(/:TEXT$/, '').trim();
      continue;
    }
    // gehört [ab DATE] [bis DATE] zu object_XXX
    // Achtung: kein trailing \s+ — Zeile endet nach dem object-ID (Komma/Semikolon schon abgeschnitten)
    const mGeh = line.match(/^gehört(?:\s+ab\s+(\S+))?(?:\s+bis\s+(\S+))?\s+zu\s+(object_\S+|\S+)/);
    if (mGeh) {
      result.parents.push({ govObjId: mGeh[3], dateFrom: _date(mGeh[1]), dateTo: _date(mGeh[2]) });
      continue;
    }
    // gehört DATE zu object_XXX (Stichtag ohne ab/bis, Legacy-Format)
    const mGeh2 = line.match(/^gehört\s+(\d\S+)\s+zu\s+(object_\S+|\S+)/);
    if (mGeh2) {
      result.parents.push({ govObjId: mGeh2[2], dateFrom: _date(mGeh2[1]), dateTo: _date(mGeh2[1]) });
      continue;
    }
    // ist [ab DATE] [bis DATE] (auf deu) TYPE
    const mIst = line.match(/^ist(?:\s+ab\s+(\S+))?(?:\s+bis\s+(\S+))?\s+\(auf \w+\)\s+(.+?)(?:\s+sagt|$)/);
    if (mIst) {
      const raw_type = mIst[3].trim();
      result.types.push({ rawType: raw_type, type: _GOV_TYPE_MAP[raw_type] || 'Unknown', dateFrom: _date(mIst[1]), dateTo: _date(mIst[2]) });
      continue;
    }
    // heißt [DATE] (auf LANG) NAME
    const mName = line.match(/^heißt\s+(?:\S+\s+)?\(auf (\w+)\)\s+(.+?)(?:\s+sagt|$)/);
    if (mName) {
      result.names.push({ lang: mName[1], value: mName[2].trim() });
      continue;
    }
    // hat externe Kennung geonames:XXX
    const mExt = line.match(/^hat externe Kennung\s+(\w+):(\S+)/);
    if (mExt) { result.extIds[mExt[1]] = mExt[2]; continue; }
  }
  return result;
}

// Wendet geparste GOV-Daten auf das aktuelle placeObject im Edit-Modal an
function applyGovText() {
  const raw = document.getElementById('pl-gov-text')?.value?.trim();
  if (!raw) { showToast('⚠ Kein GOV-Text eingefügt', 'warn'); return; }

  const parsed = _parseGovText(raw);
  if (!parsed?.govId) { showToast('⚠ GOV-ID nicht erkannt', 'warn'); return; }

  // Ziel-placeObject identifizieren — anlegen wenn noch nicht im Modal
  let poId = document.getElementById('pl-placeId')?.value || '';
  const pos = AppState.db.placeObjects || (AppState.db.placeObjects = {});
  if (!poId || !pos[poId]) {
    const nameVal = document.getElementById('pl-name')?.value.trim() || document.getElementById('pl-old')?.value.trim();
    if (!nameVal) { showToast('⚠ Erst Ortsname eingeben und speichern', 'warn'); return; }
    poId = (typeof _epId === 'function') ? _epId(nameVal) : ('_epg_' + Date.now().toString(36));
  }

  let changes = 0;
  let newType = null, newTitle = null; // für UI-Sync außerhalb der Mutation

  upsertPlaceObject(
    poId,
    () => ({ id: poId,
      title: document.getElementById('pl-name')?.value.trim()
          || document.getElementById('pl-old')?.value.trim() || '',
      type: 'Unknown', lat: null, long: null,
      pnames: [], enclosedBy: [], parentId: null }),
    po => {
      if (!po._govId) { po._govId = parsed.govId; changes++; }
      if (po._govUnresolved) { delete po._govUnresolved; changes++; }

      // _govTypes[]: alle ist-Einträge mit Zeitraum speichern (wie pnames für Typ-Geschichte)
      if (!Array.isArray(po._govTypes)) po._govTypes = [];
      if (!Array.isArray(po.pnames)) po.pnames = [];
      const _baseTitle = po.title || '';
      for (const t of parsed.types) {
        const exists = po._govTypes.some(g =>
          g.rawType === t.rawType && g.dateFrom === t.dateFrom && g.dateTo === t.dateTo);
        if (!exists) { po._govTypes.push({ rawType: t.rawType, type: t.type, dateFrom: t.dateFrom || null, dateTo: t.dateTo || null }); changes++; }
        // Als datierter pname spiegeln: "Königreich Preußen" mit Zeitraum → GRAMPS + Steckbrief
        if (_baseTitle) {
          const fullName = `${t.rawType} ${_baseTitle}`;
          const pnExists = po.pnames.some(p => p.value === fullName && p.dateFrom === (t.dateFrom || null) && p.dateTo === (t.dateTo || null));
          if (!pnExists) {
            po.pnames.push({ value: fullName, lang: t.lang || 'deu', dateFrom: t.dateFrom || null, dateTo: t.dateTo || null, dateType: null, _dateRaw: null });
            changes++;
          }
        }
      }

      // Typ: open-ended bevorzugt, sonst neuester Eintrag (höchstes dateFrom)
      const _typByRecent = parsed.types.slice().sort((a, b) => {
        const ay = a.dateFrom ? parseInt(a.dateFrom) : 0;
        const by = b.dateFrom ? parseInt(b.dateFrom) : 0;
        return by - ay;
      });
      const currentType = parsed.types.find(t => !t.dateTo) || _typByRecent[0];
      if (currentType && currentType.type !== 'Unknown') {
        if (!po.type || po.type === 'Unknown' || po.type !== currentType.type) {
          po.type = currentType.type;
          newType = po.type;
          changes++;
        }
      }

      // Namen: nur neue hinzufügen
      if (!Array.isArray(po.pnames)) po.pnames = [];
      for (const n of parsed.names) {
        const exists = po.pnames.some(p => p.value === n.value && p.lang === n.lang);
        if (!exists) {
          po.pnames.push({ value: n.value, lang: n.lang, dateFrom: null, dateTo: null, dateType: null, _dateRaw: null });
          changes++;
        }
      }

      // Titel aktualisieren wenn Platzhalter (Titel = GOV-ID) oder leer
      if (po.title === parsed.govId || !po.title) {
        const primary = parsed.names.find(n => n.lang === 'deu') || parsed.names[0];
        if (primary?.value) { po.title = primary.value; newTitle = po.title; changes++; }
      }

      // Eltern-Referenzen: Platzhalter-placeObjects anlegen
      if (!Array.isArray(po.enclosedBy)) po.enclosedBy = [];
      for (const parent of parsed.parents) {
        const existsInEnc = po.enclosedBy.some(e => {
          const parentPo = pos[e.placeId];
          return parentPo?._govId === parent.govObjId || parentPo?.title === parent.govObjId;
        });
        if (existsInEnc) continue;
        let parentId = Object.values(pos).find(p => p._govId === parent.govObjId || p.title === parent.govObjId)?.id;
        if (!parentId) {
          parentId = _epId ? _epId(parent.govObjId) : ('_govp_' + parent.govObjId.replace(/\W/g,'_'));
          pos[parentId] = { id: parentId, title: parent.govObjId, type: 'Unknown',
            lat: null, long: null, pnames: [], enclosedBy: [], parentId: null,
            _govId: parent.govObjId, _govUnresolved: true };
        }
        po.enclosedBy.push({ placeId: parentId, dateFrom: parent.dateFrom, dateTo: parent.dateTo, dateType: null, _dateRaw: null });
        changes++;
      }
      if (!po.parentId && po.enclosedBy.length) po.parentId = po.enclosedBy[0].placeId;
    }
  );

  // UI-Sync außerhalb der Mutation (Modal noch offen)
  const poFinal = pos[poId];
  if (document.getElementById('pl-placeId')) document.getElementById('pl-placeId').value = poId;
  if (newType) { const sel = document.getElementById('pl-type'); if (sel) sel.value = newType; }
  if (newTitle) { const inp = document.getElementById('pl-name'); if (inp) inp.value = newTitle; }
  document.getElementById('pl-gov-text').value = '';
  _renderPlaceNamesList(poFinal);
  _renderEnclosedByList(poFinal);
  showToast(`✓ GOV-Daten übernommen (${changes} Änderungen) — unaufgelöste Eltern-IDs via gov-enrich.py auflösen`);
}

// ─── P4: Geocoding UI ────────────────────────────────────────────────────────

async function geocodeCurrentPlace() {
  const name = AppState.currentPlaceName;
  if (!name) return;
  showToast('⏳ Geocodiere…', 'info');
  try {
    const res = await geocodeSinglePlace(name);
    if (!res) { showToast('⚠ Kein Ergebnis von Nominatim', 'warn'); return; }
    const typeLbl = PLACE_TYPE_LBL[res.type] || res.type;
    showToast(`✓ ${typeLbl} · ${res.lat.toFixed(4)}, ${res.lon.toFixed(4)}`, 'success');
    showPlaceDetail(AppState.currentPlaceRef || name, false);
  } catch (e) {
    showToast('⚠ Geocoding-Fehler: ' + e.message, 'error');
  }
}

let _batchAbort = false;

async function startBatchGeocode() {
  const modal = document.getElementById('modalBatchGeocode');
  if (!modal) return;
  _batchAbort = false;
  document.getElementById('batchGeocodeProgress').textContent = 'Starte…';
  document.getElementById('batchGeocodeBar').style.width = '0%';
  document.getElementById('batchGeocodeDone').hidden = true;
  document.getElementById('batchGeocodeAbortBtn').hidden = false;
  openModal('modalBatchGeocode');

  const ok = await batchGeocodePlaces((done, total, name) => {
    if (_batchAbort) return;
    if (name === 'done') {
      document.getElementById('batchGeocodeProgress').textContent = `Fertig — ${done} Orte verarbeitet.`;
      document.getElementById('batchGeocodeBar').style.width = '100%';
      document.getElementById('batchGeocodeDone').hidden = false;
      document.getElementById('batchGeocodeAbortBtn').hidden = true;
      UIState._placesCache = null;
      renderPlaceList();
      return;
    }
    const pct = total ? Math.round(done / total * 100) : 0;
    document.getElementById('batchGeocodeProgress').textContent = `${done}/${total} · ${name.slice(0,40)}`;
    document.getElementById('batchGeocodeBar').style.width = pct + '%';
  });
}

function abortBatchGeocode() {
  _batchAbort = true;
  closeModal('modalBatchGeocode');
  showToast('Batch-Geocoding abgebrochen');
}

// ─── P3: Ort-Suchpicker ───────────────────────────────────────────────────────
// Öffnet den modalPlacePicker für das Ziel-Eingabefeld (z.B. 'ef-place').
function openPlacePicker(targetFieldId) {
  UIState._placePickerMode   = 'place';
  UIState._placePickerTarget = targetFieldId || 'ef-place';
  const el = document.getElementById('placePickerSearch');
  if (el) el.value = '';
  renderPlacePickerList('');
  openModal('modalPlacePicker');
}

// ADR-026 Teil C: Hof-Picker — listet Farm/Building-placeObjects (mit Dorf-
// Kontext) statt Orte, optional auf den im Event gewählten Ort eingegrenzt.
// Auswahl füllt das Adressfeld (ev.addr); die Migration verknüpft beim Laden.
function openHofPicker() {
  UIState._placePickerMode   = 'hof';
  UIState._placePickerTarget = 'ef-addr';
  let ortId = document.getElementById('ef-place-id')?.value || '';
  if (!ortId) {
    const v = document.getElementById('ef-place')?.value?.trim();
    if (v && typeof getPlaceRegistry === 'function') ortId = getPlaceRegistry().findByName(v) || '';
  }
  UIState._hofPickerOrtId = ortId;
  const el = document.getElementById('placePickerSearch');
  if (el) el.value = '';
  renderPlacePickerList('');
  openModal('modalPlacePicker');
}

function _renderHofPickerList(q) {
  const list = document.getElementById('placePickerList');
  if (!list) return;
  const lower = q.toLowerCase().trim();
  const ortId = UIState._hofPickerOrtId;
  const pos   = AppState.db.placeObjects || {};
  let farms = Object.values(pos).filter(po => po.type === 'Farm' || po.type === 'Building');
  if (ortId) farms = farms.filter(po => (po.enclosedBy || []).some(en => en.placeId === ortId));
  if (lower) farms = farms.filter(po => po.title.toLowerCase().includes(lower));
  farms.sort((a, b) => a.title.localeCompare(b.title, 'de'));
  if (!farms.length) {
    list.innerHTML = `<div class="empty">Keine Höfe${ortId ? ' in diesem Ort' : ''} angelegt — Adresse einfach eintippen</div>`;
    return;
  }
  list.innerHTML = farms.slice(0, 120).map(po => {
    const enc  = (po.enclosedBy || [])[0];
    const vill = enc && pos[enc.placeId] ? pos[enc.placeId].title : '';
    const badge = vill ? `<span class="place-type-badge">${esc(vill)}</span>` : '';
    return `<div class="person-row" data-action="placePickerSelect" data-id="${esc(po.id)}" data-name="${esc(po.title)}">
      <div class="p-avatar p-avatar--sm">🏡</div>
      <div class="p-info"><div class="p-name">${esc(po.title)}${badge}</div></div>
    </div>`;
  }).join('');
}

function renderPlacePickerList(q) {
  if (UIState._placePickerMode === 'hof') return _renderHofPickerList(q);
  const list = document.getElementById('placePickerList');
  if (!list) return;
  const lower = q.toLowerCase().trim();

  // Dieselbe Quelle wie die Ortsliste: alle Event-Orte, angereichert mit placeId/type
  let rows = [...collectPlaces().values()]
    .map(pl => ({ name: pl.name, placeId: pl.placeId || '', type: pl.type || '' }));

  // Höfe (Farm/Building) gehören in den Hof-Picker, nicht in die Ort-Auswahl (ADR-026).
  rows = rows.filter(r => {
    const po = AppState.db.placeObjects?.[r.placeId];
    return !(po && (po.type === 'Farm' || po.type === 'Building'));
  });

  if (lower) rows = rows.filter(r => {
    if (r.name.toLowerCase().includes(lower)) return true;
    // Sprachvarianten (pname.lang gesetzt) als zusätzliche Suchbegriffe
    const po = AppState.db.placeObjects?.[r.placeId];
    return (po?.pnames || []).some(pn => pn.lang && pn.value.toLowerCase().includes(lower));
  });
  rows.sort((a, b) => a.name.localeCompare(b.name, 'de'));

  if (!rows.length) { list.innerHTML = '<div class="empty">Keine Orte gefunden</div>'; return; }
  list.innerHTML = rows.slice(0, 120).map(r => {
    const icon  = PLACE_TYPE_ICON[r.type] || '📍';
    const lbl   = r.type ? (PLACE_TYPE_LBL[r.type] || r.type) : '';
    const badge = lbl ? `<span class="place-type-badge">${esc(lbl)}</span>` : '';
    return `<div class="person-row" data-action="placePickerSelect" data-id="${esc(r.placeId)}" data-name="${esc(r.name)}">
      <div class="p-avatar p-avatar--sm">${icon}</div>
      <div class="p-info"><div class="p-name">${esc(r.name)}${badge}</div></div>
    </div>`;
  }).join('');
}

function placePickerSelect(placeId, placeName) {
  const target = UIState._placePickerTarget || 'ef-place';
  const inp = document.getElementById(target);
  const idInp = document.getElementById(target + '-id');
  if (inp) inp.value = placeName || '';
  if (idInp) idInp.value = placeId || '';
  // input-Event feuern, damit delegierte input-Listener (z.B. Template-Builder qtFieldEdit) den
  // neuen Wert + die zugehörige placeId aus dem Hidden-Input einlesen.
  if (inp) inp.dispatchEvent(new Event('input', { bubbles: true }));
  UIState._placePickerMode = 'place';   // Modus zurücksetzen (Hof-Picker → Ort-Picker)
  closeModal('modalPlacePicker');
}

// Gibt das placeObject für einen Ortsnamen zurück (via Registry), oder null.
function _placeObjForName(name) {
  if (typeof getPlaceRegistry !== 'function') return null;
  const reg = getPlaceRegistry();
  const id = reg.findByName(name);
  return id ? reg.byId[id] : null;
}

function showPlaceForm(placeName, placeId = null) {
  // Stufe 2b: präzise Identität bevorzugen — sonst öffnet „Bearbeiten" auf dem Kreis
  // Münster das Formular der gleichnamigen Stadt (findByName-Raten).
  const _reg = (typeof getPlaceRegistry === 'function') ? getPlaceRegistry() : null;
  const po = (placeId && _reg && _reg.byId[placeId]) ? _reg.byId[placeId] : _placeObjForName(placeName);
  if (po && po.title) placeName = po.title;
  document.getElementById('pl-old').value     = placeName;
  document.getElementById('pl-placeId').value = po ? po.id : '';
  document.getElementById('pl-name').value    = po ? po.title : placeName;
  document.getElementById('pl-type').value    = po?.type || 'Unknown';
  document.getElementById('pl-exists-from').value = po?.existsFrom || '';
  document.getElementById('pl-exists-to').value   = po?.existsTo   || '';
  document.getElementById('pl-note').value        = po?.note       || '';

  // Koordinaten: placeObject hat Vorrang vor extraPlaces-Cache
  const ep   = AppState.db.extraPlaces[placeName];
  const pl   = collectPlaces().get(placeName);
  const lati = po?.lat ?? ep?.lati ?? pl?.lati ?? null;
  const long = po?.long ?? ep?.long ?? pl?.long ?? null;
  document.getElementById('pl-lati').value = lati != null ? String(lati) : '';
  document.getElementById('pl-long').value = long != null ? String(long) : '';

  _renderPlaceNamesList(po);
  _renderEnclosedByList(po);
  openModal('modalPlace');
}

function _renderPlaceNamesList(po) {
  const sec  = document.getElementById('pl-pnames-section');
  const list = document.getElementById('pl-pnames-list');
  if (!sec || !list) return;
  if (!po) { sec.hidden = true; return; }
  sec.hidden = false;
  const pnames = po.pnames || [];
  const pnSorted = pnames.map((pn, i) => ({ pn, i }))
    .sort((a, b) => (a.pn.dateFrom || '9999').localeCompare(b.pn.dateFrom || '9999'));
  list.innerHTML = pnSorted.length ? pnSorted.map(({ pn, i }) => {
    const span = [pn.dateFrom, pn.dateTo].filter(Boolean).join('–');
    return `<div class="pname-row">
      <span class="pname-val">${esc(pn.value)}${pn.lang ? ` <em class="tran-lang">${esc(pn.lang)}</em>` : ''}</span>
      ${span ? `<span class="pname-span">${esc(span)}</span>` : ''}
      <button class="edit-btn" data-action="editPlaceName" data-idx="${i}" title="Bearbeiten">✎</button>
      <button class="unlink-btn" data-action="removePlaceName" data-idx="${i}">×</button>
    </div>`;
  }).join('') : '<div class="no-data-pad">Keine alternativen Namen</div>';
}

function _renderEnclosedByList(po) {
  const sec  = document.getElementById('pl-enclosed-section');
  const list = document.getElementById('pl-enclosed-list');
  const sel  = document.getElementById('pl-enclosed-sel');
  if (!sec || !list || !sel) return;
  if (!po) { sec.hidden = true; return; }
  sec.hidden = false;

  const reg = getPlaceRegistry();
  // Eltern-Liste
  const enc = po.enclosedBy || [];
  const encSorted = enc.map((e, i) => ({ e, i }))
    .sort((a, b) => (a.e.dateFrom || '9999').localeCompare(b.e.dateFrom || '9999'));
  list.innerHTML = encSorted.length ? encSorted.map(({ e, i }) => {
    const parent = reg.byId[e.placeId];
    const title  = parent?.title || e.placeId;
    const span   = [e.dateFrom, e.dateTo].filter(Boolean).join('–');
    return `<div class="pname-row">
      <span class="pname-val">${esc(title)}</span>
      ${span ? `<span class="pname-span">${esc(span)}</span>` : ''}
      <button class="edit-btn" data-action="editEnclosedBy" data-idx="${i}" title="Bearbeiten">✎</button>
      <button class="unlink-btn" data-action="removeEnclosedBy" data-idx="${i}">×</button>
    </div>`;
  }).join('') : '<div class="no-data-pad">Nicht zugeordnet</div>';

  // Select mit allen placeObjects befüllen (außer sich selbst)
  const opts = Object.values(AppState.db.placeObjects || {})
    .filter(p => p.id !== po.id)
    .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'de'));
  // Stufe 2: gleichnamige Orte (z.B. Stadt vs. Kreis Münster) per Typ-Label
  // unterscheidbar machen — sonst zeigt das Dropdown zwei identische Optionen
  // und der Nutzer hängt den Ort unter das falsche „Münster".
  const _titleFreq = {};
  for (const p of opts) { const t = _normPlaceName ? _normPlaceName(p.title) : (p.title || ''); _titleFreq[t] = (_titleFreq[t] || 0) + 1; }
  sel.innerHTML = `<option value="">— Ort wählen —</option>`
    + opts.map(p => {
        const t = _normPlaceName ? _normPlaceName(p.title) : (p.title || '');
        const amb = _titleFreq[t] > 1;
        const typeLbl = p.type ? (PLACE_TYPE_LBL[p.type] || p.type) : '';
        const label = amb && typeLbl ? `${p.title} (${typeLbl})` : p.title;
        return `<option value="${esc(p.id)}">${esc(label)}</option>`;
      }).join('');
}

function savePlace() {
  const oldName = document.getElementById('pl-old').value;
  const newName = document.getElementById('pl-name').value.trim();
  if (!newName) { showToast('⚠ Ortsname darf nicht leer sein'); return; }
  const latiRaw = document.getElementById('pl-lati').value.trim();
  const longRaw = document.getElementById('pl-long').value.trim();
  const _pc = latiRaw ? parseCoordInput(latiRaw, longRaw) : { lat: NaN, lon: NaN };
  let lati = isNaN(_pc.lat) ? null : _pc.lat;
  let long = isNaN(_pc.lon) ? null : _pc.lon;
  // Tri-State: 'clear' = beide Felder leer → Koord löschen; 'set' = gültiges Paar
  // setzen; 'keep' = unvollständig/ungültig → bestehende Koord unverändert lassen.
  let _coordOp;
  if (!latiRaw && !longRaw) _coordOp = 'clear';
  else if (lati != null && long != null) _coordOp = 'set';
  else {
    showToast('⚠ Koordinaten unvollständig — lat UND long nötig (Dezimalgrad)', 'warn');
    _coordOp = 'keep';
  }
  closeModal('modalPlace');

  // Ortsnamen in allen Einträgen umbenennen
  if (newName !== oldName) {
    for (const p of Object.values(AppState.db.individuals)) {
      if (p.birth.place  === oldName) p.birth.place  = newName;
      if (p.chr.place    === oldName) p.chr.place    = newName;
      if (p.death.place  === oldName) p.death.place  = newName;
      if (p.buri.place   === oldName) p.buri.place   = newName;
      for (const ev of p.events) if (ev.place === oldName) ev.place = newName;
    }
    for (const f of Object.values(AppState.db.families)) {
      if (f.marr.place   === oldName) f.marr.place   = newName;
      if (f.engag?.place === oldName) f.engag.place  = newName;
    }
  }

  // P2 Item 7: extraPlaces nicht mehr beschreiben — single source of truth ist placeObject.
  // Legacy-Eintrag wegräumen falls vorhanden, damit kein stale-Wert in collectPlaces auftaucht.
  if (AppState.db.extraPlaces[oldName]) delete AppState.db.extraPlaces[oldName];
  if (newName !== oldName && AppState.db.extraPlaces[newName]) delete AppState.db.extraPlaces[newName];
  saveExtraPlaces();

  // placeObject anlegen (falls neu) oder aktualisieren — single source of truth
  const _type = document.getElementById('pl-type')?.value || 'Unknown';
  const _exFrom = document.getElementById('pl-exists-from')?.value.trim() || null;
  const _exTo   = document.getElementById('pl-exists-to')?.value.trim()   || null;
  const _note   = document.getElementById('pl-note')?.value.trim()        || '';
  let _poId = document.getElementById('pl-placeId')?.value || '';
  if (!_poId) _poId = (typeof _epId === 'function') ? _epId(newName) : ('_ep_' + Date.now());
  upsertPlaceObject(
    _poId,
    () => ({ id: _poId, title: newName, type: _type,
             lat: _coordOp === 'set' ? lati : null,
             long: _coordOp === 'set' ? long : null,
             existsFrom: _exFrom, existsTo: _exTo,
             note: _note || undefined,
             pnames: [], enclosedBy: [], parentId: null }),
    p => {
      if (newName !== oldName) p.title = newName;
      p.type = _type;
      p.existsFrom = _exFrom;
      p.existsTo   = _exTo;
      if (_note) p.note = _note; else delete p.note;
      if (_coordOp === 'set')        { p.lat = lati; p.long = long; }
      else if (_coordOp === 'clear') { p.lat = null; p.long = null; }
    }
  );
  if (document.getElementById('pl-placeId')) document.getElementById('pl-placeId').value = _poId;

  // Item 9: KEINE eager Propagation mehr — Render-Pfade lesen Koords via _eventCoords
  // direkt aus dem placeObject. Single source of truth.
  showToast('✓ Ort gespeichert');
  showPlaceDetail(_poId || newName);   // identitäts-primär (placeObject existiert nach upsert)
}

// ─── P2-UI: pnames / enclosedBy inline-Editor ────────────────────────────────
function _currentPoFromModal() {
  const id = document.getElementById('pl-placeId')?.value;
  return id ? (AppState.db.placeObjects || {})[id] : null;
}

let _editPnameIdx     = null; // null = Add-Modus, Zahl = Edit-Modus
let _editEnclosedIdx  = null;

function _setPnameAddMode() {
  _editPnameIdx = null;
  const btn = document.getElementById('pl-pname-add-btn');
  if (btn) { btn.textContent = '+'; btn.title = 'Hinzufügen'; }
}
function _setEnclosedAddMode() {
  _editEnclosedIdx = null;
  const btn = document.getElementById('pl-enclosed-add-btn');
  if (btn) { btn.textContent = '+'; btn.title = 'Hinzufügen'; }
}

function addPlaceName() {
  const po = _currentPoFromModal();
  if (!po) { showToast('⚠ Erst Grunddaten speichern'); return; }
  const val  = document.getElementById('pl-pname-val')?.value.trim();
  if (!val) { showToast('⚠ Name darf nicht leer sein'); return; }
  const lang = document.getElementById('pl-pname-lang')?.value.trim() || '';
  const from = document.getElementById('pl-pname-from')?.value.trim() || null;
  const to   = document.getElementById('pl-pname-to')?.value.trim()   || null;
  if (_editPnameIdx !== null) {
    const i = parseInt(_editPnameIdx, 10);
    mutatePlaceObject(po.id, p => {
      if (p.pnames[i]) Object.assign(p.pnames[i], { value: val, lang, dateFrom: from, dateTo: to });
    });
    _setPnameAddMode();
  } else {
    mutatePlaceObject(po.id, p => {
      if (!Array.isArray(p.pnames)) p.pnames = [];
      p.pnames.push({ value: val, lang, dateFrom: from, dateTo: to, dateType: null, _dateRaw: null });
    });
  }
  ['pl-pname-val','pl-pname-lang','pl-pname-from','pl-pname-to'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  _renderPlaceNamesList(_currentPoFromModal());
}

function editPlaceName(idx) {
  const po = _currentPoFromModal();
  const pn = po?.pnames?.[parseInt(idx, 10)];
  if (!pn) return;
  const fVal  = document.getElementById('pl-pname-val');
  const fLang = document.getElementById('pl-pname-lang');
  const fFrom = document.getElementById('pl-pname-from');
  const fTo   = document.getElementById('pl-pname-to');
  if (fVal)  fVal.value  = pn.value || '';
  if (fLang) fLang.value = pn.lang  || '';
  if (fFrom) fFrom.value = pn.dateFrom || '';
  if (fTo)   fTo.value   = pn.dateTo   || '';
  _editPnameIdx = idx;
  const btn = document.getElementById('pl-pname-add-btn');
  if (btn) { btn.textContent = '✓'; btn.title = 'Änderung speichern'; }
  fVal?.focus();
}

function removePlaceName(idx) {
  const po = _currentPoFromModal();
  if (!po?.pnames) return;
  mutatePlaceObject(po.id, p => { p.pnames.splice(parseInt(idx, 10), 1); });
  if (_editPnameIdx === idx) _setPnameAddMode();
  _renderPlaceNamesList(_currentPoFromModal());
}

function addEnclosedBy() {
  const po = _currentPoFromModal();
  if (!po) { showToast('⚠ Erst Grunddaten speichern'); return; }
  const sel  = document.getElementById('pl-enclosed-sel');
  const pid  = sel?.value;
  if (!pid) { showToast('⚠ Bitte einen Ort wählen'); return; }
  const from = document.getElementById('pl-enclosed-from')?.value.trim() || null;
  const to   = document.getElementById('pl-enclosed-to')?.value.trim()   || null;
  if (_editEnclosedIdx !== null) {
    const i = parseInt(_editEnclosedIdx, 10);
    mutatePlaceObject(po.id, p => {
      if (p.enclosedBy[i]) Object.assign(p.enclosedBy[i], { placeId: pid, dateFrom: from, dateTo: to });
      p.parentId = p.enclosedBy[0]?.placeId || null;
    });
    _setEnclosedAddMode();
  } else {
    if (Array.isArray(po.enclosedBy) && po.enclosedBy.some(e => e.placeId === pid)) {
      showToast('⚠ Bereits eingetragen'); return;
    }
    mutatePlaceObject(po.id, p => {
      if (!Array.isArray(p.enclosedBy)) p.enclosedBy = [];
      p.enclosedBy.push({ placeId: pid, dateFrom: from, dateTo: to, dateType: null, _dateRaw: null });
      p.parentId = p.enclosedBy[0].placeId;
    });
  }
  if (sel) sel.value = '';
  ['pl-enclosed-from','pl-enclosed-to'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  _renderEnclosedByList(_currentPoFromModal());
}

function editEnclosedBy(idx) {
  const po = _currentPoFromModal();
  const enc = po?.enclosedBy?.[parseInt(idx, 10)];
  if (!enc) return;
  const sel  = document.getElementById('pl-enclosed-sel');
  const fFrom = document.getElementById('pl-enclosed-from');
  const fTo   = document.getElementById('pl-enclosed-to');
  if (sel)   sel.value   = enc.placeId  || '';
  if (fFrom) fFrom.value = enc.dateFrom || '';
  if (fTo)   fTo.value   = enc.dateTo   || '';
  _editEnclosedIdx = idx;
  const btn = document.getElementById('pl-enclosed-add-btn');
  if (btn) { btn.textContent = '✓'; btn.title = 'Änderung speichern'; }
}

function removeEnclosedBy(idx) {
  const po = _currentPoFromModal();
  if (!po?.enclosedBy) return;
  mutatePlaceObject(po.id, p => {
    p.enclosedBy.splice(parseInt(idx, 10), 1);
    p.parentId = p.enclosedBy[0]?.placeId || null;
  });
  if (_editEnclosedIdx === idx) _setEnclosedAddMode();
  _renderEnclosedByList(_currentPoFromModal());
}

function showNewPlaceForm() {
  document.getElementById('np-name').value = '';
  document.getElementById('np-lati').value = '';
  document.getElementById('np-long').value = '';
  openModal('modalNewPlace');
}

function saveNewPlace() {
  const name = document.getElementById('np-name').value.trim();
  if (!name) { showToast('⚠ Ortsname erforderlich'); return; }
  const latiRaw = (document.getElementById('np-lati').value || '').trim();
  const longRaw = (document.getElementById('np-long').value || '').trim();
  const _pc2 = parseCoordInput(latiRaw, longRaw);
  let lati = isNaN(_pc2.lat) ? null : _pc2.lat;
  let long = isNaN(_pc2.lon) ? null : _pc2.lon;
  // Tri-State analog savePlace: 'clear'/'set'/'keep'
  let _coordOp;
  if (!latiRaw && !longRaw) _coordOp = 'clear';
  else if (lati != null && long != null) _coordOp = 'set';
  else {
    showToast('⚠ Koordinaten unvollständig — lat UND long nötig (Dezimalgrad)', 'warn');
    _coordOp = 'keep';
  }
  // P2 Item 7: nur placeObjects als single source of truth — kein extraPlaces-Schreibziel.
  const existingPo = _placeObjForName(name);
  if (existingPo) {
    mutatePlaceObject(existingPo.id, p => {
      if (_coordOp === 'set')        { p.lat = lati; p.long = long; }
      else if (_coordOp === 'clear') { p.lat = null; p.long = null; }
    });
  } else {
    const id = (typeof _epId === 'function') ? _epId(name) : ('_ep_' + Date.now());
    upsertPlaceObject(id, () => ({ id, title: name, type: 'Unknown',
      lat: _coordOp === 'set' ? lati : null,
      long: _coordOp === 'set' ? long : null,
      pnames: [], enclosedBy: [], parentId: null }));
  }
  closeModal('modalNewPlace');
  showToast('✓ Ort hinzugefügt — Typ und Hierarchie im ✎-Editor setzen');
  renderTab();
}

async function deleteExtraPlace(name) {
  if (!await confirmModal('Ort wirklich entfernen?', 'Entfernen')) return;
  delete AppState.db.extraPlaces[name];
  saveExtraPlaces();
  // Auch das zugehörige placeObject entfernen (z.B. GOV-Kaskaden-Orte)
  // Identity-Matching via _normPlaceName, damit Whitespace/Casing-Drift nicht
  // verhindert, dass der zugehörige placeObject-Eintrag gefunden wird.
  const _id = s => (typeof _normPlaceName === 'function') ? _normPlaceName(s) : (s || '').trim().toLowerCase();
  const key = _id(name);
  const pos = AppState.db.placeObjects || {};
  for (const [id, po] of Object.entries(pos)) {
    if (_id(po.title) === key) { delete pos[id]; break; }
  }
  if (typeof savePlaceObjects === 'function') savePlaceObjects();
  UIState._placesCache = null;
  goBack();
  showToast('✓ Ort entfernt');
  renderTab();
}

// ─────────────────────────────────────
//  P5a HELPERS
// ─────────────────────────────────────

// P5a-4: Namens-Timeline als inline SVG (pnames[] mit Datumsbereich)
function _placeNamesSvg(pnames) {
  const parseY = s => { const m = s && s.match(/\d{4}/); return m ? +m[0] : null; };
  const _sk = pn => pn.dateFrom || pn.dateTo || '9999';
  const dated = (pnames || []).filter(pn => pn.dateFrom || pn.dateTo)
    .slice().sort((a, b) => _sk(a).localeCompare(_sk(b)));
  if (!dated.length) return '';
  const cur = new Date().getFullYear();
  let minY = Infinity, maxY = -Infinity;
  for (const pn of dated) {
    const f = parseY(pn.dateFrom), t = parseY(pn.dateTo);
    if (f) { minY = Math.min(minY, f); maxY = Math.max(maxY, f); }
    const tEff = t || (f ? cur : null);
    if (tEff) { minY = Math.min(minY, tEff); maxY = Math.max(maxY, tEff); }
  }
  if (minY === Infinity) return '';
  if (maxY <= minY) maxY = minY + 10;
  // Feste Pixel-Breite: kein Hochskalieren auf breitem Container
  const W = 300, LBL_H = 12, BAR_H = 4, ROW = LBL_H + BAR_H + 8;
  const AXIS_H = 12, H = AXIS_H + dated.length * ROW;
  const toX = y => Math.max(0, Math.min(W, (y - minY) / (maxY - minY) * W));
  const COLS = ['#b07a4a','#6a8fa8','#7a9a6a','#8a6a9a','#a08060','#6a9090'];
  let bars = '', axis = '', labels = '';
  dated.forEach((pn, i) => {
    const f = parseY(pn.dateFrom) || minY, t = parseY(pn.dateTo) || cur;
    const x1 = toX(f), barW = Math.max(3, toX(t) - x1);
    const col = COLS[i % COLS.length];
    const rowY = AXIS_H + i * ROW;
    // Label: Name + Datum zusammen, immer linksbündig bei x=0
    const name = esc((pn.value || '').substring(0, 22) + (pn.lang ? ` (${pn.lang})` : ''));
    const span = esc([pn.dateFrom, pn.dateTo].filter(Boolean).join('–'));
    labels += `<text x="0" y="${rowY + LBL_H - 2}" font-size="10" fill="var(--text,#3a3028)">${name}</text>`;
    if (span) labels += `<text x="0" y="${rowY + LBL_H + BAR_H + 5}" font-size="8" fill="var(--text-muted,#8a7a6a)">${span}</text>`;
    bars += `<rect x="${x1.toFixed(1)}" y="${rowY + LBL_H}" width="${barW.toFixed(1)}" height="${BAR_H}" rx="1" fill="${col}" opacity="0.6"/>`;
  });
  // Achsen-Ticks oben
  const step = Math.max(1, Math.ceil((maxY - minY) / 4));
  for (let y = Math.ceil(minY / step) * step; y <= maxY; y += step) {
    const x = toX(y);
    axis += `<line x1="${x.toFixed(1)}" y1="${AXIS_H - 4}" x2="${x.toFixed(1)}" y2="${AXIS_H + 2}" stroke="var(--border,#ccc)" stroke-width="0.8"/>`;
    axis += `<text x="${x.toFixed(1)}" y="${AXIS_H - 5}" font-size="8" fill="var(--text-muted,#8a7a6a)" text-anchor="middle">${y}</text>`;
  }
  return `<svg class="pl-svg-tl" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${axis}${labels}${bars}</svg>`;
}

// ─── Ortsreport-Helfer ────────────────────────────────────────────────────────

// Adaptiver Bucket-Größen-Berechner für Zeitraumverteilung
function _adaptiveBucketSize(yearMin, yearMax, evCount) {
  const span = yearMax - yearMin;
  if (evCount < 5 || span > 600) return 100;
  if (evCount < 12 || span > 300) return 50;
  return 25;
}

// Tile-URL-Berechnung für statischen OSM-Export (Zoom 10)
function _osmTileCoords(lat, lon, zoom) {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lon + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y, z: zoom };
}

// P5a-5: Mini-Karte (Leaflet) im Standort-Abschnitt initialisieren
function _initPlaceDetailMap(lat, lon, title) {
  if (typeof L === 'undefined') return;
  const el = document.getElementById('place-mini-map');
  if (!el) return;
  if (_placeDetailMap) { try { _placeDetailMap.remove(); } catch(_) {} _placeDetailMap = null; }
  _placeDetailMap = L.map(el, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, tap: false });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(_placeDetailMap);
  _placeDetailMap.setView([lat, lon], 12);
  L.circleMarker([lat, lon], { radius: 9, color: '#c8793a', fillColor: '#c8793a', fillOpacity: 0.85, weight: 2 })
    .bindPopup(title).addTo(_placeDetailMap);
  setTimeout(() => _placeDetailMap?.invalidateSize(), 150);
}

// ─────────────────────────────────────
//  DETAIL: ORT — Helfer (SHOWPLACE-SPLIT Phasen A+B)
// ─────────────────────────────────────

// Phase B — triviale string-Helfer (pure, kein State, kein Side-Effect).
function _placeDetailHero(place, placeName) {
  const n = place.personIds.size;
  return `<div class="detail-hero fade-up">
    <div class="detail-avatar place">📍</div>
    <div class="detail-name">${esc(compactPlace(placeName))}</div>
    <div class="detail-id">${n} Person${n !== 1 ? 'en' : ''}</div>
  </div>`;
}

function _placeDetailLinkButton(place, placeName) {
  if (place.placeId || typeof getPlaceRegistry !== 'function') return '';
  if (Object.keys(getPlaceRegistry().byId).length === 0) return '';
  return `<div class="place-action-row">
      <button class="btn-ghost"
        data-action="openPlaceStringLinkModal"
        data-preselect="${placeName.replace(/"/g,'&quot;')}">🔗 Mit PlaceObject verknüpfen</button>
    </div>`;
}

function _placeDetailNote(place) {
  const po = place.placeId ? (AppState.db.placeObjects || {})[place.placeId] : null;
  if (!po || !po.note) return '';
  return `<div class="section fade-up">
      <div class="section-title">Notiz</div>
      <div class="place-note-text">${esc(po.note).replace(/\n/g, '<br>')}</div>
    </div>`;
}

// Beide Koords nötig — halbe Paare (lat ohne long o.ä.) sonst Crash auf null.toFixed
function _placeDetailMapSection(place, placeName) {
  const geoAvail = typeof geocodeSinglePlace === 'function';
  if (place.lati !== null && place.long !== null) {
    return `<div class="section fade-up">
      <div class="section-title">Standort</div>
      <div class="place-map-wrap">
        <div id="place-mini-map"></div>
      </div>
      <div class="place-map-links">
        <a href="https://maps.apple.com/?ll=${place.lati},${place.long}&q=${encodeURIComponent(placeName)}"
           target="_blank" class="place-maps-link">🗺 Apple Maps</a>
        <a href="https://www.openstreetmap.org/?mlat=${place.lati}&mlon=${place.long}#map=12/${place.lati}/${place.long}"
           target="_blank" class="place-maps-link">🌐 OpenStreetMap</a>
      </div>
      <div class="place-map-coords">${place.lati.toFixed(5)}, ${place.long.toFixed(5)}</div>
      ${geoAvail ? `<div class="place-action-row mt-8"><button class="btn-ghost" data-action="geocodeCurrentPlace" title="Koordinaten + Typ via Nominatim neu abrufen">↻ Neu geocodieren</button></div>` : ''}
    </div>`;
  }
  if (geoAvail) {
    return `<div class="section fade-up">
      <div class="section-title">Standort</div>
      <div class="place-action-row"><button class="btn-ghost" data-action="geocodeCurrentPlace">📍 Geocodieren</button></div>
    </div>`;
  }
  return '';
}

// Nur Orte ohne verknüpfte Personen löschbar (extraPlaces oder placeObjects).
function _placeDetailDeleteRow(place, placeName) {
  const canDelete = place.personIds.size === 0
    && (AppState.db.extraPlaces?.[placeName]
        || (place.placeId && (AppState.db.placeObjects || {})[place.placeId]));
  if (!canDelete) return '';
  return `<div class="place-delete-row">
      <button class="btn-ghost btn-ghost-danger"
        data-action="deleteExtraPlace" data-pname="${placeName.replace(/"/g,'&quot;')}">Ort entfernen</button>
    </div>`;
}


// Verwaltungsgeschichte als aufgelöste Zeitlinie (WYSIWYG zum GEDCOM-Writer).
// Gewinner-Auswahl pro Jahr delegiert an reg.enclosureWinnerAsOf — *dieselbe*
// Funktion, die der Writer (via enclosureChainAsOf) nutzt. Damit ist die
// Invariante (v940) strukturell verriegelt, nicht nur per Konvention.
// Fallback ohne enclosedBy: aktuelle Kette als "Teil von"-Zeile.
function _placeDetailEnclosureTimeline(po, reg, placeId) {
  const enclosedBy = po.enclosedBy || [];
  if (!enclosedBy.length) {
    const chain = reg.enclosureChainAsOf(placeId, null).slice(1);
    return chain.length
      ? `<div class="fact-row"><span class="fact-key">Teil von</span><span class="fact-val">${esc(chain.join(' · '))}</span></div>`
      : '';
  }

  const parseY = s => { const m = s && s.match(/\d{4}/); return m ? +m[0] : null; };

  // Jahresgrenzen aus allen Einträgen sammeln — pro Grenze nach Gewinner segmentieren.
  const _resolveTimeline = encs => {
    const bounds = new Set();
    for (const e of encs) {
      if (e.dateFrom) bounds.add(parseY(e.dateFrom));
      if (e.dateTo)   { const y = parseY(e.dateTo); if (y != null) bounds.add(y + 1); }
    }
    const sortedB = [...bounds].filter(y => y != null).sort((a, b) => a - b);

    const segments = [];
    for (let i = 0; i < sortedB.length; i++) {
      const y = sortedB[i];
      const w = reg.enclosureWinnerAsOf(placeId, y).enc;
      if (!w) continue;
      const nextY = sortedB[i + 1] ?? null;
      // Mit vorherigem Segment zusammenführen wenn selber Gewinner-Eintrag
      if (segments.length && segments[segments.length - 1].enc === w) {
        segments[segments.length - 1].toY = nextY ? nextY - 1 : null;
      } else {
        segments.push({ fromY: y, toY: nextY ? nextY - 1 : null, enc: w });
      }
    }
    // Rein undatierte Einträge (keine Grenzen) — Registry liefert sie als Fallback.
    if (!sortedB.length) {
      const u = encs.find(e => !e.dateFrom && !e.dateTo);
      if (u) segments.push({ fromY: null, toY: null, enc: u });
    }
    return segments;
  };

  const timeline = _resolveTimeline(enclosedBy);
  let encHtml = '';
  for (const seg of timeline) {
    const parent = reg.byId[seg.enc.placeId];
    if (!parent) continue;
    let span = '';
    if (seg.fromY != null && seg.toY != null) span = `${seg.fromY}–${seg.toY}`;
    else if (seg.fromY != null) span = `ab ${seg.fromY}`;
    else if (seg.toY  != null) span = `bis ${seg.toY}`;
    else span = 'aktuell';
    // Elterntitel zum Mitteljahr → identisch mit Writer-Ausgabe
    const refYear = seg.fromY != null && seg.toY != null
      ? Math.round((seg.fromY + seg.toY) / 2)
      : seg.fromY ?? seg.toY ?? null;
    const parentName = refYear != null
      ? (reg.resolveAsOf(seg.enc.placeId, refYear) || parent.title)
      : parent.title;
    encHtml += `<div class="fact-row fact-row--clickable" data-action="showPlaceByTitle" data-title="${esc(parent.title)}">
            <span class="fact-key place-enc-span">${esc(span)}</span>
            <span class="fact-val">${esc(parentName)}</span>
            <span class="p-arrow">›</span>
          </div>`;
  }
  return encHtml ? `<div class="fact-sub-title">Verwaltungsgeschichte</div>${encHtml}` : '';
}

// Hierarchie-Timeline: vollständige Kette zu Schlüsseljahren ("Zugehörigkeit
// nach Jahr"). Schlüsseljahre rekursiv aus der gesamten Eltern-Kette sammeln
// (BFS), Anzeige auf Existenzdaten + dokumentierten enclosedBy-Zeitraum
// klemmen, Duplikate (gleiche Kette) zusammenfassen, Lücken als "unbekannt"
// markieren, abgebrochene Ketten mit "› ?" suffixen.
function _placeDetailHierarchyTimeline(po, placeId, reg) {
  const enclosedBy = po.enclosedBy || [];
  if (!enclosedBy.length || !reg.enclosureChainAsOf) return '';

  const _chainYears = new Set();
  const _visited = new Set();
  const _collectYears = (pid) => {
    if (!pid || _visited.has(pid)) return;
    _visited.add(pid);
    const p = reg.byId[pid];
    if (!p) return;
    for (const enc of (p.enclosedBy || [])) {
      if (enc.dateFrom) { const y = enc.dateFrom.match(/\d{4}/); if (y) _chainYears.add(+y[0]); }
      if (enc.dateTo)   { const y = enc.dateTo.match(/\d{4}/);   if (y) _chainYears.add(+y[0]); }
      _collectYears(enc.placeId);
    }
    for (const pn of (p.pnames || [])) {
      if (pn.dateFrom) { const y = pn.dateFrom.match(/\d{4}/); if (y) _chainYears.add(+y[0]); }
      if (pn.dateTo)   { const y = pn.dateTo.match(/\d{4}/);   if (y) _chainYears.add(+y[0]); }
    }
    if (p.existsFrom) { const y = p.existsFrom.match(/\d{4}/); if (y) _chainYears.add(+y[0]); }
    if (p.existsTo)   { const y = p.existsTo.match(/\d{4}/);   if (y) _chainYears.add(+y[0]); }
  };
  _collectYears(placeId);

  const _exFrom = po?.existsFrom ? +po.existsFrom.match(/\d{4}/)?.[0] : null;
  const _exTo   = po?.existsTo   ? +po.existsTo.match(/\d{4}/)?.[0]   : null;
  const _parseYr = s => { const m = s && s.match(/\d{4}/); return m ? +m[0] : null; };
  const _encsWithFrom = enclosedBy.filter(e => e.dateFrom);
  const _docStart = _encsWithFrom.length
    ? Math.min(..._encsWithFrom.map(e => _parseYr(e.dateFrom) ?? Infinity)) : null;
  const _hasOpenEnd = enclosedBy.some(e => !e.dateTo);
  const _docEnd = _hasOpenEnd ? null
    : (enclosedBy.length ? Math.max(...enclosedBy.map(e => _parseYr(e.dateTo) ?? 0)) : null);

  const _keyYears = [..._chainYears].sort((a,b)=>a-b)
    .filter(y =>
      (_exFrom   == null || y >= _exFrom)   && (_exTo   == null || y <= _exTo) &&
      (_docStart == null || y >= _docStart) && (_docEnd == null || y <= _docEnd)
    );
  if (_keyYears.length < 1) return '';

  let _lastChain = null;
  let _inGap = false;
  const _rows = [];
  for (const yr of _keyYears) {
    const meta = {};
    const chain = reg.enclosureChainAsOf(placeId, yr, meta).slice(1);
    if (!chain.length) {
      if (!_inGap) {
        _rows.push(`<div class="fact-row fact-row--gap"><span class="place-enc-span">${yr}</span><span class="fact-val place-gap-marker">unbekannt</span></div>`);
        _inGap = true;
      }
      _lastChain = null;
      continue;
    }
    _inGap = false;
    const chainStr = chain.join(' › ') + (meta.truncated ? ' › ?' : '');
    if (chainStr === _lastChain) continue;
    _lastChain = chainStr;
    _rows.push(`<div class="fact-row"><span class="place-enc-span">${yr}</span><span class="fact-val">${esc(chainStr)}</span></div>`);
  }
  return _rows.length ? `<div class="fact-sub-title">Zugehörigkeit nach Jahr</div>${_rows.join('')}` : '';
}

// ─────────────────────────────────────
//  DETAIL: ORT
// ─────────────────────────────────────
// Stufe 2b: `ref` ist Identität-primär — eine placeId (wenn der Ort objektifiziert
// ist) ODER ein Ortsname (String-Ort ohne placeObject). Spiegelt _eventPlaceId:
// Identität schlägt Name. Damit öffnen zwei gleichnamige Orte (Stadt vs. Kreis
// Münster) ihr JEWEILIGES Detail statt beide dasselbe. `ref` fließt als einheitliche
// Währung durch Listen-Zeilen (data-name), ViewState, History und Re-Render.
function showPlaceDetail(ref, pushHistory = true) {
  const _reg = (typeof getPlaceRegistry === 'function') ? getPlaceRegistry() : null;
  const _po  = (ref && _reg && _reg.byId[ref]) ? _reg.byId[ref] : null;  // ref ist placeId?
  const placeId   = _po ? ref : null;
  const placeName = _po ? _po.title : ref;                              // lesbarer Name
  const places = collectPlaces();
  // Eintrag identitäts-primär: per placeId, sonst per Name, sonst aus dem PO
  // synthetisieren (gleichnamige POs fehlen in der namens-gekeyten Map).
  let place = null;
  if (placeId) for (const pl of places.values()) { if (pl.placeId === placeId) { place = pl; break; } }
  if (!place) place = places.get(placeName);
  if (!place && _po) {
    const _pair = (_po.lat != null && _po.long != null);
    place = { name: _po.title, placeId, type: _po.type || null,
      lati: _pair ? _po.lat : null, long: _pair ? _po.long : null,
      personIds: new Set(), eventTypes: new Set() };
  }
  if (!place) { showMain(); return; }
  if (pushHistory) _beforeDetailNavigate();
  ViewState.setCurrent('places', ref);                 // Identitäts-Ref persistieren
  AppState.currentPlaceName = placeName;               // lesbarer Name (Edit-Form)
  AppState.currentPlaceId   = placeId;                 // Identität (Re-Render-Disambig.)
  // P6-B6: Listen-Sync — sonst bleibt der alte Ort in der placeList markiert wenn
  // der User in der Liste auf einen anderen Ort klickt. showDetail/showFamilyDetail
  // hatten dieses Muster schon; showPlaceDetail/showSourceDetail fehlten.
  if (document.body.classList.contains('desktop-mode')) {
    if (AppState.currentTab === 'places') _updatePlaceListCurrent(ref); else _updatePlaceListCurrent(null);
  }
  // P6-B5: Toolbar-Konfig zentral (siehe ui-views.js)
  _configureDetailToolbar('places', placeName);

  let html = _placeDetailHero(place, placeName)
           + _placeDetailLinkButton(place, placeName)
           + _placeDetailNote(place)
           + _placeDetailMapSection(place, placeName);

  // PLACE-HIST (ADR-024, P0b-1): historische Dimension der Place-Entität anzeigen
  // (Typ, datierte Namensvarianten, Zugehörigkeitskette). Nur wenn placeObject verknüpft.
  if (place.placeId) {
    const reg = getPlaceRegistry();
    const po  = reg.byId[place.placeId];
    if (po) {
      const TYPE_LBL = {
        Country:'Land', State:'Bundesland', Region:'Region', Province:'Provinz',
        County:'Kreis', District:'Bezirk', Municipality:'Gemeinde', City:'Stadt',
        Town:'Stadt', Village:'Dorf', Hamlet:'Weiler', Parish:'Pfarrei',
        Borough:'Stadtteil', Locality:'Ortslage', Neighborhood:'Nachbarschaft',
        Building:'Gebäude', Farm:'Hof', Cemetery:'Friedhof', Church:'Kirche', Unknown:'',
      };
      const typeLbl = TYPE_LBL[po.type] != null ? TYPE_LBL[po.type] : po.type;
      // Datierte Namensvarianten (nur solche mit Datum — der Haupttitel steht im Hero)
      const _sortKey = item => item.dateFrom || item.dateTo || '9999';
      const datedNames = (po.pnames || []).filter(pn => pn.dateFrom || pn.dateTo)
        .slice().sort((a, b) => _sortKey(a).localeCompare(_sortKey(b)));
      const _span = pn => {
        const f = pn.dateFrom || '', t = pn.dateTo || '';
        if (f && t) return `${f}–${t}`;
        if (f) return `ab ${f}`;
        if (t) return `bis ${t}`;
        return '';
      };
      const namesHtml = datedNames.map(pn =>
        `<div class="fact-row"><span class="fact-key">${esc(_span(pn))}</span>`
        + `<span class="fact-val">${esc(pn.value)}${pn.lang ? ` <em class="tran-lang">${esc(pn.lang)}</em>` : ''}</span></div>`
      ).join('');
      // Verwaltungsgeschichte: alle enclosedBy[]-Einträge chronologisch mit Zeitspanne
      let histHtml = '';
      if (typeLbl) histHtml += `<div class="fact-row"><span class="fact-key">Typ</span><span class="fact-val">${esc(typeLbl)}</span></div>`;
      // Existenzdaten anzeigen
      if (po.existsFrom || po.existsTo) {
        const _exSpan = po.existsFrom && po.existsTo ? `${po.existsFrom}–${po.existsTo}`
          : po.existsFrom ? `ab ${po.existsFrom}` : `bis ${po.existsTo}`;
        histHtml += `<div class="fact-row"><span class="fact-key">Existiert</span><span class="fact-val">${esc(_exSpan)}</span></div>`;
      }

      const enclosedBy = po.enclosedBy || [];
      histHtml += _placeDetailEnclosureTimeline(po, reg, place.placeId);
      // Hierarchie-Timeline: vollständige Kette zu Schlüsseljahren anzeigen.
      // Schlüsseljahre rekursiv aus der gesamten Kette sammeln — sonst bleiben
      // Änderungen auf höheren Ebenen (Eltern, Großeltern) unsichtbar.
      let hierTimelineHtml = '';
      // _govTypes[]: historische Verwaltungstypen mit Zeitraum anzeigen
      if (po && Array.isArray(po._govTypes) && po._govTypes.length > 1) {
        const _sorted = po._govTypes.slice().sort((a, b) => {
          const ay = a.dateFrom ? parseInt(a.dateFrom) : 0;
          const by = b.dateFrom ? parseInt(b.dateFrom) : 0;
          return ay - by; // chronologisch
        });
        const _typeRows = _sorted.map(g => {
          const von = g.dateFrom ? g.dateFrom.replace(/-\d{2}-\d{2}$/, '') : '–';
          const bis = g.dateTo   ? g.dateTo.replace(/-\d{2}-\d{2}$/, '')   : '–';
          const span = von === '–' && bis === '–' ? '' : von === '–' ? `bis ${bis}` : bis === '–' ? `ab ${von}` : `${von}–${bis}`;
          return `<div class="fact-row"><span class="fact-key">${span || '?'}</span><span class="fact-val">${esc(g.rawType)}</span></div>`;
        }).join('');
        histHtml += `<div class="fact-sub-title">Verwaltungstyp (historisch)</div>${_typeRows}`;
      }

      hierTimelineHtml = _placeDetailHierarchyTimeline(po, place.placeId, reg);

      if (histHtml || namesHtml || hierTimelineHtml) {
        html += `<div class="section fade-up">
          <div class="section-title">Ort (historisch)</div>
          ${histHtml}
          ${hierTimelineHtml}
          ${namesHtml ? `<div class="fact-sub-title">Frühere Namen</div>${namesHtml}` : ''}
        </div>`;
      }
    }
  }

  // P3: Kirchenbuch-Sektion — für Church/Parish/Cemetery Orte verknüpfte Repos + Quellen anzeigen
  if (place.placeId) {
    const reg2 = getPlaceRegistry();
    const po2  = reg2?.byId[place.placeId];
    if (po2 && (po2.type === 'Church' || po2.type === 'Parish' || po2.type === 'Cemetery')) {
      const lowerTitle = (po2.title || '').toLowerCase();
      // Repos deren Name den Ortsnamen enthält (oder umgekehrt)
      const matchedRepos = Object.values(AppState.db.repositories || {})
        .filter(r => {
          const rn = (r.name || '').toLowerCase();
          return rn.includes(lowerTitle) || lowerTitle.includes(rn.slice(0, 5));
        });
      if (matchedRepos.length) {
        let kirchHtml = '';
        for (const repo of matchedRepos) {
          const repoSrcs = Object.values(AppState.db.sources || {}).filter(s => s.repo === repo.id);
          const srcLinks = repoSrcs.map(s =>
            `<div class="fact-row fact-row--clickable" data-action="showSourceDetail" data-id="${esc(s.id)}">
              <span class="fact-val">${esc(s.title || s.id)}</span><span class="p-arrow">›</span>
            </div>`).join('');
          kirchHtml += `<div class="fact-row"><span class="fact-key">Archiv</span>
            <span class="fact-val">${esc(repo.name)}${repo.www ? ` <a class="place-maps-link" href="${esc(repo.www)}" target="_blank">🔗</a>` : ''}</span></div>`;
          if (srcLinks) kirchHtml += `<div class="fact-sub-title">Kirchenbücher</div>${srcLinks}`;
        }
        html += `<div class="section fade-up">
          <div class="section-title">Verknüpfte Kirchenbücher</div>
          ${kirchHtml}
        </div>`;
      }
    }
  }

  // GED7: Übersetzungs-Editor — P2 Item 7: liest aus placeObjects.pnames (undatierte
  // mit Sprache/abweichendem Wert = TRAN-Kandidaten). Legacy-Fallback extraPlaces.trans
  // für Altbestände, die noch keine Migration durchlaufen haben.
  const _poTrans = place.placeId
    ? (AppState.db.placeObjects?.[place.placeId]?.pnames || [])
        .map((pn, idx) => ({ pn, idx }))
        .filter(({ pn }) => pn.value && pn.value !== placeName && !pn.dateFrom && !pn.dateTo)
    : [];
  const _ep = AppState.db.extraPlaces[placeName];
  const _legacyTrans = (_ep?.trans || []).map((t, i) => ({ value:t.value, lang:t.lang, _legacy:true, _idx:i }));
  const _allTrans = _poTrans.map(({ pn, idx }) => ({ value: pn.value, lang: pn.lang || '', _pnIdx: idx }))
                            .concat(_legacyTrans);
  const _transHtml = _allTrans.length
    ? _allTrans.map(t => {
        const action = t._legacy ? 'deletePlaceTrans' : 'deletePlacePname';
        const dataIdx = t._legacy ? t._idx : t._pnIdx;
        return `
      <div class="fact-row fact-row--center">
        <span class="fact-val fact-val--flex"><span class="tran-chip">${esc(t.value)}${t.lang ? `<em class="tran-lang">${esc(t.lang)}</em>` : ''}</span></span>
        <button class="unlink-btn" data-action="${action}" data-idx="${dataIdx}">×</button>
      </div>`;
      }).join('')
    : '';
  html += `<div class="section fade-up">
    <div class="section-head">
      <div class="section-title">Übersetzungen</div>
    </div>
    ${_transHtml || '<div class="no-data-pad">Keine Übersetzungen eingetragen</div>'}
    <div class="tran-add-row">
      <input class="form-input" id="pl-tran-val" placeholder="Übersetzung (z.B. Wrocław)">
      <input class="form-input pl-tran-lang" id="pl-tran-lang" placeholder="Sprache">
      <button class="btn-ghost tran-add-btn" data-action="addPlaceTrans">+</button>
    </div>
  </div>`;

  // P5a-1: Ereignisse nach Typ gruppiert, placeId-aware
  const _byType = new Map();
  const _evSeen = new Set();
  const _addEv = (typeLabel, person, date) => {
    const dk = `${person.id}|${typeLabel}|${date||''}`;
    if (_evSeen.has(dk)) return;
    _evSeen.add(dk);
    if (!_byType.has(typeLabel)) _byType.set(typeLabel, []);
    _byType.get(typeLabel).push({ person, date: date || '' });
  };
  // Stufe 1: Identität über _eventPlaceId(ev) auflösen — deckt placeId-lose Events
  // ab, deren Projektions-String via pname auf place.placeId zeigt (sonst zählt die
  // Liste sie, das Detail aber nicht). Der exakte-String-Zweig bleibt für reine
  // String-Orte ohne placeObject (kein placeId, kein findByName-Treffer).
  const _matchPlace = ev => {
    if (!ev) return false;
    if (ev.place && ev.place.trim() === placeName) return true;
    if (place.placeId) {
      const pid = (typeof _eventPlaceId === 'function') ? _eventPlaceId(ev) : ev.placeId;
      if (pid && pid === place.placeId) return true;
    }
    return false;
  };
  for (const p of Object.values(AppState.db.individuals)) {
    if (_matchPlace(p.birth))  _addEv('Geburt',     p, p.birth.date);
    if (_matchPlace(p.death))  _addEv('Tod',        p, p.death.date);
    if (_matchPlace(p.chr))    _addEv('Taufe',      p, p.chr.date);
    if (_matchPlace(p.buri))   _addEv('Beerdigung', p, p.buri.date);
    for (const ev of p.events) {
      if (_matchPlace(ev)) _addEv(ev.eventType || EVENT_LABELS[ev.type] || ev.type, p, ev.date);
    }
  }
  for (const f of Object.values(AppState.db.families)) {
    if (_matchPlace(f.marr)) {
      for (const pid of [f.husb, f.wife]) {
        if (!pid) continue;
        const p = AppState.db.individuals[pid];
        if (p) _addEv('Heirat', p, f.marr.date);
      }
    }
    for (const ev of (f.events || [])) {
      if (_matchPlace(ev)) {
        for (const pid of [f.husb, f.wife]) {
          if (!pid) continue;
          const p = AppState.db.individuals[pid];
          if (p) _addEv(ev.eventType || EVENT_LABELS[ev.type] || ev.type, p, ev.date);
        }
      }
    }
  }
  const _totalEvs = [..._byType.values()].reduce((s, a) => s + a.length, 0);
  const _totalPersons = new Set([..._byType.values()].flatMap(arr => arr.map(e => e.person.id))).size;
  const _TYPE_ORDER = ['Geburt','Taufe','Konfirmation','Heirat','Beerdigung','Tod'];
  const _orderedTypes = [
    ..._TYPE_ORDER.filter(t => _byType.has(t)),
    ...[..._byType.keys()].filter(t => !_TYPE_ORDER.includes(t)).sort(),
  ];
  // Alle Ereignisse als flache Liste für Zeitraum-Ansicht
  const _allEvs = [];
  for (const [typeLabel, evs] of _byType) {
    for (const e of evs) _allEvs.push({ typeLabel, person: e.person, date: e.date });
  }
  _allEvs.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const _placeEvMode = UIState._placeEvMode || 'type'; // 'type' | 'date'
  const _evSectionId = `place-ev-${Date.now()}`;

  const _renderEvGroups = () => {
    if (_placeEvMode === 'date') {
      // Gruppierung nach Dekade, chronologisch sortiert, "Ohne Datum" ans Ende
      const byPeriod = new Map();
      for (const e of _allEvs) {
        const m = e.date && e.date.match(/\d{4}/);
        const yr = m ? Math.floor(+m[0] / 10) * 10 : null;
        const key = yr !== null ? String(yr) : null;
        const label = yr !== null ? `${yr}er` : 'Ohne Datum';
        if (!byPeriod.has(key)) byPeriod.set(key, { label, evs: [] });
        byPeriod.get(key).evs.push(e);
      }
      const sorted = [...byPeriod.entries()]
        .sort(([a], [b]) => a === null ? 1 : b === null ? -1 : +a - +b);
      const _evMeta = (evs) => {
        const persons = new Set(evs.map(e => e.person.id)).size;
        return `<span class="ev-meta"><span class="ev-meta-n">${evs.length}</span><span class="ev-meta-sep">·</span><span class="ev-meta-p">${persons} P</span></span><span class="ev-arrow">▾</span>`;
      };
      return sorted.map(([, { label, evs }]) =>
        `<details class="ev-group">
          <summary class="ev-group-summary"><span class="ev-label">${esc(label)}</span>${_evMeta(evs)}</summary>
          ${evs.map(e => `<div class="ev-group-row"><span class="ev-type-chip">${esc(e.typeLabel)}</span>${relRow(e.person, e.date)}</div>`).join('')}
        </details>`
      ).join('');
    }
    // Standard: nach Typ
    const _evMeta2 = (evs) => {
      const persons = new Set(evs.map(e => e.person.id)).size;
      return `<span class="ev-meta"><span class="ev-meta-n">${evs.length}</span><span class="ev-meta-sep">·</span><span class="ev-meta-p">${persons} P</span></span><span class="ev-arrow">▾</span>`;
    };
    return _orderedTypes.map(typeLabel => {
      const evs = _byType.get(typeLabel).slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      return `<details class="ev-group">
        <summary class="ev-group-summary"><span class="ev-label">${esc(typeLabel)}</span>${_evMeta2(evs)}</summary>
        ${evs.map(e => relRow(e.person, e.date)).join('')}
      </details>`;
    }).join('');
  };

  html += `<div class="section fade-up" id="${_evSectionId}">
    <div class="section-head">
      <div class="section-title">Ereignisse <span class="ev-total">${_totalEvs} · ${_totalPersons} Person${_totalPersons !== 1 ? 'en' : ''}</span></div>
      <div class="ev-toolbar">
        <button class="btn-ghost btn-xs${_placeEvMode === 'type' ? ' active' : ''}" data-action="placeEvMode" data-mode="type">nach Typ</button>
        <button class="btn-ghost btn-xs${_placeEvMode === 'date' ? ' active' : ''}" data-action="placeEvMode" data-mode="date">nach Zeit</button>
        <button class="btn-ghost btn-xs" data-action="placeEvToggleAll" data-section="${_evSectionId}">alle ±</button>
      </div>
    </div>`;
  if (_orderedTypes.length === 0) {
    html += '<div class="no-data-pad">Keine Ereignisse erfasst</div>';
  } else {
    html += _renderEvGroups();
  }
  html += `</div>`;

  // ─── Ortsreport: Häufigste Familiennamen ─────────────────────────────────
  if (_totalEvs > 0) {
    const _seenP = new Set();
    const _surnMap = {}, _givenMap = {};
    for (const [, evs] of _byType) {
      for (const {person} of evs) {
        if (_seenP.has(person.id)) continue;
        _seenP.add(person.id);
        if (person.surname) _surnMap[person.surname] = (_surnMap[person.surname]||0)+1;
        const g = (person.given||'').trim().split(/\s+/)[0].replace(/[,;.]+$/, '');
        if (g) _givenMap[g] = (_givenMap[g]||0)+1;
      }
    }
    const _topSurn  = Object.entries(_surnMap).sort((a,b)=>b[1]-a[1]).slice(0,10);
    const _topGiven = Object.entries(_givenMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
    if (_topSurn.length) {
      const _maxSurn = _topSurn[0][1];
      // SVG-Balken (CSP-sicher: Presentation-Attribute statt inline style)
      const _NW = 120, _BW = 160, _CW = 28, _RH = 22, _W = _NW + _BW + _CW;
      const _surnH = _topSurn.length * _RH + 4;
      let _surnSvg = '';
      _topSurn.forEach(([name, cnt], i) => {
        const y = i * _RH + 4;
        const bw = Math.round(cnt / _maxSurn * _BW);
        _surnSvg += `<text x="0" y="${y+14}" font-size="11" fill="var(--text,#3a3028)">${esc(name.substring(0,18))}</text>`;
        _surnSvg += `<rect x="${_NW}" y="${y+8}" width="${_BW}" height="8" rx="3" fill="var(--surface2,#ede8e0)"/>`;
        _surnSvg += `<rect x="${_NW}" y="${y+8}" width="${bw}" height="8" rx="3" fill="var(--gold,#c8793a)" opacity="0.8"/>`;
        _surnSvg += `<text x="${_NW+_BW+4}" y="${y+14}" font-size="10" fill="var(--text-muted,#8a7a6a)">${cnt}</text>`;
      });
      const _givenChips = _topGiven.map(([name, cnt]) =>
        `<span class="or-chip">${esc(name)} <em>${cnt}</em></span>`).join('');
      html += `<div class="section fade-up">
        <div class="section-title">Häufigste Familiennamen</div>
        <svg width="${_W}" height="${_surnH}" viewBox="0 0 ${_W} ${_surnH}" overflow="visible">${_surnSvg}</svg>
        ${_topGiven.length ? `<div class="fact-sub-title">Häufigste Vornamen</div><div class="or-chips">${_givenChips}</div>` : ''}
      </div>`;
    }
  }

  // ─── Ortsreport: Zeitraumverteilung ──────────────────────────────────────
  if (_allEvs.length > 0) {
    const _evYears = _allEvs.map(e => {
      const m = e.date && e.date.match(/\d{4}/);
      return m ? +m[0] : null;
    }).filter(y => y !== null);

    if (_evYears.length > 0) {
      const _yMin = Math.min(..._evYears);
      const _yMax = Math.max(..._evYears);
      const _bSize = _adaptiveBucketSize(_yMin, _yMax, _evYears.length);
      const _bStart = Math.floor(_yMin / _bSize) * _bSize;
      const _bEnd   = Math.floor(_yMax / _bSize) * _bSize;

      // Buckets aufbauen
      const _buckets = new Map();
      for (let y = _bStart; y <= _bEnd; y += _bSize) {
        _buckets.set(y, { label: `${y}–${y+_bSize-1}`, evs: [] });
      }
      const _undated = [];
      for (const e of _allEvs) {
        const m = e.date && e.date.match(/\d{4}/);
        if (m) {
          const bk = Math.floor(+m[0] / _bSize) * _bSize;
          _buckets.get(bk)?.evs.push(e);
        } else {
          _undated.push(e);
        }
      }

      const _maxBucket = Math.max(...[..._buckets.values()].map(b => b.evs.length), 1);
      const _evMeta3 = evs => {
        const persons = new Set(evs.map(e => e.person.id)).size;
        return `<span class="ev-meta"><span class="ev-meta-n">${evs.length}</span><span class="ev-meta-sep">·</span><span class="ev-meta-p">${persons} P</span></span><span class="ev-arrow">▾</span>`;
      };

      // SVG-Balken-Visualisierung (chronologisch, CSP-sicher)
      const _TB_BARW = 22, _TB_GAP = 4, _TB_MAXH = 44, _TB_LBLH = 28;
      const _tbCols = [..._buckets.entries()];
      const _tbW = _tbCols.length * (_TB_BARW + _TB_GAP) - _TB_GAP;
      const _tbH = _TB_MAXH + _TB_LBLH;
      let _tbSvg = `<line x1="0" y1="${_TB_MAXH}" x2="${_tbW}" y2="${_TB_MAXH}" stroke="var(--border,#ccc)" stroke-width="0.8"/>`;
      _tbCols.forEach(([, {label, evs}], i) => {
        const x = i * (_TB_BARW + _TB_GAP);
        const bh = evs.length > 0 ? Math.max(2, Math.round(evs.length / _maxBucket * _TB_MAXH)) : 0;
        const yr = label.split('–')[0];
        if (bh > 0) _tbSvg += `<rect x="${x}" y="${_TB_MAXH - bh}" width="${_TB_BARW}" height="${bh}" rx="2" fill="var(--gold,#c8793a)" opacity="0.75"><title>${esc(label)}: ${evs.length}</title></rect>`;
        _tbSvg += `<text x="${x + _TB_BARW/2}" y="${_TB_MAXH + 10}" font-size="8" fill="var(--text-muted,#8a7a6a)" text-anchor="middle" transform="rotate(90,${x + _TB_BARW/2},${_TB_MAXH + 10})">${yr}</text>`;
      });
      const _barHtml = `<svg width="${_tbW}" height="${_tbH}" viewBox="0 0 ${_tbW} ${_tbH}" overflow="visible" class="or-timebar-svg">${_tbSvg}</svg>`;

      // Ausklappbare Detaillisten — sortiert nach Jahr aufsteigend
      const _detailHtml = [..._buckets.entries()]
        .filter(([, {evs}]) => evs.length > 0)
        .sort(([a], [b]) => a - b)
        .map(([, {label, evs}]) =>
          `<details class="ev-group">
            <summary class="ev-group-summary"><span class="ev-label">${esc(label)}</span>${_evMeta3(evs)}</summary>
            ${evs.map(e => `<div class="ev-group-row"><span class="ev-type-chip">${esc(e.typeLabel)}</span>${relRow(e.person, e.date)}</div>`).join('')}
          </details>`
        ).join('');

      const _undatedHtml = _undated.length
        ? `<details class="ev-group">
            <summary class="ev-group-summary"><span class="ev-label">Ohne Datum</span>${_evMeta3(_undated)}</summary>
            ${_undated.map(e => `<div class="ev-group-row"><span class="ev-type-chip">${esc(e.typeLabel)}</span>${relRow(e.person, e.date)}</div>`).join('')}
          </details>`
        : '';

      html += `<div class="section fade-up">
        <div class="section-title">Zeitraumverteilung <span class="ev-total">${_bSize}-Jahres-Perioden</span></div>
        <div class="or-timebar-wrap">${_barHtml}</div>
        ${_detailHtml}${_undatedHtml}
      </div>`;
    }
  }

  // P5a-3: Quellen zu diesem Ort
  const _namesToCheck = [placeName.toLowerCase()];
  if (place.placeId) {
    const _po3 = getPlaceRegistry().byId[place.placeId];
    for (const pn of (_po3?.pnames || [])) {
      if (pn.value) _namesToCheck.push(pn.value.toLowerCase());
    }
  }
  const _matchedSrcs = Object.values(AppState.db.sources || {})
    .filter(s => _namesToCheck.some(n => n.length > 3 && (s.title || '').toLowerCase().includes(n)));
  if (_matchedSrcs.length) {
    let _srcHtml = '';
    for (const s of _matchedSrcs) {
      const _repoName = s.repo ? (AppState.db.repositories?.[s.repo]?.name || s.repo) : '';
      _srcHtml += `<div class="fact-row fact-row--clickable" data-action="showSourceDetail" data-id="${esc(s.id)}">
        <span class="fact-val">${esc(s.title || s.id)}${_repoName ? `<span class="place-src-repo"> · ${esc(_repoName)}</span>` : ''}</span>
        <span class="p-arrow">›</span>
      </div>`;
    }
    html += `<div class="section fade-up">
      <div class="section-title">Quellen zu diesem Ort</div>
      ${_srcHtml}
    </div>`;
  }

  html += _placeDetailDeleteRow(place, placeName);

  document.getElementById('detailPlace').innerHTML = html;
  _activateDetailContainer('detailPlace', ref);   // Skip-Render-Check identitäts-gekeyt
  showView('v-detail');
  if (place.lati !== null && place.long !== null) _initPlaceDetailMap(place.lati, place.long, compactPlace(placeName));
}

// ─── Übersetzungs-Editor (P2 Item 7: schreibt in placeObjects.pnames) ────────
function addPlaceTrans() {
  const placeName = AppState.currentPlaceName;
  if (!placeName) return;
  const val = document.getElementById('pl-tran-val')?.value.trim();
  if (!val) { showToast('⚠ Übersetzung darf nicht leer sein'); return; }
  const lang = document.getElementById('pl-tran-lang')?.value.trim() || '';
  // PlaceObject finden oder erzeugen (extraPlaces wird NICHT mehr beschrieben)
  const reg = (typeof getPlaceRegistry === 'function') ? getPlaceRegistry() : null;
  // Stufe 2b: präzise Identität bevorzugen statt findByName (das bei gleichnamigen
  // Orten raten würde).
  let poId = AppState.currentPlaceId || reg?.findByName(placeName);
  if (!poId) {
    poId = (typeof _epId === 'function') ? _epId(placeName) : ('_ep_' + Date.now());
    upsertPlaceObject(poId, () => ({ id: poId, title: placeName, type: 'Unknown',
      lat: null, long: null, pnames: [], enclosedBy: [], parentId: null }));
  }
  mutatePlaceObject(poId, p => {
    if (!Array.isArray(p.pnames)) p.pnames = [];
    p.pnames.push({ value: val, lang, dateFrom: null, dateTo: null, dateType: null, _dateRaw: null });
  });
  showToast('✓ Übersetzung gespeichert');
  showPlaceDetail(AppState.currentPlaceRef || poId || placeName, false);
}

// Legacy: Übersetzung aus extraPlaces.trans löschen (Altbestände vor Item 7)
function deletePlaceTrans(idx) {
  const placeName = AppState.currentPlaceName;
  if (!placeName) return;
  const ep = AppState.db.extraPlaces[placeName];
  if (!ep?.trans) return;
  ep.trans.splice(parseInt(idx, 10), 1);
  saveExtraPlaces();
  markChanged();
  UIState._placesCache = null;
  showPlaceDetail(AppState.currentPlaceRef || placeName, false);
}

// Neue Übersetzung in placeObjects.pnames löschen (Index in pnames-Array)
function deletePlacePname(idx) {
  const placeName = AppState.currentPlaceName;
  if (!placeName) return;
  const reg = (typeof getPlaceRegistry === 'function') ? getPlaceRegistry() : null;
  const poId = AppState.currentPlaceId || reg?.findByName(placeName);
  if (!poId) return;
  mutatePlaceObject(poId, p => { (p.pnames || []).splice(parseInt(idx, 10), 1); });
  showPlaceDetail(AppState.currentPlaceRef || poId || placeName, false);
}

// ─── PLACE-HIST (ADR-024, P0b-2b): Orts-Dubletten-Merge UI ──────────────────
// Setzt auf findPlaceDuplicates()/mergePlaceObjects() (gedcom.js, P0b-2a).
// Nur sinnvoll bei GRAMPS-Daten mit placeObjects (sonst keine Dubletten).
let _placeDupGroups = [];

// Zählt Event-Referenzen je placeId (für den Gewinner-Vorschlag).
function _placeUsageCounts() {
  const c = {};
  // Stufe 1: über _eventPlaceId zählen — sonst zählen placeId-lose Events (deren
  // String via pname auf das PO zeigt) nicht mit, und der Gewinner-Vorschlag im
  // Merge-Modal weicht von der angezeigten Personenzahl der Ortsliste ab.
  const _pid = ev => (typeof _eventPlaceId === 'function') ? _eventPlaceId(ev) : ev?.placeId;
  const bump = ev => { const id = _pid(ev); if (id) c[id] = (c[id] || 0) + 1; };
  for (const p of Object.values(AppState.db.individuals || {})) {
    bump(p.birth); bump(p.chr); bump(p.death); bump(p.buri);
    for (const ev of p.events || []) bump(ev);
  }
  for (const f of Object.values(AppState.db.families || {})) {
    bump(f.marr); bump(f.engag); bump(f.div); bump(f.divf);
    for (const ev of f.events || []) bump(ev);
  }
  return c;
}

// _placeDupMode: 'objects' (GRAMPS placeObjects) | 'strings' (GEDCOM Strings)
let _placeDupMode = 'objects';
// _placeDupKind: 'places' (Orte-Tab, ohne Höfe) | 'farms' (Höfe-Tab, nur Farm/Building)
let _placeDupKind = 'places';

function openPlaceMergeModal(mode) {
  _placeDupKind = (mode === 'farms') ? 'farms' : 'places';
  const titleEl = document.getElementById('lbl-modalPlaceMerge');
  const hintEl  = document.getElementById('placeMergeHint');
  if (titleEl) titleEl.textContent = (_placeDupKind === 'farms') ? 'Hof-Dubletten' : 'Orts-Dubletten';
  if (hintEl)  hintEl.textContent  = (_placeDupKind === 'farms')
    ? 'Gleiche Höfe in verschiedenen Schreibweisen werden zusammengeführt. Der gewählte Haupt-Hof behält Titel und Koordinaten; abweichende Schreibweisen bleiben als historische Namen erhalten.'
    : 'Gleiche Orte in verschiedenen Schreibweisen werden zusammengeführt. Der gewählte Hauptort behält Titel und Koordinaten; abweichende Schreibweisen bleiben als historische Namen erhalten.';
  const hasObjects = typeof findPlaceDuplicates === 'function'
    && Object.keys((AppState.db && AppState.db.placeObjects) || {}).length > 0;
  if (hasObjects) {
    _placeDupMode = 'objects';
    _placeDupGroups = findPlaceDuplicates(1, _placeDupKind);
  } else if (_placeDupKind === 'places' && typeof findStringPlaceDuplicates === 'function') {
    _placeDupMode = 'strings';
    _placeDupGroups = findStringPlaceDuplicates();
  } else {
    showToast(_placeDupKind === 'farms' ? '⚠ Keine Höfe vorhanden' : '⚠ Keine Ortsdaten vorhanden');
    return;
  }
  _renderPlaceMergeList();
  openModal('modalPlaceMerge');
}

function openHofMergeModal() { openPlaceMergeModal('farms'); }

function _renderPlaceMergeList() {
  const el = document.getElementById('placeMergeList');
  if (!el) return;
  if (!_placeDupGroups.length) {
    el.innerHTML = `<div class="dedup-empty">Keine ${_placeDupKind === 'farms' ? 'Hof' : 'Orts'}-Dubletten gefunden</div>`;
    return;
  }
  let html = '';
  if (_placeDupMode === 'objects') {
    const reg = getPlaceRegistry();
    const usage = _placeUsageCounts();
    // Reichtums-Score: gewichtet Strukturtiefe. Schützt vor bare-vs-reich-Fehlwahl,
    // wo der bare PO viele Events hat, aber der reiche PO die ganze Historie trägt.
    const richness = po => {
      const enc = (po.enclosedBy || []).length;
      const pn  = (po.pnames    || []).length;
      return enc * 2 + pn
        + (po.note ? 3 : 0)
        + (po._govId ? 3 : 0)
        + (po.lat != null ? 1 : 0)
        + (po.existsFrom || po.existsTo ? 1 : 0)
        + (po.type && po.type !== 'Unknown' ? 1 : 0);
    };
    _placeDupGroups.forEach((g, gi) => {
      // Ranking: Reichtum > Nutzung > Stable-ID. Reichtum dominiert, damit der
      // strukturell vollständigere PO als Hauptort vorgeschlagen wird.
      const ranked = [...g.ids].sort((a, b) => {
        const pa = reg.byId[a], pb = reg.byId[b];
        if (!pa || !pb) return 0;
        return richness(pb) - richness(pa)
          || (usage[b] || 0) - (usage[a] || 0)
          || a.localeCompare(b);
      });
      const suggested = ranked[0];
      let opts = '';
      for (const id of g.ids) {
        const po = reg.byId[id]; if (!po) continue;
        const n = usage[id] || 0;
        // Reichtums-Indikatoren (Badges nur wenn vorhanden — Bare-PO bleibt leer)
        const encN = (po.enclosedBy || []).length;
        const pnN  = (po.pnames || []).length;
        const badges = [
          pnN  ? `<span class="place-merge-badge" title="${pnN} historische Namensform${pnN!==1?'en':''}">🏷 ${pnN}</span>` : '',
          encN ? `<span class="place-merge-badge" title="${encN} Zugehörigkeit${encN!==1?'en':''} (enclosedBy)">⛓ ${encN}</span>` : '',
          (po.lat != null) ? `<span class="place-merge-badge" title="Koordinaten gesetzt">📍</span>` : '',
          po.note   ? `<span class="place-merge-badge" title="Notiz vorhanden">📝</span>` : '',
          po._govId ? `<span class="place-merge-badge" title="GOV-ID: ${esc(po._govId)}">🌐</span>` : '',
          (po.existsFrom || po.existsTo) ? `<span class="place-merge-badge" title="Existenz: ${esc(po.existsFrom||'?')} – ${esc(po.existsTo||'?')}">⏳</span>` : '',
          (po.type && po.type !== 'Unknown') ? `<span class="place-merge-badge" title="Typ: ${esc(po.type)}">${esc(po.type)}</span>` : '',
        ].filter(Boolean).join(' ');
        const bareHint = (!encN && !pnN && !po.note && !po._govId)
          ? '<span class="place-merge-badge place-merge-bare" title="Strukturell leer — vermutlich Auto-Anlage aus GEDCOM-String">∅ bare</span>' : '';
        // Item 14: Herkunfts-Hint via id-Präfix
        const origin =
          id.startsWith('@')           ? 'GRAMPS' :
          /_imp\d+$/.test(id)          ? 'JSON-Import' :
          id.startsWith('_ep_')        ? 'lokal' :
          id.startsWith('_govp_')      ? 'GOV-Platzhalter' : '';
        const originSpan = origin
          ? `<span class="place-merge-origin" title="Herkunft des placeObject (id-Präfix)">${esc(origin)}</span>` : '';
        opts += `<div class="place-merge-opt">
          <input type="checkbox" name="pmc-${gi}" value="${esc(id)}" checked>
          <input type="radio" name="pmw-${gi}" value="${esc(id)}"${id === suggested ? ' checked' : ''}>
          <span class="place-merge-name">${esc(po.title)}${originSpan}</span>
          <span class="place-merge-meta">${n} Verwendung${n !== 1 ? 'en' : ''}</span>
          <span class="place-merge-rich">${badges}${bareHint}</span>
        </div>`;
      }
      html += `<div class="place-merge-group">
        <div class="place-merge-title">${g.ids.length} mögliche Schreibweisen desselben Ortes</div>
        <div class="place-merge-hint">☑ = einschließen · ◉ = Hauptort</div>
        ${opts}
        <button class="btn btn-save place-merge-btn" data-action="placeMergeGroup" data-gidx="${gi}">Zusammenführen</button>
      </div>`;
    });
  } else {
    // String-Modus (GEDCOM)
    // Radio = Hauptort (Winner); Checkbox = in diesen Merge einschließen (Standard: alle an)
    _placeDupGroups.forEach((g, gi) => {
      const suggested = [...g.names].sort((a, b) =>
        (g.counts[b] || 0) - (g.counts[a] || 0)
        || a.length - b.length)[0];
      let opts = '';
      for (const name of g.names) {
        const n = g.counts[name] || 0;
        opts += `<div class="place-merge-opt">
          <input type="checkbox" name="pmc-${gi}" value="${esc(name)}" checked>
          <input type="radio" name="pmw-${gi}" value="${esc(name)}"${name === suggested ? ' checked' : ''}>
          <span class="place-merge-name">${esc(name)}</span>
          <span class="place-merge-meta">${n} Person${n !== 1 ? 'en' : ''}</span>
        </div>`;
      }
      html += `<div class="place-merge-group">
        <div class="place-merge-title">${g.names.length} mögliche Schreibweisen desselben Ortes</div>
        <div class="place-merge-hint">☑ = einschließen · ◉ = Hauptort</div>
        ${opts}
        <button class="btn btn-save place-merge-btn" data-action="placeMergeGroup" data-gidx="${gi}">Zusammenführen</button>
      </div>`;
    });
  }
  el.innerHTML = html;
}

function placeMergeGroup(gidx) {
  const gi = parseInt(gidx, 10);
  const g = _placeDupGroups[gi];
  if (!g) return;
  const sel = document.querySelector(`input[name="pmw-${gi}"]:checked`);
  if (!sel) { showToast('⚠ Bitte einen Hauptort wählen'); return; }
  const winner = sel.value;

  if (_placeDupMode === 'objects') {
    const checked = new Set([...document.querySelectorAll(`input[name="pmc-${gi}"]:checked`)].map(cb => cb.value));
    checked.add(winner);
    const losers = [...checked].filter(id => id !== winner);
    if (!losers.length) { showToast('⚠ Mindestens einen weiteren Ort einschließen'); return; }
    const res = mergePlaceObjects(winner, losers);
    if (res.merged) {
      markChanged();
      if (typeof savePlaceObjects === 'function') savePlaceObjects(); // Merge-Ergebnis (pnames-Aliase) in IDB sichern
      UIState._placesCache = null;
      showToast(`✓ ${res.merged} zusammengeführt${res.repointed ? `, ${res.repointed} Verweise aktualisiert` : ''}${res.farmsMerged ? `, ${res.farmsMerged} Hof-Dublette${res.farmsMerged !== 1 ? 'n' : ''} konsolidiert` : ''}`);
      _placeDupGroups = findPlaceDuplicates(1, _placeDupKind);
      _renderPlaceMergeList();
      if (typeof renderPlaceList === 'function') renderPlaceList();
      if (_placeDupKind === 'farms' && typeof renderHofList === 'function') renderHofList();
      if (typeof _refreshHofMergeBadge === 'function') _refreshHofMergeBadge();
      if (typeof _refreshPlaceMergeBadge === 'function') _refreshPlaceMergeBadge();
    }
  } else {
    // Nur angehakte Einträge (Checkboxen) zusammenführen; Winner immer dabei
    const checked = new Set([...document.querySelectorAll(`input[name="pmc-${gi}"]:checked`)].map(cb => cb.value));
    checked.add(winner); // Winner ist immer Ziel, auch wenn Checkbox abgehakt
    const losers = [...checked].filter(n => n !== winner);
    if (!losers.length) { showToast('⚠ Mindestens einen weiteren Ort einschließen'); return; }
    const res = mergeStringPlaces(winner, losers);
    markChanged();
    if (typeof savePlaceObjects === 'function') savePlaceObjects(); // Winner-PO mit Alias-pnames in IDB sichern
    showToast(`✓ ${losers.length} zusammengeführt${res.repointed ? `, ${res.repointed} Verweise aktualisiert` : ''}`);
    _placeDupGroups = findStringPlaceDuplicates();
    _renderPlaceMergeList();
    if (typeof renderPlaceList === 'function') renderPlaceList();
  }
}

// ─────────────────────────────────────
//  String→PlaceObject Link-Modal
// ─────────────────────────────────────
let _slinkSources  = new Set();  // aktuell gewählte Quell-Strings
let _slinkTargetId = null;       // gewähltes Ziel-PlaceObject
let _slinkGroups   = [];         // Ergebnis-Gruppen (von _buildLinkGroups)

function openPlaceStringLinkModal(preselect) {
  const reg = typeof getPlaceRegistry === 'function' ? getPlaceRegistry() : null;
  if (!reg || !Object.keys(reg.byId).length) {
    showToast('Keine PlaceObjects vorhanden — erst orte.json laden oder GRAMPS-Datei importieren');
    return;
  }

  _slinkSources  = new Set(preselect ? [preselect] : []);
  _slinkTargetId = null;
  _slinkGroups   = [];

  // Schritt 1: Quell-Sektion — nur zeigen wenn kein preselect (allgemeiner Aufruf)
  const srcSec = document.getElementById('slinkSourceSection');
  const listEl = document.getElementById('slinkSourceList');
  const headEl = document.getElementById('slinkPreselectedName');
  if (preselect) {
    if (srcSec)  srcSec.hidden = true;
    if (headEl) { headEl.textContent = compactPlace(preselect); headEl.closest('.slink-preselect-bar').hidden = false; }
  } else {
    if (srcSec)  srcSec.hidden = false;
    if (headEl) headEl.closest('.slink-preselect-bar').hidden = true;
    const all = [...collectPlaces().values()].filter(pl => !pl.placeId)
      .sort((a, b) => compactPlace(a.name).localeCompare(compactPlace(b.name), 'de'));
    if (!all.length) { showToast('Keine unverlinkten GEDCOM-Ortsstrings vorhanden'); return; }
    if (listEl) {
      listEl.innerHTML = all.map(pl => {
        const n = pl.personIds.size;
        return `<label class="place-merge-opt">
          <input type="checkbox" class="slink-src-cb" value="${esc(pl.name)}">
          <span class="place-merge-name">${esc(compactPlace(pl.name))}</span>
          <span class="place-merge-meta">${n} Ereignis${n !== 1 ? 'se' : ''}</span>
        </label>`;
      }).join('');
    }
  }

  // Ziel zurücksetzen
  const tsel = document.getElementById('slinkTargetSelected');
  const tlist = document.getElementById('slinkTargetList');
  const gsec  = document.getElementById('slinkGroupsSection');
  const conf  = document.getElementById('slinkConfirmBtn');
  const tinp  = document.getElementById('slinkTargetSearch');
  if (tsel)  { tsel.hidden = true; tsel.textContent = ''; }
  if (tlist) tlist.innerHTML = '';
  if (gsec)  gsec.hidden = true;
  if (conf)  conf.disabled = true;
  if (tinp)  tinp.value = '';

  openModal('modalPlaceStringLink');
}

function renderSlinkTargetList(q) {
  const el = document.getElementById('slinkTargetList');
  if (!el) return;
  const reg = typeof getPlaceRegistry === 'function' ? getPlaceRegistry() : null;
  if (!reg) return;
  const lower = (q || '').toLowerCase().trim();
  const hits = Object.values(reg.byId)
    .filter(po => !lower || po.title.toLowerCase().includes(lower)
      || (po.pnames || []).some(pn => pn.value.toLowerCase().includes(lower)))
    .slice(0, 40);
  if (!hits.length) { el.innerHTML = '<div class="no-data-pad">Kein PlaceObject gefunden</div>'; return; }
  el.innerHTML = hits.map(po =>
    `<div class="person-row slink-target-row" data-action="selectSlinkTarget"
         data-id="${esc(po.id)}" data-title="${esc(po.title)}">
      <span class="place-merge-name">${esc(po.title)}</span>
      <span class="place-merge-meta">${(po.enclosedBy||[]).length ? '⛓' : ''}${po.lat != null ? ' 📍' : ''}</span>
    </div>`).join('');
}

function selectSlinkTarget(id, title) {
  _slinkTargetId = id;
  const tsel  = document.getElementById('slinkTargetSelected');
  const tlist = document.getElementById('slinkTargetList');
  const tinp  = document.getElementById('slinkTargetSearch');
  if (tsel)  { tsel.textContent = `✓ ${title}`; tsel.hidden = false; }
  if (tlist) tlist.innerHTML = '';
  if (tinp)  tinp.value = '';
  _updateSlinkSources();
  _renderSlinkGroups();
}

function _updateSlinkSources() {
  // Im Preselect-Modus ist die Source-Sektion ausgeblendet → _slinkSources bleibt wie gesetzt
  const srcSec = document.getElementById('slinkSourceSection');
  if (srcSec && !srcSec.hidden) {
    _slinkSources = new Set(
      [...document.querySelectorAll('.slink-src-cb:checked')].map(cb => cb.value)
    );
  }
}

function _renderSlinkGroups() {
  _updateSlinkSources();
  const gsec = document.getElementById('slinkGroupsSection');
  const gel  = document.getElementById('slinkGroupsList');
  const conf = document.getElementById('slinkConfirmBtn');
  if (!gsec || !gel || !conf) return;
  if (!_slinkTargetId || !_slinkSources.size) {
    gsec.hidden = true; conf.disabled = true; return;
  }
  _slinkGroups = typeof _buildLinkGroups === 'function'
    ? _buildLinkGroups([..._slinkSources], _slinkTargetId) : [];
  if (!_slinkGroups.length) {
    gel.innerHTML = '<div class="no-data-pad">Keine passenden Events gefunden</div>';
    gsec.hidden = false; conf.disabled = true; return;
  }
  gel.innerHTML = _slinkGroups.map((g, i) => {
    const span = g.yearMin !== Infinity
      ? `${g.yearMin}${g.yearMax !== g.yearMin ? '–' + g.yearMax : ''}`
      : '';
    const nodate = g.noDate ? ` · ${g.noDate} ohne Datum` : '';
    return `<label class="place-merge-opt slink-group-row">
      <input type="checkbox" class="slink-grp-cb" value="${i}" checked>
      <span class="place-merge-name slink-result-str">${esc(g.str)}</span>
      <span class="place-merge-meta">${g.count} Ereignis${g.count !== 1 ? 'se' : ''}${span ? ' · ' + span : ''}${nodate}</span>
    </label>`;
  }).join('');
  gsec.hidden = false;
  conf.disabled = false;
}

function confirmStringPlaceLink() {
  _updateSlinkSources();
  if (!_slinkTargetId || !_slinkSources.size) {
    showToast('⚠ Bitte Quell-Strings und Ziel-PlaceObject wählen'); return;
  }
  const confirmed = [...document.querySelectorAll('.slink-grp-cb:checked')]
    .map(cb => _slinkGroups[+cb.value]?.str).filter(Boolean);
  if (!confirmed.length) { showToast('⚠ Mindestens eine Gruppe auswählen'); return; }
  const linked = typeof applyStringPlaceLink === 'function'
    ? applyStringPlaceLink([..._slinkSources], _slinkTargetId, confirmed) : 0;
  if (linked) {
    markChanged();
    closeModal('modalPlaceStringLink');
    showToast(`✓ ${linked} Ereignis${linked !== 1 ? 'se' : ''} verknüpft`);
    if (typeof renderPlaceList === 'function') renderPlaceList();
  } else {
    showToast('⚠ Keine Ereignisse verknüpft — Quell-Strings oder Gruppen prüfen');
  }
}

// ─────────────────────────────────────
//  P5e — ORTS-KONTEXTSATZ
// ─────────────────────────────────────

// Gibt einen deutschen Kontextsatz zurück: „{Name} war im Jahr {year} ein {Typ} in {enclosureChain}."
// Gibt '' zurück wenn kein placeObject oder keine hilfreichen Daten vorhanden.
function buildPlaceContextSentence(placeId, year) {
  if (!placeId || typeof getPlaceRegistry !== 'function') return '';
  const reg = getPlaceRegistry();
  const po  = reg?.byId?.[placeId];
  if (!po) return '';

  const TYPE_DE = {
    Country:'ein Land', State:'ein Bundesland', Region:'eine Region', Province:'eine Provinz',
    County:'ein Kreis', District:'ein Bezirk', Municipality:'eine Gemeinde', City:'eine Stadt',
    Town:'eine Stadt', Village:'ein Dorf', Hamlet:'ein Weiler', Parish:'eine Pfarrei',
    Borough:'ein Stadtteil', Locality:'eine Ortslage', Neighborhood:'eine Nachbarschaft',
    Building:'ein Gebäude', Farm:'ein Hof', Cemetery:'ein Friedhof', Church:'eine Kirche',
  };
  const typePart = TYPE_DE[po.type] ? ` ${TYPE_DE[po.type]}` : '';

  // Name zum Zeitpunkt des Events (resolveAsOf), Fallback auf title
  const rawName = (typeof year === 'number' && reg.resolveAsOf)
    ? (reg.resolveAsOf(placeId, year) || po.title || '')
    : (po.title || '');
  // Nur ersten Teil des vollständigen Namens (vor dem ersten Komma)
  const name = rawName.split(',')[0].trim();
  if (!name) return '';

  // Zugehörigkeitskette (ohne den Ort selbst)
  const chain = reg.enclosureChainAsOf ? reg.enclosureChainAsOf(placeId, year ?? null).slice(1) : [];
  const chainPart = chain.length ? ` in ${chain.join(', ')}` : '';

  if (!typePart && !chainPart) return '';
  const yearStr = year ? ` ${year}` : '';
  return `${name} war${yearStr}${typePart}${chainPart}.`;
}

// ─────────────────────────────────────
//  P5d — GEO-PLAUSIBILITÄTS-VALIDATOR
// ─────────────────────────────────────

// Bounding-Box für „plausible" Koordinaten (Europa + angrenzende Regionen)
const _GEO_BBOX = { minLat: 27, maxLat: 72, minLon: -25, maxLon: 50 };
// Max. plausible Distanz Hof ↔ umschließender Ort (ADR-026). Großzügig, damit
// nur grobe Fehler (vertauschte lat/long, Zahlendreher, falscher Ort) anschlagen.
const _HOF_MAX_DIST_KM = 25;

// Liefert Array von { placeId, title, code, msg } Warnungen
function validatePlaces() {
  const warnings = [];
  const pos = AppState.db?.placeObjects;
  if (!pos) return warnings;

  const parseY = s => { const m = s && s.match(/\d{4}/); return m ? +m[0] : null; };

  for (const po of Object.values(pos)) {
    const title = po.title || po.id;

    // P5d-1: Koordinaten außerhalb Bounding-Box
    if (po.lat != null && po.long != null) {
      if (po.lat < _GEO_BBOX.minLat || po.lat > _GEO_BBOX.maxLat ||
          po.long < _GEO_BBOX.minLon || po.long > _GEO_BBOX.maxLon) {
        warnings.push({ placeId: po.id, title, code: 'BBOX',
          msg: `Koordinaten außerhalb Europa: ${po.lat.toFixed(3)}, ${po.long.toFixed(3)}` });
      }
    }

    // ADR-027 P4: HOF_NO_COORD / HOF_FAR operieren jetzt über V2-hofObjects
    // (siehe Validierungs-Block unter dem placeObjects-Loop). Farm/Building in
    // placeObjects existiert nach Phase-3-Migration nicht mehr.

    // P5d-2a: dateFrom > dateTo in pnames[]
    for (const pn of (po.pnames || [])) {
      const f = parseY(pn.dateFrom), t = parseY(pn.dateTo);
      if (f && t && f > t) {
        warnings.push({ placeId: po.id, title, code: 'PNAME_DATE',
          msg: `Name „${pn.value}": Startjahr ${f} > Endjahr ${t}` });
      }
    }

    // P5d-2b: Überlappende Perioden gleicher Sprache in pnames[]
    const byLang = {};
    for (const pn of (po.pnames || [])) {
      const lang = pn.lang || '';
      const f = parseY(pn.dateFrom), t = parseY(pn.dateTo);
      if (!f && !t) continue;
      if (!byLang[lang]) byLang[lang] = [];
      byLang[lang].push({ f: f || 0, t: t || 9999, val: pn.value });
    }
    for (const [lang, spans] of Object.entries(byLang)) {
      for (let i = 0; i < spans.length; i++) {
        for (let j = i + 1; j < spans.length; j++) {
          if (spans[i].f < spans[j].t && spans[j].f < spans[i].t) {
            warnings.push({ placeId: po.id, title, code: 'PNAME_OVERLAP',
              msg: `Namen „${spans[i].val}" und „${spans[j].val}"${lang ? ` (${lang})` : ''} überlappen zeitlich` });
          }
        }
      }
    }

    // P5d-2c: enclosedBy-Zirkel (A → … → A)
    // Prüft ob man von enc.placeId aus den Startknoten po.id wieder erreichen
    // kann — nur dann liegt ein echter Zirkel vor. Visited-Set verhindert
    // Endlosschleifen, aber doppelte placeIds in verschiedenen Zeiträumen
    // und gemeinsame Vorfahren lösen keinen false-positive mehr aus.
    const _canReach = (startId, targetId) => {
      const stack = [[startId, 0]];
      const seen = new Set();
      while (stack.length) {
        const [pid, depth] = stack.pop();
        if (pid === targetId) return true;
        if (depth >= 15 || seen.has(pid)) continue;
        seen.add(pid);
        const p = pos[pid];
        if (!p) continue;
        for (const e of (p.enclosedBy || [])) {
          if (e.placeId) stack.push([e.placeId, depth + 1]);
        }
      }
      return false;
    };
    for (const enc of (po.enclosedBy || [])) {
      if (!enc.placeId) continue;
      if (enc.placeId === po.id || _canReach(enc.placeId, po.id)) {
        warnings.push({ placeId: po.id, title, code: 'CYCLE',
          msg: `Zirkelreferenz in „Teil von"-Kette` });
        break;
      }
    }
  }

  // ADR-027 P4: HOF_NO_COORD / HOF_FAR auf V2-hofObjects (statt Farm-placeObjects).
  // V2-Shape-Filter (_isHofObjectV2) verhindert Treffer auf Legacy-addr-keyed-Sidecar.
  const hofs = AppState.db?.hofObjects || {};
  for (const [hofId, h] of Object.entries(hofs)) {
    if (typeof _isHofObjectV2 !== 'function' || !_isHofObjectV2(h)) continue;
    const hofTitle = (h.addrs && h.addrs[0] && h.addrs[0].value) || hofId;
    if (h.lat == null || h.long == null) {
      warnings.push({ placeId: hofId, title: hofTitle, code: 'HOF_NO_COORD',
        msg: `Hof ohne Koordinaten — auf der Karte nicht sichtbar` });
    } else if (typeof _placeDistKm === 'function' && h.villageId && pos[h.villageId]) {
      const parent = pos[h.villageId];
      if (parent.lat != null && parent.long != null) {
        const km = _placeDistKm(h.lat, h.long, parent.lat, parent.long);
        if (km > _HOF_MAX_DIST_KM) {
          warnings.push({ placeId: hofId, title: hofTitle, code: 'HOF_FAR',
            msg: `Hof ${km.toFixed(0)} km vom Ort „${parent.title || parent.id}" entfernt — evtl. vertauschte/falsche Koordinaten` });
        }
      }
    }
  }

  return warnings;
}

let _placeValidatorOpen = false;

function togglePlaceValidator() {
  _placeValidatorOpen = !_placeValidatorOpen;
  _renderPlaceValidator();
  const btn = document.getElementById('placeValidatorBtn');
  if (btn) btn.classList.toggle('icon-btn--active', _placeValidatorOpen);
}

function _renderPlaceValidator() {
  const panel = document.getElementById('placeValidatorPanel');
  if (!panel) return;
  if (!_placeValidatorOpen) { panel.hidden = true; return; }

  const warnings = validatePlaces();
  if (warnings.length === 0) {
    panel.innerHTML = `<div class="place-validator-ok">✓ Keine Plausibilitätsprobleme gefunden</div>`;
  } else {
    const CODE_LBL = { BBOX: '🌍 Koordinaten', PNAME_DATE: '📅 Datumsfeld', PNAME_OVERLAP: '📅 Überlappung', CYCLE: '🔄 Zirkel',
      HOF_NO_COORD: '🏡 Ohne Koordinaten', HOF_FAR: '🏡 Zu weit entfernt' };
    let rows = warnings.map(w =>
      `<div class="place-validator-row fact-row--clickable" data-action="showPlaceByIdValidator" data-pid="${esc(w.placeId)}">
        <span class="place-validator-code">${CODE_LBL[w.code] || w.code}</span>
        <span class="place-validator-title">${esc(w.title)}</span>
        <span class="place-validator-msg">${esc(w.msg)}</span>
        <span class="p-arrow">›</span>
      </div>`
    ).join('');
    panel.innerHTML = `<div class="place-validator-header">⚠ ${warnings.length} Hinweis${warnings.length !== 1 ? 'e' : ''}</div>${rows}`;
  }
  panel.hidden = false;
}

function showPlaceByIdValidator(placeId) {
  const po = AppState.db?.placeObjects?.[placeId];
  if (po) { showPlaceDetail(placeId); return; }
  // HOF_NO_COORD / HOF_FAR: placeId ist ein hofObjects-Key, kein placeObject.
  const ho = AppState.db?.hofObjects?.[placeId];
  if (ho && typeof _isHofObjectV2 === 'function' && _isHofObjectV2(ho)) {
    // In den Höfe-Tab wechseln und Hof-Detail öffnen (auch für Orphans).
    if (typeof switchPlacesSubTab === 'function') switchPlacesSubTab('hoefe');
    if (typeof showHofDetailById === 'function') showHofDetailById(placeId);
  }
}
