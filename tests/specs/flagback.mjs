import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});

const build = (n)=> p.evaluate((times)=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr();
  S.splitId=DEFAULT_SPLIT; applySplit(); S.flags=[]; S.deload=null;
  const ex="Incline Dumbbell Curl";
  S.program[ROTATION[0]]=[{name:ex, sets:3, reps:"8-12", weight:30}];
  const finding = {name:ex, kind:"hold",
    stall:{kind:"programme", msg:"Stalled 3 sessions running with adequate sleep",
           sub:"Cut this exercise by one set for two weeks."}};
  // `times` earlier sightings, each dismissed, then one more left open.
  for(let i=0;i<=times;i++){
    const d = new Date(Date.now()-(times-i+1)*7*86400e3).toLocaleDateString("en-CA");
    recordFlags({id:"s"+i, workoutId:ROTATION[0], date:d, finishedAt:Date.now()-(times-i+1)*7*86400e3}, [finding]);
    if(i < times) flagLog()[i].dismissed = true;
  }
  S.sessions=[{id:"h", workoutId:ROTATION[0], date:new Date(Date.now()-86400e3).toLocaleDateString("en-CA"),
    startedAt:Date.now()-86400e3-3600e3, finishedAt:Date.now()-86400e3, feel:4,
    entries:[{name:ex, reps:"8-12", sets:[{weight:"30", reps:"9", rpe:"9", done:true}]}]}];
  save(); TAB="body";
  try{AI_IMP=null}catch(e){}
  const af=document.getElementById('aiFull'); if(af) af.hidden=true;
  document.body.classList.remove('ai-open');
  render();
  const card=document.querySelector(".nb-flag");
  const open=openFlags();
  return {txt: card? card.innerText : "", html: card? card.outerHTML : "",
          openN: open.length, rep: flagRepeat(open[0])};
}, n);

let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

console.log("1 - A DISMISSED FLAG STILL COMES BACK NEXT SESSION");
let r = await build(1);
ck("it is open again", r.openN===1, JSON.stringify(r.openN));
ck("and is known to be a repeat", r.rep && r.rep.n===1, JSON.stringify(r.rep));

console.log("2 - AND THE CARD SAYS SO");
ck("names the dismissal", /You dismissed this on/.test(r.txt), r.txt);
ck("and that it returned", /raised it again/.test(r.txt), r.txt);
ck("the finding itself is untouched", /Stalled 3 sessions running/i.test(r.txt)
   && /cut a set for now/i.test(r.txt), r.txt);

console.log("3 - A FIRST SIGHTING SAYS NOTHING");
r = await build(0);
ck("no repeat found", !r.rep, JSON.stringify(r.rep));
ck("and no line on the card", !/flag-again/.test(r.html), r.html.slice(0,400));

console.log("4 - THREE TIMES COUNTS THEM");
r = await build(3);
ck("counted", r.rep && r.rep.n===3, JSON.stringify(r.rep));
ck("says how many", /Dismissed 3 times before/.test(r.txt), r.txt);
ck("and that it keeps returning", /keeps coming back/.test(r.txt), r.txt);

console.log("5 - A DIFFERENT MOVEMENT IS NOT ROPED IN");
{
  const out = await p.evaluate(()=>{
    S.flags=[{id:"a", ex:"Barbell Row", kind:"stall", dismissed:true, at:1, date:"2026-09-01"},
             {id:"b", ex:"Incline Dumbbell Curl", kind:"up", dismissed:true, at:2, date:"2026-09-02"}];
    return {other: flagRepeat({ex:"Incline Dumbbell Curl", kind:"stall", at:9}),
            sameKind: flagRepeat({ex:"Incline Dumbbell Curl", kind:"up", at:9})};
  });
  ck("another exercise does not count", !out.other, JSON.stringify(out.other));
  ck("another kind does not count", out.sameKind && out.sameKind.n===1, JSON.stringify(out.sameKind));
}

console.log(errs.length? "  BROKEN page errors :: "+errs.join(" | ") : "  ok  no page errors");
if(errs.length) bad++;
console.log(bad? ("  "+bad+" broken") : "  all good");
await b.close();
