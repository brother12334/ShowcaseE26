import { chromium, APP_URL } from './_e26.mjs';
/* P2-10 — THE REPORT AND THE EXPORT DISAGREED ABOUT THE SAME RECORDS.

   From the Nov 15 2026 audit: the downloadable Training History Report shows
   "blank → blank" for most programme edits, while the CSV of the very same change log
   carries the real values. One record, two readers, and the one a person is most likely
   to send to a coach is the one that says nothing.

   The cause is a shape mismatch, not missing data. A change row's `changes` is either a
   list of pre-formatted strings ("75 lb → 27.5 lb") or a list of field objects
   ({field, from, to}); the report only ever understood the second kind, so every row of
   the first kind rendered as two blanks. The CSV went through planChangeLine(), which
   understands both.

   So both now read the records the same way, and the test is the comparison itself:
   every value the export shows for a row must appear in the report's line for that row. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1200}});
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
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false});
  S.splitId=DEFAULT_SPLIT; applySplit(); save();
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

/* One session so the report has a timeline to place the edits in, then one row of every
   shape the log actually holds: pre-formatted strings from the automatic rules, field
   objects from a hand edit in the Program tab, an add, and a remove. */
const r = await p.evaluate(()=>{
  const wid = ROTATION[0];
  const day = todayStr();
  const t0 = Date.now() - 6 * 86400000;
  S.sessions = [{
    id:"s1", date: day, workoutId: wid, startedAt: Date.now() - 3600000,
    finishedAt: Date.now() - 1800000,
    entries: [{name:"Squat", reps:"6-10", sets:[{weight:"135", reps:"8", rpe:8, done:true}]}]
  }];
  S.planLog = [
    {at: t0 + 1000, date: day, day: wid, kind:"weight", name:"Squat",
     changes:["75 lb → 27.5 lb"], note:"Load reduced to a reachable one."},
    {at: t0 + 2000, date: day, day: wid, kind:"weight", name:"Lying Leg Curl",
     changes:["100 lb → 160 lb"]},
    {at: t0 + 3000, date: day, day: wid, kind:"edit", name:"RDL",
     changes:[{key:"reps", field:"reps", from:"8-12", to:"6-10"},
              {key:"sets", field:"sets", from:"3", to:"4"}]},
    {at: t0 + 4000, date: day, day: wid, kind:"add", name:"Face Pull", spec:"3 × 12-15"},
    {at: t0 + 5000, date: day, day: wid, kind:"remove", name:"Upright Row"},
    {at: t0 + 6000, date: day, day: wid, kind:"edit", name:"Bench Press",
     changes:["reps 8-12 → 6-10", "sets 3 → 4"]}
  ];
  save();
  const html = buildReportInner();
  const lis = (html.match(/<li>[\s\S]*?<\/li>/g) || [])
    .map(x=> x.replace(/<[^>]+>/g, " ").replace(/&amp;/g,"&").replace(/\s+/g," ").trim());
  const csv = planHistoryCSV(true);
  const head = csv.split("\n")[0].split(",");
  const ci = head.indexOf("change");
  /* The export's own values for each row, read back through the same splitter the file
     is written with, so the comparison is against what a reader of the CSV sees. */
  const vals = S.planLog.map(c=> planChangeLine(c));
  return {lis, vals, csv, ci};
});
console.log("    report lines:");
r.lis.forEach(x=> console.log("      " + x));

console.log("1 - NOTHING RENDERS AS A BLANK");
ck("the report has a line for every logged change",
   r.lis.length === r.vals.length, r.lis.length + " of " + r.vals.length);
ck("and not one of them says blank",
   !r.lis.some(x=> /blank/i.test(x)), r.lis.filter(x=> /blank/i.test(x)).join(" | "));
ck("nor undefined", !r.lis.some(x=> /undefined/.test(x)),
   r.lis.filter(x=> /undefined/.test(x)).join(" | "));

console.log("\n2 - EVERY EXPORTED VALUE APPEARS IN THE REPORT'S LINE FOR THAT ROW");
r.vals.forEach((strs, i)=>{
  const line = r.lis[i] || "";
  const missing = strs.filter(s=>{
    /* The report writes a sentence and the export writes a diff, so the comparison is on
       the VALUES either side of the arrow rather than on the phrasing around them. */
    const m = String(s).match(/^([\s\S]*?)\s*→\s*([\s\S]*)$/);
    const want = m ? [m[1].trim().split(/\s+/).pop(), m[2].trim()] : [String(s)];
    return want.some(w=> w && line.indexOf(w) < 0);
  });
  ck("row " + (i+1) + " (" + (strs[0] || "").slice(0, 28) + ")",
     missing.length === 0, missing.join(" | ") + "  in: " + line);
});

console.log("\n3 - THE NUMBERS THE AUDIT FOUND MISSING ARE THERE");
const joined = r.lis.join("  ");
["27.5", "160", "6-10", "Face Pull", "Upright Row"].forEach(v=>
  ck("the report says " + v, joined.indexOf(v) > -1));

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
