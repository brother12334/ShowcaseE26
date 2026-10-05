import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
const boot = (weighed)=> p.evaluate((weighed)=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open','spec-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.splitId=DEFAULT_SPLIT; applySplit();
  S.spec=null; S.bwEx={}; S.bodyLog={}; S.sessions=[]; S.active=null;
  if(weighed) S.bodyLog[todayStr()] = {w: 185};
  /* into the PROGRAM, so the session is built the way the app builds one and the plan
     reconciler has nothing to disagree with */
  const wid = ROTATION[0];
  S.program[wid] = [
    {name:"Weighted Chest Dip", sets:3, reps:"8", rpes:[8,8,9]},
    {name:"Pull-Up",            sets:3, reps:"8", rpes:[8,8,9]},
    {name:"Barbell Bench Press",sets:3, reps:"8", rpes:[8,8,9]}
  ];
  save();
  startWorkout(wid);
  hideModal();
  const el2=document.getElementById('preflight'); if(el2) el2.remove();
  document.body.classList.remove('pfl-open');
  try{PF=null}catch(e){}
  goTab("workout"); render();
}, weighed);
await boot(true);

console.log("1 - THE BUTTON IS OFFERED WHERE IT MAKES SENSE AND NOWHERE ELSE");
{
  const r = await p.evaluate(()=>({
    dip: isBodyweightMove("Weighted Chest Dip"),
    pull: isBodyweightMove("Pull-Up"),
    push: isBodyweightMove("Push-Up"),
    bench: isBodyweightMove("Barbell Bench Press"),
    curl: isBodyweightMove("Dumbbell Curl"),
    squat: isBodyweightMove("Barbell Back Squat"),
    /* the plan merges its own rows into a seeded session, so count against what is
       actually there rather than against what the spec put there */
    qualify: (S.active.entries||[]).map((e,i)=> isBodyweightMove(e.name) ? i : -1).filter(i=> i>=0),
    buttons: [...document.querySelectorAll("[data-bw],[data-bwneed]")]
      .map(x=> parseInt(x.dataset.bw != null ? x.dataset.bw : x.dataset.bwneed, 10)),
    label: (document.querySelector("[data-bw]")||{}).textContent || ""
  }));
  ck("a weighted dip counts as a bodyweight movement", r.dip, String(r.dip));
  ck("so do pull-ups and push-ups", r.pull && r.push, JSON.stringify(r));
  ck("a bench press does not", !r.bench, String(r.bench));
  ck("nor a curl", !r.curl, String(r.curl));
  ck("the button is drawn on exactly the rows that qualify",
     r.buttons.slice().sort((a,b)=>a-b).join(",") === r.qualify.join(","),
     r.buttons.join(",") + " vs " + r.qualify.join(","));
  ck("and it says the figure it will use", /185/.test(r.label), r.label);
}

