// Daftar provinsi dan kota (dipakai filter kota). Kota baru juga harus ada di tabel cities (jalankan supabase/schema_kota.sql).
window.IB_REGIONS = {
  "DKI Jakarta": ["Jakarta"],
  "Banten": ["Tangerang", "Tangerang Selatan", "Serang"],
  "Jawa Barat": ["Bandung", "Cimahi", "Bogor", "Bekasi", "Depok", "Karawang", "Cirebon", "Tasikmalaya"],
  "Jawa Tengah": ["Semarang", "Solo"],
  "DI Yogyakarta": ["Yogyakarta"],
  "Jawa Timur": ["Surabaya", "Malang", "Sidoarjo"],
  "Bali": ["Denpasar", "Badung", "Gianyar"],
  "Sumatera Utara": ["Medan"],
  "Sumatera Barat": ["Padang"],
  "Riau": ["Pekanbaru"],
  "Kepulauan Riau": ["Batam"],
  "Sumatera Selatan": ["Palembang"],
  "Lampung": ["Bandar Lampung"],
  "Aceh": ["Banda Aceh"],
  "Kalimantan Timur": ["Balikpapan", "Samarinda"],
  "Kalimantan Selatan": ["Banjarmasin"],
  "Kalimantan Barat": ["Pontianak"],
  "Sulawesi Selatan": ["Makassar"],
  "Sulawesi Utara": ["Manado"],
  "Nusa Tenggara Barat": ["Mataram"]
};
// Data contoh (dipakai bila Supabase belum diisi)
window.IB_SAMPLE = [
 {id:1,title:"Festival Musik Dago",category:"konser",city:"Bandung",venue:"Lapangan Dago (contoh)",event_date:"2026-12-12",price_label:"Gratis",description:"Contoh deskripsi: festival musik outdoor dengan line-up band lokal. Ganti dengan info resmi penyelenggara.",source_ig:"",g:["#7b2ff7","#ff6b35"]},
 {id:2,title:"Malam Indie Braga",category:"konser",city:"Bandung",venue:"Jl. Braga (contoh)",event_date:"2026-12-20",price_label:"Mulai Rp75 rb",description:"Contoh deskripsi: pertunjukan akustik dan indie di kawasan Braga.",source_ig:"",g:["#0f4c81","#ffc857"]},
 {id:3,title:"Open Trip Gunung Papandayan",category:"naikgunung",city:"Bandung",venue:"Pos Camp David (contoh)",event_date:"2026-12-27",price_label:"Rp350 rb/orang",description:"Contoh deskripsi: pendakian ringan 2 hari 1 malam, cocok untuk pemula.",source_ig:"",g:["#1f6f4a","#ffc857"]},
 {id:4,title:"Pendakian Tahun Baru Burangrang",category:"naikgunung",city:"Bandung",venue:"Basecamp Komando (contoh)",event_date:"2026-12-31",price_label:"Rp200 rb/orang",description:"Contoh deskripsi: sambut tahun baru dari puncak. Kuota terbatas.",source_ig:"",g:["#14532d","#ff6b35"]},
 {id:5,title:"Rock Night Cimahi",category:"konser",city:"Cimahi",venue:"GOR Cimahi (contoh)",event_date:"2027-01-08",price_label:"Mulai Rp100 rb",description:"Contoh deskripsi: malam musik rock bersama band-band komunitas.",source_ig:"",g:["#b91c1c","#1e1b4b"]},
 {id:6,title:"Tracking Gunung Pangrango",category:"naikgunung",city:"Bogor",venue:"Basecamp Cibodas (contoh)",event_date:"2027-01-15",price_label:"Rp400 rb/orang",description:"Contoh deskripsi: pendakian terpandu dengan pemandu berpengalaman.",source_ig:"",g:["#065f46","#0ea5e9"]}
];
