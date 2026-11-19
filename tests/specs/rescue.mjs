import { chromium, APP_URL } from './_e26.mjs';
/* RESCUE - A TAB THAT CANNOT DRAW MUST STILL LET THE DATA OUT.

   Reported live on 2026.11.17.9: adding a movement in the session editor produced an
   entry whose shape no reader expected, and Today, History and Body all rendered as a
   tab bar above nothing. Program and Research still worked, so the state had loaded -
   but every route to an export ran through a screen that was down.

   Two things are tested here, and the first matters more than the second. The export
   must not read the app. exportJSON() walks S through BACKUP_FIELDS, which is the same
   state the broken screen was reading, so the one action that could save the data was
   the one most likely to fail with it. rawStateDump() walks localStorage by key name and
   takes each value as a string: it has no schema to be wrong about.

   THE CONTROL. Every section forces a real throw and then asserts the panel. A spec that
   only checked the happy path would pass just as well against no boundary at all, since
   a tab that never throws renders the same either way. So each section first proves the
   tab DID throw, by finding the error text on the screen. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:2200}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, warmups:'off'});
  S.splitId="ppl6"; applySplit();
  /* One finished session, because History returns an empty state before it reads a
     single set - and a boundary test against an empty screen proves nothing. */
  S.sessions=[{id:"s1", workoutId:ROTATION[0], startedAt:Date.now()-5400e3, finishedAt:Date.now()-1800e3,
    entries:[{name:"Barbell Bench Press", sets:[
      {reps:8, weight:135, done:true}, {reps:8, weight:135, done:true}, {reps:7, weight:135, done:true}]}]}];
  S.sync = Object.assign({}, S.sync, {token:"ghp_THIS_MUST_NOT_TRAVEL_0000000000", gistId:"abc"});
  save();
  try{ PROF.token = "ghp_NOR_MUST_THIS_000000000000000000"; saveProfiles(); }catch(e){}
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

/* ---------------- 1. the raw dump, on healthy data ---------------- */
console.log("\n1. rawStateDump reads storage, not the app");
const d1 = await p.evaluate(()=>{
  const t = rawStateText();
  const o = JSON.parse(t);
  return {text:t, keys:Object.keys(o.keys||{}), notes:o.notes||[],
          hasData: !!(o.keys && o.keys['ironlog.v1'] && o.keys['ironlog.v1'].value
                      && Array.isArray(o.keys['ironlog.v1'].value.sessions)),
          redacted: (o.keys['ironlog.v1']||{}).redacted || []};
});
ck("it found this device's keys", d1.keys.length >= 2, d1.keys.join(","));
ck("the data key is carried whole", d1.hasData);
ck("the GitHub token is not in the file", d1.text.indexOf("ghp_") < 0,
   d1.text.indexOf("ghp_") < 0 ? "clean" : "LEAKED");
ck("and the redaction is recorded, not silent", d1.redacted.length >= 1, d1.redacted.join(","));

/* The account key IS carried, deliberately: a rescue file that cannot restore the
   account it came from is not a rescue file. Pinned so nobody "tidies" it away. */
ck("the account key is carried on purpose", d1.text.indexOf("k".repeat(32)) >= 0);

/* ---------------- 2. an unparseable value is the case it exists for ---------------- */
console.log("\n2. a corrupt key goes in verbatim rather than being dropped");
const d2 = await p.evaluate(()=>{
  localStorage.setItem("ironlog.v1.broken", "{not json at all");
  const o = JSON.parse(rawStateText());
  const r = o.keys["ironlog.v1.broken"] || {};
  localStorage.removeItem("ironlog.v1.broken");
  return {raw:r.rawText, err:!!r.parseError, noted:(o.notes||[]).some(n=> n.indexOf("ironlog.v1.broken") === 0)};
});
ck("its text is carried byte for byte", d2.raw === "{not json at all", d2.raw);
ck("the parse failure is recorded", d2.err);
ck("and called out in the notes", d2.noted);

/* ---------------- 3. the boundary, with a real throw ---------------- */
/* Each tab is broken at a different depth: the view itself, and then a helper the view
   calls, because a boundary that only catches the outermost call is no boundary. */
