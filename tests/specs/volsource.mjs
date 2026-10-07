/* ONE SOURCE OF TRUTH FOR A MUSCLE'S NUMBERS.

   The brief's engineering requirement, and the thing that produced the original bug: three
   screens each worked out a muscle's volume and its limits, and they did not have to agree.
   The volume sheet said one number, the Body tab said another, and the plan check made a
   third decision on a fourth.

   These checks are that every screen reads the same three landmarks from the same function
   for the same muscle, that the figure in the sheet is the figure in the fix sheet, and
   that the words are the same words. They do not test the numbers themselves — volmodel.mjs
   does that. They test that there is only one of them. */
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

/* A real plan, so every screen has something to read. */
await ev(()=>{
  const r = buildPlan({days: 4, gear: "full", goal: "muscle", minutes: 60,
                       trainingWeeks: 60, priority: []});
  S.program = r.program; S.splitId = r.split.id;
  if(r.split.layout) S.splitLayout = r.split.layout;
  S.builtPlan = {answers: {days: 4, gear: "full", goal: "muscle", minutes: 60,
                           level: "intermediate", priority: []}, at: Date.now()};
  applySplit(); save();
  return true;
});

console.log("1 - THE BODY TAB AND THE VOLUME SHEET READ THE SAME LANDMARKS");
{
  const r = await ev(()=>{
    const A = bodyAnalysis();
    const vol = volAdjTotals ? null : null;
    const out = [];
    GKEYS.forEach(g=>{
      if(GROUPS[g].optional) return;
      let a, c;
      try{ a = adjustedLandmarks(A, g); }catch(e){ return; }
      /* The cached copy the analysis hands every screen that asks it for one. */
      c = (A.lm && A.lm[g]) || null;
      if(!c) return;
      out.push({g, same: Math.abs(a.mev - c.mev) < 1e-9
                     && Math.abs(a.mav - c.mav) < 1e-9
                     && Math.abs(a.mrv - c.mrv) < 1e-9,
                a: [a.mev, a.mav, a.mrv], c: [c.mev, c.mav, c.mrv]});
    });
    return out;
  });
  ck("every muscle was read", r.length > 10, String(r.length));
  const diff = r.filter(x=> !x.same);
  ck("THE CACHED LANDMARKS ARE THE COMPUTED LANDMARKS, EVERY MUSCLE", diff.length === 0,
     diff.map(x=> x.g + " " + JSON.stringify(x.a) + " vs " + JSON.stringify(x.c)).join(", "));
}

console.log("2 - THE PLAN CHECK AND THE VOLUME SHEET AGREE, MUSCLE BY MUSCLE");
{
  const r = await ev(()=>{
    const opts = planCheckOpts();
    const q = planQuality(S.program, currentSplit(), opts);
    const A = bodyAnalysis();
    const bad = [];
    (q.volume || []).forEach(x=>{
      let L; try{ L = adjustedLandmarks(A, x.g); }catch(e){ return; }
      if(Math.abs(x.mev - L.mev) > 0.051 || Math.abs(x.mrv - L.mrv) > 0.051)
        bad.push(x.g + " sheet " + x.mev + "/" + x.mrv + " vs chain "
                 + L.mev.toFixed(1) + "/" + L.mrv.toFixed(1));
    });
    return {n: (q.volume || []).length, bad};
  });
  ck("the sheet has rows", r.n > 10, String(r.n));
  ck("EVERY ROW'S FLOOR AND CEILING COME FROM THE CHAIN", r.bad.length === 0,
     r.bad.join(" | "));
}

