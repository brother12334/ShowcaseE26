import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:390,height:1000}});
const p = await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:true,ns:''}));
  localStorage.setItem('e26.ns0','E26-X');
  /* A stand-in for the speaker: every buffer that gets played is recorded by name, and
     every file that gets fetched is recorded too, so the test can tell "played" from
     "downloaded but not played". */
  window.__played = []; window.__fetched = [];
  const realFetch = window.fetch;
  window.fetch = (u, o)=>{
    const s = String(u && u.url ? u.url : u);
    if(/\.mp3$/.test(s)) window.__fetched.push(s.split("/").pop());
    return realFetch(u, o);
  };
  const FakeCtx = function(){
    this.state = "running";
    this.currentTime = 0;
    this.destination = {};
    this.resume = ()=>{};
    this.createGain = ()=> ({gain:{value:0}, connect(){}});
    this.createBufferSource = ()=>{
      const n = {buffer:null, connect(){}, start(){ window.__played.push(n.buffer && n.buffer.__name); }};
      return n;
    };
    this.decodeAudioData = (ab, ok)=>{
      const buf = {__name:"?", numberOfChannels:1, sampleRate:44100, duration:1,
                   getChannelData(){ return new Float32Array(64); }};
      ok(buf); return Promise.resolve(buf);
    };
  };
  window.AudioContext = FakeCtx; window.webkitAudioContext = FakeCtx;
});
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});

let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

const setup = (on)=> p.evaluate(async (v)=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.priorAsked=true; S.sleepAsked=todayStr();
  S.flags=[]; S.deload=null; S.viewMode="list"; S.planStart=Date.now()-200*86400e3;
  S.splitId=DEFAULT_SPLIT; applySplit();
  if(v == null) delete trainPrefs().sound; else trainPrefs().sound = v;
  /* decode the four by hand, tagged, so a played source can be named */
  SND_BUF = {};
  Object.keys(SND_FILES).forEach(k=> SND_BUF[k] = {buf:{__name:k}, at:0, hit:0, gain:1});
  window.__played.length = 0; window.__fetched.length = 0;
  save(); render();
  return soundOn();
}, on);

console.log("1 - THE FILES ARE IN THE APP AND IN THE WORKER'S CACHE");
{
  const fs = await import('node:fs/promises');
  const names = (await fs.readdir(appFile('sound'))).sort();
  ck("all ten are there", names.length === 10, names.join(","));
  const sw = await fs.readFile(appFile('sw.js'),'utf8');
  ck("and every one is precached",
     names.every(n=> sw.includes('"./sound/' + n + '"')), "missing one");
  const sizes = await Promise.all(names.map(async n=> (await fs.stat(appFile('sound/')+n)).size));
  ck("none of them is big", Math.max(...sizes) < 200000, sizes.join(","));
}

console.log("2 - ON BY DEFAULT, AND A PRESS MAKES THE PRESS SOUND");
{
  const on = await setup(null);
  ck("sound is on unless turned off", on, String(on));
  const r = await p.evaluate(async ()=>{
    TAB="sync"; SET_PAGE=null; render();
    await new Promise(r2=> setTimeout(r2, 30));
    window.__played.length = 0;
    document.querySelector("button").dispatchEvent(new PointerEvent("pointerdown", {bubbles:true}));
    return window.__played.slice();
  });
  ck("one sound, and it is this tab's click", r.join("|") === "press", r.join("|"));
}

console.log("3 - A PRESS THAT LANDS SOMETHING GETS THE SOFTER POP");
{
  const r = await p.evaluate(async ()=>{
    TAB="sync"; SET_PAGE="screen"; render();
    await new Promise(r2=> setTimeout(r2, 60));
    const seg = document.querySelector(".ch");
    window.__played.length = 0;
    seg.dispatchEvent(new PointerEvent("pointerdown", {bubbles:true}));
    return {played: window.__played.slice(), had: !!seg};
  });
  ck("the option row exists", r.had, String(r.had));
  ck("and it pops rather than clicks", r.played.join("|") === "pop", r.played.join("|"));
}

