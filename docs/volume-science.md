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

| Bickel 2011, *Med Sci Sports Exerc* — maintenance dosing | **read in full** (§1A.1) |
| Scarpelli 2022, *J Strength Cond Res* — individualised volume | **read** (§1A.2) |

| Schoenfeld 2017, Hammarström 2020, Brigatto 2022, Aubé 2022, Enes 2024, Robinson 2024, Murphy & Koehler 2022, Roberts 2020, Helms/Zourdos RIR scale | **read** (§1A.3) |
| Barbalho 2019 | **RETRACTED — not used** (§1A.3) |

Not read, and not load-bearing for anything below: Baz-Valle 2022 (superseded by Pelland
on the same question), Damas 2019, Refalo 2023 (superseded by Robinson 2024), Halperin
2022, Remmert 2025.

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

---

## 1A. THE SUPPORTING PAPERS

### 1A.1 Bickel 2011 — the maintenance dose, and an independent check on the floor

Bickel CS, Cross JM, Bamman MM. *Exercise dosing to retain resistance training adaptations
in young and older adults.* Med Sci Sports Exerc 2011;43(7):1177–87. PMID 21131862.
**Read in full.**

Seventy adults, two phases. Phase 1 was resistance training **3 d/wk for 16 weeks**: three
exercises (knee extension, leg press, squats), **three sets of 8–12 reps** each — so the
quadriceps received **27 direct sets a week**. All three are "direct" under the Pelland
classification, so this is cleanly in the curve's units.

Phase 2 ran 32 weeks, randomised to detraining or one of two maintenance doses:

| Arm | How it was reduced | Weekly sets | Result in the young |
|---|---|---|---|
| **one-third** (n=19) | same 3 sets × 3 exercises, frequency 3 → 1 d/wk | **9** | hypertrophy preserved, *and added to* |
| **one-ninth** (n=21) | sets 3 → 1 **and** frequency 3 → 1 d/wk | **3** | hypertrophy preserved |
| detraining | — | 0 | lost; strength largely retained |

> "Both maintenance prescriptions preserved phase 1 muscle hypertrophy in the young but not
> the old. In fact, the one-third maintenance dose led to additional myofiber hypertrophy
> in the young."

**Two things come out of this, and the second is the more valuable.**

**The maintenance figure.** Brief §3.2 asks for a separate `maintenance` number, below MEV,
for time-limited plans and for non-priority muscles during a specialisation block. Bickel
gives it directly: **3 sets a week held muscle size for 32 weeks** in young adults. That is
the figure, and it is measured rather than assumed. Grade **E** — one randomised trial,
quadriceps only, previously-untrained adults trained up over 16 weeks first.

**And it checks the curve's floor from a completely independent direction.** Read Bickel's
two doses off the Pelland curve, which was fitted on different studies entirely:

| Bickel dose | Weekly sets | Curve says | Against SDES 2.05% | Bickel observed |
|---|---|---|---|---|
| one-ninth | 3 | **1.78%** | **below** — no detectable growth | preserved size, did not add |
| minimum effective dose | 4 | 2.21% | just above | — |
| one-third | 9 | **3.90%** | **well above** — nearly 2× SDES | preserved size **and added** |

The curve says three sets is not enough to grow detectably and nine sets is; Bickel found
exactly that, in a trial the curve was not fitted on. **The floor of 4 sits precisely in the
gap between "maintains" and "adds".** That is the strongest validation of the model in this
document, and it was not designed for — it falls out of two independent sources agreeing.

**The age caveat, which matters for the app.** Neither dose maintained muscle size in the
60–75 group. Older adults need more. Brief §3.4 defaults age to "not used"; this is the one
piece of direct evidence for it, and it concerns *maintenance*, not the growth target. It
should be recorded and not yet acted on, because a single trial on the maintenance end is
too thin to start scaling targets by age.

### 1A.2 Scarpelli 2022 — why the target has to be personal

Scarpelli MC, Nóbrega SR, Santanielo N, Alvarez IF, Otoboni GB, Ugrinowitsch C, Libardi CA.
*Muscle Hypertrophy Response Is Affected by Previous Resistance Training Volume in Trained
Individuals.* J Strength Cond Res 2022;36(4):1153–7. PMID 32108724.

**Within-subject design — each of 16 trained subjects had one leg on each protocol**, which
removes between-person variation entirely. Eight weeks.

| Arm | Prescription |
|---|---|
| N-IND | **22 sets·wk⁻¹**, "based on the number of weekly sets prescribed in studies" |
| IND | **1.2 × the sets·wk⁻¹ recorded in that subject's own training logs** |

Individualised won: vastus lateralis CSA change higher by **1.08 cm² [CI 0.04–2.11]**,
p = 0.042, effect size **0.75 [0.03–1.47]**, and more individuals exceeded the typical
measurement error (χ², p = 0.0035).

**This is the citation for the starting point.** A population number — even a well-chosen
one from the middle of the efficiency band — was beaten by taking each person's own recent
volume and adding 20%. Note where 22 sets falls on the curve: inside the *lower efficiency*
tier, a perfectly defensible population choice. It still lost to personalisation.

