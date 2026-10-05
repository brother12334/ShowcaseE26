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
import { mkdirSync } from "node:fs";
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
