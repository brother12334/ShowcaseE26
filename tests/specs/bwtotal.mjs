import { chromium, APP_URL } from './_e26.mjs';
/* TWO FAULTS THE bw+20 NOTATION INVITED, BOTH READ OFF A PHOTOGRAPH OF THE WORKOUT TAB.

   1. The warm-up chip. Its rungs are a strip of "weight ×reps" chips, and the per-hand
      note it gained was the long explanatory form — "15 lb a hand is the nearest pair you
      have (30 lb)" — which is a sentence, inside a chip, in a horizontal strip. That is
      the overflow in the screenshot. The sentence is right where there is room for a
      sentence; the chip gets the short form.

   2. "bw−109.8". The weight box on a bodyweight-inclusive movement wants you AND the
      load; typing 30 into it, meaning the dumbbells, stores 30 as the whole load — which
      is less than you weigh, so the app faithfully reads it back as you minus 109.8. The
      number is not wrong, the box was misunderstood, and the app can see that: nobody
      does a split squat at a third of their bodyweight. So it says what happened and
      offers the one tap that fixes it. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1200}});
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
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, dbStep:5, plateStep:2.5});
  S.bodyLog = {[todayStr()]: {w:139.8}};
  S.splitId=DEFAULT_SPLIT; applySplit(); save();
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

console.log("1 - THE PER-HAND NOTE HAS A SHORT FORM, AND IT IS SHORT");
{
  const r = await p.evaluate(()=>({
    long:  handLoadSay("Dumbbell Bulgarian Split Squat", 32, false),
    short: handLoadSay("Dumbbell Bulgarian Split Squat", 32, true),
    exact: handLoadSay("Dumbbell Bulgarian Split Squat", 30, false)
  }));
  console.log("   ", JSON.stringify(r));
  ck("the short form is a label", r.short === "15 lb a hand", r.short);
  ck("with no parenthetical and no explanation",
     !/nearest|\(/.test(r.short || ""), r.short);
  ck("while the long form still explains itself where there is room",
     /nearest pair/.test(r.long || ""), r.long);
  ck("and an exact pair needs no explaining either way",
     r.exact === "15 lb a hand", r.exact);
}

console.log("\n2 - SO THE WARM-UP CHIP CARRIES A LABEL, NOT A SENTENCE");
{
  const r = await p.evaluate(()=>{
    const wid = ROTATION[0];
    S.program[wid] = [{name:"Dumbbell Bulgarian Split Squat", sets:3, reps:"8-12", weight:179.8}];
    S.prefs.warmups = "auto";
    save(); S.active = null; startWorkout(wid); PF=null; TAB="workout";
    const el=document.getElementById('preflight'); if(el) el.remove(); try{PF=null}catch(e){}
    S.active.entries[0].bwOn = 139.8; save(); render();
    const chips = [...document.querySelectorAll('.warm-rung, .wu-rung, .warm-set')]
      .map(n=> n.innerText.replace(/\s+/g," ").trim()).filter(Boolean);
    const strip = document.querySelector('.warm-rung, .wu-rung, .warm-set');
    const over = strip ? strip.scrollWidth > strip.clientWidth + 2 : null;
    return {chips, over, longest: chips.reduce((a,c)=> Math.max(a, c.length), 0)};
  });
  console.log("   ", JSON.stringify(r));
  ck("there are warm-up rungs to look at", r.chips.length > 0, r.chips.length + " rungs");
  ck("none of them carries the explanatory sentence",
     !r.chips.some(c=> /nearest pair/.test(c)), JSON.stringify(r.chips));
  ck("and none of them is sentence-length",
     r.longest > 0 && r.longest < 40, r.longest + " chars");
}

console.log("\n3 - A LOAD UNDER YOUR OWN WEIGHT IS A MISREAD BOX, AND IT SAYS SO");
{
  const r = await p.evaluate(()=>{
    const st = S.active.entries[0].sets[0];
    st.weight = "30"; st.reps = "10"; save(); render();
    const line = document.querySelector('.plate-line');
    return {line: line ? line.innerText.replace(/\s+/g," ").trim() : null,
            fix: !!document.querySelector('[data-bwfix]')};
  });
  console.log("   ", JSON.stringify(r));
  ck("it points out the number reads as less than you weigh",
     !!r.line && /less than you weigh/.test(r.line), r.line);
  ck("names what the box actually wants", !!r.line && /169\.8/.test(r.line), r.line);
  ck("and offers the one tap that fixes it", r.fix, String(r.fix));
}

console.log("\n4 - AND THE TAP WRITES THE TOTAL, NOT THE DUMBBELLS");
{
  const r = await p.evaluate(()=>{
    document.querySelector('[data-bwfix]').click();
    const st = S.active.entries[0].sets[0];
    const line = document.querySelector('.plate-line');
    return {after: st.weight, said: line ? line.innerText.replace(/\s+/g," ").trim() : null,
            offer: !!document.querySelector('[data-bwfix]')};
  });
  console.log("   ", JSON.stringify(r));
  ck("the set now holds you plus the load", r.after === "169.8", String(r.after));
  ck("spoken back as the 30 you meant", !!r.said && /bw\+30/.test(r.said), r.said);
  ck("and the offer is gone, because there is nothing left to fix", !r.offer, String(r.offer));
}

console.log("\n5 - AN ASSISTED MOVEMENT REALLY IS UNDER YOUR WEIGHT, AND IS LEFT ALONE");
{
  const r = await p.evaluate(()=>{
    const wid = ROTATION[0];
    S.program[wid] = [{name:"Assisted Pull Up", sets:3, reps:"8-12", weight:100}];
    save(); S.active = null; startWorkout(wid); PF=null;
    const el=document.getElementById('preflight'); if(el) el.remove(); try{PF=null}catch(e){}
    S.active.entries[0].bwOn = 139.8;
    const st = S.active.entries[0].sets[0];
    st.weight = "100"; st.reps = "10"; save(); render();
    const line = document.querySelector('.plate-line');
    return {line: line ? line.innerText.replace(/\s+/g," ").trim() : null,
            fix: !!document.querySelector('[data-bwfix]')};
  });
  console.log("   ", JSON.stringify(r));
  ck("no misread-box warning on an assisted lift",
     !r.line || !/less than you weigh/.test(r.line), r.line);
  ck("and nothing offers to add your bodyweight to it", !r.fix, String(r.fix));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
