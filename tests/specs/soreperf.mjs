import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage();
p.on('pageerror',e=>console.log("PAGEERROR "+e.message));
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:true,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
const r = await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.priorAsked=true; S.splitId=DEFAULT_SPLIT; applySplit();
  // 46 sessions, the size of a real log, 7 exercises x 4 sets
  const names = ["Barbell Bench Press","Incline Dumbbell Press","Cable Fly","Lat Pulldown",
                 "Barbell Row","Leg Press","Seated Leg Curl"];
  S.sessions = Array.from({length:46}, (_, i)=>({
    id:"s"+i, workoutId: ROTATION[i % ROTATION.length],
    date:new Date(Date.now()-(46-i)*86400e3).toLocaleDateString("en-CA"),
    startedAt:Date.now()-(46-i)*86400e3, finishedAt:Date.now()-(46-i)*86400e3+3600e3, feel:4,
    entries: names.map(n=>({name:n, reps:"8-12",
      sets:Array.from({length:4},()=>({weight:"135",reps:"10",rpe:"8",done:true}))}))
  }));
  save();
  const t = (fn, n)=>{ const a=performance.now(); for(let i=0;i<n;i++) fn(); return Math.round((performance.now()-a)/n*10)/10; };
  const out = {};
  // warm every cache in the app first, so the A/B is about the code and not the order
  for(let i=0;i<4;i++){ TAB="today"; render(); TAB="history"; render(); TAB="body"; render(); }
  const realDue = window.domsDueToday, realSore = window.soreDueHTML;
  const off = ()=>{ window.domsDueToday = ()=> []; window.soreDueHTML = ()=> ""; };
  const on  = ()=>{ window.domsDueToday = realDue; window.soreDueHTML = realSore; };
  out.today_with_1    = t(()=>{ TAB="today"; render(); }, 5);
  off(); out.today_without = t(()=>{ TAB="today"; render(); }, 5);
  on();  out.today_with_2  = t(()=>{ TAB="today"; render(); }, 5);
  out.domsDueToday    = t(()=> domsDueToday(), 20);
  out.soreDueHTML     = t(()=> soreDueHTML(), 20);
  out.exposuresCold   = (()=>{ DOMS_EXP = null; DOMS_EXP_SIG = ""; const a=performance.now();
                               domsExposures(); return Math.round((performance.now()-a)*10)/10; })();
  out.plannedReminders = t(()=> plannedReminders(), 10);
  out.sessions = S.sessions.length;
  return out;
});
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
console.log("1 - A FULL LOG STILL DRAWS AT A TAP'S SPEED");
/* Budgets, not benchmarks. These are generous multiples of what the code does today, on a
   container whose CPU is nobody's phone — they exist to catch the shape of mistake that
   put an O(muscles x sessions x sets) walk inside a view function, which cost four times
   the entire Today tab and read on a phone as taps doing nothing. */
ck("what the rest-day check costs a render is nothing", r.domsDueToday <= 1, r.domsDueToday + "ms");
ck("and drawing its card likewise", r.soreDueHTML <= 1, r.soreDueHTML + "ms");
ck("one cold walk of the whole log is cheap", r.exposuresCold <= 40, r.exposuresCold + "ms");
ck("the soreness code adds nothing measurable to a Today render",
   r.today_with_2 <= r.today_without + 20, r.today_with_2 + "ms vs " + r.today_without + "ms");
ck("and the reminder set is still cheap to compute", r.plannedReminders <= 60, r.plannedReminders + "ms");
console.log("     " + JSON.stringify(r));
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
