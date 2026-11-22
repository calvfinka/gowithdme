-- ============================================================================
-- RBAC panel admin: pemilik + admin tambahan dengan batasan akses.
-- Jalankan di Supabase > SQL Editor SETELAH semua schema_*.sql / patch_*.sql lain. Aman dijalankan berulang.
-- JALANKAN TERAKHIR: bila schema_tahap2.sql dijalankan ulang, is_admin() kembali longgar; jalankan berkas ini lagi.
--
-- Model:
--   PEMILIK  = profiles.role='admin' (admin lama otomatis jadi pemilik, akses penuh, satu-satunya yang bisa kelola admin).
--   STAFF    = baris di admin_staff (peran preset atau izin kustom, bisa dinonaktifkan atau berbatas waktu).
--   is_admin() DIUBAH jadi "hanya pemilik" (gagal-aman): kebijakan/fungsi yang belum dipetakan tetap hanya untuk pemilik.
--   has_perm('izin') = pemilik, atau staff aktif yang punya izin itu. Dipakai semua RLS dan RPC admin di bawah.
-- ============================================================================

-- 1) Katalog izin (harus sama dengan js/rbac-core.js di repo admin) ------------
create or replace function rbac_all_perms() returns text[] language sql immutable as $$
  select array[
    'events.view','events.create','events.edit','events.publish','events.delete','events.review','events.feature',
    'posters.upload','posters.delete',
    'blog.manage','arsip.manage',
    'forum.moderate','forum.ban','forum.config','invitations.moderate','chat.moderate',
    'words.view','words.manage',
    'sponsor.view','sponsor.manage',
    'stats.view','users.view'
  ]::text[] $$;

-- Izin yang otomatis ikut (butuh baca data). Hasil urut sesuai katalog.
create or replace function rbac_expand(p text[]) returns text[] language sql immutable as $$
  with base as (select unnest(coalesce(p,'{}'::text[])) x),
  imp(a,b) as (values
    ('events.create','events.view'),('events.edit','events.view'),('events.publish','events.view'),('events.delete','events.view'),
    ('events.review','events.view'),('events.feature','events.view'),
    ('forum.ban','forum.moderate'),('forum.config','forum.moderate'),
    ('words.manage','words.view'),('sponsor.manage','sponsor.view')),
  allp as (select x from base union select b from imp join base on base.x=imp.a)
  select coalesce(array(select k from unnest(rbac_all_perms()) with ordinality t(k,o) where k in (select x from allp) order by o),'{}'::text[]) $$;

-- 2) Tabel -----------------------------------------------------------------------
create table if not exists admin_roles(
  key text primary key, label text not null, descr text not null default '',
  perms text[] not null default '{}', sort int not null default 0);

insert into admin_roles(key,label,descr,perms,sort) values
 ('editor','Editor Konten','Membuat, mengubah, dan menerbitkan event serta blog. Tanpa moderasi dan data pengguna.',
   rbac_expand(array['events.view','events.create','events.edit','events.publish','posters.upload','posters.delete','blog.manage']),1),
 ('kontributor','Kontributor','Hanya membuat dan mengubah draft; tidak bisa menerbitkan atau menghapus.',
   rbac_expand(array['events.view','events.create','events.edit','posters.upload','blog.manage']),2),
 ('moderator','Moderator Komunitas','Memeriksa pengajuan event, laporan forum, blokir, ajakan, dan log kata terlarang.',
   rbac_expand(array['events.view','events.review','forum.moderate','forum.ban','invitations.moderate','chat.moderate','words.view']),3),
 ('sponsor','Manajer Sponsor','Mengelola lead sponsor dan event Disorot.',
   rbac_expand(array['events.view','events.feature','sponsor.view','sponsor.manage']),4),
 ('analis','Analis','Hanya melihat statistik dan daftar pengguna (tanpa mengubah apa pun).',
   rbac_expand(array['stats.view','users.view']),5),
 ('custom','Kustom','Pilih sendiri izin satu per satu.','{}',6)
on conflict (key) do update set label=excluded.label, descr=excluded.descr, perms=excluded.perms, sort=excluded.sort;

create table if not exists admin_staff(
  user_id uuid primary key references auth.users(id) on delete cascade,
  role_key text not null references admin_roles(key),
  custom_perms text[] not null default '{}',
  active boolean not null default true,
  expires_at timestamptz,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now());

