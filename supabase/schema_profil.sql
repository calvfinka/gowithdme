-- Profil diperluas + pengunjung terakhir. Jalankan SETELAH schema_forum.sql dan schema_ajakan_fix.sql. Aman dijalankan ulang.
--
-- Prinsip privasi:
--  * Profil lengkap hanya bisa dibuka pengguna yang sudah masuk (bukan publik anonim).
--  * Pengunjung yang masuk tercatat di profil yang dibuka (nama, foto, waktu) selama 30 hari, dan daftar itu bisa dilihat pengguna login lain.
--  * Pemilik profil bisa mematikan profilnya, mematikan daftar pengunjungnya, dan menghapus daftarnya kapan saja.
--  * Setiap pengguna bisa mematikan pencatatan kunjungannya sendiri; riwayat kunjungannya di profil orang lain ikut dihapus.
--  * Tidak ada jam terakhir online, lokasi, atau jumlah kunjungan per orang.

-- Data tambahan profil. Dibaca pemiliknya langsung; pihak lain hanya lewat profile_view (menghormati pengaturan privasi).
create table if not exists profile_extra(
  user_id uuid primary key references profiles(id) on delete cascade,
  bio text check (bio is null or char_length(bio)<=200),
  interests text[] not null default '{}',
  hike_level text check (hike_level is null or hike_level in ('pemula','menengah','sulit')),
  is_public boolean not null default true,
  show_visitors boolean not null default true,
  log_visits boolean not null default true,
  updated_at timestamptz not null default now());
create table if not exists profile_visits(
  profile_id uuid not null references profiles(id) on delete cascade,
  visitor_id uuid not null references profiles(id) on delete cascade,
  visited_at timestamptz not null default now(),
  primary key(profile_id,visitor_id));
create index if not exists profile_visits_recent on profile_visits(profile_id, visited_at desc);
alter table profile_extra enable row level security; alter table profile_visits enable row level security;
drop policy if exists "profil tambahan: diri sendiri" on profile_extra;
create policy "profil tambahan: diri sendiri" on profile_extra for select to authenticated using (user_id=auth.uid());
-- profile_visits sengaja tanpa policy: hanya lewat fungsi di bawah.

create or replace function profile_log_visits(p_on boolean) returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Masuk dulu.'; end if;
  insert into profile_extra(user_id,log_visits) values(auth.uid(),coalesce(p_on,true))
  on conflict (user_id) do update set log_visits=coalesce(p_on,true),updated_at=now();
  if not coalesce(p_on,true) then delete from profile_visits where visitor_id=auth.uid(); end if;
end $$;

create or replace function profile_save(p_bio text,p_interests text[],p_level text,p_public boolean,p_show_visitors boolean,p_log_visits boolean) returns void
language plpgsql security definer set search_path=public as $$
declare b text:=nullif(trim(coalesce(p_bio,'')),''); it text[]:=coalesce(p_interests,'{}'); x text;
begin
  if auth.uid() is null then raise exception 'Masuk dulu.'; end if;
  if b is not null and char_length(b)>200 then raise exception 'Bio maksimal 200 huruf.'; end if;
  if b is not null and not _forum_clean(b) then raise exception 'Jangan taruh tautan atau nomor telepon di bio.'; end if;
  if array_length(it,1)>8 then raise exception 'Pilih maksimal 8 minat.'; end if;
  foreach x in array it loop
    if x not in ('konser','festival','pameran','naikgunung','camping','pop','rock','indie','edm','jazz','hiphop','dangdut','kpop') then raise exception 'Minat tidak dikenal.'; end if;
  end loop;
  if p_level is not null and p_level not in ('pemula','menengah','sulit') then raise exception 'Level tidak dikenal.'; end if;
  insert into profile_extra(user_id,bio,interests,hike_level,is_public,show_visitors,log_visits)
  values(auth.uid(),b,it,p_level,coalesce(p_public,true),coalesce(p_show_visitors,true),coalesce(p_log_visits,true))
  on conflict (user_id) do update set bio=excluded.bio,interests=excluded.interests,hike_level=excluded.hike_level,
    is_public=excluded.is_public,show_visitors=excluded.show_visitors,log_visits=excluded.log_visits,updated_at=now();
  if not coalesce(p_log_visits,true) then delete from profile_visits where visitor_id=auth.uid(); end if;
end $$;

