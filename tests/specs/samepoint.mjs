/* Partway through a cycle, the comparison must be against the SAME point last cycle. */
import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:900}});
p.on('pageerror',e=>console.log('ERR',e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{localStorage.clear();
 localStorage.setItem('e26.account',JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'F',createdAt:1,cloud:false,ns:''}));
 localStorage.setItem('e26.ns0','E26-X');});
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>typeof S!=='undefined'&&!!S);
console.log(await p.evaluate(()=>{
  S.setup={name:"F",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  const D=86400e3, now=Date.now();
  /* Last cycle: 14 days, 10 sets of work logged on each of days 0..13 = 140 sets.
     This cycle: started 8 days ago, same 10 sets a day for 8 days = 80 sets.
     Same pace exactly. A fair comparison must therefore say "the same". */
  const mk=(id,at)=>({id, date:dayStr(at), workoutId:DAYS[0], startedAt:at, finishedAt:at+3e6,
    entries:[{name:"Barbell Bench Press", reps:"8-12",
      sets:Array.from({length:10},()=>({weight:"100",reps:"10",rpe:"8",done:true}))}]});
  const prevStart = now - 22*D, prevEnd = now - 8*D, thisStart = now - 8*D;
  S.lastCycle = {start: prevStart, end: prevEnd};
  S.cycleStart = thisStart;
  S.sessions = [];
  for(let d=0; d<14; d++) S.sessions.push(mk("p"+d, prevStart + d*D + 36e5));
  for(let d=0; d<8;  d++) S.sessions.push(mk("t"+d, thisStart + d*D + 36e5));
  save();
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} document.body.classList.remove('ai-open','onboarding'); hideModal();
  S.tourDone=true; S.prefs=Object.assign({},S.prefs,{sleepPrompt:false}); S.sleepAsked=todayStr();
  TAB='body'; render();
  const A = bodyAnalysis();
  const w = A.win, t = A.totals || {};
  const span = ms=> Math.round(ms/D);
  return 'window mode        : '+w.mode+
       '\n this cycle covers  : '+span(w.to - w.from)+' days  ('+w.label+')'+
       '\n last cycle covers  : '+span(w.prevTo - w.prevFrom)+' days  ("'+w.prevLabel+'")'+
       '\n                      last cycle really ran '+span(prevEnd - prevStart)+' days'+
       '\n\n sets this window   : '+t.setsWk+
       '\n sets that window   : '+t.setsPrev+
       '\n\n AS THE APP ACTUALLY RENDERS IT:\n   '+
       ((document.body.innerText.split('\n').filter(l=>/Level with|% on |working sets/i.test(l))
         .slice(0,3).join('\n   ')) || '(not found)');
}));
await b.close();
