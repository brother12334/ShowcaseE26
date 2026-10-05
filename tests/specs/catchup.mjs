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
const judge = (planW, sets, reps)=> p.evaluate(([pw, ss, rr])=>{
  S.splitId=DEFAULT_SPLIT; applySplit();
  const wid=ROTATION[0], ex="Barbell Bench Press";
  S.program[wid]=[{name:ex, sets:ss.length, reps:rr, rpes:[8,8,8], weight:pw}];
  S.sessions=[]; save();
  const sess={id:"t", workoutId:wid, date:todayStr(), startedAt:Date.now()-3600e3, finishedAt:Date.now(), feel:4,
    entries:[{name:ex, reps:rr, rpes:[8,8,8],
      sets: ss.map(x=>({weight:String(x[0]), reps:String(x[1]), rpe:x[2]==null?"":String(x[2]), done:true}))}]};
  const v = progressionFor(sess, sess.entries[0]);
  return v ? {kind:v.kind, to:v.to, from:v.from, msg:v.msg||"", sub:v.sub||""} : null;
}, [planW, sets, reps]);

console.log('1 · HEAVIER THAN THE PLAN, REPS IN RANGE, AT TARGET RPE');
console.log('  ', JSON.stringify(await judge(65, [[70,9,8],[70,9,8],[70,8,8]], "8-12"), null, 0));
console.log('\n2 · SAME, BUT IT COST RPE 10 — NOT A NEW WORKING WEIGHT');
console.log('  ', JSON.stringify(await judge(65, [[70,9,10],[70,9,10],[70,8,10]], "8-12"), null, 0));
console.log('\n3 · HEAVIER BUT SHORT OF THE RANGE');
console.log('  ', JSON.stringify(await judge(65, [[70,6,8],[70,5,8],[70,5,8]], "8-12"), null, 0));
console.log('\n4 · CLEARED THE TOP — A REAL RAISE STILL WINS');
console.log('  ', JSON.stringify(await judge(65, [[70,12,8],[70,12,8],[70,12,8]], "8-12"), null, 0));
console.log('\n5 · AT THE PLANNED LOAD — NOTHING TO CATCH UP');
console.log('  ', JSON.stringify(await judge(65, [[65,9,8],[65,9,8],[65,9,8]], "8-12"), null, 0));
console.log('\n6 · A BACK-OFF SET LAST DOES NOT HIDE THE WORKING LOAD');
console.log('  ', JSON.stringify(await judge(65, [[75,9,8],[75,9,8],[50,12,7]], "8-12"), null, 0));
console.log('\n7 · NO RPE LOGGED COUNTS AS MEETING IT');
console.log('  ', JSON.stringify(await judge(65, [[70,9,null],[70,9,null],[70,9,null]], "8-12"), null, 0));

console.log('\n8 · THE CARD OFFERS IT, AND APPLYING WRITES THE PLAN');
console.log('  ', JSON.stringify(await p.evaluate(()=>{
  const wid=ROTATION[0], ex="Barbell Bench Press";
  S.program[wid]=[{name:ex, sets:3, reps:"8-12", rpes:[8,8,8], weight:65}];
  const sess={id:"t2", workoutId:wid, date:todayStr(), startedAt:Date.now()-3600e3, finishedAt:Date.now(), feel:4,
    entries:[{name:ex, reps:"8-12", rpes:[8,8,8], sets:[
      {weight:"70",reps:"9",rpe:"8",done:true},{weight:"70",reps:"9",rpe:"8",done:true},{weight:"70",reps:"8",rpe:"8",done:true}]}]};
  sess.progression=[progressionFor(sess, sess.entries[0])];
  S.sessions=[sess]; save();
  openScoreCard(sess);
  const m=document.getElementById('modal');
  const head=[...m.querySelectorAll('.rev-head')].map(x=>x.textContent.trim());
  const btn=m.querySelector('[data-progapply]');
  return {heads:head, button: btn? btn.textContent.trim()+' -> '+btn.dataset.progto : 'MISSING'};
}), null, 0));
await p.waitForTimeout(400);
await p.screenshot({path:D+'catchup.png', fullPage:true});
await p.evaluate(()=>document.querySelector('#modal [data-progapply]').onclick());
await p.waitForTimeout(500);
console.log('   plan weight now:', await p.evaluate(()=>findProgramEntry("Barbell Bench Press").weight));
console.log('   card now says  :', JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('#modal .rev-head')].map(x=>x.textContent.trim()))));
console.log('   plan log       :', JSON.stringify(await p.evaluate(()=>(S.planLog||[]).slice(-1).map(c=>c.kind+": "+JSON.stringify(c.changes)))));
console.log('\nerrors:', errs);
await b.close();
