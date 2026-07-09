// verify.mjs — automated self-check for both learning games.
// Usage:  npm install jsdom  &&  node verify.mjs
// Exits 0 if every check passes, 1 if any check fails.
// See CLAUDE.md "Verification Protocol". Add a check here whenever you add behavior.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const DIR = path.dirname(fileURLToPath(import.meta.url));
let FAILS = 0;
const ok = (cond, msg) => { console.log((cond ? '  PASS' : '  FAIL') + ' — ' + msg); if (!cond) FAILS++; };
const section = (t) => console.log('\n# ' + t);

// Load a single-file game into a real (opaque-origin) DOM. Only canvas/audio/speech are stubbed,
// NEVER localStorage — that is exactly the failure mode we are guarding against.
function loadGame(filename) {
  const html = fs.readFileSync(path.join(DIR, filename), 'utf8');
  const errors = [];
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://local.test/',
    beforeParse(window) {
      window.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (t, p) => {
        if (p === 'createRadialGradient' || p === 'createLinearGradient') return () => ({ addColorStop() {} });
        if (p === 'measureText') return () => ({ width: 10 });
        return () => {};
      }});
      window.requestAnimationFrame = () => 0;
      window.scrollTo = () => {};
      const AC = function () { return {
        state: 'running', resume() {}, currentTime: 0, destination: {}, sampleRate: 44100,
        createOscillator: () => ({ connect() {}, start() {}, stop() {}, frequency: {}, type: '' }),
        createGain: () => ({ connect() {}, gain: { value: 0, exponentialRampToValueAtTime() {} } }),
        createBuffer: () => ({ getChannelData: () => new Float32Array(64) }),
        createBufferSource: () => ({ connect() {}, start() {}, buffer: null }),
      };};
      window.AudioContext = window.webkitAudioContext = AC;
      window.speechSynthesis = { cancel() {}, speak() {}, getVoices: () => [], onvoiceschanged: null };
      window.SpeechSynthesisUtterance = function () {};
      window.onerror = (m) => errors.push(String(m));
    },
  });
  return { window: dom.window, errors };
}

