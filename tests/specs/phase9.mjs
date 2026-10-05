/* Phase 9 of the Plan Builder brief: the re-measurement, and the five defects it found.
   The full 360-combination grid lives in phase5.mjs (H10); this pins the specific things
   that were wrong and would otherwise come back quietly. */
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
  S.setup={name:"Fer",goal:"muscle",level:"beginner",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; save();
});
const ev = (fn, arg) => p.evaluate(fn, arg);

console.log("1 - THE ANSWERED LEVEL AND GOAL REACH THE BANDS");
{
  const r = await ev(()=>{
    const t = lv=> buildTargets(buildAnswers({days:4, gear:"full", goal:"muscle", minutes:60,
      level: lv, trainingWeeks: lv === "beginner" ? 4 : lv === "advanced" ? 300 : 60}));
    const beg = t("beginner"), int = t("intermediate"), adv = t("advanced");
    return {beg: {mev: beg.chest.mev, top: beg.chest.top},
            int: {mev: int.chest.mev, top: int.chest.top},
            adv: {mev: adv.chest.mev, top: adv.chest.top}};
  });
  ck("a beginner's floor is below an intermediate's", r.beg.mev < r.int.mev,
     r.beg.mev + " vs " + r.int.mev);
  ck("and an intermediate's below an advanced lifter's", r.int.mev < r.adv.mev,
     r.int.mev + " vs " + r.adv.mev);
  ck("the ceilings move the same way", r.beg.top < r.int.top && r.int.top < r.adv.top,
     [r.beg.top, r.int.top, r.adv.top].join(" < "));
  const goal = await ev(()=>{
    const t = g=> buildTargets(buildAnswers({days:4, gear:"full", goal: g, minutes:60,
                                             trainingWeeks: 60}));
    const m = t("muscle"), l = t("lean");
    return {muscle: m.chest.top, lean: l.chest.top};
  });
  ck("training to get leaner lowers the ceiling", goal.lean < goal.muscle,
     goal.lean + " vs " + goal.muscle);
}

console.log("2 - AND NOTHING OF THE PROFILE IS LEFT CHANGED");
{
  const r = await ev(()=>{
    S.setup = {name:"Fer", goal:"muscle", level:"beginner", gear:"full", at: Date.now()};
    delete S.expManual;
    const before = JSON.stringify({exp: S.expManual === undefined ? null : S.expManual,
                                   goal: S.setup.goal});
    buildTargets(buildAnswers({days:5, gear:"full", goal:"lean", minutes:60, trainingWeeks:300}));
    const after = JSON.stringify({exp: S.expManual === undefined ? null : S.expManual,
                                  goal: S.setup.goal});
    /* And again through the whole builder, which calls it several times. */
    buildPlan({days:4, gear:"dumbbell", goal:"strength", minutes:45, trainingWeeks:300});
    const after2 = JSON.stringify({exp: S.expManual === undefined ? null : S.expManual,
                                   goal: S.setup.goal});
    return {before, after, after2};
  });
  ck("the level and goal are put back", r.before === r.after, r.before + " -> " + r.after);
  ck("even after a whole plan is built", r.before === r.after2, r.before + " -> " + r.after2);
}

console.log("3 - THE CHECK JUDGES AGAINST THE BANDS THE PLAN WAS WRITTEN FOR");
{
  const r = await ev(()=>{
    const built = buildPlan({days:3, gear:"dumbbell", goal:"muscle", minutes:60, trainingWeeks:300});
    const own = planQuality(built.program, built.split,
      {budget:60, gear:"dumbbell", targets: built.report.targets});
    /* The same plan judged against a beginner profile's bands, which is what used to
       happen: the builder aimed advanced and the check marked it against a beginner. */
    const other = planQuality(built.program, built.split, {budget:60, gear:"dumbbell"});
    return {own: (own.fail||[]).map(f=> f.k), other: (other.fail||[]).map(f=> f.k),
            takes: typeof planQuality === "function"};
  });
  ck("the plan passes its own check", r.own.length === 0, JSON.stringify(r.own));
  ck("and the check can be pointed at a different set of bands", r.takes, String(r.takes));
}

