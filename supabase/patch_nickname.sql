-- GWM patch: nama panggilan yang diisi saat daftar sebelumnya diabaikan (profil selalu memakai awalan email).
-- Jalankan sekali di Supabase > SQL Editor. Aman dijalankan ulang.
-- Catatan: bila schema_google.sql atau schema_tahap2.sql sudah mengubah fungsi handle_new_user() dengan logika tambahan,
-- gabungkan dulu isinya; fungsi di bawah hanya mengisi id, nickname, dan avatar_url.
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into profiles(id,nickname,avatar_url) values (new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data->>'nickname'),''), nullif(trim(new.raw_user_meta_data->>'full_name'),''),
                  nullif(trim(new.raw_user_meta_data->>'name'),''), split_part(new.email,'@',1)),30),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'))
  on conflict (id) do nothing;
  return new;
end $$;
