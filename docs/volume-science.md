# Element 26 — the weekly volume model

**Status: IN PROGRESS. Nothing in the app has changed yet.**

This document is being built to the brief "rebuild Element 26's weekly volume targets
(MEV / MAV / MRV) on the best available science". It is published as it goes: the keystone
paper is extracted, three measurements are finished and reproducible, and the model they
feed is not written yet.

---

## 0. Where this is up to

The keystone paper is **read in full and extracted**, including its fitted curve from the
supplementary materials (§1). Three measurements of this app are finished and reproducible
(§2, §3, §4). The landmarks are **derived** (§5A) and stand beside the table that ships
today.

**Nothing is applied to the app yet.** The derived table moves every landmark for every
user, and brief Part 6 exists to carry that safely; it ships once, with the bounded
multiplier chain, the per-user learning, the simulation and the 360 re-measurement.

Brief §3.1 and §3.2 are now answerable from evidence rather than preference:

| Question | Answer | Where |
|---|---|---|
| What is the curve's functional form? | square root, selected by Bayes Factor from seven candidates | §1.2 |
| What are its parameters? | the published marginal-effects table, 0–45 sets, stored verbatim | §1.5 |
| How should an indirect set count? | 0.5, binary — and fractional counting beat both alternatives | §1.1 |
| What is MEV? | 4 fractional sets, re-derived from the curve and matching the paper | §1.3, §1.5 |
| What is the target? | the efficiency knee at 10, useful middle to 18 | §1.3 |
| What is the diminishing-returns limit? | 29 for real-but-expensive returns; no evidence past 43 | §1.3 |
| Does frequency raise the target? | no — the interval contains the null | §1.4 |
| Do muscles need different curves? | no evidence; only the counting basis differs, and it is measured | §3, §5A |

**Sources read in full so far**

| Source | Status |
|---|---|
| Pelland, Remmert, Robinson, Hinson & Zourdos (2024/2025), *The Resistance Training Dose-Response*, SportRxiv preprint v586, 45pp | **read in full**, numbers extracted below |
| Same work, *Sports Medicine* 2025, doi 10.1007/s40279-025-02344-w | paywalled at `link.springer.com`; the preprint is the same analysis and is what is cited here |

Still to read: Schoenfeld 2017, Baz-Valle 2022, the individual high-volume trials
(Schoenfeld 2019, Brigatto 2022, Aubé 2022, Heaselgrave 2019, Barbalho 2019, Enes 2024),
Scarpelli 2022, Hammarström 2020, Damas 2019, Robinson 2024, Refalo 2023, Halperin 2022,
Zourdos 2016, Remmert 2025, Bickel 2011, Murphy & Koehler 2022, Roberts 2020.

---

## 1. THE KEYSTONE PAPER, EXTRACTED

Pelland JC, Remmert JF, Robinson ZP, Hinson S, Zourdos MC. *The Resistance Training
Dose-Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on
Muscle Hypertrophy and Strength Gain.* SportRxiv preprint, last modified September 2024;
published in *Sports Medicine* 2025. Supplementary materials: https://osf.io/6z3xu

**67 studies, 2,058 participants.** All models adjusted for intervention duration and
training status. Effects are **response ratios** — the natural log of post/pre means,
exponentiated back to a percentage change — so the outcome is "% change in muscle size",
which is directly usable.

### 1.1 How they counted a set — and why this matters more than anything else here

Every contributing set was classified **direct** or **indirect** by its specificity to the
measurement, then indirect sets were weighted three ways and the models compared:

| Method | Indirect set counts as |
|---|---|
| total | 1.0 |
| **fractional** | **0.5** |
| direct | 0.0 |

**Fractional won, on every outcome.** Relative evidence, 2×log(Bayes Factor), Kass &
Raftery scale where ≥10 is "very strong" (Figure 3):

