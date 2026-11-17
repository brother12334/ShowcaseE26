import { chromium, APP_URL } from './_e26.mjs';
/* P1-5 — THE RULES HAD STOPPED TALKING TO EACH OTHER.

   From the Nov 15 2026 audit, four collisions in one log:

     Rear delts. The stall protocol cut the reverse fly 3 -> 2 sets on Oct 2 and 2 -> 1 on
     Oct 13. On Oct 19 the app RAISED the rear delt floor to 8.5 sets because they were
     not growing. One rule was removing the volume the other was asking for.

     Smith squat. A stall cut 4 -> 3 sets on Oct 31, four days after the load went 70 ->
     80 on Oct 27. The next squat session was the user's best. A load increase is the most
     ordinary reason for a few flat sessions, and reading them as a stalled programme
     punishes the progression that caused them.

     Incline Smith. The Body tab raised it to 5 sets on Sep 29. The plan check cut it 5 ->
     2 on Oct 6, because chest was over its ceiling. Nothing stopped the Body tab
     proposing a change the plan check would undo a week later.

     Squat sets. Oct 6, the plan check cut 4 -> 2 and the user restored it one minute
     later. Oct 8, 2 -> 3, and the user cut it two minutes later. The app had no memory of
     being overruled, so it kept proposing what had just been refused.

   One shared check every set change passes, a stall definition that excludes the sessions
   that are not evidence, and a memory of having been overruled. */
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

const boot = ()=> ev(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, rpe:true});
  S.splitId=DEFAULT_SPLIT; applySplit();
  S.active=null; S.flags=[]; S.planLog=[]; S.marks=[]; S.deload=null;
  S.stalls={}; S.dayFlags={}; S.joint={}; S.lmFloor={}; S.lmFloorAt={};
  S.lmSuggest={}; S.reversed={}; S.setCutLapsed={};
  save();
});

console.log("1 - ONE CHECK EVERY SET CHANGE PASSES");
{
  await boot();
  const r = await ev(()=>{
    const wid = DAYS[0], EX = "Cable Reverse Rear Delt Fly";
    S.program[wid] = [{name: EX, sets: 3, reps:"12-15", weight: 30, rpe:"7-9", rest:[90,150]}];
    save();
    const A = bodyAnalysis();
    const mm = musclesFor(EX) || {};
    const g = Object.keys(mm).find(k=> mm[k] >= 1);
    const L = (A.lm && A.lm[g]) || adjustedLandmarks(A, g) || GROUPS[g];
    /* Cutting to one set takes the muscle under its floor; adding ten takes it over the
       ceiling. Both are conflicts the app should SHOW rather than apply. */
    return {g, mev: r1(L.mev), mrv: r1(L.mrv),
            cutTo1: setChangeConflict(wid, 0, 1),
            cutTo2: setChangeConflict(wid, 0, 2),
            upTo3:  setChangeConflict(wid, 0, 3),
            upTo30: setChangeConflict(wid, 0, 30)};
  });
  console.log("    " + JSON.stringify(r));
  ck("cutting to one set is refused as under the floor",
     !!(r.cutTo1 && /floor|minimum|below/i.test(r.cutTo1.say)), JSON.stringify(r.cutTo1));
  /* The muscle it names is whichever one the change would hurt most, not necessarily
     the movement's primary: a reverse fly also carries mid back, and mid back's floor is
     the one this cut would breach first. That is more useful, not less. */
  ck("and it names a muscle, its limit and the figure it would land on",
     !!(r.cutTo1 && r.cutTo1.g && r.cutTo1.limit > 0 && r.cutTo1.next >= 0
        && /sets a week/.test(r.cutTo1.say)), JSON.stringify(r.cutTo1));
  ck("leaving it alone is no conflict", r.upTo3 === null, JSON.stringify(r.upTo3));
  ck("and thirty sets is refused as over the ceiling",
     !!(r.upTo30 && /ceiling|recover/i.test(r.upTo30.say)), JSON.stringify(r.upTo30));
}

