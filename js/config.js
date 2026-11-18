// Isi setelah proyek Supabase dibuat (Project Settings > API). Kosong = pakai data contoh.
window.IB_CONFIG = {
  SUPABASE_URL: "https://jhqkylnqvhrljpaknjcg.supabase.co",       // contoh: https://xxxx.supabase.co
  SUPABASE_ANON_KEY: "sb_publishable_WEpourxfk4IKga2XyxKucQ_hkmxuJnY",  // anon public key (aman di frontend, dilindungi RLS)
  EVENTS_SOURCE: "live",   // "live" = Supabase dulu, data/events.json cadangan. "static" = data/events.json dulu (0 egress, data tertunda <= 1 jam)
  DEFAULT_CITY: "Bandung",

  /* Kontak & pemilik */
  CONTACT_EMAIL: "gowithdme@jurkon.my.id",   // ganti ke halo@gowithdme.com setelah email domain aktif
  CONTACT_WA: "6282243562960",
  CONTACT_WA_LABEL: "0822 4356 2960",
  OWNER_NAME: "Jurkon Studio",
  OWNER_LEGAL: "Jurkon Studio",
  COPYRIGHT_YEAR: "2026",
  SITE_NAME: "GWM (Go With Me)",

  /* Monetisasi (siap domain) */
  // Tampilkan slot "Featured / Disorot" di beranda & daftar event
  FEATURED_ENABLED: true,
  // Label default untuk event yang di-boost (bisa diganti per event lewat sponsor_label)
  FEATURED_LABEL_ID: "Disorot",
  FEATURED_LABEL_EN: "Featured",
  // Form lead sponsor di halaman bantuan / tentang
  SPONSOR_LEADS_ENABLED: true,
  // Placeholder partner tiket (isi ID affiliate bila sudah ada kontrak)
  AFFILIATE_TICKET_BASE: "",   // contoh: "?ref=gowithdme" ditambahkan ke ticket_url bila kosong
  // Slot iklan native non-intrusif (kosongkan sampai ada partner)
  AD_SLOT_HOME: "",            // HTML aman / URL partner; kosong = tidak tampil
  AD_SLOT_SIDE: ""
};
