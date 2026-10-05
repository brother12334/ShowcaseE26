import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1000}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} document.body.classList.remove('ai-open','onboarding'); hideModal();
  const af=document.getElementById('aiFull'); if(af) af.hidden=true;
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.priorTrainingWeeks=100; S.priorAsked=1;
  S.prefs=Object.assign({}, S.prefs, {tapeUnit:"cm"});
  S.splitId=DEFAULT_SPLIT; applySplit();
  S.sessions=[{id:"s1", workoutId:ROTATION[0], date:new Date(Date.now()-86400e3).toLocaleDateString("en-CA"),
    startedAt:Date.now()-86400e3, finishedAt:Date.now()-86400e3+3600e3, feel:4,
    entries:[{name:"Barbell Bench Press", sets:[{weight:135,reps:8,rpe:8}]}]}];
  save();
});
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

console.log("1 - THE LIMBS ARE ASKED FOR TWICE, THE REST ONCE");
{
  const r = await p.evaluate(()=>{
    const pairs = MEAS_FIELDS.filter(f=> f.pair).map(f=> f.k);
    const single = MEAS_FIELDS.filter(f=> !f.pair).map(f=> f.k);
    return {pairs, single, legacy: MEAS_LEGACY.map(f=>f.k)};
  });
  console.log("     sided : " + r.pairs.join(", "));
  console.log("     single: " + r.single.join(", "));
  ["arm_l","arm_r","forearm_l","forearm_r","thigh_l","thigh_r","calf_l","calf_r"]
    .forEach(k=> ck(k + " is a field", r.pairs.includes(k), r.pairs.join(",")));
  ck("neck, chest, waist and hips stay single",
     ["neck","chest","waist","hips","shoulders"].every(k=> r.single.includes(k)), r.single.join(","));
  ck("and the old unsided keys are still known", r.legacy.join(",")==="arm,forearm,thigh,calf", r.legacy.join(","));
}

console.log("2 - THE SHEET SHOWS A BOX PER SIDE AND SAVES THEM SEPARATELY");
{
  const r = await p.evaluate(()=>{
    S.bodyLog = {}; save();
    openBodyLog(todayStr());
    const m = document.getElementById("modal");
    const labels = [...m.querySelectorAll(".bl-grid label")].map(x=> x.textContent.trim());
    const setV = (id,v)=>{ const el=m.querySelector("#"+id); el.value=v; };
    setV("blW","180"); setV("bl_arm_l","39.5"); setV("bl_arm_r","41");
    m.querySelector("#blSave").click();
    const rec = bodyLog()[todayStr()] || {};
    return {labels, rec};
  });
  ck("both arms have their own box",
     r.labels.some(x=>/Upper arm, left/.test(x)) && r.labels.some(x=>/Upper arm, right/.test(x)),
     r.labels.join(" | "));
  ck("and no unsided arm box is offered", !r.labels.some(x=>/^Upper arm \(/.test(x)), r.labels.join(" | "));
  ck("the two sides are stored apart", r.rec.arm_l===39.5 && r.rec.arm_r===41, JSON.stringify(r.rec));
}

console.log("3 - THE BODY TAB LISTS EACH SIDE AND NAMES THE GAP");
{
  const r = await p.evaluate(()=>{
    TAB="body"; render();
    const h = document.body.innerText;
    return {left: /Upper arm, left/.test(h), right: /Upper arm, right/.test(h),
            gap: (h.match(/Your upper arms[^]*?right\./)||[""])[0].replace(/\s+/g," ").trim()};
  });
  ck("left is listed", r.left, String(r.left));
  ck("right is listed", r.right, String(r.right));
  ck("and the difference is spelled out", /apart/.test(r.gap), r.gap || "(nothing)");
  console.log("     " + r.gap);
}

console.log("4 - AN EVEN PAIR IS NOT WORTH A SENTENCE");
{
  const r = await p.evaluate(()=>{
    const d = todayStr();
    bodyLog()[d] = {w:180, arm_l:40.5, arm_r:41};   // about 1%, inside the tape's own error
    save(); TAB="body"; render();
    return {gap: /apart/.test(document.body.innerText)};
  });
  ck("nothing is said about a 1% difference", !r.gap, String(r.gap));
}

console.log("5 - MEASUREMENTS TAKEN BEFORE SIDES ARE KEPT, NOT REWRITTEN");
{
  const r = await p.evaluate(()=>{
    S.bodyLog = {}; save();
    const old = new Date(Date.now()-30*86400e3).toLocaleDateString("en-CA");
    bodyLog()[old] = {w:178, arm:40, thigh:60};
    save();
    openBodyLog(old);
    const m = document.getElementById("modal");
    const labels = [...m.querySelectorAll(".bl-grid label")].map(x=> x.textContent.trim());
    const val = m.querySelector("#bl_arm").value;
    // save it untouched and check the number survives exactly
    m.querySelector("#blSave").click();
    const rec = bodyLog()[old] || {};
    TAB="body"; render();
    return {labels, val, rec, listed: /Upper arm \(before sides\)/.test(document.body.innerText)};
  });
  ck("the old entry still has its box", r.labels.some(x=>/Upper arm \(before sides\)/.test(x)),
     r.labels.join(" | "));
  ck("holding the number that was logged", r.val==="40", r.val);
  ck("and saving does not move it to a side", r.rec.arm===40 && r.rec.arm_l==null && r.rec.arm_r==null,
     JSON.stringify(r.rec));
  ck("the history still shows it", r.listed, String(r.listed));
}

console.log("6 - A UNIT CHANGE CONVERTS BOTH SIDES");
{
  const r = await p.evaluate(()=>{
    S.bodyLog = {}; save();
    const d = todayStr();
    bodyLog()[d] = {w:180, arm_l:40, arm_r:42, arm:38};
    S.prefs.tapeUnit="cm"; save();
    const pl = tapeConvertPlan("in");
    const n = tapeConvertApply(pl);
    const rec = bodyLog()[d];
    return {n, rec};
  });
  ck("every measurement converts, sided and legacy alike", r.n===3, String(r.n));
  ck("left", Math.abs(r.rec.arm_l - 15.7) < 0.2, String(r.rec.arm_l));
  ck("right", Math.abs(r.rec.arm_r - 16.5) < 0.2, String(r.rec.arm_r));
  ck("and the old unsided one too", Math.abs(r.rec.arm - 15.0) < 0.2, String(r.rec.arm));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
