import { chromium, APP_URL, appFile } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* NO ENTRY IS EVER STAMPED WITH A CARRIAGE THAT WAS NOT IN THE ROOM.

   Item 26 Part 2 found nothing to repair: this log is written as bar + plates, so the
   carriage never enters a stored figure and no entry carries a barAdd stamp at all. The
   migration that was planned would have scanned and found nothing, so it was not built.
   This is what stands in its place.

   THE STATE IT WATCHES FOR is the one Part 1 could have created and Part 2 closed: an
   entry stamped with the GLOBAL carriage when the gym that session was performed at has
   its own, different one. Switching to "plates only" writes that stamp, and until Part 2
   it wrote the global figure for every session regardless of where it happened.

   WHY NOT "the stamp disagrees with the gym". A stamp is meant to be authoritative: it
   records what the lift was actually done under, so a stamp that differs from what the
   gym says TODAY is usually right and the gym's figure is what changed -- you remeasured
   the carriage, or corrected a typo. Flagging that would be flagging the feature working.
   The bug has a narrower signature: the stamp equals the global figure AND the gym has
   its own that differs. Section 3 is the control that keeps the two apart. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

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
  /* THE DETECTOR. One pass over the log, naming every entry whose stamp carries the
     global carriage while the room it was performed in has its own, different one. */
  window.suspect = ()=>{
    const global = trainPrefs().smithWeight;
    const out = [];
    (S.sessions || []).forEach(sess=>{
      const g = sess.gymId ? gymById(sess.gymId) : null;
      if(!g || g.smith == null) return;              // nothing of its own to disagree with
      if(g.smith === global) return;                 // agrees anyway, nothing to tell apart
      (sess.entries || []).forEach(en=>{
        if(!en || en.barAdd == null) return;
        if(Number(en.barAdd) === Number(global))
          out.push(sess.date + " " + en.name + " @" + g.name
                 + " stamped " + en.barAdd + ", carriage " + g.smith);
      });
    });
    return out;
  };
  /* Apply a mode switch the way the screen does. */
  window.switchTo = (to)=>{
    const pl = barModeConvertPlan(to);
    pl.sets.forEach(r=> r.st.weight = String(r.to));
    pl.entries.forEach(r=>{ if(r.stamp > 0) r.en.barAdd = r.stamp; else delete r.en.barAdd; });
    trainPrefs().barMode = to;
    return pl.entries.length;
  };
  /* The one Smith entry performed away from the home gym. */
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
}, FX);

console.log("\n1. THE DETECTOR CATCHES THE STATE IT IS FOR");
/* A guard that has never seen the thing it looks for is a guard nobody should trust. The
   exact bug is planted: the stamp Part 1's pinned conversion would have written. */
let r = await p.evaluate(()=>{
  boot(S2=>{
    const g = (S2.gyms || []).find(x=> (x.name || "").indexOf("Lotus") === 0);
    const sess = (S2.sessions || []).find(x=> x.gymId === g.id
      && (x.entries || []).some(e=> /smith/i.test(e.name || "")));
    const en = (sess.entries || []).find(e=> /smith/i.test(e.name || ""));
    en.barAdd = S2.prefs.smithWeight;      // the global figure, at a gym with its own
  });
  const g = window.gymNamed("Lotus");
  return {hits: window.suspect(), gymSmith: g.smith, global: trainPrefs().smithWeight};
});
ck("CONTROL: the two carriages really do differ, or there is nothing to tell apart",
   r.gymSmith !== r.global, r.gymSmith + " vs " + r.global);
ck("a globally-stamped entry at a gym with its own carriage is caught",
   r.hits.length === 1, r.hits.join(" | "));

console.log("\n2. AND THE LOG AS IT STANDS IS CLEAN");
r = await p.evaluate(()=>{
  boot();
  const stamps = (S.sessions || []).reduce((n, s)=>
    n + (s.entries || []).filter(e=> e && e.barAdd != null).length, 0);
  return {hits: window.suspect(), stamps, mode: trainPrefs().barMode};
});
ck("nothing is flagged", r.hits.length === 0, r.hits.join(" | "));
ck("CONTROL: and the reason is that nothing is stamped at all",
   r.stamps === 0 && r.mode === "total", r.stamps + " stamps, mode " + r.mode);

console.log("\n3. A STAMP THAT IS SIMPLY OLDER THAN THE GYM'S FIGURE IS NOT A BUG");
/* The control against a guard that cries wolf. Log a session under one carriage, then
   remeasure the machine: the stamp and the gym now disagree, and the stamp is the one
   that is right. Nothing should be flagged. */
r = await p.evaluate(()=>{
  boot(S2=>{
    const g = (S2.gyms || []).find(x=> (x.name || "").indexOf("Lotus") === 0);
    const sess = (S2.sessions || []).find(x=> x.gymId === g.id
      && (x.entries || []).some(e=> /smith/i.test(e.name || "")));
    const en = (sess.entries || []).find(e=> /smith/i.test(e.name || ""));
    en.barAdd = 35;        // what it was performed under
    g.smith = 32.5;        // remeasured since, and the gym is what changed
  });
  const f = window.awaySmith();
  const g = window.gymNamed("Lotus");
  return {hits: window.suspect(), stamp: f.en.barAdd, gym: g.smith,
          global: trainPrefs().smithWeight};
});
ck("CONTROL: the stamp and the gym genuinely disagree", r.stamp !== r.gym,
   "stamped " + r.stamp + ", gym now " + r.gym);
ck("CONTROL: and neither of them is the global figure",
   r.stamp !== r.global && r.gym !== r.global, "global " + r.global);
ck("it is not flagged, because the stamp is the authority", r.hits.length === 0,
   r.hits.join(" | "));

console.log("\n4. AND A REAL MODE SWITCH CANNOT CREATE THE STATE");
/* The end of it: drive the conversion the screen drives, on the build as it ships, and
   require that it writes nothing the detector objects to. */
r = await p.evaluate(()=>{
  boot();
  const touched = window.switchTo("plates");
  const f = window.awaySmith();
  const g = gymById(f.sess.gymId);
  const hits = window.suspect();
  const stamps = (S.sessions || []).reduce((n, s)=>
    n + (s.entries || []).filter(e=> e && e.barAdd != null).length, 0);
  return {touched, hits, stamps, awayStamp: f.en.barAdd, awayGym: g.smith,
          global: trainPrefs().smithWeight,
          weights: (f.en.sets || []).map(x=> x.weight)};
});
ck("CONTROL: the switch really did stamp a great many entries", r.stamps > 20,
   r.stamps + " entries stamped, " + r.touched + " touched");
ck("CONTROL: including the one performed away from home",
   r.awayStamp != null, String(r.awayStamp));
ck("which carries that gym's carriage, not the usual one",
   r.awayStamp === r.awayGym && r.awayStamp !== r.global,
   "stamped " + r.awayStamp + ", gym " + r.awayGym + ", global " + r.global);
ck("so its plates are what was actually on it", r.weights.every(w=> w === "40"),
   r.weights.join("/"));
ck("and the detector objects to none of it", r.hits.length === 0, r.hits.join(" | "));

ck("no page errors", errs.length === 0, errs.join(" | "));
await b.close();
console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
