import { chromium, APP_URL, appFile } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* SLOT DEBT 3 of 9 - fadeFixFor.

   This is the one the audited P0-1 cases run through: "reps collapsed across the sets, so
   the opening load comes down". recordFlags() already stamps the session's slot onto the
   flag and applyFlag() passes it to applyProgression, so the cut LANDS on the right day -
   that much the replay suite already proves. What it did not prove is where the cut's
   TARGET comes from, because in the replay both squat slots happened to sit at 80 and the
   two answers coincided.

   fadeFixFor(d) looked the movement up by name, took that first slot's load, and
   subtracted a step from it. So a Legs B collapse was answered with a cut computed off
   Legs A's prescription: the right day, the wrong number. With the slots at different
   loads - which is the normal case, and the reason the audit noticed any of this - the
   cut either overshoots or does nothing.

   Two kinds of evidence, per the rules in docs/open-work.md: a synthetic two-slot fixture
   for the mechanism, and the audited Nov 5 and Nov 13 outcomes on the real export. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/replay-2026-11-15.json'), 'utf8'));
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1200}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.parse("2026-07-01")};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, plateStep:5, stackStep:2.5});
  S.splitId="ppl6"; applySplit(); save();
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

console.log("1 - THE CUT IS COMPUTED FROM THE SLOT THAT COLLAPSED");
/* Legs A squat at 100, Legs B at 60, and the collapse is on Legs B. A cut taken off
   Legs A's prescription would land near 90; off Legs B's, near 50. */
const two = await p.evaluate(()=>{
  S.program.legsA = [{name:"Smith Machine Squat", sets:3, reps:"6-10", weight:100}];
  S.program.legsB = [{name:"Smith Machine Squat", sets:3, reps:"6-10", weight:60}];
  S.sessions = []; S.flags = []; S.planLog = []; S.active = null;
  const at = Date.now() - 3 * 86400000;
  const sess = {id:"b1", date: dayStr(at), workoutId:"legsB", startedAt: at,
    finishedAt: at + 3600000,
    entries:[{name:"Smith Machine Squat", reps:"6-10", rpes:[8,8,8],
      sets:[{weight:"60", reps:"9", rpe:"8", done:true, rest:180},
            {weight:"60", reps:"7", rpe:"9", done:true, rest:180},
            {weight:"60", reps:"3", rpe:"10", done:true, rest:180}]}]};
  S.sessions = [sess]; save();
  const drops = repDropOffs(sess).bad;
  const d = drops[0];
  return {drop: d ? {name: d.name, first: d.first, last: d.last} : null,
          scoped: d ? fadeFixFor(d, "legsB") : null,
          unscoped: d ? fadeFixFor(d) : null,
          loads: {legsA: 100, legsB: 60}};
});
console.log("   ", JSON.stringify(two));
/* The control: the collapse has to be seen at all, or everything below is about null. */
ck("the collapse is detected", !!two.drop, JSON.stringify(two.drop));
ck("the cut is taken off the collapsing slot's 60, not the other slot's 100",
   two.scoped && two.scoped.to > 0 && two.scoped.to < 60,
   two.scoped && String(two.scoped.to));
ck("and it is nowhere near a cut from 100",
   two.scoped && two.scoped.to < 80, two.scoped && String(two.scoped.to));

console.log("\n2 - AND THE FINDING, THE FLAG AND THE WRITE ALL AGREE");
const flow = await p.evaluate(()=>
  ((sess)=>{
    const f = fadeFindings(sess);
    recordFlags(sess, f);
    const flag = (flagLog() || []).filter(x=> x.kind === "fade")[0];
    const loadOf = wid=>{
      const g = findProgramEntryWhere("Smith Machine Squat", wid);
      return g && g.wid === wid ? g.e.weight : null;
    };
    const was = {legsA: loadOf("legsA"), legsB: loadOf("legsB")};
    const ok = flag ? applyFlag(flag.id, "load") : null;
    return {finding: f.map(x=> ({name: x.name, to: x.to})),
            flagWid: flag && flag.workoutId, flagTo: flag && flag.to, ok,
            was, now: {legsA: loadOf("legsA"), legsB: loadOf("legsB")}};
  })(S.sessions[0]));
console.log("   ", JSON.stringify(flow));
ck("the flag names the collapsing slot", flow.flagWid === "legsB", String(flow.flagWid));
ck("its target is the one computed from that slot", flow.flagTo < 60, String(flow.flagTo));
ck("the cut is applied", flow.ok === true, String(flow.ok));
ck("to that slot", flow.now.legsB < flow.was.legsB,
   flow.was.legsB + " → " + flow.now.legsB);
