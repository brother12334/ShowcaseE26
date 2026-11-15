import { chromium, APP_URL } from './_e26.mjs';
/* P1-4 — THE REST WINDOW IS NOT LENGTHENED ON A COLLAPSE THAT WAS NOT FATIGUE.

   From the Nov 15 2026 audit. Sixteen "reps were collapsing, rest lengthened" changes,
   and eight of the fifteen increases landed on movements done in supersets or as
   alternating one-arm sets. In a superset the drop is the partner exercise; in an
   alternating set it is the weaker side. Neither is the rest being too short.

   Across 449 set pairs, rest length barely predicted the next set's reps for this user
   (r = 0.05) — and the reason is in the same export: the triceps window was lengthened
   to 3:30-4:30 while the median rest actually taken was 1:52. The rule kept answering a
   question the user was not asking, by adding time to a window they were already well
   inside. The squat window reached 3:30-5:30, past the app's own 4:00 ceiling.

   Section 1 holds the rule working, because a real collapse on a real rest IS worth
   acting on. Everything after it is a reason this rule must keep its hands off. */
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

/* A collapse on one movement: 12, 10, 5 at one load, against a 6-12 prescription, with
   a rest window of 2:30-3:30 and 3 minutes actually taken between sets. `o` bends one
   thing: the superset, the side labels, the reason on the short set, the deload, the
   rest actually taken, and how many earlier sessions also collapsed. */
const run = (o)=> ev(a=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, rpe:true});
  S.splitId=DEFAULT_SPLIT; applySplit();
  S.active=null; S.flags=[]; S.planLog=[]; S.marks=[]; S.deload=null; S.stalls={};
  const DAY = 86400e3, now = Date.now();
  const EX = "Cable Triceps Pushdown", PARTNER = "Cable Rope Overhead Extension";
  const wid = DAYS[0];
  const rest = a.rest == null ? 180 : a.rest;
  const mk = (t, collapses)=>{
    const reps = collapses ? ["12","10","5"] : ["12","11","10"];
    const en = {name: EX, reps: "6-12", rpe: "7-9",
      sets: reps.map((r, i)=> {
        const st = {weight: "50", reps: r, rpe: "8", done: true};
        if(i < reps.length - 1) st.rest = rest;
        if(i === reps.length - 1 && a.why) st.why = {code: a.why, note: "", at: t};
        return st;
      })};
    if(a.sides){ en.startSide = "L"; }
    const entries = [en];
    if(a.superset){
      en.superset = true;                              // positional: pairs with the next
      entries.push({name: PARTNER, reps: "8-12", rpe: "7-9", supersetEnd: true,
        sets: [0,1,2].map(()=> ({weight:"30", reps:"10", rpe:"8", done:true, rest: rest}))});
    }
    return {id: "s" + t, workoutId: wid, date: dayStr(t), startedAt: t,
            finishedAt: t + 3600e3, feel: 4, entries};
  };
  /* Earlier exposures of the same slot. `history` says how many of the three before
     this one also collapsed. */
  S.sessions = [];
  const hist = a.history == null ? 2 : a.history;
  for(let i = 3; i >= 1; i--) S.sessions.push(mk(now - i * 4 * DAY, i <= hist));
  const sess = mk(now - 1000, true);
  S.sessions.push(sess);
  S.program[wid] = [{name: EX, sets: 3, reps: "6-12", weight: 50, rpe: "7-9",
                     rest: a.window || [120, 150]}];
  if(a.superset) S.program[wid].push({name: PARTNER, sets: 3, reps: "8-12", weight: 30,
                                      rpe: "7-9", rest: [120, 150]});
  if(a.deload) S.deload = {startedAt: now - 3 * DAY, endedAt: now + 3 * DAY};
  save();
  const findings = fadeFindings(sess);
  const f = findings.find(x=> x && x.name === EX) || null;
  recordFlags(sess, findings);
  const flag = openFlags().find(x=> x && x.kind === "fade" && x.ex === EX);
  let applied = null, after = null;
  if(flag && a.apply){
    applied = applyFlag(flag.id, "rest");
    const e = (S.program[wid] || [])[0];
    after = e && e.rest ? e.rest.join("-") : null;
  }
  return {finding: f ? {offersRest: f.restAdd != null, sub: f.sub} : null,
          drops: repDropOffs(sess).bad.map(d=> d.name),
          applied, after,
          window: ((S.program[wid] || [])[0].rest || []).join("-")};
}, o);

console.log("1 - A REAL COLLAPSE ON A REAL REST STILL LENGTHENS THE WINDOW");
{
  const r = await run({apply: true});
  console.log("    " + JSON.stringify(r.finding && r.finding.offersRest) + "  window " + r.after);
  ck("the collapse is found", !!r.finding, JSON.stringify(r.drops));
  ck("it offers more rest", !!(r.finding && r.finding.offersRest), JSON.stringify(r.finding));
  ck("and the window grows", r.after === "150-180", String(r.after));
}

console.log("2 - NOT FOR A MOVEMENT INSIDE A SUPERSET");
{
  const r = await run({superset: true, apply: true});
  console.log("    " + JSON.stringify(r.finding) + "  window " + r.window);
  ck("no rest increase is offered inside a superset",
     !r.finding || !r.finding.offersRest, JSON.stringify(r.finding));
  ck("and the window is untouched", r.window === "120-150", String(r.window));
}

