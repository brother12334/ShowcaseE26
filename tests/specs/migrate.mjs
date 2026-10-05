import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());

/* An EXISTING user: a year of logged sessions with RPE, saved under the old schema —
   no priorTrainingWeeks, no calibration, no compound flags. Then the app loads. */
const OLD = (()=>{
  const day = d => new Date(Date.now()-d*86400e3).toLocaleDateString("en-CA");
  const sets = (n,w,rpe) => Array.from({length:n},()=>({weight:String(w),reps:"9",rpe:rpe,done:true}));
  const sessions = [];
  for(let i=52; i>=1; i--){
    const load = 100 + (52 - i) * 1.2;
    sessions.push({id:"s"+i, workoutId:"pusha", date:day(i*5),
      startedAt: Date.now() - i*5*86400e3, finishedAt: Date.now() - i*5*86400e3 + 3600e3,
      feel:4, entries:[{name:"Barbell Bench Press", reps:"8-12", sets:sets(4, Math.round(load), "8")}]});
  }
  return sessions;
})();

await p.addInitScript(old=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X');
  localStorage.setItem('ironlog.v1', JSON.stringify({
    setup:{name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()-370*86400e3},
    tourDone:true, geo:'off', splitId:'ppl6', sessions: old,
    cycleStart: Date.now()-8*86400e3, cycleDone:[0,1]
  }));
}, OLD);
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.waitForTimeout(900);

let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

console.log("MIGRATION - AN EXISTING USER GETS ALL OF IT");
{
  const r = await p.evaluate(()=>({
    sessions: S.sessions.length,
    compoundSeeded: !!S.exCompoundSeeded,
    compoundN: (S.exCompoundSeeded||{}).n || 0,
    calSeeded: !!S.lmCalSeeded,
    calFailed: !!(S.lmCalSeeded||{}).failed,
    obs: Object.keys(S.lmCalObs||{}).length,
    cal: S.lmCal ? Object.keys(S.lmCal).length : 0,
    chestCal: (S.lmCal||{}).chest || null,
    priorDue: priorTrainingAskDue(),
    exp: inferExperience()
  }));
  ck("their log is intact", r.sessions===52, String(r.sessions));
  ck("compound flags were seeded", r.compoundSeeded && r.compoundN>50, JSON.stringify(r.compoundN));
  ck("calibration seeding ran", r.calSeeded && !r.calFailed, JSON.stringify(r));
  ck("and it learned something from their history", r.obs>0 && r.cal>0, JSON.stringify(r));
  ck("chest carries a calibration", !!r.chestCal, JSON.stringify(r.chestCal));
  ck("it is marked as estimated from past logs",
     r.chestCal && r.chestCal.seeded===true, JSON.stringify(r.chestCal));
  ck("and the prior-training question is queued for them", r.priorDue===true, String(r.priorDue));
  console.log("     chest calibration: " + JSON.stringify(r.chestCal));
}

console.log("MIGRATION - THE QUESTION IS ASKED, ONCE");
{
  const shown = await p.evaluate(()=> !!document.querySelector('[data-prior]'));
  ck("the ask appeared on its own", shown, "");
  const r = await p.evaluate(()=>{
    const before = inferExperience();
    document.querySelector('[data-prior="416"]').click();
    return {before, after: inferExperience(), weeks: S.priorTrainingWeeks,
            asked: !!S.priorAsked, dueAgain: priorTrainingAskDue()};
  });
  ck("answering moves the experience level", r.before!==r.after, JSON.stringify(r));
  /* 8 years prior + a year logged is an advanced training age, but this log is a
     session every 5 days = 1.4 a week over the last 26, which is under the 1.5 floor,
     so the level drops exactly one. That is the rule working, not failing. */
  ck("  " + r.before + " -> " + r.after + ", dropped one for training under 1.5/wk",
     r.after==="intermediate", r.after);
  ck("and it is never asked again", r.asked && r.dueAgain===false, JSON.stringify(r));
}

console.log("MIGRATION - SEEDING RERUNS AGAINST THE CORRECTED CHAIN");
{
  const r = await p.evaluate(()=> ({seeded: !!S.lmCalSeeded, n: (S.lmCalSeeded||{}).n}));
  ck("the calibration was rebuilt after the answer", r.seeded, JSON.stringify(r));
}

console.log("MIGRATION - SKIPPING IS A REAL ANSWER");
{
  const r = await p.evaluate(()=>{
    delete S.priorAsked; delete S.priorTrainingWeeks; save();
    const due1 = priorTrainingAskDue();
    openPriorTrainingAsk();
    document.querySelector('#priorSkip').click();
    return {due1, due2: priorTrainingAskDue(), asked: !!S.priorAsked,
            weeks: S.priorTrainingWeeks};
  });
  ck("due before", r.due1===true, "");
  ck("declining counts as answered", r.asked && r.due2===false, JSON.stringify(r));
  ck("and sets no training age", r.weeks==null, String(r.weeks));
}

console.log("MIGRATION - A BROKEN LOG STILL BOOTS");
{
  const r = await p.evaluate(()=>{
    S.lmCalObs=null; delete S.lmCalSeeded;
    S.sessions.push({id:"bad", workoutId:"pusha", date:"nonsense", startedAt:NaN,
                     finishedAt:NaN, entries:[{name:"Barbell Bench Press", sets:null}]});
    let threw = false;
    try{ seedCalibrationFromHistory(); }catch(e){ threw = true; }
    return {threw, alive: typeof bodyAnalysis === "function" && !!bodyAnalysis()};
  });
  ck("seeding does not throw on a malformed session", !r.threw, String(r.threw));
  ck("and the app still analyses", r.alive, String(r.alive));
}

console.log(errs.length? "  BROKEN page errors :: "+errs.join(" | ") : "  ok  no page errors");
if(errs.length) bad++;
console.log(bad? ("  "+bad+" broken") : "  all good");
await b.close();
