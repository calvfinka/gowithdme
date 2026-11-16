-- Komunitas per kota: papan kiriman (cari teman / tanya / tips), tautan grup, daftar tunggu kota.
-- Jalankan SETELAH schema_tahap2.sql (butuh profiles, events, is_admin()). Aman dijalankan ulang.

-- Kota yang sudah aktif. Ubah lewat tabel ini, tanpa mengubah kode.
create table if not exists forum_cities(name text primary key, active boolean not null default true, sort int not null default 100);
insert into forum_cities(name,sort) values('Bandung',1),('Jakarta',2),('Surabaya',3),('Yogyakarta',4),('Medan',5) on conflict do nothing;
alter table forum_cities enable row level security;
drop policy if exists "kota forum: publik baca" on forum_cities;
create policy "kota forum: publik baca" on forum_cities for select to anon, authenticated using (true);
drop policy if exists "kota forum: admin tulis" on forum_cities;
create policy "kota forum: admin tulis" on forum_cities for all to authenticated using (is_admin()) with check (is_admin());

-- Tautan grup WhatsApp/Telegram/Discord yang dikurasi admin (hanya https dari domain resmi)
create table if not exists forum_groups(
  id uuid primary key default gen_random_uuid(),
  city text not null references forum_cities(name) on update cascade on delete cascade,
  name text not null check (char_length(name) between 3 and 60),
  kind text not null default 'umum' check (kind in ('umum','konser','gunung')),
  url text not null check (url ~* '^https://(chat\.whatsapp\.com|whatsapp\.com/channel|t\.me|discord\.gg|discord\.com/invite)/'),
  note text check (char_length(note)<=140),
  active boolean not null default true,
  created_at timestamptz default now());
alter table forum_groups enable row level security;
drop policy if exists "grup: publik baca aktif" on forum_groups;
create policy "grup: publik baca aktif" on forum_groups for select to anon, authenticated using (active);
drop policy if exists "grup: admin tulis" on forum_groups;
create policy "grup: admin tulis" on forum_groups for all to authenticated using (is_admin()) with check (is_admin());

-- Kiriman dan balasan. Semua tulis lewat fungsi di bawah (tidak ada policy insert/update/delete).
create table if not exists forum_posts(
  id uuid primary key default gen_random_uuid(),
  city text not null references forum_cities(name) on update cascade on delete cascade,
  kind text not null check (kind in ('teman','tanya','tips')),
  event_id uuid references events(id) on delete set null,
  author_id uuid not null references profiles(id) on delete cascade,
  title text not null check (char_length(title) between 5 and 100),
  body text not null check (char_length(body) between 5 and 1000),
  status text not null default 'open' check (status in ('open','hidden','deleted')),
  created_at timestamptz default now(), last_activity timestamptz default now());
create index if not exists forum_posts_city on forum_posts(city,status,last_activity desc);
create table if not exists forum_replies(
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references forum_posts(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(body) between 2 and 600),
  status text not null default 'open' check (status in ('open','hidden','deleted')),
  created_at timestamptz default now());
create index if not exists forum_replies_post on forum_replies(post_id,created_at);
create table if not exists forum_reports(
  post_id uuid references forum_posts(id) on delete cascade,
  reply_id uuid references forum_replies(id) on delete cascade,
  reporter_id uuid not null references profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 200),
  created_at timestamptz default now(),
  check ((post_id is null)<>(reply_id is null)));
create unique index if not exists forum_reports_one_post on forum_reports(post_id,reporter_id) where post_id is not null;
create unique index if not exists forum_reports_one_reply on forum_reports(reply_id,reporter_id) where reply_id is not null;
create table if not exists forum_waitlist(city text not null, user_id uuid not null references profiles(id) on delete cascade, created_at timestamptz default now(), primary key(city,user_id));

alter table forum_posts enable row level security; alter table forum_replies enable row level security;
alter table forum_reports enable row level security; alter table forum_waitlist enable row level security;
drop policy if exists "post: admin baca" on forum_posts;   create policy "post: admin baca" on forum_posts for select to authenticated using (is_admin());
drop policy if exists "balasan: admin baca" on forum_replies; create policy "balasan: admin baca" on forum_replies for select to authenticated using (is_admin());
drop policy if exists "laporan forum: admin baca" on forum_reports; create policy "laporan forum: admin baca" on forum_reports for select to authenticated using (is_admin());
drop policy if exists "waitlist: diri sendiri" on forum_waitlist; create policy "waitlist: diri sendiri" on forum_waitlist for select to authenticated using (user_id=auth.uid());

-- Tampilan publik (tanpa id penulis; is_mine untuk tombol hapus). Event yang sudah lewat tetap bisa dibaca.
drop view if exists forum_posts_public cascade;
create view forum_posts_public as
 select p.id,p.city,p.kind,p.event_id,e.title as event_title,e.slug as event_slug,p.title,p.body,p.created_at,p.last_activity,
  (p.author_id=auth.uid()) as is_mine,pr.nickname author_name,pr.verified author_verified,
  (select count(*) from forum_replies r where r.post_id=p.id and r.status='open') reply_count
 from forum_posts p join profiles pr on pr.id=p.author_id left join events e on e.id=p.event_id
 where p.status='open';
