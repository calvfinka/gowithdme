-- =============================================================================
-- GoWithDME: Open Trip / Pendakian nasional (belum ada di data/events.json)
-- Wilayah: Sumatera, Jawa, Bali–NTB, Kalimantan, Sulawesi
-- Aman dijalankan berulang (ON CONFLICT slug DO UPDATE)
-- Poster: unik per slug → assets/posters/<slug>.jpg (jangan dipakai ulang antar event)
-- Harga: rinci (bukan "Info menyusul")
-- Catatan: simaksi/izin resmi tetap wajib dicek ke basecamp & pengelola TN
-- =============================================================================

-- Provinsi yang belum ada di schema_kota.sql
insert into provinces(name) values
  ('Jambi'),
  ('Kalimantan Tengah')
on conflict (name) do nothing;

-- Kota tambahan (dekat basecamp) bila belum ada
insert into cities(province_id,name,slug)
select p.id, v.name, v.slug from provinces p
join (values
  ('Jawa Barat','Garut','garut'),
  ('Jawa Barat','Kuningan','kuningan'),
  ('Jawa Tengah','Wonosobo','wonosobo'),
  ('Jawa Tengah','Magelang','magelang'),
  ('Jawa Timur','Probolinggo','probolinggo'),
  ('Jawa Timur','Banyuwangi','banyuwangi'),
  ('Jawa Timur','Jember','jember'),
  ('Jawa Timur','Batu','batu'),
  ('Sumatera Barat','Bukittinggi','bukittinggi'),
  ('Jambi','Sungai Penuh','sungai-penuh'),
  ('Sulawesi Utara','Tomohon','tomohon'),
  ('Sulawesi Selatan','Gowa','gowa'),
  ('Nusa Tenggara Barat','Lombok Timur','lombok-timur'),
  ('Bali','Karangasem','karangasem'),
  ('Kalimantan Tengah','Palangkaraya','palangkaraya')
) as v(prov,name,slug) on p.name=v.prov
on conflict (slug) do nothing;

-- Pastikan kategori naikgunung ada
insert into categories(slug,name) values ('naikgunung','Naik Gunung') on conflict do nothing;

insert into events(
  title, title_en, slug, category, city_id, venue,
  event_date, end_date, price_label,
  mountain, altitude_mdpl, difficulty, duration, quota, organizer, contact_wa,
  description, description_en,
  poster_url, ticket_url, source_ig, is_community, status
)
select
  v.title, v.title_en, v.slug, 'naikgunung', c.id, v.venue,
  v.d::date, v.e::date, v.price,
  v.mtn, v.mdpl, v.diff, v.dur, v.quota, v.org, v.wa,
  v.descr, v.descr_en,
  'assets/posters/'||v.slug||'.jpg', v.ticket, v.ig, v.comm, 'published'
