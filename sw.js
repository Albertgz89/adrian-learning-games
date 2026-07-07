// Service worker — makes the games installable and fully playable offline.
// Bump CACHE_VERSION whenever any game file changes so iPads pick up updates.
const CACHE_VERSION = 'adrian-games-v7';
const ASSETS = [
  './',
  './index.html',
  './Adrians-Learning-Quest.html',
  './Word-and-Math-Blaster.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png',
  // monster collection art (offline-ready)
  './art/monster-0.jpg','./art/monster-1.jpg','./art/monster-2.jpg','./art/monster-3.jpg','./art/monster-4.jpg',
  './art/monster-5.jpg','./art/monster-6.jpg','./art/monster-7.jpg','./art/monster-8.jpg','./art/monster-9.jpg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first, cache fallback: updates flow in when online, games still open offline.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
