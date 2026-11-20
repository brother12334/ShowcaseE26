import { chromium, APP_URL, appFile, oldBuild } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* THE NINTH CONVERSION, AND THE LAST OF THE NINE SETTINGS SCREENS.

   "Share with a coach" leads with how long the link lasts, because that is the decision
   somebody is actually making here. Making a link is one button; what matters about it is
   what goes in it and when it stops working.

   THREE STATES, AND THE FIXTURE IS IN THE LEAST INTERESTING ONE. Signed out, signed in
   with nothing live, and signed in with a link live. A test page has no cloud account, so
   a spec that just rendered the fixture would check the signed-out message and call the
   screen converted. Each section below says which state it is in and proves it got there.

   THE TOKENS HERE ARE INVENTED. A share token is a credential: anybody holding one can
   read the log it belongs to. None of this spec's tokens are real, and none ever should
   be. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
/* The build this screen replaced: share B is converted in this release. */
const OLD = oldBuild("8f3cbc0");
const b = await chromium.launch();
let bad = 0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

const LINK = {token: "SPEC-NOT-A-REAL-TOKEN", label: "For my coach",
              at: Date.now() - 3*86400000, expiresAt: Date.now() + 27*86400000, size: 41000};

async function openApp(url){
  const p = await b.newPage({viewport:{width:390,height:1800}});
  p.on('dialog',d=>d.accept());
  await p.addInitScript(()=>{ localStorage.clear();
    localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:true,ns:''}));
    localStorage.setItem('e26.ns0','E26-X'); });
  await p.goto(url,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
  await p.evaluate(([fx, link])=>{
    window.realCloud = window.accountCloudOn;
    window.realAuth = window.accountAuth;
    window.LINK = link;
    window.boot = (mutate, signedOut)=>{
      const sp=document.getElementById('splash'); if(sp) sp.remove();
      try{OB=null}catch(e){} try{PF=null}catch(e){} try{hideModal()}catch(e){}
      ['preflight','aiFull'].forEach(id=>{const el=document.getElementById(id); if(el) el.remove();});
      document.body.classList.remove('ai-open','onboarding','pfl-open');
      Object.keys(S).forEach(k=>{ delete S[k]; });
      Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
      S.tourDone = true;
      /* A TEST PAGE IS NOT SIGNED IN TO THE CLOUD, so the screen draws its signed-out
         message and nothing else. Stood aside on purpose, and restored for the one
         section that is about that state. */
      /* FORCED BOTH WAYS. An earlier draft restored the real functions for the
         signed-out case, but this page stores an account with cloud:true, so the real
         ones answered "signed in" and the section tested the state it was already in. */
      window.accountCloudOn = ()=> !signedOut;
      window.accountAuth    = ()=> signedOut ? null : ({id:"E26-X"});
      S.shareSeen = [];
      if(mutate) mutate(S);
      migrate(); try{ applySplit(); }catch(e){}
      TAB='sync'; SET_PAGE='share'; render();
      /* DELIBERATELY NOT OPENING THE FOLDS. Whether the live-links fold opens itself is
         one of the things this spec is about, and a boot that opened everything made
         that assertion pass on its own doing. Section 7 opens them where it needs to
         measure, and a closed <details> still answers querySelectorAll. */
      document.querySelectorAll('#toasts .tst').forEach(el=> el.remove());
    };
    window.ids = ()=>{
      const out = [];
      document.querySelectorAll('#app *').forEach(el=>{
        if(el.id) out.push("#" + el.id);
        for(const a of el.attributes)
          if(/^data-(shdays|shopt-|shcopy|shkill)/.test(a.name)) out.push(a.name);
      });
      return [...new Set(out)].sort();
    };
    window.state = ()=> JSON.stringify(shareOpts(), Object.keys(shareOpts()).sort());
  }, [FX, LINK]);
  return p;
}

const oldP = await openApp(OLD);
const newP = await openApp(APP_URL);
const both = async (mut)=>{ for(const pg of [oldP, newP]) await pg.evaluate(mut); };

console.log("\n1. THE SCREEN REALLY IS SIGNED IN, NOT SHOWING ITS SIGNED-OUT NOTICE");
await both(()=> boot(S2=>{ S2.shareSeen = [window.LINK]; }));
let r = await newP.evaluate(()=> ({
  make: !!document.querySelector('#app #shMake'),
  rows: document.querySelectorAll('#app .rl-row').length}));
