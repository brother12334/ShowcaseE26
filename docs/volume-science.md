# Element 26 — the weekly volume model

**Status: IN PROGRESS. Nothing in the app has changed yet.**

This document is being built to the brief "rebuild Element 26's weekly volume targets
(MEV / MAV / MRV) on the best available science". It is published early and honestly: the
two measurements below are finished and reproducible, and the model they feed is blocked
on reading the primary literature.

---

## 0. Where this is up to, and what is blocking it

The brief's method is deliberately ordered — read the literature, extract real numbers,
model the dose-response, then design the algorithm from that model — because every number
that survives has to trace to evidence rather than to a preference. It is explicit about
what to do when a source cannot be read: *"If a citation is wrong or you can't access it,
say so in the audit doc and don't use it."*

**Every primary source is currently unreachable from this environment.** The network
policy denies the hosts the papers live on:

| Host | What is on it |
|---|---|
| `link.springer.com` | Pelland et al. 2025, *Sports Medicine* — the keystone paper |
| `sportrxiv.org` | the Pelland and Remmert preprints |
| `pubmed.ncbi.nlm.nih.gov`, `www.ncbi.nlm.nih.gov` | abstracts and PMC full texts |
| `europepmc.org`, `www.semanticscholar.org`, `api.crossref.org`, `doaj.org` | indexes and open full texts |
| `www.fisiologiadelejercicio.com` | an open PDF of the Pelland paper |

Web *search* works and returns summaries; it does not return the posterior estimates,
the fitted equation, the credible intervals at given set counts, or the counting-method
sensitivity analysis. Those are the numbers the model is made of.

**So the model is not being built yet, on purpose.** Choosing a curve and its parameters
from memory or from search snippets would produce exactly the thing this brief exists to
prevent: numbers that look sourced and are not. The two findings below need no literature
and are finished.

---

## 1. FINDING — the counting basis, measured

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

**What it does not yet give.** A share is not a correction. Turning "67% of this muscle's
volume is collected" into "widen its band by X" needs the exchange rate between a
fractional set and a direct one for growth — which is precisely the counting-method
sensitivity analysis in the meta-regression, and is in §0's blocked list. The measurement
is done; the conversion is not, and will not be invented.

---

## 2. FINDING — the adjustment chain has no bound on its product

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

## 3. Still to do

Everything in Parts 3–7 of the brief: the dose-response curve and the landmarks derived
from it, the measured counting correction, the bounded adjustment chain, per-user dose
finding with noise thresholds from real logs, the simulation study against an oracle, the
existing-user migration, the 360-combination re-measurement, and the tests.

All of it waits on §0.

## 4. Open questions

- The exchange rate between a fractional set and a direct set for growth. Everything in §1
  turns on it.
- Whether the forearms belong in the volume model at all, given that no builder plan in
  360 combinations trains them directly.
- Whether a per-muscle recovery cost is defensible at all, or whether muscle differences
  should be confined to the counting basis.
