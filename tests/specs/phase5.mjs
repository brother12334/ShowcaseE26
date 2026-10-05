/* Phase 5 of the Plan Builder brief: buildPlan, planQuality, the builder screens and the
   entry points, plus H9, H10, L5 and M11. */
import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
await p.route(/^https?:/, r=> r.abort());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open','spec-open','build-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; save();
});
const ev = (fn, arg) => p.evaluate(fn, arg);

console.log("1 - THE SPLIT FOLLOWS THE DAYS, AND NOTHING ELSE");
{
  const r = await ev(()=>{
    const out = {};
    [2,3,4,5,6].forEach(d=>{
      const x = buildPlan({days:d, trainingWeeks:60});
      out[d] = {id: x.report.splitId, days: x.split.days.length,
                name: x.split.name, empty: x.split.days.filter(dd=> !(x.program[dd.id]||[]).length).length};
    });
    return {out, retired: [BUILDER_SPLIT_BY_DAYS[3], BUILDER_SPLIT_BY_DAYS[5]],
            still: !!SPLITS.ppl3 && !!SPLITS.bro5,
            offered: Object.keys(BUILDER_SPLIT_BY_DAYS).map(k=> BUILDER_SPLIT_BY_DAYS[k])};
  });
  ck("2 days is two full-body days", r.out[2].id === "full2" && r.out[2].days === 2, JSON.stringify(r.out[2]));
  ck("3 days is full body A/B/C", r.out[3].id === "full3" && r.out[3].days === 3, JSON.stringify(r.out[3]));
  ck("4 days is upper/lower twice", r.out[4].id === "ul4" && r.out[4].days === 4, JSON.stringify(r.out[4]));
  ck("5 days is upper/lower/push/pull/legs", r.out[5].id === "ulppl5" && r.out[5].days === 5,
     JSON.stringify(r.out[5]));
  ck("6 days is push/pull/legs twice", r.out[6].id === "ppl6" && r.out[6].days === 6, JSON.stringify(r.out[6]));
  ck("no day comes out empty", [2,3,4,5,6].every(d=> r.out[d].empty === 0), "");
  ck("ppl3 and bro5 are not offered", r.offered.indexOf("ppl3") < 0 && r.offered.indexOf("bro5") < 0,
     r.offered.join(","));
  ck("but they still exist, so an old plan still renders", r.still, String(r.still));
}

console.log("2 - H10: EVERY COMBINATION BUILDS CLEAN");
{
  /* The acceptance moved when the owner ruled that the time budget wins. It is no longer
     "nothing fails"; it is:
       no day anywhere past the budget plus its five-minute tolerance, ever;
       no muscle under its time-limited floor (0.7 x MEV big, 0.5 x small), except where
         that is arithmetically impossible, in which case the plan says so and the choice
         screen is offered rather than the plan being handed over quietly;
       a priority muscle never touched at all.
     The known-impossible set is pinned at its measured size so it cannot grow unnoticed. */
  const r = await ev(()=>{
    const weeks = {beginner:10, intermediate:60, advanced:300};
    let n = 0, failed = 0, overBudget = 0, floorBreak = 0, choiceShown = 0;
    const sample = [], breaches = [];
    [2,3,4,5,6].forEach(days=> ["full","home","dumbbell","bodyweight"].forEach(gear=>
      ["beginner","intermediate","advanced"].forEach(level=> ["muscle","lean"].forEach(goal=>
        [45,60,75].forEach(minutes=>{
          n++;
          const out = buildPlan({days, gear, goal, minutes, trainingWeeks: weeks[level]});
          const q = out.report.quality;
          const ids = out.split.days.map(d=> d.id);
          const ceiling = minutes + BUDGET_TOLERANCE_MIN;
          if(ids.some(w=> dayMinutes(out.program[w]) > ceiling)) overBudget++;
          const below = Object.keys((out.report.fit || {}).below || {});
          if(below.length){ floorBreak++;
            if(breaches.length < 4) breaches.push(days+"d "+gear+" "+level+" "+minutes+"m: "+below.join(",")); }
          if(out.report.choice) choiceShown++;
          if(q.fail.length){ failed++; if(sample.length < 3)
            sample.push(days+"d "+gear+" "+level+" "+minutes+"m: "+q.fail[0].msg); }
          /* And whatever else happened, a failure is never handed over without the choice. */
          if(q.fail.length && !out.report.choice) sample.push("NO CHOICE OFFERED: "
            + days+"d "+gear+" "+level+" "+minutes+"m");
        })))));
    return {n, failed, overBudget, floorBreak, choiceShown, sample, breaches};
  });
  ck("360 combinations", r.n === 360, String(r.n));
  ck("not one day anywhere runs past the budget and its tolerance", r.overBudget === 0,
     String(r.overBudget));
  ck("at most two break a time-limited floor, and they are the known impossible pair",
     r.floorBreak <= 2, r.floorBreak + " :: " + r.breaches.join(" | "));
  ck("every plan that fails its own check offers the choice instead of being handed over",
     !r.sample.some(x=> /NO CHOICE OFFERED/.test(x)), r.sample.join(" | "));
  ck("and a failure is only ever the floor it could not keep", r.failed === r.floorBreak,
     r.failed + " failed vs " + r.floorBreak + " floor breaks \u2014 " + r.sample.join(" | "));
}

