/* Phase 6 of the Plan Builder brief: executed periodization (M9) and M3.
   The acceptance test from the brief is the 5/3/1 one: TM 200 gives 130/150/170 in week
   one, 205 after the cycle, and 180 after a failed AMRAP. */
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
  S.setup={name:"Fer",goal:"strength",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; save();
});
const ev = (fn, arg) => p.evaluate(fn, arg);
const DAY = 86400000;

console.log("1 - THE 5/3/1 WAVE, AS PUBLISHED");
{
  const r = await ev(()=>{
    setTmFor("Bench Press", 200, {cycle: 1, src: "set"});
    const e = {name:"Bench Press", sets:3, reps:"5", rpes:[8,8,8], wave:"531", slotKind:"heavy"};
    const w = n=> prescriptionFor(e, n);
    return {w1: w(1), w2: w(2), w3: w(3), w4: w(4), w5: w(5),
            step: tmStepFor("Bench Press"), lowerStep: tmStepFor("Back Squat"),
            isLower: tmIsLower("Back Squat"), isUpper: !tmIsLower("Bench Press")};
  });
  ck("week 1 is 130 / 150 / 170", String(r.w1.setLoads) === "130,150,170", String(r.w1.setLoads));
  ck("week 1 is five, five, five-plus", String(r.w1.setReps) === "5,5,5+", String(r.w1.setReps));
  ck("week 2 is 140 / 160 / 180 for three", String(r.w2.setLoads) === "140,160,180"
     && String(r.w2.setReps) === "3,3,3+", String(r.w2.setLoads) + " / " + r.w2.setReps);
  ck("week 3 is 150 / 170 / 190 for five, three, one-plus", String(r.w3.setLoads) === "150,170,190"
     && String(r.w3.setReps) === "5,3,1+", String(r.w3.setLoads) + " / " + r.w3.setReps);
  ck("week 4 is the 40/50/60 deload", String(r.w4.setLoads) === "80,100,120"
     && r.w4.waveDeload === true && r.w4.amrapLast === false, String(r.w4.setLoads));
  ck("week 5 starts the wave again", String(r.w5.setLoads) === String(r.w1.setLoads), String(r.w5.setLoads));
  ck("every waved week is three sets", [r.w1,r.w2,r.w3,r.w4].every(x=> x.sets === 3), "");
  ck("the percentages are of a training max", r.w1.pctOf === "tm", r.w1.pctOf);
  ck("an upper-body lift steps 5", r.step === 5 && r.isUpper, String(r.step));
  ck("a lower-body lift steps 10", r.lowerStep === 10 && r.isLower, String(r.lowerStep));
}

console.log("2 - THE TRAINING MAX MOVES ON THE PROGRAMME'S SCHEDULE");
{
  const r = await ev(()=>{
    /* A plan with the wave on it, started five weeks ago: week 5 is cycle 2, so the
       cycle that just ended has earned its increase. */
    S.program[DAYS[0]] = [{name:"Bench Press", sets:3, reps:"5", rpes:[8,8,8], wave:"531", slotKind:"heavy"}];
    S.planStart = Date.now() - 4 * 7 * 86400000 - 3600e3;
    setTmFor("Bench Press", 200, {cycle: 1, src: "set", readAt: 0});
    /* The cycle was trained: a week-two session that cleared its number. A cycle nobody
       lifted in earns nothing, which is checked below. */
    const at = Date.now() - 3 * 7 * 86400000;
    S.sessions = [{id:"c1", workoutId:DAYS[0], date: dayStr(at), startedAt: at,
      finishedAt: at + 3600e3, entries:[{name:"Bench Press", sets:[
        {weight:"140", reps:"3", rpe:"8", done:true},
        {weight:"160", reps:"3", rpe:"8", done:true},
        {weight:"180", reps:"5", rpe:"9", done:true}]}]}];
    const before = tmFor("Bench Press").w;
    const wk = programWeek();
    syncWaveState();
    return {before, after: tmFor("Bench Press").w, wk, cycle: waveCycleOf(wk)};
  });
  ck("week five is cycle two", r.wk === 5 && r.cycle === 2, r.wk + " / " + r.cycle);
  ck("the training max is 205 after the cycle", r.before === 200 && r.after === 205,
     r.before + " -> " + r.after);
  const again = await ev(()=>{ syncWaveState(); return tmFor("Bench Press").w; });
  ck("and it only moves once per cycle", again === 205, String(again));
  const idle = await ev(()=>{
    /* Two cycles on from the last session: nothing was lifted, so nothing was earned. */
    S.planStart = Date.now() - 12 * 7 * 86400000 - 3600e3;
    setTmFor("Bench Press", 200, {cycle: 1, src: "set", readAt: Date.now()});
    syncWaveState();
    return {tm: tmFor("Bench Press").w, cycle: waveCycleOf(programWeek())};
  });
  ck("a cycle the lift was never trained in earns nothing", idle.tm === 200 && idle.cycle > 1,
     idle.tm + " / " + idle.cycle);
}

