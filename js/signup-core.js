/* Fungsi murni untuk alur daftar akun GWM: validasi kolom, pemetaan galat server -> kunci teks, dan pembacaan tautan konfirmasi email.
   Bisa dijalankan di browser maupun Node (lihat tests/signup-core.test.mjs). */
(function(root, factory){
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.IB_SignupCore = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function(){
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* Nama panggilan tampil publik (profil, forum, ajakan). Dua hal ditolak:
     1) menyerupai pengelola ("admin", "GWM", "moderator", varian leetspeak seperti "4dm1n"), karena bisa dipakai menyamar;
     2) berisi data pribadi (email, nomor HP, tautan), karena nama ini terbaca semua orang.
     Hasil: "" bila aman, atau kunci teks galat. */
  var LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };
  var RESERVED_EXACT = ["admin", "administrator", "moderator", "mod", "staff", "support", "official", "system", "sistem", "owner", "cs", "customerservice", "helpdesk", "gwm", "gowithme", "gowithdme", "jurkon", "jurkonstudio"];
  var RESERVED_EDGE = ["admin", "gwm", "gowithdme", "gowithme", "jurkon", "moderator"];
  function compact(nick) {
    var t = String(nick == null ? "" : nick).toLowerCase();
    try { t = t.normalize("NFKD").replace(/[\u0300-\u036f]/g, ""); } catch (e) {}
    return t.replace(/[013457@$!]/g, function (c) { return LEET[c]; }).replace(/[^a-z]/g, "");
  }
  function nickIssue(nick) {
    var raw = String(nick == null ? "" : nick).trim();
    if (!raw) return "";
    if (/\S+@\S+\.\S+/.test(raw) || /(https?:\/\/|www\.|\.(com|net|org|co|id|my\.id|xyz|me|io)(\/|\b))/i.test(raw) || raw.replace(/\D/g, "").length >= 9) return "su_e_nick_private";
    var c = compact(raw);
    if (RESERVED_EXACT.indexOf(c) > -1) return "su_e_nick_reserved";
    for (var i = 0; i < RESERVED_EDGE.length; i++) {
      var w = RESERVED_EDGE[i];
      if (c.length > w.length && (c.slice(0, w.length) === w || c.slice(-w.length) === w) && c.indexOf("administrasi") < 0) return "su_e_nick_reserved";
    }
    return "";
  }


  /* ---- Email: salah ketik domain umum + email sekali pakai ---- */
  var MAIL_OK = ["gmail.com", "yahoo.com", "yahoo.co.id", "ymail.com", "outlook.com", "hotmail.com", "live.com", "msn.com", "icloud.com", "me.com", "proton.me", "protonmail.com", "mail.com", "email.com", "gmx.com", "zoho.com", "aol.com", "yandex.com"];
  var MAIL_FIX = { "gmail.co": "gmail.com", "gmail.id": "gmail.com", "gmail.co.id": "gmail.com", "gmail.cim": "gmail.com", "gmail.vom": "gmail.com", "gmail.con": "gmail.com", "gmail.cm": "gmail.com", "gmai.com": "gmail.com", "gmial.com": "gmail.com", "gamil.com": "gmail.com", "yahoo.co": "yahoo.com", "yahoo.con": "yahoo.com", "yaho.com": "yahoo.com", "yahoo.id": "yahoo.co.id" };
  var TEMP_MAIL = ["mailinator.com", "guerrillamail.com", "guerrillamail.net", "guerrillamail.org", "guerrillamail.biz", "guerrillamail.de", "sharklasers.com", "grr.la", "10minutemail.com", "10minutemail.net", "tempmail.com", "temp-mail.org", "temp-mail.io", "tempmail.net", "tempail.com", "tempr.email", "yopmail.com", "yopmail.fr", "yopmail.net", "trashmail.com", "trashmail.net", "throwawaymail.com", "dispostable.com", "getnada.com", "nada.email", "maildrop.cc", "fakeinbox.com", "mailnesia.com", "mohmal.com", "emailondeck.com", "burnermail.io", "moakt.com", "spam4.me", "mintemail.com", "discard.email", "tmpmail.org", "tmpmail.net", "mail.tm", "inboxkitten.com", "mytemp.email", "fakemail.net", "mailcatch.com", "tempinbox.com"];
  function domainOf(email) { var i = String(email || "").trim().toLowerCase().lastIndexOf("@"); return i < 0 ? "" : String(email).trim().toLowerCase().slice(i + 1); }
  /* Jarak edit (OSA): satu salah ketik, huruf tertukar, tertinggal, atau berlebih bernilai 1. */
  function editDist(a, b) {
    var m = a.length, n = b.length, d = [], i, j;
    for (i = 0; i <= m; i++) { d[i] = [i]; }
    for (j = 1; j <= n; j++) d[0][j] = j;
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) {
      var c = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a.charAt(i - 1) === b.charAt(j - 2) && a.charAt(i - 2) === b.charAt(j - 1)) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[m][n];
  }
  /* Alamat yang mungkin dimaksud ("" bila domain sudah benar atau tidak mirip apa pun). Hanya saran, tidak memblokir. */
  function suggestEmail(email) {
    var e = String(email || "").trim(), at = e.lastIndexOf("@");
    if (at < 1 || !EMAIL_RE.test(e)) return "";
    var dom = e.slice(at + 1).toLowerCase(), fix = "";
    if (MAIL_OK.indexOf(dom) > -1) return "";
    if (MAIL_FIX[dom]) fix = MAIL_FIX[dom];
    else for (var i = 0; i < MAIL_OK.length; i++) if (dom.length >= 8 && editDist(dom, MAIL_OK[i]) === 1) { fix = MAIL_OK[i]; break; }
    return fix ? e.slice(0, at + 1) + fix : "";
  }
  function isTempMail(email) {
    var dom = domainOf(email);
    if (!dom) return false;
    for (var i = 0; i < TEMP_MAIL.length; i++) if (dom === TEMP_MAIL[i] || dom.slice(-TEMP_MAIL[i].length - 1) === "." + TEMP_MAIL[i]) return true;
    return false;
  }

  /* ---- Password: terlalu umum, urutan/ulangan, atau memuat nama/email sendiri ---- */
  var COMMON_PASS = ["password", "password1", "password12", "password123", "passw0rd", "12345678", "123456789", "1234567890", "11111111", "00000000", "123123123", "12341234", "qwertyui", "qwerty123", "qwertyuiop", "asdfghjk", "asdf1234", "abc12345", "abcd1234", "iloveyou", "letmein1", "admin123", "admin1234", "katasandi", "kata sandi", "sandi123", "rahasia", "rahasia123", "indonesia", "indonesia1", "indonesia123", "bismillah", "bismillah1", "sayangku", "gowithdme", "gowithdme1", "gowithdme123", "gwm12345", "gwm123456", "jurkon123"];
  function seqPass(p) {
    if (p.length < 6) return false;
    var up = true, dn = true;
    for (var i = 1; i < p.length; i++) { var x = p.charCodeAt(i) - p.charCodeAt(i - 1); if (x !== 1) up = false; if (x !== -1) dn = false; }
    return up || dn;
  }
  /* "" bila lolos, atau kunci teks galat. */
  function passIssue(pass, ctx) {
    var p = String(pass == null ? "" : pass), low = p.toLowerCase(), c = ctx || {};
    if (!p) return "";
    if (COMMON_PASS.indexOf(low) > -1 || /^(.)\1+$/.test(p) || seqPass(low) || /^(.{1,3})\1+$/.test(p)) return "su_e_pass_weak";
    var local = String(c.email || "").toLowerCase().split("@")[0].replace(/[^a-z0-9]/g, ""), nick = String(c.nick || "").toLowerCase().replace(/[^a-z0-9]/g, ""), flat = low.replace(/[^a-z0-9]/g, "");
    if ((local.length >= 4 && flat.indexOf(local) > -1) || (nick.length >= 4 && flat.indexOf(nick) > -1)) return "su_e_pass_personal";
    return "";
  }

  /* Nama yang diminta saat daftar vs nama yang akhirnya dipakai server (nick_make mengganti nama bentrok/terlarang). true bila berbeda. */
  function nickNorm(n) { return String(n == null ? "" : n).replace(/\s+/g, " ").trim().slice(0, 30).toLowerCase(); }
  function nickDrift(asked, actual) {
    var a = nickNorm(asked), b = nickNorm(actual);
    return !!a && !!b && a !== b;
  }

  /* Hasil: { ok, errors: { nick|email|pass|consent: kunciTeks }, first: kolom pertama yang salah }.
     Urutan kolom mengikuti urutan tampilan formulir supaya fokus pindah ke kolom paling atas yang salah. */
  function validate(v){
    v = v || {};
    var errors = {}, nick = String(v.nick == null ? "" : v.nick).trim(), email = String(v.email == null ? "" : v.email).trim(), pass = String(v.pass == null ? "" : v.pass);
    if (!nick) errors.nick = "su_e_nick_need";
    else if (nick.length < 2) errors.nick = "su_e_nick_short";
    else if (nickIssue(nick)) errors.nick = nickIssue(nick);
    if (!email) errors.email = "su_e_email_need";
    else if (!EMAIL_RE.test(email)) errors.email = "su_e_email_bad";
    else if (isTempMail(email)) errors.email = "su_e_email_temp";
    if (!pass) errors.pass = "su_e_pass_need";
    else if (pass.length < 8) errors.pass = "su_e_pass_short";
    else if (passIssue(pass, { email: email, nick: nick })) errors.pass = passIssue(pass, { email: email, nick: nick });
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

  return { validate: validate, nickIssue: nickIssue, suggestEmail: suggestEmail, isTempMail: isTempMail, passIssue: passIssue, nickDrift: nickDrift, mapError: mapError, parseArrival: parseArrival, arrivalErrorKey: arrivalErrorKey, EMAIL_RE: EMAIL_RE };
});
