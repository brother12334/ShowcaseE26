/* Plan 45, last session worked at 50: the boxes must suggest 50 and the card must say so. */
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
  const N="Single-Arm Dumbbell Row";
  S.program[DAYS[0]] = [{name:N, sets:3, reps:"8-12", weight:"45", rest:120, uni:true}];
  // the screenshot's session: 45x16, 50x11, 50x14
  S.sessions=[{id:"s1", date:dayStr(Date.now()-9*86400e3), workoutId:DAYS[0], startSide:"L",
    startedAt:Date.now()-9*86400e3, finishedAt:Date.now()-9*86400e3+3e6, feel:3,
    entries:[{name:N, startSide:"L", altStyle:"side", sets:[
      {weight:"45",reps:"16",rpe:"6.5",done:true},
      {weight:"50",reps:"11",rpe:"8",done:true},
      {weight:"50",reps:"14",rpe:"9",done:true}]}]}];
  save(); TAB='today'; render();
});
await p.waitForTimeout(400);
await p.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(x=>/start/i.test(x.innerText)&&x.offsetParent); b&&b.click(); });
await p.waitForTimeout(700);
console.log('plan weight in the programme:', await p.evaluate(()=>findProgramEntry("Single-Arm Dumbbell Row").weight));
console.log('planLoadFor (unchanged, the programme number):', await p.evaluate(()=>planLoadFor(S.active.entries[0])));
console.log('\nweight placeholders per set row:');
console.log(await p.evaluate(()=>[...document.querySelectorAll('[data-f="weight"][data-e="0"]')]
  .map((x,i)=>'   set '+(i+1)+': '+x.placeholder).join('\n')));
console.log('\nthe line on the card:');
console.log('  ', await p.evaluate(()=>{
  const el=[...document.querySelectorAll('.ex-insight')].find(x=>/plan is behind/i.test(x.innerText));
  return el? el.innerText.replace(/\s+/g,' ').trim() : '(not shown)'; }));
console.log('\n--- control: same history, but the plan already at 55 (a FRESH session,');
console.log('    because planWeight freezes at Start by design) ---');
await p.evaluate(()=>{ S.active=null; findProgramEntry("Single-Arm Dumbbell Row").weight="55";
  save(); TAB='today'; render(); });
await p.waitForTimeout(400);
await p.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(x=>/start/i.test(x.innerText)&&x.offsetParent); b&&b.click(); });
await p.waitForTimeout(700);
console.log(await p.evaluate(()=>{
  const ph=[...document.querySelectorAll('[data-f="weight"][data-e="0"]')].map(x=>x.placeholder).join(', ');
  const el=[...document.querySelectorAll('.ex-insight')].find(x=>/plan is behind/i.test(x.innerText));
  return '   placeholders: '+ph+'   (the plan, correctly)\n   line: '+(el?'SHOWN (wrong)':'(none, correct)'); }));
await p.screenshot({path:shot('behind.png')});
await b.close();
