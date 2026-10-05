# Plan Builder — verification record

This file is the record for the Plan Builder work: what is checked, how to run the
checks, what the measurements came out as, and anything in the code that contradicts
the brief.

It is written as the work lands, phase by phase. Sections for phases that have not
been built yet say so rather than standing empty.

## How the checking works

Two layers.

**1. An in-app check — `index.html#selftest`.**
Open the app with `#selftest` in the hash and it skips the splash and the usual
first screen and prints a report instead. It is a plain function, `selfTestRun()`,
so a test can call it directly and read the result. It checks the invariants that
hold the exercise library and the muscle mapping together:

| # | Invariant | Why it matters |
|---|---|---|
| 1 | Every movement in the library resolves to at least one muscle | A movement that maps to nothing is invisible to volume, landmarks and the Body tab |
| 2 | Every movement the catalogue names ends up in the slot the catalogue **last** puts it in | The merge is order-dependent; this pins the result rather than the intention |
| 3 | A movement appears in one slot only | Two slots would double-count its sets |
| 4 | Every muscle share is between 0 and 1 | Shares outside that silently inflate or cancel volume |
| 5 | Every slot the catalogue names exists and is not empty | A named-but-empty slot makes a swap list or a builder choice come out blank |
| 6 | The movement in a slot maps to a muscle that slot is for | Finds a mapping *gap*: if `ham_iso` holds something that reads as biceps, the plan says hamstrings and the volume says arms |
| 7 | Every name in the frozen preference table still lives in its slot | A curated first choice the catalogue has since moved away is silently unavailable |

Invariant 6 reads `SLOT_MAIN`, which lists the muscles that may legitimately come out
on top for each slot — several per slot, not one, because some slots are honestly
ambiguous (a hinge can be hamstring-led or back-led and both are right).

A failure in any of these is a real bug. Two things are reported as **warnings** rather
than failures: re-slotting (invariant 2's second case, where a later catalogue row moves
a movement out of the slot an earlier row gave it) and a preference entry whose movement
has moved slot (invariant 7) — see "Known, intentional behaviour".

**2. A Playwright harness against the real file.**
`selftest.mjs` loads `file:///home/user/ShowcaseE26/index.html#selftest` with every
`http`/`https` request aborted (`p.route(/^https?:/, r => r.abort())` — note that
routing `'**://**'` also blocks `file:` and the page will not load at all), waits
for the report to render, calls `selfTestRun()` and asserts zero failures. It also
asserts the page throws nothing with the network dead, and that the library it read
is the real one (> 250 movements) rather than a stub.

Each acceptance item in the brief becomes a test in this harness as its phase lands.
The whole set runs from `sweep.sh`.

## Known, intentional behaviour

**`EX_CATALOG` re-slots movements on purpose, and the last row wins.** Several
movements are listed twice: once under a coarse slot and again under the specific
slot they belong in. The merge applies the rows in order, so the later row moves the
movement. That is the intended design, and the check reports it as a warning so the
pattern stays visible. Twelve movements are re-slotted today:

| Movement | Final slot |
|---|---|
| Good Morning | `lower_back` |
| Back Extension Machine | `lower_back` |
| Reverse Hyperextension | `lower_back` |
| Hip Abduction Machine | `glute_iso` |
| Hip Adduction Machine | `adductors` |
| Frog Pump | `glute_iso` |
| Barbell Wrist Curl | `forearms` |
| Reverse Wrist Curl | `forearms` |
| Side Plank | `obliques` |
| Pallof Press | `obliques` |
| Russian Twist | `obliques` |
| Cable Woodchop | `obliques` |

**The catalogue outranks a curated slot, and six movements are affected.** A catalogue
row moves a movement into the slot it names, and that applies even when the hand-curated
`EX_LIBRARY` had placed it somewhere else. Invariant 7 reports each one:

| Movement | Curated slot it left | Where it is now | Why the catalogue is right |
|---|---|---|---|
| Incline Push-Up | `press_incline` | `press_horizontal` | Hands elevated is an *easier flat* press, not an incline one |
| Deficit Push-Up | `fly` | `press_horizontal` | It is a press; the deeper range does not make it a fly |
| Dumbbell Pullover | `pull_vertical` | `lat_iso` | It was curated into both slots; the specific one wins |
| Good Morning | `hinge` | `lower_back` | Curated into both; the specific one wins |
| Back Extension | `hinge` | `lower_back` | Same, via the alias on "Back Extension Machine" |
| Russian Twist | `abs` | `obliques` | Same |

The first two cost their old slot its only bodyweight option, which is a real hole rather
than a bookkeeping note: a bodyweight-only user's incline press slot was being filled
with an Incline Smith Machine Press. `Decline Push-Up` — *feet* elevated, which is the
incline pressing pattern whatever the name says — was re-slotted into `press_incline` to
close it. The `fly` slot still has no bodyweight option; see "Open questions".

**A re-slotting row also decides the gear.** Two catalogue rows can disagree about both
slot and equipment: Frog Pump is listed under `hip_thrust` as a dumbbell movement and
again under `glute_iso` as a bodyweight one. The merge used to keep the first gear, which
put a "dumbbell" frog pump in the one slot where a bodyweight-only user had a bodyweight
option — so they were handed a cable kickback. The gear now comes from the row that names
the slot; a curated entry (one with a coaching cue) keeps its own gear, because that was
written down on purpose.

**`canonEx` collapses some near-duplicate names**, so a catalogue row can land on a
movement spelled differently in the library: "Back Extension" / "Back Extension
Machine", and "Wrist Curl" / "Barbell Wrist Curl". This is the alias system doing
its job; it is why invariant 2 is phrased in terms of where a movement *landed*
rather than which row named it.

## Measurements

### Library and mapping

As of 39.2: **313** movements in the library, **0** invariant failures, **18**
warnings — the twelve re-slottings in the table above plus the six curated preferences
listed under "The catalogue outranks a curated slot".

### What the built-in plans now choose

C2 froze the preference order before the catalogue merges, which restored the curated
first choices the merge had been quietly reordering. For a full gym the plan's picks
changed as follows — every one of these is the curated table's own first entry, and the
left-hand column is what the catalogue's ordering had been producing instead:

| Slot | Was picking | Now picks |
|---|---|---|
| `squat` (full, home) | Bodyweight Squat | Barbell Back Squat |
| `squat` (dumbbell) | Bodyweight Squat | Goblet Squat |
| `hinge` (full, home) | Conventional Deadlift | Romanian Deadlift |
| `hinge` (dumbbell, bodyweight) | Dumbbell Romanian Deadlift / 45-Degree Back Extension | Single-Leg RDL |
| `press_incline` (full) | Incline Smith Machine Press | Incline Dumbbell Bench Press |
| `press_incline` (bodyweight) | Incline Smith Machine Press | Decline Push-Up |
| `lateral` (full, home, dumbbell) | Alternating Cable / Band Lateral Raise | Dumbbell Lateral Raise |
| `lat_iso` (full) | Band Straight-Arm Pulldown | Cable Lat Prayer |
| `calf` (full) | Bodyweight Calf Raise | Standing Calf Raise |
| `curl` (full, home, dumbbell) | Band Curl | Incline Dumbbell Curl |
| `triceps` (full) | Cable Tricep Extension | Tricep Pushdown |
| `quad_iso` (full) | Single-Leg Leg Extension | Leg Extension |
| `ham_iso` (full) | Lying Leg Curl | Seated Leg Curl |
| `rear_delt` (full) | Dumbbell Reverse Fly | Cable Reverse Rear Delt Fly |
| `shrug` (full, home) | Barbell Shrug | Dumbbell Shrug |
| `abs` (home, dumbbell, bodyweight) | Hanging Knee Raise | Leg Raises |
| `glute_iso` (bodyweight) | Cable Glute Kickback | Frog Pump |
| `forearms` (dumbbell) | Wrist Curl | Dumbbell Wrist Curl |

A full-gym user was being handed a *bodyweight squat* as the heavy squat of a lower day.
That is the cost of letting a list's order carry a decision: the catalogue merge removes
and re-appends every movement it names, so each curated entry that also appeared in the
catalogue was moved to the back of its own preference list, and whatever curated entry the
catalogue happened not to mention floated to the front.

The whole matrix — 28 slots × 4 gear tiers — is pinned by `phase2.mjs` against
`matrix.txt`, so a change to any pick has to be made deliberately.

### Builder combinations

Measured in full in **phase 9** — see "The re-measurement" at the end of this document.

## Phase 3 — what changed in the progression engine

| ID | Before | After |
|---|---|---|
| H1 | The verdict was read off the LAST working set | Read off the sets at the top working load: every one within a rep of the range top, the last one at it, each at or under its RPE target. Back-offs and warm-ups are ignored |
| H2 | A plan line with no load meant "bodyweight: add 5 lb" | Bodyweight only when the movement needs no load *and* none has been logged in 60 days; otherwise it is stepped by its class, so a 10 lb dumbbell raise goes to 12.5 |
| H3 | Any earned jump was written, however large a fraction it was | Over 10% (isolation) / 7.5% (compound), and only when the *gear* forces a step bigger than the class rule asks for, the top of the rep range extends by 5 instead (never past 20). Clearing the extended top then adds the load and restores the range |
| H4 | The cut was "two increments below the set that failed" | Worked back from the cited set's estimated 1RM to the load at which the top of the range is reachable at the prescribed effort. 185×3 @ RPE 10 against 6–10 cuts to 150, and `toohardTarget` does the same arithmetic so the button agrees with the sentence |
| H6 | One capped reading served both the absolute estimate and the self-comparison | Two: `est1RM` stays capped (it answers "what could you lift once"), and `perfIndex` is uncapped for the trend, the grade and calibration, with the trend window 3–30 reps. 20×12 → 20×15 now grades as up |
| H8 | "Ask" by default; the warm-up ramped to the earned load while the set boxes showed the old one | Auto by default for new profiles, with the pin and the one-time card below for existing ones. `earnedLoadPending()` is the single source both the boxes and the warm-up read |
| L3 | "Last set was 6 reps…" | The message names the sets at the load — "6, 6, 6 at 185 lb" — and says when a lighter set was not counted |
| L4 | Every bodyweight movement was told to add 5 lb | Added load only for pull-ups, chin-ups and dips. Everything else moves up a ladder of harder variations, and the reps carry it once the ladder runs out |
| M7 | The rest fallback was derived from the rep count alone | A multi-joint lift never rests under two minutes in the fallback, whatever the reps |

### The jump cap, and how it is measured

Two details decide this and both were found by the tests:

- **It is measured on the step, not on the rounded target.** `roundLoadable` puts the
  next load on the grid your plates make, and the load you are on now is not always on
  that grid — 185 lb with a 50 lb bar and 5s rounds up to 200, which reads as an 8.1%
  jump when the step is 10 lb and 5.4%. The rounding is bookkeeping and must not be what
  trips a cap.
- **It only fires when the gear is what made the jump big.** A 2.5 lb microplate on a
  10 lb raise is 25% and is also the smallest progression that movement has; extending
  the reps instead would mean it could never add load at all. A 5 lb dumbbell step on
  the same raise is the rack forcing 50%, which is the case the rule exists for. This is
  also what reconciles H2's acceptance (10 lb → 12.5) with H3's (`dbStep` 5 on a 10 lb
  raise → 12–20).

### Auto-apply, and who gets switched

`PREF_DEFAULTS.progression` is now `"auto"`. Because `trainPrefs()` fills every missing
preference from the defaults, shipping that alone would have switched every existing
profile over silently — on the one setting where silence is the whole objection. So
`DISK_HAD_PROG` records what the disk actually held, and a profile with a setup or a
session but no stored choice is pinned to `"ask"` and offered the change once, on a card
on Today with both answers as buttons. A profile that had already chosen is left alone
and never asked.

Auto writes load increases and rep stretches, both with an undo snapshot in the plan
history. It does **not** move up a bodyweight ladder: that changes which exercise you do,
and nothing about "add the weight I earned" implies consent to that.

## Phase 4 — safety

### Effort ceilings, read at the moment a set is asked for

Three ceilings, all applied in `effortCeiling()` and read through `rpeTargetFor()`, so the
set row, the grade and the progression rule cannot disagree about what a set was asked
for. None of them rewrites a plan — two of them expire, and a prescription baked into a
plan cannot expire.

| Ceiling | Applies to | Expires |
|---|---|---|
| RPE 7 | the first session on any movement (H7) | as soon as one finished session contains it |
| RPE 8 | a compound while a beginner's training age is under 6 weeks (M2) | at 6 training weeks, or as soon as the level is no longer beginner |
| RPE 9 | any compound; and any isolation set that is not the last one (M1) | never — it is the standing rule |

A technique that ends past failure (a drop set, myo-reps, rest-pause, an AMRAP, a set
marked to failure) is exempt: capping one of those at 9 would be asking for the opposite
of the technique.

The two that expire print a sentence under the exercise saying what the ceiling is for,
because a chip showing 8 where the plan says 9 with nothing to explain it reads as a bug.

**A catch-up reads the plan's own target, not the ceiling.** Recording a load you have
already performed is a correction, not a proposal; refusing it on a first exposure would
leave the plan permanently wrong about a weight you are visibly using. `rpeTargetRaw()`
exists for that one caller.

### Starting loads

`START_RATIOS` gained specific rows above the generic ones, because the generic ones
answer for a barbell and the per-hand conversion fires on the word "dumbbell" in the name:

| Movement | Was reading | Now |
|---|---|---|
| Goblet Squat | the back-squat row — 180 lb for a 180 lb lifter, as one bell | 0.30 of bodyweight, total: 55 lb |
| Walking Lunge | the lunge row, a barbell figure, in **each** hand | 0.19 per hand: 35 lb |
| Dumbbell Fly | the pec-deck row, already per-hand, so no conversion | 0.13 per hand: 25 lb |
| Pec Deck | marked per-hand, though the pin is the whole load | its own row, total: 90 lb |

`startingLoadPerHand()` answers the question nothing could ask before: "35 lb" and "35 lb
a hand" are different instructions, and the feeler-set note now says which.

### Feeler sets

`needsCalibration()` used to mean "this exercise carries a `calibrate` ballpark and no
weight" — true of two movements in the whole library. It now also covers the first
exposure to anything that takes a load: the note names the estimate, says to keep about
three reps in reserve (the same session the ceiling holds to RPE 7), and what gets logged
becomes the starting load. It is a note, not a gate.

### What the importer changes, and says it changes

A document that writes "3×5 to failure" against a squat is transcribed faithfully in
every other respect; the ramp is capped to [9,9,9] at the boundary and the review screen
lists it under "Effort capped", naming the movements. An unannounced change to an imported
plan is the app rewriting somebody's programme behind their back.

`SLOT_RPES.abs` was `[9,10,10,10]` — three sets after a set taken to failure. It is now
`[9,9,9,10]`. The cap is not applied inside `exr()`: that runs while the file is still
initialising, and `isCompound()` reads a map declared further down, which throws in its
temporal dead zone. The app's own tables are written compliant instead.

## Phase 5 — the Plan Builder

### What it is

`buildPlan(answers)` is pure: it reads the answers and the app's own tables and returns
`{program, split, meso, report}`, writing nothing. `adoptBuiltPlan()` is the only function
that touches state, which is what makes the preview honest — what you are shown is the
object you get.

The order it works in:

1. the split follows the days and nothing else — 2 Full Body A/B, 3 Full Body A/B/C,
   4 Upper/Lower ×2, 5 Upper/Lower/Push/Pull/Legs, 6 PPL ×2. Two new splits were added
   (`full2`, `ulppl5`); `ppl3` and `bro5` are kept so every existing plan still renders and
   are not offered — both train each muscle once a week.
2. every slot is filled through `pickExercise`, so the builder uses the same frozen
   preference table as everything else (C2).
3. sets start from the day plan's own counts, scaled by training age.
4. **tuning**, one set at a time: everything to its floor first, then everything toward the
   middle of its band. One at a time because a set added to a press is also a set of
   triceps and front delts.
5. priority muscles get more; protected areas lose the movements that provoke them, swapped
   inside their slot where there is an alternative.
6. **fitting**, in M5's order: pair, then trim above floors, then drop a movement last.
7. the quality check runs and anything it fails is fed back in, up to six rounds.

### Three rules the measurements forced

- **A trim may not put another muscle under its floor.** Trimming a muscle over its
  ceiling takes a set off a movement that feeds others too — and the lower back lost its
  only direct work this way, on a plan that had just been brought up to its floor.
- **`room()` is in sets of the muscle, so a cut needs a whole set of headroom.** At 0.3
  above the floor, cutting a movement that pays half a set puts the muscle under it.
- **A compound keeps three sets.** Every trimming pass picks the least direct contributor,
  and a compound is the least direct contributor to most of the muscles it feeds — so the
  arithmetic kept producing plans whose main lift was two sets and whose lateral raise was
  four.

### A muscle nothing trains gets a movement

The obliques and the lower back are the usual pair: every plan picks them up indirectly
and no plan trains them. When a muscle is under its floor and no movement in the plan
gives it half a set, the builder adds one — from the same library, through the same
preference order. That is M5's rule from the other side: never leave a muscle under its
floor with no direct work.

### H10 — the measurement

Days 2–6 × four gear tiers × three levels × goal {muscle, lean} × budget {45, 60, 75}:

| | |
|---|---|
| Combinations built | **360** |
| Quality-check failures | **0** |
| Notes (warnings) | 1,170 |

Every major muscle lands inside [MEV, min(MAV, 0.9·MRV)], priority muscles excepted.

> Superseded by the phase 9 re-measurement at the end of this document, which found that
> these figures were measured against the wrong bands: `buildTargets()` was reading the
> live profile's level and goal rather than the ones the person answered, so all 360
> combinations shared one set of landmarks. The numbers above are what the builder did; the
> ones at the end are what it does.

**One honest departure.** On two training days at a 45-minute budget, a full-body session
that meets every floor comes to about 54 minutes. Everything that can be paired is paired,
every set above a floor has gone, and dropping a movement would put a muscle under its
minimum. That is a fact about training twice a week, not a fault in the plan, so the
builder marks the day `tight` and the check reports it as a note that says exactly that
rather than as a failure. A day that *could* be shorter and is not is still a failure.

### The screens

Seven questions, one per screen, every one skippable with a defensible default: goal,
training age, days, session length, equipment, priority and protected areas, and an
optional bodyweight and sex for starting loads. Then a preview — the days and what is in
them, sets and minutes per day, the per-muscle volume table against the targets, the
quality summary and what the builder did — with **Use this plan** and **Change answers**.
Nothing is written until Use this plan.

### Where the check appears

| Where | Behaviour |
|---|---|
| Builder preview | failures are not allowed; the builder retries until there are none |
| Import review | informs only, never blocks — the document is somebody's programme, often a coach's. "Fix it for me" where the app can actually act (the RPE caps) |
| Program tab | a standing card on whatever plan you are running now, because a plan drifts |

### H9 and M11

