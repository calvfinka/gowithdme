-- GoWithDME: pengecek patch_pengguna_baru.sql. Hanya MEMBACA, aman dijalankan kapan saja di Supabase > SQL Editor.
-- Jalankan tiap blok terpisah (blok A sebelum patch, blok B-D sesudah patch).

-- ============ A. SEBELUM patch: prasyarat dan cadangan ============
-- A1. Harus 4 baris (created_at, nickname, role, verified). Bila role tidak ada, jalankan schema_tahap2.sql dulu.
select column_name from information_schema.columns
where table_schema='public' and table_name='profiles' and column_name in ('created_at','nickname','role','verified')
order by 1;

-- A2. Tabel yang akan dijaga trigger. Tabel yang bernilai null dilewati patch (tidak error).
select to_regclass('public.chat_threads') as chat_threads, to_regclass('public.forum_posts') as forum_posts,
       to_regclass('public.forum_replies') as forum_replies, to_regclass('public.invitations') as invitations,
       to_regclass('public.event_submissions') as event_submissions;

-- A3. SIMPAN hasilnya ke file teks (untuk membatalkan handle_new_user bila perlu).
select pg_get_functiondef('public.handle_new_user'::regproc) as definisi_lama;

-- A4. Nama kembar yang akan diberi akhiran oleh patch (tinjau dulu bila mau).
select lower(nickname) as nama, count(*) as jumlah from profiles
where nickname is not null group by 1 having count(*) > 1 order by 2 desc;

-- ============ B. Apakah patch sudah terpasang? ============
-- Harapan setelah patch: semua true, jumlah_trigger_batas = jumlah tabel A2 yang ada (maksimal 5).
select
  exists(select 1 from pg_proc where proname='probation_limit')  as fn_batas,
  exists(select 1 from pg_proc where proname='acct_probation')   as fn_percobaan,
  exists(select 1 from pg_proc where proname='nick_issue')       as fn_nama,
  exists(select 1 from pg_indexes where indexname='profiles_nickname_ci') as indeks_nama_unik,
  exists(select 1 from pg_trigger where tgname='profiles_nick_guard' and not tgisinternal) as penjaga_nama,
  (select count(*) from pg_trigger where tgname='probation_limit' and not tgisinternal) as jumlah_trigger_batas,
  coalesce((select pg_get_functiondef('public.handle_new_user'::regproc) like '%nick_make%'), false) as handle_new_user_baru;

-- B2. Tabel mana saja yang punya trigger. Harapan: chat_threads, event_submissions, forum_posts, forum_replies, invitations (+ profiles untuk penjaga nama).
select c.relname as tabel, t.tgname as trigger
from pg_trigger t join pg_class c on c.oid=t.tgrelid
where t.tgname in ('probation_limit','profiles_nick_guard') and not t.tgisinternal
order by 1, 2;

-- ============ C. Cek aturan nama (hanya baca) ============
-- Harapan: private, reserved, reserved, (null), (null)
select t as nama, nick_issue(t) as hasil
from (values ('budi@gmail.com'),('Admin'),('4dm1n'),('Budi Santoso'),('Administrasi Kota')) v(t);

-- Nama lama yang melanggar aturan baru (tidak diubah otomatis, hanya untuk ditinjau).
select id, nickname, nick_issue(nickname) as masalah from profiles where nick_issue(nickname) is not null;

-- ============ D. Akun yang sedang masa percobaan (siapa yang terkena batas) ============
select p.id, p.nickname, p.created_at, p.verified, acct_probation(p.id) as masa_percobaan
from profiles p
order by p.created_at desc nulls last
limit 20;
