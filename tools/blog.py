# Pembuat halaman blog statis. Dipanggil build.py. Keluaran: blog/index.html, blog/<kategori>/index.html, blog/<kategori>/<alamat>.html
# Seluruh folder blog/ adalah HASIL BUILD: jangan edit tangan, tulis lewat Panel Admin > Blog.
import os,re,json,html as _h
from html.parser import HTMLParser
from datetime import datetime,timezone,timedelta
CATS=[("berita","Berita","Kabar dan sorotan terkini dari berbagai bidang."),
      ("opini","Opini & Cerita","Pendapat, catatan pribadi, dan cerita dari berbagai sudut pandang."),
      ("gaya-hidup","Gaya Hidup","Kebiasaan, tren, dan inspirasi untuk keseharian."),
      ("hiburan","Hiburan","Musik, film, budaya pop, dan segala yang seru."),
      ("wisata","Wisata","Destinasi, rute, dan cerita jalan-jalan."),
      ("teknologi","Teknologi","Gawai, aplikasi, internet, dan dunia digital."),
      ("tips","Tips & Panduan","Panduan praktis yang berguna sehari-hari."),
      ("panduan-konser","Panduan Konser","Panduan dan tips menonton konser dan festival."),
      ("tips-gunung","Tips Gunung","Persiapan, keselamatan, dan tips naik gunung."),
      ("review","Review","Ulasan konser, festival, produk, tempat, dan pengalaman."),
      ("komunitas","Komunitas","Cerita dan info dari komunitas GWM.")]
CATNAME={c[0]:c[1] for c in CATS}
WIB=timezone(timedelta(hours=7))
MON=["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"]
def esc(x): return _h.escape(str(x),quote=True)
def ldj(o): return '<script type="application/ld+json">'+json.dumps(o,ensure_ascii=False).replace("</","<\\/")+'</script>'
def pdate(s):
    if not s: return None
    try: return datetime.fromisoformat(s.replace("Z","+00:00")).astimezone(WIB)
    except Exception: return None
def fdate(s):
    d=pdate(s); return f"{d.day} {MON[d.month-1]} {d.year}" if d else ""
# ---- mode teks: ## judul, ### subjudul, - daftar, **tebal**, [teks](https://url), baris kosong = paragraf (HARUS sama dengan js/admin-blog.js) ----
def _inline(t):
    t=re.sub(r"\*\*(.+?)\*\*",r"<strong>\1</strong>",t)
    return re.sub(r"\[([^\]]+)\]\((https?://[^\s)]+)\)",r'<a href="\2" rel="noopener nofollow">\1</a>',t)
def text_to_html(body):
    out=[];para=[];lst=[]
    def fp():
        if para: out.append("<p>"+"<br>".join(_inline(esc(x)) for x in para)+"</p>"); para.clear()
    def fl():
        if lst: out.append("<ul>"+"".join("<li>"+_inline(esc(x))+"</li>" for x in lst)+"</ul>"); lst.clear()
    for line in body.replace("\r\n","\n").replace("\r","\n").split("\n"):
        if not line.strip(): fp();fl()
        elif line.startswith("## "): fp();fl();out.append("<h2>"+_inline(esc(line[3:].strip()))+"</h2>")
        elif line.startswith("### "): fp();fl();out.append("<h3>"+_inline(esc(line[4:].strip()))+"</h3>")
        elif line.startswith("- "): fp();lst.append(line[2:].strip())
        else: fl();para.append(line.strip())
    fp();fl();return "".join(out)
# ---- mode HTML: hanya tag aman; script/style/iframe dibuang; atribut hanya href pada <a> ----
OK={"p","br","h2","h3","h4","ul","ol","li","strong","b","em","i","u","a","blockquote","code","pre","hr","table","thead","tbody","tr","th","td"}
VOID={"br","hr"}
DROP={"script","style","iframe","object","embed","template","noscript","svg","math","form","textarea","select","button","head","title"}
def safe_href(v):
    v=re.sub(r"[\x00-\x20]+","",v or "")
    return v if re.match(r"(?i)^(https?://|mailto:|/|#|\./|\.\./)",v) else ""
