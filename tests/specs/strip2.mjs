import { chromium, APP_URL, shot, shotDir, appFile, fileUrl } from './_e26.mjs';
/* THE CYCLE ACROSS THE TOP OF TODAY, AT THREE WIDTHS.

   This measured the plate strip, which Today no longer draws — the dark glass cycle is
   in its place. The questions are the same ones and they are the reason this spec
   exists: every cell the same height, no horizontal overflow, each one labelled, and a
   day already done still marked as done. Pointing it at markup nobody renders would
   have left it green for ever while saying nothing.

   ONE ASSERTION IS GONE RATHER THAN MOVED. "rest plates are narrower than training
   plates" was a fact about the plate strip's own shape: a rest was a slimmer tile
   because it was not a day you train. The cycle sets every slot in one pill, equally
   wide, and marks the rest by its label. There is nothing narrower to measure, so the
   check is dropped rather than reinterpreted — what it protected (a rest reading as
   different from a training day) is covered by the label and the tick. */
const b = await chromium.launch();
const D=shotDir();
let bad=0;
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
    const wrap=document.querySelector('.dg-cycle');
    const cells=[...document.querySelectorAll('.dg-cy')];
    const rests=[...document.querySelectorAll('.dg-cy[data-rest]')];
    const days=[...document.querySelectorAll('.dg-cy[data-slot]')];
    return {
      cells:cells.length, rests:rests.length,
      allSameHeight:new Set(cells.map(c=>Math.round(c.getBoundingClientRect().height))).size===1,
      heights:[...new Set(cells.map(c=>Math.round(c.getBoundingClientRect().height)))],
      widths:[...new Set(cells.map(c=>Math.round(c.getBoundingClientRect().width)))],
      labelled:cells.every(x=>(x.getAttribute('aria-label')||'').length>2),
      textShown:cells.map(x=>getComputedStyle(x).fontSize)[0],
      ticks:cells.filter(x=>x.querySelector('.dg-tick')).length,
      /* The row must not scroll sideways, and must not push the page wider either. */
      overflow:wrap.scrollWidth>wrap.clientWidth+1,
      page:document.documentElement.scrollWidth>innerWidth+1
    };
  });
  console.log(w+'px', r, 'errors:', errs);
  const ck=(n,c,x)=>{ console.log((c?'  ok  ':'  BROKEN  ')+w+'px: '+n+(c?'':' :: '+x)); if(!c) bad++; };
  ck('CONTROL: there are cells to measure, days and rests both',
     r.cells>0 && r.rests>0 && r.cells>r.rests, r.cells+' cells, '+r.rests+' rests');
  ck('every cell is the same height', r.allSameHeight, r.heights.join('/'));
  ck('nothing scrolls sideways', !r.overflow && !r.page,
     'row '+r.overflow+', page '+r.page);
  ck('every cell is labelled', r.labelled, '');
  ck('CONTROL: a day already done is still marked done', r.ticks>0, r.ticks+' ticked');
  if(w!==320){ const box=await p.evaluate(()=>{const b=document.querySelector('.dg-cycle').getBoundingClientRect();
    return {x:Math.max(0,b.x-6),y:b.y+window.scrollY-6,width:Math.min(b.width+12,window.innerWidth),height:b.height+12};});
    await p.screenshot({path:D+'gstrip'+w+'.png', clip:box}); }
  await p.close();
}
await b.close();
console.log(bad?('BROKEN: '+bad):'all good');
process.exit(bad?1:0);
