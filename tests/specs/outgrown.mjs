import { chromium, APP_URL } from './_e26.mjs';
/* "WHEN A USER GETS MAXIMUM REPS ON THE HIGHEST WEIGHT THEY HAVE FOR AN EXERCISE WITH
   DUMBBELLS OR MACHINE WEIGHT, OFFER TO CHANGE IT OUT FOR A DIFFERENT EXERCISE."

   Double progression assumes the load can always go up. At the end of the dumbbell rack
   or the top of a stack it cannot, and the app's advice collapsed to "hold this load and
   add reps" for ever, on a movement that had stopped being able to challenge the person
   doing it.

   Two ways to know. The rack max is a figure the app holds, so for dumbbells it can say
   outright that the next step does not exist. For a machine it has no idea where the
   stack ends, so it reads the behaviour instead: three sessions at one load, all of them
   topping the range, is somebody who would have added weight if there had been weight to
   add. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1400}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok   ":"  BROKEN ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
const ev=(fn,a)=>p.evaluate(fn,a);

const base = ()=> ev(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, rpe:true, dbMax:50, dbStep:5});
  S.splitId=DEFAULT_SPLIT; applySplit(); S.gyms=[]; S.active=null; S.sessions=[];
  save();
});

/* n sessions of `ex` at one load, each clearing `reps`, newest last. */
const runs = (ex, load, reps, n, plan)=> ev(a=>{
  const wid = ROTATION[0], d = 86400000, now = Date.now();
  S.program[wid] = [Object.assign({name:a.ex, sets:3, reps:"8-12", weight:a.load, rpe:"6-7"},
                                  a.plan || {})];
  S.sessions = [];
  for(let i = a.n; i >= 1; i--){
    const t = now - i*7*d;
    S.sessions.push({id:"s"+i, workoutId:wid, date:dayStr(t), startedAt:t,
      finishedAt:t + 3600e3, feel:4,
      entries:[{name:a.ex, reps:"8-12", rpe:"6-7",
        sets:[0,1,2].map(()=>({weight:String(a.load), reps:String(a.reps), rpe:"7", done:true}))}]});
  }
  save();
  const sess = S.sessions[S.sessions.length - 1];
  const row = progressionFor(sess, sess.entries[0]) || {};
  return {kind: row.kind, msg: row.msg, sub: row.sub, to: row.to,
          alts: (row.alts || []).map(x=> x.name),
          outgrown: row.outgrown ? {load: row.outgrown.load, n: row.outgrown.n,
                                    opts: row.outgrown.opts.map(x=> x.name)} : null};
}, {ex, load, reps, n, plan: plan || null});

console.log("1 - THE END OF THE RACK, WITH THE TOP OF THE RANGE CLEARED");
{
  await base();
  const r = await runs("Dumbbell Bench Press", 50, 12, 1);
  console.log("    " + r.kind + ": " + r.msg);
  console.log("    alts: " + JSON.stringify(r.alts));
  ck("it is not a raise", r.kind !== "up", String(r.kind));
  ck("it offers a different movement", r.kind === "harder" && !!r.to, r.kind + " -> " + r.to);
  ck("and the one it leads with has more room than a dumbbell",
     /Barbell|Smith|Machine/i.test(r.to || ""), String(r.to));
  ck("with other choices behind it", r.alts.length > 0, JSON.stringify(r.alts));
  ck("it says why the rack is the problem", /no heavier one/.test(r.sub || ""), (r.sub||"").slice(0,120));
  ck("and where to restart", /Rebuild from 8 reps/.test(r.sub || ""), (r.sub||"").slice(-60));
}

console.log("2 - NOT WHILE THERE IS STILL RACK LEFT");
{
  await base();
  await ev(()=>{ trainPrefs().dbMax = 80; save(); });
  const r = await runs("Dumbbell Bench Press", 50, 12, 1);
  ck("the raise is still the answer", r.kind === "up", String(r.kind));
  ck("and nothing is offered as a swap", !r.to || r.kind !== "harder", String(r.to));
}

console.log("3 - NOT WHILE THE RANGE IS NOT BEING CLEARED");
{
  await base();
  const r = await runs("Dumbbell Bench Press", 50, 9, 1);   // inside 8-12, not at the top
  ck("nothing fires", r.kind !== "harder", String(r.kind));
}

