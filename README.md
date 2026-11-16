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
