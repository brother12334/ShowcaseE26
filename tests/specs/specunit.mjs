import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:844}})).newPage();
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
  S.tourDone=true; S.geo='off'; S.splitId=DEFAULT_SPLIT; applySplit(); save();
});
const ev = (fn, arg) => p.evaluate(fn, arg);

console.log("1 - WHAT CAN BE SPECIALIZED, AND WHAT CANNOT");
{
  const r = await ev(()=>({
    allowed: specAllowedMuscles(),
    blocked: Object.keys(SPEC_NOT_ALLOWED),
    lowerBack: specPairCheck(["lower_back"]),
    reasons: Object.keys(SPEC_NOT_ALLOWED).every(k=> SPEC_NOT_ALLOWED[k].length > 20)
  }));
  ck("the five that should not be are not offered",
     ["lower_back","neck","adductors","forearms","obliques"].every(m=> r.allowed.indexOf(m) < 0),
     r.allowed.join(","));
  ck("chest and quads are", r.allowed.includes("chest") && r.allowed.includes("quads"), r.allowed.join(","));
  ck("and each refusal says why", r.reasons, "");
  ck("picking a blocked one is refused with its reason",
     !r.lowerBack.ok && /nearly every heavy lift/.test(r.lowerBack.why), r.lowerBack.why);
}

console.log("2 - PAIR COMPATIBILITY IS ARITHMETIC ON SYSTEMIC COST");
{
  const r = await ev(()=>({
    quadsChest: specPairCheck(["quads","chest"]),     // 3 + 2 = 5, warn
    quadsHams:  specPairCheck(["quads","hams"]),      // 3 + 3 = 6, blocked
    bisTris:    specPairCheck(["biceps","triceps"]),  // 1 + 1 = 2, fine
    sideCalves: specPairCheck(["delts_side","calves"]),
    three:      specPairCheck(["chest","biceps","calves"]),
    chestTris:  specPairCheck(["chest","triceps"])
  }));
  ck("quads + chest is allowed with a warning",
     r.quadsChest.ok && r.quadsChest.cost === 5 && (r.quadsChest.warns||[]).length > 0,
     JSON.stringify(r.quadsChest));
  ck("and the warning says what to expect",
     /demanding/i.test((r.quadsChest.warns||[]).join(" ")), (r.quadsChest.warns||[]).join(" "));
  ck("quads + hamstrings is blocked", !r.quadsHams.ok && r.quadsHams.blocked && r.quadsHams.cost === 6,
     JSON.stringify(r.quadsHams));
  ck("with an override left available", r.quadsHams.override, String(r.quadsHams.override));
  ck("two cheap muscles are fine", r.bisTris.ok && !(r.bisTris.warns||[]).length, JSON.stringify(r.bisTris));
  ck("three is refused outright", !r.three.ok, JSON.stringify(r.three));
  ck("an overlapping pair is warned about separately",
     r.chestTris.ok && (r.chestTris.warns||[]).some(w=> /share a lot of work/.test(w)),
     JSON.stringify(r.chestTris.warns));
}

console.log("3 - BASELINE AND STARTING VOLUME, PER SETTING");
{
  const L = {mev:10, mav:20, mrv:30};
  const r = await ev(L=>({
    focus1:   specStartWeekly(20, 1, L, "FOCUS"),      // 20 x 1.20
    focus2:   specStartWeekly(20, 2, L, "FOCUS"),      // 20 x 1.15
    bal1:     specStartWeekly(20, 1, L, "BALANCED"),
    keep1:    specStartWeekly(20, 1, L, "KEEP_ALL"),   // 20 x 1.10, the gentler start
    keep2:    specStartWeekly(20, 2, L, "KEEP_ALL"),
    floored:  specStartWeekly(6,  1, L, "FOCUS"),      // 7.2 -> MAV 20
    capped:   specStartWeekly(22, 1, {mev:10,mav:20,mrv:26}, "FOCUS"),   // 26.4 -> MRV x .9 = 23.4
    neverLow: specStartWeekly(30, 1, {mev:10,mav:20,mrv:26}, "FOCUS")
  }), L);
  ck("Focus, one muscle: 20% above your own baseline", r.focus1 === 24, String(r.focus1));
  ck("Focus, two: 15% each", r.focus2 === 23, String(r.focus2));
  ck("Balanced starts the same as Focus", r.bal1 === r.focus1, r.bal1+"/"+r.focus1);
  ck("Keep all starts gentler, because everything else is still running",
     r.keep1 === 22 && r.keep2 === 22, r.keep1+"/"+r.keep2);
  ck("never below the productive range", r.floored === 20, String(r.floored));
  ck("never at the ceiling", r.capped === 23, String(r.capped));
  ck("and never below where you already were", r.neverLow === 30, String(r.neverLow));
}

