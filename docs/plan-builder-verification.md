# Plan Builder — verification record

This file is the record for the Plan Builder work: what is checked, how to run the
checks, what the measurements came out as, and anything in the code that contradicts
the brief.

It is written as the work lands, phase by phase. Sections for phases that have not
been built yet say so rather than standing empty.

## How the checking works

Two layers.

**1. An in-app check — `index.html#selftest`.**
Open the app with `#selftest` in the hash and it skips the splash and the usual
first screen and prints a report instead. It is a plain function, `selfTestRun()`,
so a test can call it directly and read the result. It checks the invariants that
hold the exercise library and the muscle mapping together:

| # | Invariant | Why it matters |
|---|---|---|
| 1 | Every movement in the library resolves to at least one muscle | A movement that maps to nothing is invisible to volume, landmarks and the Body tab |
| 2 | Every movement the catalogue names ends up in the slot the catalogue **last** puts it in | The merge is order-dependent; this pins the result rather than the intention |
| 3 | A movement appears in one slot only | Two slots would double-count its sets |
| 4 | Every muscle share is between 0 and 1 | Shares outside that silently inflate or cancel volume |
| 5 | Every slot the catalogue names exists and is not empty | A named-but-empty slot makes a swap list or a builder choice come out blank |

A failure in any of these is a real bug. Re-slotting (invariant 2's second case,
where a later catalogue row moves a movement out of the slot an earlier row gave it)
is reported as a **warning**, not a failure — see "Known, intentional behaviour".

**2. A Playwright harness against the real file.**
`selftest.mjs` loads `file:///home/user/ShowcaseE26/index.html#selftest` with every
`http`/`https` request aborted (`p.route(/^https?:/, r => r.abort())` — note that
routing `'**://**'` also blocks `file:` and the page will not load at all), waits
for the report to render, calls `selfTestRun()` and asserts zero failures. It also
asserts the page throws nothing with the network dead, and that the library it read
is the real one (> 250 movements) rather than a stub.

Each acceptance item in the brief becomes a test in this harness as its phase lands.
The whole set runs from `sweep.sh`.

## Known, intentional behaviour

**`EX_CATALOG` re-slots movements on purpose, and the last row wins.** Several
movements are listed twice: once under a coarse slot and again under the specific
slot they belong in. The merge applies the rows in order, so the later row moves the
movement. That is the intended design, and the check reports it as a warning so the
pattern stays visible. Twelve movements are re-slotted today:

| Movement | Final slot |
|---|---|
| Good Morning | `lower_back` |
| Back Extension Machine | `lower_back` |
| Reverse Hyperextension | `lower_back` |
| Hip Abduction Machine | `glute_iso` |
| Hip Adduction Machine | `adductors` |
| Frog Pump | `glute_iso` |
| Barbell Wrist Curl | `forearms` |
| Reverse Wrist Curl | `forearms` |
| Side Plank | `obliques` |
| Pallof Press | `obliques` |
| Russian Twist | `obliques` |
| Cable Woodchop | `obliques` |

**`canonEx` collapses some near-duplicate names**, so a catalogue row can land on a
movement spelled differently in the library: "Back Extension" / "Back Extension
Machine", and "Wrist Curl" / "Barbell Wrist Curl". This is the alias system doing
its job; it is why invariant 2 is phrased in terms of where a movement *landed*
rather than which row named it.

## Measurements

### Library and mapping

As of 39.0: **313** movements in the library, **0** invariant failures, **12**
re-slotting warnings (the table above).

### Builder combinations

Not measured yet — the builder does not exist. Phase 9 fills this in with the full
grid the brief asks for: days 2–6 × four gear tiers × three levels × goal
{muscle, lean} × budget {45, 60, 75}, recording per-muscle weekly sets against
MEV/MAV/MRV, per-session maxima and minutes per day, with the requirement of zero
quality-check failures and every major muscle inside [MEV, min(MAV, 0.9·MRV)]
except chosen priority muscles.

## Open questions

Things in the code that conflict with the brief, or that the brief does not settle.
Recorded rather than guessed at.

*(none yet — opened as each phase meets one)*

## Phase log

| Phase | Contents | State |
|---|---|---|
| 1 | Harness | done — `#selftest`, `selftest.mjs`, this file |
| 2 | C2 / H5 / M8 / L1 | not started |
| 3 | Progression — H1–H4, H6, H8, L3, L4, M7 | not started |
| 4 | Safety — H7, M1, M2 | not started |
| 5 | Builder, quality check, H9/H10/L5/M11, remove "Change the schedule" | not started |
| 6 | Periodization (M9) + M3 | not started |
| 7 | M4, M5, M6, M10, L2 | not started |
| 8 | Streaks + coach view | not started |
| 9 | Re-measurement, then bump `APP_VERSION` and `sw.js` `VERSION` | not started |