create table if not exists admin_audit(
  id bigserial primary key, at timestamptz not null default now(),
  actor uuid, action text not null, target uuid, detail jsonb not null default '{}'::jsonb);
create index if not exists admin_audit_at on admin_audit(at desc);

alter table admin_roles enable row level security;
alter table admin_staff enable row level security;
alter table admin_audit enable row level security;
revoke all on admin_roles, admin_staff, admin_audit from anon, authenticated;
grant select on admin_roles to authenticated;
grant select on admin_staff to authenticated;
grant select on admin_audit to authenticated;

-- 3) Fungsi dasar ------------------------------------------------------------------
create or replace function is_owner() returns boolean language sql security definer stable set search_path=public as
$$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin') $$;

create or replace function _staff_perms(uid uuid) returns text[] language sql security definer stable set search_path=public as $$
  select case when s.role_key='custom' then rbac_expand(s.custom_perms) else rbac_expand(r.perms) end
  from admin_staff s join admin_roles r on r.key=s.role_key
  where s.user_id=uid and s.active and (s.expires_at is null or s.expires_at>now()) $$;

create or replace function has_perm(p text) returns boolean language sql security definer stable set search_path=public as
$$ select auth.uid() is not null and (is_owner() or coalesce(p = any(_staff_perms(auth.uid())), false)) $$;

create or replace function is_staff() returns boolean language sql security definer stable set search_path=public as
$$ select auth.uid() is not null and (is_owner() or _staff_perms(auth.uid()) is not null) $$;

create or replace function is_staff_user(uid uuid) returns boolean language sql security definer stable set search_path=public as
$$ select exists (select 1 from profiles where id=uid and role='admin') or exists (select 1 from admin_staff where user_id=uid) $$;

-- is_admin() = hanya pemilik. Semua yang belum dipetakan ke izin otomatis tetap terkunci untuk staff.
create or replace function is_admin() returns boolean language sql security definer stable set search_path=public as
$$ select is_owner() $$;

drop policy if exists "staff: baca sendiri atau pemilik" on admin_staff;
create policy "staff: baca sendiri atau pemilik" on admin_staff for select to authenticated using (user_id=auth.uid() or is_owner());
drop policy if exists "audit: pemilik" on admin_audit;
create policy "audit: pemilik" on admin_audit for select to authenticated using (is_owner());
drop policy if exists "peran: baca" on admin_roles;
create policy "peran: baca" on admin_roles for select to authenticated using (true);

-- 4) RPC untuk panel ----------------------------------------------------------------
-- Status akses akun yang sedang login (dipakai panel untuk membuka/menyembunyikan menu).
create or replace function my_admin() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare o boolean:=is_owner(); s admin_staff; r admin_roles; pr text[];
begin
  if auth.uid() is null then return jsonb_build_object('active',false,'owner',false,'perms','[]'::jsonb); end if;
  if o then return jsonb_build_object('active',true,'owner',true,'role','owner','label','Pemilik','perms',to_jsonb(rbac_all_perms())); end if;
  select * into s from admin_staff where user_id=auth.uid();
  if not found then return jsonb_build_object('active',false,'owner',false,'perms','[]'::jsonb); end if;
  select * into r from admin_roles where key=s.role_key;
  pr:=_staff_perms(auth.uid());
  return jsonb_build_object('active',pr is not null,'owner',false,'role',s.role_key,'label',r.label,
    'perms',to_jsonb(coalesce(pr,'{}'::text[])),'expires_at',s.expires_at,
    'reason',case when pr is not null then null when not s.active then 'nonaktif' else 'kedaluwarsa' end);
end $$;

create or replace function _rbac_log(p_action text,p_target uuid,p_detail jsonb) returns void language sql security definer set search_path=public as
$$ insert into admin_audit(actor,action,target,detail) values (auth.uid(),p_action,p_target,coalesce(p_detail,'{}'::jsonb)) $$;
revoke all on function _rbac_log from public, anon, authenticated;

-- Cari akun terdaftar lewat email persis (pemilik saja).
create or replace function admin_staff_find(p_email text) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare u record;
begin
  if not is_owner() then raise exception 'Hanya pemilik yang boleh mengelola admin.' using errcode='42501'; end if;
  select a.id,a.email,p.nickname,p.role into u from auth.users a left join profiles p on p.id=a.id where lower(a.email)=lower(trim(coalesce(p_email,''))) limit 1;
  if not found then return null; end if;
  return jsonb_build_object('id',u.id,'email',u.email,'nickname',u.nickname,'owner',coalesce(u.role,'user')='admin',
    'staff',exists(select 1 from admin_staff where user_id=u.id));
