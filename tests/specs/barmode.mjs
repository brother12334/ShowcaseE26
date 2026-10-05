import { chromium, APP_URL, shot, shotDir, appFile, fileUrl } from './_e26.mjs';
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
const D=shotDir();
const state = ()=> p.evaluate(()=>({
  mode: trainPrefs().barMode,
  log: (S.sessions||[]).flatMap(s=> s.entries.map(e=>
    e.name+" barAdd="+(e.barAdd==null?"-":e.barAdd)+" sets="+e.sets.map(x=>x.weight).join(","))),
  trueLoads: (S.sessions||[]).flatMap(s=> s.entries.map(e=>
    e.name+" true="+e.sets.map(x=> setLoad(x, entryBarAdd(e))).join(","))),
  plan: (S.program[ROTATION[0]]||[]).map(e=> e.name+"="+e.weight)
}));

await p.evaluate(()=>{
  S.splitId=DEFAULT_SPLIT; applySplit();
  S.prefs=Object.assign({}, S.prefs, {barMode:"plates", barWeight:45, smithWeight:25});
  const wid=ROTATION[0];
  S.program[wid]=[{name:"Barbell Bench Press", sets:3, reps:"6-10", weight:90},
                  {name:"Dumbbell Fly", sets:3, reps:"10-15", weight:30}];
  // a session logged under PLATES (stamped barAdd 45), plus a dumbbell one (no implement)
  S.sessions=[{id:"s1", workoutId:wid, date:todayStr(), startedAt:Date.now()-3600e3, finishedAt:Date.now(), feel:4,
    entries:[{name:"Barbell Bench Press", reps:"6-10", barAdd:45,
      sets:[{weight:"90",reps:"8",done:true},{weight:"90",reps:"7",done:true}]},
      {name:"Dumbbell Fly", reps:"10-15",
      sets:[{weight:"30",reps:"12",done:true}]}]}];
  save(); TAB="sync"; SET_PAGE="gym"; render();
});
await p.waitForTimeout(500);
console.log('1 · BEFORE — logged plates only');
console.log(JSON.stringify(await state(), null, 1));

console.log('\n2 · SWITCH TO BAR + PLATES');
await p.evaluate(()=>{ document.querySelector('[data-prefbar="total"]').onclick(); });
await p.waitForTimeout(500);
console.log('   sheet:', await p.evaluate(()=>{ const m=document.getElementById('modal'); return m? m.innerText.replace(/\n+/g,' | ') : 'NONE'; }));
await p.screenshot({path:D+'barmode.png'});

console.log('\n3 · CONVERT');
await p.evaluate(()=>document.getElementById('bmGo').onclick());
await p.waitForTimeout(500);
console.log(JSON.stringify(await state(), null, 1));

console.log('\n4 · SWITCH BACK AND CONVERT AGAIN — EVERYTHING RETURNS');
const before = await state();
await p.evaluate(()=>{ document.querySelector('[data-prefbar="plates"]').onclick(); });
await p.waitForTimeout(400);
await p.evaluate(()=>{ const b=document.getElementById('bmGo'); if(b) b.onclick(); });
await p.waitForTimeout(400);
const back = await state();
console.log(JSON.stringify(back, null, 1));
console.log('\n   true loads unchanged throughout:', JSON.stringify(before.trueLoads) === JSON.stringify(back.trueLoads));

console.log('\n5 · NOTHING TO CONVERT OFFERS NOTHING');
console.log('  ', await p.evaluate(()=>{
  hideModal();
  return openBarModeConvert(trainPrefs().barMode, trainPrefs().barMode) === false ? "no sheet, correct" : "OFFERED ANYWAY";
}));
console.log('\nerrors:', errs);
await b.close();
