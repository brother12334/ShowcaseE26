/* THE TAB BAR AFTER RESEARCH TOOK THE FIFTH SLOT.

   Four of the five tabs are not allowed to have changed, and the brief said so twice, so
   that is what most of this checks. The fifth is new, Settings has moved out of the bar
   without losing anything, and the Workout tab still has to appear mid-session.

   Written to fail if ANY of the four survivors is renamed, reordered or dropped, because
   "do not touch these" is the kind of instruction a later refactor forgets. */
import { chromium, APP_URL } from './_e26.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
await p.route(/^https?:/, r=> r.abort());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X');
  localStorage.setItem('ironlog.v1', JSON.stringify({
    setup:{name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()-400*86400e3},
    tourDone:true, geo:'off', splitId:'ppl6', sessions:[],
    /* THE SLEEP PROMPT IS SILENCED, AND LEAVING IT OUT COST AN HOUR. The app opens a
       sleep sheet of its own accord during the hours somebody nominated as their night,
       and a modal over the screen makes every click in this spec time out with
       "intercepts pointer events". So this spec passed all day and would have failed
       every night, which is the worst shape a test failure can have. Same two fields the
       rest of the suite uses. */
    sleepAsked: new Date().toLocaleDateString("en-CA"),
    prefs: {sleepPrompt: false},
    _pad:0 })); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{ S.seenNews = NEWS_FOR; saveQuiet(); render(); });
const ev = (fn,a)=> p.evaluate(fn,a);
const visibleTabs = ()=> ev(()=> Array.from(document.querySelectorAll('nav button'))
  .filter(x=> !x.hasAttribute('hidden'))
  .map(x=> x.dataset.tab));

console.log("1 - EXACTLY FIVE TABS, IN EXACTLY THIS ORDER");
{
  const t = await visibleTabs();
  ck("five tabs are showing", t.length === 5, t.join(","));
  ck("TODAY · HISTORY · BODY · PROGRAM · RESEARCH",
     t.join(",") === "today,history,body,program,research", t.join(","));
  const labels = await ev(()=> Array.from(document.querySelectorAll('nav button'))
    .filter(x=> !x.hasAttribute('hidden'))
    .map(x=> (x.querySelector('.nav-lbl')||{}).textContent));
  ck("and the labels read the same way", labels.join(",") === "Today,History,Body,Program,Research",
     labels.join(","));
  /* Settings is GONE FROM THE BAR but not from the app. */
  const inBar = await ev(()=> !!document.querySelector('nav [data-tab="sync"]'));
  ck("SETTINGS IS NOT IN THE BAR", inBar === false, "");
  ck("but its tab key still exists, so deep links keep working",
     await ev(()=> typeof viewSync === "function"), "");
}

console.log("2 - THE FOUR SURVIVORS WERE NOT TOUCHED");
{
  const r = await ev(()=>{
    const out = {};
    ["today","history","body","program"].forEach(k=>{
      goTab(k);
      out[k] = {tab: TAB, h1: (document.querySelector('h1')||{}).textContent || "",
                empty: !(document.getElementById('app')||{}).innerHTML};
    });
    goTab("today");
    return out;
  });
  ["today","history","body","program"].forEach(k=>{
    ck(k + " still opens and renders something", r[k].tab === k && !r[k].empty,
       JSON.stringify(r[k]));
  });
  /* EVERY SCREEN'S TITLE IS LOWER CASE NOW. The dark glass header writes the screen's
     name as the design sets it — "body", not "BODY" — so these compare without case.
     What is being asserted is unchanged: Body is its own tab with its own name on it. */
  ck("Body is still its own tab, not merged into Research",
     /^body$/i.test((r.body.h1 || "").trim()), r.body.h1);
  ck("and Program is still where it was", r.program.tab === "program", r.program.tab);
}

console.log("3 - RESEARCH IS A REAL DESTINATION");
{
  await ev(()=> goTab("research"));
  const r = await ev(()=> ({
    tab: TAB,
    h1: (document.querySelector('h1')||{}).textContent,
    sub: (document.querySelector('.rs-sub')||{}).textContent,
    navTabs: [...document.querySelectorAll("nav button[data-tab]")].map(el=>el.dataset.tab),
    icon: !!document.querySelector('nav [data-tab="research"] svg path')
  }));
  ck("the tab opens", r.tab === "research", r.tab);
  /* The screen is headed "research" and the words "Research Lab" are still on it, as
     the heading of the list itself. Both are checked, because the point of this
     assertion is that the destination is named and recognisable — losing the name
     entirely is the regression it exists to catch. */
  ck("the page is headed research", /^research$/i.test((r.h1 || "").trim()), r.h1);
  ck("AND IT IS STILL THE RESEARCH LAB",
     /research lab/i.test(await p.evaluate(()=> document.getElementById("app").innerText)),
     "not on the screen");
  ck("with the subtitle the brief asked for",
     r.sub === "New science for better training.", r.sub);
  ck("Research is the last destination in the tab bar", r.navTabs.at(-1) === "research", r.navTabs.join(", "));
  ck("Settings remains outside the tab bar", !r.navTabs.includes("sync"), r.navTabs.join(", "));
  ck("the nav icon is a drawn SVG, not a glyph or an emoji", r.icon === true, "");
}

