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

## 16. Automatic load management — A to G, ALL DONE (2026.11.17.23 to .28)

Asked for on 2026-11-18 with eight acceptance tests, built against the real exported
state (`tests/fixtures/state-2026-11-17.json`, 74 sessions to 2026-11-16). Tests live in
`tests/specs/autoload.mjs`.

**A — identity (2026.11.17.23).** `S.exAliases` had merged two triceps attachments into
one key, and the rename that made it had swept the Push A log under the Push B name.
`splitAttachmentAliases()` undoes both once; six entries relabelled, undoable from
Settings. `planEditSave()` can no longer produce it. Comparing on `tableKey()` alone
cannot work: once the alias is gone the two names are deliberately different keys, so the
repair must compare with the parenthetical stripped.

**B — one load basis.** Verified, not built: already true. With `barMode: "total"` the
logged number IS the total, `entryBarAdd()` is 0 across all 76 Smith sessions, and the
per-gym carriage reaches the rules through item 10's `kitFor()` and `lastLoggedLoad()`.

**C — sync (2026.11.17.24).** `planSyncFor` / `planSyncPlan` / `applyPlanSync`, run at
finish on "auto" BEFORE the raise, because a raise is measured against the load lifted
and the reverse order would overwrite a fresh increase. Two sessions for a drift, one for
a blank, capped and rounded before comparison, never called progression.

**D — increases (2026.11.17.23-24).** The decision reads the LAST working set; the guard
moved across sessions with three routes (2 of 3, a consistent session, or 3+ past the
top). Big overshoots are sized from the set's own e1RM, on a sizing-only RTF cap of 20,
rounded DOWN, checked forwards, allowed past the per-movement cap but measured, said and
bounded at 20%.

**E — decreases (2026.11.17.25).** Two qualifying sessions in a row, set 1 under the
bottom at the prescribed effort, AT THE LOAD PRESCRIBED, same gym, never below a load
done inside the range recently, never more than 10%, and offered rather than applied when
the smallest step the gear makes exceeds that. A note mentioning injury, pain or illness
excludes the session from cuts immediately and asks once; the answer becomes a real
`dayFlags` mark. Rep-range changes are ALWAYS proposals.

**Three things the replay caught that would otherwise have shipped:**

1. Skipping non-qualifying sessions let the cut rule reach six weeks back and cut the
   incline Smith from 95 because two August sessions at 70 came in short. Evidence must
   be at the load being cut: 19 automatic cuts became 4. Found by reading the citation
   the verdict printed, which is why a verdict names its sessions.
2. The same-load guard is right for a cut and wrong for a rep-range proposal. "Is this
   weight too heavy" and "does this range fit me" are different questions.
3. Counting set 1 landing AT the bottom of the range as evidence put a range proposal on
   29 slots. Landing at the bottom on set 1 is double progression working. One to three
   reps SHORT is the pattern; 29 became 8.

**G — built, broken, explained, and built again (2026.11.17.27).**

**G — transparency (2026.11.17.27).** `changesSinceLastTrained(wid)` collects the plan
log since the end of your last session on that day, in two scopes: rows keyed to the day,
and plan-wide rows keyed to no day at all (`PLAN_WIDE_KINDS`: volume targets, rules,
deload, schedule, week, ease, built). The second scope exists because a volume floor, a
deload, the progression setting, a gym's kit and the home gym change what the next
session asks for and are keyed to nothing, so a day-scoped list would never show them. A
dayless row that is NOT one of those kinds is left out rather than guessed about — it is
usually a log repair, which is not news about today.

Shown in two places, per the user's instruction: a panel above Start on the Today card,
where it can still be acted on, and a one-line tap target at the top of a live session
("3 changes since your last Push A") for starting without looking at Today. Seen state is
`S.seenChanges[wid]`, a timestamp per day, so reading Push A cannot hide Legs B. Once
seen neither reappears, and both stay reachable — the one-liner opens the same panel in
a sheet.

Tests: `autoload.mjs` section G, which also controls that a dayless log-repair row is
excluded and that marking one day read leaves another day's unseen.

**And the cause, found afterwards: a CSS class-name collision.** `.chg-row`, `.chg-sub`
and `.chg-why` already existed — they are the change-chip classes on the exercise card,
and `.chg-sub` is the element holding "this session still has 4 — a row you have already
written in is never deleted for you". G reused the same `chg-` prefix, and its `.chg-sub`
rule added `text-transform:uppercase`. `innerText` reflects `text-transform`, so the
sentence rendered as "THIS SESSION STILL HAS 4" and `cutsay`'s case-sensitive
`/still has \d+/` stopped matching. It also silently restyled the real change chips, so
this was a visible regression and not only a test failure.

That explains every symptom: it breaks with no call sites because CSS needs none, nothing
is thrown, and an unrelated path appears to change behaviour. G's classes are now
prefixed `since-`.

**The gap, now closed (test-only; no app release, so the version stays at 2026.11.17.27).** `tests/specs/cssdupe.mjs` cuts the stylesheet at
every banner comment — which is how this file has always separated its features — and
fails when a class defined in one section is also defined in another. It understands
nothing else about CSS, deliberately.

172 classes already crossed a boundary when the guard was written: `.btn`, `.card`,
`.dot` and other genuinely shared furniture, alongside some that are probably accidents
nobody has been bitten by yet. They are grandfathered in
`tests/fixtures/css-shared-classes.json`, which is a SNAPSHOT and not an endorsement —
every new crossing fails, and removing an entry is how to tighten it later. The control
plants the exact bug this exists for: a later section redefining `.chg-sub`.

**What it cannot do, stated plainly.** It is blind to a class used in the HTML but never
styled, to a collision inside one section, and to anything about specificity or cascade.
It catches the one shape that has actually cost a day here.

**The original gap, for the record.** `dupedecl.mjs` catches duplicate top-level JS
declarations and would NOT have caught this: a CSS class defined in two rules is ordinary practice, so
"duplicate class" cannot simply be banned. The narrower rule that would have caught it is
"a new feature must not reuse a class prefix another feature owns", which needs a notion
of ownership the file does not carry. Recorded rather than papered over; if this bites a
third time, the cheap version is a spec that lists every class prefix with more than one
owner.

**A second bug found on the way, unrelated.** `index.html` declared `medianOf`
TWICE, with two different bodies — one filtering non-finite values and returning an
exact median, one doing neither and rounding — and the later won everywhere by
hoisting. `tests/specs/dupedecl.mjs`, written to catch exactly this class of bug, found
it on its first run. With the two split, the entire G block plus both call sites passes
`cutsay` unchanged.

So the clue recorded at the time was right and pointed the wrong way: the breakage really
was independent of G's call sites, because it was independent of G. Inserting 4 KB of new
top-level declarations was enough to disturb whatever fragile arithmetic the duplicate was
feeding, and removing the duplicate made G harmless. The lesson is the one the check now
enforces — a file this size cannot be trusted to tell you when two names collide.


---

### F — built (2026.11.17.28), and two of the six diagnosis findings were wrong

The diagnosis below the line is kept because it is most of why this landed at all. Two of
its six findings did not survive contact with a probe, and saying so is the point of
writing them down in the first place.

**Finding 4 was wrong. There is one table, not two.** `outgrownOptions()` reads
`EX_LIBRARY[hit.key]` and nothing else. The two `shrug:` keys around lines 9765 and 9880
are `EX_LIBRARY.shrug` and `EX_LIBRARY_EXTRA.shrug`, and the second is MERGED INTO the
first at load, along with a third source, `EX_CATALOG`. Nothing competes.

**And Smith Machine Romanian Deadlift was already a rung** — `EX_CATALOG` has carried it
all along, under that long spelling. So step 2 of the plan, "add the right rungs", was
already done before it started. The reason the earlier attempt's added rung "did not
appear" was not that it was in the wrong table: it was that NOTHING appeared.
`exSlotFor("Dumbbell RDL")` answered with the barbell record (Finding 2, which was right),
so `roomNow` was 3, the filter asks for room strictly greater than that, and GEAR_ROOM
tops out at 3. Every option was filtered, including the deadlifts. Measured, not reasoned:

```
slotRDL {key:"hinge", gear:"barbell", name:"Romanian Deadlift"}   roomRDL 3   optRDL []
```

