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

M3, M4, M6, M9, M10, L2 belong to phases 6 and 7 and are not done yet.

## Open questions

Things where this codebase and the science reference disagree, or where the reference asks
for something the library cannot currently supply. Recorded rather than guessed at, as the
reference requires.

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
| 6 | Periodization (M9) + M3 | not started |
| 7 | M4, M5, M6, M10, L2 | not started |
| 8 | Streaks + coach view | not started |
| 9 | Re-measurement, then bump `APP_VERSION` and `sw.js` `VERSION` | not started |
