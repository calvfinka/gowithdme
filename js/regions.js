// Daftar provinsi dan kota (dipakai filter kota). Kota baru juga harus ada di tabel cities (jalankan supabase/schema_kota.sql).
window.IB_REGIONS = {
  "DKI Jakarta": ["Jakarta"],
  "Banten": ["Tangerang", "Tangerang Selatan", "Serang"],
  "Jawa Barat": ["Bandung", "Cimahi", "Bogor", "Bekasi", "Depok", "Karawang", "Cirebon", "Tasikmalaya", "Majalengka"],
  "Jawa Tengah": ["Semarang", "Solo"],
  "DI Yogyakarta": ["Yogyakarta", "Sleman", "Bantul"],
  "Jawa Timur": ["Surabaya", "Malang", "Sidoarjo", "Ponorogo", "Lamongan", "Kediri", "Madiun"],
  "Bali": ["Denpasar", "Badung", "Gianyar"],
  "Sumatera Utara": ["Medan"],
  "Sumatera Barat": ["Padang", "Dharmasraya"],
  "Riau": ["Pekanbaru"],
  "Kepulauan Riau": ["Batam", "Karimun"],
  "Sumatera Selatan": ["Palembang"],
  "Lampung": ["Bandar Lampung"],
  "Aceh": ["Banda Aceh"],
  "Jambi": ["Jambi"],
  "Kalimantan Timur": ["Balikpapan", "Samarinda"],
  "Kalimantan Selatan": ["Banjarmasin"],
  "Kalimantan Barat": ["Pontianak"],
  "Sulawesi Selatan": ["Makassar"],
  "Sulawesi Utara": ["Manado"],
  "Nusa Tenggara Barat": ["Mataram"]
};
// Koordinat kota untuk cuaca (Open-Meteo)
window.IB_GEO = {"Majalengka": [-6.8364, 108.2274], "Kediri": [-7.848, 112.0178], "Madiun": [-7.6298, 111.5239], "Jambi": [-1.6101, 103.6131], "Karimun": [1.0, 103.43], "Dharmasraya": [-1.1, 101.59], "Jakarta": [-6.2088, 106.8456], "Tangerang": [-6.1783, 106.6319], "Tangerang Selatan": [-6.2886, 106.7179], "Serang": [-6.12, 106.1503], "Bandung": [-6.9175, 107.6191], "Cimahi": [-6.8722, 107.5425], "Bogor": [-6.595, 106.8166], "Bekasi": [-6.2383, 106.9756], "Depok": [-6.4025, 106.7942], "Karawang": [-6.3015, 107.3076], "Cirebon": [-6.732, 108.5523], "Tasikmalaya": [-7.3274, 108.2207], "Semarang": [-6.9667, 110.4167], "Solo": [-7.5755, 110.8243], "Yogyakarta": [-7.7971, 110.3695], "Surabaya": [-7.2575, 112.7521], "Malang": [-7.9666, 112.6326], "Sidoarjo": [-7.4478, 112.7183], "Ponorogo": [-7.8714, 111.4625], "Lamongan": [-7.1167, 112.4167], "Sleman": [-7.7167, 110.3556], "Bantul": [-7.8884, 110.3283], "Denpasar": [-8.6705, 115.2126], "Badung": [-8.5222, 115.1771], "Gianyar": [-8.5409, 115.3257], "Medan": [3.5952, 98.6722], "Padang": [-0.9471, 100.4172], "Pekanbaru": [0.5071, 101.4478], "Batam": [1.0456, 104.0305], "Palembang": [-2.9761, 104.7754], "Bandar Lampung": [-5.3971, 105.2668], "Banda Aceh": [5.5483, 95.3238], "Balikpapan": [-1.2379, 116.8529], "Samarinda": [-0.5022, 117.1536], "Banjarmasin": [-3.3186, 114.5944], "Pontianak": [-0.0263, 109.3425], "Makassar": [-5.1477, 119.4327], "Manado": [1.4748, 124.8421], "Mataram": [-8.5833, 116.1167]};
// Data contoh (dipakai bila Supabase belum diisi)
window.IB_SAMPLE = [
 {id:1,title:"Festival Musik Dago",category:"konser",city:"Bandung",venue:"Lapangan Dago (contoh)",event_date:"2026-12-12",price_label:"Gratis",description:"Contoh deskripsi: festival musik outdoor dengan line-up band lokal. Ganti dengan info resmi penyelenggara.",source_ig:"",g:["#7b2ff7","#ff6b35"]},
 {id:2,title:"Malam Indie Braga",category:"konser",city:"Bandung",venue:"Jl. Braga (contoh)",event_date:"2026-12-20",price_label:"Mulai Rp75 rb",description:"Contoh deskripsi: pertunjukan akustik dan indie di kawasan Braga.",source_ig:"",g:["#0f4c81","#ffc857"]},
 {id:3,title:"Open Trip Gunung Papandayan",category:"naikgunung",city:"Bandung",venue:"Pos Camp David (contoh)",event_date:"2026-12-27",price_label:"Rp350 rb/orang",description:"Contoh deskripsi: pendakian ringan 2 hari 1 malam, cocok untuk pemula.",source_ig:"",g:["#1f6f4a","#ffc857"]},
 {id:4,title:"Pendakian Tahun Baru Burangrang",category:"naikgunung",city:"Bandung",venue:"Basecamp Komando (contoh)",event_date:"2026-12-31",price_label:"Rp200 rb/orang",description:"Contoh deskripsi: sambut tahun baru dari puncak. Kuota terbatas.",source_ig:"",g:["#14532d","#ff6b35"]},
 {id:5,title:"Rock Night Cimahi",category:"konser",city:"Cimahi",venue:"GOR Cimahi (contoh)",event_date:"2027-01-08",price_label:"Mulai Rp100 rb",description:"Contoh deskripsi: malam musik rock bersama band-band komunitas.",source_ig:"",g:["#b91c1c","#1e1b4b"]},
 {id:6,title:"Tracking Gunung Pangrango",category:"naikgunung",city:"Bogor",venue:"Basecamp Cibodas (contoh)",event_date:"2027-01-15",price_label:"Rp400 rb/orang",description:"Contoh deskripsi: pendakian terpandu dengan pemandu berpengalaman.",source_ig:"",g:["#065f46","#0ea5e9"]}
];
