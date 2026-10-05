/* The weaker-side banner must stay silent on a movement you have never done, and must
   still speak in every case where a reading is on its way or already in. */
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
  const NAME = "Cable Lateral Raise";
  const en = ()=>({name:NAME, sets:[{},{},{}], altStyle:"side", startSide:"R",
                   sideMode:"matchWeaker", uni:true});
  const strip = h => String(h).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  const out = [];
  const errs = [];
  const shot = label =>{
    const st = sideStats(NAME);
    out.push(label+'\n   sessions=' + st.sessions + '  ok=' + st.ok +
      (st.reason ? '  reason="'+st.reason+'"' : '') +
      '\n   banner: ' + (strip(asymHintHTML(en())) || '(silent)'));
    return strip(asymHintHTML(en()));
  };
  const mk = (day, sets)=>({id:"s"+day, date:dayStr(Date.now()-day*86400e3), workoutId:DAYS[0],
    startedAt:Date.now()-day*86400e3, finishedAt:Date.now()-day*86400e3+3e6, feel:3,
    entries:[{name:NAME, startSide:sets.side, altStyle:"side",
      sets:sets.reps.map(r=>({weight:"15", reps:String(r), rpe:"8", done:true, rest:60}))}]});

  out.push('THE REPORTED CASE — swapped in, never done');
  if(shot('   (no sessions at all)')) errs.push('banner shown on a movement with no history');

  out.push('\nONE SESSION, OPENING SIDE HAS NOT FLIPPED');
  S.sessions=[mk(6,{side:"R", reps:[12,11,12]})]; save();
  if(!shot('   ')) errs.push('banner went silent once a session existed');

  out.push('\nBOTH SIDES LOGGED ACROSS A BALANCED WINDOW');
  S.sessions=[mk(10,{side:"R", reps:[14,13,14]}), mk(6,{side:"L", reps:[9,8,9]})]; save();
  if(!shot('   ')) errs.push('banner went silent with a readable gap');

  out.push('\nSIDES LEVEL');
  S.sessions=[mk(10,{side:"R", reps:[12,12,12]}), mk(6,{side:"L", reps:[12,12,12]})]; save();
  shot('   ');
  out.push('\nerrors: ' + (errs.length ? JSON.stringify(errs) : '[] PASS'));
  return out.join('\n');
}));
await b.close();
