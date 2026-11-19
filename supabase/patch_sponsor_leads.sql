-- GWM: formulir "Promote" -> tabel sponsorship_leads -> tab "Sponsor" di admin.
-- Aman dijalankan berulang. Jalankan SETELAH schema_monetisasi.sql dan schema_tahap2.sql (butuh is_admin()).
-- Tabel tetap tertutup untuk aplikasi (RLS menolak semua); pengunjung hanya lewat submit_sponsor_lead,
-- admin hanya lewat admin_list_sponsor_leads / admin_update_sponsor_lead.

alter table sponsorship_leads
  add column if not exists order_code    text,
  add column if not exists city          text,
  add column if not exists weeks         int,
  add column if not exists est_total_idr bigint,
  add column if not exists updated_at    timestamptz,
  add column if not exists handled_by    uuid,
  add column if not exists paid_at       timestamptz,   -- diisi saat admin menandai sudah dibayar (pembayaran manual)
  add column if not exists paid_idr      bigint,        -- nominal yang benar-benar diterima
  add column if not exists invoice_no    text,
  add column if not exists event_id      uuid,          -- event yang diaktifkan sebagai Featured untuk lead ini
  add column if not exists featured_at   timestamptz;

create unique index if not exists sponsorship_leads_code_uq on sponsorship_leads (order_code) where order_code is not null;
create index if not exists sponsorship_leads_status_idx on sponsorship_leads (status, created_at desc);

alter table sponsorship_leads enable row level security;
drop policy if exists "admin only sponsorship" on sponsorship_leads;
create policy "admin only sponsorship" on sponsorship_leads for all using (false);

-- Versi lama (6 argumen, mengembalikan uuid) dihapus agar tidak ada dua fungsi bernama sama.
drop function if exists submit_sponsor_lead(text, text, text, text, text, text);

create or replace function submit_sponsor_lead(
  p_name    text,
  p_email   text,
  p_wa      text,
  p_title   text,
  p_package text,
  p_budget  text,
  p_city    text default null,
  p_weeks   int  default null,
  p_total   bigint default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_name  text := left(trim(coalesce(p_name, '')), 120);
  v_title text := left(trim(coalesce(p_title, '')), 200);
  v_pkg   text := lower(trim(coalesce(p_package, '')));
  v_email text := left(nullif(trim(coalesce(p_email, '')), ''), 120);
  v_wa    text := regexp_replace(coalesce(p_wa, ''), '[^0-9]', '', 'g');
  v_city  text := left(nullif(trim(coalesce(p_city, '')), ''), 80);
  v_code  text;
  v_pref  text;
  v_id    uuid;
  tries   int := 0;
begin
  if length(v_name) < 2 then raise exception 'Nama penyelenggara wajib diisi'; end if;
  if length(v_title) < 2 then raise exception 'Judul event/kampanye wajib diisi'; end if;
  if v_pkg not in ('free', 'city_spotlight', 'national_portal') then raise exception 'Paket tidak dikenal'; end if;

  -- nomor WA: 08xx / 8xx / 62xx / +62xx -> 62xx, harus nomor seluler Indonesia
  if v_wa <> '' then
    if left(v_wa, 1) = '0' then v_wa := '62' || substr(v_wa, 2);
    elsif left(v_wa, 1) = '8' then v_wa := '62' || v_wa; end if;
    if v_wa !~ '^628[0-9]{8,11}$' then raise exception 'Nomor WhatsApp tidak valid'; end if;
  else
    v_wa := null;
  end if;
  if v_email is not null and v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Email tidak valid'; end if;
  if v_wa is null and v_email is null then raise exception 'Isi nomor WhatsApp atau email'; end if;

  -- batas kiri-kanan angka agar tidak bisa dipakai menyimpan data aneh
  if p_weeks is not null and (p_weeks < 1 or p_weeks > 12) then raise exception 'Durasi tidak valid'; end if;
  if p_total is not null and (p_total < 0 or p_total > 1000000000) then raise exception 'Total tidak valid'; end if;

  -- pembatas laju: kontak yang sama maks. 5 permintaan per jam, seluruh situs maks. 300 per jam
  if (select count(*) from sponsorship_leads
        where created_at > now() - interval '1 hour'
          and ((v_wa is not null and contact_wa = v_wa) or (v_email is not null and lower(contact_email) = lower(v_email)))) >= 5 then
    raise exception 'Terlalu banyak permintaan dari kontak ini. Coba lagi satu jam lagi';
  end if;
  if (select count(*) from sponsorship_leads where created_at > now() - interval '1 hour') >= 300 then
    raise exception 'Terlalu banyak permintaan. Coba lagi nanti';
  end if;

  -- kode order dibuat server, acak, dan dijamin unik
  v_pref := 'GWM-' || coalesce(nullif(left(upper(regexp_replace(coalesce(v_city, ''), '[^a-zA-Z]', '', 'g')), 3), ''), 'IDN')
            || '-' || case v_pkg when 'national_portal' then 'NAT' when 'city_spotlight' then 'CTY' else 'FRE' end || '-';
  loop
    v_code := v_pref || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from sponsorship_leads where order_code = v_code);
    tries := tries + 1;
    if tries > 8 then raise exception 'Gagal membuat kode order, coba lagi'; end if;
  end loop;

  insert into sponsorship_leads(organizer_name, contact_email, contact_wa, event_title, package, budget_note,
                                order_code, city, weeks, est_total_idr)
  values (v_name, v_email, v_wa, v_title, v_pkg, left(nullif(trim(coalesce(p_budget, '')), ''), 300),
          v_code, v_city, p_weeks, p_total)
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'code', v_code);
end $$;

