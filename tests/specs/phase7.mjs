/* Phase 7 of the Plan Builder brief: M4, M5, M6, M10 and L2. */
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

console.log("1 - M4: THE SPECIALIZATION READS THE REAL BODY LOG, IN KILOGRAMS");
{
  const r = await ev(()=>{
    S.prefs = Object.assign({}, S.prefs, {units: "lb"});
    bodyLog()[todayStr()] = {w: 180};
    S.spec = {proteinG: 120};
    const kg = specBodyKg();
    const pro = specProteinCheck();
    return {kg, pro, unit: unitWord()};
  });
  ck("180 lb is read as 81.6 kg", Math.abs(r.kg - 81.65) < 0.05, String(r.kg));
  ck("120 g works out at 1.47 g/kg", Math.abs(r.pro.gPerKg - 1.47) < 0.01, String(r.pro.gPerKg));
  ck("and is flagged as low", r.pro.low === true && r.pro.inRange === false, JSON.stringify(r.pro));
  ck("the range in grams is named", r.pro.lo === 130 && r.pro.hi === 180,
     r.pro.lo + "-" + r.pro.hi);
  const kgUser = await ev(()=>{
    S.prefs = Object.assign({}, S.prefs, {units: "kg"});
    bodyLog()[todayStr()] = {w: 82};
    return {kg: specBodyKg(), pro: specProteinCheck()};
  });
  ck("a kg logger is not converted twice", Math.abs(kgUser.kg - 82) < 0.01, String(kgUser.kg));
  ck("their 120 g reads the same way", Math.abs(kgUser.pro.gPerKg - 1.46) < 0.02,
     String(kgUser.pro.gPerKg));
  const ok = await ev(()=>{
    S.spec = {proteinG: 160};
    return specProteinCheck();
  });
  ck("160 g at 82 kg is inside the range", ok.inRange === true && ok.low === false,
     JSON.stringify(ok));
  const none = await ev(()=>{ S.bodyLog = {}; S.spec = {proteinG: 160}; return {kg: specBodyKg(), pro: specProteinCheck()}; });
  ck("with no weigh-in it says nothing rather than guessing", none.kg == null && none.pro == null,
     JSON.stringify(none));
  const band = await ev(()=> [SPEC_PROTEIN_G_PER_KG, SPEC_PROTEIN_G_PER_KG_HI]);
  ck("the guidance is a range of 1.6 to 2.2", String(band) === "1.6,2.2", String(band));
}

console.log("2 - M4: AND WHAT THE SCALE DID OVER A BLOCK");
{
  const r = await ev(()=>{
    const d = 86400000;
    S.prefs = Object.assign({}, S.prefs, {units: "lb"});
    S.bodyLog = {};
    bodyLog()[dayStr(Date.now() - 40*d)] = {w: 176};
    bodyLog()[dayStr(Date.now() - 2*d)]  = {w: 181.4};
    return specWeightChange({startedAt: Date.now() - 50*d});
  });
  ck("the change is read from the log it is stored in", Math.abs(r - 5.4) < 0.01, String(r));
  const one = await ev(()=>{
    S.bodyLog = {}; bodyLog()[todayStr()] = {w: 180};
    return specWeightChange({startedAt: Date.now() - 50*86400000});
  });
  ck("one weigh-in is not a trend", one == null, String(one));
}

