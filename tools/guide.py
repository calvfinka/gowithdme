# Panduan per event: cara ke lokasi, tips, FAQ, dan event terkait. Dipakai oleh tools/build.py (ev_page).
# Semua isi dibuat dari data event + templat per kategori/kota. Tidak ada fakta yang dikarang:
# bagian yang bergantung pada penyelenggara (aturan masuk, refund, jam buka) diarahkan ke kanal resmi.
import re
from urllib.parse import quote

# ---- Transportasi per kota (hanya moda umum yang memang ada; selalu disertai ajakan cek Google Maps) ----
CITY={
 "Jakarta":("MRT Jakarta, LRT, KRL Commuterline, dan TransJakarta menjangkau banyak area; lanjutkan dengan ojek/taksi online untuk beberapa ratus meter terakhir.",
            "Jakarta's MRT, LRT, KRL Commuterline, and TransJakarta cover many areas; take a ride-hailing car or bike for the last stretch."),
 "Bandung":("Dari luar kota, Kereta Cepat Whoosh berhenti di Stasiun Padalarang dan Tegalluar, lalu lanjut kereta feeder, taksi online, atau angkot. Di dalam kota, ojek/taksi online paling praktis; akhir pekan sering macet.",
            "From out of town, the Whoosh high-speed train stops at Padalarang and Tegalluar, then use a feeder train or ride-hailing. Inside the city ride-hailing is easiest; weekends are often congested."),
 "Yogyakarta":("Stasiun Tugu dan Lempuyangan melayani kereta antarkota; Bandara YIA ada di Kulon Progo dan tersambung ke kota lewat KA Bandara atau bus. Di kota ada Trans Jogja, taksi/ojek online, dan becak.",
               "Tugu and Lempuyangan stations serve intercity trains; YIA airport is in Kulon Progo with an airport train and buses into town. In the city there are Trans Jogja buses, ride-hailing, and becak."),
 "Surabaya":("Stasiun Gubeng dan Pasar Turi melayani kereta; Bandara Juanda ada di Sidoarjo. Di kota tersedia Suroboyo Bus serta taksi/ojek online.",
             "Gubeng and Pasar Turi stations serve trains; Juanda airport is in Sidoarjo. In the city there are Suroboyo Bus and ride-hailing."),
 "Malang":("Stasiun Malang Kota melayani kereta; Bandara Abdulrachman Saleh ada di kabupaten. Angkutan massal kota terbatas, jadi taksi/ojek online atau kendaraan pribadi paling praktis.",
           "Malang Kota station serves trains and Abdulrachman Saleh airport is outside the city. Mass transit is limited, so ride-hailing or a private vehicle is most practical."),
 "Semarang":("Stasiun Tawang dan Poncol melayani kereta; Bandara Ahmad Yani dekat kota. Di dalam kota ada Trans Semarang (BRT) serta taksi/ojek online.",
             "Tawang and Poncol stations serve trains; Ahmad Yani airport is close to town. Trans Semarang (BRT) and ride-hailing operate in the city."),
 "Solo":("Stasiun Solo Balapan adalah simpul kereta utama; Bandara Adi Soemarmo ada di Boyolali. Di kota ada Batik Solo Trans serta taksi/ojek online.",
         "Solo Balapan is the main rail hub; Adi Soemarmo airport is in Boyolali. Batik Solo Trans and ride-hailing operate in the city."),
 "Medan":("Bandara Kualanamu terhubung ke kota lewat kereta bandara. Di kota tersedia Trans Metro Deli serta taksi/ojek online.",
          "Kualanamu airport connects to the city by airport train. Trans Metro Deli buses and ride-hailing operate in the city."),
 "Denpasar":("Bali tidak punya kereta. Bandara Ngurah Rai ada di Badung; di Bali umumnya orang memakai taksi/ojek online, taksi resmi, atau sewa motor/mobil. Jalur Kuta–Denpasar dan area wisata cenderung macet saat jam sibuk.",
             "Bali has no train. Ngurah Rai airport is in Badung; most people use ride-hailing, licensed taxis, or rented scooters/cars. Roads around Kuta, Denpasar, and tourist areas get congested at peak hours."),
 "Bogor":("KRL Commuterline Jakarta–Bogor berakhir di Stasiun Bogor; dari sana lanjut angkot, Biskita Trans Pakuan, atau taksi/ojek online.",
          "The KRL Commuterline from Jakarta ends at Bogor station; continue by angkot, Biskita Trans Pakuan, or ride-hailing."),
 "Depok":("KRL Commuterline berhenti di Stasiun Depok Baru, Depok Lama, dan Pondok Cina; lanjutkan dengan angkot atau ojek/taksi online.",
          "KRL Commuterline stops at Depok Baru, Depok Lama, and Pondok Cina; continue by angkot or ride-hailing."),
 "Tangerang":("KRL Commuterline lintas Tangerang dan kereta Bandara Soekarno-Hatta tersedia; lanjutkan dengan ojek/taksi online.",
              "KRL Commuterline serves Tangerang and the Soekarno-Hatta airport train is available; continue by ride-hailing."),
 "Cirebon":("Stasiun Cirebon (Kejaksan) adalah simpul kereta utama. Di kota, becak, angkot, dan taksi/ojek online umum dipakai.",
            "Cirebon (Kejaksan) station is the main rail hub. In town, becak, angkot, and ride-hailing are common."),
}
CITY["Tangerang Selatan"]=CITY["Tangerang"]; CITY["Badung"]=CITY["Denpasar"]; CITY["Bandung Barat"]=CITY["Bandung"]
CITY["Bekasi"]=("KRL Commuterline Bekasi Line dan LRT Jabodebek menjangkau Bekasi; lanjutkan dengan ojek/taksi online.",
                "KRL Commuterline's Bekasi Line and LRT Jabodebek reach Bekasi; continue by ride-hailing.")

