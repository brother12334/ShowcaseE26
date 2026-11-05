import { chromium, APP_URL } from './_e26.mjs';
/* "DOES THE APP HAVE A MECHANISM WHERE IF THE USER IS DOING REPS INSIDE THE REP RANGE
   BUT NOT IN THE RPE RANGE IT'LL ASK IF THEY WANNA GO DOWN IN WEIGHT?" — it did not.

   Everything else here reads REPS. Double progression earns a raise by clearing the top
   of the range and effort is only a gate on it, which leaves one state with no exit: hit
   8-12 at RPE 10 every week and the raise is blocked forever, nothing says the load is
   why, and "hold this load one more session" repeats indefinitely. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1600}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };
const ev=(fn,a)=>p.evaluate(fn,a);

/* `runs` is a list of [reps, rpe] per session, newest last, all at the plan's load. */
const seed = (runs, opts)=> ev(a=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, rpe:true, plateStep:2.5});
  S.splitId=DEFAULT_SPLIT; applySplit();
  const wid=ROTATION[0], d=86400000, now=Date.now();
  S.program[wid]=[Object.assign({name:"Barbell Bench Press", sets:3, reps:"8-12",
                                 weight:185, rpes:[8,8,8]}, a.opts && a.opts.plan || {})];
  S.active=null; S.sessions=(a.runs||[]).map((r,i)=>({
    id:"s"+i, workoutId:wid, date: dayStr(now-(a.runs.length-i)*7*d),
    startedAt: now-(a.runs.length-i)*7*d, finishedAt: now-(a.runs.length-i)*7*d+3600e3,
    entries:[{name:"Barbell Bench Press", reps:"8-12", rpes:[8,8,8],
      sets:[0,1,2].map(()=>({weight:String(a.opts && a.opts.load || 185),
                             reps:String(r[0]), rpe:String(r[1]), done:true}))}]}));
  save();
  return true;
}, {runs, opts: opts||null});

console.log("1 - REPS IN RANGE, EFFORT WELL PAST THE TARGET, TWICE");
{
  await seed([[10,10],[10,9.5]]);
  const r = await ev(()=> effortMismatchFor("Barbell Bench Press"));
  console.log("   ", JSON.stringify(r && {dir:r.dir, from:r.from, to:r.to, hits:r.hits.length}));
  ck("it is a finding", !!r, String(!!r));
  ck("and it says go DOWN", r && r.dir === "down", r && r.dir);
  ck("by one step the gear can do", r && r.to === 180, r && String(r.to));
  ck("on the evidence of both sessions", r && r.hits.length === 2, r && String(r.hits.length));
}

console.log("2 - ONE HARD SESSION IS NOT A PATTERN");
/* Self-reported RPE is off by a point or two in people who are not competitive lifters,
   and biased toward under-reporting. One reading is noise. */
{
  await seed([[10,8],[10,10]]);
  const r = await ev(()=> effortMismatchFor("Barbell Bench Press"));
  ck("nothing is proposed off a single session", r === null, JSON.stringify(r));
}

console.log("3 - AND MARGINALLY OVER IS NOT OVER");
{
  await seed([[10,9],[10,9]]);
  const r = await ev(()=> effortMismatchFor("Barbell Bench Press"));
  ck("a point over the target is left alone", r === null, JSON.stringify(r));
}

console.log("4 - THE OTHER DIRECTION: IN RANGE AND MILES SHORT OF THE TARGET");
{
  await seed([[10,6],[10,6]]);
  const r = await ev(()=> effortMismatchFor("Barbell Bench Press"));
  console.log("   ", JSON.stringify(r && {dir:r.dir, from:r.from, to:r.to}));
  ck("it offers to go up", r && r.dir === "up", r && r.dir);
  ck("by one step", r && r.to === 190, r && String(r.to));
}

console.log("5 - BUT NOT WHERE DOUBLE PROGRESSION IS ALREADY ABOUT TO");
/* Clearing the top of the range at an easy effort is what earns a raise anyway, and two
   screens proposing the same increase would apply it twice. */
{
  await seed([[12,6],[12,6]]);
  const r = await ev(()=> effortMismatchFor("Barbell Bench Press"));
  ck("the raise is left to the progression rule", r === null, JSON.stringify(r));
}

console.log("6 - REPS OUTSIDE THE RANGE ARE NOT THIS CARD'S BUSINESS");
{
  await seed([[5,10],[5,10]]);
  const r = await ev(()=> effortMismatchFor("Barbell Bench Press"));
  ck("falling short of the range is the impossible-load card, not this one",
     r === null, JSON.stringify(r));
}

