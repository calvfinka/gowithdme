import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
await import("../js/safety-core.js");
const { KEY, VERSION, TIPS, needed } = globalThis.IB_SafetyCore;

test("needed: tampil bila belum ada penanda atau nilainya asing", () => {
  assert.equal(needed(null), true);
  assert.equal(needed(""), true);
  assert.equal(needed("0"), true);
  assert.equal(needed("2"), true);
});
test("needed: tidak tampil lagi setelah ditandai versi ini", () => {
  assert.equal(needed(VERSION), false);
});
test("kunci tidak bentrok dengan kunci lain", () => {
  assert.equal(KEY, "gwm_safe_seen");
  assert.notEqual(KEY, "gwm_last_visit");
});
test("setiap tips punya teks ID dan EN di strings.py", () => {
  const src = readFileSync(new URL("../tools/strings.py", import.meta.url), "utf8");
  const all = ["sf_h", "sf_ok", ...TIPS];
  for (const k of all) assert.match(src, new RegExp('"' + k + '": \\("[^"]+", "[^"]+"\\)'), k);
});
test("jumlah tips tetap singkat (maks. 4)", () => {
  assert.ok(TIPS.length >= 1 && TIPS.length <= 4);
});
