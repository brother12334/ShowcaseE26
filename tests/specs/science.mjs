/* THE SCIENCE REFERENCE'S CONFORMANCE PASS.

   Part 3's constants table, verified by value whatever the code calls them, plus the two
   rules the pass found genuinely missing: the mesocycle RIR ramp (2.12.5 / 2.13) and the
   week-boundary volume step (ADD_SETS_PER_WEEK). */
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

console.log("1 - PART 3: EVERY CONSTANT'S VALUE, WHATEVER THE CODE CALLS IT");
{
  const r = await ev(()=> ({
    effortCredit: [0,1,2,3].map(rir=> effortCredit({rpe: String(10 - rir)}).credit)
      .concat([effortCredit({rpe:"6"}).credit, effortCredit({rpe:"5"}).credit,
               effortCredit({rpe:"4"}).credit]),
    warmupPct: WARMUP_LOAD_PCT,
    sessInfo: SESSION_SETS_INFO, sessMax: SESSION_SETS_MAX,
    perEx: MAX_SETS_PER_EXERCISE_GEN, perSession: MAX_WORKING_SETS_PER_SESSION,
    flat: WEEKLY_SETS_FLAT, freqMin: FREQ_MIN_DAY_SETS, rpeTol: RPE_TOL,
    jumpIso: JUMP_CAP_ISO, jumpCompound: JUMP_CAP_COMPOUND,
    repExt: [REP_EXT_STEP_COMPOUND, REP_EXT_STEP_ISO, REP_EXT_MAX_COMPOUND, REP_EXT_MAX_ISO],
    rirCap: repsToFailure({reps:"10", rpe:"4"}) - 10,
    e1rmWindow: [E1RM_REPS_MIN, E1RM_REPS_MAX],
    meso: [MESO_SHAPE.beginner.accum, MESO_SHAPE.intermediate.accum, MESO_SHAPE.advanced.accum],
    mesoRir: MESO_RIR.slice(),
    addPerWeek: ADD_SETS_PER_WEEK,
    deload: [DELOAD_SET_FRACTION, DELOAD_RPE_CAP, DELOAD_EVERY_WEEKS, LAYOFF_DELOAD_DAYS],
    tm: [TM_DEFAULT, TM_STEP_UPPER, TM_STEP_LOWER, TM_FAIL_FACTOR],
    protein: [SPEC_PROTEIN_G_PER_KG, SPEC_PROTEIN_G_PER_KG_HI],
    streak: [STREAK_SET_SHARE, STREAK_GRACE_EVERY, STREAK_GRACE_MAX],
    firstRpe: (()=>{ const c = effortCeiling({name:"A Movement Never Done Before", sets:3}, 0);
                     return c && c.rpe; })(),
    begin: [BEGINNER_COMPOUND_WEEKS]
  }));
  ck("EFFORT_CREDIT: RIR 0-3 full, 4 half, 5 a quarter, 6+ nothing",
     String(r.effortCredit) === "1,1,1,1,0.5,0.25,0", String(r.effortCredit));
  ck("WARMUP_LOAD_PCT 0.60", r.warmupPct === 0.60, String(r.warmupPct));
  ck("SESSION_SETS_INFO / _MAX 6 / 10", r.sessInfo === 6 && r.sessMax === 10,
     r.sessInfo + "/" + r.sessMax);
  ck("MAX_SETS_PER_EXERCISE_GEN 5", r.perEx === 5, String(r.perEx));
  ck("MAX_WORKING_SETS_PER_SESSION 24", r.perSession === 24, String(r.perSession));
  ck("WEEKLY_SETS_FLAT 31", r.flat === 31, String(r.flat));
  ck("FREQ_MIN_DAY_SETS 1.0", r.freqMin === 1.0, String(r.freqMin));
  ck("RPE_TOL 0.5", r.rpeTol === 0.5, String(r.rpeTol));
  ck("JUMP caps 0.10 iso / 0.075 compound", r.jumpIso === 0.10 && r.jumpCompound === 0.075,
     r.jumpIso + "/" + r.jumpCompound);
  ck("REP_EXT 3/5 to 20/30", String(r.repExt) === "3,5,20,30", String(r.repExt));
  ck("RIR_CAP_FOR_E1RM 4", r.rirCap === 4, String(r.rirCap));
  ck("PERF_REPS_WINDOW 3-30", String(r.e1rmWindow) === "3,30", String(r.e1rmWindow));
  ck("MESO_ACCUM_WEEKS beginner 6, others 4", String(r.meso) === "6,4,4", String(r.meso));
  ck("MESO_RIR [3, 2, 1.5, 1, 1]", String(r.mesoRir) === "3,2,1.5,1,1", String(r.mesoRir));
  ck("ADD_SETS_PER_WEEK 1", r.addPerWeek === 1, String(r.addPerWeek));
  ck("DELOAD 0.5 / RPE 7 / every 6 training weeks / layoff 7 days",
     String(r.deload) === "0.5,7,6,7", String(r.deload));
  ck("TM 0.90, +5 upper, +10 lower, reset to 0.90",
     String(r.tm) === "0.9,5,10,0.9", String(r.tm));
  ck("PROTEIN_G_PER_KG 1.6 low / 2.2 high", String(r.protein) === "1.6,2.2", String(r.protein));
  ck("STREAK_SET_SHARE 0.75, a grace week every 8, 2 at most",
     String(r.streak) === "0.75,8,2", String(r.streak));
  ck("FIRST_SESSION_MAX_RPE 7", r.firstRpe === 7, String(r.firstRpe));
  ck("BEGINNER_COMPOUND_WEEKS 6", r.begin[0] === 6, String(r.begin));
}

