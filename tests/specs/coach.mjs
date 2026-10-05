import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1100}, deviceScaleFactor:2});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
const boot = async ()=>{
  await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
  await p.evaluate(()=>{
    const sp=document.getElementById('splash'); if(sp) sp.remove();
    try{OB=null}catch(e){} const f=document.getElementById('aiFull'); if(f){f.hidden=true;f.style.display='none';}
    document.body.classList.remove('ai-open','onboarding'); hideModal();
    S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
    S.tourDone=true; S.geo='off'; save();
  });
};
await boot();

console.log('A · SETTING IS GONE');
console.log('  ', await p.evaluate(()=>{
  const out={};
  ['screen','sess','day','where','acct','data'].forEach(k=>{ TAB='sync'; SET_PAGE=k; render();
    if(/Coaching tips/i.test(document.body.textContent)) out[k]='FOUND'; });
  TAB='sync'; SET_PAGE='screen'; render();
  return {anywhere: Object.keys(out).length?out:'not in any settings page',
          screenGroup:[...document.querySelectorAll('.set-name')].map(x=>x.textContent.trim())}; }));

console.log('\nB · HINT SHOWS WITH NOTHING LOGGED');
const start = async ()=> p.evaluate(()=>{
  goTab('today'); render();
  /* whichever day of the default plan has a one-limb movement on it: which day that is
     moved when the preference table was rewritten to the science reference's ranking */
  const wid=ROTATION.find(w=> (S.program[w]||[]).some(e=> altStyle(e)))
    || DAYS.find(w=> (S.program[w]||[]).some(e=> altStyle(e)));
  if(!wid) return 'no unilateral in default plan';
  const prog=(S.program[wid]||[]);
  startWorkout(wid); render();
  return {logged:(S.sessions||[]).length, hintsOn:coachHintsOn(),
          hint:!!document.querySelector('.coach-hint'),
          x:!!document.querySelector('.coach-x')};
});
console.log('  ', await start());

console.log('\nC · THE X HIDES IT, NO PERSISTED SETTING');
console.log('  ', await p.evaluate(()=>{
  document.querySelector('.coach-x').click();
  const raw=localStorage.getItem('ironlog.v1.E26-X')||localStorage.getItem('ironlog.v1')||'';
  return {hintAfter:!!document.querySelector('.coach-hint'),
          toast:(document.querySelector('#toasts')||{}).textContent,
          coachOffInStorage:/coachOff/.test(raw)}; }));

console.log('\nD · COMES BACK ON RELOAD (dismissal is for this visit only)');
await boot();
console.log('  ', await start());

console.log('\nE · STILL EXPIRES ON ITS OWN AFTER A SESSION');
console.log('  ', await p.evaluate(()=>{
  S.sessions.push({id:"s1",date:dayStr(Date.now()-86400e3),workoutId:ROTATION[0],
    startedAt:1,finishedAt:2,feel:3,entries:[]}); save();
  render();
  return {logged:S.sessions.length, hintsOn:coachHintsOn(), hint:!!document.querySelector('.coach-hint')}; }));

console.log('\nerrors:', errs);
await b.close();
