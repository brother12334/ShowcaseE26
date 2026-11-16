import { chromium, APP_URL } from './_e26.mjs';
/* P1-6 — THE PLAN AND THE LOG HAD STOPPED AGREEING, AND THE PLAN WON ANYWAY.

   From the Nov 15 2026 audit:

     The rear delt fly was planned at 30 lb for about three months while every logged
     session used 32.5. On Nov 14 the plan went 30 -> 35, reasoned "last set cleared the
     top of the range" - and the logged last set was 12 reps at RPE 9 against a range
     topping out at 15. The trigger was not supported by the log it claimed to read.

     Smith prescriptions sat 25 lb - exactly a bar - away from what was logged: flat
     bench planned 230 against 105 logged, incline 90 against 95-100, shoulder press cut
     to 60 on Nov 5 against 75 logged.

     And the change log is full of rows that changed nothing: "145 -> 145", "90 -> 90",
     "45 -> 45", with Aug 4 carrying the same 145 -> 145 twice.

   Three faults behind that: progression reasoned from the PLANNED load rather than the
   last one actually lifted; a verdict was formed against whatever rep range the session
   happened to be frozen with rather than the one the slot prescribes now; and nothing
   stopped a no-op or a duplicate being written down as a change. */
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
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, rpe:true,
    smithWeight:25, barWeight:45, barMode:"plates"});
  S.splitId=DEFAULT_SPLIT; applySplit();
  S.active=null; S.flags=[]; S.planLog=[]; S.marks=[]; S.deload=null;
  S.stalls={}; S.dayFlags={}; S.joint={}; S.planAck={};
  save();
});

console.log("1 - THE NOV 14 REAR DELT: A VERDICT HAS TO MATCH THE LOG IT CITES");
{
  await boot();
  const r = await ev(()=>{
    const DAY = 86400e3, now = Date.now(), wid = DAYS[0];
    const EX = "Cable Reverse Rear Delt Fly";
    /* The slot prescribes 12-15 at 30 lb. Every session has actually used 32.5, and the
       last one managed 12 reps at RPE 9 - inside the range, nowhere near its top. The
       session entry is frozen with an OLDER range of 10-12, which is how a verdict got
       formed that the current prescription does not support. */
    S.program[wid] = [{name: EX, sets: 3, reps: "12-15", weight: 30, rpe: "7-9",
                       rest: [90, 150]}];
    const mk = (id, at)=> ({id, workoutId: wid, date: dayStr(at), startedAt: at,
      finishedAt: at + 3600e3, feel: 4,
      entries: [{name: EX, reps: "10-12", rpe: "7-9",
        sets: ["12","12","12"].map(x=> ({weight:"32.5", reps:x, rpe:"9", done:true,
                                         rest:120}))}]});
    S.sessions = [mk("r0", now - 9*DAY), mk("r1", now - 5*DAY), mk("r2", now - DAY)];
    save();
    const sess = S.sessions[2];
    const v = progressionFor(sess, sess.entries[0]);
    return {kind: v && v.kind, to: v && v.to,
            planRange: repRange((findProgramEntry(EX) || {}).reps),
            frozenRange: repRange(sess.entries[0].reps),
            lastLogged: lastLoggedLoad(EX, wid),
            planned: (findProgramEntry(EX) || {}).weight};
  });
  console.log("    " + JSON.stringify(r));
  ck("the slot prescribes 12-15", String(r.planRange) === "12,15", String(r.planRange));
  ck("the session was frozen with the old 10-12", String(r.frozenRange) === "10,12",
     String(r.frozenRange));
  ck("twelve reps does NOT clear a range topping at fifteen", r.kind !== "up",
     r.kind + " -> " + r.to);
  ck("and the load the rules reason from is the 32.5 actually lifted, not the planned 30",
     r.lastLogged === 32.5, String(r.lastLogged));
}

