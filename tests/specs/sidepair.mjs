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

console.log("\n9 - THE SECOND SIDE STARTS FROM THE FIRST SIDE'S LOAD");
{
  const r = await ev(()=>{
    S.sessions = []; S.flags = []; S.planLog = [];
    S.program[DAYS[0]] = [{name:"Preacher Curl", sets:3, reps:"8-12", weight:25,
      rpe:"7-9", rest:[120,150], perSide:true, startSide:"L"}];
    S.pointer = 0; S.active = null; save();
    startWorkout(DAYS[0]);
    TAB = "workout"; render();
    const ei = S.active.entries.findIndex(x=> nrm(x.name) === nrm("Preacher Curl"));
    const row = sd => [...document.querySelectorAll('.set')].find(d=>
      d.querySelector(`[data-e="${ei}"][data-s="0"][data-sd="${sd}"]`));
    /* 30 on the left, which is not what the plan says, so a pre-filled right can only
       have come from the left. */
    const L = row("L");
    const w = L.querySelector('[data-f="weight"]'); w.value = "30";
    w.dispatchEvent(new Event("change"));
    const rp = L.querySelector('[data-f="reps"]'); rp.value = "8";
    rp.dispatchEvent(new Event("change"));
    const se = L.querySelector('[data-f="rpe"]'); se.value = "9";
    se.dispatchEvent(new Event("change"));
    L.querySelector('.chk').click();
    render();
    const R = row("R");
    const rw = R.querySelector('[data-f="weight"]');
    const before = {value: rw.value, placeholder: rw.placeholder};
    /* And editable: the right is heavier today. */
    rw.value = "35"; rw.dispatchEvent(new Event("change"));
    const rr = R.querySelector('[data-f="reps"]'); rr.value = "11";
    rr.dispatchEvent(new Event("change"));
    const rs = R.querySelector('[data-f="rpe"]'); rs.value = "9";
    rs.dispatchEvent(new Event("change"));
    R.querySelector('.chk').click();
    const st = S.active.entries[ei].sets[0];
    return {before, L: st.sides.L.weight, R: st.sides.R.weight};
  });
  console.log("    the right's box shows " + JSON.stringify(r.before)
              + "  stored L " + r.L + " / R " + r.R);
  ck("the right's load is pre-filled from the left", r.before.value === "30",
     JSON.stringify(r.before));
  ck("and it is still editable", r.R === "35", String(r.R));
  ck("the left keeps its own", r.L === "30", String(r.L));
}

console.log("\n9b - A PRE-FILLED LOAD IS STORED EVEN IF IT IS NEVER TOUCHED");
{
  const r = await ev(()=>{
    S.active = null; startWorkout(DAYS[0]);
    TAB = "workout"; render();
    const ei = S.active.entries.findIndex(x=> nrm(x.name) === nrm("Preacher Curl"));
    const row = sd => [...document.querySelectorAll('.set')].find(d=>
      d.querySelector(`[data-e="${ei}"][data-s="0"][data-sd="${sd}"]`));
    const L = row("L");
    L.querySelector('[data-f="weight"]').value = "40";
    L.querySelector('[data-f="weight"]').dispatchEvent(new Event("change"));
    L.querySelector('[data-f="reps"]').value = "9";
    L.querySelector('[data-f="reps"]').dispatchEvent(new Event("change"));
    L.querySelector('[data-f="rpe"]').value = "9";
    L.querySelector('[data-f="rpe"]').dispatchEvent(new Event("change"));
    L.querySelector('.chk').click();
    render();
    /* The right: reps and effort typed, the load left exactly as it was offered. */
    const R = row("R");
    R.querySelector('[data-f="reps"]').value = "9";
    R.querySelector('[data-f="reps"]').dispatchEvent(new Event("change"));
    R.querySelector('[data-f="rpe"]').value = "9";
    R.querySelector('[data-f="rpe"]').dispatchEvent(new Event("change"));
    R.querySelector('.chk').click();
    const st = S.active.entries[ei].sets[0];
    return {R: st.sides.R.weight, done: !!st.sides.R.done};
  });
  console.log("    " + JSON.stringify(r));
  ck("the untouched load is banked, not lost", r.R === "40", String(r.R));
  ck("and the side is logged", r.done === true, String(r.done));
}

