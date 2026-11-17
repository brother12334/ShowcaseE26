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

## 10. A session's gym, and what should be read in its light

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

What this does NOT do: the rebuild is triggered by the version marker and by an editor
save. A session deleted from History does not trigger one. Worth adding if deletions turn
out to leave counters describing sessions that are gone.

## 12. The write/clear asymmetry sweep

A heuristic that came out of debts 6-8 and is worth running deliberately rather than
stumbling into again.

`rebuildFor()` read a rebuild marker by exercise name while `clearRebuiltEntries()` had
already been converted to the session's own slot. The pair wrote and unwrote the same
per-exercise state with different ideas of what "this exercise" meant, so one of them had
to be wrong - and the mismatch was visible without knowing anything about what a rebuild
does.

So: find every pair of functions that SET and CLEAR, or WRITE and READ, the same
per-exercise or per-slot state, and flag any pair where one side is slot-scoped and the
other is not. A scan of the static kind `slotall.mjs` does cannot see this, because both
sides can be individually defensible; it is the disagreement that is the defect.

Candidate state to walk, each of which is keyed per exercise somewhere: `rebuild`,
`repExt`, `byApp`, `S.stalls`, `S.restEx`, `S.asymRetired` / `asymRetest`, `S.marks`,
`S.lmSuggest`, `S.reversed`, `S.joint`, `exAliases`, `S.maxes` / training maxes, the
ease-off map, and the per-entry `alt` partner.

**Report before fixing.** Each pair is a question about which side is right, and the
answer is not always "scope them both" - `priorEntryFor()`'s any-slot fallback is
deliberate for a movement's first session in a new slot. The sweep produces a list with a
verdict per pair, and fixes follow as their own items.

## 13. Flaky: `logstill.mjs` section 1, exact scroll equality

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
