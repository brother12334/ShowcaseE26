# Open work

The queue, in order. Written down rather than remembered, because the order has been
revised several times and the reasons for it are worth keeping with the items.

Everything above the line is tested; `node tests/run.js` is the whole suite and
`tests/specs/replay.mjs` replays the user's full export and checks the fix spec's six
outcomes together. The replay is rerun after each item below.

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
first slot holding that name, which is the P0-1 family of bug. These nine are reads that
were judged not to prescribe anything; the marker exists so that judgement is recorded
rather than assumed, and each one is to be either scoped to its slot or shown to be
display-only.

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