class _San(HTMLParser):
    def __init__(s): super().__init__(convert_charrefs=True); s.o=[];s.stack=[];s.skip=0
    def handle_starttag(s,tag,attrs):
        if tag in DROP: s.skip+=1; return
        if s.skip or tag not in OK: return
        if tag=="a":
            h=safe_href(dict(attrs).get("href"))
            s.o.append(f'<a href="{esc(h)}" rel="noopener nofollow">' if h else "<a>"); s.stack.append(tag)
        elif tag in VOID: s.o.append(f"<{tag}>")
        else: s.o.append(f"<{tag}>"); s.stack.append(tag)
    def handle_startendtag(s,tag,attrs):
        if tag in VOID and not s.skip: s.o.append(f"<{tag}>")
    def handle_endtag(s,tag):
        if tag in DROP: s.skip=max(0,s.skip-1); return
        if s.skip or tag not in OK or tag in VOID or tag not in s.stack: return
        while s.stack:
            t=s.stack.pop(); s.o.append(f"</{t}>")
            if t==tag: break
    def handle_data(s,d):
        if not s.skip: s.o.append(esc(d))
    def result(s):
        while s.stack: s.o.append(f"</{s.stack.pop()}>")
        return "".join(s.o)
def sanitize(h):
    p=_San(); p.feed(h); p.close(); return p.result()
def render(post): return sanitize(post["body"]) if post.get("is_html") else text_to_html(post["body"])
def plain(h): return re.sub(r"\s+"," ",_h.unescape(re.sub(r"<[^>]+>"," ",h))).strip()
def excerpt(h,n=160):
    t=plain(h)
    return t if len(t)<=n else t[:n].rsplit(" ",1)[0].rstrip(",.;:- ")+"…"
# ---- halaman ----
def head(p,title,desc,canon,BASE,extra="",otype="website"):
    return f"""<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title><meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{esc(canon)}">
<meta property="og:type" content="{otype}"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(desc)}"><meta property="og:url" content="{esc(canon)}"><meta property="og:image" content="{BASE}/assets/og-image.png"><meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0E5A46"><link rel="icon" href="{p}assets/favicon.svg" type="image/svg+xml"><link rel="icon" href="{p}assets/favicon-32.png" sizes="32x32" type="image/png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="{p}js/theme.js"></script><link rel="stylesheet" href="{p}css/style.css"><link rel="stylesheet" href="{p}css/blog.css">{extra}</head>"""
def top(p,cur):
    chips=f'<a href="{p}blog/"'+(' aria-current="page"' if cur=="" else "")+'>Semua</a>'+"".join(
        f'<a href="{p}blog/{k}/"'+(' aria-current="page"' if cur==k else "")+f'>{esc(n)}</a>' for k,n,_ in CATS)
    return f"""<body class="bl"><header class="bl-top"><div class="wrap"><a class="logo" href="{p}id/"><img src="{p}assets/favicon.svg" alt="" width="24" height="24">GWM</a><span class="sp"></span><a class="bl-l" href="{p}blog/">Blog</a><a class="bl-l" href="{p}id/event">Event</a><a class="bl-l" href="{p}id/gunung">Gunung</a></div></header>
<nav class="bl-cats wrap" aria-label="Kategori blog">{chips}</nav>"""
FOOT='<footer class="bl-foot wrap"><span>GWM oleh Jurkon Studio</span><a href="{p}id/bantuan">Bantuan</a><a href="{p}id/terms">Syarat</a><a href="{p}id/privacy">Privasi</a></footer><script src="{{rel}}js/config.js"></script><script src="{{rel}}js/blog-live.js"></script></body></html>'
def card(p,x):
    return (f'<article class="bl-card"><h2><a href="{p}blog/{x["category"]}/{x["slug"]}">{esc(x["title"])}</a></h2>'
            f'<p class="bl-meta"><span>{esc(CATNAME[x["category"]])}</span> · <time datetime="{esc((x.get("published_at") or "")[:10])}">{fdate(x.get("published_at"))}</time></p>'
            f'<p>{esc(x["_ex"])}</p></article>')
def listing(p,cur,posts,BASE):
    name=CATNAME.get(cur,"Blog"); desc=next((d for k,n,d in CATS if k==cur),"Cerita, kabar, dan tips seputar hiburan, wisata, petualangan, gaya hidup, teknologi, dan banyak lagi.")
    canon=f"{BASE}/blog/"+(cur+"/" if cur else "")
    if cur=="" and posts:
        body="".join(f'<section class="bl-sec"><p class="bl-sh"><a href="{p}blog/{k}/">{esc(n)}</a><span>{len(l)}</span></p>'+"".join(card(p,x) for x in l[:3])+(f'<a class="bl-more" href="{p}blog/{k}/">Lihat semua {esc(n)} →</a>' if len(l)>3 else "")+'</section>' for k,n,_ in CATS for l in [[x for x in posts if x["category"]==k]] if l)
    else: body="".join(card(p,x) for x in posts) or '<p class="bl-empty">Belum ada tulisan di sini.</p>'
    ld=ldj({"@context":"https://schema.org","@type":"CollectionPage","name":f"{name} – Blog GWM","url":canon,"inLanguage":"id"})
    return head(p,f"{name} – Blog GWM",desc,canon,BASE,ld)+top(p,cur)+f'<main class="wrap bl-main"><h1>{esc(name)}</h1><p class="bl-sub">{esc(desc)}</p><div class="bl-list">{body}</div></main>'+FOOT.format(p=p)