console.log("2 - ONE PRESS PUTS YOUR WEIGHT ON EVERY SET");
{
  const r = await p.evaluate(()=>{
    const ei = S.active.entries.findIndex(e=> /weighted chest dip/i.test(e.name));
    document.querySelector('[data-bw="'+ei+'"]').click();
    const en = S.active.entries[ei];
    return {weights: en.sets.map(s=> s.weight), on: entryBwOn(en),
            remembered: bwRemembered("Weighted Chest Dip"),
            label: (document.querySelector('[data-bw="'+ei+'"]')||{}).textContent || ""};
  });
  ck("every set carries it", r.weights.join(",") === "185,185,185", r.weights.join(","));
  ck("the entry records the figure used", r.on === 185, String(r.on));
  ck("the button says it is on", /you \(185/.test(r.label), r.label);
  ck("and it is remembered for next time", r.remembered, String(r.remembered));
}

console.log("3 - AND WHAT YOU HANG OFF IT GOES ON TOP");
{
  const r = await p.evaluate(()=>{
    const en = S.active.entries.find(e=> /weighted chest dip/i.test(e.name));
    bwApply(en, false);                        // back to nothing
    en.sets[0].weight = "25"; en.sets[1].weight = "25"; en.sets[2].weight = "45";
    bwApply(en, true);
    return en.sets.map(s=> s.weight);
  });
  ck("a 25 lb belt on a 185 lb lifter is 210", r[0] === "210" && r[1] === "210", r.join(","));
  ck("and 45 is 230", r[2] === "230", r.join(","));
}

console.log("4 - TURNING IT OFF GIVES BACK EXACTLY WHAT IT TOOK");
{
  const r = await p.evaluate(()=>{
    const en = S.active.entries.find(e=> /weighted chest dip/i.test(e.name));
    S.bodyLog[todayStr()] = {w: 191};          // you have gained since
    bwApply(en, false);
    return {weights: en.sets.map(s=> s.weight), on: entryBwOn(en)};
  });
  ck("the belt weights come back untouched", r.weights.join(",") === "25,25,45", r.weights.join(","));
  ck("even though you weigh something else now", r.on === 0, String(r.on));
}

console.log("5 - PRESSING IT TWICE DOES NOT DOUBLE ANYTHING");
{
  const r = await p.evaluate(()=>{
    const en = S.active.entries.find(e=> /pull-?up/i.test(e.name)) || S.active.entries[1];
    window.__pu = S.active.entries.indexOf(en);
    const a = bwApply(en, true);
    const b2 = bwApply(en, true);              // again
    const w1 = en.sets.map(s=> s.weight).join(",");
    const c = bwApply(en, false);
    const d = bwApply(en, false);              // and off again
    return {a, b2, c, d, w1, w2: en.sets.map(s=> s.weight).join(",")};
  });
  ck("on once, then nothing", r.a === true && r.b2 === false, JSON.stringify(r));
  ck("the weights are right", r.w1 === "191,191,191", r.w1);
  ck("off once, then nothing", r.c === true && r.d === false, JSON.stringify(r));
  ck("and it is back to empty", r.w2 === ",,", "["+r.w2+"]");
}

console.log("6 - A SET ADDED AFTERWARDS CARRIES IT TOO");
{
  const r = await p.evaluate(()=>{
    const i = window.__pu;
    const en = S.active.entries[i];
    bwApply(en, true);
    addSetOfKind(i, "");
    hideModal();
    return S.active.entries[i].sets.map(s=> s.weight);
  });
  ck("the new set is not the odd one out", r.join(",") === "191,191,191,191", r.join(","));
}

console.log("7 - SWITCHING IT ON IS NOT A PERSONAL BEST");
{
  const r = await p.evaluate(()=>{
    const day = 86400000, now = Date.now();
    S.active = null;
    S.sessions = [];
    /* three sessions on the belt weight alone, then two with bodyweight counted */
    const mk = (i, w, bw)=>({
      id:"s"+i, date:new Date(now-i*day).toLocaleDateString("en-CA"),
      workoutId:ROTATION[0], startedAt:now-i*day, finishedAt:now-i*day+36e5, feel:4,
      entries:[Object.assign({name:"Weighted Chest Dip", reps:"8",
        sets:[0,1,2].map(()=>({weight:String(w), reps:"8", rpe:"8", done:true}))},
        bw ? {bwOn:185} : {})]});
    S.sessions = [mk(20,25), mk(16,27.5), mk(12,30), mk(8,215,true), mk(4,220,true)];
    save();
    const exps = muscleExposures("chest", {lifts:["weighted chest dip"]});
    return exps.map(x=> ({v: Math.round(x.v), pct: x.pct == null ? null : Math.round(x.pct),
                          skip: x.skip.join("|")}));
  });
  console.log("     " + JSON.stringify(r));
  const jump = r.find(x=> x.pct != null && x.pct > 100);
  ck("the switch produces a huge apparent jump", !!jump, JSON.stringify(r));
  ck("and that exposure is skipped, by name",
     jump && /bodyweight was switched on/.test(jump.skip), jump && jump.skip);
  const usable = r.filter(x=> !x.skip && x.pct != null);
  ck("the comparisons that survive are all sane",
     usable.every(x=> Math.abs(x.pct) < 50), JSON.stringify(usable));
}

console.log("8 - AND THE PLATE CALCULATOR OFFERS THE BELT, NOT A BARBELL");
{
  const r = await p.evaluate(()=>{
    const en = {name:"Weighted Chest Dip", reps:"8", bwOn:185,
                sets:[{weight:"210", reps:"8", rpe:"8", done:false}]};
    const plain = {name:"Barbell Bench Press", reps:"8",
                   sets:[{weight:"185", reps:"8", rpe:"8", done:false}]};
    S.prefs = Object.assign({}, S.prefs, {barMode:"total", barWeight:45, plateStep:2.5});
    return {bw: plateLineHTML(en, null), normal: plateLineHTML(plain, null).length};
  });
  /* It used to offer nothing at all here. A weighted dip has something to load — the
     belt — and the one figure somebody needs is how much goes on it, which the total
     hides. No bar, no plate art: just what the number is made of. */
  const bwTxt = r.bw.replace(/<[^>]*>/g, "").trim();
  ck("a dip is broken into you and the belt",
     /you 185/.test(bwTxt) && /25 lb on the belt/.test(bwTxt) && !/\bbar\b/.test(bwTxt), bwTxt);
  ck("but an ordinary barbell lift still gets its plates", r.normal > 0, String(r.normal));
}

console.log("9 - WITHOUT A WEIGH-IN IT ASKS FOR ONE RATHER THAN GUESSING");
{
  await boot(false);
  const r = await p.evaluate(()=>({
    w: bodyWeightNow(),
    need: !!document.querySelector("[data-bwneed]"),
    on: !!document.querySelector("[data-bw]"),
    label: (document.querySelector("[data-bwneed]")||{}).textContent || "",
    applied: bwApply(S.active.entries.find(e=> isBodyweightMove(e.name)), true)
  }));
  ck("it does not know what you weigh", r.w === null, String(r.w));
  ck("so the button asks for a weigh-in", r.need && !r.on, JSON.stringify(r));
  ck("and nothing is written in the meantime", r.applied === false, String(r.applied));
}

console.log("10 - A CHOICE MADE ONCE HOLDS FOR THE NEXT SESSION");
{
  const r = await p.evaluate(()=>{
    S.bodyLog[todayStr()] = {w: 180};
    S.bwEx = {}; bwRemember("Pull-Up", true);
    S.active = null;
    const wid = ROTATION.find(w=> (planSlotList(w)||[]).some(e=> /pull-?up/i.test(e.name)));
    if(!wid) return {none:true};
    startWorkout(wid); hideModal();
    const en = (S.active.entries||[]).find(e=> /pull-?up/i.test(e.name));
    return {on: en && entryBwOn(en), weights: en && en.sets.map(s=> s.weight).join(",")};
  });
  if(r.none){ ck("no pull-up day in this programme to test with", true, ""); }
  else {
    ck("the next session starts with it already on", r.on === 180, String(r.on));
    ck("and the figure is today's weight, not the day you switched it on",
       /180/.test(r.weights || ""), r.weights);
  }
}

console.log(errs.length?("PAGE ERRORS: "+errs.join(" | ")):"no page errors");
if(errs.length) bad++;
console.log(bad?("BROKEN: "+bad):"all good");
await b.close();
