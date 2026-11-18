-- Ajakan LUAS: ajakan boleh berdiri sendiri (tanpa event), punya niche + tag kombinasi, dan tingkat jangkauan.
-- Jalankan SETELAH schema_ajakan.sql, schema_ajakan_fix.sql, schema_forum.sql, dan schema_profil.sql. Aman dijalankan ulang.

-- 1. Kolom baru. Ajakan lama (terkait event) tidak berubah.
alter table invitations alter column event_id drop not null;
alter table invitations add column if not exists niche text;
alter table invitations add column if not exists tags text[] not null default '{}';
alter table invitations add column if not exists reach text not null default 'kota';
alter table invitations add column if not exists city text;
alter table invitations add column if not exists when_date date;

-- 2. Daftar niche & tag yang diizinkan (satu tempat; ubah di sini bila ingin menambah)
create or replace function _inv_niches() returns text[] language sql immutable as
$$ select array['musik','petualangan','olahraga','kuliner','hobi','belajar','seni','sosial'] $$;
create or replace function _inv_tags() returns text[] language sql immutable as
$$ select array['konser','festival','karaoke','jamsession','kpop',
  'naikgunung','camping','pantai','roadtrip','sepeda',
  'lari','futsal','badminton','gym','renang',
  'kulineran','ngopi','nongkrong','masak',
  'game','boardgame','fotografi','film','anime',
  'belajarbareng','bahasa','bisnis','karier','coding',
  'pameran','museum','teater','komedi',
  'relawan','donasi','lingkungan'] $$;

alter table invitations drop constraint if exists inv_niche_ok;
alter table invitations add constraint inv_niche_ok check (niche is null or niche = any(_inv_niches()));
alter table invitations drop constraint if exists inv_tags_ok;
alter table invitations add constraint inv_tags_ok check (cardinality(tags)<=3 and tags <@ _inv_tags());
alter table invitations drop constraint if exists inv_reach_ok;
alter table invitations add constraint inv_reach_ok check (reach in ('kota','provinsi','nasional','online'));
-- ajakan tanpa event wajib punya niche, tanggal, dan kota (kecuali online)
alter table invitations drop constraint if exists inv_open_ok;
alter table invitations add constraint inv_open_ok check (
  event_id is not null or (niche is not null and when_date is not null and (reach='online' or city is not null)));

create index if not exists invitations_open_idx on invitations(niche,when_date) where event_id is null and status in ('open','full');

-- 3. Ajakan masih berlaku? (event aktif, atau tanggal ajakan belum lewat)
create or replace function _inv_alive(i invitations) returns boolean language sql security definer stable set search_path=public as
$$ select case when i.event_id is not null then _event_active(i.event_id)
               else i.when_date>=(now() at time zone 'Asia/Jakarta')::date end $$;

-- 4. Tampilan publik: kolom baru ditambahkan di BELAKANG (kolom lama tetap sama, jadi event_social dan kode lama tidak rusak)
create or replace view invitations_public as
 select i.id,i.event_id,(i.host_id=auth.uid()) as is_mine,i.title,i.note,i.meeting_point,i.cost_share,i.capacity,i.status,i.created_at,
  p.nickname host_name,p.verified host_verified,
  1+(select count(*) from invitation_members m where m.invitation_id=i.id and m.status='approved') filled,
  case when auth.uid() is not null then i.host_id end as host_ref,
  coalesce(i.niche, case e.category when 'konser' then 'musik' when 'festival' then 'musik' when 'naikgunung' then 'petualangan'
    when 'pameran' then 'seni' when 'komedi' then 'seni' when 'seminar' then 'belajar' when 'meetup' then 'sosial' else null end) as niche,
  i.tags,
  case when i.event_id is null then i.reach else 'kota' end as reach,
  coalesce(i.city,c.name) as city,
  coalesce(i.when_date,e.event_date) as when_date,
  e.title as event_title,
  e.slug as event_slug
 from invitations i
 join profiles p on p.id=i.host_id
 left join events e on e.id=i.event_id
 left join cities c on c.id=e.city_id
 where i.status in ('open','full') and (
   (i.event_id is not null and e.status='published' and coalesce(e.end_date,e.event_date)>=(now() at time zone 'Asia/Jakarta')::date)
   or (i.event_id is null and i.when_date>=(now() at time zone 'Asia/Jakarta')::date));
grant select on invitations_public to anon, authenticated;

