(function () {
  'use strict';

  // ── State ───────────────────────────────────────────────────────────────────
  UIState._storyPid   = null;
  UIState._storyFamId = null;
  let _storyMap    = null;
  let _mapDataUrl  = null;   // canvas-snapshot nach Tile-Load
  let _printImg    = null;   // temporäres <img> während Druck

  window.addEventListener('beforeprint', _onBeforePrint);
  window.addEventListener('afterprint',  _onAfterPrint);

  // ── Öffentliche API ─────────────────────────────────────────────────────────

  window.showStory = function (pid, pushHistory) {
    pid = pid || AppState.currentPersonId;
    if (!pid || !getPerson(pid)) return;
    if (pushHistory !== false) {
      const cur = _captureCurrentNavState();
      if (cur) UIState._navHistory.push(cur);
      UIState._navFwdStack = [];
    }
    UIState._storyFamId = null;
    UIState._storyPid = pid;
    const p = getPerson(pid);
    document.getElementById('storyTopTitle').textContent = p.name || pid;
    document.getElementById('storyBody').innerHTML = window._storyShared.renderStory(pid);
    showView('v-story');
    _updateNavBtns();
    window._storyShared.embedPhotos(pid);
    _initStoryMap(pid);
  };

  window.printStory = function () { window.print(); };

  window.downloadStory = function () {
    if (UIState._storyFamId) {
      const html  = window._storyShared.famStoryAsHTML();
      const f     = AppState.db?.families?.[UIState._storyFamId];
      const husb  = f?.husb ? getPerson(f.husb) : null;
      const wife  = f?.wife ? getPerson(f.wife) : null;
      const base  = [husb?.surname || husb?.name, wife?.surname || wife?.name]
        .filter(Boolean).join('_').replace(/[^\wÀ-ɏ-]/g, '_') || 'Familie';
      const blob  = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url   = URL.createObjectURL(blob);
      const a     = document.createElement('a');
      a.href = url; a.download = base + '_Familie_story.html';
      document.body.appendChild(a); a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
      return;
    }
    const html = window._storyShared.storyAsHTML();
    const p    = getPerson(UIState._storyPid);
    const base = p ? (p.surname || p.name || UIState._storyPid || 'story')
                       .replace(/[^\wÀ-ɏ-]/g, '_') : 'story';
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = base + '_story.html';
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
  };

  // ── Foto-Loader (IDB → OneDrive) ────────────────────────────────────────────

  async function _loadMediaSrc(file) {
    if (!file) return null;
    // 1. IDB-Cache
    if (typeof idbGet === 'function') {
      try { const s = await idbGet('img:' + file); if (s) return s; } catch (_) {}
    }
    // 2. OneDrive (gibt data-URL zurück — print-sicher)
    if (typeof _odGetMediaUrlByPath === 'function') {
      try { const s = await _odGetMediaUrlByPath(file); if (s) return s; } catch (_) {}
    }
    return null;
  }

  // ── Text-Helfer ─────────────────────────────────────────────────────────────

  function _esc(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _pronoun(p) {
    const m = p.sex === 'M', f = p.sex === 'F';
    const n = p.given || (p.name || '').split(',')[1]?.trim() || p.name || '';
    return {
      Er:      m ? 'Er'      : f ? 'Sie'     : _esc(n),
      er:      m ? 'er'      : f ? 'sie'     : _esc(n),
      Sein:    m ? 'Sein'    : f ? 'Ihr'     : 'Sein',
      sein:    m ? 'sein'    : f ? 'ihr'     : 'sein',
      Sohn:    m ? 'Sohn'    : f ? 'Tochter' : 'Kind',
      SohnArt: m ? 'der'     : f ? 'die'     : 'das',
    };
  }

  function _shortPlace(place) {
    if (!place) return '';
    return place.split(',').map(s => s.trim()).find(s => s) || '';
  }

  function _atPlace(ev) {
    const addrLine = ev.addr ? ev.addr.split('\n')[0].trim() : '';
    const placePart = _shortPlace(ev.place);
    const pl = [addrLine, placePart].filter(Boolean).join(', ');
    return pl ? ' in ' + _esc(pl) : '';
  }

  const _MONTHS_DE = {
    JAN:'Januar', FEB:'Februar', MAR:'März',     APR:'April',
    MAY:'Mai',    JUN:'Juni',    JUL:'Juli',      AUG:'August',
    SEP:'September', OCT:'Oktober', NOV:'November', DEC:'Dezember',
  };

  function _fmtDate(d) {
    if (!d) return '';
    return d
      .replace(/^FROM\s+(.+?)\s+TO\s+(.+)$/i,  'von $1 bis $2')
      .replace(/^BET\s+(.+?)\s+AND\s+(.+)$/i,  'zwischen $1 und $2')
      .replace(/^BEF\s+/i,  'vor ')
      .replace(/^AFT\s+/i,  'nach ')
      .replace(/^ABT\s+/i,  'um ')
      .replace(/^CAL\s+/i,  'errechnet ')
      .replace(/^EST\s+/i,  'geschätzt ')
      .replace(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/g,
               m => _MONTHS_DE[m] || m)
      // Tageszahl vor übersetztem Monatsnamen: „10 April" → „10. April"
      .replace(/\b(\d{1,2})\s+(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\b/g,
               '$1. $2');
  }

  const _MONTH_YEAR_RE = /^(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+\d{4}$/;

  function _atDate(ev) {
    if (!ev.date) return '';
    const raw = ev.date.trim();
    if (/^\d{4}$/.test(raw)) return ' (' + raw + ')';  // Jahr-only in Klammern
    const fmt = _fmtDate(raw);
    const hasQual = /^(von|zwischen|vor|nach|um|errechnet|geschätzt)\s/.test(fmt);
    if (!hasQual && _MONTH_YEAR_RE.test(fmt)) return ' im ' + _esc(fmt);
    return ' ' + (hasQual ? '' : 'am ') + _esc(fmt);
  }

  function _yearFromDate(d) {
    if (!d) return null;
    const m = d.match(/\b(\d{4})\b/);
    return m ? parseInt(m[1], 10) : null;
  }

  // ── Text-Kompositions-Helfer ────────────────────────────────────────────────

  // „FROM 1850 TO 1870" → „1850–1870"; gleiches Jahr → nur „1850"
  function _occuPeriod(dateStr) {
    if (!dateStr) return '';
    const m = dateStr.match(/^FROM\s+(.+?)\s+TO\s+(.+)$/i);
    if (m) {
      const y1 = _yearFromDate(m[1]), y2 = _yearFromDate(m[2]);
      if (y1 && y2) return y1 === y2 ? String(y1) : `${y1}–${y2}`;
      return `${_fmtDate(m[1])} bis ${_fmtDate(m[2])}`;
    }
    const y = _yearFromDate(dateStr);
    return y ? String(y) : '';
  }

  // Führende/schließende Anführungszeichen aus GEDCOM-Werten entfernen
  function _stripQuotes(s) {
    return s ? s.replace(/^["'"„'‚]|["'"'‛]$/g, '').trim() : '';
  }

  // Partner-Lebensdaten als kurze Klammer: „(*1820, †1902)"
  function _partnerSpan(partner) {
    if (!partner) return '';
    const by = _yearFromDate(partner.birth?.date || partner.chr?.date);
    const dy = _yearFromDate(partner.death?.date);
    if (!by && !dy) return '';
    return ' (' + [by ? '*' + by : '', dy ? '†' + dy : ''].filter(Boolean).join(', ') + ')';
  }

  // Kinderliste: vollständiger Satz, natürliche Formulierung
  function _childSentence(children) {
    if (!children.length) return null;
    const withYr = children.map(c => {
      const yr = _yearFromDate(c.birth?.date || c.chr?.date);
      return _esc(c.name || c.id) + (yr ? ` (*${yr})` : '');
    });
    const n = withYr.length;
    const last = withYr.slice(-1)[0];
    const rest = withYr.slice(0, -1);
    if (n === 1) return `Das gemeinsame Kind war ${last}.`;
    if (n <= 3)  return `Die gemeinsamen Kinder waren ${rest.join(', ')} und ${last}.`;
    if (n <= 6)  return `Das Paar hatte ${n} Kinder: ${rest.join(', ')} und ${last}.`;
    return `Das Paar hatte ${n} Kinder.`;
  }

  // Mehrere OCCU-Ereignisse zu einem Satz zusammenführen
  function _mergeOccuSentence(occus, pr) {
    const jobs = occus.filter(ev => ev.value);
    if (!jobs.length) return '';
    if (jobs.length === 1) {
      const ev = jobs[0];
      return `${pr.Er} war als ${_esc(ev.value)} tätig${_atPlace(ev)}${_atDate(ev)}.`;
    }
    const parts = jobs.map(ev => {
      const period = _occuPeriod(ev.date);
      return _esc(ev.value) + (period ? ` (${period})` : '');
    });
    const last = parts.slice(-1)[0];
    const rest = parts.slice(0, -1);
    return `${pr.Er} arbeitete als ${rest.join(', ')} und später als ${last}.`;
  }

  // Mehrere GRAD-Ereignisse chronologisch zu einem Satz zusammenführen
  function _mergeGradSentence(grads, pr) {
    if (!grads.length) return '';
    const sorted = [...grads].sort((a, b) =>
      (_yearFromDate(a.date) ?? Infinity) - (_yearFromDate(b.date) ?? Infinity));
    if (sorted.length === 1) {
      const ev = sorted[0];
      const val = ev.value ? _esc(_stripQuotes(ev.value)) : 'einen Abschluss';
      return `${pr.Er} erlangte ${val}${_atPlace(ev)}${_atDate(ev)}.`;
    }
    const parts = sorted.map(ev => {
      const yr = _yearFromDate(ev.date);
      return (ev.value ? _esc(_stripQuotes(ev.value)) : 'Abschluss') + (yr ? ` (${yr})` : '');
    });
    const last = parts.slice(-1)[0];
    const rest = parts.slice(0, -1);
    return `${pr.Er} erlangte: ${rest.join(', ')} sowie ${last}.`;
  }

  // Mehrere EDUC-Ereignisse zu einem Bildungsweg-Satz zusammenführen
  function _mergeEducSentence(educs, pr) {
    if (!educs.length) return '';
    const sorted = [...educs].sort((a, b) =>
      (_yearFromDate(a.date) ?? Infinity) - (_yearFromDate(b.date) ?? Infinity));
    if (sorted.length === 1) {
      const ev = sorted[0];
      const val = ev.value ? _esc(_stripQuotes(ev.value)) : '';
      return `${pr.Er} besuchte${val ? ' ' + val : ''}${_atPlace(ev)}${_atDate(ev)}.`;
    }
    const parts = sorted.map(ev => {
      const period = _occuPeriod(ev.date);
      const place  = _shortPlace(ev.place);
      const val    = ev.value ? _esc(_stripQuotes(ev.value)) : 'Bildungseinrichtung';
      return val
        + (place ? ' in ' + _esc(place) : '')
        + (period ? ` (${period})` : '');
    });
    const last = parts.slice(-1)[0];
    const rest = parts.slice(0, -1);
    return `${pr.Er} besuchte: ${rest.join(', ')} sowie ${last}.`;
  }

  // 3+ RESI-Ereignisse als kompakte Ortsliste; ≤2 bleiben Einzelsätze
  function _mergeResiSentence(resis, pr) {
    if (!resis.length) return '';
    if (resis.length <= 2) {
      return resis.map(ev => `${pr.Er} lebte${_atPlace(ev)}${_atDate(ev)}.`).join(' ');
    }
    const places = resis.map(ev => {
      const addrLine = ev.addr ? ev.addr.split('\n')[0].trim() : '';
      const placePart = _shortPlace(ev.place);
      const pl = [addrLine, placePart].filter(Boolean).join(', ');
      if (!pl) return null;
      const yr  = _yearFromDate(ev.date);
      if (!yr) return _esc(pl);
      const fmt = _fmtDate(ev.date || '');
      const qm  = fmt.match(/^(um|vor|nach|errechnet|geschätzt)\s+/);
      return _esc(pl) + (qm ? ` (${qm[1]} ${yr})` : ` (${yr})`);
    }).filter(Boolean);
    if (!places.length) return '';
    const last = places.slice(-1)[0];
    const rest = places.slice(0, -1);
    return `${pr.Er} wohnte in ${rest.join(', ')} und ${last}.`;
  }

  // FROM-TO-Ereignisse mit Wert (generische berufliche Stationen): zunächst/danach/zuletzt
  function _mergeCareerSentence(careers, pr) {
    if (!careers.length) return '';
    if (careers.length === 1) {
      const ev = careers[0];
      const period = _occuPeriod(ev.date);
      return `${pr.Er} war ${_esc(ev.value)}${period ? ' (' + period + ')' : ''}${_atPlace(ev)}.`;
    }
    const parts = careers.map((ev, i) => {
      const period = _occuPeriod(ev.date);
      const val = _esc(ev.value) + (period ? ` (${period})` : '') + _atPlace(ev);
      if (i === 0) return `${pr.Er} war zunächst ${val}`;
      if (i === careers.length - 1) return `zuletzt ${val}`;
      return `danach ${val}`;
    });
    return parts.join('; ') + '.';
  }

  // ── Event-Satz-Templates ────────────────────────────────────────────────────

  const _EV_TPL = {
    OCCU: (ev, pr) => `${pr.Er} war als ${_esc(ev.value || ev.eventType || '')} tätig${_atPlace(ev)}${_atDate(ev)}.`,
    RESI: (ev, pr) => `${pr.Er} lebte${_atPlace(ev)}${_atDate(ev)}.`,
    EDUC: (ev, pr) => `${pr.Er} erhielt Bildung${ev.value ? ': ' + _esc(ev.value) : ''}${_atPlace(ev)}${_atDate(ev)}.`,
    MILI: (ev, pr) => `${pr.Er} leistete Militärdienst${ev.value ? ' (' + _esc(ev.value) + ')' : ''}${_atPlace(ev)}${_atDate(ev)}.`,
    EMIG: (ev, pr) => `${pr.Er} wanderte aus${_atPlace(ev)}${_atDate(ev)}.`,
    IMMI: (ev, pr) => `${pr.Er} wanderte ein${_atPlace(ev)}${_atDate(ev)}.`,
    NATU: (ev, pr) => `${pr.Er} wurde eingebürgert${_atPlace(ev)}${_atDate(ev)}.`,
    CONF: (ev, pr) => `${pr.Er} wurde konfirmiert${_atPlace(ev)}${_atDate(ev)}.`,
    FCOM: (ev, pr) => `${pr.Er} erhielt die Erstkommunion${_atPlace(ev)}${_atDate(ev)}.`,
    GRAD: (ev, pr) => `${pr.Er} erlangte einen Abschluss${ev.value ? ': ' + _esc(ev.value) : ''}${_atPlace(ev)}${_atDate(ev)}.`,
    RELI: (ev, pr) => `${pr.Er} gehörte der Religion ${_esc(ev.value || '')} an${_atDate(ev)}.`,
    TITL: (ev, pr) => `${pr.Er} trug den Titel ${_esc(ev.value || '')}${_atDate(ev)}.`,
    CENS: (ev, pr) => `${pr.Er} wurde in einer Volkszählung erfasst${_atPlace(ev)}${_atDate(ev)}.`,
    RETI: (ev, pr) => `${pr.Er} trat in den Ruhestand${_atDate(ev)}.`,
    PROP: (ev, pr) => `${pr.Er} besaß ${_esc(ev.value || 'Eigentum')}${_atPlace(ev)}${_atDate(ev)}.`,
    WILL: (ev, pr) => `${pr.Er} verfasste ein Testament${_atDate(ev)}.`,
    PROB: (ev, pr) => `Das Testament wurde eröffnet${_atDate(ev)}.`,
    ADOP: (ev, pr) => `${pr.Er} wurde adoptiert${_atDate(ev)}.`,
    ORDN: (ev, pr) => `${pr.Er} wurde ordiniert${_atPlace(ev)}${_atDate(ev)}.`,
    BAPM: (ev, pr) => `${pr.Er} wurde getauft${_atPlace(ev)}${_atDate(ev)}.`,
  };

  function _eventSentence(ev, pr) {
    const fn = _EV_TPL[ev.type];
    if (fn) return fn(ev, pr);
    const label = ev.eventType ||
      (typeof EVENT_LABELS !== 'undefined' && EVENT_LABELS[ev.type]) ||
      ev.type || 'Ereignis';
    // FROM-TO-Zeitraum mit Wert: natürlicher Tätigkeitssatz
    if (ev.value && ev.date && /^FROM\s+/i.test(ev.date)) {
      const period = _occuPeriod(ev.date);
      return `${pr.Er} war ${_esc(ev.value)}${period ? ' (' + period + ')' : ''}${_atPlace(ev)}.`;
    }
    if (ev.value && ev.date) {
      const raw = ev.date.trim();
      const fmt = _fmtDate(raw);
      const isYearOnly = /^\d{4}$/.test(raw);
      const hasQual    = /^(von|zwischen|vor|nach|um|errechnet|geschätzt)\s/.test(fmt);
      // Konkretes Datum (Tag+Monat+Jahr, kein Qualifier) → Datum vorne
      if (!isYearOnly && !hasQual) {
        const prep = _MONTH_YEAR_RE.test(fmt) ? 'Im' : 'Am';
        return `${prep} ${_esc(fmt)}${_atPlace(ev)}: ${_esc(ev.value)}.`;
      }
    }
    // Wert vorhanden: Wert als Hauptaussage, Label weglassen
    if (ev.value) {
      return `${pr.Er} — ${_esc(ev.value)}${_atDate(ev)}${_atPlace(ev)}.`;
    }
    return `${pr.Er} — ${_esc(label)}${_atDate(ev)}${_atPlace(ev)}.`;
  }

  // ── SVG-Minikarte ───────────────────────────────────────────────────────────

  function _collectGeoPoints(pid) {
    const p = getPerson(pid);
    if (!p) return [];
    const pts = [];

    function add(lati, long, date, label, type) {
      if (lati == null || long == null) return;
      pts.push({ lati, long, year: _yearFromDate(date), label: label || '', type });
    }

    add(p.birth?.lati, p.birth?.long, p.birth?.date, _shortPlace(p.birth?.place) || 'Geburt', 'birth');
    add(p.chr?.lati,   p.chr?.long,   p.chr?.date,   _shortPlace(p.chr?.place)   || 'Taufe',  'chr');

    for (const ev of (p.events || [])) {
      if (ev.lati == null) continue;
      const label = _shortPlace(ev.place) || ev.eventType ||
        (typeof EVENT_LABELS !== 'undefined' && EVENT_LABELS[ev.type]) || ev.type || '';
      add(ev.lati, ev.long, ev.date, label, 'event');
    }

    for (const famId of (p.fams || [])) {
      const f = getFamily(famId);
      if (f?.marr?.lati != null)
        add(f.marr.lati, f.marr.long, f.marr.date, _shortPlace(f.marr.place) || 'Heirat', 'marr');
    }

    add(p.death?.lati, p.death?.long, p.death?.date, _shortPlace(p.death?.place) || 'Tod',       'death');
    add(p.buri?.lati,  p.buri?.long,  p.buri?.date,  _shortPlace(p.buri?.place)  || 'Begräbnis', 'buri');

    // Chronologisch sortieren, undatierte ans Ende
    pts.sort((a, b) => {
      if (a.year === null && b.year === null) return 0;
      if (a.year === null) return 1;
      if (b.year === null) return -1;
      return a.year - b.year;
    });

    // Aufeinanderfolgende Duplikate entfernen
    return pts.filter((pt, i) => {
      if (i === 0) return true;
      const prev = pts[i - 1];
      return !(Math.abs(pt.lati - prev.lati) < 0.001 && Math.abs(pt.long - prev.long) < 0.001);
    });
  }

  function _initStoryMap(pid) {
    const container = document.getElementById('storyMap');
    if (!container) return;
    if (_storyMap) { _storyMap.remove(); _storyMap = null; }
    _mapDataUrl = null;

    const pts = _collectGeoPoints(pid);
    if (!pts.length) { container.closest('.story-map').hidden = true; return; }
    container.closest('.story-map').hidden = false;

    _storyMap = L.map(container, { zoomControl: true, attributionControl: true });
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      crossOrigin: 'anonymous',
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(_storyMap);

    const latlngs = pts.map(pt => [pt.lati, pt.long]);
    L.polyline(latlngs, { color: '#8b6914', weight: 2.5, dashArray: '6,5', opacity: 0.85 }).addTo(_storyMap);

    const fillColors = { birth: '#4a7c59', chr: '#4a7c59', death: '#9b3a3a', buri: '#9b3a3a', marr: '#5a6fa8' };
    for (const pt of pts) {
      const fill = fillColors[pt.type] || '#8b6914';
      L.circleMarker([pt.lati, pt.long], {
        radius: 6, color: '#fff', weight: 1.5, fillColor: fill, fillOpacity: 1,
      }).bindTooltip(pt.label || '', { permanent: false }).addTo(_storyMap);
    }

    if (latlngs.length === 1) {
      _storyMap.setView(latlngs[0], 9);
    } else {
      _storyMap.fitBounds(L.latLngBounds(latlngs), { padding: [24, 24] });
    }

    // Canvas-Snapshot nach vollständigem Tile-Load (pts per Closure)
    tileLayer.once('load', () => _captureMapSnapshot(pts));
  }

  async function _captureMapSnapshot(pts) {
    const container = document.getElementById('storyMap');
    if (!container || !_storyMap) return;
    const mr = container.getBoundingClientRect();
    const W = Math.round(mr.width), H = Math.round(mr.height);
    if (!W || !H) return;

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#e8e4da';
    ctx.fillRect(0, 0, W, H);

    // Tiles via getBoundingClientRect (CSS-Transform bereits eingerechnet)
    for (const tile of container.querySelectorAll('.leaflet-tile:not(.leaflet-tile-loading)')) {
      if (!tile.complete || !tile.naturalWidth) continue;
      const tr = tile.getBoundingClientRect();
      try { ctx.drawImage(tile, tr.left - mr.left, tr.top - mr.top, tr.width, tr.height); } catch (_) {}
    }

    // Overlay direkt mit latLngToContainerPoint() — kein SVG-Serialisierungsproblem
    const fillColors = { birth: '#4a7c59', chr: '#4a7c59', death: '#9b3a3a', buri: '#9b3a3a', marr: '#5a6fa8' };
    const pixPts = pts.map(pt => _storyMap.latLngToContainerPoint([pt.lati, pt.long]));

    if (pixPts.length >= 2) {
      ctx.beginPath();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = 'rgba(139,105,20,0.85)';
      ctx.lineWidth = 2.5;
      ctx.moveTo(pixPts[0].x, pixPts[0].y);
      for (let i = 1; i < pixPts.length; i++) ctx.lineTo(pixPts[i].x, pixPts[i].y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    for (let i = 0; i < pts.length; i++) {
      const px = pixPts[i];
      ctx.beginPath();
      ctx.arc(px.x, px.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = fillColors[pts[i].type] || '#8b6914';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    _mapDataUrl = canvas.toDataURL('image/png');
  }

  function _onBeforePrint() {
    const container = document.getElementById('storyMap');
    if (!container || !_mapDataUrl) return;
    const mr = container.getBoundingClientRect();
    _printImg = document.createElement('img');
    _printImg.src = _mapDataUrl;
    _printImg.className = 'story-map-print-img';
    _printImg.style.cssText = `width:${mr.width}px;height:${mr.height}px;`;
    container.parentNode.insertBefore(_printImg, container);
    container.style.visibility = 'hidden';
  }

  function _onAfterPrint() {
    if (_printImg) { _printImg.remove(); _printImg = null; }
    const container = document.getElementById('storyMap');
    if (container) container.style.visibility = '';
  }

  // ── Hilfsfunktionen ─────────────────────────────────────────────────────────

  function _getParents(p) {
    const famc = p.famc?.[0];
    if (!famc) return {};
    const fam = getFamily(famc.famId);
    if (!fam) return {};
    return {
      father: fam.husb ? getPerson(fam.husb) : null,
      mother: fam.wife ? getPerson(fam.wife) : null,
    };
  }

  // ── Bridge — exponiert Helfer für ui-story-person.js und ui-story-fam.js ────
  // Sub-Dateien ergänzen: renderStory, embedPhotos, storyAsHTML, famStoryAsHTML

  window._storyShared = {
    esc:          _esc,
    pronoun:      _pronoun,
    shortPlace:   _shortPlace,
    atPlace:      _atPlace,
    fmtDate:      _fmtDate,
    atDate:       _atDate,
    yearFromDate: _yearFromDate,
    occuPeriod:   _occuPeriod,
    stripQuotes:  _stripQuotes,
    partnerSpan:  _partnerSpan,
    childSentence:       _childSentence,
    mergeOccu:           _mergeOccuSentence,
    mergeGrad:           _mergeGradSentence,
    mergeEduc:           _mergeEducSentence,
    mergeResi:           _mergeResiSentence,
    mergeCareer:         _mergeCareerSentence,
    eventSentence:       _eventSentence,
    EV_TPL:              _EV_TPL,
    loadMediaSrc:        _loadMediaSrc,
    getParents:          _getParents,
    getMapDataUrl:       () => _mapDataUrl,
    // Populated by ui-story-person.js:
    renderStory:  null,
    embedPhotos:  null,
    storyAsHTML:  null,
    // Populated by ui-story-fam.js:
    famStoryAsHTML: null,
  };

})();
