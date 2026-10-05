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
await p.evaluate(()=>{ S.splitId=DEFAULT_SPLIT; applySplit(); startWorkout(ROTATION[0]); TAB="workout"; save(); render(); });
await p.waitForTimeout(500);
const name = await p.evaluate(()=>S.active.entries[0].name);
console.log('1 · THE BUTTON IS THERE, NAMED');
console.log('   exercise:', name);
console.log('   the third button is gone:', await p.evaluate(()=>!document.querySelector('[data-addlp]')));
console.log('   "+ set" opens the picker:', await p.evaluate(async ()=>{
  openAddSetMenu(document.querySelector('[data-addset]'), parseInt(document.querySelector('[data-addset]').dataset.addset,10));
  await new Promise(r=>setTimeout(r,150));
  return [...document.querySelectorAll('[data-ddk]')].map(b=>b.textContent.replace(/\s+/g,' ').trim().slice(0,22));
}));
const before = await p.evaluate(()=>S.active.entries[0].sets.length);

console.log('\n2 · PRESSING IT ADDS ONE SET, MARKED');
await p.evaluate(()=>{ const b=document.querySelector('[data-ddk="lengthened"]'); b.onclick(); });
await p.waitForTimeout(400);
console.log('  ', JSON.stringify(await p.evaluate(()=>({
  was: null, now: S.active.entries[0].sets.length,
  last: S.active.entries[0].sets[S.active.entries[0].sets.length-1],
  othersUntouched: S.active.entries[0].sets.slice(0,-1).every(x=>!setTechOf(S.active.entries[0], S.active.entries[0].sets.indexOf(x)))
}))), 'before was', before);

console.log('\n3 · THE ROW SAYS WHAT IT IS');
console.log('  ', await p.evaluate(()=>{
  const tags=[...document.querySelectorAll('.set-tag')].map(x=>x.textContent.replace(/\s+/g,' ').trim());
  return tags;
}));
console.log('   prescription on that set:', JSON.stringify(await p.evaluate(()=>{
  const en=S.active.entries[0], n=en.sets.length-1;
  const rx=setPrescription(en,n);
  return {techLabel:rx.techLabel, lpWhere:rx.lpWhere, gov:setGovernor(en,n)};
})));
console.log('   a normal set is untouched:', JSON.stringify(await p.evaluate(()=>{
  const en=S.active.entries[0];
  return {techLabel:setPrescription(en,0).techLabel||"", gov:setGovernor(en,0)};
})));

console.log('\n4 · IT SURVIVES INTO THE LOGGED SESSION');
await p.evaluate(()=>{
  const en=S.active.entries[0];
  en.sets.forEach((st,i)=>{ st.weight="100"; st.reps= i===en.sets.length-1 ? "8" : "10"; st.rpe="8"; st.done=true;
    st.gov = setGovernor(en,i) || undefined; });
  S.active.entries.slice(1).forEach(e=> e.sets.forEach(st=>{ st.weight="50"; st.reps="10"; st.done=true; }));
  finishWorkout();
});
await p.waitForTimeout(900);
await p.evaluate(()=>{ hideModal(); });
console.log('  ', JSON.stringify(await p.evaluate(()=>{
  const s=S.sessions[S.sessions.length-1], e=s.entries[0];
  return {ex:e.name, sets:e.sets.map((x,i)=>({reps:x.reps, tech:setTechOf(e,i)||null, gov:x.gov||null}))};
})));

console.log('\n5 · A MOVEMENT ALREADY RUN AS PARTIALS DOES NOT OFFER IT');
await p.evaluate(()=>{
  startWorkout(ROTATION[1]); const en=S.active.entries[0];
  en.tech=[{k:"lengthened", all:true}]; save(); render();
});
await p.waitForTimeout(400);
console.log('   partials not offered:', await p.evaluate(()=> setKindOptions(S.active.entries[0]).every(o=>o.k!=='lengthened')));
console.log('   one badge not two:', await p.evaluate(()=>{
  const en=S.active.entries[0];
  en.sets.push({weight:"",reps:"",rpe:"",done:false,lp:true});
  return techFor(en, en.sets.length-1, en.sets.length).filter(t=>t.k==='lengthened').length;
}));
console.log('\nerrors:', errs);
await b.close();
