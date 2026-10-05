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
const strip = ()=> p.evaluate(()=>{
  const plates=[...document.querySelectorAll('.plates .plate')].map(b=>({
    t: b.textContent.replace(/\s+/g,' ').trim(),
    rest: b.classList.contains('rest'), cur: b.classList.contains('cur'),
    aria: b.getAttribute('aria-label')}));
  const row=document.querySelector('.cycle-row .num');
  const card=document.querySelector('.rest-next-card');
  return {plates, row: row?row.textContent.trim():"", banner: card? card.innerText.replace(/\s+/g,' ').trim() : "(none)"};
});

console.log('1 · CYCLE JUST WRAPPED ON A DAY YOU TRAINED');
console.log(JSON.stringify(await p.evaluate(()=>{
  S.splitId=DEFAULT_SPLIT; applySplit();
  const now=Date.now();
  // a full cycle of sessions, the last one TODAY
  S.sessions = ROTATION.map((wid,i)=>({id:"s"+i, workoutId:wid,
    date:new Date(now-(ROTATION.length-1-i)*86400e3).toLocaleDateString("en-CA"),
    startedAt:now-(ROTATION.length-1-i)*86400e3-3600e3, finishedAt:now-(ROTATION.length-1-i)*86400e3,
    feel:4, entries:[]}));
  // wrap the cycle exactly the way recomputeCycle() does when the last day is logged
  S.lastCycle={start: now-ROTATION.length*86400e3, end: now};
  S.lastReview=null; S.cycleManual=false;
  S.cycleDone=[]; S.cycleStart=now; S.pointer=0; S.restLog=[]; S.restDays=[]; S.restDeleted=[];
  save(); TAB="today"; render();
  return {restDueNotToday: restDueNotToday(), isRestToday: isRestToday(), pointer:S.pointer};
}), null, 0));
await p.waitForTimeout(400);
let st = await strip();
console.log('   banner:', st.banner.slice(0,120));
console.log('   row   :', st.row);
st.plates.forEach(x=> console.log('   ', (x.cur?'>> ':'   ') + (x.rest?'REST ':'     ') + x.t.padEnd(8), '|', x.aria));

console.log('\n2 · THE SAME CYCLE, BUT NO SESSION TODAY');
console.log(JSON.stringify(await p.evaluate(()=>{
  const now=Date.now();
  S.sessions.forEach((s,i)=>{ s.date=new Date(now-(S.sessions.length-i)*86400e3).toLocaleDateString("en-CA");
    s.startedAt=now-(S.sessions.length-i)*86400e3; s.finishedAt=s.startedAt+3600e3; });
  S.cycleStart=now; save(); render();
  return {restDueNotToday: restDueNotToday(), isRestToday: isRestToday()};
}), null, 0));
await p.waitForTimeout(400);
st = await strip();
console.log('   banner:', st.banner.slice(0,80));
st.plates.forEach(x=> console.log('   ', (x.cur?'>> ':'   ') + (x.rest?'REST ':'     ') + x.t.padEnd(8), '|', x.aria));
console.log('\n   exactly one current plate:', st.plates.filter(x=>x.cur).length);
console.log('\nerrors:', errs);
await b.close();
