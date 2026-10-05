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

const trainedYesterday = ()=> p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  const af=document.getElementById('aiFull'); if(af) af.hidden=true;
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.priorTrainingWeeks=100; S.priorAsked=1;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false}); S.sleepAsked=todayStr();
  S.splitId=DEFAULT_SPLIT; applySplit(); S.cycleStart=Date.now()-2*86400e3;
  S.sore={}; S.dayFlags={}; S.joint={}; S.active=null;
  const d=new Date(Date.now()-86400e3);
  S.sessions=[{id:"s1", workoutId:ROTATION[0], date:d.toLocaleDateString("en-CA"),
    startedAt:d.getTime(), finishedAt:d.getTime()+3600e3, feel:4,
    entries:[{name:"Barbell Bench Press", sets:[
      {weight:185,reps:8,rpe:9,done:true},{weight:185,reps:8,rpe:9,done:true},
      {weight:185,reps:7,rpe:9.5,done:true},{weight:185,reps:6,rpe:10,done:true}]}]}];
  save(); TAB="today"; render();
  /* what the pre-session batch WOULD ask about is now scope-driven: the primaries of the
     session in front of you, plus anything whose rest-day check falls today */
  const would = domsPrimaries((S.program[ROTATION[0]] || []))
    .concat(domsDueToday()).filter((x, i, a2)=> a2.indexOf(x) === i);
  return {ms: would, todayLine: /How does the body feel/.test(document.body.innerText)};
});

console.log("1 - NOTHING ON THE TODAY TAB ASKS ABOUT SORENESS");
{
  const r = await trainedYesterday();
  ck("there is something worth asking about", r.ms.length>0, r.ms.join(","));
  ck("and Today does not ask it", !r.todayLine, String(r.todayLine));
  console.log("     would ask about: " + r.ms.join(", "));
}

console.log("2 - STARTING THE WORKOUT DOES");
{
  const r = await p.evaluate(()=>{
    S.active={date:todayStr(), workoutId:ROTATION[0], startedAt:Date.now(),
      entries:[{name:"Barbell Bench Press", reps:"6-8",
                sets:[{weight:"", reps:"", rpe:"", done:false}]}]};
    save();
    openPreflight(ROTATION[0]);
    const steps = pfSteps();
    PF.step="sore"; pfDraw();
    const host=document.querySelector("#preflight .pfl-in");
    return {steps, rows:[...host.querySelectorAll(".pfl-sore-row")].length,
            flags:[...host.querySelectorAll("[data-pfflag]")].map(x=>x.textContent.trim())};
  });
  ck("the flow carries a soreness step", r.steps.indexOf("sore")>-1, r.steps.join(","));
  ck("with the muscles on it", r.rows>0, String(r.rows));
  ck("and the day flags moved with it", r.flags.length===4, r.flags.join(" / "));
  console.log("     " + r.flags.join(" / "));
}

console.log("3 - THE TAPS RECORD WHAT THEY SAY");
{
  const r = await p.evaluate(()=>{
    const host=document.querySelector("#preflight .pfl-in");
    host.querySelector('[data-pfsore="chest:2"]').click();
    host.querySelector('[data-pfflag="stress"]').click();
    return {sore:(S.sore[todayStr()]||{}).chest, flags:S.dayFlags[todayStr()],
            before: soreBefore("chest"),
            skip: exposureSkip({date: todayStr()}, "chest", null)};
  });
  ck("chest is stored as 2", r.sore===2, JSON.stringify(r.sore));
  ck("the flag is stored", r.flags && r.flags.stress===true, JSON.stringify(r.flags));
  ck("soreBefore() reads it", r.before===2, String(r.before));
  ck("and a stressful day is not a lesson about volume",
     r.skip.some(x=> /stress/.test(x)), r.skip.join(","));
}

console.log("4 - A FLAG CAN BE TAKEN BACK");
{
  const r = await p.evaluate(()=>{
    const host=document.querySelector("#preflight .pfl-in");
    host.querySelector('[data-pfflag="stress"]').click();
    return {flags: S.dayFlags[todayStr()]};
  });
  ck("nothing is left on the day", !r.flags, JSON.stringify(r.flags||null));
}

console.log("5 - WHAT HURT ON A LIFT IS STILL THE JOINT SIGNAL");
{
  const r = await p.evaluate(()=>{
    S.hurts=[]; S.joint={}; save();
    hurtAdd("Barbell Bench Press", "shoulder", "sore", "front of the shoulder");
    const now=Date.now();
    return {rec:S.joint[todayStr()], worst:jointMaxOver("chest", now-2*86400e3, now+86400e3)};
  });
  ck("it is filed against the movement", r.rec && r.rec["barbell bench press"]===2, JSON.stringify(r.rec));
  ck("and read for the muscle", r.worst===2, String(r.worst));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