ck("CONTROL: the make-a-link button is there", r.make === true, String(r.make));
ck("CONTROL: and the live link is listed", r.rows === 1, r.rows + " rows");

console.log("\n2. NOTHING ON THE SCREEN WENT MISSING");
const a = await oldP.evaluate(()=> window.ids());
const c = await newP.evaluate(()=> window.ids());
ck("CONTROL: the old screen rendered its controls", a.length >= 8, a.join(", "));
const gone = a.filter(x=> c.indexOf(x) < 0);
ck("every control the old screen had is still here", gone.length === 0, gone.join(", "));
ck("and nothing was invented", c.filter(x=> a.indexOf(x) < 0).length === 0,
   c.filter(x=> a.indexOf(x) < 0).join(", "));
ck("all four extras are offered", c.filter(x=> /^data-shopt-/.test(x)).length === 4,
   c.filter(x=> /^data-shopt-/.test(x)).join(", "));

console.log("\n3. THE SAME TAPS LEAVE THE SAME BYTES");
const PLAN = [
  ["data-shdays","7"], ["data-shdays","90"], ["data-shdays","30"],
  ["data-shopt-body","on"],     ["data-shopt-body","off"],
  ["data-shopt-sleep","on"],    ["data-shopt-sleep","off"],
  ["data-shopt-injuries","on"], ["data-shopt-injuries","off"],
  ["data-shopt-notes","on"],    ["data-shopt-notes","off"]
];
const tap = (page, attr, val)=> page.evaluate(([x,v])=>{
  const el = document.querySelector(`#app [${x}="${v}"]`);
  if(!el) return {found:false};
  el.click();
  return {found:true, state: window.state()};
}, [attr, val]);
await both(()=> boot());
const start = await oldP.evaluate(()=> window.state());
let mismatch = [], missing = [], moved = 0;
for(const [attr, val] of PLAN){
  const x = await tap(oldP, attr, val);
  const y = await tap(newP, attr, val);
  if(!x.found || !y.found){ missing.push(attr+"="+val+(x.found?" (new)":" (old)")); continue; }
  if(x.state !== y.state) mismatch.push(attr+"="+val+" OLD "+x.state+" NEW "+y.state);
  if(x.state !== start) moved++;
}
ck("CONTROL: every planned tap was found on both", missing.length === 0, missing.join(", "));
ck("and the stored options are identical after each", mismatch.length === 0, mismatch.join(" | "));
ck("CONTROL: the taps really moved things", moved >= 6,
   moved + " of " + PLAN.length + " left the start state");
ck("both end where they started",
   (await oldP.evaluate(()=> window.state())) === (await newP.evaluate(()=> window.state())));

console.log("\n4. THE HERO IS THE EXPIRY, AND IT FOLLOWS THE CHOOSER");
r = await newP.evaluate(()=>{
  boot();
  const read = ()=>{ const el = document.querySelector('#app .sd-hero-v');
    return {n: el && el.firstChild ? el.firstChild.textContent.trim() : "",
            unit: el && el.querySelector('i') ? el.querySelector('i').textContent.trim() : ""}; };
  const out = {at30: read()};
  document.querySelector('#app [data-shdays="7"]').click();
  out.at7 = read();
  out.pressed = [...document.querySelectorAll('#app [data-shdays]')]
    .filter(x=> x.getAttribute("aria-pressed") === "true")
    .map(x=> x.dataset.shdays);
  document.querySelector('#app [data-shdays="90"]').click();
  out.at90 = read();
  return out;
});
ck("thirty days reads 30", r.at30.n === "30" && r.at30.unit === "days",
   r.at30.n + " " + r.at30.unit);
ck("and the hero follows the chooser down to 7", r.at7.n === "7", r.at7.n);
ck("CONTROL: with exactly one option marked, and it is the one chosen",
   r.pressed.length === 1 && r.pressed[0] === "7", r.pressed.join(","));
ck("and up to 90", r.at90.n === "90", r.at90.n);