console.log("\n10 - AN OPTIONAL PAUSE BETWEEN SIDES IS A GAP, NOT THE PAIR'S REST");
{
  const r = await ev(()=>{
    S.sessions = []; S.flags = []; S.planLog = [];
    /* Heavy one-leg work wants half a minute between legs. Off by default; this plan
       entry asks for it. */
    S.program[DAYS[1]] = [{name:"Dumbbell Bulgarian Split Squat", sets:3, reps:"6-10",
      weight:50, rpe:"7-9", rest:[150,210], perSide:true, startSide:"L", sideRest:45}];
    S.pointer = 1; S.active = null; save();
    startWorkout(DAYS[1]);
    const ei = S.active.entries.findIndex(x=>
      nrm(x.name) === nrm("Dumbbell Bulgarian Split Squat"));
    const en = S.active.entries[ei];
    const dflt = sideRestFor({name:"Preacher Curl", perSide:true});
    TAB = "workout"; render();
    const row = sd => [...document.querySelectorAll('.set')].find(d=>
      d.querySelector(`[data-e="${ei}"][data-s="0"][data-sd="${sd}"]`));
    const L = row("L");
    L.querySelector('[data-f="weight"]').value = "50";
    L.querySelector('[data-f="weight"]').dispatchEvent(new Event("change"));
    L.querySelector('[data-f="reps"]').value = "8";
    L.querySelector('[data-f="reps"]').dispatchEvent(new Event("change"));
    L.querySelector('[data-f="rpe"]').value = "9";
    L.querySelector('[data-f="rpe"]').dispatchEvent(new Event("change"));
    L.querySelector('.chk').click();
    const t1 = S.active.restTimer;
    const afterL = {clock: !!t1, isGap: !!(t1 && t1.gap), side: t1 && t1.sd,
                    carried: en.sideRest, dflt};
    /* Serve the gap and log the right. */
    if(t1) t1.start -= 45e3;
    recordRestIfRunning();
    render();
    const R = row("R");
    R.querySelector('[data-f="reps"]').value = "8";
    R.querySelector('[data-f="reps"]').dispatchEvent(new Event("change"));
    R.querySelector('[data-f="rpe"]').value = "9";
    R.querySelector('[data-f="rpe"]').dispatchEvent(new Event("change"));
    R.querySelector('.chk').click();
    const t2 = S.active.restTimer;
    if(t2) t2.start -= 180e3;
    recordRestIfRunning();
    const st = S.active.entries[ei].sets[0];
    const list = sideSets(en).slice(0, 2);
    return {afterL, pairRest: st.rest, gapL: st.sides.L.gap,
            sideRestNotRest: st.sides.L.rest == null && st.sides.R.rest == null,
            adapter: list.map(x=> x.side + " rest=" + (x.rest == null ? "-" : x.rest)
                                 + " gap=" + (x.gap == null ? "-" : x.gap))};
  });
  console.log("    after L: " + JSON.stringify(r.afterL));
  console.log("    " + JSON.stringify(r.adapter) + "  pair rest " + r.pairRest);
  ck("it is off unless the exercise asks for it", r.afterL.dflt === 0,
     String(r.afterL.dflt));
  ck("the plan's figure is carried into the session", r.afterL.carried === 45,
     String(r.afterL.carried));
  ck("ticking the left starts a clock", r.afterL.clock === true, String(r.afterL.clock));
  ck("and it is a between-sides gap, not the pair's rest", r.afterL.isGap === true,
     String(r.afterL.isGap));
  ck("the gap is recorded on the side", r.gapL >= 44, String(r.gapL));
  ck("and never as that side's rest", r.sideRestNotRest === true,
     String(r.sideRestNotRest));
  ck("the pair still records exactly one rest, after it", r.pairRest >= 179,
     String(r.pairRest));
  ck("so the adapter reports one rest for the pair",
     r.adapter.join(" | ") === "L rest=- gap=45 | R rest=180 gap=-",
     r.adapter.join(" | "));
}

