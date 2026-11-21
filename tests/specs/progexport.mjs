import { chromium, APP_URL, appFile, oldBuild } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* THE PROGRAM TAB IS ABOUT THE TRAINING WEEK, AND NOTHING ELSE.

   Seven buttons sat above the plan check. Four of them had nothing to do with running a
   programme:

     Normal export            called exportJSON() -- the same function as
                              Settings > Your data > Export my data. Not a shortcut to
                              somewhere else: a second copy of one button, on the wrong tab.
     Copy set-aside records   a diagnostic bundle, which is Your data's subject.
     Save them as a file      the same bundle, written out.

   Item 23 cleared the raw-export buttons off every page for exactly this reason and left
   the normal one here, saying so at the time. It should have gone with them.

   And the sentence describing the plan document had drifted four rows down the screen,
   below Import a plan, explaining a button nowhere near it.

   WHAT THIS SPEC IS FOR: the export machinery is gone from Program, everything Program
   is actually for survived, and the set-aside records are reachable in Settings and
   still work. Its controls are the ones that make the claim mean something -- the old
   build must have had the buttons, and the fixture must actually HAVE set-aside records,
   or "they moved" is true of two screens that never offered them. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
/* The build with the export buttons still on Program. */
const OLD = oldBuild("b9bc510");
const b = await chromium.launch();
let bad = 0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

