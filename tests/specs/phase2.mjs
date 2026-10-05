/* Phase 2 of the Plan Builder brief: C2 (frozen preference table), H5 (mapping order
   and table gaps), M8 (front raises, carries, sumo) and L1 (one e1RM definition). */
import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
import { readFileSync } from 'node:fs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
await p.route(/^https?:/, r=> r.abort());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open','spec-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; save();
});
const ev = (fn, arg) => p.evaluate(fn, arg);

console.log("1 - L1: ONE ESTIMATED 1RM, AND IT IS THE ONE THAT KNOWS ABOUT RPE");
{
  const r = await ev(()=>({
    /* the arithmetic takes reps TO FAILURE */
    plain:  est1RM(100, 10),
    /* a set of 10 with 2 left is read as a set of 12 */
    set:    e1rmOfSet({weight:"100", reps:"10", rpe:"8"}, 0),
    want:   100 * (1 + 12/30),
    /* the trend's reader agrees with the records' reader, to the penny */
    trend:  setE1RM({weight:"100", reps:"10", rpe:"8"}, 0, false).v,
    /* no RPE logged changes nothing: the reps are taken at face value */
    noRpe:  e1rmOfSet({weight:"100", reps:"10"}, 0),
    /* and the cap is on reps to failure, so a long set cannot run away with it */
    long:   e1rmOfSet({weight:"50", reps:"25"}, 0),
    cap:    50 * (1 + 15/30),
    only:   typeof est1RM === "function"
  }));
  ck("Epley on reps to failure", Math.abs(r.plain - 100*(1+10/30)) < 1e-9, String(r.plain));
  ck("a set with two in reserve is read as two more reps", Math.abs(r.set - r.want) < 1e-9,
     r.set + " vs " + r.want);
  ck("the records reader and the trend reader return the same number",
     Math.abs(r.set - r.trend) < 1e-9, r.set + " vs " + r.trend);
  ck("no RPE, no adjustment", Math.abs(r.noRpe - 100*(1+10/30)) < 1e-9, String(r.noRpe));
  ck("a 25-rep set is capped, not extrapolated", Math.abs(r.long - r.cap) < 1e-9,
     r.long + " vs " + r.cap);
}

console.log("2 - L1: A RECORD IS JUDGED ON THE SAME NUMBER AS THE TREND");
{
  const r = await ev(()=>{
    S.sessions = [{id:"s1", date:"2025-01-01", startedAt:Date.parse("2025-01-01T10:00:00"),
      finishedAt:Date.parse("2025-01-01T11:00:00"), entries:[
        {name:"Leg Extension", sets:[{weight:"100", reps:"10", rpe:"10", done:true}]}]}];
    S.active = null; save();
    /* 100x10 to failure stands. 100x10 with three in reserve is a BIGGER lift and the
       old reader, which ignored RPE, called the two identical. */
    const easier = detectPR("Leg Extension", {weight:"100", reps:"10", rpe:"7", done:true}, null, null);
    const same   = detectPR("Leg Extension", {weight:"100", reps:"10", rpe:"10", done:true}, null, null);
    return {easier, same};
  });
  ck("the same reps with reps left over is a strength PR", r.easier === "STRENGTH PR", String(r.easier));
  ck("and repeating the set exactly is not", r.same === null, String(r.same));
}

console.log("3 - M8: A FRONT RAISE IS NOT OFFERED AS A LATERAL RAISE");
{
  const r = await ev(()=>{
    const slotOf = n=>{ for(const k of Object.keys(EX_LIBRARY))
      if(EX_LIBRARY[k].some(x=> swapSquash(x.name)===swapSquash(n))) return k; return null; };
    return {
      lateral: EX_LIBRARY.lateral.map(x=> x.name),
      front:   (EX_LIBRARY.front_delt || []).map(x=> x.name),
      carry:   (EX_LIBRARY.carry || []).map(x=> x.name),
      walk:    slotOf("Farmer's Walk"), suitcase: slotOf("Suitcase Carry"),
      sumoSq:  slotOf("Sumo Squat"), wideLp: slotOf("Wide-Stance Leg Press")
    };
  });
  ck("no front raise in the lateral-raise slot",
     !r.lateral.some(n=> /front raise/i.test(n)), r.lateral.join(", "));
  ck("the front raises have a slot of their own", r.front.length === 3, r.front.join(", "));
  ck("the three carries are together in one slot", r.carry.length === 3 &&
     r.walk === "carry" && r.suitcase === "carry", r.carry.join(", "));
  ck("sumo and wide stance are filed as adductor work",
     r.sumoSq === "adductors" && r.wideLp === "adductors", r.sumoSq + " / " + r.wideLp);
}

