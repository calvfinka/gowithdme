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
  assert.equal(SC.validate({ nick: " Budi ", email: " budi@x.com ", pass: "12345678", consent: true }).ok, true);
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
