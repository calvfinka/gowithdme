-- Tahap 2: admin + login. Jalankan SETELAH schema.sql, di Supabase > SQL Editor.
alter table profiles add column if not exists role text not null default 'user' check (role in ('user','admin'));

-- Pengguna biasa hanya boleh mengubah kolom ini (role & verified tidak bisa diubah sendiri)
revoke update on profiles from authenticated;
grant update (nickname, avatar_url, city_id) on profiles to authenticated;

create or replace function is_admin() returns boolean language sql security definer stable set search_path=public as
$$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin') $$;

create policy "admin baca semua event" on events for select to authenticated using (is_admin());
create policy "admin tambah event" on events for insert to authenticated with check (is_admin());
create policy "admin ubah event" on events for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin hapus event" on events for delete to authenticated using (is_admin());

-- Nama panggilan dari form daftar
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into profiles(id,nickname) values (new.id, coalesce(nullif(new.raw_user_meta_data->>'nickname',''), split_part(new.email,'@',1))); return new; end $$;

-- Storage poster (publik dibaca, hanya admin yang unggah)
insert into storage.buckets (id,name,public) values ('posters','posters',true) on conflict do nothing;
create policy "poster publik" on storage.objects for select using (bucket_id='posters');
create policy "admin unggah poster" on storage.objects for insert to authenticated with check (bucket_id='posters' and is_admin());
create policy "admin hapus poster" on storage.objects for delete to authenticated using (bucket_id='posters' and is_admin());

-- Jadikan diri sendiri admin (ganti email, jalankan SETELAH kamu daftar di login.html):
-- update profiles set role='admin' where id=(select id from auth.users where email='emailkamu@gmail.com');
