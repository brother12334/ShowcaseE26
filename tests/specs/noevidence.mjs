import { chromium, APP_URL } from './_e26.mjs';
/* A SESSION THAT WAS NOT NORMAL TRAINING IS A FACT, NOT EVIDENCE FOR CHANGING THE PLAN.

   recordFlags() already made this argument for one case and acted on it: a deload
   session raises no "ready for more weight" and no stall, because the week is fewer sets
   at a lower RPE by design and reading it literally has the app congratulating you for
   following its own instruction. What it still allowed from such a session was a rep
   collapse, on the grounds that a collapse is a fact about the session rather than a
   conclusion about the block.

   That is true, and it is not a licence to act. A collapse in a deload week, in the
   first session back after a fortnight off, on a day marked ill, or on a day something
   hurt, is exactly as real and exactly as useless for deciding that a rest window is
   too short or a load too heavy. So the finding stays and every automated consequence of
   it stops: no rest change, no load cut, no step towards a stall.

   Nothing here suppresses what the app TELLS you. It suppresses what it DOES. */
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

/* A collapsing session with a prior collapsing exposure, so every automated consequence
   is available and the only thing under test is whether the session counts as evidence.
   `o.mark` is what makes it abnormal. */
const run = (o)=> ev(a=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, rpe:true});
  S.splitId=DEFAULT_SPLIT; applySplit();
  S.active=null; S.flags=[]; S.planLog=[]; S.marks=[]; S.deload=null; S.stalls={};
  S.dayFlags={}; S.joint={}; S.skipLog=[]; S.checkins={};
  const DAY = 86400e3, now = Date.now(), wid = DAYS[0];
  const EX = "Cable Triceps Pushdown";
  const mk = (id, at)=> ({id, workoutId: wid, date: dayStr(at), startedAt: at,
    finishedAt: at + 3600e3, feel: 4,
    entries: [{name: EX, reps: "6-12", rpe: "7-9",
      sets: ["12","10","5"].map((r, i)=> ({weight:"50", reps:r, rpe:"8", done:true,
                                           rest: i < 2 ? 180 : undefined}))}]});
  const prior = mk("p0", now - 8 * DAY);
  const sess = mk("p1", now - 1000);
  S.sessions = [prior, sess];
  S.program[wid] = [{name: EX, sets: 3, reps: "6-12", weight: 50, rpe: "7-9",
                     rest: [120, 150]}];
  /* Three sessions already failing to improve, so the next one completes a stall run
     unless this session is refused as evidence. */
  S.stalls[nrm(EX)] = {n: 2, dates: [dayStr(now - 16*DAY), dayStr(now - 8*DAY)]};
  if(a.mark === "deload") S.deload = {startedAt: now - 3*DAY, endedAt: now + 3*DAY};
  if(a.mark === "break"){
    for(let i = 1; i <= 14; i++) S.skipLog.push(dayStr(now - 1000 - i*DAY));
  }
  if(a.mark === "ill") S.dayFlags[dayStr(now - 1000)] = {ill: true};
  if(a.mark === "hurt") S.joint[dayStr(now - 1000)] = {[nrm(EX)]: 2};
  if(a.mark === "notRep") sess.notRepresentative = true;
  save();
  const findings = fadeFindings(sess).concat(
    (sess.entries || []).map(en=> progressionFor(sess, en)).filter(Boolean));
  recordFlags(sess, findings);
  const open = openFlags();
  const fade = open.find(f=> f && f.kind === "fade");
  /* Every automated consequence, attempted. */
  let restMoved = false, loadMoved = false;
  if(fade){
    applyFlag(fade.id, "rest");
    restMoved = ((S.program[wid] || [])[0].rest || []).join("-") !== "120-150";
    const f2 = openFlags().find(x=> x && x.kind === "fade");
    if(f2 && f2.to != null){
      applyFlag(f2.id, "load");
      loadMoved = Number((S.program[wid] || [])[0].weight) !== 50;
    }
  }
  const before = (S.stalls[nrm(EX)] || {}).n;
  updateStalls(sess);
  const after = (S.stalls[nrm(EX)] || {}).n;
  return {reported: !!fade, why: sessionNotEvidence(sess),
          restMoved, loadMoved, stallBefore: before, stallAfter: after,
          stallFlag: open.some(f=> f && f.kind === "stall"),
          window: ((S.program[wid] || [])[0].rest || []).join("-"),
          load: Number((S.program[wid] || [])[0].weight)};
}, o);

console.log("1 - ORDINARY TRAINING: EVERY CONSEQUENCE IS AVAILABLE");
{
  const r = await run({});
  console.log("    " + JSON.stringify(r));
  ck("no reason to discount the session", !r.why, String(r.why));
  ck("the collapse is reported", r.reported === true, String(r.reported));
  ck("the rest window moves", r.restMoved === true, r.window);
  ck("the load comes down", r.loadMoved === true, String(r.load));
  ck("and the stall run advances", r.stallAfter > r.stallBefore,
     r.stallBefore + " -> " + r.stallAfter);
}

const CASES = [
  ["deload", "a deload week"],
  ["break",  "the first session back after a fortnight off"],
  ["ill",    "a day marked ill"],
  ["hurt",   "a day something hurt"],
  ["notRep", "a session marked not representative"]
];
for(const [mark, said] of CASES){
  console.log("\n2 - " + said.toUpperCase() + " CHANGES NOTHING ON ITS OWN");
  const r = await run({mark});
  console.log("    " + JSON.stringify(r));
  ck("the session is recognised as not evidence", !!r.why, String(r.why));
  ck("the collapse is STILL reported", r.reported === true, String(r.reported));
  ck("no rest change", r.restMoved === false, r.window);
  ck("no load cut", r.loadMoved === false, String(r.load));
  ck("no step towards a stall", r.stallAfter <= r.stallBefore,
     r.stallBefore + " -> " + r.stallAfter);
}

console.log(errs.length ? ("\nPAGE ERRORS: "+errs.join(" | ")) : "\nno page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