console.log("4 - SETTINGS IS ONE TAP FROM TODAY, AND INTACT");
{
  await ev(()=> goTab("today"));
  const gear = await ev(()=> {
    const b = document.querySelector('#todaySettings');
    if(!b) return null;
    const r = b.getBoundingClientRect();
    const a = getComputedStyle(b, '::after');
    return {label: b.getAttribute('aria-label'), w: Math.round(r.width), h: Math.round(r.height),
            hitW: parseInt(a.width, 10) || 0, hitH: parseInt(a.height, 10) || 0,
            right: r.left > 390 / 2};
  });
  ck("the icon is on Today", !!gear, "");
  ck("labelled for a screen reader", gear && gear.label === "Settings", gear && gear.label);
  ck("IT IS IN THE TOP-RIGHT", gear && gear.right === true, JSON.stringify(gear));
  ck("AND ITS TAP TARGET IS 44px, even though the circle is smaller",
     gear && gear.hitW >= 44 && gear.hitH >= 44,
     gear && (gear.w + "x" + gear.h + " visual, " + gear.hitW + "x" + gear.hitH + " target"));
  await p.click('#todaySettings');
  const after = await ev(()=> ({tab: TAB, h1: (document.querySelector('h1')||{}).textContent,
                                cards: document.querySelectorAll('.card').length,
                                back: !!document.querySelector('#setToToday')}));
  ck("tapping it opens Settings",
     after.tab === "sync" && /^settings$/i.test((after.h1 || "").trim()),
     JSON.stringify(after));
  ck("with its content, not an empty shell", after.cards > 3, String(after.cards));
  ck("AND A WAY BACK, because there is no lit tab to leave from", after.back === true, "");
  await p.click('#setToToday');
  ck("which returns to Today", await ev(()=> TAB) === "today", "");
}

console.log("5 - EVERY SETTINGS SUB-PAGE STILL RENDERS");
{
  const r = await ev(()=>{
    goTab("sync");
    const keys = setGroups().map(g=> g.k);
    const bad = [];
    keys.forEach(k=>{
      SET_PAGE = k;
      try{
        const h = viewSync();
        if(!h || h.length < 50) bad.push(k + ":thin");
      }catch(e){ bad.push(k + ":" + e.message); }
    });
    SET_PAGE = null;
    return {n: keys.length, bad};
  });
  ck("there are sub-pages to check", r.n > 3, String(r.n));
  ck("AND EVERY ONE OF THEM RENDERS", r.bad.length === 0, r.bad.join(", "));
}

console.log("6 - THE WORKOUT TAB STILL APPEARS MID-SESSION");
{
  const r = await ev(()=>{
    const before = !!document.querySelector('nav [data-tab="workout"]:not([hidden])');
    S.active = {startedAt: Date.now(), workoutId: (DAYS||[])[0] || "pusha", entries: []};
    syncWorkoutTab();
    const during = !!document.querySelector('nav [data-tab="workout"]:not([hidden])');
    delete S.active;
    syncWorkoutTab();
    return {before, during};
  });
  ck("hidden with no session", r.before === false, "");
  ck("SHOWN DURING ONE", r.during === true, "");
  /* It does not vanish on the same frame: startWorkoutTuck() animates it away and hides it
     when that finishes, which is existing behaviour and the reason the first version of
     this check failed. Waited for rather than asserted synchronously. */
  let tucked = false;
  try{
    await p.waitForFunction(()=>
      !document.querySelector('nav [data-tab="workout"]:not([hidden])'), null, {timeout: 4000});
    tucked = true;
  }catch(e){}
  ck("AND TUCKS ITSELF AWAY AFTERWARDS", tucked === true,
     "still visible 4s after the session ended");
}

console.log("7 - THE TOUR AND THE RELEASE NOTE WERE UPDATED");
{
  const r = await ev(()=> ({
    tabs: TOUR_STEPS.map(s=> s.tab),
    hasResearch: TOUR_STEPS.some(s=> s.tab === "research"),
    settingsStep: TOUR_STEPS.find(s=> /Account and settings/.test(s.title || "")) || null,
    news: NEWS.map(x=> x.k),
    ver: NEWS_FOR, app: APP_VERSION
  }));
  ck("the tour visits Research", r.hasResearch === true, r.tabs.join(","));
  ck("NO TOUR STEP STILL SENDS ANYBODY TO A SETTINGS TAB THAT ISN'T THERE",
     r.tabs.indexOf("sync") === -1, r.tabs.join(","));
  ck("the settings step survives, pointing at the icon instead",
     !!r.settingsStep && r.settingsStep.sel === "#todaySettings",
     JSON.stringify(r.settingsStep));
  ck("and it says where that icon is", !!r.settingsStep && /top right/.test(r.settingsStep.text),
     r.settingsStep && r.settingsStep.text.slice(0, 90));
  /* The move still has to be ON the page \u2014 somebody opening the app after a gap needs
     to be told a tab went somewhere else. It does not have to LEAD any more: the page
     is a stack, newest first, and pinning this release to the top of it would mean
     every release after it had to lie about what it changed. */
  ck("the release note still carries the move",
     r.news.some(k=> /Settings moved/.test(k || "")), r.news.slice(0,3).join(" | "));
  ck("and the version was bumped for it", r.ver === r.app, r.ver + " vs " + r.app);
}

console.log("8 - NOTHING THREW");
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
