import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:844}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});

/* `climb` is lb added per day across the whole log; `missRecent` thins only the last
   three weeks, which is the window the card compares against the three before it. */
const run = (missRecent, climb, drop)=> p.evaluate(({missRecent, climb, drop})=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.splitId=DEFAULT_SPLIT; applySplit();
  const day=86400000, now=Date.now(); S.sessions=[]; let n=0;
  for(let i=84;i>=1;i--){
    if(i%7===0) continue;
    if(i <= 21 && missRecent > 1 && (i % missRecent === 0)) continue;
    const wid=ROTATION[n%ROTATION.length]; n++;
    const ents=planSlotList(wid).slice(0,6);
    /* `best` is the top lift IN the window, so a decline only shows if the whole recent
       block sits below the one before it \u2014 which is what a real regression looks like. */
    const base = i <= 21 ? (100 + (84-21)*climb - drop) : (100 + (84-i)*climb);
    S.sessions.push({id:"s"+i, date:new Date(now-i*day).toLocaleDateString("en-CA"),
      workoutId:wid, startedAt:now-i*day, finishedAt:now-i*day+3600000, feel:4,
      entries:ents.map(e=>({ name:e.name, reps:"8",
        sets:[0,1,2].map(k=>({weight:String(Math.round(base + k*5)), reps:"8", rpe:"8", done:true}))}))});
  }
  save();
  const A = bodyAnalysis();
  let back=0, hold=0, grow=0, none=0, lighter=0; const ex=[];
  MKEYS.forEach(m=>{ const g=A.grow[m];
    if(g.score==null){ none++; return; }
    if(g.lighter) lighter++;
    if(g.score<45){ back++; if(ex.length<3) ex.push(m+" str"+Math.round((g.strP||0)*100)+"%"); }
    else if(g.score<65) hold++; else grow++; });
  return {back, hold, grow, none, lighter, ex};
}, {missRecent, climb, drop});

console.log("1 - TRAINING LESS IS NOT GETTING WEAKER");
{
  const r = await run(3, 0.45, 0);
  ck("a session in three missed, lifts up: nothing reads as backwards", r.back === 0, JSON.stringify(r));
  ck("and it says so rather than saying nothing", r.lighter > 0, JSON.stringify(r));
  const r2 = await run(2, 0.45, 0);
  ck("half the sessions missed: still not backwards", r2.back === 0, JSON.stringify(r2));
}

console.log("2 - BUT STRENGTH FALLING STILL TURNS RED");
{
  /* every session done, and the weight on the bar coming down through the last block */
  const r = await run(1, 0.45, 25);
  ck("a real decline is caught", r.back >= 12, JSON.stringify(r));
  const excused = await p.evaluate(()=>{
    const A = bodyAnalysis();
    return MKEYS.filter(m=> A.grow[m] && A.grow[m].score != null && A.grow[m].score < 45
                            && /less work/.test(muscleMetric(A, m, "growth").note));
  });
  ck("and nothing red is excused as trained-less", excused.length === 0, excused.join(","));
}

console.log("3 - AND FALLING WHILE TRAINING LESS IS STILL FALLING");
{
  const r = await run(3, 0.45, 25);
  ck("a missed session does not excuse it", r.back >= 12, JSON.stringify(r));
}

console.log("4 - HONEST PROGRESS STILL READS AS PROGRESS");
{
  const r = await run(1, 0.45, -25);          // the recent block is the strongest one
  ck("lifts climbing, every session done", r.grow >= 12 && r.back === 0, JSON.stringify(r));
  const f = await run(1, 0, 0);
  ck("and flat is holding, not backwards", f.back === 0 && f.hold >= 12, JSON.stringify(f));
}

console.log("5 - THE MAP SAYS WHICH IT MEANS");
{
  await run(3, 0.45, 0);                      // back to a block that was simply lighter
  const t = await p.evaluate(()=>{
    const A = bodyAnalysis();
    const m = MKEYS.find(k=> A.grow[k] && A.grow[k].lighter);
    return m ? muscleMetric(A, m, "growth").note : "none";
  });
  console.log("     " + t);
  ck("a lighter block is named as one", /less work/.test(t), t);
}

console.log(errs.length?("PAGE ERRORS: "+errs.join(" | ")):"no page errors");
if(errs.length) bad++;
console.log(bad?("BROKEN: "+bad):"all good");
await b.close();
