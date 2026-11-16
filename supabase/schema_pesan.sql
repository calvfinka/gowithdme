-- SESI 3: Pesan antar pengguna (teks, gambar, voice note). Jalankan SETELAH schema_forum.sql dan schema_forum_ban.sql.
-- ATURAN:
--  * Hanya pengguna yang sudah masuk. Pengguna yang sedang diblokir forum tidak bisa mengirim pesan.
--  * Semua pesan dan lampiran HILANG 10 menit setelah dikirim (expires_at). Setelah itu tidak bisa dibaca siapa pun.
--  * Lampiran (gambar/voice note) maksimal 5 MB. Voice note maksimal 120 detik. Hanya JPG/PNG/WebP/GIF dan audio webm/ogg/mp4/mpeg.
--  * Pesan pertama ke orang yang belum saling kenal berupa PERMINTAAN: hanya 1 pesan teks, tanpa lampiran, sampai penerima membalas/menerima.
--  * Teks maks. 1000 huruf, tanpa tautan dan tanpa nomor telepon (sama seperti forum).
--  * Batas: 5 percakapan baru per hari, 20 pesan per menit. Bisa memblokir dan melaporkan. Laporan menyimpan salinan teks 30 hari.

create table if not exists chat_threads(
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references profiles(id) on delete cascade,
  user_b uuid not null references profiles(id) on delete cascade,
  started_by uuid not null references profiles(id) on delete cascade,
  status text not null default 'request' check (status in ('request','accepted')),
  first_sent boolean not null default false,
  created_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  check (user_a < user_b), unique(user_a,user_b));
create table if not exists chat_messages(
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references chat_threads(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('text','image','voice')),
  body text check (body is null or char_length(body)<=1000),
  file_path text, file_size int check (file_size is null or file_size<=5242880),
  duration_s int check (duration_s is null or duration_s<=120),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '10 minutes',
  read_at timestamptz,
  check ((kind='text' and body is not null and file_path is null) or (kind<>'text' and file_path is not null and file_size is not null)));
create index if not exists chat_msg_thread on chat_messages(thread_id,created_at);
create index if not exists chat_msg_exp on chat_messages(expires_at);
create table if not exists chat_blocks(blocker uuid not null references profiles(id) on delete cascade, blocked uuid not null references profiles(id) on delete cascade, created_at timestamptz default now(), primary key(blocker,blocked));
create table if not exists chat_reports(
  id uuid primary key default gen_random_uuid(), reporter uuid references profiles(id) on delete set null,
  thread_id uuid, sender_id uuid, kind text, body text, file_path text, reason text check (char_length(reason)<=300), created_at timestamptz default now());
alter table chat_threads enable row level security; alter table chat_messages enable row level security;
alter table chat_blocks enable row level security; alter table chat_reports enable row level security;

-- Baca lewat RLS; SEMUA tulis lewat fungsi (tidak ada policy insert/update/delete).
drop policy if exists "thread: peserta" on chat_threads;
create policy "thread: peserta" on chat_threads for select to authenticated using (auth.uid() in (user_a,user_b));
drop policy if exists "pesan: peserta, belum kedaluwarsa" on chat_messages;
create policy "pesan: peserta, belum kedaluwarsa" on chat_messages for select to authenticated using (
  expires_at>now() and exists(select 1 from chat_threads t where t.id=thread_id and auth.uid() in (t.user_a,t.user_b)));
drop policy if exists "blokir: milik sendiri" on chat_blocks;
create policy "blokir: milik sendiri" on chat_blocks for select to authenticated using (blocker=auth.uid());
drop policy if exists "laporan: admin" on chat_reports;
create policy "laporan: admin" on chat_reports for select to authenticated using (is_admin());

-- Penyimpanan lampiran (privat, 5 MB, tipe dibatasi). Nama berkas: <thread_id>/<user_id>/<acak>.<ext>
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('chat','chat',false,5242880,array['image/jpeg','image/png','image/webp','image/gif','audio/webm','audio/ogg','audio/mp4','audio/mpeg'])
 on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "chat unggah" on storage.objects;
create policy "chat unggah" on storage.objects for insert to authenticated with check (
  bucket_id='chat' and (storage.foldername(name))[2]=auth.uid()::text and exists(
   select 1 from chat_threads t where t.id::text=(storage.foldername(name))[1] and auth.uid() in (t.user_a,t.user_b) and t.status='accepted'));
