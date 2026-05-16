(function () {
  'use strict';

  // ── State ───────────────────────────────────────────────────────────────────
  UIState._storyPid = null;

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

  function _shortPlace(pl) {
    if (!pl) return '';
    return pl.split(',')[0].trim();
  }

  function _atPlace(ev) {
    const pl = ev.place || ev.addr;
    return pl ? ' in ' + _esc(_shortPlace(pl)) : '';
  }

  function _atDate(ev) {
    return ev.date ? ' am ' + _esc(ev.date) : '';
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
    const label = (typeof EVENT_LABELS !== 'undefined' && EVENT_LABELS[ev.type]) ||
      ev.eventType || ev.type || 'Ereignis';
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
    const mapSvg = _buildLifeMapSVG(pid);
    if (mapSvg) html += `<section class="story-section story-map">${mapSvg}</section>`;
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
    const body = document.getElementById('storyBody')?.innerHTML || '';
    const name = _esc(getPerson(UIState._storyPid)?.name || 'Lebensgeschichte');
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
      const label = _shortPlace(ev.place) ||
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

  function _buildLifeMapSVG(pid) {
    const pts = _collectGeoPoints(pid);
    if (!pts.length) return '';

    const W = 360, H = 200, PAD = 0.14;

    const lats = pts.map(p => p.lati);
    const lngs = pts.map(p => p.long);
    let minLat = Math.min(...lats), maxLat = Math.max(...lats);
    let minLng = Math.min(...lngs), maxLng = Math.max(...lngs);

    // Mindest-Ausdehnung (verhindert Division durch Null bei einzelnem Punkt)
    const dlat = maxLat - minLat || 0.5;
    const dlng = maxLng - minLng || 0.5;
    minLat -= dlat * PAD; maxLat += dlat * PAD;
    minLng -= dlng * PAD; maxLng += dlng * PAD;

    const toX = lng => ((lng - minLng) / (maxLng - minLng)) * W;
    const toY = lat => H - ((lat - minLat) / (maxLat - minLat)) * H;

    const coords = pts.map(pt => ({
      x: +toX(pt.long).toFixed(1),
      y: +toY(pt.lati).toFixed(1),
      ...pt,
    }));

    // Graticule step: smallest that gives ≤6 lines per axis
    const _gStep = range => [0.25, 0.5, 1, 2, 5, 10, 20].find(s => range / s <= 6) || 20;
    const latStep = _gStep(maxLat - minLat);
    const lngStep = _gStep(maxLng - minLng);

    let svg = `<svg class="story-map-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Karte der Lebensstationen">`;
    svg += `<rect width="${W}" height="${H}" class="story-map-bg"/>`;

    // Lat lines (horizontal)
    const latStart = Math.ceil(minLat / latStep) * latStep;
    for (let lat = latStart; lat <= maxLat + 0.001; lat += latStep) {
      const y = toY(lat).toFixed(1);
      svg += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" class="story-map-grid"/>`;
      svg += `<text x="3" y="${Math.max(10, +y - 2)}" class="story-map-gridlabel">${lat.toFixed(lat % 1 ? 2 : 0)}°N</text>`;
    }
    // Lng lines (vertical)
    const lngStart = Math.ceil(minLng / lngStep) * lngStep;
    for (let lng = lngStart; lng <= maxLng + 0.001; lng += lngStep) {
      const x = toX(lng).toFixed(1);
      svg += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" class="story-map-grid"/>`;
      svg += `<text x="${+x + 2}" y="${H - 3}" class="story-map-gridlabel">${lng.toFixed(lng % 1 ? 2 : 0)}°E</text>`;
    }

    if (coords.length >= 2) {
      const points = coords.map(c => `${c.x},${c.y}`).join(' ');
      svg += `<polyline points="${points}" class="story-map-line"/>`;
    }

    for (const c of coords) {
      svg += `<circle cx="${c.x}" cy="${c.y}" r="5" class="story-map-dot story-map-dot--${c.type}"/>`;
    }

    // Label für Start- und Endpunkt
    const first = coords[0];
    const last  = coords[coords.length - 1];
    const _addLabel = (c, forceLeft) => {
      if (!c.label) return;
      const lbl = _esc(c.label.slice(0, 22));
      const right = !forceLeft && c.x < W - 90;
      const lx = right ? c.x + 8 : c.x - 8;
      const anchor = right ? '' : ' text-anchor="end"';
      svg += `<text x="${lx}" y="${c.y + 4}" class="story-map-label"${anchor}>${lbl}</text>`;
    };
    _addLabel(first, false);
    if (last !== first) _addLabel(last, last.x > W / 2);

    svg += '</svg>';
    return svg;
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