console.log("4 - A MACHINE: THE CEILING THE APP CANNOT SEE, READ OFF THREE SESSIONS");
{
  await base();
  const r = await runs("Leg Press", 300, 12, 3);
  console.log("    " + r.kind + ": " + r.msg);
  console.log("    outgrown: " + JSON.stringify(r.outgrown));
  /* The raise still leads: the app does not know the stack ends, and somebody may simply
     not have got round to adding the weight. */
  ck("the raise is still the recommendation", r.kind === "up", String(r.kind));
  ck("but the ceiling is reported under it", !!r.outgrown, JSON.stringify(r.outgrown));
  ck("naming the load it has not moved from", r.outgrown && r.outgrown.load === 300,
     r.outgrown && String(r.outgrown.load));
  ck("over three sessions", r.outgrown && r.outgrown.n === 3, r.outgrown && String(r.outgrown.n));
  /* The answer a machine at the top of the stack actually has: one leg at a time. */
  ck("and it leads with the single-leg version",
     r.outgrown && /Single-Leg/i.test(r.outgrown.opts[0] || ""),
     r.outgrown && JSON.stringify(r.outgrown.opts));
}

console.log("5 - TWO SESSIONS AT ONE LOAD IS NOT A CEILING");
{
  await base();
  const r = await runs("Leg Press", 300, 12, 2);
  ck("nothing is inferred", !r.outgrown, JSON.stringify(r.outgrown));
}

console.log("6 - AND NOT WHEN THE LOAD HAS BEEN MOVING");
{
  await base();
  const r = await ev(()=>{
    const wid = ROTATION[0], d = 86400000, now = Date.now();
    S.program[wid] = [{name:"Leg Press", sets:3, reps:"8-12", weight:300, rpe:"6-7"}];
    S.sessions = [280, 290, 300].map((w, i)=>{
      const t = now - (3-i)*7*d;
      return {id:"m"+i, workoutId:wid, date:dayStr(t), startedAt:t, finishedAt:t+3600e3, feel:4,
        entries:[{name:"Leg Press", reps:"8-12", rpe:"6-7",
          sets:[0,1,2].map(()=>({weight:String(w), reps:"12", rpe:"7", done:true}))}]};
    });
    save();
    const sess = S.sessions[2];
    const row = progressionFor(sess, sess.entries[0]) || {};
    return {kind: row.kind, outgrown: !!row.outgrown};
  });
  ck("a load that is still climbing is not a ceiling", r.outgrown === false, String(r.outgrown));
}

console.log("7 - A SWAP THAT DUPLICATES THE DAY IS NOT A SWAP");
{
  await base();
  const r = await ev(()=>{
    const wid = ROTATION[0];
    /* Barbell Bench Press is the obvious upgrade from the dumbbell version, and it is
       already in this day — so it must not be offered. */
    S.program[wid] = [{name:"Dumbbell Bench Press", sets:3, reps:"8-12", weight:50, rpe:"6-7"},
                      {name:"Barbell Bench Press",  sets:3, reps:"5-8",  weight:185, rpe:"7-8"}];
    save();
    return outgrownOptions("Dumbbell Bench Press").map(x=> x.name);
  });
  console.log("    " + JSON.stringify(r));
  ck("the one already in the day is left out", r.indexOf("Barbell Bench Press") < 0, JSON.stringify(r));
  ck("and there is still something to offer", r.length > 0, JSON.stringify(r));
}

console.log("8 - ONE LIMB AT A TIME IS ONLY AN ANSWER WHERE THE LOAD IS SHARED");
{
  const u = await ev(()=> ({
    leg:  unilateralUpFor("Leg Press"),
    pull: unilateralUpFor("Lat Pulldown"),
    db:   unilateralUpFor("Dumbbell Bench Press"),
    done: unilateralUpFor("Single-Arm Lat Pulldown")
  }));
  console.log("    " + JSON.stringify(u));
  ck("a leg press has a single-leg version", u.leg === "Single-Leg Leg Press", String(u.leg));
  ck("a lat pulldown has a single-arm one", /Single-Arm/.test(u.pull || ""), String(u.pull));
  /* The same dumbbell either way, so it buys nothing. */
  ck("a dumbbell press does not", u.db === null, String(u.db));
  ck("and neither does one that is already one-sided", u.done === null, String(u.done));
}

console.log("9 - THE OFFER IS A BUTTON, AND PRESSING IT REWRITES THE PLAN");
{
  await base();
  await runs("Dumbbell Bench Press", 50, 12, 1);
  const r = await ev(()=>{
    const to = outgrownOptions("Dumbbell Bench Press")[0].name;
    const ok = applyHarderVariation("Dumbbell Bench Press", to, "test");
    const e = (S.program[ROTATION[0]] || [])[0];
    return {ok, now: e && e.name, to, weight: e && e.weight,
            logged: (S.planLog || []).some(x=> x && /swapped/.test(x.kind || ""))};
  });
  ck("the swap applies", r.ok === true, String(r.ok));
  ck("the plan carries the new movement", r.now === r.to, r.now + " vs " + r.to);
  ck("the old load does not come with it", r.weight == null, String(r.weight));
  ck("and the change is in the plan history", r.logged === true, String(r.logged));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
