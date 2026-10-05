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

/* Mid-cycle: four days into an eight-day rotation, chest trained twice at a productive
   rate. This is the state that painted the whole body red. */
const r = await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.priorTrainingWeeks=100; S.priorAsked=1;
  S.splitId=DEFAULT_SPLIT; applySplit();
  const DAY=86400e3, now=Date.now();
  S.cycleStart = now - 4*DAY;
  S.cycleDone = [0,1];                       // part-way through
  S.sessions = [3,1].map((k,i)=>({id:"s"+i, workoutId:ROTATION[i],
    date:new Date(now-k*DAY).toLocaleDateString("en-CA"),
    startedAt:now-k*DAY, finishedAt:now-k*DAY+3600e3, feel:4,
    entries:[{name:"Barbell Bench Press", sets:Array.from({length:6},()=>
      ({weight:185, reps:9, rpe:8, done:true}))}]}));
  save(); TAB="body"; BODY_FOCUS=null; render();
  const A = bodyAnalysis();
  const colours = MKEYS.map(m=> ({m, k:(A.state[m]||{}).k, band:(A.state[m]||{}).band,
                                  c: muscleMetric(A, m, "volume").color}));
  const chest = colours.find(x=> x.m==="chest") || {};
  return {mid: A.midCycle, chest, states:[...new Set(colours.map(x=>x.k))],
          reds: colours.filter(x=> x.c==="#d1584f").length, n: colours.length,
          bad: C_BAD, ok: C_OK, none: C_NONE,
          proj: (A.state.chest||{}).txt};
});
console.log("     states on the map: " + r.states.join(", "));
console.log("     chest: " + r.chest.k + (r.chest.band ? " → " + r.chest.band : "") + "  colour " + r.chest.c);
console.log("     " + r.proj);

console.log("1 - MID-CYCLE, THE MAP IS NOT ONE BIG WARNING");
ck("the analysis really is mid-cycle", r.mid, String(r.mid));
ck("chest is a projection", r.chest.k==="proj", r.chest.k);
ck("and it is not painted as over its limit", r.chest.c !== r.bad, r.chest.c);
ck("the projection's own band decides the colour",
   r.chest.c === (r.chest.band==="optimal" ? r.ok : r.chest.c), r.chest.band+"/"+r.chest.c);
ck("and the whole body is not red", r.reds < r.n, r.reds+" of "+r.n);

console.log("2 - A MUSCLE WITH NOTHING LOGGED IS NOT 'TOO MUCH' EITHER");
{
  const r2 = await p.evaluate(()=>{
    const A = bodyAnalysis();
    const untouched = MKEYS.filter(m=> (A.state[m]||{}).k === "none" || (A.state[m]||{}).k === "queued");
    return untouched.map(m=> ({m, k:A.state[m].k, c: muscleMetric(A, m, "volume").color}))
                    .filter(x=> x.c === C_BAD);
  });
  ck("none of them are red", r2.length===0, JSON.stringify(r2).slice(0,120));
}

console.log("3 - THE KEY SAYS WHAT THE BANDS ARE, AND THAT THIS IS A PROJECTION");
{
  const r3 = await p.evaluate(()=>{
    BODY_OPEN.nbadv = true; BODY_METRIC = "volume"; render();
    const t = document.body.innerText;
    return {key: /maintenance/.test(t) && /productive/.test(t) && /above your limit/.test(t),
            old: /too little|just right|too much/.test(t),
            proj: /where each muscle is heading/.test(t)};
  });
  ck("the key uses the same words as the verdicts", r3.key, String(r3.key));
  ck("and not the old mark-out-of-four", !r3.old, String(r3.old));
  ck("with one line saying these are projections", r3.proj, String(r3.proj));
}

console.log("4 - A FINISHED CYCLE IS A VERDICT AGAIN, NOT A PROJECTION");
{
  const r4 = await p.evaluate(()=>{
    S.cycleDone = ROTATION.map((_,i)=>i); save(); render();
    const A = bodyAnalysis();
    return {mid: A.midCycle, k: (A.state.chest||{}).k,
            c: muscleMetric(A, "chest", "volume").color,
            proj: /where each muscle is heading/.test(document.body.innerText)};
  });
  ck("no longer mid-cycle", !r4.mid, String(r4.mid));
  ck("chest is judged outright", r4.k !== "proj", r4.k);
  ck("and the projection line is gone", !r4.proj, String(r4.proj));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
