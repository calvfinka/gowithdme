import test from "node:test";
import assert from "node:assert/strict";
await import("../js/lineup-core.js");
const { clean } = globalThis.IB_Lineup;

test("literal array Postgres menjadi daftar biasa (kasus NUi High School Fest)", () => {
  const raw = '{NPD,Perunggu,"Nadin Amizah","Reality Club",Raisa,"The Adams",Bernadya,Idgitaf,Tenxi,Kahitna,"Sal Priadi",Hindia,.Feast,Hivi,Marbles}';
  assert.equal(clean(raw), "NPD, Perunggu, Nadin Amizah, Reality Club, Raisa, The Adams, Bernadya, Idgitaf, Tenxi, Kahitna, Sal Priadi, Hindia, .Feast, Hivi, Marbles");
});
test("teks biasa tidak diubah", () => {
  assert.equal(clean("Idgitaf, Nadin Amizah"), "Idgitaf, Nadin Amizah");
  assert.equal(clean("Line-up menyusul"), "Line-up menyusul");
  assert.equal(clean("Band {live} Special"), "Band {live} Special");
});
test("koma dalam tanda kutip tetap satu nama, escape dibaca", () => {
  assert.equal(clean('{"Tom, Dick & Harry","Say \\"Hi\\"",Solo}'), 'Tom, Dick & Harry, Say "Hi", Solo');
});
test("kosong, NULL, dan spasi berlebih", () => {
  assert.equal(clean("{}"), "");
  assert.equal(clean("{A,NULL,  B  C ,}"), "A, B C");
  assert.equal(clean(null), null);
  assert.equal(clean(undefined), undefined);
  assert.equal(clean("  {A,B}  "), "A, B");
});
