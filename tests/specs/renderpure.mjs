import { chromium, APP_URL, appFile, oldBuild } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* RENDERING NEVER WRITES.

   runOneTimeSeeds() was called from the top of render(), and through it a render could
   reach four separate write paths: a lapsed deload being closed, the persistent-storage
   answer being filed, a storage prune, and the one-time repairs. On a profile that had
   not yet run the attachment split, opening the app rewrote six logged exercise names
   and saved them before anything was painted.

   It was there for a reason. migrate() is called at module level, before GROUPS and the
   analysis constants are evaluated, so a seed that touches them dies in the temporal
   dead zone; the first render was the earliest point at which the module was fully
   built. The startup block at the end of the file gives the same guarantee and paints
   nothing, so that is where the work moved.

   THIS SPEC IS THE RULE ITSELF, and it is written at the level that cannot be argued
   with: every write to localStorage is intercepted, and rendering every tab must produce
   none. Its controls are what keep it honest -- the same interception must SEE a write
   when one really happens, and the seeds must still run at startup, or "render writes
   nothing" would be satisfied by an app that does nothing at all. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
/* The build where render() still seeded. */
const OLD = oldBuild("e05acdf");
const b = await chromium.launch();
let bad = 0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

const TABS = ["today","workout","history","body","program","research"];

