-- GWM: tambah kota-kota besar, kategori Pameran, dan kolom teks Inggris.
-- Jalankan di Supabase > SQL Editor. Aman dijalankan ulang.

insert into categories values ('pameran','Pameran') on conflict do nothing;

-- Kolom opsional untuk versi Inggris (dipakai situs /en bila terisi)
alter table events add column if not exists title_en text, add column if not exists description_en text;

insert into provinces(name) values
  ('DKI Jakarta'),
  ('Banten'),
  ('Jawa Barat'),
  ('Jawa Tengah'),
  ('DI Yogyakarta'),
  ('Jawa Timur'),
  ('Bali'),
  ('Sumatera Utara'),
  ('Sumatera Barat'),
  ('Riau'),
  ('Kepulauan Riau'),
  ('Sumatera Selatan'),
  ('Lampung'),
  ('Aceh'),
  ('Kalimantan Timur'),
  ('Kalimantan Selatan'),
  ('Kalimantan Barat'),
  ('Sulawesi Selatan'),
  ('Sulawesi Utara'),
  ('Nusa Tenggara Barat')
on conflict (name) do nothing;

insert into cities(province_id,name,slug)
select p.id,v.city,v.slug from (values
  ('DKI Jakarta','Jakarta','jakarta'),
  ('Banten','Tangerang','tangerang'),
  ('Banten','Tangerang Selatan','tangerang-selatan'),
  ('Banten','Serang','serang'),
  ('Jawa Barat','Bandung','bandung'),
  ('Jawa Barat','Cimahi','cimahi'),
  ('Jawa Barat','Bogor','bogor'),
  ('Jawa Barat','Bekasi','bekasi'),
  ('Jawa Barat','Depok','depok'),
  ('Jawa Barat','Karawang','karawang'),
  ('Jawa Barat','Cirebon','cirebon'),
  ('Jawa Barat','Tasikmalaya','tasikmalaya'),
  ('Jawa Tengah','Semarang','semarang'),
  ('Jawa Tengah','Solo','solo'),
  ('DI Yogyakarta','Yogyakarta','yogyakarta'),
  ('Jawa Timur','Surabaya','surabaya'),
  ('Jawa Timur','Malang','malang'),
  ('Jawa Timur','Sidoarjo','sidoarjo'),
  ('Bali','Denpasar','denpasar'),
  ('Bali','Badung','badung'),
  ('Bali','Gianyar','gianyar'),
  ('Sumatera Utara','Medan','medan'),
  ('Sumatera Barat','Padang','padang'),
  ('Riau','Pekanbaru','pekanbaru'),
  ('Kepulauan Riau','Batam','batam'),
  ('Sumatera Selatan','Palembang','palembang'),
  ('Lampung','Bandar Lampung','bandar-lampung'),
  ('Aceh','Banda Aceh','banda-aceh'),
  ('Kalimantan Timur','Balikpapan','balikpapan'),
  ('Kalimantan Timur','Samarinda','samarinda'),
  ('Kalimantan Selatan','Banjarmasin','banjarmasin'),
  ('Kalimantan Barat','Pontianak','pontianak'),
  ('Sulawesi Selatan','Makassar','makassar'),
  ('Sulawesi Utara','Manado','manado'),
  ('Nusa Tenggara Barat','Mataram','mataram')
) as v(prov,city,slug) join provinces p on p.name=v.prov
on conflict (slug) do nothing;
