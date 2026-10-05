import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1100}, deviceScaleFactor:2});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X');
  // an older install that had picked the rolling week and set a manual level
  localStorage.setItem('ironlog.v1.E26-X', JSON.stringify({volWindow:'week', experience:'advanced'}));
});
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} const f=document.getElementById('aiFull'); if(f){f.hidden=true;f.style.display='none';}
  document.body.classList.remove('ai-open','onboarding'); hideModal();
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; let i=0;
  for(let d=14; d>=1; d--){ if(d%3===2) continue;
    const wid=ROTATION[(i++)%ROTATION.length]; const prog=(S.program[wid]||[]).slice(0,4);
    S.sessions.push({id:"s"+d, date:dayStr(Date.now()-d*86400e3), workoutId:wid,
      startedAt:Date.now()-d*86400e3, finishedAt:Date.now()-d*86400e3+3300e3, feel:3,
      entries: prog.map((e,k)=>({name:e.name, sets:[0,1,2].map(()=>({weight:String(100+k*15), reps:"9", rpe:"8", done:true, rest:120}))}))}); }
  save();
});

console.log('1-4 · ALL FOUR GONE FROM EVERY SETTINGS PAGE');
console.log('  ', await p.evaluate(()=>{
  const hits={};
  setGroups().forEach(g=>{ TAB='sync'; SET_PAGE=g.k; render();
    const t=document.getElementById('app').innerText;
    const f=[];
    if(/What you.{0,3}re training for/i.test(t)) f.push('goal');
    if(/Change the schedule/i.test(t)) f.push('schedule');
    if(/a .{0,3}week.{0,3} means/i.test(t)) f.push('volWindow');
    if(/Your training experience/i.test(t)) f.push('experience');
    if(f.length) hits[g.k]=f;
  });
  return Object.keys(hits).length ? hits : 'none of the four appear anywhere in Settings'; }));

console.log('\n   plan page now holds:', await p.evaluate(()=>{
  TAB='sync'; SET_PAGE='plan'; render();
  return {blocks:[...document.querySelectorAll('.set-name')].map(x=>x.textContent.trim()),
          height:Math.round(document.querySelector('#app .card').getBoundingClientRect().height)}; }));
console.log('   plan row reads:', await p.evaluate(()=>{
  const g=setGroups().find(x=>x.k==='plan'); return {title:g.title, sub:g.sub, val:g.val}; }));

console.log('\n2 · THE PROGRAM TAB BUILDS A PLAN RATHER THAN PICKING A SPLIT');
/* "Change the schedule" was removed in phase 5: it opened a picker of five named splits,
   which answers a question nobody arrives with. The builder asks what the week is like
   and writes one. openSplitEditor/switchSplit stay in the file, unbound. */
console.log('  ', await p.evaluate(()=>{
  goTab('program'); render();
  return {gone: !document.getElementById('setupSplit'),
          build: !!document.getElementById('buildPlanBtn'),
          importB: !!document.getElementById('aiImportBtn'),
          kept: typeof openSplitEditor === 'function' && typeof switchSplit === 'function'}; }));
console.log('   and the builder opens from it:', await p.evaluate(()=>{
  document.getElementById('buildPlanBtn').click();
  const open = !document.getElementById('buildFull').hidden;
  const q = (document.querySelector('#buildFullIn .spec-steps')||{}).textContent || '';
  closeBuildPage();
  return {open, q}; }));

console.log('\n3 · VOLUME WINDOW IS ALWAYS THE CYCLE (stale "week" ignored)');
console.log('  ', await p.evaluate(()=>{
  const raw=JSON.parse(localStorage.getItem('ironlog.v1.E26-X')||'{}');
  S.cycleStart = Date.now() - 5*86400e3;          // a cycle with real training in it
  const w = volWindowInfo(Date.now());
  return {storedBefore:'week', stillStoredAfterMigrate:'volWindow' in raw,
          mode:w.mode, label:w.label}; }));
console.log('   falls back to the week when the cycle cannot be read:', await p.evaluate(()=>{
  const keep=S.cycleStart; S.cycleStart=Date.now();          // brand new cycle, nothing in it
  const m=volWindowInfo(Date.now()).mode; S.cycleStart=keep; return m; }));

console.log('\n4 · EXPERIENCE IS INFERRED, NOT SET');
console.log('  ', await p.evaluate(()=>{
  const out={manualAdvancedIgnored:null};
  out.reads=experience();
  out.infer=inferExperience();
  out.matchesInference = experience()===inferExperience();
  out.hasOverrideFn = typeof experienceIsAuto;
  // stated level seeds the gap, log wins once it can judge
  S.experience='advanced'; const seeded=experience();
  const first=S.sessions[0].startedAt; S.sessions[0].startedAt=Date.now()-200*7*86400e3;
  const judged=experience(); S.sessions[0].startedAt=first;
  return Object.assign(out,{seededWhileYoung:seeded, judgedOnceOldEnough:judged}); }));

console.log('\nerrors:', errs);
await b.close();