console.log("4 - EVERY TOAST IS THE APP SPEAKING, AND HAS ITS OWN SOUND");
{
  const r = await p.evaluate(()=>{
    window.__played.length = 0;
    toast("Saved", "good");
    toast("Nope", "warn");
    toast("Just so you know");
    return window.__played.slice();
  });
  ck("three toasts, three notices", r.join("|") === "notice|notice|notice", r.join("|"));
}

console.log("5 - ONE PRESS IS ONE SOUND, NOT TWO");
{
  const r = await p.evaluate(async ()=>{
    TAB="sync"; SET_PAGE=null; render();
    await new Promise(r2=> setTimeout(r2, 60));
    const btn = document.querySelector("button");
    window.__played.length = 0;
    // pointerdown, and the click the same press turns into
    btn.dispatchEvent(new PointerEvent("pointerdown", {bubbles:true}));
    btn.dispatchEvent(new PointerEvent("pointerdown", {bubbles:true}));
    return window.__played.slice();
  });
  ck("the second is swallowed", r.length === 1, r.join("|"));
}

console.log("6 - A CONTROL THAT DOES NOTHING STAYS SILENT");
{
  const r = await p.evaluate(async ()=>{
    TAB="today"; render();
    await new Promise(r2=> setTimeout(r2, 60));
    const dead = [...document.querySelectorAll("#app button")].filter(n=>
      n.disabled || n.getAttribute("aria-disabled") === "true"
      || (n.classList && (n.classList.contains("inert") || n.classList.contains("locked")
                          || n.classList.contains("past"))));
    let heard = 0;
    for(const n of dead.slice(0, 4)){
      await new Promise(r2=> setTimeout(r2, 55));
      window.__played.length = 0;
      n.dispatchEvent(new PointerEvent("pointerdown", {bubbles:true}));
      if(window.__played.length) heard++;
    }
    return {tried: Math.min(dead.length, 4), heard};
  });
  ck("there are some to try", r.tried > 0, JSON.stringify(r));
  ck("and not one of them made a sound", r.heard === 0, JSON.stringify(r));
}

console.log("7 - IT REACHES EVERY TAB, NOT JUST THE ONE YOU LOG ON");
{
  for(const tab of ["today","history","body","program","sync"]){
    const r = await p.evaluate(async (t)=>{
      TAB = t; SET_PAGE = null; DAY_EDIT = null; render();
      await new Promise(r2=> setTimeout(r2, 30));
      const els = [...document.querySelectorAll("#app *")].filter(n=>
        ((n.matches && n.matches(SND_SEL)) || typeof n.onclick === "function")
        && !n.disabled && n.getAttribute("aria-disabled") !== "true"
        && !(n.classList && (n.classList.contains("inert") || n.classList.contains("locked")
                             || n.classList.contains("past"))));
      let heard = 0;
      const tried = Math.min(els.length, 6);
      for(let i = 0; i < tried; i++){
        await new Promise(r2=> setTimeout(r2, 55));
        window.__played.length = 0;
        els[i].dispatchEvent(new PointerEvent("pointerdown", {bubbles:true}));
        if(window.__played.length) heard++;
      }
      return {tried, heard};
    }, tab);
    ck(tab + ": every press answered", r.tried > 0 && r.heard === r.tried, JSON.stringify(r));
  }
}

console.log("8 - OFF MEANS OFF, AND DOWNLOADS NOTHING");
{
  await setup("off");
  const r = await p.evaluate(async ()=>{
    SND_BUF = {}; SND_LOAD = {};
    window.__fetched.length = 0; window.__played.length = 0;
    TAB="sync"; SET_PAGE=null; render();
    await new Promise(r2=> setTimeout(r2, 40));
    document.querySelector("button").dispatchEvent(new PointerEvent("pointerdown", {bubbles:true}));
    toast("Anything", "good");
    sndWarm();
    await new Promise(r2=> setTimeout(r2, 120));
    return {played: window.__played.length, fetched: window.__fetched.slice()};
  });
  ck("nothing is played", r.played === 0, String(r.played));
  ck("and not a byte is fetched", r.fetched.length === 0, r.fetched.join(","));
}

