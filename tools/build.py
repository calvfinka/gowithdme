# Bangun situs dua bahasa: src/*.html + tools/strings.py  ->  id/*.html, en/*.html, js/i18n.js, dan pengalih bahasa di root.
# Jalankan: python3 tools/build.py
import os,re,json,sys,time
sys.path.insert(0,os.path.dirname(__file__))
from strings import S,J,PROV_EN
import gen_og  # kartu pratinjau /og/<slug>.jpg untuk og:image
import gen_dsk  # css/dsk.css dan css/dsk-b.css (mode "situs desktop" di HP) dibuat dari css lain
ROOT=os.path.join(os.path.dirname(__file__),"..")
# Alamat situs untuk canonical, hreflang, dan sitemap. Default: domain utama gowithdme.com.
# Untuk alamat lain (mis. uji coba):  GWM_SITE=https://alamat-lain python3 tools/build.py
BASE=os.environ.get("GWM_SITE","https://gowithdme.com").rstrip("/")
VER=os.environ.get("GWM_VER") or time.strftime("%Y%m%d%H%M")  # GWM_VER tetap -> build ulang tidak mengubah file (dipakai workflow)
# ---- pemilik situs + tautan sosial (tampil di Hak Cipta dan Tentang; juga jadi data "founder" untuk Google) ----
# Tambah akun lain dengan satu baris: ("Instagram","https://instagram.com/akunmu"),
OWNER_NAME="Kalfin Agus Setiawan"
OWNER_SOCIAL=[("Blog","https://calvfinka.blogspot.com"),("GitHub","https://github.com/calvfinka")]
_ol={"id":"Sosial media","en":"Social"}
S["owner_links"]=tuple((f'<p>{_ol[x]}: '+" · ".join(f'<a href="{u}" rel="me noopener" target="_blank">{n}</a>' for n,u in OWNER_SOCIAL)+"</p>") for x in ("id","en"))
LANGS=["id","en"]; IDX={"id":0,"en":1}
PAGES=["index","event","gunung","login","privacy","terms","copyright","template","about","ajukan","komunitas","teman","profil","bantuan","pesan"]
# halaman /statistik hanya ada bila data/statistik.json berstatus aktif (sakelar 'publik' di Supabase); selain itu tidak dibangun dan file lamanya dihapus
try: STAT_ON=bool(json.load(open(ROOT+"/data/statistik.json",encoding="utf-8")).get("aktif"))
except Exception: STAT_ON=False
if STAT_ON: PAGES.append("statistik")
else:
    for _f in ("id/statistik.html","en/statistik.html","statistik.html"):
        if os.path.exists(f"{ROOT}/{_f}"): os.remove(f"{ROOT}/{_f}")
