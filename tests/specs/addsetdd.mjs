import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:844}, hasTouch:true})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
const seed = ()=> p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.splitId=DEFAULT_SPLIT; applySplit();
  const mk = (n, ss)=> Object.assign({name:n, reps:"8",
     sets:[0,1].map(()=>({weight:"100",reps:"8",rpe:"8",done:false}))}, ss?{superset:true}:{});
  S.active={date:todayStr(), workoutId:ROTATION[0], startedAt:Date.now(),
    entries:[mk("Barbell Bench Press"), mk("Bravo", true), mk("Charlie"), mk("Delta")]};
  save(); goTab("workout"); render(); window.scrollTo(0,0);
});
await seed();

console.log("1 - THE BUTTON OPENS A MENU, NOT A SHEET");
{
  const r = await p.evaluate(()=>{
    document.querySelector('[data-addset="0"]').click();
    return {menu: !!document.querySelector(".dd"),
            items: document.querySelectorAll(".dd [data-ddi]").length,
            modal: document.getElementById("modalBg").classList.contains("show"),
            head: (document.querySelector(".dd-h")||{}).textContent || ""};
  });
  ck("a menu is up", r.menu, String(r.menu));
  ck("with the kinds of set on it", r.items >= 1, String(r.items));
  ck("and no sheet took the screen", !r.modal, String(r.modal));
  ck("it says where the set goes", /end/i.test(r.head), r.head);
}

console.log("2 - IT SITS UNDER THE BUTTON THAT OPENED IT");
{
  const r = await p.evaluate(()=>{
    const btn = document.querySelector('[data-addset="0"]');
    const br = btn.getBoundingClientRect(), dr = document.querySelector(".dd").getBoundingClientRect();
    return {touching: dr.top >= br.bottom - 1 || dr.bottom <= br.top + 1,
            nearX: Math.abs(dr.left - br.left) < 40 || dr.left === 10,
            onScreen: dr.left >= 0 && dr.right <= window.innerWidth,
            bottomOk: dr.bottom <= window.innerHeight + 1, topOk: dr.top >= 0};
  });
  ck("directly above or below it, not across it", r.touching, JSON.stringify(r));
  ck("lined up with it", r.nearX, JSON.stringify(r));
  ck("and fully on the screen", r.onScreen && r.bottomOk && r.topOk, JSON.stringify(r));
}

console.log("3 - CHOOSING ADDS THE SET AND PUTS THE MENU AWAY");
{
  const r = await p.evaluate(()=>{
    const before = S.active.entries[0].sets.length;
    document.querySelector(".dd [data-ddi]").click();
    return {before, after: S.active.entries[0].sets.length,
            gone: !document.querySelector(".dd:not(.dd-out)"),
            own: !!S.active.entries[0].setsOwn,
            blank: JSON.stringify(S.active.entries[0].sets.slice(-1)[0])};
  });
  ck("a set is added", r.after === r.before + 1, JSON.stringify(r));
  ck("empty, as it says", /"weight":""/.test(r.blank) && /"done":false/.test(r.blank), r.blank);
  ck("the count is now yours", r.own, String(r.own));
  ck("and the menu is gone", r.gone, String(r.gone));
}

console.log("4 - IT CLOSES THE WAYS A MENU SHOULD");
{
  const away = async ()=>{
    await p.evaluate(()=>{ document.querySelector('[data-addset="0"]').click(); });
    return p.evaluate(()=> !!document.querySelector(".dd:not(.dd-out)"));
  };
  ck("open again", await away(), "");
  let gone = await p.evaluate(()=>{
    document.body.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true, clientX:5, clientY:5}));
    return !document.querySelector(".dd:not(.dd-out)");
  });
  ck("a tap outside closes it", gone, String(gone));
  await away();
  gone = await p.evaluate(()=>{
    document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));
    return !document.querySelector(".dd:not(.dd-out)");
  });
  ck("Escape closes it", gone, String(gone));
  await away();
  gone = await p.evaluate(()=>{ render(); return !document.querySelector(".dd:not(.dd-out)"); });
  ck("and a redraw never leaves one pointing at nothing", gone, String(gone));
  await away();
  gone = await p.evaluate(()=>{
    document.querySelector('[data-addset="0"]').click();          // the same button again
    return !document.querySelector(".dd:not(.dd-out)");
  });
  ck("pressing it again closes it", gone, String(gone));
}

