import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b=await chromium.launch(); const p=await b.newPage();
p.on('pageerror',e=>console.log('ERR',e.message));
await p.addInitScript(()=>{localStorage.clear();
 localStorage.setItem('e26.account',JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'F',createdAt:1,cloud:false,ns:''}));
 localStorage.setItem('e26.ns0','E26-X');});
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>typeof S!=='undefined'&&!!S);
console.log(await p.evaluate(()=>{
  let total=0, withCue=0;
  Object.keys(EX_LIBRARY).forEach(k=>EX_LIBRARY[k].forEach(x=>{ total++; if(x.cue) withCue++; }));
  const find=n=>{ let r=null; Object.keys(EX_LIBRARY).forEach(k=>EX_LIBRARY[k].forEach(x=>{
    if(canonEx(x.name)===canonEx(n)) r=k+' :: '+x.name+' :: '+(x.cue||'(no cue)'); })); return r||'MISSING'; };
  return 'movements: '+total+'   carrying a cue: '+withCue+'\n'+
    ['Chest Supported Dumbbell Row','Pallof Press','Good Morning','Reverse Wrist Curl',
     'Romanian Deadlift','Dumbbell RDL','Barbell Bench Press','Hip Abduction Machine']
     .map(n=>'  '+n.padEnd(30)+' -> '+find(n)).join('\n');
}));
await b.close();
