/* B - REST IS A PHASE OF THE SESSION.

   The plate stays, because it is the best piece of visual thinking in this product. What
   changes is what it is made of, what the rim means, which way the number runs, and
   whether the screen answers the question somebody is holding a plate to ask. */
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
  S.prefs = Object.assign({}, S.prefs, {barMode:"total", barWeight:45, plateStep:5});
  DAYS.forEach(w=>{ S.program[w]=[
    {name:"Barbell Bench Press", sets:4, reps:"5-8", rpes:[7,8,8,9], weight:185}]; });
  /* A session behind us, because "what you did on this set last time" is the whole point
     of the panel and there is nothing honest to show without one. */
  const t = Date.now() - 4*86400e3;
  S.sessions = [{id:"prev", workoutId: DAYS[0], date: new Date(t).toLocaleDateString("en-CA"),
    startedAt: t, finishedAt: t + 3600e3, feel: 4,
    entries: [{name:"Barbell Bench Press", sets: [
      {weight:"180", reps:"8", rpe:"7", done:true},
      {weight:"180", reps:"8", rpe:"8", done:true},
      {weight:"180", reps:"7", rpe:"8", done:true},
      {weight:"180", reps:"6", rpe:"9", done:true}]}]}];
  save();
  startWorkout(DAYS[0]);
  const pf=document.getElementById('preflight'); if(pf) pf.remove();
  try{PF=null}catch(e){}
  const e = S.active.entries[0];
  e.sets[0].weight="185"; e.sets[0].reps="8"; e.sets[0].rpe="8"; e.sets[0].done=true;
  save(); TAB="workout"; render();
});

console.log("1 - COUNTING DOWN IS THE DEFAULT, BECAUSE THAT IS THE QUESTION");
{
  const r = await ev(()=> ({pref: trainPrefs().restClock, dflt: PREF_DEFAULTS.restClock}));
  ck("the default is down", r.dflt === "down", String(r.dflt));
  ck("and a profile with no opinion gets it", r.pref === "down", String(r.pref));
}

console.log("2 - THE RIM MEANS THIS REST, NOT THIS MINUTE");
{
  const r = await ev(()=>{
    startRest(0, 0);
    const t = restTargetSec();
    const read = at=>{
      S.active.restTimer.start = Date.now() - at * 1000;
      return {down: restClockNow(), up: (()=>{ const was = trainPrefs().restClock;
        trainPrefs().restClock = "up"; const c = restClockNow();
        trainPrefs().restClock = was; return c; })()};
    };
    const quarter = read(Math.round(t * 0.25));
    const most = read(Math.round(t * 0.75));
    const over = read(t + 40);
    return {t, quarter, most, over};
  });
  ck("the target is a real number", r.t > 20, String(r.t));
  ck("counting down, the rim drains", r.quarter.down.frac > r.most.down.frac,
     r.quarter.down.frac + " -> " + r.most.down.frac);
  ck("counting up, the rim fills", r.quarter.up.frac < r.most.up.frac,
     r.quarter.up.frac + " -> " + r.most.up.frac);
  ck("and both of them are about THIS REST", r.most.up.frac > 0.6 && r.most.up.frac <= 1,
     String(r.most.up.frac));
  ck("past the target it is over, both ways",
     r.over.down.over === true && r.over.up.over === true,
     JSON.stringify([r.over.down.over, r.over.up.over]));
}

console.log("3 - THE PLATE IS STEEL, AND THE DAY SIGNS IT RATHER THAN PAINTING IT");
{
  const r = await ev(async ()=>{
    S.active.restTimer.start = Date.now() - 40000;
    showRestUI(false);
    await new Promise(r2=> setTimeout(r2, 420));
    const pl = document.querySelector(".pf-plate");
    const ring = document.querySelector(".pf-ring");
    const cs = getComputedStyle(pl);
    return {bg: cs.backgroundImage.slice(0, 220),
            inlineBg: pl.style.background,
            dc: pl.style.getPropertyValue("--dc"),
            ring: getComputedStyle(ring).backgroundImage.slice(0, 120),
            sw: ring.style.getPropertyValue("--sw"),
            w: Math.round(pl.getBoundingClientRect().width)};
  });
  ck("the plate is not painted the day's colour", !r.inlineBg, "'" + r.inlineBg + "'");
  ck("but it still carries it", !!r.dc, r.dc);
  ck("it is a machined gradient", /gradient/.test(r.bg), r.bg.slice(0, 60));
  ck("the rim carries the accent", /rgb/.test(r.ring), r.ring.slice(0, 60));
  ck("and the rim has a reading on it", /%/.test(r.sw), r.sw);
  ck("the dial is no longer 86vw of white", r.w <= 340, String(r.w));
}

