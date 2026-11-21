# Bangun situs dua bahasa: src/*.html + tools/strings.py  ->  id/*.html, en/*.html, js/i18n.js, dan pengalih bahasa di root.
# Jalankan: python3 tools/build.py
import os,re,json,sys,time
sys.path.insert(0,os.path.dirname(__file__))
from strings import S,J,PROV_EN
import blog as BL
import gen_dsk  # css/dsk.css dan css/dsk-b.css (mode "situs desktop" di HP) dibuat dari css lain
ROOT=os.path.join(os.path.dirname(__file__),"..")
# Alamat situs untuk canonical, hreflang, dan sitemap. Default: domain utama gowithdme.com.
# Untuk alamat lain (mis. uji coba):  GWM_SITE=https://alamat-lain python3 tools/build.py
BASE=os.environ.get("GWM_SITE","https://gowithdme.com").rstrip("/")
VER=os.environ.get("GWM_VER") or time.strftime("%Y%m%d%H%M")  # GWM_VER tetap -> build ulang tidak mengubah file (dipakai workflow)
LANGS=["id","en"]; IDX={"id":0,"en":1}
PAGES=["index","event","gunung","login","privacy","terms","copyright","about","ajukan","komunitas","teman","profil","bantuan","pesan"]
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
 ("invite","teman","sx_p_invite","page","ajakan barengan teman bareng cari teman meet up invite buddy gabung join"),
 ("comm","komunitas","sx_p_comm","page","komunitas forum diskusi grup whatsapp telegram discord community"),
 ("submit","ajukan","sx_p_submit","page","ajukan pengajuan tambah event buat open trip poster submit create host"),
 ("help","bantuan","sx_p_help","page","bantuan faq tanya jawab pertanyaan help support"),
 ("contact","bantuan#kontak","sx_p_contact","page","kontak hubungi email whatsapp wa laporan lapor contact report"),
 ("terms","terms","sx_p_terms","page","syarat ketentuan aturan terms conditions rules"),
 ("privacy","privacy","sx_p_privacy","page","privasi kebijakan data pribadi pdp lokasi privacy policy personal data"),
 ("copyright","copyright","sx_p_copyright","page","hak cipta copyright ownership jurkon dmca takedown"),
 ("about","about","sx_p_about","page","tentang about jurkon studio pemilik owner gwm"),
 ("login","login","sx_p_login","page","masuk login daftar register sign up akun google password lupa"),
 ("profile","profil","sx_p_profile","page","profil profile akun edit nama panggilan nickname kota bio foto pengunjung"),
 ("msgs","pesan","sx_p_msgs","page","pesan chat dm inbox voice note gambar kirim pesan message messages"),
 ("saved","event?kat=tersimpan","sx_p_saved","cat","tersimpan favorit simpan saved bookmark"),
 ("done","event?kat=selesai","sx_p_done","cat","selesai lewat arsip riwayat ended past archive"),
 ("concert","event?kat=konser","sx_p_concert","cat","konser musik festival gig live concert music"),
 ("expo","event?kat=pameran","sx_p_expo","cat","pameran expo exhibition seni art"),
 ("hiking","gunung","sx_p_hike","cat","naik gunung pendakian trekking camping hiking mountain open trip"),
 ("deals","./#deals","nv_deals","page","deals mitra partner afiliasi tiket sewa gear outdoor shuttle promo"),
 ("promo","./#promo","nv_promo","page","pasang iklan promosi sponsor banner sorotan kota monetisasi event"),
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
        h=h.replace("{{pgshare}}",'<button class="mm-share" id="pgShare" type="button"><svg class="i" aria-hidden="true"><use href="#i-share"/></svg>{{sh_aria}}</button>' if p in APP else "")
        if p in("privacy","terms","copyright","about"): h=h.replace("{{body}}",open(f"{ROOT}/src/{p}.{l}.body.html",encoding="utf-8").read())
        sw=f'<a class="lang" href="../{o}/{path(p)}" data-sw="{o}" hreflang="{o}" lang="{o}" aria-label="{S["lang_label"][IDX[l]]}">{o.upper()}</a>'
        hl="" if p in NOINDEX else (f'<link rel="canonical" href="{BASE}/{l}/{path(p)}">'
            +"".join(f'<link rel="alternate" hreflang="{x}" href="{BASE}/{x}/{path(p)}">' for x in LANGS)
            +f'<link rel="alternate" hreflang="x-default" href="{BASE}/id/{path(p)}">')
        if p=="index":
            ld={"@context":"https://schema.org","@graph":[
                {"@type":"WebSite","name":"GWM (GoWithDme)","url":f"{BASE}/{l}/","inLanguage":l},
                {"@type":"Organization","name":"GWM (GoWithDme)","url":f"{BASE}/{l}/","logo":f"{BASE}/assets/icon-512.png","founder":{"@type":"Organization","name":"Jurkon Studio"}}]}
            hl+='<script type="application/ld+json">'+json.dumps(ld,ensure_ascii=False).replace("</","<\\/")+'</script>'
        h=h.replace("{{lang}}",l).replace("{{switch}}",sw).replace("{{hreflang}}",hl).replace("{{og_img}}",f"{BASE}/assets/og-image{'' if l=='id' else '-en'}.png")
        h=re.sub(r"\{\{(\w+)\}\}",lambda m:S[m.group(1)][IDX[l]],h)
        assert "{{" not in h,(l,p)
        need=[x for x in ("i18n","config","word-filter","portal-core","monetize-core","events-src","regions","gunung-data","search-index","search","navauth","naver","portal-pro","track") if f"../js/{x}.js" not in h]
        h=h.replace("</body>","".join(f'<script src="../js/{x}.js"></script>' for x in need)+"\n</body>",1)
        h=re.sub(r'(\.\./(?:js|css)/[\w.-]+\.(?:js|css))"',r'\1?v='+VER+'"',h)
        open(f"{ROOT}/{l}/{p}.html","w",encoding="utf-8").write(h)
