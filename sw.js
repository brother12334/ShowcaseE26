/**
 * Element 26 — offline service worker
 *
 * WHY THIS EXISTS. Every workout you log is already written to localStorage on the
 * device and nothing about logging needs a network. But without a service worker the
 * browser still has to FETCH the app before it can run it, so a gym with no signal meant
 * a blank ERR_INTERNET_DISCONNECTED page and no way to log the session sitting in front
 * of you. The data was never the problem; loading the thing that reads it was.
 *
 * WHAT IS CACHED, AND WHAT IS DELIBERATELY NOT
 *
 *   the app shell   index.html, the icons, the manifest. Precached on install, so the
 *                   very first launch after an update is already good for the next
 *                   session even if that one happened over wifi you no longer have.
 *   the fonts       Google's CSS and the font files behind it, cached as they are used.
 *                   The CSS variables all carry real fallback stacks, so a cold cache
 *                   offline degrades to system fonts rather than breaking; caching them
 *                   just means it looks right rather than merely working.
 *   NOT the APIs    The plan reader and the account service go straight to the network,
 *                   untouched. Both already fail gracefully and say so in words, and a
 *                   cached answer from either would be actively wrong: a stale training
 *                   plan, or somebody else's sync state.
 *
 * CACHE-FIRST, NOT NETWORK-FIRST, and that is the whole design decision. Network-first
 * would keep you on the newest build at the cost of waiting for the network on every
 * single launch — which is exactly the moment this is meant to protect, in a basement
 * gym on one bar. So the cached copy is served immediately and a fresh one is fetched in
 * the background for next time. The cost is that an update lands one launch late, which
 * is why the page is told when that happens instead of being left to wonder.
 */
const VERSION = "3.5";
const SHELL = "e26-shell-v" + VERSION;
const RUNTIME = "e26-runtime-v" + VERSION;

/* Relative, deliberately: this app is served from a project subpath
   (…github.io/ShowcaseE26/) and these resolve against the worker's own scope, so the
   same file works there, at a domain root, and on localhost with no edit. */
const SHELL_URLS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon180v2.png",
  "./icon192v2.png",
  "./icon512v2.png"
];

/* Hosts whose responses must always come from the network. Checked by hostname rather
   than by matching the whole URL, so a Worker moving to a custom domain is one line. */
const NEVER_CACHE = [
  "element26-gemini.ferbyablon.workers.dev",
  "element26-accounts.ferbyablon.workers.dev",
  "generativelanguage.googleapis.com"
];
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", event=>{
  event.waitUntil((async ()=>{
    const cache = await caches.open(SHELL);
    /* Individually rather than cache.addAll, because addAll is atomic: one 404 on one
       icon and the entire install rejects, leaving no offline support at all rather than
       slightly incomplete offline support. */
    await Promise.all(SHELL_URLS.map(u=>
      cache.add(new Request(u, {cache:"reload"})).catch(()=>{})
    ));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event=>{
  event.waitUntil((async ()=>{
    const names = await caches.keys();
    const stale = names.filter(n=> n.startsWith("e26-") && n !== SHELL && n !== RUNTIME);
    await Promise.all(stale.map(n=> caches.delete(n)));
    await self.clients.claim();
    /* Tell any open page that this was an UPDATE rather than a first install — the
       presence of an older cache is the only reliable signal of that from in here. */
    if(stale.length){
      const clients = await self.clients.matchAll({type:"window"});
      clients.forEach(c=> c.postMessage({type:"e26-updated", version:VERSION}));
    }
  })());
});

self.addEventListener("message", event=>{
  if(event.data && event.data.type === "e26-skip-waiting") self.skipWaiting();
});

/* Serve from cache, then refresh the cache in the background for next time.
   The FetchEvent is passed in rather than closed over so the background refresh can be
   handed to event.waitUntil(): returning the cached hit ends the event, and without
   waitUntil the browser is entitled to kill the worker before the refresh lands, which
   would quietly turn stale-while-revalidate into stale-forever. */
async function staleWhileRevalidate(event, request, cacheName){
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const fetching = fetch(request).then(res=>{
    // opaque cross-origin responses are cacheable and still usable for fonts
    if(res && (res.ok || res.type === "opaque")) return cache.put(request, res.clone()).then(()=>res);
    return res;
  }).catch(()=> null);
  if(hit){ event.waitUntil(fetching); return hit; }
  const fresh = await fetching;
  if(fresh) return fresh;
  throw new Error("offline and not cached");
}

self.addEventListener("fetch", event=>{
  const req = event.request;
  if(req.method !== "GET") return;
  let url;
  try{ url = new URL(req.url); }catch(e){ return; }
  if(url.protocol !== "http:" && url.protocol !== "https:") return;

  // the plan reader and the account service are never intercepted
  if(NEVER_CACHE.indexOf(url.hostname) > -1) return;

  /* A navigation is the one request that MUST resolve to something, or the person gets
     the browser's offline page instead of their training log. Cache-first against the
     precached shell, with index.html as the fallback for any in-app URL. */
  if(req.mode === "navigate"){
    event.respondWith((async ()=>{
      const cache = await caches.open(SHELL);
      const cached = await cache.match("./index.html") || await cache.match("./");
      if(cached){
        event.waitUntil(fetch(req).then(res=>{
          if(res && res.ok) return cache.put("./index.html", res.clone());
        }).catch(()=>{}));
        return cached;
      }
      try{ return await fetch(req); }
      catch(e){
        return new Response(
          "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'>"
          + "<style>body{background:#0e0e10;color:#e8e6e1;font:16px/1.5 -apple-system,system-ui,sans-serif;"
          + "display:grid;place-items:center;height:100dvh;margin:0;text-align:center;padding:24px}</style>"
          + "<div><p>Element 26 hasn't finished saving itself for offline use yet.</p>"
          + "<p style='color:#9b9892'>Open it once with a connection and it will work without one after that.</p></div>",
          {headers:{"Content-Type":"text/html; charset=utf-8"}});
      }
    })());
    return;
  }

  if(FONT_HOSTS.indexOf(url.hostname) > -1){
    event.respondWith(staleWhileRevalidate(event, req, RUNTIME).catch(()=> fetch(req)));
    return;
  }
  if(url.origin === self.location.origin){
    event.respondWith(staleWhileRevalidate(event, req, SHELL).catch(()=> fetch(req)));
  }
});
