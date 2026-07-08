// Service worker — makes the games installable and fully playable offline.
// Bump CACHE_VERSION whenever any game file changes so iPads pick up updates.
const CACHE_VERSION = 'adrian-games-v14';
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
  './art/bg-space.jpg','./art/bg-baseball.jpg','./art/bg-golf.jpg','./art/bg-monster.jpg','./art/hero.jpg',
  './art/galaxy.jpg','./art/rocket-boy.png',
  // world + menu tiles
  './art/menu-blaster.jpg','./art/menu-builder.jpg','./art/menu-reader.jpg','./art/menu-writer.jpg','./art/world-animals.jpg','./art/world-calendar.jpg','./art/world-colors.jpg','./art/world-money.jpg','./art/world-numbers.jpg','./art/world-phonics.jpg','./art/world-shapes.jpg','./art/world-time.jpg','./art/world-words.jpg',
  './art/cal-calendar.jpg','./art/cal-fall.jpg','./art/cal-hourglass.jpg','./art/cal-morning.jpg','./art/cal-night.jpg','./art/cal-spring.jpg','./art/cal-summer.jpg','./art/cal-watch.jpg','./art/cal-winter.jpg',
  // collection card art
  './art/card-baseball-0.jpg','./art/card-baseball-1.jpg','./art/card-baseball-2.jpg','./art/card-baseball-3.jpg','./art/card-baseball-4.jpg',
  './art/card-baseball-5.jpg','./art/card-baseball-6.jpg','./art/card-baseball-7.jpg','./art/card-baseball-8.jpg','./art/card-baseball-9.jpg',
  './art/card-golf-0.jpg','./art/card-golf-1.jpg','./art/card-golf-2.jpg','./art/card-golf-3.jpg','./art/card-golf-4.jpg',
  './art/card-golf-5.jpg','./art/card-golf-6.jpg','./art/card-golf-7.jpg','./art/card-golf-8.jpg','./art/card-golf-9.jpg',
  './art/card-space-0.jpg','./art/card-space-1.jpg','./art/card-space-2.jpg','./art/card-space-3.jpg','./art/card-space-4.jpg',
  './art/card-space-5.jpg','./art/card-space-6.jpg','./art/card-space-7.jpg','./art/card-space-8.jpg','./art/card-space-9.jpg',
  // word cards
  './art/word-ant.jpg','./art/word-apple.jpg','./art/word-ball.jpg','./art/word-banana.jpg','./art/word-bear.jpg','./art/word-bed.jpg',
  './art/word-bee.jpg','./art/word-bell.jpg','./art/word-bike.jpg','./art/word-bird.jpg','./art/word-boat.jpg','./art/word-bone.jpg',
  './art/word-book.jpg','./art/word-box.jpg','./art/word-bread.jpg','./art/word-bug.jpg','./art/word-bus.jpg','./art/word-cake.jpg',
  './art/word-car.jpg','./art/word-cat.jpg','./art/word-clock.jpg','./art/word-cloud.jpg','./art/word-corn.jpg','./art/word-cow.jpg',
  './art/word-crab.jpg','./art/word-cup.jpg','./art/word-dog.jpg','./art/word-door.jpg','./art/word-drum.jpg','./art/word-duck.jpg',
  './art/word-ear.jpg','./art/word-egg.jpg','./art/word-feet.jpg','./art/word-fire.jpg','./art/word-fish.jpg','./art/word-fox.jpg',
  './art/word-frog.jpg','./art/word-goat.jpg','./art/word-grape.jpg','./art/word-hat.jpg','./art/word-hen.jpg','./art/word-house.jpg',
  './art/word-key.jpg','./art/word-kite.jpg','./art/word-leaf.jpg','./art/word-lion.jpg','./art/word-map.jpg','./art/word-milk.jpg',
  './art/word-moon.jpg','./art/word-mouse.jpg','./art/word-nose.jpg','./art/word-owl.jpg','./art/word-pen.jpg','./art/word-pig.jpg',
  './art/word-plane.jpg','./art/word-rain.jpg','./art/word-ring.jpg','./art/word-rose.jpg','./art/word-seed.jpg','./art/word-sheep.jpg',
  './art/word-ship.jpg','./art/word-smile.jpg','./art/word-snake.jpg','./art/word-sock.jpg','./art/word-spoon.jpg','./art/word-star.jpg',
  './art/word-sun.jpg','./art/word-tiger.jpg','./art/word-train.jpg','./art/word-tree.jpg','./art/word-whale.jpg','./art/word-zebra.jpg',
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