-- Membuka profil: mengembalikan data yang boleh dilihat dan (bila diizinkan) mencatat kunjungan.
create or replace function profile_view(p_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare pr profiles; ex profile_extra; me uuid:=auth.uid(); mine boolean; pub boolean; lg boolean; res jsonb;
begin
  if me is null then raise exception 'Masuk dulu untuk melihat profil.'; end if;
  select * into pr from profiles where id=p_id;
  if not found then return null; end if;
  select * into ex from profile_extra where user_id=p_id;
  mine:=(me=p_id); pub:=coalesce(ex.is_public,true);
  if not mine and pub then
    select log_visits into lg from profile_extra where user_id=me;
    if coalesce(lg,true) then
      insert into profile_visits(profile_id,visitor_id,visited_at) values(p_id,me,now())
      on conflict (profile_id,visitor_id) do update set visited_at=now();
    end if;
    if random()<0.02 then delete from profile_visits where visited_at<now()-interval '90 days'; end if;
  end if;
  res:=jsonb_build_object('id',pr.id,'nickname',pr.nickname,'avatar_url',pr.avatar_url,'verified',coalesce(pr.verified,false),'role',pr.role,'joined',pr.created_at,'mine',mine,'is_public',pub);
  if mine or pub then
    res:=res||jsonb_build_object(
      'city',(select c.name from cities c where c.id=pr.city_id),'bio',ex.bio,'interests',to_jsonb(coalesce(ex.interests,'{}'::text[])),'level',ex.hike_level,
      'show_visitors',coalesce(ex.show_visitors,true),
      'stats',jsonb_build_object(
        'posts',(select count(*) from forum_posts f where f.author_id=p_id and f.status='open'),
        'hosted',(select count(*) from invitations i where i.host_id=p_id and i.status<>'cancelled'),
        'joined',(select count(*) from invitation_members m where m.user_id=p_id and m.status='approved')));
  end if;
  return res;
end $$;

-- 12 pengunjung terakhir (30 hari). Pemilik selalu bisa melihat; orang lain hanya bila profil publik dan daftar tidak disembunyikan.
create or replace function profile_visitors(p_id uuid) returns table(id uuid,nickname text,avatar_url text,verified boolean,visited_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare ex profile_extra;
begin
  if auth.uid() is null then return; end if;
  select * into ex from profile_extra where user_id=p_id;
  if auth.uid()<>p_id and not (coalesce(ex.is_public,true) and coalesce(ex.show_visitors,true)) then return; end if;
  return query select p.id,p.nickname,p.avatar_url,coalesce(p.verified,false),v.visited_at
    from profile_visits v join profiles p on p.id=v.visitor_id
    where v.profile_id=p_id and v.visited_at>now()-interval '30 days' order by v.visited_at desc limit 12;
end $$;

create or replace function profile_visitors_clear() returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Masuk dulu.'; end if;
  delete from profile_visits where profile_id=auth.uid();
end $$;

revoke all on function profile_log_visits, profile_save, profile_view, profile_visitors, profile_visitors_clear from public, anon;
grant execute on function profile_log_visits, profile_save, profile_view, profile_visitors, profile_visitors_clear to authenticated;

-- Tautan ke profil dari forum dan ajakan: id penulis hanya diberikan ke pengguna yang sudah masuk (anonim mendapat null).
create or replace view forum_posts_public as
 select p.id,p.city,p.kind,p.event_id,e.title as event_title,e.slug as event_slug,p.title,p.body,p.created_at,p.last_activity,
  (p.author_id=auth.uid()) as is_mine,pr.nickname author_name,pr.verified author_verified,
  (select count(*) from forum_replies r where r.post_id=p.id and r.status='open') reply_count,
  case when auth.uid() is not null then p.author_id end as author_ref
 from forum_posts p join profiles pr on pr.id=p.author_id left join events e on e.id=p.event_id
 where p.status='open';
create or replace view forum_replies_public as
 select r.id,r.post_id,r.body,r.created_at,(r.author_id=auth.uid()) as is_mine,pr.nickname author_name,pr.verified author_verified,
  case when auth.uid() is not null then r.author_id end as author_ref
 from forum_replies r join forum_posts p on p.id=r.post_id and p.status='open' join profiles pr on pr.id=r.author_id where r.status='open';
create or replace view invitations_public as
 select i.id,i.event_id,(i.host_id=auth.uid()) as is_mine,i.title,i.note,i.meeting_point,i.cost_share,i.capacity,i.status,i.created_at,
  p.nickname host_name,p.verified host_verified,
  1+(select count(*) from invitation_members m where m.invitation_id=i.id and m.status='approved') filled,
  case when auth.uid() is not null then i.host_id end as host_ref
 from invitations i join profiles p on p.id=i.host_id join events e on e.id=i.event_id
 where i.status in ('open','full') and e.status='published' and coalesce(e.end_date,e.event_date)>=(now() at time zone 'Asia/Jakarta')::date;
grant select on forum_posts_public, forum_replies_public, invitations_public to anon, authenticated;
