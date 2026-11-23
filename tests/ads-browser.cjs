/* Uji browser lencana iklan di situs utama (Playwright). Supabase dipalsukan: tidak butuh internet atau akun.
   Jalankan: node tests/ads-browser.cjs   (PW=/jalur/ke/playwright bila lokasinya beda; SHOTS=1 untuk simpan tangkapan layar ke tests/shots/) */
const { chromium } = require(process.env.PW || "/opt/npm-tools/node_modules/playwright");
const { spawn } = require("child_process"), path = require("path"), fs = require("fs");
const root = path.join(__dirname, ".."), PORT = 8700 + Math.floor(Math.random() * 200);
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const day = (n) => { const d = new Date(today + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const UUID = (n) => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
const AD = (n, o) => Object.assign({ id: UUID(n), slot: "home_rail", title: "Iklan " + n, body: "Teks " + n, label: "ad", url: "https://mitra.example/" + n, tone: "brand", city: null, weight: 5, starts_on: null, ends_on: null }, o);
const stub = `window.supabase={createClient:function(){var e={data:null,error:{message:"stub"}};
 var o=new Proxy({},{get:function(t,k){if(k==="then")return function(f,g){return Promise.resolve(e).then(f,g)};return function(){return o}}});
 function R(d){return Promise.resolve({data:d,error:null})}
 return{auth:{getSession:function(){return R({session:null})},getUser:function(){return R({user:null})},onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}}},signOut:function(){return R(null)}},
  from:function(){return o},rpc:function(){return Promise.resolve(e)},channel:function(){return{on:function(){return this},subscribe:function(){return this}}},removeChannel:function(){},storage:{from:function(){return o}}}}};`;
let fail = 0;
const ok = (c, m) => { console.log((c ? "ok   " : "GAGAL ") + m); if (!c) fail = 1; };

(async () => {
  const srv = spawn("python3", [path.join(root, "tools/serve.py"), String(PORT)], { stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 900));
  const base = "http://localhost:" + PORT, b = await chromium.launch();
  if (process.env.SHOTS) fs.mkdirSync(path.join(__dirname, "shots"), { recursive: true });
  const shot = async (pg, name) => { if (process.env.SHOTS) await pg.screenshot({ path: path.join(__dirname, "shots", name + ".png") }); };

  async function open(url, o) {
    o = o || {};
    const ctx = await b.newContext({ viewport: o.vp || { width: 1280, height: 900 }, locale: o.lang || "id-ID", colorScheme: o.dark ? "dark" : "light" });
    const pg = await ctx.newPage(), errs = [], reqs = { ads: 0, click: [] };
    pg.on("pageerror", (e) => errs.push(e.message));
    if (o.dnt) await pg.addInitScript(() => Object.defineProperty(navigator, "doNotTrack", { get: () => "1" }));
    if (o.loc) await pg.addInitScript((l) => localStorage.setItem("gwm_loc", l), JSON.stringify({ city: o.loc, prov: "", macro: "", radiusKm: 0 }));
    await pg.route("**/*", (r) => {
      const u = r.request().url();
      if (/supabase(\.min)?\.js|supabase-js/.test(u)) return r.fulfill({ contentType: "text/javascript", body: stub });
      if (/\/rest\/v1\/ads_live/.test(u)) {
        reqs.ads++;
        if (o.adsStatus) return r.fulfill({ status: o.adsStatus, body: "{}" });
        return r.fulfill({ contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(o.ads || []) });
      }
      if (/\/rest\/v1\/rpc\/ad_click/.test(u)) {
        reqs.click.push(JSON.parse(r.request().postData() || "{}").p_id);
        return r.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" }, body: "" });
      }
      if (u.startsWith(base)) return r.continue();
      if (/\/rest\/v1\/events/.test(u)) return r.fulfill({ status: 503, headers: { "access-control-allow-origin": "*" }, body: "{}" }); // paksa cadangan data/events.json
      if (/\.supabase\.co/.test(u)) return r.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: "[]" });
      return r.fulfill({ status: 200, body: "" });
    });
    await pg.goto(base + url, { waitUntil: "load" });
    await pg.waitForFunction(() => { const e = document.querySelector("[data-ad-slot]"); return !e || e.hasAttribute("data-ad-state"); }, null, { timeout: 6000 }).catch(() => {});
    await pg.waitForTimeout(o.wait || 600);
    return { pg, ctx, errs, reqs };
  }
  const state = (pg, slot) => pg.evaluate((s) => { const e = document.querySelector('[data-ad-slot="' + s + '"]'); return e ? { hidden: e.hidden, vis: e.offsetParent !== null, st: e.getAttribute("data-ad-state"), txt: e.textContent.trim() } : null; }, slot);

  // 1) Beranda: tiga tempat, satu iklan per tempat
  let t = await open("/id/", { ads: [AD(1, { slot: "home_rail", title: "Festival Kopi Bandung" }), AD(2, { slot: "home_top", title: "Tiket Kereta Diskon", tone: "accent", label: "promo" }), AD(3, { slot: "event_list" })] });
  let s = await state(t.pg, "home_rail");
  ok(s && !s.hidden && s.vis && s.st === "ad" && s.txt.includes("Festival Kopi Bandung") && s.txt.includes("Iklan"), "Beranda: kartu kolom kanan menampilkan iklan berlabel Iklan");
  s = await state(t.pg, "home_top");
  ok(s && !s.hidden && s.vis && s.txt.includes("Tiket Kereta Diskon") && s.txt.includes("Promo"), "Beranda: baris atas daftar menampilkan iklan berlabel Promo");
  ok(await t.pg.evaluate(() => !document.querySelector('[data-ad-slot="event_list"]')), "Beranda: tempat event_list memang tidak ada di Beranda");
  ok(t.reqs.ads === 1, "satu permintaan ads_live untuk seluruh halaman (hemat egress), dapat " + t.reqs.ads);
  const a = await t.pg.$('[data-ad-slot="home_rail"] a.ad-b');
  ok(a && (await a.getAttribute("rel")) === "sponsored noopener noreferrer" && (await a.getAttribute("target")) === "_blank" && (await a.getAttribute("href")).startsWith("https://"), "tautan iklan: https, target baru, rel sponsored");
  const railTop = await t.pg.evaluate(() => document.querySelector("#nvSponsorCard").getBoundingClientRect().top);
  ok(railTop > 0, "kartu kolom kanan ada di dalam halaman (top=" + Math.round(railTop) + ")");
  await shot(t.pg, "beranda-desktop");
  ok(t.errs.length === 0, "Beranda: tanpa galat JS " + t.errs.join("|"));

  // klik: dihitung sekali per sesi
  await t.pg.route("https://mitra.example/**", (r) => r.fulfill({ status: 200, body: "ok" }));
  const [pop] = await Promise.all([t.ctx.waitForEvent("page"), t.pg.click('[data-ad-slot="home_rail"] a.ad-b')]);
  await pop.close(); await t.pg.waitForTimeout(300);
  const [pop2] = await Promise.all([t.ctx.waitForEvent("page"), t.pg.click('[data-ad-slot="home_rail"] a.ad-b')]);
  await pop2.close(); await t.pg.waitForTimeout(300);
  ok(t.reqs.click.length === 1 && t.reqs.click[0] === UUID(1), "klik dihitung sekali per iklan per sesi: " + JSON.stringify(t.reqs.click));
  await t.ctx.close();

  // 2) Do Not Track: klik tidak dihitung
  t = await open("/id/", { ads: [AD(1)], dnt: true });
  const [p3] = await Promise.all([t.ctx.waitForEvent("page"), t.pg.click('[data-ad-slot="home_rail"] a.ad-b')]);
  await p3.close(); await t.pg.waitForTimeout(300);
  ok(t.reqs.click.length === 0, "Do Not Track: klik tidak dihitung");
  await t.ctx.close();

  // 3) Tanpa iklan: Beranda menampilkan ajakan Pasang Iklan, tempat lain tersembunyi
  t = await open("/id/", { ads: [] });
  s = await state(t.pg, "home_rail");
  ok(s && !s.hidden && s.st === "house" && s.txt.includes("Pasang iklan"), "tanpa iklan: kartu kanan jadi ajakan Pasang iklan");
  s = await state(t.pg, "home_top");
  ok(s && s.hidden && s.st === "none", "tanpa iklan: baris atas disembunyikan (tidak menyisakan ruang kosong)");
  const go = await t.pg.$('#nvSponsorCard a[data-ptab="promo"]');
  if (go) { await go.click(); await t.pg.waitForTimeout(400); }
  ok(await t.pg.evaluate(() => { const e = document.getElementById("panePromo"); return !!e && !e.hidden; }), "ajakan membuka tab Pasang Iklan");
  await t.ctx.close();

  // 4) Gagal memuat (tabel belum ada / 404): situs tetap normal, tidak ada galat
  t = await open("/id/", { adsStatus: 404 });
  s = await state(t.pg, "home_rail");
  ok(s && s.st === "house", "ads_live gagal: situs tetap jalan dengan kartu ajakan");
  ok(t.errs.length === 0, "ads_live gagal: tanpa galat JS " + t.errs.join("|"));
  await t.ctx.close();

  // 5) Jadwal dan penargetan kota
  t = await open("/id/", { ads: [AD(1, { title: "Sudah lewat", ends_on: day(-1) }), AD(2, { title: "Belum mulai", starts_on: day(1) }), AD(3, { title: "Hanya Surabaya", city: "Surabaya" })], loc: "Bandung" });
  s = await state(t.pg, "home_rail");
  ok(s.st === "house", "iklan kedaluwarsa / belum mulai / kota lain tidak tampil (kota pengunjung Bandung)");
  await t.ctx.close();
  t = await open("/id/", { ads: [AD(3, { title: "Hanya Surabaya", city: "Surabaya" })], loc: "Surabaya" });
  s = await state(t.pg, "home_rail");
  ok(s.st === "ad" && s.txt.includes("Hanya Surabaya"), "iklan kota tampil untuk pengunjung di kota itu");
  await t.ctx.close();

  // 6) Inggris
  t = await open("/en/", { ads: [AD(1, { label: "sponsor", title: "Coffee Fest" })], lang: "en-US" });
  s = await state(t.pg, "home_rail");
  ok(s.st === "ad" && s.txt.includes("Sponsored"), "versi Inggris: label Sponsored");
  await t.ctx.close();
  t = await open("/en/", { ads: [] });
  s = await state(t.pg, "home_rail");
  ok(s.st === "house" && /Advertise/i.test(s.txt), "versi Inggris: ajakan Advertise & Sponsor " + JSON.stringify(s));
  await t.ctx.close();

  // 7) Halaman Event dan Gunung
  for (const pgName of ["event", "gunung"]) {
    t = await open("/id/" + pgName, { ads: [AD(5, { slot: "event_list", title: "Sponsor Daftar " + pgName })] });
    s = await state(t.pg, "event_list");
    ok(s && !s.hidden && s.vis && s.txt.includes("Sponsor Daftar " + pgName), "/" + pgName + ": baris iklan di atas daftar");
    const order = await t.pg.evaluate(() => { const a = document.querySelector('[data-ad-slot="event_list"]'), l = document.getElementById("list"); return !!(a.compareDocumentPosition(l) & Node.DOCUMENT_POSITION_FOLLOWING); });
    ok(order, "/" + pgName + ": iklan berada sebelum daftar");
    ok(t.errs.length === 0, "/" + pgName + ": tanpa galat JS " + t.errs.join("|"));
    if (pgName === "event") await shot(t.pg, "event-desktop");
    await t.ctx.close();
  }

  // 8) Detail event: ikut kota event
  t = await open("/id/event", { ads: [AD(6, { slot: "event_detail", title: "Hotel Dekat Venue", city: "Bandung" }), AD(7, { slot: "event_detail", title: "Promo Kota Lain", city: "Medan" })], wait: 1500 });
  const tiles = await t.pg.$$(".tile");
  ok(tiles.length > 0, "daftar event termuat dari data cadangan (" + tiles.length + " event)");
  const evs = JSON.parse(fs.readFileSync(path.join(root, "data/events.json"), "utf8")).filter((e) => e.event_date >= today);
  const evBdg = evs.find((e) => e.city === "Bandung"), evJkt = evs.find((e) => e.city === "Jakarta");
  const openDetail = async (e) => {
    await t.pg.evaluate((id) => window.IB_OpenEv(id), e.id); await t.pg.waitForTimeout(700);
    return t.pg.evaluate(() => { const d = document.querySelector('#dBody [data-ad-slot="event_detail"]'); return d ? { hidden: d.hidden, st: d.getAttribute("data-ad-state"), t: d.textContent, after: d.previousElementSibling && d.previousElementSibling.className } : null; });
  };
  let dctx = await openDetail(evBdg);
  ok(dctx && !dctx.hidden && dctx.st === "ad", "detail event Bandung: kartu iklan tampil di jendela detail");
  ok(dctx && dctx.t.includes("Hotel Dekat Venue") && !dctx.t.includes("Kota Lain"), "detail event Bandung: hanya iklan untuk Bandung");
  ok(dctx && dctx.after === "row", "detail event: kartu berada tepat di bawah deretan tombol aksi");
  await shot(t.pg, "detail-desktop");
  await t.pg.evaluate(() => document.getElementById("dlg").close());
  dctx = await openDetail(evJkt);
  ok(dctx && dctx.hidden && dctx.st === "none", "detail event Jakarta: tidak ada iklan untuk kota itu -> tempat disembunyikan");
  ok(t.errs.length === 0, "detail event: tanpa galat JS " + t.errs.join("|"));
  await t.ctx.close();

  // 9) Blog
  const blogFile = fs.readdirSync(path.join(root, "blog/berita")).filter((f) => f.endsWith(".html") && f !== "index.html")[0];
  t = await open("/blog/berita/" + blogFile.replace(/\.html$/, ""), { ads: [AD(8, { slot: "blog_post", title: "Baca Juga di Mitra" })] });
  s = await state(t.pg, "blog_post");
  ok(s && !s.hidden && s.vis && s.txt.includes("Baca Juga di Mitra"), "artikel blog: baris iklan sebelum komentar");
  ok(await t.pg.evaluate(() => { const a = document.querySelector('[data-ad-slot="blog_post"]'), c = document.getElementById("komentar"); return !!(a.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING); }), "artikel blog: iklan tepat sebelum #komentar");
  await shot(t.pg, "blog-desktop");
  ok(t.errs.length === 0, "blog: tanpa galat JS " + t.errs.join("|"));
  await t.ctx.close();

  // 10) HP 360px dan mode gelap: tidak ada luapan horizontal
  for (const dark of [false, true]) {
    t = await open("/id/", { ads: [AD(1, { title: "Judul iklan yang cukup panjang untuk menguji pemotongan baris di layar kecil sekali", body: "Teks pendukung yang juga lumayan panjang supaya terlihat apakah rapi pada layar sempit sekali", tone: "sky" }), AD(2, { slot: "home_top", title: "Strip iklan panjang sekali untuk uji layar HP kecil", label: "partner", tone: "ink" })], vp: { width: 360, height: 780 }, dark });
    const ov = await t.pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    ok(ov.sw <= ov.cw + 1, "HP 360px" + (dark ? " gelap" : "") + ": tanpa luapan horizontal (" + ov.sw + "/" + ov.cw + ")");
    await shot(t.pg, "beranda-hp" + (dark ? "-gelap" : ""));
    await t.ctx.close();
  }

  await b.close(); srv.kill();
  console.log(fail ? "ADA YANG GAGAL" : "SEMUA LOLOS");
  process.exit(fail);
})().catch((e) => { console.error(e); process.exit(1); });
