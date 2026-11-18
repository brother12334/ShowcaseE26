# Open work

The queue. Written down rather than remembered, because the order has been revised
several times and the reasons for it are worth keeping with the items.

**Agreed order of work**, which is not the numbering (the numbers are the order the items
were found in): the remaining slot-scoping debts, then the asymmetry sweep (item 12), then
item 11, then item 10.

Everything above the line is tested; `node tests/run.js` is the whole suite and
`tests/specs/replay.mjs` replays the user's full export and checks the fix spec's six
outcomes together. The replay is rerun after each item below.

---

## Two rules, both learned the hard way

These are not about any one item. They apply to everything below and to anything added
later.

### 1. A suspected live bug until a test proves otherwise

Nine name-only programme lookups were recorded as reads that merely "fall back" to another
slot rather than answer wrongly. That was an assumption, and it was wrong twice in a row:

- `effortMismatchFor` judged one slot's sessions against another slot's prescription and
  wrote the cut to the wrong day.
- `outgrownStuck` suppressed the "you have outgrown this" offer on the slot that really
  was stuck, which is the single case the trigger exists for.

So nothing of this shape is called harmless on inspection. Each is treated as a live bug
until a test of a specific shape says otherwise: **the same movement in two slots at
different loads per day, driven through the real path, asserting that a finding from one
slot can neither read nor change the other.** Only a passing test of that shape may
downgrade a site to display-only. `tests/specs/effslot.mjs` and `tests/specs/outslot.mjs`
are the pattern.

Where an item has known real-world outcomes - a date in the audited export with a verdict
that is known to be right or wrong - those become acceptance tests alongside the synthetic
fixture. A synthetic two-slot case proves the mechanism; the export proves it on the data
that found the bug.

### 2. Every test carries a control that must produce a finding

A reader that returns `null` because its fixture is incomplete is indistinguishable from a
reader that correctly found nothing. This has now hidden a broken test three times:

- `replay.mjs` built no `S.program`, so every slot-scoped reader answered `null` and four
  sections passed while measuring nothing.
- `replay.mjs` left session entries with `reps: ""`, so `progressionFor` returned at
  `if(!range)` for all 1,231 sets - zero verdicts, and "no increase was earned" was a
  statement about a rule that never ran.
- `effslot.mjs` left session entries with no `rpes`, which is what `rpeBandFor` reads off
  the entry, so every effort reading came back `null` including the single-slot control.

So every test of a rule includes a case the rule MUST fire on, in the same run. A section
asserting that something did not happen is not finished until something next to it shows
the rule was awake.

---

## 1-9. Slot-scoping debt  — DONE

`tests/specs/slotall.mjs` fails on any unmarked name-only programme lookup outside a
declared display site, with a pinned count that can only go down. Nine call sites remain,
each currently carrying a `// slot:todo` marker. In the order the scan prints them:

1. `effortMismatchFor`
2. `outgrownOptions`
3. `fadeFixFor`
4. `toohardTarget`
5. `progressionApplied`
6. `prescribedLoadFor`
7. `rebuildFor` (first site)
8. `rebuildFor` (second site)
9. `tmWanted`

A name-only lookup falls through to `DAYS.concat(["finisher"])` and answers about the
first slot holding that name, which is the P0-1 family of bug.

**All nine are converted.** 32 call sites: 28 scoped, 4 declared display-only, none
undeclared, no tracked debt. `slotall.mjs` now asserts the debt is zero rather than
counting down, so it is a ratchet against new ones.

Eight of the nine were live bugs. The ninth, `tmWanted`, was the one whose answer was to
WIDEN rather than scope - the stored max is per exercise, not per slot - which is the
reason they were worth checking one at a time instead of converted as a batch. Two of the
nine also turned up a live bug in unmarked code beside the marked line: the proven-floor
scan in `impossibleLoadCheck` (debt 4) and the by-name stall counter (debt 5, now item
11).

**These were first recorded as reads that "fall back" rather than answer wrongly. That
classification was wrong: debt 1 disproved it and debt 2 confirmed it.** Both were live.
See the two rules above, which came out of them.

## 10. A session's gym, and what should be read in its light — DONE (2026.11.17.20)

Asked for after the Oct 17 session turned out to have been done at a different gym. The
pieces that exist and the pieces that do not:

