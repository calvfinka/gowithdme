-- GoWithDME: 13 event mendatang dari Artatix (artatix.co.id), tersebar di banyak kota. Jalankan di Supabase > SQL Editor.
-- Data per 17 Nov 2026 dari halaman event resmi Artatix (judul, tanggal, venue, harga "mulai dari", poster, penyelenggara).
-- Prasyarat: schema.sql, schema_tahap2.sql, schema_admin.sql, schema_kota.sql sudah dijalankan.
-- Aman dijalankan ulang: yang sudah ada diperbarui sesuai file ini. Status = published (bisa ditarik lewat tombol "Tarik" di admin).
-- Kota baru ikut ditambahkan di js/regions.js (file regions.js terbaru sudah memuatnya).
-- Poster dari assets.artatix.co.id milik penyelenggara; minta izin atau ganti lewat admin. source_ig = akun Artatix (artatixcoid)
-- karena halaman event tidak menampilkan nama akun IG penyelenggara; ganti dengan akun penyelenggara bila ada.

insert into cities(province_id,name,slug)
select p.id,v.n,v.s from (values
 ('Jawa Barat','Majalengka','majalengka'),
 ('Jawa Timur','Kediri','kediri'),
 ('Jawa Timur','Lamongan','lamongan'),
 ('Jawa Timur','Madiun','madiun'),
 ('Sumatera Barat','Dharmasraya','dharmasraya')
) as v(prov,n,s) join provinces p on p.name=v.prov
on conflict (slug) do nothing;

