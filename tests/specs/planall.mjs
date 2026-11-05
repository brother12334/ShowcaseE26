import { chromium, APP_URL } from './_e26.mjs';
/* "IN THE PROGRAM TAB WHERE YOU CAN SEE WHAT CHANGED, MAKE IT SHOW ALL OF THE CHANGES IT
   HAS DONE, EVEN BEFORE THE FEATURE WAS ADDED, ALSO LET YOU EXPORT THE CHANGES IT MADE
   AND IT SHOWS DATES."

   Three things. The screen filtered every load change out, which is a good default and
   was the only option. The record itself only goes back to the day it was written, and
   nothing before that was kept anywhere — but the sessions remember, and a plan change
   leaves fingerprints in them. And none of it could leave the phone. */
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
const ev=(fn,a)=>p.evaluate(fn,a);

await ev(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false});
  S.splitId=DEFAULT_SPLIT; applySplit();
  const wid=ROTATION[0], d=86400000, now=Date.now();
  /* Four sessions of one day, months before anything was logged: a load that moved, a
     rep range that changed, a movement that arrives and one that stops. */
  const mk=(ago, ents)=>({id:"s"+ago, workoutId:wid, date: dayStr(now-ago*d),
    startedAt: now-ago*d, finishedAt: now-ago*d+3600e3, entries: ents});
  const set=(w,r)=>({weight:String(w), reps:String(r), done:true});
  S.sessions=[
    mk(60, [{name:"Bench Press", reps:"8-12", sets:[set(135,10),set(135,9)]},
            {name:"Cable Fly",   reps:"10-15", sets:[set(30,12)]}]),
    mk(50, [{name:"Bench Press", reps:"8-12", sets:[set(145,10),set(145,9)]},
            {name:"Cable Fly",   reps:"10-15", sets:[set(30,12)]}]),
    mk(40, [{name:"Bench Press", reps:"6-10", sets:[set(145,8),set(145,8),set(145,7)]},
            {name:"Lat Pulldown",reps:"8-12", sets:[set(100,10)]}]),
    mk(30, [{name:"Bench Press", reps:"6-10", sets:[set(155,8)]},
            {name:"Lat Pulldown",reps:"8-12", sets:[set(100,10)]}])
  ];
  /* And one real recorded change, three days ago. */
  S.planLog=[{at: now-3*d, date: dayStr(now-3*d), day: wid, kind:"edit", name:"Bench Press",
              changes:[{key:"sets", field:"sets", from:"3", to:"4"}], note:"Chest was under its weekly minimum"}];
  save();
});

console.log("1 - THE RECORD GOES BACK FURTHER THAN THE RECORD");
{
  const r = await ev(()=>{
    const d = planLogDerived();
    const byDate = d.every(x=>{
      const sess = S.sessions.find(ss=> ss.startedAt === x.at);
      return !!sess && sess.date === x.date;
    });
    return {n: d.length, byDate, kinds: [...new Set(d.map(x=>x.kind))].sort(),
            all: d.map(x=> x.date + " " + x.name + ": " + x.changes.join("; ")),
            derived: d.every(x=> x.derived === true)};
  });
  console.log("   ", JSON.stringify(r.all, null, 1));
  ck("changes from before the log are read back", r.n >= 4, String(r.n));
  ck("the load that moved is one of them",
     r.all.some(x=> /Bench Press: top set 135 lb . 145 lb/.test(x)), JSON.stringify(r.all));
  ck("so is the rep range", r.all.some(x=> /reps 8-12 . 6-10/.test(x)), JSON.stringify(r.all));
  /* NOT the number of sets: rows are added and dropped while you train, so a day you
     stopped after one set is not the plan losing two. */
  ck("but not the sets logged, which is a fact about the session",
     !r.all.some(x=> /sets \d+ . \d+/.test(x)), JSON.stringify(r.all));
  ck("so is the movement that arrived",
     r.all.some(x=> /Lat Pulldown: Appears/.test(x)), JSON.stringify(r.all));
  ck("and the one that stopped", r.all.some(x=> /Cable Fly: Stopped/.test(x)), JSON.stringify(r.all));
  ck("every one of them says it was read back", r.derived, String(r.derived));
  ck("and each is dated to the session it was read from, not to today",
     r.byDate, String(r.byDate));
}