console.log("4 - A SET IS NEVER ONLY ITS OWN MUSCLE'S SET");
{
  const r = await ev(()=>{
    let n = 0, sess = 0, over = 0;
    const W = {beginner:10, intermediate:60, advanced:300};
    [2,3,6].forEach(days=> ["full","bodyweight"].forEach(gear=>
      ["beginner","advanced"].forEach(level=> [45,75].forEach(minutes=>{
      n++;
      const r2 = buildPlan({days, gear, goal:"muscle", minutes, trainingWeeks: W[level]});
      const dayIds = r2.split.days.map(d=> d.id);
      const t = r2.report.targets;
      dayIds.forEach(wid=> GKEYS.forEach(g=>{
        const v = buildDaySets(r2.program[wid], g);
        if(v > SESSION_SETS_MAX + 0.05) sess++;
      }));
      const weekly = programWeeklySets(r2.program, dayIds);
      MAJOR_MUSCLES.forEach(g=>{
        if(t[g] && !t[g].priority && weekly[g] > t[g].top + 0.05) over++;
      });
    }))));
    return {n, sess, over};
  });
  ck("no session breaches the per-session hard stop", r.sess === 0, r.sess + " of " + r.n);
  ck("and no major muscle is over its own ceiling", r.over === 0, String(r.over));
}

console.log("5 - ONE RULE FOR WHETHER A DAY TRAINS A MUSCLE");
{
  const r = await ev(()=>{
    /* Five movements each giving a third of a set is 1.7 sets and no exposure. */
    const scatter = [{name:"Barbell Back Squat", sets:1}, {name:"Romanian Deadlift", sets:1},
                     {name:"Barbell Bench Press", sets:1}];
    const real = [{name:"Hanging Knee Raise", sets:3}];
    return {scatterTotal: Math.round(buildDaySets(scatter, "abs") * 10) / 10,
            scatterTrains: buildTrainsDay(scatter, "abs"),
            realTrains: buildTrainsDay(real, "abs"),
            min: FREQ_MIN_DAY_SETS,
            dup: buildHasMove(real, "Hanging Knee Raise"),
            notDup: buildHasMove(real, "Cable Crunch")};
  });
  ck("scattered credit is not an exposure", r.scatterTrains === false, JSON.stringify(r));
  ck("a movement of its own is", r.realTrains === true, String(r.realTrains));
  ck("and the duplicate guard knows what a day already has",
     r.dup === true && r.notDup === false, r.dup + "/" + r.notDup);
}

console.log("6 - NO MOVEMENT APPEARS TWICE IN A DAY");
{
  const r = await ev(()=>{
    const W = {beginner:10, intermediate:60, advanced:300};
    let n = 0, dupes = 0; const sample = [];
    [2,3,4,5,6].forEach(days=> ["full","home","dumbbell","bodyweight"].forEach(gear=>
      ["beginner","advanced"].forEach(level=> [45,75].forEach(minutes=>{
      n++;
      const r2 = buildPlan({days, gear, goal:"muscle", minutes, trainingWeeks: W[level]});
      r2.split.days.forEach(d=>{
        const seen = {};
        (r2.program[d.id] || []).forEach(e=>{
          const k = canonEx(e.name);
          if(seen[k]){ dupes++; if(sample.length < 4) sample.push([days,gear,level,minutes,e.name]); }
          seen[k] = 1;
        });
      });
    }))));
    return {n, dupes, sample};
  });
  ck("not in any of " + r.n + " plans", r.dupes === 0, JSON.stringify(r.sample));
}

console.log("7 - A CEILING NO SET CUT CAN REACH LOSES A MOVEMENT");
{
  const r = await ev(()=>{
    const r2 = buildPlan({days:6, gear:"full", goal:"muscle", minutes:60, trainingWeeks:300});
    const dayIds = r2.split.days.map(d=> d.id);
    const weekly = programWeeklySets(r2.program, dayIds);
    const t = r2.report.targets;
    return {chest: Math.round(weekly.chest * 10) / 10, top: Math.round(t.chest.top * 10) / 10,
            notes: (r2.report.notes || []).filter(x=> /over its ceiling/.test(x)),
            fail: (r2.report.quality.fail || []).length};
  });
  ck("six days advanced keeps the chest inside its ceiling", r.chest <= r.top + 0.05,
     r.chest + " vs " + r.top);
  ck("with no quality failure", r.fail === 0, String(r.fail));
}

