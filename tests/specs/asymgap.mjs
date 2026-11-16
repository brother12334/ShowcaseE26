import { chromium, APP_URL } from './_e26.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
/* P1-8 — THE ASYMMETRY RULE RETIRED CHECKS THAT WERE STILL REAL.

   From the Nov 15 2026 audit, and now from the user's own 72-session export:

     Preacher Curl: the left side is weaker in 9 of 9 sessions, by about 28%, and it
     stays weaker regardless of which arm goes first (Oct 7, left first: L 10 vs R 13.5;
     Oct 17, right first: L 6.5 vs R 11). The app retired the check on Oct 6 and told the
     user "All movements are level".

     Standing Cable Hip Abduction: left weaker in 6 of 7 sessions by about 22%. Retired
     Sep 22.

   Three faults, all in sideStats():

     1. balancedWindow() kept only the newest run of sessions whose OPENING sides
        balance, and threw the rest away. That is the guard that retired a nine-rep gap:
        it was protecting against positional bias by discarding most of the evidence,
        and this user's own numbers show the gap survives the opening side flipping.
     2. Every set of every session was pooled into two means, so different loads and
        different sessions were mixed into one comparison.
     3. The gap was an absolute difference in reps against a flat two-rep threshold, so
        it meant different things on a movement done for 6 and one done for 20, and the
        direction of the gap was never checked for consistency at all.

   The last is what separates a real asymmetry from noise, and it is why the audit's
   expected answers cannot be reached on magnitude alone. On this user's data the
   Pulldown and the Hammer Curl swing both ways between sessions - sometimes the left is
   30% ahead, sometimes 30% behind - while the Preacher Curl and the Hip Abduction are
   reliably one-sided. A limb that is sometimes weaker and sometimes stronger is set
   order and measurement noise, not an asymmetry worth training around. */
const here = dirname(fileURLToPath(import.meta.url));
const REAL = JSON.parse(readFileSync(join(here, '..', 'fixtures', 'sides-2026-11-15.json'), 'utf8'));
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1200}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok   ":"  BROKEN ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
const ev=(fn,a)=>p.evaluate(fn,a);

await ev(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, rpe:true, sides:"matchWeaker"});
  S.splitId=DEFAULT_SPLIT; applySplit(); S.active=null;
  save();
});

/* The real export, replayed. Sides are logged one per set and written explicitly, which
   is what the report records; `startSide` is the side that session opened on. */
const loadReal = ()=> ev(real=>{
  S.sessions = real.map((sn, i)=> ({
    id: "r" + i, workoutId: DAYS[i % DAYS.length], date: sn.date,
    startedAt: Date.parse(sn.date + "T18:00:00"),
    finishedAt: Date.parse(sn.date + "T19:00:00"), feel: 4,
    entries: Object.keys(sn.ex).map(name=> ({
      name, reps: "8-14", rpe: "7-9", startSide: sn.ex[name][0].side,
      sets: sn.ex[name].map(st=> ({weight: st.w == null ? "" : String(st.w),
        reps: st.reps == null ? "" : String(st.reps),
        rpe: st.rpe == null ? "" : String(st.rpe), side: st.side, done: true}))
    }))
  }));
  /* Every sided movement in the plan, so unilateralInPlan() sees them all. */
  const names = [...new Set(real.flatMap(sn=> Object.keys(sn.ex)))];
  DAYS.forEach(d=> S.program[d] = []);
  names.forEach((n, i)=> S.program[DAYS[i % DAYS.length]].push({
    name: n, sets: 3, reps: "8-14", weight: 25, rpe: "7-9", rest: [90, 150],
    sideMode: "matchWeaker", uni: true, startSide: "R"}));
  S.asymRetired = {}; S.asymRetest = null; S.planLog = [];
  S.planStart = Date.parse("2026-07-01T12:00:00");
  save();
  return S.sessions.length;
}, REAL);