console.log("2 - AND IT DOES NOT REPORT THE SAME WEEK TWICE");
/* The derivation stops where the real log starts, or every change would appear once as
   a decision and once as its own shadow. */
{
  const r = await ev(()=>{
    const first = Math.min.apply(null, S.planLog.map(c=> c.at));
    return {after: planLogDerived().filter(x=> x.at >= first).length,
            logged: S.planLog.length};
  });
  console.log("   ", JSON.stringify(r));
  ck("nothing is derived over the period the log covers", r.after === 0, String(r.after));
}

console.log("3 - THE SCREEN SHOWS EVERYTHING, AND CAN STILL NARROW");
{
  const r = await ev(()=>{
    PLAN_HIST_ALL = true;
    const all = planHistoryRows(true).length, allW = planHistoryRows(true).filter(c=> c.kind==="weight").length;
    const big = planHistoryRows(false).length, bigW = planHistoryRows(false).filter(c=> c.kind==="weight").length;
    return {all, allW, big, bigW};
  });
  console.log("   ", JSON.stringify(r));
  ck("everything includes the load changes", r.allW > 0, String(r.allW));
  ck("structural-only still drops them", r.bigW === 0, String(r.bigW));
  ck("and it is a narrower list, not a different one", r.big < r.all, r.big + " of " + r.all);
}

console.log("4 - THE SHEET OPENS ON EVERYTHING, WITH BOTH VIEWS AND THE EXPORT");
{
  const r = await ev(()=>{
    TAB="program"; render(); openPlanHistory();
    const m = document.getElementById('modal');
    return {seg: m.querySelectorAll('[data-phall]').length,
            on: (m.querySelector('[data-phall="1"]')||{}).className,
            rows: m.querySelectorAll('.ph-row').length,
            srcTags: m.querySelectorAll('.ph-src').length,
            copy: !!m.querySelector('#phCopy'), file: !!m.querySelector('#phFile'),
            txt: m.innerText.replace(/\s+/g," ").slice(0, 120)};
  });
  console.log("   ", JSON.stringify(r));
  ck("both views are offered", r.seg === 2, String(r.seg));
  ck("and it opens on everything", /on/.test(r.on || ""), String(r.on));
  ck("the rows are drawn", r.rows >= 5, String(r.rows));
  ck("the read-back ones are marked as such", r.srcTags >= 4, String(r.srcTags));
  ck("and there is a way to get it off the phone", r.copy && r.file,
     JSON.stringify({copy: r.copy, file: r.file}));
}

console.log("5 - THE EXPORT CARRIES THE DATES, AND EVERYTHING ELSE");
{
  const r = await ev(()=>{
    const csv = planHistoryCSV(true);
    const lines = csv.trim().split("\n");
    const dates = lines.slice(1).map(l=> l.slice(0, 10));
    return {head: lines[0], n: lines.length - 1, csv, dates,
            spread: new Set(dates).size,
            dated: lines.slice(1).every(l=> /^\d{4}-\d{2}-\d{2},/.test(l))};
  });
  console.log("   ", r.head);
  console.log("   ", r.csv.trim().split("\n").slice(1,4).join("\n    "));
  ck("it is a dated row per change", r.dated && r.n >= 5, JSON.stringify({n: r.n, dated: r.dated}));
  ck("and the dates are the real ones, spread over the history",
     r.spread >= 4, r.spread + " distinct dates in " + JSON.stringify(r.dates));
  ck("the date is the first column", /^date,/.test(r.head), r.head);
  ck("it says which day of the rotation", /,day,/.test(r.head), r.head);
  ck("what changed", /,change,/.test(r.head), r.head);
  ck("why, where a reason was recorded",
     /,why,/.test(r.head) && /Chest was under its weekly minimum/.test(r.csv), r.head);
  ck("and where the row came from",
     /,source,/.test(r.head) && /read back from your sessions/.test(r.csv), r.head);
}

console.log("6 - A COMMA IN A REASON DOES NOT BREAK THE FILE");
{
  const r = await ev(()=>{
    S.planLog.push({at: Date.now(), date: todayStr(), day: ROTATION[0], kind:"edit",
      name:"Bench Press", changes:[{key:"reps", field:"reps", from:"6-10", to:"8-12"}],
      note:'Quads, hamstrings and "glutes" were all short'});
    save();
    const csv = planHistoryCSV(true);
    const line = csv.split("\n").find(l=> /glutes/.test(l));
    return {line, cols: line ? line.split(",").length : 0, quoted: /""glutes""/.test(line || "")};
  });
  console.log("   ", r.line);
  ck("the reason is quoted rather than splitting the row", r.quoted, r.line);
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
