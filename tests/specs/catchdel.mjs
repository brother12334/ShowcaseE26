import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1100}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

/* The reported state: the programme says 85, the last session was worked at 95, and a
   deload is running. */
const setup = ()=> p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding');
  const af=document.getElementById('aiFull'); if(af) af.hidden=true;
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.priorTrainingWeeks=100; S.priorAsked=1;
  S.splitId=DEFAULT_SPLIT; applySplit();
  const wid=ROTATION[0];
  S.program[wid]=[{name:"Incline Smith Machine Bench Press", sets:2, reps:"9-13", weight:85}];
  const t=Date.now()-9*86400e3;
  S.sessions=[{id:"s1", workoutId:wid, date:new Date(t).toLocaleDateString("en-CA"),
    startedAt:t, finishedAt:t+3600e3, feel:4,
    entries:[{name:"Incline Smith Machine Bench Press", barAdd:0, sets:[
      {weight:"90", reps:"10", rpe:"7", done:true},
      {weight:"95", reps:"11", rpe:"8", done:true}]}]}];
  S.deload={startedAt:Date.now()-2*86400e3, endedAt:null, reason:"manual"};
  S.active=null; save();
  return {planned: findProgramEntry("Incline Smith Machine Bench Press").weight,
          top: topLoggedLoad("Incline Smith Machine Bench Press", 60),
          deload: deloadActive()};
});

console.log("1 - THE GROUND TRUTH");
{
  const r = await setup();
  ck("the plan says 85", r.planned===85, String(r.planned));
  ck("the log says 95 was lifted", r.top===95, String(r.top));
  ck("and a deload is running", r.deload, String(r.deload));
}

console.log("2 - CATCHING THE PLAN UP TO WHAT YOU LIFTED IS ALLOWED");
{
  const r = await p.evaluate(()=>{
    const ok = applyProgression("Incline Smith Machine Bench Press", 95,
      "You set the plan to the load you had already been working at.",
      "plan caught up to your log", {catchUp:true});
    return {ok, now: findProgramEntry("Incline Smith Machine Bench Press").weight};
  });
  ck("it goes through", r.ok, String(r.ok));
  ck("and the plan now says 95", r.now===95, String(r.now));
}

console.log("3 - A REAL RAISE IS STILL BLOCKED");
{
  await setup();
  const r = await p.evaluate(()=>{
    const asCatch = applyProgression("Incline Smith Machine Bench Press", 105,
      "why", "reason", {catchUp:true});           // above anything logged: still a raise
    const plain  = applyProgression("Incline Smith Machine Bench Press", 95, "why", "reason");
    return {asCatch, plain, now: findProgramEntry("Incline Smith Machine Bench Press").weight};
  });
  ck("a load you have never lifted is refused even as a catch-up", !r.asCatch, String(r.asCatch));
  ck("and an ordinary progression is still refused", !r.plain, String(r.plain));
  ck("so the plan is untouched", r.now===85, String(r.now));
}

console.log("4 - A CUT IS STILL ALLOWED, AS IT ALWAYS WAS");
{
  await setup();
  const r = await p.evaluate(()=>{
    const ok = applyProgression("Incline Smith Machine Bench Press", 75, "why", "reason");
    return {ok, now: findProgramEntry("Incline Smith Machine Bench Press").weight};
  });
  ck("cutting a load goes through", r.ok, String(r.ok));
  ck("and lands", r.now===75, String(r.now));
}

console.log("5 - THE LINE SAYS IT APPLIES, AND THE BUTTON WORKS FROM THE SCREEN");
{
  await setup();
  const r = await p.evaluate(()=>{
    /* Mid-session, which is where the line is read: the day is open and the boxes are
       suggesting the load the log says. */
    S.active = {date: todayStr(), workoutId: ROTATION[0], startedAt: Date.now(),
      entries:[{name:"Incline Smith Machine Bench Press", reps:"9-13", planWeight:85,
                sets:[{weight:"", reps:"", rpe:"", done:false},
                      {weight:"", reps:"", rpe:"", done:false}]}]};
    save(); TAB="workout"; render();
    const line=[...document.querySelectorAll(".ex-insight")]
      .find(x=> /plan is behind/.test(x.textContent));
    if(!line) return {none:true};
    const txt=line.textContent.replace(/\s+/g," ").trim();
    const btn=line.querySelector("[data-plancatch]");
    btn.click();
    return {txt, now: findProgramEntry("Incline Smith Machine Bench Press").weight};
  });
  if(r.none){ ck("the plan-is-behind line is on screen", false, "not drawn"); }
  else {
    console.log("     " + r.txt);
    ck("it says the deload does not stop this one", /You are deloading, and this still applies/.test(r.txt), r.txt);
    ck("and pressing it catches the plan up", r.now===95, String(r.now));
  }
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
