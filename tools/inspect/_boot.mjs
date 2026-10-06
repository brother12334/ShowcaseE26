/* THE INSPECTION HARNESS.

   Phase 2 of the design work starts by LOOKING at the whole product rather than at the
   screens somebody remembers. This boots the real index.html, seeds a believable
   training history, and hands back a page you can drive into any state.

   It is a tool, not a test: nothing here asserts anything. It exists so that a "before"
   is a photograph rather than a recollection. */
import { chromium, APP_URL, SHOT_DIR } from '../../tests/specs/_e26.mjs';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

export const OUT = process.env.E26_INSPECT_DIR
  || path.join(SHOT_DIR, "inspect");
mkdirSync(OUT, {recursive: true});

export const PHONE = {width: 390, height: 844};

export async function boot(opts){
  const o = opts || {};
  const b = await chromium.launch();
  const ctx = await b.newContext({
    viewport: o.viewport || PHONE,
    deviceScaleFactor: 2,
    reducedMotion: o.reducedMotion || 'no-preference'
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e=> errs.push(e.message));
  p.on('dialog', d=> d.accept());
  await p.route(/^https?:/, r=> r.abort());
  await p.addInitScript(()=>{
    localStorage.clear();
    localStorage.setItem('e26.account', JSON.stringify(
      {id:'E26-7Q4K', key:'k'.repeat(32), name:'Fer', createdAt: Date.now()-220*86400e3,
       cloud:false, ns:''}));
    localStorage.setItem('e26.ns0','E26-7Q4K');
  });
  await p.goto(APP_URL, {waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=> typeof S !== 'undefined' && !!S, null, {timeout:20000});
  return {b, p, errs};
}

/* Clear every overlay the first run puts up, so a screenshot is of the screen and not of
   the splash. Kept separate from the seed: some states WANT the onboarding up. */
export async function calm(p){
  await p.evaluate(()=>{
    const sp = document.getElementById('splash'); if(sp) sp.remove();
    try{ OB = null; }catch(e){}
    try{ hideModal(); }catch(e){}
    document.body.classList.remove('ai-open','onboarding','pfl-open','spec-open',
      'build-open','news-open','cele-open','modal-live');
    const pf = document.getElementById('preflight'); if(pf) pf.remove();
    try{ PF = null; }catch(e){}
    const af = document.getElementById('aiFull'); if(af){ af.hidden = true; }
    const ce = document.getElementById('celebrate'); if(ce) ce.remove();
    /* Toasts are captured deliberately, in their own pass. One left over from seeding
       sits on top of whatever screen comes next. */
    const th = document.getElementById('toasts'); if(th) th.innerHTML = '';
  });
}