console.log("4 - M8 AND H5: THE MAPPING READS THESE MOVEMENTS CORRECTLY NOW");
{
  const r = await ev(()=>{
    const top = n=>{ const mm = musclesFor(n) || {}; let t=null, b=0;
      Object.keys(mm).forEach(m=>{ if(mm[m] > b){ b = mm[m]; t = m; } }); return t; };
    return {
      frontRaise: top("Dumbbell Front Raise"), carry: musclesFor("Farmer Carry"),
      sumo: top("Wide-Stance Hack Squat"), sumoAdd: (musclesFor("Wide-Stance Hack Squat")||{}).adductors,
      legCurl: top("Nordic Hamstring Curl"), ballCurl: top("Stability Ball Leg Curl"),
      revNordic: top("Reverse Nordic Curl"), wrist: top("Dumbbell Wrist Curl"),
      tricepDip: top("Tricep Dip Machine"), pike: top("Pike Push-Up"),
      neutral: top("Neutral-Grip Dumbbell Press"), kickback: top("Cable Kickback"),
      upright: top("Upright Row"),
      backExtTraps: (musclesFor("45-Degree Back Extension") || {}).traps,
      backExt: top("45-Degree Back Extension")
    };
  });
  ck("a front raise is front-delt work", r.frontRaise === "delts_front", String(r.frontRaise));
  ck("a carry is grip, traps and trunk, not grip alone",
     r.carry && r.carry.traps > 0 && r.carry.abs > 0, JSON.stringify(r.carry));
  ck("a wide stance pays the adductors", r.sumoAdd >= 0.6, String(r.sumoAdd));
  ck("a Nordic curl is hamstrings, not biceps", r.legCurl === "hams", String(r.legCurl));
  ck("so is a stability-ball leg curl", r.ballCurl === "hams", String(r.ballCurl));
  ck("a reverse Nordic is quads", r.revNordic === "quads", String(r.revNordic));
  ck("a wrist curl is forearms", r.wrist === "forearms", String(r.wrist));
  ck("a triceps dip machine is triceps", r.tricepDip === "triceps", String(r.tricepDip));
  ck("a pike push-up is a shoulder press", r.pike === "delts_front", String(r.pike));
  ck("a neutral-grip dumbbell press is a chest press", r.neutral === "chest", String(r.neutral));
  ck("the glute kickback in the hip-thrust slot is glutes", r.kickback === "glutes", String(r.kickback));
  ck("an upright row is side delts", r.upright === "delts_side", String(r.upright));
  ck("a back extension carries no traps", !(r.backExtTraps > 0) && r.backExt === "lower_back",
     r.backExt + " traps=" + r.backExtTraps);
}

console.log("5 - C2: THE PREFERENCE TABLE IS WRITTEN DOWN, AND FROZEN AGAINST THE CATALOGUE");
/* matrix.txt is the pinned pick for every slot and every gear tier. It was regenerated
   when EX_PREFERENCE stopped being a snapshot of the curated list order and became the
   science reference's own ranking (2.8.2) — which moved four slots: a seated dumbbell
   press before a barbell, a cable lateral raise before a dumbbell, overhead triceps work
   before a pushdown, and a reverse pec deck before a cable fly. Each one loads the muscle
   where it is long, which is the principle the rest of the app is built on. */
{
  const want = readFileSync(new URL('./matrix.txt', import.meta.url), 'utf8').trim().split("\n");
  const got = await ev(()=>{
    const out = [];
    Object.keys(EX_LIBRARY).sort().forEach(slot=>{
      Object.keys(GEAR_TIERS).forEach(g=>{
        const x = pickExercise(slot, g);
        out.push(slot+"|"+g+"|"+(x?x.name:"-"));
      });
    });
    return out;
  });
  const diff = got.filter((l,i)=> l !== want[i]);
  ck("every slot and gear picks exactly what the curated table says",
     diff.length === 0 && got.length === want.length,
     diff.slice(0,4).join(" ; ") + " (" + got.length + " vs " + want.length + ")");
  /* and the thing the freeze is for: a new catalogue row cannot change a pick */
  const after = await ev(()=>{
    EX_LIBRARY.squat.unshift({name:"Imaginary Machine Squat", gear:"machine"});
    EX_LIBRARY.lateral.unshift({name:"Imaginary Cable Raise", gear:"cable"});
    const out = [pickExercise("squat","full").name, pickExercise("lateral","full").name];
    EX_LIBRARY.squat.shift(); EX_LIBRARY.lateral.shift();   // leave the library as found
    return out;
  });
  ck("a movement pushed to the front of a slot does not become the plan's choice",
     after[0] === "Barbell Back Squat" && after[1] === "Cable Lateral Raise", after.join(", "));
}

console.log("6 - THE IN-APP CHECK STILL PASSES WITH THE NEW INVARIANTS");
{
  const r = await ev(()=> selfTestRun());
  r.fail.slice(0,10).forEach(f=> console.log("    > "+f.k+" | "+f.detail));
  ck("seven invariants, no failures", r.ok && r.fail.length === 0, r.fail.length + " problems");
}

console.log(errs.length?("PAGE ERRORS: "+errs.join(" | ")):"no page errors");
if(errs.length) bad++;
console.log(bad?("BROKEN: "+bad):"all good");
await b.close();
