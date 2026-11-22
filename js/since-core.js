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

  /* Batas tampilan dan jendela waktu (L2): impor massal tidak boleh membuat baris berbunyi "131 event baru". */
  var CAP = 20, WINDOW_DAYS = 30;

  /* Tanggal event (YYYY-MM-DD, WIB) dalam jendela now..now+days. Tanpa tanggal valid dianggap masuk. */
  function inWindow(e, now, days){
    var d = String(e && e.event_date || "");
    if (!/^\d{4}-\d{2}-\d{2}/.test(d)) return true;
    var t = Date.parse(d.slice(0, 10) + "T00:00:00+07:00");
    if (!isFinite(t)) return true;
    return t <= now + days * 864e5;
  }

  /* Label jumlah: lebih dari cap ditulis "20+". */
  function label(n, cap){ cap = cap || CAP; return n > cap ? cap + "+" : String(n); }

  /* Kartu event ditandai "Baru" bila dibuat setelah titik acuan. */
  function isNewSince(e, base){
    var t = Date.parse(e && e.created_at);
    return !!base && isFinite(t) && t > base;
  }

  /* events: daftar event; since: ms; isActive: fungsi (e)=>bool; city: nama kota pilihan pengguna atau "" / "semua".
     opts (opsional): { now: ms, days: jendela hari ke depan }. Tanpa opts tidak ada jendela waktu. */
  function countNew(events, since, isActive, city, opts){
    var total = 0, inCity = 0, c = (city && city !== "semua") ? norm(city) : "";
    if (!since) return { total: 0, city: 0 };
    (events || []).forEach(function(e){
      var t = Date.parse(e && e.created_at);
      if (!isFinite(t) || t <= since) return;
      if (isActive && !isActive(e)) return;
      if (opts && opts.now && !inWindow(e, opts.now, opts.days || WINDOW_DAYS)) return;
      total++;
      if (c && norm(e.city) === c) inCity++;
    });
    return { total: total, city: inCity };
  }

  /* Ajakan terbuka di kota pengguna yang dibuat setelah acuan. rows = invitations_public; today = "YYYY-MM-DD" (WIB). */
  function countInvites(rows, since, city, today){
    var c = (city && city !== "semua") ? norm(city) : "", n = 0;
    if (!since || !c) return 0;
    (rows || []).forEach(function(i){
      var t = Date.parse(i && i.created_at);
      if (!isFinite(t) || t <= since) return;
      if (i.status !== "open") return;
      if (norm(i.city) !== c) return;
      if (i.when_date && today && String(i.when_date) < today) return;
      n++;
    });
    return n;
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

  return { baseline: baseline, countNew: countNew, countInvites: countInvites, inWindow: inWindow, label: label, isNewSince: isNewSince,
           whenLabel: whenLabel, MIN_GAP: MIN_GAP, CAP: CAP, WINDOW_DAYS: WINDOW_DAYS };
});
