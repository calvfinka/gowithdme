import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = globalThis;
await import("../js/signup-core.js");
const SC = globalThis.IB_SignupCore;

test("validate: setiap kolom kosong punya kunci galat sendiri dan urutan fokus mengikuti formulir", () => {
  const r = SC.validate({ nick: "", email: "", pass: "", consent: false });
  assert.deepEqual(r.errors, { nick: "su_e_nick_need", email: "su_e_email_need", pass: "su_e_pass_need", consent: "su_e_consent" });
  assert.equal(r.first, "nick");
  assert.equal(r.ok, false);
});

test("validate: format email, panjang password, dan nama panggilan", () => {
  assert.equal(SC.validate({ nick: "B", email: "a@b.co", pass: "12345678", consent: true }).errors.nick, "su_e_nick_short");
  for (const bad of ["budi", "budi@", "budi@x", "bu di@x.com", "@x.com"]) assert.equal(SC.validate({ nick: "Budi", email: bad, pass: "12345678", consent: true }).errors.email, "su_e_email_bad", bad);
  assert.equal(SC.validate({ nick: "Budi", email: "budi@x.com", pass: "1234567", consent: true }).errors.pass, "su_e_pass_short");
  assert.equal(SC.validate({ nick: " Budi ", email: " budi@x.com ", pass: "kopi-susu-9", consent: true }).ok, true);
});

test("mapError: galat Supabase -> kolom dan kunci teks", () => {
  const m = SC.mapError;
  assert.deepEqual(m({ code: "user_already_exists", message: "User already registered" }), { field: "email", key: "a_exists" });
  assert.deepEqual(m({ message: "User already registered" }), { field: "email", key: "a_exists" });
  assert.deepEqual(m({ code: "email_address_invalid", message: 'Email address "a@b" is invalid' }), { field: "email", key: "su_e_email_bad" });
  assert.deepEqual(m({ code: "weak_password", message: "Password should be at least 8 characters" }), { field: "pass", key: "su_e_pass_short" });
  assert.deepEqual(m({ code: "weak_password", message: "Password is known to be weak and easy to guess" }), { field: "pass", key: "su_e_pass_weak" });
  assert.deepEqual(m({ code: "over_email_send_rate_limit", status: 429, message: "email rate limit exceeded" }), { field: "", key: "su_e_mail_rate" });
  assert.deepEqual(m({ status: 429, message: "For security purposes, you can only request this after 40 seconds" }), { field: "", key: "su_e_rate" });
  assert.deepEqual(m({ code: "signup_disabled", message: "Signups not allowed for this instance" }), { field: "", key: "su_e_off" });
  assert.deepEqual(m({ message: "Error sending confirmation email", status: 500 }), { field: "", key: "su_e_mail_fail" });
  assert.deepEqual(m({ message: "Database error saving new user" }), { field: "", key: "su_e_db" });
  assert.deepEqual(m({ message: "Failed to fetch" }), { field: "", key: "err_network" });
  assert.deepEqual(m({ message: "sesuatu yang aneh" }), { field: "", key: "su_e_generic" });
  assert.deepEqual(m(null), { field: "", key: "su_e_generic" });
});

test("parseArrival: tautan konfirmasi sukses, galat, dan halaman biasa", () => {
  const ok = SC.parseArrival("#access_token=a&refresh_token=b&expires_in=3600&token_type=bearer&type=signup", "");
  assert.equal(ok.confirmed, true); assert.equal(ok.error, false);
  assert.equal(SC.parseArrival("", "?code=abc&type=signup").confirmed, true);
  assert.equal(SC.parseArrival("#access_token=a&type=magiclink", "").confirmed, false);
  assert.equal(SC.parseArrival("", "?next=profil").confirmed, false);
  const ex = SC.parseArrival("#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired", "");
  assert.equal(ex.error, true); assert.equal(ex.confirmed, false); assert.equal(ex.errorCode, "otp_expired");
  assert.equal(SC.arrivalErrorKey(ex), "su_l_expired");
  assert.equal(SC.arrivalErrorKey(SC.parseArrival("#error=access_denied&error_description=Invalid+token", "")), "su_l_used");
  assert.equal(SC.arrivalErrorKey(SC.parseArrival("?error=server_error", "")), "su_l_bad");
});

test("nickIssue: menolak nama yang menyerupai pengelola, termasuk leetspeak dan spasi", () => {
  for (const bad of ["admin", "Admin GWM", "4dm1n", "@dmin", "G W M", "gwm_fan", "GoWithDme", "Sistem", "moderator_x", "Jurkon Studio"]) {
    assert.equal(SC.nickIssue(bad), "su_e_nick_reserved", bad);
  }
});

test("nickIssue: menolak email, nomor HP, dan tautan sebagai nama publik", () => {
  for (const bad of ["budi@gmail.com", "081234567890", "+62 812-3456-7890", "www.toko.com", "https://x.id/a", "budi.com"]) {
    assert.equal(SC.nickIssue(bad), "su_e_nick_private", bad);
  }
});

