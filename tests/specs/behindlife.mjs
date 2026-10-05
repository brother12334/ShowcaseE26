/* When does the PLAN IS BEHIND line clear? And does its promise hold? */
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
  const N="Cable Lateral Raise";
  const out=[];
  const run=(label, planW, rows)=>{
    S.program[DAYS[0]]=[{name:N, sets:3, reps:"8-12", weight:String(planW), rest:90}];
    const entry={name:N, reps:"8-12", sets:rows.map(([w,r,rpe])=>
      ({weight:String(w),reps:String(r),rpe:String(rpe),done:true}))};
    S.sessions=[{id:"s1", date:dayStr(Date.now()-3*86400e3), workoutId:DAYS[0],
      startedAt:Date.now()-3*86400e3, finishedAt:Date.now()-3*86400e3+3e6, entries:[entry]}];
    S.active={id:"live", workoutId:DAYS[0], date:todayStr(), startedAt:Date.now(), entries:[{name:N}]};
    save();
    const html = planBehindLineHTML({name:N});
    const line = /plan is behind/i.test(html);
    const claimsRaise = /raise waiting/i.test(html);
    const hasButton = /data-plancatch=/.test(html);
    const sess={id:"g", date:dayStr(Date.now()-3*86400e3), workoutId:DAYS[0],
      startedAt:1, finishedAt:2, entries:[entry]};
    const v = progressionFor(sess, entry);
    out.push(label+
      '\n     line shows : '+(line?'YES':'no')+
      '\n     verdict    : '+(v ? v.kind+' — '+v.msg : '(none)')+
      (line ? '\n     says a raise is waiting : '+(claimsRaise?'yes':'no')+
              '\n     offers the correction  : '+(hasButton?'yes':'NO  <-- missing') : '') +
      /* The contract: it may only claim a raise is waiting when one really is, and it
         must always offer the catch-up, because that is the way out that always exists. */
      (line && claimsRaise && !(v && v.kind==='up') ? '\n     >>> claims a raise that is not offered' : '') +
      (line && !hasButton ? '\n     >>> no way out of this line at all' : ''));
  };
  run('A. plan 25, last session 32.5 x12 @8  (cleared the top of 8-12)', 25, [[32.5,12,8]]);
  run('B. plan 25, last session 32.5 x10 @8  (in range, NOT the top)',   25, [[32.5,10,8]]);
  run('C. plan 25, last session 32.5 x6  @9  (under the range)',         25, [[32.5,6,9]]);
  run('D. plan 35, last session 32.5 x12 @8  (plan already ahead)',      35, [[32.5,12,8]]);
  return out.join('\n');
}));
await b.close();
