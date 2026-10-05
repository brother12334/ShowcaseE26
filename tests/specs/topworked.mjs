import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});

// hoursAgo shifts the WHOLE log back, so only fatigue decay changes between runs.
const probe = (hoursAgo)=> p.evaluate((hrs)=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding');
  try{AI_IMP=null}catch(e){}
  const af=document.getElementById('aiFull'); if(af) af.hidden=true;
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.flags=[]; S.deload=null;
  S.splitId=DEFAULT_SPLIT; applySplit();
  const wid=ROTATION[0];
  const mk=(dAgo, entries)=>({id:"s"+dAgo, workoutId:wid,
    date:new Date(Date.now()-dAgo*86400e3).toLocaleDateString("en-CA"),
    startedAt:Date.now()-dAgo*86400e3-3600e3, finishedAt:Date.now()-dAgo*86400e3, feel:4,
    entries});
  const sets=(n,w,r)=> Array.from({length:n},()=>({weight:String(w), reps:String(r), rpe:"8", done:true}));
  // Lats carry by far the most volume; biceps a little, worked most recently.
  S.sessions=[
    mk(6+hrs/24, [{name:"Lat Pulldown", reps:"8-12", sets:sets(6,100,10)},
                  {name:"Barbell Row",  reps:"8-12", sets:sets(6,100,10)}]),
    mk(4+hrs/24, [{name:"Lat Pulldown", reps:"8-12", sets:sets(6,100,10)}]),
    mk(0+hrs/24, [{name:"Incline Dumbbell Curl", reps:"8-12", sets:sets(3,30,10)}])
  ];
  S.cycleStart = Date.now()-7*86400e3;
  save(); TAB="body"; render();
  const rows=[...document.querySelectorAll(".nb-lrow")].map(x=>x.innerText);
  const A = bodyAnalysis();
  const byFat = MKEYS.slice().sort((a,b)=>A.fat[b]-A.fat[a])[0];
  const byVol = MKEYS.slice().sort((a,b)=>(A.vol[b]||0)-(A.vol[a]||0))[0];
  return {row: rows.find(x=>/Most worked muscle/.test(x)) || "",
          byFat: gName(byFat), byVol: gName(byVol), vol: A.vol[byVol]};
}, hoursAgo);

let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

console.log("1 - IT REPORTS VOLUME, NOT WHAT IS SOREST RIGHT NOW");
const r0 = await probe(0);
ck("the sorest muscle is not the most worked one", r0.byFat !== r0.byVol,
   "fat="+r0.byFat+" vol="+r0.byVol);
ck("the row names the most WORKED muscle", r0.row.includes(r0.byVol), r0.row);
ck("and not the sorest", !r0.row.includes(r0.byFat), r0.row);

console.log("2 - AND IT SAYS HOW MUCH WORK");
// "17.1 effective sets" — a tenth, and the word the app uses for what it counts
{
  const shown = String(Math.round(r0.vol*10)/10).replace(".","\\.");
  ck("the set count is shown", new RegExp(shown+" effective sets").test(r0.row),
     r0.row+" | expected "+shown);
}
ck("named against its window", /this (week|cycle)/.test(r0.row), r0.row);

console.log("3 - IT DOES NOT MOVE BETWEEN LOOKS AT THE SAME LOG");
{
  const a = await probe(0), c = await probe(10), d = await probe(20);
  ck("same answer 10 h later", a.row===c.row, a.row+" ||| "+c.row);
  ck("same answer 20 h later", a.row===d.row, a.row+" ||| "+d.row);
  ck("and never drifts onto the sorest muscle",
     [a,c,d].every(x=> x.row.includes(x.byVol) && !x.row.includes(x.byFat)),
     [a,c,d].map(x=>x.byFat+"/"+x.byVol).join(" "));
}

console.log("4 - NOTHING LOGGED SAYS SO");
{
  const out = await p.evaluate(()=>{
    S.sessions=[]; S.cycleStart=Date.now()-7*86400e3; save(); render();
    const A=bodyAnalysis(); return {vol: Math.max(...MKEYS.map(m=>A.vol[m]||0))};
  });
  ck("no volume anywhere", out.vol===0, JSON.stringify(out));
}

console.log(errs.length? "  BROKEN page errors :: "+errs.join(" | ") : "  ok  no page errors");
if(errs.length) bad++;
console.log(bad? ("  "+bad+" broken") : "  all good");
await b.close();
