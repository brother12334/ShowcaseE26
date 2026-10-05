import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:900}, deviceScaleFactor:2});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} document.body.classList.remove('ai-open','onboarding'); hideModal();
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr();
  S.splitId=DEFAULT_SPLIT; applySplit(); save();
});

// deloadDay: null = no deload. kind/to describe the flag.
const setup = (deloadDay, kind, to)=> p.evaluate(([dd, k, t])=>{
  const wid=ROTATION[0], ex="Dumbbell Shrug";
  S.program[wid]=[{name:ex, sets:3, reps:"10-15", weight:40}];
  S.deload = dd==null ? null : {startedAt: Date.now()-(dd-1)*86400e3, endedAt:null, reason:"manual"};
  S.sessions=[{id:"s1", workoutId:wid, date:new Date(Date.now()-2*86400e3).toLocaleDateString("en-CA"),
    startedAt:Date.now()-2*86400e3-3600e3, finishedAt:Date.now()-2*86400e3, feel:4,
    entries:[{name:ex, reps:"10-15", sets:[
      {weight:"40", reps:"16", rpe:"7", done:true},{weight:"40", reps:"15", rpe:"8", done:true}]}]}];
  S.flags=[{id:"f1", ex:ex, kind:k, title: k==="up" ? "Ready for more weight" : "Load is too heavy",
    msg:"Add weight next time: 40 lb → "+t+" lb", fix:"Last set hit 16 reps.",
    to:t, sev:1, date: todayStr(), at: Date.now()}];
  save(); TAB="body"; render();
  const card=document.querySelector(".nb-flag");
  return {html: card? card.outerHTML : "", txt: card? card.innerText : "",
          held: !!flagDeloadHeld(flagLog()[0])};
}, [deloadDay, kind, to]);

let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

console.log("1 - NO DELOAD: THE BUTTON IS THERE AS BEFORE");
let r = await setup(null, "up", 45);
ck("not held", !r.held, String(r.held));
ck("Set it is offered", /data-flagdo/.test(r.html) && /set it/i.test(r.txt), r.txt);
ck("no hold notice", !/flag-held/.test(r.html), r.html.slice(0,200));
ck("and is not greyed", !/is-held/.test(r.html), r.html.slice(0,120));

console.log("2 - DELOAD, DAY 3: THE RAISE IS SHOWN BUT HELD");
r = await setup(3, "up", 45);
ck("held", r.held, String(r.held));
ck("the finding is still fully there", /ready for more weight/i.test(r.txt)
   && /40 lb/.test(r.txt) && /45 lb/.test(r.txt) && /16 reps/.test(r.txt), r.txt);
ck("no Set it button", !/data-flagdo/.test(r.html), r.html.slice(0,300));
ck("it says when", /Apply this after your deload week/.test(r.txt) && /in 4 days/.test(r.txt), r.txt);
ck("Dismiss survives", /data-flagno/.test(r.html), r.html.slice(0,300));
ck("the card is greyed out", /class="nb-flag sev1 is-held"/.test(r.html), r.html.slice(0,120));

console.log("3 - THE COUNTDOWN READS PROPERLY");
r = await setup(6, "up", 45); ck("day 6 says tomorrow", /tomorrow/.test(r.txt), r.txt);
r = await setup(7, "up", 45); ck("day 7 says next session", /from your next session/.test(r.txt), r.txt);

console.log("4 - A CUT IS NOT HELD");
r = await setup(3, "toohard", 30);
ck("a drop stays actionable", !r.held && /data-flagdo/.test(r.html) && !/is-held/.test(r.html), r.txt);

console.log("5 - AND THE BLOCK ITSELF STILL HOLDS");
{
  const out = await p.evaluate(()=>{
    S.deload={startedAt:Date.now(), endedAt:null, reason:"manual"};
    const before = findProgramEntry("Dumbbell Shrug").weight;
    const ok = applyProgression("Dumbbell Shrug", 45, null, null);
    return {ok, after: findProgramEntry("Dumbbell Shrug").weight, before};
  });
  ck("applyProgression still refuses a raise", out.ok===false && out.after===out.before, JSON.stringify(out));
}

console.log(errs.length? "  BROKEN page errors :: "+errs.join(" | ") : "  ok  no page errors");
if(errs.length) bad++;
console.log(bad? ("  "+bad+" broken") : "  all good");
await b.close();
