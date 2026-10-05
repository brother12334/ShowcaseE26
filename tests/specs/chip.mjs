/* A raise chip is news until you have trained the movement since. */
import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:900}});
p.on('pageerror',e=>console.log('ERR',e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{localStorage.clear();
 localStorage.setItem('e26.account',JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'F',createdAt:1,cloud:false,ns:''}));
 localStorage.setItem('e26.ns0','E26-X');});
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>typeof S!=='undefined'&&!!S);
console.log(await p.evaluate(()=>{
  S.setup={name:"F",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  const N="Cable Face Pull (two D-handles)";
  const raisedAt = Date.now() - 29*86400e3;          // "Aug 18", inside the 30-day window
  S.program[DAYS[0]] = [{name:N, sets:3, reps:"15-20", weight:"95",
    byApp:{at:raisedAt, what:"load raised to 95 lb", from:20, to:95, why:"Double progression."}}];
  const strip = h=> String(h).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  const out=[], errs=[];
  const en={name:N};

  S.sessions=[]; save();
  const before = strip(planChangeLineHTML(en));
  out.push('NOT TRAINED SINCE THE RAISE  -> ' + (before||'(nothing)'));
  if(!before) errs.push('the chip vanished before you have even seen the number');

  // trained it a week after the raise, heavier than the raise
  S.sessions=[{id:"s1", date:dayStr(Date.now()-9*86400e3), workoutId:DAYS[0],
    startedAt:Date.now()-9*86400e3, finishedAt:Date.now()-9*86400e3+3e6,
    entries:[{name:N, sets:[{weight:"110",reps:"16",rpe:"9",done:true}]}]}];
  save();
  const after = strip(planChangeLineHTML(en));
  out.push('TRAINED SINCE (9 days ago, 110 lb) -> ' + (after||'(nothing)'));
  if(after) errs.push('the chip is still announcing a raise you have trained past');

  // a session that predates the raise must not retire it
  S.sessions=[{id:"s0", date:dayStr(Date.now()-40*86400e3), workoutId:DAYS[0],
    startedAt:Date.now()-40*86400e3, finishedAt:Date.now()-40*86400e3+3e6,
    entries:[{name:N, sets:[{weight:"90",reps:"18",rpe:"8",done:true}]}]}];
  save();
  const older = strip(planChangeLineHTML(en));
  out.push('ONLY OLDER SESSIONS       -> ' + (older||'(nothing)'));
  if(!older) errs.push('a session from before the raise wrongly retired the chip');

  out.push('\nerrors: '+(errs.length?JSON.stringify(errs,null,1):'[] PASS'));
  return out.join('\n');
}));
await b.close();
