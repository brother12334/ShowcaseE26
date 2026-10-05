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
const page = ()=> p.evaluate(()=>{
  const blk=[...document.querySelectorAll('.set-block')].find(x=>/bar weighs/i.test(x.textContent));
  const ch=[...document.querySelectorAll('[data-prefbar]')].map(b=>b.textContent.replace(/\s+/g,' ').trim());
  return {examples: ch,
          chips: blk ? [...blk.querySelectorAll('[data-prefbarw]')].map(b=>b.textContent.trim()+(b.classList.contains('on')?" ✓":"")) : null,
          box: !!document.getElementById('prefBarW'),
          pref: trainPrefs().barWeight};
});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} const f=document.getElementById('aiFull'); if(f){f.hidden=true;f.style.display='none';}
  document.body.classList.remove('ai-open','onboarding'); hideModal();
  S.splitId=DEFAULT_SPLIT; applySplit();
  S.prefs=Object.assign({}, S.prefs, {barMode:"total", barWeight:25});
  save(); TAB="sync"; SET_PAGE="gym"; render(); });
await p.waitForTimeout(500);
console.log('1 · A 25 LB BAR — THE EXAMPLE FOLLOWS IT');
console.log(JSON.stringify(await page(), null, 1));
await p.screenshot({path:D+'barpick.png'});

console.log('\n2 · TAP 45');
await p.evaluate(()=>document.querySelector('[data-prefbarw="45"]').onclick());
await p.waitForTimeout(400);
console.log(JSON.stringify(await page(), null, 1));

console.log('\n3 · SOMETHING ELSE OPENS THE BOX');
await p.evaluate(()=>document.querySelector('[data-prefbarw="other"]').onclick());
await p.waitForTimeout(400);
console.log('   box:', await p.evaluate(()=>!!document.getElementById('prefBarW')));
await p.evaluate(()=>{ const f=document.getElementById('prefBarW'); f.value="33"; f.onchange(); });
await p.waitForTimeout(400);
console.log(JSON.stringify(await page(), null, 1));

console.log('\n4 · RATHER NOT SAY');
await p.evaluate(()=>document.querySelector('[data-prefbarw=""]').onclick());
await p.waitForTimeout(400);
console.log(JSON.stringify(await page(), null, 1));

console.log('\n5 · IN KILOS THE CHOICES CHANGE');
console.log('  ', JSON.stringify(await p.evaluate(()=>{
  trainPrefs().units="kg"; trainPrefs().barWeight=20; save(); render();
  const blk=[...document.querySelectorAll('.set-block')].find(x=>/bar weighs/i.test(x.textContent));
  return {chips: [...blk.querySelectorAll('[data-prefbarw]')].map(b=>b.textContent.trim()),
          example: document.querySelector('[data-prefbar="total"]').textContent.replace(/\s+/g,' ').trim()};
}), null, 0));
console.log('\n6 · THE SAME CONTROL IN THE BAR SHEET');
console.log('  ', JSON.stringify(await p.evaluate(()=>{
  trainPrefs().units="lb"; trainPrefs().barWeight=45; save();
  openBarModal("bar");
  const m=document.getElementById('modal');
  return {chips:[...m.querySelectorAll('[data-barmodalpick]')].map(b=>b.textContent.trim()+(b.classList.contains('on')?" \u2713":"")),
          boxHidden: m.querySelector('#barModalBox').hidden};
}), null, 0));
console.log('   tapping 35 saves it:', await p.evaluate(()=>{
  document.querySelector('[data-barmodalpick="35"]').onclick();
  return trainPrefs().barWeight; }));
console.log('   smith sheet:', JSON.stringify(await p.evaluate(()=>{
  hideModal(); trainPrefs().smithWeight=25; openBarModal("smith");
  const m=document.getElementById('modal');
  return [...m.querySelectorAll('[data-barmodalpick]')].map(b=>b.textContent.trim()+(b.classList.contains('on')?" \u2713":""));
})));
console.log('\nerrors:', errs);
await b.close();
