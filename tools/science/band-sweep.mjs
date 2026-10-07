/* THE 360-COMBINATION RE-MEASUREMENT, AGAINST THE NEW BANDS.

   Every plan the builder can produce — 5 day counts x 4 gear sets x 3 levels x 2 goals x 3
   time budgets — measured three ways for every muscle:

     app sets     what this app counts, graded shares, which is what the plan check uses;
     paper sets   the same plan counted the way the paper counted one (1 / 0.5 / 0), which
                  is the only unit the dose-response curve is stated in;
     band         where those paper sets fall on the efficiency bands derived from the
                  curve (volBandOf), which is the thing §5A added.

   And then the question that matters: does a plan the builder is happy with land where the
   science says it should? A builder that produces plans sitting under the floor, or out
   past the point where there is no evidence, is a builder disagreeing with the model it is
   supposed to be built on.

   Changes nothing. Prints the tables for docs/volume-science.md.
   Run: node tools/science/band-sweep.mjs                                                */
import { boot, calm } from '../inspect/_boot.mjs';
const {b, p, errs} = await boot();
await calm(p);

const res = await p.evaluate(()=>{
  const W = {beginner: 10, intermediate: 60, advanced: 300};
  const COMBOS = [];
  [2,3,4,5,6].forEach(days=> ["full","dumbbell","home","minimal"].forEach(gear=>
    ["beginner","intermediate","advanced"].forEach(level=>
      ["muscle","lean"].forEach(goal=> [45,60,75].forEach(minutes=>
        COMBOS.push({days, gear, level, goal, minutes}))))));

  /* Muscles the model is actually supposed to have an opinion about. The optional ones and
     the ones §3.3 showed score zero paper sets in every plan are reported separately rather
     than counted as failures — see the note under the table. */
  const SKIP = ["neck", "forearms", "obliques"];
  const KEYS = Object.keys(GROUPS).filter(g=> !GROUPS[g].optional && SKIP.indexOf(g) < 0);

  const bandCount = {};   // muscle -> band -> plans
  const rows = [];        // one per muscle, with medians
  const perMuscle = {};
  KEYS.forEach(g=>{ perMuscle[g] = {app: [], paper: [], band: {}, underFloor: 0,
                                    overCeil: 0, noEvidence: 0, inTarget: 0}; });
  let n = 0, failed = 0;
  /* Plan-level counts: a plan is "clean" if no muscle the model cares about is under the
     floor or out past the evidence. */
  let planClean = 0;
  const planProblems = [];

  COMBOS.forEach(c=>{
    let r;
    try{ r = buildPlan({days: c.days, gear: c.gear, goal: c.goal, minutes: c.minutes,
                        trainingWeeks: W[c.level], priority: []}); }
    catch(e){ failed++; return; }
    if(!r || !r.program){ failed++; return; }
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
        paper[g] = (paper[g] || 0) + paperSetsFor(f, g) * sets;
      });
    }));
    let bad = [];
    KEYS.forEach(g=>{
      const pv = paper[g] || 0;
      const band = volBandOf(pv);
      const m = perMuscle[g];
      m.app.push(app[g] || 0);
      m.paper.push(pv);
      m.band[band] = (m.band[band] || 0) + 1;
      bandCount[band] = (bandCount[band] || 0) + 1;
      if(pv < VOL_BANDS.floor){ m.underFloor++; bad.push(g + " under the floor (" + pv + ")"); }
      if(pv > VOL_BANDS.unknown){ m.noEvidence++; bad.push(g + " past the evidence (" + pv + ")"); }
      if(pv >= VOL_BANDS.knee && pv <= VOL_BANDS.useful) m.inTarget++;
    });
    if(!bad.length) planClean++;
    else planProblems.push({c, bad});
  });

  const med = a=>{ if(!a.length) return 0;
    const v = a.slice().sort((x, y)=> x - y); return v[Math.floor(v.length/2)]; };
  KEYS.forEach(g=>{
    const m = perMuscle[g];
    rows.push({g, name: GROUPS[g].name,
      app: +med(m.app).toFixed(1), paper: +med(m.paper).toFixed(1),
      band: volBandOf(med(m.paper)),
      underFloorPct: +(m.underFloor / n * 100).toFixed(1),
      inTargetPct: +(m.inTarget / n * 100).toFixed(1),
      noEvidencePct: +(m.noEvidence / n * 100).toFixed(1)});
  });

  /* And the muscles held out, reported rather than hidden. */
  const held = SKIP.concat(Object.keys(GROUPS).filter(g=> GROUPS[g].optional))
    .filter((x, i, a)=> a.indexOf(x) === i && GROUPS[x])
    .map(g=> ({g, name: GROUPS[g].name, optional: !!GROUPS[g].optional}));

  /* WHERE THE UNCLEAN PLANS ARE, which turns out to be the whole story. */
  const byDays = {}, byMin = {}, byGear = {};
  COMBOS.forEach(c=>{});
  planProblems.forEach(x=>{
    byDays[x.c.days] = (byDays[x.c.days] || 0) + 1;
    byMin[x.c.minutes] = (byMin[x.c.minutes] || 0) + 1;
    byGear[x.c.gear] = (byGear[x.c.gear] || 0) + 1;
  });
  const totDays = {}, totMin = {}, totGear = {};
  COMBOS.forEach(c=>{
    totDays[c.days] = (totDays[c.days] || 0) + 1;
    totMin[c.minutes] = (totMin[c.minutes] || 0) + 1;
    totGear[c.gear] = (totGear[c.gear] || 0) + 1;
  });
  return {n, failed, planClean, rows, bandCount, held,
          byDays, byMin, byGear, totDays, totMin, totGear,
          problems: planProblems.slice(0, 8),
          bands: VOL_BANDS};
});

