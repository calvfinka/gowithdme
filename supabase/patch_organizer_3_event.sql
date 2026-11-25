-- Isi penyelenggara (organizer) untuk 3 event yang ditandai Search Console.
-- Aman diulang. Jalankan di Supabase > SQL Editor agar data live sama dengan data/events.json.
update events set organizer = 'Eastves (East Indonesian Creative Space & Networking)' where id = '531850ea-0b17-4068-b687-d52775ec3511';
update events set organizer = 'Juara' where id = 'ce435003-6aca-459a-82cb-8d4c314406b9';
update events set organizer = 'Fakultas Ilmu Sosial dan Ilmu Politik Universitas Diponegoro (FISIP Undip)' where id = '3e3885bf-fa84-4ed6-af03-a524ba379ed0';
