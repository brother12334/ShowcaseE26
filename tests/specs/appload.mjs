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

/* The reported case. Last session: set 1 was 30 for 3 at RPE 9.5, set 2 was 25 for 10.
   The grade cut the plan to 25 because 30 could not reach the rep range. */
const setup = (opts)=> p.evaluate((o)=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.splitId=DEFAULT_SPLIT; applySplit();
  const wid = ROTATION[0];
  const cutAt = Date.now() - 4*86400e3;
  S.program[wid]=[{name:"Preacher Curl", sets:2, reps:"8-12", weight:25,
    byApp:{at:cutAt, what:"load cut to 25 lb", from:30, to:25, why:"grade"}}];
  const t = Date.now() - 6*86400e3;          // the session that caused the cut
  S.sessions=[{id:"s1", workoutId:wid, date:new Date(t).toLocaleDateString("en-CA"),
    startedAt:t, finishedAt:t+3600e3, feel:4,
    entries:[{name:"Preacher Curl", sets:[
      {weight:"30", reps:"3", rpe:"9.5", done:true},
      {weight:"25", reps:"10", rpe:"9", done:true}]}]}];
  if(o.trainedSince){
    const t2 = Date.now() - 2*86400e3;       // ...and one performed after the cut
    S.sessions.push({id:"s2", workoutId:wid, date:new Date(t2).toLocaleDateString("en-CA"),
      startedAt:t2, finishedAt:t2+3600e3, feel:4,
      entries:[{name:"Preacher Curl", sets:[
        {weight:"30", reps:"11", rpe:"8", done:true},
        {weight:"30", reps:"10", rpe:"8.5", done:true}]}]});
  }
  if(o.mine){ S.program[wid][0].weight = 35; }   // you changed it yourself afterwards
  S.active={date:todayStr(), workoutId:wid, startedAt:Date.now(),
    entries:[{name:"Preacher Curl", reps:"8-12", planWeight:S.program[wid][0].weight,
      sets:[{weight:"", reps:"", rpe:"", done:false},
            {weight:"", reps:"", rpe:"", done:false}]}]};
  save();
  const en = S.active.entries[0];
  const last = lastSetsFor(wid, en.name, false, 0, en.startSide);
  return {box1: planLoadPh(en, last, 0), box2: planLoadPh(en, last, 1),
          pending: appSetLoadPending(en.name), plan: findProgramEntry(en.name).weight};
}, opts);

console.log("1 - A CUT THE APP MADE IS IN EVERY BOX");
{
  const r = await setup({});
  console.log("     boxes: " + r.box1 + " / " + r.box2 + "   (plan " + r.plan + ")");
  ck("the app's number is still pending", r.pending===25, String(r.pending));
  ck("box one offers it", r.box1==="25", r.box1);
  ck("and so does box two, not the 30 that caused the cut", r.box2==="25", r.box2);
}

console.log("2 - ONCE YOU HAVE TRAINED IT SINCE, THE LOG IS THE NEWER FACT");
{
  const r = await setup({trainedSince:true});
  console.log("     boxes: " + r.box1 + " / " + r.box2);
  ck("the app's number stops forcing itself", r.pending==null, String(r.pending));
  ck("and the boxes follow what you actually lifted", r.box1==="30" && r.box2==="30",
     r.box1+"/"+r.box2);
}

console.log("3 - A NUMBER YOU SET YOURSELF IS NOT OVERRIDDEN");
{
  const r = await setup({mine:true});
  console.log("     boxes: " + r.box1 + " / " + r.box2 + "   (plan " + r.plan + ")");
  ck("the app's stamp no longer matches the plan", r.pending==null, String(r.pending));
  ck("and your figure stands", r.box1==="35", r.box1);
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
