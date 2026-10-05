# Tests

One command:

```
node tests/run.js
```

It exits non-zero if anything fails.

## What it does

`tests/run.js` drives the real `index.html` in the pre-installed Chromium through
Playwright. It is not a unit-test harness bolted to the side of the app: it loads the file
the way a phone loads it, blocks every `http`/`https` request so nothing can reach the
network, waits for boot, and then calls the app's own global functions through
`page.evaluate` against state it constructs itself.

Three things follow from that, and they are the point:

- **No mocks of the thing under test.** `buildPlan`, `planQuality`, `progressionFor` and
  the rest are the functions the app runs, not copies.
- **No network.** A test that passes because a request succeeded is a test that fails on a
  train. Every request is aborted, including the ones a service worker would make.
- **State is made up on the spot.** Each spec writes the `S` it needs, so a test never
  depends on what the test before it left behind.

## The specs

Each file under the scratchpad spec set is one subject, and the sweep runs all of them.
`tests/run.js` runs the phase specs that cover the brief's acceptance table:

| Spec | Covers |
|---|---|
| `selftest` | library and mapping invariants, through `#selftest` |
| `phase2` | C2 frozen preference table, H5 mapping order, M8 re-slotting, L1 one e1RM |
| `phase3` | H1–H4, H6, H8, L3, L4, M7 — the progression engine |
| `phase4` | H7 starting loads and feeler sets, M1/M2 effort ceilings |
| `phase5` | the builder, the quality check, H9/H10/L5/M11 |
| `restdays` | a plan's own rest days, and editing them |
| `daypick` | choosing which day of the plan to train today |
| `bwsay` | bodyweight-inclusive loads: what to pick up, and what gets rounded |

## In the app

`index.html#selftest` runs the library and mapping invariants in the browser and prints a
report instead of the app. `runSelfTests()` (also `selfTestRun()`) does the same from the
console and returns the result, so a test can assert on it.

## Chromium

The browser is pre-installed. Never run `playwright install`. If the bundled path fails,
launch with `executablePath: '/opt/pw-browsers/chromium'`.
