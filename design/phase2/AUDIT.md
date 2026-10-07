# ELEMENT 26 — PHASE 2 DESIGN AUDIT

**Nothing in this document has been implemented.** `index.html` is untouched. Everything
here is a proposal with an APPROVE / DECLINE line at the end of it.

The "after" images are not drawings. Each one is the real `index.html`, loaded in a real
browser with a real 30-week training history, rearranged in the page — same typeface,
same colours, same components, same figures. If it is in an image here, it is buildable,
because it was built to take the photograph.

Harness: `tools/inspect/`. Images: `design/phase2/`.

---

## PART 1 — WHAT I FOUND

### 1.1 What was inspected

| Pass | What | Count |
|---|---|---|
| `tabs.mjs` | Every tab, every settings sub-page, full-page | 17 screens |
| `scroll.mjs` | The long tabs, frame by frame as you scroll them | 22 frames |
| `workout.mjs` | Preflight → first set → rest → mid → done → superset → unilateral → focus → finish → grade | 17 states |
| `sheets.mjs` | Every modal, sheet and overlay opener in the file | 46 interfaces |
| `empty.mjs` | First open, onboarding, empty tabs, interrupted, rest day, finish-with-nothing | 14 states |
| `measure.mjs` | Scroll depth, type styles, control counts, fold positions | — |
| `perf.mjs` | Render cost per screen | — |

### 1.2 The numbers

| Tab | Height | Screens | Type styles | Words | Controls |
|---|---|---|---|---|---|
| Today | 1,803px | 2.1 | 13 | 230 | 11 |
| History | **16,954px** | **20.1** | 16 | 2,549 | **1,572** |
| Body | 4,365px | 5.2 | **23** | 744 | 22 |
| Program | 3,505px | 4.2 | 11 | 390 | 43 |
| Settings | 1,134px | 1.3 | 5 | 71 | 12 |

Render cost, mean of five, on a desktop-class CPU:

```
today 14.9ms   history 105.7ms   body 47.9ms   program 11.8ms   workout 19.6ms
```

History costs 106ms every time it draws, because it draws all 115 sessions every time.
On a mid-range phone that is a third to half a second of blank.

The logger: 6 exercise cards, **20 set rows**, 48px each, 3 inputs per row, first row at
y=575, **4.1 screens** for one session.

The Body figure: **2,384px down the page — 55% of the way — and 179px wide** on a 390px
screen.

Motion: **104 `@keyframes`, 31 distinct easing curves, ~40 distinct durations.** 24
`transition` declarations animate `border-color`; only **14** animate `transform`. The
app animates colour, not space.

### 1.3 The seven findings

**F1 — The logger is a spreadsheet.** Twenty rows that look identical whether they are
done, current or hypothetical. Set 1 and set 4 differ by a small number in a 22px column.
Standing at a rack, "where am I" takes a conscious read every time. Four input
affordances per row (lbs, reps, RPE target chip, RPE select) all drawn at the same weight.

**F2 — Rest is a white disc.** The plate dial is a genuinely distinctive idea and it is
the brightest surface in a dark product — a 660px cream circle. Its progress indicator is
a ~40px white chip on a white plate, so the shape tells you nothing; the number is doing
all the work, and by default it counts **up**, away from a target you cannot see. It
carries no load, no rep target, no previous performance — nothing you are actually
resting *for*.

**F3 — Body buries the one thing nobody else has.** The anatomy figures are the signature
asset. They sit below four generic metric cards (Recovery / Tiredness / Training load /
Sleep), at half width, rendered near-black on near-black for the default metric — the
screen reads as an empty silhouette. 23 distinct type styles compete above them.

**F4 — History is a database with no story.** 115 identical cards, 20 screens, 1,572
focusable controls in one view. Every card repeats the same four facts. Nowhere on the
screen can you see a lift getting heavier, which is the only question anyone opens this
tab to ask. The Record Book is a separate card that has to be entered.

**F5 — Everything is a card.** One container — a bordered rounded rectangle — does every
job in the app, so nothing has rank. Today spends its first 480px on three stacked status
containers before it says what you are doing. Program draws 24 of them. This is the
pattern your brief lists as an AI tell ("every section inside a rounded rectangle"), and
Element 26 has it honestly rather than by imitation, which does not make it read any
differently.

**F6 — Motion has 104 pieces and no system.** Tab changes already carry a directional
staggered arrival, which is good and stays. Almost nothing else has continuity: starting
a workout, finishing a set, entering rest, finishing an exercise, opening a muscle, and
opening a session all swap one thing for another with no relationship shown. The
structural reason is that `render()` replaces `app.innerHTML` wholesale, so every element
is destroyed and rebuilt — continuity is impossible unless specific surfaces opt out of
that. The logger already opts out (it must, or your half-typed numbers would vanish), so
the precedent exists.