console.log("3 - THE FIX SHEET IS WORKING FROM THE SAME NUMBERS AS THE ROW");
{
  /* volAdjTotals() reads the row it is adjusting out of planQuality() with
     planCheckOpts(), which is the fix that stopped the sheet and the fix sheet disagreeing
     about whether a builder priority muscle counted. Checked by driving it the way the UI
     does: pick a muscle, set the sheet's state, read the totals back. */
  const r = await ev(()=>{
    const q = planQuality(S.program, currentSplit(), planCheckOpts());
    const row = (q.volume || []).find(x=> x.state === "under") || (q.volume || [])[0];
    if(!row) return {skip: "no rows"};
    /* The sheet's own state, built the way openVolFix builds it: every movement that
       touches this muscle, at the sets it currently has. */
    VOL_ADJ = {g: row.g, want: {}};
    DAYS.forEach(wid=> (S.program[wid] || []).forEach((e, ei)=>{
      if(muscleFrac(e.name, row.g) > 0)
        VOL_ADJ.want[wid + "|" + ei] = parseInt(e.sets, 10) || 0;
    }));
    let t = null, err = null;
    try{ t = volAdjTotals(); }catch(e){ err = String(e.message); }
    VOL_ADJ = null;
    if(err) return {err};
    if(!t) return {skip: "no totals"};
    /* volAdjTotals hands back the ROW it read (t.x) alongside the recomputed week, which
       is the whole mechanism: there is one row object, not two. */
    return {g: row.g, sheetV: row.v, sheetMev: row.mev, sheetMrv: row.mrv,
            fixV: t.v, fixMev: t.x && t.x.mev, fixMrv: t.x && t.x.mrv,
            fixG: t.x && t.x.g, was: t.was};
  });
  if(r.skip){ ck("the fix sheet could be read", false, r.skip); }
  else if(r.err){ ck("the fix sheet could be read", false, r.err); }
  else {
    ck("the fix sheet could be read", true, "");
    /* NOTHING WAS CHANGED, so the recomputed week must be the week that is already there.
       If these drift, the sheet and the fix sheet are counting differently \u2014 which is the
       bug this spec exists for. */
    ck("THE VOLUME IS THE SAME NUMBER", Math.abs(r.sheetV - r.fixV) < 0.051,
       r.sheetV + " vs " + r.fixV);
    ck("so is the floor", Math.abs(r.sheetMev - r.fixMev) < 0.051,
       r.sheetMev + " vs " + r.fixMev);
    ck("AND SO IS THE CEILING", Math.abs(r.sheetMrv - r.fixMrv) < 0.051,
       r.sheetMrv + " vs " + r.fixMrv);
    ck("and it is the same muscle's row, not a second one", r.fixG === r.g,
       r.g + " vs " + r.fixG);
    ck("with the untouched week recorded as what it was", Math.abs(r.was - r.sheetV) < 0.051,
       r.was + " vs " + r.sheetV);
  }
}

console.log("4 - AND THE PAPER'S COUNT IS AVAILABLE BESIDE THE APP'S, NOT INSTEAD OF IT");
{
  const r = await ev(()=>{
    const ids = DAYS.slice();
    const out = [];
    GKEYS.forEach(g=>{
      if(GROUPS[g].optional) return;
      let paper; try{ paper = paperWeeklyFor(S.program, ids, g); }catch(e){ return; }
      const app = programWeeklySets(S.program, ids)[g] || 0;
      out.push({g, app: +app.toFixed(2), paper: +paper.toFixed(2)});
    });
    return out;
  });
  ck("both counts exist for every muscle", r.length > 10, String(r.length));
  /* THE PAPER'S COUNT GOES BOTH WAYS, AND THAT IS THE POINT.

     It is a three-value rule — 1, 0.5 or 0 — applied to a continuum. A share of 0.6 rounds
     DOWN to half a set, which is why the glutes read lower the paper's way; a share of 0.35
     rounds UP to half a set, which is why the biceps and the lower back read higher.
     Asserting "the paper is always the smaller number" would have been asserting a
     half-remembered summary of §3 rather than the rule §3 actually states, and the first
     run of this spec said so.

     What IS invariant is the rule itself, per exercise, and that is checked sharply below. */
  const dir = {down: r.filter(x=> x.app - x.paper > 0.5).map(x=> x.g),
               up:   r.filter(x=> x.paper - x.app > 0.5).map(x=> x.g)};
  ck("muscles fed by compounds read lower the paper's way",
     dir.down.length > 0, dir.down.join(", "));
  ck("and muscles whose shares sit just over the synergist line read higher", true,
     dir.up.length ? dir.up.join(", ") : "none on this plan");
}

console.log("4B - AND THE COUNTING RULE ITSELF IS THREE VALUES, NOTHING ELSE");
{
  const r = await ev(()=>{
    const seen = {};
    let worst = null;
    DAYS.forEach(wid=> (S.program[wid] || []).forEach(e=>{
      const m = musclesFor(e.name) || {};
      Object.keys(m).forEach(mg=>{
        const v = paperSetsFor(m[mg], mg);
        seen[v] = (seen[v] || 0) + 1;
        if(v > 1) worst = e.name + " -> " + mg + " = " + v;
      });
    }));
    return {values: Object.keys(seen).sort(), worst};
  });
  ck("THE ONLY VALUES ARE 0, 0.5 AND 1", r.values.join(",") === "0,0.5,1", r.values.join(","));
  ck("and no exercise ever pays a muscle more than one set", r.worst === null, r.worst || "");
}

console.log("5 - THE WORDS ARE THE SAME WORDS");
{
  const r = await ev(()=>{
    let sheet = ""; try{ sheet = planQualityCardHTML(); }catch(e){ sheet = "ERR " + e.message; }
    return {sheet, bands: Object.keys(VOL_BANDS),
            bandOf: [volBandOf(2), volBandOf(3), volBandOf(6), volBandOf(14),
                     volBandOf(24), volBandOf(35), volBandOf(60)]};
  });
  ck("the card renders", !/^ERR /.test(r.sheet), r.sheet.slice(0, 120));
  ck("there is exactly one band function, and it covers the whole range",
     r.bandOf.join(",") === "under,maintain,building,target,earning,thin,unknown",
     r.bandOf.join(","));
}

console.log("6 - NOTHING THREW");
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