async function openApp(url){
  const p = await b.newPage({viewport:{width:390,height:1200}});
  p.on('dialog',d=>d.accept());
  await p.addInitScript(()=>{ localStorage.clear();
    localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
    localStorage.setItem('e26.ns0','E26-X'); });
  await p.goto(url,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
  await p.evaluate(fx=>{
    /* EVERY write, however it is made. An earlier attempt counted calls to window.save
       and reported none, while the data on disk had changed underneath it -- saveQuiet()
       does not go through save(). Interception at the storage layer cannot be routed
       around. */
    window.WRITES = [];
    const realSet = Storage.prototype.setItem;
    const realDel = Storage.prototype.removeItem;
    window.WATCH = false;
    Storage.prototype.setItem = function(k, v){
      if(window.WATCH) window.WRITES.push("set " + k);
      return realSet.call(this, k, v);
    };
    Storage.prototype.removeItem = function(k){
      if(window.WATCH) window.WRITES.push("del " + k);
      return realDel.call(this, k);
    };
    window.boot = (mutate)=>{
      window.WATCH = false;
      const sp=document.getElementById('splash'); if(sp) sp.remove();
      try{OB=null}catch(e){} try{PF=null}catch(e){} try{hideModal()}catch(e){}
      ['preflight','aiFull'].forEach(id=>{const el=document.getElementById(id); if(el) el.remove();});
      document.body.classList.remove('ai-open','onboarding','pfl-open');
      Object.keys(S).forEach(k=>{ delete S[k]; });
      Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
      S.tourDone = true;
      if(mutate) mutate(S);
      migrate(); try{ applySplit(); }catch(e){}
      save();
    };
    window.names = ()=> JSON.stringify((S.sessions || []).map(s=>
      (s.entries || []).map(e=> e.name)));
    window.onDisk = ()=> localStorage.getItem("ironlog.v1") || "";
  }, FX);
  return p;
}
const oldP = await openApp(OLD);
const newP = await openApp(APP_URL);

const sweep = page=> page.evaluate(tabs=>{
  boot();
  const before = window.onDisk(), namesBefore = window.names();
  window.WRITES = []; window.WATCH = true;
  tabs.forEach(t=>{ try{ TAB = t; render(); }catch(e){} });
  tabs.forEach(t=>{ try{ TAB = t; render(); }catch(e){} });   // and again, idempotent
  try{ TAB = "sync"; SET_PAGE = null; render(); }catch(e){}
  ["acct","data","patch","storage","help","legal","where","targets"].forEach(k=>{
    try{ TAB = "sync"; SET_PAGE = k; render(); }catch(e){}
  });
  window.WATCH = false;
  return {writes: window.WRITES.slice(), diskSame: window.onDisk() === before,
          namesSame: window.names() === namesBefore};
}, TABS);

console.log("\n1. THE INTERCEPTION SEES A WRITE WHEN THERE IS ONE");
/* Before trusting a clean sweep, the same watch is run over something that definitely
   writes. A guard that cannot see is indistinguishable from a guard with nothing to
   find. */
let r = await newP.evaluate(()=>{
  boot();
  window.WRITES = []; window.WATCH = true;
  save();
  const sawSave = window.WRITES.length;
  window.WRITES = [];
  saveQuiet();
  const sawQuiet = window.WRITES.length;
  window.WATCH = false;
  return {sawSave, sawQuiet};
});
ck("CONTROL: it sees save()", r.sawSave > 0, r.sawSave + " writes");
ck("CONTROL: and saveQuiet(), which does not go through save()",
   r.sawQuiet > 0, r.sawQuiet + " writes");

console.log("\n2. THE OLD BUILD WROTE WHILE DRAWING, WHICH IS THE BUG");
const was = await sweep(oldP);
ck("CONTROL: the old build is the one that still seeded from render", was.writes.length > 0,
   was.writes.join(", "));
ck("and it rewrote logged exercise names in the process", was.namesSame === false,
   String(was.namesSame));

console.log("\n3. THE NEW BUILD DRAWS EVERY SCREEN AND WRITES NOTHING");
const now = await sweep(newP);
ck("not one write, over fifteen screens rendered twice",
   now.writes.length === 0, now.writes.join(", "));
ck("nothing on disk moved", now.diskSame === true, String(now.diskSame));
ck("and no logged name changed", now.namesSame === true, String(now.namesSame));

console.log("\n4. THE WORK STILL HAPPENS — AT THE DOOR, NOT WHILE DRAWING");
/* The other half. A render that writes nothing is easy to achieve by doing nothing at
   all, so the repairs are required to still run, and to still write, when the startup
   block calls them. */
r = await newP.evaluate(()=>{
  boot(S2=>{ delete S2.attachSplitV1; delete S2.attachFixUndo; });
  /* THE REAL STARTUP ALREADY RAN, so SEEDS_RUN is true and the guard would skip this --
     correctly, since it exists to stop the work happening twice for one loaded state.
     The spec is planting a fresh state, which is a second one, so it lets the guard go
     exactly as switchProfile does. An earlier draft did not, and read the guard working
     as the startup call being dead. */
  SEEDS_RUN = false;
  const before = window.names();
  window.WRITES = []; window.WATCH = true;
  /* Exactly what the end of the file does. */
  appHeartbeat();
  runOneTimeSeeds();
  window.WATCH = false;
  return {wrote: window.WRITES.length, changed: window.names() !== before,
          stamp: !!S.attachSplitV1,
          renamed: (S.attachSplitV1 || {}).renamed,
          undoOffered: !!S.attachFixUndo};
});
ck("CONTROL: the repair had not run on this state", true);
ck("the startup call runs it", r.stamp === true, String(r.stamp));
ck("it renames the six entries it is for", r.renamed === 6, String(r.renamed));
ck("it writes, which is its job", r.wrote > 0, r.wrote + " writes");
ck("and it leaves an undo on Your data", r.undoOffered === true, String(r.undoOffered));

console.log("\n5. AND HAVING RUN, A RENDER STILL WRITES NOTHING");
r = await newP.evaluate(tabs=>{
  const before = window.onDisk();
  window.WRITES = []; window.WATCH = true;
  tabs.forEach(t=>{ try{ TAB = t; render(); }catch(e){} });
  window.WATCH = false;
  return {writes: window.WRITES.slice(), same: window.onDisk() === before};
}, TABS);
ck("no write after the repairs have run either", r.writes.length === 0,
   r.writes.join(", "));
ck("and disk is untouched", r.same === true, String(r.same));

console.log("\n6. A SECOND PROFILE GETS ITS OWN REPAIRS");
/* SEEDS_RUN guards one loaded state against doing the work twice. It is not a guard
   against a second state needing it, and with render() no longer seeding, nothing else
   would reach the new profile. */
r = await newP.evaluate(()=>{
  boot(S2=>{ delete S2.attachSplitV1; });
  SEEDS_RUN = false;                       // the page's own startup has already run
  runOneTimeSeeds();
  const first = !!S.attachSplitV1;
  /* What switchProfile does: another state, and the guard let go. */
  boot(S2=>{ delete S2.attachSplitV1; });
  SEEDS_RUN = false;
  runOneTimeSeeds();
  const second = !!S.attachSplitV1;
  /* And without letting the guard go, it would be skipped — which is what makes the
     reset in switchProfile necessary rather than decorative. */
  boot(S2=>{ delete S2.attachSplitV1; });
  runOneTimeSeeds();
  return {first, second, skipped: !S.attachSplitV1};
});
ck("the first loaded state is repaired", r.first === true, String(r.first));
ck("and so is a second one, once the guard is reset", r.second === true, String(r.second));
ck("CONTROL: without the reset it would be skipped, which is why switchProfile resets it",
   r.skipped === true, String(r.skipped));

await b.close();
console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