**F7 — The copy leaks the engine.** "The work got done, but value leaked out. Weakest
section was completion, 2.1 of 14." "A TARGET YOUR LOG DISAGREES WITH." "0 of 4 done · 3
rests a cycle, scheduled." These are internal scoring terms shown to a person who just
finished training.

### 1.4 Two honest corrections to the brief

**Rankings, leaderboards and social do not exist in Element 26.** Zero occurrences. §21
asks me to inspect whether rankings feel competitive and fair; there is nothing to
inspect. Proposal R below gives you the decision rather than inventing the feature.

**There is no coaching destination, and I think that is correct.** Coaching is
distributed — the Body verdict, "worth a look", the plan check, the preflight note, the
grade card, the inline tips. §19 asks for coaching to feel contextual rather than like a
chatbot pasted in; it already is. What it needs is consistency of voice and form, which
is Proposal G, not a new screen.

### 1.5 One bug found while looking

In a live session the tab bar shows six items at 390px and the active "WORKOUT" pill
overlaps the HISTORY label. Visible in `A-logger-BEFORE.png`. Not a redesign — a fix,
and I will take it whether or not any of this is approved.

---

## PART 2 — THE MOTION SYSTEM

This is the spine. Every proposal below references it, and it is what stops the result
looking like animation for its own sake.

**Six roles. A thing may only move for one of these reasons.**

| Role | What it is for | Duration | Curve | Properties |
|---|---|---|---|---|
| **Response** | You touched it | 90–120ms | `ease-out` | `transform` only |
| **Reveal** | Something arrived from an edge it belongs to | 220–280ms | `(.2,.9,.25,1)` | `transform`, `opacity` |
| **Navigate** | You went somewhere | 260ms, 22ms stagger | `(.2,.8,.3,1)` | `transform`, `opacity` |
| **Transform** | A thing became another thing | 280–340ms | `(.2,.8,.3,1)` | `transform`, size — **never opacity on the subject** |
| **Time** | Real time is passing | real-time | **linear** | the one place easing is forbidden |
| **Consequence** | A number changed because of what you did | 400–900ms | hold, then in-out | opacity, the number itself |

**The rules that keep it restrained:**

1. One Transform on screen at a time. Two things becoming two other things at once is a
   screensaver.
2. Nothing animates more than three properties.
3. Nothing over 400ms except Consequence, which is rare and earned (a grade, a record, a
   landmark moving).
4. Everything is interruptible. Tapping during a transition takes the tap.
5. Reverse is the same motion backwards, never a different animation.
6. Under `prefers-reduced-motion`, Response and Time survive; everything else becomes an
   instant state change. (Already the rule in the file; it stays.)
7. **Consequence is never decorative.** If the number did not change because of something
   you did, it does not get a Consequence.

What this replaces: 31 easing curves become 4. ~40 durations become 6 bands. The 104
keyframes do not all get deleted — the feature-specific ones (the mark, the preflight,
the importer) keep their own identity — but every *new* motion in this phase comes from
the table above, and the general-purpose ones get folded into it.

---

## PART 3 — THE PROPOSALS

Priorities are ranked by: how often the screen is used × how much of the training
workflow depends on it × how much of the improvement is visible.

---

### PROPOSAL A — THE SESSION — *Critical*

**Image: `P1-logger.png`, `M1-set-completion.png`**

#### The decision, with real options

**A-1 — THE STACK (recommended).** The session is a vertical timeline that compacts
behind you and ahead of you. Only the set you are on is a form. Sets behind it are
records. Sets ahead of it are prescriptions. Exercises behind you are one line each;
exercises ahead of you are one line each.
- *Philosophy:* the screen should be mostly "now".
- *Visual:* unchanged vocabulary, radically changed density.
- *Motion:* Transform. Rows promote and demote; cards collapse and expand.
- *Advantage:* the whole session fits on one screen; editing anything is still one tap;
  nothing is hidden, only compacted.
- *Trade-off:* people who scan ahead mid-session now tap to expand.
- *Who benefits:* everybody, most of all beginners who currently cannot tell which row is
  theirs.

**A-2 — GYM MODE.** One exercise, one set, full screen. The session becomes a single
surface that changes state: set → rest → next set are the same component. A rail of marks
at the top is the whole session, tappable to jump.
- *Advantage:* the most focused possible interface; rest stops being a modal by
  definition.