console.log("3 - THE TIME BUDGET IS REAL, AND PAIRING COMES BEFORE CUTTING");
{
  const r = await ev(()=>{
    const tight = buildPlan({days:4, minutes:45, trainingWeeks:60});
    const loose = buildPlan({days:4, minutes:75, trainingWeeks:60});
    const mins = x=> (x.report.quality.minutes || []).map(m=> m.mins);
    const sets = x=> (x.report.quality.minutes || []).reduce((t,m)=> t + m.sets, 0);
    const paired = x=> Object.keys(x.program).reduce((t,k)=>
      t + (x.program[k]||[]).filter(e=> e.superset).length, 0);
    return {tightMins: mins(tight), looseMins: mins(loose),
            tightSets: sets(tight), looseSets: sets(loose),
            tightPairs: paired(tight), loosePairs: paired(loose)};
  });
  ck("a 45-minute plan fits in 45 minutes",
     r.tightMins.every(m=> m <= 50), r.tightMins.join("/"));
  ck("a 75-minute plan is allowed to be longer",
     Math.max.apply(null, r.looseMins) >= Math.max.apply(null, r.tightMins), r.looseMins.join("/"));
  ck("the tight one pairs more movements than the loose one",
     r.tightPairs >= r.loosePairs, r.tightPairs + " vs " + r.loosePairs);
}

console.log("4 - VOLUME LANDS INSIDE THE BAND THE BODY TAB USES");
{
  const r = await ev(()=>{
    const x = buildPlan({days:4, minutes:60, trainingWeeks:60});
    const w = x.report.weekly, t = x.report.targets;
    const out = [];
    GKEYS.forEach(g=>{
      if((GROUPS[g]||{}).optional) return;
      const v = w[g] || 0;
      out.push({g, v: r1(v), mev: r1(t[g].mev), top: r1(t[g].top),
                ok: v + 0.05 >= t[g].mev && v <= t[g].top + 0.05});
    });
    return {out, bad: out.filter(x2=> !x2.ok)};
  });
  ck("every major muscle sits inside [MEV, min(MAV, 0.9 MRV)]",
     r.bad.length === 0, r.bad.map(x=> x.g+" "+x.v+" of "+x.mev+"-"+x.top).join(", "));
}

console.log("5 - A PRIORITY MUSCLE GETS MORE, AND IS EXEMPT FROM THE BALANCE RULE");
{
  const r = await ev(()=>{
    const plain = buildPlan({days:4, minutes:60, trainingWeeks:60});
    const pri   = buildPlan({days:4, minutes:60, trainingWeeks:60, priority:["delts_side"]});
    return {plain: r1(plain.report.weekly.delts_side), pri: r1(pri.report.weekly.delts_side),
            fails: pri.report.quality.fail.length,
            three: buildAnswers({priority:["chest","lats","quads"]}).priority.length};
  });
  ck("the chosen muscle gets more work", r.pri > r.plain, r.plain + " -> " + r.pri);
  ck("and the plan still passes", r.fails === 0, String(r.fails));
  ck("two is the limit", r.three === 2, String(r.three));
}

console.log("6 - PROTECTED AREAS LOSE THE MOVEMENTS THAT PROVOKE THEM");
{
  const r = await ev(()=>{
    const x = buildPlan({days:4, minutes:60, trainingWeeks:60, protect:["knee"]});
    const names = [];
    Object.keys(x.program).forEach(k=> (x.program[k]||[]).forEach(e=> names.push(e.name)));
    return {names, knee: names.filter(n=> buildProvokes(n, ["knee"])),
            quads: r1(x.report.weekly.quads), fails: x.report.quality.fail.length,
            notes: (x.report.notes||[]).filter(n=> /to keep off/.test(n)).length};
  });
  ck("nothing that loads the knee is prescribed", r.knee.length === 0, r.knee.join(", "));
  ck("the quads still get trained", r.quads > 0, String(r.quads));
  ck("and the plan still passes its check", r.fails === 0, String(r.fails));
}

