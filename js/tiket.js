/* Halaman /tiket: surat pindah tiket event. Wajib login (getMe). Data event dari IB_loadEvents(); KTP dibaca di browser
   (Tesseract.js, tanpa unggah ke server), hasilnya mengisi kolom lalu template. Unduh: PDF (jsPDF), DOCX (docx), TXT, cetak.
   Pustaka berat dimuat malas dari CDN saat pertama dipakai. Logika murni ada di tiket-core.js (diuji di tests/tiket-core.test.mjs). */
(function () {
var tr = window.IB_T || function (k) { return k }, C = window.IB_TiketCore;
if (!window.sb) { msg(!window.supabase ? tr("a_lib") : !(window.IB_CONFIG && IB_CONFIG.SUPABASE_URL) ? tr("a_cfg") : tr("a_notready"), "err"); return }
var st = { kind: "kuasa", lang: window.IB_LANG === "en" ? "en" : "id", raw: null, all: [], evs: [], shown: [], img: { 1: null, 2: null }, busy: false };
var PF = ["nama", "nik", "tempat", "lahir", "alamat", "email", "wa"];
var FIELD = { event: "tkEvQ", p1_nama: "p1_nama", p1_nik: "p1_nik", p2_nama: "p2_nama", p2_nik: "p2_nik", same_nik: "p2_nik", tk_id: "tk_id", place: "tk_place", date: "tk_date" };
var LIB = {
  jspdf: { t: function () { return window.jspdf && window.jspdf.jsPDF }, u: ["https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js", "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"] },
  docx: { t: function () { return window.docx && window.docx.Document }, u: ["https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js", "https://unpkg.com/docx@8.5.0/build/index.umd.js"] },
  tess: { t: function () { return window.Tesseract }, u: ["https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js", "https://unpkg.com/tesseract.js@5.1.1/dist/tesseract.min.js"] }
};

function v(id) { return ($(id).value || "").trim() }
function party(n) { var o = {}; PF.forEach(function (k) { o[k] = v("p" + n + "_" + k) }); return o }
function toast(m) { var t = $("toast"); t.textContent = m; t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove("on") }, 3200) }
function purl(u) { u = String(u || ""); return /^(https?:|data:|\/\/)/.test(u) ? u : "../" + u.replace(/^\//, "") }
function curEv() {
  if (st.raw) return C.eventToData(st.raw, st.lang);
  var t = v("tkMTitle");
  return t ? { title: t, date: $("tkMDate").value, endDate: "", venue: v("tkMVenue"), city: "", organizer: "" } : {};
}
function collect() {
  return { p1: party(1), p2: party(2), ev: curEv(), tk: { type: v("tk_type"), qty: v("tk_qty"), id: v("tk_id") }, place: v("tk_place"), date: $("tk_date").value, stamp: $("tk_stamp").checked, attach: $("tk_attach").checked };
}
function doc() { return C.buildDoc(st.kind, st.lang, collect()) }

/* ---------- pratinjau ---------- */
var rt;
function render() { clearTimeout(rt); rt = setTimeout(paint, 90) }
function paint() { $("tkPaper").innerHTML = C.toHtml(doc()); [1, 2].forEach(nikHint) }
function nikHint(n) {
  var el = $("p" + n + "_nikh"), d = C.parseNik($("p" + n + "_nik").value), lh = $("p" + n + "_lahir").value;
  if (!d.nik) { el.hidden = true; return }
  el.hidden = false;
  if (d.valid) {
    var t = tr("tkj_nik_ok", { sex: tr("tkj_sex_" + d.gender), date: C.fmtDate(d.birth, st.lang), prov: d.province });
    if (lh && lh !== d.birth) { el.className = "meta tk-hint warn"; t += " " + tr("tkj_nik_mismatch") } else el.className = "meta tk-hint ok";
    el.textContent = t;
  } else if (d.nik.length < 16) { el.className = "meta tk-hint"; el.textContent = tr("tkj_nik_len", { n: d.nik.length }) }
  else { el.className = "meta tk-hint warn"; el.textContent = tr("tkj_nik_bad") }
}

/* ---------- pilih event ---------- */
function meta(e) {
  var cityIn = e.city && String(e.venue || "").toLowerCase().indexOf(String(e.city).toLowerCase()) >= 0;
  var w = [e.venue, cityIn ? "" : e.city].filter(Boolean).join(", "), d = C.fmtRange((e.event_date || "").slice(0, 10), (e.end_date || "").slice(0, 10), st.lang);
  return esc([d, w].filter(Boolean).join(" · "));
}
function thumb(e) { return e.poster_url ? ' style="background-image:url(\'' + esc(purl(e.poster_url)).replace(/'/g, "%27") + '\')"' : "" }
function title(e) { return esc(st.lang === "en" && e.title_en ? e.title_en : e.title) }
function renderList() {
  st.shown = C.searchEvents(st.evs, $("tkEvQ").value).slice(0, 8);
  $("tkEvList").innerHTML = st.shown.length ? st.shown.map(function (e, i) {
    return '<button type="button" class="tk-ev" role="option" data-i="' + i + '"><span class="th"' + thumb(e) + '></span><span><b>' + title(e) + "</b><span>" + meta(e) + "</span></span></button>";
  }).join("") : '<div class="tk-empty">' + esc(tr("tkj_ev_none")) + "</div>";
}
function paintSel() {
  var e = st.raw, box = $("tkEvSel");
  $("tkEvPick").hidden = !!e; box.hidden = !e;
  if (!e) return;
  var link = /^https?:\/\//i.test(e.ticket_url || "") ? '<a href="' + esc(e.ticket_url) + '" target="_blank" rel="noopener">' + esc(tr("tkj_ev_rules")) + "</a>" : "";
  box.innerHTML = '<span class="th"' + thumb(e) + '></span><div class="bd"><b>' + title(e) + "</b><span>" + meta(e) + '</span><div class="act"><button class="lnk" type="button" id="tkEvChg">' + esc(tr("tkj_ev_change")) + "</button>" + link + "</div></div>";
}
function pickEvent(e) {
  st.raw = e; paintSel();
  render();
}
function loadEvents() {
  if (!window.IB_loadEvents) return;
  IB_loadEvents().then(function (list) {
    st.all = list; st.evs = C.upcoming(list); renderList();
    var slug = new URLSearchParams(location.search).get("e");
    if (slug) for (var i = 0; i < list.length; i++) if (list[i].slug === slug) { pickEvent(list[i]); break }
  }).catch(function () { $("tkEvList").innerHTML = '<div class="tk-empty">' + esc(tr("tkj_events_err")) + "</div>"; document.querySelector(".tk-manual").open = true });
}

/* ---------- pustaka CDN (malas) ---------- */
function lib(k) {
  var L = LIB[k];
  if (L.t()) return Promise.resolve();
  if (L.p) return L.p;
  L.p = new Promise(function (res, rej) {
    var i = 0;
    (function next() {
      if (i >= L.u.length) return rej(new Error("lib"));
      var s = document.createElement("script");
      s.src = L.u[i++]; s.async = true;
      s.onload = function () { L.t() ? res() : next() };
      s.onerror = function () { s.remove(); next() };
      document.head.appendChild(s);
    })();
  }).catch(function (e) { L.p = null; throw e });
  return L.p;
}

/* ---------- KTP: baca di browser ---------- */
function setProg(n, pct, label) {
  var p = $("p" + n + "_prog"); p.hidden = pct == null;
  if (pct == null) return;
  p.firstElementChild.style.width = pct + "%"; p.lastElementChild.textContent = label;
}
function ocrNote(n, text, cls) { var el = $("p" + n + "_ocr"); el.hidden = !text; el.className = "meta tk-hint" + (cls ? " " + cls : ""); el.textContent = text || "" }
function loadImg(file) {
  return new Promise(function (res, rej) {
    var u = URL.createObjectURL(file), im = new Image();
    im.onload = function () { URL.revokeObjectURL(u); res(im) };
    im.onerror = function () { URL.revokeObjectURL(u); rej(new Error("img")) };
    im.src = u;
  });
}
function toCanvas(im, max) {
  var w = im.naturalWidth || im.width, h = im.naturalHeight || im.height, r = Math.min(1, max / Math.max(w, h)), c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * r)); c.height = Math.max(1, Math.round(h * r));
  c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
  return c;
}
/* skala abu-abu + regangkan kontras (persentil 2%/98%) supaya huruf KTP yang pudar lebih mudah dibaca */
function prep(src) {
  var s = Math.max(1, Math.min(2, 1600 / src.width)), c = document.createElement("canvas");
  c.width = Math.round(src.width * s); c.height = Math.round(src.height * s);
  var x = c.getContext("2d"); x.drawImage(src, 0, 0, c.width, c.height);
  var d = x.getImageData(0, 0, c.width, c.height), a = d.data, h = new Uint32Array(256), n = c.width * c.height, i, g, lo = 0, hi = 255, acc = 0;
  for (i = 0; i < a.length; i += 4) { g = (a[i] * .299 + a[i + 1] * .587 + a[i + 2] * .114) | 0; a[i] = a[i + 1] = a[i + 2] = g; h[g]++ }
  for (i = 0; i < 256; i++) { acc += h[i]; if (acc > n * .02) { lo = i; break } }
  acc = 0; for (i = 255; i >= 0; i--) { acc += h[i]; if (acc > n * .02) { hi = i; break } }
  var rg = Math.max(1, hi - lo);
  for (i = 0; i < a.length; i += 4) { g = Math.max(0, Math.min(255, ((a[i] - lo) * 255 / rg) | 0)); a[i] = a[i + 1] = a[i + 2] = g }
  x.putImageData(d, 0, 0);
  return c;
}
function apply(n, k) {
  var set = function (f, val) { if (val) $("p" + n + "_" + f).value = val };
  set("nama", k.nama); set("nik", k.nik); set("tempat", k.tempat); set("lahir", k.lahir); set("alamat", k.alamatFull);
  var note = k.found >= 4 ? tr("tkj_ocr_done") : tr("tkj_ocr_partial");
  if (k.nikMismatch) note += " " + tr("tkj_nik_mismatch");
  ocrNote(n, note, k.found >= 4 && !k.nikMismatch ? "ok" : "warn");
  render();
}
function ocr(n, src) {
  setProg(n, 4, tr("tkj_ocr_loading"));
  return lib("tess").then(function () {
    return Tesseract.createWorker("ind", 1, { logger: function (m) { if (m && m.status === "recognizing text") { var p = Math.round(m.progress * 100); setProg(n, Math.max(6, p), tr("tkj_ocr_progress", { p: p })) } } });
  }).then(function (w) {
    return w.recognize(prep(src)).then(function (r) { return w.terminate().then(function () { return r.data.text }) });
  }).then(function (text) {
    var k = C.parseKtp(text);
    if (!k.found) ocrNote(n, tr("tkj_ocr_fail"), "warn"); else apply(n, k);
  }).catch(function () { ocrNote(n, tr("tkj_ocr_fail"), "warn") }).then(function () { setProg(n, null) });
}
function onFile(n, input) {
  var f = input.files && input.files[0];
  if (!f) return;
  if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { toast(tr("tkj_file_type")); input.value = ""; return }
  if (f.size > 10 * 1048576) { toast(tr("tkj_file_big")); input.value = ""; return }
  if (!$("tk_ok").checked) { toast(tr("tkj_need_consent")); input.value = ""; $("tk_ok").focus(); return }
  loadImg(f).then(function (im) {
    var src = toCanvas(im, 1600), pv = $("p" + n + "_pv");
    st.img[n] = src;
    pv.style.backgroundImage = "url('" + toCanvas(im, 420).toDataURL("image/jpeg", .7) + "')";
    pv.classList.add("has"); pv.textContent = ""; $("p" + n + "_rm").hidden = false;
    return ocr(n, src);
  }).catch(function () { toast(tr("tkj_file_type")) });
}
function dropImg(n) {
  st.img[n] = null; var pv = $("p" + n + "_pv");
  pv.style.backgroundImage = ""; pv.classList.remove("has"); pv.textContent = pv.dataset.t || "";
  $("p" + n + "_file").value = ""; $("p" + n + "_rm").hidden = true; ocrNote(n, ""); setProg(n, null);
}

/* ---------- lampiran KTP + watermark ---------- */
function wmText() { var e = curEv(); return (st.lang === "en" ? "FOR TICKET TRANSFER ONLY" : "HANYA UNTUK PINDAH TIKET") + " · " + String(e.title || "").toUpperCase().slice(0, 36) + " · " + C.fmtDate(v("tk_date") || C.today(), st.lang) }
function watermark(src) {
  var r = Math.min(1, 1300 / src.width), c = document.createElement("canvas"), t = wmText();
  c.width = Math.round(src.width * r); c.height = Math.round(src.height * r);
  var x = c.getContext("2d"); x.drawImage(src, 0, 0, c.width, c.height);
  x.save(); x.fillStyle = "rgba(200,20,20,.34)"; x.font = "bold " + Math.round(c.width / 30) + "px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
  x.translate(c.width / 2, c.height / 2); x.rotate(-Math.PI / 7);
  var step = Math.round(c.width / 6.5), i;
  for (i = -8; i <= 8; i++) x.fillText(t, 0, i * step * .7);
  x.restore();
  return { url: c.toDataURL("image/jpeg", .85), w: c.width, h: c.height };
}
function attachments() {
  if (!$("tk_attach").checked) return [];
  var A = C.attachLabels(st.lang), out = [];
  [1, 2].forEach(function (n) { if (st.img[n]) out.push({ cap: n === 1 ? A.c1 : A.c2, img: watermark(st.img[n]) }) });
  return out;
}

/* ---------- unduh ---------- */
function save(blob, name) {
  var a = document.createElement("a"), u = URL.createObjectURL(blob);
  a.href = u; a.download = name; a.rel = "noopener"; document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(u); a.remove() }, 4000);
}
function guard() {
  var e = C.validate(collect()), box = $("tkErr");
  if (!e.length) { box.hidden = true; return true }
  box.hidden = false; box.textContent = e.map(function (k) { return tr("tkj_val_" + k) }).join(" ");
  var f = $(FIELD[e[0]] || ""); if (f && f.focus) { f.scrollIntoView({ block: "center", behavior: "smooth" }); try { f.focus({ preventScroll: true }) } catch (x) { f.focus() } }
  return false;
}
function busy(on, label) {
  st.busy = on; ["dlPdf", "dlDocx", "dlTxt", "dlPrint"].forEach(function (i) { $(i).disabled = on });
  $("tkStat").textContent = label || "";
}
function safe(s) { return String(s == null ? "" : s).replace(/…/g, "...").replace(/[–—]/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, '"') }