console.log("3 - A MISSED AMRAP RESETS THE TRAINING MAX TO 90%");
{
  const r = await ev(()=>{
    S.program[DAYS[0]] = [{name:"Bench Press", sets:3, reps:"5", rpes:[8,8,8], wave:"531", slotKind:"heavy"}];
    /* Week three, whose last set wants at least one rep at 95%. */
    S.planStart = Date.now() - 2 * 7 * 86400000 - 3600e3;
    setTmFor("Bench Press", 200, {cycle: 1, src: "set", readAt: 0});
    S.sessions = [{id:"s1", workoutId:DAYS[0], date: dayStr(Date.now()-3600e3),
      startedAt: Date.now()-3600e3, finishedAt: Date.now()-1800e3, entries:[
        {name:"Bench Press", sets:[
          {weight:"150", reps:"5", rpe:"8", done:true},
          {weight:"170", reps:"3", rpe:"9", done:true},
          {weight:"190", reps:"0", rpe:"10", done:true}]}]}];
    const wk = programWeek();
    const read = wave531Read(S.sessions[0], S.sessions[0].entries[0], S.program[DAYS[0]][0]);
    syncWaveState();
    return {wk, read, tm: tmFor("Bench Press").w};
  });
  ck("the week is read as week three of the wave", r.wk === 3 && r.read.waveWeek === 3,
     r.wk + " / " + (r.read||{}).waveWeek);
  ck("a top set under the minimum is a miss", r.read.miss === true && r.read.min === 1,
     JSON.stringify(r.read));
  ck("the training max comes back to 180", r.tm === 180, String(r.tm));
  const verdict = await ev(()=>{
    setTmFor("Bench Press", 200, {cycle: 1, src: "set", readAt: 0});
    return progressionFor(S.sessions[0], S.sessions[0].entries[0]);
  });
  ck("and the grade card says so rather than offering a load", verdict.kind === "wave"
     && verdict.miss === true && verdict.to === 180, JSON.stringify(verdict).slice(0,140));
  ck("a waved lift is never given a double-progression raise", verdict.kind !== "up", verdict.kind);
}

console.log("4 - AN AMRAP THAT CLEARS ITS NUMBER IS NOT A MISS");
{
  const r = await ev(()=>{
    setTmFor("Bench Press", 200, {cycle: 1, src: "set", readAt: 0});
    S.sessions[0].entries[0].sets[2].reps = "4";
    const read = wave531Read(S.sessions[0], S.sessions[0].entries[0], S.program[DAYS[0]][0]);
    syncWaveState();
    return {read, tm: tmFor("Bench Press").w};
  });
  ck("four reps at 95% is a clear, not a miss", r.read.miss === false && r.read.amrap === 4,
     JSON.stringify(r.read));
  ck("so the training max is untouched", r.tm === 200, String(r.tm));
}

