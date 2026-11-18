# Bangun situs dua bahasa: src/*.html + tools/strings.py  ->  id/*.html, en/*.html, js/i18n.js, dan pengalih bahasa di root.
# Jalankan: python3 tools/build.py
import os,re,json,sys,time
sys.path.insert(0,os.path.dirname(__file__))
from strings import S,J,PROV_EN
import blog as BL
import gen_dsk  # css/dsk.css dan css/dsk-b.css (mode "situs desktop" di HP) dibuat dari css lain
ROOT=os.path.join(os.path.dirname(__file__),"..")
# Alamat situs untuk canonical, hreflang, dan sitemap. Saat ini situs hidup di GitHub Pages.
# Setelah domain .com aktif:  GWM_SITE=https://gowithdme.com python3 tools/build.py
BASE=os.environ.get("GWM_SITE","https://calvfinka.github.io/gowithdme").rstrip("/")
VER=os.environ.get("GWM_VER") or time.strftime("%Y%m%d%H%M")  # GWM_VER tetap -> build ulang tidak mengubah file (dipakai workflow)
LANGS=["id","en"]; IDX={"id":0,"en":1}
PAGES=["index","event","gunung","login","privacy","terms","ajukan","komunitas","teman","profil","bantuan","pesan"]
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
        if p in("privacy","terms"): h=h.replace("{{body}}",open(f"{ROOT}/src/{p}.{l}.body.html",encoding="utf-8").read())
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
        need=[x for x in ("i18n","config","portal-core","monetize-core","events-src","regions","gunung-data","search-index","search","navauth","naver","portal-pro","track") if f"../js/{x}.js" not in h]
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
    img=e.get("poster_url") or f"{BASE}/assets/og-image{'' if l=='id' else '-en'}.png"
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
{f'<img src="{esc(e["poster_url"])}" alt="{esc(title)}" loading="eager">' if e.get("poster_url") else ""}
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
print("selesai ->",BASE,"|",len(EV),"event statis,",len(POSTS),"tulisan blog")