from (values

-- ========== JAWA BARAT ==========
(
  'Open Trip Gunung Ciremai via Linggarjati — Akhir Pekan Desember 2026',
  'Open Trip Mount Ciremai via Linggarjati — December 2026 Weekend',
  'open-trip-gunung-ciremai-linggarjati-desember-2026',
  'kuningan',
  'Basecamp Linggarjati / Apuy, Kuningan, Jawa Barat',
  '2026-12-12','2026-12-14',
  'Early bird Rp375.000 · Regular Rp425.000 / pax (2H1M)',
  'Gunung Ciremai',3078,'menengah','2H1M',24,
  'Komunitas GoWithDME Jawa Barat',null,
  'Pendakian bersama Gunung Ciremai (3.078 mdpl) via Linggarjati. Harga early bird Rp375.000/pax (bayar s.d. H-14), regular Rp425.000/pax. INCLUDE: transport meeting point Kuningan–basecamp PP, simaksi & karcis masuk (sesuai tarif TN saat keberangkatan), guide lokal 1:8, makan 2x, air mineral 1,5 L, P3K regu, dokumentasi bersama. EXCLUDE: sewa alat (tenda/sleeping bag/carrier), makan di luar itinerary, asuransi pribadi, tips guide. Syarat: sehat, usia min. 17 th (di bawah 17 wajib pendamping), kuota 24 pax. Meeting point: Alun-Alun Kuningan 21.30 WIB. Cek update jalur & status gunung di pengelola TNGC sebelum berangkat.',
  'Group hike of Mount Ciremai (3,078 m) via Linggarjati. Early bird Rp375,000 / regular Rp425,000 per person (2D1N). Includes local transport, park permits at current rates, guide, 2 meals, water, first aid, group photos. Gear rental and personal insurance excluded.',
  'https://tngc.id','gwm.jabar',true
),
(
  'Open Trip Gunung Burangrang via Pondok Salada — One Day Trip',
  'Open Trip Mount Burangrang via Pondok Salada — Day Hike',
  'open-trip-gunung-burangrang-pondok-salada-januari-2027',
  'bandung',
  'Basecamp Pondok Salada, Desa Suntenjaya, Bandung Barat',
  '2027-01-10','2027-01-10',
  'Meeting Bandung Rp295.000 · Basecamp only Rp185.000 / pax',
  'Gunung Burangrang',2064,'pemula','ODT (One Day Trip)',30,
  'Komunitas GoWithDME Bandung',null,
  'One day trip Burangrang (2.064 mdpl) cocok untuk pendaki pemula. Tarif meeting point Bandung (Dago/Pasteur area) Rp295.000/pax sudah termasuk transport PP, guide, tiket masuk, makan siang simple, air mineral, dokumentasi. Opsi basecamp only (tanpa transport kota) Rp185.000/pax. Keberangkatan 03.30 WIB, target turun 15.00. Kuota 30 pax. Bukan jalur teknis; tetap wajib jas hujan & headlamp.',
  'Beginner-friendly day hike on Burangrang (2,064 m). Bandung pickup Rp295,000 incl. transport, guide, entry, simple lunch; basecamp-only Rp185,000.',
  'https://instagram.com','gwm.bandung',true
),
(
  'Open Trip Gunung Gede via Cibodas — Sunrise Weekend',
  'Open Trip Mount Gede via Cibodas — Sunrise Weekend',
  'open-trip-gunung-gede-cibodas-januari-2027',
  'bogor',
  'Pintu Masuk Cibodas, Taman Nasional Gunung Gede Pangrango, Cipanas',
  '2027-01-17','2027-01-18',
  'SIMAKSI + trip Rp320.000 (full) · SIMAKSI only patungan Rp95.000',
  'Gunung Gede',2958,'menengah','2H1M',20,
  'Komunitas GoWithDME Bogor',null,
  'Pendakian Gunung Gede via Cibodas menuju area puncak/Suryakencana (sesuai izin jalur hari-H). Paket full Rp320.000/pax: simaksi & karcis (tarif weekday/weekend menyesuaikan), guide komunitas, transport lokal Cipanas–pintu masuk, makan 2x, air, P3K, dokumentasi. Opsi mandiri simaksi-only patungan admin Rp95.000 (tanpa guide & transport). Kuota 20. Wajib cek status penutupan jalur di TNGGP.',
  'Mount Gede via Cibodas. Full package Rp320,000 incl. permits, guide, local transport, 2 meals. Permit-only pool option Rp95,000.',
  'https://gedepangrango.org','gwm.bogor',true
),

-- ========== JAWA TENGAH / DIY ==========
(
  'Open Trip Gunung Merbabu via Selo — Golden Sunrise',
  'Open Trip Mount Merbabu via Selo — Golden Sunrise',
  'open-trip-gunung-merbabu-selo-desember-2026',
  'magelang',
  'Basecamp Selo, Boyolali / Magelang (batas Jawa Tengah)',
  '2026-12-20','2026-12-21',
  'Weekday Rp389.000 · Weekend Rp449.000 / pax (2H1M)',
  'Gunung Merbabu',3145,'menengah','2H1M',28,
  'Komunitas GoWithDME Jogja-Merapi',null,
  'Open trip Merbabu via Selo (3.145 mdpl). Weekday Rp389.000, weekend Rp449.000 per orang. INCLUDE: transport meeting point Magelang/Boyolali–basecamp PP, simaksi & retribusi, guide 1:7, makan 2x (dinner basecamp + sarapan), teh/kopi basecamp, P3K, dokumentasi. EXCLUDE: sewa alat, porter (opsional ~Rp150.000–200.000/hari), asuransi. Kuota 28. Meeting Magelang Alun-Alun 22.00 WIB.',
  'Merbabu via Selo: weekday Rp389,000 / weekend Rp449,000. Includes permits, guide, 2 meals, basecamp drinks, first aid.',
  'https://instagram.com','gwm.jogja',true
),
(
  'Open Trip Gunung Merapi via Selo — Sunrise & Museum',
  'Open Trip Mount Merapi via Selo — Sunrise & Museum',
  'open-trip-gunung-merapi-selo-januari-2027',
  'yogyakarta',
  'New Selo Basecamp, Kabupaten Boyolali (akses dari Yogyakarta)',
  '2027-01-24','2027-01-25',
  'Paket standar Rp475.000 · Paket + Museum Merapi Rp525.000 / pax',
  'Gunung Merapi',2911,'menengah','2H1M',20,
  'Komunitas GoWithDME Jogja-Merapi',null,
  'Pendakian Merapi via Selo (status jalur tergantung PVMBG & bascam). Paket standar Rp475.000: transport Yogya–Selo PP, guide lokal, izin/retribusi, makan 2x, headlamp cadangan regu, dokumentasi. Paket + Museum Merapi Rp525.000 (kunjungan museum di perjalanan pulang). Wajib ikut arahan guide; jalur dapat ditutup sewaktu-waktu terkait aktivitas vulkanik.',
  'Merapi via Selo. Standard Rp475,000; with Merapi Museum stop Rp525,000. Route subject to PVMBG and basecamp rules.',
  'https://vsi.esdm.go.id','gwm.jogja',true
),
(
  'Open Trip Gunung Sumbing via Butuh — Weekend Pemula Menengah',
  'Open Trip Mount Sumbing via Butuh — Intermediate Weekend',
  'open-trip-gunung-sumbing-butuh-februari-2027',
  'magelang',
  'Basecamp Desa Butuh, Temanggung / Magelang',
  '2027-02-07','2027-02-08',
  'Rp410.000 / pax (include simaksi + guide + 2x makan)',
  'Gunung Sumbing',3371,'menengah','2H1M',22,
  'Komunitas GoWithDME Jawa Tengah',null,
  'Open trip Sumbing via Butuh (3.371 mdpl). All-in Rp410.000/pax: simaksi, guide, transport lokal area Temanggung–basecamp, makan malam & sarapan, air mineral, P3K, dokumentasi. EXCLUDE: transport dari luar kota Temanggung/Magelang, sewa alat, porter. Cocok pendaki yang sudah pernah 2.500+ mdpl. Kuota 22.',
  'Sumbing via Butuh all-in Rp410,000 incl. permit, guide, local transport, 2 meals. 22 slots.',
  'https://instagram.com','gwm.jateng',true
),
(
  'Open Trip Gunung Lawu via Cemoro Sewu — Sunrise',
  'Open Trip Mount Lawu via Cemoro Sewu — Sunrise',
  'open-trip-gunung-lawu-cemoro-sewu-februari-2027',
  'solo',
  'Basecamp Cemoro Sewu, Magetan (akses dari Solo / Madiun)',
  '2027-02-14','2027-02-15',
  'Meeting Solo Rp465.000 · Meeting Magetan Rp395.000 / pax',
  'Gunung Lawu',3265,'menengah','2H1M',25,
  'Komunitas GoWithDME Solo Raya',null,
  'Pendakian Lawu via Cemoro Sewu. Meeting Solo (Tirtonadi area) Rp465.000 sudah termasuk bus/elf PP Solo–basecamp, simaksi, guide, makan 2x, dokumentasi. Meeting Magetan (dekat basecamp) Rp395.000 tanpa transport antar-kota. Kuota 25. Jalur populer, Sabtu-Minggu sering ramai — datang tepat waktu.',
  'Lawu via Cemoro Sewu. Solo pickup Rp465,000; Magetan meetup Rp395,000. 25 slots.',
  'https://instagram.com','gwm.solo',true
),

-- ========== JAWA TIMUR ==========
(
  'Open Trip Gunung Semeru via Ranu Pani — Kuota Terbatas',
  'Open Trip Mount Semeru via Ranu Pani — Limited Quota',
  'open-trip-gunung-semeru-ranu-pani-maret-2027',
  'malang',
  'Basecamp Ranu Pani, Taman Nasional Bromo Tengger Semeru, Lumajang/Malang',
  '2027-03-06','2027-03-09',
  'Rp1.250.000 / pax (3H2M, include SIMAKSI online + guide + logistik dasar)',
  'Gunung Semeru',3676,'sulit','3H2M',12,
  'Komunitas GoWithDME Malang',null,
  'Open trip Semeru (Mahameru 3.676 mdpl) via Ranu Pani. Harga Rp1.250.000/pax untuk 3H2M: SIMAKSI online (tarif WN/WNA menyesuaikan kebijakan TN saat booking), guide bersertifikat, transport Malang kota–Ranu Pani PP, logistik makan regu (3 hari), gas & perahu Ranu Kumbolo (jika beroperasi), P3K, dokumentasi. EXCLUDE: sewa alat lengkap, porter pribadi, asuransi perjalanan, penginapan pre-trip di Malang. Kuota ketat 12 pax. Wajib: pengalaman 3.000 mdpl, surat sehat, ikut aturan TNBTS & larangan mendekati kawah aktif.',
  'Semeru 3D2N Rp1,250,000 incl. SIMAKSI, certified guide, Malang–Ranu Pani transport, group meals. Max 12. Strict park rules apply.',
  'https://booking.bromotenggersemeru.org','gwm.malang',true
),
(
  'Open Trip Bromo Sunrise + Exploring Kaldera — From Malang',
  'Open Trip Bromo Sunrise + Caldera Exploring — From Malang',
  'open-trip-bromo-sunrise-malang-desember-2026',
  'malang',
  'Titik kumpul Hotel area Malang Kota / Batu (menyesuaikan konfirmasi H-2)',
  '2026-12-27','2026-12-27',
  'Jeep share Rp385.000 · Private jeep (max 6) Rp2.100.000 / unit',
  'Gunung Bromo',2329,'pemula','ODT / half-day',18,
  'Komunitas GoWithDME Malang',null,
  'Bromo sunrise non-pendakian teknis (jeep + jalan kaki ringan ke kawah viewpoint sesuai aturan). Jeep share Rp385.000/pax (minimal 4, maksimal 6 per jeep): include jeep PP, tiket masuk wisatawan domestik weekday/weekend menyesuaikan, masker debu, air mineral. Private jeep Rp2.100.000/unit (isi max 6, harga per unit bukan per orang). Berangkat ~00.30 WIB dari Malang. Bukan open trip summit Semeru.',
  'Bromo sunrise jeep trip from Malang. Shared seat Rp385,000; private jeep Rp2,100,000 per unit (max 6).',
  'https://bromotenggersemeru.org','gwm.malang',true
),
(
  'Open Trip Gunung Argopuro via Bremi — Long Trail',
  'Open Trip Mount Argopuro via Bremi — Long Trail',
  'open-trip-gunung-argopuro-bremi-maret-2027',
  'jember',
  'Basecamp Bremi, Kabupaten Probolinggo / Jember',
  '2027-03-20','2027-03-24',
  'Rp1.450.000 / pax (4H3M, kuota 10)',
  'Gunung Argopuro',3088,'sulit','4H3M',10,
  'Komunitas GoWithDME Jawa Timur',null,
  'Long trail Argopuro (3.088 mdpl) via Bremi. Rp1.450.000/pax include: simaksi & retribusi, guide + asisten, transport Jember/Probolinggo–basecamp PP, logistik makan 4 hari, gas, P3K wilderness, dokumentasi. EXCLUDE: sewa carrier/tenda, porter (opsional), asuransi. Hanya untuk pendaki berpengalaman (min. pernah 2x trip 3H2M). Kuota 10.',
  'Argopuro 4D3N long trail Rp1,450,000. Experienced hikers only, max 10 people.',
  'https://instagram.com','gwm.jatim',true
),
(
  'Open Trip Gunung Ijen Blue Fire — Banyuwangi',
  'Open Trip Ijen Blue Fire — Banyuwangi',
  'open-trip-ijen-blue-fire-banyuwangi-januari-2027',
  'banyuwangi',
  'Paltuding, Taman Wisata Alam Kawah Ijen, Banyuwangi',
  '2027-01-31','2027-01-31',
  'Domestik Rp295.000 · Meet Surabaya add Rp180.000 (transport malam)',
  'Gunung Ijen',2779,'pemula','ODT malam–pagi',20,
  'Komunitas GoWithDME Banyuwangi',null,
  'Ijen blue fire & sunrise. Paket domestik dari Banyuwangi kota Rp295.000: transport PP, tiket masuk wisatawan domestik, gas mask sewa, guide lokal, kopi Paltuding, dokumentasi. Add-on jemput Surabaya malam + drop siang Rp180.000 (total Rp475.000). Bukan jalur technical climbing; tanjakan curam ~3 km. Wajib cek status buka kawah.',
  'Ijen blue fire from Banyuwangi Rp295,000. Surabaya night pickup add-on Rp180,000.',
  'https://instagram.com','gwm.banyuwangi',true
),

-- ========== BALI & NTB ==========
(
  'Open Trip Gunung Agung via Besakih — Sunrise',
  'Open Trip Mount Agung via Besakih — Sunrise',
  'open-trip-gunung-agung-besakih-februari-2027',
  'karangasem',
  'Start tracking area Besakih, Karangasem, Bali',
  '2027-02-20','2027-02-21',
  'Rp750.000 / pax (include guide resmi + offering + transport area timur Bali)',
  'Gunung Agung',3031,'sulit','2H1M / night hike',12,
  'Komunitas GoWithDME Bali',null,
  'Pendakian Agung via Besakih (3.031 mdpl). Rp750.000/pax: guide lokal yang terbiasa jalur Besakih, banten/offering sederhana, transport jemput area Karangasem/Canggu-Sanur (jadwal digabung), headlamp regu, dokumentasi. EXCLUDE: penginapan pre-hike, sewa jaket, asuransi, tip. Kondisi vulkanik & adat setempat bisa membatalkan trip — DP hangus hanya jika cancel sepihak peserta H-3.',
  'Agung via Besakih Rp750,000 incl. local guide, offerings, east-Bali transport arrangement. Max 12.',
  'https://instagram.com','gwm.bali',true
),
(
  'Open Trip Gunung Batur Sunrise — Kintamani',
  'Open Trip Mount Batur Sunrise — Kintamani',
  'open-trip-gunung-batur-sunrise-desember-2026',
  'gianyar',
  'Basecamp Toya Bungkah / Kintamani, Bangli (akses Gianyar–Kintamani)',
  '2026-12-13','2026-12-13',
  'Share Rp350.000 · Private (2–6 pax) Rp1.650.000 / grup',
  'Gunung Batur',1717,'pemula','ODT (midnight start)',15,
  'Komunitas GoWithDME Bali',null,
  'Sunrise hike Batur (1.717 mdpl). Share Rp350.000/pax: jemput area Ubud/Kuta (pool), guide, tiket, sarapan sederhana di puncak, headlamp, drop-off. Private grup Rp1.650.000 (2–6 orang, harga per grup). Berangkat ~02.00 WITA. Cocok pemula; jalur ramai wisata.',
  'Batur sunrise share Rp350,000; private group (2–6) Rp1,650,000 per group.',
  'https://instagram.com','gwm.bali',true
),
(
  'Open Trip Gunung Rinjani via Sembalun — Summit Package',
  'Open Trip Mount Rinjani via Sembalun — Summit Package',
  'open-trip-gunung-rinjani-sembalun-maret-2027',
  'lombok-timur',
  'Basecamp Sembalun, Lombok Timur, NTB',
  '2027-03-12','2027-03-15',
  'WN Rp2.750.000 · WNA Rp3.850.000 / pax (3H2M summit attempt)',
  'Gunung Rinjani',3726,'sulit','3H2M',10,
  'Komunitas GoWithDME Lombok',null,
  'Paket summit Rinjani via Sembalun (3.726 mdpl). Domestik Rp2.750.000, asing Rp3.850.000: SIMAKSI/izin TNGR, guide + porter logistik (rasio sesuai aturan), tenda & alat masak regu, makan selama trek, transport Bandara/Mataram–Sembalun PP (jadwal gabungan), P3K. EXCLUDE: sleeping bag pribadi (bisa sewa ~Rp50.000–75.000), tip guide/porter, hotel pre/post, asuransi. Kuota 10. Wajib fisik baik; summit tergantung cuaca & kebijakan taman nasional.',
  'Rinjani summit via Sembalun 3D2N: domestic Rp2,750,000 / foreign Rp3,850,000. Max 10.',
  'https://rinjaninationalpark.id','gwm.lombok',true
),

-- ========== SUMATERA ==========
(
  'Open Trip Gunung Sibayak & Danau — Weekend dari Medan',
  'Open Trip Mount Sibayak & Lake — Weekend from Medan',
  'open-trip-gunung-sibayak-medan-desember-2026',
  'medan',
  'Basecamp Jaranguda / area Berastagi, Kabupaten Karo',
  '2026-12-19','2026-12-20',
  'Rp425.000 / pax (include transport Medan–Berastagi PP + guide + tiket)',
  'Gunung Sibayak',2212,'pemula','2H1M / ODT+menginap desa',20,
  'Komunitas GoWithDME Medan',null,
  'Sibayak (2.212 mdpl) cocok pemula. Rp425.000: transport Medan–Berastagi PP, guide lokal, tiket masuk, menginap sederhana area Berastagi (shared), makan 2x, dokumentasi. Opsi ODT tanpa menginap Rp310.000 (pulang hari yang sama, minim 8 pax). Bukan pendakian Sinabung (area terbatas).',
  'Sibayak from Medan Rp425,000 with transport, guide, stay. Day-trip option Rp310,000 (min 8).',
  'https://instagram.com','gwm.medan',true
),
(
  'Open Trip Gunung Marapi via Bawas — Sumatera Barat',
  'Open Trip Mount Marapi via Bawas — West Sumatra',
  'open-trip-gunung-marapi-bawas-januari-2027',
  'bukittinggi',
  'Basecamp Bawas, Kabupaten Agam, Sumatera Barat',
  '2027-01-16','2027-01-17',
  'Rp395.000 / pax (status jalur mengikuti PVMBG & bascam)',
  'Gunung Marapi',2891,'menengah','2H1M',16,
  'Komunitas GoWithDME Sumbar',null,
  'Pendakian Marapi via Bawas. Rp395.000: transport Bukittinggi–basecamp PP, guide, izin/retribusi lokal, makan 2x, P3K, dokumentasi. Gunung aktif — trip hanya jalan jika status jalur memungkinkan menurut bascam & PVMBG; jika ditutup, dana paket digeser ke tanggal pengganti atau refund sebagian sesuai kebijakan komunitas (biaya operasional H-3 non-refund).',
  'Marapi via Bawas Rp395,000. Subject to volcano status; reroute or partial refund rules apply if closed.',
  'https://vsi.esdm.go.id','gwm.sumbar',true
),
(
  'Open Trip Gunung Kerinci via Kersik Tuo — Summit Attempt',
  'Open Trip Mount Kerinci via Kersik Tuo — Summit Attempt',
  'open-trip-gunung-kerinci-kersik-tuo-februari-2027',
  'sungai-penuh',
  'Basecamp Kersik Tuo, Taman Nasional Kerinci Seblat',
  '2027-02-25','2027-02-28',
  'Rp1.650.000 / pax (3H2M, include SIMAKSI TNKS + guide + transport Padang area)',
  'Gunung Kerinci',3805,'sulit','3H2M',10,
  'Komunitas GoWithDME Sumatera',null,
  'Kerinci (3.805 mdpl), puncak tertinggi Sumatera. Rp1.650.000/pax: SIMAKSI TNKS, guide + asisten, transport area Padang/Solok–Kersik Tuo PP (jadwal gabungan), logistik makan trek, tenda regu, gas, P3K. EXCLUDE: hotel Padang, sewa sleeping bag, tip, asuransi. Kuota 10. Fisik wajib prima; cuaca puncak ekstrem.',
  'Kerinci summit attempt 3D2N Rp1,650,000 incl. TNKS permit, guides, shared transport from Padang area. Max 10.',
  'https://tnkerinciseblat.or.id','gwm.sumatera',true
),
(
  'Open Trip Gunung Dempo — Pagar Alam dari Palembang',
  'Open Trip Mount Dempo — Pagar Alam from Palembang',
  'open-trip-gunung-dempo-pagar-alam-januari-2027',
  'palembang',
  'Basecamp area Pagar Alam, Sumatera Selatan',
  '2027-01-09','2027-01-11',
  'Rp875.000 / pax (2H1M di gunung + 1 malam Pagar Alam)',
  'Gunung Dempo',3173,'menengah','3H2M (kota+gunung)',16,
  'Komunitas GoWithDME Sumsel',null,
  'Dempo (3.173 mdpl). Rp875.000: transport Palembang–Pagar Alam PP (bus/elf share), 1 malam penginapan sederhana Pagar Alam, guide, izin lokal, makan selama trek 2x, dokumentasi. EXCLUDE: makan di restoran kota, sewa alat. Kuota 16.',
  'Dempo from Palembang Rp875,000 incl. shared transport, 1 night lodging, guide, permits.',
  'https://instagram.com','gwm.sumsel',true
),

-- ========== KALIMANTAN ==========
(
  'Open Trip Bukit Batu / Trekking Hutan — Palangkaraya Weekend',
  'Open Trip Forest Trek near Palangkaraya — Weekend',
  'open-trip-trekking-hutan-palangkaraya-februari-2027',
  'palangkaraya',
  'Titik kumpul Palangkaraya (lokasi trekking dikonfirmasi H-3, area Tangkiling / sekitarnya)',
  '2027-02-13','2027-02-14',
  'Rp525.000 / pax (include transport lokal + guide hutan + makan 2x)',
  'Kawasan Tangkiling / Bukit Batu',200,'pemula','2H1M',20,
  'Komunitas GoWithDME Kalteng',null,
  'Trekking hutan & bukit rendah area Palangkaraya (bukan alpine). Rp525.000: transport lokal PP, guide yang mengenal jalur, makan 2x, air, dokumentasi, kontribusi kebersihan jalur. Cocok pemula & family-friendly (anak 12+ dengan pendamping). Bukan pendakian gunung tinggi; fokus edukasi hutan & komunitas.',
  'Forest/hill trek near Palangkaraya Rp525,000. Beginner-friendly, not a high-altitude climb.',
  'https://instagram.com','gwm.kalteng',true
),
(
  'Open Trip Gunung Palung Area Trek — Ketapang (dari Pontianak)',
  'Open Trip Gunung Palung Area Trek — from Pontianak',
  'open-trip-gunung-palung-ketapang-maret-2027',
  'pontianak',
  'Area Taman Nasional Gunung Palung, Ketapang (akses diatur dari Pontianak)',
  '2027-03-18','2027-03-21',
  'Rp1.980.000 / pax (3H2M, logistik kapal/darat menyesuaikan musim)',
  'Kawasan TN Gunung Palung',1116,'menengah','3H2M',8,
  'Komunitas GoWithDME Kalbar',null,
  'Trek kawasan TN Gunung Palung (bukan jalur massal seperti di Jawa). Rp1.980.000: perizinan masuk kawasan, guide lokal, transport Pontianak–Ketapang area (darat/kapal share), logistik makan, tenda regu. Kuota sangat terbatas 8 pax karena akses & konservasi. Jadwal final dikonfirmasi H-14 tergantung cuaca & izin balai TN.',
  'Gunung Palung NP area trek Rp1,980,000. Max 8 people; final schedule depends on permits and weather.',
  'https://instagram.com','gwm.kalbar',true
),

-- ========== SULAWESI ==========
(
  'Open Trip Gunung Bawakaraeng — Gowa dari Makassar',
  'Open Trip Mount Bawakaraeng — Gowa from Makassar',
  'open-trip-gunung-bawakaraeng-gowa-februari-2027',
  'gowa',
  'Basecamp Lembanna / area Gowa, Sulawesi Selatan',
  '2027-02-06','2027-02-08',
  'Rp685.000 / pax (2H1M, meeting Makassar)',
  'Gunung Bawakaraeng',2830,'menengah','2H1M',18,
  'Komunitas GoWithDME Makassar',null,
  'Bawakaraeng (≈2.830 mdpl). Rp685.000 dari Makassar: transport PP, guide, izin/retribusi, makan 2x, dokumentasi, P3K. EXCLUDE: sewa alat, asuransi. Kuota 18. Jalur panjang; disarankan sudah biasa 8+ jam walking day.',
  'Bawakaraeng from Makassar Rp685,000 incl. transport, guide, permits, 2 meals. 18 slots.',
  'https://instagram.com','gwm.makassar',true
),
(
  'Open Trip Gunung Lokon — Tomohon Weekend',
  'Open Trip Mount Lokon — Tomohon Weekend',
  'open-trip-gunung-lokon-tomohon-desember-2026',
  'tomohon',
  'Area Tomohon, Sulawesi Utara (titik start mengikuti arahan bascam/PHESA)',
  '2026-12-26','2026-12-27',
  'Rp455.000 / pax (include transport Manado–Tomohon PP)',
  'Gunung Lokon',1580,'pemula','2H1M / ODT+',16,
  'Komunitas GoWithDME Manado',null,
  'Lokon area Tomohon. Rp455.000: transport Manado–Tomohon PP, guide lokal, tiket/izin lokal, makan 2x, dokumentasi. Status gunung aktif — hanya berangkat jika jalur wisata/pendakian dinyatakan aman. Alternatif jika tutup: trekking bukit sekitar Tomohon dengan skema harga yang sama (tanpa summit Lokon).',
  'Lokon/Tomohon Rp455,000 from Manado. Departs only if route is declared safe; alternative hill trek if closed.',
  'https://vsi.esdm.go.id','gwm.manado',true
),
(
  'Open Trip Gunung Latimojong (Rantemario) — Summit Bid',
  'Open Trip Mount Latimojong (Rantemario) — Summit Bid',
  'open-trip-gunung-latimojong-rantemario-maret-2027',
  'makassar',
  'Basecamp area Baraka / Enrekang (akses dari Makassar)',
  '2027-03-25','2027-03-29',
  'Rp2.150.000 / pax (4H3M, kuota 8)',
  'Gunung Latimojong (Rantemario)',3478,'sulit','4H3M',8,
  'Komunitas GoWithDME Sulsel',null,
  'Rantemario/Latimojong (≈3.478 mdpl), salah satu puncak tertinggi Sulawesi. Rp2.150.000: transport Makassar–basecamp PP, guide + porter logistik terbatas, izin, makan trek, tenda regu, P3K. EXCLUDE: sewa alat pribadi, asuransi, tip. Khusus pendaki berpengalaman. Kuota 8.',
  'Latimojong (Rantemario) 4D3N Rp2,150,000. Experienced only, max 8.',
  'https://instagram.com','gwm.makassar',true
),

-- ========== ACEH / LAMPUNG ==========
(
  'Open Trip Gunung Seulawah Agam — Weekend dari Banda Aceh',
  'Open Trip Mount Seulawah Agam — from Banda Aceh',
  'open-trip-gunung-seulawah-banda-aceh-januari-2027',
  'banda-aceh',
  'Area Seulawah, Kabupaten Aceh Besar',
  '2027-01-23','2027-01-24',
  'Rp365.000 / pax (include transport + guide + makan 2x)',
  'Gunung Seulawah Agam',1810,'pemula','2H1M',20,
  'Komunitas GoWithDME Aceh',null,
  'Seulawah Agam trek komunitas. Rp365.000: transport Banda Aceh–area start PP, guide lokal, makan 2x, air, dokumentasi, kontribusi jalur. Pemula welcome; membawa sleeping bag sendiri jika opsi menginap lapangan dipilih (konfirmasi H-5).',
  'Seulawah Agam community trek Rp365,000 from Banda Aceh.',
  'https://instagram.com','gwm.aceh',true
),
(
  'Open Trip Gunung Rajabasa — Lampung Selatan',
  'Open Trip Mount Rajabasa — South Lampung',
  'open-trip-gunung-rajabasa-lampung-februari-2027',
  'bandar-lampung',
  'Basecamp area Kalianda, Lampung Selatan',
  '2027-02-27','2027-02-28',
  'Rp410.000 / pax (meeting Bandar Lampung)',
  'Gunung Rajabasa',1281,'pemula','2H1M',24,
  'Komunitas GoWithDME Lampung',null,
  'Rajabasa (1.281 mdpl). Rp410.000 dari Bandar Lampung: transport PP, guide, tiket, makan 2x, dokumentasi. Cocok pemula & mahasiswa. Kuota 24.',
  'Rajabasa from Bandar Lampung Rp410,000. Beginner-friendly, 24 slots.',
  'https://instagram.com','gwm.lampung',true
)

) as v(
  title, title_en, slug, city, venue, d, e, price,
  mtn, mdpl, diff, dur, quota, org, wa,
  descr, descr_en, ticket, ig, comm
)
left join cities c on c.slug = v.city
where c.id is not null
on conflict (slug) do update set
  title = excluded.title,
  title_en = excluded.title_en,
  category = excluded.category,
  city_id = excluded.city_id,
  venue = excluded.venue,
  event_date = excluded.event_date,
  end_date = excluded.end_date,
  price_label = excluded.price_label,
  mountain = excluded.mountain,
  altitude_mdpl = excluded.altitude_mdpl,
  difficulty = excluded.difficulty,
  duration = excluded.duration,
  quota = excluded.quota,
  organizer = excluded.organizer,
  contact_wa = excluded.contact_wa,
  description = excluded.description,
  description_en = excluded.description_en,
  poster_url = excluded.poster_url,
  ticket_url = excluded.ticket_url,
  source_ig = excluded.source_ig,
  is_community = excluded.is_community,
  status = excluded.status;

-- Laporan hasil
select e.slug, e.title, e.event_date, e.end_date, e.price_label, e.mountain, e.poster_url, c.name as city
from events e
join cities c on c.id = e.city_id
where e.category = 'naikgunung'
  and e.slug like 'open-trip-%'
order by e.event_date, e.slug;
