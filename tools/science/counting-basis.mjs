/* HOW MUCH OF EACH MUSCLE'S COUNTED VOLUME IS SOMEBODY ELSE'S SET.

   INDIRECT_BASIS_CORRECTION exists because this app pays fractional credit to every
   assisting muscle, while the published landmark tables were written with direct work
   chiefly in mind. Five of its entries were set by hand (glutes 1.5, front delts 1.5,
   traps / lower back / adductors 1.4) on an argument rather than a measurement.

   This measures it. For every one of the 360 builder combinations, and for every muscle,
   it splits the weekly counted volume into the part that comes from movements whose
   PRIME MOVER this muscle is (share >= 1.0) and the part collected from everything else,
   then reports the distribution of the indirect share across all those plans.

   Nothing here changes the app. It prints numbers for docs/volume-science.md. */
import { boot, calm } from '../inspect/_boot.mjs';

const {b, p, errs} = await boot();
await calm(p);

const rows = await p.evaluate(()=>{
  const out = {};
  const tally = {};
  const add = (g, direct, indirect)=>{
    if(!tally[g]) tally[g] = [];
    const tot = direct + indirect;
    if(tot > 0.05) tally[g].push(indirect / tot);
  };
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
    const direct = {}, indirect = {};
    ids.forEach(wid=> (r.program[wid] || []).forEach(e=>{
      const sets = parseInt(e.sets, 10) || 0;
      if(!sets) return;
      const m = musclesFor(e.name) || {};
      Object.keys(m).forEach(g=>{
        const f = m[g];
        if(!(f > 0)) return;
        if(f >= 1) direct[g] = (direct[g] || 0) + f * sets;
        else indirect[g] = (indirect[g] || 0) + f * sets;
      });
    }));
    Object.keys(GROUPS).forEach(g=> add(g, direct[g] || 0, indirect[g] || 0));
  })))));
  Object.keys(tally).forEach(g=>{
    const v = tally[g].slice().sort((a, c)=> a - c);
    if(!v.length) return;
    const q = f=> v[Math.min(v.length - 1, Math.floor(f * v.length))];
    out[g] = {name: GROUPS[g].name, plans: v.length,
              median: +q(0.5).toFixed(3), p25: +q(0.25).toFixed(3), p75: +q(0.75).toFixed(3),
              mean: +(v.reduce((t, x)=> t + x, 0) / v.length).toFixed(3),
              optional: !!GROUPS[g].optional,
              ibc: INDIRECT_BASIS_CORRECTION[g] || 1};
  });
  return {n, out};
});

console.log("plans measured:", rows.n);
console.log("");
console.log("muscle          plans  indirect share (median)   p25    p75    current IBC");
const order = Object.keys(rows.out).sort((a, c)=> rows.out[c].median - rows.out[a].median);
order.forEach(g=>{
  const r = rows.out[g];
  console.log(
    (r.name + (r.optional ? " *" : "")).padEnd(16)
    + String(r.plans).padStart(5)
    + (r.median * 100).toFixed(1).padStart(12) + "%"
    + (r.p25 * 100).toFixed(1).padStart(9) + "%"
    + (r.p75 * 100).toFixed(1).padStart(7) + "%"
    + String(r.ibc).padStart(14));
});
console.log("\n* optional group, not measured by the plan check");
console.log("errors:", errs.length ? errs.slice(0,3).join(" | ") : "none");
await b.close();
