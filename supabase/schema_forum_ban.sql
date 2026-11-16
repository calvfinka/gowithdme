-- Blokir penulis: manual oleh admin + otomatis dari pelanggaran berulang. Berlaku untuk kiriman DAN balasan.
-- Jalankan SETELAH schema_forum.sql dan schema_forum_admin.sql. Aman dijalankan ulang.
--
-- Cara kerja otomatis:
--  * "Pelanggaran" = kiriman/balasan yang disembunyikan (lewat 3 laporan atau oleh admin) atau dihapus admin.
--  * 3 pelanggaran dalam 30 hari -> blokir menulis 3 hari; 5 -> 14 hari; 8 -> 90 hari.
--  * Admin yang memilih "Abaikan laporan" menghapus pelanggaran itu (blokir otomatis tidak dicabut sendiri; cabut manual).
--  * Penulis yang diblokir masih bisa membaca dan melapor, tetapi tidak bisa menulis kiriman atau balasan.

create table if not exists forum_bans(
  user_id uuid primary key references profiles(id) on delete cascade,
  reason text not null,
  until_at timestamptz,                 -- null = permanen
  auto boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now());
create table if not exists forum_strikes(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  post_id uuid references forum_posts(id) on delete cascade,
  reply_id uuid references forum_replies(id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((post_id is null)<>(reply_id is null)));
create unique index if not exists forum_strikes_post on forum_strikes(post_id) where post_id is not null;
create unique index if not exists forum_strikes_reply on forum_strikes(reply_id) where reply_id is not null;
create index if not exists forum_strikes_user on forum_strikes(user_id, created_at desc);
alter table forum_bans enable row level security; alter table forum_strikes enable row level security;
drop policy if exists "ban: admin baca" on forum_bans; create policy "ban: admin baca" on forum_bans for select to authenticated using (is_admin());
drop policy if exists "pelanggaran: admin baca" on forum_strikes; create policy "pelanggaran: admin baca" on forum_strikes for select to authenticated using (is_admin());

-- Pemeriksa blokir (dipanggil dari fungsi tulis)
create or replace function _forum_assert_not_banned() returns void language plpgsql security definer set search_path=public as $$
declare b forum_bans;
begin
  select * into b from forum_bans where user_id=auth.uid() and (until_at is null or until_at>now());
  if found then
    raise exception 'Akunmu dibatasi menulis di komunitas%. Alasan: %',
      case when b.until_at is null then '' else ' sampai '||to_char(b.until_at at time zone 'Asia/Jakarta','DD-MM-YYYY HH24:MI')||' WIB' end, b.reason;
  end if;
end $$;

-- Blokir otomatis menurut jumlah pelanggaran 30 hari terakhir. Tidak memperpendek blokir yang lebih lama/permanen.
create or replace function _forum_autoban(p_user uuid) returns void language plpgsql security definer set search_path=public as $$
declare n int; d int; cur forum_bans;
begin
  select count(*) into n from forum_strikes where user_id=p_user and created_at>now()-interval '30 days';
  d:=case when n>=8 then 90 when n>=5 then 14 when n>=3 then 3 else 0 end;
  if d=0 then return; end if;
  if exists(select 1 from profiles where id=p_user and role='admin') then return; end if;
  select * into cur from forum_bans where user_id=p_user;
  if found and (cur.until_at is null and not cur.auto or cur.until_at>now()+make_interval(days=>d)) then return; end if;
  insert into forum_bans(user_id,reason,until_at,auto,created_at)
  values(p_user,'Beberapa kiriman melanggar aturan komunitas ('||n||' dalam 30 hari).',now()+make_interval(days=>d),true,now())
  on conflict (user_id) do update set reason=excluded.reason,until_at=excluded.until_at,auto=true,created_by=null,created_at=now();
end $$;

-- Setiap kali kiriman/balasan berubah dari open menjadi hidden, catat satu pelanggaran lalu cek blokir otomatis
create or replace function _forum_strike_trg() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='hidden' and old.status='open' then
    if TG_TABLE_NAME='forum_posts' then insert into forum_strikes(user_id,post_id) values(new.author_id,new.id) on conflict do nothing;
    else insert into forum_strikes(user_id,reply_id) values(new.author_id,new.id) on conflict do nothing; end if;
    perform _forum_autoban(new.author_id);
  end if;
  return new;
end $$;
drop trigger if exists forum_posts_strike on forum_posts;
create trigger forum_posts_strike after update of status on forum_posts for each row execute function _forum_strike_trg();
drop trigger if exists forum_replies_strike on forum_replies;
create trigger forum_replies_strike after update of status on forum_replies for each row execute function _forum_strike_trg();

-- Fungsi tulis: sama seperti sebelumnya + cek blokir, tolak kiriman kembar, dan batas kecepatan
create or replace function forum_post(p_city text,p_kind text,p_event uuid,p_title text,p_body text) returns uuid
language plpgsql security definer set search_path=public as $$
declare v uuid; t text:=trim(p_title); b text:=trim(p_body);
begin
  if auth.uid() is null then raise exception 'Masuk dulu untuk menulis.'; end if;
  perform _forum_assert_not_banned();
  if not exists(select 1 from forum_cities where name=p_city and active) then raise exception 'Komunitas kota ini belum dibuka.'; end if;
  if p_kind not in ('teman','tanya','tips') then raise exception 'Jenis kiriman tidak dikenal.'; end if;
  if not (_forum_clean(t) and _forum_clean(b)) then raise exception 'Jangan taruh tautan atau nomor telepon di kiriman. Untuk kontak, pakai fitur ajakan di halaman event.'; end if;
  if (select count(*) from forum_posts where author_id=auth.uid() and created_at>now()-interval '1 day')>=5 then raise exception 'Batas 5 kiriman per hari tercapai.'; end if;
  if (select count(*) from forum_posts where author_id=auth.uid() and created_at>now()-interval '10 minutes')>=3 then raise exception 'Terlalu cepat. Tunggu beberapa menit sebelum menulis lagi.'; end if;
  if exists(select 1 from forum_posts where author_id=auth.uid() and lower(body)=lower(b) and created_at>now()-interval '1 day') then raise exception 'Kiriman yang sama sudah kamu tulis.'; end if;
  if p_event is not null and not exists(select 1 from events where id=p_event and status='published') then p_event:=null; end if;
  insert into forum_posts(city,kind,event_id,author_id,title,body) values(p_city,p_kind,p_event,auth.uid(),t,b) returning id into v;
  return v;
end $$;

create or replace function forum_reply(p_post uuid,p_body text) returns void language plpgsql security definer set search_path=public as $$
declare b text:=trim(p_body);
begin
  if auth.uid() is null then raise exception 'Masuk dulu untuk membalas.'; end if;
  perform _forum_assert_not_banned();
  if not exists(select 1 from forum_posts where id=p_post and status='open') then raise exception 'Kiriman tidak tersedia.'; end if;
  if not _forum_clean(b) then raise exception 'Jangan taruh tautan atau nomor telepon di balasan.'; end if;
  if (select count(*) from forum_replies where author_id=auth.uid() and created_at>now()-interval '1 day')>=30 then raise exception 'Batas 30 balasan per hari tercapai.'; end if;
  if (select count(*) from forum_replies where author_id=auth.uid() and created_at>now()-interval '10 minutes')>=8 then raise exception 'Terlalu cepat. Tunggu beberapa menit sebelum membalas lagi.'; end if;
  if exists(select 1 from forum_replies where author_id=auth.uid() and post_id=p_post and lower(body)=lower(b) and created_at>now()-interval '1 day') then raise exception 'Balasan yang sama sudah kamu kirim.'; end if;
  insert into forum_replies(post_id,author_id,body) values(p_post,auth.uid(),b);
  update forum_posts set last_activity=now() where id=p_post;
end $$;

-- Moderasi admin: menggantikan versi di schema_forum_admin.sql dengan pencatatan pelanggaran
--   keep   = abaikan laporan: laporan dan pelanggaran item itu dihapus, item tayang lagi bila hidden
--   hide   = sembunyikan (trigger mencatat pelanggaran)
--   delete = hapus (pelanggaran dicatat di sini)
create or replace function admin_forum_moderate(p_post uuid,p_reply uuid,p_action text) returns void
language plpgsql security definer set search_path=public as $$
declare u uuid;
begin
  if auth.uid() is null or not is_admin() then raise exception 'Hanya admin.'; end if;
  if (p_post is null)=(p_reply is null) then raise exception 'Pilih satu kiriman atau satu balasan.'; end if;
  if p_action not in ('keep','hide','delete') then raise exception 'Tindakan tidak dikenal.'; end if;
  if p_post is not null then
    if p_action='keep' then
      delete from forum_reports where post_id=p_post; delete from forum_strikes where post_id=p_post;
      update forum_posts set status='open' where id=p_post and status='hidden';
    else
      update forum_posts set status=case p_action when 'hide' then 'hidden' else 'deleted' end where id=p_post returning author_id into u;
      update forum_reports set handled_at=now() where post_id=p_post and handled_at is null;
      if p_action='delete' and u is not null then insert into forum_strikes(user_id,post_id) values(u,p_post) on conflict do nothing; perform _forum_autoban(u); end if;
    end if;
  else
    if p_action='keep' then
      delete from forum_reports where reply_id=p_reply; delete from forum_strikes where reply_id=p_reply;
      update forum_replies set status='open' where id=p_reply and status='hidden';
    else
      update forum_replies set status=case p_action when 'hide' then 'hidden' else 'deleted' end where id=p_reply returning author_id into u;
      update forum_reports set handled_at=now() where reply_id=p_reply and handled_at is null;
      if p_action='delete' and u is not null then insert into forum_strikes(user_id,reply_id) values(u,p_reply) on conflict do nothing; perform _forum_autoban(u); end if;
    end if;
  end if;
end $$;

-- Blokir manual: p_days <= 0 atau kosong = permanen. Tidak bisa memblokir admin atau diri sendiri.
create or replace function admin_forum_ban(p_user uuid,p_days int,p_reason text) returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null or not is_admin() then raise exception 'Hanya admin.'; end if;
  if p_user=auth.uid() then raise exception 'Tidak bisa memblokir diri sendiri.'; end if;
  if exists(select 1 from profiles where id=p_user and role='admin') then raise exception 'Tidak bisa memblokir admin.'; end if;
  if not exists(select 1 from profiles where id=p_user) then raise exception 'Pengguna tidak ditemukan.'; end if;
  insert into forum_bans(user_id,reason,until_at,auto,created_by,created_at)
  values(p_user,left(coalesce(nullif(trim(p_reason),''),'Melanggar aturan komunitas.'),200),case when coalesce(p_days,0)<=0 then null else now()+make_interval(days=>p_days) end,false,auth.uid(),now())
  on conflict (user_id) do update set reason=excluded.reason,until_at=excluded.until_at,auto=false,created_by=excluded.created_by,created_at=now();
end $$;

-- Cabut blokir. Semua catatan pelanggaran pengguna itu ikut dihapus agar blokir otomatis tidak langsung terpasang lagi.
create or replace function admin_forum_unban(p_user uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null or not is_admin() then raise exception 'Hanya admin.'; end if;
  delete from forum_bans where user_id=p_user;
  delete from forum_strikes where user_id=p_user;
end $$;

revoke all on function _forum_assert_not_banned, _forum_autoban, _forum_strike_trg from public, anon, authenticated;
revoke all on function forum_post, forum_reply, admin_forum_moderate, admin_forum_ban, admin_forum_unban from public, anon;
grant execute on function forum_post, forum_reply, admin_forum_moderate, admin_forum_ban, admin_forum_unban to authenticated;