def article(p,x,others,BASE):
    k=x["category"]; canon=f"{BASE}/blog/{k}/{x['slug']}"; ex=x["_ex"]; mins=max(1,round(len(plain(x["_html"]).split())/200))
    ld=ldj({"@context":"https://schema.org","@graph":[
      {"@type":"BlogPosting","headline":x["title"],"description":ex,"inLanguage":"id","articleSection":CATNAME[k],"mainEntityOfPage":canon,"url":canon,
       "datePublished":x.get("published_at"),"dateModified":x.get("updated_at") or x.get("published_at"),
       "author":{"@type":"Organization","name":"GWM (GoWithDme)","url":f"{BASE}/id/"},
       "publisher":{"@type":"Organization","name":"GWM (GoWithDme)","logo":{"@type":"ImageObject","url":f"{BASE}/assets/icon-512.png"}}},
      {"@type":"BreadcrumbList","itemListElement":[
        {"@type":"ListItem","position":1,"name":"Blog","item":f"{BASE}/blog/"},
        {"@type":"ListItem","position":2,"name":CATNAME[k],"item":f"{BASE}/blog/{k}/"},
        {"@type":"ListItem","position":3,"name":x["title"],"item":canon}]}]})
    more="".join(card(p,o) for o in others)
    return (head(p,f"{x['title']} – Blog GWM",ex,canon,BASE,ld,"article")+top(p,k)+
      f'<main class="wrap bl-main bl-art"><nav class="bl-bc"><a href="{p}blog/">Blog</a> › <a href="{p}blog/{k}/">{esc(CATNAME[k])}</a></nav>'
      f'<article><h1>{esc(x["title"])}</h1><p class="bl-meta"><span>{esc(CATNAME[k])}</span> · <time datetime="{esc((x.get("published_at") or "")[:10])}">{fdate(x.get("published_at"))}</time> · {mins} menit baca</p>'
      f'<div class="bl-body">{x["_html"]}</div></article>'
      f'<p class="bl-cta"><a class="btn" href="{p}id/event">Lihat event terbaru</a></p>'
      +(f'<section class="bl-more"><h2>Tulisan lain di {esc(CATNAME[k])}</h2><div class="bl-list">{more}</div></section>' if more else "")+"</main>"+FOOT.format(p=p))
def build(ROOT,BASE,posts):
    """Tulis blog/**. Mengembalikan [(url,lastmod)] untuk sitemap."""
    b=ROOT+"/blog"
    for dp,_,fs in os.walk(b) if os.path.isdir(b) else []:
        for f in fs:
            if f.endswith(".html"): os.remove(os.path.join(dp,f))
    for k,_,_ in CATS: os.makedirs(f"{b}/{k}",exist_ok=True)
    ok=[]
    for x in posts:
        if x.get("category") not in CATNAME or not re.match(r"^[a-z0-9]+(-[a-z0-9]+)*$",x.get("slug") or "") or not x.get("title") or not x.get("body"): print("lewati tulisan tidak valid:",x.get("slug")); continue
        x["_html"]=render(x); x["_ex"]=excerpt(x["_html"]); ok.append(x)
    ok.sort(key=lambda x:x.get("published_at") or "",reverse=True)
    urls=[]
    open(b+"/index.html","w",encoding="utf-8").write(listing("../",  "",ok,BASE)); urls.append((f"{BASE}/blog/",ok[0].get("updated_at") if ok else None))
    for k,_,_ in CATS:
        l=[x for x in ok if x["category"]==k]
        open(f"{b}/{k}/index.html","w",encoding="utf-8").write(listing("../../",k,l,BASE)); urls.append((f"{BASE}/blog/{k}/",l[0].get("updated_at") if l else None))
        for x in l:
            others=[o for o in l if o is not x][:3]
            open(f"{b}/{k}/{x['slug']}.html","w",encoding="utf-8").write(article("../../",x,others,BASE))
            urls.append((f"{BASE}/blog/{k}/{x['slug']}",x.get("updated_at") or x.get("published_at")))
    return urls