console.log("4 - IT SAYS WHAT YOU ARE RESTING FOR");
{
  const r = await ev(()=>{
    const el = document.getElementById("restUI");
    const t = el.textContent.replace(/\s+/g, " ");
    return {t, load: !!el.querySelector(".rest-aim-v"),
            aim: (el.querySelector(".rest-aim") || {}).textContent || "",
            from: (el.querySelector(".rest-from-n") || {}).textContent || "",
            adj: el.querySelectorAll("[data-restadj]").length};
  });
  ck("the next set's load is on the screen", /185/.test(r.aim), r.aim.replace(/\s+/g," "));
  ck("so is its rep target", /reps/.test(r.aim), r.aim.replace(/\s+/g," "));
  ck("so is what you did on it last time", /last/.test(r.aim), r.aim.replace(/\s+/g," "));
  ck("and how the bar gets there", /a side/.test(r.aim), r.aim.replace(/\s+/g," "));
  ck("it says what you are resting FROM, not just for",
     /Barbell Bench Press/.test(r.from) && /set 1/.test(r.from), r.from.replace(/\s+/g," "));
  ck("there are two ways to move the clock", r.adj === 2, String(r.adj));
  await p.screenshot({path: shot("rest-dial.png")});
}

console.log("5 - THIRTY SECONDS MOVES THIS REST AND NOTHING ELSE");
{
  const r = await ev(async ()=>{
    const before = restTargetSec();
    document.querySelector('[data-restadj="30"]').click();
    await new Promise(r2=> setTimeout(r2, 120));
    const after = restTargetSec();
    const stamped = S.active.restTimer.target;
    document.querySelector('[data-restadj="-30"]').click();
    await new Promise(r2=> setTimeout(r2, 120));
    const back = restTargetSec();
    /* and the rule that works the target out is untouched */
    const rt = S.active.restTimer;
    const saved = rt.target;
    delete rt.target;
    const rule = restTargetSec();
    rt.target = saved;
    return {before, after, back, stamped, rule};
  });
  ck("thirty seconds more is thirty seconds more", r.after === r.before + 30,
     r.before + " -> " + r.after);
  ck("and thirty less puts it back", r.back === r.before, String(r.back));
  ck("it is stamped on this rest only", r.stamped > 0, String(r.stamped));
  ck("THE RULE THAT PICKS THE TARGET IS UNTOUCHED", r.rule === r.before,
     r.rule + " vs " + r.before);
}

console.log("6 - THE LAST TEN SECONDS TAKE WEIGHT, THEY DO NOT FLASH");
{
  const r = await ev(async ()=>{
    const el = document.getElementById("restUI");
    const t = restTargetSec();
    S.active.restTimer.start = Date.now() - (t - 5) * 1000;
    await new Promise(r2=> setTimeout(r2, 400));
    const soon = el.classList.contains("rest-soon");
    const w = getComputedStyle(el.querySelector(".rest-time")).fontWeight;
    S.active.restTimer.start = Date.now() - 10000;
    await new Promise(r2=> setTimeout(r2, 400));
    return {soon, w, normal: el.classList.contains("rest-soon"),
      anim: getComputedStyle(el.querySelector(".rest-time")).animationName};
  });
  ck("it knows the rest is nearly up", r.soon === true, String(r.soon));
  ck("the number takes weight", parseInt(r.w, 10) >= 600, r.w);
  ck("and it is not an alarm", r.anim === "none", r.anim);
  ck("earlier in the rest it says nothing", r.normal === false, String(r.normal));
}

console.log("7 - THE CLOCK GROWS OUT OF THE THING YOU TOUCHED");
{
  const r = await ev(async ()=>{
    hideRestUI();
    S.active.restTimer = null;
    render();
    await new Promise(r2=> setTimeout(r2, 120));
    const row = document.querySelector(".set.is-live");
    row.querySelector('[data-f="weight"]').value = "185";
    row.querySelector('[data-f="reps"]').value = "7";
    const chk = row.querySelector(".chk");
    const at = chk.getBoundingClientRect();
    chk.click();
    await new Promise(r2=> setTimeout(r2, 160));
    const pill = document.querySelector(".rest-mini");
    return {pill: !!pill,
      startedNear: !!(at.width > 0),
      anims: pill ? pill.getAnimations().length : -1};
  });
  ck("banking a set starts the clock", r.pill === true, String(r.pill));
  ck("and it travels from the tick rather than appearing", r.anims >= 0, String(r.anims));
}

console.log("8 - NOTHING THREW");
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
