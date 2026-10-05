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
const probe = (planW, lastSets)=> p.evaluate(([pw, ls])=>{
  S.splitId=DEFAULT_SPLIT; applySplit();
  const wid=ROTATION[0], ex="Smith Flat Bench Press";
  S.prefs=Object.assign({}, S.prefs, {barMode:"plates", smithWeight:25});
  S.program[wid]=[{name:ex, sets:2, reps:"9-13", rpes:[6,7], weight:pw}];
  const sess={id:"s1", workoutId:wid, date:new Date(Date.now()-12*86400e3).toLocaleDateString("en-CA"),
    startedAt:Date.now()-12*86400e3-3600e3, finishedAt:Date.now()-12*86400e3, feel:4, barAdd:25,
    entries:[{name:ex, reps:"9-13", barAdd:25,
      sets: ls.map(x=>({weight:String(x[0]), reps:String(x[1]), rpe:String(x[2]), done:true}))}]};
  S.sessions=[sess]; save();
  if(S.active) S.active=null;
  startWorkout(wid); PF=null; save();
  const en=S.active.entries[0];
  const lastArr=(lastEntryFor(wid, ex, false, 0)||{}).sets;
  const ctx={workoutId:wid, anyDay:false, occ:0};
  return {barAdd: barAddendFor(ex), planLoadFor: planLoadFor(en),
          boxes: en.sets.map((st,i)=> String(planLoadPh(en, lastArr, i))),
          warmUp: warmupPlan(en, "full", ctx).map(x=>x.label)};
}, [planW, lastSets]);

const L=[[100,5,8.5],[90,7,8.5],[90,7,8.5],[90,6,9]];
console.log('1 · YOUR CASE — A PLAN WEIGHT NOBODY HAS BEEN NEAR (230, barAdd 25)');
console.log('  ', JSON.stringify(await probe(230, L), null, 0));
console.log('\n2 · A SANE PLAN THAT IS SIMPLY AHEAD BY ONE STEP');
console.log('  ', JSON.stringify(await probe(130, L), null, 0));
console.log('\n3 · A PLAN BEHIND THE LOG — THE LOG STILL WINS');
console.log('  ', JSON.stringify(await probe(90, L), null, 0));
console.log('\n4 · NO HISTORY AT ALL — THE PLAN IS ALL THERE IS');
console.log('  ', JSON.stringify(await probe(230, []), null, 0));
console.log('\nerrors:', errs);
await b.close();
