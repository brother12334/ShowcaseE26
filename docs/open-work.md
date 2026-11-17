# Open work

The queue, in order. Written down rather than remembered, because the order has been
revised several times and the reasons for it are worth keeping with the items.

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

## 1-9. Slot-scoping debt

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

## 11. The stall counter is keyed by name, not by slot

Found while paying debt 5, by looking at what sits next to the marked line - which is now
the standing practice and has earned its keep three times.

`S.stalls` is keyed by `nrm(name)` alone:

    S.stalls[k] = {n: 0, dates: [sess.date]}      // k = nrm(en.name)

So a movement in two slots shares ONE "sessions with no improvement" counter, and
`updateStalls()` walks each finished session into it whatever day the session was.

**Measured.** Eight interleaved sessions - Legs A improving 7, 8, 9, 10 every time, Legs B
flat at 8 every time, at different loads - leave the counter at `n: 1`, and neither slot
reaches a stall verdict. Legs B is genuinely stalled four sessions running and the Legs A
sessions reset its counter each time. A false negative of exactly the shape debt 2 had:
the rule cannot fire in the one case it exists for.

The reverse arrangement does the same thing to the other slot, and two slots flat at
different loads would count toward one run.

Not fixed with the other debts because it is not a scope argument on a read. `S.stalls` is
persisted state keyed by name in every existing profile, so re-keying it by slot needs a
migration that decides what an existing by-name counter becomes - most defensibly, the
counter is dropped and rebuilt by replaying the log, which `updateStalls()` can already do
in order.

A lesser one in the same area: `priorEntryFor()` prefers an earlier session of the SAME
slot and falls back to any slot when there is none. That fallback is reasonable for a
movement's first session in a new slot and wrong once the slot has history of its own;
worth revisiting with this.
