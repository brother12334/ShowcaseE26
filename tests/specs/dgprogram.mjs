import { chromium, REPO, appFile, shot } from './_e26.mjs';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
/* PROGRAM, IN DARK GLASS.

   The Program tab printed the entire programme: a card per day, every exercise inside
   it, sets, reps, RPE, percentages and plan marks — about six thousand pixels of it on a
   six-day split. The redesign makes it a list of days again, with the exercises in the
   day each belongs to. That is a rewrite that can go wrong in exactly two ways, and this
   spec is both of them:

     IT CAN LOSE SOMETHING. Four buttons, a fold, a rename, a finisher, a card per
     notice, and twenty muscle rows were on that screen. Section 2 holds the list of
     element ids the old build produced and requires the new one to produce them too;
     section 3 requires every exercise that was printed on the tab to still be printed
     somewhere a tap away, by opening every day and reading it back.

     IT CAN SAY SOMETHING THAT IS NOT TRUE. The header now states which week of the block
     you are on, the rotation row says which day is today, and the plan check says which
     muscles are short. Each of those is a claim about live data, so each is checked
     against the same data read a different way.

   SERVED OVER HTTP, like the other dark-glass specs: the screen has art on it and the
   art has to load. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.json':'application/json', '.webp':'image/webp', '.png':'image/png', '.mp4':'video/mp4',
  '.ttf':'font/ttf', '.svg':'image/svg+xml', '.mp3':'audio/mpeg',
  '.webmanifest':'application/manifest+json' };
/* THE BUILD BEFORE THIS CHANGE, SERVED FROM THE SAME ORIGIN. Read straight out of git
   rather than through the shared helper, which caches tests/.old/HEAD~1.html and would
   hand back whatever HEAD~1 meant the last time some other spec asked. And served at a
   path off the root, not as a file:// URL, because this build loads glass/*.js by a
   relative path: from a file:// page those 404, GLASS_LAYOUT is missing, the Program tab
   throws, and what the comparison would read is the rescue panel. */
const OLD = execFileSync("git", ["show", "HEAD~1:index.html"],
  {cwd: REPO, maxBuffer: 256 * 1024 * 1024, encoding: "utf8"});
const srv = createServer(async (q, r)=>{
  const u = decodeURIComponent(q.url.split('?')[0]);
  if(u === '/__old'){
    r.writeHead(200, {'content-type':'text/html'}); r.end(OLD); return;
  }
  const f = join(REPO, normalize(u === '/' ? '/index.html' : u));
  try{ const bytes = await readFile(f);
    r.writeHead(200, {'content-type': MIME[extname(f)] || 'application/octet-stream'});
    r.end(bytes); }
  catch(e){ r.writeHead(404); r.end('no'); }
});
await new Promise(ok=> srv.listen(0, ok));
const BASE = 'http://127.0.0.1:' + srv.address().port + '/';

const b = await chromium.launch();
let bad = 0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

