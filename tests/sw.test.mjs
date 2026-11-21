import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const SRC = fs.readFileSync(new URL("../src/sw.js", import.meta.url), "utf8").replaceAll("__VER__", "T1");
const O = "https://gowithdme.com";

function mk(body, o = {}) {
  const r = new Response(body, { status: o.status || 200, headers: { "content-type": o.ct || "text/html" } });
  if (o.type) Object.defineProperty(r, "type", { value: o.type });
  if (o.redirected) Object.defineProperty(r, "redirected", { value: true });
  return r;
}
const strip = (u, ig) => { const x = new URL(u); if (ig) x.search = ""; return x.href; };

function setup(net) {
  const store = new Map(), handlers = {}, state = { skipped: false, claimed: false, calls: [] };
  const cache = (name) => {
    if (!store.has(name)) store.set(name, new Map());
    const m = store.get(name);
    return {
      async match(req, o = {}) {
        const k = typeof req === "string" ? req : req.url;
        for (const [key, v] of m) if (strip(key, o.ignoreSearch) === strip(k, o.ignoreSearch)) return v.clone();
      },
      async put(req, res) { const k = typeof req === "string" ? req : req.url; m.delete(k); m.set(k, res); },
      async keys() { return [...m.keys()].map((u) => ({ url: u })); },
      async delete(req) { return m.delete(typeof req === "string" ? req : req.url); },
    };
  };
  const caches = {
    async open(n) { return cache(n); },
    async keys() { return [...store.keys()]; },
    async delete(n) { return store.delete(n); },
    async match(req) { for (const n of store.keys()) { const r = await cache(n).match(req); if (r) return r; } },
  };
  const self = {
    addEventListener: (t, f) => { handlers[t] = f; },
    registration: { scope: O + "/" },
    location: new URL(O + "/sw.js"),
    skipWaiting: async () => { state.skipped = true; },
    clients: { claim: async () => { state.claimed = true; } },
  };
  const ctx = vm.createContext({
    self, caches, Response, Request, URL, Promise, Headers,
    setTimeout: (f, ms) => setTimeout(f, ms >= 1000 ? 5 : ms),
    fetch: async (req) => { const u = typeof req === "string" ? req : req.url; state.calls.push(u); return net(u); },
  });
  vm.runInContext(SRC, ctx);
  return { store, handlers, state, caches, cache };
}
async function fire(env, url, o = {}) {
  const req = { url, method: o.method || "GET", mode: o.mode || "no-cors", headers: new Headers(o.headers || {}) };
  const waits = []; let p;
  const ev = { request: req, respondWith: (x) => { p = Promise.resolve(x); }, waitUntil: (x) => waits.push(Promise.resolve(x)) };
  env.handlers.fetch(ev);
  const res = p ? await p : undefined;
  await Promise.all(waits);
  return { res, handled: !!p };
}
const OFFLINE = '<html data-gwm-offline>OFFLINE</html>';
const down = () => { throw new TypeError("offline"); };

test("install: simpan halaman offline & langsung aktif", async () => {
  const e = setup((u) => (u.endsWith("/offline") ? mk(OFFLINE) : mk("x", { status: 404 })));
  await e.handlers.install({ waitUntil: (p) => (e.p = p) }); await e.p;
  assert.equal(await (await e.caches.match(O + "/__offline")).text(), OFFLINE);
  assert.ok(e.state.skipped);
});
test("install: /offline gagal -> coba /offline.html", async () => {
  const e = setup((u) => (u.endsWith("/offline.html") ? mk(OFFLINE) : mk("nope", { status: 404 })));
  await e.handlers.install({ waitUntil: (p) => (e.p = p) }); await e.p;
  assert.equal(await (await e.caches.match(O + "/__offline")).text(), OFFLINE);
});
test("install: balasan 200 tanpa penanda (SPA fallback) tidak disimpan", async () => {
  const e = setup(() => mk("<html>beranda</html>"));
  await e.handlers.install({ waitUntil: (p) => (e.p = p) }); await e.p;
  assert.equal(await e.caches.match(O + "/__offline"), undefined);
});
test("install: jaringan mati tidak menggagalkan pemasangan", async () => {
  const e = setup(down);
  await e.handlers.install({ waitUntil: (p) => (e.p = p) });
  await assert.doesNotReject(e.p);
  assert.ok(e.state.skipped);
});