console.log("\n2 - A STALL CUT CANNOT TAKE A MUSCLE UNDER ITS FLOOR (REAR DELTS, OCT 2 AND 13)");
{
  await boot();
  const r = await ev(()=>{
    const wid = DAYS[0], EX = "Cable Reverse Rear Delt Fly";
    /* The fly is the ONLY rear delt work in the plan, so the arithmetic is explicit. The
       default split carries rear delts on several days, which is realistic and makes a
       three-set cut nowhere near the floor - a fine thing in life and useless for
       testing the rule. */
    DAYS.forEach(d=> S.program[d] = []);
    S.program[wid] = [{name: EX, sets: 3, reps:"12-15", weight: 30, rpe:"7-9", rest:[90,150]}];
    /* And a floor set by hand, so this tests the RULE rather than whatever the
       calibration says about rear delts once four sessions are logged. Under three sets a
       week against a floor of three: cutting one breaches it. */
    const mmX = musclesFor(EX) || {};
    const gX = Object.keys(mmX).find(kk=> mmX[kk] >= 1);
    S.lmFloor = {}; S.lmFloor[gX] = 3;
    /* Three flat exposures, well clear of any load change, so the stall is real. */
    const DAY = 86400e3, now = Date.now();
    S.sessions = [0,1,2,3].map(i=> ({id:"s"+i, workoutId: wid,
      date: dayStr(now - (4-i)*4*DAY), startedAt: now - (4-i)*4*DAY,
      finishedAt: now - (4-i)*4*DAY + 3600e3, feel: 4,
      entries: [{name: EX, reps:"12-15", rpe:"7-9",
        sets: [0,1,2].map(()=> ({weight:"30", reps:"13", rpe:"8", done:true, rest:120}))}]}));
    save();
    S.sessions.forEach(s=> updateStalls(s));
    /* The stall counter is keyed by SLOT and name now, not by name alone - the same
       movement in two days of the split kept one shared counter, so a flat session on each
       read as two stalled sessions of the same thing. stallKey() is the key. */
    const run = ((S.stalls || {})[stallKey(wid, EX)] || {}).n;
    const v = stallVerdict(EX, wid);
    const flags = [];
    recordFlags(S.sessions[3], [{name: EX, stall: v}].filter(x=> x.stall));
    const f = openFlags().find(x=> x && x.kind === "stall");
    const conflictNow = setChangeConflict(wid, 0, 2);
    const blockedNow = stallCutBlocked(EX, wid);
    const before = (S.program[wid] || [])[0].sets;
    const applied = f ? applyFlag(f.id, "sets") : null;
    return {run, verdict: v && v.kind, verdictSub: v && v.sub, flagged: !!f, applied,
            setsBefore: before, setsAfter: (S.program[wid] || [])[0].sets,
            conflict: v && v.conflict, conflictNow, blockedNow};
  });
  console.log("    " + JSON.stringify(r));
  ck("three flat exposures is a stall", r.run >= 3, String(r.run));
  ck("but cutting a set would take rear delts under their floor, so it is not offered",
     r.verdict !== "programme" || r.applied === false, JSON.stringify(r));
  ck("and the sets are untouched", r.setsAfter === r.setsBefore,
     r.setsBefore + " -> " + r.setsAfter);
  ck("the conflict is stated rather than silent, with its figures",
     !!(r.conflict && r.conflict.kind === "floor" && r.conflict.limit === 3
        && r.conflict.next < 3), JSON.stringify(r.conflict));
  ck("and the verdict offers a swap or a load reset instead",
     /different movement|reset the load/i.test((r.verdictSub || "")), r.verdictSub);
}

console.log("\n3 - NO STALL WITHIN TWO EXPOSURES OF A LOAD CHANGE (SMITH SQUAT, OCT 31)");
{
  await boot();
  const r = await ev(()=>{
    const wid = DAYS[1], EX = "Smith Machine Squat";
    S.program[wid] = [{name: EX, sets: 4, reps:"6-10", weight: 80, rpe:"7-9", rest:[150,240]}];
    /* Floors effectively off, so nothing here is blocked by the constraint check and the
       section measures only the grace period after a load change. A floor of 1 was not
       low enough: a squat carries lower back at 0.3 of a set, so cutting one set took it
       from 1.1 to 0.8 a week and lower back became the binding constraint - correct of
       the rule, and noise for this section. */
    S.lmFloor = {}; GKEYS.forEach(gg=> S.lmFloor[gg] = 0.1);
    const DAY = 86400e3, now = Date.now();
    /* Three flat sessions at 80. The load went 70 -> 80 four days before the last of
       them, which is the most ordinary reason for a few flat sessions there is. */
    /* FOUR sessions for a run of three: the first has no prior to be compared with. */
    S.sessions = [0,1,2,3].map(i=> ({id:"q"+i, workoutId: wid,
      date: dayStr(now - (4-i)*4*DAY), startedAt: now - (4-i)*4*DAY,
      finishedAt: now - (4-i)*4*DAY + 3600e3, feel: 4,
      entries: [{name: EX, reps:"6-10", rpe:"7-9",
        sets: [0,1,2,3].map(()=> ({weight:"80", reps:"8", rpe:"8", done:true, rest:180}))}]}));
    S.planLog = [{at: now - 4*DAY, date: dayStr(now - 4*DAY), day: wid, kind:"weight",
                  name: EX, changes:["70 lb → 80 lb"]}];
    save();
    S.sessions.forEach(s=> updateStalls(s));
    const withChange = ((S.stalls || {})[stallKey(wid, EX)] || {}).n;
    const vChange = stallVerdict(EX, wid);
    /* The same three sessions with no recent load change: that IS a stall. */
    S.planLog = []; S.stalls = {}; save();
    S.sessions.forEach(s=> updateStalls(s));
    const noChange = ((S.stalls || {})[stallKey(wid, EX)] || {}).n;
    const vNone = stallVerdict(EX, wid);
    return {withChange, vChange: vChange && vChange.kind,
            noChange, vNone: vNone && vNone.kind,
            why: vNone && vNone.conflict, blocked: stallCutBlocked(EX, wid)};
  });
  console.log("    " + JSON.stringify(r));
  ck("flat sessions just after a load increase do not count toward a stall",
     r.withChange < 3, String(r.withChange));
  ck("so no stall verdict is reached", !r.vChange, String(r.vChange));
  ck("the same sessions with no load change do count", r.noChange >= 3, String(r.noChange));
  ck("and that is a stall", r.vNone === "programme", String(r.vNone));
}

