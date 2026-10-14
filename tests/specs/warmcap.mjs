import { chromium, APP_URL } from './_e26.mjs';
/* "ALSO MY WARMUP IS THE SAME AS MY LOAD."

   Reported from a Smith squat prescribing 70 whose last rung read 70 x 3: a working set
   sitting inside the ramp. The ramp aims at what the last session earned (75) while the
   boxes offer the prescription (70), and 90% of 75 rounds UP to 70 on a 2.5 lb plate.
   The ramp now has a ceiling: no rung reaches the lightest load the card prescribes. */
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
  try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr();
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, warmups:'auto', plateStep:2.5,
                                      smithWeight:25, barMode:'total', barWeight:45});
  S.splitId=DEFAULT_SPLIT; applySplit(); save();
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

/* One exercise, one logged session, read back the way the card reads it. */
const run = (name, plan, lastTop, extra)=> p.evaluate(a=>{
  const wid=ROTATION[0];
  S.program[wid]=[Object.assign({name:a.name, sets:4, reps:"9-13", rpes:[7,8,8,9], weight:a.plan}, a.extra||{})];
  S.sessions = a.lastTop ? [{id:"s1", workoutId:wid,
      date:new Date(Date.now()-3*86400e3).toLocaleDateString("en-CA"),
      startedAt:Date.now()-3*86400e3, finishedAt:Date.now()-3*86400e3+3600e3, feel:4,
      entries:[{name:a.name, reps:"9-13", sets:[
        {weight:String(a.lastTop), reps:"6", rpe:"8", done:true},
        {weight:String(a.lastTop), reps:"9", rpe:"8", done:true}]}]}] : [];
  save(); if(S.active) S.active=null; startWorkout(wid); PF=null; TAB="workout"; save(); render();
  const en=S.active.entries[0], ctx={workoutId:wid, anyDay:false, occ:0};
  const last=(lastEntryFor(wid, a.name, false, 0)||{}).sets;
  const rungs=warmupPlan(en,"full",ctx);
  return {rungs: rungs.map(x=>x.w==null?x.label:x.w),
          labels: rungs.map(x=>x.label+" x"+x.reps),
          boxes: en.sets.map((st,i)=> parseFloat(planLoadPh(en,last,i))).filter(v=>v>0),
          note: ((document.querySelector('.warm-note')||{}).innerText||"").trim()};
}, {name, plan, lastTop, extra});

console.log("1 - THE REPORTED SCREEN: A SMITH SQUAT PRESCRIBING 70 OFF A 75 LB SESSION");
{
  const r = await run("Smith Machine Squat", 70, 75);
  const lightest = Math.min.apply(null, r.boxes);
  console.log("   ", JSON.stringify(r));
  ck("the ramp still has its three rungs", r.rungs.length===3, r.rungs.join("/"));
  ck("every rung is below the lightest working set", r.rungs.every(w=> w < lightest),
     r.rungs.join("/")+" vs "+lightest);
  ck("so no rung IS the working load", r.rungs.indexOf(lightest)<0, r.rungs.join("/"));
  ck("and the note says what it is doing", /just under your working load/.test(r.note), r.note);
}

console.log("\n2 - THE ORDINARY SESSION IS UNTOUCHED");
{
  const r = await run("Barbell Bench Press", 100, 100);
  console.log("   ", JSON.stringify(r.labels));
  ck("40 / 65 / 90 as before", r.rungs.join("/")==="40/65/90", r.rungs.join("/"));
  ck("and it still says about 90%", /about 90% of your (working|new) load/.test(r.note), r.note);
}

console.log("\n3 - A LOAD SO LIGHT THERE IS LITTLE ROOM BELOW IT");
{
  const r = await run("Barbell Curl", 25, 25);
  console.log("   ", JSON.stringify(r));
  const lightest = Math.min.apply(null, r.boxes);
  ck("nothing at or above the working set", r.rungs.every(w=> w < lightest),
     r.rungs.join("/")+" vs "+lightest);
  ck("nothing at or below zero", r.rungs.every(w=> w > 0), r.rungs.join("/"));
  ck("and no rung repeats the one before it",
     r.rungs.every((w,i)=> i===0 || w !== r.rungs[i-1]), r.rungs.join("/"));
}

console.log("\n4 - A MOVEMENT WITH NOTHING LOGGED STILL GETS ITS PLACEHOLDERS");
{
  const r = await run("Barbell Row", "", 0);
  console.log("   ", JSON.stringify(r.labels));
  ck("three placeholder rungs, not numbers", r.labels.length===3 && /light/.test(r.labels[0]),
     r.labels.join(" | "));
  ck("worded as placeholders", /placeholders/.test(r.note), r.note.slice(0,60));
}

