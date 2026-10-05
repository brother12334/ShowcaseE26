import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
const boot = ()=> p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open','spec-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  try{ closeSpecPage(false); }catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.splitId=DEFAULT_SPLIT; applySplit();
  S.spec=null; S.specPast=[]; S.deload=null; S.specDraft=null;
  S.joint={}; S.jointOk={}; S.hurts=[]; BODY_OPEN={};
  const day=86400000, now=Date.now(); S.sessions=[]; let n=0;
  for(let i=84;i>=1;i--){ if(i%4===0) continue;
    const wid=ROTATION[n%ROTATION.length]; n++;
    const ents=(planSlotList(wid)||[]).slice(0,5); if(!ents.length) continue;
    S.sessions.push({id:"s"+i, date:new Date(now-i*day).toLocaleDateString("en-CA"),
      workoutId:wid, startedAt:now-i*day, finishedAt:now-i*day+36e5, feel:4,
      entries:ents.map(e=>({name:e.name, reps:"8",
        sets:[0,1,2].map(k=>({weight:String(120+k*5), reps:"8", rpe:"8", done:true}))}))}); }
  S.cycleStart = now - 2*day; save(); goTab("body"); render();
});
await boot();

console.log("1 - A READING SAYS WHAT WAS SAID, ABOUT WHAT, AND WHEN");
{
  const r = await p.evaluate(()=>{
    const d = new Date(Date.now() - 3*86400000).toLocaleDateString("en-CA");
    S.joint = {[d]: {"barbell bench press": 2}};
    save();
    const el = specEligibility("chest", bodyAnalysis());
    const j = el.miss.find(x=> x.k === "joint");
    return {say: j && j.say, n: j && j.joint.length, ok: el.ok,
            src: j && j.joint[0]};
  });
  ck("the muscle is held back", !r.ok, String(r.ok));
  ck("it names the movement", /Barbell Bench Press/i.test(r.say || ""), r.say);
  ck("and the day", /\w{3} \d/.test(r.say || ""), r.say);
  ck("and the words you used", /held me back/i.test(r.say || ""), r.say);
  ck("and it carries the movement so a button can act on it",
     r.src && r.src.exKey === "barbell bench press", JSON.stringify(r.src));
}

console.log("2 - AND IT CAN BE SAID TO HAVE SETTLED");
{
  const r = await p.evaluate(()=>{
    const before = jointMaxOver("chest", Date.now() - 30*86400000, Date.now()+1);
    jointSettle("barbell bench press", Date.now());
    const after = jointMaxOver("chest", Date.now() - 30*86400000, Date.now()+1);
    const el = specEligibility("chest", bodyAnalysis());
    return {before, after, ok: el.ok, miss: el.miss.map(x=> x.k),
            kept: JSON.stringify(S.joint).length > 2};
  });
  ck("it was reading 2", r.before === 2, String(r.before));
  ck("and reads nothing afterwards", r.after === null, String(r.after));
  ck("the muscle is no longer held back", r.ok, r.miss.join(","));
  ck("and the history is kept, not deleted", r.kept, String(r.kept));
}

console.log("3 - A NEW ONE AFTER THAT STILL COUNTS, SAME DAY INCLUDED");
{
  const r = await p.evaluate(()=>{
    /* through the door the app actually uses, on the same day it was settled */
    jointRecord("Barbell Bench Press", "sharp");
    return {now: jointMaxOver("chest", Date.now() - 30*86400000, Date.now()+1),
            cleared: (S.jointOk || {})["barbell bench press"] || null};
  });
  ck("saying it hurt again is heard", r.now === 3, String(r.now));
  ck("and the clearance is withdrawn rather than outvoted by a date",
     r.cleared === null, String(r.cleared));
}

console.log("4 - SETTLING THE NIGGLE SETTLES THE SIGNAL WITH IT");
{
  const r = await p.evaluate(()=>{
    S.joint = {}; S.jointOk = {}; S.hurts = [];
    hurtAdd("Barbell Bench Press", "shoulder", "sore", "");
    const raised = jointMaxOver("chest", Date.now() - 30*86400000, Date.now()+1);
    const open = (S.hurts||[]).filter(h=> h && !h.settled).length;
    hurtSettle(S.hurts[0].id);
    return {raised, open, after: jointMaxOver("chest", Date.now() - 30*86400000, Date.now()+1),
            stillOpen: (S.hurts||[]).filter(h=> h && !h.settled).length};
  });
  ck("saying it hurt raises the signal", r.raised === 2, String(r.raised));
  ck("and opens a niggle", r.open === 1, String(r.open));
  ck("marking the niggle settled clears the signal too", r.after === null, String(r.after));
  ck("and closes the niggle", r.stillOpen === 0, String(r.stillOpen));
}

