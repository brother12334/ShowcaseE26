import { chromium, REPO, appFile, shot } from './_e26.mjs';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
/* THE REST DAY, IN DARK GLASS.

   It is Today's other branch, and it was the last screen still showing the old
   interface below the hero — "REST DAY" and "TOMORROW" in uppercase typewriter type on
   a screen where nothing else speaks that way. The cause is worth stating because it is
   not obvious from looking: Today opens its wrapper by hand as `.dg`, from before
   dgScreenHTML existed, so every rule the redesign scoped to .dg-screen and
   [data-dg-screen] has never reached either branch. Today does not need them — it was
   laid out against its mockup by hand. The rest day was not.

   So the rest branch takes the class and the name, and section 1 holds that. Section 3
   is the walk that found five rounds of mono on Body.

   TWO THINGS HERE DELIBERATELY DO NOT MATCH THE MOCKUP, and both are guarded so that
   "match the PNG" cannot quietly undo them later:

     TOMORROW KEEPS ITS LIST. The mockup draws one line, "5 lifts, 50 min". The comment
     above this card in the source says why the list is there: a rest day was one card
     and eight hundred pixels of nothing, and what fills it is what the rest is FOR.
     Section 4 requires the movements to still be named.

     THERE IS NO STANDING OFFER TO TRAIN ANYWAY. The mockup offers "feeling good? skip
     ahead" unconditionally. The app offers it only when a workout was actually missed
     this cycle, because offering to undo a scheduled rest on the screen that announces
     it turns a settled decision back into a question. Section 5 checks both halves:
     absent on an ordinary rest day, present once a day has been missed. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.json':'application/json', '.webp':'image/webp', '.png':'image/png', '.mp4':'video/mp4',
  '.ttf':'font/ttf', '.svg':'image/svg+xml', '.mp3':'audio/mpeg',
  '.webmanifest':'application/manifest+json' };
const srv = createServer(async (q, r)=>{
  const u = decodeURIComponent(q.url.split('?')[0]);
  const f = join(REPO, normalize(u === '/' ? '/index.html' : u));
  try{ const bytes = await readFile(f);
    r.writeHead(200, {'content-type': MIME[extname(f)] || 'application/octet-stream'});
    r.end(bytes); }
  catch(e){ r.writeHead(404); r.end('no'); }
});
await new Promise(ok=> srv.listen(0, ok));
const BASE = 'http://127.0.0.1:' + srv.address().port + '/';

const b = await chromium.launch();
let bad = 0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };
const httpErr = [], pageErr = [];

const p = await b.newPage({viewport:{width:390,height:844}});
p.on('dialog', d=> d.accept());
p.on('pageerror', e=> pageErr.push(e.message));
p.on('response', rs=>{ if(rs.status() >= 400) httpErr.push(rs.status()+' '+rs.url().replace(BASE,'')); });
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(BASE, {waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S !== 'undefined' && !!S, null, {timeout:20000});
await p.evaluate(fx=>{
  window.boot = (mutate)=>{
    const sp = document.getElementById('splash'); if(sp) sp.remove();
    try{OB=null}catch(e){} try{PF=null}catch(e){} try{hideModal()}catch(e){}
    ['preflight','aiFull'].forEach(id=>{ const el = document.getElementById(id); if(el) el.remove(); });
    document.body.classList.remove('ai-open','onboarding','pfl-open');
    Object.keys(S).forEach(k=>{ delete S[k]; });
    Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
    S.tourDone = true; S.active = null;
    S.introSeen = (typeof INTRO_GEN === "number") ? INTRO_GEN : 1;
    S.restDays = [todayStr()];
    if(mutate) mutate(S);
    migrate(); try{ applySplit(); }catch(e){}
    TAB = "today"; SET_PAGE = null; render(); glassSync();
  };
  boot();
}, FX);
await p.waitForTimeout(400);

console.log("\n1. THE REST DAY IS INSIDE THE DESIGN'S OWN RULES");
let r = await p.evaluate(()=> ({
  rest: isRestToday(),
  named: ((document.querySelector('[data-dg-screen]') || {}).getAttribute
          ? document.querySelector('[data-dg-screen]').getAttribute('data-dg-screen') : null),
  screened: !!document.querySelector('.dg.dg-screen'),
  hero: !!document.querySelector('#stage .hero-media'),
  say: ((document.querySelector('.dg-say') || {}).textContent || "").trim()
}));
ck("CONTROL: today is a rest day", r.rest === true);
ck("the screen names itself", r.named === "rest", String(r.named));
ck("and takes the converted screen's stylesheet", r.screened === true);
ck("the rest hero is behind it", r.hero === true);
ck("and the sentence says there is nothing to do", /nothing to do today/i.test(r.say), r.say);

console.log("\n2. TODAY'S OWN BRANCH WAS LEFT ALONE");
r = await p.evaluate(()=>{
  boot(S2=>{ S2.restDays = []; S2.override = null; });
  const el = document.querySelector('.dg');
  return {rest: isRestToday(), cls: el.className,
          named: el.getAttribute('data-dg-screen')};
});
ck("CONTROL: this is the training branch now", r.rest === false);
ck("it is still the bare wrapper it always was",
   r.cls.trim() === "dg" && r.named === null, r.cls + " / " + r.named);
await p.evaluate(()=> boot());
await p.waitForTimeout(250);

console.log("\n3. NOTHING ON THE SCREEN IS STILL SPEAKING MONO");
r = await p.evaluate(()=>{
  const screen = document.querySelector('[data-dg-screen="rest"]');
  const out = [];
  screen.querySelectorAll('*').forEach(n=>{
    if(!n.textContent.trim() || n.children.length) return;
    const cs = getComputedStyle(n);
    if(/mono|plex mono|monospace/i.test(cs.fontFamily) || cs.textTransform === "uppercase")
      out.push((n.className || n.tagName) + " :: " + n.textContent.trim().slice(0, 22));
  });
  return {n: out.length, out: out.slice(0, 8), seen: screen.querySelectorAll('*').length};
});
ck("CONTROL: there was a screenful of text to walk", r.seen > 80, String(r.seen));
ck("no label is left in uppercase mono", r.n === 0, r.out.join(" | ") || "none");

console.log("\n4. TOMORROW KEEPS ITS LIST, WHICH IS WHAT FILLS THE DAY");
r = await p.evaluate(()=>{
  const card = document.querySelector('.rest-tmr');
  const rows = [...document.querySelectorAll('.rest-tmr-ex')];
  const tw = ROTATION[S.pointer];
  const real = (resolvedProgram(tw) || []).filter(x=> x && x.chosen && !x.isFinisher)
                                          .map(x=> x.chosen.name);
  return {card: !!card, rows: rows.length, real: real.length,
          named: rows.filter((n, i)=> real.indexOf(n.querySelector('span').textContent.trim()) > -1).length,
          head: ((card || {}).querySelector ? card.querySelector('.rest-tmr-h b').textContent.trim() : ""),
          day: (()=>{ try{ return dayMeta(tw).name; }catch(e){ return ""; } })()};
});
ck("CONTROL: tomorrow really has movements in it", r.real > 1, String(r.real));
ck("the card is there and names the day", r.card === true && r.head === r.day,
   r.head + " vs " + r.day);
ck("and the movements are named, not counted",
   r.rows > 1 && r.named === r.rows, r.named + " of " + r.rows + " matched the plan");

console.log("\n5. NO STANDING OFFER TO TRAIN ANYWAY, AND ONE WHEN IT IS EARNED");
r = await p.evaluate(()=>{
  const read = ()=> !!document.getElementById('restSkipTrain');
  /* A rest you recorded yourself. The plan did not put it here, so there is nothing to
     say you have already had. */
  const taken = read();
  /* A rest the PLAN put here, after three training days, with a workout that came and
     went earlier in the cycle: the one case the offer exists for. */
  /* AFTER applySplit, NOT BEFORE IT. boot() plants a state and then calls applySplit(),
     which rebuilds the cycle and clears what was planted \u2014 the first draft of this set
     cycleDone inside boot and read it back as empty. The rest is placed by counting
     training days done, so the count has to survive to be counted. */
  const set = (f)=>{ boot(); f(S); render(); };
  set(S2=>{ S2.restDays = []; S2.cycleDone = (ROTATION || []).slice(0, 3); });
  const earned = {rest: isRestToday(), sched: scheduledRestToday(),
                  missed: skipsThisCycle().length, offer: read()};
  /* And the same scheduled rest with nothing missed, which is the ordinary week. */
  set(S2=>{ S2.restDays = []; S2.cycleDone = (ROTATION || []).slice(0, 3); S2.skipLog = []; });
  const clean = {rest: isRestToday(), missed: skipsThisCycle().length, offer: read()};
  return {taken, earned, clean};
});
ck("a rest you recorded yourself does not offer to undo itself", r.taken === false);
ck("CONTROL: the second state is a rest the plan scheduled",
   r.earned.rest === true && r.earned.sched === true, JSON.stringify(r.earned));
ck("CONTROL: with a workout actually missed in this cycle",
   r.earned.missed > 0, String(r.earned.missed));
ck("then, and only then, it offers to train instead", r.earned.offer === true);
ck("CONTROL: the third state is the same rest with nothing missed",
   r.clean.rest === true && r.clean.missed === 0, JSON.stringify(r.clean));
ck("and the offer is gone again", r.clean.offer === false);

console.log("\n6. NOTHING RAN OFF THE SIDE, AND NOTHING THREW");
await p.evaluate(()=> boot());
await p.waitForTimeout(200);
r = await p.evaluate(()=> ({
  vw: document.documentElement.clientWidth,
  wide: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1}));
ck("the page is not wider than the window", r.wide === false, String(r.vw));
ck("no HTTP errors", httpErr.length === 0, httpErr.join(" | ") || "none");
ck("no page errors", pageErr.length === 0, pageErr.join(" | ") || "none");

await p.screenshot({path: shot("dgrest.png"), fullPage: true});
await b.close();
srv.close();
console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
