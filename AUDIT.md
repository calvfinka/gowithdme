# Audit GoWithDME — 16 November 2026

Diuji di Chromium headless (meniru GitHub Pages di subfolder `/gowithdme/`, URL bersih tanpa `.html`, jam dikunci ke WIB). Supabase, Open-Meteo, dan Google memakai **data tiruan**, jadi alur login/Google/RLS asli belum teruji. Semua perbaikan dibuat lewat `src/`, `tools/` dan `js/`, lalu `python3 tools/build.py`.

## Bug yang diperbaiki (terbukti sebelum → sesudah)
| # | Bug | Perbaikan |
|---|-----|-----------|
| 1 | Kalkulator patungan salah hitung (galat desimal): 100.000 / 2 orang / 10% tampil Rp56.000, seharusnya Rp55.000 (189 kombinasi uji salah). Cadangan bisa negatif (menurunkan harga), total negatif menghasilkan harga negatif | `tools.js`: hitung bilangan bulat, total ≥ 0, cadangan 0–30%, orang dibulatkan ke bawah |
| 2 | URL berakhiran `.html` membuang `?kat=konser` dan `#access_token` (filter hilang; login Google/reset password bisa gagal) | `supa.js` mempertahankan query dan hash |
| 3 | Kartu cuaca bisa menampilkan kota yang salah (kota lambat selesai belakangan menimpa kota yang dipilih dari cache) | `now.js`: setiap permintaan menaikkan penanda urutan |
| 4 | Label "Hari ini" di ramalan memakai tanggal WIB walau kota di WITA/WIT | `now.js`: memakai tanggal lokal kota dari Open-Meteo |
| 5 | `ticket_url` berskema `javascript:` dirender sebagai tautan; handle IG tidak di-encode | `app.js`: hanya `http(s)`, handle IG divalidasi dan di-encode |
| 6 | `poster_url` berawalan `/` rusak di subfolder GitHub Pages | `purl()` diarahkan ke akar situs |
| 7 | Filter "Berbayar" memasukkan event berharga belum diketahui ("Info menyusul") | Berbayar = ada angka harga dan bukan gratis |
| 8 | Kalender `.ics`: judul/deskripsi selalu Indonesia, baris tidak dilipat, nama berkas diawali `-` | `app.js`: sesuai bahasa, dilipat RFC 5545, nama rapi, ada URL tiket |
| 9 | Daftar dengan email yang sudah ada dibilang "Akun dibuat"; email belum dikonfirmasi dibilang "password salah" | `auth.js`: pesan khusus |
| 10 | Lupa password: tautan reset memasukkan user tanpa form password baru | `auth.js` + `login.html`: kartu "Buat password baru" |
| 11 | Nama panggilan saat daftar diabaikan (trigger memakai awalan email) | `supabase/patch_nickname.sql` (**jalankan di SQL Editor**) |
| 12 | Admin: "hari ini" memakai jam perangkat, bukan WIB | `admin.js` memakai WIB |
| 13 | Admin: pratinjau/checklist Pameran menampilkan "Naik Gunung" dan "Nama gunung" | `admin-ux.js` |
| 14 | Admin: slug tanpa kota, event multi-kota berjudul + tanggal sama bentrok | slug memuat nama kota |
| 15 | Admin: Enter di kolom isian menekan "Simpan draft" (postingan terbit bisa jadi draft) | Enter di input dinonaktifkan |
| 16 | Ajakan: link `wa.me/08xxx` tidak valid | nomor dinormalkan ke `62…` |
| 17 | Privasi tidak menyebut Open-Meteo (IP terkirim di setiap tampilan) dan unpkg | ditambah di ID dan EN |
| 18 | canonical/hreflang/sitemap menunjuk gowithdme.com yang belum hidup; `x-default` ke halaman noindex | `build.py` memakai `GWM_SITE` (default alamat GitHub Pages); sitemap dan robots dibuat otomatis |
| 19 | `gwm-update.zip` dan `gwm-update-2.zip` (isinya identik dengan repo) ikut terbit publik | dihapus; `.gitignore` ditambah |