T={
 "id":{
  "route":"Cara ke lokasi","tips":"Tips sebelum berangkat","faq":"Pertanyaan umum","related":"Event terkait",
  "maps":"Buka rute di Google Maps","maps_s":"Lihat lokasi di peta","addr":"Lokasi","mp":"Titik kumpul / lokasi",
  "route_head":"Lokasi: {w}.","local_head":"Transportasi di {c}",
  "gen_route":"Cek rute terbaru dan perkiraan waktu tempuh di Google Maps. Untuk event ramai, ojek/taksi online biasanya lebih mudah daripada membawa kendaraan sendiri, tetapi titik jemput sering padat setelah acara.",
  "gen_far":"Dari luar kota: kereta, bus antarkota, atau pesawat ke kota tujuan, lalu lanjut transportasi lokal ke lokasi.",
  "reason_city":"Di kota yang sama","reason_cat":"Kategori sama","reason_genre":"Genre sama","reason_artist":"Artis sama","reason_date":"Tanggal berdekatan",
  "rel_none":"Belum ada event terkait lain saat ini.","rel_more":"Lihat semua event",
 },
 "en":{
  "route":"How to get there","tips":"Tips before you go","faq":"FAQ","related":"Related events",
  "maps":"Open directions in Google Maps","maps_s":"See location on map","addr":"Location","mp":"Meeting point / location",
  "route_head":"Location: {w}.","local_head":"Getting around {c}",
  "gen_route":"Check the latest route and travel time in Google Maps. For busy events, ride-hailing is usually easier than driving yourself, though pick-up points tend to be crowded after the show.",
  "gen_far":"From out of town: take a train, intercity bus, or flight to the destination city, then use local transport to the venue.",
  "reason_city":"Same city","reason_cat":"Same category","reason_genre":"Same genre","reason_artist":"Same artist","reason_date":"Nearby date",
  "rel_none":"No other related events right now.","rel_more":"See all events",
 }}

