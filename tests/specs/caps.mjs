/* THE BUILDER'S HARD LIMITS, AND AN HONEST CLOCK.

   Four things that were declared and not enforced, verified across the whole grid rather
   than on one hand-made day:
     a session is priced with its warm-up and its set-ups, not only its working sets;
     five sets of one movement and twenty-four in a session are limits, not advice;
     the hamstrings are trained twice a week in every combination there is;
     and two compounds, or two movements that each need a bar, are never paired. */
import { chromium, APP_URL } from './_e26.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
await p.route(/^https?:/, r=> r.abort());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'F',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open','spec-open','build-open','news-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.seenNews='x'; S.tourDone=true; S.geo='off';
  S.setup={name:"F",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.splitId=DEFAULT_SPLIT; applySplit(); save();
});
const ev = (fn,a)=> p.evaluate(fn,a);

console.log("1 - WHAT A SESSION COSTS BESIDES ITS SETS");
{
  const r = await ev(()=> ({warm: WARMUP_MINUTES, setup: SETUP_SECONDS,
    empty: dayMinutes([]),
    one: dayMinutes([{name:"Barbell Bench Press", sets:1, reps:"6-10", rest:[120,150]}]),
    bare: Math.round((1 * (WORK_SECONDS + 120)) / 60)}));
  ck("the warm-up is eight minutes", r.warm === 8, String(r.warm));
  ck("and set-up is a minute an exercise", r.setup === 60, String(r.setup));
  ck("a rest day costs nothing at all", r.empty === 0, String(r.empty));
  ck("one set of one lift costs its warm-up and its set-up too",
     r.one >= r.warm + 1, r.one + " vs " + r.bare + " for the set alone");
}
{
  /* A pair is two set-ups, not one: you stand both stations up before the round. */
  const r = await ev(()=>{
    const solo = [{name:"Cable Fly", sets:3, reps:"10-15", rest:[90,120]},
                  {name:"Leg Extension", sets:3, reps:"10-15", rest:[90,120]}];
    const paired = [Object.assign({}, solo[0], {superset:true}),
                    Object.assign({}, solo[1], {superset:true, supersetEnd:true})];
    const one = [{name:"Cable Fly", sets:3, reps:"10-15", rest:[90,120]}];
    return {solo: dayMinutes(solo), paired: dayMinutes(paired), one: dayMinutes(one)};
  });
  ck("a pair still costs two set-ups", r.paired - r.one >= 1, r.paired + " vs " + r.one);
  ck("and pairing still saves real time", r.paired < r.solo, r.paired + " vs " + r.solo);
}

console.log("2 - THE WHOLE GRID, AGAINST THE REAL LENGTH");
{
  const r = await ev(()=>{
    const W = {beginner:26, intermediate:104, advanced:260};
    let n=0, overBudget=0, perExOver=0, setsOver=0, isoRpe=0, pairBad=0, hamsUnder=0,
        tradedNoChoice=0;
    const over=[], caps=[], pairs=[], hams=[];
    [2,3,4,5,6].forEach(days=> ["full","home","bodyweight"].forEach(gear=>
      ["beginner","intermediate","advanced"].forEach(level=>
        ["muscle","strength","lean","health"].forEach(goal=>
          [45,60,75].forEach(minutes=>{
      n++;
      const out = buildPlan({days, gear, goal, minutes, trainingWeeks: W[level]});
      const ids = out.split.days.map(d=> d.id);
      const tag = days+"d "+gear+"/"+level+"/"+goal+"/"+minutes+"m";
      const ceiling = minutes + BUDGET_TOLERANCE_MIN;
      ids.forEach(w=>{
        const list = out.program[w] || [];
        const mins = dayMinutes(list);
        if(mins > ceiling){ overBudget++; if(over.length<4) over.push(tag+" "+mins+"min"); }
        const total = list.reduce((a,e)=> a + (parseInt(e.sets,10)||0), 0);
        if(total > MAX_WORKING_SETS_PER_SESSION){ setsOver++;
          if(caps.length<4) caps.push(tag+" "+total+" sets"); }
        list.forEach(e=>{
          if((parseInt(e.sets,10)||0) > MAX_SETS_PER_EXERCISE_GEN){ perExOver++;
            if(caps.length<4) caps.push(tag+" "+e.name+" "+e.sets); }
          /* RPE 10 before the last set of an isolation. */
          if(!isCompound(e.name) && Array.isArray(e.rpes) && e.rpes.length > 1
             && !effortUncapped(e, 0)
             && e.rpes.slice(0,-1).some(v=> parseFloat(v) > 9)) isoRpe++;
        });
        /* Superset legality, read off the list the way the session screen reads it. */
        const heavy = x=> ["barbell","smith"].indexOf(libraryGearFor(x.name)) > -1;
        const mach  = x=> ["machine","cable"].indexOf(libraryGearFor(x.name)) > -1;
        for(let i=0;i<list.length-1;i++){
          const e=list[i], f=list[i+1];
          if(!(e.superset && !e.supersetEnd && f && f.supersetEnd)) continue;
          const bothCompound = isCompound(e.name) && isCompound(f.name);
          const bothBar = heavy(e) && heavy(f);
          const loneCompound = (isCompound(e.name) && !(mach(f) || !isCompound(f.name)))
                            || (isCompound(f.name) && !(mach(e) || !isCompound(e.name)));
          if(bothCompound || bothBar || loneCompound){ pairBad++;
            if(pairs.length<4) pairs.push(tag+": "+e.name+" + "+f.name); }
        }
      });
      /* Hamstrings, directly, on at least two days. */
      const hd = ids.filter(w=> (out.program[w]||[]).some(e=>
        muscleFrac(e.name,"hams") >= DIRECT_SHARE && (parseInt(e.sets,10)||0) > 0)).length;
      if(ids.length >= 2 && hd < 2){ hamsUnder++; if(hams.length<4) hams.push(tag+" hams on "+hd); }
      const fit = out.report.fit || {};
      if((Object.keys(fit.below||{}).length || Object.keys(fit.maint||{}).length)
         && !out.report.choice) tradedNoChoice++;
    })))));
    return {n, overBudget, over, perExOver, setsOver, caps, isoRpe, pairBad, pairs,
            hamsUnder, hams, tradedNoChoice};
  });
  ck("the grid is the whole grid", r.n === 540, String(r.n));
  ck("NOT ONE DAY over its budget and tolerance", r.overBudget === 0,
     r.overBudget + " :: " + r.over.join(" | "));
  ck("no exercise past five sets", r.perExOver === 0, r.perExOver + " :: " + r.caps.join(" | "));
  ck("no session past twenty-four working sets", r.setsOver === 0,
     r.setsOver + " :: " + r.caps.join(" | "));
  ck("no isolation asked for failure before its last set", r.isoRpe === 0, String(r.isoRpe));
  ck("HAMSTRINGS TRAINED DIRECTLY TWICE A WEEK, EVERYWHERE", r.hamsUnder === 0,
     r.hamsUnder + " :: " + r.hams.join(" | "));
  ck("no illegal superset anywhere", r.pairBad === 0, r.pairBad + " :: " + r.pairs.join(" | "));
  ck("and volume is never traded for time without asking first",
     r.tradedNoChoice === 0, String(r.tradedNoChoice));
}

