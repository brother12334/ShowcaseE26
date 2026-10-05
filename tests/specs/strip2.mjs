import { chromium, APP_URL, shot, shotDir, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const D=shotDir();
for(const w of [320,390,430]){
  const p = await b.newPage({viewport:{width:w,height:900}, deviceScaleFactor:2});
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
    S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false}); S.sleepAsked=todayStr();
    S.splitId='ppl6'; applySplit();
    // three days done, one rest already taken
    S.cycleStart=Date.now()-4*86400e3; S.cycleDone=[0,1,2]; S.pointer=3;
    S.restLog=[dayStr(Date.now()-86400e3)];
    save(); goTab('today'); render();
  });
  await p.waitForTimeout(300);
  const r = await p.evaluate(()=>{
    const wrap=document.querySelector('.plates-wrap');
    const cells=[...document.querySelectorAll('.plate')];
    const rests=[...document.querySelectorAll('.plate.rest')];
    return {
      rests:rests.length,
      allSameHeight:new Set(cells.map(c=>Math.round(c.getBoundingClientRect().height))).size===1,
      heights:[...new Set(cells.map(c=>Math.round(c.getBoundingClientRect().height)))],
      restNarrower:rests.every(x=>{
        const t=cells.find(c=>!c.classList.contains('rest'));
        return x.getBoundingClientRect().width < t.getBoundingClientRect().width; }),
      restWidths:rests.map(x=>Math.round(x.getBoundingClientRect().width)),
      trainWidth:Math.round(cells.find(c=>!c.classList.contains('rest')).getBoundingClientRect().width),
      labels:rests.map(x=>x.getAttribute('aria-label')),
      textShown:rests.map(x=>getComputedStyle(x).fontSize),
      ticks:rests.filter(x=>x.querySelector('.pcheck')).length,
      overflow:wrap.scrollWidth>wrap.clientWidth+1
    };
  });
  console.log(w+'px', r, 'errors:', errs);
  if(w!==320){ const box=await p.evaluate(()=>{const b=document.querySelector('.plates-wrap').getBoundingClientRect();
    return {x:Math.max(0,b.x-6),y:b.y+window.scrollY-6,width:Math.min(b.width+12,window.innerWidth),height:b.height+12};});
    await p.screenshot({path:D+'gstrip'+w+'.png', clip:box}); }
  await p.close();
}
await b.close();
