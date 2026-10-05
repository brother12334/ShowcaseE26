import { chromium, APP_URL, shot, shotDir, appFile, fileUrl } from './_e26.mjs';
const b=await chromium.launch();
const D=shotDir();
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
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
  let i=0;
  for(let d=30; d>=3; d--){ if(d%3===2) continue;
    const wid=ROTATION[(i++)%ROTATION.length]; const prog=(S.program[wid]||[]).slice(0,5);
    const s={id:"s"+d,date:dayStr(Date.now()-d*86400e3),workoutId:wid,
      startedAt:Date.now()-d*86400e3,finishedAt:Date.now()-d*86400e3+3300e3,feel:3,
      entries:prog.map((e,k)=>({name:e.name,reps:e.reps,sets:[0,1,2].map((_,j)=>
        ({weight:String(90+k*10),reps:String(10-j),rpe:String(7.5+j*0.5),done:true,rest:150}))}))};
    S.sessions.push(s);
  }
  // today: a real weight PR on the opening lift
  const wid=ROTATION[0]; const prog=(S.program[wid]||[]).slice(0,5);
  const sess={id:"live",workoutId:wid,date:todayStr(),startedAt:Date.now()-3300e3,finishedAt:Date.now(),feel:4,
    entries:prog.map((e,k)=>({name:e.name,reps:e.reps,sets:[0,1,2].map((_,j)=>
      ({weight:String(k===0?130:95+k*10),reps:String(11-j),rpe:String(8+j*0.5),done:true,rest:110}))}))};
  S.sessions.push(sess); sweepSessionPRs(sess);
  sess.progression=buildProgression(sess); sess.quality=scoreWorkout(sess); save();
  window.__s = sess;
});
console.log('headline picked:', await p.evaluate(()=>JSON.stringify(sessionHeadline(window.__s, window.__s.quality))));
console.log('\n--- THE INTRO ---');
await p.evaluate(()=>quietFinish(window.__s.workoutId, sessVolume(window.__s), ()=>{}, window.__s));
await p.waitForTimeout(1700);
console.log(await p.evaluate(()=>document.getElementById('celebrate').innerText.replace(/\n+/g,' | ')));
console.log('confetti pieces:', await p.evaluate(()=>document.querySelectorAll('.confetto').length), '(should be 0)');
await p.screenshot({path:D+'intro.png'});
await p.evaluate(()=>{ const e=document.getElementById('celebrate'); if(e) e.remove(); document.body.classList.remove('cele-open'); });
console.log('\n--- THE GRADE ---');
await p.evaluate(()=>openScoreCard(window.__s, ()=>{}));
await p.waitForTimeout(2400);   // past the rail label's 1.7s naming window
console.log(await p.evaluate(()=>{
  const m=document.querySelector('#modal .scf-p[data-p="0"]'); return m? m.innerText.replace(/\n{2,}/g,'\n').trim() : '(none)'; }));
console.log('\nring still present?', await p.evaluate(()=>document.querySelectorAll('.sc-ring').length), '(should be 0)');
console.log('breakdown rows behind the tap:', await p.evaluate(()=>document.querySelectorAll('.sc-bar').length));
await p.screenshot({path:D+'grade.png'});
await p.evaluate(()=>{ const d=document.querySelector('.sc-more'); if(d) d.open=true; });
await p.waitForTimeout(400);
await p.screenshot({path:D+'grade-open.png'});
await b.close();
