/* THE ONE THING EVERY SPEC NEEDS, AND THE ONLY PLACE A PATH IS WRITTEN DOWN.

   These specs used to carry three absolute paths each: the app at
   /home/user/ShowcaseE26/index.html, Playwright at /opt/node22/..., and a scratchpad to
   drop screenshots in. All three were facts about one machine, which is why the suite
   could not be run from a fresh clone of this repository — the thing a test suite most
   needs to be able to do.

   Everything is resolved from this file's own location instead, so the specs run wherever
   the repository is checked out. */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(here, "..", "..");

/* The app under test, as a file:// URL. Specs pass this straight to page.goto(). */
export const APP_URL = "file://" + path.join(REPO, "index.html");
export const fileUrl = rel=> "file://" + path.join(REPO, rel);
/* And as a path, for the specs that read the source rather than drive it. */
export const appFile = rel=> path.join(REPO, rel);

/* Screenshots and other droppings go somewhere ignored by git, created on demand. */
export const SHOT_DIR = process.env.E26_SHOT_DIR || path.join(REPO, "tests", ".out");
/* The same directory as a prefix, for the specs that built their own paths by
   concatenation rather than calling a helper. */
export const shotDir = ()=>{
  try{ mkdirSync(SHOT_DIR, {recursive: true}); }catch(e){}
  return SHOT_DIR + path.sep;
};
export const shot = name=>{
  try{ mkdirSync(SHOT_DIR, {recursive: true}); }catch(e){}
  return path.join(SHOT_DIR, name);
};

/* AN EARLIER BUILD OF THE APP, FOR THE CONVERSION SPECS TO COMPARE AGAINST.

   Each Settings conversion is held against the screen it replaced, which means loading
   two builds side by side. The first six did that by reading a file somebody had dropped
   in a scratchpad by hand -- an absolute path, in a directory this repository does not
   create, holding whatever build was copied there last. Three specs shared the one path.
   Refreshing it for a seventh conversion silently changed what the other two were
   comparing against, and one of them failed on a build it was never written for. From a
   fresh clone all three simply could not run.

   So the old build comes out of git, at a commit the spec names, into a file of its own.
   `git show <ref>:index.html` is the whole mechanism. The copy is cached, because a spec
   that shells out to git on every run is a spec nobody waits for.

   The ref a spec passes is the commit BEFORE its screen was converted, which is the only
   build the comparison means anything against. */
export function oldBuild(ref){
  const dir = path.join(REPO, "tests", ".old");
  /* THE CACHE KEY HAS TO BE THE COMMIT, NOT THE WORD FOR IT. This wrote
     tests/.old/HEAD~1.html and then reused it whenever a spec asked for "HEAD~1" again
     — so after the next commit, every spec comparing itself against the build it
     replaced was comparing itself against whatever HEAD~1 meant the last time anybody
     ran it. dgtoday's "nothing went missing" guard spent a day reading a file from the
     day before, which is the quietest way a guard can stop guarding. Resolved to a sha,
     the name can move and the cache still means what it says. */
  let key = ref;
  try{
    key = execFileSync("git", ["rev-parse", ref], {cwd: REPO, encoding: "utf8"}).trim()
      || ref;
  }catch(e){ /* not a resolvable ref; fall back to the literal, as before */ }
  const file = path.join(dir, key + ".html");
  if(!existsSync(file)){
    mkdirSync(dir, {recursive: true});
    let src;
    try{
      src = execFileSync("git", ["show", ref + ":index.html"],
        {cwd: REPO, maxBuffer: 256 * 1024 * 1024, encoding: "utf8"});
    }catch(e){
      throw new Error("Could not read index.html at " + ref + " out of git. This spec "
        + "compares a converted screen against the build it replaced, so it needs that "
        + "commit to be present (a shallow clone may not have it). " + e.message);
    }
    writeFileSync(file, src);
  }
  return "file://" + file;
}

/* PLAYWRIGHT, WHEREVER IT LIVES. An installed dependency first, because that is what a
   fresh clone running `npm i -D playwright` gets; then the path this suite was written
   against; then an explicit override for anything else. A clear error beats a stack
   trace about a missing module nobody can place. */
const require_ = createRequire(import.meta.url);
async function loadPlaywright(){
  const tries = [process.env.E26_PLAYWRIGHT, "playwright",
                 "/opt/node22/lib/node_modules/playwright/index.mjs"].filter(Boolean);
  for(const spec of tries){
    try{ return await import(spec); }catch(e){}
    try{ return require_(spec); }catch(e){}
  }
  throw new Error("Playwright not found. Install it (npm i -D playwright) or set "
    + "E26_PLAYWRIGHT to its entry point. Tried: " + tries.join(", "));
}
const pw = await loadPlaywright();
export const chromium = pw.chromium;
export default pw;
