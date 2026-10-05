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
  S.tourDone=true; S.prefs=Object.assign({},S.prefs,{sleepPrompt:false,
    barMode:"total", barWeight:45, dbStep:5, dbMax:null, plateStep:2.5, plates:null});
  S.sleepAsked=todayStr(); S.geo='on';
  S.gyms=[{id:"g1", name:"Home gym", spots:[{lat:1,lon:1}], n:12},
          {id:"g2", name:"Hotel gym", spots:[{lat:2,lon:2}], n:2}];
  save(); TAB='sync'; render();
});
await p.waitForTimeout(300);
await p.evaluate(()=>document.querySelector('[data-setopen="where"]').click());
await p.waitForTimeout(400);
console.log('gym rows:', await p.evaluate(()=>[...document.querySelectorAll('.gym-row')].map(x=>x.innerText.replace(/\s+/g,' ').trim()).join('  |  ')));
console.log('kit buttons:', await p.evaluate(()=>document.querySelectorAll('[data-gymkit]').length));
await p.evaluate(()=>document.querySelector('[data-gymkit="g2"]').click());
await p.waitForTimeout(400);
console.log('\n--- the sheet ---');
console.log(await p.evaluate(()=>document.querySelector('#modal').innerText));
console.log('\n--- set the hotel: 2.5 steps, rack to 50, only 45/25/10/5 plates ---');
await p.evaluate(()=>{
  document.querySelector('#gkDbStep').value='2.5';
  document.querySelector('#gkDbMax').value='50';
  document.querySelector('#gkPlStep').value='5';
});
for(const v of [45,25,10,5]){
  await p.evaluate(x=>document.querySelector('[data-gkpl="'+x+'"]').click(), v);
  await p.waitForTimeout(120);
  // the sheet re-renders, so the typed values must be put back each time
  await p.evaluate(()=>{ const a=document.querySelector('#gkDbStep'), b2=document.querySelector('#gkDbMax'), c=document.querySelector('#gkPlStep');
    if(a&&!a.value) a.value='2.5'; if(b2&&!b2.value) b2.value='50'; if(c&&!c.value) c.value='5'; });
}
await p.evaluate(()=>document.querySelector('#gkSave').click());
await p.waitForTimeout(400);
console.log('stored on the gym:', await p.evaluate(()=>JSON.stringify(gymById("g2"))));
console.log('gym row now      :', await p.evaluate(()=>[...document.querySelectorAll('.gym-row')].map(x=>x.innerText.replace(/\s+/g,' ').trim())[1]));
await b.close();
