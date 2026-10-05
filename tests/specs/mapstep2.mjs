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
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.splitId=DEFAULT_SPLIT; applySplit();
  const day=86400000, now=Date.now(); S.sessions=[]; let n=0;
  for(let i=45;i>=1;i--){ if(i%7===0) continue;
    const wid=ROTATION[n%ROTATION.length]; n++;
    S.sessions.push({id:"s"+i, date:new Date(now-i*day).toLocaleDateString("en-CA"),
      workoutId:wid, startedAt:now-i*day, finishedAt:now-i*day+36e5, feel:4,
      entries:planSlotList(wid).slice(0,5).map(e=>({name:e.name, reps:"8",
        sets:[0,1,2].map(k=>({weight:String(120+k*5+(45-i)), reps:"8", rpe:"8", done:true}))}))}); }
  save(); goTab("body"); BODY_OPEN.nbadv = true; render();
});

const shot = ()=> p.evaluate(()=>{
  const fig = document.querySelector(".bm-figs");
  const gs = [...fig.querySelectorAll("g.bm-m")];
  return {metric: BODY_METRIC,
          label: (document.querySelector(".ms-mid b")||{}).textContent || "",
          fills: gs.map(g=> g.getAttribute("fill")).join(","),
          ids: gs.map(g=> g.dataset.g || g.dataset.m).join(","),
          nodes: gs.length,
          swapping: !!document.querySelector(".ms-swap"),
          /* which dot is lit, not merely that one is: joining the class names gives "on"
             either way and would pass however the dots moved */
          dots: [...document.querySelectorAll(".ms-dots i")].findIndex(i=> i.classList.contains("on"))
                + "/" + document.querySelectorAll(".ms-dots i").length};
});
const step = (dir)=> p.evaluate(d=>{
  document.querySelector('[data-metricstep="'+d+'"]').click();
}, dir);

console.log("1 - THE SHAPES SURVIVE THE STEP, SO THE COLOUR CAN MOVE");
{
  const a = await shot();
  await step(1);
  const c = await shot();
  ck("the view changed", c.metric !== a.metric, a.metric+" -> "+c.metric);
  ck("and its name with it", c.label && c.label !== a.label, a.label+" -> "+c.label);
  ck("the same shapes are still there", c.ids === a.ids && c.nodes === a.nodes,
     a.nodes+" vs "+c.nodes);
  ck("wearing different colours", c.fills !== a.fills, "identical");
  ck("the dots follow", c.dots !== a.dots, c.dots);
}

console.log("2 - AND THE COLOUR IS TRANSITIONED, NOT SNAPPED");
{
  const t = await p.evaluate(()=>{
    const g = document.querySelector(".bm-figs g.bm-m");
    const st = getComputedStyle(g);
    return {prop: st.transitionProperty, dur: st.transitionDuration};
  });
  ck("fill is on a transition", /fill/.test(t.prop), t.prop);
  ck("so is the glow it carries", /filter/.test(t.prop), t.prop);
  ck("over a beat you can see", parseFloat(t.dur) >= 0.3, t.dur);
}

console.log("3 - THE WORDS COME IN FROM THE SIDE THE ARROW POINTED");
{
  await step(1);
  const r = await p.evaluate(()=>({
    swap: !!document.querySelector(".ms-mid.ms-swap"),
    mx: document.querySelector(".nb-map").style.getPropertyValue("--mx").trim()
  }));
  ck("forwards arrives from the right", r.swap && r.mx === "16px", JSON.stringify(r));
  await step(-1);
  const l = await p.evaluate(()=> document.querySelector(".nb-map").style.getPropertyValue("--mx").trim());
  ck("and backwards from the left", l === "-16px", l);
}

