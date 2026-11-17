-- Statistik situs untuk Panel Admin. Jalankan SETELAH schema_tahap2.sql (is_admin), schema_forum.sql, dan schema_ajakan.sql. Aman dijalankan ulang.
--
-- Prinsip privasi (harus sama dengan teks di Kebijakan Privasi):
--  * TIDAK menyimpan alamat IP, tidak memakai cookie, tidak mengaitkan kunjungan dengan akun/nama/email.
--  * Yang disimpan per kunjungan: waktu, halaman (tanpa parameter), bahasa, jenis perangkat (mobile/tablet/desktop),
--    nama situs asal tautan (tanpa alamat lengkap), dan kode acak per browser (disimpan di localStorage, bukan identitas).
--  * Kode acak dipakai hanya untuk menghitung "pengunjung unik". Pengunjung yang mengaktifkan Do Not Track / Global Privacy Control tidak dihitung.
--  * Data kunjungan dihapus otomatis setelah 400 hari.
--  * Tabel dikunci RLS tanpa policy: anon hanya bisa MENAMBAH lewat track_hit(), hanya admin yang bisa MEMBACA lewat admin_stats()/admin_users().

create table if not exists site_hits(
  id bigserial primary key,
  at timestamptz not null default now(),
  day date not null default ((now() at time zone 'Asia/Jakarta')::date),
  kind text not null check (kind in ('view','event','ticket')),
  path text not null check (char_length(path)<=60),
  lang text check (lang in ('id','en')),
  device text check (device in ('mobile','tablet','desktop')),
  ref text check (ref is null or char_length(ref)<=80),
  vid text not null check (char_length(vid) between 8 and 40),
  event_id uuid references events(id) on delete set null);
create index if not exists site_hits_day on site_hits(day,kind);
create index if not exists site_hits_vid on site_hits(vid,at);
create index if not exists site_hits_event on site_hits(event_id,day) where event_id is not null;
alter table site_hits enable row level security;

-- Pencatat (dipanggil publik). Diam-diam mengabaikan input aneh dan pengirim yang terlalu sering.
create or replace function track_hit(p_kind text,p_path text,p_lang text,p_device text,p_ref text,p_vid text,p_event uuid default null)
returns void language plpgsql security definer set search_path=public as $$
declare pth text:=lower(coalesce(p_path,'')); rf text:=lower(nullif(trim(coalesce(p_ref,'')),''));
begin
  if p_kind not in ('view','event','ticket') then return; end if;
  if pth !~ '^[a-z0-9_/-]{0,60}$' then return; end if;
  if p_vid is null or char_length(p_vid)<8 or char_length(p_vid)>40 or p_vid !~ '^[A-Za-z0-9]+$' then return; end if;
  if rf is not null and rf !~ '^[a-z0-9.-]{1,80}$' then rf:=null; end if;
  if p_lang not in ('id','en') then p_lang:=null; end if;
  if p_device not in ('mobile','tablet','desktop') then p_device:=null; end if;
  if (select count(*) from site_hits where vid=p_vid and at>now()-interval '1 hour')>=120 then return; end if;
  if p_event is not null and not exists(select 1 from events where id=p_event) then p_event:=null; end if;
  insert into site_hits(kind,path,lang,device,ref,vid,event_id) values(p_kind,pth,p_lang,p_device,rf,p_vid,p_event);
  if random()<0.01 then delete from site_hits where at<now()-interval '400 days'; end if;
end $$;

-- Statistik lengkap untuk admin. p_days: 7, 30, atau 90. Semua tanggal menurut WIB.
create or replace function admin_stats(p_days int default 30) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare
  n int:=case when p_days in (7,30,90) then p_days else 30 end;
  d1 date:=(now() at time zone 'Asia/Jakarta')::date; d0 date; pd0 date; pd1 date;
  traffic jsonb; users jsonb; content jsonb;