function makePdf(model, atts) {
  var P = new window.jspdf.jsPDF({ unit: "mm", format: "a4" }), M = 22, MV = 18, CW = 210 - 2 * M, y = MV, LH = 4.9;
  function need(h) { if (y + h > 297 - MV) { P.addPage(); y = MV } }
  function setF(style, size) { P.setFont("times", style); P.setFontSize(size) }
  setF("normal", 10.5);
  model.forEach(function (b) {
    var ls, i;
    if (b.t === "title") {
      setF("bold", 13); need(14); P.text(safe(b.text), 105, y, { align: "center" });
      var w = P.getTextWidth(safe(b.text)); P.setLineWidth(.3); P.line(105 - w / 2, y + 1.2, 105 + w / 2, y + 1.2); y += 9; setF("normal", 10.5);
    } else if (b.t === "p") {
      ls = P.splitTextToSize(safe(b.text), CW); need(ls.length * LH + 1.5); P.text(ls, M, y); y += ls.length * LH + 1.5;
    } else if (b.t === "kv") {
      b.rows.forEach(function (r) {
        var vs = P.splitTextToSize(": " + safe(r[1]), CW - 56); need(Math.max(1, vs.length) * LH);
        P.text(safe(r[0]), M + 4, y); P.text(vs, M + 54, y); y += Math.max(1, vs.length) * LH;
      }); y += 1.5;
    } else if (b.t === "ol") {
      b.items.forEach(function (x, k) { ls = P.splitTextToSize(safe(x), CW - 8); need(ls.length * LH); P.text((k + 1) + ".", M + 2, y); P.text(ls, M + 8, y); y += ls.length * LH + 1 }); y += 1.5;
    } else if (b.t === "place") {
      need(10); y += 2; P.text(safe(b.text), M + CW, y, { align: "right" }); y += 8;
    } else if (b.t === "sign") {
      need(46);
      var c1 = M + CW * .25, c2 = M + CW * .75, ny = y + 29;
      P.text(safe(b.left.role), c1, y, { align: "center" }); P.text(safe(b.right.role), c2, y, { align: "center" });
      if (b.left.stamp) {
        P.setDrawColor(150); if (P.setLineDashPattern) P.setLineDashPattern([1.2, 1.2], 0);
        P.rect(c1 - 18, y + 3.5, 36, 19); if (P.setLineDashPattern) P.setLineDashPattern([], 0);
        P.setFontSize(8); P.setTextColor(120); P.text(safe(b.left.stamp), c1, y + 14, { align: "center" }); P.setTextColor(0); P.setFontSize(10.5);
      }
      setF("bold", 10.5);
      [[b.left.name, c1], [b.right.name, c2]].forEach(function (p) {
        var t = safe(p[0]), w = P.getTextWidth(t); P.text(t, p[1], ny, { align: "center" }); P.setLineWidth(.25); P.line(p[1] - w / 2, ny + 1, p[1] + w / 2, ny + 1);
      });
      setF("normal", 10.5); y = ny + 8;
    } else if (b.t === "note") {
      need(26); P.setTextColor(90); setF("bold", 8.5); P.text(safe(b.title) + ":", M, y); y += 4; setF("normal", 8.5);
      b.items.forEach(function (x, k) { ls = P.splitTextToSize((k + 1) + ". " + safe(x), CW); need(ls.length * 3.8); P.text(ls, M, y); y += ls.length * 3.8 });
      P.setTextColor(0); setF("normal", 10.5);
    }
  });
  var A = C.attachLabels(st.lang);
  atts.forEach(function (a) {
    P.addPage(); setF("bold", 13); P.text(safe(A.h), 105, MV, { align: "center" }); setF("normal", 10.5); P.text(safe(a.cap), 105, MV + 8, { align: "center" });
    var w = CW, h = w * a.img.h / a.img.w; if (h > 170) { h = 170; w = h * a.img.w / a.img.h }
    P.addImage(a.img.url, "JPEG", 105 - w / 2, MV + 14, w, h);
  });
  return P.output("blob");
}

