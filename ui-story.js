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

    // 4. Hochzeitsbilder — befülle alle [data-marr-files]-Container
    const marrDivs = document.querySelectorAll('#storyBody [data-marr-files]');
    for (const div of marrDivs) {
      if (UIState._storyPid !== pid) break;
      const files = (div.dataset.marrFiles || '').split('|').filter(Boolean);
      for (const f of files) {
        if (UIState._storyPid !== pid) break;
        const src = await _loadMediaSrc(f);
        if (!src) continue;
        const img = document.createElement('img');
        img.src = src;
        img.className = 'story-ev-img story-marr-img';
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
    return s ? s.replace(/^["'“„‘‚]|["'”’‛]$/g, '').trim() : '';
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

  // ── Abschnitte ──────────────────────────────────────────────────────────────

  function _sectionHeader(p, pr) {
    const birth = p.birth?.date || p.chr?.date || '';
    const death = p.death?.date || '';
    const fmtB  = birth ? _fmtDate(birth) : '';
    const fmtD  = death ? _fmtDate(death) : '';
    const lifespan = (fmtB || fmtD)
      ? `<p class="story-lifespan">${_esc(fmtB)}${fmtB && fmtD ? ' – ' : ''}${_esc(fmtD)}</p>`
      : '';
    return `<header class="story-header">
<div class="story-media-row">
  <img id="story-hero-img" class="story-hero-img" alt="${_esc(p.name)}" style="display:none">
  <div id="story-gallery" class="story-gallery"></div>
</div>
<h1 class="story-name">${_esc(p.name || p.id)}</h1>
${lifespan}
</header>`;
  }

  function _sectionEarlyLife(p, pr) {
    const sentences = [];

    const bRaw   = p.birth?.date || '';
    const bPlace = p.birth?.place ? ' in ' + _esc(_shortPlace(p.birth.place)) : '';
    if (p.birth?.seen || bRaw || bPlace) {
      const yearOnly = /^\d{4}$/.test(bRaw.trim());
      if (yearOnly) {
        const yr = bRaw.trim();
        sentences.push(`${_esc(p.name || pr.Er)} kam ${yr}${bPlace} zur Welt.`);
      } else {
        const bDate = _atDate({ date: bRaw });
        sentences.push(`${_esc(p.name || pr.Er)} wurde${bDate}${bPlace} geboren.`);
      }
    }

    if (p.chr?.seen) {
      const cDate  = _atDate({ date: p.chr?.date });
      const cPlace = p.chr.place ? ' in ' + _esc(_shortPlace(p.chr.place)) : '';
      sentences.push(`${pr.Er} wurde${cDate}${cPlace} getauft.`);
    }

    const { father, mother } = _getParents(p);
    if (father || mother) {
      const fn = father ? _esc(father.name || father.id) : null;
      const mn = mother ? _esc(mother.name || mother.id) : null;
      const parents = fn && mn ? fn + ' und ' + mn : fn || mn;
      sentences.push(`${pr.Er} war ${pr.SohnArt} ${pr.Sohn} von ${parents}.`);
    }

    // Geschwister-Kontext
    const fam0 = p.famc?.[0] ? getFamily(p.famc[0].famId) : null;
    if (fam0) {
      const sibCount = (fam0.children || []).filter(cid => cid !== p.id).length;
      if (sibCount === 0 && (father || mother)) {
        sentences.push(`${pr.Er} war Einzelkind.`);
      } else if (sibCount > 0) {
        sentences.push(`${pr.Er} hatte ${sibCount} Geschwister.`);
      }
    }

    if (!sentences.length) return '';
    return `<section class="story-section">
<p>${sentences.join(' ')}</p>
</section>`;
  }

  function _sectionEvents(p, pr) {
    // RELI und spezielle Typen werden separat behandelt
    const skip = new Set(['MARR','ENGA','DIV','DIVF','BIRT','CHR','DEAT','BURI','RELI']);
    const allEvs = (p.events || []).filter(ev => !skip.has(ev.type));

    const byType = t => allEvs.filter(ev => ev.type === t)
      .sort((a, b) => (_yearFromDate(a.date) ?? Infinity) - (_yearFromDate(b.date) ?? Infinity));

    const occus = byType('OCCU');
    const grads = byType('GRAD');
    const educs = byType('EDUC');
    const resis = byType('RESI');
    const merged = new Set(['OCCU','GRAD','EDUC','RESI']);
    const evs   = allEvs.filter(ev => !merged.has(ev.type));

    // FROM-TO-Ereignisse mit Wert → Verbindungsformulierungen (berufliche Stationen)
    const isCareer = ev => ev.value && ev.date && /^FROM\s+/i.test(ev.date);
    const careers  = evs.filter(isCareer)
      .sort((a, b) => (_yearFromDate(a.date) ?? Infinity) - (_yearFromDate(b.date) ?? Infinity));
    const otherEvs = evs.filter(ev => !isCareer(ev));

    const parts = [];

    // Reihenfolge: Bildung → Beruf → Wohnorte → Abschlüsse → Rest
    const educSent = _mergeEducSentence(educs, pr);
    if (educSent) parts.push(`<div class="story-ev-wrap"><p class="story-ev">${educSent}</p></div>`);

    const occuSent = _mergeOccuSentence(occus, pr);
    if (occuSent) parts.push(`<div class="story-ev-wrap"><p class="story-ev">${occuSent}</p></div>`);

    const careerSent = _mergeCareerSentence(careers, pr);
    if (careerSent) parts.push(`<div class="story-ev-wrap"><p class="story-ev">${careerSent}</p></div>`);

    const resiSent = _mergeResiSentence(resis, pr);
    if (resiSent) parts.push(`<div class="story-ev-wrap"><p class="story-ev">${resiSent}</p></div>`);

    const gradSent = _mergeGradSentence(grads, pr);
    if (gradSent) parts.push(`<div class="story-ev-wrap"><p class="story-ev">${gradSent}</p></div>`);

    if (!otherEvs.length && !parts.length) return '';

    const sorted = [...otherEvs].sort((a, b) => {
      const ya = _yearFromDate(a.date), yb = _yearFromDate(b.date);
      if (ya === null && yb === null) return 0;
      if (ya === null) return 1;
      if (yb === null) return -1;
      return ya - yb;
    });

    sorted.forEach(ev => {
      const evMedia = (ev.media || []).filter(m => m.file);
      const imgDiv  = evMedia.length
        ? `<div class="story-ev-imgs" data-ev-files="${evMedia.map(m => _esc(m.file)).join('|')}"></div>`
        : '';
      parts.push(`<div class="story-ev-wrap"><p class="story-ev">${_eventSentence(ev, pr)}</p>${imgDiv}</div>`);
    });

    return parts.length
      ? `<section class="story-section story-events"><h2 class="story-section-title">Lebenslauf</h2>${parts.join('\n')}</section>`
      : '';
  }

  function _sectionFamilies(p, pr) {
    if (!p.fams?.length) return '';
    let html = '';
    const sortedFams = [...p.fams].sort((a, b) => {
      const ya = _yearFromDate(getFamily(a)?.marr?.date) ?? Infinity;
      const yb = _yearFromDate(getFamily(b)?.marr?.date) ?? Infinity;
      return ya - yb;
    });
    for (const famId of sortedFams) {
      const f = getFamily(famId);
      if (!f) continue;
      const partnerId = p.id === f.husb ? f.wife : f.husb;
      const partner   = partnerId ? getPerson(partnerId) : null;
      const sentences = [];

      if (f.marr?.seen || f.marr?.date || f.marr?.place) {
        const mDate  = _atDate({ date: f.marr.date });
        const mPlace = f.marr.place ? ' in ' + _esc(_shortPlace(f.marr.place))  : '';
        const pName  = partner
          ? _esc(partner.name || partnerId) + _partnerSpan(partner)
          : 'unbekannt';
        sentences.push(`${_esc(p.name || pr.Er)} heiratete ${pName}${mDate}${mPlace}.`);
      } else if (partner) {
        const pName = _esc(partner.name || partnerId) + _partnerSpan(partner);
        sentences.push(`${_esc(p.name || pr.Er)} war mit ${pName} verheiratet.`);
      }

      const children = (f.children || []).map(cid => getPerson(cid)).filter(Boolean);
      if (children.length) {
        const childStr = _childSentence(children);
        if (childStr) sentences.push(childStr);
      }

      if (sentences.length) {
        const marrMedia = (f.marr?.media || []).filter(m => m.file);
        const marrFiles = marrMedia.map(m => m.file).join('|');
        const marrImgs  = marrFiles
          ? `<div class="story-ev-imgs" data-marr-files="${_esc(marrFiles)}"></div>`
          : '';
        const famTitle = html === '' ? '<h2 class="story-section-title">Familie</h2>' : '';
        html += `<section class="story-section story-family">${famTitle}<p>${sentences.join(' ')}</p>${marrImgs}</section>`;
      }
    }
    return html;
  }

  function _sectionDeath(p, pr) {
    const sentences = [];
    if (p.death?.seen || p.death?.date || p.death?.place) {
      const dDate  = _atDate({ date: p.death.date });
      const dPlace = p.death.place ? ' in ' + _esc(_shortPlace(p.death.place))  : '';
      const causeFull = p.death.cause
        ? (p.death.cause.length > 30 ? ' (' + _esc(p.death.cause) + ')' : ' an ' + _esc(p.death.cause))
        : '';
      sentences.push(`${_esc(p.name || pr.Er)} verstarb${dDate}${dPlace}${causeFull}.`);
    }
    if (p.buri?.seen || p.buri?.place) {
      const bDate  = _atDate({ date: p.buri.date });
      const bPlace = p.buri.place ? ' in ' + _esc(_shortPlace(p.buri.place))  : '';
      sentences.push(`${pr.Er} wurde${bDate}${bPlace} begraben.`);
    }
    if (!sentences.length) return '';
    return `<section class="story-section story-death"><p>${sentences.join(' ')}</p></section>`;
  }

  // ── Epochen-Kontext ─────────────────────────────────────────────────────────

  function _sectionEpoch(p, pr) {
    if (typeof _STORY_EPOCHS === 'undefined' || !_STORY_EPOCHS.length) return '';
    const by = _yearFromDate(p.birth?.date || p.chr?.date);
    const dy = _yearFromDate(p.death?.date) || (by ? by + 80 : null);
    if (!by && !dy) return '';
    const lifeStart = by  || 0;
    const lifeEnd   = dy  || 9999;
    const matches   = _STORY_EPOCHS.filter(e => e.from <= lifeEnd && e.to >= lifeStart);
    if (!matches.length) return '';

    const eLabel = e => `${_esc(e.gen)} (${e.from === e.to ? e.from : e.from + '–' + e.to})`;
    const top = matches.slice(0, 3);
    let sentence;
    if (top.length === 1) {
      sentence = `${pr.Er} lebte in der Zeit ${eLabel(top[0])}.`;
    } else {
      const last = top[top.length - 1];
      const rest = top.slice(0, -1);
      sentence = `${pr.Er} lebte in der Zeit ${rest.map(eLabel).join(', ')} und ${eLabel(last)}.`;
    }
    // Kontext-Satz: Epoche mit größtem Lebens-Überlapp aus den angezeigten (top)
    const ctxEpoch = top.reduce((best, e) => {
      if (!e.ctx) return best;
      const overlap = Math.min(lifeEnd, e.to) - Math.max(lifeStart, e.from);
      if (!best) return e;
      const bestOverlap = Math.min(lifeEnd, best.to) - Math.max(lifeStart, best.from);
      return overlap > bestOverlap ? e : best;
    }, null);
    if (ctxEpoch?.ctx) sentence += ' ' + _esc(ctxEpoch.ctx);
    return `<section class="story-section story-epoch">
<p class="story-epoch-ctx">${sentence}</p>
</section>`;
  }

  // ── Konfession — kurze Schlusszeile ─────────────────────────────────────────

  function _sectionReli(p, pr) {
    const reli = (p.events || []).find(ev => ev.type === 'RELI' && ev.value);
    if (!reli) return '';
    const val = reli.value.trim();
    const period = _atDate(reli);
    const dot = val.endsWith('.') ? '' : '.';
    return `<section class="story-section story-reli">
<p class="story-reli-note">${pr.Er} war ${_esc(val)}${period}${dot}</p>
</section>`;
  }

  // ── Mini-Sanduhr-Diagram (inline SVG, datenbasiert) ─────────────────────────

  function _sectionDiagram(p) {
    const CW = 100, CH = 38;        // Normalkarte
    const PW = 120, PH = 46;        // Proband-Karte
    const HG = 10,  VG = 42;        // H-/V-Abstand
    const M  = 16,  BIGAP = 22;     // Randabstand, Lücke paternal/maternal

    // Daten sammeln
    const famc   = p.famc?.[0] ? getFamily(p.famc[0].famId) : null;
    const father = famc?.husb ? getPerson(famc.husb) : null;
    const mother = famc?.wife ? getPerson(famc.wife) : null;

    const famF  = father?.famc?.[0] ? getFamily(father.famc[0].famId) : null;
    const famM  = mother?.famc?.[0] ? getFamily(mother.famc[0].famId) : null;
    const patGF = famF?.husb ? getPerson(famF.husb) : null;
    const patGM = famF?.wife ? getPerson(famF.wife) : null;
    const matGF = famM?.husb ? getPerson(famM.husb) : null;
    const matGM = famM?.wife ? getPerson(famM.wife) : null;

    const hasGP      = !!(patGF || patGM || matGF || matGM);
    const hasParents = !!(father || mother);

    const allChildren = [];
    for (const famId of (p.fams || [])) {
      const f = getFamily(famId);
      if (f?.children) {
        for (const cid of f.children) {
          const c = getPerson(cid);
          if (c) allChildren.push(c);
        }
      }
    }
    allChildren.sort((a, b) =>
      (_yearFromDate(a.birth?.date || a.chr?.date) ?? Infinity) -
      (_yearFromDate(b.birth?.date || b.chr?.date) ?? Infinity));
    const hasChildren = allChildren.length > 0;

    if (!hasParents && !hasChildren) return '';

    const firstFam  = p.fams?.length ? getFamily(p.fams[0]) : null;
    const partnerId = firstFam ? (p.id === firstFam.husb ? firstFam.wife : firstFam.husb) : null;
    const partner   = partnerId ? getPerson(partnerId) : null;

    // ── Layout ────────────────────────────────────────────────────────────────
    const svgW = M + 3 * (CW + HG) + CW + BIGAP + M; // 484 px

    const gpL  = [M, M+CW+HG, M+2*(CW+HG)+BIGAP, M+3*(CW+HG)+BIGAP];
    const gpCx = gpL.map(l => l + CW / 2);
    const fCx  = (gpCx[0] + gpCx[1]) / 2;  // 121
    const mCx  = (gpCx[2] + gpCx[3]) / 2;  // 353
    const pCx  = hasParents ? (fCx + mCx) / 2 : svgW / 2;
    const PG   = 28;             // Proband ↔ Partner Abstand
    const pL   = pCx - PW / 2;
    const partL = pL + PW + PG;

    let svgH = M;
    const gpY  = hasGP      ? svgH : -1; if (hasGP)      svgH += CH + VG;
    const parY = hasParents  ? svgH : -1; if (hasParents)  svgH += CH + VG;
    const pY   = svgH; svgH += PH + VG;
    const cY   = hasChildren ? svgH : -1; if (hasChildren) svgH += CH;
    svgH += M;

    // ── SVG-Helfer ────────────────────────────────────────────────────────────
    const BRD = 'var(--border,#d8ceb8)';
    const GLD = 'var(--gold,#c8b97a)';
    const FILL= 'var(--surface2,#f2ede0)';
    const TXT = 'var(--text,#2c2a26)';
    const DIM = 'var(--text2,#888)';

    function vln(x, y1, y2, col) {
      return `<line x1="${+x.toFixed(1)}" y1="${y1}" x2="${+x.toFixed(1)}" y2="${y2}" stroke="${col}" stroke-width="1.5"/>`;
    }
    function hln(x1, y, x2, col, dash) {
      return `<line x1="${+x1.toFixed(1)}" y1="${y}" x2="${+x2.toFixed(1)}" y2="${y}" stroke="${col}" stroke-width="1.5"${dash ? ' stroke-dasharray="4,3"' : ''}/>`;
    }

    function mkCard(x, y, w, h, person, isProband) {
      if (!person) return '';
      const id  = person.id;
      const sex = person.sex || 'U';
      const sc  = sex === 'M' ? 'var(--male-col,#5b8fd4)' : sex === 'F' ? 'var(--female-col,#c47a9f)' : BRD;
      const stroke = isProband ? GLD : sc;
      const sw     = isProband ? 2.5 : 1.5;
      const cx     = +(x + w / 2).toFixed(1);

      const given  = (person.given || (person.name||'').split(',')[1]?.trim() || '').trim();
      const sur    = (person.surname || (person.name||'').split(',')[0]?.trim() || '').trim();
      const by     = _yearFromDate(person.birth?.date || person.chr?.date);
      const dy     = _yearFromDate(person.death?.date);
      const yrs    = by && dy ? `*${by} †${dy}` : by ? `*${by}` : dy ? `†${dy}` : '';

      let txt = [];
      if (isProband) {
        const g = _esc((given || sur).substring(0, 15));
        const s = given ? _esc(sur.substring(0, 15)) : '';
        if (g) txt.push(`<text x="${cx}" y="${+(y+h*.28).toFixed(1)}" font-size="11" font-weight="bold" fill="${TXT}" text-anchor="middle" dominant-baseline="middle">${g}</text>`);
        if (s) txt.push(`<text x="${cx}" y="${+(y+h*.52).toFixed(1)}" font-size="10" fill="${TXT}" text-anchor="middle" dominant-baseline="middle">${s}</text>`);
        if (yrs) txt.push(`<text x="${cx}" y="${+(y+h*.78).toFixed(1)}" font-size="9" fill="${DIM}" text-anchor="middle" dominant-baseline="middle">${_esc(yrs)}</text>`);
      } else {
        const nm = _esc((given || sur).substring(0, 13));
        if (nm)  txt.push(`<text x="${cx}" y="${+(y+h*(yrs?.35:.5)).toFixed(1)}" font-size="10" font-weight="600" fill="${TXT}" text-anchor="middle" dominant-baseline="middle">${nm}</text>`);
        if (yrs) txt.push(`<text x="${cx}" y="${+(y+h*.72).toFixed(1)}" font-size="9" fill="${DIM}" text-anchor="middle" dominant-baseline="middle">${_esc(yrs)}</text>`);
      }

      const onClick = id ? ` onclick="if(typeof showDetail==='function')showDetail('${_esc(id)}')"` : '';
      return `<g style="cursor:${id?'pointer':'default'}"${onClick}><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${FILL}" stroke="${stroke}" stroke-width="${sw}"/>${txt.join('')}</g>`;
    }

    // ── Elemente aufbauen (lines z=0, cards z=1) ───────────────────────────
    const elems = [];

    // Großeltern
    if (hasGP) {
      [[patGF,0],[patGM,1],[matGF,2],[matGM,3]].forEach(([gp,i]) => {
        if (gp) elems.push([1, mkCard(gpL[i], gpY, CW, CH, gp, false)]);
      });
      if (hasParents) {
        const jY = gpY + CH + Math.round(VG / 3);
        if (father && (patGF || patGM)) {
          if (patGF && patGM) elems.push([0, hln(gpCx[0], jY, gpCx[1], BRD)]);
          if (patGF) elems.push([0, vln(gpCx[0], gpY+CH, jY, BRD)]);
          if (patGM) elems.push([0, vln(gpCx[1], gpY+CH, jY, BRD)]);
          elems.push([0, vln(fCx, jY, parY, BRD)]);
        }
        if (mother && (matGF || matGM)) {
          if (matGF && matGM) elems.push([0, hln(gpCx[2], jY, gpCx[3], BRD)]);
          if (matGF) elems.push([0, vln(gpCx[2], gpY+CH, jY, BRD)]);
          if (matGM) elems.push([0, vln(gpCx[3], gpY+CH, jY, BRD)]);
          elems.push([0, vln(mCx, jY, parY, BRD)]);
        }
      }
    }

    // Eltern
    if (hasParents) {
      if (father) elems.push([1, mkCard(fCx-CW/2, parY, CW, CH, father, false)]);
      if (mother) elems.push([1, mkCard(mCx-CW/2, parY, CW, CH, mother, false)]);
      const jY2 = parY + CH + Math.round(VG / 2);
      const lCx = father ? fCx : mCx, rCx = mother ? mCx : fCx;
      if (father && mother) elems.push([0, hln(lCx, jY2, rCx, GLD)]);
      if (father) elems.push([0, vln(fCx, parY+CH, jY2, GLD)]);
      if (mother) elems.push([0, vln(mCx, parY+CH, jY2, GLD)]);
      elems.push([0, vln(pCx, jY2, pY, GLD)]);
    }

    // Proband
    elems.push([1, mkCard(pL, pY, PW, PH, p, true)]);

    // Partner
    if (partner) {
      elems.push([0, hln(pL+PW, pY+PH/2, partL, GLD, true)]);
      const mpX = +(pL + PW + PG/2).toFixed(1);
      elems.push([0, `<text x="${mpX}" y="${+(pY+PH/2+0.5).toFixed(1)}" font-size="11" font-weight="bold" fill="${GLD}" text-anchor="middle" dominant-baseline="middle">⚭</text>`]);
      elems.push([1, mkCard(partL, pY, CW, PH, partner, false)]);
    }

    // Kinder
    if (hasChildren) {
      const MAX_C  = 4;
      const shown  = allChildren.slice(0, MAX_C);
      const hasMore = allChildren.length > MAX_C;
      const slots  = shown.length + (hasMore ? 1 : 0);
      const rowW   = slots * CW + (slots - 1) * HG;
      const cStart = Math.min(Math.max(M, pCx - rowW / 2), svgW - M - rowW);
      const jY3    = pY + PH + Math.round(VG / 3);
      const cCxArr = shown.map((_, i) => cStart + i*(CW+HG) + CW/2);
      if (hasMore) cCxArr.push(cStart + shown.length*(CW+HG) + CW/2);

      elems.push([0, vln(pCx, pY+PH, jY3, BRD)]);
      elems.push([0, hln(Math.min(pCx,cCxArr[0]), jY3, Math.max(pCx,cCxArr.at(-1)), BRD)]);
      shown.forEach((child, i) => {
        const cx2 = cStart + i*(CW+HG);
        elems.push([0, vln(cx2+CW/2, jY3, cY, BRD)]);
        elems.push([1, mkCard(cx2, cY, CW, CH, child, false)]);
      });
      if (hasMore) {
        const mX = cStart + shown.length*(CW+HG), mCxN = mX+CW/2;
        elems.push([0, vln(mCxN, jY3, cY, BRD)]);
        elems.push([0, `<rect x="${mX}" y="${cY}" width="${CW}" height="${CH}" rx="5" fill="${FILL}" stroke="${BRD}" stroke-dasharray="4,3"/>`]);
        elems.push([0, `<text x="${+mCxN.toFixed(1)}" y="${+(cY+CH/2).toFixed(1)}" font-size="12" fill="${DIM}" text-anchor="middle" dominant-baseline="middle">+${allChildren.length-MAX_C}</text>`]);
      }
    }

    elems.sort((a, b) => a[0] - b[0]);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" style="font-family:system-ui,sans-serif">\n${elems.map(e => '  '+e[1]).join('\n')}\n</svg>`;

    return `<section class="story-section story-diagram"><div class="story-diagram-wrap">${svg}</div></section>`;
  }

  // ── Haupt-Renderer ──────────────────────────────────────────────────────────

  function _renderStory(pid) {
    const p = getPerson(pid);
    if (!p) return '<p>Person nicht gefunden.</p>';
    const pr = _pronoun(p);
    let html = '<article class="story-article">';
    html += _sectionHeader(p, pr);
    html += `<section class="story-section story-map"><div id="storyMap" class="story-map-container"></div></section>`;
    html += _sectionDiagram(p);
    html += _sectionEarlyLife(p, pr);
    html += _sectionEpoch(p, pr);
    html += _sectionEvents(p, pr);
    html += _sectionFamilies(p, pr);
    html += _sectionReli(p, pr);
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
    const name = _esc(getPerson(UIState._storyPid)?.name || 'Lebensgeschichte');
    let body = document.getElementById('storyBody')?.innerHTML || '';

    // Hero-Img: display:none entfernen wenn src gesetzt, sonst Element entfernen
    body = body.replace(/<img id="story-hero-img"([^>]*)>/g, (match, attrs) => {
      if (/\bsrc="[^"]{4,}/.test(attrs))
        return `<img id="story-hero-img"${attrs.replace(/\s*style="[^"]*"/, '')}>`;
      return '';
    });

    // Gesamten Karten-Section ersetzen (Leaflet-Div ist nach Init nicht mehr leer)
    if (_mapDataUrl) {
      body = body.replace(
        /<section[^>]*story-map[^>]*>[\s\S]*?<\/section>/,
        `<section class="story-section story-map"><img src="${_mapDataUrl}" style="width:100%;max-height:280px;border-radius:6px;border:1px solid #ccc;display:block;object-fit:cover;"></section>`
      );
    } else {
      body = body.replace(/<section[^>]*story-map[^>]*>[\s\S]*?<\/section>/, '');
    }

    // Styles inline — styles.css ist im Download-Kontext (anderer Ordner) nicht verfügbar
    const css = `
*{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{padding:2rem 2rem 4rem;max-width:740px;margin:0 auto;font-family:Georgia,serif;font-size:1rem;line-height:1.78;background:#faf8f3;color:#2c2a26}
.story-header{text-align:center;padding-bottom:1.6rem;margin-bottom:1.8rem;position:relative}
.story-header::after{content:'';display:block;width:2.5rem;height:2px;background:#c8b97a;margin:1.1rem auto 0;border-radius:1px}
.story-name{font-size:1.9rem;font-weight:600;letter-spacing:-.015em;margin:0 0 .35rem;line-height:1.2}
.story-lifespan{color:#777;font-size:.8rem;letter-spacing:.07em;text-transform:uppercase;margin:0}
.story-media-row{display:flex;gap:.75rem;align-items:flex-start;margin-bottom:1rem;justify-content:center}
.story-hero-img{flex-shrink:0;max-width:55%;max-height:240px;object-fit:cover;border-radius:8px;box-shadow:0 2px 14px rgba(0,0,0,.18)}
.story-gallery{display:flex;flex-wrap:wrap;gap:.45rem;align-content:flex-start;flex:1}
.story-gallery-img{width:84px;height:84px;object-fit:cover;border-radius:6px;border:1px solid #ddd;box-shadow:0 1px 5px rgba(0,0,0,.1)}
.story-section{margin-bottom:1.4rem}
.story-section p{margin:0}
.story-section-title{font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#666;margin:0 0 .55rem;font-family:system-ui,sans-serif}
.story-epoch{border-left:3px solid #c8b97a;padding:.6rem 1rem;background:#f2ede0;border-radius:0 6px 6px 0}
.story-epoch-ctx{color:#6b5c2a;font-style:italic;font-size:.91rem;line-height:1.65;margin:0}
.story-ev-wrap{position:relative;padding-left:1.15rem;margin:.45rem 0}
.story-ev-wrap::before{content:'◆';position:absolute;left:0;top:.38em;color:#c8b97a;font-size:.42rem;line-height:1;opacity:.85}
.story-ev{margin:0}
.story-ev-imgs{display:flex;gap:.3rem;flex-wrap:wrap;margin:.35rem 0 .1rem}
.story-ev-img{width:72px;height:72px;object-fit:cover;border-radius:5px;border:1px solid #ddd}
.story-family{background:#f2ede0;border-radius:8px;padding:.9rem 1.1rem;border-left:3px solid #c8b97a;margin-bottom:.75rem}
.story-death{border-left:3px solid #aaa;padding-left:.9rem;font-style:italic;color:#555}
.story-reli{text-align:center;margin-top:2rem;padding-top:1rem;border-top:1px solid #e8e0d0}
.story-reli-note{color:#888;font-size:.82rem;margin:0}
.story-note{background:#f2ede0;border-radius:6px;padding:.75rem 1rem}
.story-diagram{margin-bottom:1.6rem}
.story-diagram-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:6px}
.story-diagram-wrap svg{width:100%;height:auto;display:block;min-width:320px}
@media print{
  @page{margin:2.5cm 2cm;size:A4}
  body{max-width:none;padding:0;background:#faf8f3}
  .story-map img{max-height:200px;width:100%;object-fit:cover}
  .story-diagram-wrap svg{max-height:180px}
  .story-family,.story-epoch,.story-death,.story-note,.story-reli{page-break-inside:avoid}
  .story-header,.story-section-title{page-break-after:avoid}
  .story-hero-img,.story-gallery-img,.story-ev-img{box-shadow:none}
}`;

    return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lebensgeschichte: ${name}</title>
<style>${css}</style>
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

})();
