/* BEFORE | AFTER, side by side, which is the only way a design decision can actually be
   judged. */
import { strip } from './_strip.mjs';
import { OUT } from './_mock.mjs';
import path from 'node:path';
const f = n=> path.join(OUT, n + ".png");

const PAIRS = [
  ["P1-logger", ["A-logger-BEFORE", "A-logger-AFTER"],
   ["BEFORE\n20 identical rows, 4.1 screens\n60 input boxes in one session",
    "AFTER\none form: the set you are on\nthe whole session on one screen"],
   "THE SESSION  —  a form becomes a stack"],
  ["P2-rest", ["B-rest-BEFORE", "B-rest-AFTER"],
   ["BEFORE\na white disc over a blurred page\nprogress unreadable, counts up",
    "AFTER\nsteel plate, the rim is the clock\nand it says what you're resting for"],
   "REST  —  a phase of the session, not a modal"],
  ["P3-body", ["C-body-BEFORE-top", "C-body-AFTER"],
   ["BEFORE\nfour generic metric cards;\nthe figure is 2,384px further down",
    "AFTER\nthe figure IS the page\none control recolours it"],
   "BODY  —  the signature asset, above the fold"],
  ["P4-history", ["E-history-BEFORE", "E-history-AFTER"],
   ["BEFORE\n115 identical cards, 20.1 screens\n1,572 controls, 106ms to draw",
    "AFTER\none row per lift, with the climb\nsessions and records behind a tab"],
   "HISTORY  —  a database becomes a story"],
  ["P5-today", ["D-today-BEFORE", "D-today-AFTER"],
   ["BEFORE\nthree status containers before\nthe app says what you're doing",
    "AFTER\none status line, the day as the\nscreen, the action never scrolls"],
   "TODAY  —  one screen, one decision"]
];

for(const [name, files, labels, title] of PAIRS){
  await strip(files.map(f), labels, f(name), title);
}
