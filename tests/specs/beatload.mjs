import { chromium, APP_URL } from './_e26.mjs';
/* "BEAT FLAG DOESN'T MATCH WEIGHT, FIX."

   Lat pulldown, 3x8-12. Last session's top set was 140 x 11. The Nov 7 grade raised the
   plan to 145 and the boxes were prefilled with 145 — and the Beat tip said:

     Last time's best was 140 lb x 11 — one more rep at the same load clears it —
     140 lb x 12

   directly above a line announcing "145 lb is new — reps restart at 8 and climb to 12".
   overloadTarget() read last session's sets and only last session's sets, so it quoted a
   load the plan had already moved off.

   The tip is now stated at the load the session is actually going to use, and the number
   it names is the rep count that passes last time's best on estimated 1RM: 145 x 10, not
   145 x 8, which is a worse set than the one it is supposed to beat. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1400}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok   ":"  BROKEN ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
const ev=(fn,a)=>p.evaluate(fn,a);

/* Last session at `was` for `reps`; the plan now says `plan`. Returns the rendered tip. */
const tip = (was, reps, plan)=> ev(a=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, rpe:true, overloadTips:true});
  S.splitId=DEFAULT_SPLIT; applySplit(); S.active=null;
  const wid=ROTATION[0], t=Date.now()-7*86400e3;
  S.program[wid]=[{name:"Lat Pulldown", sets:3, reps:"8-12", weight:a.plan, rpe:"7-9"}];
  S.sessions=[{id:"b1", workoutId:wid, date:dayStr(t), startedAt:t, finishedAt:t+3600e3, feel:4,
    entries:[{name:"Lat Pulldown", reps:"8-12", rpe:"7-9", sets:[
      {weight:String(a.was), reps:"9",          rpe:"7", done:true},
      {weight:String(a.was), reps:String(a.reps), rpe:"8", done:true},
      {weight:String(a.was), reps:"9",          rpe:"8", done:true}]}]}];
  save();
  const en = S.program[wid][0];
  const html = overloadTipHTML(wid, en, false, 0);
  return {html, text: html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()};
}, {was, reps, plan});

console.log("1 - THE REPORTED CASE: THE PLAN MOVED AND THE TIP DID NOT");
{
  const r = await tip(140, 11, 145);
  console.log("    " + r.text);
  ck("it does not tell you to beat the old load",
     !/140 lb × 12/.test(r.text), r.text.slice(0, 160));
  ck("it names the load you are actually on", /145 lb/.test(r.text), r.text.slice(0, 160));
  /* 140x11 -> e1RM 191.3. 145x8 is 183.7 and does NOT pass it; 145x10 is 193.3 and does. */
  ck("with the reps that genuinely pass last time", /145 lb × 10/.test(r.text), r.text.slice(0, 200));
  ck("and it still says what last time was", /140 lb × 11/.test(r.text), r.text.slice(0, 120));
  ck("the volume line drops the claim that only holds at one load",
     !/adding a rep anywhere beats that too/.test(r.text), r.text.slice(-120));
}

console.log("2 - WITH THE LOAD UNCHANGED, NOTHING ABOUT IT CHANGES");
{
  const r = await tip(140, 11, 140);
  console.log("    " + r.text);
  ck("one more rep at the same load is still the answer",
     /one more rep at the same load/.test(r.text), r.text.slice(0, 160));
  ck("naming it", /140 lb × 12/.test(r.text), r.text.slice(0, 160));
  ck("and the volume line keeps its claim",
     /adding a rep anywhere beats that too/.test(r.text), r.text.slice(-120));
}

console.log("3 - AT THE TOP OF THE RANGE WITH THE PLAN ALREADY RAISED");
{
  /* 140x12 -> e1RM 196. 145 needs 10 reps to pass it, not the 8 the rebuild starts at. */
  const r = await tip(140, 12, 145);
  console.log("    " + r.text);
  ck("it is about the new load", /145 lb/.test(r.text), r.text.slice(0, 160));
  ck("and not about adding a step to the old one",
     !/140 lb × 8/.test(r.text) && !/145 lb × 8/.test(r.text), r.text.slice(0, 200));
}

console.log("4 - A LOAD THE APP CUT IS NOT SOMETHING TO BEAT");
{
  const r = await tip(150, 10, 140);
  console.log("    " + r.text);
  ck("it does not ask for the heavier old number",
     !/one more rep at the same load/.test(r.text), r.text.slice(0, 160));
  ck("it says where the plan has put you", /140 lb/.test(r.text), r.text.slice(0, 160));
}

console.log("5 - AND A TARGET OUTSIDE THE RANGE IS NOT NAMED AT ALL");
{
  /* 100x30 -> e1RM 200. At 105 that needs 27 reps, miles past the top of 8-12. */
  const r = await tip(100, 30, 105);
  console.log("    " + r.text);
  ck("no unreachable rep count is invented",
     !/105 lb × 2[0-9]/.test(r.text), r.text.slice(0, 200));
  ck("it says the load moved instead", /105 lb/.test(r.text), r.text.slice(0, 160));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
