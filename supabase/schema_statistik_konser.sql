-- Statistik konser (INTERNAL, BELUM PUBLIK): ranking musisi/band, EO/promotor, kota/provinsi, domain tiket.
-- Jalankan di Supabase > SQL Editor SETELAH schema_tahap2.sql (is_admin), schema_admin.sql (events.lineup) dan schema_komunitas.sql (events.organizer).
-- Aman dijalankan ulang.
--
-- Prinsip:
--  * Semua tabel dan fungsi terkunci: RLS aktif, hanya is_admin() yang boleh membaca/mengubah. Pengunjung (anon) tidak punya akses sama sekali.
--  * Tidak ada halaman situs yang membaca tabel ini, jadi tidak ada yang tampil ke publik.
--  * Nama artis/EO dari teks bebas (events.lineup, events.organizer) diubah jadi daftar baku + alias. Hasil otomatis berstatus
--    verified=false sampai kamu periksa. Event pun punya status verifikasi sendiri (event_stat_check).
--  * Statistik untuk publik nanti hanya memakai data verified=true.

-- ---------- 1. normalisasi nama (huruf kecil, tanpa tanda baca, "&" jadi "and", awalan "the" dibuang) ----------
create or replace function stat_norm(t text) returns text language sql immutable as $$
  select btrim(regexp_replace(regexp_replace(regexp_replace(lower(coalesce(t,'')),'&',' and ','g'),'[^a-z0-9]+',' ','g'),'^\s*the\s+',''))
$$;

-- token yang bukan nama (mis. "tanpa line-up", "TBA", "dll")
create or replace function stat_junk(t text) returns boolean language sql immutable as $$
  select stat_norm(t)='' or char_length(stat_norm(t))<2 or char_length(btrim(coalesce(t,'')))>80
      or stat_norm(t) ~ '^[0-9 ]+$'
      or stat_norm(t) ~ '^[0-9]{1,2} (jan|feb|mar|apr|mei|may|jun|jul|agu|aug|sep|okt|oct|nov|des|dec)'
      or stat_norm(t) in ('dll','dsb','and more','special guest','guest star','guest stars','tba','tbc','tbd')
      or stat_norm(t) ~ '(tanpa line|menyusul|to be announced|segera|coming soon|line up|lineup)'
$$;

-- ---------- 2. tabel ----------
create table if not exists artists(
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  kind text not null default 'belum' check (kind in ('belum','band','solo','grup','dj','paduan','lainnya')),
  verified boolean not null default false,
  note text check (note is null or char_length(note)<=300),
  created_at timestamptz not null default now());
create table if not exists artist_aliases(
  alias_norm text primary key,
  artist_id uuid not null references artists(id) on delete cascade,
  alias text not null);
create index if not exists artist_aliases_artist on artist_aliases(artist_id);

create table if not exists organizers(
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  kind text not null default 'belum' check (kind in ('belum','promotor','venue','instansi','komunitas','brand','lainnya')),
  verified boolean not null default false,
  note text check (note is null or char_length(note)<=300),
  created_at timestamptz not null default now());
create table if not exists organizer_aliases(
  alias_norm text primary key,
  organizer_id uuid not null references organizers(id) on delete cascade,
  alias text not null);
create index if not exists organizer_aliases_org on organizer_aliases(organizer_id);

create table if not exists event_artists(
  event_id uuid not null references events(id) on delete cascade,
  artist_id uuid not null references artists(id) on delete cascade,
  pos int not null default 0,
  primary key(event_id,artist_id));
create index if not exists event_artists_artist on event_artists(artist_id);

create table if not exists event_organizers(
  event_id uuid not null references events(id) on delete cascade,
  organizer_id uuid not null references organizers(id) on delete cascade,
  primary key(event_id,organizer_id));
create index if not exists event_organizers_org on event_organizers(organizer_id);

-- status verifikasi per event: data event, lineup, EO dan link tiket sudah dicek
create table if not exists event_stat_check(
  event_id uuid primary key references events(id) on delete cascade,
  verified boolean not null default false,
  verified_at timestamptz,
  source_url text check (source_url is null or char_length(source_url)<=300),
  ticket_status text not null default 'belum' check (ticket_status in ('belum','ok','mati','tidak_ada')),
  ticket_checked_at timestamptz,
  note text check (note is null or char_length(note)<=300),
  updated_at timestamptz not null default now());

-- ---------- 3. kunci akses: hanya admin ----------
alter table artists enable row level security;
alter table artist_aliases enable row level security;
alter table organizers enable row level security;
alter table organizer_aliases enable row level security;
alter table event_artists enable row level security;
alter table event_organizers enable row level security;
alter table event_stat_check enable row level security;