console.log("THE 360-COMBINATION SWEEP, AGAINST THE BANDS DERIVED FROM THE CURVE\n");
console.log("plans built: " + res.n + (res.failed ? "  (failed to build: " + res.failed + ")" : ""));
console.log("bands: floor " + res.bands.floor + " | target " + res.bands.knee + "-"
  + res.bands.useful + " | earning " + (res.bands.useful + 1) + "-" + res.bands.expensive
  + " | thin to " + res.bands.thin + " | no evidence past " + res.bands.unknown + "\n");

const pad = (s, w)=> String(s).padEnd(w), padl = (s, w)=> String(s).padStart(w);
console.log(pad("muscle", 14) + padl("app sets", 10) + padl("paper sets", 12)
  + padl("band", 12) + padl("under floor", 13) + padl("in target", 11)
  + padl("no evidence", 13));
res.rows.sort((a, c)=> c.paper - a.paper).forEach(r=>{
  console.log(pad(r.name, 14) + padl(r.app.toFixed(1), 10) + padl(r.paper.toFixed(1), 12)
    + padl(r.band, 12) + padl(r.underFloorPct + "%", 13)
    + padl(r.inTargetPct + "%", 11) + padl(r.noEvidencePct + "%", 13));
});

console.log("\nplans with no muscle under the floor and none past the evidence: "
  + res.planClean + " of " + res.n
  + " (" + (res.planClean / res.n * 100).toFixed(1) + "%)");
const share = (hit, tot)=> Object.keys(tot).sort((a,c)=> Number(a) - Number(c))
  .map(k=> k + ": " + (hit[k] || 0) + "/" + tot[k]).join("   ");
console.log("\nwhere the rest are \u2014 by days a week:  " + share(res.byDays, res.totDays));
console.log("                    by minutes:     " + share(res.byMin, res.totMin));
console.log("                    by gear:        " + share(res.byGear, res.totGear));
if(res.problems.length){
  console.log("\nexamples of what goes wrong, which is the useful part:");
  res.problems.forEach(x=> console.log("  " + x.c.days + "d " + x.c.gear + " "
    + x.c.level + " " + x.c.goal + " " + x.c.minutes + "min — " + x.bad.join("; ")));
}
console.log("\nheld out of the pass/fail counts: "
  + res.held.map(h=> h.name + (h.optional ? " (optional)" : " (§3.3: zero paper sets)")).join(", "));
console.log("\nband totals across every muscle x plan: " + JSON.stringify(res.bandCount));
console.log("errors: " + (errs.length ? errs.slice(0, 3).join(" | ") : "none"));
await b.close();
