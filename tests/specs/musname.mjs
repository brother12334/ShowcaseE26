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

console.log("1 - THE GROUPS ARE NAMED FOR THE MUSCLE");
const g = await p.evaluate(()=> ({
  quads: gName("quads"), hams: gName("hams"), obl: gName("obliques"),
  add: gName("adductors"), df: gName("delts_front"), ds: gName("delts_side"),
  dr: gName("delts_rear"),
  lc: MKEYS.map(k=> GROUPS[k].lc)
}));
ck("quads", g.quads==="Quads", g.quads);
ck("hamstrings", g.hams==="Hamstrings", g.hams);
ck("obliques", g.obl==="Obliques", g.obl);
ck("adductors", g.add==="Adductors", g.add);
ck("front delts", g.df==="Front Delts", g.df);
ck("side delts", g.ds==="Side Delts", g.ds);
ck("rear delts", g.dr==="Rear Delts", g.dr);
ck("no group left unnamed for sentences", g.lc.every(x=> typeof x==="string" && x.length), JSON.stringify(g.lc));

console.log("2 - THE GROUP AND ITS OWN PARTS NOW AGREE");
const r = await p.evaluate(()=>{
  const kids = k => RKEYS.filter(x=> REGIONS[x].g===k).map(x=> REGIONS[x].name);
  return {quads: kids("quads"), hams: kids("hams"), df: kids("delts_front"),
          obl: kids("obliques"), add: kids("adductors")};
});
ck("quad parts say quad", r.quads.every(n=> /quad/i.test(n)), JSON.stringify(r.quads));
ck("ham parts say hamstring", r.hams.every(n=> /hamstring/i.test(n)), JSON.stringify(r.hams));
ck("front delt part says delt", r.df.every(n=> /delt/i.test(n)), JSON.stringify(r.df));
ck("adductor part matches", r.add.includes("Adductors"), JSON.stringify(r.add));

console.log("3 - SENTENCES BUILT FROM lc STILL READ");
const say = await p.evaluate(()=> ["quads","hams","obliques","adductors","delts_side"]
  .map(k=> "add more " + GROUPS[k].lc + " work"));
ck("no undefined anywhere", say.every(x=> !/undefined/.test(x)), JSON.stringify(say));
ck("quads reads right", say[0]==="add more quad work", say[0]);
console.log("     " + say.join(" | "));

console.log("4 - NOTHING SAYS FRONT THIGH ANY MORE");
const stale = await p.evaluate(()=>{
  const names = MKEYS.map(k=> GROUPS[k].name).concat(RKEYS.map(k=> REGIONS[k].name));
  const lcs = MKEYS.map(k=> GROUPS[k].lc);
  return names.concat(lcs).filter(n=> /thigh|side ab|front shoulder|side shoulder|rear shoulder/i.test(n));
});
ck("no place-names left in any label", stale.length===0, JSON.stringify(stale));

console.log("5 - THE MAP AND THE BODY TAB STILL RENDER");
{
  const out = await p.evaluate(()=>{
    const sp=document.getElementById('splash'); if(sp) sp.remove();
    try{OB=null}catch(e){} hideModal();
    document.body.classList.remove('ai-open','onboarding');
    try{AI_IMP=null}catch(e){}
    const af=document.getElementById('aiFull'); if(af) af.hidden=true;
    S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
    S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr();
    S.splitId=DEFAULT_SPLIT; applySplit();
    const wid=ROTATION[0];
    S.sessions=[{id:"s1", workoutId:wid, date:new Date(Date.now()-86400e3).toLocaleDateString("en-CA"),
      startedAt:Date.now()-86400e3-3600e3, finishedAt:Date.now()-86400e3, feel:4,
      entries:[{name:"Back Squat", reps:"6-10", sets:[
        {weight:"225", reps:"8", rpe:"8", done:true},{weight:"225", reps:"8", rpe:"9", done:true}]}]}];
    save(); TAB="body"; render();
    return document.body.innerText;
  });
  ck("Body tab mentions Quads", /quads/i.test(out), out.slice(0,200));
  ck("and never Front Thighs", !/front thigh/i.test(out), "");
}

console.log(errs.length? "  BROKEN page errors :: "+errs.join(" | ") : "  ok  no page errors");
if(errs.length) bad++;
console.log(bad? ("  "+bad+" broken") : "  all good");
await b.close();
