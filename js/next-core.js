/* Fungsi murni untuk "kembali ke tempat tadi setelah login". Tamu yang menekan tombol yang butuh akun dibawa ke login?next=<halaman ini>,
   lalu js/auth.js mengembalikannya. Bentuk next harus lolos aturan safeNext di js/supa.js (huruf/angka dan _ - / . ? = & %), selain itu dibuang.
   Diuji di tests/next-core.test.mjs. */
(function(root, factory){
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.IB_NextCore = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function(){
  /* Harus sama dengan window.safeNext di js/supa.js. */
  var SAFE = /^[a-z0-9][a-z0-9_\-\/.?=&%]*$/i;
  var MAX = 200;

  /* Halaman tujuan (segmen terakhir alamat, tanpa .html) + query bila aman. "" bila halaman tidak cocok (beranda, login, dll). */
  function build(path, search){
    var page = String(path == null ? "" : path).split("?")[0].replace(/\/+$/, "").split("/").pop().replace(/\.html$/i, "");
    /* /id/ dan /en/ adalah beranda (folder bahasa), bukan halaman. */
    if (!/^[a-z0-9][a-z0-9_-]*$/i.test(page) || page === "login" || page === "id" || page === "en") return "";
    var q = String(search == null ? "" : search).replace(/^\?/, "");
    var full = q ? page + "?" + q : page;
    return full.length <= MAX && full.indexOf("..") < 0 && SAFE.test(full) ? full : page;
  }

  /* Alamat login yang membawa pengguna kembali ke halaman ini. */
  function loginUrl(path, search){
    var n = build(path, search);
    return "login" + (n ? "?next=" + encodeURIComponent(n) : "");
  }

  /* Pintasan untuk halaman yang sedang dibuka. loc = window.location. */
  function loginHere(loc){
    loc = loc || (typeof location !== "undefined" ? location : {});
    return loginUrl(loc.pathname, loc.search);
  }

  return { SAFE: SAFE, build: build, loginUrl: loginUrl, loginHere: loginHere };
});