ck("and the other slot is untouched", flow.now.legsA === 100, String(flow.now.legsA));

console.log("\n3 - ACCEPTANCE: NOV 5, THE PUSH B V-BAR COLLAPSE  (P0-1)");
/* The real session. The straight bar lives on Push A and the V-bar on Push B, and the
   audited bug cut the straight bar because of the V-bar's collapse. The two slots are
   given different loads here deliberately: that is what tells the right answer from the
   wrong one, and it is the normal case. */
const nov5 = await p.evaluate(fx=>{
  const s = fx.sessions.filter(x=> x.date === "2026-11-05")[0];
  S.program.pushA = [{name:"Overhead Cable Triceps Extension", sets:3, reps:"8-12", weight:90},
                     {name:"Overhead Cable Triceps Extension (V-bar)", sets:3, reps:"8-12", weight:75}];
  S.program.pushB = [{name:"Overhead Cable Triceps Extension (V-bar)", sets:3, reps:"8-12", weight:90}];
  S.sessions = []; S.flags = []; S.planLog = [];
  const at = Date.parse(s.date + "T18:00:00");
  S.sessions = [{id:"n5", date: s.date, workoutId:"pushB", startedAt: at, finishedAt: at+3600000,
    entries: s.ex.filter(e=> /V-bar/.test(e.name)).map(e=> ({
      name: e.name, reps:"8-12", rpes:[8,8,8],
      sets: e.sets.map(x=> ({weight:String(x.w), reps:String(x.reps),
                             rpe: x.rpe == null ? "" : String(x.rpe), done:true,
                             rest: x.rest == null ? undefined : x.rest}))}))}];
  save();
  const sess = S.sessions[0];
  const logged = sess.entries[0].sets.map(x=> x.weight + "x" + x.reps).join(" ");
  const loadOf = (nm, wid)=>{
    const g = findProgramEntryWhere(nm, wid);
    return g && g.wid === wid ? g.e.weight : null;
  };
  const was = {straightA: loadOf("Overhead Cable Triceps Extension","pushA"),
               vbarA: loadOf("Overhead Cable Triceps Extension (V-bar)","pushA"),
               vbarB: loadOf("Overhead Cable Triceps Extension (V-bar)","pushB")};
  const finds = fadeFindings(sess);
  recordFlags(sess, finds);
  const flags = (flagLog()||[]).filter(x=> x.kind === "fade");
  flags.forEach(f=>{ f.applied = false; if(f.did) delete f.did; applyFlag(f.id, "load"); });
  return {logged, was, finds: finds.map(x=> ({name: x.name, to: x.to})),
          flagWids: flags.map(f=> f.workoutId),
          now: {straightA: loadOf("Overhead Cable Triceps Extension","pushA"),
                vbarA: loadOf("Overhead Cable Triceps Extension (V-bar)","pushA"),
                vbarB: loadOf("Overhead Cable Triceps Extension (V-bar)","pushB")}};
}, FX);
console.log("    V-bar logged " + nov5.logged);
console.log("    before: " + JSON.stringify(nov5.was));
console.log("    after : " + JSON.stringify(nov5.now));
console.log("    findings: " + JSON.stringify(nov5.finds) + " flags on " + JSON.stringify(nov5.flagWids));
ck("the collapse is detected on the real session", nov5.finds.length > 0,
   JSON.stringify(nov5.finds));
ck("the cut is computed from Push B's 90, not Push A's V-bar 75",
   nov5.finds[0] && nov5.finds[0].to > 75, nov5.finds[0] && String(nov5.finds[0].to));
ck("Push B's V-bar comes down", nov5.now.vbarB < nov5.was.vbarB,
   nov5.was.vbarB + " → " + nov5.now.vbarB);
ck("the Push A straight bar is untouched", nov5.now.straightA === 90,
   nov5.was.straightA + " → " + nov5.now.straightA);
ck("and so is the Push A V-bar, a different slot of the same name",
   nov5.now.vbarA === 75, nov5.was.vbarA + " → " + nov5.now.vbarA);

console.log("\n4 - ACCEPTANCE: NOV 13'S CUT CAME FROM NOV 9'S LEGS B SESSION  (P0-1)");
/* The audited row: Nov 13 12:24, Legs A, Smith Machine Squat 80 -> 70, "reps collapsed
   across the sets" - triggered by the Legs B session of Nov 9, where squat is the third
   exercise. Legs A is given 80 and Legs B 70, so a cut off the wrong slot is visible. */
