/* F and H - the container system, and three sizes of sheet.

   The point of both is the same: a frame is a signal, and a signal you use for
   everything is wallpaper. */
import { chromium, APP_URL, shot } from './_e26.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:844}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
await p.route(/^https?:/, r=> r.abort());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
const ev = (fn,a)=> p.evaluate(fn,a);

await ev(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open','spec-open','build-open','news-open');
  const af=document.getElementById('aiFull'); if(af) af.hidden=true;
  S.seenNews='x'; S.tourDone=true; S.geo='off'; S.priorTrainingWeeks=104;
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.splitId=DEFAULT_SPLIT; applySplit();
  DAYS.forEach(w=>{ S.program[w]=[{name:"Barbell Bench Press",sets:3,reps:"5-8",rpes:[7,8,9],weight:185}]; });
  save(); TAB="program"; render();
});

console.log("1 - THE FOUR CONTAINERS EXIST AND SAY WHAT THEY ARE FOR");
{
  const r = await ev(()=>{
    const want = {};
    Array.from(document.styleSheets).forEach(s=>{
      try{ Array.from(s.cssRules).forEach(r2=>{
        if(r2.selectorText === ".e-field") want.field = r2.style.cssText.slice(0,120);
        if(r2.selectorText === ".e-row")   want.row   = r2.style.cssText;
        if(r2.selectorText === ".e-rule")  want.rule  = r2.style.cssText.slice(0,120);
        if(r2.selectorText === ".card")    want.card  = r2.style.cssText.slice(0,120);
      }); }catch(e){}
    });
    return want;
  });
  ck("a field", !!r.field, String(r.field).slice(0,60));
  ck("a card", !!r.card, String(r.card).slice(0,60));
  ck("a row", !!r.row, String(r.row).slice(0,60));
  ck("and a rule", !!r.rule, String(r.rule).slice(0,60));
  ck("the row has a hairline, not a box",
     /border-bottom[^;]*solid/.test(r.row || "") && /border-radius: 0/.test(r.row || ""),
     String(r.row).slice(-120));
}

console.log("2 - A TOOLBAR IS NOT A THING YOU ACT ON AS A UNIT");
{
  const r = await ev(async ()=>{
    startWorkout(DAYS[0]);
    const pf=document.getElementById("preflight"); if(pf) pf.remove();
    try{PF=null}catch(e){}
    TAB="workout"; render();
    await new Promise(r2=> setTimeout(r2, 160));
    const tools = document.querySelector(".ws-tools");
    const head = document.querySelector(".ws-head");
    return {tools: !!tools, inCard: !!(tools && tools.closest(".card")),
      head: !!head, n: tools ? tools.querySelectorAll("button").length : 0};
  });
  ck("the session's tools are there", r.tools === true && r.n >= 3, JSON.stringify(r));
  ck("AND THEY ARE NOT IN A CARD", r.inCard === false, String(r.inCard));
}

console.log("3 - THREE SIZES OF SHEET, AND THE SIZE IS THE SIGNAL");
{
  const r = await ev(()=>{
    const out = {};
    Array.from(document.styleSheets).forEach(s=>{
      try{ Array.from(s.cssRules).forEach(r2=>{
        const sel = r2.selectorText || "";
        if(sel === ".modal.mo-prompt") out.prompt = r2.style.cssText;
        if(sel === ".modal.mo-page") out.page = r2.style.cssText;
        if(/mo-prompt/.test(sel) && /animation/.test(r2.style.cssText || "")) out.pA = r2.style.animation;
        if(/mo-page/.test(sel) && /animation/.test(r2.style.cssText || "")) out.gA = r2.style.animation;
      });
      Array.from(s.cssRules).forEach(r2=>{
        if(r2.type === 7 && r2.name === "sheetUpS") out.sS = r2.cssRules[0].style.transform;
        if(r2.type === 7 && r2.name === "sheetUp")  out.sM = r2.cssRules[0].style.transform;
        if(r2.type === 7 && r2.name === "sheetUpL") out.sL = r2.cssRules[0].style.transform;
      }); }catch(e){}
    });
    return out;
  });
  ck("a prompt size exists", !!r.prompt, String(r.prompt).slice(0,60));
  ck("and a page size", !!r.page, String(r.page).slice(0,60));
  const px = v=> parseFloat(String(v).replace(/[^\d.]/g, "")) || 0;
  ck("a prompt travels least", px(r.sS) < px(r.sM), r.sS + " vs " + r.sM);
  ck("and a page travels most", px(r.sL) > px(r.sM), r.sL + " vs " + r.sM);
}
{
  const r = await ev(async ()=>{
    const pr = askConfirm({title:"Throw this away?", body:"It cannot be undone.", yes:"Throw away"});
    await new Promise(r2=> setTimeout(r2, 200));
    const m = document.getElementById("modal");
    const cls = m.className;
    document.getElementById("askNo").click();
    await pr;
    await new Promise(r2=> setTimeout(r2, 160));
    hideModal();
    openExEditor(DAYS[0], 0);
    await new Promise(r2=> setTimeout(r2, 300));
    const page = document.getElementById("modal").className;
    hideModal();
    return {cls, page};
  });
  ck("a confirm is a prompt", /mo-prompt/.test(r.cls), r.cls);
  ck("and the tallest sheets are pages", /mo-page/.test(r.page), r.page);
}

console.log("4 - THE ONE CONTROL THAT WAS NOT OURS");
{
  const r = await ev(async ()=>{
    hideModal();
    openExEditor(DAYS[0], 0);
    await new Promise(r2=> setTimeout(r2, 300));
    const box = document.querySelector("#modal .togglerow input[type=checkbox]");
    if(!box) return {none: true};
    const cs = getComputedStyle(box);
    const before = getComputedStyle(box, "::before");
    box.checked = true;
    const onCs = getComputedStyle(box);
    const out = {appearance: cs.appearance || cs.webkitAppearance,
      accent: cs.accentColor, radius: cs.borderRadius,
      mark: before.content !== "none", w: Math.round(box.getBoundingClientRect().width)};
    hideModal();
    return out;
  });
  ck("the editor has a checkbox to look at", !r.none, "none found");
  ck("IT IS NOT THE BROWSER'S OWN", r.appearance === "none", String(r.appearance));
  ck("it takes the app's radius", /px/.test(r.radius || ""), r.radius);
  ck("it draws its own tick", r.mark === true, String(r.mark));
  ck("and it is still 22px, not a 44px block", r.w >= 20 && r.w <= 26, String(r.w));
}

console.log("5 - NOTHING THREW");
await ev(()=> hideModal());
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
