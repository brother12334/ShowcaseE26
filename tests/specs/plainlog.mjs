import { chromium, APP_URL } from './_e26.mjs';
/* "REVERT THE WORKOUT LOGGING SCREEN TO THE LEGACY ... THERE'S LIKE THIS WEIRD BUGGY
   HIGHLIGHT WHEN LOGGING THAT WASN'T THERE FROM LEGACY", with the rest dial named too,
   and "I don't know what the W is on the side of the set".

   Three removals and one explanation, all of them paint rather than plumbing: the copper
   edge on the live row, the fade on logged rows and the sweep under a row that closes are
   no longer drawn; the rest screen is a plain panel instead of a machined dial; and the
   warm-up letter says what it did when you tap it. The CLASSES and the MARKUP stay, which
   is what keeps the rest rules, the live-set model and the other specs working. */
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
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr();
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, warmups:'off'});
  S.splitId=DEFAULT_SPLIT; applySplit();
  const wid=ROTATION[0];
  S.program[wid]=[{name:"Cable Fly", sets:3, reps:"8-12", weight:30}];
  save(); if(S.active) S.active=null; startWorkout(wid); PF=null; TAB="workout"; save();
  const el=document.getElementById('preflight'); if(el) el.remove(); try{PF=null}catch(e){}
  render();
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

console.log("1 - THE SET YOU ARE ON IS NO LONGER PAINTED");
{
  const r = await p.evaluate(()=>{
    const row = document.querySelector(".set.is-live");
    if(!row) return {none:true};
    const cs = getComputedStyle(row), before = getComputedStyle(row, "::before");
    return {marked: true, op: cs.opacity,
            bar: before.content === "none" || before.width === "auto" || before.width === "0px",
            barW: before.width, barContent: before.content};
  });
  console.log("   ", JSON.stringify(r));
  ck("the model still knows which set is live", r.marked, String(r.marked));
  ck("but no copper edge is drawn beside it", r.bar, r.barContent + " / " + r.barW);
}

console.log("\n2 - AND A SET YOU HAVE LOGGED IS NOT FADED OUT");
{
  const r = await p.evaluate(()=>{
    const st=S.active.entries[0].sets[0]; st.reps="10"; st.weight="30"; save(); render();
    document.querySelector('.chk[data-e="0"][data-s="0"]').click();
    const row = document.querySelector(".set.is-logged");
    return {marked: !!row, op: row ? getComputedStyle(row).opacity : null,
            sweep: getComputedStyle(document.querySelector(".set-sweep")||document.body).display};
  });
  console.log("   ", JSON.stringify(r));
  ck("the class is still there for the rules that read it", r.marked, String(r.marked));
  ck("and the row is at full strength", String(r.op) === "1", String(r.op));
  ck("the sweep under it draws nothing", r.sweep === "none", r.sweep);
}

console.log("\n3 - THE REST SCREEN IS A PANEL, NOT A DIAL");
{
  const r = await p.evaluate(async ()=>{
    showRestUI(false);
    await new Promise(x=> setTimeout(x, 350));
    const pl=document.querySelector(".pf-plate"), ring=document.querySelector(".pf-ring");
    const cs=getComputedStyle(pl);
    return {round: cs.borderRadius, ring: getComputedStyle(ring).display,
            anim: cs.animationName,
            time: (document.querySelector(".rest-full .rest-time")||{}).textContent||"",
            adj: document.querySelectorAll("[data-restadj]").length,
            ready: !!document.querySelector(".rest-stopbtn")};
  });
  console.log("   ", JSON.stringify(r));
  ck("it is not a disc", !/50%/.test(r.round), r.round);
  ck("the rim is not drawn", r.ring === "none", r.ring);
  ck("nothing settles or spins on arrival", r.anim === "none", r.anim);
  ck("the clock is still the thing on it", /\d/.test(r.time), r.time);
  ck("thirty seconds either way is still there", r.adj === 2, String(r.adj));
  ck("and so is I'm ready", r.ready, String(r.ready));
}

console.log("\n4 - THE WARM-UP LETTER SAYS WHAT IT MEANS WHEN YOU TAP IT");
{
  const r = await p.evaluate(()=>{
    hideRestUI(); S.active.restTimer=null; render();
    const w = document.querySelector("[data-setwarm]");
    if(!w) return {none:true};
    const label = w.getAttribute("aria-label") || "";
    w.click();
    const t = (document.querySelector("#toasts")||{}).innerText || "";
    return {label, toast: t, on: setIsWarmup(S.active.entries[0], 0)};
  });
  console.log("   ", JSON.stringify(r));
  ck("the button says what it is to a screen reader", /warm-up/i.test(r.label), r.label);
  ck("and tapping it says what it just did", /warm-up|working set/i.test(r.toast), r.toast);
  ck("naming the consequence, not the jargon", /volume|grade|working set/i.test(r.toast), r.toast);
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
