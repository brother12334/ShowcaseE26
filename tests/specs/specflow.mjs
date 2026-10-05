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

/* A PPL-rest-PPL-rest lifter with four months of rated training behind them. */
const seed = ()=> p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.splitId=DEFAULT_SPLIT; applySplit();
  S.spec=null; S.specPast=[]; S.deload=null;
  const day=86400000, now=Date.now(); S.sessions=[]; let n=0;
  for(let i=112;i>=1;i--){
    if(i%4===0) continue;                       // rest days
    const wid=ROTATION[n%ROTATION.length]; n++;
    const ents=(planSlotList(wid)||[]).slice(0,5);
    if(!ents.length) continue;
    S.sessions.push({id:"s"+i, date:new Date(now-i*day).toLocaleDateString("en-CA"),
      workoutId:wid, startedAt:now-i*day, finishedAt:now-i*day+36e5, feel:4,
      entries:ents.map(e=>({name:e.name, reps:"8",
        sets:[0,1,2].map(k=>({weight:String(120+k*5+Math.round((112-i)*0.3)), reps:"8",
                              rpe:"8", done:true}))}))});
  }
  S.cycleStart = now - 4*day;
  save();
  return {sessions: S.sessions.length};
});
await seed();

console.log("1 - THE PLAN IT PROPOSES FOR QUADS + CHEST");
let plan;
{
  plan = await p.evaluate(()=>{
    const A = bodyAnalysis();
    const pl = specPlan(["quads","chest"], A);
    return {muscles: pl.muscles, n: pl.n, step: pl.step, ceiling: pl.ceiling, weeks: pl.weeks,
            pairOk: pl.pair.ok, warns: pl.pair.warns || [], cost: pl.pair.cost,
            per: Object.fromEntries(Object.entries(pl.per).map(([k,v])=>
                   [k, {baseline:v.baseline, start:v.start, sessions:v.sessions}])),
            setting: pl.setting,
            maintSample: {biceps: pl.other.biceps, triceps: pl.other.triceps,
                          delts_front: pl.other.delts_front, lats: pl.other.lats},
            pre: pl.pre.map(x=> x.k)};
  });
  ck("it is allowed", plan.pairOk, JSON.stringify(plan));
  ck("and warned about as demanding", plan.cost === 5 && plan.warns.some(w=>/demanding/i.test(w)),
     JSON.stringify(plan.warns));
  ck("two muscles default to Focus", plan.setting === "FOCUS", plan.setting);
  ck("the steps are the Focus pair steps", plan.step === 1.5, String(plan.step));
  ck("the ceiling is the Focus pair ceiling", plan.ceiling === 30, String(plan.ceiling));
  ck("8 weeks", plan.weeks === 8, String(plan.weeks));
  ck("both muscles start above their own baseline",
     Object.values(plan.per).every(v=> v.start >= v.baseline), JSON.stringify(plan.per));
  console.log("     " + JSON.stringify(plan.per));
  console.log("     maintenance: " + JSON.stringify(plan.maintSample));
}

console.log("2 - EVERYTHING ELSE IS CUT TO MAINTENANCE, NOT TO NOTHING");
{
  const r = await p.evaluate(()=>{
    const A = bodyAnalysis();
    const pl = specPlan(["quads","chest"], A);
    const bad = [];
    MKEYS.forEach(m=>{
      if(pl.muscles.indexOf(m) > -1) return;
      const chain = (A.lm && A.lm[m]) || adjustedLandmarks(A, m) || GROUPS[m];
      const want = pl.other[m];
      /* Focus is allowed a little under MEV by design (0.8 of it); what must never happen
         is a muscle dropping below that floor. */
      /* ...and the floor never raises a muscle ABOVE its own baseline: this is a block for
         two muscles, not a reason to add work everywhere. So the floor that must hold is
         the lower of the two. */
      const base = specBaselineWeekly(m);
      const floor = Math.min(base,
        pl.setting === "FOCUS" ? chain.mev * SPEC_FOCUS_MEV_FLOOR : chain.mev);
      if(chain.mev > 0 && want < floor - 0.05) bad.push(m + " " + want + " < floor " + r1(floor));
    });
    const zeroFloor = MKEYS.filter(m=>{
      const chain = (A.lm && A.lm[m]) || adjustedLandmarks(A, m) || GROUPS[m];
      return !(chain.mev > 0);
    });
    return {bad, zeroFloor, maint: pl.other, setting: pl.setting};
  });
  ck("nothing is cut below its own floor", r.bad.length === 0, r.bad.join(" | "));
  ck("and a muscle with no floor is allowed to go to zero",
     r.zeroFloor.every(m=> r.maint[m] === 0), r.zeroFloor.join(","));
}