console.log("7 - IT READS THE BAND A PLAN WRITES AS A RANGE, NOT JUST A PER-SET RAMP");
/* An imported programme usually says "RPE 7-9" once rather than a per-set ramp, which is
   what the card shows and what somebody is actually working to. A band has stated its own
   tolerance, so a full point outside it counts where 1.5 is needed past a single number —
   otherwise RPE 10 against 7-9, which is only one over the top, could never speak. */
{
  await ev(()=>{
    const wid=ROTATION[0], d=86400000, now=Date.now();
    S.program[wid]=[{name:"Barbell Bench Press", sets:3, reps:"8-12", weight:185, rpe:"7-9"}];
    S.sessions=[0,1].map(i=>({id:"b"+i, workoutId:wid, date:dayStr(now-(2-i)*7*d),
      startedAt:now-(2-i)*7*d, finishedAt:now-(2-i)*7*d+3600e3,
      entries:[{name:"Barbell Bench Press", reps:"8-12", rpe:"7-9",
        sets:[0,1,2].map(()=>({weight:"185", reps:"10", rpe:"10", done:true}))}]}));
    save();
  });
  const r = await ev(()=> effortMismatchFor("Barbell Bench Press"));
  console.log("   ", JSON.stringify(r && {dir:r.dir, to:r.to}));
  ck("RPE 10 against a band topping out at 9 counts as over", r && r.dir === "down",
     JSON.stringify(r && r.dir));
}

console.log("8 - IT SHOWS UP ON THE BODY TAB AND APPLIES IN A TAP");
{
  await seed([[10,10],[10,9.5]]);
  const r = await ev(()=>{
    TAB="body"; render();
    const row = document.querySelector('[data-effortfix]');
    return {shown: !!row,
            txt: row ? row.closest('.ef-row').innerText.replace(/\s+/g," ").trim() : null};
  });
  console.log("   ", r.txt);
  ck("the row is on the Body tab", r.shown, String(r.shown));
  ck("it names the movement and the change", /Bench Press.*185 lb . 180 lb/.test(r.txt || ""), r.txt);
  ck("and says what it read", /inside the range/.test(r.txt || ""), r.txt);
  const after = await ev(()=>{
    document.querySelector('[data-effortfix]').click();
    const e = findProgramEntry("Barbell Bench Press");
    const log = (S.planLog||[]).filter(c=> c.kind === "weight");
    return {weight: e.weight, logged: log.length,
            note: log.length ? log[log.length-1].note : null,
            gone: !document.querySelector('[data-effortfix]')};
  });
  console.log("   ", JSON.stringify(after));
  ck("the plan is written", after.weight === 180, String(after.weight));
  ck("the change log says why", /past the target/.test(after.note || ""), after.note);
  ck("and the row goes once it is answered", after.gone, String(after.gone));
}

console.log("9 - AND IT REACHES THE SESSION YOU ARE IN THE MIDDLE OF");
{
  const r = await ev(()=>{
    const wid=ROTATION[0];
    findProgramEntry("Barbell Bench Press").weight = 185;
    S.active=null; startWorkout(wid); PF=null;
    const el=document.getElementById('preflight'); if(el) el.remove(); try{PF=null}catch(e){}
    const en = S.active.entries[0];
    en.sets[0].weight="185"; en.sets[0].reps="10"; en.sets[0].rpe="10"; en.sets[0].done=true;
    en.sets[1].weight="185";                 // the plan's load, not yet done
    en.sets[2].weight="135";                 // a number you chose
    save();
    const moved = effortApplyToActive("Barbell Bench Press", 185, 180);
    return {moved, w: S.active.entries[0].sets.map(st=> st.weight)};
  });
  console.log("   ", JSON.stringify(r));
  ck("the rows still to come move", r.w[1] === "180", r.w.join(","));
  ck("A SET YOU HAVE ALREADY LOGGED IS NOT REWRITTEN", r.w[0] === "185", r.w.join(","));
  ck("and a weight you chose yourself is left alone", r.w[2] === "135", r.w.join(","));
}

