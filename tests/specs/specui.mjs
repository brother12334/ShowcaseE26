import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:390,height:900}, hasTouch:true});
const p = await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
const boot = (opts)=> p.evaluate((o)=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open','spec-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  try{ closeSpecPage(false); }catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.splitId=DEFAULT_SPLIT; applySplit();
  S.spec=null; S.specPast=[]; S.deload=null; S.specDraft=null; BODY_OPEN={};
  S.prefs = Object.assign({}, S.prefs, {calGoal:"maintain"});
  S.checkins = {};
  const day=86400000, now=Date.now();
  if(o && o.good){ for(let i=0;i<12;i++){
    S.checkins[new Date(now-i*day).toLocaleDateString("en-CA")] = {sleep:"8", energy:"8"}; } }
  S.sessions=[]; let n=0;
  for(let i=84;i>=1;i--){ if(i%4===0) continue;
    const wid=ROTATION[n%ROTATION.length]; n++;
    const ents=(planSlotList(wid)||[]).slice(0,5); if(!ents.length) continue;
    S.sessions.push({id:"s"+i, date:new Date(now-i*day).toLocaleDateString("en-CA"),
      workoutId:wid, startedAt:now-i*day, finishedAt:now-i*day+36e5, feel:4,
      entries:ents.map(e=>({name:e.name, reps:"8",
        sets:[0,1,2].map(k=>({weight:String(120+k*5), reps:"8",
                              rpe:(o&&o.rated===false)?"":"8", done:true}))}))}); }
  S.cycleStart = now - 2*day; save(); goTab("body"); render();
}, opts || {});
const page = ()=> p.evaluate(()=>({
  open: !document.getElementById("specFull").hidden,
  modal: document.getElementById("modalBg").classList.contains("show"),
  txt: (document.getElementById("specFullIn")||{}).innerText || "",
  step: (document.querySelector(".spec-steps")||{}).textContent || "",
  title: (document.querySelector(".spec-h")||{}).textContent || ""
}));
const tap = sel => p.evaluate(s=>{ const el = document.querySelector(s); if(el) el.click(); return !!el; }, sel);
await boot({good:true});

console.log("1 - EVERY ENTRY POINT OPENS THE SAME FULL PAGE, NOT A SHEET");
{
  const before = await page();
  ck("nothing is open to begin with", !before.open, String(before.open));
  await tap("[data-specstart]");
  const r = await page();
  ck("a full page opens", r.open, String(r.open));
  ck("and no modal, sheet or dialog is used", !r.modal, String(r.modal));
  ck("it is a step in a flow and says which", /step 1 of/i.test(r.step), r.step);
  ck("with its own heading", /which muscles/i.test(r.title), r.title);
  const sized = await p.evaluate(()=>{
    const w = document.getElementById("specFull");
    const st = getComputedStyle(w), r2 = w.getBoundingClientRect();
    return {fixed: st.position === "fixed", full: Math.round(r2.width) === window.innerWidth
            && Math.round(r2.height) === window.innerHeight};
  });
  ck("it covers the screen rather than floating over it", sized.fixed && sized.full, JSON.stringify(sized));
  await p.evaluate(()=> closeSpecPage(false));
  await tap("[data-specwhy]");
  const w = await page();
  ck("the explanation opens the same page", w.open && !w.modal, JSON.stringify(w));
  ck("and names its sources", /Enes 2024/.test(w.txt) && /Bickel 2011/.test(w.txt), "");
  ck("and says responses vary", /responses vary/i.test(w.txt), "");
  ck("and never says blast", !/blast/i.test(w.txt), "");
  await p.evaluate(()=> closeSpecPage(false));
}

console.log("2 - STEPPING THROUGH, FORWARD AND BACK, KEEPS YOUR ANSWERS");
{
  await tap("[data-specstart]");
  await tap('[data-specpick="chest"]');
  let r = await page();
  ck("picking marks it", await p.evaluate(()=> SPEC_UI.pick.join(",")) === "chest", "");
  await tap("[data-specnext]");
  r = await page();
  ck("step 2 is the pre-block check", /before you add volume/i.test(r.title), r.title);
  await tap("[data-specnext]");
  r = await page();
  ck("step 3 asks about the rest of your body", /rest of your body/i.test(r.title), r.title);
  await tap("[data-specback]");
  r = await page();
  ck("back returns to the check", /before you add volume/i.test(r.title), r.title);
  await tap("[data-specback]");
  ck("and back again to the pick, with it still picked",
     await p.evaluate(()=> SPEC_UI.pick.join(",")) === "chest", "");
}