console.log("\n5. EVERY STATE THIS SCREEN HAS IS STILL A STATE");
r = await newP.evaluate(()=>{
  const out = {};
  /* SIGNED OUT: no button to press, and a sentence saying why. */
  boot(null, true);
  out.out = {cloud: accountCloudOn() && !!accountAuth(),
             make: !!document.querySelector('#app #shMake'),
             says: /needs an Element 26 account/i.test(document.getElementById('app').innerText),
             opts: document.querySelectorAll('#app [data-shopt-body]').length};
  /* SIGNED IN, NOTHING LIVE: the fold is there and closed, because there is nothing in
     it worth opening by itself. */
  boot();
  const m1 = document.querySelector('#app .sd-more');
  /* textContent, not innerText: with nothing live the fold is closed, so the sentence
     is in the document but not on the screen. That is the point of the fold, and the
     summary above it still says what the section is. */
  out.none = {more: !!m1, open: m1 ? m1.hasAttribute("open") : null,
              rows: document.querySelectorAll('#app .rl-row').length,
              summary: m1 ? m1.querySelector('summary').textContent.trim() : "",
              says: m1 ? /No live links/i.test(m1.textContent) : false};
  /* SIGNED IN, ONE LIVE: the fold opens itself, and says how many. */
  boot(S2=>{ S2.shareSeen = [window.LINK]; });
  const m2 = document.querySelector('#app .sd-more');
  out.live = {open: m2 ? m2.hasAttribute("open") : null,
              summary: m2 ? m2.querySelector('summary').textContent.trim() : "",
              rows: document.querySelectorAll('#app .rl-row').length,
              copy: document.querySelectorAll('#app [data-shcopy]').length,
              kill: document.querySelectorAll('#app [data-shkill]').length};
  return out;
});
ck("CONTROL: signed out really is signed out", r.out.cloud === false, String(r.out.cloud));
ck("signed out offers no link to make", r.out.make === false, String(r.out.make));
ck("  and says why", r.out.says === true);
ck("  and still lets you set what would go in one", r.out.opts === 1, r.out.opts);
ck("nothing live still explains itself, inside the fold", r.none.says === true);
ck("  and the fold stays folded when it is empty", r.none.open === false, String(r.none.open));
ck("  while its summary still names the section", r.none.summary === "Live links",
   r.none.summary);
ck("one live link opens the fold itself", r.live.open === true, String(r.live.open));
ck("  and counts it in the summary", /1 readable right now/.test(r.live.summary),
   r.live.summary);
ck("  and gives it both a copy and a revoke", r.live.copy === 1 && r.live.kill === 1,
   "copy " + r.live.copy + ", revoke " + r.live.kill);

console.log("\n6. A REVOKE STILL REVOKES");
r = await newP.evaluate(async ()=>{
  boot(S2=>{ S2.shareSeen = [window.LINK]; });
  const before = (S.shareSeen||[]).length;
  /* The network call cannot happen here, so only the fact that the button is wired to
     the right token is checked -- the thing the conversion could have broken. */
  const btn = document.querySelector('#app [data-shkill]');
  return {before, token: btn ? btn.dataset.shkill : null,
          matches: btn ? btn.dataset.shkill === window.LINK.token : false};
});
ck("CONTROL: there was a link to revoke", r.before === 1, r.before);
ck("and the revoke button carries that link's own token", r.matches === true, r.token);

console.log("\n7. UNCROWDED, AS THE RULE ASKS");
r = await newP.evaluate(()=>{
  boot(S2=>{ S2.shareSeen = [window.LINK]; });
  const app = document.getElementById('app');
  /* Opened here, because a control inside a closed fold measures zero high. */
  app.querySelectorAll('details').forEach(d=> d.open = true);
  return {heroes: app.querySelectorAll('.sd-hero').length,
          more: app.querySelectorAll('.sd-more').length,
          oldSeg: app.querySelectorAll('.seg').length,
          oldBlocks: app.querySelectorAll('.set-block').length,
          small: [...app.querySelectorAll('.sd-tog,.sd-seg button,.sd-more > summary')]
            .filter(el=> el.getBoundingClientRect().height < 44).length};
});
ck("exactly one hero", r.heroes === 1, r.heroes);
ck("the live links fold away", r.more === 1, r.more);
ck("CONTROL: the old segmented is gone", r.oldSeg === 0, r.oldSeg);
ck("CONTROL: and so are the old blocks", r.oldBlocks === 0, r.oldBlocks);
ck("every library control clears 44px", r.small === 0, r.small + " under");

await b.close();
console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
