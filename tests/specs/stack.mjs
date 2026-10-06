/* A - THE SESSION IS A STACK.

   Three states for an exercise and three for a set, and only one of each is a thing to
   type into. The rule this spec exists to defend is that NOTHING IS REMOVED: a shut card
   still holds every input and every control, because the moment a collapsed row stops
   being reachable, undo, editing and half the app's own rules stop working. */
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
  EX_OPEN = {};
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

console.log("1 - THE RAIL IS THE SESSION, SET BY SET");
{
  await setup(5);
  const r = await ev(()=>{
    const rail = document.getElementById("sbRail");
    const groups = rail ? Array.from(rail.children) : [];
    const marks = rail ? Array.from(rail.querySelectorAll(".sr-m")) : [];
    return {groups: groups.length, marks: marks.length,
      entries: S.active.entries.length,
      sets: S.active.entries.reduce((t,e)=> t + e.sets.length, 0),
      on: marks.filter(m=> m.classList.contains("on")).length,
      live: marks.filter(m=> m.classList.contains("live")).length,
      liveAt: marks.findIndex(m=> m.classList.contains("live")),
      fill: !!document.getElementById("sbFill")};
  });
  ck("one group per exercise", r.groups === r.entries, r.groups + " of " + r.entries);
  ck("one mark per set", r.marks === r.sets, r.marks + " of " + r.sets);
  ck("the banked sets are filled", r.on === 5, String(r.on));
  ck("exactly one mark is the one you are on", r.live === 1, String(r.live));
  ck("and it is the first one that is not done", r.liveAt === 5, String(r.liveAt));
  ck("the undifferentiated fill is gone", r.fill === false, String(r.fill));
}

console.log("2 - THREE STATES, AND ONLY ONE OF THEM IS A SCREEN");
{
  const r = await ev(()=>{
    const cards = Array.from(document.querySelectorAll("#app .card.ex"));
    return cards.map(c=> ({
      kind: (c.className.match(/ex-(done|now|ahead)/) || [])[1],
      shut: c.classList.contains("is-shut"),
      bodyHidden: !!c.querySelector(".ex-body") &&
        getComputedStyle(c.querySelector(".ex-body")).display === "none",
      inputs: c.querySelectorAll(".set input").length,
      sum: (c.querySelector(".ex-sum-v") || {}).textContent || "",
      cue: (c.querySelector(".ex-cue") || {}).textContent || ""
    }));
  });
  ck("the finished movement is done and shut", r[0].kind === "done" && r[0].shut === true,
     JSON.stringify(r[0]));
  ck("the one you are on is open", r[1].kind === "now" && r[1].shut === false,
     JSON.stringify(r[1]));
  ck("the one after it is ahead and shut", r[2].kind === "ahead" && r[2].shut === true,
     JSON.stringify(r[2]));
  ck("a shut card hides its body", r[0].bodyHidden && r[2].bodyHidden,
     JSON.stringify(r.map(x=> x.bodyHidden)));
  ck("AND KEEPS EVERY INPUT IN THE DOCUMENT",
     r[0].inputs > 0 && r[2].inputs > 0, JSON.stringify(r.map(x=> x.inputs)));
  ck("the finished one says what it did", /185/.test(r[0].sum) && /8/.test(r[0].sum), r[0].sum);
  ck("only the live card carries the cue",
     r[1].cue.length > 6 && !r[0].cue && !r[2].cue, JSON.stringify(r.map(x=> x.cue)));
}

console.log("3 - THE CUE IS THE SENTENCE SOMEBODY WOULD SAY AT THE RACK");
{
  const r = await ev(()=> (document.querySelector(".ex-cue") || {}).textContent
    .replace(/\s+/g," ").trim());
  ck("it carries the load", /^\d/.test(r), r);
  ck("which set of how many", /set 2 of 3/.test(r), r);
  ck("the rep target", /reps/.test(r), r);
  ck("and the effort target", /RPE \d/.test(r), r);
  ck("and it never reads the unit word as a load", !/^lb\b|^kg\b/.test(r), r);
}

