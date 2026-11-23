import { chromium, APP_URL } from './_e26.mjs';
/* MARKING A SESSION AFTER THE APP HAS ALREADY ACTED ON IT.

   P2-11 gave the session editor a "Not a normal day" mark, and sessionNotEvidence() stops
   every automatic consequence for a session carrying it. But the gate is read when a
   consequence is DECIDED, and the case the audit actually names arrives later than that:
   Nov 9's session note records a toe injury, and by the time anybody opens the editor the
   app has already recorded a collapse flag from that session and may already have cut the
   load it earned.

   Two things have to be true for the mark to mean anything retroactively:

     SUPPRESSION. A flag raised by that session can no longer be acted on, however it is
     reached. Its notEvidence stamp is written when the flag is recorded, so a mark made
     afterwards has to go back and stamp the ones already standing.

     REVERSAL. A change the app already wrote from that session is put back. That needs
     the change row to name the session it came from, which the grade path already does
     through `trigger` and the Body-tab path did not.

   Neither is about hiding the session: it stays in the history, in the totals, and its
   note still says what happened. What stops is the app acting on it. */
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
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false});
  S.splitId="ppl6"; applySplit(); save();
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

/* The audited shape: the squat in two slots, and a Legs B session where it collapsed. */
const seed = ()=> p.evaluate(()=>{
  S.planLog = []; S.flags = []; S.dayFlags = {}; S.joint = {}; S.stalls = {};
  S.program.legsA = [{name:"Smith Machine Squat", sets:4, reps:"6-10", weight:80}];
  S.program.legsB = [{name:"Dumbbell RDL", sets:3, reps:"8-12", weight:50},
                     {name:"Smith Machine Hip Thrust", sets:3, reps:"8-12", weight:115},
                     {name:"Smith Machine Squat", sets:3, reps:"6-10", weight:80}];
  const at = Date.now() - 6 * 86400000;
  S.sessions = [{
    id: "nov9", date: dayStr(at), workoutId: "legsB",
    startedAt: at, finishedAt: at + 3600000,
    note: "Right toe hurt from the second set, kept it light after that.",
    entries: [
      {name:"Dumbbell RDL", reps:"8-12",
       sets:[{weight:"50", reps:"10", rpe:"8", done:true, rest:150}]},
      {name:"Smith Machine Hip Thrust", reps:"8-12",
       sets:[{weight:"115", reps:"10", rpe:"8", done:true, rest:150}]},
      /* The collapse: 9 reps then 3 at the same load. */
      {name:"Smith Machine Squat", reps:"6-10",
       sets:[{weight:"80", reps:"9", rpe:"8", done:true, rest:180},
             {weight:"80", reps:"3", rpe:"10", done:true, rest:180}]}
    ]
  }];
  save();
  const sess = S.sessions[0];
  recordFlags(sess, (sess.progression = buildProgression(sess)).concat(fadeFindings(sess)));
  save();
  const f = (flagLog() || []).filter(x=> x.kind === "fade" && /Squat/.test(x.ex))[0];
  return {flag: f ? {id: f.id, ex: f.ex, wid: f.workoutId, to: f.to,
                     notEvidence: f.notEvidence || null, sessionId: f.sessionId} : null,
          legsA: (findProgramEntryWhere("Smith Machine Squat","legsA")||{e:{}}).e.weight,
          legsB: (findProgramEntryWhere("Smith Machine Squat","legsB")||{e:{}}).e.weight,
          note: sess.note};
});

console.log("1 - THE COLLAPSE IS RECORDED, AND THE SESSION SAYS WHY IT HAPPENED");
const s1 = await seed();
console.log("   ", JSON.stringify(s1));
ck("a collapse flag was raised for the Legs B squat", !!s1.flag, JSON.stringify(s1.flag));
ck("it names the slot it came from", s1.flag && s1.flag.wid === "legsB",
   s1.flag && s1.flag.wid);
ck("and the session it came from", s1.flag && s1.flag.sessionId === "nov9",
   s1.flag && String(s1.flag.sessionId));
ck("nothing is suppressed yet", s1.flag && !s1.flag.notEvidence,
   String(s1.flag && s1.flag.notEvidence));
ck("the note records the injury", /toe/i.test(s1.note || ""), s1.note);

console.log("\n2 - FLAGGED BEFORE THE APP ACTS: THE CHANGE NEVER HAPPENS");
const before = await p.evaluate(()=>{
  const sess = S.sessions.find(s=> s.id === "nov9");
  /* Exactly what the editor's button does. */
  openSessionEditor("nov9");
  const btn = document.querySelector("#modal [data-sessnotrep]");
  if(btn) btn.click();
  hideModal();
  const f = (flagLog() || []).filter(x=> x.kind === "fade" && /Squat/.test(x.ex))[0];
  const ok = f ? applyFlag(f.id, "load") : null;
  return {marked: !!sess.notRepresentative, why: sessionNotEvidence(sess),
          applied: ok, stamped: f && !!f.notEvidence,
          legsA: (findProgramEntryWhere("Smith Machine Squat","legsA")||{e:{}}).e.weight,
          legsB: (findProgramEntryWhere("Smith Machine Squat","legsB")||{e:{}}).e.weight};
});
console.log("   ", JSON.stringify(before));
ck("the session is marked", before.marked, String(before.marked));
ck("and named as not being evidence", /not representative/i.test(before.why || ""), before.why);
ck("the standing flag is suppressed", before.stamped, String(before.stamped));
ck("so applying it is refused", before.applied === false, String(before.applied));
ck("the Legs B squat holds at 80", before.legsB === 80, String(before.legsB));
ck("and so does the Legs A squat", before.legsA === 80, String(before.legsA));