**H9**: training age is asked in weeks and mapped through the same thresholds
`inferExperience` uses, so the builder and the app cannot disagree about who they are
writing for. `inferExperience` now falls back to `S.setup.level` when there is no log and
no training age — a profile on day one read as zero weeks, which is "beginner", so
somebody who answered "five years or more" was written a beginner's plan and told why in a
sentence quoting a log that did not exist. A skipped question is also no longer an answer
of zero: `Number(null)` is a perfectly finite 0.

**M11**: 64 movements — every one the builder can produce across all slots and tiers —
have setup, execution, range of motion, errors and a stretch cue, shown once on the first
exposure to that movement. `demo` is null everywhere and a self-test invariant fails if
any field is thinner than twelve characters or if a demo link ever appears: a link the app
has not checked is a link it is vouching for.

## Phase 6 — periodization that actually runs

### What was missing

The importer has always read phases, deload weeks, testing weeks, week-to-week changes and
per-set percentages, and `planWeekNotes()` has put the right week's words on the screen on
the day. What none of it did was change the session. Week three of a 5/3/1 cycle arrived
with the same three sets of five the plan started with, and the percentages a strength
document spends half its pages on sat in a note under the exercise. That is the difference
between running a twelve-week block and running its first week twelve times.

### The shape of the answer

Everything added here is a **projection**, the same pattern `deloadView()` has always used,
for the same reason: a block that ends, a week that changes, or a periodization dropped
must restore the real plan exactly, with nothing to migrate and no half-applied revert.

| Piece | What it does |
|---|---|
| `prescriptionFor(entry, week)` | the one entry point. Returns the entry as this week asks for it — sets, reps, per-set loads, effort — and never touches the stored one |
| `weekView(list, week)` | that, mapped over a day, inserted inside `resolvedProgram()` as `easeView(deloadView(weekView(...)))` |
| `programWeek()` / `S.programWeek` | the week, counted in one place, written down as it advances in `recomputeCycle` |
| `planWeekAt(ms)` | the same question about a day in the past, so a logged session is read in the week it was performed in |
| `S.tms` / `tmFor` / `setTmFor` | training maxes, stored because a TM moves on the programme's schedule rather than on your best session's |
| `syncWaveState()` | the state the waves own: the TM opened from your max, the per-cycle increase, the reset after a miss |
| `syncPlannedDeload()` | the plan's own deload week, started for you |

