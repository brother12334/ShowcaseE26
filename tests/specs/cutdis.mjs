import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1100}, deviceScaleFactor:2});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} document.body.classList.remove('ai-open','onboarding'); hideModal();
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off';
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false});
  S.sleepAsked=todayStr(); save();
});

// The screenshot: plan cut 45 -> 40 by a grade 13 days ago, on a reason quoting a
// FIFTY pound set; the last session was 45 lb for 12 reps, inside 10-15.
const build = (lastReps)=> p.evaluate((lr)=>{
  S.splitId=DEFAULT_SPLIT; applySplit();
  const wid=ROTATION[0], ex="Dumbbell Shrug";
  const cutAt = Date.now() - 13*86400e3;
  S.program[wid]=[{name:ex, sets:2, reps:"10-15", weight:40,
    byApp:{at:cutAt, what:"load cut to 40 lb", from:45, to:40,
      why:"45 lb for 10-15 reps is not reachable: on Mon, Aug 3 set 1 was 50 lb for 5 reps at RPE 10."}}];
  const d = new Date(Date.now()-20*86400e3).toLocaleDateString("en-CA");
  S.sessions=[{id:"s1", workoutId:wid, date:d,
    startedAt:Date.now()-20*86400e3-3600e3, finishedAt:Date.now()-20*86400e3, feel:4,
    entries:[{name:ex, reps:"10-15", sets:[
      {weight:"45", reps:String(lr), rpe:"8", done:true},
      {weight:"45", reps:String(lr), rpe:"9", done:true}]}]}];
  save();
  if(S.active) S.active=null;
  startWorkout(wid); PF=null; save();
  const en=S.active.entries[0];
  return {chg: planChangeLineHTML(en), behind: planBehindLineHTML(en),
          dis: loadCutDisproved(findProgramEntry(ex))};
}, lastReps);

let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

console.log("1 - THE DISPROVED CUT STOPS QUOTING ITS REASON");
let r = await build(12);
ck("the log is found to contradict the cut", r.dis && r.dis.w===45 && r.dis.reps===12, JSON.stringify(r.dis));
ck("the 50 lb sentence is gone", !/not reachable/.test(r.chg), r.chg);
ck("and is replaced by the disproof", /no longer stands/.test(r.chg) && /12 reps/.test(r.chg), r.chg);
ck("the chip itself survives", /chg-chip/.test(r.chg) && /cut to 40 lb/.test(r.chg), r.chg);

console.log("2 - THE TWO LINES NO LONGER ARGUE");
ck("plan-behind names the cut", /Element 26 cut it to 40 lb/.test(r.behind), r.behind);
ck("and drops 'out of date'", !/out of date/.test(r.behind), r.behind);
ck("the button still offers the real load", /Set my plan to 45 lb/.test(r.behind), r.behind);

console.log("3 - A CUT THE LOG SUPPORTS IS LEFT ALONE");
r = await build(6);            // never reached the range at 45, so the cut stands
ck("no disproof found", !r.dis, JSON.stringify(r.dis));
ck("the original reason is still printed", /not reachable/.test(r.chg), r.chg);
ck("and plan-behind stays quiet", r.behind==="", r.behind);

console.log(errs.length? "  BROKEN page errors :: "+errs.join(" | ") : "  ok  no page errors");
if(errs.length) bad++;
console.log(bad? ("  "+bad+" broken") : "  all good");
await b.close();
