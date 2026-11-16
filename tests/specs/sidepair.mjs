import { chromium, APP_URL } from './_e26.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
/* P1-7 — ONE SET OF A ONE-LIMB MOVEMENT IS A PAIR, NOT TWO SETS.

   The audit found unilateral work counted as full sets: "2 sets" of a Single-Arm Cable
   Pulldown is one set per side, and volume, floors and ceilings were counting it double.

   The user then described how they actually train it, which makes it worse than a
   counting error. Left, then right straight away, then rest. The app starts a rest clock
   after every logged row, so it recorded a fake 10-20 second "rest" between the two
   sides of one set — filling the rest history with rests that never happened and
   feeding them to the rule that lengthens rest windows.

   So a set holds two sides: `st.sides = {L, R}`, either of which may be empty. A
   left-only set at the end is allowed and counts as half a set. Nothing is duplicated
   and no superset is involved: superset membership in this app is positional adjacency
   between two DIFFERENT entries, so a movement paired with itself would have to appear
   twice in the plan, in the volume counts and in the report.

   Legacy sessions, logged one side per set, stay exactly as they are. sideSets() is the
   single read adapter that turns both shapes into one canonical list, and every rule
   reads through it. */
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
  S.splitId=DEFAULT_SPLIT; applySplit(); S.active=null; save();
});

console.log("1 - THE ADAPTER READS BOTH SHAPES AS ONE LIST");
{
  const r = await ev(()=>{
    /* The new shape: three pairs and a left-only set at the end. */
    const paired = {name:"Preacher Curl", reps:"8-12", rpe:"7-9", perSide: true, startSide:"L",
      sets: [
        {sides:{L:{weight:"25",reps:"8",rpe:"9",done:true}, R:{weight:"25",reps:"11",rpe:"9",done:true}}, rest:150},
        {sides:{L:{weight:"25",reps:"7",rpe:"9",done:true}, R:{weight:"25",reps:"10",rpe:"9",done:true}}, rest:150},
        {sides:{L:{weight:"25",reps:"7",rpe:"9",done:true}, R:{weight:"25",reps:"10",rpe:"9",done:true}}, rest:150},
        {sides:{L:{weight:"25",reps:"6",rpe:"9",done:true}}}
      ]};
    /* The legacy shape: one side per set, alternating. */
    const legacy = {name:"Preacher Curl", reps:"8-12", rpe:"7-9", startSide:"L",
      sets: [
        {weight:"25",reps:"8",rpe:"9",done:true,rest:150},
        {weight:"25",reps:"11",rpe:"9",done:true,rest:150}
      ]};
    const plain = {name:"Cable Triceps Pushdown", reps:"8-12", rpe:"7-9",
      sets: [{weight:"50",reps:"12",rpe:"8",done:true,rest:120}]};
    const shape = en => sideSets(en).map(x=> [x.pair, x.side, x.reps, x.rest == null ? "-" : x.rest].join(":"));
    return {paired: shape(paired), legacy: shape(legacy), plain: shape(plain),
            pairedCount: sideSets(paired).length, halves: sideSets(paired).map(x=> x.count),
            plainCount: sideSets(plain)[0].count};
  });
  console.log("    new shape:  " + r.paired.join("  "));
  console.log("    legacy:     " + r.legacy.join("  "));
  console.log("    not sided:  " + r.plain.join("  "));
  ck("three pairs plus a left-only set is seven side-sets", r.pairedCount === 7,
     String(r.pairedCount));
  ck("the two sides of a pair share a set number",
     r.paired[0].startsWith("0:L") && r.paired[1].startsWith("0:R"), r.paired.slice(0,2).join(" "));
  ck("the rest belongs to the pair, not to the first side",
     r.paired[0].endsWith(":-") && r.paired[1].endsWith(":150"), r.paired.slice(0,2).join(" "));
  ck("every side-set counts half a set", r.halves.every(c=> c === 0.5),
     JSON.stringify(r.halves));
  ck("a legacy alternating log reads as side-sets too",
     r.legacy.length === 2 && r.legacy[0].includes(":L:") && r.legacy[1].includes(":R:"),
     r.legacy.join(" "));
  ck("and a two-handed movement is one whole set with no side",
     r.plain.length === 1 && r.plain[0] === "0::12:120" && r.plainCount === 1,
     r.plain.join(" "));
}

