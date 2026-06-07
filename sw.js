// Stammbaum PWA — Service Worker
// Strategie: Network-first → bei Offline aus Cache bedienen
// Nur same-origin Requests werden gecacht (keine Google Fonts etc.)

const CACHE_NAME = 'stammbaum-v904';

// Kern-Assets: atomar — Install schlägt fehl wenn eines fehlt
const PRECACHE_CRITICAL = [
  './index.html', './offline.html', './styles.css', './manifest.json', './icon.svg',
  './fonts/fonts.css',
  './gedcom.js', './gedcom-parser.js', './gedcom-worker.js', './gedcom-writer.js', './gedcom-validator.js', './validator.bridge.js', './gramps-parser.js', './gramps-writer.js', './gramps.bridge.js',
  './storage-file.js', './storage.js',
  './ui-views.js', './ui-lifecycle.js', './ui-views-nav.js', './ui-views-undo.js', './ui-views-note.js', './ui-views-search.js',
  './ui-views-tree.js', './ui-views-tasks.js', './ui-views-rlog.js', './ui-views-hypo.js', './ui-views-val.js', './ui-views-dashboard.js', './ui-views-projects.js', './ui-views-person.js', './ui-views-family.js',
  './ui-views-source.js', './ui-views-place.js', './geocoding.js', './ui-views-hof.js', './ui-views-map.js', './ui-views-stats.js', './ui-chart-export.js',
  './debug-activate.js', './lazy-loader.js', './ui-onboarding.js', './ui-quicktpl.js',
  './story-epochs.js', './timeline-hist-events.js',
  './ui-fanchart.js', './ui-desc-tree.js', './ui-timeline.js', './ui-story.js', './ui-story-person.js', './ui-story-fam.js', './ui-forms.js', './ui-forms-person.js', './ui-forms-family.js', './ui-forms-repo.js', './ui-forms-event.js', './ui-debug.js', './ui-media.js',
  './onedrive-auth.js', './onedrive-import.js', './onedrive.js',
  './ui-event-delegation.js',
];

// Optionale Assets: einzeln gecacht — Einzelfehler bricht Install nicht ab
// App bleibt ohne diese Assets funktionsfähig (Systemschriften, kein Kartenview)
const PRECACHE_OPTIONAL = [
  './fonts/playfair-display-normal-latin.woff2', './fonts/playfair-display-normal-latin-ext.woff2',
  './fonts/playfair-display-italic-latin.woff2', './fonts/playfair-display-italic-latin-ext.woff2',
  './fonts/source-serif-4-normal-latin.woff2', './fonts/source-serif-4-normal-latin-ext.woff2',
  './fonts/source-serif-4-italic-latin.woff2', './fonts/source-serif-4-italic-latin-ext.woff2',
  './leaflet.js', './leaflet.css',
  './debug-gramps.js',
  './Anna.png',
  './ui-book.js', './ui-print.js', './ui-dedup.js',
  './ui-import-compare.js', './compare-engine.js',
];

// Absolute Pfade für schnellen Cache-first-Lookup
const PRECACHE_PATHS = new Set(
  [...PRECACHE_CRITICAL, ...PRECACHE_OPTIONAL].map(p => new URL(p, self.location.href).pathname)
);

// Install: kritische Dateien atomar, optionale fehlertolerant
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(PRECACHE_CRITICAL).then(() =>
        Promise.allSettled(PRECACHE_OPTIONAL.map(url => cache.add(url).catch(() => {})))
      )
    )
  );
  self.skipWaiting();
});

// Activate: alte Cache-Versionen löschen
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: Cache-first für App-Assets, Network-first mit 4s Timeout für alles andere
self.addEventListener('fetch', event => {
  // Nur same-origin (keine externen Fonts/APIs)
  if (!event.request.url.startsWith(self.location.origin)) return;
  // Nur GET
  if (event.request.method !== 'GET') return;

  const pathname = new URL(event.request.url).pathname;

  if (PRECACHE_PATHS.has(pathname)) {
    // Cache-first: App-Assets sofort aus Cache — kein Netzwarten beim Start
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          // Noch nicht im Cache (z.B. optionales Asset nicht gecacht): Netz
          return fetch(event.request).then(response => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // Network-first mit 4s Timeout für alles andere (z.B. demo.ged)
  const networkWithTimeout = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), 4000);
    fetch(event.request, { cache: 'no-cache' }).then(response => {
      clearTimeout(timer);
      resolve(response);
    }, err => {
      clearTimeout(timer);
      reject(err);
    });
  });

  event.respondWith(
    networkWithTimeout
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then(r => {
        if (r) return r;
        if (event.request.destination === 'document') return caches.match('./offline.html');
      }))
  );
});