function bytes(u) { var b = atob(u.split(",")[1]), a = new Uint8Array(b.length), i; for (i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a }
function makeDocx(model, atts) {
  var D = window.docx, NB = { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" }, CB = { top: NB, bottom: NB, left: NB, right: NB }, TB = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };
  var kids = [], FULL = 9638;
  function para(text, o) { o = o || {}; return new D.Paragraph({ alignment: o.al, spacing: { after: o.after == null ? 120 : o.after, before: o.before || 0, line: 264, lineRule: D.LineRuleType ? D.LineRuleType.AUTO : undefined }, indent: o.indent, tabStops: o.tabs, pageBreakBefore: o.pb, keepNext: o.keep, children: [new D.TextRun({ text: String(text), bold: o.b, italics: o.i, size: o.size, color: o.color, underline: o.u ? {} : undefined })] }) }
  function cell(children, w) { return new D.TableCell({ width: { size: w, type: D.WidthType.DXA }, borders: CB, children: children }) }
  model.forEach(function (b) {
    if (b.t === "title") kids.push(para(b.text, { al: D.AlignmentType.CENTER, b: true, size: 26, u: true, after: 240 }));
    else if (b.t === "p") kids.push(para(b.text, { al: D.AlignmentType.JUSTIFIED }));
    else if (b.t === "kv") kids.push(new D.Table({ width: { size: FULL - 360, type: D.WidthType.DXA }, columnWidths: [2900, FULL - 360 - 2900], indent: { size: 360, type: D.WidthType.DXA }, borders: TB, rows: b.rows.map(function (r) { return new D.TableRow({ children: [cell([para(r[0], { after: 10 })], 2900), cell([para(": " + r[1], { after: 10 })], FULL - 360 - 2900)] }) }) }), para("", { after: 0, size: 8 }));
    else if (b.t === "ol") b.items.forEach(function (x, k) { kids.push(para((k + 1) + ".\t" + x, { al: D.AlignmentType.JUSTIFIED, indent: { left: 420, hanging: 420 }, tabs: [{ type: D.TabStopType.LEFT, position: 420 }], after: 60 })) });
    else if (b.t === "place") kids.push(para(b.text, { al: D.AlignmentType.RIGHT, before: 120, after: 120, keep: true }));
    else if (b.t === "sign") {
      var half = Math.floor(FULL / 2), C_ = D.AlignmentType.CENTER;
      kids.push(new D.Table({ width: { size: FULL, type: D.WidthType.DXA }, columnWidths: [half, FULL - half], borders: TB, rows: [new D.TableRow({ cantSplit: true, children: [
        cell([para(b.left.role, { al: C_ }), para(b.left.stamp || "", { al: C_, i: true, size: 16, color: "777777", before: 120, after: 420 }), para(b.left.name, { al: C_, b: true, u: true })], half),
        cell([para(b.right.role, { al: C_ }), para("\u00a0", { al: C_, size: 16, before: 120, after: 420 }), para(b.right.name, { al: C_, b: true, u: true })], FULL - half)] })] }));
    } else if (b.t === "note") {
      kids.push(para(b.title + ":", { b: true, size: 17, color: "555555", before: 200, after: 30 }));
      b.items.forEach(function (x, k) { kids.push(para((k + 1) + ". " + x, { size: 17, color: "555555", after: 10 })) });
    }
  });
  var A = C.attachLabels(st.lang);
  atts.forEach(function (a) {
    var w = 540, h = Math.round(w * a.img.h / a.img.w); if (h > 640) { h = 640; w = Math.round(h * a.img.w / a.img.h) }
    kids.push(para(A.h, { al: D.AlignmentType.CENTER, b: true, size: 26, pb: true }), para(a.cap, { al: D.AlignmentType.CENTER, after: 200 }));
    kids.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.ImageRun({ type: "jpg", data: bytes(a.img.url), transformation: { width: w, height: h } })] }));
  });
  var d = new D.Document({ creator: "GoWithDME", title: model[0].text, styles: { default: { document: { run: { font: "Times New Roman", size: 22 } } } },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, bottom: 1000, left: 1134, right: 1134 } } }, children: kids }] });
  return D.Packer.toBlob(d);
}

