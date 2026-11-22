-- GoWithDME: event mendatang (data per 16 Nov 2026). Jalankan di Supabase > SQL Editor.
-- Prasyarat: schema.sql, schema_tahap2.sql, schema_admin.sql, schema_kota.sql sudah dijalankan.
-- Aman dijalankan ulang (slug yang sudah ada dilewati).
-- Sumber: berita & situs resmi/penjual tiket (lihat kolom ticket_url dan deskripsi). Cek ulang jadwal/harga sebelum tayang.
-- poster_url hanya diisi bila ada URL gambar yang benar-benar ditemukan; sisanya NULL (tampil gradien GoWithDME).
-- Poster milik penyelenggara: minta izin, atau unggah poster sendiri lewat admin (bucket "posters").

-- Kota tambahan (juga tambahkan di js/regions.js)
insert into cities(province_id,name,slug)
select p.id,'Ponorogo','ponorogo' from provinces p where p.name='Jawa Timur'
on conflict (slug) do nothing;

insert into events(title,slug,category,city_id,venue,event_date,end_date,price_label,genre,lineup,description,poster_url,ticket_url,status)
select v.title,v.slug,v.category,c.id,v.venue,v.d::date,v.e::date,v.price,v.genre,v.lineup,v.descr,v.poster,v.ticket,'published'
from (values
 -- ===== KONSER =====
 ('Guns N'' Roses World Tour 2026 – Jakarta','guns-n-roses-jakarta-2026','konser','jakarta','Stadion Madya GBK, Senayan','2026-11-21',null,'Rp1.750.000 – Rp3.750.000','Rock',null,
  'Konser band rock legendaris Amerika Serikat di Jakarta. Harga yang dilaporkan untuk kategori yang masih tersisa; cek situs resmi untuk ketersediaan.',null,'https://gnrjakarta.com/'),
 ('D.O. (EXO) – DAY OFF Jakarta','do-day-off-jakarta-2026','konser','jakarta','Istora Senayan','2026-11-21','2026-11-22','Mulai Rp1.350.000','Pop / R&B','D.O. (Doh Kyung-soo)',
  'Konser solo D.O. dua hari di Istora Senayan. Kategori tiket: CAT 1–4 dan Special Day Package.',null,'https://dohkyungsoojakarta2026.com/'),
 ('My Chemical Romance Live in Jakarta 2026','my-chemical-romance-jakarta-2026','konser','jakarta','Jakarta International Stadium (JIS), Jakarta Utara','2026-11-22',null,'Cek harga di situs tiket','Emo / Alternative rock','My Chemical Romance',
  'Konser solo My Chemical Romance, membawakan era The Black Parade. Harga bervariasi menurut kategori dan kanal penjualan.',
  'https://cdn.jadwal.events/events/2026/06/01KW2RGWWKNK5DFPP0JVXRPSGS.webp','https://jadwal.events/e/my-chemical-romance-live-in-jakarta-2026'),
 ('Josjis Fest Vol.2','josjis-fest-vol-2-2026','konser','ponorogo','Alun-Alun Ponorogo','2026-11-22',null,'Mulai Rp89.000',null,null,
  'Festival musik di Alun-Alun Ponorogo, Jawa Timur.',
  'https://cdn.jadwal.events/events/2026/09/01M28NC8GRS3XXC3AQ6FWXQ0SQ.webp','https://jadwal.events/e/josjis-fest-vol2'),
 ('Simple Plan – Bigger Than You Think! Tour (Jakarta)','simple-plan-jakarta-2026','konser','jakarta','Tennis Indoor Senayan','2026-11-27',null,'Mulai Rp850.000','Pop-punk','Simple Plan, LØLØ (special guest)',
  'Tur perayaan 25 tahun Simple Plan. Harga sekitar Rp850.000–Rp1.950.000 sebelum pajak dan biaya layanan.',null,'https://simpleplanindonesia.com/'),
 ('Simple Plan – Bigger Than You Think! Tour (Surabaya)','simple-plan-surabaya-2026','konser','surabaya','Jatim Expo, Surabaya','2026-11-28',null,'Mulai Rp850.000','Pop-punk','Simple Plan, LØLØ (special guest)',
  'Pemberhentian terakhir tur Simple Plan di Indonesia sebelum ke Hong Kong.',null,'https://simpleplanindonesia.com/'),
 ('Kings of Convenience – Jakarta','kings-of-convenience-jakarta-2026','konser','jakarta','JIExpo Convention Centre & Theater, Kemayoran','2026-11-28','2026-11-29','Info menyusul','Indie folk','Kings of Convenience',
  'Duo indie folk asal Norwegia tampil dua hari di Jakarta. Cek kanal resmi penyelenggara untuk tiket.',null,null),
 ('BOYNEXTDOOR Tour Knock On Vol.2 – Tangerang','boynextdoor-tangerang-2026','konser','tangerang','ICE BSD City','2026-12-05',null,'Info menyusul','K-pop','BOYNEXTDOOR',
  'Konser boy group K-pop BOYNEXTDOOR di ICE BSD City.',null,null),
 ('5 Seconds of Summer – Everyone''s a Star! World Tour','5sos-jakarta-2026','konser','jakarta','Indonesia Arena, Kompleks GBK','2026-12-06',null,'Cek kategori di situs resmi','Pop rock','5 Seconds of Summer',
  'Pertunjukan tambahan (encore) setelah tiket show pertama habis dalam waktu singkat.',null,'https://5sosjakarta.com/'),
 ('Djakarta Warehouse Project (DWP) 2026','dwp-2026','konser','jakarta','JIExpo Kemayoran','2026-12-11','2026-12-13','Mulai Rp850.000','EDM','Alok, Afrojack, R3HAB, Axwell, Sebastian Ingrosso, Dimitri Vegas, Dimension',
  'Festival musik elektronik tahunan tiga hari di Jakarta. Line-up dapat berubah.',null,null),
 ('Dimash Qudaibergen – DIMENSIONS World Tour','dimash-dimensions-bogor-2026','konser','bogor','Sentul International Convention Center (SICC), Kab. Bogor','2026-12-12',null,'Rp850.000 – Rp8.700.000','Pop / Klasik crossover','Dimash Qudaibergen',
  'Konser solo perdana penyanyi asal Kazakhstan di Indonesia.',null,'https://dqdimensionsworldtourina.com/'),

 -- ===== PAMERAN: Gaikindo Auto Week 2026 (10 kota) =====
 ('Gaikindo Auto Week 2026 – ICE BSD','gaikindo-auto-week-2026-tangerang','pameran','tangerang','ICE BSD City','2026-11-20','2026-11-29',null,null,null,
  'Pameran otomotif akhir tahun di area 90.000 m2: lebih dari 65 merek kendaraan, test drive, simulator balap, kompetisi diecast, dan pameran campervan.',null,null),
 ('Gaikindo Auto Week 2026 – Bali','gaikindo-auto-week-2026-denpasar','pameran','denpasar','Living World Denpasar','2026-11-25','2026-11-29',null,null,null,
  'Seri regional Gaikindo Auto Week dengan 12 merek peserta.',null,null),
 ('Gaikindo Auto Week 2026 – Balikpapan','gaikindo-auto-week-2026-balikpapan','pameran','balikpapan','e-Walk Mall Balikpapan Superblock','2026-11-25','2026-11-29',null,null,null,
  'Seri regional Gaikindo Auto Week dengan 9 merek peserta.',null,null),
 ('Gaikindo Auto Week 2026 – Bandung','gaikindo-auto-week-2026-bandung','pameran','bandung','Summarecon Mall Bandung','2026-11-25','2026-11-29',null,null,null,
  'Seri regional Gaikindo Auto Week dengan 10 merek peserta.',null,null),
 ('Gaikindo Auto Week 2026 – Makassar','gaikindo-auto-week-2026-makassar','pameran','makassar','Trans Studio Mall Makassar','2026-11-25','2026-11-29',null,null,null,
  'Seri regional Gaikindo Auto Week dengan 10 merek peserta.',null,null),
 ('Gaikindo Auto Week 2026 – Medan','gaikindo-auto-week-2026-medan','pameran','medan','Sun Plaza Medan','2026-11-25','2026-11-29',null,null,null,
  'Seri regional Gaikindo Auto Week di Medan.',null,null),
 ('Gaikindo Auto Week 2026 – Palembang','gaikindo-auto-week-2026-palembang','pameran','palembang','Palembang Icon Mall','2026-11-25','2026-11-29',null,null,null,
  'Seri regional Gaikindo Auto Week dengan 12 merek peserta.',null,null),
 ('Gaikindo Auto Week 2026 – Semarang','gaikindo-auto-week-2026-semarang','pameran','semarang','23 Mall Semarang','2026-11-25','2026-11-29',null,null,null,
  'Seri regional Gaikindo Auto Week di Semarang. Nama lokasi mengikuti pemberitaan; cek ulang nama mal di kanal resmi.',null,null),
 ('Gaikindo Auto Week 2026 – Solo','gaikindo-auto-week-2026-solo','pameran','solo','The Park Mall Solo Baru','2026-11-25','2026-11-29',null,null,null,
  'Seri regional Gaikindo Auto Week dengan 11 merek peserta.',null,null),
 ('Gaikindo Auto Week 2026 – Surabaya','gaikindo-auto-week-2026-surabaya','pameran','surabaya','Pakuwon Mall Surabaya','2026-11-25','2026-11-29',null,null,null,
  'Seri regional Gaikindo Auto Week dengan 10 merek peserta.',null,null)
) as v(title,slug,category,city,venue,d,e,price,genre,lineup,descr,poster,ticket)
join cities c on c.slug=v.city
on conflict (slug) do nothing;

-- Cek hasil:
-- select e.title, c.name kota, e.event_date, e.poster_url is not null as ada_poster, e.ticket_url from events e join cities c on c.id=e.city_id where e.slug in (...) order by e.event_date;