insert into events(title,slug,category,city_id,venue,event_date,end_date,price_label,genre,lineup,description,poster_url,ticket_url,source_ig,status)
select v.title,v.slug,v.category,c.id,v.venue,v.d::date,v.e::date,v.price,v.genre,v.lineup,v.descr,v.poster,v.ticket,'artatixcoid','published'
from (values

 ('NOVEMBER SUMMERFEST 2026','november-summerfest-2026','konser','lamongan','Sport Center Lamongan (GOR), Lamongan','2026-11-22','2026-11-22','Mulai Rp70.000','Rock','Line-up menyusul (metal underground)',
  'Festival musik metal underground tahunan di Lamongan oleh jaringan komunitas Lamongan Metal Madness, digelar hanya setiap bulan November. Pukul 13.00–21.00 WIB, usia minimal 15 tahun dengan kartu identitas. Penyelenggara: VVision Ground.',
  'https://assets.artatix.co.id/event/FNB7B2CQGH.png','https://artatix.co.id/event/november_summerfest'),

 ('Nadaria Vol 10','nadaria-vol-10-depok-2026','konser','depok','Pesona Square, Depok','2026-11-28','2026-11-28','Mulai Rp11.000','Festival campuran','Line-up menyusul',
  'Konser musik tahunan mahasiswa Fakultas Ilmu Komunikasi Universitas Pancasila yang memasuki edisi ke-10 dengan tema Growing Through Sound. Sabtu 28 November 2026 pukul 15.00–22.00 WIB.',
  'https://assets.artatix.co.id/event/AUC0RDOYY7.png','https://artatix.co.id/event/nadaria_vol_10'),

 ('MIKADO FESTIVAL','mikado-festival-pontianak-2026','konser','pontianak','Halaman Grand Mahkota Hotel, Pontianak','2026-12-04','2026-12-04','Mulai Rp170.000','Festival campuran','Line-up menyusul',
  'Perayaan musik dan budaya kreatif akhir tahun di Pontianak: penampilan musik, pertunjukan interaktif, bursa kuliner, dan bazar komunitas lokal. Jumat 4 Desember 2026 pukul 15.00–23.00 WIB. Penyelenggara: MUSI LIVE.',
  'https://assets.artatix.co.id/event/FRWEA8LSMW.png','https://artatix.co.id/event/mikado_festival'),

 ('DINAMIT FEST 2026','dinamit-fest-2026','konser','yogyakarta','Stadion Kridosono, Yogyakarta','2026-12-05','2026-12-05','Mulai Rp85.000','Festival campuran','Bintang tamu dan musisi (diumumkan penyelenggara)',
  'Konser penutup rangkaian kegiatan DINAMIT 2026 sebagai puncak acara dan apresiasi bagi peserta serta panitia, dengan bintang tamu dan musisi. Sabtu 5 Desember 2026 pukul 15.00–23.00 WIB.',
  'https://assets.artatix.co.id/event/911POGP29I.png','https://artatix.co.id/event/dinamit_fest_2026'),

 ('Sayapmas Fest Vol 2','sayapmas-fest-vol-2','konser','malang','Area Stadion Kanjuruhan, Malang','2026-12-11','2026-12-11','Mulai Rp85.000','Festival campuran','Line-up menyusul',
  'Festival musik Sayapmas edisi kedua di area Stadion Kanjuruhan, Jumat 11 Desember 2026 pukul 10.00–23.00 WIB. Produksi Fajar Project bersama Rumah Event Indonesia. Anak di bawah 12 tahun tidak diperkenankan masuk.',
  'https://assets.artatix.co.id/event/2BTORUF64C.png','https://artatix.co.id/event/sayapmas_fest_vol_2'),

 ('ARCHFEST 2026','archfest-yogyakarta-2026','konser','yogyakarta','Yogyakarta (lokasi menyusul)','2026-12-13','2026-12-13','Mulai Rp22.000','Festival campuran','Line-up menyusul',
  'Malam musik dan hiburan dalam rangka Dies Natalis HMTG Pangea UPN Veteran Yogyakarta, Minggu 13 Desember 2026 pukul 16.00–23.00 WIB. Penyelenggara: Archean HMTG Pangea.',
  'https://assets.artatix.co.id/event/8JCS2OSP9T.png','https://artatix.co.id/event/archfest'),

 ('Nyanyianfest Majalengka 2026','nyanyianfest-majalengka-2026','konser','majalengka','Lapangan Sepak Bola Yonif 321 Tenjolayar, Majalengka','2026-12-13','2026-12-13','Mulai Rp100.000','Festival campuran','Line-up menyusul',
  'Festival musik bernuansa ceria untuk bernyanyi bersama di Majalengka, Minggu 13 Desember 2026 pukul 14.00–23.00 WIB. Harga belum termasuk biaya layanan Artatix. Penyelenggara: JAFPRO.',
  'https://assets.artatix.co.id/event/S3TTXY4TH7.jpg','https://artatix.co.id/event/nyanyian_fest_majalengka_2026'),

 ('Hari H Fest','hari-h-fest-malang-2026','konser','malang','Stadion Kanjuruhan, Kabupaten Malang','2026-12-13','2026-12-13','Mulai Rp90.000','Festival campuran','Line-up menyusul',
  'Festival musik Hari H Fest di Stadion Kanjuruhan, Minggu 13 Desember 2026. Produksi Fajar Project bersama Rumah Event Indonesia. Maksimal 20 tiket per transaksi; anak di bawah 8 tahun tidak diperkenankan masuk.',
  'https://assets.artatix.co.id/event/NHPZNT881P.png','https://artatix.co.id/event/hari_h_fest'),

 ('WESTERN NOISE (BLVS Vol. 1)','western-noise-lamongan-2026','konser','lamongan','GOR Sport Center Lamongan','2026-12-13','2026-12-13','Mulai Rp70.000','Festival campuran','Line-up menyusul',
  'Acara musik BLVS Vol. 1 bertema pergerakan dan kebisingan yang disatukan oleh perbedaan, wadah berekspresi dan solidaritas. Minggu 13 Desember 2026 pukul 13.00–21.00 WIB. Penyelenggara: Curva Boys 1967.',
  'https://assets.artatix.co.id/event/CV4Z0X4X42.jpg','https://artatix.co.id/event/western_noise'),

 ('Refestoria','refestoria-kediri-2026','konser','kediri','Taman Wisata Tirtayasa Park, Kediri','2026-12-19','2026-12-19','Mulai Rp125.000','Pop','Idgitaf, Nadin Amizah',
  'Konser perayaan masa muda di Kota Kediri dengan Idgitaf dan Nadin Amizah, Sabtu 19 Desember 2026 pukul 15.00–23.00 WIB. Usia minimal 15 tahun, tanpa re-entry. Penyelenggara: HIMA SALUT Kota Kediri.',
  'https://assets.artatix.co.id/event/X6P5SMDRGK.png','https://artatix.co.id/event/refestoria'),

 ('Konser Kita (Kenangan Indah Tentang Asmara)','konser-kita-dharmasraya-2026','konser','dharmasraya','GOR Dharmasraya','2026-12-23','2026-12-23','Mulai Rp75.000','Dangdut','NDX A.K.A., D''ALDIM, Tari KDI, Dwi Bintang Pantura, DJ Joddy, Laman Uma, Rooftop Band',
  'Malam musik KITA di GOR Dharmasraya, Rabu 23 Desember 2026 pukul 15.00–23.00 WIB, menampilkan NDX A.K.A. dan sederet penampil lain. Penyelenggara: Young Entertaint.',
  'https://assets.artatix.co.id/event/AERKIKVY66.jpg','https://artatix.co.id/event/konser_kita'),

 ('ETHERVOLS','ethervols-madiun-2026','konser','madiun','Ngrowo Bening Edu Park, Jl. Abdurrahman Saleh, Madiun','2026-12-26','2026-12-26','Mulai Rp45.000','Rock','The Jeblogs (guest star)',
  'Acara musik senja akhir tahun oleh OSIS SMA Negeri 6 Madiun dengan The Jeblogs sebagai guest star, Sabtu 26 Desember 2026. Anak di bawah 12 tahun tidak diperkenankan masuk. Penyelenggara: OSIMA Production.',
  'https://assets.artatix.co.id/event/4ONIIVFQIX.png','https://artatix.co.id/event/ethervols'),

 ('TITIK BALIK FESTIVAL 2027','titik-balik-festival-2027','konser','malang','Graha Cakrawala Universitas Negeri Malang, Malang','2027-01-30','2027-01-30','Mulai Rp450.000','Pop','Reza Artamevia, Element Band, Kahitna, Astrid',
  'Konser bertema Apa Titik Balikmu? dengan set list era awal 2000-an, ditujukan bagi generasi milenial ke atas. Sabtu 30 Januari 2027 pukul 15.00–23.00 WIB. Kategori VIP Standing dan Festival Tribun.',
  'https://assets.artatix.co.id/event/0O6DX6AEU4.jpg','https://artatix.co.id/event/titikbalik2027')

) as v(title,slug,category,city,venue,d,e,price,genre,lineup,descr,poster,ticket)
join cities c on c.slug=v.city
on conflict (slug) do update set
  title=excluded.title, category=excluded.category, city_id=excluded.city_id, venue=excluded.venue,
  event_date=excluded.event_date, end_date=excluded.end_date, price_label=excluded.price_label,
  genre=excluded.genre, lineup=excluded.lineup, description=excluded.description,
  poster_url=excluded.poster_url, ticket_url=excluded.ticket_url, source_ig=excluded.source_ig, status=excluded.status;

-- Cek jumlah yang masuk (harus 13):
-- select count(*) from events where ticket_url like 'https://artatix.co.id/event/%' and event_date >= '2026-11-22';