begin
  if not is_admin() then raise exception 'Khusus admin.'; end if;
  d0:=d1-(n-1); pd1:=d0-1; pd0:=pd1-(n-1);

  traffic:=jsonb_build_object(
    'views',(select count(*) from site_hits where kind='view' and day between d0 and d1),
    'visitors',(select count(distinct vid) from site_hits where kind='view' and day between d0 and d1),
    'new_visitors',(select count(distinct h.vid) from site_hits h where h.kind='view' and h.day between d0 and d1
                     and not exists(select 1 from site_hits o where o.vid=h.vid and o.day<d0)),
    'prev_views',(select count(*) from site_hits where kind='view' and day between pd0 and pd1),
    'prev_visitors',(select count(distinct vid) from site_hits where kind='view' and day between pd0 and pd1),
    'today_views',(select count(*) from site_hits where kind='view' and day=d1),
    'today_visitors',(select count(distinct vid) from site_hits where kind='view' and day=d1),
    'first_hit',(select min(day) from site_hits),
    'daily',(select coalesce(jsonb_agg(jsonb_build_object('d',g.d,'views',coalesce(h.v,0),'visitors',coalesce(h.u,0)) order by g.d),'[]'::jsonb)
             from (select generate_series(d0::timestamp,d1::timestamp,interval '1 day')::date d) g
             left join (select day,count(*) v,count(distinct vid) u from site_hits where kind='view' and day between d0 and d1 group by day) h on h.day=g.d),
    'pages',(select coalesce(jsonb_agg(x),'[]'::jsonb) from (
              select jsonb_build_object('path',path,'views',count(*),'visitors',count(distinct vid)) x
              from site_hits where kind='view' and day between d0 and d1 group by path order by count(*) desc limit 12) t),
    'devices',(select coalesce(jsonb_agg(jsonb_build_object('k',coalesce(device,'?'),'n',c)),'[]'::jsonb) from (
              select device,count(distinct vid) c from site_hits where kind='view' and day between d0 and d1 group by device order by c desc) t),
    'langs',(select coalesce(jsonb_agg(jsonb_build_object('k',coalesce(lang,'?'),'n',c)),'[]'::jsonb) from (
              select lang,count(distinct vid) c from site_hits where kind='view' and day between d0 and d1 group by lang order by c desc) t),
    'refs',(select coalesce(jsonb_agg(jsonb_build_object('k',ref,'n',c)),'[]'::jsonb) from (
              select ref,count(distinct vid) c from site_hits where kind='view' and day between d0 and d1 and ref is not null group by ref order by c desc limit 8) t),
    'direct',(select count(distinct vid) from site_hits where kind='view' and day between d0 and d1 and ref is null),
    'hours',(select coalesce(jsonb_agg(coalesce(h.c,0) order by g.h),'[]'::jsonb)
             from generate_series(0,23) g(h)
             left join (select extract(hour from at at time zone 'Asia/Jakarta')::int hr,count(*) c from site_hits
                        where kind='view' and day between d0 and d1 group by 1) h on h.hr=g.h),
    'events',(select coalesce(jsonb_agg(x),'[]'::jsonb) from (
              select jsonb_build_object('id',e.id,'title',e.title,'city',c.name,'date',e.event_date,
                       'opens',count(*) filter (where h.kind='event'),'tickets',count(*) filter (where h.kind='ticket'),
                       'visitors',count(distinct h.vid) filter (where h.kind='event')) x
              from site_hits h join events e on e.id=h.event_id left join cities c on c.id=e.city_id
              where h.kind in ('event','ticket') and h.day between d0 and d1
              group by e.id,e.title,c.name,e.event_date order by count(*) filter (where h.kind='event') desc,count(*) desc limit 10) t));

  users:=jsonb_build_object(
    'total',(select count(*) from profiles),
    'new',(select count(*) from profiles where (created_at at time zone 'Asia/Jakarta')::date between d0 and d1),
    'prev_new',(select count(*) from profiles where (created_at at time zone 'Asia/Jakarta')::date between pd0 and pd1),
    'verified',(select count(*) from profiles where coalesce(verified,false)),
    'admins',(select count(*) from profiles where role='admin'),
    'active7',(select count(*) from auth.users where last_sign_in_at>now()-interval '7 days'),
    'active30',(select count(*) from auth.users where last_sign_in_at>now()-interval '30 days'),
    'google',(select count(*) from auth.users where raw_app_meta_data->>'provider'='google'),
    'email',(select count(*) from auth.users where coalesce(raw_app_meta_data->>'provider','email')='email'),
    'with_city',(select count(*) from profiles where city_id is not null),
    'daily',(select coalesce(jsonb_agg(jsonb_build_object('d',g.d,'n',coalesce(s.c,0)) order by g.d),'[]'::jsonb)
             from (select generate_series(d0::timestamp,d1::timestamp,interval '1 day')::date d) g
             left join (select (created_at at time zone 'Asia/Jakarta')::date day,count(*) c from profiles
                        where (created_at at time zone 'Asia/Jakarta')::date between d0 and d1 group by 1) s on s.day=g.d),
    'cities',(select coalesce(jsonb_agg(jsonb_build_object('k',name,'n',c)),'[]'::jsonb) from (
              select ct.name,count(*) c from profiles p join cities ct on ct.id=p.city_id group by ct.name order by c desc limit 8) t));

  content:=jsonb_build_object(
    'events_by_status',(select coalesce(jsonb_object_agg(status,c),'{}'::jsonb) from (select status,count(*) c from events group by status) t),
    'published_by_cat',(select coalesce(jsonb_agg(jsonb_build_object('k',category,'n',c) order by c desc),'[]'::jsonb) from (
              select category,count(*) c from events where status='published' group by category) t),
    'upcoming',(select count(*) from events where status='published' and coalesce(end_date,event_date)>=d1),
    'by_city',(select coalesce(jsonb_agg(jsonb_build_object('k',name,'n',c)),'[]'::jsonb) from (
              select ct.name,count(*) c from events e join cities ct on ct.id=e.city_id
              where e.status='published' and coalesce(e.end_date,e.event_date)>=d1 group by ct.name order by c desc limit 8) t),
    'posts',(select count(*) from forum_posts where status='open' and (created_at at time zone 'Asia/Jakarta')::date between d0 and d1),
    'replies',(select count(*) from forum_replies where status='open' and (created_at at time zone 'Asia/Jakarta')::date between d0 and d1),
    'invites',(select count(*) from invitations where status<>'cancelled' and (created_at at time zone 'Asia/Jakarta')::date between d0 and d1),
    'invites_open',(select count(*) from invitations where status in ('open','full')),
    'pending',(select count(*) from events where status='pending'));

  return jsonb_build_object('days',n,'from',d0,'to',d1,'traffic',traffic,'users',users,'content',content);
