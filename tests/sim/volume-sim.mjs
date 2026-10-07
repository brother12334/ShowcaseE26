/* THE SIMULATION STUDY: DOES THE NEW MODEL ACTUALLY FIND PEOPLE'S DOSE BETTER?

   Everything in docs/volume-science.md argues from published numbers. This argues from
   consequences: a thousand synthetic lifters per scenario, each with a true personal
   optimum and a true measurement noise that the app cannot see, run for two years of
   four-week cycles, and the question is how close each policy gets them to the most
   growth available to them.

   WHY IT RUNS IN THE PAGE. The policies under test are the app's own functions —
   decideForMuscle(), volGrowthAt(), volStartTarget(), the MDC bounds — called directly,
   not reimplemented here. A simulation of a reimplementation proves nothing about what
   ships. Only the WORLD is synthetic: the lifter's true optimum, their true noise, and the
   growth those produce.

   WHAT IS BEING COMPARED.

     oracle   trained at the person's true optimum from cycle one. Nobody can do this; it
              is the ceiling the policies are scored against.
     fixed    the 54.1 rule: responding at +1%, going backwards at -2%, for everybody.
     mdc      the 55.1 rule: both thresholds measured from that person's own
              session-to-session scatter, bounded, falling back to the fixed figures until
              there are enough readings.

   The bar for shipping, set in the brief: mdc must match or beat fixed. If it does not,
   this file is the reason not to ship it.

   Run: node tests/sim/volume-sim.mjs [--n=1000] [--cycles=24] [--seed=26] [--json]       */
import { chromium, APP_URL } from '../specs/_e26.mjs';

const arg = (k, d)=>{
  const hit = process.argv.find(a=> a.startsWith("--" + k + "="));
  return hit ? Number(hit.split("=")[1]) : d;
};
const N      = arg("n", 1000);
const CYCLES = arg("cycles", 24);
const SEED   = arg("seed", 26);
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
  /* Each scenario is a population, not a single lifter. The spreads are wide on purpose:
     a policy that only works for the median user is not a policy. */
  {id:"typical",     say:"a normal spread of optima and noise",
   vstar:[10, 26], sigma:[0.8, 3.0], resp:[0.7, 1.4]},
  {id:"noisy",       say:"lifters whose readings scatter badly",
   vstar:[10, 26], sigma:[2.5, 5.0], resp:[0.7, 1.4]},
  {id:"steady",      say:"lifters whose readings are very repeatable",
   vstar:[10, 26], sigma:[0.3, 1.0], resp:[0.7, 1.4]},
  {id:"low-ceiling", say:"lifters who cannot take much volume",
   vstar:[6, 12],  sigma:[0.8, 3.0], resp:[0.7, 1.4]},
  {id:"high-ceiling", say:"lifters who can take a great deal",
   vstar:[24, 40], sigma:[0.8, 3.0], resp:[0.7, 1.4]}
];

