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
    S.tourDone=true; S.geo='on'; S.pushOn=true; S.remindAt='18:00'; S.remindBed='22:30';
    S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false}); S.sleepAsked=todayStr();
    S.gyms=[{id:'a',name:'Home'},{id:'b',name:'Commercial'}];
    save(); TAB='sync'; SET_PAGE=null; render();
  });
  const r = await p.evaluate(()=>{
    const tiles=[...document.querySelectorAll('.set-tile')];
    const secs=[...document.querySelectorAll('.set-sec')].map(x=>x.textContent);
    return {
      tiles:tiles.length, sections:secs,
      noRowsLeft: document.querySelectorAll('.set-row').length,
      twoAcross: (()=>{ const t=tiles.filter(x=>!x.classList.contains('set-wide'));
        return t.length>1 && Math.abs(t[0].getBoundingClientRect().top - t[1].getBoundingClientRect().top) < 2; })(),
      helpIsWide: tiles.some(x=>x.classList.contains('set-wide')),
      gauges: tiles.filter(x=>x.querySelector('.g-dots,.g-split')).map(x=>x.querySelector('.set-tile-n').textContent),
      everyTileNamed: tiles.every(x=>x.querySelector('.set-tile-n') && x.querySelector('.set-tile-v')),
      pageHeight: Math.round(document.body.scrollHeight),
      overflow: document.documentElement.scrollWidth > window.innerWidth+1
    };
  });
  console.log(w+'px', r, 'errors:', errs);
  if(w===390){
    const open = await p.evaluate(()=>{
      document.querySelector('[data-setopen="targets"]').click();
      return {opened: SET_PAGE, hasBack: !!document.getElementById('setBack'),
              title: document.querySelector('h1').textContent};
    });
    console.log('   a tile still opens its page:', open);
    await p.evaluate(()=>{ SET_PAGE=null; render(); document.querySelector('nav').style.display='none'; });
    await p.waitForTimeout(250);
    const h = await p.evaluate(()=> Math.min(1500, document.body.scrollHeight));
    await p.setViewportSize({width:390, height:Math.round(h)});
    await p.waitForTimeout(200);
    await p.screenshot({path:D+'settiles.png'});
  }
  await p.close();
}
await b.close();
