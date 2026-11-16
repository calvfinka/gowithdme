# InfoBarengan — by Jurkon Studio
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
2. Settings > Pages > Deploy from branch (main, root). Domain: infobarengan.com (file CNAME sudah ada).
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
2. Supabase > Authentication > URL Configuration: Site URL = domain situs, tambahkan Redirect URL `https://infobarengan.com/login.html`.
3. Daftar akun di `/login.html`, lalu jalankan query `update profiles set role='admin' ...` (ada di akhir schema_tahap2.sql).
4. Buka `/admin.html`. Penjagaan sebenarnya ada di RLS, bukan di JavaScript.
