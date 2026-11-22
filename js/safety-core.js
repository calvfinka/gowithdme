/* Fungsi murni untuk "tips aman bertemu pertama kali": tampil sekali per browser, sebelum permintaan gabung pertama.
   Penanda disimpan saat pengguna menekan "Mengerti" (bukan saat batal). Diuji di tests/safety-core.test.mjs. */
(function(root, factory){
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.IB_SafetyCore = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function(){
  var KEY = "gwm_safe_seen";
  var VERSION = "1";
  /* Kunci teks di tools/strings.py (J). Urutan = urutan tampil. */
  var TIPS = ["sf_1", "sf_2", "sf_3", "sf_4"];

  /* raw = nilai localStorage mentah. Tips perlu tampil kecuali sudah ditandai versi ini. */
  function needed(raw){ return raw !== VERSION; }

  return { KEY: KEY, VERSION: VERSION, TIPS: TIPS, needed: needed };
});