**Finding 5 was half wrong.** Conventional / Sumo / Trap Bar were not evidence of a
missing rung; they were what the ladder returns once `roomNow` drops to 1, ordered by
room alone — and a trap bar deadlift has exactly as much room as a Smith machine RDL, so
the tie fell to table order. The fix is the ORDER, not the rungs: the implement words come
out of both names and a movement that matches wins the tie, and between two that still
tie, the gear the lifter's own last twenty sessions are made of wins. For this lifter,
whose every other leg movement is on a Smith machine, that is what puts the Smith RDL
first and the barbell second.

**What shipped, in the order it was asked for:**

1. **Identity.** `"romanian deadlift":"dumbbell rdl"` is gone from `EX_ALIASES`. The long
   dumbbell spelling IS aliased to the short one, because that is one implement under two
   names, and without it the split just strands `Dumbbell RDL` against a library whose own
   entry is `Dumbbell Romanian Deadlift`. Same for the Smith machine's two spellings. No
   session in the real export is logged as "Romanian Deadlift", so nothing was split apart
   that a user had merged.
2. **Order.** `movementCore()` strips implement words (and only implement words — "seated"
   and "standing" stay, because a seated and a standing calf raise are different
   movements), and `gearUseCounts()` breaks a remaining tie on the kit in use.
3. **Trigger C**, the ceiling read directly rather than through a swallowed raise.
   `atLoadCeiling()` asks whether the next step exists in the building; `beatTopRuns()`
   asks whether the top of the range was beaten in the last two sessions AT THIS LOAD,
   consecutively, with a session that did not beat it ENDING the run rather than being
   skipped. Skipping is the exact mistake Rule E's replay caught. It is inserted after the
   catch-up and before the fall-through hold; every verdict above that line is untouched.
4. **A starting load that means something.** A dumbbell load is stored as ONE HAND and a
   bar, carriage, stack or machine is stored whole, so sizing a Smith machine RDL from "50"
   through e1RM without converting the basis is wrong by more than a factor of two. The
   app had already written that conversion down once — 40% per hand, in
   `startingLoadFor()` — and it is now a named constant used in both places. 50 lb per hand
   for 12 reps sizes to 130 lb on a Smith RDL; the shrug case sizes to 115 lb.
5. **"Not now" means it.** Dismissal is remembered per slot (`S.hardNo`) against the
   number of sessions that have beaten the range, and the offer returns after three more
   — not after a date, so a movement that goes back inside its range simply never gets
   there. The row stays on the grade card under "Turned down", because a grade is a record
   of what the app said and what you decided.

**The replay, on the real export.** The RDL is fixed: `hold → harder`, "Move to Smith
Machine Romanian Deadlift", starting around 130 lb, with the barbell RDL and the
conventional deadlift as alternatives rather than the recommendation.

**The shrug is NOT offered anything, and that is correct.** The user's report was that both
movements say "Hold this load — the rack stops here". The probe says the shrug's verdict
was never that: it was "Need 14-15 on every set at this load". Its last two sessions are
14, 13 against 10-15, so it has not beaten its range — by the user's own trigger ("above
the range for 2 sessions") it should not be offered a swap, and it is not. Its ladder is
nevertheless ready and waiting (Smith, barbell, trap bar, in that order), so the session it
does clear 15 twice, the offer appears. This is in the spec as the control: at the end of
the same rack, with the same options, still inside its range, nothing is offered. Being at
the ceiling is not the trigger; beating the range at the ceiling is.

**Two assertions changed, both with their reason in the commit:** `dbrack`'s "it holds the
load instead" was a proxy for "the card stops asking for a weight that is not in the
building", and the hold was only ever what happened when the library had nothing to offer;
`matrix.txt`'s `hinge|dumbbell` row moves from `Dumbbell Romanian Deadlift` to
`Dumbbell RDL`, because the catalogue merge keeps the CURATED entry's name and the split is
what lets the curated `Dumbbell RDL` survive the merge at all.

---

### F — the diagnosis, written down before it is built

F was attempted, found to be bigger than it looked, and **reverted twice** rather than
shipped. Everything learned is here so the next attempt starts from it rather than from
scratch. Nothing below is in the code.

**The user's two real cases.** Dumbbell RDL (Legs B) and Dumbbell Shrug (Pull A), both
planned at 50 lb, which is exactly `dbMax` at Palma Vista. The RDL's last sessions ran 13,
13, 12 against an 8-12 range; the shrug 14, 13 against 10-15. What they get today is
"Hold this load — the rack stops here", session after session.

**Finding 1 — `EX_ALIASES` merges the barbell and dumbbell RDL.** The built-in table
carries `"romanian deadlift":"dumbbell rdl"`. A barbell loaded to 225 and a pair of 50s
are therefore one movement with one history, one estimated max and one ladder. It is the
same implement-merging mistake Rule A fixed in a user's own aliases — the triceps
attachments — sitting in the app's own table.

**Finding 2 — and that merge is WHY the RDL is stuck.** `exSlotIndex()` builds three
lookups and keeps the FIRST record written for each key (`if(!exact[c]) exact[c] = rec`).
"Romanian Deadlift" comes before "Dumbbell RDL" in the hinge ladder, so with the two
aliased together `exSlotFor("Dumbbell RDL")` answers with the **barbell** record — gear
`barbell`, already the top of its ladder, nothing above it to offer. The app believes the
lifter is holding a barbell, so of course it has nothing heavier to suggest.

**Finding 3 — splitting them strands a third key.** With the barbell merge removed,
`"Dumbbell Romanian Deadlift"` canonicalises to itself rather than to `dumbbell rdl`, so
the long spelling of one implement becomes a separate movement. The fix is to alias the
long spelling to the short one — same implement, unlike the barbell. This was caught by
the F1 test, not by reading the code.

**Finding 4 — there are two libraries keyed alike, and the obvious one is not the one
that matters.** `shrug:` appears at two separate places in `index.html` (around lines
9745 and 9880). A `Smith Machine RDL` rung added to the `EX_LIBRARY.hinge` ladder did not
appear in `outgrownOptions()` output at all, while the options that DID appear
(Conventional, Sumo, Trap Bar Deadlift) are not in that ladder. **So
`outgrownOptions()` is fed from the other table. Identify which, with certainty, before
adding any rung.**

**Finding 5 — what the ladder offers for an RDL is the wrong movement pattern.** With the
split in place the suggestions are Conventional / Sumo / Trap Bar Deadlift. None is a
substitute for a Romanian deadlift. The rungs the user actually wants, and which their
gym has, are **Smith Machine RDL** for the hinge and **Smith Machine Shrug / Cable Shrug**
for the shrug (the shrug ladder already carries these three — Cable, Smith, Trap Bar —
so the shrug needs no new rung, only a rule that lets the ceiling verdict be heard).

**Finding 6 — two specs fail on the split alone, and both are correct to.**

```
FAIL dbrack   BROKEN  it holds the load instead ::
              {"kind":"harder","msg":"Move to Conventional Deadlift", ...}
FAIL phase2   BROKEN  every slot and gear picks exactly what the curated table says ::
              hinge|dumbbell|Dumbbell RDL (112 vs 112)
```

`dbrack` asserts the rack-stops-here hold, which is the stuck behaviour — but its
replacement is a bad suggestion, so the spec is right to complain until the rungs are
fixed. `phase2` pins every slot/gear pair against a curated table, which the split moves.
Neither is a flake; both are the suite doing its job. **This is why step 1 cannot ship on
its own:** removing the alias unlocks a ladder whose rungs are wrong, and the first thing
a user would see is a worse suggestion than the one they have now.

**The order F must land in, as one piece:**

1. Find which table feeds `outgrownOptions()` (Finding 4) and prove it with a probe.
2. Add the right rungs there: Smith Machine RDL above the dumbbell one; confirm the shrug
   already has Cable/Smith/Trap Bar.
3. Split the RDL alias (Findings 1-3), including the long-spelling alias, and reconcile
   `phase2`'s curated expectations and `dbrack`'s assertion — each with its reason in the
   commit message, per the rule at the top of this document.
4. The ceiling rule itself: at rack max AND the top of the range beaten in 2 sessions,
   the harder-variation verdict outranks the plain hold, with a starting load sized from
   the e1RM and rounded on the new movement's own gear.
5. Dismissal memory per slot: once dismissed, do not offer that slot again until the
   situation changes — the user's definition is 3 more sessions above the range.

**Still open: nothing in item 16.** A, B, C, D, E, F and G are all shipped.

