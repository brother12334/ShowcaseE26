import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1100}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

/* Six weeks of steady lat work at the same loads, then a deload week done exactly as
   prescribed, then two normal sessions back at the old loads. Nothing has stalled — but
   the deload's light week sits inside the recent half of the progress comparison. */
const build = (opts)=> p.evaluate((o)=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.priorTrainingWeeks=100; S.priorAsked=1;
  S.splitId=DEFAULT_SPLIT; applySplit();
  const DAY=86400e3, now=Date.now();
  S.cycleStart = now - 6*DAY; S.cycleDone = ROTATION.map((_,i)=>i);
  const wid = ROTATION[0];
  S.program[wid]=[{name:"Lat Pulldown", sets:4, reps:"8-12", weight:120}];
  const sets = (n, w, r, rpe)=> Array.from({length:n},()=>({weight:String(w),reps:String(r),rpe:String(rpe),done:true}));
  const mk = (dAgo, ent)=> ({id:"s"+dAgo, workoutId:wid,
    date:new Date(now-dAgo*DAY).toLocaleDateString("en-CA"),
    startedAt:now-dAgo*DAY, finishedAt:now-dAgo*DAY+3600e3, feel:4, entries:ent});
  S.sessions=[];
  // the block before: four sessions at 120
  [40,36,32,28].forEach(d=> S.sessions.push(mk(d, [{name:"Lat Pulldown", sets:sets(4,120,10,8)}])));
  // this block: two sessions at 120, then the deload, then what the options say
  [20,16].forEach(d=> S.sessions.push(mk(d, [{name:"Lat Pulldown", sets:sets(4,120,10,8)}])));
  const delStart = now - 12*DAY, delEnd = delStart + 8*DAY;
  [11,9].forEach(d=> S.sessions.push(mk(d, [{name:"Lat Pulldown", sets:sets(2,120,6,6)}])));   // the deload week
  /* `o.load` lets a test make the sessions AFTER the deload genuinely worse, which is
     the only way this rule should ever speak in that window. */
  (o.after || []).forEach(d=> S.sessions.push(mk(d, [{name:"Lat Pulldown", sets:sets(4, o.load || 120, 10, 8)}])));
  S.deload = {startedAt:delStart, endedAt:delEnd, reason:"manual", ranOut:true};
  save();
  const A = bodyAnalysis();
  const w = (A.weak||[]).find(x=> x.muscle==="lats" && x.kind==="stall");
  return {grow: A.grow.lats && Math.round(A.grow.lats.score),
          strP: A.grow.lats && Math.round((A.grow.lats.strP||0)*100),
          stall: !!w, act: w && w.act, detail: w && w.detail,
          shadow: !!deloadEndedRecently()};
}, opts);

console.log("1 - THE WEEK AFTER A DELOAD IS NOT A STALL");
{
  const r = await build({after:[3]});          // one session since the deload
  console.log("     progress " + r.grow + ", strength " + r.strP + "%");
  ck("the app knows a deload just finished", r.shadow, String(r.shadow));
  ck("and it does not call a stall yet", !r.stall, String(r.stall));
}

console.log("2 - THE DELOAD'S OWN SESSIONS ARE LEFT OUT OF THE PROGRESS READ");
{
  const r = await p.evaluate(()=>{
    const now = Date.now(), W = 21*86400e3;
    const withAll  = windowStats(now - W, now + 1);
    const without  = windowStats(now - W, now + 1, {skipDeload:true});
    return {all: r1(withAll.lats.sets), less: r1(without.lats.sets)};
  });
  console.log("     lats sets in the last 3 weeks: " + r.all + " counted, " + r.less + " after the deload is set aside");
  ck("the deload's sets are counted for volume", r.all > r.less, r.all+" vs "+r.less);
  ck("and left out of the comparison", r.less < r.all, String(r.less));
}

console.log("3 - IF IT DOES SPEAK, IT DOES NOT PRESCRIBE THE WEEK YOU JUST TOOK");
{
  /* The rule needs a muscle over its floor with a falling trend and two sessions on the
     far side of the deload \u2014 handed to weakPoints() directly, since that combination is
     what the branch is for. */
  await build({after:[5,2]});          // two sessions on the far side of the deload
  const r = await p.evaluate(()=>{
    const mk = (shadow)=>{
      S.deload = shadow
        ? {startedAt: Date.now()-14*86400e3, endedAt: Date.now()-6*86400e3, reason:"manual"}
        : {startedAt: Date.now()-60*86400e3, endedAt: Date.now()-52*86400e3, reason:"manual"};
      const A = bodyAnalysis();
      A.grow.lats = {score: 20, strP: -0.08, volP: 0, bestNow: 110, bestPrev: 120};
      A.wk.lats = Object.assign({}, A.wk.lats, {sets: 40, eff: 40});
      const w = (weakPoints(A) || []).find(x=> x.muscle==="lats" && x.kind==="stall");
      return w ? {act:w.act, detail:w.detail} : null;
    };
    const fresh = mk(true), old = mk(false);
    return {fresh, old};
  });
  ck("well clear of a deload it still says take a lighter week",
     /lighter week/.test((r.old||{}).act||""), (r.old||{}).act);
  ck("in the shadow of one it does not", r.fresh && !/lighter week/.test(r.fresh.act||""),
     (r.fresh||{}).act);
  ck("and it says why", /You have just had one/.test((r.fresh||{}).detail||""),
     ((r.fresh||{}).detail||"").slice(-140));
  console.log("     " + ((r.fresh||{}).act||""));
  console.log("     " + ((r.fresh||{}).detail||"").slice(-150));
}

console.log("4 - WELL CLEAR OF A DELOAD, THE ORIGINAL ADVICE IS BACK");
{
  const r = await p.evaluate(()=>{
    S.deload = {startedAt: Date.now()-38*86400e3, endedAt: Date.now()-30*86400e3, reason:"manual"};
    save();
    return {shadow: !!deloadEndedRecently()};
  });
  ck("the shadow has passed", !r.shadow, String(r.shadow));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
