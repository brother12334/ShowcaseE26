/* The kit has to reach the arithmetic, not just the settings screen. */
import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:900}});
p.on('pageerror',e=>console.log('ERR',e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{localStorage.clear();
 localStorage.setItem('e26.account',JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'F',createdAt:1,cloud:false,ns:''}));
 localStorage.setItem('e26.ns0','E26-X');});
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>typeof S!=='undefined'&&!!S);
console.log(await p.evaluate(()=>{
  S.setup={name:"F",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.prefs=Object.assign({},S.prefs,{barMode:"total",barWeight:45,dbStep:5,dbMax:null,plateStep:2.5,plates:null});
  S.gyms=[{id:"g1",name:"Home gym",spots:[{lat:1,lon:1}],bar:45,smith:null,dbStep:5,dbMax:null,plateStep:2.5,plates:null},
          {id:"g2",name:"Hotel gym",spots:[{lat:2,lon:2}],bar:45,smith:null,dbStep:2.5,dbMax:50,plateStep:5,plates:[45,25,10,5]}];
  const out=[];
  const show = label =>{
    const p2=trainPrefs();
    out.push(label+
      '\n    dbStep '+p2.dbStep+'  dbMax '+p2.dbMax+'  plateStep '+p2.plateStep+'  plates '+JSON.stringify(p2.plates)+
      '\n    a 47 lb dumbbell suggestion  -> '+roundLoadable(47,"Dumbbell Bench Press")+
      '\n    a 62 lb dumbbell suggestion  -> '+roundLoadable(62,"Dumbbell Bench Press")+
      '\n    205 on the bar (a 35 helps)  -> '+(plateLine(205,"Barbell Bench Press")||'(nothing to say)')+
      '\n    140 on the bar (needs a 2.5) -> '+(plateLine(140,"Barbell Bench Press")||'(nothing to say)'));
  };
  applyGymGear(gymById("g1")); show('AT THE HOME GYM (5 lb dumbbells to anything, 2.5 lb plates)');
  applyGymGear(gymById("g2")); show('\nAT THE HOTEL (2.5 lb dumbbells, rack ends at 50, no 35s or 2.5s)');
  applyGymGear(gymById("g1")); show('\nBACK HOME — the hotel settings must not follow you');
  return out.join('\n');
}));
await b.close();