**One gap found after F passed (2026.11.17.29), by printing what the card says rather than
reading the code.** The branch that fires on the real export computed the 130 lb starting load, put it
on the verdict object, and then said "Rebuild from 8 reps on it" to the lifter. Trigger C's
own copy had the sentence; the older door did not. Both now go through one
`ceilingStartNote()`, which also names the basis change — "the whole bar or carriage, not
one hand" — because 50 in each hand becoming 130 on a carriage is the one place this
feature could put somebody under a weight they did not expect. Pinned by two assertions, so
the sentence cannot drift away from the number again.

**And the full suite then found a second one, which is why it is run.** `outgrown.mjs`
builds its fixture with NO PLATE SIZES NAMED — the state a first-run device is in — and
`roundLoadable()` returns a figure unchanged when it does not know the grid. The sized
starting load came back as **133.92857142857144 lb**. The fallback is now the one
`startingLoadFor()` already uses for exactly this case, the nearest five in whichever unit
the lifter is in, and the spec asserts both that the number in the sentence is the one the
verdict computed and that it is a number somebody could put on a bar. One assertion in that
spec changed with it: it pinned the words "Rebuild from 8 reps", which was the only answer
the app had to "where do I restart" when it was written; a weight is a better answer to the
same question, and a rep count is not actionable at the rack.

**And the starting load was too brave, which the user caught by reading it (2026.11.17.30).**
130 lb for a Smith machine RDL, off a dumbbell RDL at 50 lb a hand. Two separate mistakes,
each priced in the spec so neither can come back unnoticed:

1. **A strength-equivalence ratio was applied.** `DB_HAND_OF_WHOLE` (40% a hand) answers
   "what barbell load matches this pair of dumbbells for a lifter trained on both" — 125 lb
   for a pair of 50s. A fine answer to a question nobody asked. A pair of 50s is 100 lb,
   arithmetically, and 100 lb is what was being hinged; the extra 25 was a bonus awarded for
   a movement never performed. The ratio stays where it was written, in `startingLoadFor()`,
   and is deliberately not exported into the ceiling rule. The basis now goes through
   `heldInBothHands()`, which the file already had, and which already knows a goblet squat
   and a single-arm row are not pairs.
2. **It sized for reps to failure.** `loadForRepsAt()` was called with no RPE, so the target
   reps were taken as a set at RPE 10 — heavier than the same reps at the RPE the slot asks
   for. The model handed back MORE than the lifter had been lifting while looking
   conservative. It now takes the low end of the slot's own RPE target, capped at 8
   (`START_RPE_MAX`), because a first session on a movement is for finding out where it sits.

Measured contributions on the audited case: dropping the effort target alone accounts for
115.8 vs 107.3; the ratio accounts for the rest of the 131. The rule is now the arithmetic
total, sized for the BOTTOM of the range at that effort, converted into whatever the new
movement stores, and rounded DOWN (`roundLoadableDown()`, new, beside the round-to-nearest
one — on a load nobody has performed, too light costs a set and too heavy costs the
session). **Dumbbell RDL reads 105 lb** and the shrug 100 lb, against 100 lb being lifted.

**And a conventional deadlift is no longer an alternative to a Romanian deadlift.** Sorting
put the same pattern first and left the rest underneath as "or", which says they are
substitutes. Different hip and knee travel, different hamstring length, different job.
Where the ladder has ANY same-pattern option the others are now DROPPED, not demoted; where
it has none — a leg press has no heavier leg press, and a back squat is the honest next rung
— they are all there is and they stay. One assertion of mine changed with it, and it was
wrong for the reason the user gave: it pinned a deadlift appearing among the alternatives,
which was the behaviour and should not have been.

**And `dupedecl`, `cssdupe` and `autoload` are now in `REQUIRED` in `tests/run.js`.** They
were not, which meant a clone missing them would have run 295 specs and said so cheerfully.
The runner's count, for the record: 298 specs in `tests/specs` plus `tests/share-worker.mjs`,
run last, which is where "299 specs passed" comes from.

---

## 15. Plan patches — SHIPPED (2026.11.17.31)

Asked for in full; the spec is in `docs/plan-patches-spec.md`, the format in
`docs/patch-format.md`, the tests in `tests/specs/patch.mjs` (seventeen sections).

**The preview IS the apply.** The spec asked that the preview match the result, and the
only way to mean that is to not have two implementations. A dry run swaps `S` for a deep
copy, runs the ops exactly as an apply would, collects what each one changed by READING the
state it just changed rather than predicting it, and puts the real `S` back. Asserted both
ways: the dry run's rows and a real run's rows are byte-identical, and the whole state is
unchanged after a preview — 847,719 bytes compared, not a field list.

**The journal, not nineteen hand-written inverses.** Before the ops run every top-level key
of `S` is serialised; after, the same again; what differs is the journal. `program` is
indexed per DAY, `sessions` per SESSION ID, `gyms` per GYM ID — so a patch that changed
Legs A is not in conflict because Push B was edited afterwards, and a patch that never
touched sessions can be undone with any number logged since, because those paths are not in
its journal. Sessions are indexed by id rather than position because a session logged after
the patch appends and would shift every index after it.

No op declares an inverse. An op that forgot to would be silent data loss, and nineteen
hand-written inverses is nineteen chances to forget; the journal is computed by diffing, so
an op cannot escape it — including one added years from now.

**Two things the journal got wrong first, both caught by measurement.** It held
`storageAsked` and `storagePersisted`, which the SNAPSHOT WRITE had caused by touching
localStorage — undo would have written them back. The "before" index is now taken after the
snapshot, and a `PATCH_VOLATILE` list keeps save stamps and sync pointers out regardless.
And `patchRestoreCost()` compared each session's `finishedAt` against the patch's timestamp,
which named a session logged BEFORE the patch because its `finishedAt` was an hour ahead. It
now opens the snapshot and compares session ids — exact, and worth the wait on a button
that destroys data.

**"Byte for byte", stated honestly.** After apply-then-undo every path the patch touched is
identical again. Three keys are not, and none is the patch's doing: `savedAt` is a
timestamp, `planLog` and `patchLog` have gained the rows that record the patch and its undo
(recording an undo is the point), and `S.stalls` is derived — a bare `rebuildStalls()`
moves it on this fixture with no patch involved, which the spec measures at the top before
any patch exists rather than asserting away.

**Storage, measured.** The real export is 848,557 bytes; ten full snapshots is 8.5 MB
against a ~5 MB localStorage. `CompressionStream('gzip')` takes it to 114,453 bytes, 153,607
once base64'd — the number the spec actually observes. Snapshots live under a byte budget
rather than a fixed count, and a row whose snapshot has aged out says "reverse only" instead
of claiming something it cannot do. Rolling that row back is refused rather than half done.

**What a patch cannot address at all.** The spec walks all 76 fields of all 19 ops and
asserts none names an account, key, token, or sync, cloud or share setting. Not "refused if
you try" — not addressable.

**The reference an AI reads is generated from the checker's own table**, so it cannot drift
from what the app accepts; a control plants an op in the table and asserts it appears in the
reference.

**Two bugs only the real screen could find.** `patchWire()` was never called from the
settings wiring: the tile opened, the box took the paste, and Preview did nothing, because
nothing had ever bound it — every function was fine, so no function-level test could have
caught it. And a screenshot showed the Push A row crushing the exercise name into three
lines while the move text held one line; the name now keeps half the row. Section 17 drives
the real screen end to end for exactly this reason.

**The stylesheet guard earned its keep immediately.** The first draft styled `.pt-bad
.set-name` — a descendant selector is still a definition, and `.set-name` belongs to the
settings card. Caught on the first run, before the feature shipped.

**Still open:** nothing in item 15.

---

---

## 18. A stall counter stranded by a rename — FIXED (2026.11.17.32)

Found by the user reading a line in item 15's spec: `S.stalls` moved on a bare
`rebuildStalls()`, and since item 11 the stored counters should always equal a fresh
rebuild. The question asked was whether the fixture simply predates item 11's migration.
It does not.

**What was measured, before anything was changed.** The fixture is already in item 11's V2
shape (`arms|incline dumbbell curl`, `stallsV2: 2`); `migrate()` changes `S.stalls` not at
all; a rebuild is idempotent — rebuild twice, byte-identical. So nothing is time-dependent
and nothing is stale-schema. Exactly one key differed:

```
pushA|overhead cable tricep extension:       undefined -> {n:0, dates:["2026-11-11"]}
pushA|overhead cable tricep extension v-bar: {n:0, ...} -> undefined
```

**The cause.** The export's `attachSplitV1` is unset, so Rule A's attachment split runs at
first render. While the alias was live, `nrm("Overhead Cable Triceps Extension")`
canonicalised to the V-bar name, and that is what the counter was stored under. Rule A
removes the alias, the entry canonicalises to its own name again, and the stored key now
points at a movement Push A does not have. Rule A relabels the log and rebuilds nothing.

**Blast radius, swept rather than assumed.** Every top-level object was searched for a key
built from the pre-split name: two hits, both in `stalls`, and one of them (`pushB`) is
legitimately still the V-bar. No other stored table carries it. On this export the damage
is nil because the counter was `n:0` — a slot at `n:2` would have silently started again
from zero and the stall protocol would not have fired when it should.

**The general shape, which is why the fix is a hook and not a line.** `nrm()` is
`canonEx()`, which reads the alias table, so anything that edits an alias changes what every
name in the app canonicalises to. Computed state is fine; STORED state keyed by that answer
is, from that instant, filed under a name that no longer exists. Six paths can do it: the
attachment split, its undo, the program editor's rename, a sync that merges a remote alias
table, and the plan patch's `slot.rename` and history-keeping `slot.replace`. **The last two
would have reintroduced this exact bug the day item 15 shipped.**

`exerciseKeysChanged(why)` re-points `USER_ALIASES`, invalidates the canon cache and
`_EX_SLOT_IX` — which is built from `EX_LIBRARY` through `canonEx` and cached, and had to be
nulled by hand to make Rule F's control honest — and rebuilds the counters. Anything stored
and name-derived added later belongs in it, not in six call sites.

**And the devices that already ran the split.** Rebuilding inside
`splitAttachmentAliases()` reaches every install from here on and none of the ones where it
has already happened: their flag is set, so it never runs again. `S.stallKeyFixV1` rebuilds
once for everybody. A rebuild derives from the log, so it is safe on installs that were
never affected.

**`tests/specs/exkey.mjs` checks the INVARIANT, not the hook** — stored `S.stalls` equals a
fresh rebuild — after a real boot, after the editor's rename, after `undoAttachmentSplit()`,
after a patch rename, after a history-keeping swap, and after undoing such a patch. Section
3 finds whatever slot carries the highest count in the CURRENT programme (the first draft
picked the global maximum, which sits on a retired split, and skipped itself), requires
`n >= 2`, renames it, and asserts the count survives under the new key. Section 4 performs a
rename with the hook bypassed and asserts the invariant catches it.

**Two assertions in `patch.mjs` changed with it, and the correction is the good kind.** It
asserted that a bare `rebuildStalls()` MOVES `S.stalls` — true at the time, and the honest
explanation for `stalls` appearing in the post-undo diff. The expectation inverts: after a
boot the counters already equal a rebuild, so the allowed-difference list loses a member and
is now exactly `savedAt`, `planLog`, `patchLog` — the save stamp and the two histories that
exist to record the patch and its undo.

---

---

## 27. The block hold swallowed settings, five times — FIXED STRUCTURALLY (2026.11.17.53)

A block already under way finishes on the numbers it started on, so a change to the volume
model cannot move a target somebody is three weeks into chasing. Good rule. It was written
as a list: the hold froze the **finished** figure and named the settings allowed through.

Anything not named was swallowed, and the failure mode is the worst kind — the setting
wrote itself, logged itself, re-rendered the screen, and moved nothing. It looked exactly
like a control that worked.

Five were found, one at a time, each fixed on its own:

| Control | Shipped as |
|---|---|
| The scale dial, Settings › Volume targets | `.50` |
| The training goal, Settings › Your plan | `.52` |
| Where the figures come from | `.52` |
| Your training age, the question asked once | `.53` |
| — and the next one would have looked the same | |

### The inversion

`adjustedLandmarks` now has one line in it that says where the app's own estimate ends.
Above it: the published figures, experience, and everything read off the log — frequency,
intensity, exercise mix, recovery, the window, the learned calibration. Below it:
**everything that is yours** — the goal, the scale, any landmark you set by hand.

The hold freezes the figure at that line and nothing else. A setting below the line moves
your targets because of where it is, not because somebody remembered to list it. There is
nothing to release, so `releaseVolHold()` is gone along with its three call sites, and the
block keeps the protection it was given instead of losing it to the first setting tapped.

Two cases do not fit the simple split, and both are handled rather than ignored:

- **Where the figures come from** is a user-facing switch over a model-derived figure. One
  snapshot could only serve one answer, so a hold stores **both** estimates — with your
  logged response and without — and `volHoldFor` hands back whichever is being asked for.
- **Your training age** is an input the estimate is computed *from*, not a factor applied
  on top, so there is nothing of it left below the line to pass through. Releasing the hold
  would lose the block's protection; the honest repair is narrower, and `resnapVolHold()`
  re-freezes the corrected estimate. The block keeps its hold and gets the right numbers.

`lmholds.mjs` is the half that keeps this true: it enumerates every user-facing setting that
can move a landmark and requires each one to move it **during** a hold, with the control
that the hold must genuinely be in force and genuinely be what the rows are showing first.
A sixth of these cannot be added without being listed there.

### One figure changed, deliberately

A v1 hold is not read (it stored the finished figure, so re-reading it as a model figure
would apply the goal and the scale twice) and `migrate()` clears it. A block running across
the upgrade goes back onto the live estimate — the same thing `.50` and `.52` already did.

Moving the goal below the model line also moved **MRV, on non-default goals only**: 25 of
228 muscle/goal/scale combinations on the fixture, by up to 3.1 sets. Measured against the
`.52` build rather than reasoned about, after an arithmetic reconstruction gave an answer
that turned out to be wrong.

The cause is the band floor `if(mrv < mav + 1) mrv = mav + 1`. On `lean` the goal compresses
the ceiling harder than the target (×0.72 against ×0.85) — deliberately, you recover less in
a deficit. Under the old order that compression made the band degenerate, the floor then
**re-widened** it, and the learned calibration multiplied the artificial widening by 1.30.
Applied to the model's own band instead, the floor does what its comment says it is for, and
the goal compresses afterwards. The final `Math.max(mrv, mav + 1)` still guarantees a real
band. MEV and MAV are unchanged everywhere; `muscle`, the default goal, is unchanged
everywhere because `GOAL_SCALE` is all 1.00 for it.

---

## 26. `smallestPlate()` ignored the gym you are standing in — PART 1 DONE (2026.11.17.56)

`kitFor(sess)` has merged a gym's own gear over the global settings since gyms existed,
and **nothing in the engine ever called it.** `smallestPlate()`, `loadStepFor()` and
`smithWeight()` each read `trainPrefs()` directly, so a gym's plates, its plate step and
its Smith carriage were stored, displayed on "Where you train", and ignored the moment a
weight was suggested.

### What it cost, measured on the real export

| gym | sessions | differs from the global profile |
|---|---|---|
| Palma Vista (home) | 37 | nothing |
| Lotus | 1 | Smith carriage **35 lb**, not 25 |
| Uptown | 1 | Smith carriage **35 lb**, not 25 |
| untagged | 35 | — assumed home, which matches global |

Not the plates: all three gyms list the same ones. **The carriage.** Every Smith
prescription away from home was out by 10 lb, in the direction of under-prescribing.

### Fixed at the accessors, not the call sites

Some forty places compute a load and they all go through five functions, so those five
moved and the callers did not. `kitNow(sess)` resolves the kit in force, defaulting to
the session you are in:

    the session's own gym  →  the home gym  →  the global profile

`KIT_NO_SESSION` is what "no session at all" resolves to — an untagged session, which
`sessionGym()` already assumes is home (item 10). Passing `null` explicitly still means
"nothing is known" and stays exactly global, which is `kitFor`'s own long-standing
contract.

Four more global reads were found by the scan rather than by reading: `exNameHTML` (where
`smithWeight()` was already gym-aware and the barbell chip beside it was not, so the two
halves of one sentence could disagree), `handLoadSay`, `roundLoadableOn` and
`plateBreakdown` — the last being the line that tells you which plates to put on, which
has to be the tree in front of you or it is worse than nothing.

