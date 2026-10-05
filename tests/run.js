#!/usr/bin/env node
/* THE ONE COMMAND. Runs every phase spec against the real index.html and exits non-zero
   if any of them reports a failure.

   The specs live in the scratchpad because that is where they are written and iterated;
   this walks whatever is there, so adding a spec to the sweep adds it here too. Each one
   prints "all good" or "BROKEN: n" as its last line, which is the contract. */
const { spawnSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const path = require("node:path");

const SPECS = ["selftest", "phase2", "phase3", "phase4", "phase5", "phase6",
               "restdays", "daypick", "bwsay"];
const DIR = process.env.E26_SPEC_DIR
  || "/tmp/claude-0/-home-user-ShowcaseE26/cb903a36-3103-5d6a-a18b-78ade397246e/scratchpad";

let bad = 0, ran = 0;
for(const name of SPECS){
  const file = path.join(DIR, name + ".mjs");
  if(!existsSync(file)){ console.log("SKIP " + name + " (not found)"); continue; }
  const out = spawnSync("node", [file], {encoding: "utf8", timeout: 300000});
  const text = (out.stdout || "") + (out.stderr || "");
  const failed = out.status !== 0 || /BROKEN|^ERR |Error:/m.test(text);
  ran++;
  if(failed){
    bad++;
    console.log("FAIL " + name);
    text.split("\n").filter(l=> /BROKEN|ERR |Error:/.test(l)).slice(0, 8)
        .forEach(l=> console.log("     " + l.trim()));
  } else {
    console.log("ok   " + name);
  }
}
console.log(bad ? (bad + " of " + ran + " specs failed") : (ran + " specs passed"));
process.exit(bad ? 1 : 0);
