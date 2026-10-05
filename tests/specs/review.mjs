import { chromium, APP_URL, shot, shotDir, appFile, fileUrl } from './_e26.mjs';
const D=shotDir();
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
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
  S.tourDone=true; S.sleepAsked=todayStr(); S.sleepTarget=8;
  S.prefs=Object.assign({},S.prefs,{sleepPrompt:false,barMode:"total",barWeight:45});
  S.splitId=DEFAULT_SPLIT; applySplit();
  const DAY=86400e3, now=Date.now();
  S.cycleStart = now - 28*DAY;
  const d=n=>new Date(now-n*DAY).toLocaleDateString("en-CA");
  // 10 sessions across the cycle, RPE varying with the night before
  S.sessions=[]; S.checkins={};
  for(let k=27;k>=1;k-=3){
    const shortNight = k % 2 === 0;
    S.checkins[d(k)]={sleep: shortNight ? 5.9 : 8.2};
    S.sessions.push({id:"s"+k, workoutId:ROTATION[k%ROTATION.length], date:d(k),
      startedAt:now-k*DAY, finishedAt:now-k*DAY+3600e3, feel:4,
      entries:[{name:"Barbell Bench Press", barAdd:45,
        sets:[0,1,2].map(()=>({weight:String(120+(28-k)), reps:"9",
          rpe: shortNight ? "9.2" : "8.1", done:true}))}]});
  }
  S.bodyLog={ [d(26)]:{w:178.0,t:"07:05"}, [d(12)]:{w:180.3,t:"07:10"}, [d(2)]:{w:182.6,t:"07:00"} };
  S.hurts=[{id:"h1", ex:"Barbell Bench Press", exKey:nrm("Barbell Bench Press"), where:"shoulder",
            level:"sore", note:"only on the way down", at:now-5*DAY, date:d(5), first:d(19), times:3}];
  S.lastCycle={start: now-56*DAY, end: now-29*DAY};
  save();
});
await p.waitForTimeout(400);
console.log('=== MODEL ===');
console.log(JSON.stringify(await p.evaluate(()=>{
  const r = buildCycleReview();
  return {cov:r.cov && {sessions:r.cov.sessions, planned:r.cov.planned, nights:r.cov.nights, weighs:r.cov.weighs},
          weight:r.weight && {n:r.weight.n, delta:r.weight.delta, verdict:r.weight.verdict, thin:!!r.weight.thin},
          sleep:r.sleep && {n:r.sleep.n, avg:r.sleep.avg, shortRpe:r.sleep.shortRpe, longRpe:r.sleep.longRpe, thin:!!r.sleep.thin},
          hurts:r.hurts && {open:r.hurts.open.length, settled:r.hurts.settled.length},
          moved:(r.moved||[]).length};
}),null,1));

console.log('\n=== SLIDES ===');
await p.evaluate(()=>{ window.__r = buildCycleReview(); openCycleWrapped(window.__r); });
await p.waitForTimeout(900);
const n = await p.evaluate(()=>document.querySelectorAll('.wr-bar').length);
console.log('slide count:', n);
for(let i=0;i<n;i++){
  const txt = await p.evaluate(()=>document.querySelector('.wr-slide').innerText.replace(/\n/g,' | '));
  console.log(`  ${i+1}. ${txt.slice(0,150)}`);
  if(i<4 || i>n-4) await p.screenshot({path:D+`rev${i+1}.png`});
  if(i<n-1) await p.evaluate(()=>document.querySelector('.wr-next').click());
  await p.waitForTimeout(450);
}
// the questions actually save
await p.evaluate(()=>{ openCycleWrapped(window.__r);
  for(let i=0;i<11;i++) document.querySelector('.wr-next').click(); });
await p.waitForTimeout(900);
await p.screenshot({path:D+'rev-q.png'});
await p.evaluate(()=>{ const b=document.querySelector('[data-wrplan="tweak"]'); if(b) b.click();
  const c=document.getElementById('wrCtx'); if(c){ c.value='flu for a week'; c.onchange(); } });
await p.waitForTimeout(300);
console.log('saved answers:', JSON.stringify(await p.evaluate(()=>S.reviews)));
console.log('\nbackground of a slide:', await p.evaluate(()=>getComputedStyle(document.querySelector('.wr-bg')).backgroundImage.slice(0,90)));
console.log('errors:', errs);
await b.close();