console.log("5 - IT OPENS UPWARDS WHEN THERE IS NO ROOM BELOW");
{
  const r = await p.evaluate(()=>{
    const btns = [...document.querySelectorAll("[data-addset]")];
    const btn = btns[btns.length-1];
    btn.scrollIntoView({block:"end"});
    btn.click();
    const dd = document.querySelector(".dd");
    if(!dd) return {err:"no menu"};
    const br = btn.getBoundingClientRect(), dr = dd.getBoundingClientRect();
    return {above: dr.bottom <= br.top + 1, fits: dr.top >= -1 && dr.bottom <= window.innerHeight + 1,
            origin: dd.style.getPropertyValue("--ddo"), maxH: dd.style.maxHeight};
  });
  ck("it flips above the button", r.above, JSON.stringify(r));
  ck("still fully on screen", r.fits, JSON.stringify(r));
  ck("capped to the room there is", parseFloat(r.maxH) > 0, JSON.stringify(r));
  ck("and grows from the corner it is anchored by", /bottom/.test(r.origin||""), JSON.stringify(r));
}

console.log("6 - THE SUPERSET'S OWN + USES IT TOO");
{
  await seed();
  const r = await p.evaluate(()=>{
    const btn = document.querySelector('.ss-group [data-addset]');
    if(!btn) return {err:"no superset + button"};
    const ei = parseInt(btn.dataset.addset, 10);
    const before = S.active.entries[ei].sets.length;
    btn.click();
    const menu = !!document.querySelector(".dd:not(.dd-out)");
    const item = document.querySelector(".dd:not(.dd-out) [data-ddi]");
    if(item) item.click();
    return {menu, before, after: S.active.entries[ei].sets.length, ei};
  });
  ck("a leg of a superset gets the same menu", r.menu, JSON.stringify(r));
  ck("and the set lands on that leg", r.after === r.before + 1, JSON.stringify(r));
}

console.log("7 - A SUPERSET MOVES AS ONE, LIKE ANY OTHER CARD");
{
  await seed();
  const r = await p.evaluate(()=>{
    const names = ()=> S.active.entries.map(e=> e.name).join(",");
    const start = names();
    document.querySelector('.ss-hdr [data-exdown]').click();
    const down = names();
    document.querySelector('.ss-hdr [data-exup]').click();
    return {start, down, back: names()};
  });
  ck("both legs go down together",
     r.down.split(",").slice(0,4).join(",") === "Barbell Bench Press,Delta,Bravo,Charlie",
     r.down.split(",").slice(0,4).join(","));
  ck("and come back together", r.back === r.start, r.start+" vs "+r.back);
}

console.log("7b - AND NEITHER LEG CAN BE MOVED OUT OF THE PAIR ON ITS OWN");
{
  const r = await p.evaluate(()=>{
    const ids = [...document.querySelectorAll("[data-exup]")].map(b=> b.dataset.exup);
    /* the pair is at 1 and 2: one control for the block, none for the second leg */
    return {ids, hasBlock: ids.includes("1"), hasSecondLeg: ids.includes("2")};
  });
  ck("the pair has one pair of arrows", r.hasBlock, r.ids.join(","));
  ck("and the second leg has none of its own", !r.hasSecondLeg, r.ids.join(","));
}

console.log("7c - A FINISHED SUPERSET STAYS WHERE IT RAN");
{
  const r = await p.evaluate(()=>{
    S.active.entries[1].sets.forEach(s=> s.done = true);
    S.active.entries[2].sets.forEach(s=> s.done = true);
    render();
    const btn = document.querySelector('.ss-hdr [data-exdown]');
    const names = S.active.entries.map(e=> e.name).join(",");
    if(btn) btn.click();
    return {disabled: !!(btn && btn.disabled), same: S.active.entries.map(e=> e.name).join(",") === names};
  });
  ck("its arrows are off", r.disabled, JSON.stringify(r));
  ck("and it did not move", r.same, JSON.stringify(r));
}

console.log(errs.length?("PAGE ERRORS: "+errs.join(" | ")):"no page errors");
if(errs.length) bad++;
console.log(bad?("BROKEN: "+bad):"all good");
await b.close();
