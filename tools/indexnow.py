# Beri tahu mesin pencari (Bing, Naver, Yandex, dst. lewat IndexNow) tentang halaman yang baru/berubah.
# Dipakai workflow Sinkron konten setelah commit. Google tidak mendukung IndexNow: untuk Google tetap kirim sitemap.xml di Search Console.
# Pakai:  python3 tools/indexnow.py            (URL dari berkas yang berubah di commit terakhir)
#         python3 tools/indexnow.py --dry      (cetak saja, tidak kirim)
#         python3 tools/indexnow.py --all      (semua URL di sitemap.xml)
# Kunci = nama berkas <kunci>.txt di akar situs (isinya kunci itu sendiri). Boleh diganti: hapus berkas lama, buat yang baru.
import glob,json,os,re,subprocess,sys,time,urllib.request
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)),"..")
BASE=os.environ.get("GWM_SITE","https://gowithdme.com").rstrip("/")
HOST=re.sub(r"^https?://","",BASE).split("/")[0]
def key():
    for f in glob.glob(ROOT+"/*.txt"):
        n=os.path.basename(f)[:-4]
        if re.fullmatch(r"[0-9a-f]{32}",n) and open(f).read().strip()==n: return n
    sys.exit("indexnow: berkas kunci <32-hex>.txt tidak ditemukan di akar situs")
def changed():
    out=subprocess.run(["git","diff","--name-only","HEAD~1","HEAD"],cwd=ROOT,capture_output=True,text=True).stdout.split()
    urls=[]
    for f in out:
        m=re.fullmatch(r"(id|en)/(e/[\w.-]+|[\w-]+)\.html",f)
        if not m: continue
        l,p=m.groups(); urls.append(f"{BASE}/{l}/"+("" if p=="index" else p))
    return urls
def main():
    k=key()
    if "--all" in sys.argv: urls=re.findall(r"<loc>([^<]+)</loc>",open(ROOT+"/sitemap.xml",encoding="utf-8").read())
    else: urls=changed()
    urls=sorted(set(urls))[:10000]
    if not urls: print("indexnow: tidak ada URL berubah"); return
    print(f"indexnow: {len(urls)} URL")
    if "--dry" in sys.argv: print("\n".join(urls[:20])); return
    time.sleep(int(os.environ.get("INDEXNOW_WAIT","120")))  # beri waktu GitHub Pages selesai menayangkan halaman baru
    body=json.dumps({"host":HOST,"key":k,"keyLocation":f"{BASE}/{k}.txt","urlList":urls}).encode()
    req=urllib.request.Request("https://api.indexnow.org/indexnow",data=body,headers={"Content-Type":"application/json; charset=utf-8"})
    try: print("indexnow: HTTP",urllib.request.urlopen(req,timeout=30).status)
    except Exception as e: print("indexnow: gagal (tidak fatal):",e)
main()
