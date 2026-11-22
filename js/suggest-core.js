/* Fungsi murni untuk saran otomatis saat mengetik di formulir (lokasi, penyelenggara, line-up).
   Sumber saran: event yang sudah ada. collect() menghitung nilai unik dari daftar event; rank() memilih dan mengurutkan sesuai ketikan;
   tokenAt()/replaceToken() mengurus kolom berisi beberapa nama dipisah koma (line-up). Diuji di tests/suggest-core.test.mjs. */
(function(root, factory){
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.IB_SuggestCore = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function(){
  var SKIP = /^(-|tba|tbc|tbd|info menyusul|menyusul|diumumkan)$/i;

  function key(s){
    s = String(s == null ? "" : s);
    try { s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (e) {}
    return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }
  function tidy(s){ return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); }

  /* rows: daftar objek. pick(row) -> teks atau daftar teks. where(row) -> true bila baris dipakai. cityOf(row) -> nama kota (opsional).
     Hasil: [{label, k, n, cities:{kunciKota:true}}], terurut dari yang paling sering muncul. */
  function collect(rows, pick, where, cityOf){
    var map = {};
    (rows || []).forEach(function(r){
      if (where && !where(r)) return;
      var v = pick(r), ck = cityOf ? key(cityOf(r)) : "";
      (Array.isArray(v) ? v : [v]).forEach(function(s){
        s = tidy(s);
        if (s.length < 2 || s.length > 80 || SKIP.test(s)) return;
        var k = key(s); if (!k) return;
        var m = map[k] || (map[k] = { label: s, k: k, n: 0, cities: {} });
        m.n++; if (ck) m.cities[ck] = true;
      });
    });
    return Object.keys(map).map(function(k){ return map[k]; }).sort(function(a, b){ return b.n - a.n || (a.label < b.label ? -1 : 1); });
  }

  /* Saran untuk ketikan `query`. opts: limit (6), city (nama kota; didahulukan), exclude (daftar teks yang sudah dipakai).
     Ketikan kosong: hanya saran dari kota itu bila kota diisi, selain itu yang paling sering. Yang sama persis dengan ketikan tidak disarankan. */
  function rank(items, query, opts){
    opts = opts || {};
    var q = key(query), limit = opts.limit || 6, city = key(opts.city), ex = {};
    (opts.exclude || []).forEach(function(x){ var k = key(x); if (k) ex[k] = true; });
    var out = [];
    (items || []).forEach(function(it){
      if (ex[it.k]) return;
      var score = 0;
      if (q) {
        if (it.k === q) return;
        if (it.k.indexOf(q) === 0) score = 0;
        else if ((" " + it.k).indexOf(" " + q) > -1) score = 1;
        else if (it.k.indexOf(q) > -1) score = 2;
        else return;
      } else if (city && !it.cities[city]) return;
      out.push({ it: it, c: city && it.cities[city] ? 0 : 1, s: score });
    });
    out.sort(function(a, b){ return a.c - b.c || a.s - b.s || b.it.n - a.it.n || (a.it.label < b.it.label ? -1 : 1); });
    return out.slice(0, limit).map(function(x){ return x.it.label; });
  }

  /* Bagian yang sedang diketik. multi=false: seluruh isi. multi=true: potongan di antara pemisah (koma, titik koma, baris baru) di sekitar kursor.
     Kembalian: {start, end, text, others}; others = potongan lain (untuk dikecualikan dari saran). */
  function tokenAt(value, caret, multi){
    value = String(value == null ? "" : value);
    if (!multi) return { start: 0, end: value.length, text: value.trim(), others: [] };
    var c = caret == null || caret > value.length ? value.length : caret, s = c, e = c;
    while (s > 0 && !/[,;\n]/.test(value.charAt(s - 1))) s--;
    while (e < value.length && !/[,;\n]/.test(value.charAt(e))) e++;
    while (s < e && /\s/.test(value.charAt(s))) s++;
    var rest = value.slice(0, s) + "," + value.slice(e);
    return { start: s, end: e, text: value.slice(s, e).trim(),
      others: rest.split(/[,;\n]/).map(function(x){ return x.trim(); }).filter(Boolean) };
  }

  /* Ganti bagian yang diketik dengan pilihan. Di kolom daftar, pilihan di ujung diberi ", " agar bisa langsung lanjut mengetik. */
  function replaceToken(value, tok, pick, multi){
    value = String(value == null ? "" : value);
    if (!multi) return { value: pick, caret: pick.length };
    var before = value.slice(0, tok.start), after = value.slice(tok.end), tail = after.trim() === "";
    var head = before + pick;
    return { value: head + (tail ? ", " : "") + (tail ? "" : after), caret: head.length + (tail ? 2 : 0) };
  }

  return { key: key, collect: collect, rank: rank, tokenAt: tokenAt, replaceToken: replaceToken };
});
