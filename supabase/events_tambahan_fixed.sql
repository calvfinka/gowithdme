-- Kota Wonosobo belum ada di database, jadi ditambahkan dulu (kalau sudah ada, dilewati)
insert into cities(province_id,name,slug)
select p.id,'Wonosobo','wonosobo' from provinces p where p.name='Jawa Tengah'
on conflict (slug) do nothing;

insert into events(title,slug,category,city_id,venue,event_date,end_date,price_label,genre,lineup,mountain,altitude_mdpl,difficulty,duration,organizer,description,poster_url,ticket_url,source_ig,is_community,status)
select v.title,v.slug,v.category,c.id,v.venue,v.d::date,v.e::date,v.price,coalesce(v.genre,case when v.category='naikgunung' then 'Pendakian' end),v.lineup,v.mtn,v.mdpl,v.diff,v.dur,v.org,v.descr,'assets/posters/'||v.slug||'.jpg',v.ticket,coalesce(v.ig,'gowithdme'),v.comm,'published'
from (values
 ('Hindia - Konser Ujung Dunia Jakarta 2026','hindia-konser-ujung-dunia-jakarta-2026','konser','jakarta','GBK Basketball Hall, Senayan, Jakarta','2026-11-21','2026-11-21','Cek tiket resmi','Pop','Hindia',null,null,null,null,'Sun Eater','Pertunjukan spesial Hindia bertajuk Konser Ujung Dunia di GBK Basketball Hall, Senayan, Jakarta.','https://lombasihiryes.com','wordfangs',false),
 ('Ancol Sunset Sound: Hindia, .Feast & For Revenge','ancol-sunset-sound-hindia-feast-2026','konser','jakarta','Pantai Festival Ancol, Jakarta','2026-11-28','2026-11-28','Mulai Rp75.000','Festival campuran','Hindia, .Feast, For Revenge',null,null,null,null,'Ancol Taman Impian','Konser tepi pantai Ancol Sunset Sound yang menampilkan Hindia, .Feast, dan For Revenge.','https://ancol.com','wordfangs',false),
 ('Mittelkin & Friends: Intimate Indie Showcase Bandung','mittelkin-intimate-showcase-bandung-2026','konser','bandung','Ruang Kreatif Dago, Bandung','2026-12-12','2026-12-12','Mulai Rp50.000','Indie','Mittelkin',null,null,null,null,'Kolektif Indie Bandung','Pertunjukan musik intim menampilkan unit indie asal Bogor, Mittelkin, membawakan materi album dan rilisan terbaru.','https://instagram.com',null,false),
 ('Open Trip Explore Gunung Galunggung - Atlantik Adventure Tasikmalaya','atlantik-adventure-tasikmalaya-explore-galunggung-2026','naikgunung','tasikmalaya','Kawah & Bukit Nangreu, Gunung Galunggung, Tasikmalaya','2026-11-29','2026-11-29','Mulai Rp85.000',null,null,'Gunung Galunggung',2168,'pemula','1 Hari / 2H1M','Atlantik Adventure Tasikmalaya','Open trip trekking dan camping ceria Gunung Galunggung bersama Atlantik Traveller / Atlantik Adventure Tasikmalaya.','https://instagram.com',null,false),
 ('Open Trip Pendakian & Camping - Barat Adventure Tasikmalaya','barat-adventure-tasikmalaya-pendakian-bersama-2026','naikgunung','tasikmalaya','Meeting Point Tasikmalaya','2026-12-06','2026-12-07','Info & Kuota di IG',null,null,'Gunung Cikuray / Papandayan',2821,'menengah','2H1M','Barat Adventure Tasikmalaya','Jadwal pendakian bersama dan open trip keberangkatan Tasikmalaya oleh Barat Adventure.','https://instagram.com',null,false),
 ('Pendakian Bersama Gunung Prau via Patak Banteng','pendakian-bersama-gunung-prau-dieng-desember-2026','naikgunung','wonosobo','Basecamp Patak Banteng, Dieng, Wonosobo','2026-12-05','2026-12-06','Patungan Rp250.000',null,null,'Gunung Prau',2590,'pemula','2H1M','Komunitas GWM','Pendakian santai akhir pekan menuju puncak Gunung Prau (2.590 mdpl) untuk menikmati sunrise golden hour bersama komunitas.','https://gowithdme.github.io','gowithdme',true),
 ('Pendakian Bareng Gunung Gede via Gunung Putri','pendakian-gunung-gede-via-putri-desember-2026','naikgunung','bogor','Basecamp Gunung Putri, Cipanas, Bogor','2026-12-19','2026-12-20','SIMAKSI & Patungan Rp200.000',null,null,'Gunung Gede',2958,'menengah','2H1M','Komunitas GWM','Pendakian bersama menuju Alun-Alun Suryakencana Gunung Gede. Terbuka untuk solo hiker yang mencari rekan satu tim.','https://gedepangrango.org','gowithdme',true)
) as v(title,slug,category,city,venue,d,e,price,genre,lineup,mtn,mdpl,diff,dur,org,descr,ticket,ig,comm)
left join cities c on c.slug=v.city
on conflict (slug) do update set
  title=excluded.title, category=excluded.category, city_id=excluded.city_id, venue=excluded.venue,
  event_date=excluded.event_date, end_date=excluded.end_date, price_label=excluded.price_label,
  genre=excluded.genre, lineup=excluded.lineup, mountain=excluded.mountain, altitude_mdpl=excluded.altitude_mdpl,
  difficulty=excluded.difficulty, duration=excluded.duration, organizer=excluded.organizer,
  description=excluded.description, poster_url=excluded.poster_url, ticket_url=excluded.ticket_url, source_ig=excluded.source_ig,
  is_community=excluded.is_community, status=excluded.status
returning title, category, event_date;
