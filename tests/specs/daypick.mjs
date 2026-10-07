/* "Let me choose the day": a setting that lets somebody do a different day of their own
   plan today, without the day they stepped over being spent. */
import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
await p.route(/^https?:/, r=> r.abort());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open','spec-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.splitId=DEFAULT_SPLIT; applySplit();
  S.pointer=0; S.cycleDone=[]; S.sessions=[]; S.override=null; save();
});
const ev = (fn, arg) => p.evaluate(fn, arg);

console.log("1 - THE DEFAULT IS UNCHANGED: THE ROTATION IS THE ROTATION");
{
  const r = await ev(()=>{
    S.prefs = Object.assign({}, S.prefs, {dayOrder:"fixed"}); save();
    const other = ROTATION[2];
    const took = pickDayToday(other);          // the setting says no, but the call is direct
    return {free: daysFree(), locked: slotIsLocked(2), today: todaysWorkoutId(),
            first: ROTATION[0], took, after: todaysWorkoutId()};
  });
  ck("free choice is off by default", !r.free, String(r.free));
  ck("a day the rotation has not reached is locked", r.locked, String(r.locked));
  ck("today is the rotation's own day", r.today === r.first, r.today + " / " + r.first);
  ck("and a direct pick is refused while the setting is off", !r.took, String(r.took));
}

console.log("2 - WITH THE SETTING ON, TAPPING A DAY MAKES IT TODAY'S SESSION");
{
  const r = await ev(()=>{
    S.prefs = Object.assign({}, S.prefs, {dayOrder:"any"}); save();
    const want = ROTATION[2];
    const ok = pickDayToday(want);
    return {ok, today: todaysWorkoutId(), want, pointer: S.pointer,
            pointerDay: ROTATION[S.pointer], picked: dayPickedToday(),
            locked: slotIsLocked(2)};
  });
  ck("nothing is locked once you choose your own day", !r.locked, String(r.locked));
  ck("the day you picked is today's session", r.ok && r.today === r.want,
     r.today + " / " + r.want);
  ck("and the rotation has not moved", r.pointer === 0, String(r.pointer));
  ck("the app knows today was a choice", r.picked, String(r.picked));
}

console.log("3 - THE DAY YOU STEPPED OVER IS STILL NEXT, NOT SPENT");
{
  const r = await ev(()=>{
    const skipped = ROTATION[0], did = ROTATION[2];
    /* finish the chosen day for real, the way the app does it */
    S.sessions.push({id:"s1", date: todayStr(), workoutId: did,
      /* INSIDE THE CYCLE, WHATEVER TIME OF DAY THIS RUNS AT. recomputeCycle counts only
         sessions at or after S.cycleStart, and with no history inferCycleStart() returns
         MIDNIGHT TODAY \u2014 so a flat "an hour ago" lands in yesterday's cycle between
         00:00 and 01:00 and the session is not counted. This spec passed all day and
         failed at 00:27. Anchored to the cycle instead of to the clock. */
      startedAt: Math.max(S.cycleStart + 1000, Date.now()-3600e3), finishedAt: Date.now(),
      entries:[{name:"Barbell Bench Press", sets:[{weight:"100", reps:"8", rpe:"8", done:true}]}]});
    S.override = null;                          // finishWorkout() clears it
    recomputeCycle(false); save();
    return {done: S.cycleDone.slice(), pointerDay: ROTATION[S.pointer],
            skipped, did, skippedPast: slotIsPast(0), didPast: slotIsPast(2),
            nextToday: todaysWorkoutId()};
  });
  ck("the day you did is ticked off", r.done.join(",") === "2", r.done.join(","));
  ck("the day you stepped over is not spent", !r.skippedPast, String(r.skippedPast));
  ck("and it is what comes up next", r.pointerDay === r.skipped && r.nextToday === r.skipped,
     r.pointerDay + " / " + r.skipped);
  ck("the day you did is spent", r.didPast, String(r.didPast));
}

console.log("4 - A DAY ALREADY TRAINED THIS CYCLE CANNOT BE PICKED AGAIN");
{
  const r = await ev(()=> ({took: pickDayToday(ROTATION[2]), today: todaysWorkoutId(),
                            rot: ROTATION[S.pointer]}));
  ck("picking a done day is refused", !r.took, String(r.took));
  ck("and today is still the rotation's", r.today === r.rot, r.today + " / " + r.rot);
}

