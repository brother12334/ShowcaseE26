/* THE WEEK COUNT, IN WORDS A BEGINNER CAN READ.

   The card used to open "Week 2 of a 5-week block — 4 building weeks then a deload":
   three pieces of jargon in one line, and it assumes you already know why a week would be
   numbered at all. What is pinned here is that the card says what happens TO YOU this
   week in ordinary words, and that the vocabulary is available to anybody who wants it
   rather than assumed. */
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
  document.body.classList.remove('ai-open','onboarding','pfl-open','spec-open','build-open','news-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.seenNews = NEWS_FOR;
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.splitId=DEFAULT_SPLIT; applySplit();
  save();
  /* Put the lifter a chosen number of weeks into a built, periodised plan and read the
     card back as plain text, the way somebody looking at the screen reads it. */
  window.__at = w=>{
    S.expManual="intermediate";
    S.meso={level:"intermediate",accum:4,deload:1,at:Date.now()};
    S.builtPlan={at:Date.now()};
    delete S.importMeta;
    S.planStart = Date.now() - (w-1)*7*DAY_MS - 36e5;
    DAYS.forEach(wid=>{ S.program[wid]=[
      {name:"Barbell Bench Press", sets:4, reps:"6-10", rpes:[7,8,8,9]},
      {name:"Lat Pulldown", sets:3, reps:"8-12", rpes:[7,8,9]}]; });
    saveQuiet();
    const d=document.createElement('div'); d.innerHTML = periodCardHTML();
    return {text: d.textContent.replace(/\s+/g,' ').trim(),
            head: (d.querySelector('h3')||{}).textContent || "",
            terms: Array.from(d.querySelectorAll('[data-term]')).map(x=> x.dataset.term)};
  };
});
const at = w=> p.evaluate(x=> window.__at(x), w);

console.log("1 - THE HEADING SAYS WHERE YOU ARE, OF WHAT");
{
  const a = await at(2), e = await at(7);
  ck("week 2 reads \"Week 2 of 5\"", /^Week 2 of 5$/.test(a.head.trim()), a.head);
  /* Seven weeks in is week 2 of the second run, not "week 7 of 5". */
  ck("and week 7 wraps to week 2 of 5, not past the end",
     /^Week 2 of 5$/.test(e.head.trim()), e.head);
  ck("a bare \"Week 7\" with no total is never shown",
     !/^Week \d+$/.test(a.head.trim()) && !/^Week \d+$/.test(e.head.trim()),
     a.head + " | " + e.head);
}

console.log("2 - IT SAYS WHAT HAPPENS TO YOU, NOT WHAT THE PHASE IS CALLED");
{
  const r = await at(2);
  ck("it says the sets get harder", /get a little harder each week/i.test(r.text), r.text.slice(0,200));
  ck("it counts down to the easy week", /before the easy week/i.test(r.text), r.text.slice(0,260));
  ck("it says the cycle repeats", /starts again/i.test(r.text), r.text.slice(0,260));
}

console.log("3 - THE JARGON IS OFFERED, NOT ASSUMED");
{
  const r = await at(2);
  /* These are the words that meant nothing to somebody reading the old copy. They may
     appear behind the glossary link; they may not be the first thing on the card. */
  ck("the card does not say \"deload\"", !/deload/i.test(r.text), r.text.slice(0,260));
  ck("nor \"accumulation\" or \"building weeks\"",
     !/accumulation|building week/i.test(r.text), r.text.slice(0,260));
  ck("nor \"mesocycle\"", !/mesocycle/i.test(r.text), r.text.slice(0,260));
  ck("there is a way to ask what it means", /What does this mean/i.test(r.text), r.text.slice(0,260));
  ck("and it opens the block entry", r.terms.indexOf("block") >= 0, JSON.stringify(r.terms));
}

console.log("4 - THE EASY WEEK EXPLAINS ITSELF");
{
  const r = await at(5);
  ck("it says plainly that this is the easy week",
     /this is your easy week/i.test(r.text), r.text.slice(0,260));
  ck("it says what to do: same weights, about half the sets",
     /same weights/i.test(r.text) && /half the sets/i.test(r.text), r.text.slice(0,260));
  ck("and why, so it is not read as slacking",
     /tiredness drains off|come back/i.test(r.text), r.text.slice(0,300));
  ck("it does not count down to a week that is already here",
     !/before the easy week/i.test(r.text), r.text.slice(0,260));
}

console.log("5 - THE LAST HARD WEEK SAYS SO");
{
  const r = await at(4);
  ck("week 4 of 5 says the easy one is next",
     /the easy one is next/i.test(r.text), r.text.slice(0,260));
}

console.log("6 - A BEGINNER IS TOLD THE OTHER THING");
{
  const r = await p.evaluate(()=>{
    S.expManual = "beginner";
    S.meso = {level:"beginner", accum:6, deload:0, at:Date.now()};
    S.planStart = Date.now() - 7*DAY_MS - 36e5;
    saveQuiet();
    const d=document.createElement('div'); d.innerHTML = periodCardHTML();
    return d.textContent.replace(/\s+/g,' ').trim();
  });
  ck("no easy week is promised on a schedule",
     /no easy week booked in/i.test(r), r.slice(0,260));
  ck("and it says one will be called when it is needed",
     /tell you when you need one/i.test(r), r.slice(0,300));
  ck("without the words \"training age\"", !/training age/i.test(r), r.slice(0,260));
}

console.log("7 - THE TWO NEW GLOSSARY ENTRIES OPEN AND READ PLAINLY");
{
  const r = await p.evaluate(()=>{
    const out = {};
    ["block","trainingmax"].forEach(k=>{
      const g = GLOSSARY[k];
      const d = document.createElement("div"); d.innerHTML = g ? g.html : "";
      out[k] = {has: !!g, title: g ? g.title : "", def: (d.querySelector(".gl-def")||{}).textContent || "",
                tip: GLOSSARY_TIP[k] || ""};
    });
    return out;
  });
  ck("there is a block entry", r.block.has, JSON.stringify(r.block));
  ck("its one-line definition avoids jargon",
     /gradually harder/i.test(r.block.def) && !/mesocycle|accumulation/i.test(r.block.def), r.block.def);
  ck("it has a hover tip too", r.block.tip.length > 10, r.block.tip);
  ck("there is a training max entry", r.trainingmax.has, JSON.stringify(r.trainingmax));
  ck("which explains the 90% rather than stating it",
     /90/.test(r.trainingmax.def + r.trainingmax.tip), r.trainingmax.def + " | " + r.trainingmax.tip);
}

console.log("8 - TAPPING IT ACTUALLY OPENS THE PAGE");
{
  const r = await p.evaluate(async ()=>{
    window.__at(2);
    TAB = "program"; S.importSrc = "built"; delete S.importMeta; render();
    await new Promise(r=> setTimeout(r, 60));
    const t = document.querySelector('[data-term="block"]');
    if(!t) return {found:false};
    t.click();
    await new Promise(r=> setTimeout(r, 60));
    const m = document.getElementById("modal");
    return {found:true, open: !!m, text: m ? m.textContent.replace(/\s+/g," ").slice(0,200) : ""};
  });
  ck("the link is on the rendered page", r.found === true, JSON.stringify(r));
  ck("and tapping it opens the explanation", r.open === true && /block/i.test(r.text), r.text);
}

console.log("9 - NOTHING THREW");
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
