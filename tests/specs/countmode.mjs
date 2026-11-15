import { chromium, APP_URL } from './_e26.mjs';
/* P0-2 — A CHANGE IN HOW A LOAD IS COUNTED IS NOT A CHANGE IN STRENGTH.

   From the Nov 15 2026 audit of one user's export:

     Oct 4: Dumbbell Bulgarian Split Squat 25 -> 160 lb, labelled "Double progression".
     Oct 6: Weighted Chest Dips bodyweight -> 142.6 lb. Captain's Chair ~20 -> 159.6.
     None of that was progression. It was the app starting to count the lifter's own
     139.6 lb on movements that carry it.

     Early September: every Smith lift gained about 25 lb in one or two sessions at the
     same reps (squat 35 -> 60, shoulder press 50 -> 75, incline 70 -> 95). That was the
     25 lb bar starting to be counted.

     Sep 23: "Barbell loads" was switched three times in eleven minutes, rewriting 112
     logged sets each time and logging three change rows for one decision.

   Those fake gains are what the floor cuts of P0-3 were justified by, so this is the
   item everything downstream reads.

   The bar half was already handled: entryBarAdd() stamps the implement on every entry
   and windowStats() adds it back, so a plates-only log and a bar+plates log of the same
   lift agree. Section 2 locks that in. The bodyweight half was not handled at all. */
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
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, rpe:true,
    smithWeight: 25, barWeight: 45, barMode: "plates"});
  S.splitId=DEFAULT_SPLIT; applySplit(); S.active=null; S.flags=[]; S.planLog=[];
  save();
});

/* Twelve weeks of one movement at an UNCHANGING physical performance. The only thing
   that changes is the convention the number is written in, exactly half way through.
   `stamp` is what the app records on an entry performed under the new convention. */
const seed = (exercise, oldW, newW, stamp)=> ev(a=>{
  const DAY = 86400e3, now = Date.now();
  S.bodyLog = {};
  // one weigh-in, before any of it, so the lifter's own weight is knowable throughout
  S.bodyLog[dayStr(now - 90*DAY)] = {w: 139.6, at: now - 90*DAY};
  S.sessions = [];
  for(let i = 11; i >= 0; i--){
    const t = now - (i * 7 + 1) * DAY;
    const old = i >= 6;                               // first half: old convention
    const en = {name: a.exercise, reps: "6-10", rpe: "7-9",
      sets: [0,1,2].map(()=> ({weight: String(old ? a.oldW : a.newW),
                               reps: "8", rpe: "8", done: true}))};
    if(!old && a.stamp) Object.assign(en, a.stamp);
    S.sessions.push({id:"s"+i, workoutId: DAYS[0], date: dayStr(t), startedAt: t,
                     finishedAt: t + 3600e3, feel: 4, entries: [en]});
  }
  save();
  const W = 6 * 7 * DAY, now2 = Date.now();
  const mm = musclesFor(a.exercise) || {};
  const m = Object.keys(mm)[0];
  const recent = windowStats(now2 - W, now2 + 1)[m];
  const before = windowStats(now2 - 2*W, now2 - W)[m];
  return {m, recent: recent && recent.best, before: before && before.best};
}, {exercise, oldW, newW, stamp});

console.log("1 - TURNING ON BODYWEIGHT COUNTING IS NOT AN E1RM JUMP");
{
  /* A weighted dip at a belt of 25 lb on a 139.6 lb lifter. Written as the belt alone
     before the switch and as the true total after it, for the same set. */
  const r = await seed("Weighted Chest Dip", 25, 164.6, {bwOn: 139.6});
  const jump = r.before > 0 ? (r.recent - r.before) / r.before : 0;
  console.log("    " + r.m + ": before " + Math.round(r.before) + " -> after "
              + Math.round(r.recent) + "  (" + Math.round(jump*100) + "%)");
  ck("both halves have a strength figure", r.before > 0 && r.recent > 0,
     r.before + " / " + r.recent);
  ck("and the figure does not jump, because nothing was lifted that was not lifted before",
     Math.abs(jump) <= 0.05, Math.round(jump*100) + "%");
}

console.log("2 - NOR IS STARTING TO COUNT THE BAR (already handled — locked in here)");
{
  /* A Smith squat at 35 lb of plates on a 25 lb carriage: written as plates before the
     switch, as bar + plates after. entryBarAdd() is what makes these agree. */
  const r = await seed("Smith Machine Squat", 35, 60, {barAdd: 0});
  const jump = r.before > 0 ? (r.recent - r.before) / r.before : 0;
  console.log("    " + r.m + ": before " + Math.round(r.before) + " -> after "
              + Math.round(r.recent) + "  (" + Math.round(jump*100) + "%)");
  ck("the bar does not read as strength either", Math.abs(jump) <= 0.05,
     Math.round(jump*100) + "%");
}