## Perlu kamu cek (tidak bisa saya verifikasi)
1. **Supabase > Authentication > URL Configuration**: Site URL `https://gowithdme.com`, tambahkan `https://gowithdme.com/id/login` dan `…/en/login` (dan origin yang sama di Google Cloud OAuth).
2. SQL untuk fitur ajakan (`invitations*`, view `invitations_public`, RPC `request_join`, `decide_member`, `leave_or_cancel`, `create_invitation`) serta `schema_tahap2/google/kota.sql` **tidak ada di repo**. Tanpa itu RLS admin dan ajakan tidak bisa diaudit. Simpan semuanya di `supabase/`.
3. Edge Function `log-login` tidak ada di repo; privasi menjanjikan retensi log 90 hari.
4. Email resmi sudah dipindah ke domain `.com`: `halo@gowithdme.com` (umum, Bantuan/Tentang/Syarat), `admin@gowithdme.com` (hak cipta/DMCA), dan `personal@gowithdme.com` (permintaan data pribadi di Privasi). Pastikan MX dan kotak masuk ketiganya aktif sebelum dianggap selesai.
5. Poster hotlink ke indonesia.travel dan jadwal.events: IP pengunjung ikut terkirim ke host itu, dan izin hak ciptanya belum jelas.
6. Kartu statistik di halaman profil masih angka 0 tetap; `IB_SAMPLE` menampilkan event contoh bila Supabase gagal dimuat.

## Domain gowithdme.com (sudah aktif)
Catatan arsip dari langkah pindah domain:
1. DNS domain ke GitHub Pages, lalu buat file `CNAME` berisi `gowithdme.com`.
2. `GWM_SITE=https://gowithdme.com python3 tools/build.py`, lalu commit dan push.
3. Perbarui Redirect URL Supabase dan origin Google OAuth ke domain baru.

## Perubahan 17 November 2026
| Bagian | Perubahan |
|--------|-----------|
| Poster | Kartu event, detail, dan banner kini menampilkan poster **utuh** (tidak dipotong) di atas latar buram dari poster yang sama. Banner mengukur rasio asli gambar (potret / persegi / tinggi / lanskap) dan menyesuaikan kotaknya; gambar yang gagal dimuat disembunyikan. Kode: `posterStyle`/`deco` di `js/app.js`, `orient()` di `js/home.js`, kelas `.pf`/`.pfo` di `css/naver.css` |
| Pencarian PC | Panel kini selalu menempel pada kotak cari yang terlihat: dihitung ulang saat gulir, ubah ukuran, dan setelah browser menggulir halaman karena fokus; bila kotak besar tertutup header, panel menempel di bawah kotak cari header. Posisi dijaga tetap di dalam layar. `js/search.js` (`fit`, `fitSoon`) |
| Navigasi bawah | Tab bar bawah dihapus (`src/_bar.html`, `css/adaptive.css`, `js/adaptive.js`). Menu tetap ada lewat tombol menu di bilah atas |

## Perubahan 17 November 2026 (2) — keseimbangan font, UI, foto
| Bagian | Perubahan |
|--------|-----------|
| `css/balance.css` (baru, dimuat terakhir) | Skala font satu tangga dengan `clamp()` (`--fs-xs … --fs-h1`), tinggi kontrol seragam (`--ctl`, `--ctl-sm`, `--ctl-lg`, `--chip`, 38px+ di layar sentuh), jarak (`--gx`, `--gap`), sudut (`--r-card` 16, `--r-poster` 12). Nilai di PC dibuat sama seperti sebelumnya |
| Banner | Poster dan blok teks memakai kotak setinggi sama (`--ph`), poster tetap utuh, lebar mengikuti rasio dengan batas per orientasi |
| Mode "situs desktop" di HP | `js/adaptive.js` mendeteksi (layar fisik ≤600px tetapi halaman ≥700px), memberi `<html data-dsk>` dan zoom isi sampai ±400px. `css/dsk.css` + `css/dsk-b.css` (dibuat otomatis oleh `tools/gen_dsk.py` dari semua blok `@media (max-width)`) memakai tata letak HP. Satuan vw/vh di CSS kini `var(--vw)`/`var(--vh)` agar ikut zoom. `search.js` dan `naver.js` disesuaikan dengan zoom |
| Bug | `<main class="pf">` di profil bentrok dengan kelas poster `.pf` sehingga halaman melebar 15px (scroll samping); diganti `prof`. Kurung `}` berlebih di `naver.css` dibuang |

