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

const setup = (daysAgo)=> p.evaluate((d)=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.splitId=DEFAULT_SPLIT; applySplit();
  S.flags=[]; S.afterDeload=[]; S.blockStart=null;
  const wid = ROTATION[0];
  S.program[wid]=[{name:"Cable Ab Crunch", sets:3, reps:"10-15", weight:152.5}];
  S.sessions=[{id:"s1", workoutId:wid, date:new Date(Date.now()-d*86400e3).toLocaleDateString("en-CA"),
    startedAt:Date.now()-d*86400e3, finishedAt:Date.now()-d*86400e3+3600e3, feel:4,
    entries:[{name:"Cable Ab Crunch", sets:[{weight:"152.5",reps:"15",rpe:"6.5",done:true}]}]}];
  /* An earned raise, logged before the deload began. */
  S.flags=[{id:"f1", kind:"up", title:"Ready for more weight", ex:"Cable Ab Crunch",
            msg:"Add weight next time: 152.5 lb → 157.5 lb", to:157.5, sev:1,
            at:Date.now()-(d+1)*86400e3, date:new Date(Date.now()-(d+1)*86400e3).toLocaleDateString("en-CA"),
            applied:false, dismissed:false}];
  /* L2: the window is counted in calendar days from the start of the day it began, so
     the test has to place the start on a day rather than at a number of hours back —
     "6.4 days ago" lands on either side of the boundary depending on the time of day the
     spec happens to run. */
  const st = new Date(); st.setHours(12, 0, 0, 0); st.setDate(st.getDate() - Math.floor(d));
  S.deload={startedAt:st.getTime(), endedAt:null, reason:"manual"};
  save(); TAB="body"; BODY_OPEN.nbflags=true; render();
  const note = deloadNote() || {};
  return {active: deloadActive(), held: !!flagDeloadHeld(S.flags[0]),
          label: note.label, line: note.line,
          ended: S.deload.endedAt ? true : false, ranOut: !!S.deload.ranOut,
          blockStart: !!S.blockStart,
          setIt: !!document.querySelector("[data-flagdo]"),
          onHold: /on hold/i.test(document.body.innerText)};
}, daysAgo);

console.log("1 - DAY THREE: THE RAISE IS HELD");
{
  const r = await setup(3);
  console.log("     " + r.label + " — " + (r.line||""));
  ck("the deload is running", r.active, String(r.active));
  ck("the flag is held", r.held, String(r.held));
  ck("the card says so", r.onHold, String(r.onHold));
  ck("and there is no live 'set it'", !r.setIt, String(r.setIt));
}

console.log("2 - THE LABEL NEVER CLAIMS A DAY THE WEEK DOES NOT HAVE");
{
  /* L2: the window is DELOAD_DAYS exactly, taken from the start of the day the deload
     began — so the seventh day is the last one in it and the eighth is not in it at
     all. Six and a bit days in is that seventh day. */
  const r = await setup(6);
  console.log("     " + r.label);
  ck("day seven is the last one it names", /day 7 of 7/.test(r.label||""), r.label);
  ck("and it is still running on it", r.active, String(r.active));
  const over = await setup(7.4);
  console.log("     " + over.label);
  ck("a week does not have an eighth day", !/day 8/.test(over.label||""), over.label);
  ck("so past the seventh it has finished", !over.active, String(over.active));
}

console.log("3 - ONCE IT LAPSES IT IS CLOSED, NOT LEFT OPEN");
{
  const r = await setup(9);
  console.log("     " + r.label + " — " + (r.line||""));
  ck("it is no longer active", !r.active, String(r.active));
  ck("the record is closed", r.ended, String(r.ended));
  ck("marked as having run its course", r.ranOut, String(r.ranOut));
  ck("the next block is dated from it", r.blockStart, String(r.blockStart));
  ck("the card says the week finished", /finished/i.test(r.label||""), r.label);
  ck("and the raise is live again", r.setIt && !r.held, r.setIt+"/"+r.held);
}

console.log("4 - AND IT NAMES WHAT WAS WAITING FOR IT");
{
  const r = await p.evaluate(()=>{
    S.deload={startedAt:Date.now()-9*86400e3, endedAt:null, reason:"manual"};
    S.afterDeload=[]; save();
    queueAfterDeload("chest", {mode:"one", pick:0, setsOne:6}, "take one movement to 6 sets");
    S.deload.endedAt = null; sweepDeload();
    const note = deloadNote() || {};
    return {line: note.line, label: note.label};
  });
  ck("the parked change is mentioned", /1 change you parked/.test(r.line||""), r.line);
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
