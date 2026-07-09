// Service worker — makes the games installable and fully playable offline.
// Bump CACHE_VERSION whenever any game file changes so iPads pick up updates.
const CACHE_VERSION = 'adrian-games-v20';
const ASSETS = [
  './',
  './index.html',
  './Adrians-Learning-Quest.html',
  './Word-and-Math-Blaster.html',
  './Aziels-Dino-Quest.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png',
  // monster collection art (offline-ready)
  './art/monster-0.jpg','./art/monster-1.jpg','./art/monster-2.jpg','./art/monster-3.jpg','./art/monster-4.jpg',
  './art/monster-5.jpg','./art/monster-6.jpg','./art/monster-7.jpg','./art/monster-8.jpg','./art/monster-9.jpg',
  './art/monster2-0.jpg','./art/monster2-1.jpg','./art/monster2-2.jpg','./art/monster2-3.jpg','./art/monster2-4.jpg','./art/monster2-5.jpg','./art/monster2-6.jpg','./art/monster2-7.jpg','./art/monster2-8.jpg','./art/monster2-9.jpg',
  './art/bg-space.jpg','./art/bg-baseball.jpg','./art/bg-golf.jpg','./art/bg-monster.jpg','./art/hero.jpg',
  './art/galaxy.jpg','./art/rocket-boy.png',
  './art/target-baseball.png','./art/target-golf.png',
  // full voice pack
  './art/audio/check-up-done-amazing-work.m4a','./art/audio/check-up-time-just-try-your-best-there-are-no-wrong-answers-here.m4a','./art/audio/great-reading.m4a','./art/audio/how-many-days-are-in-one-week.m4a','./art/audio/how-many-months-are-in-one-year.m4a','./art/audio/how-much-is-a-dime-worth.m4a',
  './art/audio/how-much-is-a-nickel-worth.m4a','./art/audio/how-much-is-a-penny-worth.m4a','./art/audio/how-much-is-a-quarter-worth.m4a','./art/audio/how-much-money-is-here.m4a','./art/audio/look-at-the-picture-is-it-morning-or-night.m4a','./art/audio/stem-find.m4a',
  './art/audio/stem-missing.m4a','./art/audio/stem-spell.m4a','./art/audio/stem-spelled.m4a','./art/audio/try-the-right-answer.m4a','./art/audio/w-and.m4a','./art/audio/w-ant.m4a',
  './art/audio/w-apple.m4a','./art/audio/w-are.m4a','./art/audio/w-away.m4a','./art/audio/w-bear.m4a','./art/audio/w-bed.m4a','./art/audio/w-bee.m4a',
  './art/audio/w-bell.m4a','./art/audio/w-bike.m4a','./art/audio/w-bird.m4a','./art/audio/w-boat.m4a','./art/audio/w-bone.m4a','./art/audio/w-box.m4a',
  './art/audio/w-bread.m4a','./art/audio/w-bug.m4a','./art/audio/w-bus.m4a','./art/audio/w-cake.m4a','./art/audio/w-can.m4a','./art/audio/w-car.m4a',
  './art/audio/w-cat.m4a','./art/audio/w-clock.m4a','./art/audio/w-cloud.m4a','./art/audio/w-come.m4a','./art/audio/w-corn.m4a','./art/audio/w-cow.m4a',
  './art/audio/w-crab.m4a','./art/audio/w-cup.m4a','./art/audio/w-dog.m4a','./art/audio/w-door.m4a','./art/audio/w-drum.m4a','./art/audio/w-duck.m4a',
  './art/audio/w-ear.m4a','./art/audio/w-egg.m4a','./art/audio/w-feet.m4a','./art/audio/w-fire.m4a','./art/audio/w-fish.m4a','./art/audio/w-for.m4a',
  './art/audio/w-fox.m4a','./art/audio/w-frog.m4a','./art/audio/w-goat.m4a','./art/audio/w-grape.m4a','./art/audio/w-hat.m4a','./art/audio/w-have.m4a',
  './art/audio/w-hen.m4a','./art/audio/w-here.m4a','./art/audio/w-house.m4a','./art/audio/w-key.m4a','./art/audio/w-kite.m4a','./art/audio/w-leaf.m4a',
  './art/audio/w-like.m4a','./art/audio/w-lion.m4a','./art/audio/w-little.m4a','./art/audio/w-look.m4a','./art/audio/w-map.m4a','./art/audio/w-milk.m4a',
  './art/audio/w-moon.m4a','./art/audio/w-mouse.m4a','./art/audio/w-nose.m4a','./art/audio/w-one.m4a','./art/audio/w-owl.m4a','./art/audio/w-pen.m4a',
  './art/audio/w-pig.m4a','./art/audio/w-plane.m4a','./art/audio/w-play.m4a','./art/audio/w-rain.m4a','./art/audio/w-ring.m4a','./art/audio/w-rose.m4a',
  './art/audio/w-said.m4a','./art/audio/w-see.m4a','./art/audio/w-seed.m4a','./art/audio/w-sheep.m4a','./art/audio/w-ship.m4a','./art/audio/w-smile.m4a',
  './art/audio/w-snake.m4a','./art/audio/w-sock.m4a','./art/audio/w-some.m4a','./art/audio/w-spoon.m4a','./art/audio/w-star.m4a','./art/audio/w-sun.m4a',
  './art/audio/w-that.m4a','./art/audio/w-the.m4a','./art/audio/w-they.m4a','./art/audio/w-this.m4a','./art/audio/w-tiger.m4a','./art/audio/w-train.m4a',
  './art/audio/w-tree.m4a','./art/audio/w-two.m4a','./art/audio/w-was.m4a','./art/audio/w-went.m4a','./art/audio/w-whale.m4a','./art/audio/w-what.m4a',
  './art/audio/w-where.m4a','./art/audio/w-who.m4a','./art/audio/w-with.m4a','./art/audio/w-you.m4a','./art/audio/w-zebra.m4a','./art/audio/what-time-does-the-clock-show.m4a',
  './art/audio/what-time-will-the-clock-show-in-1-hour.m4a','./art/audio/which-season-does-this-picture-show.m4a','./art/audio/amazing.m4a','./art/audio/awesome.m4a','./art/audio/birdie.m4a','./art/audio/blast-off.m4a','./art/audio/boom.m4a','./art/audio/brilliant.m4a','./art/audio/caught-it.m4a','./art/audio/direct-hit.m4a','./art/audio/gotcha.m4a','./art/audio/grand-slam.m4a','./art/audio/great-swing.m4a','./art/audio/hole-in-one.m4a','./art/audio/home-run.m4a','./art/audio/level-up.m4a','./art/audio/out-of-the-park.m4a','./art/audio/star-power.m4a','./art/audio/super-catch.m4a','./art/audio/super.m4a','./art/audio/to-the-moon.m4a','./art/audio/way-to-go.m4a','./art/audio/wonderful-writing.m4a','./art/audio/you-got-it.m4a',
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
  // Aziel's Dino Quest — cards, world tiles, hero
  './art/dino-0.jpg','./art/dino-1.jpg','./art/dino-2.jpg','./art/dino-3.jpg','./art/dino-4.jpg',
  './art/dino-5.jpg','./art/dino-6.jpg','./art/dino-7.jpg','./art/dino-8.jpg','./art/dino-9.jpg',
  './art/dino2-0.jpg','./art/dino2-1.jpg','./art/dino2-2.jpg','./art/dino2-3.jpg','./art/dino2-4.jpg',
  './art/dino2-5.jpg','./art/dino2-6.jpg','./art/dino2-7.jpg','./art/dino2-8.jpg','./art/dino2-9.jpg',
  './art/az-hero.jpg','./art/az-world-letters.jpg','./art/az-world-sounds.jpg','./art/az-world-counting.jpg',
  './art/az-world-numbers.jpg','./art/az-world-shapes.jpg','./art/az-world-colors.jpg','./art/az-world-patterns.jpg',
  './art/az-world-rhyme.jpg','./art/az-world-name.jpg',
  // Aziel's Dino Quest — Luna voice pack (stems, cheers, colors, shapes, letters, numbers)
  './art/audio/az-stem-findletter.m4a','./art/audio/az-stem-smallletter.m4a','./art/audio/az-stem-bigletter.m4a',
  './art/audio/az-stem-findnumber.m4a','./art/audio/az-stem-starts.m4a','./art/audio/az-stem-rhyme.m4a',
  './art/audio/az-q-count.m4a','./art/audio/az-q-next.m4a','./art/audio/az-q-name.m4a','./art/audio/az-q-missingname.m4a',
  './art/audio/az-q-bigger.m4a','./art/audio/az-welcome.m4a','./art/audio/az-chooseworld.m4a','./art/audio/az-newcard.m4a',
  './art/audio/az-dinomite.m4a','./art/audio/az-rawr.m4a','./art/audio/az-stomp.m4a','./art/audio/az-dinopower.m4a',
  './art/audio/az-smartdino.m4a','./art/audio/az-mightyroar.m4a','./art/audio/az-greatjob.m4a','./art/audio/az-waytogo.m4a',
  './art/audio/az-color-red.m4a','./art/audio/az-color-blue.m4a','./art/audio/az-color-yellow.m4a','./art/audio/az-color-green.m4a',
  './art/audio/az-color-orange.m4a','./art/audio/az-color-purple.m4a','./art/audio/az-color-pink.m4a','./art/audio/az-color-brown.m4a',
  './art/audio/az-color-black.m4a','./art/audio/az-color-white.m4a',
  './art/audio/az-shape-circle.m4a','./art/audio/az-shape-square.m4a','./art/audio/az-shape-triangle.m4a','./art/audio/az-shape-star.m4a',
  './art/audio/az-shape-heart.m4a','./art/audio/az-shape-rectangle.m4a','./art/audio/az-shape-oval.m4a','./art/audio/az-shape-diamond.m4a',
  './art/audio/l-a.m4a','./art/audio/l-b.m4a','./art/audio/l-c.m4a','./art/audio/l-d.m4a','./art/audio/l-e.m4a','./art/audio/l-f.m4a',
  './art/audio/l-g.m4a','./art/audio/l-h.m4a','./art/audio/l-i.m4a','./art/audio/l-j.m4a','./art/audio/l-k.m4a','./art/audio/l-l.m4a',
  './art/audio/l-m.m4a','./art/audio/l-n.m4a','./art/audio/l-o.m4a','./art/audio/l-p.m4a','./art/audio/l-q.m4a','./art/audio/l-r.m4a',
  './art/audio/l-s.m4a','./art/audio/l-t.m4a','./art/audio/l-u.m4a','./art/audio/l-v.m4a','./art/audio/l-w.m4a','./art/audio/l-x.m4a',
  './art/audio/l-y.m4a','./art/audio/l-z.m4a',
  './art/audio/n-1.m4a','./art/audio/n-2.m4a','./art/audio/n-3.m4a','./art/audio/n-4.m4a','./art/audio/n-5.m4a',
  './art/audio/n-6.m4a','./art/audio/n-7.m4a','./art/audio/n-8.m4a','./art/audio/n-9.m4a','./art/audio/n-10.m4a',
  './art/audio/n-11.m4a','./art/audio/n-12.m4a','./art/audio/n-13.m4a','./art/audio/n-14.m4a','./art/audio/n-15.m4a',
  './art/audio/n-16.m4a','./art/audio/n-17.m4a','./art/audio/n-18.m4a','./art/audio/n-19.m4a','./art/audio/n-20.m4a',
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
  // Media elements request byte ranges; proxying those through the SW stalls
  // playback in Chrome/Safari. Serve audio cache-first as a full 200 response
  // (small files — browsers accept this for <audio>), refreshing from network.
  if (/\.(m4a|mp3|wav)(\?|$)/.test(new URL(e.request.url).pathname)) {
    e.respondWith(
      caches.match(e.request.url, { ignoreSearch: true }).then((hit) => {
        const net = fetch(e.request.url).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(e.request.url, copy)).catch(() => {});
          return res;
        });
        return hit || net;
      })
    );
    return;
  }
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