console.log("1 - THE REAL EXPORT: WHICH CHECKS SURVIVE");
{
  const n = await loadReal();
  const r = await ev(()=>{
    const out = {};
    ["Preacher Curl", "Standing Cable Hip Abduction", "Single-Arm Cable Pulldown",
     "Single-Arm Dumbbell Row", "Dumbbell Bulgarian Split Squat",
     "Single-Arm Cable Hammer Curl"].forEach(nm=>{
      const st = sideStats(nm);
      out[nm] = {ok: st.ok, n: st.exposures, med: st.ok ? Math.round(st.gapPct*100) : null,
                 weaker: st.weaker, small: st.smallOf, retire: st.closed};
    });
    return out;
  });
  console.log("    sessions replayed: " + n);
  Object.keys(r).forEach(k=> console.log("    " + k.padEnd(32)
    + " med " + String(r[k].med).padStart(4) + "%  weaker " + String(r[k].weaker).padStart(5)
    + "  small " + r[k].small + "  " + (r[k].retire ? "RETIRE" : "ACTIVE")));
  ck("Preacher Curl's left is measured as about 28% weaker",
     r["Preacher Curl"].weaker === "L" && r["Preacher Curl"].med >= 20,
     JSON.stringify(r["Preacher Curl"]));
  ck("and the check STAYS ACTIVE", r["Preacher Curl"].retire === false,
     JSON.stringify(r["Preacher Curl"]));
  ck("Hip Abduction's left is about 22% weaker",
     r["Standing Cable Hip Abduction"].weaker === "L" && r["Standing Cable Hip Abduction"].med >= 15,
     JSON.stringify(r["Standing Cable Hip Abduction"]));
  ck("and that check STAYS ACTIVE too", r["Standing Cable Hip Abduction"].retire === false,
     JSON.stringify(r["Standing Cable Hip Abduction"]));
  ["Single-Arm Cable Pulldown", "Single-Arm Dumbbell Row",
   "Dumbbell Bulgarian Split Squat", "Single-Arm Cable Hammer Curl"].forEach(nm=>{
    ck(nm + " retires", r[nm].retire === true, JSON.stringify(r[nm]));
  });
}

console.log("\n2 - AND THE RE-TEST AGREES WITH THE MEASUREMENT");
{
  await loadReal();
  const r = await ev(()=>{
    const res = applyAsymRetest();
    return {retired: res.retired.sort(), kept: res.kept.sort(),
            row: (S.planLog || []).filter(x=> /asymmetry/i.test(x.name || "")).slice(-1)[0]};
  });
  console.log("    kept:    " + r.kept.join(", "));
  console.log("    retired: " + r.retired.join(", "));
  ck("Preacher Curl is kept", r.kept.includes("Preacher Curl"), r.kept.join(","));
  ck("Hip Abduction is kept", r.kept.includes("Standing Cable Hip Abduction"), r.kept.join(","));
  ck("the four noisy ones are retired",
     ["Single-Arm Cable Pulldown","Single-Arm Dumbbell Row","Dumbbell Bulgarian Split Squat",
      "Single-Arm Cable Hammer Curl"].every(n=> r.retired.includes(n)), r.retired.join(","));
  ck("and it never claims everything is level while something is kept",
     !/All movements are level/.test(JSON.stringify(r.row || {})),
     JSON.stringify((r.row || {}).changes));
}

console.log("\n3 - THE GAP IS SHOWN PER EXERCISE, SO A CHECK BEING ON IS CHECKABLE");
{
  const r = await ev(()=> ({
    on: asymGapText(sideStats("Preacher Curl")),
    off: asymGapText(sideStats("Single-Arm Dumbbell Row")),
    sample: asymSampleText(sideStats("Preacher Curl"))
  }));
  console.log("    on:  " + r.on);
  console.log("    off: " + r.off);
  console.log("    n:   " + r.sample);
  ck("the active one names the side and a percentage",
     /left/i.test(r.on) && /%/.test(r.on), r.on);
  ck("and says how many exposures it rests on", /\d/.test(r.sample), r.sample);
  ck("the retired one says the sides are level", /level|even|no/i.test(r.off), r.off);
}

