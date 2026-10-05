import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1000}, deviceScaleFactor:2});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});

const start = (prefs)=> p.evaluate((pf)=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding');
  try{AI_IMP=null}catch(e){}
  const af=document.getElementById('aiFull'); if(af) af.hidden=true;
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.flags=[]; S.deload=null;
  S.priorAsked=true;   // the experience question is asked elsewhere; it must not sit on top of this
  S.splitId=DEFAULT_SPLIT; applySplit();
  const wid=ROTATION[0], ex="Barbell Bench Press";
  S.program[wid]=[{name:ex, sets:3, reps:"5", weight:185}];
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, warmups:"auto"}, pf);
  S.sessions=[{id:"s1", workoutId:wid, date:new Date(Date.now()-2*86400e3).toLocaleDateString("en-CA"),
    startedAt:Date.now()-2*86400e3-3600e3, finishedAt:Date.now()-2*86400e3, feel:4,
    entries:[{name:ex, reps:"5", sets:[{weight:"185", reps:"5", rpe:"8", done:true}]}]}];
  if(S.active) S.active=null;
  startWorkout(wid); PF=null; WARM_PL=null;
  const el2=document.getElementById('preflight'); if(el2) el2.remove();
  document.body.classList.remove('pfl-open');
  save(); render();
  const en=S.active.entries[0];
  return {plate: plateLineHTML(en), warm: (en.warm||"")};
}, prefs);

const dom = ()=> p.evaluate(()=>({
  gap: !!document.querySelector('.plate-gap'),
  row: !!document.querySelector(".plate-line .pl-art"),
  txt: (document.querySelector('.plate-line')||{}).innerText || "",
  rungs: document.querySelectorAll('[data-warmpl]').length,
  panel: (document.querySelector('.warm-pl')||{}).innerText || "",
  ticked: (()=>{ const en=S.active.entries[0]; return (en.warmDone||[]).filter(Boolean).length; })()
}));

let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

console.log("1 - THE SHIPPED DEFAULTS NO LONGER GO QUIET");
await start({barMode:"total", barWeight:null, plateStep:null});
let d = await dom();
ck("a gap line appears", d.gap, JSON.stringify(d));
ck("it says there is no count yet", /No plate count for 185 lb yet/.test(d.txt), d.txt);
ck("the smallest plate can be answered right here",
   await p.evaluate(()=> document.querySelectorAll('[data-plfast]').length > 0), "");
ck("with a way out for the rest", await p.evaluate(()=> !!document.querySelector('[data-platefix]')), "");

console.log("1b - AND IT SAYS WHAT IT ALREADY KNOWS, AND WHAT IT STILL NEEDS");
await start({barMode:"total", barWeight:null, plateStep:2.5});
d = await dom();
ck("it credits the plates", /plates from 2\.5 lb is set/.test(d.txt), d.txt);
ck("and names the bar as the thing missing", /still needs what your bar weighs/.test(d.txt), d.txt);

console.log("2 - THE BUTTON GOES WHERE THE SETTING IS");
await p.click('[data-platefix]');
ck("lands on the page the kit is set up on", await p.evaluate(()=> TAB==="sync" && SET_PAGE==="where"),
   await p.evaluate(()=> TAB+"/"+SET_PAGE));

console.log("3 - SET UP PROPERLY, THE CALCULATOR IS BACK");
await start({barMode:"total", barWeight:45, plateStep:2.5});
d = await dom();
ck("no gap line", !d.gap, d.txt);
ck("the drawing is there", d.row, JSON.stringify(d));
ck("and the count is right", /45 lb bar \+ 45 \+ 25 a side/.test(d.txt), d.txt);

console.log("4 - PLATES-ONLY NEEDS NO BAR WEIGHT");
await start({barMode:"plates", barWeight:null, plateStep:2.5});
d = await dom();
ck("no gap line", !d.gap, d.txt);
ck("it still counts", /a side/.test(d.txt), d.txt);

console.log("5 - HOLD A WARM-UP RUNG FOR ITS PLATES");
await start({barMode:"total", barWeight:45, plateStep:2.5});
d = await dom();
ck("the rungs are holdable", d.rungs > 0, JSON.stringify(d));
ck("nothing open to begin with", d.panel==="", d.panel);
{
  const el = await p.$('[data-warmpl]');
  const box = await el.boundingBox();
  await p.mouse.move(box.x+box.width/2, box.y+box.height/2);
  await p.mouse.down(); await p.waitForTimeout(700); await p.mouse.up();
  d = await dom();
  ck("the panel opens", /a side/.test(d.panel), d.panel);
  ck("and it did not also tick the rung", d.ticked===0, String(d.ticked));
}

console.log("6 - A PLAIN TAP STILL TICKS IT OFF");
{
  const el = await p.$('[data-warmtick]');
  await el.click();
  d = await dom();
  ck("ticked", d.ticked===1, String(d.ticked));
}

console.log(errs.length? "  BROKEN page errors :: "+errs.join(" | ") : "  ok  no page errors");
if(errs.length) bad++;
console.log(bad? ("  "+bad+" broken") : "  all good");
await b.close();
