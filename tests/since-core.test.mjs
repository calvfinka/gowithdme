import test from "node:test";
import assert from "node:assert/strict";
await import("../js/since-core.js");
const { baseline, countNew, whenLabel, MIN_GAP } = globalThis.IB_SinceCore;
const NOW = Date.parse("2026-11-22T10:00:00Z");
const iso = (h) => new Date(NOW - h * 36e5).toISOString();

test("baseline: pengunjung pertama tidak punya acuan", () => {
  assert.equal(baseline(null, null, NOW), null);
  assert.equal(baseline("abc", "", NOW), null);
});
test("baseline: sesi memakai waktu tersimpan, lalu menetap pada acuan sesi", () => {
  const seen = NOW - 30 * 36e5;
  assert.equal(baseline(String(seen), null, NOW), seen);
  assert.equal(baseline(String(NOW - 1000), String(seen), NOW), seen);
});
test("baseline: waktu di masa depan (jam perangkat salah) diabaikan", () => {
  assert.equal(baseline(String(NOW + 9e6), null, NOW), null);
});
test("countNew: hanya event dibuat setelah acuan dan masih aktif", () => {
  const ev = [
    { created_at: iso(2), city: "Bandung" },
    { created_at: iso(30), city: "Bandung" },
    { created_at: iso(1), city: "Jakarta" },
    { created_at: iso(3), city: "Bandung", expired: true },
    { city: "Bandung" },
    { created_at: "bukan tanggal", city: "Bandung" },
  ];
  const r = countNew(ev, NOW - 10 * 36e5, (e) => !e.expired, "Bandung");
  assert.deepEqual(r, { total: 2, city: 1 });
});
test("countNew: kota 'semua' atau kosong tidak menghitung per kota; tanpa acuan hasil nol", () => {
  const ev = [{ created_at: iso(1), city: "Bandung" }];
  assert.deepEqual(countNew(ev, NOW - 5 * 36e5, null, "semua"), { total: 1, city: 0 });
  assert.deepEqual(countNew(ev, 0, null, ""), { total: 0, city: 0 });
  assert.deepEqual(countNew(null, NOW, null, ""), { total: 0, city: 0 });
});
test("whenLabel: terlalu dekat disembunyikan; hari ini, kemarin, n hari", () => {
  assert.equal(whenLabel(NOW - MIN_GAP + 1000, NOW), null);
  assert.deepEqual(whenLabel(NOW - 5 * 36e5, NOW), { k: "today", n: 0 });
  assert.deepEqual(whenLabel(NOW - 30 * 36e5, NOW), { k: "yesterday", n: 1 });
  assert.deepEqual(whenLabel(NOW - 5 * 864e5, NOW), { k: "days", n: 5 });
  assert.equal(whenLabel(0, NOW), null);
});
