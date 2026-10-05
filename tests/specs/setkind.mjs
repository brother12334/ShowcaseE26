import { chromium, APP_URL, shot, shotDir, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:900}, deviceScaleFactor:2});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} document.body.classList.remove('ai-open','onboarding'); hideModal();
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off';
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, barMode:'plates', plateStep:2.5});
  S.sleepAsked=todayStr(); save();
});
const D=shotDir();
await p.evaluate(()=>{ S.splitId=DEFAULT_SPLIT; applySplit(); startWorkout(ROTATION[0]); PF=null; TAB="workout"; save(); render(); });
await p.waitForTimeout(500);
console.log('1 · THE ROW HAS TWO BUTTONS AGAIN');
console.log('  ', await p.evaluate(()=>[...document.querySelectorAll('#app .card')[1].querySelectorAll('.btn.ghost.small')].map(b=>b.textContent.trim())));

console.log('\n2 · "+ SET" ASKS WHAT KIND');
await p.evaluate(()=>openAddSetMenu(document.querySelector('[data-addset]'), parseInt(document.querySelector('[data-addset]').dataset.addset,10)));
await p.waitForTimeout(400);
console.log(await p.evaluate(()=>document.getElementById('modal').innerText));
await p.screenshot({path:D+'setkind.png'});

console.log('\n3 · A NORMAL SET IS STILL A NORMAL SET');
const n0 = await p.evaluate(()=>S.active.entries[0].sets.length);
await p.evaluate(()=>document.querySelector('[data-ddk=""]').onclick());
await p.waitForTimeout(400);
console.log('  ', JSON.stringify(await p.evaluate(()=>{
  const en=S.active.entries[0], i=en.sets.length-1;
  return {added: en.sets.length, last: en.sets[i], tech: setTechOf(en, i), gov: setGovernor(en, i),
          tag: setPrescription(en, i).techLabel || ""};
}), null, 0), '| was', n0);

console.log('\n4 · PARTIALS');
await p.evaluate(()=>{ openAddSetMenu(document.querySelector('[data-addset]'), parseInt(document.querySelector('[data-addset]').dataset.addset,10)); });
await p.waitForTimeout(300);
await p.evaluate(()=>document.querySelector('[data-ddk="lengthened"]').onclick());
await p.waitForTimeout(400);
console.log('  ', JSON.stringify(await p.evaluate(()=>{
  const en=S.active.entries[0], i=en.sets.length-1;
  return {last: en.sets[i], tech: setTechOf(en, i), gov: setGovernor(en, i),
          tag: setPrescription(en, i).techLabel, where: setPrescription(en, i).lpWhere};
}), null, 0));

console.log('\n5 · HARD-SET KINDS CHANGE WHAT THE ROW ASKS FOR');
for(const k of ["failure","amrap"]){
  await p.evaluate(()=>{ openAddSetMenu(document.querySelector('[data-addset]'), parseInt(document.querySelector('[data-addset]').dataset.addset,10)); });
  await p.waitForTimeout(250);
  await p.evaluate(kk=>document.querySelector(`[data-ddk="${kk}"]`).onclick(), k);
  await p.waitForTimeout(350);
  console.log('  ', k, JSON.stringify(await p.evaluate(()=>{
    const en=S.active.entries[0], i=en.sets.length-1, rx=setPrescription(en, i);
    return {tech: setTechOf(en, i), label: rx.techLabel, reps: rx.reps, rpe: rx.rpe};
  })));
}

console.log('\n6 · A LEGACY SET MARKED WITH THE OLD BOOLEAN STILL READS');
console.log('  ', JSON.stringify(await p.evaluate(()=>{
  const en=S.active.entries[0];
  en.sets.push({weight:"",reps:"",rpe:"",done:false, lp:true});
  const i=en.sets.length-1;
  return {tech: setTechOf(en, i), gov: setGovernor(en, i), label: setPrescription(en,i).techLabel};
}), null, 0));

console.log('\n7 · AND A MOVEMENT ALREADY ALL PARTIALS DOES NOT OFFER IT');
console.log('  ', JSON.stringify(await p.evaluate(()=>{
  const en=S.active.entries[0];
  en.tech=[{k:"lengthened", all:true}];
  return setKindOptions(en).map(o=>o.t);
})));
console.log('\nerrors:', errs);
await b.close();