| Comparison | Hypertrophy | Strength |
|---|---|---|
| Volume: fractional vs total | 9.48 (strong) | 18.21 (very strong) |
| Volume: fractional vs direct | 10.29 (very strong) | 45.96 (very strong) |
| Frequency: fractional vs total | 9.96 (strong) | 31.27 (very strong) |
| Frequency: fractional vs direct | 10.82 (very strong) | 54.84 (very strong) |

> "Distinguishing between direct and indirect sets appears essential for predicting
> adaptations to a given RT protocol."

**This validates the central design decision Element 26 already made** — paying partial
credit to assisting muscles rather than counting every set whole or ignoring synergists.
It also answers the question §2 below could not: the exchange rate between an indirect set
and a direct one is **0.5**, and it is binary, not a continuum. §3 measures what that
means for this app.

### 1.2 The curve

Seven candidate forms were fitted and selected between by Bayes Factor against an
intercept-only model, averaged across additive and multiplicative effect-size scales:
linear, restricted cubic spline (4 knots), linear-log, 2nd-order polynomial, square root,
quadratic, reciprocal.

**Volume → hypertrophy: the square-root model was the best fit** (Figure 5). 35 studies,
220 effects, 1,032 participants. R²marginal = 22.3%, R²conditional = 73.3%. Marginal slope
at the mean, adjusted for frequency, duration and training status:

> **β = 0.24% change in muscle size per set [95% CrI: 0.15%, 0.33%]**, 100% posterior
> probability the slope exceeds zero.

So **G(V) = a + b·√V** is the form the evidence selects — one of the shapes the brief
asked me to consider, chosen by the data rather than by preference.

Volume → strength is a **reciprocal** model (β = 0.21% [0.16%, 0.26%], 100%), with "strong
diminishing returns and a functional plateau" — much sharper than hypertrophy's.

### 1.3 Table 2A — the tiers the landmarks come from

The paper defines its own smallest detectable effect and reports where each extra block of
sets stops buying one. **SDES = 2.05% for hypertrophy** (3.96% for strength).

| Tier | Fractional weekly sets | Sets needed for the next detectable gain |
|---|---|---|
| **Minimum effective dose** | **4** | — sufficient to elicit detectable hypertrophy |
| Higher efficiency | **5–10** | ~6 |
| Intermediate efficiency | **11–18** | ~8.5 |
| Lower efficiency | **19–29** | ~10.75 |
| Lowest efficiency | **30–42** | ~12.5 |
| Unclear | **43+** | insufficient data, *or potentially less hypertrophy* |

This is the whole landmark model, already in the units Element 26 almost uses, and it is
derived rather than asserted: a floor at 4, an efficiency knee around 10, a useful middle
to 18, real but expensive returns to 29, and no evidence at all past 43.

### 1.4 Frequency

**Volume → hypertrophy is the effect; frequency is not.** Reciprocal best fit,
β = 0.32% per session [95% CrI: **−0.14%**, 0.82%], **91.3%** posterior probability > 0 —
the interval contains the null.

> "any independent effect of additional frequency is small and is not consistently
> identifiable across modeling methods"

Frequency → **strength** is a real effect (β = 3.27% [2.74%, 3.84%], 100%): fractional
frequency 1 → 2 moves the estimate from 12.72% [10.57, 15.05] to 17.32% [14.34, 20.56],
"beyond this point, accelerating diminishing returns".

**This independently confirms a change Element 26 already made** — removing the frequency
bonus to MAV on the grounds that frequency does not raise growth at equal weekly volume.
It also says the remaining frequency logic belongs to recovery and to strength, not to the
hypertrophy target, which is exactly where the brief puts it (§3.4).

### 1.5 The curve itself, set by set

The supplementary materials (https://osf.io/6z3xu, *Primary Meta-Regressions / Weekly
Volume / Hypertrophy / hypertrophy.sets.week.fractional.table.png*) publish the fitted
model's **control-adjusted marginal effects at every integer set count from 0 to 45**,
with 95% credible and prediction intervals. That table *is* the dose-response curve, and
it is stored verbatim at `docs/data/pelland-hypertrophy-volume.json`.

