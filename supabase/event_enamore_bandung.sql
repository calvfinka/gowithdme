-- GWM: Enamore Intimate Show Bandung (29 Nov 2026, Spill N Bites, Purnawarman).
-- Jalankan di Supabase > SQL Editor. Aman dijalankan ulang (slug sama = data diperbarui, tidak dobel).
-- Sumber: IG @devastated____page + halaman tiket Snaptix. Link tiket dibersihkan dari parameter pelacak (utm/fbclid).

insert into events(title,slug,category,city_id,venue,event_date,end_date,price_label,genre,lineup,organizer,description,poster_url,ticket_url,source_ig,status)
select v.title,v.slug,v.category,c.id,v.venue,v.d::date,v.e::date,v.price,v.genre,v.lineup,v.org,v.descr,v.poster,v.ticket,v.ig,'published'
from (values
 ('Enamore Intimate Show Bandung','enamore-intimate-show-bandung-2026','konser','bandung',
  'Spill N Bites, Jl. Purnawarman No.24-26, Bandung','2026-11-29','2026-11-29','Mulai Rp75.000','Indie / Alternatif',
  'Enamore, Withered Whispers, Whydeep, See You On July, Savoury, Agité, Havinhell',
  'Fluxwave Media x Devastated Page x Melodickids Movement',
  'Setelah kurang lebih satu tahun absen, Enamore kembali berlabuh di Bandung lewat Enamore Intimate Show, Minggu 29 November 2026 di Spill N Bites, Purnawarman. Kolaborasi Fluxwave Media dan Devastated Page dengan sokongan kolektif Melodickids Movement ini menghadirkan panggung lintas subkultur bersama Withered Whispers (Bogor), Whydeep (Jakarta), See You On July, Savoury, Agité (Bandung), dan Havinhell (Yogyakarta). Enamore (Malang) juga akan membawa sesi talkshow khusus membahas album yang dirilis 2027. Tiket presale mulai Rp75.000 lewat Snaptix.',
  'https://cdn.snaptix.id/image-events/2b9133f3-5dd4-4a33-b8b7-5137bdd1252c',
  'https://snaptix.id/events/intimate-show',
  'devastated____page')
) as v(title,slug,category,city,venue,d,e,price,genre,lineup,org,descr,poster,ticket,ig)
join cities c on c.slug=v.city
on conflict (slug) do update set
  title=excluded.title, venue=excluded.venue, event_date=excluded.event_date, end_date=excluded.end_date,
  price_label=excluded.price_label, genre=excluded.genre, lineup=excluded.lineup, organizer=excluded.organizer,
  description=excluded.description, poster_url=excluded.poster_url, ticket_url=excluded.ticket_url,
  source_ig=excluded.source_ig, status='published';

-- Cek hasilnya:
-- select title,event_date,venue,price_label,status from events where slug='enamore-intimate-show-bandung-2026';
