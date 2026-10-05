/* Phase 1 harness: the in-app #selftest check for library and mapping invariants,
   run against the real index.html with the network blocked. */
import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

/* the brief asks for the harness to run with the network blocked. file: must still load. */
await p.route(/^https?:/, r=> r.abort());

console.log("1 - THE IN-APP CHECK RUNS FROM THE HASH");
await p.goto(fileUrl('index.html#selftest'),{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof selfTestRun === 'function', null, {timeout:20000});
await p.waitForSelector('.st-wrap', {timeout:20000});
{
  const r = await p.evaluate(()=> ({
    rows: document.querySelectorAll('.st-wrap .st-row').length,
    text: (document.querySelector('.st-wrap')||{}).textContent || ""
  }));
  ck("the page opens the report instead of the app", r.rows >= 5, JSON.stringify(r.rows));
  ck("and names the library size", /\b\d\d\d\b/.test(r.text), r.text.slice(0,120));
}

console.log("2 - THE LIBRARY AND THE MAPPING HOLD TOGETHER");
{
  const r = await p.evaluate(()=> selfTestRun());
  console.log("    library movements: "+r.lib+", re-slotted by a later catalogue row: "+r.warn.length);
  r.fail.slice(0,20).forEach(f=> console.log("    > "+f.k+" | "+f.detail));
  ck("every movement maps to muscles, lands in the slot the catalogue last names, "
     +"sits in one slot only, has shares in 0..1, and no named slot is empty",
     r.ok && r.fail.length === 0, r.fail.length+" problems");
  ck("the library is the real one, not a stub", r.lib > 250, String(r.lib));
}

console.log("3 - BLOCKING THE NETWORK DOES NOT BREAK THE PAGE");
ck("no page errors with every http request aborted", errs.length === 0, errs.join(" | "));

console.log(errs.length?("PAGE ERRORS: "+errs.join(" | ")):"no page errors");
console.log(bad?("BROKEN: "+bad):"all good");
await b.close();
