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

---

# The account service (optional)

`accountworker.js` is a second, separate Worker. Element 26 does not need it: an
account created with no service configured is real, it names your data and namespaces
your storage, and it lives on the device that made it. Deploy this one and the same
account becomes portable — sign in on a phone with the ID and recovery key from a
laptop, and the log follows.

**What it stores.** One record per account (`name`, a SHA-256 hash of the recovery key,
a created-at) and one blob per account (the app's own state). Nothing else. No email, no
password, no GitHub.

**How access works.** The User ID identifies an account. The recovery key authenticates
it. Every route that touches private data requires both, in one `Authorization` header,
and the account is derived from the credential rather than read from a path or a
parameter — so there is no id to change in a URL, and an ID on its own reads nothing.
Keys are compared in constant time against a stored hash; a dump of the database does
not hand anybody the credentials it protects. `POST /session` answers the same 401 for
"no such account" and "wrong key", so it cannot be used to test whether an ID exists.

## Deploy

```bash
wrangler kv namespace create E26_ACCOUNTS       # prints an id
```

Put that id in a second wrangler config (or a second `[env]` block) and deploy:

```toml
name = "element26-accounts"
main = "proxy/accountworker.js"
compatibility_date = "2024-11-01"

[[kv_namespaces]]
binding = "E26_ACCOUNTS"
id = "<the id wrangler printed>"
```

```bash
wrangler deploy -c wrangler.accounts.toml
```

Add the origin you serve the app from to `ALLOWED_ORIGINS` at the top of
`accountworker.js`, then set `E26_API` near the top of `index.html` to the Worker's
URL. **No secret goes in the page** — the whole design is that the page holds an
identifier and the device holds a key, and the service is the only thing that can match
them.

## Check it works

```bash
# create an account
curl -s -X POST https://element26-accounts.<sub>.workers.dev/account \
  -H 'Origin: https://your.site' -H 'Content-Type: application/json' \
  -d '{"name":"Test"}'
# → {"id":"E26-7F42-K9P3","key":"…32 hex…","name":"Test"}

# the ID alone gets you nothing
curl -i https://element26-accounts.<sub>.workers.dev/data \
  -H 'Origin: https://your.site' -H 'Authorization: Bearer E26-7F42-K9P3.'
# → HTTP/2 401
```

## Deleting an account

`DELETE /account`, with the same `Authorization` header as everything else — the ID
alone cannot do it. It removes the account record and its data blob, with no soft-delete
and nothing to restore from. The app asks twice and makes you type your ID before it
calls this.

## If both halves are lost

The account is gone, and that is the honest trade for having no email and no password.
The app says so at sign-up and shows the ID once, big, behind a confirmation — and the
recovery key is always visible again under **Settings → Account**.
