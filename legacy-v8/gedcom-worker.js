// Stammbaum PWA — GEDCOM Web Worker
// Parst GEDCOM-Text off-thread; Main Thread bleibt reaktiv.
// Protocol:
//   IN:  { type: 'parse', text: string }
//   OUT: { type: 'progress', pct: number }   (0–95 während Parse)
//        { type: 'done',     db:  object  }  (pct 100 impliziert)
//        { type: 'error',    message: string }

// citationObj wird von gedcom-parser.js benötigt; gedcom.js nicht laden (DOM-Abhängigkeiten)
function citationObj(sid = '', page = '', quay = '', note = null, extra = [], media = []) {
  return { sid, page, quay, note, extra: [...extra], media: [...media] };
}

importScripts('gedcom-parser.js');

self.onmessage = function(e) {
  if (e.data.type !== 'parse') return;
  try {
    const db = parseGEDCOM(e.data.text, [], function(pct) {
      self.postMessage({ type: 'progress', pct: pct });
    });
    self.postMessage({ type: 'done', db: db });
  } catch (err) {
    self.postMessage({ type: 'error', message: err.message });
  }
};