end $$;

create or replace function admin_staff_list() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  if not is_owner() then raise exception 'Hanya pemilik yang boleh mengelola admin.' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(x order by (x->>'owner')::boolean desc, x->>'created_at') from (
    select jsonb_build_object('user_id',p.id,'nickname',p.nickname,'email',u.email,'owner',true,'role','owner','label','Pemilik','active',true,
      'perms',to_jsonb(rbac_all_perms()),'custom_perms','[]'::jsonb,'expires_at',null,'note',null,'created_at',p.created_at,'last_sign_in',u.last_sign_in_at) x
    from profiles p join auth.users u on u.id=p.id where p.role='admin'
    union all
    select jsonb_build_object('user_id',s.user_id,'nickname',p.nickname,'email',u.email,'owner',false,'role',s.role_key,'label',r.label,
      'active',s.active,'effective',_staff_perms(s.user_id) is not null,
      'perms',to_jsonb(case when s.role_key='custom' then rbac_expand(s.custom_perms) else rbac_expand(r.perms) end),
      'custom_perms',to_jsonb(s.custom_perms),'expires_at',s.expires_at,'note',s.note,'created_at',s.created_at,'last_sign_in',u.last_sign_in_at)
    from admin_staff s join admin_roles r on r.key=s.role_key join auth.users u on u.id=s.user_id left join profiles p on p.id=s.user_id
  ) t),'[]'::jsonb);
end $$;

-- Tambah / ubah admin. Pemilik saja. Tidak bisa menjadikan orang lain pemilik, tidak bisa menyentuh pemilik.
create or replace function admin_staff_set(p_user uuid,p_role text,p_perms text[] default '{}',p_active boolean default true,
  p_expires timestamptz default null,p_note text default null) returns void language plpgsql security definer set search_path=public as $$
declare ex text[]; bad text[]; before jsonb;
begin
  if not is_owner() then raise exception 'Hanya pemilik yang boleh mengelola admin.' using errcode='42501'; end if;
  if p_user is null or not exists(select 1 from auth.users where id=p_user) then raise exception 'Akun tidak ditemukan.'; end if;
  if exists(select 1 from profiles where id=p_user and role='admin') then raise exception 'Akun ini sudah pemilik; tidak bisa diubah dari panel.'; end if;
  if p_user=auth.uid() then raise exception 'Tidak bisa mengubah akses akun sendiri.'; end if;
  if not exists(select 1 from admin_roles where key=p_role) then raise exception 'Peran tidak dikenal.'; end if;
  select coalesce(array_agg(x),'{}') into bad from unnest(coalesce(p_perms,'{}')) x where x<>all(rbac_all_perms());
  if array_length(bad,1)>0 then raise exception 'Izin tidak dikenal: %',array_to_string(bad,', '); end if;
  ex:=rbac_expand(p_perms);
  if p_role='custom' and coalesce(array_length(ex,1),0)=0 then raise exception 'Peran kustom butuh minimal satu izin.'; end if;
  if p_expires is not null and p_expires<=now() then raise exception 'Tanggal berakhir harus di masa depan.'; end if;
  select to_jsonb(s) into before from admin_staff s where user_id=p_user;
  insert into admin_staff(user_id,role_key,custom_perms,active,expires_at,note,created_by)
    values (p_user,p_role,case when p_role='custom' then ex else '{}' end,coalesce(p_active,true),p_expires,nullif(trim(p_note),''),auth.uid())
  on conflict (user_id) do update set role_key=excluded.role_key,custom_perms=excluded.custom_perms,active=excluded.active,
    expires_at=excluded.expires_at,note=excluded.note,updated_at=now();
  perform _rbac_log(case when before is null then 'staff_add' else 'staff_update' end,p_user,
    jsonb_build_object('role',p_role,'perms',case when p_role='custom' then to_jsonb(ex) else null end,'active',coalesce(p_active,true),'expires_at',p_expires,'before',before));
end $$;