# ---- pengalih di root (tautan lama /event, /gunung, /login tetap jalan) ----
# Pengalih memakai JavaScript, padahal perayap pratinjau (WhatsApp, Telegram, X, Facebook) dan sebagian bot TIDAK menjalankan JS.
# Karena itu pengalih ikut memuat judul, deskripsi, dan tag OG/Twitter yang disalin dari halaman tujuannya (versi Indonesia),
# sehingga tautan polos "gowithdme.com" tampil dengan gambar dan judul. Halaman formulir (NOINDEX) tetap polos + noindex.
def _head_meta(p):
    s=open(f"{ROOT}/id/{p}.html",encoding="utf-8").read()
    tags=re.findall(r'<title>.*?</title>|<meta name="description"[^>]*>|<meta property="og:[^>]*>|<meta name="twitter:[^>]*>',s,re.S)
    desc=re.search(r'<meta name="description" content="([^"]*)"',s)
    return "".join(tags),(desc.group(1) if desc else "")
STUB_CSS=("*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#f6f8f7;color:#0d1110;"
 "font:16px/1.6 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased}"
 "main{max-width:440px;text-align:center}img{border-radius:14px;box-shadow:0 8px 24px rgba(14,90,70,.25)}"
 "h1{margin:20px 0 10px;font-size:22px;line-height:1.3;font-weight:700;letter-spacing:-.01em}"
 "p{margin:0 0 28px;color:#4b5a55;font-size:15px}nav{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}"
 "a{padding:12px 22px;border-radius:12px;border:1px solid #0e5a46;color:#0e5a46;text-decoration:none;font-weight:600;font-size:15px}"
 "a.pri{background:#0e5a46;color:#fff}a:focus-visible{outline:3px solid #34d399;outline-offset:2px}"
 "@media(prefers-color-scheme:dark){body{background:#0d1110;color:#eef3f1}p{color:#9db0a9}a{border-color:#34d399;color:#34d399}a.pri{background:#34d399;color:#05241a}}")