def _L(l): return 0 if l=="id" else 1
def _h(x): return x  # penghias, escape dilakukan di build.py

def maps_dir(e):
    q=", ".join(x for x in (e.get("venue"),e.get("city")) if x)
    return "https://www.google.com/maps/dir/?api=1&destination="+quote(q)
def maps_search(e):
    q=" ".join(x for x in (e.get("venue"),e.get("city")) if x)
    return "https://www.google.com/maps/search/?api=1&query="+quote(q)

def _month(e): return int(e["event_date"][5:7])
def _rainy(e): return _month(e) in (11,12,1,2,3)

def route(l,e,where):
    """-> (paragraf-paragraf, tautan maps). Isi: lokasi, transport lokal kota, saran umum."""
    t=T[l]; k=_L(l); out=[]
    cat=e.get("category")
    if where: out.append(t["route_head"].format(w=where))
    c=(e.get("city") or "").strip()
    if cat=="naikgunung":
        mt=e.get("mountain")
        if l=="id":
            out.append("Pendakian dimulai dari basecamp"+(f" {mt}" if mt else "")+". Titik kumpul dan transportasi dari kota keberangkatan diatur penyelenggara open trip; tanyakan jam kumpul, lokasi jemputan, dan apakah transport dari titik kumpul ke basecamp sudah termasuk biaya.")
            out.append("Jika berangkat mandiri, rencanakan tiba di basecamp sehari sebelum atau sangat pagi, karena jalan menuju basecamp di daerah pegunungan lebih lambat dari perkiraan aplikasi peta dan sinyal bisa hilang.")
        else:
            out.append("The hike starts from the"+(f" {mt}" if mt else "")+" basecamp. The meeting point and transport from your departure city are arranged by the trip organizer; ask about the gathering time, pick-up location, and whether transport from the meeting point to the basecamp is included in the price.")
            out.append("If you travel on your own, plan to arrive at the basecamp the day before or very early, since mountain roads are slower than map apps estimate and mobile signal may drop.")
    else:
        if c in CITY: out.append(CITY[c][k])
        else: out.append(t["gen_far"])
        out.append(t["gen_route"])
    return out

