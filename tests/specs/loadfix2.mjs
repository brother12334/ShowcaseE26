/* The reported case: a session that reached the range and then failed the last set must
   not produce "not reachable, drop two steps". */
import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{localStorage.clear();
 localStorage.setItem('e26.account',JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'F',createdAt:1,cloud:false,ns:''}));
 localStorage.setItem('e26.ns0','E26-X');});
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>typeof S!=='undefined'&&!!S);
await p.evaluate(()=>{ S.setup={name:"F",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; save(); });
const check = (name, target, sets, hist) => p.evaluate(({name,target,sets,hist})=>{
  S.sessions = (hist||[]).map((h,i)=>({id:"h"+i, date: dayStr(Date.now()-(h.days||7)*86400e3),
    workoutId: DAYS[0], startedAt:1, finishedAt:2,
    entries:[{name, sets:h.sets.map(x=>({weight:String(x.w), reps:String(x.r), rpe:String(x.rpe), done:true}))}]}));
  save();
  const en = {name, sets: sets.map(x=>({weight:String(x.w), reps:String(x.r), rpe:String(x.rpe), done:true}))};
  const r = impossibleLoadCheck(Object.assign({name}, target), en, {date: todayStr()});
  if(!r) return 'NO FINDING';
  return {msg:r.msg, fix:r.fix, to:r.to, from:r.from};
}, {name,target,sets,hist});

console.log('THE REPORTED CASE — plan 90 for 6-10; 65x10@7, 70x11@8, 80x7@8.5, 80x4@9.5');
console.log('  ', await check('Incline Smith Machine Bench Press', {weight:90, reps:"6-10"},
  [{w:65,r:10,rpe:7},{w:70,r:11,rpe:8},{w:80,r:7,rpe:8.5},{w:80,r:4,rpe:9.5}]));
console.log('   (set 3 put 7 reps on the board at 80, inside 6-10, so 90 being heavy is');
console.log('    a progression question — not "unreachable, drop to 60")');

console.log('\nGENUINELY UNREACHABLE — nothing in the session ever reached the range');
console.log('  ', await check('Leg Extension', {weight:85, reps:"10-15"},
  [{w:85,r:8,rpe:9.5},{w:85,r:6,rpe:10}]));

console.log('\nUNREACHABLE, BUT 80 WAS WORKED IN RANGE EARLIER THE SAME DAY');
console.log('  ', await check('Leg Extension', {weight:85, reps:"10-15"},
  [{w:80,r:12,rpe:8},{w:85,r:7,rpe:9.5}]));
console.log('   (two steps down off 85 is 75; 80 is proven in range, so the floor lifts it)');

console.log('\nSTILL DROPS PROPERLY WHEN NOTHING IS PROVEN NEAR IT');
console.log('  ', await check('Leg Extension', {weight:85, reps:"10-15"},
  [{w:40,r:20,rpe:6},{w:85,r:7,rpe:9.5}]));

console.log('\nREGRESSION — the old screenshot case, plan 150, overshot at 162.5');
console.log('  ', await check('Cable Ab Crunch', {weight:150, reps:"10-15"},
  [{w:150,r:12,rpe:8},{w:162.5,r:9,rpe:9.5}]));

console.log('\nREGRESSION — a LATER session that got into the range closes a historical flag');
console.log('  ', await check('Leg Extension', {weight:85, reps:"10-15"},
  [], [{days:10, sets:[{w:85,r:8,rpe:9.5}]}, {days:3, sets:[{w:85,r:12,rpe:8}]}]));
console.log('\nAND WITHOUT THAT LATER SUCCESS, THE HISTORICAL FLAG STILL FIRES');
console.log('  ', await check('Leg Extension', {weight:85, reps:"10-15"},
  [], [{days:10, sets:[{w:85,r:8,rpe:9.5}]}]));

// ---- assertions ----
const A=[];
const r1 = await check('Incline Smith Machine Bench Press', {weight:90, reps:"6-10"},
  [{w:65,r:10,rpe:7},{w:70,r:11,rpe:8},{w:80,r:7,rpe:8.5},{w:80,r:4,rpe:9.5}]);
if(r1 !== 'NO FINDING') A.push('the reported case still flags');
const r2 = await check('Leg Extension', {weight:85, reps:"10-15"}, [{w:85,r:8,rpe:9.5},{w:85,r:6,rpe:10}]);
if(r2 === 'NO FINDING') A.push('a genuinely unreachable load stopped flagging');
const r3 = await check('Leg Extension', {weight:85, reps:"10-15"}, [{w:80,r:12,rpe:8},{w:85,r:7,rpe:9.5}]);
if(r3 === 'NO FINDING' || r3.to < 80) A.push('the suggestion went under a weight worked in range');
const r4 = await check('Cable Ab Crunch', {weight:150, reps:"10-15"}, [{w:150,r:12,rpe:8},{w:162.5,r:9,rpe:9.5}]);
if(r4 !== 'NO FINDING') A.push('the overshoot regression came back');
const r5 = await check('Leg Extension', {weight:85, reps:"10-15"}, [],
  [{days:10, sets:[{w:85,r:8,rpe:9.5}]}, {days:3, sets:[{w:85,r:12,rpe:8}]}]);
if(r5 !== 'NO FINDING') A.push('a later in-range session no longer closes the flag');
const r6 = await check('Leg Extension', {weight:85, reps:"10-15"}, [], [{days:10, sets:[{w:85,r:8,rpe:9.5}]}]);
if(r6 === 'NO FINDING') A.push('historical flags stopped firing entirely');
if(r6 !== 'NO FINDING' && !(r6.to < r6.from)) A.push('a "drop" that is not below the plan');
console.log('\nerrors: ' + (A.length ? JSON.stringify(A,null,1) : '[] PASS'));
console.log('page errors:', JSON.stringify(errs));
await b.close();