So the starting target is **the user's own recent weekly volume + 0–20%, clamped into the
band**, and only falls back to a level-based position in 11–18 when there is no history to
read. Grade **M** — one within-subject randomised trial, n=16, quadriceps, 8 weeks; strong
design, narrow scope.

### 1A.3 The rest of the reading, and one citation that must not be used

| Paper | What it gives | Grade |
|---|---|---|
| **Schoenfeld, Ogborn & Krieger 2017** (J Sports Sci 35:1073) | 34 groups, 15 studies. Each extra weekly set → ES +0.023, **+0.37% gain**; higher-vs-lower ES difference 0.241 (3.9%). A linear estimate on far fewer studies than Pelland's 0.24%/set marginal slope, same direction, same order of magnitude. Triangulates. | S |
| **Hammarström 2020** (J Physiol 598:543) | 34 untrained, **contralateral** (within-subject), 12 weeks. Moderate volume beat low for CSA, strength and type II transitions. Supports more-is-better at the *low* end. | M |
| **Brigatto 2022** (JSCR 36:22) | 16 vs 24 vs 32 weekly sets, trained men, 8 weeks, n=9/group. Higher volume enhanced muscle thickness. | E |
| **Aubé 2022** (JSCR 36:600) | 12 vs 18 vs 24 sets, 35 trained, 8 weeks. **No group differences in hypertrophy** — and numerically the *lowest* volume was largest (ΣMT 7.7% at 12 sets vs 6.1% at 24). 1RM favoured 18. Real counter-evidence at the top end. | E |
| **Enes 2024** (MSSE 56:553) | 31 trained men, 12 weeks, constant vs +4 vs +6 sets per fortnight. Strength: 6SG > 4SG > CG, all significant. **Hypertrophy: no between-group difference** (CSA p=0.067, ΣMT p=0.076), with CIs "appearing to plateau in the higher volume conditions". The brief described this as "quads specialisation, progressively up to ~52 sets"; it is a set-progression study and its hypertrophy result was null. | E |
| **Robinson 2024** (Sports Med 54:2209) | Proximity-to-failure meta-regressions. **Strength: RIR slope contains the null.** **Hypertrophy: RIR slope negative, CI excludes the null** — growth improves as sets end closer to failure. Authors caution it is exploratory. | M |
| **Murphy & Koehler 2022** (Scand J Med Sci Sports 32:125) | Energy deficit impairs **lean mass** gains (ES = −0.57) **but not strength**, with a meta-regression on deficit size. | S |
| **Roberts 2020** (JSCR 34:1448) | **No sex difference in hypertrophy** (ES = 0.07 ± 0.06, p = 0.31, I² = 0). Upper-body strength favours females. | S |
| **Helms/Zourdos RIR-RPE scale** (Strength Cond J 38:42) | The RIR-based RPE scale this app's effort credit is expressed in. | P |

**Barbalho 2019 — RETRACTED, and not used.** *Evidence for an Upper Threshold for
Resistance Training Volume in Trained Women*, Med Sci Sports Exerc 2019;51(3):515–22, was
**retracted** (MSSE 2021;53(6):1318) after an expression of concern (MSSE
2020;52(11):2490). The brief lists it as "evidence of a ceiling, or worse results, at very
high volumes". It is one of the two most-cited planks of that argument and it no longer
stands. Per the brief's own rule, it is named here and **not used anywhere in this model**.

**What the top of the curve actually rests on, then.** With Barbalho withdrawn, the
evidence that very high volumes do *worse* is thin: Aubé's non-significant reversal and
Enes's non-significant plateau. The Pelland curve never turns down — it flattens. So the
model says "the gain is getting small" above the band and "there is no evidence" past 43,
and it does **not** say "this is harming you". Only the user's own recovery signal says
that. That is why the ladder in §5A tops out where it does.

**Three findings that settle adjustment factors directly** (brief §3.4):

- **Sex: not used.** Roberts found no hypertrophy difference. The default stands, now with
  a citation rather than an absence of one.
- **Energy deficit: real, and it belongs on the target, not the floor.** Murphy & Koehler
  found lean-mass gains impaired but strength preserved. So a deficit lowers what the extra
  volume buys; it does not lower the minimum needed to hold what you have.
- **Effort: the set-level discount is supported; a second penalty on the ceiling is not.**
  Robinson found hypertrophy improves as sets end closer to failure, which is exactly what
  `EFFORT_CREDIT` encodes. It found nothing about recovery cost, so the separate MRV
  penalty for high average RPE can only be a recovery claim, and is kept inside the bounded
  product in §4 rather than applied on its own authority.

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

## 5B. THE MIGRATION FOR PEOPLE WHO ALREADY HAVE A HISTORY

Shipping a new model to a new account is easy. Shipping it to somebody with two years of
logs is where the damage would be, so the migration (`volMigrate()`, run once per profile
and version-stamped in `S.volModelVersion`) is written around five promises.

