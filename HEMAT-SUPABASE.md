# Jaga aktif dan hemat egress Supabase (paket gratis)

Batas gratis yang relevan: egress 5 GB/bulan, database 500 MB, proyek **dijeda setelah 7 hari tanpa aktivitas**.

## 1. Penjaga aktif — `.github/workflows/jaga-aktif.yml`
- Tiap hari 09:23 WIB memanggil Supabase dua kali (`events` dan `cities`, masing-masing 1 baris, ± 100 byte). Tanpa secret: memakai anon key publik di `js/config.js`.
- Gagal (Supabase tidak menjawab, biasanya karena dijeda): GitHub mengirim email "workflow gagal" **dan** membuka issue "Supabase tidak menjawab". Pulihkan di dashboard Supabase > **Restore project**.
- Menyalakan ulang `sinkron.yml` dan `jaga-aktif.yml` lewat API tiap hari. GitHub mematikan workflow terjadwal di repo yang 60 hari tanpa aktivitas; ini mencegahnya.
- Uji sekarang: tab **Actions > Jaga aktif > Run workflow**. Ringkasan hasil muncul di halaman run.
- Catatan: `sinkron.yml` (tiap 3 jam) sudah ikut menyentuh Supabase lewat `gen_events.py`. Penjaga ini sabuk pengaman kedua dan pemberi peringatan.

## 2. Hemat egress
| Perubahan | Berkas | Efek |
|---|---|---|
| Satu unduhan daftar event dipakai bersama oleh halaman dan pencarian (dulu masing-masing `select=*`) | `js/events-src.js`, `app.js`, `search.js` | -50% egress event saat pencarian dibuka |
| Simpan 5 menit di `sessionStorage` | `js/events-src.js` | pindah halaman tidak mengunduh ulang |
| Cadangan otomatis ke `data/events.json` bila Supabase gagal/dijeda (dulu: data contoh) | `js/events-src.js` | situs tetap menampilkan event asli |
| Blog: daftar ringan dulu, isi tulisan hanya untuk tulisan yang belum ada kartu statisnya (dulu: isi 200 tulisan tiap kunjungan) | `js/blog-live.js` | egress blog turun drastis saat tulisan bertambah |
| Poster unggahan di-cache browser 1 tahun (dulu 1 jam) | `admin.js`, `admin-ux.js`, `ajukan.js` | poster di Storage tidak diunduh ulang |
| Alat pindahkan poster dari Storage ke repo | `tools/pindah_poster.py` | poster dilayani GitHub Pages, bukan Supabase |
| Kolom event dipilih eksplisit (bukan `*`) | `js/events-src.js` (`COLS`) | kecil hari ini (±1%), melindungi saat tabel melebar |

Bug blog yang ikut dibereskan: `openReader(hit)` mengirim array (judul tulisan baru tampil "undefined") dan penghapusan kartu memakai kunci yang salah.

### Tombol "0 egress" untuk event
Di `js/config.js`: `EVENTS_SOURCE: "static"` membuat halaman membaca `data/events.json` dulu (Supabase hanya cadangan). Konsekuensi: event baru tampil paling lama 3 jam kemudian (atau segera setelah Anda menjalankan **Actions > Sinkron konten**). Default `"live"`. Pertimbangkan `"static"` bila egress di dashboard sudah di atas ±70% (3,5 GB).

### Memindahkan poster dari Storage
```
python3 tools/gen_events.py
python3 tools/pindah_poster.py     # unduh ke assets/posters/ + buat supabase/poster_pindah_repo.sql
git add -A && git commit -m "Pindah poster ke repo" && git push
# lalu jalankan supabase/poster_pindah_repo.sql di SQL Editor (setelah push selesai)
```
Hari ini hanya 1 poster di Storage; sisanya hotlink ke situs lain atau sudah di repo.

## 3. Pantau
Dashboard Supabase > **Settings > Usage**: egress, ukuran database. Pertimbangkan Pro saat database ±400 MB atau egress rutin >70%.
