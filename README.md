# GWM (Go With Me) — oleh Jurkon Studio

Portal info konser, festival, dan naik gunung, plus cari teman jalan dan komunitas per kota. Situs statis di **GitHub Pages** dengan backend **Supabase** (paket gratis). Dua bahasa: Indonesia (`/id/`) dan Inggris (`/en/`).

Alamat situs: **https://gowithdme.com** (domain `.com` sudah dipakai). Alamat lama `calvfinka.github.io/gowithdme` hanya untuk uji coba; lihat "Domain dan email".

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
.github/workflows/   sinkron.yml (tiap jam + otomatis saat terbit), jaga-aktif.yml (harian)
admin.html           Panel Admin (satu bahasa, /admin)
```
File yang dibuat otomatis (jangan diedit): `id/`, `en/`, `js/i18n.js`, `js/search-index.js`, `css/dsk.css`, `css/dsk-b.css`, `sitemap.xml`, `robots.txt`, `sw.js`, `blog/`.

## Pasang dari nol
1. **Supabase:** buat proyek. Di SQL Editor jalankan berkas `supabase/` **berurutan** (semuanya aman diulang):
   `schema.sql` → `schema_tahap2.sql` → `schema_google.sql` → `schema_admin.sql` → `schema_kota.sql` → `schema_ajakan.sql` → `schema_ajakan_fix.sql` → `schema_forum.sql` → `schema_komunitas.sql` → `schema_forum_admin.sql` → `schema_forum_admin2.sql` → `schema_forum_ban.sql` → `schema_profil.sql` → `schema_ajakan_luas.sql` → `schema_pesan.sql` → `schema_statistik.sql` → `schema_blog.sql` → `blog_kategori_luas.sql` → `schema_arsip.sql` → `patch_nickname.sql`.
   Data event awal (opsional): `konser_per_kota.sql` dan berkas `events_*.sql`.
2. **Kunci:** isi `js/config.js` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`). Hanya kunci anon (publik) yang boleh ada di repo; semua akses dijaga RLS. **Jangan pernah** menaruh service role key di repo.
3. **Login:** Supabase > Authentication > URL Configuration: Site URL = alamat situs, tambahkan Redirect URL `<alamat>/id/login` dan `<alamat>/en/login`. Login Google: aktifkan provider Google, lalu isi Client ID/Secret dan redirect URI `https://<proyek>.supabase.co/auth/v1/callback` di Google Cloud Console.
4. **Admin pertama:** daftar di `/id/login`, lalu jalankan query `update profiles set role='admin' ...` (ada di akhir `schema_tahap2.sql`). Buka `/admin`.
5. **GitHub Pages:** Settings > Pages > Deploy from branch (`main`, root), isi Custom domain `gowithdme.com`. Settings > Actions > General > Workflow permissions: **Read and write**.
6. **Bangun:** `python3 tools/gen_events.py && python3 tools/gen_blog.py && python3 tools/build.py`, lalu commit dan push.

Uji lokal: `bash jalankan.sh` (membangun lalu melayani di port 8000 lewat `tools/serve.py`, yang meniru URL bersih dan 404.html GitHub Pages; buka `/id/`). Versi `?v=` dikunci ke commit terakhir sehingga build lokal tidak mengotori `git status`. Tes: `npm run lint` dan `npm test`.

## Pekerjaan sehari-hari
| Tugas | Cara |
|---|---|
| Tambah/edit event | `/admin` > Buat baru atau Postingan. Event terbit tampil di situs langsung. Halaman statisnya menyusul beberapa menit kemudian bila `supabase/auto_sinkron.sql` dipasang (cadangan: maks 1 jam), atau jalankan **Actions > Sinkron konten > Run workflow** |
| Tulis blog | `/admin` > Postingan > Blog. Mode Teks atau HTML, **maks 15.000 karakter** (batas ada di `schema_blog.sql`). Pilih kategori, klik Terbitkan |
| Ubah teks situs | `tools/strings.py` atau `src/*.html`, lalu `python3 tools/build.py` |
| Tambah kota | `js/regions.js` (+ koordinat di `IB_GEO`) dan tabel `cities` (`schema_kota.sql`) |
| Persetujuan pengajuan event/open trip | `/admin` > Tinjau |
| Moderasi komunitas | `/admin` > Tinjau > Laporan komunitas; grup/kota di Komunitas |
| Statistik pengunjung | `/admin` > Statistik |
| Pindah poster Supabase Storage ke repo | `python3 tools/pindah_poster.py`, jalankan SQL yang dihasilkan |

Format tulisan blog (mode Teks): `## Judul bagian`, `### Sub`, `- daftar`, `**tebal**`, `[teks](https://tautan)`. Tidak ada kolom tag: kata kunci ditulis di judul, isi, dan satu baris di akhir. Kategori: berita, opini, gaya-hidup, hiburan, wisata, teknologi, tips, panduan-konser, tips-gunung, review, komunitas (kategori selain lima pertama butuh `blog_kategori_luas.sql`).