create or replace function admin_staff_remove(p_user uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_owner() then raise exception 'Hanya pemilik yang boleh mengelola admin.' using errcode='42501'; end if;
  delete from admin_staff where user_id=p_user;
  if found then perform _rbac_log('staff_remove',p_user,'{}'::jsonb); end if;
end $$;

create or replace function admin_audit_list(p_limit int default 50) returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  if not is_owner() then raise exception 'Hanya pemilik yang boleh mengelola admin.' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(x) from (
    select jsonb_build_object('at',a.at,'action',a.action,'actor',(select nickname from profiles where id=a.actor),
      'target',(select nickname from profiles where id=a.target),'detail',a.detail) x
    from admin_audit a order by a.at desc limit least(greatest(coalesce(p_limit,50),1),200)) t),'[]'::jsonb);
end $$;

revoke all on function my_admin, admin_staff_find, admin_staff_list, admin_staff_set, admin_staff_remove, admin_audit_list from public, anon;
grant execute on function my_admin, admin_staff_find, admin_staff_list, admin_staff_set, admin_staff_remove, admin_audit_list to authenticated;
revoke all on function _staff_perms from public, anon, authenticated;

-- 5) Pasang has_perm() ke SEMUA kebijakan RLS yang memakai is_admin() -----------------
do $$
declare
  m record; pol record; nq text; nw text; n int:=0;
begin
  for pol in select * from pg_policies where (coalesce(qual,'')||coalesce(with_check,'')) ~ 'is_admin\(\)' and policyname not like 'staff:%' and policyname not like 'audit:%' loop
    select * into m from (values
      ('public','events','SELECT','events.view'),('public','events','INSERT','events.create'),
      ('public','events','UPDATE','events.edit'),('public','events','DELETE','events.delete'),
      ('storage','objects','INSERT','posters.upload'),('storage','objects','DELETE','posters.delete'),
      ('public','event_submissions','SELECT','events.review'),
      ('public','blog_posts','ALL','blog.manage'),('public','blog_comments','ALL','blog.manage'),('public','blog_checks','ALL','blog.manage'),
      ('public','arsip_blog','ALL','arsip.manage'),('public','arsip_komentar','ALL','arsip.manage'),('public','arsip_impor','ALL','arsip.manage'),
      ('public','forum_cities','ALL','forum.config'),('public','forum_groups','ALL','forum.config'),
      ('public','forum_posts','SELECT','forum.moderate'),('public','forum_replies','SELECT','forum.moderate'),('public','forum_reports','SELECT','forum.moderate'),
      ('public','forum_bans','SELECT','forum.ban'),('public','forum_strikes','SELECT','forum.ban'),
      ('public','prohibited_words','ALL','words.manage'),('public','word_violations','SELECT','words.view'),
      ('public','invitations','SELECT','invitations.moderate'),('public','invitation_reports','SELECT','invitations.moderate'),
      ('public','chat_reports','SELECT','chat.moderate')
    ) v(sch,tbl,cmd,perm) where v.sch=pol.schemaname and v.tbl=pol.tablename and v.cmd=pol.cmd;
    if not found then
      raise notice 'Kebijakan % pada %.% tidak dipetakan: tetap khusus pemilik.',pol.policyname,pol.schemaname,pol.tablename; continue;
    end if;
    nq:=regexp_replace(pol.qual,'(public\.)?is_admin\(\)',format('has_perm(%L)',m.perm),'g');
    nw:=regexp_replace(pol.with_check,'(public\.)?is_admin\(\)',format('has_perm(%L)',m.perm),'g');
    execute format('alter policy %I on %I.%I %s %s',pol.policyname,pol.schemaname,pol.tablename,
      case when nq is not null then format('using (%s)',nq) else '' end,
      case when nw is not null then format('with check (%s)',nw) else '' end);
    n:=n+1;
  end loop;
  raise notice 'Kebijakan RLS dipetakan ke has_perm(): %',n;
end $$;

-- 6) Pasang has_perm() ke fungsi RPC admin ------------------------------------------
do $$
declare
  m record; f record; def text; nd text; n int:=0;