const nov13 = await p.evaluate(fx=>{
  const s = fx.sessions.filter(x=> x.date === "2026-11-09")[0];
  S.program.legsA = [{name:"Smith Machine Squat", sets:4, reps:"6-10", weight:80}];
  S.program.legsB = [{name:"Dumbbell RDL", sets:3, reps:"8-12", weight:50},
                     {name:"Smith Machine Hip Thrust", sets:3, reps:"8-12", weight:115},
                     {name:"Smith Machine Squat", sets:3, reps:"6-10", weight:70}];
  S.sessions = []; S.flags = []; S.planLog = [];
  const at = Date.parse(s.date + "T18:00:00");
  S.sessions = [{id:"n9", date: s.date, workoutId:"legsB", startedAt: at, finishedAt: at+3600000,
    entries: s.ex.map(e=> ({name: e.name, reps:"6-10", rpes:[8,8,8],
      sets: e.sets.map(x=> ({weight:String(x.w), reps:String(x.reps),
                             rpe: x.rpe == null ? "" : String(x.rpe), done:true,
                             rest: x.rest == null ? undefined : x.rest}))}))}];
  save();
  const sess = S.sessions[0];
  const sq = sess.entries.filter(e=> /Smith Machine Squat/.test(e.name))[0];
  const loadOf = wid=>{
    const g = findProgramEntryWhere("Smith Machine Squat", wid);
    return g && g.wid === wid ? g.e.weight : null;
  };
  const was = {legsA: loadOf("legsA"), legsB: loadOf("legsB")};
  const finds = fadeFindings(sess).filter(x=> /Smith Machine Squat/.test(x.name));
  recordFlags(sess, fadeFindings(sess));
  const flags = (flagLog()||[]).filter(x=> x.kind === "fade" && /Smith Machine Squat/.test(x.ex));
  flags.forEach(f=>{ f.applied = false; if(f.did) delete f.did; applyFlag(f.id, "load"); });
  return {slot: sess.entries.findIndex(e=> /Smith Machine Squat/.test(e.name)) + 1,
          logged: sq ? sq.sets.map(x=> x.weight + "x" + x.reps).join(" ") : null,
          finds: finds.map(x=> ({name: x.name, to: x.to})),
          flagWids: flags.map(f=> f.workoutId),
          was, now: {legsA: loadOf("legsA"), legsB: loadOf("legsB")}};
}, FX);
console.log("    squat is exercise " + nov13.slot + ", logged " + nov13.logged);
console.log("    before: " + JSON.stringify(nov13.was) + "  after: " + JSON.stringify(nov13.now));
console.log("    findings: " + JSON.stringify(nov13.finds) + " flags on " + JSON.stringify(nov13.flagWids));
ck("the Legs B squat is the third exercise, as the audit says", nov13.slot === 3,
   String(nov13.slot));
ck("its collapse is detected", nov13.finds.length > 0, JSON.stringify(nov13.finds));
ck("the cut is computed from Legs B's 70, not Legs A's 80",
   nov13.finds[0] && nov13.finds[0].to < 70,
   nov13.finds[0] && String(nov13.finds[0].to));
ck("the flag names Legs B", nov13.flagWids.every(w=> w === "legsB"),
   JSON.stringify(nov13.flagWids));
ck("Legs B comes down", nov13.now.legsB < nov13.was.legsB,
   nov13.was.legsB + " → " + nov13.now.legsB);
ck("and the Legs A squat stays at 80 - the audited bug, not reproduced",
   nov13.now.legsA === 80, nov13.was.legsA + " → " + nov13.now.legsA);

console.log("\n4b - AND NOV 9 WAS AN INJURY SESSION: NO CUT AT ALL");
/* The same session, same collapse, with the toe injury recorded the way a user would
   record it. A collapse on a day something hurt says nothing about whether the load is
   right, so the cut does not happen - and the pair of outcomes is pinned together:
   unflagged the load goes to 65, flagged it does not move. */
