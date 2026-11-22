/* Fungsi murni untuk kota awal di Cari teman. Tiga penyimpan kota (gwm_tcity, gwm_loc, profiles.city_id) tidak saling tahu;
   modul ini menentukan satu nilai awal dari ketiganya. Urutan: pilihan terakhir di Cari teman, lalu kota beranda/event, lalu kota profil.
   Diuji di tests/city-core.test.mjs. */
(function(root, factory){
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.IB_CityCore = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function(){
  /* Pengguna yang sengaja memilih "Semua kota" di Cari teman disimpan sebagai "*", supaya tidak tertimpa kota lain. */
  var ALL = "*";

  function key(s){ return String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }

  /* Daftar kota valid dari peta provinsi {prov: [kota,...]}. */
  function names(regions){
    var out = [];
    Object.keys(regions || {}).forEach(function(p){ (regions[p] || []).forEach(function(c){ out.push(c); }); });
    return out;
  }

  /* Nama kanonik bila cocok dengan daftar (tanpa beda huruf besar), selain itu "". "semua" dan kosong bukan kota. */
  function canon(name, known){
    var k = key(name);
    if (!k || k === "semua" || k === "all") return "";
    for (var i = 0; i < (known || []).length; i++) if (key(known[i]) === k) return known[i];
    return "";
  }

  /* gwm_loc berupa JSON {city,...}; nilai rusak dianggap kosong. */
  function locCity(raw){
    if (!raw) return "";
    try { var o = JSON.parse(raw); return o && typeof o === "object" && typeof o.city === "string" ? o.city : ""; }
    catch (e) { return ""; }
  }

  /* Kota awal. in: {tcity, loc (string JSON), profile (nama kota profil)}. known: daftar nama kota. Kembalian: nama kota atau "" (semua kota).
     needProfile: true bila dua sumber lokal belum menentukan dan kota profil layak dicari ke server. */
  function pick(inp, known){
    inp = inp || {};
    if (inp.tcity === ALL) return { city: "", source: "all", needProfile: false };
    var t = canon(inp.tcity, known);
    if (t) return { city: t, source: "tcity", needProfile: false };
    var l = canon(locCity(inp.loc), known);
    if (l) return { city: l, source: "loc", needProfile: false };
    var p = canon(inp.profile, known);
    if (p) return { city: p, source: "profile", needProfile: false };
    return { city: "", source: "none", needProfile: !inp.profile };
  }

  /* Nilai yang disimpan ke gwm_tcity untuk pilihan di dropdown: "" berarti semua kota. */
  function store(city){ return city ? String(city) : ALL; }

  return { ALL: ALL, key: key, names: names, canon: canon, locCity: locCity, pick: pick, store: store };
});
