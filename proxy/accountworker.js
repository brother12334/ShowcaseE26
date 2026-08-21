/**
 * Element 26 — account service
 *
 * Optional. Element 26 works without it: an account created with no service configured
 * is real, it names and namespaces your data, and it lives on the device that made it.
 * Deploy this and the same account becomes portable — sign in on a phone with the ID and
 * recovery key from a laptop and the log follows.
 *
 * WHAT AN ACCOUNT IS HERE
 *
 *   id   E26-XXXX-XXXX. Public-ish: shown to the user, written on paper, quoted in a
 *        support email. It NAMES an account.
 *   key  32 hex characters, generated once, never shown again except in the user's own
 *        Settings screen. It AUTHENTICATES the account.
 *
 * The distinction is the entire security model, so it is enforced in one place and only
 * one place: auth() below. Every route that touches private data goes through it, it
 * requires both halves, and it compares the key in constant time against the stored
 * hash. An id on its own — the thing most likely to leak — reads nothing and writes
 * nothing. There is no route that takes an id alone and answers with data, and no route
 * that lets a caller name whose data it wants: the account is derived from the
 * credential, never from a parameter, which is what makes "change the id in the URL"
 * impossible rather than merely discouraged.
 *
 * The key is stored as a SHA-256 hash. A dump of the KV namespace therefore does not
 * hand anybody the credentials it protects.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *   • no email, no password, no reset flow — there is nothing to phish, and nothing to
 *     take over. Lose both halves and the account is gone; the app says so plainly at
 *     sign-up rather than implying a recovery that does not exist.
 *   • no listing, no search, no admin route. There is no way to enumerate accounts.
 *   • no GitHub. The gist/repo backup in the app is separate, optional and invisible to
 *     anyone who has not deliberately set it up.
 *
 * DEPLOY
 *
 *   wrangler kv namespace create E26_ACCOUNTS
 *   # put the returned id in wrangler.accounts.toml (see proxy/README.md)
 *   wrangler deploy proxy/accountworker.js --name element26-accounts --config wrangler.accounts.toml
 *
 * Then set E26_API in index.html to the Worker's URL. No secret goes in the page.
 */

const ALLOWED_ORIGINS = [
  "https://brother12334.github.io",
];

const MAX_BODY = 4 * 1024 * 1024;      // a very long training history is ~1 MB of JSON
/* Account creation is the one route that makes something out of nothing, so it is the
   one worth abusing: a loop against it fills the namespace and burns the free tier.
   Capped per client address per hour. Deliberately coarse — KV is eventually consistent
   and this is a damper, not a quota — and deliberately not applied to the authenticated
   routes, where the credential is already the limit. */
const NEW_ACCOUNTS_PER_HOUR = 20;
const ID_RE = /^E26-[0-9A-Z]{4}-[0-9A-Z]{4}$/;
const KEY_RE = /^[a-f0-9]{32,64}$/;
const ID_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function cors(origin) {
  const ok = ALLOWED_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin : ALLOWED_ORIGINS[0] || "null",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}
function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors(origin) },
  });
}
function randomFrom(alphabet, n) {
  const buf = new Uint32Array(n);
  crypto.getRandomValues(buf);
  let out = "";
  for (let i = 0; i < n; i++) out += alphabet[buf[i] % alphabet.length];
  return out;
}
function newId() {
  return "E26-" + randomFrom(ID_ALPHABET, 4) + "-" + randomFrom(ID_ALPHABET, 4);
}
function newKey() {
  return randomFrom("abcdef0123456789", 32);
}
async function sha256(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}
/* Length-independent, branch-free comparison. Overkill for a KV lookup on the edge, and
   still the right habit: a comparison that returns early on the first wrong character
   leaks how much of a guess was right. */