**1. What the app learned about *you* is carried over in sets, not in ratios.**
`S.lmCal[g]` is a multiplier against the population prior. Move the prior and the same
multiplier means a different number of sets — somebody’s learned ceiling of 22 would read
19 overnight with nothing anywhere saying why. The migration reads the old chain (with the
new clamp bypassed, so the comparison is against the figures that were actually on screen),
reads the new one, and re-bases each stored ratio by `was / now`. A muscle with no stored
calibration has no learned position to preserve and simply gets the new prior.

**2. A number you set by hand is never touched.** `lmFloor`, `lmMav`, `lmMrv` and `lmScale`
are instructions, not estimates. Where the model’s own estimate has moved more than 25%
away from one of them, that gets **one note** in the plan history (`S.manualDisagreement`)
and nothing else. Measured by standing the overrides aside for the length of one read — the
only way to see what the chain would say on its own — and restored in a `finally`, because
a blank hand-set ceiling would be a far worse bug than the one the note is for.

**3. A block already running finishes on the numbers it was planned against.** Changing
the target somebody is three weeks into chasing, and then judging the block against a line
that was not there when they planned it, is not an improvement. The migration snapshots the
old figures for whatever block was live (`S.volHold`, keyed to `S.blockStart`) and
`adjustedLandmarks` returns them until that block ends. Expiry is by comparing block
starts, not by a timer, and a hand-set number is never held — people can still change
their own mind mid-block.

**4. The plan is not rewritten.** `S.program` is untouched, byte for byte. The plan check
reports against the new numbers and the person decides what to do about it. Warnings the
new numbers no longer support are **withdrawn, not deleted**: `S.volAck[g].withdrawn`
records that they were raised and why they stopped applying.

**5. Training age is repaired only where the question will never reach them.** A profile
with no `priorTrainingWeeks` reads as a beginner, which moves every landmark it touches —
so it is worth filling in from `expManual`, `setup.level`, the builder’s answers, the
importer’s metadata, or failing all of those, the weeks between the first logged session
and the last. But A3 made training age something the app **asks** about rather than infers,
and anything written here would satisfy `priorTrainingAskDue()` and quietly cancel the
question. So the repair is gated on that function: it runs for people who were asked and
declined, and for people past the point where the ask is offered, and for nobody else.
`tests/specs/migrate.mjs` caught this, which is the whole reason it exists.

**And it is said out loud, once.** A one-time card on the Program tab names the muscles
whose limits moved and the warnings that no longer apply, and disappears when dismissed.
It is not shown at all to somebody whose numbers did not move: a card that says "nothing
changed" is worse than no card.

Where it runs: `runOneTimeSeeds()`, not `migrate()`. `migrate()` is called at module level,
before the landmark tables exist, and the same mistake has been made in this file before.
The stamp, the card state, the hold and the note all travel in `BACKUP_FIELDS`, because a
restore that re-ran the re-basing would apply it twice.

Covered by `tests/specs/volmig.mjs` (34 checks): idempotency, learned volumes unchanged in
sets, hand-set numbers untouched and the disagreement note firing, the block hold and its
expiry at the block boundary, withdrawal rather than deletion, the training-age gate in both
directions, `S.program` unchanged, every field present in `BACKUP_FIELDS`, and the card
shown once and only when something moved.

## 5C. FINDING ONE PERSON’S DOSE, AND HOW BIG A CHANGE HAS TO BE

The population curve says what sets buy on average. What they buy *you* is a different
question, and the only instrument the app has for it is your own log. The ladder already
existed — **over / up / hold / unclear**, with a single reversible probe after two flat
cycles (`decideForMuscle`) — and what was wrong was the bar it was measured against.

**The old bar was +1% and −2% for everybody.** An e1RM estimated off a top set carries
measurement noise: sleep, caffeine, a rounder bar, a rep called at 8 that was really a 9.
How much noise it carries is a fact about that person and that lift, not about lifting.
Somebody whose bench wobbles ±4% session to session was being told they were "responding"
by a +1% rule roughly as often as a coin lands heads; somebody rock-steady at ±0.6% was
told "no call" when a real 1.5% gain had happened. One of those is a false alarm generator
and the other throws away signal.

**The new bar is MDC95, measured per muscle from their own scatter** (`trendNoise`). Take
the session-to-session percentage differences in that muscle’s usable exposures; their
standard deviation is √2 × the typical error of one reading. The trend statistic compares
the median of the last two exposures with the median of the two before, so its own standard
error is that typical error again:

    MDC95 = 1.96 × TE = 1.96 × SD(differences) / √2 ≈ 1.386 × SD(differences)

A ±2% alternating lift comes out at **2.96%**, not 1% — three times the old bar, and the
difference between a verdict and a coin toss.