Using the published table directly, rather than refitting an equation to it, means every
number the app derives traces to a published figure instead of to a curve I fitted myself.

| Weekly fractional sets | % change in muscle size | 95% CrI |
|---|---|---|
| 1 | 0.74 | 0.44 – 1.01 |
| **4** | **2.21** | 1.32 – 3.06 |
| 5 | 2.60 | 1.55 – 3.59 |
| **10** | **4.18** | 2.49 – 5.81 |
| 15 | 5.45 | 3.23 – 7.58 |
| **18** | **6.12** | 3.63 – 8.53 |
| 20 | 6.54 | 3.87 – 9.12 |
| 25 | 7.52 | 4.44 – 10.50 |
| **29** | **8.24** | 4.86 – 11.52 |
| 30 | 8.41 | 4.96 – 11.77 |
| 40 | 10.03 | 5.90 – 14.07 |
| 45 | 10.77 | 6.32 – 15.13 |

**Transcription verified three ways.** Re-deriving the minimum effective dose from the
table — the first volume whose estimate clears the 2.05% SDES — gives **exactly 4**, the
paper's own figure. Re-deriving the tier edges the same way gives 4, 11, 20, 32 against
the paper's 4, 10, 18, 29: within one set, the difference being integer stepping against
their continuous reading. And the curve is monotonic throughout, with first differences
falling smoothly from 0.74 at one set to 0.15 at forty-five. The only breaks in concavity
are two +0.01 wobbles at 40 and 44 sets, which is rounding in a table published to two
decimal places, not shape.

Note what the credible intervals do: at 4 sets the estimate is 2.21% [1.32, 3.06] and at
29 it is 8.24% [4.86, 11.52]. **The intervals are wide and they overlap heavily.** The
curve is a central estimate across 1,032 people, not a promise to any one of them — which
is the whole argument for the per-user dose-finding in brief §3.5.

---

## 2. FINDING — the counting basis, measured

`INDIRECT_BASIS_CORRECTION` widens a muscle's band to allow for the fact that this app
pays fractional credit to assisting muscles while the published tables were written with
direct work in mind. Five entries were set by hand in v54.0 — glutes 1.5, front delts 1.5,
traps 1.4, lower back 1.4, adductors 1.4 — from an argument rather than a measurement.

`tools/science/counting-basis.mjs` measures it. For each of the **360 builder
combinations**, and for every muscle, it splits that muscle's weekly counted volume into
work from movements it is the prime mover of (share ≥ 1.0) and credit collected from
everything else, then reports the distribution of the indirect share.

| Muscle | Indirect share (median) | p25 | p75 | Correction today |
|---|---|---|---|---|
| Forearms | **100.0%** | 100.0% | 100.0% | 1.0 |
| Traps | **100.0%** | 86.8% | 100.0% | 1.4 |
| Glutes | **100.0%** | 81.1% | 100.0% | 1.5 |
| Adductors \* | **100.0%** | 100.0% | 100.0% | 1.4 |
| Front Delts \* | 66.9% | 62.3% | 73.5% | 1.5 |
| Biceps | 61.5% | 53.3% | 69.2% | **1.0** |
| Lower Back | 60.0% | 50.0% | 100.0% | 1.4 |
| Triceps | 55.6% | 48.3% | 72.2% | **1.0** |
| Mid Back | 45.3% | 34.8% | 51.5% | 1.0 |
| Rear Delts | 43.9% | 31.8% | 60.5% | 1.0 |
| Lats | 42.9% | 36.0% | 47.4% | 1.0 |
| Obliques | 41.2% | 35.9% | 51.2% | 1.0 |
| Hamstrings | 36.3% | 28.1% | 41.5% | 1.0 |
| Side Delts | 16.7% | 13.0% | 23.1% | 1.0 |
| Abs | 6.7% | 0.0% | 20.5% | 1.0 |
| Calves | 6.3% | 0.0% | 8.2% | 1.0 |
| Chest | 0.0% | 0.0% | 10.7% | 1.0 |
| Quads | 0.0% | 0.0% | 0.0% | 1.0 |