## Perubahan 18 November 2026 — paket lengkap (audit + revenue + bot + ikon)

| Area | Perubahan |
|------|-----------|
| Error UI | `js/supa.js`: `friendlyErr`, `msg` auto-hide OK, `toast` adaptif, `$` aman |
| Streamline | Prefer utilitas global di app; raw Supabase errors diganti di auth/admin |
| Monetisasi | `supabase/schema_monetisasi.sql` + Featured sort/badge + admin fields + config |
| Legal | Privacy/Terms diperluas; halaman About & Copyright (ID+EN); footer lengkap |
| Favicon | SVG modern (gradien brand + dua companion) |
| Blog icon | Simbol `i-doc` (dokumen); nav blog tidak lagi memakai ikon musik `i-note` |
| Guide Bot | `js/gwm-bot.js` di Bantuan + tips Pesan + welcome-back di beranda |

Jalankan `schema_monetisasi.sql` di Supabase setelah deploy.

## Perubahan 19 November 2026 — audit ulang + uji fungsi + game 404

Diuji di Chromium headless (33 halaman × PC & HP, URL bersih, Supabase dan Open-Meteo ditiru). Hasil akhir: lint lulus, 19 uji unit lulus, 0 galat JS di semua halaman, 0 tautan/aset internal putus, 26 uji fungsi + 15 uji tamu/login + 10 uji 404 lulus.

| # | Temuan | Perbaikan |
|---|--------|-----------|
| 1 | Halaman event statis (`id/e/*`, `en/e/*`): `<img src="assets/posters/…">` relatif, jadi poster **tidak tampil** di 24 halaman | `tools/build.py`: alamat poster lokal dinaikkan `../../` |
| 2 | Poster `boomfest-bandung-2026.jpg` ada di data tetapi berkasnya tidak ada | `build.py`: poster lokal yang berkasnya tidak ada dilewati (tanpa gambar rusak; `og:image` memakai gambar bawaan). **Tambahkan berkasnya ke `assets/posters/`** bila ada |
| 3 | `profil` untuk tamu menampilkan teks mentah `pf_title` sebagai judul kartu (kunci hanya ada di kamus halaman, tidak di kamus JS) | `tools/strings.py`: kunci ditambah ke `J` |
| 4 | `bash jalankan.sh` memakai `python -m http.server` yang tidak mengenal URL bersih; semua menu di Codespace jatuh ke 404 | `tools/serve.py` baru (URL bersih + 404.html berstatus 404); `jalankan.sh` memakainya dan memakai versi tetap dari commit terakhir agar `git status` tidak kotor |
| 5 | `npm test` tidak ada; `npm run lint` hanya memeriksa sebagian berkas JS | `package.json`: `test` menjalankan 3 berkas uji, `lint` memeriksa semua `js/*.js`, `serve` dan `site` ditambah |
| 6 | `404.html`: game lama sederhana | Game baru (±3 KB tambahan, tanpa gambar/pustaka): pegunungan paralaks, matahari naik, pendaki beranimasi, lompat **dan merunduk** (burung muncul setelah 250 mdpl), penanda gunung yang dilewati, jeda otomatis saat tab disembunyikan, skor tertinggi tersimpan, teks Inggris di alamat `/en/`, layar tinggi-lebar mengikuti ukuran (HP) |

Catatan: alur login/Google/RLS asli tetap belum teruji (Supabase asli tidak dapat diakses saat pengujian); poin "Perlu kamu cek" di atas masih berlaku.