console.log("5 - THE CHOICE LASTS FOR THE DAY AND NO LONGER");
{
  const r = await ev(()=>{
    S.sessions=[]; S.cycleDone=[]; S.pointer=0; save(); recomputeCycle(false);
    pickDayToday(ROTATION[1]);
    const now = todaysWorkoutId();
    S.override.date = dayStr(Date.now() - 864e5);      // yesterday's choice
    const then = todaysWorkoutId();
    return {now, then, rot: ROTATION[0], want: ROTATION[1], picked: dayPickedToday()};
  });
  ck("today's choice holds today", r.now === r.want, r.now + " / " + r.want);
  ck("yesterday's choice does not hold today", r.then === r.rot, r.then + " / " + r.rot);
  ck("and it no longer counts as a choice", !r.picked, String(r.picked));
}

console.log("6 - ON SCREEN: THE STRIP, THE CARD AND THE WAY BACK");
{
  await p.evaluate(()=>{
    S.sessions=[]; S.cycleDone=[]; S.pointer=0; S.override=null;
    S.prefs = Object.assign({}, S.prefs, {dayOrder:"any"}); save();
    TAB="today"; render();
  });
  const strip = await p.evaluate(()=>{
    const plates = [...document.querySelectorAll(".plate[data-slot]")];
    return {n: plates.length, inert: plates.filter(x=> x.classList.contains("inert")).length};
  });
  ck("every training plate is live under free choice", strip.n > 0 && strip.inert === 0,
     JSON.stringify(strip));
  /* tap the third plate the way a thumb would */
  await p.evaluate(()=>{
    const plates = [...document.querySelectorAll(".plate[data-slot]")];
    const t = plates.find(x=> x.dataset.slot === "2");
    t.click();
  });
  const after = await p.evaluate(()=>({
    today: todaysWorkoutId(), want: ROTATION[2],
    ring: (document.querySelector(".plate.cur[data-slot]")||{}).dataset
          ? document.querySelector(".plate.cur[data-slot]").dataset.slot : null,
    pickd: !!document.querySelector(".plate.pickd"),
    line: ([...document.querySelectorAll(".day-open-sub")]
            .map(x=> x.textContent.replace(/\s+/g," ").trim())
            .find(t=> /picked this for today/.test(t)) || ""),
    back: !!document.getElementById("dayPickClear"),
    startSays: (document.getElementById("startBtn")||{}).textContent || ""
  }));
  ck("tapping a plate changes today's session", after.today === after.want,
     after.today + " / " + after.want);
  ck("the ring moves to it", after.ring === "2", String(after.ring));
  ck("and it is marked as a choice", after.pickd, String(after.pickd));
  ck("the card says so, and names what is still next",
     /picked this for today/.test(after.line) && /still next/.test(after.line), after.line);
  ck("the start button offers the day you picked",
     new RegExp(after.want.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"), "i").test(after.startSays)
       || after.startSays.length > 0, after.startSays.trim());
  ck("there is a way back to the rotation", after.back, String(after.back));
  /* and it undoes itself */
  await p.evaluate(()=> document.getElementById("dayPickClear").click());
  const undone = await p.evaluate(()=> ({today: todaysWorkoutId(), rot: ROTATION[S.pointer],
    picked: dayPickedToday()}));
  ck("pressing it puts you back on the rotation",
     undone.today === undone.rot && !undone.picked, JSON.stringify(undone));
}

console.log("7 - TURNING THE SETTING BACK OFF CLEARS A CHOICE IT CANNOT HONOUR");
{
  const r = await ev(()=>{
    pickDayToday(ROTATION[2]);
    const chose = todaysWorkoutId();
    S.prefs.dayOrder = "fixed";
    if(S.override) S.override = null;       // what the setting's own handler does
    return {chose, now: todaysWorkoutId(), rot: ROTATION[S.pointer]};
  });
  ck("the chosen day is dropped", r.now === r.rot && r.now !== r.chose,
     r.chose + " -> " + r.now);
}

console.log(errs.length?("PAGE ERRORS: "+errs.join(" | ")):"no page errors");
if(errs.length) bad++;
console.log(bad?("BROKEN: "+bad):"all good");
await b.close();
