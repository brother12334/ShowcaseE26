import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:900}});
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
  S.prefs=Object.assign({},S.prefs,{sleepPrompt:false,trackWeight:true});
  S.splitId=DEFAULT_SPLIT; applySplit();
  const DAY=86400e3, now=Date.now(), d=n=>new Date(now-n*DAY).toLocaleDateString("en-CA");
  for(let k=20;k>=1;k-=2){
    const wid=ROTATION[k%ROTATION.length];
    const s2={id:"s"+k, workoutId:wid, date:d(k), startedAt:now-k*DAY, finishedAt:now-k*DAY+3600e3, feel:4,
      entries:(S.program[wid]||[]).slice(0,5).map(e=>({name:e.name, reps:e.reps, barAdd:45,
        sets:[0,1,2].map(()=>({weight:String(95+(20-k)*2),reps:"12",rpe:"8",done:true}))}))};
    sweepSessionPRs(s2); s2.quality=scoreWorkout(s2); s2.progression=buildProgression(s2);
    S.sessions.push(s2); S.checkins[d(k)]={sleep:7.2};
  }
  S.bodyLog={ [d(9)]:{w:181.0,t:"07:00"}, [d(2)]:{w:182.4,t:"07:05"} };
  save(); TAB="body"; render();
});
await p.waitForTimeout(600);
// with the reassembler ON (as shipped) and with it bypassed, the page must be identical
const out = await p.evaluate(()=>{
  const on = viewBody();
  const orig = bodySectionOrder;
  bodySectionOrder = x => x;                   // straight through, no re-sort
  const off = viewBody();
  bodySectionOrder = orig;
  const strip = x => x.replace(/<!--SEC:[a-z]+-->/g, "");
  return {same: strip(on) === strip(off), len: on.length,
          order: [...document.querySelectorAll('.nb-sec-k,.nb-hero-k')].map(x=>x.textContent.replace(/\d+$/,'').trim())};
});
console.log('reassembled page identical to unsorted page:', out.same);
console.log('section order on screen:', out.order.join(' → '));
console.log('errors:', errs);
await b.close();
