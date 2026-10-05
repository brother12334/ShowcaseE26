/* A plan that names its own rest days is run on those days, and anybody can move them
   by hand afterwards. */
import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
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
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open','spec-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; save();
  /* A plan written the way a coach writes one: three sessions on named weekdays, and the
     rest of the week off. */
  window.DOC = {
    planName:"Week plan", restDaysPerCycle:null, restWeekdays:["wed","sat","sun"],
    days:[
      {name:"Upper A", weekday:"mon", exercises:[{name:"Barbell Bench Press", sets:3, reps:"6-10"}]},
      {name:"Lower A", weekday:"tue", exercises:[{name:"Barbell Back Squat", sets:3, reps:"6-10"}]},
      {name:"Upper B", weekday:"thu", exercises:[{name:"Barbell Row", sets:3, reps:"6-10"}]},
      {name:"Lower B", weekday:"fri", exercises:[{name:"Romanian Deadlift", sets:3, reps:"6-10"}]}
    ]};
});
const ev = (fn, arg) => p.evaluate(fn, arg);

console.log("1 - A PLAN THAT NAMES ITS DAYS IS LAID OUT ON THOSE DAYS");
{
  const r = await ev(()=>{
    const split = buildCustomSplit(4, 3, ["Upper A","Lower A","Upper B","Lower B"]);
    const spread = split.layout.slice();            // what the arithmetic would have done
    const wk = weekLayoutFrom(DOC, split);
    return {spread, week: wk && wk.layout, start: wk && wk.startDow,
            ids: split.days.map(d=> d.id)};
  });
  ck("the plan's week is seven slots", r.week && r.week.length === 7, JSON.stringify(r.week));
  ck("it opens on the first training day", r.start === 1, String(r.start));   // Monday
  ck("and it reads Mon, Tue, rest, Thu, Fri, rest, rest",
     r.week.join(",") === "day1,day2,rest,day3,day4,rest,rest", (r.week||[]).join(","));
  ck("which is not what the even spread would have given",
     r.spread.join(",") !== (r.week||[]).join(","), r.spread.join(","));
}

console.log("2 - AND THE APP RUNS IT ON THE CALENDAR, NOT ON A POINTER");
{
  const r = await ev(()=>{
    const split = buildCustomSplit(4, 3, ["Upper A","Lower A","Upper B","Lower B"]);
    const wk = weekLayoutFrom(DOC, split);
    split.layout = wk.layout; split.startDow = wk.startDow; split.layoutFromPlan = true;
    S.customSplit = split; S.splitId = null; delete S.splitLayout;
    applySplit();
    S.program = {day1:[{name:"Barbell Bench Press", sets:3, reps:"6-10"}],
                 day2:[{name:"Barbell Back Squat", sets:3, reps:"6-10"}],
                 day3:[{name:"Barbell Row", sets:3, reps:"6-10"}],
                 day4:[{name:"Romanian Deadlift", sets:3, reps:"6-10"}]};
    S.pointer = 0; S.cycleDone = []; S.sessions = []; S.override = null; S.restDays = [];
    save();
    /* read the week as each weekday in turn, by moving the clock rather than the state */
    const real = Date;
    const at = dow=>{
      const d = new Date(); d.setHours(12,0,0,0);
      d.setDate(d.getDate() + ((dow - d.getDay() + 7) % 7));
      const fixed = d.getTime();
      // eslint-disable-next-line no-global-assign
      Date = class extends real { constructor(...a){ super(...(a.length?a:[fixed])); } static now(){ return fixed; } };
      const out = {day: todaysWorkoutId(), rest: isRestToday(), slot: weekPinnedSlotToday()};
      Date = real;
      return out;
    };
    return {mon: at(1), tue: at(2), wed: at(3), thu: at(4), fri: at(5), sat: at(6), sun: at(0),
            pinned: weekPinnedDow(), credits: REST_CREDITS};
  });
  ck("Monday is Upper A", r.mon.day === "day1" && !r.mon.rest, JSON.stringify(r.mon));
  ck("Tuesday is Lower A", r.tue.day === "day2" && !r.tue.rest, JSON.stringify(r.tue));
  ck("Wednesday is the rest day the plan names", r.wed.rest, JSON.stringify(r.wed));
  ck("Thursday is Upper B", r.thu.day === "day3" && !r.thu.rest, JSON.stringify(r.thu));
  ck("Friday is Lower B", r.fri.day === "day4" && !r.fri.rest, JSON.stringify(r.fri));
  ck("the weekend is rest", r.sat.rest && r.sun.rest,
     JSON.stringify([r.sat.rest, r.sun.rest]));
  ck("the week is pinned to Monday", r.pinned === 1, String(r.pinned));
  ck("and the cycle carries the three rest days the plan names", r.credits === 3, String(r.credits));
}

