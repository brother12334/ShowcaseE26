/* HOW FAR THE ADJUSTMENT CHAIN CAN MOVE A LANDMARK, AT ITS EXTREMES.

   adjustedLandmarks() multiplies the base table by experience, goal, frequency, effort,
   exercise mix and a recovery modifier, each defensible on its own. Nothing anywhere
   bounds their PRODUCT, so the question "what is the worst case" has never been answered
   with a number. This answers it by driving the real function with the inputs that each
   step reacts to, rather than by multiplying the constants on paper. */
import { boot, calm } from '../inspect/_boot.mjs';
const {b, p, errs} = await boot();
await calm(p);

const r = await p.evaluate(()=>{
  const base = {};
  Object.keys(GROUPS).forEach(g=> base[g] = {mev: GROUPS[g].mev, mav: GROUPS[g].mav, mrv: GROUPS[g].mrv});

  /* The analysis object adjustedLandmarks reads. Built by hand so each extreme is a
     state a real user could actually be in. */
  const mkA = (o)=> ({
    wk: o.wk || {},
    modInfo: {mod: o.mod || 0},
    lm: {}, days: 7
  });
  const run = (g, level, goal, wk, mod)=>{
    S.expManual = level;
    S.setup = Object.assign({}, S.setup, {goal});
    const A = mkA({wk: {[g]: wk}, mod});
    try{ return adjustedLandmarks(A, g); }catch(e){ return null; }
  };

  const worstIn = {sets: 20, compound: 18, days: 1, eff: 20, effDays: 1, rpeAvg: 9.5};
  const bestIn  = {sets: 20, compound: 2,  days: 4, eff: 20, effDays: 4, rpeAvg: 7.5};
  const out = [];
  Object.keys(GROUPS).forEach(g=>{
    if(GROUPS[g].optional) return;
    const lo = run(g, "beginner", "health", worstIn, -25);
    const hi = run(g, "advanced", "muscle", bestIn, 10);
    if(!lo || !hi) return;
    out.push({g, name: GROUPS[g].name,
      baseMrv: base[g].mrv,
      loMrv: +lo.mrv.toFixed(1), hiMrv: +hi.mrv.toFixed(1),
      loRatio: +(lo.mrv / base[g].mrv).toFixed(3),
      hiRatio: +(hi.mrv / base[g].mrv).toFixed(3),
      loMev: +lo.mev.toFixed(1), loGap: +(lo.mrv - lo.mav).toFixed(1)});
  });
  return out;
});

console.log("muscle          base MRV   worst MRV  x base    best MRV   x base   worst MEV");
r.sort((a,c)=> a.loRatio - c.loRatio).forEach(x=>{
  console.log(x.name.padEnd(15)
    + String(x.baseMrv).padStart(7)
    + String(x.loMrv).padStart(12) + ("(" + x.loRatio + ")").padStart(9)
    + String(x.hiMrv).padStart(11) + ("(" + x.hiRatio + ")").padStart(9)
    + String(x.loMev).padStart(10));
});
const worst = r.reduce((a,c)=> c.loRatio < a.loRatio ? c : a, r[0]);
const best  = r.reduce((a,c)=> c.hiRatio > a.hiRatio ? c : a, r[0]);
console.log("\nWORST: " + worst.name + " MRV falls to " + worst.loRatio + "x its base ("
  + worst.baseMrv + " -> " + worst.loMrv + ")");
console.log("BEST : " + best.name + " MRV rises to " + best.hiRatio + "x its base ("
  + best.baseMrv + " -> " + best.hiMrv + ")");
console.log("errors:", errs.length ? errs.slice(0,3).join(" | ") : "none");
await b.close();
