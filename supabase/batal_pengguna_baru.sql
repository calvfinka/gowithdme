-- GoWithDME: membatalkan SEBAGIAN patch_pengguna_baru.sql bila ada masalah. Jalankan di Supabase > SQL Editor.
-- Aman dijalankan ulang. Tidak menghapus data apa pun.

-- 1. Cabut masa percobaan 48 jam (batas harian akun baru). Ini yang paling mungkin mengganggu pengguna.
drop trigger if exists probation_limit on chat_threads;
drop trigger if exists probation_limit on forum_posts;
drop trigger if exists probation_limit on forum_replies;
drop trigger if exists probation_limit on invitations;
drop trigger if exists probation_limit on event_submissions;
drop function if exists probation_limit();
drop function if exists acct_probation(uuid);

-- 2. (Opsional) Cabut penjaga nama panggilan di server dan kewajiban nama unik.
--    Nama yang sudah diberi akhiran oleh patch TIDAK dikembalikan.
-- drop trigger if exists profiles_nick_guard on profiles;
-- drop function if exists profiles_nick_guard();
-- drop index if exists profiles_nickname_ci;

-- 3. (Opsional) handle_new_user(): tempel kembali definisi lama yang kamu simpan dari
--    cek_pengguna_baru.sql blok A3 (kolom definisi_lama), lalu jalankan.
--    Fungsi nick_* boleh dibiarkan, tidak mengganggu.
