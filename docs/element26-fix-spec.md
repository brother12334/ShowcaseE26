# About this document

This is the **original fix spec**, as it was written from the 2026-11-15 audit of the
user's full export, and it is kept here unedited as the record of what was asked for.

It predates everything that was decided in working through it, so it does **not** include:

- **The P1-7 L/R addendum.** The spec asks for one-side sets to count 0.5 toward the
  muscle. What shipped is stronger: a set of a one-limb movement is a **pair**, L and R
  on one set, stored that way rather than reconciled afterwards — with one rest, an
  optional pause between the sides, and the C1 one-line layout for a finished pair.
- **The decisions taken on items 1–9**, the slot-scoping debts that came out of P0-1.
- **P1-8b** — judge asymmetry on reps to failure rather than reps logged, because the
  threshold otherwise means something different at different RPEs.
- **Items 10–13**: the session's gym, slot-keyed stall counters, the write/clear
  asymmetry sweep, and the `logstill` flake.

Those additions are recorded in **[docs/open-work.md](open-work.md)**, which carries each
item, what was found, and what was deliberately not done, and summarised in
**[docs/shipped-since-the-audit.md](shipped-since-the-audit.md)**, which lists the 41
releases from 2026.11.15.3 to 2026.11.17.20 and the evidence each rests on.

Where this document and those two disagree, those two are what shipped.

The spec follows, unaltered.

---

# Element 26: Fix Spec (from the Nov 15, 2026 training-data audit)

These issues came from auditing one user's full export: 72 sessions (Jul 12 – Nov 14, 2026), the Training History Report, and the 221-row plan-change CSV. Each item lists the evidence, the current behaviour, the required behaviour, and acceptance tests. They're ordered by how much damage they do to the user's plan. Fix P0 items first. They corrupt the data that every other automation reads.

I'm describing behaviour, not code. Use whatever structure the codebase already has.

---

## P0-1: Automation mixes up the same exercise across different plan slots

**Evidence**
- Nov 5: the Push B **V-bar** overhead triceps extension collapsed (90×8, 9, 5). A few minutes later the app cut the Push A **straight-bar** overhead triceps extension from 90 → 85 lb with the reason "reps collapsed across the sets". The straight bar's own last session (Oct 29: 6, 10, 10) hadn't collapsed. The user reversed it.
- Nov 13: the Body tab cut **Legs A** Smith Machine Squat 80 → 70 lb, again because "reps collapsed". The trigger was the **Legs B** session on Nov 9, where squat is the 3rd exercise (after RDL and hip thrust). On Legs A, squat is done first, fresh, and Nov 4 was the user's best squat.
- Many rest and stall rows are logged under day = `Workout`, not a specific day. That means the rule ran globally per exercise name.

**Current behaviour:** progression, stall, load-reduction and rest rules group performance by exercise name (or by a fuzzy name match).

**Required**
- Key all performance history and automation by plan slot (day + slot ID), not by exercise name.
- Treat variants (V-bar vs straight bar, any different attachment, a different gym or machine) as separate exercises unless the user explicitly merges them.
- A rule triggered on slot X may change only slot X. If the same exercise appears in two slots, each one keeps its own load, rest window and stall state.
- Cross-slot data may feed estimates (e.g. e1RM for the muscle), but never prescriptions.

**Acceptance tests**
- A collapse logged on Push B V-bar changes nothing on Push A straight bar.
- A collapse on the Legs B squat (slot 3) doesn't change the Legs A squat load.
- Every `weight`, `rest` and stall row in the change log names a specific day, never `Workout`.

---

## P0-2: Changes in how loads are counted look like strength gains or losses

**Evidence**
- Oct 4: Dumbbell Bulgarian Split Squat 25 → 160 lb, labelled "Double progression". Oct 6: Weighted Chest Dips bodyweight → 142.6 lb. Captain's Chair went from about 20 to 159.6. These were the app starting to count bodyweight (about 139.6 lb) on these lifts, not progression.
- Early September: every Smith lift jumped about 25 lb in 1–2 sessions with the same reps (squat 35 → 60, shoulder press 50 → 75, incline 70 → 95, and so on). That was the 25 lb bar starting to be counted.
- Sep 23: "Barbell loads" was switched three times in 11 minutes (bar + plates → plates only → bar + plates), rewriting 112 logged sets each time.

