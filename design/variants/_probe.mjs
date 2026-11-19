import { chromium, APP_URL } from '../../tests/specs/_e26.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:900}});
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S,null,{timeout:20000});
const r = await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} try{hideModal()}catch(e){}
  document.body.classList.remove('onboarding');
  TAB='sync'; SET_PAGE='data'; render();
  const q=id=>{const el=document.getElementById(id);
    return el?{found:true,cls:el.className,color:getComputedStyle(el).color}:{found:false};};
  return {reset:q('resetBtn'), del:q('acctDelete'), normal:q('exportBtn'),
          bad:getComputedStyle(document.documentElement).getPropertyValue('--bad').trim()};
});
console.log(JSON.stringify(r,null,1));
await b.close();