console.log("\n2 - 3 PAIRS + 1 LEFT-ONLY SET IS 3.5 SETS OF WEEKLY VOLUME");
{
  const r = await ev(()=>{
    const DAY = 86400e3, now = Date.now();
    S.sessions = [{id:"v1", workoutId: DAYS[0], date: dayStr(now - DAY),
      startedAt: now - DAY, finishedAt: now - DAY + 3600e3, feel: 4,
      entries: [{name:"Preacher Curl", reps:"8-12", rpe:"7-9", perSide: true, startSide:"L",
        sets: [
          {sides:{L:{weight:"25",reps:"8",rpe:"9",done:true}, R:{weight:"25",reps:"11",rpe:"9",done:true}}, rest:150},
          {sides:{L:{weight:"25",reps:"7",rpe:"9",done:true}, R:{weight:"25",reps:"10",rpe:"9",done:true}}, rest:150},
          {sides:{L:{weight:"25",reps:"7",rpe:"9",done:true}, R:{weight:"25",reps:"10",rpe:"9",done:true}}, rest:150},
          {sides:{L:{weight:"25",reps:"6",rpe:"9",done:true}}}
        ]}]}];
    save();
    const w = windowStats(now - 7*DAY, now + DAY);
    const mm = musclesFor("Preacher Curl") || {};
    const g = Object.keys(mm).find(k=> mm[k] >= 1);
    return {g, sets: w[g] && Math.round(w[g].sets * 100) / 100};
  });
  console.log("    " + r.g + ": " + r.sets + " sets");
  ck("three pairs and a half are three and a half sets", r.sets === 3.5, String(r.sets));
}

console.log("\n3 - NO REST BETWEEN THE SIDES OF A PAIR, ONE AFTER IT");
{
  const r = await ev(()=>{
    S.active = {id:"a1", workoutId: DAYS[0], date: todayStr(), startedAt: Date.now(),
      entries: [{name:"Preacher Curl", reps:"8-12", rpe:"7-9", perSide: true, startSide:"L",
        sets: [{sides:{L:{weight:"25",reps:"8",rpe:"9"}, R:{weight:"25",reps:"11",rpe:"9"}}},
               {sides:{L:{weight:"25",reps:"7",rpe:"9"}, R:{weight:"25",reps:"10",rpe:"9"}}}]}],
      restTimer: null};
    const st = S.active.entries[0].sets[0];
    /* The left is logged. The right is next, with no rest in between: that is the whole
       point of the protocol, and a ten-second gap recorded as a rest is what fed the
       rest-lengthening rule. */
    st.sides.L.done = true;
    const afterL = endsRound(S.active.entries, 0, 0);
    st.sides.R.done = true;
    const afterR = endsRound(S.active.entries, 0, 0);
    return {afterL, afterR};
  });
  console.log("    after L: " + r.afterL + "   after R: " + r.afterR);
  ck("the first side does not end the round", r.afterL === false, String(r.afterL));
  ck("and the second side does", r.afterR === true, String(r.afterR));
}

