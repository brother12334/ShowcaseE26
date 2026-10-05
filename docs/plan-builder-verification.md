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

Not measured yet — the builder does not exist. Phase 9 fills this in with the full
grid the brief asks for: days 2–6 × four gear tiers × three levels × goal
{muscle, lean} × budget {45, 60, 75}, recording per-muscle weekly sets against
MEV/MAV/MRV, per-session maxima and minutes per day, with the requirement of zero
quality-check failures and every major muscle inside [MEV, min(MAV, 0.9·MRV)]
except chosen priority muscles.

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
| 8 | Streaks + coach view | not started |
| 9 | Re-measurement, then bump `APP_VERSION` and `sw.js` `VERSION` | not started |