revoke all on function submit_sponsor_lead(text, text, text, text, text, text, text, int, bigint) from public;
grant execute on function submit_sponsor_lead(text, text, text, text, text, text, text, int, bigint) to anon, authenticated;

-- Admin: daftar lead (terbaru dulu), boleh disaring status.
create or replace function admin_list_sponsor_leads(p_status text default null, p_limit int default 200)
returns setof sponsorship_leads language plpgsql security definer stable set search_path = public as $$
begin
  if not is_admin() then raise exception 'Hanya admin.'; end if;
  return query
    select * from sponsorship_leads
    where p_status is null or p_status = '' or status = p_status
    order by created_at desc
    limit greatest(1, least(coalesce(p_limit, 200), 500));
end $$;

-- Admin: ubah status, catatan, dan data pembayaran manual. Parameter NULL = tidak diubah.
-- p_paid: true = tandai sudah dibayar (paid_at = sekarang bila belum ada), false = batalkan.
drop function if exists admin_update_sponsor_lead(uuid, text, text);
create or replace function admin_update_sponsor_lead(
  p_id uuid, p_status text, p_notes text default null,
  p_paid boolean default null, p_invoice text default null, p_paid_idr bigint default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Hanya admin.'; end if;
  if p_status not in ('new', 'contacted', 'won', 'lost') then raise exception 'Status tidak valid'; end if;
  if p_paid_idr is not null and (p_paid_idr < 0 or p_paid_idr > 1000000000) then raise exception 'Nominal tidak valid'; end if;
  update sponsorship_leads
     set status = p_status,
         notes = case when p_notes is null then notes else nullif(left(trim(p_notes), 1000), '') end,
         invoice_no = case when p_invoice is null then invoice_no else nullif(left(trim(p_invoice), 60), '') end,
         paid_idr = case when p_paid is false then null when p_paid_idr is null then paid_idr else p_paid_idr end,
         paid_at = case when p_paid is true then coalesce(paid_at, now()) when p_paid is false then null else paid_at end,
         updated_at = now(),
         handled_by = auth.uid()
   where id = p_id;
  if not found then raise exception 'Lead tidak ditemukan'; end if;
end $$;

-- Admin: aktifkan Featured untuk sebuah event atas nama lead, sekaligus menandai lead "won". Satu transaksi.
create or replace function admin_activate_sponsor(
  p_lead uuid, p_event uuid, p_until date, p_label text default null, p_boost int default 0
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Hanya admin.'; end if;
  if p_until is null or p_until < (now() at time zone 'Asia/Jakarta')::date then raise exception 'Tanggal akhir tayang tidak valid'; end if;
  perform 1 from sponsorship_leads where id = p_lead;
  if not found then raise exception 'Lead tidak ditemukan'; end if;
  update events set is_featured = true, featured_until = p_until,
         sponsor_label = nullif(left(trim(coalesce(p_label, '')), 40), ''),
         boost_score = greatest(0, least(coalesce(p_boost, 0), 100))
   where id = p_event;
  if not found then raise exception 'Event tidak ditemukan'; end if;
  update sponsorship_leads set event_id = p_event, featured_at = now(), status = 'won',
         updated_at = now(), handled_by = auth.uid()
   where id = p_lead;
end $$;

revoke all on function admin_list_sponsor_leads(text, int), admin_update_sponsor_lead(uuid, text, text, boolean, text, bigint),
  admin_activate_sponsor(uuid, uuid, date, text, int) from public, anon;
grant execute on function admin_list_sponsor_leads(text, int), admin_update_sponsor_lead(uuid, text, text, boolean, text, bigint),
  admin_activate_sponsor(uuid, uuid, date, text, int) to authenticated;
