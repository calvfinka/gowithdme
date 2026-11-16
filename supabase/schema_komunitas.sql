-- Komunitas: publik mengajukan event (konser / pameran) dan Open Trip gunung. Tampil di situs setelah disetujui admin.
-- Jalankan di SQL Editor SETELAH schema_tahap2.sql, schema_admin.sql, schema_kota.sql, dan schema_ajakan.sql. Aman dijalankan ulang.

-- 1) Kolom baru di events (kolom ini boleh tampil publik: kontak WA dan kuota memang diisi pengaju untuk calon peserta)
alter table events
  add column if not exists is_community boolean not null default false,
  add column if not exists quota int check (quota between 1 and 500),
  add column if not exists contact_wa text check (contact_wa ~ '^62[0-9]{8,13}$'),
  add column if not exists organizer text check (char_length(organizer)<=80);

-- 2) Status baru: pending (menunggu admin) dan rejected (ditolak)
alter table events drop constraint if exists events_status_check;
alter table events add constraint events_status_check check (status in ('draft','published','pending','rejected'));

-- 3) Siapa yang mengajukan + alasan penolakan. Dipisah dari events supaya id pengaju tidak ikut terbaca publik.
create table if not exists event_submissions(
  event_id uuid primary key references events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  reject_reason text check (char_length(reject_reason)<=300),
  created_at timestamptz not null default now());
create index if not exists event_submissions_user on event_submissions(user_id, created_at desc);
alter table event_submissions enable row level security;
drop policy if exists "pengaju atau admin baca pengajuan" on event_submissions;
create policy "pengaju atau admin baca pengajuan" on event_submissions for select to authenticated using (user_id=auth.uid() or is_admin());
-- Tidak ada policy insert/update/delete: semua tulis lewat fungsi di bawah.

-- Pengaju boleh MEMBACA event miliknya (termasuk yang pending/ditolak). Publik tetap hanya melihat status 'published'.
drop policy if exists "pengaju baca event sendiri" on events;
create policy "pengaju baca event sendiri" on events for select to authenticated using (
  exists(select 1 from event_submissions s where s.event_id=events.id and s.user_id=auth.uid()));