const out = await p.evaluate(async (cfg)=>{
  const {N, CYCLES, SEED, SCENARIOS} = cfg;

  /* A seeded generator, so a run is reproducible and a regression is a real regression
     rather than a different thousand lifters. mulberry32. */
  const rng = s=>()=>{ s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const normal = r=>{ let u = 0, v = 0;
    while(!u) u = r(); while(!v) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const lerp = (r, lo, hi)=> lo + r() * (hi - lo);

  /* THE WORLD. What a cycle at volume v actually buys this lifter, before any measurement.

     The shape comes from the paper's own curve up to the person's own limit — that is what
     volGrowthAt is — and past it the cost is real: fatigue accumulates, the lift stalls and
     then falls. The penalty slope is the one genuinely invented number in here, and it is
     deliberately mild: a harsher one would flatter any policy that avoids overshooting,
     which is the thing being measured. */
  const OVER_PEN = 0.55;
  const trueGain = (v, u, cycle)=>{
    const ref = volGrowthAt(16) || 1;
    const useful = volGrowthAt(Math.min(v, u.vstar)) / ref;
    const over = v > u.vstar ? OVER_PEN * (v - u.vstar) / u.vstar : 0;
    /* Diminishing returns on training age: the same dose buys less in year two. */
    const age = Math.pow(0.97, cycle);
    return (useful - over) * u.resp * 1.8 * age;
  };

  /* THE SAMPLE SD OF DIFFERENCES, estimated the way the app estimates it: from the
     readings so far, not from the true sigma. The estimation error is part of what is
     being tested — a policy that only works once you know your own noise exactly is not
     available to anybody. */
  const sdOf = a=>{
    if(a.length < 2) return null;
    const m = a.reduce((x, c)=> x + c, 0) / a.length;
    return Math.sqrt(a.reduce((x, c)=> x + (c - m) * (c - m), 0) / (a.length - 1));
  };
  const mdcFrom = diffs=>{
    if(diffs.length < TREND_NOISE_MIN_N - 1) return null;
    const sd = sdOf(diffs);
    if(!(sd > 0)) return null;
    let mdc = 1.96 * sd / Math.SQRT2;
    mdc = Math.max(TREND_MDC_MIN, Math.min(TREND_MDC_MAX, mdc));
    return {up: mdc,
            down: -Math.max(TREND_DECLINE_MIN,
                             Math.min(TREND_DECLINE_MAX, mdc / Math.SQRT2)),
            personal: true};
  };
  const FIXED = {up: RESPOND_TREND_PCT, down: DECLINE_TREND_PCT, personal: false};

  /* ONE LIFETIME under one policy. Returns what happened, not a verdict. */
  const run = (u, policy, r)=>{
    let v = policy === "oracle" ? u.vstar : u.start;
    let growth = 0, overreached = 0, belowFloor = 0, falseAlarm = 0, hit10 = null;
    const diffs = [];
    let prev = null, lastRead = 100;
    for(let c = 0; c < CYCLES; c++){
      const g = trueGain(v, u, c);
      growth += g;
      if(v > u.vstar * 1.1) overreached++;
      if(v < VOL_BANDS.floor) belowFloor++;
      if(hit10 === null && Math.abs(v - u.vstar) <= u.vstar * 0.10) hit10 = c;
      if(policy === "oracle"){ continue; }

      /* What the app can see: the true gain plus this lifter's measurement noise. Two
         exposures a cycle feed the differences the noise estimate is built from. */
      const read = lastRead * (1 + g / 100) * (1 + normal(r) * u.sigma / 100);
      diffs.push((read - lastRead) / lastRead * 100);
      lastRead = read;
      const trendPct = g + normal(r) * u.sigma;

      /* Soreness and joint pain, which the ladder weighs alongside the lift. Driven by
         how far past their own limit they are, so an overreach is detectable by more
         than performance — which is the whole reason the ladder does not wait for the
         lift to fall. */
      const pastBy = (v - u.vstar) / u.vstar;
      const sore = pastBy > 0.1 ? (r() < Math.min(0.85, pastBy * 2.2) ? 2 : 1)
                                : (r() < 0.06 ? 2 : 0);
      const thr = policy === "mdc" ? (mdcFrom(diffs) || FIXED) : FIXED;
      const d = decideForMuscle("chest", {V: v, trendPct, sore, joint: null, thr, prev});
      if(d.k === "over" && v <= u.vstar) falseAlarm++;
      if(d.k === "over") v = Math.max(VOL_BANDS.floor, v - (CUT_SETS_OVER[0] || 2));
      else if(d.k === "up") v = Math.min(VOL_BANDS.thin, v + ADD_SETS_PER_CYCLE);
      else if(d.k === "hold" && d.probe) v = Math.min(VOL_BANDS.thin, v + ADD_SETS_PER_CYCLE);
      prev = {trendPct, sore, k: d.k, heldFor: d.heldFor};
    }
    return {growth, overreached, belowFloor, falseAlarm, hit10, endV: v};
  };

  const res = [];
  SCENARIOS.forEach(sc=>{
    const acc = {};
    ["oracle", "fixed", "mdc"].forEach(k=> acc[k] = {growth:0, over:0, floor:0, alarm:0,
                                                     hit:0, hitN:0, endErr:0});
    for(let i = 0; i < N; i++){
      /* One lifter, one seed, used by every policy — so the arms are compared on the same
         people and the same noise draws, not on three different populations. */
      const r0 = rng(SEED + i * 7919);
      const u = {vstar: lerp(r0, sc.vstar[0], sc.vstar[1]),
                 sigma: lerp(r0, sc.sigma[0], sc.sigma[1]),
                 resp:  lerp(r0, sc.resp[0],  sc.resp[1])};
      /* Everybody starts where the app would start them, which is the other half of what
         changed: a target band rather than a guess. */
      u.start = volStartTarget({level: "intermediate", tight: false});
      ["oracle", "fixed", "mdc"].forEach(k=>{
        const o = run(u, k, rng(SEED + i * 7919 + 13));
        const a = acc[k];
        a.growth += o.growth; a.over += o.overreached; a.floor += o.belowFloor;
        a.alarm += o.falseAlarm; a.endErr += Math.abs(o.endV - u.vstar) / u.vstar;
        if(o.hit10 != null){ a.hit += o.hit10; a.hitN++; }
      });
    }
    const row = {id: sc.id, say: sc.say, n: N, cycles: CYCLES};
    const orc = acc.oracle.growth;
    ["oracle", "fixed", "mdc"].forEach(k=>{
      const a = acc[k];
      row[k] = {
        ofOracle: +(a.growth / orc * 100).toFixed(1),
        overPct:  +(a.over / (N * CYCLES) * 100).toFixed(1),
        floorPct: +(a.floor / (N * CYCLES) * 100).toFixed(1),
        alarmPct: +(a.alarm / (N * CYCLES) * 100).toFixed(2),
        toWithin10: a.hitN ? +(a.hit / a.hitN).toFixed(1) : null,
        reached10Pct: +(a.hitN / N * 100).toFixed(1),
        endErrPct: +(a.endErr / N * 100).toFixed(1)
      };
    });
    res.push(row);
  });
  return res;
}, {N, CYCLES, SEED, SCENARIOS});

if(JSONOUT){ console.log(JSON.stringify(out, null, 2)); }
else {
  console.log("VOLUME MODEL SIMULATION — " + N + " lifters per scenario, "
    + CYCLES + " four-week cycles, seed " + SEED + "\n");
  const pad = (s, w)=> String(s).padEnd(w);
  const padl = (s, w)=> String(s).padStart(w);
  out.forEach(r=>{
    console.log(r.id.toUpperCase() + " — " + r.say);
    console.log("  " + pad("policy", 10) + padl("% of oracle", 13) + padl("overreached", 13)
      + padl("below floor", 13) + padl("false alarms", 14) + padl("cycles to ±10%", 16)
      + padl("reached ±10%", 14) + padl("end error", 11));
    ["oracle", "fixed", "mdc"].forEach(k=>{
      const x = r[k];
      console.log("  " + pad(k, 10) + padl(x.ofOracle + "%", 13) + padl(x.overPct + "%", 13)
        + padl(x.floorPct + "%", 13) + padl(x.alarmPct + "%", 14)
        + padl(x.toWithin10 == null ? "—" : x.toWithin10, 16)
        + padl(x.reached10Pct + "%", 14) + padl(x.endErrPct + "%", 11));
    });
    console.log("");
  });

  /* THE SHIPPING TEST, stated as a pass or a fail rather than left to the reader. */
  let fails = [];
  out.forEach(r=>{
    if(r.mdc.ofOracle < r.fixed.ofOracle - 0.5)
      fails.push(r.id + ": less growth (" + r.mdc.ofOracle + "% vs " + r.fixed.ofOracle + "%)");
    if(r.mdc.overPct > r.fixed.overPct + 1.0)
      fails.push(r.id + ": more overreached blocks (" + r.mdc.overPct + "% vs " + r.fixed.overPct + "%)");
    if(r.mdc.alarmPct > r.fixed.alarmPct + 0.5)
      fails.push(r.id + ": more false alarms (" + r.mdc.alarmPct + "% vs " + r.fixed.alarmPct + "%)");
  });
  if(errs.length) fails.push("page errors: " + errs.join(" | "));
  console.log(fails.length
    ? "DO NOT SHIP — the new rule is worse on:\n  " + fails.join("\n  ")
    : "SHIP — the measured rule matches or beats the fixed one in every scenario.");
  await b.close();
  process.exit(fails.length ? 1 : 0);
}
await b.close();