console.log("\n2 - A PLAN THAT HAS DRIFTED IS RAISED ONCE, AFTER TWO SESSIONS");
{
  const r = await ev(()=>{
    const DAY = 86400e3, now = Date.now(), wid = DAYS[0];
    const EX = "Cable Reverse Rear Delt Fly";
    const mk = (id, at, w)=> ({id, workoutId: wid, date: dayStr(at), startedAt: at,
      finishedAt: at + 3600e3, feel: 4,
      entries: [{name: EX, reps: "12-15", rpe: "7-9",
        sets: ["13","13","13"].map(x=> ({weight:String(w), reps:x, rpe:"8", done:true,
                                         rest:120}))}]});
    const out = {};
    /* One session above the plan is a heavier day, not a drifted plan. */
    S.sessions = [mk("d0", now - 5*DAY, 32.5)];
    S.active = {id:"a", workoutId: wid, date: todayStr(), startedAt: now,
                entries: [{name: EX, reps:"12-15", rpe:"7-9",
                           sets:[{weight:"",reps:"",rpe:"",done:false}]}]};
    save();
    out.one = /plan is behind/.test(planBehindLineHTML(S.active.entries[0]));
    /* Two in a row is a plan that has stopped describing what you lift. */
    S.sessions = [mk("d0", now - 9*DAY, 32.5), mk("d1", now - 5*DAY, 32.5)];
    save();
    const html = planBehindLineHTML(S.active.entries[0]);
    out.two = /plan is behind/.test(html);
    out.offers = /32.5/.test(html);
    /* Said once: dismiss it and it stays dismissed for that slot and figure. */
    planDriftAck(EX, wid, 32.5);
    out.afterAck = /plan is behind/.test(planBehindLineHTML(S.active.entries[0]));
    /* But a NEW figure is a new thing to say. */
    S.sessions = [mk("d0", now - 9*DAY, 35), mk("d1", now - 5*DAY, 35)];
    save();
    out.newFigure = /plan is behind/.test(planBehindLineHTML(S.active.entries[0]));
    return out;
  });
  console.log("    " + JSON.stringify(r));
  ck("one session above the plan says nothing", r.one === false, String(r.one));
  ck("two in a row does", r.two === true, String(r.two));
  ck("and it offers the figure actually lifted", r.offers === true, String(r.offers));
  ck("answered once, it stops asking", r.afterAck === false, String(r.afterAck));
  ck("but a different figure is asked afresh", r.newFigure === true, String(r.newFigure));
}

console.log("\n3 - A SMITH PRESCRIPTION IS WHAT YOU WOULD ACTUALLY LOAD");
{
  const r = await ev(()=>{
    const out = {};
    ["plates", "total"].forEach(mode=>{
      S.prefs.barMode = mode; S.prefs.smithWeight = 25; save();
      /* 80 lb of plates on a 25 lb carriage. In "plates only" the plan should read 80
         and the true load 105; in "bar + plates" the plan should read 105. The audited
         log has prescriptions sitting exactly one bar away from what was logged. */
      const e = {name:"Smith Machine Squat", sets:3, reps:"6-10", weight: mode === "total" ? 105 : 80};
      out[mode] = {shown: prescribedLoadShown(e), implement: implementWeight(e.name),
                   trueLoad: prescribedTrueLoad(e)};
    });
    S.prefs.barMode = "plates"; save();
    return out;
  });
  console.log("    " + JSON.stringify(r));
  ck("plates-only shows the plates", r.plates.shown === 80, String(r.plates.shown));
  ck("and means 105 on the bar", r.plates.trueLoad === 105, String(r.plates.trueLoad));
  ck("bar+plates shows the whole thing", r.total.shown === 105, String(r.total.shown));
  ck("which is the same lift", r.total.trueLoad === 105, String(r.total.trueLoad));
}

console.log("\n4 - A CHANGE THAT CHANGED NOTHING IS NOT A CHANGE");
{
  const r = await ev(()=>{
    S.planLog = [];
    logPlanChange("weight", DAYS[0], "Smith Machine Squat", ["145 → 145"], {});
    logPlanChange("weight", DAYS[0], "Smith Machine Squat", ["90 → 90"], {});
    logPlanChange("weight", DAYS[0], "Cable Fly", ["45 → 45"], {});
    const afterNoOps = (S.planLog || []).length;
    /* A real change, then the very same row again - the Aug 4 duplicate. */
    logPlanChange("weight", DAYS[0], "Smith Machine Squat", ["80 → 90"], {});
    const afterReal = (S.planLog || []).length;
    logPlanChange("weight", DAYS[0], "Smith Machine Squat", ["80 → 90"], {});
    const afterDupe = (S.planLog || []).length;
    /* And a different change on the same movement is still a change. */
    logPlanChange("weight", DAYS[0], "Smith Machine Squat", ["90 → 100"], {});
    return {afterNoOps, afterReal, afterDupe, afterNext: (S.planLog || []).length,
            rows: (S.planLog || []).map(x=> x.changes[0])};
  });
  console.log("    " + JSON.stringify(r));
  ck("three no-op rows are not written at all", r.afterNoOps === 0, String(r.afterNoOps));
  ck("a real change is", r.afterReal === 1, String(r.afterReal));
  ck("the same row twice is written once", r.afterDupe === 1, String(r.afterDupe));
  ck("and the next real change is written", r.afterNext === 2, JSON.stringify(r.rows));
}

