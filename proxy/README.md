# Plan-reader proxy

Element 26 is one static HTML file. Anything inside it is public the moment it is
served — including a Gemini API key, which is why Google emails you about it.

This Worker fixes that properly: it holds the key, the app calls the Worker, and
requests leaving the browser carry no credential at all.

**Free tier is enough.** Cloudflare Workers gives 100,000 requests/day at no cost and
asks for no card. A plan import is two requests: a small screening call that decides
whether the document is a usable training plan at all, then the extraction itself. A
document the screening call rejects never reaches the extraction, so an unreadable scan
or a nutrition sheet costs one cheap request rather than a full read.

---

## Before anything else: kill the leaked key

If a key has ever been in a published file, it is spent. Restricting it is not enough,
and deleting it from the file is not enough — published pages get crawled, and
committed files stay in git history.

1. https://aistudio.google.com/apikey
2. Delete the exposed key.
3. Create a new one. It goes into the Worker below and **nowhere else**.

---

## Deploy, about five minutes

```bash
npm install -g wrangler          # once
wrangler login                   # opens a browser
```

Then, from this folder:

```bash
wrangler deploy gemini-worker.js --name element26-gemini --compatibility-date 2024-11-01
```

Wrangler prints a URL like `https://element26-gemini.<your-subdomain>.workers.dev`.

Give it the key — this stores it encrypted on Cloudflare, never in your repo:

```bash
wrangler secret put GEMINI_API_KEY --name element26-gemini
# paste the new key when prompted
```

---

## Wire it up

**1. Allow your site.** In `gemini-worker.js`, add the exact origin you serve the app
from to `ALLOWED_ORIGINS`:

```js
const ALLOWED_ORIGINS = [
  "https://brother12334.github.io",
];
```

Scheme and host only — no path, no trailing slash. Without this the Worker refuses
everything, on purpose: an open proxy is a free Gemini endpoint for whoever finds the
URL. Re-run `wrangler deploy` after editing.

**2. Point the app at it.** At the top of `index.html`:

```js
const AI_PROXY = "https://element26-gemini.<your-subdomain>.workers.dev";
const AI_KEY   = "";      // stays empty. Forever.
```

Publish. The key is now server-side and there is nothing in the page to find.

---

## Check it works

Open the app, **Program → ✨ Import a plan**, paste a couple of lines of a workout,
press Read. In DevTools → Network you should see one request to your `workers.dev`
URL, and searching the page source for `AIza` should find nothing.

From a terminal, a request with no `Origin` header should be refused:

```bash
curl -i -X POST https://element26-gemini.<your-subdomain>.workers.dev \
  -H 'Content-Type: application/json' -d '{"model":"gemini-2.5-flash"}'
# expect: HTTP/2 403  {"error":{"code":403,"message":"Origin not allowed."}}
```

---

## When something breaks

The app shows a plain-English message; these are the causes behind them.

| What you see | What happened |
|---|---|
| "isn't switched on for this copy" | `AI_PROXY` is empty, or the Worker returned 401 |
| "problem at our end, not yours" | 403 — origin missing from `ALLOWED_ORIGINS`, or the key is invalid |
| "busy — it's had a lot of use today" | 429, the free-tier quota is shared across everyone using the app |
| "misconfigured (no model called…)" | `AI_MODEL` in index.html isn't in `ALLOWED_MODELS` here |

`wrangler tail --name element26-gemini` streams live logs if you need to see the
Worker's side.

---

## Other hosts

Nothing here is Cloudflare-specific beyond the export shape. The same 60 lines port to
Deno Deploy, Netlify Functions, or Vercel Edge — read the key from that platform's env
instead of `env.GEMINI_API_KEY`, and keep the origin check.
