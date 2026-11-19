import { chromium, APP_URL, appFile } from '../../tests/specs/_e26.mjs';
import { readFileSync } from 'node:fs';
/* One muscle row at 3x, plus the state every bar on the screen resolved to. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1600}, deviceScaleFactor:3});
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL, {waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(fx=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} try{PF=null}catch(e){} try{hideModal()}catch(e){}
  ['preflight','aiFull'].forEach(id=>{const el=document.getElementById(id); if(el) el.remove();});
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  Object.keys(S).forEach(k=>{ delete S[k]; });
  Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
  S.tourDone = true; migrate(); try{ applySplit(); }catch(e){}
  TAB='sync'; SET_PAGE='targets'; render();
  const nav = document.querySelector('nav'); if(nav) nav.style.display='none';
}, FX);

const states = await p.evaluate(()=>{
  const out = [];
  document.querySelectorAll('#app .tg-row').forEach(r=>{
    const n = (r.querySelector('.tg-n') || {textContent:''}).textContent.trim();
    const v = (r.querySelector('.tg-v') || {textContent:''}).textContent.trim();
    const bar = r.querySelector('.tg-bar');
    out.push((n.replace(/\s+/g,' ') + '        ').slice(0,16) + ' ' +
             (v + '                  ').slice(0,20) + ' ' +
             (bar ? bar.className.replace('tg-bar','').trim() || 'in range' : 'NO BAR'));
  });
  return out;
});
console.log(states.join('\n'));

const want = await p.evaluate(()=>{
  const rows = [...document.querySelectorAll('#app .tg-row')];
  const i = rows.findIndex(r=> /Quads/.test((r.querySelector('.tg-n')||{textContent:''}).textContent));
  return i < 0 ? 0 : i;
});
const row = p.locator('#app .tg-row').nth(want);
await row.screenshot({path: appFile('design/variants/shots/tgbar.png')});
await b.close();