console.log("2b - AND NOT WHEN THE APP HAS NEVER BEEN TOLD WHAT THE CARRIAGE WEIGHS");
{
  /* Section 2 works because implementWeight() knows the Smith is 25 lb. Unknown stays
     unknown by design \u2014 a guess about a gym is worth less than no guess \u2014 so an
     entry logged before the switch, carrying no stamp, gets nothing added back and the
     switch reads as 25 lb of free strength. This is the likelier shape of the audited
     user's September: the numbers moved and no profile said why. */
  const r = await ev(()=>{ S.prefs.smithWeight = null; S.prefs.barWeight = null; save(); });
  const t = await seed("Smith Machine Squat", 35, 60, {barAdd: 0});
  const jump = t.before > 0 ? (t.recent - t.before) / t.before : 0;
  console.log("    " + t.m + ": before " + Math.round(t.before) + " -> after "
              + Math.round(t.recent) + "  (" + Math.round(jump*100) + "%)");
  ck("an unknown carriage is still not strength", Math.abs(jump) <= 0.05,
     Math.round(jump*100) + "%");
  await ev(()=>{ S.prefs.smithWeight = 25; S.prefs.barWeight = 45; save(); });
}

console.log("3 - A COUNTING CHANGE IS NEVER LOGGED AS PROGRESSION");
{
  const r = await ev(()=>{
    S.planLog = [];
    const rows = (S.planLog || []);
    /* Grade the most recent session of the dip history above: at an unchanged physical
       performance the grade must not read a raise out of the convention change. */
    const sess = S.sessions[S.sessions.length - 1];
    S.program[DAYS[0]] = [{name: sess.entries[0].name, sets: 3, reps: "6-10",
                           weight: 164.6, rpe: "7-9", rest: [180,240]}];
    const list = (sess.entries || []).map(en=> progressionFor(sess, en)).filter(Boolean);
    return {kinds: list.map(x=> x && x.kind),
            rows: (S.planLog || []).map(x=> ({kind: x.kind, note: x.note, ch: x.changes}))};
  });
  console.log("    verdicts " + JSON.stringify(r.kinds));
  ck("no row claims double progression off a convention change",
     !r.rows.some(x=> /double progression/i.test(x.note || "")),
     JSON.stringify(r.rows));
}

console.log("4 - ONE DECISION ABOUT THE BAR CONVENTION IS ONE REWRITE AND ONE ROW");
{
  const r = await ev(()=>{
    S.planLog = [];
    const DAY = 86400e3, now = Date.now();
    S.sessions = [{id:"bm", workoutId: DAYS[0], date: dayStr(now - DAY), startedAt: now - DAY,
      finishedAt: now - DAY + 3600e3, feel: 4,
      entries: [{name:"Smith Machine Squat", reps:"6-10", rpe:"7-9", barAdd: 25,
        sets: [{weight:"35", reps:"8", rpe:"8", done:true}]}]}];
    S.program[DAYS[0]] = [{name:"Smith Machine Squat", sets:3, reps:"6-10", weight:35,
                           rpe:"7-9", rest:[180,240]}];
    save();
    /* Three switches in a row, which is what the Sep 23 log shows: total, plates,
       total. The lifter made one decision and the app rewrote everything three times. */
    const seq = ["total", "plates", "total"];
    let from = trainPrefs().barMode || "plates";
    seq.forEach(to=>{
      const pl = barModeConvertPlan(to);
      if(pl && (pl.sets.length || pl.plan.length)) barModeConvertApply(pl, to, from);
      S.prefs.barMode = to; save(); from = to;
    });
    return {rows: (S.planLog || []).filter(x=> /barbell loads/i.test(x.name || "")).length,
            w: String(((S.sessions[0].entries[0].sets || [])[0] || {}).weight)};
  });
  console.log("    rows " + r.rows + ", logged set now " + r.w);
  ck("three switches leave one change-log row", r.rows === 1, String(r.rows));
  ck("and the set is back where it started, not rewritten three times", r.w === "60",
     r.w + " (expected 60 — one net move to bar + plates)");
}

console.log("5 - A COUNTING CHANGE LEAVES A MARKER THE TREND READERS CAN SEE");
{
  const r = await ev(()=>{
    S.marks = []; S.planLog = [];
    const DAY = 86400e3, now = Date.now();
    S.sessions = [{id:"mk", workoutId: DAYS[0], date: dayStr(now - DAY), startedAt: now - DAY,
      finishedAt: now - DAY + 3600e3, feel: 4,
      entries: [{name:"Smith Machine Squat", reps:"6-10", rpe:"7-9", barAdd: 25,
        sets: [{weight:"35", reps:"8", rpe:"8", done:true}]}]}];
    S.program[DAYS[0]] = [{name:"Smith Machine Squat", sets:3, reps:"6-10", weight:35,
                           rpe:"7-9", rest:[180,240]}];
    save();
    const pl = barModeConvertPlan("total");
    barModeConvertApply(pl, "total", "plates");
    const W = 6 * 7 * DAY;
    return {marks: (countMarks() || []).map(m=> ({kind: m.kind, at: !!m.at})),
            crossesRecent: windowCrossesMark(Date.now() - W, Date.now() + 1),
            crossesOld: windowCrossesMark(Date.now() - 20*7*DAY, Date.now() - 10*7*DAY)};
  });
  console.log("    " + JSON.stringify(r.marks));
  ck("the switch is recorded as a discontinuity", r.marks.length === 1 && r.marks[0].kind === "units",
     JSON.stringify(r.marks));
  ck("a window containing it says so", r.crossesRecent === true, String(r.crossesRecent));
  ck("and one that does not, does not", r.crossesOld === false, String(r.crossesOld));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