**Bounded, and never silent about being a fallback.** Eight usable exposures is the least
it is computed from; under that the published figures stand and the result says
`personal: false`. The MDC is clamped to 0.75–4.0% because four near-identical readings can
produce 0.2% (chasing rounding error) and one bad week can produce 12% (ignoring a real
collapse) — both are the estimator being asked for more than the data holds. The fall that
counts as overreaching is the same figure read downwards, clamped to 1.5–6.0%, because a
drop is the reading the app acts on hardest. One noise figure, not two independent
judgements.

It is a calibration, so it respects the same switch calibration does (`lmNoCal`). And it is
said out loud: the landmark explainer prints the person’s own session-to-session scatter,
the two thresholds it produced, how many readings they came from, and whether the figure
had to be held inside the bounds — or, for a thin log, that the general figures are
standing in and roughly when that changes.

Covered by `tests/specs/trendnoise.mjs` (26 checks), including the arithmetic computed
independently of the implementation, both bounds, the switch, and the ladder behaving
unchanged on the published figures.

## 5D. THE SIMULATION STUDY: 1,000 LIFTERS PER SCENARIO, TWO YEARS EACH

`tests/sim/volume-sim.mjs`. Five populations, 1,000 synthetic lifters each, 24 four-week
cycles, seeded so a run is reproducible. Each lifter has a true personal optimum, a true
measurement noise and a true responsiveness that the app cannot see. Three policies are run
on **the same lifters and the same noise draws**:

- **oracle** — trained at their true optimum from cycle one. Nobody can do this; it is the
  ceiling the others are scored against.
- **fixed** — the 54.1 rule: responding at +1%, going backwards at −2%, for everybody.
- **mdc** — the 55.1 rule: both thresholds measured from that lifter’s own scatter.

It runs **in the page**, calling `decideForMuscle()`, `volGrowthAt()`, `volStartTarget()`
and the real MDC bounds. Only the world is synthetic. A simulation of a reimplementation
would prove nothing about what ships.

### Results (n = 1,000, 24 cycles, seed 26)

| scenario | policy | % of oracle | overreached blocks | below floor | false alarms | cycles to ±10% | reached ±10% |
|---|---|---|---|---|---|---|---|
| typical | fixed | 89.0% | 51.7% | 0% | 0.35% | 6.0 | 98.2% |
| typical | **mdc** | **89.2%** | **50.4%** | 0% | **0.31%** | 6.1 | **98.6%** |
| noisy | fixed | 88.6% | 41.5% | 0% | 1.94% | 6.8 | 96.3% |
| noisy | **mdc** | **88.7%** | **41.4%** | 0% | **1.37%** | 7.0 | 96.3% |
| steady | fixed | 88.9% | 58.2% | 0% | 0.18% | 5.3 | 98.5% |
| steady | **mdc** | 88.9% | 58.7% | 0% | 0.20% | 5.3 | **98.7%** |
| low-ceiling | fixed | 76.6% | 76.6% | 0% | 0.52% | 7.8 | 96.7% |
| low-ceiling | **mdc** | **77.0%** | **75.1%** | 0% | **0.45%** | 7.8 | 96.3% |
| high-ceiling | fixed | 76.1% | 3.0% | 0% | 0.65% | 17.2 | 56.5% |
| high-ceiling | **mdc** | 75.8% | **2.7%** | 0% | **0.59%** | 17.5 | 54.8% |

**Verdict: ship.** The measured rule matches or beats the fixed one in every scenario on
the three gates set in the brief (growth, overreached blocks, false alarms). Re-run on a
different seed (`--n=600 --seed=991`) for the same verdict, so it is not seed luck.

**And it is a modest win, not a dramatic one.** Worth saying plainly, because the table is
easy to oversell:

- **Growth is effectively a wash** — ±0.4% of oracle in every scenario. The dose-finding
  ladder was already doing most of the work; the threshold was never the binding
  constraint on growth.
- **The real gain is in false alarms for noisy lifters: 1.94% → 1.37%, a 29% reduction.**
  That is exactly what MDC was introduced for, and it is the only place the effect is
  large. For steady lifters it is a rounding error in the other direction (0.18% → 0.20%),
  which is the price of a bar that can also be *tighter* than −2%.
- **Overreached blocks fall slightly** in three of five scenarios and rise slightly in one.

### What the simulation changed about the design

**It killed the "one noise figure, read both ways" idea.** The first version used the same
MDC for the rise and the fall, which read as the clean answer. The simulation said noisy
lifters then spent *more* of their blocks overreached than under the old flat −2% — a wider
bar confirms a real decline a cycle or two later, and those are cycles spent past their own
limit. The fix is in the code and the reasoning is in the comment: a decline must show in
**two consecutive cycles** before the verdict fires, and two independent draws buy back a
factor of √2, so the per-cycle bar can be that much tighter at the same false-alarm rate.
`TREND_DECLINE_MAX` came down from 6.0 to 3.0 at the same time, because with the √2 the
old bound was unreachable and so was not a bound.

### A finding the simulation surfaced that is NOT fixed