console.log("5 - A DOCUMENT'S OWN WEEK-BY-WEEK TABLE OUTRANKS EVERYTHING");
{
  const r = await ev(()=>{
    const e = {name:"Bench Press", sets:3, reps:"8-10", rpes:[8,8,8], wave:"531",
      weeks:[{week:1, sets:3, reps:"10"}, {week:2, sets:4, reps:"10"},
             {week:3, sets:4, reps:"12", rpes:[9,9,9,9]}]};
    return {w1: prescriptionFor(e,1), w2: prescriptionFor(e,2), w3: prescriptionFor(e,3),
            w4: prescriptionFor(e,4)};
  });
  ck("week 1 is the table's week 1", r.w1.sets === 3 && r.w1.reps === "10" && r.w1.projected === "weeks",
     JSON.stringify(r.w1).slice(0,90));
  ck("week 2 adds the set the table adds", r.w2.sets === 4 && r.w2.reps === "10", String(r.w2.sets));
  ck("week 3 carries its own effort targets", r.w3.reps === "12" && String(r.w3.rpes) === "9,9,9,9",
     String(r.w3.rpes));
  ck("a three-week table repeats rather than running out", r.w4.reps === "10" && r.w4.sets === 3,
     JSON.stringify(r.w4).slice(0,90));
  ck("the table wins over the wave", !r.w1.setLoads, String(r.w1.setLoads));
}

console.log("6 - NOTHING IS WRITTEN INTO THE PLAN");
{
  const r = await ev(()=>{
    const e = {name:"Bench Press", sets:3, reps:"5", rpes:[8,8,8], wave:"531"};
    const before = JSON.stringify(e);
    prescriptionFor(e, 2); prescriptionFor(e, 3); weekView([e], 4);
    return {same: JSON.stringify(e) === before, before};
  });
  ck("the projection never edits the entry it was given", r.same, r.before);
  const q = await ev(()=>{
    const e = {name:"Lateral Raise", sets:3, reps:"12-15", rpes:[8,9,9]};
    const out = prescriptionFor(e, 7);
    return {same: out === e};
  });
  ck("an exercise with no periodization comes back untouched", q.same, String(q.same));
}

console.log("7 - M3: THE DELOAD, HALVED RATHER THAN FLATTENED");
{
  const r = await ev(()=>{
    const f = n=> deloadSetsFor({sets:n});
    return {two: f(2), three: f(3), four: f(4), five: f(5), six: f(6), one: f(1),
            frac: DELOAD_SET_FRACTION};
  });
  ck("four sets become two", r.four === 2, String(r.four));
  ck("six become three", r.six === 3, String(r.six));
  ck("three round up to two", r.three === 2, String(r.three));
  ck("five round up to three", r.five === 3, String(r.five));
  ck("one stays one", r.one === 1, String(r.one));
}

