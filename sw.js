/* Sentinel — Service Worker (offline-first, installable PWA).
 *
 * Caches all static assets on first load so the prototype runs entirely
 * offline after one visit. No build step, no network dependency.
 */
const CACHE = 'sentinel-v4';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './js/audio.js',
  './js/scene.js',
  './js/guide.js',
  './js/voice.js',
  './js/demo.js',
  './js/perception.js',
  './js/pillar_guardian.js',
  './js/pillar_memory.js',
  './js/pillar_social.js',
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
  './assets/icon-180.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-512-maskable.png',
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
  // Never intercept cross-origin requests
  if (url.origin !== location.origin) return;

  // Navigations: network-first with the cached shell as an offline fallback,
  // so a cold-start offline visit never shows a blank page.
  if (ev.request.mode === 'navigate') {
    ev.respondWith(
      fetch(ev.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  if (ev.request.method !== 'GET') return;
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