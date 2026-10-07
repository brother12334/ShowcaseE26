/* THE LOGGING SCREEN IS A FORM, ALL OF IT.

   This spec replaces the one that defended the stack, because the stack was taken out:
   collapsing an exercise to a line and a set row to a read-only record made the screen
   confusing to use, and it is reverted.

   What is defended here is what it went back to. Every exercise on the screen is drawn
   in full. Every set row is a box you can type into, at the same size, whether it has
   happened or not. The session bar carries one progress fill. Nothing decides on your
   behalf which part of your own workout you are allowed to see.

   One thing from the stack is kept on purpose and is asserted below: there is ONE live
   set in a session rather than one per exercise. That was a real bug — six cards each
   lit their own copper "you are here" row — and the rest clock reads the same answer. */
import { chromium, APP_URL, shot } from './_e26.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:844}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
await p.route(/^https?:/, r=> r.abort());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
const ev = (fn,a)=> p.evaluate(fn,a);

const setup = (doneSets)=> ev(async n=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open','spec-open','build-open','news-open');
  const af=document.getElementById('aiFull'); if(af) af.hidden=true;
  S.seenNews='x'; S.tourDone=true; S.geo='off'; S.priorTrainingWeeks=104;
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.splitId=DEFAULT_SPLIT; applySplit(); S.viewMode="regular";
  DAYS.forEach(w=>{ S.program[w]=[
    {name:"Barbell Bench Press", sets:4, reps:"5-8",  rpes:[7,8,8,9], weight:185},
    {name:"Lat Pulldown",        sets:3, reps:"8-12", rpes:[7,8,9]},
    {name:"Cable Fly",           sets:3, reps:"10-15",rpes:[8,9,9]}]; });
  save();
  S.active = null;
  startWorkout(DAYS[0]);
  const pf=document.getElementById('preflight'); if(pf) pf.remove();
  try{PF=null}catch(e){}
  let left = n;
  S.active.entries.forEach(e=> e.sets.forEach(st=>{
    if(left <= 0) return;
    st.weight="185"; st.reps="8"; st.rpe="8"; st.done=true; left--;
  }));
  S.active.restTimer = null;
  save(); TAB="workout"; render(); window.scrollTo(0,0);
  await new Promise(r=> setTimeout(r, 80));
  return true;
}, doneSets);

console.log("1 - EVERY EXERCISE IS DRAWN IN FULL");
{
  await setup(6);
  const r = await ev(()=>({
    cards:  document.querySelectorAll(".card.ex").length,
    shut:   document.querySelectorAll(".card.ex.is-shut").length,
    states: document.querySelectorAll(".ex-now, .ex-done, .ex-ahead").length,
    bodies: document.querySelectorAll(".ex-body").length,
    tap:    document.querySelectorAll("[data-exopen]").length,
    /* every card shows its sets, including the two that are behind and ahead of you */
    withRows: [...document.querySelectorAll(".card.ex")]
      .filter(c=> c.querySelectorAll(".set").length > 0).length
  }));
  ck("three exercises, three cards", r.cards === 3, String(r.cards));
  ck("none of them collapsed", r.shut === 0, String(r.shut));
  ck("and none of them carries a stack state", r.states === 0, String(r.states));
  ck("no collapsing wrapper", r.bodies === 0, String(r.bodies));
  ck("and no card is a tap target", r.tap === 0, String(r.tap));
  ck("every card shows its sets", r.withRows === 3, r.withRows + " of 3");
}

console.log("2 - EVERY SET ROW IS A FORM, THE SAME SIZE, DONE OR NOT");
{
  const r = await ev(()=>{
    const inp = [...document.querySelectorAll(".set input")];
    const vis = i=>{
      const cs = getComputedStyle(i);
      return cs.borderColor !== "rgba(0, 0, 0, 0)" && cs.borderStyle !== "none";
    };
    return {
      rows: document.querySelectorAll(".set").length,
      inputs: inp.length,
      bordered: inp.filter(vis).length,
      heights: [...new Set(inp.map(i=> Math.round(i.getBoundingClientRect().height)))].sort((a,c)=>a-c),
      ahead: document.querySelectorAll(".set.is-ahead").length,
      /* a logged row still fades back a little — that is M1 and it predates the stack */
      logged: document.querySelectorAll(".set.is-logged").length
    };
  });
  ck("ten set rows", r.rows === 10, String(r.rows));
  ck("every input is drawn as an input", r.bordered === r.inputs, r.bordered + " of " + r.inputs);
  ck("all at one height, so no row looks disabled", r.heights.length === 1, r.heights.join("/"));
  ck("and nothing is marked as a prescription", r.ahead === 0, String(r.ahead));
  ck("banked rows are still marked banked", r.logged === 6, String(r.logged));
}

console.log("3 - ONE LIVE SET IN THE SESSION, NOT ONE PER EXERCISE");
{
  const r = await ev(()=>({
    live: document.querySelectorAll(".set.is-live").length,
    where: (()=>{
      const el = document.querySelector(".set.is-live .chk");
      return el ? el.dataset.e + ":" + el.dataset.s : "none";
    })()
  }));
  ck("exactly one row says you are here", r.live === 1, String(r.live));
  ck("and it is the seventh set, which is the next one", r.where === "1:2", r.where);
}

console.log("4 - THE BAR IS A PROGRESS FILL AGAIN");
{
  const r = await ev(()=>{
    const f = document.getElementById("sbFill");
    return {fill: !!f, w: f ? f.style.width : "", rail: document.querySelectorAll(".sr-m, .sr-g").length};
  });
  ck("the fill is back", r.fill === true, String(r.fill));
  ck("and it reads six of ten", r.w === "60%", r.w);
  ck("the per-set rail is gone", r.rail === 0, String(r.rail));
}

console.log("5 - THE CUE AND THE ONE-LINE SUMMARY ARE GONE");
{
  const r = await ev(()=>({
    cue: document.querySelectorAll(".ex-cue").length,
    sum: document.querySelectorAll(".ex-sum").length,
    /* the target is back to being the thing in the header that says the prescription */
    target: document.querySelectorAll(".ex-target").length
  }));
  ck("no cue line", r.cue === 0, String(r.cue));
  ck("no done-in-one-line summary", r.sum === 0, String(r.sum));
  ck("the header still states the target", r.target >= 3, String(r.target));
}

console.log("6 - GYM MODE IS REACHABLE FROM THE SESSION");
{
  const r = await ev(async ()=>{
    const btn = document.getElementById("gymModeBtn");
    if(!btn) return {btn:false};
    btn.click();
    await new Promise(r2=> setTimeout(r2, 200));
    const mode = S.viewMode;
    const back = document.getElementById("gymModeBtn");
    const on = back && back.classList.contains("on");
    if(back) back.click();
    await new Promise(r2=> setTimeout(r2, 200));
    return {btn:true, mode, on, backTo: S.viewMode};
  });
  ck("there is a switch on the session", r.btn === true, "");
  ck("it turns gym mode on", r.mode === "focus", String(r.mode));
  ck("and says so while it is on", r.on === true, String(r.on));
  ck("and turns it off again", r.backTo === "regular", String(r.backTo));
}

console.log("7 - NOTHING THREW");
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
