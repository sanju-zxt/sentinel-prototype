/* Sentinel — Service Worker (offline-first, installable PWA).
 *
 * Caches all static assets on first load so the prototype runs entirely
 * offline after one visit. No build step, no network dependency.
 */
const CACHE = 'sentinel-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './js/audio.js',
  './js/scene.js',
  './js/demo.js',
  './js/perception.js',
  './js/pillar_social.js',
  './js/pillar_guardian.js',
  './js/pillar_health.js',
  './js/camera.js',
  './js/detector.js',
  './js/depth.js',
  './js/console.js',
  './js/main.js',
  './js/kinesthesis.js',
  './js/localize.js',
  './js/haven.js',
  './js/fusion.js',
  './manifest.webmanifest',
  './assets/icon.svg',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (ev) => {
  const url = new URL(ev.request.url);
  // Only cache same-origin GET
  if (url.origin !== location.origin || ev.request.method !== 'GET') return;
  ev.respondWith(
    caches.match(ev.request).then((cached) => {
      if (cached) return cached;
      return fetch(ev.request).then((resp) => {
        if (!resp.ok || resp.type !== 'basic') return resp;
        const copy = resp.clone();
        caches.open(CACHE).then((c) => c.put(ev.request, copy));
        return resp;
      });
    })
  );
});

// Optional: accept messages from the page (e.g., skipWaiting on update)
self.addEventListener('message', (ev) => {
  if (ev.data === 'skipWaiting') self.skipWaiting();
});