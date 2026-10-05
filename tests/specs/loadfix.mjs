import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1100}, deviceScaleFactor:2});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} const f=document.getElementById('aiFull'); if(f){f.hidden=true;f.style.display='none';}
  document.body.classList.remove('ai-open','onboarding'); hideModal();
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; save();
});

const check = (name, target, sets) => p.evaluate(({name,target,sets})=>{
  const en = {name, sets: sets.map(x=>({weight:String(x.w), reps:String(x.r), rpe:String(x.rpe), done:true}))};
  const r = impossibleLoadCheck(Object.assign({name}, target), en, {date: todayStr()});
  if(!r) return 'no finding';
  return {msg:r.msg, fix:r.fix, to:r.to, from:r.from,
          sane: r.to < r.from ? 'ok: under the plan' : 'BROKEN: not below '+r.from};
}, {name,target,sets});

console.log('THE SCREENSHOT CASE — plan 150, went heavier at 162.5 and fell short');
console.log('  ', await check('Cable Ab Crunch', {weight:150, reps:"10-15"},
   [{w:150,r:12,rpe:8},{w:162.5,r:9,rpe:9.5}]));

console.log('\nSCREENSHOT CASE 2 — plan 60, went heavier at 70 and fell short');
console.log('  ', await check('Smith Machine Squat', {weight:60, reps:"6-10"},
   [{w:70,r:3,rpe:10}]));

console.log('\nTHE GUARD STILL FIRES WHEN IT SHOULD — failed AT the prescribed load');
console.log('  ', await check('Leg Extension', {weight:85, reps:"10-15"},
   [{w:85,r:9,rpe:10}]));

console.log('\nAND ON EVIDENCE LIGHTER THAN THE PLAN (stronger proof still)');
console.log('  ', await check('Leg Extension', {weight:85, reps:"10-15"},
   [{w:80,r:8,rpe:10}]));

console.log('\nREACHED THE RANGE — no finding');
console.log('  ', await check('Leg Extension', {weight:85, reps:"10-15"},
   [{w:85,r:12,rpe:10}]));

console.log('\nerrors:', errs);
await b.close();