// ============================ Adrians-Learning-Quest.html ============================
section('Adrians-Learning-Quest.html');
try {
  const { window: w, errors } = loadGame('Adrians-Learning-Quest.html');
  ok(errors.length === 0, 'loads with no script errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  w.eval('window.__Q = { get BANKS(){return BANKS}, get cur(){return cur} };');
  const Q = w.__Q;
  w.document.getElementById('nameInput').value = 'Adrian';
  w.startGame();
  const worlds = Object.keys(Q.BANKS);
  ok(worlds.length === 9 && worlds.includes('time') && worlds.includes('money'),
     'has 9 worlds incl. time + money: ' + worlds.join(', '));
  let broken = 0, answered = 0;
  for (const k of worlds) {
    for (let round = 0; round < 8; round++) {
      w.startRound(k);
      for (let i = 0; i < 5; i++) {
        const q = Q.cur.q;
        const labels = [...w.document.querySelectorAll('#answers .ans')].map(b => b.textContent);
        if (new Set(labels).size !== labels.length) { broken++; console.log('     dup choices in ' + k + ': ' + labels.join(',')); }
        const right = [...w.document.querySelectorAll('#answers .ans')].find(b => b.textContent === q.right);
        if (!right) { broken++; console.log('     ' + k + ' missing right "' + q.right + '" among [' + labels.join(',') + ']'); }
        else { right.click(); answered++; }
        Q.cur.i++; w.nextQuestion();
      }
    }
  }
  ok(broken === 0, 'all worlds answerable, correct answer always present, no duplicate choices (' + answered + ' questions answered)');
  w.eval('window.__gm=genMath; window.__gp=genPhonics; window.__gc=genCalendar; window.__gt=genTime; window.__go=genMoney;');
  let toHundred = false, longVowel = false, calendar = false;
  for (let i = 0; i < 1000; i++) { const a = parseInt(w.__gm().right, 10); if (!isNaN(a) && a > 50) toHundred = true; }
  for (let i = 0; i < 600; i++) { if (/Magic E|vowel team|long [AEIOU]/i.test(w.__gp().q)) { longVowel = true; break; } }
  for (let i = 0; i < 300; i++) { if (w.__gc().q) { calendar = true; break; } }
  ok(toHundred, 'Number World reaches numbers above 50 (numbers-to-100 benchmark)');
  ok(longVowel, 'Phonics includes long-vowel questions (silent-e / vowel teams)');
  ok(calendar, 'Calendar World generates questions');

  // Time + Money generators: valid, answer always among 4 unique choices, with a picture.
  let timeOk = true, moneyOk = true;
  for (let lvl = 1; lvl <= 9; lvl++) for (let i = 0; i < 150; i++) {
    const t = w.__gt(lvl), L = t.choices;
    if (!t.q || L.indexOf(t.right) < 0 || new Set(L).size !== L.length || !/^(data:image\/|art\/)/.test(t.pic || '')) timeOk = false;
    const mo = w.__go(lvl), M = mo.choices;
    if (!mo.q || M.indexOf(mo.right) < 0 || new Set(M).size !== M.length || !/^data:image\//.test(mo.pic || '')) moneyOk = false;
  }
  ok(timeOk, 'Time World: clock question with answer among 4 unique choices + clock image');
  ok(moneyOk, 'Money World: coin question with answer among 4 unique choices + coin image');

  // ---- Time & Calendar revamp ----
  // Calendar is leveled and always answerable with a picture where promised.
  let calOk = true, sawStrip = false, sawYesterday = false, sawSeasonArt = false, sawWeekend = false;
  let gridRight = true, sawGrid = false, satRight = true, sawSat = false;
  for (let lvl = 1; lvl <= 9; lvl++) for (let i = 0; i < 200; i++) {
    const c = w.__gc(lvl);
    if (!c.q || c.choices.indexOf(c.right) < 0 || new Set(c.choices).size !== c.choices.length) calOk = false;
    if ((c.pic || '').indexOf('data:image') === 0 && /day comes|days are in|weekend|yesterday|tomorrow/.test(c.q)) sawStrip = true;
    if (/yesterday/.test(c.q)) sawYesterday = true;
    if (/weekend day or a school day/.test(c.q)) sawWeekend = true;
    if (/season does this picture/.test(c.q)) { if (/^art\/cal-/.test(c.pic) && c.picFb) sawSeasonArt = true; else calOk = false; }
    if (c.meta && c.meta.date) { sawGrid = true; const wd = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][(c.meta.off + c.meta.date - 1) % 7]; if (wd !== c.right) gridRight = false; }
    if (c.meta && c.meta.firstSat) { sawSat = true; if (String((6 - c.meta.off + 7) % 7 + 1) !== c.right) satRight = false; }
  }
  ok(calOk, 'Calendar: every question at every level is answerable with unique choices');
  ok(sawStrip && sawYesterday && sawWeekend, 'Calendar: days-of-week strip visuals + yesterday/tomorrow + weekend questions appear');
  ok(sawSeasonArt, 'Calendar: season questions show generated art with a fallback');
  ok(sawGrid && gridRight && sawSat && satRight, 'Calendar: month-grid questions compute the correct weekday and first-Saturday date');
  // Time: morning/night picture questions at low levels; +1 hour questions at high levels are mathematically right.
  let sawMorning = false, elapsedOk = true, sawElapsed = false;
  for (let i = 0; i < 300; i++) { const t = w.__gt(1); if (/morning or night/.test(t.q) && /^art\/cal-/.test(t.pic) && t.picFb) sawMorning = true; }
  for (let i = 0; i < 300; i++) {
    const t = w.__gt(8);
    if (t.meta && /in 1 hour/.test(t.q)) { sawElapsed = true; const h2 = (t.meta.h % 12) + 1; if (t.right !== h2 + ':' + (t.meta.m < 10 ? '0' + t.meta.m : t.meta.m)) elapsedOk = false; }
  }
  ok(sawMorning, 'Time: morning/night picture questions appear at low levels');
  ok(sawElapsed && elapsedOk, 'Time: "in 1 hour" questions appear at high levels with the correct answer');

  // Adaptive difficulty: a streak of correct answers raises the level; a miss lowers it.
  w.eval('window.__setLevel=setLevel; window.__getLevel=getLevel;');
  w.__setLevel('numbers', 3);
  w.startRound('numbers');
  for (let i = 0; i < 3; i++) {
    const right = [...w.document.querySelectorAll('#answers .ans')].find(b => b.textContent === Q.cur.q.right);
    if (right) right.click();
    Q.cur.i++; w.nextQuestion();
  }
  const wentUp = w.__getLevel('numbers') > 3;
  ok(wentUp, 'adaptive: 3 correct in a row raises the level (now ' + w.__getLevel('numbers') + ')');
  w.startRound('numbers');
  const beforeWrong = w.__getLevel('numbers');
  const wrong = [...w.document.querySelectorAll('#answers .ans')].find(b => b.textContent !== Q.cur.q.right);
  if (wrong) wrong.click();
  ok(w.__getLevel('numbers') < beforeWrong, 'adaptive: a wrong answer lowers the level (' + beforeWrong + '→' + w.__getLevel('numbers') + ')');

  // Themes are available and switchable.
  w.eval('window.__themes=Object.keys(THEMES); window.__applyTheme=applyTheme; window.__theme=function(){return theme};');
  const themeList = w.__themes;
  w.__applyTheme('baseball');
  ok(themeList.length >= 4 && themeList.includes('baseball') && w.__theme() === 'baseball',
     'themes available and switchable: ' + themeList.join(', '));

  // Collection economy: 12 correct answers → one unlock with a celebration overlay.
  w.eval('window.__CO=COLLECT; window.__SFX=SFX; localStorage.setItem("alg-stars","0"); localStorage.removeItem("alg-collection");');
  const CO = w.__CO;
  for (let i = 0; i < 12; i++) CO.addStar();
  const partyOn = w.document.getElementById('colParty').classList.contains('on');
  ok(CO.count() === 1 && partyOn, 'collection: 12 stars unlock exactly 1 prize with a celebration (owned=' + CO.count() + ')');
  const goBtn = w.document.getElementById('colGo'); if (goBtn) goBtn.click();
  ok(!w.document.getElementById('colParty').classList.contains('on'), 'collection: celebration dismisses and play continues');
  for (let i = 0; i < 12; i++) CO.addStar();
  ok(CO.count() === 2, 'collection: next 12 stars unlock a second prize');
  CO.showBook();
  const cards = w.document.querySelectorAll('#colBook .colItem').length;
  const hasSeries2 = /Series 2/.test(w.document.getElementById('colBook').textContent);
  CO.hideBook();
  ok(cards === 50 && hasSeries2, 'collection book renders all 50 collectibles incl. Series 2 (' + cards + ')');
  // Booster-pack randomness: pulls spread across sets, not just the active theme.
  w.eval('localStorage.removeItem("alg-collection");');
  const pulled = new Set();
  for (let i = 0; i < 20; i++) { const u = CO.unlockNext(); if (u) pulled.add(u.set); }
  ok(pulled.size >= 3, 'prizes are random across all sets (' + pulled.size + ' different sets in 20 pulls)');
  // Trading-card ceremony: full creature-card anatomy (name, HP, type, moves, rarity, set number).
  CO.celebrate({ set: 'monster', i: 9 });
  const partyHTML = w.document.getElementById('colParty').innerHTML;
  ok(/LEGENDARY/.test(partyHTML) && /★★★★/.test(partyHTML) && /HP \d+/.test(partyHTML)
     && /tcgMove/.test(partyHTML) && /10\/10 · Learning Galaxy/.test(partyHTML),
     'unlock ceremony is a full creature card (name, HP, moves, rarity, set number)');
  const goBtn2 = w.document.getElementById('colGo'); if (goBtn2) goBtn2.click();
  // Binder: owned cards open the full card view on tap.
  CO.showCard('monster2', 0);
  const cardHTML = w.document.getElementById('colParty').innerHTML;
  ok(/Pebbles/.test(cardHTML) && /HP \d+/.test(cardHTML) && /Rock/.test(cardHTML),
     'book cards open as full creature cards (Pebbles, Rock type)');
  const closeB = w.document.getElementById('colGo'); if (closeB) closeB.click();
  w.eval('localStorage.removeItem("alg-collection"); localStorage.setItem("alg-stars","0");');
  // A real correct answer awards a star (integration with chooseAnswer).
  const starsBefore = CO.stars();
  w.startRound('numbers');
  const rightBtn = [...w.document.querySelectorAll('#answers .ans')].find(b => b.textContent === Q.cur.q.right);
  if (rightBtn) rightBtn.click();
  ok(CO.stars() === starsBefore + 1, 'a correct answer in a round earns a collection star');
  // SFX must never throw under the stubbed AudioContext.
  let sfxOk = true;
  try { for (const nm of ['correct','wrong','shoot','explode','levelup','fanfare']) w.__SFX.play(nm); } catch (e) { sfxOk = false; }
  ok(sfxOk, 'SFX: all themed sounds fire without errors (stub AudioContext)');
  // Themed story problems appear in Number World and stay answerable.
  w.eval('applyTheme("baseball");');
  let story = false, storyOk = true;
  for (let i = 0; i < 400; i++) {
    const m = w.__gm(5);
    if (/home run|baseballs/.test(m.q)) { story = true; if (m.choices.indexOf(m.right) < 0) storyOk = false; }
  }
  ok(story && storyOk, 'themed story problems appear (baseball) with valid choices');

  // Real-UI advance: after answering there must be a Next control that loads the next
  // question (the harness normally calls nextQuestion() directly, which hid this dead-end).
  w.startRound('calendar');
  const qBefore = Q.cur.q;
  const ansBtn = [...w.document.querySelectorAll('#answers .ans')].find(b => b.textContent === Q.cur.q.right);
  if (ansBtn) ansBtn.click();
  const nextBtn = w.document.getElementById('nextBtn');
  const nextVisible = !!(nextBtn && nextBtn.style.display !== 'none');
  if (nextBtn) nextBtn.click();
  ok(nextVisible && Q.cur.q !== qBefore && w.document.querySelectorAll('#answers .ans').length > 0,
     'Quest: a Next button appears after answering and loads the next question');

  // ---- i-Ready-style assessment layer ----
  w.eval('window.__R=REPORT; window.__startCheckup=startCheckup; window.__cu=function(){return checkup};');
  const R = w.__R;
  // normal play logs answers to the right domain
  w.eval('localStorage.removeItem("alg-report");');
  w.startRound('shapes');
  const geoRight = [...w.document.querySelectorAll('#answers .ans')].find(b => b.textContent === Q.cur.q.right);
  if (geoRight) geoRight.click();
  let rd = R.data();
  ok(rd.dom && rd.dom.GEO && rd.dom.GEO.a === 1 && rd.dom.GEO.c === 1,
     'answers log to i-Ready domains (Shape World → Geometry)');
  // Check-Up: 18 questions, adapts each answer, never reveals right/wrong, ends in the report
  w.eval('localStorage.removeItem("alg-report");');
  w.__startCheckup();
  let revealed = 0, asked = 0;
  while (w.__cu() && asked < 40) {
    const right = [...w.document.querySelectorAll('#answers .ans')].find(b => b.textContent === Q.cur.q.right);
    if (right) right.click();
    if (w.document.querySelector('#answers .ans.right')) revealed++;
    asked++;
    w.nextQuestion();
  }
  ok(asked === 18 && revealed === 0, 'Check-Up asks 18 adaptive questions with no right/wrong reveal (' + asked + ' asked)');
  ok(!w.__cu() && w.document.getElementById('repBook').classList.contains('on'),
     'Check-Up finishes and opens the progress report');
  rd = R.data();
  const attempted = Object.keys(rd.dom || {}).filter(k => rd.dom[k].a > 0);
  ok(attempted.length >= 6 && attempted.every(k => rd.dom[k].lvl > 3),
     'all-correct Check-Up raises every tested domain above the starting level (' + attempted.length + ' domains)');
  ok((rd.hist || []).some(h => h.cu), 'Check-Up records a dated snapshot for growth tracking');
  // report content: placement rows + relative placement chips + placement labels sane
  const rows = w.document.querySelectorAll('#repBook .repRow').length;
  const chips = [...w.document.querySelectorAll('#repBook .repChip')].map(x => x.textContent);
  const okChips = chips.every(c => /Above Grade Level|On Grade Level|One Grade Level Below|Two or More Levels Below/.test(c));
  ok(rows >= 6 && chips.length === rows && okChips, 'report shows per-domain placements with relative chips (' + rows + ' rows)');
  ok(R.placement(3.5) === 'Mid K' && R.placement(5.5) === 'Early Grade 1' && R.placement(9) === 'Grade 2+',
     'placement labels map levels to grade placements (Mid K / Early Grade 1 / Grade 2+)');
  R.hide();

  // Regression: sight-word questions must SPEAK the target, never print it.
  w.eval('window.__gs=genSight; window.__gcol=genColors;');
  let sightLeak = 0, sightAudio = true;
  for (let i = 0; i < 200; i++) {
    const sq = w.__gs();
    if (new RegExp('\\b' + sq.right + '\\b', 'i').test(sq.q)) sightLeak++;
    if (!sq.say || !sq.replay || sq.say.indexOf(sq.right) < 0) sightAudio = false;
  }
  ok(sightLeak === 0 && sightAudio, 'sight words: answer is spoken (say/replay) and never printed in the question');
  // Regression: colors don't repeat back-to-back and draw from a wide bank.
  let colRepeats = 0; const seen2 = new Set(); let prevQ = '';
  for (let i = 0; i < 40; i++) { const cq = w.__gcol(1); if (cq.q === prevQ) colRepeats++; prevQ = cq.q; seen2.add(cq.q); }
  ok(colRepeats === 0 && seen2.size >= 15, 'colors: no back-to-back repeats, wide variety (' + seen2.size + ' distinct in 40 draws)');
  // Regression: math speech says "plus"/"minus" instead of reading symbols.
  let mathSpeech = true, sawSub = false, sawAdd = false;
  for (let i = 0; i < 400; i++) {
    const mq = w.__gm(5);
    if (/−/.test(mq.q)) { sawSub = true; if (!mq.say || mq.say.indexOf('minus') < 0) mathSpeech = false; }
    if (/\+/.test(mq.q)) { sawAdd = true; if (!mq.say || mq.say.indexOf('plus') < 0) mathSpeech = false; }
  }
  ok(mathSpeech && sawSub && sawAdd, 'math speech: symbol questions are spoken as "plus"/"minus"');
  // ---- FACT AUDIT: re-verify generated questions against independent truth tables ----
  w.eval('window.__gs2=genShapes; window.__ga=genAnimals;');
  const SIDES = { Circle: 0, Triangle: 3, Square: 4, Rectangle: 4, Pentagon: 5, Hexagon: 6, Star: 10 };
  let shapeBad = 0;
  for (let i = 0; i < 600; i++) {
    const q = w.__gs2();
    if (q.meta && q.meta.sides != null) {
      if (SIDES[q.right] !== q.meta.sides) shapeBad++;                                  // right answer must truly have N sides
      if (q.choices.some(c => c !== q.right && SIDES[c] === q.meta.sides)) shapeBad++;  // no second valid answer offered
    }
  }
  ok(shapeBad === 0, 'FACT AUDIT shapes: side counts true and never ambiguous (600 draws, ' + shapeBad + ' bad)');
  const VOWEL = { team: 'long E', feet: 'long E', rain: 'long A', boat: 'long O' };
  let vtBad = 0;
  for (let i = 0; i < 600; i++) {
    const q = w.__gp();
    if (q.meta && q.meta.vt) {
      if (VOWEL[q.right] !== q.meta.vt) vtBad++;
      if (q.choices.some(c => c !== q.right && VOWEL[c] === q.meta.vt)) vtBad++;
    }
  }
  ok(vtBad === 0, 'FACT AUDIT phonics: vowel-team answers unique for the asked sound (' + vtBad + ' bad)');
  const COLORS = { 'a banana':'Yellow','the sun':'Yellow','a school bus':'Yellow','a rubber duck':'Yellow',
    'the grass':'Green','a frog':'Green','a leaf in summer':'Green','broccoli':'Green',
    'the sky on a sunny day':'Blue','the ocean':'Blue','a blueberry':'Blue','blue jeans':'Blue',
    'a strawberry':'Red','a fire truck':'Red','a stop sign':'Red','a ladybug':'Red',
    'an orange':'Orange','a carrot':'Orange','a pumpkin':'Orange','a basketball':'Orange',
    'a grape':'Purple','an eggplant':'Purple','a plum':'Purple',
    'fresh snow':'White','a polar bear':'White','a baseball':'White','milk':'White',
    'a piece of coal':'Black','a bat at night':'Black','a bowling ball':'Black',
    'chocolate':'Brown','a teddy bear':'Brown','a tree trunk':'Brown','a football':'Brown',
    'cotton candy':'Pink','a flamingo':'Pink','a pig':'Pink',
    'an elephant':'Gray','a rain cloud':'Gray','a shark':'Gray' };
  let colBad = 0;
  for (let i = 0; i < 600; i++) {
    const q = w.__gcol(1);
    const m = q.q.match(/^What color is (.+)\?$/);
    if (m && COLORS[m[1]] !== q.right) { colBad++; if (colBad < 3) console.log('     color mismatch: ' + q.q + ' → ' + q.right); }
  }
  ok(colBad === 0, 'FACT AUDIT colors: every thing keyed to its true color (' + colBad + ' bad)');
  const DAYS7 = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  let dayBad = 0;
  for (let lvl = 1; lvl <= 4; lvl++) for (let i = 0; i < 300; i++) {
    const q = w.__gc(lvl); let m;
    if ((m = q.q.match(/^What day comes after (\w+)\?/)))        { if (DAYS7[(DAYS7.indexOf(m[1]) + 1) % 7] !== q.right) dayBad++; }
    else if ((m = q.q.match(/^What day comes before (\w+)\?/)))  { if (DAYS7[(DAYS7.indexOf(m[1]) + 6) % 7] !== q.right) dayBad++; }
    else if ((m = q.q.match(/^Today is (\w+)\. What day was yesterday\?/))) { if (DAYS7[(DAYS7.indexOf(m[1]) + 6) % 7] !== q.right) dayBad++; }
    else if ((m = q.q.match(/^Today is (\w+)\. What day is tomorrow\?/)))   { if (DAYS7[(DAYS7.indexOf(m[1]) + 1) % 7] !== q.right) dayBad++; }
    else if ((m = q.q.match(/^Which day comes between (\w+) and (\w+)\?/))) { if (DAYS7[(DAYS7.indexOf(m[1]) + 1) % 7] !== q.right) dayBad++; }
    else if ((m = q.q.match(/^Is (\w+) a weekend day or a school day\?/)))  { const wk = (m[1] === 'Saturday' || m[1] === 'Sunday'); if ((wk ? 'Weekend day' : 'School day') !== q.right) dayBad++; }
  }
  ok(dayBad === 0, 'FACT AUDIT calendar days: after/before/yesterday/tomorrow/between/weekend all recomputed correct (' + dayBad + ' bad)');
  const ANIMALS = { '“moo”':'Cow','“quack”':'Duck','a fish live':'In water','can fly':'Bird','baby dog':'Puppy','baby cat':'Kitten','animal hops':'Frog' };
  let aniBad = 0;
  for (let i = 0; i < 300; i++) {
    const q = w.__ga();
    for (const k in ANIMALS) if (q.q.indexOf(k) >= 0 && q.right !== ANIMALS[k]) aniBad++;
  }
  ok(aniBad === 0, 'FACT AUDIT animals: every fact question matches the truth table (' + aniBad + ' bad)');
  const COINS = { penny: '1¢', nickel: '5¢', dime: '10¢', quarter: '25¢' };
  let coinBad = 0;
  for (let i = 0; i < 300; i++) {
    const q = w.__go(1); const m = q.q.match(/^How much is a (\w+) worth\?/);
    if (m && COINS[m[1]] !== q.right) coinBad++;
  }
  ok(coinBad === 0, 'FACT AUDIT money: coin values correct (' + coinBad + ' bad)');

  // Repeat-the-question button: present on the quiz screen and safe to click.
  w.startRound('numbers');
  const sayBtn = w.document.getElementById('sayBtn');
  let sayOk = !!sayBtn;
  try { if (sayBtn) sayBtn.click(); } catch (e) { sayOk = false; }
  ok(sayOk, 'Quest: 🔊 "Say it again" button repeats the question');
  ok(!!w.document.querySelector('#homeBtn[href="index.html"]'), 'Quest: 🏠 Games button links back to the launcher');
  // Galaxy-launcher deep links: ?world=<key> jumps straight into that world.
  w.eval('window.__dl = openWorldDeepLink;');
  const dlOk = w.__dl('time');
  ok(dlOk && w.document.getElementById('quizScreen').classList.contains('on')
        && /Time World/.test(w.document.getElementById('worldName').textContent),
     'deep link ?world=time opens Time World directly');
  ok(!w.__dl('nonsense'), 'deep link rejects unknown world keys');
} catch (e) { ok(false, 'Quest threw: ' + e.message); }

// ============================ Word-and-Math-Blaster.html ============================
section('Word-and-Math-Blaster.html');
try {
  const { window: w, errors } = loadGame('Word-and-Math-Blaster.html');
  ok(errors.length === 0, 'loads with no script errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  w.eval('window.__B={ get builder(){return builder}, get reader(){return reader}, get game(){return game} }; window.__mm=makeMath; window.__mw=makeWord;');
  const B = w.__B;

  let mathOk = true, reaches = false;
  for (let lvl = 1; lvl <= 9; lvl++) for (let i = 0; i < 300; i++) {
    const p = w.__mm(lvl); const L = p.choices.map(c => c.label);
    if (L.indexOf(p.answer) < 0 || new Set(L).size !== L.length) mathOk = false;
    if (parseInt(p.answer, 10) > 50) reaches = true;
  }
  ok(mathOk, 'makeMath: answer always in 4 unique choices (levels 1-9)');
  ok(reaches, 'makeMath reaches numbers above 50 (numbers-to-100 benchmark)');

  let wordOk = true;
  for (let lvl = 1; lvl <= 6; lvl++) for (let i = 0; i < 300; i++) {
    const p = w.__mw(lvl); const L = p.choices.map(c => c.label);
    if (L.indexOf(p.answer) < 0 || new Set(L).size !== L.length) wordOk = false;
  }
  ok(wordOk, 'makeWord: answer always in 4 unique choices');

  // Word Builder Lab — solve real words by tapping letter tiles in order
  [...w.document.querySelectorAll('#menu .btn')].find(b => /Word Builder/.test(b.textContent)).click();
  let solved = 0; const types = {};
  for (let n = 0; n < 24; n++) {
    const r = B.builder.round; if (!r) break; types[r.type] = 1;
    const seq = (r.type === 'build' || r.type === 'sight' || r.type === 'longvowel') ? r.word.split('') : [r.word[r.blank]];
    let good = true;
    for (const ch of seq) {
      const need = ch.toUpperCase();
      const tile = [...w.document.querySelectorAll('#bTray .tile')].find(x => !x.disabled && x.textContent === need);
      if (!tile) { good = false; break; }
      tile.click();
    }
    if (good) solved++;
    w.nextWord();
  }
  ok(solved === 24, 'Word Builder Lab: 24/24 words solvable by tapping letters in order (solved ' + solved + ')');
  ok(!!types.longvowel, 'Word Builder Lab rotates in long-vowel words');

  // The lab must NOT print the target word — that turns "spell it" into "copy it".
  // Check every round once that the answer is never pre-shown.
  let leaked = 0, rounds = 0;
  for (let n = 0; n < 30; n++) {
    const r = B.builder.round; if (!r) break; rounds++;
    const slots = [...w.document.querySelectorAll('#bSlots .slot')].map(s => s.textContent.trim());
    if (r.type === 'sight') {
      // sight words have no picture; the answer area must still start blank
      if (slots.some(t => t !== '')) leaked++;
    } else {
      // content words: neither the prompt text nor the slots may reveal the word
      const shown = (((w.document.getElementById('bPrompt') || {}).textContent || '') + slots.join(''))
        .toUpperCase().replace(/\s+/g, '');
      if (shown.includes(r.word.toUpperCase())) leaked++;
      if (r.type === 'fill' && slots[r.blank] !== '') leaked++; // missing letter stays blank
    }
    w.nextWord();
  }
  ok(leaked === 0 && rounds > 0, 'Word Builder never reveals the target word (' + rounds + ' rounds checked)');

  // Picture words must render a real embedded image (data:image/...), not an emoji glyph.
  let pics = 0, picRounds = 0;
  for (let n = 0; n < 30; n++) {
    const r = B.builder.round; if (!r) break;
    if (r.type !== 'sight') {
      picRounds++;
      const img = w.document.querySelector('#bCue img');
      if (img && /^(data:image\/|art\/)/.test(img.getAttribute('src') || '')) pics++;
    }
    w.nextWord();
  }
  ok(picRounds > 0 && pics === picRounds, 'Word Builder shows an embedded image for every picture word (' + pics + '/' + picRounds + ')');

  // Regression: variety — a run of rounds must not recycle a small word list.
  const buildWords = new Set(); let backToBack = 0; let prevW = '';
  for (let n = 0; n < 24; n++) {
    const r = B.builder.round; if (!r) break;
    if (r.word === prevW) backToBack++;
    prevW = r.word; buildWords.add(r.word);
    w.nextWord();
  }
  ok(buildWords.size >= 14 && backToBack === 0, 'Word Builder variety: ' + buildWords.size + ' distinct words in 24 rounds, no repeats in a row');
  // Adaptive: 3 clean solves raise the builder level.
  w.eval('localStorage.setItem("wmb-build-lvl","1"); builder.streak=0;');
  let solvedClean = 0;
  while (solvedClean < 3) {
    const r = B.builder.round;
    const seq3 = (r.type === 'build' || r.type === 'sight' || r.type === 'longvowel') ? r.word.split('') : [r.word[r.blank]];
    let good = true;
    for (const ch of seq3) {
      const t = [...w.document.querySelectorAll('#bTray .tile')].find(x => !x.disabled && x.textContent === ch.toUpperCase());
      if (!t) { good = false; break; }
      t.click();
    }
    if (good) solvedClean++;
    w.nextWord();
  }
  ok(w.eval('buildLevel()') === 2, 'Word Builder adapts: 3 clean words raise the level (now ' + w.eval('buildLevel()') + ')');

  // Read It Yourself — the sentence must render as tappable words
  [...w.document.querySelectorAll('#menu .btn')].find(b => /Read It Yourself/.test(b.textContent)).click();
  const words = w.document.querySelectorAll('#rText .rword').length;
  ok(words >= 4, 'Read It Yourself renders the sentence as tappable words (' + words + ' words)');
  const beforeRead = B.reader.read;
  w.iReadIt();
  ok(B.reader.read === beforeRead + 1 && B.reader.stars > 0, 'Read It Yourself: "I read it" advances and awards stars');
  ok(w.document.querySelectorAll('#rText .rword').length >= 4, 'Read It Yourself loads the next sentence after advancing');

  // Math Blaster — hearts and scoring
  [...w.document.querySelectorAll('#menu .btn')].find(b => /Math Blaster/.test(b.textContent)).click();
  ok(B.game.lives === 6, 'Math Blaster starts with 6 hearts');
  const sc = B.game.score; w.resolveRock(B.game.rocks.find(r => r.correct));
  ok(B.game.score > sc, 'correct rock increases the score');
  w.newWave(); const lv = B.game.lives; w.resolveRock(B.game.rocks.find(r => !r.correct));
  ok(B.game.lives === lv - 1, 'wrong rock costs a heart');

  // Arcade loop: a fired laser that reaches the correct meteor blasts it and scores.
  [...w.document.querySelectorAll('#menu .btn')].find(b => /Math Blaster/.test(b.textContent)).click();
  w.eval('window.__fire = fire; window.__update = update;');
  ok(!!(B.game.ship && B.game.rocks.every(r => typeof r.x === 'number' && typeof r.vy === 'number')),
     'Math Blaster has a ship and falling meteors (arcade model)');
  const before = B.game.score;
  const tgt = B.game.rocks.find(r => r.correct);
  B.game.ship.x = tgt.x;            // line the ship up under the target
  tgt.vy = 0;                       // hold it still for a deterministic shot
  w.__fire();                       // pew pew
  const laser = B.game.lasers[0];
  tgt.x = laser.x; tgt.y = laser.y - 80;   // drop the meteor into the laser's path
  let hit = false;
  for (let s = 0; s < 200 && !hit; s++) { w.__update(16); if (B.game.score > before) hit = true; }
  ok(hit, 'Math Blaster: a fired laser destroys the targeted meteor and scores');

  // Adaptive: a streak of correct hits raises the math level; a wrong shot eases it down.
  [...w.document.querySelectorAll('#menu .btn')].find(b => /Math Blaster/.test(b.textContent)).click();
  w.eval('window.__lvl = function(){ return game.level; };');
  B.game.level = 2; B.game.streak = 0;
  for (let i = 0; i < 3; i++) { const c = B.game.rocks.find(r => r.correct); if (c) w.resolveRock(c); }
  ok(w.__lvl() > 2, 'Math Blaster levels up after a correct streak (now ' + w.__lvl() + ')');
  const beforeDown = w.__lvl();
  const wrong2 = B.game.rocks.find(r => !r.correct); if (wrong2) w.resolveRock(wrong2);
  ok(w.__lvl() < beforeDown, 'Math Blaster eases down after a wrong shot (' + beforeDown + '→' + w.__lvl() + ')');

  // Themes available + switchable (shared with the Quest).
  w.eval('window.__themes = Object.keys(THEMES); window.__applyTheme = applyTheme; window.__theme = function(){ return theme; };');
  w.__applyTheme('golf');
  ok(w.__themes.length >= 4 && w.__themes.includes('baseball') && w.__theme() === 'golf',
     'Blaster themes available and switchable: ' + w.__themes.join(', '));

  // Entertainment layer: correct hit earns a collection star; every theme's
  // scenery/targets/launcher draw without throwing (stub canvas).
  w.eval('window.__CO=COLLECT; localStorage.setItem("alg-stars","0"); localStorage.removeItem("alg-collection");');
  const sb = w.__CO.stars();
  const cRock = B.game.rocks.find(r => r.correct) || (w.newWave(), B.game.rocks.find(r => r.correct));
  w.resolveRock(cRock);
  ok(w.__CO.stars() === sb + 1, 'Blaster: catching the right answer earns a collection star');
  let drawOk = true;
  try { for (const th of w.__themes) { w.__applyTheme(th); w.newWave(); w.eval('drawOnce(); drawScene && bCtx && drawScene(bCtx);'); } } catch (e) { drawOk = false; }
  ok(drawOk, 'Blaster: all themed scenery/targets/launchers draw without errors');
  ok(!!w.document.getElementById('colBtn'), 'Blaster: collection book button is present');

  // Natural-voice clips: pack exists, files are on disk, say() routes praise to a clip.
  w.eval('window.__AP = AUDIO_PACK;');
  const packKeys = Object.keys(w.__AP);
  const missing = packKeys.filter(k => !fs.existsSync(path.join(DIR, w.__AP[k])));
  ok(packKeys.length >= 20 && missing.length === 0,
     'voice pack: ' + packKeys.length + ' natural clips exist on disk (missing: ' + missing.length + ')');
  w.say('Home run!');
  ok((w.say._last || '').indexOf('home-run.m4a') >= 0, 'say() plays the natural clip for known phrases');
  w.say('What is 3 plus 3?');
  ok(w.say._last === null, 'say() falls back to TTS for dynamic sentences');
  // Word clips + stem chaining: "Spell cat" = stem clip + word clip; prompts route too.
  w.say('Spell cat');
  const chainOk1 = (w.say._last || '').indexOf('w-cat.m4a') >= 0;
  w.say('Find the word... the');
  const chainOk2 = (w.say._last || '').indexOf('w-the.m4a') >= 0;
  w.say('You spelled frog');
  const chainOk3 = (w.say._last || '').indexOf('w-frog.m4a') >= 0;
  ok(chainOk1 && chainOk2 && chainOk3, 'say() chains stem + word clips (Spell/Find/You spelled)');
  // Every word clip and prompt clip referenced in code exists on disk.
  w.eval('window.__WC = Object.keys(WORD_CLIPS); window.__PC = PROMPT_CLIPS;');
  const missW = w.__WC.filter(k => !fs.existsSync(path.join(DIR, 'art/audio/w-' + k + '.m4a')));
  const missP = Object.values(w.__PC).filter(p => !fs.existsSync(path.join(DIR, p)));
  const missS = ['stem-find','stem-spell','stem-missing','stem-spelled','stem-goodtry'].filter(n => !fs.existsSync(path.join(DIR, 'art/audio/' + n + '.m4a')));
  w.say('Good try. The answer is cat');
  ok((w.say._last || '').indexOf('w-cat.m4a') >= 0, 'say() chains "Good try. The answer is…" + word clip (Luna feedback on wrong answers)');
  ok(missW.length === 0 && missP.length === 0 && missS.length === 0,
     'full voice pack on disk: ' + w.__WC.length + ' words + ' + Object.keys(w.__PC).length + ' prompts + 4 stems (missing: ' + (missW.length + missP.length + missS.length) + ')');
  // Ball sprite plumbing: target art preloader exists with fallback intact.
  ok(w.eval('typeof tgtFor === "function" && TGT_ART.baseball.indexOf("target-baseball") >= 0'),
     'Math Blaster: real ball sprites wired with vector fallback');

  // Assessment layer: Blaster activities feed the same i-Ready domains.
  w.eval('window.__R=REPORT; localStorage.removeItem("alg-report");');
  const R2 = w.__R;
  w.newWave(); w.resolveRock(B.game.rocks.find(r => r.correct));                 // math → Number & Operations
  [...w.document.querySelectorAll('#menu .btn')].find(b => /Word Builder/.test(b.textContent)).click();
  const rr = B.builder.round;
  const seq2 = (rr.type === 'build' || rr.type === 'sight' || rr.type === 'longvowel') ? rr.word.split('') : [rr.word[rr.blank]];
  for (const ch of seq2) { const t = [...w.document.querySelectorAll('#bTray .tile')].find(x => !x.disabled && x.textContent === ch.toUpperCase()); if (t) t.click(); }
  [...w.document.querySelectorAll('#menu .btn')].find(b => /Read It Yourself/.test(b.textContent)).click();
  w.iReadIt();                                                                    // → Comprehension
  const rd2 = R2.data().dom || {};
  ok(rd2.NO && rd2.NO.a >= 1 && (rd2.PH || rd2.HFW) && rd2.COMP && rd2.COMP.c >= 1,
     'Blaster logs to i-Ready domains (math→NO, spelling→PH/HFW, reading→COMP)');
  ok(!!w.document.getElementById('repBtn'), 'Blaster: progress report button is present');
  // Spoken math problems + repeat button.
  [...w.document.querySelectorAll('#menu .btn')].find(b => /Math Blaster/.test(b.textContent)).click();
  const gSay = w.document.getElementById('gSay');
  let gSayOk = !!gSay && typeof B.game.say === 'string' && /minus|plus/.test(B.game.say);
  try { if (gSay) gSay.click(); } catch (e) { gSayOk = false; }
  ok(gSayOk, 'Math Blaster: problem is spoken as plus/minus with a 🔊 repeat button (' + (B.game.say || 'none') + ')');

  // Home navigation + Sentence Builder
  ok(!!w.document.querySelector('#homeBtn[href="index.html"]'), 'Blaster: 🏠 Games button links back to the launcher');
  const menuBtns = [...w.document.querySelectorAll('#menu .btn')];
  const wBtn = menuBtns.find(b => /Sentence Builder/.test(b.textContent));
  ok(menuBtns.length === 4 && !!wBtn, 'menu has 4 games including ✍️ Sentence Builder');
  wBtn.click();
  ok(w.document.getElementById('writerPanel').classList.contains('on') && !!w.eval('writer.prompt'),
     'Sentence Builder opens with a prompt and picture');
  // checker rules (unit-level)
  w.eval('window.__cw = checkWriting;');
  const cwOk =
    !w.__cw('the dog runs.', 1, 'a big dog').ok &&            // no capital
    !w.__cw('The dog runs', 1, 'a big dog').ok &&             // no end punctuation
    !w.__cw('Dog.', 1, 'a big dog').ok &&                     // too short
     w.__cw('The dog runs fast.', 1, 'a big dog').ok &&       // valid at level 1
    !w.__cw('My pet is very happy.', 4, 'a big dog').ok &&    // level 4 requires the topic word
     w.__cw('My big dog is very happy.', 4, 'a big dog').ok &&
    !w.__cw('My dog is big and happy today.', 7, 'a big dog').ok && // level 7 needs two sentences
     w.__cw('My dog is big. He likes to run and play!', 7, 'a big dog').ok;
  ok(cwOk, 'writing checker: capital, punctuation, length, topic and two-sentence rules all enforce');
  // submit flow: a good sentence earns a star and logs to the Writing domain
  w.eval('localStorage.setItem("wmb-write-lvl","1");');
  const wStars = w.__CO.stars();
  w.document.getElementById('wText').value = 'The big dog runs fast.';
  w.document.getElementById('wDone').click();
  const writData = (w.__R.data().dom || {}).WRIT;
  ok(w.__CO.stars() === wStars + 1 && writData && writData.c >= 1,
     'a good sentence earns a star and logs to the Writing report domain');
} catch (e) { ok(false, 'Blaster threw: ' + e.message); }

// ============================ Aziels-Dino-Quest.html ============================
section('Aziels-Dino-Quest.html');
try {
  const { window: w, errors } = loadGame('Aziels-Dino-Quest.html');
  ok(errors.length === 0, 'loads with no script errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  w.eval('window.__A = { get BANKS(){return BANKS}, get cur(){return cur}, get COLLECT(){return COLLECT}, get REPORT(){return REPORT}, get checkup(){return checkup} };');
  const A = w.__A;
  w.startGame();
  const worlds = Object.keys(A.BANKS);
  ok(worlds.length === 9 &&
     ['letters','sounds','counting','numbers','shapes','colors','patterns','rhyme','name'].every(k => worlds.includes(k)),
     'has 9 pre-K worlds: ' + worlds.join(', '));

  // Full playthrough: buttons carry data-val (answers can be pictures/SVG), right
  // answer always present, no duplicate choices, 3-4 choices, every question spoken.
  let broken = 0, answered = 0, sayMissing = 0, badCount = 0;
  for (const k of worlds) {
    for (let round = 0; round < 8; round++) {
      w.startRound(k);
      for (let i = 0; i < 5; i++) {
        const q = A.cur.q;
        const btns = [...w.document.querySelectorAll('#answers .ans')];
        const vals = btns.map(b => b.dataset.val);
        if (new Set(vals).size !== vals.length) { broken++; console.log('     dup choices in ' + k + ': ' + vals.join(',')); }
        if (vals.length < 3 || vals.length > 4) { badCount++; console.log('     ' + k + ' has ' + vals.length + ' choices'); }
        if (!(q.say || q.q)) sayMissing++;
        const right = btns.find(b => b.dataset.val === q.right);
        if (!right) { broken++; console.log('     ' + k + ' missing right "' + q.right + '" among [' + vals.join(',') + ']'); }
        else { right.click(); answered++; }
        A.cur.i++; w.nextQuestion();
      }
    }
  }
  ok(broken === 0, 'all 9 worlds answerable, right answer always present, no duplicates (' + answered + ' questions)');
  ok(badCount === 0, 'every question offers 3-4 choices (3 at the easiest levels)');
  ok(sayMissing === 0, 'every question carries spoken-prompt text (audio-first)');
  ok(!!w.document.getElementById('sayBtn'), 'big 🔊 "Say it again" button exists');
  ok(!!w.document.querySelector('#homeBtn[href="index.html"]'), '🏠 Games button links back to the launcher');

  // Separate profile: Aziel saves under azq-*, never touching Adrian's alg-*/alq-* keys.
  ok(parseInt(w.localStorage.getItem('azq-stars') || '0', 10) > 0, 'stars persist under azq-stars');
  ok(w.localStorage.getItem('alg-stars') === null && w.localStorage.getItem('alg-report') === null,
     "Adrian's alg-* keys untouched by Aziel's game (separate profiles)");
  ok(!!w.localStorage.getItem('azq-report'), 'report data persists under azq-report');

  // Adaptive difficulty: 3 correct in a row levels up, a miss levels down.
  w.eval('localStorage.setItem("azq-lvl-counting","4"); streaks={};');
  w.eval('onCorrectAdapt("counting");onCorrectAdapt("counting");onCorrectAdapt("counting");');
  ok(w.eval('getLevel("counting")') === 5, '3 correct answers in a row level a world up');
  w.eval('onWrongAdapt("counting");');
  ok(w.eval('getLevel("counting")') === 4, 'a wrong answer eases the level back down');

  // ---- FACT AUDIT: re-verify generated questions against independent truth tables ----
  w.eval('window.__gL=genLetters; window.__gS=genSounds; window.__gC=genCounting; window.__gN=genNumbers;'
       + 'window.__gH=genShapes; window.__gO=genColors; window.__gP=genPatterns; window.__gR=genRhyme; window.__gM=genName;');

  // Counting: the number of dinosaurs drawn must equal the right answer, always.
  let cntOk = true, cntSmall = true;
  for (let lvl = 1; lvl <= 9; lvl++) for (let i = 0; i < 200; i++) {
    const q = w.__gC(lvl);
    const m = (q.picHTML || '').match(/data-count="(\d+)"/);
    if (!m || String(q.count) !== q.right || m[1] !== q.right) cntOk = false;
    const icons = (q.picHTML || '').replace(/<[^>]*>/g, '');
    const iconChar = [...icons][0];
    const shown = icons.split(iconChar).length - 1;
    if (shown !== parseInt(q.right, 10)) cntOk = false;
    if (q.choices.indexOf(q.right) < 0 || new Set(q.choices).size !== q.choices.length) cntOk = false;
    if (lvl <= 3 && q.choices.length !== 3) cntSmall = false;
    if (q.choices.some(c => parseInt(c, 10) < 1)) cntOk = false;
  }
  ok(cntOk, 'FACT AUDIT counting: dinosaurs drawn always equals the right answer (1800 questions)');
  ok(cntSmall, 'FACT AUDIT counting: easiest levels stick to 3 choices');

  // Patterns: recompute the next element from the repeating unit independently.
  let patOk = true;
  for (let lvl = 1; lvl <= 9; lvl++) for (let i = 0; i < 200; i++) {
    const q = w.__gP(lvl);
    const expect = q.unit[q.seq.length % q.unit.length];
    if (q.right !== expect) patOk = false;
    if (q.choices.indexOf(q.right) < 0 || new Set(q.choices).size !== q.choices.length) patOk = false;
    for (let s = 0; s < q.seq.length; s++) if (q.seq[s] !== q.unit[s % q.unit.length]) patOk = false;
  }
  ok(patOk, 'FACT AUDIT patterns: the right answer is exactly what the repeating unit predicts (1800 questions)');

  // Rhyme: independent rime table — right must share the prompt's rime, distractors must not.
  const RIME = { cat:'at',hat:'at', bee:'ee',tree:'ee',key:'ee', car:'ar',star:'ar', cake:'ake',snake:'ake',
                 moon:'oon',spoon:'oon', box:'ox',fox:'ox', goat:'oat',boat:'oat', hen:'en',pen:'en',
                 rain:'ain',train:'ain',plane:'ain', dog:'og',frog:'og', mouse:'ouse',house:'ouse' };
  let rhyOk = true;
  for (let lvl = 1; lvl <= 9; lvl++) for (let i = 0; i < 200; i++) {
    const q = w.__gR(lvl);
    if (!RIME[q.prompt] || RIME[q.right] !== RIME[q.prompt]) rhyOk = false;
    if (q.choices.indexOf(q.prompt) >= 0) rhyOk = false;
    for (const c of q.choices) { if (c !== q.right && RIME[c] === RIME[q.prompt]) rhyOk = false; }
    if (q.choices.indexOf(q.right) < 0 || new Set(q.choices).size !== q.choices.length) rhyOk = false;
  }
  ok(rhyOk, 'FACT AUDIT rhyming: answer rhymes with the prompt, no distractor does, prompt never a choice (1800 questions)');

  // Beginning sounds: the right letter IS the word's first letter; no distractor matches it.
  let sndOk = true;
  for (let lvl = 1; lvl <= 9; lvl++) for (let i = 0; i < 200; i++) {
    const q = w.__gS(lvl);
    if (q.right !== q.word[0].toUpperCase()) sndOk = false;
    if (q.choices.filter(c => c === q.right).length !== 1) sndOk = false;
    if (!/^art\/word-[a-z]+\.jpg$/.test(q.pic || '')) sndOk = false;
    if (new Set(q.choices).size !== q.choices.length) sndOk = false;
  }
  ok(sndOk, 'FACT AUDIT beginning sounds: right letter always starts the pictured word (1800 questions)');

  // Name: the missing tile really is that letter of the saved name.
  let nameOk = true;
  for (let lvl = 1; lvl <= 9; lvl++) for (let i = 0; i < 200; i++) {
    const q = w.__gM(lvl);
    const mn = (q.picHTML || '').match(/data-name="([A-Z]+)" data-pos="(\d+)"/);
    if (!mn || mn[1][+mn[2]] !== q.right) nameOk = false;
    if (q.choices.indexOf(q.right) < 0 || new Set(q.choices).size !== q.choices.length) nameOk = false;
  }
  ok(nameOk, 'FACT AUDIT name: the blank tile always matches the letter of the saved name (1800 questions)');

  // Numbers: "which is bigger" answers must be the true maximum; find-the-number in range.
  let numOk = true, sawCompare = false;
  for (let lvl = 1; lvl <= 9; lvl++) for (let i = 0; i < 200; i++) {
    const q = w.__gN(lvl);
    if (q.compare) { sawCompare = true;
      if (parseInt(q.right, 10) !== Math.max(...q.choices.map(Number))) numOk = false; }
    if (q.choices.indexOf(q.right) < 0 || new Set(q.choices).size !== q.choices.length) numOk = false;
    const n = parseInt(q.right, 10); if (isNaN(n) || n < 1 || n > 20) numOk = false;
  }
  ok(numOk && sawCompare, 'FACT AUDIT numbers: 1-20 range, comparisons always pick the true maximum');

  // Letters / shapes / colors: right present, pools honest, colors all mapped to real hexes.
  let letOk = true, shpOk = true, clrOk = true;
  const HEX = w.eval('COLOR_HEX');
  for (let lvl = 1; lvl <= 9; lvl++) for (let i = 0; i < 200; i++) {
    const ql = w.__gL(lvl);
    if (ql.choices.indexOf(ql.right) < 0 || new Set(ql.choices).size !== ql.choices.length) letOk = false;
    if (!/^[A-Za-z]$/.test(ql.right)) letOk = false;
    const qs = w.__gH(lvl);
    if (qs.choices.indexOf(qs.right) < 0 || new Set(qs.choices).size !== qs.choices.length) shpOk = false;
    if (!/svg/.test(qs.render(qs.right))) shpOk = false;
    const qc = w.__gO(lvl);
    if (qc.choices.indexOf(qc.right) < 0 || new Set(qc.choices).size !== qc.choices.length) clrOk = false;
    for (const c of qc.choices) if (!HEX[c]) clrOk = false;
  }
  ok(letOk, 'FACT AUDIT letters: right letter always among unique choices (1800 questions)');
  ok(shpOk, 'FACT AUDIT shapes: every choice renders real SVG art, right always present');
  ok(clrOk, 'FACT AUDIT colors: every color choice has real dino art in a distinct hex');

  // Dino card collection: 20 original cards, rarity/HP/moves/holo, booster every 8 stars.
  const CO = A.COLLECT;
  ok(CO.PACK === 8 && CO.total() === 20 && Object.keys(CO.SETS).length === 2,
     'collection: 2 series × 10 = 20 dino cards, pack every 8 stars');
  ok(CO.SETS.dino.names.length === 10 && CO.SETS.dino2.names.length === 10 &&
     new Set(CO.SETS.dino.names.concat(CO.SETS.dino2.names)).size === 20,
     'all 20 dino names unique and original: ' + CO.SETS.dino.names.slice(0,3).join(', ') + '…');
  const rar = [CO.rarity(0).label, CO.rarity(5).label, CO.rarity(8).label, CO.rarity(9).label];
  ok(rar.join(',') === 'COMMON,RARE,EPIC,LEGENDARY', 'card rarity tiers: ' + rar.join(' → '));
  const cardHtml = CO.cardHTML('dino', 9, null);
  ok(/HP \d+/.test(cardHtml) && /tcgMove/.test(cardHtml) && /sheen/.test(cardHtml) && /LEGENDARY/.test(cardHtml),
     'legendary card has HP, two moves and the holo sheen');
  ok(!/sheen/.test(CO.cardHTML('dino', 0, null)), 'common cards have no holo sheen');
  w.eval('localStorage.setItem("azq-stars","7"); localStorage.setItem("azq-collection","{}");');
  const before = CO.count(); CO.addStar();
  ok(CO.count() === before + 1, 'the 8th star opens a booster pack and unlocks a card');
  ok(/art\/dino-3\.jpg/.test(CO.itemArt('dino',3)) && /art\/dino2-7\.jpg/.test(CO.itemArt('dino2',7)),
     'cards use generated art (art/dino-*.jpg) with SVG fallback');

  // Kindergarten-readiness report on the separate Aziel profile.
  const R = A.REPORT;
  ok(Object.keys(R.DOMAINS).length === 9 && R.DOMAINS.LET && R.DOMAINS.CNT && R.DOMAINS.WRT,
     'report tracks 9 K-readiness domains');
  ok(R.PLACEMENTS.includes('Kindergarten Ready!'), 'placements speak pre-K → K readiness');
  R.show();
  const repHTML = w.document.getElementById('repBook').innerHTML;
  ok(/Readiness/.test(repHTML) && /not an official/.test(repHTML) && /separately from Adrian/.test(repHTML),
     'parent report renders with the unofficial disclaimer and per-kid note');
  R.hide();

  // Check-Up: 18 interleaved questions, neutral feedback, sets levels + opens report.
  w.document.getElementById('checkupBtn').click();
  ok(!!A.checkup && A.checkup.total === 18, 'Check-Up runs 18 questions (2 per world)');
  let neutral = true;
  for (let i = 0; i < 18 && A.checkup; i++) {
    const q = A.cur.q;
    const btns = [...w.document.querySelectorAll('#answers .ans')];
    (btns.find(b => b.dataset.val === q.right) || btns[0]).click();
    const fbEl = w.document.getElementById('feedback');
    if (/Try the green|Level up/.test(fbEl.textContent)) neutral = false;
    if (btns.some(b => b.classList.contains('right') || b.classList.contains('wrong'))) neutral = false;
    w.nextQuestion();
  }
  ok(neutral, 'Check-Up never reveals right/wrong (diagnostic style)');
  ok(A.checkup === null && w.document.getElementById('repBook').classList.contains('on'),
     'Check-Up finishes, saves levels and opens the readiness report');

  // Voice pack wiring: every fixed prompt/cheer resolves to a real clip on disk.
  w.eval('window.__clips = (function(){ const l=[];'
    + 'for(const k in AUDIO_PACK) l.push(AUDIO_PACK[k]);'
    + 'for(const k in PROMPT_CLIPS) l.push(PROMPT_CLIPS[k]);'
    + 'for(const k in LETTER_CLIPS) l.push(LETTER_CLIPS[k]);'
    + 'for(const k in NUMBER_CLIPS) l.push(NUMBER_CLIPS[k]);'
    + 'for(const s of STEMS) l.push(s[1]);'
    + 'return l; })();');
  const clipList = [...new Set(w.__clips)];
  const missingClips = clipList.filter(p => !fs.existsSync(path.join(DIR, p)));
  ok(missingClips.length === 0,
     'all ' + clipList.length + ' referenced Luna clips exist on disk' + (missingClips.length ? ' — MISSING: ' + missingClips.slice(0,6).join(', ') + (missingClips.length>6?' +' + (missingClips.length-6) + ' more':'') : ''));
  // …and the dino art referenced by cards + worlds exists too.
  const artList = [];
  for (let i = 0; i < 10; i++) artList.push('art/dino-' + i + '.jpg', 'art/dino2-' + i + '.jpg');
  for (const k of worlds) artList.push('art/az-world-' + k + '.jpg');
  artList.push('art/az-hero.jpg');
  const missingArt = artList.filter(p => !fs.existsSync(path.join(DIR, p)));
  ok(missingArt.length === 0, 'all ' + artList.length + ' dino art files exist on disk' + (missingArt.length ? ' — MISSING: ' + missingArt.join(', ') : ''));

  // Registered in the hub + precached for offline.
  const hub = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
  ok(/Aziels-Dino-Quest\.html/.test(hub), "hub index.html links to Aziel's Dino Quest");
  const sw = fs.readFileSync(path.join(DIR, 'sw.js'), 'utf8');
  ok(/\.\/Aziels-Dino-Quest\.html/.test(sw), 'sw.js precaches Aziels-Dino-Quest.html');
  ok(/art\/dino-9\.jpg/.test(sw) && /art\/az-world-name\.jpg/.test(sw) && /art\/audio\/az-dinomite\.m4a/.test(sw) && /art\/audio\/l-z\.m4a/.test(sw) && /art\/audio\/n-20\.m4a/.test(sw),
     'sw.js precaches dino cards, world tiles and the full Aziel voice pack');
} catch (e) { ok(false, 'Aziel Dino Quest threw: ' + e.message); }

// ============================ summary ============================
console.log('\n' + (FAILS === 0 ? 'ALL CHECKS PASSED ✅' : FAILS + ' CHECK(S) FAILED ❌'));
process.exit(FAILS === 0 ? 0 : 1);
