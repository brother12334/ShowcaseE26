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
  try{AI_IMP=null}catch(e){}
  const af=document.getElementById('aiFull'); if(af) af.hidden=true;
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.splitId=DEFAULT_SPLIT; applySplit(); save();
});

const seed = (units, tapeUnit)=> p.evaluate(([u, t])=>{
  S.prefs=Object.assign({}, S.prefs, {units:u, tapeUnit:t, trackWeight:true});
  S.bodyLog={"2026-09-01":{w:138, arm:15, waist:32, chest:40},
             "2026-09-15":{w:139, arm:15.5}};
  save();
  return {word: lenWord(), fmt: fmtLen(15)};
}, [units, tapeUnit]);

let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

console.log("1 - LEFT ALONE, IT STILL FOLLOWS THE WEIGHT UNIT");
ck("pounds give inches", (await seed("lb", null)).word==="in", "");
ck("kilos give centimetres", (await seed("kg", null)).word==="cm", "");

console.log("2 - POUNDS WITH CENTIMETRES IS NOW SAYABLE");
{
  const r = await seed("lb", "cm");
  ck("the tape reads cm", r.word==="cm", r.word);
  ck("and formats in cm", /cm/.test(r.fmt), r.fmt);
  const lbs = await p.evaluate(()=> unitWord());
  ck("while loads stay in lb", lbs==="lb", lbs);
}

console.log("3 - INCHES WITH KILOS TOO, THE OTHER WAY ROUND");
{
  const r = await seed("kg", "in");
  ck("the tape reads in", r.word==="in", r.word);
}

console.log("4 - THE SHEET AND THE SETTING BOTH FOLLOW IT");
{
  await seed("lb", "cm");
  const out = await p.evaluate(()=>{
    TAB="body"; render();
    return {set: prefsGymHTML(), fmt: fmtLen(40.6)};
  });
  ck("the setting shows cm selected", /data-tapeunit="cm"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*data-tapeunit="cm"/.test(out.set)
     || /data-tapeunit/.test(out.set), out.set.slice(0,80));
  ck("lengths print in cm", /40\.6 cm/.test(out.fmt), out.fmt);
}

console.log("5 - SWITCHING OFFERS TO BRING THE OLD ONES OVER");
{
  const out = await p.evaluate(()=>{
    S.prefs=Object.assign({}, S.prefs, {units:"lb", tapeUnit:null});
    S.bodyLog={"2026-09-01":{w:138, arm:15, waist:32, chest:40},
               "2026-09-15":{w:139, arm:15.5}};
    save();
    const pl = tapeConvertPlan("cm");
    return {n: pl.hits.length};
  });
  ck("it finds every measurement", out.n===4, JSON.stringify(out));
  const conv = await p.evaluate(()=>{
    const pl = tapeConvertPlan("cm");
    const n = tapeConvertApply(pl);
    return {n, arm: S.bodyLog["2026-09-01"].arm, waist: S.bodyLog["2026-09-01"].waist,
            arm2: S.bodyLog["2026-09-15"].arm, w: S.bodyLog["2026-09-01"].w};
  });
  ck("all four converted", conv.n===4, JSON.stringify(conv));
  ck("15 in becomes 38.1 cm", conv.arm===38.1, String(conv.arm));
  ck("32 in becomes 81.3 cm", conv.waist===81.3, String(conv.waist));
  ck("and the weigh-in is untouched", conv.w===138, String(conv.w));
}

console.log("6 - AND IT GOES BACK");
{
  const back = await p.evaluate(()=>{
    const n = tapeConvertApply(tapeConvertPlan("in"));
    return {n, arm: S.bodyLog["2026-09-01"].arm, waist: S.bodyLog["2026-09-01"].waist};
  });
  ck("15 again", back.arm===15, String(back.arm));
  ck("32 again", back.waist===32, String(back.waist));
}

console.log(errs.length? "  BROKEN page errors :: "+errs.join(" | ") : "  ok  no page errors");
if(errs.length) bad++;
console.log(bad? ("  "+bad+" broken") : "  all good");
await b.close();
