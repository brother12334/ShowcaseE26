/* THE SIMULATION STUDY: DOES THE MODEL FIND PEOPLE'S DOSE, AND HOW FAST?

   Everything in docs/volume-science.md argues from published numbers. This argues from
   consequences: synthetic lifters with a true best volume and a true recovery limit that
   the app cannot see, run for two years of four-week cycles, scored against the most
   growth available to them.

   WHY IT RUNS IN THE PAGE. The policies under test are the app's own functions --
   decideForMuscle(), volGrowthAt(), volStartTarget(), volStepFor(), volBackoffTo(), the
   MDC bounds -- called directly, not reimplemented here. A simulation of a
   reimplementation proves nothing about what ships. Only the WORLD is synthetic.

   TWO NUMBERS, NOT ONE. The first version of this file had a single `vstar` doing two
   jobs: the volume where growth flattens AND the volume past which fatigue accrues. That
   is wrong, and wrong in a way that hid a real bug. "Overreached" was measured as 10% past
   the flattening point, which the climb-until-signal ladder is DESIGNED to visit, so it
   read 50% for typical lifters and 75% for low-ceiling ones -- alarming numbers describing
   something that was mostly harmless. Worse, the penalty slope was so mild (0.55) that
   being over never produced a detectable decline, so a lifter could sit 20% above their
   best for all 24 blocks and nothing ever pulled them back. The audit that found this is
   written up in docs/volume-science.md 5F.

   So a lifter now has:

     vbest    the volume where their growth curve flattens. More buys nothing extra. This
              is what the oracle trains at and what "within 10%" is measured against.
     vlimit   the volume past which they stop recovering, which is HIGHER than vbest by a
              per-lifter slack. Between the two they are working harder for nothing but
              taking no damage; past vlimit they accumulate fatigue and go backwards.

   "Overreached" now means v > vlimit. Strictly: past what they can recover from, no fudge
   factor, because vlimit already IS the limit.

   Run: node tests/sim/volume-sim.mjs [--n=1000] [--cycles=24] [--seed=26] [--json]      */
import { chromium, APP_URL } from '../specs/_e26.mjs';

const arg = (k, d)=>{
  const hit = process.argv.find(a=> a.startsWith("--" + k + "="));
  return hit ? Number(hit.split("=")[1]) : d;
};
const N       = arg("n", 1000);
const CYCLES  = arg("cycles", 24);
const SEED    = arg("seed", 26);
const JSONOUT = process.argv.includes("--json");

const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
const errs = []; p.on('pageerror', e=> errs.push(e.message)); p.on('dialog', d=> d.accept());
await p.route(/^https?:/, r=> r.abort());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Sim',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL, {waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});

const SCENARIOS = [
  /* Each scenario is a population, not a lifter. The spreads are wide on purpose: a policy
     that only works for the median user is not a policy. `slack` is how far above vbest
     this person can still recover. */
  {id:"typical",      say:"a normal spread of bests, limits and noise",
   vbest:[10, 26], slack:[0.15, 0.45], sigma:[0.8, 3.0], resp:[0.7, 1.4]},
  {id:"noisy",        say:"lifters whose readings scatter badly",
   vbest:[10, 26], slack:[0.15, 0.45], sigma:[2.5, 5.0], resp:[0.7, 1.4]},
  {id:"steady",       say:"lifters whose readings are very repeatable",
   vbest:[10, 26], slack:[0.15, 0.45], sigma:[0.3, 1.0], resp:[0.7, 1.4]},
  {id:"low-ceiling",  say:"lifters who cannot take much volume",
   vbest:[6, 12],  slack:[0.10, 0.30], sigma:[0.8, 3.0], resp:[0.7, 1.4]},
  {id:"high-ceiling", say:"lifters who can take a great deal",
   vbest:[24, 40], slack:[0.15, 0.45], sigma:[0.8, 3.0], resp:[0.7, 1.4]}
];

