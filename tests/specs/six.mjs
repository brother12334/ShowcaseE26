import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
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

console.log('2 · ZOOM');
console.log('  ', await p.evaluate(()=>({
  viewport: document.querySelector('meta[name=viewport]').content,
  bodyTouchAction: getComputedStyle(document.body).touchAction
})));

console.log('\n3 · UNILATERAL WARM-UP');
console.log('  ', await p.evaluate(()=>{
  const bi = {name:"Barbell Bench Press", sets:[{},{},{}], reps:"6-10"};
  const un = {name:"Dumbbell Bulgarian Split Squat", sets:[{},{},{}], reps:"8-12", startSide:"L", altStyle:"side"};
  const ctx = {workoutId: ROTATION[0], anyDay:false, occ:0};
  return {
    bilateralRungs: warmupPlan(bi, "full", ctx).length,
    unilateralRungs: warmupPlan(un, "full", ctx).length,
    unilateralIsUni: !!altStyle(un),
    noteSaysEachSide: /each side/.test(warmupHTML(un, "full", ctx)),
    bilateralNoteClean: !/each side/.test(warmupHTML(bi, "full", ctx))
  };
}));

console.log('\n4 · AN EXERCISE NOTE ABSORBS THE SET NOTES THAT REPEAT IT');
console.log('  ', await p.evaluate(()=>{
  startWorkout(ROTATION[0]); const a=S.active; const en=a.entries[0];
  while(en.sets.length < 3) en.sets.push({});
  // the same note on two sets, plus a different one on a third
  en.sets[0].noteCode="form"; en.sets[0].unote="form fell off";
  addExNote({ex:en.name, code:"form", text:"form fell off", set:0, sessionId:a.id, workoutId:a.workoutId});
  en.sets[1].noteCode="form"; en.sets[1].unote="form fell off";
  addExNote({ex:en.name, code:"form", text:"form fell off", set:1, sessionId:a.id, workoutId:a.workoutId});
  en.sets[2].noteCode="form"; en.sets[2].unote="something else entirely";
  addExNote({ex:en.name, code:"form", text:"something else entirely", set:2, sessionId:a.id, workoutId:a.workoutId});
  save();
  const before = {onSets: en.sets.filter(x=>x.unote).length, inLog: notesForSession(a.id).length};
  // now the same note for the whole exercise
  openExNote(0, null);
  const m=document.getElementById('modal');
  const chip=m.querySelector('[data-exnk="form"]'); if(chip) chip.click();
  m.querySelector('#exNoteText').value = "form fell off";
  m.querySelector('#exNoteSave').click();
  const after = {onSets: en.sets.filter(x=>x.unote).length,
                 remaining: en.sets.map(x=>x.unote||null),
                 exerciseNote: en.unote || null,
                 inLog: notesForSession(a.id).map(n=> (n.set==null?'ALL':'set'+(n.set+1))+': '+n.text)};
  return {before, after};
}));

console.log('\n6 · PLATE LINE INSIDE A SUPERSET');
console.log('  ', await p.evaluate(()=>{
  const a=S.active;
  a.entries=a.entries.slice(0,3);
  a.entries[0].name="Barbell Bench Press"; a.entries[1].name="Barbell Row"; a.entries[2].name="Barbell Overhead Press";
  a.entries.forEach(e=> e.sets.forEach(s=> s.weight="135"));
  a.entries[1].superset = true;
  save(); render();
  return {platesLines: document.querySelectorAll('#app .plate-line').length,
          inSupersetCard: document.querySelectorAll('#app .ss-group .plate-line').length};
}));

console.log('\nerrors:', errs);
await b.close();
