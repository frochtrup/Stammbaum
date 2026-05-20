// Stammbaum PWA — GEDCOM Web Worker
// Parst GEDCOM-Text off-thread; Main Thread bleibt reaktiv.
// Protocol:
//   IN:  { type: 'parse', text: string }
//   OUT: { type: 'progress', pct: number }   (0–95 während Parse)
//        { type: 'done',     db:  object  }  (pct 100 impliziert)
//        { type: 'error',    message: string }

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