console.log("\n4 - A GAP THAT SWINGS BOTH WAYS IS NOISE, NOT ASYMMETRY");
{
  /* Same median magnitude, opposite consistency: one movement is 25% left-weak every
     time, the other is 25% left-weak and 25% right-weak alternately. The second is set
     order, not a limb. */
  const r = await ev(()=>{
    const mk = (name, pairs)=> pairs.map((pr, i)=> ({
      id: name + i, workoutId: DAYS[0], date: dayStr(Date.now() - (pairs.length - i) * 4 * 86400e3),
      startedAt: Date.now() - (pairs.length - i) * 4 * 86400e3, finishedAt: Date.now(), feel: 4,
      entries: [{name, reps: "8-14", rpe: "7-9", startSide: "R",
        sets: [{weight:"25", reps:String(pr[0]), rpe:"8", side:"R", done:true},
               {weight:"25", reps:String(pr[1]), rpe:"8", side:"L", done:true}]}]}));
    const steady = [[12,9],[12,9],[12,9],[12,9],[12,9],[12,9]];
    const swinging = [[12,9],[9,12],[12,9],[9,12],[12,9],[9,12]];
    S.sessions = mk("Steady Curl", steady).concat(mk("Swinging Curl", swinging));
    DAYS.forEach(d=> S.program[d] = []);
    ["Steady Curl","Swinging Curl"].forEach(n=> S.program[DAYS[0]].push({
      name:n, sets:2, reps:"8-14", weight:25, rpe:"7-9", rest:[90,150],
      sideMode:"matchWeaker", uni:true, startSide:"R"}));
    S.asymRetired = {}; save();
    const a = sideStats("Steady Curl"), c = sideStats("Swinging Curl");
    return {steady: {med: Math.round(a.gapPct*100), small: a.smallOf, retire: a.closed},
            swing:  {med: Math.round(c.gapPct*100), small: c.smallOf, retire: c.closed}};
  });
  console.log("    steady   " + JSON.stringify(r.steady));
  console.log("    swinging " + JSON.stringify(r.swing));
  ck("the steady 25% gap stays active", r.steady.retire === false, JSON.stringify(r.steady));
  ck("the swinging one retires", r.swing.retire === true, JSON.stringify(r.swing));
}

console.log("\n5 - AND IT NO LONGER THROWS AWAY SESSIONS TO BALANCE THE OPENING SIDE");
{
  /* The audited Preacher Curl gap holds whichever arm goes first, which is the whole
     reason the balanced-window trim was the wrong guard. Six sessions all opened on the
     right: the old rule had no balanced run to read and retired the check. */
  const r = await ev(()=>{
    S.sessions = [0,1,2,3,4,5].map(i=> ({
      id: "ob" + i, workoutId: DAYS[0], date: dayStr(Date.now() - (6 - i) * 4 * 86400e3),
      startedAt: Date.now() - (6 - i) * 4 * 86400e3, finishedAt: Date.now(), feel: 4,
      entries: [{name:"One Sided Curl", reps:"8-14", rpe:"7-9", startSide:"R",
        sets: [{weight:"25", reps:"13", rpe:"8", side:"R", done:true},
               {weight:"25", reps:"9",  rpe:"8", side:"L", done:true}]}]}));
    DAYS.forEach(d=> S.program[d] = []);
    S.program[DAYS[0]] = [{name:"One Sided Curl", sets:2, reps:"8-14", weight:25,
      rpe:"7-9", rest:[90,150], sideMode:"matchWeaker", uni:true, startSide:"R"}];
    S.asymRetired = {}; save();
    const st = sideStats("One Sided Curl");
    return {n: st.exposures, med: Math.round(st.gapPct*100), weaker: st.weaker,
            retire: st.closed, opened: "R every time"};
  });
  console.log("    " + JSON.stringify(r));
  ck("all six exposures are counted", r.n === 6, String(r.n));
  ck("the gap is measured", r.med >= 25 && r.weaker === "L", JSON.stringify(r));
  ck("and the check is not retired for want of a side flip", r.retire === false, String(r.retire));
}

