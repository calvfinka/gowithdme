-- Update info Lomba Sihir: Konser Ujung Dunia + sembunyikan entri Hindia yang duplikat
-- Jalankan di Supabase > SQL Editor (aman dijalankan berulang).

-- 1) Lomba Sihir: info terbaru, poster, dan link tiket resmi
update events set
  price_label='Rp350.000 – Rp650.000',
  description='Konser tunggal perdana Lomba Sihir (Hindia, Natasha Udu, Rayhan Noor, Enrico Octaviano, Tristan Juliano) merayakan lima tahun berkarya. Sabtu 21 November 2026 pukul 19.00–21.00 WIB di GBK Basketball Hall, Senayan, kapasitas 3.500 penonton, promotor Northstar Entertainment. Kategori: Festival Rp450.000, Tribune A Rp650.000, Tribune B Rp400.000, Tribune B Group Rp350.000 (harga per orang). Per 13 Nov 2026 tiket Festival dinyatakan habis; Tribune B dan paket dua orang masih tersedia, cek lombasihiryes.com.',
  description_en='Lomba Sihir''s first headline concert (Hindia, Natasha Udu, Rayhan Noor, Enrico Octaviano, Tristan Juliano) celebrating five years together. Saturday 21 November 2026, 19:00–21:00 WIB at GBK Basketball Hall, Senayan, 3,500 capacity, promoted by Northstar Entertainment. Tickets: Festival Rp450,000, Tribune A Rp650,000, Tribune B Rp400,000, Tribune B Group Rp350,000 (per person). As of 13 Nov 2026 Festival tickets are sold out; Tribune B and two-person packages were still available, check lombasihiryes.com.',
  poster_url='https://infokonser.id/storage/uploads/media/2026/10/01M59BSJXXQ8XCFM3MQX7ADVB9/800w.webp',
  ticket_url='https://lombasihiryes.com',
  status='published'
where slug='lomba-sihir-konser-ujung-dunia-jakarta-2026';

-- 2) Entri Hindia (21 Nov, GBK) duplikat dengan Lomba Sihir -> jadikan draft (tidak dihapus, bisa dikembalikan)
update events set status='draft'
where slug='hindia-konser-ujung-dunia-jakarta-2026';

-- 3) Cek hasil
select title, slug, status, event_date, poster_url from events
where slug in ('lomba-sihir-konser-ujung-dunia-jakarta-2026','hindia-konser-ujung-dunia-jakarta-2026','ancol-sunset-sound-hindia-feast-2026');
