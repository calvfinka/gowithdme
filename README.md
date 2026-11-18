# GWM (Go With Me) — oleh Jurkon Studio

Portal info konser, festival, dan naik gunung, plus cari teman jalan dan komunitas per kota. Situs statis di **GitHub Pages** dengan backend **Supabase** (paket gratis). Dua bahasa: Indonesia (`/id/`) dan Inggris (`/en/`).

Alamat sekarang: `https://calvfinka.github.io/gowithdme`. Domain `gowithdme.com` belum aktif (lihat "Pindah domain").

## Isi repo
```
id/ en/              halaman publik (DIBUAT OTOMATIS oleh tools/build.py, jangan edit tangan)
id/e/ en/e/          satu halaman statis per event (untuk Google)
blog/<kategori>/     halaman blog statis (dibuat dari data/posts.json)
src/                 sumber halaman: _*.html (potongan bersama), *.html, naskah privasi/syarat
tools/               build.py, strings.py (semua teks), gen_events.py, gen_blog.py, jaga_aktif.py,
                     pindah_poster.py, sql_run.sh, arsip_setup.sh
js/                  skrip situs (app.js, search.js, events-src.js, blog-live.js, admin*.js, ...)
css/                 style.css (desain publik), panel.css, naver.css, adaptive.css, dll
supabase/            semua SQL (skema, patch, data event)
data/                events.json dan posts.json (cadangan + bahan halaman statis)
assets/              ikon, og-image, poster/ (poster yang disimpan di repo)
.github/workflows/   sinkron.yml (tiap 3 jam), jaga-aktif.yml (harian)
admin.html           Panel Admin (satu bahasa, /admin)
```
File yang dibuat otomatis (jangan diedit): `id/`, `en/`, `js/i18n.js`, `js/search-index.js`, `css/dsk.css`, `css/dsk-b.css`, `sitemap.xml`, `robots.txt`, `blog/`.

## Pasang dari nol
1. **Supabase:** buat proyek. Di SQL Editor jalankan berkas `supabase/` **berurutan** (semuanya aman diulang):
   `schema.sql` → `schema_tahap2.sql` → `schema_google.sql` → `schema_admin.sql` → `schema_kota.sql` → `schema_ajakan.sql` → `schema_ajakan_fix.sql` → `schema_forum.sql` → `schema_komunitas.sql` → `schema_forum_admin.sql` → `schema_forum_admin2.sql` → `schema_forum_ban.sql` → `schema_profil.sql` → `schema_ajakan_luas.sql` → `schema_pesan.sql` → `schema_statistik.sql` → `schema_blog.sql` → `blog_kategori_luas.sql` → `schema_arsip.sql` → `patch_nickname.sql`.
   Data event awal (opsional): `konser_per_kota.sql` dan berkas `events_*.sql`.
2. **Kunci:** isi `js/config.js` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`). Hanya kunci anon (publik) yang boleh ada di repo; semua akses dijaga RLS. **Jangan pernah** menaruh service role key di repo.
3. **Login:** Supabase > Authentication > URL Configuration: Site URL = alamat situs, tambahkan Redirect URL `<alamat>/id/login` dan `<alamat>/en/login`. Login Google: aktifkan provider Google, lalu isi Client ID/Secret dan redirect URI `https://<proyek>.supabase.co/auth/v1/callback` di Google Cloud Console.
4. **Admin pertama:** daftar di `/id/login`, lalu jalankan query `update profiles set role='admin' ...` (ada di akhir `schema_tahap2.sql`). Buka `/admin`.
5. **GitHub Pages:** Settings > Pages > Deploy from branch (`main`, root). Settings > Actions > General > Workflow permissions: **Read and write**.
6. **Bangun:** `python3 tools/gen_events.py && python3 tools/gen_blog.py && python3 tools/build.py`, lalu commit dan push.

Uji lokal: `bash jalankan.sh` (membangun lalu melayani di port 8000; buka `/id/`). Perhatian: build lokal mengubah angka versi `?v=` di `id/` dan `en/`. Jangan di-commit; `git restore id en` bila perlu.

## Pekerjaan sehari-hari
| Tugas | Cara |
|---|---|
| Tambah/edit event | `/admin` > Buat baru atau Postingan. Event terbit tampil di situs langsung. Halaman statisnya menyusul saat sinkron berikutnya (maks 3 jam), atau jalankan **Actions > Sinkron konten > Run workflow** |
| Tulis blog | `/admin` > Postingan > Blog. Mode Teks atau HTML, **maks 15.000 karakter** (batas ada di `schema_blog.sql`). Pilih kategori, klik Terbitkan |
| Ubah teks situs | `tools/strings.py` atau `src/*.html`, lalu `python3 tools/build.py` |
| Tambah kota | `js/regions.js` (+ koordinat di `IB_GEO`) dan tabel `cities` (`schema_kota.sql`) |
| Persetujuan pengajuan event/open trip | `/admin` > Tinjau |
| Moderasi komunitas | `/admin` > Tinjau > Laporan komunitas; grup/kota di Komunitas |
| Statistik pengunjung | `/admin` > Statistik |
| Pindah poster Supabase Storage ke repo | `python3 tools/pindah_poster.py`, jalankan SQL yang dihasilkan |