console.log("\n10b - AND A GAP NEVER REACHES THE REST-WINDOW RULES");
{
  const r = await ev(()=>{
    const DAY = 86400e3, now = Date.now(), wid = DAYS[1];
    /* Three pairs, each with a 45 second gap between the legs and 180 seconds after.
       The rest rules must see three rests of three minutes, never six of which half are
       45 seconds — which is exactly the fake-rest history that started P1-7. */
    S.sessions = [{id:"g1", workoutId: wid, date: dayStr(now - DAY), startedAt: now - DAY,
      finishedAt: now - DAY + 3600e3, feel: 4,
      entries: [{name:"Dumbbell Bulgarian Split Squat", reps:"6-10", rpe:"7-9",
        perSide:true, startSide:"L", sideRest:45,
        sets: [0,1,2].map(()=> ({rest:180, sides:{
          L:{weight:"50",reps:"8",rpe:"9",done:true,gap:45},
          R:{weight:"50",reps:"8",rpe:"9",done:true}}}))}]}];
    save();
    const mm = musclesFor("Dumbbell Bulgarian Split Squat") || {};
    const g = Object.keys(mm).find(k=> mm[k] >= 1);
    const w = windowStats(now - 7*DAY, now + DAY)[g];
    return {restN: w.restN, restShort: w.restShort, sets: w.sets};
  });
  console.log("    " + JSON.stringify(r));
  ck("three rests counted, one per pair", r.restN === 3, String(r.restN));
  ck("and none of them read as too short", r.restShort === 0, String(r.restShort));
  ck("while the volume is still three sets", r.sets === 3, String(r.sets));
}

console.log("\n11 - A REPS HINT IS NEVER BANKED AS REPS THAT HAPPENED");
{
  /* The second side's reps box shows the first side's count as a HINT, so the lifter can
     match it. If ticking without typing committed that hint, the app would log reps
     nobody counted \u2014 and not just any reps: a MATCHED pair, which is exactly the datum
     the side-balance check reads. Reps-matching already erases the gap from the rep
     count (see P1-8b); manufacturing the match on top of that would have the app
     inventing the evidence for its own conclusion.

     An ordinary set still banks last session's placeholder and writes it into the box as
     it always has \u2014 that is visible, long-standing, and about a different number. A
     paired side has to be typed. */
  const r = await ev(()=>{
    S.sessions = []; S.flags = []; S.planLog = [];
    S.program[DAYS[0]] = [{name:"Preacher Curl", sets:3, reps:"8-12", weight:25,
      rpe:"7-9", rest:[120,150], perSide:true, startSide:"L"}];
    S.pointer = 0; S.active = null; save();
    startWorkout(DAYS[0]); TAB = "workout"; render();
    const ei = S.active.entries.findIndex(x=> nrm(x.name) === nrm("Preacher Curl"));
    const row = sd => [...document.querySelectorAll('.set')].find(d=>
      d.querySelector(`[data-e="${ei}"][data-s="0"][data-sd="${sd}"]`));
    const L = row("L");
    L.querySelector('[data-f="weight"]').value = "30";
    L.querySelector('[data-f="weight"]').dispatchEvent(new Event("change"));
    L.querySelector('[data-f="reps"]').value = "8";
    L.querySelector('[data-f="reps"]').dispatchEvent(new Event("change"));
    L.querySelector('[data-f="rpe"]').value = "9";
    L.querySelector('[data-f="rpe"]').dispatchEvent(new Event("change"));
    L.querySelector('.chk').click();
    render();
    const R = row("R");
    const rIn = R.querySelector('[data-f="reps"]');
    const hint = {value: rIn.value, placeholder: rIn.placeholder};
    /* Effort rated, load pre-filled and visible, reps left as the hint. Tick. */
    R.querySelector('[data-f="rpe"]').value = "7";
    R.querySelector('[data-f="rpe"]').dispatchEvent(new Event("change"));
    R.querySelector('.chk').click();
    const st = S.active.entries[ei].sets[0];
    const after = {reps: st.sides.R && st.sides.R.reps,
                   done: !!(st.sides.R && st.sides.R.done),
                   weight: st.sides.R && st.sides.R.weight};
    /* Now type it, and it logs normally. */
    const rIn2 = row("R").querySelector('[data-f="reps"]');
    rIn2.value = "11"; rIn2.dispatchEvent(new Event("change"));
    row("R").querySelector('.chk').click();
    const st2 = S.active.entries[ei].sets[0];
    return {hint, after, typed: {reps: st2.sides.R.reps, done: !!st2.sides.R.done},
            exposure: (()=>{ const e = sideExposure({date: todayStr(), at: Date.now(),
              startSide: "L", entry: S.active.entries[ei]});
              return e ? {L: e.L, R: e.R, gap: Math.round(e.gap*100)} : null; })()};
  });
  console.log("    the hint: " + JSON.stringify(r.hint));
  console.log("    after ticking untouched: " + JSON.stringify(r.after));
  console.log("    after typing 11: " + JSON.stringify(r.typed));
  ck("the eight is a hint, not a value", r.hint.value === "" && r.hint.placeholder === "8",
     JSON.stringify(r.hint));
  ck("ticking without typing logs NO reps", !r.after.reps, String(r.after.reps));
  ck("and does not log the side at all", r.after.done === false, String(r.after.done));
  ck("the pre-filled load is untouched by the refusal", r.after.weight === "30",
     String(r.after.weight));
  ck("typing the real count logs it", r.typed.reps === "11" && r.typed.done === true,
     JSON.stringify(r.typed));
  ck("so the pair is 8 against 11, not a fabricated 8 against 8",
     !!(r.exposure && r.exposure.gap > 0), JSON.stringify(r.exposure));
}

