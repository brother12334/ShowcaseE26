import { appFile } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* NOTHING OUTSIDE kitFor READS THE GEAR OFF THE GLOBAL PROFILE.

   Item 26: a gym's own plates, plate step and Smith carriage were stored, shown back on
   "Where you train", and ignored the moment a weight was suggested, because
   smallestPlate(), loadStepFor() and smithWeight() each read trainPrefs() directly and
   nothing in the engine called kitFor(). Training at Lotus got home's grid, and on a
   Smith it got home's carriage -- a 25 lb figure standing in for a 35 lb one, which is a
   straight error in the prescribed load.

   The fix routes the engine through kitFor. THIS IS THE GUARD THAT KEEPS IT ROUTED. A
   source scan, not a browser test, because the failure it prevents is somebody reaching
   for trainPrefs().smithWeight in a new function six months from now -- which no
   behavioural test will catch unless it happens to exercise that exact path at a gym
   whose kit differs.

   WHAT IS ALLOWED, and each one says why:
     - kitFor itself, which is the one place that merges a gym over the global.
     - the Settings screens, which EDIT the global profile and must read and write it.
     - rackMaxSrc, which has its own gym chain for its own argued reason.
     - the defaults and the migration scan, which are about the global profile as such.

   Anything else that reads a gear field off trainPrefs() is the bug coming back. */
const SRC = readFileSync(appFile('index.html'), 'utf8');
const LINES = SRC.split("\n");
let bad = 0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

/* The fields that describe GEAR. barMode is not one: it is the convention you write
   loads in, which does not change when you walk into a different room, and kitFor
   returns the global one deliberately. */
const GEAR = ["smithWeight", "barWeight", "plateStep", "plates", "dbStep", "dbMax", "stackStep"];

/* Functions allowed to read the global gear, by the name of the function they sit in. */
const ALLOWED = [
  /* THE MERGE ITSELF, and the chain that feeds it. */
  "kitFor",
  "smallestPlate",     // the gym's own list first, the global list behind it
  "smallestPlateAt",   // asked about one named gym
  "platesOwned",       // asked about whichever object it is handed
  "rackMaxSrc",        // its own gym chain, argued where it is written
  /* THE SCREENS THAT EDIT THE GLOBAL PROFILE. They must read and write it: that is what
     they are for. A load is never computed in any of them. */
  "bind",              // bindPrefs' inner binder, where every Settings control writes
  "openBarModal",      // the bar / carriage sheet
  "prefsGymHTML",      // "In the gym"
  "gymGearHTML",       // the per-gym editor, which shows the global as "usual"
  "setGroups",         // the Settings tile's one-line value
  "addGym",            // a new gym starts from the global kit, deliberately
  /* AND THE PLACES THAT DESCRIBE THE PROFILE RATHER THAN USE IT. */
  "plateDeriveScan",   // the item 25 migration: stored against derived
  "plateDeriveCardHTML",
  "plateJumpSay",
  "barWeightPickHTML",
  "patchPlanSummary",
  "exportObject",
  "backupObject"
];

/* Which function a line is in: the nearest preceding declaration AT COLUMN ZERO.

   Allowing an indented one attributed every line inside kitFor to `pick`, its own inner
   helper, and every line of bindPrefs to whichever arrow function was declared above it
   -- so the allow-list matched nothing and the scan reported eleven false hits. In this
   file every function the allow-list names is top level and unindented, which makes the
   anchor unambiguous. */
function fnAt(i){
  for(let j = i; j >= 0; j--){
    const m = LINES[j].match(/^(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/);
    if(m) return m[1];
    const c = LINES[j].match(/^(?:const|let)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?(?:function|\()/);
    if(c) return c[1];
  }
  return "(top level)";
}

console.log("\n1. THE SCAN FINDS WHAT IT IS LOOKING FOR");
/* A guard that matches nothing passes forever. Before trusting a clean result, the same
   pattern is run against a line that is definitely there. */
const probe = LINES.findIndex(l=> /smithWeight:\s*pick\("smith"/.test(l));
ck("CONTROL: kitFor's own merge was located", probe > -1, "line " + (probe + 1));
ck("CONTROL: and the line is attributed to kitFor", fnAt(probe) === "kitFor", fnAt(probe));

const FAKE = 'const w = trainPrefs().smithWeight;';
const RE = new RegExp("trainPrefs\\(\\)\\s*\\.\\s*(" + GEAR.join("|") + ")\\b");
ck("CONTROL: and the pattern matches a global gear read when it sees one",
   RE.test(FAKE), FAKE);

console.log("\n2. NOTHING OUTSIDE kitFor READS GEAR OFF THE GLOBAL PROFILE");
const hits = [];
LINES.forEach((l, i)=>{
  if(!RE.test(l)) return;
  const fn = fnAt(i);
  if(ALLOWED.indexOf(fn) > -1) return;
  hits.push((i + 1) + " in " + fn + ": " + l.trim().slice(0, 96));
});
ck("every gear read is inside kitFor or a screen that edits the profile",
   hits.length === 0, hits.join("\n          "));

console.log("\n3. AND THE SAME, FOR A LOCAL ALIAS OF trainPrefs()");
/* `const p = trainPrefs()` then `p.smithWeight` is the same bug wearing a hat, and it is
   how three of the four original readers were written. A function that aliases
   trainPrefs() and then reads a gear field off the alias is reported the same way. */
const starts = [];
LINES.forEach((l, i)=>{
  if(/^(?:async\s+)?function\s+[A-Za-z0-9_$]+\s*\(/.test(l)) starts.push(i);
});
const aliased = [];
starts.forEach((s0, n)=>{
  const end = n + 1 < starts.length ? starts[n + 1] : LINES.length;
  const fn = fnAt(s0);
  if(ALLOWED.indexOf(fn) > -1) return;
  const body = LINES.slice(s0, end);
  /* Which local names hold the global profile in this function. */
  const names = [];
  body.forEach(l=>{
    const m = l.match(/(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*trainPrefs\(\)\s*;/);
    if(m) names.push(m[1]);
  });
  if(!names.length) return;
  const gre = new RegExp("\\b(" + names.join("|") + ")\\s*\\.\\s*(" + GEAR.join("|") + ")\\b");
  body.forEach((l, k)=>{
    if(gre.test(l)) aliased.push((s0 + k + 1) + " in " + fn + ": " + l.trim().slice(0, 96));
  });
});
ck("CONTROL: the alias sweep looked at real functions", starts.length > 200,
   starts.length + " top-level functions");
ck("no function aliases trainPrefs() and then reads gear off it",
   aliased.length === 0, aliased.join("\n          "));

console.log("\n4. THE FIVE ACCESSORS TAKE A SESSION");
/* The whole fix is that these read the kit in force. A later edit that drops the
   parameter would put the engine back on the global profile without tripping anything
   above, because it would stop reading trainPrefs() directly and start reading the
   wrong kit instead. */
[["smithWeight", /function smithWeight\(sess\)/],
 ["implementWeight", /function implementWeight\(name, sess\)/],
 ["barWeightFor", /function barWeightFor\(name, sess\)/],
 ["loadStepFor", /function loadStepFor\(name, sess\)/],
 ["smallestPlate", /function smallestPlate\(sess\)/]
].forEach(([n, re])=> ck("  " + n + " takes the session it is judging", re.test(SRC)));
ck("and each one resolves it through kitNow",
   (SRC.match(/kitNow\(/g) || []).length >= 6,
   (SRC.match(/kitNow\(/g) || []).length + " calls");

console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