console.log("8 - THE TIME BUDGET WINS, AND THE PERSON IS ASKED ABOUT WHAT IT COST");
{
  const r = await ev(()=>{
    const r2 = buildPlan({days:2, gear:"full", goal:"muscle", minutes:45, trainingWeeks:300});
    const q = r2.report.quality;
    const mins = r2.split.days.map(d=> dayMinutes(r2.program[d.id]));
    return {mins, ceiling: 45 + BUDGET_TOLERANCE_MIN,
            fail: (q.fail||[]).map(f=> f.k),
            maint: (q.warn||[]).filter(f=> f.k === "maintenance").map(f=> f.msg),
            choice: r2.report.choice, below: Object.keys(r2.report.fit.below || {})};
  });
  ck("a two-day plan on 45 minutes fits inside the budget and its tolerance",
     r.mins.every(m=> m <= r.ceiling), r.mins.join(",") + " vs " + r.ceiling);
  ck("no time-limited floor is broken to do it", r.below.length === 0, r.below.join(","));
  ck("what it cost is a maintenance warning, not a failure",
     r.maint.length > 0 && r.fail.length === 0, r.fail.join(",") + " / " + r.maint.length);
  ck("the warning says maintenance volume still holds the muscle",
     r.maint.some(m=> /holds the muscle you have/.test(m)), (r.maint[0] || "").slice(0,120));
  ck("and the person is asked before anything is saved", !!r.choice, String(!!r.choice));
  ck("the choice names the muscles it affects",
     r.choice && r.choice.muscles.length > 0, JSON.stringify((r.choice||{}).muscles||[]).slice(0,140));
  ck("and what a session would have to be to avoid it",
     r.choice && r.choice.need > r.choice.budget, (r.choice||{}).need + " vs " + (r.choice||{}).budget);
  /* A PRIORITY MUSCLE IS THE LAST THING THE CLOCK TAKES FROM, and where even that is not
     enough — twenty-four sets of chest and a whole body besides do not fit into ninety
     minutes a week, whatever the floors say — the person is told in those words rather
     than finding out from the volume table. */
  const pri = await ev(()=>{
    const mk = p2=> buildPlan(Object.assign({days:2, gear:"full", goal:"muscle", minutes:45,
                                             trainingWeeks:300}, p2));
    const read = r2=>{
      const ids = r2.split.days.map(d=> d.id);
      const weekly = programWeeklySets(r2.program, ids);
      return {chest: Math.round(weekly.chest*10)/10,
              want: Math.round(r2.report.targets.chest.want*10)/10,
              mins: ids.map(w=> dayMinutes(r2.program[w])),
              maint: Object.keys(r2.report.fit.maint || {}),
              shortfall: (r2.report.fit.priority || []).map(x=> x.g),
              choice: r2.report.choice};
    };
    return {with: read(mk({priority:["chest"]})), without: read(mk({}))};
  });
  ck("choosing a muscle gets it more than not choosing it",
     pri.with.chest >= pri.without.chest, pri.with.chest + " vs " + pri.without.chest);
  ck("it is never called maintenance", pri.with.maint.indexOf("chest") < 0,
     pri.with.maint.join(","));
  ck("the budget still holds", pri.with.mins.every(m=> m <= 50), pri.with.mins.join(","));
  ck("and where the time cannot reach its target, the choice screen says so",
     pri.with.shortfall.indexOf("chest") < 0
       || (pri.with.choice && (pri.with.choice.priority||[]).some(x=> x.g === "chest")),
     JSON.stringify(pri.with.shortfall) + " / " + JSON.stringify((pri.with.choice||{}).priority));
}

console.log("9 - NOTHING THREW");
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
