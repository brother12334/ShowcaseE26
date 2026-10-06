/* THE MOTION SYSTEM - six roles, and a thing may only move for one of them.

   This spec exists because a motion system written down in a comment is a motion system
   that drifts. It reads the tokens, checks the roles are distinct, and checks the rules
   that keep the system from becoming a screensaver: time is never eased, nothing but a
   consequence runs long, and reduced motion still turns it all off. */
import { chromium, APP_URL, shot } from './_e26.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:844}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
await p.route(/^https?:/, r=> r.abort());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
const ev = (fn,a)=> p.evaluate(fn,a);

console.log("1 - SIX ROLES, EACH WITH A DURATION AND A CURVE");
{
  const r = await ev(()=>{
    const cs = getComputedStyle(document.documentElement);
    const g = k=> cs.getPropertyValue(k).trim();
    return {fast:g("--t-fast"), mid:g("--t-mid"), slow:g("--t-slow"),
            reveal:g("--t-reveal"), nav:g("--t-nav"), form:g("--t-form"),
            conseq:g("--t-conseq"), stagger:g("--stagger"),
            e:g("--ease"), eo:g("--ease-out"), er:g("--ease-reveal"),
            en:g("--ease-nav"), ec:g("--ease-conseq")};
  });
  ck("the roles all have a duration",
     [r.fast, r.reveal, r.nav, r.form, r.conseq].every(x=> /^\.?\d/.test(x)),
     JSON.stringify(r));
  ck("and the curves are defined",
     [r.e, r.eo, r.er, r.en, r.ec].every(x=> /cubic-bezier/.test(x)), JSON.stringify(r));
  const ms = x=> parseFloat(x) * (x.indexOf("ms") > -1 ? 1 : 1000);
  ck("RESPONSE is the shortest thing in the system", ms(r.fast) <= 150, r.fast);
  ck("REVEAL and NAVIGATE are a quarter of a second",
     ms(r.reveal) <= 300 && ms(r.nav) <= 300, r.reveal + " / " + r.nav);
  ck("TRANSFORM is longer than they are, and still under 400ms",
     ms(r.form) > ms(r.nav) - 1 && ms(r.form) < 400, r.form);
  ck("CONSEQUENCE is the only one allowed to be slow", ms(r.conseq) >= 600, r.conseq);
  ck("the stagger is a beat, not a wait", ms(r.stagger) <= 40, r.stagger);
}

console.log("2 - RULE 6: TIME IS NEVER EASED");
{
  const r = await ev(()=>{
    /* Anything that represents real time passing has to be linear. The rest clock is the
       one that matters: an eased clock lies about how much rest is left. */
    const out = {eased: [], checked: 0};
    Array.from(document.styleSheets).forEach(s=>{
      try{ Array.from(s.cssRules).forEach(r2=>{
        if(!r2.selectorText || !r2.style) return;
        const sel = r2.selectorText;
        if(!/rest|timer|clock|\bpf-ring\b/i.test(sel)) return;
        out.checked++;
        const tr = r2.style.transition || "";
        const an = r2.style.animation || "";
        if(/cubic-bezier|ease-in|ease-out/.test(tr + " " + an)
           && /width|stroke|transform/.test(tr)) out.eased.push(sel);
      }); }catch(e){}
    });
    return out;
  });
  ck("rest-clock rules were found to check", r.checked > 0, String(r.checked));
  ck("and none of them ease a value that is tracking real time",
     r.eased.length === 0, JSON.stringify(r.eased));
}

console.log("3 - RULE 3: NOTHING RUNS LONG EXCEPT A CONSEQUENCE");
{
  const r = await ev(()=>{
    /* The rule with its two exemptions written out: a transition may run past 450ms only
       when it is a CONSEQUENCE (and says so with the token) or TIME (and is therefore
       linear). Anything else that is slow is slow by accident. */
    const long = [];
    Array.from(document.styleSheets).forEach(s=>{
      try{ Array.from(s.cssRules).forEach(r2=>{
        if(!r2.selectorText || !r2.style || !r2.style.transition) return;
        const t = r2.style.transition;
        const m = t.match(/(\d*\.?\d+)s/g) || [];
        const slow = m.some(x=> parseFloat(x) > 0.45);
        if(!slow) return;
        if(/var\(--t-conseq\)/.test(t)) return;        // CONSEQUENCE, declared
        if(/\blinear\b/.test(t)) return;               // TIME, and therefore linear
        long.push(r2.selectorText + " :: " + t);
      }); }catch(e){}
    });
    return long;
  });
  ck("nothing runs long except a declared CONSEQUENCE or real TIME", r.length === 0,
     JSON.stringify(r.slice(0, 6)));
}

