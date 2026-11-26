#!/usr/bin/env python3
# Penambal repo utama (gowithdme) setelah Direktori Artis pindah ke artis.gowithdme.com.
# Jalankan SEKALI dari akar repo, SETELAH repo gowithdme-artis hidup dan DNS-nya aktif:
#     python3 tools/terapkan_artis.py            # menerapkan
#     python3 tools/terapkan_artis.py --cek      # hanya memeriksa, tidak mengubah apa pun
# Sengaja berupa penambal (bukan file pengganti) supaya perubahan lain di build.py, 404.html, dan menu
# (mis. dari pindah blog) tidak tertimpa. Aman diulang: bagian yang sudah diterapkan dilewati.
# Bila ada bagian yang tidak cocok, skrip berhenti SEBELUM menulis apa pun dan menyebut bagian mana.
import os,re,sys
ROOT=os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),".."))
CEK="--cek" in sys.argv
ARTIS="https://artis.gowithdme.com"
def rd(p): return open(f"{ROOT}/{p}",encoding="utf-8").read()
changes={}   # path -> isi baru
notes=[]
def once(s,old,new,what):
    c=s.count(old)
    if c!=1: sys.exit(f"BERHENTI: bagian '{what}' ditemukan {c}x di berkas (seharusnya 1x). Tidak ada yang diubah. Kirim berkas itu ke Claude untuk disesuaikan.")
    return s.replace(old,new)

# ---------- 1. tools/build.py ----------
p="tools/build.py"
if not os.path.exists(f"{ROOT}/{p}") or not os.path.exists(f"{ROOT}/tools/artis_pengalih.py"):
    sys.exit("BERHENTI: jalankan dari repo gowithdme dan pastikan tools/artis_pengalih.py sudah ada (dari zip overlay).")
s=rd(p)
if "ARTIS_BASE" in s: notes.append(f"{p}: sudah diterapkan, dilewati")
else:
    # a. konstanta + impor, tepat sebelum ARTISTS={}
    m=re.findall(r'^ARTISTS=\{\}.*$',s,re.M)
    if len(m)!=1: sys.exit("BERHENTI: baris 'ARTISTS={}' tidak ditemukan tepat 1x di tools/build.py.")
    s=s.replace(m[0],'''# Direktori Artis sudah pindah ke repo gowithdme-artis (artis.gowithdme.com). Di sini hanya tersisa logika nama -> slug
# (dipakai untuk menaut line-up di halaman event dan oleh guide.related). Bagian ini HARUS sama dengan tools/build.py di repo artis.
ARTIS_BASE=os.environ.get("GWM_ARTIS","https://artis.gowithdme.com").rstrip("/")
ARTIS_PENGALIH=True   # tulis halaman pengalih id/a dan en/a; ubah ke False beberapa bulan setelah pindah (folder itu dihapus saat build)
import artis_pengalih as AP
'''+m[0],1)
    # b. tautan line-up di halaman event
    s=once(s,'''parts.append(f'<a href="../a/{esc(a["slug"])}">{esc(n)}</a>' if a else esc(n))''',
             '''parts.append(f'<a href="{ARTIS_BASE}/{l}/{esc(a["slug"])}">{esc(n)}</a>' if a else esc(n))''',"tautan line-up (lineup_html)")
    # c. buang pembuat halaman artis (pindah ke repo artis)
    a0=s.find("# ---- halaman artis: status event dihitung dari tanggal hari ini (WIB)")
    mk='ART_CSS=_read_src("artist-page.css"); ART_JS=_read_src("artist-page.js")'
    a1=s.find(mk)
    if a0<0 or a1<0 or s.count(mk)!=1 or s.count("# ---- halaman artis: status event dihitung")!=1 or a1<a0: sys.exit("BERHENTI: batas blok pembuat halaman artis tidak ditemukan di tools/build.py.")
    s=s[:a0]+s[a1+len(mk):].lstrip("\n")
    # d. ganti penulisan halaman artis dengan pengalih
    s=once(s,'''    os.makedirs(f"{ROOT}/{l}/a",exist_ok=True)
    for f in os.listdir(f"{ROOT}/{l}/a"): os.remove(f"{ROOT}/{l}/a/{f}")
    for a in ARTISTS.values(): open(f"{ROOT}/{l}/a/{a['slug']}.html","w",encoding="utf-8").write(artist_page(l,a))
    open(f"{ROOT}/{l}/a/index.html","w",encoding="utf-8").write(artist_index(l))
''','''    AP.tulis(ROOT,l,ARTISTS,ARTIS_BASE,ARTIS_PENGALIH)  # halaman lama /<bahasa>/a/... -> pengalih ke artis.gowithdme.com
''',"penulisan halaman artis")
    # e. sitemap utama tidak lagi memuat halaman artis (sitemap-nya ada di repo artis)
    s=once(s,'''for a in ARTISTS.values():
    if all((x.get("end_date") or x["event_date"])[:10]<_OLD for x in a["events"]): continue
    alt="".join(f'<xhtml:link rel="alternate" hreflang="{x}" href="{BASE}/{x}/a/{a["slug"]}"/>' for x in LANGS)
    lm=max((x.get("created_at") or x["event_date"])[:10] for x in a["events"])
    for l in LANGS: rows.append(f"<url><loc>{BASE}/{l}/a/{a['slug']}</loc><lastmod>{lm}</lastmod>{alt}</url>")
''','',"baris sitemap artis")
    try: compile(s,p,"exec")
    except SyntaxError as e: sys.exit(f"BERHENTI: hasil tambalan tools/build.py tidak valid ({e}). Tidak ada yang diubah.")
    changes[p]=s; notes.append(f"{p}: halaman artis dibuang, tautan line-up ke {ARTIS}, pengalih ditambahkan, sitemap dibersihkan")