console.log("8 - M3: TRAINING WEEKS, A LAYOFF, AND WHO IS PROMPTED");
{
  /* Anchored to Mondays so the calendar-week buckets are the same whatever day this
     runs on, and every gap between sessions is under a week so the layoff rule is not
     what is being measured here. */
  const r = await ev(()=>{
    const d = 86400000, now = Date.now();
    const mon = Date.parse(weekStartStr(dayStr(now)) + "T12:00:00");
    const mk = (at)=> ({id:"x"+at, workoutId:DAYS[0], date: dayStr(at), startedAt: at,
                        finishedAt: at + 3600e3, entries:[]});
    S.sessions = [];
    // eight calendar weeks; the even ones have two sessions in them, the odd ones one
    for(let w = 8; w >= 1; w--){
      const base = mon - w * 7 * d;
      if(w % 2 === 0) S.sessions.push(mk(base), mk(base + 4 * d));
      else S.sessions.push(mk(base + 2 * d));
    }
    S.blockStart = mon - 9 * 7 * d;
    delete S.deload; delete S.meso; S.importMeta = null;
    S.prefs = Object.assign({}, S.prefs, {deloads: "auto"});
    const counted = trainingWeeksInBlock();
    S.expManual = "intermediate";
    const dueInter = deloadDue();
    S.expManual = "beginner";
    const dueBeg = deloadDue();
    S.expManual = "intermediate";
    return {counted, dueInter: dueInter && dueInter.reason, dueBeg: dueBeg && dueBeg.reason,
            weeks: dueInter && dueInter.weeks, every: DELOAD_EVERY_WEEKS,
            block: Math.round((Date.now() - blockStartAt()) / d)};
  });
  ck("only the weeks with two sessions in them count", r.counted === 4, String(r.counted));
  ck("no gap in there was a layoff", r.block > 60, String(r.block));
  ck("four training weeks is not six, so nothing is due", r.dueInter == null, String(r.dueInter));
  ck("and a beginner is not on the clock at all", r.dueBeg == null, String(r.dueBeg));
  const s2 = await ev(()=>{
    const d = 86400000, now = Date.now();
    const mon = Date.parse(weekStartStr(dayStr(now)) + "T12:00:00");
    const mk = (at)=> ({id:"y"+at, workoutId:DAYS[0], date: dayStr(at), startedAt: at,
                        finishedAt: at + 3600e3, entries:[]});
    S.sessions = [];
    for(let w = 7; w >= 1; w--){
      const base = mon - w * 7 * d;
      S.sessions.push(mk(base), mk(base + 2 * d), mk(base + 4 * d));
    }
    S.blockStart = mon - 8 * 7 * d;
    S.expManual = "intermediate";
    const counted = trainingWeeksInBlock();
    const due = deloadDue();
    return {counted, reason: due && due.reason, weeks: due && due.weeks};
  });
  ck("seven full training weeks is past the clock", s2.counted >= 6, String(s2.counted));
  ck("so a deload is due, and says how many training weeks",
     s2.reason === "scheduled" && s2.weeks === s2.counted, s2.reason + " / " + s2.weeks);
  const l = await ev(()=>{
    const d = 86400000, now = Date.now();
    const mon = Date.parse(weekStartStr(dayStr(now)) + "T12:00:00");
    const mk = (at)=> ({id:"q"+at, workoutId:DAYS[0], date: dayStr(at), startedAt: at,
                        finishedAt: at + 3600e3, entries:[]});
    /* Seven training weeks, then a fortnight away, then back three days ago. */
    S.sessions = [];
    for(let w = 10; w >= 4; w--){
      const base = mon - w * 7 * d;
      S.sessions.push(mk(base), mk(base + 2 * d), mk(base + 4 * d));
    }
    S.sessions.push(mk(mon - 3 * d));
    S.blockStart = mon - 11 * 7 * d;
    S.expManual = "intermediate";
    const start = blockStartAt();
    const off = layoffNow();
    const due = deloadDue();
    return {movedTo: Math.round((mon - start) / d), off, due: due && due.reason,
            counted: trainingWeeksInBlock()};
  });
  ck("the block restarts on the session after the layoff", l.movedTo === 3, String(l.movedTo));
  ck("so the clock is back to nothing", l.counted <= 1, String(l.counted));
  ck("and no deload is prompted on the way back", l.due == null, String(l.due));
  const off = await ev(()=>{
    const d = 86400000, now = Date.now();
    S.sessions = [{id:"z", workoutId:DAYS[0], date: dayStr(now - 20*d), startedAt: now - 20*d,
                   finishedAt: now - 20*d + 3600e3, entries:[]}];
    return {days: (layoffNow()||{}).days, due: deloadDue()};
  });
  ck("twenty days off reads as a layoff", off.days === 20, String(off.days));
  ck("and a layoff silences the prompt", off.due == null, JSON.stringify(off.due));
}

