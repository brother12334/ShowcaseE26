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
const built = await p.evaluate(()=>{
  S.splitId=DEFAULT_SPLIT; applySplit();
  const wid=ROTATION[0], now=Date.now();
  const s={id:"g1", workoutId:wid, date:new Date(now-2*86400e3).toLocaleDateString("en-CA"),
    startedAt:now-2*86400e3-3600e3, finishedAt:now-2*86400e3, feel:4,
    entries:(S.program[wid]||[]).map(e=>({name:e.name, reps:e.reps,
      sets:Array.from({length:e.sets||3},()=>({weight:"100",reps:"20",rpe:"6",done:true}))}))};
  S.sessions=[s]; s.quality=scoreWorkout(s); save(); TAB="today"; render();
  const a=(s.quality.advice||[])[0];
  const n=focusNote(wid);
  return {worst:{label:a&&a.label, ex:a&&a.ex, lost:a&&a.lost},
          line: n ? n.line : null};
});
console.log('1 · THE ROW NOW CARRIES THE INSTRUCTION');
console.log('   worst section:', JSON.stringify(built.worst));
console.log('   line raw     :', built.line);
console.log('   line text    :', (built.line||"").replace(/<[^>]+>/g,''));

await p.waitForTimeout(400);
await p.evaluate(()=>{ document.querySelectorAll('.nt-r').forEach(d=> d.open=true); });
await p.waitForTimeout(300);
console.log('\n2 · AND THE NAME IS A JUMP');
console.log('   jump present:', await p.evaluate(()=>{
  const b=document.querySelector('#app [data-exjump]'); return b? b.dataset.exjump : 'none (advice has no exercise)'; }));
console.log('   target row  :', await p.evaluate(()=>{
  const b=document.querySelector('#app [data-exjump]'); if(!b) return 'n/a';
  const key=nrm(b.dataset.exjump);
  const r=[...document.querySelectorAll('#app [data-exrow]')].find(x=>x.dataset.exrow===key);
  return r? r.innerText.replace(/\s+/g,' ').trim().slice(0,40) : 'NOT FOUND'; }));
console.log('   flashes on tap:', await p.evaluate(async ()=>{
  const b=document.querySelector('#app [data-exjump]'); if(!b) return 'n/a';
  b.onclick(new Event('click'));
  await new Promise(r=>setTimeout(r,150));
  return !!document.querySelector('.ex-head.fc-hit'); }));
await p.waitForTimeout(500);
await p.screenshot({path:D+'focusjump.png'});
console.log('\n3 · THE SCREEN READS');
console.log(await p.evaluate(()=>{
  const r=[...document.querySelectorAll('.nt-r')].find(x=>/last /i.test(x.textContent));
  return r? r.innerText.replace(/\n+/g,' | ') : 'MISSING'; }));
console.log('\nerrors:', errs);
await b.close();
