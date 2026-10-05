/* The account Worker's cron, run for real against a stub KV and a stub push service.
   The point is the timing: a rest alert has to leave on its own second rather than on the
   minute the cron happens to fire. */
import worker from appFile('proxy/accountworker.js');

let bad = 0;
const ck = (n, c, extra)=>{ console.log((c ? "  ok  " : "  BROKEN  ") + n + (c ? "" : " :: " + (extra||""))); if(!c) bad++; };

// a real P-256 key, so vapidAuth() signs rather than throwing
const kp = await crypto.subtle.generateKey({name:"ECDSA", namedCurve:"P-256"}, true, ["sign","verify"]);
const jwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
const b64u = b => Buffer.from(b).toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const raw = b => Buffer.from(String(b).replace(/-/g,"+").replace(/_/g,"/"), "base64");
const pub = Buffer.concat([Buffer.from([4]), raw(jwk.x), raw(jwk.y)]);

function kv(){
  const m = new Map(), meta = new Map();
  return {
    store: m,
    async list({prefix, cursor, limit}){
      const keys = [...m.keys()].filter(k=> k.startsWith(prefix))
        .map(name=> ({name, metadata: meta.get(name) || null}));
      return {keys, list_complete: true};
    },
    async get(k){ return m.has(k) ? m.get(k) : null; },
    async put(k, v, opts){ m.set(k, v); if(opts && opts.metadata) meta.set(k, opts.metadata); },
    async delete(k){ m.delete(k); meta.delete(k); }
  };
}
const envFor = store => ({
  E26_ACCOUNTS: store,
  VAPID_PUBLIC_KEY: b64u(pub),
  VAPID_PRIVATE_KEY: jwk.d,
  VAPID_SUBJECT: "mailto:t@example.invalid"
});
const sched = (store, id, kind, at, title)=> store.put(
  "sched:" + id + ":" + kind,
  JSON.stringify({at, title: title || kind, body: "b", tag: "e26-" + kind}),
  {metadata: {at}});

// every push the worker sends, with the moment it went
let sent = [];
globalThis.fetch = async (url)=>{ sent.push({url: String(url), at: Date.now()}); return {status: 201}; };

console.log("1 - A REST DUE IN THREE SECONDS LEAVES IN THREE SECONDS, NOT NEXT MINUTE");
{
  const store = kv();
  await store.put("push:A", JSON.stringify({endpoint:"https://fcm.googleapis.com/fcm/send/x"}));
  const t0 = Date.now();
  await sched(store, "A", "train", t0 - 1000);            // already due
  await sched(store, "A", "rest",  t0 + 3000);            // three seconds out
  sent = [];
  await worker.scheduled({}, envFor(store), {});
  const dt = sent.map(x=> x.at - t0);
  ck("two pushes went out", sent.length === 2, JSON.stringify(dt));
  ck("the training one went at once", dt[0] < 900, String(dt[0]));
  ck("the rest one waited for its second", dt[1] > 2700 && dt[1] < 4200, String(dt[1]));
  ck("and the rest schedule was consumed", !(await store.get("sched:A:rest")), "still there");
  ck("with a guard against sending it twice",
     !!(await store.get("fired:A:rest:" + (t0 + 3000))), "no guard");
}

console.log("2 - A REST FURTHER OUT THAN THE HORIZON IS LEFT FOR A LATER MINUTE");
{
  const store = kv();
  await store.put("push:B", JSON.stringify({endpoint:"https://fcm.googleapis.com/fcm/send/x"}));
  const t0 = Date.now();
  await sched(store, "B", "rest", t0 + 5 * 60000);
  sent = [];
  const ms = Date.now();
  await worker.scheduled({}, envFor(store), {});
  ck("nothing was sent", sent.length === 0, String(sent.length));
  ck("and the cron did not sit and wait", Date.now() - ms < 900, String(Date.now() - ms));
  ck("the schedule is still there for later", !!(await store.get("sched:B:rest")), "gone");
}

console.log("3 - TWO CRON MINUTES OVERLAPPING ON ONE REST STILL SEND IT ONCE");
{
  const store = kv();
  await store.put("push:C", JSON.stringify({endpoint:"https://fcm.googleapis.com/fcm/send/x"}));
  const t0 = Date.now();
  await sched(store, "C", "rest", t0 + 1500);
  sent = [];
  await Promise.all([
    worker.scheduled({}, envFor(store), {}),
    worker.scheduled({}, envFor(store), {})
  ]);
  ck("one push, not two", sent.length === 1, String(sent.length));
}

console.log("4 - AND A KIND THAT IS NOT REST IS NEVER WAITED FOR");
{
  const store = kv();
  await store.put("push:D", JSON.stringify({endpoint:"https://fcm.googleapis.com/fcm/send/x"}));
  const t0 = Date.now();
  await sched(store, "D", "bed", t0 + 3000);      // a bedtime reminder three seconds out
  sent = [];
  const ms = Date.now();
  await worker.scheduled({}, envFor(store), {});
  ck("nothing sent early", sent.length === 0, String(sent.length));
  ck("and no waiting", Date.now() - ms < 900, String(Date.now() - ms));
}

console.log(bad ? ("BROKEN: " + bad) : "all good");
process.exit(0);
