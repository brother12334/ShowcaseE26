import { chromium, APP_URL, appFile } from '../../tests/specs/_e26.mjs';
import { readFileSync, mkdirSync } from 'node:fs';
/* Renders each mockup inside the REAL app: real stylesheet, real header, real card shell,
   real fonts. Only the sd- library and the variation's own markup are injected. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
const CSS = readFileSync(appFile('design/variants/controls.css'), 'utf8');
const JS  = readFileSync(appFile('design/variants/variants.js'), 'utf8');
const OUT = appFile('design/variants/shots');
mkdirSync(OUT, {recursive:true});

const TITLES = {
  sess:   ["How training is run", "Warm-ups, RPE, deloads, one-limb work, and when weights go up."],
  screen: ["The workout screen",  "How a session looks while you are in it, and what it asks you."],
  gym:    ["In the gym",          "Pounds or kilos, and what the number you write for a barbell means."],
  targets:["Volume targets",      "What counts as enough work for each muscle, and how those numbers are reached."],
  where:  ["Where you train",     "The plates and dumbbells you have, the gyms Element 26 knows about, and whether it checks."],
  plan:   ["Your plan",           "Deloads, and how your volume targets are worked out."],
  day:    ["Sleep and mornings",  "The morning check, sleep tracking, and how much sleep you want."],
  remind: ["Reminders",           "Notifications for training, bedtime and the morning."],
  share:  ["Share with a coach",  "A read-only link to your plan and your numbers, which expires by itself."]
};
const b = await chromium.launch();
let fails = 0;
for(const width of [390, 320]){
  const p = await b.newPage({viewport:{width, height:900}, deviceScaleFactor: width===390?2:1});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ localStorage.clear();
    localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
    localStorage.setItem('e26.ns0','E26-X'); });
  await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
  await p.evaluate(fx=>{
    const sp=document.getElementById('splash'); if(sp) sp.remove();
    try{OB=null}catch(e){} try{hideModal()}catch(e){}
    document.body.classList.remove('ai-open','onboarding','pfl-open');
    Object.keys(S).forEach(k=>{ delete S[k]; });
    Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
    S.tourDone = true; migrate(); try{ applySplit(); }catch(e){}
    TAB = 'sync'; SET_PAGE = 'sess'; render();
  }, FX);
  await p.addStyleTag({content: CSS});
  await p.addScriptTag({content: JS});

  for(const key of Object.keys(await p.evaluate(()=> window.SD))){
    const [scr, letter] = key.split('_');
    const [title, sub] = TITLES[scr];
    void letter;
    const over = await p.evaluate(({key,title,sub})=>{
      /* The onboarding import screen is a separate overlay and outlived the boot, so it
         sat on top of every shot. Cleared here, after the last render, not before it. */
      try{ OB = null; }catch(e){}
      try{ PF = null; }catch(e){}
      try{ hideModal(); }catch(e){}
      ['preflight','aiFull','splash'].forEach(id=>{ const el=document.getElementById(id); if(el) el.remove(); });
      document.body.classList.remove('ai-open','onboarding','pfl-open','share-view');
      /* The tab bar is fixed, so in a full-page shot it prints across the middle of the
         screen instead of at the bottom. It is not part of what is being designed. */
      const nav = document.querySelector('nav'); if(nav) nav.style.display = 'none';
      const app = document.getElementById('app');
      app.innerHTML = `<div class="hdr"><h1>${title.toUpperCase()}</h1></div>
        <button class="btn ghost small" style="margin-bottom:14px">‹ Settings</button>
        <div class="sub" style="margin:0 2px 14px;font-size:var(--fs-3);color:var(--faint)">${sub}</div>
        <div class="card">${window.SD[key]()}</div>`;
      window.scrollTo(0,0);
      return document.documentElement.scrollWidth - document.documentElement.clientWidth;
    }, {key,title,sub});
    if(over > 0){ console.log(`  OVERFLOW ${key} at ${width}: ${over}px`); fails++; }
    /* Smallest tap target among the library's interactive elements. */
    const small = await p.evaluate(()=> {
      const sel = '.sd-seg button,.sd-tog,.sd-chip,.sd-plate-b,.sd-step button,.sd-r-h,.sd-more > summary,.sd-range-th';
      return [...document.querySelectorAll(sel)]
        .map(el=>{ let r = el.getBoundingClientRect();
          const be = getComputedStyle(el, '::before');
          const bw = parseFloat(be.width)||0, bh = parseFloat(be.height)||0;
          if(be.content && be.content !== 'none' && bw && bh)
            r = {height: Math.max(r.height, bh), width: Math.max(r.width, bw)};
          return {h:Math.round(r.height), w:Math.round(r.width),
          t:(el.className||'')+' '+(el.textContent||'').trim().slice(0,18)}; })
        .filter(x=> x.h > 0 && (x.h < 44 || x.w < 44)).slice(0,4);
    });
    if(width===390 && small.length){ console.log(`  SMALL TARGETS ${key}: ` +
      small.map(s=>`${s.h}x${s.w} ${s.t}`).join(' | ')); fails++; }
    if(width===390){
      await p.screenshot({path:`${OUT}/${key}.png`, fullPage:true});
      console.log(`  ok  ${key}`);
    }
  }
  if(errs.length){ console.log("  PAGE ERRORS: "+errs.join(" | ")); fails++; }
  console.log(`-- ${width}pt checked`);
  await p.close();
}
await b.close();
console.log(fails ? `\n${fails} problem(s)` : "\nall nine render clean at 390 and 320");
process.exit(fails?1:0);
