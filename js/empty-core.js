/* Fungsi murni: aksi yang ditawarkan saat daftar ajakan kosong, supaya pengguna tidak berhenti di "belum ada".
   Dipakai js/teman.js; diuji di tests/empty-core.test.mjs. */
(function(root, factory){
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.IB_EmptyCore = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function(){
  /* ctx: {mode:"near"|"all", filtered:bool (ada filter minat/tag), where:"list"|"home"}
     Hasil: daftar kunci aksi berurutan (maksimal 2): "all" (lihat semua kota), "reset" (hapus filter),
     "events" (lihat event terdekat), "create" (buat ajakan pertama). */
  function emptyActions(ctx){
    ctx = ctx || {};
    var out = [];
    if (ctx.where === "home") return ["events", "create"];
    if (ctx.filtered) out.push("reset");
    else if (ctx.mode === "near") out.push("all");
    if (out.length < 2) out.push("events");
    if (out.length < 2) out.push("create");
    return out.slice(0, 2);
  }
  return { emptyActions: emptyActions };
});
