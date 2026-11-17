# Bangun situs dua bahasa: src/*.html + tools/strings.py  ->  id/*.html, en/*.html, js/i18n.js, dan pengalih bahasa di root.
# Jalankan: python3 tools/build.py
import os,re,json,sys,time
sys.path.insert(0,os.path.dirname(__file__))
from strings import S,J,PROV_EN
ROOT=os.path.join(os.path.dirname(__file__),"..")
# Alamat situs untuk canonical, hreflang, dan sitemap. Saat ini situs hidup di GitHub Pages.
# Setelah domain .com aktif:  GWM_SITE=https://gowithdme.com python3 tools/build.py
BASE=os.environ.get("GWM_SITE","https://calvfinka.github.io/gowithdme").rstrip("/")
VER=time.strftime("%Y%m%d%H%M")
LANGS=["id","en"]; IDX={"id":0,"en":1}
PAGES=["index","event","gunung","login","privacy","terms","ajukan","komunitas","profil","bantuan","pesan"]
NOINDEX=("login","ajukan","profil","pesan")  # halaman formulir: tidak diindeks, tanpa hreflang, tidak masuk sitemap
APP=("index","event","gunung")  # halaman dengan sidebar, pencarian, jam, dan cuaca
def path(p): return "" if p=="index" else p
def inc(h):
    # sisipkan potongan bersama: {{>nama}} -> src/_nama.html (boleh bersarang)
    while re.search(r"\{\{>(\w+)\}\}",h):
        h=re.sub(r"\{\{>(\w+)\}\}",lambda m:open(f"{ROOT}/src/_{m.group(1)}.html",encoding="utf-8").read(),h)
    return h
# ---- js/i18n.js ----
dic={l:{k:v[IDX[l]] for k,v in J.items()} for l in LANGS}
js='''/* Dibuat oleh tools/build.py dari tools/strings.py. Jangan edit tangan. */
(function(){
var L=document.documentElement.lang==="en"?"en":"id";
var D=%s,PROV=%s;
window.IB_LANG=L;
window.IB_T=function(k,a){var s=D[L][k];if(s==null)s=D.id[k];if(s==null)return k;
  return a?s.replace(/\\{(\\w+)\\}/g,function(m,x){return a[x]!=null?a[x]:m}):s};
window.IB_PROV=function(p){return L==="en"&&PROV[p]||p};
try{localStorage.setItem("ib_lang",L)}catch(e){}
[].forEach.call(document.querySelectorAll("a.lang"),function(a){
  a.href+=location.search;
  a.addEventListener("click",function(){try{localStorage.setItem("ib_lang",a.dataset.sw)}catch(e){}});
});
})();
''' % (json.dumps(dic,ensure_ascii=False),json.dumps(PROV_EN,ensure_ascii=False))
open(ROOT+"/js/i18n.js","w",encoding="utf-8").write(js)
# ---- js/search-index.js: indeks statis untuk pencarian (halaman, kategori, FAQ). Dua bahasa dicari sekaligus. ----
def plain(t): return re.sub(r"\s+"," ",re.sub(r"<[^>]+>","",t).replace("&amp;","&").replace("&nbsp;"," ")).strip()
# (kunci, tujuan, kunci judul di J, jenis, kata kunci tambahan ID+EN)
SX_PAGES=[
 ("home","./","sx_p_home","page","beranda home utama awal sedang berlangsung live"),
 ("events","event","sx_p_events","page","semua event acara kalender daftar all events calendar"),
 ("hike","gunung","sx_p_mtn","page","naik gunung pendakian hiking open trip checklist packing patungan kalkulator"),
 ("invite","event?ajakan=1","sx_p_invite","page","ajakan barengan teman bareng cari teman meet up invite buddy gabung join"),
 ("comm","komunitas","sx_p_comm","page","komunitas forum diskusi grup whatsapp telegram discord community"),
 ("submit","ajukan","sx_p_submit","page","ajukan pengajuan tambah event buat open trip poster submit create host"),
 ("help","bantuan","sx_p_help","page","bantuan faq tanya jawab pertanyaan help support"),
 ("contact","bantuan#kontak","sx_p_contact","page","kontak hubungi email whatsapp wa laporan lapor contact report"),
 ("terms","terms","sx_p_terms","page","syarat ketentuan aturan terms conditions rules"),
 ("privacy","privacy","sx_p_privacy","page","privasi kebijakan data pribadi pdp lokasi privacy policy personal data"),
 ("login","login","sx_p_login","page","masuk login daftar register sign up akun google password lupa"),
 ("profile","profil","sx_p_profile","page","profil profile akun edit nama panggilan nickname kota bio foto pengunjung"),
 ("msgs","pesan","sx_p_msgs","page","pesan chat dm inbox voice note gambar kirim pesan message messages"),
 ("saved","event?kat=tersimpan","sx_p_saved","cat","tersimpan favorit simpan saved bookmark"),
 ("done","event?kat=selesai","sx_p_done","cat","selesai lewat arsip riwayat ended past archive"),
 ("concert","event?kat=konser","sx_p_concert","cat","konser musik festival gig live concert music"),
 ("expo","event?kat=pameran","sx_p_expo","cat","pameran expo exhibition seni art"),
 ("hiking","gunung","sx_p_hike","cat","naik gunung pendakian trekking camping hiking mountain open trip"),
]
sx={"pages":[{"k":k,"h":h,"t":[J[tk][0],J[tk][1]],"type":ty,"kw":kw} for k,h,tk,ty,kw in SX_PAGES],
    "faq":[{"n":n,"q":[plain(S[f"fq{n}_q"][0]),plain(S[f"fq{n}_q"][1])],"a":[plain(S[f"fq{n}_a"][0]),plain(S[f"fq{n}_a"][1])]} for n in range(1,14)]}
