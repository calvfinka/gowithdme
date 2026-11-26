-- GoWithDME: hapus otomatis event yang sudah berakhir lebih dari 2 bulan (+ poster di Supabase Storage).
-- Jalankan di Supabase > SQL Editor. Aman dijalankan ulang.
--
-- Aturan: event dihapus bila coalesce(end_date, event_date) < hari ini (WIB) - 2 bulan. Semua status (terbit/draft/pengajuan).
-- Ikut terhapus otomatis (on delete cascade): ajakan teman, peminat event, pengajuan komunitas, relasi artis/penyelenggara.
-- Tidak terhapus tapi terlepas dari event (on delete set null): postingan forum dan catatan kunjungan (site_hits) tetap ada.
--
-- LANGKAH SEKALI SAJA (agar poster di Storage ikut terhapus; tanpa ini event tetap terhapus, posternya menunggu di antrian):
--  Supabase menolak/mengabaikan penghapusan berkas lewat SQL biasa (berkasnya jadi yatim di penyimpanan), jadi poster dihapus
--  lewat Storage API memakai service_role key yang disimpan terenkripsi di Vault (sama seperti token GitHub di auto_sinkron.sql).
--  1. Dashboard Supabase > Project Settings > API Keys > salin "service_role" (rahasia: JANGAN simpan di repo atau kirim ke siapa pun).
--  2. Di SQL Editor jalankan SATU baris ini (ganti isinya):
--       select vault.create_secret('GANTI_DENGAN_SERVICE_ROLE_KEY', 'service_role_key');
--     Mengganti nanti:  select vault.update_secret(id, 'kunci_baru') from vault.secrets where name='service_role_key';
--  3. Jalankan seluruh isi berkas ini.

create extension if not exists pg_net with schema extensions;

-- Antrian poster Storage yang harus dihapus (RLS aktif tanpa policy = tidak terbaca lewat API publik)
create table if not exists poster_hapus_antrian(
  nama text primary key,
  dibuat timestamptz not null default now()
);
alter table poster_hapus_antrian enable row level security;

-- Tanggal batas: event yang berakhir sebelum tanggal ini dihapus.
create or replace function _event_batas_hapus(p_bulan int default 2) returns date
language sql stable as $$
  select ((now() at time zone 'Asia/Jakarta')::date - make_interval(months => greatest(p_bulan,1)))::date $$;

-- Pratinjau (tidak menghapus apa pun): daftar event yang akan terhapus malam ini.
--   select * from event_lama_cek();
create or replace function event_lama_cek(p_bulan int default 2)
returns table(slug text, title text, status text, berakhir date)
language sql stable security definer set search_path = public as $$
  select e.slug, e.title, e.status, coalesce(e.end_date, e.event_date)
    from events e
   where coalesce(e.end_date, e.event_date) < _event_batas_hapus(p_bulan)
   order by 4 $$;

-- Kirim permintaan hapus ke Storage API untuk poster di antrian (maks 200 sekali jalan).
-- Baris antrian dibuang setelah permintaan dikirim; hasilnya bisa dicek di net._http_response.
create or replace function poster_antrian_proses() returns int
language plpgsql security definer set search_path = public, extensions, vault as $$
declare k text; r record; n int := 0;
begin
  select decrypted_secret into k from vault.decrypted_secrets where name = 'service_role_key' limit 1;
  if k is null then return 0; end if;   -- kunci belum dipasang: antrian menunggu
  for r in select nama from poster_hapus_antrian order by dibuat limit 200 loop
    perform net.http_delete(
      url     := 'https://jhqkylnqvhrljpaknjcg.supabase.co/storage/v1/object/posters/' || r.nama,
      headers := jsonb_build_object('Authorization', 'Bearer ' || k, 'apikey', k));
    delete from poster_hapus_antrian where nama = r.nama;
    n := n + 1;
  end loop;
  return n;
exception when others then
  return n;   -- gagal kirim tidak boleh menggagalkan penghapusan event; sisa antrian dicoba lagi besok
end $$;

-- Pembersihan utama. Mengembalikan jumlah event yang dihapus.
create or replace function event_purge(p_bulan int default 2) returns int
language plpgsql security definer set search_path = public as $$
declare batas date := _event_batas_hapus(p_bulan); n int;
begin
  -- 1) catat poster Storage milik event lama, kecuali bila masih dipakai event yang tetap hidup (poster bisa dipakai ulang)
  insert into poster_hapus_antrian(nama)
  select o.name from storage.objects o
   where o.bucket_id = 'posters'
     and exists (select 1 from events e
                  where coalesce(e.end_date, e.event_date) < batas
                    and position('/storage/v1/object/public/posters/' || o.name in coalesce(e.poster_url, '')) > 0)
     and not exists (select 1 from events e
                      where coalesce(e.end_date, e.event_date) >= batas
                        and position('/storage/v1/object/public/posters/' || o.name in coalesce(e.poster_url, '')) > 0)
  on conflict do nothing;
  -- 2) hapus event lama
  delete from events where coalesce(end_date, event_date) < batas;
  get diagnostics n = row_count;
  -- 3) hapus berkas poster lewat Storage API (juga mencoba ulang sisa antrian kemarin)
  perform poster_antrian_proses();
  return n;
end $$;

revoke all on function _event_batas_hapus(int), event_lama_cek(int), poster_antrian_proses(), event_purge(int) from public, anon, authenticated;

-- Jadwal: tiap hari 03.17 WIB (20.17 UTC). Sinkron konten pukul 04.07 WIB lalu membangun ulang halaman statis tanpa event lama.
do $$ begin
  create extension if not exists pg_cron;
  perform cron.unschedule('event_purge') where exists(select 1 from cron.job where jobname = 'event_purge');
  perform cron.schedule('event_purge', '17 20 * * *', 'select event_purge()');
exception when others then raise notice 'pg_cron belum aktif: aktifkan di Database > Extensions, lalu jalankan ulang blok ini.'; end $$;

-- Cek:
--   select * from event_lama_cek();                          -- apa yang akan terhapus
--   select event_purge();                                    -- jalankan sekarang (menghapus sungguhan!)
--   select * from poster_hapus_antrian;                      -- poster yang belum dikirim hapus
--   select id, status_code, left(content,100) from net._http_response order by id desc limit 5;   -- 200 = berkas terhapus
--   select jobid, schedule, active from cron.job where jobname='event_purge';
--   select * from cron.job_run_details where jobid=(select jobid from cron.job where jobname='event_purge') order by start_time desc limit 3;
