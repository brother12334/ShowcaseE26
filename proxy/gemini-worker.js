/**
 * Element 26 — plan-reader proxy
 *
 * Element 26 is one static HTML file, which means anything inside it is public the
 * moment it is served. A Gemini key in that file is readable by every visitor and by
 * every scanner that crawls public sites, and no amount of encoding changes that: the
 * browser has to reconstruct the real key to send it, so obfuscation hides it from the
 * scanner and not from the person you are actually worried about.
 *
 * This Worker is the way out. It holds the key as a Cloudflare secret, and the app
 * calls THIS instead of Google. Requests leaving the browser carry no credential at
 * all, so there is nothing in the page to find, report, or rotate.
 *
 * What it does, and deliberately nothing else:
 *   • answers the CORS preflight
 *   • refuses anything that is not a POST from an origin you listed
 *   • caps the body so it cannot be used to relay something enormous
 *   • pins the model to a list, so it cannot be turned into a general-purpose Gemini
 *   • attaches the key and forwards to Google, returning the response verbatim
 *
 * Returning Google's response untouched matters: the app already knows how to read
 * Google's error shapes, so proxied and direct modes fail identically and there is one
 * set of error messages to maintain rather than two.
 *
 * Deploy: see README.md in this folder.
 */

/* Who may call this. An empty list would make the Worker a free Gemini endpoint for
   anyone who found the URL, so it is not allowed to be empty — see the guard in
   fetch(). Use the exact scheme+host you serve the app from. */
const ALLOWED_ORIGINS = [
  "https://brother12334.github.io",
];

/* Models this proxy will forward when the APP asks for one by name. The allowlist stops
   a stranger pointing your key at something more expensive; it is not a claim that any
   of these still exist, which is what resolveModel() below is for. */
/* Refreshed after gemini-2.5-flash, gemini-2.0-flash and gemini-3-flash all turned out
   to be retired for this key ("no longer available to new users"/"no longer available"),
   confirmed by calling each directly. gemini-3.6-flash and gemini-3.5-flash-lite are
   confirmed live. gemini-flash-latest stays in the list even though it is no longer the
   app's own default — it is still a valid thing for resolveModel() below to land on. */
const ALLOWED_MODELS = [
  "gemini-flash-latest",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
];

/* WHY THIS PROXY PICKS ITS OWN MODEL WHEN THE NAMED ONE IS GONE.
   Google retires model names on its own schedule, and does it per-key: a name that
   works for an account set up last year answers "no longer available to new users" for
   one set up last week. A hard-coded name is therefore a scheduled outage — the app
   keeps working right up until the day it doesn't, and the person who has to fix it is
   whoever published the file, not the person standing in the gym trying to import a
   plan. So a 404 is treated as "that name is gone", not as a fatal error: the Worker
   asks Google what this key can actually use, picks the closest thing, and retries once.

   Preference order, highest score first. Flash-class only, because all this does is
   read a document into JSON — reasoning models cost more and are no better at it. */
function scoreModel(name) {
  let s = 0;
  if (/flash/.test(name)) s += 100;          // fast and cheap, which is the whole job
  if (/-latest$/.test(name)) s += 50;        // an alias survives the next retirement
  if (/lite/.test(name)) s -= 15;            // capable enough beats cheapest
  if (/preview|-exp|experimental/.test(name)) s -= 40;   // never pin to a preview
  const v = parseFloat((name.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] || 0);
  s += v * 5;                                // newer generation wins ties
  return s;
}

/* Cached per isolate so the extra lookup happens roughly once, not once per import.
   The TTL is short enough that fixing things on Google's side takes effect the same
   hour rather than needing a redeploy. */
let RESOLVED = null;
const RESOLVE_TTL_MS = 60 * 60 * 1000;

const MAX_BODY_BYTES = 14 * 1024 * 1024;   // Gemini's own inline-data ceiling is ~15 MB
const API = "https://generativelanguage.googleapis.com/v1beta";
const GOOGLE = API + "/models/";

/* Every model this key may actually call, which is the only authority on the question.
   Filtered to the ones that support generateContent, because the list also carries
   embedding and other models that would 404 in a different way. */