- *Trade-off:* reviewing and correcting earlier work is genuinely harder.
- *Note:* this already exists, half-built and hidden, as `S.viewMode === "focus"`.
- *Who benefits:* experienced lifters running heavy singles and doubles.

**A-3 — Keep and polish.** Not recommended: the density is the problem, and polish does
not change density.

**My recommendation: build A-1 as the default, and promote the existing focus mode into
A-2 as a first-class "Gym mode" toggle.** Both users exist, the app already contains both
ideas, and one of them is currently a hidden preference.

#### BEFORE
Six cards, 20 rows, 4.1 screens. Every row: `[lbs] [reps] [rpe chip] [RPE ▾] [✓]`. Logged
sets stay full-size, dimmed to 62%. The RPE column header wraps to two lines. Four large
green ticks dominate a completed card.

#### AFTER
A session rail across the top: every set in the session as a mark, grouped by exercise,
filled as you go, with the live one raised. One line per finished exercise
(`DONE · Barbell Bench Press · 185 × 8,8,8,8`). One line per upcoming exercise. The
current exercise as a card with one cue line — **`185 lb / set 3 of 4 / 6–10 reps /
RPE 8`** — then its logged sets as records, its live set as the only form on the screen
(58px inputs, up from 48px), and its remaining sets as prescriptions at 45% opacity.

#### MOTION BEFORE
Tick turns green, pops once (0.32s). Everything else is instant. Rest appears as a
full-screen modal over a blurred page.

#### MOTION AFTER — the signature moment
Five stages, 0–600ms, in `M1-set-completion.png`:

1. **0ms** — one form on the screen.
2. **0–120ms** *(Response)* — the tick takes the accent; the row does not move.
3. **120–260ms** *(Transform)* — a 1px accent rule sweeps left→right under the row.
   Banked. This is the "locked in" moment, and it is a line, not a flash.
4. **260–480ms** *(Transform)* — the row collapses into its own record: the input boxes
   shrink to line height and lose their fills **while the numbers stay exactly where they
   are**. Nothing fades out and back in. Simultaneously the next row promotes — gains the
   copper edge, comes up to full opacity.
5. **300–600ms** *(Transform)* — **the tick you pressed becomes the rest clock.** It
   grows in place from a 52px control to a 200px dial. Nothing slides in from an edge.

Backwards (undo): the same five stages reversed, 220ms, no new animation.
Interruptible throughout: tapping the next row during stage 4 takes the tap.

#### WHY
Set completion is the single most-repeated interaction in the product — 20 times a
session, ~80 times a week. Today it reads as ticking a checkbox on a form. The row that
held your numbers should become the record of your numbers, and the control you pressed
should become the thing you are now waiting on, because that is literally what happened.

#### WHAT CHANGED
Density (4.1 screens → ~1.2); which rows are forms (all → one); exercise state (uniform →
done/now/next); the session rail (new); set completion (colour change → transform);
rest entry (modal → growth from the tick).

#### WHAT STAYED
Every number, every control, every rule. The mono numerals, the copper accent, the card,
the radii, the day colours, the ⋯ overflow, the warm-up ramp, the plate line, the asym
cap, the superset card, the per-set notes, the undo rules, the rest locks. Tapping any
record or prescription row expands it to the full form, so nothing has become
unreachable.

#### WHY IT FEELS BETTER
You stop looking for your place. The screen answers "what now" in one line instead of
twenty rows. And the one thing you do eighty times a week acquires a physical
consequence instead of a colour change.

#### IDENTITY
This is more Element 26, not less: mono numerals doing the work, a technical readout
instead of a web form, nothing decorative added. No new colour, no new shape, no gradient.

**PRIORITY: Critical**
**DECISION: APPROVE / DECLINE** — and if approved, state A-1, A-2, or both.

---

### PROPOSAL B — REST — *Critical*

**Image: `P2-rest.png`**

#### BEFORE
A 660px cream plate on a blurred session. Progress is a ~40px white chip on a white face.
The clock counts up by default. Below it: "UP NEXT", the exercise name, "Set 2 of 4 ·
5-8 reps", and one button.

#### AFTER
The plate survives — it is identity — and becomes **steel**: a dark machined disc with
eight spokes, and a **copper rim that fills as the rest runs**. The rim is the clock.
Counts **down** by default. Three controls: −30s, +30s, skip.

Underneath, what you are resting *for*, which is the whole point of the pause:
**`185 lb · 5–8 reps · last 185 × 8 @8 · 45 + 25 a side`**.

Above it, in dimmed type, what you are resting *from*:
`Barbell Bench Press · set 1 · 185 × 8 @8`.

It is not a modal. The session is still there, receded, not blurred.

