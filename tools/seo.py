# Lapisan SEO / data terstruktur untuk tools/build.py.
# Tujuan: mesin pencari dan asisten AI (Google, Bing, Naver, Felo, ChatGPT, Perplexity, dst.) bisa menjawab
# "apa itu GoWithDME" langsung dari data yang rapi, bukan menebak dari potongan teks.
# Semua fakta di sini diambil dari yang sudah tertulis di situs (Tentang, Bantuan, Syarat, loc_sub). Tidak ada klaim baru.
import json,re

def ldj(o):
    return '<script type="application/ld+json">'+json.dumps(o,ensure_ascii=False,separators=(",",":")).replace("</","<\\/")+'</script>'

ROBOTS_META='<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">'

# kalimat definisi: dipakai di Organization.description, llms.txt, dan deskripsi meta beranda
DEF={
 "id":"GoWithDME adalah portal informasi dan komunitas untuk konser, festival, pameran, dan open trip naik gunung di kota-kota Indonesia, dengan fitur cari teman jalan (ajakan barengan) dan komunitas per kota. GoWithDME bukan penjual tiket dan bukan penyelenggara acara.",
 "en":"GoWithDME is an information and community portal for concerts, festivals, expos, and hiking trips in cities across Indonesia, with features for finding travel companions (meet-up invites) and per-city communities. GoWithDME is not a ticket seller and not an event organizer.",
}
ALT=["GoWithDME.com","Go With DME"]
KNOWS={"id":["Konser di Indonesia","Festival musik di Indonesia","Pendakian gunung di Indonesia","Open trip naik gunung","Cari teman nonton konser"],
       "en":["Concerts in Indonesia","Music festivals in Indonesia","Mountain hiking in Indonesia","Hiking open trips","Finding friends for concerts"]}
CRUMB={"id":"Beranda","en":"Home"}

def entity(BASE,l,owner,social,email,extra_same=()):
    org_id=f"{BASE}/#organization"; web_id=f"{BASE}/#website"; per_id=f"{BASE}/#founder"
    return [
      {"@type":"Organization","@id":org_id,"name":"GoWithDME","alternateName":ALT,"url":f"{BASE}/{l}/",
       "description":DEF[l],"slogan":{"id":"Pergi sendiri? Cari teman jalan.","en":"Going solo? Find someone to go with."}[l],
       "logo":{"@type":"ImageObject","url":f"{BASE}/assets/icon-512.png","width":512,"height":512},
       "image":f"{BASE}/assets/og-image{'' if l=='id' else '-en'}.png",
       "areaServed":{"@type":"Country","name":"Indonesia"},"knowsAbout":KNOWS[l],
       "sameAs":list(extra_same),"founder":{"@id":per_id},
       "contactPoint":[{"@type":"ContactPoint","contactType":"customer support","email":email,"availableLanguage":["id","en"],"areaServed":"ID"}]},
      {"@type":"Person","@id":per_id,"name":owner,"jobTitle":"Founder","worksFor":{"@id":org_id},"sameAs":[u for _,u in social]},
      {"@type":"WebSite","@id":web_id,"name":"GoWithDME","alternateName":ALT,"url":f"{BASE}/{l}/","inLanguage":l,"description":DEF[l],
       "publisher":{"@id":org_id},
       "potentialAction":{"@type":"SearchAction","target":{"@type":"EntryPoint","urlTemplate":f"{BASE}/{l}/event?q={{search_term_string}}"},"query-input":"required name=search_term_string"}},
    ]

def webpage(BASE,l,p,url,title,desc,wtype="WebPage",main=None,crumbs=()):
    """Satu node halaman + BreadcrumbList. crumbs: [(nama, url), ...] setelah Beranda."""
    node={"@type":wtype,"@id":url+"#webpage","url":url,"name":title,"description":desc,"inLanguage":l,
          "isPartOf":{"@type":"WebSite","@id":f"{BASE}/#website","name":"GoWithDME","url":f"{BASE}/{l}/"},
          "about":{"@type":"Organization","@id":f"{BASE}/#organization","name":"GoWithDME"},
          "publisher":{"@type":"Organization","@id":f"{BASE}/#organization","name":"GoWithDME"}}
    if main: node["mainEntity"]=main
    out=[node]
    if p!="index":
        items=[(CRUMB[l],f"{BASE}/{l}/")]+list(crumbs)+[(title,url)]
        out.append({"@type":"BreadcrumbList","@id":url+"#breadcrumb","itemListElement":[{"@type":"ListItem","position":i+1,"name":n,"item":u} for i,(n,u) in enumerate(items)]})
        node["breadcrumb"]={"@id":url+"#breadcrumb"}
    return out