function sameSecret(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* THE ONLY WAY TO IDENTIFY A CALLER. Returns the account, or null. Note what it does
   not accept: an id in the path, an id in the body, an id in a query string. The caller
   presents a credential and the account falls out of it. */
async function auth(request, env) {
  const header = request.headers.get("Authorization") || "";
  const m = /^Bearer\s+(E26-[0-9A-Z]{4}-[0-9A-Z]{4})\.([a-f0-9]{32,64})$/.exec(header.trim());
  if (!m) return null;
  const [, id, key] = m;
  const raw = await env.E26_ACCOUNTS.get("acct:" + id);
  if (!raw) return null;
  let rec;
  try { rec = JSON.parse(raw); } catch (e) { return null; }
  const hash = await sha256(key);
  if (!sameSecret(hash, rec.keyHash || "")) return null;
  return { id, rec };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
    if (!ALLOWED_ORIGINS.length) return json({ error: "not configured" }, 500, origin);
    /* A MISSING Origin USED TO PASS, and that was the hole. The check was written as
       "if you claim an origin, it must be one of mine", which is exactly backwards for a
       service whose only legitimate caller is a browser page: a browser always sends
       Origin on a cross-origin request, so the only callers with no Origin at all are
       scripts. POST /account needs no credential by definition, so that combination was
       an open account factory. Now the header is required, like the plan-reader proxy
       next door has always required it. Testing by hand means passing -H 'Origin: ...',
       which is what proxy/README.md already tells you to do. */
    if (!ALLOWED_ORIGINS.includes(origin)) return json({ error: "forbidden" }, 403, origin);
    if (!env || !env.E26_ACCOUNTS) return json({ error: "storage not bound" }, 500, origin);

    const url = new URL(request.url);
    /* Exact, not endsWith. "/x/account" matched the create route under the old test and
       would have kept matching anything somebody appended a known suffix to. */
    const path = url.pathname.replace(/\/+$/, "") || "/";

    /* CREATE. The only route that mints anything. The id and key are generated HERE,
       never accepted from the caller, so a client cannot claim an id it likes the look
       of or pick a weak key. The key is returned exactly once, in this response. */
    if (path === "/account" && request.method === "POST") {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const bucket = "rate:new:" + ip + ":" + Math.floor(Date.now() / 3600000);
      const seen = Number(await env.E26_ACCOUNTS.get(bucket)) || 0;
      if (seen >= NEW_ACCOUNTS_PER_HOUR) {
        return json({ error: "too many accounts created, try again later" }, 429, origin);
      }
      // expirationTtl so the counters clean themselves up rather than accumulating
      await env.E26_ACCOUNTS.put(bucket, String(seen + 1), { expirationTtl: 7200 });
      let body = {};
      try { body = await request.json(); } catch (e) {}
      const name = String(body.name || "").replace(/\s+/g, " ").trim().slice(0, 32);
      let id = newId();
      // Vanishingly unlikely, cheap to rule out, catastrophic if it ever happened.
      for (let i = 0; i < 5 && await env.E26_ACCOUNTS.get("acct:" + id); i++) id = newId();
      const key = newKey();
      const rec = { name, keyHash: await sha256(key), createdAt: Date.now() };
      await env.E26_ACCOUNTS.put("acct:" + id, JSON.stringify(rec));
      return json({ id, key, name }, 201, origin);
    }

    /* VERIFY. Used when signing in on a second device. Answers 401 for a bad pair and
       says nothing about which half was wrong — "no such id" and "wrong key" are the
       same answer, so this cannot be used to test whether an id exists. */
    if (path === "/session" && request.method === "POST") {
      let body = {};
      try { body = await request.json(); } catch (e) {}
      const id = String(body.id || "").trim().toUpperCase();
      const key = String(body.key || "").trim().toLowerCase();
      if (!ID_RE.test(id) || !KEY_RE.test(key)) return json({ error: "unauthorized" }, 401, origin);
      const raw = await env.E26_ACCOUNTS.get("acct:" + id);
      if (!raw) return json({ error: "unauthorized" }, 401, origin);
      let rec;
      try { rec = JSON.parse(raw); } catch (e) { return json({ error: "unauthorized" }, 401, origin); }
      if (!sameSecret(await sha256(key), rec.keyHash || "")) return json({ error: "unauthorized" }, 401, origin);
      return json({ ok: true, name: rec.name || "" }, 200, origin);
    }

    /* DELETE. Requires the same credential as reading the data, for the same reason: an
       ID on its own must not be able to do anything at all, least of all this. Removes
       the account record and its blob; there is no soft-delete and nothing to restore
       from, which is what the app tells the person before it calls this. */
    if (path === "/account" && request.method === "DELETE") {
      const who = await auth(request, env);
      if (!who) return json({ error: "unauthorized" }, 401, origin);
      await env.E26_ACCOUNTS.delete("data:" + who.id);
      await env.E26_ACCOUNTS.delete("acct:" + who.id);
      return json({ ok: true }, 200, origin);
    }

    /* THE DATA. One blob per account, addressed by the credential and nothing else. */
    if (path === "/data") {
      const who = await auth(request, env);
      if (!who) return json({ error: "unauthorized" }, 401, origin);

      if (request.method === "GET") {
        const blob = await env.E26_ACCOUNTS.get("data:" + who.id);
        if (!blob) return json({ savedAt: 0, data: null }, 200, origin);
        return new Response(blob, {
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors(origin) },
        });
      }
      if (request.method === "PUT") {
        const len = Number(request.headers.get("Content-Length") || 0);
        if (len > MAX_BODY) return json({ error: "too large" }, 413, origin);
        const text = await request.text();
        if (text.length > MAX_BODY) return json({ error: "too large" }, 413, origin);
        let parsed;
        try { parsed = JSON.parse(text); } catch (e) { return json({ error: "bad json" }, 400, origin); }
        if (!parsed || typeof parsed !== "object" || !parsed.data) return json({ error: "bad body" }, 400, origin);
        await env.E26_ACCOUNTS.put("data:" + who.id, JSON.stringify({
          savedAt: Number(parsed.savedAt) || Date.now(),
          data: parsed.data,
        }));
        return json({ ok: true }, 200, origin);
      }
      return json({ error: "method not allowed" }, 405, origin);
    }

    return json({ error: "not found" }, 404, origin);
  },
};