test("navigasi online: pakai jaringan dan simpan salinan", async () => {
  const e = setup(() => mk("HALAMAN", { type: "basic" }));
  const { res } = await fire(e, O + "/id/event", { mode: "navigate" });
  assert.equal(await res.text(), "HALAMAN");
  assert.equal(await (await e.caches.match(O + "/id/event")).text(), "HALAMAN");
});
test("navigasi offline: pakai salinan, query diabaikan", async () => {
  let on = true;
  const e = setup(() => (on ? mk("TERSIMPAN", { type: "basic" }) : down()));
  await fire(e, O + "/id/event", { mode: "navigate" });
  on = false;
  const { res } = await fire(e, O + "/id/event?kat=konser", { mode: "navigate" });
  assert.equal(await res.text(), "TERSIMPAN");
});
test("navigasi offline tanpa salinan: halaman offline", async () => {
  let on = true;
  const e = setup((u) => (on ? (u.endsWith("/offline") ? mk(OFFLINE) : mk("x", { status: 404 })) : down()));
  await e.handlers.install({ waitUntil: (p) => (e.p = p) }); await e.p;
  on = false;
  const { res } = await fire(e, O + "/id/belum-pernah", { mode: "navigate" });
  assert.equal(await res.text(), OFFLINE);
});
test("navigasi: jaringan lambat + ada salinan -> salinan (tak menggantung)", async () => {
  let slow = false;
  const e = setup(() => (slow ? new Promise(() => {}) : mk("LAMA", { type: "basic" })));
  await fire(e, O + "/id/", { mode: "navigate" });
  slow = true;
  const { res } = await fire(e, O + "/id/", { mode: "navigate" });
  assert.equal(await res.text(), "LAMA");
});
test("navigasi: server 5xx + ada salinan -> salinan", async () => {
  let bad = false;
  const e = setup(() => (bad ? mk("err", { status: 503, type: "basic" }) : mk("BAIK", { type: "basic" })));
  await fire(e, O + "/id/gunung", { mode: "navigate" });
  bad = true;
  const { res } = await fire(e, O + "/id/gunung", { mode: "navigate" });
  assert.equal(await res.text(), "BAIK");
});
test("respons hasil redirect disimpan sebagai respons biasa", async () => {
  const e = setup(() => mk("PINDAH", { type: "basic", redirected: true }));
  await fire(e, O + "/id/about", { mode: "navigate" });
  const c = await e.caches.match(O + "/id/about");
  assert.equal(c.redirected, false);
  assert.equal(await c.text(), "PINDAH");
});
test("login dan admin tidak disentuh", async () => {
  const e = setup(() => mk("x", { type: "basic" }));
  for (const p of ["/id/login", "/en/login", "/admin", "/admin.html"])
    assert.equal((await fire(e, O + p, { mode: "navigate" })).handled, false, p);
});

test("yang bukan GET / Range / lintas-domain (Supabase, cuaca) tidak disentuh", async () => {
  const e = setup(() => mk("x", { type: "basic" }));
  assert.equal((await fire(e, O + "/id/event", { method: "POST", mode: "navigate" })).handled, false);
  assert.equal((await fire(e, O + "/assets/a.mp4", { headers: { range: "bytes=0-1" } })).handled, false);
  assert.equal((await fire(e, "https://abc.supabase.co/rest/v1/events")).handled, false);
  assert.equal((await fire(e, "https://api.open-meteo.com/v1/forecast?x=1")).handled, false);
  assert.equal((await fire(e, O + "/sw.js")).handled, false);
});
test("pustaka Supabase (versi dikunci): salinan dulu, jalan offline", async () => {
  let on = true;
  const url = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";
  const e = setup(() => (on ? mk("LIB", { type: "opaque" }) : down()));
  assert.ok((await fire(e, url)).handled);
  on = false;
  const { res } = await fire(e, url);
  assert.equal(await res.text(), "LIB");
});
test("aset: salinan langsung, diperbarui di belakang layar", async () => {
  let v = "v1";
  const e = setup(() => mk(v, { type: "basic", ct: "text/css" }));
  const u = O + "/css/style.css?v=1";
  assert.equal(await (await fire(e, u)).res.text(), "v1");
  v = "v2";
  assert.equal(await (await fire(e, u)).res.text(), "v1");   // salinan lama dulu
  assert.equal(await (await fire(e, u)).res.text(), "v2");   // sudah diperbarui
});
test("data .json: jaringan dulu, salinan saat offline", async () => {
  let on = true;
  const e = setup(() => (on ? mk('{"a":1}', { type: "basic", ct: "application/json" }) : down()));
  const u = O + "/data/events.json";
  assert.equal(await (await fire(e, u)).res.text(), '{"a":1}');
  on = false;
  assert.equal(await (await fire(e, u)).res.text(), '{"a":1}');
});

test("aktivasi: buang cache gwm- versi lama, simpan yang baru dan non-gwm", async () => {
  const e = setup(() => mk("x"));
  await e.cache("gwm-pages-OLD"); await e.cache("gwm-pages-T1"); await e.cache("punya-lain");
  await e.handlers.activate({ waitUntil: (p) => (e.p = p) }); await e.p;
  const ks = await e.caches.keys();
  assert.ok(!ks.includes("gwm-pages-OLD"));
  assert.ok(ks.includes("gwm-pages-T1") && ks.includes("punya-lain"));
  assert.ok(e.state.claimed);
});
test("batas jumlah salinan halaman (40)", async () => {
  const e = setup((u) => mk(u, { type: "basic" }));
  for (let i = 0; i < 45; i++) await fire(e, O + "/id/e/ev-" + i, { mode: "navigate" });
  assert.ok((await e.cache("gwm-pages-T1").keys()).length <= 40);
});

