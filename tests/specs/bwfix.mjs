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
const boot = (weighIns)=> p.evaluate((weighIns)=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open','spec-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.splitId=DEFAULT_SPLIT; applySplit();
  S.active=null; S.bwEx={}; S.bwFixUndo=null; S.logFixUndo=null;
  const day=86400000, now=Date.now();
  const d = n=> new Date(now - n*day).toLocaleDateString("en-CA");
  S.bodyLog = {};
  if(weighIns) weighIns.forEach(([n,w])=> S.bodyLog[d(n)] = {w});
  const mk = (n, rows)=> ({id:"s"+n, workoutId:ROTATION[0], date:d(n),
    startedAt: now-n*day, finishedAt: now-n*day+36e5, feel:4,
    entries: rows.map(r=> ({name:r[0], reps:"8",
      sets: r[1].map(w=> ({weight: w === null ? "" : String(w), reps:"8", rpe:"8", done:true}))}))});
  /* 90 days ago they weighed 180; today 190. Dips logged as 0 and as the belt weight. */
  S.sessions = [
    mk(90, [["Weighted Chest Dip",[0,0,0]], ["Barbell Bench Press",[135,135,135]]]),
    mk(60, [["Weighted Chest Dip",[null,null,null]]]),
    mk(30, [["Weighted Chest Dip",[25,25,25]], ["Pull-Up",[0,0]]]),
    mk(5,  [["Weighted Chest Dip",[25,25,45]], ["Pull-Up",[0,0]]])
  ];
  save(); goTab("sync"); SET_PAGE="data"; render();
}, weighIns || null);
await boot([[90,180],[30,186],[1,190]]);

console.log("1 - IT FINDS WHAT WAS LOGGED WITHOUT YOU");
{
  const r = await p.evaluate(()=>({
    moves: bwFixMoves().map(m=> ({name:m.name, sets:m.sets, sessions:m.sessions})),
    btn: !!document.querySelector("#bwFixBtn"),
    blockTxt: (()=>{ const el=[...document.querySelectorAll(".set-name,.set-block")]
      .map(x=>x.textContent).join(" "); return /logged without you/i.test(el); })()
  }));
  ck("the setting is on the Your data page", r.btn, String(r.btn));
  ck("and it is named for what it is", r.blockTxt, String(r.blockTxt));
  ck("it finds the dips", r.moves.some(m=> /dip/i.test(m.name) && m.sets === 12), JSON.stringify(r.moves));
  ck("and the pull-ups", r.moves.some(m=> /pull/i.test(m.name) && m.sets === 4), JSON.stringify(r.moves));
  ck("but not the bench press", !r.moves.some(m=> /bench/i.test(m.name)), JSON.stringify(r.moves));
}

console.log("2 - IT USES WHAT YOU WEIGHED ON THE DAY, NOT TODAY");
{
  const r = await p.evaluate(()=>{
    const c = bwFixCandidates(["weighted chest dip"]);
    const by = {};
    c.forEach(x=> by[x.date] = {from: x.from, to: x.to, w: x.w});
    return {by, days: Object.keys(by).sort()};
  });
  const vals = Object.values(r.by).map(x=> x.w);
  ck("three different bodyweights across the log", new Set(vals).size === 3, JSON.stringify(vals));
  ck("the oldest session uses the oldest weigh-in", vals.includes(180), JSON.stringify(vals));
  ck("and the newest uses the nearest weigh-in, even though it came after",
     vals.includes(190), JSON.stringify(vals));
  console.log("     " + JSON.stringify(r.by));
}

console.log("3 - ZERO BECOMES YOU, AND A BELT WEIGHT GOES ON TOP");
{
  const r = await p.evaluate(()=>{
    const c = bwFixCandidates(["weighted chest dip"]);
    const zero = c.find(x=> x.from === 0);
    const belt = c.find(x=> x.from === 25);
    const big  = c.find(x=> x.from === 45);
    return {zero, belt, big};
  });
  ck("a set logged as nothing becomes your bodyweight",
     r.zero && r.zero.to === r.zero.w, JSON.stringify(r.zero));
  ck("a 25 lb belt is added to it", r.belt && r.belt.to === r.belt.w + 25, JSON.stringify(r.belt));
  ck("and so is 45", r.big && r.big.to === r.big.w + 45, JSON.stringify(r.big));
}

