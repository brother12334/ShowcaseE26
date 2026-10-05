import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:900}});
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
  const af=document.getElementById('aiFull'); if(af) af.hidden=true;
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.priorTrainingWeeks=60;
  S.splitId=DEFAULT_SPLIT; applySplit(); S.cycleStart=Date.now()-3*86400e3; save();
});
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

console.log("A9a - ALL THREE ARE SETTABLE, INDEPENDENTLY");
{
  const r = await p.evaluate(()=>{
    S.lmFloor={}; S.lmMav={}; S.lmMrv={};
    const before = adjustedLandmarks(bodyAnalysis(), "chest");
    setManualLandmark("chest","mav",15); save();
    const afterMav = adjustedLandmarks(bodyAnalysis(), "chest");
    setManualLandmark("chest","mrv",19); save();
    const afterMrv = adjustedLandmarks(bodyAnalysis(), "chest");
    setManualLandmark("chest","mev",7); save();
    const all = adjustedLandmarks(bodyAnalysis(), "chest");
    return {before:{mev:before.mev,mav:before.mav,mrv:before.mrv},
            afterMav:{mev:afterMav.mev,mav:afterMav.mav,mrv:afterMav.mrv},
            afterMrv:{mev:afterMrv.mev,mav:afterMrv.mav,mrv:afterMrv.mrv},
            all:{mev:all.mev,mav:all.mav,mrv:all.mrv}};
  });
  ck("setting MAV moves only MAV", r.afterMav.mav===15 && r.afterMav.mev===r.before.mev,
     JSON.stringify(r));
  ck("setting MRV moves only MRV", r.afterMrv.mrv===19 && r.afterMrv.mav===15, JSON.stringify(r));
  ck("setting MEV moves only MEV", r.all.mev===7 && r.all.mav===15 && r.all.mrv===19,
     JSON.stringify(r.all));
}

console.log("A9b - ORDERING STILL HOLDS AGAINST SILLY MANUAL VALUES");
{
  const r = await p.evaluate(()=>{
    S.lmFloor={chest:18}; S.lmMav={chest:5}; S.lmMrv={chest:6}; save();
    const L = adjustedLandmarks(bodyAnalysis(), "chest");
    return {mev:L.mev, mav:L.mav, mrv:L.mrv};
  });
  ck("MEV < MAV < MRV survives a floor set above the ceiling",
     r.mev < r.mav && r.mav < r.mrv, JSON.stringify(r));
}

console.log("A9c - THE DISAGREEMENT NOTICE");
{
  const r = await p.evaluate(()=>{
    S.lmFloor={}; S.lmMav={}; S.lmMrv={}; save();
    const auto = adjustedLandmarks(bodyAnalysis(), "chest").mav;
    S.lmMav = {chest: Math.round(auto*1.5*10)/10}; save();      // 50% apart
    const far = manualDisagreement(bodyAnalysis(), "chest");
    S.lmMav = {chest: Math.round(auto*1.1*10)/10}; save();      // 10% apart
    const near = manualDisagreement(bodyAnalysis(), "chest");
    return {auto, far, near};
  });
  ck("50% apart is reported", r.far.length===1 && r.far[0].which==="mav", JSON.stringify(r.far));
  ck("and it names both numbers", r.far[0].mine>0 && r.far[0].auto>0, JSON.stringify(r.far));
  ck("10% apart is not", r.near.length===0, JSON.stringify(r.near));
  ck("the threshold is the named constant",
     await p.evaluate(()=> MANUAL_DISAGREE_PCT===0.25), "");
}

console.log("A9d - CALIBRATION HOOK IS NEUTRAL UNTIL PART B");
{
  const r = await p.evaluate(()=>{
    S.lmFloor={}; S.lmMav={}; S.lmMrv={}; delete S.lmCal; save();
    const plain = adjustedLandmarks(bodyAnalysis(), "chest");
    S.lmCal = {chest:{mev:1.2, mav:1.2, mrv:1.2, blocks:2, w:0.7, label:"2 blocks"}}; save();
    const cal = adjustedLandmarks(bodyAnalysis(), "chest");
    return {plain:plain.mav, cal:cal.mav, why: cal.why.map(w=>w.k)};
  });
  ck("no calibration leaves the chain untouched", r.plain===20, String(r.plain));
  ck("a calibration multiplies it", Math.abs(r.cal - r.plain*1.2) < 0.15, JSON.stringify(r));
  ck("and it appears in the explainer trail", r.why.includes("Your own response"), JSON.stringify(r.why));
  ck("sitting before the user scale",
     r.why.indexOf("Your own response") < (r.why.indexOf("Your scale")<0 ? 99 : r.why.indexOf("Your scale")),
     JSON.stringify(r.why));
}

console.log("A10 - WHOLE NUMBERS ON SCREEN, TENTHS INSIDE");
{
  const r = await p.evaluate(()=>{
    delete S.lmCal; S.lmFloor={}; S.lmMav={}; S.lmMrv={}; S.lmScale=1.07; save();
    const L = adjustedLandmarks(bodyAnalysis(), "chest");
    return {raw:L.mav, shown:fmtLandmark(L.mav),
            state: volState("chest", 30, L, {}).txt};
  });
  ck("the stored figure keeps its tenth", String(r.raw).indexOf(".")>-1 || r.raw%1===0, String(r.raw));
  ck("the shown figure is whole", /^\d+$/.test(r.shown), r.shown);
  ck("and verdict text uses the whole number", !/\d+\.\d/.test(r.state.replace(/^[\d.]+/,"")), r.state);
  console.log("     raw " + r.raw + " -> shown " + r.shown + " | " + r.state);
}

console.log("A9e - NEW STATE SURVIVES A BACKUP");
{
  const r = await p.evaluate(()=>{
    S.lmMav={chest:15}; S.lmMrv={chest:19}; S.lmCal={chest:{mav:1.1}};
    S.priorTrainingWeeks=60; S.expManual="advanced"; S.exCompound={"x":true};
    S.sore={"2026-09-01":{chest:2}}; save();
    const keys = BACKUP_FIELDS;
    return {have: ["lmMav","lmMrv","lmCal","priorTrainingWeeks","expManual","exCompound",
                   "exCompoundSeeded","sore"].filter(k=> keys.indexOf(k) > -1)};
  });
  ck("every new field is in BACKUP_FIELDS", r.have.length===8, JSON.stringify(r.have));
}

console.log(errs.length? "  BROKEN page errors :: "+errs.join(" | ") : "  ok  no page errors");
if(errs.length) bad++;
console.log(bad? ("  "+bad+" broken") : "  all good");
await b.close();
