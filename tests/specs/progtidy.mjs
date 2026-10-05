/* The Program tab: one dead button, and two cards that shouted.

   1. "Build me a plan" on the importer's first screen was bound in bind(), which runs on
      render() — and the importer draws itself into #aiFull without one. The button
      somebody with no plan is most likely to press did nothing at all.
   2. Rest days and testing weeks are set once and left alone, but sat as two full cards
      above the plan itself on every visit.
   3. The plan check printed one full-width row per finding, and the commonest finding is
      the same sentence about a different muscle. */
import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
await p.route(/^https?:/, r=> r.abort());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('onboarding','pfl-open','spec-open','build-open','news-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.seenNews='x'; S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.splitId=DEFAULT_SPLIT; applySplit();
  S.importSrc='built'; delete S.importMeta;
  DAYS.forEach(wid=>{ S.program[wid]=[
    {name:"Barbell Bench Press", sets:4, reps:"6-10", rpes:[7,8,8,9]},
    {name:"Lat Pulldown", sets:3, reps:"8-12", rpes:[7,8,9]}]; });
  save();
});
const ev = (fn, arg)=> p.evaluate(fn, arg);
const quiet = async ()=> ev(async ()=>{
  try{ closeBuildPage(); }catch(e){}
  try{ closeAIImport(); }catch(e){}
  const af=document.getElementById('aiFull'); if(af) af.hidden=true;
  const bf=document.getElementById('buildFull'); if(bf) bf.hidden=true;
  document.body.classList.remove('ai-open','build-open');
  TAB='program'; render();
  await new Promise(r=> setTimeout(r, 80));
});

console.log("1 - THE IMPORTER'S OWN BUILD BUTTON IS BOUND BY THE IMPORTER");
{
  const r = await ev(async ()=>{
    openAIImport();
    await new Promise(r=> setTimeout(r, 150));
    const btn = document.getElementById("aiBuildBtn");
    return {exists: !!btn, bound: !!(btn && btn.onclick),
            inHost: !!(btn && document.getElementById("aiFullIn").contains(btn))};
  });
  ck("the button is on the importer's first screen", r.exists && r.inHost, JSON.stringify(r));
  ck("and it has a handler on it", r.bound === true, JSON.stringify(r));
}
{
  const r = await ev(async ()=>{
    const btn = document.getElementById("aiBuildBtn");
    if(btn) btn.click();
    await new Promise(r=> setTimeout(r, 200));
    return {build: !document.getElementById("buildFull").hidden,
            importer: !document.getElementById("aiFull").hidden};
  });
  ck("pressing it opens the builder", r.build === true, JSON.stringify(r));
  ck("and closes the importer behind it", r.importer === false, JSON.stringify(r));
}
await quiet();

console.log("2 - THE SCHEDULE CONTROLS ARE FOLDED AWAY");
{
  const r = await ev(()=>{
    const f = document.getElementById("schedFold");
    return {there: !!f, open: !!(f && f.open),
            summary: f ? f.querySelector("summary").textContent.trim() : "",
            rest: !!(f && f.textContent.indexOf("Rest days") >= 0),
            tests: !!(f && f.textContent.indexOf("Testing weeks") >= 0)};
  });
  ck("the fold is on the Program tab", r.there === true, JSON.stringify(r));
  ck("and starts closed", r.open === false, JSON.stringify(r));
  ck("its summary says what is inside", /rest days/i.test(r.summary) && /testing/i.test(r.summary), r.summary);
  ck("the rest-day editor is inside it, not removed", r.rest === true, JSON.stringify(r));
  ck("and so are the testing weeks", r.tests === true, JSON.stringify(r));
}
{
  /* A <details> forgets it was open, and moving a rest day re-renders the tab — so
     without the held flag the fold shuts the instant you use what is inside it. */
  const r = await ev(async ()=>{
    const f = document.getElementById("schedFold");
    f.open = true; f.dispatchEvent(new Event("toggle"));
    await new Promise(r=> setTimeout(r, 30));
    render();
    await new Promise(r=> setTimeout(r, 80));
    const f2 = document.getElementById("schedFold");
    return {still: !!(f2 && f2.open), flag: SCHED_FOLD};
  });
  ck("opened, it survives a re-render", r.still === true, JSON.stringify(r));
  ck("because the state is held, not left to the element", r.flag === true, JSON.stringify(r));
}

console.log("3 - THE PLAN CHECK SAYS IT ONCE");
{
  const r = await ev(()=>{
    const d = document.createElement("div"); d.innerHTML = planQualityCardHTML();
    const q = planQuality(S.program, currentSplit(), {gear:(S.setup||{}).gear});
    return {rows: d.querySelectorAll(".st-wrap > .st-row").length,
            fails: q.fail.length, warns: q.warn.length,
            under: q.fail.filter(x=> x.k === "under").length,
            text: d.textContent.replace(/\s+/g," ").trim(),
            labels: Array.from(d.querySelectorAll(".st-row > b")).map(x=> x.textContent.trim()),
            folded: !!d.querySelector("details.adv-fold"),
            openByDefault: !!(d.querySelector("details.adv-fold") || {}).open};
  });
  ck("this plan really does fail on many muscles", r.under >= 6, JSON.stringify({u:r.under}));
  ck("but they are said in one row, not one each",
     r.rows < r.fails, r.rows + " rows for " + r.fails + " failures");
  ck("and every short muscle is still named",
     /Side Delts/.test(r.text) && /Calves/.test(r.text), r.text.slice(0,200));
  ck("the notes are folded", r.folded === true, JSON.stringify(r));
  ck("and closed to begin with", r.openByDefault === false, JSON.stringify(r));
  ck("the row labels are words, not internal keys",
     r.labels.every(x=> !/^(freq|pushpull|quadham|lengthened|under|over)$/.test(x)),
     JSON.stringify(r.labels));
}

console.log("4 - A PLAN WITH NOTHING WRONG STILL SAYS SO");
{
  const r = await ev(()=>{
    const d = document.createElement("div"); d.innerHTML = planQualityCardHTML();
    return d.textContent.replace(/\s+/g," ").trim();
  });
  ck("the card is not empty", r.length > 20, r.slice(0,120));
}

console.log("5 - THE GAP NOTES READ AS ENGLISH");
{
  const r = await ev(()=>{
    const q = planQuality(S.program, currentSplit(), {gear:(S.setup||{}).gear});
    return q.warn.filter(x=> x.k === "missing").map(x=> x.msg);
  });
  ck("there are gap notes to check", r.length > 0, String(r.length));
  ck("none of them says \"No an\" or \"No a\"",
     !r.some(m=> /\bNo an? /.test(m)), JSON.stringify(r.slice(0,3)));
}

console.log("6 - NOTHING THREW");
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
