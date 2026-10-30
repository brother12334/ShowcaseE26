/* THE SWITCH HAS TO BE THERE TO BE USED.

   "Count me in the load" has existed for a while and worked, and almost nobody could
   reach it: the list of movements it is offered on was written in the singular with a
   word boundary on the end, so "Dip" matched and "Weighted Chest Dips" did not. Programs
   are written in the plural, so in practice the button was missing from most of the
   movements it exists for.

   This spec is the list itself. It is cheap, it is the whole bug, and a name added to
   the library later with an s on it will not quietly lose its switch again. */
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

const setup = (name, weighIn)=> ev(async a=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open','spec-open','build-open','news-open');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.priorTrainingWeeks=104; S.seenNews='x';
  S.bodyLog = a.weighIn ? [{date: todayStr(), w: 180, at: Date.now()}] : [];
  S.bwEx = {};
  S.splitId=DEFAULT_SPLIT; applySplit(); S.viewMode="regular";
  DAYS.forEach(w=>{ S.program[w]=[{name: a.name, sets:3, reps:"4-8", rpes:[7,8,9]}]; });
  save();
  S.active = null;
  startWorkout(DAYS[0]);
  const pf=document.getElementById('preflight'); if(pf) pf.remove();
  try{PF=null}catch(e){}
  S.active.restTimer = null;
  save(); TAB="workout"; render(); window.scrollTo(0,0);
  await new Promise(r=> setTimeout(r, 60));
  return true;
}, {name, weighIn});

console.log("1 - THE MOVEMENTS THIS IS FOR, AS THEY ARE ACTUALLY NAMED");
{
  /* The name from the report, first. */
  const names = ["Weighted Chest Dips", "Dip", "Dips", "Pull-Ups", "Pull-Up",
    "Chin-ups", "Push-ups", "Bulgarian Split Squats", "Walking Lunges",
    "Hanging Leg Raises", "Step-Ups", "Glute Bridges", "Planks",
    "Back Extensions", "Nordic Curls", "Pistol Squats", "Muscle-Ups", "Inverted Rows"];
  const r = await ev(ns=> ns.filter(n=> !isBodyweightMove(n)), names);
  ck("every one of them can count you", r.length === 0, "missed: " + r.join(", "));
}

console.log("2 - AND NOTHING YOU DO NOT STAND IN");
{
  const names = ["Barbell Bench Press", "Lat Pulldown", "Cable Fly", "Barbell Row",
    "Dumbbell Curl", "Leg Press", "Romanian Deadlift", "Seated Calf Raise Machine"];
  const r = await ev(ns=> ns.filter(n=> isBodyweightMove(n)), names);
  /* a calf RAISE is caught by "leg raise"? no — but check the rest stay out */
  ck("a barbell lift is not a bodyweight movement", r.length === 0, "wrongly matched: " + r.join(", "));
}

console.log("3 - THE CARD COMES UP COUNTING YOU, WITH NOTHING TO PRESS");
/* "For any bodyweight exercise the bodyweight look should automatically be applied, you
   shouldn't have to add you" — and "remove that button that says +you". A dip is a dip
   whether or not anybody found a switch. */
{
  await setup("Weighted Chest Dips", true);
  const r = await ev(()=>{
    const en = S.active.entries[0];
    const sw = document.querySelector("[data-bw]");
    return {on: entryBwOn(en), said: S.bwEx[nrm("Weighted Chest Dips")],
            foot: [...document.querySelectorAll(".card.ex .btn[data-bw]")].length,
            need: !!document.querySelector("[data-bwneed]"),
            onLine: !!(sw && sw.closest(".bw-led")), txt: sw ? sw.textContent.trim() : null};
  });
  console.log("   ", JSON.stringify(r));
  ck("it counts you from the first session, unasked", r.on === 180, String(r.on));
  ck("without anything having been recorded as a choice", r.said === undefined, String(r.said));
  ck("THE +YOU BUTTON IS GONE", r.foot === 0 && !r.need, JSON.stringify({foot: r.foot, need: r.need}));
  ck("and the only switch is the 'you 180' on the load line",
     r.onLine && /^you 180$/.test(r.txt || ""), JSON.stringify({txt: r.txt, onLine: r.onLine}));
}

console.log("4 - AND TURNING IT OFF GIVES BACK EXACTLY WHAT IT ADDED");
{
  const r = await ev(async ()=>{
    const en = S.active.entries[0];
    en.sets[0].weight = "205";           // 180 of you, 25 hung off you
    save(); render();
    await new Promise(r2=> setTimeout(r2, 60));
    document.querySelector("[data-bw]").click();
    await new Promise(r2=> setTimeout(r2, 120));
    return {w: (S.active.entries[0].sets || []).map(s=> s.weight),
            said: S.bwEx[nrm("Weighted Chest Dips")],
            on: entryBwOn(S.active.entries[0])};
  });
  console.log("   ", JSON.stringify(r));
  ck("turning it off gives back exactly what it added", r.w[0] === "25", r.w.join(","));
  ck("a set that was only you goes back to empty", r.w[1] === "", "[" + r.w.join(",") + "]");
  ck("and it is off", r.on === 0, String(r.on));
}

console.log("5 - AND IT STAYS OFF, BECAUSE THAT WAS AN ANSWER");
/* The automatic rule must not switch it straight back on next session. */
{
  const r = await ev(async ()=>{
    const said = S.bwEx[nrm("Weighted Chest Dips")];
    S.active = null; startWorkout(DAYS[0]);
    const pf=document.getElementById('preflight'); if(pf) pf.remove();
    try{PF=null}catch(e){}
    save(); render();
    await new Promise(r2=> setTimeout(r2, 60));
    return {said, remembered: bwRemembered("Weighted Chest Dips"),
            on: entryBwOn(S.active.entries[0]),
            auto: bwAutoCount("Weighted Chest Dips")};
  });
  console.log("   ", JSON.stringify(r));
  ck("off is recorded as off", r.said === 0, String(r.said));
  ck("the movement would otherwise count you", r.auto === true, String(r.auto));
  ck("but the next session honours the answer", r.remembered === false && r.on === 0,
     JSON.stringify({remembered: r.remembered, on: r.on}));
}

console.log("6 - WITH NO WEIGH-IN IT SAYS SO WHERE THE BW+ LINE WOULD BE");
{
  await setup("Pull-Ups", false);
  const r = await ev(()=>{
    const need = document.querySelector("[data-bwneed]");
    return {need: !!need, txt: need ? (need.closest(".plate-line")||need).innerText.replace(/\s+/g," ").trim() : "",
            onCard: !!(need && need.closest(".plate-line")),
            foot: [...document.querySelectorAll(".card.ex .btn[data-bw]")].length,
            on: entryBwOn(S.active.entries[0])};
  });
  console.log("   ", JSON.stringify(r));
  ck("nothing is counted, because there is nothing to count", r.on === 0, String(r.on));
  ck("it says why rather than going quiet", r.need && r.onCard,
     JSON.stringify({need: r.need, onCard: r.onCard}));
  ck("and asks for the one fact it is missing", /weigh-in/i.test(r.txt), r.txt.slice(0, 90));
  ck("still with no +you button", r.foot === 0, String(r.foot));
}

console.log("7 - NOTHING THREW");
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
