// Bump CACHE_VERSION whenever app files change so clients pick up the new shell.
var CACHE_VERSION = 'fono-v4';

var APP_SHELL = [
  './',
  'index.html',
  'css/styles.css',
  'js/app.js',
  'data/stories.json',
  'manifest.webmanifest',
  'assets/flags/gb.svg',
  'assets/flags/br.svg',
  'assets/flags/it.svg',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/apple-touch-icon.png',
  'assets/fonts/atkinson-hyperlegible-latin-400-normal.woff2',
  'assets/fonts/atkinson-hyperlegible-latin-700-normal.woff2'
].concat([66, 68, 73, 74, 75, 76, 77, 78, 79, 80].map(function (n) {
  return 'assets/stories/card-0' + n + '.svg';
}));

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(function (cache) { return cache.addAll(APP_SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_VERSION; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Stale-while-revalidate: answer from cache (works offline), refresh in background.
self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_VERSION).then(function (cache) {
      return cache.match(req, { ignoreSearch: true }).then(function (cached) {
        var network = fetch(req).then(function (res) {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        }).catch(function () { return cached; });
        return cached || network;
      });
    })
  );
});
