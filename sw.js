/* GWM service worker: bisa dibuka offline dan lebih cepat saat kunjungan ulang.
   Template ini diubah menjadi /sw.js oleh tools/build.py (VER = versi build, cache lama dibuang otomatis).
   Aturan:
   - Halaman (navigasi): jaringan dulu; bila gagal/lambat dan ada salinan, pakai salinan; bila tak ada, halaman offline.
   - CSS/JS/gambar/font satu domain: tampilkan salinan dulu, perbarui di belakang layar (stale-while-revalidate).
   - File .json (data event, indeks blog): jaringan dulu, salinan bila offline.
   - Pustaka Supabase (versi dikunci di CDN): salinan dulu.
   - Selain itu (Supabase API, cuaca, login, admin, POST) TIDAK disentuh. */
"use strict";
var VER = "202611191341";
var CORE = "gwm-core-" + VER, PAGES = "gwm-pages-" + VER, STATIC = "gwm-static-" + VER, DATA = "gwm-data-" + VER, CDN = "gwm-cdn-v1";
var KEEP = [CORE, PAGES, STATIC, DATA, CDN];
var LIMIT = {}; LIMIT[PAGES] = 40; LIMIT[STATIC] = 160; LIMIT[DATA] = 16;
var SCOPE = self.registration.scope;
var OFFLINE_KEY = SCOPE + "__offline";
var OFFLINE_SRC = ["offline", "offline.html"];
var LIB = /^https:\/\/(?:cdn\.jsdelivr\.net\/npm|unpkg\.com)\/@supabase\/supabase-js@\d+\.\d+\.\d+\//;
var SKIP = /\/(?:admin|login)(?:\.html)?\/?$/;
var ASSET = /\.(?:css|js|png|jpe?g|webp|avif|gif|svg|ico|woff2?)$/i;

function clean(res) { // respons hasil redirect tidak boleh dipakai untuk navigasi: salin jadi respons biasa
  if (!res || !res.redirected) return Promise.resolve(res);
  return res.blob().then(function (b) { return new Response(b, { status: res.status, statusText: res.statusText, headers: res.headers }); });
}
function trim(c, max) {
  if (!max) return Promise.resolve();
  return c.keys().then(function (k) { return k.length > max ? Promise.all(k.slice(0, k.length - max).map(function (x) { return c.delete(x); })) : 0; });
}
function put(name, req, res) {
  return caches.open(name).then(function (c) {
    return clean(res).then(function (r) { return c.put(req, r); }).then(function () { return trim(c, LIMIT[name]); });
  }).catch(function () {});
}
function wait(ms) { return new Promise(function (_, rej) { setTimeout(function () { rej(new Error("timeout")); }, ms); }); }
function storable(res, any) { return res && (res.ok || res.type === "opaque") && (any || res.type === "basic"); }

function networkFirst(ev, name, ms, ignoreSearch, any) {
  var req = ev.request;
  return caches.open(name).then(function (c) {
    return c.match(req, { ignoreSearch: !!ignoreSearch }).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (storable(res, any)) ev.waitUntil(put(name, req, res.clone()));
        return res.status >= 500 && hit ? hit : res;
      });
      if (!hit) return net;                 // kunjungan pertama: tunggu jaringan, tanpa batas waktu
      net.catch(function () {});
      return Promise.race([net, wait(ms)]).catch(function () { return hit; });
    });
  });
}
function swr(ev, name) {
  var req = ev.request;
  return caches.open(name).then(function (c) {
    return c.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (storable(res, true)) ev.waitUntil(put(name, req, res.clone()));
        return res;
      });
      if (hit) { ev.waitUntil(net.catch(function () {})); return hit; }
      return net;
    });
  });
}
function cacheFirst(ev, name) {
  var req = ev.request;
  return caches.open(name).then(function (c) {
    return c.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (storable(res, true)) ev.waitUntil(put(name, req, res.clone()));
        return res;
      });
    });
  });
}
function navigate(ev) {
  return networkFirst(ev, PAGES, 4000, true, false).catch(function () {
    return caches.match(OFFLINE_KEY).then(function (o) { return o || Response.error(); });
  });
}

function precache() { // halaman offline; tidak boleh menggagalkan pemasangan
  return caches.open(CORE).then(function (c) {
    var i = 0;
    function next() {
      if (i >= OFFLINE_SRC.length) return;
      var u = new URL(OFFLINE_SRC[i++], SCOPE).href;
      return fetch(u, { cache: "reload" }).then(function (res) {
        if (!res.ok) return next();
        return res.clone().text().then(function (t) {
          if (t.indexOf("data-gwm-offline") < 0) return next(); // bukan halaman offline kita (mis. 404/SPA fallback)
          return clean(res).then(function (r) { return c.put(OFFLINE_KEY, r); });
        });
      }).catch(next);
    }
    return next();
  }).catch(function () {});
}

self.addEventListener("install", function (ev) {
  ev.waitUntil(precache().then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (ev) {
  ev.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf("gwm-") === 0 && KEEP.indexOf(k) < 0; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (ev) {
  var req = ev.request;
  if (req.method !== "GET" || req.headers.has("range")) return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) { if (LIB.test(req.url)) ev.respondWith(cacheFirst(ev, CDN)); return; }
  if (url.pathname === new URL("sw.js", SCOPE).pathname) return;
  if (req.mode === "navigate") { if (!SKIP.test(url.pathname)) ev.respondWith(navigate(ev)); return; }
  if (/\.json$/i.test(url.pathname)) {
    ev.respondWith(networkFirst(ev, DATA, 4000, false, false).catch(function () {
      return caches.match(req).then(function (r) { return r || Response.error(); });
    }));
    return;
  }
  if (ASSET.test(url.pathname)) ev.respondWith(swr(ev, STATIC));
});
