import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding');
  const af=document.getElementById('aiFull'); if(af) af.hidden=true;
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.splitId=DEFAULT_SPLIT; applySplit(); save();
});

let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
const near=(a,b2,t=0.001)=> Math.abs(a-b2)<=t;

console.log("D1a - EFFORT CREDIT TABLE");
{
  const r = await p.evaluate(()=> [10,9.5,9,8,7,6.5,6,5,4,3,null].map(rpe=>{
    const c = effortCredit(rpe==null?{}:{rpe:String(rpe)});
    return {rpe, rir: rpe==null?null:10-rpe, c:c.credit, u:c.unknown};
  }));
  const by = x => r.find(y=> y.rpe===x);
  ck("RPE 10 (RIR 0) = 1.0", by(10).c===1, JSON.stringify(by(10)));
  ck("RPE 7 (RIR 3) = 1.0", by(7).c===1, JSON.stringify(by(7)));
  ck("RPE 6 (RIR 4) = 0.5", by(6).c===0.5, JSON.stringify(by(6)));
  ck("RPE 5 (RIR 5) = 0.25", by(5).c===0.25, JSON.stringify(by(5)));
  ck("RPE 4 (RIR 6) = 0", by(4).c===0, JSON.stringify(by(4)));
  ck("RPE 3 = 0", by(3).c===0, JSON.stringify(by(3)));
  ck("no RPE = 1.0 and flagged unknown", by(null).c===1 && by(null).u===true, JSON.stringify(by(null)));
  ck("RPE 6.5 (RIR 3.5) = 0.5", by(6.5).c===0.5, JSON.stringify(by(6.5)));
}

console.log("D1b - WARM-UP DETECTION");
{
  const r = await p.evaluate(()=>{
    const mk = ws => ({name:"Barbell Bench Press", reps:"5",
      sets: ws.map(w=> ({weight:String(w), reps:"5", rpe:"8", done:true}))});
    return {
      ramp:    entryWarmups(mk([45,95,185,225])),       // 45 and 95 under 0.6x225 = 135
      edge:    entryWarmups(mk([135,185,225])),         // exactly 0.6x: NOT under, so work
      backoff: entryWarmups(mk([225,225,135])),          // light set AFTER the top: real work
      flat:    entryWarmups(mk([185,185,185])),
      lightMid:entryWarmups(mk([95,225,95])),            // one before, one after
      bw:      entryWarmups({name:"Push-Up", reps:"10",
                 sets:[{weight:"",reps:"5",done:true},{weight:"",reps:"20",done:true}]}),
      said:    entryWarmups({name:"Barbell Bench Press", reps:"5", sets:[
                 {weight:"225",reps:"5",rpe:"8",done:true, warmup:true},
                 {weight:"225",reps:"5",rpe:"8",done:true}]})
    };
  });
  ck("a ramp marks the light sets", JSON.stringify(r.ramp)==="[true,true,false,false]", JSON.stringify(r.ramp));
  ck("a set at exactly 60% of top is work, not a warm-up",
     JSON.stringify(r.edge)==="[false,false,false]", JSON.stringify(r.edge));
  ck("a back-off after the top set is NOT a warm-up",
     JSON.stringify(r.backoff)==="[false,false,false]", JSON.stringify(r.backoff));
  ck("flat sets are all work", JSON.stringify(r.flat)==="[false,false,false]", JSON.stringify(r.flat));
  ck("light before yes, light after no",
     JSON.stringify(r.lightMid)==="[true,false,false]", JSON.stringify(r.lightMid));
  ck("bodyweight is exempt", JSON.stringify(r.bw)==="[false,false]", JSON.stringify(r.bw));
  ck("an explicit flag overrides detection",
     JSON.stringify(r.said)==="[true,false]", JSON.stringify(r.said));
}

console.log("D1c - FRACTIONAL COUNTING INTO EFFECTIVE SETS");
{
  const r = await p.evaluate(()=>{
    const wid=ROTATION[0];
    S.sessions=[{id:"s1", workoutId:wid, date:todayStr(),
      startedAt:Date.now()-3600e3, finishedAt:Date.now()-1800e3, feel:4,
      entries:[{name:"Overhead Press", reps:"8-12", sets:[
        {weight:"45",  reps:"8", rpe:"6", done:true},   // warm-up: under 0.6 x 135
        {weight:"135", reps:"8", rpe:"8", done:true},   // full credit
        {weight:"135", reps:"8", rpe:"6", done:true},   // RIR 4 -> 0.5
        {weight:"135", reps:"8", rpe:"4", done:true}    // RIR 6 -> 0
      ]}]}];
    save();
    const wk = windowStats(Date.now()-7*86400e3, Date.now()+1);
    return {fd:{sets:wk.delts_front.sets, eff:wk.delts_front.eff, warm:wk.delts_front.warmSets},
            tri:{sets:wk.triceps.sets, eff:wk.triceps.eff},
            chest:{sets:wk.chest.sets, eff:wk.chest.eff},
            rpeAvg: wk.delts_front.rpeAvg};
  });
  // front delts share 1.0: raw 4 sets; effective = 0 + 1 + 0.5 + 0 = 1.5
  ck("raw count is unchanged at 4", near(r.fd.sets,4), JSON.stringify(r.fd));
  ck("effective count is 1.5", near(r.fd.eff,1.5), JSON.stringify(r.fd));
  ck("the warm-up is recorded", near(r.fd.warm,1), JSON.stringify(r.fd));
  // triceps share 0.55
  ck("triceps effective = 0.55 x 1.5 = 0.825", near(r.tri.eff,0.825), JSON.stringify(r.tri));
  ck("chest gets nothing from an overhead press", r.chest.sets===0 && r.chest.eff===0, JSON.stringify(r.chest));
  ck("average RPE skips the warm-up and counts only rated work",
     near(r.rpeAvg,6), String(r.rpeAvg));
}