**Exists**

- A live session records its gym. `S.active.gymId` is set by the pre-workout gym step and
  `checkGymAtStart()`, and carried onto the finished session as `sessObj.gymId` /
  `gymName` (see the finish pipeline).
- Per-gym equipment overrides, under *Kit at &lt;gym&gt;*: dumbbell gap, heaviest dumbbell,
  smallest plate, and the exact plate sizes. Blank means "use my usual", and the usual is
  restored when you train elsewhere.
- `rackMaxSrc()` already prefers the active session's gym, then the gym of the last
  session logged, before the usual kit.
- `lastGymNote()` warns on the Today panel when the last session was somewhere else, by
  name and how long ago.

**Does not exist**

- **The cable stack step has no per-gym override.** `stackStep` is global; the per-gym
  fields are `dbStep`, `dbMax`, `plateStep` and `plates` only. This is the specific gap
  behind the Oct 17 cable loads (92, 112, 132), which sit on neither a 5 nor a 2.5 grid.
- **`loadImpossible(name, w)` judges against the gym you are in now**, not the gym the
  set was performed at. It takes no session, so every historic set is checked against the
  current room.
- **`lastLoggedLoad(name, wid)` filters by slot but not by gym**, so a session at another
  gym does set the starting point for progression and for the plan-drift check at the
  usual one. Same for the readers built on it.
- **A finished session's gym cannot be changed.** There is no gym control in
  `renderSessEditor`, so a session logged without one, or with the wrong one, cannot be
  corrected afterwards.
- **The report does not record the gym.** Across the 72 sessions in the audited export,
  every session's meta line carries Started, Ended, Duration, Quality score, Total working
  volume, Feel, Sleep, Energy and Note - and no gym on any of them. So that history
  carries no gym to read even once the rest of this works.

**Wanted**

A session's loads read in the light of where they were performed: checked against that
gym's kit, and not treated as the starting point for prescriptions at another one.
Cross-gym data may still feed estimates - the same distinction P0-1 draws between what may
inform an estimate and what may set a prescription.

And the gym goes into the report and the CSV export, so that future exports carry it and
an analysis of one can separate sessions by gym. That is a requirement of the item rather
than a nicety: the audited export's own blind spot was that nothing in it said where Oct
17 happened, so no amount of reading it could have found what took four exchanges to
establish by hand.

**Built**

- `stackStep` is a per-gym field, in `GYM_GEAR` and in *Kit at &lt;gym&gt;*, so a stack with
  2.5 lb add-ons and one without are two rooms instead of one global number.
- `sessionGym(sess)` → `{gym, id, name, assumed}`, and `sessionGymLabel(sess)`, which is
  the only thing any screen should print. `kitFor(sess)` is the gym's kit falling back
  field by field to `trainPrefs()`, which is what a gym record means: only what is
  different about this room.
- `loadImpossible(name, w, sess)` judges against that session's kit. Called without a
  session it behaves exactly as it did, because `sessionGym(null)` knows nothing — see
  below.
- `lastLoggedLoad(name, wid, opts)` prefers the gym of `opts.gym`, falls back to any gym
  only where the slot has no history there, and with `opts.detail` says
  `{w, crossGym, gym, date}` so a caller can estimate from a cross-gym load without
  prescribing from it.
- A gym control in the session editor (`sessGymFieldHTML`), saving through
  `setEditSaved()` so retagging rescores the session and rebuilds the stall counters
  against the kit that was actually in the room.
- The gym on the report's session meta line and in two CSV columns — `Gym` and
  `Gym assumed` — carried on the session's own row, because the gym is a fact about the
  afternoon rather than about the movement.
- History prints `sessionGymLabel(s)` instead of the raw `gymName`.

**The judgement call, and how it was settled**

Untagged sessions are read as the home gym and say so. `S.homeGym` is an explicit
setting, starred in the gym list; `seedHomeGym()` is the one and only place allowed to
look at the log, it runs once, and after it has written an answer the log can never move
it again — so training elsewhere for a month cannot quietly relocate you. An untagged
session shows as "&lt;home&gt; (assumed)" in History, the session editor, the report and the
CSV, with `assumed` in its own CSV column so a spreadsheet can filter on it. Retagging in
the editor settles that session and it stops being assumed. Untagged sessions count as
home-gym evidence for progression and for the impossible-load check. A load seen in more
than one session still trusts the log over the kit, as built in P2-11b.