console.log("9 - TURNING IT ON FETCHES THEM AND SAYS SO");
{
  const r = await p.evaluate(async ()=>{
    SND_BUF = {}; SND_LOAD = {};
    window.__fetched.length = 0; window.__played.length = 0;
    TAB="sync"; SET_PAGE="screen"; render();
    await new Promise(r2=> setTimeout(r2, 40));
    document.querySelector('[data-prefsound="on"]').click();
    await new Promise(r2=> setTimeout(r2, 400));
    return {on: soundOn(), fetched: window.__fetched.slice().sort()};
  });
  ck("it is on", r.on, String(r.on));
  ck("and the three it needs are fetched",
     ["notice.mp3","pop.mp3","press.mp3"].every(f=> r.fetched.includes(f)), r.fetched.join(","));
}

console.log("10 - THE SETTING IS WHERE THE OTHER WORKOUT-SCREEN ONES ARE");
{
  const r = await p.evaluate(()=>{
    TAB="sync"; SET_PAGE="screen"; render();
    const t = document.body.innerText;
    return {opts: [...document.querySelectorAll("[data-prefsound]")].map(x=> x.dataset.prefsound),
            head: /^|\bSound\b/.test(t) && /follows your ringer switch/i.test(t),
            offline: /works with no signal/i.test(t)};
  });
  ck("two answers", r.opts.join(",") === "on,off", r.opts.join(","));
  ck("it warns about the ringer", r.head, String(r.head));
  ck("and says it works offline", r.offline, String(r.offline));
}

console.log("11 - THE SPLASH CUES ARE READ OFF THE KEYFRAMES, NOT GUESSED");
{
  const src = await (await import('node:fs/promises')).readFile(appFile('index.html'),'utf8');
  ck("the shadow's two openings are cued", /\{snd:"tap",   at:0\.281\}/.test(src)
     && /\{snd:"tap",   at:1\.272\}/.test(src), "missing");
  ck("and the swoosh over the fall", /\{snd:"intro", at:1\.750\}/.test(src), "missing");
  /* 11.7% and 53% of the 2.4s shadow animation are exactly 0.281s and 1.272s, and the
     mark is through the floor at 93.5% of the 2s flight, or 1.87s */
  ck("which is what the CSS says", /mkPlate 2\.4s/.test(src) && /mkFlight 2s/.test(src), "timings moved");
  ck("scheduled against elapsed time, not from zero", /c\.at > gone \+ 0\.04/.test(src), "missing");
}

console.log("12 - EACH FILE IS MEASURED: WHERE IT STARTS, HOW LOUD IT IS, WHERE IT PEAKS");
{
  const r = await p.evaluate(async ()=>{
    /* buffers whose shape is known exactly, since the real decoder is not available
       over file:// */
    const mk = (lead, peak, len, hitAt)=>{
      const n = Math.round(44100 * len), d = new Float32Array(n);
      const from = Math.round(44100 * lead);
      // the body is the peak, unless a louder burst is being placed later on
      const body = (hitAt != null) ? peak * 0.25 : peak;
      for(let i = from; i < n; i++) d[i] = body * Math.sin(i / 20);
      if(hitAt != null){                       // a louder burst somewhere in the middle
        const a = Math.round(44100 * hitAt), b2 = a + Math.round(44100 * 0.02);
        for(let i = a; i < b2 && i < n; i++) d[i] = peak * Math.sin(i / 20);
      }
      return {numberOfChannels:1, sampleRate:44100, duration:len, getChannelData(){ return d; }};
    };
    return {
      lead50: Math.round(sndScan("press", mk(0.050, .8, 0.5)).at * 1000),
      lead0:  Math.round(sndScan("press", mk(0, .8, 0.5)).at * 1000),
      quiet:  Math.round(sndScan("notice", mk(0, .20, 0.5)).gain * 100) / 100,
      loud:   Math.round(sndScan("press",  mk(0, .94, 0.5)).gain * 100) / 100,
      silent: Math.round(sndScan("press",  mk(0, 0, 0.5)).gain * 100) / 100,
      hit:    Math.round(sndScan("intro",  mk(0, .8, 1.0, 0.60)).hit * 1000)
    };
  });
  ck("50ms of silence is skipped, less a hair", r.lead50 >= 44 && r.lead50 <= 50, String(r.lead50));
  ck("a file that starts at once is not trimmed", r.lead0 === 0, String(r.lead0));
  ck("a quiet file is brought up", r.quiet > 2 && r.quiet < 3, String(r.quiet));
  ck("a loud one is brought down", r.loud > .4 && r.loud < .55, String(r.loud));
  ck("and a silent one is not amplified into noise", r.silent === .45, String(r.silent));
  ck("the loudest moment is found where it is, not at the start",
     r.hit >= 590 && r.hit <= 620, String(r.hit));
}

