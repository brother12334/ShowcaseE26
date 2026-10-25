import { chromium, APP_URL } from './_e26.mjs';
/* "ACCIDENTALLY FINISHED A WORKOUT WITHOUT LOGGING ANYTHING AND THEN I DELETED IT IN
   HISTORY AND NOW IT WON'T LET ME GO BACK TO THE PUSH B (THE DAY I'M SUPPOSED TO DO
   TODAY) EVEN IF I PRESS CHOOSE MY OWN DAY."

   The checkmarks were always derived from the sessions on disk, so deleting the session
   did clear its tick. The pointer was not: it could only step FORWARD, so it stayed on
   the day after the one that had been deleted — and slotIsPast() reads anything behind
   the pointer as spent. The day was then unreachable from either route: inert on the
   strip, and refused by pickDayToday() under free choice.

   The pointer is the earliest slot not done. This spec is that, from both ends. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1200}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };
const ev = (fn,a)=> p.evaluate(fn,a);

await ev(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false});
  S.splitId=DEFAULT_SPLIT; applySplit();
  S.cycleStart = Date.now() - 6*86400000; S.cycleDone = []; S.pointer = 0;
  save();
});

console.log("1 - THREE DAYS DONE, AND THE CYCLE IS ON THE FOURTH");
{
  const r = await ev(()=>{
    const mk = (i, agoDays)=> ({id:"s"+i, workoutId:ROTATION[i], date: todayStr(-agoDays),
      startedAt: Date.now() - agoDays*86400000, finishedAt: Date.now() - agoDays*86400000 + 3600e3,
      entries:[{name:"Bench Press", sets:[{weight:"135", reps:"8", done:true}]}]});
    S.sessions = [mk(0, 5), mk(1, 4), mk(2, 3)];
    recomputeCycle(false); save();
    return {done: S.cycleDone.slice().sort(), pointer: S.pointer, next: dayName(ROTATION[S.pointer])};
  });
  console.log("   ", JSON.stringify(r));
  ck("the first three slots are ticked", r.done.join(",") === "0,1,2", r.done.join(","));
  ck("and the rotation is on the fourth", r.pointer === 3, String(r.pointer));
}

console.log("\n2 - THE THIRD DAY IS DELETED FROM HISTORY");
/* An empty session finished by accident is still a session: it ticks its slot and moves
   the rotation on. Deleting it has to put both of those back. */
{
  const r = await ev(()=>{
    const id = "s2", wid = ROTATION[2];
    S.sessions = S.sessions.filter(s=> s.id !== id);
    if(!S.deleted.includes(id)) S.deleted.push(id);
    recomputeCycle(false); save();
    return {done: S.cycleDone.slice().sort(), pointer: S.pointer,
            past: slotIsPast(2), locked: slotIsLocked(2), next: dayName(ROTATION[S.pointer])};
  });
  console.log("   ", JSON.stringify(r));
  ck("its tick is gone", r.done.join(",") === "0,1", r.done.join(","));
  ck("THE ROTATION COMES BACK TO IT", r.pointer === 2, String(r.pointer));
  ck("it no longer reads as a day already had", r.past === false, String(r.past));
  ck("and nothing is locking it either", r.locked === false, String(r.locked));
}

console.log("\n3 - SO IT IS THE DAY THE APP OFFERS, AND THE STRIP WILL TAKE A TAP");
{
  const r = await ev(()=>{
    TAB = "today"; render();
    const plate = document.querySelector('[data-slot="2"]');
    return {today: todaysWorkoutId() === ROTATION[2],
            onStrip: !!plate,
            inert: plate ? plate.classList.contains("inert") : null,
            spent: plate ? plate.classList.contains("done") : null};
  });
  console.log("   ", JSON.stringify(r));
  ck("today's session is that day again", r.today, String(r.today));
  ck("its plate is on the strip and live", r.onStrip && r.inert === false,
     JSON.stringify({onStrip: r.onStrip, inert: r.inert}));
  ck("and not drawn as spent", r.spent === false, String(r.spent));
}

console.log("\n4 - AND CHOOSE-YOUR-OWN-DAY WILL TAKE IT TOO");
/* The other half of the report. Free choice refuses a slot slotIsPast() calls spent, so
   it was blocked by the same stale pointer. */
{
  const r = await ev(()=>{
    S.prefs.dayOrder = "any"; save();
    const ok = pickDayToday(ROTATION[2]);
    return {free: daysFree(), ok, today: todaysWorkoutId() === ROTATION[2]};
  });
  console.log("   ", JSON.stringify(r));
  ck("free choice is on", r.free, String(r.free));
  ck("and picking that day is accepted", r.ok === true, String(r.ok));
  ck("so it is what today runs", r.today, String(r.today));
}

console.log("\n5 - A DAY SKIPPED UNDER FREE CHOICE IS STILL NEXT, NOT SPENT");
/* The pointer being derived must not undo the other rule this file states: an override
   spends nothing, so the day you stepped over stays unchecked and comes up next. */
{
  const r = await ev(()=>{
    const mk = (i, agoDays)=> ({id:"k"+i, workoutId:ROTATION[i], date: todayStr(-agoDays),
      startedAt: Date.now() - agoDays*86400000, finishedAt: Date.now() - agoDays*86400000 + 3600e3,
      entries:[{name:"Bench Press", sets:[{weight:"135", reps:"8", done:true}]}]});
    S.sessions = [mk(0, 3), mk(2, 1)];      // did the third day instead of the second
    clearDayPick();
    recomputeCycle(false); save();
    return {done: S.cycleDone.slice().sort(), pointer: S.pointer, past1: slotIsPast(1)};
  });
  console.log("   ", JSON.stringify(r));
  ck("both trained days are ticked", r.done.join(",") === "0,2", r.done.join(","));
  ck("the one stepped over is still what comes next", r.pointer === 1, String(r.pointer));
  ck("and it is not marked as a day already had", r.past1 === false, String(r.past1));
}

console.log("\n6 - A DAY THAT REALLY WAS TRAINED IS STILL SPENT");
{
  const r = await ev(()=> ({past0: slotIsPast(0), past2: slotIsPast(2),
                            pick0: pickDayToday(ROTATION[0])}));
  console.log("   ", JSON.stringify(r));
  ck("the days with sessions behind them stay spent", r.past0 && r.past2,
     JSON.stringify(r));
  ck("and free choice will not re-run one", r.pick0 === false, String(r.pick0));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