console.log("10 - IT STAYS QUIET WHERE IT SHOULD");
{
  const quiet = await ev(()=>{
    const out = {};
    const base = ()=>{
      const wid=ROTATION[0], d=86400000, now=Date.now();
      S.active=null;
      S.program[wid]=[{name:"Barbell Bench Press", sets:3, reps:"8-12", weight:185, rpes:[8,8,8]}];
      S.sessions=[0,1].map(i=>({id:"q"+i, workoutId:wid, date:dayStr(now-(2-i)*7*d),
        startedAt:now-(2-i)*7*d, finishedAt:now-(2-i)*7*d+3600e3,
        entries:[{name:"Barbell Bench Press", reps:"8-12", rpes:[8,8,8],
          sets:[0,1,2].map(()=>({weight:"185", reps:"10", rpe:"6", done:true}))}]}));
      save();
    };
    base(); S.prefs.rpe = false; save();
    out.rpeOff = effortMismatchFor("Barbell Bench Press");
    S.prefs.rpe = true; save();
    out.on = !!effortMismatchFor("Barbell Bench Press");
    base(); S.hurts = [{exKey: nrm("Barbell Bench Press"), where:"shoulder",
                        level:"ache", at:Date.now()}]; save();
    out.hurt = effortMismatchFor("Barbell Bench Press");
    S.hurts = []; save();
    base(); S.program[ROTATION[0]][0].weight = 225; save();   // worked at 185, plan says 225
    out.otherLoad = effortMismatchFor("Barbell Bench Press");
    return out;
  });
  console.log("   ", JSON.stringify({rpeOff: quiet.rpeOff, on: quiet.on, hurt: quiet.hurt, otherLoad: quiet.otherLoad}));
  ck("nothing at all with RPE tracking off", quiet.rpeOff === null, JSON.stringify(quiet.rpeOff));
  ck("and the same data does speak with it on", quiet.on === true, String(quiet.on));
  ck("no raise offered on a movement carrying a niggle", quiet.hurt === null, JSON.stringify(quiet.hurt));
  ck("and it does not read sets worked at some other load",
     quiet.otherLoad === null, JSON.stringify(quiet.otherLoad));
}

console.log("11 - A PLAN THAT HAS RUN AHEAD OF YOU STILL GETS READ");
/* Reported as "I don't see it". Grind RPE 10 at 144.6, have the reps earn a raise to
   149.6, and the sessions no longer match the number in the plan - so the card went
   quiet at exactly the moment the load had just been moved the wrong way. The hard
   sessions are read on their OWN load now, as long as none is heavier than the plan. */
{
  await seed([[10,10],[10,10]], {load: 185});
  const r = await ev(()=>{
    findProgramEntry("Barbell Bench Press").weight = 190;   // the raise that outran you
    save();
    return effortMismatchFor("Barbell Bench Press");
  });
  console.log("   ", JSON.stringify(r && {dir:r.dir, from:r.from, to:r.to, worked:r.worked}));
  ck("it still speaks", !!r, String(!!r));
  ck("the cut is measured from what you actually lifted", r && r.to === 180, r && String(r.to));
  ck("and it says the plan had moved past it", r && r.worked === 185, r && String(r.worked));
}

console.log("12 - BUT A SET HEAVIER THAN THE PLAN IS A DIFFERENT FACT");
{
  await seed([[10,10],[10,10]], {load: 225});
  const r = await ev(()=>{
    findProgramEntry("Barbell Bench Press").weight = 185; save();
    return effortMismatchFor("Barbell Bench Press");
  });
  ck("going over the plan on the day does not cut the plan", r === null, JSON.stringify(r));
}

console.log("13 - AND SILENCE SAYS SO, RATHER THAN LOOKING LIKE NOTHING IS THERE");
{
  const r = await ev(()=>{
    const wid=ROTATION[0], d=86400000, now=Date.now();
    S.program[wid]=[{name:"Barbell Bench Press", sets:3, reps:"8-12", weight:185, rpes:[8,8,8]}];
    S.sessions=[0,1].map(i=>({id:"n"+i, workoutId:wid, date:dayStr(now-(2-i)*7*d),
      startedAt:now-(2-i)*7*d, finishedAt:now-(2-i)*7*d+3600e3,
      entries:[{name:"Barbell Bench Press", reps:"8-12", rpes:[8,8,8],
        sets:[0,1,2].map(()=>({weight:"185", reps:"10", rpe:"8", done:true}))}]}));
    save(); TAB="body"; render();
    const ok = document.body.innerText.replace(/\s+/g," ");
    const hasBlock = /The weight, not the reps/i.test(ok);
    S.prefs.rpe = false; save(); render();
    const off = document.body.innerText.replace(/\s+/g," ");
    S.prefs.rpe = true; save();
    return {hasBlock, nothing: /Nothing to change/i.test(ok), readable: effortReadable(),
            offSays: /rating is off/i.test(off)};
  });
  console.log("   ", JSON.stringify(r));
  ck("the block is on the tab even with nothing wrong", r.hasBlock, String(r.hasBlock));
  ck("and says so in as many words", r.nothing, String(r.nothing));
  ck("counting what it could read", r.readable === 1, String(r.readable));
  ck("with RPE off it says that is why", r.offSays, String(r.offSays));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
