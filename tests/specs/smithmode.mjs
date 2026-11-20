import { chromium, APP_URL, appFile, oldBuild } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* ITEM 26 PART 2, WHICH TURNED OUT TO BE A DIFFERENT JOB FROM THE ONE PLANNED.

   Part 2 was going to walk the past Smith sets logged at a gym whose carriage differs
   from the one in force at the time, and offer to correct each. Measuring the log first
   showed there are none to correct, and why:

     barMode is "bar + plates". Under it the number you type IS the whole load,
     barAddendFor() returns zero, and the app adds nothing to what you wrote. No entry in
     the log carries a barAdd stamp, because the stamp is only written when the addend is
     non-zero. So no stored figure was ever touched by the carriage setting, and there is
     nothing in the log for a migration to repair.

   What the wrong carriage did affect -- warm-up rungs, the plate line, the impossible-load
   check, every future prescription -- is computed live and was fixed in Part 1.

   ONE PATH COULD STILL CAUSE THE DAMAGE, and Part 1 is what left it open. Switching to
   "plates only" subtracts a carriage from every Smith set and stamps what it took off.
   Part 1 pinned that conversion to the global profile on the grounds that rewriting
   logged sets was Part 2's business -- so one press would have taken 25 off a set
   performed where the carriage is 35, writing 50 where the plates were 40 and stamping
   25 behind it. It would have MANUFACTURED the exact data the migration was meant to
   repair.

   So Part 2 is this: the conversion reads the gym each session was performed at. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
/* The build with the conversion still pinned to the global profile. */
const OLD = oldBuild("6ec7a93");
const b = await chromium.launch();
let bad = 0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