#### MOTION BEFORE
Appears instantly as a fixed overlay. A ring sweep updates on a 250ms interval. A hub
"pop" on each minute boundary. Dismissal is instant.

#### MOTION AFTER
- **Entry** *(Transform)* — grows out of the tick you pressed. 300ms. See Proposal A.
- **Running** *(Time)* — the rim is **linear**. Real time must not be eased; an eased
  clock is a lying clock.
- **Last ten seconds** — the rim does not flash or pulse. The hub number changes weight
  from regular to medium. That is all.
- **Zero** *(Consequence)* — the rim completes and holds for 400ms, then the dial
  contracts back toward the row it came from and the next set's row lights up underneath.
  The eye is handed from the clock to the row.
- **Skip** — the same contraction, 180ms, no completion hold.

#### WHY
Rest is a third of the time you spend in this app and currently it is a blank bright
screen with one fact on it. The one piece of information that matters at that moment —
what to load for the next set, and what you did last time — is a scroll away behind the
timer.

#### WHAT CHANGED
Plate material (paper → steel); progress (unreadable chip → the rim); direction (up →
down); content (nothing → the next set, last time, the bar loading); presentation (modal
over blur → a phase of the session); controls (one → four).

#### WHAT STAYED
The plate. The idea that a weight plate is the clock is the best single piece of visual
thinking in this product and it is not going anywhere. The mini-pill mode stays. The rest
alert, the overtime state, the rest-discipline grading, the locks — all unchanged.

#### WHY IT FEELS BETTER
You can read the time left from across a bench without reading a number. The screen stops
being the brightest thing in a dark gym. And it finally answers the question you are
holding a plate to ask.

#### IDENTITY
Steel and copper is exactly the Element 26 palette. A dark plate with a copper rim is
closer to the product's own idea of itself than a white one.

**PRIORITY: Critical**
**DECISION: APPROVE / DECLINE**

---

### PROPOSAL C — BODY — *High*

**Image: `P3-body.png`**

#### The decision

**C-1 — THE FIGURE IS THE PAGE (recommended).** The anatomy map is the first thing on the
screen, at full width, and every other number on the tab is a way of colouring it.

**C-2 — The improved dashboard.** Keep the four metric cards, fix the figure where it is.
Not recommended: it leaves the one asset nobody else has at 55% scroll depth.

#### BEFORE
"Doing fine", four metric cards in a 2×2 grid, a "what this means" panel, a 7-item "worth
a look" list, two trend charts (one of which plots a saw-tooth and labels it "FALLING"),
a 9-row statistics list — and then, 2,384px down, two 179px figures drawn in near-black.

#### AFTER
Header, then a four-way segmented control — **Fatigue / Volume / Recovery / Growth** —
then the figures at full width, front and back, with every muscle legible: an untrained
muscle is **steel with a visible edge**, never the background colour. Below: a four-item
key, then the same data as a ranked list using the periodic squares that already exist in
the Program tab.

The four metric cards do not disappear — they *become* the segmented control. Each one was
a number plus a sentence about the whole body; now each is a way of seeing it per muscle.

#### MOTION BEFORE
The figure fades in with the rest of the page. Switching metric re-renders the tab.

#### MOTION AFTER
- **Switching metric** *(Transform, 240ms)* — the figure does not redraw. The fills
  cross-fade in place. The code already supports this: `bmPaint()` exists specifically to
  repaint without rebuilding, and its own comment says so.
- **Tapping a muscle** *(Transform, 300ms)* — that muscle's shape lifts out of the figure
  and lands as the sheet's heading, the way the periodic square already flies into the
  volume sheet (shipped in v50.0). The sheet about your chest finally shows a chest.
- **Front/back** — a 260ms rotation, not a swap.
- **Arriving on the tab** *(Navigate)* — the figure is already drawn; the muscles take
  their colours in a 180ms stagger, back to front. Once, on arrival.

#### WHY
This is the most distinctive thing Element 26 owns and it is presented as a diagram at
the bottom of a report. Everything above it is a number that would be more useful painted
onto it.

#### WHAT CHANGED
Order (figure last → figure first); size (179px → full width); the untrained fill
(invisible → steel); four cards → one control; the statistics list → a ranked list;
metric switching → a recolour instead of a redraw.

#### WHAT STAYED
Every figure path, every muscle group, every metric, every verdict, the colour semantics
(green fresh / amber working / red needs a break / grey untrained), the group and head
sheets, the priority block, the niggles, the landmark editing. The 23 type styles come
down, which is a reduction, not a replacement.

#### WHY IT FEELS BETTER
You see your whole training state in one glance, on a picture of yourself, instead of
reading nine rows of statistics to assemble it.

