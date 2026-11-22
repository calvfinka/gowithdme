-- GoWithDME: 12 link infokonser.id (13 baris event; Ruang Riang = 2 kota). Jalankan di Supabase > SQL Editor.
-- Prasyarat: schema.sql, schema_tahap2.sql, schema_kota.sql, schema_admin.sql sudah dijalankan.
-- v2: SEMUA kolom form admin terisi (tanggal selesai, harga, genre, line-up, poster, link, sumber IG).
-- Aman dijalankan ulang: bagian INSERT melewati slug yang sudah ada, bagian UPDATE di bawahnya
-- menimpa baris yang sudah terlanjur masuk dari versi pertama.
-- Status = 'draft' supaya bisa dicek dulu di admin.
-- Data per 16 Nov 2026, sumber: infokonser.id (+ KiosTix / whatsnewindonesia untuk BOOMFEST & KICKFEST).
-- BOOMFEST: poster = banner GoWithDME -> salin posters/boomfest-bandung-2026.jpg ke assets/posters/ di repo.

insert into events(title,slug,category,city_id,venue,event_date,end_date,price_label,genre,lineup,description,poster_url,ticket_url,source_ig,status)
select v.title,v.slug,v.category,c.id,v.venue,v.d::date,v.e::date,v.price,v.genre,v.lineup,v.descr,v.poster,v.ticket,v.ig,'draft'
from (values

 ('Ruang Riang Intimate WOW MA Showcase – Jakarta','ruang-riang-wow-ma-jakarta-2026','konser','jakarta','Anora 2, Jl. Pahlawan Revolusi, Jakarta Timur','2026-11-20','2026-11-20','Info menyusul','Rock','The Changcuters',
  'Showcase intim The Changcuters untuk merayakan dua dekade berkarya dan album kedelapan WOW MA, Jumat 20 November 2026 pukul 17.00–23.00 WIB. Setlist dan kolaborasi spesial dengan aransemen eksklusif. Tiket resmi hanya lewat artatix.co.id; bawa KTP asli dan e-ticket.',
  'https://infokonser.id/storage/uploads/media/2026/11/01M6BH6TA71GR3AZT27HHPZMV0/800w.webp','https://artatix.co.id','nusawarna_events'),

 ('Ruang Riang Intimate WOW MA Showcase – Bandung','ruang-riang-wow-ma-bandung-2026','konser','bandung','TPANG The Social Fabriek, Bandung','2026-11-27','2026-11-27','Info menyusul','Rock','The Changcuters',
  'Seri kedua Ruang Riang Intimate WOW MA Showcase dari The Changcuters di Bandung, Jumat 27 November 2026 pukul 17.00–23.00 WIB. Merayakan album kedelapan WOW MA dalam format intim tanpa sekat. Tiket resmi hanya lewat artatix.co.id.',
  'https://infokonser.id/storage/uploads/media/2026/11/01M6BH6TA71GR3AZT27HHPZMV0/800w.webp','https://artatix.co.id','nusawarna_events'),

 ('Soundrenaline Sana Sini Bandung','soundrenaline-sana-sini-bandung','konser','bandung','Laswi Heritage, Bandung','2026-11-20','2026-11-22','Info menyusul','Festival campuran','Dewa 19 feat. Ello, Efek Rumah Kaca, The Adams, The S.I.G.I.T, Feel Koplo, Mondo Gascaro, Polyester Embassy, Perunggu, White Chorus, Murphy Radio, Rub of Rub, Beijing Connection, Mahalini, Float, MerDeFeu, White Shoes & The Couples Company, Stars and Rabbit, Tactile, Ali, Under The Big Bright Yellow Sun, Alkateri, Buckskin Bugle, Dongtsay x Oasisbdg, HFDZKHR, HIMTEP, K3BI, La Luna, MORFEM, Namoy Budaya, PORIS',
  'Festival musik tiga hari di Laswi Heritage, 20–22 November 2026, bagian dari rangkaian Soundrenaline Sana Sini yang sebelumnya singgah di empat kota. Menghadirkan penampil pop dan rock dengan tiga area panggung: The Stage, The Space, dan The Lab. Khusus usia 21 tahun ke atas.
Jadwal Day 1 (Jumat, 20 November) – The Stage, Festival Stage: Under The Big Bright Yellow Sun 17.00–17.45, Polyester Embassy 19.10–19.55, Float 20.40–21.25, MerDeFeu 21.40–22.10, DEWA 19 ft. ELLO 22.15–23.15, Tactile 23.15–23.45. Garden Stage: Ali 18.00–18.50, White Shoes & The Couples Company 19.55–20.40, Stars and Rabbit 21.25–22.10. Jadwal Day 2 dan Day 3 serta The Space dan The Lab menyusul; cek soundrenaline.id/bandung untuk pembaruan.',
  'https://infokonser.id/storage/uploads/media/2026/11/01M700ZVG228KVQWNS6P1K0Z9M/800w.webp','https://bit.ly/soundrenalinebandung','soundrenaline'),

 ('Harmonic The Cure – Karaoke Party Olivia Rodrigo Song by Senandung Bandung','harmonic-the-cure-olivia-rodrigo-karaoke-bandung','konser','bandung','Dago 138 Space, Bandung','2026-11-21','2026-11-21','Rp70.000','Pop','Senandung Bandung',
  'Karaoke party lagu-lagu Olivia Rodrigo oleh Senandung Bandung, Sabtu 21 November 2026 pukul 17.00–21.00 WIB. Sekitar 200 peserta bernyanyi bersama dalam suasana hangat dan inklusif. Tiket Rp70.000 untuk pria maupun wanita; status saat ini sudah habis terjual.',
  'https://infokonser.id/storage/uploads/media/2026/11/01M6C2NN0DYM1JQYBDFWA8GFR3/800w.webp','https://tixtune.com/events/senandungbandung-harmonicthecureolivia','tixtune_tiket'),

 ('Bandung Bernyanyi Vol.17','bandung-bernyanyi-vol17','konser','bandung','NuArt Sculpture Park, Bandung','2026-11-22','2026-11-22','Rp100.000','Lainnya','Bandung Bernyanyi (paduan suara bersama peserta)',
  'Bernyanyi bersama paduan suara di tengah karya patung NuArt Sculpture Park dengan tema Melukis Nada, Merangkai Harmoni. Minggu 22 November 2026, pukul 10.00–13.30 WIB (registrasi 09.00). Kontribusi Rp100.000 sudah termasuk tiket masuk NuArt, merchandise, buku lirik, dan snack box.',
  'https://infokonser.id/storage/uploads/media/2026/11/01M6X3QJ59NVAXQ3PSAN7BEA8S/800w.webp','https://wa.me/6281228748420','bandungbernyanyi'),

 ('BOOMFEST Bandung','boomfest-bandung','konser','bandung','Pangkalan TNI AU Husein Sastranegara, Bandung','2026-11-27','2026-11-27','Info menyusul','Festival campuran','NDX A.K.A., Denny Caknan, Ndarboy Genk, Arlida Putri, Shaggydog, Aftershine',
  'Festival musik pop dan dangdut di Pangkalan TNI AU Husein Sastranegara, Jumat 27 November 2026, dipromotori REMI. Tiket tersedia lewat KiosTix; jam acara dan harga belum diumumkan, cek halaman tiket resmi.',
  'assets/posters/boomfest-bandung-2026.jpg','https://www.kiostix.com/e/boomfest-bandung-2026','infokonser_official'),

 ('Konser Nasyid Nostalgia','konser-nasyid-nostalgia','konser','bandung','Sabuga, Bandung','2026-11-29','2026-11-29','Info menyusul','Lainnya','The Rayhan, Snada, Shoutul Harokah, Edcoustic',
  'Konser nostalgia nasyid di Sabuga Bandung, Minggu 29 November 2026 mulai pukul 09.00 WIB, bersama grup nasyid Malaysia The Rayhan dan grup Indonesia Snada, Shoutul Harokah, serta Edcoustic. Diselenggarakan oleh Trust Entertainment.',
  'https://infokonser.id/storage/uploads/media/2026/11/01M6RZ8NWZED6D43708GPTNQE6/800w.webp','https://infokonser.id/out/tickets/01M6P1ENRYG94550EFTA96KS7R','infokonser_official'),

 ('Konser Gemerlap 2026','konser-gemerlap-2026','konser','bandung','Grha Sanusi Hardjadinata, Universitas Padjadjaran, Bandung','2026-12-05','2026-12-05','Rp95.000 – Rp155.000','Pop','Crimson Panorama',
  'Konser Crimson Panorama bertema kilas balik kenangan dan perayaan cinta, Sabtu 5 Desember 2026 pukul 17.00–22.00 WIB di Grha Sanusi Hardjadinata Unpad. Kategori tiket Eternity, Ode, Verity, dan Luminous. Penonton duduk di kursi masing-masing selama pertunjukan.',
  'https://infokonser.id/storage/uploads/media/2026/11/01M6C2NS91X2RVZ18YXG17NVCK/800w.webp','https://infokonser.id/out/tickets/01M6C9DCDFEP7ZYZB4FJRK7CQ1','tixtune_tiket'),

 ('MANFEST New Era','manfest-new-era-bandung-2026','konser','bandung','Auditorium Universitas Logistik dan Bisnis Internasional, Bandung','2026-12-05','2026-12-05','Rp35.000 – Rp50.000','Festival campuran','Gochikara, Kazu Hyun, Harvest, Thousand Sunny, DJ Alexandria',
  'Festival bertema Jepang yang memadukan talkshow, kompetisi coswalk, bazar, dan penampilan musik, Sabtu 5 Desember 2026 pukul 08.00–18.00 WIB. Tiket kategori Reguler Rp35.000, Coswalk Rp40.000, dan On the spot Rp50.000.',
  'https://infokonser.id/storage/uploads/media/2026/11/01M6N357WGD6J7NHXT6KTQH39J/800w.webp','https://infokonser.id/out/tickets/01M6N355DXYBFWA6RZYCJDSY3F','tixtune_tiket'),

 ('KICKFEST Rediscover XVII','kickfest-rediscover-xvii','konser','bandung','Laswi Heritage, Bandung','2026-12-11','2026-12-13','Presale Rp79.000','Festival campuran','Line-up menyusul (pop & indie)',
  'Perayaan 17 tahun KICKFEST di Laswi Heritage, 11–13 Desember 2026: pameran fashion, brand lokal, komunitas kreatif, dan penampilan musik pop serta indie. Tiket presale Rp79.000 lewat Loket.com untuk periode terbatas; line-up tambahan akan diumumkan di Instagram resmi.',
  'https://infokonser.id/storage/uploads/media/2026/11/01M6RZ95HE1H4AC3R0Y58N5DFJ/800w.webp','https://www.instagram.com/kickfest.official/','kickfest.official'),

 ('Side On Stage First Chapter','side-on-stage','konser','bandung','TPANG Social Fabriek, Bandung','2026-12-13','2026-12-13','Mulai Rp55.000','Indie','Sukatani, Dt09, Kale, GUU, School Off Clown, Seekaam, Clinophile, Residual Energi',
  'Gelaran perdana Side On Stage sebagai ruang bagi musisi dan kreator menampilkan karya, Minggu 13 Desember 2026 pukul 14.00–23.00 WIB di TPANG Social Fabriek. Tiket mulai Rp55.000; satu tiket berlaku untuk satu orang.',
  'https://infokonser.id/storage/uploads/media/2026/10/01M5A2B81SB4Z2M6YFW6GWA5DV/800w.webp','https://infokonser.id/out/tickets/01M6C9G7YTYVK47PAMB17YC2A9','infokonser_official'),

 ('Amerta Rasa 2026','amerta-rasa-2026','pameran','bandung','Gedung Ahmad Sanusi, Universitas Pendidikan Indonesia, Bandung','2026-12-15','2026-12-15','Info menyusul','Lainnya','Chef Rudy (live cooking demo)',
  'Acara mahasiswa Pendidikan Tata Boga UPI angkatan 2024, Selasa 15 Desember 2026 mulai 08.30 WIB: pameran hidangan, food show, live cooking demo bersama Chef Rudy, talkshow gastronomi, peluncuran buku resep, talent show, dan guest star.',
  'https://infokonser.id/storage/uploads/media/2026/11/01M7FASV8B3QVWG1847AS6C8SJ/800w.webp','https://infokonser.id/konser/amerta-rasa-2026','infokonser_official'),

 ('Darurat Pesta','darurat-pesta','konser','bandung','Bikasoga Indoor Hall, Bandung','2026-12-19','2026-12-19','Rp35.000 – Rp120.000','Rock','Dongker, Skandal, The Jeblogs',
  'Konser rock dan indie di Bikasoga Indoor Hall, Sabtu 19 Desember 2026 mulai pukul 12.00 WIB, dengan Dongker, Skandal, dan The Jeblogs. Tiket tersedia dalam kategori early bird, presale, hingga paket bersama.',
  'https://infokonser.id/storage/uploads/media/2026/11/01M6CBG95WFYY0DHFT1R4GNSBV/800w.webp','https://www.yesplis.com/event/darurat-pesta','infokonser_official')

) as v(title,slug,category,city,venue,d,e,price,genre,lineup,descr,poster,ticket,ig)
join cities c on c.slug=v.city
on conflict (slug) do update set
  title=excluded.title, category=excluded.category, city_id=excluded.city_id, venue=excluded.venue,
  event_date=excluded.event_date, end_date=excluded.end_date, price_label=excluded.price_label,
  genre=excluded.genre, lineup=excluded.lineup, description=excluded.description,
  poster_url=excluded.poster_url, ticket_url=excluded.ticket_url, source_ig=excluded.source_ig;

-- Cek: tidak boleh ada kolom kosong (hasil harus 0 baris)
-- select title from events where slug in (select slug from events where created_at > now() - interval '1 day')
--   and (poster_url is null or ticket_url is null or source_ig is null or lineup is null or genre is null or end_date is null or price_label is null);

-- Terbitkan setelah dicek (opsional):
-- update events set status='published' where slug in (
--  'ruang-riang-wow-ma-jakarta-2026','ruang-riang-wow-ma-bandung-2026','soundrenaline-sana-sini-bandung',
--  'harmonic-the-cure-olivia-rodrigo-karaoke-bandung','bandung-bernyanyi-vol17','boomfest-bandung',
--  'konser-nasyid-nostalgia','konser-gemerlap-2026','manfest-new-era-bandung-2026','kickfest-rediscover-xvii',
--  'side-on-stage','amerta-rasa-2026','darurat-pesta');
