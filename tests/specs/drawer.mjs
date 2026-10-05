/* The action drawer must be invisible when closed (so nothing can show through a
   mis-composited face), visible while dragging and while open, and honest about it to
   assistive tech. */
import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
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
  S.tourDone=true; S.geo='off'; save(); TAB='program'; render();
});
await p.waitForTimeout(300);
await p.evaluate(()=>document.querySelector('[data-dayedit]').click());
await p.waitForTimeout(700);
const state = ()=>p.evaluate(()=>{
  const row=document.querySelector('.de-swipe'), acts=row.querySelector('.de-acts');
  return {vis:getComputedStyle(acts).visibility, aria:acts.getAttribute('aria-hidden'),
          open:row.classList.contains('is-open')};
});
const errs=[];
console.log('closed:  ', JSON.stringify(await state()));
let st = await state();
if(st.vis!=='hidden') errs.push('drawer is painted while the row is closed');
if(st.aria!=='true') errs.push('closed drawer is not aria-hidden');

// every row, not just the first
console.log('all rows hidden when closed:', await p.evaluate(()=>
  [...document.querySelectorAll('.de-acts')].every(a=>getComputedStyle(a).visibility==='hidden')));
if(!await p.evaluate(()=>[...document.querySelectorAll('.de-acts')].every(a=>getComputedStyle(a).visibility==='hidden')))
  errs.push('some closed drawer is still painted');

// open it with the handle
await p.evaluate(()=>document.querySelector('[data-depull]').click());
await p.waitForTimeout(350);
st = await state();
console.log('opened:  ', JSON.stringify(st));
if(st.vis!=='visible') errs.push('open drawer is not visible');
if(st.aria!=='false') errs.push('open drawer is still aria-hidden');
console.log('buttons reachable:', await p.evaluate(()=>{
  const r=document.querySelector('.de-swipe').getBoundingClientRect();
  const el=document.elementFromPoint(380, r.top+r.height/2);
  return el? el.tagName.toLowerCase()+' ['+(el.getAttribute('aria-label')||'')+']':'null'; }));
await p.screenshot({path:shot('drawer-open.png')});

// close again
await p.evaluate(()=>document.querySelector('[data-depull]').click());
await p.waitForTimeout(400);
st = await state();
console.log('closed again:', JSON.stringify(st));
if(st.vis!=='hidden') errs.push('drawer stayed painted after closing');

// and the drag path reveals it
await p.evaluate(()=>{
  const row=document.querySelector('.de-swipe');
  row.classList.add('de-dragging');
});
console.log('mid-drag:', JSON.stringify(await state()));
if((await state()).vis!=='visible') errs.push('drawer invisible mid-drag — the face would slide onto nothing');
console.log('\nerrors: '+(errs.length?JSON.stringify(errs,null,1):'[] PASS'));
await b.close();