console.log("3b - AND WHAT EVERYTHING ELSE DOES, PER SETTING");
{
  const r = await ev(()=>{
    const L = {mev:10, mav:20, mrv:30};
    return {
      focus:    specOtherWeekly(20, "FOCUS", L),       // max(10 x .8, 20 x .6) = 12
      balanced: specOtherWeekly(20, "BALANCED", L),    // max(10, 20 x .78) = 15.6
      keepAll:  specOtherWeekly(20, "KEEP_ALL", L),    // min(20, 27) = 20
      focusFloor:  specOtherWeekly(9, "FOCUS", L),     // max(8, 5.4) = 8
      balFloor:    specOtherWeekly(9, "BALANCED", L),  // max(10, 7) -> capped at baseline 9
      keepCapped:  specOtherWeekly(40, "KEEP_ALL", L), // baseline past MRV -> MRV x .9
      optionalF:   specOtherWeekly(12, "FOCUS", {mev:0, mav:8, mrv:12}),
      optionalK:   specOtherWeekly(12, "KEEP_ALL", {mev:0, mav:8, mrv:14}),
      noBaseline:  specOtherWeekly(0, "BALANCED", L)   // stands in with MAV
    };
  });
  ck("Focus holds others at about 60%, floored a little under MEV", r.focus === 12, String(r.focus));
  ck("Balanced at about 78%", r.balanced === 15.6, String(r.balanced));
  ck("Keep all does not cut them at all", r.keepAll === 20, String(r.keepAll));
  ck("Focus may dip under MEV, but not under 80% of it", r.focusFloor === 8, String(r.focusFloor));
  ck("Balanced never goes under MEV, and never above your baseline",
     r.balFloor === 9, String(r.balFloor));
  ck("a baseline past your ceiling is treated as the ceiling", r.keepCapped === 27, String(r.keepCapped));
  ck("a muscle with no floor may fall to its indirect work in Focus",
     r.optionalF === 0, String(r.optionalF));
  ck("but is left alone on Keep all", r.optionalK === 12, String(r.optionalK));
  ck("and no baseline falls back to the productive range", r.noBaseline > 0, String(r.noBaseline));
}

console.log("4 - STEP SIZE FOLLOWS THE SETTING, THE COUNT AND WHAT YOU EAT");
{
  const r = await ev(()=>({
    f1: specStepFor(1, "maintain", "FOCUS"),   f2: specStepFor(2, "maintain", "FOCUS"),
    b1: specStepFor(1, "maintain", "BALANCED"),b2: specStepFor(2, "maintain", "BALANCED"),
    k1: specStepFor(1, "maintain", "KEEP_ALL"),k2: specStepFor(2, "maintain", "KEEP_ALL"),
    cut: specStepFor(1, "lose", "FOCUS"), cutK: specStepFor(2, "lose", "KEEP_ALL"),
    gain: specStepFor(1, "gain", "FOCUS")
  }));
  ck("Focus: 2, or 1.5 each", r.f1 === 2 && r.f2 === 1.5, r.f1+"/"+r.f2);
  ck("Balanced: 2, or 1.25 each", r.b1 === 2 && r.b2 === 1.25, r.b1+"/"+r.b2);
  ck("Keep all: 1 either way", r.k1 === 1 && r.k2 === 1, r.k1+"/"+r.k2);
  ck("fat loss is 1 whatever the setting", r.cut === 1 && r.cutK === 1, r.cut+"/"+r.cutK);
  ck("a surplus is the same as maintenance", r.gain === 2, String(r.gain));
}

console.log("4b - AND SO DOES THE DEFAULT SETTING");
{
  const r = await ev(()=>({
    one: specDefaultSetting(1, "maintain"), two: specDefaultSetting(2, "maintain"),
    cut: specDefaultSetting(1, "lose"), cut2: specDefaultSetting(2, "lose")
  }));
  ck("one muscle defaults to Balanced", r.one === "BALANCED", r.one);
  ck("two default to Focus", r.two === "FOCUS", r.two);
  ck("and fat loss always does", r.cut === "FOCUS" && r.cut2 === "FOCUS", r.cut+"/"+r.cut2);
}