console.log("9 - M3: THE PLAN'S OWN DELOAD WEEKS REPLACE THE CLOCK");
{
  const r = await ev(()=>{
    const d = 86400000, now = Date.now();
    S.sessions = [];
    for(let w = 7; w >= 1; w--){
      const base = now - w * 7 * d;
      S.sessions.push({id:"a"+w, workoutId:DAYS[0], date: dayStr(base), startedAt: base,
                       finishedAt: base + 3600e3, entries:[]},
                      {id:"b"+w, workoutId:DAYS[0], date: dayStr(base+2*d), startedAt: base+2*d,
                       finishedAt: base+2*d+3600e3, entries:[]});
    }
    S.blockStart = now - 7 * 7 * d - d;
    S.planStart = now - 3 * 7 * d - 3600e3;        // week 4
    delete S.deload;
    S.importMeta = {at: 1, weeks: 8, deloadWeeks: [{week:"4", instruction:"Half the sets, keep the loads."}]};
    S.prefs = Object.assign({}, S.prefs, {deloads: "auto"});
    const wk = programWeek();
    const presc = deloadPrescribedNow();
    const due = deloadDue();
    const started = syncPlannedDeload();
    return {wk, presc, due, started, active: deloadActive(),
            reason: (S.deload||{}).reason, sets: deloadView([{name:"Bench Press", sets:4, reps:"5"}])[0].sets};
  });
  ck("the plan's week four is read as a deload", r.wk === 4 && r.presc && r.presc.src === "doc",
     r.wk + " / " + JSON.stringify(r.presc));
  ck("the app's own clock stands down", r.due == null, JSON.stringify(r.due));
  ck("the week runs itself", r.started === true && r.active === true, String(r.started));
  ck("and it is logged as the plan's, not the app's", r.reason === "plan", String(r.reason));
  ck("four sets come down to two", r.sets === 2, String(r.sets));
  const again = await ev(()=> syncPlannedDeload());
  ck("and it does not start a second one", again === false, String(again));
  const w5 = await ev(()=>{
    S.planStart = Date.now() - 4 * 7 * 86400000 - 3600e3;   // week 5
    return {wk: programWeek(), presc: deloadPrescribedNow()};
  });
  ck("week five is not a deload", w5.wk === 5 && w5.presc == null, JSON.stringify(w5));
}

console.log("10 - M3: A BUILT PLAN DELOADS ON ITS OWN BLOCK");
{
  const r = await ev(()=>{
    S.importMeta = null;
    const shapes = {};
    ["beginner","intermediate","advanced"].forEach(lv=>{
      S.meso = {start: Date.now(), level: lv, accum: MESO_SHAPE[lv].accum,
                deload: MESO_SHAPE[lv].deload, weeks: MESO_SHAPE[lv].accum + MESO_SHAPE[lv].deload};
      shapes[lv] = {weeks: mesoWeeks(), shape: mesoShape()};
    });
    /* An intermediate block: four building weeks, then week five is the deload. */
    S.meso = {start: Date.now(), level:"intermediate", accum:4, deload:1, weeks:5};
    const at = {};
    [1,4,5,6,10].forEach(w=>{
      S.planStart = Date.now() - (w - 1) * 7 * 86400000 - 3600e3;
      at[w] = {week: programWeek(), meso: mesoWeekNow(), presc: deloadPrescribedAt(programWeek())};
    });
    return {shapes, at};
  });
  ck("a beginner gets six weeks and no scheduled deload",
     r.shapes.beginner.weeks === 6 && r.shapes.beginner.shape.deload === 0,
     JSON.stringify(r.shapes.beginner));
  ck("an intermediate gets four plus one", r.shapes.intermediate.weeks === 5, JSON.stringify(r.shapes.intermediate));
  ck("an advanced lifter the same", r.shapes.advanced.weeks === 5, JSON.stringify(r.shapes.advanced));
  ck("week one is not a deload", r.at[1].presc == null, JSON.stringify(r.at[1]));
  ck("week four is not a deload", r.at[4].presc == null, JSON.stringify(r.at[4]));
  ck("week five is", r.at[5].presc && r.at[5].presc.src === "meso", JSON.stringify(r.at[5].presc));
  ck("week six starts the next block", r.at[6].meso.week === 1 && r.at[6].meso.block === 2,
     JSON.stringify(r.at[6].meso));
  ck("week ten is the next deload", r.at[10].presc && r.at[10].presc.src === "meso",
     JSON.stringify(r.at[10].presc));
  const built = await ev(()=>{
    const out = {};
    ["beginner","intermediate"].forEach(lv=>{
      const r2 = buildPlan({days:4, level: lv, trainingWeeks: lv === "beginner" ? 2 : 60});
      out[lv] = r2.meso;
    });
    return out;
  });
  ck("the builder writes a beginner's block as six and none",
     built.beginner.accum === 6 && built.beginner.deload === 0, JSON.stringify(built.beginner));
  ck("and an intermediate's as four and one",
     built.intermediate.accum === 4 && built.intermediate.deload === 1, JSON.stringify(built.intermediate));
}

