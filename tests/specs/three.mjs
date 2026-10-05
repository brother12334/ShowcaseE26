import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:900}});
p.on('pageerror',e=>console.log('ERR',e.message));
let asked=[]; p.on('dialog',d=>{ asked.push(d.message()); d.dismiss(); });
await p.addInitScript(()=>{localStorage.clear();
 localStorage.setItem('e26.account',JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'F',createdAt:1,cloud:false,ns:''}));
 localStorage.setItem('e26.ns0','E26-X');});
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>typeof S!=='undefined'&&!!S);
const setup = ()=>p.evaluate(()=>{
  S.setup={name:"F",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  const N="Leg Extension";
  S.program[DAYS[0]]=[{name:N, sets:3, reps:"10-15", weight:"45", rest:90}];
  S.sessions=[{id:"h", date:dayStr(Date.now()-7*86400e3), workoutId:DAYS[0],
    startedAt:Date.now()-7*86400e3, finishedAt:Date.now()-7*86400e3+3e6,
    entries:[{name:N, sets:[{weight:"45",reps:"12",rpe:"8",done:true}]}]}];
  save();
});
console.log('===== 1. THE TYPO GUARD =====');
await setup();
console.log('  normal nudge 45 -> 50 :', await p.evaluate(()=>applyProgression("Leg Extension",50,null,"test")),
            '| asked:', asked.length);
console.log('  plan now              :', await p.evaluate(()=>findProgramEntry("Leg Extension").weight));
asked=[];
console.log('  fat-finger 45 -> 450  :', await p.evaluate(()=>applyProgression("Leg Extension",450,null,"test")),
            '(false = refused)');
console.log('  it asked              :', asked.length ? '"'+asked[0].replace(/\n+/g,' ')+'"' : 'NOTHING  <-- wrong');
console.log('  plan still            :', await p.evaluate(()=>findProgramEntry("Leg Extension").weight), '(unchanged)');
asked=[];
console.log('  a real doubling 50->110 (new gym):', await p.evaluate(()=>applyProgression("Leg Extension",110,null,"test")));
console.log('    asked first?        :', asked.length ? 'yes, and dismissing refused it' : 'no');
asked=[];
console.log('  brand-new movement, no history, 200:',
  await p.evaluate(()=>{ S.program[DAYS[0]].push({name:"Brand New Thing", sets:3, reps:"8-12"});
    return applyProgression("Brand New Thing",200,null,"test"); }), '(nothing to compare against, so no prompt)');
console.log('    asked               :', asked.length);

console.log('\n===== 2. THE +75 THAT WAS NEVER A RAISE =====');
console.log(await p.evaluate(()=>{
  const N="Cable Face Pull (two D-handles)";
  const raised = Date.now()-3*86400e3;           // the grade that wrote 95
  /* The real sequence: you lift it, THEN the grade moves the plan. So the session that
     settled the number comes before the change, and nothing is logged after it — which is
     also what keeps the chip on screen at all (22.5). */
  const seed = (liftedBefore)=>{
    S.program[DAYS[0]]=[{name:N, sets:3, reps:"15-20", weight:"95", startEst:true,
      byApp:{at:raised, what:"load raised to 95 lb", from:20, to:95, why:null}}];
    S.sessions=[{id:"s0", date:dayStr(Date.now()-9*86400e3), workoutId:DAYS[0],
      startedAt:Date.now()-9*86400e3, finishedAt:Date.now()-9*86400e3+3e6,
      entries:[{name:N, sets:[{weight:String(liftedBefore), reps:"18", rpe:"8", done:true}]}]}];
    save();
  };
  const strip=h=>String(h).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  seed(95);                 // the 20 was only ever a guess
  const a = strip(planChangeLineHTML({name:N}));
  seed(20);                 // the 20 was genuinely lifted, so +75 IS the real story
  const c = strip(planChangeLineHTML({name:N}));
  return '  20 was only ever a guess -> '+(a||'(nothing)')+
       '\n  20 was really lifted     -> '+(c||'(nothing)');
}));
console.log('\n===== 3. SETTINGS SURVIVE A BACKUP =====');
console.log(await p.evaluate(()=>{
  S.pushOn=true; S.pushAsked=true; S.pushNever=false; S.ciAsked=true; S.sleepGuard=12345; save();
  const o=backupObject();
  return ['pushOn','pushAsked','ciAsked','sleepGuard'].map(k=>'  '+k.padEnd(11)+' in backup: '+(k in o)).join('\n')
    + '\n  sync (the gist token) deliberately absent: ' + !('sync' in o);
}));
await b.close();