console.log("3 - MISSING A SESSION DOES NOT SLIDE THE WEEK ALONG");
{
  const r = await ev(()=>{
    /* Monday was missed. On Thursday the plan still says Upper B, not Upper A. */
    const real = Date;
    const d = new Date(); d.setHours(12,0,0,0);
    d.setDate(d.getDate() + ((4 - d.getDay() + 7) % 7));
    const fixed = d.getTime();
    Date = class extends real { constructor(...a){ super(...(a.length?a:[fixed])); } static now(){ return fixed; } };
    const out = {day: todaysWorkoutId(), pointerDay: ROTATION[S.pointer]};
    Date = real;
    return out;
  });
  ck("Thursday still offers Thursday's session", r.day === "day3",
     r.day + " (pointer is on " + r.pointerDay + ")");
}

console.log("4 - A PLAN THAT NAMES NOTHING IS LEFT ALONE");
{
  const r = await ev(()=>{
    const split = buildCustomSplit(3, 1, ["A","B","C"]);
    const silent = {days:[{name:"A", exercises:[]},{name:"B", exercises:[]},{name:"C", exercises:[]}]};
    const partial = {days:[{name:"A", weekday:"mon", exercises:[]},{name:"B", exercises:[]},
                           {name:"C", weekday:"fri", exercises:[]}]};
    const clash = {days:[{name:"A", weekday:"mon", exercises:[]},{name:"B", weekday:"mon", exercises:[]},
                         {name:"C", weekday:"fri", exercises:[]}]};
    return {silent: weekLayoutFrom(silent, split), partial: weekLayoutFrom(partial, split),
            clash: weekLayoutFrom(clash, split)};
  });
  ck("no weekdays, no week", r.silent === null, JSON.stringify(r.silent));
  ck("half a week is not a week", r.partial === null, JSON.stringify(r.partial));
  ck("and two sessions on one day is not either", r.clash === null, JSON.stringify(r.clash));
}

console.log("5 - THE REST DAYS CAN BE MOVED BY HAND");
{
  const r = await ev(()=>{
    S.customSplit = null; S.splitId = DEFAULT_SPLIT; delete S.splitLayout;
    applySplit();
    const before = layoutNow().layout.slice();
    const list = before.slice();
    const i = list.indexOf("rest");
    list.splice(i, 1);                       // take one rest out
    list.push("rest");                       // and put it at the end
    const ok = setSplitLayout(list);
    return {before, after: layoutNow().layout.slice(), ok, edited: layoutNow().edited,
            credits: REST_CREDITS};
  });
  ck("an edited layout is accepted", r.ok && r.after.join(",") !== r.before.join(","),
     r.before.join(",") + " -> " + r.after.join(","));
  ck("and it is marked as yours", r.edited, String(r.edited));
  ck("the rest count follows the layout",
     r.credits === r.after.filter(x=> x === "rest").length, String(r.credits));
}

console.log("6 - A LAYOUT THAT WOULD LOSE A TRAINING DAY IS REFUSED");
{
  const r = await ev(()=>{
    const good = layoutNow().layout.slice();
    const dropped = good.filter((k,i)=> !(k !== "rest" && i === good.findIndex(x=> x !== "rest")));
    const took = setSplitLayout(dropped);
    return {took, still: layoutNow().layout.slice(), good};
  });
  ck("dropping a day is refused", !r.took, String(r.took));
  ck("and the layout is untouched", r.still.join(",") === r.good.join(","), r.still.join(","));
}

console.log("7 - THE EDITOR IS ON THE PROGRAM TAB AND ITS BUTTONS WORK");
{
  await p.evaluate(()=>{ delete S.splitLayout; applySplit(); save(); TAB="program"; DAY_EDIT=null; render(); });
  const seen = await p.evaluate(()=>({
    card: !!document.querySelector(".rl-list"),
    rows: document.querySelectorAll(".rl-row").length,
    adds: document.querySelectorAll("[data-rladd]").length,
    dels: document.querySelectorAll("[data-rldel]").length,
    reset: !!document.getElementById("rlReset")
  }));
  ck("the card is there, one row per slot", seen.card && seen.rows === (await ev(()=> CYCLE_LAYOUT.length)),
     JSON.stringify(seen));
  ck("every training day offers a rest after it", seen.adds > 0, String(seen.adds));
  ck("every rest can be removed", seen.dels > 0, String(seen.dels));
  ck("and there is nothing to put back yet", !seen.reset, String(seen.reset));
  const added = await p.evaluate(()=>{
    const before = CYCLE_LAYOUT.length;
    document.querySelector("[data-rladd]").click();
    return {before, after: CYCLE_LAYOUT.length, edited: layoutNow().edited,
            logged: (S.planLog||[]).slice(-1).map(c=> c.kind)[0]};
  });
  ck("adding a rest makes the cycle a day longer", added.after === added.before + 1,
     added.before + " -> " + added.after);
  ck("it is recorded in the plan history", added.logged === "schedule", String(added.logged));
  const back = await p.evaluate(()=>{
    const r2 = document.getElementById("rlReset");
    if(r2) r2.click();
    return {len: CYCLE_LAYOUT.length, edited: layoutNow().edited};
  });
  ck("and putting it back restores the original", !back.edited && back.len === added.before,
     JSON.stringify(back));
}

