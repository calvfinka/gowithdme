# Penjaga aktif Supabase: satu permintaan baca kecil agar proyek gratis tidak dijeda (7 hari tanpa aktivitas).
# Dipakai oleh .github/workflows/jaga-aktif.yml. Bisa juga dijalankan tangan:  python3 tools/jaga_aktif.py
# Memakai anon key publik dari js/config.js (hanya membaca baris event yang sudah terbit, dilindungi RLS).
# Bisa ditimpa lewat env SUPABASE_URL / SUPABASE_ANON_KEY. Keluar dengan kode 1 bila Supabase tidak menjawab,
# supaya GitHub mengirim email "workflow gagal" dan workflow membuka issue peringatan.
import os, re, sys, time, json, urllib.request, urllib.error

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
cfg = open(os.path.join(ROOT, "js", "config.js"), encoding="utf-8").read()
url = (os.environ.get("SUPABASE_URL") or re.search(r'SUPABASE_URL:\s*"([^"]+)"', cfg).group(1)).rstrip("/")
key = os.environ.get("SUPABASE_ANON_KEY") or re.search(r'SUPABASE_ANON_KEY:\s*"([^"]+)"', cfg).group(1)

# Dua bacaan kecil (± 100 byte). Keduanya benar-benar menjalankan query ke database, bukan hanya mengetuk gerbang API.
CEK = ["events?select=id&limit=1", "cities?select=id&limit=1"]
JEDA = [0, 8, 25]          # percobaan ulang: langsung, +8 dtk, +25 dtk

def ping(path):
    req = urllib.request.Request(f"{url}/rest/v1/{path}",
                                 headers={"apikey": key, "Authorization": "Bearer " + key, "User-Agent": "gwm-jaga-aktif"})
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=30) as r:
        body = json.load(r)
        if not isinstance(body, list):
            raise ValueError("jawaban bukan daftar")
        return r.status, len(body), round((time.time() - t0) * 1000)

def coba(path):
    err = ""
    for i, d in enumerate(JEDA, 1):
        time.sleep(d)
        try:
            st, n, ms = ping(path)
            return True, f"HTTP {st}, {n} baris, {ms} ms"
        except urllib.error.HTTPError as e:
            err = f"HTTP {e.code} {e.reason}"
        except Exception as e:                      # DNS gagal, timeout, TLS, JSON rusak
            err = f"{type(e).__name__}: {e}"
        print(f"  percobaan {i}/{len(JEDA)} gagal: {err}")
    return False, err

hasil, gagal = [], 0
for p in CEK:
    ok, info = coba(p)
    gagal += 0 if ok else 1
    hasil.append((p, ok, info))
    print(("OK    " if ok else "GAGAL ") + p + " -> " + info)

ringkas = os.environ.get("GITHUB_STEP_SUMMARY")
if ringkas:
    with open(ringkas, "a", encoding="utf-8") as f:
        f.write("### Penjaga aktif Supabase\n\n| Cek | Hasil | Rincian |\n|---|---|---|\n")
        for p, ok, info in hasil:
            f.write(f"| `{p}` | {'OK' if ok else 'GAGAL'} | {info} |\n")

if gagal == len(CEK):
    print("\nSupabase tidak menjawab. Penyebab paling umum: proyek gratis DIJEDA (tidak ada aktivitas 7 hari).\n"
          "Buka https://supabase.com/dashboard > proyek GoWithDME > tombol 'Restore project'. Data tetap aman.")
    sys.exit(1)
if gagal:
    print("\nSebagian cek gagal. Proyek hidup, tetapi periksa tabel/RLS yang gagal di atas.")
    sys.exit(1)