end $$;

-- Daftar pengguna terdaftar (admin). Email ditampilkan disamarkan. p_q mencari nama panggilan atau email.
create or replace function admin_users(p_q text default null,p_limit int default 30,p_offset int default 0) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare q text:=nullif(trim(coalesce(p_q,'')),''); lim int:=least(greatest(coalesce(p_limit,30),1),100); ofs int:=greatest(coalesce(p_offset,0),0); tot int; rows jsonb;
begin
  if not is_admin() then raise exception 'Khusus admin.'; end if;
  select count(*) into tot from profiles p join auth.users u on u.id=p.id
   where q is null or p.nickname ilike '%'||q||'%' or u.email ilike '%'||q||'%';
  select coalesce(jsonb_agg(x order by (x->>'joined') desc),'[]'::jsonb) into rows from (
    select jsonb_build_object(
      'id',p.id,'nickname',p.nickname,'avatar_url',p.avatar_url,'role',p.role,'verified',coalesce(p.verified,false),
      'city',(select c.name from cities c where c.id=p.city_id),
      'joined',p.created_at,'last_sign_in',u.last_sign_in_at,'provider',coalesce(u.raw_app_meta_data->>'provider','email'),
      'email',case when u.email is null then null else left(split_part(u.email,'@',1),2)||'***@'||split_part(u.email,'@',2) end,
      'posts',(select count(*) from forum_posts f where f.author_id=p.id and f.status='open'),
      'hosted',(select count(*) from invitations i where i.host_id=p.id and i.status<>'cancelled'),
      'joined_n',(select count(*) from invitation_members m where m.user_id=p.id and m.status='approved')) x
    from profiles p join auth.users u on u.id=p.id
    where q is null or p.nickname ilike '%'||q||'%' or u.email ilike '%'||q||'%'
    order by p.created_at desc limit lim offset ofs) s;
  return jsonb_build_object('total',tot,'rows',rows);
end $$;

revoke all on function track_hit, admin_stats, admin_users from public;
grant execute on function track_hit to anon, authenticated;
grant execute on function admin_stats, admin_users to authenticated;