# ---- Tips ----
def tips(l,e):
    cat=e.get("category"); k=[]; id_=(l=="id")
    price=(e.get("price_label") or "")
    free=bool(re.search(r"gratis|free",price,re.I))
    multi=e.get("end_date") and e["end_date"][:10]!=e["event_date"][:10]
    if cat=="naikgunung":
        k+=[("Cek tingkat kesulitan dan kondisi fisikmu. Tingkat di event ini: "+e["difficulty"]+"." if e.get("difficulty") else "Cek tingkat kesulitan jalur dan sesuaikan dengan kondisi fisikmu."),
            "Bawa jaket hangat, jas hujan, headlamp dengan baterai cadangan, sepatu/sandal gunung yang nyaman, dan air minum cukup.",
            "Pastikan biaya sudah mencakup apa saja (simaksi/tiket masuk, transport, konsumsi, guide) sebelum membayar.",
            "Kabari keluarga atau teman tentang rute dan jadwalmu, dan ikuti arahan pemandu dan aturan pengelola jalur.",
            "Bawa pulang semua sampahmu."] if id_ else \
           [("Check the difficulty and your fitness. Level for this trip: "+e["difficulty"]+"." if e.get("difficulty") else "Check the route difficulty against your fitness."),
            "Bring a warm jacket, rain gear, a headlamp with spare batteries, comfortable hiking shoes, and enough water.",
            "Confirm what the price covers (entry permit, transport, meals, guide) before paying.",
            "Tell family or friends your route and schedule, and follow your guide and the trail manager's rules.",
            "Carry all your trash back down."]
        if e.get("altitude_mdpl"):
            k.append((f"Puncak berada di sekitar {e['altitude_mdpl']:,} mdpl".replace(",",".")+"; udara terasa jauh lebih dingin di atas, jadi siapkan lapisan pakaian." if id_ else f"The summit is around {e['altitude_mdpl']:,} m above sea level, noticeably colder up top, so pack layers."))
    else:
        k+=["Beli tiket hanya lewat tautan resmi di halaman ini atau kanal penyelenggara, dan hindari penjual tiket tidak resmi." if id_ else "Buy tickets only through the official link on this page or the organizer's channels, and avoid unofficial sellers.",
            "Simpan e-tiket dan siapkan kartu identitas; sebagian event meminta identitas sesuai nama pada tiket." if id_ else "Keep your e-ticket handy and bring ID; some events require ID matching the ticket name.",
            "Datang lebih awal untuk menghindari antrean masuk dan parkir. Cek jam pintu dibuka di kanal penyelenggara." if id_ else "Arrive early to avoid entry and parking queues. Check door times on the organizer's channels.",
            "Bawa barang seperlunya dan cek daftar barang terlarang dari penyelenggara sebelum berangkat." if id_ else "Bring only what you need and check the organizer's prohibited items list before you go.",
            "Atur transport pulang lebih dulu; harga dan antrean ojek/taksi online biasanya naik setelah acara bubar." if id_ else "Plan your ride home in advance; ride-hailing prices and queues usually spike after the show."]
        if cat in ("konser","festival"):
            k.append("Pakai alas kaki nyaman dan siapkan penyumbat telinga jika kamu sensitif terhadap suara keras." if id_ else "Wear comfortable shoes and consider earplugs if you're sensitive to loud sound.")
        if cat=="pameran":
            k.append("Cek jam kunjungan dan apakah foto/video diizinkan di area pameran." if id_ else "Check visiting hours and whether photos or video are allowed in the exhibition area.")
    if _rainy(e): k.append("Bulan ini umumnya masuk musim hujan di sebagian besar Indonesia; bawa jas hujan atau payung lipat dan cek prakiraan cuaca sehari sebelumnya." if id_ else "This month falls in the rainy season in most of Indonesia; bring a raincoat or compact umbrella and check the forecast the day before.")
    if multi: k.append("Event berlangsung beberapa hari: cek apakah tiketmu berlaku sehari atau semua hari, dan siapkan penginapan bila perlu." if id_ else "This is a multi-day event: check whether your ticket covers one day or all days, and book accommodation if needed.")
    if free: k.append("Meski gratis, kuota biasanya terbatas; cek apakah perlu registrasi lebih dulu." if id_ else "Even when free, capacity is usually limited; check whether pre-registration is needed.")
    k.append("Mau berangkat bareng? Pakai fitur Ajakan di GoWithDME untuk cari teman ke event ini." if id_ else "Want company? Use the Buddy feature on GoWithDME to find people going to this event.")
    return k

