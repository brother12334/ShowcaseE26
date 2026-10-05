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
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false}); S.sleepAsked=todayStr();
  startWorkout(ROTATION[0]);
  while(S.active.entries[0].sets.length < 4) S.active.entries[0].sets.push({});
  save();
});

console.log('A · TWO CHIPS ON ONE SET');
console.log('  ', await p.evaluate(()=>{
  const a=S.active, en=a.entries[0];
  openExNote(0, 1);
  const m=document.getElementById('modal');
  m.querySelector('[data-exnk="form"]').click();
  m.querySelector('[data-exnk="tired"]').click();
  m.querySelector('#exNoteSave').click();
  return {codes: en.sets[1].noteCodes, primary: en.sets[1].noteCode,
          words: noteWords(en.sets[1]),
          logRows: notesForSession(a.id).map(n=> (n.set==null?'ALL':'set'+(n.set+1))+':'+n.code)};
}));

console.log('\nB · ONE NOTE ONTO THREE SETS AT ONCE');
console.log('  ', await p.evaluate(()=>{
  const a=S.active, en=a.entries[0];
  en.sets.forEach(st=>{ delete st.noteCode; delete st.noteCodes; delete st.unote; });
  S.exNotes=[];
  openExNote(0, 0);
  const m=document.getElementById('modal');
  m.querySelector('[data-exns="1"]').click();     // adds set 2
  m.querySelector('[data-exns="2"]').click();     // adds set 3
  const btn = m.querySelector('#exNoteSave').textContent.trim();
  m.querySelector('[data-exnk="niggle"]').click();
  m.querySelector('#exNoteText').value = "left knee clicking";
  m.querySelector('#exNoteSave').click();
  return {saveButtonSaid: btn,
          onSets: en.sets.map(st=> noteWords(st) || null),
          logRows: notesForSession(a.id).map(n=> 'set'+(n.set+1)+':'+n.code)};
}));

console.log('\nC · EXERCISE AND SETS ARE EXCLUSIVE');
console.log('  ', await p.evaluate(()=>{
  openExNote(0, 1);
  const m=document.getElementById('modal');
  m.querySelector('[data-exns="2"]').click();            // sets 2 + 3
  const two = [...m.querySelectorAll('[data-exns].on')].map(x=>x.dataset.exns);
  m.querySelector('[data-exns="all"]').click();          // exercise clears them
  const after = [...m.querySelectorAll('[data-exns].on')].map(x=>x.dataset.exns);
  hideModal();
  return {beforeExercise: two, afterExercise: after};
}));

console.log('\nD · SAVING TWICE DOES NOT DUPLICATE IN THE LOG');
console.log('  ', await p.evaluate(()=>{
  const a=S.active, en=a.entries[0];
  en.sets.forEach(st=>{ delete st.noteCode; delete st.noteCodes; delete st.unote; });
  S.exNotes=[];
  const write = ()=>{ openExNote(0, 0);
    const m=document.getElementById('modal');
    m.querySelector('[data-exnk="form"]').click();
    m.querySelector('#exNoteSave').click(); };
  write(); const first = notesForSession(a.id).length;
  write(); const second = notesForSession(a.id).length;
  return {afterFirstSave:first, afterSecondSave:second};
}));

console.log('\nE · A NOTE SAVED THE OLD WAY STILL READS');
console.log('  ', await p.evaluate(()=>{
  const st = {noteCode:"strong", unote:"Felt unusually strong"};
  return {words: noteWords(st), codes: noteCodesOf(st)};
}));

console.log('\nerrors:', errs);
await b.close();
