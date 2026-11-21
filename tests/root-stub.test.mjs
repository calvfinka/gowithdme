import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const R = (f) => fs.readFileSync(new URL("../" + f, import.meta.url), "utf8");
const meta = (h, k) => (h.match(new RegExp(`<meta (?:property|name)="${k}" content="([^"]*)"`)) || [])[1];

test("alamat akar: pratinjau tautan lengkap tanpa JavaScript (OG + Twitter + gambar)", () => {
  const h = R("index.html");
  assert.ok(meta(h, "og:title") && meta(h, "og:description"));
  assert.match(meta(h, "og:image"), /^https:\/\/gowithdme\.com\/assets\/og-image\.png$/);
  assert.equal(meta(h, "twitter:card"), "summary_large_image");
  assert.match(h, /<title>[^<]{10,}<\/title>/);
  assert.ok(fs.existsSync(new URL("../assets/og-image.png", import.meta.url)));
});
test("pengalih halaman publik: boleh diindeks, canonical ke versi /id/, tetap mengalihkan", () => {
  for (const f of ["index", "event", "gunung", "bantuan", "about"]) {
    const h = R(f + ".html");
    assert.ok(!/noindex/.test(h), f + " tidak boleh noindex");
    assert.match(h, new RegExp(`<link rel="canonical" href="https://gowithdme\\.com/id/${f === "index" ? "" : f}">`));
    assert.match(h, /location\.replace\(/);
  }
});
test("halaman formulir tetap noindex dan tanpa canonical/OG", () => {
  for (const f of ["login", "ajukan", "profil", "pesan"]) {
    const h = R(f + ".html");
    assert.match(h, /noindex/);
    assert.ok(!/canonical|og:image/.test(h), f);
  }
});
test("tautan bahasa di pengalih mengarah ke halaman yang benar", () => {
  assert.match(R("event.html"), /href="id\/event"[^>]*>Bahasa Indonesia<\/a><a href="en\/event">English/);
});