for(const [tab, how] of [["today","view"], ["history","helper"], ["body","view"]]){
  console.log("\n3." + tab + " a throwing " + tab + " shows the panel, not nothing");
  const r = await p.evaluate(a=>{
    const saved = {};
    if(a.how === "view"){
      const name = a.tab === "today" ? "viewToday" : a.tab === "body" ? "viewBody" : "viewHistory";
      saved.name = name; saved.fn = window[name];
      window[name] = ()=>{ throw new TypeError("E26TEST cannot read sides of undefined"); };
    } else {
      saved.name = "histContext"; saved.fn = window.histContext;
      /* A helper several levels down, and the real shape of the live fault: something
         that walks the sessions. The tab bar drew; the sessions did not. */
      window.histContext = ()=>{ throw new TypeError("E26TEST cannot read sides of undefined"); };
    }
    TAB = a.tab;
    let threw = false;
    try{ render(); }catch(e){ threw = true; }
    const app = document.getElementById("app");
    const html = app ? app.innerHTML : "";
    const out = {
      threwOut: threw,
      blank: html.replace(/\s+/g, "").length < 40,
      saysBroken: /could not be drawn|only half working/.test(html),
      showsError: html.indexOf("E26TEST") >= 0,
      hasRawBtn: !!document.getElementById("rescueRaw"),
      wired: !!(document.getElementById("rescueRaw") || {}).onclick
    };
    window[saved.name] = saved.fn;
    return out;
  }, {tab, how});
  ck("render() itself did not throw", r.threwOut === false);
  ck("the screen is not blank", !r.blank);
  ck("it says the screen could not be drawn", r.saysBroken);
  ck("the error text is on screen", r.showsError);
  ck("the raw export button is there", r.hasRawBtn);
  ck("and it is wired", r.wired);
}

/* ---------------- 4. a throwing bind keeps the content ---------------- */
console.log("\n4. a screen that draws and then fails to wire keeps its content");
const d4 = await p.evaluate(()=>{
  const sv = window.bindResearch;
  /* bind() catches bindResearch itself, so break something bind() does NOT guard. */
  const sv2 = window.closeDropdown;
  const svPlate = Element.prototype.querySelectorAll;
  TAB = "today";
  const realBind = window.bind;
  window.bind = ()=>{ throw new TypeError("E26TEST wiring blew up"); };
  let threw = false;
  try{ render(); }catch(e){ threw = true; }
  const html = document.getElementById("app").innerHTML;
  const out = {threwOut: threw, banner:/only half working/.test(html),
               kept: html.length > 2000, btn: !!document.getElementById("rescueRaw"),
               shows: html.indexOf("E26TEST") >= 0};
  window.bind = realBind;
  return out;
});
ck("render() itself did not throw", d4.threwOut === false);
ck("the banner is shown", d4.banner);
ck("the drawn content is kept, not replaced", d4.kept);
ck("the error text is on screen", d4.shows);
ck("with an export button", d4.btn);

/* ---------------- 5. NOT on the ordinary screens any more --------------------------
   THIS SECTION USED TO ASSERT THE OPPOSITE, and the old expectation was simply the old
   policy: the raw export was put on Program and Research deliberately, on the argument
   that Settings is itself a screen that can go down. It is now in Settings > Storage
   only, by request. The argument was not wrong, and it is not ignored either — it is
   answered by sections 3 and 4 above, which are the cases it was really about: a tab that
   crashed and a tab that drew and then failed to wire each still offer the export on the
   spot. So what this section tests is unchanged, which is where a person can get their
   data out from; only the right answer has moved. */
console.log("\n5. the button is NOT on the ordinary screens");
for(const tab of ["program","research"]){
  const r = await p.evaluate(t=>{
    TAB = t; render();
    const b = document.getElementById("rescueRaw");
    return {there: !!b, drew: document.getElementById("app").innerHTML.length > 800};
  }, tab);
  ck(tab + " drew normally", r.drew);
  ck(tab + " does not carry the raw export", r.there === false);
}
/* CONTROL: it has to be somewhere, or the two negatives above are satisfied by an app
   that simply cannot export at all. */
const d5s = await p.evaluate(()=>{
  TAB = "sync"; SET_PAGE = "storage"; render();
  const b = document.getElementById("stoExport");
  return {there: !!b, wired: !!(b && b.onclick)};
});
ck("CONTROL: Settings > Storage carries it instead", d5s.there);
ck("and it is wired", d5s.wired);

/* ---------------- 6. the export writes a file ---------------- */
console.log("\n6. pressing it produces a download");
await p.evaluate(()=>{ TAB = "sync"; SET_PAGE = "storage"; render(); });
/* Clicked through the DOM rather than with a real pointer: a static overlay sits above
   the page in the harness, and what is under test is the handler, not the hit area. */
const dl = await Promise.all([
  p.waitForEvent("download", {timeout:8000}).catch(()=> null),
  p.evaluate(()=>{ document.getElementById("stoExport").click(); })
]).then(x=> x[0]);
ck("a file was offered", !!dl, dl ? dl.suggestedFilename() : "none");
if(dl) ck("named as a raw export", /^element26-raw-/.test(dl.suggestedFilename()), dl.suggestedFilename());

/* ---------------- 7. nothing was written to storage ---------------- */
console.log("\n7. the whole release is read-only");
const d7 = await p.evaluate(()=>{
  const before = localStorage.getItem("ironlog.v1");
  rawStateText(); rawStateDump();
  return {same: before === localStorage.getItem("ironlog.v1"),
          sessions: (S.sessions||[]).length,
          tokenStillThere: !!(S.sync && S.sync.token)};
});
ck("storage is byte-identical after a dump", d7.same);
ck("and the live token was not blanked in memory", d7.tokenStillThere);

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