console.log("11 - THE WEEK IS WRITTEN DOWN, AND SESSIONS READ THEIR OWN");
{
  const r = await ev(()=>{
    S.importMeta = {at: 1, weeks: 4};
    S.planStart = Date.now() - 2 * 7 * 86400000 - 3600e3;    // week 3
    delete S.programWeek;
    const moved = advanceProgramWeek();
    const back = planWeekAt(Date.now() - 2 * 7 * 86400000);   // the day the plan was in week 1
    return {moved, stored: S.programWeek, now: programWeek(), back: back && back.week,
            again: advanceProgramWeek()};
  });
  ck("the week is stored as it advances", r.moved === true && r.stored.week === 3,
     JSON.stringify(r.stored));
  ck("and not written twice for the same week", r.again === false, String(r.again));
  ck("a day in the past is read as the week it was in", r.back === 1, String(r.back));
}

console.log("12 - A WAVE IS ONLY EVER RUN BECAUSE THE DOCUMENT SAYS SO");
{
  const r = await ev(()=>{
    const mk = (doc)=> {
      try{ return aiPlanToProgram(Object.assign({
        understood:true, unit:"lb",
        days:[{name:"Push", exercises:[
          {name:"Bench Press", sets:3, reps:"5", kind:"heavy"},
          {name:"Lateral Raise", sets:3, reps:"12-15", kind:"iso"}]}]}, doc), {}); }
      catch(e){ return {err: String(e.message)}; }
    };
    const named = mk({planName:"Wendler 5/3/1", model:"pctWave",
                      planKind:{named:"5/3/1", progression:"percentage"}});
    const plain = mk({planName:"My PPL", model:"double", planKind:{named:"", progression:"double"}});
    const pct   = mk({planName:"Sheiko #29", model:"pctWave", planKind:{named:"Sheiko", progression:"percentage"}});
    const first = r=> (r.program && r.program[(r.customSplit.days[0]||{}).id] || [])[0] || {};
    return {named: first(named).wave, plain: first(plain).wave, pct: first(pct).wave,
            namedIso: (named.program[named.customSplit.days[0].id]||[])[1].wave || null,
            meta: named.meta && named.meta.wave};
  });
  ck("a document that says 5/3/1 runs the wave", r.named === "531", String(r.named));
  ck("an ordinary plan does not", !r.plain, String(r.plain));
  ck("nor does another percentage programme", !r.pct, String(r.pct));
  ck("and only the main lift is waved, never the isolation", !r.namedIso, String(r.namedIso));
  ck("the import records it", r.meta === "531", String(r.meta));
}

console.log("13 - THE WEEK'S NUMBERS REACH THE SESSION, THE WARM-UPS AND THE CLOCK");
{
  const r = await ev(()=>{
    S.importMeta = null; delete S.deload; delete S.meso;
    S.planStart = Date.now() - 7 * 86400000 - 3600e3;     // week 2
    S.program[DAYS[0]] = [{name:"Bench Press", sets:3, reps:"5", rpes:[8,8,8], wave:"531", slotKind:"heavy"}];
    setTmFor("Bench Press", 200, {cycle: waveCycleOf(programWeek()), src:"set", readAt: Date.now()});
    const res = resolvedProgram(DAYS[0]);
    const chosen = res[0].chosen;
    const rx = [0,1,2].map(i=> setPrescription(chosen, i));
    const ph = [0,1,2].map(i=> planLoadPh(chosen, undefined, i));
    return {week: programWeek(), loads: chosen.setLoads, reps: chosen.setReps,
            rx: rx.map(x=> x.reps), rxLoad: rx.map(x=> x.load), ph,
            amrap: rx[2].amrap === true, top: planLoadFor(chosen), one: planLoadFor(chosen, 0),
            mins: projectedDuration(DAYS[0])};
  });
  ck("the session is built from week two", r.week === 2 && String(r.loads) === "140,160,180",
     r.week + " / " + r.loads);
  ck("each set row asks for its own reps", String(r.rx) === "3,3,3+", String(r.rx));
  ck("and its own load", String(r.ph) === "140,160,180", String(r.ph));
  ck("the set prescription carries the load too", String(r.rxLoad) === "140,160,180", String(r.rxLoad));
  ck("the last set is marked as an AMRAP", r.amrap, String(r.amrap));
  ck("asked about the movement it answers with the top load", r.top === "180", r.top);
  ck("asked about set one it answers 140", r.one === "140", r.one);
  ck("the time estimate reads the projected card", r.mins > 0, String(r.mins));
  /* And through the real door: the row the session is actually logged into. */
  const live = await ev(()=>{
    const res = resolvedProgram(DAYS[0]);
    const en = planEntry(res[0].chosen, false, 0, res.map(x=> x.chosen), "L");
    return {sets: en.sets.length, reps: en.setReps, loads: en.setLoads,
            amrap: en.amrapLast === true, planWeight: en.planWeight,
            rx: [0,1,2].map(i=> setPrescription(en, i).reps),
            ph: [0,1,2].map(i=> planLoadPh(en, undefined, i))};
  });
  ck("the session entry is frozen with its per-set prescription",
     live.sets === 3 && String(live.reps) === "3,3,3+" && String(live.loads) === "140,160,180",
     JSON.stringify(live));
  ck("its rows still ask set by set", String(live.rx) === "3,3,3+" && String(live.ph) === "140,160,180",
     String(live.rx) + " / " + String(live.ph));
  ck("and the warm-up ramp has the top load to build to", live.planWeight === 180,
     String(live.planWeight));
}