console.log("3 - THE EXTRA SETS ARE GIVEN A DAY, AND IT IS THE QUIETEST ONE");
{
  const r = await p.evaluate(()=>{
    const A = bodyAnalysis();
    const pl = specPlan(["quads","chest"], A);
    const out = {};
    pl.muscles.forEach(m=>{
      const st = pl.per[m];
      st.target = 24;                       // force a target that needs three sessions
      out[m] = {needs: specSessionsNeeded(st.target), days: specSuggestDays(m, st, A)};
    });
    return out;
  });
  for(const m of Object.keys(r)){
    ck(m + ": three sessions are needed at 24 a week", r[m].needs === 3, String(r[m].needs));
    console.log("     " + m + " -> " + JSON.stringify(r[m].days.map(d=> d.name + ":" + d.sets + " " + (d.pick||"?"))));
  }
  const picks = Object.values(r).flatMap(x=> x.days.map(d=> d.pick)).filter(Boolean);
  const iso = await p.evaluate(ps=> ps.filter(n=> !isCompound(n)).length, picks);
  ck("and what it suggests adding is isolation work",
     picks.length === 0 || iso / picks.length >= 0.5, iso + " of " + picks.length);
}

console.log("4 - NO SESSION IS EVER ASKED FOR MORE THAN TEN SETS OF ONE MUSCLE");
{
  const r = await p.evaluate(()=>{
    const A = bodyAnalysis();
    const pl = specPlan(["quads","chest"], A);
    const bad = [];
    pl.muscles.forEach(m=>{
      for(let target = 10; target <= 40; target += 2){
        const n = specSessionsNeeded(target);
        if(target / n > SPEC_PER_SESSION_LIMIT + 0.001) bad.push(m + " " + target + " over " + n);
      }
    });
    return bad;
  });
  ck("every target divides into sessions of ten or fewer", r.length === 0, r.join(" | "));
}

console.log("5 - A BLOCK RUNS, DECIDES, AND ENDS");
{
  const r = await p.evaluate(()=>{
    const A = bodyAnalysis();
    const pl = specPlan(["chest"], A, {weeks:6});
    const b = specStart(pl);
    const log = [];
    const st = ()=> S.spec.per.chest;
    /* three responding cycles, then two that fall */
    const feed = (trend, sore)=>{
      const cyc = {V: st().target, trendPct: trend, sore: sore||0, joint: 0};
      const cfg = {step: S.spec.step, ceiling: S.spec.ceiling, mrv: st().mrv,
                   sessions: specSessionsNeeded(st().target), canAddSession: true};
      const d = specDecide(cyc, st(), cfg);
      const res = specApply(cyc.V, d, st(), cfg);
      const s2 = st();
      s2.lastTrend = trend; s2.lastSore = sore||0;
      if(d.k === "up"){ s2.lastRespondV = cyc.V; s2.heldFor = 0; }
      if(d.k === "hold"){ s2.heldFor = d.heldFor; s2.probing = !!d.probe; s2.probedFrom = d.probedFrom; }
      if(res.ceiling > 0) s2.ceiling = res.ceiling;
      s2.target = res.target;
      /* mirror what specRunCycle records, so the end-of-block summary and the
         calibration have the same history to read as they would in the app */
      s2.history.push({at: Date.now(), V: cyc.V, k: d.k, trendPct: trend, sore: sore||0,
                       to: s2.target, why: d.why});
      log.push({k:d.k, from: cyc.V, to: s2.target});
    };
    const start = st().start;
    feed(2.5); feed(2.2); feed(2.0); feed(-3); feed(-3);
    const peak = log.reduce((t,x)=> Math.max(t, x.from), 0);
    return {start, log, peak, ceiling: st().ceiling, muscles: b.muscles,
            weeks: b.weeks, cyclesPlanned: b.cyclesPlanned};
  });
  console.log("     " + JSON.stringify(r.log));
  ck("a single-muscle block uses the single step",
     r.log[1].to - r.log[1].from === 2, JSON.stringify(r.log[1]));
  ck("it climbs while it is responding", r.log[2].to > r.log[0].from, JSON.stringify(r.log));
  ck("one bad cycle does not cut it", r.log[3].to >= r.log[3].from, JSON.stringify(r.log[3]));
  ck("the second one does", r.log[4].to < r.log[4].from, JSON.stringify(r.log[4]));
  ck("and sets a ceiling there", r.ceiling > 0, String(r.ceiling));
  ck("6 weeks becomes whole cycles", r.cyclesPlanned >= 1, String(r.cyclesPlanned));
}