console.log("4 - IT WRITES NOTHING UNTIL YOU SAY SO, THEN WRITES ALL OF IT");
{
  const r = await p.evaluate(()=>{
    const before = JSON.stringify(S.sessions);
    bwFixCandidates(["weighted chest dip"]);
    const untouched = JSON.stringify(S.sessions) === before;
    const n = bwFixApply(["weighted chest dip"]);
    const dipSets = [];
    S.sessions.forEach(s2=> (s2.entries||[]).forEach(e=>{
      if(/dip/i.test(e.name)) dipSets.push({d:s2.date, bwOn:e.bwOn, w:e.sets.map(x=>x.weight)}); }));
    const pullUntouched = S.sessions.some(s2=> (s2.entries||[]).some(e=>
      /pull/i.test(e.name) && !entryBwOn(e)));
    return {untouched, n, dipSets, pullUntouched};
  });
  ck("previewing changes nothing", r.untouched, String(r.untouched));
  ck("applying changes every selected set", r.n === 12, String(r.n));
  ck("each entry is stamped with the weight used",
     r.dipSets.every(x=> x.bwOn > 0), JSON.stringify(r.dipSets));
  ck("and a movement you did not select is left alone", r.pullUntouched, String(r.pullUntouched));
  console.log("     " + JSON.stringify(r.dipSets));
}

console.log("5 - AND IT CAN BE PUT STRAIGHT BACK");
{
  const r = await p.evaluate(()=>{
    const n = bwFixUndoNow();
    const dip = [];
    S.sessions.forEach(s2=> (s2.entries||[]).forEach(e=>{
      if(/dip/i.test(e.name)) dip.push({bwOn: e.bwOn == null ? null : e.bwOn,
                                        w: e.sets.map(x=> x.weight)}); }));
    return {n, dip, undo: !!S.bwFixUndo};
  });
  ck("every set goes back", r.n === 12, String(r.n));
  ck("including the blanks that were blank", r.dip.some(x=> x.w.join(",") === ",,"),
     JSON.stringify(r.dip.map(x=>x.w)));
  ck("the stamp is removed too", r.dip.every(x=> x.bwOn === null), JSON.stringify(r.dip));
  ck("and the undo is spent", !r.undo, String(r.undo));
}

console.log("6 - FIXING IT ALSO TURNS IT ON FROM NOW ON");
{
  const r = await p.evaluate(()=>{
    S.bwEx = {};
    bwFixApply(["weighted chest dip"]);
    ["weighted chest dip"].forEach(k=> bwRemember(k, true));
    return {remembered: bwRemembered("Weighted Chest Dip"),
            pull: bwRemembered("Pull-Up")};
  });
  ck("the movement is counted from now on too", r.remembered, String(r.remembered));
  ck("and one you did not fix is not", !r.pull, String(r.pull));
}

console.log("7 - A LOG ALREADY COUNTING YOU IS NOT OFFERED AGAIN");
{
  const r = await p.evaluate(()=> bwFixMoves().map(m=> m.name));
  ck("the dips are gone from the list", !r.some(n=> /dip/i.test(n)), JSON.stringify(r));
  ck("the pull-ups are still there", r.some(n=> /pull/i.test(n)), JSON.stringify(r));
}

console.log("8 - WITH NO WEIGH-IN IT REFUSES AND SAYS WHY");
{
  await boot(null);
  const r = await p.evaluate(()=>{
    const n = bwFixApply(["weighted chest dip"]);
    openBwFix();
    const txt = document.querySelector("#modal").innerText;
    hideModal();
    return {n, txt, w: bwFixWeightAt(todayStr())};
  });
  ck("it does not know what you weigh", r.w === null, String(r.w));
  ck("nothing is written", r.n === 0, String(r.n));
  ck("and it says where to fix that", /log one under/i.test(r.txt), r.txt.slice(0,200));
}

console.log("9 - THE SHEET SHOWS THE DAMAGE BEFORE IT DOES IT");
{
  await boot([[90,180],[30,186],[1,190]]);
  const r = await p.evaluate(()=>{
    const before = JSON.stringify(S.sessions);
    openBwFix();
    const txt = document.querySelector("#modal").innerText;
    const picks = document.querySelectorAll("[data-bwpick]").length;
    const go = !!document.querySelector("#bwGo");
    const same = JSON.stringify(S.sessions) === before;
    hideModal();
    return {txt, picks, go, same};
  });
  ck("every affected movement is listed", r.picks === 2, String(r.picks));
  ck("with a preview of what each set becomes", /→|→/.test(r.txt) || /\d+ sets? across/.test(r.txt), r.txt.slice(0,200));
  ck("it says the weight used is the one from the day", /on the day/i.test(r.txt), r.txt.slice(0,260));
  ck("there is a button to do it", r.go, String(r.go));
  ck("and opening it has written nothing", r.same, String(r.same));
}

console.log(errs.length?("PAGE ERRORS: "+errs.join(" | ")):"no page errors");
if(errs.length) bad++;
console.log(bad?("BROKEN: "+bad):"all good");
await b.close();