console.log("8 - TESTING WEEKS CAN BE ADDED, MOVED AND TAKEN OUT");
{
  const r = await ev(()=>{
    delete S.testWeeks;
    S.importMeta = {name:"Plan", weeks:12, testingWeeks:[{week:"4", instruction:"heavy single"}]};
    S.planStart = Date.now() - 3*7*864e5;        // week 4 of the plan
    save();
    const fromPlan = testWeeksNow().map(x=> x.week + ":" + x.instruction);
    const mineBefore = testWeeksEdited();
    const added = saveTestWeek(null, "8", "AMRAP re-test");
    const afterAdd = testWeeksNow().map(x=> x.week);
    const moved = saveTestWeek(0, "5", "heavy single");
    const afterMove = testWeeksNow().map(x=> x.week + ":" + x.instruction);
    const removed = removeTestWeek(1);
    const afterDel = testWeeksNow().map(x=> x.week);
    const junk = saveTestWeek(null, "whenever", "no number in it");
    return {fromPlan, mineBefore, added, afterAdd, moved, afterMove, removed, afterDel,
            junk, mine: testWeeksEdited()};
  });
  ck("it starts as the document's own list", r.fromPlan.join("|") === "4:heavy single" && !r.mineBefore,
     r.fromPlan.join("|"));
  ck("a week can be added, in order", r.added && r.afterAdd.join(",") === "4,8",
     r.afterAdd.join(","));
  ck("a week can be moved", r.moved && r.afterMove[0] === "5:heavy single", r.afterMove.join("|"));
  ck("a week can be taken out", r.removed && r.afterDel.join(",") === "5", r.afterDel.join(","));
  ck("a label with no number in it is refused", !r.junk, String(r.junk));
  ck("and the list is now yours", r.mine, String(r.mine));
}

console.log("9 - AND THE WEEK YOU ARE IN SAYS SO");
{
  const r = await ev(()=>{
    S.testWeeks = [{week:"4", instruction:"work up to a heavy single"}];
    S.planStart = Date.now() - 3*7*864e5;
    save();
    const n = planWeekNotes();
    const strip = planWeekStripHTML();
    /* and with no imported plan at all */
    const meta = S.importMeta; S.importMeta = null;
    const nAlone = planWeekNotes();
    S.importMeta = meta;
    return {week: n && n.week.week, testing: n && n.testing && n.testing.instruction,
            strip: /heavy single/.test(strip), alone: !!(nAlone && nAlone.testing)};
  });
  ck("the app knows it is a testing week", r.week === 4 && /heavy single/.test(r.testing || ""),
     JSON.stringify(r));
  ck("and says so on Today", r.strip, String(r.strip));
  ck("even with no imported plan behind it", r.alone, String(r.alone));
}

console.log("10 - THE EDITOR IS ON THE PROGRAM TAB");
{
  await p.evaluate(()=>{ TAB="program"; DAY_EDIT=null; render(); });
  const seen = await p.evaluate(()=>({
    rows: document.querySelectorAll("[data-twedit]").length,
    add: !!document.getElementById("twAdd"),
    reset: !!document.getElementById("twReset"),
    now: !!document.querySelector(".tw-now")
  }));
  ck("the testing weeks are listed with an edit on each", seen.rows === 1, String(seen.rows));
  ck("one can be added", seen.add, String(seen.add));
  ck("the week you are in is marked", seen.now, String(seen.now));
  ck("and the plan's own list can be restored", seen.reset, String(seen.reset));
  const dlg = await p.evaluate(()=>{
    document.getElementById("twAdd").click();
    const m = document.getElementById("modal");
    if(!m) return null;
    m.querySelector("#twWeek").value = "10";
    m.querySelector("#twWhat").value = "retest the index lifts";
    m.querySelector("#twSave").click();
    return testWeeksNow().map(x=> x.week).join(",");
  });
  ck("and adding one through the dialog works", dlg === "4,10", String(dlg));
}

console.log(errs.length?("PAGE ERRORS: "+errs.join(" | ")):"no page errors");
if(errs.length) bad++;
console.log(bad?("BROKEN: "+bad):"all good");
await b.close();
