# Hapus poster di repo (assets/posters/) yang event-nya sudah tidak ada.
# Dipanggil dari .github/workflows/sinkron.yml setelah gen_events.py (data/events.json = event terbit yang masih hidup).
# Halaman statis per event (id/e, en/e) dan kartu og/ sudah dibersihkan sendiri oleh build.py / gen_og.py.
#
# Aturan: berkas assets/posters/* dihapus bila TIDAK dipakai poster_url event mana pun di data/events.json
#         DAN sudah ada di git lebih dari GRACE hari (default 60) -> poster yang baru Anda taruh untuk event draft aman.
# Pakai:  python3 tools/bersih_lama.py            (hapus)
#         python3 tools/bersih_lama.py --dry      (hanya tampilkan)
#         env GWM_GRACE_HARI=30 untuk mengubah masa tenggang; --root <folder> untuk uji coba.
import os, sys, json, time, subprocess

ROOT = os.path.abspath(sys.argv[sys.argv.index("--root") + 1]) if "--root" in sys.argv else os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DRY = "--dry" in sys.argv
GRACE = int(os.environ.get("GWM_GRACE_HARI", "60")) * 86400
DIR = os.path.join(ROOT, "assets", "posters")
EV = os.path.join(ROOT, "data", "events.json")

if not os.path.isdir(DIR):
    print("bersih_lama: tidak ada assets/posters, lewati."); sys.exit(0)
try:
    events = json.load(open(EV, encoding="utf-8"))
except Exception as x:
    print("bersih_lama: data/events.json tidak terbaca (%s), lewati agar tidak salah hapus." % x); sys.exit(0)
if not events:
    print("bersih_lama: daftar event kosong (kemungkinan gangguan), lewati agar tidak salah hapus."); sys.exit(0)

dipakai = set()
for e in events:
    u = (e.get("poster_url") or "").split("?")[0]
    if u.startswith("assets/posters/"):
        dipakai.add(os.path.basename(u))


def umur_git(nama):
    """Detik sejak berkas pertama kali masuk git; None bila tidak diketahui (dianggap baru -> dipertahankan)."""
    try:
        out = subprocess.run(["git", "-C", ROOT, "log", "--diff-filter=A", "--format=%ct", "--", "assets/posters/" + nama],
                             capture_output=True, text=True, timeout=30).stdout.split()
        return time.time() - int(out[-1]) if out else None
    except Exception:
        return None


hapus = baru = 0
for f in sorted(os.listdir(DIR)):
    p = os.path.join(DIR, f)
    if not os.path.isfile(p) or f in dipakai:
        continue
    umur = umur_git(f)
    if umur is None or umur < GRACE:
        baru += 1
        print("TAHAN ", f, "(baru/tidak diketahui umurnya)")
        continue
    print(("AKAN HAPUS " if DRY else "HAPUS ") + f)
    if not DRY:
        os.remove(p)
    hapus += 1
print(f"bersih_lama: {hapus} poster {'akan dihapus' if DRY else 'dihapus'}, {baru} ditahan, {len(dipakai)} masih dipakai.")
