import { chromium, APP_URL, shot, shotDir, appFile, fileUrl } from './_e26.mjs';
const D=shotDir();
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:900},deviceScaleFactor:2});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{localStorage.clear();
 localStorage.setItem('e26.account',JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
 localStorage.setItem('e26.ns0','E26-X');});
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>typeof S!=='undefined'&&!!S);
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} const f=document.getElementById('aiFull'); if(f){f.hidden=true;f.style.display='none';}
  document.body.classList.remove('ai-open','onboarding'); hideModal();
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.sleepAsked=todayStr();
  S.prefs=Object.assign({},S.prefs,{sleepPrompt:false,barMode:"total",barWeight:45});
  S.splitId=DEFAULT_SPLIT; applySplit();
  const DAY=86400e3, now=Date.now();
  for(let k=20;k>=1;k-=2){
    const wid=ROTATION[k%ROTATION.length];
    const s2={id:"s"+k, workoutId:wid, date:new Date(now-k*DAY).toLocaleDateString("en-CA"),
      startedAt:now-k*DAY, finishedAt:now-k*DAY+3600e3, feel:4,
      entries:(S.program[wid]||[]).slice(0,4).map(e=>({name:e.name, reps:e.reps, barAdd:45,
        sets:[0,1].map(()=>({weight:"110",reps:"12",rpe:"8",done:true}))}))};
    sweepSessionPRs(s2); s2.quality=scoreWorkout(s2); S.sessions.push(s2);
  }
  save(); TAB="body"; render();
});
await p.waitForTimeout(700);
const weak = await p.evaluate(()=> (bodyAnalysis().weak||[]).map(w=>({muscle:w.muscle, kind:w.kind})));
const list = ()=> p.evaluate(()=>[...document.querySelectorAll('#app [data-wp]')].map(b=>b.textContent.replace(/\s+/g,' ').trim()));
console.log('1 · THE LIST AS IT STANDS');
console.log('  ', JSON.stringify(await list(), null, 0));
const first = await p.evaluate(()=>{ const a=bodyAnalysis(); return {m:a.weak[0].muscle, k:a.weak[0].kind, sev:a.weak[0].sev, act:a.weak[0].act}; });
console.log('   quieting:', JSON.stringify(first));

console.log('\n2 · THE CARD OFFERS IT, AND SAYS WHAT BRINGS IT BACK');
await p.evaluate(()=>openWeakPoint(0));
await p.waitForTimeout(350);
const card = await p.evaluate(()=>document.getElementById('modal').innerText);
const i = card.indexOf('NOT NOW');
console.log('  ', card.slice(i, i+320).replace(/\n+/g,' '));
console.log('   button present:', await p.evaluate(()=>!!document.getElementById('wdQuiet')));

console.log('\n3 · PRESSING IT TAKES THAT ONE LINE OUT');
await p.evaluate(()=>document.getElementById('wdQuiet').onclick());
await p.waitForTimeout(400);
console.log('  ', JSON.stringify(await list()));
console.log('   stored:', JSON.stringify(await p.evaluate(()=>S.quiet)));
console.log('   still analysed:', await p.evaluate(()=>{const a=bodyAnalysis(); return (a.weak.quiet||[]).length;}));

console.log('\n4 · IT IS LISTED AND CAN BE BROUGHT BACK');
console.log('   footer:', await p.evaluate(()=>{const b=document.querySelector('[data-sec="wpquiet"]'); return b? b.textContent.trim() : 'MISSING';}));
await p.evaluate(()=>{ document.querySelector('[data-sec="wpquiet"]').click(); });
await p.waitForTimeout(350);
console.log('   row:', await p.evaluate(()=>{const b=document.querySelector('[data-unquiet]'); return b? b.textContent.replace(/\s+/g,' ').trim() : 'MISSING';}));

console.log('\n5 · IT COMES BACK WHEN IT GETS WORSE');
const worse = await p.evaluate(()=>{
  const k = Object.keys(S.quiet)[0];
  S.quiet[k].band = 1;                       // pretend it was put down as "minor"
  const a = bodyAnalysis();
  const still = (a.weak.quiet||[]).length, shown = a.weak.length;
  return {band:S.quiet[k].band, hiddenNow:still, shownNow:shown,
          sevOfThat:(a.weak.concat(a.weak.quiet||[]).find(w=>w.muscle+'|'+w.kind===k)||{}).sev};
});
console.log('  ', JSON.stringify(worse));

console.log('\n6 · AND WHEN THE BLOCK RUNS OUT');
const expired = await p.evaluate(()=>{
  const k = Object.keys(S.quiet)[0];
  S.quiet[k].band = 3; S.quiet[k].at = Date.now() - 57*86400e3;
  const before = (bodyAnalysis().weak.quiet||[]).length;
  quietClean();
  return {hiddenAfterExpiry: before, recordsLeft: Object.keys(S.quiet).length};
});
console.log('  ', JSON.stringify(expired));
await p.evaluate(()=>{ TAB='body'; render(); });
await p.waitForTimeout(400);
console.log('   list restored:', JSON.stringify(await list()));

console.log('\n7 · BRING BACK BY HAND');
await p.evaluate(()=>{ FIX=null; openWeakPoint(0); });
await p.waitForTimeout(300);
await p.evaluate(()=>document.getElementById('wdQuiet').onclick());
await p.waitForTimeout(350);
await p.evaluate(()=>{ if(!BODY_OPEN.wpquiet) document.querySelector('[data-sec="wpquiet"]').click(); });
await p.waitForTimeout(300);
await p.evaluate(()=>{ document.querySelector('[data-unquiet]').onclick(); });
await p.waitForTimeout(400);
console.log('   after undo:', JSON.stringify(await p.evaluate(()=>S.quiet)), JSON.stringify(await list()));
await p.screenshot({path:D+'quiet.png', fullPage:true});
console.log('\nerrors:', errs);
await b.close();