#### IDENTITY
The figures *are* the identity. This is the proposal that makes the app look most like
itself.

**PRIORITY: High**
**DECISION: APPROVE / DECLINE**

---

### PROPOSAL D — HISTORY — *High*

**Image: `P4-history.png`**

#### The decision

**D-1 — LIFTS FIRST (recommended).** Three segments: **Lifts / Sessions / Records**. Lifts
opens by default: one row per movement, with how much it has gone up and the shape of the
climb as a sparkline. Sessions keeps today's list, lazily rendered. Records is the
existing record book.

**D-2 — Weeks first.** The 18-week grid is already the best thing on the tab; make it the
spine and expand a week in place. Good, but it answers "did I train" rather than "am I
getting stronger".

#### BEFORE
115 identical cards, 20.1 screens, 1,572 controls, 106ms per render. Each card: day dot,
day name, date, volume, a feel emoji, and a pill with the top set.

#### AFTER
`HISTORY · 115 sessions · 30 weeks`, a three-way segment, this week's seven marks, and
then your lifts: **`Conventional Deadlift · +40 lb over 16 sessions · [sparkline] · 315`**.
Seven rows answer the question the whole tab exists for. Sessions and Records are one tap
away and render lazily — which also takes 106ms down to roughly 15ms.

#### MOTION BEFORE
The whole list fades in together. Opening a session is an instant sheet.

#### MOTION AFTER
- **Arriving** *(Navigate)* — rows stagger 22ms. The sparklines **draw** left to right
  over 420ms, once, on arrival only. A line that draws itself is a line you read.
- **Tapping a lift** *(Transform)* — the sparkline expands into the full chart. The row's
  line is the chart's line; it does not fade out and a chart fade in.
- **Switching segment** *(Navigate)* — directional, matching the tab-bar grammar that
  already exists.
- **Scrolling Sessions** — no animation at all. A list you are flicking through must not
  animate; that is what makes long lists feel slow.

#### WHY
Nobody opens History to re-read Tuesday. They open it to find out whether the work is
working, and that question is currently answered by a card you have to know to look for.

#### WHAT CHANGED
What the tab is about (sessions → lifts); 20 screens → 2; 1,572 controls → ~40; 106ms →
~15ms; the record book from a card to a destination.

#### WHAT STAYED
Every session, every record, the week grid, the "weeks on target" machinery, the search,
the session editor. Nothing is deleted — one thing is promoted.

#### WHY IT FEELS BETTER
It answers the question in the first screen, and it stops being the slowest screen in the
app.

#### IDENTITY
Mono numerals, copper line, no chart furniture — no axes, no gridlines, no legend. A
technical readout, which is what this product sounds like.

**PRIORITY: High**
**DECISION: APPROVE / DECLINE**

---

### PROPOSAL E — TODAY — *High*

**Image: `P5-today.png`**

#### BEFORE
Masthead, a floating streak pill, a dashed-bordered cycle container with a "reset cycle"
link, then — 480px down — the day card, and under it a coaching card with a five-line
paragraph before the exercise list begins.

#### AFTER
One status line: the cycle tiles in their day colours, at status-row size, with the week
count on the right. Then **the day as the screen** — a dark wash of the day's own colour,
the name at 38px, three stats. Then the coaching as one line with the explanation one tap
behind it. Then what is in the session, as a plain numbered list. And **START fixed to the
bottom**, so the decision is never scrolled away from.

The dashed borders go. A dashed rectangle reads as a placeholder or a drop zone in every
other piece of software a person uses.

#### MOTION BEFORE
Cards stagger in on arrival (good, stays). The start button is static. Starting a workout
cuts to a separate full-screen preflight.

#### MOTION AFTER
- **Arriving** *(Navigate)* — unchanged, it already works.
- **Start** *(Transform, 340ms)* — the day field **expands** into the preflight: the same
  colour, the same name, the same three stats, growing from the card into the full-screen
  moment. Today these are two separate screens that happen to contain the same three
  facts. The preflight is the best screen in the app and it should look like it came from
  the one before it.
- **Preflight → session** *(Navigate, 260ms)* — the preflight lifts and the session
  arrives underneath, the direction you are travelling.

#### WHY
Home is a decision, and the decision currently happens 480px below three pieces of status.

#### WHAT CHANGED
Status: two containers → one line. The day: a card → the screen. Coaching: a paragraph →
a line with a disclosure. The action: scrolls → fixed. Dashed borders: removed.

#### WHAT STAYED
The wordmark, the date, the cycle tiles and their colours, the hatched rest days, the
week count, the day colour, the three stats, the exercise preview, every piece of
coaching content.