async function openApp(url){
  const p = await b.newPage({viewport:{width:390,height:1800}});
  p.on('dialog',d=>d.accept());
  await p.addInitScript(()=>{ localStorage.clear();
    localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
    localStorage.setItem('e26.ns0','E26-X'); });
  await p.goto(url,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
  await p.evaluate(fx=>{
    window.boot = (tab, page, mutate)=>{
      const sp=document.getElementById('splash'); if(sp) sp.remove();
      try{OB=null}catch(e){} try{PF=null}catch(e){} try{hideModal()}catch(e){}
      ['preflight','aiFull'].forEach(id=>{const el=document.getElementById(id); if(el) el.remove();});
      document.body.classList.remove('ai-open','onboarding','pfl-open');
      Object.keys(S).forEach(k=>{ delete S[k]; });
      Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
      S.tourDone = true;
      if(mutate) mutate(S);
      migrate(); try{ applySplit(); }catch(e){}
      TAB = tab; SET_PAGE = page || null; render();
      document.querySelectorAll('#app details').forEach(d=> d.open = true);
      document.querySelectorAll('#toasts .tst').forEach(el=> el.remove());
    };
    window.ids = ()=> [...document.querySelectorAll('#app [id]')].map(e=> e.id).sort();
  }, FX);
  return p;
}
const oldP = await openApp(OLD);
const newP = await openApp(APP_URL);

const MOVED = ["rescueFull", "badRecCopy", "badRecFile"];
const KEPT  = ["planBtn", "buildPlanBtn", "aiImportBtn", "planHistBtn"];

console.log("\n1. THE FIXTURE REALLY HAS SET-ASIDE RECORDS, OR HALF OF THIS PROVES NOTHING");
let r = await newP.evaluate(()=>{
  boot("program");
  return {has: haveBadRecords(),
          n: (()=>{ try{ return badRecordsReport().sessions.length; }catch(e){ return 0; } })()};
});
ck("CONTROL: there are records set aside on this profile", r.has === true && r.n > 0,
   r.n + " session(s)");

console.log("\n2. THE OLD PROGRAM TAB CARRIED ALL FOUR");
const was = await oldP.evaluate(()=>{ boot("program"); return window.ids(); });
MOVED.forEach(id=> ck("  CONTROL: " + id + " was on Program", was.indexOf(id) > -1));
KEPT.forEach(id=> ck("  CONTROL: and so was " + id, was.indexOf(id) > -1));

console.log("\n3. NONE OF THEM IS THERE NOW, AND EVERYTHING ELSE IS");
const now = await newP.evaluate(()=>{ boot("program"); return window.ids(); });
MOVED.forEach(id=> ck("  " + id + " is gone from Program", now.indexOf(id) < 0));
KEPT.forEach(id=> ck("  " + id + " is still there", now.indexOf(id) > -1));
const lost = was.filter(x=> now.indexOf(x) < 0 && MOVED.indexOf(x) < 0);
ck("and nothing else was lost with them", lost.length === 0, lost.join(", "));

console.log("\n4. “NORMAL EXPORT” WAS THE SAME BUTTON TWICE");
/* Not an argument from the names: both are driven and both must reach the same
   function. Checked on the OLD build, because that is the only one where both exist. */
r = await oldP.evaluate(()=>{
  const hits = [];
  const real = window.exportJSON;
  window.exportJSON = function(){ hits.push("called"); };
  boot("program");
  const a = document.querySelector('#app #rescueFull');
  if(a) a.click();
  const fromProgram = hits.length;
  boot("sync", "data");
  const c = document.querySelector('#app #exportBtn');
  if(c) c.click();
  const fromSettings = hits.length - fromProgram;
  window.exportJSON = real;
  return {fromProgram, fromSettings, bothFound: !!a && !!c};
});
ck("CONTROL: both buttons were found on the old build", r.bothFound === true);
ck("Program's Normal export called exportJSON", r.fromProgram === 1, String(r.fromProgram));
ck("and so did Settings' Export my data — one action, two buttons",
   r.fromSettings === 1, String(r.fromSettings));
ck("CONTROL: and Settings still has it",
   (await newP.evaluate(()=>{ boot("sync","data"); return !!document.querySelector('#app #exportBtn'); })) === true);

console.log("\n5. THE SENTENCE SITS UNDER THE BUTTON IT DESCRIBES");
/* It describes the plan document. It was below Import a plan, four rows past it. */
r = await newP.evaluate(()=>{
  boot("program");
  const app = document.getElementById('app');
  const top = sel=>{ const el = app.querySelector(sel);
    return el ? el.getBoundingClientRect().top : -1; };
  const say = [...app.querySelectorAll('.sub')]
    .find(x=> /whole schedule as a document/.test(x.textContent));
  return {said: !!say,
          sayTop: say ? say.getBoundingClientRect().top : -1,
          plan: top('#planBtn'), imp: top('#aiImportBtn')};
});
ck("CONTROL: the sentence is still on the screen", r.said === true);
ck("it is below Full plan", r.sayTop > r.plan, r.plan + " -> " + r.sayTop);
ck("and above Import a plan, not below it", r.sayTop < r.imp,
   r.sayTop + " vs " + r.imp);

console.log("\n6. THE SET-ASIDE RECORDS ARE IN SETTINGS, AND THEY WORK");
r = await newP.evaluate(()=>{
  boot("sync", "data");
  const app = document.getElementById('app');
  const bc = app.querySelector('#badRecCopy'), bf = app.querySelector('#badRecFile');
  const n = (()=>{ try{ return badRecordsReport().sessions.length; }catch(e){ return 0; } })();
  return {copy: !!bc, file: !!bf,
          /* A button nobody wired is a button that does nothing, which is exactly what
             moving markup between screens risks. */
          wired: !!(bc && bc.onclick) && !!(bf && bf.onclick),
          summary: (app.querySelector('.sd-more > summary') || {textContent:""}).textContent.trim(),
          says: /no account id or key, no tokens, nothing else/i.test(app.innerText),
          counts: app.innerText.indexOf("just the " + n + " session") > -1};
});
ck("both buttons are on Your data", r.copy && r.file, "copy " + r.copy + ", file " + r.file);
ck("and both are wired to a handler", r.wired === true, String(r.wired));
ck("the fold counts them in", /three things/.test(r.summary), r.summary);
ck("the promise about what is NOT in the bundle came with them", r.says === true);
ck("and it says how many sessions that is", r.counts === true);

console.log("\n7. WITH NOTHING SET ASIDE, NEITHER SCREEN OFFERS IT");
r = await newP.evaluate(()=>{
  /* THE RECORDS LIVE ON THE SESSIONS, as session.badEntries and entry.badSets -- see
     badRecordsReport(). An earlier draft deleted a `badRecords` field that does not
     exist, so nothing was cleared and this whole section printed a note instead of
     testing the empty case it is for. */
  const clear = S2=>{
    (S2.sessions || []).forEach(s=>{
      delete s.badEntries;
      (s.entries || []).forEach(e=>{ if(e) delete e.badSets; });
    });
    if(S2.active){ delete S2.active.badEntries;
      (S2.active.entries || []).forEach(e=>{ if(e) delete e.badSets; }); }
  };
  boot("sync", "data", clear);
  const stillHas = haveBadRecords();
  const app = document.getElementById('app');
  return {stillHas,
          copy: !!app.querySelector('#badRecCopy'),
          summary: (app.querySelector('.sd-more > summary') || {textContent:""}).textContent.trim()};
});
ck("CONTROL: the records really were cleared, so there is an empty case to test",
   r.stillHas === false, String(r.stillHas));
ck("the buttons are not drawn", r.copy === false, String(r.copy));
ck("and the repair count drops back to two", /two things/.test(r.summary), r.summary);

await b.close();
console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
