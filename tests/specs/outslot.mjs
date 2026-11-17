import { chromium, APP_URL } from './_e26.mjs';
/* SLOT DEBT 2 of 9 - outgrownOptions and outgrownStuck.

   Treated as a suspected live bug until proven otherwise, which is the right default now
   that debt 1 turned out to be one. Both halves are:

     outgrownStuck(name, range) walks every session of that NAME looking for a run at one
     unchanging load with the top of the range cleared every time. Across two slots at
     different loads the run never agrees, so the verdict is suppressed on the slot that
     really is stuck - and where two slots happen to share a load, three sessions drawn
     from two different prescriptions read as one run.

     outgrownOptions(name) looks the movement up by name to find "the day this movement
     sits in", and uses it for one thing: not offering a swap the day already trains. For
     a movement in two slots that is the wrong day's roster, so a duplicate is offered on
     one day and a perfectly good option suppressed on the other.

   Neither crashes; both answer wrongly. */
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
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, dbMax:50, dbStep:5});
  S.splitId="ppl6"; applySplit(); save();
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

const EX = "Single-Arm Dumbbell Row";
/* pullA is at the top of the rack and clearing the range every week; pullB is at 40 and
   nowhere near it. Different loads per day, which is the shape that matters. */
const seed = ()=> p.evaluate(a=>{
  S.program.pullA = [{name: a.EX, sets:3, reps:"8-12", weight:50}];
  S.program.pullB = [{name: a.EX, sets:3, reps:"8-12", weight:40}];
  S.sessions = []; S.planLog = []; S.active = null;
  const mk = (wid, load, reps, i)=>{
    const at = Date.now() - (30 - i) * 86400000;
    return {id: wid + i, date: dayStr(at), workoutId: wid, startedAt: at,
      finishedAt: at + 3600000,
      entries:[{name: a.EX, reps:"8-12", rpes:[8,8,8],
        sets:[0,1,2].map(()=> ({weight:String(load), reps:String(reps), rpe:"8", done:true}))}]};
  };
  S.sessions = [mk("pullA",50,12,1), mk("pullB",40,9,2), mk("pullA",50,12,3),
                mk("pullB",40,9,4), mk("pullA",50,12,5), mk("pullB",40,9,6)]
                 .sort((x,y)=> x.startedAt - y.startedAt);
  save();
  return null;
}, {EX});

console.log("1 - THE SLOT THAT IS STUCK IS THE ONE REPORTED");
await seed();
const stuck = await p.evaluate(a=>{
  const range = repRange("8-12");
  return {A: outgrownStuck(a.EX, range, "pullA"),
          B: outgrownStuck(a.EX, range, "pullB"),
          mixed: outgrownStuck(a.EX, range)};
}, {EX});
console.log("   ", JSON.stringify(stuck));
ck("pullA, three sessions at 50 topping the range, is stuck",
   !!stuck.A && stuck.A.load === 50, JSON.stringify(stuck.A));
ck("pullB, at 40 and not topping it, is not", !stuck.B, JSON.stringify(stuck.B));
ck("and reading both days as one run finds nothing, which is the bug",
   !stuck.mixed, JSON.stringify(stuck.mixed));

console.log("\n2 - TWO SLOTS AT THE SAME LOAD ARE STILL TWO RUNS");
/* The other direction. Both days at 50, but only pullA clears the top: counted together
   they would read as a run of six, three of which did not top anything. */
const same = await p.evaluate(a=>{
  S.program.pullB[0].weight = 50;
  S.sessions.forEach(s=>{
    if(s.workoutId !== "pullB") return;
    s.entries[0].sets.forEach(st=>{ st.weight = "50"; });
  });
  save();
  const range = repRange("8-12");
  return {A: outgrownStuck(a.EX, range, "pullA"),
          B: outgrownStuck(a.EX, range, "pullB")};
}, {EX});
console.log("   ", JSON.stringify(same));
ck("pullA is still stuck at 50", !!same.A && same.A.load === 50, JSON.stringify(same.A));
ck("and pullB, which never topped the range, still is not",
   !same.B, JSON.stringify(same.B));

console.log("\n3 - THE SWAP LIST CHECKS THE RIGHT DAY'S ROSTER");
await seed();
const roster = await p.evaluate(a=>{
  /* Whatever the library offers first for this movement, discovered rather than assumed
     so the test does not depend on the library's contents. */
  const first = (outgrownOptions(a.EX, "pullA")[0] || {}).name || null;
  if(!first) return {none: true};
  /* Put it into pullB only. It is now a duplicate THERE and still a fresh option on
     pullA, and nothing about pullA should change. */
  S.program.pullB.push({name: first, sets:3, reps:"8-12", weight:30});
  save();
  const A = outgrownOptions(a.EX, "pullA").map(x=> x.name);
  const B = outgrownOptions(a.EX, "pullB").map(x=> x.name);
  return {first, A, B};
}, {EX});
console.log("   ", JSON.stringify(roster));
if(roster.none){ ck("the library offers this movement somewhere to go", false, "no options"); }
else {
  ck("the option is still offered on the day that does not train it",
     roster.A.indexOf(roster.first) > -1, roster.A.join(", "));
  ck("and is not offered on the day that now does",
     roster.B.indexOf(roster.first) < 0, roster.B.join(", "));
}

console.log("\n4 - AND THE VERDICT THAT USES THEM CARRIES ITS OWN SLOT");
const verdict = await p.evaluate(a=>{
  const sess = S.sessions.filter(s=> s.workoutId === "pullA").pop();
  const en = sess.entries[0];
  const v = progressionFor(sess, en);
  const sessB = S.sessions.filter(s=> s.workoutId === "pullB").pop();
  const vB = progressionFor(sessB, sessB.entries[0]);
  return {A: v && {kind: v.kind, to: v.to, outgrown: v.outgrown ? v.outgrown.opts.map(x=>x.name) : null,
                   alts: v.alts ? v.alts.map(x=> x.name) : null},
          B: vB && {kind: vB.kind, to: vB.to,
                    outgrown: vB.outgrown ? vB.outgrown.opts.map(x=>x.name) : null}};
}, {EX});
console.log("   ", JSON.stringify(verdict));
ck("the stuck slot's verdict offers a way out",
   !!verdict.A && (verdict.A.kind === "harder" || !!verdict.A.outgrown),
   JSON.stringify(verdict.A));
ck("and the other slot's verdict does not",
   !verdict.B || !verdict.B.outgrown, JSON.stringify(verdict.B));

console.log("\n5 - A MOVEMENT IN ONE SLOT IS UNAFFECTED");
const solo = await p.evaluate(a=>{
  S.program.pullA = [{name: a.EX, sets:3, reps:"8-12", weight:50}];
  S.program.pullB = [];
  S.sessions = S.sessions.filter(s=> s.workoutId === "pullA");
  save();
  const range = repRange("8-12");
  return {stuck: outgrownStuck(a.EX, range, "pullA"),
          opts: outgrownOptions(a.EX, "pullA").map(x=> x.name),
          unscopedStuck: outgrownStuck(a.EX, range),
          unscopedOpts: outgrownOptions(a.EX).map(x=> x.name)};
}, {EX});
console.log("   ", JSON.stringify(solo));
ck("it is still found stuck", !!solo.stuck, JSON.stringify(solo.stuck));
ck("it still has somewhere to go", solo.opts.length > 0, solo.opts.join(", "));
ck("and asking without a slot answers the same, there being only one",
   !!solo.unscopedStuck && solo.unscopedOpts.join() === solo.opts.join(),
   solo.unscopedOpts.join(", "));

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
