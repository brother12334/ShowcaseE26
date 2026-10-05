import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

/* D1 — THE WORKED EXAMPLE IN THE DERIVATION DOCUMENT, RUN AGAINST THE APP.
   Quads. Intermediate lifter building muscle, quads twice in the cycle at four sets of
   eight at RPE 8, 7.5 h sleep and 8/10 energy logged every day. If the chain changes
   under anybody's feet, this is what says so. */
const r = await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.priorTrainingWeeks=60; S.priorAsked=1;
  S.splitId=DEFAULT_SPLIT; applySplit();
  const DAY=86400e3, now=Date.now();
  S.cycleStart = now - 9*DAY;
  S.sessions=[]; S.checkins={}; S.lmCal={}; S.lmCalObs={};
  for(let i=1;i<=9;i++){
    const d=new Date(now-(9-i)*DAY).toLocaleDateString("en-CA");
    S.checkins[d]={sleep:"7.5", energy:"8"};
  }
  [7,3].forEach((k,n)=>{
    const t = now - k*DAY;
    S.sessions.push({id:"q"+n, workoutId:ROTATION[0], date:new Date(t).toLocaleDateString("en-CA"),
      startedAt:t, finishedAt:t+3600e3, feel:4,
      entries:[{name:"Barbell Back Squat", sets:[
        {weight:225,reps:8,rpe:8,done:true},{weight:225,reps:8,rpe:8,done:true},
        {weight:225,reps:8,rpe:8,done:true},{weight:225,reps:8,rpe:8,done:true}]}]});
  });
  save();
  const A = bodyAnalysis();
  const L = adjustedLandmarks(A, "quads");
  const conf = landmarkConfidence("quads");
  return {base:L.base, mev:L.mev, mav:L.mav, mrv:L.mrv,
          keys:L.why.map(w=>w.k), vol:A.vol.quads, exp:L.exp,
          conf:conf.label, range:fmtLandmarkRange(L.mav, conf),
          state: volState("quads", A.vol.quads, L, {}).label};
});
console.log("     base MEV " + r.base.mev + " / MAV " + r.base.mav + " / MRV " + r.base.mrv);
console.log("     chain: " + r.keys.join(" → "));
console.log("     yours: MEV " + r.mev + " / MAV " + r.mav + " / MRV " + r.mrv +
            "   (" + r.conf + ", MAV somewhere around " + r.range + ")");
console.log("     doing " + r.vol + " effective sets a week · " + r.state);

ck("the base row is the published one", r.base.mev===8 && r.base.mav===16 && r.base.mrv===20,
   JSON.stringify(r.base));
ck("the log says intermediate", r.exp==="intermediate", r.exp);
ck("the chain runs the documented steps",
   r.keys.join(",")==="Experience,Frequency,Intensity,Exercise mix,Recovery", r.keys.join(","));
ck("MEV is 8", r.mev===8, String(r.mev));
ck("MAV is 16.3", Math.abs(r.mav-16.3)<0.05, String(r.mav));
ck("MRV is 18.5", Math.abs(r.mrv-18.5)<0.05, String(r.mrv));
ck("eight sets a week sits exactly on the floor, so it counts as productive",
   r.state==="productive" && r.vol===r.mev, r.state+" at "+r.vol+" vs MEV "+r.mev);
ck("and nothing has been learned about this lifter yet", r.conf==="Population estimate", r.conf);
ck("so the range around MAV is the widest one", r.range==="11–21", r.range);

console.log("\nD3 - THE WAY BACK TO THE PUBLISHED FIGURES");
{
  const r = await p.evaluate(()=>{
    S.lmCal = {quads:{mev:1.2, mav:1.2, mrv:1.2, blocks:3, w:calWeight(3)}};
    S.prefs = Object.assign({}, S.prefs, {lmNoCal:false}); save();
    const A1 = bodyAnalysis(); const on = adjustedLandmarks(A1, "quads");
    S.prefs = Object.assign({}, S.prefs, {lmNoCal:true}); save();
    const A2 = bodyAnalysis(); const off = adjustedLandmarks(A2, "quads");
    const conf = landmarkConfidence("quads");
    S.prefs = Object.assign({}, S.prefs, {lmNoCal:false}); save();
    const A3 = bodyAnalysis(); const back = adjustedLandmarks(A3, "quads");
    return {on:{mav:on.mav, mrv:on.mrv}, off:{mav:off.mav, mrv:off.mrv},
            back:{mav:back.mav, mrv:back.mrv}, conf:conf.label,
            kept: ((S.lmCal||{}).quads||{}).blocks};
  });
  ck("learning moves the numbers", r.on.mav > r.off.mav, JSON.stringify(r));
  ck("turning it off gives the published chain back", Math.abs(r.off.mav-16.3)<0.05, String(r.off.mav));
  ck("and says so", r.conf==="Population estimate", r.conf);
  ck("nothing it learned is thrown away", r.kept===3, String(r.kept));
  ck("so switching back restores it", Math.abs(r.back.mav-r.on.mav)<0.01, r.back.mav+" vs "+r.on.mav);
  console.log("     learning " + r.on.mav + "/" + r.on.mrv + "  ·  published only " + r.off.mav + "/" + r.off.mrv);
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