console.log("5 - THE SETUP STEP OFFERS THE BUTTON, AND MOVING ON");
{
  const r = await p.evaluate(()=>{
    S.joint = {}; S.jointOk = {}; S.hurts = [];
    const d = new Date(Date.now() - 2*86400000).toLocaleDateString("en-CA");
    S.joint = {[d]: {"barbell bench press": 2}};
    save(); render();
    openSpecPage("setup");
    SPEC_UI.pick = ["chest"]; SPEC_UI.step = SPEC_STEPS.indexOf("eligible");
    renderSpecPage();
    const btn = document.querySelector("[data-specjointok]");
    return {txt: document.getElementById("specFullIn").innerText,
            hasBtn: !!btn, label: btn && btn.innerText};
  });
  ck("the step names the lift and the day", /Barbell Bench Press/i.test(r.txt), r.txt.slice(0,200));
  ck("there is a button to settle it", r.hasBtn, String(r.hasBtn));
  ck("and it says which lift", /Barbell Bench Press has settled/i.test(r.label || ""), r.label);
  ck("the screen explains both ways to clear it",
     /niggle itself/.test(r.txt), r.txt.slice(-260));
  const after = await p.evaluate(()=>{
    document.querySelector("[data-specjointok]").click();
    return {joint: jointMaxOver("chest", Date.now() - 30*86400000, Date.now()+1),
            step: SPEC_UI.step, title: (document.querySelector(".spec-h")||{}).textContent};
  });
  ck("pressing it clears the reading", after.joint === null, String(after.joint));
  ck("and the flow moves on rather than sitting on a dead end",
     /which muscles/i.test(after.title), after.title);
}

console.log("6 - AND A READING YOU HAVE NOT SETTLED STILL STOPS YOU");
{
  const r = await p.evaluate(()=>{
    S.joint = {}; S.jointOk = {};
    const d = new Date(Date.now() - 2*86400000).toLocaleDateString("en-CA");
    S.joint = {[d]: {"barbell bench press": 3}};
    save();
    return {ok: specEligibility("chest", bodyAnalysis()).ok,
            lvl: jointMaxOver("chest", Date.now() - 30*86400000, Date.now()+1)};
  });
  ck("sharp pain still blocks it", !r.ok && r.lvl === 3, JSON.stringify(r));
}

console.log("7 - A MILD ONE WAS NEVER A BLOCKER AND STILL IS NOT");
{
  const r = await p.evaluate(()=>{
    S.joint = {}; S.jointOk = {};
    const d = new Date(Date.now() - 2*86400000).toLocaleDateString("en-CA");
    S.joint = {[d]: {"barbell bench press": 1}};
    save();
    const el = specEligibility("chest", bodyAnalysis());
    return {joint: el.miss.some(x=> x.k === "joint"), lvl: jointMaxOver("chest", Date.now()-30*86400000, Date.now()+1)};
  });
  ck("'noticed it' is recorded but does not hold the block up", !r.joint && r.lvl === 1, JSON.stringify(r));
}

console.log("8 - SOMETHING THAT HURT THIS MORNING COUNTS THIS MORNING");
{
  /* The log is keyed by date, and a date used to become a timestamp at noon. Read against
     a window ending at "now", a reading entered at 08:00 did not exist until lunchtime.
     This asks the question from every hour of the day. */
  const r = await p.evaluate(()=>{
    S.joint = {}; S.jointOk = {}; S.hurts = [];
    jointRecord("Barbell Bench Press", "sore");
    const today = todayStr();
    const miss = [];
    for(let h = 0; h < 24; h++){
      const now = Date.parse(today + "T" + String(h).padStart(2,"0") + ":30:00");
      const seen = jointSourcesFor("chest", now - 14*86400000, now + 1);
      if(!seen.length) miss.push(h);
    }
    return {miss, stored: Object.keys(S.joint).length};
  });
  ck("it is stored", r.stored === 1, String(r.stored));
  ck("and visible at every hour of the day, not only after noon",
     r.miss.length === 0, "blind at " + r.miss.join(",") + ":30");
}

console.log("8b - AND SETTLING IT COVERS THE WHOLE DAY YOU SAY IT");
{
  const r = await p.evaluate(()=>{
    const today = todayStr();
    jointSettle("barbell bench press", Date.parse(today + "T23:00:00"));
    const morning = Date.parse(today + "T08:00:00");
    const cleared = jointSourcesFor("chest", morning - 14*86400000, morning + 1).length === 0;
    /* and a complaint made after that is heard again */
    jointRecord("Barbell Bench Press", "sharp");
    const back = jointMaxOver("chest", Date.now() - 14*86400000, Date.now() + 1);
    return {cleared, back};
  });
  ck("this morning's reading is settled by this evening's word", r.cleared, String(r.cleared));
  ck("but a fresh complaint is heard regardless", r.back === 3, String(r.back));
}

console.log(errs.length?("PAGE ERRORS: "+errs.join(" | ")):"no page errors");
if(errs.length) bad++;
console.log(bad?("BROKEN: "+bad):"all good");
await b.close();
