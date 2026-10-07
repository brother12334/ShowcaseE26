/* "A LOOK AT YOUR PLAN" IS FOR THE PERSON WHO HAS NOT RUN IT YET.

   The card draws a bar per muscle for the week the plan asks for. It is pure arithmetic
   on S.program -- it needs no logged sessions, no completed cycle and no history -- and
   it is the first thing somebody wants from a plan they have just built, imported or
   switched to.

   It had two ways to disappear, and both of them hit exactly that person:

     a clean check returned a two-line "Your plan checks out" with no bars, and the
     builder is GATED on this check passing, so a freshly built plan was the likeliest
     thing to get it;

     and any throw inside the check returned "", so the card vanished with nothing said.

   This spec holds all three readings -- findings, clean, and broken -- to the same rule:
   the heading is there and the bars are there. */
import { chromium, APP_URL } from './_e26.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
await p.route(/^https?:/, r=> r.abort());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
const ev = (fn, arg)=> p.evaluate(fn, arg);

/* A BRAND-NEW USER: set up, a plan in place, nothing ever logged. */
const fresh = ()=> ev(async ()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open','spec-open','build-open','news-open');
  S.setup={name:"Fer",goal:"muscle",level:"beginner",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.seenNews='x';
  S.sessions=[]; S.bodyLog=[]; S.priorTrainingWeeks=0; S.builtPlan=null;
  S.splitId=DEFAULT_SPLIT; applySplit(); save();
  TAB="program"; render();
  await new Promise(r=> setTimeout(r, 120));
  return {sessions:(S.sessions||[]).length};
});

console.log("1 - A USER WHO HAS NEVER LOGGED A SET STILL GETS THE LOOK");
{
  const s = await fresh();
  const r = await ev(()=>{
    const app = document.getElementById("app");
    const head = [...app.querySelectorAll("h3")].find(h=> h.textContent.trim() === "A look at your plan");
    return {head: !!head, bars: app.querySelectorAll(".pv-r").length,
            tall: head ? Math.round(head.closest(".card").getBoundingClientRect().height) : 0};
  });
  ck("no sessions on record", s.sessions === 0, String(s.sessions));
  ck("the card is on the Program tab", r.head === true, "");
  ck("and it has a bar per muscle", r.bars >= 10, String(r.bars));
  ck("and it is actually drawn, not a zero-height node", r.tall > 200, r.tall + "px");
}

console.log("2 - A PLAN WITH NOTHING WRONG WITH IT IS STILL SHOWN, WITH THE BARS");
{
  const r = await ev(async ()=>{
    /* force the clean reading: the builder is gated on this same check, so a freshly
       built plan is the likeliest thing to produce it */
    const real = window.planQuality;
    /* A clean plan is clean in the bars too: clearing the findings while leaving a muscle
       under its floor in the volume array is a state the app cannot produce, and the lead
       line correctly describes the BARS. */
    window.planQuality = function(){ const q = real.apply(this, arguments);
      return Object.assign({}, q, {fail: [], warn: [], ok: true,
        volume: (q.volume || []).map(v=> Object.assign({}, v,
          {state: "ok", v: Math.max(v.v, v.mev), short: 0}))}); };
    render();
    await new Promise(r2=> setTimeout(r2, 120));
    const app = document.getElementById("app");
    const head = [...app.querySelectorAll("h3")].find(h=> h.textContent.trim() === "A look at your plan");
    const out = {head: !!head, bars: app.querySelectorAll(".pv-r").length,
                 oldCard: app.innerHTML.includes("Your plan checks out"),
                 says: head ? head.closest(".card").querySelector(".sub").textContent.trim() : ""};
    window.planQuality = real; render();
    await new Promise(r2=> setTimeout(r2, 80));
    return out;
  });
  ck("the heading is the same heading", r.head === true, "");
  ck("the bars are still there", r.bars >= 10, String(r.bars));
  ck("the two-line stub is gone", r.oldCard === false, "");
  ck("and it says the plan is sound", /inside its range/.test(r.says), r.says.slice(0, 90));
}

console.log("3 - A CHECK THAT THROWS SAYS SO INSTEAD OF VANISHING");
{
  const r = await ev(async ()=>{
    const real = window.planQuality;
    window.planQuality = function(){ throw new Error("test failure"); };
    render();
    await new Promise(r2=> setTimeout(r2, 120));
    const app = document.getElementById("app");
    const head = [...app.querySelectorAll("h3")].find(h=> h.textContent.trim() === "A look at your plan");
    const out = {head: !!head,
                 says: head ? head.closest(".card").querySelector(".sub").textContent.trim() : "",
                 /* and the plan itself is still on the page below it */
                 days: app.querySelectorAll(".card").length};
    window.planQuality = real; render();
    await new Promise(r2=> setTimeout(r2, 80));
    return out;
  });
  ck("the card does not disappear", r.head === true, "it returned nothing at all");
  ck("it says the check could not run", /could not read/.test(r.says), r.says.slice(0, 90));
  ck("it names the reason", /test failure/.test(r.says), r.says.slice(0, 120));
  ck("and the plan below it is untouched", r.days > 3, String(r.days));
}

console.log("4 - SWITCHING PLANS REDRAWS IT AGAINST THE NEW PLAN");
{
  const r = await ev(async ()=>{
    const before = [...document.querySelectorAll(".pv-r")].map(x=> x.querySelector(".pv-v").textContent.trim());
    /* halve every exercise: a different plan, so a different reading */
    DAYS.forEach(w=> (S.program[w]||[]).forEach(e=> e.sets = 1));
    save(); render();
    await new Promise(r2=> setTimeout(r2, 120));
    const after = [...document.querySelectorAll(".pv-r")].map(x=> x.querySelector(".pv-v").textContent.trim());
    return {before: before.join("|"), after: after.join("|"),
            head: !!document.querySelector("h3")};
  });
  ck("the card is still there after the switch", r.head === true, "");
  ck("and the numbers follow the new plan", r.before !== r.after, "unchanged: " + r.after.slice(0, 60));
}

console.log("5 - NOTHING THREW");
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
