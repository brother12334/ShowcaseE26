import { chromium, APP_URL } from './_e26.mjs';
/* "MAKE A FEATURE YOU CAN TURN OFF IN SETTINGS CALLED PROGRESSIVE OVERLOAD TIPS WHERE IT
   WILL TELL YOU WHAT NUMBERS YOU HAVE TO BEAT BEFORE STARTING AN EXERCISE."

   Three things have to be true or the tip is worse than nothing: it has to name a number
   that genuinely beats last time, the heavier number it names has to be one the gear in
   the room can actually be set to, and the switch has to switch it off. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1400}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

const boot = (reps, lastSets, prefs)=> p.evaluate(a=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, warmups:'off'}, a.prefs||{});
  S.splitId=DEFAULT_SPLIT; applySplit();
  const wid=ROTATION[0];
  S.program[wid]=[{name:"Cable Fly", sets:3, reps:a.reps, weight:30}];
  S.sessions=[{id:"s1", date:todayStr(-7), workoutId:wid, startedAt:Date.now()-7*864e5,
               entries:[{name:"Cable Fly", reps:a.reps, sets:a.lastSets}]}];
  save(); if(S.active) S.active=null; startWorkout(wid); PF=null; TAB="workout"; save();
  const el=document.getElementById('preflight'); if(el) el.remove(); try{PF=null}catch(e){}
  render();
  const n=document.querySelector('.ex-po');
  return {tip: n ? n.innerText.replace(/\s+/g,' ').trim() : null};
}, {reps, lastSets, prefs});

console.log("1 - BELOW THE TOP OF THE RANGE, THE REP IS THE PROGRESSION");
{
  const r = await boot("8-12", [{reps:"10",weight:"30",done:true},{reps:"10",weight:"30",done:true}], null);
  console.log("   ", r.tip);
  ck("a tip is drawn", !!r.tip, String(r.tip));
  ck("it quotes last time's best set", !!r.tip && /30 lb .{1,3} 10/.test(r.tip), r.tip);
  ck("and asks for one more rep at the same load", !!r.tip && /30 lb .{1,3} 11/.test(r.tip), r.tip);
  ck("without telling you to go heavier", !!r.tip && !/35 lb/.test(r.tip), r.tip);
}

console.log("\n2 - AT THE TOP OF THE RANGE, THE LOAD IS");
{
  const r = await boot("8-12", [{reps:"12",weight:"30",done:true}], null);
  console.log("   ", r.tip);
  ck("it says the range is full", !!r.tip && /top of your rep range/i.test(r.tip), r.tip);
  ck("and names the next load on the stack, at the bottom of the range",
     !!r.tip && /35 lb .{1,3} 8/.test(r.tip), r.tip);
}

console.log("\n3 - AND THE LOAD IT NAMES IS ONE YOU CAN ACTUALLY SET");
/* The 29.9 lb cable fault, in the one place it would read as an instruction. A 10 lb
   stack step must produce 40, never 32.5 and never a decimal. */
{
  const r = await boot("8-12", [{reps:"12",weight:"30",done:true}], {stackStep:10});
  console.log("   ", r.tip);
  ck("a 10 lb stack steps to 40", !!r.tip && /40 lb/.test(r.tip), r.tip);
  ck("and no unloadable decimal is printed", !!r.tip && !/\d+\.\d/.test(r.tip), r.tip);
}

console.log("\n4 - NOTHING TO BEAT, NOTHING SAID");
{
  const r = await p.evaluate(()=>{ S.sessions=[]; save(); render();
    return {tip: document.querySelector('.ex-po') ? "drawn" : null}; });
  ck("no previous session means no tip", r.tip===null, String(r.tip));
}

console.log("\n5 - THE SWITCH SWITCHES IT OFF");
{
  const r = await boot("8-12", [{reps:"10",weight:"30",done:true}], {overloadTips:false});
  ck("off means no tip on the session card", r.tip===null, String(r.tip));
  /* The session card folds last time's numbers into a chip that builds its body when it
     is opened, so they are not in the page until then. What matters here is that
     switching the tips off took nothing else with it. */
  const still = await p.evaluate(()=> !!lastBox(S.active.workoutId, "Cable Fly", false, 0));
  ck("while last time's numbers are untouched", still, String(still));
  const back = await p.evaluate(()=>{
    TAB="sync"; SET_PAGE="sess"; render();
    const btns=[...document.querySelectorAll('[data-prefpo]')];
    const on=btns.find(x=> x.dataset.prefpo==='on');
    const labelled = btns.length>0 && /Progressive overload tips/.test(document.body.innerText);
    if(on) on.click();
    TAB="workout"; render();
    return {labelled, n:btns.length, tip: !!document.querySelector('.ex-po'),
            pref: trainPrefs().overloadTips};
  });
  console.log("   ", JSON.stringify(back));
  ck("the setting exists under its own name", back.labelled && back.n===2, JSON.stringify(back));
  ck("and turning it back on brings the tip back", back.tip && back.pref===true, JSON.stringify(back));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
