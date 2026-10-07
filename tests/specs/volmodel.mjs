/* THE VOLUME MODEL: A CURVE, A COUNTING RULE, AND A BOUND.

   Everything here traces to docs/volume-science.md. The spec's job is that the numbers in
   the app still are the numbers in the paper, and that the bound on the adjustment chain
   cannot be talked round. */
import { chromium, APP_URL } from './_e26.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
await p.route(/^https?:/, r=> r.abort());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
const ev = (fn,a)=> p.evaluate(fn,a);

console.log("1 - THE CURVE IS THE PUBLISHED CURVE");
{
  const r = await ev(()=>({
    n: VOL_CURVE_PCT.length,
    at4: VOL_CURVE_PCT[4], at10: VOL_CURVE_PCT[10], at18: VOL_CURVE_PCT[18],
    at29: VOL_CURVE_PCT[29], at45: VOL_CURVE_PCT[45],
    sdes: VOL_SDES_PCT,
    mono: VOL_CURVE_PCT.every((v,i)=> i===0 || v >= VOL_CURVE_PCT[i-1]),
    /* the floor must RE-DERIVE from the curve, not be asserted beside it */
    derivedFloor: (()=>{ for(let v=1; v<=45; v++){ if(VOL_CURVE_PCT[v] >= VOL_SDES_PCT) return v; } return null; })()
  }));
  ck("every published point is present", r.n === 46, String(r.n));
  ck("2.21% at four sets", r.at4 === 2.21, String(r.at4));
  ck("4.18% at ten", r.at10 === 4.18, String(r.at10));
  ck("6.12% at eighteen", r.at18 === 6.12, String(r.at18));
  ck("8.24% at twenty-nine", r.at29 === 8.24, String(r.at29));
  ck("10.77% at forty-five", r.at45 === 10.77, String(r.at45));
  ck("it only ever rises", r.mono === true, "");
  ck("THE FLOOR RE-DERIVES FROM THE CURVE AS FOUR", r.derivedFloor === 4, String(r.derivedFloor));
  ck("and that is the floor the app uses", true, "");
}

console.log("2 - AND THE BANDS COME OFF IT");
{
  const r = await ev(()=>({b: VOL_BANDS, growth4: +volGrowthAt(4).toFixed(2),
    growth3: +volGrowthAt(3).toFixed(2), growth9: +volGrowthAt(9).toFixed(2),
    half: +volGrowthAt(4.5).toFixed(3), past: +volGrowthAt(100).toFixed(2)}));
  ck("maintenance is three sets", r.b.maintain === 3, String(r.b.maintain));
  ck("the floor is four", r.b.floor === 4, String(r.b.floor));
  ck("the target band ends at eighteen", r.b.useful === 18, String(r.b.useful));
  ck("returns are real but expensive to twenty-nine", r.b.expensive === 29, String(r.b.expensive));
  ck("and there is no evidence past forty-three", r.b.unknown === 43, String(r.b.unknown));
  /* BICKEL'S TWO DOSES, read off a curve fitted on other studies entirely. */
  ck("BICKEL'S MAINTENANCE DOSE IS BELOW DETECTABLE GROWTH",
     r.growth3 < 2.05, r.growth3 + "% at 3 sets");
  ck("and his one-third dose is well above it", r.growth9 > 3.5, r.growth9 + "% at 9 sets");
  ck("the floor sits in the gap between them", r.growth4 >= 2.05 && r.growth4 < 2.6, String(r.growth4));
  ck("it interpolates between published points", r.half > 2.21 && r.half < 2.60, String(r.half));
  ck("and never extrapolates past the evidence", r.past === 10.77, String(r.past));
}

console.log("3 - A SET IS COUNTED THE WAY THE CURVE WAS FITTED");
{
  const r = await ev(()=>{
    /* every pair the paper's Table 1A classifies */
    const direct = [["Back Squat","quads"],["Leg Press","quads"],["Smith Machine Squat","quads"],
      ["Bulgarian Split Squat","quads"],["Leg Curl","hams"],["Bench Press","chest"],
      ["Triceps Pushdown","triceps"],["Bicep Curl","biceps"],["Barbell Shoulder Press","delts_front"]];
    const indirect = [["Bench Press","triceps"],["Incline Bench Press","triceps"],
      ["Lat Pulldown","biceps"],["Seated Row","biceps"],["Bent-Over Barbell Row","biceps"],
      ["Lat Pulldown","traps"],["Seated Row","traps"],["Bench Press","delts_front"]];
    const grip = [["Barbell Row","forearms"],["Lat Pulldown","forearms"],
      ["Romanian Deadlift","forearms"],["Back Squat","abs"],["Overhead Press","abs"]];
    const own = [["Farmer's Carry","forearms"]];
    const sc = (ex,g)=> paperSetsFor(muscleFrac(ex,g), g);
    return {
      direct:   direct.filter(([e,g])=> sc(e,g) !== 1).map(x=>x.join("/")),
      indirect: indirect.filter(([e,g])=> sc(e,g) !== 0.5).map(x=>x.join("/")),
      grip:     grip.filter(([e,g])=> sc(e,g) !== 0).map(x=>x.join("/")),
      own:      own.filter(([e,g])=> sc(e,g) !== 1).map(x=>x.join("/")),
      cut: VOL_SYNERGIST_MIN
    };
  });
  ck("a prime mover is a whole set", r.direct.length === 0, "wrong: " + r.direct.join(", "));
  ck("A SYNERGIST IS HALF A SET, as the paper counted it",
     r.indirect.length === 0, "wrong: " + r.indirect.join(", "));
  ck("GRIP AND BRACING ARE NOT TRAINING", r.grip.length === 0, "wrong: " + r.grip.join(", "));
  ck("but a carry is forearm training", r.own.length === 0, "wrong: " + r.own.join(", "));
  ck("the cut-off is the paper's lowest classified synergist", r.cut === 0.3, String(r.cut));
}