console.log("\n11b - BUT AN ORDINARY SET STILL TAKES LAST TIME'S NUMBERS, VISIBLY");
{
  const r = await ev(()=>{
    const DAY = 86400e3, now = Date.now(), wid = DAYS[2];
    S.sessions = [{id:"o1", workoutId: wid, date: dayStr(now - 4*DAY),
      startedAt: now - 4*DAY, finishedAt: now - 4*DAY + 3600e3, feel: 4,
      entries: [{name:"Cable Triceps Pushdown", reps:"8-12", rpe:"7-9",
        sets: [{weight:"50", reps:"12", rpe:"8", done:true, rest:120}]}]}];
    S.program[wid] = [{name:"Cable Triceps Pushdown", sets:2, reps:"8-12", weight:50,
      rpe:"7-9", rest:[120,150]}];
    S.pointer = 2; S.active = null; save();
    startWorkout(wid); TAB = "workout"; render();
    const ei = S.active.entries.findIndex(x=> nrm(x.name) === nrm("Cable Triceps Pushdown"));
    const rowEl = [...document.querySelectorAll('.set')].find(d=>
      d.querySelector(`[data-e="${ei}"][data-s="0"]`));
    const rIn = rowEl.querySelector('[data-f="reps"]');
    const hint = {value: rIn.value, placeholder: rIn.placeholder};
    rowEl.querySelector('.chk').click();
    const st = S.active.entries[ei].sets[0];
    const shown = rowEl.querySelector('[data-f="reps"]').value;
    return {hint, reps: st.reps, done: !!st.done, shown};
  });
  console.log("    " + JSON.stringify(r));
  ck("it offered last time's twelve as a hint", r.hint.placeholder === "12",
     JSON.stringify(r.hint));
  ck("the tick takes it", r.reps === "12" && r.done === true, JSON.stringify(r));
  ck("and writes it into the box, so it is not a silent save", r.shown === "12",
     String(r.shown));
}

console.log("\n12 - THE PLAN SAYS 'PER SIDE', BECAUSE THAT IS WHAT IT MEANS");
{
  const r = await ev(()=>{
    const paired = {name:"Preacher Curl", sets:3, reps:"8-12", weight:25, rpe:"7-9",
      rest:[120,150], perSide:true, startSide:"L"};
    const plain  = {name:"Cable Triceps Pushdown", sets:3, reps:"8-12", weight:50,
      rpe:"7-9", rest:[120,150]};
    return {paired: exLineHTML(paired), plain: exLineHTML(plain),
            label: setsLabelFor(paired), plainLabel: setsLabelFor(plain)};
  });
  console.log("    paired: " + r.paired);
  console.log("    plain:  " + r.plain);
  ck("a paired movement says per side", /per side/i.test(r.paired), r.paired);
  ck("and still says three", /3\u00d7/.test(r.paired), r.paired);
  ck("a two-handed one says nothing extra", !/per side/i.test(r.plain), r.plain);
}

