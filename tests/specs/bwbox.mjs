import { chromium, APP_URL } from './_e26.mjs';
/* "I DON'T LIKE HOW IT SAYS LIKE THE FULL WEIGHT IS LONG AND CONFUSING, MAYBE IT SHOULD
   SAY bw+" — with the weight boxes circled, holding 169.8 and clipped to "169.".

   The box now asks for the one number you choose: what is in your hands. A fixed bw+
   sits in front of it saying so. What the SET stores is unchanged — you plus that —
   because the total is the load the leg is under and every figure in this app is
   computed from it. This spec is about that line not being crossed in either
   direction. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1200}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };
const boot = (name, weight)=> p.evaluate(a=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, warmups:'off', dbStep:5});
  S.bodyLog={[todayStr()]:{w:139.8}};
  S.splitId=DEFAULT_SPLIT; applySplit();
  const wid=ROTATION[0];
  S.program[wid]=[{name:a.name, sets:3, reps:"8-12", weight:a.weight}];
  save(); S.active=null; startWorkout(wid); PF=null; TAB="workout"; save();
  const el=document.getElementById('preflight'); if(el) el.remove(); try{PF=null}catch(e){}
  S.active.entries[0].bwOn=139.8; save(); render();
}, {name, weight});
const box = ()=> p.evaluate(()=>{
  const inp=document.querySelector('.set input[data-f="weight"]');
  const pre=document.querySelector('.set .wx-pre');
  return {val: inp ? inp.value : null, ph: inp ? inp.placeholder : null,
          add: inp ? (inp.dataset.bwadd || null) : null,
          pre: pre ? pre.textContent : null,
          fits: inp ? inp.scrollWidth <= inp.clientWidth + 1 : null};
});

console.log("1 - THE BOX ASKS FOR WHAT IS IN YOUR HANDS");
await boot("Dumbbell Bulgarian Split Squat", 169.8);
{
  const r = await box();
  console.log("   ", JSON.stringify(r));
  ck("a bw+ sits in front of it", r.pre === "bw+", String(r.pre));
  ck("and the box offers 30, not 169.8", r.ph === "30", r.ph);
  ck("it knows what to add back", r.add === "139.8", String(r.add));
  ck("and the number fits the box it is in", r.fits, String(r.fits));
}

console.log("\n2 - AND WHAT IT STORES IS STILL THE WHOLE LOAD");
{
  const r = await p.evaluate(async ()=>{
    const inp=document.querySelector('.set input[data-f="weight"]');
    inp.value = "30"; inp.dispatchEvent(new Event('change', {bubbles:true}));
    await new Promise(r2=> setTimeout(r2, 150));
    const st = S.active.entries[0].sets[0];
    return {stored: st.weight, shown: document.querySelector('.set input[data-f="weight"]').value};
  });
  console.log("   ", JSON.stringify(r));
  ck("typing 30 stores you plus 30", r.stored === "169.8", String(r.stored));
  ck("while the box still reads 30", r.shown === "30", String(r.shown));
}

console.log("\n3 - A REDRAW PUTS THE SAME NUMBER BACK, NOT THE TOTAL");
{
  const r = await p.evaluate(()=>{ render();
    const inp=document.querySelector('.set input[data-f="weight"]');
    return {val: inp.value, stored: S.active.entries[0].sets[0].weight}; });
  console.log("   ", JSON.stringify(r));
  ck("the box reads 30 after a redraw", r.val === "30", r.val);
  ck("and the set still holds 169.8", r.stored === "169.8", r.stored);
  const vol = await p.evaluate(()=>{
    const st=S.active.entries[0].sets[0]; st.reps="10";
    return parseFloat(st.weight) * parseFloat(st.reps); });
  ck("so volume is still computed from the whole load", vol === 1698, String(vol));
}

console.log("\n4 - AN EMPTY BOX IS STILL AN EMPTY SET");
{
  const r = await p.evaluate(async ()=>{
    const inp=document.querySelector('.set input[data-f="weight"]');
    inp.value = ""; inp.dispatchEvent(new Event('change', {bubbles:true}));
    await new Promise(r2=> setTimeout(r2, 150));
    return {stored: S.active.entries[0].sets[0].weight};
  });
  ck("blank does not become your bodyweight", r.stored === "", JSON.stringify(r.stored));
}

console.log("\n5 - ASSISTED WORK KEEPS THE OLD BOX");
/* A counterweighted pull-up really is your weight MINUS the machine, so "bw+" in front
   of its box would be a lie and a negative number after it is not something to type. */
await boot("Assisted Pull Up", 100);
{
  const r = await box();
  console.log("   ", JSON.stringify(r));
  ck("no bw+ on an assisted movement", r.pre === null, String(r.pre));
  ck("and the box is the plain total", r.add === null && r.ph === "100",
     JSON.stringify({add: r.add, ph: r.ph}));
}

console.log("\n6 - AND AN ORDINARY LIFT IS UNTOUCHED");
await p.evaluate(()=>{
  const wid=ROTATION[0];
  S.program[wid]=[{name:"Barbell Bench Press", sets:3, reps:"8-12", weight:185}];
  save(); S.active=null; startWorkout(wid); PF=null;
  const el=document.getElementById('preflight'); if(el) el.remove(); try{PF=null}catch(e){}
  render();
});
{
  const r = await box();
  console.log("   ", JSON.stringify(r));
  ck("no prefix, no conversion, 185 in the box", r.pre === null && r.add === null && r.ph === "185",
     JSON.stringify(r));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