console.log("\n4 - A STALL CUT AND A FLOOR RAISE CANNOT RUN AT ONCE (OCT 13 VS OCT 19)");
{
  await boot();
  const r = await ev(()=>{
    const wid = DAYS[0], EX = "Cable Reverse Rear Delt Fly";
    const mm = musclesFor(EX) || {};
    const g = Object.keys(mm).find(k=> mm[k] >= 1);
    /* Plenty of sets AND floors effectively off, so the open proposal is the only thing
       that can block here. */
    S.program[wid] = [{name: EX, sets: 8, reps:"12-15", weight: 30, rpe:"7-9", rest:[90,150]}];
    S.lmFloor = {}; GKEYS.forEach(gg=> S.lmFloor[gg] = 0.1);
    S.lmSuggest = {open: {g, dir: "up", at: Date.now()}};
    save();
    const blocked = stallCutBlocked(EX, wid);
    S.lmSuggest = {};
    save();
    const free = stallCutBlocked(EX, wid);
    return {g, blocked, free};
  });
  console.log("    " + JSON.stringify(r));
  ck("with a floor raise open for that muscle, a stall cut is blocked",
     !!(r.blocked && /floor|asking for more|raise/i.test(r.blocked.say)),
     JSON.stringify(r.blocked));
  ck("and with none open it runs", r.free === null, JSON.stringify(r.free));
}

console.log("\n5 - BEING OVERRULED IS REMEMBERED FOR A FORTNIGHT (OCT 6 AND 8)");
{
  await boot();
  const r = await ev(()=>{
    const wid = DAYS[1], EX = "Smith Machine Squat";
    S.program[wid] = [{name: EX, sets: 4, reps:"6-10", weight: 80, rpe:"7-9", rest:[150,240]}];
    save();
    const before = changeReversedRecently("sets", EX, wid);
    /* The app cut 4 -> 2 and the user put it straight back. */
    noteChangeReversed("sets", EX, wid, {from: 4, to: 2});
    const after = changeReversedRecently("sets", EX, wid);
    /* A fortnight on, it may ask again. */
    const k = Object.keys(S.reversed || {})[0];
    if(k) S.reversed[k] = Date.now() - 15 * 86400e3;
    save();
    const later = changeReversedRecently("sets", EX, wid);
    /* And a different movement was never overruled. */
    const other = changeReversedRecently("sets", "Leg Press", wid);
    return {before: !!before, after: !!after, say: after && after.say,
            later: !!later, other: !!other};
  });
  console.log("    " + JSON.stringify(r));
  ck("nothing is remembered to begin with", r.before === false, String(r.before));
  ck("a reversal is remembered", r.after === true, String(r.after));
  ck("and says so, readably", /reversed/i.test(r.say || "") && !/day days/.test(r.say || ""),
     r.say);
  ck("it lapses after a fortnight", r.later === false, String(r.later));
  ck("and it is per movement, not global", r.other === false, String(r.other));
}

console.log("\n6 - AND A FLOOR RAISE CANNOT PUSH A MUSCLE PAST ITS CEILING");
{
  await boot();
  const r = await ev(()=>{
    const A = bodyAnalysis();
    const out = {};
    GKEYS.slice(0, 6).forEach(g=>{
      const L = (A.lm && A.lm[g]) || adjustedLandmarks(A, g) || GROUPS[g];
      out[g] = {mev: r1(L.mev), mrv: r1(L.mrv), cap: floorRaiseCap(A, g)};
    });
    return out;
  });
  const rows = Object.entries(r);
  console.log("    " + JSON.stringify(r));
  ck("every muscle has a raise cap", rows.every(([,v])=> v.cap > 0),
     JSON.stringify(rows.filter(([,v])=> !(v.cap > 0))));
  ck("and no cap is above its ceiling",
     rows.every(([,v])=> v.cap <= v.mrv + 0.001),
     JSON.stringify(rows.filter(([,v])=> v.cap > v.mrv + 0.001)));
}

console.log(errs.length ? ("\nPAGE ERRORS: "+errs.join(" | ")) : "\nno page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
