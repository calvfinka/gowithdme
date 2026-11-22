import test from "node:test";
import assert from "node:assert/strict";
await import("../js/blogtab-core.js");
const B = globalThis.IB_BlogTab;
const P = (category, d, slug) => ({ category, published_at: d, slug: slug || category + d });

test("hanya tiga topik yang lolos", () => {
  const r = B.keep([P("berita","2026-11-18"), P("teknologi","2026-11-18"), P("tips-gunung","2026-11-17"), P("panduan-konser","2026-11-16"), P("komunitas","2026-11-10"), P("opini","2026-11-01")]);
  assert.deepEqual(r.map(p => p.category), ["tips-gunung","panduan-konser","komunitas"]);
});
test("urut terbaru dulu, tanggal sama tetap urutan asal", () => {
  const r = B.keep([P("komunitas","2026-01-01","a"), P("tips-gunung","2026-05-01","b"), P("panduan-konser","2026-05-01","c")]);
  assert.deepEqual(r.map(p => p.slug), ["b","c","a"]);
});
test("topics hanya yang punya tulisan, urutan tetap", () => {
  const l = B.keep([P("komunitas","2026-01-01"), P("panduan-konser","2026-01-02")]);
  assert.deepEqual(B.topics(l), ["panduan-konser","komunitas"]);
});
test("masukan buruk tidak melempar", () => {
  assert.deepEqual(B.keep(null), []);
  assert.deepEqual(B.keep([null, {}, P("berita","2026-01-01")]), []);
  assert.deepEqual(B.topics([]), []);
});