Format tulisan blog (mode Teks): `## Judul bagian`, `### Sub`, `- daftar`, `**tebal**`, `[teks](https://tautan)`. Tidak ada kolom tag: kata kunci ditulis di judul, isi, dan satu baris di akhir. Kategori: berita, opini, gaya-hidup, hiburan, wisata, teknologi, tips, panduan-konser, tips-gunung, review, komunitas (kategori selain lima pertama butuh `blog_kategori_luas.sql`).

## Otomasi (GitHub Actions)
- **Sinkron konten** (`sinkron.yml`, tiap 3 jam): ambil event dan blog terbit dari Supabase, bangun ulang situs, commit bila berubah, minta Pages membangun ulang.
- **Jaga aktif** (`jaga-aktif.yml`, harian 09:23 WIB): ping kecil ke Supabase agar proyek gratis tidak dijeda setelah 7 hari sepi; menyalakan ulang workflow terjadwal (GitHub mematikannya setelah 60 hari repo sepi); membuka issue bila Supabase tidak menjawab.
- Rincian dan cara pantau: [`HEMAT-SUPABASE.md`](HEMAT-SUPABASE.md).

## Hemat egress Supabase
Daftar event dimuat satu kali (`js/events-src.js`) dan dibagi ke halaman dan pencarian, disimpan 5 menit di sessionStorage, dengan cadangan otomatis ke `data/events.json` bila Supabase gagal. Blog memuat daftar ringan dulu dan isi hanya untuk tulisan baru. Poster unggahan di-cache 1 tahun.
Saklar di `js/config.js`: `EVENTS_SOURCE: "live"` (Supabase dulu, default) atau `"static"` (data/events.json dulu, 0 egress, data tertunda sampai 3 jam).

## Fitur
- **Event:** konser, festival, pameran, open trip gunung; filter kota/kategori, kalender `.ics`, tombol bagikan, tautan `?e=<slug>`.
- **Pencarian:** satu kotak untuk event, wilayah, gunung (146), halaman, FAQ; awalan `event:` `kota:` `gunung:` `halaman:` `bantuan:`; tekan `/` atau Ctrl/Cmd+K.
- **Komunitas per kota:** papan kiriman, grup WA/Telegram/Discord, daftar tunggu kota, moderasi admin, blokir penulis (manual + otomatis).
- **Ajakan barengan (Cari teman):** ajakan per event atau mandiri, kontak WA hanya untuk anggota yang disetujui.
- **Pesan antar pengguna:** teks, gambar, voice note (maks 5 MB, hilang 10 menit).
- **Profil** dengan pengunjung terakhir dan saklar privasi.
- **Pengajuan event dan open trip** oleh publik, disetujui admin.
- **Blog** dan **Arsip Blog** (impor cadangan Blogger lewat admin).
- **Panel Admin:** beranda tugas, tinjau, postingan, statistik, buat baru.
- **Tampilan:** gaya portal ala Naver di beranda, terang/gelap, mode adaptif (Otomatis/Hemat/Seimbang/Penuh), HP dan PC, dua bahasa.
- Alat bantu: kalkulator patungan dan checklist packing (`js/tools.js`), cuaca dan jam WIB (Open-Meteo, tanpa kunci).

## Keamanan, privasi, hukum
- Semua tulis lewat fungsi RPC dan policy RLS; panel admin dijaga RLS, bukan JavaScript.
- Pencatat kunjungan (`js/track.js`): tanpa cookie dan tanpa IP; Do Not Track dan Global Privacy Control dihormati; data dihapus setelah 400 hari. Dijelaskan di Kebijakan Privasi (`src/privacy.*.body.html`).
- Log lokasi login butuh persetujuan eksplisit dan kebijakan privasi (UU PDP).
- Poster milik penyelenggara: minta izin dan cantumkan sumber. Poster buatan GWM adalah pengganti sementara.
- Aturan GitHub Pages melarang pemakaian untuk bisnis/transaksi komersial. Bila GWM mulai menghasilkan uang, pertimbangkan Cloudflare Pages atau Netlify dari repo yang sama.

## Batas paket gratis Supabase
2 proyek, database 500 MB, penyimpanan 1 GB, egress 5 GB/bulan, 50.000 pengguna aktif bulanan. Proyek dijeda setelah 7 hari tanpa aktivitas (ditangani Jaga aktif). Pertimbangkan Pro (±US$25/bulan) saat database mendekati 400 MB atau egress rutin di atas 70%.

## Pindah domain
1. Arahkan DNS ke GitHub Pages, lalu buat file `CNAME` berisi `gowithdme.com` (hanya setelah DNS siap).
2. `GWM_SITE=https://gowithdme.com python3 tools/build.py`, lalu commit dan push.
3. Perbarui Redirect URL Supabase dan origin Google OAuth ke domain baru.
4. Pindah sebelum situs dikenal Google; mengalihkan dari `github.io` belakangan bisa menurunkan peringkat untuk sementara.

## Dokumen lain
`AUDIT.md` (audit dan daftar perbaikan), `HEMAT-SUPABASE.md` (jaga aktif dan hemat egress), `supabase/DAFTAR_KONSER_PER_KOTA.md`, `BACA-SAYA.txt`, `data/BACA-SAYA.txt`.