#### WHY IT FEELS BETTER
One screen, one decision, and the thing you came to press is always under your thumb.

#### IDENTITY
The periodic tiles stay, the day colours stay and get used more confidently, the mono
voice stays.

**PRIORITY: High**
**DECISION: APPROVE / DECLINE**

---

### PROPOSAL F — THE CONTAINER SYSTEM — *High*

*Specified, not yet mocked — it is the rule the other proposals are already obeying.*

#### BEFORE
One container does everything: a bordered rounded rectangle. Today stacks three before the
action; Program draws 24; Body puts four in a grid. Nothing has rank because everything
has the same frame.

#### AFTER — four containers, each with one job
1. **The field** — full-bleed, a colour wash, no border. For the one thing this screen is
   about. One per screen, maximum.
2. **The card** — the current border and radius. For a thing you act on.
3. **The row** — a hairline rule, no box. For a list of comparable things.
4. **The rule** — a label and a line, no container at all. For a group of rows.

A screen may use a field once, and should mostly be rows.

#### MOTION
No motion of its own. It is what lets the other motion read: you cannot promote a card
above its neighbours when every neighbour is the same card.

#### WHY
It is the difference between "designed" and "assembled", and it is the specific pattern
your brief names as an AI tell.

#### WHAT STAYS
Radii, borders, the card itself, spacing rhythm, the type scale, every colour.

**PRIORITY: High**
**DECISION: APPROVE / DECLINE**

---

### PROPOSAL G — THE VOICE — *Medium*

*Specified, not mocked — it is text.*

A pass over every string, against four rules:

1. **Never show the engine.** "The work got done, but value leaked out. Weakest section
   was completion, 2.1 of 14" → "You finished 65 of 88 planned reps. The last two
   exercises are where it went."
2. **A label is a noun, a button is a verb.** "A TARGET YOUR LOG DISAGREES WITH" →
   "Your mid back has outgrown its target".
3. **Say the number before the explanation.** Today most cards explain, then state.
4. **No sentence that exists to be reassuring.** "Nothing wrong — you're not fully
   recovered from your last few sessions" says two opposite things.

Scope: ~180 strings. Terminology (RPE, MEV/MAV/MRV, effective sets) does not change —
it is correct and it is the product's register.

**PRIORITY: Medium**
**DECISION: APPROVE / DECLINE**

---

### PROPOSAL H — THE SHEET SYSTEM — *Medium*

*Specified, not mocked.*

46 sheets, from 226px to 1,657px tall. They are the best thinking in the product and they
are inconsistent: some lead with a verdict, some with a paragraph; some have an action
bar, some have a Done button; one of them renders a native green OS checkbox.

**AFTER:** three sheet sizes — **a prompt** (one question, one or two actions, no
scroll), **a sheet** (half-height, scrolls, a fixed action bar), **a page** (full-height,
its own header with a back affordance). Every sheet opens with its subject and verdict in
the first 120px. Native form controls get the product's own treatment.

