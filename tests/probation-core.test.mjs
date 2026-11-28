import test from "node:test";
import assert from "node:assert/strict";
globalThis.window = globalThis;
globalThis.IB_T = (k, v) => k + (v ? JSON.stringify(v) : "");
await import("../js/probation-core.js");
const P = globalThis.IB_ProbCore;
const NOW = Date.parse("2026-11-22T10:00:00Z");

test("parse: kelima kegiatan dari SQL dikenali", () => {
  const cases = [
    ["Akun baru dibatasi 2 ajakan baru per hari selama 48 jam pertama. Coba lagi besok.", "inv", 2],
    ["Akun baru dibatasi 2 kiriman forum per hari selama 48 jam pertama. Coba lagi besok.", "post", 2],
    ["Akun baru dibatasi 10 balasan forum per hari selama 48 jam pertama. Coba lagi besok.", "reply", 10],
    ["Akun baru dibatasi 2 percakapan baru per hari selama 48 jam pertama. Coba lagi besok.", "chat", 2],
    ["Akun baru dibatasi 3 pengajuan event per hari selama 48 jam pertama. Coba lagi besok.", "event", 3],
  ];
  for (const [m, kind, n] of cases) assert.deepEqual(P.parse(m), { kind, n });
});
test("parse: galat lain, kegiatan tak dikenal, dan nilai kosong menghasilkan null", () => {
  assert.equal(P.parse("duplicate key value violates unique constraint"), null);
  assert.equal(P.parse("Akun baru dibatasi 5 hal aneh per hari selama 48 jam pertama."), null);
  assert.equal(P.parse(null), null);
  assert.equal(P.parse(undefined), null);
});
test("parse: galat dengan awalan dari Postgres tetap terbaca", () => {
  assert.deepEqual(P.parse("ERROR: Akun baru dibatasi 2 ajakan baru per hari selama 48 jam pertama. Coba lagi besok."), { kind: "inv", n: 2 });
});
test("LIMITS sama dengan argumen trigger di SQL", async () => {
  const fs = await import("node:fs");
  const sql = fs.readFileSync(new URL("../supabase/patch_pengguna_baru.sql", import.meta.url), "utf8");
  const re = /on (\w+) +for each row execute function probation_limit\('\w+','(\d+)','[^']+','([^']+)'\)/g;
  let m, seen = 0;
  while ((m = re.exec(sql))) { assert.equal(P.LIMITS[P.parse("Akun baru dibatasi 1 " + m[3] + " selama 48 jam").kind], +m[2], m[1]); seen++; }
  assert.equal(seen, 5);
});
test("errText: dipetakan ke kunci teks; galat lain apa adanya", () => {
  const t = IB_ErrText({ message: "Akun baru dibatasi 2 ajakan baru per hari selama 48 jam pertama. Coba lagi besok." });
  assert.equal(t, 'pb_msg{"n":2,"what":"pb_w_inv","tip":"pb_tip_inv"}');
  assert.equal(IB_ErrText({ message: "boom" }), "boom");
  assert.equal(IB_ErrText(null), "");
  assert.equal(IB_ErrText("teks"), "teks");
});
test("isNew: dalam 48 jam benar, lewat salah, tanggal tak valid salah, masa depan jauh salah", () => {
  assert.equal(P.isNew({ created_at: new Date(NOW - 5 * 36e5).toISOString() }, NOW), true);
  assert.equal(P.isNew({ created_at: new Date(NOW - 49 * 36e5).toISOString() }, NOW), false);
  assert.equal(P.isNew({ created_at: "x" }, NOW), false);
  assert.equal(P.isNew(null, NOW), false);
  assert.equal(P.isNew({ created_at: new Date(NOW + 9e6).toISOString() }, NOW), false);
});
test("note: dinonaktifkan, selalu kosong (batas 48 jam di server sudah dicabut)", () => {
  const nu = { created_at: new Date(NOW - 36e5).toISOString() }, old = { created_at: new Date(NOW - 99 * 36e5).toISOString() };
  assert.equal(P.note("inv", nu, NOW), "");
  assert.equal(P.note("inv", old, NOW), "");
  assert.equal(P.note("tidakada", nu, NOW), "");
  assert.equal(P.note("inv", null, NOW), "");
});