begin
  for m in select * from (values
    ('admin_stats','stats.view'),('admin_users','users.view'),('admin_review_event','events.review'),
    ('admin_forum_moderate','forum.moderate'),('admin_forum_ban','forum.ban'),('admin_forum_unban','forum.ban'),
    ('admin_forum_waitlist','forum.config'),('admin_words_upsert','words.manage'),('admin_words_delete','words.manage'),
    ('admin_list_sponsor_leads','sponsor.view'),('admin_update_sponsor_lead','sponsor.manage'),('admin_activate_sponsor','sponsor.manage'),
    ('admin_set_featured','events.feature'),('arsip_hapus_koleksi','arsip.manage'),('arsip_daftar_koleksi','arsip.manage'),
    ('admin_close_invitation','invitations.moderate')
  ) v(fn,perm) loop
    for f in select p.oid from pg_proc p join pg_namespace s on s.oid=p.pronamespace where s.nspname='public' and p.proname=m.fn loop
      def:=pg_get_functiondef(f.oid);
      nd:=regexp_replace(def,'(public\.)?is_admin\(\)',format('has_perm(%L)',m.perm),'g');
      nd:=regexp_replace(nd,'exists\s*\(\s*select\s+1\s+from\s+profiles\s+where\s+id\s*=\s*auth\.uid\(\)\s+and\s+role\s*=\s*''admin''\s*\)',format('has_perm(%L)',m.perm),'g');
      if nd<>def then execute nd; n:=n+1; else raise notice 'Fungsi % tidak berisi pemeriksaan admin (dilewati).',m.fn; end if;
    end loop;
  end loop;
  -- Staff tidak boleh diblokir/dibatasi forum seperti pengguna biasa
  for f in select p.oid,p.proname from pg_proc p join pg_namespace s on s.oid=p.pronamespace where s.nspname='public' and p.proname in ('_forum_autoban','admin_forum_ban') loop
    def:=pg_get_functiondef(f.oid);
    nd:=regexp_replace(def,'exists\s*\(\s*select\s+1\s+from\s+profiles\s+where\s+id\s*=\s*p_user\s+and\s+role\s*=\s*''admin''\s*\)','is_staff_user(p_user)','g');
    if nd<>def then execute nd; n:=n+1; end if;
  end loop;
  raise notice 'Fungsi RPC dipetakan ke has_perm(): %',n;
end $$;

-- 7) Pagar di tabel events: terbit / sponsor butuh izin sendiri ------------------------
-- (RLS tidak bisa membedakan kolom; trigger ini hanya aktif untuk panggilan langsung dari klien, bukan RPC security definer.)
create or replace function _events_perm_guard() returns trigger language plpgsql set search_path=public as $$
begin
  if current_user<>'authenticated' or auth.uid() is null or is_owner() then return new; end if;
  if tg_op='INSERT' then
    if new.status='published' and not has_perm('events.publish') then raise exception 'Tidak punya izin menerbitkan event.' using errcode='42501'; end if;
    if (coalesce(new.is_featured,false) or coalesce(new.boost_score,0)<>0 or new.featured_until is not null or new.sponsor_label is not null)
       and not has_perm('events.feature') then raise exception 'Tidak punya izin mengatur event Disorot.' using errcode='42501'; end if;
  else
    if new.status is distinct from old.status and not has_perm('events.publish') then raise exception 'Tidak punya izin menerbitkan atau menarik event.' using errcode='42501'; end if;
    if (coalesce(new.is_featured,false),coalesce(new.boost_score,0),new.featured_until,new.sponsor_label)
       is distinct from (coalesce(old.is_featured,false),coalesce(old.boost_score,0),old.featured_until,old.sponsor_label)
       and not has_perm('events.feature') then raise exception 'Tidak punya izin mengatur event Disorot.' using errcode='42501'; end if;
  end if;
  return new;
end $$;
drop trigger if exists events_perm_guard on events;
create trigger events_perm_guard before insert or update on events for each row execute function _events_perm_guard();

-- 8) Pemeriksaan hasil ---------------------------------------------------------------
-- (a) Sisa fungsi yang masih memakai is_admin() = khusus pemilik (wajar: stat_*, dll). Periksa daftarnya:
--   select p.proname from pg_proc p join pg_namespace s on s.oid=p.pronamespace
--   where s.nspname='public' and pg_get_functiondef(p.oid) ~ 'is_admin\(\)' and p.proname not in ('is_admin') order by 1;
-- (b) Cek akun sendiri:  select my_admin();
-- (c) Jadikan seseorang pemilik (hanya lewat SQL Editor, tidak bisa dari panel):
--   update profiles set role='admin' where id=(select id from auth.users where email='email@contoh.com');