console.log("\n5 - AND A PROGRESSION ROW SAYS WHICH SET TRIGGERED IT");
{
  await boot();
  const r = await ev(()=>{
    const DAY = 86400e3, now = Date.now(), wid = DAYS[0];
    const EX = "Cable Triceps Pushdown";
    S.program[wid] = [{name: EX, sets: 3, reps: "8-12", weight: 50, rpe: "7-9",
                       rest: [90, 150]}];
    const sess = {id:"t1", workoutId: wid, date: dayStr(now - DAY), startedAt: now - DAY,
      finishedAt: now - DAY + 3600e3, feel: 4,
      entries: [{name: EX, reps: "8-12", rpe: "7-9",
        sets: [{weight:"50",reps:"12",rpe:"8",done:true,rest:120},
               {weight:"50",reps:"12",rpe:"8",done:true,rest:120},
               {weight:"50",reps:"12",rpe:"8",done:true,rest:120}]}]};
    S.sessions = [sess]; S.planLog = []; save();
    const v = progressionFor(sess, sess.entries[0]);
    if(!v || v.to == null) return {err: "no verdict", kind: v && v.kind};
    applyProgression(EX, v.to, null, progReason(v), {wid, trigger: v.trigger});
    const row = (S.planLog || []).slice(-1)[0] || {};
    return {kind: v.kind, trigger: v.trigger,
            rowTrigger: row.trigger, changes: row.changes};
  });
  console.log("    " + JSON.stringify(r));
  ck("the verdict is a raise", r.kind === "up", String(r.kind));
  ck("it names the session that earned it", !!(r.trigger && r.trigger.sessionId === "t1"),
     JSON.stringify(r.trigger));
  ck("and the set number within it", !!(r.trigger && r.trigger.set >= 1),
     JSON.stringify(r.trigger));
  ck("and the change record keeps it",
     !!(r.rowTrigger && r.rowTrigger.sessionId === "t1" && r.rowTrigger.set >= 1),
     JSON.stringify(r.rowTrigger));
}

console.log("\n6 - THE LOAD LOOKUP IS SLOT-SCOPED, AND SEES A PAIRED SET");
{
  await boot();
  const r = await ev(()=>{
    const DAY = 86400e3, now = Date.now();
    const A = DAYS[0], B = DAYS[2], EX = "Preacher Curl";
    S.program[A] = [{name: EX, sets: 3, reps: "8-12", weight: 25, rpe: "7-9", rest:[90,150]}];
    S.program[B] = [{name: EX, sets: 3, reps: "8-12", weight: 40, rpe: "7-9", rest:[90,150]}];
    S.sessions = [
      {id:"sa", workoutId: A, date: dayStr(now - 5*DAY), startedAt: now - 5*DAY,
       finishedAt: now - 5*DAY + 3600e3, feel: 4,
       entries: [{name: EX, reps:"8-12", rpe:"7-9",
         sets: [{weight:"25", reps:"10", rpe:"8", done:true}]}]},
      /* The other day of the rotation, heavier, and logged as PAIRS. */
      {id:"sb", workoutId: B, date: dayStr(now - 2*DAY), startedAt: now - 2*DAY,
       finishedAt: now - 2*DAY + 3600e3, feel: 4,
       entries: [{name: EX, reps:"8-12", rpe:"7-9", perSide:true, startSide:"L",
         sets: [{rest:150, sides:{L:{weight:"40",reps:"9",rpe:"9",done:true},
                                  R:{weight:"40",reps:"9",rpe:"9",done:true}}}]}]}
    ];
    save();
    return {anyDay: lastLoggedLoad(EX), onA: lastLoggedLoad(EX, A), onB: lastLoggedLoad(EX, B)};
  });
  console.log("    " + JSON.stringify(r));
  ck("asked of the whole log it finds the most recent, read through the adapter",
     r.anyDay === 40, String(r.anyDay));
  ck("asked of the lighter day it answers 25", r.onA === 25, String(r.onA));
  ck("and of the heavier, paired day, 40", r.onB === 40, String(r.onB));
}

