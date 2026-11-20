/* Fungsi murni untuk alur daftar akun GWM: validasi kolom, pemetaan galat server -> kunci teks, dan pembacaan tautan konfirmasi email.
   Bisa dijalankan di browser maupun Node (lihat tests/signup-core.test.mjs). */
(function(root, factory){
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.IB_SignupCore = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function(){
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* Hasil: { ok, errors: { nick|email|pass|consent: kunciTeks }, first: kolom pertama yang salah }.
     Urutan kolom mengikuti urutan tampilan formulir supaya fokus pindah ke kolom paling atas yang salah. */
  function validate(v){
    v = v || {};
    var errors = {}, nick = String(v.nick == null ? "" : v.nick).trim(), email = String(v.email == null ? "" : v.email).trim(), pass = String(v.pass == null ? "" : v.pass);
    if (!nick) errors.nick = "su_e_nick_need";
    else if (nick.length < 2) errors.nick = "su_e_nick_short";
    if (!email) errors.email = "su_e_email_need";
    else if (!EMAIL_RE.test(email)) errors.email = "su_e_email_bad";
    if (!pass) errors.pass = "su_e_pass_need";
    else if (pass.length < 8) errors.pass = "su_e_pass_short";
    if (!v.consent) errors.consent = "su_e_consent";
    var order = ["nick", "email", "pass", "consent"], first = null;
    for (var i = 0; i < order.length; i++) if (errors[order[i]]) { first = order[i]; break; }
    return { ok: !first, errors: errors, first: first };
  }

  /* Galat dari Supabase -> { field: kolom terkait atau "" bila umum, key: kunci teks }.
     Dicocokkan lewat code (Supabase baru) lalu pesan (versi lama), huruf kecil. */
  function mapError(err){
    if (!err) return { field: "", key: "su_e_generic" };
    var raw = String(err.message || err.error_description || err.msg || err || "").toLowerCase();
    var code = String(err.code || err.error_code || "").toLowerCase();
    var status = err.status || 0;
    if (/failed to fetch|networkerror|network request failed|load failed|offline/.test(raw) || code === "fetch_failed") return { field: "", key: "err_network" };
    if (code === "user_already_exists" || code === "email_exists" || /already registered|already been registered|already exists/.test(raw)) return { field: "email", key: "a_exists" };
    if (code === "email_address_invalid" || /email address.*invalid|invalid.*email|unable to validate email/.test(raw)) return { field: "email", key: "su_e_email_bad" };
    if (code === "weak_password" || /password should|weak password|password is too|known to be weak|easy to guess|pwned/.test(raw)) {
      return { field: "pass", key: /at least|characters|short/.test(raw) ? "su_e_pass_short" : "su_e_pass_weak" };
    }
    if (code === "over_email_send_rate_limit" || /email rate limit/.test(raw)) return { field: "", key: "su_e_mail_rate" };
    if (code === "over_request_rate_limit" || status === 429 || /rate limit|too many requests|for security purposes/.test(raw)) return { field: "", key: "su_e_rate" };
    if (code === "signup_disabled" || /signups? (are )?(not allowed|disabled)/.test(raw)) return { field: "", key: "su_e_off" };
    if (/error sending|sending confirmation|smtp|mailer/.test(raw)) return { field: "", key: "su_e_mail_fail" };
    if (/database error saving new user|unexpected_failure/.test(raw) || code === "unexpected_failure") return { field: "", key: "su_e_db" };
    return { field: "", key: "su_e_generic" };
  }

  /* Membaca alamat yang dibuka dari tautan email. Supabase menaruh hasil di #hash (alur implicit) atau ?query (PKCE / galat). */
  function parseArrival(hash, search){
    function parse(s){
      var o = {}; s = String(s || "").replace(/^[#?]/, "");
      if (!s) return o;
      s.split("&").forEach(function(p){
        if (!p) return;
        var i = p.indexOf("="), k = i < 0 ? p : p.slice(0, i), v = i < 0 ? "" : p.slice(i + 1);
        try { o[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, " ")); } catch (e) { o[k] = v; }
      });
      return o;
    }
    var h = parse(hash), q = parse(search), r = { error: false, errorCode: "", description: "", type: "", hasToken: false, hasCode: false };
    var e = h.error || q.error || h.error_code || q.error_code;
    if (e) {
      r.error = true;
      r.errorCode = String(h.error_code || q.error_code || h.error || q.error || "").toLowerCase();
      r.description = h.error_description || q.error_description || "";
    }
    r.type = String(h.type || q.type || "").toLowerCase();
    r.hasToken = !!h.access_token;
    r.hasCode = !!q.code;
    r.confirmed = !r.error && (r.type === "signup" || r.type === "email") && (r.hasToken || r.hasCode || !!h.token_hash);
    return r;
  }

  /* Galat pada tautan -> kunci teks. */
  function arrivalErrorKey(a){
    var c = (a && a.errorCode || "") + " " + (a && a.description || "").toLowerCase();
    if (/otp_expired|expired|invalid or has expired|has expired/.test(c)) return "su_l_expired";
    if (/access_denied|invalid|used/.test(c)) return "su_l_used";
    return "su_l_bad";
  }

  return { validate: validate, mapError: mapError, parseArrival: parseArrival, arrivalErrorKey: arrivalErrorKey, EMAIL_RE: EMAIL_RE };
});