console.log("\n4 - A WEAKER RIGHT INSIDE A PAIR IS NOT A COLLAPSE ACROSS SETS");
{
  const r = await ev(()=>{
    const DAY = 86400e3, now = Date.now(), wid = DAYS[0];
    const mk = (id, at)=> ({id, workoutId: wid, date: dayStr(at), startedAt: at,
      finishedAt: at + 3600e3, feel: 4,
      entries: [{name:"Preacher Curl", reps:"8-12", rpe:"7-9", perSide: true, startSide:"L",
        sets: [
          /* Each pair: the left steady at 11, the right steady at 7. Within a pair that
             is a 36% difference, and across sets each side is perfectly level. */
          {sides:{L:{weight:"25",reps:"11",rpe:"9",done:true}, R:{weight:"25",reps:"7",rpe:"9",done:true}}, rest:150},
          {sides:{L:{weight:"25",reps:"11",rpe:"9",done:true}, R:{weight:"25",reps:"7",rpe:"9",done:true}}, rest:150},
          {sides:{L:{weight:"25",reps:"11",rpe:"9",done:true}, R:{weight:"25",reps:"7",rpe:"9",done:true}}, rest:150}
        ]}]});
    S.sessions = [mk("d0", now - 5*DAY), mk("d1", now - DAY)];
    S.program[wid] = [{name:"Preacher Curl", sets:3, reps:"8-12", weight:25, rpe:"7-9",
                       rest:[150,210], perSide: true}];
    S.planLog = []; S.flags = []; S.deload = null; S.dayFlags = {}; S.joint = {};
    save();
    const sess = S.sessions[1];
    const drops = repDropOffs(sess).bad.map(d=> d.name);
    const findings = fadeFindings(sess);
    recordFlags(sess, findings);
    const f = openFlags().find(x=> x && x.kind === "fade");
    if(f) applyFlag(f.id, "rest");
    return {drops, offered: !!(f && f.restAdd != null),
            window: ((S.program[wid] || [])[0].rest || []).join("-")};
  });
  console.log("    drop-offs " + JSON.stringify(r.drops) + "  window " + r.window);
  ck("no collapse is found: each side is level against itself",
     r.drops.length === 0, JSON.stringify(r.drops));
  ck("and the rest window is untouched", r.window === "150-210", r.window);
}

console.log("\n4b - BUT A SIDE THAT GENUINELY FADES IS STILL CAUGHT");
{
  /* Section 4 would also pass if the detector simply could not see a paired entry at
     all, which is what it did before the adapter. So: the same shape, with the LEFT
     collapsing 11 -> 10 -> 5 across its own sets. */
  const r = await ev(()=>{
    const DAY = 86400e3, now = Date.now(), wid = DAYS[0];
    const mk = (id, at)=> ({id, workoutId: wid, date: dayStr(at), startedAt: at,
      finishedAt: at + 3600e3, feel: 4,
      entries: [{name:"Preacher Curl", reps:"8-12", rpe:"7-9", perSide: true, startSide:"L",
        sets: [[11,11],[10,11],[5,11]].map(([l, rr])=> ({sides:{
          L:{weight:"25",reps:String(l),rpe:"9",done:true},
          R:{weight:"25",reps:String(rr),rpe:"9",done:true}}, rest:180}))}]});
    S.sessions = [mk("f0", now - 5*DAY), mk("f1", now - DAY)];
    S.program[wid] = [{name:"Preacher Curl", sets:3, reps:"8-12", weight:25, rpe:"7-9",
                       rest:[120,150], perSide: true}];
    S.planLog = []; S.flags = []; S.deload = null; S.dayFlags = {}; S.joint = {};
    save();
    const sess = S.sessions[1];
    const d = repDropOffs(sess);
    const findings = fadeFindings(sess);
    recordFlags(sess, findings);
    const f = openFlags().find(x=> x && x.kind === "fade");
    if(f && f.restAdd != null) applyFlag(f.id, "rest");
    return {bad: d.bad.map(x=> x.name), msg: findings[0] && findings[0].msg,
            window: ((S.program[wid] || [])[0].rest || []).join("-")};
  });
  console.log("    " + JSON.stringify(r.bad) + "  " + r.msg + "  window " + r.window);
  ck("the left's own collapse is found", r.bad.length === 1, JSON.stringify(r.bad));
  ck("reported as 11 falling to 5, the left's own numbers",
     /11 \u2192 5|11 → 5/.test(r.msg || ""), r.msg);
  ck("and the rest window moves, as it should", r.window === "150-180", r.window);
}

