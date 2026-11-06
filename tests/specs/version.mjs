import { chromium, APP_URL, appFile } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* "WE NEED A BETTER VERSION FORMAT, WE ARE GETTING TO BIG NUMBER."

   It was a count — 1.0 up to 60.6, a tenth per release — and the count had stopped
   meaning anything. It is the date now: YYYY.MM.DD.N, the day the build went out and
   which build of that day it is.

   Three things have to hold or the scheme is worse than the count it replaced: the
   string has to BE a date, the app and the service worker have to agree (they did not —
   53.6 against 60.6), and What's New has to keep opening exactly once per release. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

const v = await p.evaluate(()=> ({app: APP_VERSION, news: NEWS_FOR, label: verLabel()}));
const sw = readFileSync(appFile("sw.js"), "utf8").match(/const VERSION = "([^"]+)"/);

console.log("1 - IT IS A DATE, AND A REAL ONE");
{
  console.log("   ", JSON.stringify(v));
  const m = /^(\d{4})\.(\d{2})\.(\d{2})\.(\d+)$/.exec(v.app);
  ck("the shape is YYYY.MM.DD.N", !!m, v.app);
  if(m){
    const [, y, mo, d, n] = m;
    const dt = new Date(+y, +mo - 1, +d);
    ck("the date exists", dt.getFullYear() === +y && dt.getMonth() === +mo - 1 && dt.getDate() === +d,
       y + "-" + mo + "-" + d);
    ck("the month is a month", +mo >= 1 && +mo <= 12, mo);
    ck("the build number starts at one", +n >= 1, n);
    /* Not in the future, which is the one way a date version lies about itself. A day of
       slack, because a build made late in one timezone is read in another. */
    ck("and it is not dated ahead of today",
       dt.getTime() <= Date.now() + 36 * 3600 * 1000, y + "-" + mo + "-" + d);
  }
}

console.log("2 - AND IT IS PAST WHAT IT REPLACED");
/* The old scheme counted to 60.6. Nothing in the app orders versions, but a human does,
   and a release that looks older than the one before it is a support question. */
{
  ck("the year leads, so it reads as later than 60.6",
     parseInt(v.app, 10) > 60, v.app);
}

console.log("3 - THE APP AND THE SERVICE WORKER AGREE");
{
  ck("the service worker names a version", !!sw, String(sw));
  ck("AND IT IS THE SAME STRING", sw && sw[1] === v.app, sw ? sw[1] + " vs " + v.app : "none");
}

console.log("4 - WHAT'S NEW STILL OPENS ONCE PER RELEASE");
{
  ck("the news page describes this version", v.news === v.app, v.news + " vs " + v.app);
  const r = await p.evaluate(()=>{
    S.seenNews = "something-older";
    const before = S.seenNews !== NEWS_FOR;
    S.seenNews = NEWS_FOR;
    return {before, after: S.seenNews !== NEWS_FOR};
  });
  ck("an older mark means it is due", r.before, String(r.before));
  ck("and seeing it settles it", r.after === false, String(r.after));
}

console.log("5 - THE LABEL IS WHAT A PERSON READS");
{
  const r = await p.evaluate(()=> ({
    one:  verLabel("2026.11.06.1"),
    two:  verLabel("2026.11.06.2"),
    ten:  verLabel("2026.11.06.10"),
    none: verLabel("2026.11.06")
  }));
  console.log("   ", JSON.stringify(r));
  ck("the first build of a day drops its build number", r.one === "2026.11.06", r.one);
  ck("a second one keeps it", r.two === "2026.11.06.2", r.two);
  ck("and so does a tenth", r.ten === "2026.11.06.10", r.ten);
  ck("a string with no build number is left alone", r.none === "2026.11.06", r.none);
}

console.log("6 - NOTHING ORDERS THESE STRINGS");
/* What makes changing the scheme safe: every reader is a display or an equality. If one
   ever compares them with < or >, it has to compare the four numbers — "2026.11.06.10"
   sorts BELOW "2026.11.06.2" as text. */
{
  const src = readFileSync(appFile("index.html"), "utf8");
  const bad2 = [];
  [/APP_VERSION\s*[<>]/g, /[<>]\s*APP_VERSION/g, /NEWS_FOR\s*[<>]/g, /[<>]\s*NEWS_FOR/g,
   /seenNews\s*[<>]/g, /[<>]\s*seenNews/g].forEach(re=>{
    const hit = src.match(re);
    if(hit) bad2.push(hit.join(", "));
  });
  ck("no version is compared for order anywhere", bad2.length === 0, bad2.join(" | "));
  ck("and text sorting really would be wrong",
     "2026.11.06.10" < "2026.11.06.2", "proves the comparator must be numeric");
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
