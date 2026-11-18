import { appFile } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* ONE FEATURE, ONE SET OF CLASS NAMES.

   Rule G shipped a panel whose styles reused the `chg-` prefix that the change chips on
   the exercise card already owned. Its `.chg-sub` rule added `text-transform:uppercase`,
   and because innerText reflects text-transform, a sentence the user reads mid-session
   silently rendered in capitals — a visible regression, and a failing spec whose cause
   took a bisect to find, because CSS needs no call site and throws nothing.

   The duplicate-DECLARATION check cannot catch that: a class defined in two rules is
   ordinary CSS. What is not ordinary is one SECTION of this stylesheet defining a class
   another section already defines, because the sections are features and a feature's
   class names are its own.

   HOW A SECTION IS FOUND: the stylesheet is cut at every banner comment — a comment
   opening with a run of dashes or equals signs, which is how this file has always
   separated its features. The check understands nothing else about CSS, deliberately.

   (This paragraph deliberately does not spell those banners out. An earlier draft did,
   and a block comment containing the characters that close a block comment ended itself
   three lines early — which is its own small lesson about one-file projects.)

   THE ALLOWLIST IS A SNAPSHOT, NOT AN ENDORSEMENT. 172 classes already crossed sections
   when this guard was written — `.btn`, `.card`, `.dot` and other genuinely shared
   furniture, alongside some that are probably accidents nobody has been bitten by yet.
   Grandfathering them is what makes the guard shippable today; every NEW crossing fails.
   Removing an entry from the fixture is a fine way to tighten it later. */
const SRC = readFileSync(appFile('index.html'), 'utf8');
const SHARED = new Set(JSON.parse(readFileSync(appFile('tests/fixtures/css-shared-classes.json'), 'utf8')));
let bad = 0;
const ck = (what, ok, got)=>{ console.log((ok ? "  ok   " : "  BROKEN ") + what + (got === undefined ? "" : "  [" + got + "]")); if(!ok) bad++; };

const BANNER = /\/\*\s*(?:-{2,}|={2,})/g;
function sectionsOf(css){
  const marks = [...css.matchAll(BANNER)].map(m=> m.index);
  const bounds = [0, ...marks, css.length];
  const out = [];
  for(let i = 0; i < bounds.length - 1; i++) out.push(css.slice(bounds[i], bounds[i+1]));
  return out;
}
function classesIn(text){
  const t = text.replace(/\/\*[\s\S]*?\*\//g, "");
  const out = new Set();
  for(const m of t.matchAll(/([^{}]+)\{/g)){
    const sel = m[1];
    if(sel.indexOf("@") > -1) continue;            // at-rules are not selectors
    for(const c of sel.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) out.add(c[1]);
  }
  return out;
}
function crossings(css){
  const owner = {};
  sectionsOf(css).forEach((sec, i)=>{
    classesIn(sec).forEach(c=>{ (owner[c] = owner[c] || new Set()).add(i); });
  });
  return Object.keys(owner).filter(c=> owner[c].size > 1);
}

const css = (SRC.match(/<style[^>]*>([\s\S]*?)<\/style>/) || [])[1] || "";
ck("the stylesheet was found", css.length > 1000, css.length + " chars");
const cross = crossings(css);
const fresh = cross.filter(c=> !SHARED.has(c));
fresh.forEach(c=> console.log("    NEW CROSSING  ." + c));
console.log("    " + cross.length + " classes cross a section boundary, " + SHARED.size + " of them grandfathered");
ck("no class is defined in a second feature's section", fresh.length === 0,
   fresh.join(", ") || "none");

/* THE CONTROL THAT MUST FIRE: the exact shape of the bug this exists for — a new
   section redefining a class an earlier section owns. */
const planted = crossings([
  "/* ---- the chips ---- */",
  ".chg-sub{font-size:11px}",
  "/* ---- something new ---- */",
  ".chg-sub{text-transform:uppercase}",
  ".brand-new{color:red}"
].join("\n"));
ck("CONTROL: it catches a class redefined in a later section",
   planted.indexOf("chg-sub") > -1, planted.join(",") || "nothing");
ck("CONTROL: and leaves a class used once alone",
   planted.indexOf("brand-new") < 0,
   planted.indexOf("brand-new") < 0 ? "brand-new not flagged" : "brand-new wrongly flagged");

console.log(bad ? ("BROKEN: " + bad) : "all good");
process.exit(bad ? 1 : 0);