console.log("5 - THE CEILINGS");
{
  const r = await ev(()=>({
    one: specCeiling(1, 0, "FOCUS"), two: specCeiling(2, 0, "FOCUS"),
    bal1: specCeiling(1, 0, "BALANCED"), bal2: specCeiling(2, 0, "BALANCED"),
    keep1: specCeiling(1, 0, "KEEP_ALL"), keep2: specCeiling(2, 0, "KEEP_ALL"),
    raised: specCeiling(1, 52, "FOCUS"), beyond: specCeiling(1, 80, "FOCUS"),
    sessions10: specSessionsNeeded(10), sessions21: specSessionsNeeded(21),
    sessions40: specSessionsNeeded(40)
  }));
  ck("Focus: 40 for one, 30 each for two", r.one === 40 && r.two === 30, r.one+"/"+r.two);
  ck("Balanced: 36 and 28", r.bal1 === 36 && r.bal2 === 28, r.bal1+"/"+r.bal2);
  ck("Keep all: 32 and 25, because the rest of you is still training",
     r.keep1 === 32 && r.keep2 === 25, r.keep1+"/"+r.keep2);
  ck("raisable to the highest volume ever tested", r.raised === 52, String(r.raised));
  ck("and not past it", r.beyond === 52, String(r.beyond));
  ck("10 sets is one session", r.sessions10 === 1, String(r.sessions10));
  ck("21 needs three", r.sessions21 === 3, String(r.sessions21));
  ck("40 needs four", r.sessions40 === 4, String(r.sessions40));
}

console.log("6 - THE CYCLE DECISION");
{
  const base = {step:2, ceiling:40, mrv:26, sessions:3, canAddSession:true};
  const r = await ev(cfg=>{
    const st = ()=>({heldFor:0, probing:false, probedFrom:0, lastTrend:null, lastSore:null, lastRespondV:0, ceiling:0});
    const out = {};
    out.up = specDecide({V:24, trendPct:2.0, sore:0, joint:0}, st(), cfg);
    out.hold = specDecide({V:24, trendPct:0.2, sore:0, joint:0}, st(), cfg);
    const held1 = Object.assign(st(), {heldFor:1});
    out.hold2 = specDecide({V:24, trendPct:0.2, sore:0, joint:0}, held1, cfg);
    const probing = Object.assign(st(), {heldFor:2, probing:true, probedFrom:24});
    out.probeFail = specDecide({V:26, trendPct:0.1, sore:0, joint:0}, probing, cfg);
    const fellOnce = Object.assign(st(), {lastTrend:-3, lastRespondV:24});
    out.over = specDecide({V:30, trendPct:-3, sore:0, joint:0}, fellOnce, cfg);
    out.overOnce = specDecide({V:30, trendPct:-3, sore:0, joint:0}, st(), cfg);
    const soreBefore = Object.assign(st(), {lastSore:2, lastRespondV:24});
    out.overSore = specDecide({V:30, trendPct:0.5, sore:2, joint:0}, soreBefore, cfg);
    out.overJoint = specDecide({V:30, trendPct:3, sore:0, joint:2}, st(), cfg);
    out.unclear = specDecide({V:24, trendPct:null, sore:0, joint:0}, st(), cfg);
    return out;
  }, base);
  ck("climbing adds a step", r.up.k === "up" && r.up.add === 2, JSON.stringify(r.up));
  ck("flat holds", r.hold.k === "hold" && r.hold.add === 0, JSON.stringify(r.hold));
  ck("flat twice earns one probe", r.hold2.k === "hold" && r.hold2.probe && r.hold2.add === 2,
     JSON.stringify(r.hold2));
  ck("a probe that does nothing sets the ceiling there",
     r.probeFail.k === "probeFail" && r.probeFail.ceiling === 24, JSON.stringify(r.probeFail));
  ck("one bad cycle is not an overreach", r.overOnce.k !== "over", JSON.stringify(r.overOnce));
  ck("two falling cycles are", r.over.k === "over", JSON.stringify(r.over));
  ck("and it goes back to the last responding level minus 10%",
     r.over.to === 22 && r.over.ceiling === 22, JSON.stringify(r.over));
  ck("soreness twice running is an overreach too", r.overSore.k === "over", JSON.stringify(r.overSore));
  ck("joint pain is one on its own", r.overJoint.k === "over" && /joint/.test(r.overJoint.why),
     JSON.stringify(r.overJoint));
  ck("and nothing readable says so", r.unclear.k === "unclear", JSON.stringify(r.unclear));
}