console.log("\n13 - AND AN ACTIVE ASYMMETRY ADDS ONE WEAKER-SIDE SET AT THE END");
{
  const r = await ev(()=>{
    const DAY = 86400e3, now = Date.now(), wid = DAYS[0];
    /* Six exposures with the left reliably behind, which is what keeps the check on. */
    S.sessions = [0,1,2,3,4,5].map(i=> ({
      id:"w"+i, workoutId: wid, date: dayStr(now - (6-i)*4*DAY),
      startedAt: now - (6-i)*4*DAY, finishedAt: now - (6-i)*4*DAY + 3600e3, feel: 4,
      entries: [{name:"Preacher Curl", reps:"8-12", rpe:"7-9", perSide:true, startSide:"L",
        sets: [0,1,2].map(()=> ({rest:150, sides:{
          L:{weight:"25",reps:"7",rpe:"9",done:true},
          R:{weight:"25",reps:"11",rpe:"9",done:true}}}))}]}));
    DAYS.forEach(d=> S.program[d] = []);
    S.program[wid] = [{name:"Preacher Curl", sets:3, reps:"8-12", weight:25, rpe:"7-9",
      rest:[150,210], perSide:true, startSide:"L", sideMode:"matchWeaker", uni:true}];
    S.asymRetired = {}; S.asymRetest = null;
    S.planStart = Date.parse("2026-07-01T12:00:00");
    S.pointer = 0; S.active = null; save();
    const st = sideStats("Preacher Curl");
    startWorkout(wid);
    const en = S.active.entries.find(x=> nrm(x.name) === nrm("Preacher Curl"));
    const shape = (en.sets || []).map((s, i)=> pairSidesOf(en, i).join("") || "-");
    const extra = en.sets[en.sets.length - 1];
    return {weaker: st.weaker, active: st.ok && !st.closed,
            nSets: en.sets.length, shape,
            extraIsWeakOnly: !!(extra && extra.oneSide), extraSide: extra && extra.oneSide,
            why: extra && extra.why,
            /* What the week is actually asked for: three pairs and a half. */
            prescribed: (()=>{
              const filled = JSON.parse(JSON.stringify(en));
              filled.sets.forEach((s, i)=> pairSidesOf(filled, i).forEach(sd=>{
                s.sides = s.sides || {};
                s.sides[sd] = {weight:"25", reps:"8", rpe:"9", done:true};
              }));
              return sideSetsWorking(filled).reduce((t, x)=> t + x.count, 0);
            })()};
  });
  console.log("    " + JSON.stringify(r));
  ck("the check is active with the left behind",
     r.active === true && r.weaker === "L", JSON.stringify(r));
  ck("the plan's three pairs become four sets", r.nSets === 4, String(r.nSets));
  ck("the first three are pairs", r.shape.slice(0,3).join(" ") === "LR LR LR",
     r.shape.join(" "));
  ck("and the last is the weaker side alone", r.extraIsWeakOnly === true && r.extraSide === "L",
     JSON.stringify(r));
  ck("so the movement asks for three and a half sets, not four",
     r.prescribed === 3.5, String(r.prescribed));
}

