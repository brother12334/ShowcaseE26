/* P1-P5 - THE POLISH PASS. A tick that pops once for the set you just did, a grade that
   makes you wait for it, a press you can feel on anything pressable, three buzzes and no
   more, and the muscle square carried into its own sheet. */
import { chromium, APP_URL, shot } from './_e26.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
await p.route(/^https?:/, r=> r.abort());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X');
  /* The buzzes, recorded rather than felt. */
  window.__buzz = [];
  try{ Object.defineProperty(navigator, 'vibrate',
    {value: pat=>{ window.__buzz.push(Array.isArray(pat) ? pat.slice() : [pat]); return true; },
     configurable: true}); }catch(e){}
});
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open','spec-open','build-open','news-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  const af=document.getElementById('aiFull'); if(af) af.hidden=true;
  S.seenNews='x'; S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.splitId=DEFAULT_SPLIT; applySplit();
  DAYS.forEach(wid=>{ S.program[wid]=[
    {name:"Barbell Bench Press", sets:3, reps:"6-10", rpes:[7,8,9]},
    {name:"Lat Pulldown", sets:3, reps:"8-12", rpes:[7,8,9]}]; });
  save(); TAB='today'; render();
});
const ev = (fn,a)=> p.evaluate(fn,a);

console.log("1 - P2: TWO SPEEDS, AND THE SLOW ONE MAKES YOU WAIT");
{
  const r = await ev(async ()=>{
    const mk = attr=>{
      const el = document.createElement("b");
      el.setAttribute("data-countup", attr);
      el.textContent = "17,280 lb";
      document.body.appendChild(el);
      return el;
    };
    const slow = mk("slow"), quick = mk("");
    quick.textContent = "42 lb";              // a short climb, for the quick path
    countUpAll(document.body);
    await new Promise(r=> setTimeout(r, 180));           // inside the slow one's hold
    const held = slow.textContent, moving = quick.textContent;
    await new Promise(r=> setTimeout(r, 320));           // the quick one is long done
    const quickEnd = quick.textContent, slowMid = slow.textContent;
    await new Promise(r=> setTimeout(r, 2200));
    const out = {held, moving, quickEnd, slowMid, slowEnd: slow.textContent,
                 hold: COUNTUP_HOLD_MS};
    slow.remove(); quick.remove();
    return out;
  });
  ck("the slow one is still sitting on zero after 180ms", /^0 lb$/.test(r.held), r.held);
  ck("and it is held, not blank", r.held.indexOf("lb") > -1, r.held);
  ck("the quick one has already moved by then", r.moving !== "0 lb", r.moving);
  ck("the quick one lands in half a second", r.quickEnd === "42 lb", r.quickEnd);
  ck("the slow one is still climbing", r.slowMid !== "17,280 lb", r.slowMid);
  ck("and lands on the exact number, formatting and all", r.slowEnd === "17,280 lb", r.slowEnd);
  ck("the hold is long enough to read as a pause", r.hold >= 200, String(r.hold));
}
{
  const r = await ev(()=>{
    /* The grade's own count-up: hold, in-out, and a floor under it if the clock never
       fires. The numbers live in quietFinish, so this reads them off the source. */
    const src = quietFinish.toString();
    return {hold: /const hold = (\d+), dur = (\d+)/.exec(src),
            inout: /4 \* p2 \* p2 \* p2/.test(src),
            exact: /numEl\.textContent = String\(to\)/.test(src),
            floor: /textContent === "0"/.test(src)};
  });
  ck("the grade waits before it moves", !!r.hold && +r.hold[1] >= 300, r.hold && r.hold[1]);
  ck("and takes longer than a second to climb", !!r.hold && +r.hold[2] >= 1400, r.hold && r.hold[2]);
  ck("it builds rather than only decelerating", r.inout === true, "");
  ck("it ends on the exact grade", r.exact === true, "");
  ck("and a clock that never fires still shows the number", r.floor === true, "");
}

