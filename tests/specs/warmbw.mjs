import { chromium, APP_URL } from './_e26.mjs';
/* "IT'S IMPOSSIBLE FOR ME TO DO THAT WARMUP, I WEIGH 139."

   Weighted dips, working number 144.6 lb, warming up with 80 lb. There is no 80 lb
   version of a dip for somebody who weighs 139.6: the lightest set available is you, and
   you cannot take 60 lb of yourself off between rungs.

   The ramp was taking percentages of a number that is mostly a person, because the
   switch saying "this movement counts me" had gone missing. That switch is worth
   repairing and it is not worth trusting here, because the impossibility does not depend
   on it: on an unassisted bodyweight movement there is no rung below your own weight,
   whatever any table says. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1300}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };
const BW = 139.6;
/* `counted` is whether the last logged session stamped bodyweight. The whole point is
   that the answer below is the same either way. */
const plan = (name, weight, counted)=> p.evaluate(a=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, warmups:'auto', plateStep:2.5, dbStep:5});
  S.bodyLog={[todayStr()]:{w:a.BW}};
  S.splitId=DEFAULT_SPLIT; applySplit();
  const wid=ROTATION[0];
  S.program[wid]=[{name:a.name, sets:3, reps:"4-8", weight:a.weight}];
  S.sessions=[{id:"s1", workoutId:wid, date:todayStr(-3), startedAt:Date.now()-3*864e5,
    finishedAt:Date.now()-3*864e5+3600e3,
    entries:[{name:a.name, bwOn: a.counted ? a.BW : undefined,
      sets:[{weight:String(a.weight), reps:"6", rpe:"7", done:true}]}]}];
  S.bwEx={};
  save(); S.active=null; startWorkout(wid); PF=null; TAB="workout"; save();
  const el=document.getElementById('preflight'); if(el) el.remove(); try{PF=null}catch(e){}
  render();
  const en=S.active.entries[0];
  return {rungs: warmupPlan(en, en.warm, {workoutId: wid, anyDay:false, occ:0})
            .map(x=> x.label + (x.reps ? " ×" + x.reps : "")),
          loads: warmupPlan(en, en.warm, {workoutId: wid, anyDay:false, occ:0})
            .map(x=> x.w || 0)};
}, {name, weight, counted, BW});

console.log("1 - THE REPORTED CARD, WITH THE SWITCH ON");
{
  const r = await plan("Weighted Chest Dips", 144.6, true);
  console.log("   ", JSON.stringify(r.rungs));
  ck("no rung is a weight at all", r.loads.every(w=> !(w > 0)), JSON.stringify(r.loads));
  ck("the warm-up is the movement itself", r.rungs.every(x=> /bodyweight/.test(x)),
     JSON.stringify(r.rungs));
}

console.log("\n2 - AND THE SAME CARD WITH THE SWITCH MISSING");
/* This is the screenshot: nothing on file says the movement counts the lifter, and the
   old ramp happily printed 60 / 95 / 130 lb. */
{
  const r = await plan("Weighted Chest Dips", 144.6, false);
  console.log("   ", JSON.stringify(r.rungs));
  ck("STILL NOTHING BELOW WHAT YOU WEIGH",
     !r.rungs.some(x=> { const n = parseFloat(x); return isFinite(n) && n < BW; }),
     JSON.stringify(r.rungs));
  ck("and it is the same honest instruction",
     r.rungs.every(x=> /bodyweight/.test(x)), JSON.stringify(r.rungs));
}

console.log("\n3 - WITH SOMETHING ON THE BELT, THE BELT IS WHAT RAMPS");
{
  const r = await plan("Weighted Chest Dips", BW + 40, false);
  console.log("   ", JSON.stringify(r.rungs));
  ck("the rungs are the added load, not a share of you",
     r.rungs.every(x=> { const n = parseFloat(x); return !isFinite(n) || n <= 40; }),
     JSON.stringify(r.rungs));
  ck("nothing claims a weight near your bodyweight",
     !r.rungs.some(x=> /13\d|14\d/.test(x)), JSON.stringify(r.rungs));
}

console.log("\n4 - A NUMBER UNDER YOUR WEIGHT IS THE BELT ON ITS OWN, AND IS LEFT ALONE");
/* Somebody who logs dips as "25" means 25 on the belt. Ramping that to 15 is a warm-up
   you can do, so it must not be swallowed by the rule above. */
{
  const r = await plan("Weighted Chest Dips", 25, false);
  console.log("   ", JSON.stringify(r.rungs));
  ck("it still ramps the belt", r.rungs.some(x=> { const n = parseFloat(x); return isFinite(n) && n > 0 && n < 25; }),
     JSON.stringify(r.rungs));
}

console.log("\n5 - AN ASSISTED MOVEMENT REALLY DOES GO BELOW YOUR WEIGHT");
{
  const r = await plan("Assisted Pull Up", 100, false);
  console.log("   ", JSON.stringify(r.rungs));
  ck("the machine can take weight off, so the ramp is a ramp",
     r.rungs.some(x=> { const n = parseFloat(x); return isFinite(n) && n > 0 && n < 100; }),
     JSON.stringify(r.rungs));
}

console.log("\n6 - AND AN ORDINARY BARBELL LIFT IS UNTOUCHED");
{
  const r = await plan("Barbell Bench Press", 185, false);
  console.log("   ", JSON.stringify(r.rungs));
  ck("it still ramps to the working load",
     r.rungs.filter(x=> parseFloat(x) > 0).length >= 2, JSON.stringify(r.rungs));
  ck("with the top rung under the working set",
     r.loads.every(w=> !(w > 185)), JSON.stringify(r.loads));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