console.log("7 - L5: NOTHING RUNS AWAY FROM THE CHEST");
{
  const r = await ev(()=>{
    const x = buildPlan({days:4, minutes:60, trainingWeeks:60});
    const w = x.report.weekly, chest = w.chest || 0;
    const over = GKEYS.filter(g=> g !== "chest" && !(GROUPS[g]||{}).optional
      && (w[g]||0) > chest * QUALITY_BALANCE_X + 0.05);
    /* and the check catches it when a plan does */
    const bent = JSON.parse(JSON.stringify(x.program));
    Object.keys(bent).forEach(k=> (bent[k]||[]).forEach(e=>{
      if(muscleFrac(e.name,"delts_side") >= 0.9) e.sets = 24;
    }));
    const q = planQuality(bent, x.split, {});
    return {over, chest: r1(chest), caught: q.fail.some(f=> f.k === "balance")};
  });
  ck("no muscle is above 1.6 times the chest", r.over.length === 0, r.over.join(", "));
  ck("and the check says so when one is", r.caught, String(r.caught));
}

console.log("8 - THE CHECK CATCHES WHAT IT IS FOR");
{
  const r = await ev(()=>{
    const x = buildPlan({days:4, minutes:60, trainingWeeks:60});
    const wid = x.split.days[0].id;
    const mk = fn=>{ const c = JSON.parse(JSON.stringify(x.program)); fn(c); return planQuality(c, x.split, {budget:60}); };
    return {
      session: mk(c=>{ c[wid].forEach(e=>{ if(muscleFrac(e.name,"chest") >= 0.9) e.sets = 14; }); })
        .fail.some(f=> f.k === "session"),
      budget: mk(c=>{ c[wid].forEach(e=> e.sets = 10); }).fail.some(f=> f.k === "budget"),
      under: mk(c=>{ Object.keys(c).forEach(k=> c[k] = (c[k]||[]).filter(e=> muscleFrac(e.name,"biceps") < 0.5)); })
        .fail.some(f=> f.k === "under"),
      unmapped: mk(c=>{ c[wid].push({name:"Zorbo Machine", sets:3, reps:"10"}); })
        .warn.some(f=> f.k === "unmapped"),
      rpe: mk(c=>{ c[wid][0].rpes = [10,10,10]; c[wid][0].name = "Barbell Bench Press"; })
        .warn.some(f=> f.k === "rpe"),
      clean: planQuality(x.program, x.split, {budget:60}).ok
    };
  });
  ck("a session past the cap", r.session, String(r.session));
  ck("a day that overruns the budget", r.budget, String(r.budget));
  ck("a muscle under its floor", r.under, String(r.under));
  ck("a movement it cannot place", r.unmapped, String(r.unmapped));
  ck("an RPE 10 compound", r.rpe, String(r.rpe));
  ck("and it passes a plan with none of those", r.clean, String(r.clean));
}

console.log("9 - H9: WHAT YOU SAID ABOUT YOUR TRAINING AGE IS USED");
{
  const r = await ev(()=>{
    const a1 = buildAnswers({trainingWeeks: 10});
    const a2 = buildAnswers({trainingWeeks: 60});
    const a3 = buildAnswers({trainingWeeks: 300});
    const a4 = buildAnswers({});
    /* and inferExperience falls back to the answer when there is no log */
    const keep = {sessions: S.sessions, prior: S.priorTrainingWeeks, man: S.expManual, setup: S.setup};
    S.sessions = []; S.priorTrainingWeeks = 0; delete S.expManual;
    S.setup = Object.assign({}, S.setup, {level: "advanced"});
    const fell = inferExperience();
    S.sessions = keep.sessions; S.priorTrainingWeeks = keep.prior;
    if(keep.man) S.expManual = keep.man; S.setup = keep.setup;
    return {a1: a1.level, a2: a2.level, a3: a3.level, a4: a4.level, fell};
  });
  ck("ten weeks is a beginner", r.a1 === "beginner", r.a1);
  ck("a year is intermediate", r.a2 === "intermediate", r.a2);
  ck("six years is advanced", r.a3 === "advanced", r.a3);
  ck("skipping the question assumes intermediate", r.a4 === "intermediate", r.a4);
  ck("with no log at all, what you told the app is used", r.fell === "advanced", r.fell);
}

console.log("10 - M11: EVERY MOVEMENT THE BUILDER CAN WRITE HAS INSTRUCTIONS");
{
  const r = await ev(()=>{
    const can = new Set();
    [2,3,4,5,6].forEach(days=> ["full","home","dumbbell","bodyweight"].forEach(gear=>{
      const x = buildPlan({days, gear, trainingWeeks:60});
      Object.keys(x.program).forEach(k=> (x.program[k]||[]).forEach(e=> can.add(e.name)));
    }));
    const missing = [...can].filter(n=> !techniqueFor(n));
    const thin = [...can].filter(n=>{
      const t = techniqueFor(n); if(!t) return false;
      return ["setup","execution","rom","errors","stretch"].some(k=> !t[k] || t[k].length < 12);
    });
    const demos = [...can].filter(n=> (techniqueFor(n) || {}).demo);
    return {n: can.size, missing, thin, demos,
            card: techniqueCardHTML({name:"Barbell Bench Press"}).replace(/<[^>]*>/g," ")};
  });
  ck("every one of them is written up", r.missing.length === 0, r.missing.join(", "));
  ck("and none of the five fields is a stub", r.thin.length === 0, r.thin.join(", "));
  ck("no invented demo links", r.demos.length === 0, r.demos.join(", "));
  ck("the card names set-up, the rep, the range, the errors and the stretch",
     /Set up/.test(r.card) && /The rep/.test(r.card) && /How far/.test(r.card)
       && /Watch for/.test(r.card) && /The stretch/.test(r.card), r.card.slice(0,120));
}

