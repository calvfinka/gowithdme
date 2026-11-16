# GWM (Go With Me) — by Jurkon Studio
Portal info konser & naik gunung (awal: Bandung, Jawa Barat). Situs statis untuk GitHub Pages + backend Supabase.

## Struktur
```
index.html        halaman utama
css/style.css     tema & komponen
js/config.js      kunci Supabase & kota default
js/regions.js     provinsi/kota (pengganti provinsi.py) + data contoh
js/app.js         daftar event, filter, detail
js/tools.js       checklist packing & kalkulator patungan
supabase/schema.sql  tabel + RLS
assets/ CNAME .nojekyll robots.txt
```
## Deploy
1. Ekstrak zip, ganti isi repo, commit & push.
2. Settings > Pages > Deploy from branch (main, root). Domain: gowithdme.com (buat file `CNAME` berisi `gowithdme.com` hanya setelah DNS siap; lihat AUDIT.md).
3. Supabase: buat proyek, jalankan `supabase/schema.sql`, isi `js/config.js`. Tambah event lewat Table Editor (status `published`).
## Tambah daerah
Tambah di `js/regions.js` dan baris di tabel `provinces`/`cities`.
## Catatan keamanan & hukum
- Hanya anon key di frontend; semua akses dijaga RLS. Jangan pernah taruh service role key di repo.
- Log lokasi login diisi lewat Edge Function (tahap 2) dan butuh persetujuan eksplisit + kebijakan privasi (UU PDP).
- Poster milik penyelenggara: minta izin dan cantumkan sumber.

## Tahap 2: Login, Profil, Panel Admin
- `login.html` + `js/auth.js`: daftar, masuk, lupa password, profil, cek lokasi (placeholder).
- `admin.html` + `js/admin.js`: tambah/edit/terbitkan/hapus event, unggah poster ke Storage.
- `supabase/schema_tahap2.sql`: kolom `role`, fungsi `is_admin()`, policy admin, bucket `posters`.
### Setup
1. Jalankan `schema.sql` lalu `schema_tahap2.sql` di SQL Editor.
2. Supabase > Authentication > URL Configuration: Site URL = domain situs, tambahkan Redirect URL `https://gowithdme.com/login.html`.
3. Daftar akun di `/login.html`, lalu jalankan query `update profiles set role='admin' ...` (ada di akhir schema_tahap2.sql).
4. Buka `/admin.html`. Penjagaan sebenarnya ada di RLS, bukan di JavaScript.

## Tahap 2b: Login Google & URL bersih
- Jalankan `supabase/schema_google.sql`. Aktifkan provider Google di Supabase (Authentication > Providers).
- Google Cloud Console > OAuth client (Web): Authorized redirect URI = `https://jhqkylnqvhrljpaknjcg.supabase.co/auth/v1/callback`, Authorized JavaScript origins = domain situs. Salin Client ID dan Secret ke Supabase.
- Redirect URL Supabase: `https://gowithdme.com/login`.
- GitHub Pages otomatis melayani `/login` dan `/admin` dari file `.html`.

## Panel admin v2
Jalankan `supabase/schema_admin.sql`. Admin punya 3 menu: Dashboard, Postingan (filter kategori/status/kota), Buat baru (form khusus konser atau pendakian, simpan draft atau terbitkan).

## Dua bahasa (/id dan /en) & kota baru
- Halaman ada di `id/` dan `en/` (Beranda, Event, Gunung, Login, Privasi, Syarat). Alamat lama `/event`, `/gunung`, `/login` otomatis diarahkan sesuai bahasa pilihan atau bahasa browser. Panel admin tetap satu (Indonesia) di `/admin`.
- Teks: ubah di `tools/strings.py`, lalu jalankan `python3 tools/build.py`. Naskah privasi dan syarat ada di `src/*.id.body.html` dan `src/*.en.body.html`. File di `id/`, `en/`, dan `js/i18n.js` dibuat otomatis, jangan diedit tangan.
- Supabase > Authentication > URL Configuration: tambahkan Redirect URL `https://gowithdme.com/id/login` dan `https://gowithdme.com/en/login` (yang lama `/login` boleh dibiarkan).
- Jalankan `supabase/schema_kota.sql`: menambah 35 kota di 20 provinsi, kategori Pameran, dan kolom `title_en` / `description_en` untuk teks event berbahasa Inggris (opsional; kosong = tampil teks Indonesia).
- Kota baru: tambah di `js/regions.js` dan di tabel `cities`.

## Desain GWM Compact
- Satu tampilan untuk Beranda, Event, Gunung, Login, Privasi, dan Syarat: bilah atas tipis (logo, pencarian, tema terang/gelap, bahasa, masuk), sidebar kiri (jenis event, kota, tersimpan), area utama padat dengan tampilan kisi atau daftar.
- `css/style.css` = seluruh desain publik. `css/panel.css` = tambahan untuk panel admin dan halaman login.
- Potongan bersama ada di `src/_*.html` (ikon SVG, bilah atas, sidebar, jam & cuaca, statistik, kaki halaman). Ubah di sana lalu jalankan `python3 tools/build.py`.
- `js/theme.js` tombol terang/gelap (pilihan disimpan di perangkat, awalnya mengikuti pengaturan perangkat).
- `js/now.js` tanggal, jam WIB, dan cuaca asli dari Open-Meteo (gratis, tanpa kunci API) mengikuti kota yang dipilih. Koordinat kota ada di `IB_GEO` pada `js/regions.js`; kota baru perlu ditambah di sana juga.
- Domain: gowithdme.com. Tambahkan Redirect URL Supabase `https://gowithdme.com/id/login` dan `https://gowithdme.com/en/login`, dan arahkan CNAME GitHub Pages ke domain baru.

