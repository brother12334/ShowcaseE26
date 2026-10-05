import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:390,height:1400}});
const p = await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:true,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});

let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

/* A log with plenty of pulling and very little pressing: the ratio finding this is about. */
const setup = ()=> p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.priorAsked=true; S.sleepAsked=todayStr();
  S.flags=[]; S.deload=null; S.viewMode="list"; S.planStart=Date.now()-200*86400e3;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, warmups:"off"});
  S.splitId=DEFAULT_SPLIT; applySplit();
  /* Earlier sections add exercises to the programme; each one starts from the same plan */
  if(!window.__prog0) window.__prog0 = JSON.stringify(S.program);
  else S.program = JSON.parse(window.__prog0);
  S.planLog = [];
  const wid = ROTATION[0];
  const mk=(dAgo, entries)=>({id:"s"+dAgo, workoutId: ROTATION[dAgo % ROTATION.length],
    date:new Date(Date.now()-dAgo*86400e3).toLocaleDateString("en-CA"),
    startedAt:Date.now()-dAgo*86400e3-3600e3, finishedAt:Date.now()-dAgo*86400e3, feel:4, entries});
  const sets=(n,w,r)=> Array.from({length:n},()=>({weight:String(w), reps:String(r), rpe:"8", done:true}));
  S.sessions = [1,2,3,4,5,6,8,10].map(d=> mk(d, [
    {name:"Barbell Row", reps:"8-12", sets:sets(5,135,10)},
    {name:"Lat Pulldown", reps:"8-12", sets:sets(5,120,10)}
  ]));
  // oldest first, the way the app keeps them
  S.sessions.sort((x,y)=> x.startedAt - y.startedAt);
  S.cycleStart = Date.now() - 7*86400e3;
  BODY_OPEN.wpall = true;            // show the whole list, not the top three
  save(); TAB="body"; render();
  const A = bodyAnalysis();
  return {weak: (A.weak||[]).map(w=> w.kind + ":" + w.muscle + ":" + w.act),
          rows: document.querySelectorAll(".nb-w").length};
});

console.log("1 - THE FINDING IS THERE, AND NOTHING CLAIMS IT HAS BEEN ACTED ON");
const r0 = await setup();
const bal = r0.weak.find(x=> x.startsWith("balance:"));
ck("a balance finding is raised", !!bal, r0.weak.join(" | "));
{
  const r = await p.evaluate(()=> ({
    rows: [...document.querySelectorAll(".nb-w")].length,
    tag: !!document.querySelector(".nb-w-did"),
    txt: (document.querySelector(".nb-w .nb-w-s")||{}).innerText || ""
  }));
  ck("it is on the list", r.rows > 0, String(r.rows));
  ck("with no plan-changed tag yet", !r.tag, r.txt);
}

console.log("2 - APPLY A CHANGE TO THAT MUSCLE AND THE ROW SAYS SO");
{
  const r = await p.evaluate(()=>{
    const A = bodyAnalysis();
    const w = (A.weak||[]).find(x=> x.kind === "balance");
    /* exactly what the fix sheet records when it applies: filed under the muscle, with
       the movements it touched */
    logPlanChange("programme", null, MUSCLES[w.muscle].name, ["3 sets added"],
      {note:"Applied from the Body tab.", exs:["Barbell Bench Press"]});
    BODY_OPEN.wpall = true;
    save(); TAB="body"; render();
    const A2 = bodyAnalysis();
    const still = (A2.weak||[]).some(x=> x.kind === "balance" && x.muscle === w.muscle);
    return {muscle: w.muscle, still,
            tag: !!document.querySelector(".nb-w-did"),
            tagTxt: [...document.querySelectorAll(".nb-w-did")].map(x=>x.innerText).join("|"),
            tags: document.querySelectorAll(".nb-w-did").length,
            fixes: planFixesFor(w.muscle, w.kind).length};
  });
  ck("the change is on the record for that muscle", r.fixes === 1, String(r.fixes));
  ck("the finding still stands, because the plan still does not answer it", r.still, String(r.still));
  ck("but the row now says something happened", r.tag, String(r.tag));
  /* No session has been logged since the change, so the honest reason it is still here is
     that nothing has tested it — not that the change fell short. */
  ck("and says it has not been trained yet", /not trained yet/i.test(r.tagTxt), r.tagTxt);
}

console.log("3 - AND THE PANEL BEHIND IT STILL EXPLAINS WHY IT IS STILL THERE");
{
  const r = await p.evaluate(()=>{
    const A = bodyAnalysis();
    const i = (A.weak||[]).findIndex(x=> x.kind === "balance");
    const btn = document.querySelectorAll(".nb-w")[i];
    if(btn) btn.click();
    const t = document.body.innerText;
    return {open: /You have changed the plan|You have already changed the plan/i.test(t),
            why: /still short of this on paper|does not move it until you have trained it|waiting for evidence/i.test(t),
            waiting: /has not been tested yet/i.test(t) && /since you made that\s+change/i.test(t)};
  });
  ck("the panel owns up to it", r.open, String(r.open));
  ck("and says why it has not gone", r.why, String(r.why));
  ck("naming the muscle it is waiting on", r.waiting, String(r.waiting));
}

