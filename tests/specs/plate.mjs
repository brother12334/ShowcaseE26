import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b=await chromium.launch(); const p=await b.newPage();
p.on('pageerror',e=>console.log('ERR',e.message));
await p.addInitScript(()=>{localStorage.clear();
 localStorage.setItem('e26.account',JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'F',createdAt:1,cloud:false,ns:''}));
 localStorage.setItem('e26.ns0','E26-X');});
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>typeof S!=='undefined'&&!!S);
console.log(await p.evaluate(()=>
 ['Plate Neck Curl','Neck Harness Extension','Banded Neck Flexion','Copenhagen Plank',
  'Farmer\'s Walk','Barbell Wrist Curl','Back Squat','Neck Bridge','Wrist Roller']
  .map(n=>n.padEnd(24)+' gear='+String(libraryGearFor(n)).padEnd(11)+
     ' load='+loadNeededFor({name:n})+'  plateline="'+plateLine(45,n)+'"').join('\n')));
await b.close();
