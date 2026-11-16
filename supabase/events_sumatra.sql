-- GWM: event Sumatra yang belum ada di situs (data per 17 Nov 2026). Jalankan di Supabase > SQL Editor.
-- Prasyarat: schema.sql, schema_tahap2.sql, schema_admin.sql, schema_kota.sql sudah dijalankan.
-- Aman dijalankan ulang. Sumber: infokonser.id (tautan di kolom ticket_url) dan akun @infokonsermedan_. Cek ulang jadwal/harga di penjual tiket.
-- Harga NULL = belum diumumkan (tampil "Info menyusul"). Poster NULL = tampil gradien GWM; unggah poster resmi lewat admin.
-- Kota baru (Jambi, Karimun, Dharmasraya) juga sudah ditambahkan di js/regions.js.

insert into provinces(name) values ('Jambi') on conflict (name) do nothing;

insert into cities(province_id,name,slug)
select p.id,v.n,v.s from (values
  ('Jambi','Jambi','jambi'),
  ('Kepulauan Riau','Karimun','karimun'),
  ('Sumatera Barat','Dharmasraya','dharmasraya')
) as v(prov,n,s) join provinces p on p.name=v.prov
on conflict (slug) do nothing;

insert into events(title,slug,category,city_id,venue,event_date,end_date,price_label,genre,lineup,description,poster_url,ticket_url,status)
select v.title,v.slug,v.category,c.id,v.venue,v.d::date,v.e::date,v.price,v.genre,v.lineup,v.descr,v.poster,v.ticket,'published'
from (values
 ('Soundrenaline Live in Medan 2026','soundrenaline-live-medan-2026','konser','medan','Lapangan Parkir Lotte Grosir, Medan','2026-12-06',null,null,'Festival multi-genre','Bernadya, Barasuara',
  'Festival musik di Medan. Pengisi acara yang diumumkan: Bernadya dan Barasuara. Harga tiket belum diumumkan; penjualan lewat Goers menurut unggahan penyelenggara.',
  null,'https://infokonser.id/artis/bernadya'),
 ('Songket Sonic 2026','songket-sonic-karimun-2026','konser','karimun','Hakafe Coastal Area, Kabupaten Karimun','2026-11-21',null,'Mulai Rp100.000',null,null,
  'Festival musik di kawasan pesisir Karimun, Kepulauan Riau.',
  null,'https://infokonser.id/konser/songket-sonic-2026'),
 ('[Jambi] Hiburan Rakyat Batak #2','hiburan-rakyat-batak-2-jambi-2026','konser','jambi','Ev Garden, Jambi','2026-11-20',null,null,'Hiburan rakyat',null,
  'Pertunjukan hiburan rakyat Batak di Jambi, seri kedua. Harga tiket belum diumumkan.',
  null,'https://infokonser.id/konser/jambi-hiburan-rakyat-batak-2'),
 ('Konser King Nassar 19th Kampus Undhari','konser-king-nassar-19th-undhari-2026','konser','dharmasraya','Universitas Dharmas Indonesia, Kabupaten Dharmasraya','2026-11-18',null,'Mulai Rp10.000','Dangdut / Pop daerah','King Nassar',
  'Konser di kampus Universitas Dharmas Indonesia, Dharmasraya, Sumatera Barat.',
  null,'https://infokonser.id/konser/konser-king-nassar-19th-kampus-undhari')
) as v(title,slug,category,city,venue,d,e,price,genre,lineup,descr,poster,ticket)
join cities c on c.slug=v.city
on conflict (slug) do nothing;

-- Cek hasil:
-- select e.title, c.name kota, e.event_date, e.price_label from events e join cities c on c.id=e.city_id where e.slug in ('soundrenaline-live-medan-2026','songket-sonic-karimun-2026','hiburan-rakyat-batak-2-jambi-2026','konser-king-nassar-19th-undhari-2026');