### The boundary

Part 1 changed **what the app prescribes**. It did not change what any existing rewrite
does to sets already logged: `logFixConvert` and `barModeConvertPlan` are pinned to
`implementWeight(name, null)` so they stay byte-for-byte what they were. Whether a past
set assumed one carriage or another depends on how it was typed, which the app cannot
know — that is Part 2, one session at a time, confirmed.

`rackMaxSrc` was left alone: it is already gym-aware, with its own chain (active gym →
last gym trained at → global) argued where it is written.

### The consequence worth knowing about

The plate picker on "Where you train" is the **global** list. A gym that has named its own
plates now follows its own list, so the global picker no longer moves it. On this export
every gym has named its own, so that picker reaches none of them. `platestep.mjs` §4 and
§4b hold both halves. The screen does not yet say which list you are editing — that is a
UI job, not done here.

### Guards

- `kitscan.mjs` — a source scan that fails if anything outside `kitFor` reads
  `smithWeight`, `barWeight`, `plateStep`, `plates`, `dbStep`, `dbMax` or `stackStep` off
  `trainPrefs()`, directly or through a local alias. It caught all four of the above. Its
  own control proves the pattern matches a real read and that its function attribution
  works, because it first blamed every line in `kitFor` on `pick`, an inner helper.
- `gymkit.mjs` — the behaviour: the same Smith movement at two gyms in one run gets two
  carriages; a gym with no kit falls back to home and not to zero; and a 50-prescription
  sweep against the previous build changes **only** Lotus and Uptown, and only on Smith
  work.

## 26a. The plate picker edited the global list and looked like it edited a gym — FIXED (2026.11.17.57)

Item 26 taught the engine to read the gym you are standing in. The picker on "Where you
train" went on writing the GLOBAL list, so on a profile where every gym has named its own
plates — the normal case once anybody has used the per-gym editor, and the case on the
real export — un-ticking a plate there moved nothing the engine read.

The kit section is now about one named gym, with a chooser above it. A gym with no kit of
its own shows what it inherits, marked as inherited, and keeps its own from the first
change. The general list is folded underneath, labelled as what a gym falls back to, which
is the only thing it still is.

**The per-gym sheet is gone.** It edited the same seven numbers from a second place. The
equipment button on a gym row selects that gym in the section instead.

Two things the guards caught that reading would not have:

- `stepChoiceHTML` emits a fixed element id and keys its "Other" flag off the setting's
  name. Drawn twice on one screen — once for the gym, once for the fallback — the two
  collided. It takes a scope now.
- Removing the sheet took `const PLATE_PICK` with it, because the comment block the
  removal was anchored on sat above the constant rather than below it. The screen threw on
  render. The lesson is to assert what must SURVIVE a deletion, not only what must go.

**Wording note.** The inherited line says "from your usual kit", not "from home". For a
tagged session the chain is this gym, then the global profile; home only stands in when
there is no session at all. "Inherited from home" would be a plausible-sounding lie on any
gym that is not home, and `gympick.mjs` §4 asserts the screen never says it.

## 26b. Past Smith sets — NOTHING TO REPAIR, AND ONE PATH CLOSED (2026.11.17.59)

Part 2 was going to walk the past Smith sets logged at a gym whose carriage differs from
the one in force at the time, and offer to correct each: Accept or Skip per session,
undoable, with the dependent state rebuilt after. Measuring the log before building it
showed there is nothing to correct.

### Why there is nothing

`barMode` is **"bar + plates"**. Under it the number you type IS the whole load,
`barAddendFor()` returns zero, and the app adds nothing to what you wrote. The stamp is
only written when the addend is non-zero, so **no entry in the log carries a `barAdd`** —
checked, all 74 sessions. No stored figure was ever touched by the carriage setting.

What the wrong carriage did affect — warm-up rungs, the plate line, the impossible-load
check, every future prescription — is computed live and was fixed in Part 1. `en.warm`
stores only the *kind* of ramp ("full"/"light"), not weights, so nothing derived was
frozen into the log either.

### A number I got wrong, and the user acted on

I reported the scope as "2 sessions (1 at Lotus, 1 at Uptown)". That was sessions **at**
those gyms. Sessions **with Smith work** away from home is **one**: Lotus, 2026-10-14,
Smith Machine Shoulder Press, 75/75/75. Uptown's single session is pulldowns, rows and
curls — no Smith work at all.

### The one path that could still have caused it, which Part 1 left open

Switching to "plates only" subtracts a carriage from every Smith set and stamps what it
took off. **Part 1 pinned that conversion to the global profile on purpose**, on the
grounds that rewriting logged sets was Part 2's business. That pin was the bug: one press
would have taken 25 off the Lotus set, writing **50 where the plates were 40** and
stamping 25 behind it — manufacturing, in a single action, the exact wrong-carriage data
the migration was meant to repair.

`barModeConvertPlan` now reads the gym each session was performed at. The other direction
is unchanged and always was right: it adds back the stamp, which records what the lift was
actually done under rather than what any setting says now. Switching out and back still
returns every figure exactly.

`smithmode.mjs` holds all of it, including the controls that make the "nothing to repair"
claim mean something: there IS a Smith set logged away from home, at a gym whose carriage
differs, and its stored figure is untouched by either.

### Not built, by decision — a guard instead

The Accept/Skip migration was dropped: it would find nothing on this profile, and would
only have something to find on a log written in **"plates only"**, where `barAdd` is
stamped per entry. This one has never been in that mode.

`barstamp.mjs` stands in its place. It watches for the one state Part 1 could have created
and Part 2 closed: an entry stamped with the **global** carriage while the gym that
session was performed at has its own, different one.

The signature is deliberately narrow. "The stamp disagrees with the gym" is the wrong
test — a stamp is meant to be authoritative, so a stamp that differs from what the gym
says today is usually right and the gym's figure is what changed (you remeasured the
carriage). §3 plants exactly that case and requires it **not** to be flagged. §1 plants
the real bug and requires it to be caught. §4 drives a real mode switch on the shipping
build and requires the detector to object to nothing — which is the end of it: the code
path can no longer produce the state.

## 26c. Comments carry literal `\u2014` escape text — OPEN, cosmetic

About 1013 occurrences of `\u2014` / `\u2019` across the file. Inside a string literal
that is correct and produces the character; inside a `/* comment */` it is read by a
person as gibberish. Long-standing, and this session added some. Not fixed here: the
distinction between the two cases has to be got right or a mass edit breaks strings, and
a 1000-line diff for a comment typo is not reviewable. Worth a careful scripted pass that
only touches comment bodies.



`kitFor(sess)` merges a gym's own `plateStep` over the global one, and the gym kit editor
lets you record each gym's `plates` list. **Neither reaches the load engine.**
`smallestPlate()` reads `trainPrefs()` only, and `loadStepFor()` calls it with no session
and no gym. So a gym's plate list and its plate step are both stored, both displayed on the
"Where you train" screen, and both ignored when a weight is suggested — training at Lotus
Gym gets Palma Vista's grid.

Not fixed with item 25 on purpose: making the engine gym-aware changes the rounding at
every gym that is not your usual one, which is a real behaviour change beyond the exception
granted for the derivation. Needs a decision, then a spec that prescribes at two gyms with
different plates in the same run.

## 25. The bar's jump is derived from the plates you own — DONE (2026.11.17.43)

**Asked for as:** "Plate step: derive it from owned plates. Smallest bar jump = 2 × the
smallest plate owned, shown read-only. Migration: where my stored plateStep disagrees with
my plates, show me once what changes and why, per gym, before switching. Same logic for the
Smith machine." An approved exception to the redesign's no-behaviour-changes rule.

### What was actually wrong, measured first

`smallestPlate()` read `if(p.plateStep > 0) return p.plateStep;` **before** looking at the
plate list, so a separate number overrode the plates, and the two could disagree with
nothing reconciling them. Worse, the asymmetry: `plateStep` had an editor and the **global
plate list had none** — only each gym's list could be changed, while the global one decided
every suggested load. The field somebody could change was the one that could be wrong.

