import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:844}});
p.on('pageerror',e=>console.log('ERR',e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{localStorage.clear();
 localStorage.setItem('e26.account',JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
 localStorage.setItem('e26.ns0','E26-X');});
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>typeof S!=='undefined'&&!!S);
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} document.body.classList.remove('ai-open','onboarding'); hideModal();
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.prefs=Object.assign({},S.prefs,{sleepPrompt:false}); S.sleepAsked=todayStr();
  let i=0;
  for(let d=20; d>=2; d--){ if(d%3===2) continue;
    const wid=ROTATION[(i++)%ROTATION.length]; const prog=(S.program[wid]||[]).slice(0,4);
    S.sessions.push({id:"s"+d,date:dayStr(Date.now()-d*86400e3),workoutId:wid,
      startedAt:Date.now()-d*86400e3,finishedAt:Date.now()-d*86400e3+3300e3,feel:3,
      entries:prog.map((e,k)=>({name:e.name,sets:[0,1,2].map(()=>({weight:String(100+k*15),reps:"9",rpe:"8",done:true,rest:120}))}))}); }
  save(); TAB='body'; render();
});
await p.waitForTimeout(400);
const idx = await p.evaluate(()=>bodyAnalysis().weak.findIndex(w=>w.muscle==='neck'));
await p.evaluate(i=>{ FIX=null; openOwnFix(i); { {const _c=document.querySelector('[data-fxalt="custom"]'); if(_c) _c.click();} const _o=document.getElementById('fxOpen'); if(_o && !document.querySelector('[data-fxm]')) _o.onclick();
  const _m=[...document.querySelectorAll('[data-fxm]')].filter(x=>x.dataset.fxm==='own')[0];
  if(_m) _m.onclick(); } }, idx);
await p.waitForTimeout(300);
console.log('--- pick Neck Curl ---');
await p.evaluate(()=>{ const b=[...document.querySelectorAll('#modal button')].find(x=>/^Neck Curl/.test(x.innerText.trim())); b.click(); });
await p.waitForTimeout(350);
const t = await p.evaluate(()=>document.querySelector('#modal').innerText);
console.log(t.slice(t.indexOf('HOW MANY SETS')));
console.log('\n--- apply it ---');
console.log('button:', await p.evaluate(()=>{ const b=[...document.querySelectorAll('#modal button')].find(x=>/^apply it$/i.test(x.innerText.trim())); if(!b) return 'NOT FOUND'; b.click(); return b.innerText; }));
await p.waitForTimeout(500);
console.log('neck in plan now:', await p.evaluate(()=>{
  const hits=[]; DAYS.concat(['finisher']).forEach(w=>(S.program[w]||[]).forEach(e=>{
    const m=musclesFor(e.name); if(m&&m.neck) hits.push(dayName(w)+': '+e.name+' x'+(e.rpes?e.rpes.length:e.sets)); })); return hits.join(', ')||'none';}));
console.log('neck still flagged?', await p.evaluate(()=>bodyAnalysis().weak.some(w=>w.muscle==='neck')));
await b.close();
