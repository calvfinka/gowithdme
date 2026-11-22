-- GoWithDME: event dari Goers (11 Nov 2026), status DRAFT. Jalankan di Supabase > SQL Editor.
-- Prasyarat: schema.sql, schema_kota.sql sudah dijalankan. Aman dijalankan ulang (slug sama dilewati).
-- Semua event masuk sebagai draft: cek dulu, isi poster_url, lalu terbitkan lewat halaman admin (atau jalankan UPDATE di bawah).
-- Cek ulang jadwal/harga di tautan tiket sebelum diterbitkan.

-- Kategori baru
insert into categories(slug,name) values ('seminar','Seminar & Konferensi'),('festival','Festival'),('komedi','Komedi'),('meetup','Meetup'),('lainnya','Lainnya') on conflict do nothing;

insert into events(title,slug,category,city_id,venue,event_date,end_date,price_label,genre,lineup,description,poster_url,ticket_url,status)
select v.title,v.slug,v.category,c.id,v.venue,v.d::date,v.e::date,v.price,v.genre,v.lineup,v.descr,v.poster,v.ticket,'draft'
from (values
 ('Electronic Worship Movement','electronic-worship-movement','konser','jakarta','Zeek Jakarta','2026-11-24',null,'Mulai Rp59.000','Electronic Worship',null,'Praise Wave vol. 2 menghadirkan pengalaman ibadah dengan pilihan tiket Premium Reserved Seating dan Standing. Tiket mencakup merchandise khusus sesuai kategori.',null,'https://www.goersapp.com/events/electronic-worship-movement--electronicworshipmovement'),
 ('Gajah Mada','gajah-mada','lainnya','jakarta','Gedung Kesenian Miss Tjitjih','2026-11-22',null,'Mulai Rp85.000','Pertunjukan Teater',null,'Pertunjukan tentang Gajah Mada, Patih Majapahit, yang berjuang menyelamatkan kerajaan dari kehancuran dan pemberontakan. Ancaman terbesar justru muncul dari dalam kubunya sendiri melalui pengkhianatan yang didorong kecemburuan, asmara, dan ambisi kekuasaan.',null,'https://www.goersapp.com/events/gajah-mada--gajahmada'),
 ('Nobar NAZA & Talkshow: Resiliensi di Balik Reruntuhan','nobar-naza-talkshow-resiliensi-di-balik-reruntuhan','seminar','jakarta','CGV fX Sudirman','2026-11-21',null,'Gratis','Pemutaran Film dan Talk Show',null,'Pemutaran film NAZA dan talk show bertema perjuangan perempuan dan anak-anak di tengah kejahatan perang. Acara mengajak peserta memahami dampak krisis kemanusiaan di Palestina dan mendorong kepedulian serta tindakan nyata.',null,'https://www.goersapp.com/events/nobar-naza-talkshow-resiliensi-di-balik-reruntuhan--nobarnaza'),
 ('MACNIFEST 2026','macnifest-2026','festival','tangerang','The Flavor Bliss Alam Sutera','2026-11-21',null,'Mulai Rp63.000','Festival Musik',null,'Perayaan ulang tahun Broadway dan The Flavor Bliss Alam Sutera melalui MACNIFEST 2026. Acara menghadirkan penampilan spesial berbagai musisi Indonesia serta program menarik lainnya.',null,'https://www.goersapp.com/events/macnifest-2026--macnifest2026'),
 ('CARASEL SERANOVA 2026','carasel-seranova-2026','festival','jakarta','Gambir Expo - Arena PRJ Kemayoran','2026-11-21',null,'Mulai Rp146.190','Festival Seni dan Musik',null,'Carasel merupakan festival seni tahunan unggulan yang diselenggarakan oleh SMAN 68 Jakarta. Carasel Seranova 2026 menghadirkan musisi Indonesia dan talenta kreatif dengan rangkaian pertunjukan serta pengalaman festival.',null,'https://www.goersapp.com/events/carasel-seranova-2026--caraselseranova'),
 ('Tour Our Brand New Show Unit','tour-our-brand-new-show-unit','lainnya','jakarta','Aerium Residence','2026-11-21','2026-11-22','Gratis','Property Exhibition',null,'Kunjungan untuk melihat show unit terbaru Aerium Residence yang menampilkan konsep hunian modern, nyaman, dan elegan. Pengunjung undangan mendapatkan penawaran khusus berupa diskon dan berbagai fasilitas promosi.',null,'https://www.goersapp.com/events/tour-our-brand-new-show-unit--hk29xa'),
 ('Music Trivia [2000s Chart Hits, THE MP3 MEMORY TEST]','music-trivia-2000s-chart-hits-the-mp3-memory-test','meetup','jakarta','Vagabond','2026-11-20',null,'Mulai Rp150.000','Music Trivia',null,'Kuis musik bertema lagu-lagu populer era 2000-an, mencakup genre pop, R&B, dance, dan pop rock. Peserta diajak menguji ingatan terhadap lagu-lagu hits dari era pemutar MP3 dan CD.',null,'https://www.goersapp.com/events/music-trivia-2000s-chart-hits-the-mp3-memory-test--8pgsas'),
 ('WOMEN LEADERSHIP CONFERENCE by Her World Indonesia 2026','women-leadership-conference-by-her-world-indonesia-2026','seminar','jakarta','Sudirman Hall','2026-11-20',null,'Gratis','Konferensi Kepemimpinan',null,'Women Leadership Conference kembali digelar untuk tahun keempat dengan konsep yang lebih besar dan relevan. Konferensi ini menjadi ruang bagi perempuan inspiratif untuk berbagi visi, bertukar perspektif, membangun jaringan, dan mendorong perubahan.',null,'https://www.goersapp.com/events/women-leadership-conference-by-her-world-indonesia-2026--herworldwlc2026'),
 ('CNC Stand Up Comedy Open Mic [ENGLISH) at Fanfair Kemang 19 Nov','cnc-stand-up-comedy-open-mic-english-at-fanfair-kemang-19-nov','komedi','jakarta','Fanfair Kemang','2026-11-19',null,'Gratis','English Stand-up Comedy',null,'Acara open mic stand-up comedy berbahasa Inggris yang diselenggarakan oleh Chuckles & Cheers. Penonton dapat menikmati penampilan komika atau ikut tampil tanpa persyaratan pengalaman sebelumnya.',null,'https://www.goersapp.com/events/cnc-stand-up-comedy-open-mic-english-at-fanfair-kemang-19-nov--ytgpcq'),
 ('Mahjong Parlour @GAFOY','mahjong-parlour-gafoy','meetup','jakarta','Gafoy','2026-11-18',null,'Rp150.000','Mahjong',null,'Sesi bermain Mahjong di GAFOY dengan penyewaan meja Mahjong otomatis. Setiap sesi berlangsung selama dua jam, maksimal empat pemain per meja, dan pembelian termasuk voucher GAFOY.',null,'https://www.goersapp.com/events/mahjong-parlour-gafoy--mikzxa')
) as v(title,slug,category,city,venue,d,e,price,genre,lineup,descr,poster,ticket)
join cities c on c.slug=v.city
where not exists (select 1 from events x where x.slug=v.slug
   or (lower(x.title)=lower(v.title) and x.event_date=v.d::date))
on conflict (slug) do nothing;

-- Isi poster setelah ada URL gambar (contoh):
-- update events set poster_url='https://...' where slug='electronic-worship-movement';

-- Terbitkan semua draft Goers ini sekaligus (jalankan setelah dicek):
-- update events set status='published' where ticket_url like 'https://www.goersapp.com/%' and status='draft';