-- 4) Ajukan event / open trip. Status SELALU pending; pengguna tidak bisa menerbitkan sendiri.
create or replace function submit_event(p jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare
  uid uuid:=auth.uid(); v uuid;
  t text:=trim(coalesce(p->>'title',''));
  cat text:=p->>'category';
  cid int:=nullif(p->>'city_id','')::int;
  d date:=nullif(p->>'event_date','')::date;
  d2 date:=nullif(p->>'end_date','')::date;
  today date:=(now() at time zone 'Asia/Jakarta')::date;
  pu text:=nullif(trim(coalesce(p->>'poster_url','')),'');
  tk text:=nullif(trim(coalesce(p->>'ticket_url','')),'');
  ig text:=nullif(regexp_replace(trim(coalesce(p->>'source_ig','')),'^@',''),'');
  ds text:=nullif(trim(coalesce(p->>'description','')),'');
  mt text:=nullif(trim(coalesce(p->>'mountain','')),'');
  dif text:=nullif(p->>'difficulty','');
  alt int:=nullif(p->>'altitude_mdpl','')::int;
  q int:=nullif(p->>'quota','')::int;
  wa text:=regexp_replace(coalesce(p->>'contact_wa',''),'\D','','g');
  sl text;
begin
  if uid is null then raise exception 'Masuk dulu untuk mengajukan.'; end if;
  if cat is null or cat not in ('konser','pameran','naikgunung') then raise exception 'Jenis event tidak dikenal.'; end if;
  if char_length(t) not between 5 and 120 then raise exception 'Judul 5-120 karakter.'; end if;
  if not exists(select 1 from cities where id=cid) then raise exception 'Pilih kota.'; end if;
  if d is null then raise exception 'Tanggal mulai wajib diisi.'; end if;
  if d<today then raise exception 'Tanggal mulai tidak boleh di masa lalu.'; end if;
  if d>today+730 then raise exception 'Tanggal terlalu jauh (maksimal 2 tahun ke depan).'; end if;
  if d2 is not null and (d2<d or d2-d>60) then raise exception 'Tanggal selesai harus setelah tanggal mulai (maksimal 60 hari).'; end if;
  if char_length(coalesce(ds,''))>2000 then raise exception 'Deskripsi maksimal 2000 karakter.'; end if;
  if char_length(coalesce(p->>'venue',''))>120 or char_length(coalesce(p->>'price_label',''))>60
     or char_length(coalesce(p->>'genre',''))>40 or char_length(coalesce(p->>'lineup',''))>500
     or char_length(coalesce(p->>'duration',''))>40 or char_length(coalesce(p->>'organizer',''))>80
     then raise exception 'Ada isian yang terlalu panjang.'; end if;
  if pu is not null and position('/storage/v1/object/public/posters/'||uid::text||'/' in pu)=0 then raise exception 'Poster harus diunggah lewat formulir ini.'; end if;
  if tk is not null and (tk !~* '^https?://[^\s]+$' or char_length(tk)>500) then raise exception 'Link harus diawali http:// atau https://.'; end if;
  if ig is not null and ig !~ '^[A-Za-z0-9._]{1,30}$' then raise exception 'Akun Instagram tidak valid.'; end if;
  if left(wa,1)='0' then wa:='62'||substr(wa,2); end if;
  if wa<>'' and wa !~ '^62[0-9]{8,13}$' then raise exception 'Nomor WhatsApp tidak valid.'; end if;
  if cat='naikgunung' then
    if mt is null or char_length(mt) not between 3 and 80 then raise exception 'Pilih atau tulis nama gunung tujuan.'; end if;
    if alt is not null and alt not between 0 and 6000 then raise exception 'Ketinggian tidak masuk akal.'; end if;
    if dif is not null and dif not in ('pemula','menengah','sulit') then raise exception 'Tingkat kesulitan tidak valid.'; end if;
    if q is null or q not between 1 and 500 then raise exception 'Kuota peserta 1-500.'; end if;
    if wa='' and tk is null then raise exception 'Isi nomor WhatsApp atau link pendaftaran agar peserta bisa menghubungi.'; end if;
  else
    mt:=null; alt:=null; dif:=null; q:=null;
  end if;
  if (select count(*) from event_submissions s join events e on e.id=s.event_id where s.user_id=uid and e.status='pending')>=5 then
    raise exception 'Maksimal 5 pengajuan menunggu persetujuan. Tunggu admin memeriksa dulu.'; end if;
  if (select count(*) from event_submissions where user_id=uid and created_at>now()-interval '24 hours')>=8 then
    raise exception 'Batas pengajuan harian tercapai. Coba lagi besok.'; end if;

  sl:=trim(both '-' from regexp_replace(lower(t),'[^a-z0-9]+','-','g'));
  sl:=left(sl,60)||'-'||to_char(d,'YYYYMMDD')||'-'||substr(replace(gen_random_uuid()::text,'-',''),1,6);
  insert into events(title,slug,category,city_id,venue,event_date,end_date,price_label,description,poster_url,ticket_url,source_ig,
                     genre,lineup,mountain,altitude_mdpl,difficulty,duration,quota,contact_wa,organizer,status,is_community)
  values(t,sl,cat,cid,nullif(trim(p->>'venue'),''),d,d2,nullif(trim(p->>'price_label'),''),ds,pu,tk,ig,
         case when cat='konser' then nullif(trim(p->>'genre'),'') end, case when cat='konser' then nullif(trim(p->>'lineup'),'') end,
         mt,alt,dif,case when cat='naikgunung' then nullif(trim(p->>'duration'),'') end,
         q,nullif(wa,''),nullif(trim(p->>'organizer'),''),'pending',true)
  returning id into v;
  insert into event_submissions(event_id,user_id) values(v,uid);
  return v;
end $$;

-- 5) Tarik kembali pengajuan sendiri (hanya yang masih pending / ditolak)
create or replace function withdraw_event(p_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  delete from events e using event_submissions s
   where e.id=p_id and s.event_id=e.id and s.user_id=auth.uid() and e.status in ('pending','rejected');
  if not found then raise exception 'Pengajuan tidak ditemukan atau sudah terbit.'; end if;
end $$;

-- 6) Admin menyetujui / menolak
create or replace function admin_review_event(p_id uuid,p_ok boolean,p_reason text default null) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not is_admin() then raise exception 'Hanya admin.'; end if;
  update events set status=case when p_ok then 'published' else 'rejected' end where id=p_id and status in ('pending','rejected');
  if not found then raise exception 'Pengajuan tidak ditemukan atau sudah diproses.'; end if;
  update event_submissions set reject_reason=case when p_ok then null else nullif(left(trim(coalesce(p_reason,'')),300),'') end where event_id=p_id;
end $$;

revoke all on function submit_event(jsonb), withdraw_event(uuid), admin_review_event(uuid,boolean,text) from public, anon;
grant execute on function submit_event(jsonb), withdraw_event(uuid), admin_review_event(uuid,boolean,text) to authenticated;

-- 7) Unggah poster oleh pengguna login: hanya ke folder miliknya (<user-id>/nama-file), maks 2 MB, hanya gambar.
update storage.buckets set file_size_limit=2097152, allowed_mime_types=array['image/jpeg','image/png','image/webp'] where id='posters';
drop policy if exists "pengguna unggah poster sendiri" on storage.objects;
create policy "pengguna unggah poster sendiri" on storage.objects for insert to authenticated
  with check (bucket_id='posters' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "pengguna hapus poster sendiri" on storage.objects;
create policy "pengguna hapus poster sendiri" on storage.objects for delete to authenticated
  using (bucket_id='posters' and (storage.foldername(name))[1]=auth.uid()::text);