console.log("7 - AND WHAT THE DECISION IS ALLOWED TO DO");
{
  const r = await ev(()=>{
    const st = ()=>({ceiling:0});
    const out = {};
    out.plain = specApply(24, {k:"up", add:2}, st(), {step:2, ceiling:40, mrv:26, sessions:3, canAddSession:true});
    out.hitCeiling = specApply(39, {k:"up", add:2}, st(), {step:2, ceiling:40, mrv:40, sessions:5, canAddSession:true});
    out.ownCeiling = specApply(24, {k:"up", add:2}, {ceiling:25}, {step:2, ceiling:40, mrv:40, sessions:3, canAddSession:true});
    /* per-session: 2 sessions can hold 20; a step past that must find a day */
    out.needsDay = specApply(20, {k:"up", add:2}, st(), {step:2, ceiling:40, mrv:40, sessions:2, canAddSession:true});
    out.noDay   = specApply(20, {k:"up", add:2}, st(), {step:2, ceiling:40, mrv:40, sessions:2, canAddSession:false});
    out.earned  = specApply(29, {k:"up", add:2}, st(), {step:2, ceiling:40, mrv:26, sessions:4, canAddSession:true});
    out.unearned= specApply(29, {k:"hold", add:2}, st(), {step:2, ceiling:40, mrv:26, sessions:4, canAddSession:true});
    return out;
  });
  ck("an ordinary step lands", r.plain.target === 26, JSON.stringify(r.plain));
  ck("the block ceiling stops it", r.hitCeiling.target === 40, JSON.stringify(r.hitCeiling));
  ck("a ceiling set earlier in the block stops it sooner", r.ownCeiling.target === 25, JSON.stringify(r.ownCeiling));
  ck("a step past the per-session limit asks for another session",
     r.needsDay.needSession === true && r.needsDay.target === 22, JSON.stringify(r.needsDay));
  ck("and holds when there is nowhere to put one",
     r.noDay.target === 20 && /10 sets in one is the limit/.test(r.noDay.capped||""), JSON.stringify(r.noDay));
  ck("past your measured ceiling only after a responding cycle",
     r.earned.target === 31, JSON.stringify(r.earned));
  ck("never on a flat one", r.unearned.target <= 29.9, JSON.stringify(r.unearned));
}

console.log("8 - BLOCK LENGTH IS CLAMPED TO THE RANGE");
{
  const r = await ev(()=>({d: specBlockWeeks(), short: specBlockWeeks(2), long: specBlockWeeks(20),
                           ok: specBlockWeeks(6), ok2: specBlockWeeks(10)}));
  ck("8 weeks by default", r.d === 8, String(r.d));
  ck("never under 6", r.short === 6, String(r.short));
  ck("never over 10", r.long === 10, String(r.long));
  ck("and 6 and 10 are both allowed", r.ok === 6 && r.ok2 === 10, r.ok+"/"+r.ok2);
}

