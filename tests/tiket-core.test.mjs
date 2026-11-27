import test from "node:test";
import assert from "node:assert/strict";
globalThis.window = globalThis;
await import("../js/tiket-core.js");
const C = globalThis.IB_TiketCore;

test("parseNik: laki-laki, tanggal lahir dibaca apa adanya", () => {
  const r = C.parseNik("3204051504910003");
  assert.equal(r.valid, true);
  assert.equal(r.gender, "L");
  assert.equal(r.birth, "1991-04-15");
  assert.equal(r.province, "Jawa Barat");
});
test("parseNik: perempuan, tanggal lahir ditambah 40", () => {
  const r = C.parseNik("3273025512960001");
  assert.equal(r.gender, "P");
  assert.equal(r.birth, "1996-12-15");
});
test("parseNik: menolak panjang salah, tanggal mustahil, provinsi tak dikenal", () => {
  assert.equal(C.parseNik("12345").valid, false);
  assert.ok(C.parseNik("3204053102910003").reasons.includes("date"));
  assert.ok(C.parseNik("9904051504910003").reasons.includes("prov"));
  assert.ok(C.parseNik("3204051504910000").reasons.includes("seq"));
});
test("maskNik", () => assert.equal(C.maskNik("3204051504910003"), "3204 **** **** 0003"));

const OCR = `PROVINSI JAWA BARAT
KOTA BANDUNG
NIK : 3273O25512960OO1
Nama : SITI NURHALIZA
Tempat/Tgl Lahir : BANDUNG, 15-12-1996
Jenis Kelamin : PEREMPUAN Gol. Darah : O
Alamat : JL. CIHAMPELAS NO 12
RT/RW : 004/ 007
Kel/Desa : CIPAGANTI
Kecamatan : COBLONG
Agama : ISLAM
Status Perkawinan : BELUM KAWIN
Pekerjaan : PELAJAR/MAHASISWA
Kewarganegaraan : WNI
Berlaku Hingga : SEUMUR HIDUP`;

test("parseKtp: mengambil field dan memperbaiki salah baca O/0", () => {
  const k = C.parseKtp(OCR);
  assert.equal(k.nik, "3273025512960001");
  assert.equal(k.nikOk, true);
  assert.equal(k.nama, "SITI NURHALIZA");
  assert.equal(k.tempat, "BANDUNG");
  assert.equal(k.lahir, "1996-12-15");
  assert.equal(k.jk, "P");
  assert.equal(k.rtrw, "004/007");
  assert.equal(k.kec, "COBLONG");
  assert.match(k.alamatFull, /CIHAMPELAS.*RT\/RW 004\/007.*CIPAGANTI.*COBLONG/);
  assert.equal(k.nikMismatch, undefined);
});
test("parseKtp: tanggal lahir dilengkapi dari NIK bila OCR gagal; tanda ketidakcocokan", () => {
  const k = C.parseKtp("NIK : 3204051504910003\nNama : BUDI SANTOSO");
  assert.equal(k.lahir, "1991-04-15");
  assert.equal(k.jk, "L");
  const m = C.parseKtp("NIK : 3204051504910003\nTempat/Tgl Lahir : BOGOR, 16-04-1991");
  assert.equal(m.nikMismatch, true);
});
test("parseKtp: teks kosong tidak melempar galat", () => {
  const k = C.parseKtp("");
  assert.equal(k.found, 0);
  assert.equal(k.nikOk, false);
});

const DATA = {
  p1: { nama: "SITI NURHALIZA", nik: "3273025512960001", tempat: "BANDUNG", lahir: "1996-12-15", alamat: "JL. CIHAMPELAS NO 12", email: "siti@mail.com", wa: "0812" },
  p2: { nama: "BUDI SANTOSO", nik: "3204051504910003", email: "", wa: "" },
  ev: { title: "Hindia Konser Ujung Dunia", date: "2026-12-05", endDate: "", venue: "Istora Senayan", city: "Jakarta", organizer: "Juni Records" },
  tk: { type: "CAT 1", qty: "2", id: "TKT-998" }, place: "Bandung", date: "2026-11-27", stamp: true, attach: true
};
test("buildDoc: surat kuasa memuat data event, kedua pihak, lampiran, dan materai", () => {
  const txt = C.toText(C.buildDoc("kuasa", "id", DATA));
  assert.match(txt, /SURAT KUASA PEMINDAHTANGANAN TIKET/);
  assert.match(txt, /Hindia Konser Ujung Dunia/);
  assert.match(txt, /5 Desember 2026/);
  assert.match(txt, /Istora Senayan, Jakarta/);
  assert.match(txt, /3273025512960001/);
  assert.match(txt, /Bandung, 27 November 2026/);
  assert.match(txt, /Materai Rp10\.000/);
  assert.match(txt, /KTP\) PIHAK PERTAMA dan PIHAK KEDUA/);
  assert.match(txt, /TKT-998/);
});
test("buildDoc: bahasa Inggris dan jenis pengalihan", () => {
  const txt = C.toText(C.buildDoc("alih", "en", DATA));
  assert.match(txt, /TICKET TRANSFER STATEMENT/);
  assert.match(txt, /5 December 2026/);
});
test("buildDoc: kolom kosong jadi garis titik agar bisa diisi tangan; HTML di-escape", () => {
  const d = structuredClone(DATA); d.ev.title = "<b>X</b>"; d.p2.nama = "";
  const doc = C.buildDoc("kuasa", "id", d);
  assert.ok(C.toText(doc).includes(C.DOT));
  assert.ok(!C.toHtml(doc).includes("<b>X</b>"));
});
test("validate: kurang data, NIK sama, dan data lengkap", () => {
  assert.ok(C.validate({}).includes("event"));
  const same = structuredClone(DATA); same.p2.nik = same.p1.nik;
  assert.ok(C.validate(same).includes("same_nik"));
  assert.deepEqual(C.validate(DATA), []);
});
test("fmtRange: rentang satu bulan dan lintas bulan", () => {
  assert.equal(C.fmtRange("2026-11-01", "2026-11-30", "id"), "1–30 November 2026");
  assert.equal(C.fmtRange("2026-11-28", "2026-12-02", "en"), "28 November 2026 – 2 December 2026");
});
test("upcoming + searchEvents + fileName", () => {
  const list = [{ title: "Lama", event_date: "2026-01-01" }, { title: "Baru Bandung", event_date: "2026-12-01", city: "Bandung" }, { title: "Berjalan", event_date: "2026-11-01", end_date: "2026-11-30" }];
  const up = C.upcoming(list, "2026-11-27");
  assert.deepEqual(up.map(e => e.title), ["Berjalan", "Baru Bandung"]);
  assert.equal(C.searchEvents(up, "bandung").length, 1);
  assert.equal(C.fileName("kuasa", { title: "Hindia: Konser Ujung Dunia!" }, "pdf"), "surat-kuasa-tiket-hindia-konser-ujung-dunia.pdf");
});
