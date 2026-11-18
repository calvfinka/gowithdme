-- GWM monetisasi & discovery foundation (aman diulang)
-- Jalankan di Supabase SQL Editor setelah schema dasar.

-- Kolom event untuk listing berbayar / featured / sponsor
alter table events
  add column if not exists is_featured boolean not null default false,
  add column if not exists featured_until date,
  add column if not exists sponsor_label text,
  add column if not exists boost_score int not null default 0,
  add column if not exists affiliate_note text;

comment on column events.is_featured is 'Tampil di slot Featured / Disorot (admin atau paket berbayar)';
comment on column events.featured_until is 'Batas tanggal tampil sebagai featured (null = selama status published)';
comment on column events.sponsor_label is 'Label sponsor yang ditampilkan di kartu, mis. "Partner resmi"';
comment on column events.boost_score is 'Skor urutan tambahan (lebih tinggi = lebih atas dalam daftar)';
comment on column events.affiliate_note is 'Catatan internal affiliate / partner tiket (tidak publik)';

-- Index untuk query cepat featured
create index if not exists events_featured_idx
  on events (is_featured, boost_score desc, event_date)
  where status = 'published' and is_featured = true;

-- View publik event yang sedang featured (untuk home & listing)
create or replace view events_featured as
select e.*, c.name as city_name
from events e
left join cities c on c.id = e.city_id
where e.status = 'published'
  and e.is_featured = true
  and (e.featured_until is null or e.featured_until >= (now() at time zone 'Asia/Jakarta')::date)
  and coalesce(e.end_date, e.event_date) >= (now() at time zone 'Asia/Jakarta')::date
order by e.boost_score desc, e.event_date asc;

-- Izinkan baca view (RLS view mengikuti kebijakan events)
grant select on events_featured to anon, authenticated;

-- Tabel sederhana untuk paket sponsor / lead (admin catat manual dulu; integrasi payment nanti)
create table if not exists sponsorship_leads (
  id uuid primary key default gen_random_uuid(),
  organizer_name text not null,
  contact_email text,
  contact_wa text,
  event_title text,
  package text,           -- 'featured' | 'home_banner' | 'newsletter' | 'custom'
  budget_note text,
  status text not null default 'new' check (status in ('new','contacted','won','lost')),
  notes text,
  created_at timestamptz default now()
);

alter table sponsorship_leads enable row level security;
-- Hanya admin (lewat service role / RPC) yang boleh baca/tulis; anon tidak
create policy "admin only sponsorship" on sponsorship_leads
  for all using (false);

-- RPC aman untuk publik: kirim lead sponsor (rate-limited di aplikasi)
create or replace function submit_sponsor_lead(
  p_name text, p_email text, p_wa text, p_title text, p_package text, p_budget text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  nid uuid;
begin
  if length(trim(coalesce(p_name,''))) < 2 then
    raise exception 'Nama penyelenggara wajib diisi';
  end if;
  insert into sponsorship_leads(organizer_name, contact_email, contact_wa, event_title, package, budget_note)
  values (
    left(trim(p_name), 120),
    left(nullif(trim(p_email),''), 120),
    left(nullif(trim(p_wa),''), 30),
    left(nullif(trim(p_title),''), 200),
    left(nullif(trim(p_package),''), 40),
    left(nullif(trim(p_budget),''), 200)
  ) returning id into nid;
  return nid;
end $$;

grant execute on function submit_sponsor_lead to anon, authenticated;

-- Helper: set featured (hanya dipanggil dari admin dengan role check di app)
create or replace function admin_set_featured(
  p_id uuid, p_on boolean, p_until date default null, p_label text default null, p_boost int default 0
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Hanya admin';
  end if;
  update events set
    is_featured = coalesce(p_on, false),
    featured_until = p_until,
    sponsor_label = nullif(trim(p_label), ''),
    boost_score = coalesce(p_boost, 0)
  where id = p_id;
end $$;

grant execute on function admin_set_featured to authenticated;
