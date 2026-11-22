/* Fungsi murni: tulisan yang tampil di tab beranda "Panduan & Komunitas".
   Hanya tiga topik. Arsip blog lengkap (/blog/) tetap menampilkan semua kategori.
   Dipakai js/portal-pro.js; diuji di tests/blogtab-core.test.mjs. */
(function(root, factory){
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.IB_BlogTab = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function(){
  var TOPICS = ["panduan-konser", "tips-gunung", "komunitas"];
  function keep(posts){
    var out = (Array.isArray(posts) ? posts : []).filter(function(p){ return p && TOPICS.indexOf(p.category) >= 0; });
    return out.map(function(p, i){ return { p: p, i: i }; })
      .sort(function(a, b){
        var x = String(a.p.published_at || ""), y = String(b.p.published_at || "");
        return x < y ? 1 : x > y ? -1 : a.i - b.i;
      }).map(function(o){ return o.p; });
  }
  /* kunci topik yang punya tulisan, urut tetap sesuai TOPICS */
  function topics(list){
    return TOPICS.filter(function(t){ return list.some(function(p){ return p.category === t; }); });
  }
  /* filter PostgREST: hanya kategori yang boleh tampil di tab beranda (dipakai untuk ambil data langsung dari Supabase) */
  function query(){ return "category=in.(" + TOPICS.join(",") + ")"; }
  /* cukup tulisan yang tampil di tab: tiap topik maksimal n terbaru, supaya satu topik ramai tidak menghabiskan jatah */
  function limit(posts, n){
    var seen = {};
    return keep(posts).filter(function(p){ seen[p.category] = (seen[p.category] || 0) + 1; return seen[p.category] <= n; });
  }
  return { TOPICS: TOPICS, keep: keep, topics: topics, query: query, limit: limit };
});