console.log("3 - THE REST-OF-BODY STEP SHOWS THE TRADE AS A NUMBER");
{
  await tap("[data-specnext]"); await tap("[data-specnext]");
  const r = await p.evaluate(()=>{
    const cards = [...document.querySelectorAll("[data-specset]")].map(c=> ({
      set: c.dataset.specset, off: c.disabled,
      txt: c.innerText.replace(/\s+/g," ")
    }));
    return {cards, def: specDefaultSetting(SPEC_UI.pick.length, specNutritionGoal())};
  });
  ck("all three settings are offered", r.cards.length === 3, JSON.stringify(r.cards.map(c=>c.set)));
  ck("each says what happens to everything else",
     r.cards.every(c=> /Others:/.test(c.txt)), JSON.stringify(r.cards.map(c=>c.txt.slice(0,70))));
  /* Keep all is not always "no change": a muscle already trained past 90% of its measured
     ceiling is brought back to that in every setting. What must hold is the ordering. */
  const pctOf = t=> { const m2 = t.match(/Others: (-?\d+)%/); return m2 ? parseInt(m2[1],10) : 0; };
  const f = pctOf(r.cards.find(c=>c.set==="FOCUS").txt);
  const bl = pctOf(r.cards.find(c=>c.set==="BALANCED").txt);
  const k = pctOf(r.cards.find(c=>c.set==="KEEP_ALL").txt);
  ck("Focus cuts the most, Keep all the least", f < bl && bl < k, JSON.stringify({f, bl, k}));
  ck("and Focus is a real cut", f <= -25, String(f));
  ck("one is marked recommended", r.cards.some(c=> /recommended/i.test(c.txt)), "");
  ck("and it is the default for one muscle", r.def === "BALANCED", r.def);
  ck("with good sleep, Keep all is available",
     !r.cards.find(c=>c.set==="KEEP_ALL").off, JSON.stringify(r.cards.find(c=>c.set==="KEEP_ALL")));
}

console.log("3b - AND WHEN IT IS NOT AVAILABLE IT SAYS WHY");
{
  await boot({good:false});
  await p.evaluate(()=>{
    const day=86400000, now=Date.now();
    for(let i=0;i<12;i++) S.checkins[new Date(now-i*day).toLocaleDateString("en-CA")] = {sleep:"6.2", energy:"8"};
    save();
  });
  await tap("[data-specstart]");
  await tap('[data-specpick="chest"]');
  await tap("[data-specnext]"); await tap("[data-specnext]");
  const r = await p.evaluate(()=>{
    const c = document.querySelector('[data-specset="KEEP_ALL"]');
    return {off: c.disabled, txt: c.innerText.replace(/\s+/g," ")};
  });
  ck("Keep all is disabled", r.off, String(r.off));
  ck("and the reasons are the actual figures",
     /sleep averaged 6\.2/.test(r.txt) && /recovery is at/.test(r.txt), r.txt);
}

console.log("4 - THE PLAN SHOWS BOTH HALVES, AND CAN BE ACTED ON");
{
  await boot({good:true});
  await tap("[data-specstart]");
  await tap('[data-specpick="chest"]');
  await tap("[data-specnext]"); await tap("[data-specnext]");
  await tap('[data-specset="FOCUS"]');
  await tap("[data-specnext]");
  const r = await page();
  ck("it is the plan step", /the plan/i.test(r.title), r.title);
  ck("the muscle's own numbers", /sets a week/.test(r.txt), r.txt.slice(0,80));
  ck("every other muscle, from and to", /Everything else/.test(r.txt), "");
  ck("that effort is kept and sets are cut", /Same loads, same effort, fewer sets/.test(r.txt), "");
  ck("the length and when it ends", /weeks/.test(r.txt) && /Ends around/.test(r.txt), "");
  ck("and the cooldown", /waits 6 weeks/.test(r.txt), r.txt.slice(-200));
  const wk = await p.evaluate(()=>{
    document.querySelector('[data-specweeks="10"]').click();
    return {weeks: SPEC_UI.weeks, txt: document.getElementById("specFullIn").innerText};
  });
  ck("the length can be changed right there", wk.weeks === 10 && /10 weeks/.test(wk.txt), String(wk.weeks));
}

