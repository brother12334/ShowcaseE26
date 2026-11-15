import { chromium, APP_URL } from './_e26.mjs';
/* P0-1 — AUTOMATION MIXED UP THE SAME EXERCISE ACROSS DIFFERENT PLAN SLOTS.

   From the Nov 15 2026 training-data audit of one user's export:

     Nov 5: the Push B overhead triceps extension collapsed (90 x 8, 9, 5). Minutes later
     the app cut the PUSH A one 90 -> 85 lb, reason "reps collapsed across the sets". Push
     A's own last session had not collapsed. The user reversed it.

     Nov 13: the Body tab cut LEGS A Smith Machine Squat 80 -> 70, triggered by the LEGS B
     session on Nov 9 where squat is third, after RDL and hip thrust. On Legs A squat is
     done first, fresh, and the previous Legs A session was the user's best squat.

   The flag records sess.workoutId and always has. The apply path threw it away:
   findProgramEntryWhere(name) walks DAYS in order and returns the FIRST day carrying
   that name, so every Push B finding landed on Push A and every Legs B finding on Legs
   A. addRestToExercise() did the same and then logged the change against no day at all,
   which is why so many rest rows in the export read "Workout" instead of a day. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1200}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok   ":"  BROKEN ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
const ev=(fn,a)=>p.evaluate(fn,a);

/* The same movement in two days. `rows` is the collapsing session, logged on the SECOND
   of the two days. Returns what each day's slot looks like afterwards. */
const run = (exercise, loadA, loadB, rows, choice)=> ev(a=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, rpe:true});
  S.splitId=DEFAULT_SPLIT; applySplit(); S.active=null; S.flags=[]; S.planLog=[];
  const A = DAYS[0], B = DAYS[2];                 // first and third day of the rotation
  S.program[A] = [{name:a.exercise, sets:3, reps:"8-12", weight:a.loadA, rpe:"7-9", rest:[180,240]}];
  S.program[B] = [{name:a.exercise, sets:3, reps:"8-12", weight:a.loadB, rpe:"7-9", rest:[180,240]}];
  const t = Date.now() - 86400e3;
  const sess = {id:"s-b", workoutId: B, date: dayStr(t), startedAt:t, finishedAt:t+3600e3, feel:4,
    entries:[{name:a.exercise, reps:"8-12", rpe:"7-9",
      sets: a.rows.map(r=> ({weight:String(r[0]), reps:String(r[1]), rpe:String(r[2]), done:true}))}]};
  S.sessions = [sess];
  save();
  /* Drive the real path: grade the session, record its flags, apply the fade. */
  const list = (sess.entries || []).map(en=> progressionFor(sess, en)).filter(Boolean)
                 .concat(fadeFindings(sess));
  recordFlags(sess, list);
  const fade = openFlags().find(f=> f && f.kind === "fade");
  const applied = fade ? applyFlag(fade.id, a.choice) : null;
  const slot = (wid)=>{ const e = (S.program[wid] || [])[0];
    return {weight: e && e.weight, rest: e && e.rest ? e.rest.join("-") : null}; };
  return {hadFlag: !!fade, flagDay: fade && fade.workoutId, applied,
          A: slot(A), B: slot(B), Aid: A, Bid: B,
          log: (S.planLog || []).map(x=> ({kind:x.kind, day:x.day, ex:x.name}))};
}, {exercise, loadA, loadB, rows, choice});

console.log("1 - A COLLAPSE ON THE SECOND DAY DOES NOT MOVE THE FIRST DAY'S LOAD");
{
  const r = await run("Overhead Cable Triceps Extension", 90, 90, [[90,8,8],[90,9,9],[90,5,10]], "load");
  console.log("    flag day " + r.flagDay + " -> A " + JSON.stringify(r.A) + "  B " + JSON.stringify(r.B));
  ck("the session raised a collapse flag", r.hadFlag === true, String(r.hadFlag));
  ck("stamped with the day it happened on", r.flagDay === r.Bid, r.flagDay + " vs " + r.Bid);
  ck("the first day's load is untouched", r.A.weight === 90, String(r.A.weight));
  ck("and the second day's load is the one that came down", r.B.weight < 90, String(r.B.weight));
}

console.log("2 - AND NEITHER DOES THE REST WINDOW");
{
  const r = await run("Smith Machine Squat", 80, 80, [[80,10,8],[80,9,9],[80,5,10]], "rest");
  console.log("    A " + JSON.stringify(r.A) + "  B " + JSON.stringify(r.B));
  ck("the first day's rest window is untouched", r.A.rest === "180-240", String(r.A.rest));
  ck("and the second day's is the one that grew", r.B.rest !== "180-240", String(r.B.rest));
}

console.log("3 - EVERY ROW THE RULES WRITE NAMES A DAY");
{
  const r = await run("Smith Machine Squat", 80, 80, [[80,10,8],[80,9,9],[80,5,10]], "rest");
  console.log("    " + JSON.stringify(r.log));
  ck("something was logged", r.log.length > 0, JSON.stringify(r.log));
  ck("and no row is filed against no day at all",
     r.log.every(x=> !!x.day), JSON.stringify(r.log));
  ck("each one names the day it fired on", r.log.every(x=> x.day === r.Bid), JSON.stringify(r.log));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
