import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1100}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding');
  const af=document.getElementById('aiFull'); if(af) af.hidden=true;
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.priorTrainingWeeks=100; S.priorAsked=1;
  S.splitId=DEFAULT_SPLIT; applySplit();
  /* The state from the report: the bar and the convention are answered, the plates are
     not, so the app could not count plates and said so as if nothing were set. */
  S.prefs = Object.assign({}, S.prefs, {barMode:"total", barWeight:45, smithWeight:25, plateStep:null});
  save();
});
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

console.log("1 - IT SAYS WHICH HALF IT HAS AND WHICH IT NEEDS");
{
  const r = await p.evaluate(()=>{
    const en = {name:"Barbell Bench Press", sets:[{weight:"135", reps:"8"}]};
    const html = plateLineHTML(en);
    const d = document.createElement("div"); d.innerHTML = html;
    return {txt: d.textContent.replace(/\s+/g," ").trim(),
            chips: [...d.querySelectorAll("[data-plfast]")].map(x=> x.dataset.plfast),
            link: !!d.querySelector("[data-platefix]"),
            step: trainPrefs().plateStep};
  });
  console.log("     " + r.txt);
  ck("it is still honest that it cannot count the plates", /No plate count for/.test(r.txt), r.txt);
  ck("it names what IS set", /bar 45|is set/.test(r.txt), r.txt);
  ck("and what it still needs", /which plates you have/.test(r.txt), r.txt);
  ck("the answer is offered on the spot", r.chips.length>=3, r.chips.join(","));
  ck("with the full kit page still one tap away", r.link, String(r.link));
}

console.log("2 - ANSWERING IT THERE IS THE WHOLE ANSWER, IN THE SESSION");
{
  const r = await p.evaluate(()=>{
    /* A real session, so the real handler is bound: this is the tap a lifter makes. */
    trainPrefs().plateStep = null;
    S.active = {date: todayStr(), workoutId: ROTATION[0], startedAt: Date.now(),
      entries:[{name:"Barbell Bench Press", reps:"6-8",
                sets:[{weight:"135", reps:"", rpe:"", done:false}]}]};
    save(); TAB="workout"; render();
    const chip = document.querySelector('[data-plfast="5"]');
    if(!chip) return {none:true};
    chip.click();
    const t = document.body.innerText;
    return {step: trainPrefs().plateStep,
            gone: !document.querySelector('[data-plfast]'),
            count: /135 lb =/.test(t)};
  });
  ck("tapping a plate size writes it", r.step===5, String(r.step));
  ck("the question is gone", r.gone, String(r.gone));
  ck("and the line is now a plate count", r.count, String(r.count));
}

console.log("3 - A SMITH MACHINE ASKS ITS OWN QUESTION");
{
  const r = await p.evaluate(()=>{
    S.prefs = Object.assign({}, S.prefs, {plateStep:null, smithWeight:null}); save();
    const en = {name:"Incline Smith Machine Bench Press", sets:[{weight:"85", reps:"8"}]};
    const d = document.createElement("div"); d.innerHTML = plateLineHTML(en);
    return {txt: d.textContent.replace(/\s+/g," ").trim()};
  });
  console.log("     " + r.txt);
  ck("it asks about the carriage, not a barbell", /carriage/.test(r.txt), r.txt);
}

console.log("4 - THE BAR SETTING SAYS PLATES ARE A SEPARATE QUESTION");
{
  const r = await p.evaluate(()=>{
    trainPrefs().plateStep = null;
    S.active = null; save();
    TAB="sync"; SET_PAGE="gym"; render();
    const t = document.body.innerText;
    const link = !!document.querySelector('[data-platefix]');
    trainPrefs().plateStep = 2.5; save(); render();
    return {unset: /Plates are a separate question/.test(t), offered: link,
            set: /Yours is set to/.test(document.body.innerText)};
  });
  ck("the bar question says plates are asked elsewhere", r.unset, String(r.unset));
  ck("with a way to answer it from there", r.offered, String(r.offered));
  ck("and once answered it says so", r.set, String(r.set));
}

console.log("5 - AND THAT WAY LANDS ON THE PAGE THAT HAS IT");
{
  const r = await p.evaluate(()=>{
    trainPrefs().plateStep = null; save();
    TAB="sync"; SET_PAGE="gym"; render();
    const link = document.querySelector('[data-platefix]');
    if(!link) return {none:true};
    link.click();
    return {page: SET_PAGE, asks: /smallest plate you can put on each side/i.test(document.body.innerText)};
  });
  ck("it goes to Where you train", r.page==="where", r.page);
  ck("which is the page carrying the plate question", r.asks, String(r.asks));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