console.log("3 - THE CHECK FLAGS A ONCE-WEEKLY HAMSTRING WHATEVER THE VOLUME");
{
  const r = await ev(()=>{
    const split = currentSplit();
    const prog = {}; DAYS.forEach(w=>{ prog[w] = []; });
    /* One curl, on one day, and well under the floor — the case the old volume gate
       excused: it raised nothing at all because the volume was too low to qualify. */
    prog[DAYS[0]] = [{name:"Seated Leg Curl", sets:2, reps:"10-15", rpes:[8,9]}];
    const q = planQuality(prog, split, {});
    /* And a squat does not count as hamstring training for frequency. */
    const p2 = {}; DAYS.forEach(w=>{ p2[w] = []; });
    p2[DAYS[0]] = [{name:"Romanian Deadlift", sets:3, reps:"8-12", rpes:[7,8,9]}];
    p2[DAYS[1]] = [{name:"Barbell Back Squat", sets:4, reps:"6-10", rpes:[7,8,8,9]}];
    const q2 = planQuality(p2, split, {});
    return {freq: q.fail.filter(f=> f.k === "freq" && f.muscle === "hams").map(f=> f.msg),
            squatCounts: buildTrainsDay(p2[DAYS[1]], "hams"),
            squatFreq: q2.fail.filter(f=> f.k === "freq" && f.muscle === "hams").length,
            curlCounts: buildTrainsDay(p2[DAYS[0]], "hams")};
  });
  ck("a once-weekly hamstring is a failure even under the floor", r.freq.length === 1,
     JSON.stringify(r.freq));
  ck("and it says what it wants", /at least two/.test(r.freq[0] || ""), r.freq[0] || "");
  ck("a squat does not count as hamstring training", r.squatCounts === false,
     String(r.squatCounts));
  ck("so a hinge on one day and a squat on the other is still once a week",
     r.squatFreq === 1, String(r.squatFreq));
  ck("but a hinge does count", r.curlCounts === true, String(r.curlCounts));
}

console.log("4 - THE ISOLATION RULE REACHES PLAN ENTRIES, NOT JUST LOGGED ONES");
{
  const r = await ev(()=>{
    /* The movement has to have been performed before, or the first-exposure cap of RPE 7
       answers first and the isolation rule is never reached. */
    const at = Date.now() - 5 * DAY_MS;
    S.sessions = [{id:"s1", workoutId: ROTATION[0], date: dayStr(at), startedAt: at,
      finishedAt: at + 3600e3, feel: 4,
      entries:[{name:"Cable Lateral Raise",
        sets:[{weight:"20", reps:"12", rpe:"8", done:true}]}]}];
    saveQuiet();
    /* A plan entry carries sets as a NUMBER. effortCeiling read (4).length, got
       undefined, fell to 1, and so believed every set was the last one. */
    const planEntry = {name:"Cable Lateral Raise", sets:4, reps:"10-15", rpes:[8,9,9,10]};
    const logged = {name:"Cable Lateral Raise",
      sets:[{reps:"12"},{reps:"12"},{reps:"12"},{reps:"12"}]};
    return {planFirst: effortCeiling(planEntry, 0), planLast: effortCeiling(planEntry, 3),
            logFirst: effortCeiling(logged, 0), logLast: effortCeiling(logged, 3)};
  });
  ck("a plan entry's early set is capped", r.planFirst && r.planFirst.rpe === 9,
     JSON.stringify(r.planFirst));
  ck("and its reason is the isolation rule", r.planFirst && r.planFirst.why === "notLast",
     JSON.stringify(r.planFirst));
  ck("its last set is not capped", r.planLast === null, JSON.stringify(r.planLast));
  ck("and a logged entry behaves identically",
     JSON.stringify(r.logFirst) === JSON.stringify(r.planFirst)
       && r.logLast === r.planLast, JSON.stringify([r.logFirst, r.logLast]));
}

console.log("5 - NOTHING THREW");
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
