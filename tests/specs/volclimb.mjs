/* THE ADAPTIVE CLIMB: THE LADDER, THE AIMED PULL-BACK, AND THE PEAK TEST.

   All three are implemented and NONE of them is enabled -- the simulation
   (tests/sim/volume-sim.mjs, written up in docs/volume-science.md 5G) rejected the ladder
   outright and left the peak test needing a judgement call. So the first thing these
   checks pin is that nothing changed for anybody, and the rest pin the mechanism against
   the numbers in the brief so that whoever turns it on is turning on what was specified.

   The caps are the part with a trial behind them (Scarpelli 2022, +20% relative to the
   lifter's own previous volume), so they are checked hardest. */
import { chromium, APP_URL } from './_e26.mjs';
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
const ev = (fn,a)=> p.evaluate(fn,a);

console.log("1 - NOTHING IS ENABLED, SO NOTHING CHANGED");
{
  const r = await ev(()=>{
    const d = (extra)=> decideForMuscle("chest",
      Object.assign({V: 18, trendPct: 3, sore: 0, joint: null, prev: null}, extra || {}));
    return {mode: VOL_CLIMB_MODE, live: volClimbMode(),
            noClimb: d().add, withClimb: d({climb: {streak: 5, lastRespondV: 12}}).add,
            flat: ADD_SETS_PER_CYCLE,
            overNoClimb: decideForMuscle("chest", {V: 30, trendPct: -5, sore: 2,
              joint: 3, prev: {trendPct: -5, sore: 2}}).backTo};
  });
  ck("the shipped mode is off", r.mode === "off", r.mode);
  ck("and that is what is live", r.live === "off", r.live);
  ck("A CALLER THAT PASSES NO CLIMB STATE GETS THE OLD FLAT STEP",
     r.noClimb === r.flat, r.noClimb + " vs " + r.flat);
  ck("and no back-off target, so the old cut still applies",
     r.overNoClimb === null, String(r.overNoClimb));
  ck("the bigger step only appears when climb state is passed in",
     r.withClimb > r.flat, String(r.withClimb));
}

console.log("2 - THE LADDER IS +1, +2, +3 AND RESETS");
{
  const r = await ev(()=> ({
    ladder: VOL_STEP_LADDER,
    s1: volStepFor(20, 1), s2: volStepFor(20, 2), s3: volStepFor(20, 3),
    s4: volStepFor(20, 4), s9: volStepFor(20, 9),
    /* a hold resets the streak, and the decision says so */
    holdStreak: decideForMuscle("chest", {V: 18, trendPct: 0.2, sore: 0, joint: null,
      prev: {trendPct: 0.2, k: "hold", heldFor: 1}, climb: {streak: 3}}).streak
  }));
  ck("the ladder is one, two, three", r.ladder.join(",") === "1,2,3", r.ladder.join(","));
  ck("the first responding cycle adds one", r.s1 === 1, String(r.s1));
  ck("the second adds two", r.s2 === 2, String(r.s2));
  ck("the third adds three", r.s3 === 3, String(r.s3));
  ck("AND IT NEVER CLIMBS PAST THREE", r.s4 === 3 && r.s9 === 3, r.s4 + "/" + r.s9);
  ck("a flat cycle puts the streak back to nothing", r.holdStreak === 0, String(r.holdStreak));
}

console.log("3 - THE CAPS, WHICH ARE THE PART WITH A TRIAL BEHIND THEM");
{
  const r = await ev(()=>{
    const out = [];
    /* Every volume from the floor to the top of the evidence, at a streak long enough to
       want the biggest step. If the cap holds here it holds everywhere. */
    for(let v = 4; v <= 43; v++) out.push({v, step: volStepFor(v, 9)});
    return {caps: VOL_CAPS, out};
  });
  ck("the relative cap is a fifth, from Scarpelli 2022", r.caps.frac === 0.20,
     String(r.caps.frac));
  ck("and the absolute cap is three sets", r.caps.steps === 3, String(r.caps.steps));
  const overSets = r.out.filter(x=> x.step > 3);
  ck("NO VOLUME ANYWHERE PRODUCES A STEP OVER THREE SETS", overSets.length === 0,
     overSets.map(x=> x.v + "->" + x.step).join(", "));
  /* The relative cap cannot bind below five sets, because sets are whole numbers and one
     set out of four is 25%. Checked as a bounded, named exception rather than ignored. */
  const overFrac = r.out.filter(x=> x.step / x.v > 0.20 + 1e-9);
  ck("and none over a fifth, at five sets or more",
     overFrac.every(x=> x.v < 5), overFrac.map(x=> x.v + "->" + x.step).join(", "));
  ck("BELOW FIVE SETS ONE WHOLE SET IS THE SMALLEST MOVE THERE IS, and that is the only "
     + "exception", overFrac.every(x=> x.step === 1), JSON.stringify(overFrac));
  ck("a muscle at the floor can still grow", r.out[0].step === 1, String(r.out[0].step));
}