console.log("4b - AND THE ADD-TO-A-DAY BUTTON ACTUALLY WORKS");
{
  /* At a starting target the days already there are usually enough, so the offer is
     normally absent \u2014 which is how a missing specAddToDay() once slipped through. The
     suggester is held to one known day so the BUTTON is what is under test. */
  const r = await p.evaluate(()=>{
    const real = window.specSuggestDays;
    window.specSuggestDays = ()=> [{workoutId: ROTATION[0], name: dayName(ROTATION[0]),
                                    sets: 3, pick: "Cable Fly"}];
    SPEC_UI.step = SPEC_STEPS.indexOf("plan");
    renderSpecPage();
    window.specSuggestDays = real;
    const btn = document.querySelector("[data-specadd]");
    if(!btn) return {none:true};
    const [m, wid, name] = btn.dataset.specadd.split("|");
    const before = (S.program[wid]||[]).length;
    let threw = null;
    try{ btn.click(); }catch(e){ threw = String(e.message); }
    const after = (S.program[wid]||[]).length;
    btn.disabled = false; btn.click();
    return {wid, name, before, after, threw, label: btn.innerText,
            third: (S.program[wid]||[]).length,
            added: (S.program[wid]||[]).slice(-1)[0]};
  });
  ck("the button is drawn", !r.none, JSON.stringify(r));
  ck("pressing it does not throw", !r.threw, String(r.threw));
  ck("and it lands on that day", r.after === r.before + 1, JSON.stringify(r));
  ck("as the movement it offered", r.added && r.added.name === "Cable Fly", JSON.stringify(r.added));
  ck("within the per-session limit", r.added && r.added.sets <= 10, JSON.stringify(r.added));
  ck("it says it landed", /added to/i.test(r.label || ""), r.label);
  ck("and it cannot be added twice", r.third === r.after, String(r.third));
  await p.evaluate(()=>{ SPEC_UI.step = SPEC_STEPS.indexOf("plan"); renderSpecPage(); });
}

console.log("5 - STARTING IT, AND LANDING SOMEWHERE THAT SAYS WHAT HAPPENED");
{
  await tap("[data-specnext]");
  const conf = await page();
  ck("the last step is a confirmation", /ready/i.test(conf.title), conf.title);
  ck("naming the muscle, the setting and the length",
     /Chest/.test(conf.txt) && /Focus/.test(conf.txt) && /10 weeks/.test(conf.txt), conf.txt.slice(0,160));
  const r = await p.evaluate(()=>{
    document.querySelector("[data-specstartblock]").click();
    try{ hideModal(); }catch(e){}
    return {live: !!specActive(), setting: specActive() && specActive().setting,
            weeks: specActive() && specActive().weeks,
            pageOpen: !document.getElementById("specFull").hidden,
            draft: !!S.specDraft};
  });
  ck("the block is running", r.live, String(r.live));
  ck("on the setting you chose", r.setting === "FOCUS", String(r.setting));
  ck("for the length you chose", r.weeks === 10, String(r.weeks));
  ck("the page closes", !r.pageOpen, String(r.pageOpen));
  ck("and the draft is cleared", !r.draft, String(r.draft));
}

console.log("6 - THE DASHBOARD IS A PAGE TOO, AND THE SETTING CAN BE CHANGED FROM IT");
{
  await p.evaluate(()=> render());
  await tap("[data-specdash]");
  const r = await page();
  ck("it opens as a page", r.open && !r.modal, JSON.stringify(r));
  ck("it names the setting", /Rest of your body/.test(r.txt) && /Focus/.test(r.txt), r.txt.slice(0,200));
  ck("it lists what is being held, with a verdict",
     /Everything else/.test(r.txt), "");
  await tap("[data-specchangeset]");
  const c = await page();
  ck("changing it opens the same step-4 screen", /rest of your body/i.test(c.title), c.title);
  const ch = await p.evaluate(()=>{
    document.querySelector('[data-specset="BALANCED"]').click();
    document.querySelector("[data-specsetapply]").click();
    return {setting: specActive().setting, step: specActive().step,
            ceiling: specActive().ceiling,
            logged: (specActive().settingLog||[]).slice(-1)[0]};
  });
  ck("the setting changes", ch.setting === "BALANCED", ch.setting);
  ck("and the steps and ceiling change with it", ch.step === 2 && ch.ceiling === 36,
     ch.step + "/" + ch.ceiling);
  ck("and it is written down with a reason", ch.logged && ch.logged.to === "BALANCED" && !!ch.logged.why,
     JSON.stringify(ch.logged));
}

