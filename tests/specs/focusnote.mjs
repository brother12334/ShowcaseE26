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
console.log('1 · THE CARD, WITH A GRADED SESSION BEHIND IT');
const out = await p.evaluate(()=>{
  S.splitId=DEFAULT_SPLIT; applySplit();
  const wid=ROTATION[0], now=Date.now();
  const ex=(S.program[wid]||[])[0].name;
  const s={id:"g1", workoutId:wid, date:new Date(now-2*86400e3).toLocaleDateString("en-CA"),
    startedAt:now-2*86400e3-3600e3, finishedAt:now-2*86400e3, feel:4,
    entries:(S.program[wid]||[]).map(e=>({name:e.name, reps:e.reps,
      sets:Array.from({length:e.sets||3},()=>({weight:"100",reps:"9",rpe:"8",done:true}))}))};
  S.sessions=[s];
  s.quality = scoreWorkout(s);
  s.quality.prs = [{name:ex, kind:"REP PR"},{name:ex, kind:"STRENGTH PR"},{name:ex, kind:"WEIGHT PR"}];
  save(); TAB="today"; render();
  const n = focusNote(wid);
  return {advice: (s.quality.advice||[]).slice(0,1).map(a=>({label:a.label, lost:a.lost, ex:a.ex, na:a.na})),
          line: n ? n.line.replace(/<[^>]+>/g,'') : null,
          body: n ? n.body.replace(/<[^>]+>/g,' | ').replace(/\s+/g,' ').trim() : null};
});
console.log('   worst section:', JSON.stringify(out.advice));
console.log('   line :', out.line);
console.log('   body :', out.body);

console.log('\n2 · ON SCREEN');
await p.waitForTimeout(400);
await p.evaluate(()=>{ document.querySelectorAll('.nt-r').forEach(d=> d.open=true); });
await p.waitForTimeout(300);
console.log(await p.evaluate(()=>{
  const r=[...document.querySelectorAll('.nt-r')].find(x=>/last /i.test(x.textContent));
  return r ? r.innerText.replace(/\n+/g,' | ') : 'MISSING';
}));
console.log('\n   old wording present:', await p.evaluate(()=>/Cost you [\d.]+ points? on that grade/.test(document.body.innerText)));
console.log('\nerrors:', errs);
await b.close();
