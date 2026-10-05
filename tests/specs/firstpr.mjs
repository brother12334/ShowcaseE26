/* No records on a movement's first session — live badges or the finish sweep — and
   records exactly as before once a previous session exists. */
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
  const out=[], errs=[];
  const NEW="Chest Supported T-Bar Row", OLD="Barbell Bench Press";
  const mkSets = rows => rows.map(([w,r])=>({weight:String(w), reps:String(r), rpe:"8", done:true, rest:120}));
  const sess = (id, name, rows, daysAgo)=>({id, date:dayStr(Date.now()-daysAgo*86400e3), workoutId:DAYS[0],
    startedAt:Date.now()-daysAgo*86400e3, finishedAt:Date.now()-daysAgo*86400e3+3e6, feel:3,
    entries:[{name, sets:mkSets(rows)}]});

  // ---------- 1. the finish sweep on a first-ever exercise ----------
  S.sessions=[]; save();
  const s1 = sess("t1", NEW, [[30,10],[35,10],[45,10]], 0);
  sweepSessionPRs(s1);
  const got1 = s1.entries[0].sets.map(x=>x.pr||'-');
  out.push('FIRST EVER SESSION, working up 30 -> 35 -> 45');
  out.push('   badges: ['+got1.join(', ')+']');
  if(got1.some(x=>x!=='-')) errs.push('records awarded on a first-ever session');

  // ---------- 2. the same numbers, with one previous session on the board ----------
  S.sessions=[sess("hist", NEW, [[30,10],[30,10]], 7)]; save();
  const s2 = sess("t2", NEW, [[30,10],[35,10],[45,10]], 0);
  sweepSessionPRs(s2);
  const got2 = s2.entries[0].sets.map(x=>x.pr||'-');
  out.push('\nSAME NUMBERS, ONE PREVIOUS SESSION ON THE BOARD');
  out.push('   badges: ['+got2.join(', ')+']');
  if(!got2.some(x=>x!=='-')) errs.push('records suppressed even with history');

  // ---------- 3. the LIVE check, mid-session, on a first-ever exercise ----------
  S.sessions=[]; save();
  S.active={id:"live", workoutId:DAYS[0], date:todayStr(), startedAt:Date.now(),
            entries:[{name:NEW, sets:mkSets([[30,10],[35,10],[45,10]])}]};
  const live1 = S.active.entries[0].sets.map((_,j)=>detectPR(NEW, S.active.entries[0].sets[j], 0, j)||'-');
  out.push('\nLIVE, MID-SESSION, FIRST EVER');
  out.push('   detectPR per set: ['+live1.join(', ')+']');
  if(live1.some(x=>x!=='-')) errs.push('live PR fired on a first-ever exercise');

  // ---------- 4. the LIVE check with history ----------
  S.sessions=[sess("hist2", NEW, [[30,10],[30,10]], 7)]; save();
  const live2 = S.active.entries[0].sets.map((_,j)=>detectPR(NEW, S.active.entries[0].sets[j], 0, j)||'-');
  out.push('\nLIVE, WITH ONE PREVIOUS SESSION');
  out.push('   detectPR per set: ['+live2.join(', ')+']');
  if(!live2.some(x=>x!=='-')) errs.push('live PR suppressed even with history');

  // ---------- 5. a swap: the movement you replaced does not lend its records ----------
  S.sessions=[sess("hist3", OLD, [[100,8],[100,8]], 7)]; save();
  const s5 = sess("t5", NEW, [[30,10],[45,10]], 0);
  sweepSessionPRs(s5);
  const got5 = s5.entries[0].sets.map(x=>x.pr||'-');
  out.push('\nSWAPPED IN — history exists, but for the OTHER movement');
  out.push('   badges: ['+got5.join(', ')+']');
  if(got5.some(x=>x!=='-')) errs.push('records awarded off another movement\'s history');

  // ---------- 6. a bodyweight first session ----------
  S.sessions=[]; save();
  const s6 = {id:"t6", date:todayStr(), workoutId:DAYS[0], startedAt:Date.now(), finishedAt:Date.now(),
    entries:[{name:"Chest Dips", sets:[{weight:"",reps:"8",done:true},{weight:"",reps:"12",done:true}]}]};
  sweepSessionPRs(s6);
  const got6 = s6.entries[0].sets.map(x=>x.pr||'-');
  out.push('\nBODYWEIGHT, FIRST EVER, 8 then 12 reps');
  out.push('   badges: ['+got6.join(', ')+']');
  if(got6.some(x=>x!=='-')) errs.push('bodyweight rep PR awarded on a first session');

  out.push('\nerrors: '+(errs.length?JSON.stringify(errs,null,1):'[] PASS'));
  return out.join('\n');
}));
await b.close();
