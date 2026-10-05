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
  S.tourDone=true; S.geo='off'; S.prefs=Object.assign({},S.prefs,{sleepPrompt:false}); S.sleepAsked=todayStr();
  const N="Cable Face Pull (two D-handles)";
  S.program[DAYS[0]]=[{name:N, sets:3, reps:"15-20", weight:"95", startEst:true, rest:90,
    byApp:{at:Date.now()-3*86400e3, what:"load raised to 95 lb", from:20, to:95, why:null}}];
  S.sessions=[{id:"s0", date:dayStr(Date.now()-9*86400e3), workoutId:DAYS[0],
    startedAt:Date.now()-9*86400e3, finishedAt:Date.now()-9*86400e3+3e6,
    entries:[{name:N, sets:[{weight:"95",reps:"18",rpe:"8",done:true}]}]}];
  save(); TAB='program'; render();
});
await p.waitForTimeout(400);
console.log('as the DOM actually renders it (innerText, entities decoded):');
console.log(await p.evaluate(()=>{
  const d=document.createElement('div');
  d.innerHTML = planChangeLineHTML({name:"Cable Face Pull (two D-handles)"});
  document.body.appendChild(d);
  const chip=d.querySelector('.chg-chip'), sub=d.querySelector('.chg-sub');
  return '   chip: '+(chip?chip.innerText.trim():'(none)')+
       '\n   sub : '+(sub?sub.innerText.replace(/\s+/g,' ').trim():'(none)')+
       '\n   raw contains a stray entity? '+(/&#\d+;|&amp;/.test(d.innerHTML)?'YES':'no');
}));
await p.screenshot({path:shot('chipdom.png')});
await b.close();
