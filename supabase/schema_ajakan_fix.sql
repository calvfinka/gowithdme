-- Perbaikan & tambahan ajakan barengan. Jalankan SETELAH schema_ajakan.sql. Aman dijalankan ulang.

-- 1. Kontak WA hanya terbaca selama ajakan masih aktif (host, atau anggota yang disetujui)
drop policy if exists "kontak: host atau anggota disetujui" on invitation_contacts;
create policy "kontak: host atau anggota disetujui" on invitation_contacts for select to authenticated using (
  exists(select 1 from invitations i where i.id=invitation_id and i.status in ('open','full') and (
    i.host_id=auth.uid()
    or exists(select 1 from invitation_members m where m.invitation_id=i.id and m.user_id=auth.uid() and m.status='approved'))));

-- 2. Tampilan publik: host_id tidak lagi dibuka, diganti penanda is_mine
drop view if exists invitations_public;
create view invitations_public as
 select i.id,i.event_id,(i.host_id=auth.uid()) as is_mine,i.title,i.note,i.meeting_point,i.cost_share,i.capacity,i.status,i.created_at,
  p.nickname host_name,p.verified host_verified,
  1+(select count(*) from invitation_members m where m.invitation_id=i.id and m.status='approved') filled
 from invitations i join profiles p on p.id=i.host_id join events e on e.id=i.event_id
 where i.status in ('open','full') and e.status='published' and coalesce(e.end_date,e.event_date)>=(now() at time zone 'Asia/Jakarta')::date;
grant select on invitations_public to anon, authenticated;

-- 3. Perbaiki bug: orang asing tidak bisa lagi membuka ulang ajakan penuh; baris ajakan dikunci
create or replace function leave_or_cancel(p_inv uuid) returns void language plpgsql security definer set search_path=public as $$
declare i invitations; ms text;
begin
  if auth.uid() is null then raise exception 'Masuk dulu.'; end if;
  select * into i from invitations where id=p_inv for update;
  if i.id is null then raise exception 'Ajakan tidak ditemukan.'; end if;
  if i.host_id=auth.uid() then
    update invitations set status='cancelled' where id=p_inv and status in ('open','full');
  else
    select status into ms from invitation_members where invitation_id=p_inv and user_id=auth.uid() and status in ('pending','approved') for update;
    if ms is null then raise exception 'Kamu bukan anggota ajakan ini.'; end if;
    update invitation_members set status='left' where invitation_id=p_inv and user_id=auth.uid();
    if ms='approved' and i.status='full' then update invitations set status='open' where id=p_inv; end if;
  end if;
end $$;

-- 4. Perbaiki balapan kuota: kunci baris ajakan saat memutuskan
create or replace function decide_member(p_inv uuid,p_user uuid,p_ok boolean) returns void language plpgsql security definer set search_path=public as $$
declare i invitations; n int; c int;
begin
  select * into i from invitations where id=p_inv and host_id=auth.uid() for update;
  if i.id is null then raise exception 'Hanya host yang bisa memutuskan.'; end if;
  if i.status not in ('open','full') then raise exception 'Ajakan sudah ditutup.'; end if;
  if p_ok then
    select count(*) into n from invitation_members where invitation_id=p_inv and status='approved';
    if n+1>=i.capacity then raise exception 'Kuota sudah penuh.'; end if;
    update invitation_members set status='approved' where invitation_id=p_inv and user_id=p_user and status='pending';
    get diagnostics c = row_count;
    if c=1 and n+2>=i.capacity then update invitations set status='full' where id=p_inv; end if;
  else
    update invitation_members set status='rejected' where invitation_id=p_inv and user_id=p_user and status='pending';
  end if;
end $$;