console.log("3 - M5: THE TIME-BOX ORDER");
{
  const r = await ev(()=>{
    /* Three chest isolations: every pair shares the chest, so nothing can be paired and
       the next honest saving is a myo-rep set. */
    const mk = n=> ({name:n, sets:4, reps:"10-15", rpes:[8,9,9,9], slotKind:"iso"});
    const program = {w: [mk("Dumbbell Fly"), mk("Cable Fly"), mk("Pec Deck")]};
    const targets = {};
    GKEYS.forEach(g=> targets[g] = {mev:0, want:0, top:99, mrv:99, optional:true});
    const before = dayMinutes(program.w);
    const notes = buildFit(program, ["w"], targets, {minutes: 7, days: 1});
    return {before, after: dayMinutes(program.w), notes: notes.slice(),
            myo: program.w.map(e=> plannedMyo(e)),
            value: program.w.map(e=> plannedSetValue(e))};
  });
  ck("it fits the day into the budget", r.after <= 12 && r.before > 12, r.before + " -> " + r.after);
  ck("by turning the unpairable isolations into myo-rep sets", r.myo.every(Boolean),
     JSON.stringify(r.myo));
  ck("and says so", r.notes.some(x=> /myo-reps/.test(x)), r.notes.join(" | "));
  const val = await ev(()=> ({myo: myoSetValue(), minis: MYO_MINIS,
    straight: plannedSetValue({name:"Cable Fly", sets:3}),
    withMyo: plannedSetValue({name:"Cable Fly", sets:3, tech:[{k:"myoreps"}]})}));
  ck("a myo-rep set is worth 1.75 straight sets", val.myo === 1.75, String(val.myo));
  ck("so three sets ending in one count 3.75", Math.abs(val.withMyo - 3.75) < 0.001,
     String(val.withMyo));
  ck("and three straight sets count three", val.straight === 3, String(val.straight));
  const order = await ev(()=>{
    /* A pairable day: two isolations that share nothing. Supersets come first, so no
       myo-rep set should be prescribed while a pair is still available. */
    const program = {w: [{name:"Cable Fly", sets:4, reps:"10-15", rpes:[8,9,9,9], slotKind:"iso"},
                         {name:"Leg Extension", sets:4, reps:"10-15", rpes:[8,9,9,9], slotKind:"iso"}]};
    const targets = {};
    GKEYS.forEach(g=> targets[g] = {mev:0, want:0, top:99, mrv:99, optional:true});
    const notes = buildFit(program, ["w"], targets, {minutes: 5, days: 1});
    return {notes: notes.slice(), paired: program.w.map(e=> !!e.superset),
            myo: program.w.map(e=> plannedMyo(e))};
  });
  ck("supersets are tried before myo-reps", order.paired.every(Boolean) && !order.myo.some(Boolean),
     JSON.stringify(order));
  const compound = await ev(()=>{
    const program = {w: [{name:"Barbell Back Squat", sets:5, reps:"5-8", rpes:[7,8,8,9,9], slotKind:"heavy"}]};
    const targets = {};
    GKEYS.forEach(g=> targets[g] = {mev:0, want:0, top:99, mrv:99, optional:true});
    buildFit(program, ["w"], targets, {minutes: 4, days: 1});
    return {myo: plannedMyo(program.w[0]), sets: program.w[0].sets};
  });
  ck("a compound is never given myo-reps", compound.myo === false, String(compound.myo));
}

console.log("4 - M5: THE LAST DIRECT MOVEMENT FOR A MUSCLE IS NEVER DROPPED");
{
  const r = await ev(()=>{
    /* A press, a fly and a pushdown. Which muscle has exactly ONE direct movement here
       is a fact about the mapping, so it is measured rather than assumed — and that
       movement is the one the time-box must refuse to drop however much headroom the
       indirect credit appears to give it. */
    const mk = (n, sets, kind)=> ({name:n, sets, reps: kind === "heavy" ? "6-10" : "10-15",
      rpes: Array.from({length:sets}, (_, i)=> i ? 9 : 8), slotKind: kind});
    const list = [mk("Barbell Bench Press", 4, "heavy"), mk("Cable Fly", 3, "iso"),
                  mk("Leg Extension", 3, "iso")];
    const counts = {};
    GKEYS.forEach(g=>{ counts[g] = list.filter(e=> muscleFrac(e.name, g) >= DIRECT_SHARE).length; });
    const solo = GKEYS.filter(g=> counts[g] === 1);
    const soloEx = {};
    solo.forEach(g=>{ soloEx[g] = list.find(e=> muscleFrac(e.name, g) >= DIRECT_SHARE).name; });
    const program = {w: list};
    const targets = {};
    GKEYS.forEach(g=> targets[g] = {mev:0, want:0, top:99, mrv:99, optional:true});
    /* Every muscle with one direct movement is one the plan is responsible for. */
    solo.forEach(g=>{ targets[g] = {mev:2, want:4, top:10, mrv:14, optional:false}; });
    const notes = buildFit(program, ["w"], targets, {minutes: 5, days: 1});
    return {solo, soloEx, counts, left: program.w.map(e=> e.name), notes: notes.slice(),
            share: DIRECT_SHARE, flyChest: muscleFrac("Cable Fly", "chest")};
  });
  ck("there is a muscle here with only one direct movement", r.solo.length > 0,
     JSON.stringify(r.counts) + " " + JSON.stringify(r.solo));
  ck("and every one of those movements survives the time-box",
     r.solo.every(g=> r.left.indexOf(r.soloEx[g]) > -1),
     JSON.stringify(r.soloEx) + " left: " + r.left.join(", "));
  ck("the threshold for direct work is half a set", r.share === 0.5, String(r.share));
  ck("and a fly counts as direct chest work", r.flyChest >= 0.5, String(r.flyChest));
}