**The engine was already doing the right thing for this export, and the screen was lying
about it.** Probed against the Nov 17 fixture before any change: `prefs.plateStep` is
`null`, `prefs.plates` is `[45, 35, 25, 10, 5, 2.5]`, so `smallestPlate()` already fell
through to 2.5 and `loadStepFor()` already returned **5 lb for a barbell and 5 lb for a
Smith** — they share one branch, so "same logic for the Smith" needed no separate work, only
a spec to pin it. Meanwhile the Settings screen said *"Not set, so it suggests exact numbers
— which can mean a jump your gym can't make"*, which was false, and `barWeightPickHTML`
offered *"Set that now"* for a value already derived.

### The change

- `smallestPlate()` takes the plate list first; `plateStep` survives as a **fallback** for
  somebody who named a step and never named plates, whose answer would otherwise be discarded.
- The global plate list **gets an editor at last** (`data-prefpl`), and is what you change.
- The jump is shown and not typeable: *"Smallest jump: **5 lb**, a pair of 2.5s."*
- Both untrue sentences replaced with the derived figure.

### The reconciliation reports nothing for this export, and that is the point

`plateDeriveScan()` compares each stored `plateStep` against the plates recorded beside it,
for the usual kit and for every gym. On the real export **nothing disagrees** — Palma Vista
has no step and 2.5s, Lotus has 2.5 and 2.5s, Uptown has neither — so Today stays silent. A
prompt about a change that is not a change is how people learn to dismiss prompts unread.

The spec's control plants a genuine disagreement (usual kit says 10, Lotus says 25, both
own 2.5s) and requires the card to appear, name both rooms, and give both jumps.

**Spec:** `tests/specs/platestep.mjs`, 30 assertions in 6 sections.

## 24. "The research said 429" — FIXED (2026.11.17.41)

**Reported as `The reaserch said "429"`.** Item 21 fixed the cause of the asking; this is the
asking itself, and the message about it.

### What 429 was

It is the Worker's own rate limiter (`proxy/research-worker.js`, `rateOk`), not Cloudflare's.
`RATE_PER_MIN = 60`, counted on a one-in-ten sample against a threshold of
`ceil(60 / 10) = 6`, keyed `rl:<ip>:<minute>`.

**Measured, not assumed:** 80 requests to the live Worker in about thirty seconds returned
`404` eighty times and never once `429`. The limiter is looser in practice than on paper,
because `env.RESEARCH.get(k)` immediately after `put(k)` is a KV read-after-write and KV is
eventually consistent, so the counter it reads back is usually still the old one. Tripping it
therefore takes a genuinely large burst — which is what makes the app-side finding below the
answer rather than a guess.

### Why the app was bursting

The only thing that stopped `researchFetchFeed()` running again was a **successfully written
feed cache** — and that cache is disposable by design. It is in the storage budget and
`storageDisposable` is allowed to drop it. `bindResearch()` runs after *every* render, and
the research screen re-renders on every keystroke in the search box and every filter tap.

So on a device short of room the loop was: render, cache missing, `stale` true, fetch 752 KB,
write the cache, pruner takes it again, render, fetch again. Item 21 removed one reason the
pruner chose that cache first. It did not remove the structural fault, which is that **the
brake lived inside the thing it was braking.**

### The fix

1. **The brake is a separate key, `e26.research.try.v1`.** `storageCategoryOf` files any
   `e26.` key that is not the feed cache as protected, so the pruner cannot take the brake
   off while leaving the thing it brakes. It holds `{at, fails, status, until}` — about sixty
   bytes — and it is on disk rather than in a variable because the failure mode is somebody
   reloading the page, and a variable is gone by then.
2. **Backoff: 2 min, 8 min, 32 min, 2 h, 6 h,** capped, and `max(floor, Retry-After)` so the
   wait is never shorter than the service asked for. Offline is exempt: the brake there is
   the radio, and somebody walking back into signal should not be told to wait.
3. **An explicit tap bypasses it** (`researchFetchFeed({force: true})`). A person deciding is
   not a flood, and a screen that refuses the one button on it is a screen that gets tapped
   twenty times.
4. **`since` is passed at last.** The Worker has supported it all along (`addedAt >= since`)
   and nothing ever sent it, so every fetch was the whole library. Measured against the live
   service: **752 KB for everything, 140 KB for thirty days, 32 bytes for a day with nothing
   new.** The overlap is deliberately a full `RESEARCH_FRESH_MS` back, because the filter is
   `>=` and the device's clock is not the server's; past `RESEARCH_STALE_MS` it takes the lot,
   which is the first use that constant has ever had. The existing merge already keeps every
   held paper, which is what made this safe to turn on.

### And the message was wrong

`RESEARCH_ERROR` was one free-text string under one headline, `"Couldn't reach the research
service"` — printed over a 429, which is the service answering clearly and on time. That
sends somebody looking for an outage that is not there. There is now a `RESEARCH_ERROR_KIND`
of `offline` / `busy` / `server` / `refused` / `net`, and four screens instead of one. A
reload that clears the in-session message but not the on-disk brake now draws "Waiting before
asking again" rather than "No papers yet — tap below to look now", which was a lie about the
one thing being declined.

### Worker-side, and it needs a deploy

`proxy/research-worker.js` now sends `retry-after` on the 429 (seconds left in the counter's
minute) **and names it in `access-control-expose-headers`** — without which
`res.headers.get("retry-after")` reads `null` cross-origin however carefully the header is
set, because Retry-After is not one of the seven CORS-safelisted response headers. That was
nearly a silent no-op.

**Not yet deployed.** `npx wrangler deploy --config wrangler.research.toml`. The app works
either way: absent the header it uses its own floor.

### Still open

The limiter's sampled counter is a lottery on top of an eventually-consistent read, so it
both under-counts ordinary use and could in principle over-count a burst. It is not worth
changing while the client no longer bursts, but it is written down here.

**Spec:** `tests/specs/res429.mjs`, 36 assertions in 8 sections. Section 3's control is the
load-bearing one: "no more fetches happened" is worthless alone, so the brake is cleared and
the same forty renders are run again, and a fetch must appear.

## 23. Export raw data, in one place — DONE (2026.11.17.41)

**Asked for as "remove all the previously made export raw data buttons in all the pages make
it only in settings".**

Removed from the Program tab, the Research tab, and both branches of the set-aside records
card. Program keeps its *normal* export, which is not what was asked to be removed.

**Kept, deliberately, and said so at the time:** the crashed-tab panel (`RESCUE_BTNS`), the
screen that could not be drawn at all (`rescueBareHTML`), and the failed-save modal
(`#sfExport`). The Program help text argued the raw export was on a page *because* "Settings
is one of the screens that can go down" — which is true, and is exactly what those three
cover. What moved is the everyday copy; the rescue did not.

That paragraph also carried the only statement that GitHub sync tokens are left out of the
file and the account key is in it. It has been moved to the Storage screen's own help text
rather than deleted with the button it described.

## 22. Settings > Storage — SHIPPED (2026.11.17.40)

Asked for as item 1 of the storage work and deliberately deferred behind the data-loss fix.

**Two rules shape the whole screen.** The export is at the top, before anything else,
because every other control on it removes something — a person about to free space should
be offered the file first, not after discovering which button was the wrong one. And
nothing protected is deletable from here AT ALL: not disabled, not behind a confirmation,
not present. Sessions, plan, settings, gyms, volume landmarks, plan history and account are
listed, because an honest answer to "what is taking the room" has to include them, and that
is all they are.

**The breakdown is a partition of the same keys the total is summed from**, so the spec can
assert they are equal rather than close. That assertion failed on its first run by 110
bytes: `storageSizeOf()` returned the length of a key's own NAME for a key that does not
exist, and the breakdown asks after a `.why` companion for every backup. A key that is not
there costs nothing now, which also removed a `< 64` fudge from an earlier assertion.

**Freeing a patch snapshot here is the same function as freeing it from the patch screen** —
`patchFreeSnap()`, through `storageFreeKey()` — so the history row is updated identically
and the undo keeps working. Two doors, one behaviour, asserted from this side as well.

**The 80% warning now carries somewhere to go.** `toast()` gained an optional `go`, called
after the dismissal it already did; the storage warning uses it to open this screen. It is
the only caller, and a warning about a screen should be able to open it.

Tests: `storage.mjs` section 7 — the breakdown adds up to the total, your training data is
listed and has no deletable item, no delete button on the screen names a protected key, the
export appears before the first delete control in the markup, freeing a snapshot leaves the
patch undoable, and the usage figure moves as soon as something is freed.

**Still open from the storage work:** IndexedDB, which has far more room than
localStorage's ~5 MB.

---

