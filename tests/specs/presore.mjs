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

const setup = (hoursAgo)=> p.evaluate((hrs)=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  const af=document.getElementById('aiFull'); if(af) af.hidden=true;
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.priorTrainingWeeks=100; S.priorAsked=1; S.deload=null;
  S.splitId=DEFAULT_SPLIT; applySplit();
  S.sore={}; S.dayFlags={}; SORE_SNOOZE=null; S.active=null;
  const t = Date.now() - hrs*3600e3;
  S.sessions=[{id:"s1", workoutId:ROTATION[0], date:new Date(t).toLocaleDateString("en-CA"),
    startedAt:t-3600e3, finishedAt:t, feel:4,
    entries:[{name:"Barbell Bench Press", sets:[
      {weight:185,reps:8,rpe:9,done:true},{weight:185,reps:8,rpe:9,done:true},
      {weight:185,reps:7,rpe:9.5,done:true}]}]}];
  save(); TAB="today"; render();
  return {line: /How does the body feel/.test(document.body.innerText)};
}, hoursAgo);

console.log("1 - THE QUESTION IS NOT ON THE TODAY TAB AT ALL");
{
  const r = await setup(0.4);       // 25 minutes after finishing
  const r2 = await setup(20);       // and the next morning
  ck("not right after a session", !r.line, String(r.line));
  ck("and not the next day either", !r2.line, String(r2.line));
  ck("there is no Today prompt left to find", !r.line && !r2.line, "");
}

console.log("2 - THE PRE-WORKOUT FLOW CARRIES THE QUESTION");
{
  const r = await p.evaluate(()=>{
    S.sore={}; SORE_SNOOZE=null;
    S.active={date:todayStr(), workoutId:ROTATION[0], startedAt:Date.now(),
      entries:[{name:"Barbell Bench Press", reps:"6-8",
                sets:[{weight:"", reps:"", rpe:"", done:false}]}]};
    save();
    openPreflight(ROTATION[0]);
    const steps = pfSteps();
    PF.step = "sore"; pfDraw();
    const host = document.querySelector("#preflight .pfl-in");
    return {steps, has: steps.indexOf("sore")>-1,
            before: steps.indexOf("sore") < steps.indexOf("time"),
            rows: [...host.querySelectorAll(".pfl-sore-row")].length,
            words: [...host.querySelectorAll('[data-pfsore^="chest:"]')].map(x=>x.textContent.trim()),
            head: (host.querySelector(".pfl-h")||{}).textContent,
            sub: (host.querySelector(".pfl-sub")||{}).textContent.replace(/\s+/g," ").trim()};
  });
  console.log("     steps: " + r.steps.join(" → "));
  ck("there is a soreness step", r.has, r.steps.join(","));
  ck("before the time question", r.before, r.steps.join(","));
  ck("with a row per muscle", r.rows>=1 && r.rows<=4, String(r.rows));
  ck("and the same four words as everywhere else",
     r.words.join("/")==="none/a little/sore/very sore", r.words.join("/"));
  ck("it asks about walking in, not about today", /last few days, not from today/.test(r.sub), r.sub.slice(0,80));
  console.log("     " + r.head + " — " + r.sub.slice(0,90));
}

console.log("3 - TAPPING IT WRITES IT WHERE THE LOOP READS IT");
{
  const r = await p.evaluate(()=>{
    const host = document.querySelector("#preflight .pfl-in");
    const btn = host.querySelector('[data-pfsore="chest:2"]');
    if(!btn) return {none:true};
    btn.click();
    return {stored: (S.sore[todayStr()]||{}).chest, before: soreBefore("chest"),
            asked: soreAskedFor("chest"),
            inSession: !!((S.active && S.active.soreAsked) || {}).chest,
            by: (S.soreBy[todayStr()]||{}).chest};
  });
  ck("chest is stored as 2", r.stored===2, JSON.stringify(r));
  ck("soreBefore() reads it", r.before===2, String(r.before));
  ck("and nothing asks chest again today", r.asked, String(r.asked));
  ck("this session has it marked", r.inSession, String(r.inSession));
  ck("tagged as the pre-session reading", r.by === "pre-session", String(r.by));
}

console.log("4 - TAPPING THE SAME ANSWER AGAIN TAKES IT BACK");
{
  const r = await p.evaluate(()=>{
    const host = document.querySelector("#preflight .pfl-in");
    host.querySelector('[data-pfsore="chest:2"]').click();
    return {stored: (S.sore[todayStr()]||{}).chest, day: S.sore[todayStr()]};
  });
  ck("nothing is recorded for chest", r.stored==null, JSON.stringify(r.day||{}));
}

console.log("5 - NOTHING RECENT TO ASK ABOUT, NO STEP AT ALL");
{
  const r = await p.evaluate(()=>{
    try{PF=null}catch(e){}
    const el=document.getElementById("preflight"); if(el) el.remove();
    document.body.classList.remove("pfl-open");
    S.sessions=[]; S.sore={}; save();
    S.active={date:todayStr(), workoutId:ROTATION[0], startedAt:Date.now(), entries:[]};
    openPreflight(ROTATION[0]);
    const steps = pfSteps();
    return {steps, has: steps.indexOf("sore")>-1};
  });
  ck("the step is not added", !r.has, r.steps.join(","));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
