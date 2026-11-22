/* Fungsi murni untuk "Pakai lokasiku" di kartu pilih kota akun baru. Koordinat tidak pernah dikirim ke server: dihitung di peramban,
   hasilnya hanya nama kota yang lalu dikonfirmasi pengguna. Juga memuat aturan kapan kartu kota perlu tampil (dipakai auth.js di dua tempat).
   Diuji di tests/geo-core.test.mjs. */
(function(root, factory){
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.IB_GeoCore = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function(){
  var MAX_KM = 80;        /* titik terdekat lebih jauh dari ini = di luar jangkauan, tidak menebak */
  var NEAR_KM = 25;       /* kota yang ada di GoWithDME dipilih bila selisih jaraknya dari titik terdekat tidak lebih dari ini (Lembang -> Bandung) */
  var FALLBACK_KM = 150;  /* batas tawaran "pakai kota terdekat yang sudah ada" */
  var MAX_ACC = 30000;    /* akurasi lebih kasar dari 30 km (mis. perkiraan dari jaringan) tidak dipakai */
  var ONB_DAYS = 7;       /* kartu kota hanya untuk akun yang berumur kurang dari ini */

  function key(s){ return String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
  function num(v){ return typeof v === "number" && isFinite(v); }

  function km(aLat, aLng, bLat, bLng){
    var R = 6371, rad = Math.PI / 180;
    var dLat = (bLat - aLat) * rad, dLng = (bLng - aLng) * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  /* geo = {nama: [lat, lng]}. Urut dari yang terdekat. */
  function ranked(lat, lng, geo){
    var out = [];
    Object.keys(geo || {}).forEach(function(n){
      var g = geo[n];
      if (g && num(g[0]) && num(g[1])) out.push({ name: n, km: km(lat, lng, g[0], g[1]) });
    });
    out.sort(function(a, b){ return a.km - b.km; });
    return out;
  }

  /* o: {geo, cities (nama kota yang ada di tabel cities), accuracy (meter, opsional)}.
     Hasil: {kind:"known", city, km} kota ada di GoWithDME; {kind:"unlisted", city, km, fallback:{city,km}|null} kota terbaca tapi belum ada di GoWithDME;
     {kind:"none", reason:"bad"|"coarse"|"far"} tidak menebak. */
  function resolve(lat, lng, o){
    o = o || {};
    if (!num(lat) || !num(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return { kind: "none", reason: "bad" };
    if (num(o.accuracy) && o.accuracy > MAX_ACC) return { kind: "none", reason: "coarse" };
    var all = ranked(lat, lng, o.geo);
    if (!all.length || all[0].km > MAX_KM) return { kind: "none", reason: "far" };
    var have = {};
    (o.cities || []).forEach(function(c){ have[key(c)] = c; });
    var near = all[0], listed = null;
    for (var i = 0; i < all.length; i++) if (have[key(all[i].name)]) { listed = { city: have[key(all[i].name)], km: all[i].km }; break; }
    if (listed && listed.km <= MAX_KM && listed.km <= near.km + NEAR_KM) return { kind: "known", city: listed.city, km: Math.round(listed.km) };
    return {
      kind: "unlisted", city: near.name, km: Math.round(near.km),
      fallback: listed && listed.km <= FALLBACK_KM ? { city: listed.city, km: Math.round(listed.km) } : null
    };
  }

  /* Kartu kota perlu tampil: profil belum punya kota, belum pernah dilewati/disimpan di perangkat ini, dan akun masih baru. */
  function onbNeeded(profile, createdAt, seen, now){
    if (profile && profile.city_id) return false;
    if (seen) return false;
    var age = (num(now) ? now : Date.now()) - new Date(createdAt || 0).getTime();
    return age >= 0 && age < ONB_DAYS * 864e5;
  }

  return { MAX_KM: MAX_KM, NEAR_KM: NEAR_KM, FALLBACK_KM: FALLBACK_KM, MAX_ACC: MAX_ACC, ONB_DAYS: ONB_DAYS, km: km, ranked: ranked, resolve: resolve, onbNeeded: onbNeeded };
});
