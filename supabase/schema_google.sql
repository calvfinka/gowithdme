-- Login Google: ambil nama & foto dari akun Google saat profil dibuat. Jalankan di SQL Editor.
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into profiles(id,nickname,avatar_url) values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'nickname',''), nullif(new.raw_user_meta_data->>'full_name',''), nullif(new.raw_user_meta_data->>'name',''), split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url');
  return new;
end $$;
