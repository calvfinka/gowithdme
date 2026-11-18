-- Sistem Pemblokiran Kata Terlarang Wilayah Indonesia + Log Pelanggaran per User ID.
-- Jalankan di SQL Editor Supabase SETELAH schema_profil.sql dan schema_forum.sql. Aman dijalankan ulang.

create table if not exists prohibited_words (
  word text primary key,
  category text not null default 'custom' check (category in ('profanity','judol','sara','porn','scam','custom')),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists word_violations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  context text not null default 'input',
  category text not null default 'custom',
  matched_words text,
  excerpt text,
  created_at timestamptz not null default now()
);

create index if not exists word_violations_user_idx on word_violations(user_id, created_at desc);

alter table prohibited_words enable row level security;
alter table word_violations enable row level security;

drop policy if exists "kata terlarang: baca semua login" on prohibited_words;
create policy "kata terlarang: baca semua login" on prohibited_words for select to authenticated using (true);

drop policy if exists "kata terlarang: admin kelola" on prohibited_words;
create policy "kata terlarang: admin kelola" on prohibited_words for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists "pelanggaran kata: admin baca" on word_violations;
create policy "pelanggaran kata: admin baca" on word_violations for select to authenticated using (is_admin());

-- Normalisasi sederhana untuk pengecekan sisi server (leetspeak + huruf kecil)
create or replace function _id_normalize_text(p_text text) returns text
language sql immutable as $$
  select regexp_replace(
    translate(lower(coalesce(p_text,'')), '4@31!|05$7+', 'aaeiiosstt'),
    '[^a-z0-9\s]', ' ', 'g'
  )
$$;

-- Cek kata terlarang standar + daftar kustom dari tabel prohibited_words
create or replace function _id_prohibited_check(p_text text) returns text
language plpgsql stable security definer set search_path=public as $$
declare
  norm text := _id_normalize_text(p_text);
  compact text := regexp_replace(norm, '\s+', '', 'g');
  cw record;
  pat text;
begin
  if norm = '' then return null; end if;
  pat := '\y(anjing|anjir|anjay|bangsat|bajingan|brengsek|kontol|memek|jembut|ngentot|jancok|jancuk|goblok|tolol|lonte|pelacur|pukimak|bokep|porno|judol|maxwin|sbobet|togel|slot gacor|judi online|pinjol ilegal|uang palsu|open bo)\y';
  if norm ~* pat then
    return substring(norm from pat);
  end if;
  for cw in select word from prohibited_words loop
    if norm ~* ('\y' || regexp_replace(cw.word, '[^a-z0-9\s]', '', 'g') || '\y') then
      return cw.word;
    end if;
    if length(cw.word) >= 5 and position(replace(cw.word, ' ', '') in compact) > 0 then
      return cw.word;
    end if;
  end loop;
  return null;
end $$;

-- Catat pelanggaran dari client ketika pengguna yang sudah login mencoba mengirim kata terlarang
create or replace function log_word_violation(p_context text, p_category text, p_words text, p_excerpt text) returns void
language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Masuk dulu.'; end if;
  insert into word_violations(user_id, context, category, matched_words, excerpt)
  values (
    auth.uid(),
    left(coalesce(p_context, 'input'), 40),
    left(coalesce(p_category, 'custom'), 24),
    left(coalesce(p_words, ''), 120),
    left(coalesce(p_excerpt, ''), 160)
  );
end $$;

-- Admin RPC untuk menambah / menghapus kata terlarang kustom
create or replace function admin_words_upsert(p_word text, p_category text default 'custom') returns void
language plpgsql security definer set search_path=public as $$
declare w text := trim(lower(regexp_replace(coalesce(p_word,''), '[^a-zA-Z0-9\s]', ' ', 'g')));
begin
  if not is_admin() then raise exception 'Hanya admin.'; end if;
  if length(w) < 3 then raise exception 'Minimal 3 karakter.'; end if;
  insert into prohibited_words(word, category, created_by)
  values (w, case when p_category in ('profanity','judol','sara','porn','scam','custom') then p_category else 'custom' end, auth.uid())
  on conflict (word) do update set category = excluded.category;
end $$;

create or replace function admin_words_delete(p_word text) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not is_admin() then raise exception 'Hanya admin.'; end if;
  delete from prohibited_words where word = trim(lower(coalesce(p_word,'')));
end $$;

-- Trigger pengaman otomatis pada forum_posts, forum_replies, profiles (nickname), dan profile_extra (bio)
create or replace function _trg_id_word_guard() returns trigger
language plpgsql security definer set search_path=public as $$
declare
  txt text := '';
  hit text;
  uid uuid := auth.uid();
begin
  if tg_table_name = 'forum_posts' then txt := coalesce(new.title,'') || ' ' || coalesce(new.body,'');
  elsif tg_table_name = 'forum_replies' then txt := coalesce(new.body,'');
  elsif tg_table_name = 'profiles' then txt := coalesce(new.nickname,'');
  elsif tg_table_name = 'profile_extra' then txt := coalesce(new.bio,'');
  elsif tg_table_name = 'invitations' then txt := coalesce(new.title,'') || ' ' || coalesce(new.note,'') || ' ' || coalesce(new.meeting_point,'');
  elsif tg_table_name = 'chat_messages' then txt := coalesce(new.body,'');
  end if;
  hit := _id_prohibited_check(txt);
  if hit is not null then
    if uid is not null then
      insert into word_violations(user_id, context, category, matched_words, excerpt)
      values (uid, tg_table_name, 'auto_guard', hit, left(txt, 140));
    end if;
    raise exception 'Konten diblokir oleh filter kata terlarang Indonesia (%).', hit;
  end if;
  return new;
end $$;

drop trigger if exists trg_word_guard_posts on forum_posts;
create trigger trg_word_guard_posts before insert or update on forum_posts for each row execute function _trg_id_word_guard();

drop trigger if exists trg_word_guard_replies on forum_replies;
create trigger trg_word_guard_replies before insert or update on forum_replies for each row execute function _trg_id_word_guard();

drop trigger if exists trg_word_guard_profiles on profiles;
create trigger trg_word_guard_profiles before insert or update of nickname on profiles for each row execute function _trg_id_word_guard();

drop trigger if exists trg_word_guard_profile_extra on profile_extra;
create trigger trg_word_guard_profile_extra before insert or update of bio on profile_extra for each row execute function _trg_id_word_guard();

drop trigger if exists trg_word_guard_invitations on invitations;
create trigger trg_word_guard_invitations before insert or update on invitations for each row execute function _trg_id_word_guard();

drop trigger if exists trg_word_guard_chat on chat_messages;
create trigger trg_word_guard_chat before insert on chat_messages for each row execute function _trg_id_word_guard();

revoke all on function _id_normalize_text, _id_prohibited_check, log_word_violation, admin_words_upsert, admin_words_delete from public, anon;
grant execute on function _id_normalize_text, _id_prohibited_check, log_word_violation, admin_words_upsert, admin_words_delete to authenticated;
