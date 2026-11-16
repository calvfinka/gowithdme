-- Ajakan barengan: pengunjung login membuat ajakan di sebuah event. Jalankan SETELAH schema_tahap2.sql.
create table invitations(
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  host_id uuid not null references profiles(id) on delete cascade,
  title text not null check (char_length(title) between 5 and 80),
  note text check (char_length(note)<=500),
  meeting_point text check (char_length(meeting_point)<=100),
  cost_share text check (char_length(cost_share)<=60),
  capacity int not null check (capacity between 2 and 20),   -- termasuk host
  status text not null default 'open' check (status in ('open','full','closed','cancelled')),
  created_at timestamptz default now());
create unique index one_active_per_event on invitations(event_id,host_id) where status in ('open','full');
create table invitation_contacts(invitation_id uuid primary key references invitations(id) on delete cascade, wa text not null check (wa ~ '^62[0-9]{8,13}$'));
create table invitation_members(
  invitation_id uuid references invitations(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected','left')),
  message text check (char_length(message)<=200),
  created_at timestamptz default now(), primary key(invitation_id,user_id));
alter table invitations enable row level security; alter table invitation_contacts enable row level security; alter table invitation_members enable row level security;

-- Baca saja lewat RLS; SEMUA tulis lewat fungsi di bawah (tidak ada policy insert/update/delete)
create policy "host baca ajakan" on invitations for select to authenticated using (host_id=auth.uid());
create policy "kontak: host atau anggota disetujui" on invitation_contacts for select to authenticated using (
  exists(select 1 from invitations i where i.id=invitation_id and i.host_id=auth.uid())
  or exists(select 1 from invitation_members m where m.invitation_id=invitation_contacts.invitation_id and m.user_id=auth.uid() and m.status='approved'));
create policy "anggota: diri sendiri atau host" on invitation_members for select to authenticated using (
  user_id=auth.uid() or exists(select 1 from invitations i where i.id=invitation_id and i.host_id=auth.uid()));

-- Tampilan publik: tanpa kontak, hanya nama panggilan host. Otomatis hilang saat event selesai.
create view invitations_public as
 select i.id,i.event_id,i.host_id,i.title,i.note,i.meeting_point,i.cost_share,i.capacity,i.status,i.created_at,
  p.nickname host_name,p.verified host_verified,
  1+(select count(*) from invitation_members m where m.invitation_id=i.id and m.status='approved') filled
 from invitations i join profiles p on p.id=i.host_id join events e on e.id=i.event_id
 where i.status in ('open','full') and e.status='published' and coalesce(e.end_date,e.event_date)>=(now() at time zone 'Asia/Jakarta')::date;
grant select on invitations_public to anon, authenticated;

create function _event_active(p_event uuid) returns boolean language sql security definer stable set search_path=public as
$$ select exists(select 1 from events where id=p_event and status='published' and coalesce(end_date,event_date)>=(now() at time zone 'Asia/Jakarta')::date) $$;

create function create_invitation(p_event uuid,p_title text,p_note text,p_meet text,p_cost text,p_cap int,p_wa text) returns uuid
language plpgsql security definer set search_path=public as $$
declare v uuid; w text:=regexp_replace(coalesce(p_wa,''),'\D','','g');
begin
  if auth.uid() is null then raise exception 'Masuk dulu untuk membuat ajakan.'; end if;
  if not _event_active(p_event) then raise exception 'Event ini sudah selesai atau tidak tersedia.'; end if;
  if (select count(*) from invitations where host_id=auth.uid() and status in ('open','full'))>=3 then raise exception 'Maksimal 3 ajakan aktif sekaligus.'; end if;
  if left(w,1)='0' then w:='62'||substr(w,2); end if;
  insert into invitations(event_id,host_id,title,note,meeting_point,cost_share,capacity)
   values(p_event,auth.uid(),trim(p_title),nullif(trim(p_note),''),nullif(trim(p_meet),''),nullif(trim(p_cost),''),p_cap) returning id into v;
  insert into invitation_contacts values(v,w);
  return v;
exception when unique_violation then raise exception 'Kamu sudah punya ajakan aktif di event ini.';
end $$;

create function request_join(p_inv uuid,p_msg text) returns void language plpgsql security definer set search_path=public as $$
declare i invitations;
begin
  if auth.uid() is null then raise exception 'Masuk dulu untuk bergabung.'; end if;
  select * into i from invitations where id=p_inv;
  if i.id is null or i.status<>'open' or not _event_active(i.event_id) then raise exception 'Ajakan sudah penuh atau ditutup.'; end if;
  if i.host_id=auth.uid() then raise exception 'Ini ajakanmu sendiri.'; end if;
  if (select count(*) from invitation_members where user_id=auth.uid() and status='pending')>=10 then raise exception 'Terlalu banyak permintaan menunggu.'; end if;
  insert into invitation_members(invitation_id,user_id,message) values(p_inv,auth.uid(),left(p_msg,200))
   on conflict(invitation_id,user_id) do update set status='pending',message=left(p_msg,200) where invitation_members.status='left';
  if not found then raise exception 'Kamu sudah mengajukan ke ajakan ini.'; end if;
end $$;

create function decide_member(p_inv uuid,p_user uuid,p_ok boolean) returns void language plpgsql security definer set search_path=public as $$
declare i invitations; n int;
begin
  select * into i from invitations where id=p_inv and host_id=auth.uid();
  if i.id is null then raise exception 'Hanya host yang bisa memutuskan.'; end if;
  select count(*) into n from invitation_members where invitation_id=p_inv and status='approved';
  if p_ok and n+1>=i.capacity then raise exception 'Kuota sudah penuh.'; end if;
  update invitation_members set status=case when p_ok then 'approved' else 'rejected' end where invitation_id=p_inv and user_id=p_user and status='pending';
  if p_ok and n+2>=i.capacity then update invitations set status='full' where id=p_inv; end if;
end $$;

create function leave_or_cancel(p_inv uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if exists(select 1 from invitations where id=p_inv and host_id=auth.uid()) then update invitations set status='cancelled' where id=p_inv;
  else update invitation_members set status='left' where invitation_id=p_inv and user_id=auth.uid() and status in ('pending','approved');
       update invitations set status='open' where id=p_inv and status='full'; end if;
end $$;

revoke all on function _event_active,create_invitation,request_join,decide_member,leave_or_cancel from public,anon;
grant execute on function create_invitation,request_join,decide_member,leave_or_cancel to authenticated;