/* Six sessions of one movement. `pairs` is [L, R] per session as {reps, rpe}. */
const sided = (name, pairs)=> ev(a=>{
  S.sessions = a.pairs.map((pr, i)=> ({
    id: a.name + i, workoutId: DAYS[0],
    date: dayStr(Date.now() - (a.pairs.length - i) * 4 * 86400e3),
    startedAt: Date.now() - (a.pairs.length - i) * 4 * 86400e3,
    finishedAt: Date.now() - (a.pairs.length - i) * 4 * 86400e3 + 3600e3, feel: 4,
    entries: [{name: a.name, reps: "8-14", rpe: "7-9", startSide: "L",
      sets: [{weight:"25", reps:String(pr[0].reps),
              rpe: pr[0].rpe == null ? "" : String(pr[0].rpe), side:"L", done:true},
             {weight:"25", reps:String(pr[1].reps),
              rpe: pr[1].rpe == null ? "" : String(pr[1].rpe), side:"R", done:true}]}]}));
  DAYS.forEach(d=> S.program[d] = []);
  S.program[DAYS[0]] = [{name: a.name, sets: 2, reps: "8-14", weight: 25, rpe: "7-9",
    rest: [90,150], sideMode: "matchWeaker", uni: true, startSide: "L"}];
  S.asymRetired = {}; S.asymRetest = null; save();
  const st = sideStats(a.name);
  return {n: st.exposures, excluded: st.excluded, med: Math.round(st.gapPct * 100),
          weaker: st.weaker, small: st.smallOf, retire: st.closed, why: st.reason,
          text: asymGapText(st)};
}, {name, pairs});

console.log("\n6 - MATCHING THE REPS MUST NOT ERASE THE GAP IT WAS MATCHED TO");
{
  /* The protocol this check exists to drive says: go left first, stop the right at the
     left's rep count. Follow it and the raw reps read dead level for ever, so the
     measurement that justified the protocol is destroyed by the protocol. The reserve is
     where the gap went: ten reps at RPE 9 and ten at RPE 7 are not the same set. */
  const r = await sided("Matched Curl",
    [...Array(6)].map(()=> [{reps:10, rpe:9}, {reps:10, rpe:7}]));
  console.log("    " + JSON.stringify(r));
  ck("the reps are identical on both sides", true, "");
  ck("but the gap is still measured", r.med >= 10, r.med + "%");
  ck("the right is the stronger side", r.weaker === "L", String(r.weaker));
  ck("and the check does NOT retire", r.retire === false, String(r.retire));
}

console.log("\n6b - AND A MATCHED SET WITH NO RPE IS NOT EVIDENCE OF ANYTHING");
{
  const r = await sided("Unrated Curl",
    [...Array(6)].map(()=> [{reps:10, rpe:null}, {reps:10, rpe:null}]));
  console.log("    " + JSON.stringify(r));
  ck("every exposure is left out of the decision", r.n === 0 && r.excluded === 6,
     JSON.stringify(r));
  ck("so nothing retires on it", r.retire !== true, String(r.retire));
  ck("and it says why", /rpe|rated|effort/i.test(r.why || ""), r.why);
}

console.log("\n6c - A GENUINELY LEVEL MOVEMENT STILL RETIRES");
{
  const r = await sided("Level Curl",
    [...Array(6)].map(()=> [{reps:10, rpe:8}, {reps:10, rpe:8}]));
  console.log("    " + JSON.stringify(r));
  ck("matched reps AND matched effort is level", r.med < 10, r.med + "%");
  ck("and it retires", r.retire === true, String(r.retire));
}

