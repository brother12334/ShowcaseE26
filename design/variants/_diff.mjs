import { chromium, APP_URL, appFile } from '../../tests/specs/_e26.mjs';
import { readFileSync } from 'node:fs';
const FX=JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'),'utf8'));
const OLD="file:///tmp/claude-0/-home-user-ShowcaseE26/cb903a36-3103-5d6a-a18b-78ade397246e/scratchpad/old/index.html";
const b=await chromium.launch();
async function go(url){
  const p=await b.newPage({viewport:{width:390,height:1400}}); p.on('dialog',d=>d.accept());
  await p.addInitScript(()=>{ localStorage.clear();
    localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
    localStorage.setItem('e26.ns0','E26-X'); });
  await p.goto(url,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=> typeof S!=='undefined' && !!S,null,{timeout:20000});
  await p.evaluate(fx=>{
    const sp=document.getElementById('splash'); if(sp) sp.remove();
    try{OB=null}catch(e){} try{PF=null}catch(e){} try{hideModal()}catch(e){}
    ['preflight','aiFull'].forEach(id=>{const el=document.getElementById(id); if(el) el.remove();});
    document.body.classList.remove('ai-open','onboarding','pfl-open');
    Object.keys(S).forEach(k=>{delete S[k]});
    Object.keys(fx).forEach(k=>{S[k]=JSON.parse(JSON.stringify(fx[k]))});
    S.tourDone=true; migrate(); try{applySplit()}catch(e){}
    TAB='sync'; SET_PAGE='sess'; render();
  }, FX);
  return p;
}
const o=await go(OLD), n=await go(APP_URL);
const snap=p=>p.evaluate(()=>{const t=trainPrefs();const out={};Object.keys(t).sort().forEach(k=>out[k]=t[k]);return out;});
const a0=await snap(o), b0=await snap(n);
const keysA=Object.keys(a0), keysB=Object.keys(b0);
console.log("keys only in OLD:", keysA.filter(k=>!(k in b0)));
console.log("keys only in NEW:", keysB.filter(k=>!(k in a0)));
console.log("value diffs at boot:", keysA.filter(k=> k in b0 && JSON.stringify(a0[k])!==JSON.stringify(b0[k])).map(k=>`${k}: ${JSON.stringify(a0[k])} vs ${JSON.stringify(b0[k])}`));
// now tap prefwarm=planOnly on both and compare
const tap=(p,a,v)=>p.evaluate(([a,v])=>{const el=document.querySelector(`#app [${a}="${v}"]`); if(el) el.click(); return !!el;},[a,v]);
await tap(o,"data-prefwarm","planOnly"); await tap(n,"data-prefwarm","planOnly");
const a1=await snap(o), b1=await snap(n);
console.log("after prefwarm=planOnly, diffs:", Object.keys(a1).filter(k=> JSON.stringify(a1[k])!==JSON.stringify(b1[k])).map(k=>`${k}: ${JSON.stringify(a1[k])} vs ${JSON.stringify(b1[k])}`));
const PLAN=[["data-prefprog","auto"],["data-prefprog","hold"],["data-prefprog","ask"],
["data-prefwarm","planOnly"],["data-prefwarm","manual"],["data-prefwarm","auto"],
["data-prefrpe","off"],["data-prefrpe","on"]];
const pn=p=>p.evaluate(()=> JSON.stringify(trainPrefs(), Object.keys(trainPrefs()).sort()));
for(const [a,v] of PLAN){
  const fo=await tap(o,a,v), fn=await tap(n,a,v);
  const xa=await pn(o), xb=await pn(n);
  if(xa!==xb){
    console.log("FIRST MISMATCH at",a,"=",v,"found old/new:",fo,fn);
    const A=JSON.parse(xa),B=JSON.parse(xb);
    console.log(Object.keys(A).filter(k=>JSON.stringify(A[k])!==JSON.stringify(B[k]))
      .map(k=>`  ${k}: OLD ${JSON.stringify(A[k])}  NEW ${JSON.stringify(B[k])}`).join("\n"));
    break;
  } else console.log("match after",a,"=",v,"(found",fo,fn,")");
}
const expr=p=>p.evaluate(()=> JSON.stringify(trainPrefs(), Object.keys(trainPrefs()).sort()));
const ea=await expr(o), eb=await expr(n);
console.log("spec expression equal?", ea===eb);
console.log("OLD head:", ea.slice(0,160));
console.log("NEW head:", eb.slice(0,160));
await b.close();
