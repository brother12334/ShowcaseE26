import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b=await chromium.launch();
const p=await b.newPage({viewport:{width:390,height:900},deviceScaleFactor:2});
p.on('pageerror',e=>console.log('ERR',e.message)); p.on('dialog',d=>d.accept());
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
  // make chest lag: strip the pressing volume right down
  DAYS.forEach(w=>{ (S.program[w]||[]).forEach(e=>{ const mm=musclesFor(e.name)||{};
    if(mm.chest) e.sets=1; }); });
  let i=0;
  for(let d=20; d>=2; d--){ if(d%3===2) continue;
    const wid=ROTATION[(i++)%ROTATION.length]; const prog=(S.program[wid]||[]);
    S.sessions.push({id:"s"+d,date:dayStr(Date.now()-d*86400e3),workoutId:wid,
      startedAt:Date.now()-d*86400e3,finishedAt:Date.now()-d*86400e3+3300e3,feel:3,
      entries:prog.map((e,k)=>({name:e.name,
        sets:Array.from({length:e.sets||3},()=>({weight:String(100+k*10),reps:"9",rpe:"8",done:true,rest:120}))}))}); }
  save(); TAB='body'; render();
});
await p.waitForTimeout(400);
const idx = await p.evaluate(()=>bodyAnalysis().weak.findIndex(w=>w.muscle==='chest'));
console.log('chest finding at', idx, '=', await p.evaluate(i=>bodyAnalysis().weak[i].act, idx));
await p.evaluate(i=>{FIX=null; openOwnFix(i); { {const _c=document.querySelector('[data-fxalt="custom"]'); if(_c) _c.click();} const _o=document.getElementById('fxOpen'); if(_o && !document.querySelector('[data-fxm]')) _o.onclick();
  const _m=[...document.querySelectorAll('[data-fxm]')].filter(x=>x.dataset.fxm==='own')[0];
  if(_m) _m.onclick(); }}, idx);
await p.waitForTimeout(400);
console.log('\n--- "Add a movement" now opens on what you already do ---');
console.log(await p.evaluate(()=>document.querySelector('#fxBody').innerText.slice(0,900)));
await p.screenshot({path:shot('inplan.png')});

console.log('\n--- tapping the top one jumps into "Add sets to one" ---');
await p.evaluate(()=>document.querySelector('[data-fxuse="0"]').click());
await p.waitForTimeout(350);
console.log('mode now:', await p.evaluate(()=>FIX.mode), '| pick:', await p.evaluate(()=>FIX.pick));
console.log('tab highlighted:', await p.evaluate(()=>[...document.querySelectorAll('[data-fxm]')].find(x=>x.classList.contains('on')).innerText));
const t = await p.evaluate(()=>document.querySelector('#modal').innerText);
console.log(t.slice(t.indexOf('Which movement takes them')).slice(0,500));

console.log('\n--- and applying edits the entry, it does not duplicate it ---');
const before = await p.evaluate(()=>JSON.stringify((S.program[DAYS[0]]||[]).map(e=>e.name+':'+e.sets)));
await p.evaluate(()=>{ const b=[...document.querySelectorAll('#modal button')].find(x=>/^apply it$/i.test(x.innerText.trim())); b&&b.click(); });
await p.waitForTimeout(500);
console.log('chest entries across the plan:');
console.log(await p.evaluate(()=>{ const o=[]; DAYS.concat(['finisher']).forEach(w=>(S.program[w]||[]).forEach(e=>{
  const mm=musclesFor(e.name)||{}; if(mm.chest) o.push('  '+widName(w)+' · '+e.name+' × '+e.sets); })); return o.join('\n'); }));
console.log('duplicate names:', await p.evaluate(()=>{ const seen={},dup=[]; DAYS.concat(['finisher']).forEach(w=>(S.program[w]||[]).forEach(e=>{
  const k=w+'|'+nrm(e.name); if(seen[k]) dup.push(k); seen[k]=1; })); return dup.length?dup:'none'; }));
await b.close();
