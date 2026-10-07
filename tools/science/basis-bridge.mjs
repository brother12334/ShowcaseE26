/* ELEMENT 26'S COUNTING BASIS vs THE ONE THE TIERS WERE MEASURED ON.

   Pelland et al. compared three ways of counting a set for a muscle and found the
   'fractional' one fit best: a set counts 1.0 if that muscle is the exercise's primary
   force generator and 0.5 if it is involved but not. Their volume tiers (Table 2A) are
   stated in THOSE units.

   Element 26 counts on a continuum instead: muscleFrac() pays a Smith squat's glutes
   0.8, a lunge's hamstrings 0.3, a row's biceps 0.5. So the app's "16.8 sets a week" and
   the paper's "19-29 is the lower-efficiency tier" are not the same quantity, and the
   tiers cannot be dropped in without knowing the exchange rate.

   This measures it, per muscle, across all 360 builder plans: the app's counted volume
   against the same plan counted the paper's way. */
import { boot, calm } from '../inspect/_boot.mjs';
const {b, p, errs} = await boot();
await calm(p);

const res = await p.evaluate(()=>{
  const ratio = {};
  const W = {beginner: 10, intermediate: 60, advanced: 300};
  let n = 0;
  [2,3,4,5,6].forEach(days=> ["full","dumbbell","home","minimal"].forEach(gear=>
    ["beginner","intermediate","advanced"].forEach(level=>
      ["muscle","lean"].forEach(goal=> [45,60,75].forEach(minutes=>{
    let r;
    try{ r = buildPlan({days, gear, goal, minutes, trainingWeeks: W[level], priority: []}); }
    catch(e){ return; }
    if(!r || !r.program) return;
    n++;
    const ids = r.split.days.map(d=> d.id);
    const app = {}, paper = {};
    ids.forEach(wid=> (r.program[wid] || []).forEach(e=>{
      const sets = parseInt(e.sets, 10) || 0;
      if(!sets) return;
      const m = musclesFor(e.name) || {};
      Object.keys(m).forEach(g=>{
        const f = m[g];
        if(!(f > 0)) return;
        app[g]   = (app[g]   || 0) + f * sets;                 // the continuum
        paper[g] = (paper[g] || 0) + (f >= 1 ? 1 : 0.5) * sets; // direct 1.0 / indirect 0.5
      });
    }));
    Object.keys(GROUPS).forEach(g=>{
      if(!(paper[g] > 0.05)) return;
      if(!ratio[g]) ratio[g] = [];
      ratio[g].push((app[g] || 0) / paper[g]);
    });
  })))));
  const out = {};
  Object.keys(ratio).forEach(g=>{
    const v = ratio[g].slice().sort((a, c)=> a - c);
    const q = f=> v[Math.min(v.length - 1, Math.floor(f * v.length))];
    out[g] = {name: GROUPS[g].name, n: v.length, median: +q(0.5).toFixed(3),
              p10: +q(0.10).toFixed(3), p90: +q(0.90).toFixed(3)};
  });
  return {n, out};
});

console.log("plans:", res.n);
console.log("\nHow many APP sets equal one PAPER set, per muscle");
console.log("muscle           median   p10    p90");
Object.keys(res.out).sort((a,c)=> res.out[c].median - res.out[a].median).forEach(g=>{
  const r = res.out[g];
  console.log(r.name.padEnd(16) + r.median.toFixed(3).padStart(7)
    + r.p10.toFixed(3).padStart(7) + r.p90.toFixed(3).padStart(7));
});
const all = Object.keys(res.out).map(g=> res.out[g].median).sort((a,c)=> a - c);
console.log("\nacross muscles: median " + all[Math.floor(all.length/2)].toFixed(3)
  + ", range " + all[0].toFixed(3) + " to " + all[all.length-1].toFixed(3));
console.log("errors:", errs.length ? errs.slice(0,3).join(" | ") : "none");
await b.close();
