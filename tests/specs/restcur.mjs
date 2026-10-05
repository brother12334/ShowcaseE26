import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
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
  try{OB=null}catch(e){} const f=document.getElementById('aiFull'); if(f){f.hidden=true;f.style.display='none';}
  document.body.classList.remove('ai-open','onboarding'); hideModal();
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off';
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, restMode:'scheduled'}); S.sleepAsked=todayStr();
  S.splitId='ppl6'; applySplit(); save();
});

const scene = (label, setup) => p.evaluate(({setup})=>{
  // three training days done, then the cycle's first rest falls today
  S.cycleStart = Date.now() - 4*86400e3;
  S.cycleDone = [0,1,2]; S.pointer = 3;
  S.restDays = []; S.restLog = []; S.restDeleted = []; S.sessions = [];
  for(let k=0;k<3;k++){
    S.sessions.push({id:"s"+k, date: dayStr(Date.now()-(3-k)*86400e3), workoutId: ROTATION[k],
      startedAt: Date.now()-(3-k)*86400e3, finishedAt: Date.now()-(3-k)*86400e3+3e6, entries:[]});
  }
  if(setup === 'training'){ S.cycleDone=[0,1]; S.pointer=2; S.sessions.length=2; }
  if(setup === 'recorded') S.restDays = [todayStr()];   // the rest is written down
  if(setup === 'trainedToday'){
    // the third session was done TODAY, so the rest falls tomorrow
    S.sessions[2].date = todayStr(); S.sessions[2].startedAt = Date.now()-3e6;
  }
  if(setup === 'tomb'){ S.restDeleted = [todayStr()]; }
  if(setup === 'floatRest'){
    S.prefs = Object.assign({}, S.prefs, {restMode:'floating'});
    S.restDays = [todayStr()];                    // a floating rest spent today
  }
  save(); goTab('today'); render();
  const plates = [...document.querySelectorAll('.plate')];
  return {
    restsFloat: restsFloat(),
    isRestToday: isRestToday(),
    anyDue: restStatus().some(x=>x.due),
    ringed: plates.filter(x=>x.classList.contains('cur'))
      .map(x=> x.classList.contains('rest') ? 'REST' : x.textContent.replace(/[^A-Z0-9]/gi,'').slice(0,2)),
    restLabels: [...document.querySelectorAll('.plate.rest')].map(x=>x.getAttribute('aria-label')),
    restDueNotToday: restDueNotToday(),
    says: (document.querySelector('.cycle-row span')||{}).textContent,
    todayTab: (document.querySelector('#app')||{}).innerText.split('\n').filter(x=>x.trim()).filter(x=>/rest|Rest|REST|today|Today|tomorrow/.test(x)).slice(0,8)
  };
}, {setup});

console.log('an ordinary training day (nothing about rests):');
console.log('  ', await scene('z','training'));
console.log('\nrest due today, not yet written down:');
console.log('  ', await scene('a','due'));
console.log('\nsame day, rest already recorded (what happens after you tap it / next boot):');
console.log('  ', await scene('b','recorded'));
console.log('\ntrained today, so the rest is due TOMORROW:');
console.log('  ', await scene('c','trainedToday'));
console.log('\nFLOATING rests, one spent today:');
console.log('  ', await scene('d','floatRest'));
console.log('\nerrors:', errs);
await b.close();