console.log("3 - NOT WHEN THE REST ACTUALLY TAKEN WAS UNDER THE WINDOW MINIMUM");
{
  /* The window asks 2:30-3:30 and 1:52 was taken, which is the audited triceps case
     exactly. The answer is "rest longer", not a longer window. */
  const r = await run({rest: 112, apply: true});
  console.log("    " + JSON.stringify(r.finding) + "  window " + r.window);
  ck("the collapse is still reported", !!r.finding, "none");
  ck("but the plan is not changed", !(r.finding && r.finding.offersRest),
     JSON.stringify(r.finding));
  ck("and it says to use the window first",
     !!(r.finding && /1:52/.test(r.finding.sub) && /already asks for/.test(r.finding.sub)),
     r.finding && r.finding.sub);
  ck("the window is untouched", r.window === "120-150", String(r.window));
}

console.log("4 - NOT ON A SET THAT WAS STOPPED ON PURPOSE OR CALLED TOO HEAVY");
{
  for(const why of ["deliberate", "heavy"]){
    const r = await run({why, apply: true});
    ck("a set marked “" + why + "” does not lengthen the window",
       !(r.finding && r.finding.offersRest) && r.window === "120-150",
       JSON.stringify(r.finding) + " / " + r.window);
  }
}

console.log("5 - NOT IN A DELOAD WEEK");
{
  const r = await run({deload: true, apply: true});
  console.log("    " + JSON.stringify(r.finding) + "  window " + r.window);
  ck("a deload session does not lengthen the window",
     !(r.finding && r.finding.offersRest) && r.window === "120-150",
     JSON.stringify(r.finding) + " / " + r.window);
}

console.log("6 - NOT ON ONE SESSION ALONE: TWO OF THE LAST THREE EXPOSURES");
{
  const r = await run({history: 0, apply: true});
  console.log("    " + JSON.stringify(r.finding) + "  window " + r.window);
  ck("a single collapse is not enough to change the plan",
     !(r.finding && r.finding.offersRest), JSON.stringify(r.finding));
  ck("the window is untouched", r.window === "120-150", String(r.window));
}

console.log("7 - AND NO WINDOW EVER GOES PAST ITS CEILING");
{
  const r = await ev(()=>{
    const ceil = {};
    ["Smith Machine Squat", "Cable Triceps Pushdown"].forEach(nm=>{
      ceil[nm] = {compound: isCompound(nm), ceiling: restCeilingFor({name: nm})};
    });
    /* The audited squat window, as the export has it, put through the migration. */
    S.program[DAYS[1]] = [{name:"Smith Machine Squat", sets:4, reps:"6-10", weight:80,
                           rpe:"7-9", rest:[210, 330]}];
    delete S.restCeilV1;
    save();
    migrateRestCeilings();
    const squat = (((S.program[DAYS[1]] || [])[0] || {}).rest || []).join("-");
    /* And a window already at the ceiling cannot be pushed over it. */
    S.program[DAYS[1]][0].rest = [210, 240];
    const grew = addRestToExercise("Smith Machine Squat", 60, DAYS[1]);
    return {ceil, squat,
            afterPush: ((S.program[DAYS[1]] || [])[0].rest || []).join("-"), grew};
  });
  console.log("    " + JSON.stringify(r.ceil) + " squat " + r.squat + " -> " + r.afterPush);
  ck("a compound's ceiling is 4:00", r.ceil["Smith Machine Squat"].ceiling === 240,
     String(r.ceil["Smith Machine Squat"].ceiling));
  ck("an isolation's is 3:00", r.ceil["Cable Triceps Pushdown"].ceiling === 180,
     String(r.ceil["Cable Triceps Pushdown"].ceiling));
  ck("the migration clamps the audited 3:30–5:30 squat window to 4:00",
     r.squat === "210-240", r.squat);
  ck("and nothing can push a window past it afterwards",
     r.afterPush === "210-240", r.afterPush);
}

console.log("8 - A DROP-OFF COMPARES A SIDE WITH ITSELF, NEVER L AGAINST R");
{
  const r = await ev(()=>{
    const DAY = 86400e3, now = Date.now();
    const EX = "Single-Arm Preacher Curl";
    /* The audited asymmetry: the left is reliably about 28% weaker. Logged one side per
       set, L, R, L, R, that reads as reps collapsing 13 -> 9 -> 13 -> 9 and back. Each
       side on its own is perfectly steady. */
    const en = {name: EX, reps: "8-14", rpe: "7-9", startSide: "L",
      sets: [["13"],["18"],["13"],["18"]].map(([rp])=> ({weight:"25", reps: rp, rpe:"8",
                                                         done:true, rest: 150}))};
    const sess = {id:"sd", workoutId: DAYS[0], date: dayStr(now - 1000),
      startedAt: now - 1000, finishedAt: now, feel: 4, entries: [en]};
    S.sessions = [sess];
    S.program[DAYS[0]] = [{name: EX, sets: 4, reps: "8-14", weight: 25, rpe: "7-9",
                           rest: [150, 210]}];
    save();
    return {bad: repDropOffs(sess).bad.map(d=> d.name),
            sides: [0,1,2,3].map(i=> setSide(en, i))};
  });
  console.log("    sides " + JSON.stringify(r.sides) + "  findings " + JSON.stringify(r.bad));
  ck("the sets are labelled L, R, L, R", r.sides.join("") === "LRLR", r.sides.join(""));
  ck("and a steady pair of sides is not a collapse", r.bad.length === 0, JSON.stringify(r.bad));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