console.log("5 - M6: THE GRADE COMPARES AGAINST THE BEST OF THE LAST THREE");
{
  const r = await ev(()=>{
    const d = 86400000, wid = DAYS[0];
    S.program[wid] = [{name:"Barbell Bench Press", sets:3, reps:"5-8", rpes:[8,8,9]}];
    const mk = (ago, w)=> ({id:"s"+ago, workoutId:wid, date: dayStr(Date.now()-ago*d),
      startedAt: Date.now()-ago*d, finishedAt: Date.now()-ago*d+3600e3, feel:4,
      entries:[{name:"Barbell Bench Press", sets:[
        {weight:String(w), reps:"5", rpe:"8", done:true},
        {weight:String(w), reps:"5", rpe:"9", done:true}]}]});
    /* A good session, then a bad one. Against the bad one alone, 200 is "up"; against
       the best of the three it is not. */
    S.sessions = [mk(21, 200), mk(14, 215), mk(7, 190)];
    const now = mk(0, 200);
    const exps = priorExposures(now, "Barbell Bench Press", 0, GRADE_EXPOSURES);
    const g = scoreWorkout(now);
    const sec = (g.sections || g.secs || []).find(x=> x.key === "overload") || {};
    return {n: exps.length, dates: exps.map(x=> x.sess.date),
            why: (sec.why || []).join(" "), pts: sec.pts, max: sec.max,
            window: GRADE_EXPOSURES};
  });
  ck("three exposures are read", r.n === 3 && r.window === 3, r.n + " / " + JSON.stringify(r.dates));
  ck("beating only the worst of them is not progress", /went down|held/.test(r.why), r.why.slice(0,160));
  ck("and the card says what it compared against", /best of its last 3 sessions/.test(r.why),
     r.why.slice(0,220));
  const beat = await ev(()=>{
    const d = 86400000, wid = DAYS[0];
    const mk = (ago, w)=> ({id:"t"+ago, workoutId:wid, date: dayStr(Date.now()-ago*d),
      startedAt: Date.now()-ago*d, finishedAt: Date.now()-ago*d+3600e3, feel:4,
      entries:[{name:"Barbell Bench Press", sets:[
        {weight:String(w), reps:"5", rpe:"8", done:true},
        {weight:String(w), reps:"5", rpe:"9", done:true}]}]});
    S.sessions = [mk(21, 200), mk(14, 215), mk(7, 190)];
    const now = mk(0, 230);
    const g = scoreWorkout(now);
    const sec = (g.sections || g.secs || []).find(x=> x.key === "overload") || {};
    return {why: (sec.why||[]).join(" "), full: sec.pts === sec.max};
  });
  ck("beating the best of them is", /1 of 1 lifts went up/.test(beat.why), beat.why.slice(0,120));
  ck("and scores full marks for it", beat.full, String(beat.full));
}

console.log("6 - M6: AND THE BAR MOVES WITH TRAINING AGE");
{
  const r = await ev(()=>{
    const out = {};
    ["beginner","intermediate","advanced"].forEach(lv=>{
      S.expManual = lv;
      out[lv] = gradeBand();
    });
    S.expManual = "intermediate";
    return out;
  });
  ck("a beginner has to move about 1%", r.beginner.up === 0.01, JSON.stringify(r.beginner));
  ck("an intermediate 0.4%", r.intermediate.up === 0.004, JSON.stringify(r.intermediate));
  ck("and an advanced lifter matching their best counts as up",
     r.advanced.up === 0 && r.advanced.hold === -0.03, JSON.stringify(r.advanced));
  const adv = await ev(()=>{
    const d = 86400000, wid = DAYS[0];
    const mk = (ago, w)=> ({id:"u"+ago, workoutId:wid, date: dayStr(Date.now()-ago*d),
      startedAt: Date.now()-ago*d, finishedAt: Date.now()-ago*d+3600e3, feel:4,
      entries:[{name:"Barbell Bench Press", sets:[{weight:String(w), reps:"5", rpe:"9", done:true}]}]});
    S.sessions = [mk(14, 200), mk(7, 200)];
    const now = mk(0, 198);                    // 1% under the recent best
    const read = lv=>{
      S.expManual = lv;
      const g = scoreWorkout(now);
      const sec = (g.sections || g.secs || []).find(x=> x.key === "overload") || {};
      return {why: (sec.why||[]).join(" "), pts: Math.round(sec.pts * 10) / 10};
    };
    const a = read("advanced"), b2 = read("beginner");
    S.expManual = "intermediate";
    return {adv: a, beg: b2};
  });
  ck("1% under the best holds for an advanced lifter", /1 held/.test(adv.adv.why), adv.adv.why.slice(0,120));
  ck("and is going backwards for a beginner", /1 went down/.test(adv.beg.why), adv.beg.why.slice(0,120));
  ck("so the same session scores differently", adv.adv.pts > adv.beg.pts,
     adv.adv.pts + " vs " + adv.beg.pts);
}

