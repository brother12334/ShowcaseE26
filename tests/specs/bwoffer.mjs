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

console.log("3 - THE BUTTON IS ON THE CARD, AND IT SAYS THE NUMBER");
{
  await setup("Weighted Chest Dips", true);
  const r = await ev(()=>{
    const btn = document.querySelector("[data-bw]");
    return {found: !!btn, txt: btn ? btn.textContent.trim() : "",
            need: !!document.querySelector("[data-bwneed]")};
  });
  ck("there is a switch on the dips card", r.found === true, r.need ? "it is asking for a weigh-in" : "no button at all");
  ck("and it says what it will add", /180/.test(r.txt), r.txt);
}

console.log("4 - PRESSING IT PUTS YOUR WEIGHT ON EVERY SET");
{
  const r = await ev(async ()=>{
    document.querySelector("[data-bw]").click();
    await new Promise(r2=> setTimeout(r2, 120));
    const en = S.active.entries[0];
    return {on: entryBwOn(en), weights: (en.sets||[]).map(s=> s.weight),
            txt: (document.querySelector("[data-bw]")||{}).textContent};
  });
  ck("it is on, stamped at the weight it used", r.on === 180, String(r.on));
  ck("and every set carries it", r.weights.join(",") === "180,180,180", r.weights.join(","));
  ck("the button now says it is counting you", /✓/.test(r.txt || ""), (r.txt||"").trim());
}

console.log("5 - ADDING WEIGHT TO THE BAR STILL ADDS TO IT");
{
  const r = await ev(async ()=>{
    const en = S.active.entries[0];
    en.sets[0].weight = "205";           // 180 of you, 25 hung off you
    save(); render();
    await new Promise(r2=> setTimeout(r2, 60));
    document.querySelector("[data-bw]").click();   // and off again
    await new Promise(r2=> setTimeout(r2, 120));
    return (S.active.entries[0].sets || []).map(s=> s.weight);
  });
  ck("turning it off gives back exactly what it added", r[0] === "25", r.join(","));
  ck("and a set that was only you goes back to empty", r[1] === "", "[" + r.join(",") + "]");
}

console.log("6 - WITH NO WEIGH-IN IT ASKS FOR ONE INSTEAD OF HIDING");
{
  await setup("Pull-Ups", false);
  const r = await ev(()=>{
    const need = document.querySelector("[data-bwneed]");
    return {need: !!need, txt: need ? need.textContent.trim() : "",
            live: !!document.querySelector("[data-bw]")};
  });
  ck("the offer is still made", r.need === true, r.live ? "it thinks it knows a weight" : "nothing offered");
  ck("and it asks rather than guessing", /weight/i.test(r.txt), r.txt);
}

console.log("7 - NOTHING THREW");
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
