import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1000}, deviceScaleFactor:2});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding');
  try{AI_IMP=null}catch(e){}
  const af=document.getElementById('aiFull'); if(af) af.hidden=true;
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr();
  S.splitId=DEFAULT_SPLIT; applySplit();
  const wid=ROTATION[0];
  const mk=(d,ex)=>({id:"s"+d, workoutId:wid,
    date:new Date(Date.now()-d*86400e3).toLocaleDateString("en-CA"),
    startedAt:Date.now()-d*86400e3-3600e3, finishedAt:Date.now()-d*86400e3, feel:4,
    entries:ex.map(n=>({name:n, reps:"8-12", sets:Array.from({length:4},()=>
      ({weight:"100", reps:"10", rpe:"8", done:true}))}))});
  S.sessions=[mk(1,["Barbell Bench Press","Lat Pulldown"]), mk(3,["Back Squat","Romanian Deadlift"])];
  S.cycleStart=Date.now()-7*86400e3;
  save(); TAB="body"; render();
});

let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
const st = ()=> p.evaluate(()=>{
  const step=document.querySelector('.metric-step');
  return {adv: !!BODY_OPEN.nbadv, metric: BODY_METRIC,
    has: !!step, name: step? step.querySelector('b').innerText : "",
    say: step? step.querySelector('.ms-mid>span').innerText : "",
    dots: step? [...step.querySelectorAll('.ms-dots i')].length : 0,
    on: step? [...step.querySelectorAll('.ms-dots i')].findIndex(i=>i.classList.contains('on')) : -1,
    oldrow: !!document.querySelector('.metric-seg, .metric-scroll'),
    legend: [...document.querySelectorAll('.bm-legend .bm-lg')].map(x=>x.innerText).join(" | "),
    figs: document.querySelectorAll('.bm-fig svg').length,
    say0: (document.querySelector('.nb-map-say')||{}).innerText || ""};
});

console.log("1 - SIMPLE VIEW IS UNCHANGED");
let d = await st();
ck("no stepper", !d.has, "");
ck("no old row either", !d.oldrow, "");
ck("still the plain sentence", /Green is rested/.test(d.say0), d.say0);
ck("two figures", d.figs===2, String(d.figs));
ck("the legend bar is there", /fresh/.test(d.legend) && /getting tired/.test(d.legend), d.legend);

console.log("2 - ADVANCED SHOWS ONE VIEW AT A TIME");
await p.evaluate(()=>{ BODY_OPEN.nbadv = true; render(); });
d = await st();
ck("the stepper is there", d.has, "");
ck("the old scrolling row is gone", !d.oldrow, "");
ck("named in plain English", d.name==="Tiredness", d.name);
ck("its sentence is attached", /How tired each muscle/.test(d.say), d.say);
ck("five dots", d.dots===5, String(d.dots));
ck("first one lit", d.on===0, String(d.on));
ck("legend still below", /fresh/.test(d.legend), d.legend);
ck("figures untouched", d.figs===2, String(d.figs));

console.log("3 - THE ARROWS WALK THROUGH THEM");
const names=[];
for(let i=0;i<5;i++){
  const cur = await st(); names.push(cur.name + " / " + cur.on);
  await p.click('[data-metricstep="1"]');
}
ck("all five, in order, dot following",
   names.join(" | ")==="Tiredness / 0 | Sets this cycle / 1 | Ready to go / 2 | Progress / 3 | Overdoing it / 4",
   names.join(" | "));
console.log("     " + names.join(" | "));

console.log("4 - AND IT WRAPS BOTH WAYS");
d = await st(); ck("back to the first after five", d.name==="Tiredness", d.name);
await p.click('[data-metricstep="-1"]');
d = await st(); ck("left from the first lands on the last", d.name==="Overdoing it", d.name);
await p.click('[data-metricstep="1"]');
d = await st(); ck("and right returns", d.name==="Tiredness", d.name);

console.log("5 - NO JARGON LEFT IN THE NAMES");
const labels = await p.evaluate(()=> METRICS.map(m=> metricLabel(m.id, bodyAnalysis().win)));
ck("no Fatigue/Volume/Injury Risk", !labels.some(x=> /^(Fatigue|Volume|Injury Risk|Cycle Volume|Weekly Volume)$/.test(x)),
   JSON.stringify(labels));
console.log("     " + labels.join(" | "));

console.log("6 - THE SELECTION READS ABOVE THE FIGURES");
{
  const sel = async ()=> p.evaluate(()=>{
    const card=document.querySelector('.nb-map');
    const s=card.querySelector('.ms-sel'), figs=card.querySelector('.bm-figs'),
          leg=card.querySelector('.bm-legend');
    return {has:!!s, txt:s?s.innerText.replace(/\n/g," "):"",
      aboveFigs: !!(s && figs && s.compareDocumentPosition(figs) & Node.DOCUMENT_POSITION_FOLLOWING),
      belowLegend: [...card.children].some(c=> leg && (leg.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING)
        && c.className && /ms-sel|bm-drill|nb-pick|bm-tap/.test(c.className)),
      words: card.innerText, opens: !!(s && s.querySelector('[data-gdetail]'))};
  });
  let r = await sel();
  ck("nothing shown until you tap", !r.has, r.txt);
  await p.evaluate(()=>{ BODY_FOCUS="lats"; BODY_EXPAND=false; render(); });
  r = await sel();
  ck("the block appears", r.has, "");
  ck("it sits above the figures", r.aboveFigs, "");
  ck("and nothing was added below the legend", !r.belowLegend, "");
  ck("it names the muscle and its numbers", /Lats/.test(r.txt) && /sets/.test(r.txt), r.txt);
  ck("one target, which opens that muscle", r.opens, "");
  ck("no Analyse", !/Analyse/i.test(r.words), "");
  ck("no Break it down", !/break it down/i.test(r.words), "");
  console.log("     " + r.txt);
}

console.log("7 - THE PARTS VIEW STILL HAS A WAY BACK");
{
  const r = await p.evaluate(()=>{
    BODY_FOCUS="quads"; BODY_EXPAND=true; render();
    const card=document.querySelector('.nb-map');
    return {heads: card.querySelectorAll('.bm-head').length,
            back: !!card.querySelector('#bmBack'),
            txt: (card.querySelector('.ms-sel')||{}).innerText || ""};
  });
  ck("the parts are listed", r.heads > 1, String(r.heads));
  ck("with a way back", r.back, "");
  ck("and it says what they are", /parts/.test(r.txt.replace(/\n/g," ")), r.txt);
}

console.log(errs.length? "  BROKEN page errors :: "+errs.join(" | ") : "  ok  no page errors");
if(errs.length) bad++;
console.log(bad? ("  "+bad+" broken") : "  all good");
await b.close();
