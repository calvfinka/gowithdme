# Membuat css/dsk.css: salinan semua blok @media (max-width:...) untuk mode "situs desktop" di HP.
# Di mode itu browser melaporkan lebar ±980px padahal layarnya kecil; js/adaptive.js memberi <html data-dsk> dan
# memperbesar isi halaman sampai selebar ±400px. Salinan ini (selektor diawali html[data-dsk]) membuat tata letaknya
# sama dengan HP. Dipanggil otomatis oleh tools/build.py. Jangan edit css/dsk.css dengan tangan.
import re, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES = ["style.css", "adaptive.css", "naver.css", "panel.css", "portal-pro.css", "balance.css"]
MAXW = 1100

def strip_comments(s):
    return re.sub(r"/\*.*?\*/", "", s, flags=re.S)

def match_brace(s, i):  # s[i] == "{" ; kembalikan indeks "}" pasangannya
    d = 0
    for j in range(i, len(s)):
        c = s[j]
        if c == "{": d += 1
        elif c == "}":
            d -= 1
            if d == 0: return j
    raise ValueError("kurung tidak seimbang")

def top_blocks(s):  # [(prelude, inner)] pada tingkat atas
    out, i, n = [], 0, len(s)
    while i < n:
        k = s.find("{", i)
        if k < 0: break
        pre = s[i:k].strip()
        e = match_brace(s, k)
        out.append((pre, s[k + 1:e]))
        i = e + 1
    return out

def split_top(sel):  # pisah koma di luar kurung
    parts, d, cur = [], 0, ""
    for c in sel:
        if c in "([": d += 1
        elif c in ")]": d -= 1
        if c == "," and d == 0: parts.append(cur); cur = ""
        else: cur += c
    parts.append(cur)
    return [p.strip() for p in parts if p.strip()]

def prefix(sel):
    # :where() = tanpa tambahan bobot selektor, jadi urutan/bobot cascade sama persis dengan aturan HP aslinya
    if sel.startswith("html"): return "html:where([data-dsk])" + sel[4:]
    if sel.startswith(":root"): return "html:where([data-dsk])" + sel[5:]
    return "html:where([data-dsk]) " + sel

def convert(inner):
    res = []
    for pre, body in top_blocks(inner):
        if pre.startswith("@"):  # blok bersarang (mis. @keyframes): dilewati
            continue
        res.append(",".join(prefix(x) for x in split_top(pre)) + "{" + body.strip() + "}")
    return res

HEAD = "/* Dibuat oleh tools/gen_dsk.py. Jangan edit tangan. Tata letak HP untuk mode \"situs desktop\" (html[data-dsk]). */"
def build(files):
    out = [HEAD]
    for f in files:
        s = strip_comments(open(os.path.join(ROOT, "css", f), encoding="utf-8").read())
        for pre, inner in top_blocks(s):
            m = re.fullmatch(r"@media\s*\(\s*max-width\s*:\s*(\d+)px\s*\)", pre)
            if not m or int(m.group(1)) > MAXW: continue
            rules = convert(inner)
            if rules: out.append("/* " + f + " @" + m.group(1) + " */\n" + "\n".join(rules))
    return out
out = build(FILES[:4])
out.insert(1, "html[data-dsk] body{zoom:var(--dz)}")
# aturan ≥1001px yang bocor bila halaman dilaporkan sangat lebar (mis. 1280px): kembalikan ke bentuk HP
out.append("""/* bocoran aturan PC */
html[data-dsk] .pnav{display:none}
html[data-dsk] .topbar{grid-template-columns:auto minmax(0,1fr) auto}
html[data-dsk] .tb-svc{display:none}
html[data-dsk] .shell{grid-template-columns:1fr}
html[data-dsk] .side{display:none}
html[data-dsk] .main{padding:16px var(--gx) 32px}
html[data-dsk] .nv-home .main{padding-top:6px}
html[data-dsk] .nv-feed .tiles,html[data-dsk] .tiles{grid-template-columns:repeat(2,minmax(0,1fr))}
html[data-dsk] .nv-apps-in{grid-template-columns:none}
html[data-dsk] .head h1,html[data-dsk] .head h2{font-size:var(--fs-pg)}
html[data-dsk] .khero h1{font-size:clamp(24px,calc(16px + 2*var(--vw)),32px)}
html[data-dsk] body{font-size:14px}
html[data-dsk] .tt{font-size:var(--fs-s)}html[data-dsk] .tm{font-size:var(--fs-xs)}""")
open(os.path.join(ROOT, "css", "dsk.css"), "w", encoding="utf-8").write("\n".join(out) + "\n")
ob = build(FILES[4:])
open(os.path.join(ROOT, "css", "dsk-b.css"), "w", encoding="utf-8").write("\n".join(ob) + "\n")
print("dsk.css:", len("\n".join(out)), "byte; dsk-b.css:", len("\n".join(ob)), "byte")
