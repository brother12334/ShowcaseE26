import { chromium, APP_URL } from './_e26.mjs';
/* "IS THE START LIGHTER FLAG A GOOD FEATURE? I DON'T USE IT EVER, I FEEL LIKE YOU SHOULD
   JUST DO LOWER WEIGHT."

   Three things were wrong with it, and the third is the one that matters.

   It was named for a warm-up strategy and did something else: it writes a lower weight
   into the programme, which is exactly what was being asked for.

   It offered rest and load as equals. They are not: longer rest buys the reps back AT
   the same load, which is the better trade, and taking weight off trades the load away
   to get the same reps.

   And it fired on the size of the drop alone. A rep drop across sets is the ordinary
   signature of fatigue — 20-30% off the first set is typical at two to three minutes'
   rest, and a first set taken close to failure is SUPPOSED to be followed by smaller
   ones. What makes a drop worth raising is the last set falling out of its rep range. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1200}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };
const ev=(fn,a)=>p.evaluate(fn,a);

await ev(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, plateStep:2.5});
  S.splitId=DEFAULT_SPLIT; applySplit();
  S.program[ROTATION[0]]=[{name:"Barbell Bench Press", sets:3, reps:"10-20", weight:135}];
  save();
});
/* One session, one exercise, three sets at the same load. */
const run = (reps, range)=> ev(a=>{
  const wid=ROTATION[0];
  findProgramEntry("Barbell Bench Press").reps = a.range;
  const sess = {id:"s1", workoutId:wid, date:todayStr(), startedAt:Date.now()-3600e3,
    finishedAt:Date.now(),
    entries:[{name:"Barbell Bench Press", reps:a.range,
      sets:a.reps.map(r=>({weight:"135", reps:String(r), rpe:"9", done:true}))}]};
  const d = repDropOffs(sess);
  return {steep: d.steep.length, bad: d.bad.length,
          drop: d.drops[0] ? Math.round(d.drops[0].drop*100) : null,
          lastShort: d.drops[0] ? d.drops[0].lastShort : null,
          finding: fadeFindings(sess).map(f=> f.msg + " | " + f.sub)};
}, {reps, range});

console.log("1 - A BIG DROP THAT STAYED INSIDE THE RANGE IS NOT A FINDING");
/* 20 → 12 in a 10-20 range: a 40% fall, and every set did its job. */
{
  const r = await run([20, 15, 12], "10-20");
  console.log("   ", JSON.stringify(r));
  ck("the drop is steep by the old measure", r.drop >= 35, r.drop + "%");
  ck("and it is still counted as steep", r.steep === 1, String(r.steep));
  ck("BUT NOTHING IS RAISED, because every set landed in range",
     r.bad === 0 && r.finding.length === 0, JSON.stringify(r.finding));
}

console.log("2 - THE SAME DROP THAT COST A SET IS");
/* 13 → 7 in a 9-13 range: the last set fell out of the bottom of it. */
{
  const r = await run([13, 10, 7], "9-13");
  console.log("   ", JSON.stringify(r));
  ck("the last set is under the range", r.lastShort === true, String(r.lastShort));
  ck("so it is raised", r.bad === 1 && r.finding.length === 1, JSON.stringify(r.finding));
  ck("and it says which number it fell under", /under the 9/.test(r.finding[0] || ""), r.finding[0]);
}

console.log("3 - AND REST IS OFFERED FIRST, NOT AS A COIN FLIP");
{
  const r = await run([13, 10, 7], "9-13");
  const sub = r.finding[0] || "";
  console.log("   ", sub.split(" | ")[1]);
  ck("more rest is named as the usual fix", /More rest is the usual fix/.test(sub), sub);
  ck("because it keeps the load", /without changing the weight/.test(sub), sub);
  ck("and taking weight off is the other way round, second",
     sub.indexOf("More rest") < sub.indexOf("Taking the load down"), sub);
  ck("nothing claims it is 'nearly always' one of two things",
     !/nearly always/.test(sub), sub);
}

console.log("4 - A SMALL DROP IS STILL NOTHING AT ALL");
{
  const r = await run([12, 11, 10], "9-13");
  console.log("   ", JSON.stringify(r));
  ck("not steep, not raised", r.steep === 0 && r.bad === 0, JSON.stringify(r));
}

console.log("5 - NO REP RANGE, NO ANSWER, NO FINDING");
/* The question is "did it fall out of its range". Without one there is nothing to ask. */
{
  const r = await ev(()=>{
    const wid=ROTATION[0];
    const sess = {id:"s2", workoutId:wid, date:todayStr(), startedAt:Date.now()-3600e3,
      finishedAt:Date.now(),
      entries:[{name:"Barbell Bench Press",
        sets:[13,10,7].map(x=>({weight:"135", reps:String(x), rpe:"9", done:true}))}]};
    const d = repDropOffs(sess);
    return {steep: d.steep.length, bad: d.bad.length, range: d.drops[0].range};
  });
  console.log("   ", JSON.stringify(r));
  ck("still counted as steep", r.steep === 1, String(r.steep));
  ck("but not raised, because nothing says what it should have been",
     r.bad === 0 && r.range === null, JSON.stringify(r));
}

console.log("6 - THE BUTTON SAYS WHAT IT DOES");
{
  const r = await ev(()=>{
    const wid=ROTATION[0];
    findProgramEntry("Barbell Bench Press").reps = "9-13";
    const sess = {id:"s3", workoutId:wid, date:todayStr(), startedAt:Date.now()-3600e3,
      finishedAt:Date.now(),
      entries:[{name:"Barbell Bench Press", reps:"9-13",
        sets:[13,10,7].map(x=>({weight:"135", reps:String(x), rpe:"9", done:true}))}]};
    S.flags=[]; recordFlags(sess, fadeFindings(sess));
    /* The Body tab has nothing to draw without a log, so the session goes in it. */
    S.sessions=[sess]; save();
    TAB="body"; render();
    const card=[...document.querySelectorAll('.nb-flag')].find(c=> /fell away/i.test(c.innerText));
    return {card: !!card, txt: card ? card.innerText.replace(/\s+/g," ") : null};
  });
  console.log("   ", r.txt);
  ck("the flag is on the Body tab", r.card, String(r.card));
  ck("THE LOAD OPTION NAMES THE WEIGHT IT TAKES OFF",
     /Take [\d.]+ lb off/.test(r.txt || ""), r.txt);
  ck("it no longer says 'Start lighter'", !/Start lighter/i.test(r.txt || ""), r.txt);
  ck("and rest is recommended first", /Rest is the one to try first/.test(r.txt || ""), r.txt);
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