\* optional group; not measured by the plan check.

**What it says.** The direction of the hand-set values is right — the muscles given a
correction really are the ones that collect their volume rather than training it — but the
*membership of the list is wrong in three specific, checkable ways*:

1. **Forearms are 100% indirect in every one of the 360 plans and get no correction at
   all.** Not one builder plan in any combination gives the forearms a set of their own.
   They are the most purely compound-fed group in the app and the only one of those
   treated as if it trained directly.
2. **Biceps (61.5%) and triceps (55.6%) collect more indirect credit than lower back
   (60.0%) at the median, and both are left at 1.0 while lower back gets 1.4.** The list
   is not internally consistent with the app's own plans.
3. **Front delts are 66.9%, not the near-100% their 1.5 implies** — the same figure as the
   glutes, which measure 100%.

**What it does not give on its own, and what replaced it.** A share is not a correction.
§3 counts the paper's way directly instead, and the answer is **not** the one these shares
suggest: the traps are 100% indirect here and still come out at parity once the cut-off and
the grip rule are applied. This table stands as a description of where each muscle's volume
comes from; it is **not** the basis for any correction, and the per-muscle ratios derived
from it are withdrawn.

---

---

## 3. COUNTING THE PAPER'S WAY, DIRECTLY

The curve is stated in the paper's units and this app does not count in them. An earlier
pass bridged the two with a per-muscle average ratio. **That is withdrawn.** A ratio is an
average over 360 plans and is wrong for any particular person's plan, and — as below — it
produced a conclusion that does not survive counting properly.

Each user's volume is counted the paper's way directly, so the number compared against the
curve is in the curve's units by construction.

### 3.1 The rule, and where the cut-off comes from

The paper's definition, verbatim (§2.4):

> "For hypertrophy, **direct** sets were those in which the measured muscle(s) was likely
> to be the **primary force generator** in the exercise. **Indirect** sets were those in
> which the measured muscle(s) was likely to be **meaningfully trained but not the primary
> force generator** of the exercise (i.e., synergist)."

Their worked example: measuring biceps, five sets of curls plus five sets of rows gives
'total' 10, 'fractional' 7.5, 'direct' 5 — a row pays the biceps half a set.

**The cut-off is set from their own decisions, not chosen.** Table 1A lists every exercise
they classified. Checked against this app's shares:

| Paper's verdict | Pairs checked | Element 26 pays |
|---|---|---|
| Direct | 17 of 17 | exactly **1.00**, every one |
| Indirect | 15 | **0.30 – 0.60** |

The separation is clean, and the lowest share they are willing to call a meaningful
synergist is **0.30** — the trapezius in a lat pulldown. So:

```
f >= 1.0         ->  1 set      prime mover
0.3 <= f < 1.0   ->  0.5 sets   meaningfully trained synergist
f < 0.3          ->  0 sets     stabiliser
```

**And grip and bracing are not training.** A numeric cut-off alone cannot express this:
this app pays the forearms 0.35 for a barbell row — the same range as real synergy — when
what the forearms are doing is holding the bar. The paper's wording is "meaningfully
*trained*", and a muscle contracting isometrically to stop something moving is not being
trained through a range. So three muscles whose involvement in a compound is grip or
bracing — **forearms, abs, obliques** — count only when the movement is actually for them.

Nothing else is excluded. The trapezius keeps its half set in a row, because the paper
explicitly classified it that way and it works through a range there.

`tools/science/paper-basis.mjs` implements this and is the basis for everything below.

