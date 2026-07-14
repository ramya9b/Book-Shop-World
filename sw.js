/* Sri Vara Lakshmi Balaji Enterprises — Service Worker v21 */
const CACHE_NAME = 'svlb-v21';
const CACHE_URLS = ['/', './index.html'];

/* Install — pre-cache shell */
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) { return cache.addAll(CACHE_URLS); })
      .then(function() { return self.skipWaiting(); })
  );
});

/* Activate — delete old caches */
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k)   { return caches.delete(k);   })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

/* Fetch — network-first, fallback to cache */
self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  /* Skip cross-origin requests (YouTube, WhatsApp, etc.) */
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    fetch(e.request)
      .then(function(response) {
        /* Only cache successful same-origin responses */
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      })
      .catch(function() {
        return caches.match(e.request);
      })
  );
});
