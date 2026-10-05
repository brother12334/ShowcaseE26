import { chromium, APP_URL, shot, shotDir, appFile, fileUrl } from './_e26.mjs';
const D=shotDir();
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
// seed a profile that already has morning weights in its check-ins, as an existing user would
await p.addInitScript(()=>{
  localStorage.clear();
  localStorage.setItem('e26.account',JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X');
  const DAY=86400e3, now=Date.now(), d=n=>new Date(now-n*DAY).toLocaleDateString("en-CA");
  const blob = JSON.stringify({
    setup:{name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:1}, tourDone:true,
    checkins:{ [d(20)]:{sleep:7.5, weight:"178.2"}, [d(10)]:{sleep:8, weight:"180"},
               [d(3)]:{sleep:7, weight:"181.4"}, [d(1)]:{sleep:7.5} },
    bodyLog:{ [d(3)]:{w:999} },      // an existing real weigh-in must win
    sessions:[], savedAt: now
  });
  ['ironlog.v1','ironlog.v1.E26-X','ironlog.v1_E26-X'].forEach(k=> localStorage.setItem(k, blob));
});
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>typeof S!=='undefined'&&!!S);
await p.waitForTimeout(400);
console.log('bodyLog after migrate:', JSON.stringify(await p.evaluate(()=>S.bodyLog)));
console.log('checkins after migrate:', JSON.stringify(await p.evaluate(()=>S.checkins)));
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} const f=document.getElementById('aiFull'); if(f){f.hidden=true;f.style.display='none';}
  document.body.classList.remove('ai-open','onboarding'); hideModal();
  S.splitId=DEFAULT_SPLIT; applySplit(); save(); TAB="today"; render();
});
await p.waitForTimeout(300);
await p.evaluate(()=>openMorningSheet(null));
await p.waitForTimeout(800);
console.log('--- morning screen ---');
console.log(await p.evaluate(()=>document.getElementById('modal').innerText));
console.log('bed field present:', await p.evaluate(()=>!!document.getElementById('mnBed')));
await p.screenshot({path:D+'mn-nobed.png'});
// answer the bedtime: a clock face LATER than the wake belongs to yesterday
await p.evaluate(()=>{ const b=document.getElementById('mnBed'); b.value='23:20'; b.onchange(); });
await p.waitForTimeout(500);
console.log('--- after bedtime ---');
console.log(await p.evaluate(()=>document.getElementById('modal').innerText));
await p.screenshot({path:D+'mn-bed.png'});
// moving the wake time must re-anchor the bedtime, not strand it
await p.evaluate(()=>{ MORN.wokeAt = Date.now(); const t=document.getElementById('mnWoke'); t.value='06:30'; t.onchange(); });
await p.waitForTimeout(400);
console.log('--- wake moved ---');
console.log(await p.evaluate(()=>document.getElementById('modal').innerText));
await p.evaluate(()=>document.getElementById('mnSave').onclick());
await p.waitForTimeout(400);
const rec = await p.evaluate(()=>S.checkins[todayStr()]);
console.log('checkin written:', JSON.stringify(rec));
console.log('bedAt before wokeAt:', rec.bedAt < rec.wokeAt, 'bed clock:', new Date(rec.bedAt).toTimeString().slice(0,5), 'sleep:', rec.sleep);
console.log('errors:', errs);
await b.close();
