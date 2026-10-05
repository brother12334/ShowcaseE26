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
const run = (hist, today)=> p.evaluate(([h, t])=>{
  S.splitId=DEFAULT_SPLIT; applySplit();
  const wid=ROTATION[0], ex="Seated Leg Curl";
  S.program[wid]=[{name:ex, sets:3, reps:"12-20", rpes:[8,9,9]}];
  S.sessions = h.map((sets,i)=>({id:"s"+i, workoutId:wid,
    date:new Date(Date.now()-(30-i*7)*86400e3).toLocaleDateString("en-CA"),
    startedAt:Date.now()-(30-i*7)*86400e3, finishedAt:Date.now()-(30-i*7)*86400e3+3600e3, feel:4,
    entries:[{name:ex, reps:"12-20", sets:sets.map(x=>({weight:String(x[0]),reps:String(x[1]),rpe:"8",done:true}))}]}));
  save();
  if(S.active) S.active=null;
  startWorkout(wid); PF=null; save();
  const en=S.active.entries[0];
  en.sets=[{weight:String(t[0]), reps:String(t[1]), rpe:"8", done:true}];
  const pr = detectPR(ex, en.sets[0], 0, 0);
  en.sets[0].pr = pr || undefined;
  return {pr: pr||"(none)", note: prNoteFor(ex, en.sets[0], 0, 0) || "(none)"};
}, [hist, today]);

console.log("YOUR CASE — last session 160x3, 160x10, 160x11; today 160x12");
console.log('  ', JSON.stringify(await run([[[160,3],[160,10],[160,11]]], [160,12])));
console.log("\nSAME, BUT A HEAVIER SET EXISTS IN HISTORY (180x2)");
console.log('  ', JSON.stringify(await run([[[180,2]],[[160,3],[160,10],[160,11]]], [160,12])));
console.log("\nA GENUINELY HEAVIER SET");
console.log('  ', JSON.stringify(await run([[[160,10],[160,11]]], [170,8])));
console.log("\nNOTHING BEATEN");
console.log('  ', JSON.stringify(await run([[[160,10],[160,12]]], [160,9])));
console.log("\nBODYWEIGHT REPS");
console.log('  ', JSON.stringify(await run([[[0,14]]], [0,16])));
console.log('\nerrors:', errs);
await b.close();