drop policy if exists "chat baca" on storage.objects;
create policy "chat baca" on storage.objects for select to authenticated using (
  bucket_id='chat' and exists(select 1 from chat_messages m join chat_threads t on t.id=m.thread_id
   where m.file_path=storage.objects.name and m.expires_at>now() and auth.uid() in (t.user_a,t.user_b)));

create or replace function _chat_guard(p_other uuid) returns void language plpgsql security definer stable set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Masuk dulu untuk mengirim pesan.'; end if;
  if exists(select 1 from forum_bans where user_id=auth.uid() and (until_at is null or until_at>now())) then raise exception 'Akunmu sedang dibatasi dan tidak bisa mengirim pesan.'; end if;
  if p_other is not null and exists(select 1 from chat_blocks where (blocker=auth.uid() and blocked=p_other) or (blocker=p_other and blocked=auth.uid())) then raise exception 'Pesan ke pengguna ini tidak bisa dikirim.'; end if;
end $$;

create or replace function chat_open(p_other uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare a uuid; b uuid; v uuid;
begin
  perform _chat_guard(p_other);
  if p_other=auth.uid() then raise exception 'Tidak bisa mengirim pesan ke diri sendiri.'; end if;
  if not exists(select 1 from profiles where id=p_other) then raise exception 'Pengguna tidak ditemukan.'; end if;
  a:=least(auth.uid(),p_other); b:=greatest(auth.uid(),p_other);
  select id into v from chat_threads where user_a=a and user_b=b;
  if v is null then
    if (select count(*) from chat_threads where started_by=auth.uid() and created_at>now()-interval '1 day')>=5 then raise exception 'Maksimal 5 percakapan baru per hari.'; end if;
    insert into chat_threads(user_a,user_b,started_by) values(a,b,auth.uid()) returning id into v;
  end if;
  return v;
end $$;

create or replace function chat_send(p_thread uuid,p_kind text,p_body text,p_path text,p_size int,p_dur int) returns uuid
language plpgsql security definer set search_path=public as $$
declare t chat_threads; o uuid; v uuid; txt text:=trim(coalesce(p_body,''));
begin
  select * into t from chat_threads where id=p_thread and auth.uid() in (user_a,user_b);
  if t.id is null then raise exception 'Percakapan tidak ditemukan.'; end if;
  o:=case when t.user_a=auth.uid() then t.user_b else t.user_a end;
  perform _chat_guard(o);
  if (select count(*) from chat_messages where sender_id=auth.uid() and created_at>now()-interval '1 minute')>=20 then raise exception 'Terlalu cepat. Tunggu sebentar.'; end if;
  if p_kind='text' then
    if txt='' or char_length(txt)>1000 then raise exception 'Pesan kosong atau lebih dari 1000 huruf.'; end if;
    if not _forum_clean(txt) then raise exception 'Pesan tidak boleh berisi tautan atau nomor telepon.'; end if;
  else
    if t.status<>'accepted' then raise exception 'Lampiran baru bisa dikirim setelah permintaan pesan diterima.'; end if;
    if p_kind not in ('image','voice') or p_path is null or p_path not like p_thread::text||'/'||auth.uid()::text||'/%' then raise exception 'Lampiran tidak valid.'; end if;
    if coalesce(p_size,0)<=0 or p_size>5242880 then raise exception 'Lampiran maksimal 5 MB.'; end if;
    if p_kind='voice' and (coalesce(p_dur,0)<=0 or p_dur>120) then raise exception 'Voice note maksimal 120 detik.'; end if;
  end if;
  if t.status='request' then
    if t.started_by=auth.uid() then
      if t.first_sent then raise exception 'Tunggu balasan sebelum mengirim pesan lagi.'; end if;
      update chat_threads set first_sent=true where id=t.id;
    else update chat_threads set status='accepted' where id=t.id; end if;
  end if;
  insert into chat_messages(thread_id,sender_id,kind,body,file_path,file_size,duration_s)
   values(p_thread,auth.uid(),p_kind,case when p_kind='text' then txt end,case when p_kind<>'text' then p_path end,case when p_kind<>'text' then p_size end,case when p_kind='voice' then p_dur end) returning id into v;
  update chat_threads set last_at=now() where id=t.id;
  return v;
end $$;

create or replace function chat_accept(p_thread uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  update chat_threads set status='accepted' where id=p_thread and auth.uid() in (user_a,user_b) and started_by<>auth.uid();
end $$;

create or replace function chat_mark_read(p_thread uuid) returns void language sql security definer set search_path=public as $$
  update chat_messages set read_at=now() where thread_id=p_thread and sender_id<>auth.uid() and read_at is null and expires_at>now()
   and exists(select 1 from chat_threads t where t.id=p_thread and auth.uid() in (t.user_a,t.user_b)) $$;

create or replace function chat_block(p_user uuid,p_on boolean) returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Masuk dulu.'; end if;
  if p_on then insert into chat_blocks(blocker,blocked) values(auth.uid(),p_user) on conflict do nothing;
  else delete from chat_blocks where blocker=auth.uid() and blocked=p_user; end if;
end $$;

create or replace function chat_report(p_msg uuid,p_reason text) returns void language plpgsql security definer set search_path=public as $$
declare m chat_messages;
begin
  select m2.* into m from chat_messages m2 join chat_threads t on t.id=m2.thread_id
   where m2.id=p_msg and m2.sender_id<>auth.uid() and auth.uid() in (t.user_a,t.user_b);
  if m.id is null then raise exception 'Pesan tidak ditemukan atau sudah hilang.'; end if;
  insert into chat_reports(reporter,thread_id,sender_id,kind,body,file_path,reason) values(auth.uid(),m.thread_id,m.sender_id,m.kind,m.body,m.file_path,left(p_reason,300));
end $$;

-- Kotak masuk: hanya pesan yang belum hilang yang terhitung/tampil
create or replace function chat_inbox() returns table(thread_id uuid,other_id uuid,nickname text,avatar_url text,verified boolean,status text,started_by uuid,last_at timestamptz,unread int,last_kind text,last_body text,blocked boolean)
language sql security definer stable set search_path=public as $$
  select t.id,o.id,o.nickname,o.avatar_url,o.verified,t.status,t.started_by,t.last_at,
   (select count(*)::int from chat_messages m where m.thread_id=t.id and m.sender_id<>auth.uid() and m.read_at is null and m.expires_at>now()),
   lm.kind,lm.body,exists(select 1 from chat_blocks b where b.blocker=auth.uid() and b.blocked=o.id)
  from chat_threads t join profiles o on o.id=case when t.user_a=auth.uid() then t.user_b else t.user_a end
  left join lateral (select kind,body from chat_messages m where m.thread_id=t.id and m.expires_at>now() order by created_at desc limit 1) lm on true
  where auth.uid() in (t.user_a,t.user_b) order by t.last_at desc $$;
create or replace function chat_unread() returns int language sql security definer stable set search_path=public as $$
  select count(*)::int from chat_messages m join chat_threads t on t.id=m.thread_id
   where auth.uid() in (t.user_a,t.user_b) and m.sender_id<>auth.uid() and m.read_at is null and m.expires_at>now() $$;

-- Pembersihan: hapus pesan kedaluwarsa + catatan berkas + laporan > 30 hari. Dijadwalkan tiap menit lewat pg_cron.
create or replace function chat_purge() returns void language plpgsql security definer set search_path=public as $$
begin
  delete from storage.objects where bucket_id='chat' and name in (select file_path from chat_messages where expires_at<=now() and file_path is not null);
  delete from chat_messages where expires_at<=now();
  delete from chat_reports where created_at<now()-interval '30 days';
end $$;
do $$ begin
  create extension if not exists pg_cron;
  perform cron.unschedule('chat_purge') where exists(select 1 from cron.job where jobname='chat_purge');
  perform cron.schedule('chat_purge','* * * * *','select chat_purge()');
exception when others then raise notice 'pg_cron belum aktif: aktifkan di Database > Extensions, lalu jalankan ulang blok ini.'; end $$;

do $$ begin alter publication supabase_realtime add table chat_messages; exception when duplicate_object then null; end $$;

revoke all on function _chat_guard,chat_open,chat_send,chat_accept,chat_mark_read,chat_block,chat_report,chat_inbox,chat_unread,chat_purge from public,anon;
grant execute on function chat_open,chat_send,chat_accept,chat_mark_read,chat_block,chat_report,chat_inbox,chat_unread to authenticated;
