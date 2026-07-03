// Stammbaum PWA — Onboarding (Spotlight, 4 Schritte, nur nach Demo-Load)

const _OB_KEY = 'stammbaum_onboarding_done';

const _OB_STEPS = [
  {
    targetId: 'personList',
    title:    'Personenliste',
    text:     'Hier siehst du alle Personen. Tippe auf einen Namen, um die Details zu öffnen.'
  },
  {
    targetId: 'bnav-tree',
    title:    'Stammbaum-Ansicht',
    text:     'Dieser Button öffnet den Sanduhr-Stammbaum der ausgewählten Person.'
  },
  {
    targetId: 'fabBtn',
    title:    'Neue Einträge',
    text:     'Mit ＋ fügst du Personen, Familien oder Quellen hinzu.'
  },
  {
    targetId: null,
    title:    'Eigene Daten laden',
    text:     'Lade deine GEDCOM-Datei über das Menü ☰ oben rechts. Deine Demo-Daten bleiben unberührt.'
  }
];

let _obStep = 0;

function maybeStartOnboarding() {
  if (localStorage.getItem(_OB_KEY)) return;
  _obStep = 0;
  _obShow();
}

function obAdvance() {
  _obStep++;
  if (_obStep >= _OB_STEPS.length) { _obFinish(); return; }
  _obShow();
}

function obDismiss() {
  _obFinish();
}

function _obFinish() {
  localStorage.setItem(_OB_KEY, '1');
  _obHide();
}

function _obHide() {
  const ov = document.getElementById('ob-overlay');
  if (!ov) return;
  ov.hidden = true;
  ov.setAttribute('aria-hidden', 'true');
  ['ob-top','ob-left','ob-right','ob-bottom'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.setProperty('display', 'none'); }
  });
}

function _obShow() {
  const ov = document.getElementById('ob-overlay');
  if (!ov) return;
  ov.hidden = false;
  ov.setAttribute('aria-hidden', 'false');

  const step = _OB_STEPS[_obStep];

  // Schritt-Counter und Text setzen
  document.getElementById('ob-step-counter').textContent = `Schritt ${_obStep + 1} von ${_OB_STEPS.length}`;
  document.getElementById('ob-title').textContent = step.title;
  document.getElementById('ob-text').textContent  = step.text;

  // Letzter Schritt: "Fertig" statt "Weiter"
  const nextBtn = document.getElementById('ob-next');
  nextBtn.textContent = (_obStep === _OB_STEPS.length - 1) ? 'Fertig ✓' : 'Weiter →';

  if (step.targetId) {
    _obSpotlight(step.targetId);
  } else {
    _obNoSpotlight();
  }
}

const _OB_PAD = 8; // px Abstand um Highlight-Element

function _obSpotlight(targetId) {
  const target = document.getElementById(targetId);
  const top    = document.getElementById('ob-top');
  const left   = document.getElementById('ob-left');
  const right  = document.getElementById('ob-right');
  const bottom = document.getElementById('ob-bottom');
  const card   = document.getElementById('ob-card');

  if (!target || !top) { _obNoSpotlight(); return; }

  const r   = target.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) { _obNoSpotlight(); return; }
  const vw  = window.innerWidth;
  const vh  = window.innerHeight;
  const x1  = Math.max(0, r.left   - _OB_PAD);
  const y1  = Math.max(0, r.top    - _OB_PAD);
  const x2  = Math.min(vw, r.right  + _OB_PAD);
  const y2  = Math.min(vh, r.bottom + _OB_PAD);

  // Vier Streifen, die ein "Loch" freilassen
  [top, left, right, bottom].forEach(el => el.style.setProperty('display', ''));

  top.style.setProperty('top',    '0');
  top.style.setProperty('left',   '0');
  top.style.setProperty('right',  '0');
  top.style.setProperty('height', y1 + 'px');
  top.style.removeProperty('bottom');
  top.style.removeProperty('width');

  bottom.style.setProperty('top',    y2 + 'px');
  bottom.style.setProperty('left',   '0');
  bottom.style.setProperty('right',  '0');
  bottom.style.setProperty('bottom', '0');
  bottom.style.removeProperty('height');
  bottom.style.removeProperty('width');

  left.style.setProperty('top',    y1 + 'px');
  left.style.setProperty('left',   '0');
  left.style.setProperty('width',  x1 + 'px');
  left.style.setProperty('height', (y2 - y1) + 'px');
  left.style.removeProperty('right');
  left.style.removeProperty('bottom');

  right.style.setProperty('top',    y1 + 'px');
  right.style.setProperty('left',   x2 + 'px');
  right.style.setProperty('right',  '0');
  right.style.setProperty('height', (y2 - y1) + 'px');
  right.style.removeProperty('width');
  right.style.removeProperty('bottom');

  // Karte unter dem Spotlight positionieren, wenn genug Platz; sonst darüber
  const cardH = card.offsetHeight || 160;
  const cardW = card.offsetWidth  || 300;
  let cardTop = y2 + 12;
  if (cardTop + cardH > vh - 8) cardTop = y1 - cardH - 12;
  if (cardTop < 8) cardTop = 8;
  let cardLeft = Math.max(8, Math.min(x1, vw - cardW - 8));

  card.style.setProperty('top',  cardTop  + 'px');
  card.style.setProperty('left', cardLeft + 'px');
  card.style.removeProperty('transform');
}

function _obNoSpotlight() {
  ['ob-top','ob-left','ob-right','ob-bottom'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.setProperty('display', 'none');
  });
  const card = document.getElementById('ob-card');
  if (card) {
    card.style.setProperty('top',       '50%');
    card.style.setProperty('left',      '50%');
    card.style.setProperty('transform', 'translate(-50%, -50%)');
  }
}
