/* HISTORY IS ONE PAGE, NOT THREE TABS.

   Proposal D put a Lifts | Sessions | Records switcher at the top of the tab and opened
   on Lifts. It is taken out: History is the session list again, with the record book
   above it, the way it was.

   Two collisions went with it, and they are what section 3 is for. The Lifts view
   declared a SECOND function called sparkHTML(v) \u2014 one argument \u2014 in the same scope as
   the record book\'s sparkHTML(vals, w, h, col). The later declaration wins, so every
   call that asked for a width, a height and a colour had been quietly getting the
   one-argument version and its own fixed class. Its CSS did the same thing to
   .lf-list / .lf-row / .lf-n / .lf-d / .lf-r, which the record book\'s chart list and the
   bodyweight retro-fix sheet were already using. Neither was deliberate; both are the
   kind of thing a big single file makes easy and nothing was watching for. */
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
  save(); HIST_SHOW=20; TAB="history"; render(); window.scrollTo(0,0);
});
await p.waitForTimeout(400);

console.log("1 - THERE IS NO TAB BAR ON HISTORY");
{
  const r = await ev(()=>{
    const app = document.getElementById("app");
    return {seg: app.querySelectorAll("[data-histview]").length,
            metric: app.querySelectorAll(".nb-metric").length,
            lifts: app.querySelectorAll(".lf-row[data-liftrow]").length,
            defined: typeof HIST_VIEW};
  });
  ck("no view buttons", r.seg === 0, String(r.seg));
  ck("no segmented control at all", r.metric === 0, String(r.metric));
  ck("and no lifts list", r.lifts === 0, String(r.lifts));
  ck("the switch is gone from the app, not just the markup", r.defined === "undefined", r.defined);
}

console.log("2 - IT OPENS ON THE RECORD BOOK AND THE SESSIONS, AS IT DID");
{
  const r = await ev(()=>{
    const app = document.getElementById("app");
    return {teaser: app.querySelectorAll("#recordsBtn").length,
            sessions: app.querySelectorAll("#app .card.sess, .card.sess").length,
            heat: app.querySelectorAll(".hh-grid, .heat, [class*=heat]").length > 0};
  });
  ck("the record book is reachable from the page", r.teaser === 1, String(r.teaser));
  ck("the sessions are on it", r.sessions > 0, String(r.sessions));
}

console.log("3 - ONE sparkHTML, AND IT IS THE ONE THAT TAKES A SIZE");
{
  const r = await ev(()=>{
    const out = sparkHTML([1,2,3,4,5], 74, 28, "#c8c8c8");
    return {len: sparkHTML.length, out: out.slice(0, 120),
            sized: /width="74"/.test(out) && /height="28"/.test(out),
            cls: /class="rb-spark"/.test(out),
            lf: /lf-spark/.test(out)};
  });
  ck("it takes four arguments", r.len === 4, String(r.len));
  ck("it honours the size it is given", r.sized === true, r.out);
  ck("and draws the record book\'s spark, not the lifts one", r.cls && !r.lf, r.out);
}

console.log("4 - THE SESSIONS ARE STILL THERE, TWENTY AT A TIME");
{
  const r = await ev(async ()=>{
    const first = document.querySelectorAll("#app .card.sess").length;
    const more = document.getElementById("histMore");
    const label = more ? more.textContent.trim() : "";
    if(more) more.click();
    await new Promise(r2=> setTimeout(r2, 300));
    return {first, label, second: document.querySelectorAll("#app .card.sess").length,
      total: S.sessions.length};
  });
  ck("twenty of them to start", r.first === 20, String(r.first));
  ck("it says how many more there are", /\d+ more session/.test(r.label), r.label);
  ck("AND THE REST ARE ONE TAP AWAY", r.second === 40, String(r.second));
  ck("none of them are lost", r.total === 40, String(r.total));
}

console.log("5 - THE RECORD BOOK STILL OPENS AND CLOSES");
{
  const r = await ev(async ()=>{
    document.getElementById("recordsBtn").click();
    await new Promise(r2=> setTimeout(r2, 300));
    const open = RECORDS_OPEN;
    const back = document.getElementById("rbBack");
    if(back) back.click();
    await new Promise(r2=> setTimeout(r2, 300));
    return {open, closed: RECORDS_OPEN === false,
            sessions: document.querySelectorAll("#app .card.sess").length};
  });
  ck("it opens", r.open === true, String(r.open));
  ck("and backing out closes it", r.closed === true, String(r.closed));
  ck("and lands you back on the history", r.sessions > 0, String(r.sessions));
}

console.log("6 - NOTHING THREW");
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
