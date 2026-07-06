# Adrian's Learning Games

Two **single-file** browser games for an early reader/math learner (kindergarten → 1st grade):

- `Adrians-Learning-Quest.html` — quiz-style trip through 9 "worlds" (numbers, phonics, **time** (analog clock), **money** (coins), calendar, shapes, colors, sight words, animals).
- `Word-and-Math-Blaster.html` — three mini-games from a menu: **Word Builder Lab** (tap letters to spell), **Read It Yourself** (decodable sentences), **Math Blaster** (Asteroids-style shooter).

Each game is one self-contained `.html` file — open it by double-clicking, no server or build step.

**Adaptive difficulty (i-Ready style):** the Quest keeps a per-world level 1–9 in localStorage
(`alq-lvl-<world>`; `getLevel`/`setLevel`/`onCorrectAdapt`/`onWrongAdapt`) — 3 correct in a row levels up,
a wrong answer eases down. The Blaster does the same for its math level (`wmb-math-lvl`,
`levelUp`/`levelDown`, via `game.streak`). Generators take a `level` arg and scale; called with no arg
(harness) they pick a random level so the numbers-to-100 benchmark still appears.

**Themes** (`THEMES`, shared across both games via the `alg-theme` key): space, baseball, golf, monster
(original "catch-ball" art — Pokémon-style but NOT Pokémon IP; never embed real Pokémon art). Themes change
colors, cheer phrases, and in the Blaster: sky (daytime for baseball/golf), ground scenery (`drawScene` —
stadium/fairway/crystal cave/planet horizon), target art (`drawTarget` — baseballs/golf balls/monster faces),
projectile (`drawShot`) and launcher (`drawLauncher`). Quest Number World mixes in themed story problems
(`STORY`, ~40% at level ≥2).

**Arcade extras** (identical module in both files — keep them in sync): `SFX` is a WebAudio synth with themed
sounds (`play('correct'|'wrong'|'shoot'|'explode'|'levelup'|'fanfare')`), guarded for the stub AudioContext,
mute persisted in `alg-sfx`. `COLLECT` is the collection meta-game: every correct answer calls
`COLLECT.addStar()` (`alg-stars`); every 12th star auto-unlocks a collectible (`alg-collection`) with a
celebration overlay (`#colParty`) — 4 sets × 10 items (`monsterSVG(i)` draws 10 original monsters; other sets
are emoji cards). Book overlay `#colBook`, floating button `#colBtn` (top-right). The Blaster pauses during
the ceremony via `COLLECT.onPause/onResume`.

**Voices**: `scoreVoice` strongly prefers downloaded "(Enhanced)/(Premium)" system voices (+14). Ava (Premium)
is installed on this Mac (Chrome must fully restart to see newly downloaded voices).

**Assessment layer (i-Ready-style)**: `REPORT` (identical module in both files) tags every answer to a
diagnostic domain — math: NO/ALG/MD/GEO; reading: PA/PH/HFW/VOC/COMP — via `BANKS[world].dom` + per-question
`q.dom` overrides (skip counting→ALG, rhyme/beginning sound→PA) and Blaster hooks (math→NO, spelling→PH/HFW,
Read It Yourself→COMP). Continuous play nudges a per-domain level (±1/3); data in `alg-report` with dated
snapshots (`hist`). The Quest's **🩺 Check-Up** (`startCheckup`) is a mini-CAT modeled on the i-Ready
Diagnostic: 18 interleaved questions, ±1 level per answer, **no right/wrong reveal**, untimed, ends with
`REPORT.setLevels` (only domains actually asked), syncs world levels, and opens the report.
The **📊 report** (`REPORT.show()`, `#repBtn`) mirrors the i-Ready Family Report: per-domain placement
("Emerging K"…"Grade 2+"), relative placement chips vs. the grade set in `alg-grade` (Above/On/One Below/Two+
Below), accuracy, on-grade band bars, growth vs Typical (+2) / Stretch (+3.5) yearly targets, Can-Do/Next-Steps
(`SKILLS`, CA Common Core K-1 aligned), and print support. It is clearly labeled NOT an official i-Ready score.

## Verification Protocol

`verify.mjs` loads both games into a headless DOM (jsdom) and exercises their real logic.
Run it after every change:

```sh
npm install jsdom   # first time only
node verify.mjs     # exits 0 when every check passes
```

Rules that keep the harness meaningful:

1. **Never stub `localStorage`** in the harness — saving progress with a normal `localStorage` is exactly
   the failure mode we guard against. Only canvas/audio/speech are stubbed.
2. The games must **not depend on `requestAnimationFrame`, `setTimeout`, or `DOMContentLoaded`** to set up
   state the harness reads — initialize synchronously at the end of the inline `<script>`. Animations may use
   rAF (it's a no-op under test); game state must be ready the instant the script finishes.
3. Avoid browser APIs jsdom doesn't implement (`matchMedia`, `ResizeObserver`, `IntersectionObserver`); guard
   any optional API with a `typeof`/`if` check so a missing one never throws.
4. **Add a check to `verify.mjs` whenever you add behavior.** The harness is the spec.

### Contract the harness depends on

`Adrians-Learning-Quest.html` (global scope): `BANKS` (9 worlds), `cur` (`.q.right`, `.i`),
`startGame()`, `startRound(world)`, `nextQuestion()`, `genMath()/genPhonics()/genCalendar()/genTime()/genMoney()`
(each returns `{q, right, choices, pic?}`; `pic` is an SVG data-URI clock/coins rendered into `#qpic`).
Answers render as `#answers .ans` buttons — choices unique, always include the right answer.

`Word-and-Math-Blaster.html` (global scope): `builder` (`.round = {type, word, blank?}`), `reader`
(`.read`, `.stars`), `game` (`.lives`, `.score`, `.rocks[].correct`), `makeMath(level)` / `makeWord(level)`
(each returns `{answer, choices:[{label}]}` with the answer among 4 unique choices), plus
`nextWord()`, `iReadIt()`, `resolveRock(rock)`, `newWave()`. A `#menu` holds `.btn` buttons whose text
matches `Word Builder`, `Read It Yourself`, `Math Blaster`. Letter tiles are `#bTray .tile` (uppercase,
`disabled` once used); sentence words are `#rText .rword`.

Math Blaster is a canvas shooter: meteors (`game.rocks`, each with `.x/.y/.vy/.r`) fall onto `#bCanvas`,
a ship (`game.ship`) fires lasers (`game.lasers`); `update(dt)`/`fire()`/`shootAt(x,y)` run the loop
(rAF-driven, so it's idle under the harness — `update` is called manually in the laser-hit check).
Word Builder shows a **picture + audio cue**, never the spelled-out word (sight words get a Peek button).
Picture cues are **embedded images** (`var PICS`, base64 data URIs rendered as `#bCue img.cuePhoto`): real CC0/
Public-Domain photos for concrete words and original SVGs for sun/star/rain. Attribution is in `PHOTO-CREDITS.md`.
To re-source or add photos, re-run the staging scripts under the session scratchpad (`fetch.py` → view → `build_pics.py`).
Both games rank TTS voices via `scoreVoice()` and expose a `#voicePick` `<select>` so you can swap off the
robotic default; `getVoices()` is `[]` under the harness, so every voice path is guarded.
