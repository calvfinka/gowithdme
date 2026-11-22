-- GoWithDME patch: pengaman akun baru di sisi server. Jalankan SEKALI di Supabase > SQL Editor. Aman dijalankan ulang.
-- ISI:
--   1. Aturan nama panggilan di server: tolak nama yang menyerupai pengelola, serta email / nomor HP / tautan.
--   2. Nama panggilan unik (tanpa membedakan huruf besar-kecil). Nama kembar lama diberi akhiran, nama baru yang bentrok diberi angka.
--   3. Satu handle_new_user() final (menggantikan 4 versi di schema.sql, schema_tahap2.sql, schema_google.sql, patch_nickname.sql).
--   4. Masa percobaan 48 jam untuk akun baru (belum verified, bukan admin): batas harian lebih ketat untuk DM, kiriman forum,
--      balasan forum, ajakan, dan pengajuan event. Dipasang lewat trigger, jadi berlaku untuk semua versi fungsi RPC yang ada.
-- SEBELUM MENJALANKAN: salin dulu tabel profiles (Table Editor > profiles > Export) sebagai cadangan.
-- Nilai batas ada di bagian 4 (angka terakhir pada tiap create trigger), ubah bila perlu.

-- ============ 1. Fungsi penilai nama ============
create or replace function nick_compact(t text) returns text language sql immutable as $$
  select regexp_replace(translate(lower(coalesce(t,'')),'013457@$!','oieastasi'),'[^a-z]','','g')
$$;

-- Hasil: null (aman), 'private' (email / nomor HP / tautan), atau 'reserved' (menyerupai pengelola).
create or replace function nick_issue(t text) returns text language plpgsql immutable as $$
declare raw text:=btrim(coalesce(t,'')); c text; w text;
  exact_list text[]:=array['admin','administrator','moderator','mod','staff','support','official','system','sistem','owner','cs','customerservice','helpdesk','gwm','gowithme','gowithdme','jurkon','jurkonstudio'];
  edge_list  text[]:=array['admin','gwm','gowithdme','gowithme','jurkon','moderator'];
begin
  if raw='' then return null; end if;
  if raw ~ '\S+@\S+\.\S+' or raw ~* '(https?://|www\.|\.(com|net|org|co|id|my\.id|xyz|me|io)(/|\y))'
     or length(regexp_replace(raw,'\D','','g'))>=9 then return 'private'; end if;
  c:=nick_compact(raw);
  if c=any(exact_list) then return 'reserved'; end if;
  foreach w in array edge_list loop
    if length(c)>length(w) and (left(c,length(w))=w or right(c,length(w))=w) and position('administrasi' in c)=0 then return 'reserved'; end if;
  end loop;
  return null;
end $$;

-- Nama final untuk akun baru: rapikan spasi, ganti yang terlarang menjadi "Pengguna", beri angka bila sudah dipakai.
create or replace function nick_make(raw text, mail text, uid uuid) returns text language plpgsql as $$
declare base text; cand text; i int:=0;
begin
  base:=left(btrim(regexp_replace(coalesce(raw,''),'\s+',' ','g')),30);
  if base='' then base:=btrim(split_part(coalesce(mail,''),'@',1)); end if;
  if base='' or nick_issue(base) is not null then base:='Pengguna'; end if;
  cand:=base;
  while exists(select 1 from profiles where lower(nickname)=lower(cand) and id<>uid) loop
    i:=i+1;
    if i>20 then cand:=left(base,20)||substr(replace(uid::text,'-',''),1,8); exit; end if;
    cand:=left(base,25)||(1000+floor(random()*9000))::int;
  end loop;
  return cand;
end $$;

-- ============ 2. Nama kembar lama lalu indeks unik ============
do $$
declare n int;
begin
  with d as (
    select id, row_number() over (partition by lower(nickname) order by created_at nulls last, id) rn
    from profiles where nickname is not null)
  update profiles p set nickname=left(p.nickname,24)||'_'||substr(replace(p.id::text,'-',''),1,5)
  from d where d.id=p.id and d.rn>1;
  get diagnostics n = row_count;
  raise notice 'Nama kembar yang diberi akhiran: %', n;
end $$;
create unique index if not exists profiles_nickname_ci on profiles (lower(nickname));

