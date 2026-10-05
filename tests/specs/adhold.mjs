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
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding');
  const af=document.getElementById('aiFull'); if(af) af.hidden=true;
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.priorTrainingWeeks=100; S.priorAsked=1;
  S.splitId=DEFAULT_SPLIT; applySplit(); S.cycleStart=Date.now()-3*86400e3;
  S.afterDeload=[]; save();
});
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

console.log("1 - A VOLUME PLAN IS HELD, NOT APPLIED, DURING A DELOAD");
{
  const r = await p.evaluate(()=>{
    S.deload={startedAt:Date.now()-2*86400e3, endedAt:null, reason:"manual"};
    const wid=ROTATION[0];
    S.program[wid]=[{name:"Barbell Bench Press", sets:3, reps:"8-12", weight:135}];
    const before = JSON.parse(JSON.stringify(S.program[wid]));
    save();
    const fix = {mode:"one", pick:0, setsOne:6};
    queueAfterDeload("chest", fix, fixPlanLabel(fix, "chest"));
    return {held: deloadHoldsVolume(), q: S.afterDeload.length,
            label: S.afterDeload[0].label, name: S.afterDeload[0].name,
            planUnchanged: JSON.stringify(S.program[wid])===JSON.stringify(before)};
  });
  ck("a deload holds volume changes", r.held, String(r.held));
  ck("the plan is parked", r.q===1, String(r.q));
  ck("the programme is untouched", r.planUnchanged, String(r.planUnchanged));
  ck("and it remembers what it was going to do", /6 sets/.test(r.label), r.label);
  console.log("     " + r.name + ": " + r.label);
}

console.log("2 - NOTHING IS OFFERED WHILE THE DELOAD RUNS");
{
  const h = await p.evaluate(()=> afterDeloadDueHTML());
  ck("no card mid-deload", h==="", h.slice(0,60));
}

console.log("3 - THE MOMENT IT ENDS, IT IS OFFERED BACK");
{
  const r = await p.evaluate(()=>{
    S.deload.endedAt = Date.now(); save();
    const h = afterDeloadDueHTML();
    return {active: deloadActive(), has: h.length>0, go:/data-adgo="chest"/.test(h),
            no:/data-adno="chest"/.test(h), txt:h.replace(/<[^>]+>/g," ").replace(/\s+/g," ")};
  });
  ck("the deload is over", !r.active, String(r.active));
  ck("the card appears", r.has, "");
  ck("with both an accept and a drop", r.go && r.no, JSON.stringify(r));
  ck("naming the muscle and the change", /Chest/.test(r.txt) && /6 sets/.test(r.txt), r.txt);
  console.log("     " + r.txt.trim());
}

console.log("4 - ACCEPTING APPLIES THE PARKED PLAN");
{
  const r = await p.evaluate(()=>{
    const wid=ROTATION[0];
    const rec = S.afterDeload[0];
    applyFixPlan(rec.m, rec.fix);
    dropAfterDeload(rec.m);
    return {sets: S.program[wid][0].sets, left: S.afterDeload.length};
  });
  ck("the sets actually changed", r.sets===6, String(r.sets));
  ck("and the queue is cleared", r.left===0, String(r.left));
}

console.log("5 - DROPPING IT LEAVES THE PROGRAMME ALONE");
{
  const r = await p.evaluate(()=>{
    const wid=ROTATION[0];
    S.program[wid][0].sets = 3;
    queueAfterDeload("chest", {mode:"one", pick:0, setsOne:9}, "take one movement to 9 sets");
    dropAfterDeload("chest");
    return {sets: S.program[wid][0].sets, left: S.afterDeload.length,
            card: afterDeloadDueHTML()};
  });
  ck("nothing was applied", r.sets===3, String(r.sets));
  ck("the queue is empty", r.left===0, String(r.left));
  ck("and the card is gone", r.card==="", r.card.slice(0,40));
}

console.log("6 - ONE PARKED PLAN PER MUSCLE");
{
  const r = await p.evaluate(()=>{
    S.deload={startedAt:Date.now(), endedAt:null, reason:"manual"};
    queueAfterDeload("chest", {mode:"one", pick:0, setsOne:5}, "to 5 sets");
    queueAfterDeload("chest", {mode:"one", pick:0, setsOne:7}, "to 7 sets");
    queueAfterDeload("lats",  {mode:"one", pick:0, setsOne:4}, "to 4 sets");
    return {n: S.afterDeload.length, chest: S.afterDeload.find(x=>x.m==="chest").label};
  });
  ck("changing your mind replaces rather than stacks", r.n===2, String(r.n));
  ck("keeping the later answer", /7 sets/.test(r.chest), r.chest);
}

console.log("7 - THE SHEET SAYS SO BEFORE YOU COMMIT");
{
  const r = await p.evaluate(()=>{
    S.deload={startedAt:Date.now()-3*86400e3, endedAt:null, reason:"manual"};
    S.afterDeload=[]; save();
    return {held: deloadHoldsVolume()};
  });
  ck("the sheet would hold", r.held, "");
}

console.log("8 - A PARKED PLAN COMES OFF THE LIST IT ANSWERS");
{
  const r = await p.evaluate(()=>{
    S.deload={startedAt:Date.now()-2*86400e3, endedAt:null, reason:"manual"};
    S.afterDeload=[];
    /* The Body tab draws nothing at all without a logged session. */
    if(!(S.sessions||[]).length){
      const t = Date.now()-86400e3;
      S.sessions=[{id:"b1", workoutId:ROTATION[0], date:new Date(t).toLocaleDateString("en-CA"),
        startedAt:t, finishedAt:t+3600e3, feel:4,
        entries:[{name:"Barbell Bench Press", sets:[{weight:135,reps:8,rpe:8,done:true}]}]}];
    }
    save();
    const A0 = bodyAnalysis();
    const w = (A0.weak||[]).find(x=> x.kind==="under" || x.kind==="balance" || x.kind==="none");
    if(!w) return {none:true};
    const before = (A0.weak||[]).filter(x=> x.muscle===w.muscle).length;
    const fix = {mode:"one", pick:0, setsOne:6};
    queueAfterDeload(w.muscle, fix, fixPlanLabel(fix, w.muscle));
    const after = (bodyAnalysis().weak||[]).filter(x=> x.muscle===w.muscle).length;
    TAB="body"; render();
    const banner = document.querySelector(".nb-deload");
    const txt = banner ? banner.innerText.replace(/\s+/g," ").trim() : "";
    const drop = !!(banner && banner.querySelector("[data-adno]"));
    dropAfterDeload(w.muscle);
    const back = (bodyAnalysis().weak||[]).filter(x=> x.muscle===w.muscle).length;
    return {name: gName(w.muscle), before, after, back, txt, drop};
  });
  if(r.none){ console.log("     (no shortfall finding in this state \u2014 nothing to check)"); }
  else {
    ck("the finding was on the list", r.before===1, String(r.before));
    ck("parking the fix takes it off", r.after===0, String(r.after));
    ck("the banner says what is waiting", /waiting for the week to finish/i.test(r.txt), r.txt.slice(0,160));
    ck("and names the muscle", r.txt.indexOf(r.name)>-1, r.txt.slice(0,120));
    ck("with a way to change your mind", r.drop, String(r.drop));
    ck("dropping it brings the finding back", r.back===1, String(r.back));
    console.log("     " + r.txt.slice(0, 220));
  }
}

console.log(errs.length? "  BROKEN page errors :: "+errs.join(" | ") : "  ok  no page errors");
if(errs.length) bad++;
console.log(bad? ("  "+bad+" broken") : "  all good");
await b.close();