## 21. Research stopped working, and it was the storage fix — FIXED (2026.11.17.39)

**Reported as "research is no longer working, it says couldn't reach the research service".**

**The service was fine.** The Worker answers `http=200` with 752 KB of papers, and its CORS
header is correct for the Pages origin — checked from four different origins, and it returns
`access-control-allow-origin: https://brother12334.github.io` for all of them, which is right
for the real one.

**The cause was 2026.11.17.35, and it was mine.** `storageDisposable()` ordered everything by
AGE alone. A cache carries no timestamp, so it read as age 0 — always the oldest thing on the
device. The research feed is the better part of a megabyte of it, so it was always the first
thing chosen, and **writing a single rescue backup evicted the whole research library**.
Measured rather than deduced: a probe wrote a real 400-paper feed, took two backups, and
found the cache already gone.

That cache is the only offline copy of the papers somebody has saved or opened. Losing it is
not the same as losing a backup of a repair that already went fine.

**Disposable copies now carry a rank** — the order of sacrifice, lowest first: rescue backups
(0), patch snapshots (1), logs and queues (2), the research library (3). Age orders within a
rank, and the feed stamps itself so it can be ordered among its own kind. It is still freed
when the device genuinely runs out, but only after everything else has gone.

`tests/specs/storage.mjs` section 6 pins it: 300 papers in, two backups and a patch applied,
300 papers still there; the order of sacrifice printed; and two controls — the cache is the
LAST thing freed when space is genuinely needed, and it IS eventually freed rather than
protected for ever.

**What is still unexplained: the error message itself.** A cache that has been evicted leaves
the Research tab empty, not erroring. The screen prints the specific reason under the
heading, so the second line on the device names the actual cause — a status code, "Failed to
fetch", or "sent something unreadable" — and that is the next thing to read. Recorded as
open rather than closed by a fix that explains something else.

---

## 20. The opening side, and a summary that was silent about the workout — FIXED (2026.11.17.36)

**The opening side.** `planEntry()` had P1-7's rule written into it: a pair opens on the
left, or on whichever side the slot names. That was deliberate and documented, and it took
no account of which side is WEAKER. The hold-to-weaker protocol caps the stronger side at
the reps the weaker one did IN THIS SESSION, so the weaker side has to go first or the
first pair has nothing to cap against and the protocol starts working from the second set.

`openingSideFor(e)` is the rule in one place: the slot's own if it names one, then the
established weaker side while a balance check has one, then the left. A movement swapped in
mid-session goes through the same function — `applySwapSides()` used `startSideFor()`, which
ALTERNATES, so a swapped-in movement could open on the right beside planned pairs opening
on the left. `startSideFor()` still answers for a legacy alternating entry, where each side
really is its own set and rotating the opener is right.

**The fixture could not have proved this.** On it, the weaker side is the left on all three
live checks, so the rule and the old default agree and every assertion would pass without
the rule existing. The spec forces `sideStats()` to report a weaker right and asserts the
pair opens R, that a slot's own choice still beats it, and that with neither it is the left.

**A consequence worth stating:** `startSideFlip` — the "Which side should go first?"
question — now governs only legacy alternating entries. It is still asked at onboarding.
Reworded or removed is a decision for the user, recorded rather than taken.

**And the summary was silent about the workout.** Three slots prescribe one more set than
their line says: the extra half-set a live balance check gives the side that is behind. The
summary said 3 and stopped — right about the plan, silent about what the session would ask
for, and a patch written against it would have been written against a plan that does not
exist. Those lines now read `+1 set for the weaker side (L), so 4 in the session`, and every
per-side line states which side it opens on.

**`tests/specs/summary.mjs`** parses the summary back out of the text that reaches the
clipboard — not out of the structure that built it, because a summary that is right in
memory and wrong on the clipboard is wrong — and compares every slot on every day against
what `startWorkout()` builds: 38 slots, sets, reps and loads. Its own first run failed on
all 38 at once, which is what a parse bug looks like next to a real one: the rep-range regex
was swallowing the trailing comma.

**A standing correction to how this document and this session talk.** Everything described
as "your plan" in the plan-patch work was read from `tests/fixtures/state-2026-11-17.json`.
The user's device has moved on — their export today reads 3 x 8-12 for the Bulgarian split
squat where the fixture says 4 x 4-8. The fixture is a fixture; when the live plan is what
matters, ask for an export. The mechanisms described elsewhere in item 15 hold; the specific
slots and numbers are the fixture's.

---

## 19. Storage filled up, and a save that failed was the end of it — FIXED (2026.11.17.35)

**Reported from a device: "storage is full".** That message was this app's own, and it was
the end of the story rather than the start of one. `persist()` caught the quota error, said
so once in a toast, and returned false. **Nothing was freed, nothing was retried**, and the
next write tried the same thing against the same full box. A session finished in that state
is a session somebody performed and the app lost.

**Where the space went, counted rather than guessed:**

```
the live data            ~850 KB   the thing that must never be dropped
3 rescue backups       ~2,550 KB   RAW copies of that same data, uncompressed
up to 10 patch snaps   ~1,500 KB   gzipped, but budgeted as if they were alone
                                   ------
                                   ~4.9 MB against a ~5 MB box
```

Two mechanisms each sized sensibly on its own, adding to more than the device has. The
rescue backups have been raw since they were written; the patch snapshots arrived at
2026.11.17.31 with a budget sized without reference to them, which is mine.

**A write that does not fit now makes room for itself.** Oldest disposable copy first, one
at a time, rebuilding the payload each attempt — because freeing a patch snapshot changes
`S` (its history row stops claiming a whole roll-back) and writing the stale string would
put the lie straight back on disk. Protected, and never dropped under any pressure:
sessions, plan, settings, gyms, volume landmarks, plan history, account. When only those
are left, nothing is written silently: the data stays in memory and `saveFailedModal()` —
the app's existing sticky dialogue, reused rather than duplicated — will not let the person
past without exporting.

**One budget for everything disposable**, a fraction of the real quota rather than a number
typed in, with `navigator.storage.estimate()` consulted and used only when it is SMALLER
than the 5 MB assumption. Rescue backups are compressed: 848,772 chars becomes 153,919.

**And the ordering bug that nearly shipped with it.** Compressing is async, so the first
version scheduled the backup and returned. A backup that is merely scheduled is not a
backup — the whole promise is that the copy is on the device BEFORE the repair writes over
the original, and a tab closed in between would have taken it. `badshape` caught it, eight
assertions at once. The raw bytes now land synchronously and the compressed version
replaces them a moment later.

**`tests/specs/storage.mjs`** caps `Storage.prototype.setItem` at the current usage — a
box with nothing spare, which is what a real one does — and then finishes a session. The
assertion that matters is named for it: **A SESSION FINISHED ON A FULL BOX IS STILL SAVED**.
Section 4 proves the other half: with every disposable thing already gone, the save reports
failure, the data is still in memory, it is honestly not on disk, and the dialogue cannot be
dismissed into silence.

**Still open: the Storage screen** (Settings, a breakdown by category, deleting only
disposable things with what each costs stated, an export offered first) and the longer-term
question of moving to IndexedDB, which has far more room than localStorage's ~5 MB. Both
were asked for; both were deliberately deferred behind the data-loss fix.

---

## 17. Flaky: `altadd.mjs`, "the movement survived the reload" — CLOSED (2026.11.17.46)

**The reproduction this entry owed arrived on its own**, in the 311-spec run of
2026-11-19: `altadd` failed there and passed three times out of three in isolation. That is
exactly the CPU-contention case written up below and never demonstrated — under a full
suite the browsers compete, Chromium's asynchronous `localStorage` commit does not land,
and the cold boot reads storage the seed never reached. The failing line was *"and the
fixture reached storage"*, which is the documented cause rather than a new one.

**Checked rather than waved through.** "Known flake" is the cheapest way to let a real
regression past, and this run came in the middle of two Settings conversions, so it had to
be read as a suspect first.

**Fixed at the cause, not loosened.** The spec already retried four boots and three whole
fixture rebuilds; under contention every attempt can miss the same way and a higher count
only buys a slower failure. The write is now **confirmed present before the page is left**,
instead of assumed and checked afterwards: it polls until the seed tag is readable out of
`localStorage` **itself** — not out of `S`, which is the in-memory copy and would answer
yes whether or not anything had been stored. Only then are writes frozen and the page
navigated away.