console.log("9 - KEEP ALL HAS TO BE EARNED, AND EVERY REFUSAL NAMES ITSELF");
{
  const r = await ev(()=>{
    const day = 86400000;
    const setCheckins = (sleep, energy, n)=>{
      S.checkins = {};
      for(let i=0;i<n;i++){
        const d = new Date(Date.now() - i*day).toLocaleDateString("en-CA");
        S.checkins[d] = {sleep: String(sleep), energy: String(energy)};
      }
    };
    const out = {};
    setCheckins(8, 8, 12);  out.good     = specKeepAllCheck(["chest"], "maintain", null);
    setCheckins(6.4, 8, 12);out.sleepy   = specKeepAllCheck(["chest"], "maintain", null);
    setCheckins(8, 4, 12);  out.flat     = specKeepAllCheck(["chest"], "maintain", null);
    setCheckins(8, 8, 3);   out.thin     = specKeepAllCheck(["chest"], "maintain", null);
    setCheckins(8, 8, 12);  out.cutting  = specKeepAllCheck(["chest"], "lose", null);
    out.demanding = specKeepAllCheck(["quads","chest"], "maintain", null);
    out.cheapPair = specKeepAllCheck(["biceps","calves"], "maintain", null);
    S.checkins = {};
    return out;
  });
  ck("sleeping and recovering well: it is on the table", r.good.ok, JSON.stringify(r.good));
  ck("short on sleep: refused, with the figure", !r.sleepy.ok && /sleep averaged 6\.4/.test(r.sleepy.why.join(" ")),
     r.sleepy.why.join(" | "));
  ck("low energy: refused, with the figure", !r.flat.ok && /energy averaged/.test(r.flat.why.join(" ")),
     r.flat.why.join(" | "));
  ck("not enough check-ins to tell: refused rather than assumed",
     !r.thin.ok && /check-ins/.test(r.thin.why.join(" ")), r.thin.why.join(" | "));
  ck("eating to lose fat: refused", !r.cutting.ok && /lose fat/.test(r.cutting.why.join(" ")),
     r.cutting.why.join(" | "));
  ck("a demanding pair: refused, with the cost",
     !r.demanding.ok && /cost 5/.test(r.demanding.why.join(" ")), r.demanding.why.join(" | "));
  ck("but a cheap pair is fine", r.cheapPair.ok, JSON.stringify(r.cheapPair));
}

console.log("10 - WHICH SETTING TO SUGGEST, AND WHEN");
{
  const r = await ev(()=>({
    downKeep: specStepDownTarget("KEEP_ALL"), downBal: specStepDownTarget("BALANCED"),
    downFocus: specStepDownTarget("FOCUS"),
    upFocus: specStepUpTarget("FOCUS"), upBal: specStepUpTarget("BALANCED"),
    upKeep: specStepUpTarget("KEEP_ALL")
  }));
  ck("Keep all steps down to Balanced", r.downKeep === "BALANCED", r.downKeep);
  ck("Balanced steps down to Focus", r.downBal === "FOCUS", r.downBal);
  ck("and Focus has nowhere left to go", r.downFocus === null, String(r.downFocus));
  ck("upward is the same ladder", r.upFocus === "BALANCED" && r.upBal === "KEEP_ALL",
     r.upFocus+"/"+r.upBal);
  ck("and Keep all is the top of it", r.upKeep === null, String(r.upKeep));
}

console.log("11 - THE CALIBRATION WEIGHT FOLLOWS THE SETTING THAT WAS RUNNING");
{
  const r = await ev(()=>{
    const day = 86400000, now = Date.now();
    const b = {setting:"BALANCED", settingLog:[
      {at: now - 40*day, to:"FOCUS"},
      {at: now - 20*day, to:"BALANCED"}
    ]};
    return {early: specCalWeightAt(b, now - 30*day),
            late:  specCalWeightAt(b, now - 5*day),
            table: {F: SPEC_CAL_WEIGHT.FOCUS, B: SPEC_CAL_WEIGHT.BALANCED, K: SPEC_CAL_WEIGHT.KEEP_ALL}};
  });
  ck("Focus is worth half, because recovery was flattered most", r.table.F === 0.5, String(r.table.F));
  ck("Balanced more", r.table.B === 0.7, String(r.table.B));
  ck("and Keep all nearly all of it", r.table.K === 0.9, String(r.table.K));
  ck("an observation from the Focus half is weighted as Focus", r.early === 0.5, String(r.early));
  ck("and one from after the change as Balanced", r.late === 0.7, String(r.late));
}

console.log("12 - FATIGUE IS WATCHED MORE CLOSELY THE MORE YOU KEEP DOING");
{
  const r = await ev(()=>({f: SPEC_FATIGUE.FOCUS, b: SPEC_FATIGUE.BALANCED, k: SPEC_FATIGUE.KEEP_ALL}));
  ck("Focus waits for two muscles at -3%", r.f.muscles === 2 && r.f.pct === -3, JSON.stringify(r.f));
  ck("Balanced is tighter", r.b.pct === -2.5 && r.b.rec === -8 && r.b.cuts === 0.4, JSON.stringify(r.b));
  ck("and Keep all reacts to one muscle at -2%",
     r.k.muscles === 1 && r.k.pct === -2 && r.k.rec === -5, JSON.stringify(r.k));
}

console.log(errs.length?("PAGE ERRORS: "+errs.join(" | ")):"no page errors");
if(errs.length) bad++;
console.log(bad?("BROKEN: "+bad):"all good");
await b.close();
