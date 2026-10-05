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
const order = ()=> p.evaluate(()=> (S.program[ROTATION[0]]||[]).map(e=>e.name));

console.log('1 · A SESSION WHERE THE LAST LIFT WENT BACKWARDS');
const built = await p.evaluate(()=>{
  S.splitId=DEFAULT_SPLIT; applySplit();
  const wid=ROTATION[0], now=Date.now(), prog=S.program[wid];
  const mk=(off, drop)=>({id:"g"+off, workoutId:wid,
    date:new Date(now-off*86400e3).toLocaleDateString("en-CA"),
    startedAt:now-off*86400e3-3600e3, finishedAt:now-off*86400e3, feel:4,
    entries: prog.map((e,i)=>({name:e.name, reps:e.reps, barAdd:0,
      sets:Array.from({length:e.sets||3},(_,k)=>({
        weight: String(i >= prog.length-3 ? (drop?90:100) : (drop?115:100)),
        reps:"10", rpe:"8", done:true, rest: k? 120 : undefined}))}))});
  S.sessions=[mk(9,false), mk(2,true)];
  S.sessions.forEach(s=> s.quality=scoreWorkout(s));
  save(); TAB="today"; render();
  const adv=S.sessions[1].quality.advice||[];
  return {all: adv.map(x=>({label:x.label, lost:x.lost, ex:x.ex, fix:x.fix})),
          top:{label:(adv[0]||{}).label, ex:(adv[0]||{}).ex, fix:(adv[0]||{}).fix}};
});
console.log('  ', JSON.stringify(built, null, 0));
console.log('   order before:', JSON.stringify(await order()));

console.log('\n2 · THE ROW OFFERS TO DO IT');
await p.waitForTimeout(400);
await p.evaluate(()=>{ document.querySelectorAll('.nt-r').forEach(d=> d.open=true); });
await p.waitForTimeout(300);
console.log('   button:', await p.evaluate(()=>{
  const b=document.querySelector('#app [data-focusfix]');
  return b ? b.textContent.trim()+" | "+(b.parentElement.querySelector('.fc-do-say')||{}).textContent : 'MISSING'; }));
await p.screenshot({path:D+'focusfix.png'});

console.log('\n3 · PRESSING IT MOVES THE MOVEMENT ONE PLACE EARLIER');
await p.evaluate(()=>document.querySelector('#app [data-focusfix]').onclick());
await p.waitForTimeout(600);
console.log('   order after :', JSON.stringify(await order()));
console.log('   logged      :', JSON.stringify(await p.evaluate(()=>(S.planLog||[]).slice(-1).map(c=>({kind:c.kind, name:c.name, changes:c.changes, undo:c.undo})))));

console.log('\n4 · AND IT IS IN WHAT CHANGED, WITH A WAY BACK');
console.log('   listed:', await p.evaluate(()=>(S.planLog||[]).filter(planChangeBig).length));
console.log('   revertable:', await p.evaluate(()=>planRevertable((S.planLog||[]).slice(-1)[0])));
await p.evaluate(()=>planRevert((S.planLog||[]).filter(c=>c.kind==="programme").slice(-1)[0].at));
await p.waitForTimeout(300);
console.log('   order back  :', JSON.stringify(await order()));

console.log('\n5 · A TIP WITH NO UNAMBIGUOUS ACTION OFFERS NOTHING');
console.log('  ', JSON.stringify(await p.evaluate(()=>{
  const a={key:"rest", label:"Rest discipline", ex:"Barbell Bench Press", fix:null, text:"Rest longer."};
  return {none: focusFixFor(a, ROTATION[0]),
          alsoNoneWithoutEx: focusFixFor({key:"overload", fix:{k:"earlier"}, ex:null}, ROTATION[0]),
          noneIfAlreadyFirst: focusFixFor({key:"overload", fix:{k:"earlier"}, ex:(S.program[ROTATION[0]][0]||{}).name}, ROTATION[0])};
}), null, 0));
console.log('\nerrors:', errs);
await b.close();