**Verified the only way it can be.** The fix passes in isolation both before and after the
change, so an isolated run proves nothing; the evidence is the full 311-spec run going
green under the same contention that produced the failure.

### The original entry

**Worked through in the order the original entry sets out. Step 2 killed step 1, and my own
recorded hypothesis with it.**

**Step 2 first, because it is free.** `injuryAskDue()` requires `noteLooksInjured(s.note)` on
one of the last twelve sessions. This spec seeds exactly one session, built as
`{name, sets:[{reps, weight, done}]}` — no `note` field anywhere, and no `exNotes`. So
`openInjuryAsk()` returns false before it draws anything, and the modal I blamed cannot open
in this spec at all. Step 1, "run it with the injury prompt disabled", would have proved
nothing: it is already effectively disabled. **The hypothesis recorded here was wrong, and it
was mine.**

**Step 3, and the cause is in the spec rather than the app or the browser.** The recorded
failure was:

```
BROKEN the movement survived the reload  [Barbell Bench Press, Alternating Cable Lateral Raise]
```

That list is **pass one's exact final state**. The spec runs two passes — `Alternating Cable
Lateral Raise`, then `Single-Arm Dumbbell Row` — clearing storage between them, and the
second pass was asserting against the first pass's data.

The guard could not do its job. Between passes the spec clears and reseeds, then asks "did
the fixture reach storage?" by checking `(S.sessions || []).length`. **The previous pass's
leftovers satisfy that perfectly**: one session, named entries, nothing to tell them apart.
So when the clear-and-reseed did not commit in time — Chromium commits `localStorage`
asynchronously, and a long serial suite is exactly when it is slowest — the cold boot read
pass one's bytes, the guard was satisfied, and the spec reported the app as losing data when
the harness had read a commit one pass out of date.

**Tightened, not loosened.** The seed writes `S.seedTag`, and the boot requires its own tag
rather than merely "some fixture". A stale read is now a logged retry:

```
read a fixture tagged "Alternating Cable Lateral Raise" while expecting
"Single-Arm Dumbbell Row" - a stale commit, rebuilding
```

**Still owed: a reproduction.** This has not been seen to fire. The mechanism is proven to
exist — the guard demonstrably cannot distinguish the two fixtures, which is a static fact
about the code — and the observed failure matches it down to the movement named. That is
strong circumstantial evidence and not the same as watching the retry line appear. The
remaining step is the original entry's own step 3: run `altadd` repeatedly under CPU
contention and record whether it ever fires. Until it does, this stays recorded as explained
rather than closed.

The original entry follows, unedited.

### The original entry

**Observed:** one failure in one full-suite run of 297, on 2026.11.17.25:

```
FAIL altadd
     BROKEN the movement survived the reload  [Barbell Bench Press, Alternating Cable Lateral Raise]
```

**Not reproducible in isolation:** 6 consecutive standalone runs passed, plus 2 through
`tests/run.js`. Machine load during a long serial suite is the likeliest trigger, which
is the same shape as item 13.

**What it is NOT.** The spec already retries on `fixtureLost`, the documented Chromium
async-commit trap, and that assertion did not fail — the seed reached storage. What went
missing was the movement ADDED through the editor afterwards: written, reloaded, gone.
Same class, a different write.

**The open question, and it is mine.** 2026.11.17.25 added a prompt that can open 400ms
after a render on the Today tab (Rule E's injury question). It is gated to once per open,
Today only, no active session, and no modal already present — but a modal appearing in
the middle of a spec that drives the editor and then reloads is exactly the kind of thing
that could land between a write and a reload. Before blaming the browser:

1. Run `altadd` with the injury prompt disabled and see whether the flake survives.
2. Check whether that spec's fixture contains a note the detector reads as an injury.
3. Only then reach for the async-commit explanation, and reproduce under load.

Nothing has been loosened to make it pass. If the prompt turns out to be the cause, the
fix belongs in the prompt (it should not open while anything else is mid-flow), not in
the assertion.

---

## 14. The plan still counts one-limb work in the pre-pair unit — NOTE FIXED (2026.11.17.33), counts left alone deliberately

**The note is corrected; the set counts are not, and that split was the user's own.** The
original entry below says the note "could be corrected on its own — it is a description of
what the app does, and it is wrong" while the counts "belong to the person". That is exactly
what shipped: seven one-limb lines, the app's sentence rewritten, every set count left as it
stands. The Bulgarian split squat still reads 4, and is still 4 per leg.

**Measured before anything was changed**, because the note's claim had to be shown false
rather than assumed so: a session built from the plan turned 2 planned sets into 2 sets and
`sideSets()` returned 4, with no L/R stamped on either. The sentence describes a behaviour
P1-7 removed.

**Only this app's own exact sentence is rewritten.** `fixPairNoteV1` is built in the shape
of `fixLimbNoteV1`, which solved the same problem for a different wrong word: a substring
swap on a known string, so a note somebody typed and a note an imported document supplied
are text the app did not write and are left word for word. Both are controls in the spec —
including a typed note that contains the phrase "alternate L/R each set" itself.

**The trap this nearly shipped with.** The stamper skips a line that already carries a side
note, and it recognised the OLD wording only. The load after the rewrite would have appended
"alternate L/R each set" to a line this version had just corrected, for ever. `hasSideNote()`
now recognises both wordings, and the spec runs a second `migrate()` and asserts nothing
moves.

**One-limb lines on the real export, after:**

| Day | Movement | Sets | Sentence |
|---|---|---|---|
| Pull A | Single-Arm Cable Hammer Curl | 2 | single arm, both arms in each set |
| Legs A | Dumbbell Bulgarian Split Squat | 4 | single leg, both legs in each set |
| Push B | Cable Lateral Raise | 3 | single arm, both arms in each set |
| Pull B | Single-Arm Dumbbell Row | 3 | single arm, both arms in each set |
| Pull B | Single-Arm Cable Pulldown | 2 | single arm, both arms in each set |
| Pull B | Preacher Curl | 2 | single arm, both arms in each set |
| Legs B | Standing Cable Hip Abduction | 3 | single leg, both legs in each set |

Tests: `tests/specs/pairnote.mjs`. **Still open in this item: nothing.** The per-side count
display the original entry suggests ("should print per-side counts rather than raw set
numbers") was considered and deliberately not built — the user asked for the wording only,
and restating a count on screen is the training decision this item has always kept separate.

The original entry follows, unedited.

### The original entry

A button to fix this was asked for, built and then removed at the user's request
(2026.11.17.21, reverted in .22). The feature is gone; the discrepancy it was built for
is still here, so it is recorded rather than lost.

**Measured, not assumed.** Since P1-7, `entryPerSideWanted()` returns true for any
`isSingleArm()` entry and `startWorkout()` builds `perSide` sets, so a set of a one-limb
movement IS a pair. `sideSets()` on a session built from a 4-set entry returns 8 — four
per side. Two things still describe the shape before that:

- **The note.** Every one-limb movement carries "alternate L/R each set", stamped on each
  load by the migration near the top of `migrate()`. That is the pre-pair instruction
  (set 1 left, set 2 right) and it has been untrue since P1-7 shipped.
- **The set count.** A plan line reading 4 sets of a split squat asks for four per leg.
  Read through the note, the same line looks like two per leg.

So a person reading their own plan is out by a factor of two on exactly the movements
where the app changed what a set means. On the user's own plan that means the Bulgarian
Split Squat at 4 sets is 4 per leg, and "move it to 3 per side" is a CUT that takes quads
under their floor, not the increase it appears to be.

**Not fixed, deliberately.** The note could be corrected on its own — it is a description
of what the app does, and it is wrong. The set counts could not: restating them is a
training decision and belongs to the person, which is why it was a button rather than a
migration. Anything built here again should keep that split, and should print per-side
counts rather than raw set numbers, because the raw number is what carries the
misunderstanding.

---

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

---

## A note on this document's own history

**Sections 13, 14 and 17 were deleted by accident in `1b6fbd3` and restored here, from
`02e3ac7`, unedited.** The Rule F rewrite replaced the paragraph that ended item 16 and,
in doing so, dropped everything that followed it. Nothing was lost — the text above is the
same text — but it was gone from the working copy for five commits, and the two open items
it describes were only findable in git. Recorded because a document whose job is to keep
what would otherwise be forgotten is the worst possible place to silently lose three
sections.