**High-ceiling lifters are not reached in two years.** Only ~55% of lifters whose true
optimum is 24–40 sets get within 10% of it inside 24 cycles, under either policy, and both
end ~76% of oracle. The cause is not the threshold — it is the step size: one set per cycle
cannot climb from a starting target of ~14 to an optimum of 32 inside two years, and
`ADD_SETS_MAX` of 2 is only reached in a cycle that already said "responding".

This is a real shortfall and it is **deliberately left alone here.** Making the climb
accelerate while a lifter keeps responding is a change to progression behaviour, not to the
volume model, and it should be designed and simulated on its own rather than slipped in
under a threshold change. It is the first thing in §6.

## 5E. THE 360-COMBINATION RE-MEASUREMENT, AGAINST THE NEW BANDS

`tools/science/band-sweep.mjs`. Every plan the builder can produce — 5 day counts × 4 gear
sets × 3 levels × 2 goals × 3 time budgets — counted three ways per muscle: this app’s
graded shares, the paper’s own 1 / 0.5 / 0 count, and where the paper count lands on the
bands from §5A. All 360 build; nothing throws.

| muscle | app sets | paper sets | band | under floor | in target | past the evidence |
|---|---|---|---|---|---|---|
| Traps | 10.5 | 11.0 | target | 3.6% | 46.9% | 0% |
| Mid Back | 11.1 | 11.0 | target | 1.1% | 61.9% | 0% |
| Chest | 10.0 | 10.0 | target | 1.4% | 48.6% | 0% |
| Quads | 9.0 | 9.0 | building | 4.4% | 48.1% | 0% |
| Biceps | 8.3 | 8.5 | building | 5.3% | 32.5% | 0% |
| Triceps | 8.1 | 8.5 | building | 10.6% | 31.7% | 0% |
| Lats | 9.5 | 8.0 | building | 1.1% | 30.6% | 0% |
| Side Delts | 7.8 | 7.5 | building | 8.9% | 23.1% | 0% |
| Rear Delts | 8.1 | 7.5 | building | 19.4% | 30.8% | 0% |
| Glutes | 9.6 | 7.0 | building | 5.0% | 17.2% | 0% |
| Hamstrings | 8.8 | 7.0 | building | 8.9% | 24.7% | 0% |
| Calves | 7.8 | 7.0 | building | 13.9% | 16.7% | 0% |
| Lower Back | 5.7 | 6.5 | building | 5.6% | 3.1% | 0% |
| Abs | 7.0 | 6.0 | building | 18.9% | 17.2% | 0% |

Held out of the pass/fail counts and reported separately: Neck, Front Delts and Adductors
(optional), Forearms and Obliques (§3.3 — they score zero paper sets in every plan, which is
itself the finding).

### Three things this says, and one of them settles an argument

**1. NO PLAN THE BUILDER PRODUCES IS EVER OVER A CEILING. Not one, for any muscle, in any
of the 360.** The "past the evidence" column is zero all the way down, and the band totals
across every muscle × plan put 50 readings in "earning" and none beyond it.

This is the answer to the bug that started all of this. A user’s volume sheet was telling
them the glutes were over their limit on a plan the builder itself had just produced, and
the explanation is in the first two numeric columns: the glutes read **9.6 app sets and 7.0
paper sets** on the median plan. The gap is partial credit from compound lifts. The plan was
never over anything — the counting was. §3 and §4 are what fix it; this is the measurement
that shows the fix is complete rather than merely plausible.

**2. The builder systematically lands BELOW the target band, not above it.** Only three
muscles have a median in 10–18 at all, and most sit in 4–9 — above the floor, under the
target. "In target" is 3% to 62% depending on the muscle. That is the opposite of the
problem the volume sheet was reporting, and it is worth knowing before anybody tunes the
builder to produce less.

**3. The 25.6% of plans with a muscle under the floor are a time problem, not a model
problem.** 268 of 360 plans have every muscle it cares about at or above 4 paper sets.
Where the rest are:

| | clean |
|---|---|
| 2 days a week | 4 of 72 |
| 3 days | 52 of 72 |
| 4 days | 68 of 72 |
| 5 days | 72 of 72 |
| 6 days | 72 of 72 |
| 45 minutes | 72 of 120 |
| 75 minutes | 100 of 120 |

Gear barely matters (23/22/24/23 problem plans across full, dumbbell, home and minimal —
i.e. none of them). **Days a week is nearly the whole effect**, and 2 days is nearly all of
it. A fortnightly-ish full-body plan at 45 minutes cannot give fourteen muscles four hard
sets each; no model can make it. The honest response is for the builder to say so, which is
what the plan check already does, rather than for the floor to be lowered until the plan
passes.

## 5F. THE OVERREACH NUMBER WAS MEASURING THE WRONG THING

§5D reported that typical lifters spend 50% of blocks "overreached" and low-ceiling
lifters 75%. Those figures were challenged before any further work was built on them, and
the challenge was right.

