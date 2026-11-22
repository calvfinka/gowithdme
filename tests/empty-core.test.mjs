import test from "node:test";
import assert from "node:assert/strict";
await import("../js/empty-core.js");
const { emptyActions } = globalThis.IB_EmptyCore;

test("beranda: event terdekat lalu buat ajakan", () => {
  assert.deepEqual(emptyActions({ where: "home" }), ["events", "create"]);
});
test("daftar, mode terdekat tanpa filter: tawarkan semua kota", () => {
  assert.deepEqual(emptyActions({ where: "list", mode: "near" }), ["all", "events"]);
});
test("daftar, ada filter: reset filter dulu", () => {
  assert.deepEqual(emptyActions({ where: "list", mode: "near", filtered: true }), ["reset", "events"]);
});
test("daftar, sudah semua kota dan tanpa filter: event lalu buat ajakan", () => {
  assert.deepEqual(emptyActions({ where: "list", mode: "all" }), ["events", "create"]);
});
test("tanpa argumen tidak error dan maksimal 2 aksi", () => {
  const r = emptyActions();
  assert.ok(r.length >= 1 && r.length <= 2);
});