**The trap inside this one, worth remembering**

`sessionGym(null)` must answer "nothing is known", NOT "home". The first version did fall
through to the home gym for a null session, which made `kitFor(null)` the home gym's kit
rather than `trainPrefs()` — so a check made mid-workout at another gym would have been
judged against home. `sessgym.mjs` §2 caught it as a control, not as the assertion it was
aiming at. The assumption is about *a session logged without a gym*; no session at all is
not a session.

Tests: `sessgym.mjs`, seven sections, each with a control that must fire — the same load
at the other gym, the same reader with the home gym taken away, the same question with no
session at all.

## 11. The stall counter is keyed by name — DONE (2026.11.17.18)

Keyed by `stallKey(wid, name)` now. The old counters could not be converted — a number
that conflated two slots cannot be split back into two, because nothing recorded which
sessions contributed — so they are dropped and rebuilt by replaying the log in order.

`rebuildStalls()` clears `S.stalls` and calls `updateStalls()` per session, oldest first,
with the whole history present: exactly the state each session was in when it was
finished. The exclusions therefore come for free rather than being reimplemented — the
injury and illness marks through `sessionNotEvidence()`, the deload holds, the 14-day
layoff reset, and the grace after a plan change. `replay.mjs` asserts the rebuild equals
feeding the sessions in one at a time.

It runs from `runOneTimeSeeds()` rather than `migrate()`: migrate runs while the file is
still being evaluated, and a rebuild there reaches functions whose constants are still in
their temporal dead zone. The rescue backup fell into the same trap; worth remembering
that `migrate()` is not a safe place to call anything that walks the app.

`setEditSaved()` triggers a full rebuild, which answers the question this doc left open:
3ms for 72 sessions, so no debounce. Pinned in `replay.mjs`.

Two related scopings went with it: `priorEntryFor()` gained `sameSlotOnly`, used by the
stall comparison because the other day's session is at a different load by design; and
`exposuresSincePlanChange()` takes a `wid`, because a load change written on Legs A buys
no grace on Legs B. The any-slot fallback remains the default everywhere else, which is
right for "what did I last do on this movement".

`mergeStalls()` drops name-only keys, so a sync from a device on an older build cannot
seed counters in the old shape.

Every path that removes or replaces sessions rebuilds: the version marker, an editor
save, deleting from History, resuming a finished session back to live, and importing or
restoring a backup. The import case is the least obvious and the most necessary - on a
REPLACE the file's counters describe the file's log and would be right, but on a MERGE
the sessions are a union of two devices while the counters came from one of them.

## 12. The write/clear asymmetry sweep - RUN, nothing found (2026.11.17.19)

The heuristic, restated: when two functions set and clear, or write and read, the same
per-exercise state, and one side is slot-scoped while the other is not, the mismatch is
the defect. It found `rebuildFor` / `clearRebuiltEntries`, and `tmWanted`.

**What was swept.** Three passes, because one shape of the bug hides from each:

1. *Subscript keying.* Every `S.<key>[...]` and `<store>()[...]` expression in the file,
   with local key variables resolved to their assignment, grouped per store and checked
   for a store reached by both a slot-aware and a name-only key. 38 stores; no store is
   reached both ways.
2. *Function pairs.* Every function signature, grouped by stem across the set/clear,
   mark/unmark, apply/revert and `...For` prefixes, looking for a pair where one side
   takes a `wid` and the other does not. One candidate, `dropStep(wid, mode)` against
   `step()`, which is a name collision and not a pair.
3. *Two normalisers on one store.* A store written under `nrm(name)` and read under
   `tableKey(name)` is the same defect wearing different clothes, and passes pass 1
   because both look like "name". Every per-exercise store checked for a single key
   function. `rpeSugSkip` is `tableKey` on both sides; `jointOk`, `asymRetired`, `bwEx`,
   `exCompound`, `maxStore`, `tmStore` are `nrm` on both. The ones that try both keys -
   `musclesFor`, `headShares` - are read-only lookups against constant tables, where
   trying both is the point.

