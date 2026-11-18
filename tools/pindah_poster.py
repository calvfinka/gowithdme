# Pindahkan poster dari Supabase Storage ke repo (GitHub Pages) agar tidak memakan egress Supabase.
# Langkah:  python3 tools/pindah_poster.py   ->  unduh ke assets/posters/ dan buat supabase/poster_pindah_repo.sql
#           lalu jalankan SQL itu di Supabase SQL Editor, dan  git add -A && git commit && git push.
# Sumber daftar: data/events.json (diisi tools/gen_events.py). Poster dari situs lain (infokonser, artatix, dll) tidak disentuh.
# Opsi:  --data <berkas.json>  untuk daftar lain (uji coba).
import os, re, sys, json, urllib.request, urllib.parse

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
data = sys.argv[sys.argv.index("--data") + 1] if "--data" in sys.argv else os.path.join(ROOT, "data", "events.json")
MARK = "/storage/v1/object/public/posters/"
MAKS = 8 * 1024 * 1024
OUT = os.path.join(ROOT, "assets", "posters")
os.makedirs(OUT, exist_ok=True)

def sql(s): return "'" + str(s).replace("'", "''") + "'"

baris, ok, gagal = [], 0, 0
for e in json.load(open(data, encoding="utf-8")):
    u = e.get("poster_url") or ""
    if MARK not in u or not e.get("slug"):
        continue
    ext = os.path.splitext(urllib.parse.urlparse(u).path)[1].lower()
    ext = ext if re.fullmatch(r"\.(jpg|jpeg|png|webp|gif)", ext) else ".jpg"
    rel = f"assets/posters/{e['slug']}{ext}"
    dst = os.path.join(ROOT, rel)
    try:
        if not os.path.exists(dst):
            req = urllib.request.Request(u, headers={"User-Agent": "gwm-pindah-poster"})
            with urllib.request.urlopen(req, timeout=60) as r:
                if not (r.headers.get("Content-Type", "").startswith("image/")):
                    raise ValueError("bukan gambar: " + r.headers.get("Content-Type", "?"))
                b = r.read(MAKS + 1)
                if len(b) > MAKS:
                    raise ValueError("lebih dari 8 MB")
            open(dst, "wb").write(b)
        baris.append(f"update events set poster_url={sql(rel)}\nwhere id={sql(e['id'])};  -- {e['slug']}")
        ok += 1
        print("OK    ", rel)
    except Exception as x:
        gagal += 1
        print("GAGAL ", e["slug"], "->", x)

if baris:
    open(os.path.join(ROOT, "supabase", "poster_pindah_repo.sql"), "w", encoding="utf-8").write(
        "-- Dibuat tools/pindah_poster.py: poster Supabase Storage -> berkas di repo (assets/posters/).\n"
        "-- Jalankan SETELAH berkasnya di-push ke GitHub, supaya tidak ada jeda gambar hilang.\n\n" + "\n\n".join(baris) + "\n")
print(f"\n{ok} poster dipindah, {gagal} gagal." + (" SQL: supabase/poster_pindah_repo.sql" if baris else " Tidak ada poster di Supabase Storage."))
sys.exit(1 if gagal else 0)