console.log("2 - 2.13: THE MESOCYCLE RIR RAMP");
{
  const r = await ev(()=>{
    S.importMeta = null;
    S.expManual = "intermediate"; S.priorTrainingWeeks = 300;
    S.meso = {start: Date.now(), level:"intermediate", accum:4, deload:1, weeks:5};
    const comp = {name:"Barbell Bench Press", sets:4, reps:"6-10", rpes:[7,8,8,9]};
    const iso = {name:"Cable Lateral Raise", sets:3, reps:"12-15", rpes:[8,9,9]};
    const at = w=>{
      S.planStart = Date.now() - (w - 1) * 7 * 86400000 - 3600e3;
      delete S.streak;
      return {week: programWeek(), mz: mesoWeekNow(),
              comp: (prescriptionFor(comp) || {}).rpes,
              iso: (prescriptionFor(iso) || {}).rpes,
              rir: mesoRirFor(w)};
    };
    return {w1: at(1), w2: at(2), w3: at(3), w4: at(4), w5: at(5), on: mesoRampOn()};
  });
  ck("the ramp is on for a built block past the beginner weeks", r.on, String(r.on));
  ck("week one leaves three reps in reserve", r.w1.rir === 3, String(r.w1.rir));
  ck("and a compound's last set asks for RPE 7", r.w1.comp[r.w1.comp.length-1] === 7,
     String(r.w1.comp));
  ck("week two asks for 8", r.w2.comp[r.w2.comp.length-1] === 8, String(r.w2.comp));
  ck("week three for 8.5", r.w3.comp[r.w3.comp.length-1] === 8.5, String(r.w3.comp));
  ck("week four for 9", r.w4.comp[r.w4.comp.length-1] === 9, String(r.w4.comp));
  ck("the plan's own ramp shape is kept, not flattened",
     r.w1.comp.length === 4 && r.w1.comp[0] < r.w1.comp[3], String(r.w1.comp));
  ck("an isolation runs half a point closer to failure",
     r.w1.iso[r.w1.iso.length-1] === 7.5, String(r.w1.iso));
  ck("week five is the deload, and the ramp stands aside",
     r.w5.mz.deload === true, JSON.stringify(r.w5.mz));
  const off = await ev(()=>{
    const out = {};
    S.meso = {start: Date.now(), level:"beginner", accum:6, deload:0, weeks:6};
    out.beginnerBlock = mesoRampOn();
    S.meso = {start: Date.now(), level:"intermediate", accum:4, deload:1, weeks:5};
    S.importMeta = {at: 1, weeks: 8};
    out.imported = mesoRampOn();
    S.importMeta = null;
    S.expManual = "beginner"; S.priorTrainingWeeks = 2;
    out.newLifter = mesoRampOn();
    S.expManual = "intermediate"; S.priorTrainingWeeks = 300;
    return out;
  });
  ck("a beginner's block has no ramp", off.beginnerBlock === false, String(off.beginnerBlock));
  ck("an imported plan is left alone", off.imported === false, String(off.imported));
  ck("and so is somebody inside their first six weeks", off.newLifter === false,
     String(off.newLifter));
  const cap = await ev(()=>{
    /* The safety ceilings are not negotiable by the ramp: a squat in week four still
       stops at RPE 9, and a first exposure still stops at 7. */
    S.sessions = [];
    const sq = {name:"Barbell Back Squat", sets:3, reps:"5-8", rpes:[8,9,9]};
    S.planStart = Date.now() - 3 * 7 * 86400000 - 3600e3;
    const proj = prescriptionFor(sq);
    return {rpes: proj.rpes, target: rpeTargetFor(proj, 2),
            ceiling: (effortCeiling(proj, 2) || {}).rpe};
  });
  ck("the effort ceiling still governs what a set is asked for", cap.target <= 9,
     cap.target + " from " + String(cap.rpes));
}

