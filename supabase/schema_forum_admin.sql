-- Moderasi forum untuk admin + indeks untuk daftar kiriman di halaman event.
-- Jalankan SETELAH schema_forum.sql. Aman dijalankan ulang.

-- Penanda laporan yang sudah ditangani admin (laporan lama tetap tersimpan sebagai bukti)
alter table forum_reports add column if not exists handled_at timestamptz;
create index if not exists forum_reports_open on forum_reports(created_at desc) where handled_at is null;

-- Daftar kiriman terkait event di rincian event
create index if not exists forum_posts_event on forum_posts(event_id, last_activity desc) where status='open';

-- Satu pintu untuk tindakan admin. Hanya admin yang boleh memanggilnya.
--   keep   = abaikan laporan: laporan dihapus, kiriman/balasan tayang lagi (hanya bila statusnya hidden)
--   hide   = sembunyikan: tidak tampil publik, bisa dipulihkan
--   delete = hapus: tidak bisa dipulihkan lewat panel; laporan ditandai selesai
create or replace function admin_forum_moderate(p_post uuid,p_reply uuid,p_action text) returns void
language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null or not is_admin() then raise exception 'Hanya admin.'; end if;
  if (p_post is null)=(p_reply is null) then raise exception 'Pilih satu kiriman atau satu balasan.'; end if;
  if p_action not in ('keep','hide','delete') then raise exception 'Tindakan tidak dikenal.'; end if;
  if p_post is not null then
    if p_action='keep' then
      delete from forum_reports where post_id=p_post;
      update forum_posts set status='open' where id=p_post and status='hidden';
    else
      update forum_posts set status=case p_action when 'hide' then 'hidden' else 'deleted' end where id=p_post;
      update forum_reports set handled_at=now() where post_id=p_post and handled_at is null;
    end if;
  else
    if p_action='keep' then
      delete from forum_reports where reply_id=p_reply;
      update forum_replies set status='open' where id=p_reply and status='hidden';
    else
      update forum_replies set status=case p_action when 'hide' then 'hidden' else 'deleted' end where id=p_reply;
      update forum_reports set handled_at=now() where reply_id=p_reply and handled_at is null;
    end if;
  end if;
end $$;
revoke all on function admin_forum_moderate from public, anon;
grant execute on function admin_forum_moderate to authenticated;
