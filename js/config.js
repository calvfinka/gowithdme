// Konfigurasi situs & monetisasi GWM. Aman di frontend (hanya public anon key & partner config).
window.IB_CONFIG = {
  SUPABASE_URL: "https://jhqkylnqvhrljpaknjcg.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_WEpourxfk4IKga2XyxKucQ_hkmxuJnY",
  EVENTS_SOURCE: "live",
  DEFAULT_CITY: "Bandung",
  CONTACT_EMAIL: "gowithdme@jurkon.my.id",
  CONTACT_WA: "6282243562960",
  CONTACT_WA_LABEL: "0822 4356 2960",

  // Konfigurasi Monetisasi & Afiliasi (bisa disesuaikan kapan saja)
  MONETIZE: {
    AFFILIATE: {
      utmSource: "gowithdme",
      utmMedium: "portal_referral",
      utmCampaign: "event_ticket",
      partnerRef: "gwm_partner"
    },
    // Daftar slug event yang mendapat penempatan Partner / Sorotan berbayar
    SPONSORED_EVENTS: {
      "big-bang-festival-2026-2027": "national_portal",
      "joyland-sessions-2026": "national_portal",
      "atlantik-traveller-open-trip-gunung-papandayan-2026": "city_spotlight",
      "hindia-konser-ujung-dunia-jakarta-2026": "city_spotlight"
    },
    // Slot Mitra Tiket, Gear Outdoor, Transport & Proteksi Perjalanan
    PARTNER_DEALS: [
      {
        id: "tix-partner",
        cat: "ticket",
        partner: "Partner Tiket Resmi",
        title_id: "Cashback & Cicilan Tiket Konser & Festival 2026",
        title_en: "Official Concert & Festival Ticket Deals 2026",
        desc_id: "Bandingkan harga resmi presale & VIP dari promotor terkurasi tanpa biaya tersembunyi.",
        desc_en: "Compare official presale & VIP passes from curated promoters with transparent fees.",
        badge_id: "Afiliasi Tiket",
        badge_en: "Ticket Affiliate",
        city: "Nasional",
        price_id: "Komisi s/d 5% / tiket",
        price_en: "Up to 5% partner share",
        cta_id: "Cek Jadwal & Tiket",
        cta_en: "Browse Tickets",
        url: "event?kat=konser"
      },
      {
        id: "gear-partner",
        cat: "gear",
        partner: "GWM Outdoor Gear",
        title_id: "Paket Sewa Tenda, Carrier 60L & Jaket Gunung Per Kota",
        title_en: "Tent, 60L Backpack & Mountain Jacket Rental by City",
        desc_id: "Rekomendasi perlengkapan gunung standar keamanan tinggi untuk pemula & rombongan open trip.",
        desc_en: "Safety-checked mountain gear rentals and essentials for beginners and open-trip groups.",
        badge_id: "Mitra Perlengkapan",
        badge_en: "Gear Partner",
        city: "Bandung · Malang · Wonosobo",
        price_id: "Mulai Rp45 rb/hari",
        price_en: "From Rp45k/day",
        cta_id: "Lihat Checklist & Gear",
        cta_en: "Gear & Checklist",
        url: "gunung#tools"
      },
      {
        id: "shuttle-partner",
        cat: "transport",
        partner: "Shuttle Basecamp & Venue",
        title_id: "Patungan Shuttle Stasiun ke Venue & Basecamp Pendakian",
        title_en: "Shared Station-to-Venue & Trailhead Shuttles",
        desc_id: "Koordinasikan kendaraan barengan dari Jakarta, Bandung, Yogyakarta, atau Surabaya.",
        desc_en: "Coordinate shared rides from Jakarta, Bandung, Yogyakarta, or Surabaya hubs.",
        badge_id: "Mitra Transport",
        badge_en: "Transport Partner",
        city: "Jawa · Bali · Sumatera",
        price_id: "Hitung Patungan + Jasa",
        price_en: "Split Cost + Host Fee",
        cta_id: "Buka Ajakan & Patungan",
        cta_en: "Open Invites & Split",
        url: "teman"
      },
      {
        id: "host-pro",
        cat: "host",
        partner: "GWM Pro Host",
        title_id: "Buka Open Trip Berbayar & Kelola Peserta Terverifikasi",
        title_en: "Launch Paid Open Trips & Manage Verified Attendees",
        desc_id: "Cocok untuk EO indie, komunitas lokal, dan trip leader. Hitung biaya jasa transparan dan dapat badge Terverifikasi.",
        desc_en: "Built for indie promoters, city communities, and trip leaders. Transparent host fee & verified listing.",
        badge_id: "Program Mitra Host",
        badge_en: "Host Partner Program",
        city: "38 Provinsi",
        price_id: "Gratis daftar / Paket Boost",
        price_en: "Free listing / Boost tiers",
        cta_id: "Mulai Promosi Event",
        cta_en: "Promote Your Event",
        url: "#monetize"
      }
    ],
    // Slot Sponsor Native di Panel Kanan
    NATIVE_SPONSOR: {
      label_id: "Partner Pilihan",
      label_en: "Featured Partner",
      title_id: "Promosikan Konser, Festival, atau Open Trip Kamu di GWM",
      title_en: "Promote Your Concert, Festival, or Open Trip on GWM",
      desc_id: "Jangkau pencari acara & teman jalan di 38 provinsi dan 120+ kota Indonesia. Mulai dari listing gratis hingga Banner Nasional.",
      desc_en: "Reach event-goers & hikers across 38 provinces and 120+ cities in Indonesia. From free listings to National Portal Spotlight.",
      cta_id: "Hitung Jangkauan & Pasang",
      cta_en: "Estimate Reach & Book",
      tier_hint_id: "Mulai Rp149 rb / minggu",
      tier_hint_en: "From Rp149k / week"
    }
  }
};