console.log("\n13b - AND IT GOES AWAY WHEN THE CHECK RETIRES");
{
  const r = await ev(()=>{
    const DAY = 86400e3, now = Date.now(), wid = DAYS[0];
    /* The same movement, level: six exposures with both sides equal at equal effort. */
    S.sessions = [0,1,2,3,4,5].map(i=> ({
      id:"e"+i, workoutId: wid, date: dayStr(now - (6-i)*4*DAY),
      startedAt: now - (6-i)*4*DAY, finishedAt: now - (6-i)*4*DAY + 3600e3, feel: 4,
      entries: [{name:"Preacher Curl", reps:"8-12", rpe:"7-9", perSide:true, startSide:"L",
        sets: [0,1,2].map(()=> ({rest:150, sides:{
          L:{weight:"25",reps:"10",rpe:"8",done:true},
          R:{weight:"25",reps:"10",rpe:"8",done:true}}}))}]}));
    S.asymRetired = {}; S.asymRetest = null; S.active = null; save();
    const st = sideStats("Preacher Curl");
    startWorkout(wid);
    const en = S.active.entries.find(x=> nrm(x.name) === nrm("Preacher Curl"));
    return {retired: st.closed, nSets: en.sets.length,
            shape: (en.sets || []).map((s, i)=> pairSidesOf(en, i).join("") || "-")};
  });
  console.log("    " + JSON.stringify(r));
  ck("the sides are level, so the check comes off", r.retired === true, String(r.retired));
  ck("and the extra set is gone", r.nSets === 3, String(r.nSets));
  ck("three ordinary pairs remain", r.shape.join(" ") === "LR LR LR", r.shape.join(" "));
}

console.log("\n14 - THE REPORT PRINTS A PAIR AS ONE SET NUMBER, L THEN R");
{
  const r = await ev(()=>{
    const DAY = 86400e3, now = Date.now(), wid = DAYS[0];
    S.sessions = [{id:"rep1", workoutId: wid, date: dayStr(now - DAY),
      startedAt: now - DAY, finishedAt: now - DAY + 3600e3, feel: 4,
      entries: [{name:"Preacher Curl", reps:"8-12", rpe:"7-9", perSide:true,
        startSide:"L", sideRest:30,
        sets: [
          {rest:150, sides:{L:{weight:"25",reps:"8",rpe:"9",done:true,gap:30},
                            R:{weight:"25",reps:"11",rpe:"9",done:true}}},
          {rest:150, sides:{L:{weight:"25",reps:"7",rpe:"9",done:true},
                            R:{weight:"25",reps:"10",rpe:"9",done:true}}},
          {sides:{L:{weight:"25",reps:"6",rpe:"9",done:true}}}
        ]}]}];
    save();
    const html = buildReportHTML();
    /* Pull the rows of the sets table back out as plain text. */
    const doc = new DOMParser().parseFromString(html, "text/html");
    const tbl = [...doc.querySelectorAll("table")].find(t=>
      /Side/.test(t.querySelector("thead") ? t.querySelector("thead").textContent : ""));
    const rows = tbl ? [...tbl.querySelectorAll("tbody tr")].map(tr=>
      [...tr.querySelectorAll("td")].map(td=> td.textContent.replace(/\s+/g," ").trim())) : [];
    return {rows};
  });
  r.rows.forEach(row=> console.log("    " + JSON.stringify(row)));
  const cells = r.rows.map(x=> x.slice(-6));   // set, side, weight, reps, rpe, rest
  ck("five rows: two pairs and a left-only set", r.rows.length === 5,
     String(r.rows.length));
  ck("set one is numbered once, on the L row",
     cells[0][0] === "1" && cells[0][1] === "L", JSON.stringify(cells[0]));
  ck("and its R row carries no number", cells[1][0] === "" && cells[1][1] === "R",
     JSON.stringify(cells[1]));
  ck("the L row shows the hand-off, not a rest",
     /\u2192 R/.test(cells[0][5]), cells[0][5]);
  ck("naming the pause between the sides", /0:30 between/.test(cells[0][5]),
     cells[0][5]);
  ck("and the rest sits on the R row, after the pair",
     /2:30/.test(cells[1][5]) && /after pair/.test(cells[1][5]), cells[1][5]);
  ck("set two is numbered 2", cells[2][0] === "2", JSON.stringify(cells[2]));
  ck("and the left-only set is numbered 3 with no R row",
     cells[4][0] === "3" && cells[4][1] === "L" && r.rows.length === 5,
     JSON.stringify(cells[4]));
}

console.log(errs.length ? ("\nPAGE ERRORS: "+errs.join(" | ")) : "\nno page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
