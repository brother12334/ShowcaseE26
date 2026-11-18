import { appFile } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* NO TWO TOP-LEVEL DECLARATIONS MAY SHARE A NAME.

   A single file of this size has one failure mode that no runtime test reliably catches
   and no reviewer reliably sees: two top-level `function` declarations with the same
   name. Hoisting means the LATER one silently replaces the earlier everywhere, including
   in callers written against the first, and the symptom is an unrelated path quietly
   changing behaviour with nothing thrown and nothing logged.

   This codebase has hit it before with sidesOf/pairSidesOf. It is cheap to make
   impossible, so this makes it impossible.

   WHAT COUNTS AS TOP LEVEL: a declaration starting at column 0. That is the whole file's
   style for anything module-scope, and it keeps the check honest - a `const` inside a
   function is indented and is nobody's business here.

   `const`, `let` and `var` are included even though a duplicate `const` is a syntax
   error rather than a silent swap: the error it raises is at load, and a spec that names
   the two lines is a better way to find out than a blank screen. */
const SRC = readFileSync(appFile('index.html'), 'utf8');
const blocks = [...SRC.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m=> m[1]);
let bad = 0;
const ck = (what, ok, got)=>{ console.log((ok ? "  ok   " : "  BROKEN ") + what + (got === undefined ? "" : "  [" + got + "]")); if(!ok) bad++; };

const DECL = /^(?:async\s+)?(function|const|let|var)\s+([A-Za-z_$][\w$]*)/;
function declarationsIn(text){
  const out = [];
  text.split("\n").forEach((line, i)=>{
    const m = DECL.exec(line);
    if(m) out.push({kind: m[1], name: m[2], line: i + 1});
  });
  return out;
}
const all = [];
blocks.forEach((b, bi)=> declarationsIn(b).forEach(d=> all.push(Object.assign({block: bi}, d))));
console.log("    " + all.length + " top-level declarations across " + blocks.length + " script blocks");

const byName = {};
all.forEach(d=>{ (byName[d.name] = byName[d.name] || []).push(d); });
const dupes = Object.keys(byName).filter(n=> byName[n].length > 1);
dupes.forEach(n=> console.log("    DUPLICATE  " + n + "  " +
  byName[n].map(d=> d.kind + " at block " + d.block + " line " + d.line).join("  |  ")));
ck("no two top-level declarations share a name", dupes.length === 0,
   dupes.length ? dupes.join(", ") : "none");

/* THE CONTROL THAT MUST FIRE. A detector that never finds anything is indistinguishable
   from one that cannot. This feeds it a file it has to reject. */
const planted = declarationsIn([
  "function realOne(){ return 1; }",
  "  const indented = 2;            // not top level, must be ignored",
  "const realOne = 3;",
  "async function alsoTop(){}"
].join("\n"));
const plantedNames = {};
planted.forEach(d=>{ (plantedNames[d.name] = plantedNames[d.name] || []).push(d); });
ck("CONTROL: it sees a planted duplicate",
   (plantedNames.realOne || []).length === 2, JSON.stringify(Object.keys(plantedNames)));
ck("CONTROL: and ignores an indented one", !plantedNames.indented,
   Object.keys(plantedNames).join(","));
ck("CONTROL: and reads an async function as a declaration", !!plantedNames.alsoTop,
   Object.keys(plantedNames).join(","));

console.log(bad ? ("BROKEN: " + bad) : "all good");
process.exit(bad ? 1 : 0);
