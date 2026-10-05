import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding');
  const af=document.getElementById('aiFull'); if(af) af.hidden=true;
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.priorTrainingWeeks=100; S.priorAsked=1;
  S.splitId=DEFAULT_SPLIT; applySplit(); save();
});
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
const near=(a,b2,t=0.01)=> Math.abs(a-b2)<=t;

console.log("B2 - EFFORT-ADJUSTED e1RM");
{
  const r = await p.evaluate(()=>({
    a: setE1RM({weight:"100", reps:"8", rpe:"8"}, 0, false),   // RIR 2 -> 100*(1+10/30)
    b: setE1RM({weight:"100", reps:"10", rpe:"10"}, 0, false), // RIR 0 -> 100*(1+10/30)
    tooFew:  setE1RM({weight:"100", reps:"2", rpe:"9"}, 0, false),
    /* H6 widened this window to 3-30: the trend compares a lift against itself, and a
       set of 15 is a reading of the same lift. Over 30 is where it stops. */
    tooMany: setE1RM({weight:"100", reps:"31", rpe:"9"}, 0, false),
    fifteen: setE1RM({weight:"100", reps:"15", rpe:"9"}, 0, false),
    noRpe:   setE1RM({weight:"100", reps:"8"}, 0, false),
    bw:      setE1RM({weight:"", reps:"10", rpe:"9"}, 0, true)
  }));
  ck("8 @ RPE 8 and 10 @ RPE 10 read as the same lift",
     near(r.a.v, r.b.v) && near(r.a.v, 133.33, 0.02), JSON.stringify(r));
  ck("under 3 reps is unusable", r.tooFew===null, JSON.stringify(r.tooFew));
  ck("over 30 reps is unusable", r.tooMany===null, JSON.stringify(r.tooMany));
  ck("and 15 reps is usable, uncapped", r.fifteen && near(r.fifteen.v, 100*(1+16/30), 0.02),
     JSON.stringify(r.fifteen));
  ck("no RPE is unusable", r.noRpe===null, JSON.stringify(r.noRpe));
  ck("bodyweight uses reps + RIR", r.bw.bw===true && near(r.bw.v, 11), JSON.stringify(r.bw));
}

console.log("B2 - INDEX LIFTS ARE THE ONES THE MUSCLE OWNS");
{
  const r = await p.evaluate(()=>{
    const wid=ROTATION[0];
    const mk=(d,ex)=>({id:"s"+d, workoutId:wid,
      date:new Date(Date.now()-d*86400e3).toLocaleDateString("en-CA"),
      startedAt:Date.now()-d*86400e3, finishedAt:Date.now()-d*86400e3+3600e3, feel:4, entries:ex});
    const sets=(n,w)=>Array.from({length:n},()=>({weight:String(w),reps:"8",rpe:"8",done:true}));
    S.sessions=[
      mk(2,[{name:"Barbell Bench Press", reps:"8-12", sets:sets(4,135)},
            {name:"Overhead Press", reps:"8-12", sets:sets(3,95)}]),
      mk(9,[{name:"Barbell Bench Press", reps:"8-12", sets:sets(4,135)}])];
    save();
    return {chest: indexLifts("chest"), fd: indexLifts("delts_front")};
  });
  ck("chest picks the bench, which it owns", r.chest.includes("barbell bench press"), JSON.stringify(r));
  ck("and not the overhead press, which it does not touch",
     !r.chest.includes("overhead press"), JSON.stringify(r));
  ck("front delts pick the overhead press", r.fd.includes("overhead press"), JSON.stringify(r));
}

console.log("B3 - EXPOSURES THAT MUST NOT COUNT");
{
  const r = await p.evaluate(()=>{
    const day = new Date(Date.now()-2*86400e3).toLocaleDateString("en-CA");
    const sess = {id:"x", date: day, startedAt: Date.now()-2*86400e3};
    const base = exposureSkip(sess, "chest", {gapDays:3});
    S.dayFlags = {[day]:{ill:true}};
    const ill = exposureSkip(sess, "chest", {gapDays:3});
    S.dayFlags = {};
    const d1 = new Date(Date.parse(day+"T12:00:00")-86400e3).toLocaleDateString("en-CA");
    const d2 = new Date(Date.parse(day+"T12:00:00")-2*86400e3).toLocaleDateString("en-CA");
    S.checkins = {[d1]:{sleep:"4.5"}, [d2]:{sleep:"5"}};
    const tired = exposureSkip(sess, "chest", {gapDays:3});
    S.checkins = {};
    const gap = exposureSkip(sess, "chest", {gapDays:14});
    const fresh = exposureSkip(sess, "chest", {gapDays:3, newExercise:true});
    const del = exposureSkip(sess, "chest", {gapDays:3, deload:true});
    return {base, ill, tired, gap, fresh, del};
  });
  ck("an ordinary exposure is kept", r.base.length===0, JSON.stringify(r.base));
  ck("illness is skipped", r.ill.includes("illness"), JSON.stringify(r.ill));
  ck("under 5.5 h sleep is skipped", r.tired.length===1 && /sleep/.test(r.tired[0]), JSON.stringify(r.tired));
  ck("a gap over 10 days is skipped", r.gap.some(x=>/days since/.test(x)), JSON.stringify(r.gap));
  ck("a new exercise is skipped", r.fresh.some(x=>/new exercise/.test(x)), JSON.stringify(r.fresh));
  ck("a deload is skipped", r.del.includes("deload cycle"), JSON.stringify(r.del));
}