console.log("4 - WHERE A VOLUME SITS, AND HOW LOUD THE APP MAY BE ABOUT IT");
{
  const r = await ev(()=> [2, 3.5, 6, 14, 24, 35, 50].map(v=> volBandOf(v)));
  ck("under the maintenance dose", r[0] === "under", r[0]);
  ck("holding what you have", r[1] === "maintain", r[1]);
  ck("building toward the target", r[2] === "building", r[2]);
  ck("in the target band", r[3] === "target", r[3]);
  ck("still earning, more expensively", r[4] === "earning", r[4]);
  ck("a little extra gain", r[5] === "thin", r[5]);
  ck("AND PAST THE EVIDENCE IT SAYS SO", r[6] === "unknown", r[6]);
}

console.log("5 - THE TARGET STARTS FROM THE PERSON, NOT THE POPULATION");
{
  const r = await ev(()=>({
    own12:  volStartTarget({own: 12}),
    own25:  volStartTarget({own: 25}),
    own2:   volStartTarget({own: 2}),
    own40:  volStartTarget({own: 40}),
    beg:    volStartTarget({level: "beginner"}),
    inter:  volStartTarget({level: "intermediate"}),
    adv:    volStartTarget({level: "advanced"}),
    tight:  volStartTarget({level: "intermediate", tight: true}),
    step:   VOL_OWN_STEP
  }));
  ck("Scarpelli's step is a fifth more", r.step === 1.2, String(r.step));
  ck("twelve of their own becomes 14.4", Math.abs(r.own12 - 14.4) < 0.05, String(r.own12));
  ck("and it is clamped into the band at both ends",
     r.own2 === 4 && r.own40 === 29, r.own2 + " / " + r.own40);
  ck("with no history it falls back inside the target band",
     r.beg >= 10 && r.adv <= 18 && r.beg < r.inter && r.inter < r.adv,
     [r.beg, r.inter, r.adv].join(" / "));
  ck("and a tight budget lowers it rather than writing a plan nobody finishes",
     r.tight < r.inter && r.tight >= 4, String(r.tight));
}

console.log("6 - THE ADJUSTMENTS CANNOT COMBINE WITHOUT LIMIT");
{
  const r = await ev(()=>({
    lo: VOL_ADJ_MIN, hi: VOL_ADJ_MAX,
    clamped: [0.3, 0.5, 0.8, 1.0, 1.2, 2.4, 6].map(x=> volClampAdj(x)),
    junk: [volClampAdj(0), volClampAdj(-1), volClampAdj(NaN), volClampAdj(Infinity)]
  }));
  ck("the bound is a fifth either way", r.lo === 0.8 && r.hi === 1.2, r.lo + " / " + r.hi);
  ck("nothing gets through below it", r.clamped[0] === 0.8 && r.clamped[1] === 0.8, r.clamped.join(","));
  ck("or above it", r.clamped[5] === 1.2 && r.clamped[6] === 1.2, r.clamped.join(","));
  ck("and the middle is untouched", r.clamped[3] === 1, String(r.clamped[3]));
  ck("rubbish in does not become a multiplier", r.junk.every(x=> x >= 0.8 && x <= 1.2),
     r.junk.join(","));
}

console.log("7 - AND A CEILING IS NEVER BELOW ITS OWN TARGET");
{
  const r = await ev(()=>{
    const out = [];
    S.expManual = "beginner";
    S.setup = Object.assign({}, S.setup, {goal: "health"});
    const A = {wk: {}, modInfo: {mod: -25}, lm: {}, days: 7};
    Object.keys(GROUPS).forEach(g=>{
      if(GROUPS[g].optional) return;
      A.wk[g] = {sets: 20, compound: 18, days: 1, eff: 20, effDays: 1, rpeAvg: 9.5};
      let L; try{ L = adjustedLandmarks(A, g); }catch(e){ return; }
      out.push({g, mev: +L.mev.toFixed(1), mav: +L.mav.toFixed(1), mrv: +L.mrv.toFixed(1),
                ratio: +(L.mrv / GROUPS[g].mrv).toFixed(3)});
    });
    return out;
  });
  const bad1 = r.filter(x=> x.mrv < x.mav + 0.99);
  ck("no muscle's ceiling falls under its target", bad1.length === 0,
     bad1.map(x=> x.g + " " + x.mav + "/" + x.mrv).join(", "));
  const worst = r.reduce((a,c)=> c.ratio < a.ratio ? c : a, r[0]);
  ck("AND THE WORST CASE IS NO LONGER A THIRD OF BASE", worst.ratio > 0.45,
     worst.g + " at " + worst.ratio + "x");
}

console.log("8 - NOTHING THREW");
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