do $$ declare t text; begin
  foreach t in array array['artists','artist_aliases','organizers','organizer_aliases','event_artists','event_organizers','event_stat_check'] loop
    execute format('drop policy if exists "admin kelola %1$s" on %1$I',t);
    execute format('create policy "admin kelola %1$s" on %1$I for all to authenticated using (is_admin()) with check (is_admin())',t);
    execute format('revoke all on %I from anon',t);
  end loop;
end $$;

-- ---------- 4. isi awal dari teks lama (aman diulang) ----------
create or replace function stat_backfill() returns jsonb language plpgsql security definer set search_path=public as $$
declare r record; tok text; n text; aid uuid; oid uuid; i int;
begin
  if auth.uid() is not null and not is_admin() then raise exception 'hanya admin'; end if;

  insert into event_stat_check(event_id)
    select id from events where status='published' on conflict do nothing;

  for r in select id,lineup,organizer from events where status='published' loop
    if nullif(btrim(coalesce(r.lineup,'')),'') is not null then
      i:=0;
      for tok in
        select btrim(x)
        from regexp_split_to_table(regexp_replace(regexp_replace(r.lineup,'\([^)]*\)',' ','g'),'\(.*$',''),'[,;\n]|\s\+\s|\s/\s') as x
      loop
        continue when stat_junk(tok);
        n:=stat_norm(tok);
        select artist_id into aid from artist_aliases where alias_norm=n;
        if aid is null then
          insert into artists(name) values (tok) returning id into aid;
          insert into artist_aliases(alias_norm,artist_id,alias) values (n,aid,tok);
        end if;
        insert into event_artists(event_id,artist_id,pos) values (r.id,aid,i) on conflict do nothing;
        i:=i+1;
      end loop;
    end if;

    if nullif(btrim(coalesce(r.organizer,'')),'') is not null then
      for tok in
        select btrim(x) from regexp_split_to_table(r.organizer,'[,;\n]|\s/\s|\s\+\s') as x
      loop
        continue when stat_junk(tok);
        n:=stat_norm(tok);
        select organizer_id into oid from organizer_aliases where alias_norm=n;
        if oid is null then
          insert into organizers(name) values (tok) returning id into oid;
          insert into organizer_aliases(alias_norm,organizer_id,alias) values (n,oid,tok);
        end if;
        insert into event_organizers(event_id,organizer_id) values (r.id,oid) on conflict do nothing;
      end loop;
    end if;
  end loop;

  update event_stat_check c set ticket_status='tidak_ada',updated_at=now()
    from events e where e.id=c.event_id and c.ticket_status='belum' and nullif(btrim(coalesce(e.ticket_url,'')),'') is null;

  return jsonb_build_object('artis',(select count(*) from artists),'eo',(select count(*) from organizers),
    'tautan_artis_event',(select count(*) from event_artists),'tautan_eo_event',(select count(*) from event_organizers),
    'event',(select count(*) from event_stat_check));
end $$;