console.log("\n5 - A MATCHED PAIR AT DIFFERENT EFFORT KEEPS THE CHECK ACTIVE");
{
  const r = await ev(()=>{
    const DAY = 86400e3, now = Date.now(), wid = DAYS[0];
    S.sessions = [0,1,2,3,4,5].map(i=> ({
      id:"m"+i, workoutId: wid, date: dayStr(now - (6-i)*4*DAY),
      startedAt: now - (6-i)*4*DAY, finishedAt: now - (6-i)*4*DAY + 3600e3, feel: 4,
      entries: [{name:"Preacher Curl", reps:"8-12", rpe:"7-9", perSide: true, startSide:"L",
        sets: [0,1,2].map(()=> ({sides:{
          L:{weight:"25",reps:"10",rpe:"9",done:true},
          R:{weight:"25",reps:"10",rpe:"7",done:true}}, rest:150}))}]}));
    DAYS.forEach(d=> S.program[d] = []);
    S.program[wid] = [{name:"Preacher Curl", sets:3, reps:"8-12", weight:25, rpe:"7-9",
      rest:[150,210], perSide: true, sideMode:"matchWeaker", uni: true, startSide:"L"}];
    S.asymRetired = {}; S.asymRetest = null; save();
    const st = sideStats("Preacher Curl");
    return {n: st.exposures, med: Math.round(st.gapPct*100), weaker: st.weaker,
            retire: st.closed, text: asymGapText(st)};
  });
  console.log("    " + JSON.stringify(r));
  ck("the pair is compared on reps plus reserve", r.med >= 10, r.med + "%");
  ck("the left is the weaker side", r.weaker === "L", String(r.weaker));
  ck("and the check stays active", r.retire === false, String(r.retire));
}

console.log("\n6 - LEGACY AND PAIRED SESSIONS ARE ONE CONTINUOUS HISTORY");
{
  const r = await ev(()=>{
    const DAY = 86400e3, now = Date.now(), wid = DAYS[0];
    /* Three old sessions logged one side per set, then three in the new shape. The same
       movement, the same sides, the same reps — only the storage differs. */
    const legacy = i => ({id:"L"+i, workoutId: wid, date: dayStr(now - (12-i)*4*DAY),
      startedAt: now - (12-i)*4*DAY, finishedAt: now - (12-i)*4*DAY + 3600e3, feel:4,
      entries:[{name:"Preacher Curl", reps:"8-12", rpe:"7-9", startSide:"L",
        sets:[{weight:"25",reps:"7",rpe:"9",done:true,rest:150},
              {weight:"25",reps:"10",rpe:"9",done:true,rest:150}]}]});
    const paired = i => ({id:"P"+i, workoutId: wid, date: dayStr(now - (6-i)*4*DAY),
      startedAt: now - (6-i)*4*DAY, finishedAt: now - (6-i)*4*DAY + 3600e3, feel:4,
      entries:[{name:"Preacher Curl", reps:"8-12", rpe:"7-9", perSide:true, startSide:"L",
        sets:[{sides:{L:{weight:"25",reps:"7",rpe:"9",done:true},
                      R:{weight:"25",reps:"10",rpe:"9",done:true}}, rest:150}]}]});
    S.sessions = [0,1,2].map(legacy).concat([0,1,2].map(paired));
    DAYS.forEach(d=> S.program[d] = []);
    S.program[wid] = [{name:"Preacher Curl", sets:3, reps:"8-12", weight:25, rpe:"7-9",
      rest:[150,210], perSide:true, sideMode:"matchWeaker", uni:true, startSide:"L"}];
    S.asymRetired = {}; S.asymRetest = null; save();
    const st = sideStats("Preacher Curl");
    return {n: st.exposures, med: Math.round(st.gapPct*100), weaker: st.weaker,
            gaps: (st.window || []).map(x=> Math.round(x.gap*100))};
  });
  console.log("    " + JSON.stringify(r));
  ck("all six exposures are read, across both shapes", r.n === 6, String(r.n));
  ck("and they agree with each other", new Set(r.gaps).size === 1, JSON.stringify(r.gaps));
  ck("the left is weaker throughout", r.weaker === "L", String(r.weaker));
}

