import { chromium, APP_URL, shot, shotDir, appFile, fileUrl } from './_e26.mjs';
const D=shotDir();
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:900},deviceScaleFactor:2});
p.on('pageerror',e=>console.log('ERR',e.message)); p.on('dialog',d=>d.accept());
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
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
  S.prefs=Object.assign({},S.prefs,{sleepPrompt:false,barMode:"total",barWeight:45,plateStep:2.5,dbStep:5});
  S.splitId=DEFAULT_SPLIT; applySplit();
  const DAY=86400e3, now=Date.now();
  const mk=(daysAgo, name, sets, add, gym)=>({
    id:"x"+daysAgo+name, workoutId:ROTATION[0], date:new Date(now-daysAgo*DAY).toLocaleDateString("en-CA"),
    startedAt:now-daysAgo*DAY, finishedAt:now-daysAgo*DAY+3600e3, feel:4, gymName:gym||"Home gym",
    entries:[{name, barAdd:add, sets:sets.map(s=>({weight:s[0]===null?"":String(s[0]), reps:String(s[1]),
      rpe:s[2]!=null?String(s[2]):"", done:true, rest:120}))}]});
  S.sessions = [
    // BENCH — three bands, and the LAST session falls 5 lb short of the 6-10 record
    mk(80,"Barbell Bench Press",[[140,10,8],[140,9,9]],45,"Home gym"),
    mk(66,"Barbell Bench Press",[[150,10,8],[120,13,8]],45,"Home gym"),
    mk(45,"Barbell Bench Press",[[165,10,8],[190,5,9]],45,"Work gym"),
    mk(31,"Barbell Bench Press",[[150,13,8]],45,"Home gym"),
    mk(14,"Barbell Bench Press",[[180,10,8.5],[205,5,9]],45,"Work gym"),
    mk(4, "Barbell Bench Press",[[175,10,8.5]],45,"Work gym"),
    // PULL-UP — bodyweight, last session one rep short
    mk(70,"Pull-Up",[[null,9,8]],0,"Home gym"),
    mk(50,"Pull-Up",[[null,12,9]],0,"Home gym"),
    mk(23,"Pull-Up",[[null,14,9]],0,"Home gym"),
    mk(5, "Pull-Up",[[null,13,8]],0,"Home gym"),
    // ROW — its record is old, so it should be a calm row
    mk(120,"Barbell Row",[[115,12,8]],45,"Home gym"),
    mk(95,"Barbell Row",[[135,13,8]],45,"Home gym"),
    mk(60,"Barbell Row",[[135,12,9]],45,"Home gym"),
    // CURL — one session ever, so a baseline and no record at all
    mk(9,"Dumbbell Curl",[[30,12,8]],0,"Home gym")
  ];
  save(); TAB="history"; RECORDS_OPEN=true; render();
});
await p.waitForTimeout(500);

const j = o=>JSON.stringify(o,null,1);
console.log('=== IN REACH ===');
console.log(j(await p.evaluate(()=> recordsInReach(buildRecordBook()).map(x=>({
  n:x.r.name, band:x.band.t, gap:x.gap, unit:x.unit, best:rbVal(x.r,x.best), last:rbVal(x.r,x.last)})))));

console.log('=== MODEL ===');
console.log(j(await p.evaluate(()=> buildRecordBook().map(r=>({
  n:r.name, bw:r.bw, main:r.mainBand.t, recs:r.records.length,
  bands:Object.keys(r.bands).map(k=>r.bands[k].band.t+" = "+rbVal(r,r.bands[k].best)),
  newest:r.records[0]?{v:rbVal(r,r.records[0]),beat:rbVal(r,r.records[0].beat),stood:r.records[0].stood}:null,
  trend:r.trend})))));

console.log('=== LIST SCREEN ===');
console.log(await p.evaluate(()=>document.getElementById('app').innerText));
console.log('live rows:', await p.evaluate(()=>document.querySelectorAll('.rb-live').length),
            'calm rows:', await p.evaluate(()=>document.querySelectorAll('.rb-calm').length),
            'divider:', await p.evaluate(()=>!!document.querySelector('.rb-div')));
await p.screenshot({path:D+'rbA.png'});

console.log('=== TAP INTO BENCH ===');
await p.evaluate(()=>{ const b=[...document.querySelectorAll('[data-rbex]')]
  .filter(x=>/Bench/.test(x.innerText))[0]; b.onclick(); });
await p.waitForTimeout(400);
console.log(await p.evaluate(()=>document.getElementById('app').innerText));
await p.screenshot({path:D+'rbB.png'});
console.log('details block:', await p.evaluate(()=>!!document.querySelector('.rb-more')));
await p.evaluate(()=>{ const d=document.querySelector('.rb-more'); if(d) d.open=true; });
await p.waitForTimeout(250);
await p.screenshot({path:D+'rbC.png'});

console.log('=== LIFT HISTORY ON THE PAGE ===');
console.log(JSON.stringify(await p.evaluate(()=>({
  rows: document.querySelectorAll('.lf-r').length,
  chart: !!document.querySelector('.lf-chart svg polyline'),
  dots: document.querySelectorAll('.lf-chart circle').length,
  ends: [...document.querySelectorAll('.lf-ends span')].map(x=>x.textContent.trim()),
  list: [...document.querySelectorAll('.lf-r')].map(x=>x.innerText.replace(/\n/g,' | '))
})),null,1));
await p.evaluate(()=>{ const e=document.querySelector('.lf-chart'); if(e) e.scrollIntoView({block:'center'}); });
await p.waitForTimeout(300);
await p.screenshot({path:D+'lf1.png'});

console.log('=== BACK TO LIST ===');
await p.evaluate(()=>document.getElementById('rbToList').onclick());
await p.waitForTimeout(350);
console.log('back on list:', await p.evaluate(()=>!!document.querySelector('.rb-list')),
            '· RB_EX:', await p.evaluate(()=>RB_EX));

console.log('=== BACK TO HISTORY + TEASER ===');
await p.evaluate(()=>document.getElementById('rbBack').onclick());
await p.waitForTimeout(400);
console.log(await p.evaluate(()=>{const t=document.querySelector('.rb-teaser'); return t?t.innerText:'NO TEASER';}));
await p.evaluate(()=>document.querySelector('.rb-teaser').scrollIntoView({block:'center'}));
await p.waitForTimeout(250);
await p.screenshot({path:D+'rbD.png'});

console.log('errors:', errs);
await b.close();