-- 5. Host bisa mengedit ajakan (kuota tidak boleh di bawah jumlah peserta yang sudah diterima)
create or replace function edit_invitation(p_inv uuid,p_title text,p_note text,p_meet text,p_cost text,p_cap int) returns void
language plpgsql security definer set search_path=public as $$
declare i invitations; n int;
begin
  select * into i from invitations where id=p_inv and host_id=auth.uid() for update;
  if i.id is null then raise exception 'Hanya host yang bisa mengedit.'; end if;
  if i.status not in ('open','full') then raise exception 'Ajakan sudah ditutup.'; end if;
  select 1+count(*) into n from invitation_members where invitation_id=p_inv and status='approved';
  if p_cap<n then raise exception 'Kuota tidak boleh di bawah jumlah peserta saat ini (%).',n; end if;
  update invitations set title=trim(p_title),note=nullif(trim(p_note),''),meeting_point=nullif(trim(p_meet),''),
    cost_share=nullif(trim(p_cost),''),capacity=p_cap,status=case when n>=p_cap then 'full' else 'open' end where id=p_inv;
end $$;

-- 6. "Cari teman": minat ke sebuah event tanpa membuat ajakan
create table if not exists event_interests(
  event_id uuid references events(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(), primary key(event_id,user_id));
alter table event_interests enable row level security;
drop policy if exists "minat: diri sendiri" on event_interests;
create policy "minat: diri sendiri" on event_interests for select to authenticated using (user_id=auth.uid());

create or replace function set_interest(p_event uuid,p_on boolean) returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Masuk dulu.'; end if;
  if not p_on then delete from event_interests where event_id=p_event and user_id=auth.uid(); return; end if;
  if not _event_active(p_event) then raise exception 'Event ini sudah selesai atau tidak tersedia.'; end if;
  if (select count(*) from event_interests where user_id=auth.uid())>=20 then raise exception 'Maksimal 20 event yang bisa kamu tandai.'; end if;
  insert into event_interests(event_id,user_id) values(p_event,auth.uid()) on conflict do nothing;
end $$;

-- Hitungan publik per event: jumlah ajakan terbuka dan jumlah orang yang cari teman
drop view if exists event_social;
create view event_social as
 select e.id event_id,
  (select count(*) from invitations_public p where p.event_id=e.id and p.status='open') open_invites,
  (select count(*) from event_interests t where t.event_id=e.id) interested
 from events e where e.status='published' and coalesce(e.end_date,e.event_date)>=(now() at time zone 'Asia/Jakarta')::date;
grant select on event_social to anon, authenticated;

-- 7. Laporan & moderasi (3 laporan berbeda menutup ajakan otomatis; admin bisa menutup manual)
create table if not exists invitation_reports(
  invitation_id uuid references invitations(id) on delete cascade,
  reporter_id uuid references profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 200),
  created_at timestamptz default now(), primary key(invitation_id,reporter_id));
alter table invitation_reports enable row level security;
drop policy if exists "laporan: admin baca" on invitation_reports;
create policy "laporan: admin baca" on invitation_reports for select to authenticated using (is_admin());
drop policy if exists "admin baca ajakan" on invitations;
create policy "admin baca ajakan" on invitations for select to authenticated using (is_admin());

create or replace function report_invitation(p_inv uuid,p_reason text) returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Masuk dulu untuk melapor.'; end if;
  if exists(select 1 from invitations where id=p_inv and host_id=auth.uid()) then raise exception 'Ini ajakanmu sendiri.'; end if;
  insert into invitation_reports(invitation_id,reporter_id,reason) values(p_inv,auth.uid(),left(trim(p_reason),200))
   on conflict do nothing;
  if (select count(*) from invitation_reports where invitation_id=p_inv)>=3 then
    update invitations set status='closed' where id=p_inv and status in ('open','full'); end if;
end $$;

create or replace function admin_close_invitation(p_inv uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_admin() then raise exception 'Khusus admin.'; end if;
  update invitations set status='closed' where id=p_inv and status in ('open','full');
end $$;

revoke all on function leave_or_cancel,decide_member,edit_invitation,set_interest,report_invitation,admin_close_invitation from public,anon;
grant execute on function leave_or_cancel,decide_member,edit_invitation,set_interest,report_invitation,admin_close_invitation to authenticated;
