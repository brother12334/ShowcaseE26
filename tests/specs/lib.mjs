import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:800}});
p.on('pageerror',e=>console.log('ERR',e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S);
console.log(await p.evaluate(()=>{
  const out=[];
  out.push('table size: '+Object.keys(EX_MUSCLES_C).length+' movements (was '+Object.keys(EX_MUSCLES).length+' hand-written)');
  ['neck curl','plate neck extension','four way neck machine','copenhagen plank','wrist roller',
   'landmine twist','jefferson curl','cable glute kickback','nordic curl','tate press'].forEach(n=>{
    const m=musclesFor(n);
    out.push(n+' -> '+(m?Object.keys(m).map(k=>k+' '+m[k]).join(', '):'MISS'));
  });
  out.push('--- slots ---');
  ['Neck Curl','Plate Neck Curl','Dumbbell Side Bend','Wrist Roller','Copenhagen Plank',
   'Cable Glute Kickback','Jefferson Curl','Barbell Shrug'].forEach(n=>{
    const h=exSlotFor(n); out.push(n+' -> '+(h?h.key:'MISS'));
  });
  out.push('--- swap shortlist for Neck Curl ---');
  const h=exSlotFor('Neck Curl');
  out.push((EX_LIBRARY[h.key]||[]).map(x=>x.name+'('+x.gear+')').join(', '));
  out.push('--- pickExercise per gear tier ---');
  ['full','home','dumbbell','bodyweight'].forEach(g=>{
    const e=pickExercise('neck',g); out.push(g+': '+(e?e.name:'none'));
  });
  out.push('--- fixCandidates ---');
  ['neck','forearms','obliques','adductors','lower_back'].forEach(m=>{
    out.push(m+': '+fixCandidates(m,[],[]).slice(0,5).map(x=>x.name).join(', '));
  });
  out.push('--- autocomplete ---');
  out.push('names: '+exNameIndex().length+'   vocab: '+aiVocabulary().length);
  out.push('search "neck": '+(exSearch?exSearch('neck',8).map(x=>x.name||x.n||JSON.stringify(x)).join(' | '):'n/a'));
  return out.join('\n');
}));
await b.close();