console.log("11 - THE SCREENS: SEVEN QUESTIONS, A PREVIEW, AND NOTHING SAVED UNTIL YOU SAY");
{
  await p.evaluate(()=>{ openBuildPage(); });
  const first = await p.evaluate(()=>({
    open: !document.getElementById("buildFull").hidden,
    q: (document.querySelector("#buildFullIn .spec-steps")||{}).textContent || "",
    skip: !!document.querySelector("[data-buildskip]")
  }));
  ck("it opens on question one of seven", /1 of 7/.test(first.q) && first.open, first.q);
  ck("and the question can be skipped", first.skip, String(first.skip));
  const before = await ev(()=> JSON.stringify(Object.keys(S.program||{}).sort()));
  for(let i=0;i<7;i++){
    await p.evaluate(()=> document.querySelector("[data-buildnext]").click());
    await p.waitForTimeout(60);
  }
  const prev = await p.evaluate(()=>({
    adopt: !!document.querySelector("[data-buildadopt]"),
    backs: !!document.querySelector("[data-buildback]"),
    days: document.querySelectorAll("#buildFullIn .bld-day").length,
    vols: document.querySelectorAll("#buildFullIn .bld-vol").length,
    txt: (document.querySelector("#buildFullIn")||{}).textContent || ""
  }));
  ck("the preview lists every day", prev.days === 4, String(prev.days));
  ck("and the volume table", prev.vols > 10, String(prev.vols));
  ck("with Use this plan and Change answers", prev.adopt && prev.backs, "");
  ck("and it says the check passed", /No problems found/.test(prev.txt), prev.txt.slice(0,80));
  const after = await ev(()=> JSON.stringify(Object.keys(S.program||{}).sort()));
  ck("nothing has been written yet", after === before, after);
  await p.evaluate(()=> document.querySelector("[data-buildadopt]").click());
  await p.waitForTimeout(200);
  const done = await ev(()=>({
    keys: Object.keys(S.program||{}).filter(k=> k !== "finisher").sort().join(","),
    split: (S.customSplit||{}).name, built: !!S.builtPlan, closed: document.getElementById("buildFull").hidden,
    meso: !!S.meso, days: DAYS.join(",")
  }));
  ck("using it writes the programme", /upper|lower/i.test(done.keys), done.keys);
  ck("and the split, the block and the answers", done.built && done.meso && !!done.split,
     JSON.stringify(done));
  ck("the page closes", done.closed, String(done.closed));
}

console.log("12 - THE WAY IN, AND WHAT REPLACED 'CHANGE THE SCHEDULE'");
{
  const r = await p.evaluate(()=>{
    TAB = "program"; DAY_EDIT = null; render();
    const html = document.getElementById("app").innerHTML;
    return {build: !!document.getElementById("buildPlanBtn"),
            importB: !!document.getElementById("aiImportBtn"),
            gone: !document.getElementById("setupSplit"),
            stillThere: typeof openSplitEditor === "function" && typeof switchSplit === "function",
            quality: /A look at your plan|Your plan checks out/.test(html)};
  });
  ck("the Program tab offers Build a new plan", r.build, String(r.build));
  ck("and Import a plan", r.importB, String(r.importB));
  ck("Change the schedule is gone", r.gone, String(r.gone));
  ck("though the functions behind it still exist, unbound", r.stillThere, String(r.stillThere));
  ck("and the quality check has a card there", r.quality, String(r.quality));
  const hero = await p.evaluate(()=>{
    openAIImport();
    const t = (document.getElementById("aiFullIn")||{}).textContent || "";
    const has = !!document.getElementById("aiBuildBtn");
    closeAIImport();
    return {t, has};
  });
  ck("the importer offers to build one instead", hero.has, String(hero.has));
  ck("and no longer says the app does not write programmes",
     !/doesn't write training programmes/.test(hero.t), hero.t.slice(0, 120));
}

console.log(errs.length?("PAGE ERRORS: "+errs.join(" | ")):"no page errors");
if(errs.length) bad++;
console.log(bad?("BROKEN: "+bad):"all good");
await b.close();