# ---------- 2. tautan menu dan footer ----------
n_link=0
for f in sorted(os.listdir(f"{ROOT}/src")):
    if not f.endswith(".html"): continue
    t=rd("src/"+f)
    if 'href="a/"' in t:
        k=t.count('href="a/"'); n_link+=k
        changes["src/"+f]=t.replace('href="a/"',f'href="{ARTIS}/{{{{lang}}}}/"')
if n_link: notes.append(f"src/*.html: {n_link} tautan 'a/' diganti ke {ARTIS}/<bahasa>/")
else: notes.append("src/*.html: tidak ada tautan 'a/' tersisa, dilewati")

# ---------- 3. 404.html: teruskan alamat artis lama yang tidak punya pengalih ----------
SNIP='''<script>/*artis-pindah*/(function(){var m=location.pathname.match(/\\/(id|en)\\/a(?:\\/([a-z0-9-]*))?\\/?$/);if(m)location.replace("https://artis.gowithdme.com/"+m[1]+"/"+(m[2]&&m[2]!=="index"?m[2]:"")+location.search+location.hash)})()</script>'''
if os.path.exists(f"{ROOT}/404.html"):
    t=rd("404.html")
    if "artis-pindah" in t: notes.append("404.html: sudah diterapkan, dilewati")
    elif t.count("</head>")>=1:
        changes["404.html"]=t.replace("</head>",SNIP+"</head>",1); notes.append("404.html: penerus alamat artis lama ditambahkan")
    else: sys.exit("BERHENTI: 404.html tidak punya </head>.")
else: notes.append("404.html: tidak ada, dilewati")

print("\n".join(("[cek] " if CEK else "")+x for x in notes))
if CEK: print("Mode --cek: tidak ada berkas yang diubah."); sys.exit(0)
for k,v in changes.items():
    with open(f"{ROOT}/{k}","w",encoding="utf-8") as f: f.write(v)
print(f"Selesai: {len(changes)} berkas diubah.")
print("Langkah berikut:  python3 tools/build.py   lalu commit dan push (lihat PANDUAN-PINDAH-ARTIS.md).")
unused=[x for x in ("src/artist-page.css","src/artist-page.js","src/artists-index.css","src/artists-index.js","tests/artist-page.test.mjs") if os.path.exists(f"{ROOT}/{x}")]
if unused: print("Sudah tidak dipakai di repo ini (sekarang ada di repo artis), boleh dihapus SETELAH repo artis terbukti jalan:\n  git rm "+" ".join(unused))