console.log("7 - A DRAFT SURVIVES LEAVING, AND EXPIRES HONESTLY");
{
  await boot({good:true});
  await tap("[data-specstart]");
  await tap('[data-specpick="chest"]');
  await tap("[data-specnext]");
  const left = await p.evaluate(()=>{
    specTryClose();                                  // mid-setup, with choices made
    const asked = document.getElementById("modalBg").classList.contains("show");
    document.querySelector("#specLeave").click();
    return {asked, draft: S.specDraft, open: !document.getElementById("specFull").hidden};
  });
  ck("it asks before dropping your choices", left.asked, String(left.asked));
  ck("the draft is kept", left.draft && left.draft.pick.join(",") === "chest", JSON.stringify(left.draft));
  ck("and the page closes", !left.open, String(left.open));
  const back = await p.evaluate(()=>{
    render();
    const label = (document.querySelector("[data-specstart]")||{}).textContent || "";
    openSpecPage("setup");
    return {label, pick: SPEC_UI.pick.join(","), step: SPEC_UI.step};
  });
  ck("the card offers to finish it", /finish setting one up/i.test(back.label), back.label);
  ck("and it resumes where you left off", back.pick === "chest" && back.step > 0, JSON.stringify(back));
  const old = await p.evaluate(()=>{
    closeSpecPage(false);
    S.specDraft.at = Date.now() - 9*86400000;        // older than a week
    openSpecPage("setup");
    return {pick: SPEC_UI.pick.join(","), step: SPEC_UI.step, why: SPEC_UI.restarted,
            txt: document.getElementById("specFullIn").innerText};
  });
  ck("an old draft starts again", old.step === 0 && old.why === "expired", JSON.stringify(old.why));
  ck("but keeps what you picked", old.pick === "chest", old.pick);
  ck("and says so rather than silently losing your place",
     /more than a week old/.test(old.txt), old.txt.slice(0,160));
}

console.log("8 - AND A CYCLE CLOSING UNDER A DRAFT RESTARTS IT, BECAUSE THE NUMBERS MOVED");
{
  const r = await p.evaluate(()=>{
    closeSpecPage(false);
    S.specDraft = {at: Date.now(), step: 3, pick: ["chest"], setting: "FOCUS",
                   weeks: 8, touched: true, cycleStamp: 111};
    S.lastCycle = {start: 0, end: 222};
    openSpecPage("setup");
    return {step: SPEC_UI.step, why: SPEC_UI.restarted, pick: SPEC_UI.pick.join(",")};
  });
  ck("it goes back to step 1", r.step === 0, String(r.step));
  ck("because its numbers are stale", r.why === "moved", String(r.why));
  ck("and your muscles are still selected", r.pick === "chest", r.pick);
  await p.evaluate(()=> closeSpecPage(false));
}

console.log("9 - NO STEP OF ANY OF THIS IS A MODAL");
{
  const r = await p.evaluate(()=>{
    S.specDraft = null; S.spec = null; hideModal(); render();
    const clean = !document.getElementById("modalBg").classList.contains("show");
    const seen = [{k:"(before)", modal: !clean, hidden:false, pos:"fixed", full:true}];
    openSpecPage("setup");
    SPEC_UI.pick = ["chest"];
    for(const k of SPEC_STEPS){
      SPEC_UI.step = SPEC_STEPS.indexOf(k);
      try{ renderSpecPage(); }catch(e){ seen.push(k + ":threw " + e.message); continue; }
      const modal = document.getElementById("modalBg").classList.contains("show");
      const w = document.getElementById("specFull");
      const st = getComputedStyle(w);
      seen.push({k, modal, hidden: w.hidden, pos: st.position,
                 full: Math.round(w.getBoundingClientRect().width) === window.innerWidth});
    }
    closeSpecPage(false);
    return seen;
  });
  ck("every step renders full-screen", r.slice(1).every(x=> x.full && !x.hidden && x.pos === "fixed"),
     JSON.stringify(r));
  ck("and none of them opens a modal", r.every(x=> !x.modal), JSON.stringify(r));
}

console.log("10 - AND WITH NO BLOCK, THE BODY TAB IS WHAT IT ALWAYS WAS");
{
  const r = await p.evaluate(()=>{
    S.spec = null; S.specPast = []; S.specDraft = null; render();
    return {offer: !!document.querySelector("[data-specstart]"),
            live: !!document.querySelector(".nb-spec-on"),
            pageHidden: document.getElementById("specFull").hidden,
            tabOk: !!document.querySelector(".nb-map") && !!document.querySelector(".nb-hero")};
  });
  ck("it is an offer again", r.offer && !r.live, JSON.stringify(r));
  ck("the page is out of the way", r.pageHidden, String(r.pageHidden));
  ck("and the rest of the tab is untouched", r.tabOk, String(r.tabOk));
}

console.log(errs.length?("PAGE ERRORS: "+errs.join(" | ")):"no page errors");
if(errs.length) bad++;
console.log(bad?("BROKEN: "+bad):"all good");
await b.close();
