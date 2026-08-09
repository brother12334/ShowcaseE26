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
  // "https://brother12334.github.io/ShowcaseE26/index.html",
  // "https://element26.example.com",
];

/* Models this proxy will forward. The app asks for one by name, and an allowlist stops
   a stranger pointing your key at a more expensive model. */
const ALLOWED_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];

const MAX_BODY_BYTES = 14 * 1024 * 1024;   // Gemini's own inline-data ceiling is ~15 MB
const GOOGLE = "https://generativelanguage.googleapis.com/v1beta/models/";

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

    /* `model` is the app's only say in where this goes, and it is checked rather than
       trusted. Everything else is passed through untouched. */
    const model = String(body.model || "");
    if (!ALLOWED_MODELS.includes(model)) {
      return fail(400, `Model "${model}" is not allowed by this proxy.`, origin);
    }
    delete body.model;

    let upstream;
    try {
      upstream = await fetch(GOOGLE + encodeURIComponent(model) + ":generateContent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY,
        },
        body: JSON.stringify(body),
      });
    } catch {
      return fail(502, "Couldn't reach Google from the proxy.", origin);
    }

    /* Verbatim, status included. A 429 from Google has to arrive at the app as a 429 or
       the rate-limit message it already has never fires. */
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "application/json",
        ...cors(origin),
      },
    });
  },
};
