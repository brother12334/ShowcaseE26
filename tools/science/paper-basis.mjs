/* COUNT A PLAN THE WAY THE PAPER COUNTED ONE.

   The curve in docs/data/pelland-hypertrophy-volume.json is stated in the paper's own
   units, and they are not this app's. Rather than converting with a per-muscle average
   ratio — which is an average over plans and wrong for any particular person — this
   counts each plan directly the paper's way, so the number compared against the curve is
   in the curve's units by construction.

   THE PAPER'S DEFINITION, VERBATIM (section 2.4):

     "For hypertrophy, direct sets were those in which the measured muscle(s) was likely
      to be the primary force generator in the exercise. Indirect sets were those in which
      the measured muscle(s) was likely to be meaningfully trained but not the primary
      force generator of the exercise (i.e., synergist)."

     Worked example: measuring biceps, 5 sets of curls plus 5 sets of rows gives 'total'
     10, 'fractional' 7.5, 'direct' 5. So a row pays the biceps half a set.

   THE CUT-OFF, SET FROM THEIR OWN DECISIONS. Table 1A lists every exercise they
   classified. Checked against this app's shares, the separation is clean:

     every pair they call DIRECT   — 17 of 17 — this app pays exactly 1.00
     every pair they call INDIRECT — this app pays 0.30 to 0.60

   The lowest share they are willing to call a meaningful synergist is 0.30 (the trapezius
   in a lat pulldown). So:

     f >= 1.0            -> 1 set     prime mover
     0.3 <= f < 1.0      -> 0.5 sets  meaningfully trained synergist
     f < 0.3             -> 0 sets    stabiliser

   AND GRIP AND BRACING ARE NOT TRAINING. A numeric cut-off alone cannot express this,
   because this app pays the forearms 0.35 for a barbell row — the same range as real
   synergy — when what the forearms are doing is holding the bar. The paper's wording is
   "meaningfully TRAINED", and a muscle contracting isometrically to stop something moving
   is not being trained through a range.

   So the three muscles whose involvement in a compound is grip or bracing count only when
   the movement is actually for them. The forearms earn a set from wrist work and carries,
   not from every row; the abs and obliques from direct core work, not from every squat.
   Nothing else is excluded: the trapezius keeps its half set in a row, because the paper
   explicitly classified it that way and it works through a range there. */
const DIRECT_MIN   = 1.0;
const SYNERGIST_MIN = 0.3;
const GRIP_OR_BRACE = ["forearms", "abs", "obliques"];

export const PAPER_BASIS_SRC = `
  export const DIRECT_MIN = ${DIRECT_MIN};
  export const SYNERGIST_MIN = ${SYNERGIST_MIN};
  export const GRIP_OR_BRACE = ${JSON.stringify(GRIP_OR_BRACE)};
  export function paperSetsFor(f, g){
    if(!(f > 0)) return 0;
    if(f >= DIRECT_MIN) return 1;
    if(GRIP_OR_BRACE.indexOf(g) > -1) return 0;
    return f >= SYNERGIST_MIN ? 0.5 : 0;
  }`;

import { boot, calm } from '../inspect/_boot.mjs';
const {b, p, errs} = await boot();
await calm(p);

const res = await p.evaluate((cfg)=>{
  const {DIRECT_MIN, SYNERGIST_MIN, GRIP_OR_BRACE} = cfg;
  const paperSets = (f, g)=>{
    if(!(f > 0)) return 0;
    if(f >= DIRECT_MIN) return 1;
    if(GRIP_OR_BRACE.indexOf(g) > -1) return 0;
    return f >= SYNERGIST_MIN ? 0.5 : 0;
  };
  const tally = {};
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
        app[g]   = (app[g]   || 0) + f * sets;
        paper[g] = (paper[g] || 0) + paperSets(f, g) * sets;
      });
    }));
    Object.keys(GROUPS).forEach(g=>{
      if(!tally[g]) tally[g] = {app: [], paper: []};
      tally[g].app.push(app[g] || 0);
      tally[g].paper.push(paper[g] || 0);
    });
  })))));
  const med = a=>{ const v = a.slice().sort((x, y)=> x - y); return v[Math.floor(v.length/2)]; };
  const out = {};
  Object.keys(tally).forEach(g=>{
    out[g] = {name: GROUPS[g].name, optional: !!GROUPS[g].optional,
              app: +med(tally[g].app).toFixed(2), paper: +med(tally[g].paper).toFixed(2)};
  });
  return {n, out};
}, {DIRECT_MIN, SYNERGIST_MIN, GRIP_OR_BRACE});

console.log("plans:", res.n, "| median weekly volume for the SAME plans, counted both ways\n");
console.log("muscle          app sets   paper sets   app/paper   old fixed ratio");
const OLD = {glutes:1.353, lats:1.150, delts_side:1.029, chest:1.000, upper_back:1.000,
  quads:1.000, triceps:0.950, delts_front:0.938, calves:0.914, biceps:0.912, abs:0.909,
  hams:0.900, lower_back:0.871, delts_rear:0.862, obliques:0.800, traps:0.749,
  forearms:0.720, adductors:0.700};
Object.keys(res.out).sort((a,c)=> res.out[c].paper - res.out[a].paper).forEach(g=>{
  const r = res.out[g];
  const ratio = r.paper > 0 ? (r.app / r.paper) : null;
  console.log((r.name + (r.optional ? "*" : "")).padEnd(15)
    + r.app.toFixed(1).padStart(8) + r.paper.toFixed(1).padStart(13)
    + (ratio == null ? "     n/a" : ratio.toFixed(3).padStart(12))
    + (OLD[g] ? OLD[g].toFixed(3).padStart(18) : "".padStart(18)));
});
console.log("\nerrors:", errs.length ? errs.slice(0,3).join(" | ") : "none");
await b.close();
