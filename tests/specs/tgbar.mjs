import { chromium, APP_URL, appFile } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* THE WEEK BAR SHOWS WHAT IS STORED, OR IT IS DECORATION.

   One read-only bar per muscle: the band runs floor to ceiling, a tick marks the target,
   and a marker sits where this week's hard sets actually fall. It takes no drag and no
   input, which is the point -- it reads the same three landmarks the steppers inside the
   row write and the same weekly volume the Body tab reads, so there is exactly one way to
   change any of it and this is not it.

   A drawing is the easiest thing in an app to get subtly wrong and never notice, so this
   checks the GEOMETRY against the stored numbers for EVERY muscle rather than a sample:
   the band's two edges and the marker's position are recomputed from S and required to
   match what was painted, to within a rounding tolerance.

   The two states that matter most are the ones this export does not contain -- nothing
   here sits past its ceiling -- so section 3 plants them rather than hoping. */
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
  /* Recomputed here from S and GROUPS, the same way tgBarHTML does it, and compared
     against the percentages actually painted into the style attributes. */
  window.measure = ()=>{
    const A = bodyAnalysis();
    const out = [];
    document.querySelectorAll('#app .tg-row').forEach(row=>{
      const head = row.querySelector('[data-tgopen]');
      if(!head) return;
      const g = head.dataset.tgopen;
      const bar = row.querySelector('.tg-bar');
      const L = (A.lm && A.lm[g]) || adjustedLandmarks(A, g) || GROUPS[g];
      const vol = Number(r1((A.vol && A.vol[g] != null) ? A.vol[g] : 0));
      if(!bar){ out.push({g, missing:true, mev:L && L.mev, mrv:L && L.mrv}); return; }
      const band = bar.querySelector('.tg-bar-band');
      const mav  = bar.querySelector('.tg-bar-mav');
      const now  = bar.querySelector('.tg-bar-now');
      const num = s=> Number(String(s || "").replace("%",""));
      const top = Math.max(L.mrv * 1.15, vol * 1.05, 1);
      const pc = v=> Math.max(0, Math.min(100, (v / top) * 100));
      out.push({
        g, vol, mev: L.mev, mav: L.mav, mrv: L.mrv,
        paintedLeft:  num(band.style.left),
        paintedRight: 100 - num(band.style.right),
        paintedMav:   num(mav.style.left),
        paintedNow:   num(now.style.left),
        wantLeft: pc(L.mev), wantRight: pc(L.mrv), wantMav: pc(L.mav), wantNow: pc(vol),
        cls: bar.className,
        label: bar.getAttribute('aria-label') || ""
      });
    });
    return out;
  };
}, FX);
await p.evaluate(()=> window.boot());

console.log("\n1. EVERY MUSCLE HAS ONE, AND IT IS NOT A CONTROL");
let r = await p.evaluate(()=>{
  const rows = document.querySelectorAll('#app .tg-row').length;
  const bars = document.querySelectorAll('#app .tg-bar').length;
  const inputs = document.querySelectorAll('#app .tg-bar input, #app .tg-bar button, '
    + '#app .tg-bar [role="slider"], #app .tg-bar [tabindex]').length;
  return {rows, bars, inputs, gkeys: GKEYS.length};
});
ck("CONTROL: the screen drew its muscle rows", r.rows === r.gkeys, r.rows + " of " + r.gkeys);
ck("every row carries a bar", r.bars === r.rows, r.bars + " bars, " + r.rows + " rows");
ck("and not one of them is focusable or takes input", r.inputs === 0, r.inputs + " found");

console.log("\n2. THE GEOMETRY MATCHES WHAT IS STORED, FOR ALL OF THEM");
const m = await p.evaluate(()=> window.measure());
const near = (a, b2)=> Math.abs(a - b2) < 0.02;
const offFloor  = m.filter(x=> !near(x.paintedLeft,  x.wantLeft));
const offCeil   = m.filter(x=> !near(x.paintedRight, x.wantRight));
const offTarget = m.filter(x=> !near(x.paintedMav,   x.wantMav));
const offNow    = m.filter(x=> !near(x.paintedNow,   x.wantNow));
ck("CONTROL: there were bars to measure", m.length >= 15, m.length + " measured");
ck("the band starts at the floor", offFloor.length === 0,
   offFloor.map(x=> x.g + " " + x.paintedLeft.toFixed(2) + " vs " + x.wantLeft.toFixed(2)).join(", "));
ck("and ends at the ceiling", offCeil.length === 0,
   offCeil.map(x=> x.g + " " + x.paintedRight.toFixed(2) + " vs " + x.wantRight.toFixed(2)).join(", "));
ck("the tick sits on the target", offTarget.length === 0,
   offTarget.map(x=> x.g).join(", "));
ck("and the marker on this week's sets", offNow.length === 0,
   offNow.map(x=> x.g + " " + x.paintedNow.toFixed(2) + " vs " + x.wantNow.toFixed(2)).join(", "));
