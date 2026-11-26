-- GoWithDME: hapus otomatis event yang sudah berakhir lebih dari 2 bulan (+ poster di Supabase Storage).
-- Jalankan di Supabase > SQL Editor. Aman dijalankan ulang.
--
-- Aturan dua tahap (acuan: tanggal berakhir = coalesce(end_date, event_date), hari ini menurut WIB):
--   Tahap 1, berakhir > 2 bulan : poster Supabase Storage dihapus dan poster_url dikosongkan (poster di repo ikut dilepas dan
--                                 dihapus tools/bersih_lama.py; kartu og/ tidak dibuat lagi oleh build.py). Teks event TETAP tayang.
--                                 Poster dari situs lain (hotlink) dibiarkan: tidak memakan storage Anda.
--   Tahap 2, berakhir > 12 bulan: seluruh event dihapus. Ikut terhapus (on delete cascade): ajakan teman, peminat event, pengajuan
--                                 komunitas, relasi artis/penyelenggara. Terlepas dari event (set null): postingan forum, site_hits.
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

-- Versi lama (1 parameter) dibuang agar tidak bentrok dengan versi baru
drop function if exists event_purge(int);
drop function if exists event_lama_cek(int);

-- Antrian poster Storage yang harus dihapus (RLS aktif tanpa policy = tidak terbaca lewat API publik)
create table if not exists poster_hapus_antrian(
  nama text primary key,
  dibuat timestamptz not null default now()
);
alter table poster_hapus_antrian enable row level security;

-- Tanggal batas: berakhir sebelum tanggal ini = lewat batas.
create or replace function _event_batas_hapus(p_bulan int default 2) returns date
language sql stable as $$
  select ((now() at time zone 'Asia/Jakarta')::date - make_interval(months => greatest(p_bulan,1)))::date $$;

-- Pratinjau (tidak mengubah apa pun): apa yang akan terjadi pada jadwal berikutnya.
--   select * from event_lama_cek();
create or replace function event_lama_cek(p_poster_bulan int default 2, p_hapus_bulan int default 12)
returns table(slug text, title text, status text, berakhir date, aksi text)
language sql stable security definer set search_path = public as $$
  select e.slug, e.title, e.status, coalesce(e.end_date, e.event_date),
         case when coalesce(e.end_date, e.event_date) < _event_batas_hapus(p_hapus_bulan) then 'HAPUS EVENT'
              else 'hapus poster' end
    from events e
   where coalesce(e.end_date, e.event_date) < _event_batas_hapus(p_poster_bulan)
     and (coalesce(e.end_date, e.event_date) < _event_batas_hapus(p_hapus_bulan)
          or coalesce(e.poster_url,'') like '%/storage/v1/object/public/posters/%'
          or coalesce(e.poster_url,'') like 'assets/posters/%')
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

-- Pembersihan utama. Mengembalikan jumlah event yang dihapus seluruhnya (tahap 2).
create or replace function event_purge(p_poster_bulan int default 2, p_hapus_bulan int default 12) returns int
language plpgsql security definer set search_path = public as $$
declare bp date := _event_batas_hapus(p_poster_bulan); bh date := _event_batas_hapus(greatest(p_hapus_bulan, p_poster_bulan)); n int;
begin
  -- 1) catat poster Storage milik event lama, kecuali bila masih dipakai event yang tetap punya poster (poster bisa dipakai ulang)
  insert into poster_hapus_antrian(nama)
  select o.name from storage.objects o
   where o.bucket_id = 'posters'
     and exists (select 1 from events e
                  where coalesce(e.end_date, e.event_date) < bp
                    and position('/storage/v1/object/public/posters/' || o.name in coalesce(e.poster_url, '')) > 0)
     and not exists (select 1 from events e
                      where coalesce(e.end_date, e.event_date) >= bp
                        and position('/storage/v1/object/public/posters/' || o.name in coalesce(e.poster_url, '')) > 0)
  on conflict do nothing;
  -- 2) tahap 1: lepas poster Storage/repo dari event lama (teks event tetap)
  update events set poster_url = null
   where coalesce(end_date, event_date) < bp
     and (poster_url like '%/storage/v1/object/public/posters/%' or poster_url like 'assets/posters/%');
  -- 3) tahap 2: hapus event yang sangat lama
  delete from events where coalesce(end_date, event_date) < bh;
  get diagnostics n = row_count;
  -- 4) hapus berkas poster lewat Storage API (juga mencoba ulang sisa antrian kemarin)
  perform poster_antrian_proses();
  return n;
end $$;

revoke all on function _event_batas_hapus(int), event_lama_cek(int,int), poster_antrian_proses(), event_purge(int,int) from public, anon, authenticated;

-- Jadwal: tiap hari 03.17 WIB (20.17 UTC). Sinkron konten pukul 04.07 WIB lalu membangun ulang halaman statis tanpa event lama.
do $$ begin
  create extension if not exists pg_cron;
  perform cron.unschedule('event_purge') where exists(select 1 from cron.job where jobname = 'event_purge');
  perform cron.schedule('event_purge', '17 20 * * *', 'select event_purge()');
exception when others then raise notice 'pg_cron belum aktif: aktifkan di Database > Extensions, lalu jalankan ulang blok ini.'; end $$;

-- Cek:
--   select * from event_lama_cek();                          -- apa yang akan terhapus
--   select event_purge();                                    -- jalankan sekarang (MENGUBAH/MENGHAPUS sungguhan!)
--   select * from poster_hapus_antrian;                      -- poster yang belum dikirim hapus
--   select id, status_code, left(content,100) from net._http_response order by id desc limit 5;   -- 200 = berkas terhapus
--   select jobid, schedule, active from cron.job where jobname='event_purge';
--   select * from cron.job_run_details where jobid=(select jobid from cron.job where jobname='event_purge') order by start_time desc limit 3;