**Verdicts on the per-exercise state that is keyed by name, and why each is right.**

| state | keyed by | verdict |
| --- | --- | --- |
| `maxStore`, `tmStore` | name | right. A max is a fact about you and the lift; it does not differ by weekday. Already argued at the `tmWanted` fix. |
| `asymRetired` / `asymRetest` | name | right. The gap between your arms is the same gap whichever day the movement is trained. |
| `bwEx`, `exCompound`, `exMuscleStore` | name | right. All three are classifications of the MOVEMENT. |
| `jointOk` / `S.joint` | name + date | right, and symmetric: `jointSettle()` writes, `jointRecord()` deletes, both `nrm(exName)`. A joint that hurts on a movement hurts on it on any day. |
| `exAliases` | name | right by definition - it is the rename table. |
| `rpeSugSkip` | name | arguable, recorded rather than changed. The ramp is per slot, so "do not suggest a ramp for this" could be per slot. It reads as a preference about the movement, and nobody has reported wanting it twice. Left alone deliberately. |

The per-ENTRY markers the earlier note listed - `rebuild`, `repExt`, `byApp`, `setsCut`,
the `alt` partner - are fields on `S.program[wid][i]`, so they are slot-scoped by
construction. Their only failure mode is a LOOKUP that finds the entry by name without a
slot, which is the P0-1 family and is pinned at zero by `slotall.mjs`.

**Conclusion: no mismatched pair remains.** That is a weaker claim than "there are no
scoping bugs left" and is meant to be: the sweep finds disagreements between two sides of
one piece of state. A store that is consistently wrong on both sides - `S.stalls` before
item 11 - is invisible to it, which is exactly how item 11 was found by reasoning rather
than by this scan. The scans are in this document rather than committed as a spec because
their value is the judgement in the table, which a passing test cannot express.

## 13. Flaky: `logstill.mjs` section 1, exact scroll equality — CLOSED (2026.11.17.20)

**Closed as not reproducible.** Watched from build .13 through .20, which is the whole of
items 11, 12 and 10. It has not failed again in any full-suite run since, including the
296-spec run on .20, and the step-1 experiment the plan below asks for has now been done:
ten standalone runs with four CPU busy-loops saturating the machine, 10/10 pass, and the
reading was EXACTLY equal every time (1600 → 1600), not merely within a tolerance.

So the one recorded drift (1596 → 1599) stays unexplained rather than fixed, and nothing
was changed to make it go away — no tolerance was added, no wait inserted, and the
assertion is still exact equality. That is deliberate: a loosened assertion is how a real
layout shift gets lost. If it returns, this section is the record of what was already
ruled out, and step 2 below is where to start.

The original entry follows, unedited.

**Observed:** one failure in one full-suite run of 289 specs, 2026-11-17, on build
2026.11.17.13:

```
FAIL logstill
     BROKEN AND IT IS STILL THERE AFTER THE TICK  [1596 -> 1599]
```

**Not reproducible in isolation:** 14 consecutive standalone runs passed, plus 2 through
`tests/run.js`. The runner is serial (`spawnSync` per spec), so this is not contention
between specs inside the run; machine load during a long suite is the likeliest trigger.

**What the assertion does:** compares `scrollY` before and after ticking a set for exact
equality. The observed drift is 3px, which is sub-pixel layout settling rather than the
round trip to the top that the spec exists to catch - that failure mode is hundreds of
pixels, and section 2's overlay case and section 3's source scan both passed in the same
run.

**Why it is not just loosened.** Two flakes in this suite have turned out to be real
bugs - the replay's four vacuous sections, and the "wiped session" that was Chromium's
asynchronous localStorage commit - so a tolerance added without understanding costs the
next one. A 3px shift on tick could also be a genuine layout shift that nobody wants,
which is a different bug worth seeing. Before changing anything:

1. Reproduce under load (run the suite with CPU contention, or loop the spec while
   something else is busy) and record whether the drift is always ~3px or sometimes
   larger.
2. Find what moves. If a set row changes height by a few pixels when it gains
   `is-logged`, that is the finding and the CSS is the fix, not the assertion.
3. Only then decide between a small tolerance (with the reason in the commit message, per
   the rule at the top of this doc) and waiting for scroll to settle before reading it.