console.log("4 - A SET BEHIND YOU IS A RECORD, A SET AHEAD IS A PRESCRIPTION");
{
  const r = await ev(()=>{
    const card = document.querySelectorAll("#app .card.ex")[1];
    const rows = Array.from(card.querySelectorAll(".set"));
    return rows.map(x=>{
      const inp = x.querySelector('[data-f="weight"]');
      const chk = x.querySelector(".chk");
      return {cls: (x.className.match(/is-(logged|live|ahead)/) || [])[1],
        inputH: Math.round(inp.getBoundingClientRect().height),
        chkW: Math.round(chk.getBoundingClientRect().width)};
    });
  });
  const live = r.find(x=> x.cls === "live");
  ck("the row you are on is the tall one", !!live && live.inputH >= 48, JSON.stringify(r));
  ck("every other row is short",
     r.filter(x=> x.cls !== "live").every(x=> x.inputH < 40), JSON.stringify(r));
  ck("and the live tick is the big one",
     r.filter(x=> x.cls !== "live").every(x=> x.chkW < live.chkW), JSON.stringify(r));
}
{
  const r = await ev(async ()=>{
    const card = document.querySelectorAll("#app .card.ex")[1];
    const row = Array.from(card.querySelectorAll(".set")).find(x=> x.classList.contains("is-live"));
    row.querySelector('[data-f="weight"]').value = "120";
    row.querySelector('[data-f="reps"]').value = "10";
    row.querySelector(".chk").click();
    await new Promise(r2=> setTimeout(r2, 160));
    const rows = Array.from(card.querySelectorAll(".set"));
    return {states: rows.map(x=> (x.className.match(/is-(logged|live|ahead)/) || [])[1]),
      idx: rows.indexOf(row),
      swept: !!row.querySelector(".set-sweep"),
      sweeping: row.classList.contains("sweeping"),
      cue: (card.querySelector(".ex-cue") || {}).textContent.replace(/\s+/g," ").trim()};
  });
  ck("banking a set turns its row into a record", r.states[r.idx] === "logged",
     JSON.stringify(r.states));
  ck("THE NEXT ROW BECOMES THE LIVE ONE, with no redraw", r.states[r.idx + 1] === "live",
     JSON.stringify(r.states));
  ck("a rule sweeps under the row that just closed", r.swept && r.sweeping,
     JSON.stringify(r));
  ck("and the cue follows it to the next set", /set 3 of 3/.test(r.cue), r.cue);
}

console.log("5 - A COLLAPSED ROW IS STILL EDITABLE");
{
  const r = await ev(async ()=>{
    const card = document.querySelectorAll("#app .card.ex")[1];
    const row = Array.from(card.querySelectorAll(".set")).filter(x=>
      x.classList.contains("is-logged")).pop();
    const inp = row.querySelector('[data-f="weight"]');
    const before = Math.round(inp.getBoundingClientRect().height);
    inp.focus();
    /* The box grows on a TRANSFORM, so it is still at its old height on the frame the
       focus lands — which is the point of a transition and a thing a measurement taken
       in the same tick will get wrong. */
    await new Promise(r2=> setTimeout(r2, 420));
    const after = Math.round(inp.getBoundingClientRect().height);
    inp.blur();
    return {before, after, value: inp.value};
  });
  ck("a logged row's box is small until you touch it", r.before < 40, String(r.before));
  ck("AND IT GROWS BACK WHEN YOU FOCUS IT", r.after > r.before, r.before + " -> " + r.after);
  ck("with the number you logged still in it", r.value === "120", r.value);
}

console.log("6 - A SHUT CARD OPENS ON TAP AND STAYS OPEN");
{
  const r = await ev(async ()=>{
    const shut = document.querySelector("#app .card.ex.is-shut[data-exopen]");
    const i = shut.dataset.exopen;
    shut.click();
    await new Promise(r2=> setTimeout(r2, 160));
    const now = document.querySelectorAll("#app .card.ex")[parseInt(i, 10)];
    return {opened: !now.classList.contains("is-shut"), flag: !!EX_OPEN[i], i};
  });
  ck("tapping it opens it", r.opened === true, JSON.stringify(r));
  ck("and it is remembered, so a redraw does not shut it again", r.flag === true,
     JSON.stringify(r));
}
{
  /* The overflow inside a shut card must not also be a tap on the card. */
  const r = await ev(async ()=>{
    EX_OPEN = {}; render();
    await new Promise(r2=> setTimeout(r2, 120));
    const shut = document.querySelector("#app .card.ex.ex-ahead.is-shut");
    const more = shut.querySelector("[data-exmore]");
    const i = shut.dataset.exopen;
    more.click();
    await new Promise(r2=> setTimeout(r2, 260));
    const modal = document.getElementById("modalBg").classList.contains("show");
    hideModal();
    return {modal, stillShut: !EX_OPEN[i]};
  });
  ck("the overflow opens its sheet", r.modal === true, String(r.modal));
  ck("and does not also open the card under it", r.stillShut === true, String(r.stillShut));
}

console.log("7 - THE SESSION FITS ON A SCREEN AGAIN");
{
  await setup(5);
  const r = await ev(()=>{
    const app = document.getElementById("app");
    return {h: Math.round(app.scrollHeight), screens: +(app.scrollHeight/window.innerHeight).toFixed(1),
            rows: document.querySelectorAll(".set").length,
            forms: Array.from(document.querySelectorAll(".set")).filter(x=>
              x.classList.contains("is-live")).length};
  });
  ck("every set row is still in the document", r.rows === 10, String(r.rows));
  ck("EXACTLY ONE OF THEM IS A FORM", r.forms === 1, String(r.forms));
  ck("and the session is about a screen and a half", r.screens <= 2.6,
     r.h + "px, " + r.screens + " screens");
  await p.screenshot({path: shot("stack-session.png")});
}

console.log("8 - GYM MODE IS REACHABLE FROM THE SESSION");
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

console.log("9 - NOTHING THREW");
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