console.log("\n7 - THE PRE-FILLED LOAD IS THIS DAY'S, NOT THE OTHER DAY'S");
{
  /* planLoadPh is what an empty weight box suggests, and since the tick now BANKS a
     shown-but-unstored value it is no longer a display fallback: a wrong suggestion gets
     written down. The same movement on two days of a split has two loads, so an unscoped
     lookup offered whichever day came first in the rotation - tick without typing on the
     other one and that is the load you logged. */
  const r = await ev(()=>{
    const A = DAYS[1], B = DAYS[3], EX = "Smith Machine Squat";
    DAYS.forEach(d=> S.program[d] = []);
    S.program[A] = [{name: EX, sets: 3, reps: "6-10", weight: 80, rpe: "7-9", rest:[150,210]}];
    S.program[B] = [{name: EX, sets: 3, reps: "6-10", weight: 60, rpe: "7-9", rest:[150,210]}];
    S.sessions = []; S.flags = []; S.planLog = []; S.active = null;
    S.prefs.barMode = "total"; S.prefs.smithWeight = 25;
    save();
    const out = {};
    [["A", A, 80], ["B", B, 60]].forEach(([tag, wid, want])=>{
      S.active = null;
      S.pointer = DAYS.indexOf(wid);
      startWorkout(wid);
      const en = S.active.entries.find(x=> nrm(x.name) === nrm(EX));
      out[tag + "ph"] = planLoadPh(en, null, 0);
      out[tag + "plan"] = planLoadFor(en, 0);
      TAB = "workout"; render();
      const ei = S.active.entries.indexOf(en);
      const rowEl = [...document.querySelectorAll('.set')].find(d=>
        d.querySelector(`[data-e="${ei}"][data-s="0"]`));
      /* Reps typed, load left exactly as offered, then ticked - the user's case. */
      const rIn = rowEl.querySelector('[data-f="reps"]');
      rIn.value = "8"; rIn.dispatchEvent(new Event("change"));
      rowEl.querySelector('.chk').click();
      out[tag + "logged"] = S.active.entries[ei].sets[0].weight;
      out[tag + "want"] = want;
      /* AND WITH NO FROZEN PRESCRIPTION, which is the case the programme fallback is
         actually for: an entry whose plan carried no load at Start, or one added
         mid-session. That is where the unscoped lookup bit \u2014 measured on a Legs B
         session, the box offered Legs A's load \u2014 and it is the reachable one, because
         the snapshot gets there first whenever there is a snapshot. */
      delete en.planWeight; delete en.weight;
      out[tag + "bare"] = planLoadPh(en, null, 1);
      out[tag + "bareFor"] = planLoadFor(en, 1);
    });
    return out;
  });
  console.log("    " + JSON.stringify(r));
  ck("day A's box offers 80", String(r.Aph) === "80", String(r.Aph));
  ck("and day B's offers 60, not A's 80", String(r.Bph) === "60", String(r.Bph));
  ck("planLoadFor agrees on A", String(r.Aplan) === "80", String(r.Aplan));
  ck("and on B", String(r.Bplan) === "60", String(r.Bplan));
  ck("so ticking without typing logs 80 on day A", String(r.Alogged) === "80",
     String(r.Alogged));
  ck("and 60 on day B", String(r.Blogged) === "60", String(r.Blogged));
  ck("with no frozen prescription, day A still offers its own 80",
     String(r.Abare) === "80" && String(r.AbareFor) === "80",
     r.Abare + " / " + r.AbareFor);
  ck("and day B its own 60, not the first day's 80",
     String(r.Bbare) === "60" && String(r.BbareFor) === "60",
     r.Bbare + " / " + r.BbareFor);
}

console.log(errs.length ? ("\nPAGE ERRORS: "+errs.join(" | ")) : "\nno page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
