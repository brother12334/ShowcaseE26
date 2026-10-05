import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b=await chromium.launch(); const p=await b.newPage();
p.on('pageerror',e=>console.log('ERR',e.message));
await p.addInitScript(()=>{localStorage.clear();
 localStorage.setItem('e26.account',JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'F',createdAt:1,cloud:false,ns:''}));
 localStorage.setItem('e26.ns0','E26-X');});
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>typeof S!=='undefined'&&!!S);
console.log(await p.evaluate(()=>
 ['Weighted Chest Dips','Weighted Chest Dip','Chest Dips','Chest Dip','Weighted Dip','Weighted Dips',
  'Pull-Ups','Pull-Up','Push-Ups','Weighted Pull-Ups','Dips','Sit-Ups','Leg Raises','Planks',
  'Bench Press','Leg Press','Barbell Row']
  .map(n=>n.padEnd(22)+
    ' loadNeeded='+String(loadNeededFor({name:n})).padEnd(5)+
    ' canEscape(BODYWEIGHT_RE)='+String(BODYWEIGHT_RE.test(n)).padEnd(5)+
    ' gear='+String(libraryGearFor(n))).join('\n')));
await b.close();