console.log("6 - ENDING LEAVES A DELOAD, A SUMMARY AND A COOLDOWN");
{
  const r = await p.evaluate(()=>{
    const sum = specEnd("test");
    return {sum, deload: !!S.deload, share: S.deload && S.deload.share,
            rpe: S.deload && S.deload.rpeCap,
            past: (S.specPast||[]).length, live: !!specActive(),
            cooldown: specCooldownLeft("chest"),
            otherCooldown: specCooldownLeft("quads"),
            specMrv: S.specMrv || null};
  });
  ck("the block is over", !r.live, String(r.live));
  ck("a deload is set at about half, with effort capped",
     r.deload && r.share === 0.5 && r.rpe === 7, JSON.stringify(r));
  ck("it is remembered", r.past === 1, String(r.past));
  ck("the same muscle has to wait", r.cooldown === 6, String(r.cooldown));
  ck("another one does not", r.otherCooldown === 0, String(r.otherCooldown));
  ck("and what it learned is kept for next time", r.specMrv && r.specMrv.chest > 0,
     JSON.stringify(r.specMrv));
  console.log("     " + JSON.stringify(r.sum && r.sum.per));
}

console.log("7 - WHAT IT LEARNED GOES IN AT HALF WEIGHT");
{
  const r = await p.evaluate(()=>{
    const obs = (S.lmCalObs && S.lmCalObs.chest) || {};
    const all = [].concat(obs.mrv||[], obs.mav||[]);
    const mine = all.filter(x=> x.context === "specialization");
    return {n: mine.length, w: mine.map(x=> x.w), all: all.length,
            BALANCED: SPEC_CAL_WEIGHT.BALANCED};
  });
  ck("the block left an observation", r.n >= 1, JSON.stringify(r));
  /* one muscle defaults to Balanced, and Balanced's evidence is worth more than Focus's
     because the rest of the body was still doing most of its work */
  ck("and weighted for the setting it ran under",
     r.w.every(w=> w === r.BALANCED), JSON.stringify(r.w));
}

console.log("8 - AND WITH NO BLOCK RUNNING, NOTHING CHANGES");
{
  const r = await p.evaluate(()=>{
    S.spec = null;
    return {active: specActive(), isSpec: specIsSpecialized("chest"),
            run: specRunCycle(Date.now() + 99)};
  });
  ck("no block is active", r.active === null, JSON.stringify(r.active));
  ck("no muscle is specialized", !r.isSpec, String(r.isSpec));
  ck("and the cycle hook does nothing", r.run.done === false, JSON.stringify(r.run));
}

console.log(errs.length?("PAGE ERRORS: "+errs.join(" | ")):"no page errors");
if(errs.length) bad++;
console.log(bad?("BROKEN: "+bad):"all good");
await b.close();
