import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1100}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} document.body.classList.remove('ai-open','onboarding'); hideModal();
  const af=document.getElementById('aiFull'); if(af) af.hidden=true;
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.priorTrainingWeeks=100; S.priorAsked=1;
  S.splitId=DEFAULT_SPLIT; applySplit(); S.cycleStart=Date.now()-3*86400e3;
  save();
});
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

console.log("1 - ONE SESSION HAS A CEILING THE APP WILL NOT PLAN PAST");
{
  const r = await p.evaluate(()=>{
    const wid = ROTATION[0];
    // a chest day already carrying nine sets of direct pressing
    S.program = {}; [...new Set(ROTATION)].forEach(w=> S.program[w]=[]);
    S.program[wid]=[{name:"Barbell Bench Press", sets:5, reps:"8-12"},
                    {name:"Machine Chest Press", sets:5, reps:"8-12"}];
    save();
    const A = bodyAnalysis();
    const before = planSessionSets("chest", wid);
    const sp = spreadPlan(A, "chest", 6, []);
    const after = before + (sp ? sp.adds.filter(a=> a.wid===wid)
      .reduce((t,a)=> t + (a.to-a.from)*a.frac, 0) : 0);
    return {before: r1(before), after: r1(after), max: SESSION_SETS_MAX, info: SESSION_SETS_INFO,
            plan: sp ? sp.adds.map(a=> a.wid+":"+a.name+" "+a.from+"→"+a.to).join(", ") : "(none)",
            newDays: sp ? (sp.newExs||[]).length : 0};
  });
  console.log("     " + r.before + " sets of chest on that day → " + r.after);
  console.log("     plan: " + r.plan + (r.newDays ? "  (+" + r.newDays + " on another day)" : ""));
  ck("the day starts near the cap", r.before >= 6, String(r.before));
  ck("and the plan does not push it past it", r.after <= r.max + 0.01, r.after+" vs "+r.max);
}

console.log("2 - THE WEEKLY VERDICTS SAY WHAT THEY MEAN");
{
  const r = await p.evaluate(()=>{
    const L = {mev:10, mav:18, mrv:24};
    return {under: volState("chest", 6, L, {}), opt: volState("chest", 14, L, {}),
            high: volState("chest", 21, L, {}), over: volState("chest", 33, L, {}),
            flatAt: WEEKLY_SETS_FLAT};
  });
  ck("below the floor is maintenance, not failure", r.under.label==="maintenance range", r.under.label);
  ck("and it says what that buys", /hold the muscle/.test(r.under.txt), r.under.txt);
  ck("the productive window is 'productive'", r.opt.label==="productive", r.opt.label);
  ck("above target names the trade-off", r.high.label==="high" && /costs more recovery/.test(r.high.txt), r.high.txt);
  ck("the top band is about YOUR limit", /above the .* this app estimates you recover from/.test(r.over.txt), r.over.txt);
  ck("and past 31 sets it says the research runs out", /research stops finding more growth/.test(r.over.txt), r.over.txt);
  console.log("     " + r.over.txt);
}

console.log("3 - A NUMBER NOBODY HAS LEARNED ANYTHING ABOUT SAYS SO");
{
  const r = await p.evaluate(()=>{
    S.lmCal={}; S.lmCalObs={}; save();
    const c = landmarkConfidence("chest");
    return {c, range: fmtLandmarkRange(14, c)};
  });
  ck("it is called a population estimate", r.c.label==="Population estimate", r.c.label);
  ck("with the widest range", Math.abs(r.c.pct-0.30)<0.001, String(r.c.pct));
  ck("and the range is drawn around the figure", /^10–18$/.test(r.range), r.range);
}

console.log("4 - IT NARROWS AS THE APP LEARNS");
{
  const r = await p.evaluate(()=>{
    const out = {};
    S.lmCal={chest:{mev:1.1, mav:1.1, mrv:1.1, blocks:1, w:calWeight(1)}};
    out.partial = landmarkConfidence("chest");
    S.lmCal={chest:{mev:1.1, mav:1.1, mrv:1.1, blocks:3, w:calWeight(3)}};
    out.personal = landmarkConfidence("chest");
    return out;
  });
  ck("one block is partly personalised", r.partial.label==="Partly personalised", r.partial.label);
  ck("at 20%", Math.abs(r.partial.pct-0.20)<0.001, String(r.partial.pct));
  ck("three blocks is based on your training", r.personal.label==="Based on your training", r.personal.label);
  ck("at 10%", Math.abs(r.personal.pct-0.10)<0.001, String(r.personal.pct));
}

console.log("5 - EVERY CHANGE TO A LANDMARK KEEPS ITS REASON");
{
  const r = await p.evaluate(()=>{
    S.lmWhy={}; S.lmFloor={}; S.lmMrv={}; save();
    setManualLandmark("chest","mev",12);
    setManualLandmark("chest","mev",14);
    setManualLandmark("chest","mev",null);
    S.lmCalObs={}; S.lmCal={};
    recordObservation("chest","mrv", 24, 18);      // a block that carried more than predicted
    const hist = landmarkHistory("chest","mev");
    const cal = landmarkHistory("chest","mrv");
    return {hist, cal, words: LM_WHY_WORD};
  });
  ck("three changes are on the record", r.hist.length===3, JSON.stringify(r.hist));
  ck("newest first", r.hist[0].src==="cleared", r.hist[0].src);
  ck("and it knows you set the other two", r.hist[1].src==="you" && r.hist[2].src==="you", "");
  ck("a calibration that moves a landmark is recorded too", r.cal.length===1 && r.cal[0].src==="calibration",
     JSON.stringify(r.cal));
  console.log("     " + (r.cal[0] ? r.cal[0].note : ""));
}

console.log("6 - THE CHAIN OPENS AND SHOWS THE LOT");
{
  const r = await p.evaluate(()=>{
    openLandmarkChain("chest");
    const t = document.getElementById("modal").innerText;
    return {base: /Base/.test(t), yours: /Yours/.test(t), conf: /Partly personalised|Population estimate|Based on your training/.test(t),
            range: /somewhere around/.test(t), hist: /changed/i.test(t),
            txt: t.replace(/\s+/g," ").slice(0,140)};
  });
  ck("the base row is there", r.base, String(r.base));
  ck("the final numbers are there", r.yours, String(r.yours));
  ck("the confidence is stated", r.conf, String(r.conf));
  ck("the range is stated", r.range, String(r.range));
  ck("and so is the history", r.hist, String(r.hist));
  console.log("     " + r.txt);
}

console.log("7 - A CLOSED CYCLE TEACHES THE LANDMARKS SOMETHING");
{
  const r = await p.evaluate(()=>{
    S.lmCalObs={}; S.lmCal={}; S.lmCalRun=null; save();
    const before = JSON.stringify(S.lmCalObs);
    const out = runCycleCalibration(Date.now());
    const twice = runCycleCalibration(Date.now());
    return {out, twice, before};
  });
  ck("it runs", r.out.done, JSON.stringify(r.out));
  ck("and never twice for the same cycle", !r.twice.done, JSON.stringify(r.twice));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
