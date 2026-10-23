import { chromium, APP_URL } from './_e26.mjs';
/* "IT'S SAYING TO DO 29.9 LBS, HOW AM I EVEN SUPPOSED TO PUT THAT ON A CABLE MACHINE."

   Reported from a grade card: a cable hammer curl told to drop to 29.9 lb, with 29.944 in
   the Apply box beside it. Not a rounding slip — nothing was rounding it at all.
   loadStepFor() knew what a bar and a dumbbell move in and answered ZERO for a cable or a
   machine, and roundLoadable() hands a load straight back when the step is zero. Every
   other kind of gear was snapped to something loadable; these two were not. */
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
const ev = fn=> p.evaluate(fn);

console.log("1 - A STACK HAS A STEP NOW, LIKE EVERY OTHER KIND OF GEAR");
{
  const r = await ev(()=>({
    cable: loadStepFor("Single-Arm Cable Hammer Curl"),
    machine: loadStepFor("Leg Press Machine"),
    bar: (()=>{ trainPrefs().plateStep = 2.5; return loadStepFor("Barbell Bench Press"); })(),
    db: (()=>{ trainPrefs().dbStep = 5; return loadStepFor("Dumbbell Curl"); })(),
    pref: trainPrefs().stackStep
  }));
  console.log("   ", JSON.stringify(r));
  ck("a cable moves in whole pins", r.cable > 0, String(r.cable));
  ck("and so does a machine", r.machine > 0, String(r.machine));
  ck("the default is the common selectorized step", r.pref === 5, String(r.pref));
  /* The bar is twice the smallest plate and a dumbbell is the gap on the rack: both were
     already right, and the point here is that adding stacks did not disturb them. */
  ck("a bar is still twice the smallest plate", r.bar === 5, String(r.bar));
  ck("and a dumbbell is still the gap on the rack", r.db === 5, String(r.db));
}

console.log("\n2 - SO NOTHING SUGGESTS A WEIGHT NO PIN CAN SIT AT");
{
  const r = await ev(()=>({
    raw: roundLoadable(29.944, "Single-Arm Cable Hammer Curl"),
    up: roundLoadable(32.6, "Cable Row"),
    machine: roundLoadable(103.2, "Leg Press Machine"),
    at2: (()=>{ trainPrefs().stackStep = 2.5; const v = roundLoadable(29.944, "Cable Row"); return v; })(),
    at10: (()=>{ trainPrefs().stackStep = 10; const v = roundLoadable(29.944, "Cable Row"); return v; })(),
    at15: (()=>{ trainPrefs().stackStep = 15; const v = roundLoadable(52, "Cable Row"); return v; })(),
    back: (()=>{ trainPrefs().stackStep = 5; return trainPrefs().stackStep; })()
  }));
  console.log("   ", JSON.stringify(r));
  ck("29.944 becomes a number on the stack", r.raw === 30, String(r.raw));
  ck("and it rounds to the nearest pin either way", r.up === 32.5 || r.up === 35 || r.up === 30, String(r.up));
  ck("a machine too", r.machine % 5 === 0, String(r.machine));
  ck("A 2.5 STACK GETS 2.5s", r.at2 % 2.5 === 0, String(r.at2));
  ck("a 10 stack gets tens", r.at10 % 10 === 0, String(r.at10));
  ck("and a 15 stack gets fifteens", r.at15 % 15 === 0, String(r.at15));
}

console.log("\n3 - THE REPORTED CARD, REBUILT");
{
  const r = await ev(()=>{
    const wid=ROTATION[0], ex="Single-Arm Cable Hammer Curl";
    S.program[wid]=[{name:ex, sets:3, reps:"10-15", rpes:[8,9,9], weight:35}];
    const sess={id:"s1", workoutId:wid, date:todayStr(), startedAt:Date.now()-3600e3,
      finishedAt:Date.now(),
      entries:[{name:ex, reps:"10-15", sets:[
        {weight:"35", reps:"8", rpe:"9.5", done:true},
        {weight:"35", reps:"7", rpe:"10", done:true}]}]};
    S.sessions=[sess]; save();
    const res = impossibleLoadCheck(findProgramEntry(ex), sess.entries[0], sess);
    return {to: res && res.to, fix: res && res.fix};
  });
  console.log("   ", JSON.stringify(r));
  ck("the suggestion is a stack weight", r.to % 5 === 0, String(r.to));
  ck("it is lower than the load that failed", r.to < 35, String(r.to));
  ck("AND THE SENTENCE SAYS A NUMBER SOMEBODY CAN SET",
     /Drop to about 30 lb/.test(r.fix), r.fix);
  ck("with no long decimal anywhere in it", !/\d\.\d\d/.test(r.fix), r.fix);
}

console.log("\n4 - AND THE APPLY BOX CARRIES THAT SAME NUMBER");
{
  const r = await ev(()=>{
    const flags = flagLog();
    flags.length = 0;
    const wid=ROTATION[0], ex="Single-Arm Cable Hammer Curl";
    const sess = S.sessions[0];
    const res = impossibleLoadCheck(findProgramEntry(ex), sess.entries[0], sess);
    flags.push({id:"f1", kind:"load", ex, to: res.to, msg: res.msg, fix: res.fix, at: Date.now()});
    save(); TAB="body"; BODY_FOCUS=null; render();
    const box = document.querySelector('[data-flagval], .flag-apply input, input[data-fixval]');
    /* #app only, and innerText rather than textContent: the page keeps its script inside
       body, so textContent includes the source and finds constants like 0.4535924 that
       nobody ever sees. */
    const txt = (document.getElementById("app") || {}).innerText || "";
    return {boxVal: box ? box.value : null,
            hasLong: /\d+\.\d{3,}/.test(txt),
            longs: (txt.match(/\d+\.\d{3,}/g) || []).slice(0,5),
            sample: (txt.match(/Drop to about [^.]*/) || [""])[0]};
  });
  console.log("   ", JSON.stringify(r));
  ck("nothing on the screen carries a three-decimal weight", !r.hasLong, String(r.hasLong));
  ck("and the advice reads as a settable number", !/\d\.\d\d/.test(r.sample), r.sample);
}

console.log("\n5 - THE SETTING EXISTS, because not every stack is a 5");
{
  const r = await ev(()=>{
    TAB="sync"; SET_PAGE="where"; render();
    const t = document.body.textContent || "";
    const chips = Array.from(document.querySelectorAll("[data-stkstep]")).map(b=> b.getAttribute("data-stkstep"));
    return {asks: /cable or machine stack moves in/i.test(t), chips,
            says: /never between two pins|no stack in the building/i.test(t)};
  });
  console.log("   ", JSON.stringify(r));
  ck("the question is asked where the other gear questions are", r.asks, String(r.asks));
  ck("with the usual stack sizes offered", r.chips.length >= 4, r.chips.join(","));
  ck("including a way to type one that is not listed", r.chips.indexOf("other") >= 0, r.chips.join(","));
  ck("and it says what the setting does", r.says, String(r.says));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
