import { chromium, APP_URL, shot, shotDir, appFile, fileUrl } from './_e26.mjs';
const D=shotDir();
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:900},deviceScaleFactor:2});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
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
  S.tourDone=true; S.sleepAsked=todayStr();
  S.prefs=Object.assign({},S.prefs,{sleepPrompt:false,barMode:"total",barWeight:45});
  S.splitId=DEFAULT_SPLIT; applySplit();
  const DAY=86400e3, now=Date.now();
  for(let k=20;k>=1;k-=2){
    const wid=ROTATION[k%ROTATION.length];
    const s2={id:"s"+k, workoutId:wid, date:new Date(now-k*DAY).toLocaleDateString("en-CA"),
      startedAt:now-k*DAY, finishedAt:now-k*DAY+3600e3, feel:4,
      entries:(S.program[wid]||[]).slice(0,4).map(e=>({name:e.name, reps:e.reps, barAdd:45,
        sets:[0,1].map(()=>({weight:"110",reps:"12",rpe:"8",done:true}))}))};
    sweepSessionPRs(s2); s2.quality=scoreWorkout(s2); S.sessions.push(s2);
  }
  save(); TAB="body"; render();
});
await p.waitForTimeout(700);
const weak = await p.evaluate(()=> (bodyAnalysis().weak||[]).map(w=>({muscle:w.muscle, kind:w.kind})));
const card = ()=> p.evaluate(()=>{
  const f=[...document.querySelectorAll('#app .nb-flag')][0];
  if(!f) return null;
  return {text: f.innerText.replace(/\n+/g,' | '),
          accent: [...f.querySelectorAll('.btn:not(.ghost)')].map(b=>b.textContent.trim()),
          ghost:  [...f.querySelectorAll('.btn.ghost')].map(b=>b.textContent.trim()),
          quiet:  [...f.querySelectorAll('.nb-link')].map(b=>b.textContent.trim()),
          doBtns: [...f.querySelectorAll('[data-flagdo]')].map(b=>b.className+" :: "+b.textContent.trim())};
});
console.log('1 · A RECOVERY STALL');
await p.evaluate(()=>{
  S.flags=[{id:"f1", at:Date.now(), date:todayStr(), ex:"Incline Dumbbell Bench Press",
    kind:"stall", stallKind:"recovery", sev:2, applied:false, dismissed:false,
    title:"Stalled, and it looks like recovery",
    msg:"Stalled 3 sessions running, but this is a recovery problem",
    fix:"You averaged 6.3 h sleep across those sessions. Under 6.5 h, the programme is not the thing that is broken. Do not cut sets: fix sleep first and re-test."}];
  save(); TAB="body"; render();
});
await p.waitForTimeout(600);
console.log(JSON.stringify(await card(), null, 1));

console.log('\n2 · AN ORDINARY STALL IS UNCHANGED');
await p.evaluate(()=>{
  S.flags=[{id:"f2", at:Date.now(), date:todayStr(), ex:"Barbell Row",
    kind:"stall", stallKind:"plateau", sev:3, applied:false, dismissed:false,
    title:"What stalled", msg:"Stalled 3 sessions running",
    fix:"Cut one set for two weeks and let it come back."}];
  save(); render();
});
await p.waitForTimeout(500);
console.log(JSON.stringify(await card(), null, 1));
console.log('\n   no stray comment on screen:', await p.evaluate(()=> !/THE CARD ARGUED/.test(document.body.innerText)));
await p.screenshot({path:D+'recstall.png'});
console.log('\nerrors:', errs);
await b.close();
