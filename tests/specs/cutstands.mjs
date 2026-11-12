import { chromium, APP_URL } from './_e26.mjs';
/* "IS THE PLAN IS BEHIND FLAG CORRECT? I THOUGHT IT CUT IT BECAUSE I COULDN'T HIT THE
   WEIGHT."

   Overhead cable triceps extension, 3x8-12. Nov 5: 90x8 @8, 90x9 @9, 90x5 @10. The reps
   fell away across the sets, which is a finding of its own, and the load came down to
   85 because of it. The card then printed, under the cut it had just made:

     "That no longer stands: on Thu, Nov 5 you did 90 lb for 8 reps, inside 8-12."

   quoting set one of the very session that produced the cut — and the catch-up line
   went further and called the cut "the part that is wrong". Both were reading the whole
   log, so the evidence the app had already weighed came back as a refutation of the
   decision it had weighed it for.

   A cut is disproved by what happens AFTER it. Until then it stands, and the honest
   sentence says so and still offers the override. */
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
const EX = "Overhead Cable Triceps Extension";

/* The reported shape, parameterised by whether a session happened AFTER the cut.
   `after` is a list of [reps, rpe] logged at the old load on a later day. */
const seed = (after)=> ev(a=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, rpe:true, plateStep:2.5});
  S.splitId=DEFAULT_SPLIT; applySplit();
  const wid=ROTATION[0], d=86400000, now=Date.now();
  const cutAt = now - 6*d;                       // the grade ran six days ago
  /* The plan as it stands after the cut: 85, stamped by the app, down from 90. */
  S.program[wid]=[{name:a.EX, sets:3, reps:"8-12", weight:85, rpes:[8,8,8],
    byApp:{at:cutAt, what:"load cut to 85 lb", from:90, to:85,
           why:"Reps fell away across the sets, so the opening load comes down."}}];
  const sess = (dayOff, rows)=>({
    id:"s"+dayOff, workoutId:wid, date: dayStr(now-dayOff*d),
    startedAt: now-dayOff*d, finishedAt: now-dayOff*d + 3600e3,
    entries:[{name:a.EX, reps:"8-12", rpes:[8,8,8],
      sets: rows.map(r=>({weight:"90", reps:String(r[0]), rpe:String(r[1]), done:true}))}]});
  /* The session the cut was made FROM: two sets inside the range, then the collapse. */
  S.sessions=[sess(6.1, [[8,8],[9,9],[5,10]])];
  if(a.after) S.sessions.push(sess(1, a.after));
  S.active=null; save();
  return true;
}, {EX, after: after || null});

const lineFor = ()=> ev(x=>{
  const pe = findProgramEntry(x);
  return {dis: loadCutDisproved(pe),
          behind: planBehindLineHTML(pe).replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim(),
          chip: planChangeLineHTML({name:x}).replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim()};
}, EX);

console.log("1 - THE SESSION THAT CAUSED THE CUT DOES NOT DISPROVE IT");
{
  await seed(null);
  const r = await lineFor();
  console.log("    behind:", r.behind.slice(0, 190));
  ck("the cut is not called disproved", r.dis === null, JSON.stringify(r.dis));
  ck("and the line does not call the cut wrong",
     !/part that is wrong/.test(r.behind), r.behind.slice(0,110));
  ck("it says the cut stands", /cut stands/.test(r.behind), r.behind.slice(0,110));
  ck("and names the day it was made", /\b(Nov|Oct|Dec|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep)\b/.test(r.behind));
  /* The override is still there: the plan belongs to the person. */
  ck("the override is still offered", /Set my plan to/.test(r.behind), r.behind.slice(-70));
}

console.log("2 - AND THE CHIP KEEPS THE REAL REASON INSTEAD OF REBUTTING IT");
{
  const r = await lineFor();
  console.log("    chip:", r.chip.slice(0, 190));
  ck("the chip does not say the reason no longer stands",
     !/no longer stands/.test(r.chip), r.chip.slice(0,120));
  ck("it prints what the app actually cut it for",
     /fell away across the sets/.test(r.chip), r.chip.slice(0,160));
}

console.log("3 - A SESSION SINCE THE CUT, AT THE OLD LOAD, INSIDE THE RANGE, DOES DISPROVE IT");
{
  await seed([[9,8],[9,8],[8,9]]);
  const r = await lineFor();
  console.log("    behind:", r.behind.slice(0, 190));
  ck("now it is disproved", !!r.dis && r.dis.w === 90, JSON.stringify(r.dis));
  ck("and the line says the cut is the part that is wrong",
     /part that is wrong/.test(r.behind), r.behind.slice(0,150));
  ck("citing the weight it was beaten at", /90/.test(r.behind), r.behind.slice(0,150));
  /* And the chip itself has retired, which is the other half of the same idea: once you
     have trained the movement since the app touched it, the change has stopped being
     news. */
  ck("and the change chip has retired, having been trained since", r.chip === "", r.chip.slice(0,120));
}

console.log("4 - A SESSION SINCE THE CUT THAT REPEATS THE COLLAPSE DOES NOT");
/* Train it again at the old load and fall apart again in the same way and the cut has
   been confirmed, not overturned: no set reached the bottom of the range. */
{
  await seed([[5,10],[4,10]]);
  const r = await lineFor();
  ck("still standing", r.dis === null, JSON.stringify(r.dis));
  ck("and still not called wrong", !/part that is wrong/.test(r.behind), r.behind.slice(0,110));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
