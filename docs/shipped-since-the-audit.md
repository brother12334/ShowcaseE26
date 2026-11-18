# Everything shipped since the 2026-11-15 audit

A record, written at build **2026.11.17.20**. Forty-one releases, 2026.11.15.3 through
2026.11.17.20, all verified against the full spec suite (297 specs at the time of
writing) and the whole-export replay before shipping.

The queue is empty: items 1–13 of `docs/open-work.md` are closed.

---

## 1. The eleven audit findings  (2026.11.15.3 → 2026.11.16.3)

The audit's own list, in order. Each one shipped with a spec that fails on the old code.

| | What was wrong |
|---|---|
| P0-1 | An automatic change landed on whichever day was open, not the day that earned it. |
| P0-2 | Counting your own bodyweight into a load read as getting stronger. |
| P0-3 | A volume floor was cut on a gain that had not happened. Five such cuts in your log. |
| P1-4 | Rest windows grew for reasons that were not rest, with no ceiling. |
| P1-5 | Rules contradicted each other: the stall protocol and the volume floor pulling opposite ways, and the plan check churning on sessions that had only just had their load or range moved. |
| P1-6 | The planned loads drifted from the loads actually logged, and change rows recorded no-ops and duplicates. |
| P1-7 | A set of a one-limb movement counted as a full set, and there was no way to log left and right as one set. |
| P1-8 | The side-balance check retired while the gap was still real, and matching the weaker side erased the gap it had just been matched to. **P1-8b**, the follow-up: judge it on reps to failure, not reps logged. |
| P2-9 | Change-log reasons were quoted from what was meant rather than derived from what happened, so rows were mislabelled. |
| P2-10 | The report showed "blank → blank" for most programme edits while the CSV of the same rows carried the real values. |
| P2-11 | Input hygiene: a stepper writing a change row per tap, a load the equipment cannot produce logged without comment, a pre-filled rating counted as an answer, and no way to mark a session as not ordinary training. |

Two pieces of tooling came out of this stretch and have paid for themselves since:
`tools/patch.py`, a byte-delta-guarded patcher written after two near-misses, and
`sideall.mjs`, which statically refuses any read of `sides` outside the side adapter
unless it declares itself.

## 2. One-limb movements, logged as what they are  (2026.11.16.4 → .17)

Left, right, one rest. The second side opens with the first side's load and may have a
pause before it. Per side in the plan, an extra set for the weaker one. A reps *hint* is
never stored as reps that happened. The plan and the log must agree, and where they
disagree **the log wins** — the evidence decides which fact is wrong.

## 3. The replay  (2026.11.16.16)

`tests/specs/replay.mjs` replays your entire export — 72 sessions, 1,231 sets, 52
movements, 221 recorded plan changes, July 12 to November 14 — through the real finish
pipeline and asserts all six audit outcomes together. A purpose-built fixture cannot
catch a rule that is fixed here and broken two months earlier in the log; this does.

## 4. The nine slot debts  (2026.11.17.1 → .7)

The same movement in two days of your split was one thing to nine different readers. Each
was treated as a suspected live bug until a two-slot test with different loads per day
said otherwise. Debt 9 turned out to want widening rather than scoping.

## 5. The emergency, and what came out of it  (2026.11.17.9 → .13)

A crash in the session editor put your data at risk. Shipped in the order you asked:

1. **Rescue first** — raw-data export reachable from Program and Research, plus an error
   boundary per tab, so one broken screen cannot take the app down.
2. **The repair layer** — a malformed entry is a record to skip and flag, never a screen
   to lose, and the raw state is backed up in localStorage before anything is repaired.
3. **The handover file** — the set-aside records on their own, without the account key.
4. **The guard** — no set with a typed value on either side is silently dropped.

Also fixed here: paired sets now count as done everywhere, and a finished one-limb
movement no longer scores as half complete.

Two traps written down so they are not hit a third time: anything called from `migrate()`
runs while the file is still evaluating and throws on a temporal dead zone, and Chromium
commits localStorage asynchronously, so a reload straight after a write can boot on
storage the write never reached.

## 6. The session editor  (2026.11.17.13 → .17)

It had been building its own set rows: four boxes, no L/R, no set type. Now it draws
**live logging's** rows, from the same builder, with the same set types and one shared
adder, and a set row names the session it belongs to so both can be on screen at once.
Plain sets can be converted to L/R pairs with you choosing which of the two things those
rows meant, previewed before you confirm.

Concept **C1** came out of this: a finished pair is one slim line, opened by tapping it,
with the load per side while it is open and one tick for the pair.

## 7. Item 11 — stall counters keyed by slot  (2026.11.17.18 → .19)

A counter was keyed by exercise name alone, so a movement in two days had one counter
between them. Counters are now keyed by slot and rebuilt by replaying the log in order —
4 ms, so every path that removes or replaces a session rebuilds: deleting, resuming,
importing, restoring, and editor saves. Your own log has 20 movements in more than one
slot and 10 where the counters genuinely differ.

## 8. Item 12 — the write/clear asymmetry sweep  (2026.11.17.19)

A three-pass sweep for state written on one path and cleared on another. **Nothing
found**, with the limit stated plainly: it finds *disagreements* between two sides of one
piece of state, so a store consistently wrong on both sides is invisible to it.

## 9. Item 10 — the session's gym  (2026.11.17.20)

Gym facts were global and forward-looking, so one afternoon somewhere with a heavier
carriage re-judged the whole log. Now: a per-gym cable stack step; impossible-load checks
against the session's own kit; last-load lookups preferring the same gym and marking a
cross-gym answer as an estimate; a gym control in the session editor; and the gym in
History, the report and the CSV. Untagged sessions are read as your home gym — an
explicit setting — and say "(assumed)" wherever they appear.

## 10. Item 13 — the `logstill` flake  (closed 2026.11.17.20)

One drift in one run on build .13, never reproduced. Watched through .20 and closed
without changing the assertion: ten runs under full CPU load, exact equality every time.
Nothing was loosened to make it go away.

---

## Where the evidence lives

- [`docs/element26-fix-spec.md`](element26-fix-spec.md) — the original fix spec from the
  audit, kept unedited. It predates the P1-7 L/R addendum, the decisions on items 1-9,
  P1-8b and items 10-13; its own header says so.
- `docs/open-work.md` — every item, what was found, and what was deliberately not done.
- `tests/specs/replay.mjs` — the whole-export regression, all six outcomes at once.
- `tests/specs/` — 297 specs. Every one carries a control that must fire, because a
  reader returning nothing for want of a fixture looks exactly like one that correctly
  found nothing.

## Two rules adopted along the way

1. A reported bug is a suspected **live** bug until a test proves otherwise. Write the
   failing assertion first.
2. If an assertion is changed instead of the code, the commit message says in one line
   why the old expectation was wrong.
