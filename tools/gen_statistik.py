# Ambil statistik konser terverifikasi dari Supabase (fungsi stat_publik) -> data/statistik.json (dipakai build.py untuk halaman /statistik).
# Selama sakelar 'publik' di Supabase masih 'false', hasilnya {"aktif": false} dan halaman tidak dibuat.
# Bila pengambilan gagal (fungsi belum dipasang, jaringan), berkas lama DIPERTAHANKAN dan skrip keluar tanpa error.
# Jalankan:  python3 tools/gen_statistik.py   lalu   python3 tools/build.py
import os,re,json,urllib.request,urllib.error
ROOT=os.path.join(os.path.dirname(__file__),"..")
OUT=ROOT+"/data/statistik.json"
cfg=open(ROOT+"/js/config.js",encoding="utf-8").read()
url=re.search(r'SUPABASE_URL:\s*"([^"]+)"',cfg).group(1).rstrip("/")
key=re.search(r'SUPABASE_ANON_KEY:\s*"([^"]+)"',cfg).group(1)
req=urllib.request.Request(f"{url}/rest/v1/rpc/stat_publik",data=b"{}",method="POST",
    headers={"apikey":key,"Authorization":"Bearer "+key,"Content-Type":"application/json"})
try:
    d=json.load(urllib.request.urlopen(req,timeout=60))
    if not isinstance(d,dict) or "aktif" not in d: raise ValueError("bentuk data tidak dikenal")
except Exception as e:
    print("statistik: gagal mengambil (",e,") -> berkas lama dipertahankan"); raise SystemExit(0)
os.makedirs(ROOT+"/data",exist_ok=True)
json.dump(d,open(OUT,"w",encoding="utf-8"),ensure_ascii=False,separators=(",",":"))
print("statistik:", "aktif, "+str(d.get("n",0))+" event terverifikasi" if d.get("aktif") else "belum aktif","->","data/statistik.json")