const hurt13 = await p.evaluate(fx=>{
  const s = fx.sessions.filter(x=> x.date === "2026-11-09")[0];
  S.program.legsA = [{name:"Smith Machine Squat", sets:4, reps:"6-10", weight:80}];
  S.program.legsB = [{name:"Dumbbell RDL", sets:3, reps:"8-12", weight:50},
                     {name:"Smith Machine Hip Thrust", sets:3, reps:"8-12", weight:115},
                     {name:"Smith Machine Squat", sets:3, reps:"6-10", weight:70}];
  S.sessions = []; S.flags = []; S.planLog = []; S.dayFlags = {}; S.joint = {};
  const at = Date.parse(s.date + "T18:00:00");
  S.sessions = [{id:"n9b", date: s.date, workoutId:"legsB", startedAt: at, finishedAt: at+3600000,
    note: "Right toe hurt from the second set.",
    entries: s.ex.map(e=> ({name: e.name, reps:"6-10", rpes:[8,8,8],
      sets: e.sets.map(x=> ({weight:String(x.w), reps:String(x.reps),
                             rpe: x.rpe == null ? "" : String(x.rpe), done:true,
                             rest: x.rest == null ? undefined : x.rest}))}))}];
  save();
  const sess = S.sessions[0];
  const loadOf = wid=>{
    const g = findProgramEntryWhere("Smith Machine Squat", wid);
    return g && g.wid === wid ? g.e.weight : null;
  };
  /* Marked through the editor, before anything acts on it. */
  openSessionEditor("n9b");
  const btn = document.querySelector("#modal [data-sessnotrep]");
  if(btn) btn.click();
  hideModal();
  const was = {legsA: loadOf("legsA"), legsB: loadOf("legsB")};
  /* The collapse is still SEEN - it happened - and still recorded. What stops is acting. */
  const finds = fadeFindings(sess).filter(x=> /Smith Machine Squat/.test(x.name));
  recordFlags(sess, fadeFindings(sess));
  const flags = (flagLog()||[]).filter(x=> x.kind === "fade" && /Smith Machine Squat/.test(x.ex));
  const tries = flags.map(f=>{ f.applied = false; if(f.did) delete f.did;
                               return applyFlag(f.id, "load"); });
  return {marked: !!sess.notRepresentative, why: sessionNotEvidence(sess),
          seen: finds.length, stamped: flags.filter(f=> f.notEvidence).length,
          nFlags: flags.length, tries, was,
          now: {legsA: loadOf("legsA"), legsB: loadOf("legsB")}};
}, FX);
console.log("    marked: " + hurt13.marked + " (" + hurt13.why + ")");
console.log("    collapse still seen: " + hurt13.seen + ", flags " + hurt13.nFlags
  + " of which " + hurt13.stamped + " suppressed; applying returned "
  + JSON.stringify(hurt13.tries));
console.log("    before: " + JSON.stringify(hurt13.was) + "  after: " + JSON.stringify(hurt13.now));
ck("the session is marked as not evidence", hurt13.marked
   && /not representative/i.test(hurt13.why || ""), hurt13.why);
ck("the collapse is still seen, because it did happen", hurt13.seen > 0, String(hurt13.seen));
ck("but every flag from it is suppressed",
   hurt13.nFlags > 0 && hurt13.stamped === hurt13.nFlags,
   hurt13.stamped + "/" + hurt13.nFlags);
ck("applying the cut is refused", hurt13.tries.every(x=> x === false),
   JSON.stringify(hurt13.tries));
ck("so Legs B keeps its load", hurt13.now.legsB === 70, String(hurt13.now.legsB));
ck("and Legs A keeps its own", hurt13.now.legsA === 80, String(hurt13.now.legsA));
/* THE PAIR, PINNED TOGETHER. Either number alone could be produced by a rule that had
   simply stopped working; the two of them in one run say the rule is reading the flag. */
ck("unflagged goes to 65 and flagged does not move",
   nov13.now.legsB === 65 && hurt13.now.legsB === 70,
   nov13.now.legsB + " vs " + hurt13.now.legsB);

console.log("\n5 - A MOVEMENT IN ONE SLOT IS UNAFFECTED");
const solo = await p.evaluate(()=>{
  S.program.legsA = [{name:"Seated Leg Curl", sets:3, reps:"8-12", weight:120}];
  S.program.legsB = [];
  S.sessions = []; S.flags = []; S.planLog = [];
  const at = Date.now() - 86400000;
  const sess = {id:"s1", date: dayStr(at), workoutId:"legsA", startedAt: at, finishedAt: at+3600000,
    entries:[{name:"Seated Leg Curl", reps:"8-12", rpes:[8,8,8],
      sets:[{weight:"120", reps:"12", rpe:"8", done:true, rest:150},
            {weight:"120", reps:"9", rpe:"9", done:true, rest:150},
            {weight:"120", reps:"4", rpe:"10", done:true, rest:150}]}]};
  S.sessions = [sess]; save();
  const d = repDropOffs(sess).bad[0];
  return {drop: !!d, scoped: d ? fadeFixFor(d, "legsA").to : null,
          unscoped: d ? fadeFixFor(d).to : null};
});
console.log("   ", JSON.stringify(solo));
ck("the collapse is still detected", solo.drop, String(solo.drop));
ck("and the answer is the same with or without a slot",
   solo.scoped === solo.unscoped && solo.scoped > 0,
   solo.scoped + " / " + solo.unscoped);

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
