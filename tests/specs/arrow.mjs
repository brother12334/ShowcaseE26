import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1100}, deviceScaleFactor:2});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
// NOTHING IS CLEARED HERE, BECAUSE THERE IS NOTHING TO CLEAR AND CLEARING IT WAS A TRAP.
// A freshly launched browser's page starts with empty storage, so the clear() that used to
// be here was defensive and redundant. It was also actively harmful: addInitScript runs
// again on the reload below, and the __seeded guard reads the same storage it is meant to
// protect -- on a minority of runs that read comes back empty before the origin's storage
// is attached, the guard passes, and clear() wipes the planLog this spec wrote through
// page.evaluate specifically in order to reload onto it. The symptom is a backfill test
// failing as though the app had lost the log, which it had not.
// Setting the two account keys unconditionally is safe: they are identical every time.
// (Found while chasing the same intermittent failure in research.mjs.)
await p.addInitScript(()=>{
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});

// Build the "before the update" state by writing the disk copy directly — which is
// what an install that predates the byApp stamp actually looks like on disk.
const seeded = await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} document.body.classList.remove('ai-open','onboarding'); hideModal();
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; save();

  const k=dataKey(); const d=JSON.parse(localStorage.getItem(k));
  const wid=Object.keys(d.program)[0]; const prog=d.program[wid];
  const raised=prog[0], cut=prog[1], edited=prog[2], calib=prog[3];
  const D=86400e3, now=Date.now();
  raised.weight=110; cut.weight=90; edited.weight=200; calib.weight=55;
  [raised,cut,edited,calib].forEach(e=>{ delete e.byApp; });
  d.planLog=[
    {at:now-3*D, date:'x', kind:'weight', name:raised.name, changes:['100 lb \u2192 110 lb'],
     note:'Double progression: last set cleared the top of the rep range at target RPE.'},
    {at:now-40*D, date:'x', kind:'weight', name:cut.name, changes:['100 lb \u2192 90 lb'],
     note:'Load reduced to a reachable one for the prescribed rep range.'},
    // the app moved it, then the user typed something else: not ours to claim
    {at:now-2*D, date:'x', kind:'weight', name:edited.name, changes:['150 lb \u2192 160 lb'], note:'x'},
    // a calibration is the user's own number, and has no arrow shape
    {at:now-1*D, date:'x', kind:'weight', name:calib.name, changes:['calibrated to 55 lb'], note:'x'}
  ];
  delete d.byAppBackfill;
  localStorage.setItem(k, JSON.stringify(d));
  return {raised:raised.name, cut:cut.name, edited:edited.name, calib:calib.name, wid};
});

await p.reload({waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});

console.log('STATE AFTER RELOAD:', await p.evaluate(n=>{
  const e=findProgramEntry(n.raised);
  return {marker:S.byAppBackfill, planLog:(S.planLog||[]).length,
          firstRec:(S.planLog||[])[0], weight:e&&e.weight, has:!!e};
}, seeded));
console.log('BACKFILL');
console.log('  ', await p.evaluate(n=>{
  const f=x=>{ const e=findProgramEntry(x); return e && e.byApp
      ? {from:e.byApp.from, to:e.byApp.to, what:e.byApp.what, ageDays:Math.round((Date.now()-e.byApp.at)/86400e3)}
      : 'no stamp'; };
  return {raised:f(n.raised), cutOld:f(n.cut), handEdited:f(n.edited), calibrated:f(n.calib)};
}, seeded));

console.log('\nTHE CHIP ON THE PROGRAM TAB');
console.log('  ', await p.evaluate(n=>{
  const out={};
  [['raised',n.raised],['cutOld',n.cut],['handEdited',n.edited]].forEach(([k,nm])=>{
    const h=planChangeLineHTML({name:nm});
    const m=/class="pc-chip[^"]*"[^>]*>([^<]*)</.exec(h) || /(▲|▼)[^<]*/.exec(h);
    out[k]= h ? (m?m[0].replace(/<[^>]*>/g,'').trim():'rendered, no arrow') : 'nothing shown';
  });
  return out;
}, seeded));

console.log('\nTHE PERMANENT MARK ON THE PROGRAM TAB (no age gate)');
console.log('  ', await p.evaluate(n=>{
  goTab('program'); render();
  const out={};
  [['raised',n.raised],['cutOld',n.cut],['handEdited',n.edited],['calibrated',n.calib]].forEach(([k,nm])=>{
    const card=[...document.querySelectorAll('.prog-day')].find(c=>c.textContent.includes(nm));
    const rows=card?[...card.querySelectorAll('*')].filter(x=>x.textContent.trim().startsWith(nm)):[];
    out[k]= card && card.innerHTML.includes('changed by Element 26') ? 'day card carries the mark' : 'no mark on day';
  });
  out.marksOnPage=document.querySelectorAll('.plan-app').length;
  return out;
}, seeded));

console.log('\nRUNS ONCE — a later hand-edit is not re-stamped');
console.log('  ', await p.evaluate(n=>{
  const e=findProgramEntry(n.raised); e.weight=999; delete e.byApp; save();
  migrate();
  return {marker:S.byAppBackfill, restamped:!!findProgramEntry(n.raised).byApp};
}, seeded));

console.log('\nerrors:', errs);
await b.close();
