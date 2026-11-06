import { chromium, APP_URL, appFile } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* "SOMETIMES IT JUST SENDS ME TO THE BOTTOM OF THE SCREEN IN THE WORKOUT TAB WHEN
   FILLING IN THE EXERCISES."

   Ticking a set that beats a previous best opens a celebration, and that used to note
   where you were, send the page to the TOP, and put it back when the overlay left. The
   trip back is a scrollTo against a document that has been re-rendered since. A document
   that is shorter than it was clamps the old offset to its new maximum — which is the
   bottom of the session. The overlay is position:fixed inset:0 and never needed the trip
   at all. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:844}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };
const ev=(fn,a)=>p.evaluate(fn,a);

await ev(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, warmups:'off'});
  S.splitId=DEFAULT_SPLIT; applySplit();
  const wid=ROTATION[0], d=86400000;
  S.program[wid]=["Cable Fly","Cable Row","Lat Pulldown","Dumbbell Curl","Leg Press","Seated Calf Raise Machine"]
    .map(n=>({name:n, sets:3, reps:"8-12", weight:50}));
  /* A previous session to beat, so ticking a good set is a PR. */
  S.sessions=[{id:"old", workoutId:wid, date:dayStr(Date.now()-7*d),
    startedAt:Date.now()-7*d, finishedAt:Date.now()-7*d+3600e3,
    entries:[{name:"Leg Press", reps:"8-12",
      sets:[{weight:"50", reps:"8", rpe:"8", done:true}]}]}];
  save(); S.active=null; startWorkout(wid); PF=null; TAB="workout"; save();
  const el=document.getElementById('preflight'); if(el) el.remove(); try{PF=null}catch(e){}
  render();
});
await p.evaluate(()=>{ document.querySelectorAll('.ai-full').forEach(n=> n.style.display='none'); });
await p.waitForTimeout(300);

console.log("1 - TICKING A SET DOES NOT MOVE THE PAGE");
{
  const r = await ev(async ()=>{
    const ei = S.active.entries.findIndex(e=> /leg press/i.test(e.name));
    const st = S.active.entries[ei].sets[0];
    st.weight = "50"; st.reps = "8"; save(); render();
    const row = document.querySelector('.chk[data-e="'+ei+'"][data-s="0"]');
    row.scrollIntoView({block:"center"});
    await new Promise(r2=> setTimeout(r2, 200));
    const before = Math.round(window.scrollY);
    row.click();
    await new Promise(r2=> setTimeout(r2, 500));
    return {before, after: Math.round(window.scrollY),
            cele: !!document.getElementById('celebrate'),
            maxY: Math.round(document.documentElement.scrollHeight - window.innerHeight)};
  });
  console.log("   ", JSON.stringify(r));
  ck("the page was scrolled into the session", r.before > 100, String(r.before));
  ck("AND IT IS STILL THERE AFTER THE TICK", Math.abs(r.after - r.before) <= 2,
     r.before + " -> " + r.after);
  ck("not at the bottom", r.after < r.maxY - 10 || r.before >= r.maxY - 10,
     r.after + " of " + r.maxY);
}

console.log("2 - AND NOR DOES A CELEBRATION, HOWEVER THE PAGE CHANGES UNDER IT");
/* The overlay is fixed and covers the screen from wherever the page sits, so there is
   nothing to put back — which is the whole point: a restore cannot be wrong if there
   isn't one. */
{
  const r = await ev(async ()=>{
    window.scrollTo(0, 400);
    await new Promise(r2=> setTimeout(r2, 150));
    const before = Math.round(window.scrollY);
    celebrate("pr", S.active.workoutId, 1000, null, null);
    await new Promise(r2=> setTimeout(r2, 250));
    const open = !!document.getElementById('celebrate');
    const during = Math.round(window.scrollY);
    const el = document.getElementById('celebrate');
    const r2box = el ? el.getBoundingClientRect() : null;
    const covers = !!r2box && Math.round(r2box.top) === 0
                 && Math.round(r2box.height) === window.innerHeight;
    if(el) el.click();
    await new Promise(r3=> setTimeout(r3, 700));
    return {before, during, open, covers, after: Math.round(window.scrollY),
            gone: !document.getElementById('celebrate')};
  });
  console.log("   ", JSON.stringify(r));
  ck("the overlay opens", r.open, String(r.open));
  ck("and covers the screen from where the page is", r.covers, String(r.covers));
  ck("THE PAGE DOES NOT GO TO THE TOP", r.during === r.before, r.before + " -> " + r.during);
  ck("and is where it was when the overlay leaves", Math.abs(r.after - r.before) <= 2,
     r.before + " -> " + r.after);
}

console.log("3 - THE ROUND TRIP IS GONE FROM THE SOURCE");
/* Pinned in the source as well as in behaviour: a scrollTo on either side of this is the
   bug, and it is easier to reintroduce than to notice. */
{
  const src = readFileSync(appFile("index.html"), "utf8");
  const cele = src.slice(src.indexOf("function quickFire"), src.indexOf("function celebrate") + 9000);
  ck("no scroll-to-top around the celebration",
     !/window\.scrollTo\(0,\s*0\)/.test(cele), "found one");
  ck("and no restore either",
     !/window\.scrollTo\(0,\s*scrollY\)/.test(src), "found one");
  ck("the lock is not a root overflow any more",
     !/body\.cele-open\{overflow:hidden\}/.test(src), "still there");
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