console.log("13 - A CUE IS SCHEDULED SO ITS LOUDEST MOMENT LANDS ON THE BEAT");
{
  const r = await p.evaluate(()=>{
    SND_BUF.tap   = {buf:{__name:"tap"},   at:0.004, hit:0.030, gain:1};
    SND_BUF.intro = {buf:{__name:"intro"}, at:0.075, hit:0.870, gain:1};
    const log = [];
    const ac = sndCtx();
    ac.createBufferSource = ()=> ({buffer:null, connect(){},
      start(when, off){ log.push({when: Math.round(when*1000), off: Math.round((off||0)*1000)}); },
      stop(){}});
    ac.currentTime = 0;
    soundCue("tap", 0.281);
    soundCue("tap", 1.272);
    soundCue("intro", 1.750);
    /* the shadow springs open at 281ms and 1272ms; the mark is gone through the floor by
       1870ms, and the swoosh should peak just before that */
    return log.map(x=> ({land: x.when + (x.off === 4 ? 26 : 795), ...x}));
  });
  ck("the first punch lands as the shadow opens", r[0].land === 281, JSON.stringify(r[0]));
  ck("the second lands as it opens again", r[1].land === 1272, JSON.stringify(r[1]));
  ck("and the swoosh peaks over the plunge", r[2].land === 1750, JSON.stringify(r[2]));
  ck("each one starts past its own silence", r.every(x=> x.off > 0), JSON.stringify(r));
}

console.log("14 - BUT NOT WHILE THE PAGE IS STILL FORBIDDEN TO MAKE A NOISE");
{
  const r = await p.evaluate(()=>{
    const ac = sndCtx();
    let fired = 0;
    ac.createBufferSource = ()=> ({buffer:null, connect(){}, start(){ fired++; }, stop(){}});
    ac.state = "suspended";
    const out = soundCue("tap", 0.281);
    ac.state = "running";
    return {out, fired};
  });
  ck("a suspended context schedules nothing", r.out === false && r.fired === 0, JSON.stringify(r));
}

console.log("15 - AND SKIPPING THE SPLASH TAKES THE REST OF THE SEQUENCE WITH IT");
{
  const r = await p.evaluate(()=>{
    const ac = sndCtx();
    let stopped = 0;
    ac.state = "running";
    ac.currentTime = 0;
    ac.createBufferSource = ()=> ({buffer:null, connect(){}, start(){}, stop(){ stopped++; }});
    SND_LIVE = [];
    soundCue("tap", 0.281); soundCue("intro", 1.750);
    const queued = SND_LIVE.length;
    soundCut();
    return {queued, stopped, left: SND_LIVE.length};
  });
  ck("two were queued", r.queued === 2, JSON.stringify(r));
  ck("both are stopped", r.stopped === 2, JSON.stringify(r));
  ck("and nothing is left holding them", r.left === 0, JSON.stringify(r));
}