## Perubahan 21 November 2026 — sistem offline & PWA
**Temuan audit:** tidak ada service worker (situs tidak bisa dibuka tanpa sinyal, tidak bisa dipasang sebagai aplikasi, tiap kunjungan ulang mengunduh ulang CSS/JS), padahal pengguna naik gunung sering di area tanpa sinyal. Aset sendiri sudah ramping (poster total 1,6 MB, terbesar 143 KB).
| Bagian | Perubahan |
|--------|-----------|
| `src/sw.js` → `/sw.js` | Strategi per jenis permintaan (halaman, aset, data, pustaka). Redirect dibersihkan sebelum disimpan, halaman offline divalidasi, jumlah salinan dibatasi, cache versi lama dibuang. Tidak menyentuh Supabase, cuaca, login, admin, POST |
| `offline.html` | Halaman offline dua bahasa (mengikuti alamat yang diminta), tanpa CSS/JS luar, dengan daftar halaman yang pernah dibuka |
| `js/pwa.js` | Pendaftaran, tombol "Pasang aplikasi" di menu, penanda offline |
| `manifest.webmanifest` | `id`, kategori, dan pintasan (Event, Naik gunung, Bantuan) |
| `tests/sw.test.mjs` | 17 tes logika service worker; juga diuji di Chromium (daftar, simpan, server dimatikan, halaman tersimpan tetap tampil) |
**Catatan:** `sw.js` hanya berubah saat `src/` berubah, jadi pembaruan konten dari Supabase tidak memicu unduhan ulang aset.


## Perubahan 21 November 2026 (2) — siap-offline sejak kunjungan pertama
**Temuan audit:** service worker hanya menyimpan halaman yang *pernah dibuka*. Pengguna yang membuka beranda lalu kehilangan sinyal di kaki gunung melihat "Kamu sedang offline" saat menekan Event/Naik gunung/Bantuan. Font Google juga tidak disimpan, sehingga teks offline jatuh ke font sistem.
| Bagian | Perubahan |
|--------|-----------|
| `tools/build.py` | Membuat daftar "cangkang offline" (beranda, Event, Naik gunung, Bantuan × ID/EN + semua CSS/JS dengan `?v=` identik + `data/events.json`, ±660 KB) dan menyisipkannya ke `sw.js` (`var PRE`) |
| `src/sw.js` | Saat dipasang, cangkang diunduh di belakang layar (6 paralel, per berkas gagal = dilewati, tidak menggagalkan pemasangan). Halaman disimpan di cache `CORE` (tidak terkena batas 40 halaman) dan dipakai sebagai salinan cadangan navigasi (`lookup`). Font Google (`fonts.googleapis.com` / `fonts.gstatic.com`) ikut disimpan |
| `tests/sw.test.mjs` | +7 tes (total 52): unduh cangkang, berkas gagal, balasan non-HTML ditolak, buka halaman belum-pernah-dikunjungi saat offline, aset offline, tidak terpangkas, font |
Diuji di Chromium: hanya `/id/` dikunjungi, jaringan dimatikan, lalu `/id/event`, `/id/gunung?x=1`, `/en/bantuan` terbuka penuh dengan CSS; halaman di luar cangkang (`/id/about`) tetap jatuh ke halaman offline. 0 galat JS.
**Catatan:** `fonts.googleapis.com` dimuat tanpa CORS sehingga disimpan sebagai respons *opaque* (kuota browser menghitungnya lebih besar dari ukuran aslinya; hanya 1 berkas).

## Perubahan 21 November 2026 (3) — logika dasbor profil (`js/profil-core.js`)
Catatan lama "kartu statistik profil angka 0 tetap" sudah tidak berlaku (angka dihitung dari data). Audit logika modul murni dasbor menemukan 4 bug, dibuktikan dengan input tepi sebelum diperbaiki:
| # | Bug | Perbaikan |
|---|-----|-----------|
| 1 | Dua ajakan milik pengguna di event yang sama digabung jadi satu kartu (kunci per event; ajakan kedua hilang) | Kunci per **ajakan** (`inv:<id>`); event tersimpan hanya disembunyikan bila event itu sudah diwakili ajakan |
| 2 | Pencarian dasbor memakai frasa utuh: "bandung konser" tidak menemukan apa pun, aksen/line-up tidak dicari | Semua kata harus cocok (lintas kolom, urutan bebas), tanpa beda huruf/aksen; kolom `lineup`, `title_en`, `organizer`, `mountain` ikut dicari |
| 3 | `filled: 0` dari server ditampilkan "1" (`+x \|\| 1`) | Hanya nilai kosong yang jadi 1; 0 dihormati |
| 4 | Komparator urutan aktivitas tidak pernah mengembalikan 0 (urutan seri bisa terbalik/tak konsisten) | Urutan stabil: seri mengikuti urutan asli |
Tes: 6 tes baru (total 58 lulus), lint lulus.