-- ---------- 5. alat tinjau (dipanggil admin) ----------
-- gabung dua nama yang sama (mis. "Jesus and Mary Chain" dan "The Jesus & Mary Chain"): p_from dilebur ke p_to
create or replace function stat_merge_artist(p_from uuid,p_to uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is not null and not is_admin() then raise exception 'hanya admin'; end if;
  if p_from is null or p_to is null or p_from=p_to then raise exception 'id tidak valid'; end if;
  if not exists(select 1 from artists where id=p_from) or not exists(select 1 from artists where id=p_to) then raise exception 'artis tidak ditemukan'; end if;
  insert into event_artists(event_id,artist_id,pos) select event_id,p_to,pos from event_artists where artist_id=p_from on conflict do nothing;
  delete from event_artists where artist_id=p_from;
  update artist_aliases set artist_id=p_to where artist_id=p_from;
  delete from artists where id=p_from;
end $$;

create or replace function stat_merge_organizer(p_from uuid,p_to uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is not null and not is_admin() then raise exception 'hanya admin'; end if;
  if p_from is null or p_to is null or p_from=p_to then raise exception 'id tidak valid'; end if;
  if not exists(select 1 from organizers where id=p_from) or not exists(select 1 from organizers where id=p_to) then raise exception 'EO tidak ditemukan'; end if;
  insert into event_organizers(event_id,organizer_id) select event_id,p_to from event_organizers where organizer_id=p_from on conflict do nothing;
  delete from event_organizers where organizer_id=p_from;
  update organizer_aliases set organizer_id=p_to where organizer_id=p_from;
  delete from organizers where id=p_from;
end $$;

-- tandai event sudah diperiksa (atau batalkan), dengan sumber
create or replace function stat_set_event_verified(p_event uuid,p_ok boolean,p_source text default null) returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is not null and not is_admin() then raise exception 'hanya admin'; end if;
  insert into event_stat_check(event_id,verified,verified_at,source_url,updated_at)
    values (p_event,coalesce(p_ok,false),case when p_ok then now() end,left(nullif(btrim(coalesce(p_source,'')),''),300),now())
  on conflict (event_id) do update set verified=excluded.verified,verified_at=excluded.verified_at,
    source_url=coalesce(excluded.source_url,event_stat_check.source_url),updated_at=now();
end $$;

-- ---------- 6. tampilan statistik (hanya admin yang bisa membaca) ----------
-- Dasar hitungan: event terbit berkategori konser/festival. "terverifikasi" = event_stat_check.verified.
create or replace view stat_provinsi with (security_invoker=true) as
select p.id as province_id,p.name as provinsi,
  count(*) as total_event,
  count(*) filter (where coalesce(c.verified,false)) as event_terverifikasi,
  count(*) filter (where e.event_date>=(now() at time zone 'Asia/Jakarta')::date) as akan_datang,
  count(distinct ci.id) as jumlah_kota
from events e join cities ci on ci.id=e.city_id join provinces p on p.id=ci.province_id
left join event_stat_check c on c.event_id=e.id
where e.status='published' and e.category in ('konser','festival')
group by p.id,p.name order by total_event desc,p.name;

create or replace view stat_kota with (security_invoker=true) as
select ci.id as city_id,ci.name as kota,p.name as provinsi,
  count(*) as total_event,
  count(*) filter (where coalesce(c.verified,false)) as event_terverifikasi,
  count(*) filter (where e.event_date>=(now() at time zone 'Asia/Jakarta')::date) as akan_datang
from events e join cities ci on ci.id=e.city_id join provinces p on p.id=ci.province_id
left join event_stat_check c on c.event_id=e.id
where e.status='published' and e.category in ('konser','festival')
group by ci.id,ci.name,p.name order by total_event desc,ci.name;

create or replace view stat_artis with (security_invoker=true) as
select a.id as artist_id,a.name as artis,a.kind,a.verified as artis_verified,
  count(distinct ea.event_id) as total_event,
  count(distinct ea.event_id) filter (where coalesce(c.verified,false)) as event_terverifikasi,
  count(distinct e.city_id) as jumlah_kota,
  min(e.event_date) as pertama,max(e.event_date) as terakhir
from artists a
join event_artists ea on ea.artist_id=a.id
join events e on e.id=ea.event_id and e.status='published'
left join event_stat_check c on c.event_id=e.id
group by a.id,a.name,a.kind,a.verified order by total_event desc,a.name;

create or replace view stat_promotor with (security_invoker=true) as
select o.id as organizer_id,o.name as penyelenggara,o.kind,o.verified as eo_verified,
  count(distinct eo.event_id) as total_event,
  count(distinct eo.event_id) filter (where coalesce(c.verified,false)) as event_terverifikasi,
  count(distinct e.city_id) as jumlah_kota,
  min(e.event_date) as pertama,max(e.event_date) as terakhir
from organizers o
join event_organizers eo on eo.organizer_id=o.id
join events e on e.id=eo.event_id and e.status='published'
left join event_stat_check c on c.event_id=e.id
group by o.id,o.name,o.kind,o.verified order by total_event desc,o.name;

create or replace view stat_tiket_domain with (security_invoker=true) as
select coalesce(substring(e.ticket_url from '^https?://(?:www\.)?([^/?#]+)'),'(tanpa link)') as domain,
  count(*) as total_event,
  count(*) filter (where c.ticket_status='ok') as link_ok,
  count(*) filter (where c.ticket_status='mati') as link_mati
from events e left join event_stat_check c on c.event_id=e.id
where e.status='published' and e.category in ('konser','festival')
group by 1 order by total_event desc,1;

revoke all on stat_provinsi,stat_kota,stat_artis,stat_promotor,stat_tiket_domain from anon;
revoke execute on function stat_backfill(),stat_merge_artist(uuid,uuid),stat_merge_organizer(uuid,uuid),stat_set_event_verified(uuid,boolean,text) from public,anon;
grant execute on function stat_backfill(),stat_merge_artist(uuid,uuid),stat_merge_organizer(uuid,uuid),stat_set_event_verified(uuid,boolean,text) to authenticated;

-- Langkah setelah file ini dijalankan:
--   select stat_backfill();                      -- isi awal dari lineup dan organizer lama
--   select * from stat_kota limit 20;            -- cek ranking kota
--   select * from stat_artis where not artis_verified order by total_event desc;   -- tinjau artis kandidat
--   select stat_merge_artist('<id lama>','<id baku>');                             -- gabung duplikat
--   update artists set verified=true, kind='band' where id='<id>';                 -- setujui artis
--   update organizers set verified=true, kind='promotor' where id='<id>';          -- setujui EO