for p in PAGES:
    t=path(p)
    if p in NOINDEX: meta,desc,robots,canon="<title>GWM</title>","",'<meta name="robots" content="noindex,follow">',""
    else:
        meta,desc=_head_meta(p)
        if "<title>" not in meta: meta="<title>GWM</title>"+meta
        robots,canon="",f'<link rel="canonical" href="{BASE}/id/{t}">'  # sinyal ke mesin pencari: yang diindeks adalah halaman /id/, tautan masuk ke akar ikut terhitung
        if 'property="og:site_name"' not in meta: meta+='<meta property="og:site_name" content="GWM"><meta property="og:type" content="website">'
    ttl=re.search(r"<title>(.*?)</title>",meta,re.S); ttl=(ttl.group(1) if ttl else "GWM")
    body=(f'<main><img src="assets/favicon.svg" width="56" height="56" alt="GWM"><h1>{ttl}</h1>'+(f"<p>{desc}</p>" if desc else "")+
          f'<nav><a class="pri" href="id/{t}">Bahasa Indonesia</a><a href="en/{t}">English</a></nav></main>')
    h=f'''<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#0E5A46">
{meta}{robots}{canon}
<link rel="alternate" hreflang="id" href="{BASE}/id/{t}"><link rel="alternate" hreflang="en" href="{BASE}/en/{t}"><link rel="alternate" hreflang="x-default" href="{BASE}/id/{t}">
<style>{STUB_CSS}</style>
<script>(function(){{var l;try{{l=localStorage.getItem("ib_lang")}}catch(e){{}}
if(l!=="id"&&l!=="en")l=/^id/i.test(navigator.language||"")?"id":"en";
location.replace(l+"/{t}"+location.search+location.hash)}})()</script></head>
<body>{body}</body></html>
'''
    open(f"{ROOT}/{p}.html","w",encoding="utf-8").write(h)
# ---- halaman statis per event (data/events.json dari tools/gen_events.py): Event JSON-LD + teks yang bisa dibaca bot ----
import html as _h
from datetime import date as _date
EV=[]
if os.path.exists(ROOT+"/data/events.json"):
    EV=[e for e in json.load(open(ROOT+"/data/events.json",encoding="utf-8")) if e.get("slug") and e.get("title") and e.get("event_date")]
CAT={"id":{"konser":"Konser","pameran":"Pameran","naikgunung":"Naik Gunung","festival":"Festival","komedi":"Komedi","seminar":"Seminar & Konferensi","meetup":"Meetup","lainnya":"Lainnya"},"en":{"konser":"Concert","pameran":"Exhibition","naikgunung":"Hiking","festival":"Festival","komedi":"Comedy","seminar":"Seminars & Conferences","meetup":"Meetup","lainnya":"Other"}}
TX={"id":{"open":"Buka di GWM","tix":"Beli tiket / info resmi","all":"Semua event","when":"Tanggal","where":"Lokasi","price":"Harga","lineup":"Pengisi acara","note":"Cek ulang jadwal dan harga di kanal resmi penyelenggara sebelum membeli tiket."},
    "en":{"open":"Open in GWM","tix":"Tickets / official info","all":"All events","when":"Date","where":"Location","price":"Price","lineup":"Line-up","note":"Please re-check schedule and price on the organizer's official channel before buying tickets."}}