STAT_LINK='<a href="statistik"><svg class="i" aria-hidden="true"><use href="#i-grid"/></svg>{{nv_stats}}</a>'
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
if STAT_ON: SX_PAGES.append(("stats","statistik","sx_p_stats","page","statistik ranking kota artis penyelenggara promotor konser stats ranking cities artists organizers"))
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
        h=h.replace("{{stat_link}}",STAT_LINK if STAT_ON else "")
        h=h.replace("{{pgshare}}",'<button class="mm-share" id="pgShare" type="button"><svg class="i" aria-hidden="true"><use href="#ia-share"/></svg>{{sh_aria}}</button>' if p in APP else "")
        if p in("privacy","terms","copyright","template","about"): h=h.replace("{{body}}",open(f"{ROOT}/src/{p}.{l}.body.html",encoding="utf-8").read())
        sw=f'<a class="lang" href="../{o}/{path(p)}" data-sw="{o}" hreflang="{o}" lang="{o}" aria-label="{S["lang_label"][IDX[l]]}">{o.upper()}</a>'
        hl="" if p in NOINDEX else (f'<link rel="canonical" href="{BASE}/{l}/{path(p)}">'
            +"".join(f'<link rel="alternate" hreflang="{x}" href="{BASE}/{x}/{path(p)}">' for x in LANGS)
            +f'<link rel="alternate" hreflang="x-default" href="{BASE}/id/{path(p)}">')
        if p=="index":
            ld={"@context":"https://schema.org","@graph":[
                {"@type":"WebSite","name":"GoWithDME","url":f"{BASE}/{l}/","inLanguage":l},
                {"@type":"Organization","name":"GoWithDME","url":f"{BASE}/{l}/","logo":f"{BASE}/assets/icon-512.png","founder":{"@type":"Person","name":OWNER_NAME,"sameAs":[u for _,u in OWNER_SOCIAL]}}]}
            hl+='<script type="application/ld+json">'+json.dumps(ld,ensure_ascii=False).replace("</","<\\/")+'</script>'
        h=h.replace("{{lang}}",l).replace("{{switch}}",sw).replace("{{hreflang}}",hl).replace("{{og_img}}",f"{BASE}/assets/og-image{'' if l=='id' else '-en'}.png")
        h=re.sub(r"\{\{(\w+)\}\}",lambda m:S[m.group(1)][IDX[l]],h)
        assert "{{" not in h,(l,p)
        need=[x for x in ("i18n","config","word-filter","portal-core","monetize-core","next-core","lineup-core","events-src","regions","geo-core","blogtab-core","gunung-data","search-index","search","navauth","naver","portal-pro","track") if f"../js/{x}.js" not in h]
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
    if p in NOINDEX: meta,desc,robots,canon="<title>GoWithDME</title>","",'<meta name="robots" content="noindex,follow">',""
    else:
        meta,desc=_head_meta(p)
        if "<title>" not in meta: meta="<title>GoWithDME</title>"+meta
        robots,canon="",f'<link rel="canonical" href="{BASE}/id/{t}">'  # sinyal ke mesin pencari: yang diindeks adalah halaman /id/, tautan masuk ke akar ikut terhitung
        if 'property="og:site_name"' not in meta: meta+='<meta property="og:site_name" content="GoWithDME"><meta property="og:type" content="website">'
    ttl=re.search(r"<title>(.*?)</title>",meta,re.S); ttl=(ttl.group(1) if ttl else "GoWithDME")
    body=(f'<main><img src="assets/favicon.svg" width="56" height="56" alt="GoWithDME"><h1>{ttl}</h1>'+(f"<p>{desc}</p>" if desc else "")+
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
import guide
from datetime import date as _date
EV=[]
if os.path.exists(ROOT+"/data/events.json"):
    EV=[e for e in json.load(open(ROOT+"/data/events.json",encoding="utf-8")) if e.get("slug") and e.get("title") and e.get("event_date")]
CAT={"id":{"konser":"Konser","pameran":"Pameran","naikgunung":"Naik Gunung","festival":"Festival","komedi":"Komedi","seminar":"Seminar & Konferensi","meetup":"Meetup","lainnya":"Lainnya"},"en":{"konser":"Concert","pameran":"Exhibition","naikgunung":"Hiking","festival":"Festival","komedi":"Comedy","seminar":"Seminars & Conferences","meetup":"Meetup","lainnya":"Other"}}
TX={"id":{"open":"Buka di GoWithDME","tix":"Beli tiket / info resmi","all":"Semua event","when":"Tanggal","where":"Lokasi","price":"Harga","lineup":"Pengisi acara","note":"Cek ulang jadwal dan harga di kanal resmi penyelenggara sebelum membeli tiket."},
    "en":{"open":"Open in GoWithDME","tix":"Tickets / official info","all":"All events","when":"Date","where":"Location","price":"Price","lineup":"Line-up","note":"Please re-check schedule and price on the organizer's official channel before buying tickets."}}
MON={"id":["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"],"en":["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]}
TX["id"].update({"ended":"Event ini sudah selesai digelar pada","related":"Event mendatang yang mungkin kamu suka","next":"Edisi berikutnya belum diumumkan di GoWithDME. Pantau halaman ini atau cek event serupa di bawah.","qwhen":"Kapan {t} digelar?","qwhere":"Di mana {t} digelar?","qprice":"Berapa harga tiket {t}?","awhen":"{t} digelar pada {d}.","awhere":"Lokasinya di {w}.","aprice":"Harga tiket: {p}.","faq":"Pertanyaan umum"})
TX["en"].update({"ended":"This event already took place on","related":"Upcoming events you may like","next":"The next edition has not been announced on GoWithDME yet. Check back here or browse similar events below.","qwhen":"When is {t}?","qwhere":"Where is {t} held?","qprice":"How much are {t} tickets?","awhen":"{t} takes place on {d}.","awhere":"The venue is {w}.","aprice":"Ticket price: {p}.","faq":"FAQ"})
DAYS={"id":["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"],"en":["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]}
from datetime import datetime as _dtm, timezone as _tzm, timedelta as _tdm
_NOW=os.environ.get("GWM_TODAY") or (_dtm.now(_tzm.utc)+_tdm(hours=7)).date().isoformat()  # WIB (UTC+7): build di server UTC tidak boleh salah hari antara 00:00-07:00 WIB
def fday(l,d):
    y,m,dd=map(int,d[:10].split("-")); return DAYS[l][_date(y,m,dd).weekday()]+", "+fdate(l,d)
def seo_title(l,e,title):
    city=(e.get("city") or "").strip(); sd=e["event_date"][:10]
    parts=[title]
    if city and city.lower() not in title.lower(): parts.append(city)
    parts.append(fdate(l,sd))
    tail=("Lineup & Tiket" if l=="id" else "Lineup & Tickets") if e.get("category") in ("konser","festival") else ("Info & Tiket" if l=="id" else "Info & Tickets")
    return " ".join(parts)+": "+tail
def fdate(l,d):
    y,m,dd=map(int,d[:10].split("-")); return f"{dd} {MON[l][m-1]} {y}"
def price_num(lb):
    if not lb: return None
    if re.search(r"gratis|free",lb,re.I): return 0
    m=re.search(r"Rp\.?\s*(\d[\d.]*)",lb)  # harus diawali angka: "Rp. 50.000" / "Rp." tanpa angka tidak boleh membuat build gagal
    d=m.group(1).replace(".","") if m else ""
    return int(d) if d else None
def esc(x): return _h.escape(str(x),quote=True)
def ldj(o): return '<script type="application/ld+json">'+json.dumps(o,ensure_ascii=False).replace("</","<\\/")+'</script>'

# ---- halaman artis: tiap nama di line-up jadi halaman sendiri (huruf besar/kecil, spasi, aksen, tanda baca diabaikan saat menggabungkan) ----
import unicodedata as _ud
TX["id"].update({"lineup_h":"Pengisi acara","a_title":"{a}: Jadwal Konser & Tiket","a_desc":"Jadwal konser dan festival {a}: {n} event di GoWithDME. {nx}","a_next":"Event terdekat: {t} pada {d}.","a_none":"Belum ada jadwal mendatang.","a_up":"Jadwal mendatang","a_past":"Event sebelumnya","a_qwhen":"Kapan {a} konser?","a_qnone":"Belum ada jadwal {a} yang akan datang di GoWithDME. Halaman ini diperbarui saat ada event baru.","a_all":"Semua artis","a_index_t":"Daftar Artis & Pengisi Acara","a_index_d":"Daftar artis dan pengisi acara konser dan festival di Indonesia beserta jadwalnya.","a_count":"{n} event","a_ended":"selesai"})
TX["en"].update({"lineup_h":"Line-up","a_title":"{a}: Concert Dates & Tickets","a_desc":"Concert and festival dates for {a}: {n} events on GoWithDME. {nx}","a_next":"Next show: {t} on {d}.","a_none":"No upcoming dates yet.","a_up":"Upcoming shows","a_past":"Past events","a_qwhen":"When is {a} playing next?","a_qnone":"There are no upcoming {a} dates on GoWithDME yet. This page is updated when new events are added.","a_all":"All artists","a_index_t":"Artists & Performers","a_index_d":"Artists and performers at concerts and festivals in Indonesia, with their dates.","a_count":"{n} events","a_ended":"ended"})
_PLACE=re.compile(r"menyusul|segera|soon|tba|tbc|tbd|lainnya|and more|to be announced|pengumuman|line-?up|musisi|guest star|masih banyak|^day\s*\d|^kategori\s|\b(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|january|february|march|june|july|august|october|december)\s+20\d\d",re.I)
def _akey(n): return re.sub(r"[^0-9a-z]+","",_ud.normalize("NFKD",n).encode("ascii","ignore").decode().lower() or n.lower()) or re.sub(r"\W+","",n.casefold())
def _aslug(n):
    a=_ud.normalize("NFKD",n).encode("ascii","ignore").decode().lower()
    return re.sub(r"[^0-9a-z]+","-",a).strip("-")
def split_lineup(txt):
    t=re.sub(r"\.\s*Day\s*\d+\s*\([^)]*\):\s*",", ",txt); t=re.sub(r"^\s*Day\s*\d+\s*\([^)]*\):\s*","",t)
    t=re.sub(r"\.\s+Dan masih.*$","",t,flags=re.I)
    out=[]
    for x in re.split(r"[,;\n]",t):
        x=re.sub(r"\([^)]*\)","",x).strip(" .\t\"'“”‘’"); x=re.sub(r"^Day\s*\d+\s*:\s*","",x,flags=re.I); x=re.sub(r"^(dan|and)\s+","",x,flags=re.I).strip(" .\"'")
        if re.fullmatch(r"day\s*\d+",x,re.I): continue
        if len(x)<2 or len(x)>60 or _PLACE.search(x): continue
        out.append(x)
    return out
# Direktori Artis sudah pindah ke repo gowithdme-artis (artis.gowithdme.com). Di sini hanya tersisa logika nama -> slug
# (dipakai untuk menaut line-up di halaman event dan oleh guide.related). Bagian ini HARUS sama dengan tools/build.py di repo artis.
ARTIS_BASE=os.environ.get("GWM_ARTIS","https://artis.gowithdme.com").rstrip("/")
ARTIS_PENGALIH=True   # tulis halaman pengalih id/a dan en/a; ubah ke False beberapa bulan setelah pindah (folder itu dihapus saat build)
import artis_pengalih as AP
ARTISTS={}   # key -> {"names":Counter,"events":[e..],"slug":...}
import collections as _col
for _e in EV:
    seen=set()
    for _n in split_lineup(_e.get("lineup") or ""):
        k=_akey(_n)
        if not k or k in seen: continue
        seen.add(k); a=ARTISTS.setdefault(k,{"names":_col.Counter(),"events":[]}); a["names"][_n]+=1; a["events"].append(_e)
_used=set()
for k,a in sorted(ARTISTS.items()):
    # nama tampilan = ejaan paling sering dipakai; seri: yang bukan huruf besar semua
    a["name"]=sorted(a["names"].items(),key=lambda kv:(-kv[1],kv[0].isupper(),kv[0]))[0][0]
    sl=_aslug(a["name"]) or k; base=sl; i=2
    while sl in _used: sl=f"{base}-{i}"; i+=1
    _used.add(sl); a["slug"]=sl
def lineup_html(l,e):
    parts=[]
    for n in split_lineup(e.get("lineup") or ""):
        a=ARTISTS.get(_akey(n)); parts.append(f'<a href="{ARTIS_BASE}/{l}/{esc(a["slug"])}">{esc(n)}</a>' if a else esc(n))
    return ", ".join(parts)
def ev_page(l,e):
    o="en" if l=="id" else "id"
    title=(e.get("title_en") if l=="en" and e.get("title_en") else e["title"])
    desc=(e.get("description_en") if l=="en" and e.get("description_en") else e.get("description")) or title
    sd=e["event_date"][:10]; ed=(e.get("end_date") or sd)[:10]
    t=TX[l]; cat=CAT[l].get(e.get("category"),e.get("category") or "")
    past=ed<_NOW
    stitle=seo_title(l,e,title)
    where=", ".join(x for x in (e.get("venue"),e.get("city")) if x and not (x==e.get("city") and (e.get("venue") or "").strip().lower().endswith(x.strip().lower())))
    u=f"{BASE}/{l}/e/{e['slug']}"
    pu=e.get("poster_url") or ""
    # poster lokal: harus ada filenya, dan dari id/e/ atau en/e/ alamatnya naik dua tingkat ke akar situs
    if pu and not re.match(r"https?://",pu) and not os.path.exists(f"{ROOT}/{pu.lstrip('/')}"): pu=""
    pimg=pu if (not pu or re.match(r"https?://",pu)) else "../../"+pu.lstrip("/")
    img=pu or f"{BASE}/assets/og-image{'' if l=='id' else '-en'}.png"
    if not re.match(r"https?://",img): img=BASE+"/"+img.lstrip("/")  # og:image dan JSON-LD wajib URL absolut
    ogimg=f"{BASE}/og/{e['slug']}.jpg" if e['slug'] in OG_OK else f"{BASE}/assets/og-image{'' if l=='id' else '-en'}.png"  # pratinjau medsos: kartu 1200x630 di domain sendiri
    ogd=(fday(l,sd)+(' – '+fdate(l,ed) if ed!=sd else '')+(' · '+where if where else '')+'. '+desc)[:200]
    ogm=(f'<meta property="og:type" content="website"><meta property="og:site_name" content="GoWithDME"><meta property="og:locale" content="{"id_ID" if l=="id" else "en_US"}">'
         f'<meta property="og:url" content="{u}"><meta property="og:title" content="{esc(stitle)}"><meta property="og:description" content="{esc(ogd)}">'
         f'<meta property="og:image" content="{esc(ogimg)}"><meta property="og:image:secure_url" content="{esc(ogimg)}"><meta property="og:image:type" content="image/{"jpeg" if e["slug"] in OG_OK else "png"}">'
         f'<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="{esc(title)}">'
         f'<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{esc(stitle)}"><meta name="twitter:description" content="{esc(ogd[:200])}">'
         f'<meta name="twitter:image" content="{esc(ogimg)}"><meta name="twitter:image:alt" content="{esc(title)}">')
    ld={"@context":"https://schema.org","@type":"Event","name":title,"startDate":sd,"endDate":ed,"description":desc,
        "eventStatus":"https://schema.org/EventScheduled","eventAttendanceMode":"https://schema.org/OfflineEventAttendanceMode",
        "image":[img],"url":u,"inLanguage":l,
        "location":{"@type":"Place","name":e.get("venue") or e.get("city") or "Indonesia","address":{"@type":"PostalAddress","addressLocality":e.get("city") or "","addressCountry":"ID"}}}
    if e.get("lineup"): ld["performer"]=[{"@type":"PerformingGroup","name":x.strip()} for x in re.split(r"[,;]",e["lineup"]) if x.strip()]
    pn=price_num(e.get("price_label"))
    if pn is not None and e.get("ticket_url"):
        ld["offers"]={"@type":"Offer","url":e["ticket_url"],"priceCurrency":"IDR","price":pn}
        if not past: ld["offers"]["availability"]="https://schema.org/InStock"  # event lampau: jangan mengaku masih tersedia
    # organizer: hanya dari data asli (kolom organizer); tidak menebak, supaya tidak menyesatkan
    og=(e.get("organizer") or "").strip()
    if og: ld["organizer"]={"@type":"Organization","name":og}
    rows=[(t["when"],fdate(l,sd)+(" – "+fdate(l,ed) if ed!=sd else "")),(t["where"],where),(t["price"],e.get("price_label")),(t["lineup"],e.get("lineup"))]
    dl="".join(f"<dt>{esc(k)}</dt><dd>{(lineup_html(l,e) or esc(v)) if k==t['lineup'] else esc(v)}</dd>" for k,v in rows if v)
    btn=f'<a class="b" href="../event?e={esc(e["slug"])}">{t["open"]}</a>'+(f' <a class="b l" href="{esc(e["ticket_url"])}" rel="noopener nofollow" target="_blank">{t["tix"]}</a>' if e.get("ticket_url") and not past else "")
    when_txt=fday(l,sd)+(" – "+fdate(l,ed) if ed!=sd else "")
    banner=f'<p class="end"><b>{t["ended"]} {esc(when_txt)}.</b> {t["next"]}</p>' if past else ""
    G=guide.T[l]
    qa=guide.faq(l,e,title,when_txt,where,past)
    faq=f'<h2>{t["faq"]}</h2>'+"".join(f"<h3>{esc(q)}</h3><p>{esc(a)}</p>" for q,a in qa)
    faqld={"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}} for q,a in qa]}
    rp="".join(f"<p>{esc(x)}</p>" for x in guide.route(l,e,where))
    routeh=(f'<h2>{G["route"]}</h2>{rp}<p><a class="b l" href="{esc(guide.maps_dir(e))}" rel="noopener nofollow" target="_blank">{G["maps"]}</a></p>') if (e.get("venue") or e.get("city")) else ""
    tipsh="" if past else f'<h2>{G["tips"]}</h2><ul>'+"".join(f"<li>{esc(x)}</li>" for x in guide.tips(l,e))+"</ul>"
    rel=guide.related(l,e,EV,_NOW,split_lineup,_akey)
    relh=(f'<h2>{G["related"]}</h2><ul>'+"".join(f'<li><a href="{esc(x["slug"])}">{esc(x["title"])}</a> <small>{esc(fdate(l,x["event_date"]))}{(" · "+esc(x["city"])) if x.get("city") else ""} · {esc(" · ".join(why))}</small></li>' for x,why in rel)+f'</ul><p><a href="../event">{G["rel_more"]}</a></p>') if rel else f'<h2>{G["related"]}</h2><p>{G["rel_none"]}</p><p><a href="../event">{G["rel_more"]}</a></p>'
    return f"""<!DOCTYPE html>
<html lang="{l}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(stitle)} | GoWithDME</title><meta name="description" content="{esc((fday(l,sd)+(' – '+fdate(l,ed) if ed!=sd else '')+' · '+where+'. '+desc)[:300])}">
<link rel="canonical" href="{u}"><link rel="alternate" hreflang="{l}" href="{u}"><link rel="alternate" hreflang="{o}" href="{BASE}/{o}/e/{e['slug']}"><link rel="alternate" hreflang="x-default" href="{BASE}/id/e/{e['slug']}">
{ogm}
<meta name="theme-color" content="#0E5A46"><link rel="icon" href="../../assets/favicon.svg" type="image/svg+xml">
<style>body{{font:16px/1.6 Inter,system-ui,sans-serif;margin:0;background:#f6f7f6;color:#14201b}}main{{max-width:720px;margin:0 auto;padding:20px 16px 48px}}img{{max-width:100%;border-radius:14px;display:block}}h1{{font-size:1.6rem;line-height:1.25;margin:16px 0 4px}}.c{{color:#0E5A46;font-weight:600;font-size:.9rem}}dl{{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;margin:16px 0}}dt{{font-weight:600}}dd{{margin:0}}.b{{display:inline-block;background:#0E5A46;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600;margin:4px 6px 4px 0}}.b.l{{background:#fff;color:#0E5A46;border:1px solid #0E5A46}}small{{color:#5b6a63}}.end{{background:#fff3cd;color:#5c4400;padding:10px 14px;border-radius:10px}}h2{{font-size:1.15rem;margin:28px 0 6px}}h3{{font-size:1rem;margin:14px 0 0}}h3+p{{margin:2px 0 0}}main a:not(.b){{color:#0E5A46;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px;text-decoration-color:rgba(14,90,70,.35)}}main a:not(.b):visited{{color:#0E5A46}}main a:not(.b):hover{{text-decoration-color:currentColor}}@media(prefers-color-scheme:dark){{body{{background:#101613;color:#e8efeb}}.b.l{{background:transparent;color:#7fd1b4;border-color:#7fd1b4}}.c,main a:not(.b),main a:not(.b):visited{{color:#7fd1b4}}main a:not(.b){{text-decoration-color:rgba(127,209,180,.4)}}small{{color:#9bb0a6}}}}</style>
{ldj(ld)}{ldj(faqld)}</head><body><main>
<nav><a href="../">GoWithDME</a> › <a href="../event">{t["all"]}</a></nav>
{f'<img src="{esc(pimg)}" alt="{esc(title)}" loading="eager">' if pimg else ""}
<div class="c">{esc(cat)}{(" · "+esc(e["genre"])) if e.get("genre") else ""}</div>
<h1>{esc(title)}</h1>{banner}<dl>{dl}</dl><p>{esc(desc)}</p><p>{btn}</p>{routeh}{tipsh}{faq}{relh}<p><small>{t["note"]}</small></p>
</main></body></html>
"""
def _og_meta(e):
    sd=e["event_date"][:10]; ed=(e.get("end_date") or sd)[:10]
    return fdate("id",sd)+(" – "+fdate("id",ed) if ed!=sd else "")+((" · "+e["city"]) if e.get("city") else "")
OG_OK=gen_og.build(EV,ROOT,_og_meta)
EVURLS=[]
for l in LANGS:
    os.makedirs(f"{ROOT}/{l}/e",exist_ok=True)
    for f in os.listdir(f"{ROOT}/{l}/e"): os.remove(f"{ROOT}/{l}/e/{f}")
    for e in EV: open(f"{ROOT}/{l}/e/{e['slug']}.html","w",encoding="utf-8").write(ev_page(l,e))
    AP.tulis(ROOT,l,ARTISTS,ARTIS_BASE,ARTIS_PENGALIH)  # halaman lama /<bahasa>/a/... -> pengalih ke artis.gowithdme.com
# ---- sitemap.xml dan robots.txt (ikut BASE, jadi tidak perlu diedit tangan saat pindah domain) ----
from urllib.parse import urlparse
pub=[p for p in PAGES if p not in NOINDEX]
def url(l,p): return f"{BASE}/{l}/{path(p)}"
rows=[]
for l in LANGS:
    for p in pub:
        alt="".join(f'<xhtml:link rel="alternate" hreflang="{x}" href="{url(x,p)}"/>' for x in LANGS)
        rows.append(f"<url><loc>{url(l,p)}</loc>"+("<lastmod>2026-11-21</lastmod>" if p=="template" else "@@LM@@")+f"{alt}</url>")
# ---- blog: sudah pindah ke repo sendiri (blog.gowithdme.com). Di sini data/posts.json hanya dipakai untuk lastmod halaman inti
#      dan cadangan tab "Panduan & Komunitas" di beranda; halaman blog/ di repo ini tinggal pengalih (lihat blog/*.html). ----
POSTS=json.load(open(ROOT+"/data/posts.json",encoding="utf-8")) if os.path.exists(ROOT+"/data/posts.json") else []
_TODAY=_date.today().isoformat()
_OLD=(_date.today()-__import__("datetime").timedelta(days=30)).isoformat()  # event yang berakhir >30 hari lalu: halaman tetap ada, tapi keluar dari sitemap
for e in EV:
    if (e.get("end_date") or e["event_date"])[:10]<_OLD: continue
    alt="".join(f'<xhtml:link rel="alternate" hreflang="{x}" href="{BASE}/{x}/e/{e["slug"]}"/>' for x in LANGS)
    for l in LANGS: rows.append(f"<url><loc>{BASE}/{l}/e/{e['slug']}</loc><lastmod>{(e.get('created_at') or e['event_date'])[:10]}</lastmod>{alt}</url>")
# lastmod halaman inti = tanggal konten terbaru yang benar-benar ada (event ditambahkan atau tulisan blog), bukan tanggal build
_dates=[(e.get("created_at") or "")[:10] for e in EV]+[(x.get("updated_at") or x.get("published_at") or "")[:10] for x in POSTS]
_dates=[x for x in _dates if x]
_LMTAG=f"<lastmod>{max(_dates)}</lastmod>" if _dates else ""
open(ROOT+"/sitemap.xml","w",encoding="utf-8").write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'+"".join(rows).replace("@@LM@@",_LMTAG)+"</urlset>\n")
pre=urlparse(BASE).path.rstrip("/")
open(ROOT+"/robots.txt","w",encoding="utf-8").write("User-agent: *\nAllow: /\n"+"".join(f"Disallow: {pre}/{x}\n" for x in ("login","id/login","en/login","ajukan","id/ajukan","en/ajukan","profil","id/profil","en/profil","pesan","id/pesan","en/pesan"))+f"Sitemap: {BASE}/sitemap.xml\n")

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
