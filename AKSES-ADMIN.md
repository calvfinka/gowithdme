# Akses admin & batasannya (RBAC)

Panel admin kini punya **Pemilik** (akses penuh) dan **admin tambahan** dengan batas akses. Semua batasan ditegakkan di **database** (RLS + fungsi RPC); menyembunyikan tombol di panel hanyalah tampilan.

## Pasang (sekali)
1. Supabase > SQL Editor: jalankan `supabase/schema_rbac.sql` (SETELAH semua schema/patch lain). Aman diulang.
2. Muat ulang panel. Admin lama otomatis jadi **Pemilik** (tidak ada yang berubah untuk Anda).
3. Menu **Pengaturan > Admin & Akses** muncul (khusus Pemilik).
> Bila kelak menjalankan ulang `schema_tahap2.sql`, jalankan `schema_rbac.sql` lagi (berkas itu mengembalikan `is_admin()` ke versi lama).

## Cara menambah admin
1. Orang itu daftar dulu di gowithdme.com/login.
2. Panel > Admin & Akses > masukkan emailnya > **Cari akun**.
3. Pilih peran (preset) atau centang izin satu per satu, atur tanggal berakhir bila perlu, **Simpan**.
Perubahan berlaku saat akun itu memuat ulang panel; di database berlaku seketika.

## Apa yang bisa dilakukan Pemilik (akses maksimal)
Semua izin di bawah + kelola admin (tambah, ubah, nonaktifkan, cabut) + lihat riwayat perubahan akses. Tidak ada yang bisa mengubah Pemilik dari panel; menjadikan seseorang Pemilik hanya lewat SQL:
`update profiles set role='admin' where id=(select id from auth.users where email='email@contoh.com');`

## Katalog izin (22)
| Kelompok | Izin | Arti |
|---|---|---|
| Event | `events.view` | lihat semua event termasuk draft |
| | `events.create` / `events.edit` | buat draft / ubah isi |
| | `events.publish` | terbitkan atau tarik (ditegakkan trigger) |
| | `events.delete` | hapus |
| | `events.review` | setujui/tolak pengajuan publik |
| | `events.feature` | event Disorot & boost (ditegakkan trigger) |
| Poster | `posters.upload` / `posters.delete` | unggah / hapus di storage |
| Konten | `blog.manage`, `arsip.manage` | blog (artikel, komentar, pemeriksaan) / arsip |
| Komunitas | `forum.moderate`, `forum.ban`, `forum.config` | moderasi / blokir / kota & grup |
| | `invitations.moderate`, `chat.moderate` | ajakan / laporan pesan |
| Filter kata | `words.view`, `words.manage` | lihat log / ubah daftar |
| Sponsor | `sponsor.view`, `sponsor.manage` | lihat lead / ubah & aktifkan |
| Data | `stats.view`, `users.view` | statistik / daftar pengguna (email disamarkan) |

Izin turunan otomatis ikut: `edit/create/publish/delete/review/feature` -> `events.view`; `forum.ban/config` -> `forum.moderate`; `*.manage` -> `*.view`.

## Peran preset
Editor Konten, Kontributor (hanya draft), Moderator Komunitas, Manajer Sponsor, Analis (hanya baca), dan Kustom.

## Batasan tambahan
- Nonaktifkan akun sementara tanpa menghapus pengaturannya, atau beri **tanggal berakhir** (akses mati otomatis).
- Staff tidak bisa mengubah akses sendiri, tidak bisa membuat admin lain, tidak bisa menyentuh Pemilik.
- Staff tidak bisa diblokir/dipantau sebagai pengguna forum biasa.
- Gagal-aman: `is_admin()` sekarang berarti "hanya Pemilik". Tabel atau fungsi yang belum dipetakan ke izin otomatis tetap khusus Pemilik (mis. fungsi `stat_*` statistik konser).
- Riwayat tambah/ubah/cabut akses tercatat di `admin_audit` (hanya Pemilik yang bisa baca).

## Pemeriksaan
- Daftar fungsi yang masih khusus Pemilik: query (a) di akhir `schema_rbac.sql`.
- `select my_admin();` menampilkan akses akun yang sedang login.
- Uji otomatis (repo admin): `node tests/rbac.test.js`.
