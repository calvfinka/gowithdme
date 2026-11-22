-- GoWithDME by Jurkon Studio. Jalankan di Supabase > SQL Editor.
create table provinces(id serial primary key, name text unique not null);
create table cities(id serial primary key, province_id int not null references provinces(id), name text not null, slug text unique not null);
create table categories(slug text primary key, name text not null);
create table events(
  id uuid primary key default gen_random_uuid(),
  title text not null, slug text unique not null,
  category text not null references categories(slug),
  city_id int not null references cities(id),
  venue text, event_date date not null, price_label text,
  description text, poster_url text, ticket_url text, source_ig text,
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz default now());
create table profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text, avatar_url text, city_id int references cities(id),
  verified boolean default false, created_at timestamptz default now());
create table login_logs(
  id bigserial primary key, user_id uuid references auth.users(id) on delete cascade,
  ip inet, ip_city text, gps_lat double precision, gps_lng double precision,
  device text, flagged boolean default false, created_at timestamptz default now());

alter table provinces enable row level security; alter table cities enable row level security;
alter table categories enable row level security; alter table events enable row level security;
alter table profiles enable row level security; alter table login_logs enable row level security;

create policy "baca provinsi" on provinces for select using (true);
create policy "baca kota" on cities for select using (true);
create policy "baca kategori" on categories for select using (true);
create policy "baca event terbit" on events for select using (status='published');
-- Profil: hanya pengguna login yang boleh melihat profil lain (email/HP tidak ada di tabel ini)
create policy "lihat profil" on profiles for select to authenticated using (true);
create policy "ubah profil sendiri" on profiles for update to authenticated using (auth.uid()=id);
-- login_logs: pengguna hanya membaca log miliknya. Insert HANYA lewat Edge Function (service role)
create policy "baca log sendiri" on login_logs for select to authenticated using (auth.uid()=user_id);

create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into profiles(id,nickname,avatar_url) values (new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data->>'nickname'),''), nullif(trim(new.raw_user_meta_data->>'full_name'),''),
                  nullif(trim(new.raw_user_meta_data->>'name'),''), split_part(new.email,'@',1)),30),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

insert into categories values ('konser','Konser'),('naikgunung','Naik Gunung');
insert into provinces(name) values ('Jawa Barat');
insert into cities(province_id,name,slug) select p.id,c,lower(c) from provinces p, unnest(array['Bandung','Cimahi','Bogor','Bekasi']) c where p.name='Jawa Barat';