console.log("\n7 - AND THE REAL EXPORT'S VERDICTS SURVIVE THE ADAPTER");
{
  const r = await ev(real=>{
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
    const names = [...new Set(real.flatMap(sn=> Object.keys(sn.ex)))];
    DAYS.forEach(d=> S.program[d] = []);
    names.forEach((n, i)=> S.program[DAYS[i % DAYS.length]].push({
      name: n, sets: 3, reps: "8-14", weight: 25, rpe: "7-9", rest: [90, 150],
      sideMode: "matchWeaker", uni: true, startSide: "R"}));
    S.asymRetired = {}; S.asymRetest = null; S.planStart = Date.parse("2026-07-01T12:00:00");
    save();
    const out = {};
    ["Preacher Curl","Standing Cable Hip Abduction","Single-Arm Cable Pulldown",
     "Single-Arm Dumbbell Row","Dumbbell Bulgarian Split Squat",
     "Single-Arm Cable Hammer Curl"].forEach(nm=>{
      const st = sideStats(nm);
      out[nm] = st.closed ? "RETIRE" : "ACTIVE";
    });
    return out;
  }, REAL);
  Object.keys(r).forEach(k=> console.log("    " + k.padEnd(32) + r[k]));
  ck("Preacher Curl still active", r["Preacher Curl"] === "ACTIVE", r["Preacher Curl"]);
  ck("Hip Abduction still active", r["Standing Cable Hip Abduction"] === "ACTIVE",
     r["Standing Cable Hip Abduction"]);
  ck("and the four noisy ones still retire",
     ["Single-Arm Cable Pulldown","Single-Arm Dumbbell Row","Dumbbell Bulgarian Split Squat",
      "Single-Arm Cable Hammer Curl"].every(n=> r[n] === "RETIRE"), JSON.stringify(r));
}