console.log("7 - M6: THE NOTE AND THE CHECK-IN ARE NOT GRADED");
{
  const r = await ev(()=>{
    const wid = DAYS[0];
    S.checkins = {};
    const sess = {id:"lq", workoutId:wid, date: todayStr(), startedAt: Date.now()-3600e3,
      finishedAt: Date.now(), feel: 4, note: "",
      entries:[{name:"Barbell Bench Press", sets:[
        {weight:"200", reps:"5", rpe:"8", rest:120, done:true},
        {weight:"200", reps:"5", rpe:"9", rest:150, done:true}]}]};
    S.sessions = [sess];
    const g = scoreWorkout(sess);
    const sec = (g.sections || g.secs || []).find(x=> x.key === "logquality") || {};
    return {pts: sec.pts, max: sec.max, why: (sec.why||[]).join(" ")};
  });
  ck("a session logged in full scores full marks with no note", Math.abs(r.pts - r.max) < 0.01,
     r.pts + "/" + r.max);
  ck("the section is still worth ten", r.max === 10, String(r.max));
  ck("nothing is missing from it", !/Missing:/.test(r.why), r.why.slice(0,180));
  ck("and it says the two are asked for rather than scored",
     /not part of this score/.test(r.why), r.why.slice(0,240));
}

console.log("8 - M6: EFFICIENCY IS MEASURED AGAINST YOUR OWN BUDGET");
{
  const r = await ev(()=>{
    const wid = DAYS[0];
    const mk = mins=> {
      const st = Date.now() - mins*60000;
      return {id:"e"+mins, workoutId:wid, date: todayStr(), startedAt: st, finishedAt: Date.now(),
        feel:4, entries:[{name:"Barbell Bench Press",
          sets: Array.from({length:12}, ()=> ({weight:"200", reps:"8", rpe:"8", rest:90, done:true}))}]};
    };
    const read = sess=>{
      S.sessions = [sess];
      const g = scoreWorkout(sess);
      const sec = (g.sections || g.secs || []).find(x=> x.key === "efficiency") || {};
      return {pts: Math.round(sec.pts * 100) / 100, max: sec.max, why: (sec.why||[]).join(" ")};
    };
    /* 30 minutes is the shortest the builder offers, and it is the case the old fixed
       40-80 window got wrong: a session that did everything asked of it inside its own
       budget was marked down for being short. */
    S.meso = {start: Date.now(), minutes: 30, level:"intermediate", accum:4, deload:1, weeks:5};
    const onBudget = read(mk(29));
    const over = read(mk(70));
    delete S.meso; delete S.builtPlan;
    const noBudget = read(mk(29));
    const sameLong = read(mk(44));
    return {onBudget, over, noBudget, sameLong, budget: 30};
  });
  ck("a 29-minute session inside a 30-minute budget is not marked down for its length",
     r.onBudget.pts > r.noBudget.pts, r.onBudget.pts + " vs " + r.noBudget.pts + " with no budget");
  ck("and says whose budget it is", /30 minutes your plan is built for/.test(r.onBudget.why),
     r.onBudget.why.slice(0,200));
  ck("running 40 minutes over costs marks", r.over.pts < r.onBudget.pts - 0.5,
     r.over.pts + " vs " + r.onBudget.pts);
  ck("and says by how much", /ran 40 over/.test(r.over.why), r.over.why.slice(0,200));
  ck("with no budget on file the published window stands in",
     /40-80 minute window/.test(r.sameLong.why), r.sameLong.why.slice(0,200));
  const bud = await ev(()=>{
    const none = sessionBudgetMinutes();
    S.builtPlan = {at: Date.now(), answers: {minutes: 60}};
    const built = sessionBudgetMinutes();
    S.meso = {minutes: 30};
    const meso = sessionBudgetMinutes();
    delete S.meso; delete S.builtPlan;
    return {none, built, meso};
  });
  ck("the budget is null until somebody says", bud.none == null, String(bud.none));
  ck("the builder's answer is read", bud.built === 60, String(bud.built));
  ck("and the block's figure wins", bud.meso === 30, String(bud.meso));
}

