import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:900}, deviceScaleFactor:2});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});

let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

console.log("1 - THE SCALE BUILT AT ALL");
ck("no load error", errs.length===0, errs.join(" | "));
const built = await p.evaluate(()=> typeof VOL_LANDMARK_SCALE === "string" && VOL_LANDMARK_SCALE.length > 100);
ck("VOL_LANDMARK_SCALE is a string", built, "");

console.log("2 - THE TICKS SIT ON THE BOUNDARIES");
const geo = await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} document.body.classList.remove('ai-open','onboarding');
  const af=document.getElementById('aiFull'); if(af) af.hidden=true;
  openGlossary("mav");
  const bar=document.querySelector(".gl-bar"), tick=document.querySelector(".gl-ticks");
  if(!bar) return null;
  const br=bar.getBoundingClientRect();
  const segs=[...bar.children].map(x=>{const r=x.getBoundingClientRect();
    return {l:r.left-br.left, r:r.right-br.left, h:r.height, txt:x.innerText};});
  const ticks=[...tick.children].map(x=>{const r=x.getBoundingClientRect();
    return {c:(r.left+r.right)/2-br.left, txt:x.innerText};});
  return {w:br.width, h:br.height, segs, ticks, barTxt:bar.innerText};
});
ck("the bar rendered", !!geo, "");
// tick i should sit on the LEFT edge of segment i
[0,1,2,3].forEach(i=>{
  const want = geo.segs[i].l, got = geo.ticks[i].c;
  const near = Math.abs(want-got) <= (i===0 ? 14 : 3);   // "0" is flush left, not centred
  ck(`${geo.ticks[i].txt} sits at its boundary`, near, `want ${want.toFixed(1)} got ${got.toFixed(1)}`);
});

console.log("3 - NOTHING WRAPS");
ck("the bar is still one row high", geo.h <= 26, String(geo.h));
geo.segs.forEach(sg=> ck(`"${sg.txt}" on one line`, sg.h <= 26, String(sg.h)));
ck("no label says 'hard but ok'", !/hard but ok/i.test(geo.barTxt), geo.barTxt);

console.log("4 - THE ZONES STILL READ LEFT TO RIGHT");
ck("four zones", geo.segs.length===4, String(geo.segs.length));
ck("in order", /TOO LITTLE[\s\S]*SWEET SPOT[\s\S]*HARD[\s\S]*TOO MUCH/i.test(geo.barTxt), geo.barTxt);
ck("ticks in order", geo.ticks.map(t=>t.txt).join(",")==="0,MEV,MAV,MRV", geo.ticks.map(t=>t.txt).join(","));

console.log("5 - AND IT HOLDS UP NARROW");
{
  await p.setViewportSize({width:320, height:900});
  const g2 = await p.evaluate(()=>{
    const bar=document.querySelector(".gl-bar");
    const br=bar.getBoundingClientRect();
    return {h:br.height, segs:[...bar.children].map(x=>x.getBoundingClientRect().height)};
  });
  ck("still one row at 320px", g2.h <= 26 && g2.segs.every(h=> h <= 26), JSON.stringify(g2));
}

console.log(errs.length? "  BROKEN page errors :: "+errs.join(" | ") : "  ok  no page errors");
if(errs.length) bad++;
console.log(bad? ("  "+bad+" broken") : "  all good");
await b.close();