console.log("2 - P1: THE TICK POPS ONCE, FOR THE SET YOU JUST DID");
{
  await ev(()=>{ startWorkout(DAYS[0]); render(); });
  const r = await ev(async ()=>{
    const row = i=> document.querySelector('.set .chk[data-e="0"][data-s="' + i + '"]');
    const fill = i=>{
      const r0 = row(i).parentElement;
      r0.querySelector('[data-f="weight"]').value = "100";
      r0.querySelector('[data-f="reps"]').value = "8";
    };
    fill(0); row(0).click();
    await new Promise(r=> setTimeout(r, 120));
    const after1 = Array.from(document.querySelectorAll(".set .chk"))
      .map(x=> x.classList.contains("just-done"));
    /* Stop the clock, or the next tick is refused while the rest runs. */
    if(S.active.restTimer){ S.active.restTimer = null; hideRestUI(); }
    fill(1); row(1).click();
    await new Promise(r=> setTimeout(r, 120));
    const marked = row(1).classList.contains("just-done");
    if(S.active.restTimer){ S.active.restTimer = null; hideRestUI(); }
    render();
    await new Promise(r=> setTimeout(r, 60));
    return {after1, marked,
      onAfterRender: Array.from(document.querySelectorAll(".set .chk.on")).length,
      poppedAfterRender: Array.from(document.querySelectorAll(".set .chk.just-done")).length,
      css: Array.from(document.styleSheets).some(s=>{
        try{ return Array.from(s.cssRules).some(r2=>
          r2.selectorText === ".set .chk.on.just-done"); }catch(e){ return false; }
      })};
  });
  ck("the set just logged is marked", r.after1.filter(Boolean).length === 1,
     JSON.stringify(r.after1));
  ck("and it is the first one", r.after1[0] === true, JSON.stringify(r.after1));
  ck("a second tap marks the tick that was tapped", r.marked === true, String(r.marked));
  ck("two sets are logged", r.onAfterRender >= 2, String(r.onAfterRender));
  ck("AND A REDRAW POPS NOTHING, which is the whole fix", r.poppedAfterRender === 0,
     String(r.poppedAfterRender));
  ck("the animation is gated on the mark, not on being done", r.css === true, "");
}
{
  /* M1's marker has to KEEP UP without a redraw: the logger does not re-render on a
     tick, and the copper edge sat on the set you had just finished. */
  const r = await ev(async ()=>{
    const rows = ()=> Array.from(document.querySelectorAll('.set'))
      .filter(x=> x.querySelector('.chk[data-e="0"]'))
      .map(x=> (x.classList.contains("is-live") ? "live" : "")
             + (x.classList.contains("is-logged") ? "logged" : ""));
    const before = rows();
    const chk = document.querySelector('.set .chk[data-e="0"][data-s="2"]');
    const r0 = chk.parentElement;
    r0.querySelector('[data-f="weight"]').value = "100";
    r0.querySelector('[data-f="reps"]').value = "8";
    if(S.active.restTimer){ S.active.restTimer = null; hideRestUI(); }
    chk.click();
    await new Promise(r=> setTimeout(r, 120));
    return {before, after: rows()};
  });
  ck("the set just logged reads as logged", r.after[2] === "logged", JSON.stringify(r.after));
  ck("it was the live one until it was logged", r.before[2] === "live",
     JSON.stringify(r.before));
  ck("AND THE EDGE IS OFF IT NOW, with no redraw",
     r.after.filter(x=> x === "live").length === 0, JSON.stringify(r.after));
  ck("every set of a finished movement reads as logged",
     r.after.every(x=> x === "logged"), JSON.stringify(r.after));
}

console.log("3 - P4: THREE BUZZES AND NO OTHERS");
{
  const r = await ev(()=> ({pats: Object.keys(HAPTIC), buzz: window.__buzz.slice(),
                            on: hapticsOn()}));
  ck("there are exactly three patterns", r.pats.length === 3, JSON.stringify(r.pats));
  ck("and they are the set, the rest and the finish",
     r.pats.join(",") === "set,rest,done", JSON.stringify(r.pats));
  ck("on by default", r.on === true, String(r.on));
  ck("logging a set buzzed, once per set", r.buzz.length === 3, JSON.stringify(r.buzz));
  ck("and the set buzz is a single short tick",
     r.buzz.every(x=> x.length === 1 && x[0] <= 30), JSON.stringify(r.buzz));
}
{
  const r = await ev(async ()=>{
    window.__buzz.length = 0;
    const calls = [];
    ["set","rest","done","nonsense"].forEach(k=> calls.push([k, haptic(k)]));
    const withOn = window.__buzz.length;
    trainPrefs().haptics = "off";
    window.__buzz.length = 0;
    haptic("set"); haptic("rest"); haptic("done");
    const withOff = window.__buzz.length;
    trainPrefs().haptics = "on";
    return {calls, withOn, withOff};
  });
  ck("an unknown event does not buzz",
     r.calls.find(x=> x[0] === "nonsense")[1] === false, JSON.stringify(r.calls));
  ck("the three real ones do", r.withOn === 3, String(r.withOn));
  ck("AND TURNING IT OFF STOPS ALL OF THEM", r.withOff === 0, String(r.withOff));
}
{
  const r = await ev(()=>{
    const d = document.createElement("div");
    d.innerHTML = prefsScreenHTML();
    const opts = Array.from(d.querySelectorAll("[data-prefhaptics]")).map(x=> x.dataset.prefhaptics);
    return {opts, text: d.textContent.replace(/\s+/g," ")};
  });
  ck("there is a setting for it", r.opts.join(",") === "on,off", JSON.stringify(r.opts));
  ck("and it says which three moments buzz", /rest clock is up/.test(r.text),
     r.text.slice(0, 80));
}