sx["prov"]=PROV_EN
open(ROOT+"/js/search-index.js","w",encoding="utf-8").write("/* Dibuat oleh tools/build.py dari tools/strings.py. Jangan edit tangan. */\nwindow.IB_SX="+json.dumps(sx,ensure_ascii=False)+";\n")
# ---- halaman per bahasa ----
for l in LANGS:
    o="en" if l=="id" else "id"
    os.makedirs(f"{ROOT}/{l}",exist_ok=True)
    for p in PAGES:
        h=inc(open(f"{ROOT}/src/{p}.html",encoding="utf-8").read())
        h=h.replace("{{search}}",inc("{{>search}}"))
        h=h.replace("{{pgshare}}",'<button class="ico-btn sh" id="pgShare" type="button" aria-label="{{sh_aria}}"><svg class="i" aria-hidden="true"><use href="#i-share"/></svg></button>' if p in APP else "")
        h=h.replace("{{auth}}",'<a class="btn pri" id="login" href="login">{{login_btn}}</a>' if p in APP else '<a class="btn line" href="./">{{back_home}}</a>')
        if p in("privacy","terms"): h=h.replace("{{body}}",open(f"{ROOT}/src/{p}.{l}.body.html",encoding="utf-8").read())
        sw=f'<a class="lang" href="../{o}/{path(p)}" data-sw="{o}" hreflang="{o}" lang="{o}" aria-label="{S["lang_label"][IDX[l]]}">{o.upper()}</a>'
        hl="" if p in NOINDEX else (f'<link rel="canonical" href="{BASE}/{l}/{path(p)}">'
            +"".join(f'<link rel="alternate" hreflang="{x}" href="{BASE}/{x}/{path(p)}">' for x in LANGS)
            +f'<link rel="alternate" hreflang="x-default" href="{BASE}/id/{path(p)}">')
        h=h.replace("{{lang}}",l).replace("{{switch}}",sw).replace("{{hreflang}}",hl).replace("{{og_img}}",f"{BASE}/assets/og-image{'' if l=='id' else '-en'}.png")
        h=re.sub(r"\{\{(\w+)\}\}",lambda m:S[m.group(1)][IDX[l]],h)
        assert "{{" not in h,(l,p)
        need=[x for x in ("i18n","config","regions","gunung-data","search-index","search","navauth") if f"../js/{x}.js" not in h]
        h=h.replace("</body>","".join(f'<script src="../js/{x}.js"></script>' for x in need)+"\n</body>",1)
        h=re.sub(r'(\.\./(?:js|css)/[\w.-]+\.(?:js|css))"',r'\1?v='+VER+'"',h)
        open(f"{ROOT}/{l}/{p}.html","w",encoding="utf-8").write(h)
# ---- pengalih di root (tautan lama /event, /gunung, /login tetap jalan) ----
for p in PAGES:
    t=path(p)
    h=f'''<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>GWM</title><meta name="robots" content="noindex,follow">
<link rel="alternate" hreflang="id" href="{BASE}/id/{t}"><link rel="alternate" hreflang="en" href="{BASE}/en/{t}"><link rel="alternate" hreflang="x-default" href="{BASE}/id/{t}">
<script>(function(){{var l;try{{l=localStorage.getItem("ib_lang")}}catch(e){{}}
if(l!=="id"&&l!=="en")l=/^id/i.test(navigator.language||"")?"id":"en";
location.replace(l+"/{t}"+location.search+location.hash)}})()</script></head>
<body style="font-family:sans-serif;text-align:center;padding:40px"><p>GWM</p>
<p><a href="id/{t}">Bahasa Indonesia</a> · <a href="en/{t}">English</a></p></body></html>
'''
    open(f"{ROOT}/{p}.html","w",encoding="utf-8").write(h)
# ---- sitemap.xml dan robots.txt (ikut BASE, jadi tidak perlu diedit tangan saat pindah domain) ----
from urllib.parse import urlparse
pub=[p for p in PAGES if p not in NOINDEX]
def url(l,p): return f"{BASE}/{l}/{path(p)}"
rows=[]
for l in LANGS:
    for p in pub:
        alt="".join(f'<xhtml:link rel="alternate" hreflang="{x}" href="{url(x,p)}"/>' for x in LANGS)
        rows.append(f"<url><loc>{url(l,p)}</loc>{alt}</url>")
open(ROOT+"/sitemap.xml","w",encoding="utf-8").write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'+"".join(rows)+"</urlset>\n")
pre=urlparse(BASE).path.rstrip("/")
open(ROOT+"/robots.txt","w",encoding="utf-8").write("User-agent: *\nAllow: /\n"+"".join(f"Disallow: {pre}/{x}\n" for x in ("admin","login","id/login","en/login","ajukan","id/ajukan","en/ajukan","profil","id/profil","en/profil","pesan","id/pesan","en/pesan"))+f"Sitemap: {BASE}/sitemap.xml\n")
print("selesai ->",BASE)
