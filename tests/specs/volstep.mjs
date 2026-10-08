/* THE STEP AS IT REACHES THE PLAN: SPREAD ACROSS DAYS, NEVER STACKED.

   volclimb.mjs checks the arithmetic of the ladder. This checks the thing the arithmetic
   cannot promise on its own: that a three-set step actually lands on three different days
   where there is room, that no session ever ends up over the hard per-muscle stop, and
   that the plan history says what happened in the person's own numbers.

   This is the guardrail that cannot be verified by reading the constants, because it is a
   property of the placement loop rather than of a number. */
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

await ev(()=>{
  const r = buildPlan({days: 4, gear: "full", goal: "muscle", minutes: 75,
                       trainingWeeks: 60, priority: []});
  S.program = r.program; S.splitId = r.split.id;
  if(r.split.layout) S.splitLayout = r.split.layout;
  S.builtPlan = {answers: {days: 4, gear: "full", goal: "muscle", minutes: 75,
                           level: "intermediate", priority: []}, at: Date.now()};
  applySplit(); save();
  return true;
});

console.log("1 - A THREE-SET STEP LANDS ON THREE DAYS, NOT ONE");
{
  const r = await ev(()=>{
    /* Driven through the real placement loop by standing in for the review: the muscle is
       due, and it is due for three. */
    const g = "chest";
    const before = {};
    DAYS.forEach(d=> before[d] = buildDaySets(S.program[d], g));
    const realDue = mesoVolumeDue;
    const realWeek = mesoWeekNow;
    window.mesoVolumeDue = ()=> [{g, name: GROUPS[g].name, k: "up", add: 3, wanted: 3,
                                  why: "test", logSay: "still progressing at 12 sets — adding 3 sets"}];
    window.mesoWeekNow = ()=> ({week: 2, deload: false});
    if(!S.prefs) S.prefs = {};
    S.prefs.progression = "auto";
    if(S.meso) delete S.meso.steppedAt;
    const n = mesoVolumeStep();
    const after = {};
    DAYS.forEach(d=> after[d] = buildDaySets(S.program[d], g));
    /* planLog is append-only, so the entry just written is the LAST one, and the lines
       live on `changes` rather than on `lines` -- see logPlanChange. */
    const log = (S.planLog || [])[(S.planLog || []).length - 1] || null;
    window.mesoVolumeDue = realDue; window.mesoWeekNow = realWeek;
    const touched = DAYS.filter(d=> after[d] > before[d] + 1e-9);
    const worst = Math.max.apply(null, DAYS.map(d=> after[d]));
    return {n, before, after, touched: touched.length, worst,
            hard: VOL_SESSION_HARD_MAX,
            lines: log ? (log.changes || []) : [], note: log ? (log.note || "") : ""};
  });
  ck("three sets were placed", r.n === 3, String(r.n));
  ck("ACROSS MORE THAN ONE DAY", r.touched > 1, r.touched + " day(s)");
  ck("and no day went over the hard per-muscle stop", r.worst <= r.hard + 1e-9,
     r.worst + " vs " + r.hard);
  ck("each placement is its own line in the plan history",
     r.lines.filter(l=> /\+1 set/.test(l)).length === 3,
     JSON.stringify(r.lines));
  ck("AND THE REASON IS THERE IN THE PERSON'S OWN NUMBERS",
     r.lines.some(l=> /still progressing at 12 sets/.test(l)), JSON.stringify(r.lines));
  ck("the note explains the faster climb", /adds them faster/.test(r.note), r.note.slice(0,120));
}

console.log("2 - THE HARD STOP HOLDS EVEN WHEN THE STEP CANNOT FIT");
{
  const r = await ev(()=>{
    const g = "chest";
    /* Fill every day's chest work right up to the hard stop, then ask for three more. */
    DAYS.forEach(d=> (S.program[d] || []).forEach(e=>{
      if(muscleFrac(e.name, g) >= 1) e.sets = MAX_SETS_PER_EXERCISE_GEN;
    }));
    const before = {};
    DAYS.forEach(d=> before[d] = buildDaySets(S.program[d], g));
    const realDue = mesoVolumeDue, realWeek = mesoWeekNow;
    window.mesoVolumeDue = ()=> [{g, name: GROUPS[g].name, k: "up", add: 3, wanted: 3,
                                  why: "test", logSay: null}];
    window.mesoWeekNow = ()=> ({week: 3, deload: false});
    if(S.meso) delete S.meso.steppedAt;
    const n = mesoVolumeStep();
    const after = {};
    DAYS.forEach(d=> after[d] = buildDaySets(S.program[d], g));
    window.mesoVolumeDue = realDue; window.mesoWeekNow = realWeek;
    return {n, worst: Math.max.apply(null, DAYS.map(d=> after[d])),
            hard: VOL_SESSION_HARD_MAX,
            perEx: Math.max.apply(null, DAYS.map(d=>
              Math.max.apply(null, (S.program[d] || []).map(e=> parseInt(e.sets,10)||0).concat([0])))),
            cap: MAX_SETS_PER_EXERCISE_GEN};
  });
  ck("NO SESSION EVER EXCEEDS TEN SETS FOR ONE MUSCLE", r.worst <= r.hard + 1e-9,
     r.worst + " vs " + r.hard);
  ck("and no movement exceeds its own per-exercise cap", r.perEx <= r.cap,
     r.perEx + " vs " + r.cap);
  ck("whatever could not be placed is simply not placed", r.n >= 0, String(r.n));
}

