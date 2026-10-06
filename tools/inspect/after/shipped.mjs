/* The five rebuilt screens, before and after, as a set of pairs. */
import { strip } from './_strip.mjs';
import { OUT } from './_mock.mjs';
import path from 'node:path';
const f = n=> path.join(OUT, n + ".png");
const PAIRS = [
  ["S1-session", ["W-session-BEFORE", "Z-session"],
   ["BEFORE\n20 rows, all of them forms\n3,458px / 4.1 screens",
    "AFTER\none form: the set you are on\n1,593px / 1.9 screens"],
   "THE SESSION"],
  ["S2-rest", ["W-rest-BEFORE", "Z-rest"],
   ["BEFORE\nwhite disc, counts up\nrim shows the current MINUTE",
    "AFTER\nsteel, counts down\nthe rim is this rest"],
   "REST"],
  ["S3-body", ["W-body-BEFORE", "Z-body"],
   ["BEFORE\nfigure 2,384px down\nand filled #NaNNaNNaN",
    "AFTER\nfirst screen, five views\nand actual colours"],
   "BODY"],
  ["S4-history", ["W-history-BEFORE", "Z-history"],
   ["BEFORE\n115 cards / 20.1 screens\n1,572 controls / 105.7ms",
    "AFTER\none row per lift\n1.3 screens / 17 / 5.2ms"],
   "HISTORY"]
];
for(const [name, files, labels, title] of PAIRS){
  try{ await strip(files.map(f), labels, f(name), title); }
  catch(e){ console.log("skip " + name + ": " + e.message.slice(0, 80)); }
}
