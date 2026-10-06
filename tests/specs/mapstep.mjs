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
  S.priorAsked=Date.now(); S.priorTrainingWeeks=104;
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
/* THE STEPPER IS A ROW OF FIVE SEGMENTS NOW. Everything this spec was written to protect
   is unchanged -- the views are named in plain English, the sentence travels with the
   selected one, the legend sits below, the figures are untouched, and the selected muscle
   reads above them. What is gone is the stepper's own machinery: one at a time, arrows,
   dots, and the wrap-around at each end. Five visible segments have no ends to wrap. */
const st = ()=> p.evaluate(()=>{
  const seg = document.querySelector('.nb-metric');
  const on  = seg && seg.querySelector('[data-metricpick].on');
  return {adv: !!BODY_OPEN.nbadv, metric: BODY_METRIC,
    has: !!seg,
    name: on ? on.innerText.trim() : "",
    full: on ? metricLabel(on.dataset.metricpick, bodyAnalysis().win) : "",
    say: (document.querySelector('.nb-map .nb-map-say')||{}).innerText || "",
    segs: seg ? seg.querySelectorAll('[data-metricpick]').length : 0,
    lit: seg ? [...seg.querySelectorAll('[data-metricpick]')].findIndex(i=>i.classList.contains('on')) : -1,
    oldrow: !!document.querySelector('.metric-seg, .metric-scroll, .metric-step'),
    legend: [...document.querySelectorAll('.bm-legend .bm-lg')].map(x=>x.innerText).join(" | "),
    figs: document.querySelectorAll('.bm-fig svg').length,
    say0: (document.querySelector('.nb-map-say')||{}).innerText || ""};
});
/* Pick a view by name, which is what the control now is. */
const pick = id=> p.evaluate(x=>{
  const b2 = document.querySelector('[data-metricpick="' + x + '"]');
  if(b2) b2.click();
}, id);

console.log("1 - THE VIEWS ARE NOT AN ADVANCED FEATURE");
let d = await st();
ck("the picker is on the screen, with Advanced shut", d.has && !d.adv, JSON.stringify({has:d.has, adv:d.adv}));
ck("the old scrolling row is gone, and so is the stepper", !d.oldrow, "");
ck("all five are there", d.segs===5, String(d.segs));
ck("one of them is lit", d.lit===0, String(d.lit));
ck("two figures", d.figs===2, String(d.figs));
ck("the legend bar is there", /fresh/.test(d.legend) && /getting tired/.test(d.legend), d.legend);

console.log("2 - THE SENTENCE TRAVELS WITH THE VIEW");
ck("named in plain English", d.full==="Tiredness", d.full);
ck("its sentence is attached", /How tired each muscle/.test(d.say), d.say);
ck("legend still below", /fresh/.test(d.legend), d.legend);
ck("figures untouched", d.figs===2, String(d.figs));

console.log("3 - EVERY ONE OF THEM IS ONE TAP AWAY");
const names=[];
for(const m of ["fatigue","volume","recovery","growth","injury"]){
  await pick(m);
  const cur = await st();
  names.push(cur.full + " / " + cur.lit);
}
ck("all five, each lighting its own segment",
   names.join(" | ")==="Tiredness / 0 | Sets this cycle / 1 | Ready to go / 2 | Progress / 3 | Overdoing it / 4",
   names.join(" | "));
console.log("     " + names.join(" | "));

console.log("4 - AND GOING BACK IS A TAP, NOT A WALK");
await pick("fatigue");
d = await st(); ck("straight back to the first", d.full==="Tiredness", d.full);
await pick("injury");
d = await st(); ck("and straight to the last", d.full==="Overdoing it", d.full);
await pick("fatigue");
d = await st(); ck("with no wrap-around to think about", d.full==="Tiredness", d.full);

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
  await p.evaluate(()=>{ BODY_FOCUS=null; BODY_EXPAND=false; render(); });
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