console.log("\n5 - AND A WARM-UP THE PLAN ITSELF PRESCRIBES IS STILL ITS OWN");
{
  const r = await p.evaluate(()=>{
    const wid=ROTATION[0], name="Front Squat";
    S.program[wid]=[{name, sets:3, reps:"5", weight:100,
                     warmups:[{pct:0.5, reps:"5"}, {pct:1.0, reps:"1"}]}];
    S.sessions=[]; save(); if(S.active) S.active=null;
    startWorkout(wid); PF=null; save(); render();
    const en=S.active.entries[0];
    return warmupPlan(en, "plan", {workoutId:wid, anyDay:false, occ:0}).map(x=>x.label);
  });
  console.log("   ", JSON.stringify(r));
  ck("the document's own rungs are shown as written, ceiling and all", r.length===2, r.join("/"));
}

console.log("\n6 - A MOVEMENT THAT COUNTS YOU RAMPS THE PART YOU CAN ACTUALLY CHANGE");
{
  const r = await p.evaluate(()=>{
    const wid=ROTATION[0], name="Bulgarian Split Squat";
    S.program[wid]=[{name, sets:4, reps:"4-8", rpes:[7,8,8,9], weight:160}];
    S.sessions=[{id:"s1", workoutId:wid,
      date:new Date(Date.now()-3*86400e3).toLocaleDateString("en-CA"),
      startedAt:Date.now()-3*86400e3, finishedAt:Date.now()-3*86400e3+3600e3, feel:4,
      entries:[{name, reps:"4-8", bwOn:139.6, sets:[
        {weight:"147.6", reps:"15", rpe:"7", done:true},
        {weight:"152.6", reps:"14", rpe:"8", done:true}]}]}];
    save(); if(S.active) S.active=null; startWorkout(wid); PF=null; TAB="workout"; save();
    S.active.entries[0].bwOn=139.6; render();
    const en=S.active.entries[0], ctx={workoutId:wid, anyDay:false, occ:0};
    return {full: warmupPlan(en,"full",ctx).map(x=>x.label+" x"+x.reps),
            light: warmupPlan(en,"light",ctx).map(x=>x.label+" x"+x.reps),
            note: ((document.querySelector('.warm-note')||{}).innerText||"").trim()};
  });
  console.log("   ", JSON.stringify(r));
  const nums = r.full.concat(r.light).map(l=> parseFloat(l)).filter(v=> v>0);
  ck("no rung is a percentage of your bodyweight", nums.every(v=> v < 30), nums.join("/"));
  ck("each rung says where the weight goes", r.full.every(l=> /in your hands|on the belt/.test(l)),
     r.full.join(" | "));
  ck("and the note says the rest of the number is you", /rest of that number is you/i.test(r.note),
     r.note.slice(0,80));
}

console.log("\n7 - AND WITH NOTHING IN YOUR HANDS IT IS JUST EASY REPS");
{
  const r = await p.evaluate(()=>{
    const wid=ROTATION[0], name="Push-up";
    S.program[wid]=[{name, sets:3, reps:"8-15", weight:175}];
    S.sessions=[{id:"s2", workoutId:wid,
      date:new Date(Date.now()-3*86400e3).toLocaleDateString("en-CA"),
      startedAt:Date.now()-3*86400e3, finishedAt:Date.now()-3*86400e3+3600e3, feel:4,
      entries:[{name, reps:"8-15", bwOn:175, sets:[{weight:"175", reps:"12", rpe:"8", done:true}]}]}];
    save(); if(S.active) S.active=null; startWorkout(wid); PF=null; TAB="workout"; save();
    S.active.entries[0].bwOn=175; render();
    const en=S.active.entries[0], ctx={workoutId:wid, anyDay:false, occ:0};
    return {full: warmupPlan(en,"full",ctx).map(x=>x.label+" x"+x.reps),
            note: ((document.querySelector('.warm-note')||{}).innerText||"").trim()};
  });
  console.log("   ", JSON.stringify(r));
  ck("no pound figure anywhere in it", !/\d+\s*(lb|kg)/.test(r.full.join(" ")), r.full.join(" | "));
  ck("it is bodyweight reps", r.full.every(l=> /bodyweight/.test(l)), r.full.join(" | "));
  ck("worded as the load being you", /you are the load here/.test(r.note), r.note.slice(0,80));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
