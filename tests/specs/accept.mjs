/* Does accepting a weight — up or down — write to the plan? */
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
  const N="Leg Extension"; const out=[];
  const plan = ()=> findProgramEntry(N).weight;
  const reset = w =>{ S.program[DAYS[0]]=[{name:N,sets:3,reps:"10-15",weight:String(w),rest:90}];
                      S.sessions=[]; S.planLog=[]; save(); };

  reset(45);
  out.push('ACCEPTING A RAISE');
  out.push('   plan before: '+plan());
  applyProgression(N, 50, null, "double progression");
  out.push('   plan after : '+plan()+'   history: '+(S.planLog[0]||{}).changes);

  reset(85);
  out.push('\nACCEPTING A DROP (the "load is wrong here" card)');
  out.push('   plan before: '+plan());
  applyProgression(N, 70, null, "prescription unreachable");
  out.push('   plan after : '+plan()+'   history: '+(S.planLog[0]||{}).changes);

  reset(45);
  out.push('\nAND WHAT HAS NOTHING TO ACCEPT — you worked above the plan');
  out.push('   but did not clear the top of the rep range');
  const entry={name:N, reps:"10-15", sets:[{weight:"55",reps:"12",rpe:"8",done:true}]};
  S.sessions=[{id:"s1", date:dayStr(Date.now()-3*86400e3), workoutId:DAYS[0],
    startedAt:Date.now()-3*86400e3, finishedAt:Date.now()-3*86400e3+3e6, entries:[entry]}];
  save();
  const v = progressionFor({id:"g",date:todayStr(),workoutId:DAYS[0],startedAt:1,finishedAt:2,entries:[entry]}, entry);
  out.push('   plan       : '+plan()+',  you lifted 55');
  out.push('   grade card : '+(v?v.kind+' — '+v.msg:'(nothing)'));
  out.push('   anything to accept? '+((v&&v.kind==="up")?'yes':'NO — and that is the hole'));
  return out.join('\n');
}));
await b.close();
