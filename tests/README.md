# Tests

One command:

```
node tests/run.js
```

It exits non-zero if anything fails. One spec, or a few, by name:

```
node tests/run.js budget caps eating
```

## Where the specs are

`tests/specs/`, in the repository, which is a correction rather than a detail. They used
to live in the scratchpad of the session that wrote them, and each one carried three
absolute paths — the app at `/home/user/...`, Playwright at `/opt/node22/...`, and a
scratch directory for screenshots. None of those exist in a clone, so the suite could not
be run against a fresh checkout of its own repository: the one thing a test suite most
needs to be able to do.

Everything now resolves through `tests/specs/_e26.mjs`, which works out where the
repository is from its own location. A spec imports `APP_URL` and whatever else it needs
from there and nothing else knows a path:

```js
import { chromium, APP_URL, shot } from './_e26.mjs';
```

Playwright is looked for as an installed dependency first (`npm i -D playwright`), then at
the path this suite was written against, then at `E26_PLAYWRIGHT` if you set it. Anything
a spec writes — screenshots, dumps — goes to `tests/.out/`, which is gitignored.

## A missing spec is a failure, not a skip

`run.js` carries a `REQUIRED` list. If a spec named there is not on disk the run stops
before anything executes and exits 2. The previous runner printed `SKIP <name> (not
found)` and carried on, which meant a suite with every spec missing passed silently —
the worst possible behaviour for a test runner, and exactly what it did when the specs
were not committed. Specs on disk but absent from `REQUIRED` still run, so adding one is
a single file; the list exists so that *deleting* one is a deliberate act with a diff.

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