**Current behaviour:** stored loads get rewritten in place, and trend, e1RM and "% strength change" calculations run straight across these jumps.

**Required**
- For every set, store the parts separately: external load, implement/bar weight, bodyweight at the time (if counted), and counting mode. Compute effective load from those parts. Never overwrite the raw entry.
- Any counting-mode change (bodyweight on or off, bar + plates vs plates only, bar weight edits) creates a **discontinuity marker** for the affected exercises.
- All trend math (e1RM, % change, stall detection, floor proposals) must use normalised effective load computed one consistent way across the whole window, or exclude any window that crosses a marker.
- The change reason can never say "Double progression" when the only thing that changed is the counting mode. Log it as a `units` change.
- Debounce the Barbell loads toggle. Rewrite once on save, not on every toggle.

**Acceptance tests**
- Turning on bodyweight counting for dips produces no e1RM jump in the trend chart.
- The split squat's 6-week strength change, computed on Oct 4, stays within ±15% of what the raw added-load numbers give.
- Toggling bar + plates 3 times in a row results in 1 rewrite and 1 change-log row.

---

## P0-3: Volume-floor reductions are justified by fake gains

**Evidence.** These are the accepted floor cuts, each justified by "estimated strength up X%, so you're growing without the volume":
| Date | Floor | Reason given | What actually happened in that window |
|---|---|---|---|
| Sep 15 | Calves 5.4 → 2 | +105% | Smith calf jumped from counting the bar (90 → 165–195) |
| Oct 4 | Quads 8.1 → 5.5 | +99% | Split squat started counting bodyweight that day, and the squat jumped from counting the bar |
| Oct 25 | Side Delts 7.6 → 5 | +33% | Mostly the switch to a new exercise and rep range (Oct 19, 12–20 → 8–16) |
| Sep 17 | Back Thighs 5.2 → 4.5 | +9% | Slow gain for a newer lifter |
| Sep 15 | Mid Back 6.7 → 5.5 | +5% | Slow gain for a newer lifter |

On Oct 7 the app's own updated model put the minimums at Calves 8, Quads 8.1, Mid Back 10 and Hamstrings 6, all above what the floors had been cut to.

**Required**
- Floor-reduction proposals use only normalised e1RM (P0-2) and are blocked if the window crosses a discontinuity marker, an exercise swap, a rep-range change, or a deload.
- Exclude the first 8 weeks of any exercise's history, since early gains are mostly skill.
- Require the gain to show up on at least 2 different exercises for that muscle. A single exercise isn't enough.
- Hard lower bound: never propose a floor below 60% of the app's own model minimum, and never below 4 sets a week.
- Make reductions **reversible proposals with an expiry**. After 6 weeks, re-test, and if the muscle's e1RM trend is under +5% at the reduced floor, propose restoring it.
- The proposal text must show which exercises and which numbers drove it.

**Acceptance tests**
- Run on this user's data, none of the five cuts above is proposed.
- The re-test after 6 weeks fires for every reduced floor.

---

## P1-4: Rest-window lengthening misreads supersets and one-side sets

**Evidence**
- 16 "reps were collapsing, rest lengthened" changes. 8 of the 15 increases are on movements done in supersets or alternating one-arm sets. There, the "collapse" is the partner exercise or the weaker side, not fatigue.
- Across 449 set pairs (reps adjusted for effort), rest length barely predicts next-set reps for this user (r ≈ 0.05).
- The user doesn't follow the windows: the triceps window is 3:30–4:30, but the median actual rest is 1:52.
- The Squat window is now 3:30–5:30, which breaks the app's own v3.4 rule of a 4:00 maximum.

