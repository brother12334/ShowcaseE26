/* The account worker's share routes, against a mocked KV.

   The brief asks for the worker handlers to be unit-tested with a mocked KV rather than
   taken on trust, because these four routes are the only part of Element 26 that serves
   somebody's training data to a caller with no account credential. Run with:

     node tests/share-worker.mjs

   It imports the real worker module and drives its fetch() directly, so what is tested
   is the code that ships. */
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SRC = new URL("../proxy/accountworker.js", import.meta.url).pathname;
const ORIGIN = "https://brother12334.github.io";
let bad = 0;
const ck = (n, c, extra) => {
  console.log((c ? "  ok  " : "  BROKEN  ") + n + (c ? "" : " :: " + (extra == null ? "" : extra)));
  if (!c) bad++;
};

/* A KV good enough for these routes: get/put/delete, expirationTtl honoured against a
   clock the test controls, and nothing else pretended. */
function makeKV() {
  const m = new Map();
  return {
    _m: m,
    async get(k) {
      const v = m.get(k);
      if (!v) return null;
      if (v.exp && Date.now() > v.exp) { m.delete(k); return null; }
      return v.val;
    },
    async put(k, val, opts) {
      m.set(k, { val, exp: opts && opts.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : 0 });
    },
    async delete(k) { m.delete(k); },
  };
}

const worker = (await import(SRC)).default;
const KV = makeKV();
const env = { E26_ACCOUNTS: KV };
const call = (method, path, { body, auth, ip, origin } = {}) => {
  const headers = { Origin: origin === undefined ? ORIGIN : origin };
  if (auth) headers.Authorization = "Bearer " + auth;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (ip) headers["CF-Connecting-IP"] = ip;
  return worker.fetch(new Request("https://acct.example" + path, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  }), env);
};
const jsonOf = async r => { try { return await r.json(); } catch (e) { return null; } };

/* An account to own the shares. */
const made = await call("POST", "/account", { body: { name: "Fer" } });
const acct = await jsonOf(made);
const CRED = acct.id + "." + acct.key;
console.log("0 - AN ACCOUNT TO OWN THEM");
ck("the account was created", made.status === 201 && /^E26-/.test(acct.id || ""), JSON.stringify(acct));

console.log("1 - CREATING A LINK NEEDS THE ACCOUNT'S OWN CREDENTIAL");
{
  const no = await call("POST", "/share", { body: { data: { hello: 1 } } });
  ck("no credential is unauthorized", no.status === 401, String(no.status));
  const wrong = await call("POST", "/share", { body: { data: { hello: 1 } },
    auth: acct.id + "." + "f".repeat(32) });
  ck("the wrong key is too", wrong.status === 401, String(wrong.status));
  const idOnly = await call("POST", "/share", { body: { data: { hello: 1 } }, auth: acct.id });
  ck("and an id on its own is not a credential", idOnly.status === 401, String(idOnly.status));
}

let TOKEN = null;
console.log("2 - THE TOKEN IS 128 BITS AND THE EXPIRY IS CLAMPED");
{
  const r = await call("POST", "/share", { body: { data: { plan: "ppl" }, label: "My coach" }, auth: CRED });
  const j = await jsonOf(r);
  TOKEN = j.token;
  ck("a link is created", r.status === 201, String(r.status));
  ck("the token is 32 hex characters", /^[a-f0-9]{32}$/.test(j.token || ""), String(j.token));
  ck("thirty days by default", j.days === 30, String(j.days));
  ck("and it carries its own label", j.label === "My coach", String(j.label));
  const long = await call("POST", "/share", { body: { data: { plan: "x" }, days: 365 }, auth: CRED });
  const lj = await jsonOf(long);
  ck("a year is clamped to ninety days", lj.days === 90, String(lj.days));
  const short = await call("POST", "/share", { body: { data: { plan: "x" }, days: 0.2 }, auth: CRED });
  const sj = await jsonOf(short);
  ck("and nothing is ever shorter than a day", sj.days === 1, String(sj.days));
  const two = await call("POST", "/share", { body: { data: { plan: "y" } }, auth: CRED });
  const tj = await jsonOf(two);
  ck("two links are two different tokens", tj.token !== j.token, tj.token + " / " + j.token);
}

console.log("3 - READING ONE NEEDS NOTHING BUT THE TOKEN, AND LEAKS NOTHING ELSE");
{
  const r = await call("GET", "/share/" + TOKEN);
  const j = await jsonOf(r);
  ck("the snapshot comes back", r.status === 200 && j.data && j.data.plan === "ppl",
     JSON.stringify(j).slice(0, 120));
  ck("with its dates", j.at > 0 && j.expiresAt > j.at, j.at + " / " + j.expiresAt);
  ck("and no account id anywhere in it", !JSON.stringify(j).includes(acct.id), JSON.stringify(j).slice(0,160));
  ck("nor the owner's name", !JSON.stringify(j).includes("Fer"), JSON.stringify(j).slice(0,160));
  const nope = await call("GET", "/share/" + "0".repeat(32));
  ck("an unknown token is a plain 404", nope.status === 404, String(nope.status));
  const junk = await call("GET", "/share/not-a-token");
  ck("so is a malformed one", junk.status === 404, String(junk.status));
}

