import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
const boot = ()=> p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open','spec-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  try{ closeSpecPage(false); }catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.splitId=DEFAULT_SPLIT; applySplit();
  S.spec=null; S.specPast=[]; S.deload=null; S.specDraft=null;
  S.joint={}; S.jointOk={}; S.hurts=[]; S.lmCalObs={}; BODY_OPEN={};
  const day=86400000, now=Date.now(); S.sessions=[]; let n=0;
  for(let i=84;i>=1;i--){ if(i%4===0) continue;
    const wid=ROTATION[n%ROTATION.length]; n++;
    const ents=(planSlotList(wid)||[]).slice(0,5); if(!ents.length) continue;
    S.sessions.push({id:"s"+i, date:new Date(now-i*day).toLocaleDateString("en-CA"),
      workoutId:wid, startedAt:now-i*day, finishedAt:now-i*day+36e5, feel:4,
      entries:ents.map(e=>({name:e.name, reps:"8",
        sets:[0,1,2].map(k=>({weight:String(120+k*5), reps:"8", rpe:"8", done:true}))}))}); }
  S.cycleStart = now - 2*day; save(); goTab("body"); render();
});
await boot();

console.log("1 - STARTING A BLOCK DOES NOT TOUCH YOUR PROGRAM");
{
  const r = await p.evaluate(()=>{
    const before = JSON.stringify(S.program);
    const A = bodyAnalysis();
    specStart(specPlan(["chest"], A, {setting:"FOCUS"}));
    hideModal();
    return {same: JSON.stringify(S.program) === before, live: !!specActive()};
  });
  ck("the block is running", r.live, String(r.live));
  ck("and not a single set of your program was rewritten", r.same, String(r.same));
}

console.log("2 - CALLED OFF BEFORE IT RAN, IT COSTS NOTHING");
{
  const r = await p.evaluate(()=>{
    const obsBefore = JSON.stringify(S.lmCalObs || {});
    specEnd("you ended it");
    return {live: !!specActive(), deload: !!S.deload,
            cooldown: specCooldownLeft("chest"),
            obsSame: JSON.stringify(S.lmCalObs || {}) === obsBefore,
            past: (S.specPast||[]).length,
            ran: (S.specPast||[]).slice(-1)[0].ran,
            why: (S.specPast||[]).slice(-1)[0].why};
  });
  ck("the block is over", !r.live, String(r.live));
  ck("no deload is forced on you", !r.deload, String(r.deload));
  ck("no six-week lockout", r.cooldown === 0, String(r.cooldown));
  ck("nothing is learned from a block that did not run", r.obsSame, String(r.obsSame));
  ck("but it is still recorded, honestly", r.past === 1 && r.ran === false, JSON.stringify(r));
  ck("and says what happened", /called off before it ran/.test(r.why), r.why);
}

console.log("3 - SO YOU CAN START ANOTHER ONE STRAIGHT AWAY");
{
  const r = await p.evaluate(()=>{
    const el = specEligibility("chest", bodyAnalysis());
    return {ok: el.ok, miss: el.miss.map(x=> x.k)};
  });
  ck("the same muscle is available again at once", r.ok, r.miss.join(","));
}

console.log("4 - BUT A BLOCK THAT RAN COSTS WHAT IT SHOULD");
{
  const r = await p.evaluate(()=>{
    S.specPast = []; S.deload = null; S.lmCalObs = {};
    const A = bodyAnalysis();
    specStart(specPlan(["chest"], A, {setting:"FOCUS"}));
    hideModal();
    const st = S.spec.per.chest;
    /* one closed cycle, decided on */
    S.spec.cyclesDone = 1;
    st.history.push({at: Date.now(), V: st.start, k:"up", trendPct: 2,
                     sore: 0, to: st.start + 2, why:"still climbing"});
    st.lastRespondV = st.start;
    const ran = specRan(S.spec);
    specEnd("you ended it");
    return {ran, deload: !!S.deload, share: S.deload && S.deload.share,
            cooldown: specCooldownLeft("chest"),
            learned: Object.keys(S.lmCalObs || {}).length > 0,
            why: (S.specPast||[]).slice(-1)[0].why};
  });
  ck("it counts as having run", r.ran, String(r.ran));
  ck("a lighter cycle follows", r.deload && r.share === 0.5, JSON.stringify(r));
  ck("the muscle waits six weeks", r.cooldown === 6, String(r.cooldown));
  ck("and what it showed is kept", r.learned, String(r.learned));
  ck("recorded as your own decision", /you ended it/.test(r.why), r.why);
}

console.log("5 - AND THE CONFIRMATION SAYS WHICH OF THE TWO IT IS");
{
  const a = await p.evaluate(()=>{
    S.specPast = []; S.deload = null;
    specStart(specPlan(["chest"], bodyAnalysis(), {setting:"FOCUS"}));
    hideModal();
    specConfirmStop();
    const t = document.querySelector("#modal").innerText;
    hideModal();
    return t;
  });
  ck("before it has run, it says this costs nothing", /costs nothing/i.test(a), a.slice(0,220));
  const z = await p.evaluate(()=>{
    S.spec.cyclesDone = 2;
    specConfirmStop();
    const t = document.querySelector("#modal").innerText;
    hideModal();
    return t;
  });
  ck("once it has, it names the lighter cycle and the wait",
     /lighter cycle/i.test(z) && /6 weeks/.test(z), z.slice(0,260));
  await p.evaluate(()=>{ S.spec = null; save(); render(); });
}

console.log("6 - WHAT YOU ADDED TO THE PROGRAM IS YOURS, AND STAYS");
{
  const r = await p.evaluate(()=>{
    const wid = ROTATION[0];
    const before = (S.program[wid]||[]).length;
    specAddToDay(wid, "Cable Fly", 3);
    const added = (S.program[wid]||[]).length;
    S.specPast = []; S.deload = null;
    specStart(specPlan(["chest"], bodyAnalysis(), {setting:"FOCUS"}));
    hideModal(); specEnd("you ended it");
    return {before, added, after: (S.program[wid]||[]).length};
  });
  ck("adding it put it there", r.added === r.before + 1, JSON.stringify(r));
  ck("and ending the block does not take it away again", r.after === r.added, JSON.stringify(r));
}

console.log(errs.length?("PAGE ERRORS: "+errs.join(" | ")):"no page errors");
if(errs.length) bad++;
console.log(bad?("BROKEN: "+bad):"all good");
await b.close();
