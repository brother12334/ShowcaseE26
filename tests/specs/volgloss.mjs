/* THE GLOSSARY SAYS WHERE THE NUMBERS COME FROM, AND IT IS THE RIGHT PLACE.

   The three landmark entries were written when the figures came from the volume-landmark
   framework popularised by Renaissance Periodization, and said so in a footer. They do not
   come from there any more — they are derived from a published dose-response curve — and a
   credit line that is no longer true is worse than no credit line. The framing is still
   theirs and is still credited; the numbers are not.

   These checks are that the new entry exists, that it is reachable from the landmark
   entries rather than buried, that it carries the four figures somebody would want, and
   that the old claim is gone. */
import { chromium, APP_URL } from './_e26.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
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

console.log("1 - THE ENTRY EXISTS AND NAMES ITS SOURCE");
{
  const r = await ev(()=> ({
    has: !!GLOSSARY.volcurve,
    title: GLOSSARY.volcurve ? GLOSSARY.volcurve.title : "",
    html: GLOSSARY.volcurve ? GLOSSARY.volcurve.html : ""
  }));
  ck("there is a glossary entry for it", r.has === true, "");
  ck("titled for the question somebody is actually asking",
     /where your set targets come from/i.test(r.title), r.title);
  ck("IT NAMES THE PAPER", /Pelland/.test(r.html), "");
  ck("and says how many studies it pooled", /67\s+studies/.test(r.html), "");
  ck("and names the independent check on the floor", /Bickel/.test(r.html), "");
}

console.log("2 - IT CARRIES THE FOUR FIGURES, AND THE HONEST ONE");
{
  const r = await ev(()=> GLOSSARY.volcurve.html);
  ck("three sets maintains", /3 sets a week/.test(r), "");
  ck("four is the floor", /4 sets a week/.test(r), "");
  ck("ten to eighteen is where a target starts", /10 to 18/.test(r), "");
  ck("and past forty-three there is no evidence",
     /past 43/.test(r) && /no evidence/i.test(r), "");
  /* THE ONE THAT MATTERS MOST. The bands are about efficiency; a recovery limit is a
     different question and is learned per person. Saying otherwise would be the exact
     mistake the brief called out. */
  ck("IT SAYS THE BANDS ARE EFFICIENCY, NOT YOUR LIMIT",
     /efficiency/i.test(r) && /recover from is a different question/i.test(r), "");
}

console.log("3 - IT IS REACHABLE FROM THE LANDMARK ENTRIES");
{
  const r = await ev(()=> ({
    mev: GLOSSARY.mev.html, mav: GLOSSARY.mav.html, mrv: GLOSSARY.mrv.html
  }));
  ["mev","mav","mrv"].forEach(k=>{
    ck(k.toUpperCase() + " links to it", /volcurve/.test(r[k]) || /Where these numbers come from/.test(r[k]),
       r[k].slice(-220));
  });
}

console.log("4 - AND THE CLAIM THAT IS NO LONGER TRUE IS GONE");
{
  const r = await ev(()=> ({
    mev: GLOSSARY.mev.html, mav: GLOSSARY.mav.html, mrv: GLOSSARY.mrv.html
  }));
  const all = r.mev + r.mav + r.mrv;
  ck("nothing still says the landmarks COME FROM that framework",
     !/landmarks come from the volume-landmark framework/i.test(all), "");
  ck("but the framing is still credited, because it is still theirs",
     /Israetel/.test(all) && /Renaissance Periodization/.test(all), "");
  ck("AND IT IS EXPLICIT THAT THE NUMBERS ARE NOT THEIRS",
     /no longer theirs/i.test(all), "");
  ck("the wide-variation warning survived", /individual variation/i.test(all), "");
}

console.log("5 - NOTHING THREW");
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
