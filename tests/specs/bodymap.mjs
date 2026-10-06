/* C - THE FIGURE IS THE PAGE.

   The first check in here is the one that matters most, and it is not a design question:
   every colour on the map came off a ramp that was handed CSS variables, so hex2rgb
   parsed "va" as hexadecimal and every muscle was filled "#NaNNaNNaN" - which paints
   black. The signature asset of this product was a black silhouette. */
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
    {name:"Barbell Bench Press", sets:4, reps:"5-8", rpes:[7,8,8,9], weight:185},
    {name:"Barbell Back Squat",  sets:4, reps:"5-8", rpes:[7,8,8,9], weight:245},
    {name:"Lat Pulldown",        sets:3, reps:"8-12", rpes:[7,8,9]}]; });
  S.sessions=[];
  for(let i=14;i>=1;i--){
    const at = now - i*2*DAY;
    S.sessions.push({id:"s"+i, workoutId: DAYS[i % DAYS.length], date:d(at),
      startedAt:at, finishedAt:at+3600e3, feel:4,
      entries:(S.program[DAYS[0]]||[]).map(e=>({name:e.name,
        sets:Array.from({length:e.sets},()=>({weight:String(e.weight||100),reps:"8",rpe:"8",done:true}))}))});
  }
  save(); TAB="body"; render(); window.scrollTo(0,0);
});
await p.waitForTimeout(400);

