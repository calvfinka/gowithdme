-- GoWithDME: 9 event Bandung (20-24 Nov 2026) yang belum ada di web, non-konser + 1 konser gratis.
-- Jalankan di Supabase > SQL Editor. Aman diulang (slug sama = diperbarui, tidak dobel).
-- Prasyarat: schema.sql, schema_kota.sql, events_goers_draft.sql (kategori festival/lainnya), schema_komunitas.sql (kolom organizer).
-- Sumber: infobdg.com (dicek 20 Nov 2026) + akun IG resmi penyelenggara. Tidak semua event punya link tiket:
-- event gratis memakai link IG resmi sebagai ticket_url. Poster = gambar asli dari infobdg.com (tanpa parameter ukuran).
-- Tidak dimasukkan (tidak terbukti di Bandung / belum ada sumber): Di Kota Hari Ini (Karawang), Nyanyian Fest 13 Des
-- (Subang/Majalengka), Resonance/Sonic Bloom x Bomber The Last Session, Hari Wayang Nasional - Genta Sentramas.

-- Kota Bandung Barat (untuk FESTARA di Kota Baru Parahyangan) kalau belum ada
insert into cities(province_id,name,slug)
select p.id,'Bandung Barat','bandung-barat' from provinces p where p.name='Jawa Barat'
on conflict (slug) do nothing;

