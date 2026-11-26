# Halaman pengalih untuk Direktori Artis yang pindah ke artis.gowithdme.com.
# Dipanggil build.py: menulis id/a/<artis>.html, en/a/<artis>.html, dan indeksnya sebagai halaman kecil
# (canonical + meta refresh + JavaScript yang membawa ?query dan #hash) yang menuju alamat baru.
# GitHub Pages tidak bisa membuat redirect 301, jadi ini cara terdekat. Pertahankan beberapa bulan, lalu matikan:
# di tools/build.py ubah ARTIS_PENGALIH=True menjadi False; build berikutnya menghapus folder id/a dan en/a.
import os,shutil,html
MSG={"id":"Halaman ini sudah pindah ke","en":"This page has moved to"}
def _page(l,target,name):
    t=html.escape(target,quote=True); n=html.escape(name)
    return (f'<!DOCTYPE html><html lang="{l}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
            f'<title>{n} | GoWithDME</title><link rel="canonical" href="{t}"><meta http-equiv="refresh" content="0;url={t}">'
            f'<script>location.replace("{t}"+location.search+location.hash)</script></head>'
            f'<body><p>{MSG[l]} <a href="{t}">{t}</a></p></body></html>\n')
def tulis(root,l,artists,base,aktif=True):
    d=f"{root}/{l}/a"
    if not aktif:
        if os.path.isdir(d): shutil.rmtree(d)
        return
    os.makedirs(d,exist_ok=True)
    want={"index.html":_page(l,f"{base}/{l}/",{"id":"Artis","en":"Artists"}[l])}
    for a in artists.values(): want[f"{a['slug']}.html"]=_page(l,f"{base}/{l}/{a['slug']}",a["name"])
    for f in os.listdir(d):
        if f not in want: os.remove(f"{d}/{f}")
    for f,s in want.items():
        p=f"{d}/{f}"
        if os.path.exists(p) and open(p,encoding="utf-8").read()==s: continue  # tidak menyentuh file yang sama
        open(p,"w",encoding="utf-8").write(s)
