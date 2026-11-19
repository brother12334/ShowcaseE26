import { chromium, APP_URL, appFile } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* MOVING THE DIAL HAS TO MOVE EVERYTHING, AND IT DID NOT.

   A block in progress finishes on the numbers it started on, so that a change to the
   volume model does not move a target somebody is three weeks into chasing. That is a
   good rule and it has an explicit exemption written into adjustedLandmarks: "a number
   the person set by hand is never held -- they can still change their own mind
   mid-block." Hand-set MEV, MAV and MRV each bypass the hold.

   The scale dial is exactly such a number and was not exempt. So moving it set lmScale,
   wrote a plan-history entry, re-rendered the screen -- and changed nothing anybody could
   see: every muscle kept the figures held for the block. The dial appeared broken because
   the only thing it could not move was the thing it exists to move.

   This spec is the one that would have caught it: it drives the real dial with the
   keyboard and requires the landmarks, the rows and the bars to move together, on screen
   AND in storage. Its control is the half that makes it mean something -- the hold must
   genuinely be in force first, or the test passes on an app that simply never holds. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1600}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

await p.evaluate(fx=>{
  window.boot = (mutate)=>{
    const sp=document.getElementById('splash'); if(sp) sp.remove();
    try{OB=null}catch(e){} try{PF=null}catch(e){} try{hideModal()}catch(e){}
    ['preflight','aiFull'].forEach(id=>{const el=document.getElementById(id); if(el) el.remove();});
    document.body.classList.remove('ai-open','onboarding','pfl-open');
    Object.keys(S).forEach(k=>{ delete S[k]; });
    Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
    S.tourDone = true;
    if(mutate) mutate(S);
    migrate(); try{ applySplit(); }catch(e){}
    try{ TG_OPEN = null; }catch(e){}
    TAB='sync'; SET_PAGE='targets'; render();
  };
  /* Everything a reader can see, per muscle, plus what is on disk behind it. */
  window.snap = ()=>{
    const A = bodyAnalysis();
    const rows = {};
    document.querySelectorAll('#app .tg-row').forEach(row=>{
      const head = row.querySelector('[data-tgopen]'); if(!head) return;
      const g = head.dataset.tgopen;
      const bar = row.querySelector('.tg-bar');
      rows[g] = {
        text: (row.querySelector('.tg-v') || {textContent:''}).textContent.trim(),
        band: bar ? bar.querySelector('.tg-bar-band').style.left + "/" + bar.querySelector('.tg-bar-band').style.right : "",
        now: bar ? bar.querySelector('.tg-bar-now').style.left : "",
        vol: Math.round(((A.vol && A.vol[g]) || 0) * 10) / 10,
        lm: Math.round(A.lm[g].mev * 100) / 100
      };
    });
    const key = Object.keys(localStorage).find(k=> k.indexOf("ironlog.v1") === 0);
    const disk = key ? JSON.parse(localStorage.getItem(key) || "{}") : {};
    return {rows, scale: lmScale(), onDisk: disk.lmScale, held: !!S.volHold};
  };
}, FX);

console.log("\n1. THE HOLD IS REALLY IN FORCE, OR THE REST PROVES NOTHING");
/* Planted the way the migration plants it: a snapshot of the figures the running block
   began on. Without this, every assertion below passes on an app that never holds. */
await p.evaluate(()=> boot(S2=>{
  S2.volHold = {blockStart: S2.blockStart || 0, at: Date.now(),
    lm: {chest: {mev: 10, mav: 19, mrv: 20}, quads: {mev: 9, mav: 14, mrv: 19}}};
}));
let r = await p.evaluate(()=> window.snap());
ck("CONTROL: a block hold is in place", r.held === true, String(r.held));
ck("CONTROL: and it is what the rows are showing",
   /\b10\/19\/20\b/.test(r.rows.chest.text), r.rows.chest.text);
const before = r;

console.log("\n2. MOVING THE DIAL MOVES EVERY MUSCLE");
await p.evaluate(()=> document.getElementById('tgDial').focus());
for(let i = 0; i < 5; i++) await p.keyboard.press("ArrowLeft");
await p.waitForTimeout(800);                 // past the 450ms commit debounce
r = await p.evaluate(()=> window.snap());
ck("the scale itself moved", r.scale < before.scale,
   Math.round(before.scale*100) + "% -> " + Math.round(r.scale*100) + "%");