**MOTION:** the three sizes get three Reveal distances. A prompt rises 16px, a sheet 26px
(today's), a page 100%. Size tells you how much is behind it before you read anything.

**PRIORITY: Medium**
**DECISION: APPROVE / DECLINE**

---

### PROPOSAL R — RANKINGS AND SOCIAL — *the decision is yours*

Element 26 has no rankings, leaderboards or social features. Three options:

**R-1 — Don't build them (my recommendation).** This product's distinguishing claim is
that it is a serious training system that tells you the truth about your own training. A
leaderboard changes what people optimise for, and "Instagram with weights" is the failure
mode your own brief names. The existing coach link — a read-only share of your training —
is the socially useful version and it already exists.

**R-2 — Rank yourself against yourself.** Your lifts against your own history, your
consistency against your own best run. No other people. Fits the product exactly;
most of the data already exists.

**R-3 — Build real social.** Friends, feeds, comparisons. A large piece of work, a server,
a moderation surface, and a different product.

**PRIORITY: Low (R-1) / Medium (R-2)**
**DECISION: R-1 / R-2 / R-3**

---

## PART 4 — THE FULL FLOW, BEFORE AND AFTER

```
BEFORE                              AFTER
──────                              ─────
Today  (3 status blocks first)      Today  (one status line, the day is the screen)
   ↓ cut                               ↓ the day field EXPANDS into it (340ms)
Preflight (good, unrelated)         Preflight (same colour, same stats, grown)
   ↓ cut                               ↓ lifts away, the session arrives under it
Session (6 cards, 20 rows, 4.1      Session (a rail, done lines, one live card,
   screens, all rows identical)        one form, 1.2 screens)
   ↓ tick turns green                  ↓ press → sweep → the row becomes its record
   ↓ modal appears over a blur         ↓ the tick GROWS into the clock
Rest (white disc, counts up,        Rest (steel plate, copper rim counts down,
   says nothing)                       says what to load and what you did last time)
   ↓ modal disappears                  ↓ the dial contracts back to the row
Next set (identical row)            Next set (the row is already lit)
   ↓ nothing                           ↓ the exercise collapses, the next promotes
Next exercise (identical card)      Next exercise (expanded in place, the rail moves on)
   ↓                                   ↓
Finish → grade → score card         Finish → grade → the muscles you trained light up
   (a number, then a 2×2 grid)         on the figure → the card
```

---

## PART 5 — WHAT I AM ASKING FOR

Approve or decline each of A, B, C, D, E, F, G, H, and pick R-1/R-2/R-3.

For A, C and D, also pick the direction (A-1 / A-2 / both; C-1 / C-2; D-1 / D-2).

The motion system in Part 2 is not a separate approval — approving any of A–E approves
the parts of it that proposal uses. If you want to approve the motion system *only*, say
so and I will apply it to what already exists without changing any layout.

**Not drawn yet:** F, G, H, the completion sequence, Program, and the sheets. If you want
images of those before deciding, say which and I will build them the same way — nothing
gets implemented either way until you say so.

---

# PART 6 — WHAT SHIPPED

Approved: A, B, C, D, F, G, H, R-1. Declined: E (Today), which is untouched.

Directions taken, as recommended: A-1 **and** A-2, C-1, D-1, R-1.

## The measured result

| | Before | After |
|---|---|---|
| Session | 3,458px · 4.1 screens · 20 rows that are all forms | 1,593px · 1.9 screens · **1 form** |
| History | 16,954px · 20.1 screens · 1,572 controls · 105.7ms | 1,079px · 1.3 screens · 17 controls · **5.2ms** |
| Body figure | 2,384px down (55%), fills `#NaNNaNNaN` | first screen, **in colour** |
| Rest rim | `(sec % 60) / 60` — the current minute | this rest, either direction |
| Tab bar mid-session | pair 181px, HISTORY clipped | pair 138px, every label clear |

## Three things that were bugs, not design

1. **`#NaNNaNNaN`.** `C_OK`, `C_WARN`, `C_BAD` and `C_FLAT` were CSS variables, and
   `ramp()` interpolates by reading colour channels: `hex2rgb("var(--ok)")` parses `va` as
   hexadecimal. Every muscle whose colour came off a ramp — tiredness, recovery, injury
   risk, growth — was filled with an invalid colour, which paints black. The signature
   asset of this product was a black silhouette, and the only visible patches were the
   muscles with *no* data, because those take a fixed hex. One `const` brought the whole
   map back.
2. **The rest rim measured the wrong thing** — `(sec % 60) / 60`, a sweep of the current
   minute, on a dial people read to find out how much rest is left.
3. **"Live" was asked of each exercise, not of the session**, so opening a card three
   movements ahead lit a copper edge on a row you are not on.

## Where I departed from what I proposed, and why

- **The tick becomes the *pill*, not the dial.** Building it showed the full dial covers
  the card, and the reason the clock is a pill by default is that you have to go on using
  the session while it runs. So the tick grows into the pill and the pill grows into the
  dial. Same continuity, no behaviour lost.
- **Body's ranked bar list was not built.** The Program tab's plan check is already
  exactly that list, for the same muscles, with the same squares. A second copy on Body
  would be duplication, not a feature.
- **F is applied, not finished.** The four containers are defined and adopted by the
  screens this phase rebuilt. Pushing them through all 58,000 lines in one pass would be
  a rewrite of every screen including the one you declined; the rest adopt it as they are
  rebuilt.
- **G is the worst offenders, not all ~180 strings.** The score card's "value leaked
  out" and "weakest section was completion, 2.1 of 14", the Body verdict that said two
  opposite things in nine words, "a target your log disagrees with", and the cycle line
  that read as a field name. The rest of the pass remains.
- **R-1 means nothing was built**, which is the recommendation you accepted.

## New tests

`motion`, `logger`, `rest2`, `bodymap`, `histlift`, `sheets` — all in the required
manifest. They pin the things that would otherwise drift back: no clock is eased, no
muscle fill is `NaN`, no nav label is covered, a confirm is a prompt, and the logging
screen is a form all the way down.

# PART 7 — WHAT WAS REVERTED

## Proposal A, the session as a stack — TAKEN OUT (v53.2)

Shipped in v51.0 and removed after use. The verdict from the person who trains on it was
that the logging screen had become **confusing**, and that is the only verdict that
counts for a screen you stand in front of between sets with a loaded bar waiting.

What the measurements said was that a session went from 4.1 screens to 1.8. What they
could not say is what it costs to not be able to see your own workout. Collapsing an
exercise to one line and a set row to a read-only record meant the app was deciding, on
your behalf and on a rule you did not write, which part of your session you were allowed
to look at — and when that rule guesses wrong, there is no obvious way back. 4.1 screens
of everything beats 1.8 screens of what an algorithm thinks you want. Scrolling is cheap;
hunting for your own numbers is not.

**Removed:** the three exercise states (`ex-now`/`ex-done`/`ex-ahead`, `is-shut`) and
tap-to-open; the one-line done summary; the cue line; the third set state (`is-ahead`)
and the collapsed set-row chrome; the per-set rail on the session bar.

**Kept, because neither was the stack:**

- **One live set per session, not one per exercise.** The old code asked each exercise
  which of its rows was next, so a session lit six copper "you are here" marks at once.
  That was a bug before the stack existed and the rest clock reads the same answer.
- **The gym-mode switch on the session.** One exercise at a time has existed since the
  app did, buried on the second page of a settings group. The switch stays in the tool
  row, because that is where you are when the room is busy. It is opt-in, which is the
  whole difference between it and the stack.

A lesson worth keeping: a redesign measured only in pixels saved will keep proposing to
hide things, because hiding things is what makes that number go down.

# PART 8 — THE PLAN CHECK, FOR PEOPLE WHO HAVE NOT RUN THE PLAN YET (v53.4)

"A look at your plan" draws a bar per muscle for the week the plan asks for. It is pure
arithmetic on `S.program` — it needs no logged sessions, no completed cycle and no
history at all — and it is the first thing somebody wants from a plan they have just
built, imported or switched to.

It had two ways to disappear, and both of them hit exactly that person.

**A clean check returned a stub.** `if(!n && !w)` returned a two-line "Your plan checks
out" with no bars. The builder is *gated on this same check passing*, so a freshly built
plan was the likeliest thing in the app to produce it: the person with the least idea
what their plan contains got the least information about it. Clean is now a reading the
card reports — a green dot and "every muscle inside its range, every session inside the
caps, nothing unbalanced" — above the same bars everybody else gets.

**Any throw returned `""`.** The card vanished, nothing said why, and the plan looked
unexamined rather than unexaminable. It now says the check could not read the plan and
names the reason, and says plainly that nothing was changed because of it.

`tests/specs/planlook.mjs` holds all three readings — findings, clean, broken — to one
rule: the heading is there and the bars are there. Plus a fourth: switching plans redraws
it against the new plan.

# PART 9 — TWO MORE THINGS THAT WENT BACK (v53.5)

## The score counts itself up again

The finish card's grade used to climb to its number while you watched —
`<span data-countup>${q.total}</span>/${q.max}`. Version 23.1 replaced that single total
with the four-tile row, and the helper that draws the tiles did not carry the attribute
over. Nothing decided that; it was lost in a refactor, and nothing in the suite noticed
because nothing was watching for it.

Only the score climbs. Four tiles counting at once is a slot machine, and the point of
the climb is that the grade is the thing being announced — the set count and the pounds
moved are facts you can read at your leisure. It uses the `"slow"` variant, the one with
the hold in it, because it is the same number the finish screen announces.

`tests/specs/gradeup.mjs` now holds it: the score tile asks for the count and is the only
tile that does, it is genuinely below the grade partway through and lands exactly on it,
and with motion off it is simply the number.

## The exercise controls are back on the card

C3 folded ↑ ↓ ✎ ⊕ ⇄ ✕ into one `⋯` overflow, on the argument that unlabelled 32px glyphs
are not guessable on a phone. The argument is sound and the trade was still wrong: these
are the things you reach for mid-session with a bar racked, and putting a tap and a sheet
in front of "move this up" or "that hurt" costs more, every session, than the one time
somebody has to work out what ⇄ means.

It was also making the app disagree with itself — the strip was still drawn in gym mode
and on superset cards, so the same six actions had two different shapes depending on
which session screen you were looking at.

Nothing is lost by it coming back. The sheet carried exactly these six actions and no
others, they run the same handlers, and the strip reports its own state natively: a note
fills the note mark in, a flagged movement turns the pain icon red. The arrows stay
disabled on a finished exercise, which was a real fix and is kept.

`polish.mjs` and `hurt.mjs` drive the strip instead of the sheet; the dead overflow
handler is removed rather than left to look live.
