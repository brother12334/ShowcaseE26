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
await p.evaluate(()=>{ S.splitId=DEFAULT_SPLIT; applySplit(); startWorkout(ROTATION[0]); PF=null; TAB="workout"; save(); render(); });
await p.waitForTimeout(500);
const pad = ()=> p.evaluate(()=>({cls: document.body.className, pad: getComputedStyle(document.body).paddingBottom,
  pill: !!document.querySelector('.rest-mini')}));
console.log('1 · NO CLOCK:', JSON.stringify(await pad()));
await p.evaluate(()=>{ S.active.restTimer={startedAt:Date.now(), target:90, ei:0, si:0}; showRestUI(true); });
await p.waitForTimeout(400);
console.log('2 · PILL UP  :', JSON.stringify(await pad()));
await p.evaluate(()=>showRestUI(false));
await p.waitForTimeout(400);
console.log('3 · FULLSCREEN:', JSON.stringify(await pad()));
await p.evaluate(()=>showRestUI(true));
await p.waitForTimeout(300);
await p.evaluate(()=>hideRestUI());
await p.waitForTimeout(400);
console.log('4 · STOPPED  :', JSON.stringify(await pad()));
// and the last control row can now be scrolled clear of where the pill sits
await p.evaluate(()=>{ S.active.restTimer={startedAt:Date.now(), target:90, ei:0, si:0}; showRestUI(true); });
await p.waitForTimeout(400);
await p.evaluate(()=>window.scrollTo(0, document.body.scrollHeight));
await p.waitForTimeout(500);
console.log('5 · LAST ROW CLEARS THE PILL:', JSON.stringify(await p.evaluate(()=>{
  const rows=[...document.querySelectorAll('[data-addset]')].map(b=>b.closest('div'));
  const last=rows[rows.length-1]; if(!last) return 'no rows';
  const r=last.getBoundingClientRect(), pRect=document.querySelector('.rest-mini').getBoundingClientRect();
  const overlap = !(r.bottom < pRect.top || r.top > pRect.bottom || r.right < pRect.left || r.left > pRect.right);
  return {rowTop:Math.round(r.top), rowBottom:Math.round(r.bottom), pillTop:Math.round(pRect.top), overlap};
})));
console.log('errors:', errs);
await b.close();
