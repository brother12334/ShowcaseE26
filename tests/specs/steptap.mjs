import { chromium, APP_URL } from './_e26.mjs';
/* P2-11 — THIRTEEN TAPS ON ONE BUTTON WERE THIRTEEN DECISIONS IN THE RECORD.

   From the Nov 15 2026 audit: on Sep 15 the Mid Back floor was changed 13 times in about
   a minute, ending at 5.3. Thirteen rows in the history, twelve of which describe a
   number that had stopped existing by the time the finger came off the button.

   This is the same fault the barbell-convention switch had and the same remedy: one
   decision is one row. A change to the same setting inside half a minute rewrites the row
   before it to the NET move, and a run of taps that lands back where it started leaves no
   row at all, because nothing ended up changed.

   The arithmetic itself still runs per tap — the number on screen has to follow your
   finger. It is the RECORD that coalesces. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1000}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  const f=document.getElementById('aiFull'); if(f){f.hidden=true;f.style.display='none';}
  document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({},S.prefs,{sleepPrompt:false});
  S.splitId=DEFAULT_SPLIT; applySplit(); save(); TAB='sync'; render();
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

await p.waitForTimeout(250);
await p.evaluate(()=>document.querySelector('[data-setopen="targets"]').click());
await p.waitForTimeout(250);
await p.evaluate(()=>document.querySelector('[data-tgopen="upper_back"]').click());
await p.waitForTimeout(250);
const open = async()=>{ await p.evaluate(()=>{ if(TG_OPEN!=='upper_back') document.querySelector('[data-tgopen="upper_back"]').click(); });
  await p.waitForTimeout(140); };
const tap = async dir=>{
  await p.evaluate(d=>{ const b=document.querySelector('[data-tgstep="upper_back:mev:'+d+'"]');
    if(!b) throw new Error("no stepper");
    b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
    b.dispatchEvent(new PointerEvent('pointerup',{bubbles:true})); }, dir);
  await p.waitForTimeout(140);
  await open();
};
const rows = ()=> p.evaluate(()=> (S.planLog||[]).filter(c=> c.kind === "rule")
  .map(c=> ({line: (c.changes||[])[0] || "", at: c.at})));
const lmRows = ()=> p.evaluate(()=> (((S.lmWhy||{}).upper_back||{}).mev || [])
  .map(x=> ({from: x.from, to: x.to, src: x.src})));

const start = await p.evaluate(()=> r1(adjustedLandmarks(bodyAnalysis(),'upper_back').mev));
console.log("1 - THIRTEEN TAPS, ONE ROW   (starting floor " + start + ")");
for(let i=0;i<13;i++) await tap('up');
const r1_ = await rows(); const l1 = await lmRows();
r1_.forEach(x=> console.log("     " + x.line));
console.log("     landmark history:", JSON.stringify(l1));
ck("the history holds one row, not thirteen", r1_.length === 1, String(r1_.length));
ck("and the landmark history one entry", l1.length === 1, String(l1.length));
const end = await p.evaluate(()=> r1(adjustedLandmarks(bodyAnalysis(),'upper_back').mev));
ck("the floor really did move thirteen taps' worth",
   Math.abs(end - start) > 0.5, start + " → " + end);
/* Read off the arrow rather than looked for anywhere in the line: "10 \u2192 10.1" contains
   the string "10" twice and would pass a substring test while describing one tap. */
const sides = l=>{ const m = String(l||"").match(/^([\s\S]*?)\s*\u2192\s*([\s\S]*)$/);
  const n = x=> (String(x).match(/-?\d+(?:\.\d+)?/) || [])[0];
  return m ? {from: n(m[1]), to: n(m[2])} : {}; };
const s1 = sides(r1_[0] && r1_[0].line);
ck("the row starts where you started", s1.from === String(start), JSON.stringify(s1));
ck("and ends where you stopped", s1.to === String(end), JSON.stringify(s1));
ck("the landmark entry spans the same move",
   l1[0] && Math.abs((l1[0].to) - end) < 0.051, l1[0] && (l1[0].from + " → " + l1[0].to));

