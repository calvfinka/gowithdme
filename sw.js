/* GWM service worker: bisa dibuka offline dan lebih cepat saat kunjungan ulang.
   Template ini diubah menjadi /sw.js oleh tools/build.py (VER = versi build, cache lama dibuang otomatis).
   Aturan:
   - Halaman (navigasi): jaringan dulu; bila gagal/lambat dan ada salinan, pakai salinan; bila tak ada, halaman offline.
   - CSS/JS/gambar/font satu domain: tampilkan salinan dulu, perbarui di belakang layar (stale-while-revalidate).
   - File .json (data event, indeks blog): jaringan dulu, salinan bila offline.
   - Pustaka Supabase (versi dikunci di CDN): salinan dulu.
   - Font Google: salinan dulu (tanpa ini teks offline jatuh ke font sistem).
   - Selain itu (Supabase API, cuaca, login, admin, POST) TIDAK disentuh.
   Siap-offline sejak kunjungan pertama: saat dipasang, "cangkang aplikasi" (halaman utama + CSS/JS-nya + data event) diunduh di belakang layar.
   Daftarnya dibuat tools/build.py (PRE di bawah), disimpan di CORE (tidak ikut dipangkas), dan dipakai sebagai salinan cadangan navigasi. */
"use strict";
var VER = "202611270732";
var CORE = "gwm-core-" + VER, PAGES = "gwm-pages-" + VER, STATIC = "gwm-static-" + VER, DATA = "gwm-data-" + VER, CDN = "gwm-cdn-v1";
var KEEP = [CORE, PAGES, STATIC, DATA, CDN];
var LIMIT = {}; LIMIT[PAGES] = 40; LIMIT[STATIC] = 160; LIMIT[DATA] = 16;
var SCOPE = self.registration.scope;
var OFFLINE_KEY = SCOPE + "__offline";
var OFFLINE_SRC = ["offline", "offline.html"];
var PRE = {"pages":["id/","id/event","id/gunung","id/bantuan","en/","en/event","en/gunung","en/bantuan"],"assets":["css/style.css?v=202611270732","css/adaptive.css?v=202611270732","css/naver.css?v=202611270732","css/dsk.css?v=202611270732","css/balance.css?v=202611270732","css/dsk-b.css?v=202611270732","css/polish.css?v=202611270732","css/portal-pro.css?v=202611270732","css/glass.css?v=202611270732","js/theme.js?v=202611270732","js/pwa.js?v=202611270732","js/adaptive.js?v=202611270732","css/ads.css?v=202611270732","css/teman.css?v=202611270732","js/i18n.js?v=202611270732","js/config.js?v=202611270732","js/word-filter.js?v=202611270732","js/next-core.js?v=202611270732","js/lineup-core.js?v=202611270732","js/events-src.js?v=202611270732","js/supa.js?v=202611270732","js/probation-core.js?v=202611270732","js/regions.js?v=202611270732","js/geo-core.js?v=202611270732","js/ads-core.js?v=202611270732","js/ads.js?v=202611270732","js/share.js?v=202611270732","js/safety-core.js?v=202611270732","js/ajakan.js?v=202611270732","js/empty-core.js?v=202611270732","js/since-core.js?v=202611270732","js/city-core.js?v=202611270732","js/teman.js?v=202611270732","js/forum-event.js?v=202611270732","js/now.js?v=202611270732","js/gwm-bot.js?v=202611270732","js/home.js?v=202611270732","js/app.js?v=202611270732","js/portal-core.js?v=202611270732","js/monetize-core.js?v=202611270732","js/blogtab-core.js?v=202611270732","js/gunung-data.js?v=202611270732","js/search-index.js?v=202611270732","js/search.js?v=202611270732","js/navauth.js?v=202611270732","js/naver.js?v=202611270732","js/portal-pro.js?v=202611270732","js/track.js?v=202611270732","js/tools.js?v=202611270732","css/panel.css?v=202611270732","js/bantuan.js?v=202611270732","assets/favicon.svg"],"data":["data/events.json"]}; /*PRE*/
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

function lookup(req, names, ignoreSearch) { // cari salinan di beberapa cache, berurutan
  var i = 0;
  function next() {
    if (i >= names.length) return Promise.resolve(undefined);
    return caches.open(names[i++]).then(function (c) { return c.match(req, { ignoreSearch: !!ignoreSearch }); }).then(function (r) { return r || next(); });
  }
  return next();
}
function networkFirst(ev, name, ms, ignoreSearch, any, alt) {
  var req = ev.request;
  return caches.open(name).then(function (c) {
    return lookup(req, [name].concat(alt || []), ignoreSearch).then(function (hit) {
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
  return networkFirst(ev, PAGES, 4000, true, false, [CORE]).catch(function () {
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

function warm(url, name, isPage) { // satu berkas cangkang: gagal = dilewati, tidak menggagalkan pemasangan
  var u = new URL(url, SCOPE).href;
  return fetch(u, isPage ? { cache: "reload" } : undefined).then(function (res) {
    if (!res.ok || res.type !== "basic") return;
    if (isPage && !/html/i.test(res.headers.get("content-type") || "")) return;
    return caches.open(name).then(function (c) { return clean(res).then(function (r) { return c.put(u, r); }); });
  }).catch(function () {});
}
function shell() { // unduh bertahap (6 sekaligus) agar tidak berebut dengan halaman yang sedang dibuka
  var jobs = [];
  PRE.pages.forEach(function (u) { jobs.push([u, CORE, true]); });
  PRE.assets.forEach(function (u) { jobs.push([u, STATIC, false]); });
  PRE.data.forEach(function (u) { jobs.push([u, DATA, false]); });
  var i = 0;
  function worker() {
    if (i >= jobs.length) return Promise.resolve();
    var j = jobs[i++];
    return warm(j[0], j[1], j[2]).then(worker);
  }
  var w = [], n = Math.min(6, jobs.length);
  while (n--) w.push(worker());
  return Promise.all(w);
}

self.addEventListener("install", function (ev) {
  ev.waitUntil(precache().then(shell).then(function () { return self.skipWaiting(); }));
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
  if (url.origin !== self.location.origin) {
    if (LIB.test(req.url) || url.hostname === "fonts.gstatic.com") ev.respondWith(cacheFirst(ev, CDN));
    else if (url.hostname === "fonts.googleapis.com") ev.respondWith(swr(ev, CDN));
    return;
  }
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
