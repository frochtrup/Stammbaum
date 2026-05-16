(function () {
  'use strict';

  // ── State ───────────────────────────────────────────────────────────────────
  UIState._storyPid = null;
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
    UIState._storyPid = pid;
    const p = getPerson(pid);
    document.getElementById('storyTopTitle').textContent = p.name || pid;
    document.getElementById('storyBody').innerHTML = _renderStory(pid);
    showView('v-story');
    _updateNavBtns();
    _embedPhotosAsync(pid);
    _initStoryMap(pid);
  };

  window.printStory = function () { window.print(); };

  window.downloadStory = function () {
    const html = _storyAsHTML();
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

  // ── Foto-Embedding (async) ──────────────────────────────────────────────────

  async function _embedPhotosAsync(pid) {
    const p = getPerson(pid);
    if (!p || UIState._storyPid !== pid) return;

    const media = p.media || [];
    const prim  = media.find(m => m.prim) || media[0];

    // 1. Hero-Bild
    if (prim?.file) {
      const src = await _loadMediaSrc(prim.file);
      if (UIState._storyPid !== pid) return;
      const el = document.getElementById('story-hero-img');
      if (el && src) { el.src = src; el.style.display = ''; }
    }

    // 2. Galerie — restliche Personen-Fotos (max. 5)
    const others = media.filter(m => m !== prim && m.file).slice(0, 5);
    if (others.length) {
      const gallery = document.getElementById('story-gallery');
      for (const m of others) {
        if (UIState._storyPid !== pid || !gallery) break;
        const src = await _loadMediaSrc(m.file);
        if (!src) continue;
        const img = document.createElement('img');
        img.src = src;
        img.className = 'story-gallery-img';
        img.alt = m.title || '';
        if (m.title) img.title = m.title;
        gallery.appendChild(img);
      }
    }

    // 3. Event-Fotos — befülle alle [data-ev-files]-Container
    const evDivs = document.querySelectorAll('#storyBody [data-ev-files]');
    for (const div of evDivs) {
      if (UIState._storyPid !== pid) break;
      const files = (div.dataset.evFiles || '').split('|').filter(Boolean);
      for (const f of files) {
        if (UIState._storyPid !== pid) break;
        const src = await _loadMediaSrc(f);
        if (!src) continue;
        const img = document.createElement('img');
        img.src = src;
        img.className = 'story-ev-img';
        div.appendChild(img);
      }
    }
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
      Er:   m ? 'Er'      : f ? 'Sie'     : _esc(n),
      er:   m ? 'er'      : f ? 'sie'     : _esc(n),
      Sein: m ? 'Sein'    : f ? 'Ihr'     : 'Sein',
      sein: m ? 'sein'    : f ? 'ihr'     : 'sein',
      Sohn: m ? 'Sohn'    : f ? 'Tochter' : 'Kind',
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

  function _fmtDate(d) {
    if (!d) return '';
    return d
      .replace(/^FROM\s+(.+?)\s+TO\s+(.+)$/i,  'von $1 bis $2')
      .replace(/^BET\s+(.+?)\s+AND\s+(.+)$/i,  'zwischen $1 und $2')
      .replace(/^BEF\s+/i,  'vor ')
      .replace(/^AFT\s+/i,  'nach ')
      .replace(/^ABT\s+/i,  'um ')
      .replace(/^CAL\s+/i,  'errechnet ')
      .replace(/^EST\s+/i,  'geschätzt ');
  }

  function _atDate(ev) {
    if (!ev.date) return '';
    const fmt = _fmtDate(ev.date);
    const hasQual = /^(von|zwischen|vor|nach|um|errechnet|geschätzt)\s/.test(fmt);
    return ' ' + (hasQual ? '' : 'am ') + _esc(fmt);
  }

  function _yearFromDate(d) {
    if (!d) return null;
    const m = d.match(/\b(\d{4})\b/);
    return m ? parseInt(m[1], 10) : null;
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
    const val = ev.value ? ': ' + _esc(ev.value) : '';
    return `${pr.Er} — ${_esc(label)}${val}${_atDate(ev)}${_atPlace(ev)}.`;
  }

  // ── Abschnitte ──────────────────────────────────────────────────────────────

  function _sectionHeader(p, pr) {
    const birth = p.birth?.date || p.chr?.date || '';
    const death = p.death?.date || '';
    const lifespan = (birth || death)
      ? `<p class="story-lifespan">${_esc(birth)}${birth && death ? ' – ' : ''}${_esc(death)}</p>`
      : '';
    const hero    = `<img id="story-hero-img" class="story-hero-img" alt="${_esc(p.name)}" style="display:none">`;
    const gallery = `<div id="story-gallery" class="story-gallery"></div>`;
    return `<header class="story-header">
${hero}
${gallery}
<h1 class="story-name">${_esc(p.name || p.id)}</h1>
${lifespan}
</header>`;
  }

  function _sectionEarlyLife(p, pr) {
    const sentences = [];

    const bDate  = p.birth?.date  ? ' am ' + _esc(p.birth.date)              : '';
    const bPlace = p.birth?.place ? ' in ' + _esc(_shortPlace(p.birth.place)) : '';
    if (p.birth?.seen || bDate || bPlace) {
      sentences.push(`${_esc(p.name || pr.Er)} wurde${bDate}${bPlace} geboren.`);
    }

    if (p.chr?.seen) {
      const cDate  = p.chr.date  ? ' am ' + _esc(p.chr.date)              : '';
      const cPlace = p.chr.place ? ' in ' + _esc(_shortPlace(p.chr.place)) : '';
      sentences.push(`${pr.Er} wurde${cDate}${cPlace} getauft.`);
    }

    const { father, mother } = _getParents(p);
    if (father || mother) {
      const fn = father ? _esc(father.name || father.id) : null;
      const mn = mother ? _esc(mother.name || mother.id) : null;
      const parents = fn && mn ? fn + ' und ' + mn : fn || mn;
      sentences.push(`${pr.Er} war das ${pr.Sohn} von ${parents}.`);
    }

    if (!sentences.length) return '';
    return `<section class="story-section">
<p>${sentences.join(' ')}</p>
</section>`;
  }

  function _sectionEvents(p, pr) {
    const skip = new Set(['MARR','ENGA','DIV','DIVF','BIRT','CHR','DEAT','BURI']);
    const evs  = (p.events || []).filter(ev => !skip.has(ev.type));
    if (!evs.length) return '';

    const sorted = [...evs].sort((a, b) => {
      const ya = _yearFromDate(a.date), yb = _yearFromDate(b.date);
      if (ya === null && yb === null) return 0;
      if (ya === null) return 1;
      if (yb === null) return -1;
      return ya - yb;
    });

    const items = sorted.map(ev => {
      const evMedia = (ev.media || []).filter(m => m.file);
      const imgDiv  = evMedia.length
        ? `<div class="story-ev-imgs" data-ev-files="${evMedia.map(m => _esc(m.file)).join('|')}"></div>`
        : '';
      return `<div class="story-ev-wrap"><p class="story-ev">${_eventSentence(ev, pr)}</p>${imgDiv}</div>`;
    }).join('\n');
    return `<section class="story-section story-events">${items}</section>`;
  }

  function _sectionFamilies(p, pr) {
    if (!p.fams?.length) return '';
    let html = '';
    for (const famId of p.fams) {
      const f = getFamily(famId);
      if (!f) continue;
      const partnerId = p.id === f.husb ? f.wife : f.husb;
      const partner   = partnerId ? getPerson(partnerId) : null;
      const sentences = [];

      if (f.marr?.seen || f.marr?.date || f.marr?.place) {
        const mDate  = f.marr.date  ? ' am ' + _esc(f.marr.date)               : '';
        const mPlace = f.marr.place ? ' in ' + _esc(_shortPlace(f.marr.place))  : '';
        const pName  = partner ? _esc(partner.name || partnerId) : 'unbekannt';
        sentences.push(`${_esc(p.name || pr.Er)} heiratete ${pName}${mDate}${mPlace}.`);
      } else if (partner) {
        sentences.push(`${_esc(p.name || pr.Er)} war mit ${_esc(partner.name || partnerId)} verheiratet.`);
      }

      const children = (f.children || []).map(cid => getPerson(cid)).filter(Boolean);
      if (children.length) {
        const names = children.map(c => _esc(c.name || c.id));
        if (names.length === 1) {
          sentences.push(`Aus dieser Ehe stammt ${names[0]}.`);
        } else {
          const last = names.pop();
          sentences.push(`Aus dieser Ehe stammen ${names.join(', ')} und ${last}.`);
        }
      }

      if (sentences.length) {
        html += `<section class="story-section story-family"><p>${sentences.join(' ')}</p></section>`;
      }
    }
    return html;
  }

  function _sectionDeath(p, pr) {
    const sentences = [];
    if (p.death?.seen || p.death?.date || p.death?.place) {
      const dDate  = p.death.date  ? ' am ' + _esc(p.death.date)               : '';
      const dPlace = p.death.place ? ' in ' + _esc(_shortPlace(p.death.place))  : '';
      const cause  = p.death.cause ? ' (' + _esc(p.death.cause) + ')'           : '';
      sentences.push(`${_esc(p.name || pr.Er)} verstarb${dDate}${dPlace}${cause}.`);
    }
    if (p.buri?.seen || p.buri?.place) {
      const bDate  = p.buri.date  ? ' am ' + _esc(p.buri.date)               : '';
      const bPlace = p.buri.place ? ' in ' + _esc(_shortPlace(p.buri.place))  : '';
      sentences.push(`${pr.Er} wurde${bDate}${bPlace} begraben.`);
    }
    if (!sentences.length) return '';
    return `<section class="story-section story-death"><p>${sentences.join(' ')}</p></section>`;
  }

  // ── Haupt-Renderer ──────────────────────────────────────────────────────────

  function _renderStory(pid) {
    const p = getPerson(pid);
    if (!p) return '<p>Person nicht gefunden.</p>';
    const pr = _pronoun(p);
    let html = '<article class="story-article">';
    html += _sectionHeader(p, pr);
    html += `<section class="story-section story-map"><div id="storyMap" class="story-map-container"></div></section>`;
    html += _sectionEarlyLife(p, pr);
    html += _sectionEvents(p, pr);
    html += _sectionFamilies(p, pr);
    html += _sectionDeath(p, pr);
    if (p.note) {
      html += `<section class="story-section story-note">
<h2 class="story-section-title">Notizen</h2>
<p>${_esc(p.note)}</p>
</section>`;
    }
    html += '</article>';
    return html;
  }

  // ── Export ──────────────────────────────────────────────────────────────────

  function _storyAsHTML() {
    const link = document.querySelector('link[href="styles.css"]')?.outerHTML || '';
    const name = _esc(getPerson(UIState._storyPid)?.name || 'Lebensgeschichte');
    // Karte: Leaflet-Div durch Snapshot-Bild ersetzen (Leaflet läuft nicht standalone)
    let body = document.getElementById('storyBody')?.innerHTML || '';
    if (_mapDataUrl) {
      body = body.replace(
        /<div id="storyMap"[^>]*><\/div>/,
        `<img src="${_mapDataUrl}" class="story-map-print-img" style="width:100%;border-radius:6px;border:1px solid #ccc;display:block;">`
      );
    } else {
      body = body.replace(/<section class="story-section story-map">[\s\S]*?<\/section>/, '');
    }
    return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lebensgeschichte: ${name}</title>
${link}
<style>body{padding:1rem 2rem;max-width:800px;margin:0 auto;font-family:Georgia,serif}</style>
</head>
<body>${body}</body>
</html>`;
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

    // Canvas-Snapshot nach vollständigem Tile-Load
    tileLayer.once('load', () => _captureMapSnapshot());
  }

  async function _captureMapSnapshot() {
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

    // Tiles: BoundingClientRect gibt bereits transformierte Position
    for (const tile of container.querySelectorAll('.leaflet-tile:not(.leaflet-tile-loading)')) {
      if (!tile.complete || !tile.naturalWidth) continue;
      const tr = tile.getBoundingClientRect();
      try { ctx.drawImage(tile, tr.left - mr.left, tr.top - mr.top, tr.width, tr.height); } catch (_) {}
    }

    // SVG-Overlay (Polyline + Marker)
    const svgEl = container.querySelector('svg.leaflet-zoom-animated');
    if (svgEl) {
      const sr = svgEl.getBoundingClientRect();
      const svgStr = new XMLSerializer().serializeToString(svgEl);
      const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const img  = new Image();
      await new Promise(res => { img.onload = res; img.onerror = res; img.src = url; });
      ctx.drawImage(img, sr.left - mr.left, sr.top - mr.top, sr.width, sr.height);
      URL.revokeObjectURL(url);
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

})();
