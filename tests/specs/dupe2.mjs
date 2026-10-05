import { chromium, APP_URL, shot, shotDir, appFile, fileUrl } from './_e26.mjs';
const D=shotDir();
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:900},deviceScaleFactor:2});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{localStorage.clear();
 localStorage.setItem('e26.account',JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
 localStorage.setItem('e26.ns0','E26-X');});
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>typeof S!=='undefined'&&!!S);
const boot = ()=> p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} const f=document.getElementById('aiFull'); if(f){f.hidden=true;f.style.display='none';}
  document.body.classList.remove('ai-open','onboarding'); hideModal();
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.sleepAsked=todayStr();
  S.prefs=Object.assign({},S.prefs,{sleepPrompt:false,barMode:"total",barWeight:45});
  S.splitId=DEFAULT_SPLIT; applySplit(); save();
});
await boot();

// CASE 1: advice[0] names an exercise that IS in today's plan — the user's screenshot
console.log('=== advice about a movement in today\'s plan ===');
console.log(await p.evaluate(()=>{
  const wid = ROTATION[S.pointer];
  const ex = (resolvedProgram(wid)||[])[0].chosen.name;
  const s2={id:"g1", workoutId:wid, date:new Date(Date.now()-3*86400e3).toLocaleDateString("en-CA"),
    startedAt:Date.now()-3*86400e3, finishedAt:Date.now()-3*86400e3+3600e3, feel:4,
    quality:{pct:0.88, grade:"A-", prs:[{name:ex}],
      advice:[{ex, text:"Sets finishing above the range are your cue to add weight. Move those up about 5 lb next session.", lost:3.5, key:"k1"}]},
    entries:[{name:ex, barAdd:45, sets:[{weight:"135",reps:"13",rpe:"7",done:true}]}]};
  S.sessions=[s2]; save(); TAB="today"; render();
  const n = focusNote(wid);
  return JSON.stringify({line:n.line, act:n.act, body:n.body.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}, null, 1);
}));
await p.waitForTimeout(400);
console.log('\non screen — stack row:');
console.log(await p.evaluate(()=>{const e=document.querySelector('.nt-list'); return e?e.innerText:'NONE';}));
console.log('inline tip above the exercise:');
console.log(await p.evaluate(()=>[...document.querySelectorAll('.fc-inline')].map(x=>x.innerText.replace(/\n/g,' '))));
console.log('bar is grey (informational):', await p.evaluate(()=>{
  const r=[...document.querySelectorAll('.nt-r')].filter(x=>/LAST/.test(x.innerText))[0];
  return r && !r.classList.contains('nt-act');
}));
await p.screenshot({path:D+'dupe-a.png'});

// CASE 2: general advice with no exercise — nowhere else to appear, so it stays
console.log('\n=== general advice, no exercise named ===');
console.log(await p.evaluate(()=>{
  const wid = ROTATION[S.pointer];
  S.sessions[0].quality.advice=[{text:"Unfinished sets are the cheapest points on this card.", lost:2, key:"k2"}];
  save(); render();
  const n = focusNote(wid);
  return JSON.stringify({line:n.line, act:n.act});
}));

// CASE 3: advice about a movement NOT in today's plan
console.log('\n=== advice about a movement not on today\'s card ===');
console.log(await p.evaluate(()=>{
  const wid = ROTATION[S.pointer];
  S.sessions[0].quality.advice=[{ex:"Seated Calf Raise", text:"Move it up about 5 lb.", lost:1, key:"k3"}];
  save(); render();
  const n = focusNote(wid);
  return JSON.stringify({line:n.line, act:n.act});
}));
console.log('errors:', errs);
await b.close();
