/* Fungsi murni untuk merapikan teks line-up. Kolom `lineup` seharusnya teks biasa ("Band A, Band B"), tetapi sebagian baris
   tersimpan sebagai literal array Postgres, mis. {NPD,Perunggu,"Nadin Amizah"}, lalu tampil mentah dengan kurung dan tanda kutip.
   clean() mengubah bentuk itu menjadi "NPD, Perunggu, Nadin Amizah"; teks biasa dikembalikan apa adanya.
   Diuji di tests/lineup-core.test.mjs. Dipakai js/events-src.js saat memuat event, sehingga semua halaman (kartu, detail, pencarian, artis) ikut rapi. */
(function(root, factory){
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.IB_Lineup = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function(){
  /* Bentuk literal array: diawali { dan diakhiri }, tanpa baris baru di luar tanda kutip. */
  function isArrayLiteral(s){ return /^\{[\s\S]*\}$/.test(s); }

  /* Pecah isi di antara kurung kurawal pada koma yang berada di luar tanda kutip. Dalam tanda kutip, \" dan \\ adalah escape. */
  function split(inner){
    var out = [], cur = "", q = false, i, c;
    for (i = 0; i < inner.length; i++) {
      c = inner.charAt(i);
      if (q) {
        if (c === "\\" && i + 1 < inner.length) { cur += inner.charAt(++i); }
        else if (c === '"') { q = false; }
        else { cur += c; }
      } else if (c === '"') { q = true; }
      else if (c === ",") { out.push(cur); cur = ""; }
      else { cur += c; }
    }
    out.push(cur);
    return out;
  }

  function clean(raw){
    if (raw == null) return raw;
    var s = String(raw).trim();
    if (!isArrayLiteral(s)) return raw;
    var names = split(s.slice(1, -1)).map(function(x){ return x.replace(/\s+/g, " ").trim(); })
      .filter(function(x){ return x && x.toUpperCase() !== "NULL"; });
    return names.join(", ");
  }

  return { clean: clean, isArrayLiteral: isArrayLiteral };
});
