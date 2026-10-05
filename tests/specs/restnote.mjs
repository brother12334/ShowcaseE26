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
const note = ()=> p.evaluate(()=>{ const n=document.querySelector('#app .rest-note');
  return n ? n.textContent.replace(/\s+/g,' ').trim() : '(gone)'; });

console.log('1 · SCHEDULED RESTS, ONE TAKEN — THE USER’S CASE');
await p.evaluate(()=>{
  S.splitId=DEFAULT_SPLIT; applySplit();
  S.restDays=[new Date(Date.now()-86400e3).toLocaleDateString("en-CA")];
  S.restLog=S.restDays.slice(); S.cycleStart=Date.now()-5*86400e3;
  save(); TAB="today"; render();
});
await p.waitForTimeout(400);
console.log('   floating?', await p.evaluate(()=>restsFloat()), '| note:', await note());

console.log('\n2 · FLOATING RESTS WITH CREDITS LEFT — ALSO GONE');
await p.evaluate(()=>{ trainPrefs().restMode="floating"; save(); render(); });
await p.waitForTimeout(400);
console.log('   floating?', await p.evaluate(()=>restsFloat()),
            '| credits left:', await p.evaluate(()=>restCreditsLeft()), '| note:', await note());

console.log('\n3 · FLOATING AND ALL USED — THE ESCAPE HATCH SURVIVES');
await p.evaluate(()=>{
  const d=n=> new Date(Date.now()-n*86400e3).toLocaleDateString("en-CA");
  S.restDays=[]; for(let i=1;i<=REST_CREDITS;i++) S.restDays.push(d(i));
  S.restLog=S.restDays.slice(); save(); render();
});
await p.waitForTimeout(400);
console.log('   credits left:', await p.evaluate(()=>restCreditsLeft()), '| note:', await note());
console.log('   free-one-up wired:', await p.evaluate(()=>{ const b=document.getElementById('clearRestBtn'); return !!(b && b.onclick); }));
console.log('\nerrors:', errs);
await b.close();
