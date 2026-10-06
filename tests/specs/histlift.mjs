/* D - HISTORY IS THE STORY OF YOUR LIFTS.

   115 sessions drew 115 identical cards: 20.1 screens, 1,572 focusable controls, 105.7ms
   a render, and nowhere on the tab could you see a lift getting heavier. */
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

await ev(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open','spec-open','build-open','news-open');
  const af=document.getElementById('aiFull'); if(af) af.hidden=true;
  S.seenNews='x'; S.tourDone=true; S.geo='off'; S.priorTrainingWeeks=104;
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.splitId=DEFAULT_SPLIT; applySplit();
  const DAY=86400e3, now=Date.now();
  const d=t=> new Date(t).toLocaleDateString("en-CA");
  DAYS.forEach(w=>{ S.program[w]=[
    {name:"Barbell Bench Press", sets:3, reps:"5-8", rpes:[7,8,9], weight:185},
    {name:"Pull-Up",             sets:3, reps:"6-10", rpes:[7,8,9]}]; });
  /* Forty sessions with a bench that climbs and a pull-up that does not: one line with a
     shape and one without, which is the pair this view has to tell apart. */
  S.sessions=[];
  for(let i=40;i>=1;i--){
    const at = now - i*2*DAY;
    const load = 145 + Math.floor((40 - i) / 4) * 5;
    S.sessions.push({id:"s"+i, workoutId: DAYS[i % DAYS.length], date:d(at),
      startedAt:at, finishedAt:at+3600e3, feel:4, entries:[
        {name:"Barbell Bench Press", sets:[
          {weight:String(load), reps:"8", rpe:"8", done:true},
          {weight:String(load), reps:"7", rpe:"9", done:true}]},
        {name:"Pull-Up", sets:[{weight:"", reps:"10", rpe:"8", done:true}]}]});
  }
  save(); HIST_VIEW="lifts"; HIST_SHOW=20; TAB="history"; render(); window.scrollTo(0,0);
});
await p.waitForTimeout(400);

console.log("1 - THREE VIEWS, AND THE ONE THAT ANSWERS THE QUESTION OPENS FIRST");
{
  const r = await ev(()=>{
    const segs = Array.from(document.querySelectorAll("[data-histview]"));
    return {n: segs.length, ids: segs.map(x=> x.dataset.histview),
      on: segs.filter(x=> x.classList.contains("on")).map(x=> x.dataset.histview),
      rows: document.querySelectorAll(".lf-row").length,
      cards: document.querySelectorAll("#app .card.sess").length};
  });
  ck("three of them", r.n === 3, JSON.stringify(r.ids));
  ck("lifts, sessions, records", r.ids.join(",") === "lifts,sessions,records", r.ids.join(","));
  ck("and lifts is the one you land on", r.on.join(",") === "lifts", JSON.stringify(r.on));
  ck("it draws a row per lift", r.rows >= 2, String(r.rows));
  ck("and no session cards at all", r.cards === 0, String(r.cards));
}

console.log("2 - A ROW SAYS WHAT THE LIFT HAS DONE");
{
  const r = await ev(()=>{
    const rows = Array.from(document.querySelectorAll(".lf-row"));
    return rows.map(x=> ({
      name: (x.querySelector(".lf-n") || {}).textContent.trim(),
      delta: (x.querySelector(".lf-d") || {}).textContent.replace(/\s+/g," ").trim(),
      now: (x.querySelector(".lf-now") || {}).textContent.trim(),
      pts: (x.querySelector(".lf-line") || {}).getAttribute
        ? ((x.querySelector(".lf-line").getAttribute("d") || "").match(/[ML]/g) || []).length : 0
    }));
  });
  const bench = r.find(x=> /Bench/.test(x.name));
  const pull = r.find(x=> /Pull/.test(x.name));
  ck("the bench is there with its climb", bench && /\+\d+ lb/.test(bench.delta),
     JSON.stringify(bench));
  ck("and the number it is at now", bench && /^\d+$/.test(bench.now), bench && bench.now);
  ck("it has a line with points in it", bench && bench.pts > 4, String(bench && bench.pts));
  ck("A LIFT WITH NO LOAD IS MEASURED IN REPS", pull && /reps|level/.test(pull.delta),
     JSON.stringify(pull));
  ck("and a flat lift says so rather than inventing a climb",
     pull && /level/.test(pull.delta), pull && pull.delta);
  await p.screenshot({path: shot("hist-lifts.png")});
}

console.log("3 - THE TAB IS NO LONGER TWENTY SCREENS AND A HUNDRED MILLISECONDS");
{
  const r = await ev(()=>{
    const app = document.getElementById("app");
    const t0 = performance.now();
    for(let i = 0; i < 5; i++){ TAB = "history"; render(); }
    const ms = (performance.now() - t0) / 5;
    return {h: Math.round(app.scrollHeight),
      screens: +(app.scrollHeight / window.innerHeight).toFixed(1),
      controls: app.querySelectorAll("button, a, input, select").length,
      ms: +ms.toFixed(1)};
  });
  ck("it fits in about a screen", r.screens <= 2.5, r.h + "px / " + r.screens + " screens");
  ck("with tens of controls, not thousands", r.controls < 80, String(r.controls));
  ck("and it draws in a handful of milliseconds", r.ms < 40, r.ms + "ms");
}

console.log("4 - THE SESSIONS ARE STILL THERE, TWENTY AT A TIME");
{
  const r = await ev(async ()=>{
    document.querySelector('[data-histview="sessions"]').click();
    await new Promise(r2=> setTimeout(r2, 300));
    const first = document.querySelectorAll("#app .card.sess").length;
    const more = document.getElementById("histMore");
    const label = more ? more.textContent.trim() : "";
    if(more) more.click();
    await new Promise(r2=> setTimeout(r2, 300));
    return {first, label, second: document.querySelectorAll("#app .card.sess").length,
      total: S.sessions.length, view: HIST_VIEW};
  });
  ck("switching to sessions shows sessions", r.view === "sessions" && r.first > 0,
     JSON.stringify(r));
  ck("twenty of them to start", r.first === 20, String(r.first));
  ck("it says how many more there are", /\d+ more session/.test(r.label), r.label);
  ck("AND THE REST ARE ONE TAP AWAY", r.second === 40, String(r.second));
  ck("none of them are lost", r.total === 40, String(r.total));
}

console.log("5 - A LIFT OPENS ITS OWN RECORD");
{
  const r = await ev(async ()=>{
    document.querySelector('[data-histview="lifts"]').click();
    await new Promise(r2=> setTimeout(r2, 250));
    const row = document.querySelector('[data-liftrow]');
    const name = row.dataset.liftrow;
    row.click();
    await new Promise(r2=> setTimeout(r2, 350));
    return {name, view: HIST_VIEW, open: RECORDS_OPEN, ex: RB_EX,
      text: (document.getElementById("app").innerText || "").slice(0, 120)};
  });
  ck("it goes to the records", r.open === true && r.view === "records", JSON.stringify(r));
  ck("scoped to that movement", r.ex === r.name, r.ex + " vs " + r.name);
}

console.log("6 - NOTHING THREW");
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
