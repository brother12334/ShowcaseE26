import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b=await chromium.launch(); const p=await b.newPage();
p.on('pageerror',e=>console.log('ERR',e.message));
await p.addInitScript(()=>{localStorage.clear();
 localStorage.setItem('e26.account',JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'F',createdAt:1,cloud:false,ns:''}));
 localStorage.setItem('e26.ns0','E26-X');});
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>typeof S!=='undefined'&&!!S);
console.log(await p.evaluate(()=>{
  const by={};
  Object.keys(EX_LIBRARY).forEach(k=>EX_LIBRARY[k].forEach(x=>{
    const c=canonEx(x.name); (by[c]=by[c]||[]).push(k+':'+x.name); }));
  const exact=Object.keys(by).filter(c=>by[c].length>1);
  const flat={};
  Object.keys(by).forEach(c=>{ const f=dashFlat(c); (flat[f]=flat[f]||[]).push(c); });
  const hyph=Object.keys(flat).filter(f=>flat[f].length>1);
  return 'SAME NAME IN TWO SLOTS (' + exact.length + '):\n' +
    (exact.map(c=>'  '+by[c].join('   |   ')).join('\n')||'  none') +
    '\n\nSAME MOVEMENT, HYPHENATED DIFFERENTLY (' + hyph.length + '):\n' +
    (hyph.map(f=>'  '+flat[f].join('   |   ')).join('\n')||'  none');
}));
await b.close();