### 3.2 Does "backwards" still hold? Mostly no — and that correction is mine

The previous pass claimed three of the five corrections shipped in v54.0 were backwards.
Counted properly, **that claim was itself largely an artifact of the ratio method**, which
treated every sub-1.0 share as half a set — including 0.2 shares the paper would count as
zero, which inflated the paper-side total and made ratios look low.

Median weekly volume for the same 360 plans, counted both ways:

| Muscle | App sets | Paper sets | app/paper | Old fixed ratio | Does "backwards" hold? |
|---|---|---|---|---|---|
| Traps | 10.5 | 11.0 | **0.955** | 0.749 | **No** — near parity, no correction needed |
| Lower back | 5.7 | 6.5 | **0.877** | 0.871 | **Yes** — genuinely under-counted |
| Adductors \* | 2.3 | 3.0 | **0.750** | 0.700 | **Yes** — genuinely under-counted |
| Front delts \* | 6.7 | 6.0 | **1.108** | 0.938 | **No** — over-counted, not under |
| Glutes | 9.6 | 7.0 | **1.371** | 1.353 | n/a — over-counted, as shipped |
| Hamstrings | 8.8 | 7.0 | **1.250** | 0.900 | changed sign |
| Obliques | 4.8 | 3.0 | **1.600** | 0.800 | changed sign |
| Rear delts | 8.1 | 7.5 | 1.080 | 0.862 | changed sign |
| Forearms | 4.7 | **0.0** | n/a | 0.720 | see below |
| Chest, quads | 10.0, 9.0 | 10.0, 9.0 | 1.000 | 1.000 | unchanged |

\* optional group.

**So the corrected verdict on v54.0:** the glutes were right in direction (1.5 shipped
against 1.371 measured, about 9% too strong). The traps and front delts were *too strong*
but not backwards. Only the **lower back and adductors** are genuinely the wrong way
round, and the adductors are an optional group the plan check does not measure. My
previous summary over-claimed, and counting the paper's way rather than averaging ratios
is what caught it.

**Four muscles changed sign entirely** between the two methods — hamstrings 0.900 → 1.250,
obliques 0.800 → 1.600, rear delts 0.862 → 1.080, traps 0.749 → 0.955. That spread is the
argument against shipping ratios at all: the two methods disagree about direction, not
just magnitude.

### 3.3 The forearms are not in the volume model

Under the paper's rule the forearms score **zero** sets in **every one of the 360 builder
plans**. Not "mostly indirect" — zero. No builder plan trains them directly, and every
other involvement is grip.

That answers §7's open question. A muscle with no volume cannot have a volume target, and
the honest thing is to stop giving it one rather than to measure it against a floor it can
never clear. Wrist work and loaded carries would give it real sets; nothing the builder
writes does.

## 4. FINDING — the adjustment chain has no bound on its product

`adjustedLandmarks()` multiplies the base table by experience, goal, frequency, effort,
exercise mix and a recovery modifier. Each step is defensible on its own and **nothing
bounds their product.** `tools/science/multiplier-bounds.mjs` drives the real function
with the inputs each step reacts to, at both extremes, for every non-optional muscle.

| Muscle | Base MRV | Worst case | × base | Best case | × base |
|---|---|---|---|---|---|
| Obliques | 16 | 5.9 | **0.37** | 25.9 | 1.62 |
| Hamstrings | 20 | 7.8 | 0.39 | 32.4 | 1.62 |
| Calves | 20 | 7.8 | 0.39 | 32.4 | 1.62 |
| Biceps | 24 | 9.7 | 0.40 | 38.9 | 1.62 |
| Forearms | 12 | 4.9 | 0.41 | 19.5 | 1.63 |
| Side Delts | 26 | 10.7 | 0.41 | 42.2 | 1.62 |
| Triceps | 18 | 7.8 | 0.43 | 29.2 | 1.62 |
| Quads | 20 | 8.8 | 0.44 | 32.4 | 1.62 |
| Chest | 22 | 10.7 | 0.49 | 35.7 | 1.62 |
| Traps | 24 | 12.7 | 0.53 | 54.5 | **2.27** |
| Lower Back | 12 | 6.4 | 0.53 | 27.2 | **2.27** |
| Glutes | 16 | 9.7 | 0.61 | 38.9 | **2.43** |

