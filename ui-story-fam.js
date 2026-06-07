// Familien-Story-Abschnitte — geladen nach ui-story.js, nutzt window._storyShared
(function () {
  'use strict';

  const _sh = window._storyShared;
  const _esc               = _sh.esc;
  const _pronoun           = _sh.pronoun;
  const _shortPlace        = _sh.shortPlace;
  const _atPlace           = _sh.atPlace;
  const _fmtDate           = _sh.fmtDate;
  const _atDate            = _sh.atDate;
  const _yearFromDate      = _sh.yearFromDate;
  const _mergeOccuSentence = _sh.mergeOccu;
  const _loadMediaSrc      = _sh.loadMediaSrc;

  // ── Foto-Embedding (async, Familien-Story) ──────────────────────────────────

  async function _embedFamPhotosAsync(famId) {
    const f = AppState.db?.families?.[famId];
    if (!f || UIState._storyFamId !== famId) return;
    const husb = f.husb ? getPerson(f.husb) : null;
    const wife = f.wife ? getPerson(f.wife) : null;
    for (const [p, elId] of [[husb, 'story-fam-hero-husb'], [wife, 'story-fam-hero-wife']]) {
      if (!p) continue;
      if (UIState._storyFamId !== famId) return;
      const media = p.media || [];
      const prim  = media.find(m => m.prim) || media[0];
      if (!prim?.file) continue;
      const src = await _loadMediaSrc(prim.file);
      if (UIState._storyFamId !== famId) return;
      const el = document.getElementById(elId);
      if (el && src) { el.src = src; el.classList.remove('hidden'); }
    }
    const marrDivs = document.querySelectorAll('#storyBody [data-marr-files]');
    for (const div of marrDivs) {
      if (UIState._storyFamId !== famId) break;
      const files = (div.dataset.marrFiles || '').split('|').filter(Boolean);
      for (const mf of files) {
        if (UIState._storyFamId !== famId) break;
        const src = await _loadMediaSrc(mf);
        if (!src) continue;
        const img = document.createElement('img');
        img.src = src; img.className = 'story-ev-img story-marr-img';
        div.appendChild(img);
      }
    }
  }

  // ── Abschnitte ──────────────────────────────────────────────────────────────

  function _famSectionHeader(f, husb, wife) {
    const n1 = husb ? _esc(husb.name || husb.id) : '–';
    const n2 = wife ? _esc(wife.name || wife.id) : '–';
    const allYears = [];
    for (const p of [husb, wife].filter(Boolean)) {
      const by = _yearFromDate(p.birth?.date || p.chr?.date);
      const dy = _yearFromDate(p.death?.date);
      if (by) allYears.push(by);
      if (dy) allYears.push(dy);
    }
    for (const cid of (f.children || [])) {
      const c = getPerson(cid);
      if (!c) continue;
      const by = _yearFromDate(c.birth?.date || c.chr?.date);
      const dy = _yearFromDate(c.death?.date);
      if (by) allYears.push(by);
      if (dy) allYears.push(dy);
    }
    const minY    = allYears.length ? Math.min(...allYears) : null;
    const maxY    = allYears.length ? Math.max(...allYears) : null;
    const spanStr = (minY && maxY && minY !== maxY) ? `(${minY}–${maxY})` : (minY ? `(${minY})` : '');
    const lifespan = spanStr ? `<p class="story-lifespan">${spanStr}</p>` : '';
    let marrSub = '';
    if (f.marr?.date || f.marr?.place) {
      const parts = [_fmtDate(f.marr.date), _shortPlace(f.marr.place)].filter(Boolean).join(', ');
      if (parts) marrSub = `<p class="story-fam-marr-sub">⚭ ${_esc(parts)}</p>`;
    }
    return `<header class="story-header">
<div class="story-media-row">
  <img id="story-fam-hero-husb" class="story-hero-img hidden" alt="${n1}">
  <img id="story-fam-hero-wife" class="story-hero-img hidden" alt="${n2}">
</div>
<h1 class="story-name">Familie ${n1} &amp; ${n2}</h1>
${marrSub}${lifespan}
</header>`;
  }

  function _famSectionMarriage(f, husb, wife) {
    const sentences = [];
    const hName = husb ? _esc(husb.name || husb.id) : null;
    const wName = wife ? _esc(wife.name || wife.id) : null;
    const both  = hName && wName;
    if (f.engag?.seen || f.engag?.date || f.engag?.place) {
      const eDate  = _atDate({ date: f.engag.date });
      const ePlace = f.engag.place ? ' in ' + _esc(_shortPlace(f.engag.place)) : '';
      sentences.push(both
        ? `${hName} und ${wName} verlobten sich${eDate}${ePlace}.`
        : `Verlobung${eDate}${ePlace}.`);
    }
    if (f.marr?.seen || f.marr?.date || f.marr?.place) {
      const mDate  = _atDate({ date: f.marr.date });
      const mPlace = f.marr.place ? ' in ' + _esc(_shortPlace(f.marr.place)) : '';
      if (sentences.length) {
        sentences.push(`Sie heirateten${mDate}${mPlace}.`);
      } else {
        sentences.push(both
          ? `${hName} und ${wName} heirateten${mDate}${mPlace}.`
          : `Heirat${mDate}${mPlace}.`);
      }
    } else if (both) {
      sentences.push(`${hName} und ${wName} bildeten eine Familie.`);
    }
    if (f.div?.seen || f.div?.date) {
      sentences.push(`Die Ehe wurde${_atDate({ date: f.div.date })} geschieden.`);
    }
    const marrMedia = (f.marr?.media || []).filter(m => m.file);
    const marrImgs  = marrMedia.length
      ? `<div class="story-ev-imgs" data-marr-files="${_esc(marrMedia.map(m => m.file).join('|'))}"></div>`
      : '';
    if (!sentences.length && !marrImgs) return '';
    return `<section class="story-section story-family">
<h2 class="story-section-title">Heirat</h2>
<p>${sentences.join(' ')}</p>${marrImgs}
</section>`;
  }

  function _famSectionParents(husb, wife) {
    const parts = [];
    for (const p of [husb, wife].filter(Boolean)) {
      const pr = _pronoun(p);
      const sentences = [];
      const bRaw   = p.birth?.date || '';
      const bPlace = p.birth?.place ? ' in ' + _esc(_shortPlace(p.birth.place)) : '';
      if (bRaw || bPlace || p.birth?.seen) {
        const yearOnly = /^\d{4}$/.test(bRaw.trim());
        if (yearOnly) {
          sentences.push(`${_esc(p.name || pr.Er)} kam ${bRaw.trim()}${bPlace} zur Welt.`);
        } else {
          sentences.push(`${_esc(p.name || pr.Er)} wurde${_atDate({ date: bRaw })}${bPlace} geboren.`);
        }
      }
      const occus = (p.events || []).filter(ev => ev.type === 'OCCU' && ev.value);
      if (occus.length) {
        const s = _mergeOccuSentence(occus, pr);
        if (s) sentences.push(s);
      }
      if (p.death?.seen || p.death?.date || p.death?.place) {
        const dDate  = _atDate({ date: p.death.date });
        const dPlace = p.death.place ? ' in ' + _esc(_shortPlace(p.death.place)) : '';
        sentences.push(`${pr.Er} verstarb${dDate}${dPlace}.`);
      }
      if (!sentences.length) continue;
      const role = p.sex === 'M' ? 'Vater' : p.sex === 'F' ? 'Mutter' : 'Elternteil';
      parts.push(`<div class="story-fam-parent"><h3 class="story-fam-parent-role">${_esc(p.name || p.id)} — ${role}</h3><p>${sentences.join(' ')}</p></div>`);
    }
    if (!parts.length) return '';
    return `<section class="story-section"><h2 class="story-section-title">Eltern</h2>
<div class="story-fam-parents">${parts.join('')}</div>
</section>`;
  }

  function _famSectionChildren(f) {
    if (!f.children?.length) return '';
    const sorted = [...f.children]
      .map(cid => getPerson(cid)).filter(Boolean)
      .sort((a, b) =>
        (_yearFromDate(a.birth?.date || a.chr?.date) ?? Infinity) -
        (_yearFromDate(b.birth?.date || b.chr?.date) ?? Infinity));
    if (!sorted.length) return '';
    const rows = sorted.map(c => {
      const by  = _yearFromDate(c.birth?.date || c.chr?.date);
      const dy  = _yearFromDate(c.death?.date);
      const age = by && dy ? dy - by : null;
      const lifeStr = by && dy ? `*${by} †${dy}` : by ? `*${by}` : dy ? `†${dy}` : '';
      const partners = (c.fams || []).map(famId => {
        const cf = getFamily(famId);
        if (!cf) return null;
        const pid2    = c.id === cf.husb ? cf.wife : cf.husb;
        const partner = pid2 ? getPerson(pid2) : null;
        return partner ? _esc(partner.name || pid2) : null;
      }).filter(Boolean);
      const occuFirst = (c.events || []).find(ev => ev.type === 'OCCU' && ev.value);
      const meta = [];
      if (lifeStr) meta.push(`<span class="story-child-years">${lifeStr}</span>`);
      if (age !== null && age < 18) meta.push(`<span class="story-child-note">jung gestorben</span>`);
      if (occuFirst?.value) meta.push(`<span class="story-child-occu">${_esc(occuFirst.value)}</span>`);
      if (partners.length) meta.push(`<span class="story-child-partner">⚭ ${partners.join(', ')}</span>`);
      return `<li class="story-child-row"><span class="story-child-name">${_esc(c.name || c.id)}</span>${meta.length ? ' ' + meta.join(' ') : ''}</li>`;
    });
    return `<section class="story-section"><h2 class="story-section-title">Kinder (${sorted.length})</h2>
<ul class="story-child-list">${rows.join('')}</ul>
</section>`;
  }

  function _famSectionTimeline(f) {
    const evs = [];
    function addEv(label, date, who) {
      evs.push({ yr: _yearFromDate(date) ?? 99999, label, who });
    }
    if (f.engag?.date || f.engag?.seen) addEv('Verlobung', f.engag.date, null);
    if (f.marr?.date  || f.marr?.seen)  addEv('Heirat',    f.marr.date,  null);
    for (const ev of (f.events || [])) {
      const lbl = ev.eventType
        || (typeof EVENT_LABELS !== 'undefined' && EVENT_LABELS[ev.type])
        || ev.type || 'Ereignis';
      addEv(lbl, ev.date, null);
    }
    if (f.div?.date || f.div?.seen) addEv('Scheidung', f.div.date, null);
    for (const cid of (f.children || [])) {
      const c = getPerson(cid);
      if (!c) continue;
      const bDate = c.birth?.date || c.chr?.date;
      const dDate = c.death?.date;
      if (bDate || c.birth?.seen) addEv('Geburt', bDate, c.name || cid);
      if (dDate || c.death?.seen) addEv('Tod',    dDate, c.name || cid);
    }
    evs.sort((a, b) => a.yr - b.yr);
    if (!evs.length) return '';
    const rows = evs.map(ev => {
      const yrStr = ev.yr !== 99999 ? String(ev.yr) : '';
      const who   = ev.who ? ` (${_esc(ev.who)})` : '';
      return `<li class="story-tl-row"><span class="story-tl-year">${yrStr}</span><span class="story-tl-label">${_esc(ev.label)}${who}</span></li>`;
    });
    return `<section class="story-section"><h2 class="story-section-title">Familienchronik</h2>
<ul class="story-tl-list">${rows.join('')}</ul>
</section>`;
  }

  function _famSectionDiagram(f, husb, wife) {
    const CW = 110, CH = 40, HG = 14, VG = 50, M = 16, MAX_C = 6;
    const BRD = 'var(--border,#d8ceb8)', GLD = 'var(--gold,#c8b97a)';
    const FILL= 'var(--surface2,#f2ede0)', TXT = 'var(--text,#2c2a26)', DIM = 'var(--text2,#888)';

    const children = [...(f.children || [])]
      .map(cid => getPerson(cid)).filter(Boolean)
      .sort((a, b) =>
        (_yearFromDate(a.birth?.date || a.chr?.date) ?? Infinity) -
        (_yearFromDate(b.birth?.date || b.chr?.date) ?? Infinity));
    const shown   = children.slice(0, MAX_C);
    const hasMore = children.length > MAX_C;
    const slots   = shown.length + (hasMore ? 1 : 0);
    const hasBoth = !!(husb && wife);

    const totalParW   = hasBoth ? 2 * CW + HG : CW;
    const totalChildW = slots > 0 ? slots * CW + (slots - 1) * HG : 0;
    const contentW    = Math.max(totalParW, totalChildW, 2 * CW + HG);
    const svgW        = M + contentW + M;

    const parStartX = M + Math.round((contentW - totalParW) / 2);
    const husbX     = parStartX;
    const wifeX     = hasBoth ? parStartX + CW + HG : parStartX;
    const husbCx    = husbX + CW / 2;
    const wifeCx    = wifeX + CW / 2;
    const joinCx    = hasBoth ? (husbCx + wifeCx) / 2 : (husb ? husbCx : wifeCx);
    const cStartX   = slots > 0 ? M + Math.round((contentW - totalChildW) / 2) : M;

    const hasChildren = slots > 0;
    let svgH = M;
    const parY   = svgH; svgH += CH;
    const jY_par = svgH + Math.round(VG / 3);
    const jY_ch  = svgH + Math.round(VG * 2 / 3);
    svgH += VG;
    const cY = hasChildren ? svgH : -1;
    if (hasChildren) svgH += CH;
    svgH += M;

    function mkFamCard(x, y, person, isMain) {
      if (!person) return '';
      const sex    = person.sex || 'U';
      const sc     = sex === 'M' ? 'var(--male-col,#5b8fd4)' : sex === 'F' ? 'var(--female-col,#c47a9f)' : BRD;
      const stroke = isMain ? GLD : sc;
      const sw     = isMain ? 2.5 : 1.5;
      const cx     = +(x + CW / 2).toFixed(1);
      const given  = (person.given || (person.name || '').split(',')[1]?.trim() || '').trim();
      const sur    = (person.surname || (person.name || '').split(',')[0]?.trim() || '').trim();
      const nm     = _esc((given || sur).substring(0, 14));
      const by     = _yearFromDate(person.birth?.date || person.chr?.date);
      const dy     = _yearFromDate(person.death?.date);
      const yrs    = by && dy ? `*${by} †${dy}` : by ? `*${by}` : dy ? `†${dy}` : '';
      const txt    = [];
      if (nm)  txt.push(`<text x="${cx}" y="${+(y+CH*(yrs?.35:.5)).toFixed(1)}" font-size="10" font-weight="600" fill="${TXT}" text-anchor="middle" dominant-baseline="middle">${nm}</text>`);
      if (yrs) txt.push(`<text x="${cx}" y="${+(y+CH*.72).toFixed(1)}" font-size="9" fill="${DIM}" text-anchor="middle" dominant-baseline="middle">${_esc(yrs)}</text>`);
      const nav = person.id ? ` onclick="if(typeof showDetail==='function')showDetail('${_esc(person.id)}')"` : '';
      return `<g${person.id ? ' class="svg-nav"' : ''}${nav}><rect x="${x}" y="${y}" width="${CW}" height="${CH}" rx="5" fill="${FILL}" stroke="${stroke}" stroke-width="${sw}"/>${txt.join('')}</g>`;
    }
    function fvln(x, y1, y2, col) {
      return `<line x1="${+x.toFixed(1)}" y1="${y1}" x2="${+x.toFixed(1)}" y2="${y2}" stroke="${col}" stroke-width="1.5"/>`;
    }
    function fhln(x1, y, x2, col) {
      return `<line x1="${+x1.toFixed(1)}" y1="${y}" x2="${+x2.toFixed(1)}" y2="${y}" stroke="${col}" stroke-width="1.5"/>`;
    }

    const elems = [];
    if (husb) elems.push(mkFamCard(husbX, parY, husb, true));
    if (wife) elems.push(mkFamCard(wifeX, parY, wife, true));
    if (hasBoth) {
      const symX = +((husbX + CW + wifeX) / 2).toFixed(1);
      const symY = +(parY + CH / 2 + 0.5).toFixed(1);
      elems.push(`<text x="${symX}" y="${symY}" font-size="13" font-weight="bold" fill="${GLD}" text-anchor="middle" dominant-baseline="middle">⚭</text>`);
      elems.push(fvln(husbCx, parY + CH, jY_par, GLD));
      elems.push(fvln(wifeCx, parY + CH, jY_par, GLD));
      elems.push(fhln(husbCx, jY_par, wifeCx, GLD));
    }
    if (hasChildren) {
      elems.push(fvln(joinCx, hasBoth ? jY_par : parY + CH, jY_ch, BRD));
      const cCxArr = shown.map((_, i) => cStartX + i * (CW + HG) + CW / 2);
      if (hasMore) cCxArr.push(cStartX + shown.length * (CW + HG) + CW / 2);
      if (cCxArr.length > 1) {
        elems.push(fhln(Math.min(joinCx, cCxArr[0]), jY_ch, Math.max(joinCx, cCxArr.at(-1)), BRD));
      }
      shown.forEach((child, i) => {
        const cx2 = cStartX + i * (CW + HG);
        elems.push(fvln(cx2 + CW / 2, jY_ch, cY, BRD));
        elems.push(mkFamCard(cx2, cY, child, false));
      });
      if (hasMore) {
        const mX = cStartX + shown.length * (CW + HG), mCxN = mX + CW / 2;
        elems.push(fvln(mCxN, jY_ch, cY, BRD));
        elems.push(`<rect x="${mX}" y="${cY}" width="${CW}" height="${CH}" rx="5" fill="${FILL}" stroke="${BRD}" stroke-dasharray="4,3"/>`);
        elems.push(`<text x="${+mCxN.toFixed(1)}" y="${+(cY + CH / 2).toFixed(1)}" font-size="12" fill="${DIM}" text-anchor="middle" dominant-baseline="middle">+${children.length - MAX_C}</text>`);
      }
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" font-family="system-ui,sans-serif">\n${elems.filter(Boolean).map(e => '  ' + e).join('\n')}\n</svg>`;
    return `<section class="story-section story-diagram"><div class="story-diagram-wrap">${svg}</div></section>`;
  }

  function _renderFamilyStory(famId) {
    const f = AppState.db?.families?.[famId];
    if (!f) return '<p>Familie nicht gefunden.</p>';
    const husb = f.husb ? getPerson(f.husb) : null;
    const wife = f.wife ? getPerson(f.wife) : null;
    let html = '<article class="story-article">';
    html += _famSectionHeader(f, husb, wife);
    html += _famSectionDiagram(f, husb, wife);
    html += _famSectionMarriage(f, husb, wife);
    html += _famSectionParents(husb, wife);
    html += _famSectionChildren(f);
    html += _famSectionTimeline(f);
    if (f.note) {
      html += `<section class="story-section story-note"><h2 class="story-section-title">Notizen</h2><p>${_esc(f.note)}</p></section>`;
    }
    html += '</article>';
    return html;
  }

  function _famStoryAsHTML() {
    const famId = UIState._storyFamId;
    const f     = AppState.db?.families?.[famId];
    const husb  = f?.husb ? getPerson(f.husb) : null;
    const wife  = f?.wife ? getPerson(f.wife) : null;
    const title = _esc([husb?.name, wife?.name].filter(Boolean).join(' & ') || famId || 'Familie');
    let body = document.getElementById('storyBody')?.innerHTML || '';
    body = body.replace(/<img[^>]+style="display:none"[^>]*>/g, '');
    const css = `
*{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{padding:2rem 2rem 4rem;max-width:780px;margin:0 auto;font-family:Georgia,serif;font-size:1rem;line-height:1.78;background:#faf8f3;color:#2c2a26}
.story-header{text-align:center;padding-bottom:1.6rem;margin-bottom:1.8rem;position:relative}
.story-header::after{content:'';display:block;width:2.5rem;height:2px;background:#c8b97a;margin:1.1rem auto 0;border-radius:1px}
.story-name{font-size:1.7rem;font-weight:600;letter-spacing:-.015em;margin:0 0 .3rem;line-height:1.2}
.story-lifespan{color:#777;font-size:.8rem;letter-spacing:.07em;text-transform:uppercase;margin:.2rem 0 0}
.story-fam-marr-sub{color:#8b6914;margin:.25rem 0 0;font-size:.9rem}
.story-media-row{display:flex;gap:.75rem;align-items:flex-start;margin-bottom:.8rem;justify-content:center}
.story-hero-img{flex-shrink:0;max-width:42%;max-height:200px;object-fit:cover;border-radius:8px;box-shadow:0 2px 14px rgba(0,0,0,.18)}
.story-section{margin-bottom:1.4rem}
.story-section p{margin:0}
.story-section-title{font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#666;margin:0 0 .55rem;font-family:system-ui,sans-serif}
.story-family{background:#f2ede0;border-radius:8px;padding:.9rem 1.1rem;border-left:3px solid #c8b97a;margin-bottom:.75rem}
.story-ev-imgs{display:flex;gap:.3rem;flex-wrap:wrap;margin:.35rem 0 .1rem}
.story-ev-img{width:72px;height:72px;object-fit:cover;border-radius:5px;border:1px solid #ddd}
.story-diagram{margin-bottom:1.4rem}
.story-diagram-wrap{overflow-x:auto;border-radius:6px}
.story-diagram-wrap svg{width:100%;height:auto;display:block;min-width:320px}
.story-fam-parents{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
.story-fam-parent{background:#f2ede0;border-radius:6px;padding:.7rem 1rem}
.story-fam-parent-role{font-size:.72rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#888;margin:0 0 .4rem;font-family:system-ui,sans-serif}
.story-child-list{list-style:none;padding:0;margin:0}
.story-child-row{padding:.35rem 0;border-bottom:1px solid #e8e0d0;display:flex;flex-wrap:wrap;gap:.3rem .6rem;align-items:baseline}
.story-child-name{font-weight:600}
.story-child-years{color:#888;font-size:.85em}
.story-child-note{color:#c04040;font-size:.8em;font-style:italic}
.story-child-occu{color:#5a4a1a;font-size:.85em}
.story-child-partner{color:#666;font-size:.85em}
.story-tl-list{list-style:none;padding:0;margin:0}
.story-tl-row{display:flex;gap:.6rem;padding:.3rem 0;border-bottom:1px solid #f0ece4;align-items:baseline;font-size:.9rem}
.story-tl-year{min-width:3rem;color:#888;font-size:.82em;font-variant-numeric:tabular-nums;flex-shrink:0}
.story-note{background:#f2ede0;border-radius:6px;padding:.75rem 1rem}
@media print{
  @page{margin:2.5cm 2cm;size:A4}
  body{max-width:none;padding:0}
  .story-diagram-wrap svg{max-height:160px !important}
  .story-family,.story-fam-parent,.story-child-list{page-break-inside:avoid}
  .story-header{page-break-after:avoid}
}`;
    return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Familien-Geschichte: ${title}</title>
<style>${css}</style>
</head>
<body>${body}</body>
</html>`;
  }

  // ── Öffentliche API ─────────────────────────────────────────────────────────

  window.showFamilyStory = function (famId, pushHistory) {
    famId = famId || AppState.currentFamilyId;
    const f = AppState.db?.families?.[famId];
    if (!f) return;
    if (pushHistory !== false) {
      const cur = _captureCurrentNavState();
      if (cur) UIState._navHistory.push(cur);
      UIState._navFwdStack = [];
    }
    UIState._storyFamId = famId;
    UIState._storyPid   = null;
    const husb  = f.husb ? getPerson(f.husb) : null;
    const wife  = f.wife ? getPerson(f.wife) : null;
    const title = [husb?.name, wife?.name].filter(Boolean).join(' & ') || famId;
    document.getElementById('storyTopTitle').textContent = 'Familie ' + title;
    document.getElementById('storyBody').innerHTML = _renderFamilyStory(famId);
    showView('v-story');
    _updateNavBtns();
    _embedFamPhotosAsync(famId);
  };

  // ── Bridge-Registrierung ────────────────────────────────────────────────────
  _sh.famStoryAsHTML = _famStoryAsHTML;

})();
