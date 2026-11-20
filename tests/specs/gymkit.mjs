import { chromium, APP_URL, appFile, oldBuild } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* ITEM 26: THE LOAD ENGINE READS THE KIT IN THE ROOM YOU ARE STANDING IN.

   A gym's own plates, plate step and Smith carriage were stored, shown back on "Where you
   train", and ignored the moment a weight was suggested. smallestPlate(), loadStepFor()
   and smithWeight() each read the global profile, and nothing in the engine ever called
   kitFor(). Training at Lotus got home's grid -- and on a Smith, home's carriage, which
   is not a rounding difference but a straight error in the prescribed load: 25 lb at
   Palma Vista against 35 lb at Lotus and Uptown.

   Fixed at the five accessors rather than at the forty-odd call sites, so the default is
   the session you are in and a caller that means a specific session passes it.

   kitscan.mjs is the other half: a source scan that fails if anything outside kitFor
   reaches for gear on the global profile again. This spec is the behaviour. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
/* The build before the engine was routed through kitFor. */
const OLD = oldBuild("0bc4035");
const b = await chromium.launch();
let bad = 0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

async function openApp(url){
  const p = await b.newPage({viewport:{width:390,height:1200}});
  p.on('dialog',d=>d.accept());
  await p.addInitScript(()=>{ localStorage.clear();
    localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
    localStorage.setItem('e26.ns0','E26-X'); });
  await p.goto(url,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
  await p.evaluate(fx=>{
    window.boot = (mutate)=>{
      const sp=document.getElementById('splash'); if(sp) sp.remove();
      try{OB=null}catch(e){} try{PF=null}catch(e){} try{hideModal()}catch(e){}
      ['preflight','aiFull'].forEach(id=>{const el=document.getElementById(id); if(el) el.remove();});
      document.body.classList.remove('ai-open','onboarding','pfl-open');
      Object.keys(S).forEach(k=>{ delete S[k]; });
      Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
      S.tourDone = true;
      if(mutate) mutate(S);
      migrate(); try{ applySplit(); }catch(e){}
    };
    window.gymNamed = (n)=> (S.gyms || []).find(g=> (g.name || "").indexOf(n) === 0);
    /* Everything the engine can say about one movement, asked of one gym. */
    window.ask = (name, sess)=> ({
      implement: implementWeight(name, sess),
      step: loadStepFor(name, sess),
      plate: smallestPlate(sess),
      bar: barWeightFor(name, sess)
    });
  }, FX);
  await p.evaluate(()=> window.boot());
  return p;
}

const oldP = await openApp(OLD);
const newP = await openApp(APP_URL);

console.log("\n1. THE FIXTURE REALLY DOES HAVE TWO GYMS THAT DISAGREE");
/* Without this the rest of the spec proves nothing: two gyms with identical kit would
   agree on every build, broken or fixed. */
let r = await newP.evaluate(()=>{
  const g = n=> window.gymNamed(n) || {};
  return {palma: g("Palma").smith, lotus: g("Lotus").smith, uptown: g("Uptown").smith,
          global: trainPrefs().smithWeight,
          home: (homeGym()||{}).name};
});
ck("CONTROL: Palma Vista's carriage is on file", r.palma === 25, String(r.palma));
ck("CONTROL: and Lotus's is a different weight", r.lotus === 35, String(r.lotus));
ck("CONTROL: and Uptown's too", r.uptown === 35, String(r.uptown));
ck("CONTROL: home is Palma Vista, which is what the global profile matches",
   r.home === "Palma Vista Gym" && r.global === 25, r.home + " / " + r.global);

console.log("\n2. THE SAME MOVEMENT AT TWO GYMS, IN ONE RUN, GETS TWO ANSWERS");
const SMITH = "Smith Machine Squat";
r = await newP.evaluate(name=>{
  const at = n=> ({gymId: window.gymNamed(n).id});
  return {palma: window.ask(name, at("Palma")),
          lotus: window.ask(name, at("Lotus")),
          uptown: window.ask(name, at("Uptown"))};
}, SMITH);
ck("at Palma Vista the carriage is 25", r.palma.implement === 25, String(r.palma.implement));
ck("at Lotus, in the same run, it is 35", r.lotus.implement === 35, String(r.lotus.implement));
ck("and at Uptown, 35", r.uptown.implement === 35, String(r.uptown.implement));
ck("CONTROL: so the two gyms genuinely differ in what the engine says",
   r.palma.implement !== r.lotus.implement,
   r.palma.implement + " vs " + r.lotus.implement);
ck("and the bar inside the written load follows the same gym",
   r.palma.bar !== r.lotus.bar, r.palma.bar + " vs " + r.lotus.bar);

console.log("\n3. AND THE OLD BUILD GAVE ONE ANSWER FOR BOTH, WHICH WAS THE BUG");
const askBoth = (page, name)=> page.evaluate(n=>{
  const at = g=> ({gymId: window.gymNamed(g).id});
  return {palma: window.ask(n, at("Palma")).implement,
          lotus: window.ask(n, at("Lotus")).implement};
}, name);
const was = await askBoth(oldP, SMITH), now = await askBoth(newP, SMITH);
ck("CONTROL: the old build was asked the same question", was.palma === 25, String(was.palma));
ck("the old build gave Lotus home's carriage", was.lotus === 25, String(was.lotus));
ck("the new build gives Lotus its own", now.lotus === 35, String(now.lotus));
ck("and Palma Vista is unchanged, because its kit already matched the global profile",
   was.palma === now.palma, was.palma + " -> " + now.palma);

console.log("\n4. A GYM WITH NO KIT FALLS BACK TO HOME, NOT TO ZERO");
/* The failure mode a fallback chain fails into. A gym recorded with nothing on it must
   behave like the home gym, not like a room with no equipment in it. */
r = await newP.evaluate(name=>{
  boot(S2=>{ S2.gyms = (S2.gyms || []).concat([{id: "BARE", name: "Bare Gym"}]); });
  const bare = window.ask(name, {gymId: "BARE"});
  const untagged = window.ask(name, {});          // a session with no gym on it
  const home = window.ask(name, {gymId: window.gymNamed("Palma").id});
  const nothing = window.ask(name, null);         // "nothing is known" - the global profile
  return {bare, untagged, home, nothing};
}, SMITH);
ck("a gym with nothing on file answers with home's carriage",
   r.bare.implement === r.home.implement && r.bare.implement === 25,
   r.bare.implement + " vs home " + r.home.implement);
ck("  and home's step, not a zero", r.bare.step === r.home.step && r.bare.step > 0,
   r.bare.step + " vs home " + r.home.step);
ck("  and home's plates", r.bare.plate === r.home.plate && r.bare.plate > 0,
   r.bare.plate + " vs home " + r.home.plate);
ck("an untagged session is home, as item 10 settled",
   r.untagged.implement === r.home.implement, String(r.untagged.implement));
ck("CONTROL: and an explicit null still means the global profile",
   r.nothing.implement === 25, String(r.nothing.implement));

console.log("\n5. A PLATE GRID FOLLOWS THE GYM TOO");
/* The plates match across this fixture's gyms, so the rule is tested by giving one gym a
   thinner tree -- otherwise this section passes on two identical lists. */
r = await newP.evaluate(name=>{
  boot(S2=>{
    const l = (S2.gyms || []).find(g=> (g.name||"").indexOf("Lotus") === 0);
    l.plates = [45, 25, 10, 5];            // no 2.5s in this room
  });
  const at = n=> ({gymId: window.gymNamed(n).id});
  return {palma: window.ask(name, at("Palma")), lotus: window.ask(name, at("Lotus"))};
}, "Barbell Back Squat");
ck("CONTROL: the two rooms now have different plates",
   r.palma.plate !== r.lotus.plate, r.palma.plate + " vs " + r.lotus.plate);
ck("the room with 2.5s moves the bar in 5", r.palma.step === 5, String(r.palma.step));
ck("and the room without them moves it in 10", r.lotus.step === 10, String(r.lotus.step));

console.log("\n6. ONLY LOTUS AND UPTOWN CHANGE; EVERYTHING ELSE IS THE PREVIOUS BUILD");
/* The promise of this release, checked rather than asserted: every prescription at the
   home gym, and every untagged one, is identical to what the old build said. */
const sweep = page=> page.evaluate(()=>{
  boot();
  const NAMES = ["Smith Machine Squat", "Smith Machine Row", "Barbell Back Squat",
                 "Barbell Bench Press", "Dumbbell Row", "Cable Row", "Leg Press",
                 "Romanian Deadlift", "Overhead Press", "Lat Pulldown"];
  const out = {};
  const where = [["untagged", {}], ["null", null]];
  (S.gyms || []).forEach(g=> where.push([g.name || g.id, {gymId: g.id}]));
  where.forEach(([label, sess])=>{
    NAMES.forEach(n=>{
      const a = window.ask(n, sess);
      out[label + " | " + n] = a.implement + "/" + a.step + "/" + a.plate + "/" + a.bar;
    });
  });
  return out;
});
const before = await sweep(oldP), after = await sweep(newP);
const keys = Object.keys(before);
const changed = keys.filter(k=> before[k] !== after[k]);
const changedAway = changed.filter(k=> /^Lotus|^Uptown/.test(k));
ck("CONTROL: the sweep covered both builds the same way",
   keys.length === Object.keys(after).length && keys.length >= 50,
   keys.length + " prescriptions");
ck("every Palma Vista, untagged and global answer is unchanged",
   changed.length === changedAway.length,
   changed.filter(k=> !/^Lotus|^Uptown/.test(k)).slice(0, 6).join(" | "));
ck("CONTROL: and Lotus and Uptown really did change, or nothing was fixed",
   changedAway.length > 0,
   changedAway.length + " changed, e.g. " + changedAway.slice(0, 2)
     .map(k=> k + ": " + before[k] + " -> " + after[k]).join(" | "));

console.log("\n7. THE CHANGE IS THE CARRIAGE, AND ONLY ON SMITH WORK");
const smithOnly = changedAway.filter(k=> !/Smith/.test(k));
ck("nothing that is not a Smith movement moved", smithOnly.length === 0,
   smithOnly.join(" | "));
ck("CONTROL: and the Smith ones moved by the difference between the two carriages",
   changedAway.every(k=> before[k].split("/")[0] === "25" && after[k].split("/")[0] === "35"),
   changedAway.map(k=> before[k] + " -> " + after[k]).slice(0, 2).join(" | "));

await b.close();
console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