async function openApp(url){
  const p = await b.newPage({viewport:{width:390,height:1000}});
  p.on('dialog',d=>d.accept());
  await p.addInitScript(()=>{ localStorage.clear();
    localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
    localStorage.setItem('e26.ns0','E26-X'); });
  await p.goto(url,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
  await p.evaluate(fx=>{
    window.boot = (mutate)=>{
      const sp=document.getElementById('splash'); if(sp) sp.remove();
      try{OB=null}catch(e){} try{PF=null}catch(e){} try{hideModal()}catch(e){}
      Object.keys(S).forEach(k=>{ delete S[k]; });
      Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
      S.tourDone = true;
      if(mutate) mutate(S);
      migrate(); try{ applySplit(); }catch(e){}
    };
    window.gymNamed = n=> (S.gyms || []).find(g=> (g.name || "").indexOf(n) === 0);
    /* The one Smith entry in this log performed away from the home gym. */
    window.awaySmith = ()=>{
      const home = (homeGym() || {}).id;
      let found = null;
      (S.sessions || []).forEach(sess=> (sess.entries || []).forEach(en=>{
        if(found || !en || !/smith/i.test(en.name || "")) return;
        if(!sess.gymId || sess.gymId === home) return;
        found = {sess, en};
      }));
      return found;
    };
    window.look = ()=>{
      const f = window.awaySmith();
      if(!f) return {none: true};
      const g = gymById(f.sess.gymId) || {};
      return {gym: g.name, gymSmith: g.smith, globalSmith: trainPrefs().smithWeight,
              barMode: trainPrefs().barMode,
              weights: (f.en.sets || []).map(s=> s.weight),
              stamp: f.en.barAdd == null ? null : f.en.barAdd};
    };
  }, FX);
  await p.evaluate(()=> window.boot());
  return p;
}
const oldP = await openApp(OLD);
const newP = await openApp(APP_URL);

console.log("\n1. THERE IS NOTHING IN THIS LOG TO REPAIR, AND HERE IS WHY");
let r = await newP.evaluate(()=>{
  const stamped = [];
  (S.sessions || []).forEach(sess=> (sess.entries || []).forEach(en=>{
    if(en && en.barAdd != null && en.barAdd !== 0)
      stamped.push(sess.date + " " + en.name + " " + en.barAdd);
  }));
  return {mode: trainPrefs().barMode,
          addend: barAddendFor("Smith Machine Shoulder Press"),
          stamped: stamped.length,
          look: window.look()};
});
ck("CONTROL: the log is written as bar + plates", r.mode === "total", r.mode);
ck("so the app adds nothing to what you type", r.addend === 0, String(r.addend));
ck("and no entry carries a carriage stamp", r.stamped === 0, r.stamped + " stamped");
ck("CONTROL: there IS a Smith set logged away from home, or this proves nothing",
   !r.look.none && r.look.gym, r.look.gym + ", " + (r.look.weights || []).join("/"));
ck("CONTROL: at a gym whose carriage differs from the usual one",
   r.look.gymSmith !== r.look.globalSmith,
   r.look.gymSmith + " there vs " + r.look.globalSmith + " usually");
ck("and the figure stored for it is untouched by either",
   (r.look.weights || []).every(w=> w === r.look.weights[0]) && r.look.stamp === null,
   (r.look.weights || []).join("/") + ", stamp " + r.look.stamp);

console.log("\n2. SWITCHING TO PLATES ONLY TAKES OFF THAT GYM'S CARRIAGE");
const planFor = page=> page.evaluate(()=>{
  boot();
  const f = window.awaySmith();
  const plan = barModeConvertPlan("plates");
  const row = plan.entries.find(x=> x.en === f.en);
  const sets = plan.sets.filter(x=> (f.en.sets || []).indexOf(x.st) > -1).map(x=> x.to);
  /* And a Smith set at the home gym, which must be unaffected by the change. */
  const home = (homeGym() || {}).id;
  let hf = null;
  (S.sessions || []).forEach(sess=> (sess.entries || []).forEach(en=>{
    if(hf || !en || !/smith/i.test(en.name || "") || sess.gymId !== home) return;
    hf = en;
  }));
  const hrow = hf ? plan.entries.find(x=> x.en === hf) : null;
  const hsets = hf ? plan.sets.filter(x=> (hf.sets || []).indexOf(x.st) > -1).map(x=> x.to) : [];
  return {stamp: row ? row.stamp : null, sets,
          was: (f.en.sets || []).map(s=> parseFloat(s.weight)),
          homeStamp: hrow ? hrow.stamp : null, homeSets: hsets,
          homeWas: hf ? (hf.sets || []).map(s=> parseFloat(s.weight)) : []};
});
const was = await planFor(oldP), now = await planFor(newP);
ck("CONTROL: the old build was asked the same question", was.sets.length > 0,
   was.was.join("/") + " -> " + was.sets.join("/"));
ck("the old build took the usual carriage off, not that gym's", was.stamp === 25,
   String(was.stamp));
ck("the new build takes that gym's", now.stamp === 35, String(now.stamp));
ck("so the plates left are right", now.sets.every(x=> x === 40),
   now.was.join("/") + " − " + now.stamp + " = " + now.sets.join("/"));
ck("CONTROL: and the old build would have written the wrong ones",
   was.sets.every(x=> x === 50), was.sets.join("/"));
ck("a Smith set at the home gym is unchanged by the fix",
   was.homeStamp === now.homeStamp && String(was.homeSets) === String(now.homeSets),
   "stamp " + was.homeStamp + " -> " + now.homeStamp);

console.log("\n3. AND IT IS STILL ITS OWN UNDO");
/* adjustedLandmarks aside, the one claim barModeConvertPlan makes about itself is that
   switching back returns every figure. A conversion that reads the gym on the way out
   and the stamp on the way back has to keep that true. */
r = await newP.evaluate(()=>{
  boot();
  const snap = ()=> JSON.stringify((S.sessions || []).map(s=>
    (s.entries || []).map(e=> [e.name, e.barAdd == null ? null : e.barAdd,
      (e.sets || []).map(x=> x.weight)])));
  const before = snap();
  const apply = (to)=>{
    const pl = barModeConvertPlan(to);
    pl.sets.forEach(r2=> r2.st.weight = String(r2.to));
    pl.entries.forEach(r2=>{ if(r2.stamp > 0) r2.en.barAdd = r2.stamp; else delete r2.en.barAdd; });
    trainPrefs().barMode = to;
  };
  apply("plates");
  const mid = snap();
  const midStamp = (()=>{ const f = window.awaySmith(); return f ? f.en.barAdd : null; })();
  apply("total");
  return {same: snap() === before, moved: mid !== before, midStamp,
          mode: trainPrefs().barMode};
});
ck("CONTROL: switching really did change the log", r.moved === true, String(r.moved));
ck("CONTROL: and the away set was stamped with its own gym's carriage",
   r.midStamp === 35, String(r.midStamp));
ck("switching back returns every figure exactly", r.same === true, String(r.same));
ck("and the mode is back where it started", r.mode === "total", r.mode);

console.log("\n4. THE SET THAT WAS NEVER WRONG IS STILL NEVER TOUCHED");
/* Nothing in Part 2 may change a stored number on its own. The only thing that writes
   here is a mode switch the person asks for. */
r = await newP.evaluate(()=>{
  /* FIGURES, NOT NAMES. A first pass compared whole entries and failed, because a render
     canonicalises logged exercise names through the alias table -- "OVERHEAD CABLE
     TRICEP EXTENSION (V-bar)" becomes "Overhead Cable Triceps Extension". That is the
     rename machinery doing its job, it predates all of this (the build before Part 2
     does it to the same six entries), and it is not what Part 2 is about. Reported below
     rather than quietly excluded. */
  const figures = ()=> JSON.stringify((S.sessions || []).map(s=>
    (s.entries || []).map(e=> [e.barAdd == null ? null : e.barAdd,
      (e.sets || []).map(x=> x.weight)])));
  const names = ()=> JSON.stringify((S.sessions || []).map(s=>
    (s.entries || []).map(e=> e.name)));
  boot();
  const beforeF = figures(), beforeN = names();
  /* Everything a normal day does: migrate, render every tab, read the body analysis. */
  migrate();
  ["today","workout","history","body","program"].forEach(t=>{
    try{ TAB = t; render(); }catch(e){}
  });
  try{ bodyAnalysis(); }catch(e){}
  try{ TAB = "sync"; SET_PAGE = "data"; render(); }catch(e){}
  return {same: figures() === beforeF, namesSame: names() === beforeN};
});
ck("a migrate and a full render change no logged weight or stamp", r.same === true,
   String(r.same));
/* Recorded, not asserted either way: this is the alias table's own behaviour and the
   build before Part 2 does exactly the same thing. If it ever stops, that is a change
   worth noticing here. */
console.log("  note   a render does rewrite logged exercise NAMES through the alias table: "
  + (r.namesSame ? "not on this fixture" : "yes, as it did before Part 2"));

await b.close();
console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
