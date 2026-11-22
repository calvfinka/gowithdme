/* Fungsi murni untuk "Baru sejak kunjunganmu" di beranda: menentukan titik acuan kunjungan, menghitung event baru,
   dan membuat label waktu. Tanpa server: semua dari localStorage dan data event yang sudah dimuat.
   Diuji di tests/since-core.test.mjs. */
(function(root, factory){
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.IB_SinceCore = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function(){
  var MIN_GAP = 3 * 36e5; /* kunjungan kurang dari 3 jam lalu dianggap sesi yang sama */

  function num(v){ v = +v; return isFinite(v) && v > 0 ? v : 0; }

  /* Titik acuan dipegang tetap selama satu sesi (sessionBase), supaya memuat ulang halaman tidak mengosongkan hitungan.
     Sesi baru memakai waktu kunjungan tersimpan (seen). Null = pengunjung pertama atau data tidak valid. */
  function baseline(seen, sessionBase, now){
    var sb = num(sessionBase), s = num(seen);
    if (sb && sb <= now) return sb;
    if (s && s <= now) return s;
    return null;
  }

  function norm(x){ return String(x == null ? "" : x).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }

  /* events: daftar event; since: ms; isActive: fungsi (e)=>bool; city: nama kota pilihan pengguna atau "" / "semua". */
  function countNew(events, since, isActive, city){
    var total = 0, inCity = 0, c = (city && city !== "semua") ? norm(city) : "";
    if (!since) return { total: 0, city: 0 };
    (events || []).forEach(function(e){
      var t = Date.parse(e && e.created_at);
      if (!isFinite(t) || t <= since) return;
      if (isActive && !isActive(e)) return;
      total++;
      if (c && norm(e.city) === c) inCity++;
    });
    return { total: total, city: inCity };
  }

  /* Kunci label: "today" | "yesterday" | "days" (dengan n). Null bila terlalu dekat dengan sekarang. */
  function whenLabel(since, now){
    var gap = now - since;
    if (!since || gap < MIN_GAP) return null;
    var d = Math.floor(gap / 864e5);
    if (d < 1) return { k: "today", n: 0 };
    if (d === 1) return { k: "yesterday", n: 1 };
    return { k: "days", n: Math.min(d, 99) };
  }

  return { baseline: baseline, countNew: countNew, whenLabel: whenLabel, MIN_GAP: MIN_GAP };
});