**`vstar` was one number doing two jobs.** The simulation gave each lifter a single value
that served as both the volume where their growth curve flattens *and* the volume past
which a fatigue penalty starts. "Overreached" was then defined as 10% past it. In the app
those are two different landmarks — MAV and MRV — and the gap between them is precisely
where "still gaining, costing more" lives. Collapsing them meant the headline figure
measured **time spent past the point extra sets stop buying much**, which is somewhere a
climb-until-signal ladder is *designed* to visit, not time spent past what anybody can
recover from.

The audit (`tools/` scratch run, reproduced in `tests/sim/volume-sim.mjs`):

| scenario | "overreached" | depth above `vstar` (mean / median / max) | consecutive blocks (mean / median / max) |
|---|---|---|---|
| typical | 50.4% | +21.2% / +19.9% / +67.9% | 7.1 / 6 / **24** |
| low-ceiling | 75.1% | +32.8% / +26.5% / **+149.9%** | 6.2 / 5 / **24** |
| high-ceiling | 2.7% | +15.6% / +14.8% / +33.5% | 3.5 / 3 / 10 |

Blocks that actually lost ground, on the same runs: **0%** typical, **1.9%** low-ceiling,
**0%** high-ceiling.

### Three measures, and only one of them counts

The audit also reported 14.5% / 41.2% / 0.1% against a *notional* recovery limit 25% above
best. **That figure has been retired, and the reconciliation matters enough to spell out,
because it is easy to read the three numbers as though they were comparable and they are
not.**

| scenario | **(a)** old headline | **(b)** notional indicator *(retired)* | **(c)** corrected |
|---|---|---|---|
| typical | 50.4% | 14.5% | **35.5%** |
| low-ceiling | 75.1% | 41.2% | **74.7%** |
| high-ceiling | 2.7% | 0.1% | **0.3%** |

- **(a)** `v > vbest × 1.1`, old world model, mild penalty. Counts blocks past the point
  *growth flattens*, which is not a limit at all.
- **(b)** `v > vbest × 1.25`, **old** world model, mild penalty. A back-of-envelope
  indicator computed on the old trajectories to show roughly how much of (a) was an
  artifact. It is wrong in two ways at once: it hands every lifter the same 25% slack when
  the populations actually carry 10–45% (and low-ceiling only 10–30%), and it scores
  trajectories produced by the mild penalty, under which nothing ever pulled anybody back.
- **(c)** `v > vlimit`, **corrected** world model, calibrated penalty, per-lifter slack.
  Same lifters, same seeds, like for like against every other arm. **This is the measure
  used in §5G and the only one that should be quoted.**

**And (c) overturns part of what I concluded from (b).** I wrote that the headline was
"mostly an artifact". For typical lifters that holds — 50.4% was really about 35.5%, an
overstatement of some 15 points. **For low-ceiling lifters it does not hold at all:**
74.7% against the original 75.1%. The alarming number was approximately right, by
coincidence and for the wrong reason, and the notional 41.2% was the figure that misled.
Low-ceiling lifters genuinely spend three-quarters of their blocks past what they can
recover from under the policy that ships today.

The audit covered only typical, low-ceiling and high-ceiling. The corrected figures for
noisy (27.9%) and steady (43.9%) have no (a) or (b) counterpart and come straight from the
§5G table.

**Two real defects, which (c) confirms rather than softens.**

1. **A maximum run of 24 blocks is a bug, not a statistic.** Some lifters sat above their
   limit for the entire two years and nothing ever pulled them back — because the penalty
   slope was so mild (0.55) that being over never produced a detectable decline. **A limit
   the app cannot feel is a limit it can never learn.**
2. **Low-ceiling lifters are a recovery-safety problem, not a growth-efficiency one.**
   74.7% of blocks past the limit, +17.4% deep on average, and the policy that ships today
   is the one doing it. This is now the clearest result in §5G and the main reason the
   stop-when-it-stops-improving rule is being switched on.

### What changed in the model

A lifter now has **`vbest`** (growth flattens; the oracle trains here; "within ±10%" is
measured against it) and **`vlimit`** (recovery stops; higher than `vbest` by a per-lifter
slack of 10–45%). "Overreached" means `v > vlimit`, with no fudge factor, because
`vlimit` already *is* the limit. Soreness and joint signals are driven by distance past
`vlimit`, not past `vbest` — between the two a lifter is wasting effort, not breaking down,
and should not report as if they were.

The penalty is recalibrated to be **detectable**, stated as a falsifiable claim rather
than a slope: 10% past the limit halves the gain, 20% past buys nothing, 25% past loses
ground (`OVER_PEN = 5.0`). That is the clinical picture of overreaching. **It is the one
invented number in the file, every "overreached" figure below moves with it, and it is the
first thing to challenge.**

Correcting this re-scored the *existing* policy much harder: low-ceiling lifters fell from
76.6% of oracle to **32.4%**. The old model was flattering what ships today.

## 5G. THE ADAPTIVE CLIMB: WHAT WAS SPECIFIED, WHAT WAS MEASURED, AND WHY IT IS OFF

