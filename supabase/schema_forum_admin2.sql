-- Admin: lihat permintaan kota (daftar tunggu). Jalankan SETELAH schema_forum.sql. Aman dijalankan ulang.
-- Tabel forum_waitlist hanya bisa dibaca pemiliknya, jadi admin membacanya lewat fungsi ini (pengguna biasa mendapat hasil kosong).
create or replace function admin_forum_waitlist() returns table(city text, n bigint, is_open boolean)
language sql security definer stable set search_path=public as $$
  select w.city, count(*)::bigint, exists(select 1 from forum_cities c where c.name=w.city)
  from forum_waitlist w where is_admin() group by w.city order by 2 desc, 1
$$;
revoke all on function admin_forum_waitlist from public, anon;
grant execute on function admin_forum_waitlist to authenticated;