console.log("1 - EVERY MUSCLE HAS A COLOUR, AND IT IS NOT #NaNNaNNaN");
{
  const r = await ev(()=>{
    const g = Array.from(document.querySelectorAll("#app .bm-m"));
    const fills = g.map(x=> x.getAttribute("fill"));
    return {n: g.length, nan: fills.filter(f=> !f || /NaN/.test(f)).length,
      bad: fills.filter(f=> f && !/^#[0-9a-f]{6}$/i.test(f) && f.indexOf("var(") < 0),
      sample: fills.slice(0, 5)};
  });
  ck("the figure has muscles on it", r.n > 20, String(r.n));
  ck("NONE OF THEM IS NaN", r.nan === 0, r.nan + " of " + r.n + " :: " + JSON.stringify(r.sample));
  ck("and every fill is a colour a browser can paint", r.bad.length === 0,
     JSON.stringify(r.bad.slice(0, 4)));
}
{
  /* The root cause, checked at the source: a ramp between two colours has to be given
     numbers, not the names of numbers. */
  const r = await ev(()=> ({
    ok: C_OK, warn: C_WARN, bad: C_BAD, flat: C_FLAT,
    mid: ramp([[0,C_OK],[.5,C_WARN],[1,C_BAD]], 0.5),
    lo: ramp([[0,C_OK],[.5,C_WARN],[1,C_BAD]], 0)
  }));
  ck("the ramp colours are hex", /^#[0-9a-f]{6}$/i.test(r.ok) && /^#[0-9a-f]{6}$/i.test(r.bad),
     r.ok + " " + r.bad);
  ck("so a ramp returns a colour", /^#[0-9a-f]{6}$/i.test(r.mid), r.mid);
  ck("at both ends of it", /^#[0-9a-f]{6}$/i.test(r.lo), r.lo);
}

console.log("2 - THE FIGURE IS ABOVE THE NUMBERS, NOT UNDER THEM");
{
  const r = await ev(()=>{
    const app = document.getElementById("app");
    const svg = app.querySelector(".bm-fig svg");
    const tiles = app.querySelector(".nb-tiles");
    const top = el=> el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : -1;
    return {fig: top(svg), tiles: top(tiles), total: Math.round(app.scrollHeight),
      w: svg ? Math.round(svg.getBoundingClientRect().width) : 0,
      order: BODY_SECTIONS.slice(0, 3)};
  });
  ck("the map comes before the tiles", r.fig < r.tiles, r.fig + " vs " + r.tiles);
  ck("and it is in the first screen", r.fig < 844, String(r.fig));
  ck("the order says so too", r.order.join(",") === "verdict,map,tiles", r.order.join(","));
  ck("the figure is wider than half a phone", r.w >= 150, String(r.w));
}

console.log("3 - ALL FIVE VIEWS ARE ON THE SCREEN");
{
  const r = await ev(()=>{
    const btns = Array.from(document.querySelectorAll("[data-metricpick]"));
    const box = document.querySelector(".nb-metric");
    const bb = box ? box.getBoundingClientRect() : null;
    return {n: btns.length, ids: btns.map(x=> x.dataset.metricpick),
      on: btns.filter(x=> x.classList.contains("on")).map(x=> x.dataset.metricpick),
      fits: btns.every(x=>{ const r2 = x.getBoundingClientRect();
        return bb && r2.left >= bb.left - 1 && r2.right <= bb.right + 1; }),
      labels: btns.map(x=> x.textContent.trim()),
      adv: !!BODY_OPEN.nbadv};
  });
  ck("there are five of them", r.n === 5, String(r.n));
  ck("and they are the five metrics",
     r.ids.join(",") === "fatigue,volume,recovery,growth,injury", r.ids.join(","));
  ck("NONE OF THEM IS OFF THE EDGE", r.fits === true, JSON.stringify(r.labels));
  ck("one is selected", r.on.length === 1, JSON.stringify(r.on));
  ck("and none of this is behind Advanced", r.adv === false, String(r.adv));
}
{
  const r = await ev(async ()=>{
    const before = BODY_METRIC;
    const fills0 = Array.from(document.querySelectorAll("#app .bm-m")).map(x=> x.getAttribute("fill")).join("");
    document.querySelector('[data-metricpick="volume"]').click();
    await new Promise(r2=> setTimeout(r2, 500));
    const fills1 = Array.from(document.querySelectorAll("#app .bm-m")).map(x=> x.getAttribute("fill")).join("");
    return {before, after: BODY_METRIC, changed: fills0 !== fills1,
      on: (document.querySelector("[data-metricpick].on") || {}).dataset,
      say: (document.querySelector(".nb-map .nb-map-say") || {}).textContent || "",
      nan: /NaN/.test(fills1)};
  });
  ck("picking a view changes the view", r.after === "volume", r.before + " -> " + r.after);
  ck("the figure is recoloured", r.changed === true, String(r.changed));
  ck("the control says which one is on", r.on && r.on.metricpick === "volume",
     JSON.stringify(r.on));
  ck("the sentence under it follows", r.say.length > 8, r.say);
  ck("and the new colours are colours", r.nan === false, String(r.nan));
}

console.log("4 - THE SHEET ABOUT A MUSCLE SHOWS THAT MUSCLE");
{
  const r = await ev(async ()=>{
    hideModal();
    BODY_FOCUS = "chest"; BODY_EXPAND = true; render();
    await new Promise(r2=> setTimeout(r2, 250));
    const el = document.querySelector("#app [data-m]");
    if(!el) return {none: true};
    el.onclick();
    await new Promise(r2=> setTimeout(r2, 420));
    const m = document.getElementById("modal");
    const mark = m.querySelector(".mm-mark");
    return {mark: !!mark,
      paths: mark ? mark.querySelectorAll("path").length : 0,
      titles: mark ? mark.querySelectorAll("title").length : -1,
      head: (m.querySelector("h3") || {}).textContent.trim(),
      viewBox: mark ? mark.getAttribute("viewBox") : ""};
  });
  ck("a muscle was there to tap", !r.none, "no [data-m] on the figure");
  ck("its sheet carries a picture of it", r.mark === true, JSON.stringify(r));
  ck("made of the same paths the figure draws", r.paths > 0, String(r.paths));
  ck("cropped to that muscle", /^[-\d.]+ [-\d.]+ [\d.]+ [\d.]+$/.test(r.viewBox || ""), r.viewBox);
  ck("THE TOOLTIP DOES NOT LAND IN THE HEADING", r.titles === 0, String(r.titles));
  ck("so the heading is just the name", !/%/.test(r.head), r.head);
  await p.screenshot({path: shot("bodymap-sheet.png")});
}

console.log("5 - NOTHING THREW");
await ev(()=> hideModal());
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