The brief specified an accelerating ladder (+1, +2, +3 on consecutive responding blocks,
capped at the smaller of 3 sets and 20%), an aimed pull-back (halfway back to the last
responding volume), and a start point taken from the lifter's own recent volume. All three
are implemented, tested and **not enabled**.

Five policies, same lifters, same seeds, n=1,000, 24 cycles:

| scenario | policy | % oracle | overreach | depth | alarms | to ±10% | reached | end/best |
|---|---|---|---|---|---|---|---|
| typical | mdc *(live)* | 82.7% | 35.5% | +7.3% | 0.62% | 6.0 | 87.3% | 134% |
| typical | own-start | 80.2% | 50.0% | +7.7% | 0.60% | 3.2 | 73.9% | 138% |
| typical | ladder | 62.1% | 68.7% | +11.1% | 0.31% | 2.3 | 71.8% | 146% |
| typical | **peak** | **85.1%** | **29.3%** | +7.3% | 0.72% | 3.9 | 76.1% | **116%** |
| noisy | mdc | 84.7% | 27.9% | +7.0% | 1.99% | 7.0 | 86.8% | 127% |
| noisy | ladder | 67.8% | 60.4% | +10.3% | 1.03% | 2.9 | 72.8% | 144% |
| noisy | **peak** | **88.1%** | **17.2%** | +6.4% | 2.27% | 4.7 | 77.4% | **103%** |
| steady | mdc | 79.3% | 43.9% | +7.9% | 0.44% | 5.1 | 87.0% | 138% |
| steady | ladder | 50.7% | 79.3% | +13.1% | 0.17% | 1.9 | 71.4% | 148% |
| steady | peak | 74.0% | 51.7% | +9.3% | 0.41% | 2.8 | 77.6% | 130% |
| low-ceiling | mdc | 32.4% | 74.7% | +17.4% | 0.94% | 9.6 | 67.5% | 127% |
| low-ceiling | ladder | 44.0% | 78.7% | +14.7% | 0.40% | 2.1 | 76.2% | 139% |
| low-ceiling | **peak** | **70.7%** | **48.2%** | +10.8% | 0.98% | 3.4 | 85.8% | 119% |
| high-ceiling | mdc | 76.1% | 0.3% | +2.4% | 0.58% | 17.3 | 54.2% | 96% |
| high-ceiling | own-start | 92.4% | 17.9% | +4.6% | 0.50% | 4.9 | 94.2% | 125% |
| high-ceiling | ladder | 86.6% | 31.0% | +7.4% | 0.41% | 3.2 | 94.1% | 127% |
| high-ceiling | **peak** | **91.5%** | 8.9% | +4.9% | 0.53% | 4.8 | 87.8% | **103%** |

### Verdict on what was specified: DO NOT SHIP

**The accelerating ladder is worse than what ships today in four of five populations** —
typical 62.1% against 82.7%, steady 50.7% against 79.3%. It fails eight of the fifteen
gates. **The own-history start, on its own, also fails** (typical 80.2% against 82.7%,
overreach 50% against 35.5%), which was a surprise: at n=300 it looked like the clean win.

### Why, and it is not the step size

The `end/best` column is the whole explanation. **Every climb-until-signal policy parks the
lifter 25–50% above their own best**, because the signal it climbs until is *breakdown*,
and breakdown sits far above the volume where growth stops rising. Making the climb faster
just arrives at the wrong target sooner and overshoots further. **The objective was wrong,
not the speed.**

### The candidate that came out of it

**`peak`** is the same ladder and the same start point with a different stop signal: it asks
whether adding sets is still *improving* the response, rather than whether the lifter has
started falling apart (`volPastPeak`). It clears **twelve of the fifteen gates** and the
wins are large where they matter most — low-ceiling lifters go from 32.4% to **70.7%** of
oracle with overreach down from 74.7% to 48.2%, and high-ceiling from 76.1% to **91.5%**
with 87.8% reaching ±10% against 54.2%. It is the only arm that ends *near* the best
(103–130% rather than 134–148%).

**Three gates it fails, on both seeds (26 and 991):**

1. **Steady lifters lose growth**: 74.0% against 79.3%. Cause diagnosed: `flatV` is never
   withdrawn, so one early false peak pins them — and steady lifters trigger false peaks
   most, because their detection bar sits on its floor while the real per-set gain near the
   bottom of the curve is still small.
2. **Steady lifters overreach more**: 51.7% against 43.9%.
3. **High-ceiling lifters overreach more**: 8.9% against 0.3%. **This gate is
   unsatisfiable jointly with the reach gate.** The 0.3% is an artifact of never arriving:
   today's policy leaves them at 96% of their best after two years having never approached
   their limit. Reaching a high volume at all means operating near it.

### Two intuitions that were tested and were wrong

- **"An estimate that cannot be revised is indefensible."** Letting a later responding
  cycle withdraw the peak call measured **worse** for four of five populations (typical
  85.7% → 82.6%, steady 75.5% → 70%, low-ceiling 71.7% → 66%). Withdrawing it lets the
  climb go back past the top, where "responding" is often noise. The irreversible version
  acts as a learned ceiling.