def faq_node(url,qa):
    return {"@type":"FAQPage","@id":url+"#faq","mainEntity":[{"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}} for q,a in qa]}

def event_itemlist(BASE,l,url,events,title_of,limit=50):
    return {"@type":"ItemList","@id":url+"#upcoming","name":{"id":"Event mendatang di GoWithDME","en":"Upcoming events on GoWithDME"}[l],
            "numberOfItems":min(len(events),limit),"itemListOrder":"https://schema.org/ItemListOrderAscending",
            "itemListElement":[{"@type":"ListItem","position":i+1,"url":f"{BASE}/{l}/e/{e['slug']}","name":title_of(e)} for i,e in enumerate(events[:limit])]}

def og_block(BASE,l,url,title,desc,img):
    q=lambda s:s.replace("&","&amp;").replace('"',"&quot;")
    return (f'<meta property="og:type" content="website"><meta property="og:site_name" content="GoWithDME"><meta property="og:locale" content="{"id_ID" if l=="id" else "en_US"}">'
            f'<meta property="og:url" content="{url}"><meta property="og:title" content="{q(title)}"><meta property="og:description" content="{q(desc)}">'
            f'<meta property="og:image" content="{img}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">'
            f'<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{q(title)}"><meta name="twitter:description" content="{q(desc)}"><meta name="twitter:image" content="{img}">')

def ascii_safe(t):
    """GitHub Pages mengirim .txt tanpa charset, sehingga browser/crawler bisa salah baca UTF-8 (tanda hubung jadi 'â€”'). Jadi llms.txt dibuat ASCII murni."""
    import unicodedata
    t=t.translate({0x2014:"-",0x2013:"-",0x2018:"'",0x2019:"'",0x201c:'"',0x201d:'"',0x00b7:"-",0x2026:"..."})
    return unicodedata.normalize("NFKD",t).encode("ascii","ignore").decode()

def llms_txt(BASE,owner,email,events,fmt_date,title_of,pages):
    """/llms.txt: ringkasan situs untuk asisten AI (usulan llmstxt.org). Dibuat ulang tiap build, jadi daftar event selalu segar."""
    L=[]
    L.append("# GoWithDME")
    L.append("")
    L.append("> "+DEF["en"])
    L.append("> "+DEF["id"])
    L.append("")
    L.append("Also written: GoWithDME.com, Go With DME. Not affiliated with other brands with similar names (for example GoWithGuide, GoWit, GoFundMe, GoTo). Official domain: gowithdme.com. Languages: Indonesian (/id/) and English (/en/).")
    L.append("")
    L.append("## Key facts")
    L.append("- Coverage: 38 provinces and 120+ cities/regencies in Indonesia (filter by macro-region, province, city, or nearby radius).")
    L.append("- Content: concerts, festivals, expos, and hiking open trips, curated in one place with date, venue, price, line-up, and official ticket link.")
    L.append("- Features: event search, Dea AI (assistant for event questions), meet-up invites (find company to attend an event), per-city communities, hiking packing checklist and cost splitter.")
    L.append("- GoWithDME does NOT sell tickets, does NOT organize events, and is NOT a party to any transaction. Buy tickets only from the official seller or organizer.")
    L.append(f"- Founder and operator: {owner}. Privacy policy follows Indonesia's Personal Data Protection Law (Law No. 27/2022).")
    L.append(f"- Contact: {email} (replies usually within 24 hours).")
    L.append("- Origin: the founder attended a music festival alone, felt lost in the crowd, and built GoWithDME so people can find companions.")
    L.append("")
    L.append("## Main pages (English)")
    for k,(t,d) in pages["en"].items(): L.append(f"- [{t}]({BASE}/en/{k}): {d}")
    L.append("")
    L.append("## Halaman utama (Indonesia)")
    for k,(t,d) in pages["id"].items(): L.append(f"- [{t}]({BASE}/id/{k}): {d}")
    L.append("")
    L.append("## Related sites")
    L.append("- [Artists index](https://artis.gowithdme.com/en/): concert dates per artist")
    L.append("- [Blog](https://blog.gowithdme.com): articles and guides")
    L.append("")
    L.append("## Upcoming events (auto-generated each build)")
    for e in events: L.append(f"- [{title_of(e)}]({BASE}/en/e/{e['slug']}): {fmt_date(e)}")
    L.append("")
    L.append("## Machine-readable")
    L.append(f"- [Sitemap]({BASE}/sitemap.xml)")
    L.append(f"- [Event data (JSON)]({BASE}/data/events.json)")
    L.append("")
    return ascii_safe("\n".join(L))
