import { chromium, APP_URL, appFile, oldBuild } from '../../tests/specs/_e26.mjs';
import { readFileSync } from 'node:fs';
/* The reminders screen with reminders ON, which is where nearly all of its copy lives.
   Same core-words comparison the shared copy diff uses, run over a state the fixture
   does not have. */
const FX=JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'),'utf8'));
const OLD = oldBuild(process.argv[2] || "8f3cbc0");
const b=await chromium.launch();
/* LABELS ARE READ TOO. A conversion moves a phrase from the middle of a description
   into the control's own label as often as it drops one, and a tool that reads only
   descriptions reports the move as a loss. Both are one-line changes to this list, and
   only one of them is a bug. */
const SEL = '.sub, .set-help, .sd-sub, .sd-says, .sd-hero-s, .rem-when, .sync-warn, '
          + '.ch-tx span, .ch-tx b, .sd-seg button span, .sd-seg button b, .rd-h, '
          + '.sd-label, .rem-head b, .sd-sec, .sd-more > summary';
async function textOf(url){
  const p=await b.newPage({viewport:{width:390,height:1800}}); p.on('dialog',d=>d.accept());
  await p.addInitScript(()=>{ localStorage.clear();
    localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
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
    /* Reminders on, all three switched on, so every branch that has copy draws it. */
    S.pushOn = true; S.remindAt = "17:00"; S.remindBed = true; S.remindWake = true;
    /* NO ACCOUNT IS REGISTERED IN A TEST PAGE, so pushBlocker() reports one and both
       builds draw the blocked state instead of the three sections. Measuring that would
       have reported the screen intact while every word on it went unread. */
    window.pushBlocker = ()=> "";
    try{ PUSH_DIAG = {support:true, perm:"granted", sw:true, sub:true, account:true, sched:3}; }catch(e){}
    TAB='sync'; SET_PAGE='remind'; render();
    document.querySelectorAll('#app details').forEach(d=> d.open = true);
    return [...document.querySelectorAll('#app ' + sel)]
      .map(el=> el.textContent.replace(/\s+/g," ").trim()).filter(x=> x.length > 12);
  }, [FX, SEL]);
  await p.close();
  return t;
}
const core = s=> s.toLowerCase().replace(/[^a-z0-9 ]+/g," ").split(/\s+/)
  .filter(w=> w.length > 3);
const a = await textOf(OLD), c = await textOf(APP_URL);
await b.close();
const newWords = c.map(core);
/* EVERY CONTENT WORD ON THE NEW SCREEN, for the second pass. A conversion routinely
   splits one old sentence across a control's label and its description, so no single new
   string carries 80% of it and a per-string check calls it missing. That is the tool
   being wrong, not the screen. */
const allNew = [].concat.apply([], newWords);
const missing = a.filter(s=>{
  const w = core(s);
  if(!w.length) return false;
  /* Present if some new string carries at least 80% of this one's content words... */
  if(newWords.some(nw=> w.filter(x=> nw.indexOf(x) > -1).length >= w.length * 0.8)) return false;
  /* ...or if the screen as a whole still says nearly all of them somewhere. */
  return w.filter(x=> allNew.indexOf(x) > -1).length < w.length * 0.95;
});
a.forEach((x,i)=> console.log("OLD " + (i+1) + ". " + x.slice(0,110)));
c.forEach((x,i)=> console.log("NEW " + (i+1) + ". " + x.slice(0,110)));
console.log("=== remind (reminders ON): old strings " + a.length
  + ", missing from the new screen: " + missing.length + " ===");
missing.forEach((s,i)=> console.log(" " + (i+1) + ". " + s));