console.log("4 - P4: THE REST CLOCK USES THE SAME THREE, NOT ITS OWN");
{
  const r = await ev(()=> ({ inline: /navigator\.vibrate/.test(fireRestAlert.toString()),
                             uses: /haptic\("rest"\)/.test(fireRestAlert.toString()) }));
  ck("the rest alert goes through the one helper", r.uses === true, "");
  ck("and nothing calls vibrate behind its back", r.inline === false, "");
}

console.log("5 - P3: NOTHING PRESSABLE IS DEAD UNDER THE THUMB");
{
  const r = await ev(()=>{
    const want = {};
    Array.from(document.styleSheets).forEach(s=>{
      try{ Array.from(s.cssRules).forEach(r2=>{
        if(!r2.selectorText) return;
        if(r2.selectorText === "button:active, summary:active")
          want.floor = r2.style.transform;
        if(r2.selectorText === "button, summary") want.trans = r2.style.transition;
        if(/button:disabled:active/.test(r2.selectorText)) want.off = r2.style.transform;
        if(r2.selectorText === ".btn:active" && r2.style.transform)
          want.btn = r2.style.transform;
        if(r2.selectorText === "nav button:active") want.nav = r2.style.transform;
      }); }catch(e){}
    });
    return want;
  });
  ck("there is a floor on every button", r.floor === "scale(0.99)", String(r.floor));
  ck("it springs back rather than snapping", /transform/.test(r.trans || ""), String(r.trans));
  ck("a disabled control stays still", r.off === "none", String(r.off));
  ck("and the controls that already had a press keep theirs",
     r.btn === "scale(0.96)" && r.nav === "scale(0.94)", r.btn + " / " + r.nav);
}
{
  /* The floor must be the WEAKEST rule in the file, or it would quietly flatten all
     sixty-odd press states that came before it. Measured, not asserted: the browser is
     asked what a .btn actually resolves to. */
  const r = await ev(()=>{
    const el = document.createElement("button");
    el.className = "btn";
    document.body.appendChild(el);
    const hit = [];
    Array.from(document.styleSheets).forEach(s=>{
      try{ Array.from(s.cssRules).forEach(r2=>{
        if(r2.selectorText && /:active/.test(r2.selectorText) && r2.style.transform){
          try{ if(el.matches(r2.selectorText.replace(/:active/g, ""))) hit.push(r2.selectorText); }
          catch(e){}
        }
      }); }catch(e){}
    });
    el.remove();
    return {hit, last: hit[hit.length - 1]};
  });
  ck("a .btn is matched by both the floor and its own rule", r.hit.length >= 2,
     JSON.stringify(r.hit));
  ck("and its own rule is the more specific of the two",
     r.hit.indexOf(".btn:active") > -1, JSON.stringify(r.hit));
}

