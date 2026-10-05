import { chromium, APP_URL, shot, shotDir, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const D=shotDir();
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
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false}); S.sleepAsked=todayStr();
  save(); TAB='sync'; SET_PAGE='targets'; render();
});

console.log('THE DIAL EXISTS AND STARTS AT THE PUBLISHED FIGURES');
console.log('  ', await p.evaluate(()=>{
  const d=document.getElementById('tgDial');
  return {isSlider:d.getAttribute('role'), now:d.getAttribute('aria-valuenow'),
          min:d.getAttribute('aria-valuemin'), max:d.getAttribute('aria-valuemax'),
          reads:document.getElementById('tgPct').textContent+'%',
          neutral:d.classList.contains('is-off'),
          touchAction:getComputedStyle(d).touchAction,
          noStepper:!document.querySelector('[data-tgscale]')};
}));

console.log('\nGEOMETRY: the handle sits where the value says');
console.log('  ', await p.evaluate(()=>{
  const at = v => { const a=tgAngle(v); const [x,y]=tgPoint(a,46);
    return v+'% → ('+Math.round(x)+','+Math.round(y)+')'; };
  return [50,75,100,125,150].map(at);
}));

console.log('\nDRAGGING IT');
const d = await p.$('#tgDial');
const box = await d.boundingBox();
const cx = box.x + box.width/2, cy = box.y + box.height/2, r = box.width/2 - 12;
const drag = async (deg, label)=>{
  const a = deg*Math.PI/180;
  await p.mouse.move(cx, cy);
  await p.mouse.down();
  await p.mouse.move(cx + r*Math.cos(a), cy + r*Math.sin(a), {steps:6});
  await p.mouse.up();
  console.log('   drag to '+label+':', await p.evaluate(()=>({
    reads:document.getElementById('tgPct').textContent+'%',
    stored:Math.round(lmScale()*100)+'%',
    says:document.getElementById('tgSay').textContent.trim(),
    rowVal:setGroups().find(x=>x.k==='targets').val})));
};
await drag(270, 'straight up   (expect 100%)');
await drag(180, 'straight left (expect  65%)');
await drag(0,   'straight right(expect 135%)');
await drag(135, 'the low end   (expect  50%)');
await drag(45,  'the high end  (expect 150%)');

console.log('\nTHE BOTTOM GAP RESOLVES TO THE NEARER END, NOT ACROSS THE SCALE');
console.log('  ', await p.evaluate(()=>{
  const d=document.getElementById('tgDial'); const r=d.getBoundingClientRect();
  const at=(deg)=>{ const a=deg*Math.PI/180;
    return tgValueAt(d, r.left+r.width/2 + 40*Math.cos(a), r.top+r.height/2 + 40*Math.sin(a)); };
  return {justPastTheMinEnd:at(120)+'%', straightDown:at(90)+'%', justBeforeTheMaxEnd:at(60)+'%'};
}));

console.log('\nKEYBOARD');
await p.evaluate(()=> document.getElementById('tgDial').focus());
for(const k of ['ArrowRight','ArrowRight','ArrowLeft']) await p.keyboard.press(k);
await p.waitForTimeout(700);
console.log('  after →→←:', await p.evaluate(()=>({reads:document.getElementById('tgPct').textContent+'%', stored:Math.round(lmScale()*100)+'%'})));
await p.evaluate(()=> document.getElementById('tgDial').focus());
await p.keyboard.press('End'); await p.waitForTimeout(700);
console.log('  after End:', await p.evaluate(()=>({reads:document.getElementById('tgPct').textContent+'%', stored:Math.round(lmScale()*100)+'%'})));
await p.evaluate(()=> document.getElementById('tgDial').focus());
await p.keyboard.press('Home'); await p.waitForTimeout(700);
console.log('  focus survives the commit:', await p.evaluate(()=> document.activeElement && document.activeElement.id));
console.log('  after Home:', await p.evaluate(()=>({reads:document.getElementById('tgPct').textContent+'%', stored:Math.round(lmScale()*100)+'%'})));

console.log('\nIT STILL MOVES EVERY TARGET, AND RESETS');
console.log('  ', await p.evaluate(()=>{
  S.lmScale=0.8; save(); render();
  const low={}; GKEYS.slice(0,3).forEach(g=> low[g]=r1(adjustedLandmarks(bodyAnalysis(),g).mev));
  document.querySelector('#tgScaleReset').click();
  const back={}; GKEYS.slice(0,3).forEach(g=> back[g]=r1(adjustedLandmarks(bodyAnalysis(),g).mev));
  return {at80:low, afterReset:back, scale:Math.round(lmScale()*100)+'%'};
}));

for(const w of [320,390,430]){
  await p.setViewportSize({width:w, height:900});
  await p.evaluate(()=>{ TAB='sync'; SET_PAGE='targets'; render(); });
  const o = await p.evaluate(()=>({ overflow: document.documentElement.scrollWidth>window.innerWidth+1,
    dial: Math.round(document.getElementById('tgDial').getBoundingClientRect().width) }));
  console.log('  ', w+'px', o);
}
await p.setViewportSize({width:390, height:900});
await p.evaluate(()=>{ S.lmScale=0.8; save(); TAB='sync'; SET_PAGE='targets'; render(); });
await p.waitForTimeout(250);
await (await p.$('#app .card')).screenshot({path:D+'dial.png'});
console.log('\nerrors:', errs);
await b.close();
