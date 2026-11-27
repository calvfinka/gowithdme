-- Passkey untuk pengguna situs utama (gowithdme.com). Jalankan di Supabase > SQL Editor.
-- Tidak menyentuh tabel passkey admin.

create table if not exists public.user_passkeys (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  credential_id text not null unique,
  public_key    text not null,
  counter       bigint not null default 0,
  transports    text[] not null default '{}',
  device_type   text,
  backed_up     boolean not null default false,
  name          text not null default 'Passkey',
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);
create index if not exists user_passkeys_user_idx on public.user_passkeys(user_id);

-- Challenge sekali pakai. Login belum punya sesi, jadi dikunci dengan nonce acak.
create table if not exists public.user_webauthn_challenges (
  nonce      text primary key,
  type       text not null check (type in ('register','login')),
  user_id    uuid,
  challenge  text not null,
  expires_at timestamptz not null
);
create index if not exists user_webauthn_ch_exp_idx on public.user_webauthn_challenges(expires_at);

-- Catatan percobaan per IP untuk pembatasan.
create table if not exists public.user_passkey_attempts (
  id   bigint generated always as identity primary key,
  ip   text not null,
  kind text not null,            -- 'options' | 'fail'
  at   timestamptz not null default now()
);
create index if not exists user_passkey_att_idx on public.user_passkey_attempts(ip, kind, at);

alter table public.user_passkeys            enable row level security;
alter table public.user_webauthn_challenges enable row level security;
alter table public.user_passkey_attempts    enable row level security;

-- Pengguna hanya boleh MELIHAT dan MENGHAPUS passkey miliknya. Tambah/ubah hanya lewat Edge Function (service role).
drop policy if exists user_passkeys_select_own on public.user_passkeys;
create policy user_passkeys_select_own on public.user_passkeys
  for select to authenticated using (user_id = auth.uid());
drop policy if exists user_passkeys_delete_own on public.user_passkeys;
create policy user_passkeys_delete_own on public.user_passkeys
  for delete to authenticated using (user_id = auth.uid());

revoke all on public.user_passkeys from anon, authenticated;
grant select (id, name, created_at, last_used_at, device_type, backed_up) on public.user_passkeys to authenticated;
grant delete on public.user_passkeys to authenticated;

-- Dua tabel lain: tanpa kebijakan = hanya service role yang bisa akses.
revoke all on public.user_webauthn_challenges from anon, authenticated;
revoke all on public.user_passkey_attempts    from anon, authenticated;
