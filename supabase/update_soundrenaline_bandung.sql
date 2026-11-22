-- GoWithDME: perbarui event Soundrenaline Sana Sini Bandung (line-up lengkap + jadwal Day 1).
-- Sumber: soundrenaline.id/bandung (dilihat 18 Nov 2026). Jalankan di Supabase > SQL Editor. Aman dijalankan ulang.
-- Hanya mengubah line-up dan deskripsi; judul, tanggal, poster, tiket, dan status tidak disentuh.

update events set
  lineup='Dewa 19 feat. Ello, Efek Rumah Kaca, The Adams, The S.I.G.I.T, Feel Koplo, Mondo Gascaro, Polyester Embassy, Perunggu, White Chorus, Murphy Radio, Rub of Rub, Beijing Connection, Mahalini, Float, MerDeFeu, White Shoes & The Couples Company, Stars and Rabbit, Tactile, Ali, Under The Big Bright Yellow Sun, Alkateri, Buckskin Bugle, Dongtsay x Oasisbdg, HFDZKHR, HIMTEP, K3BI, La Luna, MORFEM, Namoy Budaya, PORIS',
  description='Festival musik tiga hari di Laswi Heritage, 20–22 November 2026, bagian dari rangkaian Soundrenaline Sana Sini yang sebelumnya singgah di empat kota. Menghadirkan penampil pop dan rock dengan tiga area panggung: The Stage, The Space, dan The Lab. Khusus usia 21 tahun ke atas.
Jadwal Day 1 (Jumat, 20 November) – The Stage, Festival Stage: Under The Big Bright Yellow Sun 17.00–17.45, Polyester Embassy 19.10–19.55, Float 20.40–21.25, MerDeFeu 21.40–22.10, DEWA 19 ft. ELLO 22.15–23.15, Tactile 23.15–23.45. Garden Stage: Ali 18.00–18.50, White Shoes & The Couples Company 19.55–20.40, Stars and Rabbit 21.25–22.10. Jadwal Day 2 dan Day 3 serta The Space dan The Lab menyusul; cek soundrenaline.id/bandung untuk pembaruan.'
where slug='soundrenaline-sana-sini-bandung';

-- Cek (harus 1 baris):
select title, status, left(lineup,80) as lineup_awal from events where slug='soundrenaline-sana-sini-bandung';
