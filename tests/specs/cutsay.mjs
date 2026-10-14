import { chromium, APP_URL } from './_e26.mjs';
/* "A CUT SET DECIDED BY THE APP WHEN A MUSCLE IS FALLING ISN'T BEING APPLIED WHEN THAT
   EXERCISE IS THEN PUT IN A SUPERSET, BUT IT STILL SAYS −1 CUT SET."

   Both halves were behaving. The plan took the cut; the live catch-up refuses to delete a
   row that already has something written in it, which is a rule worth keeping. What was
   missing is that the card asserted a cut the rows were plainly not showing and explained
   nothing, so the only available reading was that the app had failed to do what it said.
   The rows are still never deleted for you. The card now says why. */
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
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr();
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, warmups:'off'});
  S.splitId=DEFAULT_SPLIT; applySplit(); save();
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

/* ss: paired or not. logged: whether the last row already carries work. */
const scene = (ss, logged)=> p.evaluate(a=>{
  const wid=ROTATION[0];
  S.program[wid]=[{name:"Cable Fly", sets:4, reps:"8-12", weight:30, superset: a.ss||undefined},
                  {name:"Push-up", sets:3, reps:"10-15", supersetEnd: a.ss||undefined}];
  S.active=null; save(); startWorkout(wid); PF=null; TAB="workout"; save();
  const before = S.active.entries[0].sets.length;
  if(a.logged){ const st=S.active.entries[0].sets[3]; st.weight="30"; st.reps="10"; save(); }
  flagLog().length=0;
  flagLog().push({id:"f1", kind:"stall", ex:"Cable Fly", msg:"Chest is falling behind."});
  const applied = applyFlag("f1");
  syncActivePlan(); render();
  const t=document.body.innerText;
  return {applied, before, plan: findProgramEntry("Cable Fly").sets,
          rows: S.active.entries[0].sets.length,
          chip: /−1 set/.test(t),
          says: /still has \d+/.test(t),
          line: (t.match(/[^\n]*still has[^\n]*/)||[""])[0]};
}, {ss, logged});

console.log("1 - AN UNTOUCHED ROW: THE CUT REACHES THE SESSION YOU ARE IN");
for(const ss of [false, true]){
  const r = await scene(ss, false);
  console.log("   ", ss ? "in a superset" : "on its own", JSON.stringify(r));
  ck("the plan takes the cut", r.plan === 3, String(r.plan));
  ck("and so does the session", r.rows === 3, r.before + " → " + r.rows);
  ck("with nothing to explain", !r.says, r.line);
}

console.log("\n2 - A ROW YOU HAVE WRITTEN IN IS KEPT, AND THE CARD SAYS SO");
for(const ss of [false, true]){
  const r = await scene(ss, true);
  console.log("   ", ss ? "in a superset" : "on its own", JSON.stringify(r));
  ck("the plan still takes the cut", r.plan === 3, String(r.plan));
  ck("your work is not deleted", r.rows === 4, String(r.rows));
  ck("the chip is still there", r.chip, String(r.chip));
  ck("and it no longer contradicts the rows in silence", r.says, r.line);
  ck("naming the count in front of you", /still has 4/.test(r.line), r.line);
  ck("and how to take it off yourself", /−/.test(r.line), r.line);
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