console.log("\n2 - AND BACK AGAIN LEAVES NOTHING");
await p.evaluate(()=>{ S.planLog = []; if(S.lmWhy) S.lmWhy = {}; delete S.lmFloor; save(); render(); });
await p.waitForTimeout(200);
await open();
const base = await p.evaluate(()=> r1(adjustedLandmarks(bodyAnalysis(),'upper_back').mev));
for(let i=0;i<4;i++) await tap('up');
for(let i=0;i<4;i++) await tap('down');
const r2 = await rows(); const l2 = await lmRows();
const back = await p.evaluate(()=> r1(adjustedLandmarks(bodyAnalysis(),'upper_back').mev));
console.log("     " + base + " → up×4 → down×4 → " + back,
            " rows:", JSON.stringify(r2.map(x=>x.line)));
ck("the floor is back where it was", Math.abs(back - base) < 0.051, base + " vs " + back);
ck("so the record says nothing happened", r2.length === 0, String(r2.length));
ck("in the landmark history too", l2.length === 0, String(l2.length));

console.log("\n3 - A CHANGE MADE LATER IS ITS OWN DECISION");
const later = await p.evaluate(()=>{
  S.planLog = []; S.lmWhy = {};
  /* An hour ago, then now. Nothing about these two is one hand on one button. */
  logPlanChange("rule", null, gName("upper_back"),
    [gName("upper_back") + " floor 4 → 5 sets a week"],
    {setting: "lm:upper_back:mev", note: "You set this floor yourself in Settings."});
  S.planLog[0].at = Date.now() - 3600000;
  logPlanChange("rule", null, gName("upper_back"),
    [gName("upper_back") + " floor 5 → 6 sets a week"],
    {setting: "lm:upper_back:mev", note: "You set this floor yourself in Settings."});
  return (S.planLog||[]).map(c=> (c.changes||[])[0]);
});
console.log("     " + JSON.stringify(later));
ck("both are kept", later.length === 2, String(later.length));

console.log("\n4 - A DIFFERENT SETTING IS NOT THE SAME SETTING");
const two = await p.evaluate(()=>{
  S.planLog = [];
  logPlanChange("rule", null, gName("upper_back"), [gName("upper_back") + " floor 4 → 5 sets a week"],
    {setting: "lm:upper_back:mev"});
  logPlanChange("rule", null, gName("upper_back"), [gName("upper_back") + " ceiling 20 → 21 sets a week"],
    {setting: "lm:upper_back:mrv"});
  logPlanChange("rule", null, gName("chest"), [gName("chest") + " floor 8 → 9 sets a week"],
    {setting: "lm:chest:mev"});
  return (S.planLog||[]).map(c=> (c.changes||[])[0]);
});
console.log("     " + JSON.stringify(two));
ck("three settings, three rows", two.length === 3, String(two.length));

console.log("\n5 - THE STEPPER IS THE THING THAT ASKS FOR THIS");
/* A static check, so a new stepper added later cannot quietly go back to a row per tap:
   every hand-set landmark row is written with a setting key. */
const win = await p.evaluate(()=> typeof SETTING_COALESCE_MS === "number" ? SETTING_COALESCE_MS : null);
ck("the window is half a minute", win === 30000, String(win));
/* And the stepper is the thing that asks for it: a row written without a setting key is
   back to a row per tap, so the key being passed is the test. */
const keyed = await p.evaluate(()=>{
  S.planLog = []; S.lmWhy = {}; delete S.lmFloor; save();
  return null;
});
await p.evaluate(()=>{ render(); });
await p.waitForTimeout(200);
await open();
await tap('up'); await tap('up');
const k = await p.evaluate(()=> (S.planLog||[]).filter(c=> c.kind === "rule")
  .map(c=> c.setting || ""));
console.log("     settings:", JSON.stringify(k));
ck("the stepper names the setting it steps",
   k.length === 1 && k[0] === "lm:upper_back:mev", JSON.stringify(k));

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
