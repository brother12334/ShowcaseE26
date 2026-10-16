import { chromium, APP_URL } from './_e26.mjs';
/* "MOVE THIS TO A LICENSING THING IN SETTINGS: ANATOMY FROM MUSCLEMAP BY MELIH COLPAN,
   MIT LICENCE."

   It was six words under the body diagram. A licence is a term of use rather than a
   caption, and the MIT licence has exactly one obligation: its copyright and permission
   notice must be included with the work. A link is not an inclusion. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1100}});
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
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr();
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false});
  S.splitId=DEFAULT_SPLIT; applySplit(); save();
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

console.log("1 - SETTINGS HAS A LICENSING PAGE");
{
  const r = await p.evaluate(()=>{
    TAB="sync"; SET_PAGE=null; render();
    const tile = document.querySelector('[data-setopen="legal"]');
    if(!tile) return {none:true};
    const label = tile.getAttribute("aria-label") || "";
    tile.click();
    const t = document.body.textContent || "";
    return {label, open: SET_PAGE, musclemap: /MuscleMap/.test(t),
            author: /Melih Colpan/.test(t)};
  });
  console.log("   ", JSON.stringify(r));
  ck("there is a row for it", !r.none, String(!r.none));
  ck("named Licensing", /Licensing/i.test(r.label), r.label);
  ck("it opens", r.open === "legal", String(r.open));
  ck("and it credits the work by name", r.musclemap && r.author, "map:"+r.musclemap+" author:"+r.author);
}

console.log("\n2 - THE LICENCE IS CARRIED IN FULL, WHICH IS WHAT IT ASKS FOR");
{
  const r = await p.evaluate(()=>{
    const pre = document.querySelector(".lic-text");
    const t = pre ? pre.textContent : "";
    return {shown: !!pre, t,
            copyright: /Copyright \(c\) \d{4} Melih Colpan/.test(t),
            permission: /above copyright notice and this permission notice shall be included/.test(t),
            warranty: /WITHOUT WARRANTY OF ANY KIND/.test(t),
            link: !!document.querySelector('a[href*="melihcolpan/MuscleMap"]')};
  });
  console.log("   ", r.t.split("\n")[2] || "", "| chars:", r.t.length);
  ck("the licence text is on the page", r.shown && r.t.length > 700, String(r.t.length));
  ck("WITH THE COPYRIGHT LINE, which is the bit that must travel", r.copyright, String(r.copyright));
  ck("and the permission notice", r.permission, String(r.permission));
  ck("and the warranty disclaimer", r.warranty, String(r.warranty));
  ck("with the source linked as well", r.link, String(r.link));
}

console.log("\n3 - IT IS NO LONGER A CAPTION ON THE BODY TAB");
{
  const r = await p.evaluate(()=>{
    TAB="body"; SET_PAGE=null; BODY_FOCUS=null; render();
    const t = document.body.textContent || "";
    return {credit: /Anatomy from/.test(t), old: !!document.querySelector(".bm-credit")};
  });
  console.log("   ", JSON.stringify(r));
  ck("the line under the diagram is gone", !r.credit, String(r.credit));
  ck("and so is the element that held it", !r.old, String(r.old));
}

console.log("\n4 - AND IT SAYS WHAT ELSE IS SOMEBODY ELSE'S");
{
  const r = await p.evaluate(()=>{
    TAB="sync"; SET_PAGE="legal"; render();
    const t = document.body.textContent || "";
    return {fonts: /IBM Plex/.test(t), ofl: /Open Font License/.test(t),
            pubmed: /PubMed/.test(t), noRepub: /No abstract is republished/.test(t),
            own: /Element 26's own work/.test(t)};
  });
  console.log("   ", JSON.stringify(r));
  ck("the typefaces are credited", r.fonts && r.ofl, "plex:"+r.fonts+" ofl:"+r.ofl);
  ck("the papers' source is named", r.pubmed, String(r.pubmed));
  ck("with what is NOT republished said plainly", r.noRepub, String(r.noRepub));
  ck("and what is the app's own is separated from it", r.own, String(r.own));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