Readers that had to learn something new: `setPrescription` (per-set reps, per-set load, the
AMRAP flag), `planLoadFor(en, si)` and `planLoadPh` (a set's own load, before the
"heavier of the plan and last time" rule rather than after it), `pctLoadFor`/`pctWords`
(a stored TM instead of 90% of a max, and the arithmetic printed accordingly),
`progressionFor` (a waved lift gets the wave's verdict, never a double-progression raise),
`projectedDuration` and `trimForSleep` (the week's own set counts).

### 5/3/1, as published

| Week | Set 1 | Set 2 | Set 3 |
|---|---|---|---|
| 1 | 65% × 5 | 75% × 5 | 85% × 5+ |
| 2 | 70% × 3 | 80% × 3 | 90% × 3+ |
| 3 | 75% × 5 | 85% × 3 | 95% × 1+ |
| 4 | 40% × 5 | 50% × 5 | 60% × 5 |

The brief's acceptance test, measured: a 200 lb training max gives **130 / 150 / 170** in
week one, **205** after the cycle (+5 upper, +10 lower), and **180** after a failed AMRAP
(90% of itself). Week four is the programme's own deload, so `deloadView()` leaves a waved
entry alone rather than halving a week that has already been cut in loads.

A wave runs **only** where the document names the programme (`/5\s*\/?\s*3\s*\/?\s*1|531|wendler/i`
on `planKind.named` or `planName`) **and** its model is a percentage wave, **and** the
movement is a main barbell lift with no per-week table of its own. Wendler's percentages
are not inferable from three sets of five, and running them on somebody's linear plan would
substitute a different programme for the one they uploaded. A document's own `weeks[]`
table always outranks the wave.

The per-cycle increase requires the cycle to have been **trained**: `syncWaveState()`
counts sessions containing the movement since the TM last moved, and a cycle in which the
lift was never performed earns nothing. Four weeks away is not four earned increases, and
coming back to loads 10 lb heavier than the ones you left is the fastest way to miss the
first session back.

The AMRAP set is found by position — the last set carrying a load, warm-ups aside — not
through `isWorkingSet()`. A set with 190 lb on the bar and nought reps is exactly the miss
this rule exists for, and filtering it out would have read the back-off above it as the top
set and called the session a success.

### M3 — the deload, measured rather than assumed

| Rule | Before | Now |
|---|---|---|
| Sets in a deload week | flat 2 | `max(1, round(sets × 0.5))`, so 1→1, 3→2, 4→2, 5→3, 6→3 |
| The clock | 6 **calendar** weeks since the block started | 6 **training** weeks — calendar weeks with ≥ 2 sessions, deload weeks counted |
| A layoff | nothing | ≥ 7 days without a session ends the block; `blockStartAt()` restarts at the session they came back on, and no deload is prompted |
| Beginners | on the clock like everyone else | signals only; `MESO_SHAPE.beginner` is 6 accumulation weeks and no scheduled deload |
| A built plan | a 6-week clock for everybody | the block's own last week: 4 + 1 for intermediate and advanced, 6 + 0 for a beginner |
| A document's deload weeks | shown, and prompted by hand | run themselves on the weeks it names, logged as the plan's |

### What the import review now promises

A new card, **"What runs automatically"**, listed before the plan is added: the waves and
how the training max will move, where the percentages come from when no max is on file, the
movements carrying a per-week table, the document's deload weeks and the week counter. The
point is the converse — everything *not* on that list is shown to you on the week it
applies and executed by nobody but you. The week-to-week sentences, the special
instructions and the progression rules are prose, and the app does not pretend to run
prose.

### Where it is said while training

`periodCardHTML()` on the Program tab names the week, the block's shape, each waved or
tabled movement with this week's percentages, reps and loads, and the training max behind
them. The cards below it are still the real plan; the card says so in as many words, because
a plan reading 3 × 5 while the set rows ask for 75/85/95% is the app contradicting itself
with no way for the reader to tell which half is the bug.

## Phase 7 — M4, M5, M6, M10, L2

### M4 — the specialization was reading a field that does not exist

`specBodyKg()` read `S.weights`, which nothing in this codebase has ever written. It
therefore always returned null, and everything downstream did nothing: the protein check,
the grams suggested in the box, and the weight change a finished priority block reports.
There was no visible bug, which is why it survived — a feature that returns "no data"
looks exactly like a feature with no data.

| Was | Now |
|---|---|
| `S.weights[].kg` — a field that is never written | `bodyWeightNow()`, the body log the rest of the app keeps |
| no unit handling | converted lb→kg once, at the only place that needs kilograms |
| protein as a single figure, 1.6 g/kg | the range **1.6–2.2 g/kg**, with the grams at that bodyweight |
| `specWeightChange()` also on `S.weights` | `bodyLogList()`, in the units the person logs in, and printed on the block report |

The brief's acceptance case measures exactly: 180 lb logged with 120 g of protein reads
**1.47 g/kg** and is flagged low, with "130 to 180 g at your bodyweight" as the range. A
kilogram logger is not converted twice. With no weigh-in on file it returns null and the
card says nothing rather than inventing a bodyweight.

### M5 — the time-box, in the brief's order

| Step | What it does | Why it is in this position |
|---|---|---|
| 1. supersets | pairs two movements that share no muscle, isolations first | paired work costs no rest of its own, so it is the only step that costs nothing at all |
| 2. myo-reps | turns an unpairable isolation's last set into a myo-rep set | worth 1.75 straight sets (`setTypeValue`) at about half the time, so it buys back most of a set for a quarter of one |
| 3. proportional cuts | takes one set off whatever has the most room above the floors of every muscle it trains, then re-measures | the proportion is in the selection: cuts land where the slack is, and nothing goes under MEV |
| 4. drop a movement | last, and never the last direct movement for a muscle the plan is responsible for | a dropped exercise is the only step that removes a stimulus outright |

Two new pieces of arithmetic make step 2 honest in both currencies the time-box trades in:
`plannedSetValue()` (a prescribed myo-rep set counts at its own value, so `programWeeklySets`
does not read it as one set) and `dayMinutes()` (the mini-sets and their breaths are charged
inside the last set rather than after it).

**Never zero direct work.** The headroom test was necessary and not sufficient: a muscle
can sit above its floor on indirect credit alone — triceps off presses, biceps off rows —
and still have nothing in the week that trains it. `DIRECT_SHARE` (0.5, the figure the tune
pass already used) is now named once, and the last movement above it for a non-optional
muscle is not available to the drop pass whatever the arithmetic says.

**Measured:** across all 360 builder combinations the superset pass resolves the budget
before myo-reps are ever needed, so step 2 does not fire in the grid. It is exercised by
`phase7.mjs` §3 with a day of three chest isolations, where no pair is possible because
every pair shares the chest — which is the case the step exists for.

### M6 — three separate corrections to the grade

**The comparison.** Progressive overload compared each lift against its single previous
session, which made the score a function of how good that day happened to be: beating a bad
Tuesday read as progress, and following a personal best with a strong second-best read as
regression. It now compares against the **best of the last three exposures**
(`priorExposures`, in date order across days). The most recent exposure is still kept for
its context, because "you had been away" is a fact about the gap between then and now.

**The bar, scaled by level** (`GRADE_BANDS`):

| Level | "went up" | still "held" |
|---|---|---|
| Beginner | > +1.0% | ≥ −0.5% |
| Intermediate | > +0.4% | ≥ −1.5% |
| Advanced | > 0 | ≥ −3.0% |

A beginner adds load almost every session, so matching their recent best is the floor
rather than an achievement; an advanced lifter can train perfectly for a month and hold.
The self-test checks the ordering rather than the three numbers, because the ordering is
the claim.

**What the score is allowed to mark you down for.** Log quality scored the session note
(1.0) and the daily check-in (1.5), neither of which is a property of the workout — one is
a diary entry and the other is filled in at breakfast. A session logged perfectly could not
reach full marks without also writing prose about it. Both are still asked for, and still
feed what the app can say later; they are no longer graded. The remaining three weights are
scaled to keep the section worth 10: RPE 4.5, rest 3.5, feel 2.0.

**Efficiency against the person's own budget.** The fixed 40–80 minute window marked down
somebody who told the builder they have 30 minutes and finished in 29. `sessionBudgetMinutes()`
reads the figure the builder already stores (`S.meso.minutes`, then the built plan's answers)
and returns null when nobody has said, in which case the published window still stands in.
Coming in **under** budget is not penalised at all: a session cut short shows up as missed
sets in Completion, and docking it twice would mean a 30-minute plan can never score well.

### M10 — the data, and the one save that cannot fail quietly

`navigator.storage.persist()` is requested once on the way in, unawaited, and the answer is
recorded so Settings can say which storage bucket the device is in rather than claiming a
grant that is not ours to make.

`save()` now returns whether the write landed — `persist()` always knew and `save()` threw
it away, so every caller in the app believed its save had worked. For nearly all of them
that is fine, because the next change tries again. For `finishWorkout()` it is not: the
session has just moved out of `S.active` into `S.sessions`, and if that did not reach disk
it exists only in this tab. A failure there now stops the whole post-session chain — no
celebration, no grade card — behind the one sheet in the app that cannot be dismissed
(`MODAL_STICKY`, honoured in `hideModal()`), which hands over the whole backup. A
celebration over a lost session is the worst thing the app could put on a screen.

### L2 — a seven-day week is seven days long

`deloadWindowMs()` returned `(DELOAD_DAYS + 1) * DAY_MS`. The extra day was there to stop a
deload lapsing mid-session on the seventh day — a real problem solved in the wrong place,
since the window governs everything the app believes about the week: `deloadActive()` was
true on day eight, `deloadCovers()` stamped a session the week did not contain, and the
countdown (which counts to `DELOAD_DAYS`) disagreed with the window by a day. "Day 8 of 7"
came from here.

The window is now the week, and the day it ends is protected properly: the boundary is taken
from the **start of the day the deload began** (`deloadEndsAt`), so a deload begun on Tuesday
evening runs to the end of the following Monday and no session is cut off part-way through.
The four screens that each did this arithmetic inline against a hard-coded 7 now call
`deloadDayIn()` and `deloadDaysLeft()`.

## Phase 8 — streaks and the coach view

### Weekly-target streaks

Every streak the app could have had was a bad idea except this one. A **daily** streak
rewards training today whether or not today is a training day, which turns a rest day into
a broken promise and a deload into a failure. A streak of consecutive sessions punishes a
three-day plan more than a six-day one. And any streak built on "don't break the chain"
eventually asks somebody to train on a day they should not.

So the unit is the week and the target is the plan's own:

| State | When | Effect on the run |
|---|---|---|
| **hit** | sessions ≥ what the plan asks for **and** ≥ 75% of the week's planned sets | +1, and every 8th earns a grace week (2 banked at most) |
| **deload** | any session in the week fell inside a deload | counts as hit outright — it is the week the plan asked for |
| **frozen** | ill (a day flag, or said on the strip) or away (said on the strip) | neither hit nor missed; the run carries across it |
| **graced** | missed, with a grace week banked | the grace week is spent and the run carries |
| **miss** | everything else | the run returns to zero |
| **live** | the week in progress | cannot break anything yet |

`plannedSessionsPerWeek()` reads the layout — a seven-day layout says it outright, any
other cycle length is pro-rated — and `plannedSetsPerWeek()` averages the prescribed sets
across the plan's training days. The run is walked **forward** so a grace week is earned
before it can be spent, which is the only order in which "one per eight" means anything.

**Nothing shames anybody.** No "you broke your streak", no red, no flame, and the chip
disappears rather than reading zero — a number that only ever goes down is a reason to
close the app. `streak.mjs` §7 asserts that none of those strings can appear.

Element 26 cannot tell a holiday from a quiet fortnight and does not guess: a missed week
is tappable, and the two honest reasons ("I was ill", "I was away") are the person's to
give and to take back. UI: a chip beside the date on Today, a twelve-week strip on History.

### The coach view

A read-only snapshot behind a link, for somebody who has never used Element 26 and is not
going to install it to read one plan.

**The worker** (`proxy/accountworker.js`, documented in `proxy/README.md`):

| Route | Who | What |
|---|---|---|
| `POST /share` | the account | stores a snapshot, returns a 128-bit token once |
| `GET /share/:token` | anybody with the token | the snapshot and its dates |
| `DELETE /share/:token` | the account that made it | revokes it immediately |
| `GET /shares` | the account | what is live, without the snapshots |

The token is the credential (32 hex characters from `crypto.getRandomValues`), the expiry
is 30 days by default and 90 at most — checked on read *and* written into the KV entry's
own TTL so a bug in one cannot keep a link alive — and expired, revoked and never-existed
all answer 404, because a distinct "expired" would confirm a token was once real. Limits:
1 MB a snapshot, 10 live links an account, 10 creations an hour an account, 120 public
reads an hour an address. **Deleting the account deletes every link it ever made**, which
was the worst failure available here: data still being served by a token in somebody's
chat history for an account that no longer exists to revoke it.

**The snapshot** is assembled field by field from a named list (`shareSnapshot()`), never
by taking `S` and deleting the private parts — a deny-list grows a hole the moment
somebody adds a field, and the field that gets added is always the one you would not have
shared. Always included: the plan, twelve weeks of per-muscle volume against the
landmarks, the index lifts, records, the streak and the session grades. Off by default and
chosen one at a time: bodyweight, sleep and check-ins, niggles, notes.

`shareSnapshotSafe()` then searches the finished JSON for anything resembling an account
id, a 32-hex key, a token or a bearer header, and **refuses the share** rather than
trimming it: if that ever fires the right response is to fix the snapshot.

**The viewer** (`#share=<token>`) runs instead of the app — before the splash, and
`render()` itself refuses to draw while `share-view` is on the body, because the app has
timers, visibility handlers and a sync that all call it on their own schedule and any one
of them would have replaced a coach's page with somebody else's Today tab mid-read. It
never touches `S` or localStorage, so a coach reading three clients' links on a borrowed
laptop stores none of it.

It is also the one screen that has to explain itself to a stranger, so every number
carries its own sentence — what MEV, MAV and MRV mean, what the session grade compares
against — and it says plainly **what was not shared**, so a reader knows the difference
between "no injuries" and "injuries were not shared with me".

**Verified:** `streak.mjs` (8 sections), `share.mjs` (8 sections, every network request
aborted), and `tests/share-worker.mjs` — the real worker module driven against a mocked
KV, covering the credential checks, the 128-bit token, the clamped expiry, the
ownership-checked revoke, the rate limits, the origin allow-list and the
account-deletion sweep. `node tests/run.js` runs all three.

## Audit IDs — what changed and what covers it

| ID | Change | Covered by |
|---|---|---|
| C2 | `EX_PREFERENCE_TABLE`: the ranking is written down (reference 2.8.2), not derived from list order, and frozen before the catalogue merges. `pickExerciseIn` never falls back outside the gear tier | `phase2.mjs` §5, `matrix.txt` |
| H1 | Progression read off the sets at the top working load | `phase3.mjs` §1 |
| H2 | Bodyweight only when the movement needs no load and none logged in 60 days | `phase3.mjs` §2 |
| H3 | Jump caps 10% / 7.5%, rep extension +3/+5 to 20/30 | `phase3.mjs` §3 |
| H4 | The cut worked back from an e1RM, mirrored in `toohardTarget` | `phase3.mjs` §4 |
| H5 | Keyword order: specific before general; flies with no triceps credit; a slot-vs-map invariant | `phase2.mjs` §4, `#selftest` 6 |
| H6 | `perfIndex` uncapped for self-comparison; trend window 3–30 | `phase3.mjs` §5 |
| H7 | The reference's starting-load table, per-hand flags, RPE 7 on a first session, feeler sets everywhere | `phase4.mjs` §1, §2, §5 |
| H8 | Auto-apply by default with undo; one load for the boxes and the warm-up | `phase3.mjs` §8, §9 |
| H9 | Training age asked and mapped to a level; `inferExperience` falls back to `S.setup.level` | `phase5.mjs` §9 |
| H10 | Per-session caps, the time budget, ppl3/bro5 retired from the builder | `phase5.mjs` §1, §2, §3 |
| M1 | Compounds stop at RPE 9; 10 only on the last isolation set; the import says what it capped | `phase4.mjs` §3 |
| M2 | Beginner compounds held to RPE 8 for six training weeks, with a reason | `phase4.mjs` §4 |
| M5 | Fit order: pair → trim above floors → drop last; a muscle under its floor always gets direct work | `phase5.mjs` §3, and the "muscle nothing trains" rule |
| M7 | A compound never rests under two minutes in the fallback | `phase3.mjs` §7 |
| M8 | Front raises, carries and sumo/wide-stance re-slotted | `phase2.mjs` §3 |
| M11 | 76 movements with setup, execution, range, errors and a stretch cue; `demo` null | `phase5.mjs` §10, `#selftest` 8 |
| L1 | One RPE-adjusted e1RM definition | `phase2.mjs` §1, §2 |
| L3 | Messages name the sets at the load | `phase3.mjs` §1 |
| L4 | Bodyweight ladders; added load only for pull-ups, chin-ups and dips | `phase3.mjs` §6 |
| L5 | No muscle above 1.6× chest unless chosen — enforced while tuning, not only checked | `phase5.mjs` §7 |
| M3 | Deload sets halved, the clock counted in training weeks, a layoff ends the block, beginners on signals only, a meso or a document's own deload replaces the clock | `phase6.mjs` §7–10, `#selftest` 10 |
| M9 | `prescriptionFor(entry, week)`, `weeks[]`, `blockWeeks`, `model`, `S.programWeek`, 5/3/1 waves off a stored training max | `phase6.mjs` §1–6, §11–16, `#selftest` 9 |
| M4 | The body log read for real, lb→kg once, protein as a 1.6–2.2 g/kg range, the block's weight change printed | `phase7.mjs` §1, §2, `#selftest` 11 |
| M5 | Time-box order: supersets → myo-reps → proportional cuts above MEV → drop last; `DIRECT_SHARE` protects the last direct movement | `phase7.mjs` §3, §4, `#selftest` 11 |
| M6 | Best of the last 3 exposures, bands scaled by level, note and check-in out of the score, efficiency against the stated budget | `phase7.mjs` §5–8, `#selftest` 11 |
| M10 | `navigator.storage.persist()`, `save()` returns its result, an undismissable export sheet when the finish save fails | `phase7.mjs` §10 |
| L2 | `deloadWindowMs()` equals `DELOAD_DAYS`, measured from the start of the day it began | `phase7.mjs` §9, `delend.mjs` §2, `#selftest` 11 |

Every audit ID in the brief is now implemented and covered.

The phase 9 re-measurement found and fixed five further defects, each pinned by
`phase9.mjs`: the answered level and goal not reaching `buildTargets()`, the builder and
its check reading different bands, the tuning pass ignoring what a set gives every other
muscle, the frequency check and its repair asking different questions, and repair paths
adding the same movement to a day twice.

## Open questions

Things where this codebase and the science reference disagree, or where the reference asks
for something the library cannot currently supply. Recorded rather than guessed at, as the
reference requires.

**The myo-rep step in the time-box never fires in any measured combination.** M5 puts
myo-reps second, after supersets, and across all 360 builder combinations the superset pass
resolves the budget before the myo step is reached — because anything left unpaired at
that point is a compound, and a myo-rep squat is a safety problem rather than a time
saving. The step is correct and it is tested directly, but in practice it is reached only
on a day whose remaining isolations all share a muscle. *Proposed resolution:* keep the
brief's order — supersets genuinely are the cheaper saving — and leave the step in place
for the days that need it rather than promoting it above supersets to make it fire.

**The 2-day budget conflict** is recorded in full under "The one conflict the brief cannot
resolve" in the re-measurement section, and is the one open question with a measured number
against it: 41 of 360 combinations run over budget, the worst by 46 minutes.

**"Proportional cuts above MEV" is implemented as largest-headroom-first, re-measured.**
The brief asks for proportional cuts; the pass takes one set at a time off whichever
movement has the most room above the floors of every muscle it trains, then re-measures, so
cuts distribute across the plan in proportion to where the slack is (the largest-remainder
shape). A literal single-pass proportional scaling would hit the same floors in a different
order and re-open the 360-combination measurement for no stated gain. *Proposed resolution:*
keep the iterative form and treat the brief's wording as describing the outcome, not the
algorithm. Revisit if a combination is ever found where the two differ in result.

**A per-week table shorter than the block repeats.** Reference 2.12.6 says to execute a
document's per-week numbers exactly and never to invent waves it does not contain, and it
is silent about what happens in week five of a document that writes four. `weekRowFor()`
wraps: week 5 runs the table's week 1. The alternative readings are to freeze on the last
row for ever, or to stop projecting and fall back to the stored card — both of which also
run numbers the document did not write for that week. Repeating is what a block means and
what `planWeekNow()` already does with the document's own length, so the two agree.
*Proposed resolution:* keep the wrap, and say which week of the table is running wherever
the week is named (`periodCardHTML` does).

**5/3/1's supplemental work is executed as a percentage, not as a named template.**
Reference 2.12.6 asks for Boring But Big (5×10 at 50–60% TM) and First Set Last to run
exactly as the document states. A document that writes those rows gets them: the percentage
lands in `pct`/`pctOf` at import and `pctLoadFor()` works it out off the same stored
training max, so BBB at 50% of a 205 lb TM is a real load on the card. What the app does
**not** have is a notion of "this is BBB" — if a document only names the template and
leaves the numbers to the reader, nothing is executed and the instruction appears as text.
*Proposed resolution:* leave it. Writing the templates in would be the app supplying
numbers the document withheld, which is the thing 2.12.6's last line forbids.

**A training max with no max behind it is opened from an estimate.** The reference says
TM = 90% of the 1RM "or of a tested/estimated max". Where somebody has never entered a max,
`syncWaveState()` opens the TM from the best estimate in their log and labels it as an
estimate everywhere it appears; where there is neither, nothing is invented and the set row
asks. The risk is a first cycle run off an estimate from a set of twelve, which Epley puts
optimistically. *Proposed resolution:* acceptable as long as it is labelled, which it is,
and the first exposure's RPE 7 ceiling (H7) already covers the first session either way.
Worth revisiting if the reference's 2.12.1 note about Epley above 12 reps is ever tightened.

**Exactly seven days between sessions reads as a layoff.** 2.14 says a layoff is "≥ 7
days", so somebody who trains once a week, on the same weekday, restarts their block every
session. That is literally seven days with no session, so the rule is being applied as
written — and it costs them nothing, because a week with one session in it never counts
toward the deload clock anyway. *Proposed resolution:* leave the threshold at the
reference's figure rather than quietly moving it to 8, and revisit if a once-a-week user
ever needs a block at all.

**Three movements the reference's preference table names do not exist for a
bodyweight-only user, and one slot cannot hold them.** The reference gives the bodyweight
column a deficit push-up for the fly slot, a "bench-to-floor triceps extension" for
overhead triceps, and nothing for a lengthened curl. The first is already catalogued under
`press_horizontal`, and a movement may only be in one slot — that invariant is what keeps
swap lists and volume counting honest, and I would rather report the gap than weaken it.
So a bodyweight plan carries three coverage notes: no chest fly, no overhead triceps
extension, no lengthened-position curl. **Proposed resolution:** add three bodyweight
movements to the library in their own slots — a deficit/ring fly-style push-up variant for
`fly`, a bench-to-floor extension for `triceps`, and a band or ring curl for `curl` —
rather than moving existing ones. Not done here because adding movements to the library is
outside phase 5's scope.

**The reference's bodyweight squat entry is a split squat; the app's `squat` slot is
not.** 2.8.2 gives the bodyweight column "Split Squat → Bulgarian Split Squat → Pistol",
but Split Squat lives in the `lunge` slot, which the same plans also use. The builder's
bodyweight plans therefore get a split squat from the lunge slot and a bodyweight squat
from the squat slot, which covers the pattern twice rather than missing it. Left as is.

**`MAX_WORKING_SETS_PER_SESSION` is checked, not enforced.** The reference lists 24 as a
builder cap. It is a quality-check note rather than a constraint the tuning loop respects,
because the volume targets and the per-session per-muscle cap already keep every built day
under it in all 360 combinations. **Proposed resolution:** leave it as a check until a
combination actually exceeds it.

**The app has `GOAL_SCALE` and the reference has a narrative.** 2.2 says strength lowers
volume and raises intensity, lean holds the floor and lowers the ceiling, health lowers
overall. The app's existing `GOAL_SCALE` already does this and the builder reads the
landmarks through it, so the numbers come from one place. The reference's rep-range table
(2.6) is now implemented separately in `SLOT_REPS_BY_GOAL`, which is the part the app did
not have.

**The `fly` slot has no bodyweight option.** Its curated bodyweight entry was a Deficit
Push-Up, which the catalogue correctly files as a horizontal press, and the library has no
movement that isolates the chest without a cable, a machine or a dumbbell. So for a
bodyweight-only user `pickExercise("fly", "bodyweight")` falls back to the head of the
list — a cable fly they cannot do. This predates phase 2 and is left standing because the
answer belongs to the quality check: either the builder drops the fly slot for that tier,
or a bodyweight chest-isolation movement is added to the library. Phase 5 decides.

**Three other slots have no bodyweight answer either**: `shrug`, `front_delt` and
`carry`. All three are catalogue-only slots, so the fallback returns a loaded movement.
The same phase-5 decision covers them.

**`Sumo Deadlift` stays in `hinge`.** M8 asks for sumo and wide-stance movements to be
re-slotted; `Sumo Squat` and `Wide-Stance Leg Press` already sit in `adductors` and stay
there. A sumo deadlift is left in `hinge` because it is a hinge — moving it would stop it
being a swap for the other deadlifts, which is what somebody standing at a barbell wants.
Its table entry already credits the adductors at 0.6, and the new keyword rule covers
unnamed wide-stance variants. Stated here rather than silently diverged from.

**Raising the e1RM cap from 12 to 15 reps changed the records code's answers.** L1 asks
for one RPE-adjusted definition. The records code previously ran Epley on the reps as
logged with a cap of 12; the trend ran it on reps plus reps-in-reserve with no cap. One
definition means one cap, and it is applied to reps-to-failure — so a set logged at 12
with two in reserve (14) is inside it rather than clipped. The visible effect is that
strength PRs are now awarded on RPE as well as on load and reps: 100×10 at RPE 7 beats a
previous 100×10 at RPE 10, which it should. Historic `st.pr` stamps are not rewritten;
they are recomputed whenever a session is swept.

## Phase 9 — the re-measurement

The brief's own closing requirement: build every combination again, record what comes out,
write the tables down, and accept nothing with a quality-check failure or a major muscle
outside its band. Run with `measure.mjs` in the scratchpad; the tables below are generated
from its output rather than typed.

### What the re-measurement found, before it could measure anything

Three defects, all of them invisible from inside the app and all of them found by the act
of building 360 plans and looking at the numbers.

**1. The builder's own answers never reached the volume bands.** Every one of the 360
combinations came out with identical landmarks. `adjustedLandmarks()` scales by
`experience()` and `trainingGoal()`, both of which read `S` — so somebody answering
"advanced, training to get leaner" had their plan built against the bands of whatever
profile was in the app at the time, usually a fresh beginner's. The answer reached the set
counts, the ramp-in and the effort ceilings, and never reached the one number it matters
most to. `buildTargets()` now puts the answered level and goal in place for the duration of
its own call and takes them back out in a `finally`, so the landmark code computes exactly
what it would for a person who *is* that level — calibration included, because what the app
has learned from somebody's own cycles is better information than any answer.

**2. The builder and its own quality check were reading different bands.** Fixing (1)
immediately produced 53 failures: the builder aiming at an advanced lifter's ceiling and the
check judging against the profile's. Both were right about their own numbers and the pair
was useless — a plan cannot be checked against a different person from the one it was
written for. `planQuality()` now accepts the targets its caller is working to, and the
builder passes them. Every other caller (the Program tab card, the import review) passes
nothing and gets the live profile's landmarks, which is what those screens are asking about.

**3. A set is never only its own muscle's set.** The tuning pass asked "has this muscle room
in this session" and then added a set to a movement feeding four others, so a bodyweight
squat added for the quads carried the abs past the per-session hard stop, and sets added all
week carried muscles past their weekly ceilings. The candidate itself is now checked in both
directions before the set is taken.

And two smaller ones, from reading the plans rather than the totals:

**The frequency check and its repair were asking different questions.** The check counts a
day as training a muscle when one movement gives it a real set; the repair asked whether the
day *totalled* a set. So a day with 1.4 sets of abs arriving as five lots of 0.3 looked
"not bare" to the repair and "not trained" to the check, and three combinations failed with
the repair declining to act. There is now one rule, `buildTrainsDay()`.

**Movements were being added twice to the same day.** Several repair paths each push a
movement onto a day and nothing stopped two of them choosing the same one — the grid
contained days carrying two Hanging Knee Raises and two Incline Dumbbell Curls, which is not
more volume, it is one exercise twice with its sets split. `buildHasMove()` guards every
add. Re-checked across all 360: **zero duplicates**.

**A ceiling that no set cut could reach.** Eighteen combinations — six days, advanced, every
tier but bodyweight — had the chest 16 to 17.4 sets against a ceiling of 15.8, with every
chest movement already at its floor. Push/pull/legs twice over simply contains one chest
movement more than that ceiling can hold, so the trim gained a last resort: remove a
movement, never the last direct work for any muscle, never one that drops a muscle under its
floor, an isolation before a second compound and a second compound before the lift that
opens a day — and say so in the notes.

### The run

| | |
|---|---|
| Combinations | **360** (days 2–6 × 4 gear tiers × 3 levels × 2 goals × budgets 45/60/75) |
| Quality-check failures | **0** |
| Combinations with a major muscle outside [MEV, min(MAV, 0.9·MRV)] | **0** |
| Warnings in total (informational) | 1644 |
| Longest single day | 91 min |
| Shortest single day | 21 min |
| Worst per-session load on one muscle | 10 sets (cap 24 working sets a session; 5 a movement) |
| Weekly working sets, lowest → highest | 51 → 144 |

### The bands each combination was measured against

`MEV` and the ceiling `min(MAV, 0.9·MRV)`, per level and goal, as the builder's own
`buildTargets()` computes them. Priority muscles are excepted by the brief and none are
set in any of these runs.

| Muscle | beginner · muscle | beginner · lean | intermediate · muscle | intermediate · lean | advanced · muscle | advanced · lean |
|---|---|---|---|---|---|---|
| Chest | 7–15 | 7–12.4 | 10–19.8 | 10–16.2 | 12–23.6 | 12–19 |
| Lats | 7–13.5 | 7–11.4 | 10–18 | 10–14.7 | 12–21.2 | 12–17.4 |
| Mid Back | 7–15 | 7–12.8 | 10–20 | 10–16.2 | 12–23.6 | 12–19.8 |
| Side Delts | 5.6–15 | 5.6–12.8 | 8–20 | 8–16.8 | 9.6–23.6 | 9.6–20.1 |
| Rear Delts | 4.2–13.5 | 4.2–11.5 | 6–18 | 6–15.3 | 7.2–21.2 | 7.2–18.1 |
| Biceps | 5.6–13.5 | 5.6–11.5 | 8–18 | 8–15.3 | 9.6–21.2 | 9.6–18.1 |
| Triceps | 4.2–10.5 | 4.2–8.9 | 6–14 | 6–11.7 | 7.2–16.5 | 7.2–14 |
| Quads | 5.6–12 | 5.6–10.2 | 8–16 | 8–13.1 | 9.6–18.9 | 9.6–15.8 |
| Hamstrings | 4.2–10.5 | 4.2–8.9 | 6–14 | 6–11.9 | 7.2–16.5 | 7.2–14 |
| Glutes | 2.8–9 | 2.8–7.7 | 4–12 | 4–10.2 | 4.8–14.2 | 4.8–12 |
| Calves | 5.6–10.5 | 5.6–8.9 | 8–14 | 8–11.9 | 9.6–16.5 | 9.6–14 |
| Abs | 4.2–13.5 | 4.2–11.5 | 6–18 | 6–15.3 | 7.2–21.2 | 7.2–18.1 |

### Weekly sets per muscle, across all 360 combinations

| Muscle | lowest | median | highest | in band |
|---|---|---|---|---|
| Chest | 7 | 12 | 20.4 | 360/360 |
| Lats | 7.1 | 11.5 | 15.5 | 360/360 |
| Mid Back | 7 | 13.3 | 19.6 | 360/360 |
| Side Delts | 6 | 10.2 | 15 | 360/360 |
| Rear Delts | 4.9 | 10.2 | 19.3 | 360/360 |
| Biceps | 5.7 | 10 | 16.1 | 360/360 |
| Triceps | 4.7 | 10.3 | 16.4 | 360/360 |
| Quads | 6 | 10 | 16 | 360/360 |
| Hamstrings | 4.3 | 8.5 | 16.1 | 360/360 |
| Glutes | 5.8 | 10 | 14.3 | 360/360 |
| Calves | 6 | 10.4 | 13.6 | 360/360 |
| Abs | 4.6 | 10 | 21.1 | 360/360 |

### Minutes a day

| Days | Budget | shortest | median | longest | over budget |
|---|---|---|---|---|---|
| 2 | 45 | 39 | 55 | 91 | 20 of 24 |
| 2 | 60 | 40 | 59 | 91 | 12 of 24 |
| 2 | 75 | 55 | 72 | 80 | 3 of 24 |
| 3 | 45 | 29 | 43.5 | 58 | 6 of 24 |
| 3 | 60 | 40 | 54 | 60 | none |
| 3 | 75 | 46 | 68 | 75 | none |
| 4 | 45 | 29 | 39 | 45 | none |
| 4 | 60 | 29 | 51 | 60 | none |
| 4 | 75 | 29 | 57 | 74 | none |
| 5 | 45 | 21 | 39 | 45 | none |
| 5 | 60 | 21 | 47.5 | 60 | none |
| 5 | 75 | 21 | 48 | 73 | none |
| 6 | 45 | 21 | 36 | 45 | none |
| 6 | 60 | 21 | 42 | 59 | none |
| 6 | 75 | 21 | 42 | 68 | none |

### Per-session maxima

The most any one muscle receives in a single session, which is what the per-session
ceiling exists for — weekly volume above about six fractional sets per muscle per
session has to come from more sessions rather than bigger ones.

| Days | worst single-muscle session load | the muscle | worst session, total sets |
|---|---|---|---|
| 2 | 9.3 | Abs | 51 (average a day) |
| 3 | 9.5 | Abs | 38 (average a day) |
| 4 | 9.8 | Chest | 31 (average a day) |
| 5 | 9.2 | Triceps | 26 (average a day) |
| 6 | 10 | Chest | 24 (average a day) |

### Every combination

Weekly sets per muscle, with the band check. `days/gear/level/goal/budget`; `in` is how
many of the 12 major muscles landed inside their own band.

| Combination | split | Chest | Lats | Mid&nbsp;Back | Side&nbsp;Delts | Rear&nbsp;Delts | Biceps | Triceps | Quads | Hamstrings | Glutes | Calves | Abs | in | day min–max | sess max |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2/full/beginner/muscle/45 | full2 | 8 | 7.3 | 7 | 6 | 6.5 | 6.1 | 4.7 | 7 | 6.3 | 5.9 | 6.4 | 5 | 12/12 | 43–58 | 5 |
| 2/full/beginner/muscle/60 | full2 | 8 | 8.8 | 8 | 7.2 | 5.5 | 8 | 5.7 | 7 | 7.3 | 6.7 | 7.4 | 5 | 12/12 | 59–59 | 5.5 |
| 2/full/beginner/muscle/75 | full2 | 11 | 8.8 | 9.5 | 10.8 | 8.5 | 9 | 8.6 | 9 | 9.5 | 8.2 | 8.6 | 5 | 12/12 | 72–74 | 6.3 |
| 2/full/beginner/lean/45 | full2 | 8 | 7.3 | 7 | 6 | 6.5 | 6.1 | 4.7 | 7 | 6.3 | 5.9 | 6.4 | 5 | 12/12 | 43–58 | 5 |
| 2/full/beginner/lean/60 | full2 | 9 | 8 | 7.5 | 7.2 | 6 | 6.5 | 6.2 | 7 | 6.3 | 5.9 | 7.4 | 5 | 12/12 | 57–57 | 5 |
| 2/full/beginner/lean/75 | full2 | 10 | 8.8 | 9.5 | 9.8 | 8.5 | 9 | 8.2 | 9 | 8.5 | 7.4 | 7.6 | 5 | 12/12 | 67–70 | 6.3 |
| 2/full/intermediate/muscle/45 | full2 | 10 | 11 | 11 | 8.2 | 7 | 8.4 | 6.1 | 8 | 9.3 | 9.9 | 8 | 7 | 12/12 | 60–65 | 7.3 |
| 2/full/intermediate/muscle/60 | full2 | 10 | 11 | 11 | 8.2 | 7 | 8.4 | 6.2 | 8 | 7.5 | 7.4 | 8.4 | 6 | 12/12 | 60–61 | 7.3 |
| 2/full/intermediate/muscle/75 | full2 | 12 | 11 | 12.5 | 10.2 | 10 | 10.4 | 9.1 | 10 | 8.8 | 8.9 | 10.4 | 9 | 12/12 | 71–72 | 7.5 |
| 2/full/intermediate/lean/45 | full2 | 10 | 11 | 11 | 8.2 | 7 | 8.4 | 6.1 | 8 | 9.3 | 9.9 | 8 | 7 | 12/12 | 60–65 | 7.3 |
| 2/full/intermediate/lean/60 | full2 | 10 | 11 | 11 | 8.2 | 7 | 8.4 | 6.2 | 8 | 7.5 | 7.4 | 8.4 | 6 | 12/12 | 60–61 | 7.3 |
| 2/full/intermediate/lean/75 | full2 | 12 | 11 | 12.5 | 10.2 | 10 | 10.4 | 8.1 | 10 | 8.8 | 8.9 | 10.4 | 9 | 12/12 | 70–72 | 7.5 |
| 2/full/advanced/muscle/45 | full2 | 12 | 12.3 | 12.3 | 10.2 | 9.9 | 10 | 7.6 | 10 | 8.8 | 8.9 | 10.4 | 8 | 12/12 | 61–91 | 8 |
| 2/full/advanced/muscle/60 | full2 | 12 | 12.3 | 12.3 | 10.2 | 9.9 | 10 | 7.6 | 10 | 8.8 | 8.9 | 10.4 | 8 | 12/12 | 61–91 | 8 |
| 2/full/advanced/muscle/75 | full2 | 12 | 13 | 12.3 | 10.2 | 8.4 | 11.5 | 7.7 | 10 | 8.8 | 8.9 | 10.4 | 8 | 12/12 | 74–80 | 7 |
| 2/full/advanced/lean/45 | full2 | 12 | 12.3 | 12.3 | 10.2 | 9.9 | 10 | 7.6 | 10 | 8.8 | 8.9 | 10.4 | 8 | 12/12 | 61–91 | 8 |
| 2/full/advanced/lean/60 | full2 | 12 | 12.3 | 12.3 | 10.2 | 9.9 | 10 | 7.6 | 10 | 8.8 | 8.9 | 10.4 | 8 | 12/12 | 61–91 | 8 |
| 2/full/advanced/lean/75 | full2 | 12 | 13 | 12.3 | 10.2 | 8.4 | 11.5 | 7.7 | 10 | 8.8 | 8.9 | 10.4 | 8 | 12/12 | 74–80 | 7 |
| 2/home/beginner/muscle/45 | full2 | 8 | 7.1 | 7.3 | 6 | 5.5 | 5.7 | 4.7 | 7 | 6.3 | 6.5 | 6.4 | 5 | 12/12 | 42–51 | 5 |
| 2/home/beginner/muscle/60 | full2 | 9 | 8.5 | 9.9 | 8.2 | 7.3 | 7.5 | 7.1 | 8 | 6.5 | 7.2 | 8.4 | 6 | 12/12 | 59–59 | 6 |
| 2/home/beginner/muscle/75 | full2 | 11 | 8.5 | 10.5 | 10.8 | 8.3 | 7.5 | 8.6 | 9 | 7.5 | 7.5 | 8.6 | 6 | 12/12 | 62–71 | 6.3 |
| 2/home/beginner/lean/45 | full2 | 8 | 7.5 | 8.2 | 6 | 5 | 6 | 4.7 | 7 | 4.3 | 5.9 | 6 | 4.8 | 12/12 | 47–48 | 5 |
| 2/home/beginner/lean/60 | full2 | 8 | 7.5 | 9.4 | 8.2 | 7 | 7 | 6.7 | 9 | 6.5 | 7.2 | 7.4 | 4.8 | 12/12 | 54–57 | 6 |
| 2/home/beginner/lean/75 | full2 | 10 | 7.5 | 9.4 | 9.8 | 7 | 7 | 8.2 | 9 | 7.5 | 7.5 | 7.6 | 4.8 | 12/12 | 69–69 | 6 |
| 2/home/intermediate/muscle/45 | full2 | 10 | 11.5 | 10.2 | 8.2 | 6 | 8 | 6.1 | 8 | 9.3 | 9.9 | 8 | 6.6 | 12/12 | 60–69 | 7 |
| 2/home/intermediate/muscle/60 | full2 | 10 | 10.1 | 10 | 8.2 | 8.2 | 8.2 | 6.1 | 8 | 7.5 | 8 | 8.4 | 6.6 | 12/12 | 57–61 | 7 |
| 2/home/intermediate/muscle/75 | full2 | 12 | 11.5 | 12 | 9.2 | 9 | 10 | 9.1 | 9 | 8.5 | 8.8 | 9.4 | 6.6 | 12/12 | 66–74 | 7.5 |
| 2/home/intermediate/lean/45 | full2 | 10 | 11.5 | 10.2 | 8.2 | 6 | 8 | 6.1 | 8 | 7.5 | 8 | 8.4 | 6.6 | 12/12 | 59–64 | 7 |
| 2/home/intermediate/lean/60 | full2 | 10 | 11.5 | 10.8 | 8.2 | 7 | 8 | 6.1 | 8 | 7.5 | 8 | 8.4 | 6.6 | 12/12 | 60–64 | 7 |
| 2/home/intermediate/lean/75 | full2 | 11 | 11.5 | 12 | 9.2 | 9 | 8 | 7.6 | 10 | 7.8 | 8.7 | 9.4 | 6.6 | 12/12 | 64–73 | 7 |
| 2/home/advanced/muscle/45 | full2 | 12 | 12.2 | 12.4 | 10.2 | 8.4 | 10.4 | 7.6 | 11 | 8.3 | 10.1 | 10.4 | 7.6 | 12/12 | 69–74 | 8 |
| 2/home/advanced/muscle/60 | full2 | 12 | 12.2 | 12.4 | 10.2 | 8.4 | 10.4 | 7.6 | 11 | 8.3 | 10.1 | 10.4 | 7.6 | 12/12 | 69–74 | 8 |
| 2/home/advanced/muscle/75 | full2 | 13 | 12.2 | 13 | 10.2 | 9.4 | 11.4 | 8.1 | 11 | 8.3 | 10.1 | 10.4 | 7.6 | 12/12 | 73–75 | 8.5 |
| 2/home/advanced/lean/45 | full2 | 12 | 12.6 | 13.3 | 10.2 | 8 | 10.7 | 7.6 | 11 | 8.3 | 10.1 | 10.4 | 7.4 | 12/12 | 70–77 | 8 |
| 2/home/advanced/lean/60 | full2 | 12 | 12.6 | 13.3 | 10.2 | 8 | 10.7 | 7.6 | 11 | 8.3 | 10.1 | 10.4 | 7.4 | 12/12 | 70–77 | 8 |
| 2/home/advanced/lean/75 | full2 | 12 | 12.6 | 14.5 | 10.2 | 10 | 10.7 | 8.6 | 12 | 8.3 | 10.1 | 10.4 | 7.4 | 12/12 | 74–77 | 8 |
| 2/dumbbell/beginner/muscle/45 | full2 | 8 | 7.8 | 7.7 | 6.2 | 4.9 | 7.1 | 5.7 | 7 | 6.8 | 7.4 | 6.4 | 5.2 | 12/12 | 45–49 | 5 |
| 2/dumbbell/beginner/muscle/60 | full2 | 10 | 8.5 | 9.9 | 8.2 | 7.3 | 8.5 | 7.6 | 8 | 7.5 | 8.1 | 8.4 | 7.2 | 12/12 | 57–58 | 6.2 |
| 2/dumbbell/beginner/muscle/75 | full2 | 11 | 8.5 | 10.5 | 10.8 | 8.3 | 8.5 | 8.6 | 9 | 7.7 | 8.8 | 8.4 | 7.2 | 12/12 | 62–64 | 6.3 |
| 2/dumbbell/beginner/lean/45 | full2 | 8 | 7.8 | 7.7 | 6.2 | 4.9 | 7.1 | 5.7 | 7 | 6.8 | 7.4 | 6.4 | 5.2 | 12/12 | 45–49 | 5 |
| 2/dumbbell/beginner/lean/60 | full2 | 9 | 8.5 | 10.5 | 8.8 | 8.3 | 8.5 | 7.7 | 8 | 6.8 | 7.4 | 7.4 | 7.2 | 12/12 | 55–58 | 6.3 |
| 2/dumbbell/beginner/lean/75 | full2 | 9 | 8.5 | 10.5 | 8.8 | 8.3 | 8.5 | 7.7 | 8 | 6.8 | 7.4 | 7.4 | 7.2 | 12/12 | 70–71 | 6.3 |
| 2/dumbbell/intermediate/muscle/45 | full2 | 10 | 10.1 | 10 | 8.2 | 8.2 | 8.2 | 6.1 | 8 | 6.1 | 8.1 | 8 | 6.8 | 12/12 | 54–75 | 7 |
| 2/dumbbell/intermediate/muscle/60 | full2 | 10 | 10.8 | 10.4 | 8.2 | 7.6 | 8.6 | 6.1 | 8 | 7.1 | 8.1 | 8.4 | 6.8 | 12/12 | 59–71 | 7 |
| 2/dumbbell/intermediate/muscle/75 | full2 | 12 | 11.5 | 11.4 | 9.2 | 8 | 10 | 8.1 | 9 | 7.7 | 8.8 | 9.4 | 6.8 | 12/12 | 73–75 | 7.5 |
| 2/dumbbell/intermediate/lean/45 | full2 | 10 | 10.1 | 10 | 8.2 | 8.2 | 8.2 | 6.1 | 8 | 6.1 | 8.1 | 8 | 6.8 | 12/12 | 54–75 | 7 |
| 2/dumbbell/intermediate/lean/60 | full2 | 10 | 10.8 | 10.4 | 8.2 | 7.6 | 8.6 | 6.1 | 8 | 7.1 | 8.1 | 8.4 | 6.8 | 12/12 | 59–71 | 7 |
| 2/dumbbell/intermediate/lean/75 | full2 | 12 | 11.5 | 11.4 | 9.2 | 8 | 10 | 8.1 | 9 | 7.7 | 8.8 | 9.4 | 6.8 | 12/12 | 73–75 | 7.5 |
| 2/dumbbell/advanced/muscle/45 | full2 | 12 | 12.2 | 12.4 | 10.2 | 8.4 | 10.4 | 7.6 | 11 | 8.3 | 10.8 | 10.4 | 7.6 | 12/12 | 56–85 | 8 |
| 2/dumbbell/advanced/muscle/60 | full2 | 12 | 12.2 | 12.4 | 10.2 | 8.4 | 10.4 | 7.6 | 10 | 7.7 | 10.2 | 10.4 | 7.6 | 12/12 | 57–78 | 8 |
| 2/dumbbell/advanced/muscle/75 | full2 | 13 | 12.9 | 12.8 | 10.8 | 7.8 | 12.8 | 8.6 | 10 | 9.8 | 11.4 | 10.6 | 7.6 | 12/12 | 74–75 | 8.2 |
| 2/dumbbell/advanced/lean/45 | full2 | 12 | 12.2 | 12.4 | 10.2 | 8.4 | 10.4 | 7.6 | 10 | 8.3 | 10.1 | 10.4 | 7.2 | 12/12 | 56–85 | 8 |
| 2/dumbbell/advanced/lean/60 | full2 | 12 | 12.2 | 12.4 | 10.2 | 8.4 | 10.4 | 7.7 | 10 | 7.7 | 9.6 | 10.4 | 7.2 | 12/12 | 60–77 | 7.9 |
| 2/dumbbell/advanced/lean/75 | full2 | 13 | 12.9 | 12.8 | 9.8 | 7.8 | 12.8 | 7.6 | 10 | 9.7 | 10.2 | 9.8 | 7.2 | 12/12 | 74–75 | 8 |
| 2/bodyweight/beginner/muscle/45 | full2 | 9 | 8.5 | 9.3 | 7.8 | 6.5 | 8 | 7.2 | 8 | 6.2 | 8.2 | 8.6 | 9.4 | 12/12 | 45–45 | 6.9 |
| 2/bodyweight/beginner/muscle/60 | full2 | 11.5 | 8.5 | 10.5 | 11.2 | 8.5 | 9 | 9.8 | 9 | 6.2 | 9 | 8.6 | 10.3 | 12/12 | 50–58 | 7.8 |
| 2/bodyweight/beginner/muscle/75 | full2 | 11.5 | 8.5 | 10.5 | 11.2 | 8.5 | 9 | 9.8 | 9 | 6.2 | 9 | 8.6 | 10.3 | 12/12 | 61–70 | 7.8 |
| 2/bodyweight/beginner/lean/45 | full2 | 9.5 | 8.5 | 9.9 | 8.8 | 7.5 | 8 | 8.2 | 8 | 5.6 | 7.3 | 7.6 | 9 | 12/12 | 45–45 | 7.1 |
| 2/bodyweight/beginner/lean/60 | full2 | 9.5 | 8.5 | 10.5 | 9.2 | 8.5 | 9 | 8.8 | 8 | 5.6 | 7.3 | 7.6 | 9.3 | 12/12 | 54–56 | 7.4 |
| 2/bodyweight/beginner/lean/75 | full2 | 9.5 | 8.5 | 10.5 | 9.2 | 8.5 | 9 | 8.8 | 8 | 5.6 | 7.3 | 7.6 | 9.3 | 12/12 | 71–75 | 7.4 |
| 2/bodyweight/intermediate/muscle/45 | full2 | 11.5 | 11.5 | 12 | 10.8 | 9.3 | 9.5 | 9.2 | 10 | 8 | 10.9 | 10.8 | 11 | 12/12 | 40–45 | 7 |
| 2/bodyweight/intermediate/muscle/60 | full2 | 11.5 | 11.5 | 12 | 11.6 | 9.3 | 9.5 | 10.4 | 11 | 9.3 | 11.9 | 11 | 12.6 | 12/12 | 40–48 | 8.1 |
| 2/bodyweight/intermediate/muscle/75 | full2 | 11.5 | 11.5 | 12 | 11.6 | 9.3 | 9.5 | 10.4 | 11 | 9.3 | 11.9 | 11 | 12.6 | 12/12 | 68–74 | 8.1 |
| 2/bodyweight/intermediate/lean/45 | full2 | 11.5 | 11.5 | 12 | 10.8 | 9.3 | 9.5 | 9.2 | 10 | 7 | 10 | 10.6 | 11.1 | 12/12 | 39–45 | 7.5 |
| 2/bodyweight/intermediate/lean/60 | full2 | 11.5 | 11.5 | 12 | 11.2 | 9.3 | 9.5 | 9.8 | 10 | 7 | 10 | 10.6 | 11.5 | 12/12 | 46–58 | 7.8 |
| 2/bodyweight/intermediate/lean/75 | full2 | 11.5 | 11.5 | 12 | 11.2 | 9.3 | 9.5 | 9.8 | 10 | 7 | 10 | 10.6 | 11.5 | 12/12 | 70–74 | 7.8 |
| 2/bodyweight/advanced/muscle/45 | full2 | 12 | 12.2 | 12.4 | 9.8 | 8.7 | 11 | 8.7 | 10 | 7.8 | 10.2 | 9.8 | 11.6 | 12/12 | 45–48 | 8 |
| 2/bodyweight/advanced/muscle/60 | full2 | 14 | 13.6 | 15 | 10.8 | 10.6 | 13 | 11.2 | 12 | 9 | 12.6 | 11 | 13.4 | 12/12 | 55–59 | 9 |
| 2/bodyweight/advanced/muscle/75 | full2 | 14 | 13.6 | 15 | 11.6 | 10.6 | 15 | 12.4 | 13 | 9.3 | 13.6 | 11 | 15.4 | 12/12 | 55–66 | 9.3 |
| 2/bodyweight/advanced/lean/45 | full2 | 12 | 12.2 | 12.4 | 9.8 | 8.7 | 11 | 8.7 | 10 | 7.8 | 10.2 | 9.8 | 11.6 | 12/12 | 45–48 | 8 |
| 2/bodyweight/advanced/lean/60 | full2 | 14 | 13.6 | 15 | 11.6 | 10.6 | 14 | 12.4 | 12 | 8 | 12 | 10.8 | 13.6 | 12/12 | 54–60 | 9 |
| 2/bodyweight/advanced/lean/75 | full2 | 14 | 13.6 | 15 | 11.6 | 10.6 | 15 | 12.4 | 12 | 8 | 12 | 10.8 | 14.6 | 12/12 | 71–73 | 9.3 |
| 3/full/beginner/muscle/45 | full3 | 11 | 10 | 11.6 | 9.8 | 8.8 | 9.8 | 8.6 | 9 | 8.5 | 8.2 | 8.4 | 8 | 12/12 | 29–45 | 6 |
| 3/full/beginner/muscle/60 | full3 | 11 | 10.8 | 12.6 | 9.8 | 9.3 | 10.3 | 8.6 | 9 | 9.5 | 8.2 | 8.6 | 9 | 12/12 | 50–60 | 6 |
| 3/full/beginner/muscle/75 | full3 | 11 | 10.8 | 12.6 | 9.8 | 9.3 | 10.3 | 8.6 | 9 | 9.5 | 8.2 | 8.6 | 9 | 12/12 | 61–72 | 6 |
| 3/full/beginner/lean/45 | full3 | 10 | 9.3 | 10.6 | 9.8 | 8.3 | 9.4 | 8.2 | 9 | 7.5 | 6.6 | 8.6 | 8 | 12/12 | 40–45 | 6 |
| 3/full/beginner/lean/60 | full3 | 10 | 9.3 | 10.6 | 9.8 | 8.3 | 9.4 | 8.2 | 9 | 7.5 | 6.6 | 8.6 | 8 | 12/12 | 52–56 | 6 |
| 3/full/beginner/lean/75 | full3 | 10 | 9.3 | 10.6 | 9.8 | 8.3 | 9.4 | 8.2 | 9 | 7.5 | 6.6 | 8.6 | 8 | 12/12 | 54–70 | 6 |
| 3/full/intermediate/muscle/45 | full3 | 11 | 11 | 12.5 | 10 | 10 | 10.4 | 8.2 | 10 | 8.5 | 8.2 | 9.4 | 8 | 12/12 | 39–45 | 6.5 |
| 3/full/intermediate/muscle/60 | full3 | 11 | 12.5 | 14.5 | 13 | 11 | 11.3 | 10.2 | 12 | 10 | 9.6 | 10.6 | 10 | 12/12 | 53–60 | 6.5 |
| 3/full/intermediate/muscle/75 | full3 | 11 | 12.5 | 14.5 | 13 | 11 | 11.3 | 10.2 | 12 | 10 | 9.6 | 10.6 | 10 | 12/12 | 68–73 | 6.5 |
| 3/full/intermediate/lean/45 | full3 | 11 | 11 | 12.5 | 9.4 | 10 | 10.4 | 7.7 | 9 | 7.5 | 7.4 | 9.4 | 7 | 12/12 | 35–45 | 6.5 |
| 3/full/intermediate/lean/60 | full3 | 11 | 12.5 | 14.5 | 12.4 | 11 | 11.3 | 9.7 | 11 | 9 | 8.8 | 10.6 | 10 | 12/12 | 53–54 | 6.5 |
| 3/full/intermediate/lean/75 | full3 | 11 | 12.5 | 14.5 | 12.4 | 11 | 11.3 | 9.7 | 11 | 9 | 8.8 | 10.6 | 10 | 12/12 | 65–68 | 6.5 |
| 3/full/advanced/muscle/45 | full3 | 12 | 12.5 | 15 | 10 | 12 | 11.4 | 8.2 | 12 | 9.8 | 8.9 | 9.6 | 8 | 12/12 | 40–53 | 7 |
| 3/full/advanced/muscle/60 | full3 | 13 | 12.5 | 15 | 13 | 12 | 11.4 | 10.6 | 15 | 11.5 | 11 | 12.8 | 10 | 12/12 | 40–60 | 8 |
| 3/full/advanced/muscle/75 | full3 | 13 | 12.5 | 15 | 15 | 12 | 11.4 | 10.6 | 15 | 12.5 | 11 | 13 | 10 | 12/12 | 61–75 | 8 |
| 3/full/advanced/lean/45 | full3 | 12 | 12.5 | 15 | 10 | 12 | 11.4 | 8.2 | 11 | 9.8 | 8.9 | 9.6 | 8 | 12/12 | 39–53 | 7 |
| 3/full/advanced/lean/60 | full3 | 13 | 12.5 | 15 | 15 | 12 | 11.4 | 10.6 | 13 | 11.3 | 10.3 | 12.8 | 10 | 12/12 | 58–60 | 8 |
| 3/full/advanced/lean/75 | full3 | 13 | 12.5 | 15 | 15 | 12 | 11.4 | 10.6 | 13 | 11.3 | 10.3 | 12.8 | 10 | 12/12 | 75–75 | 8 |
| 3/home/beginner/muscle/45 | full3 | 11 | 8.6 | 11.9 | 9.8 | 8 | 8.7 | 7.6 | 9 | 7.5 | 7.5 | 8.6 | 8.6 | 12/12 | 39–45 | 6 |
| 3/home/beginner/muscle/60 | full3 | 11 | 8.6 | 11.9 | 9.8 | 8 | 8.7 | 8.6 | 9 | 7.5 | 7.5 | 8.6 | 8.6 | 12/12 | 51–58 | 6 |
| 3/home/beginner/muscle/75 | full3 | 11 | 8.6 | 11.9 | 9.8 | 8 | 8.7 | 8.6 | 9 | 7.5 | 7.5 | 8.6 | 8.6 | 12/12 | 51–68 | 6 |
| 3/home/beginner/lean/45 | full3 | 10 | 7.2 | 9.9 | 9.2 | 7.2 | 6.9 | 7.7 | 9 | 7.5 | 7.5 | 8.6 | 6.6 | 12/12 | 36–42 | 5 |
| 3/home/beginner/lean/60 | full3 | 10 | 7.2 | 9.9 | 9.2 | 7.2 | 6.9 | 7.7 | 9 | 7.5 | 7.5 | 8.6 | 6.6 | 12/12 | 46–51 | 5 |
| 3/home/beginner/lean/75 | full3 | 10 | 7.2 | 9.9 | 9.2 | 7.2 | 6.9 | 7.7 | 9 | 7.5 | 7.5 | 8.6 | 6.6 | 12/12 | 46–68 | 5 |
| 3/home/intermediate/muscle/45 | full3 | 11 | 10.6 | 12.3 | 8.8 | 7.5 | 8.7 | 7.2 | 8 | 7.5 | 8 | 8.4 | 7 | 12/12 | 43–44 | 6 |
| 3/home/intermediate/muscle/60 | full3 | 11 | 12 | 15.5 | 13 | 10.3 | 10.5 | 10.2 | 12 | 10 | 10 | 10.8 | 11 | 12/12 | 53–56 | 6.5 |
| 3/home/intermediate/muscle/75 | full3 | 11 | 12 | 15.5 | 13 | 10.3 | 10.5 | 10.2 | 12 | 10 | 10 | 10.8 | 11 | 12/12 | 68–70 | 6.5 |
| 3/home/intermediate/lean/45 | full3 | 11 | 11.6 | 14 | 9.8 | 9.7 | 9.2 | 8.2 | 11 | 8 | 8.9 | 10.6 | 8.2 | 12/12 | 33–45 | 6.5 |
| 3/home/intermediate/lean/60 | full3 | 11 | 12.3 | 15 | 9.8 | 10.1 | 9.6 | 9.2 | 11 | 8 | 8.9 | 10.6 | 9.2 | 12/12 | 44–60 | 6.5 |
| 3/home/intermediate/lean/75 | full3 | 11 | 12.3 | 15 | 9.8 | 10.1 | 9.6 | 9.2 | 11 | 8 | 8.9 | 10.6 | 9.2 | 12/12 | 60–74 | 6.5 |
| 3/home/advanced/muscle/45 | full3 | 12 | 12 | 13.7 | 9.8 | 7.3 | 10.5 | 7.6 | 10 | 8 | 9.4 | 10.4 | 8 | 12/12 | 44–58 | 7 |
| 3/home/advanced/muscle/60 | full3 | 13 | 12 | 16.1 | 13.4 | 11.3 | 10.5 | 10.1 | 15 | 10.5 | 11.9 | 12.6 | 11 | 12/12 | 59–60 | 8 |
| 3/home/advanced/muscle/75 | full3 | 13 | 12 | 16.1 | 15 | 11.3 | 10.5 | 10.6 | 15 | 12.5 | 12.5 | 13 | 11 | 12/12 | 62–73 | 8 |
| 3/home/advanced/lean/45 | full3 | 12 | 12 | 16.1 | 9.8 | 11.3 | 10.5 | 7.6 | 13 | 8.3 | 10.1 | 10.4 | 8 | 12/12 | 34–51 | 7 |
| 3/home/advanced/lean/60 | full3 | 13 | 12 | 16.1 | 13.8 | 11.3 | 10.5 | 9.6 | 13 | 11.3 | 11 | 13 | 11 | 12/12 | 48–59 | 8 |
| 3/home/advanced/lean/75 | full3 | 13 | 12 | 16.1 | 13.8 | 11.3 | 10.5 | 9.6 | 13 | 11.3 | 11 | 13 | 11 | 12/12 | 67–75 | 8 |
| 3/dumbbell/beginner/muscle/45 | full3 | 11 | 9.6 | 12.4 | 9.8 | 8.2 | 9.2 | 7.6 | 9 | 8.1 | 8.4 | 8.6 | 8 | 12/12 | 35–45 | 6 |
| 3/dumbbell/beginner/muscle/60 | full3 | 11 | 10.3 | 13.4 | 9.8 | 8.6 | 9.6 | 8.6 | 9 | 8.1 | 8.4 | 8.6 | 9 | 12/12 | 54–60 | 6 |
| 3/dumbbell/beginner/muscle/75 | full3 | 11 | 10.3 | 13.4 | 9.8 | 8.6 | 9.6 | 8.6 | 9 | 8.1 | 8.4 | 8.6 | 9 | 12/12 | 60–68 | 6 |
| 3/dumbbell/beginner/lean/45 | full3 | 10 | 8.2 | 10.4 | 9.2 | 7.4 | 8.4 | 7.7 | 9 | 5.1 | 7.5 | 8 | 8 | 12/12 | 41–45 | 6 |
| 3/dumbbell/beginner/lean/60 | full3 | 10 | 8.2 | 10.4 | 9.2 | 7.4 | 8.4 | 7.7 | 9 | 5.1 | 7.5 | 8 | 8 | 12/12 | 49–57 | 6 |
| 3/dumbbell/beginner/lean/75 | full3 | 10 | 8.2 | 10.4 | 9.2 | 7.4 | 8.4 | 7.7 | 9 | 5.1 | 7.5 | 8 | 8 | 12/12 | 57–62 | 6 |
| 3/dumbbell/intermediate/muscle/45 | full3 | 11 | 11.3 | 13.9 | 10 | 8.9 | 10.1 | 8.2 | 10 | 8.4 | 9.6 | 9.4 | 7.2 | 12/12 | 44–45 | 6.5 |
| 3/dumbbell/intermediate/muscle/60 | full3 | 11 | 12 | 15.5 | 13 | 10.3 | 10.5 | 10.2 | 12 | 10.6 | 11.9 | 10.6 | 11.6 | 12/12 | 47–53 | 6.5 |
| 3/dumbbell/intermediate/muscle/75 | full3 | 11 | 12 | 15.5 | 13 | 10.3 | 10.5 | 10.2 | 12 | 10.6 | 11.9 | 10.6 | 11.6 | 12/12 | 65–68 | 6.5 |
| 3/dumbbell/intermediate/lean/45 | full3 | 11 | 11 | 15 | 8.8 | 10 | 10 | 7.2 | 9 | 8.1 | 8.7 | 9.4 | 7 | 12/12 | 37–45 | 6 |
| 3/dumbbell/intermediate/lean/60 | full3 | 11 | 11 | 15 | 11.8 | 10 | 10 | 9.2 | 10 | 9.3 | 9.7 | 10.6 | 11 | 12/12 | 53–57 | 6 |
| 3/dumbbell/intermediate/lean/75 | full3 | 11 | 11 | 15 | 11.8 | 10 | 10 | 9.2 | 10 | 9.3 | 9.7 | 10.6 | 11 | 12/12 | 68–72 | 6 |
| 3/dumbbell/advanced/muscle/45 | full3 | 12 | 12 | 14.9 | 10 | 9.3 | 10.5 | 8.2 | 10 | 7.7 | 8.9 | 10.4 | 8.2 | 12/12 | 45–48 | 7 |
| 3/dumbbell/advanced/muscle/60 | full3 | 13 | 12 | 16.1 | 15 | 11.3 | 10.5 | 10.6 | 14 | 12.3 | 13.7 | 12.8 | 13 | 12/12 | 50–60 | 8 |
| 3/dumbbell/advanced/muscle/75 | full3 | 13 | 12 | 16.1 | 15 | 11.3 | 10.5 | 10.6 | 14 | 12.3 | 13.7 | 12.8 | 13 | 12/12 | 70–75 | 8 |
| 3/dumbbell/advanced/lean/45 | full3 | 12 | 12 | 14.9 | 10 | 9.3 | 10.5 | 8.2 | 10 | 7.7 | 8.9 | 10.4 | 8.2 | 12/12 | 45–48 | 7 |
| 3/dumbbell/advanced/lean/60 | full3 | 13 | 12 | 16.1 | 15 | 11.3 | 10.5 | 10.6 | 13 | 11 | 11.5 | 12.8 | 12.6 | 12/12 | 50–58 | 8 |
| 3/dumbbell/advanced/lean/75 | full3 | 13 | 12 | 16.1 | 15 | 11.3 | 10.5 | 10.6 | 13 | 11 | 11.5 | 12.8 | 12.6 | 12/12 | 67–75 | 8 |
| 3/bodyweight/beginner/muscle/45 | full3 | 10 | 7.9 | 11.5 | 11.2 | 8.9 | 10 | 9.8 | 9 | 7.2 | 9 | 8.8 | 13.6 | 12/12 | 40–45 | 7.1 |
| 3/bodyweight/beginner/muscle/60 | full3 | 10 | 7.9 | 11.5 | 11.2 | 8.9 | 10 | 9.8 | 9 | 7.2 | 9 | 8.8 | 13.6 | 12/12 | 50–59 | 7.1 |
| 3/bodyweight/beginner/muscle/75 | full3 | 10 | 7.9 | 11.5 | 11.2 | 8.9 | 10 | 9.8 | 9 | 7.2 | 9 | 8.8 | 13.6 | 12/12 | 59–70 | 7.1 |
| 3/bodyweight/beginner/lean/45 | full3 | 7 | 7.2 | 10.5 | 9.2 | 8.5 | 8.5 | 8.3 | 9 | 4.6 | 7.5 | 8.4 | 10.9 | 12/12 | 38–43 | 5.8 |
| 3/bodyweight/beginner/lean/60 | full3 | 7 | 7.2 | 10.5 | 9.2 | 8.5 | 8.5 | 8.3 | 9 | 4.6 | 7.5 | 8.4 | 10.9 | 12/12 | 50–55 | 5.8 |
| 3/bodyweight/beginner/lean/75 | full3 | 7 | 7.2 | 10.5 | 9.2 | 8.5 | 8.5 | 8.3 | 9 | 4.6 | 7.5 | 8.4 | 10.9 | 12/12 | 50–64 | 5.8 |
| 3/bodyweight/intermediate/muscle/45 | full3 | 12 | 12 | 15.5 | 11.2 | 10.8 | 11.5 | 10.8 | 12 | 9 | 11.7 | 11 | 16 | 12/12 | 31–45 | 8.9 |
| 3/bodyweight/intermediate/muscle/60 | full3 | 12 | 12 | 15.5 | 11.2 | 10.8 | 11.5 | 10.8 | 12 | 9 | 11.7 | 11 | 18 | 12/12 | 47–60 | 8.9 |
| 3/bodyweight/intermediate/muscle/75 | full3 | 12 | 12 | 15.5 | 11.2 | 10.8 | 11.5 | 10.8 | 12 | 9 | 11.7 | 11 | 18 | 12/12 | 63–74 | 8.9 |
| 3/bodyweight/intermediate/lean/45 | full3 | 10.5 | 10.3 | 14 | 11.2 | 10.1 | 10.5 | 10.8 | 11 | 6.4 | 9.9 | 10.6 | 15.1 | 12/12 | 41–44 | 7.1 |
| 3/bodyweight/intermediate/lean/60 | full3 | 10.5 | 10.3 | 14 | 11.2 | 10.1 | 10.5 | 10.8 | 11 | 6.4 | 9.9 | 10.6 | 15.1 | 12/12 | 56–59 | 7.1 |
| 3/bodyweight/intermediate/lean/75 | full3 | 10.5 | 10.3 | 14 | 11.2 | 10.1 | 10.5 | 10.8 | 11 | 6.4 | 9.9 | 10.6 | 15.1 | 12/12 | 59–74 | 7.1 |
| 3/bodyweight/advanced/muscle/45 | full3 | 15 | 12 | 16.1 | 13.6 | 11.8 | 11.5 | 11.4 | 13 | 9.3 | 11.3 | 13 | 20.1 | 12/12 | 30–42 | 9.5 |
| 3/bodyweight/advanced/muscle/60 | full3 | 16 | 12 | 16.1 | 13.6 | 11.8 | 11.5 | 13.4 | 15 | 9.3 | 12.9 | 13 | 21.1 | 12/12 | 48–53 | 9.5 |
| 3/bodyweight/advanced/muscle/75 | full3 | 16 | 12 | 16.1 | 13.6 | 11.8 | 11.5 | 13.4 | 15 | 9.3 | 12.9 | 13 | 21.1 | 12/12 | 63–69 | 9.5 |
| 3/bodyweight/advanced/lean/45 | full3 | 12 | 12.6 | 15.1 | 13.6 | 11.4 | 11.5 | 11.4 | 13 | 9 | 11.1 | 13 | 17.2 | 12/12 | 32–45 | 7.5 |
| 3/bodyweight/advanced/lean/60 | full3 | 12 | 12.6 | 15.1 | 13.6 | 11.4 | 11.5 | 11.4 | 13 | 9 | 11.1 | 13 | 17.2 | 12/12 | 47–60 | 7.5 |
| 3/bodyweight/advanced/lean/75 | full3 | 12 | 12.6 | 15.1 | 13.6 | 11.4 | 11.5 | 11.4 | 13 | 9 | 11.1 | 13 | 17.2 | 12/12 | 58–75 | 7.5 |
| 4/full/beginner/muscle/45 | ul4 | 9 | 10.5 | 11.9 | 9.8 | 10.6 | 8.7 | 10.2 | 8 | 9.3 | 7.5 | 8.6 | 9 | 12/12 | 38–45 | 6.5 |
| 4/full/beginner/muscle/60 | ul4 | 9 | 10.5 | 11.9 | 9.8 | 10.6 | 8.7 | 10.2 | 8 | 9.3 | 7.5 | 8.6 | 9 | 12/12 | 40–57 | 6.5 |
| 4/full/beginner/muscle/75 | ul4 | 9 | 10.5 | 11.9 | 9.8 | 10.6 | 8.7 | 10.2 | 8 | 9.3 | 7.5 | 8.6 | 9 | 12/12 | 40–62 | 6.5 |
| 4/full/beginner/lean/45 | ul4 | 9 | 9.5 | 11 | 6.2 | 9.6 | 8.3 | 8.7 | 8 | 8.3 | 7.5 | 8.4 | 8 | 12/12 | 36–44 | 6 |
| 4/full/beginner/lean/60 | ul4 | 9 | 9.5 | 11 | 6.2 | 9.6 | 8.3 | 8.7 | 8 | 8.3 | 7.5 | 8.4 | 8 | 12/12 | 38–53 | 6 |
| 4/full/beginner/lean/75 | ul4 | 9 | 9.5 | 11 | 6.2 | 9.6 | 8.3 | 8.7 | 8 | 8.3 | 7.5 | 8.4 | 8 | 12/12 | 38–53 | 6 |
| 4/full/intermediate/muscle/45 | ul4 | 12 | 12 | 12.4 | 10.2 | 8.6 | 9.6 | 9 | 9 | 12 | 12 | 10.6 | 10 | 12/12 | 34–45 | 8 |
| 4/full/intermediate/muscle/60 | ul4 | 12 | 13 | 15.3 | 11.8 | 13.8 | 10.1 | 11.5 | 9 | 12 | 12 | 10.6 | 10 | 12/12 | 51–60 | 8.1 |
| 4/full/intermediate/muscle/75 | ul4 | 12 | 13 | 15.3 | 11.8 | 13.8 | 10.1 | 11.5 | 9 | 12 | 12 | 10.6 | 10 | 12/12 | 51–73 | 8.1 |
| 4/full/intermediate/lean/45 | ul4 | 12 | 11.3 | 12.9 | 8.8 | 11.1 | 9.2 | 10.5 | 8 | 10.3 | 9.5 | 10.6 | 10 | 12/12 | 37–45 | 7.7 |
| 4/full/intermediate/lean/60 | ul4 | 12 | 12 | 14.9 | 8.8 | 13.6 | 9.6 | 11.5 | 8 | 10.3 | 9.5 | 10.6 | 10 | 12/12 | 49–59 | 7.7 |
| 4/full/intermediate/lean/75 | ul4 | 12 | 12 | 14.9 | 8.8 | 13.6 | 9.6 | 11.5 | 8 | 10.3 | 9.5 | 10.6 | 10 | 12/12 | 49–68 | 7.7 |
| 4/full/advanced/muscle/45 | ul4 | 13 | 13 | 12.8 | 10.2 | 8.6 | 10.1 | 9 | 10 | 14.5 | 13.8 | 12.8 | 10 | 12/12 | 39–45 | 9.5 |
| 4/full/advanced/muscle/60 | ul4 | 13 | 15.5 | 18.7 | 14.4 | 16.8 | 12.5 | 14 | 10 | 14.5 | 13.8 | 12.8 | 10 | 12/12 | 54–60 | 9.6 |
| 4/full/advanced/muscle/75 | ul4 | 13 | 15.5 | 18.7 | 14.4 | 16.8 | 12.5 | 14 | 10 | 14.5 | 13.8 | 12.8 | 10 | 12/12 | 58–74 | 9.6 |
| 4/full/advanced/lean/45 | ul4 | 12 | 12.3 | 12.3 | 9.8 | 9.1 | 9.7 | 9.1 | 10 | 13.5 | 11.8 | 12.8 | 10 | 12/12 | 38–44 | 8.5 |
| 4/full/advanced/lean/60 | ul4 | 13 | 14.5 | 17.8 | 9.8 | 15.6 | 12 | 13.5 | 10 | 13.5 | 11.8 | 12.8 | 10 | 12/12 | 50–55 | 9.1 |
| 4/full/advanced/lean/75 | ul4 | 13 | 14.5 | 17.8 | 9.8 | 15.6 | 12 | 13.5 | 10 | 13.5 | 11.8 | 12.8 | 10 | 12/12 | 53–69 | 9.1 |
| 4/home/beginner/muscle/45 | ul4 | 10.2 | 9.2 | 11.7 | 9.2 | 10.2 | 6.9 | 10.3 | 8 | 6.3 | 7.5 | 8 | 6.6 | 12/12 | 32–45 | 7.2 |
| 4/home/beginner/muscle/60 | ul4 | 10.2 | 9.2 | 11.7 | 9.2 | 10.2 | 6.9 | 10.3 | 8 | 6.3 | 7.5 | 8 | 6.6 | 12/12 | 32–57 | 7.2 |
| 4/home/beginner/muscle/75 | ul4 | 10.2 | 9.2 | 11.7 | 9.2 | 10.2 | 6.9 | 10.3 | 8 | 6.3 | 7.5 | 8 | 6.6 | 12/12 | 32–57 | 7.2 |
| 4/home/beginner/lean/45 | ul4 | 9.2 | 9.2 | 10.5 | 6.2 | 8.2 | 5.9 | 8.9 | 8 | 6.3 | 7.5 | 8 | 4.6 | 12/12 | 29–42 | 7.2 |
| 4/home/beginner/lean/60 | ul4 | 9.2 | 9.2 | 10.5 | 6.2 | 8.2 | 5.9 | 8.9 | 8 | 6.3 | 7.5 | 8 | 4.6 | 12/12 | 29–50 | 7.2 |
| 4/home/beginner/lean/75 | ul4 | 9.2 | 9.2 | 10.5 | 6.2 | 8.2 | 5.9 | 8.9 | 8 | 6.3 | 7.5 | 8 | 4.6 | 12/12 | 29–50 | 7.2 |
| 4/home/intermediate/muscle/45 | ul4 | 12.8 | 12.6 | 13.6 | 11.8 | 10.2 | 8.2 | 11 | 9 | 10.5 | 11.6 | 10.4 | 9.8 | 12/12 | 37–45 | 8.8 |
| 4/home/intermediate/muscle/60 | ul4 | 13.8 | 12.6 | 15.4 | 11.8 | 13.2 | 8.2 | 12.4 | 9 | 10.5 | 11.6 | 10.4 | 9.8 | 12/12 | 45–60 | 9 |
| 4/home/intermediate/muscle/75 | ul4 | 13.8 | 12.6 | 15.4 | 11.8 | 13.2 | 8.2 | 12.4 | 9 | 10.5 | 11.6 | 10.4 | 9.8 | 12/12 | 45–73 | 9 |
| 4/home/intermediate/lean/45 | ul4 | 11.8 | 12.6 | 14.2 | 8.2 | 11.2 | 8.2 | 11.1 | 8 | 9.3 | 10.1 | 10.4 | 8.8 | 12/12 | 34–45 | 8.8 |
| 4/home/intermediate/lean/60 | ul4 | 11.8 | 12.6 | 14.2 | 8.2 | 11.2 | 8.2 | 11.1 | 8 | 9.3 | 10.1 | 10.4 | 8.8 | 12/12 | 45–59 | 8.8 |
| 4/home/intermediate/lean/75 | ul4 | 11.8 | 12.6 | 14.2 | 8.2 | 11.2 | 8.2 | 11.1 | 8 | 9.3 | 10.1 | 10.4 | 8.8 | 12/12 | 45–68 | 8.8 |
| 4/home/advanced/muscle/45 | ul4 | 13.4 | 15 | 16.2 | 10.4 | 12 | 10 | 12.3 | 11 | 12.3 | 14.1 | 12.4 | 10.8 | 12/12 | 32–45 | 9.4 |
| 4/home/advanced/muscle/60 | ul4 | 14.4 | 14.3 | 17.6 | 14.4 | 15.6 | 9.6 | 14.7 | 11 | 12.3 | 14.1 | 12.4 | 10.8 | 12/12 | 50–56 | 9.6 |
| 4/home/advanced/muscle/75 | ul4 | 14.4 | 14.3 | 17.6 | 14.4 | 15.6 | 9.6 | 14.7 | 11 | 12.3 | 14.1 | 12.4 | 10.8 | 12/12 | 54–70 | 9.6 |
| 4/home/advanced/lean/45 | ul4 | 12.4 | 15 | 15.6 | 10.2 | 11 | 10 | 10.9 | 10 | 10.5 | 11.6 | 12.4 | 9.8 | 12/12 | 29–43 | 9.4 |
| 4/home/advanced/lean/60 | ul4 | 14.4 | 15 | 16.8 | 11.2 | 13 | 10 | 13.7 | 10 | 10.5 | 11.6 | 12.4 | 9.8 | 12/12 | 49–52 | 9.4 |
| 4/home/advanced/lean/75 | ul4 | 14.4 | 15 | 16.8 | 11.2 | 13 | 10 | 13.7 | 10 | 10.5 | 11.6 | 12.4 | 9.8 | 12/12 | 49–64 | 9.4 |
| 4/dumbbell/beginner/muscle/45 | ul4 | 10.2 | 9.2 | 11.7 | 10.2 | 10.2 | 6.9 | 10.3 | 8 | 6.5 | 7.1 | 8 | 8.8 | 12/12 | 34–39 | 7.2 |
| 4/dumbbell/beginner/muscle/60 | ul4 | 10.2 | 9.2 | 11.7 | 10.2 | 10.2 | 6.9 | 10.3 | 8 | 6.5 | 7.1 | 8 | 8.8 | 12/12 | 34–60 | 7.2 |
| 4/dumbbell/beginner/muscle/75 | ul4 | 10.2 | 9.2 | 11.7 | 10.2 | 10.2 | 6.9 | 10.3 | 8 | 6.5 | 7.1 | 8 | 8.8 | 12/12 | 34–60 | 7.2 |
| 4/dumbbell/beginner/lean/45 | ul4 | 9.2 | 9.2 | 11.1 | 7.2 | 9.2 | 6.9 | 8.9 | 8 | 8.5 | 7.7 | 8.4 | 7.8 | 12/12 | 36–44 | 7.2 |
| 4/dumbbell/beginner/lean/60 | ul4 | 9.2 | 9.2 | 11.1 | 7.2 | 9.2 | 6.9 | 8.9 | 8 | 8.5 | 7.7 | 8.4 | 7.8 | 12/12 | 36–55 | 7.2 |
| 4/dumbbell/beginner/lean/75 | ul4 | 9.2 | 9.2 | 11.1 | 7.2 | 9.2 | 6.9 | 8.9 | 8 | 8.5 | 7.7 | 8.4 | 7.8 | 12/12 | 36–55 | 7.2 |
| 4/dumbbell/intermediate/muscle/45 | ul4 | 12.8 | 12.6 | 13.6 | 11.8 | 10.2 | 8.2 | 11 | 9 | 10.3 | 12.1 | 10.4 | 11.4 | 12/12 | 36–44 | 8.8 |
| 4/dumbbell/intermediate/muscle/60 | ul4 | 13.8 | 12.6 | 15.4 | 11.8 | 13.2 | 8.2 | 12.4 | 9 | 10.3 | 12.1 | 10.4 | 11.4 | 12/12 | 47–60 | 9 |
| 4/dumbbell/intermediate/muscle/75 | ul4 | 13.8 | 12.6 | 15.4 | 11.8 | 13.2 | 8.2 | 12.4 | 9 | 10.3 | 12.1 | 10.4 | 11.4 | 12/12 | 47–73 | 9 |
| 4/dumbbell/intermediate/lean/45 | ul4 | 11.8 | 12.6 | 15.4 | 8.8 | 13.2 | 8.2 | 11.6 | 8 | 7.6 | 10 | 10 | 11 | 12/12 | 37–42 | 9 |
| 4/dumbbell/intermediate/lean/60 | ul4 | 11.8 | 12.6 | 15.4 | 8.8 | 13.2 | 8.2 | 11.6 | 8 | 7.6 | 10 | 10 | 11 | 12/12 | 42–60 | 9 |
| 4/dumbbell/intermediate/lean/75 | ul4 | 11.8 | 12.6 | 15.4 | 8.8 | 13.2 | 8.2 | 11.6 | 8 | 7.6 | 10 | 10 | 11 | 12/12 | 42–72 | 9 |
| 4/dumbbell/advanced/muscle/45 | ul4 | 13.4 | 15 | 16.2 | 10.4 | 12 | 10 | 12.3 | 10 | 12.6 | 14.3 | 12.4 | 10.4 | 12/12 | 39–45 | 9.4 |
| 4/dumbbell/advanced/muscle/60 | ul4 | 14.4 | 14.3 | 17.6 | 14.4 | 15.6 | 9.6 | 14.7 | 10 | 12.6 | 14.3 | 12.4 | 12.4 | 12/12 | 51–57 | 9.6 |
| 4/dumbbell/advanced/muscle/75 | ul4 | 14.4 | 14.3 | 17.6 | 14.4 | 15.6 | 9.6 | 14.7 | 10 | 12.6 | 14.3 | 12.4 | 12.4 | 12/12 | 51–73 | 9.6 |
| 4/dumbbell/advanced/lean/45 | ul4 | 12.8 | 14 | 16.2 | 10.2 | 12 | 10 | 11.1 | 10 | 10.3 | 12.1 | 12.4 | 12.4 | 12/12 | 37–43 | 9.8 |
| 4/dumbbell/advanced/lean/60 | ul4 | 14.8 | 13.3 | 17.6 | 12.2 | 15.6 | 9.6 | 13.9 | 10 | 10.3 | 12.1 | 12.4 | 12.4 | 12/12 | 49–54 | 9.8 |
| 4/dumbbell/advanced/lean/75 | ul4 | 14.8 | 13.3 | 17.6 | 12.2 | 15.6 | 9.6 | 13.9 | 10 | 10.3 | 12.1 | 12.4 | 12.4 | 12/12 | 49–68 | 9.8 |
| 4/bodyweight/beginner/muscle/45 | ul4 | 9 | 10.9 | 13.9 | 10.8 | 10.9 | 9.2 | 10.2 | 8 | 4.4 | 8.5 | 8 | 11.5 | 12/12 | 33–41 | 7 |
| 4/bodyweight/beginner/muscle/60 | ul4 | 9 | 10.9 | 13.9 | 10.8 | 10.9 | 9.2 | 10.2 | 8 | 4.4 | 8.5 | 8 | 11.5 | 12/12 | 33–60 | 7 |
| 4/bodyweight/beginner/muscle/75 | ul4 | 9 | 10.9 | 13.9 | 10.8 | 10.9 | 9.2 | 10.2 | 8 | 4.4 | 8.5 | 8 | 11.5 | 12/12 | 33–60 | 7 |
| 4/bodyweight/beginner/lean/45 | ul4 | 7.5 | 9.5 | 11.3 | 7.8 | 9 | 8.2 | 8.7 | 6 | 4.4 | 6.9 | 8 | 10.5 | 12/12 | 33–39 | 6 |
| 4/bodyweight/beginner/lean/60 | ul4 | 7.5 | 9.5 | 11.3 | 7.8 | 9 | 8.2 | 8.7 | 6 | 4.4 | 6.9 | 8 | 10.5 | 12/12 | 33–50 | 6 |
| 4/bodyweight/beginner/lean/75 | ul4 | 7.5 | 9.5 | 11.3 | 7.8 | 9 | 8.2 | 8.7 | 6 | 4.4 | 6.9 | 8 | 10.5 | 12/12 | 33–50 | 6 |
| 4/bodyweight/intermediate/muscle/45 | ul4 | 13 | 13.3 | 17.6 | 11.2 | 14.1 | 10.7 | 12.8 | 9 | 7.8 | 11.5 | 10.4 | 17.1 | 12/12 | 38–45 | 9 |
| 4/bodyweight/intermediate/muscle/60 | ul4 | 13 | 13.3 | 17.6 | 11.2 | 14.1 | 10.7 | 12.8 | 9 | 7.8 | 11.5 | 10.4 | 17.1 | 12/12 | 45–56 | 9 |
| 4/bodyweight/intermediate/muscle/75 | ul4 | 13 | 13.3 | 17.6 | 11.2 | 14.1 | 10.7 | 12.8 | 9 | 7.8 | 11.5 | 10.4 | 17.1 | 12/12 | 45–73 | 9 |
| 4/bodyweight/intermediate/lean/45 | ul4 | 10 | 10.9 | 15.1 | 11.2 | 12.9 | 9.2 | 11.3 | 8 | 7 | 9.9 | 10.4 | 14.9 | 12/12 | 34–45 | 7.6 |
| 4/bodyweight/intermediate/lean/60 | ul4 | 10 | 10.9 | 15.1 | 11.2 | 12.9 | 9.2 | 11.3 | 8 | 7 | 9.9 | 10.4 | 14.9 | 12/12 | 45–48 | 7.6 |
| 4/bodyweight/intermediate/lean/75 | ul4 | 10 | 10.9 | 15.1 | 11.2 | 12.9 | 9.2 | 11.3 | 8 | 7 | 9.9 | 10.4 | 14.9 | 12/12 | 45–66 | 7.6 |
| 4/bodyweight/advanced/muscle/45 | ul4 | 12 | 14.3 | 19.2 | 13.6 | 16.1 | 12.1 | 14.4 | 10 | 9.6 | 14.1 | 12.4 | 18.8 | 12/12 | 29–43 | 9.6 |
| 4/bodyweight/advanced/muscle/60 | ul4 | 12 | 14.3 | 19.2 | 13.6 | 16.1 | 12.1 | 14.4 | 10 | 9.6 | 14.1 | 12.4 | 18.8 | 12/12 | 47–59 | 9.6 |
| 4/bodyweight/advanced/muscle/75 | ul4 | 12 | 14.3 | 19.2 | 13.6 | 16.1 | 12.1 | 14.4 | 10 | 9.6 | 14.1 | 12.4 | 18.8 | 12/12 | 53–64 | 9.6 |
| 4/bodyweight/advanced/lean/45 | ul4 | 12 | 13.3 | 18.7 | 13.2 | 15.8 | 11.6 | 13.8 | 10 | 7.8 | 11.2 | 12.4 | 16.9 | 12/12 | 31–44 | 9.6 |
| 4/bodyweight/advanced/lean/60 | ul4 | 12 | 13.3 | 18.7 | 13.2 | 15.8 | 11.6 | 13.8 | 10 | 7.8 | 11.2 | 12.4 | 16.9 | 12/12 | 49–59 | 9.6 |
| 4/bodyweight/advanced/lean/75 | ul4 | 12 | 13.3 | 18.7 | 13.2 | 15.8 | 11.6 | 13.8 | 10 | 7.8 | 11.2 | 12.4 | 16.9 | 12/12 | 49–59 | 9.6 |
| 5/full/beginner/muscle/45 | ulppl5 | 9 | 9.8 | 9.9 | 7.8 | 8.1 | 11.3 | 10.2 | 12 | 10 | 8.8 | 8 | 9 | 12/12 | 32–44 | 6 |
| 5/full/beginner/muscle/60 | ulppl5 | 9 | 9.8 | 9.9 | 7.8 | 8.1 | 11.3 | 10.2 | 12 | 10 | 8.8 | 8 | 9 | 12/12 | 32–53 | 6 |
| 5/full/beginner/muscle/75 | ulppl5 | 9 | 9.8 | 9.9 | 7.8 | 8.1 | 11.3 | 10.2 | 12 | 10 | 8.8 | 8 | 9 | 12/12 | 32–53 | 6 |
| 5/full/beginner/lean/45 | ulppl5 | 9 | 8 | 8.5 | 6.2 | 7.6 | 10.4 | 8.7 | 10 | 7.5 | 5.8 | 6.8 | 8 | 12/12 | 32–44 | 6 |
| 5/full/beginner/lean/60 | ulppl5 | 9 | 8 | 8.5 | 6.2 | 7.6 | 10.4 | 8.7 | 10 | 7.5 | 5.8 | 6.8 | 8 | 12/12 | 32–44 | 6 |
| 5/full/beginner/lean/75 | ulppl5 | 9 | 8 | 8.5 | 6.2 | 7.6 | 10.4 | 8.7 | 10 | 7.5 | 5.8 | 6.8 | 8 | 12/12 | 32–44 | 6 |
| 5/full/intermediate/muscle/45 | ulppl5 | 12 | 12.3 | 13.8 | 10.8 | 12.3 | 12.7 | 11.6 | 14 | 12.5 | 11 | 11.2 | 10 | 12/12 | 33–44 | 7.5 |
| 5/full/intermediate/muscle/60 | ulppl5 | 12 | 12.3 | 13.8 | 10.8 | 12.3 | 12.7 | 11.6 | 14 | 12.5 | 11 | 11.2 | 10 | 12/12 | 44–57 | 7.5 |
| 5/full/intermediate/muscle/75 | ulppl5 | 12 | 12.3 | 13.8 | 10.8 | 12.3 | 12.7 | 11.6 | 14 | 12.5 | 11 | 11.2 | 10 | 12/12 | 44–65 | 7.5 |
| 5/full/intermediate/lean/45 | ulppl5 | 12 | 10.5 | 11.4 | 9.8 | 9.6 | 11.7 | 11.6 | 13 | 11 | 10 | 10 | 10 | 12/12 | 32–44 | 7 |
| 5/full/intermediate/lean/60 | ulppl5 | 12 | 10.5 | 11.4 | 9.8 | 9.6 | 11.7 | 11.6 | 13 | 11 | 10 | 10 | 10 | 12/12 | 32–55 | 7 |
| 5/full/intermediate/lean/75 | ulppl5 | 12 | 10.5 | 11.4 | 9.8 | 9.6 | 11.7 | 11.6 | 13 | 11 | 10 | 10 | 10 | 12/12 | 32–65 | 7 |
| 5/full/advanced/muscle/45 | ulppl5 | 13 | 13.8 | 15.8 | 11.8 | 13.1 | 13.6 | 11.6 | 16 | 16 | 12.8 | 11.6 | 10 | 12/12 | 35–44 | 9 |
| 5/full/advanced/muscle/60 | ulppl5 | 13 | 13.8 | 15.8 | 12.4 | 13.1 | 15.6 | 14.1 | 16 | 16 | 12.8 | 11.6 | 10 | 12/12 | 46–52 | 9 |
| 5/full/advanced/muscle/75 | ulppl5 | 13 | 13.8 | 15.8 | 12.4 | 13.1 | 15.6 | 14.1 | 16 | 16 | 12.8 | 11.6 | 10 | 12/12 | 46–66 | 9 |
| 5/full/advanced/lean/45 | ulppl5 | 12 | 12.3 | 13.3 | 11.4 | 11.1 | 14.7 | 13.6 | 15 | 13.5 | 11.8 | 11.2 | 10 | 12/12 | 35–45 | 8 |
| 5/full/advanced/lean/60 | ulppl5 | 12 | 12.3 | 13.3 | 11.4 | 11.1 | 14.7 | 13.6 | 15 | 13.5 | 11.8 | 11.2 | 10 | 12/12 | 36–58 | 8 |
| 5/full/advanced/lean/75 | ulppl5 | 12 | 12.3 | 13.3 | 11.4 | 11.1 | 14.7 | 13.6 | 15 | 13.5 | 11.8 | 11.2 | 10 | 12/12 | 36–73 | 8 |
| 5/home/beginner/muscle/45 | ulppl5 | 10.2 | 8.5 | 9.5 | 7.2 | 7.8 | 8.5 | 10.3 | 12 | 8.5 | 9 | 7.8 | 4.6 | 12/12 | 29–41 | 6.1 |
| 5/home/beginner/muscle/60 | ulppl5 | 10.2 | 8.5 | 9.5 | 7.2 | 7.8 | 8.5 | 10.3 | 12 | 8.5 | 9 | 7.8 | 4.6 | 12/12 | 29–48 | 6.1 |
| 5/home/beginner/muscle/75 | ulppl5 | 10.2 | 8.5 | 9.5 | 7.2 | 7.8 | 8.5 | 10.3 | 12 | 8.5 | 9 | 7.8 | 4.6 | 12/12 | 29–48 | 6.1 |
| 5/home/beginner/lean/45 | ulppl5 | 10.2 | 7.8 | 7.9 | 6.2 | 6.4 | 7.1 | 8.3 | 10 | 4.5 | 7.8 | 6 | 4.6 | 12/12 | 25–41 | 6 |
| 5/home/beginner/lean/60 | ulppl5 | 10.2 | 7.8 | 7.9 | 6.2 | 6.4 | 7.1 | 8.3 | 10 | 4.5 | 7.8 | 6 | 4.6 | 12/12 | 25–41 | 6 |
| 5/home/beginner/lean/75 | ulppl5 | 10.2 | 7.8 | 7.9 | 6.2 | 6.4 | 7.1 | 8.3 | 10 | 4.5 | 7.8 | 6 | 4.6 | 12/12 | 25–41 | 6 |
| 5/home/intermediate/muscle/45 | ulppl5 | 12.8 | 10.9 | 13.3 | 9.8 | 11.6 | 10.3 | 12 | 14 | 11 | 11.5 | 11 | 6.6 | 12/12 | 38–45 | 7.7 |
| 5/home/intermediate/muscle/60 | ulppl5 | 12.8 | 10.9 | 13.3 | 9.8 | 11.6 | 10.3 | 12 | 14 | 11 | 11.5 | 11 | 6.6 | 12/12 | 41–56 | 7.7 |
| 5/home/intermediate/muscle/75 | ulppl5 | 12.8 | 10.9 | 13.3 | 9.8 | 11.6 | 10.3 | 12 | 14 | 11 | 11.5 | 11 | 6.6 | 12/12 | 41–62 | 7.7 |
| 5/home/intermediate/lean/45 | ulppl5 | 11.8 | 10.2 | 11.1 | 9.8 | 9.1 | 8.9 | 11.5 | 13 | 6 | 10 | 9 | 6.6 | 12/12 | 29–45 | 7 |
| 5/home/intermediate/lean/60 | ulppl5 | 11.8 | 10.2 | 11.1 | 9.8 | 9.1 | 8.9 | 11.5 | 13 | 6 | 10 | 9 | 6.6 | 12/12 | 29–58 | 7 |
| 5/home/intermediate/lean/75 | ulppl5 | 11.8 | 10.2 | 11.1 | 9.8 | 9.1 | 8.9 | 11.5 | 13 | 6 | 10 | 9 | 6.6 | 12/12 | 29–58 | 7 |
| 5/home/advanced/muscle/45 | ulppl5 | 14.4 | 13.3 | 14.7 | 11.2 | 11.4 | 12.1 | 11.8 | 16 | 13.5 | 13.6 | 11.2 | 8.6 | 12/12 | 31–45 | 9 |
| 5/home/advanced/muscle/60 | ulppl5 | 14.4 | 13.3 | 14.7 | 12.4 | 11.4 | 12.1 | 14.8 | 16 | 13.5 | 13.6 | 11.2 | 8.6 | 12/12 | 41–55 | 9.2 |
| 5/home/advanced/muscle/75 | ulppl5 | 14.4 | 13.3 | 14.7 | 12.4 | 11.4 | 12.1 | 14.8 | 16 | 13.5 | 13.6 | 11.2 | 8.6 | 12/12 | 41–65 | 9.2 |
| 5/home/advanced/lean/45 | ulppl5 | 13.4 | 12.6 | 13.7 | 11.8 | 11 | 10.7 | 13.8 | 15 | 11 | 12 | 10.8 | 7.6 | 12/12 | 32–44 | 8.2 |
| 5/home/advanced/lean/60 | ulppl5 | 13.4 | 12.6 | 13.7 | 11.8 | 11 | 10.7 | 13.8 | 15 | 11 | 12 | 10.8 | 7.6 | 12/12 | 32–56 | 8.2 |
| 5/home/advanced/lean/75 | ulppl5 | 13.4 | 12.6 | 13.7 | 11.8 | 11 | 10.7 | 13.8 | 15 | 11 | 12 | 10.8 | 7.6 | 12/12 | 32–69 | 8.2 |
| 5/dumbbell/beginner/muscle/45 | ulppl5 | 10.2 | 8.5 | 9.5 | 7.2 | 7.8 | 9.5 | 10.3 | 12 | 4.9 | 8.9 | 7 | 5.8 | 12/12 | 34–42 | 6.1 |
| 5/dumbbell/beginner/muscle/60 | ulppl5 | 10.2 | 8.5 | 9.5 | 7.2 | 7.8 | 9.5 | 10.3 | 12 | 4.9 | 8.9 | 7 | 5.8 | 12/12 | 34–48 | 6.1 |
| 5/dumbbell/beginner/muscle/75 | ulppl5 | 10.2 | 8.5 | 9.5 | 7.2 | 7.8 | 9.5 | 10.3 | 12 | 4.9 | 8.9 | 7 | 5.8 | 12/12 | 34–48 | 6.1 |
| 5/dumbbell/beginner/lean/45 | ulppl5 | 10.2 | 7.8 | 8.5 | 6.2 | 7.4 | 8.1 | 8.3 | 7 | 4.9 | 6.8 | 6 | 4.6 | 12/12 | 21–41 | 6 |
| 5/dumbbell/beginner/lean/60 | ulppl5 | 10.2 | 7.8 | 8.5 | 6.2 | 7.4 | 8.1 | 8.3 | 7 | 4.9 | 6.8 | 6 | 4.6 | 12/12 | 21–41 | 6 |
| 5/dumbbell/beginner/lean/75 | ulppl5 | 10.2 | 7.8 | 8.5 | 6.2 | 7.4 | 8.1 | 8.3 | 7 | 4.9 | 6.8 | 6 | 4.6 | 12/12 | 21–41 | 6 |
| 5/dumbbell/intermediate/muscle/45 | ulppl5 | 12.8 | 11.9 | 13.8 | 10.8 | 11.8 | 11.8 | 12 | 13 | 9.5 | 11.5 | 10.8 | 11.4 | 12/12 | 38–43 | 8 |
| 5/dumbbell/intermediate/muscle/60 | ulppl5 | 12.8 | 11.9 | 13.8 | 10.8 | 11.8 | 11.8 | 12 | 13 | 9.5 | 11.5 | 10.8 | 11.4 | 12/12 | 49–54 | 8 |
| 5/dumbbell/intermediate/muscle/75 | ulppl5 | 12.8 | 11.9 | 13.8 | 10.8 | 11.8 | 11.8 | 12 | 13 | 9.5 | 11.5 | 10.8 | 11.4 | 12/12 | 49–64 | 8 |
| 5/dumbbell/intermediate/lean/45 | ulppl5 | 11.8 | 10.2 | 11.1 | 9.8 | 9.1 | 9.9 | 11.5 | 12 | 7.5 | 10.2 | 9.4 | 7.8 | 12/12 | 38–42 | 7 |
| 5/dumbbell/intermediate/lean/60 | ulppl5 | 11.8 | 10.2 | 11.1 | 9.8 | 9.1 | 9.9 | 11.5 | 12 | 7.5 | 10.2 | 9.4 | 7.8 | 12/12 | 40–58 | 7 |
| 5/dumbbell/intermediate/lean/75 | ulppl5 | 11.8 | 10.2 | 11.1 | 9.8 | 9.1 | 9.9 | 11.5 | 12 | 7.5 | 10.2 | 9.4 | 7.8 | 12/12 | 40–58 | 7 |
| 5/dumbbell/advanced/muscle/45 | ulppl5 | 14.4 | 13.3 | 15.3 | 11.2 | 12.4 | 13.1 | 11.8 | 15 | 12.9 | 14.1 | 11 | 11.2 | 12/12 | 29–43 | 8.8 |
| 5/dumbbell/advanced/muscle/60 | ulppl5 | 14.4 | 13.3 | 15.3 | 12.4 | 12.4 | 13.1 | 14.8 | 15 | 12.9 | 14.1 | 11 | 11.2 | 12/12 | 50–60 | 9.2 |
| 5/dumbbell/advanced/muscle/75 | ulppl5 | 14.4 | 13.3 | 15.3 | 12.4 | 12.4 | 13.1 | 14.8 | 15 | 12.9 | 14.1 | 11 | 11.2 | 12/12 | 54–62 | 9.2 |
| 5/dumbbell/advanced/lean/45 | ulppl5 | 13.4 | 12.6 | 13.7 | 11.8 | 11 | 12.7 | 13.8 | 14 | 10.5 | 11.4 | 10.8 | 9.8 | 12/12 | 33–44 | 8.2 |
| 5/dumbbell/advanced/lean/60 | ulppl5 | 13.4 | 12.6 | 13.7 | 11.8 | 11 | 12.7 | 13.8 | 14 | 10.5 | 11.4 | 10.8 | 9.8 | 12/12 | 47–60 | 8.2 |
| 5/dumbbell/advanced/lean/75 | ulppl5 | 13.4 | 12.6 | 13.7 | 11.8 | 11 | 12.7 | 13.8 | 14 | 10.5 | 11.4 | 10.8 | 9.8 | 12/12 | 47–69 | 8.2 |
| 5/bodyweight/beginner/muscle/45 | ulppl5 | 9 | 10.2 | 12.3 | 10.8 | 9.5 | 11.7 | 10.2 | 12 | 5.2 | 8.9 | 7.4 | 9.9 | 12/12 | 32–39 | 6.3 |
| 5/bodyweight/beginner/muscle/60 | ulppl5 | 9 | 10.2 | 12.3 | 10.8 | 9.5 | 11.7 | 10.2 | 12 | 5.2 | 8.9 | 7.4 | 9.9 | 12/12 | 32–55 | 6.3 |
| 5/bodyweight/beginner/muscle/75 | ulppl5 | 9 | 10.2 | 12.3 | 10.8 | 9.5 | 11.7 | 10.2 | 12 | 5.2 | 8.9 | 7.4 | 9.9 | 12/12 | 32–55 | 6.3 |
| 5/bodyweight/beginner/lean/45 | ulppl5 | 8 | 9.5 | 11.3 | 8.8 | 9 | 11.2 | 8.2 | 7 | 5.2 | 6.5 | 6.4 | 9.6 | 12/12 | 25–37 | 5.7 |
| 5/bodyweight/beginner/lean/60 | ulppl5 | 8 | 9.5 | 11.3 | 8.8 | 9 | 11.2 | 8.2 | 7 | 5.2 | 6.5 | 6.4 | 9.6 | 12/12 | 25–48 | 5.7 |
| 5/bodyweight/beginner/lean/75 | ulppl5 | 8 | 9.5 | 11.3 | 8.8 | 9 | 11.2 | 8.2 | 7 | 5.2 | 6.5 | 6.4 | 9.6 | 12/12 | 25–48 | 5.7 |
| 5/bodyweight/intermediate/muscle/45 | ulppl5 | 13 | 11.9 | 15 | 11.2 | 12.2 | 12.7 | 12.8 | 13 | 9 | 11.4 | 11 | 14.4 | 12/12 | 28–45 | 7.4 |
| 5/bodyweight/intermediate/muscle/60 | ulppl5 | 13 | 11.9 | 15 | 11.2 | 12.2 | 12.7 | 12.8 | 13 | 9 | 11.4 | 11 | 14.4 | 12/12 | 38–53 | 7.4 |
| 5/bodyweight/intermediate/muscle/75 | ulppl5 | 13 | 11.9 | 15 | 11.2 | 12.2 | 12.7 | 12.8 | 13 | 9 | 11.4 | 11 | 14.4 | 12/12 | 38–67 | 7.4 |
| 5/bodyweight/intermediate/lean/45 | ulppl5 | 10 | 11.9 | 15 | 11.2 | 12.2 | 12.7 | 11.3 | 13 | 6 | 10.2 | 9.4 | 13.1 | 12/12 | 33–45 | 7.4 |
| 5/bodyweight/intermediate/lean/60 | ulppl5 | 10 | 11.9 | 15 | 11.2 | 12.2 | 12.7 | 11.3 | 13 | 6 | 10.2 | 9.4 | 13.1 | 12/12 | 38–60 | 7.4 |
| 5/bodyweight/intermediate/lean/75 | ulppl5 | 10 | 11.9 | 15 | 11.2 | 12.2 | 12.7 | 11.3 | 13 | 6 | 10.2 | 9.4 | 13.1 | 12/12 | 38–60 | 7.4 |
| 5/bodyweight/advanced/muscle/45 | ulppl5 | 12 | 14.3 | 18.6 | 11.6 | 15.1 | 16.1 | 14.4 | 15 | 11.2 | 13.3 | 11.2 | 16.8 | 12/12 | 32–45 | 9 |
| 5/bodyweight/advanced/muscle/60 | ulppl5 | 12 | 14.3 | 18.6 | 11.6 | 15.1 | 16.1 | 14.4 | 15 | 11.2 | 13.3 | 11.2 | 16.8 | 12/12 | 45–56 | 9 |
| 5/bodyweight/advanced/muscle/75 | ulppl5 | 12 | 14.3 | 18.6 | 11.6 | 15.1 | 16.1 | 14.4 | 15 | 11.2 | 13.3 | 11.2 | 16.8 | 12/12 | 45–62 | 9 |
| 5/bodyweight/advanced/lean/45 | ulppl5 | 12 | 14.3 | 18.6 | 11.2 | 15.1 | 16.1 | 13.8 | 15 | 8.6 | 11.7 | 10.8 | 16.5 | 12/12 | 32–45 | 9 |
| 5/bodyweight/advanced/lean/60 | ulppl5 | 12 | 14.3 | 18.6 | 11.2 | 15.1 | 16.1 | 13.8 | 15 | 8.6 | 11.7 | 10.8 | 16.5 | 12/12 | 45–58 | 9 |
| 5/bodyweight/advanced/lean/75 | ulppl5 | 12 | 14.3 | 18.6 | 11.2 | 15.1 | 16.1 | 13.8 | 15 | 8.6 | 11.7 | 10.8 | 16.5 | 12/12 | 45–73 | 9 |
| 6/full/beginner/muscle/45 | ppl6 | 14 | 10.8 | 10.8 | 6.2 | 9.5 | 12.2 | 10.5 | 12 | 10.5 | 8.6 | 9 | 9 | 12/12 | 36–42 | 9 |
| 6/full/beginner/muscle/60 | ppl6 | 14 | 10.8 | 10.8 | 6.2 | 9.5 | 12.2 | 10.5 | 12 | 10.5 | 8.6 | 9 | 9 | 12/12 | 36–47 | 9 |
| 6/full/beginner/muscle/75 | ppl6 | 14 | 10.8 | 10.8 | 6.2 | 9.5 | 12.2 | 10.5 | 12 | 10.5 | 8.6 | 9 | 9 | 12/12 | 36–47 | 9 |
| 6/full/beginner/lean/45 | ppl6 | 12 | 10.8 | 10.8 | 6.2 | 9.5 | 10 | 8.5 | 10 | 8.3 | 7.5 | 8.4 | 9 | 12/12 | 32–40 | 7 |
| 6/full/beginner/lean/60 | ppl6 | 12 | 10.8 | 10.8 | 6.2 | 9.5 | 10 | 8.5 | 10 | 8.3 | 7.5 | 8.4 | 9 | 12/12 | 32–40 | 7 |
| 6/full/beginner/lean/75 | ppl6 | 12 | 10.8 | 10.8 | 6.2 | 9.5 | 10 | 8.5 | 10 | 8.3 | 7.5 | 8.4 | 9 | 12/12 | 32–40 | 7 |
| 6/full/intermediate/muscle/45 | ppl6 | 17 | 12.5 | 14.2 | 11.8 | 14 | 13 | 12.3 | 13 | 13.3 | 11.1 | 11.2 | 12 | 12/12 | 33–43 | 10 |
| 6/full/intermediate/muscle/60 | ppl6 | 17 | 12.5 | 14.2 | 11.8 | 14 | 13 | 12.3 | 13 | 13.3 | 11.1 | 11.2 | 12 | 12/12 | 40–55 | 10 |
| 6/full/intermediate/muscle/75 | ppl6 | 17 | 12.5 | 14.2 | 11.8 | 14 | 13 | 12.3 | 13 | 13.3 | 11.1 | 11.2 | 12 | 12/12 | 40–55 | 10 |
| 6/full/intermediate/lean/45 | ppl6 | 14 | 10.8 | 11.8 | 8.8 | 11.5 | 12.1 | 11.4 | 13 | 11.8 | 10.1 | 11 | 12 | 12/12 | 33–45 | 10 |
| 6/full/intermediate/lean/60 | ppl6 | 14 | 10.8 | 11.8 | 8.8 | 11.5 | 12.1 | 11.4 | 13 | 11.8 | 10.1 | 11 | 12 | 12/12 | 38–55 | 10 |
| 6/full/intermediate/lean/75 | ppl6 | 14 | 10.8 | 11.8 | 8.8 | 11.5 | 12.1 | 11.4 | 13 | 11.8 | 10.1 | 11 | 12 | 12/12 | 38–55 | 10 |
| 6/full/advanced/muscle/45 | ppl6 | 18 | 14.5 | 16 | 14.4 | 16.2 | 16.1 | 14.3 | 15 | 16.1 | 11.6 | 13.6 | 15 | 12/12 | 30–43 | 10 |
| 6/full/advanced/muscle/60 | ppl6 | 18 | 14.5 | 16 | 14.4 | 16.2 | 16.1 | 14.3 | 15 | 16.1 | 11.6 | 13.6 | 15 | 12/12 | 45–57 | 10 |
| 6/full/advanced/muscle/75 | ppl6 | 18 | 14.5 | 16 | 14.4 | 16.2 | 16.1 | 14.3 | 15 | 16.1 | 11.6 | 13.6 | 15 | 12/12 | 50–64 | 10 |
| 6/full/advanced/lean/45 | ppl6 | 17 | 12.5 | 13.7 | 13.4 | 13 | 15.2 | 14 | 14 | 13.7 | 11.6 | 13.2 | 15 | 12/12 | 28–45 | 10 |
| 6/full/advanced/lean/60 | ppl6 | 17 | 12.5 | 13.7 | 13.4 | 13 | 15.2 | 14 | 14 | 13.7 | 11.6 | 13.2 | 15 | 12/12 | 45–59 | 10 |
| 6/full/advanced/lean/75 | ppl6 | 17 | 12.5 | 13.7 | 13.4 | 13 | 15.2 | 14 | 14 | 13.7 | 11.6 | 13.2 | 15 | 12/12 | 45–61 | 10 |
| 6/home/beginner/muscle/45 | ppl6 | 14.8 | 11.5 | 11.1 | 10.2 | 9.3 | 6.5 | 10.4 | 11 | 5.3 | 7.9 | 8 | 9 | 12/12 | 27–40 | 8 |
| 6/home/beginner/muscle/60 | ppl6 | 14.8 | 11.5 | 11.1 | 10.2 | 9.3 | 6.5 | 10.4 | 11 | 5.3 | 7.9 | 8 | 9 | 12/12 | 27–40 | 8 |
| 6/home/beginner/muscle/75 | ppl6 | 14.8 | 11.5 | 11.1 | 10.2 | 9.3 | 6.5 | 10.4 | 11 | 5.3 | 7.9 | 8 | 9 | 12/12 | 27–40 | 8 |
| 6/home/beginner/lean/45 | ppl6 | 12 | 8.5 | 11.1 | 6.2 | 9.3 | 6.5 | 8.5 | 10 | 4.3 | 5.9 | 8 | 9 | 12/12 | 21–36 | 7 |
| 6/home/beginner/lean/60 | ppl6 | 12 | 8.5 | 11.1 | 6.2 | 9.3 | 6.5 | 8.5 | 10 | 4.3 | 5.9 | 8 | 9 | 12/12 | 21–36 | 7 |
| 6/home/beginner/lean/75 | ppl6 | 12 | 8.5 | 11.1 | 6.2 | 9.3 | 6.5 | 8.5 | 10 | 4.3 | 5.9 | 8 | 9 | 12/12 | 21–36 | 7 |
| 6/home/intermediate/muscle/45 | ppl6 | 18.8 | 12.2 | 13.3 | 11.8 | 11.7 | 8.9 | 13.2 | 13 | 11.8 | 11.6 | 11 | 13 | 12/12 | 34–43 | 10 |
| 6/home/intermediate/muscle/60 | ppl6 | 18.8 | 12.2 | 13.3 | 11.8 | 11.7 | 8.9 | 13.2 | 13 | 11.8 | 11.6 | 11 | 13 | 12/12 | 34–55 | 10 |
| 6/home/intermediate/muscle/75 | ppl6 | 18.8 | 12.2 | 13.3 | 11.8 | 11.7 | 8.9 | 13.2 | 13 | 11.8 | 11.6 | 11 | 13 | 12/12 | 34–55 | 10 |
| 6/home/intermediate/lean/45 | ppl6 | 14.8 | 11.5 | 12.3 | 11.2 | 11.3 | 8.5 | 11.4 | 11 | 9.3 | 10.1 | 10.4 | 13 | 12/12 | 34–42 | 8 |
| 6/home/intermediate/lean/60 | ppl6 | 14.8 | 11.5 | 12.3 | 11.2 | 11.3 | 8.5 | 11.4 | 11 | 9.3 | 10.1 | 10.4 | 13 | 12/12 | 34–47 | 8 |
| 6/home/intermediate/lean/75 | ppl6 | 14.8 | 11.5 | 12.3 | 11.2 | 11.3 | 8.5 | 11.4 | 11 | 9.3 | 10.1 | 10.4 | 13 | 12/12 | 34–47 | 8 |
| 6/home/advanced/muscle/45 | ppl6 | 20.4 | 14.6 | 17.7 | 14.4 | 16.5 | 11.7 | 15.5 | 15 | 13.6 | 14.1 | 13 | 15 | 12/12 | 28–41 | 10 |
| 6/home/advanced/muscle/60 | ppl6 | 20.4 | 14.6 | 17.7 | 14.4 | 16.5 | 11.7 | 15.5 | 15 | 13.6 | 14.1 | 13 | 15 | 12/12 | 41–58 | 10 |
| 6/home/advanced/muscle/75 | ppl6 | 20.4 | 14.6 | 17.7 | 14.4 | 16.5 | 11.7 | 15.5 | 15 | 13.6 | 14.1 | 13 | 15 | 12/12 | 41–60 | 10 |
| 6/home/advanced/lean/45 | ppl6 | 18.4 | 14.6 | 15.9 | 12.2 | 13.5 | 9.7 | 13.7 | 13 | 8.5 | 9.6 | 12.8 | 15 | 12/12 | 25–44 | 9 |
| 6/home/advanced/lean/60 | ppl6 | 18.4 | 14.6 | 15.9 | 12.2 | 13.5 | 9.7 | 13.7 | 13 | 8.5 | 9.6 | 12.8 | 15 | 12/12 | 39–55 | 9 |
| 6/home/advanced/lean/75 | ppl6 | 18.4 | 14.6 | 15.9 | 12.2 | 13.5 | 9.7 | 13.7 | 13 | 8.5 | 9.6 | 12.8 | 15 | 12/12 | 39–55 | 9 |
| 6/dumbbell/beginner/muscle/45 | ppl6 | 14.8 | 11.5 | 11.1 | 7.2 | 9.3 | 6.5 | 10.4 | 11 | 5.6 | 8.8 | 8 | 10.2 | 12/12 | 32–38 | 8 |
| 6/dumbbell/beginner/muscle/60 | ppl6 | 14.8 | 11.5 | 11.1 | 7.2 | 9.3 | 6.5 | 10.4 | 11 | 5.6 | 8.8 | 8 | 10.2 | 12/12 | 32–38 | 8 |
| 6/dumbbell/beginner/muscle/75 | ppl6 | 14.8 | 11.5 | 11.1 | 7.2 | 9.3 | 6.5 | 10.4 | 11 | 5.6 | 8.8 | 8 | 10.2 | 12/12 | 32–38 | 8 |
| 6/dumbbell/beginner/lean/45 | ppl6 | 12 | 8.5 | 11.1 | 6.2 | 9.3 | 6.5 | 8.5 | 8 | 5.1 | 7.4 | 8 | 10.2 | 12/12 | 25–38 | 7 |
| 6/dumbbell/beginner/lean/60 | ppl6 | 12 | 8.5 | 11.1 | 6.2 | 9.3 | 6.5 | 8.5 | 8 | 5.1 | 7.4 | 8 | 10.2 | 12/12 | 25–38 | 7 |
| 6/dumbbell/beginner/lean/75 | ppl6 | 12 | 8.5 | 11.1 | 6.2 | 9.3 | 6.5 | 8.5 | 8 | 5.1 | 7.4 | 8 | 10.2 | 12/12 | 25–38 | 7 |
| 6/dumbbell/intermediate/muscle/45 | ppl6 | 18.8 | 12.2 | 14.5 | 11.8 | 13.7 | 9.9 | 13.2 | 12 | 10.5 | 11.4 | 10.8 | 14.2 | 12/12 | 35–43 | 10 |
| 6/dumbbell/intermediate/muscle/60 | ppl6 | 18.8 | 12.2 | 14.5 | 11.8 | 13.7 | 9.9 | 13.2 | 12 | 10.5 | 11.4 | 10.8 | 14.2 | 12/12 | 38–55 | 10 |
| 6/dumbbell/intermediate/muscle/75 | ppl6 | 18.8 | 12.2 | 14.5 | 11.8 | 13.7 | 9.9 | 13.2 | 12 | 10.5 | 11.4 | 10.8 | 14.2 | 12/12 | 38–55 | 10 |
| 6/dumbbell/intermediate/lean/45 | ppl6 | 14.8 | 11.5 | 12.3 | 8.2 | 11.3 | 8.5 | 11.4 | 11 | 8.3 | 10.2 | 10.4 | 14.2 | 12/12 | 34–42 | 8 |
| 6/dumbbell/intermediate/lean/60 | ppl6 | 14.8 | 11.5 | 12.3 | 8.2 | 11.3 | 8.5 | 11.4 | 11 | 8.3 | 10.2 | 10.4 | 14.2 | 12/12 | 34–47 | 8 |
| 6/dumbbell/intermediate/lean/75 | ppl6 | 14.8 | 11.5 | 12.3 | 8.2 | 11.3 | 8.5 | 11.4 | 11 | 8.3 | 10.2 | 10.4 | 14.2 | 12/12 | 34–47 | 8 |
| 6/dumbbell/advanced/muscle/45 | ppl6 | 20.4 | 14.9 | 17.2 | 14.4 | 16.3 | 11.8 | 15.5 | 15 | 12.2 | 13.9 | 12.8 | 16.4 | 12/12 | 27–41 | 10 |
| 6/dumbbell/advanced/muscle/60 | ppl6 | 20.4 | 14.9 | 17.2 | 14.4 | 16.3 | 11.8 | 15.5 | 15 | 12.2 | 13.9 | 12.8 | 16.4 | 12/12 | 41–58 | 10 |
| 6/dumbbell/advanced/muscle/75 | ppl6 | 20.4 | 14.9 | 17.2 | 14.4 | 16.3 | 11.8 | 15.5 | 15 | 12.2 | 13.9 | 12.8 | 16.4 | 12/12 | 41–62 | 10 |
| 6/dumbbell/advanced/lean/45 | ppl6 | 18.4 | 13.2 | 13.9 | 13.2 | 12.7 | 9.9 | 13.7 | 14 | 10.5 | 11.4 | 12.8 | 16.2 | 12/12 | 32–44 | 10 |
| 6/dumbbell/advanced/lean/60 | ppl6 | 18.4 | 13.2 | 13.9 | 13.2 | 12.7 | 9.9 | 13.7 | 14 | 10.5 | 11.4 | 12.8 | 16.2 | 12/12 | 34–58 | 10 |
| 6/dumbbell/advanced/lean/75 | ppl6 | 18.4 | 13.2 | 13.9 | 13.2 | 12.7 | 9.9 | 13.7 | 14 | 10.5 | 11.4 | 12.8 | 16.2 | 12/12 | 34–58 | 10 |
| 6/bodyweight/beginner/muscle/45 | ppl6 | 10.5 | 11.5 | 14.1 | 8.8 | 12.5 | 11.2 | 10.2 | 11 | 7.8 | 8.7 | 8.8 | 12.8 | 12/12 | 29–42 | 8 |
| 6/bodyweight/beginner/muscle/60 | ppl6 | 10.5 | 11.5 | 14.1 | 8.8 | 12.5 | 11.2 | 10.2 | 11 | 7.8 | 8.7 | 8.8 | 12.8 | 12/12 | 29–42 | 8 |
| 6/bodyweight/beginner/muscle/75 | ppl6 | 10.5 | 11.5 | 14.1 | 8.8 | 12.5 | 11.2 | 10.2 | 11 | 7.8 | 8.7 | 8.8 | 12.8 | 12/12 | 29–42 | 8 |
| 6/bodyweight/beginner/lean/45 | ppl6 | 8 | 9.1 | 10.5 | 8.8 | 9.6 | 6.8 | 8.2 | 8 | 5.8 | 6.5 | 8.4 | 11.5 | 12/12 | 24–42 | 6.1 |
| 6/bodyweight/beginner/lean/60 | ppl6 | 8 | 9.1 | 10.5 | 8.8 | 9.6 | 6.8 | 8.2 | 8 | 5.8 | 6.5 | 8.4 | 11.5 | 12/12 | 24–42 | 6.1 |
| 6/bodyweight/beginner/lean/75 | ppl6 | 8 | 9.1 | 10.5 | 8.8 | 9.6 | 6.8 | 8.2 | 8 | 5.8 | 6.5 | 8.4 | 11.5 | 12/12 | 24–42 | 6.1 |
| 6/bodyweight/intermediate/muscle/45 | ppl6 | 14 | 13.2 | 17.4 | 11.2 | 16.2 | 13.2 | 13.3 | 13 | 9.2 | 11.8 | 10.8 | 17.5 | 12/12 | 29–44 | 10 |
| 6/bodyweight/intermediate/muscle/60 | ppl6 | 14 | 13.2 | 17.4 | 11.2 | 16.2 | 13.2 | 13.3 | 13 | 9.2 | 11.8 | 10.8 | 17.5 | 12/12 | 36–53 | 10 |
| 6/bodyweight/intermediate/muscle/75 | ppl6 | 14 | 13.2 | 17.4 | 11.2 | 16.2 | 13.2 | 13.3 | 13 | 9.2 | 11.8 | 10.8 | 17.5 | 12/12 | 36–53 | 10 |
| 6/bodyweight/intermediate/lean/45 | ppl6 | 11 | 11.5 | 15.3 | 10 | 14.5 | 11.2 | 10 | 12 | 8 | 9.4 | 10.8 | 15.2 | 12/12 | 28–42 | 9 |
| 6/bodyweight/intermediate/lean/60 | ppl6 | 11 | 11.5 | 15.3 | 10 | 14.5 | 11.2 | 10 | 12 | 8 | 9.4 | 10.8 | 15.2 | 12/12 | 28–50 | 9 |
| 6/bodyweight/intermediate/lean/75 | ppl6 | 11 | 11.5 | 15.3 | 10 | 14.5 | 11.2 | 10 | 12 | 8 | 9.4 | 10.8 | 15.2 | 12/12 | 28–50 | 9 |
| 6/bodyweight/advanced/muscle/45 | ppl6 | 16 | 15.5 | 19.6 | 13.6 | 19.3 | 16.1 | 16.4 | 15 | 12.2 | 13.3 | 13.2 | 20.2 | 12/12 | 26–44 | 10 |
| 6/bodyweight/advanced/muscle/60 | ppl6 | 16 | 15.5 | 19.6 | 13.6 | 19.3 | 16.1 | 16.4 | 15 | 12.2 | 13.3 | 13.2 | 20.2 | 12/12 | 43–58 | 10 |
| 6/bodyweight/advanced/muscle/75 | ppl6 | 16 | 15.5 | 19.6 | 13.6 | 19.3 | 16.1 | 16.4 | 15 | 12.2 | 13.3 | 13.2 | 20.2 | 12/12 | 47–68 | 10 |
| 6/bodyweight/advanced/lean/45 | ppl6 | 13 | 12.5 | 17.5 | 12.8 | 17.5 | 13.6 | 13.7 | 14 | 10.6 | 12 | 13 | 18 | 12/12 | 34–42 | 10 |
| 6/bodyweight/advanced/lean/60 | ppl6 | 13 | 12.5 | 17.5 | 12.8 | 17.5 | 13.6 | 13.7 | 14 | 10.6 | 12 | 13 | 18 | 12/12 | 38–56 | 10 |
| 6/bodyweight/advanced/lean/75 | ppl6 | 13 | 12.5 | 17.5 | 12.8 | 17.5 | 13.6 | 13.7 | 14 | 10.6 | 12 | 13 | 18 | 12/12 | 38–63 | 10 |

### The one conflict the brief cannot resolve

Forty-one of the 360 combinations contain a day longer than its budget: all of them at two
training days, and six at three days on 45 minutes. The worst is 46 minutes over.

This is a genuine conflict between two of the brief's own requirements. A full-body session
that meets every floor for an advanced lifter does not fit in 45 minutes, and the ways out
are to miss the floors (which the in-band requirement forbids) or to run long (which the
budget forbids). The builder chooses the floors, marks the day `tight`, and the check
reports it as a **warning that names the real length and says why it cannot be shorter** —
"comes to about 91 minutes rather than 45. With this many training days there is no way to
make it shorter without putting a muscle under its minimum."

A day that *could* be shorter and is not is still a failure. Recorded here rather than
resolved, because which of the two to break is the owner's decision and not mine: the
alternative — cutting to the budget and telling somebody their plan is under its floors —
is defensible and would be a different product.

## Phase log

| Phase | Contents | State |
|---|---|---|
| 1 | Harness | done — `#selftest`, `selftest.mjs`, this file |
| 2 | C2 / H5 / M8 / L1 | done — `phase2.mjs`, invariants 6 and 7 |
| 3 | Progression — H1–H4, H6, H8, L3, L4, M7 | done — `phase3.mjs` |
| 4 | Safety — H7, M1, M2 | done — `phase4.mjs` |
| 5 | Builder, quality check, H9/H10/L5/M11, remove "Change the schedule" | done — `phase5.mjs` |
| 6 | Periodization (M9) + M3 | done — `phase6.mjs`, invariants 9 and 10 |
| 7 | M4, M5, M6, M10, L2 | done — `phase7.mjs`, invariant 11 |
| 8 | Streaks + coach view | done — `streak.mjs`, `share.mjs`, `tests/share-worker.mjs` |
| 9 | Re-measurement, then bump `APP_VERSION` and `sw.js` `VERSION` | done — "The re-measurement" above; 44.0 / 37.0 |