/* ---- cangkang offline (precache saat pasang) ---- */
const SRC_PRE = SRC.replace(/var PRE = .*?; \/\*PRE\*\//, 'var PRE = {"pages":["id/","id/event"],"assets":["css/a.css?v=T1","js/a.js?v=T1"],"data":["data/events.json"]}; /*PRE*/');
function setupPre(net) {
  const e = setup(net); // objek env dasar (handlers dari SRC tanpa cangkang)
  const store = e.store, handlers = {}, state = { skipped: false, claimed: false };
  const self = { addEventListener: (t, f) => { handlers[t] = f; }, registration: { scope: O + "/" }, location: new URL(O + "/sw.js"),
    skipWaiting: async () => { state.skipped = true; }, clients: { claim: async () => { state.claimed = true; } } };
  const ctx = vm.createContext({ self, caches: e.caches, Response, Request, URL, Promise, Headers,
    setTimeout: (f, ms) => setTimeout(f, ms >= 1000 ? 5 : ms), fetch: async (r) => net(typeof r === "string" ? r : r.url) });
  vm.runInContext(SRC_PRE, ctx);
  return { ...e, handlers, state };
}
const shellNet = (u) => {
  if (u.endsWith("/offline")) return mk(OFFLINE, { type: "basic" });
  if (/\.css|\.js/.test(u)) return mk("ASET:" + u, { type: "basic", ct: "text/css" });
  if (u.endsWith("events.json")) return mk('[{"x":1}]', { type: "basic", ct: "application/json" });
  return mk("HAL:" + u, { type: "basic" });
};
test("install: cangkang diunduh (halaman -> CORE, aset -> STATIC, data -> DATA)", async () => {
  const e = setupPre(shellNet);
  await e.handlers.install({ waitUntil: (p) => (e.p = p) }); await e.p;
  assert.ok(e.state.skipped);
  assert.equal(await (await e.cache("gwm-core-T1").match(O + "/id/event")).text(), "HAL:" + O + "/id/event");
  assert.ok(await e.cache("gwm-static-T1").match(O + "/css/a.css?v=T1"));
  assert.ok(await e.cache("gwm-data-T1").match(O + "/data/events.json"));
});
test("install: satu berkas cangkang gagal/404 tidak menggagalkan pemasangan", async () => {
  const e = setupPre((u) => (u.endsWith("a.js?v=T1") ? mk("x", { status: 404 }) : u.endsWith("/id/event") ? down() : shellNet(u)));
  await e.handlers.install({ waitUntil: (p) => (e.p = p) });
  await assert.doesNotReject(e.p);
  assert.ok(e.state.skipped);
  assert.ok(await e.cache("gwm-core-T1").match(O + "/id/"));
  assert.equal(await e.cache("gwm-core-T1").match(O + "/id/event"), undefined);
});
test("install: balasan HTML palsu (bukan html / bukan same-origin) tidak disimpan sebagai halaman", async () => {
  const e = setupPre((u) => (u.endsWith("/id/") ? mk("{}", { type: "basic", ct: "application/json" }) : shellNet(u)));
  await e.handlers.install({ waitUntil: (p) => (e.p = p) }); await e.p;
  assert.equal(await e.cache("gwm-core-T1").match(O + "/id/"), undefined);
});
test("offline sejak awal: halaman cangkang yang belum pernah dibuka tetap tampil (bukan halaman offline)", async () => {
  let on = true;
  const e = setupPre((u) => (on ? shellNet(u) : down()));
  await e.handlers.install({ waitUntil: (p) => (e.p = p) }); await e.p;
  on = false;
  const { res } = await fire(e, O + "/id/event?kat=konser", { mode: "navigate" });
  assert.equal(await res.text(), "HAL:" + O + "/id/event");
});
test("offline: aset cangkang dilayani dari STATIC", async () => {
  let on = true;
  const e = setupPre((u) => (on ? shellNet(u) : down()));
  await e.handlers.install({ waitUntil: (p) => (e.p = p) }); await e.p;
  on = false;
  assert.equal(await (await fire(e, O + "/css/a.css?v=T1")).res.text(), "ASET:" + O + "/css/a.css?v=T1");
});
test("cangkang tidak ikut dipangkas oleh batas halaman (40)", async () => {
  const e = setupPre(shellNet);
  await e.handlers.install({ waitUntil: (p) => (e.p = p) }); await e.p;
  for (let i = 0; i < 45; i++) await fire(e, O + "/id/e/ev-" + i, { mode: "navigate" });
  assert.ok(await e.cache("gwm-core-T1").match(O + "/id/event"));
});
test("font Google: salinan dulu, jalan offline", async () => {
  let on = true;
  const e = setup(() => (on ? mk("FONT", { type: "cors" }) : down()));
  for (const u of ["https://fonts.gstatic.com/s/x.woff2", "https://fonts.googleapis.com/css2?family=X"]) {
    assert.ok((await fire(e, u)).handled, u);
  }
  on = false;
  assert.equal(await (await fire(e, "https://fonts.gstatic.com/s/x.woff2")).res.text(), "FONT");
  assert.equal(await (await fire(e, "https://fonts.googleapis.com/css2?family=X")).res.text(), "FONT");
});