console.log("16 - EVERY TAB HAS ITS OWN PRESS, AND THE BAR PLAYS WHERE YOU ARE GOING");
{
  await setup(null);
  const r = await p.evaluate(async ()=>{
    /* sections 13-15 replaced the context's source node with counters; this needs the
       recording one back */
    SND_AC = null;
    Object.keys(SND_FILES).forEach(k=> SND_BUF[k] = {buf:{__name:k}, at:0, hit:0, gain:1});
    const out = {};
    for(const t of ["today","workout","history","body","program","sync"]){
      TAB = t;
      await new Promise(r2=> setTimeout(r2, 55));
      window.__played.length = 0;
      /* a plain control on that tab, answered in that tab's voice */
      const n = document.createElement("button");
      n.onclick = ()=>{};
      document.getElementById("app").appendChild(n);
      n.dispatchEvent(new PointerEvent("pointerdown", {bubbles:true}));
      n.remove();
      out[t] = window.__played[0] || "";
    }
    return out;
  });
  ck("today has its own", r.today === "press-today", JSON.stringify(r));
  ck("so does the workout screen", r.workout === "press-workout", JSON.stringify(r));
  ck("history too", r.history === "press-history", JSON.stringify(r));
  ck("body too", r.body === "press-body", JSON.stringify(r));
  ck("program too", r.program === "press-program", JSON.stringify(r));
  ck("and settings keeps the original", r.sync === "press", JSON.stringify(r));
  ck("no two tabs sound alike",
     new Set(Object.values(r)).size === Object.keys(r).length, JSON.stringify(r));
}

console.log("17 - A TAB BUTTON SOUNDS LIKE WHERE IT IS GOING, NOT WHERE YOU ARE");
{
  const r = await p.evaluate(async ()=>{
    TAB = "today";
    await new Promise(r2=> setTimeout(r2, 55));
    const n = document.createElement("button");
    n.dataset.tab = "body";
    n.onclick = ()=>{};
    document.getElementById("app").appendChild(n);
    window.__played.length = 0;
    n.dispatchEvent(new PointerEvent("pointerdown", {bubbles:true}));
    n.remove();
    return window.__played.slice();
  });
  ck("standing on Today, the Body tab answers in Body's voice",
     r.join("|") === "press-body", r.join("|"));
}

console.log("18 - EVERY PRESS SOUND IS THERE BEFORE THE FIRST PRESS THAT NEEDS IT");
{
  const r = await p.evaluate(async ()=>{
    SND_BUF = {}; SND_LOAD = {};
    window.__fetched.length = 0;
    TAB = "today";
    sndWarm();
    await new Promise(r2=> setTimeout(r2, 250));
    return window.__fetched.slice().sort();
  });
  ck("all six presses, the pop and the notice are fetched at once",
     r.join(",") === "notice.mp3,pop.mp3,press-body.mp3,press-history.mp3,press-program.mp3,press-today.mp3,press-workout.mp3,press.mp3",
     r.join(","));
  ck("and the two long splash files are not",
     !r.includes("intro.mp3") && !r.includes("tap.mp3"), r.join(","));
}

console.log("18b - SO ARRIVING ON A TAB AND PRESSING AT ONCE IS NOT SILENT");
{
  const r = await p.evaluate(async ()=>{
    /* the buffers the warm-up fetched are decoded by the stub; stand them up and check
       that a press on a tab never visited before still has a sound to play */
    SND_AC = null;
    Object.keys(SND_FILES).forEach(k=> SND_BUF[k] = {buf:{__name:k}, at:0, hit:0, gain:1});
    const out = {};
    /* not "workout": with no session running, goTab bounces it back to Today, and the
       sound correctly follows where you actually ended up */
    for(const t of ["program","body","history"]){
      goTab(t);                                   // arrive, and press immediately
      await new Promise(r2=> setTimeout(r2, 55));
      window.__played.length = 0;
      const n = document.createElement("button");
      n.onclick = ()=>{};
      document.getElementById("app").appendChild(n);
      n.dispatchEvent(new PointerEvent("pointerdown", {bubbles:true}));
      n.remove();
      out[t] = window.__played[0] || "";
    }
    return out;
  });
  ck("program answers on arrival", r.program === "press-program", JSON.stringify(r));
  ck("body answers on arrival", r.body === "press-body", JSON.stringify(r));
  ck("history answers on arrival", r.history === "press-history", JSON.stringify(r));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