**The span between two states a real person could be in is 6.6×** — obliques at 0.37× base
for a beginner, health goal, one training day, RPE 9.5, compound-heavy, badly slept;
glutes at 2.43× for an advanced lifter chasing size on four days with good sleep.

A worst-case MEV of **1.1 sets a week for forearms and 2.2 for obliques** is not a floor
anybody should be measured against, and a best-case MRV of 54.5 for the traps is past the
hard calibration cap of 35 the app already imposes elsewhere.

**And the top three are the ones v54.0 touched.** Traps, lower back and glutes reach
2.27–2.43× precisely because they now take the basis correction *and* skip the
compound-share penalty *and* still collect the frequency bonus. Correcting the double
penalty removed a brake without adding one, and these measurements are how that shows up.
It is a real consequence of the change shipped earlier in this session.

**Not fixed yet, deliberately.** The brief's own remedy — clamp the product of the recovery
factors to a named range — changes every landmark for every existing user, which is what
Part 6's migration exists to carry safely. Shipping the clamp on its own would move
people's numbers with none of that machinery, which is the "changed behind their back"
failure the brief is written to prevent. It ships with the model.

---

---

## 5. WHAT THE FINDINGS ALREADY SAY ABOUT THE CURRENT TABLE

Comparing Table 2A (§1.3), converted into each muscle's own units by §3's ratios, against
the `GROUPS` table the app ships today:

| | Paper (fractional sets) | Element 26 today |
|---|---|---|
| Floor | **4** for every muscle | 2 to 10, varying per muscle |
| Efficiency knee | **10** | — no such concept |
| Useful middle, top | **18** | MAV 6 to 20 |
| Real but expensive, top | **29** | — |
| No evidence past | **43** | MRV 12 to 26 |

Three things follow, and none of them is a small adjustment.

1. **The floors are mostly too high.** Chest and mid back sit at MEV 10, side delts and
   calves and quads at 8, against a measured minimum effective dose of 4. An app that
   tells somebody doing 6 hard chest sets a week that they are below the minimum to grow
   at all is contradicting the best available estimate of that minimum.

2. **The ceilings are too low, and the one the user hit is the clearest case.** Element 26
   calls 16–26 the ceiling; the paper still finds detectable returns to 29 and has no
   evidence of harm until 43+. The glute ceiling of 16 against a count inflated 1.353× is
   what produced the reported bug twice over.

3. **The per-muscle differences are mostly unsupported.** The paper fits **one curve** for
   all muscles. Element 26 varies MEV from 2 to 10 and MRV from 12 to 26 across muscles on
   the strength of a coaching table. The brief anticipated this: muscle differences should
   survive only as (a) counting basis and (b) recovery cost. §3 measures (a). Nothing yet
   measures (b), and the honest default is that it does not exist until something does.

**None of this is applied yet.** It changes every landmark for every user, which is what
the Part 6 migration exists to carry safely, and it should ship once — with the migration,
the bounded multiplier chain, the simulation and the re-measurement — rather than in
pieces.

---

## 5A. THE BANDS, AND WHAT THEY MEAN

The paper's tiers are about **efficiency** — how many more sets buy one more detectable
increment. They are not targets and they are not recovery limits, and the model must not
present them as either.