console.log("\n3 - FLAGGED AFTER THE APP HAS ACTED: THE CHANGE IS PUT BACK");
await seed();
const after = await p.evaluate(()=>{
  const f = (flagLog() || []).filter(x=> x.kind === "fade" && /Squat/.test(x.ex))[0];
  const applied = f ? applyFlag(f.id, "load") : null;
  const mid = {legsA: (findProgramEntryWhere("Smith Machine Squat","legsA")||{e:{}}).e.weight,
               legsB: (findProgramEntryWhere("Smith Machine Squat","legsB")||{e:{}}).e.weight};
  /* The row the app wrote has to name the session, or nothing can find it later. */
  const row = (S.planLog || []).filter(c=> c.kind === "weight" && /Squat/.test(c.name)).pop();
  const named = !!(row && row.trigger && row.trigger.sessionId === "nov9");
  /* NOW the user opens the session and marks it. */
  openSessionEditor("nov9");
  const btn = document.querySelector("#modal [data-sessnotrep]");
  if(btn) btn.click();
  hideModal();
  return {applied, mid, named,
          rowTrigger: row && row.trigger ? row.trigger.sessionId : null,
          reverted: !!(row && row.reverted),
          legsA: (findProgramEntryWhere("Smith Machine Squat","legsA")||{e:{}}).e.weight,
          legsB: (findProgramEntryWhere("Smith Machine Squat","legsB")||{e:{}}).e.weight};
});
console.log("   ", JSON.stringify(after));
ck("the cut went through while the session still looked ordinary",
   after.applied === true && after.mid.legsB === 70,
   after.applied + " " + JSON.stringify(after.mid));
ck("and it only touched the slot it came from", after.mid.legsA === 80,
   String(after.mid.legsA));
ck("the change row names the session that earned it", after.named,
   String(after.rowTrigger));
ck("marking the session puts the load back", after.legsB === 80, String(after.legsB));
ck("the row says it was put back", after.reverted, String(after.reverted));
ck("and the other slot is still untouched", after.legsA === 80, String(after.legsA));

console.log("\n4 - THE SESSION IS STILL THERE, AND SO IS ITS NOTE");
const kept = await p.evaluate(()=>{
  TAB = "history"; render();
  const t = document.body.innerText;
  const sess = S.sessions.find(s=> s.id === "nov9");
  /* The exercise names live in a collapsed detail block, so innerText does not carry
     them; the row itself is what "still in the history" means. The markup is checked for
     the names so the collapsed content is confirmed present rather than assumed. */
  const html = document.getElementById("app").innerHTML;
  /* "1 session", not "1 sessions". The header this replaced printed the count and the
     word "sessions" unconditionally, so with one session in the log it read "1
     sessions" — and this assertion was written against that. The dark glass header
     says session or sessions as it should, which is a fix rather than a regression;
     the claim being made here is that the session is listed, not how it is pluralised,
     so it accepts either. */
  return {listed: /\b1 sessions?\b/.test(t) && /Legs B/i.test(t),
          detail: /Smith Machine Squat/.test(html),
          badge: /not learned from/i.test(t),
          sets: (sess.entries || []).reduce((n,e)=> n + e.sets.length, 0),
          note: sess.note, feelKept: sess.entries.length};
});
console.log("   ", JSON.stringify(kept));
ck("the session is still in the history", kept.listed, String(kept.listed));
ck("with its exercises still on the row", kept.detail, String(kept.detail));
ck("marked as not learned from", kept.badge, String(kept.badge));
ck("with every set still in it", kept.sets === 4, String(kept.sets));
ck("and its note untouched", /toe/i.test(kept.note || ""), kept.note);

console.log("\n5 - AND TAKING THE MARK OFF DOES NOT SILENTLY REDO THE CUT");
/* Un-marking says "this was ordinary training after all". That makes the session
   evidence again and the finding can be acted on again - by you, deliberately. It must
   not re-apply a change behind your back. */
const un = await p.evaluate(()=>{
  openSessionEditor("nov9");
  const btn = document.querySelector("#modal [data-sessnotrep]");
  if(btn) btn.click();
  hideModal();
  const sess = S.sessions.find(s=> s.id === "nov9");
  const f = (flagLog() || []).filter(x=> x.kind === "fade" && /Squat/.test(x.ex))[0];
  return {marked: !!sess.notRepresentative, why: sessionNotEvidence(sess),
          stamped: f && !!f.notEvidence,
          legsB: (findProgramEntryWhere("Smith Machine Squat","legsB")||{e:{}}).e.weight};
});
console.log("   ", JSON.stringify(un));
ck("the mark comes off", un.marked === false, String(un.marked));
ck("the session counts again", un.why === null, String(un.why));
ck("the suppression lifts with it", !un.stamped, String(un.stamped));
ck("but the load is left where it is", un.legsB === 80, String(un.legsB));

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
