import { chromium, APP_URL } from './_e26.mjs';
/* WHICH OF THE APP'S TWO FACTS IS THE WRONG ONE.

   P2-11 gave Element 26 an impossible-load warning: a load the equipment profile says
   cannot be produced. It was built on the audited case — a 55 lb dumbbell row on a rack
   that ends at 50 — and it is right about that one. It was also, on this user's real log,
   wrong 42 times.

   The cable stacks at their gym reach 2.5 lb increments. Their profile said 5. So every
   2.5 they have ever logged read as impossible: 22 sets of the rear delt fly at 32.5, and
   the same thing on the mid cable fly, the chest press, the lat prayer, the ab crunch and
   the Bayesian curl — six movements, ten months. Forty-two accusations against a log that
   was right, from a profile that was out of date.

   The warning's own premise is that two of the app's facts disagree. It was reading that
   as "the log is wrong", when the log is a record of what happened and the profile is a
   description somebody typed once.

   SO THE EVIDENCE DECIDES WHICH ONE IS DOUBTED. A load logged in more than one session is
   a fact about the building: the warning says the profile looks out of date and offers to
   fix it. A load logged in exactly one session is the typo case the check was built for,
   and it says so. Either way it is shown, and either way the log is left alone.

   One session against several is not a tuned threshold — it separates this user's data
   exactly. The fly's 32.5 spans ten sessions; every value that is off BOTH grids (lat
   pulldown 132, single-arm pulldown 92, face pull 92 and 112) comes from Oct 17 alone,
   which is also the session carrying the 55 lb dumbbell. */
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

/* n sessions of one movement at one load. */
const seed = (name, w, nSessions, perSession)=> p.evaluate(a=>{
  S.sessions = [];
  for(let i = 0; i < a.n; i++){
    const at = Date.now() - (a.n - i) * 7 * 86400000;
    S.sessions.push({id:"s"+i, date: dayStr(at), workoutId: ROTATION[0],
      startedAt: at, finishedAt: at + 3600000,
      entries:[{name: a.name, reps:"8-12",
        sets: Array.from({length: a.per}, ()=> ({weight: String(a.w), reps:"10", rpe:"8", done:true}))}]});
  }
  save();
  return null;
}, {name, w, n: nSessions, per: perSession});

console.log("1 - A LOAD LOGGED ACROSS MONTHS IS A FACT ABOUT THE BUILDING");
await seed("Cable Reverse Rear Delt Fly", 32.5, 10, 2);
const many = await p.evaluate(()=>{
  trainPrefs().stackStep = 5; save();
  const r = loadImpossible("Cable Reverse Rear Delt Fly", 32.5);
  return {kind: r && r.kind, why: r && r.why, seen: r && r.seen,
          line: impossibleLineHTML(S.sessions[0].entries[0]).replace(/<[^>]+>/g," ")
                  .replace(/\s+/g," ").trim()};
});
console.log("   ", JSON.stringify(many));
ck("it is still reported", !!many.kind, String(many.kind));
ck("but as the profile looking out of date, not the log being wrong",
   many.kind === "profile", String(many.kind));
ck("and it counts the sessions behind it", many.seen >= 10, String(many.seen));
ck("the sentence says which one it doubts",
   /profile|kit|settings|describe/i.test(many.why || ""), many.why);
ck("and never calls the training impossible",
   !/impossible|cannot/i.test(many.why || ""), many.why);
ck("the line on the card says the same", /10 session|ten session|sessions/i.test(many.line),
   many.line);

console.log("\n2 - AND ONE LOGGED ONCE IS THE TYPO IT WAS BUILT FOR");
await seed("Single-Arm Dumbbell Row", 55, 1, 3);
const once = await p.evaluate(()=>{
  const pr = trainPrefs(); pr.dbMax = 50; pr.dbStep = 5; save();
  const r = loadImpossible("Single-Arm Dumbbell Row", 55);
  return {kind: r && r.kind, why: r && r.why, seen: r && r.seen};
});
console.log("   ", JSON.stringify(once));
ck("the audited dumbbell case is unchanged", once.kind === "rack", String(once.kind));
ck("it still names the rack", /heaviest dumbbell/i.test(once.why || ""), once.why);
ck("and three sets in one session is not evidence about the rack",
   once.seen === 1, String(once.seen));

console.log("\n3 - THE AUDITED ODD VALUES, ALL FROM ONE DAY, STAY TYPOS");
/* 132 on the lat pulldown is off a 5 lb grid AND off a 2.5 one, and every set of it is
   from Oct 17 - the same session as the 55 lb dumbbell. */
