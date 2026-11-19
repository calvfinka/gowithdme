# Cek kelengkapan data event per kota. Hanya MEMBACA data/events.json, tidak mengubah apa pun.
# Pakai:  python3 tools/cek_data.py Bandung          (satu kota)
#         python3 tools/cek_data.py                  (semua kota, ringkas)
# Tambah  --sql  untuk mencetak kerangka UPDATE (isi nilainya sendiri lalu jalankan di Supabase SQL Editor).
import json,os,sys
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)),"..")
ev=json.load(open(os.path.join(ROOT,"data","events.json"),encoding="utf-8"))
args=[a for a in sys.argv[1:] if not a.startswith("--")]; sql="--sql" in sys.argv
city=args[0].lower() if args else None
def kosong(v): return v is None or str(v).strip()==""
def belum(v): return kosong(v) or "menyusul" in str(v).lower()
def cek(e):
    m=[]
    p=e.get("poster_url") or ""
    if kosong(p): m.append("poster")
    elif p.startswith("http") and "supabase.co" not in p: m.append("poster-hotlink")
    if belum(e.get("price_label")): m.append("harga")
    if kosong(e.get("genre")): m.append("genre")
    if e.get("category")!="pameran" and belum(e.get("lineup")): m.append("lineup")
    if kosong(e.get("ticket_url")): m.append("tiket")
    if len(e.get("description") or "")<80: m.append("deskripsi")
    return m
rows=[(e,cek(e)) for e in ev if (not city or (e.get("city") or "").lower()==city)]
rows.sort(key=lambda r:r[0].get("event_date") or "")
if not city:
    from collections import Counter
    c=Counter();t=Counter()
    for e,m in rows:
        k=e.get("city") or "?";t[k]+=1;c[k]+=bool([x for x in m if x!="poster-hotlink"])
    for k,n in t.most_common(15): print(f"{k:16}{n:4} event, {c[k]:3} belum lengkap")
    sys.exit()
hit=0
for e,m in rows:
    wajib=[x for x in m if x!="poster-hotlink"]
    print(("KURANG " if wajib else "LENGKAP ")+e["event_date"]+"  "+e["slug"])
    if m: print("        perlu:",", ".join(m))
    if sql and wajib:
        hit+=1;print(f"-- {e['title']}\nupdate events set price_label='', genre='', lineup='', description='' where slug='{e['slug']}';")
print(f"\n{len(rows)} event, {sum(1 for _,m in rows if [x for x in m if x!='poster-hotlink'])} belum lengkap.")
