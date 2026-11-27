import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const R = (f) => fs.readFileSync(new URL("../" + f, import.meta.url), "utf8");
const lds = (h) => [...h.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1]));
const nodes = (h) => lds(h).flatMap((o) => o["@graph"] || [o]);
const types = (h) => nodes(h).map((n) => n["@type"]);

test("beranda: Organization + WebSite (SearchAction) + WebPage, dengan definisi dan kontak", () => {
  for (const l of ["id", "en"]) {
    const n = nodes(R(`${l}/index.html`));
    const org = n.find((x) => x["@type"] === "Organization");
    assert.equal(org["@id"], "https://gowithdme.com/#organization");
    assert.match(org.description, /GoWithDME/);
    assert.match(org.description, /(bukan penjual tiket|not a ticket seller)/i);
    assert.ok(org.sameAs.length >= 1 && org.contactPoint[0].email);
    const web = n.find((x) => x["@type"] === "WebSite");
    assert.match(web.potentialAction.target.urlTemplate, /\{search_term_string\}/);
  }
});
test("Tentang dan Hak Cipta memuat definisi organisasi sendiri (tanpa rujukan menggantung)", () => {
  for (const f of ["about", "copyright"]) for (const l of ["id", "en"]) assert.ok(types(R(`${l}/${f}.html`)).includes("Organization"), `${l}/${f}`);
  assert.ok(types(R("id/about.html")).includes("AboutPage"));
});
test("Bantuan: FAQPage berisi semua pertanyaan FAQ", () => {
  const faq = nodes(R("id/bantuan.html")).find((x) => x["@type"] === "FAQPage");
  assert.equal(faq.mainEntity.length, 13);
  assert.ok(faq.mainEntity.every((q) => q.name && q.acceptedAnswer.text));
});
test("halaman publik: meta robots lengkap + OG; halaman formulir tetap noindex tanpa JSON-LD", () => {
  for (const f of ["index", "event", "gunung", "bantuan", "about", "privacy", "terms", "copyright", "komunitas", "teman"])
    for (const l of ["id", "en"]) {
      const h = R(`${l}/${f}.html`);
      assert.match(h, /max-snippet:-1/, `${l}/${f} robots`);
      assert.match(h, /property="og:title"/, `${l}/${f} og`);
      assert.equal((h.match(/<title>/g) || []).length, 1);
    }
  for (const f of ["login", "ajukan", "profil", "pesan"]) assert.ok(!/ld\+json/.test(R(`id/${f}.html`)));
});
test("event: ItemList mendatang di halaman daftar, BreadcrumbList di tiap halaman event", () => {
  assert.ok(types(R("id/event.html")).includes("ItemList"));
  const f = fs.readdirSync(new URL("../id/e/", import.meta.url))[0];
  const t = types(R("id/e/" + f));
  assert.ok(t.includes("Event") && t.includes("FAQPage") && t.includes("BreadcrumbList"));
});
test("llms.txt: definisi, fakta kunci, tautan sitemap; kunci IndexNow cocok dengan nama berkasnya", () => {
  const t = R("llms.txt");
  assert.match(t, /^# GoWithDME/);
  assert.match(t, /does NOT sell tickets/);
  assert.match(t, /sitemap\.xml/);
  const k = fs.readdirSync(new URL("../", import.meta.url)).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
  assert.ok(k && R(k).trim() === k.slice(0, -4));
});