await seed("Lat Pulldown", 132, 1, 4);
const oddOne = await p.evaluate(()=>{
  trainPrefs().stackStep = 2.5; save();
  const r = loadImpossible("Lat Pulldown", 132);
  return {kind: r && r.kind, seen: r && r.seen, why: r && r.why};
});
console.log("   ", JSON.stringify(oddOne));
ck("it is flagged", !!oddOne.kind, String(oddOne.kind));
ck("as a weight the stack does not make", oddOne.kind === "stack", String(oddOne.kind));
ck("because four sets in one session says nothing about the stack",
   oddOne.seen === 1, String(oddOne.seen));

console.log("\n4 - WITH THE PROFILE PUT RIGHT, THE 2.5s ARE SIMPLY NORMAL");
await seed("Cable Reverse Rear Delt Fly", 32.5, 10, 2);
const fixed = await p.evaluate(()=>{
  trainPrefs().stackStep = 2.5; save();
  return {fly: loadImpossible("Cable Reverse Rear Delt Fly", 32.5),
          crunch: loadImpossible("Cable Ab Crunch", 157.5),
          prayer: loadImpossible("Cable Lat Prayer", 77.5),
          line: impossibleLineHTML(S.sessions[0].entries[0])};
});
console.log("   ", JSON.stringify({fly: fixed.fly, crunch: fixed.crunch, prayer: fixed.prayer}));
ck("the fly is not flagged at all", fixed.fly === null, JSON.stringify(fixed.fly));
ck("nor the ab crunch", fixed.crunch === null, JSON.stringify(fixed.crunch));
ck("nor the lat prayer", fixed.prayer === null, JSON.stringify(fixed.prayer));
ck("and the card says nothing", fixed.line === "", fixed.line);

console.log("\n5 - AND PROGRESSION STEPS BY WHAT THE STACK ACTUALLY MAKES");
const step = await p.evaluate(()=>{
  const out = {};
  [5, 2.5].forEach(st=>{
    trainPrefs().stackStep = st; save();
    const n = "Cable Reverse Rear Delt Fly";
    out[String(st)] = {step: loadStepFor(n),
      to: stepUpLoad(null, 32.5, loadStepFor(n), n),
      from30: stepUpLoad(null, 30, loadStepFor(n), n)};
  });
  return out;
});
console.log("   ", JSON.stringify(step));
ck("a 2.5 stack steps by 2.5", step["2.5"].step === 2.5, String(step["2.5"].step));
ck("32.5 goes to 35 either way",
   step["2.5"].to === 35 && step["5"].to === 35,
   step["2.5"].to + " / " + step["5"].to);
ck("and 30 goes to 32.5 where the add-on exists", step["2.5"].from30 === 32.5,
   String(step["2.5"].from30));
ck("while a 5 lb stack still goes 30 to 35", step["5"].from30 === 35,
   String(step["5"].from30));

console.log("\n6 - THE WORDING DOES NOT CLAIM TO KNOW HOW THE 2.5 IS MADE");
/* A 2.5 on a cable can be a 2.5 lb pin or a 5 lb pin with an add-on, and the app has no
   way to tell. "One pin on the stack" asserts the first. */
const word = await p.evaluate(()=>{
  trainPrefs().stackStep = 2.5; save();
  const wid = ROTATION[0];
  S.program[wid] = [{name:"Cable Reverse Rear Delt Fly", sets:3, reps:"12-20", weight:30}];
  const sess = {id:"w1", date: todayStr(), workoutId: wid,
    startedAt: Date.now()-3600000, finishedAt: Date.now(),
    entries:[{name:"Cable Reverse Rear Delt Fly", reps:"12-20",
      sets:[1,2,3].map(()=> ({weight:"30", reps:"21", rpe:"8", done:true}))}]};
  const v = progressionFor(sess, sess.entries[0]);
  return {to: v && v.to, amount: v && v.step && v.step.amount, why: v && v.step && v.step.why};
});
console.log("   ", JSON.stringify(word));
ck("the step is 2.5", word.amount === 2.5, String(word.amount));
ck("landing on 32.5", word.to === 32.5, String(word.to));
ck("and the reason does not assert a pin size",
   !/one pin/i.test(word.why || ""), word.why);
ck("while still saying where the number comes from",
   /stack/i.test(word.why || ""), word.why);

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