# ---- FAQ lengkap (dipakai juga untuk FAQPage JSON-LD) ----
def faq(l,e,title,when_txt,where,past):
    id_=(l=="id"); cat=e.get("category"); q=[]
    q.append((f"Kapan {title} digelar?" if id_ else f"When is {title}?", f"{title} digelar pada {when_txt}." if id_ else f"{title} takes place on {when_txt}."))
    if where: q.append((f"Di mana {title} digelar?" if id_ else f"Where is {title} held?", f"Lokasinya di {where}. Rute dan transportasi ada di bagian \"Cara ke lokasi\"." if id_ else f"The venue is {where}. Directions and transport are in the \"How to get there\" section."))
    if e.get("price_label"): q.append((f"Berapa harga tiket {title}?" if id_ else f"How much are {title} tickets?", f"Harga tiket: {e['price_label']}." if id_ else f"Ticket price: {e['price_label']}."))
    if e.get("ticket_url") and not past: q.append((f"Di mana beli tiket {title}?" if id_ else f"Where can I buy {title} tickets?", "Lewat tombol tiket/info resmi di halaman ini, yang mengarah ke kanal penjualan atau penyelenggara." if id_ else "Use the ticket/official info button on this page, which links to the sales channel or the organizer."))
    if past: q.append(("Apakah event ini masih berlangsung?" if id_ else "Is this event still on?", "Event ini sudah selesai. Lihat daftar event terkait di bawah untuk acara mendatang yang mirip." if id_ else "This event has ended. See related events below for similar upcoming ones."))
    if e.get("lineup") and cat in ("konser","festival"): q.append((f"Siapa saja pengisi acara {title}?" if id_ else f"Who is performing at {title}?", f"Pengisi acara: {e['lineup']}. Susunan dan jam tampil bisa berubah; cek kanal penyelenggara." if id_ else f"Line-up: {e['lineup']}. Running order and set times may change; check the organizer's channels."))
    if cat=="naikgunung":
        if e.get("difficulty"): q.append((f"Seberapa sulit trip {title}?" if id_ else f"How hard is {title}?", f"Tingkat kesulitan yang tercantum: {e['difficulty']}."+(f" Durasi: {e['duration']}." if e.get("duration") else "") if id_ else f"Listed difficulty: {e['difficulty']}."+(f" Duration: {e['duration']}." if e.get("duration") else "")))
        q.append(("Apa yang perlu dibawa?" if id_ else "What should I bring?", "Jaket, jas hujan, headlamp, sepatu gunung, air minum, dan logistik pribadi. Cek daftar resmi dari penyelenggara trip." if id_ else "A jacket, rain gear, headlamp, hiking shoes, water, and personal supplies. Check the trip organizer's official list."))
    else:
        q.append(("Apakah tiket bisa di-refund?" if id_ else "Are tickets refundable?", "Kebijakan refund dan penukaran ditentukan penyelenggara atau platform tiket. Baca syarat sebelum membeli." if id_ else "Refund and exchange policies are set by the organizer or ticketing platform. Read the terms before buying."))
        q.append(("Apa saja yang tidak boleh dibawa?" if id_ else "What items are not allowed?", "Aturan barang terlarang berbeda tiap event dan venue. Cek pengumuman resmi penyelenggara." if id_ else "Prohibited items differ by event and venue. Check the organizer's official announcement."))
    q.append(("Bagaimana cari teman untuk berangkat bareng?" if id_ else "How do I find someone to go with?", "Buka rincian event di GoWithDME dan pakai tombol Ajakan untuk membuat atau bergabung ke ajakan barengan." if id_ else "Open the event details on GoWithDME and use the Buddy button to create or join a group."))
    return q

# ---- Event terkait: skor berdasarkan kota, kategori, genre, artis sama, dan kedekatan tanggal ----
def related(l,e,EV,now,split_lineup,akey,limit=6):
    t=T[l]; mine={akey(n) for n in split_lineup(e.get("lineup") or "")}
    sd=e["event_date"][:10]
    from datetime import date
    def d(s): y,m,dd=map(int,s[:10].split("-")); return date(y,m,dd)
    res=[]
    for x in EV:
        if x["slug"]==e["slug"] or (x.get("end_date") or x["event_date"])[:10]<now: continue
        sc=0; why=[]
        if e.get("city") and x.get("city")==e.get("city"): sc+=3; why.append(t["reason_city"])
        if e.get("category") and x.get("category")==e.get("category"): sc+=2; why.append(t["reason_cat"])
        if e.get("genre") and x.get("genre") and x["genre"].strip().lower()==e["genre"].strip().lower(): sc+=2; why.append(t["reason_genre"])
        if mine and mine & {akey(n) for n in split_lineup(x.get("lineup") or "")}: sc+=3; why.append(t["reason_artist"])
        if abs((d(x["event_date"])-d(sd)).days)<=14: sc+=1; why.append(t["reason_date"])
        if sc>=2: res.append((-sc,x["event_date"],x,why))
    res.sort(key=lambda r:(r[0],r[1]))
    return [(x,why) for _,_,x,why in res[:limit]]
