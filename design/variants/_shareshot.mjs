import { chromium, APP_URL, appFile, oldBuild } from '../../tests/specs/_e26.mjs';
import { readFileSync } from 'node:fs';
/* The share screen in the states the fixture does not have: signed in, and with a link
   live. The token is invented here -- a real share token is a credential and has no
   business in a test. */
const FX=JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'),'utf8'));
const OLD = oldBuild(process.argv[2] || "8f3cbc0");
const b=await chromium.launch();
const SEL = '.sub, .set-help, .set-name, .sd-sub, .sd-says, .sd-hero-s, .sd-label, '
          + '.sd-sec, .sd-more > summary, .ch-tx span, .ch-tx b, .rl-n, .sync-warn';
async function look(url, shot){
  const p=await b.newPage({viewport:{width:390,height:1400},deviceScaleFactor:2});
  p.on('dialog',d=>d.accept());
  await p.addInitScript(()=>{ localStorage.clear();
    localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:true,ns:''}));
    localStorage.setItem('e26.ns0','E26-X'); });
  await p.goto(url,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=> typeof S!=='undefined' && !!S,null,{timeout:20000});
  const t = await p.evaluate(([fx,sel])=>{
    const sp=document.getElementById('splash'); if(sp) sp.remove();
    try{OB=null}catch(e){} try{PF=null}catch(e){} try{hideModal()}catch(e){}
    ['preflight','aiFull'].forEach(id=>{const el=document.getElementById(id); if(el) el.remove();});
    document.body.classList.remove('ai-open','onboarding','pfl-open');
    Object.keys(S).forEach(k=>{delete S[k]});
    Object.keys(fx).forEach(k=>{S[k]=JSON.parse(JSON.stringify(fx[k]))});
    S.tourDone=true; migrate(); try{applySplit()}catch(e){}
    window.accountCloudOn = ()=> true;
    window.accountAuth = ()=> ({id:"E26-X"});
    S.shareOpts = {days:30, body:true, sleep:false, injuries:false, notes:true};
    S.shareSeen = [{token:"TESTTOKEN0000", label:"For my coach",
                    at: Date.now()-3*86400000, expiresAt: Date.now()+27*86400000, size: 41000}];
    TAB='sync'; SET_PAGE='share'; render();
    document.querySelectorAll('#app details').forEach(d=> d.open = true);
    return [...document.querySelectorAll('#app ' + sel)]
      .map(el=> el.textContent.replace(/\s+/g," ").trim()).filter(x=> x.length > 12);
  }, [FX, SEL]);
  if(shot) await p.screenshot({path: shot, fullPage: true});
  const extra = shot ? await p.evaluate(()=>{
    const app=document.getElementById('app');
    return {heroes: app.querySelectorAll('.sd-hero').length,
            hero: (app.querySelector('.sd-hero-v')||{textContent:''}).textContent.trim(),
            more: app.querySelectorAll('.sd-more').length,
            moreOpen: app.querySelectorAll('.sd-more[open]').length,
            togs: app.querySelectorAll('.sd-tog').length,
            pressed: app.querySelectorAll('.sd-tog[aria-pressed="true"]').length,
            oldSeg: app.querySelectorAll('.seg').length,
            rows: app.querySelectorAll('.rl-row').length,
            make: !!app.querySelector('#shMake'),
            small: [...app.querySelectorAll('.sd-tog,.sd-seg button,.sd-more > summary')]
              .filter(el=> el.getBoundingClientRect().height < 44).length};
  }) : null;
  await p.close();
  return {t, extra};
}
const o = await look(OLD), n = await look(APP_URL, "design/variants/shots/share-live.png");
await b.close();
const core = s=> s.toLowerCase().replace(/[^a-z0-9 ]+/g," ").split(/\s+/).filter(w=> w.length>3);
const allNew = [].concat.apply([], n.t.map(core));
const newWords = n.t.map(core);
const missing = o.t.filter(s=>{
  const w = core(s); if(!w.length) return false;
  if(newWords.some(nw=> w.filter(x=> nw.indexOf(x)>-1).length >= w.length*0.8)) return false;
  return w.filter(x=> allNew.indexOf(x)>-1).length < w.length*0.95;
});
console.log("=== share (signed in, one link live): old strings " + o.t.length
  + ", missing: " + missing.length + " ===");
missing.forEach((s,i)=> console.log(" " + (i+1) + ". " + s));
console.log(JSON.stringify(n.extra));
