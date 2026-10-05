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

/* The reported case: a Pull B whose programme prescribes 17 sets, run during a deload as
   the deload card says — two sets an exercise, six exercises, twelve sets. */
const grade = (onDeload)=> p.evaluate((dl)=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.splitId=DEFAULT_SPLIT; applySplit();
  const wid = ROTATION[1];
  S.program[wid]=[
    {name:"Lat Pulldown", sets:3, reps:"6-10", weight:120},
    {name:"Barbell Row", sets:3, reps:"6-10", weight:135},
    {name:"Chest Supported Row Machine", sets:3, reps:"8-12", weight:90},
    {name:"Dumbbell Reverse Fly", sets:3, reps:"12-15", weight:20},
    {name:"Band Curl", sets:3, reps:"12-15", weight:30},
    {name:"Cable Tricep Extension", sets:2, reps:"12-15", weight:40}
  ];
  S.deload = dl ? {startedAt:Date.now()-3*86400e3, endedAt:null, reason:"manual"} : null;
  const t = Date.now()-3600e3;
  /* Exactly what the deload card asked for, which since M3 is half of each exercise's
     own set count rather than a flat two — so the five threes come down to two and the
     two comes down to one. */
  const sets = (w, n)=> Array.from({length: n},
    ()=> ({weight:String(w), reps:"9", rpe:"7", done:true}));
  const sess = {id:"g1", workoutId:wid, date:new Date(t).toLocaleDateString("en-CA"),
    startedAt:t, finishedAt:Date.now(), feel:4,
    entries:S.program[wid].map(e=> ({name:e.name, reps:e.reps,
      sets:sets(e.weight, deloadSetsFor(e))}))};
  S.sessions=[sess]; save();
  const g = scoreWorkout(sess);
  const sec = (g.sections||g.secs||g||[]).find(x=> x.key==="completion") || {};
  return {planned: S.program[wid].reduce((n,e)=>n+e.sets,0),
          logged: sess.entries.reduce((n,e)=> n + e.sets.length, 0),
          pts: sec.pts, max: sec.max, grade: sec.grade, why: (sec.why||[]).join(" ")};
}, onDeload);

console.log("1 - THE DELOAD SESSION, DONE EXACTLY AS PRESCRIBED");
{
  const r = await grade(true);
  console.log("     " + r.why);
  ck("the full programme is 17 sets", r.planned===17, String(r.planned));
  ck("the deload card asked for 11", r.logged===11, String(r.logged));
  ck("and it is graded against the card, not the programme",
     /11 working sets logged against 11 planned/.test(r.why), r.why);
  ck("so it scores full marks", Math.abs(r.pts-r.max)<0.01, r.pts+"/"+r.max);
  ck("with the grade to match", /A/.test(r.grade||""), r.grade);
  ck("and it says which card it used", /deload card/.test(r.why), r.why);
}

console.log("2 - THE SAME SESSION OFF A DELOAD IS STILL SHORT");
{
  const r = await grade(false);
  console.log("     " + r.why);
  ck("judged against the full programme", /11 working sets logged against 17 planned/.test(r.why), r.why);
  ck("and marked down for it", r.pts < r.max, r.pts+"/"+r.max);
  ck("with no deload line", !/deload card/.test(r.why), r.why);
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