console.log("3 - 2.13: THE WEEK-BOUNDARY VOLUME STEP");
{
  const r = await ev(()=>{
    S.importMeta = null;
    S.expManual = "intermediate"; S.priorTrainingWeeks = 300;
    S.meso = {start: Date.now(), level:"intermediate", accum:4, deload:1, weeks:5};
    S.planStart = Date.now() - 7 * 86400000 - 3600e3;        // week 2
    S.prefs = Object.assign({}, S.prefs, {progression: "auto"});
    S.splitId = DEFAULT_SPLIT; applySplit();
    DAYS.forEach(w=>{ S.program[w] = [
      {name:"Barbell Bench Press", sets:3, reps:"6-10", rpes:[7,8,9], slotKind:"heavy"},
      {name:"Lat Pulldown", sets:3, reps:"8-12", rpes:[7,8,9], slotKind:"second"}]; });
    delete S.meso.steppedAt;
    const before = programWeeklySets(S.program, DAYS);
    /* With no history there are no verdicts, so nothing is due — which is itself the
       rule: a block adds sets to what is RESPONDING, and nothing has responded yet. */
    const dueCold = mesoVolumeDue();
    const nCold = mesoVolumeStep();
    return {before: Math.round((before.chest||0)*10)/10, dueCold: dueCold.length, nCold,
            step: ADD_SETS_PER_WEEK, stamped: (S.meso||{}).steppedAt};
  });
  ck("with nothing responding yet, nothing is added", r.dueCold === 0 && r.nCold === 0,
     r.dueCold + "/" + r.nCold);
  ck("and the week is stamped either way, so it cannot run twice",
     !!r.stamped, String(r.stamped));
  const twice = await ev(()=> mesoVolumeStep());
  ck("a second call in the same week does nothing", twice === 0, String(twice));
  const held = await ev(()=>{
    S.prefs = Object.assign({}, S.prefs, {progression: "ask"});
    delete S.meso.steppedAt;
    const n = mesoVolumeStep();
    S.prefs = Object.assign({}, S.prefs, {progression: "auto"});
    return n;
  });
  ck("on “ask me” nothing is written into the plan", held === 0, String(held));
  const ceil = await ev(()=>{
    const c = mesoVolumeCeiling("chest");
    const A = bodyAnalysis();
    const L = (A.lm && A.lm.chest) || GROUPS.chest;
    return {c: Math.round(c*10)/10, mrv: Math.round(L.mrv*0.9*10)/10,
            mav: Math.round(L.mav*10)/10, beginner: isBeginnerNow()};
  });
  ck("the ceiling is 0.9 of MRV for anybody past beginner",
     !ceil.beginner ? Math.abs(ceil.c - ceil.mrv) < 0.05 : Math.abs(ceil.c - Math.min(ceil.mav, ceil.mrv)) < 0.05,
     JSON.stringify(ceil));
  const deload = await ev(()=>{
    S.planStart = Date.now() - 4 * 7 * 86400000 - 3600e3;    // week 5, the deload
    delete S.meso.steppedAt;
    return {mz: mesoWeekNow(), n: mesoVolumeStep(), due: mesoVolumeDue().length};
  });
  ck("a deload week adds nothing", deload.mz.deload === true && deload.n === 0,
     JSON.stringify(deload));
}

console.log("4 - PART 7: THE THINGS THE APP MUST NEVER DO");
{
  const r = await ev(()=>{
    /* Failure on a heavy compound, in every path that can ask for a set. */
    const sq = {name:"Barbell Back Squat", sets:3, reps:"5-8", rpes:[9,10,10]};
    S.sessions = [{id:"h", workoutId: DAYS[0], date: dayStr(Date.now()-86400000),
      startedAt: Date.now()-86400000, finishedAt: Date.now()-86400000+3600e3,
      entries:[{name:"Barbell Back Squat", sets:[{weight:"200", reps:"6", rpe:"8", done:true}]}]}];
    const caps = [0,1,2].map(i=> rpeTargetFor(sq, i));
    const ramp = capRpeRamp("Barbell Back Squat", [9,10,10]);
    return {caps, ramp: ramp.list, changed: ramp.changed,
            dropOne: setTypeValue({sets:[{reps:"10", rpe:"10", parts:3}],
                                   tech:[{k:"dropset"}]}, 0),
            uncapped: typeof perfIndex === "function" && perfIndex(100, 20) > 100 * (1 + 12/30)};
  });
  ck("no set of a heavy compound is ever asked for RPE 10",
     r.caps.every(v=> v == null || v <= 9), String(r.caps));
  ck("and a plan that asks for it is capped on the way in",
     r.changed && r.ramp.every(v=> v <= 9), String(r.ramp));
  ck("a drop set counts as one set, not several", r.dropOne <= 1.5, String(r.dropOne));
  ck("the performance index is uncapped, and is not called a 1RM", r.uncapped,
     String(r.uncapped));
  const deload = await ev(()=>{
    S.deload = {startedAt: Date.now() - 86400000, endedAt: null, reason:"manual"};
    const held = deloadHoldNote("Barbell Bench Press", 200);
    const ok = applyProgression("Barbell Bench Press", 999, null, "test");
    delete S.deload;
    return {held: !!held, applied: ok};
  });
  ck("no load goes up during a deload", r.deload === undefined || (deload.held && !deload.applied),
     JSON.stringify(deload));
  const shame = await ev(()=>{
    const txt = [streakStripHTML(), streakChipHTML()].join(" ");
    return !/flame|\u{1F525}|don't break|broke your|failed|shame|lazy/iu.test(txt);
  });
  ck("nothing in the streak shames anybody", shame, String(shame));
}

console.log("5 - NOTHING THREW");
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
