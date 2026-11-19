import { chromium, APP_URL, appFile } from '../../tests/specs/_e26.mjs';
import { readFileSync } from 'node:fs';
/* What the old screen said that the new one does not. Sentence by sentence, with every
   <details> opened, because copy hidden behind More is still copy. */
const FX=JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'),'utf8'));
const PAGE = process.argv[2] || "sess";
const OLDREF = process.argv[3] || "a71826e";
const OLD = "file:///tmp/claude-0/-home-user-ShowcaseE26/cb903a36-3103-5d6a-a18b-78ade397246e/scratchpad/cmp/index.html";
const b=await chromium.launch();
async function textOf(url){
  const p=await b.newPage({viewport:{width:390,height:1400}}); p.on('dialog',d=>d.accept());
  await p.addInitScript(()=>{ localStorage.clear();
    localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
    localStorage.setItem('e26.ns0','E26-X'); });
  await p.goto(url,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=> typeof S!=='undefined' && !!S,null,{timeout:20000});
  const t = await p.evaluate(([fx,page])=>{
    const sp=document.getElementById('splash'); if(sp) sp.remove();
    try{OB=null}catch(e){} try{PF=null}catch(e){} try{hideModal()}catch(e){}
    ['preflight','aiFull'].forEach(id=>{const el=document.getElementById(id); if(el) el.remove();});
    document.body.classList.remove('ai-open','onboarding','pfl-open');
    Object.keys(S).forEach(k=>{delete S[k]});
    Object.keys(fx).forEach(k=>{S[k]=JSON.parse(JSON.stringify(fx[k]))});
    S.tourDone=true; migrate(); try{applySplit()}catch(e){}
    TAB='sync'; SET_PAGE=page; render();
    document.querySelectorAll('#app details').forEach(d=> d.open = true);
    /* THE EXPLANATORY STRINGS, not innerText. innerText runs an option's label, its tick
       and its description together into one line, so a naive sentence split reports the
       whole screen as missing. These are the elements whose job is to explain. */
    /* A SELECTOR LIST IS A PLACE TO MISS SOMETHING. This read eight strings off the
       targets screen and reported a sentence as lost that was sitting in front of it, in
       a .tg-plain paragraph nothing here named. Screen-specific prose containers are
       included now, and anything the sweep does not recognise is caught by the fallback:
       any <p> inside the card that is not already covered. */
    const SEL = ['.ch-tx span', '.ob-opt-s', '.set-help', '.set-says', '.set-unit',
                 '.sd-seg button span', '.sd-tog .sd-sub', '.sd-sub', '.sd-says',
                 '.sd-hero-s', '.tg-plain p', '.tg-land-s', '.tg-conf span',
                 '.card p', '.sub'].join(',');
    const seen = new Set();
    return [...document.querySelectorAll('#app ' + SEL)]
      .map(el=> el.textContent.replace(/\s+/g, ' ').trim())
      .filter(x=> x.length >= 20)
      .filter(x=>{ if(seen.has(x)) return false; seen.add(x); return true; });
  }, [FX, PAGE]);
  await p.close(); return t;
}
const norm = s=> s.replace(/[‘’]/g,"'").replace(/[“”]/g,'"')
  .replace(/[—–]/g,"-").replace(/\s+/g," ").trim();
const oldT = await textOf(OLD), newT = await textOf(APP_URL);
/* CORE WORDS AGAINST CORE WORDS. Searching a core-word n-gram inside raw text fails on
   the small words in between -- "day muscle's recovery window runs" is not a substring of
   "the day a muscle's recovery window runs out" -- which reported kept copy as missing. */
const coreOf = t=> norm(t).toLowerCase().replace(/[.?!,:;"'()]/g," ")
  .split(/\s+/).filter(w=> w.length > 3);
const newCore = " " + newT.map(coreOf).map(a=> a.join(" ")).join(" | ") + " ";
const missing = oldT.map(norm).filter(s=>{
  const core = coreOf(s);
  if(core.length < 4) return newCore.indexOf(" " + core.join(" ") + " ") < 0;
  for(let i = 0; i + 4 <= core.length; i++)
    if(newCore.indexOf(" " + core.slice(i, i+4).join(" ") + " ") > -1) return false;
  return true;
});
console.log("=== " + PAGE + ": old explanatory strings " + oldT.length
  + ", missing from the new screen: " + missing.length + " ===");
missing.forEach((m,i)=> console.log(" " + (i+1) + ". " + m));
await b.close();