-- Penjaga di server: pengguna biasa tidak bisa mengganti nama menjadi nama terlarang lewat API langsung.
create or replace function profiles_nick_guard() returns trigger language plpgsql security definer set search_path=public as $$
declare iss text;
begin
  if new.nickname is not distinct from old.nickname or coalesce(old.role,'user')='admin' then return new; end if;
  iss:=nick_issue(new.nickname);
  if iss='reserved' then raise exception 'Nama ini menyerupai pengelola GoWithDME. Pilih nama panggilan lain.'; end if;
  if iss='private' then raise exception 'Jangan pakai email, nomor HP, atau tautan sebagai nama panggilan.'; end if;
  return new;
end $$;
drop trigger if exists profiles_nick_guard on profiles;
create trigger profiles_nick_guard before update of nickname on profiles for each row execute function profiles_nick_guard();

-- ============ 3. handle_new_user() final ============
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
declare nm text; av text;
begin
  nm:=coalesce(nullif(trim(new.raw_user_meta_data->>'nickname'),''), nullif(trim(new.raw_user_meta_data->>'full_name'),''), nullif(trim(new.raw_user_meta_data->>'name'),''));
  av:=coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture');
  begin
    insert into profiles(id,nickname,avatar_url) values (new.id, nick_make(nm,new.email,new.id), av) on conflict (id) do nothing;
  exception when unique_violation then
    -- dua pendaftar bernama sama pada detik yang sama: pakai akhiran dari id akun
    insert into profiles(id,nickname,avatar_url) values (new.id, left(coalesce(nullif(nm,''),'Pengguna'),20)||substr(replace(new.id::text,'-',''),1,8), av) on conflict (id) do nothing;
  end;
  return new;
end $$;

-- ============ 4. Masa percobaan akun baru ============
create or replace function acct_probation(uid uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from profiles where id=uid and created_at>now()-interval '48 hours' and coalesce(verified,false)=false and coalesce(role,'user')<>'admin')
$$;

-- Argumen trigger: kolom pemilik, batas, jendela waktu, nama kegiatan. Dihitung dari tabelnya sendiri, tanpa mengubah fungsi RPC.
create or replace function probation_limit() returns trigger language plpgsql security definer set search_path=public as $$
declare uid uuid; n int;
begin
  execute format('select ($1).%I', tg_argv[0]) into uid using new;
  if uid is null or not acct_probation(uid) then return new; end if;
  execute format('select count(*) from %I where %I=$1 and created_at>now()-$2::interval', tg_table_name, tg_argv[0]) into n using uid, tg_argv[2];
  if n>=tg_argv[1]::int then
    raise exception 'Akun baru dibatasi % % selama 48 jam pertama. Coba lagi besok.', tg_argv[1], tg_argv[3];
  end if;
  return new;
end $$;

do $$ begin
  if to_regclass('public.chat_threads')      is not null then drop trigger if exists probation_limit on chat_threads;      create trigger probation_limit before insert on chat_threads      for each row execute function probation_limit('started_by','2','1 day','percakapan baru per hari'); end if;
  if to_regclass('public.forum_posts')       is not null then drop trigger if exists probation_limit on forum_posts;       create trigger probation_limit before insert on forum_posts       for each row execute function probation_limit('author_id','2','1 day','kiriman forum per hari'); end if;
  if to_regclass('public.forum_replies')     is not null then drop trigger if exists probation_limit on forum_replies;     create trigger probation_limit before insert on forum_replies     for each row execute function probation_limit('author_id','10','1 day','balasan forum per hari'); end if;
  if to_regclass('public.invitations')       is not null then drop trigger if exists probation_limit on invitations;       create trigger probation_limit before insert on invitations       for each row execute function probation_limit('host_id','2','1 day','ajakan baru per hari'); end if;
  if to_regclass('public.event_submissions') is not null then drop trigger if exists probation_limit on event_submissions; create trigger probation_limit before insert on event_submissions for each row execute function probation_limit('user_id','3','24 hours','pengajuan event per hari'); end if;
end $$;

-- Cek hasil (opsional): nama lama yang melanggar aturan baru. Tidak diubah otomatis, hanya untuk ditinjau.
-- select id, nickname, nick_issue(nickname) as masalah from profiles where nick_issue(nickname) is not null;