test("nickIssue: nama wajar tetap lolos (tanpa salah tolak)", () => {
  for (const ok of ["Budi", "Rina Ayu", "Andi1999", "Siti Administrasi", "modern", "Kamu", "Dimas_Bdg", "Nonton Bareng"]) {
    assert.equal(SC.nickIssue(ok), "", ok);
  }
});

test("validate: nama terlarang menghasilkan galat di kolom nick dan memfokuskan kolom itu", () => {
  const r = SC.validate({ nick: "Admin GWM", email: "a@b.co", pass: "12345678", consent: true });
  assert.equal(r.ok, false);
  assert.equal(r.errors.nick, "su_e_nick_reserved");
  assert.equal(r.first, "nick");
  assert.equal(SC.validate({ nick: "b@b.com", email: "a@b.co", pass: "12345678", consent: true }).errors.nick, "su_e_nick_private");
});

test("nickIssue: angka 8 dan huruf biasa tidak merusak normalisasi", () => {
  assert.equal(SC.nickIssue("Budi8"), "");
  assert.equal(SC.nickIssue("Ad8min"), "su_e_nick_reserved"); // angka disisipkan di tengah tidak menipu penyaring
  assert.equal(SC.nickIssue("8admin"), "su_e_nick_reserved");
});

test("suggestEmail: salah ketik domain umum disarankan, domain sah tidak diganggu", () => {
  const s = SC.suggestEmail;
  assert.equal(s("budi@gmial.com"), "budi@gmail.com");
  assert.equal(s("budi@gmail.con"), "budi@gmail.com");
  assert.equal(s("Budi@gmail.co"), "Budi@gmail.com");
  assert.equal(s("budi@gmaill.com"), "budi@gmail.com");
  assert.equal(s("budi@hotmal.com"), "budi@hotmail.com");
  assert.equal(s("budi@yahoo.id"), "budi@yahoo.co.id");
  for (const ok of ["budi@gmail.com", "budi@yahoo.co.id", "budi@mail.com", "budi@ymail.com", "budi@kampus.ac.id", "budi@perusahaan.co.id", "budi@gmx.com", "budi", "@gmail.com", ""]) assert.equal(s(ok), "", ok);
});

test("isTempMail / validate: email sekali pakai ditolak, termasuk subdomain", () => {
  assert.equal(SC.isTempMail("a@mailinator.com"), true);
  assert.equal(SC.isTempMail("a@x.mailinator.com"), true);
  assert.equal(SC.isTempMail("a@notmailinator.com"), false);
  assert.equal(SC.isTempMail("a@gmail.com"), false);
  assert.equal(SC.validate({ nick: "Budi", email: "a@yopmail.com", pass: "kopi-susu-9", consent: true }).errors.email, "su_e_email_temp");
});

test("passIssue: umum, urutan, ulangan, dan memuat nama/email sendiri", () => {
  const p = SC.passIssue;
  for (const w of ["password", "12345678", "aaaaaaaa", "abcdefgh", "87654321", "abcabcabc", "GoWithDMe123", "Indonesia123"]) assert.equal(p(w), "su_e_pass_weak", w);
});

test("passIssue: kunci personal dan lolos", () => {
  const p = SC.passIssue;
  assert.equal(p("kalfin-2026", { nick: "Kalfin" }), "su_e_pass_personal");
  assert.equal(p("xxbudisantoso1", { email: "budisantoso@gmail.com" }), "su_e_pass_personal");
  assert.equal(p("kopi-susu-9", { nick: "Budi", email: "budi@x.com" }), "");
  assert.equal(p("Sg7!rainbow"), "");
  assert.equal(SC.validate({ nick: "Kalfin", email: "k@x.com", pass: "kalfin-2026", consent: true }).errors.pass, "su_e_pass_personal");
  assert.equal(SC.validate({ nick: "Budi", email: "b@x.com", pass: "12345678", consent: true }).errors.pass, "su_e_pass_weak");
});

test("nickDrift: nama diganti server terdeteksi, rapikan spasi/huruf besar tidak dianggap beda", () => {
  assert.equal(SC.nickDrift("Budi", "Budi4821"), true);
  assert.equal(SC.nickDrift("admin", "Pengguna"), true);
  assert.equal(SC.nickDrift("  Budi   Santoso ", "budi santoso"), false);
  assert.equal(SC.nickDrift("", "Budi"), false);
  assert.equal(SC.nickDrift("Budi", null), false);
  assert.equal(SC.nickDrift("x".repeat(40), "x".repeat(30)), false);
});

test("parseArrival: tautan reset password dikenali sebagai recovery, bukan konfirmasi", () => {
  const r = SC.parseArrival("#access_token=a&refresh_token=b&expires_in=3600&token_type=bearer&type=recovery", "");
  assert.equal(r.recovery, true);
  assert.equal(r.confirmed, false);
  assert.equal(SC.parseArrival("", "?code=abc&type=recovery").recovery, true);
  assert.equal(SC.parseArrival("#error=access_denied&error_code=otp_expired&type=recovery", "").recovery, false);
  assert.equal(SC.parseArrival("#access_token=a&type=signup", "").recovery, false);
});
