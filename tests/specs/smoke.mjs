import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
p.on('console',m=>{ if(m.type()==='error') errs.push('console: '+m.text().slice(0,160)); });
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
  S.tourDone=true; S.geo='off'; S.prefs=Object.assign({},S.prefs,{sleepPrompt:false}); S.sleepAsked=todayStr();
  let i=0;
  for(let d=40; d>=2; d--){ if(d%3===2) continue;
    const wid=ROTATION[(i++)%ROTATION.length]; const prog=(S.program[wid]||[]);
    S.sessions.push({id:"s"+d,date:dayStr(Date.now()-d*86400e3),workoutId:wid,
      startedAt:Date.now()-d*86400e3,finishedAt:Date.now()-d*86400e3+3300e3,feel:3,
      entries:prog.map((e,k)=>({name:e.name,sets:Array.from({length:e.sets||3},(_,j)=>
        ({weight:String(80+k*10+j), reps:String(12-j), rpe:String(7+j*0.5), done:true, rest:120}))}))}); }
  S.checkins=[{date:todayStr(), sleepH:7, energy:3, soreness:2}];
  save();
});
const tabs=['today','history','body','program','sync'];
for(const t of tabs){
  await p.evaluate(x=>{ TAB=x; render(); }, t);
  await p.waitForTimeout(500);
  console.log(t.padEnd(9), 'errors so far:', errs.length);
}
console.log('\n--- opening every settings section ---');
for(const k of await p.evaluate(()=>[...document.querySelectorAll('[data-setopen]')].map(x=>x.dataset.setopen))){
  await p.evaluate(x=>{ TAB='sync'; SET_PAGE=null; render();
    const b=document.querySelector('[data-setopen="'+x+'"]'); if(b) b.click(); }, k);
  await p.waitForTimeout(350);
  process.stdout.write('  '+k+'('+errs.length+')');
}
console.log('\n\n--- body tab drill-downs ---');
await p.evaluate(()=>{ TAB='body'; SET_PAGE=null; render(); });
await p.waitForTimeout(400);
for(const g of await p.evaluate(()=>GKEYS)){
  await p.evaluate(x=>{ hideModal(); openGroupDetail(x); }, g);
  await p.waitForTimeout(90);
}
console.log('after 21 muscle sheets:', errs.length);
await p.evaluate(()=>hideModal());
console.log('\n--- weak point sheets + fix panels ---');
const n = await p.evaluate(()=>bodyAnalysis().weak.length);
for(let i=0;i<n;i++){
  await p.evaluate(j=>{ hideModal(); openWeakPoint(j); }, i);
  await p.waitForTimeout(150);
  await p.evaluate(j=>{ FIX=null; try{openOwnFix(j)}catch(e){} }, i);
  await p.waitForTimeout(200);
  for(const m of ['own','one','spread','swap']){
    await p.evaluate(x=>{ const b=document.querySelector('[data-fxm="'+x+'"]'); if(b) b.click(); }, m);
    await p.waitForTimeout(150);
  }
}
console.log('after', n, 'findings x 4 fix modes:', errs.length);
console.log('\n================ PAGE ERRORS ================');
console.log(errs.length ? [...new Set(errs)].join('\n') : '(none)');
await b.close();
