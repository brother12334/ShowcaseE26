# Element 26 — the weekly volume model

**Status: IN PROGRESS. Nothing in the app has changed yet.**

This document is being built to the brief "rebuild Element 26's weekly volume targets
(MEV / MAV / MRV) on the best available science". It is published as it goes: the keystone
paper is extracted, three measurements are finished and reproducible, and the model they
feed is not written yet.

---

## 0. Where this is up to

The network policy now reaches the literature. The keystone paper is **read and extracted**
(§1). The two measurements that needed no literature are done (§2, §4), and a third that
needed the paper's method is done (§3).

The model itself (brief §3.1–3.2) is **not yet written into the app**, and §5 says what the
findings already imply for it.

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

**What it does not give on its own.** A share is not a correction. Turning "67% of this
muscle's volume is collected" into "widen its band by X" needs the exchange rate between
an indirect set and a direct one — which §1.1 now supplies (0.5, binary). §3 does that
conversion and the answer is not the one these shares suggest.

---

---

## 3. FINDING — the app's counting basis against the one the tiers are stated in

§1.3's tiers are in **fractional** sets: 1.0 if the muscle is the exercise's primary force
generator, **0.5** if it is involved but not. Element 26 does not count that way. It counts
on a *continuum* — `muscleFrac()` pays a Smith squat's glutes 0.8, a lunge's hamstrings
0.3, a row's biceps 0.5 — so "16.8 sets a week" in this app and "19–29 is the
lower-efficiency tier" in the paper are **not the same quantity**, and the tiers cannot be
dropped in without an exchange rate.

`tools/science/basis-bridge.mjs` measures it. Across all 360 builder plans, for every
muscle, it counts each plan both ways and reports the ratio.

**How many Element 26 sets equal one paper set**

| Muscle | Median | p10 | p90 | | Muscle | Median | p10 | p90 |
|---|---|---|---|---|---|---|---|---|
| Glutes | **1.353** | 1.178 | 1.491 | | Hamstrings | 0.900 | 0.816 | 0.982 |
| Lats | 1.150 | 1.109 | 1.233 | | Lower Back | **0.871** | 0.833 | 0.920 |
| Side Delts | 1.029 | 1.018 | 1.050 | | Rear Delts | 0.862 | 0.723 | 0.911 |
| Chest | 1.000 | 1.000 | 1.022 | | Obliques | 0.800 | 0.700 | 0.887 |
| Mid Back | 1.000 | 0.938 | 1.067 | | Traps | **0.749** | 0.672 | 0.853 |
| Quads | 1.000 | 1.000 | 1.000 | | Forearms | 0.720 | 0.657 | 0.760 |
| Triceps | 0.950 | 0.904 | 0.971 | | Adductors | **0.700** | 0.614 | 0.760 |
| Front Delts | 0.938 | 0.900 | 1.018 | | Biceps | 0.912 | 0.819 | 0.945 |
| Calves | 0.914 | 0.862 | 1.000 | | Abs | 0.909 | 0.775 | 1.000 |

Across muscles the median is **0.914**, the range **0.700 to 1.353**. Most of the app sits
within about 15% of the paper's basis. The two ends do not.

### 3.1 This explains the reported glute bug properly

The glutes are counted **35% higher** in Element 26 than in the units the tiers are stated
in, because the app pays 0.8–0.9 for squats, lunges and RDLs where the paper pays 0.5.

The reported reading of **16.8 app sets is 12.4 paper sets** — squarely inside Table 2A's
*intermediate efficiency* band of 11–18, the useful middle. It was never over anything.
The user was right, and the mechanism is now measured rather than argued.

### 3.2 And it says one of the corrections I shipped in 54.0 is BACKWARDS

v54.0 widened five muscles' bands on the argument that compound-fed muscles accumulate
volume the published tables did not expect. For the glutes the measurement agrees: 1.5 was
shipped, 1.353 is measured — the right direction, about 11% too strong.

**For three of the others it disagrees on the direction.** Traps measure **0.749**, lower
back **0.871**, adductors **0.700** — the app counts these muscles *lower* than the paper's
basis, not higher, because it pays them small shares (0.2–0.4) where the paper pays a flat
0.5. Their bands should be **narrowed**, and v54.0 widened them by 1.4.

| Muscle | v54.0 shipped | Measured ratio | Verdict |
|---|---|---|---|
| Glutes | 1.5 | 1.353 | right direction, ~11% too strong |
| Front delts | 1.5 | 0.938 | **wrong**: no correction warranted |
| Traps | 1.4 | 0.749 | **backwards** |
| Lower back | 1.4 | 0.871 | **backwards** |
| Adductors | 1.4 | 0.700 | **backwards** |

This is why §2's indirect-share table is not by itself the answer, and why the brief asked
for the correction to be derived from the share *and* the meta-regression's weighting
rather than from the share alone. A muscle can be fed almost entirely by compounds (traps,
100% indirect in §2) and still be counted *below* the paper's basis, because what matters
is not whether the credit is indirect but how big each slice is against a flat 0.5.

The hand-set list was reasoning from the right observation to the wrong quantity. These
ratios replace it, and they are measured, reproducible and per-muscle.

### 3.3 The correction this implies

The honest form is not a hand-tuned widening but a stated conversion: the tier boundaries
from Table 2A, multiplied into each muscle's own units. For the glutes, MEV 4 → 5.4 app
sets, the efficiency knee 10 → 13.5, the useful middle's top 18 → 24.4, lower efficiency's
top 29 → 39.2. For the traps the same boundaries become 3.0, 7.5, 13.5 and 21.7.

Writing that into the app is task M and has not been done.

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
  app's graded shares are more detailed, but the tiers were fitted on the binary scheme, so
  the detail is currently a source of mismatch rather than accuracy. Worth testing whether
  the continuum predicts this app's own logged outcomes better than a flat 0.5 would.
- **Whether the forearms belong in the volume model at all**, given that no builder plan in
  360 combinations trains them directly.
- **Whether a per-muscle recovery cost is defensible at all**, or whether muscle differences
  should be confined to the counting basis. The paper fits one curve for every muscle.
- **Where the hypertrophy curve's intercept sits.** The marginal slope (0.24%/set) and the
  tier boundaries are extracted; the full fitted parameters of the square-root model are in
  the supplementary materials at https://osf.io/6z3xu and are the next thing to pull.