grant select on forum_posts_public to anon, authenticated;
drop view if exists forum_replies_public cascade;
create view forum_replies_public as
 select r.id,r.post_id,r.body,r.created_at,(r.author_id=auth.uid()) as is_mine,pr.nickname author_name,pr.verified author_verified
 from forum_replies r join forum_posts p on p.id=r.post_id and p.status='open' join profiles pr on pr.id=r.author_id where r.status='open';
grant select on forum_replies_public to anon, authenticated;
drop view if exists forum_city_stats cascade;
create view forum_city_stats as
 select c.name city,c.active,c.sort,
  (select count(*) from forum_posts p where p.city=c.name and p.status='open') posts,
  (select count(*) from forum_groups g where g.city=c.name and g.active) groups,
  (select count(*) from forum_waitlist w where w.city=c.name) waiting
 from forum_cities c;
grant select on forum_city_stats to anon, authenticated;

-- Penyaring spam: tanpa tautan dan tanpa deretan angka panjang (nomor telepon). Kontak lewat fitur ajakan.
create or replace function _forum_clean(t text) returns boolean language sql immutable as
$$ select t !~* '(https?:|www\.|wa\.me|t\.me|bit\.ly|\.(com|net|id|co)\y)' and regexp_replace(t,'[\s.\-]','','g') !~ '[0-9]{8,}' $$;

create or replace function forum_post(p_city text,p_kind text,p_event uuid,p_title text,p_body text) returns uuid
language plpgsql security definer set search_path=public as $$
declare v uuid; t text:=trim(p_title); b text:=trim(p_body);
begin
  if auth.uid() is null then raise exception 'Masuk dulu untuk menulis.'; end if;
  if not exists(select 1 from forum_cities where name=p_city and active) then raise exception 'Komunitas kota ini belum dibuka.'; end if;
  if p_kind not in ('teman','tanya','tips') then raise exception 'Jenis kiriman tidak dikenal.'; end if;
  if not (_forum_clean(t) and _forum_clean(b)) then raise exception 'Jangan taruh tautan atau nomor telepon di kiriman. Untuk kontak, pakai fitur ajakan di halaman event.'; end if;
  if (select count(*) from forum_posts where author_id=auth.uid() and created_at>now()-interval '1 day')>=5 then raise exception 'Batas 5 kiriman per hari tercapai.'; end if;
  if p_event is not null and not exists(select 1 from events where id=p_event and status='published') then p_event:=null; end if;
  insert into forum_posts(city,kind,event_id,author_id,title,body) values(p_city,p_kind,p_event,auth.uid(),t,b) returning id into v;
  return v;
end $$;

create or replace function forum_reply(p_post uuid,p_body text) returns void language plpgsql security definer set search_path=public as $$
declare b text:=trim(p_body);
begin
  if auth.uid() is null then raise exception 'Masuk dulu untuk membalas.'; end if;
  if not exists(select 1 from forum_posts where id=p_post and status='open') then raise exception 'Kiriman tidak tersedia.'; end if;
  if not _forum_clean(b) then raise exception 'Jangan taruh tautan atau nomor telepon di balasan.'; end if;
  if (select count(*) from forum_replies where author_id=auth.uid() and created_at>now()-interval '1 day')>=30 then raise exception 'Batas 30 balasan per hari tercapai.'; end if;
  insert into forum_replies(post_id,author_id,body) values(p_post,auth.uid(),b);
  update forum_posts set last_activity=now() where id=p_post;
end $$;

create or replace function forum_delete(p_post uuid,p_reply uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Masuk dulu.'; end if;
  if p_reply is not null then
    update forum_replies set status='deleted' where id=p_reply and (author_id=auth.uid() or is_admin());
  else
    update forum_posts set status='deleted' where id=p_post and (author_id=auth.uid() or is_admin());
  end if;
end $$;

-- Laporan: 3 pelapor berbeda menyembunyikan kiriman atau balasan secara otomatis
create or replace function forum_report(p_post uuid,p_reply uuid,p_reason text) returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Masuk dulu untuk melapor.'; end if;
  if (p_post is null)=(p_reply is null) then raise exception 'Pilih satu kiriman atau balasan.'; end if;
  insert into forum_reports(post_id,reply_id,reporter_id,reason) values(p_post,p_reply,auth.uid(),left(trim(p_reason),200)) on conflict do nothing;
  if p_post is not null and (select count(*) from forum_reports where post_id=p_post)>=3 then update forum_posts set status='hidden' where id=p_post and status='open'; end if;
  if p_reply is not null and (select count(*) from forum_reports where reply_id=p_reply)>=3 then update forum_replies set status='hidden' where id=p_reply and status='open'; end if;
end $$;

create or replace function forum_waitlist_join(p_city text,p_on boolean) returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Masuk dulu.'; end if;
  if p_on then insert into forum_waitlist(city,user_id) values(left(trim(p_city),60),auth.uid()) on conflict do nothing;
  else delete from forum_waitlist where city=p_city and user_id=auth.uid(); end if;
end $$;

revoke all on function _forum_clean,forum_post,forum_reply,forum_delete,forum_report,forum_waitlist_join from public,anon;
grant execute on function _forum_clean to authenticated;
grant execute on function forum_post,forum_reply,forum_delete,forum_report,forum_waitlist_join to authenticated;
