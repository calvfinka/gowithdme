-- GoWithDME sesi 1: Bali dan Nusa Tenggara (data per 17 Nov 2026). Jalankan di Supabase > SQL Editor.
-- Prasyarat: schema.sql, schema_tahap2.sql, schema_admin.sql, schema_kota.sql sudah dijalankan.
-- Aman dijalankan ulang. Sumber: Dinas Pariwisata Bali (disparda.baliprov.go.id), RRI, kalender event Lombok (lihat ticket_url).
-- Ketiga event ini festival budaya/pariwisata, bukan konser berbayar, jadi dimasukkan ke kategori 'pameran'.
-- Harga NULL = belum diumumkan (tampil "Info menyusul"). Poster NULL = tampil gradien GoWithDME; unggah poster resmi lewat admin.
-- Kota baru (Lombok Barat, Lombok Tengah) juga sudah ditambahkan di js/regions.js.

insert into cities(province_id,name,slug)
select p.id,v.n,v.s from (values
  ('Nusa Tenggara Barat','Lombok Barat','lombok-barat'),
  ('Nusa Tenggara Barat','Lombok Tengah','lombok-tengah')
) as v(prov,n,s) join provinces p on p.name=v.prov
on conflict (slug) do nothing;

insert into events(title,slug,category,city_id,venue,event_date,end_date,price_label,genre,lineup,description,poster_url,ticket_url,status)
select v.title,v.slug,v.category,c.id,v.venue,v.d::date,v.e::date,v.price,v.genre,v.lineup,v.descr,v.poster,v.ticket,'published'
from (values
 ('Denpasar Festival 2026','denpasar-festival-2026','pameran','denpasar','Monumen Catur Muka, Denpasar','2026-12-01','2026-12-31',null,null,null,
  'Festival tahunan Kota Denpasar sepanjang Desember. Jam kegiatan 08.30–16.30 WITA di Monumen Catur Muka. Info harga masuk belum diumumkan.',
  null,'https://disparda.baliprov.go.id/event/denpasar-festival'),
 ('Mandalika International Festival 2026','mandalika-international-festival-2026','pameran','lombok-tengah','Kawasan Mandalika, Lombok Tengah','2026-12-10','2026-12-13',null,null,null,
  'Festival pariwisata dan budaya di Mandalika. Jadwal sempat diundur dari 22–25 Oktober ke 10–13 Desember; cek ulang ke penyelenggara sebelum berangkat.',
  null,'https://lomboktravelutions.com/kalender-event-lombok-2026/'),
 ('Festival Perang Topat 2026','festival-perang-topat-2026','pameran','lombok-barat','Pura Lingsar, Lingsar, Lombok Barat','2026-12-27',null,null,null,null,
  'Tradisi dan festival budaya Perang Topat di Lingsar, Lombok Barat, tercantum dalam Calendar of Event NTB 2026. Harga masuk belum diumumkan.',
  null,'https://rri.co.id/mataram/wisata/2296823/ntb-luncurkan-69-event-pariwisata-sepanjang-2026')
) as v(title,slug,category,city,venue,d,e,price,genre,lineup,descr,poster,ticket)
join cities c on c.slug=v.city
on conflict (slug) do nothing;

-- Cek hasil:
-- select e.title, c.name kota, e.event_date from events e join cities c on c.id=e.city_id where e.slug in ('denpasar-festival-2026','mandalika-international-festival-2026','festival-perang-topat-2026');