function run(kind) {
  if (st.busy || !guard()) return;
  var model = doc(), name = function (ext) { return C.fileName(st.kind, curEv(), ext) };
  if (kind === "txt") { save(new Blob(["\ufeff" + C.toText(model)], { type: "text/plain;charset=utf-8" }), name("txt")); toast(tr("tkj_dl_ok")); return }
  if (kind === "print") {
    document.body.classList.add("tk-printing");
    var off = function () { document.body.classList.remove("tk-printing"); window.removeEventListener("afterprint", off) };
    window.addEventListener("afterprint", off); setTimeout(off, 60000); window.print(); return;
  }
  busy(true, tr("tkj_building"));
  lib(kind === "pdf" ? "jspdf" : "docx").then(function () {
    var atts = attachments();
    return kind === "pdf" ? makePdf(model, atts) : makeDocx(model, atts);
  }).then(function (blob) { save(blob, name(kind === "pdf" ? "pdf" : "docx")); busy(false, tr("tkj_dl_ok")) })
    .catch(function (e) { busy(false, ""); toast(e && e.message === "lib" ? tr("tkj_lib_fail") : tr("tkj_build_fail")); if (window.console) console.error(e) });
}

function resetAll() {
  $("tkForm").reset(); st.raw = null; st.kind = "kuasa";
  [1, 2].forEach(function (n) { dropImg(n); $("p" + n + "_nikh").hidden = true });
  $("tk_date").value = C.today(); $("tk_qty").value = "1";
  [].forEach.call(document.querySelectorAll("#tkKind button"), function (b) { b.classList.toggle("on", b.dataset.kind === "kuasa") });
  $("tkKindD").textContent = tr("tkj_kd_kuasa"); $("tkErr").hidden = true; paintSel(); renderList(); paint(); toast(tr("tkj_cleared"));
}