console.log("B4 - THE DECISION");
{
  const D = (c)=> p.evaluate(x=> decideForMuscle("chest", x), c);
  let r = await D({V:12, trendPct:2.0, sore:0, joint:0, prev:{}});
  ck("climbing and fresh -> responding", r.k==="up" && r.add===1, JSON.stringify(r));
  r = await D({V:12, trendPct:0, sore:1, joint:0, prev:{}});
  ck("flat and fine -> hold, no probe yet", r.k==="hold" && !r.probe, JSON.stringify(r));
  r = await D({V:12, trendPct:0, sore:1, joint:0, prev:{k:"hold", heldFor:1}});
  ck("flat twice -> one probe set", r.k==="hold" && r.probe && r.add===1, JSON.stringify(r));
  r = await D({V:20, trendPct:-3, sore:0, joint:0, prev:{trendPct:-3}});
  ck("falling twice -> overreached", r.k==="over" && r.observe.mrv===20, JSON.stringify(r));
  r = await D({V:20, trendPct:1.5, sore:3, joint:0, prev:{sore:3}});
  ck("sore twice -> overreached even while the lift climbs",
     r.k==="over" && /soreness/.test(r.why), JSON.stringify(r));
  r = await D({V:20, trendPct:2, sore:0, joint:2, prev:{}});
  ck("joint pain -> overreached immediately", r.k==="over" && /joint/.test(r.why), JSON.stringify(r));
  r = await D({V:12, trendPct:null, sore:null, joint:null, prev:{}});
  ck("no usable data -> no call", r.k==="unclear", JSON.stringify(r));
}

console.log("B5 - OBSERVATIONS BECOME A RATIO, AND A WEIGHT");
{
  const r = await p.evaluate(()=>{
    return {w1: calWeight(1), w2: calWeight(2), w3: calWeight(3), w9: calWeight(9),
            one: calibrationFrom([1.5]),
            three: calibrationFrom([1.5,1.5,1.5]),
            clampHi: calibrationFrom([10,10,10,10]),
            clampLo: calibrationFrom([0.01,0.01,0.01,0.01]),
            recency: calibrationFrom([0.8, 1.4])};
  });
  ck("weights are 0.35 / 0.70 / 0.85 and capped",
     near(r.w1,0.35) && near(r.w2,0.70) && near(r.w3,0.85) && near(r.w9,0.85), JSON.stringify(r));
  ck("one observation moves it part way", near(r.one, 1+0.35*0.5), String(r.one));
  ck("three move it further", r.three > r.one, JSON.stringify(r));
  ck("clamped to 0.5-2.0", r.clampHi<=2 && r.clampLo>=0.5, JSON.stringify(r));
  ck("the newest observation counts most", r.recency > 1, String(r.recency));
}

console.log("B5 - 'AT LEAST' CAN ONLY RAISE A CEILING");
{
  const r = await p.evaluate(()=>{
    S.lmCalObs={}; S.lmCal={};
    recordObservation("chest","mrv", 10, 20, {atLeast:true});     // ratio 0.5, should be ignored
    const after1 = JSON.parse(JSON.stringify(S.lmCalObs.chest||{}));
    recordObservation("chest","mrv", 30, 20, {atLeast:true});     // ratio 1.5, kept
    return {after1, after2: (S.lmCalObs.chest.mrv||[]).length, cal: S.lmCal.chest.mrv};
  });
  ck("a low 'at least' is discarded", !r.after1.mrv || r.after1.mrv.length===0, JSON.stringify(r.after1));
  ck("a high one is kept", r.after2===1, String(r.after2));
  ck("and raises the calibration", r.cal>1, String(r.cal));
}

console.log("C2 - A CALIBRATED CEILING IS STILL CAPPED");
{
  const r = await p.evaluate(()=>{
    S.lmCal = {chest:{mev:1, mav:1, mrv:2.0, blocks:3, w:0.85}};
    S.lmFloor={}; S.lmMav={}; S.lmMrv={}; save();
    return {mrv: adjustedLandmarks(bodyAnalysis(), "chest").mrv, cap: CAL_MRV_HARD_MAX};
  });
  ck("never calibrated above 35", r.mrv <= r.cap, JSON.stringify(r));
}

console.log(errs.length? "  BROKEN page errors :: "+errs.join(" | ") : "  ok  no page errors");
if(errs.length) bad++;
console.log(bad? ("  "+bad+" broken") : "  all good");
await b.close();
