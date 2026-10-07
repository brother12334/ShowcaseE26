/* THE LANDMARKS, DERIVED FROM THE CURVE RATHER THAN LOOKED UP.

   Inputs, both measured rather than chosen:
     - the published marginal-effects table (docs/data/pelland-hypertrophy-volume.json),
       which is the dose-response curve itself, set by set, with credible intervals;
     - each muscle's basis ratio from tools/science/basis-bridge.mjs, which converts the
       paper's fractional units into the units this app counts in.

   Output: what each landmark becomes, per muscle, beside what the app ships today.
   Prints a table for docs/volume-science.md. Changes nothing. */
import { readFileSync } from 'node:fs';
import { boot, calm } from '../inspect/_boot.mjs';

const D = JSON.parse(readFileSync(new URL('../../docs/data/pelland-hypertrophy-volume.json', import.meta.url)));
const G = Object.fromEntries(D.rows.map(r=> [r[0], r[1]]));
const SDES = D._source.sdes_pct;

/* THE TIERS, RE-DERIVED FROM THE CURVE so they are this file's own arithmetic rather
   than a number copied out of the paper's prose. A tier ends where one more detectable
   gain (one SDES) has been bought. */
const tiers = (()=>{
  let mev = null;
  for(let v = 1; v <= 45; v++){ if(G[v] >= SDES){ mev = v; break; } }
  const edges = [mev];
  let from = mev;
  while(from < 45){
    const target = G[from] + SDES;
    let nxt = null;
    for(let v = from + 1; v <= 45; v++){ if(G[v] >= target){ nxt = v; break; } }
    if(!nxt) break;
    edges.push(nxt); from = nxt;
  }
  return {mev, edges};
})();

/* The basis ratios, median across the 360 builder plans (see basis-bridge.mjs). */
const RATIO = {
  glutes:1.353, lats:1.150, delts_side:1.029, chest:1.000, upper_back:1.000, quads:1.000,
  triceps:0.950, delts_front:0.938, calves:0.914, biceps:0.912, abs:0.909, hams:0.900,
  lower_back:0.871, delts_rear:0.862, obliques:0.800, traps:0.749, forearms:0.720,
  adductors:0.700
};

const {b, p, errs} = await boot();
await calm(p);
const cur = await p.evaluate(()=>{
  const o = {};
  Object.keys(GROUPS).forEach(g=> o[g] = {name: GROUPS[g].name, mev: GROUPS[g].mev,
    mav: GROUPS[g].mav, mrv: GROUPS[g].mrv, optional: !!GROUPS[g].optional});
  return o;
});
await b.close();

console.log("CURVE: minimum effective dose " + tiers.mev
  + " fractional sets; tier edges at " + tiers.edges.join(", ")
  + " (SDES " + SDES + "%)");
console.log("Paper's stated tiers: MED 4, higher 5-10, intermediate 11-18, lower 19-29,"
  + " lowest 30-42, unclear 43+\n");
console.log("Per muscle, in ELEMENT 26 units (tier x basis ratio), beside what ships today:\n");
console.log("muscle         ratio |  floor      efficiency    useful top    expensive top | today mev/mav/mrv");
const order = Object.keys(RATIO).filter(g=> cur[g]).sort((a,c)=> RATIO[c] - RATIO[a]);
order.forEach(g=>{
  const r = RATIO[g], c = cur[g];
  const f = v=> (v * r).toFixed(1).padStart(5);
  console.log(
    (c.name + (c.optional ? "*" : "")).padEnd(14)
    + r.toFixed(3).padStart(6) + " |"
    + f(4) + "      " + f(10) + "        " + f(18) + "         " + f(29) + " | "
    + [c.mev, c.mav, c.mrv].join(" / "));
});
console.log("\n* optional group, not measured by the plan check");
console.log("errors:", errs.length ? errs.slice(0,3).join(" | ") : "none");
