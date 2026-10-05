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

## Open questions

Things in the code that conflict with the brief, or that the brief does not settle.
Recorded rather than guessed at.

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
| 4 | Safety — H7, M1, M2 | not started |
| 5 | Builder, quality check, H9/H10/L5/M11, remove "Change the schedule" | not started |
| 6 | Periodization (M9) + M3 | not started |
| 7 | M4, M5, M6, M10, L2 | not started |
| 8 | Streaks + coach view | not started |
| 9 | Re-measurement, then bump `APP_VERSION` and `sw.js` `VERSION` | not started |