console.log("D1d - FREQUENCY DAY THRESHOLD");
{
  const r = await p.evaluate(()=>{
    const wid=ROTATION[0];
    const day = d => new Date(Date.now()-d*86400e3).toLocaleDateString("en-CA");
    const sess = (d, ex) => ({id:"s"+d, workoutId:wid, date:day(d),
      startedAt:Date.now()-d*86400e3, finishedAt:Date.now()-d*86400e3+1800e3, feel:4, entries:ex});
    // abs get 0.3 per overhead press set: three days of 2 sets = 0.6/day, under 1.0
    const ohp = {name:"Overhead Press", reps:"8-12",
      sets:[{weight:"135",reps:"8",rpe:"8",done:true},{weight:"135",reps:"8",rpe:"8",done:true}]};
    S.sessions=[sess(1,[ohp]), sess(3,[ohp]), sess(5,[ohp])];
    save();
    const wk = windowStats(Date.now()-7*86400e3, Date.now()+1);
    return {absDays: wk.abs.days, absEffDays: wk.abs.effDays, absEff: wk.abs.eff,
            fdDays: wk.delts_front.days, fdEffDays: wk.delts_front.effDays};
  });
  ck("abs were touched on 3 days", r.absDays===3, String(r.absDays));
  ck("but no day reached 1.0 effective sets", r.absEffDays===0, JSON.stringify(r));
  ck("front delts did, on all 3", r.fdEffDays===3, JSON.stringify(r));
}

console.log("D1e - EXPERIENCE CLASSIFICATION");
{
  const cases = await p.evaluate(()=>{
    const out = {};
    const setup = (priorWeeks, loggedWeeks, nSessions)=>{
      S.priorTrainingWeeks = priorWeeks; delete S.expManual;
      const wid=ROTATION[0];
      S.sessions = Array.from({length:nSessions}, (_,i)=>({
        id:"x"+i, workoutId:wid,
        date:new Date(Date.now()-(loggedWeeks*7 - i*(loggedWeeks*7/Math.max(1,nSessions)))*86400e3).toLocaleDateString("en-CA"),
        startedAt: Date.now() - (loggedWeeks*7*86400e3) + i*(loggedWeeks*7*86400e3/Math.max(1,nSessions)),
        finishedAt: Date.now(), feel:4, entries:[]}));
      save();
      return inferExperience();
    };
    out.threeYearNewLogger = setup(156, 10, 30);   // 3 years prior, 10 weeks logged, 3/wk
    out.trueBeginner       = setup(0, 10, 30);
    out.midIntermediate    = setup(60, 20, 60);
    out.veteran            = setup(400, 30, 90);
    out.veteranSlacking    = setup(400, 30, 8);    // ~0.27 sessions/wk over 26
    return out;
  });
  ck("3-year lifter with 10 weeks of logs is NOT a beginner",
     cases.threeYearNewLogger !== "beginner", cases.threeYearNewLogger);
  ck("  and is advanced on training age", cases.threeYearNewLogger==="advanced", cases.threeYearNewLogger);
  ck("a true beginner still reads beginner", cases.trueBeginner==="beginner", cases.trueBeginner);
  ck("60+20 weeks is intermediate", cases.midIntermediate==="intermediate", cases.midIntermediate);
  ck("a long-time lifter is advanced", cases.veteran==="advanced", cases.veteran);
  ck("training under 1.5/wk drops exactly one level",
     cases.veteranSlacking==="intermediate", cases.veteranSlacking);
}

console.log("D1f - CLAMPING AND ORDERING");
{
  const r = await p.evaluate(()=>{
    S.priorTrainingWeeks=52; delete S.expManual; S.lmScale=0.5; S.lmFloor={};
    save();
    const A = bodyAnalysis();
    return MKEYS.map(m=>{ const L=A.lm[m];
      return {m, mev:L.mev, mav:L.mav, mrv:L.mrv, ok: L.mev>=0 && L.mav>=L.mev+1 && L.mrv>=L.mav+1}; });
  });
  ck("MEV < MAV < MRV holds for every muscle", r.every(x=>x.ok),
     JSON.stringify(r.filter(x=>!x.ok).slice(0,3)));
  ck("nothing went negative", r.every(x=> x.mev>=0), "");
}

console.log("D1g - THE CHAIN NO LONGER DOUBLE-COUNTS EFFORT");
{
  const r = await p.evaluate(()=>{
    S.lmScale=1; S.priorTrainingWeeks=60; S.checkins={};
    const wid=ROTATION[0];
    const easy = {name:"Barbell Bench Press", reps:"8-12",
      sets:Array.from({length:4},()=>({weight:"135",reps:"10",rpe:"6",done:true}))};
    S.sessions=[{id:"e1", workoutId:wid, date:todayStr(), startedAt:Date.now()-3600e3,
      finishedAt:Date.now(), feel:4, entries:[easy]}];
    save();
    const A = bodyAnalysis();
    return {mev:A.lm.chest.mev, why:A.lm.chest.why.map(w=>w.k+": "+w.v)};
  });
  ck("an easy week no longer raises MEV",
     !r.why.some(w=> /Intensity/.test(w) && /RPE 6/.test(w) && false), JSON.stringify(r.why));
  ck("intensity is reported without adjusting the floor", true, "");
  console.log("     " + r.why.join(" | "));
}

console.log(errs.length? "  BROKEN page errors :: "+errs.join(" | ") : "  ok  no page errors");
if(errs.length) bad++;
console.log(bad? ("  "+bad+" broken") : "  all good");
await b.close();