console.log("4 - THE PAGE AROUND IT IS LEFT ALONE");
{
  const r = await p.evaluate(()=>{
    window.scrollTo(0, 400);
    const y = window.pageYOffset;
    const hero = document.querySelector(".nb-hero");
    document.querySelector('[data-metricstep="1"]').click();
    let moving = 0;
    document.querySelectorAll("#app *").forEach(e=>{
      const st = getComputedStyle(e);
      if(st.animationName && st.animationName !== "none" && st.animationIterationCount !== "infinite"
         && !e.classList.contains("ms-swap") && !e.closest(".ms-swap")) moving++;
    });
    return {kept: window.pageYOffset === y, sameHero: hero === document.querySelector(".nb-hero"), moving};
  });
  ck("your place on the page is kept", r.kept, String(r.kept));
  ck("the cards above are not rebuilt", r.sameHero, String(r.sameHero));
  ck("and nothing else re-arrives", r.moving === 0, String(r.moving));
}

console.log("5 - IT STILL WORKS WHEN A MUSCLE IS SELECTED");
{
  const r = await p.evaluate(()=>{
    BODY_FOCUS = "chest"; render();
    const before = (document.querySelector(".ms-sel-t span")||{}).textContent || "";
    document.querySelector('[data-metricstep="1"]').click();
    const after = (document.querySelector(".ms-sel-t span")||{}).textContent || "";
    return {before, after, still: !!document.querySelector('.bm-m.bm-sel[data-g="chest"]')};
  });
  ck("the selection survives", r.still, String(r.still));
  ck("and its reading is renamed for the new view", r.after !== r.before, r.before+" -> "+r.after);
}

console.log("6 - AND IT FALLS BACK RATHER THAN BREAKING");
{
  const r = await p.evaluate(()=>{
    goTab("today");                       // the card is not on screen at all
    return repaintMuscleMap(1);
  });
  ck("no card, no repaint", r === false, String(r));
  const r2 = await p.evaluate(()=>{
    goTab("body"); BODY_OPEN.nbadv = false; render();   // the simple view has no stepper
    return repaintMuscleMap(1);
  });
  ck("simple view, no repaint", r2 === false, String(r2));
}

console.log("7 - EVERY VIEW IS REACHABLE AND NAMES ITSELF");
{
  const names = await p.evaluate(()=>{
    BODY_OPEN.nbadv = true; render();
    const seen = [];
    for(let i=0;i<METRICS.length;i++){
      seen.push(BODY_METRIC + ":" + (document.querySelector(".ms-mid b")||{}).textContent);
      document.querySelector('[data-metricstep="1"]').click();
    }
    return seen;
  });
  ck("all five, each with a name", names.length === 5 && names.every(n=> n.split(":")[1]),
     names.join(" | "));
  console.log("     " + names.join(" | "));
}

console.log("8 - A SECTION OPENS LIKE A SECTION, AND ALONE");
{
  const r = await p.evaluate(()=>{
    goTab("body"); BODY_OPEN = {}; render();
    const btn = document.querySelector('#app [data-sec="nbwhy"]');
    if(!btn) return {err:"no toggle"};
    btn.click();
    const box = document.querySelector('#app [data-sec="nbwhy"]').nextElementSibling;
    return {opened: document.querySelectorAll("#app .sec-open").length,
            anim: box ? getComputedStyle(box).animationName : "none",
            isWhy: !!(box && box.classList.contains("nb-why"))};
  });
  ck("the block under the button unfolds", r.isWhy && r.opened === 1, JSON.stringify(r));
  ck("with an animation of its own", r.anim === "secOpen", JSON.stringify(r));
}

console.log("8b - CLOSING IS NOT AN OPENING, AND THE MARK IS SPENT");
{
  const r = await p.evaluate(()=>{
    document.querySelector('#app [data-sec="nbwhy"]').click();      // closed again
    const afterClose = document.querySelectorAll("#app .sec-open").length;
    document.querySelector('#app [data-sec="nbwhy"]').click();      // open once more
    render();                                                       // any later redraw
    return {afterClose, afterRender: document.querySelectorAll("#app .sec-open").length};
  });
  ck("closing animates nothing", r.afterClose === 0, JSON.stringify(r));
  ck("and a later redraw does not re-unfold it", r.afterRender === 0, JSON.stringify(r));
}

console.log(errs.length?("PAGE ERRORS: "+errs.join(" | ")):"no page errors");
if(errs.length) bad++;
console.log(bad?("BROKEN: "+bad):"all good");
await b.close();