console.log("\n7 - THE WEAKER SIDE IS THE ONE THAT KEEPS BEING WEAKER");
{
  /* Four of six on the same side establishes it. Three-three does not: that is a
     movement with no weaker side, however big the individual gaps are. */
  const steady = await sided("Four Of Six Curl",
    [[{reps:7,rpe:9},{reps:10,rpe:9}], [{reps:7,rpe:9},{reps:10,rpe:9}],
     [{reps:7,rpe:9},{reps:10,rpe:9}], [{reps:7,rpe:9},{reps:10,rpe:9}],
     [{reps:10,rpe:9},{reps:7,rpe:9}], [{reps:10,rpe:9},{reps:7,rpe:9}]]);
  const split = await sided("Three Three Curl",
    [[{reps:7,rpe:9},{reps:10,rpe:9}], [{reps:7,rpe:9},{reps:10,rpe:9}],
     [{reps:7,rpe:9},{reps:10,rpe:9}], [{reps:10,rpe:9},{reps:7,rpe:9}],
     [{reps:10,rpe:9},{reps:7,rpe:9}], [{reps:10,rpe:9},{reps:7,rpe:9}]]);
  console.log("    4 of 6: " + JSON.stringify(steady));
  console.log("    3 of 3: " + JSON.stringify(split));
  ck("four of six on one side establishes that side", steady.weaker === "L",
     String(steady.weaker));
  ck("and the check stays active", steady.retire === false, String(steady.retire));
  ck("an even split establishes no side", !split.weaker, String(split.weaker));
  ck("and retires, however big the individual gaps", split.retire === true,
     String(split.retire));
}

console.log("\n8 - A SIDE THAT TRULY FLIPS RETIRES, THEN IS FOUND AGAIN THE OTHER WAY");
{
  const r = await ev(()=>{
    const mk = (pairs, from)=> pairs.map((pr, i)=> ({
      id: "f" + from + i, workoutId: DAYS[0],
      date: dayStr(Date.now() - (from - i * 4) * 86400e3),
      startedAt: Date.now() - (from - i * 4) * 86400e3,
      finishedAt: Date.now() - (from - i * 4) * 86400e3 + 3600e3, feel: 4,
      entries: [{name:"Flipping Curl", reps:"8-14", rpe:"7-9", startSide:"L",
        sets: [{weight:"25", reps:String(pr[0]), rpe:"9", side:"L", done:true},
               {weight:"25", reps:String(pr[1]), rpe:"9", side:"R", done:true}]}]}));
    DAYS.forEach(d=> S.program[d] = []);
    S.program[DAYS[0]] = [{name:"Flipping Curl", sets:2, reps:"8-14", weight:25,
      rpe:"7-9", rest:[90,150], sideMode:"matchWeaker", uni:true, startSide:"L"}];
    const out = {};
    /* Six exposures, left clearly weaker. */
    S.asymRetired = {}; S.asymRetest = null;
    S.sessions = mk([[7,10],[7,10],[7,10],[7,10],[7,10],[7,10]], 60); save();
    let st = sideStats("Flipping Curl");
    out.before = {weaker: st.weaker, retire: st.closed};
    applyAsymRetest();
    out.retiredAfterFirst = !!(S.asymRetired || {})["flipping curl"];
    /* The flip arrives: three each way, so no side holds four of six. */
    S.sessions = S.sessions.concat(mk([[10,7],[10,7],[10,7]], 20)); save();
    st = sideStats("Flipping Curl");
    out.during = {weaker: st.weaker, retire: st.closed};
    applyAsymRetest();
    out.retiredDuring = !!(S.asymRetired || {})["flipping curl"];
    /* And it stays flipped: six exposures with the RIGHT weaker. */
    S.sessions = S.sessions.concat(mk([[10,7],[10,7],[10,7]], 8)); save();
    st = sideStats("Flipping Curl");
    out.after = {weaker: st.weaker, retire: st.closed};
    applyAsymRetest();
    out.retiredAfter = !!(S.asymRetired || {})["flipping curl"];
    return out;
  });
  console.log("    " + JSON.stringify(r));
  ck("the left is found weaker first", r.before.weaker === "L", String(r.before.weaker));
  ck("and the check is not retired", r.retiredAfterFirst === false,
     String(r.retiredAfterFirst));
  ck("mid-flip no side holds four of six, so it retires", r.retiredDuring === true,
     JSON.stringify(r.during));
  ck("once the flip settles the RIGHT is found weaker", r.after.weaker === "R",
     String(r.after.weaker));
  ck("and the check comes back on by itself", r.retiredAfter === false,
     String(r.retiredAfter));
}

console.log(errs.length ? ("\nPAGE ERRORS: "+errs.join(" | ")) : "\nno page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
