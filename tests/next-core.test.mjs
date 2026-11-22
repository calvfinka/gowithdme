import test from "node:test";
import assert from "node:assert/strict";
await import("../js/next-core.js");
const { SAFE, build, loginUrl, loginHere } = globalThis.IB_NextCore;

test("build: halaman dan query dipertahankan", () => {
  assert.equal(build("/id/teman", ""), "teman");
  assert.equal(build("/gowithdme/id/teman", "?kat=konser&kota=Bandung"), "teman?kat=konser&kota=Bandung");
  assert.equal(build("/id/teman.html", "?x=1"), "teman?x=1");
  assert.equal(build("teman/", ""), "teman");
});
test("build: query tidak aman dibuang, halaman tetap", () => {
  assert.equal(build("/id/komunitas", "?kota=Jakarta+Selatan"), "komunitas");
  assert.equal(build("/id/komunitas", "?a=b,c"), "komunitas");
  assert.equal(build("/id/komunitas", "?x=" + "a".repeat(300)), "komunitas");
});
test("build: tanpa halaman / login / aneh -> kosong", () => {
  assert.equal(build("/id/", ""), "");
  assert.equal(build("/", ""), "");
  assert.equal(build("/id/login", "?next=teman"), "");
  assert.equal(build("/id/a b", ""), "");
  assert.equal(build(null, null), "");
});
test("hasil build selalu lolos aturan safeNext", () => {
  for (const [p, s] of [["/id/teman", "?kat=konser"], ["/id/komunitas", "?kota=Bandung&p=12"], ["/id/event", "?e=nui-high-school-fest-2026"]])
    assert.ok(SAFE.test(build(p, s)));
});
test("loginUrl: next di-encode; tanpa halaman -> login polos", () => {
  assert.equal(loginUrl("/id/teman", "?kat=konser"), "login?next=teman%3Fkat%3Dkonser");
  assert.equal(loginUrl("/id/", ""), "login");
  assert.equal(decodeURIComponent(loginUrl("/id/komunitas", "?kota=Bandung").split("next=")[1]), "komunitas?kota=Bandung");
});
test("loginHere memakai location yang diberikan", () => {
  assert.equal(loginHere({ pathname: "/id/teman", search: "?kat=hiking" }), "login?next=teman%3Fkat%3Dhiking");
});