## Otomasi (GitHub Actions)
- **Sinkron konten** (`sinkron.yml`): jalan tiap jam, segera setelah event/blog terbit (pemicu database, lihat `supabase/auto_sinkron.sql`), atau manual. Mengambil event dan blog terbit dari Supabase, bangun ulang situs, commit bila berubah, minta Pages membangun ulang.
- **Jaga aktif** (`jaga-aktif.yml`, harian 09:23 WIB): ping kecil ke Supabase agar proyek gratis tidak dijeda setelah 7 hari sepi; menyalakan ulang workflow terjadwal (GitHub mematikannya setelah 60 hari repo sepi); membuka issue bila Supabase tidak menjawab.
- Rincian dan cara pantau: [`HEMAT-SUPABASE.md`](HEMAT-SUPABASE.md).

## Hemat egress Supabase
Daftar event dimuat satu kali (`js/events-src.js`) dan dibagi ke halaman dan pencarian, disimpan 5 menit di sessionStorage, dengan cadangan otomatis ke `data/events.json` bila Supabase gagal. Blog memuat daftar ringan dulu dan isi hanya untuk tulisan baru. Poster unggahan di-cache 1 tahun.
Saklar di `js/config.js`: `EVENTS_SOURCE: "live"` (Supabase dulu, default) atau `"static"` (data/events.json dulu, 0 egress, data tertunda sampai 1 jam).

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

## Domain dan email
**Domain:** `gowithdme.com`. `tools/build.py` sudah memakai domain ini sebagai default untuk canonical, hreflang, dan sitemap, jadi cukup `python3 tools/build.py` (tanpa `GWM_SITE`). Isi `GWM_SITE` hanya bila ingin membangun untuk alamat lain.

Checklist domain:
1. DNS mengarah ke GitHub Pages dan file `CNAME` berisi `gowithdme.com`; aktifkan Enforce HTTPS di Settings > Pages.
2. Supabase > Authentication > URL Configuration: Site URL `https://gowithdme.com`, Redirect URL `https://gowithdme.com/id/login` dan `https://gowithdme.com/en/login`.
3. Google Cloud Console (OAuth): tambahkan `https://gowithdme.com` sebagai Authorized JavaScript origin.
4. Bing/Naver/Google Search Console: verifikasi ulang properti untuk domain `.com` dan kirim `sitemap.xml`.

**Email resmi** (diatur di `js/config.js`, dibaca oleh halaman lewat atribut `data-mail`):
| Email | Dipakai untuk | Kunci config |
|---|---|---|
| `halo@gowithdme.com` | Kontak umum: Bantuan, Tentang, Syarat, order promosi, GWM Bot | `CONTACT_EMAIL` |
| `admin@gowithdme.com` | Administrasi: pemberitahuan hak cipta / DMCA | `CONTACT_EMAIL_ADMIN` |
| `personal@gowithdme.com` | Data pribadi: permintaan hak subjek data di Kebijakan Privasi | `CONTACT_EMAIL_PERSONAL` |

Untuk mengganti email: ubah `js/config.js`, ubah teks di `src/*.body.html` (Tentang, Syarat, Privasi, Hak Cipta), lalu `python3 tools/build.py`. Pastikan MX dan kotak masuk ketiga alamat sudah aktif (atau di-forward) di penyedia email domain.

Catatan: `@phone.jurkon.my.id` di `js/auth.js` bukan email kontak, melainkan alamat internal untuk akun login nomor HP di Supabase. Jangan diubah selama masih ada akun yang memakainya.

## Dokumen lain
`AUDIT.md` (audit dan daftar perbaikan), `HEMAT-SUPABASE.md` (jaga aktif dan hemat egress), `supabase/DAFTAR_KONSER_PER_KOTA.md`, `BACA-SAYA.txt`, `data/BACA-SAYA.txt`.

## Offline dan pasang aplikasi (PWA)
`src/sw.js` (template) dibuat menjadi `/sw.js` oleh `tools/build.py`; `js/pwa.js` mendaftarkannya dari semua halaman aplikasi dan blog; `offline.html` tampil bila halaman belum tersimpan dan tidak ada sinyal.
- Halaman: jaringan dulu (batas 4 detik bila sudah ada salinan), lalu salinan, lalu `offline.html`. Maks 40 halaman disimpan.
- CSS/JS/gambar satu domain: salinan dulu, diperbarui di belakang layar. File `.json` (data event): jaringan dulu.
- Tidak disentuh: Supabase, cuaca, `/login`, `/admin`, permintaan POST. Pustaka Supabase (versi dikunci) disimpan agar situs tetap jalan offline.
- Cache dinamai dengan `VER` build; saat versi berganti, cache lama dibuang otomatis.
- Tombol "Pasang aplikasi" ada di menu dan hanya muncul bila browser mengizinkan. Penanda "offline" muncul di bawah layar saat sinyal hilang.
- Tes: `npm test` (`tests/sw.test.mjs`). Bila `sw.js` bermasalah di produksi: hapus `js/pwa.js` dari `src/_head.html` dan `tools/blog.py`, bangun ulang, lalu sebarkan versi `sw.js` yang memanggil `self.registration.unregister()`.
