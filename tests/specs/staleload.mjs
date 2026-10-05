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
  S.tourDone=true; S.geo='off';
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, barMode:'plates', plateStep:2.5});
  S.sleepAsked=todayStr(); save();
});
const seed = (progression)=> p.evaluate(pg=>{
  S.splitId=DEFAULT_SPLIT; applySplit();
  const wid = ROTATION[0], ex = "Seated Cable Row";
  S.program[wid] = [{name:ex, sets:3, reps:"8-12", rpes:[7,8,9], weight:65,
                     rebuild:{at: Date.now()-5*86400e3, from:8, top:12, weight:45}}];
  const sess = {id:"s1", workoutId:wid, date:new Date(Date.now()-12*86400e3).toLocaleDateString("en-CA"),
    startedAt:Date.now()-12*86400e3, finishedAt:Date.now()-12*86400e3+3600e3, feel:4,
    progression: pg,
    entries:[{name:ex, reps:"8-12", sets:[
      {weight:"50",reps:"16",rpe:"6",done:true},
      {weight:"60",reps:"17",rpe:"6.5",done:true},
      {weight:"70",reps:"17",rpe:"8",done:true}]}]};
  S.sessions=[sess]; save();
  if(S.active) S.active=null;
  startWorkout(wid); PF=null; TAB="workout"; save(); render();
  const en = S.active.entries[0], ctx = {workoutId: wid, anyDay:false, occ:0};
  const lastSets = (lastEntryFor(wid, ex, false, 0)||{}).sets;
  return {
    rebuildLine: rebuildLineHTML(en).replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim() || "(none)",
    repTargets: en.sets.map((st,i)=> setPrescription(en,i).reps),
    loads: en.sets.map((st,i)=> String(planLoadPh(en, lastSets, i))),
    warm: warmWorkingLoad(en, ctx),
    rungs: warmupPlan(en, "full", ctx).map(x=>x.label+" x"+x.reps)
  };
}, progression);

console.log('1 · A REBUILD FLAG LEFT OVER FROM A LIGHTER LOAD');
console.log('  ', JSON.stringify(await seed([]), null, 0));

console.log('\n2 · A STALE "NEXT LOAD" BELOW WHAT THAT SESSION ACTUALLY LIFTED');
console.log('  ', JSON.stringify(await seed([{kind:"up", name:"Seated Cable Row", to:45}]), null, 0));

console.log('\n3 · A GENUINE RAISE STILL LEADS THE RAMP');
console.log('  ', JSON.stringify(await seed([{kind:"up", name:"Seated Cable Row", to:80}]), null, 0));

console.log('\n4 · AND A REBUILD THAT MATCHES THE CURRENT LOAD STILL SPEAKS');
console.log('  ', JSON.stringify(await p.evaluate(()=>{
  const ex="Seated Cable Row", e=findProgramEntry(ex);
  e.rebuild = {at: Date.now()-5*86400e3, from:8, top:12, weight:65};
  if(S.active) S.active=null;
  startWorkout(ROTATION[0]); PF=null; save(); render();
  const en=S.active.entries[0];
  return {line: rebuildLineHTML(en).replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim() || "(none)",
          repTargets: en.sets.map((st,i)=> setPrescription(en,i).reps)};
}), null, 0));
console.log('\nerrors:', errs);
await b.close();
