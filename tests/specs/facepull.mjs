/* The card in the screenshot: 100x21 @8, 110x16 @9, 110x12 @8.5 against 3x15-20. */
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
  const N="Cable Face Pull (two D-handles)";
  const mk=rows=>({name:N, sets:rows.map(([w,r,rpe])=>({weight:String(w),reps:String(r),rpe:String(rpe),done:true}))});
  const out=[], errs=[];
  const run=(label, rows)=>{
    const sess={id:"s1", date:todayStr(), workoutId:DAYS[0], startedAt:1, finishedAt:2, entries:[mk(rows)]};
    const d=repDropOffs(sess);
    const f=fadeFindings(sess);
    out.push(label+'\n   drops: '+JSON.stringify(d.drops)+
             '\n   finding: '+(f.length ? f[0].msg : 'none'));
    return f;
  };
  let f;
  f = run('THE SCREENSHOT — went UP in weight across the sets', [[100,21,8],[110,16,9],[110,12,8.5]]);
  if(f.length) errs.push('still calls a weight increase a collapse');

  f = run('A GENUINE COLLAPSE AT ONE LOAD', [[110,20,8],[110,14,9],[110,7,10]]);
  if(!f.length) errs.push('a real same-load collapse stopped being found');

  f = run('A DROP SET — last set lighter on purpose', [[110,16,9],[110,14,9],[80,20,8]]);
  if(f.length) errs.push('a drop set is being read as a collapse');

  f = run('BODYWEIGHT, NO LOAD AT ALL', [[0,20,8],[0,14,9],[0,6,10]]);
  if(!f.length) errs.push('bodyweight collapse stopped being found');

  out.push('\nerrors: '+(errs.length?JSON.stringify(errs,null,1):'[] PASS'));
  return out.join('\n');
}));
await b.close();
