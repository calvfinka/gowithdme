# Uji nyata GWM: patch akun baru dan masa percobaan

Tujuan: memastikan `patch_pengguna_baru.sql` benar-benar aktif di Supabase asli dan perilaku di situs sesuai yang selama ini hanya diuji dengan data tiruan. Waktu: sekitar 45 menit. Butuh 3 email yang bisa menerima konfirmasi (boleh alias seperti `nama+uji1@gmail.com`).

Semua SQL ada di `supabase/cek_pengguna_baru.sql` (hanya membaca) dan `supabase/batal_pengguna_baru.sql` (pembatalan).

## Bagian 1: pasang patch (10 menit)

1. Supabase > Table Editor > `profiles` > Export sebagai cadangan.
2. SQL Editor: jalankan blok **A1 dan A2**. A1 harus 4 baris (`created_at`, `nickname`, `role`, `verified`). Bila `role` tidak ada, jalankan `schema_tahap2.sql` dulu. Tabel yang bernilai null di A2 akan dilewati patch; catat mana saja.
3. Jalankan blok **A3** dan simpan hasilnya (kolom `definisi_lama`) ke file teks. Ini satu-satunya cara mengembalikan `handle_new_user()` lama.
4. Jalankan seluruh isi `supabase/patch_pengguna_baru.sql` satu kali. Catatan "Nama kembar yang diberi akhiran: N" berarti ada N nama lama yang diubah.
5. Jalankan blok **B**. Semua kolom harus `true` dan `jumlah_trigger_batas` sama dengan jumlah tabel yang ada di A2 (biasanya 5). B2 harus menampilkan lima tabel plus `profiles`.
6. Jalankan blok **C**. Harapan: `private`, `reserved`, `reserved`, kosong, kosong.

Bila langkah 4 menampilkan galat, salin pesannya dan kirim ke saya; jangan jalankan ulang berulang-ulang.

## Bagian 2: uji dengan akun sungguhan (30 menit)

Pakai situs yang sudah dideploy, di Chrome HP. Hard refresh dulu. Catat hasil tiap langkah di tabel hasil di bawah.

| # | Langkah | Hasil yang diharapkan |
| --- | --- | --- |
| 1 | Daftar akun **Uji1** (email 1), nama panggilan `Budi Uji`. Konfirmasi email, masuk | Berhasil. Kartu "pilih kota" muncul. Pilih satu kota |
| 2 | Daftar akun **Uji2** (email 2) dengan nama panggilan yang sama `Budi Uji` | Berhasil, tetapi nama berubah jadi `Budi Uji1234` (angka acak). Muncul pemberitahuan sekali tentang pergantian nama |
| 3 | Daftar dengan nama `Admin` | Ditolak di formulir (aturan klien) |
| 4 | Sebagai Uji1, buka Cari teman > Buat ajakan | Ada baris "Akun baru punya batas awal... 2 ajakan baru per hari" di atas formulir |
| 5 | Sebagai Uji1, buat ajakan pertama dan kedua (judul minimal 5 huruf, nomor WA bebas) | Keduanya berhasil |
| 6 | Sebagai Uji1, buat ajakan ketiga | **Ditolak** dengan pesan "Akun baru dibatasi 2 ajakan baru per hari selama 48 jam pertama. Coba lagi besok. Sementara itu kamu tetap bisa bergabung ke ajakan orang lain." Pesan terbaca penuh dan tidak hilang terlalu cepat |
| 7 | Sebagai Uji2, buka ajakan Uji1 lalu tekan Gabung | Berhasil (status menunggu). Batas percobaan tidak menghalangi bergabung |
| 8 | Sebagai Uji1, terima Uji2 | Berhasil |
| 9 | Sebagai Uji1, buka Komunitas, tulis 2 kiriman, lalu kiriman ketiga | Dua pertama berhasil; ketiga ditolak dengan pesan ramah (kiriman forum) |
| 10 | Sebagai Uji1, mulai percakapan baru (Pesan) dengan Uji2 lalu dengan akun ketiga bila ada | Bila ada tiga lawan bicara, percakapan ketiga ditolak dengan pesan ramah. Bila tidak, lewati |
| 11 | Ganti bahasa ke English, ulangi langkah 6 | Pesan berbahasa Inggris |

### Menguji akun yang sudah lewat masa percobaan
Di SQL Editor (ganti emailnya):

```sql
update profiles set created_at = now() - interval '3 days'
where id = (select id from auth.users where email = 'EMAIL_UJI1');
```
Lalu sebagai Uji1 coba buat ajakan ketiga. Catatan baris batas awal di formulir harus hilang (setelah hard refresh), dan ajakan ketiga berhasil. Ajakan keempat tetap bisa gagal dengan pesan lama "Maksimal 3 ajakan aktif sekaligus." karena itu aturan lain di server, bukan masa percobaan.

Untuk uji akun terverifikasi: kembalikan `created_at` dengan `now()`, jalankan `update profiles set verified = true where id = ...`, dan batas percobaan harus hilang. Setelah selesai, kembalikan `verified = false`.

## Bagian 3: bersihkan data uji

Supabase > Authentication > Users: hapus Uji1, Uji2, dan akun uji lain. Profil, ajakan, dan kiriman milik mereka ikut terhapus otomatis (cascade). Cek dengan blok **D** bahwa tidak ada akun uji tersisa.

## Bagian 4: bila ada yang tidak sesuai

- **Pesan batas muncul dalam teks mentah** (bukan versi ramah): kirim teks persisnya ke saya. Kemungkinan frasa di trigger berbeda dari yang dikenali `js/probation-core.js`.
- **Pengguna sungguhan terkena batas padahal tidak seharusnya:** jalankan `batal_pengguna_baru.sql` bagian 1, lalu kirim hasil blok D.
- **Batas tidak berlaku sama sekali** (ajakan ketiga berhasil pada akun baru): kirim hasil blok B dan B2.

## Tabel hasil (tempel ke chat bila ada yang gagal)

| # | Lulus? | Teks pesan / catatan |
| --- | --- | --- |
| 1 | | |
| 2 | | |
| ... | | |