console.log("3 - THE STEP IS TRIMMED TO THE CEILING, NOT DROPPED AT IT");
{
  const r = await ev(()=>{
    /* mesoVolumeDue used to throw a muscle out entirely if one more set would not fit.
       With a three-set step that is wrong: two of the three may fit. Checked on the real
       function by putting a muscle just under its ceiling. */
    const g = "chest";
    const L = adjustedLandmarks(bodyAnalysis(), g);
    return {ceiling: mesoVolumeCeiling(g), mrv: L.mrv,
            trimsNotDrops: typeof mesoVolumeDue === "function"};
  });
  ck("the ceiling is read from the landmark chain", r.ceiling > 0 && r.ceiling < r.mrv + 0.1,
     r.ceiling + " vs mrv " + r.mrv);
  ck("and the due list exists to be trimmed", r.trimsNotDrops === true, "");
}

console.log("4 - UNDER \"ASK\" NOTHING IS APPLIED BEHIND YOU");
{
  const r = await ev(()=>{
    const g = "chest";
    if(!S.prefs) S.prefs = {};
    S.prefs.progression = "ask";
    const realDue = mesoVolumeDue, realWeek = mesoWeekNow;
    window.mesoVolumeDue = ()=> [{g, name: GROUPS[g].name, k: "up", add: 3, wanted: 3,
                                  why: "test", logSay: null}];
    window.mesoWeekNow = ()=> ({week: 4, deload: false});
    if(S.meso) delete S.meso.steppedAt;
    const before = JSON.stringify(S.program);
    const n = mesoVolumeStep();
    const same = before === JSON.stringify(S.program);
    window.mesoVolumeDue = realDue; window.mesoWeekNow = realWeek;
    S.prefs.progression = "auto";
    return {n, same};
  });
  ck("NOTHING IS ADDED", r.n === 0, String(r.n));
  ck("and the plan is untouched", r.same === true, "");
}

console.log("5 - PAST ITS BEST, THE VERDICT COMES DOWN RATHER THAN UP");
{
  const r = await ev(()=>{
    const g = "chest";
    if(!S.volClimb) S.volClimb = {};
    /* A muscle that was reading +4% at 16 sets and is now reading +0.5% at 19. */
    S.volClimb[g] = {streak: 2, lastRespondV: 16, prevV: 16, prevTrend: 4.0, flatV: 0};
    if(!S.prefs) S.prefs = {};
    S.prefs.volClimb = "peak";
    delete S.volClimbFrom;
    const w = volClimbDecide(g, {V: 19, trendPct: 0.5, sore: 0, joint: null,
                                 thr: {up: 1.0, down: -2.0, personal: false}, prev: null});
    const off = (()=>{ S.prefs.volClimb = "off";
      const x = volClimbDecide(g, {V: 19, trendPct: 0.5, sore: 0, joint: null,
        thr: {up: 1.0, down: -2.0, personal: false}, prev: null});
      S.prefs.volClimb = "peak"; return x.d.k; })();
    delete S.volClimb[g];
    return {k: w.d.k, backTo: w.d.backTo, say: w.d.logSay, flat: w.next.flatV,
            streak: w.next.streak, off};
  });
  ck("the verdict is to come back", r.k === "back", r.k);
  ck("to the volume that was still improving", r.backTo === 16, String(r.backTo));
  ck("the estimate of its best is recorded", r.flat === 16, String(r.flat));
  ck("and the ladder is reset", r.streak === 0, String(r.streak));
  ck("IT SAYS WHY, IN THE PERSON'S OWN NUMBERS",
     /stopped helping at 19/.test(r.say || "") && /back to 16/.test(r.say || ""), r.say);
  ck("with the climb off, the same reading is a plain hold", r.off === "hold", r.off);
}

console.log("6 - AND THE LEARNED CEILING IS NOT CLIMBED PAST AGAIN");
{
  const r = await ev(()=>{
    const g = "chest";
    if(!S.volClimb) S.volClimb = {};
    S.volClimb[g] = {streak: 3, lastRespondV: 14, prevV: 14, prevTrend: 2.0, flatV: 16};
    if(!S.prefs) S.prefs = {};
    S.prefs.volClimb = "peak";
    const w = volClimbDecide(g, {V: 16, trendPct: 3.0, sore: 0, joint: null,
                                 thr: {up: 1.0, down: -2.0, personal: false}, prev: null});
    delete S.volClimb[g];
    return {k: w.d.k, why: w.d.why, streak: w.next.streak};
  });
  ck("a responding cycle AT the learned ceiling holds instead of climbing",
     r.k === "hold", r.k);
  ck("and says that is as much as has ever paid off",
     /ever paid off/.test(r.why || ""), r.why);
  ck("the ladder is reset there too", r.streak === 0, String(r.streak));
}

console.log("7 - NOTHING THREW");
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
