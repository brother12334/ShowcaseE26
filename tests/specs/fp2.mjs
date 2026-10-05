/* The exact card: plan 95 (raised Aug 18 from a guess of 20), last session Sep 7 at 110. */
import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:900},deviceScaleFactor:2});
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
  S.tourDone=true; S.geo='off'; S.prefs=Object.assign({},S.prefs,{sleepPrompt:false,progression:"ask"});
  S.sleepAsked=todayStr();
  const N="Cable Face Pull (two D-handles)";
  const raised = Date.now()-20*86400e3;      // "Aug 18"
  S.program[DAYS[0]] = [{name:N, sets:3, reps:"15-20", weight:"95", rest:90,
    byApp:{at:raised, what:"load raised to 95 lb", from:20, to:95,
           why:"Double progression: last set cleared the top of the rep range at target RPE."}}];
  S.sessions=[{id:"s1", date:dayStr(Date.now()-10*86400e3), workoutId:DAYS[0],   // "Sep 7"
    startedAt:Date.now()-10*86400e3, finishedAt:Date.now()-10*86400e3+3e6, feel:3,
    entries:[{name:N, sets:[
      {weight:"100",reps:"21",rpe:"8",done:true},
      {weight:"110",reps:"16",rpe:"9",done:true},
      {weight:"110",reps:"12",rpe:"8.5",done:true}]}]}];
  save(); TAB='today'; render();
});
await p.waitForTimeout(400);
await p.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(x=>/start/i.test(x.innerText)&&x.offsetParent); b&&b.click(); });
await p.waitForTimeout(700);
const card = await p.evaluate(()=>{
  const c=[...document.querySelectorAll('.card')].find(x=>/Cable Face Pull/.test(x.innerText));
  return c? c.innerText : '(card not found)'; });
console.log('=============== THE CARD AS IT RENDERS NOW ===============');
console.log(card);
console.log('\n=============== CHECKS ===============');
console.log('raise chip still shown?      ', /\+75|raised to 95/.test(card) ? 'YES  <-- still wrong' : 'no');
console.log('"collapse" note still shown? ', /collapse/i.test(card) ? 'YES  <-- still wrong' : 'no');
console.log('"plan is behind" line shown? ', /plan is behind/i.test(card) ? 'yes' : 'NO  <-- missing');
console.log('weight placeholders:         ', await p.evaluate(()=>
  [...document.querySelectorAll('[data-f="weight"][data-e="0"]')].map(x=>x.placeholder).join(', ')));
await b.close();