MON={"id":["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"],"en":["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]}
def fdate(l,d):
    y,m,dd=map(int,d[:10].split("-")); return f"{dd} {MON[l][m-1]} {y}"
def price_num(lb):
    if not lb: return None
    if re.search(r"gratis|free",lb,re.I): return 0
    m=re.search(r"Rp\s*([\d.]+)",lb)
    return int(m.group(1).replace(".","")) if m else None
def esc(x): return _h.escape(str(x),quote=True)
def ldj(o): return '<script type="application/ld+json">'+json.dumps(o,ensure_ascii=False).replace("</","<\\/")+'</script>'
def ev_page(l,e):
    o="en" if l=="id" else "id"
    title=(e.get("title_en") if l=="en" and e.get("title_en") else e["title"])
    desc=(e.get("description_en") if l=="en" and e.get("description_en") else e.get("description")) or title
    sd=e["event_date"][:10]; ed=(e.get("end_date") or sd)[:10]
    t=TX[l]; cat=CAT[l].get(e.get("category"),e.get("category") or "")
    where=", ".join(x for x in (e.get("venue"),e.get("city")) if x)
    u=f"{BASE}/{l}/e/{e['slug']}"
    pu=e.get("poster_url") or ""
    # poster lokal: harus ada filenya, dan dari id/e/ atau en/e/ alamatnya naik dua tingkat ke akar situs
    if pu and not re.match(r"https?://",pu) and not os.path.exists(f"{ROOT}/{pu.lstrip('/')}"): pu=""
    pimg=pu if (not pu or re.match(r"https?://",pu)) else "../../"+pu.lstrip("/")
    img=pu or f"{BASE}/assets/og-image{'' if l=='id' else '-en'}.png"
    if not re.match(r"https?://",img): img=BASE+"/"+img.lstrip("/")  # og:image dan JSON-LD wajib URL absolut
    ld={"@context":"https://schema.org","@type":"Event","name":title,"startDate":sd,"endDate":ed,"description":desc,
        "eventStatus":"https://schema.org/EventScheduled","eventAttendanceMode":"https://schema.org/OfflineEventAttendanceMode",
        "image":[img],"url":u,"inLanguage":l,
        "location":{"@type":"Place","name":e.get("venue") or e.get("city") or "Indonesia","address":{"@type":"PostalAddress","addressLocality":e.get("city") or "","addressCountry":"ID"}}}
    if e.get("lineup"): ld["performer"]=[{"@type":"PerformingGroup","name":x.strip()} for x in re.split(r"[,;]",e["lineup"]) if x.strip()]
    pn=price_num(e.get("price_label"))
    if pn is not None and e.get("ticket_url"):
        ld["offers"]={"@type":"Offer","url":e["ticket_url"],"priceCurrency":"IDR","price":pn,"availability":"https://schema.org/InStock"}
    rows=[(t["when"],fdate(l,sd)+(" – "+fdate(l,ed) if ed!=sd else "")),(t["where"],where),(t["price"],e.get("price_label")),(t["lineup"],e.get("lineup"))]
    dl="".join(f"<dt>{esc(k)}</dt><dd>{esc(v)}</dd>" for k,v in rows if v)
    btn=f'<a class="b" href="../event?e={esc(e["slug"])}">{t["open"]}</a>'+(f' <a class="b l" href="{esc(e["ticket_url"])}" rel="noopener nofollow" target="_blank">{t["tix"]}</a>' if e.get("ticket_url") else "")
    return f"""<!DOCTYPE html>
<html lang="{l}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)} – GWM</title><meta name="description" content="{esc((cat+' · '+where+' · '+fdate(l,sd)+'. '+desc)[:300])}">
<link rel="canonical" href="{u}"><link rel="alternate" hreflang="{l}" href="{u}"><link rel="alternate" hreflang="{o}" href="{BASE}/{o}/e/{e['slug']}"><link rel="alternate" hreflang="x-default" href="{BASE}/id/e/{e['slug']}">
<meta property="og:type" content="website"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(desc[:200])}"><meta property="og:image" content="{esc(img)}"><meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0E5A46"><link rel="icon" href="../../assets/favicon.svg" type="image/svg+xml">
<style>body{{font:16px/1.6 Inter,system-ui,sans-serif;margin:0;background:#f6f7f6;color:#14201b}}main{{max-width:720px;margin:0 auto;padding:20px 16px 48px}}img{{max-width:100%;border-radius:14px;display:block}}h1{{font-size:1.6rem;line-height:1.25;margin:16px 0 4px}}.c{{color:#0E5A46;font-weight:600;font-size:.9rem}}dl{{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;margin:16px 0}}dt{{font-weight:600}}dd{{margin:0}}.b{{display:inline-block;background:#0E5A46;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600;margin:4px 6px 4px 0}}.b.l{{background:#fff;color:#0E5A46;border:1px solid #0E5A46}}small{{color:#5b6a63}}nav a{{color:#0E5A46}}@media(prefers-color-scheme:dark){{body{{background:#101613;color:#e8efeb}}.b.l{{background:transparent;color:#7fd1b4;border-color:#7fd1b4}}.c,nav a{{color:#7fd1b4}}small{{color:#9bb0a6}}}}</style>
{ldj(ld)}</head><body><main>
<nav><a href="../">GWM</a> › <a href="../event">{t["all"]}</a></nav>
{f'<img src="{esc(pimg)}" alt="{esc(title)}" loading="eager">' if pimg else ""}
<div class="c">{esc(cat)}{(" · "+esc(e["genre"])) if e.get("genre") else ""}</div>
<h1>{esc(title)}</h1><dl>{dl}</dl><p>{esc(desc)}</p><p>{btn}</p><p><small>{t["note"]}</small></p>
</main></body></html>
"""
EVURLS=[]
for l in LANGS:
    os.makedirs(f"{ROOT}/{l}/e",exist_ok=True)
    for f in os.listdir(f"{ROOT}/{l}/e"): os.remove(f"{ROOT}/{l}/e/{f}")
    for e in EV: open(f"{ROOT}/{l}/e/{e['slug']}.html","w",encoding="utf-8").write(ev_page(l,e))
# ---- sitemap.xml dan robots.txt (ikut BASE, jadi tidak perlu diedit tangan saat pindah domain) ----
from urllib.parse import urlparse
pub=[p for p in PAGES if p not in NOINDEX]
def url(l,p): return f"{BASE}/{l}/{path(p)}"
rows=[]
for l in LANGS:
    for p in pub:
        alt="".join(f'<xhtml:link rel="alternate" hreflang="{x}" href="{url(x,p)}"/>' for x in LANGS)
        rows.append(f"<url><loc>{url(l,p)}</loc>{alt}</url>")
# ---- blog statis (data/posts.json dari tools/gen_blog.py) -> blog/<kategori>/<alamat>.html ----
POSTS=json.load(open(ROOT+"/data/posts.json",encoding="utf-8")) if os.path.exists(ROOT+"/data/posts.json") else []
for u,lm in BL.build(ROOT,BASE,POSTS): rows.append(f"<url><loc>{u}</loc>"+(f"<lastmod>{lm[:10]}</lastmod>" if lm else "")+"</url>")
for e in EV:
    alt="".join(f'<xhtml:link rel="alternate" hreflang="{x}" href="{BASE}/{x}/e/{e["slug"]}"/>' for x in LANGS)
    for l in LANGS: rows.append(f"<url><loc>{BASE}/{l}/e/{e['slug']}</loc><lastmod>{(e.get('created_at') or e['event_date'])[:10]}</lastmod>{alt}</url>")
open(ROOT+"/sitemap.xml","w",encoding="utf-8").write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'+"".join(rows)+"</urlset>\n")
pre=urlparse(BASE).path.rstrip("/")
open(ROOT+"/robots.txt","w",encoding="utf-8").write("User-agent: *\nAllow: /\n"+"".join(f"Disallow: {pre}/{x}\n" for x in ("admin","login","id/login","en/login","ajukan","id/ajukan","en/ajukan","profil","id/profil","en/profil","pesan","id/pesan","en/pesan"))+f"Sitemap: {BASE}/sitemap.xml\n")
# ---- sw.js: service worker (offline + cepat). VER ikut build, jadi cache versi lama dibuang otomatis ----
# cangkang offline: halaman utama dua bahasa + semua CSS/JS (dengan ?v= yang sama persis dengan yang diminta halaman) + data event.
# Diunduh service worker saat dipasang, jadi situs langsung bisa dibuka tanpa sinyal tanpa menunggu tiap halaman dikunjungi.
SHELL_PAGES=["index","event","gunung","bantuan"]
pre_pages,pre_assets=[],[]
for l in LANGS:
    for p in SHELL_PAGES:
        pre_pages.append(f"{l}/{path(p)}")
        for a in re.findall(r'(?:href|src)="\.\./((?:css|js)/[^"]+)"',open(f"{ROOT}/{l}/{p}.html",encoding="utf-8").read()):
            if a not in pre_assets: pre_assets.append(a)
pre_assets+=[x for x in ("assets/favicon.svg",) if os.path.exists(f"{ROOT}/{x}")]
PRE=json.dumps({"pages":pre_pages,"assets":pre_assets,"data":["data/events.json"] if os.path.exists(ROOT+"/data/events.json") else []},separators=(",",":"))
sw=open(ROOT+"/src/sw.js",encoding="utf-8").read().replace("__VER__",VER)
sw,n=re.subn(r"var PRE = .*?; /\*PRE\*/",lambda m:"var PRE = "+PRE+"; /*PRE*/",sw); assert n==1
open(ROOT+"/sw.js","w",encoding="utf-8").write(sw)
print("selesai ->",BASE,"|",len(EV),"event statis,",len(POSTS),"tulisan blog")
