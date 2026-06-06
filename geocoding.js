// ─────────────────────────────────────────────────────────────────────────────
//  GEOCODING (P4 PLACE-HIST, ADR-024)
//  Nominatim (OpenStreetMap) — kostenlos, kein API-Key, CORS-safe
//  Rate-Limit: 1 Request/Sekunde (Nominatim-Nutzungsbedingungen)
// ─────────────────────────────────────────────────────────────────────────────

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
let _lastGeoFetch = 0;

// Nominatim address-key → unser type-Vokabular
const _ADDR_KEY_TYPE = {
  hamlet: 'Hamlet', neighbourhood: 'Borough', suburb: 'Borough', quarter: 'Borough',
  village: 'Village', town: 'Town', city: 'City', municipality: 'Municipality',
  county: 'County', state: 'State', country: 'Country', parish: 'Parish',
};

// Rate-limitierter Nominatim-Fetch (min. 1100 ms Abstand)
async function _nominatimFetch(query) {
  const wait = Math.max(0, 1100 - (Date.now() - _lastGeoFetch));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  _lastGeoFetch = Date.now();
  const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=3&accept-language=de&countrycodes=de,at,ch,pl,cz,hu,fr,nl,be,lu`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Nominatim HTTP ${r.status}`);
  return r.json();
}

// Ermittelt Typ + Hierarchiestufe des Suchergebnisses
function _detectLevel(result) {
  const addr = result.address || {};
  const levels = ['hamlet','neighbourhood','suburb','quarter','village','town','city','municipality'];
  // Eigene Stufe = tiefstes address-Feld das einen Wert hat
  for (const k of levels) { if (addr[k]) return { ownKey: k, type: _ADDR_KEY_TYPE[k] || 'Unknown' }; }
  if (addr.county)  return { ownKey: 'county',  type: 'County'  };
  if (addr.state)   return { ownKey: 'state',   type: 'State'   };
  if (addr.country) return { ownKey: 'country', type: 'Country' };
  return { ownKey: null, type: 'Unknown' };
}

// Elternkette für den Ort aus address-Objekt: [{title, type}, ...]
function _parentChain(addr, ownKey) {
  const order = ['hamlet','neighbourhood','suburb','quarter','village','town','city','municipality','county','state','country'];
  const ownIdx = ownKey ? order.indexOf(ownKey) : -1;
  const chain  = [];
  // county/state/country als Eltern (alles oberhalb der Eigenebene, aber nur diese drei Gruppen)
  if (addr.county  && (!ownKey || ownIdx < order.indexOf('county')))  chain.push({ title: addr.county,  type: 'County'  });
  if (addr.state   && (!ownKey || ownIdx < order.indexOf('state')))   chain.push({ title: addr.state,   type: 'State'   });
  if (addr.country && (!ownKey || ownIdx < order.indexOf('country'))) chain.push({ title: addr.country, type: 'Country' });
  return chain;
}

// Findet oder legt ein placeObject an; gibt die ID zurück
// Identity-Lookup primär via PlaceRegistry.findByName (deckt title + ALLE pnames-Aliase
// ab); Fallback: _normPlaceName-Title-Vergleich, falls Registry nicht verfügbar.
function _findOrCreatePO(title, type) {
  const pos = AppState.db.placeObjects || (AppState.db.placeObjects = {});
  let existing = null;
  if (typeof getPlaceRegistry === 'function') {
    const reg = getPlaceRegistry();
    const id  = reg && reg.findByName(title);
    if (id && pos[id]) existing = pos[id];
  }
  if (!existing) {
    const norm = (typeof _normPlaceName === 'function') ? _normPlaceName(title) : title.toLowerCase();
    existing = Object.values(pos).find(po =>
      (typeof _normPlaceName === 'function' ? _normPlaceName(po.title) : (po.title || '').toLowerCase()) === norm);
  }
  if (existing) {
    if (!existing.type || existing.type === 'Unknown') existing.type = type;
    return existing.id;
  }
  const id = (typeof _epId === 'function') ? _epId(title) : ('_epg_' + Date.now().toString(36));
  pos[id] = { id, title, type, lat: null, long: null, pnames: [], enclosedBy: [], parentId: null };
  if (typeof UIState !== 'undefined') { UIState._placeRegistry = null; }
  return id;
}

/**
 * Geocodiert einen Ortsnamen via Nominatim.
 * Legt placeObject an / aktualisiert es (Koordinaten, Typ, enclosedBy-Kette).
 * Gibt { lat, lon, type, hierarchy } zurück, oder null wenn nichts gefunden.
 */
async function geocodeSinglePlace(placeName) {
  if (!placeName?.trim()) return null;
  const results = await _nominatimFetch(placeName);
  if (!results?.length) return null;

  const best = results[0];
  const lat  = parseFloat(best.lat);
  const lon  = parseFloat(best.lon);
  const addr = best.address || {};
  const { ownKey, type } = _detectLevel(best);
  const parents = _parentChain(addr, ownKey);

  const reg = (typeof getPlaceRegistry === 'function') ? getPlaceRegistry() : null;
  let placeId = reg?.findByName(placeName);
  if (!placeId) placeId = _findOrCreatePO(placeName, type);

  if (!AppState.db.placeObjects?.[placeId]) return null;

  // Mutation transaktional über mutatePlaceObject (sorgt für beide Cache-Invalidations + save + markChanged)
  mutatePlaceObject(placeId, po => {
    if (!po.lat)                              { po.lat = lat; po.long = lon; }
    if (!po.type || po.type === 'Unknown')    { po.type = type; }
    // enclosedBy[] wird bewusst NICHT gesetzt — Nominatim liefert nur den heutigen
    // Verwaltungsstand, nicht die historische Zugehörigkeit. Historische Ketten
    // kommen via manueller Eingabe (P2-UI) oder GOV-Offline-Script.
  });

  // Item 9: keine Propagation in Event-Objekte mehr — Render-Pfade lesen via _eventCoords
  // direkt aus dem placeObject (single source of truth).
  return { lat, lon, type, hierarchy: parents };
}

/**
 * Batch-Geocoding: alle Orte ohne Koordinaten.
 * onProgress(done, total, currentName) — wird nach jedem Schritt aufgerufen.
 * Gibt Anzahl erfolgreich geocodierter Orte zurück.
 */
async function batchGeocodePlaces(onProgress) {
  const places  = [...(typeof collectPlaces === 'function' ? collectPlaces().values() : [])];
  const uncoded = places.filter(pl => pl.lati == null);
  if (!uncoded.length) { onProgress?.(0, 0, 'done'); return 0; }

  let done = 0, ok = 0;
  for (const pl of uncoded) {
    onProgress?.(done, uncoded.length, pl.name);
    try {
      const res = await geocodeSinglePlace(pl.name);
      if (res) ok++;
    } catch (e) {
      console.warn('[geocoding] Fehler für', pl.name, e.message);
    }
    done++;
  }
  onProgress?.(done, uncoded.length, 'done');
  return ok;
}