/* The ordering a reader relies on: floor before target before ceiling, always. */
const outOfOrder = m.filter(x=> !(x.wantLeft <= x.wantMav + 0.001 && x.wantMav <= x.wantRight + 0.001));
ck("floor, target and ceiling stay in that order", outOfOrder.length === 0,
   outOfOrder.map(x=> x.g).join(", "));

console.log("\n3. BELOW THE FLOOR AND PAST THE CEILING LOOK DIFFERENT");
/* This export has muscles under their floor and none over the ceiling, so the second
   state is planted. A styling rule nobody can reach is a styling rule nobody has tested. */
const under = m.filter(x=> x.vol < x.mev);
ck("CONTROL: the real export has muscles below their floor", under.length > 0,
   under.length + ": " + under.slice(0,3).map(x=> x.g).join(", "));
ck("each is marked as under", under.every(x=> /tg-under/.test(x.cls)),
   under.filter(x=> !/tg-under/.test(x.cls)).map(x=> x.g).join(", "));
ck("and says so for a screen reader", under.every(x=> /below the floor/.test(x.label)));
ck("CONTROL: and nothing in it is over the ceiling, which is why the next part plants one",
   m.filter(x=> /tg-over/.test(x.cls)).length === 0);

/* TESTED AT THE SOURCE, because the state is not reachable from this export and two
   attempts to manufacture it both lied. Injecting sessions does not move the weekly
   figure, which is computed over a recent window; and pulling the scale dial to 50% left
   every landmark where it was, because bodyAnalysis() memoises and the mutation never
   reached it. A test that fakes its way into a state proves only that the state can be
   faked, so the rule is checked where it is written instead, with the three numbers
   handed straight to the function that draws them. */
const planted = await p.evaluate(()=>{
  const box = document.createElement('div');
  box.innerHTML = tgBarHTML("chest", {mev:10, mav:18, mrv:20}, 26);
  const bar = box.querySelector('.tg-bar');
  const num = s2=> Number(String(s2 || "").replace("%",""));
  return {cls: bar.className, label: bar.getAttribute('aria-label') || "",
          now: num(bar.querySelector('.tg-bar-now').style.left),
          right: 100 - num(bar.querySelector('.tg-bar-band').style.right)};
});
ck("a muscle past its ceiling is marked as over", /tg-over/.test(planted.cls), planted.cls);
ck("and says so for a screen reader", /past the ceiling/.test(planted.label),
   planted.label.slice(0, 72));
ck("CONTROL: its marker is drawn outside the band, not pinned to the end",
   planted.now > planted.right && planted.now < 100,
   "marker " + planted.now.toFixed(1) + "%, band ends " + planted.right.toFixed(1) + "%");
/* And the boundaries, which is where an off-by-one in a comparison would hide: exactly
   on the floor is in range, a hair under is not. */
const edges = await p.evaluate(()=>{
  const read = vol=>{
    const box = document.createElement('div');
    box.innerHTML = tgBarHTML("chest", {mev:10, mav:18, mrv:20}, vol);
    return box.querySelector('.tg-bar').className.replace('tg-bar','').trim() || "in range";
  };
  return {onFloor: read(10), justUnder: read(9.9), onCeiling: read(20), justOver: read(20.1)};
});
ck("sitting exactly on the floor is in range", edges.onFloor === "in range", edges.onFloor);
ck("a tenth under it is not", edges.justUnder === "tg-under", edges.justUnder);
ck("sitting exactly on the ceiling is in range", edges.onCeiling === "in range", edges.onCeiling);
ck("a tenth over it is not", edges.justOver === "tg-over", edges.justOver);

console.log("\n4. IT READS WHAT THE STEPPERS WRITE");
r = await p.evaluate(async ()=>{
  boot();
  const g = "quads";
  const read = ()=>{
    const row = [...document.querySelectorAll('#app .tg-row')]
      .find(x=> (x.querySelector('[data-tgopen]')||{dataset:{}}).dataset.tgopen === g);
    const bar = row && row.querySelector('.tg-bar');
    return bar ? Number(String(bar.querySelector('.tg-bar-band').style.left).replace("%","")) : -1;
  };
  const before = read();
  document.querySelector(`#app [data-tgopen="${g}"]`).click();
  await new Promise(x=> setTimeout(x, 60));
  const st = document.querySelector(`#app [data-tgstep="${g}:mev:up"]`);
  st.dispatchEvent(new PointerEvent("pointerdown", {bubbles:true, pointerId:1}));
  await new Promise(x=> setTimeout(x, 40));
  st.dispatchEvent(new PointerEvent("pointerup", {bubbles:true, pointerId:1}));
  await new Promise(x=> setTimeout(x, 150));
  return {before, after: read(), floor: (S.lmFloor||{}).quads};
});
ck("CONTROL: raising the floor moved the stored value", r.floor > 5.5, String(r.floor));
ck("and the band's start moved with it", r.after > r.before,
   r.before.toFixed(2) + "% -> " + r.after.toFixed(2) + "%");

ck("no page errors", errs.length === 0, errs.join(" | "));
await b.close();
console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
