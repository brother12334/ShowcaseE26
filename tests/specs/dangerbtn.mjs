import { chromium, APP_URL, appFile } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* A BUTTON THAT CANNOT BE UNDONE MUST NOT LOOK LIKE THE ONE BESIDE IT.

   Four buttons in this app carry `btn ghost small danger`, and they are the four that
   destroy something: Erase my training data, Delete account, Delete session, Delete
   exercise. Every one of them rendered in the ordinary text colour, because `.danger` is
   (0,1,0) and `.btn.ghost` sets its own colour at (0,2,0) and therefore won every time.
   Erase my training data sat next to Export my data, in the same row, in the same colour.

   The assertion is a COMPUTED colour, not the presence of a class. The class was always
   there; that is exactly why nobody noticed. Only what the browser actually paints can
   tell the two buttons apart, which is the thing a person has to do. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

await p.evaluate(fx=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} try{hideModal()}catch(e){}
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  Object.keys(S).forEach(k=>{ delete S[k]; });
  Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
  S.tourDone = true; migrate(); try{ applySplit(); }catch(e){}
}, FX);

console.log("\n1. ON THE SCREEN WHERE BOTH KINDS SIT IN THE SAME STACK");
const d = await p.evaluate(()=>{
  TAB='sync'; SET_PAGE='data'; render();
  const col = id=>{ const el=document.getElementById(id); if(!el) return null;
    const cs=getComputedStyle(el);
    return {color:cs.color, border:cs.borderTopColor, cls:el.className}; };
  const bad = getComputedStyle(document.documentElement).getPropertyValue('--bad').trim();
  return {reset:col('resetBtn'), del:col('acctDelete'), exp:col('exportBtn'),
          imp:col('importBtn'), badVar:bad};
});
ck("the erase button is there", !!d.reset);
ck("the delete-account button is there", !!d.del);
ck("CONTROL: an ordinary button is there to compare against", !!d.exp);
/* #d1584f */
const BAD = "rgb(209, 88, 79)";
ck("erase is painted in the danger colour", d.reset && d.reset.color === BAD, d.reset && d.reset.color);
ck("delete account is painted in the danger colour", d.del && d.del.color === BAD, d.del && d.del.color);
ck("CONTROL: the ordinary button is NOT", d.exp && d.exp.color !== BAD, d.exp && d.exp.color);
ck("so the two are actually distinguishable",
   d.reset && d.exp && d.reset.color !== d.exp.color);
ck("and the edge carries it too, not only the text",
   d.reset && d.exp && d.reset.border !== d.exp.border,
   d.reset && d.reset.border);
ck("CONTROL: both still carry the danger class, which was never the problem",
   /\bdanger\b/.test(d.reset.cls) && /\bdanger\b/.test(d.del.cls));

console.log("\n2. EVERY BUTTON IN THE APP THAT CLAIMS TO BE DANGEROUS");
/* Rendered rather than grepped: the markup was right all along, so matching the source
   would have passed throughout the entire period the bug existed. */
const all = await p.evaluate(BADC=>{
  const out = {checked:0, wrong:[]};
  const probe = ()=>{
    document.querySelectorAll('.btn.danger').forEach(el=>{
      out.checked++;
      if(getComputedStyle(el).color !== BADC)
        out.wrong.push((el.id||el.textContent.trim().slice(0,24)));
    });
  };
  TAB='sync'; SET_PAGE='data'; render(); probe();
  TAB='history'; render(); probe();
  return out;
}, BAD);
ck("CONTROL: the sweep actually found danger buttons to check", all.checked >= 2, all.checked + " found");
ck("and none of them paints as an ordinary button", all.wrong.length === 0, all.wrong.join(", "));

console.log("\n3. NOTHING ELSE TURNED RED");
const safe = await p.evaluate(BADC=>{
  TAB='sync'; SET_PAGE='data'; render();
  const reds = [...document.querySelectorAll('.btn:not(.danger)')]
    .filter(el=> getComputedStyle(el).color === BADC)
    .map(el=> el.id || el.textContent.trim().slice(0,24));
  const total = document.querySelectorAll('.btn:not(.danger)').length;
  return {reds, total};
}, BAD);
ck("CONTROL: there are ordinary buttons on this screen", safe.total >= 2, safe.total + " found");
ck("and not one of them is painted as dangerous", safe.reds.length === 0, safe.reds.join(", "));

ck("no page errors", errs.length === 0, errs.join(" | "));
await b.close();
console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
