import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1000}});
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
  S.tourDone=true; S.geo='off'; S.priorTrainingWeeks=100; S.priorAsked=1;
  S.splitId=DEFAULT_SPLIT; applySplit(); S.cycleStart=Date.now()-3*86400e3;
  S.sessions=[]; S.deload=null; save();
  window.__P0 = JSON.parse(JSON.stringify(S.program));   // the stock programme, kept
});
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

/* A programme that comfortably feeds chest, trained properly last block, then a deload
   week where almost nothing gets logged. Before this change that read as a shortfall. */
const setup = async ()=> p.evaluate(()=>{
  S.sessions=[]; S.deload=null; S.cycleDone=[];
  [...new Set(ROTATION)].forEach(wid=>{
    S.program[wid]=[{name:"Barbell Bench Press", sets:6, reps:"8-12", weight:135},
                    {name:"Incline Dumbbell Press", sets:6, reps:"8-12", weight:50},
                    {name:"Cable Fly", sets:6, reps:"10-15", weight:30}];
  });
  save();
});

console.log("1 - A DELOAD WEEK NO LONGER READS AS A CHEST SHORTFALL");
{
  await setup();
  const r = await p.evaluate(()=>{
    // one light deload session: 2 sets, which is well under any chest floor
    S.deload={startedAt:Date.now()-2*86400e3, endedAt:null, reason:"manual"};
    S.sessions=[{startedAt:Date.now()-86400e3, endedAt:Date.now()-86400e3+3600e3, wid:ROTATION[0],
      entries:[{name:"Barbell Bench Press", sets:[{weight:95,reps:8,rpe:6},{weight:95,reps:8,rpe:6}]}]}];
    save();
    const A = bodyAnalysis();
    const w = (A.weak||[]).find(x=> x.muscle==="chest" && x.kind==="under");
    return {onDeload: deloadActive(), flagged: !!w, logged: r1(A.wk.chest.sets),
            planned: r1((A.cyc.planned||{}).chest||0)};
  });
  ck("the deload is running", r.onDeload, String(r.onDeload));
  ck("the log really is light", r.logged < 4, String(r.logged));
  ck("the programme is not", r.planned >= 10, String(r.planned));
  ck("and no under-stimulated flag is raised", !r.flagged, "flagged="+r.flagged);
}

console.log("2 - OFF A DELOAD IT IS STILL THE LOG THAT IS JUDGED");
{
  const r = await p.evaluate(()=>{
    /* The stock split, with the chest work taken out of it, so chest is the one muscle
       with a hole and nothing else on the list crowds it out. */
    S.program = JSON.parse(JSON.stringify(window.__P0));
    Object.keys(S.program).forEach(wid=>{
      S.program[wid] = (S.program[wid]||[]).filter(e=>{
        const mm = musclesFor(e.name) || {};
        return !((mm.chest||0) >= 0.4);
      });
    });
    S.deload=null; S.cycleDone=ROTATION.map((_,i)=>i);
    S.sessions=[{startedAt:Date.now()-86400e3, endedAt:Date.now()-86400e3+3600e3, workoutId:ROTATION[0],
      entries:[{name:"Barbell Bench Press", sets:[{weight:95,reps:8,rpe:9}]}]}];
    save();
    const A = bodyAnalysis();
    const w = (A.weak||[]).find(x=> x.muscle==="chest" && x.kind==="under");
    return {flagged: !!w, why: w ? w.why : "", sets: r1(A.wk.chest.sets),
            };
  });
  ck("a real shortfall is still reported", r.flagged, String(r.flagged));
  ck("and it is phrased from the log, not the plan",
     r.flagged && !/programme prescribes/.test(r.why), r.why);
  console.log("     " + r.why);
}

console.log("3 - A PROGRAMME WITH A REAL HOLE STILL FLAGS DURING A DELOAD");
{
  const r = await p.evaluate(()=>{
    const wid = ROTATION[0];
    S.program[wid]=[{name:"Barbell Bench Press", sets:1, reps:"8-12", weight:135}];
    S.deload={startedAt:Date.now()-2*86400e3, endedAt:null, reason:"manual"};
    S.sessions=[{startedAt:Date.now()-86400e3, endedAt:Date.now()-86400e3+3600e3, wid,
      entries:[{name:"Barbell Bench Press", sets:[{weight:95,reps:8,rpe:6}]}]}];
    save();
    const A = bodyAnalysis();
    const w = (A.weak||[]).find(x=> x.muscle==="chest" && x.kind==="under");
    return {flagged: !!w, why: w ? w.why : "", detail: w ? w.detail : ""};
  });
  ck("a plan that is genuinely short is still caught", r.flagged, String(r.flagged));
  ck("and it says it read the plan, not the week", /programme prescribes/.test(r.why), r.why);
  ck("and that it is not asking for work this week", /deloading/.test(r.detail), r.detail.slice(0,120));
  console.log("     " + r.why);
}

console.log("4 - BALANCE IS JUDGED ON THE PROGRAMME TOO");
{
  const r = await p.evaluate(()=>{
    // plenty of pressing AND pulling in the plan, but a deload week that only pressed
    const wid = ROTATION[0];
    S.program[wid]=[{name:"Barbell Bench Press", sets:6, reps:"8-12"},
                    {name:"Barbell Row", sets:6, reps:"8-12"}];
    S.cycleDone=ROTATION.map((_,i)=>i);
    S.deload={startedAt:Date.now()-2*86400e3, endedAt:null, reason:"manual"};
    S.sessions=[{startedAt:Date.now()-86400e3, endedAt:Date.now()-86400e3+3600e3, wid,
      entries:[{name:"Barbell Bench Press", sets:[{weight:95,reps:8,rpe:6},{weight:95,reps:8,rpe:6},{weight:95,reps:8,rpe:6}]}]}];
    save();
    const A = bodyAnalysis();
    return {bal: (A.weak||[]).filter(x=> x.kind==="balance").map(x=> x.title)};
  });
  ck("no balance flag from a one-sided deload week", r.bal.length===0, r.bal.join(" | "));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