console.log("4 - A FINDING THE PLAN NOW ANSWERS LEAVES THE LIST ALTOGETHER");
{
  const r = await p.evaluate(()=>{
    hideModal();
    const A = bodyAnalysis();
    const w = (A.weak||[]).find(x=> x.kind === "balance");
    if(!w) return {gone:true, before:0};
    const before = (A.weak||[]).length;
    /* enough pressing that the programme itself clears the ratio floor */
    const wid = ROTATION[0];
    S.program[wid] = (S.program[wid]||[]).concat([
      {name:"Barbell Bench Press", sets:6, reps:"8-12"},
      {name:"Incline Dumbbell Press", sets:6, reps:"8-12"},
      {name:"Cable Fly", sets:6, reps:"12-15"}
    ]);
    BODY_OPEN.wpall = true;
    save(); TAB="body"; render();
    const A2 = bodyAnalysis();
    return {gone: !(A2.weak||[]).some(x=> x.kind === "balance" && x.muscle === w.muscle),
            before};
  });
  ck("it is no longer on the list at all", r.gone, String(r.gone));
}

console.log("4b - TRAIN IT, AND THE REASON CHANGES FROM UNTESTED TO STILL SHORT");
{
  await setup();
  const r = await p.evaluate(()=>{
    const A = bodyAnalysis();
    const w = (A.weak||[]).find(x=> x.kind === "balance");
    logPlanChange("programme", null, MUSCLES[w.muscle].name, ["3 sets added"],
      {note:"Applied from the Body tab.", exs:["Barbell Bench Press"]});
    save(); BODY_OPEN.wpall = true; render();
    const before = [...document.querySelectorAll(".nb-w-did")].map(x=>x.innerText).join("|");
    /* a session that actually trains the muscle the change was about */
    S.sessions.push({id:"after", workoutId: ROTATION[0], startedAt: Date.now() + 1000,
      finishedAt: Date.now() + 2000, date: todayStr(), feel:4,
      entries:[{name:"Barbell Bench Press", reps:"8-12",
        sets:[{weight:"135",reps:"10",rpe:"8",done:true}]}]});
    save(); BODY_OPEN.wpall = true; render();
    const after = [...document.querySelectorAll(".nb-w-did")].map(x=>x.innerText).join("|");
    return {before, after, untested: planFixUntested(w)};
  });
  ck("before any session it reads as untested", /not trained yet/i.test(r.before), r.before);
  ck("after one it does not", !/not trained yet/i.test(r.after) && /plan changed/i.test(r.after), r.after);
  ck("and the check agrees", !r.untested, String(r.untested));
}

console.log("5 - A FINDING PUT DOWN, AND THEN RESOLVED, DOES NOT JUST VANISH");
{
  await setup();
  const r = await p.evaluate(()=>{
    const A = bodyAnalysis();
    /* put two of them down, the way the panel does */
    const picks = (A.weak || []).slice(0, 2);
    picks.forEach(w=> quietMap()[quietKey(w)] = {at: Date.now(), band: w.sev || 1});
    save(); BODY_OPEN.wpall = true; BODY_OPEN.wpquiet = true; render();
    const listed = document.querySelectorAll(".nb-q").length;
    return {keys: picks.map(w=> quietKey(w)), listed,
            settled: quietSettled(bodyAnalysis()).length,
            said: /have settled since you put/i.test(document.body.innerText)};
  });
  ck("both are on the put-down list", r.listed === 2, String(r.listed));
  ck("and none has settled yet", r.settled === 0, String(r.settled));
  ck("so nothing is said about settling", !r.said, String(r.said));

  const r2 = await p.evaluate((keys)=>{
    /* the shortfall that produced one of them is answered by the programme: it stops
       being found at all, which used to take its put-down entry with it, silently */
    const A = bodyAnalysis();
    const w = (A.weak.quiet || [])[0] || (A.weak || [])[0];
    const wid = ROTATION[0];
    S.program[wid] = (S.program[wid] || []).concat([
      {name:"Barbell Bench Press", sets:6, reps:"8-12"},
      {name:"Incline Dumbbell Press", sets:6, reps:"8-12"},
      {name:"Cable Fly", sets:6, reps:"12-15"},
      {name:"Overhead Press", sets:5, reps:"6-10"}
    ]);
    // and drop the pulling that was drowning everything, so those findings go quiet too
    S.sessions.forEach(x=> x.entries.forEach(e=> e.sets = e.sets.slice(0, 1)));
    save(); BODY_OPEN.wpall = true; BODY_OPEN.wpquiet = true; render();
    const set = quietSettled(bodyAnalysis());
    return {n: set.length, names: set.map(x=> x.name).join(","),
            said: /have settled since you put|has settled since you put/i.test(document.body.innerText),
            btn: !!document.querySelector("[data-quietdone]"),
            records: Object.keys(quietMap()).length};
  }, r.keys);
  ck("something settled while it was down", r2.n > 0, JSON.stringify(r2));
  ck("and the tab says so, by name", r2.said, String(r2.said));
  ck("the records are still there until you clear them", r2.records >= r2.n, String(r2.records));
  ck("with one tap to clear", r2.btn, String(r2.btn));

  const r3 = await p.evaluate(()=>{
    document.querySelector("[data-quietdone]").click();
    return {left: quietSettled(bodyAnalysis()).length,
            said: /settled since you put/i.test(document.body.innerText)};
  });
  ck("clearing removes them", r3.left === 0, String(r3.left));
  ck("and the line goes with them", !r3.said, String(r3.said));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
