import test from "node:test";
import assert from "node:assert/strict";
globalThis.window = globalThis;
await import("../js/geo-core.js");
await import("../js/regions.js");
const { km, resolve, onbNeeded, MAX_KM } = globalThis.IB_GeoCore;
const GEO = globalThis.IB_GEO;
const DB = ["Jakarta", "Bandung", "Bogor", "Surabaya", "Medan"];
const at = (n) => GEO[n];

test("km: Jakarta ke Bandung sekitar 116 km, titik sama 0", () => {
  const d = km(...at("Jakarta"), ...at("Bandung"));
  assert.ok(d > 105 && d < 125, String(d));
  assert.equal(km(1, 2, 1, 2), 0);
});
test("kota ada di GWM: dikenali", () => {
  const r = resolve(...at("Bandung"), { geo: GEO, cities: DB });
  assert.equal(r.kind, "known"); assert.equal(r.city, "Bandung");
});
test("titik terdekat bukan kota GWM tapi kota GWM masih dekat: pakai kota GWM (Lembang -> Bandung)", () => {
  const r = resolve(...at("Lembang"), { geo: GEO, cities: DB });
  assert.equal(r.kind, "known"); assert.equal(r.city, "Bandung");
});
test("Jakarta Selatan -> Jakarta", () => {
  const r = resolve(...at("Jakarta Selatan"), { geo: GEO, cities: DB });
  assert.equal(r.kind, "known"); assert.equal(r.city, "Jakarta");
});
test("kota terbaca tapi belum ada di GWM: unlisted + tawaran kota terdekat", () => {
  const r = resolve(...at("Cirebon"), { geo: GEO, cities: DB });
  assert.equal(r.kind, "unlisted"); assert.equal(r.city, "Cirebon");
  assert.ok(r.fallback && r.fallback.km <= 150, JSON.stringify(r));
});
test("kota belum ada dan tidak ada kota GWM dalam 150 km: tanpa tawaran terdekat", () => {
  const r = resolve(...at("Jayapura"), { geo: GEO, cities: DB });
  assert.equal(r.kind, "unlisted"); assert.equal(r.fallback, null);
});
test("nama cocok tanpa beda huruf besar dan spasi", () => {
  const r = resolve(...at("Bandung"), { geo: GEO, cities: [" bandung "] });
  assert.equal(r.kind, "known"); assert.equal(r.city, " bandung ");
});
test("di luar jangkauan (tengah Samudra Hindia): tidak menebak", () => {
  const r = resolve(-20, 90, { geo: GEO, cities: DB });
  assert.deepEqual(r, { kind: "none", reason: "far" });
});
test("akurasi terlalu kasar tidak dipakai; akurasi baik dipakai", () => {
  assert.deepEqual(resolve(...at("Bandung"), { geo: GEO, cities: DB, accuracy: 50000 }), { kind: "none", reason: "coarse" });
  assert.equal(resolve(...at("Bandung"), { geo: GEO, cities: DB, accuracy: 80 }).kind, "known");
});
test("koordinat tidak valid ditolak", () => {
  for (const [a, b] of [[NaN, 1], [null, 2], ["1", "2"], [95, 10], [1, 190], [undefined, undefined]])
    assert.deepEqual(resolve(a, b, { geo: GEO, cities: DB }), { kind: "none", reason: "bad" });
});
test("data kosong: tidak error", () => {
  assert.deepEqual(resolve(-6.2, 106.8, {}), { kind: "none", reason: "far" });
  assert.deepEqual(resolve(-6.2, 106.8), { kind: "none", reason: "far" });
});
test("jarak maksimum konsisten", () => { assert.equal(MAX_KM, 80); });

const NOW = Date.parse("2026-11-22T00:00:00Z");
test("onbNeeded: akun baru tanpa kota, belum dilewati", () => {
  assert.equal(onbNeeded({}, "2026-11-21T00:00:00Z", false, NOW), true);
  assert.equal(onbNeeded(null, "2026-11-21T00:00:00Z", false, NOW), true);
});
test("onbNeeded: sudah punya kota, sudah dilewati, atau akun lama/tanggal rusak -> tidak", () => {
  assert.equal(onbNeeded({ city_id: 5 }, "2026-11-21T00:00:00Z", false, NOW), false);
  assert.equal(onbNeeded({}, "2026-11-21T00:00:00Z", true, NOW), false);
  assert.equal(onbNeeded({}, "2026-11-01T00:00:00Z", false, NOW), false);
  assert.equal(onbNeeded({}, "2026-12-01T00:00:00Z", false, NOW), false);
  assert.equal(onbNeeded({}, undefined, false, NOW), false);
});