console.log("\n8 - LOGGING A PAIR FOR REAL: L, R, ONE REST, AND NOTHING IN BETWEEN");
{
  /* The acceptance test as written: "logging L then R creates no rest between them, and
     one rest after R". Everything above tests the rules; this drives the actual screen,
     because the seam returning the right verdict and the tick doing the right thing are
     two different claims. */
  const r = await ev(()=>{
    S.sessions = []; S.flags = []; S.planLog = [];
    S.program[DAYS[0]] = [{name:"Preacher Curl", sets:3, reps:"8-12", weight:25,
      rpe:"7-9", rest:[120,150], perSide:true, startSide:"L"}];
    S.pointer = 0; S.active = null; save();
    startWorkout(DAYS[0]);
    const en = S.active.entries.find(x=> nrm(x.name) === nrm("Preacher Curl"));
    return {started: !!en, paired: entryPerSide(en),
            sides: pairSidesOf(en, 0), sets: (en.sets || []).length};
  });
  console.log("    " + JSON.stringify(r));
  ck("the session starts with the movement paired", r.paired === true, JSON.stringify(r));
  ck("and its first set is left then right", r.sides.join("") === "LR", r.sides.join(""));

  const rows = await ev(()=>{
    TAB = "workout"; render();
    const ei = S.active.entries.findIndex(x=> nrm(x.name) === nrm("Preacher Curl"));
    const chk = [...document.querySelectorAll('.set .chk')]
      .filter(b=> Number(b.dataset.e) === ei && Number(b.dataset.s) === 0);
    return {n: chk.length, sides: chk.map(b=> b.dataset.sd)};
  });
  console.log("    set 1 draws " + rows.n + " rows: " + JSON.stringify(rows.sides));
  ck("set one is drawn as two rows, one per side", rows.n === 2, String(rows.n));
  ck("left first", rows.sides.join("") === "LR", rows.sides.join(""));

  /* Fill and tick the left, then look at the clock. */
  const afterL = await p.evaluate(()=>{
    const ei = S.active.entries.findIndex(x=> nrm(x.name) === nrm("Preacher Curl"));
    const pick = sd => {
      const row = [...document.querySelectorAll('.set')].find(d=>
        d.querySelector(`[data-e="${ei}"][data-s="0"][data-sd="${sd}"]`));
      return row;
    };
    const fill = (row, reps, rpe)=>{
      const w = row.querySelector('[data-f="weight"]'); w.value = "25";
      w.dispatchEvent(new Event("change"));
      const rp = row.querySelector('[data-f="reps"]'); rp.value = String(reps);
      rp.dispatchEvent(new Event("change"));
      const se = row.querySelector('[data-f="rpe"]'); if(se){ se.value = String(rpe);
        se.dispatchEvent(new Event("change")); }
    };
    const L = pick("L");
    fill(L, 8, 9);
    L.querySelector('.chk').click();
    const st = S.active.entries[ei].sets[0];
    return {lDone: !!(st.sides && st.sides.L && st.sides.L.done),
            clock: !!S.active.restTimer,
            lReps: st.sides && st.sides.L && st.sides.L.reps};
  });
  console.log("    after L: " + JSON.stringify(afterL));
  ck("the left is logged", afterL.lDone === true, JSON.stringify(afterL));
  ck("and NO rest clock has started", afterL.clock === false, String(afterL.clock));

  const target = await ev(()=>{
    render();
    const ei = S.active.entries.findIndex(x=> nrm(x.name) === nrm("Preacher Curl"));
    const rIn = document.querySelector(
      `[data-e="${ei}"][data-s="0"][data-sd="R"][data-f="reps"]`);
    return rIn ? rIn.placeholder : null;
  });
  console.log("    the right aims at: " + target);
  ck("the right side's target is the left's eight reps", String(target) === "8", String(target));

  const afterR = await p.evaluate(()=>{
    const ei = S.active.entries.findIndex(x=> nrm(x.name) === nrm("Preacher Curl"));
    const row = [...document.querySelectorAll('.set')].find(d=>
      d.querySelector(`[data-e="${ei}"][data-s="0"][data-sd="R"]`));
    const rp = row.querySelector('[data-f="reps"]'); rp.value = "11";
    rp.dispatchEvent(new Event("change"));
    const w = row.querySelector('[data-f="weight"]'); w.value = "25";
    w.dispatchEvent(new Event("change"));
    /* Ticked with no effort rating first, which a pair must refuse. */
    row.querySelector('.chk').click();
    const st = S.active.entries[ei].sets[0];
    const refused = !(st.sides.R && st.sides.R.done);
    const se = row.querySelector('[data-f="rpe"]');
    se.value = "9"; se.dispatchEvent(new Event("change"));
    row.querySelector('.chk').click();
    return {refused, rDone: !!(st.sides.R && st.sides.R.done),
            clock: !!S.active.restTimer,
            restOn: S.active.restTimer ? S.active.restTimer.s : null};
  });
  console.log("    after R: " + JSON.stringify(afterR));
  ck("a side with no effort rating is refused", afterR.refused === true,
     String(afterR.refused));
  ck("with one, the right is logged", afterR.rDone === true, String(afterR.rDone));
  ck("and NOW the rest clock runs, once, for the pair", afterR.clock === true,
     String(afterR.clock));

  const rec = await ev(()=>{
    /* Wind the clock back two and a half minutes so there is a rest to record at all:
       recordRestIfRunning() ignores anything under three seconds, and quite right too. */
    S.active.restTimer.start -= 150e3;
    recordRestIfRunning();
    const ei = S.active.entries.findIndex(x=> nrm(x.name) === nrm("Preacher Curl"));
    const st = S.active.entries[ei].sets[0];
    const en = S.active.entries[ei];
    return {setRest: st.rest, sideRest: !!(st.sides.L.rest || st.sides.R.rest),
            list: sideSets(en).slice(0, 2).map(x=> x.side + ":" + (x.rest == null ? "-" : "n"))};
  });
  console.log("    " + JSON.stringify(rec));
  ck("the rest is recorded against the pair", rec.setRest >= 149, JSON.stringify(rec));
  ck("and not against either side", rec.sideRest === false, JSON.stringify(rec));
  ck("and the adapter reports it on the second side only",
     rec.list.join(" ") === "L:- R:n", rec.list.join(" "));
}

console.log(errs.length ? ("\nPAGE ERRORS: "+errs.join(" | ")) : "\nno page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
