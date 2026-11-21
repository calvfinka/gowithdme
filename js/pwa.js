/* Pendaftaran service worker (offline + cepat), tombol "Pasang aplikasi", dan penanda offline. */
(function () {
  "use strict";
  var L = document.documentElement.lang === "en" ? "en" : "id";
  var T = {
    id: { off: "Kamu sedang offline. Menampilkan data tersimpan.", on: "Kembali online." },
    en: { off: "You're offline. Showing saved data.", on: "Back online." }
  }[L];

  var h = location.hostname;
  if ("serviceWorker" in navigator && (location.protocol === "https:" || h === "localhost" || h === "127.0.0.1")) {
    var s = document.currentScript || document.querySelector('script[src*="pwa.js"]');
    var url;
    try { url = new URL("../sw.js", s && s.src ? s.src : document.baseURI).href; } catch (e) { url = "/sw.js"; }
    window.addEventListener("load", function () { navigator.serviceWorker.register(url).catch(function () {}); });
  }

  var dp = null;
  function btn() { return document.getElementById("mmInstall"); }
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault(); dp = e;
    var b = btn(); if (b) b.hidden = false;
  });
  window.addEventListener("appinstalled", function () { dp = null; var b = btn(); if (b) b.hidden = true; });
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("#mmInstall");
    if (!b || !dp) return;
    dp.prompt();
    dp.userChoice.then(function () { dp = null; b.hidden = true; }, function () {});
  });

  var pill = null;
  function show(t, auto) {
    if (!pill) {
      pill = document.createElement("div");
      pill.setAttribute("role", "status");
      pill.style.cssText = "position:fixed;left:50%;bottom:max(16px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:9999;background:#16251f;color:#fff;padding:9px 16px;border-radius:999px;font:600 13px/1.3 system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.3);max-width:calc(100vw - 32px);text-align:center";
      document.body.appendChild(pill);
    }
    pill.textContent = t; pill.hidden = false;
    clearTimeout(pill._t);
    if (auto) pill._t = setTimeout(function () { pill.hidden = true; }, 2500);
  }
  window.addEventListener("offline", function () { show(T.off, false); });
  window.addEventListener("online", function () { if (pill && !pill.hidden) show(T.on, true); });
  if (navigator.onLine === false && document.body) show(T.off, false);
})();
