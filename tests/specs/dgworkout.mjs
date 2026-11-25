import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { appFile, chromium, shot } from './_e26.mjs';

const types = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.webp':'image/webp', '.webm':'video/webm', '.mp4':'video/mp4', '.png':'image/png', '.ttf':'font/ttf'};
const srv = createServer(async (req, res)=>{
  const path = new URL(req.url, 'http://localhost').pathname;
  const file = path === '/' ? '/index.html' : path;
  try{
    const bytes = await readFile(appFile('.' + file));
    res.writeHead(200, {'Content-Type':types[extname(file)] || 'application/octet-stream'});
    res.end(bytes);
  }catch{
    res.writeHead(404).end();
  }
});
await new Promise(resolve=> srv.listen(0, '127.0.0.1', resolve));
const url = 'http://127.0.0.1:' + srv.address().port + '/';
const browser = await chromium.launch();
try{
  const page = await browser.newPage({viewport:{width:390,height:844}, reducedMotion:'reduce'});
  const errors = [];
  page.on('pageerror', error=> errors.push(error.message));
  await page.route(/^https?:/, route=> route.request().url().startsWith(url) ? route.continue() : route.abort());
  await page.addInitScript(()=>{
    localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Test',createdAt:1,cloud:false,ns:''}));
    localStorage.setItem('e26.ns0', 'E26-X');
  });
  await page.goto(url, {waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{
    document.getElementById('splash')?.remove();
    OB = null;
    AI_IMP = null;
    document.getElementById("aiFull")?.remove();
    S.introSeen = INTRO_GEN;
    S.seenNews = NEWS_FOR;
    S.tourDone = true;
    S.geo = 'off';
    S.priorAsked = true;
    S.priorTrainingWeeks = 104;
    S.sleepAsked = todayStr();
    S.splitId = 'ppl6';
    S.viewMode = 'regular';
    S.setup = {name:'Test',goal:'muscle',level:'intermediate',gear:'full',at:Date.now()};
    S.prefs = {...S.prefs, rpe:true, sleepPrompt:false, warmups:'off', barMode:'total', barWeight:45, plateStep:2.5};
    applySplit();
    const exercise = (name, reps, weight, extra = {})=>
      ({name, sets:3, reps, weight, rpes:[7,8,8], ...extra});
    S.program.pushB = [
      exercise('Bench Press', '6–8', 185),
      exercise('Incline DB Press', '8–10', 50),
      exercise('Cable Lateral Raise', '12–15', 20, {superset:true}),
      exercise('Overhead Triceps Extension', '10–12', 60, {supersetEnd:true}),
      exercise('Pec Deck', '12–15', 75),
    ];
    S.sessions = [7, 14, 21].map((days, index)=> ({
      id:'previous-' + index, date:dayStr(Date.now() - days*86400000), workoutId:'pushB',
      startedAt:Date.now() - days*86400000 - 1800000, finishedAt:Date.now() - days*86400000,
      entries:S.program.pushB.map(entry=> ({
        name:entry.name, reps:entry.reps,
        sets:[7, 7, 6].map(reps=> ({weight:String(entry.weight), reps:String(reps), rpe:'8', done:true}))
      }))
    }));
    startWorkout('pushB');
    document.getElementById('preflight')?.remove();
    PF = null;
    document.body.classList.remove('pfl-open', 'onboarding', 'ai-open');
    hideModal();
    S.active.startedAt = Date.now() - (18*60 + 42)*1000;
    S.active.entries[0].sets.slice(0, 2).forEach((set, index)=>{
      Object.assign(set, {weight:'185', reps:String(8-index), done:true});
    });
    render();
    document.getElementById("aiFull")?.remove();
    window.scrollTo(0, 0);
  });

  const cards = page.locator('[data-workout-lift]');
  assert.equal(await cards.count(), 4, 'CONTROL: five exercises rendered as four cards, including a superset');
  assert.equal(await page.locator('[data-workout-lift="superset"]').count(), 1);
  assert.equal(await page.locator('#sbSets').textContent(), '2');
  assert.equal(await page.locator('#sbCount').textContent(), '0 / 5');
  assert.equal(await page.locator('#sbTarget').textContent(), 'rpe 8 target');
  const clock = page.locator('#workoutElapsed');
  const elapsed = await clock.textContent();
  assert.match(elapsed, /^18:4[2-9]$/, 'CONTROL: the fixture seeded a clock with elapsed seconds');

  const art = await page.locator('#stage .glass-layer').evaluate(layer=> ({
    hidden:layer.getAttribute('aria-hidden'),
    hit:getComputedStyle(layer).pointerEvents,
    pieces:[...layer.querySelectorAll('.glass')].map(piece=> ({
      still:piece.dataset.still,
      animation:getComputedStyle(piece).animationName,
      transform:getComputedStyle(piece).transform,
      box:piece.getBoundingClientRect().toJSON()
    }))
  }));
  assert.equal(art.hidden, 'true');
  assert.equal(art.hit, 'none');
  assert.equal(art.pieces.length, 1, 'CONTROL: the workout overlay mounts without small accents');
  assert.match(art.pieces[0].still, /overlay-workout$/);
  assert.equal(Math.round(art.pieces[0].box.x), 0, 'overlay aligns with the 390px canvas');
  for(const piece of art.pieces){
    assert.equal(piece.animation, 'none');
    assert.equal(piece.transform, 'none');
  }
  await page.evaluate(()=> document.fonts.ready);
  assert.equal(await page.locator('body').evaluate(body=> body.classList.contains('modal-live')), false);
  await page.screenshot({path:shot('dgworkout.png'),fullPage:true});

  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('.glass-refraction').waitFor();
  const runningClock = await clock.textContent();
  await page.waitForFunction(previous=>{
    const clock = document.getElementById('workoutElapsed');
    return clock.hasAttribute('data-glass-lensed') && clock.textContent !== previous;
  }, runningClock);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('.glass-refraction').waitFor({state:'detached'});

  const pecDeck = page.locator('details[data-workout-preview]').filter({hasText:'Pec Deck'});
  const remaining = page.locator('details[data-workout-rounds]');
  assert.equal(await pecDeck.evaluate(details=> details.open), false);
  assert.equal(await remaining.evaluate(details=> details.open), false);
  await pecDeck.locator('summary').click();
  assert.equal(await pecDeck.locator('input[data-f="weight"]').first().isVisible(), true);
  await remaining.locator('summary').click();
  assert.equal(await remaining.locator('input[data-f="weight"]').first().isVisible(), true);

  const reps = page.locator('input[data-e="0"][data-s="2"][data-f="reps"]');
  await reps.focus();
  await reps.fill('8');
  await page.waitForFunction(previous=> document.getElementById('workoutElapsed').textContent !== previous, elapsed);
  assert.equal(await reps.evaluate(input=> document.activeElement === input), true, 'clock tick preserves input focus');
  await page.locator('input[data-e="0"][data-s="2"][data-f="weight"]').fill('185');
  await page.locator('.chk[data-e="0"][data-s="2"]').click();
  assert.equal(await page.locator('#sbSets').textContent(), '3');
  assert.equal(await page.locator('#sbCount').textContent(), '1 / 5');

  const plan = await page.evaluate(()=> JSON.stringify(S.program.pushB));
  await page.locator('#workoutAddExercise').click();
  await page.locator('#addExName').fill('Dumbbell Curl');
  await page.locator('#addExGo').click();
  assert.equal(await page.evaluate(()=> S.active.entries.at(-1).name), 'Dumbbell Curl');
  assert.equal(await page.evaluate(()=> JSON.stringify(S.program.pushB)), plan);
  assert.equal(await page.locator('#sbCount').textContent(), '1 / 6');
  assert.deepEqual(errors, []);
  console.log('All good');
}finally{
  await browser.close();
  srv.close();
}