insert into events(title,slug,category,city_id,venue,event_date,end_date,price_label,genre,lineup,organizer,description,poster_url,ticket_url,source_ig,status)
select v.title,v.slug,v.category,c.id,v.venue,v.d::date,v.e::date,v.price,v.genre,v.lineup,v.org,v.descr,v.poster,v.ticket,v.ig,'published'
from (values

 ('Bandung Fair 2026','bandung-fair-2026-laswi-heritage','festival','bandung',
  'Laswi Heritage, Bandung','2026-11-20','2026-11-22','Gratis (kuota terbatas)','UMKM & Komunitas',null,
  'Dinas Koperasi dan UKM Kota Bandung',
  'Tiga hari seru-seruan bareng UMKM, komunitas, dan pelaku kreatif Bandung di Laswi Heritage, Jumat–Minggu 20–22 November 2026. Ada Rame Rame Market (brand fashion lokal kurasi), Digitala, Jalaria, Rumaksa, Sawala Rasa, area komunitas, zona Bandung Utama Zero Waste, kuliner lokal, serta pertunjukan musik dan seni. Masuk gratis tetapi kuota terbatas: pesan tiket free entry lewat link di bio IG @bdgfair.',
  'https://i0.wp.com/www.infobdg.com/v2/wp-content/uploads/2026/11/poster-bandung-fair-2026-laswi-heritage.jpg',
  'https://www.instagram.com/bdgfair/','bdgfair'),

 ('Weekend For Love 32','weekend-for-love-32-gaya-brasserie','festival','bandung',
  'Gaya Brasserie, Bandung','2026-11-20','2026-11-22','Info menyusul','Bazar & Fashion',null,
  'Weekend For Love',
  'Bazar local brand dan preloved di Gaya Brasserie, Jumat–Minggu 20–22 November 2026 pukul 11.00–20.30 WIB. Diikuti sekitar belasan tenant seperti Vintage House, Pukka Official, Bling It On, Fit You Outfit, SDS Kids, Anka Nara, Lunete, Shareeka, Ginaire, Clothinery, Louvy Co, dan Cerita Lemari, plus penjual preloved. Promo diskon 20% di Gaya Brasserie untuk pengunjung yang bawa tas belanja sendiri (min. belanja Rp100.000 per transaksi).',
  'https://i0.wp.com/www.infobdg.com/v2/wp-content/uploads/2026/11/poster-weekend-for-love-32-gaya-brasserie-2026.jpg',
  'https://www.instagram.com/weekendforl0ve/','weekendforl0ve'),

 ('FESTARA 2026 Book Fair','festara-2026-book-fair-bandung-barat','pameran','bandung-barat',
  'Bale Pare, Kota Baru Parahyangan, Kabupaten Bandung Barat','2026-11-20','2026-11-22','Buku mulai Rp5.000','Pameran Buku',null,
  'Festival Literasi KBB',
  'Pameran dan bursa buku murah di Bale Pare, Kota Baru Parahyangan, Jumat–Minggu 20–22 November 2026 mulai pukul 09.00 WIB. Lebih dari 3.000 judul dari puluhan penerbit, harga buku mulai Rp5.000, ditambah diskusi buku, public talk, stand-up comedy (Big Dado), 20+ stan kuliner, lomba mewarnai dan tari tradisional, peluncuran buku, pertunjukan wayang, dan workshop aksara Sunda.',
  null,
  'https://www.instagram.com/festival.literasi.kbb/','festival.literasi.kbb'),

 ('DCDC Lavitsef: Recall The Scene','dcdc-lavitsef-recall-the-scene-2026','konser','bandung',
  'Cikapundung River Spot, Jl. Ir. H. Soekarno, Bandung','2026-11-21','2026-11-21','Cek info resmi','Indie / Alternatif',
  'Teenage Death Star, Stand Here Alone, Momonon, The Milo, Alone At Last',
  'DCDC',
  'Pertunjukan musik Recall The Scene di Cikapundung River Spot, Sabtu 21 November 2026, menampilkan Teenage Death Star, Stand Here Alone, Momonon, The Milo, dan Alone At Last, ditambah pameran seni. Akses lewat QR code di poster resmi; cek akun IG @dcdc.official untuk jam dan syarat masuk.',
  'https://i0.wp.com/www.infobdg.com/v2/wp-content/uploads/2026/11/poster-dcdc-lavitsef-2026.jpg',
  'https://www.instagram.com/dcdc.official/','dcdc.official'),

 ('Nyawang Bulan Edisi November 2026','nyawang-bulan-kasepuhan-bunisari-2026-11','festival','bandung',
  'Kasepuhan Bunisari, Desa Girimekar, Kec. Cilengkrang, Kabupaten Bandung','2026-11-21','2026-11-21','Belanja pakai koin kayu','Budaya Sunda',null,
  'Warga Kasepuhan Bunisari',
  'Pasar budaya Sunda di hutan pinus Kasepuhan Bunisari, Sabtu 21 November 2026 pukul 16.00–22.00 WIB. Pengunjung menukar uang dengan koin kayu untuk bertransaksi di Pasar Buhun, menikmati jajanan tradisional Sunda, Panggung Seni Sunda, dan Pantun Pituduh Sesepuh. Info terbaru di IG @nyawang.bulan.',
  'https://i0.wp.com/www.infobdg.com/v2/wp-content/uploads/2026/11/IMG_4159.webp',
  'https://www.instagram.com/nyawang.bulan/','nyawang.bulan'),

 ('Arum Guyub Festival – Cloversary XI','arum-guyub-festival-cloversary-xi-2026','festival','bandung',
  'Clove Hotel Bandung','2026-11-21','2026-11-22','Info menyusul','Komunitas & Seni',null,
  'Clove Hotel Bandung',
  'Perayaan ulang tahun ke-11 Clove Hotel Bandung bertema "Sehat. Kenyang. Senang!", Sabtu–Minggu 21–22 November 2026. Ada Pasar Guyub (produk lokal), pameran seni rupa anak, pertunjukan musik Orkestaman bersama Barsena Bestandhi, dan lari Hills & Run 7K pada Minggu pukul 06.00 WIB (slot sudah habis).',
  'https://i0.wp.com/www.infobdg.com/v2/wp-content/uploads/2026/11/poster-arum-guyub-festival-cloversary-xi-clove-hotel.jpg',
  'https://www.instagram.com/clovehotelbandung/','clovehotelbandung'),

 ('Sarerea Seru Ngariung – K-Pop in Public & Live DJ','sarerea-seru-ngariung-kiara-artha-park-2026','festival','bandung',
  'Kiara Artha Park, Jl. Banten, Bandung','2026-11-21','2026-11-22','Tiket masuk taman Rp10.000','K-Pop & Komunitas',null,
  'Kiara Artha Park',
  'Akhir pekan ngariung di Kiara Artha Park. Sabtu 21 November: Zumba bersama Zin Ibest dan Bandung Workout Community (16.00 WIB) serta live music Dark Valley Music (18.00 WIB). Minggu 22 November: K-Pop in Public bersama XP Team (09.00 WIB) dan Live DJ & Karaoke bersama Cathris East (17.00 WIB). Acara gratis; pengunjung hanya membayar tiket masuk taman Rp10.000.',
  'https://i0.wp.com/www.infobdg.com/v2/wp-content/uploads/2026/11/poster-sarerea-seru-ngariung-kiara-artha-park-2026.jpg',
  'https://www.instagram.com/kiaraarthapark/','kiaraarthapark'),

 ('Pekan Amal Tzu Chi Bandung 2026','pekan-amal-tzu-chi-bandung-2026','lainnya','bandung',
  'Tzu Chi Bandung, Jl. Jend. Sudirman No. 628, Bandung','2026-11-22','2026-11-22','Info menyusul (kupon bazar)','Bazar Amal',null,
  'Yayasan Buddha Tzu Chi Indonesia – Perwakilan Bandung',
  'Bazar amal Tzu Chi Bandung, Minggu 22 November 2026 pukul 09.00–16.00 WIB (yoga mulai 07.30). Ada bazar kuliner vegetarian dan produk food/non-food, seminar parenting "Winning in Parenting without Losing our Kids" (10.00–12.00), seminar kecantikan "Love Your Skin Again", lomba dan wisuda sempoa, serta kids zone. Seluruh hasil penjualan untuk kegiatan sosial Tzu Chi Bandung. Info: (022) 20565200.',
  'https://i0.wp.com/www.infobdg.com/v2/wp-content/uploads/2026/11/poster-pekan-amal-tzu-chi-bandung-2026.jpg',
  'https://www.instagram.com/tzuchibandung/','tzuchibandung'),

 ('Festival Kreasi Pergelaran Seni Jawa Barat 2026 – Penutup','festival-kreasi-pergelaran-seni-jabar-2026-penutup','festival','bandung',
  'Teater Tertutup Taman Budaya Jawa Barat (Dago Tea House), Jl. Bukit Dago Selatan, Bandung','2026-11-24','2026-11-24','Gratis','Seni Pertunjukan',null,
  'Disparbud Provinsi Jawa Barat',
  'Jadwal terakhir Festival Kreasi Pergelaran Seni Jawa Barat 2026, Selasa 24 November 2026 (sekitar pukul 15.00 WIB, cek kanal Disparbud Jabar). Perwakilan 27 kabupaten/kota di Jawa Barat tampil bergiliran membawakan karya seni kreasi tentang cerita, sejarah, legenda, atau mitos daerah masing-masing. Terbuka untuk umum dan gratis.',
  'https://i0.wp.com/www.infobdg.com/v2/wp-content/uploads/2026/11/festival-seni-jawa-barat-20206.webp',
  'https://www.infobdg.com/festival-kreasi-pergelaran-seni-jabar-2026-taman-budaya/','infobdgcom')

) as v(title,slug,category,city,venue,d,e,price,genre,lineup,org,descr,poster,ticket,ig)
join cities c on c.slug=v.city
on conflict (slug) do update set
  title=excluded.title, category=excluded.category, city_id=excluded.city_id, venue=excluded.venue,
  event_date=excluded.event_date, end_date=excluded.end_date, price_label=excluded.price_label, genre=excluded.genre,
  lineup=excluded.lineup, organizer=excluded.organizer, description=excluded.description, poster_url=excluded.poster_url,
  ticket_url=excluded.ticket_url, source_ig=excluded.source_ig, status='published';

-- Cek: harus 9 baris
-- select title,event_date,price_label,status from events where slug in (
--  'bandung-fair-2026-laswi-heritage','weekend-for-love-32-gaya-brasserie','festara-2026-book-fair-bandung-barat',
--  'dcdc-lavitsef-recall-the-scene-2026','nyawang-bulan-kasepuhan-bunisari-2026-11','arum-guyub-festival-cloversary-xi-2026',
--  'sarerea-seru-ngariung-kiara-artha-park-2026','pekan-amal-tzu-chi-bandung-2026','festival-kreasi-pergelaran-seni-jabar-2026-penutup');
