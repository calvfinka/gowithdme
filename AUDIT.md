# Audit GWM — 16 November 2026

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
1. **Supabase > Authentication > URL Configuration**: tambahkan `https://calvfinka.github.io/gowithdme/id/login` dan `…/en/login` (dan origin yang sama di Google Cloud OAuth). Selama domain .com belum aktif, login hanya jalan bila alamat ini terdaftar.
2. SQL untuk fitur ajakan (`invitations*`, view `invitations_public`, RPC `request_join`, `decide_member`, `leave_or_cancel`, `create_invitation`) serta `schema_tahap2/google/kota.sql` **tidak ada di repo**. Tanpa itu RLS admin dan ajakan tidak bisa diaudit. Simpan semuanya di `supabase/`.
3. Edge Function `log-login` tidak ada di repo; privasi menjanjikan retensi log 90 hari.
4. `halo@gowithdme.com` belum bisa menerima email sebelum domain dan MX aktif. Sementara, Bantuan, Privasi, dan Syarat memakai email alternatif; ganti `CONTACT_EMAIL` di `js/config.js` dan teks di `src/privacy.*.body.html` / `src/terms.*.body.html` setelah email domain aktif.
5. Poster hotlink ke indonesia.travel dan jadwal.events: IP pengunjung ikut terkirim ke host itu, dan izin hak ciptanya belum jelas.
6. Kartu statistik di halaman profil masih angka 0 tetap; `IB_SAMPLE` menampilkan event contoh bila Supabase gagal dimuat.

## Saat pindah domain
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

## Perubahan 18 November 2026 — audit ulang, streamline, error-reporting

| Bagian | Perubahan |
|--------|-----------|
| `js/supa.js` | Utilitas terpusat diperkuat: `$` aman (dummy element), `esc`, `msg` (auto-hide sukses 4.5 dtk), `toast` (durasi adaptif), dan **`friendlyErr(err)`** yang memetakan error jaringan / JWT / RLS / duplikat / rate-limit / upload / timeout ke teks ramah bilingual. Raw technical message Supabase tidak lagi ditampilkan ke pengguna. |
| Error UI | `auth.js`, `ajukan.js`, `admin.js`, `teman.js`, `pesan.js`, `komunitas.js` memakai `friendlyErr` + prefer `window.toast` / `window.msg`. Redefinisi lokal `toast`/`esc` di beberapa file diganti menjadi fallback ke utilitas terpusat. |
| i18n | Kunci baru di `tools/strings.py`: `err_network`, `err_session`, `err_perm`, `err_dup`, `err_rate`, `err_upload`, `err_timeout`. |
| Logika niche | Normalisasi nomor WA, filter harga, status event (live/soon/past) berbasis WIB, dan validasi URL tiket/IG tetap; tidak ada regresi pada alur konser / naik gunung / ajakan. |
| Redundansi | Definisi `esc` dan `toast` yang tersebar digabung ke sumber tunggal di `supa.js` (dengan fallback aman bila file belum termuat). `msg` di admin kini konsisten auto-dismiss untuk status OK. |

Setelah ubah teks i18n: `python3 tools/build.py` (hanya perlu bila ingin meregenerasi `js/i18n.js` + halaman). File JS di atas bisa langsung di-commit tanpa rebuild penuh.

## Perubahan 18 November 2026 (2) — monetisasi, traffic readiness, legal lengkap

| Bagian | Perubahan |
|--------|-----------|
| Schema | `supabase/schema_monetisasi.sql`: kolom `is_featured`, `featured_until`, `sponsor_label`, `boost_score`, `affiliate_note`; view `events_featured`; tabel `sponsorship_leads` + RPC `submit_sponsor_lead` & `admin_set_featured`. |
| Config | `js/config.js`: OWNER_*, FEATURED_*, SPONSOR_LEADS_ENABLED, AFFILIATE_TICKET_BASE, AD_SLOT_* (siap diisi partner). |
| UI listing | `js/app.js`: event Featured naik ke atas daftar + badge “Disorot/Featured”; CSS `.badge.feat`. |
| Admin | Form event: checkbox Featured, label sponsor, tanggal berakhir, boost score. |
| Legal | Privacy & Terms diperluas (ID+EN, UU PDP, sponsor, retensi, pihak ketiga). Halaman baru **Hak Cipta & Kepemilikan** dan **Tentang GWM & Jurkon Studio** (ID+EN). Footer menautkan About + Copyright. |
| Build | `copyright` & `about` masuk pipeline `tools/build.py` + search index. |
| Traffic | Setelah domain aktif: canonical/sitemap sudah otomatis lewat `GWM_SITE`; struktur event statis + blog + hreflang mendukung indexing. Featured listings memberi sinyal kualitas untuk engagement. |

**Langkah setelah domain terdaftar:** (1) jalankan `schema_monetisasi.sql` di Supabase, (2) `GWM_SITE=https://gowithdme.com python3 tools/build.py`, (3) update Redirect URL Supabase & Google OAuth, (4) daftarkan Search Console + sitemap, (5) aktifkan paket Featured untuk penyelenggara lewat admin.