console.log("4 - LISTING AND REVOKING BELONG TO THE OWNER");
{
  const mine = await jsonOf(await call("GET", "/shares", { auth: CRED }));
  ck("the owner can list them", Array.isArray(mine.shares) && mine.shares.length === 4,
     JSON.stringify((mine.shares || []).length));
  ck("the list carries no snapshots", !JSON.stringify(mine.shares).includes("\"data\""),
     JSON.stringify(mine.shares).slice(0, 160));
  const anon = await call("GET", "/shares");
  ck("and nobody else can", anon.status === 401, String(anon.status));

  /* A second account, holding a token it did not create. */
  const other = await jsonOf(await call("POST", "/account", { body: { name: "Someone" } }));
  const OCRED = other.id + "." + other.key;
  const steal = await call("DELETE", "/share/" + TOKEN, { auth: OCRED });
  ck("another account cannot revoke your link", steal.status === 404, String(steal.status));
  const still = await call("GET", "/share/" + TOKEN);
  ck("so it still reads", still.status === 200, String(still.status));

  const gone = await call("DELETE", "/share/" + TOKEN, { auth: CRED });
  ck("the owner can", gone.status === 200, String(gone.status));
  const after = await call("GET", "/share/" + TOKEN);
  ck("and then it is a 404 like any other", after.status === 404, String(after.status));
  const list2 = await jsonOf(await call("GET", "/shares", { auth: CRED }));
  ck("the list drops it too", (list2.shares || []).length === 3, String((list2.shares||[]).length));
}

console.log("5 - A MEGABYTE IS THE LIMIT, AND A BODY HAS TO BE A SNAPSHOT");
{
  const big = { data: { pad: "x".repeat(1024 * 1024 + 64) } };
  const r = await call("POST", "/share", { body: big, auth: CRED });
  ck("over a megabyte is refused", r.status === 413, String(r.status));
  const empty = await call("POST", "/share", { body: { days: 10 }, auth: CRED });
  ck("a body with no snapshot is a 400", empty.status === 400, String(empty.status));
  const notObj = await call("POST", "/share", { body: { data: "a string" }, auth: CRED });
  ck("and a snapshot has to be an object", notObj.status === 400, String(notObj.status));
}

console.log("6 - IT EXPIRES BY ITSELF");
{
  const r = await jsonOf(await call("POST", "/share", { body: { data: { plan: "z" }, days: 1 }, auth: CRED }));
  const real = Date.now;
  Date.now = () => real() + 2 * 86400000;        // two days on
  const read = await call("GET", "/share/" + r.token);
  const list = await jsonOf(await call("GET", "/shares", { auth: CRED }));
  Date.now = real;
  ck("a day-old link is gone the day after", read.status === 404, String(read.status));
  ck("and it is gone from the list as well",
     !(list.shares || []).some(x => x.token === r.token), JSON.stringify((list.shares||[]).map(x=>x.token)));
}

console.log("7 - THE LIMITS");
{
  /* The account already has several; fill to the cap and check the refusal. */
  let last = null;
  for (let i = 0; i < 12; i++) last = await call("POST", "/share", { body: { data: { i } }, auth: CRED });
  ck("a cap on live links, refused with a reason", last.status === 409 || last.status === 429,
     String(last.status));
  const reads = [];
  for (let i = 0; i < 125; i++) reads.push(await call("GET", "/share/" + "a".repeat(32), { ip: "203.0.113.9" }));
  ck("public reads are rate-limited per address",
     reads.some(r => r.status === 429), String(reads[reads.length - 1].status));
  const other = await call("GET", "/share/" + "a".repeat(32), { ip: "198.51.100.7" });
  ck("and the limit is per address, not global", other.status === 404, String(other.status));
}

console.log("8 - THE ORIGIN CHECK STILL GOVERNS EVERY ROUTE");
{
  const r = await call("GET", "/share/" + "b".repeat(32), { origin: "https://evil.example" });
  ck("a foreign origin is forbidden", r.status === 403, String(r.status));
  const none = await worker.fetch(new Request("https://acct.example/share/" + "b".repeat(32)), env);
  ck("and no origin at all is too", none.status === 403, String(none.status));
}

console.log("9 - DELETING THE ACCOUNT TAKES EVERY LINK WITH IT");
{
  const fresh = await jsonOf(await call("POST", "/account", { body: { name: "Temp" } }));
  const FC = fresh.id + "." + fresh.key;
  const a = await jsonOf(await call("POST", "/share", { body: { data: { x: 1 } }, auth: FC }));
  const b = await jsonOf(await call("POST", "/share", { body: { data: { x: 2 } }, auth: FC }));
  const live = await call("GET", "/share/" + a.token);
  const del = await call("DELETE", "/account", { auth: FC });
  const after1 = await call("GET", "/share/" + a.token);
  const after2 = await call("GET", "/share/" + b.token);
  ck("the links worked before", live.status === 200, String(live.status));
  ck("the account is deleted", del.status === 200, String(del.status));
  ck("and both links are dead with it", after1.status === 404 && after2.status === 404,
     after1.status + "/" + after2.status);
  ck("with nothing left in storage",
     ![...KV._m.keys()].some(k => k === "share:" + a.token || k === "shares:" + fresh.id),
     [...KV._m.keys()].filter(k => k.startsWith("share")).join(","));
}

console.log(bad ? "BROKEN: " + bad : "all good");
process.exit(bad ? 1 : 0);