async function availableModels(key) {
  let r;
  try {
    r = await fetch(API + "/models?pageSize=200", { headers: { "x-goog-api-key": key } });
  } catch {
    return [];
  }
  if (!r.ok) return [];
  const j = await r.json().catch(() => ({}));
  return (j.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map((m) => String(m.name || "").replace(/^models\//, ""))
    .filter(Boolean);
}

async function resolveModel(key, avoid) {
  if (RESOLVED && Date.now() - RESOLVED.at < RESOLVE_TTL_MS && RESOLVED.name !== avoid) {
    return RESOLVED.name;
  }
  const list = (await availableModels(key)).filter((m) => m !== avoid);
  if (!list.length) return null;
  const best = list.sort((a, b) => scoreModel(b) - scoreModel(a))[0];
  RESOLVED = { name: best, at: Date.now() };
  return best;
}

async function callGoogle(model, body, key) {
  return fetch(GOOGLE + encodeURIComponent(model) + ":generateContent", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body),
  });
}

/* The app reads `error.message` out of whatever comes back, so failures raised HERE use
   Google's error shape too. Otherwise a proxy rejection would surface as a blank. */
const fail = (status, message, origin) =>
  json({ error: { code: status, message } }, status, origin);

const json = (obj, status, origin) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...cors(origin) },
  });

const cors = (origin) => ({
  "Access-Control-Allow-Origin": origin || "null",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
});

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = ALLOWED_ORIGINS.includes(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(allowed ? origin : "") });
    }
    if (request.method !== "POST") {
      return fail(405, "This endpoint only accepts POST.", "");
    }
    if (!ALLOWED_ORIGINS.length) {
      /* Left unconfigured this would relay for anyone, so it refuses instead. 403 maps
         to the app's "problem at our end, not yours" message, which is exactly right:
         it is the publisher's to fix. */
      return fail(403, "Proxy has no allowed origins configured.", "");
    }
    if (!allowed) {
      return fail(403, "Origin not allowed.", "");
    }
    if (!env.GEMINI_API_KEY) {
      return fail(500, "Proxy is missing its GEMINI_API_KEY secret.", origin);
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return fail(413, "That request was too large to forward.", origin);
    }

    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return fail(400, "Body was not valid JSON.", origin);
    }

    /* A diagnostic, not a feature: {"list":true} answers with every model this key can
       actually call. It is behind the same origin check as everything else, so it is
       reachable from your own site's console and nowhere else, and it exists because
       "which models do I have?" is otherwise unanswerable without putting the key
       somewhere it should not go. */
    if (body && body.list === true) {
      const models = await availableModels(env.GEMINI_API_KEY);
      return json({ models, resolved: RESOLVED && RESOLVED.name }, 200, origin);
    }

    /* `model` is the app's only say in where this goes, and it is checked rather than
       trusted. Everything else is passed through untouched. */
    const model = String(body.model || "");
    if (!ALLOWED_MODELS.includes(model)) {
      return fail(400, `Model "${model}" is not allowed by this proxy.`, origin);
    }
    delete body.model;

    let upstream;
    try {
      upstream = await callGoogle(model, body, env.GEMINI_API_KEY);
    } catch {
      return fail(502, "Couldn't reach Google from the proxy.", origin);
    }

    /* The model was retired (404), or THIS SPECIFIC MODEL has hit its own quota (429).
       Both are the same underlying situation from here — this one name is not usable
       right now for a reason that has nothing to do with the request — so both ask what
       else this key can call and retry once. A 400 is different in kind: the request
       itself is malformed, and no amount of switching models fixes that, so it is left
       alone.

       429 was added to this list after "gemini-flash-latest" landed on a brand-new
       model with a 20-request daily free cap, RESOURCE_EXHAUSTED, quotaId
       GenerateRequestsPerDayPerProjectPerModel-FreeTier — a genuinely per-MODEL quota,
       confirmed by the same key succeeding immediately against a different model. The
       existing `avoid` parameter to resolveModel() is what keeps the retry from landing
       right back on the model that just failed: it filters that name out of the
       candidates before scoring, so a fresh lookup cannot simply re-choose it. */
    let served = model;
    if (upstream.status === 404 || upstream.status === 429) {
      const alt = await resolveModel(env.GEMINI_API_KEY, model);
      if (alt) {
        try {
          const retry = await callGoogle(alt, body, env.GEMINI_API_KEY);
          upstream = retry;
          served = alt;
        } catch {
          /* keep the original error, which at least carries Google's explanation */
        }
      }
    }

    /* Verbatim, status included. A 429 from Google has to arrive at the app as a 429 or
       the rate-limit message it already has never fires. The extra header names which
       model actually answered, so a substitution is visible in the network tab instead
       of being silent. */
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "application/json",
        "X-E26-Model": served,
        ...cors(origin),
      },
    });
  },
};
