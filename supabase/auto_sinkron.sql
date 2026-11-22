-- GoWithDME: sinkron otomatis begitu event atau blog diterbitkan/diubah (tanpa menunggu jadwal workflow).
-- Cara kerja: tabel events dan blog_posts memicu fungsi kick_sinkron(), yang memanggil GitHub API untuk menjalankan
-- workflow "Sinkron konten". Halaman statis terbit sekitar 2-4 menit kemudian. Jadwal tiap jam di sinkron.yml tetap jalan sebagai cadangan.
-- Jalankan di Supabase > SQL Editor SETELAH schema_blog.sql dan schema.sql. Aman dijalankan ulang.
--
-- LANGKAH SEKALI SAJA (sebelum menjalankan berkas ini):
--  1. GitHub > Settings (akun) > Developer settings > Personal access tokens > Fine-grained tokens > Generate new token.
--     Repository access: Only select repositories > calvfinka/gowithdme.
--     Permissions > Repository permissions > Actions: Read and write (lainnya biarkan). Expiration: 1 tahun. Salin tokennya (github_pat_...).
--  2. Di SQL Editor jalankan SATU baris ini dulu (ganti isinya dengan token Anda; JANGAN simpan token di repo):
--       select vault.create_secret('github_pat_GANTI_DENGAN_TOKEN_ANDA', 'github_dispatch_token');
--     Untuk mengganti token nanti:  select vault.update_secret(id, 'token_baru') from vault.secrets where name='github_dispatch_token';
--  3. Jalankan seluruh isi berkas ini.
-- Bila token kedaluwarsa atau dicabut, situs tetap jalan: sinkron kembali ke jadwal tiap jam.

create extension if not exists pg_net with schema extensions;

-- Catatan panggilan (RLS aktif tanpa policy = tidak terbaca lewat API publik)
create table if not exists sinkron_log(
  id bigserial primary key,
  at timestamptz not null default now(),
  tabel text,
  request_id bigint
);
alter table sinkron_log enable row level security;

create or replace function kick_sinkron() returns trigger
language plpgsql security definer set search_path = public, extensions, vault as $$
declare
  pub boolean; tok text; rid bigint;
begin
  -- hanya bila ada baris TERBIT yang berubah (draft, tinjauan, dan pengajuan tidak memicu)
  if TG_OP = 'DELETE' then pub := (OLD.status = 'published');
  elsif TG_OP = 'INSERT' then pub := (NEW.status = 'published');
  else pub := (NEW.status = 'published' or OLD.status = 'published');
  end if;
  if not pub then return null; end if;

  -- satu panggilan per transaksi/5 detik (impor banyak baris sekaligus tidak membanjiri GitHub)
  if exists (select 1 from sinkron_log where at > now() - interval '5 seconds') then return null; end if;

  select decrypted_secret into tok from vault.decrypted_secrets where name = 'github_dispatch_token' limit 1;
  if tok is null then return null; end if;

  select net.http_post(
    url     := 'https://api.github.com/repos/calvfinka/gowithdme/actions/workflows/sinkron.yml/dispatches',
    body    := '{"ref":"main"}'::jsonb,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || tok,
      'Accept', 'application/vnd.github+json',
      'X-GitHub-Api-Version', '2022-11-28',
      'User-Agent', 'gwm-supabase',
      'Content-Type', 'application/json')
  ) into rid;
  insert into sinkron_log(tabel, request_id) values (TG_TABLE_NAME, rid);
  delete from sinkron_log where at < now() - interval '14 days';
  return null;
exception when others then
  return null;   -- gagal memicu sinkron tidak boleh menggagalkan penyimpanan konten
end $$;

revoke all on function kick_sinkron() from public, anon, authenticated;

drop trigger if exists kick_sinkron_blog on blog_posts;
create trigger kick_sinkron_blog after insert or update or delete on blog_posts
  for each row execute function kick_sinkron();

drop trigger if exists kick_sinkron_events on events;
create trigger kick_sinkron_events after insert or update or delete on events
  for each row execute function kick_sinkron();

-- Uji: ubah satu tulisan terbit (mis. tekan Simpan di Panel Admin), lalu cek di GitHub > Actions: "Sinkron konten" mulai dalam hitungan detik.
-- Cek riwayat panggilan:   select * from sinkron_log order by id desc limit 5;
-- Cek jawaban GitHub (204 = sukses):   select id, status_code, left(content,120) from net._http_response order by id desc limit 5;
