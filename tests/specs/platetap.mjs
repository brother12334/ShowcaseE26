import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.dismiss());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} document.body.classList.remove('ai-open','onboarding'); hideModal();
  const af=document.getElementById('aiFull'); if(af) af.hidden=true;
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.priorTrainingWeeks=100; S.priorAsked=1;
  S.splitId=DEFAULT_SPLIT; applySplit();
  S.cycleStart=Date.now()-2*86400e3; S.cycleDone=[0]; S.pointer=1; S.active=null;
  save(); TAB="today"; render();
});
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

console.log("1 - THE DAYS YOU CANNOT CHOOSE ARE NOT PRESSABLE");
{
  const r = await p.evaluate(()=>{
    const out=[];
    document.querySelectorAll('.plate[data-slot]').forEach(el=>{
      const slot = parseInt(el.dataset.slot,10);
      out.push({slot, t: el.textContent.trim().slice(0,6),
        past: slotIsPast(slot), locked: slotIsLocked(slot),
        inert: el.classList.contains('inert'),
        pe: getComputedStyle(el).pointerEvents});
    });
    return out;
  });
  r.forEach(x=> console.log("     " + x.t.padEnd(8) +
    (x.past?"past ":x.locked?"locked ":"open ") + " inert=" + x.inert + " pointer-events=" + x.pe));
  const shut = r.filter(x=> x.past || x.locked);
  const open = r.filter(x=> !x.past && !x.locked);
  ck("there is something of each kind", shut.length>0 && open.length>0, shut.length+"/"+open.length);
  ck("every day you cannot pick is inert", shut.every(x=> x.inert && x.pe==="none"), "");
  ck("and the ones you can pick still take a press", open.every(x=> !x.inert && x.pe!=="none"), "");
}

console.log("2 - A PRESS ON ONE SAYS NOTHING AND CHANGES NOTHING");
{
  const r = await p.evaluate(async ()=>{
    const el = [...document.querySelectorAll('.plate[data-slot]')]
      .find(e=> slotIsLocked(parseInt(e.dataset.slot,10)));
    if(!el) return {none:true};
    const before = S.pointer;
    let toasted = false;
    const t0 = toast; toast = (...a)=>{ toasted = true; return t0(...a); };
    el.click();                       // ignored by pointer-events, but the handler is there too
    el.onclick && el.onclick();       // and the keyboard path
    toast = t0;
    return {before, after: S.pointer, toasted,
            live: !!document.querySelector('#toast.show, .toast.show')};
  });
  ck("the rotation did not move", r.before === r.after, r.before+" → "+r.after);
  ck("and nothing was said about it", !r.toasted && !r.live, "toasted="+r.toasted);
}

console.log("3 - THE DAY YOU ARE ON STILL WORKS");
{
  const r = await p.evaluate(()=>{
    const el = [...document.querySelectorAll('.plate[data-slot]')]
      .find(e=>{ const s2=parseInt(e.dataset.slot,10); return !slotIsPast(s2) && !slotIsLocked(s2); });
    if(!el) return {none:true};
    const slot = parseInt(el.dataset.slot,10);
    S.override = "something-else";            // cleared only if the handler runs through
    el.click();
    return {slot, pointer: S.pointer, override: S.override};
  });
  ck("picking an open day selects it", r.pointer === r.slot, r.pointer + " vs " + r.slot);
  ck("and the press really did run", r.override === null, String(r.override));
}

console.log("4 - A SCHEDULED REST IS A MARKER, A FLOATING ONE IS A CONTROL");
{
  const r = await p.evaluate(()=>{
    const read = ()=> [...document.querySelectorAll('.plate[data-rest]')]
      .map(el=> ({inert: el.classList.contains('inert'), pe: getComputedStyle(el).pointerEvents}));
    S.prefs = Object.assign({}, S.prefs, {restMode:"scheduled"}); save(); render();
    const sched = {float: restsFloat(), plates: read()};
    S.prefs = Object.assign({}, S.prefs, {restMode:"float"}); save(); render();
    const flt = {float: restsFloat(), plates: read()};
    return {sched, flt};
  });
  if(!r.sched.float && r.sched.plates.length){
    ck("scheduled rest plates are inert", r.sched.plates.every(x=> x.inert && x.pe==="none"), "");
  } else console.log("     (no scheduled rest plates in this split — nothing to check)");
  if(r.flt.float && r.flt.plates.length){
    ck("floating rest plates still take a press", r.flt.plates.every(x=> !x.inert), "");
  } else console.log("     (no floating rest plates in this split — nothing to check)");
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
