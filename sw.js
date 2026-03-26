// Stammbaum PWA — Service Worker
// Strategie: Network-first → bei Offline aus Cache bedienen
// Nur same-origin Requests werden gecacht (keine Google Fonts etc.)

const CACHE_NAME = 'stammbaum-v15';
const PRECACHE = [
  './index.html', './manifest.json', './icon.svg',
  './gedcom.js', './storage.js', './ui-views.js', './ui-forms.js'
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

// Fetch: Network-first, Fallback auf Cache
self.addEventListener('fetch', event => {
  // Nur same-origin (keine externen Fonts/APIs)
  if (!event.request.url.startsWith(self.location.origin)) return;
  // Nur GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
      .then(response => {
        if (response.ok) {
          // Aktuelle Version im Cache speichern
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