console.log("4 - THE ARRIVAL READS ITS STAGGER FROM THE TOKEN");
{
  const r = await ev(()=>{
    const out = {};
    Array.from(document.styleSheets).forEach(s=>{
      try{ Array.from(s.cssRules).forEach(r2=>{
        if(r2.selectorText === "#app.view-in > *") out.base = r2.style.animation;
        /* The engine drops the universal selector, so this matches with or without it. */
        if(/view-in\s*>\s*\*?:nth-child\(3\)/.test(r2.selectorText))
          out.third = r2.style.animationDelay || r2.cssText;
      }); }catch(e){}
    });
    return out;
  });
  ck("the view arrival is a NAVIGATE", /var\(--t-nav\)/.test(r.base || ""), String(r.base));
  ck("and its stagger comes from --stagger", /var\(--stagger\)/.test(r.third || ""),
     String(r.third));
}

console.log("5 - THE TAB BAR FITS ITS OWN LABELS MID-SESSION");
{
  const r = await ev(async ()=>{
    S.setup = {name:"Fer", goal:"muscle", level:"intermediate", gear:"full", at:Date.now()};
    S.tourDone = true; S.seenNews = "x"; S.priorTrainingWeeks = 104;
    S.splitId = DEFAULT_SPLIT; applySplit();
    DAYS.forEach(w=>{ S.program[w] = [{name:"Barbell Bench Press", sets:3, reps:"6-10", rpes:[7,8,9]}]; });
    save();
    startWorkout(DAYS[0]);
    const pf = document.getElementById("preflight"); if(pf) pf.remove();
    try{ PF = null; }catch(e){}
    TAB = "workout"; render();
    await new Promise(r2=> setTimeout(r2, 240));
    const pair = document.querySelector(".nav-pair");
    const tabs = Array.from(document.querySelectorAll("nav > button:not([hidden])"));
    const over = [];
    tabs.forEach(bt=>{
      const lbl = bt.querySelector(".nav-lbl");
      if(!lbl) return;
      const br = bt.getBoundingClientRect(), lr = lbl.getBoundingClientRect();
      if(lr.width > br.width - 2) over.push(lbl.textContent.trim() + " " +
        Math.round(lr.width) + ">" + Math.round(br.width));
      if(pair && lr.left < pair.getBoundingClientRect().right)
        over.push(lbl.textContent.trim() + " under the pair");
    });
    return {pairW: pair ? Math.round(pair.getBoundingClientRect().width) : 0,
            tabW: tabs.length ? Math.round(tabs[0].getBoundingClientRect().width) : 0,
            tabs: tabs.length, over};
  });
  ck("the pair is held to what two labels need", r.pairW > 0 && r.pairW <= 152,
     String(r.pairW));
  ck("the other tabs get the rest", r.tabW >= 60, String(r.tabW));
  ck("NO LABEL IS CLIPPED OR COVERED BY THE PAIR", r.over.length === 0,
     JSON.stringify(r.over));
}

console.log("6 - REDUCED MOTION STILL TURNS IT OFF");
{
  const q = await (await b.newContext({viewport:{width:390,height:844},
                                       reducedMotion:'reduce'})).newPage();
  await q.route(/^https?:/, r=> r.abort());
  await q.addInitScript(()=>{ localStorage.clear();
    localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
    localStorage.setItem('e26.ns0','E26-X'); });
  await q.goto(APP_URL,{waitUntil:'domcontentloaded'});
  await q.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
  const r = await q.evaluate(()=>{
    const d = document.createElement("div");
    d.className = "rv";
    document.body.appendChild(d);
    const an = getComputedStyle(d).animationName;
    d.remove();
    return {an, reduced: reducedMotion()};
  });
  ck("the app knows motion is off", r.reduced === true, String(r.reduced));
  ck("and a REVEAL does not animate", r.an === "none", r.an);
  await q.close();
}

console.log("7 - NOTHING THREW");
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