console.log("14 - A WAVE'S OWN DELOAD WEEK IS NOT HALVED TWICE");
{
  const r = await ev(()=>{
    S.planStart = Date.now() - 3 * 7 * 86400000 - 3600e3;   // week 4, the wave's deload
    S.deload = {startedAt: Date.now() - 86400000, endedAt: null, reason:"manual"};
    const waved = weekView([{name:"Bench Press", sets:3, reps:"5", wave:"531"}]);
    const out = deloadView(waved);
    const other = deloadView(weekView([{name:"Lateral Raise", sets:4, reps:"12-15", rpes:[8,9,9,9]}]));
    return {sets: out[0].sets, loads: out[0].setLoads, deload: out[0].waveDeload,
            otherSets: other[0].sets};
  });
  ck("the wave's deload week keeps its three sets", r.sets === 3 && r.deload === true,
     r.sets + " / " + r.deload);
  ck("at the wave's own light loads", String(r.loads) === "80,100,120", String(r.loads));
  ck("while everything else is still halved", r.otherSets === 2, String(r.otherSets));
}

console.log("15 - NO MAX, NO INVENTED LOAD");
{
  const r = await ev(()=>{
    delete S.tms; S.maxes = {}; S.sessions = [];
    const out = prescriptionFor({name:"Overhead Press", sets:3, reps:"5", wave:"531"}, 1);
    return {loads: out.setLoads || null, tm: tmFor("Overhead Press"),
            reps: String(out.setReps), pct: out.pct};
  });
  ck("with nothing on file there are no loads", r.loads == null && r.tm == null,
     JSON.stringify(r.loads) + " / " + JSON.stringify(r.tm));
  ck("but the week's reps and percentages still run", r.reps === "5,5,5+" && r.pct === 0.85,
     r.reps + " / " + r.pct);
}

console.log("16 - THE PROGRAM TAB SAYS WHAT WILL ACTUALLY RUN");
{
  const r = await ev(()=>{
    S.importMeta = null; delete S.deload;
    S.planStart = Date.now() - 3600e3;
    S.program[DAYS[0]] = [{name:"Bench Press", sets:3, reps:"5", rpes:[8,8,8], wave:"531", slotKind:"heavy"}];
    setTmFor("Bench Press", 200, {cycle:1, src:"set", readAt: Date.now()});
    const h = periodCardHTML();
    return {h, has531: /5\/3\/1/.test(h), hasLoads: /130/.test(h) && /170/.test(h),
            hasTm: /training max/i.test(h) && /\b200\b/.test(h), list: periodWaveList().length};
  });
  ck("the card names the wave", r.has531 && r.list === 1, String(r.list));
  ck("prints this week's loads", r.hasLoads, r.h.slice(0, 200));
  ck("and the training max behind them", r.hasTm, String(r.hasTm));
}

console.log("17 - NOTHING THREW");
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "FAILED " + bad : "ALL GOOD");
await b.close();
process.exit(bad ? 1 : 0);
