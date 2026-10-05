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
await p.evaluate(()=>{ S.splitId=DEFAULT_SPLIT; applySplit();
  S.program[ROTATION[0]][0].note = "Touch the chest under control, no bounce.";
  startWorkout(ROTATION[0]); PF=null; TAB="workout"; save(); render(); });
await p.waitForTimeout(500);
const exName = await p.evaluate(()=>S.active.entries[0].name);
console.log('exercise:', exName, '| plan note:', await p.evaluate(()=>findProgramEntry(S.active.entries[0].name).note));

const writeNote = (code, text)=> p.evaluate(([c,t])=>{
  openExNote(0, null);
  const m=document.getElementById('modal');
  const chip=[...m.querySelectorAll('[data-exnk]')].find(b=>b.dataset.exnk===c);
  if(chip) chip.click(); else return 'NO CHIP '+c;
  const box=m.querySelector('#exNoteText'); box.value=t;
  m.querySelector('#exNoteSave').click();
  return 'saved';
}, [code, text]);

console.log('\n1 · A PLAIN NOTE DOES NOT ASK');
console.log('  ', await writeNote('form', 'elbows flared on the last two'));
await p.waitForTimeout(500);
console.log('   modal open:', await p.evaluate(()=>{const m=document.getElementById('modalBg'); return m && m.classList.contains('show') ? document.getElementById('modal').innerText.slice(0,60) : 'nothing asked';}));

console.log('\n2 · "DIFFERENT FORM OR TECHNIQUE" WITH WORDS ASKS');
console.log('  ', await writeNote('variation', 'wider grip, pause at the chest'));
await p.waitForTimeout(500);
console.log(await p.evaluate(()=>{const m=document.getElementById('modal'); return m? m.innerText : 'NO MODAL';}));
await p.screenshot({path:D+'plannote.png'});

console.log('\n3 · SAYING YES WRITES IT, APPENDED, AND LOGS THE EDIT');
await p.evaluate(()=>document.getElementById('pnYes').onclick());
await p.waitForTimeout(500);
console.log('   plan note now:', JSON.stringify(await p.evaluate(()=>findProgramEntry(S.active.entries[0].name).note)));
console.log('   plan log:', JSON.stringify(await p.evaluate(()=>(S.planLog||[]).slice(-1))));

console.log('\n4 · ASKED ONCE: THE SAME WORDS DO NOT ASK AGAIN');
console.log('  ', await writeNote('variation', 'wider grip, pause at the chest'));
await p.waitForTimeout(500);
console.log('   modal:', await p.evaluate(()=>{const m=document.getElementById('modalBg'); return m && m.classList.contains('show') ? document.getElementById('modal').innerText.slice(0,40) : 'nothing asked'; }));

console.log('\n5 · THE CHIP WITH NO WORDS HAS NOTHING TO CARRY');
console.log('  ', await p.evaluate(()=>{
  openExNote(0, null);
  const m=document.getElementById('modal');
  [...m.querySelectorAll('[data-exnk]')].find(b=>b.dataset.exnk==='variation').click();
  const box=m.querySelector('#exNoteText'); box.value='';
  m.querySelector('#exNoteSave').click();
  return 'saved';
}));
await p.waitForTimeout(500);
console.log('   modal:', await p.evaluate(()=>{const m=document.getElementById('modalBg'); return m && m.classList.contains('show') ? document.getElementById('modal').innerText.slice(0,40) : 'nothing asked'; }));
console.log('\nerrors:', errs);
await b.close();
