// Stammbaum PWA — Service Worker
// Strategie: Network-first → bei Offline aus Cache bedienen
// Nur same-origin Requests werden gecacht (keine Google Fonts etc.)

const CACHE_NAME = 'stammbaum-v197';
const PRECACHE = [
  './index.html', './offline.html', './styles.css', './manifest.json', './icon.svg',
  './gedcom.js', './gedcom-parser.js', './gedcom-writer.js', './gramps-parser.js', './gramps-writer.js',
  './storage-file.js', './storage.js',
  './ui-views.js', './ui-views-tree.js', './ui-views-person.js', './ui-views-family.js', './ui-views-source.js',
  './ui-fanchart.js', './ui-forms.js', './ui-forms-repo.js', './ui-forms-event.js', './ui-debug.js', './ui-media.js',
  './onedrive-auth.js', './onedrive-import.js', './onedrive.js'
];

// Install: Dateien vorab cachen
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
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

// Fetch: Network-first mit 4s Timeout → Fallback auf Cache
self.addEventListener('fetch', event => {
  // Nur same-origin (keine externen Fonts/APIs)
  if (!event.request.url.startsWith(self.location.origin)) return;
  // Nur GET
  if (event.request.method !== 'GET') return;

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
          // Aktuelle Version im Cache speichern
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