const httpErr = [], pageErr = [];
async function openApp(url, watch){
  const p = await b.newPage({viewport:{width:390,height:844}});
  p.on('dialog', d=> d.accept());
  if(watch){
    p.on('pageerror', e=> pageErr.push(e.message));
    p.on('response', rs=>{ if(rs.status() >= 400) httpErr.push(rs.status()+' '+rs.url().replace(BASE,'')); });
  }
  await p.addInitScript(()=>{ localStorage.clear();
    localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
    localStorage.setItem('e26.ns0','E26-X'); });
  await p.goto(url, {waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=> typeof S !== 'undefined' && !!S, null, {timeout:20000});
  await p.evaluate(fx=>{
    window.boot = (tab)=>{
      const sp = document.getElementById('splash'); if(sp) sp.remove();
      try{OB=null}catch(e){} try{PF=null}catch(e){} try{hideModal()}catch(e){}
      ['preflight','aiFull'].forEach(id=>{ const el = document.getElementById(id); if(el) el.remove(); });
      document.body.classList.remove('ai-open','onboarding','pfl-open');
      Object.keys(S).forEach(k=>{ delete S[k]; });
      Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
      S.tourDone = true; S.active = null;
      /* The intro moves #stage into its own stage for three seconds when it is owed, so
         a spec that plants a state and renders would find the screen missing. This one
         is about Program; marking it seen is what a person who has seen it has. */
      S.introSeen = (typeof INTRO_GEN === "number") ? INTRO_GEN : 1;
      try{ DAY_EDIT = null; }catch(e){}
      migrate(); try{ applySplit(); }catch(e){}
      TAB = tab || "program"; SET_PAGE = null; render();
      document.querySelectorAll('#toasts .tst').forEach(el=> el.remove());
    };
    /* Every id the tab produces, which is the thing section 2 compares. Folds are opened
       first: a details that is shut still has its contents in the DOM, but opening them
       means the comparison is of what is BUILT, not of what happens to be visible. */
    window.ids = ()=>{
      document.querySelectorAll('#app details').forEach(d=> d.open = true);
      return [...document.querySelectorAll('#app [id]')].map(e=> e.id).sort();
    };
    /* Every exercise name the programme holds, read from the state rather than the
       screen — the question section 3 asks is whether the SCREEN still shows them. */
    window.planNames = ()=>{
      const out = [];
      (DAYS || []).concat(["finisher"]).forEach(w=> (S.program[w] || []).forEach(e=>{
        if(e && e.name) out.push(e.name);
      }));
      return out;
    };
  }, FX);
  return p;
}

const oldP = await openApp(BASE + "__old");
const newP = await openApp(BASE, true);
await oldP.evaluate(()=> boot("program"));
await newP.evaluate(()=> boot("program"));

console.log("\n1. THE SCREEN IS THE REDESIGNED ONE, OR EVERYTHING BELOW TESTS NOTHING");
let r = await newP.evaluate(()=> ({
  dg: !!document.querySelector('[data-dg-screen="program"]'),
  title: (document.querySelector('.dg-top h1') || {}).textContent,
  hero: !!document.querySelector('#stage .hero-media'),
  oldCards: document.querySelectorAll('#app .prog-day, #app .prog-ex').length
}));
ck("the Program tab is drawn as a dark glass screen", r.dg === true);
ck("under its own lowercase title", (r.title || "").trim() === "program", r.title);
ck("with the screen's hero behind it", r.hero === true);
ck("CONTROL: the old day cards and exercise rows are gone from it",
   r.oldCards === 0, String(r.oldCards));

console.log("\n2. NOTHING THE OLD TAB BUILT HAS STOPPED BEING BUILT");
{
  const was = await oldP.evaluate(()=> ids());
  const now = await newP.evaluate(()=> ids());
  const gone = was.filter(x=> now.indexOf(x) < 0);
  ck("CONTROL: the old build really did produce a Program tab to compare with",
     was.length > 3 && was.indexOf("rescueFull") < 0,
     was.indexOf("rescueFull") > -1 ? "it threw and showed the rescue panel" : was.length + " ids");
  ck("every id the old Program tab had is still on the new one",
     gone.length === 0, gone.join(", ") || "none missing");
}

console.log("\n3. THE EXERCISES ARE NOT GONE, THEY ARE IN THE DAY THEY BELONG TO");
{
  r = await newP.evaluate(async ()=>{
    const want = planNames();
    const onTab = want.filter(n=> document.getElementById("app").textContent.includes(n));
    /* Open every day the rotation offers and read what it lists. */
    const seen = new Set();
    const rows = [...document.querySelectorAll('#app [data-dayedit]')];
    for(const row of rows){
      row.click();
      await new Promise(ok=> setTimeout(ok, 30));
      const t = document.getElementById("app").textContent;
      want.forEach(n=>{ if(t.includes(n)) seen.add(n); });
      const back = document.getElementById("deBack");
      if(back){ back.click(); await new Promise(ok=> setTimeout(ok, 30)); }
    }
    const uniq = [...new Set(want)];
    return {want: uniq.length, onTab: onTab.length, rows: rows.length, days: DAYS.length,
            seen: uniq.filter(n=> seen.has(n)).length,
            missing: uniq.filter(n=> !seen.has(n)).slice(0, 6)};
  });
  ck("CONTROL: the plan under test has exercises in it", r.want >= 10, String(r.want));
  ck("CONTROL: and the tab itself no longer lists them all",
     r.onTab < r.want, r.onTab + " of " + r.want + " named on the tab");
  ck("there is a row for every day, and the finisher", r.rows === r.days + 1,
     r.rows + " rows for " + r.days + " days");
  ck("and every exercise in the plan is listed in the day it belongs to",
     r.seen === r.want, "missing: " + (r.missing.join(", ") || "none"));
}

console.log("\n4. THE HEADER STATES THE ROTATION AND THE WEEK, AND BOTH ARE TRUE");
r = await newP.evaluate(()=>{
  const txt = (document.querySelector('.dg-top-r') || {}).textContent || "";
  let w = null; try{ w = planWeekNow(); }catch(e){}
  return {txt: txt.trim(), days: ROTATION.length,
          week: w ? w.week : null, of: w ? w.of : null};
});
ck("CONTROL: the plan has a rotation to count", r.days > 1, String(r.days));
ck("the header counts the days in it", r.txt.indexOf(r.days + " day") === 0, r.txt);
ck("and names the week the plan says you are on",
   r.week == null ? r.txt.indexOf("week") < 0
                  : r.txt.indexOf("week " + r.week + (r.of ? " of " + r.of : "")) > 0,
   r.txt + " vs week " + r.week + " of " + r.of);

console.log("\n5. THE ROTATION ROW KNOWS WHICH DAY IS TODAY");
r = await newP.evaluate(()=>{
  const rows = [...document.querySelectorAll('#app .pg-day')];
  const marked = rows.filter(x=> x.classList.contains('is-today'));
  return {rows: rows.length, marked: marked.length,
          wid: marked[0] ? marked[0].dataset.dayedit : null,
          says: marked[0] ? marked[0].querySelector('.pg-s').textContent.trim() : "",
          today: todaysWorkoutId(),
          names: rows.map(x=> x.querySelector('.pg-n').textContent.trim())};
});
ck("CONTROL: today is a training day in this fixture", !!r.today, String(r.today));
ck("exactly one row is marked as today", r.marked === 1, String(r.marked));
ck("and it is the day the app says is today", r.wid === r.today, r.wid + " vs " + r.today);
ck("the row says so in words too", /^today ·/.test(r.says), r.says.slice(0, 40));
ck("the last row is the finisher", r.names[r.names.length - 1] === "finisher",
   r.names.join(" | "));

console.log("\n6. RENAMING A DAY CAME WITH THE DAY");
r = await newP.evaluate(async ()=>{
  const onTab = document.querySelectorAll('#app [data-renameday]').length;
  const row = document.querySelector('#app .pg-day[data-dayedit]');
  row.click();
  await new Promise(ok=> setTimeout(ok, 40));
  const inDay = document.querySelectorAll('#app [data-renameday]').length;
  const which = (document.querySelector('#app [data-renameday]') || {dataset:{}}).dataset.renameday;
  const back = document.getElementById("deBack"); if(back) back.click();
  await new Promise(ok=> setTimeout(ok, 40));
  return {onTab, inDay, which, wid: row.dataset.dayedit};
});
ck("the rotation row carries no rename, so the row is one action", r.onTab === 0, String(r.onTab));
ck("CONTROL: opening the row really did open that day", r.which === r.wid, r.which + " vs " + r.wid);
ck("and the rename is on the day's own screen", r.inDay === 1, String(r.inDay));

console.log("\n7. FOUR FACTS, AND THE CARDS THEY WERE SUMMARISED FROM ARE STILL BUILT");
r = await newP.evaluate(()=>{
  const ks = [...document.querySelectorAll('#app .pg-facts .pg-f-k')].map(x=> x.textContent.trim());
  const vs = [...document.querySelectorAll('#app .pg-facts .pg-f-v')].map(x=> x.textContent.trim());
  const det = document.querySelector('#app .pg-det');
  return {ks, vs, det: !!det,
          detText: det ? det.textContent.replace(/\s+/g, " ").trim().length : 0,
          kind: (()=>{ try{ const k = planKindNow(); return (k && (k.named || planKindLine(k))) || ""; }catch(e){ return ""; } })(),
          empties: vs.filter(x=> !x).length};
});
ck("the facts table is there", r.ks.length >= 2, r.ks.join(", "));
ck("every label has an answer", r.empties === 0 && r.vs.length === r.ks.length,
   r.vs.length + " answers for " + r.ks.length + " labels");
ck("the kind it states is the kind the app reads",
   !r.kind || r.vs[r.ks.indexOf("kind")] === r.kind, r.vs[r.ks.indexOf("kind")] + " vs " + r.kind);
ck("and the full cards are still built, behind the fold",
   r.det === true && r.detText > 120, r.detText + " characters");

console.log("\n8. THE PLAN CHECK LEADS WITH WHAT IS SHORT AND KEEPS EVERYTHING ELSE");
r = await newP.evaluate(()=>{
  const card = document.querySelector('#app .card.pv-under') ||
               [...document.querySelectorAll('#app .card')].find(c=> c.querySelector('.pv-r'));
  const all = [...card.querySelectorAll('.pv-r')];
  const fold = card.querySelector('.pv-more');
  const top = all.filter(x=> !fold || !fold.contains(x));
  const q = planQuality(S.program, currentSplit(), planCheckOpts());
  const under = (q.volume || []).filter(x=> x.state === "under" && !volAckActive(x));
  return {all: all.length, vol: (q.volume || []).length, top: top.length,
          under: under.length,
          topAllUnder: top.every(x=> x.className.indexOf("is-under") > -1),
          buttons: all.every(x=> x.tagName === "BUTTON"),
          head: !!card.querySelector('.pv-h'),
          lab: (card.querySelector('.pv-lab') || {}).textContent,
          val: (all[0].querySelector('.pv-v') || {}).textContent.trim()};
});
ck("CONTROL: this plan really does leave muscles short", r.under > 0, String(r.under));
ck("every muscle still has a row", r.all === r.vol, r.all + " of " + r.vol);
ck("and every row is still a button you can open", r.buttons === true);
ck("the rows at the top are the short ones, all of them",
   r.top === r.under && r.topAllUnder === true, r.top + " shown, " + r.under + " short");
ck("the card still says what it is", r.head === true);
ck("and labels the short list", (r.lab || "").trim() === "under target this week", r.lab);
ck("a reading is sets of the floor, in words", /^[\d.]+ of [\d.]+$/.test(r.val), r.val);

console.log("\n9. NOTHING RUNS OFF THE SIDE OF THE SCREEN");
r = await newP.evaluate(()=>{
  const vw = document.documentElement.clientWidth, out = [];
  document.querySelectorAll('#app *').forEach(n=>{
    const b = n.getBoundingClientRect();
    if(b.right > vw + 0.5 || b.left < -0.5)
      out.push((n.tagName + '.' + (n.className || '')).slice(0, 40));
  });
  return {vw, wide: document.documentElement.scrollWidth > vw + 1, out: out.slice(0, 5)};
});
ck("the page is not wider than the window", r.wide === false, String(r.vw));
ck("and nothing in it sticks out", r.out.length === 0, r.out.join(", ") || "none");

console.log("\n9b. PROGRAM DRAWS A FULL LOG WITHIN ITS PERFORMANCE BUDGET");
const cdp = await newP.context().newCDPSession(newP);
await cdp.send("Emulation.setCPUThrottlingRate", {rate:4});
const speed = await newP.evaluate(()=>{
  const sessions = S.sessions.length;
  const original = computeWindowStats;
  const resolve = resolveExerciseMuscles;
  const times = [];
  let windows = 0, exercises = 0;
  computeWindowStats = (...args)=>{ windows++; return original(...args); };
  resolveExerciseMuscles = (...args)=>{ exercises++; return resolve(...args); };
  try{
    for(let i=0;i<3;i++){
      TAB = "program";
      const before = performance.now();
      render();
      times.push(performance.now()-before);
    }
  }finally{
    computeWindowStats = original;
    resolveExerciseMuscles = resolve;
  }
  return {sessions, windows, exercises, times, program:!!document.querySelector('[data-dg-screen="program"]')};
});
await cdp.send("Emulation.setCPUThrottlingRate", {rate:1});
ck("CONTROL: full seeded training log reached Program", speed.sessions >= 70 && speed.program);
ck("three Program draws reuse window and exercise calculations", speed.windows > 0 && speed.windows < 100 &&
   speed.exercises > 0 && speed.exercises < 250, JSON.stringify(speed));
ck("median Program draw at 4× CPU throttling stays under 750 ms",
   speed.times.sort((a,b)=>a-b)[1] < 750, JSON.stringify(speed.times));
console.log("\n10. NOTHING FAILED TO LOAD, AND NOTHING THREW");
ck("no HTTP errors", httpErr.length === 0, httpErr.join(" | ") || "none");
ck("no page errors", pageErr.length === 0, pageErr.join(" | ") || "none");

await newP.screenshot({path: shot("dgprogram.png"), fullPage: true});
await b.close();
srv.close();
console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