console.log("4 - COMING DOWN AIMS AT THE BRACKET, NOT A FLAT CUT");
{
  const r = await ev(()=> ({
    /* responding at 20, now over at 30: halfway back is 25 */
    bracketed: volBackoffTo(30, 20),
    /* nothing on record: a fifth less */
    blind: volBackoffTo(30, 0),
    frac: VOL_BACKOFF_FRAC,
    /* a stale record at or above where we are is not a bracket */
    stale: volBackoffTo(20, 24),
    /* and it never goes under the floor */
    floor: volBackoffTo(4.5, 0), bands: VOL_BANDS.floor,
    say: decideForMuscle("chest", {V: 30, trendPct: -6, sore: 2, joint: 3,
      prev: {trendPct: -6, sore: 2}, climb: {streak: 0, lastRespondV: 20}}).logSay
  }));
  ck("halfway between what worked and where we are", r.bracketed === 25, String(r.bracketed));
  ck("the fall-back is the same fifth, read downwards", r.frac === 0.20, String(r.frac));
  ck("with no working volume on record it steps down a fifth", r.blind === 24, String(r.blind));
  ck("a record that is not below us is not a bracket", r.stale === 16, String(r.stale));
  ck("AND IT NEVER GOES UNDER THE FLOOR", r.floor >= r.bands, r.floor + " vs " + r.bands);
  ck("and it says what it did, in the person's own numbers",
     /back to 25/.test(r.say || "") && /20/.test(r.say || ""), r.say);
}

console.log("5 - THE PEAK TEST ASKS A DIFFERENT QUESTION FROM THE OVERREACH CHECK");
{
  const r = await ev(()=>{
    const thr = {up: 1.0, down: -2.0, personal: false};
    const steady = {up: 0.75, down: -1.5, personal: true};
    return {
      /* more volume, response materially worse: past the top */
      past: volPastPeak(24, 1.0, 20, 4.0, thr),
      /* more volume, response barely different: not past it */
      not: volPastPeak(24, 3.6, 20, 4.0, thr),
      /* LESS volume than last time tells you nothing about a peak */
      down: volPastPeak(16, 1.0, 20, 4.0, thr),
      /* no history, no call */
      cold: volPastPeak(24, 1.0, 0, null, thr),
      /* THE RELATIVE MARGIN, CHECKED WHERE IT ACTUALLY BINDS. A quarter of a +3% response
         is 0.75%, which is exactly the bar's floor -- so at ordinary response sizes the
         relative term does nothing, and the first version of this check wrongly asserted
         that it did. It only takes over on a large response: a quarter of +8% is 2%, so a
         drop to +6.5% is inside the margin and is NOT a peak, where the bar alone would
         have called it one. */
      bigNotPeak: volPastPeak(24, 6.5, 20, 8.0, steady),
      bigBarWouldFire: 6.5 < 8.0 - steady.up,
      smallIsPeak: volPastPeak(24, 2.1, 20, 3.0, steady)
    };
  });
  ck("a real drop in response after adding sets is past the peak", r.past === true, "");
  ck("a trivial one is not", r.not === false, "");
  ck("coming DOWN in volume says nothing about a peak", r.down === false, "");
  ck("and it never fires without a previous cycle to compare", r.cold === false, "");
  ck("ON A BIG RESPONSE THE RELATIVE MARGIN TAKES OVER FROM THE BAR",
     r.bigNotPeak === false && r.bigBarWouldFire === true,
     "past=" + r.bigNotPeak + " barWouldFire=" + r.bigBarWouldFire);
  ck("at ordinary response sizes the bar is what decides, and the quarter is inert",
     r.smallIsPeak === true, String(r.smallIsPeak));
}

console.log("6 - AND THE START POINT PREFERS THE PERSON'S OWN HISTORY");
{
  const r = await ev(()=> ({
    own: volStartTarget({own: 20}),
    step: VOL_OWN_STEP,
    newUser: volStartTarget({level: "intermediate", tight: false}),
    tiny: volStartTarget({own: 2}),
    huge: volStartTarget({own: 60}),
    bands: {floor: VOL_BANDS.floor, expensive: VOL_BANDS.expensive}
  }));
  ck("somebody already doing twenty starts above twenty", r.own > 20, String(r.own));
  ck("by the documented step", Math.abs(r.own - 20 * r.step) < 0.06,
     r.own + " vs " + (20 * r.step));
  ck("a new user gets the population target instead", r.newUser >= 10 && r.newUser <= 18,
     String(r.newUser));
  ck("and the own-history start is still bounded both ways",
     r.tiny >= r.bands.floor && r.huge <= r.bands.expensive, r.tiny + ".." + r.huge);
}

console.log("7 - THE HARD PER-SESSION STOP IS SEPARATE FROM THE ADVISORY ONE");
{
  const r = await ev(()=> ({hard: VOL_SESSION_HARD_MAX, soft: SESSION_SETS_INFO}));
  ck("ten sets for one muscle in one session is the hard stop", r.hard === 10, String(r.hard));
  ck("six is where the evidence thins, and stays advisory", r.soft === 6, String(r.soft));
  ck("AND THEY ARE NOT THE SAME NUMBER, deliberately", r.hard > r.soft, "");
}

console.log("8 - NOTHING THREW");
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
