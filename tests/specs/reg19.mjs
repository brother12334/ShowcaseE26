import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
for(const w of [320,390,430]){
  const p = await b.newPage({viewport:{width:w,height:1100}, deviceScaleFactor:2});
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
    S.tourDone=true; S.geo='off'; let i=0;
    for(let d=14; d>=1; d--){ if(d%3===2) continue;
      const wid=ROTATION[(i++)%ROTATION.length]; const prog=(S.program[wid]||[]).slice(0,4);
      S.sessions.push({id:"s"+d, date:dayStr(Date.now()-d*86400e3), workoutId:wid,
        startedAt:Date.now()-d*86400e3, finishedAt:Date.now()-d*86400e3+3300e3, feel:3,
        entries: prog.map((e,k)=>({name:e.name, sets:[0,1,2].map(()=>({weight:String(100+k*15), reps:"9", rpe:"8", done:true, rest:120}))}))}); }
    save();
  });
  const over=[];
  for(const t of ['today','body','program','history','sync']){
    await p.evaluate(tb=>{ goTab(tb); render(); }, t);
    const x = await p.evaluate(()=> document.documentElement.scrollWidth > window.innerWidth+1);
    if(x) over.push(t);
  }
  const pages = await p.evaluate(()=>{
    const out={};
    ['screen','sess','day','where','acct','data','ai','look'].forEach(k=>{
      try{ TAB='sync'; SET_PAGE=k; render(); out[k]=document.querySelectorAll('#app .card').length; }
      catch(e){ out[k]='ERR '+e.message; }
    });
    return out;
  });
  // logging still works (the setRowHTML collision class of bug)
  const log = await p.evaluate(()=>{
    goTab('today'); render(); startWorkout(ROTATION[0]); render();
    const inp=document.querySelector('.set-row input, #wk input');
    return {rows:document.querySelectorAll('.set-row').length, hasInput:!!inp};
  });
  console.log(w+'px  overflow:', over.length?over:'none', ' settings:', pages, ' log:', log, ' errors:', errs);
  await p.close();
}
await b.close();