console.log("9 - L2: A SEVEN-DAY WEEK IS SEVEN DAYS LONG");
{
  const r = await ev(()=>{
    const mkStart = daysAgo=>{
      const st = new Date(); st.setHours(12,0,0,0); st.setDate(st.getDate() - daysAgo);
      return st.getTime();
    };
    const at = d=>{
      S.deload = {startedAt: mkStart(d), endedAt: null, reason:"manual"};
      return {active: deloadActive(), day: deloadDayIn(), left: deloadDaysLeft(),
              label: (deloadNote() || {}).label || ""};
    };
    const out = {win: deloadWindowMs() / DAY_MS, days: DELOAD_DAYS};
    [0,1,3,6,7,8].forEach(d=> out["d"+d] = at(d));
    delete S.deload;
    return out;
  });
  ck("the window is exactly DELOAD_DAYS", r.win === r.days && r.win === 7, r.win + " / " + r.days);
  ck("day one is day 1 of 7", r.d0.day === 1 && r.d0.active, JSON.stringify(r.d0));
  ck("six days in is day 7 of 7", r.d6.day === 7 && r.d6.active, JSON.stringify(r.d6));
  ck("with no days left on it", r.d6.left === 0, String(r.d6.left));
  ck("seven days in it has finished", !r.d7.active, JSON.stringify(r.d7));
  ck("and no label ever claims a day 8", ![r.d0,r.d1,r.d3,r.d6,r.d7,r.d8].some(x=> /day 8/.test(x.label)),
     [r.d7.label, r.d8.label].join(" | "));
  ck("day four counts three days left", r.d3.day === 4 && r.d3.left === 3,
     JSON.stringify(r.d3));
}

console.log("10 - M10: STORAGE, AND A SAVE THAT DID NOT LAND");
{
  const r = await ev(()=> ({
    hasReq: typeof requestPersistentStorage === "function",
    hasModal: typeof saveFailedModal === "function",
    saveReturns: save() === true,
    quietReturns: saveQuiet() === true
  }));
  ck("the app asks for persistent storage", r.hasReq, String(r.hasReq));
  ck("save() hands back whether the write landed", r.saveReturns && r.quietReturns,
     r.saveReturns + "/" + r.quietReturns);
  const fail = await ev(()=>{
    /* Storage full, the way it actually presents: setItem throws. */
    const real = localStorage.setItem.bind(localStorage);
    localStorage.setItem = ()=>{ throw new Error("QuotaExceededError"); };
    persist._warned = false;
    const wrote = save();
    localStorage.setItem = real;
    return {wrote};
  });
  ck("a failed write is reported as one", fail.wrote === false, String(fail.wrote));
  const blocked = await ev(()=>{
    saveFailedModal("The workout you just finished");
    const up = document.getElementById("modalBg").classList.contains("show");
    const txt = document.getElementById("modal").innerText;
    hideModal();                                    // every ordinary way out
    document.getElementById("modalBg").click();
    const still = document.getElementById("modalBg").classList.contains("show");
    MODAL_STICKY = false; hideModal();
    return {up, still, txt, gone: !document.getElementById("modalBg").classList.contains("show")};
  });
  ck("the sheet comes up", blocked.up, String(blocked.up));
  ck("it offers the export", /export everything/i.test(blocked.txt), blocked.txt.slice(0,120));
  ck("and it cannot be dismissed", blocked.still, String(blocked.still));
  ck("until the save works", blocked.gone, String(blocked.gone));
}

console.log("11 - THE BUILDER STILL BUILDS CLEAN");
{
  const r = await ev(()=>{
    let n = 0, failed = 0; const sample = [];
    [2,3,4,5,6].forEach(days=> ["full","home","dumbbell","bodyweight"].forEach(gear=>
      [45,60,75].forEach(minutes=>{
        n++;
        const out = buildPlan({days, gear, goal:"muscle", minutes, trainingWeeks: 60});
        const q = out.report.quality || planQuality(out.program, out.split, {budget: minutes, gear});
        if((q.fail || []).length){ failed++;
          if(sample.length < 4) sample.push([days, gear, minutes, q.fail[0].k + ": " + q.fail[0].msg]); }
      })));
    return {n, failed, sample};
  });
  ck("every combination still passes its own quality check", r.failed === 0,
     r.failed + " of " + r.n + " " + JSON.stringify(r.sample));
}

console.log("12 - NOTHING THREW");
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
