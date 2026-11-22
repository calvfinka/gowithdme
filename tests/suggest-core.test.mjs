import test from "node:test";
import assert from "node:assert/strict";
await import("../js/suggest-core.js");
const { key, collect, rank, tokenAt, replaceToken } = globalThis.IB_SuggestCore;

const ev = [
  { venue: "Stadion Madya GBK", city: "Jakarta" }, { venue: "Stadion Madya GBK", city: "Jakarta" },
  { venue: "JIExpo Kemayoran", city: "Jakarta" }, { venue: "Stadion Si Jalak Harupat", city: "Bandung" },
  { venue: "Info menyusul", city: "Bandung" }, { venue: "stadion madya gbk ", city: "Jakarta" }, { venue: "", city: "Bali" },
];
const items = collect(ev, (e) => e.venue, null, (e) => e.city);

test("collect: unik tanpa beda huruf/spasi, urut paling sering, buang nilai kosong dan 'menyusul'", () => {
  assert.deepEqual(items.map((i) => [i.label, i.n]), [["Stadion Madya GBK", 3], ["JIExpo Kemayoran", 1], ["Stadion Si Jalak Harupat", 1]]);
});
test("rank: kosong + kota -> hanya dari kota itu", () => {
  assert.deepEqual(rank(items, "", { city: "Jakarta" }), ["Stadion Madya GBK", "JIExpo Kemayoran"]);
  assert.deepEqual(rank(items, "", { city: "Bandung" }), ["Stadion Si Jalak Harupat"]);
  assert.equal(rank(items, "").length, 3);
});
test("rank: awalan didahulukan, lalu awal kata, lalu mengandung; kota didahulukan", () => {
  const it = collect([{ v: "Gelora Bung Karno", c: "Jakarta" }, { v: "Karno Hall", c: "Bandung" }, { v: "Taman Karnolia", c: "Jakarta" }], (e) => e.v, null, (e) => e.c);
  assert.deepEqual(rank(it, "karno"), ["Karno Hall", "Gelora Bung Karno", "Taman Karnolia"]);
  assert.deepEqual(rank(it, "karno", { city: "Jakarta" }), ["Gelora Bung Karno", "Taman Karnolia", "Karno Hall"]);
});
test("rank: tanpa beda huruf besar dan aksen; sama persis tidak disarankan; batas jumlah", () => {
  assert.deepEqual(rank(items, "JIEXPO"), ["JIExpo Kemayoran"]);
  assert.deepEqual(rank(items, "jiexpo kemayoran"), []);
  assert.equal(rank(items, "s", { limit: 1 }).length, 1);
  assert.deepEqual(rank(collect([{ a: "Éclair" }], (e) => e.a), "ecl"), ["Éclair"]);
});
test("rank: exclude membuang nama yang sudah ada", () => {
  assert.deepEqual(rank(items, "stad", { exclude: ["stadion madya gbk"] }), ["Stadion Si Jalak Harupat"]);
});
test("collect: pick boleh mengembalikan daftar (line-up)", () => {
  const it = collect([{ l: ["NPD", "Raisa"] }, { l: ["Raisa"] }], (e) => e.l);
  assert.deepEqual(it.map((i) => [i.label, i.n]), [["Raisa", 2], ["NPD", 1]]);
});
test("tokenAt: bagian di sekitar kursor pada daftar koma", () => {
  const v = "NPD, Rai, Hindia";
  const t = tokenAt(v, 8, true);
  assert.equal(t.text, "Rai");
  assert.deepEqual(t.others, ["NPD", "Hindia"]);
  assert.equal(tokenAt("A,\nB", 4, true).text, "B");
  assert.equal(tokenAt("", 0, true).text, "");
  assert.equal(tokenAt("Stadion", 3, false).text, "Stadion");
});
test("replaceToken: ujung diberi ', ' dan kursor setelahnya; tengah tidak menambah koma", () => {
  let v = "NPD, Rai", t = tokenAt(v, v.length, true);
  assert.deepEqual(replaceToken(v, t, "Raisa", true), { value: "NPD, Raisa, ", caret: 12 });
  v = "NPD, Rai, Hindia"; t = tokenAt(v, 8, true);
  assert.deepEqual(replaceToken(v, t, "Raisa", true), { value: "NPD, Raisa, Hindia", caret: 10 });
  assert.deepEqual(replaceToken("Stad", tokenAt("Stad", 4, false), "Stadion GBK", false), { value: "Stadion GBK", caret: 11 });
});
test("key: normalisasi", () => { assert.equal(key("  Nadin-Amizah! "), "nadin amizah"); });
