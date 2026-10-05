import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b=await chromium.launch();
for(const goal of ['muscle','lean','strength']){
  const p=await b.newPage({viewport:{width:390,height:844}});
  p.on('pageerror',e=>console.log('ERR',e.message)); p.on('dialog',d=>d.accept());
  await p.addInitScript(()=>{localStorage.clear();
   localStorage.setItem('e26.account',JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
   localStorage.setItem('e26.ns0','E26-X');});
  await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>typeof S!=='undefined'&&!!S);
  console.log('===== '+goal+' =====');
  console.log(await p.evaluate(g=>{
    S.setup={name:"F",goal:g,level:"intermediate",gear:"full",at:Date.now()};
    let i=0;
    for(let d=20; d>=2; d--){ if(d%3===2) continue;
      const wid=ROTATION[(i++)%ROTATION.length]; const prog=(S.program[wid]||[]).slice(0,3);
      S.sessions.push({id:"s"+d,date:dayStr(Date.now()-d*86400e3),workoutId:wid,
        startedAt:Date.now()-d*86400e3,finishedAt:Date.now()-d*86400e3+3300e3,feel:3,
        entries:prog.map((e,k)=>({name:e.name,sets:[0,1].map(()=>({weight:String(100+k*15),reps:"9",rpe:"8",done:true,rest:120}))}))}); }
    const A=bodyAnalysis();
    const L=adjustedLandmarks(A,'chest');
    return 'chest floor '+L.mev.toFixed(1)+' / ceiling '+L.mrv.toFixed(1)+'\n'+
      A.weak.slice(0,3).map(w=>'• '+w.title+'\n  '+w.act+'\n  '+(w.detail||'').slice(0,300)).join('\n');
  }, goal));
  await p.close();
}
await b.close();
