# Ambil event terbit dari Supabase -> data/events.json (dipakai build.py untuk halaman statis per event + sitemap).
# Jalankan:  python3 tools/gen_events.py   lalu   python3 tools/build.py
# Memakai anon key dari js/config.js (aman: hanya membaca event berstatus published lewat RLS).
import os,re,json,urllib.request,urllib.parse
ROOT=os.path.join(os.path.dirname(__file__),"..")
cfg=open(ROOT+"/js/config.js",encoding="utf-8").read()
url=re.search(r'SUPABASE_URL:\s*"([^"]+)"',cfg).group(1).rstrip("/")
key=re.search(r'SUPABASE_ANON_KEY:\s*"([^"]+)"',cfg).group(1)
q=urllib.parse.urlencode({"select":"*,cities(name)","status":"eq.published","order":"event_date.asc","limit":"2000"},safe="*,()")
req=urllib.request.Request(f"{url}/rest/v1/events?{q}",headers={"apikey":key,"Authorization":"Bearer "+key})
rows=json.load(urllib.request.urlopen(req,timeout=60))
out=[]
for r in rows:
    r["city"]=(r.pop("cities",None) or {}).get("name")
    out.append(r)
os.makedirs(ROOT+"/data",exist_ok=True)
json.dump(out,open(ROOT+"/data/events.json","w",encoding="utf-8"),ensure_ascii=False,indent=1)
print(len(out),"event ->","data/events.json")