- **"The peak test should need two blocks, like the decline check."** It handed back the
  entire benefit (typical 85.1% → 67.2%). The asymmetry is the point: the decline check is
  a *damage* signal where a false positive cuts somebody's training for nothing, so
  patience is cheap. The peak test's false *negative* costs a wasted cycle every cycle
  until it fires. Cheap mistakes get made quickly.

A third correction belongs here too: the relative margin in `volPastPeak` was added to fix
steady lifters and **did not fix them** — identical 75.5% with and without. A quarter of a
+3% response is 0.75%, which is the bar's own floor, so the term is inert at ordinary
response sizes. It is kept because it binds on large responses, and the comment above it
now says so instead of claiming a fix it never delivered.

### The caps held everywhere

No step over 3 sets, at any volume, under any policy. No step over 20% at 5 sets or more.
Below 5 sets one whole set is 25% and there is no smaller move — sets are integers — so
that is counted and named as integer granularity rather than waved away, and it applies
equally to the policy that ships today.

## 5H. THE PERIODIC RE-CHECK PROBE: MET ITS OWN GATE, FAILED THE OTHERS

`peak` ships with one known regression: steady, low-noise lifters lose about five points of
oracle growth, because the peak estimate is never withdrawn and those lifters trigger false
peaks most. The proposed fix was a **deliberate re-check**: after four blocks sitting on the
estimate, spend one block above it, and move the estimate only if the response beats that
lifter's own minimum detectable change.

Built as the `probe` arm, same lifters, same seeds, n=400, judged against `peak`:

| scenario | `peak` | `probe` | change |
|---|---|---|---|
| **steady** | 74.1% | **83.9%** | **+9.8** |
| typical | 85.4% | 85.1% | −0.3 |
| noisy | 88.1% | 84.2% | −3.9 |
| low-ceiling | 71.4% | 39.7% | **−31.7** |
| high-ceiling | 91.6% | 67.9% | **−23.7** |

**Verdict: do not ship.** It clears the gate it was designed for — steady lifters recover to
83.9%, comfortably past the 79% asked — and it fails "no other population losing more than
one point" by margins that are not arguable.

### Why, and it is structural

**A re-check is a mechanism for a settled lifter, and the lifters who need the climb most
are never settled inside two years.** High-ceiling lifters end at 64% of their own best and
only 14.5% ever reach it, with *zero* blocks past their limit — they are being held far
below, not pushed too hard. Every block spent re-checking is a block not spent climbing, and
they have a long way to climb.

**And a failed probe is a stronger clamp than a hold.** Under `peak`, a flat block at the
estimate still allows the ordinary two-holds-then-one-set probe to nudge upward. Under
`probe`, those blocks are intercepted and the failed re-check returns the lifter to exactly
where they were — so the ladder's natural upward drift is removed. The machinery meant to
*raise* a stuck estimate is what pins it.

Two fixes were measured. Firing only on a genuine hold rather than merely on being at the
estimate recovered typical (83.7% → 85.1%) and steady (82.3% → 83.9%) and did nothing for
high-ceiling. Not reverting after a failed probe would fix it — and would also stop it being
a controlled re-check at all, which is the point of the design.

### One concrete defect it did expose

**"+2 sets" as a minimum probe step breaks the 20% cap.** Two sets is 50% of a muscle doing
four, and it broke the cap on **8.5% of low-ceiling jumps** — a cap the brief said must never
be broken. Fixed in the arm: two sets is the preference, the relative cap still wins, and
the figure is now 0%. Worth carrying into any future version of this.

`VOL_RECHECK_BLOCKS` and `VOL_RECHECK_FRAC` are in the source, read only by the simulation,
and marked as not shipped.

## 6. Still to do

1. **The steady-lifter regression under `peak`**, which is now the only known cost of what
   ships. Three attempts are measured and rejected: making the estimate revisable (§5G),
   requiring two strikes (§5G), and the periodic re-check probe (§5H). What they have in
   common is that each tries to loosen the estimate, and loosening it costs the populations
   the estimate is protecting. The next attempt should instead make the estimate **better
   conditioned when it is first set** — for example by refusing to set it at all until the
   muscle has enough readings for its own detection bar to be meaningful, which is the
   condition steady lifters fail.
2. **A probe for settled lifters only**, if the re-check idea is revived: it needs a way to
   tell "settled because this is my best" from "settled because the estimate is wrong", and
   §5H is the evidence that volume alone cannot tell them apart.

The plain-English version of all of this, for deciding whether to ship it, is
`docs/volume-model-summary.md`.

Done: the curve and the landmarks derived from it (§1, §5A), the measured counting basis
and the paper’s own counting rule (§2, §3), the bounded adjustment chain (§4), the
existing-user migration (§5B), per-user dose finding with measured noise thresholds
(§5C), the simulation study (§5D), the 360-combination re-measurement (§5E), the
overreach audit and the corrected world model (§5F), and the adaptive climb (§5G).

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