ck("and it reached disk", r.onDisk === r.scale, String(r.onDisk));
ck("the hold let go, because this was your own hand", r.held === false, String(r.held));

const names = Object.keys(before.rows);
/* TWO KINDS OF MUSCLE MUST NOT MOVE, and asserting "every one" caught both as failures
   before the reason was clear. A floor you set by hand is exempt from the scale by
   design -- section 4 asserts exactly that -- and a muscle whose floor is zero stays
   zero however it is multiplied. Neither is a bug, and both would have been silenced by
   loosening the assertion instead of narrowing it. */
const handSet = await p.evaluate(()=> Object.keys(S.lmFloor || {}).filter(k=> GROUPS[k]));
const shouldMove = names.filter(g=> handSet.indexOf(g) < 0 && before.rows[g].lm > 0);
const sameText = shouldMove.filter(g=> before.rows[g].text === r.rows[g].text);
const sameLm   = shouldMove.filter(g=> before.rows[g].lm === r.rows[g].lm);
ck("CONTROL: there are muscles to check", names.length >= 15, names.length + " muscles");
ck("CONTROL: and most of them are free to move", shouldMove.length >= 8,
   shouldMove.length + " of " + names.length + " (" + handSet.length + " set by hand)");
ck("every muscle not set by hand moved its landmarks", sameLm.length === 0, sameLm.join(", "));
ck("and its figures moved on screen", sameText.length === 0, sameText.join(", "));

/* THE BAR IS A RELATIVE PICTURE, which is why its BAND does not move: the scale ends at
   the ceiling plus a margin, so when the floor and the ceiling shrink together the band
   occupies the same share of the track. What moves is the MARKER -- your sets did not
   change, so against a smaller ceiling they sit further along. Asserting the band moved
   would have been asserting the drawing was wrong. */
const marker = g=>{
  const m1 = before.rows[g].now, m2 = r.rows[g].now;
  return {m1, m2};
};
const sameNow = shouldMove.filter(g=> before.rows[g].now === r.rows[g].now
  && before.rows[g].vol > 0);
ck("and the marker moved against the smaller ceiling", sameNow.length === 0, sameNow.join(", "));
ck("the held muscles moved too, which was the bug",
   before.rows.chest.text !== r.rows.chest.text && before.rows.quads.text !== r.rows.quads.text,
   before.rows.chest.text + " -> " + r.rows.chest.text);

console.log("\n3. DOWN THE DIAL MEANS DOWN THE NUMBERS");
const wrongWay = names.filter(g=> r.rows[g].lm > before.rows[g].lm);
ck("nothing went up when the scale went down", wrongWay.length === 0, wrongWay.join(", "));
ck("CONTROL: and the fall is about the size of the scale change",
   Math.abs(r.rows.lats.lm / before.rows.lats.lm - (r.scale / before.scale)) < 0.08,
   "lats " + before.rows.lats.lm + " -> " + r.rows.lats.lm
     + ", scale x" + (r.scale/before.scale).toFixed(2));

console.log("\n4. A NUMBER YOU SET BY HAND IS STILL YOURS");
/* The hold exempted hand-set landmarks all along, and the fix must not disturb that. */
r = await p.evaluate(async ()=>{
  boot(S2=>{ S2.lmFloor = Object.assign({}, S2.lmFloor, {biceps: 12}); });
  const A1 = bodyAnalysis();
  const mine1 = A1.lm.biceps.mev;
  document.getElementById('tgDial').focus();
  return {mine1};
});
for(let i = 0; i < 5; i++) await p.keyboard.press("ArrowLeft");
await p.waitForTimeout(800);
const after4 = await p.evaluate(()=> ({mine2: bodyAnalysis().lm.biceps.mev,
                                       scale: Math.round(lmScale()*100)}));
ck("CONTROL: the dial moved", after4.scale < 100, after4.scale + "%");
ck("a floor you set by hand is not scaled with the rest",
   Math.abs(after4.mine2 - r.mine1) < 0.001, r.mine1 + " -> " + after4.mine2);

ck("no page errors", errs.length === 0, errs.join(" | "));
await b.close();
console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
