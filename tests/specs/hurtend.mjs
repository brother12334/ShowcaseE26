import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1100}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

const setup = ()=> p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding');
  const af=document.getElementById('aiFull'); if(af) af.hidden=true;
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.priorTrainingWeeks=100; S.priorAsked=1;
  S.splitId=DEFAULT_SPLIT; applySplit();
  S.hurts=[]; S.joint={}; S.active={date:todayStr(), workoutId:ROTATION[0], startedAt:Date.now(),
    entries:[{name:"Weighted Chest Dips", reps:"6-10",
              sets:[{weight:"25", reps:"8", rpe:"8", done:true}]}]};
  save();
  hurtAdd("Weighted Chest Dips", "shoulder", "sore", "only on the way down");
  S.active.entries[0].hurt = {where:"shoulder", level:"sore", at:Date.now()};
  save(); render();
  return {n: hurtLog().length, open: activeHurts().length, onEntry: !!S.active.entries[0].hurt};
});

console.log("1 - A LOGGED NIGGLE, AND THE SHEET OFFERS BOTH WAYS OUT");
{
  const r0 = await setup();
  const r = await p.evaluate(()=>{
    openHurt("Weighted Chest Dips");
    const m = document.getElementById("modal");
    return {settled: !!m.querySelector("#huSettled"), del: !!m.querySelector("#huDelete"),
            save: (m.querySelector("#huSave")||{}).textContent,
            says: /Settled keeps the record/.test(m.innerText)};
  });
  ck("it is logged", r0.n===1 && r0.open===1, JSON.stringify(r0));
  ck("the sheet offers 'it has settled'", r.settled, String(r.settled));
  ck("and 'remove this note'", r.del, String(r.del));
  ck("the save button knows it is an update", /Update it/.test(r.save||""), r.save);
  ck("and the difference is spelled out", r.says, String(r.says));
}

console.log("2 - SETTLED KEEPS THE RECORD AND RELEASES THE LIFT");
{
  const r = await p.evaluate(()=>{
    document.getElementById("huSettled").click();
    return {kept: hurtLog().length, open: activeHurts().length,
            settled: !!hurtLog()[0].settled,
            onEntry: !!(S.active.entries[0] || {}).hurt,
            forEx: !!hurtFor("Weighted Chest Dips")};
  });
  ck("the record is kept", r.kept===1, String(r.kept));
  ck("and marked settled", r.settled, String(r.settled));
  ck("nothing is holding the exercise any more", !r.forEx && r.open===0, r.open+"/"+r.forEx);
  ck("and the live session agrees", !r.onEntry, String(r.onEntry));
}

console.log("3 - REMOVE TAKES IT WITH IT");
{
  await setup();
  const r = await p.evaluate(()=>{
    openHurt("Weighted Chest Dips");
    document.getElementById("huDelete").click();     // the dialog is auto-accepted
    return {left: hurtLog().length, forEx: !!hurtFor("Weighted Chest Dips"),
            onEntry: !!(S.active.entries[0] || {}).hurt};
  });
  ck("the entry is gone from the log", r.left===0, String(r.left));
  ck("nothing is flagged on the exercise", !r.forEx, String(r.forEx));
  ck("and the live session agrees", !r.onEntry, String(r.onEntry));
}

console.log("4 - A SHEET WITH NOTHING LOGGED OFFERS NEITHER");
{
  const r = await p.evaluate(()=>{
    S.hurts=[]; save();
    openHurt("Barbell Bench Press");
    const m = document.getElementById("modal");
    return {settled: !!m.querySelector("#huSettled"), del: !!m.querySelector("#huDelete"),
            save: (m.querySelector("#huSave")||{}).textContent};
  });
  ck("no settle button", !r.settled, String(r.settled));
  ck("no remove button", !r.del, String(r.del));
  ck("and the button still reads 'log it'", /Log it/.test(r.save||""), r.save);
}

console.log("5 - THE ICON ON THE EXERCISE GOES QUIET AGAIN");
{
  const r = await p.evaluate(()=>{
    S.hurts=[]; save();
    hurtAdd("Weighted Chest Dips", "shoulder", "sore", "");
    save(); TAB="workout"; render();
    const on = !!document.querySelector(".hu-on");
    hurtRemove(hurtLog()[0].id);
    render();
    return {on, off: !document.querySelector(".hu-on")};
  });
  ck("it lights up while something is logged", r.on, String(r.on));
  ck("and goes out when it is removed", r.off, String(r.off));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
