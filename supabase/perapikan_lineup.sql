-- GoWithDME: merapikan kolom events.lineup yang tersimpan sebagai literal array, mis. {NPD,Perunggu,"Nadin Amizah"}.
-- Jalankan di Supabase > SQL Editor, blok demi blok. Aman dijalankan ulang. Tampilan di situs sudah dirapikan oleh js/lineup-core.js,
-- SQL ini merapikan datanya sendiri (supaya pencarian, halaman statis, dan data/events.json juga bersih).

-- 1. Lihat dulu baris yang terkena (hanya membaca).
select id, title, lineup from events where lineup ~ '^\s*\{.*\}\s*$';

-- 2. Rapikan: {A,"B C"} menjadi A, B C. Pemisah koma di dalam tanda kutip ikut terbaca benar.
update events
set lineup = array_to_string(lineup::text[], ', ')
where lineup ~ '^\s*\{.*\}\s*$';

-- 3. Cek ulang: harus 0 baris.
select id, title, lineup from events where lineup ~ '^\s*\{.*\}\s*$';
