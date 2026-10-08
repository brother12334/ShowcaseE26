#!/usr/bin/env node
/* THE ONE COMMAND. Runs every spec in tests/specs against the real index.html and exits
   non-zero if any of them reports a failure.

   This used to walk a directory inside the session that wrote the specs, and SKIP
   anything it could not find — so a suite with every spec missing passed silently, which
   is the worst possible behaviour for a test runner. The specs are in the repository now,
   and a missing one is a failure, not a skip.

   Each spec prints "all good" or "BROKEN: n" as its last line, and exits non-zero on
   failure. That is the contract. */
const { spawnSync } = require("node:child_process");
const { existsSync, readdirSync } = require("node:fs");
const path = require("node:path");

const DIR = process.env.E26_SPEC_DIR || path.join(__dirname, "specs");

/* THE MANIFEST. Every spec that must exist for this suite to mean anything. A file
   missing from disk fails the run; a file on disk but absent from here still runs (see
   below), so adding a spec is one file and forgetting to list it costs nothing. The
   names are listed so that deleting a spec is a deliberate act with a diff, rather than
   something that happens by accident and goes unnoticed. */
const REQUIRED = [
  "selftest", "phase2", "phase3", "phase4", "phase5", "phase6", "phase7", "phase9",
  "streak", "share", "budget", "science", "news", "weekword", "progtidy", "volrows", "polish", "motion", "logger", "rest2", "bodymap", "history", "sheets", "navstick",
  "restdays", "daypick", "bwsay", "bwoffer", "planlook", "gradeup", "volfix", "volmodel", "volmig", "trendnoise", "volsource", "volgloss", "volclimb", "volstep",
  "level", "caps", "eating"
];

const onDisk = existsSync(DIR)
  ? readdirSync(DIR).filter(f=> f.endsWith(".mjs") && !f.startsWith("_"))
      .map(f=> f.replace(/\.mjs$/, "")).sort()
  : [];

const only = process.argv.slice(2).filter(a=> !a.startsWith("-"));
const missing = REQUIRED.filter(n=> onDisk.indexOf(n) < 0);
if(missing.length){
  console.error("MISSING " + missing.length + " required spec"
    + (missing.length === 1 ? "" : "s") + " in " + DIR + ":");
  missing.forEach(n=> console.error("  " + n + ".mjs"));
  console.error("\nThese are listed in REQUIRED in this file. Either the specs were not "
    + "committed, or\nthe checkout is incomplete. Nothing was run.");
  process.exit(2);
}
if(!onDisk.length){
  console.error("No specs found in " + DIR + ". Nothing was run.");
  process.exit(2);
}

const list = only.length ? onDisk.filter(n=> only.indexOf(n) >= 0) : onDisk;
if(only.length){
  const unknown = only.filter(n=> onDisk.indexOf(n) < 0);
  if(unknown.length){ console.error("No such spec: " + unknown.join(", ")); process.exit(2); }
}

let bad = 0, ran = 0;
const failed = [];
for(const name of list){
  const file = path.join(DIR, name + ".mjs");
  const out = spawnSync("node", [file], {encoding: "utf8", timeout: 300000});
  const text = (out.stdout || "") + (out.stderr || "");
  const broke = out.status !== 0 || /BROKEN|^ERR |Error:/m.test(text);
  ran++;
  if(broke){
    bad++; failed.push(name);
    console.log("FAIL " + name);
    text.split("\n").filter(l=> /BROKEN|ERR |Error:/.test(l)).slice(0, 8)
        .forEach(l=> console.log("     " + l.trim()));
  } else {
    console.log("ok   " + name);
  }
}

/* The worker's own tests test a file in the repository and need no browser. Run last: a
   failure here is a failure of the share routes, not of the app. */
if(!only.length){
  const wf = path.join(__dirname, "share-worker.mjs");
  if(existsSync(wf)){
    const out = spawnSync("node", [wf], {encoding: "utf8", timeout: 120000});
    const text = (out.stdout || "") + (out.stderr || "");
    if(out.status !== 0 || /BROKEN|Error:/m.test(text)){
      bad++; failed.push("share-worker");
      console.log("FAIL share-worker");
      text.split("\n").filter(l=> /BROKEN|Error:/.test(l)).slice(0, 8)
          .forEach(l=> console.log("     " + l.trim()));
    } else { console.log("ok   share-worker"); ran++; }
  } else {
    console.error("MISSING tests/share-worker.mjs");
    bad++;
  }
}

console.log(bad ? "\n" + bad + " of " + ran + " failed: " + failed.join(", ")
                : "\n" + ran + " specs passed");
process.exit(bad ? 1 : 0);
