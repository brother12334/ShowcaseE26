import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1100}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

/* THE CASE THAT READ AS A BUG: two pressing days earlier in the cycle, one leg day two
   days ago, nothing since. Chest genuinely carries the most credited work; the row has to
   say so in a way that does not read as "you trained chest last". */
const r = await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding');
  const af=document.getElementById('aiFull'); if(af) af.hidden=true;
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.priorTrainingWeeks=100; S.priorAsked=1; S.deload=null;
  S.splitId=DEFAULT_SPLIT; applySplit();
  const DAY=86400e3, now=Date.now();
  S.cycleStart = now - 6*DAY;
  const sets=(n,w,r,rpe)=> Array.from({length:n},()=>({weight:String(w),reps:String(r),rpe:String(rpe||8),done:true}));
  const mk=(dAgo, wid, entries)=>({id:"s"+dAgo, workoutId:wid,
    date:new Date(now-dAgo*DAY).toLocaleDateString("en-CA"),
    startedAt:now-dAgo*DAY-3600e3, finishedAt:now-dAgo*DAY, feel:4, entries});
  S.sessions=[
    mk(5, ROTATION[0], [{name:"Barbell Bench Press", reps:"6-8", sets:sets(4,185,8)},
                        {name:"Incline Dumbbell Press", reps:"8-12", sets:sets(3,70,10)}]),
    mk(4, ROTATION[0], [{name:"Barbell Bench Press", reps:"6-8", sets:sets(4,185,8)},
                        {name:"Cable Fly", reps:"12-15", sets:sets(3,30,13)}]),
    mk(2, ROTATION[2] || ROTATION[0], [{name:"Barbell Back Squat", reps:"6-8", sets:sets(5,225,8)}])
  ];
  save(); TAB="body"; render();
  const A = bodyAnalysis();
  const rows=[...document.querySelectorAll(".nb-lrow")].map(x=>({
    k:x.querySelector(".nb-lrow-k").textContent.trim(),
    v:x.querySelector(".nb-lrow-v").textContent.trim(),
    s:x.querySelector(".nb-lrow-s").textContent.replace(/\s+/g," ").trim()}));
  const top = rows.find(x=> /Most worked/.test(x.k)) || {};
  return {top, mode:A.win.mode, days:A.win.days,
          chestEff:r1(A.wk.chest.eff), chestVol:r1(A.vol.chest),
          quadsEff:r1(A.wk.quads.eff),
          /* While the app is still new every explainer is open, so either the question
             mark or the text itself counts as "there is a way to find out". */
          hasQ: !!document.querySelector('[data-explainon="loadrows"]')
                || /not the muscle you trained last/.test(document.body.innerText),
          foot: ([...document.querySelectorAll(".nb-lfoot")][0]||{}).innerText||""};
});
console.log("     " + r.top.k + ": " + r.top.v);
console.log("     " + r.top.s);
console.log("     window " + r.mode + " · chest eff " + r.chestEff + " (weekly equiv " + r.chestVol + ") · quads eff " + r.quadsEff);

ck("chest really does carry the most credited work", r.chestEff > r.quadsEff,
   r.chestEff + " vs " + r.quadsEff);
ck("the row names it", /Chest/.test(r.top.v), r.top.v);
ck("the figure is the one the sentence claims",
   r.top.s.indexOf(String(r.mode === "cycle" ? r.chestEff : r.chestVol)) === 0,
   r.top.s.slice(0,30) + " | expected " + (r.mode === "cycle" ? r.chestEff : r.chestVol));
ck("it says they are effective sets, not raw ones", /effective set/.test(r.top.s), r.top.s);
ck("it says how many days the work came from", /across \d+ days/.test(r.top.s), r.top.s);
ck("and when the muscle was last trained", /last trained \d+ days ago/.test(r.top.s), r.top.s);
ck("freshness is a separate sentence", /back to fresh|Normally tired|real tiredness/.test(r.top.s), r.top.s);
ck("and there is a way to ask what it means", r.hasQ, String(r.hasQ));

console.log("\nWHAT THE EXPLAINER SAYS");
{
  const t = await p.evaluate(()=>{
    const q = document.querySelector('[data-explainon="loadrows"]');
    if(q) q.click();
    const el=[...document.querySelectorAll(".nb-lfoot")][0];
    return el ? el.innerText.replace(/\s+/g," ").trim() : "";
  });
  ck("it says most worked is not most recent", /not the muscle you trained last/.test(t), t.slice(0,120));
  ck("and explains the shared credit", /pays about half a set/.test(t), t.slice(0,160));
  console.log("     " + t.slice(0, 260));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
