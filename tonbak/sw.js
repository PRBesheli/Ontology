/**
 * Offline cache.
 *
 * Everything the app needs is a fixed, small set of files — there is no audio
 * to download, because the strokes are synthesised at launch. So the whole
 * app is precached on install and served cache-first, which means it works on
 * a plane, in a practice room with no signal, or with the phone in airplane
 * mode to stop calls interrupting a session.
 */

const CACHE = 'tonbak-v1.0.0';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/app.js',
  './js/audio/context.js',
  './js/audio/synth.js',
  './js/audio/engine.js',
  './js/audio/drone.js',
  './js/data/strokes.js',
  './js/data/rhythms.js',
  './js/data/dastgah.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) {
        // Refresh in the background so an update lands on the next launch.
        fetch(req)
          .then((res) => {
            if (res && res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
          })
          .catch(() => {});
        return hit;
      }
      return fetch(req).catch(() => caches.match('./index.html'));
    })
  );
});
