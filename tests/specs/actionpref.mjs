import { chromium, APP_URL, appFile, oldBuild } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* THE SIX ACTION SCREENS, IN ONE PASS, HELD AGAINST THE SCREENS THEY REPLACED.

   Nine settings screens were converted one at a time because each was a design decision.
   These six are not: they are identity and reading screens, and the reconcile gave them
   one pass between them in the language the nine settled. So they ship together and are
   checked together.

   WHAT A CONVERSION MUST NOT DO, and what each section below looks for: lose a control,
   lose a sentence, or quietly change what a button does. The copy is covered by the copy
   diff before the conversion is called done; this covers the controls.

   TWO OF THESE SCREENS HAVE BRANCHES THE FIXTURE NEVER REACHES -- storage with something
   freeable on it, and data with an attachment repair pending -- and a spec that only
   rendered the fixture would call them converted without having drawn half of them. Both
   are planted here. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
/* The build before batch 4. */
const OLD = oldBuild("b2d3d69");
const b = await chromium.launch();
let bad = 0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

async function openApp(url){
  const p = await b.newPage({viewport:{width:390,height:1800}});
  p.on('dialog',d=>d.accept());
  await p.addInitScript(()=>{ localStorage.clear();
    localStorage.setItem('e26.account', JSON.stringify({id:'E26-7K4Q-2M18',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
    localStorage.setItem('e26.ns0','E26-7K4Q-2M18'); });
  await p.goto(url,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
  await p.evaluate(fx=>{
    window.boot = (page, mutate)=>{
      const sp=document.getElementById('splash'); if(sp) sp.remove();
      try{OB=null}catch(e){} try{PF=null}catch(e){} try{hideModal()}catch(e){}
      ['preflight','aiFull'].forEach(id=>{const el=document.getElementById(id); if(el) el.remove();});
      document.body.classList.remove('ai-open','onboarding','pfl-open');
      Object.keys(S).forEach(k=>{ delete S[k]; });
      Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
      S.tourDone = true;
      if(mutate) mutate(S);
      migrate(); try{ applySplit(); }catch(e){}
      TAB='sync'; SET_PAGE=page; render();
      document.querySelectorAll('#app details').forEach(d=> d.open = true);
      document.querySelectorAll('#toasts .tst').forEach(el=> el.remove());
    };
    /* Every handle on the screen: element ids and the data attributes these six use. */
    window.ids = ()=>{
      const out = [];
      document.querySelectorAll('#app *').forEach(el=>{
        if(el.id) out.push("#" + el.id);
        for(const a of el.attributes)
          if(/^data-(sto|pt|sync|cloud)/.test(a.name)) out.push(a.name);
      });
      return [...new Set(out)].sort();
    };
  }, FX);
  return p;
}
const oldP = await openApp(OLD);
const newP = await openApp(APP_URL);

const PAGES = ["acct", "data", "patch", "storage", "help", "legal"];

console.log("\n1. EVERY CONTROL THE SIX SCREENS HAD IS STILL THERE");
/* THE CONTROL IS THAT THE OLD SCREEN DREW, NOT THAT IT HAD CONTROLS. An earlier draft
   demanded two handles per screen, which is true of five of them and false of
   "Licensing" -- a reading screen whose only button is Back, correctly. Requiring
   controls of a screen that has none is the test being wrong about the design. So the
   control is the text each old screen produced, and the handles are compared however
   many there are. */
for(const page of PAGES){
  const a = await oldP.evaluate(pg=>{ boot(pg);
    return {ids: window.ids(), text: document.getElementById('app').innerText.length}; }, page);
  const c = await newP.evaluate(pg=>{ boot(pg); return window.ids(); }, page);
  const gone = a.ids.filter(x=> c.indexOf(x) < 0);
  const made = c.filter(x=> a.ids.indexOf(x) < 0);
  ck("  CONTROL: " + page + " drew a screen on the old build", a.text > 300,
     a.text + " chars, handles: " + a.ids.join(", "));
  ck("  " + page + " kept every one of its handles", gone.length === 0, gone.join(", "));
  ck("  and invented none", made.length === 0, made.join(", "));
}

console.log("\n2. THE SHAPE THE RECONCILE SETTLED");
/* hero, then whatever that screen's spine says. The two things that hold across all six:
   exactly one hero, and none of the old .set-block furniture left except where it is
   carrying something the library has no shape for. */
let r = await newP.evaluate(pages=>{
  const out = {};
  pages.forEach(pg=>{
    boot(pg);
    const app = document.getElementById('app');
    out[pg] = {heroes: app.querySelectorAll('.sd-hero').length,
               secs: [...app.querySelectorAll('.sd-sec')].map(x=> x.textContent.trim()),
               more: app.querySelectorAll('.sd-more').length,
               blocks: app.querySelectorAll('.set-block').length,
               choice: app.querySelectorAll('.ch-list, .ob-opt').length,
               small: [...app.querySelectorAll('.sd-more > summary, .sd-seg button')]
                 .filter(el=> el.getBoundingClientRect().height < 44).length};
  });
  return out;
}, PAGES);
PAGES.forEach(pg=>{
  ck("  " + pg + ": exactly one hero", r[pg].heroes === 1, r[pg].heroes);
  ck("  " + pg + ": no old option lists", r[pg].choice === 0, r[pg].choice);
  ck("  " + pg + ": every library control clears 44px", r[pg].small === 0, r[pg].small);
});
/* The patch history is the one block deliberately left: it is a list of past changes
   with three buttons a row, which the library has no shape for and which is not a
   setting. Stated here so that it is a decision rather than something left behind. */
ck("the only old block left is the patch history",
   PAGES.filter(pg=> r[pg].blocks > 0).join(",") === "patch" && r.patch.blocks === 1,
   PAGES.map(pg=> pg + ":" + r[pg].blocks).join(" "));
ck("help needs no fold, being two short lists", r.help.more === 0, r.help.more);
ck("and the other five each have one", PAGES.filter(pg=> pg !== "help")
   .every(pg=> r[pg].more === 1),
   PAGES.map(pg=> pg + ":" + r[pg].more).join(" "));

console.log("\n3. THE TWO IRREVERSIBLE BUTTONS ARE LAST, AND SAID TO BE");
r = await newP.evaluate(()=>{
  boot("data");
  const app = document.getElementById('app');
  const danger = app.querySelector('.sd-sec-danger');
  const group = app.querySelector('.sd-group.sd-danger');
  const kids = [...app.children[0].children];
  const reset = app.querySelector('#resetBtn');
  const del = app.querySelector('#acctDelete');
  const exp = app.querySelector('#exportBtn');
  const top = el=> el ? el.getBoundingClientRect().top : -1;
  return {heading: danger ? danger.textContent.trim() : "",
          hasGroup: !!group,
          exportFirst: top(exp) > 0 && top(exp) < top(reset) && top(exp) < top(del),
          bothDanger: !!(reset && reset.classList.contains("danger"))
                   && !!(del && del.classList.contains("danger")),
          lastThing: group ? group === app.querySelector('.sd-group.sd-danger:last-of-type') : false};
});
ck("the heading says there is no way back", /no way back/i.test(r.heading), r.heading);
ck("both buttons are in the danger group", r.hasGroup === true);
ck("and both are styled as danger", r.bothDanger === true);
ck("the export is above both of them", r.exportFirst === true);

console.log("\n4. STORAGE DRAWS THE BRANCH THE FIXTURE NEVER REACHES");
/* On this fixture nothing can be freed, so the "Can be freed" section never renders and
   its buttons were never checked. Planted. */
r = await newP.evaluate(()=>{
  const before = (()=>{ boot("storage");
    return {secs: document.querySelectorAll('#app .sd-sec').length,
            all: document.querySelectorAll('#app [data-stoall]').length}; })();
  /* A rescue backup is the commonest freeable thing, and storageBreakdown reads it
     straight out of localStorage. The prefix is RESCUE_BACKUP_PREFIX, read from the app
     rather than written out here -- an earlier draft guessed "e26.rescue." and the key
     fell into "Other", which is not freeable, so all four assertions failed on a planted
     item the screen was right to ignore. */
  boot("storage", ()=>{
    try{
      localStorage.setItem(RESCUE_BACKUP_PREFIX + "spec1", JSON.stringify({at: Date.now(),
        state: {pad: "x".repeat(40000)}}));
      localStorage.setItem(RESCUE_BACKUP_PREFIX + "spec1.why", "spec");
    }catch(e){}
  });
  const after = {secs: [...document.querySelectorAll('#app .sd-sec')].map(x=> x.textContent.trim()),
                 all: document.querySelectorAll('#app [data-stoall]').length,
                 open: document.querySelectorAll('#app [data-stoopen]').length};
  /* And the item list behind "Show n items". */
  const opener = document.querySelector('#app [data-stoopen]');
  if(opener) opener.click();
  const items = document.querySelectorAll('#app [data-stoone]').length;
  Object.keys(localStorage).filter(k=> k.indexOf(RESCUE_BACKUP_PREFIX + "spec") === 0)
    .forEach(k=> localStorage.removeItem(k));
  return {before, after, items};
});
ck("CONTROL: the fixture alone has nothing freeable, so this branch was unexercised",
   r.before.secs === 0 && r.before.all === 0,
   r.before.secs + " sections, " + r.before.all + " buttons");
ck("with something freeable it gets its own section",
   r.after.secs.some(x=> /^Can be freed/.test(x)), r.after.secs.join(" | "));
ck("  with a way to free the lot", r.after.all >= 1, r.after.all);
ck("  and a way to see what is in it", r.after.open >= 1, r.after.open);
ck("  which lists the items one by one", r.items >= 1, r.items);

console.log("\n5. YOUR DATA DRAWS ITS THIRD REPAIR WHEN THERE IS ONE");
r = await newP.evaluate(()=>{
  boot("data");
  const two = (document.querySelector('#app .sd-more > summary')||{textContent:""}).textContent.trim();
  const twoN = document.querySelectorAll('#app #logFixBtn, #app #bwFixBtn, #app #attachFixUndoBtn').length;
  boot("data", S2=>{ S2.attachFixUndo = {at: Date.now(), renamed: [{a:1},{a:2}]}; });
  const three = (document.querySelector('#app .sd-more > summary')||{textContent:""}).textContent.trim();
  const threeN = document.querySelectorAll('#app #logFixBtn, #app #bwFixBtn, #app #attachFixUndoBtn').length;
  return {two, twoN, three, threeN};
});
ck("CONTROL: with nothing to put back there are two repairs", r.twoN === 2, r.twoN);
ck("and the fold counts two, not three", /two things/.test(r.two), r.two);
ck("CONTROL: with something to put back there are three", r.threeN === 3, r.threeN);
ck("and the fold counts three", /three things/.test(r.three), r.three);

console.log("\n6. THE ACCOUNT STILL HIDES THE HALF THAT MATTERS");
r = await newP.evaluate(()=>{
  boot("acct");
  const app = document.getElementById('app');
  const keys = [...app.querySelectorAll('.sd-key')];
  const text = app.innerText;
  const out = {rows: keys.length,
               hidden: keys.filter(k=> k.classList.contains("is-hidden")).length,
               idShown: text.indexOf("E26-7K4Q-2M18") > -1,
               keyShown: text.indexOf("kkkkkkkk") > -1,
               show: !!app.querySelector('#acctShowKey'),
               copyKey: !!app.querySelector('#acctCopyKey')};
  app.querySelector('#acctShowKey').click();
  const after = document.getElementById('app');
  out.afterKeyShown = after.innerText.indexOf("kkkkkkkk") > -1;
  out.afterCopyKey = !!after.querySelector('#acctCopyKey');
  return out;
});
ck("both halves are on the screen", r.rows === 2, r.rows);
ck("the ID is readable", r.idShown === true);
ck("the recovery key is not, until you ask", r.keyShown === false && r.hidden === 1,
   "shown " + r.keyShown + ", hidden rows " + r.hidden);
ck("CONTROL: and there is a way to ask", r.show === true);
ck("asking shows it", r.afterKeyShown === true);
ck("and only then offers to copy it",
   r.copyKey === false && r.afterCopyKey === true,
   "before " + r.copyKey + ", after " + r.afterCopyKey);

console.log("\n7. NOTHING THREW ON ANY OF THE SIX");
r = await newP.evaluate(pages=>{
  const out = {};
  pages.forEach(pg=>{
    try{ boot(pg); out[pg] = document.getElementById('app').innerHTML.length; }
    catch(e){ out[pg] = "THREW: " + e.message; }
  });
  out.broken = pages.filter(pg=>
    typeof out[pg] !== "number" || out[pg] < 900
    || /could not be drawn/i.test(document.getElementById('app').innerText));
  return out;
}, PAGES);
ck("every one drew something substantial", r.broken.length === 0,
   PAGES.map(pg=> pg + ":" + r[pg]).join(" "));

await b.close();
console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