const POLICIES = ["oracle", "fixed", "mdc", "mdc-own", "adaptive", "peak"];

const out = await p.evaluate(async (cfg)=>{
  const {N, CYCLES, SEED, SCENARIOS, POLICIES} = cfg;

  const rng = s=>()=>{ s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const normal = r=>{ let u = 0, v = 0;
    while(!u) u = r(); while(!v) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const lerp = (r, lo, hi)=> lo + r() * (hi - lo);

  /* THE ONE INVENTED NUMBER IN THIS FILE, STATED AS A FALSIFIABLE CLAIM.

     Past the recovery limit, a block returns a FRACTION of what it would otherwise have
     returned, and past far enough it returns less than nothing:

       10% past the limit -> half the gain
       20% past           -> no gain at all
       25% past           -> losing ground

     That is OVER_PEN = 5.0, and it is the clinical picture of overreaching rather than a
     measured slope: strength going backwards while working harder than ever. It is
     deliberately steep enough to be DETECTABLE, because the old 0.55 was not, and a limit
     the app cannot feel is a limit it can never learn. If this slope is wrong, every
     "overreached" figure below moves with it -- so it is the first thing to challenge. */
  const OVER_PEN = 5.0;
  const trueGain = (v, u, cycle)=>{
    const ref = volGrowthAt(16) || 1;
    const useful = volGrowthAt(Math.min(v, u.vbest)) / ref;
    const past = v > u.vlimit ? (v - u.vlimit) / u.vlimit : 0;
    const age = Math.pow(0.97, cycle);          // the same dose buys less in year two
    return useful * (1 - OVER_PEN * past) * u.resp * 1.8 * age;
  };

  const sdOf = a=>{
    if(a.length < 2) return null;
    const m = a.reduce((x, c)=> x + c, 0) / a.length;
    return Math.sqrt(a.reduce((x, c)=> x + (c - m) * (c - m), 0) / (a.length - 1));
  };
  /* Estimated the way the app estimates it: from the readings so far, not from the true
     sigma. The estimation error is part of what is being tested. */
  const mdcFrom = diffs=>{
    if(diffs.length < TREND_NOISE_MIN_N - 1) return null;
    const sd = sdOf(diffs);
    if(!(sd > 0)) return null;
    const mdc = Math.max(TREND_MDC_MIN, Math.min(TREND_MDC_MAX, 1.96 * sd / Math.SQRT2));
    return {up: mdc,
            down: -Math.max(TREND_DECLINE_MIN, Math.min(TREND_DECLINE_MAX, mdc / Math.SQRT2)),
            personal: true};
  };
  const FIXED = {up: RESPOND_TREND_PCT, down: DECLINE_TREND_PCT, personal: false};

  const run = (u, policy, r)=>{
    const adaptive = policy === "adaptive" || policy === "peak";
    /* "peak" is the same ladder with a different STOP SIGNAL. The specified ladder climbs
       until the lifter breaks down, and breakdown sits well above the volume where growth
       stops rising -- so every climb-until-signal policy ends 25-50% past the best. This
       one stops when ADDING SETS STOPS IMPROVING THE RESPONSE, which is the definition of
       the best, and comes back to the last volume that was better. See 5G. */
    const peak = policy === "peak";
    const ownStart = adaptive || policy === "mdc-own";
    let v = policy === "oracle" ? u.vbest
          : ownStart ? volStartTarget({own: u.ownV})
                     : volStartTarget({level: "intermediate", tight: false});
    let growth = 0, over = 0, belowFloor = 0, falseAlarm = 0, hit10 = null;
    let maxJump = 0, maxJumpFrac = 0, bigJump = 0, bigFrac = 0, smallFrac = 0, jumps = 0;
    let overRun = 0, overRunMax = 0, overDepth = 0;
    const diffs = [];
    let prev = null, lastRead = 100;
    /* The climb state the adaptive policy carries, which is exactly what S.volClimb[g]
       holds in the app. */
    let streak = 0, lastRespondV = 0, flatV = 0, prevV = 0, prevTrend = null;

    for(let c = 0; c < CYCLES; c++){
      const g = trueGain(v, u, c);
      growth += g;
      if(v > u.vlimit){
        over++; overRun++; overDepth += (v - u.vlimit) / u.vlimit;
        if(overRun > overRunMax) overRunMax = overRun;
      } else overRun = 0;
      if(v < VOL_BANDS.floor) belowFloor++;
      if(hit10 === null && Math.abs(v - u.vbest) <= u.vbest * 0.10) hit10 = c;
      if(policy === "oracle") continue;

      const read = lastRead * (1 + g / 100) * (1 + normal(r) * u.sigma / 100);
      diffs.push((read - lastRead) / lastRead * 100);
      lastRead = read;
      const trendPct = g + normal(r) * u.sigma;

      /* Soreness and joint pain, driven by how far past the RECOVERY LIMIT they are --
         not past their best. Between best and limit a lifter is wasting effort, not
         breaking down, and should not report as if they were. */
      const pastBy = (v - u.vlimit) / u.vlimit;
      const sore = pastBy > 0 ? (r() < Math.min(0.85, 0.25 + pastBy * 2.2) ? 2 : 1)
                              : (r() < 0.06 ? 2 : 0);
      const thr = policy === "fixed" ? FIXED : (mdcFrom(diffs) || FIXED);
      const climb = adaptive ? {streak, lastRespondV: peak && flatV > 0 ? flatV : lastRespondV} : null;
      const d = decideForMuscle("chest", {V: v, trendPct, sore, joint: null, thr, prev, climb});
      if(d.k === "over" && v <= u.vlimit) falseAlarm++;

      const was = v;
      /* THE PEAK TEST. If the last cycle added volume and the response got materially
         WORSE for it -- by more than the detection bar, so it is not noise -- then the
         best is behind us, at the volume we came from. */
      let passedPeak = false;
      /* THE MARGIN IS THE DETECTION BAR OR A QUARTER OF THE RESPONSE, WHICHEVER IS
         BIGGER. The bar alone is too tight for a steady lifter: their bar is about 0.8%,
         so a real but trivial dip from +3.0% to +2.1% reads as "past the peak" when they
         are still gaining nearly as fast as before. Requiring the response to have
         dropped by at least a quarter makes the test about the SIZE of the loss rather
         than only about its detectability. Measured: it is what steady needs, and it
         costs the other populations nothing. */
      const peakMargin = Math.max(thr.up, 0.25 * Math.max(0, prevTrend || 0));
      if(peak && prevV > 0 && was > prevV && prevTrend != null
         && trendPct < prevTrend - peakMargin){
        /* ONE STRIKE, NOT TWO -- AND THE ASYMMETRY IS THE REASON.

           The decline check needs two consecutive blocks because it is a DAMAGE signal:
           acting on noise there means cutting somebody's volume for no reason, so the
           cost of a false positive is high and patience is cheap. This is not a damage
           signal. It says "the top of your curve is behind you", and the cost of a false
           NEGATIVE is a whole cycle spent above the optimum buying nothing -- every
           cycle, until it fires. Requiring two strikes was measured and it gave the whole
           benefit back: typical fell from 85.6% of oracle to 67.2%, and the arm became
           indistinguishable from the ladder it was meant to improve on.

           Being wrong here costs one cycle at one lower volume, and the climb resumes the
           moment the response picks up again. That is a cheap mistake, so it is made
           quickly. */
        passedPeak = true;
        if(!(flatV > 0) || prevV < flatV) flatV = prevV;
      }
      prevV = was; prevTrend = trendPct;
      if(passedPeak && d.k !== "over"){
        /* Come back to what was working and hold there. Not a cut for damage -- a
           correction for having gone past the top of the curve. */
        streak = 0;
        v = Math.max(VOL_BANDS.floor, flatV > 0 ? flatV : was - 1);
        const jj = v - was;
        if(jj > 0){ jumps++; if(jj > maxJump) maxJump = jj; }
        prev = {trendPct, sore, k: "hold", heldFor: 1};
        continue;
      }
      if(d.k === "over"){
        v = adaptive ? volBackoffTo(v, lastRespondV)
                     : Math.max(VOL_BANDS.floor, v - (CUT_SETS_OVER[0] || 2));
        streak = 0;
      } else if(d.k === "up"){
        /* AND THE PEAK ESTIMATE IS NOT WITHDRAWN ONCE MADE -- which was tested, because
           an estimate that cannot be revised by later evidence sounds indefensible.

           Letting a later "responding" cycle at or above the supposed peak withdraw the
           call measured WORSE for four of the five populations: typical 85.7% -> 82.6% of
           oracle, steady 75.5% -> 70%, low-ceiling 71.7% -> 66%. Only high-ceiling gained
           (91.3% -> 92.1%). Withdrawing the call lets the climb go back past the top of
           the curve, and the trend near the top is flat enough that "responding" there is
           often noise. The irreversible version acts as a learned ceiling, and keeping
           people near their best is worth more than rescuing the minority pinned a little
           under it. Recorded rather than quietly chosen, because the intuition was wrong
           and the next person will have it too. */
        streak++;
        lastRespondV = was;
        v = Math.min(VOL_BANDS.thin, v + (adaptive ? volStepFor(was, streak)
                                                   : ADD_SETS_PER_CYCLE));
      } else if(d.k === "hold" && d.probe){
        streak = 0;                                  // a flat block resets the ladder
        if(!(flatV > 0) || was < flatV) flatV = was;
        v = Math.min(VOL_BANDS.thin, v + ADD_SETS_PER_CYCLE);
      } else if(d.k === "hold"){
        streak = 0;
        if(!(flatV > 0) || was < flatV) flatV = was;
      }
      const jump = v - was;
      if(jump > 0){
        jumps++;
        if(jump > maxJump) maxJump = jump;
        const frac = jump / was;
        if(frac > maxJumpFrac) maxJumpFrac = frac;
        if(jump > VOL_CAPS.steps + 1e-9) bigJump++;
        /* THE RELATIVE CAP CANNOT BIND BELOW FIVE SETS, because sets are whole numbers and
           one set out of four is 25%. Counted separately rather than waved away: a breach
           at 5 sets or more is a real cap failure, a breach below that is integer
           granularity and the only alternative is refusing to let a small muscle grow. */
        if(frac > VOL_CAPS.frac + 1e-9){ if(was >= 5) bigFrac++; else smallFrac++; }
      }
      prev = {trendPct, sore, k: d.k, heldFor: d.heldFor};
    }
    return {growth, over, belowFloor, falseAlarm, hit10, endV: v,
            endOfBest: v / u.vbest, endOfLimit: v / u.vlimit,
            maxJump, maxJumpFrac, bigJump, bigFrac, smallFrac, jumps, overRunMax,
            overDepth: over ? overDepth / over : 0};
  };

  const res = [];
  SCENARIOS.forEach(sc=>{
    const acc = {};
    POLICIES.forEach(k=> acc[k] = {growth:0, over:0, floor:0, alarm:0, hit:0, hitN:0,
                                   endErr:0, maxJump:0, maxFrac:0, bigJump:0, bigFrac:0,
                                   jumps:0, runMax:0, depth:0, depthN:0});
    for(let i = 0; i < N; i++){
      /* One lifter, one seed, shared by every policy -- so the arms are compared on the
         same people and the same noise draws. */
      const r0 = rng(SEED + i * 7919);
      const vbest = lerp(r0, sc.vbest[0], sc.vbest[1]);
      const u = {vbest,
                 vlimit: vbest * (1 + lerp(r0, sc.slack[0], sc.slack[1])),
                 sigma:  lerp(r0, sc.sigma[0], sc.sigma[1]),
                 resp:   lerp(r0, sc.resp[0],  sc.resp[1]),
                 /* What this person has ACTUALLY been doing before the app saw them:
                    somewhere between half and a little over their best. Correlated with
                    their ceiling but far from equal to it, which is the whole reason
                    starting from it is a guess worth making rather than a cheat. */
                 ownV: Math.max(VOL_BANDS.floor, vbest * lerp(r0, 0.50, 1.10))};
      POLICIES.forEach(k=>{
        const o = run(u, k, rng(SEED + i * 7919 + 13));
        const a = acc[k];
        a.growth += o.growth; a.over += o.over; a.floor += o.belowFloor;
        a.alarm += o.falseAlarm; a.endErr += Math.abs(o.endV - u.vbest) / u.vbest;
        a.bigJump += o.bigJump; a.bigFrac += o.bigFrac; a.jumps += o.jumps;
        a.smallFrac = (a.smallFrac || 0) + o.smallFrac;
        if(o.maxJump > a.maxJump) a.maxJump = o.maxJump;
        if(o.maxJumpFrac > a.maxFrac) a.maxFrac = o.maxJumpFrac;
        if(o.overRunMax > a.runMax) a.runMax = o.overRunMax;
        if(o.over){ a.depth += o.overDepth; a.depthN++; }
        a.ofBest = (a.ofBest || 0) + o.endOfBest;
        a.ofLimit = (a.ofLimit || 0) + o.endOfLimit;
        if(o.hit10 != null){ a.hit += o.hit10; a.hitN++; }
      });
    }
    const row = {id: sc.id, say: sc.say, n: N, cycles: CYCLES};
    const orc = acc.oracle.growth;
    POLICIES.forEach(k=>{
      const a = acc[k];
      row[k] = {
        ofOracle: +(a.growth / orc * 100).toFixed(1),
        overPct:  +(a.over / (N * CYCLES) * 100).toFixed(1),
        floorPct: +(a.floor / (N * CYCLES) * 100).toFixed(1),
        alarmPct: +(a.alarm / (N * CYCLES) * 100).toFixed(2),
        toWithin10: a.hitN ? +(a.hit / a.hitN).toFixed(1) : null,
        reached10Pct: +(a.hitN / N * 100).toFixed(1),
        endErrPct: +(a.endErr / N * 100).toFixed(1),
        maxJump: +a.maxJump.toFixed(2),
        maxFracPct: +(a.maxFrac * 100).toFixed(1),
        bigJumpPct: a.jumps ? +(a.bigJump / a.jumps * 100).toFixed(2) : 0,
        bigFracPct: a.jumps ? +(a.bigFrac / a.jumps * 100).toFixed(2) : 0,
        smallFracPct: a.jumps ? +((a.smallFrac || 0) / a.jumps * 100).toFixed(2) : 0,
        overRunMax: a.runMax,
        overDepthPct: a.depthN ? +(a.depth / a.depthN * 100).toFixed(1) : 0,
        endOfBest: +((a.ofBest || 0) / N * 100).toFixed(0),
        endOfLimit: +((a.ofLimit || 0) / N * 100).toFixed(0)
      };
    });
    res.push(row);
  });
  return {res, errs: [], caps: {steps: VOL_CAPS.steps, frac: VOL_CAPS.frac}};
}, {N, CYCLES, SEED, SCENARIOS, POLICIES});

const R = out.res, CAPS = out.caps;
if(JSONOUT){ console.log(JSON.stringify(R, null, 2)); }
else {
  const pad = (s, w)=> String(s).padEnd(w), padl = (s, w)=> String(s).padStart(w);
  console.log("VOLUME MODEL SIMULATION — " + N + " lifters per scenario, "
    + CYCLES + " four-week cycles, seed " + SEED);
  console.log("\"overreached\" = above the lifter's true RECOVERY LIMIT, which is above "
    + "their best.\n");
  R.forEach(r=>{
    console.log(r.id.toUpperCase() + " — " + r.say);
    console.log("  " + pad("policy", 10) + padl("% oracle", 10) + padl("overreach", 11)
      + padl("depth", 8) + padl("run max", 9) + padl("alarms", 8)
      + padl("to ±10%", 9) + padl("reached", 9) + padl("max jump", 10)
      + padl("max %", 8) + padl(">3 sets", 9) + padl(">20%", 7)
      + padl("end/best", 10) + padl("end/limit", 11));
    POLICIES.forEach(k=>{
      const x = r[k];
      console.log("  " + pad(k, 10) + padl(x.ofOracle + "%", 10) + padl(x.overPct + "%", 11)
        + padl("+" + x.overDepthPct + "%", 8) + padl(x.overRunMax, 9)
        + padl(x.alarmPct + "%", 8)
        + padl(x.toWithin10 == null ? "—" : x.toWithin10, 9)
        + padl(x.reached10Pct + "%", 9) + padl(x.maxJump, 10)
        + padl(x.maxFracPct + "%", 8) + padl(x.bigJumpPct + "%", 9)
        + padl(x.bigFracPct + "%", 7)
        + padl(x.endOfBest + "%", 10) + padl(x.endOfLimit + "%", 11));
    });
    console.log("");
  });

  /* THE SHIPPING GATES, exactly as specified, as a pass or a fail. */
  const fails = [];
  const base = "mdc";                       // what is live today
  const cand = (process.argv.find(a=> a.startsWith("--gate=")) || "--gate=peak").split("=")[1];
  console.log("GATES APPLIED TO: " + cand + "   (baseline: " + base + ")\n");
  R.forEach(r=>{
    const a = r[cand], m = r[base];
    /* Caps are absolute: a single breach anywhere fails, whatever the averages say. */
    if(a.maxJump > CAPS.steps + 1e-9)
      fails.push(r.id + ": a jump of " + a.maxJump + " sets broke the " + CAPS.steps + "-set cap");
    if(a.bigJumpPct > 0)
      fails.push(r.id + ": " + a.bigJumpPct + "% of jumps exceeded " + CAPS.steps + " sets");
    if(a.bigFracPct > 0)
      fails.push(r.id + ": " + a.bigFracPct + "% of jumps exceeded " + (CAPS.frac * 100) + "%");
    if(r.id === "high-ceiling"){
      if(a.reached10Pct < 80)
        fails.push("high-ceiling: only " + a.reached10Pct + "% reached ±10% (need 80)");
      if(a.ofOracle < m.ofOracle + 3)
        fails.push("high-ceiling: growth did not rise clearly ("
          + a.ofOracle + "% vs " + m.ofOracle + "%)");
    }
    if(a.ofOracle < m.ofOracle - 0.5)
      fails.push(r.id + ": less growth (" + a.ofOracle + "% vs " + m.ofOracle + "%)");
    if(a.overPct > m.overPct + 1.0)
      fails.push(r.id + ": more overreached blocks (" + a.overPct + "% vs " + m.overPct + "%)");
    if(a.alarmPct > m.alarmPct + 0.5)
      fails.push(r.id + ": more false alarms (" + a.alarmPct + "% vs " + m.alarmPct + "%)");
  });
  if(errs.length) fails.push("page errors: " + errs.join(" | "));
  console.log(fails.length
    ? "DO NOT SHIP — " + cand + " is worse on:\n  " + fails.join("\n  ")
    : "SHIP — " + cand + " clears every gate in every scenario.");
  await b.close();
  process.exit(fails.length ? 1 : 0);
}
await b.close();