-- 5. Buat ajakan bebas (tanpa event)
create or replace function create_invitation_open(p_title text,p_note text,p_meet text,p_cost text,p_cap int,p_wa text,
  p_niche text,p_tags text[],p_reach text,p_city text,p_date date) returns uuid
language plpgsql security definer set search_path=public as $$
declare v uuid; w text:=regexp_replace(coalesce(p_wa,''),'\D','','g'); t text[]; today date:=(now() at time zone 'Asia/Jakarta')::date;
begin
  if auth.uid() is null then raise exception 'Masuk dulu untuk membuat ajakan.'; end if;
  -- tutup ajakan milik sendiri yang sudah lewat, supaya tidak menghabiskan jatah 3 ajakan aktif
  update invitations set status='closed' where host_id=auth.uid() and status in ('open','full')
    and ((event_id is null and when_date<today) or (event_id is not null and not _event_active(event_id)));
  if (select count(*) from invitations where host_id=auth.uid() and status in ('open','full'))>=3 then raise exception 'Maksimal 3 ajakan aktif sekaligus.'; end if;
  if (select count(*) from invitations where host_id=auth.uid() and created_at>now()-interval '1 day')>=5 then raise exception 'Maksimal 5 ajakan baru per hari.'; end if;
  if not (_forum_clean(coalesce(p_title,'')) and _forum_clean(coalesce(p_note,'')) and _forum_clean(coalesce(p_meet,'')) and _forum_clean(coalesce(p_cost,''))) then
    raise exception 'Jangan taruh tautan atau nomor telepon di teks ajakan. Kontak diisi di kolom WhatsApp.'; end if;
  if p_niche is null or not (p_niche = any(_inv_niches())) then raise exception 'Pilih niche ajakan.'; end if;
  select coalesce(array_agg(distinct x),'{}') into t from unnest(coalesce(p_tags,'{}')) x;
  if cardinality(t)>3 or not (t <@ _inv_tags()) then raise exception 'Maksimal 3 tag dari daftar yang tersedia.'; end if;
  if p_reach is null or p_reach not in ('kota','provinsi','nasional','online') then raise exception 'Pilih jangkauan ajakan.'; end if;
  if p_reach<>'online' and not exists(select 1 from cities where name=p_city) then raise exception 'Pilih kota dari daftar.'; end if;
  if p_date is null or p_date<today or p_date>today+60 then raise exception 'Tanggal harus dalam 60 hari ke depan.'; end if;
  if left(w,1)='0' then w:='62'||substr(w,2); end if;
  insert into invitations(event_id,host_id,title,note,meeting_point,cost_share,capacity,niche,tags,reach,city,when_date)
   values(null,auth.uid(),trim(p_title),nullif(trim(p_note),''),nullif(trim(p_meet),''),nullif(trim(p_cost),''),p_cap,
          p_niche,t,p_reach,case when p_reach='online' then null else p_city end,p_date) returning id into v;
  insert into invitation_contacts values(v,w);
  return v;
end $$;

-- 6. Gabung: berlaku juga untuk ajakan tanpa event (ganti pengecekan event aktif dengan _inv_alive)
create or replace function request_join(p_inv uuid,p_msg text) returns void language plpgsql security definer set search_path=public as $$
declare i invitations;
begin
  if auth.uid() is null then raise exception 'Masuk dulu untuk bergabung.'; end if;
  select * into i from invitations where id=p_inv;
  if i.id is null or i.status<>'open' or not _inv_alive(i) then raise exception 'Ajakan sudah penuh atau ditutup.'; end if;
  if i.host_id=auth.uid() then raise exception 'Ini ajakanmu sendiri.'; end if;
  if (select count(*) from invitation_members where user_id=auth.uid() and status='pending')>=10 then raise exception 'Terlalu banyak permintaan menunggu.'; end if;
  insert into invitation_members(invitation_id,user_id,message) values(p_inv,auth.uid(),left(p_msg,200))
   on conflict(invitation_id,user_id) do update set status='pending',message=left(p_msg,200) where invitation_members.status='left';
  if not found then raise exception 'Kamu sudah mengajukan ke ajakan ini.'; end if;
end $$;

revoke all on function _inv_alive,create_invitation_open from public,anon;
grant execute on function _inv_alive,create_invitation_open to authenticated;
-- PENTING: jangan jalankan ulang schema_profil.sql sesudah file ini (ia membuat ulang invitations_public tanpa kolom baru). Kalau terlanjur, jalankan file ini lagi.
-- Catatan: laporan 3 pengguna (report_invitation) dan penutupan admin (admin_close_invitation) otomatis berlaku untuk ajakan bebas.
