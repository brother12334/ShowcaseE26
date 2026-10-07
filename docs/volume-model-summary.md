# What changed about your volume numbers, in plain English

*Element 26 55.1. The long version, with every citation and every measurement, is in
`docs/volume-science.md`. This is the version for deciding whether to ship it.*

## The problem you reported

You opened "A look at your plan" on a plan the app itself had just built for you, and it
told you the glutes were over their limit and should have sets taken off them.

## What was actually wrong

Nothing was over anything. The app was **counting twice**.

Element 26 gives partial credit: a squat pays the quads a full set and the glutes about
0.6 of one, which is a good way to describe what a squat does. But the per-muscle limits it
was comparing that against came from a table written for direct sets. So a muscle that
collects a lot of partial credit from compound lifts — glutes, front delts, traps, lower
back, adductors — was being measured generously and judged strictly.

Measured across every plan the builder can produce: the glutes read **9.6 app sets but 7.0
real sets**. The plan was fine. The number was not.

## What the new model is built on

One paper does most of the work: **Pelland et al. (2024)**, a review of 67 studies that
fitted a single dose-response curve across all of them — how much extra muscle each
additional weekly set buys, set by set, with uncertainty. Its published table is now in the
repository verbatim (`docs/data/pelland-hypertrophy-volume.json`) and the app reads it
rather than paraphrasing it.

Four numbers come out of that curve, and the app no longer makes any of them up:

- **3 sets a week maintains** what you have.
- **4 sets a week** is the least that produces a change big enough to be real. This one is
  worth trusting: it falls out of the curve, *and* a separate study (Bickel 2011) found 3
  sets maintained and 9 sets added. The floor lands exactly in the gap between them, from
  two independent directions.
- **10 to 18 sets a week** is where a target should start.
- **Past 29** the gains are real but small. **Past 43** there is no evidence either way,
  and the app now says that instead of guessing.

## What else was fixed along the way

**The adjustment chain had no brakes.** Training age, goal, frequency, intensity, exercise
mix and a recovery reading all multiplied together, and at the extremes they reached 0.37×
and 2.43× of the base figure — a 6.6× spread between two states a real person could be in,
which no evidence anywhere supports. It is now bounded to ±20% until your own logged
response has earned more, because that is measured rather than assumed. When it hits the
bound, the app says so in the explanation.

**"How big a change counts" is now your number, not everyone's.** The app used to call a
cycle "responding" at +1% and "going backwards" at −2%, for everybody. An estimated 1RM off
a top set wobbles — sleep, caffeine, a rep called at 8 that was really a 9 — and how much it
wobbles is a fact about you. Somebody at ±4% was being told "responding" about as often as a
coin lands heads. The app now measures your own session-to-session scatter and sets both
bars from it, with the published figures standing in until there are enough readings.

**Retracted research is out.** One study the old numbers leaned on (Barbalho 2019) has been
retracted. It is recorded in the audit document and excluded.

## Does it actually work better?

`tests/sim/volume-sim.mjs` runs 1,000 synthetic lifters per scenario for two years each,
with a true personal optimum and a true noise level the app cannot see, under the old rule,
the new rule, and an oracle that trained at the optimum from day one. Same lifters, same
noise draws, three policies.

**The new rule matches or beats the old one in every scenario**, which was the condition set
for shipping. Being straight about the size of it:

- **Growth is a wash** — within ±0.4% of the old rule everywhere. The threshold was never
  what was holding growth back.
- **The real gain is false alarms for noisy lifters: down 29%.** That is the thing it was
  built for, and it is the only place the effect is large.
- **The simulation changed the design twice.** It killed a tidier version of the idea that
  would have left noisy lifters overreached for longer, and it found a shortfall that is
  *not* fixed: lifters who can handle 24–40 sets a week are not reached inside two years,
  because the climb is one set per cycle. That is a progression problem, not a volume-model
  problem, and it is written up rather than quietly patched.

## What this does NOT do

- **It does not change your plan.** Not one exercise, not one set. The plan check reports
  against the new numbers; you decide.
- **It does not overwrite anything you set yourself.** Your floors, targets, ceilings and
  overall scale are instructions, not estimates. Where the app's own estimate has drifted
  more than 25% from one of them, you get one note in the plan history saying so.
- **It does not move the target of a block you are in the middle of.** A block finishes on
  the numbers it was planned against, and the new ones take over at the next one.
- **It does not throw away what the app had learned about you.** Your learned limits were
  carried over in *sets*, so a ceiling of 22 is still 22.
- **It does not change the look of anything.**

## What is still open

1. **The climb rate for high-ceiling lifters.** Measured, specified, not implemented — on
   purpose, because it is a change to progression and deserves its own design and its own
   simulation.
2. **Two-day plans.** 68 of the 72 two-day plans the builder can produce leave at least one
   muscle under the 4-set floor. That is arithmetic, not a bug: fourteen muscles, four hard
   sets each, two 45-minute sessions. The plan check says so, which is the right answer, but
   it is worth knowing that it is not fixable by tuning.
3. **The counting cut-off for muscles the paper never measured.** The paper classified eight;
   the rule for the rest (a 0.3 share, and grip or bracing never counting) is this project's
   extrapolation from their decisions and is the most arguable judgement in the whole thing.

## Where to look

| | |
|---|---|
| The full audit, with every citation | `docs/volume-science.md` |
| The paper's table, verbatim | `docs/data/pelland-hypertrophy-volume.json` |
| The measurement scripts | `tools/science/` |
| The simulation | `tests/sim/volume-sim.mjs` |
| The tests | `tests/specs/volmodel.mjs`, `volmig.mjs`, `trendnoise.mjs`, `volfix.mjs` |
