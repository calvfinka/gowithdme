/* Pindah tiket: logika murni (tanpa DOM) supaya bisa diuji di tests/tiket-core.test.mjs.
   - parseNik(nik): arti 16 digit NIK (kode wilayah, tanggal lahir, jenis kelamin; perempuan: tanggal + 40, PP 37/2007 Pasal 37).
   - parseKtp(teksOCR): mengambil field e-KTP dari teks hasil OCR (toleran terhadap salah baca huruf/angka).
   - buildDoc(jenis, bahasa, data): satu model dokumen yang dipakai pratinjau HTML, PDF, DOCX, dan TXT.
   Rujukan susunan surat: syarat dan ketentuan promotor (surat kuasa di atas meterai Rp10.000 + fotokopi identitas pemilik tiket). */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.IB_TiketCore = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function () {
  var MON = {
    id: ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"],
    en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  };
  var DOT = "………………………………";
  /* kode provinsi yang dipakai di NIK (termasuk provinsi baru Papua 91-96) */
  var PROV = { 11: "Aceh", 12: "Sumatera Utara", 13: "Sumatera Barat", 14: "Riau", 15: "Jambi", 16: "Sumatera Selatan", 17: "Bengkulu", 18: "Lampung", 19: "Kepulauan Bangka Belitung", 21: "Kepulauan Riau", 31: "DKI Jakarta", 32: "Jawa Barat", 33: "Jawa Tengah", 34: "DI Yogyakarta", 35: "Jawa Timur", 36: "Banten", 51: "Bali", 52: "Nusa Tenggara Barat", 53: "Nusa Tenggara Timur", 61: "Kalimantan Barat", 62: "Kalimantan Tengah", 63: "Kalimantan Selatan", 64: "Kalimantan Timur", 65: "Kalimantan Utara", 71: "Sulawesi Utara", 72: "Sulawesi Tengah", 73: "Sulawesi Selatan", 74: "Sulawesi Tenggara", 75: "Gorontalo", 76: "Sulawesi Barat", 81: "Maluku", 82: "Maluku Utara", 91: "Papua Barat", 92: "Papua Barat Daya", 93: "Papua Selatan", 94: "Papua Tengah", 95: "Papua Pegunungan", 96: "Papua" };

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function clean(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); }
  function jakartaToday() {
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date()); }
    catch (e) { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  }
  function validIso(y, m, d) {
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    var dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }
  function fmtDate(iso, lang) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
    if (!m) return "";
    return parseInt(m[3], 10) + " " + (MON[lang] || MON.id)[parseInt(m[2], 10) - 1] + " " + m[1];
  }
  function fmtRange(a, b, lang) {
    if (!a) return "";
    if (!b || b === a) return fmtDate(a, lang);
    var x = /^(\d{4})-(\d{2})-(\d{2})/.exec(a), y = /^(\d{4})-(\d{2})-(\d{2})/.exec(b);
    if (!x || !y) return fmtDate(a, lang);
    if (x[1] === y[1] && x[2] === y[2]) return parseInt(x[3], 10) + "–" + parseInt(y[3], 10) + " " + (MON[lang] || MON.id)[parseInt(x[2], 10) - 1] + " " + x[1];
    return fmtDate(a, lang) + " – " + fmtDate(b, lang);
  }

  /* ---------- NIK ---------- */
  function onlyDigits(s) { return String(s == null ? "" : s).replace(/\D/g, ""); }
  function parseNik(nik) {
    var n = onlyDigits(nik), out = { nik: n, valid: false, reasons: [] };
    if (n.length !== 16) { out.reasons.push("len"); return out; }
    var prov = parseInt(n.slice(0, 2), 10), dd = parseInt(n.slice(6, 8), 10), mm = parseInt(n.slice(8, 10), 10), yy = parseInt(n.slice(10, 12), 10);
    var female = dd > 40, day = female ? dd - 40 : dd;
    var curYy = parseInt(jakartaToday().slice(2, 4), 10);
    var year = yy <= curYy ? 2000 + yy : 1900 + yy;
    out.province = PROV[prov] || "";
    out.gender = female ? "P" : "L";
    out.day = day; out.month = mm; out.year = year;
    if (!PROV[prov]) out.reasons.push("prov");
    if (!validIso(year, mm, day)) out.reasons.push("date");
    else out.birth = year + "-" + pad(mm) + "-" + pad(day);
    if (n.slice(12) === "0000") out.reasons.push("seq");
    out.valid = out.reasons.length === 0;
    return out;
  }
  function maskNik(nik) {
    var n = onlyDigits(nik);
    return n.length === 16 ? n.slice(0, 4) + " **** **** " + n.slice(12) : n;
  }

  /* ---------- OCR e-KTP ---------- */
  var DIGIT_FIX = { O: "0", o: "0", Q: "0", D: "0", I: "1", i: "1", l: "1", L: "1", "|": "1", "!": "1", S: "5", s: "5", B: "8", b: "6", Z: "2", z: "2", G: "6", g: "9", T: "7" };
  function fixDigits(s) { return String(s).replace(/[OoQDIilL|!SsBbZzGgT]/g, function (c) { return DIGIT_FIX[c]; }); }
  function nikFromText(lines) {
    var i, cand, line, m;
    for (i = 0; i < lines.length; i++) {
      line = lines[i];
      if (/^\W*N[I1l]K\b/i.test(line)) {
        cand = fixDigits(line.replace(/^\W*N[I1l]K\s*[:;.]?/i, "").replace(/[\s.\-:;]/g, ""));
        m = /\d{16}/.exec(cand);
        if (m) return m[0];
      }
    }
    for (i = 0; i < lines.length; i++) {
      cand = lines[i].replace(/[\s.\-:;]/g, "");
      if (cand.length < 16) continue;
      m = /[0-9OoIl|SBZ]{16}/.exec(cand);
      if (m) { var f = fixDigits(m[0]); if (/^\d{16}$/.test(f) && (m[0].match(/\d/g) || []).length >= 10) return f; }
    }
    return "";
  }
  function cleanName(s) {
    return clean(String(s).replace(/[^A-Za-z .,'\-]/g, " ").replace(/\s+([.,])/g, "$1")).toUpperCase();
  }
  function parseDateIn(s) {
    var m = /(\d{1,2})\s*[-\/.\s]\s*(\d{1,2})\s*[-\/.\s]\s*(\d{4})/.exec(fixDigits0(s));
    if (!m) return "";
    var d = parseInt(m[1], 10), mo = parseInt(m[2], 10), y = parseInt(m[3], 10);
    return validIso(y, mo, d) ? y + "-" + pad(mo) + "-" + pad(d) : "";
  }
  function fixDigits0(s) { return String(s).replace(/[Oo]/g, "0").replace(/[Il|]/g, "1"); }
  var LABELS = [
    ["nama", /^N[a4]ma\s*[:;]?\s*(.*)$/i],
    ["ttl", /^Tempat.{0,14}Lahir\s*[:;]?\s*(.*)$/i],
    ["jk", /^Jenis\s*Kelamin\s*[:;]?\s*(.*)$/i],
    ["alamat", /^A[l1]amat\s*[:;]?\s*(.*)$/i],
    ["rtrw", /^RT\s*[\/.]?\s*RW\s*[:;]?\s*(.*)$/i],
    ["kel", /^(?:Kel\.?\s*\/?\s*Desa|Kelurahan|Desa)\s*[:;]?\s*(.*)$/i],
    ["kec", /^Kecamatan\s*[:;]?\s*(.*)$/i],
    ["agama", /^Agama\s*[:;]?\s*(.*)$/i],
    ["status", /^Status\s*Perkawinan\s*[:;]?\s*(.*)$/i],
    ["pekerjaan", /^Pekerjaan\s*[:;]?\s*(.*)$/i],
    ["warga", /^Kewarganegaraan\s*[:;]?\s*(.*)$/i],
    ["berlaku", /^Berlaku\s*Hingga\s*[:;]?\s*(.*)$/i]
  ];
  function parseKtp(text) {
    var lines = String(text || "").split(/\r?\n/).map(clean).filter(Boolean), raw = {}, o = { found: 0 }, i, j, m;
    for (i = 0; i < lines.length; i++) {
      for (j = 0; j < LABELS.length; j++) {
        m = LABELS[j][1].exec(lines[i]);
        if (m && raw[LABELS[j][0]] == null) { raw[LABELS[j][0]] = clean(m[1]); break; }
      }
      if ((m = /^PROVINSI\s+(.+)$/i.exec(lines[i])) && !o.provinsi) o.provinsi = clean(m[1]).toUpperCase();
      else if ((m = /^(KOTA|KABUPATEN|KAB\.?)\s+(.+)$/i.exec(lines[i])) && !o.kota && i < 4) o.kota = clean(m[0]).toUpperCase();
    }
    o.nik = nikFromText(lines);
    if (raw.nama) o.nama = cleanName(raw.nama);
    if (raw.ttl) {
      var iso = parseDateIn(raw.ttl);
      o.tempat = cleanName(raw.ttl.replace(/\d.*$/, "").replace(/[,\s]+$/, ""));
      if (iso) o.lahir = iso;
    }
    if (raw.jk) o.jk = /PEREMPUAN|WANITA|PR\b/i.test(raw.jk) ? "P" : /LAKI|PRIA|LK\b/i.test(raw.jk) ? "L" : "";
    if (raw.alamat) o.alamat = clean(raw.alamat).toUpperCase();
    if (raw.rtrw) o.rtrw = clean(fixDigits0(raw.rtrw)).replace(/\s*[\/.\-]\s*/, "/");
    if (raw.kel) o.kel = clean(raw.kel).toUpperCase();
    if (raw.kec) o.kec = clean(raw.kec).toUpperCase();
    if (raw.agama) o.agama = clean(raw.agama).toUpperCase();
    if (raw.status) o.status = clean(raw.status).toUpperCase();
    if (raw.pekerjaan) o.pekerjaan = clean(raw.pekerjaan).toUpperCase();
    if (raw.warga) o.warga = clean(raw.warga).toUpperCase();
    if (raw.berlaku) o.berlaku = clean(raw.berlaku).toUpperCase();
    var pn = parseNik(o.nik);
    if (pn.valid) {
      if (!o.lahir && pn.birth) o.lahir = pn.birth;
      if (!o.jk) o.jk = pn.gender;
      o.nikOk = true;
    } else o.nikOk = false;
    if (o.lahir && pn.birth && o.lahir !== pn.birth) o.nikMismatch = true;
    ["nik", "nama", "tempat", "lahir", "alamat"].forEach(function (k) { if (o[k]) o.found++; });
    o.alamatFull = fullAddress(o);
    return o;
  }
  function fullAddress(o) {
    var a = [o.alamat];
    if (o.rtrw) a.push("RT/RW " + o.rtrw);
    if (o.kel) a.push("Kel./Desa " + o.kel);
    if (o.kec) a.push("Kec. " + o.kec);
    if (o.kota) a.push(o.kota);
    return a.filter(Boolean).join(", ");
  }

  /* ---------- template surat ---------- */
  var T = {
    id: {
      f_name: "Nama (sesuai KTP)", f_nik: "NIK", f_pob: "Tempat/Tgl. Lahir", f_addr: "Alamat", f_mail: "E-mail", f_wa: "No. WhatsApp",
      e_name: "Nama event", e_date: "Hari/Tanggal", e_venue: "Lokasi", e_org: "Penyelenggara", e_type: "Jenis/kategori tiket", e_qty: "Jumlah tiket", e_id: "Nomor ID/kode tiket",
      intro: "Yang bertanda tangan di bawah ini:", stamp: "Materai Rp10.000", sigline: "(tanda tangan)",
      kuasa: {
        title: "SURAT KUASA PEMINDAHTANGANAN TIKET", role1: "selanjutnya disebut PIHAK PERTAMA (Pemberi Kuasa).",
        grant: "Dengan ini memberikan kuasa kepada:", role2: "selanjutnya disebut PIHAK KEDUA (Penerima Kuasa).",
        scope: "Untuk dan atas nama PIHAK PERTAMA, PIHAK KEDUA berwenang menerima, menukarkan, dan menggunakan tiket event berikut:",
        terms: ["PIHAK PERTAMA menyatakan bahwa tiket di atas diperoleh secara sah dan seluruh data identitas dalam surat ini adalah benar.", "Setelah tiket dipindahtangankan, PIHAK PERTAMA tidak lagi menggunakan tiket tersebut dan tidak mengalihkannya kepada pihak lain.", "PIHAK KEDUA wajib mematuhi syarat dan ketentuan penyelenggara selama event berlangsung."],
        closing: "Demikian surat kuasa ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.", sig1: "Yang Memberi Kuasa,", sig2: "Yang Menerima Kuasa,"
      },
      alih: {
        title: "SURAT PERNYATAAN PENGALIHAN TIKET", role1: "selanjutnya disebut PIHAK PERTAMA (Pemilik Tiket).",
        grant: "Dengan ini menyatakan mengalihkan tiket event kepada:", role2: "selanjutnya disebut PIHAK KEDUA (Penerima Tiket).",
        scope: "Tiket yang dialihkan:",
        terms: ["PIHAK PERTAMA menyatakan bahwa tiket tersebut diperoleh secara sah, belum pernah dialihkan kepada pihak lain, dan dialihkan secara sukarela.", "Sejak surat ini ditandatangani, hak menggunakan tiket beralih kepada PIHAK KEDUA dan PIHAK PERTAMA tidak akan menggunakannya kembali.", "Pengalihan dilakukan sesuai syarat dan ketentuan penyelenggara, dan PIHAK KEDUA bertanggung jawab mematuhinya."],
        closing: "Demikian surat pernyataan ini dibuat dengan sebenarnya dan tanpa paksaan dari pihak mana pun.", sig1: "PIHAK PERTAMA,", sig2: "PIHAK KEDUA,"
      },
      attach1: "Surat ini dilampiri fotokopi identitas (KTP) PIHAK PERTAMA.", attach2: "Surat ini dilampiri fotokopi identitas (KTP) PIHAK PERTAMA dan PIHAK KEDUA.",
      notes_h: "Catatan",
      notes: ["Tanda tangan basah pemberi/pemilik tiket di atas meterai Rp10.000.", "Bawa fotokopi atau foto KTP sesuai nama yang tertera di e-tiket.", "Cek syarat dan ketentuan resmi penyelenggara; sebagian event punya jalur dan batas waktu sendiri untuk pemindahan tiket.", "Jaga kerahasiaan barcode dan ID tiket."],
      attach_h: "LAMPIRAN", attach_cap1: "Fotokopi KTP PIHAK PERTAMA", attach_cap2: "Fotokopi KTP PIHAK KEDUA"
    },
    en: {
      f_name: "Full name (as on ID)", f_nik: "National ID No. (NIK)", f_pob: "Place/Date of birth", f_addr: "Address", f_mail: "E-mail", f_wa: "WhatsApp no.",
      e_name: "Event name", e_date: "Date", e_venue: "Venue", e_org: "Organizer", e_type: "Ticket type/category", e_qty: "Number of tickets", e_id: "Ticket ID/code",
      intro: "The undersigned:", stamp: "Stamp duty IDR 10,000", sigline: "(signature)",
      kuasa: {
        title: "TICKET TRANSFER AUTHORIZATION LETTER", role1: "hereinafter referred to as the FIRST PARTY (Grantor).",
        grant: "hereby authorizes:", role2: "hereinafter referred to as the SECOND PARTY (Attorney-in-fact).",
        scope: "On behalf of the FIRST PARTY, the SECOND PARTY is authorized to receive, redeem, and use the following event ticket(s):",
        terms: ["The FIRST PARTY declares that the ticket(s) were obtained legitimately and that all identity details in this letter are true.", "Once transferred, the FIRST PARTY will no longer use the ticket(s) and will not transfer them to anyone else.", "The SECOND PARTY must comply with the organizer's terms and conditions throughout the event."],
        closing: "This letter is made truthfully to be used as appropriate.", sig1: "Grantor,", sig2: "Attorney-in-fact,"
      },
      alih: {
        title: "TICKET TRANSFER STATEMENT", role1: "hereinafter referred to as the FIRST PARTY (Ticket Holder).",
        grant: "hereby declares that they transfer the event ticket(s) to:", role2: "hereinafter referred to as the SECOND PARTY (Recipient).",
        scope: "Ticket(s) transferred:",
        terms: ["The FIRST PARTY declares that the ticket(s) were obtained legitimately, have not been transferred to anyone else, and are transferred voluntarily.", "From the signing of this letter, the right to use the ticket(s) passes to the SECOND PARTY and the FIRST PARTY will not use them again.", "The transfer is made in line with the organizer's terms and conditions, which the SECOND PARTY is responsible for following."],
        closing: "This statement is made truthfully and without coercion from any party.", sig1: "FIRST PARTY,", sig2: "SECOND PARTY,"
      },
      attach1: "A copy of the FIRST PARTY's ID card is attached.", attach2: "Copies of the FIRST PARTY's and SECOND PARTY's ID cards are attached.",
      notes_h: "Notes",
      notes: ["Wet-ink signature of the ticket holder on a IDR 10,000 stamp duty.", "Bring a copy or photo of the ID matching the name on the e-ticket.", "Check the organizer's official terms; some events have their own channel and deadline for ticket transfers.", "Keep the ticket barcode and ID private."],
      attach_h: "ATTACHMENTS", attach_cap1: "ID card copy, FIRST PARTY", attach_cap2: "ID card copy, SECOND PARTY"
    }
  };
  function orDot(v) { v = clean(v); return v || DOT; }
  function pobOf(p, lang) {
    var t = clean(p.tempat), d = p.lahir ? fmtDate(p.lahir, lang) : "";
    return t && d ? t + ", " + d : (t || d || "");
  }
  function party(L, p, lang) {
    var rows = [[L.f_name, orDot(p.nama)], [L.f_nik, orDot(onlyDigits(p.nik))]];
    var pob = pobOf(p, lang);
    if (pob) rows.push([L.f_pob, pob]);
    if (clean(p.alamat)) rows.push([L.f_addr, clean(p.alamat)]);
    rows.push([L.f_mail, orDot(p.email)], [L.f_wa, orDot(p.wa)]);
    return rows;
  }
  /* data: {p1:{nama,nik,tempat,lahir,alamat,email,wa}, p2:{...}, ev:{title,date,endDate,venue,city,organizer}, tk:{type,qty,id}, place, date(ISO), stamp, attach} */
  function buildDoc(kind, lang, d) {
    lang = lang === "en" ? "en" : "id";
    kind = kind === "alih" ? "alih" : "kuasa";
    var L = T[lang], K = L[kind], ev = d.ev || {}, tk = d.tk || {}, out = [];
    var venue = [clean(ev.venue), clean(ev.city) && clean(ev.venue).toLowerCase().indexOf(clean(ev.city).toLowerCase()) < 0 ? clean(ev.city) : ""].filter(Boolean).join(", ");
    var terms = K.terms.slice();
    if (d.attach) terms.push(d.p2 && clean(d.p2.nama) ? L.attach2 : L.attach1);
    out.push({ t: "title", text: K.title });
    out.push({ t: "p", text: L.intro });
    out.push({ t: "kv", rows: party(L, d.p1 || {}, lang) });
    out.push({ t: "p", text: K.role1 });
    out.push({ t: "p", text: K.grant });
    out.push({ t: "kv", rows: party(L, d.p2 || {}, lang) });
    out.push({ t: "p", text: K.role2 });
    out.push({ t: "p", text: K.scope });
    out.push({ t: "kv", rows: [[L.e_name, orDot(ev.title)], [L.e_date, orDot(fmtRange(ev.date, ev.endDate, lang))], [L.e_venue, orDot(venue)], [L.e_org, orDot(ev.organizer)], [L.e_type, orDot(tk.type)], [L.e_qty, orDot(tk.qty)], [L.e_id, orDot(tk.id)]] });
    out.push({ t: "ol", items: terms });
    out.push({ t: "p", text: K.closing });
    out.push({ t: "place", text: (clean(d.place) || DOT) + ", " + (d.date ? fmtDate(d.date, lang) : DOT) });
    out.push({ t: "sign", left: { role: K.sig1, name: clean((d.p1 || {}).nama) || DOT, stamp: d.stamp ? L.stamp : "" }, right: { role: K.sig2, name: clean((d.p2 || {}).nama) || DOT }, line: L.sigline });
    out.push({ t: "note", title: L.notes_h, items: L.notes });
    return out;
  }
  function attachLabels(lang) { var L = T[lang === "en" ? "en" : "id"]; return { h: L.attach_h, c1: L.attach_cap1, c2: L.attach_cap2 }; }

  function toText(doc) {
    var o = [];
    doc.forEach(function (b) {
      if (b.t === "title") o.push(b.text, "");
      else if (b.t === "p") o.push(b.text, "");
      else if (b.t === "kv") { b.rows.forEach(function (r) { o.push(r[0] + ": " + r[1]); }); o.push(""); }
      else if (b.t === "ol") { b.items.forEach(function (x, i) { o.push((i + 1) + ". " + x); }); o.push(""); }
      else if (b.t === "place") o.push(b.text, "");
      else if (b.t === "sign") {
        o.push(b.left.role + "    " + b.right.role);
        if (b.left.stamp) o.push("[" + b.left.stamp + "]");
        o.push("", "", b.left.name + "    " + b.right.name, "");
      } else if (b.t === "note") { o.push(b.title + ":"); b.items.forEach(function (x, i) { o.push((i + 1) + ". " + x); }); }
    });
    return o.join("\r\n");
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function toHtml(doc) {
    var o = [];
    doc.forEach(function (b) {
      if (b.t === "title") o.push('<h2 class="tk-dt">' + esc(b.text) + "</h2>");
      else if (b.t === "p") o.push("<p>" + esc(b.text) + "</p>");
      else if (b.t === "kv") o.push('<table class="tk-kv">' + b.rows.map(function (r) { return "<tr><td>" + esc(r[0]) + "</td><td>: " + esc(r[1]) + "</td></tr>"; }).join("") + "</table>");
      else if (b.t === "ol") o.push("<ol>" + b.items.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ol>");
      else if (b.t === "place") o.push('<p class="tk-place">' + esc(b.text) + "</p>");
      else if (b.t === "sign") o.push('<div class="tk-sign"><div><span>' + esc(b.left.role) + '</span><i class="tk-stamp">' + esc(b.left.stamp || "") + "</i><b>" + esc(b.left.name) + '</b></div><div><span>' + esc(b.right.role) + '</span><i class="tk-stamp"></i><b>' + esc(b.right.name) + "</b></div></div>");
      else if (b.t === "note") o.push('<div class="tk-note"><b>' + esc(b.title) + "</b><ol>" + b.items.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ol></div>");
    });
    return o.join("");
  }

  /* ---------- validasi ---------- */
  function validate(d) {
    var e = [], p1 = d.p1 || {}, p2 = d.p2 || {}, ev = d.ev || {}, tk = d.tk || {};
    if (!clean(ev.title)) e.push("event");
    if (!clean(p1.nama)) e.push("p1_nama");
    if (onlyDigits(p1.nik).length !== 16) e.push("p1_nik");
    if (!clean(p2.nama)) e.push("p2_nama");
    if (onlyDigits(p2.nik).length !== 16) e.push("p2_nik");
    if (e.indexOf("p1_nik") < 0 && e.indexOf("p2_nik") < 0 && onlyDigits(p1.nik) === onlyDigits(p2.nik)) e.push("same_nik");
    if (!clean(tk.id)) e.push("tk_id");
    if (!clean(d.place)) e.push("place");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date || "")) e.push("date");
    return e;
  }
  function eventToData(e, lang) {
    if (!e) return {};
    var en = lang === "en" && e.title_en;
    return { id: e.id, slug: e.slug, title: clean(en ? e.title_en : e.title), date: (e.event_date || "").slice(0, 10), endDate: (e.end_date || "").slice(0, 10), venue: clean(e.venue), city: clean(e.city), organizer: clean(e.organizer), ticketUrl: e.ticket_url || "", category: e.category || "" };
  }
  function upcoming(list, today) {
    today = today || jakartaToday();
    return (list || []).filter(function (e) { return e && e.title && ((e.end_date || e.event_date || "").slice(0, 10) >= today); })
      .sort(function (a, b) { return String(a.event_date).localeCompare(String(b.event_date)); });
  }
  function searchEvents(list, q) {
    q = clean(q).toLowerCase();
    if (!q) return list;
    return list.filter(function (e) { return (clean(e.title) + " " + clean(e.title_en) + " " + clean(e.city) + " " + clean(e.venue) + " " + clean(e.lineup)).toLowerCase().indexOf(q) >= 0; });
  }
  function fileName(kind, ev, ext) {
    var s = clean(ev && ev.title).toLowerCase().normalize ? clean(ev && ev.title).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : clean(ev && ev.title).toLowerCase();
    s = s.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "event";
    return (kind === "alih" ? "pengalihan-tiket-" : "surat-kuasa-tiket-") + s + "." + ext;
  }

  return { parseNik: parseNik, maskNik: maskNik, parseKtp: parseKtp, buildDoc: buildDoc, attachLabels: attachLabels, toText: toText, toHtml: toHtml, validate: validate, eventToData: eventToData, upcoming: upcoming, searchEvents: searchEvents, fileName: fileName, fmtDate: fmtDate, fmtRange: fmtRange, today: jakartaToday, PROV: PROV, DOT: DOT };
});
