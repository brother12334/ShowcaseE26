import { chromium, APP_URL } from './_e26.mjs';
/* P2-11 — A SESSION YOU CANNOT MARK AFTER THE FACT.

   From the Nov 15 2026 audit: "let the user mark a session as injury, illness or unusual
   (e.g. Nov 9, toe injury). Flagged sessions are excluded from all automation triggers.
   They still show in the history."

   Most of that was already here. The day flags — ill, unusual stress, eating less, "not
   a normal day" — are asked in the pre-workout flow, and sessionNotEvidence() reads them
   along with deloads, the first session back after a break and a day something hurt, and
   stops every automated consequence while leaving the finding on screen.

   What was missing is a way IN for the per-session flag. sessionNotEvidence() reads
   sess.notRepresentative and exposureSkip() reads it too, and nothing in the app ever
   wrote it: the flags could only be set on the way in, and a toe you hurt in the middle
   of a session is a thing you know afterwards. So the one case the audit actually names
   was the one case that could not be recorded.

   It belongs on the session, not on the day: two sessions on one date are two different
   afternoons, and the day flag cannot tell them apart. */
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
  S.splitId=DEFAULT_SPLIT; applySplit(); save();
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

/* Two sessions on one date, which is the case a day flag cannot describe. */
const seed = ()=> p.evaluate(()=>{
  const wid = ROTATION[0];
  const d = dayStr(Date.now() - 2 * 86400000);
  const mk = (id, at)=> ({
    id, date: d, workoutId: wid, startedAt: at, finishedAt: at + 3600000,
    entries: [{name:"Squat", reps:"6-10",
      sets:[{weight:"135", reps:"8", rpe:8, done:true, rest:150}]}]
  });
  S.dayFlags = {}; S.joint = {};
  S.sessions = [mk("morning", Date.now() - 2*86400000),
                mk("evening", Date.now() - 2*86400000 + 8*3600000)];
  save();
  return null;
});

console.log("1 - AS IT STANDS, BOTH COUNT");
await seed();
const before = await p.evaluate(()=> S.sessions.map(s=>
  ({id: s.id, why: sessionNotEvidence(s), skip: exposureSkip(s, "quads", null)})));
console.log("   ", JSON.stringify(before));
ck("neither is excluded yet", before.every(x=> x.why === null),
   JSON.stringify(before.map(x=> x.why)));

console.log("\n2 - THE EDITOR OFFERS THE MARK");
const offered = await p.evaluate(()=>{
  openSessionEditor("evening");
  const el = document.querySelector("#modal [data-sessnotrep]");
  return {there: !!el, pressed: el ? el.getAttribute("aria-pressed") : null,
          text: (document.querySelector("#modal") || {}).innerText || ""};
});
ck("there is a control for it", offered.there, String(offered.there));
ck("and it is off to begin with", offered.pressed === "false", String(offered.pressed));
ck("worded as what it does", /do not learn|not a normal|normal day|representative/i.test(offered.text),
   (offered.text.match(/[^\n]*(learn|normal day|representative)[^\n]*/i) || [""])[0]);

console.log("\n3 - MARKING ONE MARKS ONLY THAT ONE");
const marked = await p.evaluate(()=>{
  const el = document.querySelector("#modal [data-sessnotrep]");
  if(el) el.click();
  const got = S.sessions.map(s=> ({id: s.id, flag: !!s.notRepresentative,
                                   why: sessionNotEvidence(s)}));
  const el2 = document.querySelector("#modal [data-sessnotrep]");
  return {got, pressed: el2 ? el2.getAttribute("aria-pressed") : null,
          dayFlags: JSON.stringify(S.dayFlags)};
});
console.log("   ", JSON.stringify(marked));
ck("the evening session is marked", marked.got.find(x=> x.id === "evening").flag,
   JSON.stringify(marked.got));
ck("the morning one is not", !marked.got.find(x=> x.id === "morning").flag,
   JSON.stringify(marked.got));
ck("the control shows it", marked.pressed === "true", String(marked.pressed));
ck("and the day itself is left alone", marked.dayFlags === "{}", marked.dayFlags);

console.log("\n4 - AND EVERY AUTOMATIC CONSEQUENCE STOPS FOR IT");
const stops = await p.evaluate(()=>{
  const ev = S.sessions.find(s=> s.id === "evening");
  const mo = S.sessions.find(s=> s.id === "morning");
  return {
    why: sessionNotEvidence(ev),
    skip: exposureSkip(ev, "quads", null),
    otherWhy: sessionNotEvidence(mo),
    otherSkip: exposureSkip(mo, "quads", null)
  };
});
console.log("   ", JSON.stringify(stops));
ck("it is named as not being evidence", !!stops.why, String(stops.why));
ck("in the words the user would recognise", /not representative/i.test(stops.why || ""), stops.why);
ck("the performance read skips it", stops.skip.some(x=> /not representative/i.test(x)),
   JSON.stringify(stops.skip));
ck("and the other session is untouched",
   stops.otherWhy === null && stops.otherSkip.length === 0,
   JSON.stringify([stops.otherWhy, stops.otherSkip]));

console.log("\n5 - IT STILL SHOWS IN THE HISTORY");
const shown = await p.evaluate(()=>{
  hideModal();
  TAB = "history"; render();
  const t = document.body.innerText;
  return {both: (t.match(/Squat/g) || []).length,
          saysSo: /not learned from|not a normal|not representative|do not learn/i.test(t),
          text: t.slice(0, 600)};
});
console.log("    history says:", JSON.stringify(shown.saysSo), " squats listed:", shown.both);
ck("the session is still listed", shown.both >= 1, String(shown.both));
ck("and the row says the app has stopped learning from it", shown.saysSo, shown.text.slice(0,200));

console.log("\n6 - AND TAPPING IT AGAIN TAKES IT BACK OFF");
const off = await p.evaluate(()=>{
  openSessionEditor("evening");
  const el = document.querySelector("#modal [data-sessnotrep]");
  if(el) el.click();
  const s = S.sessions.find(x=> x.id === "evening");
  const el2 = document.querySelector("#modal [data-sessnotrep]");
  return {flag: !!s.notRepresentative, why: sessionNotEvidence(s),
          pressed: el2 ? el2.getAttribute("aria-pressed") : null, edited: !!s.edited};
});
console.log("   ", JSON.stringify(off));
ck("the mark comes off", off.flag === false, String(off.flag));
ck("and it counts again", off.why === null, String(off.why));
ck("the control shows that too", off.pressed === "false", String(off.pressed));
ck("and the edit is stamped either way", off.edited, String(off.edited));

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
