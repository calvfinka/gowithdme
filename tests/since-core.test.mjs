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

/* ---- L2 + B1 ---- */
const { countInvites, inWindow, label, isNewSince, CAP, WINDOW_DAYS } = globalThis.IB_SinceCore;
const day = (n) => new Date(NOW + n * 864e5).toISOString().slice(0, 10);

test("label: lebih dari batas ditulis dengan plus", () => {
  assert.equal(CAP, 20);
  assert.equal(label(1), "1");
  assert.equal(label(20), "20");
  assert.equal(label(21), "20+");
  assert.equal(label(131), "20+");
});
test("inWindow: event jauh di masa depan tidak ikut, tanpa tanggal valid ikut", () => {
  assert.equal(WINDOW_DAYS, 30);
  assert.equal(inWindow({ event_date: day(10) }, NOW, 30), true);
  assert.equal(inWindow({ event_date: day(30) }, NOW, 30), true);
  assert.equal(inWindow({ event_date: day(45) }, NOW, 30), false);
  assert.equal(inWindow({}, NOW, 30), true);
  assert.equal(inWindow({ event_date: "bukan" }, NOW, 30), true);
});
test("countNew: impor massal event jauh tidak membuat hitungan bising", () => {
  const ev = [];
  for (let i = 0; i < 50; i++) ev.push({ created_at: iso(2), city: "Bandung", event_date: day(90 + i) });
  ev.push({ created_at: iso(2), city: "Bandung", event_date: day(5) });
  ev.push({ created_at: iso(2), city: "Jakarta", event_date: day(12) });
  const r = countNew(ev, NOW - 10 * 36e5, () => true, "Bandung", { now: NOW, days: 30 });
  assert.deepEqual(r, { total: 2, city: 1 });
  const lama = countNew(ev, NOW - 10 * 36e5, () => true, "Bandung");
  assert.equal(lama.total, 52);
});
test("isNewSince: hanya yang dibuat setelah acuan", () => {
  assert.equal(isNewSince({ created_at: iso(1) }, NOW - 5 * 36e5), true);
  assert.equal(isNewSince({ created_at: iso(9) }, NOW - 5 * 36e5), false);
  assert.equal(isNewSince({ created_at: iso(1) }, 0), false);
  assert.equal(isNewSince({}, NOW), false);
});
test("countInvites: terbuka, di kota pengguna, baru, belum lewat", () => {
  const rows = [
    { created_at: iso(2), status: "open", city: "Bandung", when_date: day(3) },
    { created_at: iso(2), status: "open", city: "bandung", when_date: null },
    { created_at: iso(2), status: "full", city: "Bandung", when_date: day(3) },
    { created_at: iso(2), status: "open", city: "Jakarta", when_date: day(3) },
    { created_at: iso(30), status: "open", city: "Bandung", when_date: day(3) },
    { created_at: iso(2), status: "open", city: "Bandung", when_date: day(-2) },
  ];
  assert.equal(countInvites(rows, NOW - 10 * 36e5, "Bandung", day(0)), 2);
  assert.equal(countInvites(rows, NOW - 10 * 36e5, "", day(0)), 0);
  assert.equal(countInvites(rows, NOW - 10 * 36e5, "semua", day(0)), 0);
  assert.equal(countInvites(rows, null, "Bandung", day(0)), 0);
});