## Komunitas: pengajuan event & open trip, persetujuan admin, tombol bagikan
- Jalankan `supabase/schema_komunitas.sql` (setelah semua schema sebelumnya). Menambah kolom `quota`, `contact_wa`, `organizer`, `is_community`; status `pending`/`rejected`; tabel `event_submissions`; fungsi `submit_event`, `withdraw_event`, `admin_review_event`; izin unggah poster per pengguna (folder `<user-id>/`, maks. 2 MB, JPG/PNG/WebP).
- Publik (harus login) membuka `/id/ajukan` atau `/en/ajukan`: konser/festival, pameran, atau open trip gunung. Status awal selalu `pending`; tidak bisa terbit sendiri. Batas: 5 pengajuan menunggu, 8 per 24 jam.
- Admin: menu baru **Persetujuan** di `/admin` (Setujui / Tolak dengan alasan). Pengaju melihat status dan alasan penolakan di bagian *Pengajuan saya*, bisa menarik atau mengajukan ulang.
- Open trip memakai kategori `naikgunung` yang sudah ada, jadi otomatis tampil di halaman Gunung, kalender (.ics), pencarian, dan ajakan barengan. Daftar gunung ada di `js/gunung-data.js` (146 gunung populer & gunung api utama; nama lain bisa diketik sendiri).
- Tombol bagikan (`js/share.js`): kartu grid & daftar, rincian event, tiap ajakan barengan, bilah atas, dan pengajuan saya. Tautan langsung ke event: `?e=<slug>` (dialog rincian terbuka otomatis).
- Setelah mengubah teks di `tools/strings.py` atau `src/*.html`, jalankan `python3 tools/build.py`.

## Daftar konser per kota tanpa duplikat (v3)
- Jalankan `supabase/konser_per_kota.sql` di Supabase > SQL Editor (aman diulang). Isinya: kota baru (Sleman, Bantul, Lamongan), pembersihan duplikat lama, 34 konser baru di 16 kota lengkap dengan harga, poster, dan link tiket, penerbitan konser Bandung yang masih draft, serta indeks unik `events_no_dupe` sehingga database menolak duplikat (kota + tanggal + judul).
- `js/app.js` membuang duplikat saat memuat, `js/admin.js` menolak simpan postingan yang sama. Daftar lengkap: `supabase/DAFTAR_KONSER_PER_KOTA.md`.

## Komunitas v2: diskusi di halaman event + moderasi admin
- Jalankan `supabase/schema_forum_admin.sql` (setelah `schema_forum.sql`). Menambah kolom `forum_reports.handled_at`, indeks kiriman per event, dan fungsi `admin_forum_moderate` (hanya admin).
- **Rincian event** (Beranda, Event, Gunung): bagian "Diskusi komunitas" menampilkan sampai 5 kiriman forum yang ditautkan ke event itu, tautan "Tulis kiriman soal event ini" (membuka formulir dengan event terpilih), dan "Semua kiriman di <kota>". Kota yang belum buka dan event tanpa kiriman tidak menampilkan apa-apa. Kode: `js/forum-event.js`; tautan `komunitas?kota=X&p=<id>` membuka kiriman, `komunitas?kota=X&event=<id>` membuka formulir.
- **Admin > Komunitas** (`js/admin-forum.js`): tab *Dilaporkan* (antrean laporan belum ditangani, lengkap dengan alasan dan pelapor), *Terbaru* (kiriman dan balasan terakhir), *Disembunyikan / dihapus*. Tindakan: Abaikan laporan (laporan dihapus, kiriman tayang lagi), Sembunyikan, Hapus (permanen dari sisi panel), Pulihkan (hanya yang disembunyikan). Lencana merah di menu bawah dan kartu di Dashboard menunjukkan jumlah yang menunggu.
- Menambah grup WhatsApp/Telegram/Discord dan membuka kota baru masih lewat Table Editor (`forum_groups`, `forum_cities`).

## Admin: grup & kota komunitas
- Jalankan `supabase/schema_forum_admin2.sql` (fungsi `admin_forum_waitlist`, agar admin bisa melihat permintaan kota).
- `/admin` > Komunitas > tab **Grup & kota**: buka/tutup kota dan atur urutan, lihat kota yang paling diminta lalu buka dengan satu tombol, tambah/edit/nonaktifkan/hapus grup WhatsApp, Telegram, Discord. Tautan diperiksa di browser dan di database (hanya https dari domain resmi). Kota tidak bisa dihapus dari panel (menghapus kota ikut menghapus semua kirimannya); pakai Tutup kota.
