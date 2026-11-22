-- ============================================================================
-- TES RBAC (jalankan di Supabase > SQL Editor SETELAH schema_rbac.sql). Semua data uji DIBATALKAN (rollback).
-- Hasil: baris "LULUS ..." di tab Messages/Results. Jika ada yang gagal, muncul error "GAGAL: ...".
-- Menguji: (1) admin Editor tak bisa buka Users/Statistik/Admin & Akses dan tak bisa buat admin (di backend),
--          (2) audit log tak bisa diubah/dihapus siapa pun dan hanya pemilik yang bisa baca,
--          (3) pencarian toleran typo + filter kota/kategori/tanggal/status dari database.
-- ============================================================================
begin;
do $$
declare
  o uuid:=gen_random_uuid(); e uuid:=gen_random_uuid(); a uuid:=gen_random_uuid();
  c1 int; c2 int; n int; r jsonb; ok boolean; msg text; ev uuid; t text;
begin
  insert into auth.users(id,email,aud,role) values
    (o,'t-owner-'||o||'@test.local','authenticated','authenticated'),
    (e,'t-editor-'||e||'@test.local','authenticated','authenticated'),
    (a,'t-analis-'||a||'@test.local','authenticated','authenticated');
  insert into profiles(id,nickname) values (o,'T-Owner'),(e,'T-Editor'),(a,'T-Analis') on conflict (id) do nothing;
  update profiles set role='admin' where id=o;
  select id into c1 from cities order by id limit 1;
  select id into c2 from cities where id<>c1 order by id limit 1;
  insert into events(title,slug,category,city_id,event_date,status) values
    ('Soundrenaline Bandung','t-sr-'||o,'konser',c1,current_date+10,'published'),
    ('Pendakian Gunung Prau','t-prau-'||o,'naikgunung',c2,current_date+40,'published'),
    ('Jazz Gunung Bromo','t-jz-'||o,'konser',c2,current_date+100,'draft');

  -- ===== Pemilik menambah staff =====
  perform set_config('request.jwt.claim.sub',o::text,true); perform set_config('request.jwt.claims',json_build_object('sub',o,'role','authenticated')::text,true); execute 'set local role authenticated';
  perform admin_staff_set(e,'editor'); perform admin_staff_set(a,'analis');
  select jsonb_array_length(admin_audit_list(50)) into n; if n<2 then raise exception 'GAGAL: pemilik tidak bisa baca audit (%)',n; end if;
  raise notice 'LULUS pemilik bisa tambah admin dan baca audit (% baris)',n;
  -- pemilik pun tidak boleh ubah/hapus audit
  ok:=false; begin update admin_audit set action='x'; exception when others then ok:=true; end; if not ok then raise exception 'GAGAL: pemilik bisa UPDATE audit'; end if;
  ok:=false; begin delete from admin_audit; exception when others then ok:=true; end; if not ok then raise exception 'GAGAL: pemilik bisa DELETE audit'; end if;
  raise notice 'LULUS pemilik pun tidak bisa ubah/hapus audit';
  execute 'reset role';
  -- bahkan superuser/SQL editor ditolak oleh trigger
  ok:=false; begin update admin_audit set action='x'; exception when others then get stacked diagnostics msg=message_text; ok:=true; end;
  if not ok or msg not ilike '%tidak bisa diubah%' then raise exception 'GAGAL: trigger audit tidak menolak (%)',msg; end if;
  ok:=false; begin delete from admin_audit; exception when others then ok:=true; end; if not ok then raise exception 'GAGAL: DELETE audit lolos di level SQL'; end if;
  ok:=false; begin truncate admin_audit; exception when others then ok:=true; end; if not ok then raise exception 'GAGAL: TRUNCATE audit lolos'; end if;
  raise notice 'LULUS trigger audit menolak update/delete/truncate (level SQL)';

  -- ===== (1) Editor =====
  perform set_config('request.jwt.claim.sub',e::text,true); perform set_config('request.jwt.claims',json_build_object('sub',e,'role','authenticated')::text,true); execute 'set local role authenticated';
  r:=my_admin();
  if (r->>'owner')::boolean or not (r->'perms') ? 'events.publish' or (r->'perms') ? 'users.view' or (r->'perms') ? 'stats.view' then raise exception 'GAGAL: izin editor salah %',r; end if;
  foreach t in array array[
    'select admin_users()','select admin_stats()','select admin_staff_list()','select admin_audit_list(10)',
    format('select admin_staff_find(%L)','x@y.z'),
    format('select admin_staff_set(%L,%L)',a,'editor'),
    format('select admin_staff_set(%L,%L,%L)',e,'custom','{users.view}'::text[]),
    format('select admin_staff_set(%L,%L,%L)',gen_random_uuid(),'custom','{events.view}'::text[]),
    format('select admin_staff_remove(%L)',a),
    'select admin_words_upsert(''kata'',''custom'')','select admin_list_sponsor_leads()']
  loop
    ok:=false; begin execute t; exception when others then ok:=true; end;
    if not ok then raise exception 'GAGAL: editor berhasil menjalankan: %',t; end if;
  end loop;
  raise notice 'LULUS editor DITOLAK backend: Users, Statistik, Admin & Akses (list/cari/buat/ubah/cabut), audit, filter kata, sponsor';
  foreach t in array array[
    format('insert into admin_staff(user_id,role_key) values (%L,%L)',e,'editor'),
    format('update admin_staff set role_key=%L where user_id=%L','custom',e),
    'delete from admin_staff',
    'update admin_audit set action=''x''','delete from admin_audit',
    format('update profiles set role=%L where id=%L','admin',e)]
  loop
    ok:=false; begin execute t; exception when others then ok:=true; end;
    if not ok then raise exception 'GAGAL: editor berhasil: %',t; end if;
  end loop;
  if is_owner() or has_perm('users.view') then raise exception 'GAGAL: editor naik hak'; end if;
  select count(*) into n from admin_staff; if n<>1 then raise exception 'GAGAL: editor melihat % baris admin_staff (harus 1: miliknya)',n; end if;
  select count(*) into n from admin_audit; if n<>0 then raise exception 'GAGAL: editor bisa membaca audit (% baris)',n; end if;
  raise notice 'LULUS editor tak bisa tulis tabel admin, tak bisa naik jadi owner, audit tak terbaca';
  -- batas event: boleh draft, tak boleh terbit/hapus/sponsor
  insert into events(title,slug,category,city_id,event_date,status) values ('Draft Editor','t-d-'||e,'konser',c1,current_date+5,'draft');
  ok:=false; begin insert into events(title,slug,category,city_id,event_date,status) values ('Terbit Editor','t-p-'||e,'konser',c1,current_date+5,'published'); exception when others then ok:=true; end;
  if not ok then raise exception 'GAGAL: editor menerbitkan event baru'; end if;
  ok:=false; begin update events set is_featured=true where slug='t-d-'||e; exception when others then ok:=true; end;
  if not ok then raise exception 'GAGAL: editor mengatur event Disorot'; end if;
  delete from events where slug='t-d-'||e;
  select count(*) into n from events where slug='t-d-'||e;
  if n<>1 then raise exception 'GAGAL: editor bisa hapus event'; end if;
  raise notice 'LULUS editor: draft boleh; terbit/hapus/sponsor ditolak';

  -- ===== (3) Pencarian =====
  foreach t in array array['Soundrenalin Bandng','sondrenaline','soundrenaline bandung','SOUNDRENALINE'] loop
    r:=admin_search_events(t);
    if not exists(select 1 from jsonb_array_elements(r->'rows') x where x->>'title'='Soundrenaline Bandung') then raise exception 'GAGAL: typo "%" tidak menemukan event',t; end if;
  end loop;
  raise notice 'LULUS pencarian toleran typo';
  r:=admin_search_events('zzzzqqqq'); if jsonb_array_length(r->'rows')<>0 then raise exception 'GAGAL: kata ngawur mengembalikan hasil'; end if;
  r:=admin_search_events(null,c2);
  if exists(select 1 from jsonb_array_elements(r->'rows') x where (x->>'city_id')::int<>c2) or jsonb_array_length(r->'rows')<2 then raise exception 'GAGAL: filter kota'; end if;
  r:=admin_search_events(null,null,'naikgunung');
  if exists(select 1 from jsonb_array_elements(r->'rows') x where x->>'category'<>'naikgunung') or not exists(select 1 from jsonb_array_elements(r->'rows') x where x->>'title'='Pendakian Gunung Prau') then raise exception 'GAGAL: filter kategori'; end if;
  r:=admin_search_events(null,null,null,current_date+30,current_date+60);
  if not exists(select 1 from jsonb_array_elements(r->'rows') x where x->>'title'='Pendakian Gunung Prau') or exists(select 1 from jsonb_array_elements(r->'rows') x where x->>'title'in('Soundrenaline Bandung','Jazz Gunung Bromo')) then raise exception 'GAGAL: filter tanggal'; end if;
  r:=admin_search_events(null,null,null,null,null,'draft');
  if exists(select 1 from jsonb_array_elements(r->'rows') x where x->>'status'<>'draft') then raise exception 'GAGAL: filter status'; end if;
  r:=admin_search_events('Gunung',c2,'naikgunung',current_date,current_date+60);
  if not exists(select 1 from jsonb_array_elements(r->'rows') x where x->>'title'='Pendakian Gunung Prau')
     or exists(select 1 from jsonb_array_elements(r->'rows') x where x->>'category'<>'naikgunung' or (x->>'city_id')::int<>c2) then raise exception 'GAGAL: filter gabungan'; end if;
  raise notice 'LULUS filter kota, kategori, tanggal, status, dan gabungannya (dari database)';
  execute 'reset role';

  -- ===== Analis: tanpa events.view =====
  perform set_config('request.jwt.claim.sub',a::text,true); perform set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated')::text,true); execute 'set local role authenticated';
  ok:=false; begin perform admin_search_events('x'); exception when others then ok:=true; end;
  if not ok or has_perm('events.view') or not has_perm('users.view') then raise exception 'GAGAL: batas izin analis'; end if;
  raise notice 'LULUS analis: tanpa events.view ditolak pencarian; users.view tetap ada';
  execute 'reset role';

  -- ===== Nonaktif / kedaluwarsa memutus akses =====
  update admin_staff set active=false where user_id=e;
  perform set_config('request.jwt.claim.sub',e::text,true); perform set_config('request.jwt.claims',json_build_object('sub',e,'role','authenticated')::text,true); execute 'set local role authenticated';
  if has_perm('events.view') then raise exception 'GAGAL: akun nonaktif masih punya izin'; end if; execute 'reset role';
  update admin_staff set active=true, expires_at=now()-interval '1 minute' where user_id=e;
  perform set_config('request.jwt.claim.sub',e::text,true); perform set_config('request.jwt.claims',json_build_object('sub',e,'role','authenticated')::text,true); execute 'set local role authenticated';
  if has_perm('events.view') then raise exception 'GAGAL: akun kedaluwarsa masih punya izin'; end if; execute 'reset role';
  raise notice 'LULUS nonaktif dan kedaluwarsa memutus akses seketika';
  raise notice '=== SEMUA TES LULUS ===';
end $$;
rollback;
