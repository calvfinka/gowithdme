import test from "node:test";
import assert from "node:assert/strict";
await import("../js/city-core.js");
const { ALL, names, canon, locCity, pick, store } = globalThis.IB_CityCore;
const REG = { "Jawa Barat": ["Bandung", "Bogor"], "DKI Jakarta": ["Jakarta", "Jakarta Selatan"] };
const K = names(REG);
const loc = (c) => JSON.stringify({ city: c, prov: "", macro: "", radiusKm: 0 });

test("names: semua kota dari peta provinsi", () => {
  assert.deepEqual(K, ["Bandung", "Bogor", "Jakarta", "Jakarta Selatan"]);
  assert.deepEqual(names(null), []);
});
test("canon: tanpa beda huruf besar; semua, kosong, dan asing bukan kota", () => {
  assert.equal(canon("bandung", K), "Bandung");
  assert.equal(canon(" Jakarta  Selatan ", K), "Jakarta Selatan");
  assert.equal(canon("semua", K), "");
  assert.equal(canon("", K), "");
  assert.equal(canon("Atlantis", K), "");
  assert.equal(canon(null, K), "");
});
test("locCity: JSON rusak atau bukan objek dianggap kosong", () => {
  assert.equal(locCity(loc("Bogor")), "Bogor");
  assert.equal(locCity("{rusak"), "");
  assert.equal(locCity("123"), "");
  assert.equal(locCity(null), "");
  assert.equal(locCity('{"city":5}'), "");
});
test("pick: pilihan di Cari teman menang atas kota beranda dan profil", () => {
  const r = pick({ tcity: "Bogor", loc: loc("Bandung"), profile: "Jakarta" }, K);
  assert.equal(r.city, "Bogor");
  assert.equal(r.source, "tcity");
});
test("pick: tanpa pilihan di Cari teman, kota beranda dipakai", () => {
  const r = pick({ tcity: "", loc: loc("Bandung"), profile: "Jakarta" }, K);
  assert.equal(r.city, "Bandung");
  assert.equal(r.source, "loc");
});
test("pick: kota profil dipakai bila dua sumber lokal kosong", () => {
  const r = pick({ tcity: "", loc: null, profile: "Jakarta" }, K);
  assert.equal(r.city, "Jakarta");
  assert.equal(r.source, "profile");
});
test("pick: 'Semua kota' yang sengaja dipilih tidak tertimpa", () => {
  const r = pick({ tcity: ALL, loc: loc("Bandung"), profile: "Jakarta" }, K);
  assert.equal(r.city, "");
  assert.equal(r.source, "all");
  assert.equal(r.needProfile, false);
});
test("pick: gwm_loc 'semua' atau kota asing jatuh ke sumber berikutnya", () => {
  assert.equal(pick({ loc: loc("semua"), profile: "Bogor" }, K).city, "Bogor");
  assert.equal(pick({ loc: loc("Atlantis"), profile: "Bogor" }, K).city, "Bogor");
  assert.equal(pick({ tcity: "Atlantis", loc: loc("Bandung") }, K).city, "Bandung");
});
test("pick: needProfile hanya bila belum ada kota dan profil belum dibaca", () => {
  assert.equal(pick({}, K).needProfile, true);
  assert.equal(pick({ profile: "Atlantis" }, K).needProfile, false);
  assert.equal(pick({ loc: loc("Bandung") }, K).needProfile, false);
  assert.equal(pick({}, K).city, "");
});
test("store: semua kota disimpan sebagai tanda, kota sebagai nama", () => {
  assert.equal(store(""), ALL);
  assert.equal(store("Bandung"), "Bandung");
});
