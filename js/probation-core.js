/* Masa percobaan akun baru (48 jam pertama): mengubah galat trigger `probation_limit` dari server menjadi teks ramah
   (dua bahasa, dengan saran langkah lain) dan memberi tahu batasnya lebih dulu di formulir.
   Angka batas di LIMITS harus sama dengan supabase/patch_pengguna_baru.sql (argumen probation_limit).
   Fungsi murni diuji di tests/probation-core.test.mjs. */
(function(root, factory){
  var api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) { root.IB_ProbCore = api; root.IB_ErrText = api.errText; root.IB_ProbNote = api.note; }
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function(root){
  var HOURS = 48;
  var LIMITS = { inv: 2, post: 2, reply: 10, chat: 2, event: 3 };
  /* Frasa kegiatan persis seperti di SQL (argumen ke-4 probation_limit) -> kunci. */
  var WHAT = {
    "ajakan baru per hari": "inv",
    "kiriman forum per hari": "post",
    "balasan forum per hari": "reply",
    "percakapan baru per hari": "chat",
    "pengajuan event per hari": "event"
  };

  /* "Akun baru dibatasi 2 ajakan baru per hari selama 48 jam pertama. Coba lagi besok." -> {kind:"inv", n:2}; selain itu null. */
  function parse(msg){
    var m = /Akun baru dibatasi\s+(\d+)\s+(.+?)\s+selama\s+48\s+jam/i.exec(String(msg == null ? "" : msg));
    if (!m) return null;
    var kind = WHAT[m[2].trim().toLowerCase()];
    return kind ? { kind: kind, n: +m[1] } : null;
  }

  /* Akun auth baru (user.created_at < 48 jam). Verifikasi admin tidak terlihat di klien, jadi ini perkiraan untuk catatan awal saja. */
  function isNew(user, now){
    var t = Date.parse(user && user.created_at);
    now = now == null ? Date.now() : now;
    return isFinite(t) && t <= now + 6e4 && now - t < HOURS * 36e5;
  }

  function T(){ return root && root.IB_T ? root.IB_T : function(k){ return k; }; }

  /* Teks galat untuk ditampilkan. Galat batas percobaan dipetakan; galat lain dikembalikan apa adanya. */
  function errText(err){
    var raw = err && err.message != null ? String(err.message) : (typeof err === "string" ? err : "");
    var p = parse(raw);
    if (!p) return raw;
    var tr = T();
    return tr("pb_msg", { n: p.n, what: tr("pb_w_" + p.kind), tip: tr("pb_tip_" + p.kind) });
  }

  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* Catatan satu baris di atas formulir untuk akun baru; string kosong bila akun sudah lewat 48 jam. */
  function note(kind, user, now){
    if (!LIMITS[kind] || !isNew(user, now)) return "";
    var tr = T();
    return '<p class="meta pb-note">' + esc(tr("pb_note", { n: LIMITS[kind], what: tr("pb_w_" + kind) })) + "</p>";
  }

  return { parse: parse, isNew: isNew, errText: errText, note: note, LIMITS: LIMITS, HOURS: HOURS };
});