/* ---------- pasang ---------- */
function init(me) {
  $("tk_date").value = C.today();
  if (me && me.user && me.user.email) $("p1_email").value = me.user.email;
  [1, 2].forEach(function (n) { var pv = $("p" + n + "_pv"); pv.dataset.t = pv.textContent });
  $("tkKindD").textContent = tr("tkj_kd_kuasa");
  [].forEach.call(document.querySelectorAll("#tkLang button"), function (b) { b.classList.toggle("on", b.dataset.lang === st.lang) });
  $("tkKind").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-kind]"); if (!b) return;
    st.kind = b.dataset.kind; [].forEach.call($("tkKind").children, function (x) { x.classList.toggle("on", x === b) });
    $("tkKindD").textContent = tr("tkj_kd_" + st.kind); render();
  });
  $("tkLang").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-lang]"); if (!b) return;
    st.lang = b.dataset.lang; [].forEach.call($("tkLang").children, function (x) { x.classList.toggle("on", x === b) });
    renderList(); paintSel(); render();
  });
  $("tkEvQ").addEventListener("input", renderList);
  $("tkEvList").addEventListener("click", function (e) { var b = e.target.closest(".tk-ev"); if (b && st.shown[+b.dataset.i]) pickEvent(st.shown[+b.dataset.i]) });
  $("tkEvSel").addEventListener("click", function (e) { if (e.target.id === "tkEvChg") { st.raw = null; paintSel(); render(); $("tkEvQ").focus() } });
  [1, 2].forEach(function (n) {
    $("p" + n + "_file").addEventListener("change", function () { onFile(n, this) });
    $("p" + n + "_rm").addEventListener("click", function () { dropImg(n) });
    $("p" + n + "_nik").addEventListener("input", function () { var d = this.value.replace(/\D/g, "").slice(0, 16); if (d !== this.value) this.value = d });
    var pv = $("p" + n + "_pv");
    pv.addEventListener("dragover", function (e) { e.preventDefault(); pv.classList.add("over") });
    pv.addEventListener("dragleave", function () { pv.classList.remove("over") });
    pv.addEventListener("drop", function (e) { e.preventDefault(); pv.classList.remove("over"); var f = e.dataTransfer && e.dataTransfer.files; if (f && f[0]) { var inp = $("p" + n + "_file"); try { inp.files = f } catch (x) { } onFile(n, inp) } });
  });
  $("tkForm").addEventListener("input", render); $("tkForm").addEventListener("change", render);
  $("dlPdf").onclick = function () { run("pdf") }; $("dlDocx").onclick = function () { run("docx") };
  $("dlTxt").onclick = function () { run("txt") }; $("dlPrint").onclick = function () { run("print") };
  $("tkClear").onclick = resetAll;
  loadEvents(); paint();
}

getMe().then(function (m) {
  $("guest").hidden = !!m; $("wrap").hidden = !m;
  $("tkLogin").href = "login?next=" + encodeURIComponent("tiket" + location.search);
  if (m) init(m);
}).catch(function () { $("guest").hidden = false });
})();