| Band (paper sets) | What it is | What the app does |
|---|---|---|
| below 4 | under the minimum effective dose | "below the minimum to grow" |
| **4** | floor | the floor, for every muscle |
| 4 – 10 | higher efficiency | climbing toward the target |
| **11 – 18** | intermediate efficiency | **the starting target**, placed by training level, available time and the user's current volume |
| 19 – 29 | lower efficiency; real but expensive | entered **only while that user keeps progressing** |
| 30 – 42 | lowest efficiency | "a little extra gain" note |
| **43+** | unclear — insufficient data, or possibly less | "no evidence past here" |

The **personal limit is learned per user** and is not any of these numbers. The bands say
what volume buys on average across 1,032 people; what it costs *this* person is what the
per-user dose finding is for.

One consequence worth stating plainly: because every muscle now sits on one curve and is
counted in the curve's own units, **the bands are the same for every muscle**. The old
table's per-muscle spread — MEV 2 to 10, MRV 12 to 26 — does not survive. What differs
between muscles is how many sets a given plan actually delivers them, which the counting
rule handles directly.

### 5A.1 Is there a trained-only curve to use? No.

Instruction: look for one in the supplementary files and use it for intermediate and
advanced users. I looked. **There is not one that can responsibly be used.**

- Training status is a **fixed effect in the primary model**, and the published marginal
  effects are "proportionally marginalized across the categorical fixed effect (i.e.,
  training status)". The curve in §1.5 already accounts for it.
- There *is* a trained-vs-untrained interaction, in *Moderator Analyses /
  hypertrophy.sets.week.fractional.interaction.plots.pdf*, page 12. It is published as a
  **figure only** — no estimate table anywhere in the supplementary materials.
- The authors are explicit about its status: the moderator models "included a linear main
  effect and interaction term... **primarily for future hypothesis generation**", they
  "should be interpreted with caution, as the number of observations that contribute to
  the effects are substantially reduced", "there were often no direct examinations of
  these interactions", and "we view the role of these exploratory moderators **primarily
  to generate future hypotheses**".
- Those models also **dropped the non-training control groups and the frequency-study
  effects**, so they are not even on the same footing as the model that produced the curve.

Digitising a figure the authors warn against, to split the production curve in two, would
be inventing precision. So training status enters where the evidence supports it and where
the band table above already puts it: **the starting point within 11–18**, not a different
curve.

## 6. Still to do

Everything in Parts 3–7 of the brief: the dose-response curve and the landmarks derived
from it, the measured counting correction, the bounded adjustment chain, per-user dose
finding with noise thresholds from real logs, the simulation study against an oracle, the
existing-user migration, the 360-combination re-measurement, and the tests.

All of it waits on §0.

## 7. Open questions

- **~~The exchange rate between an indirect set and a direct one.~~** Answered: 0.5, and
  binary rather than graded (§1.1). §3 converts it into this app's units.
- **Whether Element 26's continuum is better or worse than the paper's binary 0.5.** The
  app's graded shares are more detailed, but the tiers were fitted on the binary scheme. The
  app now keeps both: the continuum for everything it already does, and the paper's count
  for comparison against the curve. Worth testing later whether the continuum predicts this
  app's own logged outcomes better than a flat 0.5 would.
- **Where the cut-off sits for muscles the paper never measured.** Table 1A covers eight
  muscles; the 0.3 line and the grip/brace rule are extrapolations from their decisions to
  the rest, and are the most arguable judgement in §3.
- **~~Whether the forearms belong in the volume model at all.~~** Answered: counted the
  paper's way they score zero sets in all 360 builder plans (§3.3). They should not carry a
  volume target unless the plan contains wrist work or loaded carries.
- **Whether a per-muscle recovery cost is defensible at all**, or whether muscle differences
  should be confined to the counting basis. The paper fits one curve for every muscle.
- **Where the hypertrophy curve's intercept sits.** The marginal slope (0.24%/set) and the
  tier boundaries are extracted; the full fitted parameters of the square-root model are in
  the supplementary materials at https://osf.io/6z3xu and are the next thing to pull.
