import { chromium, APP_URL } from './_e26.mjs';
/* "STILL ABLE TO GO BACK ON PREVIOUS SETS AND RECLICK THE ARROW AND RESTARTING THE REST
   TIMER."

   Untick the set you just logged — to fix the reps, to change the load, because the thumb
   landed wrong — tick it again, and the clock went back to 0:00 while you were already a
   minute into that rest. The rest belongs to the SET, so re-ticking the same set inside
   the same rest resumes its clock instead of starting a new one. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1400}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr();
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, warmups:'off'});
  S.splitId=DEFAULT_SPLIT; applySplit();
  const wid=ROTATION[0];
  S.program[wid]=[{name:"Cable Fly", sets:3, reps:"8-12", weight:30},
                  {name:"Cable Row", sets:3, reps:"8-12", weight:60}];
  save(); if(S.active) S.active=null; startWorkout(wid); PF=null; TAB="workout"; save();
  const el=document.getElementById('preflight'); if(el) el.remove(); try{PF=null}catch(e){}
  render();
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };
const tap = (ei,si)=> p.evaluate(a=>{
  const st=S.active.entries[a.ei].sets[a.si];
  if(!st.done && !st.reps){ st.reps="10"; st.weight="30"; save(); render(); }
  const el=document.querySelector(`.chk[data-e="${a.ei}"][data-s="${a.si}"]`);
  if(!el) return {none:true};
  el.click();
  const rt=S.active.restTimer;
  return {done: S.active.entries[a.ei].sets[a.si].done,
          rt: rt ? {e:rt.e, s:rt.s, start:rt.start} : null};
}, {ei,si});

console.log("1 - THE TICK STARTS THE CLOCK");
const first = await tap(0,0);
ck("the set is logged", first.done, String(first.done));
ck("and a rest is running for it", !!first.rt && first.rt.s===0, JSON.stringify(first.rt));

await p.evaluate(()=> new Promise(r=> setTimeout(r, 1200)));

console.log("\n2 - UNTICKING IT STOPS THE CLOCK, AS IT ALWAYS DID");
const off = await tap(0,0);
ck("the set is no longer logged", off.done===false, String(off.done));
ck("and no rest is running", off.rt===null, JSON.stringify(off.rt));

console.log("\n3 - AND TICKING IT AGAIN RESUMES THAT REST RATHER THAN RESTARTING IT");
const again = await tap(0,0);
ck("the set is logged again", again.done, String(again.done));
ck("the clock is running", !!again.rt, JSON.stringify(again.rt));
ck("from where it was, not from zero",
   !!again.rt && first.rt && again.rt.start === first.rt.start,
   again.rt ? (again.rt.start - first.rt.start) + "ms later" : "none");
const age = await p.evaluate(()=> Date.now() - S.active.restTimer.start);
ck("so the rest already taken still counts", age >= 1200, age + "ms");

console.log("\n4 - A DIFFERENT SET'S REST IS ITS OWN");
/* Past the three-second floor under which a rest is not worth writing down. */
await p.evaluate(()=> new Promise(r=> setTimeout(r, 2600)));
{
  const r = await p.evaluate(()=>{
    /* Stop the clock the way the ■ does, then log the next set: a fresh rest. */
    recordRestIfRunning();
    const st=S.active.entries[0].sets[1]; st.reps="10"; st.weight="30"; save(); render();
    const el=document.querySelector('.chk[data-e="0"][data-s="1"]'); el.click();
    const rt=S.active.restTimer;
    return {s: rt && rt.s, age: rt ? Date.now()-rt.start : null,
            kept: S.active.entries[0].sets[0].rest || 0};
  });
  console.log("   ", JSON.stringify(r));
  ck("the clock belongs to the new set", r.s===1, String(r.s));
  ck("and it starts at zero", r.age != null && r.age < 1000, r.age+"ms");
  ck("while the first set keeps the whole rest it earned, resume included",
     r.kept >= 3, r.kept+"s");
}

console.log("\n5 - A REST RESUMED FROM ANOTHER DAY IS NOT RESUMED AT ALL");
{
  const r = await p.evaluate(()=>{
    recordRestIfRunning();
    const st=S.active.entries[0].sets[2];
    st.reps="10"; st.weight="30"; st.restFrom = Date.now() - 5*60*60*1000; save(); render();
    document.querySelector('.chk[data-e="0"][data-s="2"]').click();
    const rt=S.active.restTimer;
    return {age: rt ? Date.now()-rt.start : null, left: st.restFrom || null};
  });
  console.log("   ", JSON.stringify(r));
  ck("a stale mark does not revive a five-hour-old clock", r.age != null && r.age < 1000, r.age+"ms");
  ck("and the mark is cleared", r.left===null||r.left===undefined, String(r.left));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