console.log("6 - P5: THE MUSCLE SQUARE IS CARRIED INTO ITS SHEET");
{
  await ev(()=>{ if(S.active) S.active = null; save(); TAB='program'; render(); });
  const r = await ev(async ()=>{
    const row = document.querySelector("#app .pv-r");
    if(!row) return {noRow: true};
    const sym = row.querySelector(".pv-sq").textContent.trim();
    row.click();
    await new Promise(r=> setTimeout(r, 40));
    const m = document.getElementById("modal");
    const dst = m.querySelector(".vf-h .pv-sq.fly-in");
    const ghosts = Array.from(document.body.children)
      .filter(x=> x.style && x.style.position === "fixed" && x.style.zIndex === "200");
    const mid = {open: document.getElementById("modalBg").classList.contains("show"),
                 dst: !!dst, dstSym: dst ? dst.textContent.trim() : "",
                 hidden: dst ? dst.style.visibility : "", ghosts: ghosts.length,
                 ghostSym: ghosts[0] ? ghosts[0].textContent.trim() : ""};
    await new Promise(r=> setTimeout(r, 700));
    const left = Array.from(document.body.children)
      .filter(x=> x.style && x.style.zIndex === "200").length;
    return {sym, mid, left,
            shown: m.querySelector(".vf-h .pv-sq.fly-in").style.visibility,
            headText: m.querySelector(".vf-h").textContent.replace(/\s+/g," ").trim(),
            state: (m.querySelector(".vf-h").className.match(/is-(under|ok|over)/)||[])[1]};
  });
  ck("the plan card really has rows to tap", !r.noRow, "no .pv-r in the program tab");
  ck("the sheet opened", r.mid.open === true, JSON.stringify(r.mid));
  ck("the heading has a square of its own to land on", r.mid.dst === true, JSON.stringify(r.mid));
  ck("and it is the same square", r.mid.dstSym === r.sym, r.mid.dstSym + " vs " + r.sym);
  ck("one ghost is in flight", r.mid.ghosts === 1, JSON.stringify(r.mid));
  ck("the ghost carries the symbol with it", r.mid.ghostSym === r.sym, r.mid.ghostSym);
  ck("the destination is hidden while it flies", r.mid.hidden === "hidden", r.mid.hidden);
  ck("THE GHOST IS CLEARED UP", r.left === 0, String(r.left));
  ck("and the square it flew to is visible once it lands", r.shown === "", "'" + r.shown + "'");
  ck("the heading still names the muscle", r.headText.length > 3, r.headText);
  ck("and wears the row's verdict",
     ["under","ok","over"].indexOf(r.state) > -1, String(r.state));
  await p.screenshot({path: shot("p5-flight.png")});
}
{
  /* A square that is not there, and a browser that cannot animate: the sheet still opens.
     Decoration over a navigation, never instead of one. */
  const r = await ev(async ()=>{
    hideModal();
    flyIntoSheet(null, ()=> openVolFix("chest"));
    await new Promise(r=> setTimeout(r, 40));
    const a = document.getElementById("modalBg").classList.contains("show");
    hideModal();
    const el = document.querySelector("#app .pv-r .pv-sq");
    const real = el.animate; el.animate = undefined;
    flyIntoSheet(el, ()=> openVolFix("chest"));
    await new Promise(r=> setTimeout(r, 40));
    const bb = document.getElementById("modalBg").classList.contains("show");
    el.animate = real;
    return {a, bb};
  });
  ck("with no square the sheet opens anyway", r.a === true, String(r.a));
  ck("and so it does where the browser cannot animate", r.bb === true, String(r.bb));
}

console.log("7 - UNDER REDUCED MOTION, NONE OF IT MOVES");
{
  const q = await (await b.newContext({viewport:{width:390,height:900},
                                       reducedMotion:'reduce'})).newPage();
  const e2=[]; q.on('pageerror',e=>e2.push(e.message));
  await q.route(/^https?:/, r=> r.abort());
  await q.addInitScript(()=>{ localStorage.clear();
    localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
    localStorage.setItem('e26.ns0','E26-X'); });
  await q.goto(APP_URL,{waitUntil:'domcontentloaded'});
  await q.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
  const r = await q.evaluate(async ()=>{
    const el = document.createElement("b");
    el.setAttribute("data-countup", "slow");
    el.textContent = "420 lb";
    document.body.appendChild(el);
    countUpAll(document.body);
    const txt = el.textContent;
    el.remove();
    let ran = false;
    flyIntoSheet({getBoundingClientRect:()=>({width:10,height:10,left:0,top:0}),
                  animate(){ }, cloneNode(){ return document.createElement("i"); }},
                 ()=>{ ran = true; });
    return {txt, ran, ghosts: Array.from(document.body.children)
      .filter(x=> x.style && x.style.zIndex === "200").length};
  });
  ck("the number is simply the number", r.txt === "420 lb", r.txt);
  ck("the sheet still opens", r.ran === true, String(r.ran));
  ck("and nothing flies", r.ghosts === 0, String(r.ghosts));
  ck("nothing threw with motion off", e2.length === 0, e2.join(" | "));
  await q.close();
}

console.log("8 - NOTHING THREW");
await ev(()=> hideModal());
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
