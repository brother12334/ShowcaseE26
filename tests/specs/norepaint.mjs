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
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.splitId=DEFAULT_SPLIT; applySplit();
  const day=86400000, now=Date.now(); S.sessions=[]; let n=0;
  for(let i=60;i>=1;i--){ if(i%7===0) continue;
    const wid=ROTATION[n%ROTATION.length]; n++;
    S.sessions.push({id:"s"+i, date:new Date(now-i*day).toLocaleDateString("en-CA"),
      workoutId:wid, startedAt:now-i*day, finishedAt:now-i*day+36e5, feel:4,
      entries:planSlotList(wid).slice(0,5).map(e=>({name:e.name, reps:"8",
        sets:[0,1,2].map(k=>({weight:String(120+k*5), reps:"8", rpe:"8", done:true}))}))}); }
  save();
});

/* Everything inside #app that is mid-animation right now, excluding the ones that are
   meant to loop forever (a pulsing dot is not an entrance). */
const moving = ()=> p.evaluate(()=>{
  let n = 0;
  document.querySelectorAll("#app, #app *").forEach(e=>{
    const st = getComputedStyle(e);
    if(st.animationName && st.animationName !== "none" && st.animationIterationCount !== "infinite") n++;
  });
  return n;
});

console.log("1 - ARRIVING ON A TAB IS ANIMATED");
{
  for(const t of ["today","history","body","program"]){
    await p.evaluate(tab=>{ goTab("sync"); if(tab==="body") BODY_OPEN.nbadv = true; goTab(tab); }, t);
    ck(t+": the screen arrives", (await moving()) > 0, String(await moving()));
  }
}

console.log("2 - AND NOTHING REDRAWS ITSELF AFTERWARDS");
{
  for(const t of ["today","history","body","program","sync"]){
    const n = await p.evaluate(tab=>{
      goTab("sync"); goTab(tab); if(tab==="body") BODY_OPEN.nbadv = true;
      render();                                  // an ordinary redraw: a tap, a toggle
      let c = 0;
      document.querySelectorAll("#app, #app *").forEach(e=>{
        const st = getComputedStyle(e);
        if(st.animationName && st.animationName !== "none" && st.animationIterationCount !== "infinite") c++;
      });
      return c;
    }, t);
    ck(t+": nothing is still arriving", n === 0, String(n));
  }
}

console.log("3 - STEPPING THE MUSCLE MAP DOES NOT REBUILD THE PAGE");
{
  const r = await p.evaluate(()=>{
    goTab("body"); BODY_OPEN.nbadv = true; render();
    const before = BODY_METRIC;
    const btn = document.querySelector('[data-metricstep="1"]');
    if(!btn) return {err:"no stepper"};
    btn.click();
    /* The words naming the view are MEANT to move \u2014 that is the step. What must not
       move is the rest of the tab. */
    let c = 0, swap = 0;
    document.querySelectorAll("#app, #app *").forEach(e=>{
      const st = getComputedStyle(e);
      if(!st.animationName || st.animationName === "none" || st.animationIterationCount === "infinite") return;
      if(st.animationName === "msSwap"){ swap++; return; }
      c++;
    });
    return {before, after: BODY_METRIC, moving: c, swap};
  });
  ck("the view actually changes", r.after && r.after !== r.before, JSON.stringify(r));
  ck("its name comes in from the side", r.swap > 0, JSON.stringify(r));
  ck("and nothing else re-arrives", r.moving === 0, JSON.stringify(r));
}

console.log("3b - NOR DOES IT WITH EVERY DISCLOSURE ON THE TAB OPEN");
{
  /* .nb-why carried its own unconditional entrance and replayed on every render while it
     was open \u2014 invisible to a sweep that never opened it. So: open everything, then
     redraw, and nothing at all should be moving. */
  const r = await p.evaluate(()=>{
    goTab("body");
    document.querySelectorAll("#app [data-sec]").forEach(b=> b.click());
    document.querySelectorAll("#app [data-sec]").forEach(b=>{
      if(!BODY_OPEN[b.dataset.sec]) b.click();       // the ones a first pass closed
    });
    render();
    const live = [];
    document.querySelectorAll("#app, #app *").forEach(e=>{
      const st = getComputedStyle(e);
      if(st.animationName && st.animationName !== "none" && st.animationIterationCount !== "infinite")
        live.push(st.animationName);
    });
    return {open: Object.keys(BODY_OPEN).filter(k=> BODY_OPEN[k]).length, live};
  });
  ck("something was actually opened", r.open > 0, JSON.stringify(r.open));
  ck("and still nothing is arriving", r.live.length === 0, r.live.join(","));
}

console.log("4 - THE APP HAS ONE ENTRANCE, NOT TWO");
{
  const r = await p.evaluate(()=>{
    goTab("sync"); goTab("today");
    const kid = document.querySelector("#app.view-in > .card");
    return kid ? getComputedStyle(kid).animationName : "none";
  });
  ck("a card uses the staggered arrival, not the old half-second slide",
     r === "viewIn", r);
}

console.log("5 - AND THE FIRST SCREEN OF THE SESSION ARRIVES TOO");
{
  const src = await (await import('node:fs/promises')).readFile(appFile('index.html'),'utf8');
  ck("the splash hands over to the arrival", /sp\.classList\.add\("bye"\);[\s\S]{0,400}replayViewIn\(\)/.test(src), "not wired");
}

console.log(errs.length?("PAGE ERRORS: "+errs.join(" | ")):"no page errors");
if(errs.length) bad++;
console.log(bad?("BROKEN: "+bad):"all good");
await b.close();