**Required**
- Compute drop-off only between consecutive sets of the same exercise, on the same side, at the same load.
- For supersets, use the round rest (the second movement's "after pair" time). Never treat `→` as rest.
- Don't count a collapse on a set flagged "too heavy" or "stopped on purpose", or in a returning-from-break, injury or deload session.
- Only lengthen the window if the user actually rested at least the current window minimum and still collapsed. If they rested less, prompt "rest longer" instead of changing the plan.
- Enforce a global ceiling: 4:00 for compounds and 3:00 for isolation (make it configurable), with no exceptions.
- Require the collapse in 2 of the last 3 exposures of that slot, not just one.

**Acceptance tests**
- No rest increase for a set inside a superset where the partner movement's reps fell.
- No window ever goes above its ceiling. Clamp the existing Squat window to 4:00 when migrating.
- A session with a median rest below the window minimum never triggers a lengthening.

---

## P1-5: Rules contradict each other (stall protocol vs floors, ceilings vs the Body tab)

**Evidence**
- Rear delts: stall protocol cut Cable Reverse Rear Delt Fly 3 → 2 sets (Oct 2), then 2 → 1 (Oct 13). On Oct 19 the app **raised** the Rear Delts floor to 8.5 sets because they weren't growing.
- Oct 31: stall protocol cut Smith Squat 4 → 3 sets **4 days after** a load increase (70 → 80 on Oct 27). The next squat session was the user's best.
- Sep 29: the Body tab raised Incline Smith to 5 sets. Oct 6: the plan check cut it 5 → 2 ("chest over its ceiling").
- Oct 6: the plan check cut Squat 4 → 2, and the user restored it 1 minute later. Oct 8: 2 → 3, then the user cut it 2 minutes later.
- Stall-protocol cuts didn't unstick anything. Incline DB e1RM was 52 before, 47–52 during, 49 after. Rear delt, hammer curl and mid fly stayed flat.

**Required**
- One shared constraint check that every automatic and Body-tab change must pass: the result must stay within the muscle's floor and ceiling. If it would break one, show the conflict to the user instead of applying it.
- Define a stall as: at least 3 exposures of the slot with no normalised e1RM gain, none within 2 exposures of a load or rep-range change, and excluding deload, break and injury sessions.
- The stall protocol can't cut a muscle below its floor, and can't run while a floor-raise proposal for that muscle is open (or vice versa).
- If a stall-protocol cut hasn't changed the trend when it expires, don't repeat it. Suggest an exercise swap or a load reset instead.
- Hysteresis: once the user reverses an automatic change, don't propose the same change for that slot for 14 days.

**Acceptance tests**
- Replaying this user's history produces no stall cut on rear delts while their floor is being raised, and no squat stall cut on Oct 31.
- The Body tab can't propose a change that the plan check would immediately undo.

---

## P1-6: Planned loads drift away from the loads actually lifted

**Evidence**
- The rear delt fly was planned at 30 lb for about 3 months while every logged session used 32.5. On Nov 14 the plan went 30 → 35 lb ("last set cleared the top of the range"). The logged last set was 12 reps @ RPE 9, and the plan's range tops out at 15+, so the trigger isn't supported by the log.
- Smith prescriptions vs what was logged: flat bench planned 230 → 80 (logged 105), incline planned 90 → 60 (logged 95–100), shoulder press planned 95 → 60 on Nov 5 (logged 75). Several of these gaps are exactly 25 lb, the bar weight, which points to a bar-counting mismatch between prescriptions and logs.
- No-op rows: "145 → 145", "90 → 90", "45 → 45" are all logged as changes. Aug 4 has the same 145 → 145 row twice.

**Required**
- Progression always starts from the **last logged working load** for the slot. If the logged load differs from the planned load for 2 or more sessions in a row, prompt the user once: "Update plan to 32.5?"
- Prescriptions and logs must use the same counting mode (P0-2). Add a test for each equipment type.
- Before logging a progression event, check the trigger against the actual set data and store which set triggered it (session ID, set number) in the change record.
- Drop no-op changes (from = to) and exact duplicates.

**Acceptance tests**
- Replaying Nov 14 produces no rear delt increase.
- A Smith prescription shown to the user matches what they'd load, given their bar setting.
- No change-log row has identical from and to values.

---

## P1-7: One-side sets are counted as full sets

**Evidence:** the user confirmed that each logged set on a one-arm or one-leg exercise is a single side (set 1 L, set 2 R). Single-Arm Cable Pulldown, Preacher Curl and Single-Arm Hammer Curl at "2 sets" are really 1 set per side. Volume, floors and ceilings are probably counting them double.

**Required**
- Exercises flagged unilateral prescribe and count sets **per side**. One "set" = one left plus one right.
- In volume math, each one-side logged set counts 0.5 toward the muscle (or pair the L and R sets).
- The logging UI shows L and R as one set with two entries.

**Acceptance test:** 2 logged sets of a unilateral exercise (L, R) count as 1 set toward weekly volume.

---

## P1-8: The asymmetry rule retired checks that were still real

**Evidence**
- Preacher Curl: left side weaker in 9 of 9 sessions, by 28% on average, regardless of which arm goes first (e.g. Oct 7 left first: L 10 vs R 13.5; Oct 17 right first: L 6.5 vs R 11). The app retired the check on Oct 6 ("All movements are level").
- Standing Cable Hip Abduction: left weaker in 6 of 7 sessions, by about 22%. Retired Sep 22.

**Required**
- Compare sides at the same load within the same session, using the median gap across the last 6 exposures (not only "balanced windows").
- Retire only if the gap is under 10% in at least 4 of the last 6 exposures.
- Show the gap per exercise so the user can see why a check is on or off.

**Acceptance test:** on this data, Preacher Curl and Hip Abduction stay active, and Single-Arm Cable Pulldown, DB Row, BSS and Hammer Curl are retired.

---

## P2-9: Change-log reasons don't match what happened

**Evidence**
- Aug 18–26: rows labelled "Double progression: last set cleared the top of the rep range" are actually load **cuts**: squat 75 → 27.5, DB row 50 → 40, RDL 50 → 45, face pull 20 → 95, leg curl 100 → 160. These came from Programme v3.4 clearing prescribed loads and re-deriving them from logs.
- Aug 31: Smith Hip Thrust 115 → 35, labelled "cleared the top of the range".

**Required**
- Generate the reason text from the actual direction and source of the change: increase = progression, decrease = reduction, a re-derive from the log = "set from your log", a counting change = units.
- Add a `rule_id` field to every change row so reasons can't come apart from the rule that fired.

**Acceptance test:** no row whose load went down carries a "cleared the top" reason.

---

## P2-10: Report export shows "blank → blank"

**Evidence:** most programme edits in the Training History Report render as `Changed X on Y day: blank → blank`, while the same edits in the CSV have the real values (e.g. Nov 14, Mid Cable Fly 2 → 3 sets).

**Required:** the report must render edits from the same change records as the CSV. Add a test that every report edit line matches its CSV row.

---

## P2-11: Input hygiene

- **Steppers create a row per tap.** On Sep 15 the Mid Back floor was changed 13 times in about a minute, ending at 5.3. Coalesce changes to one setting within 30 seconds into a single change-log row, showing only the start and end values.
- **Equipment limits.** The user's heaviest dumbbells are 50 lb, but the log shows Single-Arm DB Row at 55 lb on Oct 17. Add an equipment profile (max dumbbell, bar weights, cable stack increments), warn when a logged load is impossible, and never prescribe one.
- **Default values recorded as real ratings.** Energy is 6/10 in 26 of 39 sessions. If the field is pre-filled, store `null` unless the user touches it.
- **Session flags.** Let the user mark a session as injury, illness or unusual (e.g. Nov 9, toe injury). Flagged sessions are excluded from all automation triggers. They still show in the history.

---

## Regression suite

Use this user's export (report + CSV) as a fixture. After the fixes, replaying the history should produce:
- none of the five floor cuts in P0-3
- no Nov 5 straight-bar triceps cut and no Nov 13 Legs A squat cut (P0-1)
- no rest window above its ceiling (P1-4)
- no Nov 14 rear delt increase (P1-6)
- active asymmetry checks on Preacher Curl and Hip Abduction (P1-8)
- zero no-op, duplicate or mislabelled change rows (P1-6, P2-9)
