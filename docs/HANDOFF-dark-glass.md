# Element 26 — finishing the dark glass redesign

You are picking up a half-finished visual redesign of a single-file training-log PWA.
Read this whole file before changing anything. It tells you what the app is, what has
been done, what is left, and the specific traps that have already cost time.

---

## 1. The project

- **Repo:** `brother12334/ShowcaseE26`. Work on branch
  `claude/element26-pdf-importer-timl9t`, and push to **both** that branch and `main`.
- **The app is one file:** `index.html`, ~76,000 lines, vanilla JS, `"use strict"`, no
  build step, no framework. One `<style>` block, one big `<script>`. State lives in a
  global `S`, persisted to `localStorage`. `render()` replaces `#app.innerHTML`.
- **Other files:** `sw.js` (service worker), `glass/` (the design package's code),
  `assets/` (the design package's art, 17 MB), `tests/` (329 specs), `docs/`, `tools/`,
  `proxy/`, `design/`.
- **Hosted** at `https://brother12334.github.io`.

### Non-negotiable project rules (the owner's, not suggestions)

1. **Every change is committed and pushed to BOTH `main` and the working branch.**
2. **`APP_VERSION` (index.html), `NEWS_FOR` (index.html) and `VERSION` (sw.js) bump on
   every release and never go backwards.** `NEWS_FOR` must equal `APP_VERSION`, and
   bumping it requires **adding a `NEWS` entry** describing the change in plain language.
   Current version: `2026.11.17.67`.
3. **Every change is verified by a Playwright spec plus the full suite (`node tests/run.js`)
   before pushing.** The suite takes ~25 minutes.
4. **Every spec carries a control that must fire.** A test that passes because its fixture
   is empty is worse than no test. This has caught four broken tests already.
5. **If you change an assertion instead of the code, the commit message must say why the
   old expectation was wrong.** This is enforced socially, and it matters — several
   assertions encoded bugs (e.g. a header that printed "1 sessions").
6. **Do not weaken `tests/specs/cssdupe.mjs`.** It forbids a class being defined in two
   feature sections. If you need to restyle a feature's element, change it **in that
   feature's own section** as a deliberate edit, one commit per feature. If a class is
   genuinely shared, create a new class for the redesign and migrate usages.
7. **Security (standing):** the User ID is an identifier, not a password; never put
   GitHub tokens/PATs or API keys in frontend code; never store credentials in
   localStorage; authorise on the backend for every request touching private data.
8. **Do not** rewrite working features unnecessarily, remove features because they are
   difficult, hide errors instead of fixing them, disable security checks, or delete user
   data to fix a bug.

### How to run things

```bash
node tests/run.js                 # the full suite, ~25 min, 329 specs
node tests/specs/<name>.mjs       # one spec
node tests/specs/cssdupe.mjs      # the CSS guard — run after every style change
```

Specs load the app over `file://` via `tests/specs/_e26.mjs`. **Specs that need the art
to load must serve over HTTP** — `tests/specs/dgtoday.mjs` starts its own `http.createServer`;
copy that pattern. Playwright lives at `/opt/node22/lib/node_modules/playwright/index.mjs`.

There is no syntax check for `index.html`. Use this:

```bash
node -e 'const fs=require("fs");fs.writeFileSync("/tmp/chk.js",
 [...fs.readFileSync("index.html","utf8").matchAll(/<script>([\s\S]*?)<\/script>/g)]
 .map(m=>m[1]).sort((a,b)=>b.length-a.length)[0])' && node --check /tmp/chk.js
```

---

## 2. The design package

Delivered as `element26-dark-glass.zip`. Its contents now live in the repo:

- `glass/` — `tokens.css`, `glass.css`, `intro.css`, `glass-config.js`, `layout.js`,
  `scene.js`, `glass-motion.js`, `intro.js`. **Kept as separate files on purpose**: the
  brief's acceptance criterion is that changing a number in `layout.js` or
  `glass-config.js` visibly changes the app, which only stays true if a designer can open
  the file the number is in.
- `assets/` — `heroes/` (still of each hero), `hero-video/` (looping mp4), `hero-overlays/`
  (glass only, for heroes whose number is live text), `shapes/` (12 stills + masks),
  `motion/` (36-frame spin sheets + masks), `body/`, `ui/` (pills), `fonts/`.

The original package (reference pages and target PNGs) is **not in the repo**. You need
`pages/*.html` and `mockups/*.png` from the zip — ask the owner for it. **The mockups are
the spec: if your screen differs from the PNG, your screen is wrong.**

### The brief's hard limits

- At most **6 shapes per screen, at most 3 spinning**.
- Nothing in the bottom 110px (the nav).
- Shapes never take taps (`pointer-events:none`) and are `aria-hidden`.
- Hero videos `muted playsinline`, paused off-screen.
- Text over glass keeps **4.5:1** contrast. **If a shape sits on text, move the shape.**
- All real content stays real text, readable by screen readers. The art is decoration.
- `prefers-reduced-motion` must be respected.

---

## 3. What is already done

**Today** is finished and matches `mockups/today.png`. Everything else has only its
**hero and header** converted — the content underneath is still the old app's markup with
the new font and surfaces applied.

| Screen | State |
|---|---|
| Today | **Done.** Matches the mockup. |
| Workout | Hero + header only. Content unconverted. **Start here.** |
| History | Hero + header + live number. Content unconverted. |
| Program | Hero + header. Content unconverted. |
| Research | Hero + header. Content unconverted. |
| Body | Header (no hero in `layout.js`). Figure recoloured. Content unconverted. |
| Settings | Hero + header. Tiles unconverted. |
| Rest day / Research paper / Settings rest timer | Not started. |

Also done: the floating glass **nav**, the **intro**, the Settings control as a glass bead,
and the Body figure's palette.

### Key code you will touch

- **`dgScreenHTML(opts, inner)`** — the shell every themed screen uses. Draws the scrim,
  the header (`title`, `right`), the hero spacer, and wraps `inner` in `.dg-body`.
  Options: `title`, `right`, `screen`, `heroH`, `heroWord`, `heroSays`, `live`.
- **`dgHeroH(screen)`** — reads the hero height from `layout.js` so the reserved space and
  the drawn art cannot drift apart.
- **`GLASS_READY`** — which screens get art. `1` = hero **and** shapes (screen is laid out
  to its mockup); `"hero"` = hero only, no body shapes. **Promote a screen to `1` only
  once its content is rebuilt and you have checked every shape against real content.**
- **`glassSceneFor()` / `glassSync()`** — choose and mount the scene. `glassSync` compares
  a key and returns immediately when the screen has not changed, because `render()` runs
  constantly.
- **`cycleSlots()`** — the cycle's facts (which day is current, whether a rest is being
  spent today or owed tomorrow). `plateStrip()` and `dgCycleHTML()` both read it. Do not
  duplicate this reasoning.
- **`.dg` / `.dg-screen`** CSS lives in the `DARK GLASS` section of the single stylesheet.

---

## 4. Traps that have already cost time — read these

1. **The artwork has data painted into it.** `hero-history.webp` has **41** in it.
   `hero-workout.webp` reads **18:42**. `hero-program.webp` says **"ppl."**. The day heroes
   say "push a.", "pull b." and so on. **Never show a baked number or word as if it were
   data.** That is why `layout.js` marks some heroes as `overlay`: the glass goes *on top
   of* the app's own live text. `GLASS_DAY` lists the only six days whose art may be used;
   `dgSplitIsPPL()` gates the Program hero.
2. **`layout.js` shape coordinates were drawn against the mockup's content**, not the
   app's. Dropped onto unconverted screens they land on buttons and sentences. Add shapes
   **last**, per screen, after the content is laid out, and re-check every one.
3. **Spin sheets are 320×320 per frame** (3840×960 ÷ 12 columns × 3 rows) and ~15 MB
   decoded. Shown at 250pt on a 3× phone that is a 2.3× upscale — blurry *and* heavy.
   **All shapes are currently `spin: false`**, drawing from the 500–550px stills, which are
   sharp. They still float, bob and parallax. To restore rotation, re-render the sheets at
   2× (`tools/README.md`) then set `spin: true`.
4. **The hero videos are 780×1280.** On a 430pt phone at 3× the browser needs 1290px, so
   the hero is upscaled ~1.65× and looks soft. **This can only be fixed by re-rendering the
   art larger** — tell the owner, do not try to sharpen it in CSS.
5. **The hero plays at `heroRate: 0.5`** (`glass-config.js`). The clips are 30fps and the
   rotation is fast; on a 60Hz screen that reads as steppy. Measured from a real device
   recording: playback is near-perfect, only three held frames in four seconds. The judder
   is the content, not dropped frames.
6. **Cost is compositing, not decoding.** The hero pauses while the page scrolls
   (`heroPauseOnScroll`) and when off-screen. Keep that.
7. **`#app` is `max-width:600px` and centred.** The glass layer is a sibling of `#app`
   inside `#stage`, and shapes are scaled as a group (`--dg-k`) because `layout.js` writes
   coordinates on a 390 canvas. The hero is deliberately **outside** that transform — a
   video under a scale transform in a clipped ancestor is the compositor's slow path.
8. **The entrance overshoots.** `glass.css` gives everything `cubic-bezier(.2,.9,.25,1.15)`,
   which takes scale past 1. On a full-bleed hero that made the picture wider than the
   window for 600ms and allowed sideways scroll. The hero uses a plain fade (`dgHeroIn`).
9. **286 of 328 specs reach into the DOM by selector.** Rebuilding a screen's markup
   will break specs. Expect it; fix them with a stated reason.
10. **Don't let the intro fire inside a spec.** It moves `#stage` into its own stage for
    three seconds. Specs that plant a state and render should set
    `S.introSeen = INTRO_GEN` in their fixture (see `dgtoday.mjs`).

---

## 5. What to do, in this order

For **each** screen, in this order — **Workout, History, Program, Research, Body,
Settings**, then **Rest day, Research paper, Settings rest timer**:

1. **Rebuild the content to match the mockup.** Same sections, same order, same grouping.
   Rebuild the markup if the old structure cannot express it. Copy structure, spacing and
   type values from `pages/<screen>.html`, not just colours.
   - Cards: frosted dark surface, 22px radius, 1px light border, 12px gap, 20px side
     padding (`tokens.css`).
   - Buttons and pills: the shapes in the mockup — large cream pill with a dark arrow
     circle for the main action, glass and purple pills for the cycle strip, toggles as in
     Settings.
   - Type: **Instrument Sans only**. Sizes and weights from the page. Small labels
     lowercase, **not** mono. Remove monospace styling.
   - Rows and lists: label left, value right, chevron — not the old table.
2. **Screenshot at 390 wide and compare to the PNG.** Fix every difference in layout,
   spacing, type size, card style, button shape and section order.
3. **Add the hero, then the shapes.** Shapes sit in front of the cards, in the margins and
   card gaps, off text. Put positions in `glass/layout.js`. Re-check each against real
   content. Then promote the screen in `GLASS_READY` from `"hero"` to `1`.
4. **Run the full suite.** Fix what breaks, with reasons.
5. **Show the owner before moving to the next screen.** They want to see each one.

### Still outstanding beyond the screens

- **A Replay control for the intro in Settings** — the brief asks for it and it is not
  built. `replayIntro()` exists; it needs a row in the Settings Help group.
- **Feature-owned classes still in mono** on themed screens: the record-book label
  (`.rs-k`, `.lc-k`), the deload note, `.day-open-n`, `.date`. Each must be changed in its
  own feature's section, one commit per feature (rule 6).
- **`prefers-reduced-motion`** — `scene.js` and `glass-motion.js` honour it; verify
  end-to-end and add a spec.
- **The owner's own task:** `npx wrangler deploy --config wrangler.research.toml`, pending
  since `.41`.

### Report back with

- A table: screen, matches mockup (yes / no / what differs).
- The list of feature-owned classes you changed and why.
- Anything you could not match, and what is blocking it.

**A screen is not finished because the hero works. It is finished when it looks like its
mockup.**

---

## 6. State at handoff

- Last commit: `1a9117a`, version `2026.11.17.67`, pushed to both branches.
- **That commit was not run against the full suite** — `cssdupe`, `dgtoday` and `navbar`
  pass. **Run `node tests/run.js` first and fix anything it finds before building on it.**
- The two changes in it: all shapes switched to stills (sharpness and weight), and the
  intro attempted from `render()` rather than once at startup.
- Open items are tracked in `docs/open-work.md`, item 30.
